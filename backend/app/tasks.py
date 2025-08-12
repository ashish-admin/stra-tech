import os
import json
import google.generativeai as genai
from newsapi import NewsApiClient
from app.extensions import db
from app.models import Alert
from celery import shared_task

@shared_task(bind=True)
def analyze_news_for_alerts(self, ward_name):
    alert = Alert.query.filter_by(ward=ward_name).first() or Alert(ward=ward_name)
    try:
        newsapi = NewsApiClient(api_key=os.environ.get('NEWS_API_KEY'))
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

        query = '"Hyderabad" AND ("GHMC" OR "civic" OR "development" OR "politics" OR "infrastructure")'
        top_headlines = newsapi.get_everything(q=query, language='en', sort_by='publishedAt', page_size=20)
        articles = top_headlines.get('articles', [])

        if not articles:
            alert.opportunities = json.dumps({"status": "No relevant news found."})
            db.session.add(alert)
            db.session.commit()
            return "Task completed: No articles found."

        article_texts = "\\n\\n".join([f"Title: {a['title']}\\nURL: {a['url']}\\nDescription: {a.get('description', '')}" for a in articles])
        source_urls = json.dumps([a['url'] for a in articles])
        model = genai.GenerativeModel('gemini-1.5-flash')

        # --- UPGRADE: New prompt to generate talking points ---
        prompt = f"""
        You are a razor-sharp political strategist for a candidate in the **{ward_name}** ward of Hyderabad. Analyze the provided Hyderabad news articles to find intelligence relevant to **{ward_name}**. Conduct a search on local news, current issues in that ward, city, state that may be relevant.

        Generate a JSON object with a "briefing" key. This "briefing" object must contain:
        1. "status": "Actionable intelligence found."
        2. "key_issue": The single most important local issue for **{ward_name}**.
        3. "talking_points": A JSON array of 3 concise, powerful talking points for the candidate to use in speeches or social media regarding this issue.
        4. "recommended_actions": A JSON array of 2-3 specific, actionable steps for the campaign team.

        If no articles are relevant, generate a JSON object with only one key: "status", with the value "No ward-specific intelligence in today's news cycle."

        Hyderabad News Articles:
        {article_texts}
        """

        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '')
        analysis_result = json.loads(cleaned_response)

        alert.opportunities = json.dumps(analysis_result)
        alert.source_articles = source_urls
        db.session.add(alert)
        db.session.commit()

        return f"Successfully generated candidate briefing for {ward_name}."

    except Exception as e:
        print(f"CRITICAL ERROR in analyze_news_for_alerts for {ward_name}: {e}")
        db.session.rollback()
        alert.opportunities = json.dumps({"status": f"An error occurred during AI analysis: {e}"})
        db.session.add(alert)
        db.session.commit()
        raise e
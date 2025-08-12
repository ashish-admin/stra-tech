import os
import json
import google.generativeai as genai
from newsapi import NewsApiClient
from app.extensions import db
from app.models import Alert
from celery import shared_task

@shared_task(bind=True)
def analyze_news_for_alerts(self, ward_name):
    """
    Final version: Uses a wide search query, a powerful AI filter, and robust
    error handling to generate hyper-local, actionable intelligence.
    """
    # Initialize alert object first to guarantee it exists for error handling
    alert = Alert.query.filter_by(ward=ward_name).first() or Alert(ward=ward_name)

    try:
        newsapi = NewsApiClient(api_key=os.environ.get('NEWS_API_KEY'))
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

        query = '"Hyderabad" AND ("GHMC" OR "civic" OR "development" OR "politics" OR "infrastructure")'
        top_headlines = newsapi.get_everything(
            q=query,
            language='en',
            sort_by='publishedAt',
            page_size=20
        )

        articles = top_headlines.get('articles', [])
        if not articles:
            # If no news is found, save a clear status and succeed the task
            alert.opportunities = json.dumps({"status": "No relevant news found in the last 24 hours."})
            db.session.add(alert)
            db.session.commit()
            return "Task completed: No articles found."

        article_texts = "\\n\\n".join([f"Title: {a['title']}\\nURL: {a['url']}\\nDescription: {a.get('description', '')}" for a in articles])
        source_urls = json.dumps([a['url'] for a in articles])
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"""
        You are a razor-sharp political strategist for a candidate in the **{ward_name}** ward of Hyderabad. I have provided a list of general news articles about Hyderabad. Your critical task is to:
        1.  **Filter:** Read all articles and determine if ANY of them have a direct or indirect impact on the residents of **{ward_name}**.
        2.  **Analyze:** If you find relevant news, generate a JSON object with a "briefing" key. This "briefing" object should contain:
            - "status": "Actionable intelligence found."
            - "key_issue": The single most important local issue for **{ward_name}**.
            - "our_angle": A strong, pro-campaign narrative on the issue.
            - "opposition_weakness": The opposition's vulnerability on this issue.
            - "recommended_actions": A JSON array of 2-3 specific, actionable steps for the campaign team.
        3.  **Report Negative:** If NONE of the articles are relevant to **{ward_name}**, you MUST generate a JSON object with only one key: "status", with the value "No ward-specific intelligence in today's news cycle."

        Hyderabad News Articles:
        {article_texts}
        """

        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '')
        analysis_result = json.loads(cleaned_response)

        alert.opportunities = json.dumps(analysis_result)
        alert.threats = None
        alert.actionable_alerts = None
        alert.source_articles = source_urls
        db.session.add(alert)
        db.session.commit()

        return f"Successfully generated candidate briefing for {ward_name}."

    except Exception as e:
        # --- FIX: Robust Error Handling ---
        # If any error occurs, save a failure status to the database.
        print(f"CRITICAL ERROR in analyze_news_for_alerts for {ward_name}: {e}")
        db.session.rollback() # Rollback any partial saves
        alert.opportunities = json.dumps({"status": f"An unexpected error occurred during analysis: {e}"})
        db.session.add(alert)
        db.session.commit()
        # Re-raise the exception to mark the task as failed in Celery logs
        raise e
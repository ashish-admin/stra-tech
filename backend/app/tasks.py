# backend/app/tasks.py

import os
import json
import google.generativeai as genai
from newsapi import NewsApiClient
from app.extensions import db, celery
from app.models import Alert
from celery import shared_task

# --- Configuration for external APIs ---
try:
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    newsapi = NewsApiClient(api_key=os.environ.get('NEWS_API_KEY'))
except Exception as e:
    print(f"Error configuring API clients: {e}")

@shared_task
def fetch_twitter_data():
    pass

@shared_task
def fetch_news_data():
    pass

@shared_task
def analyze_news_for_alerts(ward_name):
    """
    Celery task to fetch news, analyze it with AI, and save the results.
    """
    try:
        query = f'"{ward_name}" OR "Hyderabad" AND ("politics" OR "development" OR "civic issues")'
        top_headlines = newsapi.get_everything(
            q=query,
            language='en',
            sort_by='relevancy',
            page_size=5
        )
        
        articles = top_headlines.get('articles', [])
        if not articles:
            print(f"No relevant articles found for {ward_name}.")
            return f"Completed analysis for {ward_name}: No articles found."

        article_texts = "\\n\\n".join([f"Title: {a['title']}\\nDescription: {a.get('description', '')}" for a in articles])
        source_urls = json.dumps([a['url'] for a in articles])

        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        Analyze the political landscape in {ward_name}, Hyderabad, for a political party based on these news articles.
        Identify:
        1. Opportunities: Key issues or events to capitalize on.
        2. Threats: Key challenges or negative narratives.
        3. Actionable Alerts: Suggest 2-3 concrete actions for a campaign team.
        Format the output as a clean JSON object with keys "opportunities", "threats", and "actionable_alerts".

        News Articles:
        {article_texts}
        """
        
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '')
        analysis_result = json.loads(cleaned_response)

        alert = Alert.query.filter_by(ward=ward_name).first()
        if not alert:
            alert = Alert(ward=ward_name)
        
        # --- THE FIX IS HERE ---
        # Convert the Python dictionary/list into a JSON string before saving.
        alert.opportunities = json.dumps(analysis_result.get('opportunities', []))
        alert.threats = json.dumps(analysis_result.get('threats', []))
        alert.actionable_alerts = json.dumps(analysis_result.get('actionable_alerts', []))
        alert.source_articles = source_urls
        
        db.session.add(alert)
        db.session.commit()

        return f"Successfully analyzed and stored alerts for {ward_name}."

    except Exception as e:
        print(f"An error occurred during analysis for {ward_name}: {e}")
        db.session.rollback()
        raise e
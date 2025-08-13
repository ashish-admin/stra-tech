import os
import json
import requests
import fitz # PyMuPDF
from datetime import date
import google.generativeai as genai
from app.extensions import db
from app.models import Alert, Epaper, Post, Author
from celery import shared_task

@shared_task(bind=True)
def analyze_news_for_alerts(self, ward_name):
    """
    On-demand task to analyze generic news for a specific ward.
    """
    alert = Alert.query.filter_by(ward=ward_name).first() or Alert(ward=ward_name)
    try:
        # This task should use the NewsAPI for on-demand analysis
        from newsapi import NewsApiClient
        newsapi = NewsApiClient(api_key=os.environ.get('NEWS_API_KEY'))
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

        query = f'"{ward_name}" OR "Hyderabad" AND ("GHMC" OR "civic" OR "development" OR "politics" OR "infrastructure")'
        top_headlines = newsapi.get_everything(
            q=query,
            language='en',
            sort_by='publishedAt',
            page_size=20
        )

        articles = top_headlines.get('articles', [])
        if not articles:
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
        print(f"CRITICAL ERROR in analyze_news_for_alerts for {ward_name}: {e}")
        db.session.rollback()
        alert.opportunities = json.dumps({"status": f"An unexpected error occurred during analysis: {e}"})
        db.session.add(alert)
        db.session.commit()
        raise e


@shared_task(bind=True)
def ingest_and_analyze_epaper(self):
    """
    A scheduled task to download daily e-papers, extract text,
    and then trigger analysis for all wards in the system.
    """
    try:
        today = date.today()
        # ... (E-paper download and text extraction logic remains the same) ...
        
        # FIX: Dynamically get all unique wards from the Post data, removing the hardcoded list.
        wards_in_system = db.session.query(Post.city).distinct().all()
        WARDS_TO_ANALYZE = [ward[0] for ward in wards_in_system if ward[0]]

        if not WARDS_TO_ANALYZE:
            print("No wards found in the database to analyze.")
            return "No wards to analyze."

        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-1.5-flash')

        for ward in WARDS_TO_ANALYZE:
            print(f"Starting AI analysis of e-paper for {ward}...")
            # ... (The rest of the analysis loop and AI prompt remains the same) ...

    except Exception as e:
        print(f"CRITICAL ERROR in e-paper ingestion task: {e}")
        db.session.rollback()
    
    return "E-paper ingestion and analysis complete."

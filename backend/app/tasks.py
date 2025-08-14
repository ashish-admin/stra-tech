# backend/app/tasks.py
import os
import json
from datetime import date
import google.generativeai as genai
from celery import shared_task

from app.extensions import db
from app.models import Alert, Epaper, Post

@shared_task(bind=True)
def analyze_news_for_alerts(self, ward_name):
    """Analyze news and store a ward-specific briefing in Alert."""
    alert = Alert.query.filter_by(ward=ward_name).first() or Alert(ward=ward_name)
    try:
        from newsapi import NewsApiClient
        newsapi = NewsApiClient(api_key=os.environ.get('NEWS_API_KEY'))
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-1.5-flash')

        query = f'"{ward_name}" OR "Hyderabad" AND ("GHMC" OR "civic" OR "development" OR "politics" OR "infrastructure")'
        resp = newsapi.get_everything(q=query, language='en', sort_by='publishedAt', page_size=20)
        articles = resp.get('articles', [])

        if not articles:
            alert.opportunities = json.dumps({"status": "No ward-specific intelligence in today’s news cycle."})
            db.session.add(alert); db.session.commit()
            return "Task complete: no articles"

        article_texts = "\n\n".join(
            [f"Title: {a.get('title','')}\nURL: {a.get('url','')}\nDescription: {a.get('description','')}" for a in articles]
        )
        prompt = f"""
You are a political strategist for {ward_name} ward, Hyderabad. From the articles below, extract ward-relevant intelligence.
If relevant items exist, return JSON with a "briefing" object:
- status: "Actionable intelligence found."
- key_issue
- our_angle
- opposition_weakness
- recommended_actions: array of 2-3 items (action, timeline, details)
If none are relevant, return: {{ "status": "No ward-specific intelligence in today's news cycle." }}

Articles:
{article_texts}
"""
        out = model.generate_content(prompt)
        text = (out.text or "").strip().replace("```json", "").replace("```", "")
        data = json.loads(text)

        alert.opportunities = json.dumps(data)
        alert.threats = None
        alert.actionable_alerts = None
        alert.source_articles = json.dumps([a.get("url") for a in articles])
        db.session.add(alert); db.session.commit()
        return f"Briefing generated for {ward_name}"

    except Exception as e:
        db.session.rollback()
        alert.opportunities = json.dumps({"status": f"Analysis error: {e}"})
        db.session.add(alert); db.session.commit()
        raise

@shared_task(bind=True)
def ingest_and_analyze_epaper(self):
    """Download daily e-papers, extract text, then analyze per ward discovered in Post.city."""
    try:
        today = date.today()
        # ... Epaper ingestion/extraction remains as you have it ...

        wards = [w[0] for w in db.session.query(Post.city).distinct().all() if w[0]]
        if not wards:
            print("No wards found in Post.city; skipping.")
            return "No wards"

        for ward in wards:
            analyze_news_for_alerts.apply_async(args=[ward])

    except Exception as e:
        print(f"CRITICAL ERROR in e-paper ingestion task: {e}")
        db.session.rollback()
    return "E-paper ingestion and analysis scheduled."

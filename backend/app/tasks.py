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
    # This on-demand task remains unchanged.
    pass

@shared_task(bind=True)
def ingest_and_analyze_epaper(self):
    """
    Scheduled task to download e-papers, extract text, and analyze for all wards.
    """
    try:
        # ... (E-paper download and text extraction logic remains the same) ...
        
        # FIX: Dynamically get all unique wards from the Post data
        wards_in_system = db.session.query(Post.city).distinct().all()
        WARDS_TO_ANALYZE = [ward[0] for ward in wards_in_system if ward[0]]

        if not WARDS_TO_ANALYZE:
            print("No wards found in the database to analyze.")
            return "No wards to analyze."

        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-1.5-flash')

        for ward in WARDS_TO_ANALYZE:
            print(f"Starting AI analysis of e-paper for {ward}...")
            # ... (The rest of the analysis loop remains the same) ...

    except Exception as e:
        print(f"CRITICAL ERROR in e-paper ingestion task: {e}")
        db.session.rollback()
    
    return "E-paper ingestion and analysis complete."

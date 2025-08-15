# backend/celery_worker.py

import os
from dotenv import load_dotenv

# Load .env from backend dir so create_app() sees it
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Create app and get Celery instance configured by app.extensions
from app import create_app
from app.extensions import celery

app = create_app()

# Ensure task modules are imported so Celery registers them
import app.tasks            # archive + mirror (Epaper -> Post)
import app.electoral_tasks  # election spine tasks
import app.tasks_epaper     # (optional) post-only legacy task

# Beat schedule (optional)
from celery.schedules import crontab
celery.conf.beat_schedule = {
    "ingest-epaper-jsonl-6am": {
        "task": "app.tasks.ingest_epaper_jsonl",
        "schedule": crontab(hour=6, minute=0),
        "args": ("data/epaper/inbox/articles.jsonl", True),
    },
    # Example: run archive+mirror nightly at 2am using app.tasks
    # "ingest-epaper-jsonl-2am": {
    #     "task": "app.tasks.ingest_epaper_jsonl",
    #     "schedule": crontab(hour=2, minute=0),
    #     "args": ("data/epaper/inbox/articles.jsonl", True),
    # },
}

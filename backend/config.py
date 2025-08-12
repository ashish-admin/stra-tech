import os
from dotenv import load_dotenv
from celery.schedules import crontab

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a_default_secret_key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://user:password@localhost/lokdarpan_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # API Keys
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    TWITTER_BEARER_TOKEN = os.environ.get('TWITTER_BEARER_TOKEN')
    NEWS_API_KEY = os.environ.get('NEWS_API_KEY')

    # Session Cookie Configuration
    SESSION_COOKIE_SAMESITE = 'None'
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True

    # Celery Configuration
    CELERY = dict(
        broker_url=os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
        result_backend=os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
        task_ignore_result=True,
        imports=("app.tasks",)
    )

    # --- NEW: Celery Beat Schedule ---
    CELERY_BEAT_SCHEDULE = {
        'ingest-daily-epaper': {
            'task': 'app.tasks.ingest_and_analyze_epaper',
            # This runs the task every day at 7:00 AM.
            'schedule': crontab(hour=7, minute=0),
            # For testing, you can run it every 5 minutes:
            # 'schedule': crontab(minute='*/5'),
        },
    }
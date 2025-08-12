# backend/config.py

import os
from dotenv import load_dotenv

# Ensure dotenv is loaded right at the start
load_dotenv()

class Config:
    """Base configuration."""
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
        # --- THE FIX IS HERE ---
        # This line tells the Celery worker to look for tasks inside the 'app.tasks' module.
        imports=("app.tasks",)
    )
import os
import secrets
import logging
from dotenv import load_dotenv
from celery.schedules import crontab

load_dotenv()

class Config:
    # Security Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        if os.environ.get('FLASK_ENV') == 'development':
            SECRET_KEY = 'dev-secret-key-change-in-production'
            logging.warning("Using default SECRET_KEY for development. Set SECRET_KEY in production!")
        else:
            raise RuntimeError("SECRET_KEY environment variable must be set in production")
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://user:password@localhost/lokdarpan_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'connect_args': {
            'connect_timeout': 10,
            'sslmode': 'prefer'
        }
    }

    # External API Keys (Validated)
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    TWITTER_BEARER_TOKEN = os.environ.get('TWITTER_BEARER_TOKEN')
    NEWS_API_KEY = os.environ.get('NEWS_API_KEY')

    # Security Headers and Session Configuration
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_NAME = 'lokdarpan_session'
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour

    # CORS Configuration - Allow multiple frontend ports and host formats
    default_origins = 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176,http://127.0.0.1:5177,http://127.0.0.1:5178'
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', default_origins).split(',')
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']
    CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    CORS_SUPPORTS_CREDENTIALS = True

    # Rate Limiting
    RATE_LIMIT_ENABLED = os.environ.get('RATE_LIMIT_ENABLED', 'True').lower() == 'true'
    RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT_PER_MINUTE', '60'))
    RATE_LIMIT_PER_HOUR = int(os.environ.get('RATE_LIMIT_PER_HOUR', '1000'))

    # Security Headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }

    # Audit and Compliance
    AUDIT_LOG_ENABLED = os.environ.get('AUDIT_LOG_ENABLED', 'True').lower() == 'true'
    AUDIT_LOG_LEVEL = os.environ.get('AUDIT_LOG_LEVEL', 'INFO')
    DATA_RETENTION_DAYS = int(os.environ.get('DATA_RETENTION_DAYS', '365'))

    # Input Validation
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file upload
    MAX_REQUEST_SIZE = 1024 * 1024  # 1MB max request size

    # Celery Configuration
    CELERY = dict(
        broker_url=os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
        result_backend=os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
        task_ignore_result=True,
        imports=("app.tasks",)
    )

    # Political Strategist Configuration
    STRATEGIST_ENABLED = os.getenv('STRATEGIST_ENABLED', 'true').lower() == 'true'
    STRATEGIST_MODE = 'proactive'
    THINK_TOKENS = int(os.getenv('THINK_TOKENS', 4096))
    ETAG_TTL = 60
    
    # AI Configuration
    PERPLEXITY_API_KEY = os.environ.get('PERPLEXITY_API_KEY')
    
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
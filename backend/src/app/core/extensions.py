# backend/app/extensions.py

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from celery import Celery
import redis
import os

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

# Instantiate Celery here
celery = Celery(__name__)

# Redis client for caching and AI orchestrator
redis_client = redis.Redis.from_url(
    os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    decode_responses=True
)
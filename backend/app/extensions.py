# backend/app/extensions.py

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from celery import Celery

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

# Instantiate Celery here
celery = Celery(__name__)
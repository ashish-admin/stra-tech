"""
Application factory for the LokDarpan backend.

This module sets up the Flask application, registers extensions, and
registers the various blueprints that expose API endpoints. It mirrors
the structure of the original repository while adding the ward-level
and epaper blueprints.
"""

import os
from flask import Flask
from flask_cors import CORS

from .extensions import db, migrate, login_manager, celery
from .models import User
from .celery_utils import celery_init_app

# API blueprints
from .routes import main_bp
from .trends_api import trends_bp
from .pulse_api import pulse_bp
from .ward_api import ward_bp
from .epaper_api import bp_epaper  # NEW: epaper endpoints


def _cors_origins_from_env():
    """
    Read allowed CORS origins from env (comma-separated).
    Falls back to localhost dev ports used by Vite.
    """
    raw = os.getenv("CORS_ORIGINS", "")
    if raw.strip():
        return [o.strip() for o in raw.split(",") if o.strip()]
    # Dev defaults
    return ["http://localhost:5173", "http://127.0.0.1:5173"]


def create_app(config_class: str = "config.Config") -> Flask:
    """Application factory used by Flask.

    Args:
        config_class: Import path for the configuration object to load.

    Returns:
        Configured Flask application instance.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ----------------- Extensions -----------------
    db.init_app(app)
    migrate.init_app(app, db)

    # CORS (allow credentials for cookies if you add auth later)
    CORS(
        app,
        resources={r"/api/*": {"origins": _cors_origins_from_env()}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        expose_headers=["Content-Type"],
    )

    login_manager.init_app(app)
    celery_init_app(app, celery)

    @login_manager.user_loader
    def load_user(user_id: str):
        return User.query.get(int(user_id)) if user_id else None

    # --------------- Blueprints -------------------
    with app.app_context():
        # Order: general → specific
        app.register_blueprint(main_bp)
        app.register_blueprint(trends_bp)
        app.register_blueprint(pulse_bp)
        app.register_blueprint(ward_bp)
        app.register_blueprint(bp_epaper)  # NEW registrations

        return app

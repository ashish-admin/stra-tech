"""
Application factory for the LokDarpan backend.

This module sets up the Flask application, registers extensions, and
registers the various blueprints that expose API endpoints.  It mirrors
the structure of the original repository while adding the ward‑level
blueprint defined in `ward_api.py`.  Additional blueprints can be
registered here as the system evolves.
"""

from flask import Flask
from flask_cors import CORS

from .extensions import db, migrate, login_manager, celery
from .models import User
from .celery_utils import celery_init_app

# Import API blueprints.  Order matters: register general routes first,
# followed by more specific blueprints to allow overrides.
from .routes import main_bp
from .trends_api import trends_bp
from .pulse_api import pulse_bp
from .ward_api import ward_bp


def create_app(config_class: str = 'config.Config') -> Flask:
    """Application factory used by Flask.

    Args:
        config_class: The configuration object (as string) to load into the
            Flask app.  Defaults to `'config.Config'`.

    Returns:
        Configured Flask application instance.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app,
         origins=["http://localhost:5173", "http://127.0.0.1:5173"],
         supports_credentials=True)
    login_manager.init_app(app)
    celery_init_app(app, celery)

    @login_manager.user_loader
    def load_user(user_id: str):
        return User.query.get(int(user_id)) if user_id else None

    # Register blueprints within application context
    with app.app_context():
        app.register_blueprint(main_bp)
        app.register_blueprint(trends_bp)
        app.register_blueprint(pulse_bp)
        app.register_blueprint(ward_bp)
        return app

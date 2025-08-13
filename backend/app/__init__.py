# backend/app/__init__.py

from flask import Flask
from flask_cors import CORS
from .extensions import db, migrate, login_manager, celery
from .models import User
from .celery_utils import celery_init_app

def create_app(config_class='config.Config'):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)
    login_manager.init_app(app)
    
    # Initialize Celery with the app
    celery_init_app(app, celery)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    with app.app_context():
        # Import and register blueprints
        from .routes import main_bp
        app.register_blueprint(main_bp)

        return app
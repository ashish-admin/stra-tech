import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from .extensions import db, migrate, login_manager

# Load environment variables from .env file
load_dotenv()

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    
    # --- CONFIGURATIONS ARE NOW LOADED FROM ENVIRONMENT ---
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    # ----------------------------------------------------
    
    CORS(app, supports_credentials=True, resources={
        r"/api/*": {
            "origins": ["https://lokdarpan.netlify.app", "http://localhost:5173"]
        }
    })
    
    # Initialize extensions with the app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # Import and register blueprints, models, etc. inside the app context
    with app.app_context():
        from . import models
        
        # --- THIS IS THE CORRECTED IMPORT ---
        from .routes import main_bp
        app.register_blueprint(main_bp, url_prefix='/api/v1')
        # ------------------------------------

        return app
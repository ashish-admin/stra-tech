import os
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = 'main.login' # The route to redirect to for login

def create_app():
    app = Flask(__name__)
    
    # --- THIS IS THE CORRECTED SECTION ---
    # Allow requests only from your deployed frontend and local dev server
    # This also enables sending credentials (like cookies)
    CORS(app, supports_credentials=True, resources={
        r"/api/*": {
            "origins": ["https://lokdarpan.netlify.app", "http://localhost:5173"]
        }
    })
    # ------------------------------------

    # Add a secret key required for Flask sessions
    app.config['SECRET_KEY'] = 'a-very-secret-key-that-you-should-change'
    
    # Configure the database
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, '..', 'database.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Link extensions to the app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # Import and register the blueprint for your routes
    from .routes import bp
    app.register_blueprint(bp)
    
    # Import models so migrations can find the table definitions
    from . import models

    return app
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
login_manager.login_view = 'main.login'

def create_app():
    app = Flask(__name__)
    
    CORS(app, supports_credentials=True, resources={
        r"/api/*": {
            "origins": ["https://lokdarpan.netlify.app", "http://localhost:5173"]
        }
    })

    app.config['SECRET_KEY'] = 'a-very-secret-key-that-you-should-change'
    
    # --- ADD THESE TWO LINES ---
    # This is required for cross-domain session cookies
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'
    app.config['SESSION_COOKIE_SECURE'] = True
    # ---------------------------
    
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, '..', 'database.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Link extensions to the app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    from .routes import bp
    app.register_blueprint(bp)
    
    from . import models

    return app
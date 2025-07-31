import os
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    # Allow requests only from your deployed frontend
    CORS(app, resources={r"/api/*": {"origins": "https://lokdarpan.netlify.app"}})
    # Configure the database
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, '..', 'database.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Link extensions to the app
    db.init_app(app)
    migrate.init_app(app, db)

    # Import and register the blueprint
    from .routes import bp
    app.register_blueprint(bp)

    # Import models so migrations can find them
    from . import models

    return app
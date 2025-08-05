from flask import Flask
from .models import db
from .routes import main_bp
from .tasks import celery
import os

def create_app():
    """
    Creates and configures a Flask application instance.
    """
    app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')
    
    # Load configuration from config.py
    app.config.from_object('config.Config')

    # Initialize extensions
    db.init_app(app)

    # Initialize Celery
    celery.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["CELERY_RESULT_BACKEND"]
    )
    celery.conf.beat_schedule = {
        'fetch-twitter-every-15-minutes': {
            'task': 'app.tasks.fetch_twitter_data',
            'schedule': 43200.0,  # 12 hours in seconds
        },
        'fetch-news-every-hour': {
            'task': 'app.tasks.fetch_news_data',
            'schedule': 43200.0,  # 12 hours in seconds
        },
    }

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    
    # Register blueprints
    app.register_blueprint(main_bp)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(app.static_folder + '/' + path):
            return app.send_static_file(path)
        else:
            return app.send_static_file('index.html')

    return app
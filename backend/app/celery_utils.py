# backend/app/celery_utils.py

from celery import Task

def celery_init_app(app, celery):
    """
    Factory function to correctly initialize Celery with the Flask app context.
    """
    class FlaskTask(Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.config_from_object(app.config["CELERY"])
    celery.Task = FlaskTask
    celery.set_default()
    app.extensions["celery"] = celery
    return celery
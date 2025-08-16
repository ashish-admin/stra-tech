# backend/celery_worker.py
"""
Celery entrypoint for LokDarpan.

Run:
  celery -A celery_worker.celery worker --loglevel=info
  celery -A celery_worker.celery beat   --loglevel=info   (optional)

This module must expose a top-level variable named `celery`.
"""

from celery.schedules import crontab

# Import your Flask app + celery instance
from app import create_app
from app.extensions import celery as _celery
from app.celery_utils import celery_init_app


def _make_celery():
    """Bind Celery to the Flask app and push app context."""
    app = create_app()
    # wire Celery config (BROKER, RESULT_BACKEND, imports, etc.)
    celery_init_app(app, _celery)
    # push context so tasks can use db/session
    app.app_context().push()
    return _celery


# This is what `celery -A celery_worker.celery ...` points to
celery = _make_celery()

# Optional: runtime config / warnings cleanup
celery.conf.update(
    timezone="UTC",
    broker_connection_retry_on_startup=True,  # avoids the pending deprecation warning
)

# ---- Beat schedule (OPTIONAL) ----
# Safe default: empty schedule. Uncomment the example to enable it.
celery.conf.beat_schedule = {
    # "ingest-epaper-dir-6am": {
    #     "task": "app.tasks.ingest_epaper_dir",
    #     "schedule": crontab(hour=6, minute=0),  # every day at 06:00 UTC
    #     "args": ("data/epaper/inbox", True),
    # },
}

if __name__ == "__main__":
    # Allows: python backend/celery_worker.py worker --loglevel=info
    celery.start()

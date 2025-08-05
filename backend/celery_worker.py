# celery_worker.py

from dotenv import load_dotenv

# Load environment variables from .env file BEFORE anything else.
# This is the crucial line that was missing.
load_dotenv()

from app import create_app
from app.tasks import celery

# The rest of the file remains the same
app = create_app()
app.app_context().push()
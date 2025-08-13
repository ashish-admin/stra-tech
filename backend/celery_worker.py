# backend/celery_worker.py

import os
from dotenv import load_dotenv

# Find the absolute path of the .env file in the backend directory
# This ensures the worker can be started from any location.
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Now that the environment is loaded, we can create the application
from app import create_app
from app.extensions import celery

# The application factory will now use the pre-loaded environment variables
app = create_app()

# The celery instance is already configured by celery_init_app within create_app
# and is now guaranteed to have the correct broker/backend URLs.
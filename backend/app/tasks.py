from celery import Celery
import logging
from . import services

# Define the Celery instance
celery = Celery(__name__, broker='redis://localhost:6379/0', backend='redis://localhost:6379/0')

@celery.task
def fetch_twitter_data():
    """Celery task to fetch and process tweets."""
    logging.info("--- Triggering Twitter fetch task ---")
    result = services.fetch_and_process_tweets()
    logging.info(f"--- Twitter fetch task finished: {result} ---")
    return result

@celery.task
def fetch_news_data():
    """Celery task to fetch and process news articles."""
    logging.info("--- Triggering News fetch task ---")
    result = services.fetch_and_process_news()
    logging.info(f"--- News fetch task finished: {result} ---")
    return result
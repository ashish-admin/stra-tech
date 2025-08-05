from flask import Blueprint, jsonify, request, send_from_directory
from .models import db, Post, Author, Alert
from . import services
from sqlalchemy import func
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

main_bp = Blueprint('main', __name__)

# --- NEW Proactive Analysis Endpoint ---
@main_bp.route('/api/v1/proactive-analysis', methods=['POST'])
def get_proactive_analysis():
    """
    Triggers an on-demand strategic analysis for a given context.
    Expects a JSON body with 'context_level' and 'context_name'.
    e.g., {"context_level": "ward", "context_name": "Jubilee Hills"}
    """
    data = request.get_json()
    if not data or 'context_level' not in data or 'context_name' not in data:
        return jsonify({"error": "Missing 'context_level' or 'context_name' in request body"}), 400

    context_level = data['context_level']
    context_name = data['context_name']
    
    logging.info(f"Received request for proactive analysis for {context_level}: {context_name}")
    
    try:
        analysis_result = services.generate_proactive_analysis(context_level, context_name)
        return jsonify(analysis_result)
    except Exception as e:
        logging.error(f"Error during proactive analysis for {context_name}: {e}", exc_info=True)
        return jsonify({"error": "An internal server error occurred during analysis."}), 500

# --- Existing Endpoints (Unchanged) ---

@main_bp.route('/api/v1/map-data/ghmc-wards', methods=['GET'])
def get_ghmc_wards_data():
    """ Serves the ghmc_wards.geojson file. """
    try:
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        return send_from_directory(data_dir, 'ghmc_wards.geojson')
    except Exception as e:
        logging.error(f"Error serving map data: {e}", exc_info=True)
        return jsonify({"error": "Could not load map data"}), 500

@main_bp.route('/api/v1/posts', methods=['GET'])
def get_posts():
    """ Fetches all posts from the database. """
    logging.info("Received request for /api/v1/posts")
    try:
        posts = Post.query.join(Author).order_by(Post.created_at.desc()).all()
        posts_data = [post.to_dict() for post in posts]
        return jsonify(posts_data)
    except Exception as e:
        logging.error(f"Error fetching posts: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@main_bp.route('/api/v1/alerts', methods=['GET'])
def get_alerts():
    """ Fetches all unread alerts from the database. """
    logging.info("Received request for /api/v1/alerts")
    try:
        # Fetch the 10 most recent unread alerts
        alerts = Alert.query.filter_by(is_read=False).order_by(Alert.created_at.desc()).limit(10).all()
        alerts_data = [alert.to_dict() for alert in alerts]
        return jsonify(alerts_data)
    except Exception as e:
        logging.error(f"Error fetching alerts: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@main_bp.route('/api/v1/competitive-analysis', methods=['GET'])
def get_competitive_analysis():
    """ Provides a competitive analysis by aggregating post counts. """
    # ... (existing code remains the same)
    pass

@main_bp.route('/api/v1/strategic-summary/<ward_name>', methods=['GET'])
def get_strategic_summary_for_ward(ward_name):
    """ Generates the strategic playbook for a specific ward. """
    # ... (existing code remains the same)
    pass
from flask import Blueprint, jsonify, request, send_from_directory
from .models import db, Post, Author
from . import services
from sqlalchemy import func
import logging
import os # Import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

main_bp = Blueprint('main', __name__)

# --- NEW API ENDPOINT FOR MAP DATA ---
@main_bp.route('/api/v1/map-data/ghmc-wards', methods=['GET'])
def get_ghmc_wards_data():
    """
    Serves the ghmc_wards.geojson file from the backend data directory.
    """
    try:
        # Construct the path to the data directory within the app
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
        posts = Post.query.join(Author).all()
        posts_data = [post.to_dict() for post in posts]
        logging.info(f"Successfully retrieved {len(posts_data)} posts.")
        return jsonify(posts_data)
    except Exception as e:
        logging.error(f"Error fetching posts: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

# ... (the rest of your routes.py file remains the same) ...

@main_bp.route('/api/v1/wards', methods=['GET'])
def get_wards():
    """ Fetches all unique ward names from the database. """
    logging.info("Received request for /api/v1/wards")
    try:
        wards = db.session.query(Post.ward).distinct().all()
        ward_names = [ward[0] for ward in wards]
        logging.info(f"Successfully retrieved {len(ward_names)} unique wards.")
        return jsonify(ward_names)
    except Exception as e:
        logging.error(f"Error fetching wards: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@main_bp.route('/api/v1/competitive-analysis', methods=['GET'])
def get_competitive_analysis():
    """ Provides a competitive analysis by aggregating post counts and emotion distribution by author affiliation. """
    logging.info("Received request for /api/v1/competitive-analysis")
    try:
        results = db.session.query(
            Author.affiliation,
            Post.emotion,
            func.count(Post.id)
        ).join(Post, Author.id == Post.author_id)\
         .group_by(Author.affiliation, Post.emotion)\
         .all()

        analysis_data = {
            "Client": {"total_posts": 0, "emotions": {}},
            "Opposition": {"total_posts": 0, "emotions": {}}
        }

        for affiliation, emotion, count in results:
            if affiliation in analysis_data:
                analysis_data[affiliation]["total_posts"] += count
                analysis_data[affiliation]["emotions"][emotion] = count

        logging.info(f"Successfully generated competitive analysis data: {analysis_data}")
        return jsonify(analysis_data)
        
    except Exception as e:
        logging.error(f"Error generating competitive analysis: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@main_bp.route('/api/v1/strategic-summary/<ward_name>', methods=['GET'])
def get_strategic_summary_for_ward(ward_name):
    """ Generates and returns the strategic playbook for a specific ward. """
    logging.info(f"Received request for strategic summary for ward: {ward_name}")
    try:
        ward_posts = Post.query.filter_by(ward=ward_name).all()
        ward_posts_data = [post.to_dict() for post in ward_posts]
        
        logging.info(f"Found {len(ward_posts_data)} posts for {ward_name} to generate summary.")

        summary_data = services.get_strategic_summary(ward_name, ward_posts_data)
        
        return jsonify(summary_data)

    except Exception as e:
        logging.error(f"Error generating strategic summary for {ward_name}: {e}", exc_info=True)
        return jsonify({"error": f"An internal error occurred while generating summary for {ward_name}"}), 500
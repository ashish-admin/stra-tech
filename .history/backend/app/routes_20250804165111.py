from flask import Blueprint, jsonify
from .models import db, Post, Author
from sqlalchemy import func
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

main_bp = Blueprint('main', __name__)

@main_bp.route('/api/v1/posts', methods=['GET'])
def get_posts():
    """
    Fetches all posts from the database.
    """
    logging.info("Received request for /api/v1/posts")
    try:
        posts = Post.query.join(Author).all()
        posts_data = [post.to_dict() for post in posts]
        logging.info(f"Successfully retrieved {len(posts_data)} posts.")
        return jsonify(posts_data)
    except Exception as e:
        logging.error(f"Error fetching posts: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@main_bp.route('/api/v1/wards', methods=['GET'])
def get_wards():
    """
    Fetches all unique ward names from the database.
    """
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
    """
    Provides a competitive analysis by aggregating post counts and emotion
    distribution by author affiliation ('Client' vs. 'Opposition').
    """
    logging.info("Received request for /api/v1/competitive-analysis")
    try:
        # Query to get emotion counts per affiliation
        results = db.session.query(
            Author.affiliation,
            Post.emotion,
            func.count(Post.id)
        ).join(Post, Author.id == Post.author_id)\
         .group_by(Author.affiliation, Post.emotion)\
         .all()

        # Structure the data for the frontend
        analysis_data = {
            "Client": {"total_posts": 0, "emotions": {}},
            "Opposition": {"total_posts": 0, "emotions": {}}
        }

        for affiliation, emotion, count in results:
            if affiliation in analysis_data:
                # Increment total post count for the affiliation
                analysis_data[affiliation]["total_posts"] += count
                # Store the count for the specific emotion
                analysis_data[affiliation]["emotions"][emotion] = count

        logging.info(f"Successfully generated competitive analysis data: {analysis_data}")
        return jsonify(analysis_data)
        
    except Exception as e:
        logging.error(f"Error generating competitive analysis: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@main_bp.route('/api/v1/strategic-summary/<ward_name>', methods=['GET'])
def get_strategic_summary_for_ward(ward_name):
    # This is a placeholder for the Phase 3 feature.
    # We will implement the full logic for this later.
    logging.info(f"Received request for strategic summary for ward: {ward_name}")
    summary = {
        "candidate_briefing": f"Placeholder summary for {ward_name}. Opposition is focusing on road quality.",
        "talking_points": ["Highlight our recent infrastructure investments.", "Announce new cleanup drive."],
        "social_media_drafts": ["Post about the new park opening soon!", "Share testimonials from happy residents."],
        "proactive_initiatives": ["Organize a town hall meeting.", "Conduct a press conference on development."]
    }
    return jsonify(summary)
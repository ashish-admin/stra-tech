from flask import Blueprint, jsonify
from .models import Post

bp = Blueprint('main', __name__)

@bp.route('/api/v1/analytics', methods=['GET'])
def analytics():
    # Query all posts from the database
    posts = Post.query.all()

    # Convert each post object to a dictionary and return as JSON
    return jsonify([post.to_dict() for post in posts])
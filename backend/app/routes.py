import os
from flask import Blueprint, jsonify, request, current_app, send_from_directory
from functools import wraps
from flask_login import current_user, login_user, logout_user
from .models import db, User, Post, Alert, Author
from .extensions import celery
from sqlalchemy import func

main_bp = Blueprint('api', __name__, url_prefix='/api/v1')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'message': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function

@main_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        login_user(user)
        return jsonify({'message': 'Login successful.', 'user': user.to_dict()}), 200
    return jsonify({'message': 'Invalid username or password.'}), 401

@main_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logout successful.'}), 200

@main_bp.route('/status', methods=['GET'])
def status():
    if current_user.is_authenticated:
        return jsonify({'logged_in': True, 'user': current_user.to_dict()}), 200
    return jsonify({'logged_in': False}), 200

@main_bp.route('/posts', methods=['GET'])
@login_required
def get_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    return jsonify([post.to_dict() for post in posts]), 200

@main_bp.route('/geojson', methods=['GET'])
@login_required
def get_geojson():
    data_directory = os.path.join(current_app.root_path, 'data')
    return send_from_directory(data_directory, 'ghmc_wards.geojson')

# --- UPGRADE: This endpoint is now dynamic and accepts filters ---
@main_bp.route('/competitive-analysis', methods=['GET'])
@login_required
def competitive_analysis():
    """Calculates the sentiment breakdown per author, optionally filtered by city/ward."""
    try:
        query = db.session.query(
            Author.name,
            Post.emotion,
            func.count(Post.id)
        ).join(Post, Author.id == Post.author_id)

        # Apply optional city filter from the request
        city_filter = request.args.get('city')
        if city_filter and city_filter != 'All':
            query = query.filter(Post.city == city_filter)

        analysis = query.group_by(Author.name, Post.emotion).all()
        
        result = {}
        for author, emotion, count in analysis:
            if author not in result:
                result[author] = {}
            result[author][emotion] = count
            
        return jsonify(result)
    except Exception as e:
        current_app.logger.error(f"Error in competitive analysis: {e}")
        return jsonify({"error": "Analysis failed"}), 500

@main_bp.route('/trigger_analysis', methods=['POST'])
@login_required
def trigger_analysis():
    data = request.get_json()
    ward_name = data.get('ward')
    if not ward_name:
        return jsonify({'error': 'Ward name is required'}), 400

    task_name = 'app.tasks.analyze_news_for_alerts'
    celery.send_task(task_name, args=[ward_name])
    return jsonify({'message': f'Analysis for {ward_name} has been triggered.'}), 202

@main_bp.route('/alerts/<ward_name>', methods=['GET'])
@login_required
def get_alerts(ward_name):
    alert = Alert.query.filter_by(ward=ward_name).order_by(Alert.created_at.desc()).first()
    if alert:
        return jsonify(alert.to_dict())
    return jsonify({'message': 'No alerts found for this ward. Please trigger an analysis.'}), 404
from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

bp = Blueprint('main', __name__)

# --- Temporary Hardcoded User ---
# In a real app, this would come from a database.
TEMP_USERNAME = "admin"
# IMPORTANT: We store the HASH of the password, never the password itself.
# The original password is "password"
TEMP_PASSWORD_HASH = generate_password_hash("password")
# --------------------------------

@bp.route('/api/v1/login', methods=['POST'])
def login():
    data = request.get_json()
    if (data.get('username') == TEMP_USERNAME and 
        check_password_hash(TEMP_PASSWORD_HASH, data.get('password'))):
        # Use Flask's session to mark the user as logged in
        session['logged_in'] = True
        return jsonify({'message': 'Logged in successfully'}), 200

    return jsonify({'message': 'Invalid username or password'}), 401

@bp.route('/api/v1/logout', methods=['POST'])
def logout():
    session.pop('logged_in', None)
    return jsonify({'message': 'Logged out successfully'}), 200

@bp.route('/api/v1/status', methods=['GET'])
def status():
    if session.get('logged_in'):
        return jsonify({'logged_in': True})
    else:
        return jsonify({'logged_in': False})

# This route is now protected by checking the session
@bp.route('/api/v1/analytics', methods=['GET'])
def analytics():
    if not session.get('logged_in'):
        return jsonify({'message': 'Authentication required'}), 401

    # This part is the same as before
    from .models import Post
    posts = Post.query.all()
    return jsonify([post.to_dict() for post in posts])
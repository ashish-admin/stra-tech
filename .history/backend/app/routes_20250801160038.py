from flask import Blueprint, jsonify, request, session
from .models import Post, User
from . import db
from werkzeug.security import check_password_hash, generate_password_hash
from flask_login import login_user, logout_user, login_required, current_user

# --- New Imports for Geo-Analytics ---
import os
import geopandas as gpd
from shapely.geometry import Point
# ------------------------------------


bp = Blueprint('main', __name__)

# --- Simple Caching for GeoJSON file ---
# This avoids reloading the large file on every API call
wards_gdf = None

def load_wards_geojson():
    global wards_gdf
    if wards_gdf is None:
        geojson_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ghmc_wards.geojson')
        wards_gdf = gpd.read_file(geojson_path)
    return wards_gdf
# -----------------------------------------


# --- Existing Authentication Routes (No Changes) ---
@bp.route('/api/v1/login', methods=['POST'])
def login():
    # ... (existing login code remains the same)
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    if user is None or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid username or password'}), 401
    
    login_user(user)
    return jsonify({'message': 'Logged in successfully'}), 200

@bp.route('/api/v1/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@bp.route('/api/v1/status', methods=['GET'])
def status():
    if current_user.is_authenticated:
        return jsonify({'logged_in': True, 'username': current_user.username})
    else:
        return jsonify({'logged_in': False})
# ----------------------------------------------------


# --- Existing Main Analytics Route (No Changes) ---
@bp.route('/api/v1/analytics', methods=['GET'])
@login_required
def analytics():
    posts = Post.query.all()
    return jsonify([post.to_dict() for post in posts])


# --- NEW GRANULAR ANALYTICS ENDPOINT ---
@bp.route('/api/v1/analytics/granular', methods=['GET'])
@login_required
def granular_analytics():
    try:
        # 1. Load the GHMC wards boundaries
        wards = load_wards_geojson()

        # 2. Get all posts from the database
        posts = Post.query.all()
        if not posts:
            return jsonify([])

        # 3. Convert posts to a GeoDataFrame
        posts_gdf = gpd.GeoDataFrame(
            [post.to_dict() for post in posts],
            geometry=[Point(p.longitude, p.latitude) for p in posts]
        )
        posts_gdf.set_crs(wards.crs, inplace=True) # Ensure coordinate systems match

        # 4. Perform a spatial join to find which ward each post is in
        joined_gdf = gpd.sjoin(posts_gdf, wards, how="inner", predicate='within')

        # 5. Aggregate the data to find the dominant emotion per ward
        # First, count emotions in each ward
        emotion_counts = joined_gdf.groupby(['ward_name', 'emotion']).size().unstack(fill_value=0)
        
        # Then, find the emotion with the highest count for each ward
        dominant_emotion = emotion_counts.idxmax(axis=1)
        
        # Prepare the results
        results = []
        for ward_name, emotion in dominant_emotion.items():
            results.append({
                'ward_name': ward_name,
                'dominant_emotion': emotion,
                'post_count': int(emotion_counts.loc[ward_name].sum())
            })

        return jsonify(results)

    except Exception as e:
        print(f"Error in granular analytics: {e}")
        return jsonify({"error": "An error occurred during geo-analysis"}), 500
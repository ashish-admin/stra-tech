from flask import Blueprint, jsonify, request
from .models import Post, User
from . import db
from flask_login import login_user, logout_user, current_user

# --- New Imports for Geo-Analytics ---
import os
import geopandas as gpd
from shapely.geometry import Point
# ------------------------------------

bp = Blueprint('main', __name__)

# --- Simple Caching for GeoJSON file ---
wards_gdf = None

def load_wards_geojson():
    global wards_gdf
    if wards_gdf is None:
        # Correctly builds the path from the app's root
        geojson_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ghmc_wards.geojson')
        wards_gdf = gpd.read_file(geojson_path)
    return wards_gdf
# -----------------------------------------

# --- Authentication Routes ---
@bp.route('/api/v1/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 409
    
    new_user = User(username=data['username'])
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User created successfully'}), 201

@bp.route('/api/v1/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    if user is None or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid username or password'}), 401
    
    login_user(user)
    return jsonify({'message': 'Logged in successfully', 'username': user.username}), 200

@bp.route('/api/v1/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@bp.route('/api/v1/status', methods=['GET'])
def status():
    if current_user.is_authenticated:
        return jsonify({'logged_in': True, 'username': current_user.username})
    else:
        return jsonify({'logged_in': False})

# --- Protected API Endpoints ---

@bp.route('/api/v1/analytics', methods=['GET'])
def analytics():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
        
    posts = Post.query.all()
    return jsonify([post.to_dict() for post in posts])

# --- THIS IS THE FULLY IMPLEMENTED GRANULAR ANALYTICS ENDPOINT ---
@bp.route('/api/v1/analytics/granular', methods=['GET'])
def granular_analytics():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
    
    try:
        # 1. Load the GHMC wards boundaries
        wards = load_wards_geojson()

        # 2. Get all posts from the database that have coordinates
        posts = Post.query.filter(Post.latitude.isnot(None), Post.longitude.isnot(None)).all()
        if not posts:
            return jsonify([])

        # 3. Convert posts to a GeoDataFrame
        posts_data = [p.to_dict() for p in posts]
        geometry = [Point(p['longitude'], p['latitude']) for p in posts_data]
        posts_gdf = gpd.GeoDataFrame(posts_data, geometry=geometry, crs="EPSG:4326")

        # 4. Perform a spatial join
        joined_gdf = gpd.sjoin(posts_gdf, wards, how="inner", predicate='within')

        # 5. Aggregate the data to find the dominant emotion per ward
        if joined_gdf.empty:
            return jsonify([])
            
        emotion_counts = joined_gdf.groupby(['name', 'emotion']).size().unstack(fill_value=0)
        dominant_emotion = emotion_counts.idxmax(axis=1)
        
        results = []
        for ward_name, emotion in dominant_emotion.items():
            ward_data = wards[wards['name'] == ward_name]
            results.append({
                'ward_name': ward_name,
                'dominant_emotion': emotion,
                'post_count': int(emotion_counts.loc[ward_name].sum()),
                'geometry': ward_data.geometry.__geo_interface__['features'][0]['geometry']
            })

        return jsonify(results)

    except Exception as e:
        # Log the full error to the server console for debugging
        print(f"Error in granular analytics: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An error occurred during geo-analysis"}), 500
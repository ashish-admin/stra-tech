from flask import Blueprint, jsonify, request, current_app
from .models import Post, User, Author # Ensure Author is imported
from . import db
from flask_login import login_user, logout_user, current_user
import os
import geopandas as gpd
from shapely.geometry import Point
import pandas as pd

# --- CORRECTED IMPORT ---
# Import the functions that actually exist in your services.py file
from .services import generate_proactive_analysis, get_strategic_summary, fetch_and_process_tweets, fetch_and_process_news

main_bp = Blueprint('main', __name__)

# --- Caching and GeoJSON loading (no changes) ---
wards_gdf = None
def load_wards_geojson():
    global wards_gdf
    if wards_gdf is None:
        geojson_path = os.path.join(current_app.root_path, 'data', 'ghmc_wards.geojson')
        if not os.path.exists(geojson_path):
            raise FileNotFoundError(f"GeoJSON file not found at path: {geojson_path}")
        wards_gdf = gpd.read_file(geojson_path)
    return wards_gdf

# --- Authentication Routes (no changes) ---
@main_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user is None or not user.check_password(data.get('password')):
        return jsonify({'message': 'Invalid username or password'}), 401
    login_user(user)
    return jsonify({'message': 'Logged in successfully'}), 200

@main_bp.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@main_bp.route('/status', methods=['GET'])
def status():
    if current_user.is_authenticated:
        return jsonify({'logged_in': True, 'username': current_user.username})
    else:
        return jsonify({'logged_in': False})

# --- Protected API Endpoints ---

@main_bp.route('/posts', methods=['GET'])
def get_posts():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
    posts = Post.query.all()
    return jsonify([post.to_dict() for post in posts])

@main_bp.route('/granular-analytics', methods=['GET'])
def granular_analytics():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
    
    try:
        wards = load_wards_geojson()
        posts = Post.query.filter(Post.latitude.isnot(None), Post.longitude.isnot(None)).all()
        if not posts: return jsonify([])

        posts_df = pd.DataFrame([p.to_dict() for p in posts])
        posts_df['longitude'] = pd.to_numeric(posts_df['longitude'])
        posts_df['latitude'] = pd.to_numeric(posts_df['latitude'])
        geometry = [Point(xy) for xy in zip(posts_df['longitude'], posts_df['latitude'])]
        posts_gdf = gpd.GeoDataFrame(posts_df, geometry=geometry, crs="EPSG:4326")
        
        if wards.crs is None: wards.set_crs("EPSG:4326", inplace=True)
        if posts_gdf.crs != wards.crs: posts_gdf.to_crs(wards.crs, inplace=True)

        joined_gdf = gpd.sjoin(posts_gdf, wards, how="inner", predicate='within')

        if joined_gdf.empty: return jsonify([])
            
        emotion_counts = joined_gdf.groupby(['ward_name', 'emotion']).size().unstack(fill_value=0)
        dominant_emotion = emotion_counts.idxmax(axis=1)
        
        results = []
        for ward_name, emotion in dominant_emotion.items():
            ward_data = wards[wards['ward_name'] == ward_name]
            results.append({
                'ward_name': ward_name,
                'dominant_emotion': emotion,
                'post_count': int(emotion_counts.loc[ward_name].sum()),
                'geometry': ward_data.geometry.__geo_interface__['features'][0]['geometry']
            })
        return jsonify(results)
    except Exception as e:
        print(f"Error in granular analytics: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An error occurred during geo-analysis"}), 500

# --- On-Demand Analysis Endpoint ---
@main_bp.route('/proactive-analysis', methods=['POST'])
def proactive_analysis_route():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
    
    data = request.get_json()
    context_level = data.get('context_level')
    context_name = data.get('context_name')

    if not all([context_level, context_name]):
        return jsonify({"error": "context_level and context_name are required."}), 400

    # Call the service function to get the analysis
    analysis_result = generate_proactive_analysis(context_level, context_name)
    return jsonify(analysis_result)

# --- Strategic Playbook Endpoint ---
@main_bp.route('/strategic-summary/<ward_name>', methods=['GET'])
def strategic_summary_route(ward_name):
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
        
    posts_in_ward = Post.query.filter_by(ward=ward_name).all()
    posts_data = [p.to_dict() for p in posts_in_ward]
    
    summary = get_strategic_summary(ward_name, posts_data)
    return jsonify(summary)

# --- Data Ingestion Endpoints (for manual triggering) ---
@main_bp.route('/fetch-tweets', methods=['POST'])
def fetch_tweets_route():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
    result = fetch_and_process_tweets()
    return jsonify({"message": result})

@main_bp.route('/fetch-news', methods=['POST'])
def fetch_news_route():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
    result = fetch_and_process_news()
    return jsonify({"message": result})
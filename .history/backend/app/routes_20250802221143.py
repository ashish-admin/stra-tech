from flask import Blueprint, jsonify, request, current_app
from .models import Post, User
from . import db
from flask_login import login_user, logout_user, current_user, login_required
import os
import geopandas as gpd
from shapely.geometry import Point
import pandas as pd
import json
from collections import Counter
import google.generativeai as genai
from sqlalchemy import distinct
import traceback

bp = Blueprint('api', __name__, url_prefix='/api/v1')

wards_gdf = None
def load_wards_geojson():
    global wards_gdf
    if wards_gdf is None:
        geojson_path = os.path.join(current_app.root_path, 'data', 'ghmc_wards.geojson')
        if not os.path.exists(geojson_path):
             raise FileNotFoundError(f"GeoJSON file not found at path: {geojson_path}")
        wards_gdf = gpd.read_file(geojson_path)
    return wards_gdf

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user is None or not user.check_password(data.get('password')):
        return jsonify({'message': 'Invalid username or password'}), 401
    login_user(user)
    return jsonify({'message': 'Logged in successfully'}), 200

@bp.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@bp.route('/status', methods=['GET'])
def status():
    return jsonify({'logged_in': current_user.is_authenticated})

@bp.route('/wards', methods=['GET'])
@login_required
def get_wards():
    try:
        wards_query = db.session.query(distinct(Post.ward)).filter(Post.ward.isnot(None)).order_by(Post.ward).all()
        wards = [ward[0] for ward in wards_query]
        return jsonify(wards)
    except Exception as e:
        print(f"\n❌ ERROR IN /api/v1/wards ❌\n{traceback.format_exc()}\n")
        return jsonify({"error": "Could not fetch ward list"}), 500

@bp.route('/analytics', methods=['GET'])
@login_required
def analytics():
    endpoint_name = "/api/v1/analytics"
    try:
        print(f"--- Received request for {endpoint_name} with args: {request.args} ---")
        filters = { 'emotion': request.args.get('emotion', 'All'), 'city': request.args.get('city', 'All'), 'ward': request.args.get('ward', 'All'), 'searchTerm': request.args.get('searchTerm', '') }
        query = Post.query
        if filters['emotion'] != 'All': query = query.filter(Post.emotion == filters['emotion'])
        if filters['city'] != 'All': query = query.filter(Post.city == filters['city'])
        if filters['ward'] != 'All': query = query.filter(Post.ward == filters['ward'])
        if filters['searchTerm']: query = query.filter(Post.text.like(f"%{filters['searchTerm']}%"))
        posts = query.all()
        print(f"--- Found {len(posts)} posts for {endpoint_name} ---")
        return jsonify([p.to_dict() for p in posts])
    except Exception as e:
        print(f"\n❌ ERROR IN {endpoint_name} ❌\n{traceback.format_exc()}\n")
        return jsonify({"error": f"Failed to retrieve analytics data"}), 500

@bp.route('/analytics/granular', methods=['GET'])
@login_required
def granular_analytics():
    endpoint_name = "/api/v1/analytics/granular"
    try:
        print(f"--- Received request for {endpoint_name} ---")
        wards = load_wards_geojson()
        posts = Post.query.filter(Post.latitude.isnot(None), Post.longitude.isnot(None)).all()
        if not posts: return jsonify({"type": "FeatureCollection", "features": []})

        ward_data = {row['name']: {'posts': [], 'geometry': row.geometry} for _, row in wards.iterrows()}
        for post in posts:
            if post.ward and post.ward in ward_data:
                ward_data[post.ward]['posts'].append(post)
        
        results = []
        for ward_name, data in ward_data.items():
            if not data['posts']: continue
            emotions = [p.emotion for p in data['posts'] if p.emotion]
            drivers = [driver for p in data['posts'] if p.drivers for driver in p.drivers]
            results.append({
                "type": "Feature", "geometry": data['geometry'].__geo_interface__,
                "properties": {
                    "ward_name": ward_name, "dominant_emotion": Counter(emotions).most_common(1)[0][0] if emotions else 'N/A',
                    "post_count": len(data['posts']), "top_drivers": [driver[0] for driver in Counter(drivers).most_common(3)]
                }
            })
        print(f"--- Processed {len(results)} wards for {endpoint_name} ---")
        return jsonify({"type": "FeatureCollection", "features": results})
    except Exception as e:
        print(f"\n❌ ERROR IN {endpoint_name} ❌\n{traceback.format_exc()}\n")
        return jsonify({"error": "An error occurred during geo-analysis"}), 500
        
@bp.route('/strategic-summary', methods=['GET'])
@login_required
def strategic_summary():
    try:
        filters = {
            'emotion': request.args.get('emotion', 'All'),
            'city': request.args.get('city', 'All'),
            'ward': request.args.get('ward', 'All'),
            'searchTerm': request.args.get('searchTerm', '')
        }
        query = Post.query
        if filters['emotion'] != 'All': query = query.filter(Post.emotion == filters['emotion'])
        if filters['city'] != 'All': query = query.filter(Post.city == filters['city'])
        if filters['ward'] != 'All': query = query.filter(Post.ward == filters['ward'])
        if filters['searchTerm']: query = query.filter(Post.text.like(f"%{filters['searchTerm']}%"))
        filtered_posts = query.limit(100).all()

        if len(filtered_posts) < 2:
            return jsonify({"opportunity": "Not enough data for this filter.", "threat": "Please broaden your criteria.", "prescriptive_action": "Try selecting 'All' for filters."})

        top_emotion = pd.Series([p.emotion for p in filtered_posts]).mode()[0]
        all_drivers = [driver for p in filtered_posts if p.drivers for driver in p.drivers]
        top_drivers_text = ", ".join([d[0] for d in Counter(all_drivers).most_common(3)])
        
        prompt = f"""
        As a political strategist in Hyderabad, India, provide a JSON response with "opportunity", "threat", and "prescriptive_action" keys based on this intelligence:
        - Dominant emotion: "{top_emotion}"
        - Key topics: "{top_drivers_text if top_drivers_text else 'General chatter'}"
        - News Context: "Recent local news reports indicate growing public concern over road quality and infrastructure projects."
        """
        return jsonify(generate_ai_response(prompt))
    except Exception as e:
        return jsonify({"error": f"Failed to generate dynamic strategic summary: {e}"}), 500

def generate_ai_response(prompt):
    model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config={"response_mime_type": "application/json"})
    response = model.generate_content(prompt)
    return json.loads(response.text)
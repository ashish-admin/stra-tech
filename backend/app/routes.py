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

# --- Helper function for GeoJSON loading (No Changes) ---
wards_gdf = None
def load_wards_geojson():
    global wards_gdf
    if wards_gdf is None:
        geojson_path = os.path.join(current_app.root_path, 'data', 'ghmc_wards.geojson')
        if not os.path.exists(geojson_path):
             raise FileNotFoundError(f"GeoJSON file not found at path: {geojson_path}")
        wards_gdf = gpd.read_file(geojson_path)
    return wards_gdf

# --- Authentication and Basic Routes (No Changes) ---
@bp.route('/login', methods=['POST'])
def login():
    # ... (code is unchanged)
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user is None or not user.check_password(data.get('password')):
        return jsonify({'message': 'Invalid username or password'}), 401
    login_user(user)
    return jsonify({'message': 'Logged in successfully'}), 200

@bp.route('/logout', methods=['POST'])
def logout():
    # ... (code is unchanged)
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@bp.route('/status', methods=['GET'])
def status():
    # ... (code is unchanged)
    return jsonify({'logged_in': current_user.is_authenticated})

@bp.route('/wards', methods=['GET'])
@login_required
def get_wards():
    # ... (code is unchanged)
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
    # ... (code is unchanged)
    try:
        filters = { 'emotion': request.args.get('emotion', 'All'), 'city': request.args.get('city', 'All'), 'ward': request.args.get('ward', 'All'), 'searchTerm': request.args.get('searchTerm', '') }
        query = Post.query
        if filters['emotion'] != 'All': query = query.filter(Post.emotion == filters['emotion'])
        if filters['city'] != 'All': query = query.filter(Post.city == filters['city'])
        if filters['ward'] != 'All': query = query.filter(Post.ward == filters['ward'])
        if filters['searchTerm']: query = query.filter(Post.text.like(f"%{filters['searchTerm']}%"))
        posts = query.all()
        return jsonify([p.to_dict() for p in posts])
    except Exception as e:
        print(f"\n❌ ERROR IN /api/v1/analytics ❌\n{traceback.format_exc()}\n")
        return jsonify({"error": f"Failed to retrieve analytics data"}), 500

@bp.route('/analytics/granular', methods=['GET'])
@login_required
def granular_analytics():
    # ... (code is unchanged)
    try:
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
        return jsonify({"type": "FeatureCollection", "features": results})
    except Exception as e:
        print(f"\n❌ ERROR IN /api/v1/analytics/granular ❌\n{traceback.format_exc()}\n")
        return jsonify({"error": "An error occurred during geo-analysis"}), 500

# --- STRATEGIC COMMS WORKBENCH ENDPOINT (UPGRADED) ---
@bp.route('/strategic-summary', methods=['GET'])
@login_required
def strategic_summary():
    endpoint_name = "/api/v1/strategic-summary"
    try:
        print(f"--- Received request for {endpoint_name} with args: {request.args} ---")
        filters = { 'emotion': request.args.get('emotion', 'All'), 'city': request.args.get('city', 'All'), 'ward': request.args.get('ward', 'All'), 'searchTerm': request.args.get('searchTerm', '') }
        
        query = Post.query
        if filters['emotion'] != 'All': query = query.filter(Post.emotion == filters['emotion'])
        if filters['city'] != 'All': query = query.filter(Post.city == filters['city'])
        if filters['ward'] != 'All': query = query.filter(Post.ward == filters['ward'])
        if filters['searchTerm']: query = query.filter(Post.text.like(f"%{filters['searchTerm']}%"))
        
        filtered_posts = query.limit(100).all()

        if len(filtered_posts) < 2:
            return jsonify({"error": "Not enough data for the current filter selection. Please broaden your criteria."})

        top_emotion = pd.Series([p.emotion for p in filtered_posts]).mode()[0]
        all_drivers = [driver for p in filtered_posts if p.drivers for driver in p.drivers]
        top_drivers_text = ", ".join([d[0] for d in Counter(all_drivers).most_common(3)])
        
        # --- NEW, MORE SOPHISTICATED AI PROMPT ---
        prompt = f"""
        You are an expert political communications director for a campaign in Hyderabad, India. 
        Based on the intelligence provided, generate a complete communications playbook.

        **Intelligence:**
        - Dominant detected emotion: "{top_emotion}"
        - Key topics of public discussion: "{top_drivers_text if top_drivers_text else 'General chatter'}"
        - Location Context: The analysis is focused on the "{filters['ward']}" ward in "{filters['city']}".

        **Your Task:**
        Return a single, raw JSON object with the following three keys:
        1. "candidate_brief": A concise, one-paragraph summary of the situation for the main candidate.
        2. "talking_points": A JSON list of 3-4 specific, actionable talking points for a local leader to use in a press meet or public address.
        3. "social_media_posts": A JSON list of 3 distinct, ready-to-post social media messages. Each message should have a different tone (e.g., one empathetic, one data-driven, one forward-looking).
        """

        summary_json = generate_ai_response(prompt)
        print(f"--- Generated Comms Workbench for {endpoint_name} ---")
        return jsonify(summary_json)

    except Exception as e:
        print(f"\n❌ ERROR IN {endpoint_name} ❌\n{traceback.format_exc()}\n")
        return jsonify({"error": "Failed to generate AI strategic communications."}), 500

def generate_ai_response(prompt):
    # This helper function remains the same
    model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config={"response_mime_type": "application/json"})
    response = model.generate_content(prompt)
    return json.loads(response.text)
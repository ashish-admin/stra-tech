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
from .services import analyze_emotions_and_drivers # We will use this in a later step
import google.generativeai as genai

bp = Blueprint('api', __name__, url_prefix='/api/v1')

# --- Helper function for GeoJSON loading ---
wards_gdf = None
def load_wards_geojson():
    global wards_gdf
    if wards_gdf is None:
        geojson_path = os.path.join(current_app.root_path, 'data', 'ghmc_wards.geojson')
        if not os.path.exists(geojson_path):
             raise FileNotFoundError(f"GeoJSON file not found at path: {geojson_path}")
        wards_gdf = gpd.read_file(geojson_path)
    return wards_gdf

# --- Authentication and other routes (No changes) ---
# ... (login, logout, status, analytics routes remain the same)

# --- UPGRADED Granular Analytics Route ---
@bp.route('/analytics/granular', methods=['GET'])
@login_required
def granular_analytics():
    try:
        wards = load_wards_geojson()
        posts = Post.query.filter(Post.latitude.isnot(None), Post.longitude.isnot(None)).all()
        if not posts: return jsonify({"type": "FeatureCollection", "features": []})

        ward_data = {row['name']: {'posts': [], 'geometry': row.geometry} for _, row in wards.iterrows()}

        for post in posts:
            point = Point(post.longitude, post.latitude)
            for ward_name, data in ward_data.items():
                if point.within(data['geometry']):
                    data['posts'].append(post)
                    break
        
        results = []
        for ward_name, data in ward_data.items():
            if not data['posts']:
                continue

            # Calculate dominant emotion
            emotions = [p.emotion for p in data['posts'] if p.emotion]
            emotion_counts = Counter(emotions)
            dominant_emotion = emotion_counts.most_common(1)[0][0] if emotions else 'N/A'
            
            # --- NEW: Calculate top emotion drivers ---
            all_drivers = []
            for p in data['posts']:
                if p.drivers and isinstance(p.drivers, list):
                    all_drivers.extend(p.drivers)
            
            driver_counts = Counter(all_drivers)
            top_drivers = [driver[0] for driver in driver_counts.most_common(3)]
            
            results.append({
                "type": "Feature",
                "geometry": data['geometry'].__geo_interface__,
                "properties": {
                    "ward_name": ward_name,
                    "dominant_emotion": dominant_emotion,
                    "post_count": len(data['posts']),
                    "top_drivers": top_drivers  # <-- Add drivers to the response
                }
            })
            
        return jsonify({
            "type": "FeatureCollection",
            "features": results
        })

    except Exception as e:
        print(f"Error in granular analytics: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An error occurred during geo-analysis"}), 500

# ... (strategic_summary and generate_ai_response functions remain the same)
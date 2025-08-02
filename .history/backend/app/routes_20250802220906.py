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

# ... (load_wards_geojson, login, logout, status routes are simple and unchanged) ...

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
        
# ... (strategic_summary route with similar try/except logging) ...
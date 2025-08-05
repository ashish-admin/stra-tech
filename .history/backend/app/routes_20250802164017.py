from flask import Blueprint, jsonify, request, current_app
from .models import Post, User
from . import db
from flask_login import login_user, logout_user, current_user
import os
import geopandas as gpd
from shapely.geometry import Point
import pandas as pd
import json
from .services import analyze_emotions 

bp = Blueprint('main', __name__)

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
@bp.route('/api/v1/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user is None or not user.check_password(data.get('password')):
        return jsonify({'message': 'Invalid username or password'}), 401
    login_user(user)
    return jsonify({'message': 'Logged in successfully'}), 200

@bp.route('/api/v1/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@bp.route('/api/v1/status', methods=['GET'])
def status():
    if current_user.is_authenticated:
        return jsonify({'logged_in': True})
    else:
        return jsonify({'logged_in': False})

# --- Existing Protected API Endpoints (no changes) ---
@bp.route('/api/v1/analytics', methods=['GET'])
def analytics():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
    posts = Post.query.all()
    return jsonify([post.to_dict() for post in posts])

@bp.route('/api/v1/analytics/granular', methods=['GET'])
def granular_analytics():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
    try:
        # ... (rest of the granular logic is unchanged)
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
        print(f"Error in granular analytics: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An error occurred during geo-analysis"}), 500

# --- UPGRADED DYNAMIC STRATEGIC SUMMARY ENDPOINT ---
@bp.route('/api/v1/strategic-summary', methods=['GET'])
def strategic_summary():
    if not current_user.is_authenticated:
        return jsonify({'message': 'Authentication required'}), 401
    
    try:
        # 1. Get filters from the request query parameters
        emotion_filter = request.args.get('emotion', 'All')
        city_filter = request.args.get('city', 'All')
        search_filter = request.args.get('searchTerm', '')

        # 2. Build a dynamic query
        query = Post.query
        if emotion_filter != 'All':
            query = query.filter(Post.emotion == emotion_filter)
        if city_filter != 'All':
            query = query.filter(Post.city == city_filter)
        if search_filter:
            query = query.filter(Post.text.like(f"%{search_filter}%"))
        
        filtered_posts = query.all()

        if not filtered_posts or len(filtered_posts) < 2:
            return jsonify({"analysis": "Not enough data for the current filter selection.", "opportunity": "", "threat": "", "prescriptive_action": ""})

        # 3. Analyze the filtered data
        df = pd.DataFrame([p.to_dict() for p in filtered_posts])
        emotion_counts = df['emotion'].value_counts()
        top_emotion = emotion_counts.idxmax()
        top_topic = df['text'].mode()[0]
        location_context = f" in {city_filter}" if city_filter != 'All' else ""

        # 4. SIMULATE live news search
        news_context = "Recent local news reports indicate growing public concern over road quality and infrastructure projects, especially in high-traffic areas. This is becoming a key issue for the upcoming municipal elections."

        # 5. Construct the new, more sophisticated AI prompt
        prompt = f"""
        You are an expert political strategist for a campaign in Hyderabad, India. Your task is to provide a clear, actionable intelligence briefing.

        **Intelligence:**
        - Dominant emotion detected: "{top_emotion}"
        - Associated topic: "{top_topic}"{location_context}
        - Live News Context: "{news_context}"

        **Your Task:**
        Generate a strategic response in JSON format. The JSON object must contain these keys:
        1. "opportunity": A specific strategy to amplify or address the sentiment.
        2. "threat": A potential risk or opponent's counter-move to be aware of.
        3. "prescriptive_action": A concrete, single next step the campaign should take (e.g., "Launch a targeted social media campaign in Gachibowli focusing on our infrastructure plan.").

        Provide only the raw JSON object as your response.
        """

        summary_json = generate_ai_response(prompt)
        return jsonify(summary_json)

    except Exception as e:
        print(f"Error in strategic summary: {e}")
        return jsonify({"error": "Failed to generate dynamic strategic summary."}), 500

def generate_ai_response(prompt):
    import google.generativeai as genai
    model = genai.GenerativeModel(
        'gemini-1.5-flash-latest',
        generation_config={"response_mime_type": "application/json"}
    )
    response = model.generate_content(prompt)
    return json.loads(response.text)
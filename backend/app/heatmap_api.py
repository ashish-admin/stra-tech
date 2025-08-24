# backend/app/heatmap_api.py
"""
Heat Map API - Specialized endpoints for heat map widget data processing
Provides aggregated data for various political intelligence heat map visualizations
"""

from datetime import datetime, timedelta, timezone
from collections import defaultdict
import json
import re
from typing import Dict, List, Optional, Union

from flask import Blueprint, jsonify, request
from flask_login import login_required
from sqlalchemy import func, and_, or_, desc, text
from sqlalchemy.orm import sessionmaker

from . import db
from .models import Post, Author, Alert
from .utils.ward import normalize_ward

heatmap_bp = Blueprint("heatmap_bp", __name__, url_prefix="/api/v1/heatmap")

# Political party configuration
PARTY_MAPPING = {
    "BJP Telangana": "BJP",
    "BRS Party": "BRS", 
    "Telangana Rashtra Samithi": "BRS",
    "TRS": "BRS",
    "Indian National Congress": "INC",
    "Telangana Congress": "INC",
    "Congress": "INC",
    "AIMIM": "AIMIM",
    "All India Majlis-e-Ittehad-ul-Muslimeen": "AIMIM",
    "Aam Aadmi Party": "AAP",
    "AAP": "AAP"
}

# Emotion categories for sentiment analysis
EMOTION_CATEGORIES = [
    'hopeful', 'angry', 'concerned', 'satisfied', 
    'disappointed', 'optimistic', 'frustrated'
]

# Robust date parsing function
def parse_date_safely(date_str):
    """Parse date string into datetime object safely"""
    if not date_str:
        return None
    
    if isinstance(date_str, datetime):
        return date_str
    
    try:
        # Handle various date formats
        if 'T' in str(date_str):
            return datetime.fromisoformat(str(date_str).replace('Z', '+00:00'))
        else:
            return datetime.strptime(str(date_str), '%Y-%m-%d')
    except Exception as e:
        print(f"Date parsing error: {e} for date: {date_str}")
        return None

def normalize_party_name(party_name):
    """Normalize party names to standard format"""
    if not party_name:
        return "Others"
    
    party_clean = str(party_name).strip()
    return PARTY_MAPPING.get(party_clean, "Others")

def extract_emotions_from_text(text):
    """Extract emotion counts from post text using keyword matching"""
    if not text:
        return {}
    
    text_lower = text.lower()
    emotions = {}
    
    # Simple keyword-based emotion extraction
    emotion_keywords = {
        'hopeful': ['hope', 'hopeful', 'optimistic', 'positive', 'bright', 'promising'],
        'angry': ['angry', 'furious', 'outraged', 'mad', 'enraged', 'livid'],
        'concerned': ['concerned', 'worried', 'anxious', 'troubled', 'uneasy'],
        'satisfied': ['satisfied', 'pleased', 'content', 'happy', 'glad'],
        'disappointed': ['disappointed', 'let down', 'frustrated', 'upset'],
        'optimistic': ['optimistic', 'confident', 'upbeat', 'encouraged'],
        'frustrated': ['frustrated', 'annoyed', 'irritated', 'exasperated']
    }
    
    for emotion, keywords in emotion_keywords.items():
        count = sum(1 for keyword in keywords if keyword in text_lower)
        if count > 0:
            emotions[emotion] = count
    
    return emotions

def get_date_range(days):
    """Get date range for the specified number of days"""
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    return start_date, end_date

@heatmap_bp.route('/sentiment', methods=['GET'])
@login_required
def sentiment_heatmap():
    """
    Sentiment Heat Map Data Endpoint
    Returns daily sentiment aggregation data for calendar heat map visualization
    """
    try:
        # Parse request parameters
        ward = request.args.get('ward', 'All')
        days = int(request.args.get('days', 90))
        emotions = request.args.get('emotions', '').split(',') if request.args.get('emotions') else EMOTION_CATEGORIES
        aggregation = request.args.get('aggregation', 'sum')  # sum, average, max, count
        
        # Normalize ward
        if ward != 'All':
            ward = normalize_ward(ward)
        
        # Get date range
        start_date, end_date = get_date_range(days)
        
        # Base query
        query = db.session.query(Post).filter(
            Post.created_at >= start_date,
            Post.created_at <= end_date
        )
        
        # Apply ward filter
        if ward != 'All':
            query = query.filter(Post.city == ward)
        
        # Execute query
        posts = query.all()
        
        # Process data by date
        daily_data = defaultdict(lambda: {
            'emotions': defaultdict(int),
            'total_posts': 0,
            'total_mentions': 0
        })
        
        for post in posts:
            if not post.created_at:
                continue
                
            date_key = post.created_at.strftime('%Y-%m-%d')
            
            # Extract emotions from post text
            post_emotions = extract_emotions_from_text(post.text)
            
            # Aggregate emotions
            for emotion, count in post_emotions.items():
                if emotion in emotions:
                    daily_data[date_key]['emotions'][emotion] += count
                    daily_data[date_key]['total_mentions'] += count
            
            daily_data[date_key]['total_posts'] += 1
        
        # Format data for calendar heatmap
        result_data = []
        for date_str, data in daily_data.items():
            emotion_totals = data['emotions']
            
            # Calculate aggregate value based on aggregation method
            if aggregation == 'sum':
                count = sum(emotion_totals.values())
            elif aggregation == 'average':
                count = sum(emotion_totals.values()) / max(len(emotion_totals), 1)
            elif aggregation == 'max':
                count = max(emotion_totals.values()) if emotion_totals else 0
            elif aggregation == 'count':
                count = data['total_posts']
            else:
                count = sum(emotion_totals.values())
            
            result_data.append({
                'date': date_str,
                aggregation: count,
                'total': sum(emotion_totals.values()),
                'emotions': dict(emotion_totals),
                'posts': data['total_posts'],
                'details': {
                    'dominant_emotion': max(emotion_totals.items(), key=lambda x: x[1])[0] if emotion_totals else None
                }
            })
        
        # Fill in missing dates with zero values
        current_date = start_date.date()
        end_date_only = end_date.date()
        filled_data = []
        
        while current_date <= end_date_only:
            date_str = current_date.strftime('%Y-%m-%d')
            existing_data = next((d for d in result_data if d['date'] == date_str), None)
            
            if existing_data:
                filled_data.append(existing_data)
            else:
                filled_data.append({
                    'date': date_str,
                    aggregation: 0,
                    'total': 0,
                    'emotions': {},
                    'posts': 0,
                    'details': {}
                })
            
            current_date += timedelta(days=1)
        
        return jsonify({
            'success': True,
            'data': filled_data,
            'metadata': {
                'ward': ward,
                'time_range': days,
                'aggregation': aggregation,
                'emotions': emotions,
                'total_records': len(filled_data),
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
        })
        
    except Exception as e:
        print(f"Sentiment heatmap error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch sentiment heatmap data'
        }), 500

@heatmap_bp.route('/party-activity', methods=['GET'])
@login_required
def party_activity_heatmap():
    """
    Party Activity Heat Map Data Endpoint
    Returns daily political party activity aggregation data
    """
    try:
        # Parse request parameters
        ward = request.args.get('ward', 'All')
        days = int(request.args.get('days', 90))
        parties = request.args.get('parties', '').split(',') if request.args.get('parties') else list(PARTY_MAPPING.values())
        metric = request.args.get('metric', 'mentions')  # mentions, sentiment_score, engagement, share_of_voice, activity_score
        view_mode = request.args.get('view_mode', 'aggregate')  # single, comparative, aggregate
        focus_party = request.args.get('focus_party', 'BJP')
        
        # Normalize ward
        if ward != 'All':
            ward = normalize_ward(ward)
        
        # Get date range
        start_date, end_date = get_date_range(days)
        
        # Base query with author information for party extraction
        query = db.session.query(Post, Author).outerjoin(Author, Post.author_id == Author.id).filter(
            Post.created_at >= start_date,
            Post.created_at <= end_date
        )
        
        # Apply ward filter
        if ward != 'All':
            query = query.filter(Post.city == ward)
        
        # Execute query
        results = query.all()
        
        # Process data by date and party
        daily_data = defaultdict(lambda: defaultdict(lambda: {
            'mentions': 0,
            'posts': 0,
            'sentiment_score': 0,
            'engagement': 0
        }))
        
        for post, author in results:
            if not post.created_at:
                continue
                
            date_key = post.created_at.strftime('%Y-%m-%d')
            
            # Determine party from author or post content
            party = "Others"
            if author and author.party:
                party = normalize_party_name(author.party)
            else:
                # Try to extract party from post text
                post_text = (post.text or "").lower()
                for party_name, normalized in PARTY_MAPPING.items():
                    if party_name.lower() in post_text:
                        party = normalized
                        break
            
            # Only process requested parties
            if party in parties or parties == []:
                daily_data[date_key][party]['mentions'] += 1
                daily_data[date_key][party]['posts'] += 1
                
                # Extract sentiment score (simplified)
                sentiment_keywords = {
                    'positive': ['good', 'great', 'excellent', 'success', 'achievement'],
                    'negative': ['bad', 'terrible', 'failure', 'corruption', 'scandal']
                }
                
                sentiment_score = 0
                post_text_lower = (post.text or "").lower()
                for word in sentiment_keywords['positive']:
                    sentiment_score += post_text_lower.count(word) * 1
                for word in sentiment_keywords['negative']:
                    sentiment_score += post_text_lower.count(word) * -1
                
                daily_data[date_key][party]['sentiment_score'] += sentiment_score
                
                # Simple engagement metric (based on text length and mentions)
                engagement = len(post.text or "") / 100  # Simplified engagement metric
                daily_data[date_key][party]['engagement'] += engagement
        
        # Calculate daily totals and format data
        result_data = []
        for date_str, party_data in daily_data.items():
            # Calculate totals for share of voice
            total_mentions = sum(data['mentions'] for data in party_data.values())
            
            party_metrics = {}
            for party, data in party_data.items():
                share_of_voice = (data['mentions'] / max(total_mentions, 1)) * 100
                avg_sentiment = data['sentiment_score'] / max(data['mentions'], 1)
                activity_score = (data['mentions'] * 0.4 + 
                                data['engagement'] * 0.3 + 
                                abs(avg_sentiment) * 0.3)
                
                party_metrics[party] = {
                    'mentions': data['mentions'],
                    'sentiment_score': round(avg_sentiment, 2),
                    'engagement': round(data['engagement'], 2),
                    'share_of_voice': round(share_of_voice, 1),
                    'activity_score': round(activity_score, 2)
                }
            
            # Determine count based on view mode and metric
            if view_mode == 'single':
                count = party_metrics.get(focus_party, {}).get(metric, 0)
            elif view_mode == 'comparative':
                # Use the party with highest activity for the day
                if party_metrics:
                    dominant_party = max(party_metrics.keys(), 
                                       key=lambda p: party_metrics[p].get(metric, 0))
                    count = party_metrics[dominant_party].get(metric, 0)
                else:
                    dominant_party = None
                    count = 0
            else:  # aggregate
                count = sum(data.get(metric, 0) for data in party_metrics.values())
                dominant_party = None
            
            result_entry = {
                'date': date_str,
                'count': count,
                'parties': {p: data.get(metric, 0) for p, data in party_metrics.items()},
                'details': {
                    'total_mentions': total_mentions,
                    'party_breakdown': party_metrics
                }
            }
            
            if view_mode == 'comparative':
                result_entry['dominantParty'] = dominant_party
            
            result_data.append(result_entry)
        
        # Fill in missing dates
        current_date = start_date.date()
        end_date_only = end_date.date()
        filled_data = []
        
        while current_date <= end_date_only:
            date_str = current_date.strftime('%Y-%m-%d')
            existing_data = next((d for d in result_data if d['date'] == date_str), None)
            
            if existing_data:
                filled_data.append(existing_data)
            else:
                filled_data.append({
                    'date': date_str,
                    'count': 0,
                    'parties': {party: 0 for party in parties},
                    'details': {'total_mentions': 0, 'party_breakdown': {}}
                })
            
            current_date += timedelta(days=1)
        
        return jsonify({
            'success': True,
            'data': filled_data,
            'metadata': {
                'ward': ward,
                'time_range': days,
                'parties': parties,
                'metric': metric,
                'view_mode': view_mode,
                'focus_party': focus_party if view_mode == 'single' else None,
                'total_records': len(filled_data),
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
        })
        
    except Exception as e:
        print(f"Party activity heatmap error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch party activity heatmap data'
        }), 500

@heatmap_bp.route('/issues', methods=['GET'])
@login_required  
def issue_intensity_heatmap():
    """
    Issue Intensity Heat Map Data Endpoint
    Returns daily issue/topic discussion intensity data
    """
    try:
        # Parse request parameters
        ward = request.args.get('ward', 'All')
        days = int(request.args.get('days', 90))
        keywords = request.args.get('keywords', '').split(',') if request.args.get('keywords') else []
        aggregation = request.args.get('aggregation', 'mentions')
        
        # Default political keywords if none specified
        if not keywords:
            keywords = [
                'development', 'infrastructure', 'education', 'healthcare', 
                'corruption', 'unemployment', 'housing', 'transportation',
                'water', 'electricity', 'roads', 'sanitation'
            ]
        
        # Normalize ward
        if ward != 'All':
            ward = normalize_ward(ward)
        
        # Get date range
        start_date, end_date = get_date_range(days)
        
        # Base query
        query = db.session.query(Post).filter(
            Post.created_at >= start_date,
            Post.created_at <= end_date
        )
        
        # Apply ward filter
        if ward != 'All':
            query = query.filter(Post.city == ward)
        
        # Execute query
        posts = query.all()
        
        # Process data by date and keywords
        daily_data = defaultdict(lambda: {
            'keywords': defaultdict(int),
            'total_mentions': 0,
            'posts': 0
        })
        
        for post in posts:
            if not post.created_at or not post.text:
                continue
                
            date_key = post.created_at.strftime('%Y-%m-%d')
            post_text_lower = post.text.lower()
            
            keyword_mentions = 0
            for keyword in keywords:
                count = post_text_lower.count(keyword.lower())
                if count > 0:
                    daily_data[date_key]['keywords'][keyword] += count
                    keyword_mentions += count
            
            if keyword_mentions > 0:
                daily_data[date_key]['total_mentions'] += keyword_mentions
                daily_data[date_key]['posts'] += 1
        
        # Format data
        result_data = []
        for date_str, data in daily_data.items():
            if aggregation == 'mentions':
                count = data['total_mentions']
            elif aggregation == 'posts':
                count = data['posts']
            elif aggregation == 'diversity':
                count = len([k for k, v in data['keywords'].items() if v > 0])
            else:
                count = data['total_mentions']
            
            result_data.append({
                'date': date_str,
                'count': count,
                'keywords': dict(data['keywords']),
                'details': {
                    'total_mentions': data['total_mentions'],
                    'posts': data['posts'],
                    'top_issue': max(data['keywords'].items(), key=lambda x: x[1])[0] if data['keywords'] else None
                }
            })
        
        # Fill missing dates
        current_date = start_date.date()
        end_date_only = end_date.date()
        filled_data = []
        
        while current_date <= end_date_only:
            date_str = current_date.strftime('%Y-%m-%d')
            existing_data = next((d for d in result_data if d['date'] == date_str), None)
            
            if existing_data:
                filled_data.append(existing_data)
            else:
                filled_data.append({
                    'date': date_str,
                    'count': 0,
                    'keywords': {},
                    'details': {'total_mentions': 0, 'posts': 0}
                })
            
            current_date += timedelta(days=1)
        
        return jsonify({
            'success': True,
            'data': filled_data,
            'metadata': {
                'ward': ward,
                'time_range': days,
                'keywords': keywords,
                'aggregation': aggregation,
                'total_records': len(filled_data),
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
        })
        
    except Exception as e:
        print(f"Issue intensity heatmap error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch issue intensity heatmap data'
        }), 500

@heatmap_bp.route('/geographic', methods=['GET'])
@login_required
def geographic_heatmap():
    """
    Geographic Heat Map Data Endpoint
    Returns ward-based political activity aggregation for geographic visualization
    """
    try:
        # Parse request parameters
        days = int(request.args.get('days', 30))
        metric = request.args.get('metric', 'activity')  # activity, sentiment, party_dominance
        parties = request.args.get('parties', '').split(',') if request.args.get('parties') else []
        
        # Get date range
        start_date, end_date = get_date_range(days)
        
        # Base query grouped by ward
        query = db.session.query(
            Post.city,
            func.count(Post.id).label('post_count'),
            func.count(func.distinct(Post.author_id)).label('author_count')
        ).filter(
            Post.created_at >= start_date,
            Post.created_at <= end_date,
            Post.city.isnot(None)
        ).group_by(Post.city)
        
        results = query.all()
        
        # Process geographic data
        geographic_data = []
        for ward, post_count, author_count in results:
            if not ward:
                continue
                
            normalized_ward = normalize_ward(ward)
            
            # Calculate activity score
            activity_score = post_count + (author_count * 2)  # Weight unique authors more
            
            # Get party breakdown for this ward
            party_query = db.session.query(
                Author.party,
                func.count(Post.id).label('mentions')
            ).join(Post, Post.author_id == Author.id).filter(
                Post.city == ward,
                Post.created_at >= start_date,
                Post.created_at <= end_date,
                Author.party.isnot(None)
            ).group_by(Author.party)
            
            party_results = party_query.all()
            party_breakdown = {}
            total_party_mentions = 0
            
            for party, mentions in party_results:
                normalized_party = normalize_party_name(party)
                party_breakdown[normalized_party] = party_breakdown.get(normalized_party, 0) + mentions
                total_party_mentions += mentions
            
            # Determine dominant party
            dominant_party = None
            if party_breakdown:
                dominant_party = max(party_breakdown.keys(), key=lambda p: party_breakdown[p])
            
            # Calculate metric value
            if metric == 'activity':
                value = activity_score
            elif metric == 'sentiment':
                # Simplified sentiment calculation
                value = post_count * 0.5  # Placeholder
            elif metric == 'party_dominance':
                value = max(party_breakdown.values()) if party_breakdown else 0
            else:
                value = activity_score
            
            geographic_data.append({
                'ward': normalized_ward,
                'value': value,
                'posts': post_count,
                'authors': author_count,
                'parties': party_breakdown,
                'dominant_party': dominant_party,
                'details': {
                    'activity_score': activity_score,
                    'party_mentions': total_party_mentions
                }
            })
        
        # Sort by value descending
        geographic_data.sort(key=lambda x: x['value'], reverse=True)
        
        return jsonify({
            'success': True,
            'data': geographic_data,
            'metadata': {
                'time_range': days,
                'metric': metric,
                'total_wards': len(geographic_data),
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
        })
        
    except Exception as e:
        print(f"Geographic heatmap error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch geographic heatmap data'
        }), 500

@heatmap_bp.route('/calendar', methods=['GET'])
@login_required
def calendar_heatmap():
    """
    Political Calendar Heat Map Data Endpoint
    GitHub-style calendar showing daily political activity
    """
    try:
        # Parse request parameters
        ward = request.args.get('ward', 'All')
        days = int(request.args.get('days', 365))  # Default to 1 year for calendar view
        metric = request.args.get('metric', 'posts')  # posts, mentions, alerts, activity
        
        # Normalize ward
        if ward != 'All':
            ward = normalize_ward(ward)
        
        # Get date range
        start_date, end_date = get_date_range(days)
        
        # Base query
        query = db.session.query(
            func.date(Post.created_at).label('date'),
            func.count(Post.id).label('post_count')
        ).filter(
            Post.created_at >= start_date,
            Post.created_at <= end_date
        )
        
        # Apply ward filter
        if ward != 'All':
            query = query.filter(Post.city == ward)
        
        query = query.group_by(func.date(Post.created_at))
        results = query.all()
        
        # Process calendar data
        calendar_data = []
        for date_obj, post_count in results:
            if metric == 'posts':
                value = post_count
            else:
                value = post_count  # Simplified for now
            
            calendar_data.append({
                'date': date_obj.strftime('%Y-%m-%d'),
                'count': value,
                'details': {
                    'posts': post_count
                }
            })
        
        # Fill in missing dates with zero values
        current_date = start_date.date()
        end_date_only = end_date.date()
        date_map = {item['date']: item for item in calendar_data}
        filled_data = []
        
        while current_date <= end_date_only:
            date_str = current_date.strftime('%Y-%m-%d')
            if date_str in date_map:
                filled_data.append(date_map[date_str])
            else:
                filled_data.append({
                    'date': date_str,
                    'count': 0,
                    'details': {'posts': 0}
                })
            
            current_date += timedelta(days=1)
        
        return jsonify({
            'success': True,
            'data': filled_data,
            'metadata': {
                'ward': ward,
                'time_range': days,
                'metric': metric,
                'total_records': len(filled_data),
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
        })
        
    except Exception as e:
        print(f"Calendar heatmap error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch calendar heatmap data'
        }), 500
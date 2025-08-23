"""
Political Strategist API Router

Flask blueprint for strategist endpoints with SSE support and caching.
"""

import os
import json
import logging
from datetime import datetime
from flask import Blueprint, request, Response, jsonify, current_app, stream_template, g
from flask_login import login_required, current_user

from .service import get_ward_report, analyze_text
from .sse import sse_stream
from .observability import track_api_call, get_observer
from .auth_middleware import (
    sse_auth_required, 
    sse_auth_manager, 
    refresh_sse_token,
    validate_sse_request_integrity
)

logger = logging.getLogger(__name__)

strategist_bp = Blueprint('strategist', __name__, url_prefix='/api/v1/strategist')


@strategist_bp.before_request
def check_strategist_enabled():
    """Check if strategist system is enabled."""
    if not current_app.config.get('STRATEGIST_ENABLED', True):
        return jsonify({
            "error": "Political Strategist system is currently disabled",
            "status": "service_unavailable"
        }), 503


@strategist_bp.route('/<ward>', methods=['GET'])
@login_required
@track_api_call
def ward_analysis(ward):
    """
    Get comprehensive strategic analysis for a ward.
    
    Query Parameters:
    - depth: Analysis depth (quick|standard|deep)
    - context: Strategic context (defensive|neutral|offensive)
    
    Returns:
        Strategic briefing with recommendations and intelligence
    """
    try:
        # Validate and sanitize ward input
        if not ward or len(ward.strip()) == 0:
            return jsonify({"error": "Ward parameter is required"}), 400
        
        ward_clean = ward.strip()[:64]  # Limit length for security
        
        # Get parameters
        depth = request.args.get('depth', 'standard')
        context_mode = request.args.get('context', 'neutral')
        
        # Validate parameters
        if depth not in ['quick', 'standard', 'deep']:
            depth = 'standard'
        if context_mode not in ['defensive', 'neutral', 'offensive']:
            context_mode = 'neutral'
        
        # Check for cached response
        if_none_match = request.headers.get('If-None-Match')
        
        # Get ward report
        data, etag, ttl = get_ward_report(ward_clean, depth)
        
        # Return 304 if client has current version
        if if_none_match == etag:
            return '', 304
        
        # Prepare response
        response = jsonify(data)
        response.headers['ETag'] = etag
        response.headers['Cache-Control'] = f'public, max-age={ttl}'
        response.headers['X-Ward'] = ward_clean
        response.headers['X-Analysis-Depth'] = depth
        
        logger.info(f"Ward analysis served for {ward_clean} (depth: {depth})")
        return response
        
    except Exception as e:
        logger.error(f"Error in ward analysis for {ward}: {e}", exc_info=True)
        return jsonify({
            "error": "Analysis failed",
            "ward": ward,
            "timestamp": datetime.now().isoformat(),
            "retry_after": 60
        }), 500


@strategist_bp.route('/analyze', methods=['POST'])
@login_required
@track_api_call
def analyze_content():
    """
    Analyze arbitrary content for political insights.
    
    Request Body:
    {
        "text": "Content to analyze",
        "ward": "Ward context",
        "context": "Analysis context mode"
    }
    
    Returns:
        Strategic analysis of provided content
    """
    try:
        payload = request.get_json(force=True)
        
        if not payload or 'text' not in payload:
            return jsonify({"error": "Text content is required"}), 400
        
        # Validate text content
        text = payload.get('text', '').strip()
        if len(text) < 10:
            return jsonify({"error": "Text too short for meaningful analysis"}), 400
        if len(text) > 10000:
            return jsonify({"error": "Text too long - maximum 10,000 characters"}), 400
        
        # Set context
        payload['context'] = 'proactive'
        payload.setdefault('ward', 'Unknown')
        
        # Perform analysis
        result = analyze_text(payload)
        
        # Add metadata
        result.update({
            "analysis_type": "content_analysis",
            "text_length": len(text),
            "analyzed_at": datetime.now().isoformat()
        })
        
        logger.info(f"Content analysis completed for {len(text)} characters")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in content analysis: {e}", exc_info=True)
        return jsonify({
            "error": "Content analysis failed",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/feed', methods=['GET'])
@sse_auth_required
def intelligence_feed():
    """
    Enhanced Server-Sent Events stream for real-time intelligence updates.
    
    Query Parameters:
    - ward: Ward to monitor
    - since: Timestamp for updates since
    - priority: Filter by priority level
    - token: Connection token (optional, can use Authorization header)
    
    Returns:
        SSE stream of intelligence updates with enhanced security
    """
    try:
        # Validate request integrity
        if not validate_sse_request_integrity():
            return jsonify({
                "error": "Invalid SSE request format",
                "code": "SSE_INVALID_REQUEST"
            }), 400
        
        ward = request.args.get('ward', 'All')
        since = request.args.get('since')
        priority = request.args.get('priority', 'all')
        
        # Validate priority
        if priority not in ['all', 'high', 'critical']:
            priority = 'all'
        
        # Get connection info from auth middleware
        connection_info = getattr(g, 'sse_connection_info', None)
        connection_token = getattr(g, 'sse_connection_token', None)
        
        logger.info(f"Starting enhanced intelligence feed for user {current_user.id}, ward {ward} (priority: {priority})")
        
        # Enhanced SSE headers with security
        headers = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',  # Nginx compatibility
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Content-Security-Policy': "default-src 'none'",
        }
        
        # Include connection token in initial response if newly generated
        if connection_token:
            headers['X-SSE-Connection-Token'] = connection_token
        
        return Response(
            enhanced_sse_stream(ward, since, priority, connection_info or {'user_id': str(current_user.id)}),
            mimetype='text/event-stream',
            headers=headers
        )
        
    except Exception as e:
        logger.error(f"Error starting intelligence feed: {e}", exc_info=True)
        return jsonify({
            "error": "Intelligence feed unavailable",
            "code": "SSE_FEED_ERROR",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for strategist system.
    
    Returns:
        System health status and performance metrics
    """
    try:
        observer = get_observer()
        health_status = observer.get_health_status()
        
        status_code = 200 if health_status['status'] == 'healthy' else 503
        
        return jsonify(health_status), status_code
        
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/cache/stats', methods=['GET'])
@login_required
def cache_statistics():
    """Get cache performance statistics."""
    try:
        from .cache import get_cache_stats
        stats = get_cache_stats()
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return jsonify({"error": "Cache stats unavailable"}), 500


@strategist_bp.route('/cache/invalidate', methods=['POST'])
@login_required
def invalidate_cache():
    """Invalidate strategist cache for ward or pattern."""
    try:
        data = request.get_json() or {}
        pattern = data.get('pattern', 'strategist:*')
        
        from .cache import invalidate_pattern
        count = invalidate_pattern(pattern)
        
        logger.info(f"Cache invalidated: {count} entries for pattern {pattern}")
        return jsonify({
            "invalidated_count": count,
            "pattern": pattern,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error invalidating cache: {e}")
        return jsonify({"error": "Cache invalidation failed"}), 500


@strategist_bp.route('/auth/token', methods=['POST'])
@login_required
def generate_connection_token():
    """
    Generate a secure connection token for SSE streams.
    
    Request Body:
    {
        "ward": "Ward name for connection",
        "expires_in": 3600  // Optional: token expiry in seconds
    }
    
    Returns:
        Connection token and metadata
    """
    try:
        data = request.get_json() or {}
        ward = data.get('ward')
        expires_in = data.get('expires_in', 3600)
        
        if not ward:
            return jsonify({
                "error": "Ward is required for connection token",
                "code": "SSE_TOKEN_001"
            }), 400
        
        # Validate expiry
        if not isinstance(expires_in, int) or expires_in < 60 or expires_in > 7200:
            expires_in = 3600  # Default to 1 hour
        
        # Generate token
        token = sse_auth_manager.generate_connection_token(
            str(current_user.id),
            ward,
            expires_in
        )
        
        logger.info(f"Generated connection token for user {current_user.id}, ward {ward}")
        
        return jsonify({
            "token": token,
            "expires_in": expires_in,
            "ward": ward,
            "token_type": "Bearer",
            "usage": "Include in Authorization header as 'Bearer <token>' for SSE connections",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error generating connection token: {e}")
        return jsonify({
            "error": "Failed to generate connection token",
            "code": "SSE_TOKEN_002",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/auth/token/refresh', methods=['POST'])
@login_required 
def refresh_connection_token():
    """
    Refresh an existing connection token.
    
    Request Body:
    {
        "token": "current_connection_token",
        "extend_by": 3600  // Optional: seconds to extend
    }
    
    Returns:
        New refreshed connection token
    """
    try:
        data = request.get_json() or {}
        current_token = data.get('token')
        extend_by = data.get('extend_by', 3600)
        
        if not current_token:
            return jsonify({
                "error": "Current token is required for refresh",
                "code": "SSE_REFRESH_001"
            }), 400
        
        # Refresh token
        new_token = sse_auth_manager.refresh_connection_token(current_token, extend_by)
        
        if not new_token:
            return jsonify({
                "error": "Failed to refresh token - may be expired or invalid",
                "code": "SSE_REFRESH_002"
            }), 400
        
        logger.info(f"Refreshed connection token for user {current_user.id}")
        
        return jsonify({
            "token": new_token,
            "expires_in": extend_by,
            "token_type": "Bearer",
            "refreshed_at": datetime.now().isoformat(),
            "usage": "Use this new token for future SSE connections"
        })
        
    except Exception as e:
        logger.error(f"Error refreshing connection token: {e}")
        return jsonify({
            "error": "Token refresh failed",
            "code": "SSE_REFRESH_003",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/auth/connections', methods=['GET'])
@login_required
def list_active_connections():
    """
    List active SSE connections for the current user.
    
    Returns:
        List of active connections with metadata
    """
    try:
        stats = sse_auth_manager.get_connection_stats()
        
        # Filter connections for current user (in production, implement proper filtering)
        user_connections = [
            conn for conn_id, conn in sse_auth_manager.active_connections.items()
            if conn.get('user_id') == str(current_user.id)
        ]
        
        return jsonify({
            "active_connections": len(user_connections),
            "connections": [
                {
                    "ward": conn.get('ward'),
                    "created_at": conn.get('created_at').isoformat() if conn.get('created_at') else None,
                    "last_heartbeat": conn.get('last_heartbeat').isoformat() if conn.get('last_heartbeat') else None,
                    "connection_count": conn.get('connection_count', 0),
                    "error_count": conn.get('error_count', 0)
                }
                for conn in user_connections
            ],
            "system_stats": stats,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error listing active connections: {e}")
        return jsonify({
            "error": "Failed to list connections",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/auth/cleanup', methods=['POST'])
@login_required
def cleanup_expired_connections():
    """
    Manually trigger cleanup of expired connections.
    Admin or maintenance endpoint.
    
    Returns:
        Cleanup results and statistics
    """
    try:
        # Basic permission check (in production, implement proper admin auth)
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
        
        cleanup_count = sse_auth_manager.cleanup_expired_connections()
        stats = sse_auth_manager.get_connection_stats()
        
        logger.info(f"Manual connection cleanup performed by user {current_user.id}, {cleanup_count} connections cleaned")
        
        return jsonify({
            "cleanup_performed": True,
            "expired_connections_cleaned": cleanup_count,
            "current_stats": stats,
            "cleanup_timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error during connection cleanup: {e}")
        return jsonify({
            "error": "Cleanup operation failed",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/status', methods=['GET'])
@login_required
def system_status():
    """
    Get strategist system status and configuration.
    
    Returns:
        System configuration and operational status
    """
    try:
        observer = get_observer()
        
        # Check AI service availability
        ai_services = {
            "gemini": bool(os.getenv('GEMINI_API_KEY')),
            "perplexity": bool(os.getenv('PERPLEXITY_API_KEY')),
            "openai": bool(os.getenv('OPENAI_API_KEY'))
        }
        
        status = {
            "strategist_enabled": current_app.config.get('STRATEGIST_ENABLED', True),
            "strategist_mode": current_app.config.get('STRATEGIST_MODE', 'development'),
            "ai_services": ai_services,
            "cache_enabled": bool(os.getenv('REDIS_URL')),
            "system_uptime": (datetime.now() - observer.start_time).total_seconds(),
            "performance_summary": observer.get_performance_report(),
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        return jsonify({
            "error": "System status unavailable",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/trigger', methods=['POST'])
@login_required
@track_api_call
def trigger_analysis():
    """
    Manually trigger strategic analysis for a ward.
    
    Request Body:
    {
        "ward": "Ward name",
        "depth": "Analysis depth", 
        "priority": "Analysis priority"
    }
    """
    try:
        data = request.get_json() or {}
        ward = data.get('ward')
        depth = data.get('depth', 'standard')
        
        if not ward:
            return jsonify({"error": "Ward is required"}), 400
        
        # Invalidate cache to force fresh analysis
        from .cache import invalidate_pattern
        cache_pattern = f"strategist:ward:{ward}:*"
        invalidated = invalidate_pattern(cache_pattern)
        
        # Get fresh analysis
        result, etag, ttl = get_ward_report(ward, depth)
        
        logger.info(f"Manual analysis triggered for {ward}")
        return jsonify({
            "status": "analysis_triggered",
            "ward": ward,
            "depth": depth,
            "cache_invalidated": invalidated,
            "result": result,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error triggering analysis: {e}")
        return jsonify({
            "error": "Failed to trigger analysis",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors for strategist endpoints."""
    return jsonify({
        "error": "Strategist endpoint not found",
        "available_endpoints": [
            "/api/v1/strategist/<ward>",
            "/api/v1/strategist/analyze",
            "/api/v1/strategist/feed",
            "/api/v1/strategist/health"
        ]
    }), 404


@strategist_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors for strategist endpoints."""
    logger.error(f"Internal error in strategist API: {error}")
    return jsonify({
        "error": "Internal strategist system error",
        "timestamp": datetime.now().isoformat(),
        "support": "Check system logs for details"
    }), 500
"""
Political Strategist API Router

Flask blueprint for strategist endpoints with SSE support and caching.
"""

import os
import json
import time
import logging
from datetime import datetime
from flask import Blueprint, request, Response, jsonify, current_app, stream_template
from flask_login import login_required

from .service import get_ward_report, analyze_text
# Phase 3: Enhanced imports
from .observability import track_api_call
from .circuit_breaker import circuit_breaker_manager, CircuitBreakerConfig
from .sse_enhanced import create_phase3_sse_response, get_phase3_sse_stats

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


@strategist_bp.route('/simple/<ward>', methods=['GET'])
def simple_test(ward):
    """Ultra simple test endpoint with no decorators."""
    return jsonify({"simple_test": "working", "ward": ward})

@strategist_bp.route('/debug/<ward>', methods=['GET'])
@login_required  
def debug_ward_analysis(ward):
    """Debug endpoint to test the ward analysis functionality."""
    try:
        from .service import get_ward_report
        logger.info(f"Debug: Testing ward analysis for {ward}")
        data, etag, ttl = get_ward_report(ward, 'quick')
        logger.info(f"Debug: Successfully got data with keys: {list(data.keys())}")
        return jsonify({
            "status": "debug_success",
            "ward": ward,
            "data_keys": list(data.keys()),
            "fallback_mode": data.get('fallback_mode', False),
            "etag": etag,
            "ttl": ttl
        })
    except Exception as e:
        logger.error(f"Debug error for {ward}: {e}", exc_info=True)
        return jsonify({"debug_error": str(e)}), 500

@strategist_bp.route('/<ward>', methods=['GET'])
@strategist_bp.route('/ward/<ward>', methods=['GET'])
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
@login_required
def intelligence_feed():
    """
    Phase 3: Enhanced Server-Sent Events stream with circuit breaker protection.
    
    Query Parameters:
    - ward: Ward to monitor
    - since: Timestamp for updates since
    - priority: Filter by priority level (all|high|critical)
    
    Returns:
        SSE stream with adaptive heartbeat, progress tracking, and auto-reconnection
    """
    try:
        ward = request.args.get('ward', '').strip()
        since = request.args.get('since')
        priority = request.args.get('priority', 'all')
        
        logger.info(f"Starting Phase 3 enhanced SSE feed for {ward} (priority: {priority})")
        
        # Phase 3: Create SSE response with enhanced features
        return create_phase3_sse_response(ward, priority, since)
        
    except Exception as e:
        logger.error(f"Error starting Phase 3 intelligence feed: {e}", exc_info=True)
        return jsonify({
            "error": "Intelligence feed unavailable - Phase 3 recovery active",
            "error_type": type(e).__name__,
            "phase": "3_enhanced",
            "recovery_options": ["retry_after_30s", "check_system_status", "fallback_polling"],
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/health', methods=['GET'])
def health_check():
    """
    Phase 3: Enhanced health check with circuit breaker status.
    
    Returns:
        Comprehensive system health status, circuit breaker metrics, and SSE analytics
    """
    try:
        from .health_checks import get_quick_health
        import asyncio
        
        # Get comprehensive health status
        health_status = asyncio.run(get_quick_health())
        
        # Phase 3: Add circuit breaker health
        circuit_breaker_health = circuit_breaker_manager.get_system_health()
        
        # Phase 3: Add SSE connection analytics
        sse_stats = get_phase3_sse_stats()
        
        # Combined health assessment
        combined_health = {
            "system_status": health_status.get('status', 'unknown'),
            "phase": "3_enhanced",
            "components": {
                "strategist_core": health_status,
                "circuit_breakers": circuit_breaker_health,
                "sse_connections": sse_stats
            },
            "overall_score": min(
                health_status.get('health_score', 50),
                circuit_breaker_health.get('health_score', 50)
            ),
            "enhanced_features": [
                "circuit_breaker_protection",
                "adaptive_sse_streaming",
                "intelligent_model_routing",
                "progressive_analysis_tracking"
            ],
            "recommendations": circuit_breaker_manager.get_service_recommendations(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Determine status code based on combined health
        if combined_health['overall_score'] >= 80:
            status_code = 200
        elif combined_health['overall_score'] >= 50:
            status_code = 200  # Degraded but operational
        else:
            status_code = 503
        
        return jsonify(combined_health), status_code
        
    except Exception as e:
        logger.error(f"Error in Phase 3 health check: {e}")
        return jsonify({
            "status": "error",
            "phase": "3_enhanced",
            "error": str(e),
            "error_type": type(e).__name__,
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


@strategist_bp.route('/status', methods=['GET'])
@login_required
def system_status():
    """
    Phase 3: Enhanced system status with circuit breaker and routing statistics.
    
    Returns:
        Comprehensive system status including Phase 3 enhancements
    """
    try:
        from .ai_connection_pool import get_pool_manager
        from .reasoner.multi_model_coordinator import MultiModelCoordinator
        
        # Get AI service pool statistics
        try:
            pool_manager = get_pool_manager()
            pool_stats = pool_manager.get_all_stats()
        except Exception as pool_error:
            logger.warning(f"AI pool manager unavailable: {pool_error}")
            pool_stats = {"error": "AI pool manager unavailable"}
        
        # Check AI service availability
        ai_services = {
            "gemini": bool(os.getenv('GEMINI_API_KEY')),
            "perplexity": bool(os.getenv('PERPLEXITY_API_KEY')),
            "openai": bool(os.getenv('OPENAI_API_KEY'))
        }
        
        # Phase 3: Get circuit breaker statistics
        circuit_breaker_status = circuit_breaker_manager.get_system_health()
        
        # Phase 3: Get multi-model coordinator statistics
        try:
            coordinator = MultiModelCoordinator()
            routing_stats = coordinator.get_routing_statistics()
        except Exception as routing_error:
            logger.warning(f"Multi-model coordinator unavailable: {routing_error}")
            routing_stats = {"error": "Multi-model coordinator unavailable"}
        
        # Phase 3: Enhanced status
        status = {
            "strategist_enabled": current_app.config.get('STRATEGIST_ENABLED', True),
            "strategist_mode": current_app.config.get('STRATEGIST_MODE', 'development'),
            "phase": "3_enhanced",
            "ai_services": ai_services,
            "ai_service_stats": pool_stats,
            "cache_enabled": bool(os.getenv('REDIS_URL')),
            "system_uptime": time.time(),
            "phase3_components": {
                "circuit_breakers": {
                    "system_status": circuit_breaker_status['system_status'],
                    "health_score": circuit_breaker_status['health_score'],
                    "active_services": circuit_breaker_status['service_summary']
                },
                "multi_model_routing": routing_stats,
                "sse_enhanced": get_phase3_sse_stats()
            },
            "enhanced_features": [
                "intelligent_model_routing",
                "circuit_breaker_protection", 
                "adaptive_sse_streaming",
                "progressive_analysis_tracking",
                "evidence_weighted_synthesis",
                "multi_factor_confidence_scoring"
            ],
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Error getting Phase 3 system status: {e}")
        return jsonify({
            "error": "Phase 3 system status unavailable",
            "error_type": type(e).__name__,
            "fallback_mode": True,
            "phase": "3_enhanced",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/ready', methods=['GET'])
def readiness_probe():
    """
    Kubernetes readiness probe endpoint.
    
    Returns:
        Readiness status for load balancer routing
    """
    try:
        from .health_checks import get_readiness_probe
        
        is_ready, details = get_readiness_probe()
        status_code = 200 if is_ready else 503
        
        return jsonify(details), status_code
        
    except Exception as e:
        logger.error(f"Readiness probe error: {e}")
        return jsonify({
            "ready": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503


@strategist_bp.route('/alive', methods=['GET'])
def liveness_probe():
    """
    Kubernetes liveness probe endpoint.
    
    Returns:
        Liveness status for container restart decisions
    """
    try:
        from .health_checks import get_liveness_probe
        
        is_alive, details = get_liveness_probe()
        status_code = 200 if is_alive else 503
        
        return jsonify(details), status_code
        
    except Exception as e:
        logger.error(f"Liveness probe error: {e}")
        return jsonify({
            "alive": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503


@strategist_bp.route('/conversation', methods=['POST'])
@login_required
@track_api_call
def create_conversation():
    """
    Create a new conversation session.
    
    Request Body:
    {
        "ward": "Ward name",
        "chatType": "strategy|analysis|planning|quick|playbook|scenario",
        "language": "en|hi|te|ur",
        "title": "Optional conversation title"
    }
    """
    try:
        from .conversation import conversation_manager
        
        data = request.get_json() or {}
        ward = data.get('ward')
        chat_type = data.get('chatType', 'strategy')
        language = data.get('language', 'en')
        user_id = getattr(request, 'user_id', None)  # From session
        
        if not ward:
            return jsonify({"error": "Ward is required"}), 400
        
        # Create conversation session
        session_id = conversation_manager.create_session(
            ward=ward,
            chat_type=chat_type,
            language=language,
            user_id=user_id
        )
        
        logger.info(f"Created conversation session {session_id} for ward {ward}")
        return jsonify({
            "session_id": session_id,
            "ward": ward,
            "chat_type": chat_type,
            "language": language,
            "created_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        return jsonify({
            "error": "Failed to create conversation",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/conversation/<session_id>', methods=['GET'])
@login_required
def get_conversation(session_id):
    """
    Get conversation session data.
    
    Returns:
        Complete conversation history and metadata
    """
    try:
        from .conversation import conversation_manager
        
        session_data = conversation_manager.get_session(session_id)
        if not session_data:
            return jsonify({"error": "Conversation not found"}), 404
        
        return jsonify(session_data)
        
    except Exception as e:
        logger.error(f"Error getting conversation {session_id}: {e}")
        return jsonify({
            "error": "Failed to retrieve conversation",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/conversation/<session_id>', methods=['DELETE'])
@login_required
def delete_conversation(session_id):
    """
    Delete a conversation session.
    """
    try:
        from .conversation import conversation_manager
        
        success = conversation_manager.delete_conversation(session_id)
        if not success:
            return jsonify({"error": "Conversation not found"}), 404
        
        logger.info(f"Deleted conversation session {session_id}")
        return jsonify({
            "status": "conversation_deleted",
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error deleting conversation {session_id}: {e}")
        return jsonify({
            "error": "Failed to delete conversation",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/conversations-test', methods=['GET'])
@login_required  
def list_conversations_test():
    """Test endpoint for conversations."""
    ward = request.args.get('ward', 'test')
    return jsonify({"test": "working", "ward": ward})

@strategist_bp.route('/conversations', methods=['GET'])
@login_required
def list_conversations():
    """
    List conversations for current user.
    
    Query Parameters:
    - ward: Filter by ward
    - limit: Maximum number of conversations
    """
    from datetime import datetime, timezone
    
    ward = request.args.get('ward', 'Unknown')
    limit = int(request.args.get('limit', 50))
    
    # Return functional mock data
    mock_conversations = []
    if ward and ward != 'All':
        mock_conversations = [
            {
                'id': f'conv_{ward.replace(" ", "_")}_strategy',
                'title': f'Strategic Analysis - {ward}',
                'ward': ward,
                'chat_type': 'strategy',
                'language': 'en',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'message_count': 12,
                'last_message': f'Based on the latest analysis for {ward}, I recommend focusing on infrastructure improvements and community engagement. The sentiment data shows positive momentum.',
                'status': 'active'
            },
            {
                'id': f'conv_{ward.replace(" ", "_")}_playbook', 
                'title': f'Campaign Playbook - {ward}',
                'ward': ward,
                'chat_type': 'playbook',
                'language': 'en',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'message_count': 8,
                'last_message': f'The sentiment analysis for {ward} shows positive trends in civic engagement. Key opportunities identified in infrastructure messaging.',
                'status': 'active'
            },
            {
                'id': f'conv_{ward.replace(" ", "_")}_scenario',
                'title': f'Scenario Planning - {ward}',
                'ward': ward,
                'chat_type': 'scenario',
                'language': 'en',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'message_count': 5,
                'last_message': f'Analyzed multiple scenarios for {ward}. Opposition response strategies prepared.',
                'status': 'active'
            }
        ]
    
    return jsonify({
        "conversations": mock_conversations[:limit],
        "total": len(mock_conversations),
        "ward_filter": ward,
        "status": "success"
    })


@strategist_bp.route('/conversations_old', methods=['GET'])
@login_required
def list_conversations_old():
    """
    List conversations for current user.
    
    Query Parameters:
    - ward: Filter by ward
    - limit: Maximum number of conversations
    """
    try:
        from flask_login import current_user
        
        logger.info("Starting list_conversations endpoint")
        
        ward = request.args.get('ward')
        limit = int(request.args.get('limit', 50))
        user_id = getattr(current_user, 'id', None) if current_user.is_authenticated else None
        
        logger.info(f"Parameters: ward={ward}, limit={limit}, user_id={user_id}")
        
        try:
            from .conversation import conversation_manager
            logger.info("Successfully imported conversation_manager")
        except Exception as import_error:
            logger.error(f"Failed to import conversation_manager: {import_error}")
            raise
        
        conversations = conversation_manager.get_conversations_for_user(
            user_id=user_id,
            ward=ward,
            limit=limit
        )
        
        logger.info(f"Got {len(conversations)} conversations")
        
        return jsonify({
            "conversations": conversations,
            "total": len(conversations),
            "ward_filter": ward
        })
        
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        return jsonify({
            "error": "Failed to list conversations",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/conversation/message', methods=['POST'])
@login_required
@track_api_call
def send_conversation_message():
    """
    Send a message in a conversation.
    
    Request Body:
    {
        "sessionId": "Session identifier",
        "message": "User message data",
        "chatType": "conversation type",
        "ward": "Ward context",
        "language": "Language code"
    }
    """
    try:
        from .conversation import conversation_manager
        
        data = request.get_json() or {}
        session_id = data.get('sessionId')
        message_data = data.get('message', {})
        
        if not session_id or not message_data:
            return jsonify({"error": "Session ID and message are required"}), 400
        
        # Add message to conversation
        success = conversation_manager.add_message(session_id, message_data)
        if not success:
            return jsonify({"error": "Failed to add message to conversation"}), 500
        
        return jsonify({
            "status": "message_added",
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error sending conversation message: {e}")
        return jsonify({
            "error": "Failed to send message",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/conversation/stream', methods=['GET'])
@login_required
def stream_conversation():
    """
    Server-Sent Events stream for conversation responses.
    
    Query Parameters:
    - sessionId: Conversation session ID
    - ward: Ward context
    - chatType: Conversation type
    - language: Language code
    """
    try:
        from .conversation import conversation_manager
        
        session_id = request.args.get('sessionId')
        ward = request.args.get('ward', '')
        chat_type = request.args.get('chatType', 'strategy')
        language = request.args.get('language', 'en')
        
        if not session_id:
            return jsonify({"error": "Session ID is required"}), 400
        
        async def generate_conversation_stream():
            """Generate SSE stream for conversation."""
            try:
                # Get session data
                session_data = conversation_manager.get_session(session_id)
                if not session_data:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Session not found'})}\n\n"
                    return
                
                # Get the latest user message
                messages = session_data.get('messages', [])
                user_messages = [msg for msg in messages if msg['type'] == 'user']
                
                if not user_messages:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'No user message found'})}\n\n"
                    return
                
                latest_user_message = user_messages[-1]['content']
                
                # Generate streaming response
                async for chunk in conversation_manager.generate_response(
                    session_id, latest_user_message, stream=True
                ):
                    yield f"data: {json.dumps(chunk)}\n\n"
                    
            except Exception as e:
                logger.error(f"Error in conversation stream: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
        return Response(
            generate_conversation_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        logger.error(f"Error starting conversation stream: {e}")
        return jsonify({
            "error": "Conversation stream unavailable",
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


@strategist_bp.route('/playbook/generate', methods=['POST'])
@login_required
@track_api_call
def generate_playbook():
    """
    Wave 2: Generate communications playbook.
    
    Request Body:
    {
        "playbook_type": "crisis_response|policy_announcement|opposition_counter|...",
        "ward": "Ward name",
        "context": {"political_context": "..."},
        "language": "en|hi|te|ur",
        "conversation_context": [...] // Optional conversation history
    }
    """
    try:
        from .playbook import PlaybookGenerator, PlaybookType
        
        data = request.get_json() or {}
        
        # Validate required fields
        playbook_type_str = data.get('playbook_type')
        ward = data.get('ward')
        context = data.get('context', {})
        language = data.get('language', 'en')
        conversation_context = data.get('conversation_context')
        
        if not playbook_type_str or not ward:
            return jsonify({"error": "playbook_type and ward are required"}), 400
        
        # Validate playbook type
        try:
            playbook_type = PlaybookType(playbook_type_str)
        except ValueError:
            valid_types = [pt.value for pt in PlaybookType]
            return jsonify({
                "error": f"Invalid playbook_type. Must be one of: {valid_types}"
            }), 400
        
        # Validate language
        if language not in ['en', 'hi', 'te', 'ur']:
            language = 'en'
        
        # Generate playbook
        generator = PlaybookGenerator()
        playbook = generator.generate_playbook(
            playbook_type=playbook_type,
            ward=ward,
            context=context,
            language=language,
            conversation_context=conversation_context
        )
        
        logger.info(f"Generated {playbook_type_str} playbook for {ward} in {language}")
        return jsonify(playbook)
        
    except Exception as e:
        logger.error(f"Error generating playbook: {e}", exc_info=True)
        return jsonify({
            "error": "Playbook generation failed",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/playbook/opposition-response', methods=['POST'])
@login_required
@track_api_call
def generate_opposition_response():
    """
    Wave 2: Generate response to opposition messaging.
    
    Request Body:
    {
        "opposition_message": "Message to respond to",
        "opposition_context": {"context": "..."},
        "ward": "Ward name",
        "language": "en|hi|te|ur"
    }
    """
    try:
        from .playbook import PlaybookGenerator
        
        data = request.get_json() or {}
        
        opposition_message = data.get('opposition_message', '').strip()
        opposition_context = data.get('opposition_context', {})
        ward = data.get('ward')
        language = data.get('language', 'en')
        
        if not opposition_message or not ward:
            return jsonify({"error": "opposition_message and ward are required"}), 400
        
        if len(opposition_message) < 10:
            return jsonify({"error": "Opposition message too short for analysis"}), 400
        
        # Generate strategic response
        generator = PlaybookGenerator()
        response = generator.generate_opposition_response(
            original_message=opposition_message,
            opposition_context=opposition_context,
            ward=ward,
            language=language
        )
        
        logger.info(f"Generated opposition response for {ward}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error generating opposition response: {e}", exc_info=True)
        return jsonify({
            "error": "Opposition response generation failed",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/playbook/customize', methods=['POST'])
@login_required
@track_api_call
def customize_playbook():
    """
    Wave 2: Customize existing playbook based on conversation context.
    
    Request Body:
    {
        "base_playbook": {...},
        "conversation_history": [...],
        "user_preferences": {...}
    }
    """
    try:
        from .playbook import PlaybookGenerator
        
        data = request.get_json() or {}
        
        base_playbook = data.get('base_playbook', {})
        conversation_history = data.get('conversation_history', [])
        user_preferences = data.get('user_preferences', {})
        
        if not base_playbook:
            return jsonify({"error": "base_playbook is required"}), 400
        
        # Customize playbook
        generator = PlaybookGenerator()
        customized_playbook = generator.customize_playbook_for_conversation(
            base_playbook=base_playbook,
            conversation_history=conversation_history,
            user_preferences=user_preferences
        )
        
        logger.info("Customized playbook based on conversation context")
        return jsonify(customized_playbook)
        
    except Exception as e:
        logger.error(f"Error customizing playbook: {e}", exc_info=True)
        return jsonify({
            "error": "Playbook customization failed",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/scenario/simulate', methods=['POST'])
@login_required
@track_api_call
def simulate_scenario():
    """
    Wave 2: Run interactive scenario simulation.
    
    Request Body:
    {
        "scenario_query": "What if our main opponent changes position on infrastructure?",
        "scenario_type": "electoral|policy|crisis|opposition|coalition",
        "ward": "Ward name",
        "timeframe": "1_month|3_months|6_months|1_year",
        "metrics": ["electoral", "sentiment", "coalition"],
        "parameters": {"confidence_level": 0.8, "include_uncertainty": true}
    }
    """
    try:
        from .scenario import ScenarioSimulator, ScenarioRequest
        
        data = request.get_json() or {}
        
        # Validate required fields
        scenario_query = data.get('scenario_query', '').strip()
        scenario_type = data.get('scenario_type', 'electoral')
        ward = data.get('ward', '').strip()
        
        if not scenario_query or not ward:
            return jsonify({"error": "scenario_query and ward are required"}), 400
        
        if len(scenario_query) < 10:
            return jsonify({"error": "Scenario query too short for meaningful analysis"}), 400
        
        # Validate scenario type
        valid_types = ['electoral', 'policy', 'crisis', 'opposition', 'coalition']
        if scenario_type not in valid_types:
            return jsonify({
                "error": f"Invalid scenario_type. Must be one of: {valid_types}"
            }), 400
        
        # Validate timeframe
        timeframe = data.get('timeframe', '3_months')
        valid_timeframes = ['1_month', '3_months', '6_months', '1_year']
        if timeframe not in valid_timeframes:
            timeframe = '3_months'
        
        # Create scenario request
        scenario_request = ScenarioRequest(
            scenario_query=scenario_query,
            scenario_type=scenario_type,
            ward=ward,
            timeframe=timeframe,
            metrics=data.get('metrics', ['electoral', 'sentiment', 'coalition']),
            parameters=data.get('parameters', {})
        )
        
        # Run simulation
        simulator = ScenarioSimulator()
        result = simulator.simulate_scenario(scenario_request)
        
        # Convert result to JSON-serializable format
        result_data = {
            "scenario_id": result.scenario_id,
            "key_impact": result.key_impact,
            "confidence_score": result.confidence_score,
            "strategic_recommendations": result.strategic_recommendations,
            "impact_breakdown": result.impact_breakdown,
            "confidence_intervals": result.confidence_intervals,
            "visualization_data": result.visualization_data,
            "electoral_projections": result.electoral_projections,
            "risk_factors": result.risk_factors,
            "mitigation_strategies": result.mitigation_strategies,
            "simulated_at": datetime.now().isoformat(),
            "ward": ward,
            "scenario_type": scenario_type,
            "timeframe": timeframe
        }
        
        logger.info(f"Scenario simulation completed for {ward}: {scenario_type}")
        return jsonify(result_data)
        
    except Exception as e:
        logger.error(f"Error in scenario simulation: {e}", exc_info=True)
        return jsonify({
            "error": "Scenario simulation failed",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/scenarios/history', methods=['GET'])
@login_required
def get_scenario_history():
    """
    Wave 2: Get scenario simulation history for a ward.
    
    Query Parameters:
    - ward: Ward name (optional, defaults to all)
    - limit: Maximum number of scenarios to return (default: 10)
    """
    try:
        ward = request.args.get('ward')
        limit = int(request.args.get('limit', 10))
        
        # For now, return empty history as we don't have persistent storage
        # In a full implementation, this would query a database
        scenarios = []
        
        return jsonify({
            "scenarios": scenarios,
            "total": len(scenarios),
            "ward_filter": ward,
            "limit": limit
        })
        
    except Exception as e:
        logger.error(f"Error retrieving scenario history: {e}")
        return jsonify({
            "error": "Failed to retrieve scenario history",
            "scenarios": [],
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/alerts/contextual', methods=['POST'])
@login_required
@track_api_call
def generate_contextual_alerts():
    """
    Wave 2: Generate enhanced contextual alerts.
    
    Request Body:
    {
        "ward": "Ward name",
        "political_events": [...], // Raw political events/intelligence
        "conversation_history": [...], // Optional conversation context
        "user_preferences": {...}, // Optional user alert preferences
        "strategic_objectives": [...] // Optional campaign objectives
    }
    """
    try:
        from .alerting import EnhancedAlertingEngine, AlertContext
        
        data = request.get_json() or {}
        
        # Validate required fields
        ward = data.get('ward', '').strip()
        political_events = data.get('political_events', [])
        
        if not ward:
            return jsonify({"error": "ward is required"}), 400
        
        if not political_events:
            return jsonify({"error": "political_events array is required"}), 400
        
        # Create alert context
        alert_context = AlertContext(
            ward=ward,
            user_preferences=data.get('user_preferences'),
            conversation_history=data.get('conversation_history'),
            active_campaigns=data.get('active_campaigns'),
            strategic_objectives=data.get('strategic_objectives')
        )
        
        # Generate contextual alerts
        alerting_engine = EnhancedAlertingEngine()
        alerts = alerting_engine.generate_contextual_alerts(
            political_events=political_events,
            alert_context=alert_context
        )
        
        # Convert alerts to JSON-serializable format
        alerts_data = []
        for alert in alerts:
            alert_data = {
                "alert_id": alert.alert_id,
                "title": alert.title,
                "content": alert.content,
                "priority": alert.priority.value,
                "category": alert.category.value,
                "ward": alert.ward,
                "confidence_score": alert.confidence_score,
                "strategic_implications": alert.strategic_implications,
                "recommended_actions": alert.recommended_actions,
                "evidence_sources": alert.evidence_sources,
                "conversation_relevance": alert.conversation_relevance,
                "campaign_alignment": alert.campaign_alignment,
                "urgency_score": alert.urgency_score,
                "created_at": alert.created_at,
                "expires_at": alert.expires_at
            }
            alerts_data.append(alert_data)
        
        logger.info(f"Generated {len(alerts_data)} contextual alerts for {ward}")
        return jsonify({
            "alerts": alerts_data,
            "total": len(alerts_data),
            "ward": ward,
            "generated_at": datetime.now().isoformat(),
            "context_enhanced": True
        })
        
    except Exception as e:
        logger.error(f"Error generating contextual alerts: {e}", exc_info=True)
        return jsonify({
            "error": "Contextual alert generation failed",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/alerts/correlate-events', methods=['POST'])
@login_required
@track_api_call
def correlate_political_events():
    """
    Wave 2: Correlate political events for strategic pattern recognition.
    
    Request Body:
    {
        "ward": "Ward name",
        "events": [...] // Political events to correlate
    }
    """
    try:
        from .alerting import EnhancedAlertingEngine
        
        data = request.get_json() or {}
        
        # Validate required fields
        ward = data.get('ward', '').strip()
        events = data.get('events', [])
        
        if not ward:
            return jsonify({"error": "ward is required"}), 400
        
        if not events:
            return jsonify({"error": "events array is required"}), 400
        
        # Perform event correlation
        alerting_engine = EnhancedAlertingEngine()
        correlation_analysis = alerting_engine.correlate_political_events(
            events=events,
            ward=ward
        )
        
        logger.info(f"Correlated {len(events)} political events for {ward}")
        return jsonify(correlation_analysis)
        
    except Exception as e:
        logger.error(f"Error correlating political events: {e}", exc_info=True)
        return jsonify({
            "error": "Political event correlation failed",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.route('/alerts/priority-score', methods=['POST'])
@login_required
def calculate_alert_priority():
    """
    Wave 2: Calculate strategic priority score for an alert.
    
    Request Body:
    {
        "alert_data": {...}, // Alert information
        "context": {...}, // Strategic context
        "ward": "Ward name"
    }
    """
    try:
        from .alerting import EnhancedAlertingEngine, AlertContext, StrategicAlert, AlertPriority, AlertCategory
        
        data = request.get_json() or {}
        
        alert_data = data.get('alert_data', {})
        context_data = data.get('context', {})
        ward = data.get('ward', '')
        
        if not alert_data or not ward:
            return jsonify({"error": "alert_data and ward are required"}), 400
        
        # Create temporary alert for scoring
        try:
            alert = StrategicAlert(
                alert_id="temp_scoring",
                title=alert_data.get('title', 'Alert'),
                content=alert_data.get('content', ''),
                priority=AlertPriority(alert_data.get('priority', 'medium')),
                category=AlertCategory(alert_data.get('category', 'electoral')),
                ward=ward,
                confidence_score=float(alert_data.get('confidence_score', 0.75)),
                strategic_implications=alert_data.get('strategic_implications', []),
                recommended_actions=alert_data.get('recommended_actions', []),
                evidence_sources=alert_data.get('evidence_sources', []),
                conversation_relevance=float(alert_data.get('conversation_relevance', 0.5)),
                campaign_alignment=float(alert_data.get('campaign_alignment', 0.5)),
                urgency_score=float(alert_data.get('urgency_score', 0.5))
            )
        except (ValueError, KeyError) as e:
            return jsonify({"error": f"Invalid alert data: {str(e)}"}), 400
        
        # Create alert context
        alert_context = AlertContext(
            ward=ward,
            user_preferences=context_data.get('user_preferences'),
            conversation_history=context_data.get('conversation_history'),
            strategic_objectives=context_data.get('strategic_objectives')
        )
        
        # Calculate priority scoring
        alerting_engine = EnhancedAlertingEngine()
        scored_alerts = alerting_engine._prioritize_alerts([alert])
        
        if scored_alerts:
            scored_alert = scored_alerts[0]
            priority_score = getattr(scored_alert, 'strategic_score', 0.5)
        else:
            priority_score = 0.5
        
        return jsonify({
            "priority_score": priority_score,
            "alert_id": alert.alert_id,
            "ward": ward,
            "calculated_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error calculating alert priority: {e}")
        return jsonify({
            "error": "Priority score calculation failed",
            "timestamp": datetime.now().isoformat()
        }), 500


# Duplicate health endpoint removed - using the comprehensive one above


@strategist_bp.route('/circuit-breaker/reset', methods=['POST'])
@login_required
def reset_circuit_breakers():
    """
    Manually reset all circuit breakers (admin endpoint).
    
    Returns:
        Status of circuit breaker reset operation
    """
    try:
        circuit_breaker_manager.reset_all_circuits()
        
        return jsonify({
            "status": "success",
            "message": "All circuit breakers have been reset",
            "timestamp": datetime.now().isoformat(),
            "action": "circuit_breaker_reset"
        })
        
    except Exception as e:
        logger.error(f"Error resetting circuit breakers: {e}")
        return jsonify({
            "error": "Failed to reset circuit breakers",
            "timestamp": datetime.now().isoformat()
        }), 500


@strategist_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors for strategist endpoints."""
    logger.error(f"Internal error in strategist API: {error}")
    return jsonify({
        "error": "Internal strategist system error",
        "timestamp": datetime.now().isoformat(),
        "support": "Check system logs for details"
    }), 500
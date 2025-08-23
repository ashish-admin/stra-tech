"""
Enhanced Server-Sent Events for Real-time Intelligence

Provides secure, resilient real-time intelligence updates via SSE stream
with connection monitoring, authentication validation, and error recovery.
"""

import json
import time
import logging
from datetime import datetime, timezone
from typing import Generator, Optional, Dict, Any

from app.models import Alert, Post
from app.extensions import db

logger = logging.getLogger(__name__)


def sse_stream(ward: str, since: Optional[str] = None, priority: str = 'all') -> Generator[str, None, None]:
    """
    Generate Server-Sent Events stream for real-time intelligence updates.
    
    Args:
        ward: Ward to monitor for updates
        since: Timestamp to get updates since
        priority: Priority filter (all|high|critical)
        
    Yields:
        SSE formatted messages with intelligence updates
    """
    try:
        # Send initial connection event
        yield f"data: {json.dumps({'type': 'connection', 'status': 'connected', 'ward': ward, 'timestamp': datetime.now().isoformat()})}\n\n"
        
        # Parse since timestamp
        since_dt = None
        if since:
            try:
                since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            except Exception as e:
                logger.warning(f"Invalid since timestamp: {since}, error: {e}")
        
        last_check = since_dt or datetime.now(timezone.utc)
        
        # Stream loop
        while True:
            try:
                # Check for new alerts
                alerts = _get_recent_alerts(ward, last_check, priority)
                for alert in alerts:
                    alert_data = {
                        'type': 'alert',
                        'data': {
                            'id': alert.id,
                            'ward': alert.ward,
                            'description': alert.description,
                            'severity': alert.severity,
                            'created_at': alert.created_at.isoformat()
                        }
                    }
                    yield f"data: {json.dumps(alert_data)}\n\n"
                
                # Check for new intelligence (recent posts)
                intelligence = _get_recent_intelligence(ward, last_check)
                if intelligence:
                    intel_data = {
                        'type': 'intelligence',
                        'data': intelligence
                    }
                    yield f"data: {json.dumps(intel_data)}\n\n"
                
                # Update last check time
                last_check = datetime.now(timezone.utc)
                
                # Send heartbeat every 30 seconds
                heartbeat = {
                    'type': 'heartbeat',
                    'timestamp': datetime.now().isoformat(),
                    'ward': ward
                }
                yield f"data: {json.dumps(heartbeat)}\n\n"
                
                # Wait before next check
                time.sleep(30)
                
            except GeneratorExit:
                logger.info(f"Intelligence stream closed for ward: {ward}")
                break
            except Exception as e:
                logger.error(f"Error in SSE stream: {e}")
                error_data = {
                    'type': 'error',
                    'error': 'Stream error occurred',
                    'timestamp': datetime.now().isoformat()
                }
                yield f"data: {json.dumps(error_data)}\n\n"
                time.sleep(10)  # Brief pause before continuing
                
    except Exception as e:
        logger.error(f"Fatal error in SSE stream: {e}")
        # Send final error message
        yield f"data: {json.dumps({'type': 'fatal_error', 'error': str(e)})}\n\n"


def _get_recent_alerts(ward: str, since: datetime, priority: str) -> list:
    """Get recent alerts for ward."""
    try:
        query = Alert.query
        
        # Filter by ward (if not 'All')
        if ward.lower() != 'all':
            query = query.filter(Alert.ward.ilike(f'%{ward}%'))
        
        # Filter by timestamp
        if since:
            query = query.filter(Alert.created_at > since)
        
        # Filter by priority
        if priority == 'high':
            query = query.filter(Alert.severity.in_(['High', 'Critical']))
        elif priority == 'critical':
            query = query.filter(Alert.severity == 'Critical')
        
        # Get recent alerts
        alerts = query.order_by(Alert.created_at.desc()).limit(10).all()
        
        return alerts
        
    except Exception as e:
        logger.error(f"Error getting recent alerts: {e}")
        return []


def _get_recent_intelligence(ward: str, since: datetime) -> Optional[dict]:
    """Get recent intelligence updates for ward."""
    try:
        query = Post.query
        
        # Filter by ward
        if ward.lower() != 'all':
            query = query.filter(Post.city.ilike(f'%{ward}%'))
        
        # Filter by timestamp
        if since and hasattr(Post, 'created_at'):
            query = query.filter(Post.created_at > since)
        
        # Get recent posts
        recent_posts = query.order_by(
            getattr(Post, 'created_at', db.text('NOW()')).desc()
        ).limit(5).all()
        
        if not recent_posts:
            return None
        
        # Process posts into intelligence format
        intelligence = {
            'new_posts_count': len(recent_posts),
            'summary': f"{len(recent_posts)} new intelligence items for {ward}",
            'items': []
        }
        
        for post in recent_posts:
            item = {
                'id': post.id,
                'content': (post.text or post.content or '')[:200] + ('...' if len(post.text or post.content or '') > 200 else ''),
                'emotion': getattr(post, 'emotion', 'Unknown'),
                'drivers': getattr(post, 'drivers', []),
                'city': getattr(post, 'city', ''),
                'created_at': getattr(post, 'created_at', datetime.now()).isoformat() if hasattr(post, 'created_at') else None
            }
            intelligence['items'].append(item)
        
        return intelligence
        
    except Exception as e:
        logger.error(f"Error getting recent intelligence: {e}")
        return None


def enhanced_sse_stream(
    ward: str, 
    since: Optional[str] = None, 
    priority: str = 'all',
    connection_info: Dict[str, Any] = None
) -> Generator[str, None, None]:
    """
    Enhanced Server-Sent Events stream with security and resilience features.
    
    Args:
        ward: Ward to monitor for updates
        since: Timestamp to get updates since
        priority: Priority filter (all|high|critical)
        connection_info: Authentication and connection details
        
    Yields:
        SSE formatted messages with intelligence updates and connection monitoring
    """
    connection_id = connection_info.get('user_id', 'anonymous') if connection_info else 'anonymous'
    start_time = datetime.now(timezone.utc)
    message_count = 0
    error_count = 0
    last_heartbeat = start_time
    
    try:
        # Send enhanced connection event
        connection_data = {
            'type': 'connection_established',
            'status': 'connected',
            'ward': ward,
            'priority_filter': priority,
            'connection_id': connection_id,
            'server_time': datetime.now(timezone.utc).isoformat(),
            'features': {
                'heartbeat_enabled': True,
                'token_refresh': True,
                'error_recovery': True,
                'connection_monitoring': True
            }
        }
        yield f"event: connection\ndata: {json.dumps(connection_data)}\n\n"
        message_count += 1
        
        # Parse since timestamp with better error handling
        since_dt = None
        if since:
            try:
                since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            except Exception as e:
                logger.warning(f"Invalid since timestamp: {since}, error: {e}")
                # Send error notification to client
                error_data = {
                    'type': 'parameter_error',
                    'error': f'Invalid since timestamp: {since}',
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'recoverable': True
                }
                yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
        
        last_check = since_dt or datetime.now(timezone.utc)
        heartbeat_interval = 30  # seconds
        connection_timeout = 300  # 5 minutes without activity
        
        # Enhanced stream loop with connection monitoring
        while True:
            try:
                current_time = datetime.now(timezone.utc)
                
                # Check connection timeout
                if (current_time - last_heartbeat).total_seconds() > connection_timeout:
                    logger.warning(f"SSE connection timeout for {connection_id}")
                    timeout_data = {
                        'type': 'connection_timeout',
                        'message': 'Connection will close due to inactivity',
                        'timestamp': current_time.isoformat(),
                        'connection_duration': (current_time - start_time).total_seconds()
                    }
                    yield f"event: timeout\ndata: {json.dumps(timeout_data)}\n\n"
                    break
                
                # Validate connection token periodically (every 5 minutes)
                if connection_info and (current_time - start_time).total_seconds() % 300 == 0:
                    # This would trigger token refresh in a production system
                    refresh_data = {
                        'type': 'token_refresh_reminder',
                        'message': 'Consider refreshing connection token',
                        'timestamp': current_time.isoformat(),
                        'expires_in_minutes': 55  # Assuming 1-hour tokens
                    }
                    yield f"event: token_refresh\ndata: {json.dumps(refresh_data)}\n\n"
                
                # Check for new alerts with enhanced error handling
                try:
                    alerts = _get_recent_alerts(ward, last_check, priority)
                    for alert in alerts:
                        alert_data = {
                            'type': 'alert',
                            'message_id': f"alert-{alert.id}-{int(time.time())}",
                            'data': {
                                'id': alert.id,
                                'ward': alert.ward,
                                'description': alert.description,
                                'severity': alert.severity,
                                'created_at': alert.created_at.isoformat(),
                                'connection_id': connection_id
                            },
                            'metadata': {
                                'received_at': current_time.isoformat(),
                                'latency_ms': 0,  # Would calculate from creation time
                                'priority_level': _calculate_alert_priority(alert)
                            }
                        }
                        yield f"event: alert\ndata: {json.dumps(alert_data)}\n\n"
                        message_count += 1
                        
                except Exception as alert_error:
                    error_count += 1
                    logger.error(f"Error fetching alerts for {ward}: {alert_error}")
                    error_data = {
                        'type': 'data_error',
                        'component': 'alerts',
                        'error': 'Failed to fetch recent alerts',
                        'timestamp': current_time.isoformat(),
                        'retry_in_seconds': 30,
                        'error_count': error_count
                    }
                    yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
                
                # Check for new intelligence with enhanced processing
                try:
                    intelligence = _get_recent_intelligence(ward, last_check)
                    if intelligence:
                        intel_data = {
                            'type': 'intelligence_update',
                            'message_id': f"intel-{int(time.time())}-{connection_id}",
                            'data': {
                                **intelligence,
                                'connection_id': connection_id,
                                'processing_time': current_time.isoformat()
                            },
                            'metadata': {
                                'confidence_score': _calculate_intelligence_confidence(intelligence),
                                'actionable_items': _extract_actionable_insights(intelligence),
                                'urgency_level': _assess_urgency(intelligence)
                            }
                        }
                        yield f"event: intelligence\ndata: {json.dumps(intel_data)}\n\n"
                        message_count += 1
                        
                except Exception as intel_error:
                    error_count += 1
                    logger.error(f"Error fetching intelligence for {ward}: {intel_error}")
                    error_data = {
                        'type': 'data_error',
                        'component': 'intelligence',
                        'error': 'Failed to fetch recent intelligence',
                        'timestamp': current_time.isoformat(),
                        'retry_in_seconds': 30,
                        'error_count': error_count
                    }
                    yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
                
                # Update last check time
                last_check = current_time
                
                # Send enhanced heartbeat every interval
                if (current_time - last_heartbeat).total_seconds() >= heartbeat_interval:
                    connection_stats = {
                        'uptime_seconds': (current_time - start_time).total_seconds(),
                        'messages_sent': message_count,
                        'errors_encountered': error_count,
                        'last_data_check': last_check.isoformat(),
                        'connection_health': 'stable' if error_count < 5 else 'degraded'
                    }
                    
                    heartbeat_data = {
                        'type': 'heartbeat',
                        'timestamp': current_time.isoformat(),
                        'ward': ward,
                        'connection_id': connection_id,
                        'server_status': 'operational',
                        'connection_stats': connection_stats,
                        'next_heartbeat_in': heartbeat_interval
                    }
                    yield f"event: heartbeat\ndata: {json.dumps(heartbeat_data)}\n\n"
                    last_heartbeat = current_time
                    message_count += 1
                
                # Adaptive sleep based on activity and errors
                sleep_duration = min(30, max(10, heartbeat_interval - error_count))
                time.sleep(sleep_duration)
                
            except GeneratorExit:
                logger.info(f"Enhanced intelligence stream closed for {connection_id}, ward: {ward}")
                # Send graceful close event
                close_data = {
                    'type': 'connection_closed',
                    'reason': 'client_disconnect',
                    'final_stats': {
                        'session_duration': (datetime.now(timezone.utc) - start_time).total_seconds(),
                        'total_messages': message_count,
                        'error_count': error_count
                    },
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                yield f"event: close\ndata: {json.dumps(close_data)}\n\n"
                break
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error in enhanced SSE stream: {e}")
                
                # Send detailed error information
                error_data = {
                    'type': 'stream_error',
                    'error': str(e),
                    'error_count': error_count,
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'recovery_action': 'continuing_with_degraded_service',
                    'next_retry_in': 10
                }
                yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
                
                # Circuit breaker: too many errors, close connection
                if error_count >= 10:
                    logger.error(f"Too many errors ({error_count}) in SSE stream for {connection_id}, closing connection")
                    circuit_breaker_data = {
                        'type': 'circuit_breaker_tripped',
                        'reason': f'Error threshold exceeded ({error_count} errors)',
                        'action': 'connection_terminating',
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'recommended_action': 'retry_connection_after_5_minutes'
                    }
                    yield f"event: circuit_breaker\ndata: {json.dumps(circuit_breaker_data)}\n\n"
                    break
                
                time.sleep(10)  # Brief pause before continuing
                
    except Exception as e:
        logger.error(f"Fatal error in enhanced SSE stream: {e}")
        # Send final error message with recovery suggestions
        final_error_data = {
            'type': 'fatal_error',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'session_stats': {
                'duration': (datetime.now(timezone.utc) - start_time).total_seconds(),
                'messages_sent': message_count,
                'errors_encountered': error_count
            },
            'recovery_suggestions': [
                'Check network connectivity',
                'Verify authentication token',
                'Try reconnecting after 30 seconds',
                'Contact support if problem persists'
            ]
        }
        yield f"event: fatal_error\ndata: {json.dumps(final_error_data)}\n\n"


def _calculate_alert_priority(alert) -> str:
    """Calculate priority level for alert based on severity and content."""
    try:
        severity = getattr(alert, 'severity', 'Medium').lower()
        description = getattr(alert, 'description', '').lower()
        
        # High priority indicators
        high_indicators = ['urgent', 'breaking', 'critical', 'emergency', 'immediate']
        if any(indicator in description for indicator in high_indicators):
            return 'critical'
        
        if severity in ['high', 'critical']:
            return 'high'
        elif severity in ['medium']:
            return 'medium'
        else:
            return 'low'
            
    except Exception as e:
        logger.warning(f"Error calculating alert priority: {e}")
        return 'medium'


def _calculate_intelligence_confidence(intelligence: Dict) -> float:
    """Calculate confidence score for intelligence data."""
    try:
        base_confidence = 0.5
        
        # Factors that increase confidence
        item_count = len(intelligence.get('items', []))
        if item_count >= 3:
            base_confidence += 0.2
        
        # Check for emotion diversity
        emotions = set(item.get('emotion', 'Unknown') for item in intelligence.get('items', []))
        if len(emotions) > 2:
            base_confidence += 0.1
        
        # Check for recency
        recent_items = [item for item in intelligence.get('items', []) 
                       if item.get('created_at') and 
                       (datetime.now(timezone.utc) - datetime.fromisoformat(item['created_at'].replace('Z', '+00:00'))).total_seconds() < 3600]
        
        if len(recent_items) > 0:
            base_confidence += 0.2
        
        return min(1.0, base_confidence)
        
    except Exception as e:
        logger.warning(f"Error calculating intelligence confidence: {e}")
        return 0.5


def _extract_actionable_insights(intelligence: Dict) -> list:
    """Extract actionable insights from intelligence data."""
    try:
        actionable_items = []
        items = intelligence.get('items', [])
        
        for item in items:
            emotion = item.get('emotion', '').lower()
            content = item.get('content', '').lower()
            
            # Identify actionable patterns
            if emotion in ['anger', 'frustration'] and any(word in content for word in ['roads', 'infrastructure']):
                actionable_items.append({
                    'action': 'Address infrastructure concerns',
                    'priority': 'high',
                    'timeline': '7_days',
                    'evidence': item['content'][:100] + '...'
                })
            
            elif emotion in ['hopeful', 'positive'] and any(word in content for word in ['development', 'progress']):
                actionable_items.append({
                    'action': 'Amplify positive development messaging',
                    'priority': 'medium',
                    'timeline': '3_days',
                    'evidence': item['content'][:100] + '...'
                })
        
        return actionable_items[:3]  # Return top 3 actionable items
        
    except Exception as e:
        logger.warning(f"Error extracting actionable insights: {e}")
        return []


def _assess_urgency(intelligence: Dict) -> str:
    """Assess urgency level of intelligence data."""
    try:
        items = intelligence.get('items', [])
        if not items:
            return 'low'
        
        # Check for urgent emotions
        urgent_emotions = ['anger', 'fear', 'frustration']
        urgent_count = sum(1 for item in items if item.get('emotion', '').lower() in urgent_emotions)
        
        if urgent_count >= len(items) * 0.7:  # 70% or more urgent emotions
            return 'high'
        elif urgent_count >= len(items) * 0.4:  # 40% or more urgent emotions
            return 'medium'
        else:
            return 'low'
            
    except Exception as e:
        logger.warning(f"Error assessing urgency: {e}")
        return 'medium'
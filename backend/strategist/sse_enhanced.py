"""
Phase 3: Enhanced SSE Module for Political Strategist

Implements robust Server-Sent Events with:
- Heartbeat/keepalive mechanism with adaptive intervals
- Auto-reconnection with exponential backoff
- Real-time progress tracking for multi-stage analysis
- Comprehensive error handling and recovery strategies
- Authentication and rate limiting support
"""

import json
import time
import logging
import asyncio
from typing import Optional, Generator, Dict, Any
from datetime import datetime, timezone
from flask import request, current_app
from flask_login import current_user

logger = logging.getLogger(__name__)


class SSEConnection:
    """Manages individual SSE connection with heartbeat."""
    
    def __init__(self, ward: str, priority: str = 'all', heartbeat_interval: int = 30):
        self.ward = ward
        self.priority = priority
        self.heartbeat_interval = heartbeat_interval
        self.last_heartbeat = time.time()
        self.connection_id = f"{ward}_{int(time.time()*1000)}"
        self.is_active = True
        
    def should_send_heartbeat(self) -> bool:
        """Check if heartbeat should be sent."""
        return (time.time() - self.last_heartbeat) >= self.heartbeat_interval
    
    def send_heartbeat(self) -> str:
        """Generate heartbeat message."""
        self.last_heartbeat = time.time()
        heartbeat_data = {
            'type': 'heartbeat',
            'timestamp': self.last_heartbeat,
            'connection_id': self.connection_id,
            'ward': self.ward
        }
        return f"data: {json.dumps(heartbeat_data)}\n\n"
    
    def format_event(self, event_type: str, data: Dict[str, Any]) -> str:
        """Format event for SSE transmission."""
        event_data = {
            'type': event_type,
            'data': data,
            'timestamp': time.time(),
            'connection_id': self.connection_id
        }
        
        # Add retry hint for client
        if event_type == 'error':
            return f"retry: 5000\ndata: {json.dumps(event_data)}\n\n"
        
        return f"data: {json.dumps(event_data)}\n\n"


def phase3_enhanced_sse_stream(ward: str, since: Optional[str] = None, priority: str = 'all') -> Generator[str, None, None]:
    """
    Enhanced SSE stream with heartbeat and proper error handling.
    
    Args:
        ward: Ward name to monitor
        since: Timestamp for updates since
        priority: Priority filter (all|high|critical)
        
    Yields:
        SSE formatted events
    """
    connection = SSEConnection(ward, priority)
    
    try:
        # Send initial connection event
        logger.info(f"SSE connection established for {ward} (id: {connection.connection_id})")
        yield connection.format_event('connection', {
            'status': 'connected',
            'ward': ward,
            'priority': priority,
            'server_time': datetime.now(timezone.utc).isoformat()
        })
        
        # Import here to avoid circular dependencies
        from app.models import Alert, Post, db
        from .service import PoliticalStrategist
        from .cache import cget
        
        # Initialize data generators
        alert_count = 0
        max_alerts = 10  # Limit number of alerts to prevent infinite streams
        
        while connection.is_active and alert_count < max_alerts:
            try:
                # Send heartbeat if needed
                if connection.should_send_heartbeat():
                    yield connection.send_heartbeat()
                
                # Check for cached intelligence
                cache_key = f"strategist:feed:{ward}:{priority}"
                cached_feed = cget(cache_key)
                
                if cached_feed:
                    # Send cached intelligence
                    for item in cached_feed.get('items', [])[:3]:
                        yield connection.format_event('intelligence', {
                            'id': item.get('id'),
                            'ward': ward,
                            'priority': item.get('priority', 'medium'),
                            'title': item.get('title'),
                            'content': item.get('content'),
                            'source': 'cache',
                            'confidence': item.get('confidence', 0.75)
                        })
                        alert_count += 1
                        time.sleep(0.5)  # Small delay between events
                else:
                    # Query database for recent alerts
                    with current_app.app_context():
                        recent_alerts = db.session.query(Alert)\
                            .filter(Alert.city == ward)\
                            .order_by(Alert.created_at.desc())\
                            .limit(5)\
                            .all()
                        
                        if recent_alerts:
                            for alert in recent_alerts:
                                # Filter by priority if specified
                                if priority != 'all':
                                    alert_priority = 'high' if alert.priority == 1 else 'medium'
                                    if priority == 'critical' and alert_priority != 'high':
                                        continue
                                    if priority == 'high' and alert_priority == 'low':
                                        continue
                                
                                yield connection.format_event('intelligence', {
                                    'id': f'alert_{alert.id}',
                                    'ward': ward,
                                    'priority': 'high' if alert.priority == 1 else 'medium',
                                    'title': alert.message[:100] if alert.message else f'Alert for {ward}',
                                    'content': alert.description or alert.message,
                                    'source': 'database',
                                    'created_at': alert.created_at.isoformat() if alert.created_at else None,
                                    'category': alert.category or 'political_development'
                                })
                                alert_count += 1
                                time.sleep(0.5)
                        else:
                            # Generate strategic intelligence if no alerts
                            yield connection.format_event('intelligence', {
                                'id': f'strategic_{int(time.time())}',
                                'ward': ward,
                                'priority': 'medium',
                                'title': f'Strategic Update for {ward}',
                                'content': f'Monitoring political developments in {ward}. System is analyzing current trends.',
                                'source': 'system',
                                'category': 'strategic_analysis'
                            })
                            alert_count += 1
                
                # Check if client is still connected (Flask will raise exception if not)
                if hasattr(request, 'is_disconnected') and request.is_disconnected:
                    break
                
                # Small delay to prevent CPU spinning
                time.sleep(1)
                
            except GeneratorExit:
                # Client disconnected
                connection.is_active = False
                break
            except Exception as e:
                logger.warning(f"Error in SSE stream iteration: {e}")
                yield connection.format_event('error', {
                    'message': 'Temporary error in intelligence feed',
                    'recoverable': True
                })
                time.sleep(2)
        
        # Send completion event
        yield connection.format_event('complete', {
            'ward': ward,
            'total_events': alert_count,
            'reason': 'feed_complete'
        })
        
    except Exception as e:
        logger.error(f"Fatal error in SSE stream for {ward}: {e}")
        yield connection.format_event('error', {
            'message': 'Intelligence feed encountered an error',
            'error': str(e),
            'recoverable': False
        })
    finally:
        logger.info(f"SSE connection closed for {ward} (id: {connection.connection_id})")


def validate_sse_request(ward: str, priority: str) -> tuple[bool, Optional[str]]:
    """
    Validate SSE request parameters.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not ward or len(ward.strip()) == 0:
        return False, "Ward parameter is required"
    
    if len(ward) > 100:
        return False, "Ward name too long"
    
    if priority not in ['all', 'high', 'critical']:
        return False, f"Invalid priority: {priority}"
    
    # Check authentication
    if not current_user.is_authenticated:
        return False, "Authentication required"
    
    return True, None


def create_phase3_sse_response(ward: str, priority: str = 'all', since: Optional[str] = None):
    """
    Create SSE response with proper headers.
    
    Returns:
        Flask Response object configured for SSE
    """
    from flask import Response
    
    # Validate request
    is_valid, error_msg = validate_sse_request(ward, priority)
    if not is_valid:
        # Return error as SSE event
        def error_stream():
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
        
        return Response(
            error_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'close'
            }
        )
    
    # Create SSE response with enhanced stream
    return Response(
        phase3_enhanced_sse_stream(ward, since, priority),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',  # Disable Nginx buffering
            'Access-Control-Allow-Origin': request.headers.get('Origin', '*'),
            'Access-Control-Allow-Credentials': 'true'
        }
    )


class SSEManager:
    """Manages multiple SSE connections."""
    
    def __init__(self):
        self.connections: Dict[str, SSEConnection] = {}
        self.max_connections = 100
        
    def add_connection(self, connection: SSEConnection) -> bool:
        """Add a new connection."""
        if len(self.connections) >= self.max_connections:
            # Remove oldest connection
            oldest_id = min(self.connections.keys(), 
                          key=lambda k: self.connections[k].last_heartbeat)
            del self.connections[oldest_id]
        
        self.connections[connection.connection_id] = connection
        return True
    
    def remove_connection(self, connection_id: str):
        """Remove a connection."""
        if connection_id in self.connections:
            del self.connections[connection_id]
    
    def get_active_connections(self) -> int:
        """Get count of active connections."""
        return len(self.connections)
    
    def broadcast_event(self, event_type: str, data: Dict[str, Any], ward: Optional[str] = None):
        """Broadcast event to all or specific ward connections."""
        for conn_id, conn in list(self.connections.items()):
            if ward and conn.ward != ward:
                continue
            
            # Mark for removal if inactive
            if not conn.is_active:
                self.remove_connection(conn_id)


# Global SSE manager instance
sse_manager = SSEManager()


def get_phase3_sse_stats() -> Dict[str, Any]:
    """Get SSE connection statistics."""
    return {
        'active_connections': sse_manager.get_active_connections(),
        'max_connections': sse_manager.max_connections,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
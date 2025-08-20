"""
Server-Sent Events for Real-time Intelligence

Provides real-time intelligence updates via SSE stream.
"""

import json
import time
import logging
from datetime import datetime, timezone
from typing import Generator, Optional

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
"""
Enhanced Server-Sent Events for Real-time Intelligence

Provides advanced real-time intelligence updates via SSE stream with:
- Progress tracking for multi-stage AI analysis
- Message prioritization and categorization
- Heartbeat and connection recovery
- Error handling with automatic reconnection support
"""

import json
import time
import logging
import uuid
from datetime import datetime, timezone
from typing import Generator, Optional, Dict, Any, List
from enum import Enum
from threading import Lock

from app.models import Alert, Post
from app.extensions import db

logger = logging.getLogger(__name__)


class EventPriority(Enum):
    """SSE Event Priority Levels"""
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'
    INFO = 'info'


class EventType(Enum):
    """SSE Event Types for Frontend Filtering"""
    CONNECTION = 'connection'
    HEARTBEAT = 'heartbeat'
    ALERT = 'alert'
    INTELLIGENCE = 'intelligence'
    ANALYSIS_PROGRESS = 'analysis_progress'
    ANALYSIS_COMPLETE = 'analysis_complete'
    ERROR = 'error'
    FATAL_ERROR = 'fatal_error'
    RECONNECTION = 'reconnection'
    STATUS_UPDATE = 'status_update'
    STRATEGY_UPDATE = 'strategy_update'
    SENTIMENT_UPDATE = 'sentiment_update'


class AnalysisProgress:
    """Track multi-stage AI analysis progress"""
    
    def __init__(self, analysis_id: str, total_stages: int = 6):
        self.analysis_id = analysis_id
        self.total_stages = total_stages
        self.current_stage = 0
        self.stage_names = [
            "Initializing Analysis",
            "Gathering Intelligence",
            "Processing Sentiment",
            "Analyzing Patterns",
            "Generating Strategies",
            "Finalizing Report"
        ]
        self.start_time = time.time()
        self.stage_start_time = time.time()
        self.lock = Lock()
    
    def advance_stage(self, stage_name: Optional[str] = None) -> Dict[str, Any]:
        """Advance to next stage and return progress data"""
        with self.lock:
            self.current_stage = min(self.current_stage + 1, self.total_stages)
            self.stage_start_time = time.time()
            
            if stage_name is None and self.current_stage <= len(self.stage_names):
                stage_name = self.stage_names[self.current_stage - 1]
            
            return {
                'analysis_id': self.analysis_id,
                'current_stage': self.current_stage,
                'total_stages': self.total_stages,
                'stage_name': stage_name,
                'percentage': round((self.current_stage / self.total_stages) * 100, 1),
                'elapsed_seconds': round(time.time() - self.start_time, 1),
                'stage_elapsed': round(time.time() - self.stage_start_time, 1)
            }
    
    def complete(self) -> Dict[str, Any]:
        """Mark analysis as complete"""
        with self.lock:
            self.current_stage = self.total_stages
            return {
                'analysis_id': self.analysis_id,
                'status': 'complete',
                'total_time': round(time.time() - self.start_time, 1),
                'percentage': 100
            }


# Global progress tracking
_analysis_progress: Dict[str, AnalysisProgress] = {}
_progress_lock = Lock()


def format_sse_event(data: Dict[str, Any], event_id: Optional[str] = None, 
                     event_type: Optional[str] = None) -> str:
    """
    Format data as SSE event with proper structure.
    
    Args:
        data: Event data dictionary
        event_id: Optional event ID for client-side deduplication
        event_type: Optional event type for frontend routing
        
    Returns:
        Formatted SSE event string
    """
    lines = []
    
    if event_id:
        lines.append(f"id: {event_id}")
    
    if event_type:
        lines.append(f"event: {event_type}")
    
    # Format data with proper escaping
    data_json = json.dumps(data)
    lines.append(f"data: {data_json}")
    
    # Add retry hint for connection recovery
    if data.get('type') in [EventType.ERROR.value, EventType.FATAL_ERROR.value]:
        lines.append("retry: 5000")  # 5 second retry on errors
    
    return "\n".join(lines) + "\n\n"


def _map_severity_to_priority(severity: str) -> EventPriority:
    """Map alert severity to event priority"""
    mapping = {
        'Critical': EventPriority.CRITICAL,
        'High': EventPriority.HIGH,
        'Medium': EventPriority.MEDIUM,
        'Low': EventPriority.LOW,
        'Info': EventPriority.INFO
    }
    return mapping.get(severity, EventPriority.MEDIUM)


def sse_stream(ward: str, since: Optional[str] = None, priority: str = 'all',
               include_progress: bool = True, analysis_id: Optional[str] = None) -> Generator[str, None, None]:
    """
    Generate Enhanced Server-Sent Events stream for real-time intelligence updates.
    
    Args:
        ward: Ward to monitor for updates
        since: Timestamp to get updates since
        priority: Priority filter (all|high|critical|medium|low)
        include_progress: Include AI analysis progress events
        analysis_id: Track specific analysis progress
        
    Yields:
        SSE formatted messages with intelligence updates
    """
    stream_id = str(uuid.uuid4())
    reconnection_count = 0
    heartbeat_interval = 30  # seconds
    last_heartbeat = time.time()
    error_count = 0
    max_errors = 5
    
    try:
        # Send initial connection event with enhanced metadata
        connection_event = {
            'type': EventType.CONNECTION.value,
            'status': 'connected',
            'stream_id': stream_id,
            'ward': ward,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'priority_filter': priority,
            'include_progress': include_progress,
            'reconnection_count': reconnection_count,
            'capabilities': {
                'progress_tracking': True,
                'priority_filtering': True,
                'heartbeat': True,
                'auto_reconnect': True
            }
        }
        yield format_sse_event(connection_event, event_id=f"{stream_id}-connect")
        
        # Parse since timestamp
        since_dt = None
        if since:
            try:
                since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            except Exception as e:
                logger.warning(f"Invalid since timestamp: {since}, error: {e}")
        
        last_check = since_dt or datetime.now(timezone.utc)
        
        # Initialize analysis progress if needed
        if analysis_id and include_progress:
            with _progress_lock:
                if analysis_id not in _analysis_progress:
                    _analysis_progress[analysis_id] = AnalysisProgress(analysis_id)
        
        # Stream loop with enhanced error recovery
        while error_count < max_errors:
            try:
                # Check for analysis progress updates
                if include_progress and analysis_id:
                    progress_event = _check_analysis_progress(analysis_id)
                    if progress_event:
                        yield format_sse_event(progress_event, 
                                             event_id=f"progress-{analysis_id}-{int(time.time())}")
                
                # Check for new alerts with priority filtering
                alerts = _get_recent_alerts(ward, last_check, priority)
                for alert in alerts:
                    alert_priority = _map_severity_to_priority(alert.severity)
                    
                    # Apply priority filter
                    if not _should_include_priority(alert_priority, priority):
                        continue
                    
                    alert_data = {
                        'type': EventType.ALERT.value,
                        'priority': alert_priority.value,
                        'data': {
                            'id': alert.id,
                            'ward': alert.ward,
                            'description': alert.description,
                            'severity': alert.severity,
                            'created_at': alert.created_at.isoformat() if alert.created_at else None,
                            'requires_action': alert.severity in ['Critical', 'High'],
                            'category': _categorize_alert(alert.description)
                        },
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    }
                    yield format_sse_event(alert_data, event_id=f"alert-{alert.id}")
                
                # Check for new intelligence (recent posts)
                intelligence = _get_recent_intelligence(ward, last_check)
                if intelligence:
                    intel_priority = _determine_intelligence_priority(intelligence)
                    
                    if _should_include_priority(intel_priority, priority):
                        intel_data = {
                            'type': EventType.INTELLIGENCE.value,
                            'priority': intel_priority.value,
                            'data': intelligence,
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                            'analysis_available': bool(analysis_id)
                        }
                        yield format_sse_event(intel_data, event_id=f"intel-{int(time.time())}")
                
                # Update last check time
                last_check = datetime.now(timezone.utc)
                
                # Send heartbeat with enhanced monitoring data
                current_time = time.time()
                if current_time - last_heartbeat >= heartbeat_interval:
                    heartbeat = {
                        'type': EventType.HEARTBEAT.value,
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'ward': ward,
                        'stream_id': stream_id,
                        'uptime_seconds': int(current_time - last_heartbeat),
                        'priority': EventPriority.INFO.value,
                        'stats': {
                            'error_count': error_count,
                            'reconnection_count': reconnection_count,
                            'stream_health': 'healthy' if error_count == 0 else 'degraded'
                        }
                    }
                    yield format_sse_event(heartbeat, event_id=f"{stream_id}-hb-{int(current_time)}")
                    last_heartbeat = current_time
                
                # Reset error count on successful iteration
                error_count = 0
                
                # Wait before next check
                time.sleep(5)  # Reduced from 30s for more responsive updates
                
            except GeneratorExit:
                logger.info(f"Intelligence stream closed for ward: {ward}")
                break
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error in SSE stream (attempt {error_count}/{max_errors}): {e}")
                
                # Send recoverable error event
                error_data = {
                    'type': EventType.ERROR.value,
                    'priority': EventPriority.HIGH.value,
                    'error': 'Stream error occurred',
                    'details': str(e),
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'recovery_action': 'automatic_retry',
                    'retry_after_seconds': min(10 * error_count, 60),  # Exponential backoff
                    'attempt': error_count,
                    'max_attempts': max_errors
                }
                yield format_sse_event(error_data, event_id=f"error-{int(time.time())}")
                
                # Exponential backoff
                time.sleep(min(10 * error_count, 60))
                
                # Attempt reconnection
                if error_count < max_errors:
                    reconnection_count += 1
                    reconnect_event = {
                        'type': EventType.RECONNECTION.value,
                        'priority': EventPriority.INFO.value,
                        'stream_id': stream_id,
                        'reconnection_count': reconnection_count,
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    }
                    yield format_sse_event(reconnect_event, event_id=f"reconnect-{reconnection_count}")
                
    except Exception as e:
        logger.error(f"Fatal error in SSE stream: {e}")
        # Send final error message with recovery instructions
        fatal_data = {
            'type': EventType.FATAL_ERROR.value,
            'priority': EventPriority.CRITICAL.value,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'recovery_action': 'manual_reconnection_required',
            'stream_id': stream_id,
            'support_message': 'Please refresh the page or contact support if issue persists'
        }
        yield format_sse_event(fatal_data, event_id=f"fatal-{stream_id}")
    
    finally:
        # Cleanup progress tracking
        if analysis_id:
            with _progress_lock:
                _analysis_progress.pop(analysis_id, None)


def _should_include_priority(event_priority: EventPriority, filter_priority: str) -> bool:
    """Check if event priority matches filter"""
    if filter_priority == 'all':
        return True
    
    priority_levels = {
        EventPriority.CRITICAL: 5,
        EventPriority.HIGH: 4,
        EventPriority.MEDIUM: 3,
        EventPriority.LOW: 2,
        EventPriority.INFO: 1
    }
    
    filter_mapping = {
        'critical': EventPriority.CRITICAL,
        'high': EventPriority.HIGH,
        'medium': EventPriority.MEDIUM,
        'low': EventPriority.LOW
    }
    
    filter_level = filter_mapping.get(filter_priority, EventPriority.MEDIUM)
    
    return priority_levels[event_priority] >= priority_levels[filter_level]


def _categorize_alert(description: str) -> str:
    """Categorize alert based on content"""
    description_lower = description.lower() if description else ''
    
    categories = {
        'security': ['security', 'threat', 'attack', 'breach'],
        'political': ['election', 'party', 'candidate', 'campaign'],
        'sentiment': ['sentiment', 'mood', 'emotion', 'opinion'],
        'trending': ['trending', 'viral', 'spike', 'surge'],
        'operational': ['system', 'performance', 'error', 'failure']
    }
    
    for category, keywords in categories.items():
        if any(keyword in description_lower for keyword in keywords):
            return category
    
    return 'general'


def _determine_intelligence_priority(intelligence: Dict[str, Any]) -> EventPriority:
    """Determine priority based on intelligence content"""
    if not intelligence:
        return EventPriority.LOW
    
    # Check for critical keywords
    items = intelligence.get('items', [])
    critical_keywords = ['emergency', 'urgent', 'critical', 'breaking']
    high_keywords = ['important', 'significant', 'major', 'key']
    
    for item in items:
        content = item.get('content', '').lower()
        if any(keyword in content for keyword in critical_keywords):
            return EventPriority.CRITICAL
        if any(keyword in content for keyword in high_keywords):
            return EventPriority.HIGH
    
    # Base on item count
    item_count = intelligence.get('new_posts_count', 0)
    if item_count > 10:
        return EventPriority.HIGH
    elif item_count > 5:
        return EventPriority.MEDIUM
    
    return EventPriority.LOW


def _check_analysis_progress(analysis_id: str) -> Optional[Dict[str, Any]]:
    """Check for analysis progress updates"""
    with _progress_lock:
        if analysis_id in _analysis_progress:
            progress = _analysis_progress[analysis_id]
            # Simulate progress (in real implementation, this would be driven by actual analysis)
            if progress.current_stage < progress.total_stages:
                if time.time() - progress.stage_start_time > 2:  # Advance every 2 seconds
                    progress_data = progress.advance_stage()
                    return {
                        'type': EventType.ANALYSIS_PROGRESS.value,
                        'priority': EventPriority.INFO.value,
                        'data': progress_data,
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    }
    return None


def send_analysis_progress(analysis_id: str, stage_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Send progress update for an ongoing analysis.
    
    Args:
        analysis_id: Unique analysis identifier
        stage_name: Optional custom stage name
        
    Returns:
        Progress data dictionary
    """
    with _progress_lock:
        if analysis_id not in _analysis_progress:
            _analysis_progress[analysis_id] = AnalysisProgress(analysis_id)
        
        progress = _analysis_progress[analysis_id]
        return progress.advance_stage(stage_name)


def complete_analysis(analysis_id: str) -> Dict[str, Any]:
    """
    Mark an analysis as complete.
    
    Args:
        analysis_id: Unique analysis identifier
        
    Returns:
        Completion data dictionary
    """
    with _progress_lock:
        if analysis_id in _analysis_progress:
            progress = _analysis_progress[analysis_id]
            return progress.complete()
        else:
            return {
                'analysis_id': analysis_id,
                'status': 'complete',
                'percentage': 100
            }


def _get_recent_alerts(ward: str, since: datetime, priority: str) -> List[Alert]:
    """Get recent alerts for ward with enhanced filtering."""
    try:
        query = Alert.query
        
        # Filter by ward (if not 'All')
        if ward.lower() != 'all':
            query = query.filter(Alert.ward.ilike(f'%{ward}%'))
        
        # Filter by timestamp
        if since:
            query = query.filter(Alert.created_at > since)
        
        # Enhanced priority filtering
        if priority == 'critical':
            query = query.filter(Alert.severity == 'Critical')
        elif priority == 'high':
            query = query.filter(Alert.severity.in_(['High', 'Critical']))
        elif priority == 'medium':
            query = query.filter(Alert.severity.in_(['Medium', 'High', 'Critical']))
        elif priority == 'low':
            pass  # Include all
        
        # Get recent alerts with limit
        alerts = query.order_by(Alert.created_at.desc()).limit(10).all()
        
        return alerts
        
    except Exception as e:
        logger.error(f"Error getting recent alerts: {e}")
        return []


def _get_recent_intelligence(ward: str, since: datetime) -> Optional[Dict[str, Any]]:
    """Get recent intelligence updates for ward with enhanced metadata."""
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
        
        # Process posts into enhanced intelligence format
        intelligence = {
            'new_posts_count': len(recent_posts),
            'summary': f"{len(recent_posts)} new intelligence items for {ward}",
            'ward': ward,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'items': []
        }
        
        # Aggregate emotions and drivers
        emotion_counts = {}
        driver_counts = {}
        
        for post in recent_posts:
            # Extract content
            content = (post.text or post.content or '')
            truncated_content = content[:200] + ('...' if len(content) > 200 else '')
            
            # Count emotions and drivers
            emotion = getattr(post, 'emotion', 'Unknown')
            if emotion:
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            drivers = getattr(post, 'drivers', [])
            for driver in drivers:
                driver_counts[driver] = driver_counts.get(driver, 0) + 1
            
            item = {
                'id': post.id,
                'content': truncated_content,
                'full_content_available': len(content) > 200,
                'emotion': emotion,
                'drivers': drivers,
                'city': getattr(post, 'city', ''),
                'party': getattr(post, 'party', None),
                'created_at': getattr(post, 'created_at', datetime.now()).isoformat() if hasattr(post, 'created_at') else None,
                'source': getattr(post, 'source', 'unknown')
            }
            intelligence['items'].append(item)
        
        # Add aggregate analysis
        intelligence['analysis'] = {
            'dominant_emotion': max(emotion_counts, key=emotion_counts.get) if emotion_counts else None,
            'emotion_distribution': emotion_counts,
            'top_drivers': sorted(driver_counts.items(), key=lambda x: x[1], reverse=True)[:3],
            'requires_attention': any(e in emotion_counts for e in ['anger', 'fear', 'disgust'])
        }
        
        return intelligence
        
    except Exception as e:
        logger.error(f"Error getting recent intelligence: {e}")
        return None
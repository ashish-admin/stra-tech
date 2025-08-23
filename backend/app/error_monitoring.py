"""
LokDarpan Backend Error Monitoring System
Handles frontend error reporting and system health tracking
"""

import json
import logging
from datetime import datetime, timezone
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
import redis
from typing import Dict, List, Any, Optional

# Create blueprint
error_bp = Blueprint('error_monitoring', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis connection for error storage (falls back to memory if Redis unavailable)
try:
    redis_client = redis.Redis.from_url(current_app.config.get('REDIS_URL', 'redis://localhost:6379/0'))
    redis_available = True
except:
    redis_client = None
    redis_available = False
    logger.warning("Redis unavailable, using in-memory error storage")

# In-memory storage fallback
error_storage = {
    'errors': deque(maxlen=1000),
    'component_health': {},
    'error_counts': defaultdict(int),
    'session_data': {}
}

class ErrorMonitoringService:
    """Service for handling error monitoring and system health tracking"""
    
    def __init__(self):
        self.redis_client = redis_client
        self.storage = error_storage
    
    def store_error_report(self, session_id: str, error_data: Dict[str, Any]) -> bool:
        """Store error report from frontend"""
        try:
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # Enrich error data with backend context
            enriched_data = {
                **error_data,
                'backend_timestamp': timestamp,
                'user_id': current_user.id if current_user.is_authenticated else None,
                'user_name': current_user.username if current_user.is_authenticated else None,
                'server_session': session_id
            }
            
            if self.redis_client:
                # Store in Redis
                key = f"lokdarpan:errors:{session_id}:{timestamp}"
                self.redis_client.setex(key, 86400, json.dumps(enriched_data))  # 24 hour TTL
                
                # Update aggregates
                self._update_redis_aggregates(error_data)
            else:
                # Store in memory
                self.storage['errors'].append(enriched_data)
                self._update_memory_aggregates(error_data)
            
            # Log critical errors immediately
            if self._is_critical_error(error_data):
                logger.error(f"CRITICAL ERROR - Session {session_id}: {error_data}")
                self._alert_critical_error(error_data)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to store error report: {e}")
            return False
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get current system health metrics"""
        try:
            if self.redis_client:
                return self._get_redis_health()
            else:
                return self._get_memory_health()
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def get_error_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get error summary for the last N hours"""
        try:
            if self.redis_client:
                return self._get_redis_error_summary(hours)
            else:
                return self._get_memory_error_summary(hours)
        except Exception as e:
            logger.error(f"Failed to get error summary: {e}")
            return {'error': str(e)}
    
    def _is_critical_error(self, error_data: Dict[str, Any]) -> bool:
        """Determine if error is critical and needs immediate attention"""
        critical_keywords = [
            'authentication', 'login', 'session', 'security', 
            'cors', 'network', 'timeout', 'emergency'
        ]
        
        message = error_data.get('message', '').lower()
        error_type = error_data.get('type', '').lower()
        
        return (
            error_type == 'emergency' or
            any(keyword in message for keyword in critical_keywords) or
            error_data.get('errors', [{}])[0].get('type') == 'emergency'
        )
    
    def _alert_critical_error(self, error_data: Dict[str, Any]):
        """Send alerts for critical errors"""
        # In production, this could send emails, Slack messages, etc.
        logger.critical(f"🚨 CRITICAL LOKDARPAN ERROR: {error_data}")
        
        # Future: Integration with alerting systems
        # - Email notifications
        # - Slack/Teams integration
        # - PagerDuty/OpsGenie alerts
    
    def _update_redis_aggregates(self, error_data: Dict[str, Any]):
        """Update Redis-based aggregates"""
        try:
            # Update error counts
            error_counts = error_data.get('errorCounts', {})
            for error_key, count in error_counts.items():
                self.redis_client.hincrby('lokdarpan:error_counts', error_key, count)
            
            # Update component health
            component_health = error_data.get('componentHealth', {})
            for component, health in component_health.items():
                health_key = f"lokdarpan:component_health:{component}"
                self.redis_client.hmset(health_key, health)
                self.redis_client.expire(health_key, 3600)  # 1 hour TTL
                
        except Exception as e:
            logger.error(f"Failed to update Redis aggregates: {e}")
    
    def _update_memory_aggregates(self, error_data: Dict[str, Any]):
        """Update memory-based aggregates"""
        try:
            # Update error counts
            error_counts = error_data.get('errorCounts', {})
            for error_key, count in error_counts.items():
                self.storage['error_counts'][error_key] += count
            
            # Update component health
            component_health = error_data.get('componentHealth', {})
            self.storage['component_health'].update(component_health)
            
        except Exception as e:
            logger.error(f"Failed to update memory aggregates: {e}")
    
    def _get_redis_health(self) -> Dict[str, Any]:
        """Get health metrics from Redis"""
        try:
            # Get component health
            component_keys = self.redis_client.keys('lokdarpan:component_health:*')
            total_components = len(component_keys)
            healthy_components = 0
            
            for key in component_keys:
                health_data = self.redis_client.hgetall(key)
                if health_data.get(b'status', b'').decode() == 'healthy':
                    healthy_components += 1
            
            # Get recent error count
            recent_errors = len(self.redis_client.keys('lokdarpan:errors:*'))
            
            return {
                'status': 'healthy' if total_components == 0 or healthy_components / total_components > 0.8 else 'degraded',
                'total_components': total_components,
                'healthy_components': healthy_components,
                'error_components': total_components - healthy_components,
                'recent_errors': recent_errors,
                'storage_type': 'redis',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get Redis health: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def _get_memory_health(self) -> Dict[str, Any]:
        """Get health metrics from memory storage"""
        try:
            component_health = self.storage['component_health']
            total_components = len(component_health)
            healthy_components = sum(1 for h in component_health.values() 
                                   if h.get('status') == 'healthy')
            
            return {
                'status': 'healthy' if total_components == 0 or healthy_components / total_components > 0.8 else 'degraded',
                'total_components': total_components,
                'healthy_components': healthy_components,
                'error_components': total_components - healthy_components,
                'recent_errors': len(self.storage['errors']),
                'storage_type': 'memory',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get memory health: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def _get_redis_error_summary(self, hours: int) -> Dict[str, Any]:
        """Get error summary from Redis"""
        try:
            error_counts = self.redis_client.hgetall('lokdarpan:error_counts')
            total_errors = sum(int(count) for count in error_counts.values())
            
            return {
                'total_errors': total_errors,
                'error_types': {k.decode(): int(v) for k, v in error_counts.items()},
                'time_window_hours': hours,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get Redis error summary: {e}")
            return {'error': str(e)}
    
    def _get_memory_error_summary(self, hours: int) -> Dict[str, Any]:
        """Get error summary from memory storage"""
        try:
            error_counts = dict(self.storage['error_counts'])
            total_errors = sum(error_counts.values())
            
            return {
                'total_errors': total_errors,
                'error_types': error_counts,
                'time_window_hours': hours,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get memory error summary: {e}")
            return {'error': str(e)}

# Initialize service
error_service = ErrorMonitoringService()

@error_bp.route('/api/v1/errors', methods=['POST'])
@login_required
def report_errors():
    """Endpoint for frontend error reporting"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        session_id = data.get('sessionId')
        if not session_id:
            return jsonify({'error': 'Session ID required'}), 400
        
        success = error_service.store_error_report(session_id, data)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Error report stored successfully',
                'session_id': session_id
            })
        else:
            return jsonify({'error': 'Failed to store error report'}), 500
            
    except Exception as e:
        logger.error(f"Error in report_errors endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@error_bp.route('/api/v1/system/health', methods=['GET'])
@login_required
def get_system_health():
    """Get system health metrics"""
    try:
        health = error_service.get_system_health()
        return jsonify(health)
    except Exception as e:
        logger.error(f"Error in get_system_health endpoint: {e}")
        return jsonify({'error': 'Failed to get system health'}), 500

@error_bp.route('/api/v1/errors/summary', methods=['GET'])
@login_required  
def get_error_summary():
    """Get error summary"""
    try:
        hours = int(request.args.get('hours', 24))
        summary = error_service.get_error_summary(hours)
        return jsonify(summary)
    except Exception as e:
        logger.error(f"Error in get_error_summary endpoint: {e}")
        return jsonify({'error': 'Failed to get error summary'}), 500

# Health check endpoint (no auth required)
@error_bp.route('/api/v1/monitoring/ping', methods=['GET'])
def monitoring_ping():
    """Simple health check for monitoring systems"""
    return jsonify({
        'status': 'ok',
        'service': 'lokdarpan-error-monitoring',
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

# Export the service for use in other modules
__all__ = ['error_bp', 'error_service', 'ErrorMonitoringService']
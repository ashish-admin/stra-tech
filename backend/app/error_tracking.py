"""
LokDarpan Centralized Error Tracking and Logging System

This module provides comprehensive error tracking, categorization, and analysis
for the LokDarpan political intelligence platform. It integrates with the existing
Flask architecture and provides real-time error monitoring capabilities.
"""

import os
import json
import time
import traceback
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
from contextlib import contextmanager
from functools import wraps

import redis
from flask import request, g, current_app
from sqlalchemy import Column, String, DateTime, Integer, Text, JSON, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .models import db
from .security import AuditLogger

# Error severity levels
class ErrorSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high" 
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

# Error categories for political intelligence context
class ErrorCategory(Enum):
    # Core system errors
    DATABASE = "database"
    API = "api"
    AUTHENTICATION = "authentication"
    SECURITY = "security"
    PERFORMANCE = "performance"
    
    # Political intelligence specific
    AI_ANALYSIS = "ai_analysis"
    DATA_INGESTION = "data_ingestion"
    STRATEGIST = "strategist"
    SSE_STREAMING = "sse_streaming"
    CACHE = "cache"
    ELECTORAL = "electoral"
    
    # Frontend/UI specific
    UI_COMPONENT = "ui_component"
    DATA_VISUALIZATION = "data_visualization"
    MAP_RENDERING = "map_rendering"
    ROUTING = "routing"
    STATE_MANAGEMENT = "state_management"
    MEMORY_LEAK = "memory_leak"
    ACCESSIBILITY = "accessibility"
    
    # Infrastructure
    CELERY = "celery"
    REDIS = "redis"
    EXTERNAL_API = "external_api"
    UNKNOWN = "unknown"

@dataclass
class ErrorMetric:
    """Structured error metric for tracking and analysis."""
    id: str
    timestamp: datetime
    severity: ErrorSeverity
    category: ErrorCategory
    component: str
    message: str
    stack_trace: Optional[str]
    user_id: Optional[str]
    session_id: Optional[str]
    request_id: Optional[str]
    endpoint: Optional[str]
    method: Optional[str]
    status_code: Optional[int]
    response_time: Optional[float]
    user_agent: Optional[str]
    ip_address: Optional[str]
    context: Dict[str, Any]
    resolved: bool = False
    resolution_notes: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['severity'] = self.severity.value
        data['category'] = self.category.value
        return data

class ErrorTracker:
    """
    Centralized error tracking system for LokDarpan.
    
    Features:
    - Real-time error capture and categorization
    - Error pattern detection and alerting
    - Performance impact analysis
    - Automated resolution suggestions
    - Integration with existing security logging
    """
    
    def __init__(self, app=None, redis_client=None):
        self.app = app
        self.redis_client = redis_client or self._get_redis_client()
        self.error_buffer = deque(maxlen=1000)  # In-memory buffer
        self.error_patterns = {}
        self.alert_thresholds = {
            ErrorSeverity.CRITICAL: 1,  # Alert immediately
            ErrorSeverity.HIGH: 3,      # Alert after 3 occurrences
            ErrorSeverity.MEDIUM: 10,   # Alert after 10 occurrences
            ErrorSeverity.LOW: 50       # Alert after 50 occurrences
        }
        
        # Performance monitoring
        self.error_rate_windows = {
            '1min': deque(maxlen=60),
            '5min': deque(maxlen=300), 
            '15min': deque(maxlen=900),
            '1hour': deque(maxlen=3600)
        }
        
        if app:
            self.init_app(app)
    
    def _get_redis_client(self):
        """Get Redis client for caching error data."""
        try:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            return redis.from_url(redis_url, decode_responses=True)
        except Exception as e:
            logging.warning(f"Could not connect to Redis: {e}")
            return None
    
    def init_app(self, app):
        """Initialize error tracking with Flask app."""
        self.app = app
        
        # Register error handlers
        app.errorhandler(Exception)(self.handle_exception)
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        
        # Set up periodic tasks
        app.teardown_appcontext(self.cleanup_context)
        
        # Configure logging
        self._setup_logging()
    
    def _setup_logging(self):
        """Configure structured logging for error tracking."""
        log_level = self.app.config.get('LOG_LEVEL', 'INFO')
        log_format = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        
        # Create error tracking logger
        self.logger = logging.getLogger('lokdarpan.error_tracker')
        self.logger.setLevel(getattr(logging, log_level))
        
        # File handler for persistent error logs
        if not self.app.debug:
            log_file = self.app.config.get('ERROR_LOG_FILE', '/var/log/lokdarpan/errors.log')
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            
            handler = logging.FileHandler(log_file)
            handler.setFormatter(logging.Formatter(log_format))
            self.logger.addHandler(handler)
    
    def before_request(self):
        """Set up request context for error tracking."""
        g.start_time = time.time()
        g.request_id = self._generate_request_id()
        
        # Track request start for performance monitoring
        if hasattr(g, 'start_time'):
            self.record_performance_metric('request_start', {
                'endpoint': request.endpoint,
                'method': request.method,
                'timestamp': g.start_time
            })
    
    def after_request(self, response):
        """Track request completion and performance metrics."""
        if hasattr(g, 'start_time'):
            response_time = time.time() - g.start_time
            response.headers['X-Response-Time'] = str(int(response_time * 1000))
            
            # Record performance metrics
            self.record_performance_metric('request_complete', {
                'endpoint': request.endpoint,
                'method': request.method,
                'status_code': response.status_code,
                'response_time': response_time,
                'request_id': getattr(g, 'request_id', None)
            })
            
            # Check for performance issues
            if response_time > 5.0:  # Slow request threshold
                self.track_error(
                    ErrorSeverity.MEDIUM,
                    ErrorCategory.PERFORMANCE,
                    'slow_request',
                    f"Slow request: {response_time:.2f}s",
                    context={
                        'endpoint': request.endpoint,
                        'method': request.method,
                        'response_time': response_time
                    }
                )
        
        return response
    
    def cleanup_context(self, exception):
        """Clean up request context on teardown."""
        if exception:
            # Log any unhandled exceptions during cleanup
            self.track_error(
                ErrorSeverity.HIGH,
                ErrorCategory.UNKNOWN,
                'context_cleanup',
                f"Exception during context cleanup: {str(exception)}",
                exception=exception
            )
    
    def handle_exception(self, exception):
        """Global exception handler for Flask app."""
        severity = self._classify_exception_severity(exception)
        category = self._classify_exception_category(exception)
        
        self.track_error(
            severity,
            category,
            'unhandled_exception',
            str(exception),
            exception=exception
        )
        
        # Re-raise the exception to let Flask handle it normally
        raise exception
    
    def track_error(
        self,
        severity: ErrorSeverity,
        category: ErrorCategory,
        component: str,
        message: str,
        exception: Optional[Exception] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Track an error occurrence with full context.
        
        Args:
            severity: Error severity level
            category: Error category for classification
            component: Component/module where error occurred
            message: Error message
            exception: Exception object if available
            context: Additional context data
            
        Returns:
            Error ID for tracking
        """
        error_id = self._generate_error_id(component, message)
        now = datetime.now(timezone.utc)
        
        # Extract request context if available
        request_context = self._extract_request_context()
        
        # Build error metric
        error_metric = ErrorMetric(
            id=error_id,
            timestamp=now,
            severity=severity,
            category=category,
            component=component,
            message=message,
            stack_trace=self._format_exception(exception) if exception else None,
            user_id=request_context.get('user_id'),
            session_id=request_context.get('session_id'),
            request_id=request_context.get('request_id'),
            endpoint=request_context.get('endpoint'),
            method=request_context.get('method'),
            status_code=request_context.get('status_code'),
            response_time=request_context.get('response_time'),
            user_agent=request_context.get('user_agent'),
            ip_address=request_context.get('ip_address'),
            context=context or {}
        )
        
        # Store error metric
        self._store_error_metric(error_metric)
        
        # Update error patterns
        self._update_error_patterns(error_metric)
        
        # Check alert thresholds
        self._check_alert_thresholds(error_metric)
        
        # Update performance monitoring
        self._update_error_rate_monitoring(error_metric)
        
        # Log to structured logger
        self.logger.log(
            self._severity_to_log_level(severity),
            f"[{category.value}:{component}] {message}",
            extra={
                'error_id': error_id,
                'category': category.value,
                'component': component,
                'context': context or {},
                'request_id': request_context.get('request_id')
            }
        )
        
        # Integrate with existing audit logging
        severity_level_map = {
            ErrorSeverity.CRITICAL: 'CRITICAL',
            ErrorSeverity.HIGH: 'ERROR',
            ErrorSeverity.MEDIUM: 'WARNING',
            ErrorSeverity.LOW: 'INFO',
            ErrorSeverity.INFO: 'INFO'
        }
        AuditLogger.log_security_event(
            'error_tracked',
            {
                'error_id': error_id,
                'severity': severity.value,
                'category': category.value,
                'component': component
            },
            severity_level_map.get(severity, 'WARNING')
        )
        
        return error_id
    
    def get_error_metrics(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        severity: Optional[ErrorSeverity] = None,
        category: Optional[ErrorCategory] = None,
        limit: int = 100
    ) -> List[ErrorMetric]:
        """Retrieve error metrics with filtering."""
        # Implementation would query database or Redis
        # For now, return from in-memory buffer
        metrics = list(self.error_buffer)
        
        # Apply filters
        if start_time:
            metrics = [m for m in metrics if m.timestamp >= start_time]
        if end_time:
            metrics = [m for m in metrics if m.timestamp <= end_time]
        if severity:
            metrics = [m for m in metrics if m.severity == severity]
        if category:
            metrics = [m for m in metrics if m.category == category]
        
        return metrics[:limit]
    
    def get_error_summary(self, time_window: int = 3600) -> Dict[str, Any]:
        """Get error summary for dashboard display."""
        cutoff_time = datetime.now(timezone.utc) - timedelta(seconds=time_window)
        recent_errors = [
            m for m in self.error_buffer 
            if m.timestamp >= cutoff_time
        ]
        
        # Group by severity
        by_severity = defaultdict(int)
        by_category = defaultdict(int)
        by_component = defaultdict(int)
        
        for error in recent_errors:
            by_severity[error.severity.value] += 1
            by_category[error.category.value] += 1
            by_component[error.component] += 1
        
        return {
            'total_errors': len(recent_errors),
            'by_severity': dict(by_severity),
            'by_category': dict(by_category),
            'by_component': dict(by_component),
            'error_rate': len(recent_errors) / (time_window / 60),  # errors per minute
            'top_components': sorted(by_component.items(), key=lambda x: x[1], reverse=True)[:5],
            'alert_status': self._get_alert_status()
        }
    
    def get_error_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Generate error trend analysis."""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        recent_errors = [
            m for m in self.error_buffer 
            if m.timestamp >= cutoff_time
        ]
        
        # Group by hour
        hourly_counts = defaultdict(int)
        for error in recent_errors:
            hour_key = error.timestamp.replace(minute=0, second=0, microsecond=0)
            hourly_counts[hour_key] += 1
        
        # Calculate trend
        timestamps = sorted(hourly_counts.keys())
        if len(timestamps) >= 2:
            recent_rate = sum(hourly_counts[ts] for ts in timestamps[-3:]) / 3
            earlier_rate = sum(hourly_counts[ts] for ts in timestamps[:3]) / 3
            trend = 'increasing' if recent_rate > earlier_rate * 1.2 else 'decreasing' if recent_rate < earlier_rate * 0.8 else 'stable'
        else:
            trend = 'insufficient_data'
        
        return {
            'hourly_counts': {ts.isoformat(): count for ts, count in hourly_counts.items()},
            'trend': trend,
            'peak_hour': max(hourly_counts.items(), key=lambda x: x[1])[0].isoformat() if hourly_counts else None,
            'total_errors': len(recent_errors)
        }
    
    def resolve_error(self, error_id: str, notes: str = "") -> bool:
        """Mark an error as resolved with notes."""
        # In a full implementation, this would update the database
        for error in self.error_buffer:
            if error.id == error_id:
                error.resolved = True
                error.resolution_notes = notes
                
                self.logger.info(f"Error {error_id} marked as resolved: {notes}")
                return True
        
        return False
    
    def _store_error_metric(self, metric: ErrorMetric):
        """Store error metric in persistent storage."""
        # Add to in-memory buffer
        self.error_buffer.append(metric)
        
        # Store in Redis for fast access
        if self.redis_client:
            try:
                key = f"lokdarpan:errors:{metric.id}"
                self.redis_client.setex(key, 86400, json.dumps(metric.to_dict()))
                
                # Add to time-based index
                time_key = f"lokdarpan:errors:by_time:{metric.timestamp.strftime('%Y-%m-%d:%H')}"
                self.redis_client.sadd(time_key, metric.id)
                self.redis_client.expire(time_key, 86400)
            except Exception as e:
                self.logger.warning(f"Failed to store error in Redis: {e}")
        
        # TODO: Store in PostgreSQL for long-term analysis
        # This would use the existing db session
    
    def _update_error_patterns(self, metric: ErrorMetric):
        """Update error pattern detection."""
        pattern_key = f"{metric.category.value}:{metric.component}:{metric.message[:50]}"
        
        if pattern_key not in self.error_patterns:
            self.error_patterns[pattern_key] = {
                'count': 0,
                'first_seen': metric.timestamp,
                'last_seen': metric.timestamp,
                'severity': metric.severity
            }
        
        pattern = self.error_patterns[pattern_key]
        pattern['count'] += 1
        pattern['last_seen'] = metric.timestamp
        pattern['severity'] = max(pattern['severity'], metric.severity, key=lambda s: ['info', 'low', 'medium', 'high', 'critical'].index(s.value))
    
    def _check_alert_thresholds(self, metric: ErrorMetric):
        """Check if error should trigger an alert."""
        threshold = self.alert_thresholds.get(metric.severity, 100)
        
        # Count recent errors of same severity
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        recent_count = sum(
            1 for m in self.error_buffer
            if m.timestamp >= cutoff_time and m.severity == metric.severity
        )
        
        if recent_count >= threshold:
            self._trigger_alert(metric, recent_count)
    
    def _trigger_alert(self, metric: ErrorMetric, count: int):
        """Trigger an alert for critical error patterns."""
        alert_data = {
            'alert_type': 'error_threshold_exceeded',
            'severity': metric.severity.value,
            'category': metric.category.value,
            'component': metric.component,
            'count': count,
            'message': f"Error threshold exceeded: {count} {metric.severity.value} errors in 5 minutes"
        }
        
        # Log alert
        self.logger.error(f"ALERT: {alert_data['message']}", extra=alert_data)
        
        # Store alert in Redis for dashboard
        if self.redis_client:
            try:
                alert_key = f"lokdarpan:alerts:{int(time.time())}"
                self.redis_client.setex(alert_key, 3600, json.dumps(alert_data))
            except Exception as e:
                self.logger.warning(f"Failed to store alert in Redis: {e}")
    
    def _update_error_rate_monitoring(self, metric: ErrorMetric):
        """Update error rate monitoring windows."""
        current_time = int(time.time())
        
        for window_name, window_data in self.error_rate_windows.items():
            window_data.append(current_time)
    
    def _extract_request_context(self) -> Dict[str, Any]:
        """Extract request context for error tracking."""
        context = {}
        
        try:
            if request:
                context.update({
                    'endpoint': request.endpoint,
                    'method': request.method,
                    'url': request.url,
                    'user_agent': request.headers.get('User-Agent'),
                    'ip_address': request.remote_addr,
                    'request_id': getattr(g, 'request_id', None)
                })
                
                # Extract user context if available
                if hasattr(g, 'current_user') and g.current_user:
                    context['user_id'] = str(g.current_user.id)
                
                # Extract session info
                if hasattr(request, 'session'):
                    context['session_id'] = request.session.get('_id')
                
                # Extract timing info
                if hasattr(g, 'start_time'):
                    context['response_time'] = time.time() - g.start_time
                    
        except RuntimeError:
            # Outside request context
            pass
            
        return context
    
    def _generate_error_id(self, component: str, message: str) -> str:
        """Generate unique error ID for tracking."""
        content = f"{component}:{message}:{int(time.time())}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def _generate_request_id(self) -> str:
        """Generate unique request ID."""
        return f"req_{int(time.time())}_{os.urandom(4).hex()}"
    
    def _format_exception(self, exception: Exception) -> str:
        """Format exception with full stack trace."""
        return traceback.format_exc()
    
    def _classify_exception_severity(self, exception: Exception) -> ErrorSeverity:
        """Classify exception severity based on type and context."""
        # Database errors are typically high severity
        if 'database' in str(exception).lower() or 'sql' in str(exception).lower():
            return ErrorSeverity.HIGH
        
        # Security-related errors are critical
        if any(keyword in str(exception).lower() for keyword in ['security', 'authentication', 'authorization', 'csrf']):
            return ErrorSeverity.CRITICAL
        
        # AI/ML errors are medium severity
        if any(keyword in str(exception).lower() for keyword in ['ai', 'model', 'analysis', 'strategist']):
            return ErrorSeverity.MEDIUM
        
        # Default to medium severity for unknown exceptions
        return ErrorSeverity.MEDIUM
    
    def _classify_exception_category(self, exception: Exception) -> ErrorCategory:
        """Classify exception into appropriate category."""
        exception_str = str(exception).lower()
        
        if any(keyword in exception_str for keyword in ['database', 'sql', 'connection']):
            return ErrorCategory.DATABASE
        
        if any(keyword in exception_str for keyword in ['auth', 'login', 'permission']):
            return ErrorCategory.AUTHENTICATION
        
        if any(keyword in exception_str for keyword in ['security', 'csrf', 'xss']):
            return ErrorCategory.SECURITY
        
        if any(keyword in exception_str for keyword in ['ai', 'model', 'analysis']):
            return ErrorCategory.AI_ANALYSIS
        
        if any(keyword in exception_str for keyword in ['strategist', 'political']):
            return ErrorCategory.STRATEGIST
        
        if any(keyword in exception_str for keyword in ['redis', 'cache']):
            return ErrorCategory.CACHE
        
        if any(keyword in exception_str for keyword in ['celery', 'task', 'worker']):
            return ErrorCategory.CELERY
        
        return ErrorCategory.UNKNOWN
    
    def _severity_to_log_level(self, severity: ErrorSeverity) -> int:
        """Convert error severity to Python logging level."""
        mapping = {
            ErrorSeverity.CRITICAL: logging.CRITICAL,
            ErrorSeverity.HIGH: logging.ERROR,
            ErrorSeverity.MEDIUM: logging.WARNING,
            ErrorSeverity.LOW: logging.INFO,
            ErrorSeverity.INFO: logging.DEBUG
        }
        return mapping.get(severity, logging.WARNING)
    
    def _get_alert_status(self) -> str:
        """Get current alert status for dashboard."""
        # Check recent error rates
        now = datetime.now(timezone.utc)
        last_hour = now - timedelta(hours=1)
        
        recent_errors = [
            m for m in self.error_buffer
            if m.timestamp >= last_hour
        ]
        
        critical_count = sum(1 for e in recent_errors if e.severity == ErrorSeverity.CRITICAL)
        high_count = sum(1 for e in recent_errors if e.severity == ErrorSeverity.HIGH)
        
        if critical_count > 0:
            return 'critical'
        elif high_count > 5:
            return 'warning'
        elif len(recent_errors) > 50:
            return 'elevated'
        else:
            return 'normal'
    
    def record_performance_metric(self, metric_type: str, data: Dict[str, Any]):
        """Record performance-related metrics."""
        if self.redis_client:
            try:
                key = f"lokdarpan:performance:{metric_type}:{int(time.time())}"
                self.redis_client.setex(key, 3600, json.dumps(data))
            except Exception as e:
                self.logger.warning(f"Failed to record performance metric: {e}")

# Decorator for tracking function errors
def track_errors(
    component: str,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.UNKNOWN
):
    """
    Decorator to automatically track errors in functions.
    
    Usage:
        @track_errors('user_auth', ErrorSeverity.HIGH, ErrorCategory.AUTHENTICATION)
        def login_user(username, password):
            # Function implementation
            pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Get error tracker from current app
                if current_app and hasattr(current_app, 'error_tracker'):
                    current_app.error_tracker.track_error(
                        severity,
                        category,
                        component,
                        f"Error in {func.__name__}: {str(e)}",
                        exception=e,
                        context={
                            'function': func.__name__,
                            'args_count': len(args),
                            'kwargs_keys': list(kwargs.keys())
                        }
                    )
                raise
        return wrapper
    return decorator

# Context manager for tracking errors in code blocks
@contextmanager
def error_context(
    component: str,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context: Optional[Dict[str, Any]] = None
):
    """
    Context manager for tracking errors in code blocks.
    
    Usage:
        with error_context('data_processing', ErrorSeverity.HIGH, ErrorCategory.DATA_INGESTION):
            # Code that might raise errors
            process_data()
    """
    try:
        yield
    except Exception as e:
        if current_app and hasattr(current_app, 'error_tracker'):
            current_app.error_tracker.track_error(
                severity,
                category,
                component,
                str(e),
                exception=e,
                context=context
            )
        raise

# Create global error tracker instance
error_tracker = ErrorTracker()

def init_error_tracking(app):
    """Initialize error tracking for Flask app."""
    global error_tracker
    error_tracker.init_app(app)
    app.error_tracker = error_tracker
    return error_tracker
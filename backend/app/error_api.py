"""
LokDarpan Error Tracking API Endpoints

RESTful API endpoints for error tracking, analysis, and reporting.
Integrates with the existing error tracking system and provides
comprehensive error management capabilities.

Features:
- Error reporting from frontend and backend
- Error pattern analysis and trends
- Real-time error monitoring
- Error resolution tracking
- Integration with health monitoring
- Automated alert generation

Author: LokDarpan Team
Version: 1.0.0
"""

import os
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.exceptions import BadRequest, NotFound, InternalServerError
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.exc import SQLAlchemyError

from .models import db
from .error_tracking import (
    error_tracker, ErrorSeverity, ErrorCategory, ErrorMetric, 
    track_errors, error_context
)
from .security import require_auth, AuditLogger

# Create blueprint
error_api = Blueprint('error_api', __name__, url_prefix='/api/v1/errors')

# Set up logging
logger = logging.getLogger(__name__)

@error_api.before_request
def before_request():
    """Set up request context for error tracking."""
    if not hasattr(g, 'start_time'):
        g.start_time = time.time()  # Use time.time() for consistent float arithmetic
    g.request_id = request.headers.get('X-Request-ID', 'unknown')

@error_api.after_request
def after_request(response):
    """Log API request completion."""
    try:
        duration = (datetime.utcnow() - g.start_time).total_seconds()
        
        # Log API access
        logger.info(
            f"Error API: {request.method} {request.path} - "
            f"Status: {response.status_code}, Duration: {duration:.3f}s"
        )
        
        # Track slow requests
        if duration > 2.0:
            current_app.error_tracker.track_error(
                ErrorSeverity.MEDIUM,
                ErrorCategory.PERFORMANCE,
                'error_api',
                f"Slow API request: {request.path}",
                context={
                    'method': request.method,
                    'path': request.path,
                    'duration': duration,
                    'status_code': response.status_code
                }
            )
        
    except Exception as e:
        logger.error(f"Error in after_request: {e}")
    
    return response

@error_api.errorhandler(Exception)
def handle_error_api_exception(error):
    """Handle API-specific errors."""
    error_id = current_app.error_tracker.track_error(
        ErrorSeverity.HIGH,
        ErrorCategory.API,
        'error_api',
        f"API endpoint error: {str(error)}",
        exception=error,
        context={
            'endpoint': request.endpoint,
            'method': request.method,
            'path': request.path
        }
    )
    
    if isinstance(error, BadRequest):
        return jsonify({
            'error': 'Bad Request',
            'message': str(error),
            'error_id': error_id
        }), 400
    elif isinstance(error, NotFound):
        return jsonify({
            'error': 'Not Found',
            'message': str(error),
            'error_id': error_id
        }), 404
    else:
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'error_id': error_id
        }), 500

# Frontend Error Reporting Endpoints

@error_api.route('/report', methods=['POST'])
def report_errors():
    """
    Report errors from frontend or other sources.
    
    Expected payload:
    {
        "errors": [
            {
                "severity": "high",
                "category": "ui_component",
                "component": "Dashboard",
                "message": "Component failed to render",
                "stack": "Error stack trace...",
                "context": { "additional": "context" }
            }
        ],
        "sessionId": "session_id",
        "timestamp": "2024-01-01T12:00:00Z"
    }
    """
    try:
        if not request.is_json:
            raise BadRequest("Request must be JSON")
        
        data = request.get_json()
        
        if not data or 'errors' not in data:
            raise BadRequest("Missing 'errors' field in request")
        
        errors = data['errors']
        session_id = data.get('sessionId')
        
        if not isinstance(errors, list):
            raise BadRequest("'errors' must be an array")
        
        processed_errors = []
        
        for error_data in errors:
            try:
                # Validate required fields
                if not isinstance(error_data, dict):
                    continue
                
                severity_str = error_data.get('severity', 'medium').lower()
                category_str = error_data.get('category', 'unknown').lower()
                component = error_data.get('component', 'unknown')
                message = error_data.get('message', 'No message provided')
                
                # Map severity
                severity_map = {
                    'critical': ErrorSeverity.CRITICAL,
                    'high': ErrorSeverity.HIGH,
                    'medium': ErrorSeverity.MEDIUM,
                    'low': ErrorSeverity.LOW,
                    'info': ErrorSeverity.INFO
                }
                severity = severity_map.get(severity_str, ErrorSeverity.MEDIUM)
                
                # Map category
                category_map = {
                    'ui_component': ErrorCategory.UI_COMPONENT,
                    'api': ErrorCategory.API,
                    'authentication': ErrorCategory.AUTHENTICATION,
                    'security': ErrorCategory.SECURITY,
                    'performance': ErrorCategory.PERFORMANCE,
                    'data_visualization': ErrorCategory.DATA_VISUALIZATION,
                    'map_rendering': ErrorCategory.MAP_RENDERING,
                    'strategist': ErrorCategory.STRATEGIST,
                    'sse_streaming': ErrorCategory.SSE_STREAMING,
                    'cache': ErrorCategory.CACHE,
                    'electoral_data': ErrorCategory.ELECTORAL,
                    'routing': ErrorCategory.ROUTING,
                    'state_management': ErrorCategory.STATE_MANAGEMENT,
                    'memory_leak': ErrorCategory.MEMORY_LEAK,
                    'accessibility': ErrorCategory.ACCESSIBILITY,
                    'unknown': ErrorCategory.UNKNOWN
                }
                category = category_map.get(category_str, ErrorCategory.UNKNOWN)
                
                # Build context
                context = error_data.get('context', {})
                if session_id:
                    context['session_id'] = session_id
                
                # Add frontend-specific context
                context.update({
                    'source': 'frontend',
                    'user_agent': request.headers.get('User-Agent'),
                    'referer': request.headers.get('Referer'),
                    'stack_trace': error_data.get('stack'),
                    'url': error_data.get('url'),
                    'timestamp': error_data.get('timestamp')
                })
                
                # Track the error
                error_id = current_app.error_tracker.track_error(
                    severity=severity,
                    category=category,
                    component=component,
                    message=message,
                    context=context
                )
                
                processed_errors.append({
                    'error_id': error_id,
                    'severity': severity.value,
                    'category': category.value,
                    'component': component,
                    'message': message
                })
                
            except Exception as e:
                logger.error(f"Error processing individual error report: {e}")
                continue
        
        # Log successful error report
        AuditLogger.log_security_event(
            'frontend_errors_reported',
            {
                'error_count': len(processed_errors),
                'session_id': session_id,
                'source_ip': request.remote_addr
            }
        )
        
        return jsonify({
            'status': 'success',
            'processed': len(processed_errors),
            'errors': processed_errors
        }), 200
        
    except BadRequest as e:
        raise e
    except Exception as e:
        logger.error(f"Error in report_errors: {e}")
        raise InternalServerError("Failed to process error report")

@error_api.route('/frontend', methods=['GET'])
def get_frontend_errors():
    """
    Get recent frontend errors for analysis.
    
    Query parameters:
    - limit: Number of errors to return (default: 50, max: 500)
    - severity: Filter by severity level
    - category: Filter by error category
    - since: ISO timestamp to filter errors since
    - component: Filter by component name
    """
    try:
        # Parse query parameters
        limit = min(int(request.args.get('limit', 50)), 500)
        severity_filter = request.args.get('severity')
        category_filter = request.args.get('category')
        since_str = request.args.get('since')
        component_filter = request.args.get('component')
        
        # Get errors from error tracker
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=24)  # Default to last 24 hours
        
        if since_str:
            try:
                start_time = datetime.fromisoformat(since_str.replace('Z', '+00:00')).replace(tzinfo=None)
            except ValueError:
                raise BadRequest("Invalid 'since' timestamp format")
        
        # Get errors from tracker
        error_metrics = current_app.error_tracker.get_error_metrics(
            start_time=start_time,
            end_time=end_time,
            severity=ErrorSeverity(severity_filter) if severity_filter else None,
            category=ErrorCategory(category_filter) if category_filter else None,
            limit=limit
        )
        
        # Filter frontend errors and format response
        frontend_errors = []
        for metric in error_metrics:
            # Only include frontend errors or errors without source specified
            if (hasattr(metric, 'context') and 
                isinstance(metric.context, dict) and 
                metric.context.get('source') == 'frontend'):
                
                # Apply component filter if specified
                if component_filter and metric.component != component_filter:
                    continue
                
                frontend_errors.append({
                    'id': metric.id,
                    'timestamp': metric.timestamp.isoformat(),
                    'severity': metric.severity.value,
                    'category': metric.category.value,
                    'component': metric.component,
                    'message': metric.message,
                    'stack_trace': metric.stack_trace,
                    'context': metric.context,
                    'resolved': metric.resolved
                })
        
        return jsonify({
            'status': 'success',
            'errors': frontend_errors,
            'total': len(frontend_errors),
            'query': {
                'limit': limit,
                'severity': severity_filter,
                'category': category_filter,
                'since': start_time.isoformat(),
                'component': component_filter
            }
        }), 200
        
    except BadRequest as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_frontend_errors: {e}")
        raise InternalServerError("Failed to retrieve frontend errors")

# Error Analysis and Reporting Endpoints

@error_api.route('/summary', methods=['GET'])
@require_auth
def get_error_summary():
    """
    Get error summary for dashboard display.
    
    Query parameters:
    - window: Time window in minutes (default: 60, max: 10080 for 7 days)
    """
    try:
        window_minutes = min(int(request.args.get('window', 60)), 10080)
        
        # Get error summary from tracker
        summary = current_app.error_tracker.get_error_summary(window_minutes * 60)
        
        return jsonify({
            'status': 'success',
            'summary': summary,
            'window_minutes': window_minutes
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_error_summary: {e}")
        raise InternalServerError("Failed to retrieve error summary")

@error_api.route('/trends', methods=['GET'])
@require_auth
def get_error_trends():
    """
    Get error trends analysis.
    
    Query parameters:
    - hours: Number of hours to analyze (default: 24, max: 168 for 7 days)
    """
    try:
        hours = min(int(request.args.get('hours', 24)), 168)
        
        # Get error trends from tracker
        trends = current_app.error_tracker.get_error_trends(hours)
        
        return jsonify({
            'status': 'success',
            'trends': trends,
            'analysis_hours': hours
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_error_trends: {e}")
        raise InternalServerError("Failed to retrieve error trends")

@error_api.route('/patterns', methods=['GET'])
@require_auth
def get_error_patterns():
    """
    Get detected error patterns with ML analysis.
    
    This endpoint would integrate with the error analysis suite
    for advanced pattern detection.
    """
    try:
        # Import and use error analysis suite
        try:
            import sys
            import os
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts'))
            from error_analysis_suite import ErrorAnalyzer
            
            # Initialize analyzer
            analyzer = ErrorAnalyzer()
            
            # Run analysis
            analysis_result = analyzer.run_comprehensive_analysis()
            
            # Format response
            patterns_data = {
                'timestamp': analysis_result.timestamp.isoformat(),
                'total_errors': analysis_result.total_errors,
                'patterns_detected': analysis_result.patterns_detected,
                'critical_patterns': analysis_result.critical_patterns,
                'new_patterns': analysis_result.new_patterns,
                'trend_analysis': analysis_result.trend_analysis,
                'recommendations': analysis_result.recommendations,
                'alert_conditions': analysis_result.alert_conditions
            }
            
            return jsonify({
                'status': 'success',
                'patterns': patterns_data
            }), 200
            
        except ImportError:
            # Fallback to basic pattern detection from error tracker
            logger.warning("Error analysis suite not available, using basic patterns")
            
            # Get basic patterns from error tracker
            error_patterns = getattr(current_app.error_tracker, 'error_patterns', {})
            
            basic_patterns = []
            for pattern_key, pattern_data in error_patterns.items():
                basic_patterns.append({
                    'pattern_key': pattern_key,
                    'count': pattern_data.get('count', 0),
                    'first_seen': pattern_data.get('first_seen', datetime.utcnow()).isoformat(),
                    'last_seen': pattern_data.get('last_seen', datetime.utcnow()).isoformat(),
                    'severity': pattern_data.get('severity', 'medium')
                })
            
            return jsonify({
                'status': 'success',
                'patterns': {
                    'basic_patterns': basic_patterns,
                    'analysis_available': False
                }
            }), 200
            
    except Exception as e:
        logger.error(f"Error in get_error_patterns: {e}")
        raise InternalServerError("Failed to retrieve error patterns")

# Error Management Endpoints

@error_api.route('/<error_id>/resolve', methods=['POST'])
@require_auth
def resolve_error(error_id):
    """
    Mark an error as resolved with resolution notes.
    
    Expected payload:
    {
        "notes": "Resolution description",
        "fixed_in_version": "1.2.3",
        "resolution_type": "code_fix|config_change|known_issue"
    }
    """
    try:
        if not request.is_json:
            raise BadRequest("Request must be JSON")
        
        data = request.get_json()
        notes = data.get('notes', '')
        fixed_in_version = data.get('fixed_in_version')
        resolution_type = data.get('resolution_type')
        
        # Validate resolution type
        valid_resolution_types = ['code_fix', 'config_change', 'known_issue', 'duplicate', 'not_reproducible']
        if resolution_type and resolution_type not in valid_resolution_types:
            raise BadRequest(f"Invalid resolution_type. Must be one of: {valid_resolution_types}")
        
        # Build resolution notes
        resolution_notes = notes
        if fixed_in_version:
            resolution_notes += f" (Fixed in version: {fixed_in_version})"
        if resolution_type:
            resolution_notes += f" (Type: {resolution_type})"
        
        # Mark error as resolved in tracker
        success = current_app.error_tracker.resolve_error(error_id, resolution_notes)
        
        if not success:
            raise NotFound(f"Error {error_id} not found")
        
        # Log resolution
        AuditLogger.log_security_event(
            'error_resolved',
            {
                'error_id': error_id,
                'resolved_by': g.current_user.username if hasattr(g, 'current_user') else 'unknown',
                'resolution_type': resolution_type,
                'notes': notes
            }
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Error marked as resolved',
            'error_id': error_id,
            'resolved_at': datetime.utcnow().isoformat()
        }), 200
        
    except (BadRequest, NotFound) as e:
        raise e
    except Exception as e:
        logger.error(f"Error in resolve_error: {e}")
        raise InternalServerError("Failed to resolve error")

@error_api.route('/alerts', methods=['GET'])
@require_auth
def get_active_alerts():
    """
    Get active error alerts.
    
    Query parameters:
    - severity: Filter by alert severity (critical, high, medium, low)
    """
    try:
        severity_filter = request.args.get('severity')
        
        # Get alerts from Redis if available
        alerts = []
        
        if hasattr(current_app, 'error_tracker') and current_app.error_tracker.redis_client:
            try:
                # Get alert keys from Redis
                redis_client = current_app.error_tracker.redis_client
                alert_keys = redis_client.keys('lokdarpan:alerts:*')
                
                for key in alert_keys:
                    try:
                        alert_data = redis_client.get(key)
                        if alert_data:
                            alert = json.loads(alert_data)
                            
                            # Apply severity filter
                            if severity_filter and alert.get('severity') != severity_filter:
                                continue
                            
                            alerts.append(alert)
                    except Exception:
                        continue
                        
            except Exception as e:
                logger.error(f"Failed to get alerts from Redis: {e}")
        
        # Sort by timestamp (newest first)
        alerts.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return jsonify({
            'status': 'success',
            'alerts': alerts,
            'total': len(alerts),
            'severity_filter': severity_filter
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_active_alerts: {e}")
        raise InternalServerError("Failed to retrieve alerts")

@error_api.route('/health', methods=['GET'])
def get_error_tracking_health():
    """
    Get health status of error tracking system.
    """
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'components': {
                'error_tracker': 'unknown',
                'redis_connection': 'unknown',
                'database_connection': 'unknown'
            },
            'metrics': {
                'errors_in_buffer': 0,
                'patterns_detected': 0,
                'alerts_active': 0
            }
        }
        
        # Check error tracker
        if hasattr(current_app, 'error_tracker'):
            health_status['components']['error_tracker'] = 'healthy'
            
            # Get buffer size
            error_buffer = getattr(current_app.error_tracker, 'error_buffer', [])
            health_status['metrics']['errors_in_buffer'] = len(error_buffer)
            
            # Get pattern count
            error_patterns = getattr(current_app.error_tracker, 'error_patterns', {})
            health_status['metrics']['patterns_detected'] = len(error_patterns)
            
            # Check Redis connection
            redis_client = getattr(current_app.error_tracker, 'redis_client', None)
            if redis_client:
                try:
                    redis_client.ping()
                    health_status['components']['redis_connection'] = 'healthy'
                    
                    # Count alerts
                    alert_keys = redis_client.keys('lokdarpan:alerts:*')
                    health_status['metrics']['alerts_active'] = len(alert_keys)
                    
                except Exception:
                    health_status['components']['redis_connection'] = 'unhealthy'
                    health_status['status'] = 'degraded'
            else:
                health_status['components']['redis_connection'] = 'not_configured'
        else:
            health_status['components']['error_tracker'] = 'not_initialized'
            health_status['status'] = 'unhealthy'
        
        # Check database connection
        try:
            db.session.execute('SELECT 1')
            health_status['components']['database_connection'] = 'healthy'
        except Exception:
            health_status['components']['database_connection'] = 'unhealthy'
            health_status['status'] = 'degraded'
        
        return jsonify(health_status), 200
        
    except Exception as e:
        logger.error(f"Error in get_error_tracking_health: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

# Statistics and Analytics Endpoints

@error_api.route('/stats', methods=['GET'])
@require_auth
def get_error_statistics():
    """
    Get comprehensive error statistics.
    
    Query parameters:
    - period: Time period for statistics (1h, 6h, 24h, 7d, 30d)
    """
    try:
        period = request.args.get('period', '24h')
        
        # Parse period
        period_hours_map = {
            '1h': 1,
            '6h': 6,
            '24h': 24,
            '7d': 168,
            '30d': 720
        }
        
        if period not in period_hours_map:
            raise BadRequest(f"Invalid period. Must be one of: {list(period_hours_map.keys())}")
        
        hours = period_hours_map[period]
        
        # Get error metrics
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        error_metrics = current_app.error_tracker.get_error_metrics(
            start_time=start_time,
            end_time=end_time,
            limit=1000  # Get more for statistics
        )
        
        # Calculate statistics
        stats = {
            'period': period,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'total_errors': len(error_metrics),
            'by_severity': {},
            'by_category': {},
            'by_component': {},
            'by_hour': {},
            'resolution_rate': 0,
            'avg_resolution_time': None,
            'top_error_messages': []
        }
        
        # Count by severity, category, component
        severity_counts = {}
        category_counts = {}
        component_counts = {}
        hourly_counts = {}
        resolved_count = 0
        error_messages = {}
        
        for metric in error_metrics:
            # Severity
            severity_counts[metric.severity.value] = severity_counts.get(metric.severity.value, 0) + 1
            
            # Category
            category_counts[metric.category.value] = category_counts.get(metric.category.value, 0) + 1
            
            # Component
            component_counts[metric.component] = component_counts.get(metric.component, 0) + 1
            
            # Hourly distribution
            hour_key = metric.timestamp.strftime('%Y-%m-%d %H:00')
            hourly_counts[hour_key] = hourly_counts.get(hour_key, 0) + 1
            
            # Resolution tracking
            if metric.resolved:
                resolved_count += 1
            
            # Error messages
            message_key = metric.message[:100]  # Truncate for grouping
            error_messages[message_key] = error_messages.get(message_key, 0) + 1
        
        stats['by_severity'] = severity_counts
        stats['by_category'] = category_counts
        stats['by_component'] = component_counts
        stats['by_hour'] = hourly_counts
        stats['resolution_rate'] = (resolved_count / len(error_metrics) * 100) if error_metrics else 0
        
        # Top error messages
        stats['top_error_messages'] = sorted(
            error_messages.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return jsonify({
            'status': 'success',
            'statistics': stats
        }), 200
        
    except BadRequest as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_error_statistics: {e}")
        raise InternalServerError("Failed to retrieve error statistics")

# Utility endpoints

@error_api.route('/categories', methods=['GET'])
def get_error_categories():
    """Get list of available error categories."""
    return jsonify({
        'status': 'success',
        'categories': [category.value for category in ErrorCategory]
    }), 200

@error_api.route('/severities', methods=['GET']) 
def get_error_severities():
    """Get list of available error severities."""
    return jsonify({
        'status': 'success',
        'severities': [severity.value for severity in ErrorSeverity]
    }), 200

@error_api.route('/test', methods=['POST'])
@require_auth
def test_error_tracking():
    """
    Test endpoint to generate sample errors for testing.
    Only available in development mode.
    """
    try:
        if not current_app.debug:
            return jsonify({
                'error': 'Test endpoint only available in debug mode'
            }), 403
        
        data = request.get_json() or {}
        count = min(int(data.get('count', 1)), 10)
        
        test_errors = []
        
        for i in range(count):
            error_id = current_app.error_tracker.track_error(
                ErrorSeverity.MEDIUM,
                ErrorCategory.API,
                'test_endpoint',
                f"Test error {i+1}",
                context={
                    'test': True,
                    'generated_at': datetime.utcnow().isoformat(),
                    'request_id': g.request_id
                }
            )
            test_errors.append(error_id)
        
        return jsonify({
            'status': 'success',
            'message': f'Generated {count} test errors',
            'error_ids': test_errors
        }), 200
        
    except Exception as e:
        logger.error(f"Error in test_error_tracking: {e}")
        raise InternalServerError("Failed to generate test errors")

# Initialize error tracking for the app
def init_error_api(app):
    """Initialize error tracking API with Flask app."""
    from .error_tracking import init_error_tracking
    
    # Initialize error tracking system
    error_tracker_instance = init_error_tracking(app)
    
    # Register blueprint
    app.register_blueprint(error_api)
    
    # Add error tracking to app context
    app.error_tracker = error_tracker_instance
    
    logger.info("Error tracking API initialized successfully")
    
    return error_api
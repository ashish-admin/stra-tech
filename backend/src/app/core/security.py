"""
Security utilities and middleware for LokDarpan backend.

This module provides comprehensive security features including:
- Input validation and sanitization
- Rate limiting
- Security headers
- Audit logging
- CSRF protection
- API key validation
"""

import os
import re
import time
import logging
import hashlib
import secrets
from functools import wraps
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from flask import request, jsonify, current_app, g
from werkzeug.exceptions import BadRequest, TooManyRequests, Forbidden
import bleach
from markupsafe import Markup

# Configure security logger
security_logger = logging.getLogger('lokdarpan.security')
security_logger.setLevel(logging.INFO)

class SecurityConfig:
    """Security configuration constants."""
    
    # Input validation patterns
    WARD_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9\s\-_.]{1,100}$')
    API_KEY_PATTERN = re.compile(r'^[a-zA-Z0-9\-_]{20,100}$')
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    # Allowed HTML tags for content sanitization (very restrictive)
    ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u']
    ALLOWED_ATTRIBUTES = {}
    
    # Additional sanitization settings
    BLEACH_SETTINGS = {
        'tags': ['p', 'br', 'strong', 'em', 'u'],
        'attributes': {},
        'protocols': [],  # No protocols allowed (no links)
        'strip': True,
        'strip_comments': True
    }
    
    # Rate limiting defaults
    DEFAULT_RATE_LIMITS = {
        'default': (100, 3600),  # 100 requests per hour
        'auth': (10, 900),       # 10 auth attempts per 15 minutes
        'analysis': (20, 3600),  # 20 analysis requests per hour
        'upload': (5, 3600),     # 5 uploads per hour
    }
    
    # Security headers (enhanced)
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
    }

class InputValidator:
    """Input validation and sanitization utilities."""
    
    @staticmethod
    def validate_ward_name(ward_name: str) -> str:
        """Validate and normalize ward name."""
        if not ward_name or not isinstance(ward_name, str):
            raise BadRequest("Ward name is required and must be a string")
        
        ward_name = ward_name.strip()
        if not SecurityConfig.WARD_NAME_PATTERN.match(ward_name):
            raise BadRequest("Invalid ward name format")
        
        return ward_name
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format."""
        if not email or not isinstance(email, str):
            raise BadRequest("Email is required")
        
        email = email.strip().lower()
        if not SecurityConfig.EMAIL_PATTERN.match(email):
            raise BadRequest("Invalid email format")
        
        return email
    
    @staticmethod
    def validate_username(username: str) -> str:
        """Validate username format."""
        if not username or not isinstance(username, str):
            raise BadRequest("Username is required")
        
        username = username.strip()
        if not SecurityConfig.USERNAME_PATTERN.match(username):
            raise BadRequest("Username must be 3-30 characters, letters, numbers, and underscore only")
        
        return username
    
    @staticmethod
    def sanitize_html_content(content: str) -> str:
        """Sanitize HTML content to prevent XSS with aggressive filtering."""
        if not content:
            return ""
        
        # First pass: Remove dangerous patterns
        dangerous_patterns = [
            r'javascript:',
            r'vbscript:',
            r'onload\s*=',
            r'onerror\s*=',
            r'onclick\s*=',
            r'onmouseover\s*=',
            r'onfocus\s*=',
            r'onblur\s*=',
            r'onchange\s*=',
            r'onsubmit\s*=',
            r'<script[^>]*>.*?</script>',
            r'<iframe[^>]*>.*?</iframe>',
            r'<object[^>]*>.*?</object>',
            r'<embed[^>]*>',
            r'<applet[^>]*>.*?</applet>',
            r'<meta[^>]*>',
            r'<link[^>]*>',
            r'<style[^>]*>.*?</style>',
        ]
        
        for pattern in dangerous_patterns:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE | re.DOTALL)
        
        # Second pass: Use bleach with strict settings
        cleaned = bleach.clean(
            content,
            **SecurityConfig.BLEACH_SETTINGS
        )
        
        # Third pass: Additional validation
        if any(dangerous in cleaned.lower() for dangerous in ['javascript:', 'vbscript:', 'data:', 'alert(', 'eval(', 'expression(']):
            security_logger.warning(f"XSS attempt detected and blocked: {content[:100]}...")
            return "[Content blocked for security]"
        
        return cleaned
    
    @staticmethod
    def validate_pagination_params(page: Any, per_page: Any) -> tuple:
        """Validate pagination parameters."""
        try:
            page = int(page) if page else 1
            per_page = int(per_page) if per_page else 20
        except (ValueError, TypeError):
            raise BadRequest("Invalid pagination parameters")
        
        if page < 1:
            raise BadRequest("Page number must be positive")
        
        if per_page < 1 or per_page > 100:
            raise BadRequest("Per page must be between 1 and 100")
        
        return page, per_page
    
    @staticmethod
    def validate_date_range(start_date: str, end_date: str) -> tuple:
        """Validate date range parameters."""
        try:
            if start_date:
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if end_date:
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            raise BadRequest("Invalid date format. Use ISO format (YYYY-MM-DD)")
        
        if start_date and end_date and start_date > end_date:
            raise BadRequest("Start date must be before end date")
        
        # Limit date range to prevent excessive data queries
        if start_date and end_date:
            if (end_date - start_date).days > 365:
                raise BadRequest("Date range cannot exceed 365 days")
        
        return start_date, end_date

class RateLimiter:
    """Rate limiting functionality."""
    
    def __init__(self):
        self.requests = {}  # In-memory storage for development
        
    def is_rate_limited(self, key: str, limit: int, window: int) -> bool:
        """Check if key is rate limited."""
        now = time.time()
        
        # Clean old entries
        self.requests = {
            k: v for k, v in self.requests.items() 
            if now - v['timestamp'] < window
        }
        
        if key not in self.requests:
            self.requests[key] = {'count': 1, 'timestamp': now}
            return False
        
        request_data = self.requests[key]
        if now - request_data['timestamp'] >= window:
            # Reset window
            self.requests[key] = {'count': 1, 'timestamp': now}
            return False
        
        request_data['count'] += 1
        return request_data['count'] > limit
    
    def get_rate_limit_key(self, endpoint: str = None) -> str:
        """Generate rate limit key for current request."""
        # Use IP address and endpoint for rate limiting
        ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        user_id = getattr(g, 'user_id', None)
        
        if user_id:
            return f"user:{user_id}:{endpoint or 'default'}"
        else:
            return f"ip:{ip}:{endpoint or 'default'}"

# Global rate limiter instance
rate_limiter = RateLimiter()

def rate_limit(endpoint: str = 'default'):
    """Rate limiting decorator."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_app.config.get('RATE_LIMIT_ENABLED', True):
                return f(*args, **kwargs)
            
            # Get rate limit configuration
            limits = SecurityConfig.DEFAULT_RATE_LIMITS.get(
                endpoint, 
                SecurityConfig.DEFAULT_RATE_LIMITS['default']
            )
            limit, window = limits
            
            # Check rate limit
            key = rate_limiter.get_rate_limit_key(endpoint)
            if rate_limiter.is_rate_limited(key, limit, window):
                security_logger.warning(f"Rate limit exceeded for {key}")
                raise TooManyRequests(f"Rate limit exceeded. Try again in {window} seconds.")
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_auth(f):
    """Authentication requirement decorator."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if user is authenticated (using Flask-Login)
        from flask_login import current_user
        
        if not current_user.is_authenticated:
            security_logger.warning(f"Unauthorized access attempt to {request.endpoint}")
            return jsonify({'error': 'Authentication required'}), 401
        
        # Set user context for rate limiting and audit
        g.user_id = current_user.id
        
        return f(*args, **kwargs)
    return decorated_function

def validate_api_key(f):
    """API key validation decorator for external integrations."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if not api_key:
            return jsonify({'error': 'API key required'}), 401
        
        # Validate API key format
        if not SecurityConfig.API_KEY_PATTERN.match(api_key):
            return jsonify({'error': 'Invalid API key format'}), 401
        
        # Here you would validate against stored API keys
        # For now, we'll implement a simple check
        expected_key = current_app.config.get('API_KEY')
        if expected_key and api_key != expected_key:
            security_logger.warning(f"Invalid API key attempt: {api_key[:10]}...")
            return jsonify({'error': 'Invalid API key'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

class AuditLogger:
    """Audit logging for compliance and security monitoring."""
    
    @staticmethod
    def log_security_event(event_type: str, details: Dict[str, Any], level: str = 'INFO'):
        """Log security-related events."""
        # Check if audit logging is enabled
        try:
            audit_enabled = current_app.config.get('AUDIT_LOG_ENABLED', True)
        except RuntimeError:
            # No app context, use environment variable
            audit_enabled = os.environ.get('AUDIT_LOG_ENABLED', 'True').lower() == 'true'
        
        if not audit_enabled:
            return
        
        # Handle request context safely
        try:
            ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
            user_agent = request.headers.get('User-Agent', '')
            endpoint = request.endpoint
            method = request.method
            user_id = getattr(g, 'user_id', None)
        except RuntimeError:
            # No request context (e.g., during testing)
            ip_address = 'unknown'
            user_agent = 'test-client'
            endpoint = 'test'
            method = 'TEST'
            user_id = None
        
        audit_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': event_type,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'endpoint': endpoint,
            'method': method,
            'user_id': user_id,
            'details': details
        }
        
        # Log to security logger
        log_message = f"AUDIT: {event_type} - {details}"
        if level == 'WARNING':
            security_logger.warning(log_message, extra=audit_data)
        elif level == 'ERROR':
            security_logger.error(log_message, extra=audit_data)
        else:
            security_logger.info(log_message, extra=audit_data)
    
    @staticmethod
    def log_authentication_attempt(username: str, success: bool, details: str = ""):
        """Log authentication attempts."""
        AuditLogger.log_security_event(
            'authentication_attempt',
            {
                'username': username,
                'success': success,
                'details': details
            },
            'WARNING' if not success else 'INFO'
        )
    
    @staticmethod
    def log_data_access(resource: str, action: str, details: Dict[str, Any] = None):
        """Log data access for compliance."""
        AuditLogger.log_security_event(
            'data_access',
            {
                'resource': resource,
                'action': action,
                'details': details or {}
            }
        )
    
    @staticmethod
    def log_configuration_change(setting: str, old_value: Any, new_value: Any):
        """Log configuration changes."""
        AuditLogger.log_security_event(
            'configuration_change',
            {
                'setting': setting,
                'old_value': str(old_value)[:100],  # Truncate for security
                'new_value': str(new_value)[:100]
            },
            'WARNING'
        )

def apply_security_headers(response):
    """Apply comprehensive security headers to all responses."""
    # Use app config if available, otherwise use defaults
    try:
        headers = current_app.config.get('SECURITY_HEADERS', SecurityConfig.SECURITY_HEADERS)
    except RuntimeError:
        # Fallback when no app context
        headers = SecurityConfig.SECURITY_HEADERS
    
    # Always apply these critical headers
    critical_headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
    }
    
    # Apply all configured headers
    for header, value in headers.items():
        response.headers[header] = value
    
    # Ensure critical headers are always present
    for header, value in critical_headers.items():
        if header not in response.headers:
            response.headers[header] = value
    
    # Add CSP if not in testing mode
    if not (hasattr(current_app, 'config') and current_app.config.get('TESTING')):
        if 'Content-Security-Policy' not in response.headers:
            response.headers['Content-Security-Policy'] = SecurityConfig.SECURITY_HEADERS['Content-Security-Policy']
    
    return response

def validate_content_type(allowed_types: List[str]):
    """Validate request content type."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            content_type = request.content_type
            if content_type and not any(allowed_type in content_type for allowed_type in allowed_types):
                raise BadRequest(f"Content type must be one of: {', '.join(allowed_types)}")
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def csrf_protection(f):
    """Basic CSRF protection using double-submit cookies."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            # Get CSRF token from header or form data
            csrf_token = request.headers.get('X-CSRF-Token') or request.form.get('csrf_token')
            
            if not csrf_token:
                return jsonify({'error': 'CSRF token required'}), 403
            
            # Validate CSRF token (simplified - in production use Flask-WTF)
            expected_token = request.cookies.get('csrf_token')
            if not expected_token or csrf_token != expected_token:
                security_logger.warning("CSRF token validation failed")
                return jsonify({'error': 'Invalid CSRF token'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

# Environment validation functions
def validate_environment():
    """Validate critical environment variables on startup."""
    required_vars = ['SECRET_KEY', 'DATABASE_URL']
    missing_vars = []
    
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    # Validate API keys if features are enabled
    ai_vars = ['GEMINI_API_KEY', 'OPENAI_API_KEY']
    missing_ai_vars = [var for var in ai_vars if not os.environ.get(var)]
    
    if missing_ai_vars:
        logging.warning(f"Missing AI API keys: {', '.join(missing_ai_vars)}. AI features will be disabled.")
    
    # Validate secret key strength
    secret_key = os.environ.get('SECRET_KEY')
    if len(secret_key) < 32:
        logging.warning("SECRET_KEY should be at least 32 characters long for security")
    
    security_logger.info("Environment validation completed successfully")

def generate_csrf_token():
    """Generate a CSRF token."""
    return secrets.token_hex(32)
"""
New Application Factory for LokDarpan Backend

This is the main application factory using the new organized structure.
"""

import os
import time
import logging
from flask import Flask, request, g
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

from .core.extensions import db, migrate, login_manager, celery
from .core.models import User
from .core.security import (
    validate_environment, 
    apply_security_headers, 
    AuditLogger,
    SecurityConfig
)

# Import celery utils from parent
import sys
sys.path.append('..')
from celery_utils import celery_init_app

# API blueprints
from .api.routes import (
    main_bp, trends_bp, pulse_bp, ward_bp, 
    bp_epaper, summary_bp, multimodel_bp
)

# Political Strategist module
from ..strategist import strategist_bp

def _cors_origins_from_env():
    """
    Read allowed CORS origins from env (comma-separated).
    Falls back to localhost dev ports used by Vite.
    """
    raw = os.getenv("CORS_ORIGINS", "")
    if raw.strip():
        return [o.strip() for o in raw.split(",") if o.strip()]
    # Dev defaults
    return ["http://localhost:5173", "http://127.0.0.1:5173"]


def create_app(config_class: str = "config.Config") -> Flask:
    """Application factory for the reorganized structure.

    Args:
        config_class: Import path for the configuration object to load.

    Returns:
        Configured Flask application instance with security features.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Validate environment before proceeding
    validate_environment()

    # Security: Trust proxy headers for rate limiting and logging
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    # Configure logging
    if not app.debug:
        logging.basicConfig(
            level=getattr(logging, app.config.get('LOG_LEVEL', 'INFO')),
            format='%(asctime)s %(levelname)s %(name)s %(message)s'
        )

    # ----------------- Extensions -----------------
    db.init_app(app)
    migrate.init_app(app, db)

    # Enhanced CORS configuration with security headers
    cors_origins = app.config.get('CORS_ORIGINS', _cors_origins_from_env())
    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=app.config.get('CORS_SUPPORTS_CREDENTIALS', True),
        allow_headers=app.config.get('CORS_ALLOW_HEADERS', ["Content-Type", "Authorization", "X-Requested-With"]),
        methods=app.config.get('CORS_METHODS', ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]),
        expose_headers=["Content-Type", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    )

    login_manager.init_app(app)
    login_manager.login_view = 'main.login'
    login_manager.login_message = 'Please log in to access this page.'
    celery_init_app(app, celery)

    # Security middleware and handlers
    @app.before_request
    def security_before_request():
        """Security checks before each request."""
        # Set request start time for performance monitoring
        g.start_time = time.time()
        
        # Validate content length
        max_content_length = app.config.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)
        if request.content_length and request.content_length > max_content_length:
            AuditLogger.log_security_event(
                'oversized_request',
                {'content_length': request.content_length, 'max_allowed': max_content_length},
                'WARNING'
            )
            return {'error': 'Request too large'}, 413
    
    @app.after_request
    def security_after_request(response):
        """Apply security headers and audit logging."""
        # Apply security headers
        response = apply_security_headers(response)
        
        # Add performance headers
        if hasattr(g, 'start_time'):
            response.headers['X-Response-Time'] = str(int((time.time() - g.start_time) * 1000))
        
        # Log sensitive operations
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            AuditLogger.log_data_access(
                request.endpoint or 'unknown',
                request.method,
                {'status_code': response.status_code}
            )
        
        return response
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        """Handle oversized requests."""
        return {'error': 'Request too large'}, 413
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        """Handle rate limit exceeded."""
        return {'error': 'Rate limit exceeded. Please try again later.'}, 429

    @login_manager.user_loader
    def load_user(user_id: str):
        return User.query.get(int(user_id)) if user_id else None

    # --------------- Blueprints -------------------
    with app.app_context():
        # Order: general → specific
        app.register_blueprint(main_bp)
        app.register_blueprint(trends_bp)
        app.register_blueprint(pulse_bp)
        app.register_blueprint(ward_bp)
        app.register_blueprint(bp_epaper)
        app.register_blueprint(summary_bp)
        app.register_blueprint(multimodel_bp)
        app.register_blueprint(strategist_bp)  # Political Strategist API
        
        return app
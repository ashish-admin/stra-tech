"""
Enhanced Authentication Middleware for SSE Connections

Provides robust authentication and session management for long-running SSE connections
with session validation, token refresh, and connection security features.
"""

import os
import time
import hmac
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Optional, Dict, Any
from flask import request, jsonify, current_app, session, g
from flask_login import current_user, login_required
import jwt

logger = logging.getLogger(__name__)


class SSEAuthenticationManager:
    """
    Enhanced authentication manager for SSE connections with:
    - Session validation and refresh
    - Connection tokens for secure streaming
    - Rate limiting and abuse prevention
    - Connection monitoring and cleanup
    """
    
    def __init__(self):
        self.active_connections = {}  # connection_id -> connection_info
        self.connection_tokens = {}   # token -> connection_info  
        self.rate_limits = {}         # user_id -> rate_limit_info
        
    def generate_connection_token(self, user_id: str, ward: str, expires_in: int = 3600) -> str:
        """
        Generate a secure connection token for SSE streams.
        
        Args:
            user_id: Authenticated user ID
            ward: Ward context for the connection
            expires_in: Token expiry in seconds (default 1 hour)
            
        Returns:
            Secure JWT token for SSE connection authentication
        """
        try:
            now = datetime.now(timezone.utc)
            payload = {
                'user_id': user_id,
                'ward': ward,
                'connection_type': 'sse_stream',
                'iat': now.timestamp(),
                'exp': (now + timedelta(seconds=expires_in)).timestamp(),
                'jti': self._generate_connection_id(user_id, ward)  # JWT ID for tracking
            }
            
            secret_key = current_app.config['SECRET_KEY']
            token = jwt.encode(payload, secret_key, algorithm='HS256')
            
            # Store connection info
            connection_info = {
                'user_id': user_id,
                'ward': ward,
                'created_at': now,
                'expires_at': now + timedelta(seconds=expires_in),
                'token': token,
                'active': True,
                'last_heartbeat': now,
                'connection_count': 0,
                'error_count': 0
            }
            
            self.connection_tokens[token] = connection_info
            self.active_connections[payload['jti']] = connection_info
            
            logger.info(f"Generated SSE connection token for user {user_id}, ward {ward}")
            return token
            
        except Exception as e:
            logger.error(f"Failed to generate connection token: {e}")
            raise
    
    def validate_connection_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate and refresh SSE connection token.
        
        Args:
            token: JWT connection token
            
        Returns:
            Connection info if valid, None if invalid
        """
        try:
            secret_key = current_app.config['SECRET_KEY']
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            connection_info = self.connection_tokens.get(token)
            if not connection_info:
                logger.warning(f"Connection token not found in active connections")
                return None
            
            # Check if token is expired
            now = datetime.now(timezone.utc)
            if now > connection_info['expires_at']:
                logger.warning(f"Connection token expired for user {payload.get('user_id')}")
                self._cleanup_connection(token)
                return None
            
            # Update last heartbeat
            connection_info['last_heartbeat'] = now
            connection_info['connection_count'] += 1
            
            # Check rate limiting
            if not self._check_rate_limit(payload.get('user_id')):
                logger.warning(f"Rate limit exceeded for user {payload.get('user_id')}")
                return None
            
            logger.debug(f"Valid SSE connection token for user {payload.get('user_id')}")
            return connection_info
            
        except jwt.ExpiredSignatureError:
            logger.warning("SSE connection token expired")
            self._cleanup_connection(token)
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid SSE connection token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error validating connection token: {e}")
            return None
    
    def refresh_connection_token(self, old_token: str, extend_by: int = 3600) -> Optional[str]:
        """
        Refresh an existing connection token to extend its validity.
        
        Args:
            old_token: Current connection token
            extend_by: Seconds to extend validity (default 1 hour)
            
        Returns:
            New connection token or None if refresh failed
        """
        try:
            connection_info = self.validate_connection_token(old_token)
            if not connection_info:
                return None
            
            # Generate new token with extended expiry
            new_token = self.generate_connection_token(
                connection_info['user_id'],
                connection_info['ward'],
                extend_by
            )
            
            # Clean up old token
            self._cleanup_connection(old_token)
            
            logger.info(f"Refreshed SSE connection token for user {connection_info['user_id']}")
            return new_token
            
        except Exception as e:
            logger.error(f"Error refreshing connection token: {e}")
            return None
    
    def validate_session_for_sse(self, session_data: Dict) -> bool:
        """
        Validate Flask session for SSE connection eligibility.
        
        Args:
            session_data: Flask session data
            
        Returns:
            True if session is valid for SSE connections
        """
        try:
            # Check if user is authenticated
            if not current_user.is_authenticated:
                logger.warning("SSE connection attempted without authentication")
                return False
            
            # Check session freshness (within last 24 hours)
            session_created = session_data.get('_permanent_session_lifetime')
            if session_created:
                session_age = time.time() - session_created
                if session_age > 86400:  # 24 hours
                    logger.warning(f"SSE connection with stale session: {session_age}s old")
                    return False
            
            # Check for session hijacking indicators
            user_agent = request.headers.get('User-Agent', '')
            session_user_agent = session_data.get('user_agent', '')
            if session_user_agent and user_agent != session_user_agent:
                logger.warning("Potential session hijacking detected in SSE connection")
                return False
            
            # Check IP consistency (optional, can be disabled for mobile users)
            if current_app.config.get('SSE_CHECK_IP_CONSISTENCY', False):
                client_ip = request.remote_addr
                session_ip = session_data.get('client_ip')
                if session_ip and client_ip != session_ip:
                    logger.warning(f"IP mismatch in SSE connection: {client_ip} vs {session_ip}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating session for SSE: {e}")
            return False
    
    def _check_rate_limit(self, user_id: str) -> bool:
        """Check if user is within rate limits for SSE connections."""
        try:
            now = time.time()
            rate_limit_info = self.rate_limits.get(user_id, {
                'count': 0,
                'window_start': now,
                'blocked_until': None
            })
            
            # Check if user is currently blocked
            if rate_limit_info['blocked_until'] and now < rate_limit_info['blocked_until']:
                return False
            
            # Reset window if needed (1-minute windows)
            window_duration = 60  # 60 seconds
            if now - rate_limit_info['window_start'] > window_duration:
                rate_limit_info['count'] = 0
                rate_limit_info['window_start'] = now
                rate_limit_info['blocked_until'] = None
            
            # Check rate limit (60 connections per minute)
            max_connections_per_window = 60
            if rate_limit_info['count'] >= max_connections_per_window:
                # Block for 5 minutes
                rate_limit_info['blocked_until'] = now + 300
                logger.warning(f"Rate limit exceeded for user {user_id}, blocked for 5 minutes")
                return False
            
            # Increment counter
            rate_limit_info['count'] += 1
            self.rate_limits[user_id] = rate_limit_info
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            return True  # Allow connection on error to avoid blocking legitimate users
    
    def _generate_connection_id(self, user_id: str, ward: str) -> str:
        """Generate unique connection ID."""
        data = f"{user_id}:{ward}:{time.time()}:{os.urandom(8).hex()}"
        return hashlib.md5(data.encode()).hexdigest()
    
    def _cleanup_connection(self, token: str) -> None:
        """Clean up expired or invalid connection."""
        try:
            connection_info = self.connection_tokens.get(token)
            if connection_info:
                # Remove from active connections
                for conn_id, info in list(self.active_connections.items()):
                    if info.get('token') == token:
                        del self.active_connections[conn_id]
                        break
                
                # Remove token
                del self.connection_tokens[token]
                
                logger.debug(f"Cleaned up SSE connection for user {connection_info.get('user_id')}")
        except Exception as e:
            logger.error(f"Error cleaning up connection: {e}")
    
    def cleanup_expired_connections(self) -> int:
        """Clean up all expired connections. Returns count of cleaned connections."""
        try:
            now = datetime.now(timezone.utc)
            expired_count = 0
            
            # Find expired connections
            expired_tokens = []
            for token, info in self.connection_tokens.items():
                if now > info['expires_at']:
                    expired_tokens.append(token)
            
            # Clean up expired connections
            for token in expired_tokens:
                self._cleanup_connection(token)
                expired_count += 1
            
            # Clean up stale rate limit entries (older than 1 hour)
            stale_users = []
            for user_id, rate_info in self.rate_limits.items():
                if now.timestamp() - rate_info['window_start'] > 3600:
                    stale_users.append(user_id)
            
            for user_id in stale_users:
                del self.rate_limits[user_id]
            
            if expired_count > 0:
                logger.info(f"Cleaned up {expired_count} expired SSE connections")
            
            return expired_count
            
        except Exception as e:
            logger.error(f"Error during connection cleanup: {e}")
            return 0
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics for monitoring."""
        try:
            now = datetime.now(timezone.utc)
            
            active_count = len(self.active_connections)
            total_tokens = len(self.connection_tokens)
            rate_limited_users = sum(1 for info in self.rate_limits.values() 
                                   if info.get('blocked_until') and info['blocked_until'] > now.timestamp())
            
            # Calculate average connection duration
            durations = []
            for info in self.connection_tokens.values():
                duration = (now - info['created_at']).total_seconds()
                durations.append(duration)
            
            avg_duration = sum(durations) / len(durations) if durations else 0
            
            return {
                'active_connections': active_count,
                'total_tokens': total_tokens,
                'rate_limited_users': rate_limited_users,
                'average_duration_seconds': avg_duration,
                'total_rate_limit_entries': len(self.rate_limits),
                'timestamp': now.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting connection stats: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }


# Global authentication manager instance
sse_auth_manager = SSEAuthenticationManager()


def sse_auth_required(f):
    """
    Decorator for SSE endpoints requiring enhanced authentication.
    
    Validates both Flask session and connection token for secure streaming.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Basic login requirement
            if not current_user.is_authenticated:
                return jsonify({
                    'error': 'Authentication required',
                    'code': 'SSE_AUTH_001'
                }), 401
            
            # Validate session for SSE
            if not sse_auth_manager.validate_session_for_sse(dict(session)):
                return jsonify({
                    'error': 'Invalid session for SSE connection',
                    'code': 'SSE_AUTH_002'
                }), 401
            
            # Check for connection token in request
            auth_header = request.headers.get('Authorization', '')
            connection_token = None
            
            if auth_header.startswith('Bearer '):
                connection_token = auth_header[7:]
            else:
                # Check query parameter as fallback
                connection_token = request.args.get('token')
            
            if connection_token:
                # Validate existing connection token
                connection_info = sse_auth_manager.validate_connection_token(connection_token)
                if not connection_info:
                    return jsonify({
                        'error': 'Invalid or expired connection token',
                        'code': 'SSE_AUTH_003'
                    }), 401
                
                # Store connection info in g for use in endpoint
                g.sse_connection_info = connection_info
            else:
                # Generate new connection token for fresh connections
                ward = request.args.get('ward', 'Unknown')
                try:
                    new_token = sse_auth_manager.generate_connection_token(
                        str(current_user.id),
                        ward
                    )
                    g.sse_connection_token = new_token
                except Exception as e:
                    logger.error(f"Failed to generate connection token: {e}")
                    return jsonify({
                        'error': 'Failed to establish secure connection',
                        'code': 'SSE_AUTH_004'
                    }), 500
            
            # Call the original function
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"SSE authentication error: {e}")
            return jsonify({
                'error': 'Authentication system error',
                'code': 'SSE_AUTH_005'
            }), 500
    
    return decorated_function


def refresh_sse_token():
    """
    Utility function to refresh SSE connection token.
    Can be called from SSE streams to extend connection validity.
    """
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        current_token = auth_header[7:]
        new_token = sse_auth_manager.refresh_connection_token(current_token)
        
        if new_token:
            logger.info(f"SSE token refreshed for user {current_user.id}")
            return new_token
        else:
            logger.warning(f"Failed to refresh SSE token for user {current_user.id}")
            return None
            
    except Exception as e:
        logger.error(f"Error refreshing SSE token: {e}")
        return None


def validate_sse_request_integrity() -> bool:
    """
    Validate SSE request integrity to prevent abuse.
    
    Returns:
        True if request passes integrity checks
    """
    try:
        # Check request headers
        required_headers = ['Accept']
        for header in required_headers:
            if header not in request.headers:
                logger.warning(f"Missing required header for SSE: {header}")
                return False
        
        # Validate Accept header for SSE
        accept_header = request.headers.get('Accept', '')
        if 'text/event-stream' not in accept_header:
            logger.warning(f"Invalid Accept header for SSE: {accept_header}")
            return False
        
        # Check for suspicious patterns
        user_agent = request.headers.get('User-Agent', '')
        if not user_agent or len(user_agent) < 10:
            logger.warning("Suspicious User-Agent in SSE request")
            return False
        
        # Validate referer for same-origin policy
        referer = request.headers.get('Referer')
        if referer:
            # Allow requests from same origin or configured origins
            allowed_origins = current_app.config.get('SSE_ALLOWED_ORIGINS', [])
            if not any(referer.startswith(origin) for origin in allowed_origins):
                logger.warning(f"SSE request from unauthorized origin: {referer}")
                # Don't block immediately, just log for monitoring
        
        return True
        
    except Exception as e:
        logger.error(f"Error validating SSE request integrity: {e}")
        return True  # Allow on error to avoid blocking legitimate requests
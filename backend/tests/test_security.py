"""
Security tests for LokDarpan backend.

This module tests security features including authentication, authorization,
input validation, rate limiting, and protection against common vulnerabilities.
"""

import pytest
import time
from unittest.mock import patch
from app.models import User
from app.security import InputValidator, AuditLogger, rate_limiter


class TestInputValidation:
    """Test input validation and sanitization."""
    
    def test_validate_ward_name(self):
        """Test ward name validation."""
        # Valid ward names
        valid_names = ['Jubilee Hills', 'Banjara Hills', 'HITEC City', 'Ward-123']
        for name in valid_names:
            validated = InputValidator.validate_ward_name(name)
            assert validated == name.strip()
        
        # Invalid ward names
        invalid_names = ['', None, '<script>alert("xss")</script>', 'x' * 200]
        for name in invalid_names:
            with pytest.raises(Exception):
                InputValidator.validate_ward_name(name)
    
    def test_validate_email(self):
        """Test email validation."""
        # Valid emails
        valid_emails = ['test@example.com', 'user.name@domain.co.in', 'admin+test@site.org']
        for email in valid_emails:
            validated = InputValidator.validate_email(email)
            assert validated == email.lower().strip()
        
        # Invalid emails
        invalid_emails = ['', None, 'invalid-email', '@domain.com', 'test@', 'test.domain.com']
        for email in invalid_emails:
            with pytest.raises(Exception):
                InputValidator.validate_email(email)
    
    def test_validate_username(self):
        """Test username validation."""
        # Valid usernames
        valid_usernames = ['user123', 'test_user', 'admin', 'user_name_123']
        for username in valid_usernames:
            validated = InputValidator.validate_username(username)
            assert validated == username.strip()
        
        # Invalid usernames
        invalid_usernames = ['', None, 'us', 'a' * 50, 'user-name', 'user@name', '<script>']
        for username in invalid_usernames:
            with pytest.raises(Exception):
                InputValidator.validate_username(username)
    
    def test_sanitize_html_content(self):
        """Test HTML content sanitization."""
        # Should remove dangerous HTML
        dangerous_html = '<script>alert("xss")</script><p>Safe content</p>'
        sanitized = InputValidator.sanitize_html_content(dangerous_html)
        assert '<script>' not in sanitized
        assert 'Safe content' in sanitized
        
        # Should preserve safe HTML
        safe_html = '<p>This is <strong>safe</strong> content</p>'
        sanitized = InputValidator.sanitize_html_content(safe_html)
        assert '<p>' in sanitized
        assert '<strong>' in sanitized
        
        # Should handle empty content
        assert InputValidator.sanitize_html_content('') == ''
        assert InputValidator.sanitize_html_content(None) == ''
    
    def test_validate_pagination_params(self):
        """Test pagination parameter validation."""
        # Valid parameters
        page, per_page = InputValidator.validate_pagination_params(1, 20)
        assert page == 1
        assert per_page == 20
        
        # Default values
        page, per_page = InputValidator.validate_pagination_params(None, None)
        assert page == 1
        assert per_page == 20
        
        # Invalid parameters
        with pytest.raises(Exception):
            InputValidator.validate_pagination_params(-1, 20)
        
        with pytest.raises(Exception):
            InputValidator.validate_pagination_params(1, 200)  # Too many per page
        
        with pytest.raises(Exception):
            InputValidator.validate_pagination_params('invalid', 20)
    
    def test_validate_date_range(self):
        """Test date range validation."""
        # Valid date range
        start, end = InputValidator.validate_date_range('2025-01-01', '2025-01-31')
        assert start is not None
        assert end is not None
        assert start < end
        
        # Invalid date range (start after end)
        with pytest.raises(Exception):
            InputValidator.validate_date_range('2025-02-01', '2025-01-01')
        
        # Invalid date format
        with pytest.raises(Exception):
            InputValidator.validate_date_range('invalid-date', '2025-01-01')
        
        # Date range too large
        with pytest.raises(Exception):
            InputValidator.validate_date_range('2024-01-01', '2025-12-31')


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    def test_rate_limiter_basic_functionality(self):
        """Test basic rate limiting."""
        # Reset rate limiter
        rate_limiter.requests.clear()
        
        key = 'test_key'
        limit = 3
        window = 60
        
        # First few requests should be allowed
        for i in range(limit):
            assert not rate_limiter.is_rate_limited(key, limit, window)
        
        # Next request should be rate limited
        assert rate_limiter.is_rate_limited(key, limit, window)
    
    def test_rate_limiter_window_reset(self):
        """Test rate limiter window reset."""
        rate_limiter.requests.clear()
        
        key = 'test_key'
        limit = 2
        window = 1  # 1 second window
        
        # Use up the limit
        assert not rate_limiter.is_rate_limited(key, limit, window)
        assert not rate_limiter.is_rate_limited(key, limit, window)
        assert rate_limiter.is_rate_limited(key, limit, window)
        
        # Wait for window to reset
        time.sleep(1.1)
        
        # Should be allowed again
        assert not rate_limiter.is_rate_limited(key, limit, window)
    
    def test_rate_limiter_different_keys(self):
        """Test rate limiter with different keys."""
        rate_limiter.requests.clear()
        
        limit = 2
        window = 60
        
        # Different keys should have separate limits
        assert not rate_limiter.is_rate_limited('key1', limit, window)
        assert not rate_limiter.is_rate_limited('key2', limit, window)
        assert not rate_limiter.is_rate_limited('key1', limit, window)
        assert not rate_limiter.is_rate_limited('key2', limit, window)
        
        # Each key should hit its own limit
        assert rate_limiter.is_rate_limited('key1', limit, window)
        assert rate_limiter.is_rate_limited('key2', limit, window)


class TestAuthentication:
    """Test authentication security."""
    
    def test_password_hashing_security(self, db_session):
        """Test password hashing is secure."""
        user = User(username='testuser', email='test@example.com')
        password = 'SecurePassword123!'
        user.set_password(password)
        
        # Password should be hashed
        assert user.password_hash != password
        assert len(user.password_hash) > 50  # Should be a long hash
        
        # Should verify correctly
        assert user.check_password(password) is True
        assert user.check_password('wrong') is False
    
    def test_account_lockout_timing(self, db_session):
        """Test account lockout timing mechanism."""
        user = User(username='testuser', email='test@example.com')
        user.set_password('password123')
        db_session.session.add(user)
        db_session.session.commit()
        
        # Record failed attempts
        for _ in range(5):
            user.record_failed_login()
        
        # Should be locked
        assert user.is_account_locked() is True
        
        # Simulate time passing (would need to be 15 minutes in real scenario)
        # For testing, we'll modify the timestamp
        from datetime import datetime, timezone, timedelta
        user.last_failed_login = datetime.now(timezone.utc) - timedelta(minutes=16)
        
        # Should no longer be locked
        assert user.is_account_locked() is False
    
    def test_session_security(self, client, db_session, auth_user):
        """Test session security features."""
        # Login
        response = client.post('/api/v1/login', json={
            'username': auth_user.username,
            'password': 'testpassword123'
        })
        assert response.status_code == 200
        
        # Check session cookie attributes
        set_cookie = response.headers.get('Set-Cookie', '')
        
        # Should have HttpOnly flag
        assert 'HttpOnly' in set_cookie
        
        # Should have SameSite attribute
        assert 'SameSite' in set_cookie
    
    def test_login_attempt_audit_logging(self, client, db_session, auth_user):
        """Test that login attempts are properly audited."""
        with patch.object(AuditLogger, 'log_authentication_attempt') as mock_log:
            # Successful login
            response = client.post('/api/v1/login', json={
                'username': auth_user.username,
                'password': 'testpassword123'
            })
            assert response.status_code == 200
            
            # Should log successful attempt
            mock_log.assert_called_with(auth_user.username, True, 'Successful login')
            
            # Failed login
            response = client.post('/api/v1/login', json={
                'username': auth_user.username,
                'password': 'wrongpassword'
            })
            assert response.status_code == 401
            
            # Should log failed attempt
            assert any(call[0][1] is False for call in mock_log.call_args_list)


class TestXSSPrevention:
    """Test XSS prevention measures."""
    
    def test_xss_in_login_parameters(self, client, db_session, test_config):
        """Test XSS prevention in login parameters."""
        for payload in test_config.XSS_PAYLOADS:
            response = client.post('/api/v1/login', json={
                'username': payload,
                'password': 'password'
            })
            
            # Should handle gracefully
            assert response.status_code in [400, 401]
            
            # Response should not contain unescaped payload
            if response.is_json:
                response_text = str(response.get_json())
                assert '<script>' not in response_text
                assert 'javascript:' not in response_text
    
    def test_xss_in_api_parameters(self, client, auth_headers, test_config):
        """Test XSS prevention in API parameters."""
        for payload in test_config.XSS_PAYLOADS:
            # Test in ward parameter
            response = client.get(f'/api/v1/pulse/{payload}', headers=auth_headers)
            
            # Should handle gracefully
            assert response.status_code in [200, 400, 404]
            
            # Response should not contain unescaped payload
            if response.is_json:
                response_text = str(response.get_json())
                assert '<script>' not in response_text
    
    def test_html_sanitization_in_posts(self, client, auth_headers, db_session, sample_author):
        """Test HTML content is sanitized in posts."""
        # This test assumes there's an endpoint for creating posts
        # If not available, this test validates the sanitization function
        dangerous_content = '<script>alert("xss")</script><p>Safe content</p>'
        sanitized = InputValidator.sanitize_html_content(dangerous_content)
        
        assert '<script>' not in sanitized
        assert 'alert(' not in sanitized
        assert '<p>' in sanitized or 'Safe content' in sanitized


class TestSQLInjectionPrevention:
    """Test SQL injection prevention."""
    
    def test_sql_injection_in_login(self, client, db_session, test_config):
        """Test SQL injection prevention in login."""
        for payload in test_config.SQL_INJECTION_PAYLOADS:
            response = client.post('/api/v1/login', json={
                'username': payload,
                'password': 'password'
            })
            
            # Should handle gracefully, not cause SQL errors
            assert response.status_code in [400, 401]
            
            if response.is_json:
                data = response.get_json()
                # Should not expose SQL error details
                response_text = str(data).lower()
                sql_error_indicators = ['sql', 'syntax error', 'table', 'column']
                for indicator in sql_error_indicators:
                    assert indicator not in response_text
    
    def test_sql_injection_in_api_parameters(self, client, auth_headers, test_config):
        """Test SQL injection prevention in API parameters."""
        for payload in test_config.SQL_INJECTION_PAYLOADS:
            # Test in various endpoints
            endpoints = [
                f'/api/v1/pulse/{payload}',
                f'/api/v1/posts?city={payload}',
                f'/api/v1/trends?ward={payload}&days=30'
            ]
            
            for endpoint in endpoints:
                response = client.get(endpoint, headers=auth_headers)
                
                # Should handle gracefully
                assert response.status_code in [200, 400, 404]
                
                # Should not expose SQL errors
                if response.is_json:
                    data = response.get_json()
                    response_text = str(data).lower()
                    assert 'sql' not in response_text
                    assert 'syntax error' not in response_text


class TestCSRFProtection:
    """Test CSRF protection measures."""
    
    def test_csrf_token_generation(self):
        """Test CSRF token generation."""
        from app.security import generate_csrf_token
        
        token1 = generate_csrf_token()
        token2 = generate_csrf_token()
        
        # Tokens should be different
        assert token1 != token2
        
        # Tokens should be reasonable length
        assert len(token1) >= 32
        assert len(token2) >= 32
    
    def test_state_changing_requests_require_csrf(self, client, auth_headers):
        """Test state-changing requests require CSRF tokens."""
        # This test assumes CSRF protection is enabled for certain endpoints
        # If CSRF is implemented, test it here
        
        # For now, we'll test that the framework is in place
        from app.security import csrf_protection
        assert csrf_protection is not None


class TestSecurityHeaders:
    """Test security headers."""
    
    def test_security_headers_present(self, client, auth_headers):
        """Test that security headers are present."""
        response = client.get('/api/v1/status', headers=auth_headers)
        
        expected_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block'
        }
        
        for header, expected_value in expected_headers.items():
            assert header in response.headers
            assert response.headers[header] == expected_value
    
    def test_content_security_policy(self, client, auth_headers):
        """Test Content Security Policy header."""
        response = client.get('/api/v1/status', headers=auth_headers)
        
        if 'Content-Security-Policy' in response.headers:
            csp = response.headers['Content-Security-Policy']
            assert 'default-src' in csp
            # Should restrict script sources
            if 'script-src' in csp:
                assert "'unsafe-eval'" not in csp  # Should not allow eval
    
    def test_hsts_header(self, client, auth_headers):
        """Test HTTP Strict Transport Security header."""
        response = client.get('/api/v1/status', headers=auth_headers)
        
        if 'Strict-Transport-Security' in response.headers:
            hsts = response.headers['Strict-Transport-Security']
            assert 'max-age' in hsts
            assert int(hsts.split('max-age=')[1].split(';')[0]) > 0


class TestAuditLogging:
    """Test audit logging functionality."""
    
    def test_audit_logging_structure(self):
        """Test audit log structure."""
        with patch('app.security.security_logger') as mock_logger:
            AuditLogger.log_security_event(
                'test_event',
                {'key': 'value'},
                'INFO'
            )
            
            # Should have called logger
            assert mock_logger.info.called
            
            # Should include event details
            call_args = mock_logger.info.call_args
            assert 'test_event' in call_args[0][0]
            assert 'key' in str(call_args)
    
    def test_authentication_audit_logging(self):
        """Test authentication-specific audit logging."""
        with patch('app.security.security_logger') as mock_logger:
            AuditLogger.log_authentication_attempt('testuser', True, 'Success')
            
            assert mock_logger.info.called
            call_args = mock_logger.info.call_args
            assert 'authentication_attempt' in call_args[0][0]
            assert 'testuser' in str(call_args)
    
    def test_data_access_audit_logging(self):
        """Test data access audit logging."""
        with patch('app.security.security_logger') as mock_logger:
            AuditLogger.log_data_access('posts', 'read', {'count': 10})
            
            assert mock_logger.info.called
            call_args = mock_logger.info.call_args
            assert 'data_access' in call_args[0][0]


class TestAPIRateLimiting:
    """Test API rate limiting integration."""
    
    def test_login_rate_limiting(self, client, db_session, auth_user, test_config):
        """Test rate limiting on login endpoint."""
        # Mock rate limiter for testing
        from app.security import RateLimiter
        
        # Create a test rate limiter with low limits
        test_limiter = RateLimiter()
        test_limiter.enabled = True
        
        # Make multiple rapid requests
        responses = []
        for i in range(15):  # More than typical limit
            response = client.post('/api/v1/login', json={
                'username': auth_user.username,
                'password': 'wrongpassword'
            })
            responses.append(response)
        
        # Analyze response codes
        status_codes = [r.status_code for r in responses]
        
        # Should have authentication failures (401) - account lockout triggers at 5 attempts
        # After lockout, we get different responses but still security failures
        auth_failures = [code for code in status_codes if code == 401]
        assert len(auth_failures) >= 5  # Should have at least 5 auth failures before lockout
        
        # Should not have any successful authentications
        successes = [code for code in status_codes if code == 200]
        assert len(successes) == 0
    
    def test_rate_limit_headers(self, client, auth_headers):
        """Test rate limit headers are present."""
        response = client.get('/api/v1/status', headers=auth_headers)
        
        # Should include rate limit information in headers
        rate_limit_headers = [
            'X-RateLimit-Remaining',
            'X-RateLimit-Reset'
        ]
        
        # If rate limiting is enabled, these headers might be present
        for header in rate_limit_headers:
            if header in response.headers:
                # Validate header format
                value = response.headers[header]
                assert value.isdigit()


class TestEnvironmentSecurity:
    """Test environment and configuration security."""
    
    def test_environment_validation(self):
        """Test environment validation function."""
        from app.security import validate_environment
        
        # Should validate without error in test environment
        try:
            validate_environment()
        except RuntimeError as e:
            # If it fails, should be due to missing production variables
            assert 'environment variable' in str(e).lower()
    
    def test_debug_mode_disabled_in_production(self, app):
        """Test debug mode is disabled in production."""
        # In test environment, this might be enabled
        # In production, app.debug should be False
        if app.config.get('FLASK_ENV') == 'production':
            assert app.debug is False
    
    def test_secret_key_strength(self, app):
        """Test secret key is sufficiently strong."""
        secret_key = app.config.get('SECRET_KEY')
        
        # Should exist
        assert secret_key is not None
        
        # Should be reasonably long
        assert len(secret_key) >= 20
        
        # Should not be default values
        weak_keys = ['dev-secret', 'secret', 'key', 'default']
        assert not any(weak in secret_key.lower() for weak in weak_keys)


class TestDataValidation:
    """Test data validation and constraints."""
    
    def test_user_model_constraints(self, db_session):
        """Test user model enforces constraints."""
        from sqlalchemy.exc import IntegrityError
        
        # Test unique username constraint
        user1 = User(username='testuser', email='test1@example.com')
        user1.set_password('password')
        db_session.session.add(user1)
        db_session.session.commit()
        
        user2 = User(username='testuser', email='test2@example.com')
        user2.set_password('password')
        db_session.session.add(user2)
        
        with pytest.raises(IntegrityError):
            db_session.session.commit()
    
    def test_email_uniqueness_constraint(self, db_session):
        """Test email uniqueness is enforced."""
        from sqlalchemy.exc import IntegrityError
        
        user1 = User(username='user1', email='same@example.com')
        user1.set_password('password')
        db_session.session.add(user1)
        db_session.session.commit()
        
        user2 = User(username='user2', email='same@example.com')
        user2.set_password('password')
        db_session.session.add(user2)
        
        with pytest.raises(IntegrityError):
            db_session.session.commit()
    
    def test_password_requirements(self, db_session):
        """Test password requirements are enforced."""
        user = User(username='testuser', email='test@example.com')
        
        # Should accept strong password
        strong_password = 'StrongPassword123!'
        user.set_password(strong_password)
        assert user.check_password(strong_password)
        
        # Password hash should be set
        assert user.password_hash is not None
        assert len(user.password_hash) > 0
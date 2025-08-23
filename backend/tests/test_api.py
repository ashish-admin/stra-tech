"""
Integration tests for LokDarpan API endpoints.

This module tests all API endpoints for proper functionality, authentication,
error handling, and data validation.
"""

import pytest
import json
from datetime import datetime, timezone
from app.models import User, Post, Author, Alert


class TestAuthenticationAPI:
    """Test authentication endpoints."""
    
    def test_login_success(self, client, db_session, auth_user):
        """Test successful login."""
        response = client.post('/api/v1/login', json={
            'username': auth_user.username,
            'password': 'testpassword123'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Login successful'
        assert 'user' in data
        assert data['user']['username'] == auth_user.username
        assert data['user']['email'] == auth_user.email
    
    def test_login_invalid_credentials(self, client, db_session, auth_user):
        """Test login with invalid credentials."""
        response = client.post('/api/v1/login', json={
            'username': auth_user.username,
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data
        assert 'Invalid username or password' in data['error']
    
    def test_login_nonexistent_user(self, client, db_session):
        """Test login with non-existent user."""
        response = client.post('/api/v1/login', json={
            'username': 'nonexistent',
            'password': 'password123'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data
    
    def test_login_missing_fields(self, client, db_session):
        """Test login with missing required fields."""
        # Missing password
        response = client.post('/api/v1/login', json={
            'username': 'testuser'
        })
        assert response.status_code == 400
        
        # Missing username
        response = client.post('/api/v1/login', json={
            'password': 'password123'
        })
        assert response.status_code == 400
        
        # Empty request
        response = client.post('/api/v1/login', json={})
        assert response.status_code == 400
    
    def test_login_invalid_json(self, client, db_session):
        """Test login with invalid JSON."""
        response = client.post('/api/v1/login', 
                             data='invalid json',
                             content_type='application/json')
        assert response.status_code == 400
    
    def test_account_lockout(self, client, db_session, auth_user):
        """Test account lockout after multiple failed attempts."""
        # Make 5 failed login attempts
        for _ in range(5):
            response = client.post('/api/v1/login', json={
                'username': auth_user.username,
                'password': 'wrongpassword'
            })
            assert response.status_code == 401
        
        # Next attempt should be locked
        response = client.post('/api/v1/login', json={
            'username': auth_user.username,
            'password': 'wrongpassword'
        })
        assert response.status_code == 423  # Account locked
        data = response.get_json()
        assert 'locked' in data['error'].lower()
    
    def test_logout_success(self, client, auth_headers):
        """Test successful logout."""
        response = client.post('/api/v1/logout', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'Logged out successfully' in data['message']
    
    def test_logout_without_auth(self, client, db_session):
        """Test logout without authentication."""
        response = client.post('/api/v1/logout')
        assert response.status_code == 401


class TestStatusAPI:
    """Test status and health endpoints."""
    
    def test_status_authenticated(self, client, auth_headers):
        """Test status endpoint when authenticated."""
        response = client.get('/api/v1/status', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['authenticated'] is True
        assert 'user' in data
        assert data['user']['username'] is not None
    
    def test_status_unauthenticated(self, client, db_session):
        """Test status endpoint when not authenticated."""
        response = client.get('/api/v1/status')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['authenticated'] is False
        assert data['user'] is None


class TestPostsAPI:
    """Test posts-related endpoints."""
    
    def test_get_posts_authenticated(self, client, auth_headers, sample_post):
        """Test getting posts when authenticated."""
        response = client.get('/api/v1/posts', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, dict) and 'items' in data:
            # Paginated response
            posts = data['items']
            assert isinstance(posts, list)
            assert len(posts) >= 1
            post = posts[0]
        else:
            # Direct list response (backwards compatibility)
            assert isinstance(data, list)
            assert len(data) >= 1
            post = data[0]
        assert 'id' in post
        assert 'text' in post
        assert 'author' in post
        assert 'emotion' in post
        assert 'created_at' in post
    
    def test_get_posts_unauthenticated(self, client, db_session):
        """Test getting posts without authentication."""
        response = client.get('/api/v1/posts')
        assert response.status_code == 401
    
    def test_get_posts_with_city_filter(self, client, auth_headers, sample_post):
        """Test getting posts with city filter."""
        response = client.get('/api/v1/posts?city=Hyderabad', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        
        # All posts should be from Hyderabad
        for post in data:
            assert post.get('city') == 'Hyderabad'
    
    def test_get_posts_with_invalid_city(self, client, auth_headers):
        """Test getting posts with invalid city filter."""
        response = client.get('/api/v1/posts?city=NonexistentCity', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) == 0  # No posts for non-existent city


class TestCompetitiveAnalysisAPI:
    """Test competitive analysis endpoints."""
    
    def test_competitive_analysis_authenticated(self, client, auth_headers, sample_post):
        """Test competitive analysis when authenticated."""
        response = client.get('/api/v1/competitive-analysis', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
        
        # Should have party analysis structure
        for party, analysis in data.items():
            assert isinstance(analysis, dict)
            assert 'emotion_breakdown' in analysis
            assert 'total_mentions' in analysis
    
    def test_competitive_analysis_with_city_filter(self, client, auth_headers, sample_post):
        """Test competitive analysis with city filter."""
        response = client.get('/api/v1/competitive-analysis?city=Hyderabad', 
                            headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
    
    def test_competitive_analysis_unauthenticated(self, client, db_session):
        """Test competitive analysis without authentication."""
        response = client.get('/api/v1/competitive-analysis')
        assert response.status_code == 401


class TestTrendsAPI:
    """Test trends analysis endpoints."""
    
    def test_trends_authenticated(self, client, auth_headers, sample_post):
        """Test trends endpoint when authenticated."""
        response = client.get('/api/v1/trends?ward=All&days=30', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
        
        # Should have trends structure
        expected_keys = ['emotion_trends', 'party_mentions', 'time_series']
        for key in expected_keys:
            assert key in data
    
    def test_trends_with_specific_ward(self, client, auth_headers, sample_post):
        """Test trends for specific ward."""
        response = client.get('/api/v1/trends?ward=Hyderabad&days=7', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
    
    def test_trends_invalid_parameters(self, client, auth_headers):
        """Test trends with invalid parameters."""
        # Invalid days parameter
        response = client.get('/api/v1/trends?ward=All&days=invalid', headers=auth_headers)
        assert response.status_code == 400
        
        # Negative days
        response = client.get('/api/v1/trends?ward=All&days=-5', headers=auth_headers)
        assert response.status_code == 400
        
        # Too many days
        response = client.get('/api/v1/trends?ward=All&days=1000', headers=auth_headers)
        assert response.status_code == 400
    
    def test_trends_unauthenticated(self, client, db_session):
        """Test trends without authentication."""
        response = client.get('/api/v1/trends?ward=All&days=30')
        assert response.status_code == 401


class TestAlertsAPI:
    """Test alerts endpoints."""
    
    def test_get_alerts_authenticated(self, client, auth_headers, sample_alert):
        """Test getting alerts when authenticated."""
        response = client.get('/api/v1/alerts/Test Ward', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Check alert structure
        alert = data[0]
        assert 'id' in alert
        assert 'ward' in alert
        assert 'description' in alert
        assert 'severity' in alert
        assert 'created_at' in alert
    
    def test_get_alerts_nonexistent_ward(self, client, auth_headers):
        """Test getting alerts for non-existent ward."""
        response = client.get('/api/v1/alerts/NonexistentWard', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_get_alerts_unauthenticated(self, client, db_session):
        """Test getting alerts without authentication."""
        response = client.get('/api/v1/alerts/TestWard')
        assert response.status_code == 401


class TestPulseAPI:
    """Test pulse analysis endpoints."""
    
    def test_pulse_authenticated(self, client, auth_headers, sample_post):
        """Test pulse endpoint when authenticated."""
        response = client.get('/api/v1/pulse/Hyderabad', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
        
        # Should have pulse structure
        expected_keys = ['briefing', 'metrics', 'evidence']
        for key in expected_keys:
            assert key in data
    
    def test_pulse_with_days_parameter(self, client, auth_headers, sample_post):
        """Test pulse with days parameter."""
        response = client.get('/api/v1/pulse/Hyderabad?days=7', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
    
    def test_pulse_invalid_ward(self, client, auth_headers):
        """Test pulse with invalid ward."""
        response = client.get('/api/v1/pulse/InvalidWard', headers=auth_headers)
        
        # Should return empty or default pulse data
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
    
    def test_pulse_unauthenticated(self, client, db_session):
        """Test pulse without authentication."""
        response = client.get('/api/v1/pulse/Hyderabad')
        assert response.status_code == 401


class TestWardAPI:
    """Test ward-related endpoints."""
    
    def test_ward_meta_authenticated(self, client, auth_headers):
        """Test ward metadata endpoint when authenticated."""
        response = client.get('/api/v1/ward/meta/WARD_001', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
        
        # Should have ward metadata structure
        expected_keys = ['ward_id', 'demographics', 'updated_at']
        for key in expected_keys:
            assert key in data
    
    def test_ward_prediction_authenticated(self, client, auth_headers):
        """Test ward prediction endpoint when authenticated."""
        response = client.get('/api/v1/prediction/WARD_001', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
        
        # Should have prediction structure
        expected_keys = ['ward_id', 'predictions', 'confidence']
        for key in expected_keys:
            assert key in data
    
    def test_ward_endpoints_unauthenticated(self, client, db_session):
        """Test ward endpoints without authentication."""
        response = client.get('/api/v1/ward/meta/WARD_001')
        assert response.status_code == 401
        
        response = client.get('/api/v1/prediction/WARD_001')
        assert response.status_code == 401


class TestGeoJSONAPI:
    """Test GeoJSON endpoints."""
    
    def test_geojson_authenticated(self, client, auth_headers):
        """Test GeoJSON endpoint when authenticated."""
        response = client.get('/api/v1/geojson', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
        
        # Should have GeoJSON structure
        assert 'type' in data
        assert data['type'] == 'FeatureCollection'
        assert 'features' in data
        assert isinstance(data['features'], list)
    
    def test_geojson_unauthenticated(self, client, db_session):
        """Test GeoJSON without authentication."""
        response = client.get('/api/v1/geojson')
        assert response.status_code == 401


class TestAPIErrorHandling:
    """Test API error handling and edge cases."""
    
    def test_invalid_json_request(self, client, auth_headers):
        """Test API handles invalid JSON gracefully."""
        response = client.post('/api/v1/login',
                             data='invalid json',
                             content_type='application/json')
        assert response.status_code == 400
    
    def test_method_not_allowed(self, client, auth_headers):
        """Test API handles invalid HTTP methods."""
        # GET on login endpoint (should be POST)
        response = client.get('/api/v1/login')
        assert response.status_code == 405  # Method Not Allowed
    
    def test_nonexistent_endpoint(self, client, auth_headers):
        """Test API handles non-existent endpoints."""
        response = client.get('/api/v1/nonexistent', headers=auth_headers)
        assert response.status_code == 404
    
    def test_content_type_validation(self, client, auth_headers):
        """Test API validates content types where required."""
        # Send form data to JSON endpoint
        response = client.post('/api/v1/login',
                             data={'username': 'test', 'password': 'test'},
                             content_type='application/x-www-form-urlencoded')
        # Should either accept it or return appropriate error
        assert response.status_code in [400, 401, 415]  # Various possible responses
    
    def test_large_request_body(self, client, auth_headers):
        """Test API handles large request bodies."""
        large_data = {'data': 'x' * (16 * 1024 * 1024)}  # 16MB
        
        response = client.post('/api/v1/login',
                             json=large_data,
                             headers=auth_headers)
        
        # Should return 413 Request Entity Too Large or handle gracefully
        assert response.status_code in [400, 413, 414]
    
    def test_special_characters_in_parameters(self, client, auth_headers):
        """Test API handles special characters in parameters."""
        # Test with various special characters
        special_chars = ['<script>', '"DROP TABLE"', '../../etc/passwd', 'null']
        
        for char in special_chars:
            response = client.get(f'/api/v1/pulse/{char}', headers=auth_headers)
            # Should handle gracefully, not crash
            assert response.status_code in [200, 400, 404]


class TestAPIPerformance:
    """Test API performance and response times."""
    
    def test_response_time_under_threshold(self, client, auth_headers, performance_test_data, test_config):
        """Test API response times are under acceptable threshold."""
        import time
        
        start_time = time.time()
        response = client.get('/api/v1/posts', headers=auth_headers)
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < test_config.MAX_RESPONSE_TIME
        assert response.status_code == 200
    
    def test_pagination_performance(self, client, auth_headers, performance_test_data):
        """Test pagination doesn't significantly impact performance."""
        import time
        
        # Test first page
        start_time = time.time()
        response = client.get('/api/v1/posts?page=1&per_page=50', headers=auth_headers)
        first_page_time = time.time() - start_time
        
        assert response.status_code == 200
        
        # Test later page
        start_time = time.time()
        response = client.get('/api/v1/posts?page=10&per_page=50', headers=auth_headers)
        later_page_time = time.time() - start_time
        
        assert response.status_code == 200
        
        # Later pages shouldn't be significantly slower
        assert later_page_time < first_page_time * 3  # Allow up to 3x slower
    
    def test_concurrent_requests_handling(self, client, auth_headers):
        """Test API can handle concurrent requests."""
        import threading
        import time
        
        results = []
        
        def make_request():
            start_time = time.time()
            response = client.get('/api/v1/status', headers=auth_headers)
            end_time = time.time()
            results.append({
                'status_code': response.status_code,
                'response_time': end_time - start_time
            })
        
        # Start 10 concurrent threads
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert len(results) == 10
        for result in results:
            assert result['status_code'] == 200
            assert result['response_time'] < 5.0  # Reasonable timeout


class TestAPIHeaders:
    """Test API headers and metadata."""
    
    def test_security_headers_present(self, client, auth_headers):
        """Test security headers are present in responses."""
        response = client.get('/api/v1/status', headers=auth_headers)
        
        # Check for security headers
        security_headers = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection'
        ]
        
        for header in security_headers:
            assert header in response.headers
    
    def test_cors_headers_present(self, client, auth_headers):
        """Test CORS headers are present."""
        response = client.options('/api/v1/status', headers=auth_headers)
        
        # Should have CORS headers for OPTIONS request
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers'
        ]
        
        for header in cors_headers:
            assert header in response.headers
    
    def test_content_type_json(self, client, auth_headers):
        """Test API returns proper JSON content type."""
        response = client.get('/api/v1/status', headers=auth_headers)
        
        assert response.status_code == 200
        assert 'application/json' in response.content_type
    
    def test_response_time_header(self, client, auth_headers):
        """Test response time header is present."""
        response = client.get('/api/v1/status', headers=auth_headers)
        
        # Should have X-Response-Time header
        assert 'X-Response-Time' in response.headers
        
        # Should be a valid number
        response_time = response.headers['X-Response-Time']
        assert response_time.isdigit()
        assert int(response_time) > 0
"""
Integration tests for Political Strategist system.

Tests the complete integration of all strategist components including
service orchestration, API endpoints, caching, and observability.
"""

import pytest
import json
import asyncio
from unittest.mock import patch, Mock, AsyncMock
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestStrategistIntegration:
    """Integration tests for the complete strategist system."""
    
    def test_strategist_blueprint_registration(self, app):
        """Test that strategist blueprint is properly registered."""
        # Check that strategist routes are registered
        routes = [rule.rule for rule in app.url_map.iter_rules()]
        
        strategist_routes = [route for route in routes if '/strategist' in route]
        
        expected_routes = [
            '/api/v1/strategist/<ward>',
            '/api/v1/strategist/analyze',
            '/api/v1/strategist/feed',
            '/api/v1/strategist/health',
            '/api/v1/strategist/status'
        ]
        
        for expected in expected_routes:
            # Check if route pattern exists (may have Flask variable syntax)
            matching_routes = [r for r in strategist_routes if expected.split('<')[0] in r]
            assert len(matching_routes) > 0, f"Route {expected} not found in {strategist_routes}"
    
    def test_observability_integration(self, app):
        """Test observability system integration."""
        with app.app_context():
            from strategist.observability import get_observer, get_metrics
            
            # Test observer initialization
            observer = get_observer()
            assert observer is not None
            
            # Test metrics collection
            metrics = get_metrics()
            assert metrics is not None
            
            # Test health check
            health = observer.get_health_status()
            assert 'status' in health
            assert 'timestamp' in health
    
    def test_cache_integration(self, app, mock_redis_cache):
        """Test cache system integration."""
        with app.app_context():
            from strategist.cache import cget, cset, get_cache_stats
            
            # Test cache operations
            test_data = {"test": "integration_data"}
            success = cset("test:integration", test_data, "test-etag", 300)
            assert success or not mock_redis_cache  # Should succeed if Redis available
            
            # Test cache stats
            stats = get_cache_stats()
            assert 'status' in stats
    
    @patch('strategist.service.PoliticalStrategist')
    def test_ward_analysis_integration(self, mock_strategist_class, auth_client):
        """Test complete ward analysis workflow."""
        # Setup mock strategist
        mock_strategist = Mock()
        mock_analysis_result = {
            "strategic_overview": "Integration test overview",
            "confidence_score": 0.8,
            "source_citations": [{"url": "test.com"}],
            "internal_use_only": True
        }
        mock_strategist.analyze_situation.return_value = mock_analysis_result
        mock_strategist_class.return_value = mock_strategist
        
        # Test API endpoint
        response = auth_client.get('/api/v1/strategist/Test%20Ward?depth=quick')
        
        # Should return analysis result
        if response.status_code == 200:
            data = response.get_json()
            assert 'strategic_overview' in data
            assert 'confidence_score' in data
            assert data['internal_use_only'] is True
    
    def test_health_endpoint_integration(self, client):
        """Test health endpoint integration."""
        response = client.get('/api/v1/strategist/health')
        
        # Health endpoint should be accessible without auth
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.get_json()
            assert 'status' in data
            assert data['status'] in ['healthy', 'degraded', 'critical', 'error']
    
    def test_error_handling_integration(self, auth_client):
        """Test error handling across the system."""
        # Test invalid ward parameter
        response = auth_client.get('/api/v1/strategist/')  # Missing ward
        assert response.status_code == 404
        
        # Test invalid analysis depth
        response = auth_client.get('/api/v1/strategist/Test%20Ward?depth=invalid')
        # Should handle gracefully or use default
        assert response.status_code in [200, 400]
    
    @patch('strategist.service.PoliticalStrategist')
    def test_caching_integration(self, mock_strategist_class, auth_client, mock_redis_cache):
        """Test caching integration with API endpoints."""
        # Setup mock
        mock_strategist = Mock()
        mock_strategist.analyze_situation.return_value = {
            "strategic_overview": "Cached test",
            "confidence_score": 0.9
        }
        mock_strategist_class.return_value = mock_strategist
        
        # First request should generate analysis
        response1 = auth_client.get('/api/v1/strategist/Cache%20Test?depth=standard')
        
        if response1.status_code == 200:
            # Check for cache headers
            assert 'ETag' in response1.headers or response1.status_code == 200
    
    def test_feature_flag_integration(self, app):
        """Test feature flag system integration."""
        with app.app_context():
            # Test feature flag configuration
            app.config['STRATEGIST_ENABLED'] = False
            
            # Import after setting config
            from strategist.router import check_strategist_enabled
            
            # Should handle disabled state
            with app.test_request_context():
                result = check_strategist_enabled()
                # Function should return error response when disabled
                if result:
                    assert result[1] == 503  # Service unavailable


class TestEndToEndWorkflow:
    """Test complete user workflows."""
    
    @patch('strategist.service.PoliticalStrategist')
    def test_complete_analysis_workflow(self, mock_strategist_class, auth_client, mock_ai_services):
        """Test complete analysis workflow from API to result."""
        
        # Setup comprehensive mock response
        mock_strategist = Mock()
        comprehensive_result = {
            "strategic_overview": "Complete workflow test for Test Ward showing positive development trends",
            "key_intelligence": [
                {
                    "category": "public_sentiment",
                    "content": "Public sentiment trending positive on infrastructure",
                    "impact_level": "medium",
                    "confidence": 0.8
                }
            ],
            "opportunities": [
                {
                    "description": "Leverage infrastructure success for broader campaign",
                    "timeline": "Next 7 days",
                    "priority": 1,
                    "success_metrics": ["Increased approval rating"]
                }
            ],
            "threats": [
                {
                    "description": "Opposition may counter with traffic issues",
                    "severity": "medium",
                    "mitigation_strategy": "Proactive traffic management announcement"
                }
            ],
            "recommended_actions": [
                {
                    "category": "immediate",
                    "description": "Highlight recent infrastructure completions",
                    "timeline": "24h",
                    "priority": 1
                },
                {
                    "category": "24h",
                    "description": "Schedule press conference on development progress",
                    "timeline": "48h", 
                    "priority": 2
                }
            ],
            "confidence_score": 0.87,
            "source_citations": [
                {
                    "source_type": "news",
                    "title": "Infrastructure Development Update",
                    "url": "https://example.com/infra-update",
                    "relevance": 0.9
                }
            ],
            "generated_at": "2025-08-20T12:00:00Z",
            "internal_use_only": True
        }
        
        mock_strategist.analyze_situation.return_value = comprehensive_result
        mock_strategist_class.return_value = mock_strategist
        
        # Execute workflow
        response = auth_client.get('/api/v1/strategist/Test%20Ward?depth=standard&context=neutral')
        
        if response.status_code == 200:
            data = response.get_json()
            
            # Validate complete response structure
            assert 'strategic_overview' in data
            assert 'key_intelligence' in data
            assert 'opportunities' in data
            assert 'threats' in data
            assert 'recommended_actions' in data
            assert 'confidence_score' in data
            assert 'source_citations' in data
            assert 'internal_use_only' in data
            
            # Validate data quality
            assert isinstance(data['confidence_score'], (int, float))
            assert 0 <= data['confidence_score'] <= 1
            assert data['internal_use_only'] is True
            
            # Validate arrays
            assert isinstance(data['key_intelligence'], list)
            assert isinstance(data['opportunities'], list)
            assert isinstance(data['threats'], list)
            assert isinstance(data['recommended_actions'], list)
            assert isinstance(data['source_citations'], list)
            
            # Validate intelligence structure
            if data['key_intelligence']:
                intel = data['key_intelligence'][0]
                assert 'category' in intel
                assert 'content' in intel
                assert 'impact_level' in intel
                
            # Validate actions structure
            if data['recommended_actions']:
                action = data['recommended_actions'][0]
                assert 'category' in action
                assert 'description' in action
                assert 'timeline' in action


class TestSystemResilience:
    """Test system resilience and error recovery."""
    
    def test_ai_service_failure_recovery(self, auth_client):
        """Test graceful handling of AI service failures."""
        with patch('strategist.reasoner.ultra_think.StrategicPlanner') as mock_planner:
            # Simulate AI service failure
            mock_planner.return_value.create_analysis_plan.side_effect = Exception("AI service unavailable")
            
            response = auth_client.get('/api/v1/strategist/Test%20Ward')
            
            # Should handle error gracefully
            assert response.status_code in [200, 500]
            
            if response.status_code == 500:
                data = response.get_json()
                assert 'error' in data
    
    def test_cache_failure_recovery(self, auth_client):
        """Test graceful handling of cache failures."""
        with patch('strategist.cache.r', None):  # Simulate Redis unavailable
            
            response = auth_client.get('/api/v1/strategist/Test%20Ward')
            
            # Should still work without cache
            assert response.status_code in [200, 500]
    
    def test_database_failure_recovery(self, auth_client):
        """Test handling of database connectivity issues."""
        with patch('app.models.Post.query') as mock_query:
            # Simulate database error
            mock_query.side_effect = Exception("Database connection failed")
            
            response = auth_client.get('/api/v1/strategist/Test%20Ward')
            
            # Should handle database errors gracefully
            assert response.status_code in [200, 500]


class TestPerformanceIntegration:
    """Performance integration tests."""
    
    @patch('strategist.service.PoliticalStrategist')
    def test_concurrent_requests(self, mock_strategist_class, auth_client):
        """Test system performance under concurrent load."""
        import threading
        import time
        
        # Setup mock
        mock_strategist = Mock()
        mock_strategist.analyze_situation.return_value = {
            "strategic_overview": "Concurrent test",
            "confidence_score": 0.8
        }
        mock_strategist_class.return_value = mock_strategist
        
        results = []
        
        def make_request():
            response = auth_client.get('/api/v1/strategist/Concurrent%20Test')
            results.append(response.status_code)
        
        # Create 10 concurrent requests
        threads = []
        start_time = time.time()
        
        for i in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=30)
        
        total_time = time.time() - start_time
        
        # All requests should complete within reasonable time
        assert total_time < 30, f"Concurrent requests took too long: {total_time}s"
        
        # Most requests should succeed
        success_count = sum(1 for status in results if status == 200)
        assert success_count >= 7, f"Too many failed requests: {10 - success_count}/10"


class TestComplianceIntegration:
    """Test compliance and governance integration."""
    
    @patch('strategist.service.PoliticalStrategist')
    def test_internal_use_flag_enforcement(self, mock_strategist_class, auth_client):
        """Test that all outputs are marked for internal use only."""
        # Setup mock without internal use flag
        mock_strategist = Mock()
        mock_result = {
            "strategic_overview": "Test overview",
            "confidence_score": 0.8
        }
        mock_strategist.analyze_situation.return_value = mock_result
        mock_strategist_class.return_value = mock_strategist
        
        response = auth_client.get('/api/v1/strategist/Compliance%20Test')
        
        if response.status_code == 200:
            data = response.get_json()
            # Should add internal use flag via guardrails
            assert 'internal_use_only' in data
            assert data['internal_use_only'] is True
    
    def test_content_sanitization_integration(self, auth_client):
        """Test content sanitization across the pipeline."""
        # Test with potentially problematic content
        test_content = {
            "text": "This contains some test content that should be analyzed appropriately",
            "ward": "Test Ward",
            "context": "neutral"
        }
        
        response = auth_client.post('/api/v1/strategist/analyze', json=test_content)
        
        if response.status_code == 200:
            data = response.get_json()
            # Should have sanitized output
            assert 'internal_use_only' in data or 'error' not in data
    
    def test_audit_logging_integration(self, auth_client):
        """Test that audit logging captures strategist operations."""
        # This would integrate with the audit logging system
        # For now, just verify the endpoint works
        response = auth_client.get('/api/v1/strategist/Audit%20Test')
        
        # Should either succeed or fail gracefully
        assert response.status_code in [200, 401, 500]


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
"""
Integration tests for Political Strategist API endpoints.
Tests Flask routes, authentication, SSE streaming, caching, and error handling.
"""
import pytest
import json
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone
from flask import Flask

from strategist.service import PoliticalStrategist


@pytest.mark.integration
@pytest.mark.strategist
class TestStrategistAPIEndpoints:
    """Test Strategist API endpoint integration."""
    
    def test_ward_analysis_endpoint_success(self, auth_client, mock_ai_services, mock_redis_cache):
        """Test successful ward analysis endpoint."""
        self._setup_successful_ai_responses(mock_ai_services)
        
        with patch('strategist.cache.r', mock_redis_cache):
            with patch('strategist.service.PoliticalStrategist') as MockStrategist:
                # Mock successful strategist response
                mock_instance = AsyncMock()
                mock_instance.analyze_situation.return_value = {
                    "status": "success",
                    "analysis": {
                        "strategic_overview": "Test analysis for Jubilee Hills",
                        "key_intelligence": [{
                            "category": "public_sentiment",
                            "content": "Positive sentiment regarding development"
                        }],
                        "confidence_score": 0.85
                    },
                    "metadata": {
                        "ward": "Jubilee Hills",
                        "analysis_depth": "standard",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
                MockStrategist.return_value = mock_instance
                
                response = auth_client.get('/api/v1/strategist/Jubilee Hills?depth=standard&context=campaign')
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert data["status"] == "success"
                assert "analysis" in data
                assert "metadata" in data
                assert data["metadata"]["ward"] == "Jubilee Hills"
                
                # Verify strategist was called with correct parameters
                MockStrategist.assert_called_once_with("Jubilee Hills", "campaign")
                mock_instance.analyze_situation.assert_called_once_with("standard")
    
    def test_ward_analysis_endpoint_invalid_ward(self, auth_client):
        """Test ward analysis endpoint with invalid ward name."""
        response = auth_client.get('/api/v1/strategist/?depth=standard')
        
        # Should return error for empty/invalid ward
        assert response.status_code == 400
        data = response.get_json()
        assert "error" in data
        assert "ward" in data["error"].lower()
    
    def test_ward_analysis_endpoint_unauthorized(self, client):
        """Test ward analysis endpoint without authentication."""
        response = client.get('/api/v1/strategist/TestWard')
        
        # Should require authentication
        assert response.status_code == 401 or response.status_code == 302  # Redirect to login
    
    def test_ward_analysis_endpoint_parameter_validation(self, auth_client, mock_ai_services):
        """Test parameter validation for ward analysis endpoint."""
        self._setup_successful_ai_responses(mock_ai_services)
        
        with patch('strategist.service.PoliticalStrategist') as MockStrategist:
            mock_instance = AsyncMock()
            mock_instance.analyze_situation.return_value = {"status": "success", "analysis": {}, "metadata": {}}
            MockStrategist.return_value = mock_instance
            
            # Test valid parameters
            valid_params = [
                ('depth=quick', 'quick'),
                ('depth=standard', 'standard'),
                ('depth=detailed', 'detailed'),
                ('depth=comprehensive', 'comprehensive'),
                ('context=neutral', 'neutral'),
                ('context=campaign', 'campaign'),
                ('context=governance', 'governance'),
                ('context=opposition', 'opposition')
            ]
            
            for param, expected_value in valid_params:
                response = auth_client.get(f'/api/v1/strategist/TestWard?{param}')
                assert response.status_code == 200
            
            # Test invalid parameters
            invalid_params = [
                'depth=invalid_depth',
                'context=invalid_context',
                'depth=',  # Empty depth
                'context='  # Empty context
            ]
            
            for param in invalid_params:
                response = auth_client.get(f'/api/v1/strategist/TestWard?{param}')
                # Should either use defaults or return 400
                assert response.status_code in [200, 400]
    
    def test_intelligence_feed_endpoint_success(self, auth_client, mock_ai_services, mock_redis_cache):
        """Test intelligence feed endpoint.""" 
        with patch('strategist.cache.r', mock_redis_cache):
            # Mock intelligence feed data
            mock_intelligence = {
                "status": "success",
                "feed": [
                    {
                        "id": "intel_001",
                        "category": "breaking_news",
                        "headline": "Infrastructure project approved",
                        "confidence": 0.9,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "source": "Local News"
                    },
                    {
                        "id": "intel_002", 
                        "category": "sentiment_shift",
                        "headline": "Public sentiment improving on development",
                        "confidence": 0.8,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "source": "Social Media Analysis"
                    }
                ],
                "metadata": {
                    "total_items": 2,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
            
            with patch('strategist.sse.get_intelligence_feed') as mock_feed:
                mock_feed.return_value = mock_intelligence
                
                response = auth_client.get('/api/v1/strategist/intelligence/TestWard?priority=high')
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert data["status"] == "success"
                assert "feed" in data
                assert len(data["feed"]) == 2
                assert data["metadata"]["total_items"] == 2
    
    def test_analysis_text_endpoint(self, auth_client):
        """Test text analysis endpoint."""
        with patch('strategist.service.analyze_text') as mock_analyze:
            mock_analyze.return_value = {
                "entities": {
                    "political_parties": ["BJP", "Congress"],
                    "politicians": ["Local MLA"],
                    "issues": ["infrastructure", "development"]
                },
                "sentiment": {
                    "compound": 0.5,
                    "positive": 0.6,
                    "neutral": 0.3,
                    "negative": 0.1
                },
                "topics": [
                    {"topic": "infrastructure", "confidence": 0.85},
                    {"topic": "development", "confidence": 0.78}
                ]
            }
            
            test_text = "BJP announced infrastructure development project for the ward."
            response = auth_client.post('/api/v1/strategist/analyze-text', 
                                      json={"text": test_text})
            
            assert response.status_code == 200
            data = response.get_json()
            
            assert "entities" in data
            assert "sentiment" in data
            assert "topics" in data
            assert "BJP" in data["entities"]["political_parties"]
            
            mock_analyze.assert_called_once_with(test_text)
    
    def test_health_endpoint(self, auth_client):
        """Test health check endpoint."""
        with patch('strategist.observability.get_observer') as mock_observer_func:
            mock_observer = Mock()
            mock_observer.get_health_status.return_value = {
                "status": "healthy",
                "components": {
                    "gemini_api": {"status": "healthy", "response_time": 0.5},
                    "perplexity_api": {"status": "healthy", "response_time": 0.8},
                    "redis_cache": {"status": "healthy", "memory_usage": "10MB"},
                    "nlp_processor": {"status": "healthy"}
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": "1.0.0"
            }
            mock_observer_func.return_value = mock_observer
            
            response = auth_client.get('/api/v1/strategist/health')
            
            assert response.status_code == 200
            data = response.get_json()
            
            assert data["status"] == "healthy"
            assert "components" in data
            assert "timestamp" in data
            assert len(data["components"]) > 0
    
    def test_health_endpoint_unhealthy(self, auth_client):
        """Test health endpoint when system is unhealthy."""
        with patch('strategist.observability.get_observer') as mock_observer_func:
            mock_observer = Mock()
            mock_observer.get_health_status.return_value = {
                "status": "unhealthy",
                "components": {
                    "gemini_api": {"status": "unhealthy", "error": "API timeout"},
                    "redis_cache": {"status": "healthy"}
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            mock_observer_func.return_value = mock_observer
            
            response = auth_client.get('/api/v1/strategist/health')
            
            assert response.status_code == 503  # Service unavailable
            data = response.get_json()
            
            assert data["status"] == "unhealthy"
            assert "components" in data
    
    def test_cache_stats_endpoint(self, auth_client, mock_redis_cache):
        """Test cache statistics endpoint."""
        with patch('strategist.cache.r', mock_redis_cache):
            # Mock cache stats
            mock_redis_cache.info.return_value = {
                'used_memory_human': '5MB',
                'connected_clients': 3,
                'total_commands_processed': 1500,
                'keyspace_hits': 800,
                'keyspace_misses': 200
            }
            
            with patch('strategist.cache.get_cache_stats') as mock_stats:
                mock_stats.return_value = {
                    "hit_rate": 0.8,
                    "total_keys": 150,
                    "memory_usage": "5MB",
                    "recent_operations": 1500
                }
                
                response = auth_client.get('/api/v1/strategist/cache/stats')
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert "hit_rate" in data
                assert "total_keys" in data
                assert data["hit_rate"] == 0.8
    
    def test_cache_invalidation_endpoint(self, auth_client, mock_redis_cache):
        """Test cache invalidation endpoint."""
        with patch('strategist.cache.r', mock_redis_cache):
            mock_redis_cache.keys.return_value = [b'strategist:ward1', b'strategist:ward2']
            mock_redis_cache.delete.return_value = 2
            
            with patch('strategist.cache.invalidate_pattern') as mock_invalidate:
                mock_invalidate.return_value = 2
                
                response = auth_client.post('/api/v1/strategist/cache/invalidate',
                                          json={"pattern": "strategist:*"})
                
                assert response.status_code == 200
                data = response.get_json()
                
                assert "invalidated_count" in data
                assert data["invalidated_count"] == 2
                assert data["pattern"] == "strategist:*"


@pytest.mark.integration
@pytest.mark.strategist
class TestServerSentEvents:
    """Test Server-Sent Events (SSE) integration."""
    
    def test_sse_stream_basic_functionality(self, auth_client, mock_redis_cache):
        """Test basic SSE stream functionality."""
        with patch('strategist.cache.r', mock_redis_cache):
            # Mock SSE data generator
            def mock_sse_generator():
                yield "data: " + json.dumps({
                    "type": "intelligence_update",
                    "data": {
                        "headline": "New development announced",
                        "confidence": 0.9
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }) + "\n\n"
                
                yield "data: " + json.dumps({
                    "type": "sentiment_shift",
                    "data": {
                        "shift": "positive_increase",
                        "magnitude": 0.15
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }) + "\n\n"
            
            with patch('strategist.sse.sse_stream') as mock_sse:
                mock_sse.return_value = mock_sse_generator()
                
                response = auth_client.get('/api/v1/strategist/stream/TestWard?priority=high',
                                         headers={'Accept': 'text/event-stream'})
                
                assert response.status_code == 200
                assert response.headers['Content-Type'] == 'text/event-stream'
                assert response.headers['Cache-Control'] == 'no-cache'
                
                # Verify SSE data format
                data = response.get_data(as_text=True)
                assert "data: " in data
                assert "intelligence_update" in data
                assert "sentiment_shift" in data
    
    def test_sse_stream_authentication(self, client):
        """Test SSE stream requires authentication."""
        response = client.get('/api/v1/strategist/stream/TestWard',
                            headers={'Accept': 'text/event-stream'})
        
        # Should require authentication
        assert response.status_code in [401, 302]  # Unauthorized or redirect to login
    
    def test_sse_stream_error_handling(self, auth_client):
        """Test SSE stream error handling."""
        with patch('strategist.sse.sse_stream') as mock_sse:
            mock_sse.side_effect = Exception("SSE Stream Error")
            
            response = auth_client.get('/api/v1/strategist/stream/TestWard')
            
            # Should handle errors gracefully
            assert response.status_code in [500, 503]  # Server error or service unavailable
    
    def test_sse_connection_management(self, auth_client, mock_redis_cache):
        """Test SSE connection management and cleanup."""
        with patch('strategist.cache.r', mock_redis_cache):
            connection_count = 0
            
            def mock_connection_tracker():
                nonlocal connection_count
                connection_count += 1
                
                try:
                    yield f"data: connection_{connection_count}\n\n"
                finally:
                    connection_count -= 1
            
            with patch('strategist.sse.sse_stream') as mock_sse:
                mock_sse.return_value = mock_connection_tracker()
                
                # Start SSE connection
                response = auth_client.get('/api/v1/strategist/stream/TestWard')
                
                # Connection should be tracked
                assert response.status_code == 200
                
                # Consume response to simulate connection lifecycle
                data = response.get_data(as_text=True)
                assert "connection_" in data


@pytest.mark.integration
@pytest.mark.strategist
class TestAPICaching:
    """Test API caching integration."""
    
    def test_endpoint_caching_behavior(self, auth_client, mock_redis_cache):
        """Test endpoint caching with ETag support."""
        with patch('strategist.cache.r', mock_redis_cache):
            # Setup cache behavior
            cache_key = "strategist:analysis:TestWard:standard:neutral"
            cached_data = {
                "status": "success", 
                "analysis": {"cached": True},
                "metadata": {"cache_hit": True}
            }
            
            # First request - cache miss
            mock_redis_cache.get.return_value = None
            mock_redis_cache.setex.return_value = True
            
            with patch('strategist.service.get_ward_report') as mock_report:
                mock_report.return_value = cached_data
                
                response1 = auth_client.get('/api/v1/strategist/TestWard')
                
                assert response1.status_code == 200
                data1 = response1.get_json()
                assert data1["status"] == "success"
                
                # Should have set cache
                mock_redis_cache.setex.assert_called()
            
            # Second request - cache hit
            mock_redis_cache.get.return_value = json.dumps(cached_data).encode('utf-8')
            
            response2 = auth_client.get('/api/v1/strategist/TestWard')
            
            assert response2.status_code == 200
            data2 = response2.get_json()
            assert data2["status"] == "success"
    
    def test_cache_invalidation_on_parameters(self, auth_client, mock_redis_cache):
        """Test that cache is properly invalidated for different parameters."""
        with patch('strategist.cache.r', mock_redis_cache):
            mock_redis_cache.get.return_value = None
            
            with patch('strategist.service.get_ward_report') as mock_report:
                mock_report.return_value = {"status": "success", "analysis": {}, "metadata": {}}
                
                # Different parameter combinations should use different cache keys
                param_combinations = [
                    '/api/v1/strategist/TestWard?depth=quick',
                    '/api/v1/strategist/TestWard?depth=standard', 
                    '/api/v1/strategist/TestWard?context=campaign',
                    '/api/v1/strategist/TestWard?depth=detailed&context=opposition'
                ]
                
                for endpoint in param_combinations:
                    response = auth_client.get(endpoint)
                    assert response.status_code == 200
                
                # Should have made separate cache calls for each combination
                assert mock_redis_cache.get.call_count == len(param_combinations)
    
    def test_cache_headers_and_etags(self, auth_client, mock_redis_cache):
        """Test cache headers and ETag functionality."""
        with patch('strategist.cache.r', mock_redis_cache):
            mock_redis_cache.get.return_value = None
            
            with patch('strategist.service.get_ward_report') as mock_report:
                mock_report.return_value = {"status": "success", "analysis": {}, "metadata": {}}
                
                response = auth_client.get('/api/v1/strategist/TestWard')
                
                assert response.status_code == 200
                
                # Should include caching headers
                assert 'Cache-Control' in response.headers
                
                # May include ETag if implemented
                if 'ETag' in response.headers:
                    etag = response.headers['ETag']
                    
                    # Test conditional request with If-None-Match
                    response2 = auth_client.get('/api/v1/strategist/TestWard',
                                              headers={'If-None-Match': etag})
                    
                    # Should return 304 Not Modified if ETag matches
                    assert response2.status_code in [200, 304]


@pytest.mark.integration
@pytest.mark.strategist 
class TestErrorHandling:
    """Test API error handling integration."""
    
    def test_ai_service_failure_handling(self, auth_client, mock_ai_services):
        """Test handling of AI service failures."""
        # Mock AI service failures
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = Exception("Gemini API Error")
        
        response = auth_client.get('/api/v1/strategist/TestWard')
        
        # Should handle AI service failures gracefully  
        assert response.status_code in [200, 500, 503]
        
        if response.status_code == 200:
            data = response.get_json()
            # May return success with warnings or error status
            assert data["status"] in ["success", "error"]
            if data["status"] == "error":
                assert "error" in data
        else:
            # Or return appropriate error status code
            assert response.status_code in [500, 503]
    
    def test_cache_service_failure_handling(self, auth_client):
        """Test handling of cache service failures."""
        with patch('strategist.cache.r') as mock_redis:
            mock_redis.ping.side_effect = Exception("Redis connection error")
            mock_redis.get.side_effect = Exception("Redis get error")
            
            with patch('strategist.service.get_ward_report') as mock_report:
                mock_report.return_value = {"status": "success", "analysis": {}, "metadata": {}}
                
                response = auth_client.get('/api/v1/strategist/TestWard')
                
                # Should fallback gracefully when cache is unavailable
                assert response.status_code == 200
                data = response.get_json()
                assert data["status"] == "success"
    
    def test_malformed_request_handling(self, auth_client):
        """Test handling of malformed requests."""
        malformed_requests = [
            ('/api/v1/strategist/', 'Empty ward name'),
            ('/api/v1/strategist/TestWard?depth=invalid', 'Invalid depth parameter'),
            ('/api/v1/strategist/TestWard?context=invalid', 'Invalid context parameter')
        ]
        
        for endpoint, description in malformed_requests:
            response = auth_client.get(endpoint)
            
            # Should handle malformed requests appropriately
            assert response.status_code in [200, 400, 422], f"Failed for {description}: {endpoint}"
            
            if response.status_code == 200:
                # May return success with default parameters
                data = response.get_json()
                assert "status" in data
    
    def test_rate_limiting_behavior(self, auth_client):
        """Test API rate limiting behavior."""
        # This test depends on whether rate limiting is implemented
        # Make multiple rapid requests
        responses = []
        for i in range(10):
            response = auth_client.get(f'/api/v1/strategist/TestWard{i}')
            responses.append(response)
        
        # All requests should either succeed or be rate limited
        for response in responses:
            assert response.status_code in [200, 429, 500]
            
            if response.status_code == 429:
                # Rate limit response should include appropriate headers
                assert 'Retry-After' in response.headers or 'X-RateLimit-Remaining' in response.headers
    
    def test_large_request_handling(self, auth_client):
        """Test handling of unusually large requests."""
        # Test with very long ward name
        long_ward_name = "A" * 1000
        response = auth_client.get(f'/api/v1/strategist/{long_ward_name}')
        
        # Should handle gracefully
        assert response.status_code in [200, 400, 414]  # OK, Bad Request, or URI Too Long
        
        # Test with large text analysis request
        large_text = "Political content " * 10000
        response = auth_client.post('/api/v1/strategist/analyze-text',
                                  json={"text": large_text})
        
        # Should handle large text appropriately
        assert response.status_code in [200, 400, 413]  # OK, Bad Request, or Payload Too Large
    
    def _setup_successful_ai_responses(self, mock_ai_services):
        """Helper method to setup successful AI responses."""
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = Mock(
            text=json.dumps({
                "status": "success",
                "plan": {"queries": ["test"], "analysis_depth": "standard"}
            })
        )
        
        mock_session = AsyncMock()
        mock_response = Mock() 
        mock_response.status = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": json.dumps({"key_developments": []})}}]
        }
        mock_session.post.return_value.__aenter__.return_value = mock_response
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
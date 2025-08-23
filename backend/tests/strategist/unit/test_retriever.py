"""
Unit tests for Perplexity Intelligence Retriever.
Tests the Perplexity AI integration for real-time intelligence gathering and citation management.
"""
import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone

from strategist.retriever.perplexity_client import PerplexityRetriever


@pytest.mark.unit
@pytest.mark.strategist
class TestPerplexityRetriever:
    """Test the PerplexityRetriever class."""
    
    def test_init_default_parameters(self):
        """Test retriever initialization with defaults."""
        retriever = PerplexityRetriever()
        
        assert retriever.model_name == "llama-3.1-sonar-large-128k-online"
        assert retriever.max_concurrent == 3
        assert retriever.timeout == 30
        assert retriever.base_url == "https://api.perplexity.ai"
    
    def test_init_custom_parameters(self):
        """Test retriever initialization with custom parameters."""
        retriever = PerplexityRetriever(
            model_name="custom-model",
            max_concurrent=5,
            timeout=60
        )
        
        assert retriever.model_name == "custom-model"
        assert retriever.max_concurrent == 5 
        assert retriever.timeout == 60
    
    @pytest.mark.asyncio
    async def test_gather_intelligence_success(self, mock_ai_services):
        """Test successful intelligence gathering."""
        # Mock successful Perplexity response
        mock_response_data = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "key_developments": [
                            {
                                "headline": "Major infrastructure project approved for Test Ward",
                                "source": "Local News Daily",
                                "credibility_score": 0.9,
                                "relevance": 0.85,
                                "timestamp": "2024-01-15T10:30:00Z"
                            },
                            {
                                "headline": "Residents express concerns about traffic impact",
                                "source": "Community Voice",
                                "credibility_score": 0.7,
                                "relevance": 0.78,
                                "timestamp": "2024-01-15T14:20:00Z"
                            }
                        ],
                        "sentiment_analysis": {
                            "overall_sentiment": "cautiously_optimistic",
                            "positive": 0.45,
                            "neutral": 0.35,
                            "negative": 0.20,
                            "confidence": 0.82
                        },
                        "entity_mentions": {
                            "political_parties": {"BJP": 8, "TRS": 6, "Congress": 3},
                            "key_issues": {"infrastructure": 12, "traffic": 7, "development": 9},
                            "politicians": {"Local MLA": 5, "Ward Corporator": 3}
                        },
                        "credibility_assessment": {
                            "overall_score": 0.82,
                            "high_credibility_sources": 2,
                            "medium_credibility_sources": 1,
                            "low_credibility_sources": 0
                        }
                    })
                }
            }],
            "usage": {
                "prompt_tokens": 150,
                "completion_tokens": 200,
                "total_tokens": 350
            }
        }
        
        # Setup mock HTTP session
        mock_session = AsyncMock()
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json.return_value = mock_response_data
        mock_session.post.return_value.__aenter__.return_value = mock_response
        
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        queries = [
            "Recent political developments Test Ward",
            "Public sentiment Test Ward infrastructure",
            "Political party activity Test Ward"
        ]
        
        result = await retriever.gather_intelligence(queries)
        
        assert result["status"] == "success"
        assert "intelligence" in result
        
        intelligence = result["intelligence"]
        assert "queries_processed" in intelligence
        assert intelligence["queries_processed"] == 3
        assert "key_developments" in intelligence
        assert "sentiment_trends" in intelligence
        assert "entity_mentions" in intelligence
        
        # Verify key developments structure
        developments = intelligence["key_developments"]
        assert len(developments) > 0
        assert "headline" in developments[0]
        assert "credibility_score" in developments[0]
        assert "relevance" in developments[0]
    
    @pytest.mark.asyncio
    async def test_gather_intelligence_empty_queries(self):
        """Test intelligence gathering with empty query list."""
        retriever = PerplexityRetriever()
        result = await retriever.gather_intelligence([])
        
        assert result["status"] == "error"
        assert "error" in result
        assert "No queries" in result["error"]
    
    @pytest.mark.asyncio
    async def test_gather_intelligence_api_failure(self, mock_ai_services):
        """Test intelligence gathering with API failure."""
        # Mock API failure
        mock_session = AsyncMock()
        mock_session.post.side_effect = Exception("API Connection Error")
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        result = await retriever.gather_intelligence(["test query"])
        
        assert result["status"] == "error"
        assert "error" in result
        assert "API Connection Error" in result["error"]
    
    @pytest.mark.asyncio
    async def test_gather_intelligence_http_error(self, mock_ai_services):
        """Test intelligence gathering with HTTP error response."""
        # Mock HTTP error response
        mock_session = AsyncMock()
        mock_response = Mock()
        mock_response.status = 429  # Rate limit
        mock_response.text.return_value = "Rate limit exceeded"
        mock_session.post.return_value.__aenter__.return_value = mock_response
        
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        result = await retriever.gather_intelligence(["test query"])
        
        assert result["status"] == "error"
        assert "error" in result
        assert ("429" in result["error"] or "rate limit" in result["error"].lower())
    
    @pytest.mark.asyncio
    async def test_gather_intelligence_malformed_response(self, mock_ai_services):
        """Test intelligence gathering with malformed API response."""
        # Mock malformed response
        mock_session = AsyncMock()
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json.return_value = {"invalid": "structure"}  # Missing required fields
        mock_session.post.return_value.__aenter__.return_value = mock_response
        
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        result = await retriever.gather_intelligence(["test query"])
        
        assert result["status"] == "error"
        assert "error" in result
    
    @pytest.mark.asyncio
    async def test_gather_intelligence_partial_success(self, mock_ai_services):
        """Test intelligence gathering with partial success (some queries fail)."""
        call_count = 0
        
        async def mock_post(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            
            mock_response = Mock()
            mock_response.status = 200 if call_count <= 2 else 500  # First 2 succeed, 3rd fails
            
            if mock_response.status == 200:
                mock_response.json.return_value = {
                    "choices": [{
                        "message": {
                            "content": json.dumps({
                                "key_developments": [{"headline": f"Test development {call_count}"}],
                                "sentiment_analysis": {"positive": 0.5, "neutral": 0.3, "negative": 0.2}
                            })
                        }
                    }]
                }
            else:
                mock_response.text.return_value = "Server error"
                
            return mock_response
        
        mock_session = AsyncMock()
        mock_session.post = mock_post
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        queries = ["query1", "query2", "query3"]
        result = await retriever.gather_intelligence(queries)
        
        # Should return success with partial data and warnings
        assert result["status"] == "success"
        assert "intelligence" in result
        assert result["intelligence"]["queries_processed"] == 2  # 2 successful
        assert "warnings" in result or "errors" in result["intelligence"]
    
    @pytest.mark.asyncio
    async def test_execute_query_single_success(self, mock_ai_services):
        """Test executing a single query successfully."""
        mock_response_data = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "key_developments": [{"headline": "Test development"}],
                        "sentiment_analysis": {"positive": 0.6, "neutral": 0.3, "negative": 0.1}
                    })
                }
            }]
        }
        
        mock_session = AsyncMock()
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json.return_value = mock_response_data
        mock_session.post.return_value.__aenter__.return_value = mock_response
        
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        result = await retriever._execute_query("test query")
        
        assert result is not None
        assert "key_developments" in result
        assert "sentiment_analysis" in result
    
    @pytest.mark.asyncio
    async def test_execute_query_timeout(self, mock_ai_services):
        """Test query execution with timeout."""
        # Mock timeout
        async def timeout_post(*args, **kwargs):
            await asyncio.sleep(100)  # Longer than any reasonable timeout
            
        mock_session = AsyncMock()
        mock_session.post = timeout_post
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever(timeout=1)  # 1 second timeout
        
        # Should return None on timeout (handled internally)
        result = await retriever._execute_query("test query")
        assert result is None


@pytest.mark.unit
@pytest.mark.strategist
class TestQueryFormulation:
    """Test query formulation and optimization."""
    
    @pytest.mark.asyncio
    async def test_query_length_limits(self, mock_ai_services):
        """Test handling of query length limits."""
        # Mock response
        mock_session = AsyncMock()
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": json.dumps({"key_developments": []})}}]
        }
        mock_session.post.return_value.__aenter__.return_value = mock_response
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        
        # Very long query
        long_query = "Test query " * 1000  # Very long query
        result = await retriever.gather_intelligence([long_query])
        
        # Should handle gracefully (either truncate or process)
        assert result["status"] in ["success", "error"]
        if result["status"] == "error":
            assert "query" in result["error"].lower() or "length" in result["error"].lower()
    
    @pytest.mark.asyncio
    async def test_query_sanitization(self, mock_ai_services):
        """Test query sanitization for security."""
        # Mock response
        mock_session = AsyncMock()
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": json.dumps({"key_developments": []})}}]
        }
        mock_session.post.return_value.__aenter__.return_value = mock_response
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        
        # Potentially unsafe queries
        unsafe_queries = [
            "'; DROP TABLE users; --",
            "<script>alert('xss')</script>",
            "../../etc/passwd",
            "SELECT * FROM sensitive_data"
        ]
        
        for query in unsafe_queries:
            result = await retriever.gather_intelligence([query])
            
            # Should either succeed with sanitized query or fail safely
            assert result["status"] in ["success", "error"]
            # Should not cause server errors or exceptions
    
    @pytest.mark.asyncio 
    async def test_concurrent_query_limit(self, mock_ai_services):
        """Test concurrent query execution limit."""
        call_count = 0
        
        async def mock_post(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.1)  # Simulate processing time
            
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json.return_value = {
                "choices": [{"message": {"content": json.dumps({"key_developments": []})}}]
            }
            return mock_response
        
        mock_session = AsyncMock()
        mock_session.post = mock_post
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever(max_concurrent=2)
        
        # Submit more queries than the concurrent limit
        queries = [f"query {i}" for i in range(6)]
        result = await retriever.gather_intelligence(queries)
        
        # Should process maximum 5 queries (API limit) regardless of concurrent limit
        assert result["status"] == "success"
        assert result["intelligence"]["queries_processed"] <= 5


@pytest.mark.unit
@pytest.mark.strategist
class TestDataProcessing:
    """Test data processing and aggregation."""
    
    def test_aggregate_intelligence_data(self):
        """Test intelligence data aggregation from multiple queries."""
        retriever = PerplexityRetriever()
        
        # Mock query results
        query_results = [
            {
                "key_developments": [{"headline": "Development 1", "credibility_score": 0.9}],
                "sentiment_analysis": {"positive": 0.6, "neutral": 0.3, "negative": 0.1},
                "entity_mentions": {"political_parties": {"BJP": 5}}
            },
            {
                "key_developments": [{"headline": "Development 2", "credibility_score": 0.8}],
                "sentiment_analysis": {"positive": 0.4, "neutral": 0.4, "negative": 0.2},
                "entity_mentions": {"political_parties": {"TRS": 3, "Congress": 2}}
            },
            None  # Failed query
        ]
        
        aggregated = retriever._aggregate_intelligence_data(query_results)
        
        assert "intelligence_summary" in aggregated
        summary = aggregated["intelligence_summary"]
        
        # Should have aggregated developments
        assert "key_developments" in summary
        assert len(summary["key_developments"]) == 2
        
        # Should have aggregated sentiment (averaged)
        assert "sentiment_trends" in summary
        sentiment = summary["sentiment_trends"]
        assert 0.4 <= sentiment["positive"] <= 0.6  # Average of 0.6 and 0.4
        
        # Should have aggregated entity mentions
        assert "entity_mentions" in summary
        entities = summary["entity_mentions"]
        assert entities["political_parties"]["BJP"] == 5
        assert entities["political_parties"]["TRS"] == 3
    
    def test_aggregate_intelligence_all_failures(self):
        """Test intelligence aggregation when all queries fail."""
        retriever = PerplexityRetriever()
        
        # All failed queries
        query_results = [None, None, None]
        
        aggregated = retriever._aggregate_intelligence_data(query_results)
        
        assert "intelligence_summary" in aggregated
        summary = aggregated["intelligence_summary"]
        
        # Should have empty/default values
        assert summary["key_developments"] == []
        assert "sentiment_trends" in summary
        assert "entity_mentions" in summary
    
    def test_calculate_credibility_scores(self):
        """Test credibility score calculation for sources."""
        retriever = PerplexityRetriever()
        
        developments = [
            {"headline": "Test 1", "source": "The Hindu", "credibility_score": 0.95},
            {"headline": "Test 2", "source": "Local Blog", "credibility_score": 0.6},
            {"headline": "Test 3", "source": "Times of India", "credibility_score": 0.85},
            {"headline": "Test 4", "source": "Unknown Source", "credibility_score": 0.4}
        ]
        
        credibility_assessment = retriever._calculate_credibility_scores(developments)
        
        assert "overall_score" in credibility_assessment
        assert 0.0 <= credibility_assessment["overall_score"] <= 1.0
        
        assert "high_credibility_sources" in credibility_assessment
        assert "medium_credibility_sources" in credibility_assessment  
        assert "low_credibility_sources" in credibility_assessment
        
        # Should correctly categorize sources
        assert credibility_assessment["high_credibility_sources"] == 2  # Hindu, TOI
        assert credibility_assessment["medium_credibility_sources"] == 1  # Local Blog
        assert credibility_assessment["low_credibility_sources"] == 1   # Unknown


@pytest.mark.unit
@pytest.mark.strategist
@pytest.mark.asyncio
class TestErrorHandlingAndResilience:
    """Test error handling and system resilience."""
    
    async def test_network_connectivity_issues(self, mock_ai_services):
        """Test handling of network connectivity issues."""
        # Mock network error
        mock_ai_services["aiohttp"].ClientSession.side_effect = Exception("Network unreachable")
        
        retriever = PerplexityRetriever()
        result = await retriever.gather_intelligence(["test query"])
        
        assert result["status"] == "error"
        assert "network" in result["error"].lower() or "connection" in result["error"].lower()
    
    async def test_api_key_authentication_failure(self, mock_ai_services):
        """Test handling of API authentication failures."""
        mock_session = AsyncMock()
        mock_response = Mock()
        mock_response.status = 401
        mock_response.text.return_value = "Invalid API key"
        mock_session.post.return_value.__aenter__.return_value = mock_response
        
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        result = await retriever.gather_intelligence(["test query"])
        
        assert result["status"] == "error"
        assert "401" in result["error"] or "authentication" in result["error"].lower()
    
    async def test_rate_limiting_backoff(self, mock_ai_services):
        """Test rate limiting and backoff behavior."""
        call_count = 0
        
        async def mock_post_with_rate_limit(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            
            mock_response = Mock()
            if call_count <= 2:
                # First 2 calls hit rate limit
                mock_response.status = 429
                mock_response.text.return_value = "Rate limit exceeded"
            else:
                # Subsequent calls succeed
                mock_response.status = 200
                mock_response.json.return_value = {
                    "choices": [{"message": {"content": json.dumps({"key_developments": []})}}]
                }
            return mock_response
        
        mock_session = AsyncMock()
        mock_session.post = mock_post_with_rate_limit
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        result = await retriever.gather_intelligence(["test query"])
        
        # Should handle rate limiting gracefully
        # Either succeed after retries or fail with appropriate error
        assert result["status"] in ["success", "error"]
        if result["status"] == "error":
            assert "429" in result["error"] or "rate limit" in result["error"].lower()
    
    async def test_json_parsing_resilience(self, mock_ai_services):
        """Test resilience to JSON parsing errors."""
        malformed_responses = [
            '{"incomplete": json',  # Invalid JSON
            '{"valid_json": true, "but": "missing_required_fields"}',  # Valid JSON, wrong structure
            '',  # Empty response
            'Plain text response',  # Non-JSON response
            '{"choices": [{"message": {"content": "Not valid JSON inside"}}]}'  # Valid wrapper, invalid inner JSON
        ]
        
        retriever = PerplexityRetriever()
        
        for response_text in malformed_responses:
            mock_session = AsyncMock()
            mock_response = Mock()
            mock_response.status = 200
            
            if response_text.startswith('{') and response_text.endswith('}'):
                try:
                    mock_response.json.return_value = json.loads(response_text)
                except json.JSONDecodeError:
                    mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", response_text, 0)
            else:
                mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", response_text, 0)
            
            mock_session.post.return_value.__aenter__.return_value = mock_response
            mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
            
            result = await retriever.gather_intelligence(["test query"])
            
            # Should handle gracefully without crashing
            assert result["status"] == "error"
            assert "error" in result


@pytest.mark.unit
@pytest.mark.strategist
@pytest.mark.slow
class TestPerformanceCharacteristics:
    """Test performance characteristics and resource usage."""
    
    @pytest.mark.asyncio
    async def test_response_time_performance(self, mock_ai_services):
        """Test response time performance under normal conditions."""
        import time
        
        # Mock fast response
        mock_session = AsyncMock()
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": json.dumps({"key_developments": []})}}]
        }
        mock_session.post.return_value.__aenter__.return_value = mock_response
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        retriever = PerplexityRetriever()
        
        start_time = time.time()
        result = await retriever.gather_intelligence(["test query"])
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # Should complete quickly with mocked responses (under 2 seconds)
        assert response_time < 2.0, f"Response time too slow: {response_time:.2f}s"
        assert result["status"] == "success"
    
    @pytest.mark.asyncio
    async def test_memory_usage_stability(self, mock_ai_services):
        """Test memory usage stability across multiple queries."""
        import tracemalloc
        
        mock_session = AsyncMock()
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": json.dumps({"key_developments": []})}}]
        }
        mock_session.post.return_value.__aenter__.return_value = mock_response
        mock_ai_services["aiohttp"].ClientSession.return_value.__aenter__.return_value = mock_session
        
        tracemalloc.start()
        
        retriever = PerplexityRetriever()
        
        # Run multiple intelligence gathering operations
        for i in range(10):
            queries = [f"query {j}" for j in range(3)]
            await retriever.gather_intelligence(queries)
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        # Memory usage should be reasonable (less than 50MB for this test)
        assert peak < 50 * 1024 * 1024, f"Peak memory usage too high: {peak / 1024 / 1024:.2f}MB"
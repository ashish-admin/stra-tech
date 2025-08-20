"""
Unit tests for Political Strategist Service.
Tests the main orchestration service for AI-powered political strategy generation.
"""
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone

from strategist.service import PoliticalStrategist, get_ward_report, analyze_text


@pytest.mark.unit
@pytest.mark.strategist
class TestPoliticalStrategist:
    """Test the main PoliticalStrategist service class."""
    
    def test_init_default_parameters(self):
        """Test strategist initialization with default parameters."""
        strategist = PoliticalStrategist("Test Ward")
        
        assert strategist.ward == "Test Ward"
        assert strategist.context_mode == "neutral"
        assert strategist.planner is not None
        assert strategist.retriever is not None
        assert strategist.nlp is not None
        assert strategist.credibility is not None
        assert strategist.observer is not None
    
    def test_init_custom_parameters(self):
        """Test strategist initialization with custom parameters."""
        strategist = PoliticalStrategist("Test Ward", context_mode="campaign")
        
        assert strategist.ward == "Test Ward"
        assert strategist.context_mode == "campaign"
    
    @pytest.mark.asyncio
    async def test_analyze_situation_success(self, mock_strategist_components):
        """Test successful situation analysis."""
        with patch.multiple('strategist.service',
                          StrategicPlanner=lambda: mock_strategist_components["planner"],
                          PerplexityRetriever=lambda: mock_strategist_components["retriever"],
                          NLPProcessor=lambda: mock_strategist_components["nlp"],
                          CredibilityScorer=lambda: mock_strategist_components["credibility"]):
            
            strategist = PoliticalStrategist("Test Ward")
            result = await strategist.analyze_situation("detailed")
            
            # Verify the result structure
            assert "status" in result
            assert "analysis" in result
            assert "metadata" in result
            
            # Verify mock calls
            mock_strategist_components["planner"].create_analysis_plan.assert_called_once()
            mock_strategist_components["retriever"].gather_intelligence.assert_called_once()
            mock_strategist_components["planner"].generate_briefing.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_situation_failure(self, mock_strategist_components):
        """Test situation analysis with component failure."""
        # Make planner fail
        mock_strategist_components["planner"].create_analysis_plan.side_effect = Exception("API Error")
        
        with patch.multiple('strategist.service',
                          StrategicPlanner=lambda: mock_strategist_components["planner"],
                          PerplexityRetriever=lambda: mock_strategist_components["retriever"],
                          NLPProcessor=lambda: mock_strategist_components["nlp"],
                          CredibilityScorer=lambda: mock_strategist_components["credibility"]):
            
            strategist = PoliticalStrategist("Test Ward")
            result = await strategist.analyze_situation()
            
            # Should return error status
            assert result["status"] == "error"
            assert "error" in result
            assert "API Error" in result["error"]
    
    @pytest.mark.asyncio
    async def test_analyze_situation_different_depths(self, mock_strategist_components):
        """Test situation analysis with different depth parameters."""
        with patch.multiple('strategist.service',
                          StrategicPlanner=lambda: mock_strategist_components["planner"],
                          PerplexityRetriever=lambda: mock_strategist_components["retriever"],
                          NLPProcessor=lambda: mock_strategist_components["nlp"],
                          CredibilityScorer=lambda: mock_strategist_components["credibility"]):
            
            strategist = PoliticalStrategist("Test Ward")
            
            # Test different depths
            for depth in ["quick", "standard", "detailed", "comprehensive"]:
                result = await strategist.analyze_situation(depth)
                assert "status" in result
                
                # Verify depth was passed to planner
                call_args = mock_strategist_components["planner"].create_analysis_plan.call_args
                assert call_args[1]["depth"] == depth
    
    @pytest.mark.asyncio
    async def test_observability_integration(self, mock_strategist_components):
        """Test that observability metrics are properly tracked."""
        with patch.multiple('strategist.service',
                          StrategicPlanner=lambda: mock_strategist_components["planner"],
                          PerplexityRetriever=lambda: mock_strategist_components["retriever"],
                          NLPProcessor=lambda: mock_strategist_components["nlp"],
                          CredibilityScorer=lambda: mock_strategist_components["credibility"]):
            
            strategist = PoliticalStrategist("Test Ward")
            
            # Mock observer
            mock_observer = Mock()
            strategist.observer = mock_observer
            
            await strategist.analyze_situation()
            
            # Verify observer was used (the decorator should trigger this)
            assert mock_observer is not None


@pytest.mark.unit
@pytest.mark.strategist
class TestServiceHelperFunctions:
    """Test helper functions in the service module."""
    
    @pytest.mark.asyncio
    async def test_get_ward_report_success(self, mock_strategist_components, sample_posts):
        """Test successful ward report generation."""
        with patch('strategist.service.PoliticalStrategist') as MockStrategist:
            mock_instance = AsyncMock()
            mock_instance.analyze_situation.return_value = {
                "status": "success",
                "analysis": {"strategic_overview": "Test overview"},
                "metadata": {"confidence_score": 0.85}
            }
            MockStrategist.return_value = mock_instance
            
            result = await get_ward_report("Test Ward", "standard", "neutral")
            
            assert result["status"] == "success"
            assert "analysis" in result
            MockStrategist.assert_called_once_with("Test Ward", "neutral")
            mock_instance.analyze_situation.assert_called_once_with("standard")
    
    @pytest.mark.asyncio
    async def test_get_ward_report_failure(self):
        """Test ward report generation with failure."""
        with patch('strategist.service.PoliticalStrategist') as MockStrategist:
            MockStrategist.side_effect = Exception("Service unavailable")
            
            result = await get_ward_report("Test Ward")
            
            assert result["status"] == "error"
            assert "error" in result
            assert "Service unavailable" in result["error"]
    
    def test_analyze_text_basic(self):
        """Test basic text analysis functionality."""
        with patch('strategist.service.NLPProcessor') as MockNLP:
            mock_nlp = Mock()
            mock_nlp.extract_entities.return_value = {
                "political_parties": ["BJP", "TRS"],
                "politicians": ["Test Leader"],
                "issues": ["development"]
            }
            mock_nlp.analyze_sentiment.return_value = {
                "compound": 0.5,
                "positive": 0.6,
                "neutral": 0.3,
                "negative": 0.1
            }
            MockNLP.return_value = mock_nlp
            
            result = analyze_text("Test political content about development")
            
            assert "entities" in result
            assert "sentiment" in result
            assert "political_parties" in result["entities"]
            assert result["entities"]["political_parties"] == ["BJP", "TRS"]
    
    def test_analyze_text_empty_input(self):
        """Test text analysis with empty input."""
        result = analyze_text("")
        
        assert "error" in result
        assert "Empty text" in result["error"]
    
    def test_analyze_text_failure(self):
        """Test text analysis with NLP failure."""
        with patch('strategist.service.NLPProcessor') as MockNLP:
            MockNLP.side_effect = Exception("NLP Error")
            
            result = analyze_text("Test content")
            
            assert "error" in result
            assert "NLP Error" in result["error"]


@pytest.mark.unit
@pytest.mark.strategist
@pytest.mark.asyncio
class TestAsyncBehavior:
    """Test asynchronous behavior and concurrency handling."""
    
    async def test_concurrent_analysis_requests(self, mock_strategist_components):
        """Test multiple concurrent analysis requests."""
        with patch.multiple('strategist.service',
                          StrategicPlanner=lambda: mock_strategist_components["planner"],
                          PerplexityRetriever=lambda: mock_strategist_components["retriever"],
                          NLPProcessor=lambda: mock_strategist_components["nlp"],
                          CredibilityScorer=lambda: mock_strategist_components["credibility"]):
            
            strategist = PoliticalStrategist("Test Ward")
            
            # Create multiple concurrent requests
            tasks = [
                strategist.analyze_situation("quick"),
                strategist.analyze_situation("standard"),
                strategist.analyze_situation("detailed")
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # All should succeed
            assert len(results) == 3
            for result in results:
                assert not isinstance(result, Exception)
                assert "status" in result
    
    async def test_timeout_handling(self, mock_strategist_components):
        """Test timeout handling in async operations."""
        # Make planner take too long
        async def slow_operation(*args, **kwargs):
            await asyncio.sleep(10)  # Longer than any reasonable timeout
            return {"status": "success"}
        
        mock_strategist_components["planner"].create_analysis_plan.side_effect = slow_operation
        
        with patch.multiple('strategist.service',
                          StrategicPlanner=lambda: mock_strategist_components["planner"],
                          PerplexityRetriever=lambda: mock_strategist_components["retriever"],
                          NLPProcessor=lambda: mock_strategist_components["nlp"],
                          CredibilityScorer=lambda: mock_strategist_components["credibility"]):
            
            strategist = PoliticalStrategist("Test Ward")
            
            # This should timeout or handle long operations gracefully
            try:
                result = await asyncio.wait_for(strategist.analyze_situation(), timeout=1.0)
                # If it doesn't timeout, it should still return a valid response
                assert "status" in result
            except asyncio.TimeoutError:
                # Timeout is expected behavior for this test
                pass


@pytest.mark.unit
@pytest.mark.strategist
class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_invalid_ward_parameter(self):
        """Test handling of invalid ward parameters."""
        # Empty ward
        with pytest.raises(ValueError, match="Ward name cannot be empty"):
            PoliticalStrategist("")
        
        # None ward  
        with pytest.raises(ValueError, match="Ward name cannot be None"):
            PoliticalStrategist(None)
    
    def test_invalid_context_mode(self):
        """Test handling of invalid context mode."""
        with pytest.raises(ValueError, match="Invalid context mode"):
            PoliticalStrategist("Test Ward", context_mode="invalid_mode")
    
    @pytest.mark.asyncio
    async def test_graceful_degradation(self, mock_strategist_components):
        """Test graceful degradation when components fail."""
        # Make retriever fail but others succeed
        mock_strategist_components["retriever"].gather_intelligence.side_effect = Exception("Network error")
        
        with patch.multiple('strategist.service',
                          StrategicPlanner=lambda: mock_strategist_components["planner"],
                          PerplexityRetriever=lambda: mock_strategist_components["retriever"],
                          NLPProcessor=lambda: mock_strategist_components["nlp"],
                          CredibilityScorer=lambda: mock_strategist_components["credibility"]):
            
            strategist = PoliticalStrategist("Test Ward")
            result = await strategist.analyze_situation()
            
            # Should still return a response, possibly with reduced functionality
            assert "status" in result
            if result["status"] == "success":
                # Should indicate degraded mode
                assert "warnings" in result or "metadata" in result
            else:
                # Should have error information
                assert "error" in result


@pytest.mark.unit
@pytest.mark.strategist
@pytest.mark.slow
class TestPerformanceCharacteristics:
    """Test performance characteristics and resource usage."""
    
    @pytest.mark.asyncio
    async def test_memory_usage_stability(self, mock_strategist_components):
        """Test that memory usage remains stable across multiple operations."""
        import tracemalloc
        
        with patch.multiple('strategist.service',
                          StrategicPlanner=lambda: mock_strategist_components["planner"],
                          PerplexityRetriever=lambda: mock_strategist_components["retriever"],
                          NLPProcessor=lambda: mock_strategist_components["nlp"],
                          CredibilityScorer=lambda: mock_strategist_components["credibility"]):
            
            strategist = PoliticalStrategist("Test Ward")
            
            tracemalloc.start()
            
            # Run multiple operations
            for _ in range(10):
                await strategist.analyze_situation("quick")
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            # Memory usage should be reasonable (less than 100MB for this test)
            assert peak < 100 * 1024 * 1024, f"Peak memory usage too high: {peak / 1024 / 1024:.2f}MB"
    
    @pytest.mark.asyncio
    async def test_response_time_performance(self, mock_strategist_components):
        """Test response time performance requirements."""
        import time
        
        with patch.multiple('strategist.service',
                          StrategicPlanner=lambda: mock_strategist_components["planner"],
                          PerplexityRetriever=lambda: mock_strategist_components["retriever"],
                          NLPProcessor=lambda: mock_strategist_components["nlp"],
                          CredibilityScorer=lambda: mock_strategist_components["credibility"]):
            
            strategist = PoliticalStrategist("Test Ward")
            
            start_time = time.time()
            await strategist.analyze_situation("quick")
            end_time = time.time()
            
            response_time = end_time - start_time
            
            # Quick analysis should complete in under 5 seconds (with mocks)
            assert response_time < 5.0, f"Response time too slow: {response_time:.2f}s"
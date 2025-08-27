"""
Integration tests for Political Strategist AI Pipeline.
Tests the complete AI pipeline integration including all components working together,
data flow between services, and end-to-end analysis workflows.
"""
import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone

from strategist.service import PoliticalStrategist, get_ward_report
from strategist.reasoner.ultra_think import StrategicPlanner
from strategist.retriever.perplexity_client import PerplexityRetriever
from strategist.nlp.pipeline import NLPProcessor
from strategist.credibility.checks import CredibilityScorer
from strategist.cache import StrategistCache


@pytest.mark.integration
@pytest.mark.strategist
@pytest.mark.ai
class TestCompletePipeline:
    """Test complete AI pipeline integration."""
    
    @pytest.mark.asyncio
    async def test_full_analysis_pipeline_success(self, mock_ai_services, mock_redis_cache):
        """Test complete analysis pipeline from start to finish."""
        # Mock all AI service responses
        self._setup_successful_ai_responses(mock_ai_services)
        
        with patch('strategist.cache.r', mock_redis_cache):
            strategist = PoliticalStrategist("Jubilee Hills", "campaign")
            result = await strategist.analyze_situation("detailed")
            
            assert result["status"] == "success"
            assert "analysis" in result
            assert "metadata" in result
            
            # Verify complete pipeline execution
            analysis = result["analysis"]
            assert "strategic_priorities" in analysis
            assert "sentiment_analysis" in analysis
            assert "competitive_landscape" in analysis
            
            # Verify metadata includes confidence and processing info
            metadata = result["metadata"]
            assert "confidence_score" in metadata
            assert "analysis_depth" in metadata
            assert "ward" in metadata
            assert "timestamp" in metadata
    
    @pytest.mark.asyncio
    async def test_pipeline_with_partial_failures(self, mock_ai_services, mock_redis_cache):
        """Test pipeline behavior when some components fail."""
        # Setup mixed success/failure responses
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = [
            Mock(text=json.dumps({
                "status": "success",
                "plan": {"queries": ["test query"], "analysis_depth": "detailed"}
            })),  # First call succeeds (plan creation)
            Exception("Gemini API Error")  # Second call fails (briefing generation)
        ]
        
        # Perplexity succeeds (using requests)
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": json.dumps({
                "key_developments": [{"headline": "Test development"}],
                "sentiment_analysis": {"positive": 0.6, "neutral": 0.3, "negative": 0.1}
            })}}]
        }
        mock_ai_services["requests"].post.return_value = mock_response
        
        with patch('strategist.cache.r', mock_redis_cache):
            strategist = PoliticalStrategist("Jubilee Hills")
            result = await strategist.analyze_situation("detailed")
            
            # Should handle partial failures gracefully
            assert result["status"] == "error" or (result["status"] == "success" and "warnings" in result)
            
            if result["status"] == "success":
                # Should have reduced confidence or warnings
                assert result.get("metadata", {}).get("confidence_score", 1.0) < 0.8 or "warnings" in result
    
    @pytest.mark.asyncio
    async def test_pipeline_caching_behavior(self, mock_ai_services, mock_redis_cache):
        """Test pipeline caching behavior across multiple requests."""
        self._setup_successful_ai_responses(mock_ai_services)
        
        # Mock cache to track calls
        cache_get_calls = []
        cache_set_calls = []
        
        def mock_cache_get(key):
            cache_get_calls.append(key)
            return None  # Cache miss initially
        
        def mock_cache_set(key, value, ex=None):
            cache_set_calls.append((key, value))
            return True
        
        mock_redis_cache.get.side_effect = mock_cache_get
        mock_redis_cache.setex.side_effect = mock_cache_set
        
        with patch('strategist.cache.r', mock_redis_cache):
            strategist = PoliticalStrategist("Test Ward")
            
            # First request - should cache results
            result1 = await strategist.analyze_situation("standard")
            
            # Second request - should attempt to use cache
            result2 = await strategist.analyze_situation("standard")
            
            # Should have attempted cache operations
            assert len(cache_get_calls) >= 2  # At least two cache lookups
            assert len(cache_set_calls) >= 1  # At least one cache set
    
    @pytest.mark.asyncio
    async def test_pipeline_data_flow_integrity(self, mock_ai_services, mock_redis_cache):
        """Test data integrity through the pipeline."""
        # Setup traceable mock data
        ward_name = "Integration Test Ward"
        test_query = f"Political developments {ward_name}"
        
        # Mock Gemini responses with traceable data
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = [
            Mock(text=json.dumps({
                "status": "success",
                "plan": {
                    "queries": [test_query],
                    "analysis_depth": "standard",
                    "ward_context": ward_name
                }
            })),
            Mock(text=json.dumps({
                "status": "success", 
                "briefing": {
                    "strategic_overview": f"Analysis for {ward_name}",
                    "ward_specific_insights": f"Insights specific to {ward_name}",
                    "confidence_score": 0.85
                }
            }))
        ]
        
        # Mock Perplexity with traceable data
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": json.dumps({
                "key_developments": [{
                    "headline": f"Development in {ward_name}",
                    "ward_context": ward_name
                }],
                "context_validation": ward_name
            })}}]
        }
        mock_ai_services["requests"].post.return_value = mock_response
        
        with patch('strategist.cache.r', mock_redis_cache):
            strategist = PoliticalStrategist(ward_name)
            result = await strategist.analyze_situation("standard")
            
            # Verify data integrity through pipeline
            assert result["status"] == "success"
            assert ward_name in json.dumps(result)  # Ward context preserved
            
            analysis = result["analysis"]
            briefing_text = json.dumps(analysis)
            assert ward_name in briefing_text  # Ward-specific analysis generated
    
    @pytest.mark.asyncio
    async def test_pipeline_different_analysis_depths(self, mock_ai_services, mock_redis_cache):
        """Test pipeline behavior with different analysis depths."""
        depths = ["quick", "standard", "detailed", "comprehensive"]
        
        # Mock responses that vary by depth
        def create_depth_response(depth):
            complexity = {"quick": 0.3, "standard": 0.6, "detailed": 0.8, "comprehensive": 1.0}
            query_count = {"quick": 1, "standard": 3, "detailed": 5, "comprehensive": 7}
            
            return Mock(text=json.dumps({
                "status": "success",
                "plan": {
                    "queries": [f"query {i}" for i in range(query_count[depth])],
                    "analysis_depth": depth,
                    "complexity_score": complexity[depth]
                }
            }))
        
        for depth in depths:
            mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = create_depth_response(depth)
            
            with patch('strategist.cache.r', mock_redis_cache):
                strategist = PoliticalStrategist("Test Ward")
                result = await strategist.analyze_situation(depth)
                
                assert result["status"] == "success"
                assert result["metadata"]["analysis_depth"] == depth
                
                # Deeper analysis should have more comprehensive results
                if depth in ["detailed", "comprehensive"]:
                    assert result["metadata"].get("complexity_score", 0) >= 0.7
    
    @pytest.mark.asyncio
    async def test_pipeline_context_mode_variations(self, mock_ai_services, mock_redis_cache):
        """Test pipeline with different context modes."""
        context_modes = ["neutral", "campaign", "governance", "opposition"]
        
        for mode in context_modes:
            # Mock context-aware responses
            mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = Mock(
                text=json.dumps({
                    "status": "success",
                    "plan": {
                        "queries": [f"{mode} context query"],
                        "context_mode": mode,
                        "strategic_focus": f"{mode}_optimized"
                    }
                })
            )
            
            with patch('strategist.cache.r', mock_redis_cache):
                strategist = PoliticalStrategist("Test Ward", mode)
                result = await strategist.analyze_situation("standard")
                
                assert result["status"] == "success"
                # Context mode should influence the analysis
                result_text = json.dumps(result)
                assert mode in result_text or f"{mode}_optimized" in result_text


@pytest.mark.integration
@pytest.mark.strategist
class TestServiceIntegration:
    """Test service-level integration between components."""
    
    @pytest.mark.asyncio
    async def test_get_ward_report_integration(self, mock_ai_services, mock_redis_cache, sample_posts):
        """Test get_ward_report function integration."""
        self._setup_successful_ai_responses(mock_ai_services)
        
        with patch('strategist.cache.r', mock_redis_cache):
            result = await get_ward_report("Jubilee Hills", "detailed", "campaign")
            
            assert result["status"] == "success"
            assert "analysis" in result
            assert "metadata" in result
            
            metadata = result["metadata"]
            assert metadata["ward"] == "Jubilee Hills"
            assert metadata["analysis_depth"] == "detailed"
    
    @pytest.mark.asyncio
    async def test_component_interaction_patterns(self, mock_ai_services, mock_redis_cache):
        """Test interaction patterns between strategist components."""
        # Track component calls
        planner_calls = []
        retriever_calls = []
        nlp_calls = []
        credibility_calls = []
        
        def track_planner_calls(*args, **kwargs):
            planner_calls.append((args, kwargs))
            return Mock(text=json.dumps({"status": "success", "plan": {"queries": ["test"]}}))
        
        def track_retriever_calls(*args, **kwargs):
            retriever_calls.append((args, kwargs))
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json.return_value = {
                "choices": [{"message": {"content": json.dumps({"key_developments": []})}}]
            }
            return mock_response
        
        # Mock component tracking
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = track_planner_calls
        
        mock_ai_services["requests"].post.side_effect = track_retriever_calls
        
        with patch('strategist.cache.r', mock_redis_cache):
            strategist = PoliticalStrategist("Test Ward")
            await strategist.analyze_situation("standard")
            
            # Verify component interaction patterns
            assert len(planner_calls) >= 1  # Planner should be called
            assert len(retriever_calls) >= 1  # Retriever should be called
            
            # Verify proper data flow between components
            # (Implementation details may vary)
    
    def test_nlp_credibility_integration(self):
        """Test integration between NLP and credibility components."""
        nlp = NLPProcessor()
        credibility = CredibilityScorer()
        
        # Test text with political content
        political_text = """
        BJP leader announced infrastructure development in Jubilee Hills.
        The project has received mixed reactions from residents.
        Opposition parties have raised concerns about implementation timeline.
        """
        
        # Extract entities with NLP
        entities = nlp.extract_entities(political_text)
        sentiment = nlp.analyze_sentiment(political_text)
        
        # Assess credibility using NLP results
        source_result = credibility.score_source(
            source_name="Test News Source",
            content=political_text
        )
        
        misinformation_result = credibility.check_misinformation(political_text)
        
        # Verify integration works
        assert "political_parties" in entities
        assert "compound" in sentiment
        assert "overall_score" in source_result
        assert "is_misinformation" in misinformation_result
        
        # Results should be consistent and complementary
        assert isinstance(source_result["overall_score"], float)
        assert isinstance(misinformation_result["is_misinformation"], bool)
    
    @pytest.mark.asyncio
    async def test_error_propagation_through_pipeline(self, mock_ai_services):
        """Test how errors propagate through the pipeline."""
        # Test different error scenarios
        error_scenarios = [
            ("planner_error", "Gemini API Error in planning"),
            ("retriever_error", "Perplexity API Error in retrieval"),
            ("cache_error", "Redis Cache Error")
        ]
        
        for scenario, error_msg in error_scenarios:
            if scenario == "planner_error":
                mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = Exception(error_msg)
            elif scenario == "retriever_error":
                mock_ai_services["requests"].post.side_effect = Exception(error_msg)
            
            strategist = PoliticalStrategist("Test Ward")
            result = await strategist.analyze_situation("standard")
            
            # Should handle errors gracefully
            assert result["status"] == "error"
            assert "error" in result
            assert error_msg in result["error"] or scenario in result.get("error_type", "")
    
    def _setup_successful_ai_responses(self, mock_ai_services):
        """Helper method to set up successful AI service responses."""
        # Mock successful Gemini responses
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = [
            Mock(text=json.dumps({
                "status": "success",
                "plan": {
                    "queries": ["test query 1", "test query 2"],
                    "analysis_depth": "standard",
                    "confidence_threshold": 0.7
                }
            })),
            Mock(text=json.dumps({
                "status": "success",
                "briefing": {
                    "strategic_overview": "Comprehensive analysis",
                    "key_intelligence": [{
                        "category": "public_sentiment",
                        "content": "Positive sentiment regarding development",
                        "confidence": 0.85
                    }],
                    "opportunities": [{
                        "description": "Infrastructure messaging opportunity",
                        "priority": 1
                    }],
                    "threats": [{
                        "description": "Opposition criticism risk",
                        "severity": "medium"
                    }],
                    "recommended_actions": [{
                        "category": "immediate",
                        "description": "Launch public consultation",
                        "timeline": "48h"
                    }],
                    "confidence_score": 0.82
                }
            }))
        ]
        
        # Mock successful Perplexity response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": json.dumps({
                "key_developments": [{
                    "headline": "Infrastructure project approved",
                    "source": "Local News",
                    "credibility_score": 0.9,
                    "relevance": 0.85
                }],
                "sentiment_analysis": {
                    "positive": 0.6,
                    "neutral": 0.3,
                    "negative": 0.1
                },
                "entity_mentions": {
                    "political_parties": {"BJP": 5, "TRS": 3},
                    "key_issues": {"infrastructure": 8, "development": 6}
                }
            })}}]
        }
        mock_ai_services["requests"].post.return_value = mock_response


@pytest.mark.integration
@pytest.mark.strategist
class TestDataConsistency:
    """Test data consistency across pipeline components."""
    
    @pytest.mark.asyncio
    async def test_ward_context_consistency(self, mock_ai_services, mock_redis_cache):
        """Test that ward context is maintained throughout pipeline."""
        test_ward = "Consistency Test Ward"
        
        # Setup mock responses that should preserve ward context
        self._setup_ward_consistent_responses(mock_ai_services, test_ward)
        
        with patch('strategist.cache.r', mock_redis_cache):
            strategist = PoliticalStrategist(test_ward)
            result = await strategist.analyze_situation("standard")
            
            # Ward context should be preserved throughout
            assert result["metadata"]["ward"] == test_ward
            result_str = json.dumps(result)
            assert test_ward in result_str or "Consistency Test Ward" in result_str
    
    @pytest.mark.asyncio
    async def test_timestamp_consistency(self, mock_ai_services, mock_redis_cache):
        """Test that timestamps are consistent across pipeline."""
        self._setup_successful_ai_responses_with_timestamps(mock_ai_services)
        
        with patch('strategist.cache.r', mock_redis_cache):
            strategist = PoliticalStrategist("Test Ward")
            
            start_time = datetime.now(timezone.utc)
            result = await strategist.analyze_situation("standard")
            end_time = datetime.now(timezone.utc)
            
            # Should have valid timestamps
            assert "timestamp" in result["metadata"]
            result_timestamp = datetime.fromisoformat(result["metadata"]["timestamp"].replace('Z', '+00:00'))
            
            # Timestamp should be within the execution window
            assert start_time <= result_timestamp <= end_time
    
    @pytest.mark.asyncio
    async def test_confidence_score_consistency(self, mock_ai_services, mock_redis_cache):
        """Test that confidence scores are consistent across components."""
        # Mock responses with known confidence scores
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = Mock(
            text=json.dumps({
                "status": "success",
                "plan": {"queries": ["test"], "confidence_threshold": 0.8}
            })
        )
        
        with patch('strategist.cache.r', mock_redis_cache):
            strategist = PoliticalStrategist("Test Ward")
            result = await strategist.analyze_situation("standard")
            
            if result["status"] == "success":
                # Should have overall confidence score
                assert "confidence_score" in result["metadata"]
                confidence = result["metadata"]["confidence_score"]
                assert 0.0 <= confidence <= 1.0
    
    def _setup_ward_consistent_responses(self, mock_ai_services, ward_name):
        """Helper to setup ward-consistent mock responses."""
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = [
            Mock(text=json.dumps({
                "status": "success",
                "plan": {
                    "queries": [f"Political developments in {ward_name}"],
                    "ward_context": ward_name
                }
            })),
            Mock(text=json.dumps({
                "status": "success",
                "briefing": {
                    "strategic_overview": f"Analysis for {ward_name}",
                    "ward": ward_name,
                    "confidence_score": 0.8
                }
            }))
        ]
    
    def _setup_successful_ai_responses_with_timestamps(self, mock_ai_services):
        """Helper to setup AI responses with timestamps."""
        current_time = datetime.now(timezone.utc).isoformat()
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = [
            Mock(text=json.dumps({
                "status": "success",
                "plan": {"queries": ["test"], "timestamp": current_time}
            })),
            Mock(text=json.dumps({
                "status": "success",
                "briefing": {"strategic_overview": "Test", "generated_at": current_time, "confidence_score": 0.8}
            }))
        ]


@pytest.mark.integration
@pytest.mark.strategist
@pytest.mark.slow
class TestPerformanceIntegration:
    """Test performance characteristics of integrated pipeline."""
    
    @pytest.mark.asyncio
    async def test_pipeline_performance_benchmarks(self, mock_ai_services, mock_redis_cache):
        """Test pipeline performance meets benchmarks."""
        self._setup_successful_ai_responses(mock_ai_services)
        
        import time
        
        with patch('strategist.cache.r', mock_redis_cache):
            strategist = PoliticalStrategist("Performance Test Ward")
            
            # Test different analysis depths
            depth_benchmarks = {
                "quick": 2.0,      # Should complete in under 2 seconds
                "standard": 5.0,   # Should complete in under 5 seconds  
                "detailed": 10.0,  # Should complete in under 10 seconds
                "comprehensive": 15.0  # Should complete in under 15 seconds
            }
            
            for depth, benchmark in depth_benchmarks.items():
                start_time = time.time()
                result = await strategist.analyze_situation(depth)
                end_time = time.time()
                
                processing_time = end_time - start_time
                assert processing_time < benchmark, f"{depth} analysis took {processing_time:.2f}s, expected <{benchmark}s"
                assert result["status"] == "success"
    
    @pytest.mark.asyncio
    async def test_concurrent_pipeline_execution(self, mock_ai_services, mock_redis_cache):
        """Test concurrent pipeline execution performance."""
        self._setup_successful_ai_responses(mock_ai_services)
        
        import time
        
        with patch('strategist.cache.r', mock_redis_cache):
            # Create multiple concurrent analysis requests
            strategists = [PoliticalStrategist(f"Ward {i}") for i in range(5)]
            
            start_time = time.time()
            
            tasks = [s.analyze_situation("standard") for s in strategists]
            results = await asyncio.gather(*tasks)
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Concurrent execution should be more efficient than sequential
            assert total_time < 15.0, f"Concurrent execution took {total_time:.2f}s, expected <15s"
            
            # All results should be successful
            for result in results:
                assert result["status"] == "success"
    
    @pytest.mark.asyncio
    async def test_memory_usage_under_load(self, mock_ai_services, mock_redis_cache):
        """Test memory usage under high load."""
        import tracemalloc
        
        self._setup_successful_ai_responses(mock_ai_services)
        
        tracemalloc.start()
        
        with patch('strategist.cache.r', mock_redis_cache):
            # Run multiple analysis cycles
            for i in range(10):
                strategist = PoliticalStrategist(f"Load Test Ward {i}")
                await strategist.analyze_situation("standard")
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        # Memory usage should be reasonable (less than 200MB for this test)
        assert peak < 200 * 1024 * 1024, f"Peak memory usage too high: {peak / 1024 / 1024:.2f}MB"
    
    def _setup_successful_ai_responses(self, mock_ai_services):
        """Helper method for performance tests."""
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = Mock(
            text=json.dumps({
                "status": "success",
                "plan": {"queries": ["performance test"], "analysis_depth": "standard"}
            })
        )
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": json.dumps({"key_developments": []})}}]
        }
        mock_ai_services["requests"].post.return_value = mock_response
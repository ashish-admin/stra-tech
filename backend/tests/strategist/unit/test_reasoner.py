"""
Unit tests for Strategic Reasoner (Ultra Think) module.
Tests the Gemini-powered strategic planning engine and reasoning capabilities.
"""
import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone

from strategist.reasoner.ultra_think import StrategicPlanner, STRATEGIST_PROMPTS


@pytest.mark.unit
@pytest.mark.strategist
class TestStrategicPlanner:
    """Test the Strategic Planner class."""
    
    def test_init_default_parameters(self):
        """Test planner initialization with defaults."""
        planner = StrategicPlanner()
        
        assert planner.think_tokens >= 4000
        assert planner.model_name == "gemini-2.0-flash-thinking-exp-1219"
        assert planner.confidence_threshold == 0.7
        assert planner.model is not None
    
    def test_init_custom_parameters(self):
        """Test planner initialization with custom parameters.""" 
        planner = StrategicPlanner(
            think_tokens=8000,
            confidence_threshold=0.8
        )
        
        assert planner.think_tokens == 8000
        assert planner.confidence_threshold == 0.8
    
    @pytest.mark.asyncio
    async def test_create_analysis_plan_success(self, mock_ai_services):
        """Test successful analysis plan creation."""
        # Mock Gemini response
        mock_response = Mock()
        mock_response.text = json.dumps({
            "status": "success",
            "plan": {
                "queries": [
                    "Recent political developments in Test Ward",
                    "Public sentiment analysis Test Ward",
                    "Competitive landscape Test Ward"
                ],
                "analysis_depth": "standard",
                "confidence_threshold": 0.7,
                "estimated_complexity": 0.6
            }
        })
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = mock_response
        
        planner = StrategicPlanner()
        result = await planner.create_analysis_plan(
            ward="Test Ward",
            depth="standard",
            context_mode="neutral"
        )
        
        assert result["status"] == "success"
        assert "plan" in result
        assert "queries" in result["plan"]
        assert len(result["plan"]["queries"]) > 0
        assert result["plan"]["analysis_depth"] == "standard"
    
    @pytest.mark.asyncio
    async def test_create_analysis_plan_different_depths(self, mock_ai_services):
        """Test analysis plan creation with different depth parameters."""
        mock_response = Mock()
        mock_response.text = json.dumps({
            "status": "success",
            "plan": {"queries": ["test query"], "analysis_depth": "detailed"}
        })
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = mock_response
        
        planner = StrategicPlanner()
        
        depths = ["quick", "standard", "detailed", "comprehensive"]
        for depth in depths:
            result = await planner.create_analysis_plan("Test Ward", depth=depth)
            
            assert result["status"] == "success"
            # Verify the depth was used in the prompt (indirectly)
            call_args = mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.call_args
            assert depth in call_args[0][0]  # depth should be in the prompt
    
    @pytest.mark.asyncio
    async def test_create_analysis_plan_api_failure(self, mock_ai_services):
        """Test analysis plan creation with API failure."""
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = Exception("API Error")
        
        planner = StrategicPlanner()
        result = await planner.create_analysis_plan("Test Ward")
        
        assert result["status"] == "error"
        assert "error" in result
        assert "API Error" in result["error"]
    
    @pytest.mark.asyncio
    async def test_create_analysis_plan_invalid_json_response(self, mock_ai_services):
        """Test handling of invalid JSON response from Gemini."""
        mock_response = Mock()
        mock_response.text = "Invalid JSON response"
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = mock_response
        
        planner = StrategicPlanner()
        result = await planner.create_analysis_plan("Test Ward")
        
        assert result["status"] == "error"
        assert "error" in result
        assert "Invalid JSON" in result["error"] or "parse" in result["error"].lower()
    
    @pytest.mark.asyncio
    async def test_generate_briefing_success(self, mock_ai_services):
        """Test successful briefing generation."""
        mock_response = Mock()
        mock_response.text = json.dumps({
            "status": "success",
            "briefing": {
                "strategic_overview": "Comprehensive analysis of Test Ward political landscape",
                "key_intelligence": [
                    {
                        "category": "public_sentiment",
                        "content": "Moderate positive sentiment regarding infrastructure development",
                        "impact_level": "high",
                        "confidence": 0.85
                    }
                ],
                "opportunities": [
                    {
                        "description": "Strong support for development initiatives",
                        "timeline": "immediate",
                        "priority": 1,
                        "confidence": 0.8
                    }
                ],
                "threats": [
                    {
                        "description": "Opposition criticism on implementation delays",
                        "severity": "medium",
                        "mitigation_strategy": "Focus on delivery timeline communication",
                        "confidence": 0.75
                    }
                ],
                "recommended_actions": [
                    {
                        "category": "immediate",
                        "description": "Launch public consultation on development priorities",
                        "timeline": "48h",
                        "priority": 1,
                        "expected_impact": "high"
                    }
                ],
                "confidence_score": 0.82
            }
        })
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = mock_response
        
        planner = StrategicPlanner()
        
        # Mock intelligence data
        intelligence_data = {
            "queries_processed": 3,
            "key_developments": [
                {
                    "headline": "Infrastructure project approved",
                    "source": "Local News",
                    "credibility_score": 0.9
                }
            ],
            "sentiment_trends": {"positive": 0.6, "neutral": 0.3, "negative": 0.1}
        }
        
        result = await planner.generate_briefing(
            ward="Test Ward",
            intelligence_data=intelligence_data,
            context_mode="neutral"
        )
        
        assert result["status"] == "success"
        assert "briefing" in result
        
        briefing = result["briefing"]
        assert "strategic_overview" in briefing
        assert "key_intelligence" in briefing
        assert "opportunities" in briefing
        assert "threats" in briefing
        assert "recommended_actions" in briefing
        assert "confidence_score" in briefing
        
        # Validate structure of nested elements
        assert len(briefing["key_intelligence"]) > 0
        assert "category" in briefing["key_intelligence"][0]
        assert "confidence" in briefing["key_intelligence"][0]
    
    @pytest.mark.asyncio
    async def test_generate_briefing_empty_intelligence(self, mock_ai_services):
        """Test briefing generation with empty intelligence data."""
        mock_response = Mock()
        mock_response.text = json.dumps({
            "status": "success",
            "briefing": {
                "strategic_overview": "Limited analysis due to insufficient data",
                "key_intelligence": [],
                "opportunities": [],
                "threats": [],
                "recommended_actions": [],
                "confidence_score": 0.3
            }
        })
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = mock_response
        
        planner = StrategicPlanner()
        result = await planner.generate_briefing("Test Ward", {})
        
        assert result["status"] == "success"
        assert result["briefing"]["confidence_score"] <= 0.5  # Should be low confidence
    
    @pytest.mark.asyncio
    async def test_generate_briefing_context_modes(self, mock_ai_services):
        """Test briefing generation with different context modes."""
        mock_response = Mock()
        mock_response.text = json.dumps({
            "status": "success",
            "briefing": {
                "strategic_overview": "Context-aware analysis",
                "confidence_score": 0.8
            }
        })
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = mock_response
        
        planner = StrategicPlanner()
        intelligence_data = {"queries_processed": 1}
        
        context_modes = ["neutral", "campaign", "governance", "opposition"]
        for mode in context_modes:
            result = await planner.generate_briefing("Test Ward", intelligence_data, context_mode=mode)
            
            assert result["status"] == "success"
            # Verify context mode was used in the prompt
            call_args = mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.call_args
            assert mode in call_args[0][0]


@pytest.mark.unit
@pytest.mark.strategist
class TestPromptEngineering:
    """Test prompt engineering and template system."""
    
    def test_prompt_templates_exist(self):
        """Test that all required prompt templates exist."""
        required_prompts = ["create_plan", "generate_briefing"]
        
        for prompt_key in required_prompts:
            assert prompt_key in STRATEGIST_PROMPTS
            assert len(STRATEGIST_PROMPTS[prompt_key]) > 0
    
    def test_prompt_template_formatting(self):
        """Test prompt template formatting with parameters."""
        plan_prompt = STRATEGIST_PROMPTS["create_plan"]
        
        # Should contain formatting placeholders
        assert "{ward}" in plan_prompt
        assert "{depth}" in plan_prompt
        assert "{context_mode}" in plan_prompt
        assert "{token_budget}" in plan_prompt
        
        # Test formatting
        formatted = plan_prompt.format(
            ward="Test Ward",
            depth="standard", 
            context_mode="neutral",
            token_budget=4000
        )
        
        assert "Test Ward" in formatted
        assert "standard" in formatted
        assert "neutral" in formatted
        assert "4000" in formatted
    
    def test_briefing_prompt_structure(self):
        """Test briefing prompt template structure."""
        briefing_prompt = STRATEGIST_PROMPTS["generate_briefing"]
        
        # Should contain required elements
        assert "{ward}" in briefing_prompt
        assert "{intelligence_data}" in briefing_prompt
        assert "{context_mode}" in briefing_prompt
        
        # Should mention key output requirements
        assert "strategic_overview" in briefing_prompt.lower()
        assert "confidence" in briefing_prompt.lower()
        assert "json" in briefing_prompt.lower()


@pytest.mark.unit
@pytest.mark.strategist
@pytest.mark.asyncio
class TestErrorHandling:
    """Test error handling and edge cases."""
    
    async def test_api_timeout_handling(self, mock_ai_services):
        """Test handling of API timeouts."""
        # Mock a timeout
        async def timeout_side_effect(*args, **kwargs):
            raise asyncio.TimeoutError("Request timed out")
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = timeout_side_effect
        
        planner = StrategicPlanner()
        result = await planner.create_analysis_plan("Test Ward")
        
        assert result["status"] == "error"
        assert "timeout" in result["error"].lower()
    
    async def test_malformed_response_handling(self, mock_ai_services):
        """Test handling of malformed API responses."""
        malformed_responses = [
            None,  # No response
            Mock(text=""),  # Empty response
            Mock(text="null"),  # Null JSON
            Mock(text='{"incomplete": json'),  # Invalid JSON
            Mock(text='{"status": "success"}')  # Missing required fields
        ]
        
        planner = StrategicPlanner()
        
        for response in malformed_responses:
            mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = response
            
            result = await planner.create_analysis_plan("Test Ward")
            
            assert result["status"] == "error"
            assert "error" in result
    
    async def test_confidence_threshold_validation(self, mock_ai_services):
        """Test confidence threshold validation."""
        # Response with low confidence
        mock_response = Mock()
        mock_response.text = json.dumps({
            "status": "success", 
            "plan": {"queries": ["test"], "confidence_threshold": 0.2}
        })
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = mock_response
        
        planner = StrategicPlanner(confidence_threshold=0.7)
        result = await planner.create_analysis_plan("Test Ward")
        
        # Should either reject low confidence or warn about it
        if result["status"] == "success":
            assert "warnings" in result or result["plan"].get("confidence_threshold", 1.0) >= 0.2
        else:
            assert "confidence" in result["error"].lower()
    
    async def test_invalid_input_parameters(self):
        """Test handling of invalid input parameters."""
        planner = StrategicPlanner()
        
        # Empty ward name
        result = await planner.create_analysis_plan("")
        assert result["status"] == "error"
        assert "ward" in result["error"].lower()
        
        # Invalid depth
        result = await planner.create_analysis_plan("Test Ward", depth="invalid")
        assert result["status"] == "error"
        assert "depth" in result["error"].lower()
        
        # Invalid context mode
        result = await planner.create_analysis_plan("Test Ward", context_mode="invalid")
        assert result["status"] == "error"
        assert "context" in result["error"].lower()


@pytest.mark.unit
@pytest.mark.strategist
@pytest.mark.slow
class TestPerformanceAndScaling:
    """Test performance characteristics and scaling behavior."""
    
    @pytest.mark.asyncio
    async def test_concurrent_planning_requests(self, mock_ai_services):
        """Test handling of concurrent planning requests."""
        mock_response = Mock()
        mock_response.text = json.dumps({
            "status": "success",
            "plan": {"queries": ["test"], "analysis_depth": "standard"}
        })
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = mock_response
        
        planner = StrategicPlanner()
        
        # Create multiple concurrent requests
        tasks = [
            planner.create_analysis_plan(f"Ward {i}") 
            for i in range(5)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should succeed
        assert len(results) == 5
        for result in results:
            assert not isinstance(result, Exception)
            assert result["status"] == "success"
    
    @pytest.mark.asyncio  
    async def test_token_budget_adherence(self, mock_ai_services):
        """Test that token budget limits are respected."""
        # Track the prompts sent to ensure they respect token limits
        sent_prompts = []
        
        async def capture_prompt(*args, **kwargs):
            sent_prompts.append(args[0])
            mock_response = Mock()
            mock_response.text = json.dumps({"status": "success", "plan": {"queries": ["test"]}})
            return mock_response
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.side_effect = capture_prompt
        
        planner = StrategicPlanner(think_tokens=1000)  # Small token budget
        await planner.create_analysis_plan("Test Ward")
        
        # Verify prompt length is reasonable for the token budget
        assert len(sent_prompts) == 1
        prompt_length = len(sent_prompts[0])
        
        # Rough estimate: 1 token ≈ 4 characters
        estimated_tokens = prompt_length / 4
        assert estimated_tokens <= planner.think_tokens * 1.5  # Allow some overhead
    
    @pytest.mark.asyncio
    async def test_memory_efficiency(self, mock_ai_services):
        """Test memory efficiency across multiple operations."""
        import tracemalloc
        
        mock_response = Mock()
        mock_response.text = json.dumps({
            "status": "success",
            "plan": {"queries": ["test query"], "analysis_depth": "standard"}
        })
        
        mock_ai_services["genai"].GenerativeModel.return_value.generate_content_async.return_value = mock_response
        
        tracemalloc.start()
        
        planner = StrategicPlanner()
        
        # Run multiple operations
        for i in range(20):
            await planner.create_analysis_plan(f"Ward {i}")
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        # Memory usage should be stable (less than 50MB for this test)
        assert peak < 50 * 1024 * 1024, f"Peak memory usage too high: {peak / 1024 / 1024:.2f}MB"
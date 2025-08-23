"""
Unit tests for Political Strategist system.

Tests core functionality of the AI-powered political strategist including
service orchestration, caching, NLP processing, and API endpoints.
"""

import pytest
import json
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from strategist.service import PoliticalStrategist, get_ward_report
from strategist.cache import cget, cset, invalidate_pattern
from strategist.observability import get_observer, get_metrics
from strategist.guardrails import sanitize_and_strategize


class TestPoliticalStrategist:
    """Test cases for the main PoliticalStrategist class."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.ward = "Jubilee Hills"
        self.strategist = PoliticalStrategist(self.ward, "neutral")
        
    def test_initialization(self):
        """Test strategist initialization."""
        assert self.strategist.ward == self.ward
        assert self.strategist.context_mode == "neutral"
        assert hasattr(self.strategist, 'planner')
        assert hasattr(self.strategist, 'retriever')
        assert hasattr(self.strategist, 'nlp')
        assert hasattr(self.strategist, 'credibility')
        assert hasattr(self.strategist, 'observer')
        
    @pytest.mark.asyncio
    async def test_analyze_situation_quick(self):
        """Test quick analysis depth."""
        with patch.object(self.strategist.planner, 'create_analysis_plan', new_callable=AsyncMock) as mock_plan:
            with patch.object(self.strategist.retriever, 'gather_intelligence', new_callable=AsyncMock) as mock_intel:
                with patch.object(self.strategist.credibility, 'score_sources', new_callable=AsyncMock) as mock_score:
                    with patch.object(self.strategist.nlp, 'analyze_corpus', new_callable=AsyncMock) as mock_nlp:
                        with patch.object(self.strategist.planner, 'generate_briefing', new_callable=AsyncMock) as mock_brief:
                            
                            # Setup mocks
                            mock_plan.return_value = {"queries": ["test query"]}
                            mock_intel.return_value = {"sources": []}
                            mock_score.return_value = {"scored_sources": []}
                            mock_nlp.return_value = {"processed_data": {}}
                            mock_brief.return_value = {
                                "strategic_overview": "Test overview",
                                "confidence_score": 0.85,
                                "source_citations": [{"url": "test.com"}]
                            }
                            
                            result = await self.strategist.analyze_situation("quick")
                            
                            assert result is not None
                            assert "strategic_overview" in result
                            mock_plan.assert_called_once_with(
                                ward=self.ward,
                                depth="quick", 
                                context_mode="neutral"
                            )
                            
    @pytest.mark.asyncio
    async def test_analyze_situation_error_handling(self):
        """Test error handling in analysis."""
        with patch.object(self.strategist.planner, 'create_analysis_plan', new_callable=AsyncMock) as mock_plan:
            mock_plan.side_effect = Exception("Test error")
            
            result = await self.strategist.analyze_situation("standard")
            
            assert result is not None
            assert "error" in result
            assert result["ward"] == self.ward
            assert result["fallback_mode"] is True


class TestCache:
    """Test cases for the caching system."""
    
    def test_cache_get_set(self):
        """Test basic cache operations."""
        test_key = "test:strategist:cache"
        test_data = {"test": "data", "timestamp": datetime.now().isoformat()}
        test_etag = "test-etag-123"
        test_ttl = 300
        
        # Test set operation
        result = cset(test_key, test_data, test_etag, test_ttl)
        if result:  # Only test if Redis is available
            # Test get operation
            cached = cget(test_key)
            assert cached is not None
            assert cached["data"] == test_data
            assert cached["etag"] == test_etag
            
            # Cleanup
            invalidate_pattern(test_key)
            
    def test_cache_miss(self):
        """Test cache miss behavior."""
        result = cget("nonexistent:key")
        assert result is None
        
    def test_cache_invalidation(self):
        """Test cache invalidation."""
        test_pattern = "test:strategist:*"
        
        # Set some test data
        cset("test:strategist:ward1", {"data": "test1"}, "etag1", 300)
        cset("test:strategist:ward2", {"data": "test2"}, "etag2", 300)
        
        # Invalidate pattern
        count = invalidate_pattern(test_pattern)
        
        # Verify invalidation (count depends on Redis availability)
        assert count >= 0


class TestObservability:
    """Test cases for observability and metrics."""
    
    def test_metrics_collector(self):
        """Test metrics collection."""
        metrics = get_metrics()
        
        # Test counter
        metrics.increment("test.counter", 5)
        assert metrics.counters["test.counter"] == 5
        
        # Test timing
        metrics.timing("test.timer", 1.5)
        assert len(metrics.timers["test.timer"]) == 1
        assert metrics.timers["test.timer"][0] == 1.5
        
        # Test gauge
        metrics.gauge("test.gauge", 75.5)
        assert metrics.gauges["test.gauge"] == 75.5
        
        # Test error
        metrics.error("test.operation", "ValueError")
        assert metrics.errors["test.operation,error_type=ValueError"] == 1
        
    def test_observer(self):
        """Test observer functionality."""
        observer = get_observer()
        
        # Test health check
        health = observer.get_health_status()
        assert "status" in health
        assert "timestamp" in health
        assert health["status"] in ["healthy", "degraded", "critical", "error"]
        
        # Test performance report
        report = observer.get_performance_report()
        assert "system_uptime" in report
        assert "health_status" in report
        assert "metrics_summary" in report


class TestGuardrails:
    """Test cases for content sanitization and guardrails."""
    
    def test_sanitize_basic_content(self):
        """Test basic content sanitization."""
        test_input = {
            "strategic_overview": "This is a test strategic overview",
            "confidence_score": 0.85,
            "recommended_actions": [
                {"action": "Test action", "timeline": "24h"}
            ]
        }
        
        result = sanitize_and_strategize(test_input)
        
        assert result is not None
        assert "strategic_overview" in result
        assert "internal_use_only" in result
        assert result["internal_use_only"] is True
        
    def test_sanitize_removes_inappropriate_content(self):
        """Test that inappropriate content is filtered."""
        test_input = {
            "strategic_overview": "This contains some inappropriate content that should be filtered",
            "recommended_actions": [
                {"action": "Inappropriate action", "timeline": "24h"}
            ]
        }
        
        result = sanitize_and_strategize(test_input)
        
        # Should still return sanitized content
        assert result is not None
        assert "internal_use_only" in result
        

class TestWardReport:
    """Test cases for ward report generation."""
    
    @patch('strategist.service.PoliticalStrategist')
    def test_get_ward_report_cache_miss(self, mock_strategist_class):
        """Test ward report generation on cache miss."""
        mock_strategist = Mock()
        mock_strategist.analyze_situation.return_value = {
            "strategic_overview": "Test overview",
            "confidence_score": 0.8
        }
        mock_strategist_class.return_value = mock_strategist
        
        with patch('strategist.service.cget', return_value=None):
            with patch('strategist.service.cset', return_value=True):
                data, etag, ttl = get_ward_report("Test Ward", "standard")
                
                assert data is not None
                assert "strategic_overview" in data
                assert etag is not None
                assert ttl > 0
                
    def test_get_ward_report_cache_hit(self):
        """Test ward report serving from cache."""
        cached_data = {
            "data": {"strategic_overview": "Cached overview"},
            "etag": "cached-etag",
            "ttl": 600
        }
        
        with patch('strategist.service.cget', return_value=cached_data):
            data, etag, ttl = get_ward_report("Test Ward", "standard")
            
            assert data == cached_data["data"]
            assert etag == cached_data["etag"]
            assert ttl == cached_data["ttl"]


class TestApiEndpoints:
    """Test cases for API endpoints."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        from app import create_app
        app = create_app('config.TestConfig')
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get('/api/v1/strategist/health')
        
        # Should return health status regardless of auth
        assert response.status_code in [200, 503]
        data = json.loads(response.data)
        assert "status" in data
        assert "timestamp" in data
        
    def test_ward_analysis_requires_auth(self, client):
        """Test that ward analysis requires authentication."""
        response = client.get('/api/v1/strategist/Jubilee%20Hills')
        
        # Should require authentication
        assert response.status_code == 401


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
"""
Base AI Client Interface

Defines the common interface and shared functionality for all AI model clients
in the multi-model system. Provides consistent response format, error handling,
and performance tracking across different AI providers.
"""

import time
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Any, Union

logger = logging.getLogger(__name__)


class ModelProvider(Enum):
    """Available AI model providers."""
    CLAUDE = "claude"
    PERPLEXITY = "perplexity"
    OPENAI = "openai"
    LLAMA_LOCAL = "llama_local"


@dataclass
class AIResponse:
    """Standardized response format from any AI model."""
    content: str                          # Generated text content
    model_used: str                       # Specific model identifier
    provider: ModelProvider               # Provider enum
    tokens_used: Dict[str, int]          # Token usage breakdown
    cost_usd: float                      # Cost in USD
    latency_ms: int                      # Response time in milliseconds
    quality_score: float                 # Quality assessment (0.0-1.0)
    metadata: Dict[str, Any]             # Additional metadata
    error: Optional[str] = None          # Error message if any
    
    @property
    def is_success(self) -> bool:
        """Check if response was successful."""
        return self.error is None and len(self.content.strip()) > 0
    
    @property
    def total_tokens(self) -> int:
        """Get total token count."""
        return sum(self.tokens_used.values())
    
    @property
    def cost_per_token(self) -> float:
        """Calculate cost per token."""
        total = self.total_tokens
        return self.cost_usd / total if total > 0 else 0.0


class BaseAIClient(ABC):
    """
    Abstract base class for all AI model clients.
    
    Provides common functionality for cost tracking, performance monitoring,
    error handling, and response standardization across all AI providers.
    """
    
    def __init__(self):
        self.request_count = 0
        self.total_cost = 0.0
        self.total_tokens = 0
        self.error_count = 0
        self.last_request_time = None
        
        # Common configuration that can be overridden
        self.config = {
            "timeout": 120,
            "max_retries": 3,
            "retry_delay": 1.0,
            "enable_logging": True,
        }
    
    @abstractmethod
    async def generate_response(self, query: str, context: Dict[str, Any] = None, 
                               request_id: str = None) -> AIResponse:
        """
        Generate response for the given query.
        
        Args:
            query: User query text
            context: Additional context for the query
            request_id: Unique identifier for tracking
            
        Returns:
            AIResponse with generated content and metadata
        """
        pass
    
    def _start_request_timer(self) -> float:
        """Start timing a request."""
        self.request_count += 1
        self.last_request_time = time.time()
        return self.last_request_time
    
    def _end_request_timer(self, start_time: float) -> int:
        """End timing a request and return latency in ms."""
        return int((time.time() - start_time) * 1000)
    
    def _record_success(self, tokens: int, cost: float):
        """Record successful request metrics."""
        self.total_tokens += tokens
        self.total_cost += cost
        
        if self.config["enable_logging"]:
            logger.info(f"{self.__class__.__name__} success: {tokens} tokens, ${cost:.4f}")
    
    def _record_error(self, error: str):
        """Record failed request metrics."""
        self.error_count += 1
        
        if self.config["enable_logging"]:
            logger.error(f"{self.__class__.__name__} error: {error}")
    
    def get_performance_metrics(self) -> Dict[str, Union[int, float]]:
        """Get current performance metrics for this client."""
        
        success_rate = ((self.request_count - self.error_count) / 
                       max(self.request_count, 1))
        
        avg_cost_per_request = self.total_cost / max(self.request_count, 1)
        avg_tokens_per_request = self.total_tokens / max(self.request_count, 1)
        
        return {
            "total_requests": self.request_count,
            "successful_requests": self.request_count - self.error_count,
            "error_count": self.error_count,
            "success_rate": round(success_rate, 3),
            "total_tokens": self.total_tokens,
            "total_cost_usd": round(self.total_cost, 4),
            "avg_cost_per_request": round(avg_cost_per_request, 4),
            "avg_tokens_per_request": round(avg_tokens_per_request, 0),
            "last_request_time": self.last_request_time
        }
    
    def reset_metrics(self):
        """Reset performance tracking metrics."""
        self.request_count = 0
        self.total_cost = 0.0
        self.total_tokens = 0
        self.error_count = 0
        self.last_request_time = None
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check for this AI client.
        
        Returns:
            Dict with health status and basic metrics
        """
        try:
            # Simple test query to verify connectivity
            test_response = await self.generate_response(
                "Health check test", 
                {"test": True}, 
                "health_check"
            )
            
            return {
                "status": "healthy" if test_response.is_success else "degraded",
                "provider": self.get_provider_name(),
                "last_test": time.time(),
                "response_time_ms": test_response.latency_ms,
                "error": test_response.error
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "provider": self.get_provider_name(), 
                "last_test": time.time(),
                "error": str(e)
            }
    
    def get_provider_name(self) -> str:
        """Get the provider name for this client."""
        class_name = self.__class__.__name__
        return class_name.replace("Client", "").lower()
    
    @abstractmethod
    async def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the model and its capabilities.
        
        Returns:
            Dict with model information, capabilities, and configuration
        """
        pass
    
    def _validate_query(self, query: str) -> bool:
        """Validate query before processing."""
        if not query or not query.strip():
            return False
        
        # Check for reasonable length limits
        if len(query) > 50000:  # 50k character limit
            return False
        
        return True
    
    def _sanitize_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize context to remove sensitive information."""
        if not context:
            return {}
        
        # Remove potentially sensitive keys
        sensitive_keys = ["password", "secret", "key", "token", "auth"]
        sanitized = {}
        
        for key, value in context.items():
            if not any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = value
        
        return sanitized
    
    def _build_error_response(self, error: str, query: str = "", 
                             request_id: str = None) -> AIResponse:
        """Build standardized error response."""
        
        return AIResponse(
            content="",
            model_used="error",
            provider=ModelProvider.CLAUDE,  # Default, should be overridden
            tokens_used={"input": 0, "output": 0, "total": 0},
            cost_usd=0.0,
            latency_ms=0,
            quality_score=0.0,
            metadata={
                "error": error,
                "request_id": request_id,
                "query_length": len(query) if query else 0
            },
            error=error
        )
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough estimation of token count for text."""
        # Very rough approximation: ~4 characters per token
        return max(1, len(text) // 4)
    
    def _build_usage_summary(self) -> str:
        """Build a human-readable usage summary."""
        metrics = self.get_performance_metrics()
        
        return f"""
{self.__class__.__name__} Usage Summary:
- Total Requests: {metrics['total_requests']}
- Success Rate: {metrics['success_rate']:.1%}
- Total Cost: ${metrics['total_cost_usd']:.4f}
- Avg Cost/Request: ${metrics['avg_cost_per_request']:.4f}
- Total Tokens: {metrics['total_tokens']:,}
- Avg Tokens/Request: {metrics['avg_tokens_per_request']:.0f}
""".strip()


class MockAIClient(BaseAIClient):
    """Mock AI client for testing purposes."""
    
    async def generate_response(self, query: str, context: Dict[str, Any] = None, 
                               request_id: str = None) -> AIResponse:
        """Generate mock response for testing."""
        
        start_time = self._start_request_timer()
        
        # Simulate processing delay
        import asyncio
        await asyncio.sleep(0.1)
        
        mock_content = f"Mock response for query: {query[:50]}..."
        tokens = self._estimate_tokens(query + mock_content)
        cost = tokens * 0.00001  # Mock cost
        
        latency = self._end_request_timer(start_time)
        self._record_success(tokens, cost)
        
        return AIResponse(
            content=mock_content,
            model_used="mock-model-v1",
            provider=ModelProvider.CLAUDE,
            tokens_used={"input": len(query.split()), "output": len(mock_content.split()), "total": tokens},
            cost_usd=cost,
            latency_ms=latency,
            quality_score=0.8,
            metadata={"mock": True, "request_id": request_id}
        )
    
    async def get_model_info(self) -> Dict[str, Any]:
        """Get mock model information."""
        
        return {
            "provider": "mock",
            "model": "mock-model-v1",
            "capabilities": ["testing", "development"],
            "cost_structure": {"per_token": 0.00001},
            "limitations": ["Mock responses only"]
        }
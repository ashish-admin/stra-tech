"""
Multi-Model AI Orchestration Service

This module provides the core orchestration engine for the multi-model AI system,
coordinating between Claude, Perplexity, OpenAI, and local Llama 4 models based on
query complexity, cost constraints, and quality requirements.

Key Features:
- Intelligent routing based on query analysis
- Cost optimization with budget tracking
- Cascade fallback system for high availability
- Real-time quality monitoring and validation
- Cross-model consistency checking
"""

import logging
import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass
from enum import Enum

from flask import current_app
from sqlalchemy import desc

from ..models import (
    EmbeddingStore, AIModelExecution, GeopoliticalReport, 
    BudgetTracker, db
)
from ..extensions import redis_client

# Import AI service clients (will be created)
from .claude_client import ClaudeClient
from .perplexity_client import PerplexityClient  
from .openai_client import OpenAIClient
from .llama_client import LlamaClient
from .budget_manager import BudgetManager
from .quality_validator import QualityValidator

logger = logging.getLogger(__name__)


class QueryComplexity(Enum):
    """Query complexity levels for routing decisions."""
    SIMPLE = "simple"          # Basic facts, single dimension
    MODERATE = "moderate"      # Multi-faceted analysis  
    COMPLEX = "complex"        # Deep strategic analysis
    URGENT = "urgent"          # Time-sensitive, any complexity


class ModelProvider(Enum):
    """Available AI model providers."""
    CLAUDE = "claude"
    PERPLEXITY = "perplexity"
    OPENAI = "openai"
    LLAMA_LOCAL = "llama_local"


@dataclass
class QueryAnalysis:
    """Results of query complexity analysis."""
    complexity: QueryComplexity
    estimated_cost_usd: float
    recommended_models: List[ModelProvider]
    reasoning: str
    urgency_score: float  # 0.0-1.0
    political_relevance: float  # 0.0-1.0
    requires_real_time_data: bool
    estimated_processing_time: int  # seconds


@dataclass
class AIResponse:
    """Standardized response from any AI model."""
    content: str
    model_used: str
    provider: ModelProvider
    tokens_used: Dict[str, int]
    cost_usd: float
    latency_ms: int
    quality_score: float
    metadata: Dict[str, Any]
    error: Optional[str] = None


class AIOrchestrator:
    """
    Core orchestration engine for multi-model AI system.
    
    Manages intelligent routing, cost optimization, and quality validation
    across multiple AI providers with automatic fallback mechanisms.
    """
    
    def __init__(self):
        self.claude_client = ClaudeClient()
        self.perplexity_client = PerplexityClient()
        self.openai_client = OpenAIClient()
        self.llama_client = LlamaClient()
        self.budget_manager = BudgetManager()
        self.quality_validator = QualityValidator()
        
        # Circuit breaker states
        self._circuit_breakers = {
            ModelProvider.CLAUDE: {"failures": 0, "last_failure": None, "is_open": False},
            ModelProvider.PERPLEXITY: {"failures": 0, "last_failure": None, "is_open": False},
            ModelProvider.OPENAI: {"failures": 0, "last_failure": None, "is_open": False},
            ModelProvider.LLAMA_LOCAL: {"failures": 0, "last_failure": None, "is_open": False}
        }
        
        # Configuration
        self.config = {
            "max_concurrent_requests": 5,
            "default_timeout_seconds": 120,
            "circuit_breaker_threshold": 5,
            "circuit_breaker_timeout": 300,  # 5 minutes
            "cache_ttl_seconds": 10800,  # 3 hours
            "quality_threshold": 0.7,
            "cost_per_token_thresholds": {
                "claude": 0.000015,  # $15/M output tokens
                "perplexity": 0.000001,  # $1/M tokens
                "openai": 0.00002,  # $20/M tokens
                "llama_local": 0.0  # Free but compute cost
            }
        }

    async def analyze_query(self, query: str, context: Dict[str, Any] = None) -> QueryAnalysis:
        """
        Analyze query to determine complexity, cost, and optimal routing strategy.
        
        Args:
            query: User query text
            context: Additional context (ward, urgency, etc.)
            
        Returns:
            QueryAnalysis with routing recommendations
        """
        start_time = time.time()
        
        # Basic query characteristics
        word_count = len(query.split())
        has_temporal_indicators = any(term in query.lower() for term in [
            'latest', 'recent', 'now', 'today', 'breaking', 'urgent'
        ])
        has_analysis_indicators = any(term in query.lower() for term in [
            'analyze', 'compare', 'implications', 'strategy', 'impact'
        ])
        has_local_context = context and context.get('ward_context')
        
        # Complexity scoring
        complexity_score = 0.0
        
        # Word count contribution (0.0-0.3)
        if word_count > 100:
            complexity_score += 0.3
        elif word_count > 50:
            complexity_score += 0.2
        elif word_count > 20:
            complexity_score += 0.1
            
        # Analysis requirements (0.0-0.4)
        if has_analysis_indicators:
            complexity_score += 0.4
        elif 'what' in query.lower() or 'how' in query.lower():
            complexity_score += 0.2
            
        # Real-time data requirements (0.0-0.2)
        if has_temporal_indicators:
            complexity_score += 0.2
            
        # Local context complexity (0.0-0.1)
        if has_local_context:
            complexity_score += 0.1
            
        # Determine complexity level
        if complexity_score >= 0.7:
            complexity = QueryComplexity.COMPLEX
        elif complexity_score >= 0.4:
            complexity = QueryComplexity.MODERATE
        else:
            complexity = QueryComplexity.SIMPLE
            
        # Check for urgency overrides
        urgency_score = 0.8 if has_temporal_indicators else 0.3
        if context and context.get('priority') == 'urgent':
            complexity = QueryComplexity.URGENT
            urgency_score = 1.0
            
        # Political relevance scoring
        political_terms = [
            'party', 'election', 'candidate', 'vote', 'campaign', 'bjp', 'congress', 
            'brs', 'aimim', 'ward', 'constituency', 'polling', 'strategic'
        ]
        political_relevance = min(1.0, sum(1 for term in political_terms 
                                         if term in query.lower()) / 5.0)
        
        # Model routing based on complexity and requirements
        recommended_models = self._recommend_models(
            complexity, has_temporal_indicators, political_relevance, urgency_score
        )
        
        # Cost estimation
        estimated_tokens = max(1000, word_count * 20)  # Conservative estimate
        estimated_cost = self._estimate_cost(recommended_models[0], estimated_tokens)
        
        # Processing time estimation
        if complexity == QueryComplexity.COMPLEX:
            estimated_time = 90
        elif complexity == QueryComplexity.MODERATE:
            estimated_time = 45
        else:
            estimated_time = 15
            
        analysis_time = int((time.time() - start_time) * 1000)
        logger.info(f"Query analysis completed in {analysis_time}ms: {complexity.value}")
        
        return QueryAnalysis(
            complexity=complexity,
            estimated_cost_usd=estimated_cost,
            recommended_models=recommended_models,
            reasoning=f"Complexity: {complexity_score:.2f}, Political: {political_relevance:.2f}",
            urgency_score=urgency_score,
            political_relevance=political_relevance,
            requires_real_time_data=has_temporal_indicators,
            estimated_processing_time=estimated_time
        )

    def _recommend_models(self, complexity: QueryComplexity, needs_realtime: bool, 
                         political_relevance: float, urgency: float) -> List[ModelProvider]:
        """Recommend optimal model sequence based on query characteristics."""
        
        if complexity == QueryComplexity.URGENT:
            # For urgent queries, use fastest available model
            if self._is_model_available(ModelProvider.CLAUDE):
                return [ModelProvider.CLAUDE, ModelProvider.LLAMA_LOCAL]
            else:
                return [ModelProvider.LLAMA_LOCAL, ModelProvider.OPENAI]
                
        elif complexity == QueryComplexity.COMPLEX:
            # Complex analysis: Primary Claude, fallback to local
            if needs_realtime:
                return [ModelProvider.PERPLEXITY, ModelProvider.CLAUDE, ModelProvider.LLAMA_LOCAL]
            else:
                return [ModelProvider.CLAUDE, ModelProvider.LLAMA_LOCAL]
                
        elif complexity == QueryComplexity.MODERATE:
            # Moderate complexity: Balance cost and quality
            if needs_realtime:
                return [ModelProvider.PERPLEXITY, ModelProvider.OPENAI, ModelProvider.LLAMA_LOCAL]
            elif political_relevance > 0.7:
                return [ModelProvider.CLAUDE, ModelProvider.LLAMA_LOCAL]
            else:
                return [ModelProvider.OPENAI, ModelProvider.LLAMA_LOCAL]
                
        else:  # SIMPLE
            # Simple queries: Cost-effective options first
            if needs_realtime:
                return [ModelProvider.PERPLEXITY, ModelProvider.LLAMA_LOCAL]
            else:
                return [ModelProvider.LLAMA_LOCAL, ModelProvider.OPENAI]

    def _estimate_cost(self, provider: ModelProvider, estimated_tokens: int) -> float:
        """Estimate cost for a given provider and token count."""
        cost_per_token = self.config["cost_per_token_thresholds"].get(provider.value, 0.000015)
        return estimated_tokens * cost_per_token

    def _is_model_available(self, provider: ModelProvider) -> bool:
        """Check if a model provider is currently available (circuit breaker)."""
        breaker = self._circuit_breakers[provider]
        
        if not breaker["is_open"]:
            return True
            
        # Check if circuit breaker should be reset
        if breaker["last_failure"]:
            time_since_failure = time.time() - breaker["last_failure"]
            if time_since_failure > self.config["circuit_breaker_timeout"]:
                breaker["is_open"] = False
                breaker["failures"] = 0
                logger.info(f"Circuit breaker reset for {provider.value}")
                return True
                
        return False

    async def generate_response(self, query: str, context: Dict[str, Any] = None) -> AIResponse:
        """
        Generate response using optimal model selection and fallback chain.
        
        Args:
            query: User query text
            context: Additional context for the query
            
        Returns:
            AIResponse with generated content and metadata
        """
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # Analyze query for optimal routing
            analysis = await self.analyze_query(query, context)
            
            # Check budget constraints
            if not await self.budget_manager.can_afford_request(analysis.estimated_cost_usd):
                return AIResponse(
                    content="Budget limit reached. Please try again later.",
                    model_used="budget_manager",
                    provider=ModelProvider.LLAMA_LOCAL,
                    tokens_used={"input": 0, "output": 0},
                    cost_usd=0.0,
                    latency_ms=0,
                    quality_score=0.0,
                    metadata={"error": "budget_exceeded"},
                    error="Budget limit exceeded"
                )
            
            # Try each recommended model in order
            last_error = None
            for provider in analysis.recommended_models:
                if not self._is_model_available(provider):
                    continue
                    
                try:
                    response = await self._call_model(provider, query, context, request_id)
                    
                    # Validate response quality
                    quality_score = await self.quality_validator.assess_response(
                        query, response.content, context
                    )
                    response.quality_score = quality_score
                    
                    # Record successful execution
                    await self._record_execution(request_id, response, analysis, "success")
                    
                    # Update budget tracking
                    await self.budget_manager.record_spend(response.cost_usd, provider.value)
                    
                    # Reset circuit breaker on success
                    self._circuit_breakers[provider]["failures"] = 0
                    
                    total_time = int((time.time() - start_time) * 1000)
                    logger.info(f"Successfully generated response using {provider.value} in {total_time}ms")
                    
                    return response
                    
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"Model {provider.value} failed: {e}")
                    
                    # Update circuit breaker
                    breaker = self._circuit_breakers[provider]
                    breaker["failures"] += 1
                    breaker["last_failure"] = time.time()
                    
                    if breaker["failures"] >= self.config["circuit_breaker_threshold"]:
                        breaker["is_open"] = True
                        logger.error(f"Circuit breaker opened for {provider.value}")
                    
                    # Record failed execution
                    error_response = AIResponse(
                        content="",
                        model_used=provider.value,
                        provider=provider,
                        tokens_used={"input": 0, "output": 0},
                        cost_usd=0.0,
                        latency_ms=0,
                        quality_score=0.0,
                        metadata={"error": str(e)},
                        error=str(e)
                    )
                    await self._record_execution(request_id, error_response, analysis, "error")
                    
                    continue
            
            # All models failed
            fallback_response = self._generate_fallback_response(query, last_error)
            await self._record_execution(request_id, fallback_response, analysis, "fallback")
            
            return fallback_response
            
        except Exception as e:
            logger.error(f"Critical error in AI orchestrator: {e}")
            return AIResponse(
                content="System temporarily unavailable. Please try again later.",
                model_used="error_handler",
                provider=ModelProvider.LLAMA_LOCAL,
                tokens_used={"input": 0, "output": 0},
                cost_usd=0.0,
                latency_ms=int((time.time() - start_time) * 1000),
                quality_score=0.0,
                metadata={"critical_error": str(e)},
                error=str(e)
            )

    async def _call_model(self, provider: ModelProvider, query: str, 
                         context: Dict[str, Any], request_id: str) -> AIResponse:
        """Call specific AI model provider."""
        
        if provider == ModelProvider.CLAUDE:
            return await self.claude_client.generate_response(query, context, request_id)
        elif provider == ModelProvider.PERPLEXITY:
            return await self.perplexity_client.generate_response(query, context, request_id)
        elif provider == ModelProvider.OPENAI:
            return await self.openai_client.generate_response(query, context, request_id)
        elif provider == ModelProvider.LLAMA_LOCAL:
            return await self.llama_client.generate_response(query, context, request_id)
        else:
            raise ValueError(f"Unknown provider: {provider}")

    def _generate_fallback_response(self, query: str, last_error: str) -> AIResponse:
        """Generate a fallback response when all AI models fail."""
        
        fallback_content = f"""
I apologize, but I'm currently experiencing technical difficulties accessing the AI analysis systems. 

Your query: "{query[:100]}{'...' if len(query) > 100 else ''}"

This could be due to:
- Temporary service outages
- Rate limiting
- Budget constraints

Please try again in a few minutes. If the issue persists, contact support.

Last error: {last_error[:200] if last_error else 'Unknown error'}
"""
        
        return AIResponse(
            content=fallback_content.strip(),
            model_used="fallback_handler",
            provider=ModelProvider.LLAMA_LOCAL,
            tokens_used={"input": len(query.split()), "output": len(fallback_content.split())},
            cost_usd=0.0,
            latency_ms=50,
            quality_score=0.1,
            metadata={"fallback": True, "last_error": last_error},
            error="All models unavailable"
        )

    async def _record_execution(self, request_id: str, response: AIResponse, 
                               analysis: QueryAnalysis, status: str):
        """Record AI model execution for monitoring and cost tracking."""
        
        try:
            execution = AIModelExecution(
                request_id=request_id,
                user_id=None,  # Will be set by calling service
                operation_type="geopolitical_analysis",
                provider=response.provider.value,
                model_name=response.model_used,
                input_tokens=response.tokens_used.get("input", 0),
                output_tokens=response.tokens_used.get("output", 0),
                total_tokens=sum(response.tokens_used.values()),
                latency_ms=response.latency_ms,
                cost_usd=response.cost_usd,
                success_status=status,
                error_message=response.error,
                quality_score=response.quality_score,
                request_metadata={
                    "query_complexity": analysis.complexity.value,
                    "estimated_cost": analysis.estimated_cost_usd,
                    "political_relevance": analysis.political_relevance
                },
                response_metadata=response.metadata
            )
            
            db.session.add(execution)
            db.session.commit()
            
        except Exception as e:
            logger.error(f"Failed to record execution: {e}")
            db.session.rollback()

    async def get_system_status(self) -> Dict[str, Any]:
        """Get current system status and health metrics."""
        
        # Check circuit breaker states
        model_status = {}
        for provider, breaker in self._circuit_breakers.items():
            model_status[provider.value] = {
                "available": not breaker["is_open"],
                "failure_count": breaker["failures"],
                "last_failure": breaker["last_failure"]
            }
        
        # Get recent performance metrics
        recent_executions = db.session.query(AIModelExecution)\
            .filter(AIModelExecution.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0))\
            .all()
        
        total_requests = len(recent_executions)
        successful_requests = len([e for e in recent_executions if e.success_status == "success"])
        total_cost = sum(float(e.cost_usd or 0) for e in recent_executions)
        avg_latency = sum(e.latency_ms or 0 for e in recent_executions) / max(total_requests, 1)
        
        # Budget status
        budget_status = await self.budget_manager.get_current_status()
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "models": model_status,
            "performance": {
                "total_requests_today": total_requests,
                "success_rate": successful_requests / max(total_requests, 1),
                "average_latency_ms": int(avg_latency),
                "total_cost_today_usd": round(total_cost, 4)
            },
            "budget": budget_status,
            "system_load": {
                "cpu_usage": "N/A",  # Could integrate system metrics
                "memory_usage": "N/A",
                "active_requests": 0  # Could track active requests
            }
        }

    async def optimize_performance(self) -> Dict[str, Any]:
        """Analyze recent performance and suggest optimizations."""
        
        # Analyze recent executions for patterns
        recent_executions = db.session.query(AIModelExecution)\
            .filter(AIModelExecution.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0))\
            .order_by(desc(AIModelExecution.created_at))\
            .limit(100)\
            .all()
        
        if not recent_executions:
            return {"optimizations": [], "message": "Insufficient data for optimization"}
        
        # Performance analysis
        provider_performance = {}
        for execution in recent_executions:
            provider = execution.provider
            if provider not in provider_performance:
                provider_performance[provider] = {
                    "requests": 0, "successes": 0, "total_latency": 0, 
                    "total_cost": 0, "quality_scores": []
                }
            
            metrics = provider_performance[provider]
            metrics["requests"] += 1
            if execution.success_status == "success":
                metrics["successes"] += 1
            metrics["total_latency"] += execution.latency_ms or 0
            metrics["total_cost"] += float(execution.cost_usd or 0)
            if execution.quality_score:
                metrics["quality_scores"].append(execution.quality_score)
        
        # Generate optimization recommendations
        optimizations = []
        
        for provider, metrics in provider_performance.items():
            avg_latency = metrics["total_latency"] / max(metrics["requests"], 1)
            success_rate = metrics["successes"] / max(metrics["requests"], 1)
            avg_quality = sum(metrics["quality_scores"]) / max(len(metrics["quality_scores"]), 1)
            cost_per_request = metrics["total_cost"] / max(metrics["requests"], 1)
            
            if success_rate < 0.9:
                optimizations.append({
                    "type": "reliability",
                    "provider": provider,
                    "message": f"{provider} has low success rate ({success_rate:.1%})",
                    "recommendation": "Consider increasing circuit breaker threshold or timeout"
                })
            
            if avg_latency > 5000:  # 5 seconds
                optimizations.append({
                    "type": "performance", 
                    "provider": provider,
                    "message": f"{provider} has high latency ({avg_latency:.0f}ms)",
                    "recommendation": "Consider reducing model complexity or increasing timeout"
                })
            
            if avg_quality < 0.7:
                optimizations.append({
                    "type": "quality",
                    "provider": provider,
                    "message": f"{provider} has low quality score ({avg_quality:.2f})",
                    "recommendation": "Review prompt engineering or model selection"
                })
        
        return {
            "optimizations": optimizations,
            "provider_metrics": {
                provider: {
                    "success_rate": metrics["successes"] / max(metrics["requests"], 1),
                    "avg_latency_ms": metrics["total_latency"] / max(metrics["requests"], 1),
                    "cost_per_request": metrics["total_cost"] / max(metrics["requests"], 1),
                    "avg_quality": sum(metrics["quality_scores"]) / max(len(metrics["quality_scores"]), 1)
                }
                for provider, metrics in provider_performance.items()
            }
        }


# Global orchestrator instance
orchestrator = AIOrchestrator()
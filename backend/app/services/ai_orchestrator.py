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
from datetime import datetime, timezone, timedelta
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

# Import AI service clients
from .claude_client import ClaudeClient
from .perplexity_client import PerplexityClient  
from .openai_client import OpenAIClient
from .llama_client import LlamaClient
from .gemini_client import GeminiClient
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
    GEMINI = "gemini"


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
        self.gemini_client = GeminiClient()
        self.budget_manager = BudgetManager()
        self.quality_validator = QualityValidator()
        
        # Circuit breaker states
        self._circuit_breakers = {
            ModelProvider.CLAUDE: {"failures": 0, "last_failure": None, "is_open": False},
            ModelProvider.PERPLEXITY: {"failures": 0, "last_failure": None, "is_open": False},
            ModelProvider.OPENAI: {"failures": 0, "last_failure": None, "is_open": False},
            ModelProvider.LLAMA_LOCAL: {"failures": 0, "last_failure": None, "is_open": False},
            ModelProvider.GEMINI: {"failures": 0, "last_failure": None, "is_open": False}
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
                "gemini": 0.000005,  # $5/M output tokens (Gemini 2.5 Pro)
                "llama_local": 0.0  # Free but compute cost
            }
        }

    async def analyze_query(self, query: str, context: Dict[str, Any] = None) -> QueryAnalysis:
        """
        Enhanced query analysis for intelligent multi-model routing.
        
        Args:
            query: User query text
            context: Additional context (ward, urgency, etc.)
            
        Returns:
            QueryAnalysis with routing recommendations and confidence scoring
        """
        start_time = time.time()
        
        # Enhanced query characteristics analysis
        word_count = len(query.split())
        sentence_count = len([s for s in query.split('.') if s.strip()])
        
        # Temporal indicators for real-time data needs
        has_temporal_indicators = any(term in query.lower() for term in [
            'latest', 'recent', 'now', 'today', 'breaking', 'urgent', 'current',
            'this week', 'this month', 'yesterday', 'developments'
        ])
        
        # Analysis complexity indicators
        has_analysis_indicators = any(term in query.lower() for term in [
            'analyze', 'compare', 'implications', 'strategy', 'impact', 'assess',
            'evaluate', 'predict', 'forecast', 'scenario', 'recommend'
        ])
        
        # Strategic depth indicators
        has_strategic_indicators = any(term in query.lower() for term in [
            'strategic', 'long-term', 'planning', 'competitive', 'advantage',
            'threat', 'opportunity', 'risk', 'scenario', 'coalition'
        ])
        
        # Multi-perspective analysis needs
        has_multi_perspective = any(term in query.lower() for term in [
            'compare', 'versus', 'between', 'different', 'multiple',
            'stakeholder', 'perspectives', 'viewpoints'
        ])
        
        # Context analysis
        has_local_context = context and context.get('ward_context')
        analysis_depth = context.get('analysis_depth', 'standard') if context else 'standard'
        strategic_context = context.get('strategic_context', 'neutral') if context else 'neutral'
        
        # Enhanced complexity scoring (0.0-1.0)
        complexity_score = 0.0
        
        # Word count and length complexity (0.0-0.2)
        if word_count > 150:
            complexity_score += 0.2
        elif word_count > 75:
            complexity_score += 0.15
        elif word_count > 30:
            complexity_score += 0.1
        elif word_count > 10:
            complexity_score += 0.05
            
        # Sentence structure complexity (0.0-0.1)
        if sentence_count > 5:
            complexity_score += 0.1
        elif sentence_count > 3:
            complexity_score += 0.05
            
        # Analysis requirements (0.0-0.3)
        if has_analysis_indicators and has_strategic_indicators:
            complexity_score += 0.3
        elif has_analysis_indicators:
            complexity_score += 0.2
        elif 'what' in query.lower() or 'how' in query.lower():
            complexity_score += 0.1
            
        # Multi-perspective analysis (0.0-0.15)
        if has_multi_perspective:
            complexity_score += 0.15
            
        # Real-time data requirements (0.0-0.1)
        if has_temporal_indicators:
            complexity_score += 0.1
            
        # Context-based complexity adjustments (0.0-0.15)
        if analysis_depth == 'deep':
            complexity_score += 0.15
        elif analysis_depth == 'standard':
            complexity_score += 0.05
            
        if strategic_context in ['offensive', 'defensive']:
            complexity_score += 0.05
            
        if has_local_context:
            complexity_score += 0.05
            
        # Determine complexity level with enhanced thresholds
        if complexity_score >= 0.75:
            complexity = QueryComplexity.COMPLEX
        elif complexity_score >= 0.45:
            complexity = QueryComplexity.MODERATE
        else:
            complexity = QueryComplexity.SIMPLE
            
        # Check for urgency overrides
        urgency_score = 0.8 if has_temporal_indicators else 0.3
        if context and context.get('priority') in ['urgent', 'high']:
            if context.get('priority') == 'urgent':
                complexity = QueryComplexity.URGENT
                urgency_score = 1.0
            else:
                urgency_score = 0.7
                
        # Enhanced political relevance scoring
        political_terms = [
            'party', 'election', 'candidate', 'vote', 'campaign', 'bjp', 'congress', 
            'brs', 'aimim', 'ward', 'constituency', 'polling', 'strategic', 'minister',
            'mla', 'mp', 'corporator', 'ghmc', 'telangana', 'hyderabad', 'coalition',
            'alliance', 'opposition', 'government', 'policy', 'governance'
        ]
        political_relevance = min(1.0, sum(1 for term in political_terms 
                                         if term in query.lower()) / 8.0)
        
        # Enhanced model routing with cost-effectiveness
        recommended_models = self._recommend_models_enhanced(
            complexity, has_temporal_indicators, political_relevance, 
            urgency_score, has_strategic_indicators, analysis_depth
        )
        
        # Enhanced cost estimation with model-specific calculations
        estimated_tokens = self._estimate_tokens_enhanced(query, complexity, analysis_depth)
        estimated_cost = self._estimate_cost_multi_model(recommended_models, estimated_tokens)
        
        # Enhanced processing time estimation
        processing_time_base = {
            QueryComplexity.SIMPLE: 20,
            QueryComplexity.MODERATE: 60,
            QueryComplexity.COMPLEX: 120,
            QueryComplexity.URGENT: 30
        }
        
        estimated_time = processing_time_base.get(complexity, 60)
        if has_temporal_indicators:
            estimated_time = min(estimated_time, 45)  # Prioritize speed for real-time queries
            
        analysis_time = int((time.time() - start_time) * 1000)
        logger.info(f"Enhanced query analysis completed in {analysis_time}ms: {complexity.value}, models: {[m.value for m in recommended_models[:2]]}")
        
        return QueryAnalysis(
            complexity=complexity,
            estimated_cost_usd=estimated_cost,
            recommended_models=recommended_models,
            reasoning=f"Complexity: {complexity_score:.2f}, Political: {political_relevance:.2f}, Strategic: {has_strategic_indicators}, Depth: {analysis_depth}",
            urgency_score=urgency_score,
            political_relevance=political_relevance,
            requires_real_time_data=has_temporal_indicators,
            estimated_processing_time=estimated_time
        )

    def _recommend_models_enhanced(self, complexity: QueryComplexity, needs_realtime: bool, 
                                  political_relevance: float, urgency: float, 
                                  has_strategic_indicators: bool, analysis_depth: str) -> List[ModelProvider]:
        """Enhanced model routing with cost optimization and intelligent fallback chains."""
        
        # Cost-effectiveness scoring for each model (higher = better value)
        cost_effectiveness = {
            ModelProvider.GEMINI: 0.9,      # Best cost/performance ratio
            ModelProvider.PERPLEXITY: 0.85, # Great for real-time data
            ModelProvider.CLAUDE: 0.75,     # Premium quality, higher cost
            ModelProvider.OPENAI: 0.7,      # Good general purpose
            ModelProvider.LLAMA_LOCAL: 1.0  # Free but limited
        }
        
        if complexity == QueryComplexity.URGENT:
            # Urgent: Prioritize speed and availability
            if needs_realtime:
                return [ModelProvider.PERPLEXITY, ModelProvider.GEMINI, ModelProvider.CLAUDE, ModelProvider.LLAMA_LOCAL]
            else:
                # Use fastest high-quality model available
                available_fast = [m for m in [ModelProvider.GEMINI, ModelProvider.CLAUDE, ModelProvider.OPENAI] 
                                if self._is_model_available(m)]
                return available_fast + [ModelProvider.LLAMA_LOCAL]
                
        elif complexity == QueryComplexity.COMPLEX:
            # Complex analysis: Quality over cost, but optimize where possible
            if analysis_depth == 'deep':
                # Deep analysis: Use premium models for comprehensive reasoning
                if needs_realtime:
                    return [ModelProvider.PERPLEXITY, ModelProvider.CLAUDE, ModelProvider.GEMINI, ModelProvider.LLAMA_LOCAL]
                elif has_strategic_indicators and political_relevance > 0.8:
                    # High-stakes political analysis: Claude primary, Gemini fallback
                    return [ModelProvider.CLAUDE, ModelProvider.GEMINI, ModelProvider.LLAMA_LOCAL]
                else:
                    # Cost-optimized complex analysis: Gemini primary (better cost/performance)
                    return [ModelProvider.GEMINI, ModelProvider.CLAUDE, ModelProvider.LLAMA_LOCAL]
            else:
                # Standard complex analysis: Balance quality and cost
                if needs_realtime:
                    return [ModelProvider.PERPLEXITY, ModelProvider.GEMINI, ModelProvider.CLAUDE]
                else:
                    return [ModelProvider.GEMINI, ModelProvider.CLAUDE, ModelProvider.LLAMA_LOCAL]
                    
        elif complexity == QueryComplexity.MODERATE:
            # Moderate: Optimize for cost-effectiveness
            if needs_realtime:
                return [ModelProvider.PERPLEXITY, ModelProvider.GEMINI, ModelProvider.OPENAI, ModelProvider.LLAMA_LOCAL]
            elif political_relevance > 0.7:
                # Political analysis: Use proven models
                return [ModelProvider.GEMINI, ModelProvider.CLAUDE, ModelProvider.LLAMA_LOCAL]
            else:
                # General moderate complexity: Cost-optimized
                return [ModelProvider.GEMINI, ModelProvider.OPENAI, ModelProvider.LLAMA_LOCAL]
                
        else:  # SIMPLE
            # Simple queries: Maximize cost efficiency
            if needs_realtime:
                return [ModelProvider.PERPLEXITY, ModelProvider.GEMINI, ModelProvider.LLAMA_LOCAL]
            else:
                # Use most cost-effective models first
                return [ModelProvider.GEMINI, ModelProvider.LLAMA_LOCAL, ModelProvider.OPENAI]

    def _recommend_models(self, complexity: QueryComplexity, needs_realtime: bool, 
                         political_relevance: float, urgency: float) -> List[ModelProvider]:
        """Legacy model recommendation method - kept for backward compatibility."""
        return self._recommend_models_enhanced(
            complexity, needs_realtime, political_relevance, urgency, False, 'standard'
        )

    def _estimate_cost(self, provider: ModelProvider, estimated_tokens: int) -> float:
        """Estimate cost for a given provider and token count."""
        cost_per_token = self.config["cost_per_token_thresholds"].get(provider.value, 0.000015)
        return estimated_tokens * cost_per_token

    def _estimate_tokens_enhanced(self, query: str, complexity: QueryComplexity, analysis_depth: str) -> int:
        """Enhanced token estimation based on query characteristics and expected response."""
        
        base_input_tokens = len(query.split()) * 1.3  # More accurate token estimation
        
        # Output token estimation based on complexity and depth
        output_multipliers = {
            (QueryComplexity.SIMPLE, 'quick'): 150,
            (QueryComplexity.SIMPLE, 'standard'): 300,
            (QueryComplexity.SIMPLE, 'deep'): 500,
            (QueryComplexity.MODERATE, 'quick'): 400,
            (QueryComplexity.MODERATE, 'standard'): 800,
            (QueryComplexity.MODERATE, 'deep'): 1200,
            (QueryComplexity.COMPLEX, 'quick'): 600,
            (QueryComplexity.COMPLEX, 'standard'): 1500,
            (QueryComplexity.COMPLEX, 'deep'): 2500,
            (QueryComplexity.URGENT, 'quick'): 300,
            (QueryComplexity.URGENT, 'standard'): 600,
            (QueryComplexity.URGENT, 'deep'): 800,
        }
        
        estimated_output = output_multipliers.get((complexity, analysis_depth), 800)
        total_tokens = int(base_input_tokens + estimated_output)
        
        return max(500, total_tokens)  # Minimum reasonable estimate

    def _estimate_cost_multi_model(self, providers: List[ModelProvider], estimated_tokens: int) -> float:
        """Estimate cost assuming primary model will be used (first in fallback chain)."""
        if not providers:
            return 0.0
        
        primary_provider = providers[0]
        return self._estimate_cost(primary_provider, estimated_tokens)

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
        elif provider == ModelProvider.GEMINI:
            return await self.gemini_client.generate_response(query, context, request_id)
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

    async def generate_response_with_confidence(self, query: str, context: Dict[str, Any] = None, 
                                               enable_consensus: bool = False) -> Dict[str, Any]:
        """
        Generate response with confidence scoring and optional multi-model consensus.
        
        Args:
            query: User query text
            context: Additional context for the query
            enable_consensus: Whether to use multiple models for confidence scoring
            
        Returns:
            Dict with response, confidence metrics, and model agreement data
        """
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # Analyze query for optimal routing
            analysis = await self.analyze_query(query, context)
            
            # Check budget constraints
            if not await self.budget_manager.can_afford_request(analysis.estimated_cost_usd):
                return {
                    "response": AIResponse(
                        content="Budget limit reached. Please try again later.",
                        model_used="budget_manager",
                        provider=ModelProvider.LLAMA_LOCAL,
                        tokens_used={"input": 0, "output": 0},
                        cost_usd=0.0,
                        latency_ms=0,
                        quality_score=0.0,
                        metadata={"error": "budget_exceeded"},
                        error="Budget limit exceeded"
                    ),
                    "confidence_metrics": {
                        "overall_confidence": 0.0,
                        "model_agreement": 0.0,
                        "consensus_available": False,
                        "error": "budget_exceeded"
                    }
                }
            
            # Primary response generation
            primary_response = await self.generate_response(query, context)
            
            # Calculate base confidence from primary response
            base_confidence = self._calculate_response_confidence(primary_response, analysis)
            
            # Multi-model consensus if enabled and justified
            consensus_data = None
            if enable_consensus and self._should_use_consensus(analysis, base_confidence):
                consensus_data = await self._generate_consensus(query, context, analysis, primary_response)
            
            # Aggregate confidence metrics
            confidence_metrics = self._aggregate_confidence_metrics(
                primary_response, consensus_data, analysis
            )
            
            total_time = int((time.time() - start_time) * 1000)
            logger.info(f"Response with confidence generated in {total_time}ms, confidence: {confidence_metrics['overall_confidence']:.2f}")
            
            return {
                "response": primary_response,
                "confidence_metrics": confidence_metrics,
                "consensus_data": consensus_data,
                "analysis": {
                    "complexity": analysis.complexity.value,
                    "political_relevance": analysis.political_relevance,
                    "estimated_accuracy": confidence_metrics["overall_confidence"]
                },
                "generation_time_ms": total_time
            }
            
        except Exception as e:
            logger.error(f"Error in confidence response generation: {e}")
            return {
                "response": AIResponse(
                    content="System temporarily unavailable. Please try again later.",
                    model_used="error_handler",
                    provider=ModelProvider.LLAMA_LOCAL,
                    tokens_used={"input": 0, "output": 0},
                    cost_usd=0.0,
                    latency_ms=int((time.time() - start_time) * 1000),
                    quality_score=0.0,
                    metadata={"critical_error": str(e)},
                    error=str(e)
                ),
                "confidence_metrics": {
                    "overall_confidence": 0.0,
                    "model_agreement": 0.0,
                    "consensus_available": False,
                    "error": str(e)
                }
            }

    def _calculate_response_confidence(self, response: AIResponse, analysis: QueryAnalysis) -> float:
        """Calculate confidence score for a single model response."""
        
        confidence_factors = []
        
        # Quality score contribution (30%)
        if response.quality_score is not None:
            confidence_factors.append(("quality", response.quality_score, 0.3))
        
        # Model reliability based on historical performance (25%)
        provider_reliability = self._get_provider_reliability(response.provider)
        confidence_factors.append(("reliability", provider_reliability, 0.25))
        
        # Response completeness (20%)
        completeness = self._assess_response_completeness(response.content, analysis)
        confidence_factors.append(("completeness", completeness, 0.2))
        
        # Metadata confidence indicators (15%)
        metadata_confidence = self._extract_metadata_confidence(response.metadata)
        confidence_factors.append(("metadata", metadata_confidence, 0.15))
        
        # Error penalty (10%)
        error_penalty = 0.0 if response.error is None else 0.5
        confidence_factors.append(("error_penalty", 1.0 - error_penalty, 0.1))
        
        # Calculate weighted confidence
        weighted_confidence = sum(score * weight for _, score, weight in confidence_factors)
        
        return min(1.0, max(0.0, weighted_confidence))

    def _should_use_consensus(self, analysis: QueryAnalysis, base_confidence: float) -> bool:
        """Determine if multi-model consensus is justified."""
        
        # Use consensus for complex, high-stakes queries with uncertain confidence
        if analysis.complexity in [QueryComplexity.COMPLEX] and analysis.political_relevance > 0.7:
            return True
        
        # Use consensus when base confidence is uncertain
        if base_confidence < 0.7:
            return True
        
        # Use consensus for urgent queries that need validation
        if analysis.complexity == QueryComplexity.URGENT and analysis.political_relevance > 0.8:
            return True
        
        return False

    async def _generate_consensus(self, query: str, context: Dict[str, Any], 
                                 analysis: QueryAnalysis, primary_response: AIResponse) -> Dict[str, Any]:
        """Generate multi-model consensus for confidence validation."""
        
        try:
            # Select secondary model different from primary
            primary_provider = primary_response.provider
            secondary_providers = [p for p in analysis.recommended_models[1:3] 
                                 if p != primary_provider and self._is_model_available(p)]
            
            if not secondary_providers:
                return {"consensus_available": False, "reason": "no_secondary_models"}
            
            secondary_provider = secondary_providers[0]
            
            # Generate secondary response with simplified context for cost efficiency
            consensus_context = {**context} if context else {}
            consensus_context["analysis_depth"] = "quick"  # Cost optimization
            
            secondary_response = await self._call_model(
                secondary_provider, query, consensus_context, f"consensus_{uuid.uuid4()}"
            )
            
            # Compare responses for agreement
            agreement_score = self._calculate_response_agreement(
                primary_response.content, secondary_response.content
            )
            
            # Calculate consensus confidence
            consensus_confidence = (
                self._calculate_response_confidence(primary_response, analysis) +
                self._calculate_response_confidence(secondary_response, analysis)
            ) / 2
            
            return {
                "consensus_available": True,
                "secondary_provider": secondary_provider.value,
                "agreement_score": agreement_score,
                "consensus_confidence": consensus_confidence,
                "secondary_cost": secondary_response.cost_usd,
                "validation_status": "high_agreement" if agreement_score > 0.7 else "low_agreement"
            }
            
        except Exception as e:
            logger.warning(f"Consensus generation failed: {e}")
            return {"consensus_available": False, "reason": f"error: {str(e)}"}

    def _calculate_response_agreement(self, response1: str, response2: str) -> float:
        """Calculate agreement score between two responses."""
        
        # Simple keyword-based agreement calculation
        # In production, this could use more sophisticated NLP techniques
        
        words1 = set(response1.lower().split())
        words2 = set(response2.lower().split())
        
        # Remove common stop words for better signal
        stop_words = {
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'this', 'that', 'these', 'those', 'a', 'an'
        }
        
        words1 = words1 - stop_words
        words2 = words2 - stop_words
        
        if not words1 or not words2:
            return 0.0
        
        # Jaccard similarity
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        jaccard_similarity = len(intersection) / len(union) if union else 0.0
        
        # Look for key concept agreement (political terms, numbers, entities)
        political_terms = ['bjp', 'congress', 'brs', 'aimim', 'election', 'vote', 'party']
        political_agreement = sum(1 for term in political_terms 
                                if term in response1.lower() and term in response2.lower())
        
        # Combine metrics
        agreement_score = (jaccard_similarity * 0.7) + (min(political_agreement / 5, 1.0) * 0.3)
        
        return min(1.0, agreement_score)

    def _aggregate_confidence_metrics(self, primary_response: AIResponse, 
                                    consensus_data: Optional[Dict], analysis: QueryAnalysis) -> Dict[str, Any]:
        """Aggregate confidence metrics from all available sources."""
        
        base_confidence = self._calculate_response_confidence(primary_response, analysis)
        
        if not consensus_data or not consensus_data.get("consensus_available"):
            return {
                "overall_confidence": base_confidence,
                "model_agreement": None,
                "consensus_available": False,
                "confidence_breakdown": {
                    "base_confidence": base_confidence,
                    "provider": primary_response.provider.value,
                    "quality_score": primary_response.quality_score
                }
            }
        
        # Adjust confidence based on consensus
        agreement_score = consensus_data.get("agreement_score", 0.0)
        consensus_confidence = consensus_data.get("consensus_confidence", base_confidence)
        
        # Higher agreement increases confidence, lower agreement reduces it
        agreement_adjustment = (agreement_score - 0.5) * 0.2  # ±0.1 adjustment
        final_confidence = min(1.0, max(0.0, base_confidence + agreement_adjustment))
        
        return {
            "overall_confidence": final_confidence,
            "model_agreement": agreement_score,
            "consensus_available": True,
            "confidence_breakdown": {
                "base_confidence": base_confidence,
                "consensus_confidence": consensus_confidence,
                "agreement_score": agreement_score,
                "agreement_adjustment": agreement_adjustment,
                "primary_provider": primary_response.provider.value,
                "secondary_provider": consensus_data.get("secondary_provider")
            }
        }

    def _get_provider_reliability(self, provider: ModelProvider) -> float:
        """Get historical reliability score for a provider."""
        
        try:
            # Query recent execution success rates
            recent_executions = db.session.query(AIModelExecution)\
                .filter(AIModelExecution.provider == provider.value)\
                .filter(AIModelExecution.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0))\
                .limit(50)\
                .all()
            
            if not recent_executions:
                return 0.8  # Default moderate reliability
            
            success_count = sum(1 for e in recent_executions if e.success_status == "success")
            reliability = success_count / len(recent_executions)
            
            return reliability
            
        except Exception as e:
            logger.warning(f"Could not calculate provider reliability: {e}")
            return 0.8  # Default fallback

    def _assess_response_completeness(self, content: str, analysis: QueryAnalysis) -> float:
        """Assess how complete the response is relative to query complexity."""
        
        word_count = len(content.split())
        
        # Expected word counts based on complexity
        expected_counts = {
            QueryComplexity.SIMPLE: 150,
            QueryComplexity.MODERATE: 400,
            QueryComplexity.COMPLEX: 800,
            QueryComplexity.URGENT: 300
        }
        
        expected = expected_counts.get(analysis.complexity, 400)
        
        # Calculate completeness ratio with diminishing returns
        if word_count >= expected:
            return 1.0
        elif word_count >= expected * 0.7:
            return 0.8 + (word_count - expected * 0.7) / (expected * 0.3) * 0.2
        elif word_count >= expected * 0.4:
            return 0.5 + (word_count - expected * 0.4) / (expected * 0.3) * 0.3
        else:
            return max(0.1, word_count / (expected * 0.4) * 0.5)

    def _extract_metadata_confidence(self, metadata: Dict[str, Any]) -> float:
        """Extract confidence indicators from response metadata."""
        
        confidence_score = 0.5  # Base score
        
        if not metadata:
            return confidence_score
        
        # Check for explicit confidence indicators
        if "confidence_level" in metadata:
            level_map = {"high": 0.9, "medium": 0.6, "low": 0.3}
            return level_map.get(metadata["confidence_level"], confidence_score)
        
        # Check for quality indicators
        if "source_count" in metadata and metadata["source_count"] > 0:
            confidence_score += min(0.2, metadata["source_count"] * 0.05)
        
        if "credibility_score" in metadata:
            confidence_score += metadata["credibility_score"] * 0.2
        
        # Check for error indicators
        if metadata.get("error") or metadata.get("fallback"):
            confidence_score -= 0.3
        
        return min(1.0, max(0.0, confidence_score))

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
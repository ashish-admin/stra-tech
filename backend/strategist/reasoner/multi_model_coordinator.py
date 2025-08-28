"""
Multi-Model AI Coordinator for Wave 2 Strategic Orchestration

Coordinates between Gemini 2.5 Pro and Perplexity AI for advanced strategic analysis.
Implements evidence aggregation, confidence scoring, and conversation awareness.
"""

import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

import google.generativeai as genai
from enum import Enum

# Circuit breaker imports for AI service resilience
from ..circuit_breaker import (
    circuit_breaker_manager,
    call_gemini_with_circuit_breaker,
    call_perplexity_with_circuit_breaker,
    CircuitBreakerConfig
)

logger = logging.getLogger(__name__)


class QueryType(Enum):
    """Phase 3: Query type classification for intelligent routing."""
    STRATEGIC_ANALYSIS = "strategic_analysis"
    REAL_TIME_INTELLIGENCE = "real_time_intelligence"
    COMPETITIVE_ANALYSIS = "competitive_analysis"
    SCENARIO_PLANNING = "scenario_planning"
    CRISIS_RESPONSE = "crisis_response"
    CONVERSATIONAL = "conversational"


class ModelCapability(Enum):
    """Phase 3: Model capability classification for routing decisions."""
    STRATEGIC_REASONING = "strategic_reasoning"  # Gemini strength
    REAL_TIME_DATA = "real_time_data"  # Perplexity strength
    CONVERSATION_AWARE = "conversation_aware"  # Gemini strength
    SOURCE_VERIFICATION = "source_verification"  # Perplexity strength
    DEEP_ANALYSIS = "deep_analysis"  # Gemini strength
    CURRENT_EVENTS = "current_events"  # Perplexity strength


@dataclass
class ModelRoutingDecision:
    """Phase 3: Intelligent model routing decision with reasoning."""
    primary_model: str
    secondary_model: Optional[str]
    routing_confidence: float
    reasoning: str
    expected_capabilities: List[ModelCapability]
    fallback_strategy: str


@dataclass
class AnalysisRequest:
    """Wave 2: Structured analysis request with conversation context."""
    ward: str
    query: str
    depth: str
    context_mode: str
    conversation_history: Optional[List[Dict[str, Any]]] = None
    user_preferences: Optional[Dict[str, Any]] = None
    evidence_sources: Optional[List[Dict[str, Any]]] = None


@dataclass
class EvidenceSource:
    """Wave 2: Structured evidence source with credibility scoring."""
    content: str
    source_type: str
    credibility_score: float
    timestamp: str
    relevance_score: Optional[float] = None
    bias_indicators: Optional[List[str]] = None


@dataclass
class StrategicResponse:
    """Wave 2: Enhanced strategic response with confidence metrics."""
    content: str
    confidence_score: float
    evidence_sources: List[EvidenceSource]
    strategic_implications: List[str]
    recommended_actions: List[Dict[str, Any]]
    conversation_continuity: Optional[str] = None
    multi_model_consensus: Optional[float] = None


class MultiModelCoordinator:
    """
    Phase 3: Enhanced multi-model AI coordination system with intelligent routing.
    
    Orchestrates Gemini 2.5 Pro and Perplexity AI with intelligent model selection,
    advanced response synthesis, and dynamic confidence scoring.
    """
    
    def __init__(self):
        # Initialize Gemini
        try:
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
            self.gemini_available = True
        except KeyError:
            logger.error("GEMINI_API_KEY not set for multi-model coordinator")
            self.gemini_available = False
            
        # Perplexity integration (to be imported from existing retriever)
        self.perplexity_available = bool(os.getenv('PERPLEXITY_API_KEY'))
        
        # Phase 3: Enhanced configuration
        self.evidence_threshold = float(os.getenv('EVIDENCE_CONFIDENCE_THRESHOLD', '0.7'))
        self.consensus_threshold = float(os.getenv('MULTI_MODEL_CONSENSUS_THRESHOLD', '0.8'))
        self.conversation_memory_limit = int(os.getenv('CONVERSATION_MEMORY_LIMIT', '10'))
        
        # Phase 3: Intelligent routing configuration
        self.routing_confidence_threshold = float(os.getenv('ROUTING_CONFIDENCE_THRESHOLD', '0.9'))
        self.parallel_execution_enabled = os.getenv('PARALLEL_EXECUTION', 'true').lower() == 'true'
        self.adaptive_weighting_enabled = os.getenv('ADAPTIVE_WEIGHTING', 'true').lower() == 'true'
        
        # Phase 3: Model capability mapping
        self.model_capabilities = {
            'gemini-2.0-flash-exp': [
                ModelCapability.STRATEGIC_REASONING,
                ModelCapability.CONVERSATION_AWARE,
                ModelCapability.DEEP_ANALYSIS
            ],
            'perplexity-pro': [
                ModelCapability.REAL_TIME_DATA,
                ModelCapability.SOURCE_VERIFICATION,
                ModelCapability.CURRENT_EVENTS
            ]
        }
        
        # Phase 3: Performance metrics tracking
        self.model_performance_history = {
            'gemini-2.0-flash-exp': {'avg_confidence': 0.8, 'success_rate': 0.95, 'avg_latency': 3.2},
            'perplexity-pro': {'avg_confidence': 0.75, 'success_rate': 0.88, 'avg_latency': 4.1}
        }
        
        # Circuit breaker configuration for AI services
        self.circuit_breaker_config = {
            'gemini': CircuitBreakerConfig(
                failure_threshold=3,
                recovery_timeout=45,
                timeout_seconds=20.0,
                success_threshold=2
            ),
            'perplexity': CircuitBreakerConfig(
                failure_threshold=4,
                recovery_timeout=60,
                timeout_seconds=25.0,
                success_threshold=3
            )
        }
        
    async def coordinate_strategic_analysis(
        self,
        request: AnalysisRequest
    ) -> StrategicResponse:
        """
        Phase 3: Enhanced multi-model strategic analysis with intelligent routing.
        
        Args:
            request: Structured analysis request with context
            
        Returns:
            Enhanced strategic response with confidence metrics and routing intelligence
        """
        logger.info(f"Starting Phase 3 multi-model analysis for ward: {request.ward}")
        
        try:
            # Phase 3 Step 1: Intelligent query classification and model routing
            query_type = self._classify_query_type(request)
            routing_decision = self._intelligent_model_routing(request, query_type)
            
            logger.info(f"Routing decision: {routing_decision.primary_model} (confidence: {routing_decision.routing_confidence:.2f})")
            logger.info(f"Routing reasoning: {routing_decision.reasoning}")
            
            # Phase 3 Step 2: Adaptive model execution based on routing decision
            if routing_decision.routing_confidence >= self.routing_confidence_threshold and not self.parallel_execution_enabled:
                # High-confidence single-model execution
                result = await self._execute_primary_model(routing_decision, request)
                synthesized_response = await self._single_model_synthesis(result, request, routing_decision)
            else:
                # Parallel execution with adaptive weighting
                results = await self._parallel_model_execution(routing_decision, request)
                synthesized_response = await self._adaptive_response_synthesis(results, request, routing_decision)
            
            # Phase 3 Step 3: Enhanced confidence calculation with multi-factor analysis
            synthesized_response = self._calculate_enhanced_confidence_metrics(
                synthesized_response,
                routing_decision,
                query_type
            )
            
            # Phase 3 Step 4: Update model performance metrics
            self._update_model_performance_metrics(synthesized_response, routing_decision)
            
            logger.info(f"Phase 3 multi-model analysis complete: confidence={synthesized_response.confidence_score:.2f}, routing={routing_decision.primary_model}")
            return synthesized_response
            
        except Exception as e:
            logger.error(f"Phase 3 multi-model coordination failed: {e}", exc_info=True)
            return self._fallback_response(request)
    
    async def _gemini_analysis(self, request: AnalysisRequest) -> Dict[str, Any]:
        """Execute Gemini-based strategic analysis."""
        try:
            # Conversation-aware prompt construction
            conversation_context = ""
            if request.conversation_history:
                recent_history = request.conversation_history[-5:]
                conversation_context = f"\\nConversation Context:\\n{json.dumps(recent_history, indent=2)}"
            
            evidence_context = ""
            if request.evidence_sources:
                evidence_context = f"\\nEvidence Sources:\\n{json.dumps(request.evidence_sources[:3], indent=2)}"
            
            prompt = f"""
            You are a political strategist AI analyzing {request.ward} ward in Hyderabad.
            
            Query: {request.query}
            Analysis Depth: {request.depth}
            Strategic Context: {request.context_mode}
            {conversation_context}
            {evidence_context}
            
            Provide comprehensive strategic analysis in JSON format with:
            - strategic_summary: Key strategic insights
            - evidence_based_findings: Findings with evidence citations
            - strategic_implications: Political implications and consequences
            - recommended_actions: Specific actionable recommendations
            - confidence_indicators: Factors affecting confidence in analysis
            - conversation_continuity: How this relates to ongoing conversation
            
            Focus on evidence-based insights with specific references.
            """
            
            # Circuit breaker protected Gemini API call
            if not self.gemini_available:
                raise Exception("Gemini API key not available")
                
            async def gemini_service_call():
                response = self.gemini_model.generate_content(
                    prompt,
                    generation_config={
                        "temperature": 0.3,
                        "max_output_tokens": 3072,
                        "response_mime_type": "application/json"
                    }
                )
                return response
            
            async def gemini_fallback():
                return self._gemini_fallback_response(request)
            
            # Execute with circuit breaker protection
            service_response, success = await call_gemini_with_circuit_breaker(
                gemini_service_call,
                fallback_func=gemini_fallback
            )
            
            if not success:
                # Return fallback response if circuit breaker triggered
                logger.warning("Gemini circuit breaker triggered - using fallback")
                return service_response
            
            result = json.loads(service_response.text)
            result.update({
                "model": "gemini-2.0-flash-exp",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "model_confidence": 0.85  # Base Gemini confidence
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            return self._gemini_fallback_response(request)
    
    async def _perplexity_analysis(self, request: AnalysisRequest) -> Dict[str, Any]:
        """Execute Perplexity-based real-time intelligence gathering."""
        try:
            # Import Perplexity client from existing infrastructure
            from ..retriever.perplexity_client import PerplexityRetriever
            
            retriever = PerplexityRetriever()
            
            # Construct intelligence queries
            queries = [
                f"{request.ward} ward Hyderabad political developments recent news",
                f"Hyderabad {request.ward} infrastructure projects current status",
                f"{request.ward} political parties activities opposition government"
            ]
            
            # Circuit breaker protected Perplexity API call
            if not self.perplexity_available:
                raise Exception("Perplexity API key not available")
                
            async def perplexity_service_call():
                # Gather intelligence
                intelligence = await retriever.gather_intelligence(queries)
                return intelligence
            
            async def perplexity_fallback():
                return self._perplexity_fallback_response(request)
            
            # Execute with circuit breaker protection
            intelligence, success = await call_perplexity_with_circuit_breaker(
                perplexity_service_call,
                fallback_func=perplexity_fallback
            )
            
            if not success:
                # Return fallback response if circuit breaker triggered
                logger.warning("Perplexity circuit breaker triggered - using fallback")
                return intelligence
            
            # Format for coordination
            result = {
                "strategic_summary": f"Real-time intelligence for {request.ward}",
                "evidence_based_findings": intelligence.get("findings", []),
                "external_sources": intelligence.get("sources", []),
                "real_time_updates": intelligence.get("recent_updates", []),
                "model": "perplexity-pro",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "model_confidence": 0.75  # Base Perplexity confidence
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Perplexity analysis failed: {e}")
            return self._perplexity_fallback_response(request)
    
    def get_routing_statistics(self) -> Dict[str, Any]:
        """Phase 3: Get model routing and performance statistics."""
        return {
            "model_performance_history": self.model_performance_history,
            "routing_config": {
                "routing_confidence_threshold": self.routing_confidence_threshold,
                "parallel_execution_enabled": self.parallel_execution_enabled,
                "adaptive_weighting_enabled": self.adaptive_weighting_enabled
            },
            "model_availability": {
                "gemini_available": self.gemini_available,
                "perplexity_available": self.perplexity_available
            },
            "capabilities": {
                model: [cap.value for cap in caps] 
                for model, caps in self.model_capabilities.items()
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    async def _synthesize_responses(
        self,
        gemini_result: Optional[Dict[str, Any]],
        perplexity_result: Optional[Dict[str, Any]],
        request: AnalysisRequest
    ) -> StrategicResponse:
        """Synthesize multi-model responses into unified strategic response."""
        try:
            # Combine evidence sources
            evidence_sources = []
            strategic_implications = []
            recommended_actions = []
            
            # Process Gemini results
            if gemini_result and "error" not in gemini_result:
                implications = gemini_result.get("strategic_implications", [])
                if isinstance(implications, list):
                    strategic_implications.extend(implications)
                    
                actions = gemini_result.get("recommended_actions", [])
                if isinstance(actions, list):
                    recommended_actions.extend(actions)
            
            # Process Perplexity results
            if perplexity_result and "error" not in perplexity_result:
                external_sources = perplexity_result.get("external_sources", [])
                for source in external_sources[:3]:  # Limit to top 3 sources
                    evidence_sources.append(EvidenceSource(
                        content=source.get("content", "")[:200],
                        source_type="external_news",
                        credibility_score=source.get("credibility", 0.7),
                        timestamp=datetime.now(timezone.utc).isoformat()
                    ))
            
            # Construct synthesized content
            content_parts = []
            
            if gemini_result and "strategic_summary" in gemini_result:
                content_parts.append(f"Strategic Analysis: {gemini_result['strategic_summary']}")
            
            if perplexity_result and "strategic_summary" in perplexity_result:
                content_parts.append(f"Real-time Intelligence: {perplexity_result['strategic_summary']}")
            
            synthesized_content = "\\n\\n".join(content_parts) if content_parts else f"Strategic analysis for {request.ward} ward."
            
            # Determine conversation continuity
            conversation_continuity = None
            if request.conversation_history and gemini_result:
                conversation_continuity = gemini_result.get("conversation_continuity", "Continue strategic discussion based on analysis.")
            
            return StrategicResponse(
                content=synthesized_content,
                confidence_score=0.5,  # To be calculated in next step
                evidence_sources=evidence_sources,
                strategic_implications=strategic_implications,
                recommended_actions=recommended_actions,
                conversation_continuity=conversation_continuity
            )
            
        except Exception as e:
            logger.error(f"Response synthesis failed: {e}")
            return self._fallback_response(request)
    
    def _calculate_confidence_metrics(
        self,
        response: StrategicResponse,
        gemini_result: Optional[Dict[str, Any]],
        perplexity_result: Optional[Dict[str, Any]]
    ) -> StrategicResponse:
        """Calculate confidence scores and consensus metrics."""
        try:
            # Base confidence calculation
            model_confidences = []
            
            if gemini_result and "error" not in gemini_result:
                model_confidences.append(gemini_result.get("model_confidence", 0.5))
            
            if perplexity_result and "error" not in perplexity_result:
                model_confidences.append(perplexity_result.get("model_confidence", 0.5))
            
            # Calculate average confidence
            if model_confidences:
                base_confidence = sum(model_confidences) / len(model_confidences)
            else:
                base_confidence = 0.3
            
            # Boost confidence based on evidence quality
            evidence_boost = 0.0
            if response.evidence_sources:
                avg_credibility = sum(src.credibility_score for src in response.evidence_sources) / len(response.evidence_sources)
                evidence_boost = min(0.2, avg_credibility * 0.2)
            
            # Boost confidence based on actionability
            action_boost = 0.0
            if response.recommended_actions:
                action_boost = min(0.1, len(response.recommended_actions) * 0.02)
            
            # Calculate final confidence
            final_confidence = min(1.0, base_confidence + evidence_boost + action_boost)
            
            # Calculate consensus (if both models succeeded)
            consensus_score = None
            if len(model_confidences) >= 2:
                consensus_score = 1.0 - abs(model_confidences[0] - model_confidences[1])
            
            # Update response
            response.confidence_score = final_confidence
            response.multi_model_consensus = consensus_score
            
            return response
            
        except Exception as e:
            logger.error(f"Confidence calculation failed: {e}")
            response.confidence_score = 0.4
            return response
    
    def _classify_query_type(self, request: AnalysisRequest) -> QueryType:
        """Phase 3: Classify query type for intelligent routing."""
        query_lower = request.query.lower()
        
        # Real-time intelligence keywords
        if any(keyword in query_lower for keyword in ['recent', 'latest', 'current', 'today', 'now', 'breaking']):
            return QueryType.REAL_TIME_INTELLIGENCE
        
        # Competitive analysis keywords
        if any(keyword in query_lower for keyword in ['opponent', 'competition', 'rival', 'vs', 'compare']):
            return QueryType.COMPETITIVE_ANALYSIS
        
        # Crisis response keywords
        if any(keyword in query_lower for keyword in ['crisis', 'emergency', 'urgent', 'damage control']):
            return QueryType.CRISIS_RESPONSE
        
        # Scenario planning keywords
        if any(keyword in query_lower for keyword in ['what if', 'scenario', 'predict', 'forecast', 'simulate']):
            return QueryType.SCENARIO_PLANNING
        
        # Conversational patterns
        if request.conversation_history and len(request.conversation_history) > 2:
            return QueryType.CONVERSATIONAL
        
        # Default to strategic analysis
        return QueryType.STRATEGIC_ANALYSIS
    
    def _intelligent_model_routing(self, request: AnalysisRequest, query_type: QueryType) -> ModelRoutingDecision:
        """Phase 3: Make intelligent model routing decision."""
        # Define query type to capability mapping
        query_capability_map = {
            QueryType.STRATEGIC_ANALYSIS: [ModelCapability.STRATEGIC_REASONING, ModelCapability.DEEP_ANALYSIS],
            QueryType.REAL_TIME_INTELLIGENCE: [ModelCapability.REAL_TIME_DATA, ModelCapability.CURRENT_EVENTS],
            QueryType.COMPETITIVE_ANALYSIS: [ModelCapability.STRATEGIC_REASONING, ModelCapability.SOURCE_VERIFICATION],
            QueryType.SCENARIO_PLANNING: [ModelCapability.STRATEGIC_REASONING, ModelCapability.DEEP_ANALYSIS],
            QueryType.CRISIS_RESPONSE: [ModelCapability.REAL_TIME_DATA, ModelCapability.STRATEGIC_REASONING],
            QueryType.CONVERSATIONAL: [ModelCapability.CONVERSATION_AWARE, ModelCapability.STRATEGIC_REASONING]
        }
        
        required_capabilities = query_capability_map.get(query_type, [ModelCapability.STRATEGIC_REASONING])
        
        # Calculate model fitness scores
        model_scores = {}
        for model, capabilities in self.model_capabilities.items():
            # Base capability match score
            capability_score = len(set(required_capabilities) & set(capabilities)) / len(required_capabilities)
            
            # Performance history weighting
            performance = self.model_performance_history.get(model, {'success_rate': 0.5, 'avg_confidence': 0.5})
            performance_score = (performance['success_rate'] + performance['avg_confidence']) / 2
            
            # Availability weighting
            availability_score = 1.0 if (model == 'gemini-2.0-flash-exp' and self.gemini_available) or \
                                       (model == 'perplexity-pro' and self.perplexity_available) else 0.0
            
            # Combined score with weighting
            model_scores[model] = (capability_score * 0.5 + performance_score * 0.3 + availability_score * 0.2)
        
        # Select primary model
        primary_model = max(model_scores, key=model_scores.get) if model_scores else 'gemini-2.0-flash-exp'
        primary_score = model_scores.get(primary_model, 0.5)
        
        # Select secondary model if scores are close
        remaining_models = {k: v for k, v in model_scores.items() if k != primary_model}
        secondary_model = None
        
        if remaining_models:
            secondary_candidate = max(remaining_models, key=remaining_models.get)
            secondary_score = remaining_models[secondary_candidate]
            
            # Use secondary if scores are within 0.2 (indicating both models are valuable)
            if primary_score - secondary_score <= 0.2:
                secondary_model = secondary_candidate
        
        # Determine fallback strategy
        fallback_strategy = "rule_based" if primary_score < 0.4 else "single_model" if not secondary_model else "adaptive_weighting"
        
        return ModelRoutingDecision(
            primary_model=primary_model,
            secondary_model=secondary_model,
            routing_confidence=primary_score,
            reasoning=f"Query type '{query_type.value}' requires {[c.value for c in required_capabilities]}. {primary_model} scored {primary_score:.2f}.",
            expected_capabilities=required_capabilities,
            fallback_strategy=fallback_strategy
        )
    
    async def _execute_primary_model(self, routing_decision: ModelRoutingDecision, request: AnalysisRequest) -> Dict[str, Any]:
        """Phase 3: Execute primary model based on routing decision."""
        if routing_decision.primary_model == 'gemini-2.0-flash-exp':
            return await self._gemini_analysis(request)
        elif routing_decision.primary_model == 'perplexity-pro':
            return await self._perplexity_analysis(request)
        else:
            logger.warning(f"Unknown primary model: {routing_decision.primary_model}")
            return {"error": f"Unknown model: {routing_decision.primary_model}"}
    
    async def _parallel_model_execution(self, routing_decision: ModelRoutingDecision, request: AnalysisRequest) -> Dict[str, Any]:
        """Phase 3: Execute models in parallel with intelligent coordination."""
        tasks = []
        model_names = []
        
        # Add primary model
        if routing_decision.primary_model == 'gemini-2.0-flash-exp' and self.gemini_available:
            tasks.append(self._gemini_analysis(request))
            model_names.append('gemini')
        elif routing_decision.primary_model == 'perplexity-pro' and self.perplexity_available:
            tasks.append(self._perplexity_analysis(request))
            model_names.append('perplexity')
        
        # Add secondary model if specified
        if routing_decision.secondary_model:
            if routing_decision.secondary_model == 'gemini-2.0-flash-exp' and self.gemini_available:
                tasks.append(self._gemini_analysis(request))
                model_names.append('gemini')
            elif routing_decision.secondary_model == 'perplexity-pro' and self.perplexity_available:
                tasks.append(self._perplexity_analysis(request))
                model_names.append('perplexity')
        
        if not tasks:
            return {'error': 'No available models for execution'}
        
        # Execute models in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Package results with model names
        execution_results = {}
        for i, result in enumerate(results):
            model_name = model_names[i] if i < len(model_names) else f'model_{i}'
            execution_results[model_name] = result if not isinstance(result, Exception) else {'error': str(result)}
        
        return execution_results
    
    async def _single_model_synthesis(self, result: Dict[str, Any], request: AnalysisRequest, routing_decision: ModelRoutingDecision) -> StrategicResponse:
        """Phase 3: Synthesize response from single model execution."""
        try:
            if 'error' in result:
                return self._fallback_response(request)
            
            # Extract evidence sources
            evidence_sources = []
            if 'external_sources' in result:
                for source in result['external_sources'][:5]:  # Limit to top 5
                    evidence_sources.append(EvidenceSource(
                        content=source.get('content', '')[:300],
                        source_type=source.get('type', 'external'),
                        credibility_score=source.get('credibility', 0.7),
                        timestamp=datetime.now(timezone.utc).isoformat()
                    ))
            
            return StrategicResponse(
                content=result.get('strategic_summary', f'Analysis for {request.ward}'),
                confidence_score=result.get('model_confidence', 0.7),
                evidence_sources=evidence_sources,
                strategic_implications=result.get('strategic_implications', []),
                recommended_actions=result.get('recommended_actions', []),
                conversation_continuity=result.get('conversation_continuity'),
                multi_model_consensus=None  # Single model, no consensus
            )
            
        except Exception as e:
            logger.error(f"Single model synthesis failed: {e}")
            return self._fallback_response(request)
    
    async def _adaptive_response_synthesis(self, results: Dict[str, Any], request: AnalysisRequest, routing_decision: ModelRoutingDecision) -> StrategicResponse:
        """Phase 3: Advanced adaptive response synthesis with evidence weighting."""
        try:
            # Extract successful results
            successful_results = {k: v for k, v in results.items() if 'error' not in v}
            
            if not successful_results:
                return self._fallback_response(request)
            
            # Calculate adaptive weights based on routing decision and model performance
            weights = self._calculate_adaptive_weights(successful_results, routing_decision)
            
            # Synthesize content with weighted combination
            content_parts = []
            all_implications = []
            all_actions = []
            all_evidence = []
            
            for model_name, result in successful_results.items():
                weight = weights.get(model_name, 0.5)
                
                if 'strategic_summary' in result:
                    content_parts.append(f"[{model_name.upper()} - weight: {weight:.2f}] {result['strategic_summary']}")
                
                if 'strategic_implications' in result and isinstance(result['strategic_implications'], list):
                    weighted_implications = [f"{impl} (confidence: {weight:.2f})" for impl in result['strategic_implications']]
                    all_implications.extend(weighted_implications)
                
                if 'recommended_actions' in result and isinstance(result['recommended_actions'], list):
                    for action in result['recommended_actions']:
                        if isinstance(action, dict):
                            action['model_confidence'] = weight
                        all_actions.append(action)
                
                # Process evidence sources
                if 'external_sources' in result:
                    for source in result['external_sources'][:3]:  # Top 3 per model
                        all_evidence.append(EvidenceSource(
                            content=source.get('content', '')[:200],
                            source_type=f"{model_name}_{source.get('type', 'external')}",
                            credibility_score=source.get('credibility', 0.7) * weight,
                            timestamp=datetime.now(timezone.utc).isoformat(),
                            relevance_score=weight
                        ))
            
            # Calculate consensus score
            consensus_score = None
            if len(successful_results) >= 2:
                model_confidences = [r.get('model_confidence', 0.5) for r in successful_results.values()]
                consensus_score = 1.0 - (max(model_confidences) - min(model_confidences))
            
            synthesized_content = "\n\n".join(content_parts) if content_parts else f"Multi-model analysis for {request.ward} ward."
            
            return StrategicResponse(
                content=synthesized_content,
                confidence_score=sum(weights.values()) / len(weights) if weights else 0.5,
                evidence_sources=all_evidence,
                strategic_implications=all_implications,
                recommended_actions=all_actions,
                conversation_continuity=successful_results.get('gemini', {}).get('conversation_continuity'),
                multi_model_consensus=consensus_score
            )
            
        except Exception as e:
            logger.error(f"Adaptive response synthesis failed: {e}")
            return self._fallback_response(request)
    
    def _calculate_adaptive_weights(self, results: Dict[str, Any], routing_decision: ModelRoutingDecision) -> Dict[str, float]:
        """Phase 3: Calculate adaptive weights for multi-model synthesis."""
        weights = {}
        
        for model_name, result in results.items():
            # Base weight from routing decision
            if (routing_decision.primary_model == 'gemini-2.0-flash-exp' and model_name == 'gemini') or \
               (routing_decision.primary_model == 'perplexity-pro' and model_name == 'perplexity'):
                base_weight = 0.7  # Primary model gets higher weight
            else:
                base_weight = 0.5  # Secondary model gets balanced weight
            
            # Adjust based on model confidence
            model_confidence = result.get('model_confidence', 0.5)
            confidence_adjustment = (model_confidence - 0.5) * 0.3  # ±0.15 adjustment range
            
            # Adjust based on evidence quality (if available)
            evidence_adjustment = 0.0
            if 'external_sources' in result:
                avg_credibility = sum(s.get('credibility', 0.5) for s in result['external_sources'][:3]) / min(3, len(result['external_sources']))
                evidence_adjustment = (avg_credibility - 0.5) * 0.2  # ±0.1 adjustment range
            
            # Final weight calculation
            final_weight = max(0.1, min(1.0, base_weight + confidence_adjustment + evidence_adjustment))
            weights[model_name] = final_weight
        
        # Normalize weights to sum to 1.0
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}
        
        return weights
    
    def _calculate_enhanced_confidence_metrics(
        self,
        response: StrategicResponse,
        routing_decision: ModelRoutingDecision,
        query_type: QueryType
    ) -> StrategicResponse:
        """Phase 3: Enhanced confidence calculation with multi-factor analysis."""
        try:
            # Base confidence from response
            base_confidence = response.confidence_score
            
            # Routing confidence boost
            routing_boost = routing_decision.routing_confidence * 0.1  # Up to 10% boost
            
            # Evidence quality boost
            evidence_boost = 0.0
            if response.evidence_sources:
                avg_credibility = sum(src.credibility_score for src in response.evidence_sources) / len(response.evidence_sources)
                evidence_boost = min(0.15, avg_credibility * 0.15)
            
            # Actionability boost
            action_boost = 0.0
            if response.recommended_actions:
                action_quality = len([a for a in response.recommended_actions if isinstance(a, dict) and 'timeline' in a]) / len(response.recommended_actions)
                action_boost = min(0.1, action_quality * 0.1)
            
            # Consensus boost (if multi-model)
            consensus_boost = 0.0
            if response.multi_model_consensus is not None:
                consensus_boost = response.multi_model_consensus * 0.05
            
            # Query type appropriateness boost
            query_type_boost = 0.0
            if routing_decision.routing_confidence > 0.8:
                query_type_boost = 0.05  # Reward good routing decisions
            
            # Calculate final confidence
            final_confidence = min(1.0, base_confidence + routing_boost + evidence_boost + action_boost + consensus_boost + query_type_boost)
            
            response.confidence_score = final_confidence
            return response
            
        except Exception as e:
            logger.error(f"Enhanced confidence calculation failed: {e}")
            return response
    
    def _update_model_performance_metrics(self, response: StrategicResponse, routing_decision: ModelRoutingDecision):
        """Phase 3: Update model performance metrics for future routing decisions."""
        try:
            # Update primary model metrics
            primary_model = routing_decision.primary_model
            if primary_model in self.model_performance_history:
                current_metrics = self.model_performance_history[primary_model]
                
                # Update confidence with exponential moving average
                alpha = 0.1  # Learning rate
                current_metrics['avg_confidence'] = (1 - alpha) * current_metrics['avg_confidence'] + alpha * response.confidence_score
                
                # Update success rate (if confidence > 0.5, consider success)
                success = 1.0 if response.confidence_score > 0.5 else 0.0
                current_metrics['success_rate'] = (1 - alpha) * current_metrics['success_rate'] + alpha * success
                
                logger.debug(f"Updated {primary_model} metrics: confidence={current_metrics['avg_confidence']:.2f}, success_rate={current_metrics['success_rate']:.2f}")
            
        except Exception as e:
            logger.error(f"Model performance metrics update failed: {e}")
    
    def _fallback_response(self, request: AnalysisRequest) -> StrategicResponse:
        """Phase 3: Enhanced fallback response with routing awareness."""
        return StrategicResponse(
            content=f"Strategic analysis for {request.ward} ward. Multi-model coordination temporarily unavailable - using fallback intelligence.",
            confidence_score=0.35,  # Slightly higher due to Phase 3 improvements
            evidence_sources=[],
            strategic_implications=["Monitor situation for developments", "Consider manual intelligence gathering"],
            recommended_actions=[{
                "category": "immediate",
                "description": "Review available intelligence sources and verify system status",
                "timeline": "2-4 hours",
                "priority": 1,
                "fallback_mode": True
            }],
            conversation_continuity="I apologize for the reduced capability. System is in fallback mode - please try your query again in a few minutes."
        )
    
    async def analyze_evidence_aggregation_with_weighting(
        self,
        evidence_sources: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Wave 2: Advanced evidence aggregation with credibility scoring."""
        try:
            if not evidence_sources or not self.gemini_available:
                return {"error": "No evidence sources or Gemini unavailable"}
            
            # Prepare evidence for analysis
            evidence_text = json.dumps(evidence_sources[:10], indent=2)  # Limit to top 10
            
            prompt = f"""
            Analyze these political intelligence evidence sources for credibility and relevance:
            
            Evidence Sources:
            {evidence_text}
            
            Provide JSON analysis with:
            - credibility_assessment: Overall credibility score (0-1)
            - source_quality_breakdown: Per-source quality scores
            - bias_indicators: Detected bias patterns
            - evidence_strength: How strong the evidence is for claims
            - conflicting_information: Any contradictory sources
            - synthesis_recommendations: How to best use this evidence
            
            Focus on objective analysis and source reliability.
            """
            
            response = self.gemini_model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": 2048,
                    "response_mime_type": "application/json"
                }
            )
            
            return json.loads(response.text)
            
        except Exception as e:
            logger.error(f"Evidence aggregation analysis failed: {e}")
            return {
                "credibility_assessment": 0.5,
                "source_quality_breakdown": {},
                "bias_indicators": [],
                "evidence_strength": "unknown",
                "conflicting_information": [],
                "synthesis_recommendations": "Use evidence with caution"
            }
    
    async def optimize_model_selection(
        self,
        historical_requests: List[AnalysisRequest],
        performance_feedback: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Phase 3: Optimize model selection based on historical performance."""
        try:
            if not historical_requests or not performance_feedback:
                return {"status": "insufficient_data", "optimizations": []}
            
            optimization_results = {
                "analyzed_requests": len(historical_requests),
                "performance_samples": len(performance_feedback),
                "optimizations": [],
                "recommendations": []
            }
            
            # Analyze query type performance patterns
            query_performance = {}
            for i, request in enumerate(historical_requests[:len(performance_feedback)]):
                query_type = self._classify_query_type(request)
                feedback = performance_feedback[i]
                
                if query_type not in query_performance:
                    query_performance[query_type] = []
                query_performance[query_type].append(feedback)
            
            # Generate optimization recommendations
            for query_type, feedback_list in query_performance.items():
                if len(feedback_list) >= 3:  # Minimum samples for optimization
                    avg_confidence = sum(f.get('confidence_score', 0.5) for f in feedback_list) / len(feedback_list)
                    avg_latency = sum(f.get('latency_seconds', 5.0) for f in feedback_list) / len(feedback_list)
                    
                    optimization_results["optimizations"].append({
                        "query_type": query_type.value,
                        "avg_confidence": avg_confidence,
                        "avg_latency": avg_latency,
                        "sample_size": len(feedback_list),
                        "optimization_potential": "high" if avg_confidence < 0.7 else "medium" if avg_confidence < 0.85 else "low"
                    })
            
            # Update thresholds if needed
            overall_confidence = sum(f.get('confidence_score', 0.5) for f in performance_feedback) / len(performance_feedback)
            if overall_confidence < 0.6:
                optimization_results["recommendations"].append("Consider lowering routing confidence threshold")
            elif overall_confidence > 0.9:
                optimization_results["recommendations"].append("Consider raising routing confidence threshold")
            
            return optimization_results
            
        except Exception as e:
            logger.error(f"Model selection optimization failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def _gemini_fallback_response(self, request: AnalysisRequest) -> Dict[str, Any]:
        """Fallback response when Gemini service is unavailable."""
        return {
            "strategic_summary": f"Analysis for {request.ward} ward is temporarily limited due to AI service unavailability.",
            "evidence_based_findings": [
                "Unable to access real-time strategic analysis capabilities",
                "Fallback to cached political intelligence data recommended",
                "Service restoration expected within recovery window"
            ],
            "strategic_implications": [
                f"Limited strategic intelligence available for {request.ward} ward",
                "Consider postponing critical strategic decisions until full service restoration",
                "Alternative data sources should be consulted for immediate decisions"
            ],
            "recommended_actions": [
                {"action": "Monitor service status", "priority": "high", "timeframe": "immediate"},
                {"action": "Consult cached intelligence reports", "priority": "medium", "timeframe": "short-term"},
                {"action": "Activate alternative analysis channels", "priority": "medium", "timeframe": "short-term"}
            ],
            "confidence_indicators": [
                "AI service temporarily unavailable - circuit breaker activated",
                "Fallback mode active - reduced analytical capabilities",
                "Service recovery in progress"
            ],
            "conversation_continuity": "Service interruption detected - please retry in a few minutes",
            "model": "gemini-fallback",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model_confidence": 0.3,  # Low confidence for fallback
            "fallback_mode": True,
            "circuit_breaker_active": True
        }
    
    def _perplexity_fallback_response(self, request: AnalysisRequest) -> Dict[str, Any]:
        """Fallback response when Perplexity service is unavailable.""" 
        return {
            "real_time_intelligence": f"Real-time intelligence for {request.ward} ward temporarily unavailable",
            "current_events": [
                "Unable to access current news and social media intelligence",
                "Real-time monitoring capabilities temporarily offline",
                "Historical data analysis remains available"
            ],
            "source_verification": [
                "Live source verification temporarily limited",
                "Cached credibility scores may be used",
                "Manual fact-checking recommended for critical decisions"
            ],
            "competitive_intelligence": [
                f"Real-time competitive analysis for {request.ward} unavailable",
                "Historical competitive patterns remain accessible",
                "Direct monitoring of opposition activities recommended"
            ],
            "recommended_actions": [
                {"action": "Switch to historical data analysis", "priority": "high", "timeframe": "immediate"},
                {"action": "Activate manual monitoring protocols", "priority": "medium", "timeframe": "short-term"},
                {"action": "Monitor service restoration status", "priority": "low", "timeframe": "ongoing"}
            ],
            "model": "perplexity-fallback",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model_confidence": 0.25,  # Lower confidence for real-time fallback
            "fallback_mode": True,
            "circuit_breaker_active": True
        }
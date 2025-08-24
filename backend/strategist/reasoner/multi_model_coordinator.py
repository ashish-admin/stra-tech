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

logger = logging.getLogger(__name__)


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
    Wave 2: Advanced multi-model AI coordination system.
    
    Orchestrates Gemini 2.5 Pro and Perplexity AI for comprehensive strategic analysis
    with conversation awareness and evidence aggregation.
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
        
        # Wave 2 configuration
        self.evidence_threshold = float(os.getenv('EVIDENCE_CONFIDENCE_THRESHOLD', '0.7'))
        self.consensus_threshold = float(os.getenv('MULTI_MODEL_CONSENSUS_THRESHOLD', '0.8'))
        self.conversation_memory_limit = int(os.getenv('CONVERSATION_MEMORY_LIMIT', '10'))
        
    async def coordinate_strategic_analysis(
        self,
        request: AnalysisRequest
    ) -> StrategicResponse:
        """
        Coordinate multi-model strategic analysis with evidence aggregation.
        
        Args:
            request: Structured analysis request with context
            
        Returns:
            Enhanced strategic response with confidence metrics
        """
        logger.info(f"Starting multi-model analysis for ward: {request.ward}")
        
        try:
            # Step 1: Parallel model execution
            tasks = []
            
            if self.gemini_available:
                tasks.append(self._gemini_analysis(request))
                
            if self.perplexity_available:
                tasks.append(self._perplexity_analysis(request))
            
            # Execute models in parallel
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Step 2: Process results and handle failures
            gemini_result = None
            perplexity_result = None
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Model {i} failed: {result}")
                    continue
                    
                if i == 0 and self.gemini_available:
                    gemini_result = result
                elif i == 1 and self.perplexity_available:
                    perplexity_result = result
            
            # Step 3: Synthesize responses
            synthesized_response = await self._synthesize_responses(
                gemini_result,
                perplexity_result,
                request
            )
            
            # Step 4: Calculate confidence and consensus metrics
            synthesized_response = self._calculate_confidence_metrics(
                synthesized_response,
                gemini_result,
                perplexity_result
            )
            
            logger.info(f"Multi-model analysis complete: confidence={synthesized_response.confidence_score:.2f}")
            return synthesized_response
            
        except Exception as e:
            logger.error(f"Multi-model coordination failed: {e}", exc_info=True)
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
            
            response = self.gemini_model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 3072,
                    "response_mime_type": "application/json"
                }
            )
            
            result = json.loads(response.text)
            result.update({
                "model": "gemini-2.0-flash-exp",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "model_confidence": 0.85  # Base Gemini confidence
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            return {"error": str(e), "model": "gemini-2.0-flash-exp"}
    
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
            
            # Gather intelligence
            intelligence = await retriever.gather_intelligence(queries)
            
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
            return {"error": str(e), "model": "perplexity-pro"}
    
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
    
    def _fallback_response(self, request: AnalysisRequest) -> StrategicResponse:
        """Generate fallback response when multi-model coordination fails."""
        return StrategicResponse(
            content=f"Strategic analysis for {request.ward} ward. Multi-model coordination temporarily unavailable.",
            confidence_score=0.3,
            evidence_sources=[],
            strategic_implications=["Monitor situation for developments"],
            recommended_actions=[{
                "category": "immediate",
                "description": "Review available intelligence sources",
                "timeline": "24h",
                "priority": 1
            }],
            conversation_continuity="I apologize for the reduced capability. Please try your query again."
        )
    
    async def analyze_evidence_aggregation(
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
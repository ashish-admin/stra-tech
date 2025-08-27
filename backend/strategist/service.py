"""
Political Strategist Service

Main orchestrator for the AI-powered political strategist system.
Coordinates context analysis, intelligence gathering, and strategic reasoning.
"""

import os
import time
import logging
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from .cache import cget, cset
from .reasoner.ultra_think import StrategicPlanner
from .reasoner.multi_model_coordinator import MultiModelCoordinator, AnalysisRequest
from .reasoner.enhanced_multi_model import EnhancedMultiModelCoordinator
from .retriever.perplexity_client import PerplexityRetriever
from .nlp.pipeline import NLPProcessor
from .credibility.checks import CredibilityScorer
from .guardrails import sanitize_and_strategize
from .observability import get_observer, monitor_strategist_operation

logger = logging.getLogger(__name__)


class PoliticalStrategist:
    """
    Main Political Strategist agent orchestrator.
    
    Coordinates multiple AI components to provide comprehensive political intelligence:
    - Context analysis for ward-specific insights
    - Real-time intelligence gathering
    - Strategic reasoning and opportunity detection
    - Response generation with actionable recommendations
    """
    
    def __init__(self, ward: str, context_mode: str = "neutral"):
        self.ward = ward
        self.context_mode = context_mode
        self.planner = StrategicPlanner()
        self.retriever = PerplexityRetriever()
        self.nlp = NLPProcessor()
        self.credibility = CredibilityScorer()
        self.observer = get_observer()
        # Wave 2 enhancements
        self.multi_model_coordinator = MultiModelCoordinator()
        # Enhanced multi-model coordinator with Claude support
        self.enhanced_coordinator = EnhancedMultiModelCoordinator()
        self.conversation_context = None
        
    @monitor_strategist_operation("analyze_situation")
    async def analyze_situation(
        self, 
        depth: str = "standard", 
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        user_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive political situation analysis.
        
        Args:
            depth: Analysis depth - "quick", "standard", or "deep"
            
        Returns:
            Structured strategic briefing with recommendations
        """
        start_time = time.time()
        
        try:
            # Log analysis start
            self.observer.log_analysis_start(self.ward, depth, self.context_mode)
            
            # Step 1: Generate strategic plan
            logger.info(f"Starting {depth} analysis for ward: {self.ward}")
            plan = await self.planner.create_analysis_plan(
                ward=self.ward,
                depth=depth,
                context_mode=self.context_mode
            )
            
            # Step 2: Gather intelligence
            logger.info(f"Gathering intelligence with {len(plan.get('queries', []))} queries")
            raw_intelligence = await self.retriever.gather_intelligence(plan.get('queries', []))
            
            # Step 2.5: Enhanced multi-model analysis (Claude, OpenAI, Perplexity)
            try:
                query_text = ' '.join(plan.get('queries', []))[:200] if plan.get('queries') else f"Political analysis for {self.ward}"
                enhanced_analysis = await self.enhanced_coordinator.coordinate_analysis(
                    query=query_text,
                    ward=self.ward,
                    depth=depth,
                    context={
                        'mode': self.context_mode,
                        'raw_intelligence': raw_intelligence.get('intelligence_items', [])[:2] if raw_intelligence else []
                    }
                )
                
                # Merge enhanced analysis with raw intelligence
                if enhanced_analysis and not enhanced_analysis.get('fallback_mode'):
                    logger.info(f"Enhanced analysis from {enhanced_analysis.get('model_used', 'multi-model')}")
                    raw_intelligence['enhanced_analysis'] = enhanced_analysis
                    raw_intelligence['ai_models_used'] = enhanced_analysis.get('models_consulted', [])
            except Exception as e:
                logger.warning(f"Enhanced multi-model analysis failed: {e}, continuing with standard flow")
            
            # Step 3: Process and score sources
            scored_intelligence = await self.credibility.score_sources(raw_intelligence)
            
            # Step 4: NLP analysis
            processed_data = await self.nlp.analyze_corpus(
                data=scored_intelligence,
                ward=self.ward,
                depth=depth,
                context_mode=self.context_mode
            )
            
            # Step 5: Generate strategic briefing
            # Include enhanced multi-model analysis if available
            if raw_intelligence.get('enhanced_analysis'):
                processed_data['enhanced_insights'] = raw_intelligence['enhanced_analysis']
                
            briefing = await self.planner.generate_briefing(
                plan=plan,
                intelligence=processed_data,
                ward=self.ward
            )
            
            # Step 6: Apply guardrails and sanitization
            final_result = sanitize_and_strategize(briefing)
            
            # Add AI model information if enhanced analysis was used
            if raw_intelligence.get('ai_models_used'):
                final_result['ai_powered'] = True
                final_result['models_used'] = raw_intelligence['ai_models_used']
                if raw_intelligence.get('enhanced_analysis', {}).get('real_time_intelligence'):
                    final_result['real_time_intelligence'] = raw_intelligence['enhanced_analysis']['real_time_intelligence']
            
            # Log analysis completion
            duration = time.time() - start_time
            confidence = final_result.get('confidence_score', 0)
            sources_count = len(final_result.get('source_citations', []))
            
            self.observer.log_analysis_complete(self.ward, duration, confidence, sources_count)
            
            logger.info(f"Analysis completed for {self.ward} with confidence: {confidence}")
            return final_result
            
        except Exception as e:
            logger.error(f"Error in situation analysis for {self.ward}: {e}", exc_info=True)
            return {
                "error": "Analysis failed",
                "ward": self.ward,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "fallback_mode": True
            }
    
    async def analyze_conversation_query(
        self,
        user_query: str,
        conversation_history: List[Dict[str, Any]],
        chat_type: str = "strategy"
    ) -> Dict[str, Any]:
        """
        Wave 2: Advanced conversational strategic analysis.
        
        Provides conversation-aware strategic analysis with multi-model coordination.
        """
        try:
            logger.info(f"Starting conversational analysis for ward: {self.ward}, chat_type: {chat_type}")
            
            # Create structured analysis request
            analysis_request = AnalysisRequest(
                ward=self.ward,
                query=user_query,
                depth="standard",
                context_mode=self.context_mode,
                conversation_history=conversation_history,
                user_preferences={"chat_type": chat_type}
            )
            
            # Execute multi-model strategic analysis
            strategic_response = await self.multi_model_coordinator.coordinate_strategic_analysis(
                analysis_request
            )
            
            # Format response for conversation interface
            result = {
                "ward": self.ward,
                "query": user_query,
                "chat_type": chat_type,
                "analysis_type": "conversational_strategic",
                "content": strategic_response.content,
                "confidence_score": strategic_response.confidence_score,
                "strategic_implications": strategic_response.strategic_implications,
                "recommended_actions": strategic_response.recommended_actions,
                "evidence_sources": [
                    {
                        "content": src.content,
                        "credibility_score": src.credibility_score,
                        "source_type": src.source_type,
                        "timestamp": src.timestamp
                    }
                    for src in strategic_response.evidence_sources
                ],
                "conversation_continuity": strategic_response.conversation_continuity,
                "multi_model_consensus": strategic_response.multi_model_consensus,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "model_coordination": "multi_model_gemini_perplexity"
            }
            
            # Log success metrics
            logger.info(f"Conversational analysis complete - confidence: {strategic_response.confidence_score:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Conversational analysis failed: {e}", exc_info=True)
            return {
                "error": "Conversational analysis failed",
                "ward": self.ward,
                "query": user_query,
                "fallback_response": f"I understand you're asking about {user_query}. Let me provide what I can based on available information.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "fallback_mode": True
            }


async def get_ward_report(ward: str, depth: str = "standard") -> tuple[Dict[str, Any], str, int]:
    """
    Get cached or generate new ward strategic report.
    
    Returns:
        Tuple of (data, etag, ttl)
    """
    cache_key = f"strategist:ward:{ward}:{depth}"
    
    # Check cache first
    cached = cget(cache_key)
    if cached:
        logger.info(f"Serving cached report for {ward}")
        from .observability import record_cache_operation
        record_cache_operation("get", True, "strategist")
        return cached['data'], cached['etag'], cached['ttl']
    
    # Cache miss
    from .observability import record_cache_operation
    record_cache_operation("get", False, "strategist")
    
    try:
        # Generate new analysis - FIXED: Added await keyword
        strategist = PoliticalStrategist(ward)
        result = await strategist.analyze_situation(depth)
        
        # Generate ETag and TTL
        etag = hashlib.md5(str(result).encode()).hexdigest()
        ttl = int(os.getenv('ETAG_TTL', 60))
        
        # Cache the result
        cset(cache_key, result, etag, ttl)
        
        logger.info(f"Generated new report for {ward}")
        return result, etag, ttl
        
    except Exception as e:
        logger.error(f"Error generating ward report for {ward}: {e}", exc_info=True)
        # Return fallback response
        fallback = {
            "ward": ward,
            "error": "Service temporarily unavailable",
            "fallback_mode": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        etag = "fallback"
        ttl = 30  # Short TTL for fallback
        return fallback, etag, ttl


async def analyze_text(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze arbitrary text content for political insights.
    
    Args:
        payload: Contains text, ward, context parameters
        
    Returns:
        Strategic analysis results
    """
    try:
        ward = payload.get('ward', 'Unknown')
        text = payload.get('text', '')
        context = payload.get('context', 'neutral')
        
        if not text:
            return {"error": "No text provided for analysis"}
        
        strategist = PoliticalStrategist(ward, context)
        
        # Quick analysis for text-based requests - FIXED: Added await keyword
        result = await strategist.analyze_situation("quick")
        result['analyzed_text'] = text[:200] + "..." if len(text) > 200 else text
        
        return result
        
    except Exception as e:
        logger.error(f"Error in text analysis: {e}", exc_info=True)
        return {
            "error": "Analysis failed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
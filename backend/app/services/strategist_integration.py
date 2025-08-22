"""
Strategist Integration Adapter

Integrates the existing Political Strategist system with the new multi-model AI orchestrator,
providing seamless backward compatibility while leveraging enhanced routing and cost optimization.
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from .ai_orchestrator import orchestrator
from ..models import AIModelExecution, db

logger = logging.getLogger(__name__)


class StrategistMultiModelAdapter:
    """
    Adapter that integrates existing strategist system with enhanced multi-model orchestrator.
    
    Provides:
    - Backward compatibility with existing strategist API
    - Enhanced AI routing with cost optimization
    - Confidence scoring for strategist responses
    - Seamless transition from legacy to multi-model system
    """
    
    def __init__(self):
        self.orchestrator = orchestrator
        self.legacy_enabled = True
        
    async def analyze_political_situation(self, ward: str, query: str = None, 
                                        depth: str = "standard", 
                                        context_mode: str = "neutral") -> Dict[str, Any]:
        """
        Enhanced political situation analysis using multi-model orchestration.
        
        Args:
            ward: Ward name for context
            query: Specific analysis query (optional, generates default if None)
            depth: Analysis depth (quick|standard|deep)
            context_mode: Strategic context (defensive|neutral|offensive)
            
        Returns:
            Enhanced analysis with confidence metrics and model attribution
        """
        
        # Generate default query if none provided
        if not query:
            query = self._generate_default_query(ward, depth, context_mode)
        
        # Build context for multi-model system
        context = {
            "ward_context": ward,
            "analysis_depth": depth,
            "strategic_context": context_mode,
            "region_context": "hyderabad",
            "priority": "normal"
        }
        
        try:
            # Use enhanced orchestrator with confidence scoring
            result = await self.orchestrator.generate_response_with_confidence(
                query, context, enable_consensus=False
            )
            
            response = result["response"]
            confidence_metrics = result["confidence_metrics"]
            
            # Transform to strategist format for backward compatibility
            strategist_response = self._transform_to_strategist_format(
                response, confidence_metrics, ward, depth
            )
            
            # Record strategist-specific metrics
            await self._record_strategist_usage(response, ward, depth)
            
            logger.info(f"Enhanced strategist analysis for {ward}: {response.provider.value}, "
                       f"confidence: {confidence_metrics['overall_confidence']:.2f}")
            
            return strategist_response
            
        except Exception as e:
            logger.error(f"Enhanced strategist analysis failed for {ward}: {e}")
            
            # Fallback to basic analysis if available
            return await self._fallback_analysis(ward, query, depth, context_mode)
    
    async def quick_intelligence_brief(self, ward: str, focus_area: str = None) -> Dict[str, Any]:
        """
        Generate quick intelligence briefing for urgent political developments.
        
        Args:
            ward: Ward name for context
            focus_area: Specific area to focus on (optional)
            
        Returns:
            Quick intelligence brief with real-time data
        """
        
        # Build urgent query for real-time intelligence
        if focus_area:
            query = f"Latest political developments in {ward} regarding {focus_area}"
        else:
            query = f"Breaking political news and urgent developments in {ward}"
        
        context = {
            "ward_context": ward,
            "analysis_depth": "quick",
            "strategic_context": "neutral",
            "priority": "urgent",
            "urgency": "high"
        }
        
        try:
            # Use orchestrator for real-time intelligence
            response = await self.orchestrator.generate_response(query, context)
            
            # Format as intelligence brief
            brief = {
                "ward": ward,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "brief_type": "urgent_intelligence",
                "content": response.content,
                "confidence_level": response.metadata.get("confidence_level", "medium"),
                "source_model": response.provider.value,
                "processing_time_ms": response.latency_ms,
                "cost_usd": response.cost_usd,
                "real_time_data": response.metadata.get("real_time_search", False)
            }
            
            return brief
            
        except Exception as e:
            logger.error(f"Quick intelligence brief failed for {ward}: {e}")
            return self._generate_error_brief(ward, str(e))
    
    async def strategic_recommendation(self, ward: str, situation: str, 
                                     strategic_goal: str) -> Dict[str, Any]:
        """
        Generate strategic recommendations for specific political situations.
        
        Args:
            ward: Ward name for context
            situation: Current political situation description
            strategic_goal: Desired strategic outcome
            
        Returns:
            Strategic recommendations with tactical guidance
        """
        
        query = f"""
        Political Situation: {situation}
        Strategic Goal: {strategic_goal}
        Ward Context: {ward}
        
        Provide strategic recommendations with:
        1. Immediate tactical steps
        2. Medium-term strategic positioning
        3. Risk mitigation strategies
        4. Success metrics and milestones
        """
        
        context = {
            "ward_context": ward,
            "analysis_depth": "deep",
            "strategic_context": "offensive",
            "priority": "high"
        }
        
        try:
            # Use enhanced orchestrator with consensus for critical recommendations
            result = await self.orchestrator.generate_response_with_confidence(
                query, context, enable_consensus=True
            )
            
            response = result["response"]
            confidence_metrics = result["confidence_metrics"]
            consensus_data = result.get("consensus_data", {})
            
            recommendations = {
                "ward": ward,
                "situation": situation,
                "strategic_goal": strategic_goal,
                "recommendations": response.content,
                "confidence_score": confidence_metrics["overall_confidence"],
                "model_consensus": consensus_data.get("consensus_available", False),
                "model_agreement": consensus_data.get("agreement_score"),
                "primary_model": response.provider.value,
                "generation_time_ms": result.get("generation_time_ms", 0),
                "total_cost_usd": response.cost_usd + consensus_data.get("secondary_cost", 0),
                "validation_status": "high_confidence" if confidence_metrics["overall_confidence"] > 0.8 else "review_recommended"
            }
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Strategic recommendation failed for {ward}: {e}")
            return self._generate_error_recommendation(ward, situation, str(e))
    
    def _generate_default_query(self, ward: str, depth: str, context_mode: str) -> str:
        """Generate default analysis query based on parameters."""
        
        depth_prompts = {
            "quick": f"Provide a quick political intelligence brief for {ward}",
            "standard": f"Analyze the current political landscape and strategic opportunities in {ward}",
            "deep": f"Conduct comprehensive political analysis of {ward} including historical context, current dynamics, stakeholder analysis, and strategic recommendations"
        }
        
        context_modifiers = {
            "defensive": " with focus on threat mitigation and defensive strategies",
            "neutral": " with balanced assessment of opportunities and challenges",
            "offensive": " with focus on competitive advantages and proactive strategies"
        }
        
        base_query = depth_prompts.get(depth, depth_prompts["standard"])
        modifier = context_modifiers.get(context_mode, "")
        
        return base_query + modifier
    
    def _transform_to_strategist_format(self, response, confidence_metrics: Dict, 
                                      ward: str, depth: str) -> Dict[str, Any]:
        """Transform multi-model response to strategist format for backward compatibility."""
        
        return {
            "ward": ward,
            "analysis_depth": depth,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            
            # Core analysis content
            "analysis": response.content,
            "executive_summary": self._extract_summary(response.content),
            "key_findings": self._extract_findings(response.content),
            "recommendations": self._extract_recommendations(response.content),
            
            # Enhanced metadata from multi-model system
            "confidence_score": confidence_metrics["overall_confidence"],
            "confidence_breakdown": confidence_metrics.get("confidence_breakdown", {}),
            "model_used": response.model_used,
            "provider": response.provider.value,
            "quality_score": response.quality_score,
            
            # Performance metrics
            "processing_time_ms": response.latency_ms,
            "cost_usd": response.cost_usd,
            "tokens_used": response.tokens_used,
            
            # Strategist-specific fields for compatibility
            "credibility_score": confidence_metrics["overall_confidence"],
            "intelligence_sources": response.metadata.get("source_count", 0),
            "strategic_assessment": "high_confidence" if confidence_metrics["overall_confidence"] > 0.8 else "moderate_confidence",
            
            # Legacy fields maintained for API compatibility
            "status": "success",
            "cached": False,
            "cache_ttl": 0
        }
    
    def _extract_summary(self, content: str) -> str:
        """Extract executive summary from analysis content."""
        
        # Look for summary section markers
        summary_markers = ["Executive Summary", "Key Findings", "Summary"]
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if any(marker in line for marker in summary_markers):
                # Extract next few lines as summary
                summary_lines = []
                for j in range(i + 1, min(i + 5, len(lines))):
                    if lines[j].strip() and not lines[j].startswith('#'):
                        summary_lines.append(lines[j].strip())
                if summary_lines:
                    return ' '.join(summary_lines)
        
        # Fallback: use first paragraph
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        return paragraphs[0] if paragraphs else "Analysis summary not available"
    
    def _extract_findings(self, content: str) -> List[str]:
        """Extract key findings from analysis content."""
        
        findings = []
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            # Look for bullet points or numbered items
            if line.startswith(('•', '-', '*')) or (line and line[0].isdigit() and '.' in line[:3]):
                finding = line.lstrip('•-* ').lstrip('0123456789.')
                if finding:
                    findings.append(finding.strip())
        
        # Limit to top 5 findings
        return findings[:5] if findings else ["Key findings analysis in progress"]
    
    def _extract_recommendations(self, content: str) -> List[str]:
        """Extract recommendations from analysis content."""
        
        recommendations = []
        lines = content.split('\n')
        
        in_recommendations_section = False
        for line in lines:
            line = line.strip()
            
            # Look for recommendations section
            if any(keyword in line.lower() for keyword in ['recommendation', 'suggest', 'action', 'strategy']):
                in_recommendations_section = True
                continue
            
            # Extract recommendations
            if in_recommendations_section and line:
                if line.startswith(('•', '-', '*')) or (line and line[0].isdigit() and '.' in line[:3]):
                    rec = line.lstrip('•-* ').lstrip('0123456789.')
                    if rec:
                        recommendations.append(rec.strip())
        
        # Limit to top 5 recommendations
        return recommendations[:5] if recommendations else ["Strategic recommendations analysis in progress"]
    
    async def _record_strategist_usage(self, response, ward: str, depth: str):
        """Record strategist-specific usage metrics."""
        
        try:
            execution = AIModelExecution(
                request_id=f"strategist_{ward}_{int(time.time())}",
                user_id=None,  # Will be set by calling service
                operation_type="strategist_analysis",
                provider=response.provider.value,
                model_name=response.model_used,
                input_tokens=response.tokens_used.get("input", 0),
                output_tokens=response.tokens_used.get("output", 0),
                total_tokens=sum(response.tokens_used.values()),
                latency_ms=response.latency_ms,
                cost_usd=response.cost_usd,
                success_status="success",
                quality_score=response.quality_score,
                request_metadata={
                    "ward": ward,
                    "analysis_depth": depth,
                    "strategist_integration": True
                },
                response_metadata=response.metadata
            )
            
            db.session.add(execution)
            db.session.commit()
            
        except Exception as e:
            logger.warning(f"Failed to record strategist usage: {e}")
            db.session.rollback()
    
    async def _fallback_analysis(self, ward: str, query: str, depth: str, context_mode: str) -> Dict[str, Any]:
        """Fallback analysis when enhanced system fails."""
        
        return {
            "ward": ward,
            "analysis_depth": depth,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "analysis": f"Political analysis for {ward} is temporarily unavailable. Please try again later.",
            "status": "fallback",
            "error": "Enhanced analysis system temporarily unavailable",
            "confidence_score": 0.1,
            "model_used": "fallback",
            "provider": "system"
        }
    
    def _generate_error_brief(self, ward: str, error: str) -> Dict[str, Any]:
        """Generate error brief when intelligence gathering fails."""
        
        return {
            "ward": ward,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "brief_type": "error",
            "content": f"Intelligence brief for {ward} temporarily unavailable due to system error.",
            "error": error,
            "confidence_level": "low",
            "source_model": "error_handler"
        }
    
    def _generate_error_recommendation(self, ward: str, situation: str, error: str) -> Dict[str, Any]:
        """Generate error response for strategic recommendations."""
        
        return {
            "ward": ward,
            "situation": situation,
            "recommendations": f"Strategic recommendations for {ward} temporarily unavailable.",
            "error": error,
            "confidence_score": 0.0,
            "validation_status": "error"
        }


# Global adapter instance
strategist_adapter = StrategistMultiModelAdapter()
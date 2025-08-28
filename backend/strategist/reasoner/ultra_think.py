"""
Ultra Think Strategic Planner

Gemini-powered strategic planning and analysis engine with deliberation budgets.
Generates comprehensive analysis plans and strategic briefings.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

import google.generativeai as genai

from ..prompts import STRATEGIST_PROMPTS

logger = logging.getLogger(__name__)

# Configure Gemini with enhanced error handling
GEMINI_AVAILABLE = False
model = None

try:
    api_key = os.environ["GEMINI_API_KEY"]
    if api_key and api_key.strip() and not api_key.startswith("placeholder"):
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        GEMINI_AVAILABLE = True
        logger.info("Gemini 2.0 Flash configured for strategic planning")
    else:
        logger.warning("Invalid or placeholder GEMINI_API_KEY - using fallback mode")
except KeyError:
    logger.error("GEMINI_API_KEY not set - using fallback mode")
except Exception as e:
    logger.error(f"Failed to configure Gemini API: {e} - using fallback mode")


class StrategicPlanner:
    """
    AI-powered strategic planning engine using Gemini 2.0 Flash.
    
    Implements "Ultra Think" approach with deliberation budgets and explainability.
    Enhanced for Wave 2 with multi-model coordination and conversation-aware analysis.
    """
    
    def __init__(self):
        self.model = model
        self.gemini_available = GEMINI_AVAILABLE
        self.think_tokens = int(os.getenv('THINK_TOKENS', 4096))
        # Wave 2 enhancements
        self.conversation_context = None
        self.multi_model_enabled = os.getenv('MULTI_MODEL_ENABLED', 'true').lower() == 'true'
        self.evidence_aggregation_enabled = True
        self.confidence_scoring_enabled = True
        # Infrastructure monitoring
        self._consecutive_failures = 0
        self._max_failures_before_fallback = 3
        
    async def create_analysis_plan(
        self, 
        ward: str, 
        depth: str = "standard", 
        context_mode: str = "neutral",
        conversation_context: Optional[Dict[str, Any]] = None,
        evidence_sources: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Create strategic analysis plan for a ward.
        
        Args:
            ward: Ward name/ID
            depth: Analysis depth (quick/standard/deep)
            context_mode: Strategic context (defensive/neutral/offensive)
            
        Returns:
            Analysis plan with queries and strategy framework
        """
        # Check if we should use fallback due to previous failures or quota issues
        if not self.model or not self.gemini_available or self._consecutive_failures >= self._max_failures_before_fallback:
            logger.info(f"Using fallback plan for {ward} (failures: {self._consecutive_failures})")
            return self._fallback_plan(ward, depth, context_mode)
            
        try:
            prompt = STRATEGIST_PROMPTS["create_plan"].format(
                ward=ward,
                depth=depth,
                context_mode=context_mode,
                token_budget=self.think_tokens
            )
            
            logger.info(f"Creating analysis plan for {ward} (depth: {depth}, mode: {context_mode})")
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 2048,
                    "response_mime_type": "application/json"
                }
            )
            
            plan = json.loads(response.text)
            plan["created_at"] = datetime.now(timezone.utc).isoformat()
            plan["ward"] = ward
            plan["depth"] = depth
            plan["context_mode"] = context_mode
            
            logger.info(f"Generated plan with {len(plan.get('queries', []))} intelligence queries")
            self._consecutive_failures = 0  # Reset failure counter on success
            return plan
            
        except Exception as e:
            self._consecutive_failures += 1
            error_msg = str(e).lower()
            
            # Detect quota/API issues and temporarily disable Gemini
            if any(keyword in error_msg for keyword in ['quota', '429', 'rate_limit', 'resource_exhausted']):
                logger.error(f"Gemini API quota exhausted - switching to fallback mode: {e}")
                self.gemini_available = False
            else:
                logger.error(f"Error creating analysis plan: {e}", exc_info=True)
            
            return self._fallback_plan(ward, depth, context_mode)
    
    async def generate_briefing(
        self, 
        plan: Dict[str, Any], 
        intelligence: Dict[str, Any], 
        ward: str
    ) -> Dict[str, Any]:
        """
        Generate strategic briefing based on plan and gathered intelligence.
        
        Args:
            plan: Strategic analysis plan
            intelligence: Processed intelligence data
            ward: Ward name/ID
            
        Returns:
            Comprehensive strategic briefing
        """
        # Use fallback if Gemini unavailable or too many failures
        if not self.model or not self.gemini_available or self._consecutive_failures >= self._max_failures_before_fallback:
            logger.info(f"Using fallback briefing for {ward} (failures: {self._consecutive_failures})")
            return self._fallback_briefing(ward, intelligence)
            
        try:
            prompt = STRATEGIST_PROMPTS["generate_briefing"].format(
                ward=ward,
                plan=json.dumps(plan, indent=2),
                intelligence=json.dumps(intelligence, indent=2),
                context_mode=plan.get("context_mode", "neutral")
            )
            
            logger.info(f"Generating strategic briefing for {ward}")
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": 4096,
                    "response_mime_type": "application/json"
                }
            )
            
            briefing = json.loads(response.text)
            briefing.update({
                "ward": ward,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "model": "gemini-2.0-flash-exp",
                "confidence_score": min(1.0, max(0.0, briefing.get("confidence_score", 0.5)))
            })
            
            logger.info(f"Generated briefing with {len(briefing.get('recommended_actions', []))} actions")
            self._consecutive_failures = 0  # Reset failure counter on success
            return briefing
            
        except Exception as e:
            self._consecutive_failures += 1
            error_msg = str(e).lower()
            
            # Detect quota/API issues
            if any(keyword in error_msg for keyword in ['quota', '429', 'rate_limit', 'resource_exhausted']):
                logger.error(f"Gemini API quota exhausted during briefing - switching to fallback mode: {e}")
                self.gemini_available = False
            else:
                logger.error(f"Error generating briefing: {e}", exc_info=True)
            
            return self._fallback_briefing(ward, intelligence)
    
    def _fallback_plan(self, ward: str, depth: str, context_mode: str) -> Dict[str, Any]:
        """Fallback plan when AI is unavailable."""
        return {
            "ward": ward,
            "depth": depth,
            "context_mode": context_mode,
            "queries": [
                f"{ward} political news recent",
                f"{ward} development issues infrastructure",
                f"Hyderabad {ward} opposition activities"
            ],
            "strategy_framework": {
                "focus_areas": ["local_issues", "opposition_monitoring", "opportunity_detection"],
                "analysis_priorities": ["sentiment", "narrative", "action_items"]
            },
            "fallback_mode": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    def _fallback_briefing(self, ward: str, intelligence: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced fallback briefing when AI is unavailable."""
        # Extract any available intelligence data
        intel_items = intelligence.get('items', []) if intelligence else []
        intel_count = len(intel_items)
        
        # Ward-specific insights based on context
        ward_insights = self._get_ward_context(ward)
        
        return {
            "ward": ward,
            "ai_powered": False,
            "fallback_mode": True,
            "strategic_overview": f"Strategic analysis for {ward} using available data sources. {intel_count} intelligence items processed.",
            "insights": [
                f"Analysis based on {intel_count} available data points",
                f"Ward context: {ward_insights['context']}",
                "Real-time AI analysis temporarily unavailable - using rule-based intelligence"
            ],
            "key_intelligence": intel_items[:3] if intel_items else ["No real-time intelligence data available"],
            "opportunities": [
                {
                    "description": f"Monitor local development initiatives in {ward} for positive messaging opportunities",
                    "timeline": "ongoing",
                    "priority": 2,
                    "category": "messaging"
                },
                {
                    "description": "Leverage infrastructure improvements for community engagement",
                    "timeline": "short-term",
                    "priority": 3,
                    "category": "community"
                }
            ],
            "risks": [
                {
                    "description": "Limited real-time intelligence due to AI system maintenance",
                    "severity": "low",
                    "timeline": "immediate",
                    "mitigation": "Manual monitoring recommended"
                }
            ],
            "threats": [
                {
                    "description": f"Opposition narrative monitoring required for {ward}",
                    "severity": "medium",
                    "timeline": "ongoing",
                    "source": "rule-based analysis"
                }
            ],
            "recommended_actions": [
                {
                    "category": "immediate",
                    "description": f"Conduct manual review of {ward} intelligence sources",
                    "timeline": "4-8 hours",
                    "priority": 1,
                    "resources_required": "Campaign analyst"
                },
                {
                    "category": "operational",
                    "description": "Monitor local media and social channels manually",
                    "timeline": "daily",
                    "priority": 2,
                    "resources_required": "Social media team"
                },
                {
                    "category": "strategic",
                    "description": "Prepare contingency messaging for infrastructure/development issues",
                    "timeline": "24-48 hours",
                    "priority": 3,
                    "resources_required": "Communications team"
                }
            ],
            "confidence_score": 0.3,
            "reliability_indicators": {
                "data_freshness": "limited",
                "source_diversity": "basic",
                "analysis_depth": "rule-based",
                "ai_enhancement": False
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "fallback_reason": "AI quota limits or service unavailability",
            "next_steps": [
                "Monitor AI service status for restoration",
                "Implement manual intelligence gathering protocols",
                "Review and update rule-based analysis parameters"
            ]
        }
        
    def _get_ward_context(self, ward: str) -> Dict[str, str]:
        """Get basic ward context for fallback analysis."""
        # Basic ward categorization for better fallback intelligence
        ward_lower = ward.lower()
        
        if any(area in ward_lower for area in ['jubilee hills', 'banjara hills', 'hitech city']):
            return {"context": "High-income IT corridor area with urban development focus"}
        elif any(area in ward_lower for area in ['old city', 'charminar', 'yakutpura']):
            return {"context": "Heritage area with traditional community focus"}
        elif any(area in ward_lower for area in ['secunderabad', 'trimulgherry', 'bolaram']):
            return {"context": "Military cantonment area with mixed demographics"}
        elif any(area in ward_lower for area in ['kukatpally', 'miyapur', 'chandanagar']):
            return {"context": "Rapid development suburban area with infrastructure focus"}
        else:
            return {"context": "Mixed urban-suburban area requiring balanced approach"}
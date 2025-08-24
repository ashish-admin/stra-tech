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

# Configure Gemini
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    logger.info("Gemini 2.0 Flash configured for strategic planning")
except KeyError:
    logger.error("GEMINI_API_KEY not set for strategic planner")
    model = None


class StrategicPlanner:
    """
    AI-powered strategic planning engine using Gemini 2.0 Flash.
    
    Implements "Ultra Think" approach with deliberation budgets and explainability.
    Enhanced for Wave 2 with multi-model coordination and conversation-aware analysis.
    """
    
    def __init__(self):
        self.model = model
        self.think_tokens = int(os.getenv('THINK_TOKENS', 4096))
        # Wave 2 enhancements
        self.conversation_context = None
        self.multi_model_enabled = os.getenv('MULTI_MODEL_ENABLED', 'true').lower() == 'true'
        self.evidence_aggregation_enabled = True
        self.confidence_scoring_enabled = True
        
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
        if not self.model:
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
            return plan
            
        except Exception as e:
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
        if not self.model:
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
            return briefing
            
        except Exception as e:
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
        """Fallback briefing when AI is unavailable."""
        return {
            "ward": ward,
            "strategic_overview": f"Strategic analysis for {ward} based on available intelligence.",
            "key_intelligence": [],
            "opportunities": [
                {
                    "description": "Monitor local development initiatives for positive messaging",
                    "timeline": "ongoing",
                    "priority": 2
                }
            ],
            "threats": [
                {
                    "description": "Opposition narrative monitoring required",
                    "severity": "medium",
                    "timeline": "ongoing"
                }
            ],
            "recommended_actions": [
                {
                    "category": "immediate",
                    "description": "Review local intelligence sources",
                    "timeline": "24h",
                    "priority": 1
                }
            ],
            "confidence_score": 0.3,
            "fallback_mode": True,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
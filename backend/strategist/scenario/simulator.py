"""
Interactive Scenario Simulation Engine for Wave 2

Provides conversation-based "what-if" political analysis with:
- Electoral outcome modeling
- Strategic impact assessment
- Confidence interval calculations
- Visual feedback generation
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

import google.generativeai as genai

logger = logging.getLogger(__name__)


@dataclass
class ScenarioRequest:
    """Structured scenario simulation request."""
    scenario_query: str
    scenario_type: str
    ward: str
    timeframe: str = "3_months"
    metrics: List[str] = None
    parameters: Dict[str, Any] = None


@dataclass
class SimulationResult:
    """Comprehensive scenario simulation results."""
    scenario_id: str
    key_impact: str
    confidence_score: float
    strategic_recommendations: List[str]
    impact_breakdown: Dict[str, Any]
    confidence_intervals: Dict[str, Any]
    visualization_data: Dict[str, Any]
    electoral_projections: Optional[Dict[str, Any]] = None
    risk_factors: Optional[List[str]] = None
    mitigation_strategies: Optional[List[str]] = None


class ScenarioSimulator:
    """
    Wave 2: Advanced political scenario simulation engine.
    
    Provides AI-powered "what-if" analysis with electoral modeling,
    impact assessment, and strategic recommendations.
    """
    
    def __init__(self):
        # Initialize Gemini for scenario analysis
        try:
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            self.gemini_available = True
        except KeyError:
            logger.error("GEMINI_API_KEY not set for scenario simulator")
            self.gemini_available = False
            
        # Scenario configuration
        self.supported_types = ['electoral', 'policy', 'crisis', 'opposition', 'coalition']
        self.supported_timeframes = ['1_month', '3_months', '6_months', '1_year']
        self.default_metrics = ['electoral', 'sentiment', 'coalition', 'policy_impact']
        
        # Confidence thresholds
        self.high_confidence_threshold = 0.8
        self.medium_confidence_threshold = 0.6
        
    async def simulate_scenario(
        self,
        request: ScenarioRequest
    ) -> SimulationResult:
        """
        Execute comprehensive scenario simulation.
        
        Args:
            request: Structured scenario simulation request
            
        Returns:
            Complete simulation results with confidence intervals
        """
        try:
            logger.info(f"Starting scenario simulation: {request.scenario_type} for {request.ward}")
            
            # Validate request
            if not self._validate_request(request):
                return self._create_error_result("Invalid scenario request parameters")
            
            # Generate scenario ID
            scenario_id = f"scenario_{request.ward}_{int(datetime.now(timezone.utc).timestamp())}"
            
            # Execute simulation phases
            if self.gemini_available:
                # Phase 1: Impact Analysis
                impact_analysis = await self._analyze_scenario_impact(request)
                
                # Phase 2: Electoral Modeling
                electoral_projections = await self._model_electoral_impact(request, impact_analysis)
                
                # Phase 3: Strategic Recommendations
                strategic_recommendations = await self._generate_strategic_recommendations(
                    request, impact_analysis, electoral_projections
                )
                
                # Phase 4: Confidence Calculations
                confidence_intervals = self._calculate_confidence_intervals(
                    impact_analysis, electoral_projections, strategic_recommendations
                )
                
                # Phase 5: Visualization Data
                visualization_data = self._prepare_visualization_data(
                    impact_analysis, electoral_projections, request
                )
                
                # Compile results
                result = SimulationResult(
                    scenario_id=scenario_id,
                    key_impact=impact_analysis.get('key_impact', 'Scenario impact analysis complete'),
                    confidence_score=impact_analysis.get('overall_confidence', 0.75),
                    strategic_recommendations=strategic_recommendations.get('recommendations', []),
                    impact_breakdown=impact_analysis.get('impact_breakdown', {}),
                    confidence_intervals=confidence_intervals,
                    visualization_data=visualization_data,
                    electoral_projections=electoral_projections,
                    risk_factors=impact_analysis.get('risk_factors', []),
                    mitigation_strategies=strategic_recommendations.get('mitigation_strategies', [])
                )
                
            else:
                # Fallback simulation
                result = self._generate_fallback_simulation(request, scenario_id)
            
            logger.info(f"Scenario simulation complete: {scenario_id}, confidence: {result.confidence_score:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Scenario simulation failed: {e}", exc_info=True)
            return self._create_error_result(f"Simulation error: {str(e)}")
    
    def _validate_request(self, request: ScenarioRequest) -> bool:
        """Validate scenario request parameters."""
        try:
            if not request.scenario_query or len(request.scenario_query.strip()) < 10:
                return False
            
            if request.scenario_type not in self.supported_types:
                return False
            
            if request.timeframe not in self.supported_timeframes:
                return False
            
            if not request.ward or len(request.ward.strip()) == 0:
                return False
            
            return True
        except Exception:
            return False
    
    async def _analyze_scenario_impact(self, request: ScenarioRequest) -> Dict[str, Any]:
        """Analyze comprehensive impact of the scenario."""
        try:
            prompt = f"""
            Analyze the political scenario impact for {request.ward} ward in Hyderabad:
            
            Scenario: "{request.scenario_query}"
            Type: {request.scenario_type}
            Timeframe: {request.timeframe}
            Analysis Metrics: {', '.join(request.metrics or self.default_metrics)}
            
            Provide comprehensive JSON analysis with:
            
            1. key_impact: Primary strategic impact summary (2-3 sentences)
            2. overall_confidence: Confidence in analysis (0.0-1.0)
            3. impact_breakdown: {{
                "electoral": {{"level": "positive|neutral|negative|very_positive|very_negative", "confidence": 0.0-1.0, "description": "..."}},
                "sentiment": {{"level": "...", "confidence": 0.0-1.0, "description": "..."}},
                "coalition": {{"level": "...", "confidence": 0.0-1.0, "description": "..."}},
                "policy_impact": {{"level": "...", "confidence": 0.0-1.0, "description": "..."}}
            }}
            4. risk_factors: Array of potential risks and challenges
            5. opportunity_factors: Array of potential opportunities and benefits
            6. stakeholder_impacts: How different stakeholders are affected
            7. timeline_considerations: Key timing factors and milestones
            
            Focus on realistic, evidence-based analysis for Hyderabad political context.
            Consider local political dynamics, voter preferences, and historical patterns.
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 3072,
                    "response_mime_type": "application/json"
                }
            )
            
            analysis = json.loads(response.text)
            analysis["analyzed_at"] = datetime.now(timezone.utc).isoformat()
            analysis["analysis_type"] = "impact_assessment"
            
            return analysis
            
        except Exception as e:
            logger.error(f"Impact analysis failed: {e}")
            return {
                "key_impact": f"Impact analysis for scenario in {request.ward} ward.",
                "overall_confidence": 0.5,
                "impact_breakdown": self._get_default_impact_breakdown(),
                "risk_factors": ["Analysis limited due to technical constraints"],
                "opportunity_factors": ["Detailed analysis pending"],
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
                "fallback_mode": True
            }
    
    async def _model_electoral_impact(
        self,
        request: ScenarioRequest,
        impact_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Model electoral outcomes and vote share projections."""
        try:
            # Only perform detailed electoral modeling for electoral scenarios
            if request.scenario_type != 'electoral':
                return {
                    "electoral_relevance": "secondary",
                    "vote_share_impact": "minimal",
                    "model_confidence": 0.6
                }
            
            prompt = f"""
            Model electoral impact for {request.ward} ward based on scenario analysis:
            
            Scenario: "{request.scenario_query}"
            Impact Analysis: {json.dumps(impact_analysis, indent=2)}
            Timeframe: {request.timeframe}
            
            Provide electoral modeling in JSON format:
            
            1. vote_share_projections: {{
                "party_a": {{"current": 35, "projected": 38, "confidence": 0.75}},
                "party_b": {{"current": 30, "projected": 28, "confidence": 0.72}},
                "others": {{"current": 35, "projected": 34, "confidence": 0.68}}
            }}
            2. turnout_projections: {{
                "current_baseline": 72,
                "projected_turnout": 75,
                "confidence": 0.7,
                "key_demographics": ["youth", "urban_professionals"]
            }}
            3. swing_factors: Array of factors that could change outcomes
            4. coalition_implications: How alliances might shift
            5. model_confidence: Overall modeling confidence (0.0-1.0)
            6. uncertainty_ranges: Margin of error for projections
            
            Base projections on realistic Hyderabad political patterns.
            Consider local party dynamics, demographic trends, and historical voting behavior.
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.25,
                    "max_output_tokens": 2048,
                    "response_mime_type": "application/json"
                }
            )
            
            electoral_model = json.loads(response.text)
            electoral_model["modeled_at"] = datetime.now(timezone.utc).isoformat()
            electoral_model["model_type"] = "scenario_electoral_projection"
            
            return electoral_model
            
        except Exception as e:
            logger.error(f"Electoral modeling failed: {e}")
            return {
                "vote_share_projections": self._get_default_vote_projections(),
                "model_confidence": 0.5,
                "uncertainty_ranges": {"vote_share": "±5%", "turnout": "±3%"},
                "fallback_mode": True,
                "modeled_at": datetime.now(timezone.utc).isoformat()
            }
    
    async def _generate_strategic_recommendations(
        self,
        request: ScenarioRequest,
        impact_analysis: Dict[str, Any],
        electoral_projections: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate strategic recommendations based on scenario analysis."""
        try:
            prompt = f"""
            Generate strategic recommendations for {request.ward} ward based on scenario analysis:
            
            Scenario: "{request.scenario_query}"
            Impact Analysis: {json.dumps(impact_analysis.get('key_impact', ''), indent=2)}
            Electoral Projections: {json.dumps(electoral_projections, indent=2)}
            
            Provide strategic recommendations in JSON format:
            
            1. recommendations: Array of 3-5 specific, actionable strategic recommendations
            2. immediate_actions: Actions to take within 1-2 weeks
            3. medium_term_strategy: Actions for 1-3 month timeframe
            4. long_term_positioning: Strategic positioning for 6+ months
            5. mitigation_strategies: Ways to minimize risks identified
            6. opportunity_maximization: How to capitalize on opportunities
            7. resource_requirements: What resources/capabilities needed
            8. success_metrics: How to measure strategic success
            
            Ensure recommendations are:
            - Specific and actionable
            - Politically realistic
            - Resource-appropriate
            - Culturally sensitive for Hyderabad context
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.4,
                    "max_output_tokens": 2048,
                    "response_mime_type": "application/json"
                }
            )
            
            recommendations = json.loads(response.text)
            recommendations["generated_at"] = datetime.now(timezone.utc).isoformat()
            recommendations["recommendation_type"] = "scenario_based_strategy"
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Strategic recommendations generation failed: {e}")
            return {
                "recommendations": [
                    "Monitor scenario developments closely",
                    "Prepare communication strategy for stakeholders",
                    "Assess resource allocation needs",
                    "Review coalition and partnership strategies"
                ],
                "immediate_actions": ["Convene strategic planning session"],
                "mitigation_strategies": ["Maintain flexible response capability"],
                "fallback_mode": True,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
    
    def _calculate_confidence_intervals(
        self,
        impact_analysis: Dict[str, Any],
        electoral_projections: Dict[str, Any],
        strategic_recommendations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate confidence intervals for scenario projections."""
        try:
            # Base confidence from impact analysis
            base_confidence = impact_analysis.get('overall_confidence', 0.75)
            
            # Electoral model confidence
            electoral_confidence = electoral_projections.get('model_confidence', 0.7)
            
            # Calculate weighted confidence intervals
            confidence_intervals = {
                "overall_scenario": {
                    "confidence": base_confidence,
                    "range": f"±{int((1 - base_confidence) * 20)}%",
                    "description": "Overall scenario outcome confidence"
                },
                "electoral_impact": {
                    "confidence": electoral_confidence,
                    "range": f"±{int((1 - electoral_confidence) * 15)}%",
                    "description": "Electoral projection confidence"
                },
                "strategic_effectiveness": {
                    "confidence": min(0.9, (base_confidence + electoral_confidence) / 2 + 0.1),
                    "range": "±10%",
                    "description": "Strategic recommendation effectiveness"
                },
                "timeline_accuracy": {
                    "confidence": max(0.5, base_confidence - 0.1),
                    "range": "±2 weeks",
                    "description": "Timeline projection accuracy"
                }
            }
            
            # Add uncertainty factors
            uncertainty_factors = []
            if base_confidence < self.medium_confidence_threshold:
                uncertainty_factors.append("Limited historical precedent")
            if electoral_confidence < self.medium_confidence_threshold:
                uncertainty_factors.append("High electoral volatility")
            
            confidence_intervals["uncertainty_factors"] = uncertainty_factors
            confidence_intervals["calculated_at"] = datetime.now(timezone.utc).isoformat()
            
            return confidence_intervals
            
        except Exception as e:
            logger.error(f"Confidence interval calculation failed: {e}")
            return {
                "overall_scenario": {"confidence": 0.6, "range": "±15%"},
                "calculation_error": True,
                "calculated_at": datetime.now(timezone.utc).isoformat()
            }
    
    def _prepare_visualization_data(
        self,
        impact_analysis: Dict[str, Any],
        electoral_projections: Dict[str, Any],
        request: ScenarioRequest
    ) -> Dict[str, Any]:
        """Prepare data for scenario visualization."""
        try:
            visualization_data = {
                "impact_breakdown": impact_analysis.get("impact_breakdown", {}),
                "electoral_charts": {},
                "timeline_data": {},
                "confidence_visualization": {}
            }
            
            # Electoral visualization data
            if electoral_projections and 'vote_share_projections' in electoral_projections:
                vote_projections = electoral_projections['vote_share_projections']
                visualization_data["electoral_charts"] = {
                    "type": "vote_share_comparison",
                    "data": [
                        {
                            "party": party,
                            "current": data.get("current", 0),
                            "projected": data.get("projected", 0),
                            "confidence": data.get("confidence", 0.5)
                        }
                        for party, data in vote_projections.items()
                    ]
                }
            
            # Timeline visualization
            timeframe_mapping = {
                "1_month": 30,
                "3_months": 90,
                "6_months": 180,
                "1_year": 365
            }
            
            visualization_data["timeline_data"] = {
                "scenario_duration": timeframe_mapping.get(request.timeframe, 90),
                "key_milestones": [
                    {"day": 7, "event": "Immediate response phase"},
                    {"day": 30, "event": "Short-term impact assessment"},
                    {"day": 90, "event": "Strategic adjustment period"}
                ]
            }
            
            # Confidence visualization
            overall_confidence = impact_analysis.get('overall_confidence', 0.75)
            visualization_data["confidence_visualization"] = {
                "overall_confidence": overall_confidence,
                "confidence_level": (
                    "high" if overall_confidence >= self.high_confidence_threshold else
                    "medium" if overall_confidence >= self.medium_confidence_threshold else
                    "low"
                )
            }
            
            visualization_data["prepared_at"] = datetime.now(timezone.utc).isoformat()
            return visualization_data
            
        except Exception as e:
            logger.error(f"Visualization data preparation failed: {e}")
            return {
                "impact_breakdown": self._get_default_impact_breakdown(),
                "preparation_error": True,
                "prepared_at": datetime.now(timezone.utc).isoformat()
            }
    
    def _generate_fallback_simulation(
        self,
        request: ScenarioRequest,
        scenario_id: str
    ) -> SimulationResult:
        """Generate fallback simulation when AI is unavailable."""
        return SimulationResult(
            scenario_id=scenario_id,
            key_impact=f"Scenario analysis for '{request.scenario_query}' in {request.ward} ward. Impact assessment indicates moderate strategic implications requiring careful monitoring and response planning.",
            confidence_score=0.4,
            strategic_recommendations=[
                "Monitor scenario developments and stakeholder reactions",
                "Prepare contingency communication strategies",
                "Assess resource allocation requirements",
                "Review and update strategic positioning"
            ],
            impact_breakdown=self._get_default_impact_breakdown(),
            confidence_intervals={
                "overall_scenario": {"confidence": 0.4, "range": "±20%"},
                "fallback_mode": True
            },
            visualization_data={
                "impact_breakdown": self._get_default_impact_breakdown(),
                "fallback_mode": True
            },
            electoral_projections=None,
            risk_factors=["Limited analysis capability"],
            mitigation_strategies=["Seek additional expert input"]
        )
    
    def _create_error_result(self, error_message: str) -> SimulationResult:
        """Create error result for failed simulations."""
        return SimulationResult(
            scenario_id=f"error_{int(datetime.now(timezone.utc).timestamp())}",
            key_impact=f"Scenario simulation error: {error_message}",
            confidence_score=0.2,
            strategic_recommendations=["Review scenario parameters and retry simulation"],
            impact_breakdown={},
            confidence_intervals={},
            visualization_data={},
            electoral_projections=None,
            risk_factors=[error_message],
            mitigation_strategies=["Technical issue resolution required"]
        )
    
    def _get_default_impact_breakdown(self) -> Dict[str, Any]:
        """Get default impact breakdown for fallback scenarios."""
        return {
            "electoral": {
                "level": "neutral",
                "confidence": 0.5,
                "description": "Electoral impact requires detailed analysis"
            },
            "sentiment": {
                "level": "neutral", 
                "confidence": 0.5,
                "description": "Sentiment impact monitoring ongoing"
            },
            "coalition": {
                "level": "neutral",
                "confidence": 0.5,
                "description": "Coalition dynamics assessment needed"
            },
            "policy_impact": {
                "level": "neutral",
                "confidence": 0.5,
                "description": "Policy implications under review"
            }
        }
    
    def _get_default_vote_projections(self) -> Dict[str, Any]:
        """Get default vote share projections for fallback."""
        return {
            "party_a": {"current": 35, "projected": 35, "confidence": 0.5},
            "party_b": {"current": 30, "projected": 30, "confidence": 0.5},
            "others": {"current": 35, "projected": 35, "confidence": 0.5}
        }
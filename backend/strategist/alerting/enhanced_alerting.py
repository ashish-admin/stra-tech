"""
Enhanced Contextual Alerting System for Wave 2

Provides conversation-aware intelligent alerting with:
- Strategic priority scoring
- Real-time political event correlation
- Campaign objective alignment
- Automated action recommendation integration
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass

import google.generativeai as genai

logger = logging.getLogger(__name__)


class AlertPriority(Enum):
    """Alert priority levels with strategic scoring."""
    CRITICAL = "critical"
    HIGH = "high" 
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class AlertCategory(Enum):
    """Categories of political alerts."""
    ELECTORAL = "electoral"
    OPPOSITION = "opposition"
    POLICY = "policy"
    MEDIA = "media"
    COALITION = "coalition"
    CRISIS = "crisis"
    OPPORTUNITY = "opportunity"


@dataclass
class AlertContext:
    """Context information for alert generation."""
    ward: str
    user_preferences: Optional[Dict[str, Any]] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None
    active_campaigns: Optional[List[str]] = None
    strategic_objectives: Optional[List[str]] = None


@dataclass
class StrategicAlert:
    """Enhanced strategic alert with contextual information."""
    alert_id: str
    title: str
    content: str
    priority: AlertPriority
    category: AlertCategory
    ward: str
    confidence_score: float
    strategic_implications: List[str]
    recommended_actions: List[Dict[str, Any]]
    evidence_sources: List[str]
    conversation_relevance: Optional[float] = None
    campaign_alignment: Optional[float] = None
    urgency_score: Optional[float] = None
    created_at: Optional[str] = None
    expires_at: Optional[str] = None


class EnhancedAlertingEngine:
    """
    Wave 2: Advanced contextual alerting system.
    
    Provides conversation-aware intelligent alerts with strategic priority
    scoring and automated action recommendations.
    """
    
    def __init__(self):
        # Initialize Gemini for alert intelligence
        try:
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            self.gemini_available = True
        except KeyError:
            logger.error("GEMINI_API_KEY not set for enhanced alerting")
            self.gemini_available = False
            
        # Alert configuration
        self.priority_weights = {
            AlertPriority.CRITICAL: 1.0,
            AlertPriority.HIGH: 0.8,
            AlertPriority.MEDIUM: 0.6,
            AlertPriority.LOW: 0.4,
            AlertPriority.INFORMATIONAL: 0.2
        }
        
        # Conversation relevance thresholds
        self.high_relevance_threshold = 0.8
        self.medium_relevance_threshold = 0.6
        
        # Campaign alignment scoring
        self.objective_alignment_threshold = 0.7
        
    async def generate_contextual_alerts(
        self,
        political_events: List[Dict[str, Any]],
        alert_context: AlertContext
    ) -> List[StrategicAlert]:
        """
        Generate intelligent contextual alerts based on political events and context.
        
        Args:
            political_events: Raw political events and intelligence
            alert_context: User and conversation context
            
        Returns:
            List of prioritized strategic alerts with recommendations
        """
        try:
            logger.info(f"Generating contextual alerts for {alert_context.ward}")
            
            if not political_events:
                return []
            
            # Process events with AI intelligence
            if self.gemini_available:
                alerts = await self._generate_ai_alerts(political_events, alert_context)
            else:
                alerts = self._generate_fallback_alerts(political_events, alert_context)
            
            # Apply contextual scoring and prioritization
            contextualized_alerts = await self._apply_contextual_scoring(alerts, alert_context)
            
            # Sort by strategic priority
            prioritized_alerts = self._prioritize_alerts(contextualized_alerts)
            
            logger.info(f"Generated {len(prioritized_alerts)} contextual alerts for {alert_context.ward}")
            return prioritized_alerts
            
        except Exception as e:
            logger.error(f"Contextual alert generation failed: {e}", exc_info=True)
            return self._generate_error_alerts(alert_context)
    
    async def _generate_ai_alerts(
        self,
        political_events: List[Dict[str, Any]],
        alert_context: AlertContext
    ) -> List[StrategicAlert]:
        """Generate AI-powered contextual alerts."""
        try:
            # Prepare context information
            conversation_summary = ""
            if alert_context.conversation_history:
                recent_messages = alert_context.conversation_history[-3:]
                conversation_summary = f"Recent conversation context: {json.dumps(recent_messages, indent=2)}"
            
            preferences_context = ""
            if alert_context.user_preferences:
                preferences_context = f"User preferences: {json.dumps(alert_context.user_preferences, indent=2)}"
            
            objectives_context = ""
            if alert_context.strategic_objectives:
                objectives_context = f"Strategic objectives: {', '.join(alert_context.strategic_objectives)}"
            
            events_data = json.dumps(political_events[:10], indent=2)  # Limit to top 10 events
            
            prompt = f"""
            Generate intelligent contextual political alerts for {alert_context.ward} ward:
            
            Political Events/Intelligence:
            {events_data}
            
            {conversation_summary}
            {preferences_context}
            {objectives_context}
            
            Generate strategic alerts in JSON format with array of alerts, each containing:
            
            1. title: Clear, actionable alert title
            2. content: Detailed alert description with context
            3. priority: "critical|high|medium|low|informational"
            4. category: "electoral|opposition|policy|media|coalition|crisis|opportunity"
            5. confidence_score: Confidence in alert accuracy (0.0-1.0)
            6. strategic_implications: Array of strategic implications and consequences
            7. recommended_actions: Array of specific actionable recommendations with:
               - action: Specific action description
               - timeline: When to take action
               - priority: Action priority
               - resources_required: What resources are needed
            8. evidence_sources: Array of supporting evidence references
            9. urgency_score: How urgent this alert is (0.0-1.0)
            10. conversation_relevance: How relevant to recent conversation (0.0-1.0)
            11. campaign_alignment: How aligned with campaign objectives (0.0-1.0)
            
            Focus on:
            - Actionable intelligence requiring strategic response
            - Events with significant political implications
            - Opportunities for strategic advantage
            - Threats requiring immediate attention
            - Information relevant to recent conversations
            
            Prioritize alerts by strategic importance and conversation relevance.
            Ensure all recommendations are specific, realistic, and time-bound.
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 4096,
                    "response_mime_type": "application/json"
                }
            )
            
            ai_alerts_data = json.loads(response.text)
            alerts = []
            
            # Convert AI response to StrategicAlert objects
            for alert_data in ai_alerts_data.get('alerts', []):
                try:
                    alert = StrategicAlert(
                        alert_id=f"alert_{alert_context.ward}_{int(datetime.now(timezone.utc).timestamp())}_{len(alerts)}",
                        title=alert_data.get('title', 'Strategic Alert'),
                        content=alert_data.get('content', ''),
                        priority=AlertPriority(alert_data.get('priority', 'medium')),
                        category=AlertCategory(alert_data.get('category', 'electoral')),
                        ward=alert_context.ward,
                        confidence_score=float(alert_data.get('confidence_score', 0.75)),
                        strategic_implications=alert_data.get('strategic_implications', []),
                        recommended_actions=alert_data.get('recommended_actions', []),
                        evidence_sources=alert_data.get('evidence_sources', []),
                        conversation_relevance=float(alert_data.get('conversation_relevance', 0.5)),
                        campaign_alignment=float(alert_data.get('campaign_alignment', 0.5)),
                        urgency_score=float(alert_data.get('urgency_score', 0.5)),
                        created_at=datetime.now(timezone.utc).isoformat(),
                        expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
                    )
                    alerts.append(alert)
                except (ValueError, KeyError) as e:
                    logger.warning(f"Skipping invalid alert data: {e}")
                    continue
            
            return alerts
            
        except Exception as e:
            logger.error(f"AI alert generation failed: {e}")
            return self._generate_fallback_alerts(political_events, alert_context)
    
    def _generate_fallback_alerts(
        self,
        political_events: List[Dict[str, Any]],
        alert_context: AlertContext
    ) -> List[StrategicAlert]:
        """Generate fallback alerts when AI is unavailable."""
        alerts = []
        
        # Generate basic alerts from events
        for i, event in enumerate(political_events[:5]):
            alert = StrategicAlert(
                alert_id=f"fallback_alert_{alert_context.ward}_{int(datetime.now(timezone.utc).timestamp())}_{i}",
                title=f"Political Intelligence: {event.get('title', 'Event Update')}",
                content=event.get('description', event.get('content', 'Political development requires attention.')),
                priority=AlertPriority.MEDIUM,
                category=AlertCategory.ELECTORAL,
                ward=alert_context.ward,
                confidence_score=0.6,
                strategic_implications=[
                    "Monitor situation for further developments",
                    "Assess potential impact on campaign strategy"
                ],
                recommended_actions=[
                    {
                        "action": "Review event details and assess strategic implications",
                        "timeline": "within 24 hours",
                        "priority": "medium",
                        "resources_required": "Strategic team review"
                    }
                ],
                evidence_sources=[event.get('source', 'Political intelligence')],
                conversation_relevance=0.5,
                campaign_alignment=0.5,
                urgency_score=0.5,
                created_at=datetime.now(timezone.utc).isoformat(),
                expires_at=(datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
            )
            alerts.append(alert)
        
        return alerts
    
    async def _apply_contextual_scoring(
        self,
        alerts: List[StrategicAlert],
        alert_context: AlertContext
    ) -> List[StrategicAlert]:
        """Apply contextual scoring based on conversation and user context."""
        try:
            for alert in alerts:
                # Enhance conversation relevance scoring
                if alert_context.conversation_history:
                    relevance_score = await self._calculate_conversation_relevance(
                        alert, alert_context.conversation_history
                    )
                    alert.conversation_relevance = max(alert.conversation_relevance or 0.5, relevance_score)
                
                # Enhance campaign alignment scoring
                if alert_context.strategic_objectives:
                    alignment_score = self._calculate_campaign_alignment(
                        alert, alert_context.strategic_objectives
                    )
                    alert.campaign_alignment = max(alert.campaign_alignment or 0.5, alignment_score)
                
                # Apply user preference weighting
                if alert_context.user_preferences:
                    alert = self._apply_preference_weighting(alert, alert_context.user_preferences)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Contextual scoring failed: {e}")
            return alerts
    
    async def _calculate_conversation_relevance(
        self,
        alert: StrategicAlert,
        conversation_history: List[Dict[str, Any]]
    ) -> float:
        """Calculate how relevant alert is to recent conversation."""
        try:
            if not self.gemini_available:
                return 0.5
            
            recent_messages = conversation_history[-5:]  # Last 5 messages
            conversation_text = " ".join([
                msg.get('content', '') for msg in recent_messages
                if msg.get('type') == 'user'
            ])
            
            if not conversation_text.strip():
                return 0.5
            
            prompt = f"""
            Assess relevance of this political alert to recent conversation:
            
            Alert: {alert.title}
            Alert Content: {alert.content}
            Alert Category: {alert.category.value}
            
            Recent Conversation: {conversation_text}
            
            Provide relevance score (0.0-1.0) based on:
            - Topic similarity
            - Strategic context overlap
            - User interest alignment
            - Conversation continuity
            
            Return only a number between 0.0 and 1.0.
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": 50
                }
            )
            
            relevance_text = response.text.strip()
            relevance_score = float(relevance_text)
            
            return max(0.0, min(1.0, relevance_score))
            
        except Exception as e:
            logger.error(f"Conversation relevance calculation failed: {e}")
            return 0.5
    
    def _calculate_campaign_alignment(
        self,
        alert: StrategicAlert,
        strategic_objectives: List[str]
    ) -> float:
        """Calculate alert alignment with campaign objectives."""
        try:
            if not strategic_objectives:
                return 0.5
            
            # Simple keyword-based alignment scoring
            alert_text = f"{alert.title} {alert.content}".lower()
            objective_keywords = []
            
            for objective in strategic_objectives:
                objective_keywords.extend(objective.lower().split())
            
            if not objective_keywords:
                return 0.5
            
            # Count keyword matches
            matches = 0
            total_keywords = len(objective_keywords)
            
            for keyword in objective_keywords:
                if keyword in alert_text:
                    matches += 1
            
            alignment_score = matches / total_keywords if total_keywords > 0 else 0.5
            
            # Boost score for strategic implications alignment
            for implication in alert.strategic_implications:
                implication_lower = implication.lower()
                for objective in strategic_objectives:
                    if any(word in implication_lower for word in objective.lower().split()):
                        alignment_score += 0.1
            
            return max(0.0, min(1.0, alignment_score))
            
        except Exception as e:
            logger.error(f"Campaign alignment calculation failed: {e}")
            return 0.5
    
    def _apply_preference_weighting(
        self,
        alert: StrategicAlert,
        user_preferences: Dict[str, Any]
    ) -> StrategicAlert:
        """Apply user preference weighting to alert scoring."""
        try:
            # Category preferences
            category_preferences = user_preferences.get('categories', {})
            if alert.category.value in category_preferences:
                preference_weight = category_preferences[alert.category.value]
                alert.confidence_score *= preference_weight
                alert.urgency_score *= preference_weight
            
            # Priority preferences
            priority_preferences = user_preferences.get('priorities', {})
            if alert.priority.value in priority_preferences:
                preference_weight = priority_preferences[alert.priority.value]
                alert.urgency_score *= preference_weight
            
            return alert
            
        except Exception as e:
            logger.error(f"Preference weighting failed: {e}")
            return alert
    
    def _prioritize_alerts(self, alerts: List[StrategicAlert]) -> List[StrategicAlert]:
        """Prioritize alerts based on strategic scoring."""
        try:
            def calculate_strategic_score(alert: StrategicAlert) -> float:
                # Base priority weight
                priority_weight = self.priority_weights.get(alert.priority, 0.5)
                
                # Confidence component
                confidence_component = alert.confidence_score * 0.3
                
                # Relevance component
                relevance_component = (alert.conversation_relevance or 0.5) * 0.3
                
                # Alignment component
                alignment_component = (alert.campaign_alignment or 0.5) * 0.2
                
                # Urgency component
                urgency_component = (alert.urgency_score or 0.5) * 0.2
                
                strategic_score = (
                    priority_weight +
                    confidence_component +
                    relevance_component +
                    alignment_component +
                    urgency_component
                )
                
                return strategic_score
            
            # Calculate strategic scores and sort
            for alert in alerts:
                alert.strategic_score = calculate_strategic_score(alert)
            
            sorted_alerts = sorted(
                alerts,
                key=lambda a: getattr(a, 'strategic_score', 0.5),
                reverse=True
            )
            
            return sorted_alerts
            
        except Exception as e:
            logger.error(f"Alert prioritization failed: {e}")
            return alerts
    
    def _generate_error_alerts(self, alert_context: AlertContext) -> List[StrategicAlert]:
        """Generate error alerts when system fails."""
        error_alert = StrategicAlert(
            alert_id=f"error_alert_{alert_context.ward}_{int(datetime.now(timezone.utc).timestamp())}",
            title="Alerting System Error",
            content="Enhanced alerting system is temporarily unavailable. Please check manually for political developments.",
            priority=AlertPriority.MEDIUM,
            category=AlertCategory.CRISIS,
            ward=alert_context.ward,
            confidence_score=0.3,
            strategic_implications=["Manual monitoring required"],
            recommended_actions=[
                {
                    "action": "Check news sources manually for political developments",
                    "timeline": "ongoing",
                    "priority": "medium",
                    "resources_required": "Manual monitoring"
                }
            ],
            evidence_sources=["System error logs"],
            conversation_relevance=0.5,
            campaign_alignment=0.5,
            urgency_score=0.6,
            created_at=datetime.now(timezone.utc).isoformat(),
            expires_at=(datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        )
        
        return [error_alert]
    
    async def correlate_political_events(
        self,
        events: List[Dict[str, Any]],
        ward: str
    ) -> Dict[str, Any]:
        """
        Correlate political events for strategic pattern recognition.
        
        Wave 2 feature for real-time political event correlation.
        """
        try:
            if not events or not self.gemini_available:
                return {"correlation_analysis": "Event correlation temporarily unavailable"}
            
            events_data = json.dumps(events[:15], indent=2)
            
            prompt = f"""
            Analyze political event correlations for {ward} ward in Hyderabad:
            
            Political Events:
            {events_data}
            
            Provide correlation analysis in JSON format:
            
            1. event_clusters: Groups of related events with themes
            2. pattern_identification: Emerging political patterns and trends
            3. strategic_implications: What these correlations mean strategically
            4. timing_analysis: Significance of event timing and sequencing
            5. stakeholder_connections: How different stakeholders are connected through events
            6. risk_indicators: Warning signs from event correlations
            7. opportunity_indicators: Strategic opportunities emerging from patterns
            8. confidence_assessment: Confidence in correlation analysis (0.0-1.0)
            
            Focus on actionable strategic intelligence and pattern recognition.
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 2048,
                    "response_mime_type": "application/json"
                }
            )
            
            correlation_analysis = json.loads(response.text)
            correlation_analysis["analyzed_at"] = datetime.now(timezone.utc).isoformat()
            correlation_analysis["ward"] = ward
            correlation_analysis["events_analyzed"] = len(events)
            
            return correlation_analysis
            
        except Exception as e:
            logger.error(f"Political event correlation failed: {e}")
            return {
                "correlation_analysis": "Event correlation analysis temporarily unavailable",
                "error": str(e),
                "analyzed_at": datetime.now(timezone.utc).isoformat()
            }
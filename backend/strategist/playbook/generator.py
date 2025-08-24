"""
Communications Playbook Generator for Wave 2

Generates dynamic political communications playbooks with multilingual support
and template-based messaging strategies integrated with conversational AI.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from enum import Enum

import google.generativeai as genai

logger = logging.getLogger(__name__)


class PlaybookType(Enum):
    """Types of political communications playbooks."""
    CRISIS_RESPONSE = "crisis_response"
    POLICY_ANNOUNCEMENT = "policy_announcement" 
    OPPOSITION_COUNTER = "opposition_counter"
    COMMUNITY_ENGAGEMENT = "community_engagement"
    MEDIA_RELATIONS = "media_relations"
    CAMPAIGN_MESSAGING = "campaign_messaging"
    STAKEHOLDER_COMMUNICATION = "stakeholder_communication"


class PlaybookTemplate:
    """Template structure for political communications playbooks."""
    
    def __init__(self, playbook_type: PlaybookType, ward: str, language: str = "en"):
        self.playbook_type = playbook_type
        self.ward = ward
        self.language = language
        self.created_at = datetime.now(timezone.utc)
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "playbook_type": self.playbook_type.value,
            "ward": self.ward,
            "language": self.language,
            "created_at": self.created_at.isoformat(),
            "template_version": "2.0"
        }


class PlaybookGenerator:
    """
    Wave 2: Advanced political communications playbook generator.
    
    Creates dynamic, AI-generated playbooks with multilingual support
    and conversation-aware customization.
    """
    
    def __init__(self):
        # Initialize Gemini for playbook generation
        try:
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            self.gemini_available = True
        except KeyError:
            logger.error("GEMINI_API_KEY not set for playbook generator")
            self.gemini_available = False
            
        # Multilingual support
        self.supported_languages = {
            "en": "English",
            "hi": "Hindi", 
            "te": "Telugu",
            "ur": "Urdu"
        }
        
        # Template cache
        self.template_cache = {}
        
    async def generate_playbook(
        self,
        playbook_type: PlaybookType,
        ward: str,
        context: Dict[str, Any],
        language: str = "en",
        conversation_context: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive communications playbook.
        
        Args:
            playbook_type: Type of playbook to generate
            ward: Target ward for playbook
            context: Political/strategic context
            language: Target language for communications
            conversation_context: Previous conversation for context
            
        Returns:
            Complete communications playbook with templates and strategies
        """
        try:
            logger.info(f"Generating {playbook_type.value} playbook for {ward} in {language}")
            
            # Create base template
            template = PlaybookTemplate(playbook_type, ward, language)
            
            # Generate AI-powered content
            if self.gemini_available:
                playbook_content = await self._generate_ai_playbook(
                    template, context, conversation_context
                )
            else:
                playbook_content = self._generate_fallback_playbook(template, context)
            
            # Combine template with generated content
            complete_playbook = {
                **template.to_dict(),
                **playbook_content,
                "generation_metadata": {
                    "ai_enhanced": self.gemini_available,
                    "context_aware": conversation_context is not None,
                    "cultural_adapted": language != "en",
                    "confidence_score": playbook_content.get("confidence_score", 0.8)
                }
            }
            
            logger.info(f"Playbook generated: {len(playbook_content.get('message_templates', []))} templates")
            return complete_playbook
            
        except Exception as e:
            logger.error(f"Playbook generation failed: {e}", exc_info=True)
            return self._generate_error_playbook(playbook_type, ward, language)
    
    async def _generate_ai_playbook(
        self,
        template: PlaybookTemplate,
        context: Dict[str, Any],
        conversation_context: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Generate AI-powered playbook content."""
        try:
            # Construct conversation context
            conversation_summary = ""
            if conversation_context:
                recent_messages = conversation_context[-3:]
                conversation_summary = f"\\nConversation Context: {json.dumps(recent_messages, indent=2)}"
            
            # Language-specific prompting
            language_context = self._get_language_context(template.language)
            
            prompt = f"""
            Create a comprehensive political communications playbook for {template.ward} ward in Hyderabad.
            
            Playbook Type: {template.playbook_type.value}
            Target Language: {template.language} ({self.supported_languages.get(template.language, 'English')})
            Political Context: {json.dumps(context, indent=2)}
            {conversation_summary}
            {language_context}
            
            Generate a detailed playbook in JSON format with:
            
            1. executive_summary: Strategic overview and key objectives
            2. target_audiences: Specific audience segments and their priorities
            3. key_messages: Core messages with variations for different audiences
            4. message_templates: Ready-to-use communication templates
            5. channel_strategy: Recommended communication channels and timing
            6. opposition_responses: Anticipated opposition reactions and counter-strategies
            7. crisis_scenarios: Potential crisis situations and response protocols
            8. cultural_adaptations: Local cultural considerations and sensitivities
            9. success_metrics: KPIs and measurement criteria
            10. implementation_timeline: Phased rollout strategy with milestones
            
            Ensure all content is:
            - Culturally appropriate for Hyderabad/Telangana context
            - Politically strategic and actionable
            - Language-appropriate with proper cultural nuances
            - Evidence-based and realistic
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.4,
                    "max_output_tokens": 4096,
                    "response_mime_type": "application/json"
                }
            )
            
            result = json.loads(response.text)
            result["confidence_score"] = 0.85
            result["ai_generated"] = True
            
            return result
            
        except Exception as e:
            logger.error(f"AI playbook generation failed: {e}")
            return self._generate_fallback_playbook(template, context)
    
    def _get_language_context(self, language: str) -> str:
        """Get language-specific context for playbook generation."""
        contexts = {
            "hi": """
            Language Context for Hindi:
            - Use respectful Hindi terminology appropriate for political discourse
            - Include Devanagari script considerations for written materials
            - Address cultural values like 'sanskaar' and community respect
            - Consider Hindu festival timing and religious sensitivities
            """,
            "te": """
            Language Context for Telugu:
            - Use traditional Telugu political terminology and honorifics
            - Consider Telangana cultural identity and regional pride
            - Include references to local traditions and Telugu language importance
            - Address Telangana development aspirations and cultural values
            """,
            "ur": """
            Language Context for Urdu:
            - Use appropriate Urdu political vocabulary with proper adab
            - Consider Islamic cultural values and community concerns
            - Include references to community harmony and inclusive development
            - Address minority community interests and representation
            """,
            "en": """
            Language Context for English:
            - Use professional English appropriate for educated urban audience
            - Include modern political terminology and global best practices
            - Address metropolitan concerns and development aspirations
            """
        }
        return contexts.get(language, contexts["en"])
    
    def _generate_fallback_playbook(
        self,
        template: PlaybookTemplate,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate fallback playbook when AI is unavailable."""
        return {
            "executive_summary": f"Communications strategy for {template.ward} ward focusing on {template.playbook_type.value}.",
            "target_audiences": [
                {
                    "segment": "Local Residents",
                    "priorities": ["Infrastructure", "Safety", "Development"],
                    "communication_preferences": ["Community meetings", "Local media"]
                },
                {
                    "segment": "Business Community",
                    "priorities": ["Economic development", "Policy stability"],
                    "communication_preferences": ["Business forums", "Digital channels"]
                }
            ],
            "key_messages": [
                {
                    "message": f"Committed to {template.ward} development and progress",
                    "audience": "general",
                    "tone": "confident"
                }
            ],
            "message_templates": [
                {
                    "type": "press_statement",
                    "content": f"Statement regarding {template.ward} developments...",
                    "usage": "official_communications"
                }
            ],
            "channel_strategy": {
                "primary_channels": ["Local newspapers", "Community meetings"],
                "digital_channels": ["Social media", "WhatsApp groups"],
                "timing_recommendations": "Regular updates during business hours"
            },
            "confidence_score": 0.4,
            "ai_generated": False,
            "fallback_mode": True
        }
    
    def _generate_error_playbook(
        self,
        playbook_type: PlaybookType,
        ward: str,
        language: str
    ) -> Dict[str, Any]:
        """Generate error playbook when generation fails completely."""
        return {
            "playbook_type": playbook_type.value,
            "ward": ward,
            "language": language,
            "error": "Playbook generation temporarily unavailable",
            "fallback_message": "Please use existing communication templates and contact strategic team for guidance.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "confidence_score": 0.2,
            "error_mode": True
        }
    
    async def generate_opposition_response(
        self,
        original_message: str,
        opposition_context: Dict[str, Any],
        ward: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate strategic response to opposition messaging.
        
        Args:
            original_message: Opposition message to respond to
            opposition_context: Context about opposition strategy
            ward: Ward context
            language: Response language
            
        Returns:
            Strategic response with counter-arguments and evidence
        """
        try:
            if not self.gemini_available:
                return self._generate_fallback_opposition_response(original_message, ward)
            
            language_context = self._get_language_context(language)
            
            prompt = f"""
            Generate strategic response to opposition political messaging for {ward} ward.
            
            Opposition Message: "{original_message}"
            Opposition Context: {json.dumps(opposition_context, indent=2)}
            Response Language: {language}
            {language_context}
            
            Create strategic response in JSON with:
            - response_strategy: Overall approach to counter the message
            - key_counter_points: Specific factual counter-arguments
            - evidence_required: What evidence/data supports our position
            - message_templates: Ready-to-use response templates
            - tone_guidance: Recommended tone and approach
            - timing_strategy: When and how to respond
            - risk_assessment: Potential risks of different response approaches
            
            Ensure response is:
            - Factual and evidence-based
            - Politically strategic but ethical
            - Culturally appropriate
            - Constructive rather than purely defensive
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 2048,
                    "response_mime_type": "application/json"
                }
            )
            
            result = json.loads(response.text)
            result.update({
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "ward": ward,
                "language": language,
                "original_message": original_message[:100] + "..." if len(original_message) > 100 else original_message,
                "confidence_score": 0.8
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Opposition response generation failed: {e}")
            return self._generate_fallback_opposition_response(original_message, ward)
    
    def _generate_fallback_opposition_response(
        self,
        original_message: str,
        ward: str
    ) -> Dict[str, Any]:
        """Fallback opposition response when AI unavailable."""
        return {
            "response_strategy": "Focus on positive achievements and factual corrections",
            "key_counter_points": [
                "Present factual information to counter misinformation",
                "Highlight positive developments in the ward",
                "Emphasize commitment to transparent governance"
            ],
            "message_templates": [
                {
                    "template": f"We remain committed to {ward} development and transparent governance.",
                    "usage": "general_response"
                }
            ],
            "tone_guidance": "Professional, factual, and constructive",
            "timing_strategy": "Respond promptly with verified information",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "fallback_mode": True,
            "confidence_score": 0.3
        }
    
    async def customize_playbook_for_conversation(
        self,
        base_playbook: Dict[str, Any],
        conversation_history: List[Dict[str, Any]],
        user_preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Customize existing playbook based on conversation context.
        
        Wave 2 feature for conversation-aware playbook adaptation.
        """
        try:
            if not self.gemini_available:
                return base_playbook
            
            conversation_summary = json.dumps(conversation_history[-5:], indent=2)
            
            prompt = f"""
            Customize this political communications playbook based on conversation context:
            
            Base Playbook: {json.dumps(base_playbook, indent=2)}
            Recent Conversation: {conversation_summary}
            User Preferences: {json.dumps(user_preferences, indent=2)}
            
            Provide JSON customizations with:
            - conversation_adaptations: How to adapt messages based on discussion
            - priority_adjustments: Which elements to emphasize based on conversation
            - additional_templates: New templates relevant to conversation topics
            - strategic_refinements: Refined strategy based on user interests
            
            Keep core structure but enhance with conversation insights.
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 1536,
                    "response_mime_type": "application/json"
                }
            )
            
            customizations = json.loads(response.text)
            
            # Apply customizations to base playbook
            enhanced_playbook = base_playbook.copy()
            enhanced_playbook.update({
                "conversation_customizations": customizations,
                "customized_at": datetime.now(timezone.utc).isoformat(),
                "conversation_aware": True
            })
            
            return enhanced_playbook
            
        except Exception as e:
            logger.error(f"Playbook customization failed: {e}")
            base_playbook["customization_error"] = "Conversation adaptation temporarily unavailable"
            return base_playbook
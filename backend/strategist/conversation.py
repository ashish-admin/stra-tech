"""
Conversation Management Service for Political Strategist

Provides conversational AI capabilities with:
- Session-based conversation management
- Multi-turn conversation context
- Conversation persistence and retrieval  
- Multilingual conversation support
- Real-time streaming responses
- Conversation history and analytics
"""

import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, AsyncGenerator

import redis
from flask import current_app

from .service import PoliticalStrategist
from .cache import cget, cset, redis_client
from .observability import get_observer, monitor_strategist_operation

logger = logging.getLogger(__name__)


class ConversationManager:
    """
    Manages political strategy conversations with session persistence.
    
    Features:
    - Multi-turn conversation tracking
    - Context-aware responses
    - Session state management  
    - Conversation history
    - Multilingual support
    - Real-time streaming
    """
    
    def __init__(self):
        self.observer = get_observer()
        self.session_ttl = int(os.getenv('CONVERSATION_SESSION_TTL', 7200))  # 2 hours
        
    def create_session(self, ward: str, chat_type: str = 'strategy', 
                      language: str = 'en', user_id: str = None) -> str:
        """
        Create a new conversation session.
        
        Args:
            ward: Ward context for the conversation
            chat_type: Type of strategic conversation
            language: Language code for the conversation
            user_id: Optional user identifier
            
        Returns:
            Session ID string
        """
        session_id = f"conv_{uuid.uuid4().hex[:12]}_{int(datetime.now().timestamp())}"
        
        session_data = {
            'session_id': session_id,
            'ward': ward,
            'chat_type': chat_type,
            'language': language,
            'user_id': user_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_activity': datetime.now(timezone.utc).isoformat(),
            'message_count': 0,
            'messages': [],
            'context': {
                'current_topics': [],
                'user_preferences': {},
                'conversation_stage': 'introduction'
            }
        }
        
        # Store session in Redis with TTL
        session_key = f"conversation:session:{session_id}"
        try:
            redis_client.setex(
                session_key, 
                self.session_ttl, 
                json.dumps(session_data, default=str)
            )
            logger.info(f"Created conversation session {session_id} for ward {ward}")
            return session_id
        except Exception as e:
            logger.error(f"Failed to create session {session_id}: {e}")
            raise
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve conversation session data.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Session data dictionary or None
        """
        session_key = f"conversation:session:{session_id}"
        try:
            session_data = redis_client.get(session_key)
            if session_data:
                return json.loads(session_data)
            return None
        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            return None
    
    def update_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update session data with new information.
        
        Args:
            session_id: Session identifier
            updates: Dictionary of updates to apply
            
        Returns:
            Success status
        """
        session_data = self.get_session(session_id)
        if not session_data:
            return False
            
        # Apply updates
        session_data.update(updates)
        session_data['last_activity'] = datetime.now(timezone.utc).isoformat()
        
        # Save back to Redis
        session_key = f"conversation:session:{session_id}"
        try:
            redis_client.setex(
                session_key, 
                self.session_ttl, 
                json.dumps(session_data, default=str)
            )
            return True
        except Exception as e:
            logger.error(f"Failed to update session {session_id}: {e}")
            return False
    
    def add_message(self, session_id: str, message: Dict[str, Any]) -> bool:
        """
        Add a message to the conversation history.
        
        Args:
            session_id: Session identifier
            message: Message data
            
        Returns:
            Success status
        """
        session_data = self.get_session(session_id)
        if not session_data:
            return False
            
        # Add message to history
        message['timestamp'] = datetime.now(timezone.utc).isoformat()
        session_data['messages'].append(message)
        session_data['message_count'] = len(session_data['messages'])
        
        # Update conversation context
        if message['type'] == 'user':
            self._update_conversation_context(session_data, message)
        
        # Save updated session
        return self.update_session(session_id, session_data)
    
    def _update_conversation_context(self, session_data: Dict[str, Any], 
                                   user_message: Dict[str, Any]):
        """
        Update conversation context based on user message.
        
        Args:
            session_data: Current session data
            user_message: User's message
        """
        context = session_data.get('context', {})
        
        # Extract topics from user message
        message_text = user_message.get('content', '').lower()
        
        # Political keywords that indicate conversation topics
        topic_keywords = {
            'infrastructure': ['infrastructure', 'roads', 'development', 'construction'],
            'education': ['education', 'schools', 'learning', 'students'],
            'healthcare': ['healthcare', 'hospitals', 'medical', 'health'],
            'employment': ['employment', 'jobs', 'unemployment', 'work'],
            'governance': ['governance', 'administration', 'government', 'policy'],
            'security': ['security', 'safety', 'crime', 'police'],
            'environment': ['environment', 'pollution', 'green', 'clean'],
            'economy': ['economy', 'economic', 'business', 'commerce']
        }
        
        current_topics = context.get('current_topics', [])
        for topic, keywords in topic_keywords.items():
            if any(keyword in message_text for keyword in keywords):
                if topic not in current_topics:
                    current_topics.append(topic)
        
        # Keep only recent topics (last 10)
        context['current_topics'] = current_topics[-10:]
        
        # Update conversation stage
        message_count = session_data.get('message_count', 0)
        if message_count <= 2:
            context['conversation_stage'] = 'introduction'
        elif message_count <= 10:
            context['conversation_stage'] = 'exploration'
        else:
            context['conversation_stage'] = 'deep_analysis'
        
        session_data['context'] = context
    
    @monitor_strategist_operation("conversation_response")
    async def generate_response(self, session_id: str, user_message: str, 
                              stream: bool = False) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate AI response for conversation message.
        
        Args:
            session_id: Session identifier
            user_message: User's message content
            stream: Whether to stream the response
            
        Yields:
            Response chunks for streaming
        """
        session_data = self.get_session(session_id)
        if not session_data:
            yield {
                'type': 'error',
                'message': 'Session not found or expired'
            }
            return
        
        # Add user message to session
        user_msg = {
            'type': 'user',
            'content': user_message,
            'language': session_data.get('language', 'en')
        }
        self.add_message(session_id, user_msg)
        
        try:
            # Initialize strategist with conversation context
            strategist = PoliticalStrategist(
                ward=session_data['ward'],
                context_mode='conversational'
            )
            
            # Build conversation context for AI
            conversation_context = self._build_conversation_context(session_data)
            
            if stream:
                # Stream response generation
                async for chunk in self._stream_ai_response(
                    strategist, user_message, conversation_context, session_data
                ):
                    yield chunk
            else:
                # Generate complete response
                response = await self._generate_ai_response(
                    strategist, user_message, conversation_context, session_data
                )
                yield response
                
        except Exception as e:
            logger.error(f"Error generating response for session {session_id}: {e}")
            yield {
                'type': 'error',
                'message': 'Failed to generate response',
                'error': str(e)
            }
    
    def _build_conversation_context(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build context for AI response generation.
        
        Args:
            session_data: Current session data
            
        Returns:
            Context dictionary for AI
        """
        recent_messages = session_data.get('messages', [])[-10:]  # Last 10 messages
        context = session_data.get('context', {})
        
        return {
            'ward': session_data['ward'],
            'chat_type': session_data['chat_type'],
            'language': session_data['language'],
            'conversation_stage': context.get('conversation_stage', 'introduction'),
            'current_topics': context.get('current_topics', []),
            'message_count': session_data['message_count'],
            'recent_messages': recent_messages,
            'user_preferences': context.get('user_preferences', {}),
            'session_duration': self._calculate_session_duration(session_data)
        }
    
    def _calculate_session_duration(self, session_data: Dict[str, Any]) -> int:
        """Calculate session duration in minutes."""
        created_at = datetime.fromisoformat(session_data['created_at'].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        duration = (now - created_at).total_seconds() / 60
        return int(duration)
    
    async def _stream_ai_response(self, strategist: PoliticalStrategist, 
                                 user_message: str, context: Dict[str, Any],
                                 session_data: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream AI response generation.
        
        Args:
            strategist: PoliticalStrategist instance
            user_message: User's message
            context: Conversation context
            session_data: Session data
            
        Yields:
            Response stream chunks
        """
        try:
            # Start streaming analysis
            yield {
                'type': 'analysis_start',
                'message': 'Starting strategic analysis...'
            }
            
            # Perform strategic analysis with conversation context
            analysis_result = await strategist.analyze_situation_with_context(
                user_message, context
            )
            
            # Stream the response content
            response_content = analysis_result.get('strategic_response', '')
            
            # Split content into chunks for streaming
            chunk_size = 50  # words per chunk
            words = response_content.split()
            
            accumulated_content = ''
            for i in range(0, len(words), chunk_size):
                chunk_words = words[i:i + chunk_size]
                chunk = ' '.join(chunk_words)
                accumulated_content += chunk + ' '
                
                yield {
                    'type': 'content_chunk',
                    'content': chunk,
                    'accumulated_content': accumulated_content.strip(),
                    'progress': min(100, int((i + chunk_size) / len(words) * 100))
                }
                
                # Small delay for realistic streaming
                import asyncio
                await asyncio.sleep(0.1)
            
            # Add bot message to session
            bot_message = {
                'type': 'bot',
                'content': accumulated_content.strip(),
                'language': session_data.get('language', 'en'),
                'context': {
                    'confidence': analysis_result.get('confidence_score', 0.85),
                    'sources': analysis_result.get('source_citations', []),
                    'chat_type': session_data['chat_type']
                }
            }
            
            # Add to session
            self.add_message(session_data['session_id'], bot_message)
            
            # Final completion message
            yield {
                'type': 'analysis_complete',
                'content': accumulated_content.strip(),
                'context': bot_message['context'],
                'confidence': analysis_result.get('confidence_score', 0.85),
                'sources': analysis_result.get('source_citations', []),
                'actions': analysis_result.get('recommended_actions', []),
                'actionable': len(analysis_result.get('recommended_actions', [])) > 0
            }
            
        except Exception as e:
            logger.error(f"Error in streaming AI response: {e}")
            yield {
                'type': 'error',
                'message': 'Error generating streaming response',
                'error': str(e)
            }
    
    async def _generate_ai_response(self, strategist: PoliticalStrategist, 
                                  user_message: str, context: Dict[str, Any],
                                  session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate complete AI response.
        
        Args:
            strategist: PoliticalStrategist instance
            user_message: User's message
            context: Conversation context
            session_data: Session data
            
        Returns:
            Complete response dictionary
        """
        try:
            # Perform strategic analysis
            analysis_result = await strategist.analyze_situation_with_context(
                user_message, context
            )
            
            # Create bot response
            bot_message = {
                'type': 'bot',
                'content': analysis_result.get('strategic_response', ''),
                'language': session_data.get('language', 'en'),
                'context': {
                    'confidence': analysis_result.get('confidence_score', 0.85),
                    'sources': analysis_result.get('source_citations', []),
                    'chat_type': session_data['chat_type']
                },
                'actions': analysis_result.get('recommended_actions', [])
            }
            
            # Add to session
            self.add_message(session_data['session_id'], bot_message)
            
            return {
                'type': 'complete_response',
                'message': bot_message,
                'analysis_result': analysis_result
            }
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return {
                'type': 'error',
                'message': 'Failed to generate response',
                'error': str(e)
            }
    
    def get_conversations_for_user(self, user_id: str = None, ward: str = None, 
                                  limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get conversation list for user or ward.
        
        Args:
            user_id: Optional user identifier
            ward: Optional ward filter
            limit: Maximum number of conversations
            
        Returns:
            List of conversation summaries
        """
        try:
            # Search for conversation keys
            search_pattern = "conversation:session:*"
            conversation_keys = redis_client.keys(search_pattern)
            
            conversations = []
            for key in conversation_keys:
                try:
                    session_data = redis_client.get(key)
                    if session_data:
                        data = json.loads(session_data)
                        
                        # Apply filters
                        if user_id and data.get('user_id') != user_id:
                            continue
                        if ward and data.get('ward') != ward:
                            continue
                        
                        # Create conversation summary
                        summary = {
                            'id': data['session_id'],
                            'title': self._generate_conversation_title(data),
                            'ward': data.get('ward'),
                            'chat_type': data.get('chat_type'),
                            'language': data.get('language'),
                            'created_at': data.get('created_at'),
                            'last_updated': data.get('last_activity'),
                            'message_count': data.get('message_count', 0),
                            'last_message': self._get_last_message_preview(data)
                        }
                        conversations.append(summary)
                        
                except Exception as e:
                    logger.error(f"Error processing conversation {key}: {e}")
                    continue
            
            # Sort by last activity (most recent first)
            conversations.sort(
                key=lambda x: x.get('last_updated', ''), 
                reverse=True
            )
            
            return conversations[:limit]
            
        except Exception as e:
            logger.error(f"Error getting conversations: {e}")
            return []
    
    def _generate_conversation_title(self, session_data: Dict[str, Any]) -> str:
        """Generate a descriptive title for the conversation."""
        ward = session_data.get('ward', 'General')
        chat_type = session_data.get('chat_type', 'strategy').title()
        topics = session_data.get('context', {}).get('current_topics', [])
        
        if topics:
            main_topic = topics[0].title()
            return f"{chat_type}: {main_topic} - {ward}"
        else:
            return f"{chat_type} Discussion - {ward}"
    
    def _get_last_message_preview(self, session_data: Dict[str, Any]) -> str:
        """Get preview of the last message."""
        messages = session_data.get('messages', [])
        if messages:
            last_message = messages[-1]
            content = last_message.get('content', '')
            return content[:150] + '...' if len(content) > 150 else content
        return ''
    
    def delete_conversation(self, session_id: str) -> bool:
        """
        Delete a conversation session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Success status
        """
        session_key = f"conversation:session:{session_id}"
        try:
            result = redis_client.delete(session_key)
            logger.info(f"Deleted conversation session {session_id}")
            return result > 0
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            return False
    
    def export_conversation(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Export complete conversation data.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Complete conversation data or None
        """
        session_data = self.get_session(session_id)
        if session_data:
            # Add export metadata
            session_data['exported_at'] = datetime.now(timezone.utc).isoformat()
            session_data['export_version'] = '1.0'
        return session_data


# Global conversation manager instance
conversation_manager = ConversationManager()


# Extend PoliticalStrategist with conversation capabilities
async def analyze_situation_with_context(self, user_message: str, 
                                       conversation_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enhanced situation analysis with conversation context.
    
    Args:
        user_message: User's input message
        conversation_context: Conversation context data
        
    Returns:
        Strategic analysis with conversational response
    """
    try:
        # Build enhanced analysis prompt with conversation context
        context_prompt = self._build_conversational_prompt(
            user_message, conversation_context
        )
        
        # Perform base analysis
        base_analysis = await self.analyze_situation("standard")
        
        # Generate conversational response
        conversational_response = await self._generate_conversational_response(
            user_message, base_analysis, conversation_context
        )
        
        # Combine results
        enhanced_result = {
            **base_analysis,
            'strategic_response': conversational_response,
            'conversation_context': conversation_context,
            'user_message': user_message
        }
        
        return enhanced_result
        
    except Exception as e:
        logger.error(f"Error in conversational analysis: {e}")
        return {
            'error': str(e),
            'strategic_response': 'I apologize, but I encountered an error processing your request. Please try again.',
            'confidence_score': 0.0
        }


def _build_conversational_prompt(self, user_message: str, 
                               context: Dict[str, Any]) -> str:
    """Build enhanced prompt with conversation context."""
    
    chat_type = context.get('chat_type', 'strategy')
    ward = context.get('ward', 'Unknown')
    language = context.get('language', 'en')
    topics = context.get('current_topics', [])
    stage = context.get('conversation_stage', 'introduction')
    
    prompt = f"""
    You are a Political Strategist AI assistant engaging in a {chat_type} conversation 
    about {ward} ward. The conversation is in {language} and currently in the {stage} stage.
    
    User's message: "{user_message}"
    
    Current conversation topics: {', '.join(topics) if topics else 'None established yet'}
    
    Provide a helpful, context-aware response that:
    1. Directly addresses the user's question or request
    2. Incorporates relevant political insights for {ward}
    3. Maintains conversation flow and context
    4. Offers actionable strategic recommendations
    5. Respects the conversation stage and user's level of engagement
    
    Response should be conversational, informative, and strategically valuable.
    """
    
    return prompt


async def _generate_conversational_response(self, user_message: str, 
                                          base_analysis: Dict[str, Any],
                                          context: Dict[str, Any]) -> str:
    """Generate conversational AI response."""
    
    # This would integrate with the actual AI services (Gemini, Perplexity)
    # For now, return a structured response based on analysis
    
    ward = context.get('ward', 'Unknown')
    chat_type = context.get('chat_type', 'strategy')
    stage = context.get('conversation_stage', 'introduction')
    
    if stage == 'introduction':
        response = f"""I understand you're interested in {chat_type} insights for {ward}. 
        Based on current political intelligence, I can help you with strategic planning, 
        analysis of local political dynamics, and actionable recommendations. 
        What specific aspect would you like to explore first?"""
    else:
        # Generate contextual response based on analysis
        confidence = base_analysis.get('confidence_score', 0.85)
        key_insights = base_analysis.get('key_insights', [])
        
        response = f"""Based on my analysis of {ward}, here are the key strategic considerations:
        
        {chr(10).join([f"• {insight}" for insight in key_insights[:3]])}
        
        Given the current political landscape, I recommend focusing on these priority areas 
        for maximum strategic impact. Would you like me to elaborate on any of these points 
        or explore specific implementation strategies?"""
    
    return response


# Monkey patch the conversational methods onto PoliticalStrategist
PoliticalStrategist.analyze_situation_with_context = analyze_situation_with_context
PoliticalStrategist._build_conversational_prompt = _build_conversational_prompt
PoliticalStrategist._generate_conversational_response = _generate_conversational_response
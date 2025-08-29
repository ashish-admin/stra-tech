/**
 * StrategistChat.jsx - Enhanced AI-Powered Political Strategy Chat Interface
 * 
 * Features:
 * - Real-time AI conversations with multilingual support
 * - Context-aware responses based on ward and political situation
 * - Conversation history and session management
 * - Quick action suggestions and template responses
 * - Integration with LokDarpan Political Strategist API
 * - Support for file attachments and data analysis
 * - Export conversation summaries and action items
 * - SSE streaming for real-time responses
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Mic,
  MicOff,
  Paperclip,
  Download,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Trash2,
  Settings,
  Clock,
  Target,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader,
  Zap,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { useWard } from '../../../context/WardContext';
import ChatInterface from '../../../components/conversation/ChatInterface';

const CHAT_TYPES = {
  strategy: { icon: Target, label: 'Strategy', color: 'text-blue-600' },
  analysis: { icon: BarChart3, label: 'Analysis', color: 'text-purple-600' },
  planning: { icon: BookOpen, label: 'Planning', color: 'text-green-600' },
  quick: { icon: Zap, label: 'Quick Help', color: 'text-orange-600' }
};

const SUGGESTED_PROMPTS = {
  strategy: [
    "What's our best counter-strategy for the opposition's recent moves?",
    "How should we position ourselves on the infrastructure issue?",
    "What are the top 3 strategic priorities for this ward?",
    "Analyze the competitive landscape for the upcoming election"
  ],
  analysis: [
    "Analyze recent sentiment trends in this ward",
    "What are the key issues driving voter sentiment?",
    "Compare our performance against competitors",
    "Identify emerging political opportunities"
  ],
  planning: [
    "Create a 30-day campaign action plan",
    "Draft talking points for the infrastructure meeting",
    "Plan community engagement activities",
    "Develop crisis communication strategy"
  ],
  quick: [
    "Summarize today's political intelligence",
    "What should I know before the town hall?",
    "Quick brief on current political climate",
    "Any urgent actions needed today?"
  ]
};

const StrategistChat = ({ 
  selectedWard,
  initialChatType = 'strategy',
  conversationId = null,
  height = '600px' 
}) => {
  const { t, i18n } = useTranslation();
  const { currentWard } = useWard();
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  
  // Use selectedWard prop or fall back to WardContext
  const activeWard = selectedWard || currentWard;
  
  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [activeWard]);
  
  const loadConversations = async () => {
    try {
      const response = await fetch(`/api/v1/strategist/conversations?ward=${encodeURIComponent(activeWard || '')}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else if (response.status === 404) {
        // Conversations endpoint not available, use empty array
        console.warn('Conversations endpoint not available, using empty conversation list');
        setConversations([]);
      } else if (response.status === 500) {
        // Server error, graceful degradation
        console.warn('Server error loading conversations, using empty conversation list');
        setConversations([]);
      } else {
        // Other errors, log but don't crash
        console.warn(`Failed to load conversations (${response.status}):`, await response.text());
        setConversations([]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // Graceful degradation - continue with empty conversations
      setConversations([]);
    }
  };
  
  const handleConversationUpdate = (conversationData) => {
    // Update conversations list
    setConversations(prev => {
      const existing = prev.find(c => c.id === conversationData.session_id);
      if (existing) {
        return prev.map(c => 
          c.id === conversationData.session_id 
            ? { ...c, ...conversationData }
            : c
        );
      } else {
        return [conversationData, ...prev];
      }
    });
  };

  if (!activeWard || activeWard === 'All') {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {t('selectWardForChat', { defaultValue: 'Select a Ward for Strategic Chat' })}
          </h3>
          <p className="text-gray-500 max-w-md">
            {t('chatRequiresWard', { 
              defaultValue: 'Choose a specific ward to start an AI-powered strategic conversation with context-aware political intelligence.'
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Chat Interface */}
      <ChatInterface
        conversationId={currentConversationId}
        initialChatType={initialChatType}
        onConversationUpdate={handleConversationUpdate}
        className="h-[600px]"
      />
      
      {/* Recent Conversations */}
      {conversations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t('recentConversations', { defaultValue: 'Recent Conversations' })}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {conversations.slice(0, 6).map((conversation) => (
              <div 
                key={conversation.id}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setCurrentConversationId(conversation.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm truncate">
                    {conversation.title}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {new Date(conversation.last_updated).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    {t(`chatTypes.${conversation.chat_type}`)}
                  </span>
                  <span>{conversation.message_count || 0} {t('messages')}</span>
                </div>
                
                {conversation.last_message && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {conversation.last_message.length > 80 
                      ? conversation.last_message.substring(0, 80) + '...'
                      : conversation.last_message
                    }
                  </p>
                )}
              </div>
            ))}
          </div>
          
          {conversations.length > 6 && (
            <div className="mt-4 text-center">
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                {t('viewAllConversations', { defaultValue: 'View All Conversations' })} 
                ({conversations.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StrategistChat;
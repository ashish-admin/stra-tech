/**
 * StrategistChat.jsx - AI-Powered Political Strategy Chat Interface
 * 
 * Features:
 * - Real-time AI conversations for political strategy
 * - Context-aware responses based on ward and political situation
 * - Conversation history and thread management
 * - Quick action suggestions and template responses
 * - Integration with LokDarpan Political Strategist AI
 * - Support for file attachments and data analysis
 * - Export conversation summaries and action items
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const StrategistChat = () => {
  const { currentWard } = useWard();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatType, setChatType] = useState('strategy');
  const [isListening, setIsListening] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        type: 'bot',
        content: `Hello! I'm your Political Strategist AI assistant. I'm here to help you navigate the political landscape${currentWard ? ` in ${currentWard}` : ''}. How can I assist you today?`,
        timestamp: new Date(),
        context: {
          ward: currentWard,
          type: 'welcome'
        }
      };
      setMessages([welcomeMessage]);
    }
  }, [currentWard]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message sending
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() && attachedFiles.length === 0) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: content || '[File attachments]',
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
      context: {
        ward: currentWard,
        chatType: chatType
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setAttachedFiles([]);
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      // Simulate AI response (replace with actual API call)
      await simulateAIResponse(userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWard, chatType, attachedFiles]);

  // Simulate AI response (replace with actual API integration)
  const simulateAIResponse = async (userMessage) => {
    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const responses = {
      strategy: [
        "Based on current political intelligence, I recommend focusing on three key areas: infrastructure development, community engagement, and transparent governance. Here's a detailed strategic approach...",
        "Your opposition's recent moves suggest they're targeting the urban development vote. We should counter by emphasizing our proven track record in delivering tangible improvements to ward infrastructure.",
        "The competitive analysis shows an opportunity in the education sector. Consider positioning yourself as the candidate with concrete plans for improving local schools and educational facilities."
      ],
      analysis: [
        "The sentiment analysis for this ward shows a 60% positive trend toward infrastructure-focused candidates. Key concerns include traffic management (mentioned in 45% of posts) and waste management (38% of posts).",
        "Recent trends indicate growing dissatisfaction with current transportation policies. This represents a strategic opportunity for policy proposals that address these specific concerns.",
        "Competitive analysis reveals that your main opponent has weak messaging around environmental issues. This could be leveraged in your campaign strategy."
      ],
      planning: [
        "Here's a comprehensive 30-day action plan:\n\nWeek 1: Community listening tours (3 locations)\nWeek 2: Policy position announcements\nWeek 3: Digital campaign launch\nWeek 4: Town hall meetings and stakeholder engagement",
        "For the upcoming infrastructure meeting, focus on these key talking points:\n1. Proven delivery track record\n2. Community-first approach\n3. Transparent progress tracking\n4. Sustainable development vision",
        "Crisis communication strategy should include: immediate response protocols, key spokesperson designation, fact-checking procedures, and community reassurance messaging."
      ],
      quick: [
        "Today's key intelligence: Moderate positive sentiment in your ward, one emerging issue around parking policies, and strong community support for your recent infrastructure announcement.",
        "Before the town hall, know that recent polling shows infrastructure is the #1 concern (67% of respondents). Focus on concrete delivery examples and avoid abstract policy discussions.",
        "Current political climate: Stable with slight positive trend. No immediate crises, but monitor the ongoing discussion about traffic management policies."
      ]
    };

    const responsePool = responses[chatType] || responses.strategy;
    const selectedResponse = responsePool[Math.floor(Math.random() * responsePool.length)];

    const botMessage = {
      id: Date.now() + 1,
      type: 'bot',
      content: selectedResponse,
      timestamp: new Date(),
      context: {
        ward: currentWard,
        confidence: 0.85 + Math.random() * 0.1,
        sources: ['political_intelligence', 'sentiment_analysis', 'competitive_analysis'],
        actionable: Math.random() > 0.3
      },
      actions: Math.random() > 0.5 ? [
        { type: 'create_task', label: 'Create Action Item' },
        { type: 'export_summary', label: 'Export Summary' },
        { type: 'schedule_meeting', label: 'Schedule Follow-up' }
      ] : undefined
    };

    setMessages(prev => [...prev, botMessage]);
  };

  // Handle voice input
  const toggleVoiceInput = () => {
    if (!isListening) {
      // Start voice recognition (implementation would use Web Speech API)
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setInputValue('Sample voice input: What should be our strategy for the upcoming election?');
      }, 3000);
    } else {
      setIsListening(false);
    }
  };

  // Handle file attachment
  const handleFileAttach = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    setAttachedFiles(prev => [...prev, ...newAttachments]);
  };

  // Remove attachment
  const removeAttachment = (id) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== id));
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Copy message content
  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  // Export conversation
  const exportConversation = () => {
    const conversationText = messages.map(msg => 
      `[${msg.timestamp.toLocaleTimeString()}] ${msg.type.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `political-strategy-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setShowSuggestions(true);
  };

  // Format message timestamp
  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render message
  const renderMessage = (message) => {
    const isBot = message.type === 'bot';
    const ChatIcon = isBot ? Bot : User;

    return (
      <div key={message.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
        <div className={`flex max-w-[80%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isBot ? 'bg-blue-100 text-blue-600 mr-3' : 'bg-gray-100 text-gray-600 ml-3'
          }`}>
            <ChatIcon className="h-4 w-4" />
          </div>
          
          <div className={`rounded-lg px-4 py-2 ${
            isBot 
              ? message.isError 
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-gray-50 text-gray-800 border border-gray-200'
              : 'bg-blue-600 text-white'
          }`}>
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            
            {message.attachments && (
              <div className="mt-2 space-y-1">
                {message.attachments.map(file => (
                  <div key={file.id} className="flex items-center space-x-2 text-xs">
                    <Paperclip className="h-3 w-3" />
                    <span>{file.name}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs opacity-70">
                {formatTime(message.timestamp)}
                {message.context?.confidence && (
                  <span className="ml-2">
                    Confidence: {Math.round(message.context.confidence * 100)}%
                  </span>
                )}
              </span>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => copyMessage(message.content)}
                  className="p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors"
                  title="Copy message"
                >
                  <Copy className="h-3 w-3" />
                </button>
                {isBot && !message.isError && (
                  <>
                    <button className="p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors">
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button className="p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors">
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {message.actions && (
              <div className="mt-3 space-y-1">
                {message.actions.map((action, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-3 py-1 text-xs bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[600px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Political Strategist Chat
            </h2>
            {currentWard && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {currentWard}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={chatType}
              onChange={(e) => setChatType(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              {Object.entries(CHAT_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.label}</option>
              ))}
            </select>
            
            <button
              onClick={exportConversation}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Export conversation"
            >
              <Download className="h-4 w-4" />
            </button>
            
            <button
              onClick={clearConversation}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.map(renderMessage)}
        
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Analyzing your request...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {showSuggestions && SUGGESTED_PROMPTS[chatType] && (
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <div className="text-xs font-medium text-gray-700 mb-2">Suggested prompts:</div>
          <div className="grid grid-cols-2 gap-2">
            {SUGGESTED_PROMPTS[chatType].slice(0, 4).map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(prompt)}
                className="text-left text-xs p-2 bg-white border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Attachments */}
      {attachedFiles.length > 0 && (
        <div className="px-6 py-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map(file => (
              <div key={file.id} className="flex items-center space-x-2 bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs">
                <Paperclip className="h-3 w-3" />
                <span>{file.name}</span>
                <button
                  onClick={() => removeAttachment(file.id)}
                  className="text-blue-600 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileAttach}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          
          <button
            onClick={toggleVoiceInput}
            className={`p-2 transition-colors ${
              isListening 
                ? 'text-red-600 hover:text-red-800' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            title={isListening ? 'Stop recording' : 'Voice input'}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }
              }}
              placeholder={`Ask your political strategist about ${chatType}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            {isListening && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={(!inputValue.trim() && attachedFiles.length === 0) || isLoading}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategistChat;
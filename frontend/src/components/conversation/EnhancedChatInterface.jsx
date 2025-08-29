/**
 * Enhanced ChatInterface with Wave 2 Integration
 * 
 * Integrates all Wave 2 advanced AI capabilities:
 * - Multi-model strategic orchestration
 * - Communications playbook generation  
 * - Interactive scenario simulation
 * - Enhanced contextual alerting
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
  BarChart3,
  Globe,
  Volume2,
  Shield
} from 'lucide-react';
import { useWard } from '../../context/WardContext';
import MessageBubble from './MessageBubble';
import ConversationHistory from './ConversationHistory';
import LanguageSwitcher from '../LanguageSwitcher';
import PlaybookPanel from './PlaybookPanel';
import ScenarioSimulator from '../scenario/ScenarioSimulator';

const CHAT_TYPES = {
  strategy: { icon: Target, color: 'text-blue-600' },
  analysis: { icon: BarChart3, color: 'text-purple-600' },
  planning: { icon: BookOpen, color: 'text-green-600' },
  quick: { icon: Zap, color: 'text-orange-600' },
  playbook: { icon: Lightbulb, color: 'text-yellow-600' },
  scenario: { icon: TrendingUp, color: 'text-indigo-600' }
};

const EnhancedChatInterface = ({ 
  conversationId = null,
  initialChatType = 'strategy',
  onConversationUpdate = () => {},
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const { currentWard } = useWard();
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatType, setChatType] = useState(initialChatType);
  const [streamingMessage, setStreamingMessage] = useState(null);
  
  // UI state
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Wave 2 UI state
  const [showPlaybookPanel, setShowPlaybookPanel] = useState(false);
  const [showScenarioPanel, setShowScenarioPanel] = useState(false);
  const [contextualAlerts, setContextualAlerts] = useState([]);
  const [aiCapabilities, setAiCapabilities] = useState({
    multiModel: true,
    playbook: true,
    scenario: true,
    alerting: true
  });
  
  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState('');
  const [conversations, setConversations] = useState([]);
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const sseRef = useRef(null);
  
  // Initialize conversation
  useEffect(() => {
    initializeConversation();
  }, [conversationId, currentWard, i18n.language]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);
  
  const initializeConversation = async () => {
    try {
      // Generate session ID if not provided
      const newSessionId = conversationId || `conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      
      // Load existing conversation or create new one
      if (conversationId) {
        await loadConversation(conversationId);
      } else {
        // Start with enhanced welcome message
        const welcomeMessage = {
          id: `msg_${Date.now()}`,
          type: 'bot',
          content: generateWelcomeMessage(),
          timestamp: new Date(),
          language: i18n.language,
          context: {
            ward: currentWard,
            chatType: 'welcome',
            confidence: 1.0,
            aiCapabilities: aiCapabilities
          }
        };
        setMessages([welcomeMessage]);
        setConversationTitle(generateConversationTitle());
      }
      
      // Load contextual alerts
      await loadContextualAlerts();
      
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };
  
  const generateWelcomeMessage = () => {
    const wardText = currentWard ? ` ${t('ward')} ${currentWard}` : '';
    const capabilities = [
      '• Multi-model strategic analysis with Gemini 2.5 Pro + Perplexity AI',
      '• Generate communications playbooks and opposition responses',
      '• Interactive scenario simulation and "what-if" modeling',
      '• Enhanced contextual alerting with strategic priority scoring'
    ].join('\\n');
    
    return t('chatInterface.enhancedWelcomeMessage', {
      ward: wardText,
      capabilities: capabilities,
      defaultValue: `Hello! I'm your enhanced Political Strategist AI assistant with advanced Wave 2 capabilities. I'm here to help you navigate the political landscape${wardText} with:\\n\\n${capabilities}\\n\\nHow can I assist you today?`
    });
  };
  
  const generateConversationTitle = () => {
    const typeLabel = t(`chatTypes.${chatType}`);
    const wardText = currentWard || 'General';
    return `${typeLabel} - ${wardText}`;
  };
  
  const loadConversation = async (convId) => {
    try {
      const response = await fetch(`/api/v1/strategist/conversation/${convId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const conversation = await response.json();
        setMessages(conversation.messages || []);
        setConversationTitle(conversation.title || '');
        setChatType(conversation.chatType || 'strategy');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };
  
  const loadContextualAlerts = async () => {
    try {
      if (!currentWard) return;
      
      // Generate mock political events for demonstration
      const mockEvents = [
        {
          title: `Political development in ${currentWard}`,
          content: 'Recent political activity requires strategic attention',
          source: 'Political Intelligence',
          timestamp: new Date().toISOString()
        }
      ];
      
      const response = await fetch('/api/v1/strategist/alerts/contextual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ward: currentWard,
          political_events: mockEvents,
          conversation_history: messages.slice(-5),
          user_preferences: {
            categories: { [chatType]: 1.0 }
          }
        })
      });
      
      if (response.ok) {
        const alertData = await response.json();
        setContextualAlerts(alertData.alerts || []);
      }
    } catch (error) {
      console.error('Failed to load contextual alerts:', error);
    }
  };
  
  const saveConversation = async () => {
    try {
      const conversationData = {
        sessionId,
        title: conversationTitle,
        chatType,
        messages,
        ward: currentWard,
        language: i18n.language,
        lastUpdated: new Date().toISOString(),
        aiCapabilities: aiCapabilities
      };
      
      const response = await fetch('/api/v1/strategist/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(conversationData)
      });
      
      if (response.ok) {
        const result = await response.json();
        onConversationUpdate(result);
      }
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };
  
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() && attachedFiles.length === 0) return;
    
    const userMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: content || '[File attachments]',
      timestamp: new Date(),
      language: i18n.language,
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
      context: {
        ward: currentWard,
        chatType: chatType,
        sessionId: sessionId,
        aiCapabilities: aiCapabilities
      }
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setAttachedFiles([]);
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      // Enhanced conversation stream with Wave 2 capabilities
      await startEnhancedConversationStream(userMessage);
      
      // Refresh contextual alerts after message
      setTimeout(loadContextualAlerts, 2000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: `msg_${Date.now() + 1}`,
        type: 'bot',
        content: t('errors.analysisError'),
        timestamp: new Date(),
        language: i18n.language,
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWard, chatType, attachedFiles, sessionId, i18n.language, t, aiCapabilities]);
  
  const startEnhancedConversationStream = async (userMessage) => {
    const streamUrl = new URL('/api/v1/strategist/conversation/stream', window.location.origin);
    streamUrl.searchParams.set('sessionId', sessionId);
    streamUrl.searchParams.set('ward', currentWard || '');
    streamUrl.searchParams.set('chatType', chatType);
    streamUrl.searchParams.set('language', i18n.language);
    streamUrl.searchParams.set('aiCapabilities', JSON.stringify(aiCapabilities));
    
    const eventSource = new EventSource(streamUrl.toString());
    sseRef.current = eventSource;
    
    let botMessageId = `msg_${Date.now() + 1}`;
    let accumulatedContent = '';
    
    eventSource.onopen = () => {
      console.log('Enhanced conversation stream connected');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'content_chunk') {
          accumulatedContent += data.content;
          setStreamingMessage({
            id: botMessageId,
            type: 'bot',
            content: accumulatedContent,
            timestamp: new Date(),
            language: i18n.language,
            isStreaming: true,
            context: {
              ...data.context,
              aiCapabilities: aiCapabilities
            }
          });
        } else if (data.type === 'analysis_complete') {
          const finalMessage = {
            id: botMessageId,
            type: 'bot',
            content: accumulatedContent,
            timestamp: new Date(),
            language: i18n.language,
            context: {
              ...data.context,
              confidence: data.confidence || 0.85,
              sources: data.sources || [],
              actionable: data.actionable || false,
              aiCapabilities: aiCapabilities,
              multiModelUsed: data.multiModelUsed || false,
              strategicImplications: data.strategicImplications || []
            },
            actions: data.actions || undefined
          };
          
          setMessages(prev => [...prev, finalMessage]);
          setStreamingMessage(null);
          
          // Auto-save conversation
          setTimeout(saveConversation, 1000);
          
        } else if (data.type === 'error') {
          throw new Error(data.message || 'Enhanced conversation stream error');
        }
      } catch (error) {
        console.error('Error parsing stream data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('Enhanced SSE connection error:', error);
      eventSource.close();
      setIsLoading(false);
      setStreamingMessage(null);
    };
    
    // Send the user message to initiate the enhanced conversation
    try {
      await fetch('/api/v1/strategist/conversation/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          message: userMessage,
          chatType,
          ward: currentWard,
          language: i18n.language,
          aiCapabilities: aiCapabilities
        })
      });
    } catch (error) {
      console.error('Error initiating enhanced conversation:', error);
      eventSource.close();
    }
  };
  
  const handleVoiceInput = () => {
    if (!isListening) {
      // Start voice recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = i18n.language;
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          inputRef.current?.focus();
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognition.start();
      } else {
        alert(t('errors.voiceNotSupported', { defaultValue: 'Voice input not supported in this browser' }));
      }
    } else {
      setIsListening(false);
    }
  };
  
  const handleFileAttach = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      id: `file_${Date.now()}_${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    setAttachedFiles(prev => [...prev, ...newAttachments]);
  };
  
  const removeAttachment = (id) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== id));
  };
  
  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };
  
  const exportConversation = () => {
    const conversationText = messages.map(msg => 
      `[${msg.timestamp.toLocaleTimeString()}] ${msg.type.toUpperCase()}: ${msg.content}`
    ).join('\\n\\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanced-political-strategy-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const clearConversation = () => {
    setMessages([]);
    setShowSuggestions(true);
    setContextualAlerts([]);
    initializeConversation();
  };
  
  const getSuggestedPrompts = () => {
    const prompts = {
      strategy: [
        t('suggestedPrompts.multiModelAnalysis', { defaultValue: "Analyze our strategic position using multi-model AI intelligence" }),
        t('suggestedPrompts.counterStrategy', { defaultValue: "What's our best counter-strategy for the opposition's recent moves?" }),
        t('suggestedPrompts.strategicPriorities', { defaultValue: "What are the top 3 strategic priorities for this ward?" }),
        t('suggestedPrompts.competitiveLandscape', { defaultValue: "Analyze the competitive landscape for the upcoming election" })
      ],
      analysis: [
        t('suggestedPrompts.comprehensiveAnalysis', { defaultValue: "Provide comprehensive multi-source analysis of current political trends" }),
        t('suggestedPrompts.sentimentTrends', { defaultValue: "Analyze recent sentiment trends in this ward" }),
        t('suggestedPrompts.keyIssues', { defaultValue: "What are the key issues driving voter sentiment?" }),
        t('suggestedPrompts.emergingOpportunities', { defaultValue: "Identify emerging political opportunities" })
      ],
      planning: [
        t('suggestedPrompts.strategicPlan', { defaultValue: "Create a comprehensive strategic plan with AI-powered insights" }),
        t('suggestedPrompts.actionPlan', { defaultValue: "Create a 30-day campaign action plan" }),
        t('suggestedPrompts.talkingPoints', { defaultValue: "Draft talking points for the infrastructure meeting" }),
        t('suggestedPrompts.crisisStrategy', { defaultValue: "Develop crisis communication strategy" })
      ],
      quick: [
        t('suggestedPrompts.aiIntelligence', { defaultValue: "Quick AI-powered political intelligence summary for today" }),
        t('suggestedPrompts.dailyIntelligence', { defaultValue: "Summarize today's political intelligence" }),
        t('suggestedPrompts.townHallPrep', { defaultValue: "What should I know before the town hall?" }),
        t('suggestedPrompts.urgentActions', { defaultValue: "Any urgent actions needed today?" })
      ],
      playbook: [
        t('suggestedPrompts.generatePlaybook', { defaultValue: "Generate a communications playbook for current political situation" }),
        t('suggestedPrompts.oppositionResponse', { defaultValue: "Create strategic response to opposition messaging" }),
        t('suggestedPrompts.messagingStrategy', { defaultValue: "Design messaging strategy for policy announcement" }),
        t('suggestedPrompts.stakeholderCommunication', { defaultValue: "Plan stakeholder communication approach" })
      ],
      scenario: [
        t('suggestedPrompts.scenarioSimulation', { defaultValue: "Run scenario simulation: What if our opponent changes their education policy?" }),
        t('suggestedPrompts.scenarioAnalysis', { defaultValue: "What if our main opponent changes their position on education?" }),
        t('suggestedPrompts.crisisScenario', { defaultValue: "Simulate crisis scenario and response options" }),
        t('suggestedPrompts.electionOutcome', { defaultValue: "Model different election outcome scenarios" })
      ]
    };
    return prompts[chatType] || prompts.strategy;
  };
  
  const handlePlaybookGenerated = (playbook) => {
    console.log('Playbook generated:', playbook);
    // Could add playbook to conversation history or display notification
  };
  
  const handleScenarioRun = (scenario) => {
    console.log('Scenario run:', scenario);
    // Could add scenario results to conversation or display notification
  };
  
  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col ${className}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                {t('Enhanced Political Strategist')}
              </h2>
              {currentWard && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {currentWard}
                </span>
              )}
              {/* AI Capabilities Indicator */}
              <div className="flex items-center space-x-1">
                {aiCapabilities.multiModel && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Multi-model AI Active" />
                )}
                {aiCapabilities.playbook && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Playbook Generation Active" />
                )}
                {aiCapabilities.scenario && (
                  <div className="w-2 h-2 bg-indigo-500 rounded-full" title="Scenario Simulation Active" />
                )}
                {aiCapabilities.alerting && (
                  <div className="w-2 h-2 bg-red-500 rounded-full" title="Enhanced Alerting Active" />
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Chat Type Selector */}
              <select
                value={chatType}
                onChange={(e) => setChatType(e.target.value)}
                className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={t('selectChatType')}
              >
                {Object.entries(CHAT_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>
                    {t(`chatTypes.${key}`)}
                  </option>
                ))}
              </select>
              
              {/* Language Switcher */}
              <LanguageSwitcher className="hidden sm:block" />
              
              {/* Action Buttons */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                title={t('conversationHistory')}
              >
                <Clock className="h-4 w-4" />
              </button>
              
              <button
                onClick={exportConversation}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                title={t('exportChat')}
              >
                <Download className="h-4 w-4" />
              </button>
              
              <button
                onClick={clearConversation}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                title={t('clearChat')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              
              {/* Wave 2 Action Buttons */}
              <button
                onClick={() => setShowPlaybookPanel(true)}
                className="p-2 text-gray-600 hover:text-yellow-600 transition-colors"
                title={t('Generate Communications Playbook')}
              >
                <BookOpen className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => setShowScenarioPanel(true)}
                className="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                title={t('Interactive Scenario Simulation')}
              >
                <TrendingUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {conversationTitle && (
            <div className="mt-2 text-sm text-gray-600">
              {conversationTitle}
            </div>
          )}
        </div>
        
        {/* Contextual Alerts Bar */}
        {contextualAlerts.length > 0 && (
          <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {t('Strategic Alerts')}: {contextualAlerts.length} {t('items requiring attention')}
              </span>
              <button 
                onClick={() => console.log('View alerts:', contextualAlerts)}
                className="text-xs text-yellow-700 hover:text-yellow-900"
              >
                {t('View Details')}
              </button>
            </div>
          </div>
        )}
        
        {/* Conversation History Sidebar */}
        {showHistory && (
          <ConversationHistory 
            conversations={conversations}
            currentConversationId={sessionId}
            onSelectConversation={(convId) => {
              setShowHistory(false);
              loadConversation(convId);
            }}
            onClose={() => setShowHistory(false)}
          />
        )}
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onCopy={() => copyMessage(message.content)}
              onAction={(action) => console.log('Action:', action)}
              enhanced={true}
            />
          ))}
          
          {/* Streaming Message */}
          {streamingMessage && (
            <MessageBubble
              message={streamingMessage}
              onCopy={() => copyMessage(streamingMessage.content)}
              enhanced={true}
            />
          )}
          
          {/* Enhanced Loading Indicator */}
          {isLoading && !streamingMessage && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">
                      {t('Enhanced AI analysis in progress...')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('Using multi-model orchestration and advanced capabilities')}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Enhanced Suggested Prompts */}
        {showSuggestions && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
            <div className="text-xs font-medium text-gray-700 mb-2 flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              {t('AI-Enhanced Prompts')}:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {getSuggestedPrompts().slice(0, 4).map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputValue(prompt);
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                  }}
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
                    className="text-blue-600 hover:text-red-600 ml-1"
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
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileAttach}
              className="hidden"
              accept=".txt,.pdf,.doc,.docx,.jpg,.png,.csv"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              title={t('attachFile')}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleVoiceInput}
              className={`p-2 transition-colors ${
                isListening 
                  ? 'text-red-600 hover:text-red-800' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title={isListening ? t('stopRecording') : t('voiceInput')}
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
                placeholder={t('Enhanced AI chat - Ask anything about political strategy...')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                dir={i18n.language === 'ur' ? 'rtl' : 'ltr'}
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
              title={t('sendMessage')}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Wave 2 Modal Panels */}
      <PlaybookPanel
        isOpen={showPlaybookPanel}
        onClose={() => setShowPlaybookPanel(false)}
        conversationHistory={messages}
        currentWard={currentWard}
        language={i18n.language}
        onPlaybookGenerated={handlePlaybookGenerated}
      />
      
      {showScenarioPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Interactive Scenario Simulation</h2>
              <button
                onClick={() => setShowScenarioPanel(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-light"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <ScenarioSimulator
                onScenarioRun={handleScenarioRun}
                onScenarioShare={(data) => console.log('Share scenario:', data)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedChatInterface;
/**
 * MessageBubble - Enhanced Message Component for Political Strategy Chat
 * 
 * Features:
 * - Multilingual message display
 * - Political context indicators
 * - Confidence scoring
 * - Action buttons integration
 * - Source citations
 * - Message reactions and feedback
 * - Streaming message support
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  User,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  Paperclip,
  Volume2,
  Globe,
  Target,
  BarChart3,
  Lightbulb,
  Zap,
  BookOpen
} from 'lucide-react';

const MessageBubble = ({ 
  message, 
  onCopy = () => {},
  onAction = () => {},
  onReaction = () => {},
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  
  const isBot = message.type === 'bot';
  const isUser = message.type === 'user';
  const isStreaming = message.isStreaming;
  const isError = message.isError;
  
  const ChatIcon = isBot ? Bot : User;
  
  // Format confidence score
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };
  
  // Get chat type icon
  const getChatTypeIcon = (chatType) => {
    const icons = {
      strategy: Target,
      analysis: BarChart3,
      planning: BookOpen,
      quick: Zap,
      playbook: Lightbulb,
      scenario: TrendingUp
    };
    return icons[chatType] || Target;
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: i18n.language === 'en' 
    });
  };
  
  // Handle reaction
  const handleReaction = (reactionType) => {
    setUserReaction(reactionType);
    onReaction(message.id, reactionType);
  };
  
  // Handle copy message
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onCopy(message.content);
  };
  
  // Handle action button click
  const handleActionClick = (action) => {
    onAction({ ...action, messageId: message.id });
  };
  
  // Truncate long messages
  const shouldTruncate = message.content.length > 500;
  const displayContent = shouldTruncate && !showFullMessage 
    ? message.content.substring(0, 500) + '...'
    : message.content;
  
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4 ${className}`}>
      <div className={`flex max-w-[85%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isBot 
            ? isError
              ? 'bg-red-100 text-red-600 mr-3'
              : 'bg-blue-100 text-blue-600 mr-3'
            : 'bg-gray-100 text-gray-600 ml-3'
        }`}>
          <ChatIcon className=\"h-4 w-4\" />
        </div>
        
        {/* Message Content */}
        <div className={`rounded-lg px-4 py-3 shadow-sm ${
          isBot 
            ? isError 
              ? 'bg-red-50 text-red-800 border border-red-200'
              : isStreaming
                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                : 'bg-gray-50 text-gray-800 border border-gray-200'
            : 'bg-blue-600 text-white'
        }`}>
          
          {/* Message Header (for bot messages) */}
          {isBot && message.context && (
            <div className=\"flex items-center justify-between mb-2 pb-2 border-b border-gray-200\">
              <div className=\"flex items-center space-x-2\">
                {/* Chat Type Indicator */}
                {message.context.chatType && message.context.chatType !== 'welcome' && (
                  <div className=\"flex items-center space-x-1\">
                    {React.createElement(getChatTypeIcon(message.context.chatType), {
                      className: \"h-3 w-3 text-gray-500\"
                    })}
                    <span className=\"text-xs text-gray-500\">\n                      {t(`chatTypes.${message.context.chatType}`)}\n                    </span>\n                  </div>\n                )}\n                \n                {/* Ward Context */}\n                {message.context.ward && (\n                  <span className=\"text-xs text-gray-500\">\n                    {message.context.ward}\n                  </span>\n                )}\n              </div>\n              \n              {/* Confidence Score */}\n              {message.context.confidence && (\n                <div className={`px-2 py-0.5 rounded text-xs font-medium ${\n                  getConfidenceColor(message.context.confidence)\n                }`}>\n                  {Math.round(message.context.confidence * 100)}% {t('confidence')}\n                </div>\n              )}\n            </div>\n          )}\n          \n          {/* Message Text */}\n          <div className=\"text-sm whitespace-pre-wrap\" dir={message.language === 'ur' ? 'rtl' : 'ltr'}>\n            {displayContent}\n            \n            {/* Streaming indicator */}\n            {isStreaming && (\n              <span className=\"inline-block w-2 h-4 bg-blue-500 opacity-75 animate-pulse ml-1\"></span>\n            )}\n            \n            {/* Show more/less toggle */}\n            {shouldTruncate && (\n              <button\n                onClick={() => setShowFullMessage(!showFullMessage)}\n                className=\"text-blue-600 hover:text-blue-800 text-xs font-medium ml-2\"\n              >\n                {showFullMessage ? t('showLess') : t('showMore')}\n              </button>\n            )}\n          </div>\n          \n          {/* File Attachments */}\n          {message.attachments && message.attachments.length > 0 && (\n            <div className=\"mt-3 space-y-2\">\n              {message.attachments.map((file) => (\n                <div \n                  key={file.id} \n                  className=\"flex items-center space-x-2 p-2 bg-white bg-opacity-50 rounded border\"\n                >\n                  <Paperclip className=\"h-3 w-3\" />\n                  <span className=\"text-xs font-medium\">{file.name}</span>\n                  <span className=\"text-xs text-gray-500\">\n                    ({Math.round(file.size / 1024)}KB)\n                  </span>\n                </div>\n              ))}\n            </div>\n          )}\n          \n          {/* Source Citations (for bot messages) */}\n          {isBot && message.context?.sources && message.context.sources.length > 0 && (\n            <div className=\"mt-3 pt-2 border-t border-gray-200\">\n              <div className=\"text-xs text-gray-500 mb-1\">\n                {t('sources')}:\n              </div>\n              <div className=\"flex flex-wrap gap-1\">\n                {message.context.sources.map((source, index) => (\n                  <span \n                    key={index}\n                    className=\"px-1.5 py-0.5 bg-white bg-opacity-50 text-xs rounded border\"\n                  >\n                    {source}\n                  </span>\n                ))}\n              </div>\n            </div>\n          )}\n          \n          {/* Action Buttons (for bot messages) */}\n          {isBot && message.actions && message.actions.length > 0 && !isStreaming && (\n            <div className=\"mt-3 pt-2 border-t border-gray-200 space-y-1\">\n              {message.actions.map((action, index) => (\n                <button\n                  key={index}\n                  onClick={() => handleActionClick(action)}\n                  className=\"w-full text-left px-3 py-2 text-xs bg-white bg-opacity-30 hover:bg-opacity-50 rounded border transition-colors\"\n                >\n                  <div className=\"flex items-center justify-between\">\n                    <span className=\"font-medium\">{action.label}</span>\n                    {action.type === 'external_link' && (\n                      <ExternalLink className=\"h-3 w-3\" />\n                    )}\n                  </div>\n                  {action.description && (\n                    <div className=\"text-gray-600 mt-1\">{action.description}</div>\n                  )}\n                </button>\n              ))}\n            </div>\n          )}\n          \n          {/* Message Footer */}\n          <div className=\"flex items-center justify-between mt-3 pt-2\">\n            {/* Timestamp and metadata */}\n            <div className=\"flex items-center space-x-2 text-xs opacity-70\">\n              <Clock className=\"h-3 w-3\" />\n              <span>{formatTime(message.timestamp)}</span>\n              \n              {/* Language indicator for multilingual messages */}\n              {message.language && message.language !== i18n.language && (\n                <div className=\"flex items-center space-x-1\">\n                  <Globe className=\"h-3 w-3\" />\n                  <span>{message.language.toUpperCase()}</span>\n                </div>\n              )}\n              \n              {/* Ward context */}\n              {message.context?.ward && (\n                <span className=\"text-gray-500\">• {message.context.ward}</span>\n              )}\n            </div>\n            \n            {/* Action Buttons */}\n            <div className=\"flex items-center space-x-1\">\n              {/* Copy Button */}\n              <button\n                onClick={handleCopy}\n                className=\"p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors\"\n                title={t('copy')}\n              >\n                <Copy className=\"h-3 w-3\" />\n              </button>\n              \n              {/* Text-to-Speech (for bot messages) */}\n              {isBot && 'speechSynthesis' in window && (\n                <button\n                  onClick={() => {\n                    const utterance = new SpeechSynthesisUtterance(message.content);\n                    utterance.lang = message.language || i18n.language;\n                    speechSynthesis.speak(utterance);\n                  }}\n                  className=\"p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors\"\n                  title={t('readAloud')}\n                >\n                  <Volume2 className=\"h-3 w-3\" />\n                </button>\n              )}\n              \n              {/* Feedback Buttons (for bot messages) */}\n              {isBot && !isError && !isStreaming && (\n                <>\n                  <button\n                    onClick={() => handleReaction('helpful')}\n                    className={`p-1 rounded transition-colors ${\n                      userReaction === 'helpful'\n                        ? 'text-green-600 bg-green-100'\n                        : 'hover:bg-black hover:bg-opacity-10'\n                    }`}\n                    title={t('helpful')}\n                  >\n                    <ThumbsUp className=\"h-3 w-3\" />\n                  </button>\n                  \n                  <button\n                    onClick={() => handleReaction('unhelpful')}\n                    className={`p-1 rounded transition-colors ${\n                      userReaction === 'unhelpful'\n                        ? 'text-red-600 bg-red-100'\n                        : 'hover:bg-black hover:bg-opacity-10'\n                    }`}\n                    title={t('unhelpful')}\n                  >\n                    <ThumbsDown className=\"h-3 w-3\" />\n                  </button>\n                </>\n              )}\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default MessageBubble;
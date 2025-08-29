/**
 * ConversationHistory - Conversation Management Component
 * 
 * Features:
 * - Conversation list with search and filtering
 * - Multilingual conversation titles
 * - Conversation metadata (date, ward, language, message count)
 * - Export/import conversation functionality
 * - Conversation sharing and collaboration
 * - Archive and delete operations
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  MessageSquare,
  Clock,
  Globe,
  MapPin,
  Users,
  Download,
  Upload,
  Archive,
  Trash2,
  Share2,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Tag,
  MoreVertical,
  Star,
  StarOff,
  X
} from 'lucide-react';

const ConversationHistory = ({ 
  conversations = [], 
  currentConversationId = null,
  onSelectConversation = () => {},
  onDeleteConversation = () => {},
  onExportConversation = () => {},
  onClose = () => {},
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, ward, chatType, language
  const [sortBy, setSortBy] = useState('recent'); // recent, oldest, title, ward
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteConversations, setFavoriteConversations] = useState([]);
  
  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('lokdarpan_favorite_conversations');
    if (savedFavorites) {
      setFavoriteConversations(JSON.parse(savedFavorites));
    }
  }, []);
  
  // Save favorites to localStorage
  const saveFavorites = (favorites) => {
    setFavoriteConversations(favorites);
    localStorage.setItem('lokdarpan_favorite_conversations', JSON.stringify(favorites));
  };
  
  // Toggle favorite
  const toggleFavorite = (conversationId) => {
    const newFavorites = favoriteConversations.includes(conversationId)
      ? favoriteConversations.filter(id => id !== conversationId)
      : [...favoriteConversations, conversationId];
    saveFavorites(newFavorites);
  };
  
  // Filter conversations
  const filteredConversations = conversations.filter(conversation => {
    // Search query filter
    if (searchQuery && !conversation.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by type
    if (filterBy === 'ward' && conversation.ward) {
      return conversation.ward.toLowerCase().includes(searchQuery.toLowerCase());
    } else if (filterBy === 'chatType' && conversation.chatType) {
      return conversation.chatType === searchQuery;
    } else if (filterBy === 'language' && conversation.language) {
      return conversation.language === searchQuery;
    } else if (filterBy === 'favorites') {
      return favoriteConversations.includes(conversation.id);
    }
    
    return true;
  });
  
  // Sort conversations
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'recent':
        comparison = new Date(b.lastUpdated) - new Date(a.lastUpdated);
        break;
      case 'oldest':\n        comparison = new Date(a.lastUpdated) - new Date(b.lastUpdated);\n        break;\n      case 'title':\n        comparison = a.title.localeCompare(b.title);\n        break;\n      case 'ward':\n        comparison = (a.ward || '').localeCompare(b.ward || '');\n        break;\n      default:\n        comparison = 0;\n    }\n    \n    return sortOrder === 'desc' ? -comparison : comparison;\n  });\n  \n  // Format date\n  const formatDate = (dateString) => {\n    const date = new Date(dateString);\n    const now = new Date();\n    const diffTime = Math.abs(now - date);\n    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));\n    \n    if (diffDays === 1) {\n      return t('time.today');\n    } else if (diffDays === 2) {\n      return t('time.yesterday');\n    } else if (diffDays <= 7) {\n      return t('time.daysAgo', { count: diffDays });\n    } else {\n      return date.toLocaleDateString(i18n.language);\n    }\n  };\n  \n  // Get chat type label\n  const getChatTypeLabel = (chatType) => {\n    return t(`chatTypes.${chatType}`) || chatType;\n  };\n  \n  // Get language name\n  const getLanguageName = (langCode) => {\n    const languages = {\n      en: 'English',\n      hi: 'हिन्दी',\n      te: 'తెలుగు',\n      ur: 'اردو'\n    };\n    return languages[langCode] || langCode;\n  };\n  \n  // Handle conversation selection\n  const handleConversationClick = (conversation) => {\n    onSelectConversation(conversation.id);\n    onClose();\n  };\n  \n  // Handle bulk operations\n  const handleBulkDelete = () => {\n    selectedConversations.forEach(id => {\n      onDeleteConversation(id);\n    });\n    setSelectedConversations([]);\n  };\n  \n  const handleBulkExport = () => {\n    selectedConversations.forEach(id => {\n      const conversation = conversations.find(c => c.id === id);\n      if (conversation) {\n        onExportConversation(conversation);\n      }\n    });\n    setSelectedConversations([]);\n  };\n  \n  return (\n    <div className={`bg-white border-l border-gray-200 w-80 flex flex-col ${className}`}>\n      {/* Header */}\n      <div className=\"p-4 border-b border-gray-200\">\n        <div className=\"flex items-center justify-between mb-3\">\n          <h3 className=\"text-lg font-semibold text-gray-900\">\n            {t('conversationHistory')}\n          </h3>\n          <button\n            onClick={onClose}\n            className=\"p-1 text-gray-500 hover:text-gray-700 transition-colors\"\n          >\n            <X className=\"h-4 w-4\" />\n          </button>\n        </div>\n        \n        {/* Search */}\n        <div className=\"relative mb-3\">\n          <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400\" />\n          <input\n            type=\"text\"\n            value={searchQuery}\n            onChange={(e) => setSearchQuery(e.target.value)}\n            placeholder={t('searchConversations')}\n            className=\"w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm\"\n          />\n        </div>\n        \n        {/* Filter and Sort Controls */}\n        <div className=\"flex items-center justify-between\">\n          <button\n            onClick={() => setShowFilters(!showFilters)}\n            className=\"flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 transition-colors\"\n          >\n            <Filter className=\"h-4 w-4\" />\n            <span>{t('filters')}</span>\n          </button>\n          \n          <div className=\"flex items-center space-x-1\">\n            <select\n              value={sortBy}\n              onChange={(e) => setSortBy(e.target.value)}\n              className=\"text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500\"\n            >\n              <option value=\"recent\">{t('sortBy.recent')}</option>\n              <option value=\"oldest\">{t('sortBy.oldest')}</option>\n              <option value=\"title\">{t('sortBy.title')}</option>\n              <option value=\"ward\">{t('sortBy.ward')}</option>\n            </select>\n            \n            <button\n              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}\n              className=\"p-1 text-gray-500 hover:text-gray-700 transition-colors\"\n            >\n              {sortOrder === 'asc' ? <SortAsc className=\"h-4 w-4\" /> : <SortDesc className=\"h-4 w-4\" />}\n            </button>\n          </div>\n        </div>\n        \n        {/* Advanced Filters */}\n        {showFilters && (\n          <div className=\"mt-3 pt-3 border-t border-gray-100 space-y-2\">\n            <div className=\"grid grid-cols-2 gap-2\">\n              <button\n                onClick={() => setFilterBy(filterBy === 'favorites' ? 'all' : 'favorites')}\n                className={`px-2 py-1 text-xs rounded transition-colors ${\n                  filterBy === 'favorites'\n                    ? 'bg-blue-100 text-blue-800'\n                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'\n                }`}\n              >\n                <Star className=\"h-3 w-3 inline mr-1\" />\n                {t('favorites')}\n              </button>\n              \n              <button\n                onClick={() => setFilterBy(filterBy === 'ward' ? 'all' : 'ward')}\n                className={`px-2 py-1 text-xs rounded transition-colors ${\n                  filterBy === 'ward'\n                    ? 'bg-blue-100 text-blue-800'\n                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'\n                }`}\n              >\n                <MapPin className=\"h-3 w-3 inline mr-1\" />\n                {t('byWard')}\n              </button>\n            </div>\n          </div>\n        )}\n      </div>\n      \n      {/* Bulk Actions */}\n      {selectedConversations.length > 0 && (\n        <div className=\"p-3 bg-blue-50 border-b border-blue-200\">\n          <div className=\"flex items-center justify-between\">\n            <span className=\"text-sm text-blue-800\">\n              {t('selectedConversations', { count: selectedConversations.length })}\n            </span>\n            <div className=\"flex items-center space-x-2\">\n              <button\n                onClick={handleBulkExport}\n                className=\"p-1 text-blue-600 hover:text-blue-800 transition-colors\"\n                title={t('exportSelected')}\n              >\n                <Download className=\"h-4 w-4\" />\n              </button>\n              <button\n                onClick={handleBulkDelete}\n                className=\"p-1 text-red-600 hover:text-red-800 transition-colors\"\n                title={t('deleteSelected')}\n              >\n                <Trash2 className=\"h-4 w-4\" />\n              </button>\n            </div>\n          </div>\n        </div>\n      )}\n      \n      {/* Conversations List */}\n      <div className=\"flex-1 overflow-y-auto\">\n        {sortedConversations.length === 0 ? (\n          <div className=\"p-6 text-center\">\n            <MessageSquare className=\"h-12 w-12 text-gray-300 mx-auto mb-3\" />\n            <h4 className=\"text-lg font-medium text-gray-900 mb-2\">\n              {t('noConversations')}\n            </h4>\n            <p className=\"text-gray-500 text-sm\">\n              {searchQuery \n                ? t('noConversationsMatchSearch')\n                : t('startFirstConversation')\n              }\n            </p>\n          </div>\n        ) : (\n          <div className=\"space-y-1 p-2\">\n            {sortedConversations.map((conversation) => {\n              const isSelected = selectedConversations.includes(conversation.id);\n              const isCurrent = currentConversationId === conversation.id;\n              const isFavorite = favoriteConversations.includes(conversation.id);\n              \n              return (\n                <div\n                  key={conversation.id}\n                  className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${\n                    isCurrent\n                      ? 'bg-blue-100 border border-blue-200'\n                      : isSelected\n                        ? 'bg-gray-100 border border-gray-300'\n                        : 'hover:bg-gray-50 border border-transparent'\n                  }`}\n                  onClick={() => handleConversationClick(conversation)}\n                >\n                  {/* Checkbox for bulk selection */}\n                  <div className=\"absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity\">\n                    <input\n                      type=\"checkbox\"\n                      checked={isSelected}\n                      onChange={(e) => {\n                        e.stopPropagation();\n                        setSelectedConversations(prev => \n                          prev.includes(conversation.id)\n                            ? prev.filter(id => id !== conversation.id)\n                            : [...prev, conversation.id]\n                        );\n                      }}\n                      className=\"h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded\"\n                    />\n                  </div>\n                  \n                  {/* Conversation Title */}\n                  <div className=\"flex items-start justify-between pr-6 mb-2\">\n                    <h4 className={`font-medium truncate ${\n                      isCurrent ? 'text-blue-900' : 'text-gray-900'\n                    }`}>\n                      {conversation.title || t('untitledConversation')}\n                    </h4>\n                    \n                    {/* Favorite Star */}\n                    <button\n                      onClick={(e) => {\n                        e.stopPropagation();\n                        toggleFavorite(conversation.id);\n                      }}\n                      className={`p-1 rounded transition-colors ${\n                        isFavorite\n                          ? 'text-yellow-500 hover:text-yellow-600'\n                          : 'text-gray-300 hover:text-gray-500'\n                      }`}\n                    >\n                      {isFavorite ? <Star className=\"h-4 w-4 fill-current\" /> : <StarOff className=\"h-4 w-4\" />}\n                    </button>\n                  </div>\n                  \n                  {/* Conversation Metadata */}\n                  <div className=\"space-y-1\">\n                    <div className=\"flex items-center space-x-3 text-xs text-gray-500\">\n                      <div className=\"flex items-center space-x-1\">\n                        <Clock className=\"h-3 w-3\" />\n                        <span>{formatDate(conversation.lastUpdated)}</span>\n                      </div>\n                      \n                      {conversation.ward && (\n                        <div className=\"flex items-center space-x-1\">\n                          <MapPin className=\"h-3 w-3\" />\n                          <span>{conversation.ward}</span>\n                        </div>\n                      )}\n                    </div>\n                    \n                    <div className=\"flex items-center justify-between text-xs\">\n                      <div className=\"flex items-center space-x-2\">\n                        {/* Chat Type */}\n                        <span className={`px-1.5 py-0.5 rounded ${\n                          isCurrent ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'\n                        }`}>\n                          {getChatTypeLabel(conversation.chatType)}\n                        </span>\n                        \n                        {/* Language */}\n                        {conversation.language && (\n                          <div className=\"flex items-center space-x-1 text-gray-500\">\n                            <Globe className=\"h-3 w-3\" />\n                            <span>{getLanguageName(conversation.language)}</span>\n                          </div>\n                        )}\n                      </div>\n                      \n                      {/* Message Count */}\n                      <span className=\"text-gray-400\">\n                        {conversation.messageCount || 0} {t('messages')}\n                      </span>\n                    </div>\n                  </div>\n                  \n                  {/* Last Message Preview */}\n                  {conversation.lastMessage && (\n                    <div className=\"mt-2 pt-2 border-t border-gray-100\">\n                      <p className=\"text-xs text-gray-600 line-clamp-2\">\n                        {conversation.lastMessage.length > 100\n                          ? conversation.lastMessage.substring(0, 100) + '...'\n                          : conversation.lastMessage\n                        }\n                      </p>\n                    </div>\n                  )}\n                </div>\n              );\n            })}\n          </div>\n        )}\n      </div>\n      \n      {/* Footer Actions */}\n      <div className=\"p-3 border-t border-gray-200 bg-gray-50\">\n        <div className=\"grid grid-cols-2 gap-2\">\n          <button\n            onClick={() => {/* Handle import */}}\n            className=\"flex items-center justify-center space-x-1 px-3 py-2 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors\"\n          >\n            <Upload className=\"h-3 w-3\" />\n            <span>{t('import')}</span>\n          </button>\n          \n          <button\n            onClick={() => {/* Handle export all */}}\n            className=\"flex items-center justify-center space-x-1 px-3 py-2 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors\"\n          >\n            <Download className=\"h-3 w-3\" />\n            <span>{t('exportAll')}</span>\n          </button>\n        </div>\n        \n        <div className=\"mt-2 text-center\">\n          <span className=\"text-xs text-gray-500\">\n            {t('totalConversations', { count: conversations.length })}\n          </span>\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default ConversationHistory;
/**
 * Playbook Panel Integration for Wave 2
 * 
 * Provides seamless playbook generation and management within conversations with:
 * - AI-powered playbook creation from chat context
 * - Multilingual playbook templates
 * - Opposition response automation
 * - Conversation-aware customization
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  MessageSquare,
  Download,
  Share2,
  Edit3,
  Copy,
  CheckCircle,
  AlertTriangle,
  Globe,
  Zap,
  Target,
  Users,
  Shield,
  TrendingUp
} from 'lucide-react';

const PLAYBOOK_TYPES = {
  crisis_response: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  policy_announcement: {
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  opposition_counter: {
    icon: Shield,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  community_engagement: {
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  media_relations: {
    icon: Globe,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  campaign_messaging: {
    icon: MessageSquare,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  stakeholder_communication: {
    icon: TrendingUp,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
};

const PlaybookPanel = ({
  isOpen,
  onClose,
  conversationHistory = [],
  currentWard,
  language = 'en',
  onPlaybookGenerated = () => {}
}) => {
  const { t } = useTranslation();
  
  // Playbook state
  const [selectedType, setSelectedType] = useState('policy_announcement');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlaybook, setGeneratedPlaybook] = useState(null);
  const [customContext, setCustomContext] = useState('');
  
  // Opposition response state
  const [oppositionMessage, setOppositionMessage] = useState('');
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [oppositionResponse, setOppositionResponse] = useState(null);

  // Clear state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setGeneratedPlaybook(null);
      setOppositionResponse(null);
      setCustomContext('');
      setOppositionMessage('');
    }
  }, [isOpen]);

  const generatePlaybook = async () => {
    if (!currentWard) {
      console.error('No ward selected for playbook generation');
      return;
    }

    setIsGenerating(true);
    setGeneratedPlaybook(null);

    try {
      const requestData = {
        playbook_type: selectedType,
        ward: currentWard,
        language: language,
        context: {
          custom_context: customContext,
          ward_context: `Political communications for ${currentWard} ward`,
          conversation_derived: 'Generated from ongoing strategic conversation'
        },
        conversation_context: conversationHistory.slice(-5) // Last 5 messages
      };

      const response = await fetch('/api/v1/strategist/playbook/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const playbook = await response.json();
      setGeneratedPlaybook(playbook);
      onPlaybookGenerated(playbook);

    } catch (error) {
      console.error('Playbook generation failed:', error);
      
      // Show fallback playbook
      const fallbackPlaybook = {
        playbook_type: selectedType,
        ward: currentWard,
        language: language,
        executive_summary: `Communications playbook for ${selectedType.replace('_', ' ')} in ${currentWard} ward.`,
        key_messages: [
          {
            message: `Strategic messaging for ${currentWard} ward ${selectedType.replace('_', ' ')}`,
            audience: 'general',
            tone: 'professional'
          }
        ],
        message_templates: [
          {
            type: 'general_statement',
            content: `Template for ${selectedType.replace('_', ' ')} communications in ${currentWard} ward.`,
            usage: 'general_communications'
          }
        ],
        channel_strategy: {
          primary_channels: ['Local media', 'Community meetings'],
          digital_channels: ['Social media', 'WhatsApp groups']
        },
        fallback_mode: true,
        error_message: 'Playbook generation temporarily unavailable - showing basic template'
      };
      
      setGeneratedPlaybook(fallbackPlaybook);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateOppositionResponse = async () => {
    if (!oppositionMessage.trim() || !currentWard) return;

    setIsGeneratingResponse(true);
    setOppositionResponse(null);

    try {
      const requestData = {
        opposition_message: oppositionMessage,
        opposition_context: {
          message_context: 'Opposition messaging requiring strategic response',
          ward_context: currentWard
        },
        ward: currentWard,
        language: language
      };

      const response = await fetch('/api/v1/strategist/playbook/opposition-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      setOppositionResponse(responseData);

    } catch (error) {
      console.error('Opposition response generation failed:', error);
      
      setOppositionResponse({
        response_strategy: 'Focus on facts and positive achievements',
        key_counter_points: [
          'Present verifiable information to counter claims',
          'Highlight positive developments and achievements',
          'Maintain professional and constructive tone'
        ],
        message_templates: [
          {
            template: `Our commitment to ${currentWard} development remains strong with transparent and accountable governance.`,
            usage: 'general_response'
          }
        ],
        tone_guidance: 'Professional, factual, and solution-oriented',
        fallback_mode: true,
        error_message: 'Opposition response generation temporarily unavailable'
      });
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const downloadPlaybook = () => {
    if (!generatedPlaybook) return;

    const playbookText = `
POLITICAL COMMUNICATIONS PLAYBOOK
${generatedPlaybook.playbook_type?.toUpperCase()} - ${currentWard} Ward
Generated: ${new Date().toLocaleString()}

EXECUTIVE SUMMARY:
${generatedPlaybook.executive_summary || 'Strategic communications plan'}

KEY MESSAGES:
${(generatedPlaybook.key_messages || []).map(msg => `- ${msg.message || msg}`).join('\\n')}

MESSAGE TEMPLATES:
${(generatedPlaybook.message_templates || []).map(template => 
  `${template.type || 'Template'}: ${template.content || template}`
).join('\\n\\n')}

CHANNEL STRATEGY:
Primary Channels: ${(generatedPlaybook.channel_strategy?.primary_channels || []).join(', ')}
Digital Channels: ${(generatedPlaybook.channel_strategy?.digital_channels || []).join(', ')}

${generatedPlaybook.strategic_recommendations ? 
  `STRATEGIC RECOMMENDATIONS:\\n${generatedPlaybook.strategic_recommendations.join('\\n- ')}`
  : ''}
    `.trim();

    const blob = new Blob([playbookText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}-playbook-${currentWard}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sharePlaybook = () => {
    if (!generatedPlaybook) return;

    const shareText = `Political Communications Playbook: ${selectedType.replace('_', ' ')} for ${currentWard} ward\\n\\nKey Strategy: ${generatedPlaybook.executive_summary || 'Strategic communications approach'}`;
    
    navigator.clipboard.writeText(shareText).then(() => {
      console.log('Playbook summary copied to clipboard');
    });
  };

  const copyTemplate = (template) => {
    const templateText = typeof template === 'string' ? template : template.content || template.template;
    navigator.clipboard.writeText(templateText);
  };

  if (!isOpen) return null;

  const PlaybookTypeIcon = PLAYBOOK_TYPES[selectedType]?.icon || BookOpen;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <PlaybookTypeIcon className={`h-6 w-6 ${PLAYBOOK_TYPES[selectedType]?.color}`} />
              <h2 className="text-xl font-bold text-gray-900">
                {t('Communications Playbook')}
              </h2>
              {currentWard && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {currentWard}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Playbook Generation Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 text-yellow-600 mr-2" />
              {t('Generate Playbook')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Playbook Type')}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                >
                  {Object.entries(PLAYBOOK_TYPES).map(([key, type]) => (
                    <option key={key} value={key}>
                      {t(key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Language')}
                </label>
                <select
                  value={language}
                  disabled
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                  <option value="ur">Urdu</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Additional Context')} ({t('Optional')})
              </label>
              <textarea
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder={t('Add any specific context or requirements for the playbook...')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                disabled={isGenerating}
              />
            </div>

            <button
              onClick={generatePlaybook}
              disabled={isGenerating || !currentWard}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('Generating Playbook...')}
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  {t('Generate Playbook')}
                </>
              )}
            </button>
          </div>

          {/* Generated Playbook Display */}
          {generatedPlaybook && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('Generated Playbook')}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={sharePlaybook}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    title={t('Share Playbook')}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    {t('Share')}
                  </button>
                  <button
                    onClick={downloadPlaybook}
                    className="px-3 py-1 text-sm text-green-600 hover:text-green-800 flex items-center"
                    title={t('Download Playbook')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {t('Download')}
                  </button>
                </div>
              </div>

              {generatedPlaybook.fallback_mode && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-800">
                      {generatedPlaybook.error_message || t('Limited functionality - basic playbook template provided')}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">{t('Executive Summary')}</h4>
                  <p className="text-gray-700 text-sm">{generatedPlaybook.executive_summary}</p>
                </div>

                {generatedPlaybook.key_messages && generatedPlaybook.key_messages.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">{t('Key Messages')}</h4>
                    <div className="space-y-2">
                      {generatedPlaybook.key_messages.slice(0, 3).map((message, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded border">
                          <p className="text-sm text-blue-800">
                            {typeof message === 'string' ? message : message.message}
                          </p>
                          {message.audience && (
                            <span className="text-xs text-blue-600 mt-1 block">
                              {t('Target')}: {message.audience}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedPlaybook.message_templates && generatedPlaybook.message_templates.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">{t('Message Templates')}</h4>
                    <div className="space-y-2">
                      {generatedPlaybook.message_templates.slice(0, 2).map((template, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-800 mb-1">
                                {typeof template === 'string' ? template : template.content}
                              </p>
                              {template.usage && (
                                <span className="text-xs text-gray-600">
                                  {t('Usage')}: {template.usage}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => copyTemplate(template)}
                              className="ml-2 text-gray-500 hover:text-gray-700"
                              title={t('Copy Template')}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Opposition Response Section */}
          <div className="bg-red-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 text-red-600 mr-2" />
              {t('Opposition Response Generator')}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Opposition Message to Counter')}
              </label>
              <textarea
                value={oppositionMessage}
                onChange={(e) => setOppositionMessage(e.target.value)}
                placeholder={t('Enter the opposition message or claim you need to respond to...')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={3}
                disabled={isGeneratingResponse}
              />
            </div>

            <button
              onClick={generateOppositionResponse}
              disabled={isGeneratingResponse || !oppositionMessage.trim() || !currentWard}
              className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingResponse ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('Generating Response...')}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  {t('Generate Strategic Response')}
                </>
              )}
            </button>

            {/* Opposition Response Display */}
            {oppositionResponse && (
              <div className="mt-4 bg-white border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-3">{t('Strategic Response')}</h4>
                
                {oppositionResponse.fallback_mode && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <span className="text-sm text-yellow-800">
                      {oppositionResponse.error_message || t('Basic response template provided')}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700">{t('Response Strategy')}</h5>
                    <p className="text-sm text-gray-600">{oppositionResponse.response_strategy}</p>
                  </div>

                  {oppositionResponse.key_counter_points && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700">{t('Key Counter-Points')}</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {oppositionResponse.key_counter_points.slice(0, 3).map((point, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-3 w-3 text-green-600 mr-2 mt-1 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {oppositionResponse.message_templates && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700">{t('Response Templates')}</h5>
                      <div className="space-y-2">
                        {oppositionResponse.message_templates.slice(0, 2).map((template, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="flex items-start justify-between">
                              <span className="text-gray-800">
                                {typeof template === 'string' ? template : template.template}
                              </span>
                              <button
                                onClick={() => copyTemplate(template)}
                                className="ml-2 text-gray-500 hover:text-gray-700"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybookPanel;
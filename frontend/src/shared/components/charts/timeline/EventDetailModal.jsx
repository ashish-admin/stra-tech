/**
 * Event Detail Modal Component
 * LokDarpan Phase 4.3: Advanced Data Visualization
 * 
 * Rich modal for displaying detailed event information with bookmarking,
 * sharing, and contextual analysis for political intelligence.
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { 
  XMarkIcon,
  BookmarkIcon as BookmarkOutlineIcon,
  ShareIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  NewspaperIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolidIcon,
  CheckIcon 
} from '@heroicons/react/24/solid';

// Event type configurations
const EVENT_TYPE_CONFIG = {
  news: { 
    label: 'News & Media', 
    color: '#3b82f6', 
    icon: '📰',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  campaign: { 
    label: 'Campaign Events', 
    color: '#f59e0b', 
    icon: '🗳️',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-700 dark:text-yellow-300'
  },
  policy: { 
    label: 'Policy Changes', 
    color: '#10b981', 
    icon: '📋',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-300'
  },
  sentiment: { 
    label: 'Sentiment Shifts', 
    color: '#8b5cf6', 
    icon: '📊',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-700 dark:text-purple-300'
  },
  electoral: { 
    label: 'Electoral Events', 
    color: '#ef4444', 
    icon: '🏛️',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-300'
  },
  cluster: {
    label: 'Event Cluster',
    color: '#6b7280',
    icon: '📊',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300'
  }
};

/**
 * Event Metadata Display Component
 */
const EventMetadata = ({ event }) => {
  const metadata = event.metadata || {};

  const renderMetadataField = (label, value, formatter = (v) => v) => {
    if (value === undefined || value === null) return null;

    return (
      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {label}
        </span>
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {formatter(value)}
        </span>
      </div>
    );
  };

  const formatSentiment = (score) => {
    if (typeof score !== 'number') return 'Unknown';
    const sentiment = score > 0.1 ? 'Positive' : score < -0.1 ? 'Negative' : 'Neutral';
    return `${sentiment} (${(score * 100).toFixed(1)}%)`;
  };

  const formatEngagement = (engagement) => {
    if (!engagement || typeof engagement !== 'object') return 'No data';
    const metrics = [];
    if (engagement.shares) metrics.push(`${engagement.shares} shares`);
    if (engagement.comments) metrics.push(`${engagement.comments} comments`);
    if (engagement.likes) metrics.push(`${engagement.likes} likes`);
    return metrics.join(', ') || 'No engagement data';
  };

  return (
    <div className="space-y-1">
      {renderMetadataField('Ward', metadata.ward)}
      {renderMetadataField('Sentiment', metadata.sentiment, formatSentiment)}
      {renderMetadataField('Engagement', metadata.engagement, formatEngagement)}
      {renderMetadataField('Severity', metadata.severity)}
      {renderMetadataField('Category', metadata.category)}
      {renderMetadataField('Change', metadata.change, (v) => `${(v * 100).toFixed(1)}%`)}
      {renderMetadataField('Action Required', metadata.actionRequired, (v) => v ? 'Yes' : 'No')}
      {metadata.entities?.politicians?.length > 0 && 
        renderMetadataField('Politicians', metadata.entities.politicians.join(', '))}
      {metadata.entities?.parties?.length > 0 && 
        renderMetadataField('Parties', metadata.entities.parties.join(', '))}
    </div>
  );
};

/**
 * Cluster Events Display Component
 */
const ClusterEvents = ({ events }) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
        Events in this cluster:
      </h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.map((event, index) => {
          const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.news;
          return (
            <div 
              key={event.id || index}
              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
                <span className="text-sm">{config.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-1">
                  {event.title}
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {event.description}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor} ${config.textColor}`}>
                    {config.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Share Options Component
 */
const ShareOptions = ({ event, onClose }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams({
      eventId: event.id,
      type: event.type,
      timestamp: event.timestamp.toISOString()
    });
    return `${window.location.origin}/timeline?${params.toString()}`;
  }, [event]);

  const shareText = useMemo(() => {
    return `Political Intelligence Alert: ${event.title} - ${event.timestamp.toLocaleDateString()}`;
  }, [event]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LokDarpan Political Intelligence',
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent('LokDarpan Political Intelligence Alert');
    const body = encodeURIComponent(`${shareText}\n\nView full details: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
        Share this event
      </h4>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleShareNative}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <ShareIcon className="w-4 h-4" />
          Share
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </>
          )}
        </button>

        <button
          onClick={handleEmailShare}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email
        </button>
      </div>
    </div>
  );
};

/**
 * Main Event Detail Modal Component
 */
const EventDetailModal = ({ 
  event,
  onClose,
  onBookmark,
  onShare,
  className = ''
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Event type configuration
  const eventConfig = EVENT_TYPE_CONFIG[event?.type] || EVENT_TYPE_CONFIG.news;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle bookmark toggle
  const handleBookmarkToggle = useCallback(() => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.(event, !isBookmarked);
  }, [event, isBookmarked, onBookmark]);

  // Calculate importance display
  const importanceDisplay = useMemo(() => {
    const stars = '★'.repeat(event?.importance || 1) + '☆'.repeat(5 - (event?.importance || 1));
    return stars;
  }, [event?.importance]);

  if (!event) return null;

  const tabs = [
    { id: 'details', label: 'Details', icon: NewspaperIcon },
    { id: 'metadata', label: 'Analysis', icon: ChartBarIcon },
    { id: 'share', label: 'Share', icon: ShareIcon }
  ];

  if (event.type === 'cluster' && event.metadata?.events) {
    tabs.splice(1, 0, { id: 'cluster', label: 'Events', icon: TagIcon });
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 ${className}`}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${eventConfig.bgColor} px-6 py-4 border-b border-gray-200 dark:border-gray-700`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="text-2xl">{eventConfig.icon}</div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-2">
                  {event.title}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{event.timestamp.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{event.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">{importanceDisplay}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleBookmarkToggle}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                {isBookmarked ? (
                  <BookmarkSolidIcon className="w-5 h-5 text-yellow-500" />
                ) : (
                  <BookmarkOutlineIcon className="w-5 h-5" />
                )}
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Event Type Badge */}
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${eventConfig.bgColor} ${eventConfig.textColor}`}>
              <TagIcon className="w-3 h-3" />
              {eventConfig.label}
            </span>
            <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
              from {event.source}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Event details tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Description
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {event.description || 'No description available.'}
                </p>
              </div>

              {event.metadata?.actionRequired && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Action Required
                    </h4>
                  </div>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                    This event requires strategic attention from the campaign team.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Political Analysis
              </h3>
              <EventMetadata event={event} />
            </div>
          )}

          {activeTab === 'cluster' && event.metadata?.events && (
            <ClusterEvents events={event.metadata.events} />
          )}

          {activeTab === 'share' && (
            <ShareOptions event={event} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
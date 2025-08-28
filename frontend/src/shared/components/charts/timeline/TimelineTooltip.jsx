/**
 * Timeline Tooltip Component
 * LokDarpan Phase 4.3: Advanced Data Visualization
 * 
 * Interactive tooltip for timeline events with quick preview and context
 * optimized for political intelligence display.
 */

import React, { useMemo } from 'react';
import { 
  CalendarIcon,
  ClockIcon,
  TagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Event type configurations
const EVENT_TYPE_CONFIG = {
  news: { label: 'News & Media', color: '#3b82f6', icon: '📰' },
  campaign: { label: 'Campaign Events', color: '#f59e0b', icon: '🗳️' },
  policy: { label: 'Policy Changes', color: '#10b981', icon: '📋' },
  sentiment: { label: 'Sentiment Shifts', color: '#8b5cf6', icon: '📊' },
  electoral: { label: 'Electoral Events', color: '#ef4444', icon: '🏛️' },
  cluster: { label: 'Event Cluster', color: '#6b7280', icon: '📊' }
};

/**
 * Timeline Tooltip Component
 */
const TimelineTooltip = ({ 
  visible, 
  x, 
  y, 
  data,
  className = '' 
}) => {
  // Calculate tooltip position to avoid going off-screen
  const tooltipStyle = useMemo(() => {
    if (!visible || !data) return { display: 'none' };

    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 10;

    let left = x;
    let top = y;

    // Adjust horizontal position
    if (left + tooltipWidth + padding > viewportWidth) {
      left = x - tooltipWidth - padding;
    }

    // Adjust vertical position
    if (top + tooltipHeight + padding > viewportHeight) {
      top = y - tooltipHeight - padding;
    }

    // Ensure tooltip doesn't go off the left edge
    if (left < padding) {
      left = padding;
    }

    // Ensure tooltip doesn't go off the top edge
    if (top < padding) {
      top = padding;
    }

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 1000,
      display: 'block'
    };
  }, [visible, x, y, data]);

  // Get event configuration
  const eventConfig = EVENT_TYPE_CONFIG[data?.type] || EVENT_TYPE_CONFIG.news;

  // Format importance as stars
  const importanceDisplay = useMemo(() => {
    if (!data?.importance) return '';
    return '★'.repeat(data.importance) + '☆'.repeat(5 - data.importance);
  }, [data?.importance]);

  // Format timestamp
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let timeStr = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (diffDays === 0) {
      return `Today at ${timeStr}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${timeStr}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago at ${timeStr}`;
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Format metadata for quick display
  const formatQuickMetadata = (metadata) => {
    if (!metadata) return [];

    const items = [];

    if (metadata.sentiment !== undefined) {
      const score = metadata.sentiment;
      const sentiment = score > 0.1 ? 'Positive' : score < -0.1 ? 'Negative' : 'Neutral';
      const emoji = score > 0.1 ? '😊' : score < -0.1 ? '😞' : '😐';
      items.push({ 
        label: 'Sentiment', 
        value: `${emoji} ${sentiment}`,
        color: score > 0.1 ? 'text-green-600' : score < -0.1 ? 'text-red-600' : 'text-gray-600'
      });
    }

    if (metadata.ward) {
      items.push({ 
        label: 'Ward', 
        value: metadata.ward,
        color: 'text-blue-600'
      });
    }

    if (metadata.severity) {
      const severityColors = {
        high: 'text-red-600',
        medium: 'text-yellow-600',
        low: 'text-green-600'
      };
      items.push({ 
        label: 'Severity', 
        value: metadata.severity.toUpperCase(),
        color: severityColors[metadata.severity] || 'text-gray-600'
      });
    }

    if (metadata.change !== undefined) {
      const changeValue = (metadata.change * 100).toFixed(1);
      const isPositive = metadata.change > 0;
      items.push({ 
        label: 'Change', 
        value: `${isPositive ? '+' : ''}${changeValue}%`,
        color: isPositive ? 'text-green-600' : 'text-red-600'
      });
    }

    if (metadata.count) {
      items.push({ 
        label: 'Events', 
        value: `${metadata.count} items`,
        color: 'text-gray-600'
      });
    }

    return items;
  };

  if (!visible || !data) {
    return null;
  }

  const quickMetadata = formatQuickMetadata(data.metadata);

  return (
    <div
      style={tooltipStyle}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 max-w-80 ${className}`}
      role="tooltip"
      aria-hidden={!visible}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="text-xl flex-shrink-0">
            {eventConfig.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-2">
              {data.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: eventConfig.color }}
              >
                {eventConfig.label}
              </span>
              {data.importance > 0 && (
                <span className="text-yellow-500 text-xs">
                  {importanceDisplay}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Description */}
        {data.description && (
          <div className="mb-3">
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
              {data.description}
            </p>
          </div>
        )}

        {/* Quick Metadata */}
        {quickMetadata.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {quickMetadata.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.label}
                </span>
                <span className={`text-xs font-medium ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp and Source */}
        <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3 h-3" />
            <span>{formatDateTime(data.timestamp)}</span>
          </div>
          
          {data.source && (
            <div className="flex items-center gap-1.5">
              <TagIcon className="w-3 h-3" />
              <span>Source: {data.source}</span>
            </div>
          )}

          {data.metadata?.actionRequired && (
            <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
              <ExclamationTriangleIcon className="w-3 h-3" />
              <span>Action Required</span>
            </div>
          )}
        </div>

        {/* Cluster Events Preview */}
        {data.type === 'cluster' && data.metadata?.events && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Events in cluster:
            </div>
            <div className="space-y-1 max-h-16 overflow-y-auto">
              {data.metadata.events.slice(0, 3).map((event, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" 
                       style={{ backgroundColor: EVENT_TYPE_CONFIG[event.type]?.color || '#6b7280' }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                    {event.title}
                  </span>
                </div>
              ))}
              {data.metadata.events.length > 3 && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  +{data.metadata.events.length - 3} more events
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Click for detailed view
        </p>
      </div>

      {/* Tooltip Arrow */}
      <div className="absolute -bottom-1 left-4 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-600 transform rotate-45"></div>
    </div>
  );
};

export default TimelineTooltip;
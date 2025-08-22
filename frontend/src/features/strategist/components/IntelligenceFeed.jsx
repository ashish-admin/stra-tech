/**
 * Intelligence Feed - Real-time intelligence updates via SSE
 */

import React, { useState } from 'react';
import { 
  Radio, 
  AlertCircle, 
  Clock, 
  Filter,
  Wifi,
  WifiOff,
  Eye,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export default function IntelligenceFeed({ 
  intelligence = [], 
  isConnected, 
  ward, 
  priority = 'all',
  onPriorityChange 
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState('all');

  const filteredIntelligence = intelligence.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'alerts') return item.isAlert;
    if (filter === 'intelligence') return !item.isAlert;
    return true;
  });

  const alertCount = intelligence.filter(item => item.isAlert).length;
  const intelCount = intelligence.length - alertCount;

  return (
    <div className="bg-white border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium text-gray-900">Intelligence Feed</h3>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 flex items-center gap-2">
            {/* Priority Filter */}
            <select
              value={priority}
              onChange={(e) => onPriorityChange?.(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="all">All Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Only</option>
            </select>

            {/* Type Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="all">All Types</option>
              <option value="alerts">Alerts ({alertCount})</option>
              <option value="intelligence">Intel ({intelCount})</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {filteredIntelligence.length === 0 ? (
            <div className="p-4 text-center">
              <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {intelligence.length === 0 ? 'No intelligence updates' : 'No items match current filter'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Monitoring {ward} for real-time updates
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredIntelligence.map((item, index) => (
                <IntelligenceItem key={`${item.id || index}-${item.timestamp}`} item={item} ward={ward} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Stats */}
      {isExpanded && intelligence.length > 0 && (
        <div className="p-3 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {alertCount} alerts
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {intelCount} intel
              </span>
            </div>
            <span>
              Last update: {intelligence[0]?.timestamp ? 
                new Date(intelligence[0].timestamp).toLocaleTimeString() : 
                'Never'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function IntelligenceItem({ item, ward }) {
  const [showDetails, setShowDetails] = useState(false);

  const isAlert = item.isAlert || item.type === 'alert';
  const isNew = item.timestamp && 
    (Date.now() - new Date(item.timestamp).getTime()) < 5 * 60 * 1000; // 5 minutes

  const itemStyle = isAlert ? 
    'border-l-4 border-l-red-400 bg-red-50' : 
    'border-l-4 border-l-blue-400 bg-blue-50';

  return (
    <div className="p-3 hover:bg-gray-50 transition-colors">
      <div className={`p-3 rounded-r-lg ${itemStyle}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              {isAlert ? (
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              ) : (
                <TrendingUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
              
              <span className="text-xs font-medium text-gray-600 uppercase">
                {isAlert ? 'Alert' : 'Intelligence'}
              </span>
              
              {isNew && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  New
                </span>
              )}
            </div>

            {/* Content */}
            <div className="text-sm text-gray-800 mb-2">
              {item.description || item.content || item.summary || 'No description available'}
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {item.timestamp && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
              )}
              
              {item.severity && (
                <span className={`px-2 py-0.5 rounded font-medium ${
                  item.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                  item.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {item.severity}
                </span>
              )}

              {item.ward && item.ward !== ward && (
                <span className="text-gray-400">
                  from {item.ward}
                </span>
              )}
            </div>

            {/* Expandable Details */}
            {(item.new_posts_count || item.items) && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>
                  {item.new_posts_count ? `${item.new_posts_count} new posts` : 'View details'}
                </span>
                <ArrowRight className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
              </button>
            )}

            {showDetails && item.items && (
              <div className="mt-2 space-y-1">
                {item.items.slice(0, 3).map((subItem, i) => (
                  <div key={i} className="p-2 bg-white border rounded text-xs">
                    <div className="font-medium text-gray-700 mb-1">
                      {subItem.emotion && (
                        <span className="text-gray-500">
                          [{subItem.emotion}] 
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600">
                      {subItem.content?.substring(0, 120)}
                      {subItem.content?.length > 120 && '...'}
                    </div>
                  </div>
                ))}
                {item.items.length > 3 && (
                  <div className="text-xs text-gray-500 pl-2">
                    +{item.items.length - 3} more items
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
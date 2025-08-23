/**
 * Intelligence Feed - Real-time intelligence updates via SSE
 * Enhanced for Phase 3 with advanced filtering, SSE integration, and actionable insights
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Radio, 
  AlertCircle, 
  Clock, 
  Filter,
  Wifi,
  WifiOff,
  Eye,
  TrendingUp,
  ArrowRight,
  Target,
  Users,
  CheckCircle,
  XCircle,
  ExternalLink,
  Activity,
  Bell,
  BellOff,
  Settings,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { useIntelligenceFeed } from '../hooks/useEnhancedSSE';
import { useWard } from '../../../context/WardContext';

const PRIORITY_COLORS = {
  critical: 'bg-red-50 border-red-200 text-red-800',
  high: 'bg-orange-50 border-orange-200 text-orange-800',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  low: 'bg-blue-50 border-blue-200 text-blue-800'
};

const PRIORITY_ICONS = {
  critical: AlertCircle,
  high: AlertCircle,
  medium: Eye,
  low: Activity
};

const ALERT_TYPES = {
  sentiment_shift: { icon: TrendingUp, label: 'Sentiment Shift', color: 'text-purple-600' },
  competitive_threat: { icon: Target, label: 'Competitive Threat', color: 'text-red-600' },
  opportunity: { icon: CheckCircle, label: 'Opportunity', color: 'text-green-600' },
  media_mention: { icon: MessageSquare, label: 'Media Mention', color: 'text-blue-600' },
  public_event: { icon: Users, label: 'Public Event', color: 'text-indigo-600' },
  breaking_news: { icon: Bell, label: 'Breaking News', color: 'text-orange-600' }
};

export default function IntelligenceFeed({ 
  intelligence = [], 
  isConnected, 
  ward, 
  priority = 'all',
  onPriorityChange 
}) {
  const { currentWard } = useWard();
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isLive, setIsLive] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState(new Set());
  const [filters, setFilters] = useState({
    priority: priority,
    type: 'all',
    timeframe: 24
  });

  // Use enhanced SSE hook if currentWard is available
  const sseData = useIntelligenceFeed(currentWard || ward, filters);
  
  // Merge prop data with SSE data
  const allIntelligence = useMemo(() => {
    const propData = intelligence.map(item => ({ ...item, category: 'prop' }));
    const sseIntelligence = sseData.intelligence.map(item => ({ ...item, category: 'intelligence' }));
    const sseAlerts = sseData.alerts.map(item => ({ ...item, category: 'alert' }));
    
    return [...propData, ...sseIntelligence, ...sseAlerts]
      .sort((a, b) => (b.receivedAt || b.timestamp || 0) - (a.receivedAt || a.timestamp || 0));
  }, [intelligence, sseData.intelligence, sseData.alerts]);

  const filteredIntelligence = allIntelligence.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'alerts') return item.isAlert || item.category === 'alert';
    if (filter === 'intelligence') return !item.isAlert && item.category !== 'alert';
    return true;
  }).filter(item => 
    item.category === 'intelligence' || item.category === 'prop' || !acknowledgedAlerts.has(item.id)
  );

  const alertCount = allIntelligence.filter(item => item.isAlert || item.category === 'alert').length;
  const intelCount = allIntelligence.length - alertCount;

  // Handle alert acknowledgment
  const handleAcknowledge = useCallback((alertId) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    if (filterType === 'priority' && onPriorityChange) {
      onPriorityChange(value);
    }
  }, [onPriorityChange]);

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="bg-white border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium text-gray-900">Intelligence Feed</h3>
            <div className="flex items-center gap-1">
              {(isConnected || sseData.intelligence.length > 0) ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">LIVE</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-xs">OFFLINE</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`p-2 rounded-lg transition-colors ${
                isLive ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
              }`}
              title={isLive ? 'Pause live updates' : 'Resume live updates'}
            >
              {isLive ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {isExpanded && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{allIntelligence.length}</div>
              <div className="text-xs text-gray-500">Total Updates</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{sseData.summary?.highPriority || 0}</div>
              <div className="text-xs text-gray-500">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{sseData.summary?.actionable || 0}</div>
              <div className="text-xs text-gray-500">Actionable</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{sseData.summary?.recent || 0}</div>
              <div className="text-xs text-gray-500">Last Hour</div>
            </div>
          </div>
        )}

        {/* Enhanced Filters */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="sentiment_shift">Sentiment Shifts</option>
                <option value="competitive_threat">Competitive Threats</option>
                <option value="opportunity">Opportunities</option>
                <option value="media_mention">Media Mentions</option>
                <option value="public_event">Public Events</option>
                <option value="breaking_news">Breaking News</option>
              </select>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All Items ({allIntelligence.length})</option>
                <option value="alerts">Alerts ({alertCount})</option>
                <option value="intelligence">Intel ({intelCount})</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {!currentWard || currentWard === 'All' ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">Select a Ward</h3>
              <p className="text-gray-500">Choose a specific ward to view intelligence updates</p>
            </div>
          ) : filteredIntelligence.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No Updates Available</h3>
              <p className="text-gray-500">
                {isLive ? 'Waiting for new intelligence updates...' : 'Live updates are paused'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredIntelligence.map((item, index) => (
                <IntelligenceItem 
                  key={`${item.id || index}-${item.timestamp || item.receivedAt}`} 
                  item={item} 
                  ward={currentWard || ward}
                  onAcknowledge={handleAcknowledge}
                  onViewDetails={setSelectedAlert}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {selectedAlert.type && ALERT_TYPES[selectedAlert.type] ? (
                    (() => {
                      const IconComponent = ALERT_TYPES[selectedAlert.type].icon;
                      return <IconComponent className={`h-5 w-5 ${ALERT_TYPES[selectedAlert.type].color}`} />;
                    })()
                  ) : (
                    <Activity className="h-5 w-5 text-gray-600" />
                  )}
                  <h3 className="text-lg font-semibold">
                    {selectedAlert.title || selectedAlert.message || 'Intelligence Update'}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                  <p className="text-gray-700">
                    {selectedAlert.content || selectedAlert.description || selectedAlert.summary || 'No additional details available'}
                  </p>
                </div>
                
                {selectedAlert.actionableItems && selectedAlert.actionableItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Recommended Actions</h4>
                    <div className="space-y-2">
                      {selectedAlert.actionableItems.map((action, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg">
                          <div className="font-medium text-blue-900">{action.action || action}</div>
                          {action.timeline && (
                            <div className="text-sm text-blue-700 mt-1">
                              Timeline: {action.timeline}
                            </div>
                          )}
                          {action.details && (
                            <div className="text-sm text-blue-600 mt-1">
                              {action.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4 text-sm text-gray-500 space-y-1">
                  <div>Priority: <span className="capitalize">{selectedAlert.priority || 'medium'}</span></div>
                  <div>Type: {selectedAlert.type && ALERT_TYPES[selectedAlert.type] ? ALERT_TYPES[selectedAlert.type].label : 'Update'}</div>
                  <div>Received: {formatTimeAgo(selectedAlert.receivedAt || selectedAlert.timestamp)}</div>
                  {selectedAlert.source && (
                    <div>Source: {selectedAlert.source}</div>
                  )}
                  {selectedAlert.confidence_score && (
                    <div>Confidence: {Math.round(selectedAlert.confidence_score * 100)}%</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      {isExpanded && allIntelligence.length > 0 && (
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
              Last update: {allIntelligence[0]?.timestamp || allIntelligence[0]?.receivedAt ? 
                formatTimeAgo(allIntelligence[0]?.timestamp || allIntelligence[0]?.receivedAt) : 
                'Never'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function IntelligenceItem({ item, ward, onAcknowledge, onViewDetails }) {
  const [showDetails, setShowDetails] = useState(false);

  const isAlert = item.isAlert || item.category === 'alert';
  const timestamp = item.receivedAt || item.timestamp;
  const isNew = timestamp && 
    (Date.now() - (typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp)) < 5 * 60 * 1000; // 5 minutes

  const priorityClass = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;
  const PriorityIcon = PRIORITY_ICONS[item.priority] || Activity;
  const typeInfo = ALERT_TYPES[item.type] || { icon: Activity, label: 'Update', color: 'text-gray-600' };
  const TypeIcon = typeInfo.icon;

  const formatTimeAgo = (ts) => {
    if (!ts) return 'Unknown time';
    const date = typeof ts === 'string' ? new Date(ts) : new Date(ts);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="hover:bg-gray-50 transition-colors border-b last:border-b-0">
      <div className={`p-4 border-l-4 ${
        item.priority === 'critical' ? 'border-l-red-400 bg-red-50' :
        item.priority === 'high' ? 'border-l-orange-400 bg-orange-50' :
        item.priority === 'medium' ? 'border-l-yellow-400 bg-yellow-50' :
        'border-l-blue-400 bg-blue-50'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-1">
                <PriorityIcon className="h-4 w-4" />
                <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium truncate">
                  {item.title || item.message || item.description || 'Intelligence Update'}
                </h4>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeAgo(timestamp)}</span>
                  {isNew && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full ml-2">
                      New
                    </span>
                  )}
                </div>
              </div>
              
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {item.content || item.summary || 'No details available'}
              </p>
              
              {item.source && (
                <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
                  <ExternalLink className="h-3 w-3" />
                  <span>Source: {item.source}</span>
                  {item.source_reliability && (
                    <span className="ml-1">
                      (Reliability: {Math.round(item.source_reliability * 100)}%)
                    </span>
                  )}
                </div>
              )}
              
              {(item.actionableItems?.length > 0 || item.new_posts_count) && (
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {item.actionableItems?.length > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-blue-600">
                        <Target className="h-3 w-3" />
                        <span>{item.actionableItems.length} actionable item(s)</span>
                      </div>
                    )}
                    {item.new_posts_count && (
                      <div className="flex items-center space-x-1 text-xs text-green-600">
                        <MessageSquare className="h-3 w-3" />
                        <span>{item.new_posts_count} new posts</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onViewDetails?.(item)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View Details
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Expandable sub-items */}
              {item.items && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>{item.items.length} related items</span>
                    <ArrowRight className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {showDetails && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {item.items.slice(0, 5).map((subItem, i) => (
                        <div key={i} className="p-2 bg-white border rounded text-xs">
                          {subItem.emotion && (
                            <span className="text-purple-600 font-medium">
                              [{subItem.emotion}] 
                            </span>
                          )}
                          <div className="text-gray-600 mt-1">
                            {subItem.content?.substring(0, 150)}
                            {subItem.content?.length > 150 && '...'}
                          </div>
                        </div>
                      ))}
                      {item.items.length > 5 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{item.items.length - 5} more items
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {isAlert && item.id && onAcknowledge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(item.id);
              }}
              className="ml-2 p-1 text-gray-400 hover:text-green-600 transition-colors"
              title="Acknowledge alert"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
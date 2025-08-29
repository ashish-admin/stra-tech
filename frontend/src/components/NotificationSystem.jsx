/**
 * NotificationSystem - Real-time notification management for LokDarpan dashboard
 * 
 * Features:
 * - Real-time SSE-based notifications for political events
 * - Priority-based notification filtering and display
 * - Toast notifications with action buttons
 * - Notification history and management
 * - Sound alerts and browser notifications for critical events
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Bell, BellRing, AlertTriangle, Info, CheckCircle2, AlertCircle, Volume2, VolumeX, Settings, History, Filter, Trash2 } from 'lucide-react';
import { useEnhancedSSE } from '../features/strategist/hooks/useEnhancedSSE';
import { SSEErrorBoundary } from '../shared/components/ui/EnhancedErrorBoundaries';

const NotificationSystem = ({ 
  selectedWard, 
  isVisible = true, 
  maxNotifications = 50,
  enableSound = true,
  enableBrowserNotifications = true 
}) => {
  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(enableBrowserNotifications);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'critical', 'high', 'medium', 'low'

  // Audio references for notification sounds
  const audioRef = useRef({
    critical: new Audio('/sounds/critical-alert.mp3'),
    high: new Audio('/sounds/high-priority.mp3'),
    medium: new Audio('/sounds/medium-alert.mp3'),
    info: new Audio('/sounds/info-notification.mp3')
  });

  // SSE connection for real-time notifications
  const {
    connectionState,
    isConnected,
    analysisData,
    intelligence,
    alerts
  } = useEnhancedSSE(selectedWard, {
    mode: 'feed',
    priority: 'all'
  });

  // Request browser notification permission on mount
  useEffect(() => {
    if (browserNotificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [browserNotificationsEnabled]);

  // Process new intelligence updates into notifications
  useEffect(() => {
    if (intelligence && intelligence.length > 0) {
      const newNotifications = intelligence.map(item => ({
        id: `intel-${item.id || Date.now()}-${Math.random()}`,
        type: 'intelligence',
        priority: calculatePriority(item),
        title: 'New Intelligence Update',
        message: truncateMessage(item.content || 'New political intelligence available'),
        timestamp: new Date(item.receivedAt || Date.now()),
        data: item,
        isRead: false,
        ward: selectedWard
      }));

      addNotifications(newNotifications);
    }
  }, [intelligence, selectedWard]);

  // Process new alerts into notifications
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const newNotifications = alerts.map(alert => ({
        id: `alert-${alert.id || Date.now()}-${Math.random()}`,
        type: 'alert',
        priority: alert.urgency || alert.priority || 'medium',
        title: getAlertTitle(alert),
        message: truncateMessage(alert.description || alert.message || 'New alert'),
        timestamp: new Date(alert.receivedAt || Date.now()),
        data: alert,
        isRead: false,
        ward: selectedWard,
        actions: alert.recommendedActions || []
      }));

      addNotifications(newNotifications);
    }
  }, [alerts, selectedWard]);

  // Add notifications with deduplication
  const addNotifications = useCallback((newNotifications) => {
    setNotifications(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const uniqueNotifications = newNotifications.filter(n => !existingIds.has(n.id));
      
      if (uniqueNotifications.length === 0) return prev;

      // Process each new notification
      uniqueNotifications.forEach(notification => {
        // Play sound if enabled
        if (soundEnabled) {
          playNotificationSound(notification.priority);
        }

        // Show browser notification for high priority items
        if (browserNotificationsEnabled && ['critical', 'high'].includes(notification.priority)) {
          showBrowserNotification(notification);
        }
      });

      // Combine and limit total notifications
      const combined = [...uniqueNotifications, ...prev].slice(0, maxNotifications);
      
      return combined.sort((a, b) => b.timestamp - a.timestamp);
    });
  }, [soundEnabled, browserNotificationsEnabled, maxNotifications]);

  // Calculate notification priority based on content
  const calculatePriority = (item) => {
    const content = (item.content || '').toLowerCase();
    const emotion = (item.emotion || '').toLowerCase();
    
    if (content.includes('urgent') || content.includes('breaking') || emotion === 'anger') {
      return 'critical';
    }
    if (content.includes('important') || emotion === 'fear') {
      return 'high';
    }
    if (emotion === 'hopeful' || emotion === 'optimistic') {
      return 'low';
    }
    return 'medium';
  };

  // Get alert title based on type
  const getAlertTitle = (alert) => {
    const type = alert.type || alert.alert_type;
    const titles = {
      'sentiment_shift': 'Sentiment Change Detected',
      'competitive_threat': 'Competitive Threat Alert',
      'opportunity': 'Strategic Opportunity',
      'crisis': 'Crisis Alert',
      'media_mention': 'Media Mention',
      'social_activity': 'Social Media Activity'
    };
    
    return titles[type] || 'Political Alert';
  };

  // Truncate message for display
  const truncateMessage = (message, maxLength = 120) => {
    if (!message) return '';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  // Play notification sound
  const playNotificationSound = (priority) => {
    try {
      const audio = audioRef.current[priority] || audioRef.current.info;
      audio.currentTime = 0;
      audio.play().catch(console.warn);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  // Show browser notification
  const showBrowserNotification = (notification) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.priority === 'critical'
    });

    // Auto-close after 5 seconds for non-critical notifications
    if (notification.priority !== 'critical') {
      setTimeout(() => browserNotification.close(), 5000);
    }

    browserNotification.onclick = () => {
      window.focus();
      markAsRead(notification.id);
      browserNotification.close();
    };
  };

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  // Dismiss notification
  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Get notification icon and colors
  const getNotificationDisplay = (notification) => {
    const displays = {
      critical: { icon: AlertTriangle, bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-800', iconColor: 'text-red-500' },
      high: { icon: AlertCircle, bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-800', iconColor: 'text-orange-500' },
      medium: { icon: Info, bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800', iconColor: 'text-blue-500' },
      low: { icon: CheckCircle2, bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800', iconColor: 'text-green-500' },
      info: { icon: Info, bgColor: 'bg-gray-50', borderColor: 'border-gray-200', textColor: 'text-gray-800', iconColor: 'text-gray-500' }
    };
    
    return displays[notification.priority] || displays.info;
  };

  // Filter notifications based on priority
  const filteredNotifications = notifications.filter(notification => {
    if (priorityFilter === 'all') return true;
    return notification.priority === priorityFilter;
  });

  // Get unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isVisible) return null;

  return (
    <SSEErrorBoundary
      componentName="Real-time Notifications"
      enableRetry={true}
      maxRetries={5}
      retryDelay={3000}
    >
      <div className="fixed top-4 right-4 z-50 max-w-md">
      {/* Notification Bell */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-2">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              {isConnected ? (
                <BellRing className="h-5 w-5 text-blue-500" />
              ) : (
                <Bell className="h-5 w-5 text-gray-400" />
              )}
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-gray-700">
              Notifications
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
              title={soundEnabled ? 'Disable Sound' : 'Enable Sound'}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            
            {/* History toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
              title="Show History"
            >
              <History size={14} />
            </button>
            
            {/* Settings toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
              title="Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Priority Filter
                </label>
                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical Only</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">
                  Browser Notifications
                </label>
                <input
                  type="checkbox"
                  checked={browserNotificationsEnabled}
                  onChange={(e) => setBrowserNotificationsEnabled(e.target.checked)}
                  className="rounded"
                />
              </div>

              <button
                onClick={clearAllNotifications}
                className="w-full flex items-center justify-center space-x-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <Trash2 size={12} />
                <span>Clear All</span>
              </button>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {selectedWard || 'No ward selected'}
            </span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification List */}
      {(showHistory || filteredNotifications.filter(n => !n.isRead).length > 0) && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {showHistory ? 'All Notifications' : 'Recent Alerts'}
            </span>
            <span className="text-xs text-gray-500">
              {filteredNotifications.length} total
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredNotifications.slice(0, showHistory ? undefined : 5).map(notification => {
              const display = getNotificationDisplay(notification);
              const Icon = display.icon;
              
              return (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${display.iconColor}`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      
                      {/* Action buttons for actionable notifications */}
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="mt-2 flex items-center space-x-2">
                          {notification.actions.slice(0, 2).map((action, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                markAsRead(notification.id);
                                // Handle action click
                                console.log('Action clicked:', action);
                              }}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                            >
                              {action.action || action.label}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredNotifications.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
    </SSEErrorBoundary>
  );
};

export default NotificationSystem;
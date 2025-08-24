/**
 * LokDarpan Alert and Notification System
 * Real-time performance and quality alerts with configurable notification channels
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, 
  BellRing, 
  X, 
  AlertTriangle, 
  AlertCircle,
  Info,
  CheckCircle,
  Volume2,
  VolumeX,
  Settings,
  Filter,
  Clock,
  Zap,
  Users,
  Activity,
  Gauge,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw
} from 'lucide-react';

// Import monitoring systems
import performanceMonitor from '../../monitoring/PerformanceMonitor';
import qualityGates from '../../monitoring/QualityGates';
import realUserMonitoring from '../../monitoring/RealUserMonitoring';

const AlertNotificationSystem = ({ 
  position = 'top-right',
  maxVisible = 5,
  autoHideDuration = 8000,
  enableSound = false,
  enableBrowserNotifications = false,
  enablePersistence = true,
  filterSeverity = ['high', 'medium', 'low']
}) => {
  const [alerts, setAlerts] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [filters, setFilters] = useState(filterSeverity);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const audioRef = useRef();
  const permissionRef = useRef(enableBrowserNotifications);

  // Initialize audio for notifications
  useEffect(() => {
    if (soundEnabled) {
      audioRef.current = new Audio('/notification.wav'); // You'd need to add this sound file
      audioRef.current.volume = 0.5;
    }
  }, [soundEnabled]);

  // Request browser notification permission
  useEffect(() => {
    if (enableBrowserNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setBrowserNotificationsEnabled(permission === 'granted');
          permissionRef.current = permission === 'granted';
        });
      } else {
        setBrowserNotificationsEnabled(Notification.permission === 'granted');
        permissionRef.current = Notification.permission === 'granted';
      }
    }
  }, [enableBrowserNotifications]);

  // Load persisted alerts
  useEffect(() => {
    if (enablePersistence) {
      try {
        const savedAlerts = localStorage.getItem('lokdarpan_alerts');
        if (savedAlerts) {
          const parsed = JSON.parse(savedAlerts);
          const validAlerts = parsed.filter(alert => 
            Date.now() - alert.timestamp < 24 * 60 * 60 * 1000 // 24 hours
          );
          setAlerts(validAlerts);
          setUnreadCount(validAlerts.filter(alert => !alert.read).length);
        }
      } catch (error) {
        console.error('[LokDarpan] Failed to load persisted alerts:', error);
      }
    }
  }, [enablePersistence]);

  // Save alerts to localStorage
  useEffect(() => {
    if (enablePersistence && alerts.length > 0) {
      try {
        localStorage.setItem('lokdarpan_alerts', JSON.stringify(alerts));
      } catch (error) {
        console.error('[LokDarpan] Failed to persist alerts:', error);
      }
    }
  }, [alerts, enablePersistence]);

  // Listen for performance alerts
  useEffect(() => {
    const handlePerformanceAlert = (event) => {
      const alertData = event.detail;
      addAlert({
        id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'performance',
        severity: alertData.severity || 'medium',
        title: 'Performance Alert',
        message: alertData.message,
        icon: Zap,
        source: 'PerformanceMonitor',
        timestamp: Date.now(),
        data: alertData
      });
    };

    const handleQualityIssue = (event) => {
      const issueData = event.detail;
      addAlert({
        id: `quality_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'quality',
        severity: issueData.severity || 'medium',
        title: 'Quality Issue',
        message: issueData.message,
        icon: Gauge,
        source: 'QualityGates',
        timestamp: Date.now(),
        data: issueData
      });
    };

    const handleQualityGate = (event) => {
      const reportData = event.detail;
      if (!reportData.passed) {
        addAlert({
          id: `qg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'quality',
          severity: reportData.score < 50 ? 'high' : 'medium',
          title: 'Quality Gate Failed',
          message: `Quality score: ${reportData.score}%`,
          icon: AlertTriangle,
          source: 'QualityGates',
          timestamp: Date.now(),
          data: reportData
        });
      }
    };

    const handleRumError = (event) => {
      const errorData = event.detail;
      addAlert({
        id: `rum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'error',
        severity: 'high',
        title: 'User Error Detected',
        message: errorData.message || 'Unknown error occurred',
        icon: AlertCircle,
        source: 'RealUserMonitoring',
        timestamp: Date.now(),
        data: errorData
      });
    };

    // Register event listeners
    window.addEventListener('lokdarpan:performance-alert', handlePerformanceAlert);
    window.addEventListener('lokdarpan:quality-issue', handleQualityIssue);
    window.addEventListener('lokdarpan:quality-gate', handleQualityGate);
    window.addEventListener('lokdarpan:rum-error', handleRumError);

    return () => {
      window.removeEventListener('lokdarpan:performance-alert', handlePerformanceAlert);
      window.removeEventListener('lokdarpan:quality-issue', handleQualityIssue);
      window.removeEventListener('lokdarpan:quality-gate', handleQualityGate);
      window.removeEventListener('lokdarpan:rum-error', handleRumError);
    };
  }, []);

  // Auto-hide alerts
  useEffect(() => {
    const timers = alerts
      .filter(alert => !alert.persistent && alert.visible !== false)
      .map(alert => {
        if (!alert.hideTimer) {
          const timer = setTimeout(() => {
            hideAlert(alert.id);
          }, autoHideDuration);

          // Update alert with timer reference
          setAlerts(prev => prev.map(a => 
            a.id === alert.id ? { ...a, hideTimer: timer } : a
          ));

          return timer;
        }
        return null;
      });

    return () => {
      timers.forEach(timer => timer && clearTimeout(timer));
    };
  }, [alerts, autoHideDuration]);

  // Add new alert
  const addAlert = (alertData) => {
    const newAlert = {
      ...alertData,
      read: false,
      visible: true,
      persistent: alertData.severity === 'high' // High severity alerts are persistent
    };

    setAlerts(prev => {
      const updated = [newAlert, ...prev];
      // Limit total alerts to prevent memory issues
      return updated.slice(0, 100);
    });

    setUnreadCount(prev => prev + 1);

    // Play sound notification
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore audio play errors
      });
    }

    // Show browser notification
    if (browserNotificationsEnabled && permissionRef.current) {
      try {
        new Notification(alertData.title, {
          body: alertData.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: alertData.type,
          requireInteraction: alertData.severity === 'high'
        });
      } catch (error) {
        console.error('[LokDarpan] Failed to show browser notification:', error);
      }
    }
  };

  // Hide alert
  const hideAlert = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, visible: false } : alert
    ));
  };

  // Dismiss alert
  const dismissAlert = (alertId) => {
    setAlerts(prev => {
      const alert = prev.find(a => a.id === alertId);
      if (alert && alert.hideTimer) {
        clearTimeout(alert.hideTimer);
      }
      return prev.filter(alert => alert.id !== alertId);
    });
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark alert as read
  const markAsRead = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Clear all alerts
  const clearAllAlerts = () => {
    alerts.forEach(alert => {
      if (alert.hideTimer) {
        clearTimeout(alert.hideTimer);
      }
    });
    setAlerts([]);
    setUnreadCount(0);
  };

  // Mark all as read
  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
    setUnreadCount(0);
  };

  // Filtered alerts based on settings
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => 
      filters.includes(alert.severity) && alert.visible !== false
    );
  }, [alerts, filters]);

  // Visible alerts (limited by maxVisible)
  const visibleAlerts = useMemo(() => {
    return filteredAlerts.slice(0, maxVisible);
  }, [filteredAlerts, maxVisible]);

  // Get position classes
  const getPositionClasses = () => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
    };
    return positions[position] || positions['top-right'];
  };

  // Get severity styling
  const getSeverityStyles = (severity) => {
    const styles = {
      high: {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        icon: 'text-red-500',
        button: 'text-red-600 hover:text-red-800'
      },
      medium: {
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-500',
        button: 'text-yellow-600 hover:text-yellow-800'
      },
      low: {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-500',
        button: 'text-blue-600 hover:text-blue-800'
      },
      info: {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-800',
        icon: 'text-gray-500',
        button: 'text-gray-600 hover:text-gray-800'
      }
    };
    return styles[severity] || styles.info;
  };

  // Test alert function for demonstration
  const addTestAlert = (severity = 'medium') => {
    const testMessages = {
      high: 'Critical performance degradation detected in Dashboard component',
      medium: 'API response time exceeded threshold (847ms)',
      low: 'Memory usage approaching warning level (42MB)',
      info: 'Quality gate completed successfully'
    };

    addAlert({
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'test',
      severity,
      title: 'Test Alert',
      message: testMessages[severity],
      icon: severity === 'high' ? AlertTriangle : 
            severity === 'medium' ? AlertCircle :
            severity === 'low' ? Info : CheckCircle,
      source: 'TestSystem',
      timestamp: Date.now(),
      data: { test: true }
    });
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
      >
        <div className="relative">
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-sm w-full`}>
      {/* Alert Container */}
      <div className="space-y-2">
        {visibleAlerts.map((alert, index) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            styles={getSeverityStyles(alert.severity)}
            onDismiss={() => dismissAlert(alert.id)}
            onMarkRead={() => markAsRead(alert.id)}
            onHide={() => hideAlert(alert.id)}
            index={index}
          />
        ))}
      </div>

      {/* Alert Center Button (when alerts are visible) */}
      {alerts.length > 0 && (
        <div className="mt-4 flex items-center justify-between bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Bell className="w-4 h-4 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
                )}
              </div>
              <span className="text-sm text-gray-600">
                {alerts.length} alerts
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-gray-400 hover:text-gray-600"
              title={soundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-gray-600"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={clearAllAlerts}
              className="text-gray-400 hover:text-red-600"
              title="Clear all alerts"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Alert Filters</h3>
              <div className="space-y-2">
                {['high', 'medium', 'low'].map(severity => (
                  <label key={severity} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.includes(severity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => [...prev, severity]);
                        } else {
                          setFilters(prev => prev.filter(f => f !== severity));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 capitalize">{severity}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notifications</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Sound notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={browserNotificationsEnabled}
                    onChange={(e) => {
                      if (e.target.checked && 'Notification' in window) {
                        Notification.requestPermission().then(permission => {
                          setBrowserNotificationsEnabled(permission === 'granted');
                        });
                      } else {
                        setBrowserNotificationsEnabled(false);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Browser notifications</span>
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => addTestAlert('high')}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Test High
              </button>
              <button
                onClick={() => addTestAlert('medium')}
                className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
              >
                Test Medium
              </button>
              <button
                onClick={() => addTestAlert('low')}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Test Low
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Alert Card Component
const AlertCard = ({ alert, styles, onDismiss, onMarkRead, onHide, index }) => {
  const IconComponent = alert.icon;
  const timeAgo = useMemo(() => {
    const diff = Date.now() - alert.timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }, [alert.timestamp]);

  return (
    <div
      className={`${styles.bg} border rounded-lg shadow-sm p-4 transition-all duration-200 transform hover:scale-105`}
      style={{ 
        zIndex: 1000 - index,
        animationDelay: `${index * 100}ms`
      }}
    >
      <div className="flex items-start space-x-3">
        <div className={`${styles.icon} flex-shrink-0`}>
          <IconComponent className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`text-sm font-semibold ${styles.text}`}>
              {alert.title}
            </h4>
            <button
              onClick={onDismiss}
              className={`${styles.button} hover:bg-gray-100 rounded-full p-1`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className={`text-sm ${styles.text} opacity-90 mb-2`}>
            {alert.message}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs opacity-75">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{timeAgo}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Activity className="w-3 h-3" />
                <span>{alert.source}</span>
              </div>
            </div>
            
            {!alert.read && (
              <button
                onClick={onMarkRead}
                className={`text-xs ${styles.button} hover:underline`}
              >
                Mark read
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress bar for auto-hide */}
      {!alert.persistent && (
        <div className="mt-3 bg-gray-200 rounded-full h-1 overflow-hidden">
          <div 
            className="h-full bg-gray-400 rounded-full transition-all duration-100 ease-linear"
            style={{
              width: '100%',
              animation: `shrink 8s linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AlertNotificationSystem;

// Add CSS for the shrink animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`;
document.head.appendChild(style);
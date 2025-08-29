/**
 * SSE Health Monitor - Campaign-Grade Connection Health Dashboard
 * 
 * Provides comprehensive health monitoring and proactive maintenance visibility for:
 * - Real-time connection health status and metrics
 * - Proactive maintenance notifications and recommendations
 * - Campaign session monitoring with performance insights
 * - Integration with Agent Alpha's AsyncServiceCoordinator patterns
 * - Connection recovery status and fallback mode indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Zap,
  Shield,
  Settings,
  RefreshCw,
  Radio,
  Monitor,
  BarChart3,
  AlertCircle,
  Info
} from 'lucide-react';

const SSEHealthMonitor = ({ 
  className = '',
  size = 'medium',
  showDetails = true,
  showMetrics = true,
  campaignMode = false,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [healthData, setHealthData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [connectionHistory, setConnectionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Health monitoring state
  const [monitoringActive, setMonitoringActive] = useState(autoRefresh);
  const [refreshTimer, setRefreshTimer] = useState(null);

  // Initialize health monitoring
  useEffect(() => {
    console.log('🩺 SSE Health Monitor initializing');
    
    // Setup event listeners for health events
    const handleHealthReport = (event) => {
      const report = event.detail;
      setHealthData(report);
      setLastUpdate(Date.now());
      setIsLoading(false);
      
      // Update connection history
      setConnectionHistory(prev => [
        ...prev.slice(-20), // Keep last 20 data points
        {
          timestamp: report.timestamp,
          healthyConnections: report.healthyConnections,
          failedConnections: report.failedConnections,
          totalConnections: report.totalConnections
        }
      ]);
    };

    const handleHealthAlert = (event) => {
      const alert = event.detail;
      setActiveAlerts(prev => [
        {
          ...alert,
          id: `${alert.type}_${Date.now()}`,
          timestamp: alert.timestamp || Date.now()
        },
        ...prev.slice(0, 9) // Keep max 10 alerts
      ]);
    };

    const handleMetricsUpdate = (event) => {
      const metricsData = event.detail;
      setMetrics(metricsData);
    };

    // Register event listeners
    document.addEventListener('sse_manager_health_report', handleHealthReport);
    document.addEventListener('sse_manager_health_alert', handleHealthAlert);
    document.addEventListener('async_sse_performance_metrics', handleMetricsUpdate);

    // Start auto-refresh if enabled
    if (autoRefresh) {
      startAutoRefresh();
    }

    // Initial health check
    performHealthCheck();

    return () => {
      document.removeEventListener('sse_manager_health_report', handleHealthReport);
      document.removeEventListener('sse_manager_health_alert', handleHealthAlert);
      document.removeEventListener('async_sse_performance_metrics', handleMetricsUpdate);
      
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Auto-refresh management
  const startAutoRefresh = useCallback(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    const timer = setInterval(() => {
      performHealthCheck();
    }, refreshInterval);

    setRefreshTimer(timer);
    setMonitoringActive(true);
  }, [refreshInterval, refreshTimer]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      setRefreshTimer(null);
    }
    setMonitoringActive(false);
  }, [refreshTimer]);

  // Manual health check
  const performHealthCheck = useCallback(async () => {
    try {
      // Trigger health check through AsyncSSEIntegration
      const event = new CustomEvent('request_health_check', {
        detail: { timestamp: Date.now() }
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to perform health check:', error);
    }
  }, []);

  // Get overall health status
  const getOverallHealthStatus = () => {
    if (!healthData) return { status: 'unknown', color: 'gray', description: 'Checking health...' };
    
    const { healthyConnections, failedConnections, totalConnections } = healthData;
    
    if (totalConnections === 0) {
      return { status: 'inactive', color: 'gray', description: 'No active connections' };
    }
    
    const healthRatio = healthyConnections / totalConnections;
    
    if (healthRatio === 1) {
      return { status: 'excellent', color: 'green', description: 'All connections healthy' };
    } else if (healthRatio >= 0.8) {
      return { status: 'good', color: 'green', description: 'Most connections healthy' };
    } else if (healthRatio >= 0.6) {
      return { status: 'fair', color: 'yellow', description: 'Some connection issues' };
    } else if (healthRatio > 0) {
      return { status: 'poor', color: 'orange', description: 'Multiple connection failures' };
    } else {
      return { status: 'critical', color: 'red', description: 'All connections failed' };
    }
  };

  // Get alert priority counts
  const getAlertCounts = () => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    
    activeAlerts.forEach(alert => {
      const priority = alert.severity || 'medium';
      if (counts[priority] !== undefined) {
        counts[priority]++;
      }
    });
    
    return counts;
  };

  // Format duration
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Size configuration
  const getSizeConfig = () => {
    const configs = {
      small: {
        containerClass: 'p-3',
        titleSize: 'text-base',
        textSize: 'text-sm',
        iconSize: 14
      },
      medium: {
        containerClass: 'p-4',
        titleSize: 'text-lg',
        textSize: 'text-sm',
        iconSize: 16
      },
      large: {
        containerClass: 'p-6',
        titleSize: 'text-xl',
        textSize: 'text-base',
        iconSize: 20
      }
    };
    
    return configs[size] || configs.medium;
  };

  const sizeConfig = getSizeConfig();
  const overallHealth = getOverallHealthStatus();
  const alertCounts = getAlertCounts();
  const HealthIcon = overallHealth.status === 'critical' || overallHealth.status === 'poor' ? WifiOff : 
                    overallHealth.status === 'inactive' ? Radio : Wifi;

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg ${sizeConfig.containerClass} ${className}`}>
        <div className="flex items-center justify-center">
          <Activity className="animate-spin mr-2" size={sizeConfig.iconSize} />
          <span className={sizeConfig.textSize}>Checking connection health...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${sizeConfig.containerClass} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <HealthIcon 
              size={sizeConfig.iconSize + 4} 
              className={`text-${overallHealth.color}-500`} 
            />
            <h3 className={`font-semibold text-gray-900 ${sizeConfig.titleSize}`}>
              Connection Health
            </h3>
          </div>
          
          {campaignMode && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              Campaign
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={monitoringActive ? stopAutoRefresh : startAutoRefresh}
            className={`p-2 rounded-lg transition-colors ${
              monitoringActive 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={monitoringActive ? 'Stop monitoring' : 'Start monitoring'}
          >
            <Monitor size={sizeConfig.iconSize} />
          </button>
          
          <button
            onClick={performHealthCheck}
            className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
            title="Refresh health data"
          >
            <RefreshCw size={sizeConfig.iconSize} />
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`p-3 bg-${overallHealth.color}-50 border border-${overallHealth.color}-200 rounded-lg mb-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full bg-${overallHealth.color}-500`} />
            <span className={`font-medium text-${overallHealth.color}-800 ${sizeConfig.textSize}`}>
              {overallHealth.status.charAt(0).toUpperCase() + overallHealth.status.slice(1)}
            </span>
          </div>
          
          <span className={`text-${overallHealth.color}-700 ${sizeConfig.textSize}`}>
            {overallHealth.description}
          </span>
        </div>
      </div>

      {/* Connection Summary */}
      {healthData && showDetails && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">
              {healthData.totalConnections}
            </div>
            <div className={`text-gray-600 ${sizeConfig.textSize}`}>
              Total
            </div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {healthData.healthyConnections}
            </div>
            <div className={`text-gray-600 ${sizeConfig.textSize}`}>
              Healthy
            </div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">
              {healthData.failedConnections}
            </div>
            <div className={`text-gray-600 ${sizeConfig.textSize}`}>
              Failed
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {metrics && showMetrics && (
        <div className="mb-4">
          <h4 className={`font-medium text-gray-900 mb-2 ${sizeConfig.textSize}`}>
            Performance Metrics
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <TrendingUp size={12} className="text-blue-500" />
                <span className="text-xs text-gray-700">Operations</span>
              </div>
              <span className="text-xs font-medium">
                {metrics.operationsCompleted}/{metrics.operationsStarted}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <Clock size={12} className="text-orange-500" />
                <span className="text-xs text-gray-700">Avg Time</span>
              </div>
              <span className="text-xs font-medium">
                {Math.round(metrics.averageOperationTime)}ms
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-medium text-gray-900 ${sizeConfig.textSize}`}>
              Active Alerts
            </h4>
            
            <div className="flex items-center space-x-2">
              {alertCounts.critical > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                  {alertCounts.critical} Critical
                </span>
              )}
              {alertCounts.high > 0 && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                  {alertCounts.high} High
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {activeAlerts.slice(0, 5).map((alert) => {
              const AlertIcon = alert.severity === 'critical' ? AlertCircle :
                             alert.severity === 'high' ? AlertTriangle :
                             alert.severity === 'medium' ? Info : CheckCircle2;
              
              const alertColor = alert.severity === 'critical' ? 'red' :
                               alert.severity === 'high' ? 'orange' :
                               alert.severity === 'medium' ? 'yellow' : 'blue';
              
              return (
                <div 
                  key={alert.id}
                  className={`p-2 bg-${alertColor}-50 border border-${alertColor}-200 rounded text-xs`}
                >
                  <div className="flex items-center space-x-2">
                    <AlertIcon size={12} className={`text-${alertColor}-600`} />
                    <span className={`font-medium text-${alertColor}-800`}>
                      {alert.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-gray-500">
                      {formatDuration(Date.now() - alert.timestamp)} ago
                    </span>
                  </div>
                  {alert.message && (
                    <div className={`mt-1 text-${alertColor}-700`}>
                      {alert.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connection History Chart */}
      {connectionHistory.length > 0 && showDetails && (
        <div className="mb-4">
          <h4 className={`font-medium text-gray-900 mb-2 ${sizeConfig.textSize}`}>
            Connection Trend
          </h4>
          
          <div className="h-16 bg-gray-50 rounded-lg p-2 relative overflow-hidden">
            <div className="flex items-end justify-between h-full">
              {connectionHistory.slice(-10).map((point, index) => {
                const height = point.totalConnections > 0 
                  ? Math.max(10, (point.healthyConnections / point.totalConnections) * 100) 
                  : 10;
                
                return (
                  <div
                    key={index}
                    className={`bg-${height >= 80 ? 'green' : height >= 60 ? 'yellow' : 'red'}-400 w-2 rounded-t`}
                    style={{ height: `${Math.min(height, 100)}%` }}
                    title={`${point.healthyConnections}/${point.totalConnections} healthy`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${monitoringActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className={`text-gray-600 ${sizeConfig.textSize}`}>
            {monitoringActive ? 'Monitoring active' : 'Monitoring paused'}
          </span>
        </div>
        
        {lastUpdate && (
          <span className={`text-gray-500 text-xs`}>
            Updated {formatDuration(Date.now() - lastUpdate)} ago
          </span>
        )}
      </div>
    </div>
  );
};

export default SSEHealthMonitor;
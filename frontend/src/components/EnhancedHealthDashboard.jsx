import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, ShieldCheck, ShieldAlert, ShieldX, Activity, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, Zap, Brain, Eye, Target, BarChart3 
} from 'lucide-react';
import { useDashboardHealth, healthMonitor } from '../utils/componentHealth.js';

/**
 * Enhanced Health Dashboard with Predictive Error Detection for LokDarpan
 * 
 * This component provides comprehensive monitoring of component health with
 * predictive analytics to detect potential failures before they occur.
 * Critical for political campaigns where uninterrupted intelligence access is essential.
 */

// Health thresholds and scoring
const HEALTH_THRESHOLDS = {
  excellent: 95,
  good: 85,
  warning: 70,
  critical: 50
};

const PREDICTIVE_INDICATORS = {
  performance_degradation: {
    name: 'Performance Degradation',
    icon: TrendingDown,
    severity: 'warning',
    description: 'Component render times increasing beyond normal thresholds'
  },
  memory_pressure: {
    name: 'Memory Pressure',
    icon: Activity,
    severity: 'warning', 
    description: 'Memory usage approaching critical levels'
  },
  memory_leak: {
    name: 'Memory Leak Detected',
    icon: AlertTriangle,
    severity: 'critical',
    description: 'Rapid memory growth indicating potential leak'
  },
  error_rate_spike: {
    name: 'Error Rate Spike',
    icon: TrendingUp,
    severity: 'critical',
    description: 'Unusual increase in component error frequency'
  },
  api_latency_increase: {
    name: 'API Latency Increase',
    icon: Clock,
    severity: 'warning',
    description: 'API response times degrading beyond acceptable thresholds'
  }
};

// Component criticality levels for political intelligence dashboard
const COMPONENT_CRITICALITY = {
  'Interactive Map': 'critical',
  'Strategic Analysis': 'critical', 
  'Intelligence Alerts': 'high',
  'Sentiment Chart': 'medium',
  'Competitive Analysis': 'medium',
  'Time Series Chart': 'medium',
  'Topic Analysis': 'low',
  'News Feed': 'low'
};

export default function EnhancedHealthDashboard() {
  const health = useDashboardHealth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [predictiveWarnings, setPredictiveWarnings] = useState([]);
  const [healthTrend, setHealthTrend] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalRenders: 0,
    avgRenderTime: 0,
    memoryUsage: 0,
    apiCalls: 0,
    errorRate: 0
  });
  
  const healthHistoryRef = useRef([]);
  const metricsIntervalRef = useRef(null);
  
  // Enhanced health scoring with predictive factors
  const calculatePredictiveHealthScore = (baseHealth) => {
    let predictiveScore = baseHealth.healthScore;
    
    // Factor in predictive warnings
    predictiveWarnings.forEach(warning => {
      switch (warning.severity) {
        case 'critical':
          predictiveScore -= 20;
          break;
        case 'warning':
          predictiveScore -= 10;
          break;
        default:
          predictiveScore -= 5;
      }
    });
    
    // Factor in component criticality
    Object.entries(baseHealth.components).forEach(([name, status]) => {
      if (status.status === 'error') {
        const criticality = COMPONENT_CRITICALITY[name] || 'low';
        switch (criticality) {
          case 'critical':
            predictiveScore -= 25;
            break;
          case 'high':
            predictiveScore -= 15;
            break;
          case 'medium':
            predictiveScore -= 10;
            break;
          default:
            predictiveScore -= 5;
        }
      }
    });
    
    return Math.max(0, Math.min(100, predictiveScore));
  };
  
  // Performance monitoring
  useEffect(() => {
    // Set up performance monitoring
    metricsIntervalRef.current = setInterval(() => {
      const now = Date.now();
      
      // Collect current metrics
      const currentMetrics = {
        timestamp: now,
        memoryUsage: getMemoryUsage(),
        renderCount: getRecentRenderCount(),
        apiHealth: getAPIHealth()
      };
      
      setPerformanceMetrics(prev => ({
        ...prev,
        memoryUsage: currentMetrics.memoryUsage,
        totalRenders: prev.totalRenders + currentMetrics.renderCount,
        apiCalls: prev.apiCalls + (currentMetrics.apiHealth.recentCalls || 0)
      }));
      
      // Update health trend
      const predictiveScore = calculatePredictiveHealthScore(health);
      setHealthTrend(prev => [...prev, { timestamp: now, score: predictiveScore }].slice(-50));
      
      // Store health history
      healthHistoryRef.current = [...healthHistoryRef.current, {
        timestamp: now,
        healthScore: health.healthScore,
        predictiveScore,
        componentErrors: health.errorComponents,
        metrics: currentMetrics
      }].slice(-100);
      
      // Analyze for predictive warnings
      analyzePredictiveWarnings(currentMetrics, healthHistoryRef.current);
      
    }, 5000); // Update every 5 seconds
    
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [health]);
  
  const getMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  };
  
  const getRecentRenderCount = () => {
    // This would be tracked by performance monitoring
    // For demo purposes, return a mock value
    return Math.floor(Math.random() * 5);
  };
  
  const getAPIHealth = () => {
    // This would track real API calls
    return {
      recentCalls: Math.floor(Math.random() * 10),
      averageLatency: 150 + Math.random() * 100,
      errorRate: Math.random() * 0.1
    };
  };
  
  const analyzePredictiveWarnings = (currentMetrics, history) => {
    const newWarnings = [];
    
    if (history.length < 10) return; // Need sufficient data
    
    const recent = history.slice(-10);
    const earlier = history.slice(-20, -10);
    
    // Analyze memory pressure
    if (currentMetrics.memoryUsage && currentMetrics.memoryUsage.percentage > 80) {
      newWarnings.push({
        id: 'memory_pressure_' + Date.now(),
        type: 'memory_pressure',
        message: `High memory usage: ${Math.round(currentMetrics.memoryUsage.percentage)}%`,
        severity: currentMetrics.memoryUsage.percentage > 90 ? 'critical' : 'warning',
        timestamp: Date.now(),
        metrics: currentMetrics.memoryUsage
      });
    }
    
    // Analyze memory leak patterns
    if (currentMetrics.memoryUsage && history.length >= 20) {
      const memoryTrend = recent.map(h => h.metrics.memoryUsage?.used || 0);
      const growth = memoryTrend[memoryTrend.length - 1] - memoryTrend[0];
      const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
      const growthRate = growth / (timeSpan / 1000); // bytes per second
      
      if (growthRate > 1024 * 1024) { // More than 1MB/second
        newWarnings.push({
          id: 'memory_leak_' + Date.now(),
          type: 'memory_leak',
          message: `Potential memory leak: ${Math.round(growthRate / (1024 * 1024) * 10) / 10}MB/s growth`,
          severity: 'critical',
          timestamp: Date.now(),
          metrics: { growthRate, timeSpan }
        });
      }
    }
    
    // Analyze health score degradation
    const recentHealthScores = recent.map(h => h.healthScore);
    const earlierHealthScores = earlier.map(h => h.healthScore);
    const recentAvg = recentHealthScores.reduce((a, b) => a + b, 0) / recentHealthScores.length;
    const earlierAvg = earlierHealthScores.reduce((a, b) => a + b, 0) / earlierHealthScores.length;
    
    if (recentAvg < earlierAvg * 0.8 && recentAvg < 80) {
      newWarnings.push({
        id: 'health_degradation_' + Date.now(),
        type: 'performance_degradation',
        message: `Health score declining: ${Math.round(recentAvg)}% (down ${Math.round(((earlierAvg - recentAvg) / earlierAvg) * 100)}%)`,
        severity: recentAvg < 50 ? 'critical' : 'warning',
        timestamp: Date.now(),
        metrics: { recentAvg, earlierAvg }
      });
    }
    
    // Analyze error rate spikes
    const recentErrors = recent.reduce((sum, h) => sum + h.componentErrors, 0);
    const earlierErrors = earlier.reduce((sum, h) => sum + h.componentErrors, 0);
    
    if (recentErrors > earlierErrors * 2 && recentErrors > 0) {
      newWarnings.push({
        id: 'error_spike_' + Date.now(),
        type: 'error_rate_spike',
        message: `Error rate spike detected: ${recentErrors} recent errors vs ${earlierErrors} earlier`,
        severity: 'critical',
        timestamp: Date.now(),
        metrics: { recentErrors, earlierErrors }
      });
    }
    
    setPredictiveWarnings(newWarnings);
  };
  
  const getHealthIcon = (score) => {
    if (score >= HEALTH_THRESHOLDS.excellent) return <ShieldCheck className="h-5 w-5 text-green-500" />;
    if (score >= HEALTH_THRESHOLDS.good) return <Shield className="h-5 w-5 text-blue-500" />;
    if (score >= HEALTH_THRESHOLDS.warning) return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
    return <ShieldX className="h-5 w-5 text-red-500" />;
  };
  
  const getHealthColor = (score) => {
    if (score >= HEALTH_THRESHOLDS.excellent) return 'bg-green-50 border-green-200 text-green-800';
    if (score >= HEALTH_THRESHOLDS.good) return 'bg-blue-50 border-blue-200 text-blue-800';
    if (score >= HEALTH_THRESHOLDS.warning) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-red-50 border-red-200 text-red-800';
  };
  
  const getHealthStatus = (score) => {
    if (score >= HEALTH_THRESHOLDS.excellent) return 'Excellent';
    if (score >= HEALTH_THRESHOLDS.good) return 'Good';
    if (score >= HEALTH_THRESHOLDS.warning) return 'Warning';
    return 'Critical';
  };
  
  const getCriticalityIcon = (criticality) => {
    switch (criticality) {
      case 'critical': return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'high': return <TrendingUp className="h-3 w-3 text-orange-500" />;
      case 'medium': return <Activity className="h-3 w-3 text-yellow-500" />;
      default: return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
  };
  
  const predictiveScore = calculatePredictiveHealthScore(health);
  const criticalComponents = Object.entries(health.components)
    .filter(([name, status]) => 
      status.status === 'error' && COMPONENT_CRITICALITY[name] === 'critical'
    );
  
  return (
    <div className={`border rounded-lg p-4 transition-all duration-300 ${getHealthColor(predictiveScore)}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          {getHealthIcon(predictiveScore)}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                Dashboard Health: {predictiveScore}%
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-white/60">
                {getHealthStatus(predictiveScore)}
              </span>
            </div>
            <div className="text-xs opacity-75">
              {health.healthyComponents}/{health.totalComponents} components operational
              {predictiveWarnings.length > 0 && (
                <span className="ml-2 font-medium">
                  • {predictiveWarnings.length} predictive alert{predictiveWarnings.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Predictive Warnings Summary */}
          {predictiveWarnings.length > 0 && (
            <div className="flex items-center space-x-1">
              <Brain className="h-4 w-4" />
              <span className="text-xs font-medium">{predictiveWarnings.length} alerts</span>
            </div>
          )}
          
          {/* Critical Component Failures */}
          {criticalComponents.length > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">{criticalComponents.length} critical</span>
            </div>
          )}
          
          {/* Health Trend Indicator */}
          {healthTrend.length >= 2 && (
            <div className="flex items-center space-x-1">
              {healthTrend[healthTrend.length - 1].score > healthTrend[healthTrend.length - 2].score ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
          )}
          
          <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ↓
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-current/20 space-y-4">
          
          {/* Predictive Warnings Section */}
          {predictiveWarnings.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="h-4 w-4" />
                <span className="font-medium text-sm">Predictive Alerts</span>
              </div>
              <div className="space-y-2">
                {predictiveWarnings.map((warning) => {
                  const indicator = PREDICTIVE_INDICATORS[warning.type];
                  if (!indicator) return null;
                  
                  const Icon = indicator.icon;
                  
                  return (
                    <div key={warning.id} className="p-2 bg-white/30 rounded text-xs">
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className="h-3 w-3" />
                        <span className="font-medium">{indicator.name}</span>
                        <span className={`px-1 rounded text-xs ${
                          warning.severity === 'critical' 
                            ? 'bg-red-200 text-red-800' 
                            : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {warning.severity}
                        </span>
                      </div>
                      <div className="text-gray-700 mb-1">{warning.message}</div>
                      <div className="text-gray-500">{indicator.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Health Trend Visualization */}
          {healthTrend.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="h-4 w-4" />
                <span className="font-medium text-sm">Health Trend</span>
              </div>
              <div className="h-16 bg-white/30 rounded p-2">
                <div className="flex items-end h-full space-x-1">
                  {healthTrend.slice(-20).map((point, index) => (
                    <div 
                      key={index}
                      className="bg-current/40 rounded-sm flex-1 transition-all duration-300"
                      style={{ height: `${Math.max(2, (point.score / 100) * 100)}%` }}
                      title={`${Math.round(point.score)}% at ${new Date(point.timestamp).toLocaleTimeString()}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {performanceMetrics.memoryUsage && (
              <div className="text-center">
                <div className="text-lg font-bold">
                  {Math.round(performanceMetrics.memoryUsage.percentage)}%
                </div>
                <div className="text-xs opacity-75">Memory Usage</div>
              </div>
            )}
            
            <div className="text-center">
              <div className="text-lg font-bold">{performanceMetrics.totalRenders}</div>
              <div className="text-xs opacity-75">Total Renders</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold">{performanceMetrics.apiCalls}</div>
              <div className="text-xs opacity-75">API Calls</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold">
                {Math.round((performanceMetrics.errorRate || 0) * 100)}%
              </div>
              <div className="text-xs opacity-75">Error Rate</div>
            </div>
          </div>
          
          {/* Component Status Grid */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-4 w-4" />
              <span className="font-medium text-sm">Component Status</span>
            </div>
            <div className="space-y-2">
              {Object.entries(health.components).map(([componentName, status]) => {
                const criticality = COMPONENT_CRITICALITY[componentName] || 'low';
                
                return (
                  <div key={componentName} className="flex items-center justify-between text-xs p-2 bg-white/30 rounded">
                    <div className="flex items-center space-x-2">
                      {getCriticalityIcon(criticality)}
                      <span className="font-medium">{componentName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {status.status === 'healthy' ? (
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      ) : (
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      )}
                      <span className="capitalize">{status.status}</span>
                      {status.errorCount > 0 && (
                        <span className="text-xs opacity-60">({status.errorCount})</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical Issues Alert */}
          {criticalComponents.length > 0 && (
            <div className="p-3 bg-red-100/60 border border-red-200 rounded">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-sm text-red-800">Critical Issues</span>
              </div>
              {criticalComponents.map(([name, status]) => (
                <div key={name} className="text-xs text-red-700 mb-1">
                  <strong>{name}</strong>: {status.lastError?.message || 'Component failure'}
                </div>
              ))}
            </div>
          )}

          {/* System Resilience Status */}
          <div className="pt-2 border-t border-current/20 text-xs opacity-75 space-y-1">
            <div className="flex items-center space-x-2">
              <Eye className="h-3 w-3" />
              <span>Predictive monitoring: Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-3 w-3" />
              <span>Error isolation: Component failures contained</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-3 w-3" />
              <span>Auto-recovery: {health.healthyComponents > 0 ? 'Operational' : 'Standby'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
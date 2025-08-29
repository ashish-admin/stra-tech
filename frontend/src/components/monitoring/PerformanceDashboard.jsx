/**
 * LokDarpan Performance Monitoring Dashboard Component
 * Real-time performance metrics visualization and monitoring interface
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Monitor, 
  Users,
  TrendingUp,
  TrendingDown,
  Eye,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  Download,
  AlertCircle,
  BarChart3,
  Gauge
} from 'lucide-react';

// Import monitoring systems
import performanceMonitor from '../../monitoring/PerformanceMonitor';
import qualityGates from '../../monitoring/QualityGates';
import realUserMonitoring from '../../monitoring/RealUserMonitoring';

const PerformanceDashboard = ({ 
  isVisible = true, 
  position = 'fixed',
  enableExport = true,
  showControls = true,
  refreshInterval = 5000 
}) => {
  const [metrics, setMetrics] = useState({});
  const [qualityReport, setQualityReport] = useState(null);
  const [rumData, setRumData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  const refreshIntervalRef = useRef();
  const mountedRef = useRef(true);

  // Initialize monitoring systems
  useEffect(() => {
    const initMonitoring = async () => {
      try {
        const perfInit = await performanceMonitor.init();
        const qualityInit = await qualityGates.init();
        const rumInit = await realUserMonitoring.init();
        
        setIsMonitoringActive(perfInit && qualityInit && rumInit);
        
        // Make performance monitor available globally
        window.__LOKDARPAN_PERF_MONITOR_INSTANCE__ = performanceMonitor;
        
        console.log('[LokDarpan] Performance monitoring dashboard initialized');
      } catch (error) {
        console.error('[LokDarpan] Failed to initialize monitoring:', error);
      }
    };

    initMonitoring();

    return () => {
      mountedRef.current = false;
      
      // Cleanup
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Set up data refresh
  useEffect(() => {
    if (!isMonitoringActive) return;

    const refreshData = () => {
      if (!mountedRef.current) return;

      try {
        // Get performance metrics
        const perfMetrics = performanceMonitor.getMetrics();
        const componentMetrics = performanceMonitor.getComponentMetrics();
        const currentStats = performanceMonitor.getCurrentStats();
        const perfAlerts = performanceMonitor.getAlerts();

        // Get quality report
        const latestQualityReport = qualityGates.getLatestQualityReport();
        const qualityIssues = qualityGates.getQualityIssues();

        // Get RUM data
        const rumMetrics = realUserMonitoring.getMetrics();
        const sessionData = realUserMonitoring.getSessionData();

        setMetrics({
          performance: perfMetrics,
          components: componentMetrics,
          stats: currentStats,
          rum: rumMetrics,
          session: sessionData
        });

        setQualityReport(latestQualityReport);
        setRumData(rumMetrics);
        setAlerts([...perfAlerts, ...qualityIssues]);
        setLastUpdate(Date.now());

      } catch (error) {
        console.error('[LokDarpan] Error refreshing monitoring data:', error);
      }
    };

    // Initial load
    refreshData();

    // Set up refresh interval
    refreshIntervalRef.current = setInterval(refreshData, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isMonitoringActive, refreshInterval]);

  // Listen for performance alerts
  useEffect(() => {
    const handlePerformanceAlert = (event) => {
      const alert = event.detail;
      setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep latest 50 alerts
    };

    const handleQualityIssue = (event) => {
      const issue = event.detail;
      setAlerts(prev => [issue, ...prev.slice(0, 49)]);
    };

    window.addEventListener('lokdarpan:performance-alert', handlePerformanceAlert);
    window.addEventListener('lokdarpan:quality-issue', handleQualityIssue);

    return () => {
      window.removeEventListener('lokdarpan:performance-alert', handlePerformanceAlert);
      window.removeEventListener('lokdarpan:quality-issue', handleQualityIssue);
    };
  }, []);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!metrics.stats) return null;

    const webVitals = metrics.performance?.webvitals || {};
    const componentStats = metrics.stats?.performance || {};
    const alertCounts = alerts.reduce((acc, alert) => {
      acc[alert.severity || 'medium']++;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    return {
      lcp: webVitals.lcp?.value || 0,
      fid: webVitals.fid?.value || 0,
      cls: webVitals.cls?.value || 0,
      avgApiTime: componentStats.avgApiResponseTime || 0,
      avgRenderTime: componentStats.avgComponentRenderTime || 0,
      memoryUsage: componentStats.memoryUsage || 0,
      alertCounts,
      qualityScore: qualityReport?.score || 0,
      totalInteractions: metrics.rum?.interactions?.length || 0
    };
  }, [metrics, alerts, qualityReport]);

  // Export data functionality
  const handleExportData = () => {
    const exportData = {
      timestamp: Date.now(),
      metrics,
      qualityReport,
      alerts: alerts.slice(0, 100),
      summary: summaryStats
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lokdarpan-performance-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Run quality gate manually
  const handleRunQualityGate = async () => {
    try {
      const report = await qualityGates.runQualityGate('manual');
      setQualityReport(report);
    } catch (error) {
      console.error('[LokDarpan] Failed to run quality gate:', error);
    }
  };

  if (!isVisible) return null;

  const dashboardClasses = position === 'fixed' ? 
    'fixed bottom-4 right-4 z-50' : 
    'w-full';

  return (
    <div className={`${dashboardClasses} bg-white rounded-lg shadow-lg border border-gray-200`}>
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-200 cursor-pointer flex items-center justify-between"
        onClick={() => position === 'fixed' && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Activity className={`w-5 h-5 ${isMonitoringActive ? 'text-green-500' : 'text-red-500'}`} />
            <span className="font-semibold text-gray-900">Performance Monitor</span>
          </div>
          {isMonitoringActive && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600">Live</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {alerts.length > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600">{alerts.length}</span>
            </div>
          )}
          
          {position === 'fixed' && (
            <button className="text-gray-400 hover:text-gray-600">
              {isExpanded ? '−' : '+'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {(position !== 'fixed' || isExpanded) && (
        <div className="p-4">
          {!isMonitoringActive ? (
            <div className="text-center py-8">
              <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Performance monitoring not available</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex space-x-1 mb-4 border-b border-gray-200">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'performance', label: 'Performance', icon: Zap },
                  { id: 'quality', label: 'Quality', icon: CheckCircle },
                  { id: 'users', label: 'Users', icon: Users },
                  { id: 'alerts', label: 'Alerts', icon: AlertCircle }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-t-lg ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.id === 'alerts' && alerts.length > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {alerts.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeTab === 'overview' && (
                  <OverviewTab 
                    summaryStats={summaryStats}
                    lastUpdate={lastUpdate}
                    onRefresh={() => setLastUpdate(Date.now())}
                  />
                )}

                {activeTab === 'performance' && (
                  <PerformanceTab 
                    metrics={metrics}
                    summaryStats={summaryStats}
                  />
                )}

                {activeTab === 'quality' && (
                  <QualityTab 
                    qualityReport={qualityReport}
                    onRunQualityGate={handleRunQualityGate}
                  />
                )}

                {activeTab === 'users' && (
                  <UsersTab 
                    rumData={rumData}
                    sessionData={metrics.session}
                  />
                )}

                {activeTab === 'alerts' && (
                  <AlertsTab 
                    alerts={alerts}
                    onClearAlerts={() => setAlerts([])}
                  />
                )}
              </div>

              {/* Controls */}
              {showControls && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Updated {new Date(lastUpdate).toLocaleTimeString()}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleRunQualityGate}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Check Quality</span>
                    </button>

                    {enableExport && (
                      <button
                        onClick={handleExportData}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ summaryStats, lastUpdate, onRefresh }) => {
  if (!summaryStats) {
    return <div className="text-center text-gray-500">Loading metrics...</div>;
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getVitalRating = (metric, value) => {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quality Score */}
        <div className={`p-4 rounded-lg border ${getScoreColor(summaryStats.qualityScore)}`}>
          <div className="flex items-center space-x-2 mb-2">
            <Gauge className="w-4 h-4" />
            <span className="text-sm font-medium">Quality Score</span>
          </div>
          <div className="text-2xl font-bold">{summaryStats.qualityScore}%</div>
        </div>

        {/* LCP */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">LCP</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(summaryStats.lcp / 1000).toFixed(1)}s
          </div>
          <div className={`text-xs mt-1 ${
            getVitalRating('lcp', summaryStats.lcp) === 'good' ? 'text-green-600' : 
            getVitalRating('lcp', summaryStats.lcp) === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {getVitalRating('lcp', summaryStats.lcp)}
          </div>
        </div>

        {/* API Response Time */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Wifi className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">API Time</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summaryStats.avgApiTime.toFixed(0)}ms
          </div>
        </div>

        {/* Active Users */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Interactions</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summaryStats.totalInteractions}
          </div>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Core Web Vitals</h3>
        <div className="grid grid-cols-3 gap-4">
          <WebVitalCard
            name="LCP"
            value={summaryStats.lcp}
            unit="ms"
            rating={getVitalRating('lcp', summaryStats.lcp)}
            description="Largest Contentful Paint"
          />
          <WebVitalCard
            name="FID"
            value={summaryStats.fid}
            unit="ms"
            rating={getVitalRating('fid', summaryStats.fid)}
            description="First Input Delay"
          />
          <WebVitalCard
            name="CLS"
            value={summaryStats.cls}
            unit=""
            rating={getVitalRating('cls', summaryStats.cls)}
            description="Cumulative Layout Shift"
          />
        </div>
      </div>

      {/* Alert Summary */}
      {summaryStats.alertCounts.high + summaryStats.alertCounts.medium > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Alert Summary</h3>
          <div className="flex space-x-4">
            {summaryStats.alertCounts.high > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {summaryStats.alertCounts.high} High Priority
                </span>
              </div>
            )}
            {summaryStats.alertCounts.medium > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {summaryStats.alertCounts.medium} Medium Priority
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Web Vital Card Component
const WebVitalCard = ({ name, value, unit, rating, description }) => {
  const getRatingColor = (rating) => {
    switch (rating) {
      case 'good': return 'border-green-200 bg-green-50';
      case 'needs-improvement': return 'border-yellow-200 bg-yellow-50';
      case 'poor': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getRatingIcon = (rating) => {
    switch (rating) {
      case 'good': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'needs-improvement': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'poor': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Monitor className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getRatingColor(rating)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-900">{name}</span>
        {getRatingIcon(rating)}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {typeof value === 'number' && value < 1 ? 
          value.toFixed(3) : 
          typeof value === 'number' ? Math.round(value) : value
        }{unit}
      </div>
      <div className="text-xs text-gray-600 mt-1">{description}</div>
    </div>
  );
};

// Performance Tab Component
const PerformanceTab = ({ metrics, summaryStats }) => {
  const componentStats = Object.entries(metrics.components || {}).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Performance Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Avg Render Time</div>
            <div className="text-xl font-bold text-gray-900">
              {summaryStats?.avgRenderTime?.toFixed(2) || 0}ms
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Memory Usage</div>
            <div className="text-xl font-bold text-gray-900">
              {summaryStats?.memoryUsage ? 
                (summaryStats.memoryUsage / 1024 / 1024).toFixed(1) + 'MB' : '0MB'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Top Components */}
      {componentStats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Component Performance</h3>
          <div className="space-y-2">
            {componentStats.map(([componentName, data]) => (
              <div key={componentName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    {componentName.replace('component.', '')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.stats?.totalRenders || 0} renders
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {data.stats?.avgRenderTime?.toFixed(2) || 0}ms
                  </div>
                  <div className="text-xs text-gray-500">avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Quality Tab Component
const QualityTab = ({ qualityReport, onRunQualityGate }) => {
  if (!qualityReport) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">No quality report available</div>
        <button
          onClick={onRunQualityGate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Run Quality Gate
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quality Score */}
      <div className="text-center p-6 bg-gray-50 rounded-lg">
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {qualityReport.score}%
        </div>
        <div className={`text-sm font-medium ${
          qualityReport.passed ? 'text-green-600' : 'text-red-600'
        }`}>
          Quality Gate {qualityReport.passed ? 'PASSED' : 'FAILED'}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Last run: {new Date(qualityReport.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Category Scores */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(qualityReport.results || {}).map(([category, result]) => (
          <div key={category} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {category}
              </span>
              {result.passed ? 
                <CheckCircle className="w-4 h-4 text-green-500" /> :
                <AlertCircle className="w-4 h-4 text-red-500" />
              }
            </div>
            <div className="text-xl font-bold text-gray-900">
              {result.score || 0}%
            </div>
            {result.issues && result.issues.length > 0 && (
              <div className="text-xs text-red-600 mt-1">
                {result.issues.length} issues
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button
          onClick={onRunQualityGate}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Run Quality Gate
        </button>
      </div>
    </div>
  );
};

// Users Tab Component  
const UsersTab = ({ rumData, sessionData }) => {
  return (
    <div className="space-y-4">
      {/* Session Info */}
      {sessionData && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Session</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Duration:</span>
              <span className="ml-2 font-medium">
                {Math.round((Date.now() - sessionData.startTime) / 60000)}m
              </span>
            </div>
            <div>
              <span className="text-gray-600">Page Views:</span>
              <span className="ml-2 font-medium">{sessionData.pageViews}</span>
            </div>
            <div>
              <span className="text-gray-600">Screen:</span>
              <span className="ml-2 font-medium">{sessionData.screenResolution}</span>
            </div>
            <div>
              <span className="text-gray-600">Viewport:</span>
              <span className="ml-2 font-medium">{sessionData.viewportSize}</span>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">User Interactions</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {rumData.interactions?.length || 0}
            </div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {rumData.performance?.length || 0}
            </div>
            <div className="text-xs text-gray-600">Performance</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {rumData.errors?.length || 0}
            </div>
            <div className="text-xs text-gray-600">Errors</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Alerts Tab Component
const AlertsTab = ({ alerts, onClearAlerts }) => {
  const recentAlerts = alerts.slice(0, 10);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (recentAlerts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <p className="text-gray-500">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Recent Alerts</h3>
        <button
          onClick={onClearAlerts}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {recentAlerts.map((alert, index) => (
          <div 
            key={alert.id || index}
            className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {alert.message}
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="text-xs font-medium uppercase opacity-75">
                {alert.severity}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
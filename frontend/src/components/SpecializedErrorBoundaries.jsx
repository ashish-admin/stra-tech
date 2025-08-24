import React from 'react';
import { Map, BarChart3, TrendingUp, Bell, FileText, Users, Shield } from 'lucide-react';
import PredictiveErrorBoundary from './PredictiveErrorBoundary.jsx';

/**
 * Specialized error boundaries for different component types in LokDarpan dashboard.
 * Each boundary is optimized for specific failure patterns and recovery strategies
 * based on the component's role in political intelligence workflows.
 */

// Base configuration for different component types
const COMPONENT_CONFIGS = {
  geospatial: {
    icon: Map,
    severity: 'critical',
    maxRetries: 5,
    fallbackStrategy: 'interactive_fallback',
    performanceThresholds: {
      renderTime: 1000,
      memoryGrowth: 2 * 1024 * 1024 // 2MB/s
    },
    contextualFactors: ['network_connectivity', 'browser_compatibility', 'tile_server_availability']
  },
  
  visualization: {
    icon: BarChart3,
    severity: 'high',
    maxRetries: 3,
    fallbackStrategy: 'data_table_fallback',
    performanceThresholds: {
      renderTime: 500,
      memoryGrowth: 1 * 1024 * 1024 // 1MB/s
    },
    contextualFactors: ['data_size', 'rendering_complexity', 'animation_performance']
  },
  
  ai_analysis: {
    icon: TrendingUp,
    severity: 'critical',
    maxRetries: 3,
    fallbackStrategy: 'static_analysis_fallback',
    performanceThresholds: {
      renderTime: 2000,
      memoryGrowth: 512 * 1024 // 512KB/s
    },
    contextualFactors: ['api_availability', 'ai_service_health', 'analysis_complexity']
  },
  
  alerts: {
    icon: Bell,
    severity: 'medium',
    maxRetries: 2,
    fallbackStrategy: 'cached_alerts_fallback',
    performanceThresholds: {
      renderTime: 300,
      memoryGrowth: 256 * 1024 // 256KB/s
    },
    contextualFactors: ['websocket_connectivity', 'notification_permissions', 'background_sync']
  },
  
  content: {
    icon: FileText,
    severity: 'low',
    maxRetries: 1,
    fallbackStrategy: 'placeholder_content',
    performanceThresholds: {
      renderTime: 200,
      memoryGrowth: 128 * 1024 // 128KB/s
    },
    contextualFactors: ['content_availability', 'network_speed', 'caching_status']
  },
  
  user_interface: {
    icon: Users,
    severity: 'medium',
    maxRetries: 2,
    fallbackStrategy: 'basic_ui_fallback',
    performanceThresholds: {
      renderTime: 150,
      memoryGrowth: 64 * 1024 // 64KB/s
    },
    contextualFactors: ['user_interaction_patterns', 'responsive_breakpoints', 'accessibility_requirements']
  },
  
  security: {
    icon: Shield,
    severity: 'critical',
    maxRetries: 1,
    fallbackStrategy: 'secure_mode_fallback',
    performanceThresholds: {
      renderTime: 100,
      memoryGrowth: 32 * 1024 // 32KB/s
    },
    contextualFactors: ['authentication_status', 'permission_levels', 'security_policy_compliance']
  }
};

/**
 * Geospatial Error Boundary - Specialized for interactive maps and location-based components
 */
export class GeospatialErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.config = COMPONENT_CONFIGS.geospatial;
  }

  generateFallbackUI = () => {
    const { selectedWard, onWardSelect, wardOptions = [] } = this.props;
    
    return (
      <div className="h-96 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-6">
        <Map className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-3">Interactive Map Unavailable</h3>
        <p className="text-sm text-gray-500 text-center mb-6 max-w-md">
          The ward map is experiencing technical difficulties. Critical functionality has been preserved 
          through alternative navigation controls below.
        </p>
        
        {/* Fallback ward selector */}
        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Ward (Alternative Navigation)
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              value={selectedWard || ''}
              onChange={(e) => onWardSelect?.(e.target.value)}
            >
              <option value="">Choose a ward...</option>
              {wardOptions.map((ward) => (
                <option key={ward} value={ward}>{ward}</option>
              ))}
            </select>
          </div>
          
          {selectedWard && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm font-medium text-blue-900">Currently Analyzing:</div>
              <div className="text-sm text-blue-700">{selectedWard}</div>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-xs text-gray-400 text-center">
          💡 All dashboard analytics and intelligence features remain fully operational
        </div>
      </div>
    );
  };

  render() {
    return (
      <PredictiveErrorBoundary
        {...this.props}
        componentType="geospatial"
        severity={this.config.severity}
        maxRetries={this.config.maxRetries}
        showPredictiveWarnings={true}
        fallbackMessage="The interactive ward map is temporarily unavailable due to technical issues. Use the alternative navigation below to continue your political intelligence analysis."
        customFallback={this.generateFallbackUI}
        performanceThresholds={this.config.performanceThresholds}
        onPerformanceWarning={(warning) => {
          console.warn('Geospatial performance warning:', warning);
          // Could trigger tile server switching or map simplification
        }}
      >
        {this.props.children}
      </PredictiveErrorBoundary>
    );
  }
}

/**
 * Visualization Error Boundary - Specialized for charts, graphs, and data visualization
 */
export class VisualizationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.config = COMPONENT_CONFIGS.visualization;
  }

  generateFallbackUI = () => {
    const { data, chartType = 'chart', title } = this.props;
    
    // Attempt to show data in table format as fallback
    if (data && Array.isArray(data) && data.length > 0) {
      return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center mb-3">
            <BarChart3 className="h-5 w-5 text-gray-500 mr-2" />
            <h4 className="font-medium text-gray-900">{title || `${chartType} Data`}</h4>
            <span className="ml-2 text-xs text-gray-500">(Table View)</span>
          </div>
          
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <tbody>
                {data.slice(0, 10).map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-1 pr-4 font-medium text-gray-600">
                      {item.label || item.name || item.category || `Item ${index + 1}`}
                    </td>
                    <td className="py-1 text-right text-gray-900">
                      {item.value || item.count || item.percentage || 'N/A'}
                    </td>
                  </tr>
                ))}
                {data.length > 10 && (
                  <tr>
                    <td colSpan="2" className="py-2 text-center text-gray-500 text-xs">
                      ... and {data.length - 10} more items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            💡 Chart visualization will resume automatically once the technical issue is resolved
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center p-6">
        <BarChart3 className="h-12 w-12 text-gray-400 mb-3" />
        <h4 className="font-medium text-gray-900 mb-2">Visualization Unavailable</h4>
        <p className="text-sm text-gray-500 text-center">
          The {chartType} is temporarily unavailable. Other dashboard components remain functional.
        </p>
      </div>
    );
  };

  render() {
    return (
      <PredictiveErrorBoundary
        {...this.props}
        componentType="visualization"
        severity={this.config.severity}
        maxRetries={this.config.maxRetries}
        showPredictiveWarnings={true}
        fallbackMessage="Data visualization is temporarily unavailable. Raw data is shown below when possible."
        customFallback={this.generateFallbackUI}
        performanceThresholds={this.config.performanceThresholds}
      >
        {this.props.children}
      </PredictiveErrorBoundary>
    );
  }
}

/**
 * AI Analysis Error Boundary - Specialized for AI-powered strategic analysis components
 */
export class AIAnalysisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.config = COMPONENT_CONFIGS.ai_analysis;
  }

  generateFallbackUI = () => {
    const { selectedWard, fallbackSummary } = this.props;
    
    return (
      <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <TrendingUp className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-900 mb-2">AI Strategic Analysis Unavailable</h4>
            <div className="text-sm text-yellow-800 mb-4">
              AI-powered strategic analysis for <strong>{selectedWard || 'the selected ward'}</strong> is 
              temporarily unavailable due to service connectivity issues.
            </div>
            
            {fallbackSummary && (
              <div className="mb-4 p-3 bg-white/60 rounded-md">
                <div className="text-xs font-medium text-yellow-700 mb-1">Cached Strategic Summary:</div>
                <div className="text-sm text-gray-700">{fallbackSummary}</div>
              </div>
            )}
            
            <div className="space-y-2 text-sm text-yellow-700">
              <div className="font-medium">Alternative Analysis Sources:</div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Sentiment analysis charts (below) - Real-time emotional intelligence</li>
                <li>Competitive analysis panel - Party performance metrics</li>
                <li>Time-series trends - Historical political patterns</li>
                <li>Intelligence alerts - Breaking political developments</li>
              </ul>
            </div>
            
            <div className="mt-4 p-2 bg-yellow-100 rounded text-xs text-yellow-600">
              🧠 <strong>Campaign Intelligence Tip:</strong> While AI analysis recovers, focus on sentiment trends 
              and competitive metrics for immediate strategic insights.
            </div>
          </div>
        </div>
      </div>
    );
  };

  render() {
    return (
      <PredictiveErrorBoundary
        {...this.props}
        componentType="ai_analysis"
        severity={this.config.severity}
        maxRetries={this.config.maxRetries}
        showPredictiveWarnings={true}
        fallbackMessage="AI strategic analysis is temporarily unavailable. Core political intelligence features remain active."
        customFallback={this.generateFallbackUI}
        performanceThresholds={this.config.performanceThresholds}
        onPerformanceWarning={(warning) => {
          console.warn('AI Analysis performance warning:', warning);
          // Could trigger fallback to cached analysis or simplified AI models
        }}
      >
        {this.props.children}
      </PredictiveErrorBoundary>
    );
  }
}

/**
 * Alerts Error Boundary - Specialized for real-time alerts and notifications
 */
export class AlertsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.config = COMPONENT_CONFIGS.alerts;
  }

  generateFallbackUI = () => {
    const { cachedAlerts = [] } = this.props;
    
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <Bell className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-2">Live Alerts Temporarily Unavailable</h4>
            <p className="text-sm text-blue-700 mb-3">
              Real-time political intelligence alerts are experiencing connectivity issues. 
              Recent cached alerts are shown below.
            </p>
            
            {cachedAlerts.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-blue-800">Recent Cached Alerts:</div>
                {cachedAlerts.slice(0, 5).map((alert, index) => (
                  <div key={index} className="p-2 bg-white/60 rounded text-xs">
                    <div className="font-medium text-gray-700">{alert.title || 'Political Update'}</div>
                    <div className="text-gray-600">{alert.summary || alert.message}</div>
                    {alert.timestamp && (
                      <div className="text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-blue-600">No cached alerts available.</div>
            )}
            
            <div className="mt-3 text-xs text-blue-600">
              🔄 Attempting to reconnect... Live alerts will resume automatically
            </div>
          </div>
        </div>
      </div>
    );
  };

  render() {
    return (
      <PredictiveErrorBoundary
        {...this.props}
        componentType="alerts"
        severity={this.config.severity}
        maxRetries={this.config.maxRetries}
        showPredictiveWarnings={true}
        fallbackMessage="Real-time alerts are temporarily unavailable. Cached recent alerts are displayed when available."
        customFallback={this.generateFallbackUI}
        performanceThresholds={this.config.performanceThresholds}
      >
        {this.props.children}
      </PredictiveErrorBoundary>
    );
  }
}

/**
 * Content Error Boundary - Specialized for news feeds, articles, and content display
 */
export class ContentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.config = COMPONENT_CONFIGS.content;
  }

  generateFallbackUI = () => {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-2">Content Temporarily Unavailable</h4>
            <p className="text-sm text-gray-600">
              This content section is experiencing loading issues. The dashboard's 
              core political intelligence features remain fully operational.
            </p>
            <div className="mt-3 text-xs text-gray-500">
              ℹ️ Content will reload automatically once connectivity is restored
            </div>
          </div>
        </div>
      </div>
    );
  };

  render() {
    return (
      <PredictiveErrorBoundary
        {...this.props}
        componentType="content"
        severity={this.config.severity}
        maxRetries={this.config.maxRetries}
        showPredictiveWarnings={false}
        fallbackMessage="Content is temporarily unavailable but will reload automatically."
        customFallback={this.generateFallbackUI}
        performanceThresholds={this.config.performanceThresholds}
        compact={true}
      >
        {this.props.children}
      </PredictiveErrorBoundary>
    );
  }
}

/**
 * Security Error Boundary - Specialized for authentication and security-sensitive components
 */
export class SecurityErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.config = COMPONENT_CONFIGS.security;
  }

  generateFallbackUI = () => {
    return (
      <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900 mb-2">Security Component Error</h4>
            <p className="text-sm text-red-700 mb-3">
              A security-sensitive component has encountered an error. For data protection, 
              this section has been disabled.
            </p>
            <div className="p-3 bg-white/60 rounded-md text-sm text-red-800">
              <div className="font-medium mb-1">Recommended Actions:</div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Refresh your browser to restore secure access</li>
                <li>Verify your network connection is secure</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Refresh Page Securely
            </button>
          </div>
        </div>
      </div>
    );
  };

  render() {
    return (
      <PredictiveErrorBoundary
        {...this.props}
        componentType="security"
        severity={this.config.severity}
        maxRetries={this.config.maxRetries}
        showPredictiveWarnings={true}
        fallbackMessage="Security component disabled due to error. Refresh page to restore secure access."
        customFallback={this.generateFallbackUI}
        performanceThresholds={this.config.performanceThresholds}
        allowRetry={false} // Security components should not auto-retry
        onPerformanceWarning={(warning) => {
          console.error('Security component performance warning:', warning);
          // Security performance issues should be logged with high priority
        }}
      >
        {this.props.children}
      </PredictiveErrorBoundary>
    );
  }
}

/**
 * Factory function to create appropriate error boundary based on component type
 */
export const createErrorBoundary = (componentType, props = {}) => {
  const boundaries = {
    geospatial: GeospatialErrorBoundary,
    visualization: VisualizationErrorBoundary,
    ai_analysis: AIAnalysisErrorBoundary,
    alerts: AlertsErrorBoundary,
    content: ContentErrorBoundary,
    security: SecurityErrorBoundary
  };

  const BoundaryComponent = boundaries[componentType] || PredictiveErrorBoundary;
  
  return ({ children, ...boundaryProps }) => (
    <BoundaryComponent {...props} {...boundaryProps}>
      {children}
    </BoundaryComponent>
  );
};

export {
  GeospatialErrorBoundary,
  VisualizationErrorBoundary, 
  AIAnalysisErrorBoundary,
  AlertsErrorBoundary,
  ContentErrorBoundary,
  SecurityErrorBoundary,
  COMPONENT_CONFIGS
};
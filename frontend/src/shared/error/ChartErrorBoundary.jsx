import React, { Component } from 'react';
import { BarChart3, AlertTriangle, RefreshCw, Download, Table, TrendingUp } from 'lucide-react';
import { enhancementFlags } from '../../config/features';
import { getTelemetryIntegration } from '../../services/telemetryIntegration';

/**
 * Specialized Error Boundary for Chart Components
 * 
 * Provides chart-specific error handling with:
 * - Fallback data table representation
 * - Chart type detection and recovery
 * - Political data context preservation
 * - Specialized retry mechanisms for visualization errors
 * - Integration with telemetry system
 * - Feature flag control for error boundary behavior
 */
export class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
      showDataTable: false,
      fallbackData: null,
      chartType: null,
      renderingContext: null
    };

    // Initialize telemetry integration
    this.telemetry = getTelemetryIntegration();
    
    // Chart-specific error patterns
    this.chartErrorPatterns = {
      data: ['Cannot read property', 'undefined data', 'null dataset'],
      rendering: ['Canvas', 'SVG', 'DOM', 'render'],
      memory: ['heap', 'memory', 'allocation'],
      performance: ['timeout', 'freeze', 'slow'],
      validation: ['invalid data', 'schema', 'format']
    };

    // Chart recovery strategies
    this.recoveryStrategies = {
      'data-error': this.handleDataError.bind(this),
      'rendering-error': this.handleRenderingError.bind(this),
      'memory-error': this.handleMemoryError.bind(this),
      'performance-error': this.handlePerformanceError.bind(this),
      'validation-error': this.handleValidationError.bind(this)
    };

    // Performance tracking
    this.renderStartTime = null;
    this.renderMetrics = {
      attempts: 0,
      successfulRenders: 0,
      averageRenderTime: 0,
      lastError: null
    };
  }

  static getDerivedStateFromError(error) {
    // Mark chart error occurrence
    if (typeof performance !== 'undefined') {
      performance.mark('chart-error-boundary-triggered');
    }
    
    return {
      hasError: true,
      error,
      isRecovering: false
    };
  }

  componentDidCatch(error, errorInfo) {
    // Check if error boundaries are enabled
    if (!enhancementFlags.enableComponentErrorBoundaries) {
      console.error('Chart error caught but boundaries disabled:', error, errorInfo);
      return;
    }

    // Classify chart error type
    const errorType = this.classifyChartError(error);
    const chartContext = this.extractChartContext();
    const renderingMetrics = this.measureRenderingImpact();

    // Create specialized error data for charts
    const errorData = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        type: error.constructor?.name || 'ChartError'
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
        props: this.sanitizeChartProps(this.props)
      },
      chart: {
        type: this.props.chartType || this.detectChartType(),
        dataSize: this.getDataSize(),
        config: this.sanitizeChartConfig(this.props.config),
        theme: this.props.theme || 'default',
        responsive: this.props.responsive || false,
        animated: this.props.animated || false
      },
      politicalContext: {
        ward: this.props.ward || this.getWardFromContext(),
        metric: this.props.metric || 'unknown',
        timeRange: this.props.timeRange || 'unknown',
        party: this.props.party || 'all',
        dataSource: this.props.dataSource || 'api'
      },
      errorClassification: {
        type: errorType,
        severity: this.calculateErrorSeverity(error, errorType),
        recoverable: this.isRecoverableError(error, errorType),
        fallbackAvailable: this.hasFallbackData()
      },
      rendering: renderingMetrics,
      performance: {
        renderAttempts: this.renderMetrics.attempts,
        successRate: this.renderMetrics.attempts > 0 ? 
          this.renderMetrics.successfulRenders / this.renderMetrics.attempts : 0,
        averageRenderTime: this.renderMetrics.averageRenderTime
      },
      environment: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        devicePixelRatio: window.devicePixelRatio || 1,
        browser: this.getBrowserInfo(),
        timestamp: Date.now()
      }
    };

    // Generate error ID for tracking
    const errorId = this.generateErrorId();
    
    // Send to telemetry if available
    if (this.telemetry && enhancementFlags.enableErrorTelemetry) {
      this.telemetry.recordEvent('chart_error', {
        ...errorData,
        errorId,
        component: 'ChartErrorBoundary'
      });
    }

    // Extract fallback data if possible
    const fallbackData = this.extractFallbackData();
    
    // Update state with error details
    this.setState({
      errorId,
      errorInfo,
      chartType: errorData.chart.type,
      renderingContext: errorData.rendering,
      fallbackData: fallbackData
    });

    // Update render metrics
    this.renderMetrics.lastError = error;
    
    // Log detailed error in development
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Chart Error Boundary Triggered');
      console.error('Chart Type:', errorData.chart.type);
      console.error('Error Classification:', errorData.errorClassification);
      console.error('Political Context:', errorData.politicalContext);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Fallback Data Available:', !!fallbackData);
      console.groupEnd();
    }

    // Call error callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId, errorData);
    }

    // Trigger recovery strategy if available
    const strategy = this.recoveryStrategies[`${errorType}-error`];
    if (strategy && this.isRecoverableError(error, errorType)) {
      setTimeout(() => strategy(error, errorData), 100);
    }
  }

  /**
   * Classify chart error type
   */
  classifyChartError(error) {
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';
    const fullText = `${message} ${stack}`;

    for (const [category, patterns] of Object.entries(this.chartErrorPatterns)) {
      if (patterns.some(pattern => fullText.includes(pattern.toLowerCase()))) {
        return category;
      }
    }

    return 'unknown';
  }

  /**
   * Calculate error severity
   */
  calculateErrorSeverity(error, errorType) {
    // Critical errors that prevent any chart rendering
    if (errorType === 'memory' || error.name === 'OutOfMemoryError') {
      return 'critical';
    }

    // High severity for data corruption or rendering failures
    if (errorType === 'data' || errorType === 'rendering') {
      return 'high';
    }

    // Medium for performance or validation issues
    if (errorType === 'performance' || errorType === 'validation') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Check if error is recoverable
   */
  isRecoverableError(error, errorType) {
    const unrecoverableTypes = ['memory', 'critical-rendering'];
    const unrecoverableErrors = ['OutOfMemoryError', 'SecurityError'];
    
    return !unrecoverableTypes.includes(errorType) && 
           !unrecoverableErrors.includes(error.name);
  }

  /**
   * Check if fallback data is available
   */
  hasFallbackData() {
    return !!(this.props.data || this.props.fallbackData || this.props.summaryData);
  }

  /**
   * Extract chart context information
   */
  extractChartContext() {
    return {
      componentName: this.props.name || 'UnknownChart',
      dataKeys: this.getDataKeys(),
      configKeys: Object.keys(this.props.config || {}),
      hasData: !!(this.props.data && this.props.data.length > 0),
      dataTimestamp: this.props.dataTimestamp || Date.now()
    };
  }

  /**
   * Measure rendering performance impact
   */
  measureRenderingImpact() {
    if (typeof performance === 'undefined') {
      return null;
    }

    try {
      const now = performance.now();
      const renderDuration = this.renderStartTime ? now - this.renderStartTime : 0;

      return {
        renderDuration,
        memory: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1048576),
          total: Math.round(performance.memory.totalJSHeapSize / 1048576),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
        } : null,
        timestamp: Date.now()
      };
    } catch (err) {
      console.warn('Failed to measure rendering impact:', err);
      return null;
    }
  }

  /**
   * Extract fallback data from various sources
   */
  extractFallbackData() {
    // Priority order for fallback data
    const dataSources = [
      this.props.fallbackData,
      this.props.summaryData,
      this.props.data,
      this.props.aggregatedData
    ];

    for (const dataSource of dataSources) {
      if (dataSource && Array.isArray(dataSource) && dataSource.length > 0) {
        return this.processFallbackData(dataSource);
      }
    }

    // Generate minimal fallback if no data available
    return this.generateMinimalFallback();
  }

  /**
   * Process fallback data into table format
   */
  processFallbackData(data) {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      // Take first few items and extract key columns
      const sample = data.slice(0, 10);
      const headers = this.extractHeaders(sample[0]);
      
      return {
        headers,
        rows: sample.map(item => 
          headers.map(header => this.formatCellValue(item[header]))
        ),
        totalRows: data.length,
        chartType: this.props.chartType || this.detectChartType(),
        metric: this.props.metric || 'Value'
      };
    } catch (err) {
      console.warn('Failed to process fallback data:', err);
      return null;
    }
  }

  /**
   * Extract headers from data object
   */
  extractHeaders(dataItem) {
    if (!dataItem || typeof dataItem !== 'object') {
      return ['Value'];
    }

    // Priority headers for political data
    const politicalHeaders = ['ward', 'party', 'sentiment', 'metric', 'value', 'count', 'date'];
    const itemKeys = Object.keys(dataItem);
    
    // Use political headers if available, otherwise use all keys
    const headers = politicalHeaders.filter(header => itemKeys.includes(header));
    
    if (headers.length === 0) {
      return itemKeys.slice(0, 5); // Limit to 5 columns
    }
    
    return headers;
  }

  /**
   * Format cell value for display
   */
  formatCellValue(value) {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    if (typeof value === 'string') {
      return value.length > 50 ? `${value.substring(0, 47)}...` : value;
    }
    
    return String(value);
  }

  /**
   * Generate minimal fallback when no data available
   */
  generateMinimalFallback() {
    const chartType = this.props.chartType || 'chart';
    
    return {
      headers: ['Metric', 'Status'],
      rows: [
        ['Chart Type', chartType],
        ['Data Status', 'Unavailable'],
        ['Ward', this.props.ward || 'Unknown'],
        ['Time Range', this.props.timeRange || 'Unknown']
      ],
      totalRows: 4,
      chartType,
      metric: 'Status Information'
    };
  }

  /**
   * Recovery strategy handlers
   */
  async handleDataError(error, errorData) {
    console.log('[ChartErrorBoundary] Attempting data error recovery');
    
    // Try to refetch data if possible
    if (this.props.onDataRefetch) {
      try {
        await this.props.onDataRefetch();
        this.attemptRecovery();
      } catch (refetchError) {
        console.warn('Data refetch failed:', refetchError);
      }
    }
  }

  async handleRenderingError(error, errorData) {
    console.log('[ChartErrorBoundary] Attempting rendering error recovery');
    
    // Try simplified rendering mode
    if (this.props.onSimplifyRender) {
      try {
        this.props.onSimplifyRender();
        setTimeout(() => this.attemptRecovery(), 500);
      } catch (renderError) {
        console.warn('Simplified render failed:', renderError);
      }
    }
  }

  async handleMemoryError(error, errorData) {
    console.log('[ChartErrorBoundary] Attempting memory error recovery');
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear caches if available
    if (this.props.onClearCache) {
      this.props.onClearCache();
    }
    
    // Attempt recovery with delay
    setTimeout(() => this.attemptRecovery(), 1000);
  }

  async handlePerformanceError(error, errorData) {
    console.log('[ChartErrorBoundary] Attempting performance error recovery');
    
    // Disable animations and reduce data
    if (this.props.onOptimizePerformance) {
      this.props.onOptimizePerformance();
      setTimeout(() => this.attemptRecovery(), 300);
    }
  }

  async handleValidationError(error, errorData) {
    console.log('[ChartErrorBoundary] Attempting validation error recovery');
    
    // Try data sanitization
    if (this.props.onSanitizeData) {
      try {
        await this.props.onSanitizeData();
        this.attemptRecovery();
      } catch (sanitizeError) {
        console.warn('Data sanitization failed:', sanitizeError);
      }
    }
  }

  /**
   * Attempt error recovery
   */
  attemptRecovery = async () => {
    if (this.state.retryCount >= 3) {
      console.warn('Max retry attempts reached for chart recovery');
      return;
    }

    this.setState({ isRecovering: true });

    // Mark recovery start
    if (typeof performance !== 'undefined') {
      performance.mark('chart-recovery-start');
    }

    try {
      // Clear error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
        retryCount: this.state.retryCount + 1
      });

      // Update render metrics
      this.renderMetrics.attempts++;

      // Force re-render
      this.forceUpdate();

      // Mark successful render
      this.renderMetrics.successfulRenders++;
      
      // Mark recovery end
      if (typeof performance !== 'undefined') {
        performance.mark('chart-recovery-end');
        performance.measure('chart-recovery-duration', 'chart-recovery-start', 'chart-recovery-end');
      }

      console.log('[ChartErrorBoundary] Recovery successful');
      
    } catch (recoveryError) {
      console.error('[ChartErrorBoundary] Recovery failed:', recoveryError);
      this.setState({ 
        isRecovering: false,
        retryCount: this.state.retryCount + 1 
      });
    }
  };

  /**
   * Toggle data table display
   */
  toggleDataTable = () => {
    this.setState(prev => ({ showDataTable: !prev.showDataTable }));
  };

  /**
   * Export fallback data
   */
  exportData = () => {
    const { fallbackData } = this.state;
    if (!fallbackData) return;

    try {
      // Convert to CSV
      const csvContent = [
        fallbackData.headers.join(','),
        ...fallbackData.rows.map(row => row.join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart-data-${this.state.chartType}-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  /**
   * Utility methods
   */
  detectChartType() {
    const componentName = this.constructor.name.toLowerCase();
    
    if (componentName.includes('timeseries')) return 'timeseries';
    if (componentName.includes('bar')) return 'bar';
    if (componentName.includes('line')) return 'line';
    if (componentName.includes('pie')) return 'pie';
    if (componentName.includes('scatter')) return 'scatter';
    if (componentName.includes('heatmap')) return 'heatmap';
    
    return 'unknown';
  }

  getDataSize() {
    const data = this.props.data || [];
    return Array.isArray(data) ? data.length : 0;
  }

  getDataKeys() {
    const data = this.props.data || [];
    if (data.length > 0 && typeof data[0] === 'object') {
      return Object.keys(data[0]);
    }
    return [];
  }

  sanitizeChartProps(props) {
    const { data, config, ...sanitized } = props;
    return {
      ...sanitized,
      dataSize: Array.isArray(data) ? data.length : 0,
      hasConfig: !!config
    };
  }

  sanitizeChartConfig(config) {
    if (!config) return null;
    
    return {
      type: config.type,
      responsive: config.responsive,
      animated: config.animated,
      hasCustom: Object.keys(config).length > 3
    };
  }

  getWardFromContext() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('ward') || localStorage.getItem('selectedWard') || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  generateErrorId() {
    return `chart_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  componentDidMount() {
    this.renderStartTime = performance.now();
  }

  componentDidUpdate() {
    if (!this.state.hasError) {
      this.renderStartTime = performance.now();
    }
  }

  render() {
    if (this.state.hasError) {
      const { 
        error, 
        errorId, 
        retryCount, 
        isRecovering, 
        showDataTable, 
        fallbackData,
        chartType 
      } = this.state;

      const maxRetries = 3;
      const canRetry = retryCount < maxRetries && this.isRecoverableError(error, this.classifyChartError(error));
      const hasData = !!fallbackData;

      return (
        <div className="chart-error-boundary">
          <div className="bg-white rounded-lg border border-orange-200 p-4">
            {/* Error Header */}
            <div className="flex items-start space-x-3 mb-4">
              <div className="flex-shrink-0">
                <BarChart3 className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-md font-medium text-gray-900">
                  Chart Unavailable
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {chartType ? `The ${chartType} chart` : 'This chart'} encountered a rendering error.
                  {hasData && ' However, the underlying data is still available below.'}
                </p>
                {errorId && (
                  <p className="mt-1 text-xs text-gray-500">
                    Reference: <code className="bg-gray-100 px-1 rounded text-xs">{errorId}</code>
                  </p>
                )}
              </div>
            </div>

            {/* Recovery Status */}
            {isRecovering && (
              <div className="mb-3 p-2 bg-blue-50 rounded-md">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                  <span className="text-sm text-blue-700">
                    Reloading chart... (Attempt {retryCount + 1}/{maxRetries})
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {canRetry && !isRecovering && (
                <button
                  onClick={this.attemptRecovery}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Retry ({maxRetries - retryCount} left)
                </button>
              )}
              
              {hasData && (
                <button
                  onClick={this.toggleDataTable}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Table className="h-3 w-3 mr-1.5" />
                  {showDataTable ? 'Hide' : 'Show'} Data Table
                </button>
              )}
              
              {hasData && (
                <button
                  onClick={this.exportData}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  Export CSV
                </button>
              )}
            </div>

            {/* Fallback Data Table */}
            {showDataTable && hasData && fallbackData && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1.5" />
                    {fallbackData.metric} Data
                  </h4>
                  <span className="text-xs text-gray-500">
                    Showing {fallbackData.rows.length} of {fallbackData.totalRows} records
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        {fallbackData.headers.map((header, index) => (
                          <th 
                            key={index}
                            className="border border-gray-200 px-2 py-1 text-left font-medium text-gray-700"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fallbackData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {row.map((cell, cellIndex) => (
                            <td 
                              key={cellIndex}
                              className="border border-gray-200 px-2 py-1 text-gray-900"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No Data Fallback */}
            {!hasData && (
              <div className="text-center py-6 text-gray-500">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No visualization data available</p>
              </div>
            )}

            {/* Development Error Details */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 pt-4 border-t border-gray-200">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                  Technical Details
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-700">Chart Type:</p>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded">{chartType || 'Unknown'}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Error:</p>
                    <pre className="mt-1 text-xs bg-red-50 p-2 rounded overflow-x-auto">
                      {error?.message || 'Unknown error'}
                    </pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    // Track successful render
    if (this.renderStartTime) {
      const renderDuration = performance.now() - this.renderStartTime;
      this.renderMetrics.averageRenderTime = (
        (this.renderMetrics.averageRenderTime * this.renderMetrics.successfulRenders) + renderDuration
      ) / (this.renderMetrics.successfulRenders + 1);
      this.renderMetrics.successfulRenders++;
    }

    return this.props.children;
  }
}

// Default props
ChartErrorBoundary.defaultProps = {
  name: 'UnknownChart',
  chartType: 'chart',
  fallbackTitle: 'Chart Unavailable',
  fallbackMessage: 'This chart encountered an error but the data is still accessible.',
  context: {}
};

export default ChartErrorBoundary;
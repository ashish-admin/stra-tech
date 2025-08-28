/**
 * Enhanced Error Boundaries for LokDarpan Phase 4.1
 * Specialized error boundaries for different component types with granular isolation
 */

import React from 'react';
import { ProductionErrorBoundary } from '../../error/ProductionErrorBoundary';

/**
 * Critical Dashboard Components - Never allow these to fail without recovery
 */
export const DashboardErrorBoundary = ({ children, componentName, ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName || 'Dashboard Core'}
    featureName="LokDarpan Dashboard"
    criticalLevel="high"
    maxRetries={5}
    showTechnicalDetails={process.env.NODE_ENV === 'development'}
    fallbackMessage="The dashboard core component encountered an error. Attempting automatic recovery..."
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * Map Components - Geographic visualization is critical for political analysis
 */
export const MapErrorBoundary = ({ children, componentName = 'Location Map', ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName}
    featureName="Geographic Analysis"
    criticalLevel="high"
    maxRetries={3}
    showTechnicalDetails={process.env.NODE_ENV === 'development'}
    fallbackMessage="The geographic map component is temporarily unavailable. Ward selection dropdown remains functional."
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * Chart Components - Data visualization failures should not crash dashboard
 */
export const ChartErrorBoundary = ({ children, componentName, chartType = 'Chart', ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName || `${chartType} Component`}
    featureName="Political Analytics"
    criticalLevel="medium"
    maxRetries={3}
    showTechnicalDetails={false}
    fallbackMessage={`The ${chartType.toLowerCase()} visualization is temporarily unavailable. Raw data and other charts remain accessible.`}
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * Strategic Analysis Components - AI-powered features with special handling
 */
export const StrategistErrorBoundary = ({ children, componentName = 'Political Strategist', ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName}
    featureName="AI Strategic Analysis"
    criticalLevel="high"
    maxRetries={4}
    showTechnicalDetails={process.env.NODE_ENV === 'development'}
    fallbackMessage="The AI strategic analysis component encountered an error. Historical data and manual analysis tools remain available."
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * Data Feed Components - Real-time data streams
 */
export const FeedErrorBoundary = ({ children, componentName, feedType = 'Data Feed', ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName || `${feedType} Component`}
    featureName="Real-time Intelligence"
    criticalLevel="medium"
    maxRetries={2}
    showTechnicalDetails={false}
    fallbackMessage={`The ${feedType.toLowerCase()} is temporarily unavailable. Cached data and other intelligence sources remain active.`}
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * Navigation and UI Components - Essential for user interaction
 */
export const NavigationErrorBoundary = ({ children, componentName = 'Navigation', ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName}
    featureName="Dashboard Navigation"
    criticalLevel="high"
    maxRetries={5}
    showTechnicalDetails={false}
    fallbackMessage="Navigation component error detected. Dashboard content remains accessible via direct URLs."
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * Optional Enhancement Components - Can be safely skipped
 */
export const OptionalErrorBoundary = ({ children, componentName, featureName = 'Enhancement', ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName || `${featureName} Component`}
    featureName={featureName}
    criticalLevel="low"
    maxRetries={1}
    showTechnicalDetails={false}
    fallbackMessage={`The ${featureName.toLowerCase()} enhancement is temporarily disabled. Core functionality remains unaffected.`}
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * SSE and Real-time Components - Special handling for connection-based components
 */
export const SSEErrorBoundary = ({ children, componentName = 'Real-time Stream', ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName}
    featureName="Live Data Stream"
    criticalLevel="medium"
    maxRetries={3}
    showTechnicalDetails={process.env.NODE_ENV === 'development'}
    fallbackMessage="Real-time data stream encountered an error. Polling fallback activated for continued data updates."
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * Authentication Components - Critical for security
 */
export const AuthErrorBoundary = ({ children, componentName = 'Authentication', ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName}
    featureName="User Authentication"
    criticalLevel="high"
    maxRetries={3}
    showTechnicalDetails={false}
    fallbackMessage="Authentication component error. Please refresh the page or contact system administrator."
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * Lazy Loading Error Boundary - For dynamically imported components
 */
export const LazyLoadErrorBoundary = ({ children, componentName, ...props }) => (
  <ProductionErrorBoundary
    {...props}
    componentName={componentName || 'Lazy Component'}
    featureName="Dynamic Loading"
    criticalLevel="medium"
    maxRetries={2}
    showTechnicalDetails={false}
    fallbackMessage="Component loading failed. Please check your network connection and try again."
    allowRetry={true}
  >
    {children}
  </ProductionErrorBoundary>
);

/**
 * Higher-Order Component for automatic error boundary wrapping
 */
export const withErrorBoundary = (WrappedComponent, options = {}) => {
  const {
    boundaryType = 'default',
    componentName,
    ...boundaryProps
  } = options;

  const BoundaryComponent = React.forwardRef((props, ref) => {
    const ErrorBoundary = {
      dashboard: DashboardErrorBoundary,
      map: MapErrorBoundary,
      chart: ChartErrorBoundary,
      strategist: StrategistErrorBoundary,
      feed: FeedErrorBoundary,
      navigation: NavigationErrorBoundary,
      optional: OptionalErrorBoundary,
      sse: SSEErrorBoundary,
      auth: AuthErrorBoundary,
      lazy: LazyLoadErrorBoundary
    }[boundaryType] || ProductionErrorBoundary;

    return (
      <ErrorBoundary 
        componentName={componentName || WrappedComponent.displayName || WrappedComponent.name}
        {...boundaryProps}
      >
        <WrappedComponent {...props} ref={ref} />
      </ErrorBoundary>
    );
  });

  BoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return BoundaryComponent;
};

/**
 * Component Error Monitoring Hook
 */
export const useErrorMonitoring = (componentName) => {
  React.useEffect(() => {
    const markComponentHealthy = () => {
      if (window.componentHealthTracker) {
        window.componentHealthTracker.updateStatus(componentName, true);
      }
    };

    markComponentHealthy();

    return () => {
      // Component unmounting - neutral state
      if (window.componentHealthTracker) {
        window.componentHealthTracker.updateStatus(componentName, null);
      }
    };
  }, [componentName]);
};

/**
 * Error Recovery Hook
 */
export const useErrorRecovery = () => {
  const [errorHistory, setErrorHistory] = React.useState([]);

  React.useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('lokdarpan_error_history') || '[]');
      setErrorHistory(history);
    } catch (error) {
      console.warn('Failed to load error history:', error);
    }
  }, []);

  const clearErrorHistory = React.useCallback(() => {
    localStorage.removeItem('lokdarpan_error_history');
    setErrorHistory([]);
  }, []);

  const getComponentErrors = React.useCallback((componentName) => {
    return errorHistory.filter(error => error.component === componentName);
  }, [errorHistory]);

  return {
    errorHistory,
    clearErrorHistory,
    getComponentErrors
  };
};

export default {
  DashboardErrorBoundary,
  MapErrorBoundary,
  ChartErrorBoundary,
  StrategistErrorBoundary,
  FeedErrorBoundary,
  NavigationErrorBoundary,
  OptionalErrorBoundary,
  SSEErrorBoundary,
  AuthErrorBoundary,
  LazyLoadErrorBoundary,
  withErrorBoundary,
  useErrorMonitoring,
  useErrorRecovery
};
/**
 * Error Boundary Infrastructure Exports
 * 
 * Centralized exports for LokDarpan's Phase 1 error boundary system.
 * Provides comprehensive error handling, recovery mechanisms, and 
 * political context integration for campaign-critical applications.
 */

// Core Error Boundary Components
export { ChartErrorBoundary } from './ChartErrorBoundary';
export { ProductionErrorBoundary } from './ProductionErrorBoundary';
export { SSEErrorBoundary } from './SSEErrorBoundary';
export { TabErrorBoundary } from './TabErrorBoundary';

// Error Recovery and Context Management
export {
  executeErrorRecovery,
  registerRecoveryStrategy,
  getRecoveryStats,
  useErrorRecovery,
  errorRecoveryManager,
  errorContextManager,
  recoveryStateManager
} from './ErrorRecovery';

// Error Context Provider and Hooks
export {
  ErrorContextProvider,
  useErrorContext,
  useComponentErrorHandler,
  usePoliticalContext
} from './ErrorContextProvider';

// Integration Testing (Development Only)
export { default as ErrorBoundaryIntegrationTest } from './ErrorBoundaryIntegrationTest';

/**
 * Convenience wrapper for components that need multiple error boundaries
 */
export const withErrorBoundaries = (Component, options = {}) => {
  const {
    useChartBoundary = false,
    useProductionBoundary = true,
    chartProps = {},
    productionProps = {}
  } = options;

  return (props) => {
    let WrappedComponent = <Component {...props} />;

    if (useChartBoundary) {
      WrappedComponent = (
        <ChartErrorBoundary 
          name={`chart-${Component.displayName || Component.name}`}
          {...chartProps}
        >
          {WrappedComponent}
        </ChartErrorBoundary>
      );
    }

    if (useProductionBoundary) {
      WrappedComponent = (
        <ProductionErrorBoundary 
          name={`production-${Component.displayName || Component.name}`}
          {...productionProps}
        >
          {WrappedComponent}
        </ProductionErrorBoundary>
      );
    }

    return WrappedComponent;
  };
};

/**
 * Higher-order component for chart components
 */
export const withChartErrorBoundary = (ChartComponent, chartProps = {}) => {
  const ChartWithErrorBoundary = (props) => (
    <ChartErrorBoundary
      name={`chart-${ChartComponent.displayName || ChartComponent.name}`}
      chartType={props.chartType || 'chart'}
      ward={props.ward}
      metric={props.metric}
      {...chartProps}
    >
      <ChartComponent {...props} />
    </ChartErrorBoundary>
  );

  ChartWithErrorBoundary.displayName = `withChartErrorBoundary(${ChartComponent.displayName || ChartComponent.name})`;
  
  return ChartWithErrorBoundary;
};

/**
 * Higher-order component for production components
 */
export const withProductionErrorBoundary = (Component, productionProps = {}) => {
  const ComponentWithErrorBoundary = (props) => (
    <ProductionErrorBoundary
      name={`production-${Component.displayName || Component.name}`}
      ward={props.ward}
      userRole={props.userRole}
      campaignContext={props.campaignContext || 'dashboard'}
      {...productionProps}
    >
      <Component {...props} />
    </ProductionErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withProductionErrorBoundary(${Component.displayName || Component.name})`;
  
  return ComponentWithErrorBoundary;
};

/**
 * Error boundary configuration helpers
 */
export const createErrorBoundaryConfig = (component, context = {}) => {
  return {
    name: component.displayName || component.name || 'UnknownComponent',
    ward: context.ward || 'Unknown',
    userRole: context.userRole || 'user',
    campaignContext: context.campaignContext || 'dashboard',
    onError: context.onError || ((error, errorInfo, errorId) => {
      console.error(`Error in ${component.name}:`, { error, errorInfo, errorId });
    })
  };
};

/**
 * Utility to check if error boundaries are enabled
 */
export const isErrorBoundariesEnabled = () => {
  try {
    const { enhancementFlags } = require('../../config/features');
    return enhancementFlags.enableComponentErrorBoundaries && 
           enhancementFlags.enableFrontendEnhancements;
  } catch {
    return false;
  }
};

/**
 * Recovery strategy registry for custom strategies
 */
const customStrategies = new Map();

export const defineRecoveryStrategy = (name, strategy) => {
  customStrategies.set(name, strategy);
  
  // Register with recovery manager if available
  try {
    registerRecoveryStrategy(name, strategy);
  } catch (error) {
    console.warn(`Failed to register recovery strategy ${name}:`, error);
  }
};

export const getCustomStrategies = () => {
  return Array.from(customStrategies.keys());
};

/**
 * Political context helpers
 */
export const createPoliticalContext = (ward, options = {}) => {
  return {
    ward,
    campaign: options.campaign || 'lokdarpan',
    userRole: options.userRole || 'user',
    session: options.session || `sess_${Date.now()}`,
    timestamp: Date.now(),
    ...options
  };
};

/**
 * Error severity classification
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Error categories for classification
 */
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  DATA: 'data', 
  RENDERING: 'rendering',
  MEMORY: 'memory',
  POLITICAL_DATA: 'political-data',
  USER_INPUT: 'user-input',
  AUTHENTICATION: 'authentication',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
};

/**
 * Default error boundary props for common scenarios
 */
export const DEFAULT_ERROR_PROPS = {
  chart: {
    fallbackTitle: 'Chart Unavailable',
    fallbackMessage: 'This chart encountered an error but the data is still accessible.',
    showDataTable: true,
    allowExport: true
  },
  production: {
    fallbackTitle: 'Component Error',
    fallbackMessage: 'This component encountered an error. The issue has been logged and our team has been notified.',
    showRetryButton: true,
    maxRetries: 3
  },
  political: {
    preserveWardContext: true,
    enablePoliticalRecovery: true,
    campaignCritical: false
  }
};

export default {
  // Components
  ChartErrorBoundary,
  ProductionErrorBoundary,
  ErrorContextProvider,
  
  // HOCs
  withErrorBoundaries,
  withChartErrorBoundary,
  withProductionErrorBoundary,
  
  // Utilities
  executeErrorRecovery,
  getRecoveryStats,
  isErrorBoundariesEnabled,
  createErrorBoundaryConfig,
  createPoliticalContext,
  
  // Constants
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
  DEFAULT_ERROR_PROPS
};
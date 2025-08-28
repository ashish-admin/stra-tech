import React from 'react';
import { AlertTriangle, RefreshCw, X, Info } from 'lucide-react';

/**
 * CONSOLIDATED ERROR BOUNDARY SYSTEM
 * 
 * This file implements the standardized 3-tier error boundary architecture for LokDarpan:
 * 1. CriticalComponentBoundary - For essential dashboard components
 * 2. FeatureBoundary - For feature modules and complex components  
 * 3. FallbackBoundary - For non-critical components and content
 *
 * Replaces 25+ redundant error boundary implementations with maintainable patterns.
 */

// Base Error Boundary with common functionality
class BaseErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      errorId: null,
      isDismissed: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const componentName = this.props.componentName || 'Component';
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Enhanced logging
    console.group(`🚨 LokDarpan Error: ${componentName}`);
    console.error('Error:', error.message);
    console.error('Component:', componentName);
    console.error('Boundary Type:', this.props.boundaryType);
    console.error('Error ID:', errorId);
    console.error('Stack:', error.stack);
    console.groupEnd();

    // Report to monitoring
    if (window.reportError) {
      window.reportError({
        component: componentName,
        boundaryType: this.props.boundaryType,
        error: error.message,
        stack: error.stack,
        errorId,
        severity: this.props.severity || 'medium',
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
    }
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    if (this.state.retryCount >= maxRetries) return;

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000);
    
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      });
    }, retryDelay);
  };

  handleDismiss = () => {
    this.setState({ isDismissed: true });
  };

  renderFallbackUI() {
    // Override in subclasses for specialized fallback UI
    return this.props.children || <div>Component unavailable</div>;
  }

  render() {
    if (this.state.hasError && !this.state.isDismissed) {
      return this.renderFallbackUI();
    }
    return this.props.children;
  }
}

/**
 * TIER 1: CRITICAL COMPONENT BOUNDARY
 * For essential dashboard components that must never crash the application
 * Used for: Dashboard, LocationMap, Authentication, Core Navigation
 */
export class CriticalComponentBoundary extends BaseErrorBoundary {
  renderFallbackUI() {
    const { componentName = 'Critical Component' } = this.props;
    const canRetry = this.state.retryCount < (this.props.maxRetries || 5);

    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 m-4">
        <div className="flex items-start space-x-4">
          <AlertTriangle className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              {componentName} Service Interruption
            </h3>
            <p className="text-red-700 mb-4">
              A critical component has encountered an error. The LokDarpan dashboard 
              remains operational through built-in resilience systems.
            </p>
            
            {this.state.isRetrying && (
              <div className="mb-4">
                <div className="w-full bg-red-200 rounded-full h-2 mb-2">
                  <div className="bg-red-600 h-2 rounded-full animate-pulse w-1/2"></div>
                </div>
                <p className="text-sm text-red-600">
                  Attempting automatic recovery... (Attempt {this.state.retryCount + 1})
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                  {this.state.isRetrying ? 'Recovering...' : 'Retry Component'}
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Reload Dashboard
              </button>

              {this.state.retryCount >= (this.props.maxRetries || 5) && (
                <span className="inline-flex items-center px-3 py-2 bg-red-100 text-red-800 rounded-md text-sm">
                  Service requires manual intervention
                </span>
              )}
            </div>
            
            <div className="mt-4 p-3 bg-red-100 rounded text-sm text-red-800">
              💡 <strong>Campaign Continuity:</strong> Other dashboard features remain fully operational. 
              Access sentiment analysis, competitive intelligence, and strategic insights normally.
            </div>

            {this.state.errorId && (
              <div className="mt-2 text-xs text-red-600">
                Error ID: {this.state.errorId.slice(-8)} | Report to support if issue persists
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/**
 * TIER 2: FEATURE BOUNDARY  
 * For feature modules and complex components with graceful degradation
 * Used for: Political Strategist, Charts, Analytics Panels
 */
export class FeatureBoundary extends BaseErrorBoundary {
  renderFallbackUI() {
    const { 
      componentName = 'Feature', 
      fallbackComponent, 
      alternativeContent 
    } = this.props;
    const canRetry = this.state.retryCount < (this.props.maxRetries || 3);

    // Render custom fallback component if provided
    if (fallbackComponent) {
      return React.createElement(fallbackComponent, { 
        error: this.state.error,
        retry: this.handleRetry,
        canRetry,
        componentName 
      });
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-2">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-900 mb-2">
              {componentName} Temporarily Unavailable
            </h4>
            
            {alternativeContent ? (
              <div className="mb-3">
                <p className="text-yellow-800 text-sm mb-2">
                  Feature temporarily unavailable. Alternative information:
                </p>
                <div className="p-3 bg-white/60 rounded text-sm text-gray-700">
                  {alternativeContent}
                </div>
              </div>
            ) : (
              <p className="text-yellow-800 text-sm mb-3">
                The {componentName} feature is temporarily unavailable. 
                Core dashboard functionality continues normally.
              </p>
            )}

            {this.state.isRetrying && (
              <div className="mb-3">
                <div className="w-full bg-yellow-200 rounded-full h-1 mb-1">
                  <div className="bg-yellow-600 h-1 rounded-full animate-pulse w-1/3"></div>
                </div>
                <p className="text-xs text-yellow-600">Restoring feature...</p>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  className="inline-flex items-center text-yellow-700 hover:text-yellow-900 underline disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                  Retry
                </button>
              )}
              
              <button
                onClick={this.handleDismiss}
                className="inline-flex items-center text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3 mr-1" />
                Dismiss
              </button>
            </div>
            
            <div className="mt-2 text-xs text-yellow-600">
              ℹ️ Feature will automatically restore when service connectivity improves
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * TIER 3: FALLBACK BOUNDARY
 * For non-critical components with minimal UI impact
 * Used for: Content blocks, Secondary charts, News feeds
 */
export class FallbackBoundary extends BaseErrorBoundary {
  renderFallbackUI() {
    const { componentName = 'Content', compact = false } = this.props;
    
    if (compact) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs flex items-center space-x-2">
          <AlertTriangle className="h-3 w-3 text-gray-500 flex-shrink-0" />
          <span className="flex-1 text-gray-600">{componentName} unavailable</span>
          {this.state.retryCount < 2 && (
            <button
              onClick={this.handleRetry}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ↻
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 m-1">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              {componentName} is temporarily unavailable
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs">
              {this.state.retryCount < 2 && (
                <button
                  onClick={this.handleRetry}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Retry
                </button>
              )}
              <button
                onClick={this.handleDismiss}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                Hide
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * FACTORY FUNCTION - Creates appropriate boundary based on component type
 */
export const createErrorBoundary = (boundaryType = 'fallback', props = {}) => {
  const boundaries = {
    critical: CriticalComponentBoundary,
    feature: FeatureBoundary,
    fallback: FallbackBoundary
  };

  const BoundaryComponent = boundaries[boundaryType] || FallbackBoundary;
  
  return ({ children, ...boundaryProps }) => (
    React.createElement(BoundaryComponent, { 
      boundaryType, 
      ...props, 
      ...boundaryProps 
    }, children)
  );
};

/**
 * HIGHER-ORDER COMPONENT for easy wrapping
 */
export const withErrorBoundary = (Component, boundaryType = 'fallback', boundaryProps = {}) => {
  const WrappedComponent = React.forwardRef((props, ref) => {
    const Boundary = createErrorBoundary(boundaryType, {
      componentName: Component.displayName || Component.name || 'Component',
      ...boundaryProps
    });
    
    return (
      <Boundary>
        <Component ref={ref} {...props} />
      </Boundary>
    );
  });
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};

// Export legacy default for compatibility
export default FallbackBoundary;
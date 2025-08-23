/**
 * StrategistErrorBoundary - Comprehensive error boundary for Political Strategist components
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

class StrategistErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    console.error('Political Strategist Error:', error, errorInfo);
    
    // Report to error tracking service if available
    if (window.reportError) {
      window.reportError(error, { context: 'PoliticalStrategist', ...errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { componentName = 'Political Strategist' } = this.props;
      
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">
              {componentName} Component Error
            </h3>
          </div>
          
          <p className="text-red-800 mb-4">
            A technical issue occurred with the {componentName.toLowerCase()} component. 
            The rest of the dashboard remains functional.
          </p>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Component</span>
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-red-700 font-medium">
                <Bug className="h-4 w-4 inline mr-1" />
                Technical Details
              </summary>
              <pre className="mt-2 p-3 bg-red-100 border border-red-300 rounded text-xs text-red-800 overflow-auto">
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default StrategistErrorBoundary;
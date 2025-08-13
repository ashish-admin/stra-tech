import React from 'react';

/**
 * A reusable error boundary component.  This component catches JavaScript
 * errors anywhere in its child component tree and displays a fallback UI.
 * It also logs error details to the console.  Using an error boundary
 * prevents a single component failure from crashing the entire SPA,
 * satisfying the UI‑resilience mandate of Project LokDarpan.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Update state so the next render shows the fallback UI.
   */
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  /**
   * Log the error and error information.  In a production system
   * this could be sent to a logging/monitoring service.  In our
   * development environment we simply log to the console.
   */
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
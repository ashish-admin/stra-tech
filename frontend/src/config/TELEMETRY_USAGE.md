# LokDarpan Telemetry System Usage Guide

This document provides comprehensive guidance on using the LokDarpan telemetry system for error tracking, performance monitoring, and user analytics.

## Quick Start

### 1. Import the Telemetry Configuration

```javascript
import telemetryConfig from './config/telemetry.js';
import { telemetryServices, politicalContext } from './config/telemetry.js';
```

### 2. Basic Error Reporting

```javascript
import { politicalContext } from '../config/telemetry.js';

// Report an error with political context
const reportError = (error, componentName) => {
  const enrichedEvent = politicalContext.enrichEvent({
    type: 'error',
    data: {
      message: error.message,
      stack: error.stack,
      component: componentName
    }
  });

  // Send to internal telemetry endpoint
  fetch(telemetryConfig.endpoints.errors, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enrichedEvent)
  }).catch(console.error);
};
```

### 3. Performance Monitoring

```javascript
// Track component render performance
const trackComponentPerformance = (componentName, renderTime) => {
  if (!telemetryConfig.performanceMonitoring) return;

  const event = politicalContext.enrichEvent({
    type: 'performance',
    data: {
      metric: 'component_render_time',
      value: renderTime,
      component: componentName,
      ward: window.currentWard,
      analysisType: window.currentAnalysisType
    }
  });

  fetch(telemetryConfig.endpoints.performance, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  }).catch(console.error);
};

// Usage in React component
const MyComponent = () => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      trackComponentPerformance('MyComponent', renderTime);
    };
  }, []);
  
  return <div>Component content</div>;
};
```

## Service Integration

### Sentry Integration

```javascript
import * as Sentry from '@sentry/react';
import { sentryConfig } from '../config/telemetry.js';

// Initialize Sentry (usually in main.jsx)
if (sentryConfig.enabled) {
  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    sampleRate: sentryConfig.sampleRate,
    beforeSend: sentryConfig.beforeSend,
    beforeBreadcrumb: sentryConfig.beforeBreadcrumb
  });
}

// Create Sentry Error Boundary
const SentryErrorBoundary = Sentry.withErrorBoundary(YourComponent, {
  fallback: ({ error, resetError }) => (
    <div className="error-fallback">
      <h2>Political Dashboard Error</h2>
      <p>{error.message}</p>
      <button onClick={resetError}>Try again</button>
    </div>
  )
});
```

### DataDog RUM Integration

```javascript
import { datadogRum } from '@datadog/browser-rum';
import { datadogConfig } from '../config/telemetry.js';

// Initialize DataDog RUM (usually in main.jsx)
if (datadogConfig.enabled) {
  datadogRum.init({
    applicationId: datadogConfig.applicationId,
    clientToken: datadogConfig.clientToken,
    site: datadogConfig.site,
    service: datadogConfig.service,
    env: datadogConfig.env,
    version: datadogConfig.version,
    sessionSampleRate: datadogConfig.sessionSampleRate,
    sessionReplaySampleRate: datadogConfig.sessionReplaySampleRate,
    trackUserInteractions: datadogConfig.trackUserInteractions,
    trackResources: datadogConfig.trackResources,
    trackLongTasks: datadogConfig.trackLongTasks,
    defaultPrivacyLevel: datadogConfig.defaultPrivacyLevel,
    beforeSend: datadogConfig.beforeSend
  });

  datadogRum.startSessionReplayRecording();
}

// Add custom attributes for political context
const addPoliticalContext = (ward, analysisType) => {
  if (datadogConfig.enabled) {
    datadogRum.setGlobalContextProperty('ward', ward);
    datadogRum.setGlobalContextProperty('analysisType', analysisType);
    datadogRum.setGlobalContextProperty('userRole', window.userRole || 'viewer');
  }
};
```

### Google Analytics 4 Integration

```javascript
import { gtag } from 'ga-gtag';
import { ga4Config } from '../config/telemetry.js';

// Initialize GA4 (usually in main.jsx)
if (ga4Config.enabled) {
  gtag('config', ga4Config.measurementId, ga4Config.config);
  
  // Set consent preferences
  gtag('consent', 'default', ga4Config.gtagConsent);
}

// Track political intelligence events
const trackPoliticalEvent = (action, ward, analysisType) => {
  if (ga4Config.enabled) {
    gtag('event', action, {
      event_category: 'political_intelligence',
      event_label: ward,
      custom_parameter_1: ward,
      custom_parameter_2: analysisType,
      custom_parameter_3: window.userRole || 'viewer'
    });
  }
};

// Usage examples
trackPoliticalEvent('ward_analysis_view', 'Jubilee Hills', 'sentiment');
trackPoliticalEvent('strategic_summary_request', 'All', 'competitive');
```

## Error Boundary Integration

### Enhanced Error Boundary with Telemetry

```javascript
import React from 'react';
import { politicalContext, telemetryConfig } from '../config/telemetry.js';

class TelemetryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Report to internal telemetry
    this.reportError(error, errorInfo);
    
    // Report to external services if enabled
    this.reportToExternalServices(error, errorInfo);
  }

  reportError = async (error, errorInfo) => {
    if (!telemetryConfig.errorReporting) return;

    const errorEvent = politicalContext.enrichEvent({
      type: 'error',
      data: {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        component: this.props.componentName || 'Unknown',
        severity: this.getSeverity(error),
        tags: politicalContext.getErrorTags(error)
      }
    });

    try {
      await fetch(telemetryConfig.endpoints.errors, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorEvent)
      });
    } catch (telemetryError) {
      console.error('Failed to report error to telemetry:', telemetryError);
    }
  };

  reportToExternalServices = (error, errorInfo) => {
    // Report to Sentry if available
    if (window.Sentry) {
      window.Sentry.withScope((scope) => {
        scope.setTag('component', this.props.componentName);
        scope.setTag('ward', window.currentWard);
        scope.setTag('analysisType', window.currentAnalysisType);
        scope.setContext('errorInfo', errorInfo);
        window.Sentry.captureException(error);
      });
    }

    // Report to DataDog if available
    if (window.DD_RUM) {
      window.DD_RUM.addError(error, {
        component: this.props.componentName,
        ward: window.currentWard,
        analysisType: window.currentAnalysisType
      });
    }
  };

  getSeverity = (error) => {
    // Determine error severity based on political context
    if (error.message?.includes('Strategist') || error.message?.includes('Strategic')) {
      return 'critical'; // Strategic analysis errors are critical
    } else if (error.message?.includes('Chart') || error.message?.includes('visualization')) {
      return 'high'; // Data visualization errors affect UX
    } else if (error.message?.includes('Map') || error.message?.includes('Location')) {
      return 'medium'; // Map errors can be recovered
    }
    return 'low';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-800">Component Error</h3>
          </div>
          
          <p className="text-red-700 mb-4">
            {this.props.componentName || 'This component'} encountered an error. 
            The rest of the political dashboard remains functional.
          </p>
          
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
          
          {telemetryConfig.debug && (
            <details className="mt-4">
              <summary className="cursor-pointer text-red-600">Error Details</summary>
              <pre className="mt-2 text-xs text-red-800 bg-red-100 p-2 rounded overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default TelemetryErrorBoundary;
```

## Performance Monitoring Hooks

### Custom Performance Hook

```javascript
import { useEffect, useRef } from 'react';
import { telemetryConfig, politicalContext } from '../config/telemetry.js';

export const usePerformanceTracking = (componentName, dependencies = []) => {
  const startTimeRef = useRef(performance.now());
  const mountTimeRef = useRef(null);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      if (!telemetryConfig.performanceMonitoring) return;

      const unmountTime = performance.now();
      const totalLifetime = unmountTime - startTimeRef.current;
      const mountTime = mountTimeRef.current - startTimeRef.current;

      const performanceEvent = politicalContext.enrichEvent({
        type: 'performance',
        data: {
          metric: 'component_lifecycle',
          component: componentName,
          mountTime,
          totalLifetime,
          ward: window.currentWard,
          analysisType: window.currentAnalysisType
        }
      });

      fetch(telemetryConfig.endpoints.performance, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(performanceEvent)
      }).catch(console.error);
    };
  }, dependencies);

  const trackCustomMetric = (metricName, value, unit = 'ms') => {
    if (!telemetryConfig.performanceMonitoring) return;

    const event = politicalContext.enrichEvent({
      type: 'performance',
      data: {
        metric: metricName,
        value,
        unit,
        component: componentName,
        timestamp: Date.now()
      }
    });

    fetch(telemetryConfig.endpoints.performance, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(console.error);
  };

  return { trackCustomMetric };
};

// Usage in components
const DashboardComponent = () => {
  const { trackCustomMetric } = usePerformanceTracking('Dashboard', []);

  const handleDataLoad = async () => {
    const startTime = performance.now();
    
    try {
      await loadDashboardData();
      trackCustomMetric('data_load_success', performance.now() - startTime);
    } catch (error) {
      trackCustomMetric('data_load_error', performance.now() - startTime);
      throw error;
    }
  };

  return <div>Dashboard content</div>;
};
```

## Best Practices

### 1. Sampling Strategy
- **Development**: Use 100% sampling for comprehensive debugging
- **Production**: Use 10% or lower sampling to reduce overhead
- **Critical Components**: Consider higher sampling for strategic analysis components

### 2. Error Context Enrichment
Always include political context when reporting errors:

```javascript
const reportPoliticalError = (error, component) => {
  const enrichedError = {
    ...error,
    context: {
      ward: window.currentWard,
      analysisType: window.currentAnalysisType,
      userRole: window.userRole,
      campaignId: window.campaignId,
      timestamp: new Date().toISOString()
    }
  };
  
  // Report to telemetry services
  reportError(enrichedError, component);
};
```

### 3. Performance Budget Monitoring
Monitor against defined performance budgets:

```javascript
const checkPerformanceBudget = (metric, value) => {
  const budgets = {
    loadTime: parseInt(import.meta.env.VITE_PERFORMANCE_BUDGET_LOAD_TIME),
    apiResponse: parseInt(import.meta.env.VITE_PERFORMANCE_BUDGET_API_RESPONSE),
    renderTime: parseInt(import.meta.env.VITE_PERFORMANCE_BUDGET_RENDER_TIME)
  };

  if (value > budgets[metric]) {
    // Report budget violation
    reportPerformanceViolation(metric, value, budgets[metric]);
  }
};
```

### 4. Privacy Compliance
Respect user privacy preferences:

```javascript
const shouldTrack = () => {
  if (import.meta.env.VITE_RESPECT_DO_NOT_TRACK === 'true' && 
      navigator.doNotTrack === '1') {
    return false;
  }
  
  if (import.meta.env.VITE_ANONYMIZE_USER_DATA === 'true') {
    // Anonymize sensitive data before tracking
    return 'anonymized';
  }
  
  return true;
};
```

### 5. Error Recovery Strategies
Implement graceful error recovery:

```javascript
const withErrorRecovery = (Component, fallbackComponent) => {
  return (props) => (
    <TelemetryErrorBoundary componentName={Component.name}>
      <Suspense fallback={<LoadingSpinner />}>
        <Component {...props} />
      </Suspense>
    </TelemetryErrorBoundary>
  );
};
```

## Environment-Specific Configuration

### Development Environment
- Enable all telemetry features for debugging
- Use 100% sampling rate
- Enable detailed console logging
- Use local telemetry endpoints

### Production Environment
- Use reduced sampling rates (5-10%)
- Enable privacy features
- Use production telemetry endpoints
- Disable debug logging

### Staging Environment
- Use moderate sampling rates (25-50%)
- Enable debug features for testing
- Use separate telemetry instances from production

## Troubleshooting

### Common Issues

1. **Telemetry Not Working**
   - Check environment variables are properly set
   - Verify telemetry endpoints are accessible
   - Ensure sampling rate is not 0

2. **High Overhead**
   - Reduce sampling rate
   - Disable non-critical telemetry features
   - Use async reporting to avoid blocking UI

3. **Missing Context**
   - Ensure political context variables are set globally
   - Use context enrichment for all events
   - Verify ward and analysis type are updated properly

### Debug Mode
Enable debug mode for troubleshooting:

```javascript
// Set in environment
VITE_TELEMETRY_DEBUG=true

// Or programmatically
window.TELEMETRY_DEBUG = true;
```

This comprehensive guide should help developers effectively implement and use the LokDarpan telemetry system for robust error tracking, performance monitoring, and user analytics.
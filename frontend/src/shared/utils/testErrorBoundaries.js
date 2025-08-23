// Error boundary testing utility for LokDarpan Dashboard
export const testErrorBoundaries = () => {
  console.log('🧪 Testing LokDarpan Error Boundary System...');

  // Test component error simulation
  const triggerComponentError = (componentName, errorType = 'render') => {
    const errors = {
      render: new Error(`Simulated render error in ${componentName}`),
      api: new Error(`API connection failed for ${componentName}`),
      timeout: new Error(`Request timeout in ${componentName}`),
      memory: new Error(`Memory allocation failed in ${componentName}`)
    };

    const error = errors[errorType] || errors.render;
    
    // Simulate error in component
    if (window.reportError) {
      window.reportError({
        component: componentName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        simulated: true
      });
    }

    console.log(`🔴 Simulated ${errorType} error in ${componentName}:`, error.message);
    return error;
  };

  // Test error recovery
  const testRecovery = (componentName, delay = 2000) => {
    setTimeout(() => {
      console.log(`🟢 Testing recovery for ${componentName}`);
      if (window.healthMonitor) {
        window.healthMonitor.markRecovered(componentName);
      }
    }, delay);
  };

  // Test error cascade isolation
  const testCascadeIsolation = () => {
    const components = [
      'Interactive Map',
      'Strategic Analysis', 
      'Sentiment Chart',
      'Time Series Chart'
    ];

    console.log('🧪 Testing cascade isolation - triggering multiple errors...');
    
    components.forEach((component, index) => {
      setTimeout(() => {
        triggerComponentError(component, 'api');
        // Test recovery after 3 seconds
        testRecovery(component, 3000);
      }, index * 500);
    });
  };

  // Test health monitoring
  const testHealthMonitoring = () => {
    console.log('📊 Testing health monitoring system...');
    
    if (window.healthMonitor) {
      // Get initial health
      const initialHealth = window.healthMonitor.getDashboardHealth();
      console.log('Initial health:', initialHealth);

      // Trigger some errors
      triggerComponentError('Interactive Map', 'timeout');
      triggerComponentError('Strategic Analysis', 'api');

      // Check health after errors
      setTimeout(() => {
        const healthAfterErrors = window.healthMonitor.getDashboardHealth();
        console.log('Health after errors:', healthAfterErrors);

        // Test recovery
        window.healthMonitor.markRecovered('Interactive Map');
        window.healthMonitor.markRecovered('Strategic Analysis');

        setTimeout(() => {
          const healthAfterRecovery = window.healthMonitor.getDashboardHealth();
          console.log('Health after recovery:', healthAfterRecovery);
        }, 1000);
      }, 1000);
    }
  };

  // Test error metrics
  const testErrorMetrics = () => {
    console.log('📈 Testing error metrics...');
    
    if (window.errorMetrics) {
      const initialMetrics = window.errorMetrics;
      console.log('Initial metrics:', initialMetrics);

      // Trigger tracked errors
      if (window.trackComponentError) {
        window.trackComponentError('Interactive Map');
        window.trackComponentError('Strategic Analysis');
        window.trackComponentError('Interactive Map'); // Duplicate to test counting
      }

      console.log('Metrics after errors:', window.errorMetrics);
    }
  };

  // Run all tests
  return {
    triggerComponentError,
    testRecovery,
    testCascadeIsolation,
    testHealthMonitoring,
    testErrorMetrics,
    runAllTests: () => {
      console.log('🚀 Running comprehensive error boundary tests...');
      testHealthMonitoring();
      setTimeout(() => testErrorMetrics(), 2000);
      setTimeout(() => testCascadeIsolation(), 4000);
      console.log('✅ Error boundary tests initiated. Check console for results.');
    }
  };
};

// Make available globally for development
if (typeof window !== 'undefined') {
  window.testErrorBoundaries = testErrorBoundaries();
}

export default testErrorBoundaries;
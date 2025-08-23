// Component Error Boundary Testing Utilities
// Tools for simulating component failures during development and testing

import { healthMonitor } from './componentHealth.js';

export class ComponentFailureSimulator {
  constructor() {
    this.activeFailures = new Map();
    this.originalConsoleError = console.error;
    this.simulationActive = false;
  }

  // Start simulation mode (suppresses console errors for cleaner testing)
  startSimulation() {
    this.simulationActive = true;
    console.error = (...args) => {
      if (args[0]?.includes?.('ComponentFailureSimulator')) {
        // Suppress simulated errors from cluttering console
        return;
      }
      this.originalConsoleError.apply(console, args);
    };
    
    console.log('🧪 Component Failure Simulation ACTIVE');
  }

  // Stop simulation mode
  stopSimulation() {
    this.simulationActive = false;
    console.error = this.originalConsoleError;
    this.activeFailures.clear();
    console.log('✅ Component Failure Simulation STOPPED');
  }

  // Simulate a specific component failure
  simulateComponentFailure(componentName, errorType = 'generic') {
    const errors = {
      generic: new Error(`ComponentFailureSimulator: Simulated generic error in ${componentName}`),
      network: new Error(`ComponentFailureSimulator: Network timeout in ${componentName}`),
      memory: new Error(`ComponentFailureSimulator: Memory allocation failed in ${componentName}`),
      render: new Error(`ComponentFailureSimulator: Render cycle error in ${componentName}`),
      api: new Error(`ComponentFailureSimulator: API call failed in ${componentName}`),
      timeout: new Error(`ComponentFailureSimulator: Operation timeout in ${componentName}`),
      data: new Error(`ComponentFailureSimulator: Invalid data format in ${componentName}`),
      permission: new Error(`ComponentFailureSimulator: Permission denied in ${componentName}`)
    };

    const error = errors[errorType] || errors.generic;
    
    this.activeFailures.set(componentName, {
      error,
      errorType,
      startTime: Date.now(),
      isActive: true
    });

    // Report to health monitor
    healthMonitor.reportError(componentName, error);

    console.log(`🚨 Simulating ${errorType} failure in ${componentName}`);
    return error;
  }

  // Clear failure for specific component (simulate recovery)
  clearComponentFailure(componentName) {
    if (this.activeFailures.has(componentName)) {
      this.activeFailures.delete(componentName);
      healthMonitor.markRecovered(componentName);
      console.log(`✅ Cleared failure simulation for ${componentName}`);
    }
  }

  // Check if component failure is being simulated
  isComponentFailureActive(componentName) {
    return this.activeFailures.has(componentName);
  }

  // Get current simulation status
  getSimulationStatus() {
    return {
      active: this.simulationActive,
      failures: Object.fromEntries(
        Array.from(this.activeFailures.entries()).map(([name, data]) => [
          name, 
          {
            errorType: data.errorType,
            duration: Date.now() - data.startTime,
            isActive: data.isActive
          }
        ])
      )
    };
  }
}

// Global simulator instance
export const failureSimulator = new ComponentFailureSimulator();

// Critical component failure scenarios for LokDarpan testing
export const CRITICAL_COMPONENT_SCENARIOS = {
  'LocationMap': {
    scenarios: [
      { type: 'render', description: 'Leaflet map initialization failure' },
      { type: 'data', description: 'GeoJSON data corruption' },
      { type: 'memory', description: 'Large polygon rendering memory issue' },
      { type: 'api', description: 'Ward boundary data API failure' }
    ]
  },
  'StrategicSummary': {
    scenarios: [
      { type: 'api', description: 'Strategic analysis API timeout' },
      { type: 'network', description: 'External service unavailable' },
      { type: 'data', description: 'Malformed analysis response' },
      { type: 'timeout', description: 'Analysis processing timeout' }
    ]
  },
  'TimeSeriesChart': {
    scenarios: [
      { type: 'data', description: 'Invalid time series data format' },
      { type: 'render', description: 'Chart rendering engine failure' },
      { type: 'memory', description: 'Large dataset memory overflow' },
      { type: 'generic', description: 'Chart library exception' }
    ]
  },
  'AlertsPanel': {
    scenarios: [
      { type: 'network', description: 'WebSocket connection failure' },
      { type: 'data', description: 'Malformed alert payload' },
      { type: 'permission', description: 'Notification permission denied' },
      { type: 'api', description: 'Alert service API failure' }
    ]
  },
  'CompetitorTrendChart': {
    scenarios: [
      { type: 'data', description: 'Competitor data parsing error' },
      { type: 'render', description: 'Chart rendering failure' },
      { type: 'api', description: 'Competitive analysis API error' },
      { type: 'timeout', description: 'Data processing timeout' }
    ]
  }
};

// Batch testing utilities
export const runCriticalComponentTests = async () => {
  console.log('🧪 Starting Critical Component Isolation Tests');
  failureSimulator.startSimulation();
  
  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    components: {}
  };

  for (const [componentName, config] of Object.entries(CRITICAL_COMPONENT_SCENARIOS)) {
    console.log(`\n🔍 Testing component: ${componentName}`);
    results.components[componentName] = {
      scenarios: [],
      status: 'unknown'
    };

    for (const scenario of config.scenarios) {
      results.totalTests++;
      
      try {
        // Simulate the failure
        failureSimulator.simulateComponentFailure(componentName, scenario.type);
        
        // Wait for error boundary to catch
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if health monitor recorded the error
        const componentStatus = healthMonitor.getComponentStatus(componentName);
        
        if (componentStatus && componentStatus.status === 'error') {
          console.log(`  ✅ ${scenario.description}: Error boundary caught`);
          results.passed++;
          results.components[componentName].scenarios.push({
            ...scenario,
            result: 'passed'
          });
        } else {
          console.log(`  ❌ ${scenario.description}: Error boundary failed`);
          results.failed++;
          results.components[componentName].scenarios.push({
            ...scenario,
            result: 'failed'
          });
        }

        // Clear the failure
        failureSimulator.clearComponentFailure(componentName);
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`  ❌ ${scenario.description}: Test execution error`);
        results.failed++;
        results.components[componentName].scenarios.push({
          ...scenario,
          result: 'error',
          error: error.message
        });
      }
    }

    // Determine component status
    const componentResults = results.components[componentName].scenarios;
    const passed = componentResults.filter(s => s.result === 'passed').length;
    const total = componentResults.length;
    
    results.components[componentName].status = 
      passed === total ? 'passed' : 
      passed > 0 ? 'partial' : 'failed';
  }

  failureSimulator.stopSimulation();

  // Generate summary report
  console.log('\n📊 Test Results Summary:');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.totalTests) * 100)}%`);

  // Component-level summary
  console.log('\n📋 Component Status:');
  for (const [name, data] of Object.entries(results.components)) {
    const statusEmoji = {
      passed: '✅',
      partial: '⚠️',
      failed: '❌',
      unknown: '❓'
    };
    console.log(`  ${statusEmoji[data.status]} ${name}: ${data.status}`);
  }

  return results;
};

// Quick test for dashboard resilience (simulate multiple simultaneous failures)
export const testDashboardResilience = async () => {
  console.log('🛡️ Testing Dashboard Resilience (Multiple Failures)');
  failureSimulator.startSimulation();

  const criticalComponents = ['LocationMap', 'StrategicSummary', 'TimeSeriesChart'];
  
  // Simulate simultaneous failures
  console.log('Simulating multiple component failures simultaneously...');
  for (const component of criticalComponents) {
    failureSimulator.simulateComponentFailure(component, 'generic');
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Check dashboard health
  const dashboardHealth = healthMonitor.getDashboardHealth();
  console.log(`Dashboard Health Score: ${dashboardHealth.healthScore}%`);
  console.log(`Healthy Components: ${dashboardHealth.healthyComponents}/${dashboardHealth.totalComponents}`);
  console.log(`Error Components: ${dashboardHealth.errorComponents}`);

  // Check if dashboard is still functional (>= 60% health)
  const isResilient = dashboardHealth.healthScore >= 60;
  console.log(`Dashboard Resilience: ${isResilient ? '✅ PASSED' : '❌ FAILED'}`);

  // Clear all failures
  for (const component of criticalComponents) {
    failureSimulator.clearComponentFailure(component);
  }

  failureSimulator.stopSimulation();
  return { isResilient, dashboardHealth };
};

// Development utilities
export const addFailureControls = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return;
  }

  // Add global testing functions for development
  window.lokdarpanTesting = {
    // Component failure simulation
    simulateFailure: (component, type = 'generic') => {
      return failureSimulator.simulateComponentFailure(component, type);
    },
    
    clearFailure: (component) => {
      failureSimulator.clearComponentFailure(component);
    },
    
    // Batch testing
    testAllComponents: runCriticalComponentTests,
    testResilience: testDashboardResilience,
    
    // Monitoring
    getHealthStatus: () => healthMonitor.getDashboardHealth(),
    getSimulationStatus: () => failureSimulator.getSimulationStatus(),
    
    // Available scenarios
    scenarios: CRITICAL_COMPONENT_SCENARIOS
  };

  console.log('🧪 LokDarpan Testing Tools Available:');
  console.log('  window.lokdarpanTesting.simulateFailure("LocationMap", "render")');
  console.log('  window.lokdarpanTesting.testAllComponents()');
  console.log('  window.lokdarpanTesting.testResilience()');
  console.log('  window.lokdarpanTesting.getHealthStatus()');
};

export default failureSimulator;
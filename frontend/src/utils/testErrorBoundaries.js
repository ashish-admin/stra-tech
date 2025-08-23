/**
 * Manual Error Boundary Testing Utilities
 * Interactive testing tools for validating component resilience
 */

import { failureSimulator, runCriticalComponentTests, testDashboardResilience } from './componentFailureSimulator.js';
import { healthMonitor } from './componentHealth.js';

// Initialize testing environment
export const initializeErrorBoundaryTesting = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return;
  }

  // Add testing tools to global scope
  window.LokDarpanErrorTesting = {
    // Individual component testing
    testComponent: (componentName, errorType = 'render') => {
      console.log(`🧪 Testing error boundary for: ${componentName}`);
      failureSimulator.startSimulation();
      const error = failureSimulator.simulateComponentFailure(componentName, errorType);
      
      setTimeout(() => {
        const status = healthMonitor.getComponentStatus(componentName);
        console.log(`📊 Component Status:`, status);
        
        // Auto-clear after 5 seconds for demo
        setTimeout(() => {
          failureSimulator.clearComponentFailure(componentName);
          failureSimulator.stopSimulation();
          console.log(`✅ Test completed for ${componentName}`);
        }, 5000);
      }, 100);
      
      return error;
    },

    // Test all critical components
    testAllComponents: async () => {
      console.log('🚀 Starting comprehensive component error boundary test');
      const results = await runCriticalComponentTests();
      
      console.log('📊 Test Results:');
      console.log(`  Total Tests: ${results.totalTests}`);
      console.log(`  Passed: ${results.passed}`);
      console.log(`  Failed: ${results.failed}`);
      console.log(`  Success Rate: ${Math.round((results.passed / results.totalTests) * 100)}%`);
      
      return results;
    },

    // Test dashboard resilience
    testResilience: async () => {
      console.log('🛡️ Testing dashboard resilience with multiple failures');
      const result = await testDashboardResilience();
      
      console.log('🏁 Resilience Test Results:');
      console.log(`  Dashboard Resilience: ${result.isResilient ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`  Health Score: ${result.dashboardHealth.healthScore}%`);
      console.log(`  Healthy Components: ${result.dashboardHealth.healthyComponents}/${result.dashboardHealth.totalComponents}`);
      
      return result;
    },

    // Interactive component failure simulation
    simulateFailure: (componentName, errorType) => {
      const availableComponents = [
        'Interactive Map',
        'Strategic Analysis', 
        'Time Series Chart',
        'Competitor Trend Chart',
        'Intelligence Alerts',
        'Sentiment Chart',
        'Competitive Analysis'
      ];

      const availableErrors = [
        'render', 'api', 'network', 'data', 'timeout', 'memory', 'permission'
      ];

      if (!availableComponents.includes(componentName)) {
        console.warn(`⚠️ Component "${componentName}" not in test list. Available:`, availableComponents);
        return null;
      }

      if (!availableErrors.includes(errorType)) {
        console.warn(`⚠️ Error type "${errorType}" not available. Available:`, availableErrors);
        return null;
      }

      failureSimulator.startSimulation();
      const error = failureSimulator.simulateComponentFailure(componentName, errorType);
      
      console.log(`💥 Simulated ${errorType} error in ${componentName}`);
      console.log('   Use clearFailure() to recover or stopSimulation() to clear all');
      
      return error;
    },

    // Clear specific component failure
    clearFailure: (componentName) => {
      failureSimulator.clearComponentFailure(componentName);
      const status = healthMonitor.getComponentStatus(componentName);
      console.log(`✅ Cleared failure for ${componentName}`, status);
    },

    // Stop all failure simulation
    stopSimulation: () => {
      failureSimulator.stopSimulation();
      console.log('🛑 All failure simulation stopped');
    },

    // Get current system health
    getHealth: () => {
      const health = healthMonitor.getDashboardHealth();
      console.log('🏥 Current Dashboard Health:', health);
      return health;
    },

    // Get simulation status
    getStatus: () => {
      const status = failureSimulator.getSimulationStatus();
      console.log('📊 Simulation Status:', status);
      return status;
    },

    // Helper to show available commands
    help: () => {
      console.log('🔧 LokDarpan Error Boundary Testing Commands:');
      console.log('');
      console.log('📊 Quick Tests:');
      console.log('  LokDarpanErrorTesting.testComponent("Interactive Map", "render")');
      console.log('  LokDarpanErrorTesting.testAllComponents()');
      console.log('  LokDarpanErrorTesting.testResilience()');
      console.log('');
      console.log('💥 Manual Simulation:');
      console.log('  LokDarpanErrorTesting.simulateFailure("Strategic Analysis", "api")');
      console.log('  LokDarpanErrorTesting.clearFailure("Strategic Analysis")');
      console.log('  LokDarpanErrorTesting.stopSimulation()');
      console.log('');
      console.log('📈 Monitoring:');
      console.log('  LokDarpanErrorTesting.getHealth()');
      console.log('  LokDarpanErrorTesting.getStatus()');
    }
  };

  // Quick access shortcuts
  window.testErrorBoundary = window.LokDarpanErrorTesting.testComponent;
  window.testAllErrorBoundaries = window.LokDarpanErrorTesting.testAllComponents;
  window.testDashboardResilience = window.LokDarpanErrorTesting.testResilience;
  
  console.log('🧪 LokDarpan Error Boundary Testing Initialized');
  console.log('   Run LokDarpanErrorTesting.help() for commands');
  console.log('   Quick test: testErrorBoundary("Interactive Map", "render")');
};

export default {
  initializeErrorBoundaryTesting
};
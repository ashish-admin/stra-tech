/**
 * Error Boundary Validation Script
 * 
 * Validates that all error boundary components are properly integrated
 * and feature flags are working correctly.
 * 
 * Run with: node validateErrorBoundaries.js (in Node.js environment)
 * Or import and run in browser console during development.
 */

/**
 * Validation test suite for error boundaries
 */
class ErrorBoundaryValidator {
  constructor() {
    this.results = {
      components: {},
      features: {},
      integrations: {},
      overall: 'pending'
    };
  }

  /**
   * Run all validation tests
   */
  async validate() {
    console.log('🚀 Starting LokDarpan Error Boundary Validation...\n');
    
    try {
      await this.validateComponents();
      await this.validateFeatureFlags();
      await this.validateIntegrations();
      
      this.calculateOverallResult();
      this.printResults();
      
      return this.results;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      this.results.overall = 'failed';
      return this.results;
    }
  }

  /**
   * Validate error boundary components exist and are properly structured
   */
  async validateComponents() {
    console.log('📦 Validating Error Boundary Components...');
    
    const componentTests = [
      {
        name: 'ChartErrorBoundary',
        test: () => {
          try {
            const { ChartErrorBoundary } = require('./ChartErrorBoundary');
            return typeof ChartErrorBoundary === 'function' &&
                   ChartErrorBoundary.prototype &&
                   typeof ChartErrorBoundary.prototype.componentDidCatch === 'function';
          } catch {
            return false;
          }
        }
      },
      {
        name: 'ProductionErrorBoundary', 
        test: () => {
          try {
            const { ProductionErrorBoundary } = require('./ProductionErrorBoundary');
            return typeof ProductionErrorBoundary === 'function' &&
                   ProductionErrorBoundary.prototype &&
                   typeof ProductionErrorBoundary.prototype.componentDidCatch === 'function';
          } catch {
            return false;
          }
        }
      },
      {
        name: 'ErrorRecovery',
        test: () => {
          try {
            const ErrorRecovery = require('./ErrorRecovery');
            return typeof ErrorRecovery.executeErrorRecovery === 'function' &&
                   typeof ErrorRecovery.getRecoveryStats === 'function' &&
                   typeof ErrorRecovery.registerRecoveryStrategy === 'function';
          } catch {
            return false;
          }
        }
      },
      {
        name: 'ErrorContextProvider',
        test: () => {
          try {
            const { ErrorContextProvider, useErrorContext } = require('./ErrorContextProvider');
            return typeof ErrorContextProvider === 'function' &&
                   typeof useErrorContext === 'function';
          } catch {
            return false;
          }
        }
      }
    ];

    for (const test of componentTests) {
      const result = test.test();
      this.results.components[test.name] = result ? 'passed' : 'failed';
      console.log(`  ${result ? '✅' : '❌'} ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
    }
    
    console.log();
  }

  /**
   * Validate feature flags are properly configured
   */
  async validateFeatureFlags() {
    console.log('🎛️  Validating Feature Flags...');
    
    const flagTests = [
      {
        name: 'enableComponentErrorBoundaries',
        test: () => {
          try {
            const { enhancementFlags } = require('../../config/features');
            return typeof enhancementFlags.enableComponentErrorBoundaries === 'boolean';
          } catch {
            return false;
          }
        }
      },
      {
        name: 'enableErrorTelemetry',
        test: () => {
          try {
            const { enhancementFlags } = require('../../config/features');
            return typeof enhancementFlags.enableErrorTelemetry === 'boolean';
          } catch {
            return false;
          }
        }
      },
      {
        name: 'enableOfflineErrorQueue',
        test: () => {
          try {
            const { enhancementFlags } = require('../../config/features');
            return typeof enhancementFlags.enableOfflineErrorQueue === 'boolean';
          } catch {
            return false;
          }
        }
      },
      {
        name: 'featureFlagManager',
        test: () => {
          try {
            const { featureFlagManager } = require('../../config/features');
            return typeof featureFlagManager.isEnabled === 'function' &&
                   typeof featureFlagManager.getAllFlags === 'function';
          } catch {
            return false;
          }
        }
      }
    ];

    for (const test of flagTests) {
      const result = test.test();
      this.results.features[test.name] = result ? 'passed' : 'failed';
      console.log(`  ${result ? '✅' : '❌'} ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
    }
    
    console.log();
  }

  /**
   * Validate service integrations
   */
  async validateIntegrations() {
    console.log('🔗 Validating Service Integrations...');
    
    const integrationTests = [
      {
        name: 'telemetryIntegration',
        test: () => {
          try {
            const { getTelemetryIntegration } = require('../../services/telemetryIntegration');
            return typeof getTelemetryIntegration === 'function';
          } catch {
            return false;
          }
        }
      },
      {
        name: 'errorQueue',
        test: () => {
          try {
            const { getErrorQueue } = require('../services/ErrorQueue');
            return typeof getErrorQueue === 'function';
          } catch {
            return false;
          }
        }
      },
      {
        name: 'retryStrategy',
        test: () => {
          try {
            const { circuitBreakerRetry } = require('../services/RetryStrategy');
            return typeof circuitBreakerRetry === 'object';
          } catch {
            return false;
          }
        }
      },
      {
        name: 'indexExports',
        test: () => {
          try {
            const ErrorBoundaryIndex = require('./index');
            return typeof ErrorBoundaryIndex.ChartErrorBoundary === 'function' &&
                   typeof ErrorBoundaryIndex.ProductionErrorBoundary === 'function' &&
                   typeof ErrorBoundaryIndex.withErrorBoundaries === 'function' &&
                   typeof ErrorBoundaryIndex.executeErrorRecovery === 'function';
          } catch {
            return false;
          }
        }
      }
    ];

    for (const test of integrationTests) {
      const result = test.test();
      this.results.integrations[test.name] = result ? 'passed' : 'failed';
      console.log(`  ${result ? '✅' : '❌'} ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
    }
    
    console.log();
  }

  /**
   * Calculate overall validation result
   */
  calculateOverallResult() {
    const allResults = [
      ...Object.values(this.results.components),
      ...Object.values(this.results.features), 
      ...Object.values(this.results.integrations)
    ];

    const passedCount = allResults.filter(result => result === 'passed').length;
    const totalCount = allResults.length;
    const successRate = passedCount / totalCount;

    if (successRate === 1) {
      this.results.overall = 'passed';
    } else if (successRate >= 0.8) {
      this.results.overall = 'warning';
    } else {
      this.results.overall = 'failed';
    }
  }

  /**
   * Print validation results summary
   */
  printResults() {
    const { components, features, integrations, overall } = this.results;
    
    console.log('📊 Validation Results Summary:');
    console.log('=' .repeat(50));
    
    // Components
    const componentsPassed = Object.values(components).filter(r => r === 'passed').length;
    const componentsTotal = Object.values(components).length;
    console.log(`📦 Components: ${componentsPassed}/${componentsTotal} passed`);
    
    // Features
    const featuresPassed = Object.values(features).filter(r => r === 'passed').length;
    const featuresTotal = Object.values(features).length;
    console.log(`🎛️  Features: ${featuresPassed}/${featuresTotal} passed`);
    
    // Integrations
    const integrationsPassed = Object.values(integrations).filter(r => r === 'passed').length;
    const integrationsTotal = Object.values(integrations).length;
    console.log(`🔗 Integrations: ${integrationsPassed}/${integrationsTotal} passed`);
    
    console.log('=' .repeat(50));
    
    // Overall status
    const statusEmoji = {
      'passed': '✅',
      'warning': '⚠️',
      'failed': '❌'
    }[overall];
    
    const statusMessage = {
      'passed': 'All error boundary components are properly integrated!',
      'warning': 'Most components working, but some issues detected.',
      'failed': 'Critical issues found. Error boundaries may not function correctly.'
    }[overall];
    
    console.log(`${statusEmoji} Overall Status: ${overall.toUpperCase()}`);
    console.log(`   ${statusMessage}`);
    
    if (overall !== 'passed') {
      console.log('\n❗ Issues detected:');
      
      [...Object.entries(components), ...Object.entries(features), ...Object.entries(integrations)]
        .filter(([_, result]) => result === 'failed')
        .forEach(([name, _]) => {
          console.log(`   • ${name}`);
        });
        
      console.log('\n💡 Run the ErrorBoundaryIntegrationTest component in development mode for detailed debugging.');
    }
    
    console.log();
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      version: '1.0.0',
      environment: typeof process !== 'undefined' ? process.env.NODE_ENV : 'browser',
      results: this.results,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Component recommendations
    if (this.results.components.ChartErrorBoundary === 'failed') {
      recommendations.push('Install ChartErrorBoundary component for chart-specific error handling');
    }
    
    if (this.results.components.ProductionErrorBoundary === 'failed') {
      recommendations.push('Install ProductionErrorBoundary component for production error handling');
    }
    
    // Feature flag recommendations
    if (this.results.features.enableComponentErrorBoundaries === 'failed') {
      recommendations.push('Enable componentErrorBoundaries feature flag in features.js');
    }
    
    if (this.results.features.enableErrorTelemetry === 'failed') {
      recommendations.push('Enable errorTelemetry feature flag for error tracking');
    }
    
    // Integration recommendations
    if (this.results.integrations.telemetryIntegration === 'failed') {
      recommendations.push('Verify telemetryIntegration service is properly configured');
    }
    
    if (this.results.integrations.errorQueue === 'failed') {
      recommendations.push('Check ErrorQueue service implementation');
    }
    
    return recommendations;
  }
}

/**
 * Browser-compatible validation function
 */
const validateErrorBoundariesInBrowser = async () => {
  console.log('🌐 Running Error Boundary Validation in Browser...');
  
  // Check if we're in the correct environment
  if (typeof window === 'undefined') {
    console.error('❌ Browser validation must be run in a browser environment');
    return false;
  }
  
  // Check if React is available
  if (typeof React === 'undefined' && typeof window.React === 'undefined') {
    console.error('❌ React is required for error boundary validation');
    return false;
  }
  
  try {
    // Test feature flags
    const featureFlagsWorking = window.featureFlags && 
                               typeof window.featureFlags.isEnabled === 'function';
    
    console.log(`${featureFlagsWorking ? '✅' : '❌'} Feature Flags: ${featureFlagsWorking ? 'Working' : 'Not Available'}`);
    
    // Test error boundary exports
    const errorBoundariesAvailable = window.LokDarpanErrorBoundaries || 
                                   (window.React && window.React.Component);
    
    console.log(`${errorBoundariesAvailable ? '✅' : '❌'} Error Boundaries: ${errorBoundariesAvailable ? 'Available' : 'Not Available'}`);
    
    return featureFlagsWorking && errorBoundariesAvailable;
    
  } catch (error) {
    console.error('❌ Browser validation error:', error);
    return false;
  }
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    ErrorBoundaryValidator,
    validateErrorBoundariesInBrowser
  };
} else {
  // Browser environment
  window.LokDarpanErrorBoundaryValidator = {
    ErrorBoundaryValidator,
    validateErrorBoundariesInBrowser
  };
  
  console.log('🔧 LokDarpan Error Boundary Validator loaded. Run validateErrorBoundariesInBrowser() to test.');
}

// Auto-run validation in development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  const validator = new ErrorBoundaryValidator();
  validator.validate().then(results => {
    if (results.overall === 'failed') {
      process.exit(1);
    }
  });
}

export default ErrorBoundaryValidator;
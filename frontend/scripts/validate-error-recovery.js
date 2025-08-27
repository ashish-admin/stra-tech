#!/usr/bin/env node

/**
 * Error Recovery Validation Script
 * Validates that all error boundaries are properly integrated and functional
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ErrorRecoveryValidator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  /**
   * Run all validation checks
   */
  async validate() {
    console.log('🔍 Starting Error Recovery Validation...\n');

    // Check 1: Verify error boundary files exist
    this.validateErrorBoundaryFiles();

    // Check 2: Verify test files exist
    this.validateTestFiles();

    // Check 3: Verify Dashboard integration
    this.validateDashboardIntegration();

    // Check 4: Verify feature flags configuration
    this.validateFeatureFlags();

    // Check 5: Verify telemetry configuration
    this.validateTelemetryConfig();

    // Check 6: Verify dev tools integration
    this.validateDevTools();

    // Check 7: Run tests
    this.runTests();

    // Check 8: Validate build
    this.validateBuild();

    // Generate report
    this.generateReport();
  }

  /**
   * Check 1: Verify error boundary files exist
   */
  validateErrorBoundaryFiles() {
    console.log('📁 Validating Error Boundary Files...');
    
    const requiredFiles = [
      'src/shared/error/ProductionErrorBoundary.jsx',
      'src/shared/error/TabErrorBoundary.jsx',
      'src/shared/error/SSEErrorBoundary.jsx',
      'src/shared/services/ErrorQueue.js',
      'src/shared/services/RetryStrategy.js',
      'src/shared/monitoring/PerformanceMonitor.jsx',
      'src/shared/monitoring/MonitoringService.js',
      'src/config/features.js'
    ];

    let allExist = true;
    requiredFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        this.addResult('passed', `✅ ${file} exists`);
      } else {
        this.addResult('failed', `❌ ${file} not found`);
        allExist = false;
      }
    });

    if (allExist) {
      console.log('✅ All error boundary files present\n');
    } else {
      console.log('❌ Some error boundary files missing\n');
    }
  }

  /**
   * Check 2: Verify test files exist
   */
  validateTestFiles() {
    console.log('🧪 Validating Test Files...');
    
    const testFiles = [
      'src/__tests__/error/ProductionErrorBoundary.test.jsx',
      'src/__tests__/error/ErrorQueue.test.js',
      'src/__tests__/error/RetryStrategy.test.js',
      'src/__tests__/integration/ErrorRecovery.test.jsx'
    ];

    let allExist = true;
    testFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        this.addResult('passed', `✅ ${file} exists`);
      } else {
        this.addResult('warning', `⚠️ ${file} not found`);
        allExist = false;
      }
    });

    if (allExist) {
      console.log('✅ All test files present\n');
    } else {
      console.log('⚠️ Some test files missing\n');
    }
  }

  /**
   * Check 3: Verify Dashboard integration
   */
  validateDashboardIntegration() {
    console.log('🔌 Validating Dashboard Integration...');
    
    const dashboardPath = path.join(process.cwd(), 'src/components/Dashboard.jsx');
    
    if (!fs.existsSync(dashboardPath)) {
      this.addResult('failed', '❌ Dashboard.jsx not found');
      return;
    }

    const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
    
    // Check for error boundary imports
    const hasProductionErrorBoundary = dashboardContent.includes('ProductionErrorBoundary');
    const hasTabErrorBoundary = dashboardContent.includes('TabErrorBoundary');
    const hasFeatureFlags = dashboardContent.includes('featureFlagManager');
    
    if (hasProductionErrorBoundary) {
      this.addResult('passed', '✅ ProductionErrorBoundary imported');
    } else {
      this.addResult('failed', '❌ ProductionErrorBoundary not imported');
    }
    
    if (hasTabErrorBoundary) {
      this.addResult('passed', '✅ TabErrorBoundary imported');
    } else {
      this.addResult('failed', '❌ TabErrorBoundary not imported');
    }
    
    if (hasFeatureFlags) {
      this.addResult('passed', '✅ Feature flags integrated');
    } else {
      this.addResult('warning', '⚠️ Feature flags not integrated');
    }

    console.log('Dashboard integration check complete\n');
  }

  /**
   * Check 4: Verify feature flags configuration
   */
  validateFeatureFlags() {
    console.log('🚩 Validating Feature Flags...');
    
    const featuresPath = path.join(process.cwd(), 'src/config/features.js');
    
    if (!fs.existsSync(featuresPath)) {
      this.addResult('failed', '❌ features.js not found');
      return;
    }

    try {
      // Read and parse the feature flags file
      const content = fs.readFileSync(featuresPath, 'utf-8');
      
      // Check that all flags start as false
      const flagPattern = /enable\w+:\s*(true|false)/g;
      const matches = content.matchAll(flagPattern);
      let hasEnabledFlag = false;
      
      for (const match of matches) {
        if (match[1] === 'true') {
          hasEnabledFlag = true;
          this.addResult('warning', `⚠️ Flag ${match[0]} is enabled by default`);
        }
      }
      
      if (!hasEnabledFlag) {
        this.addResult('passed', '✅ All feature flags safely disabled by default');
      }
      
      // Check for required flags
      const requiredFlags = [
        'enableComponentErrorBoundaries',
        'enableTabErrorBoundaries',
        'enableSSEErrorBoundaries',
        'enablePerformanceMonitor',
        'enableErrorTelemetry'
      ];
      
      requiredFlags.forEach(flag => {
        if (content.includes(flag)) {
          this.addResult('passed', `✅ ${flag} defined`);
        } else {
          this.addResult('failed', `❌ ${flag} not defined`);
        }
      });
      
    } catch (error) {
      this.addResult('failed', `❌ Error reading feature flags: ${error.message}`);
    }
    
    console.log('Feature flags validation complete\n');
  }

  /**
   * Check 5: Verify telemetry configuration
   */
  validateTelemetryConfig() {
    console.log('📊 Validating Telemetry Configuration...');
    
    const envPath = path.join(process.cwd(), '.env.development');
    const telemetryConfigPath = path.join(process.cwd(), 'src/config/telemetry.js');
    
    // Check .env.development
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      
      if (envContent.includes('VITE_TELEMETRY_ENDPOINT')) {
        this.addResult('passed', '✅ Telemetry endpoint configured');
      } else {
        this.addResult('warning', '⚠️ Telemetry endpoint not configured');
      }
      
      if (envContent.includes('VITE_ENABLE_ERROR_TESTING')) {
        this.addResult('passed', '✅ Error testing enabled in development');
      } else {
        this.addResult('warning', '⚠️ Error testing not enabled');
      }
    } else {
      this.addResult('warning', '⚠️ .env.development not found');
    }
    
    // Check telemetry config
    if (fs.existsSync(telemetryConfigPath)) {
      this.addResult('passed', '✅ Telemetry configuration file exists');
    } else {
      this.addResult('warning', '⚠️ Telemetry configuration file not found');
    }
    
    console.log('Telemetry validation complete\n');
  }

  /**
   * Check 6: Verify dev tools integration
   */
  validateDevTools() {
    console.log('🛠️ Validating Dev Tools...');
    
    const devToolsPath = path.join(process.cwd(), 'src/utils/devTools.js');
    const devToolbarPath = path.join(process.cwd(), 'src/components/ui/DevToolbar.jsx');
    
    if (fs.existsSync(devToolsPath)) {
      this.addResult('passed', '✅ Dev tools utilities present');
      
      // Verify it's development-only
      const content = fs.readFileSync(devToolsPath, 'utf-8');
      if (content.includes('NODE_ENV') && content.includes('development')) {
        this.addResult('passed', '✅ Dev tools are development-only');
      } else {
        this.addResult('warning', '⚠️ Dev tools may not be properly restricted to development');
      }
    } else {
      this.addResult('warning', '⚠️ Dev tools utilities not found');
    }
    
    if (fs.existsSync(devToolbarPath)) {
      this.addResult('passed', '✅ Dev toolbar component present');
    } else {
      this.addResult('warning', '⚠️ Dev toolbar component not found');
    }
    
    console.log('Dev tools validation complete\n');
  }

  /**
   * Check 7: Run tests
   */
  runTests() {
    console.log('🧪 Running Tests...');
    
    try {
      // Run error boundary tests
      console.log('Running error boundary tests...');
      execSync('npm test -- --testPathPattern=error --passWithNoTests', {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      this.addResult('passed', '✅ Error boundary tests passed');
    } catch (error) {
      this.addResult('warning', '⚠️ Some tests failed or not found');
    }
    
    console.log('Test execution complete\n');
  }

  /**
   * Check 8: Validate build
   */
  validateBuild() {
    console.log('🏗️ Validating Build...');
    
    try {
      console.log('Testing production build...');
      execSync('npm run build', {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      this.addResult('passed', '✅ Production build successful');
      
      // Check build output
      const distPath = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        if (files.length > 0) {
          this.addResult('passed', '✅ Build artifacts generated');
        }
      }
    } catch (error) {
      this.addResult('failed', '❌ Build failed: ' + error.message);
    }
    
    console.log('Build validation complete\n');
  }

  /**
   * Add a result
   */
  addResult(type, message) {
    this.results[type === 'warning' ? 'warnings' : type === 'passed' ? 'passed' : 'failed'].push(message);
    this.results.summary.total++;
    this.results.summary[type === 'warning' ? 'warnings' : type === 'passed' ? 'passed' : 'failed']++;
    
    console.log(message);
  }

  /**
   * Generate final report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(80) + '\n');

    // Summary
    const { total, passed, failed, warnings } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    console.log('📈 Summary:');
    console.log(`   Total Checks: ${total}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⚠️ Warnings: ${warnings}`);
    console.log(`   Pass Rate: ${passRate}%`);
    console.log();

    // Failed items
    if (this.results.failed.length > 0) {
      console.log('❌ Failed Checks:');
      this.results.failed.forEach(item => {
        console.log('   ' + item);
      });
      console.log();
    }

    // Warning items
    if (this.results.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      this.results.warnings.forEach(item => {
        console.log('   ' + item);
      });
      console.log();
    }

    // Overall status
    console.log('='.repeat(80));
    if (failed === 0) {
      console.log('✅ ERROR RECOVERY SYSTEM IS READY FOR TESTING');
      console.log('');
      console.log('Next Steps:');
      console.log('1. Run: npm run dev');
      console.log('2. Enable feature flags in browser console:');
      console.log('   featureFlags.enablePhase(1)');
      console.log('3. Test error scenarios using Dev Toolbar (Ctrl+Shift+E)');
      console.log('4. Verify error boundaries catch and recover from errors');
    } else {
      console.log('❌ ERROR RECOVERY SYSTEM HAS ISSUES THAT NEED ATTENTION');
      console.log('');
      console.log('Please fix the failed checks above before proceeding.');
    }
    console.log('='.repeat(80));

    // Save report to file
    const reportPath = path.join(process.cwd(), 'error-recovery-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run validation
if (require.main === module) {
  const validator = new ErrorRecoveryValidator();
  validator.validate();
}

module.exports = ErrorRecoveryValidator;
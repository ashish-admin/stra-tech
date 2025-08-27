#!/usr/bin/env node

/**
 * Quality Gates Validation Framework
 * LokDarpan Political Intelligence Dashboard
 * 
 * Automated validation of Wave 1 Error Boundary quality gates
 * Used in CI/CD pipeline and pre-deployment validation
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Quality Gate Configuration
const QUALITY_GATES = {
  componentIsolation: {
    name: 'Component Isolation',
    priority: 'CRITICAL',
    criteria: {
      cascadeFailures: { max: 0, description: 'Zero cascade failures allowed' },
      isolatedFailures: { min: 6, description: 'All 6 critical components must isolate failures' },
      navigationIntact: { required: true, description: 'Dashboard navigation must remain functional' },
      wardSelectionWorking: { required: true, description: 'Ward selection must continue working' }
    }
  },
  performance: {
    name: 'Performance Standards',
    priority: 'CRITICAL',
    criteria: {
      errorResponseTime: { max: 50, unit: 'ms', description: 'Error boundary activation <50ms' },
      memoryIncrease: { max: 5, unit: 'MB', description: 'Memory increase during errors <5MB' },
      unaffectedComponentPerformance: { required: 'normal', description: 'Unaffected components maintain normal performance' }
    }
  },
  campaignWorkflow: {
    name: 'Campaign Workflow Continuity', 
    priority: 'CRITICAL',
    criteria: {
      politicalAnalysisAccessible: { required: true, description: 'Political analysis remains accessible' },
      wardSwitchingWorking: { required: true, description: 'Ward switching functionality preserved' },
      alertsActive: { required: true, description: 'Intelligence alerts continue functioning' },
      criticalTaskCompletion: { required: true, description: 'Users can complete critical tasks despite component failures' }
    }
  },
  errorRecovery: {
    name: 'Error Recovery',
    priority: 'HIGH',
    criteria: {
      retryMechanismWorking: { required: true, description: 'Retry mechanisms function correctly' },
      actionableErrorMessages: { required: true, description: 'Error messages provide actionable feedback' },
      recoveryWithinTimeout: { max: 3, description: 'Recovery succeeds within 3 attempts' },
      gracefulDegradation: { required: true, description: 'Graceful degradation provides alternative workflows' }
    }
  }
};

// Test execution configuration
const TEST_CONFIG = {
  testCommand: 'npm test',
  testPattern: 'error-boundary-test-suite.test.js',
  coverageThreshold: 90,
  timeout: 300000, // 5 minutes
  retries: 2
};

class QualityGateValidator {
  constructor() {
    this.results = {
      gates: {},
      summary: {
        totalGates: Object.keys(QUALITY_GATES).length,
        passedGates: 0,
        failedGates: 0,
        criticalFailures: 0,
        overallResult: 'PENDING'
      },
      startTime: Date.now(),
      endTime: null
    };
    
    this.testResults = null;
    this.performanceMetrics = null;
  }

  /**
   * Run all quality gate validations
   */
  async runValidation() {
    console.log('🚀 Starting LokDarpan Wave 1 Quality Gates Validation');
    console.log('=' .repeat(60));
    
    try {
      // 1. Run automated test suite
      await this.runTestSuite();
      
      // 2. Validate each quality gate
      for (const [gateId, gateConfig] of Object.entries(QUALITY_GATES)) {
        await this.validateQualityGate(gateId, gateConfig);
      }
      
      // 3. Generate final report
      this.generateFinalReport();
      
      // 4. Exit with appropriate code
      this.exitWithResult();
      
    } catch (error) {
      console.error('❌ Quality gate validation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Execute the test suite and capture results
   */
  async runTestSuite() {
    console.log('\n📋 Running Error Boundary Test Suite...');
    
    try {
      const testCommand = `${TEST_CONFIG.testCommand} -- --testPathPattern="${TEST_CONFIG.testPattern}" --json --outputFile=test-results.json`;
      
      execSync(testCommand, { 
        stdio: 'inherit',
        timeout: TEST_CONFIG.timeout,
        cwd: process.cwd()
      });
      
      // Load test results
      if (fs.existsSync('test-results.json')) {
        this.testResults = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
      }
      
      console.log('✅ Test suite completed successfully');
      
    } catch (error) {
      console.error('❌ Test suite execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate a specific quality gate
   */
  async validateQualityGate(gateId, gateConfig) {
    console.log(`\n🔍 Validating ${gateConfig.name} (${gateConfig.priority})...`);
    
    const gateResult = {
      name: gateConfig.name,
      priority: gateConfig.priority,
      criteria: {},
      passed: true,
      criticalFailure: false,
      messages: []
    };

    // Validate each criterion
    for (const [criterionId, criterionConfig] of Object.entries(gateConfig.criteria)) {
      const criterionResult = await this.validateCriterion(gateId, criterionId, criterionConfig);
      gateResult.criteria[criterionId] = criterionResult;
      
      if (!criterionResult.passed) {
        gateResult.passed = false;
        gateResult.messages.push(`❌ ${criterionConfig.description}: ${criterionResult.message}`);
        
        if (gateConfig.priority === 'CRITICAL') {
          gateResult.criticalFailure = true;
        }
      } else {
        gateResult.messages.push(`✅ ${criterionConfig.description}`);
      }
    }

    this.results.gates[gateId] = gateResult;
    
    // Update summary
    if (gateResult.passed) {
      this.results.summary.passedGates++;
      console.log(`✅ ${gateConfig.name} - PASSED`);
    } else {
      this.results.summary.failedGates++;
      if (gateResult.criticalFailure) {
        this.results.summary.criticalFailures++;
      }
      console.log(`❌ ${gateConfig.name} - FAILED`);
    }
  }

  /**
   * Validate a specific criterion within a quality gate
   */
  async validateCriterion(gateId, criterionId, criterionConfig) {
    const result = {
      passed: false,
      actualValue: null,
      expectedValue: null,
      message: ''
    };

    try {
      switch (gateId) {
        case 'componentIsolation':
          return await this.validateComponentIsolationCriterion(criterionId, criterionConfig);
        case 'performance':
          return await this.validatePerformanceCriterion(criterionId, criterionConfig);
        case 'campaignWorkflow':
          return await this.validateCampaignWorkflowCriterion(criterionId, criterionConfig);
        case 'errorRecovery':
          return await this.validateErrorRecoveryCriterion(criterionId, criterionConfig);
        default:
          result.message = `Unknown quality gate: ${gateId}`;
          return result;
      }
    } catch (error) {
      result.message = `Validation error: ${error.message}`;
      return result;
    }
  }

  /**
   * Validate component isolation criteria
   */
  async validateComponentIsolationCriterion(criterionId, criterionConfig) {
    const result = { passed: false, actualValue: null, expectedValue: null, message: '' };

    if (!this.testResults) {
      result.message = 'Test results not available';
      return result;
    }

    // Extract component isolation metrics from test results
    const isolationTests = this.testResults.testResults
      .filter(test => test.testFilePath.includes('error-boundary-test-suite'))
      .flatMap(test => test.assertionResults)
      .filter(assertion => assertion.title.toLowerCase().includes('isolation'));

    switch (criterionId) {
      case 'cascadeFailures':
        // Count cascade failure tests
        const cascadeTests = isolationTests.filter(test => 
          test.title.toLowerCase().includes('cascade') && test.status === 'failed'
        );
        result.actualValue = cascadeTests.length;
        result.expectedValue = criterionConfig.max;
        result.passed = result.actualValue <= criterionConfig.max;
        result.message = result.passed ? 
          `No cascade failures detected` : 
          `${result.actualValue} cascade failures detected (max: ${criterionConfig.max})`;
        break;

      case 'isolatedFailures':
        // Count successful isolation tests
        const isolationSuccesses = isolationTests.filter(test => 
          test.title.toLowerCase().includes('isolat') && test.status === 'passed'
        );
        result.actualValue = isolationSuccesses.length;
        result.expectedValue = criterionConfig.min;
        result.passed = result.actualValue >= criterionConfig.min;
        result.message = result.passed ?
          `All ${result.actualValue} components properly isolated` :
          `Only ${result.actualValue} components isolated (required: ${criterionConfig.min})`;
        break;

      case 'navigationIntact':
        const navigationTests = isolationTests.filter(test =>
          test.title.toLowerCase().includes('navigation') && test.status === 'passed'
        );
        result.actualValue = navigationTests.length > 0;
        result.expectedValue = criterionConfig.required;
        result.passed = result.actualValue === criterionConfig.required;
        result.message = result.passed ?
          'Navigation functionality preserved during errors' :
          'Navigation functionality compromised during errors';
        break;

      case 'wardSelectionWorking':
        const wardTests = isolationTests.filter(test =>
          test.title.toLowerCase().includes('ward') && test.status === 'passed'
        );
        result.actualValue = wardTests.length > 0;
        result.expectedValue = criterionConfig.required;
        result.passed = result.actualValue === criterionConfig.required;
        result.message = result.passed ?
          'Ward selection functionality preserved during errors' :
          'Ward selection functionality compromised during errors';
        break;
    }

    return result;
  }

  /**
   * Validate performance criteria
   */
  async validatePerformanceCriterion(criterionId, criterionConfig) {
    const result = { passed: false, actualValue: null, expectedValue: null, message: '' };

    // Extract performance metrics from test results
    const performanceTests = this.testResults?.testResults
      .filter(test => test.testFilePath.includes('error-boundary-test-suite'))
      .flatMap(test => test.assertionResults)
      .filter(assertion => assertion.title.toLowerCase().includes('performance'));

    switch (criterionId) {
      case 'errorResponseTime':
        // Look for performance timing assertions
        const timingTests = performanceTests?.filter(test =>
          test.title.toLowerCase().includes('response time') || 
          test.title.toLowerCase().includes('50ms')
        );
        
        if (timingTests && timingTests.length > 0) {
          const allTimingTestsPassed = timingTests.every(test => test.status === 'passed');
          result.actualValue = allTimingTestsPassed ? 'within budget' : 'exceeded budget';
          result.expectedValue = `<${criterionConfig.max}${criterionConfig.unit}`;
          result.passed = allTimingTestsPassed;
          result.message = result.passed ?
            `Error response time within ${criterionConfig.max}${criterionConfig.unit} budget` :
            `Error response time exceeded ${criterionConfig.max}${criterionConfig.unit} budget`;
        } else {
          result.message = 'Performance timing tests not found';
        }
        break;

      case 'memoryIncrease':
        const memoryTests = performanceTests?.filter(test =>
          test.title.toLowerCase().includes('memory')
        );
        
        if (memoryTests && memoryTests.length > 0) {
          const allMemoryTestsPassed = memoryTests.every(test => test.status === 'passed');
          result.actualValue = allMemoryTestsPassed ? 'within budget' : 'exceeded budget';
          result.expectedValue = `<${criterionConfig.max}${criterionConfig.unit}`;
          result.passed = allMemoryTestsPassed;
          result.message = result.passed ?
            `Memory increase within ${criterionConfig.max}${criterionConfig.unit} budget` :
            `Memory increase exceeded ${criterionConfig.max}${criterionConfig.unit} budget`;
        } else {
          result.message = 'Memory usage tests not found';
        }
        break;

      case 'unaffectedComponentPerformance':
        const unaffectedTests = performanceTests?.filter(test =>
          test.title.toLowerCase().includes('unaffected')
        );
        
        if (unaffectedTests && unaffectedTests.length > 0) {
          const allUnaffectedTestsPassed = unaffectedTests.every(test => test.status === 'passed');
          result.actualValue = allUnaffectedTestsPassed ? 'normal' : 'degraded';
          result.expectedValue = criterionConfig.required;
          result.passed = result.actualValue === criterionConfig.required;
          result.message = result.passed ?
            'Unaffected components maintain normal performance' :
            'Unaffected components show performance degradation';
        } else {
          result.message = 'Unaffected component performance tests not found';
        }
        break;
    }

    return result;
  }

  /**
   * Validate campaign workflow criteria
   */
  async validateCampaignWorkflowCriterion(criterionId, criterionConfig) {
    const result = { passed: false, actualValue: null, expectedValue: null, message: '' };

    const workflowTests = this.testResults?.testResults
      .filter(test => test.testFilePath.includes('error-boundary-test-suite'))
      .flatMap(test => test.assertionResults)
      .filter(assertion => assertion.title.toLowerCase().includes('campaign') || 
                          assertion.title.toLowerCase().includes('workflow'));

    switch (criterionId) {
      case 'politicalAnalysisAccessible':
        const analysisTests = workflowTests?.filter(test =>
          test.title.toLowerCase().includes('analysis') || 
          test.title.toLowerCase().includes('political')
        );
        
        result.actualValue = analysisTests?.some(test => test.status === 'passed') || false;
        result.expectedValue = criterionConfig.required;
        result.passed = result.actualValue === criterionConfig.required;
        result.message = result.passed ?
          'Political analysis remains accessible during errors' :
          'Political analysis not accessible during errors';
        break;

      case 'wardSwitchingWorking':
        const wardWorkflowTests = workflowTests?.filter(test =>
          test.title.toLowerCase().includes('ward')
        );
        
        result.actualValue = wardWorkflowTests?.some(test => test.status === 'passed') || false;
        result.expectedValue = criterionConfig.required;
        result.passed = result.actualValue === criterionConfig.required;
        result.message = result.passed ?
          'Ward switching functionality preserved in workflow' :
          'Ward switching functionality compromised in workflow';
        break;

      case 'alertsActive':
        const alertTests = workflowTests?.filter(test =>
          test.title.toLowerCase().includes('alert')
        );
        
        result.actualValue = alertTests?.some(test => test.status === 'passed') || false;
        result.expectedValue = criterionConfig.required;
        result.passed = result.actualValue === criterionConfig.required;
        result.message = result.passed ?
          'Intelligence alerts continue functioning during errors' :
          'Intelligence alerts compromised during errors';
        break;

      case 'criticalTaskCompletion':
        const taskTests = workflowTests?.filter(test =>
          test.title.toLowerCase().includes('task') ||
          test.title.toLowerCase().includes('critical')
        );
        
        result.actualValue = taskTests?.some(test => test.status === 'passed') || false;
        result.expectedValue = criterionConfig.required;
        result.passed = result.actualValue === criterionConfig.required;
        result.message = result.passed ?
          'Users can complete critical tasks despite component failures' :
          'Critical task completion compromised during component failures';
        break;
    }

    return result;
  }

  /**
   * Validate error recovery criteria
   */
  async validateErrorRecoveryCriterion(criterionId, criterionConfig) {
    const result = { passed: false, actualValue: null, expectedValue: null, message: '' };

    const recoveryTests = this.testResults?.testResults
      .filter(test => test.testFilePath.includes('error-boundary-test-suite'))
      .flatMap(test => test.assertionResults)
      .filter(assertion => assertion.title.toLowerCase().includes('recovery') ||
                          assertion.title.toLowerCase().includes('retry'));

    switch (criterionId) {
      case 'retryMechanismWorking':
        const retryTests = recoveryTests?.filter(test =>
          test.title.toLowerCase().includes('retry')
        );
        
        result.actualValue = retryTests?.some(test => test.status === 'passed') || false;
        result.expectedValue = criterionConfig.required;
        result.passed = result.actualValue === criterionConfig.required;
        result.message = result.passed ?
          'Retry mechanisms function correctly' :
          'Retry mechanisms not functioning properly';
        break;

      case 'actionableErrorMessages':
        const messageTests = recoveryTests?.filter(test =>
          test.title.toLowerCase().includes('message') ||
          test.title.toLowerCase().includes('actionable')
        );
        
        result.actualValue = messageTests?.some(test => test.status === 'passed') || false;
        result.expectedValue = criterionConfig.required;
        result.passed = result.actualValue === criterionConfig.required;
        result.message = result.passed ?
          'Error messages provide actionable feedback' :
          'Error messages not providing actionable feedback';
        break;

      case 'recoveryWithinTimeout':
        const timeoutTests = recoveryTests?.filter(test =>
          test.title.toLowerCase().includes('limit') ||
          test.title.toLowerCase().includes('timeout')
        );
        
        result.actualValue = timeoutTests?.some(test => test.status === 'passed') || false;
        result.expectedValue = criterionConfig.max;
        result.passed = result.actualValue;
        result.message = result.passed ?
          `Recovery succeeds within ${criterionConfig.max} attempts` :
          `Recovery does not succeed within ${criterionConfig.max} attempts`;
        break;

      case 'gracefulDegradation':
        const degradationTests = recoveryTests?.filter(test =>
          test.title.toLowerCase().includes('graceful') ||
          test.title.toLowerCase().includes('fallback')
        );
        
        result.actualValue = degradationTests?.some(test => test.status === 'passed') || false;
        result.expectedValue = criterionConfig.required;
        result.passed = result.actualValue === criterionConfig.required;
        result.message = result.passed ?
          'Graceful degradation provides alternative workflows' :
          'Graceful degradation not providing alternative workflows';
        break;
    }

    return result;
  }

  /**
   * Generate final validation report
   */
  generateFinalReport() {
    this.results.endTime = Date.now();
    const duration = (this.results.endTime - this.results.startTime) / 1000;
    
    // Determine overall result
    if (this.results.summary.criticalFailures > 0) {
      this.results.summary.overallResult = 'CRITICAL_FAILURE';
    } else if (this.results.summary.failedGates > 0) {
      this.results.summary.overallResult = 'FAILURE';
    } else {
      this.results.summary.overallResult = 'SUCCESS';
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 QUALITY GATES VALIDATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n🕐 Execution Time: ${duration.toFixed(2)}s`);
    console.log(`📋 Total Gates: ${this.results.summary.totalGates}`);
    console.log(`✅ Passed: ${this.results.summary.passedGates}`);
    console.log(`❌ Failed: ${this.results.summary.failedGates}`);
    console.log(`🚨 Critical Failures: ${this.results.summary.criticalFailures}`);
    
    console.log(`\n🎯 OVERALL RESULT: ${this.results.summary.overallResult}`);

    // Detailed gate results
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(40));
    
    for (const [gateId, gateResult] of Object.entries(this.results.gates)) {
      const status = gateResult.passed ? '✅ PASSED' : '❌ FAILED';
      const priority = gateResult.priority === 'CRITICAL' ? '🚨' : '⚠️';
      
      console.log(`\n${priority} ${gateResult.name}: ${status}`);
      
      gateResult.messages.forEach(message => {
        console.log(`   ${message}`);
      });
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'quality-gates-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Save summary for CI/CD
    const summaryPath = path.join(process.cwd(), 'quality-gates-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(this.results.summary, null, 2));
    console.log(`📄 Summary saved to: ${summaryPath}`);
  }

  /**
   * Exit with appropriate result code
   */
  exitWithResult() {
    switch (this.results.summary.overallResult) {
      case 'SUCCESS':
        console.log('\n🎉 All quality gates passed! Ready for deployment.');
        process.exit(0);
        break;
      case 'FAILURE':
        console.log('\n⚠️ Some quality gates failed. Review issues before deployment.');
        process.exit(1);
        break;
      case 'CRITICAL_FAILURE':
        console.log('\n🚨 CRITICAL quality gates failed! Deployment BLOCKED.');
        process.exit(2);
        break;
      default:
        console.log('\n❓ Unknown validation result.');
        process.exit(3);
    }
  }
}

// CLI Usage
if (require.main === module) {
  const validator = new QualityGateValidator();
  validator.runValidation().catch(error => {
    console.error('Quality gate validation failed:', error);
    process.exit(1);
  });
}

module.exports = { QualityGateValidator, QUALITY_GATES, TEST_CONFIG };
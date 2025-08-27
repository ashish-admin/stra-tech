#!/usr/bin/env node

/**
 * Test Environment Validation Script
 * Verifies that all required dependencies and configurations are in place
 * for running the error boundary test suite.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

class TestEnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = join(__dirname, '../../..');
  }

  checkFileExists(filePath, required = true) {
    const fullPath = join(this.projectRoot, filePath);
    const exists = existsSync(fullPath);
    
    if (exists) {
      log.success(`Found: ${filePath}`);
    } else {
      const msg = `Missing: ${filePath}`;
      if (required) {
        this.errors.push(msg);
        log.error(msg);
      } else {
        this.warnings.push(msg);
        log.warning(msg);
      }
    }
    
    return exists;
  }

  checkPackageJson() {
    log.title('Checking package.json configuration...');
    
    const packagePath = join(this.projectRoot, 'package.json');
    if (!this.checkFileExists('package.json')) {
      return false;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      // Check required dependencies
      const requiredDevDeps = [
        '@testing-library/jest-dom',
        '@testing-library/react', 
        '@testing-library/user-event',
        'jsdom',
        'vitest'
      ];

      requiredDevDeps.forEach(dep => {
        if (packageJson.devDependencies?.[dep]) {
          log.success(`Dev dependency: ${dep}`);
        } else {
          const msg = `Missing dev dependency: ${dep}`;
          this.errors.push(msg);
          log.error(msg);
        }
      });

      // Check test scripts
      const requiredScripts = [
        'test',
        'test:error-boundaries',
        'test:integration'
      ];

      requiredScripts.forEach(script => {
        if (packageJson.scripts?.[script]) {
          log.success(`Script: ${script}`);
        } else {
          const msg = `Missing script: ${script}`;
          this.errors.push(msg);
          log.error(msg);
        }
      });

      // Check vitest configuration
      if (packageJson.vitest) {
        log.success('Vitest configuration found');
        
        if (packageJson.vitest.environment === 'jsdom') {
          log.success('Environment: jsdom');
        } else {
          const msg = 'Vitest environment should be "jsdom"';
          this.warnings.push(msg);
          log.warning(msg);
        }

        if (packageJson.vitest.setupFiles?.includes('./src/test/setup.js')) {
          log.success('Setup file configured');
        } else {
          const msg = 'Setup file not configured properly';
          this.warnings.push(msg);
          log.warning(msg);
        }
      } else {
        const msg = 'Vitest configuration missing';
        this.errors.push(msg);
        log.error(msg);
      }

    } catch (error) {
      const msg = `Failed to parse package.json: ${error.message}`;
      this.errors.push(msg);
      log.error(msg);
      return false;
    }

    return true;
  }

  checkTestFiles() {
    log.title('Checking test files...');

    const testFiles = [
      'src/__tests__/error/ProductionErrorBoundary.test.jsx',
      'src/__tests__/error/ErrorQueue.test.js', 
      'src/__tests__/error/RetryStrategy.test.js',
      'src/__tests__/integration/ErrorRecovery.test.jsx'
    ];

    let allFound = true;
    testFiles.forEach(file => {
      if (!this.checkFileExists(file)) {
        allFound = false;
      }
    });

    return allFound;
  }

  checkSourceFiles() {
    log.title('Checking source files...');

    const sourceFiles = [
      'src/shared/error/ProductionErrorBoundary.jsx',
      'src/shared/error/TabErrorBoundary.jsx',
      'src/shared/error/SSEErrorBoundary.jsx',
      'src/shared/services/ErrorQueue.js',
      'src/shared/services/RetryStrategy.js',
      'src/config/features.js'
    ];

    let allFound = true;
    sourceFiles.forEach(file => {
      if (!this.checkFileExists(file)) {
        allFound = false;
      }
    });

    return allFound;
  }

  checkOptionalFiles() {
    log.title('Checking optional files...');

    const optionalFiles = [
      'src/test/setup.js',
      'vitest.config.js',
      '.gitignore'
    ];

    optionalFiles.forEach(file => {
      this.checkFileExists(file, false);
    });
  }

  checkNodeVersion() {
    log.title('Checking Node.js version...');
    
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion >= 18) {
      log.success(`Node.js version: ${nodeVersion} (compatible)`);
      return true;
    } else {
      const msg = `Node.js version ${nodeVersion} may not be compatible. Recommend Node.js 18+`;
      this.warnings.push(msg);
      log.warning(msg);
      return false;
    }
  }

  generateSummary() {
    log.title('Validation Summary');
    
    console.log(`Total errors: ${this.errors.length}`);
    console.log(`Total warnings: ${this.warnings.length}`);

    if (this.errors.length === 0) {
      log.success('✨ All critical requirements met! Test suite is ready to run.');
      
      console.log('\nTo run the tests:');
      log.info('npm run test:error-boundaries');
      log.info('npm run test:integration'); 
      log.info('npm run test:coverage');
      
    } else {
      log.error('❌ Critical issues found. Please resolve before running tests:');
      this.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\nWarnings (non-critical):');
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    return this.errors.length === 0;
  }

  async validate() {
    log.title('🧪 LokDarpan Error Boundary Test Environment Validation');
    
    // Run all validation checks
    const checks = [
      () => this.checkNodeVersion(),
      () => this.checkPackageJson(),
      () => this.checkSourceFiles(),  
      () => this.checkTestFiles(),
      () => this.checkOptionalFiles()
    ];

    // Execute checks
    for (const check of checks) {
      try {
        check();
      } catch (error) {
        const msg = `Validation error: ${error.message}`;
        this.errors.push(msg);
        log.error(msg);
      }
    }

    // Generate summary
    const isValid = this.generateSummary();
    
    if (isValid) {
      console.log('\n🚀 Environment is ready for testing!');
      process.exit(0);
    } else {
      console.log('\n🔧 Please fix the issues above and run validation again.');
      process.exit(1);
    }
  }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new TestEnvironmentValidator();
  validator.validate().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export default TestEnvironmentValidator;
#!/usr/bin/env node

/**
 * Migration Validation Script
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Validates that the component reorganization was successful and identifies
 * any issues that need to be addressed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPath = path.join(__dirname, '../src');
const errors = [];
const warnings = [];
const success = [];

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

/**
 * Check if directory exists
 */
function checkDirectory(dirPath, description) {
  const fullPath = path.join(srcPath, dirPath);
  if (fs.existsSync(fullPath)) {
    success.push(`✓ ${description}: ${dirPath}`);
    return true;
  } else {
    errors.push(`✗ Missing ${description}: ${dirPath}`);
    return false;
  }
}

/**
 * Check if file exists
 */
function checkFile(filePath, description) {
  const fullPath = path.join(srcPath, filePath);
  if (fs.existsSync(fullPath)) {
    success.push(`✓ ${description}: ${filePath}`);
    return true;
  } else {
    errors.push(`✗ Missing ${description}: ${filePath}`);
    return false;
  }
}

/**
 * Check file content for imports
 */
function checkImports(filePath, expectedImports, description) {
  const fullPath = path.join(srcPath, filePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`✗ File not found for import check: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const missingImports = expectedImports.filter(imp => !content.includes(imp));
  
  if (missingImports.length === 0) {
    success.push(`✓ ${description}: All imports found`);
    return true;
  } else {
    warnings.push(`⚠ ${description}: Missing imports - ${missingImports.join(', ')}`);
    return false;
  }
}

/**
 * Main validation function
 */
function validateMigration() {
  console.log(`${colors.blue}🔍 Validating LokDarpan Phase 2 Migration...${colors.reset}\\n`);

  // Check feature directory structure
  console.log(`${colors.blue}📁 Checking Feature Directory Structure${colors.reset}`);
  checkDirectory('features', 'Features root directory');
  checkDirectory('features/dashboard/components', 'Dashboard components');
  checkDirectory('features/analytics/components', 'Analytics components');
  checkDirectory('features/geographic/components', 'Geographic components');
  checkDirectory('features/strategist/components', 'Strategist components');
  checkDirectory('features/auth/components', 'Auth components');

  // Check shared directory structure
  console.log(`\\n${colors.blue}📁 Checking Shared Directory Structure${colors.reset}`);
  checkDirectory('shared', 'Shared root directory');
  checkDirectory('shared/components/ui', 'Shared UI components');
  checkDirectory('shared/components/charts', 'Shared chart components');
  checkDirectory('shared/components/lazy', 'Lazy loading components');
  checkDirectory('shared/hooks/api', 'API hooks');
  checkDirectory('shared/hooks/performance', 'Performance hooks');
  checkDirectory('shared/services/api', 'API services');
  checkDirectory('shared/services/cache', 'Cache services');

  // Check key files
  console.log(`\\n${colors.blue}📄 Checking Key Files${colors.reset}`);
  checkFile('features/index.js', 'Features barrel export');
  checkFile('shared/index.js', 'Shared barrel export');
  checkFile('compatibility/index.js', 'Compatibility layer');
  checkFile('features/dashboard/components/Dashboard.jsx', 'Enhanced Dashboard component');
  checkFile('shared/components/ui/EnhancedCard.jsx', 'Enhanced Card component');
  checkFile('shared/components/charts/BaseChart.jsx', 'Base Chart component');
  checkFile('shared/hooks/api/useEnhancedQuery.js', 'Enhanced Query hook');
  checkFile('shared/services/cache/queryClient.js', 'Enhanced Query Client');

  // Check Vite configuration
  console.log(`\\n${colors.blue}⚙️ Checking Configuration${colors.reset}`);
  // Skip direct import check for vite config - handled in performance section

  // Check App.jsx integration
  checkImports('App.jsx', [
    './compatibility',
    '@shared/context/WardContext',
    '@shared/services/cache'
  ], 'App.jsx Phase 2 imports');

  // Performance validation
  console.log(`\\n${colors.blue}⚡ Performance Checks${colors.reset}`);
  const vitePath = path.join(__dirname, '../vite.config.js');
  if (fs.existsSync(vitePath)) {
    const viteConfig = fs.readFileSync(vitePath, 'utf8');
    
    if (viteConfig.includes('manualChunks')) {
      success.push('✓ Code splitting configured');
    } else {
      warnings.push('⚠ Code splitting may not be optimal');
    }
    
    if (viteConfig.includes('@shared') || viteConfig.includes('@features')) {
      success.push('✓ Path aliases configured');
    } else {
      errors.push('✗ Path aliases not configured');
    }
  }

  // Generate report
  console.log(`\\n${colors.blue}📊 Migration Validation Report${colors.reset}`);
  console.log('='.repeat(50));
  
  if (success.length > 0) {
    console.log(`\\n${colors.green}✅ Success (${success.length})${colors.reset}`);
    success.forEach(item => console.log(`  ${item}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\\n${colors.yellow}⚠️ Warnings (${warnings.length})${colors.reset}`);
    warnings.forEach(item => console.log(`  ${item}`));
  }
  
  if (errors.length > 0) {
    console.log(`\\n${colors.red}❌ Errors (${errors.length})${colors.reset}`);
    errors.forEach(item => console.log(`  ${item}`));
  }
  
  // Summary
  const total = success.length + warnings.length + errors.length;
  const successRate = ((success.length / total) * 100).toFixed(1);
  
  console.log(`\\n${colors.blue}📈 Migration Success Rate: ${successRate}%${colors.reset}`);
  
  if (errors.length === 0 && warnings.length <= 2) {
    console.log(`\\n${colors.green}🎉 Migration validation passed! Ready for testing.${colors.reset}`);
    process.exit(0);
  } else if (errors.length === 0) {
    console.log(`\\n${colors.yellow}⚠️ Migration completed with warnings. Review before production.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\\n${colors.red}❌ Migration validation failed. Please fix errors before proceeding.${colors.reset}`);
    process.exit(1);
  }
}

// Run validation
validateMigration();
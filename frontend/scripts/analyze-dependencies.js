#!/usr/bin/env node

/**
 * Dependency Analysis Tool
 * Analyzes component dependencies and generates migration plan
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const glob = require('glob');

class DependencyAnalyzer {
  constructor(rootDir = 'src') {
    this.rootDir = rootDir;
    this.dependencies = new Map();
    this.circularDeps = [];
    this.componentGraph = new Map();
    this.stats = {
      totalComponents: 0,
      totalDependencies: 0,
      maxDepth: 0,
      avgDependencies: 0,
      circularCount: 0
    };
  }

  /**
   * Analyze all components in the project
   */
  async analyze() {
    console.log('🔍 Starting dependency analysis...\n');

    // Find all JavaScript/TypeScript files
    const files = await this.findFiles();
    console.log(`Found ${files.length} files to analyze\n`);

    // Parse each file and extract dependencies
    for (const file of files) {
      await this.analyzeFile(file);
    }

    // Detect circular dependencies
    this.detectCircularDependencies();

    // Calculate statistics
    this.calculateStats();

    // Generate report
    return this.generateReport();
  }

  /**
   * Find all relevant files
   */
  async findFiles() {
    return new Promise((resolve, reject) => {
      glob(
        path.join(this.rootDir, '**/*.{js,jsx,ts,tsx}'),
        {
          ignore: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/*.test.*',
            '**/*.spec.*',
            '**/*.stories.*'
          ]
        },
        (err, files) => {
          if (err) reject(err);
          else resolve(files);
        }
      );
    });
  }

  /**
   * Analyze a single file for dependencies
   */
  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy']
      });

      const relativePath = path.relative(this.rootDir, filePath);
      const dependencies = new Set();

      // Traverse AST to find imports
      traverse(ast, {
        ImportDeclaration(nodePath) {
          const importPath = nodePath.node.source.value;
          
          // Only track relative imports (internal dependencies)
          if (importPath.startsWith('.')) {
            const resolvedPath = path.resolve(
              path.dirname(filePath),
              importPath
            );
            const normalizedPath = path.relative(
              process.cwd(),
              resolvedPath
            );
            dependencies.add(normalizedPath);
          }
        },
        
        CallExpression(nodePath) {
          // Track dynamic imports
          if (nodePath.node.callee.type === 'Import') {
            const arg = nodePath.node.arguments[0];
            if (arg && arg.type === 'StringLiteral' && arg.value.startsWith('.')) {
              const resolvedPath = path.resolve(
                path.dirname(filePath),
                arg.value
              );
              const normalizedPath = path.relative(
                process.cwd(),
                resolvedPath
              );
              dependencies.add(normalizedPath);
            }
          }
        }
      });

      this.dependencies.set(relativePath, Array.from(dependencies));
      this.stats.totalComponents++;

    } catch (error) {
      console.warn(`Failed to analyze ${filePath}: ${error.message}`);
    }
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();

    const detectCycle = (node, path = []) => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat(node);
        this.circularDeps.push(cycle);
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recursionStack.add(node);

      const deps = this.dependencies.get(node) || [];
      for (const dep of deps) {
        if (detectCycle(dep, [...path, node])) {
          this.stats.circularCount++;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const [component] of this.dependencies) {
      if (!visited.has(component)) {
        detectCycle(component);
      }
    }
  }

  /**
   * Calculate dependency statistics
   */
  calculateStats() {
    let totalDeps = 0;
    let maxDepth = 0;

    const calculateDepth = (node, visited = new Set()) => {
      if (visited.has(node)) return 0;
      visited.add(node);

      const deps = this.dependencies.get(node) || [];
      if (deps.length === 0) return 1;

      let max = 0;
      for (const dep of deps) {
        const depth = calculateDepth(dep, visited);
        max = Math.max(max, depth);
      }

      return max + 1;
    };

    for (const [component, deps] of this.dependencies) {
      totalDeps += deps.length;
      const depth = calculateDepth(component);
      maxDepth = Math.max(maxDepth, depth);
    }

    this.stats.totalDependencies = totalDeps;
    this.stats.avgDependencies = totalDeps / this.stats.totalComponents;
    this.stats.maxDepth = maxDepth;
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    const report = {
      summary: this.stats,
      dependencies: Object.fromEntries(this.dependencies),
      circularDependencies: this.circularDeps,
      migrationComplexity: this.calculateMigrationComplexity(),
      recommendations: this.generateRecommendations(),
      migrationOrder: this.generateMigrationOrder()
    };

    return report;
  }

  /**
   * Calculate migration complexity for each component
   */
  calculateMigrationComplexity() {
    const complexity = new Map();

    for (const [component, deps] of this.dependencies) {
      let score = 0;

      // Factor 1: Number of dependencies
      score += deps.length * 2;

      // Factor 2: Is it part of circular dependency?
      const isCircular = this.circularDeps.some(cycle => 
        cycle.includes(component)
      );
      if (isCircular) score += 10;

      // Factor 3: Depth in dependency tree
      const depth = this.calculateComponentDepth(component);
      score += depth * 3;

      // Factor 4: Number of components depending on this
      const dependents = this.findDependents(component);
      score += dependents.length * 3;

      complexity.set(component, {
        score,
        level: score < 10 ? 'low' : score < 25 ? 'medium' : 'high',
        factors: {
          dependencies: deps.length,
          isCircular,
          depth,
          dependents: dependents.length
        }
      });
    }

    return Object.fromEntries(complexity);
  }

  /**
   * Calculate depth of a component in dependency tree
   */
  calculateComponentDepth(component, visited = new Set()) {
    if (visited.has(component)) return 0;
    visited.add(component);

    const deps = this.dependencies.get(component) || [];
    if (deps.length === 0) return 1;

    let maxDepth = 0;
    for (const dep of deps) {
      const depth = this.calculateComponentDepth(dep, visited);
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth + 1;
  }

  /**
   * Find components that depend on a given component
   */
  findDependents(targetComponent) {
    const dependents = [];

    for (const [component, deps] of this.dependencies) {
      if (deps.includes(targetComponent)) {
        dependents.push(component);
      }
    }

    return dependents;
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations() {
    const recommendations = [];

    // Check for circular dependencies
    if (this.circularDeps.length > 0) {
      recommendations.push({
        type: 'critical',
        title: 'Circular Dependencies Detected',
        description: `Found ${this.circularDeps.length} circular dependency chains`,
        action: 'Break circular dependencies before migration',
        affected: this.circularDeps
      });
    }

    // Check for highly coupled components
    const highlyCoupled = [];
    for (const [component, deps] of this.dependencies) {
      if (deps.length > 5) {
        highlyCoupled.push({ component, count: deps.length });
      }
    }

    if (highlyCoupled.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Highly Coupled Components',
        description: `${highlyCoupled.length} components have more than 5 dependencies`,
        action: 'Consider refactoring to reduce coupling',
        affected: highlyCoupled
      });
    }

    // Check for deep dependency chains
    if (this.stats.maxDepth > 5) {
      recommendations.push({
        type: 'warning',
        title: 'Deep Dependency Chain',
        description: `Maximum dependency depth is ${this.stats.maxDepth} levels`,
        action: 'Consider flattening the dependency hierarchy',
        maxDepth: this.stats.maxDepth
      });
    }

    // Suggest feature-based organization
    const componentsByType = this.categorizeComponents();
    recommendations.push({
      type: 'info',
      title: 'Feature-Based Organization',
      description: 'Components can be reorganized into feature modules',
      action: 'Group related components into feature folders',
      suggested: componentsByType
    });

    return recommendations;
  }

  /**
   * Categorize components by type/feature
   */
  categorizeComponents() {
    const categories = {
      charts: [],
      auth: [],
      ward: [],
      api: [],
      shared: [],
      layout: [],
      other: []
    };

    for (const [component] of this.dependencies) {
      if (component.includes('Chart') || component.includes('chart')) {
        categories.charts.push(component);
      } else if (component.includes('Auth') || component.includes('Login')) {
        categories.auth.push(component);
      } else if (component.includes('Ward') || component.includes('Location')) {
        categories.ward.push(component);
      } else if (component.includes('api') || component.includes('service')) {
        categories.api.push(component);
      } else if (component.includes('Layout') || component.includes('Header')) {
        categories.layout.push(component);
      } else if (component.includes('shared') || component.includes('common')) {
        categories.shared.push(component);
      } else {
        categories.other.push(component);
      }
    }

    return categories;
  }

  /**
   * Generate optimal migration order
   */
  generateMigrationOrder() {
    const order = [];
    const migrated = new Set();
    const complexity = this.calculateMigrationComplexity();

    // Sort components by complexity (lowest first)
    const sorted = Array.from(this.dependencies.keys()).sort((a, b) => {
      const scoreA = complexity[a]?.score || 0;
      const scoreB = complexity[b]?.score || 0;
      return scoreA - scoreB;
    });

    // Process in order of complexity
    for (const component of sorted) {
      if (!migrated.has(component)) {
        const deps = this.dependencies.get(component) || [];
        const unmigratedDeps = deps.filter(d => !migrated.has(d));
        
        order.push({
          component,
          phase: order.length < 10 ? 1 : order.length < 20 ? 2 : 3,
          complexity: complexity[component]?.level || 'unknown',
          dependencies: deps,
          unmigratedDependencies: unmigratedDeps
        });
        
        migrated.add(component);
      }
    }

    return order;
  }
}

// Main execution
if (require.main === module) {
  const analyzer = new DependencyAnalyzer(process.argv[2] || 'src');
  
  analyzer.analyze()
    .then(report => {
      // Print summary
      console.log('📊 Analysis Summary');
      console.log('==================');
      console.log(`Total Components: ${report.summary.totalComponents}`);
      console.log(`Total Dependencies: ${report.summary.totalDependencies}`);
      console.log(`Average Dependencies: ${report.summary.avgDependencies.toFixed(2)}`);
      console.log(`Max Dependency Depth: ${report.summary.maxDepth}`);
      console.log(`Circular Dependencies: ${report.summary.circularCount}`);
      console.log();

      // Print circular dependencies
      if (report.circularDependencies.length > 0) {
        console.log('🔄 Circular Dependencies');
        console.log('========================');
        report.circularDependencies.forEach((cycle, i) => {
          console.log(`${i + 1}. ${cycle.join(' → ')}`);
        });
        console.log();
      }

      // Print recommendations
      console.log('💡 Recommendations');
      console.log('==================');
      report.recommendations.forEach(rec => {
        const icon = rec.type === 'critical' ? '🚨' : 
                    rec.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ${rec.title}`);
        console.log(`   ${rec.description}`);
        console.log(`   Action: ${rec.action}`);
        console.log();
      });

      // Print migration order (first 10)
      console.log('📋 Migration Order (First 10 Components)');
      console.log('========================================');
      report.migrationOrder.slice(0, 10).forEach((item, i) => {
        console.log(`${i + 1}. ${item.component}`);
        console.log(`   Phase: ${item.phase} | Complexity: ${item.complexity}`);
        if (item.unmigratedDependencies.length > 0) {
          console.log(`   Unmigrated deps: ${item.unmigratedDependencies.join(', ')}`);
        }
      });
      
      // Save full report
      const outputPath = 'dependency-analysis.json';
      fs.writeFileSync(
        outputPath,
        JSON.stringify(report, null, 2)
      );
      console.log(`\n✅ Full report saved to ${outputPath}`);

    })
    .catch(error => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = DependencyAnalyzer;
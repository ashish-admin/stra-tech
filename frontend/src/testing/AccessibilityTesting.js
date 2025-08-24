/**
 * LokDarpan Accessibility Testing Automation
 * Automated WCAG compliance testing and accessibility validation for political dashboard
 */

class AccessibilityTesting {
  constructor(config = {}) {
    this.config = {
      // WCAG compliance levels
      wcagLevel: config.wcagLevel || 'AA', // A, AA, AAA
      wcagVersion: config.wcagVersion || '2.1', // 2.0, 2.1, 2.2
      
      // Testing configuration
      testingRules: {
        colorContrast: true,
        keyboardNavigation: true,
        ariaLabels: true,
        headingStructure: true,
        focusManagement: true,
        altText: true,
        formLabels: true,
        landmarkRoles: true,
        readingOrder: true,
        skipLinks: true
      },

      // Thresholds
      thresholds: {
        colorContrastRatio: 4.5, // AA standard
        maxTabIndex: 0, // Avoid positive tab indices
        maxHeadingJump: 1, // h1->h2->h3, no skipping
        minTouchTarget: 44, // 44px minimum touch target
        maxLineLength: 80 // characters per line for readability
      },

      // Reporting
      generateReport: true,
      reportFormat: 'detailed', // 'summary' or 'detailed'
      failOnViolations: false, // For CI/CD integration
      
      // Political dashboard specific
      politicalContext: {
        highContrastRequired: true, // Political data needs high contrast
        multiLanguageSupport: true, // Telugu/Hindi support needed
        screenReaderOptimization: true, // Critical for accessibility
        keyboardOnlyNavigation: true // Important for power users
      },

      ...config
    };

    this.axeInstance = null;
    this.testResults = [];
    this.isInitialized = false;
    this.observers = new Map();

    // Bind methods
    this.init = this.init.bind(this);
    this.runAccessibilityTest = this.runAccessibilityTest.bind(this);
    this.testKeyboardNavigation = this.testKeyboardNavigation.bind(this);
    this.testColorContrast = this.testColorContrast.bind(this);
  }

  /**
   * Initialize accessibility testing system
   */
  async init() {
    if (this.isInitialized) return true;

    try {
      // Load axe-core dynamically
      await this.loadAxeCore();
      
      // Configure axe for political dashboard
      this.configureAxe();
      
      // Set up continuous monitoring
      this.setupContinuousMonitoring();
      
      this.isInitialized = true;
      console.log('[LokDarpan] Accessibility testing system initialized');
      
      return true;
    } catch (error) {
      console.error('[LokDarpan] Failed to initialize accessibility testing:', error);
      return false;
    }
  }

  /**
   * Load axe-core library dynamically
   */
  async loadAxeCore() {
    if (window.axe) {
      this.axeInstance = window.axe;
      return;
    }

    try {
      // Load axe-core from CDN
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/axe-core@4.7.2/axe.min.js';
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      this.axeInstance = window.axe;
      console.log('[LokDarpan] axe-core loaded successfully');
    } catch (error) {
      console.warn('[LokDarpan] Failed to load axe-core, using fallback methods');
      this.axeInstance = null;
    }
  }

  /**
   * Configure axe for political dashboard context
   */
  configureAxe() {
    if (!this.axeInstance) return;

    // Configure rules based on WCAG level and political context
    const ruleConfiguration = {
      rules: {
        // Color and contrast
        'color-contrast': { 
          enabled: this.config.testingRules.colorContrast,
          options: {
            contrastRatio: {
              normal: this.config.thresholds.colorContrastRatio,
              large: 3.0
            }
          }
        },
        'color-contrast-enhanced': {
          enabled: this.config.politicalContext.highContrastRequired
        },

        // Keyboard navigation
        'keyboard': { enabled: this.config.testingRules.keyboardNavigation },
        'focus-order-semantics': { enabled: this.config.testingRules.focusManagement },
        'tabindex': { enabled: this.config.testingRules.keyboardNavigation },

        // ARIA and labels
        'aria-required-attr': { enabled: this.config.testingRules.ariaLabels },
        'aria-valid-attr': { enabled: this.config.testingRules.ariaLabels },
        'label': { enabled: this.config.testingRules.formLabels },
        'button-name': { enabled: this.config.testingRules.ariaLabels },
        'link-name': { enabled: this.config.testingRules.ariaLabels },

        // Heading structure
        'heading-order': { enabled: this.config.testingRules.headingStructure },
        'empty-heading': { enabled: this.config.testingRules.headingStructure },

        // Images and media
        'image-alt': { enabled: this.config.testingRules.altText },
        'image-redundant-alt': { enabled: this.config.testingRules.altText },

        // Landmarks and structure
        'landmark-unique': { enabled: this.config.testingRules.landmarkRoles },
        'region': { enabled: this.config.testingRules.landmarkRoles },
        'skip-link': { enabled: this.config.testingRules.skipLinks },

        // Political dashboard specific
        'page-has-heading-one': { enabled: true },
        'bypass': { enabled: true }, // Skip navigation
        'document-title': { enabled: true }
      },

      // Tags for WCAG compliance
      tags: [
        `wcag${this.config.wcagVersion.replace('.', '')}${this.config.wcagLevel.toLowerCase()}`,
        'best-practice'
      ]
    };

    this.axeInstance.configure(ruleConfiguration);
  }

  /**
   * Set up continuous accessibility monitoring
   */
  setupContinuousMonitoring() {
    if (!('MutationObserver' in window)) return;

    // Monitor DOM changes for accessibility issues
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldTest = false;

      mutations.forEach(mutation => {
        // Check for significant changes that might affect accessibility
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const addedElements = Array.from(mutation.addedNodes).filter(node => 
            node.nodeType === Node.ELEMENT_NODE
          );

          // Test if interactive elements were added
          const hasInteractiveElements = addedElements.some(element => 
            element.matches && (
              element.matches('button, a, input, select, textarea, [tabindex], [role="button"]') ||
              element.querySelector('button, a, input, select, textarea, [tabindex], [role="button"]')
            )
          );

          if (hasInteractiveElements) {
            shouldTest = true;
          }
        }

        // Check for attribute changes that might affect accessibility
        if (mutation.type === 'attributes') {
          const accessibilityAttributes = [
            'aria-label', 'aria-labelledby', 'aria-describedby', 'role', 
            'tabindex', 'alt', 'title', 'aria-expanded', 'aria-hidden'
          ];

          if (accessibilityAttributes.includes(mutation.attributeName)) {
            shouldTest = true;
          }
        }
      });

      if (shouldTest) {
        // Debounce testing to avoid excessive runs
        clearTimeout(this.mutationTestTimeout);
        this.mutationTestTimeout = setTimeout(() => {
          this.runAccessibilityTest('mutation');
        }, 2000);
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'aria-label', 'aria-labelledby', 'aria-describedby', 'role',
        'tabindex', 'alt', 'title', 'aria-expanded', 'aria-hidden'
      ]
    });

    this.observers.set('mutation', mutationObserver);

    // Monitor focus changes for keyboard navigation issues
    let lastFocusedElement = null;
    const focusHandler = (event) => {
      const currentFocus = event.target;
      
      // Check for focus traps or unreachable elements
      if (lastFocusedElement && currentFocus) {
        this.checkFocusTransition(lastFocusedElement, currentFocus);
      }
      
      lastFocusedElement = currentFocus;
    };

    document.addEventListener('focusin', focusHandler);
    document.addEventListener('focusout', focusHandler);
  }

  /**
   * Run comprehensive accessibility test
   */
  async runAccessibilityTest(trigger = 'manual', context = document) {
    if (!this.isInitialized) {
      console.warn('[LokDarpan] Accessibility testing not initialized');
      return null;
    }

    const testResult = {
      id: `a11y_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      trigger,
      context: this.getContextDescription(context),
      results: {
        axe: null,
        keyboardNavigation: null,
        colorContrast: null,
        customTests: null
      },
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        passed: false,
        score: 0
      }
    };

    try {
      // Run axe-core tests
      if (this.axeInstance) {
        testResult.results.axe = await this.runAxeTests(context);
      }

      // Run keyboard navigation tests
      if (this.config.testingRules.keyboardNavigation) {
        testResult.results.keyboardNavigation = await this.testKeyboardNavigation(context);
      }

      // Run color contrast tests
      if (this.config.testingRules.colorContrast) {
        testResult.results.colorContrast = await this.testColorContrast(context);
      }

      // Run custom accessibility tests
      testResult.results.customTests = await this.runCustomTests(context);

      // Calculate summary
      testResult.summary = this.calculateSummary(testResult.results);

      // Store result
      this.testResults.push(testResult);
      
      // Limit stored results
      if (this.testResults.length > 100) {
        this.testResults.splice(0, this.testResults.length - 100);
      }

      // Emit event
      window.dispatchEvent(new CustomEvent('lokdarpan:accessibility-test', {
        detail: testResult
      }));

      // Generate report if configured
      if (this.config.generateReport) {
        this.generateAccessibilityReport(testResult);
      }

      return testResult;

    } catch (error) {
      console.error('[LokDarpan] Accessibility test failed:', error);
      testResult.error = error.message;
      return testResult;
    }
  }

  /**
   * Run axe-core accessibility tests
   */
  async runAxeTests(context = document) {
    if (!this.axeInstance) {
      return { error: 'axe-core not available' };
    }

    try {
      const results = await this.axeInstance.run(context);
      
      return {
        violations: results.violations.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          nodes: violation.nodes.map(node => ({
            html: node.html,
            target: node.target,
            failureSummary: node.failureSummary,
            impact: node.impact
          }))
        })),
        passes: results.passes.length,
        incomplete: results.incomplete.map(incomplete => ({
          id: incomplete.id,
          description: incomplete.description,
          nodes: incomplete.nodes.length
        })),
        inapplicable: results.inapplicable.length
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Test keyboard navigation accessibility
   */
  async testKeyboardNavigation(context = document) {
    const issues = [];
    const interactiveElements = context.querySelectorAll(
      'button, a, input, select, textarea, [tabindex], [role="button"], [role="link"], [role="menuitem"]'
    );

    // Test each interactive element
    interactiveElements.forEach((element, index) => {
      const elementInfo = {
        element: element.tagName.toLowerCase(),
        id: element.id,
        className: element.className,
        index
      };

      // Check if element is keyboard accessible
      if (!this.isKeyboardAccessible(element)) {
        issues.push({
          type: 'not-keyboard-accessible',
          severity: 'high',
          message: 'Element cannot be reached or activated with keyboard',
          element: elementInfo
        });
      }

      // Check tabindex values
      const tabIndex = parseInt(element.getAttribute('tabindex'));
      if (tabIndex > 0) {
        issues.push({
          type: 'positive-tabindex',
          severity: 'medium',
          message: 'Positive tabindex disrupts natural tab order',
          element: elementInfo,
          tabindex: tabIndex
        });
      }

      // Check for missing ARIA labels on unlabeled buttons
      if (element.tagName.toLowerCase() === 'button' && 
          !element.textContent.trim() && 
          !element.getAttribute('aria-label') && 
          !element.getAttribute('aria-labelledby')) {
        issues.push({
          type: 'unlabeled-button',
          severity: 'high',
          message: 'Button has no accessible name',
          element: elementInfo
        });
      }

      // Check for missing alt text on images within links/buttons
      if (element.tagName.toLowerCase() === 'a' || element.tagName.toLowerCase() === 'button') {
        const images = element.querySelectorAll('img');
        images.forEach(img => {
          if (!img.getAttribute('alt') && !img.getAttribute('aria-label')) {
            issues.push({
              type: 'missing-alt-text',
              severity: 'medium',
              message: 'Image within interactive element lacks alt text',
              element: elementInfo,
              image: img.src
            });
          }
        });
      }
    });

    // Test skip links
    const skipLinks = context.querySelectorAll('a[href^="#"]');
    skipLinks.forEach(link => {
      const targetId = link.getAttribute('href').substring(1);
      const target = document.getElementById(targetId);
      
      if (!target) {
        issues.push({
          type: 'broken-skip-link',
          severity: 'medium',
          message: 'Skip link target does not exist',
          element: {
            href: link.href,
            text: link.textContent.trim()
          }
        });
      }
    });

    // Test focus indicators
    const focusableElements = context.querySelectorAll(':focus-visible');
    if (focusableElements.length === 0) {
      // Check if focus indicators are properly implemented
      const style = getComputedStyle(document.documentElement);
      if (!style.getPropertyValue('--focus-ring-color') && 
          !context.querySelector('[class*="focus"]')) {
        issues.push({
          type: 'missing-focus-indicators',
          severity: 'high',
          message: 'No visible focus indicators found',
          recommendation: 'Implement :focus-visible styles for better keyboard navigation'
        });
      }
    }

    return {
      totalElements: interactiveElements.length,
      issues,
      passed: issues.length === 0,
      score: Math.max(0, 100 - (issues.length * 10))
    };
  }

  /**
   * Test color contrast accessibility
   */
  async testColorContrast(context = document) {
    const issues = [];
    const textElements = context.querySelectorAll('*');
    
    const checkedElements = new Set();

    textElements.forEach((element, index) => {
      // Skip if already checked or if element has no text content
      if (checkedElements.has(element) || !element.textContent.trim()) {
        return;
      }

      const computedStyle = getComputedStyle(element);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      
      // Skip transparent backgrounds
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        return;
      }

      const contrast = this.calculateColorContrast(color, backgroundColor);
      const fontSize = parseFloat(computedStyle.fontSize);
      const fontWeight = computedStyle.fontWeight;
      
      // Determine if text is large (18pt+ or 14pt+ bold)
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
      const requiredContrast = isLargeText ? 3.0 : this.config.thresholds.colorContrastRatio;

      if (contrast < requiredContrast) {
        issues.push({
          type: 'insufficient-contrast',
          severity: contrast < 3.0 ? 'high' : 'medium',
          message: `Color contrast ratio ${contrast.toFixed(2)}:1 is below required ${requiredContrast}:1`,
          element: {
            tagName: element.tagName.toLowerCase(),
            id: element.id,
            className: element.className,
            text: element.textContent.trim().substring(0, 50)
          },
          colors: {
            foreground: color,
            background: backgroundColor
          },
          contrast: {
            actual: contrast,
            required: requiredContrast,
            isLargeText
          }
        });
      }

      checkedElements.add(element);
    });

    // Test political dashboard specific color requirements
    if (this.config.politicalContext.highContrastRequired) {
      const dashboardElements = context.querySelectorAll('[class*="dashboard"], [class*="chart"], [class*="metric"]');
      
      dashboardElements.forEach(element => {
        const style = getComputedStyle(element);
        const borderColor = style.borderColor;
        const backgroundColor = style.backgroundColor;
        
        if (borderColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          const contrast = this.calculateColorContrast(borderColor, backgroundColor);
          
          if (contrast < 3.0) {
            issues.push({
              type: 'dashboard-low-contrast',
              severity: 'high',
              message: 'Political dashboard elements require higher contrast for data clarity',
              element: {
                tagName: element.tagName.toLowerCase(),
                className: element.className
              },
              contrast: {
                actual: contrast,
                required: 3.0
              }
            });
          }
        }
      });
    }

    return {
      totalElementsChecked: checkedElements.size,
      issues,
      passed: issues.length === 0,
      score: Math.max(0, 100 - (issues.length * 15))
    };
  }

  /**
   * Run custom accessibility tests specific to political dashboard
   */
  async runCustomTests(context = document) {
    const issues = [];

    // Test 1: Heading structure
    const headings = context.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (index === 0 && level !== 1) {
        issues.push({
          type: 'missing-h1',
          severity: 'medium',
          message: 'Page should start with h1 heading',
          element: { tagName: heading.tagName, text: heading.textContent.trim() }
        });
      }
      
      if (level - previousLevel > 1) {
        issues.push({
          type: 'heading-skip',
          severity: 'medium',
          message: `Heading level jumps from h${previousLevel} to h${level}`,
          element: { tagName: heading.tagName, text: heading.textContent.trim() }
        });
      }
      
      previousLevel = level;
    });

    // Test 2: Form accessibility
    const forms = context.querySelectorAll('form');
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        const label = form.querySelector(`label[for="${input.id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        if (!label && !ariaLabel && !ariaLabelledBy && input.type !== 'hidden') {
          issues.push({
            type: 'unlabeled-input',
            severity: 'high',
            message: 'Form input lacks accessible label',
            element: {
              type: input.type,
              name: input.name,
              id: input.id
            }
          });
        }
      });
    });

    // Test 3: Political data accessibility (tables, charts)
    const tables = context.querySelectorAll('table');
    tables.forEach(table => {
      const caption = table.querySelector('caption');
      const headers = table.querySelectorAll('th');
      
      if (!caption && !table.getAttribute('aria-label') && !table.getAttribute('aria-labelledby')) {
        issues.push({
          type: 'table-missing-caption',
          severity: 'medium',
          message: 'Data table lacks accessible caption or label',
          element: { className: table.className }
        });
      }
      
      if (headers.length === 0) {
        issues.push({
          type: 'table-missing-headers',
          severity: 'high',
          message: 'Data table lacks header cells',
          element: { className: table.className }
        });
      }
    });

    // Test 4: Chart accessibility (canvas/svg elements)
    const charts = context.querySelectorAll('canvas, svg');
    charts.forEach(chart => {
      const hasAltText = chart.getAttribute('alt') || 
                        chart.getAttribute('aria-label') || 
                        chart.getAttribute('aria-labelledby');
      
      if (!hasAltText) {
        issues.push({
          type: 'chart-missing-alt',
          severity: 'high',
          message: 'Political data visualization lacks accessible description',
          element: {
            tagName: chart.tagName.toLowerCase(),
            className: chart.className
          },
          recommendation: 'Add aria-label with data summary or provide data table alternative'
        });
      }
    });

    // Test 5: Language and localization
    if (this.config.politicalContext.multiLanguageSupport) {
      const elementsWithText = context.querySelectorAll('*');
      let hasLanguageDeclaration = false;
      
      elementsWithText.forEach(element => {
        if (element.getAttribute('lang')) {
          hasLanguageDeclaration = true;
        }
      });
      
      if (!hasLanguageDeclaration && !document.documentElement.getAttribute('lang')) {
        issues.push({
          type: 'missing-language-declaration',
          severity: 'medium',
          message: 'Document lacks language declaration for screen readers',
          recommendation: 'Add lang attribute to html element or specific content sections'
        });
      }
    }

    // Test 6: Touch target size for mobile accessibility
    const interactiveElements = context.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const minSize = this.config.thresholds.minTouchTarget;
      
      if (rect.width < minSize || rect.height < minSize) {
        issues.push({
          type: 'small-touch-target',
          severity: 'medium',
          message: `Touch target ${Math.min(rect.width, rect.height).toFixed(0)}px is smaller than recommended ${minSize}px`,
          element: {
            tagName: element.tagName.toLowerCase(),
            id: element.id,
            size: { width: rect.width, height: rect.height }
          }
        });
      }
    });

    return {
      testsRun: 6,
      issues,
      passed: issues.length === 0,
      score: Math.max(0, 100 - (issues.length * 12))
    };
  }

  /**
   * Calculate comprehensive accessibility summary
   */
  calculateSummary(results) {
    let totalIssues = 0;
    let criticalIssues = 0;
    let totalScore = 0;
    let testCount = 0;

    // Count issues from all test results
    Object.values(results).forEach(result => {
      if (result && result.issues) {
        totalIssues += result.issues.length;
        criticalIssues += result.issues.filter(issue => issue.severity === 'high').length;
      }
      
      if (result && typeof result.score === 'number') {
        totalScore += result.score;
        testCount++;
      }
    });

    // Add axe violations
    if (results.axe && results.axe.violations) {
      totalIssues += results.axe.violations.length;
      criticalIssues += results.axe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length;
    }

    const averageScore = testCount > 0 ? totalScore / testCount : 0;
    const passed = criticalIssues === 0 && averageScore >= 80;

    return {
      totalIssues,
      criticalIssues,
      passed,
      score: Math.round(averageScore),
      wcagLevel: this.config.wcagLevel,
      compliance: this.determineComplianceLevel(averageScore, criticalIssues)
    };
  }

  /**
   * Generate accessibility report
   */
  generateAccessibilityReport(testResult) {
    const report = {
      title: 'LokDarpan Accessibility Test Report',
      timestamp: new Date(testResult.timestamp).toISOString(),
      summary: testResult.summary,
      details: testResult.results,
      recommendations: this.generateRecommendations(testResult)
    };

    // Emit report event
    window.dispatchEvent(new CustomEvent('lokdarpan:accessibility-report', {
      detail: report
    }));

    // Log summary to console
    console.log('[LokDarpan] Accessibility Test Results:', {
      score: testResult.summary.score,
      issues: testResult.summary.totalIssues,
      critical: testResult.summary.criticalIssues,
      passed: testResult.summary.passed
    });
  }

  /**
   * Generate accessibility recommendations
   */
  generateRecommendations(testResult) {
    const recommendations = [];
    
    // Analyze results and provide specific recommendations
    if (testResult.results.colorContrast && testResult.results.colorContrast.issues.length > 0) {
      recommendations.push({
        category: 'Color Contrast',
        priority: 'high',
        recommendation: 'Increase color contrast ratios to meet WCAG standards',
        impact: 'Critical for users with visual impairments',
        implementation: 'Use tools like WebAIM Contrast Checker to verify colors'
      });
    }

    if (testResult.results.keyboardNavigation && testResult.results.keyboardNavigation.issues.length > 0) {
      recommendations.push({
        category: 'Keyboard Navigation',
        priority: 'high',
        recommendation: 'Ensure all interactive elements are keyboard accessible',
        impact: 'Essential for keyboard-only users and screen reader users',
        implementation: 'Test navigation using only Tab, Shift+Tab, Enter, and arrow keys'
      });
    }

    if (testResult.summary.score < 80) {
      recommendations.push({
        category: 'General',
        priority: 'medium',
        recommendation: 'Conduct regular accessibility testing and user testing with disabled users',
        impact: 'Ensures political information is accessible to all citizens',
        implementation: 'Integrate accessibility testing into development workflow'
      });
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  isKeyboardAccessible(element) {
    // Check if element can receive focus
    const canFocus = element.tabIndex >= 0 || 
                    ['a', 'button', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase()) ||
                    element.getAttribute('contenteditable') === 'true';
    
    // Check if element is visible
    const style = getComputedStyle(element);
    const isVisible = style.display !== 'none' && 
                     style.visibility !== 'hidden' && 
                     style.opacity !== '0';
    
    return canFocus && isVisible;
  }

  calculateColorContrast(foreground, background) {
    // Simplified color contrast calculation
    // In a real implementation, you'd use a proper color contrast library
    const fgRgb = this.parseColor(foreground);
    const bgRgb = this.parseColor(background);
    
    if (!fgRgb || !bgRgb) return 21; // Assume good contrast if can't parse
    
    const fgLuminance = this.getLuminance(fgRgb);
    const bgLuminance = this.getLuminance(bgRgb);
    
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  parseColor(color) {
    // Very basic color parsing - in production use a proper color library
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      return matches ? [parseInt(matches[0]), parseInt(matches[1]), parseInt(matches[2])] : null;
    }
    return null;
  }

  getLuminance(rgb) {
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  checkFocusTransition(fromElement, toElement) {
    // Check if focus transition is logical
    // This is a simplified implementation
    const fromTabIndex = parseInt(fromElement.getAttribute('tabindex') || '0');
    const toTabIndex = parseInt(toElement.getAttribute('tabindex') || '0');
    
    // Log unusual focus transitions
    if (fromTabIndex > 0 && toTabIndex > 0 && Math.abs(toTabIndex - fromTabIndex) > 1) {
      console.warn('[LokDarpan] Unusual focus transition detected:', {
        from: { element: fromElement.tagName, tabindex: fromTabIndex },
        to: { element: toElement.tagName, tabindex: toTabIndex }
      });
    }
  }

  getContextDescription(context) {
    if (context === document) return 'Full Document';
    
    return {
      tagName: context.tagName?.toLowerCase(),
      id: context.id,
      className: context.className,
      selector: this.getElementSelector(context)
    };
  }

  getElementSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  determineComplianceLevel(score, criticalIssues) {
    if (criticalIssues > 0) return 'Non-compliant';
    if (score >= 95) return 'AAA';
    if (score >= 80) return 'AA';
    if (score >= 60) return 'A';
    return 'Non-compliant';
  }

  /**
   * Public API methods
   */
  async testPage(url = window.location.href) {
    return this.runAccessibilityTest('page-test', document);
  }

  async testComponent(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) {
      throw new Error('Element not found');
    }
    
    return this.runAccessibilityTest('component-test', element);
  }

  getTestResults(limit = 10) {
    return this.testResults.slice(-limit);
  }

  getLatestResult() {
    return this.testResults[this.testResults.length - 1] || null;
  }

  /**
   * Cleanup method
   */
  destroy() {
    // Clear timeouts
    if (this.mutationTestTimeout) {
      clearTimeout(this.mutationTestTimeout);
    }

    // Disconnect observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }

    // Clear data
    this.testResults = [];
    this.observers.clear();
    this.isInitialized = false;

    console.log('[LokDarpan] Accessibility testing system destroyed');
  }
}

// Create singleton instance
const accessibilityTesting = new AccessibilityTesting({
  wcagLevel: 'AA',
  politicalContext: {
    highContrastRequired: true,
    multiLanguageSupport: true,
    screenReaderOptimization: true,
    keyboardOnlyNavigation: true
  }
});

export default accessibilityTesting;
export { AccessibilityTesting };
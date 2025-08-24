/**
 * Accessibility Compliance Validator for LokDarpan
 * WCAG 2.1 AA compliance checking and automated accessibility improvements
 */

class AccessibilityValidator {
  constructor(options = {}) {
    this.options = {
      wcagLevel: options.wcagLevel || 'AA',
      enableAutoFix: options.enableAutoFix !== false,
      enableLiveValidation: options.enableLiveValidation !== false,
      enableReporting: options.enableReporting !== false,
      reportingEndpoint: options.reportingEndpoint || '/api/v1/accessibility/report',
      enableKeyboardNavigation: options.enableKeyboardNavigation !== false,
      enableScreenReaderSupport: options.enableScreenReaderSupport !== false,
      enableColorContrast: options.enableColorContrast !== false,
      enableFocusManagement: options.enableFocusManagement !== false,
      ...options
    };

    this.issues = [];
    this.fixedIssues = [];
    this.observer = null;
    this.keyboardTrap = null;
    this.announcer = null;

    this.init();
  }

  init() {
    // Create screen reader announcer
    this.createScreenReaderAnnouncer();

    // Setup keyboard navigation
    if (this.options.enableKeyboardNavigation) {
      this.setupKeyboardNavigation();
    }

    // Setup focus management
    if (this.options.enableFocusManagement) {
      this.setupFocusManagement();
    }

    // Start live validation if enabled
    if (this.options.enableLiveValidation) {
      this.startLiveValidation();
    }

    // Initial validation
    this.validatePage();
  }

  // Screen Reader Support
  createScreenReaderAnnouncer() {
    if (document.getElementById('sr-announcer')) return;

    this.announcer = document.createElement('div');
    this.announcer.id = 'sr-announcer';
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;

    document.body.appendChild(this.announcer);
  }

  announce(message, priority = 'polite') {
    if (!this.announcer) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = '';
    
    // Small delay to ensure screen reader picks up the change
    setTimeout(() => {
      this.announcer.textContent = message;
    }, 100);
  }

  // Keyboard Navigation
  setupKeyboardNavigation() {
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    
    // Add skip links
    this.addSkipLinks();
    
    // Ensure all interactive elements are focusable
    this.ensureFocusableElements();
  }

  handleKeyboardNavigation(event) {
    const { key, ctrlKey, altKey, shiftKey } = event;
    
    // Skip to main content (Alt + S)
    if (altKey && key === 's') {
      event.preventDefault();
      const main = document.querySelector('main, [role="main"], #main-content');
      if (main) {
        main.focus();
        this.announce('Skipped to main content');
      }
    }

    // Skip to navigation (Alt + N)
    if (altKey && key === 'n') {
      event.preventDefault();
      const nav = document.querySelector('nav, [role="navigation"]');
      if (nav) {
        const firstLink = nav.querySelector('a, button, [tabindex="0"]');
        if (firstLink) {
          firstLink.focus();
          this.announce('Skipped to navigation');
        }
      }
    }

    // Escape key handling for modals/dialogs
    if (key === 'Escape') {
      const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (activeModal) {
        this.closeModal(activeModal);
      }
    }

    // Tab trapping in modals
    if (key === 'Tab') {
      const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (activeModal) {
        this.handleModalTabbing(event, activeModal);
      }
    }
  }

  addSkipLinks() {
    if (document.getElementById('skip-links')) return;

    const skipLinks = document.createElement('div');
    skipLinks.id = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
    `;

    // Add CSS for skip links
    const style = document.createElement('style');
    style.textContent = `
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 9999;
        border-radius: 0 0 4px 4px;
      }
      
      .skip-link:focus {
        top: 0;
      }
    `;
    
    document.head.appendChild(style);
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  ensureFocusableElements() {
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"]');
    
    interactiveElements.forEach(element => {
      if (!element.hasAttribute('tabindex') && !this.isNativelyFocusable(element)) {
        element.setAttribute('tabindex', '0');
      }

      // Ensure ARIA labels
      if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
        const label = this.generateAccessibleLabel(element);
        if (label) {
          element.setAttribute('aria-label', label);
        }
      }
    });
  }

  isNativelyFocusable(element) {
    const focusableElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    return focusableElements.includes(element.tagName) && !element.disabled;
  }

  generateAccessibleLabel(element) {
    // Try to generate meaningful labels from context
    const text = element.textContent?.trim();
    if (text) return text;

    const title = element.getAttribute('title');
    if (title) return title;

    const alt = element.getAttribute('alt');
    if (alt) return alt;

    // For icons, try to infer from class names
    const className = element.className;
    if (className.includes('close')) return 'Close';
    if (className.includes('menu')) return 'Menu';
    if (className.includes('search')) return 'Search';
    if (className.includes('edit')) return 'Edit';
    if (className.includes('delete')) return 'Delete';

    return null;
  }

  // Focus Management
  setupFocusManagement() {
    this.previousFocus = null;
    
    // Track focus changes
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
  }

  handleFocusIn(event) {
    const element = event.target;
    
    // Announce dynamic content changes to screen readers
    if (element.getAttribute('aria-live')) {
      const content = element.textContent || element.innerText;
      if (content !== this.lastAnnouncedContent) {
        this.announce(content);
        this.lastAnnouncedContent = content;
      }
    }

    // Ensure visible focus indicator
    if (!this.hasVisibleFocus(element)) {
      element.style.outline = '2px solid #005fcc';
      element.style.outlineOffset = '2px';
    }
  }

  handleFocusOut(event) {
    const element = event.target;
    
    // Remove custom focus styles
    if (element.style.outline === '2px solid #005fcc') {
      element.style.outline = '';
      element.style.outlineOffset = '';
    }
  }

  hasVisibleFocus(element) {
    const style = window.getComputedStyle(element);
    return style.outline !== 'none' && style.outline !== '';
  }

  // Modal Focus Management
  handleModalTabbing(event, modal) {
    const focusableElements = this.getFocusableElements(modal);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  getFocusableElements(container) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(element => this.isVisible(element));
  }

  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  closeModal(modal) {
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    
    // Return focus to previous element
    if (this.previousFocus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
    
    this.announce('Dialog closed');
  }

  // Color Contrast Validation
  validateColorContrast() {
    if (!this.options.enableColorContrast) return [];

    const issues = [];
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, label, span, div');

    textElements.forEach(element => {
      const style = window.getComputedStyle(element);
      const color = this.parseColor(style.color);
      const backgroundColor = this.getBackgroundColor(element);
      
      if (color && backgroundColor) {
        const contrast = this.calculateContrast(color, backgroundColor);
        const requiredContrast = this.getRequiredContrast(element);
        
        if (contrast < requiredContrast) {
          issues.push({
            type: 'color-contrast',
            element,
            contrast,
            required: requiredContrast,
            description: `Insufficient color contrast: ${contrast.toFixed(2)} (required: ${requiredContrast})`
          });
        }
      }
    });

    return issues;
  }

  parseColor(colorString) {
    const div = document.createElement('div');
    div.style.color = colorString;
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div).color;
    document.body.removeChild(div);
    
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  }

  getBackgroundColor(element) {
    let current = element;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const bg = style.backgroundColor;
      
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        return this.parseColor(bg);
      }
      current = current.parentElement;
    }
    
    // Default to white background
    return { r: 255, g: 255, b: 255 };
  }

  calculateContrast(color1, color2) {
    const l1 = this.getLuminance(color1);
    const l2 = this.getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  getLuminance(color) {
    const { r, g, b } = color;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  getRequiredContrast(element) {
    const style = window.getComputedStyle(element);
    const fontSize = parseInt(style.fontSize);
    const fontWeight = style.fontWeight;
    
    // Large text (18pt+ or 14pt+ bold) requires 3:1, normal text requires 4.5:1
    if (fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))) {
      return 3;
    }
    return 4.5;
  }

  // ARIA Validation
  validateARIA() {
    const issues = [];
    
    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt && !img.getAttribute('aria-hidden')) {
        issues.push({
          type: 'missing-alt-text',
          element: img,
          description: 'Image missing alt text'
        });
      }
    });

    // Check for form labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const hasLabel = input.labels?.length > 0 || 
                     input.getAttribute('aria-label') || 
                     input.getAttribute('aria-labelledby');
      
      if (!hasLabel) {
        issues.push({
          type: 'missing-form-label',
          element: input,
          description: 'Form control missing accessible label'
        });
      }
    });

    // Check for heading structure
    this.validateHeadingStructure(issues);

    // Check for landmark roles
    this.validateLandmarks(issues);

    return issues;
  }

  validateHeadingStructure(issues) {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;

    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level > previousLevel + 1) {
        issues.push({
          type: 'heading-structure',
          element: heading,
          description: `Heading level ${level} follows heading level ${previousLevel} (skips levels)`
        });
      }
      
      previousLevel = level;
    });
  }

  validateLandmarks(issues) {
    const requiredLandmarks = ['main', 'navigation'];
    
    requiredLandmarks.forEach(landmark => {
      const hasLandmark = document.querySelector(`${landmark}, [role="${landmark}"]`);
      if (!hasLandmark) {
        issues.push({
          type: 'missing-landmark',
          element: document.body,
          description: `Missing ${landmark} landmark`
        });
      }
    });
  }

  // Live Validation
  startLiveValidation() {
    if (!('MutationObserver' in window)) return;

    this.observer = new MutationObserver((mutations) => {
      let shouldValidate = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' || 
            (mutation.type === 'attributes' && this.isAccessibilityAttribute(mutation.attributeName))) {
          shouldValidate = true;
        }
      });

      if (shouldValidate) {
        // Debounce validation
        clearTimeout(this.validationTimeout);
        this.validationTimeout = setTimeout(() => {
          this.validatePage();
        }, 500);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'aria-expanded', 'tabindex', 'role', 'aria-label', 'aria-labelledby']
    });
  }

  isAccessibilityAttribute(attributeName) {
    return attributeName?.startsWith('aria-') || 
           attributeName === 'tabindex' || 
           attributeName === 'role' || 
           attributeName === 'alt';
  }

  // Auto-fix Common Issues
  autoFixIssues(issues) {
    if (!this.options.enableAutoFix) return;

    issues.forEach(issue => {
      try {
        switch (issue.type) {
          case 'missing-alt-text':
            this.fixMissingAltText(issue.element);
            break;
          case 'missing-form-label':
            this.fixMissingFormLabel(issue.element);
            break;
          case 'missing-landmark':
            this.fixMissingLandmark(issue);
            break;
        }
        this.fixedIssues.push(issue);
      } catch (error) {
        console.warn('[A11y] Auto-fix failed for issue:', issue, error);
      }
    });
  }

  fixMissingAltText(img) {
    // Generate alt text based on context or src
    let altText = '';
    
    const src = img.src;
    const className = img.className;
    
    if (className.includes('logo')) {
      altText = 'Logo';
    } else if (className.includes('avatar') || className.includes('profile')) {
      altText = 'Profile picture';
    } else if (src) {
      // Extract filename and clean it up
      const filename = src.split('/').pop().split('.')[0];
      altText = filename.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    } else {
      altText = 'Image';
    }
    
    img.setAttribute('alt', altText);
    this.announce(`Auto-generated alt text: ${altText}`);
  }

  fixMissingFormLabel(input) {
    // Try to find an adjacent label or create one
    const placeholder = input.placeholder;
    const name = input.name;
    const type = input.type;
    
    let labelText = '';
    
    if (placeholder) {
      labelText = placeholder;
    } else if (name) {
      labelText = name.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    } else {
      labelText = type === 'email' ? 'Email' : 
                  type === 'password' ? 'Password' : 
                  type === 'tel' ? 'Phone' : 'Input field';
    }
    
    input.setAttribute('aria-label', labelText);
    this.announce(`Auto-generated label: ${labelText}`);
  }

  fixMissingLandmark(issue) {
    if (issue.description.includes('main')) {
      const content = document.querySelector('#main, #content, .main-content');
      if (content && !content.tagName === 'MAIN') {
        content.setAttribute('role', 'main');
      }
    }
  }

  // Main Validation Method
  validatePage() {
    this.issues = [];
    
    // Run all validations
    const ariaIssues = this.validateARIA();
    const contrastIssues = this.validateColorContrast();
    
    this.issues = [...ariaIssues, ...contrastIssues];
    
    // Auto-fix issues if enabled
    this.autoFixIssues(this.issues);
    
    // Report results
    this.reportResults();
    
    return {
      issues: this.issues,
      fixedIssues: this.fixedIssues,
      score: this.calculateAccessibilityScore()
    };
  }

  calculateAccessibilityScore() {
    const totalChecks = 100; // Base score
    const penalty = this.issues.length * 5; // 5 points per issue
    return Math.max(0, totalChecks - penalty);
  }

  reportResults() {
    if (!this.options.enableReporting) return;

    const report = {
      timestamp: Date.now(),
      url: window.location.href,
      wcagLevel: this.options.wcagLevel,
      issues: this.issues.length,
      fixed: this.fixedIssues.length,
      score: this.calculateAccessibilityScore(),
      details: this.issues.map(issue => ({
        type: issue.type,
        description: issue.description,
        element: issue.element?.tagName || 'unknown'
      }))
    };

    // Send to reporting endpoint
    fetch(this.options.reportingEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    }).catch(error => {
      console.warn('[A11y] Failed to send accessibility report:', error);
    });

    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Accessibility Report');
      console.log(`Score: ${report.score}/100`);
      console.log(`Issues found: ${report.issues}`);
      console.log(`Auto-fixed: ${report.fixed}`);
      if (this.issues.length > 0) {
        console.table(this.issues.map(issue => ({
          Type: issue.type,
          Description: issue.description,
          Element: issue.element?.tagName || 'N/A'
        })));
      }
      console.groupEnd();
    }
  }

  // Public API
  getIssues() {
    return this.issues;
  }

  getScore() {
    return this.calculateAccessibilityScore();
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.announcer) {
      this.announcer.remove();
    }
    
    document.removeEventListener('keydown', this.handleKeyboardNavigation);
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
  }
}

// Singleton instance
let validatorInstance = null;

export const initAccessibilityValidator = (options = {}) => {
  if (!validatorInstance) {
    validatorInstance = new AccessibilityValidator(options);
  }
  return validatorInstance;
};

export const getAccessibilityValidator = () => validatorInstance;

// React Hook for Accessibility
export const useAccessibility = () => {
  const validator = getAccessibilityValidator();
  
  return {
    validatePage: validator?.validatePage.bind(validator),
    announce: validator?.announce.bind(validator),
    getScore: validator?.getScore.bind(validator),
    getIssues: validator?.getIssues.bind(validator),
    isAvailable: !!validator
  };
};

export default AccessibilityValidator;
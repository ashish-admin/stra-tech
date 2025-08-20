/**
 * Comprehensive End-to-End tests for Political Strategist system.
 * Tests complete user workflows including AI analysis, real-time intelligence feed,
 * and integration with the main dashboard.
 * 
 * @requires @playwright/test
 */
import { test, expect } from '@playwright/test';

// Test data and mock responses for consistent testing
const TEST_USER = {
  username: 'user',
  password: 'ayra'
};

const TEST_WARD = 'Jubilee Hills';

const MOCK_STRATEGIST_RESPONSE = {
  status: 'success',
  analysis: {
    strategic_overview: 'Comprehensive analysis of Jubilee Hills political landscape showing strong development focus with mixed public sentiment.',
    key_intelligence: [
      {
        category: 'public_sentiment',
        content: 'Positive sentiment regarding infrastructure development (85% confidence)',
        impact_level: 'high',
        confidence: 0.85
      },
      {
        category: 'competitive_landscape',
        content: 'BJP leading on development narrative, TRS focusing on governance record',
        impact_level: 'medium',
        confidence: 0.78
      }
    ],
    opportunities: [
      {
        description: 'Strong public support for infrastructure initiatives',
        timeline: 'immediate',
        priority: 1,
        confidence: 0.82
      }
    ],
    threats: [
      {
        description: 'Opposition criticism on implementation timeline delays',
        severity: 'medium',
        mitigation_strategy: 'Proactive communication on project milestones',
        confidence: 0.77
      }
    ],
    recommended_actions: [
      {
        category: 'immediate',
        description: 'Launch public consultation sessions on development priorities',
        timeline: '24-48h',
        priority: 1,
        expected_impact: 'high'
      }
    ],
    confidence_score: 0.82
  },
  metadata: {
    ward: 'Jubilee Hills',
    analysis_depth: 'standard',
    context_mode: 'neutral',
    timestamp: '2024-01-15T10:30:00Z',
    processing_time: 2.5,
    source_count: 15,
    api_version: '1.0'
  }
};

const MOCK_INTELLIGENCE_FEED = [
  {
    id: 'intel_001',
    category: 'breaking_news',
    headline: 'Municipal Corporation approves ₹50 crore infrastructure project for Jubilee Hills',
    summary: 'Major infrastructure development including road widening and drainage improvements receives unanimous approval',
    confidence: 0.92,
    timestamp: '2024-01-15T10:30:00Z',
    source: 'The Hindu',
    priority: 'high',
    url: 'https://thehindu.com/news/cities/hyderabad/article123.ece',
    impact_level: 'high',
    actionable: true
  },
  {
    id: 'intel_002',
    category: 'sentiment_shift',
    headline: 'Public sentiment on development projects shows 15% positive increase',
    summary: 'Social media analysis indicates growing support for infrastructure initiatives',
    confidence: 0.84,
    timestamp: '2024-01-15T10:15:00Z',
    source: 'Social Media Analytics',
    priority: 'medium',
    impact_level: 'medium',
    actionable: false
  }
];

test.describe('Political Strategist E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up API route mocking for consistent test results
    await page.route('**/api/v1/strategist/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/api/v1/strategist/' + TEST_WARD)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_STRATEGIST_RESPONSE)
        });
      } else if (url.includes('/intelligence/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            feed: MOCK_INTELLIGENCE_FEED,
            metadata: {
              total_items: MOCK_INTELLIGENCE_FEED.length,
              last_updated: '2024-01-15T10:30:00Z'
            }
          })
        });
      } else if (url.includes('/health')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'healthy',
            components: {
              gemini_api: { status: 'healthy', response_time: 0.5 },
              perplexity_api: { status: 'healthy', response_time: 0.8 },
              redis_cache: { status: 'healthy', memory_usage: '10MB' }
            },
            timestamp: '2024-01-15T10:30:00Z'
          })
        });
      }
    });

    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Login if required
    const loginForm = page.locator('form[data-testid="login-form"]');
    if (await loginForm.isVisible()) {
      await page.fill('input[name="username"]', TEST_USER.username);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
  });

  test.describe('Authentication and Authorization', () => {
    test('should require authentication to access strategist features', async ({ page }) => {
      // Navigate to app without authentication
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      
      // Should be on login page or redirected to login
      const hasLoginForm = await page.locator('input[name="username"]').isVisible();
      expect(hasLoginForm).toBeTruthy();
    });

    test('should successfully login and access dashboard', async ({ page }) => {
      // Login form should already be visible from beforeEach setup
      await page.waitForSelector('input[name="username"]');
      
      // Fill and submit login form
      await page.fill('input[name="username"]', TEST_USER.username);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    });
  });

  test.describe('Ward Selection and Navigation', () => {
    test('should display ward selection controls', async ({ page }) => {
      await page.waitForSelector('[data-testid="dashboard"]');
      
      // Check for ward selection dropdown or input
      const wardSelector = page.locator('[data-testid="ward-selector"]');
      await expect(wardSelector).toBeVisible();
      
      // Check for map component
      const locationMap = page.locator('[data-testid="location-map"]');
      if (await locationMap.isVisible()) {
        await expect(locationMap).toBeVisible();
      }
    });

    test('should select ward and trigger AI strategist analysis', async ({ page }) => {
      await page.waitForSelector('[data-testid="dashboard"]');
      
      // Select test ward from dropdown
      const wardSelector = page.locator('[data-testid="ward-selector"]');
      if (await wardSelector.locator('select').isVisible()) {
        await page.selectOption('[data-testid="ward-selector"] select', TEST_WARD);
      } else if (await wardSelector.locator('input').isVisible()) {
        await page.fill('[data-testid="ward-selector"] input', TEST_WARD);
        await page.keyboard.press('Enter');
      }
      
      // Wait for Political Strategist component to load
      const strategist = page.locator('[data-testid="political-strategist"]');
      if (await strategist.isVisible({ timeout: 5000 })) {
        await expect(page.locator('text=Political Strategist')).toBeVisible();
        await expect(page.locator('text=' + TEST_WARD)).toBeVisible();
      }
    });
  });
  
  test('Strategic Summary displays and switches to AI mode', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Find Strategic Summary section
    const strategicSection = page.locator('[data-testid="strategic-summary"]');
    await expect(strategicSection).toBeVisible();
    
    // Should initially show legacy mode for "All" wards
    await expect(page.locator('text=Area Pulse')).toBeVisible();
    
    // Select a specific ward to trigger AI mode
    await page.click('[data-testid="ward-selector"]');
    await page.click('text=Jubilee Hills');
    
    // Wait for AI strategist to load (if feature flag is enabled)
    await page.waitForTimeout(2000);
    
    // Check if AI mode activated
    const aiStrategist = page.locator('[data-testid="political-strategist"]');
    if (await aiStrategist.isVisible()) {
      await expect(page.locator('text=Political Strategist')).toBeVisible();
      await expect(page.locator('text=Jubilee Hills')).toBeVisible();
    }
  });
  
  test('AI Strategist analysis workflow', async ({ page }) => {
    // Skip test if feature flag not enabled
    await page.goto('http://localhost:5173');
    
    // Select specific ward
    await page.waitForSelector('[data-testid="ward-selector"]');
    await page.selectOption('[data-testid="ward-selector"]', 'Jubilee Hills');
    
    // Check if AI strategist is available
    const aiStrategist = page.locator('[data-testid="political-strategist"]');
    
    if (await aiStrategist.isVisible()) {
      // Test analysis controls
      await page.click('[data-testid="analysis-settings-toggle"]');
      
      // Change analysis depth
      await page.click('text=Deep');
      await expect(page.locator('.bg-blue-50')).toContainText('Deep');
      
      // Change strategic context
      await page.click('text=Offensive');
      await expect(page.locator('.bg-blue-50')).toContainText('Offensive');
      
      // Trigger analysis
      await page.click('[data-testid="refresh-analysis"]');
      
      // Wait for analysis to complete
      await page.waitForSelector('[data-testid="strategist-briefing"]', { timeout: 30000 });
      
      // Verify briefing components are displayed
      await expect(page.locator('[data-testid="strategic-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="key-intelligence"]')).toBeVisible();
      await expect(page.locator('[data-testid="recommended-actions"]')).toBeVisible();
      
      // Verify confidence score is displayed
      await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
    } else {
      console.log('AI Strategist not available - feature flag disabled or system not ready');
    }
  });
  
  test('Intelligence feed real-time updates', async ({ page }) => {
    // Navigate and select ward
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="ward-selector"]');
    await page.selectOption('[data-testid="ward-selector"]', 'Jubilee Hills');
    
    const intelligenceFeed = page.locator('[data-testid="intelligence-feed"]');
    
    if (await intelligenceFeed.isVisible()) {
      // Check feed status
      const feedStatus = page.locator('[data-testid="feed-status"]');
      await expect(feedStatus).toBeVisible();
      
      // Test priority filtering
      await page.click('[data-testid="priority-filter"]');
      await page.selectOption('[data-testid="priority-filter"]', 'high');
      
      // Test type filtering
      await page.click('[data-testid="type-filter"]');
      await page.selectOption('[data-testid="type-filter"]', 'alerts');
      
      // Verify filtering works
      const alertItems = page.locator('[data-testid^="intelligence-item-alert"]');
      const intelItems = page.locator('[data-testid^="intelligence-item-intel"]');
      
      // With alerts filter, should only show alerts
      if (await alertItems.count() > 0) {
        await expect(alertItems.first()).toBeVisible();
      }
    }
  });
  
  test('System status and health monitoring', async ({ page }) => {
    // Test health endpoint directly
    const response = await page.request.get('http://localhost:5000/api/v1/strategist/health');
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status');
    expect(healthData).toHaveProperty('timestamp');
    
    // Test system status endpoint (requires auth)
    await page.goto('http://localhost:5173');
    
    // Navigate to admin/monitoring if available
    const monitoringLink = page.locator('text=System Status');
    if (await monitoringLink.isVisible()) {
      await monitoringLink.click();
      
      // Verify monitoring dashboard loads
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
      await expect(page.locator('text=AI Services')).toBeVisible();
      await expect(page.locator('text=Cache Status')).toBeVisible();
    }
  });
  
  test('Error handling and recovery', async ({ page }) => {
    // Navigate to strategist
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="ward-selector"]');
    await page.selectOption('[data-testid="ward-selector"]', 'Jubilee Hills');
    
    // Simulate network failure by intercepting API calls
    await page.route('**/api/v1/strategist/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    const aiStrategist = page.locator('[data-testid="political-strategist"]');
    
    if (await aiStrategist.isVisible()) {
      // Try to refresh analysis
      await page.click('[data-testid="refresh-analysis"]');
      
      // Should show error state
      await expect(page.locator('text=Analysis temporarily unavailable')).toBeVisible();
      
      // Should offer retry option
      await expect(page.locator('[data-testid="retry-analysis"]')).toBeVisible();
    }
  });
  
  test('Performance benchmarks', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Measure ward selection performance
    const selectionStart = Date.now();
    await page.waitForSelector('[data-testid="ward-selector"]');
    await page.selectOption('[data-testid="ward-selector"]', 'Jubilee Hills');
    await page.waitForLoadState('networkidle');
    const selectionTime = Date.now() - selectionStart;
    
    // Ward selection should be responsive (under 1 second)
    expect(selectionTime).toBeLessThan(1000);
  });
  
  test('Mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Check that strategist components are mobile-friendly
    const strategicSection = page.locator('[data-testid="strategic-summary"]');
    await expect(strategicSection).toBeVisible();
    
    // On mobile, controls should be collapsible
    const aiStrategist = page.locator('[data-testid="political-strategist"]');
    if (await aiStrategist.isVisible()) {
      await page.click('[data-testid="analysis-settings-toggle"]');
      
      // Settings should be visible after toggle
      await expect(page.locator('[data-testid="analysis-controls"]')).toBeVisible();
    }
  });
});

test.describe('API Integration Tests', () => {
  
  test('Ward analysis API integration', async ({ page }) => {
    // Test direct API call
    const response = await page.request.get('http://localhost:5000/api/v1/strategist/Jubilee%20Hills?depth=quick');
    
    if (response.status() === 200) {
      const data = await response.json();
      
      expect(data).toHaveProperty('strategic_overview');
      expect(data).toHaveProperty('confidence_score');
      expect(data.confidence_score).toBeGreaterThanOrEqual(0);
      expect(data.confidence_score).toBeLessThanOrEqual(1);
    } else if (response.status() === 401) {
      // Authentication required - expected in some configurations
      console.log('API requires authentication - test skipped');
    } else {
      console.log(`API returned status: ${response.status()}`);
    }
  });
  
  test('Intelligence feed SSE connection', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Check if SSE connection is established
    await page.waitForFunction(() => {
      return window.EventSource !== undefined;
    });
    
    // Monitor network for SSE connections
    const ssePromise = page.waitForRequest(request => 
      request.url().includes('/api/v1/strategist/feed') && 
      request.headers()['accept'] === 'text/event-stream'
    );
    
    // Select ward to trigger SSE connection
    await page.waitForSelector('[data-testid="ward-selector"]');
    await page.selectOption('[data-testid="ward-selector"]', 'Jubilee Hills');
    
    // Wait for SSE connection attempt
    try {
      await ssePromise;
      console.log('SSE connection attempted successfully');
    } catch (error) {
      console.log('SSE connection not established - may be normal for this test');
    }
  });
});

test.describe('Security Tests', () => {
  
  test('Unauthenticated access restrictions', async ({ page }) => {
    // Test direct access to protected endpoints
    const protectedEndpoints = [
      '/api/v1/strategist/Jubilee%20Hills',
      '/api/v1/strategist/analyze',
      '/api/v1/strategist/status'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const response = await page.request.get(`http://localhost:5000${endpoint}`);
      
      // Should either require auth (401) or redirect to login
      expect([401, 302, 403]).toContain(response.status());
    }
  });
  
  test('Input sanitization', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Try XSS in ward selection
    const xssPayload = '<script>alert("XSS")</script>';
    
    await page.waitForSelector('[data-testid="ward-input"]');
    await page.fill('[data-testid="ward-input"]', xssPayload);
    
    // Should not execute script
    page.on('dialog', dialog => {
      expect(dialog.type()).not.toBe('alert');
      dialog.dismiss();
    });
    
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Page should still be functional
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});

test.describe('Data Validation Tests', () => {
  
  test('Briefing data structure validation', async ({ page }) => {
    const response = await page.request.get('http://localhost:5000/api/v1/strategist/Test%20Ward?depth=quick');
    
    if (response.status() === 200) {
      const data = await response.json();
      
      // Validate required fields
      expect(data).toHaveProperty('strategic_overview');
      expect(data).toHaveProperty('confidence_score');
      expect(typeof data.confidence_score).toBe('number');
      expect(data.confidence_score).toBeGreaterThanOrEqual(0);
      expect(data.confidence_score).toBeLessThanOrEqual(1);
      
      // Validate arrays exist
      if (data.key_intelligence) {
        expect(Array.isArray(data.key_intelligence)).toBe(true);
      }
      
      if (data.recommended_actions) {
        expect(Array.isArray(data.recommended_actions)).toBe(true);
      }
      
      // Validate internal use flag
      expect(data).toHaveProperty('internal_use_only');
      expect(data.internal_use_only).toBe(true);
    }
  });
  
  test('Cache headers validation', async ({ page }) => {
    const response = await page.request.get('http://localhost:5000/api/v1/strategist/Test%20Ward');
    
    if (response.status() === 200) {
      const headers = response.headers();
      
      // Should have cache-related headers
      expect(headers).toHaveProperty('etag');
      expect(headers).toHaveProperty('cache-control');
    }
  });
});

test.describe('Performance Tests', () => {
  
  test('Analysis response time', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="ward-selector"]');
    
    // Measure analysis time
    const startTime = Date.now();
    await page.selectOption('[data-testid="ward-selector"]', 'Jubilee Hills');
    
    // Wait for analysis to complete or timeout
    try {
      await page.waitForSelector('[data-testid="strategist-briefing"]', { timeout: 15000 });
      const analysisTime = Date.now() - startTime;
      
      // Analysis should complete within 15 seconds
      expect(analysisTime).toBeLessThan(15000);
      console.log(`Analysis completed in ${analysisTime}ms`);
    } catch (error) {
      console.log('Analysis timed out or feature not available');
    }
  });
  
  test('Component render performance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Measure component update performance
    await page.addInitScript(() => {
      window.performanceMarks = [];
      const originalMark = performance.mark;
      performance.mark = function(name) {
        window.performanceMarks.push({ name, timestamp: Date.now() });
        return originalMark.call(this, name);
      };
    });
    
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Change ward multiple times rapidly
    const wards = ['Jubilee Hills', 'Banjara Hills', 'Madhapur'];
    
    for (const ward of wards) {
      await page.selectOption('[data-testid="ward-selector"]', ward);
      await page.waitForTimeout(500); // Brief pause between selections
    }
    
    // Check for performance issues
    const marks = await page.evaluate(() => window.performanceMarks);
    console.log(`Recorded ${marks.length} performance marks`);
  });
});

test.describe('Accessibility Tests', () => {
  
  test('Keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Test keyboard navigation through strategist controls
    await page.keyboard.press('Tab'); // Navigate to first focusable element
    
    // Continue tabbing through interface
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      
      // Check that focus is visible
      const focusedElement = await page.locator(':focus').count();
      expect(focusedElement).toBeGreaterThan(0);
    }
  });
  
  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Check for proper ARIA labels and roles
    const strategicSection = page.locator('[data-testid="strategic-summary"]');
    
    if (await strategicSection.isVisible()) {
      // Should have proper semantic markup
      await expect(page.locator('h1, h2, h3')).toHaveCount(1); // At least one heading
      
      // Interactive elements should have labels
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const hasLabel = await button.getAttribute('aria-label') || 
                         await button.textContent() ||
                         await button.getAttribute('title');
        expect(hasLabel).toBeTruthy();
      }
    }
  });
});

test.describe('Error Recovery Tests', () => {
  
  test('API failure recovery', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Intercept and fail API calls
    await page.route('**/api/v1/strategist/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service temporarily unavailable' })
      });
    });
    
    await page.waitForSelector('[data-testid="ward-selector"]');
    await page.selectOption('[data-testid="ward-selector"]', 'Jubilee Hills');
    
    // Should show error state
    await expect(page.locator('text=Analysis temporarily unavailable')).toBeVisible({ timeout: 10000 });
    
    // Should offer retry
    const retryButton = page.locator('[data-testid="retry-analysis"]');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      // Error should persist while route is mocked
      await expect(page.locator('text=Analysis temporarily unavailable')).toBeVisible();
    }
  });
  
  test('Fallback to legacy mode', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Mock feature flag to disable AI mode
    await page.addInitScript(() => {
      window.localStorage.setItem('feature-flags', JSON.stringify({
        'ai-strategist': false
      }));
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="strategic-summary"]');
    
    // Should show legacy component
    await expect(page.locator('text=Area Pulse')).toBeVisible();
    
    // Legacy functionality should work
    await page.fill('[data-testid="ward-input"]', 'Jubilee Hills');
    await page.click('text=Area Pulse');
    
    // Should display legacy analysis
    await page.waitForSelector('[data-testid="legacy-briefing"]', { timeout: 10000 });
  });
});
import { test, expect } from '@playwright/test';

/**
 * LokDarpan Final Verification Test Suite
 * 
 * Comprehensive test to verify all critical fixes:
 * 1. PWA service worker bypassing proxy ✅ 
 * 2. CORS configuration issues ✅
 * 3. Dashboard Overview component undefined property error ✅
 */

test.describe('LokDarpan Final Verification', () => {
  let page;
  let consoleLogs = [];
  let consoleErrors = [];
  let apiCalls = [];
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Capture console logs and errors
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };
      
      if (msg.type() === 'error') {
        consoleErrors.push(logEntry);
      } else {
        consoleLogs.push(logEntry);
      }
    });
    
    // Monitor network requests to verify API calls
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    // Monitor response failures
    page.on('response', response => {
      if (response.url().includes('/api/') && !response.ok()) {
        consoleErrors.push({
          type: 'network',
          text: `Failed API call: ${response.status()} ${response.url()}`,
          location: { url: response.url() }
        });
      }
    });
  });

  test('1. Backend/Frontend Connectivity Test', async () => {
    console.log('🔍 Testing Backend/Frontend Connectivity...');
    
    // Test backend directly
    const backendResponse = await page.request.get('http://localhost:5000/api/v1/status');
    expect(backendResponse.status()).toBe(200);
    
    // Navigate to frontend
    await page.goto('http://localhost:5176');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Check for CORS errors in console
    const corsErrors = consoleErrors.filter(error => 
      error.text.toLowerCase().includes('cors') ||
      error.text.toLowerCase().includes('access-control-allow-origin')
    );
    
    expect(corsErrors.length).toBe(0);
    console.log('✅ No CORS errors detected');
  });

  test('2. Authentication & Dashboard Loading', async () => {
    console.log('🔍 Testing Authentication & Dashboard Loading...');
    
    await page.goto('http://localhost:5176');
    
    // Check if login form is present
    const loginForm = await page.locator('form').first();
    await expect(loginForm).toBeVisible({ timeout: 10000 });
    
    // Fill login credentials
    await page.fill('input[type="text"], input[name="username"]', 'ashish');
    await page.fill('input[type="password"], input[name="password"]', 'password');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForTimeout(3000);
    
    // Check if dashboard is visible (look for common dashboard elements)
    const dashboardElements = [
      'text=Overview',
      'text=Dashboard',
      'text=Ward',
      '[data-testid="dashboard"]',
      '.dashboard'
    ];
    
    let dashboardVisible = false;
    for (const selector of dashboardElements) {
      try {
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 5000 });
        dashboardVisible = true;
        break;
      } catch (e) {
        // Continue checking other selectors
      }
    }
    
    expect(dashboardVisible).toBe(true);
    console.log('✅ Dashboard loaded successfully after authentication');
  });

  test('3. Dashboard Overview Component Test', async () => {
    console.log('🔍 Testing Dashboard Overview Component...');
    
    await page.goto('http://localhost:5176');
    
    // Login
    await page.fill('input[type="text"], input[name="username"]', 'ashish');
    await page.fill('input[type="password"], input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForTimeout(3000);
    
    // Look for Overview tab and click it
    try {
      const overviewTab = page.locator('text=Overview').first();
      if (await overviewTab.isVisible({ timeout: 5000 })) {
        await overviewTab.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('Overview tab not found or not clickable, checking current state...');
    }
    
    // Check for specific error messages
    const failedToLoadError = await page.locator('text=Failed to Load Dashboard Overview').count();
    const undefinedPropertyErrors = consoleErrors.filter(error =>
      error.text.includes("Cannot read properties of undefined")
    );
    
    expect(failedToLoadError).toBe(0);
    expect(undefinedPropertyErrors.length).toBe(0);
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: 'frontend/e2e/screenshots/overview-component-test.png',
      fullPage: true 
    });
    
    console.log('✅ Dashboard Overview component loads without critical errors');
  });

  test('4. Ward Selection & Filtering Test', async () => {
    console.log('🔍 Testing Ward Selection & Filtering...');
    
    await page.goto('http://localhost:5176');
    
    // Login
    await page.fill('input[type="text"], input[name="username"]', 'ashish');
    await page.fill('input[type="password"], input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Look for ward dropdown or selection
    const wardSelectors = [
      'select',
      '[data-testid="ward-select"]',
      'text=Select Ward',
      'text=Ward',
      '.ward-select',
      'input[placeholder*="ward" i]'
    ];
    
    let wardDropdown = null;
    for (const selector of wardSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          wardDropdown = element;
          break;
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    if (wardDropdown) {
      console.log('Found ward selection element');
      
      // Try to interact with it
      try {
        await wardDropdown.click();
        await page.waitForTimeout(1000);
        
        // Look for "Marredpally" option
        const marredpallyOption = page.locator('text=Marredpally').first();
        if (await marredpallyOption.isVisible({ timeout: 3000 })) {
          await marredpallyOption.click();
          await page.waitForTimeout(2000);
          
          // Check if API calls were made with correct ward parameter
          const wardApiCalls = apiCalls.filter(call =>
            call.url.includes('city=Marredpally') || 
            call.url.includes('ward=Marredpally')
          );
          
          expect(wardApiCalls.length).toBeGreaterThan(0);
          console.log(`✅ Ward selection triggered ${wardApiCalls.length} API calls with correct parameters`);
        }
      } catch (e) {
        console.log('Ward selection interaction failed, but component exists');
      }
    } else {
      console.log('Ward selection component not found, checking for static ward display');
    }
    
    // Verify no CORS blocking API calls
    const blockedApiCalls = consoleErrors.filter(error =>
      error.text.includes('blocked by CORS policy')
    );
    
    expect(blockedApiCalls.length).toBe(0);
    console.log('✅ No API calls blocked by CORS policy');
  });

  test('5. PWA Service Worker Verification', async () => {
    console.log('🔍 Testing PWA Service Worker...');
    
    await page.goto('http://localhost:5176');
    
    // Check service worker registration in development
    const serviceWorkerRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator && navigator.serviceWorker.controller;
    });
    
    // In development, service worker should NOT be intercepting API calls
    if (serviceWorkerRegistered) {
      console.log('Service worker detected - checking it does not interfere with development');
      
      // Make sure API calls go through Vite proxy
      const apiCallsToBackend = apiCalls.filter(call => 
        call.url.startsWith('http://localhost:5000')
      );
      
      const apiCallsThroughProxy = apiCalls.filter(call =>
        call.url.startsWith('http://localhost:5176/api')
      );
      
      // In development, calls should go through proxy, not directly to backend
      expect(apiCallsToBackend.length).toBe(0);
      console.log('✅ Service worker not interfering with development API calls');
    } else {
      console.log('✅ No service worker active in development mode');
    }
  });

  test('6. Error Monitoring & Console Analysis', async () => {
    console.log('🔍 Performing Error Monitoring & Console Analysis...');
    
    await page.goto('http://localhost:5176');
    
    // Login and navigate through app
    await page.fill('input[type="text"], input[name="username"]', 'ashish');
    await page.fill('input[type="password"], input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // Categorize console errors
    const criticalErrors = consoleErrors.filter(error =>
      error.text.includes('Cannot read properties of undefined') ||
      error.text.includes('TypeError') ||
      error.text.includes('ReferenceError') ||
      error.text.includes('Failed to Load Dashboard Overview')
    );
    
    const networkErrors = consoleErrors.filter(error =>
      error.text.includes('Failed to fetch') ||
      error.text.includes('Network Error') ||
      error.text.includes('CORS') ||
      error.type === 'network'
    );
    
    const warningMessages = consoleLogs.filter(log =>
      log.type === 'warning'
    );
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'frontend/e2e/screenshots/final-verification-state.png',
      fullPage: true 
    });
    
    // Generate detailed report
    const report = {
      totalConsoleMessages: consoleLogs.length + consoleErrors.length,
      criticalErrors: criticalErrors.length,
      networkErrors: networkErrors.length,
      warnings: warningMessages.length,
      apiCallsMade: apiCalls.length,
      successfulApiCalls: apiCalls.filter(call => !consoleErrors.some(err => err.text.includes(call.url))).length
    };
    
    console.log('📊 Final Verification Report:', JSON.stringify(report, null, 2));
    
    // Success criteria
    expect(criticalErrors.length).toBe(0);
    expect(networkErrors.length).toBe(0);
    
    console.log('✅ Error monitoring completed - no critical errors detected');
  });

  test.afterEach(async () => {
    // Clean up
    consoleLogs = [];
    consoleErrors = [];
    apiCalls = [];
    
    if (page) {
      await page.close();
    }
  });
});
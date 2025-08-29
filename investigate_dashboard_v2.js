const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function investigateDashboardV2() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('Starting LokDarpan Dashboard Investigation V2...\n');
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'dashboard_investigation_v2_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  // Collect console logs and errors
  const consoleMessages = [];
  const errors = [];
  const failedRequests = [];
  const networkRequests = [];

  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    });
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      console.log(`🟡 Console Warning: ${msg.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    console.log(`❌ Page Error: ${error.message}`);
  });

  page.on('response', (response) => {
    networkRequests.push({
      url: response.url(),
      status: response.status(),
      method: response.request().method(),
      timestamp: new Date().toISOString()
    });

    if (!response.ok() && response.url().includes('api')) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        method: response.request().method()
      });
      console.log(`🚫 Failed API Request: ${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  try {
    console.log('1. Navigating to dashboard...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: path.join(screenshotsDir, '01_initial_page.png'), fullPage: true });

    // Check for login form
    console.log('2. Handling authentication...');
    const usernameField = page.locator('input[type="text"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button[type="submit"]').first();

    if (await usernameField.isVisible()) {
      console.log('   Login form detected, performing login...');
      await usernameField.fill('ashish');
      await passwordField.fill('password');
      await loginButton.click();
      
      // Wait for potential redirect or dashboard load
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(screenshotsDir, '02_after_login.png'), fullPage: true });
      
      // Check if we're still on login page or if login failed
      if (await page.locator('text="Login"').isVisible()) {
        console.log('⚠️  Still on login page - checking for error messages...');
        const errorElements = await page.locator('.text-red-600, .error, [class*="error"]').all();
        for (let i = 0; i < errorElements.length; i++) {
          const errorText = await errorElements[i].textContent();
          console.log(`   Error message: ${errorText}`);
        }
      } else {
        console.log('✅ Successfully logged in');
      }
    } else {
      console.log('   No login form found, assuming already authenticated');
    }

    // Wait for dashboard to load
    console.log('3. Waiting for dashboard to load...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(screenshotsDir, '03_dashboard_loaded.png'), fullPage: true });

    // Look for ward dropdown and select a ward if available
    console.log('4. Checking ward selection...');
    const wardDropdown = page.locator('select').first();
    if (await wardDropdown.isVisible()) {
      console.log('   Ward dropdown found, selecting first available ward...');
      const options = await wardDropdown.locator('option').all();
      if (options.length > 1) {
        await wardDropdown.selectOption({ index: 1 }); // Select first non-empty option
        await page.waitForTimeout(3000);
        console.log('   Ward selected, waiting for data to load...');
      }
    } else {
      console.log('   No ward dropdown found');
    }

    await page.screenshot({ path: path.join(screenshotsDir, '04_ward_selected.png'), fullPage: true });

    // Analyze available tabs
    console.log('5. Analyzing dashboard tabs...');
    const expectedTabs = ['Overview', 'Analytics', 'Geographic', 'Strategist', 'Timeline'];
    const foundTabs = [];
    const missingTabs = [];

    for (const tabName of expectedTabs) {
      const tabElement = page.locator(`text="${tabName}"`, { hasText: tabName }).first();
      if (await tabElement.isVisible()) {
        foundTabs.push(tabName);
        console.log(`   ✅ Found: ${tabName} tab`);
      } else {
        missingTabs.push(tabName);
        console.log(`   ❌ Missing: ${tabName} tab`);
      }
    }

    // Test each found tab
    console.log('6. Testing individual tabs...');
    for (const tabName of foundTabs) {
      try {
        console.log(`   Testing ${tabName} tab...`);
        const tabElement = page.locator(`text="${tabName}"`, { hasText: tabName }).first();
        await tabElement.click();
        await page.waitForTimeout(4000); // Give time for lazy loading
        
        const screenshotName = `05_${tabName.toLowerCase()}_tab.png`;
        await page.screenshot({ path: path.join(screenshotsDir, screenshotName), fullPage: true });
        
        // Check for loading states
        const loadingElements = await page.locator('.animate-spin, [class*="loading"], text="Loading"').all();
        if (loadingElements.length > 0) {
          console.log(`     ⏳ ${tabName} has ${loadingElements.length} loading elements`);
        }
        
        // Check for error states
        const errorElements = await page.locator('.text-red-600, .error, [class*="error"], text="Failed to load"').all();
        if (errorElements.length > 0) {
          console.log(`     ❌ ${tabName} has ${errorElements.length} error elements`);
          for (let i = 0; i < Math.min(errorElements.length, 3); i++) { // Show first 3 errors
            const errorText = await errorElements[i].textContent();
            console.log(`       Error ${i + 1}: ${errorText?.substring(0, 100)}...`);
          }
        }
        
        // Check for empty states
        const emptyElements = await page.locator('text="Select a Ward", text="No data", [class*="empty"]').all();
        if (emptyElements.length > 0) {
          console.log(`     ℹ️  ${tabName} has ${emptyElements.length} empty state elements`);
        }
        
      } catch (error) {
        console.log(`     💥 Error testing ${tabName} tab: ${error.message}`);
      }
    }

    // Check specific Overview tab content
    console.log('7. Detailed Overview tab analysis...');
    const overviewTab = page.locator('text="Overview"').first();
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await page.waitForTimeout(3000);
      
      console.log('   Checking for expected Overview sections...');
      const expectedSections = [
        'Campaign Analytics', 
        'Sentiment Analysis', 
        'Executive Summary',
        'Strategic Summary',
        'Key Metrics',
        'Ward Profile'
      ];
      
      for (const section of expectedSections) {
        const sectionExists = await page.locator(`text="${section}"`).first().isVisible();
        console.log(`     ${sectionExists ? '✅' : '❌'} ${section}`);
      }
      
      await page.screenshot({ path: path.join(screenshotsDir, '06_overview_detailed.png'), fullPage: true });
    }

    // Check component structure
    console.log('8. Analyzing component structure...');
    const componentChecks = [
      { name: 'Header', selector: 'header, .header, h1' },
      { name: 'Navigation/Tabs', selector: '[role="tab"], .tab, .nav' },
      { name: 'Ward Selector', selector: 'select, [role="combobox"]' },
      { name: 'Charts/Visualizations', selector: 'canvas, svg, .chart' },
      { name: 'Cards/Panels', selector: '.card, .panel, [class*="card"]' },
      { name: 'Tables', selector: 'table, .table' },
      { name: 'Loading States', selector: '.animate-spin, [class*="loading"]' },
      { name: 'Error Boundaries', selector: '[class*="error"], .text-red' }
    ];

    for (const check of componentChecks) {
      const elements = await page.locator(check.selector).all();
      console.log(`   ${check.name}: ${elements.length} elements found`);
    }

    // Final comprehensive screenshot
    await page.screenshot({ path: path.join(screenshotsDir, '07_final_comprehensive.png'), fullPage: true });

    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:5176',
      summary: {
        foundTabs,
        missingTabs,
        totalConsoleMessages: consoleMessages.length,
        totalErrors: errors.length,
        totalFailedRequests: failedRequests.length,
        totalNetworkRequests: networkRequests.length
      },
      consoleMessages: consoleMessages.slice(-100), // Last 100 messages
      errors,
      failedRequests,
      networkRequests: networkRequests.slice(-50), // Last 50 requests
      analysis: {
        authenticationStatus: foundTabs.length > 0 ? 'Success' : 'Failed or Required',
        dashboardStatus: foundTabs.length > 0 ? 'Partially Loaded' : 'Failed to Load',
        criticalIssues: [],
        recommendations: []
      }
    };

    // Add analysis points
    if (report.summary.missingTabs.length > 0) {
      report.analysis.criticalIssues.push(`Missing tabs: ${missingTabs.join(', ')}`);
      report.analysis.recommendations.push('Check tab configuration and component imports');
    }

    if (report.summary.totalFailedRequests > 0) {
      report.analysis.criticalIssues.push(`${report.summary.totalFailedRequests} API requests failed`);
      report.analysis.recommendations.push('Check backend connectivity and API endpoints');
    }

    if (report.summary.totalErrors > 0) {
      report.analysis.criticalIssues.push(`${report.summary.totalErrors} JavaScript errors detected`);
      report.analysis.recommendations.push('Check browser console for component loading issues');
    }

    // Save detailed report
    fs.writeFileSync(
      path.join(screenshotsDir, 'detailed_investigation_report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Investigation Complete!');
    console.log('=====================================');
    console.log(`✅ Found tabs: ${foundTabs.join(', ') || 'None'}`);
    console.log(`❌ Missing tabs: ${missingTabs.join(', ') || 'None'}`);
    console.log(`📝 Console messages: ${consoleMessages.length}`);
    console.log(`💥 JavaScript errors: ${errors.length}`);
    console.log(`🚫 Failed API requests: ${failedRequests.length}`);
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    console.log(`📋 Detailed report: detailed_investigation_report.json`);

  } catch (error) {
    console.error('💥 Investigation failed:', error);
    await page.screenshot({ path: path.join(screenshotsDir, 'investigation_error.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the investigation
investigateDashboardV2().catch(console.error);
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function investigateDashboard() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('Starting LokDarpan Dashboard Investigation...\n');
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'dashboard_investigation_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  // Collect console logs and errors
  const consoleMessages = [];
  const errors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', (error) => {
    errors.push({
      message: error.message,
      stack: error.stack
    });
    console.log(`Page Error: ${error.message}`);
  });

  page.on('response', (response) => {
    if (!response.ok() && response.url().includes('api')) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
      console.log(`Failed API Request: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('1. Navigating to dashboard...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: path.join(screenshotsDir, '01_initial_page.png'), fullPage: true });

    // Check if login is required
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible()) {
      console.log('2. Login form detected, attempting login...');
      await page.screenshot({ path: path.join(screenshotsDir, '02_login_page.png'), fullPage: true });
      
      // Try login with credentials from documentation
      await page.fill('input[name="username"], input[id="username"]', 'ashish');
      await page.fill('input[name="password"], input[id="password"]', 'password');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotsDir, '03_after_login.png'), fullPage: true });
    }

    // Check what's currently visible on the page
    console.log('3. Analyzing page structure...');
    
    // Look for tab navigation
    const tabs = await page.locator('[role="tab"], .tab, [class*="tab"]').all();
    console.log(`Found ${tabs.length} tab elements`);
    
    // Check for specific tab names
    const expectedTabs = ['Overview', 'Sentiment', 'Competitive', 'Geographic', 'Strategist', 'Timeline'];
    const foundTabs = [];
    
    for (const tabName of expectedTabs) {
      const tab = page.locator(`text="${tabName}"`).first();
      if (await tab.isVisible()) {
        foundTabs.push(tabName);
        console.log(`✓ Found ${tabName} tab`);
      } else {
        console.log(`✗ Missing ${tabName} tab`);
      }
    }

    // Take screenshot of current state
    await page.screenshot({ path: path.join(screenshotsDir, '04_current_dashboard_state.png'), fullPage: true });

    // Check Overview tab content
    console.log('4. Investigating Overview tab...');
    const overviewTab = page.locator('text="Overview"').first();
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotsDir, '05_overview_tab.png'), fullPage: true });
      
      // Check for expected sections in Overview
      const expectedSections = ['Campaign Analytics', 'Sentiment Analysis', 'Executive Summary', 'Strategic Summary'];
      for (const section of expectedSections) {
        const sectionExists = await page.locator(`text="${section}"`).first().isVisible();
        console.log(`${sectionExists ? '✓' : '✗'} ${section} section in Overview`);
      }
    }

    // Test each tab for errors
    console.log('5. Testing tab navigation...');
    for (const tabName of foundTabs) {
      try {
        console.log(`Testing ${tabName} tab...`);
        const tab = page.locator(`text="${tabName}"`).first();
        await tab.click();
        await page.waitForTimeout(3000);
        
        // Take screenshot of each tab
        const filename = `06_${tabName.toLowerCase()}_tab.png`;
        await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
        
        // Check for error messages
        const errorElements = await page.locator('.error, [class*="error"], text="Error"').all();
        if (errorElements.length > 0) {
          console.log(`⚠️  ${tabName} tab has ${errorElements.length} error elements`);
          for (let i = 0; i < errorElements.length; i++) {
            const errorText = await errorElements[i].textContent();
            console.log(`   Error ${i + 1}: ${errorText}`);
          }
        }
        
        // Check for missing components (empty areas)
        const emptyContainers = await page.locator('[class*="empty"], [class*="loading"], text="Loading..."').all();
        if (emptyContainers.length > 0) {
          console.log(`⚠️  ${tabName} tab has ${emptyContainers.length} loading/empty states`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${tabName} tab: ${error.message}`);
      }
    }

    // Check specific components that should be present
    console.log('6. Checking for specific components...');
    const components = [
      { name: 'Ward Dropdown', selector: 'select, [role="combobox"], [class*="select"]' },
      { name: 'Map Container', selector: '[class*="map"], #map, [class*="leaflet"]' },
      { name: 'Chart Container', selector: '[class*="chart"], canvas, svg' },
      { name: 'Data Tables', selector: 'table, [class*="table"]' },
      { name: 'Alert Panels', selector: '[class*="alert"], [class*="notification"]' }
    ];

    for (const component of components) {
      const exists = await page.locator(component.selector).first().isVisible();
      console.log(`${exists ? '✓' : '✗'} ${component.name}`);
    }

    // Final screenshot
    await page.screenshot({ path: path.join(screenshotsDir, '07_final_state.png'), fullPage: true });

    // Generate investigation report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:5176',
      foundTabs,
      missingTabs: expectedTabs.filter(tab => !foundTabs.includes(tab)),
      consoleMessages: consoleMessages.slice(-50), // Last 50 messages
      errors,
      failedRequests,
      recommendations: []
    };

    // Add recommendations based on findings
    if (report.missingTabs.length > 0) {
      report.recommendations.push(`Missing tabs detected: ${report.missingTabs.join(', ')}. Check tab configuration and routing.`);
    }
    
    if (failedRequests.length > 0) {
      report.recommendations.push(`${failedRequests.length} API requests failed. Check backend connectivity and endpoints.`);
    }
    
    if (errors.length > 0) {
      report.recommendations.push(`${errors.length} JavaScript errors detected. Check browser console for details.`);
    }

    // Save report
    fs.writeFileSync(
      path.join(screenshotsDir, 'investigation_report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Investigation Summary:');
    console.log(`Found tabs: ${foundTabs.join(', ')}`);
    console.log(`Missing tabs: ${report.missingTabs.join(', ') || 'None'}`);
    console.log(`Console messages: ${consoleMessages.length}`);
    console.log(`JavaScript errors: ${errors.length}`);
    console.log(`Failed API requests: ${failedRequests.length}`);
    console.log(`Screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('Investigation failed:', error);
    await page.screenshot({ path: path.join(screenshotsDir, 'error_state.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the investigation
investigateDashboard().catch(console.error);
// Test All Dashboard Tabs for Crashes - Step 2 Diagnostic
const { chromium } = require('playwright');

async function testAllTabs() {
  console.log('🔍 TESTING ALL DASHBOARD TABS - STEP 2 DIAGNOSTIC');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  const consoleLogs = [];
  const errorLogs = [];
  
  page.on('console', msg => {
    const log = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(log);
    if (msg.type() === 'error') {
      errorLogs.push(log);
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errorLogs.push(`PAGE ERROR: ${error.message}`);
    console.log('💥 Page Error:', error.message);
  });
  
  try {
    console.log('📍 Loading and authenticating...');
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(2000);
    
    // Login
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible({ timeout: 3000 })) {
      await page.fill('input[name="username"], input[type="text"]', 'ashish');
      await page.fill('input[name="password"], input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    console.log('\n🧪 COMPREHENSIVE TAB TESTING:');
    
    const tabs = [
      { name: 'Campaign Overview', selector: '[data-testid="tab-overview"]' },
      { name: 'Sentiment Analysis', selector: '[data-testid="tab-sentiment"]' },
      { name: 'Competitive Intel', selector: '[data-testid="tab-competitive"]' },
      { name: 'Geographic View', selector: '[data-testid="tab-geographic"]' },
      { name: 'AI Strategist', selector: '[data-testid="tab-strategist"]' }
    ];
    
    const results = {};
    
    for (const tab of tabs) {
      console.log(`\n📋 Testing ${tab.name}:`);
      
      try {
        const tabElement = await page.locator(tab.selector).first();
        
        if (!(await tabElement.isVisible())) {
          results[tab.name] = 'NOT_FOUND';
          console.log(`  ❌ Tab not found: ${tab.selector}`);
          continue;
        }
        
        // Clear previous errors
        const errorCountBefore = errorLogs.length;
        
        // Click tab
        console.log(`  → Clicking ${tab.name} tab...`);
        await tabElement.click();
        await page.waitForTimeout(3000);
        
        // Check for new errors after clicking
        const errorCountAfter = errorLogs.length;
        const newErrors = errorCountAfter - errorCountBefore;
        
        // Check for error boundaries
        const errorBoundaries = await page.locator('[class*="error"], .error-fallback, [data-testid*="error"]').count();
        
        // Take screenshot
        await page.screenshot({ 
          path: `tab-test-${tab.name.toLowerCase().replace(/\\s+/g, '-')}.png`,
          fullPage: true 
        });
        
        // Check for loading states vs actual content
        const loadingElements = await page.locator('[class*="loading"], [class*="skeleton"], .spinner').count();
        const contentElements = await page.locator('div, span, p, h1, h2, h3, h4, h5, h6').count();
        
        // Determine tab status
        let status = 'SUCCESS';
        const issues = [];
        
        if (newErrors > 0) {
          status = 'ERRORS';
          issues.push(`${newErrors} console errors`);
        }
        
        if (errorBoundaries > 0) {
          status = 'ERROR_BOUNDARY';
          issues.push(`${errorBoundaries} error boundaries triggered`);
        }
        
        if (loadingElements > 3 && contentElements < 10) {
          status = 'LOADING_STUCK';
          issues.push('Appears stuck in loading state');
        }
        
        results[tab.name] = {
          status: status,
          issues: issues,
          errorBoundaries: errorBoundaries,
          newErrors: newErrors,
          contentElements: contentElements,
          loadingElements: loadingElements
        };
        
        // Status reporting
        if (status === 'SUCCESS') {
          console.log(`  ✅ ${tab.name}: Working correctly`);
        } else {
          console.log(`  ❌ ${tab.name}: ${status} - ${issues.join(', ')}`);
        }
        
        console.log(`    → Content elements: ${contentElements}`);
        console.log(`    → Loading elements: ${loadingElements}`);
        console.log(`    → Error boundaries: ${errorBoundaries}`);
        console.log(`    → New errors: ${newErrors}`);
        
      } catch (error) {
        results[tab.name] = 'CRASH';
        console.log(`  💥 ${tab.name}: CRASHED - ${error.message}`);
      }
    }
    
    console.log('\n📊 COMPREHENSIVE RESULTS:');
    console.log('========================');
    
    let successCount = 0;
    let issueCount = 0;
    
    for (const [tabName, result] of Object.entries(results)) {
      if (typeof result === 'string') {
        console.log(`${tabName}: ${result}`);
        if (result !== 'SUCCESS') issueCount++;
      } else {
        console.log(`${tabName}: ${result.status}${result.issues.length > 0 ? ' - ' + result.issues.join(', ') : ''}`);
        if (result.status === 'SUCCESS') {
          successCount++;
        } else {
          issueCount++;
        }
      }
    }
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`  ✅ Working tabs: ${successCount}/5`);
    console.log(`  ❌ Problem tabs: ${issueCount}/5`);
    console.log(`  📊 Success rate: ${Math.round((successCount / 5) * 100)}%`);
    
    console.log(`\n🔍 TOTAL CONSOLE ERRORS: ${errorLogs.length}`);
    if (errorLogs.length > 0) {
      console.log('Recent errors:');
      errorLogs.slice(-3).forEach(err => console.log(`  ${err}`));
    }
    
    // Identify specific issues to fix
    console.log('\n🎯 ISSUES TO FIX:');
    for (const [tabName, result] of Object.entries(results)) {
      if (typeof result === 'object' && result.status !== 'SUCCESS') {
        console.log(`  🔧 ${tabName}:`);
        result.issues.forEach(issue => console.log(`    - ${issue}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
  } finally {
    await browser.close();
  }
}

console.log('🚀 COMPREHENSIVE DASHBOARD TAB TESTING');
testAllTabs()
  .then(() => console.log('\n✅ Diagnostic complete'))
  .catch(err => console.error('❌ Diagnostic failed:', err.message));
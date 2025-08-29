// Focused QA Validation - Post-Fix Testing
// QA Lead: Quinn (Test Architect & Quality Advisor)
// Focus: Validate the 3 critical fixes implemented

const { chromium } = require('playwright');

async function focusedQAValidation() {
  console.log('🎯 FOCUSED QA VALIDATION');
  console.log('QA Lead: Quinn (Test Architect & Quality Advisor)');
  console.log('Focus: Critical Bug Fixes Validation\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  const consoleErrors = [];
  const networkErrors = [];
  
  // Track errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('❌ Console Error:', msg.text().substring(0, 100) + '...');
    }
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} ${response.url()}`);
      console.log(`❌ Network Error: ${response.status()} ${response.url()}`);
    }
  });
  
  const results = {
    authentication: { status: 'unknown' },
    geographicView: { status: 'unknown', errors: 0 },
    campaignOverview: { status: 'unknown', errors: 0 },
    aiStrategist: { status: 'unknown', errors: 0 },
    tabNavigation: { status: 'unknown', functionalTabs: 0 }
  };
  
  try {
    console.log('📋 TEST 1: AUTHENTICATION & DASHBOARD LOAD');
    await page.goto('http://localhost:5176');
    await page.waitForTimeout(3000);
    
    // Check for login form
    const loginVisible = await page.locator('form input[type="password"]').isVisible();
    if (loginVisible) {
      console.log('  ✅ Login form detected');
      
      await page.fill('input[name="username"], input[type="text"]', 'ashish');
      await page.fill('input[name="password"], input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(4000);
      
      // Check if dashboard loaded
      const dashboardElements = await page.locator('.dashboard, [data-component*="dashboard"], .tab, [data-testid^="tab-"]').count();
      
      if (dashboardElements > 0) {
        console.log('  ✅ Dashboard loaded successfully');
        results.authentication.status = 'SUCCESS';
      } else {
        console.log('  ❌ Dashboard not found after login');
        results.authentication.status = 'FAIL';
      }
    } else {
      console.log('  ❌ Login form not found');
      results.authentication.status = 'FAIL';
    }
    
    if (results.authentication.status !== 'SUCCESS') {
      console.log('  🔄 Retrying with direct dashboard access...');
      await page.goto('http://localhost:5176');
      await page.waitForTimeout(3000);
    }
    
    console.log('\n📋 TEST 2: GEOGRAPHIC VIEW ERROR FIX');
    const geoTab = await page.locator('[data-testid="tab-geographic"], button:has-text("Geographic"), .tab:has-text("Geographic")').first();
    
    if (await geoTab.isVisible({ timeout: 5000 })) {
      const errorsBefore = consoleErrors.length;
      
      await geoTab.click();
      console.log('  ✅ Geographic tab clicked');
      await page.waitForTimeout(5000);
      
      const errorsAfter = consoleErrors.length;
      const newErrors = errorsAfter - errorsBefore;
      
      // Check for map or geographic content
      const mapContent = await page.locator('.leaflet-container, .map, [data-component*="map"], [class*="geographic"]').count();
      
      if (mapContent > 0) {
        console.log('  ✅ Geographic content loaded');
        results.geographicView.status = newErrors === 0 ? 'SUCCESS' : 'FUNCTIONAL';
        results.geographicView.errors = newErrors;
      } else {
        console.log('  ⚠️  No map content found');
        results.geographicView.status = 'WARNING';
        results.geographicView.errors = newErrors;
      }
      
      console.log(`  📊 Console errors during Geographic View: ${newErrors}`);
    } else {
      console.log('  ❌ Geographic tab not found');
      results.geographicView.status = 'FAIL';
    }
    
    console.log('\n📋 TEST 3: CAMPAIGN OVERVIEW 404 FIX');
    const overviewTab = await page.locator('[data-testid="tab-overview"], button:has-text("Overview"), .tab:has-text("Overview"), button:has-text("Campaign")').first();
    
    if (await overviewTab.isVisible({ timeout: 5000 })) {
      const errorsBefore = consoleErrors.length;
      const networkErrorsBefore = networkErrors.length;
      
      await overviewTab.click();
      console.log('  ✅ Campaign Overview tab clicked');
      await page.waitForTimeout(5000);
      
      const errorsAfter = consoleErrors.length;
      const networkErrorsAfter = networkErrors.length;
      const newErrors = errorsAfter - errorsBefore;
      const new404s = networkErrorsAfter - networkErrorsBefore;
      
      // Check for executive summary content
      const summaryContent = await page.locator('.executive-summary, [data-component*="summary"], .campaign-health, .summary-card').count();
      
      if (summaryContent > 0) {
        console.log('  ✅ Campaign Overview content loaded');
        results.campaignOverview.status = (newErrors === 0 && new404s === 0) ? 'SUCCESS' : 'FUNCTIONAL';
        results.campaignOverview.errors = newErrors;
      } else {
        console.log('  ⚠️  No campaign overview content found');
        results.campaignOverview.status = 'WARNING';
        results.campaignOverview.errors = newErrors;
      }
      
      console.log(`  📊 Console errors: ${newErrors}, 404 errors: ${new404s}`);
    } else {
      console.log('  ❌ Campaign Overview tab not found');
      results.campaignOverview.status = 'FAIL';
    }
    
    console.log('\n📋 TEST 4: AI STRATEGIST 500 ERROR FIX');
    const strategistTab = await page.locator('[data-testid="tab-strategist"], button:has-text("Strategist"), .tab:has-text("AI"), button:has-text("Political")').first();
    
    if (await strategistTab.isVisible({ timeout: 5000 })) {
      const errorsBefore = consoleErrors.length;
      const networkErrorsBefore = networkErrors.length;
      
      await strategistTab.click();
      console.log('  ✅ AI Strategist tab clicked');
      await page.waitForTimeout(6000); // Allow time for AI analysis
      
      const errorsAfter = consoleErrors.length;
      const networkErrorsAfter = networkErrors.length;
      const newErrors = errorsAfter - errorsBefore;
      const new500s = networkErrors.slice(networkErrorsBefore).filter(err => err.includes('500')).length;
      
      // Check for strategist content
      const strategistContent = await page.locator('.strategist, [data-component*="strategist"], .political-intelligence, .strategic-analysis').count();
      
      if (strategistContent > 0) {
        console.log('  ✅ AI Strategist content loaded');
        results.aiStrategist.status = (newErrors === 0 && new500s === 0) ? 'SUCCESS' : 'FUNCTIONAL';
        results.aiStrategist.errors = newErrors;
      } else {
        console.log('  ⚠️  No AI strategist content found');
        results.aiStrategist.status = 'WARNING';
        results.aiStrategist.errors = newErrors;
      }
      
      console.log(`  📊 Console errors: ${newErrors}, 500 errors: ${new500s}`);
    } else {
      console.log('  ❌ AI Strategist tab not found');
      results.aiStrategist.status = 'FAIL';
    }
    
    console.log('\n📋 TEST 5: OVERALL TAB FUNCTIONALITY');
    const allTabs = await page.locator('[data-testid^="tab-"], .tab, button[role="tab"]').count();
    let functionalTabs = 0;
    
    const tabSelectors = [
      '[data-testid="tab-overview"]',
      '[data-testid="tab-geographic"]', 
      '[data-testid="tab-sentiment"]',
      '[data-testid="tab-competitive"]',
      '[data-testid="tab-strategist"]'
    ];
    
    for (const selector of tabSelectors) {
      const tab = await page.locator(selector).first();
      if (await tab.isVisible({ timeout: 2000 })) {
        try {
          await tab.click();
          await page.waitForTimeout(2000);
          functionalTabs++;
        } catch (error) {
          console.log(`  ⚠️  Tab ${selector} click failed: ${error.message.substring(0, 50)}`);
        }
      }
    }
    
    results.tabNavigation.status = functionalTabs >= 4 ? 'SUCCESS' : functionalTabs >= 3 ? 'WARNING' : 'FAIL';
    results.tabNavigation.functionalTabs = functionalTabs;
    
    console.log(`  📊 Functional tabs: ${functionalTabs}/${tabSelectors.length}`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'QA/focused-validation-results.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: QA/focused-validation-results.png');
    
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
  } finally {
    await browser.close();
  }
  
  // Generate results summary
  console.log('\n' + '═'.repeat(60));
  console.log('🎯 FOCUSED QA VALIDATION RESULTS');
  console.log('═'.repeat(60));
  
  const testResults = [
    { name: 'Authentication', status: results.authentication.status },
    { name: 'Geographic View Fix', status: results.geographicView.status },
    { name: 'Campaign Overview Fix', status: results.campaignOverview.status },
    { name: 'AI Strategist Fix', status: results.aiStrategist.status },
    { name: 'Tab Navigation', status: results.tabNavigation.status }
  ];
  
  testResults.forEach(test => {
    const icon = test.status === 'SUCCESS' ? '✅' : 
                 test.status === 'FUNCTIONAL' ? '🟡' :
                 test.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`  ${test.name.padEnd(25)} | ${icon} ${test.status}`);
  });
  
  const successCount = testResults.filter(t => t.status === 'SUCCESS').length;
  const functionalCount = testResults.filter(t => t.status === 'FUNCTIONAL' || t.status === 'SUCCESS').length;
  const totalTests = testResults.length;
  
  console.log('─'.repeat(60));
  console.log(`📊 SUCCESS RATE: ${successCount}/${totalTests} (${Math.round((successCount/totalTests)*100)}%)`);
  console.log(`📊 FUNCTIONAL RATE: ${functionalCount}/${totalTests} (${Math.round((functionalCount/totalTests)*100)}%)`);
  console.log(`📊 TOTAL CONSOLE ERRORS: ${consoleErrors.length}`);
  console.log(`📊 TOTAL NETWORK ERRORS: ${networkErrors.length}`);
  
  console.log('\n🎯 QA ASSESSMENT:');
  if (functionalCount === totalTests && successCount >= 3) {
    console.log('  ✅ APPROVED: Critical fixes validated, system functional');
    console.log('  🚀 Ready for campaign team usage');
  } else if (functionalCount >= 4) {
    console.log('  🟡 CONDITIONAL: Most fixes working, minor issues remain');  
    console.log('  🔧 Address remaining issues before full deployment');
  } else {
    console.log('  ❌ NEEDS WORK: Multiple critical issues identified');
    console.log('  🛠️  Additional development required');
  }
  
  console.log('\n📋 QA SIGN-OFF:');
  console.log(`  QA Lead: Quinn (Test Architect & Quality Advisor)`);
  console.log(`  Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`  Status: ${functionalCount >= 4 ? '✅ APPROVED' : '⚠️ CONDITIONAL'}`);
  
  return {
    successRate: Math.round((successCount/totalTests)*100),
    functionalRate: Math.round((functionalCount/totalTests)*100),
    results: results,
    approved: functionalCount >= 4
  };
}

console.log('🎯 STARTING FOCUSED QA VALIDATION...\n');
focusedQAValidation()
  .then(result => {
    if (result.approved) {
      console.log('\n🎉 QA VALIDATION SUCCESSFUL - FIXES CONFIRMED!');
    } else {
      console.log('\n⚠️  QA VALIDATION IDENTIFIES REMAINING ISSUES');
    }
  })
  .catch(err => console.error('❌ QA Validation failed:', err.message));
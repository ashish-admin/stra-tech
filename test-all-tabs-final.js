// Final Comprehensive Tab Validation Test
const { chromium } = require('playwright');

async function testAllTabsFinal() {
  console.log('🎯 FINAL VALIDATION: TESTING ALL DASHBOARD TABS');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  const results = {
    overview: { status: 'unknown', errors: 0 },
    geographic: { status: 'unknown', errors: 0 },
    sentiment: { status: 'unknown', errors: 0 },
    competitive: { status: 'unknown', errors: 0 },
    strategist: { status: 'unknown', errors: 0 }
  };
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  try {
    console.log('🚀 Loading LokDarpan Dashboard...');
    await page.goto('http://localhost:5176');
    await page.waitForTimeout(2000);
    
    // Login
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible({ timeout: 3000 })) {
      await page.fill('input[name="username"], input[type="text"]', 'ashish');
      await page.fill('input[name="password"], input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    // Test all tabs systematically
    const tabs = [
      { name: 'overview', selector: '[data-testid="tab-overview"]', displayName: 'Campaign Overview' },
      { name: 'geographic', selector: '[data-testid="tab-geographic"]', displayName: 'Geographic View' },
      { name: 'sentiment', selector: '[data-testid="tab-sentiment"]', displayName: 'Sentiment Analysis' },
      { name: 'competitive', selector: '[data-testid="tab-competitive"]', displayName: 'Competitive Intel' },
      { name: 'strategist', selector: '[data-testid="tab-strategist"]', displayName: 'AI Strategist' }
    ];
    
    for (const tab of tabs) {
      console.log(`\\n📋 TESTING: ${tab.displayName.toUpperCase()}`);
      
      const errorsBefore = errors.length;
      
      try {
        // Click tab
        const tabElement = await page.locator(tab.selector).first();
        if (await tabElement.isVisible({ timeout: 5000 })) {
          await tabElement.click();
          console.log(`  → Clicked ${tab.displayName} tab`);
          
          // Wait for content to load
          await page.waitForTimeout(4000);
          
          // Check for error boundaries
          const errorBoundaries = await page.locator('[class*="error"], .error-fallback, [data-component*="error"]').count();
          
          // Count new errors
          const errorsAfter = errors.length;
          const newErrors = errorsAfter - errorsBefore;
          
          // Determine status
          if (newErrors === 0 && errorBoundaries === 0) {
            results[tab.name].status = 'success';
            console.log(`  ✅ SUCCESS: ${tab.displayName} loaded without errors`);
          } else if (newErrors > 0 && errorBoundaries === 0) {
            results[tab.name].status = 'warning';
            results[tab.name].errors = newErrors;
            console.log(`  ⚠️  WARNING: ${tab.displayName} has ${newErrors} console errors but displays content`);
          } else {
            results[tab.name].status = 'error';
            results[tab.name].errors = newErrors + errorBoundaries;
            console.log(`  ❌ ERROR: ${tab.displayName} has ${errorBoundaries} error boundaries and ${newErrors} console errors`);
          }
          
        } else {
          results[tab.name].status = 'not_found';
          console.log(`  ❌ Tab not found: ${tab.selector}`);
        }
        
      } catch (error) {
        results[tab.name].status = 'exception';
        console.log(`  ❌ Exception testing ${tab.displayName}: ${error.message}`);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'final-dashboard-validation.png',
      fullPage: true 
    });
    console.log('\\n📸 Screenshot saved: final-dashboard-validation.png');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
  
  // Calculate success rate
  const totalTabs = Object.keys(results).length;
  const successfulTabs = Object.values(results).filter(r => r.status === 'success').length;
  const warningTabs = Object.values(results).filter(r => r.status === 'warning').length;
  const errorTabs = Object.values(results).filter(r => r.status === 'error' || r.status === 'exception' || r.status === 'not_found').length;
  
  const successRate = Math.round((successfulTabs / totalTabs) * 100);
  const functionalRate = Math.round(((successfulTabs + warningTabs) / totalTabs) * 100);
  
  console.log('\\n🎯 FINAL VALIDATION RESULTS:');
  console.log('═'.repeat(50));
  
  Object.entries(results).forEach(([tab, result]) => {
    const status = result.status === 'success' ? '✅ SUCCESS' :
                   result.status === 'warning' ? '⚠️  WARNING' :
                   '❌ ERROR';
    console.log(`  ${tab.toUpperCase().padEnd(12)} | ${status} ${result.errors > 0 ? `(${result.errors} errors)` : ''}`);
  });
  
  console.log('═'.repeat(50));
  console.log(`📊 SUCCESS RATE: ${successfulTabs}/${totalTabs} tabs (${successRate}%)`);
  console.log(`📊 FUNCTIONAL RATE: ${successfulTabs + warningTabs}/${totalTabs} tabs (${functionalRate}%)`);
  console.log(`📊 ERROR RATE: ${errorTabs}/${totalTabs} tabs (${Math.round((errorTabs / totalTabs) * 100)}%)`);
  
  if (successRate === 100) {
    console.log('\\n🎉 PERFECT SCORE: 100% tab success rate achieved!');
    console.log('🚀 All dashboard functionality is working correctly');
  } else if (functionalRate >= 90) {
    console.log(`\\n✅ EXCELLENT: ${functionalRate}% tabs functional`);
    console.log('🎯 Dashboard is ready for campaign teams');
  } else {
    console.log(`\\n⚠️  NEEDS WORK: Only ${functionalRate}% tabs functional`);
    console.log('🔧 Additional fixes may be needed');
  }
  
  return {
    successRate,
    functionalRate,
    results,
    totalErrors: errors.length
  };
}

console.log('🎯 COMPREHENSIVE DASHBOARD VALIDATION TEST');
testAllTabsFinal()
  .then(result => {
    if (result.successRate === 100) {
      console.log('\\n🎉 MISSION ACCOMPLISHED: LokDarpan Dashboard is fully functional!');
    }
  })
  .catch(err => console.error('❌ Validation failed:', err.message));
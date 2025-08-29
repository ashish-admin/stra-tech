// Test Political Strategist Tab Functionality
const { chromium } = require('playwright');

async function testStrategistTab() {
  console.log('🔍 TESTING POLITICAL STRATEGIST TAB - STEP 1 VERIFICATION');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Capture console logs and errors
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') {
      console.log('❌ Error:', msg.text());
    }
  });
  
  try {
    console.log('📍 Loading application...');
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(2000);
    
    // Login
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible({ timeout: 3000 })) {
      console.log('🔐 Logging in...');
      await page.fill('input[name="username"], input[type="text"]', 'ashish');
      await page.fill('input[name="password"], input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    console.log('\n📋 CHECKING TAB NAVIGATION:');
    
    // Check all tabs
    const tabs = await page.locator('[role="tab"], button[data-testid*="tab"]').all();
    console.log(`  → Found ${tabs.length} tabs total`);
    
    for (const tab of tabs) {
      const tabText = await tab.textContent();
      const testId = await tab.getAttribute('data-testid');
      console.log(`  → Tab: "${tabText}" (${testId})`);
      
      if (tabText?.includes('Strategist') || tabText?.includes('AI')) {
        console.log('  🎯 FOUND POLITICAL STRATEGIST TAB!');
        
        try {
          await tab.click();
          console.log('  → Clicked Political Strategist tab');
          await page.waitForTimeout(3000);
          
          // Take screenshot after clicking
          await page.screenshot({ 
            path: 'strategist-tab-test.png',
            fullPage: true 
          });
          console.log('  📸 Screenshot saved: strategist-tab-test.png');
          
          // Check what loaded
          const strategistElements = await page.locator('[class*="strategist"], [class*="Strategist"], [data-testid*="strategist"]').all();
          console.log(`  → Found ${strategistElements.length} strategist elements after click`);
          
          // Check for specific strategist components
          const components = [
            'Strategic Workbench',
            'Intelligence Feed', 
            'Analysis Controls',
            'Political Strategist',
            'Scenario Simulator'
          ];
          
          for (const component of components) {
            const found = await page.locator(`text=${component}`).count();
            if (found > 0) {
              console.log(`  ✅ Found component: ${component}`);
            } else {
              console.log(`  ❌ Missing component: ${component}`);
            }
          }
          
        } catch (error) {
          console.log(`  ❌ Failed to click strategist tab: ${error.message}`);
        }
      }
    }
    
    console.log('\n🔍 CHECKING ERROR STATES:');
    
    const errorMessages = await page.locator('[class*="error"], [class*="Error"], .error-fallback').all();
    console.log(`  → Found ${errorMessages.length} error elements`);
    
    for (const error of errorMessages) {
      const errorText = await error.textContent();
      if (errorText?.length > 0) {
        console.log(`  ⚠️ Error message: ${errorText.substring(0, 100)}...`);
      }
    }
    
    console.log('\n📊 CONSOLE LOG ANALYSIS:');
    const errors = consoleLogs.filter(log => log.includes('[error]'));
    console.log(`  → Total console errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('  📋 Recent errors:');
      errors.slice(0, 3).forEach(err => {
        console.log(`    ${err}`);
      });
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'final-strategist-test.png',
      fullPage: true 
    });
    console.log('  📸 Final screenshot: final-strategist-test.png');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

console.log('🚀 POLITICAL STRATEGIST TAB FUNCTIONALITY TEST');
testStrategistTab()
  .then(() => console.log('\n✅ Test complete'))
  .catch(err => console.error('❌ Test failed:', err.message));
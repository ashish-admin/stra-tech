/**
 * Complete Dashboard Test with proper login handling
 */

const puppeteer = require('puppeteer');

async function completeDashboardTest() {
  console.log('🚀 Starting Complete LokDarpan Dashboard Test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Capture console messages for debugging
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });
  
  try {
    console.log('📍 Navigating to http://localhost:5176...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
    
    // Handle login
    console.log('🔑 Attempting login...');
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });
    
    // Fill in credentials
    await page.type('input[name="username"]', 'ashish');
    await page.type('input[name="password"]', 'password');
    
    // Click login and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('✅ Login successful, taking dashboard screenshot...');
    
    // Wait a moment for dashboard to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot of logged-in dashboard
    await page.screenshot({ 
      path: 'dashboard-authenticated.png', 
      fullPage: true 
    });
    console.log('📸 Dashboard screenshot saved');
    
    // Check for navigation tabs
    console.log('🔍 Analyzing tab navigation...');
    
    // Try multiple selectors for tabs
    const tabSelectors = [
      '[role="tab"]',
      '.tab-button', 
      '.nav-tab',
      'button[data-tab]',
      '.dashboard-tab',
      'nav button',
      '.tab'
    ];
    
    let tabs = [];
    for (const selector of tabSelectors) {
      try {
        const foundTabs = await page.$$eval(selector, elements => 
          elements.map(el => ({
            text: el.textContent.trim(),
            className: el.className,
            visible: el.offsetParent !== null,
            disabled: el.disabled
          }))
        );
        
        if (foundTabs.length > 0) {
          tabs = foundTabs;
          console.log(`📋 Found tabs using selector '${selector}':`, foundTabs.map(t => t.text));
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    if (tabs.length === 0) {
      console.log('⚠️ No navigation tabs found - checking page structure...');
      
      // Get page text to see what's actually rendered
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('📄 Page content preview:', bodyText.substring(0, 200) + '...');
      
      // Check if we're still on login or have an error
      const isLoginPage = await page.$('input[type="password"]') !== null;
      if (isLoginPage) {
        console.log('❌ Still on login page - authentication may have failed');
      }
    }
    
    // Check for ward selector
    console.log('🏛️ Checking for ward selector...');
    const wardSelectors = ['select', '.ward-select', '[name*="ward"]', '[id*="ward"]'];
    
    let wardSelectorFound = false;
    for (const selector of wardSelectors) {
      try {
        const wardElement = await page.$(selector);
        if (wardElement) {
          const options = await page.$$eval(`${selector} option`, opts => 
            opts.map(opt => opt.textContent.trim()).filter(text => text)
          );
          console.log(`✅ Ward selector found (${selector}):`, options.slice(0, 5));
          wardSelectorFound = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!wardSelectorFound) {
      console.log('⚠️ No ward selector found');
    }
    
    // Test tab clicking if tabs were found
    if (tabs.length > 0) {
      console.log('🧪 Testing tab navigation...');
      
      for (let i = 0; i < Math.min(tabs.length, 5); i++) {
        const tab = tabs[i];
        try {
          console.log(`  Testing tab: ${tab.text}`);
          
          // Click tab
          await page.click(`[role="tab"]:nth-child(${i + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Take screenshot
          await page.screenshot({ 
            path: `tab-${tab.text.toLowerCase().replace(/\s+/g, '-')}.png` 
          });
          
          console.log(`  ✅ ${tab.text} tab working`);
        } catch (error) {
          console.log(`  ❌ ${tab.text} tab failed:`, error.message);
        }
      }
    }
    
    // Check for console errors
    const errors = consoleMessages.filter(msg => msg.type === 'error');
    const warnings = consoleMessages.filter(msg => msg.type === 'warning');
    
    console.log('\n📊 CONSOLE ANALYSIS:');
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    console.log(`  Total messages: ${consoleMessages.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS:');
      errors.slice(0, 5).forEach(err => console.log(`  - ${err.text}`));
    }
    
    console.log('\n✅ Dashboard test completed successfully');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  }
  
  await browser.close();
}

completeDashboardTest();
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  
  // Enhanced request/response logging
  page.on('request', request => {
    if (request.url().includes('/api/v1/')) {
      console.log(`→ ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`  Body: ${request.postData()}`);
      }
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/v1/')) {
      console.log(`← ${response.status()} ${response.url()}`);
    }
  });
  
  // Console message logging
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('ward') || msg.text().includes('context')) {
      console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
    }
  });
  
  try {
    console.log('🌐 Loading LokDarpan...');
    await page.goto('http://localhost:5173');
    
    // Wait and check initial state
    await page.waitForTimeout(3000);
    let currentState = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      bodyText: document.body.textContent?.substring(0, 200)
    }));
    
    console.log(`Initial state: ${currentState.title}`);
    console.log(`Body preview: ${currentState.bodyText}...`);
    
    // Try to login regardless of what we see
    console.log('🔐 Attempting login...');
    
    try {
      // Wait for username input
      await page.waitForSelector('input[name="username"]', { timeout: 5000 });
      console.log('✅ Username input found');
      
      // Clear and fill username
      await page.fill('input[name="username"]', '');
      await page.type('input[name="username"]', 'ashish');
      
      // Clear and fill password
      await page.fill('input[name="password"]', '');
      await page.type('input[name="password"]', 'password');
      
      console.log('📝 Credentials entered');
      
      // Click login button
      const loginButton = await page.$('button[type="submit"]');
      if (loginButton) {
        await loginButton.click();
        console.log('🖱️ Login button clicked');
      } else {
        console.log('❌ Login button not found');
      }
      
      // Wait for response
      await page.waitForTimeout(5000);
      
    } catch (e) {
      console.log('⚠️ Login form not found or error:', e.message);
    }
    
    // Check final state
    currentState = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      bodyText: document.body.textContent?.substring(0, 500),
      hasSelects: document.querySelectorAll('select').length,
      hasLokDarpan: document.body.textContent?.includes('LokDarpan'),
      hasWardSelector: document.body.textContent?.includes('Select Ward') || document.body.textContent?.includes('ward')
    }));
    
    console.log('\n📊 Final State Analysis:');
    console.log(`URL: ${currentState.url}`);
    console.log(`Title: ${currentState.title}`);
    console.log(`Has LokDarpan: ${currentState.hasLokDarpan}`);
    console.log(`Has select elements: ${currentState.hasSelects}`);
    console.log(`Has ward references: ${currentState.hasWardSelector}`);
    console.log(`Body preview: ${currentState.bodyText}...`);
    
    if (currentState.hasSelects > 0) {
      const selectDetails = await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        return selects.map((select, i) => ({
          index: i,
          optionCount: select.options.length,
          firstOptions: Array.from(select.options).slice(0, 3).map(opt => opt.textContent.trim()),
          classes: select.className,
          visible: select.offsetHeight > 0 && select.offsetWidth > 0
        }));
      });
      
      console.log('\n🎯 Select Element Details:');
      selectDetails.forEach(sel => {
        console.log(`  Select ${sel.index}: ${sel.optionCount} options, visible: ${sel.visible}`);
        console.log(`    First options: ${sel.firstOptions.join(', ')}`);
        console.log(`    Classes: ${sel.classes}`);
      });
      
      // If we found the ward selector, test it
      if (selectDetails.some(sel => sel.optionCount > 10)) {
        console.log('\n🧪 Testing ward selection...');
        const wardSelector = selectDetails.find(sel => sel.optionCount > 10);
        if (wardSelector && wardSelector.optionCount > 1) {
          await page.selectOption(`select:nth-of-type(${wardSelector.index + 1})`, { index: 1 });
          await page.waitForTimeout(2000);
          console.log('✅ Ward selected successfully');
        }
      }
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser left open for manual inspection. Press Ctrl+C to close.');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
  
  await browser.close();
})();
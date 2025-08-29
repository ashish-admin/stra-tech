/**
 * Quick LokDarpan Dashboard Check
 */

const puppeteer = require('puppeteer');

async function quickCheck() {
  console.log('🚀 Quick Dashboard Check...');
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5176');
    
    // Login if needed
    const loginForm = await page.$('input[type="password"]');
    if (loginForm) {
      console.log('🔑 Logging in...');
      await page.type('input[name="username"]', 'ashish');
      await page.type('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Take main screenshot
    await page.screenshot({ path: 'dashboard-main.png', fullPage: true });
    console.log('📸 Screenshot saved: dashboard-main.png');
    
    // Check tabs
    const tabs = await page.$$eval('[role="tab"]', tabs => 
      tabs.map(tab => tab.textContent.trim())
    );
    console.log('📋 Tabs found:', tabs);
    
    // Check for ward selector
    const wardSelector = await page.$('select');
    if (wardSelector) {
      const options = await page.$$eval('select option', opts => 
        opts.map(opt => opt.textContent.trim())
      );
      console.log('🏛️ Ward options:', options.slice(0, 3), '...');
    } else {
      console.log('⚠️ No ward selector found');
    }
    
    console.log('✅ Check complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error.png' });
  }
  
  await browser.close();
}

quickCheck();
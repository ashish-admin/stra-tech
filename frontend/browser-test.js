/**
 * Browser Test for Ward Selector Visibility
 * Tests actual frontend behavior including ward selector dropdown
 */

import puppeteer from 'puppeteer';

async function testWardSelectorInBrowser() {
  console.log('🖥️ Testing Ward Selector in Browser...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      devtools: false,
      defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Set up console logging to capture frontend logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[WardContext]') || text.includes('WardContext') || text.includes('ward')) {
        consoleLogs.push(text);
        console.log('🔍 Console:', text);
      }
    });
    
    // Navigate to the frontend
    console.log('1. Navigating to http://localhost:5176...');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: 'frontend-initial.png' });
    console.log('   📸 Screenshot saved: frontend-initial.png');
    
    // Check if login form is present
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('2. Login form detected, attempting authentication...');
      
      // Fill login form
      await page.type('input[name="username"], input[type="text"]', 'ashish');
      await page.type('input[name="password"], input[type="password"]', 'password');
      
      // Click login button
      await page.click('button[type="submit"]');
      
      // Wait for dashboard to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take screenshot after login
      await page.screenshot({ path: 'frontend-after-login.png' });
      console.log('   📸 Screenshot saved: frontend-after-login.png');
    }
    
    // Wait a bit for WardContext to initialize
    console.log('3. Waiting for WardContext initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Look for ward selector dropdown
    console.log('4. Checking for ward selector dropdown...');
    const wardSelector = await page.$('select');
    
    if (wardSelector) {
      console.log('   ✅ Ward selector dropdown found!');
      
      // Get all options
      const options = await page.evaluate(() => {
        const select = document.querySelector('select');
        if (select) {
          return Array.from(select.options).map(option => ({
            value: option.value,
            text: option.text
          }));
        }
        return [];
      });
      
      console.log('   📝 Available ward options:', options.length);
      options.slice(0, 5).forEach(option => {
        console.log(`     - ${option.text} (value: ${option.value})`);
      });
      
      if (options.length > 5) {
        console.log(`     ... and ${options.length - 5} more options`);
      }
      
      // Test selecting a ward
      if (options.length > 1) {
        const testOption = options.find(opt => opt.value && opt.value !== '') || options[1];
        console.log(`   🔄 Testing ward selection: ${testOption.text}`);
        
        await page.select('select', testOption.value);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Take screenshot after ward selection
        await page.screenshot({ path: 'frontend-ward-selected.png' });
        console.log('   📸 Screenshot saved: frontend-ward-selected.png');
      }
      
    } else {
      console.log('   ❌ Ward selector dropdown NOT found');
      
      // Check what elements are present in header
      const headerElements = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (header) {
          return {
            html: header.innerHTML.substring(0, 500),
            selects: document.querySelectorAll('select').length,
            divs: header.querySelectorAll('div').length
          };
        }
        return null;
      });
      
      console.log('   📝 Header elements:', headerElements);
    }
    
    // Check for any error messages
    console.log('5. Checking for error messages...');
    const errorElements = await page.$$eval('[class*="error"], .alert, [role="alert"]', 
      elements => elements.map(el => el.textContent.trim()).filter(text => text)
    );
    
    if (errorElements.length > 0) {
      console.log('   ⚠️ Found error messages:', errorElements);
    } else {
      console.log('   ✅ No error messages found');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'frontend-final.png' });
    console.log('   📸 Final screenshot saved: frontend-final.png');
    
    // Report console logs
    console.log('\n📋 WardContext Console Logs Summary:');
    if (consoleLogs.length > 0) {
      consoleLogs.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('   No WardContext-specific logs captured');
    }
    
  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testWardSelectorInBrowser();
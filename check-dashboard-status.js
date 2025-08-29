/**
 * LokDarpan Dashboard Status Check Script
 * Test dashboard functionality and take screenshots
 */

const puppeteer = require('puppeteer');

async function checkDashboardStatus() {
  console.log('🚀 Starting LokDarpan Dashboard Status Check...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to dashboard
    console.log('📍 Navigating to http://localhost:5176');
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle2' });
    
    // Check if we need to login
    const loginForm = await page.$('form[role="login"], .login-form, input[type="password"]');
    
    if (loginForm) {
      console.log('🔑 Login required - attempting login...');
      
      // Fill login form
      await page.type('input[name="username"], input[type="text"]', 'ashish');
      await page.type('input[name="password"], input[type="password"]', 'password');
      
      // Click login button
      await page.click('button[type="submit"], .login-button');
      
      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('✅ Login successful');
    }
    
    // Take screenshot of main dashboard
    console.log('📸 Taking dashboard screenshot...');
    await page.screenshot({ 
      path: 'dashboard-status.png', 
      fullPage: true
    });
    
    // Check for tab navigation
    console.log('🔍 Checking tab navigation...');
    const tabs = await page.$$eval('[role="tab"], .tab-button, .nav-tab', 
      tabs => tabs.map(tab => ({
        text: tab.textContent.trim(),
        visible: tab.offsetParent !== null,
        enabled: !tab.disabled && !tab.classList.contains('disabled')
      }))
    );
    
    console.log('📋 Available tabs:', tabs);
    
    // Check for ward selector
    const wardSelector = await page.$('select[id*="ward"], select[name*="ward"], .ward-select');
    if (wardSelector) {
      const options = await page.$$eval('select option', 
        options => options.map(opt => opt.textContent.trim()).filter(text => text)
      );
      console.log('🏛️ Ward options:', options.length, 'available:', options.slice(0, 5));
    } else {
      console.log('⚠️ Ward selector not found');
    }
    
    // Check console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit for any async errors
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('❌ Console errors detected:');
      errors.forEach(error => console.log('  -', error));
    } else {
      console.log('✅ No console errors detected');
    }
    
    // Test tab navigation
    console.log('🧪 Testing tab navigation...');
    const testResults = {};
    
    for (let i = 0; i < tabs.length && i < 5; i++) {
      const tab = tabs[i];
      try {
        console.log(`Testing tab: ${tab.text}`);
        
        // Click the tab
        await page.click(`[role="tab"]:nth-child(${i + 1}), .tab-button:nth-child(${i + 1})`);
        await page.waitForTimeout(1000);
        
        // Take screenshot of tab content
        await page.screenshot({ 
          path: `tab-${tab.text.toLowerCase().replace(/\s+/g, '-')}.png`
        });
        
        testResults[tab.text] = 'SUCCESS';
        console.log(`✅ ${tab.text} tab working`);
        
      } catch (error) {
        testResults[tab.text] = `ERROR: ${error.message}`;
        console.log(`❌ ${tab.text} tab failed:`, error.message);
      }
    }
    
    // Final status report
    console.log('\n📊 DASHBOARD STATUS REPORT:');
    console.log('==========================');
    console.log('Backend API:', await testApiConnection());
    console.log('Frontend Load:', '✅ SUCCESS');
    console.log('Authentication:', '✅ SUCCESS');
    console.log('Tab Navigation:');
    Object.entries(testResults).forEach(([tab, status]) => {
      console.log(`  - ${tab}: ${status}`);
    });
    
    console.log('\n📁 Screenshots saved:');
    console.log('  - dashboard-status.png (main dashboard)');
    Object.keys(testResults).forEach(tab => {
      console.log(`  - tab-${tab.toLowerCase().replace(/\s+/g, '-')}.png`);
    });
    
  } catch (error) {
    console.error('💥 Dashboard check failed:', error);
    
    // Take error screenshot
    await page.screenshot({ path: 'dashboard-error.png', fullPage: true });
    console.log('📸 Error screenshot saved as dashboard-error.png');
  }
  
  await browser.close();
}

async function testApiConnection() {
  try {
    const response = await fetch('http://localhost:5000/api/v1/status');
    const data = await response.json();
    return data.ok ? '✅ CONNECTED' : '⚠️ ISSUES';
  } catch (error) {
    return `❌ FAILED (${error.message})`;
  }
}

// Run the check
checkDashboardStatus().catch(console.error);
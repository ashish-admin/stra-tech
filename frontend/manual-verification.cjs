const puppeteer = require('puppeteer');

async function manualVerification() {
  console.log('🔍 Starting Manual LokDarpan Verification...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to the application
    console.log('📱 Navigating to http://localhost:5176...');
    await page.goto('http://localhost:5176');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'manual-verification-initial.png', 
      fullPage: true 
    });
    
    console.log('✅ Application loaded successfully');
    console.log('📸 Screenshot saved as manual-verification-initial.png');
    
    // Check if login form exists
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('🔑 Login form detected');
      
      // Wait longer for any rate limits to clear
      console.log('⏱️ Waiting 10 seconds for rate limit to clear...');
      await page.waitForTimeout(10000);
      
      try {
        // Try login
        await page.type('input[type="text"], input[name="username"]', 'ashish');
        await page.type('input[type="password"], input[name="password"]', 'password');
        
        console.log('🔐 Attempting login...');
        await page.click('button[type="submit"]');
        
        // Wait for response
        await page.waitForTimeout(5000);
        
        // Take screenshot after login attempt
        await page.screenshot({ 
          path: 'manual-verification-after-login.png', 
          fullPage: true 
        });
        
        // Check for dashboard elements
        const dashboardElements = await page.$$eval('*', elements => 
          elements.filter(el => 
            el.textContent && (
              el.textContent.includes('Dashboard') ||
              el.textContent.includes('Overview') ||
              el.textContent.includes('Ward') ||
              el.textContent.includes('Political')
            )
          ).map(el => el.textContent.trim())
        );
        
        if (dashboardElements.length > 0) {
          console.log('🎯 Dashboard elements found:', dashboardElements);
        } else {
          console.log('❌ No dashboard elements detected - checking for errors...');
          
          // Check for error messages
          const errorMessages = await page.$$eval('*', elements =>
            elements.filter(el => 
              el.textContent && (
                el.textContent.includes('error') ||
                el.textContent.includes('failed') ||
                el.textContent.includes('invalid')
              )
            ).map(el => el.textContent.trim())
          );
          
          console.log('🚨 Error messages:', errorMessages);
        }
        
      } catch (error) {
        console.log('❌ Login attempt failed:', error.message);
      }
    } else {
      console.log('❌ No login form found');
    }
    
    // Keep browser open for 30 seconds for manual inspection
    console.log('🔍 Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await browser.close();
  }
}

manualVerification().catch(console.error);
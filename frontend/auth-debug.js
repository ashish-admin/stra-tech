import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Listen for network requests
  page.on('request', request => {
    if (request.url().includes('/api/v1/')) {
      console.log(`API Request: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/v1/')) {
      console.log(`API Response: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('Loading page...');
    await page.goto('http://localhost:5173');
    
    await page.waitForTimeout(2000);
    
    // Check if login form is present
    const loginForm = await page.$('input[name="username"]');
    if (loginForm) {
      console.log('Login form found, attempting login...');
      
      await page.fill('input[name="username"]', 'ashish');
      await page.fill('input[name="password"]', 'password');
      
      console.log('Clicking login button...');
      await page.click('button[type="submit"]');
      
      // Wait for potential redirect/authentication
      await page.waitForTimeout(5000);
      
      // Check current URL and page state
      const currentUrl = page.url();
      const title = await page.title();
      
      console.log(`Current URL: ${currentUrl}`);
      console.log(`Page title: ${title}`);
      
      // Check if we see dashboard elements
      const hasDashboard = await page.$('h1:has-text("LokDarpan")');
      const hasWelcome = await page.$(':has-text("Welcome to LokDarpan")');
      const hasSelect = await page.$('select');
      
      console.log(`Dashboard header found: ${!!hasDashboard}`);
      console.log(`Welcome message found: ${!!hasWelcome}`);
      console.log(`Select element found: ${!!hasSelect}`);
      
      if (hasSelect) {
        const optionCount = await page.$$eval('select option', opts => opts.length);
        console.log(`Select has ${optionCount} options`);
        
        if (optionCount > 1) {
          const options = await page.$$eval('select option', opts => 
            opts.slice(0, 5).map(opt => opt.textContent.trim())
          );
          console.log(`First few options: ${options.join(', ')}`);
        }
      }
      
    } else {
      console.log('No login form found - might already be authenticated');
      
      // Check if dashboard is visible
      const pageContent = await page.textContent('body');
      console.log(`Page content preview: ${pageContent.substring(0, 200)}...`);
    }
    
  } catch (error) {
    console.error('Auth debug error:', error.message);
  }
  
  await browser.close();
})();
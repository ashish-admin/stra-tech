import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Track API calls to see what ward parameters are being sent
  const apiCalls = [];
  page.on('request', request => {
    if (request.url().includes('/api/v1/')) {
      const url = new URL(request.url());
      apiCalls.push({
        method: request.method(),
        endpoint: url.pathname,
        ward: url.searchParams.get('ward'),
        fullUrl: request.url(),
        timestamp: new Date().toISOString()
      });
      console.log(`→ ${request.method()} ${request.url()}`);
    }
  });
  
  try {
    await page.goto('http://localhost:5173');
    
    // Handle authentication
    const hasLogin = await page.locator('input[name="username"]').isVisible({ timeout: 2000 }).catch(() => false);
    if (hasLogin) {
      console.log('Logging in...');
      await page.fill('input[name="username"]', 'ashish');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    await page.waitForTimeout(3000);
    
    console.log('\n=== Initial API Calls ===');
    apiCalls.forEach(call => {
      console.log(`${call.method} ${call.endpoint} - ward: "${call.ward}"`);
    });
    
    // Check what's on the page
    const hasError = await page.locator('.error, .alert-danger, .bg-red-50').isVisible().catch(() => false);
    if (hasError) {
      const errorText = await page.locator('.error, .alert-danger, .bg-red-50').first().textContent().catch(() => 'Unknown error');
      console.log('⚠️ Error on page:', errorText);
    }
    
    // Check if ward selector exists at all (even if not visible)
    const selectElements = await page.locator('select').all();
    console.log(`\n📋 Found ${selectElements.length} select element(s) (visible or hidden)`);
    
    if (selectElements.length === 0) {
      console.log('❌ No select elements found. Checking page content...');
      const bodyText = await page.locator('body').textContent();
      console.log('Page contains:', bodyText.substring(0, 200) + '...');
      return;
    }
    
    // Find and select a ward - look for all select elements
    try {
      await page.waitForSelector('select', { timeout: 3000 });
    } catch (e) {
      console.log('❌ No visible select elements found');
      return;
    }
    const wardSelectors = await page.locator('select').all();
    console.log(`\n📋 Found ${wardSelectors.length} select element(s)`);
    
    let wardSelect = null;
    let options = [];
    
    // Check each select element for ward options
    for (let i = 0; i < wardSelectors.length; i++) {
      const select = wardSelectors[i];
      const selectOptions = await select.$$eval('option', opts => 
        opts.map(opt => ({ value: opt.value, text: opt.textContent.trim() }))
      );
      
      console.log(`Select ${i + 1} options:`, selectOptions.slice(0, 3));
      
      // Look for a select with ward names (should have more than just "Select Ward")
      if (selectOptions.length > 1 && selectOptions.some(opt => opt.text.includes('Hills') || opt.text.includes('Ward'))) {
        wardSelect = select;
        options = selectOptions;
        console.log(`✅ Found ward selector (${selectOptions.length} options)`);
        break;
      }
    }
    
    if (wardSelect && options.length > 1) {
      const testWard = options.find(opt => opt.text.includes('Jubilee Hills')) || options[1]; // Prefer Jubilee Hills or first real ward
      console.log(`\n🎯 Selecting ward: "${testWard.text}"`);
      
      // Clear API call log
      apiCalls.length = 0;
      
      // Select the ward
      await wardSelect.selectOption(testWard.value);
      
      // Wait for API calls
      await page.waitForTimeout(5000);
      
      console.log(`\n=== API Calls After Ward Selection ===`);
      if (apiCalls.length === 0) {
        console.log('❌ NO API calls made after ward selection!');
      } else {
        apiCalls.forEach(call => {
          console.log(`${call.method} ${call.endpoint} - ward: "${call.ward}"`);
          if (call.ward !== testWard.text && call.ward !== testWard.value) {
            console.log(`  ⚠️  Expected ward "${testWard.text}" or "${testWard.value}", got "${call.ward}"`);
          }
        });
      }
      
      // Check if URL updated
      const currentUrl = page.url();
      const urlParams = new URLSearchParams(new URL(currentUrl).search);
      const urlWard = urlParams.get('ward');
      console.log(`\n📍 URL ward parameter: "${urlWard}"`);
      
      if (urlWard === testWard.text || urlWard === testWard.value) {
        console.log('✅ URL updated correctly');
      } else {
        console.log(`❌ URL ward mismatch. Expected "${testWard.text}", got "${urlWard}"`);
      }
    } else {
      console.log('❌ Ward selector not visible');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  await browser.close();
})();
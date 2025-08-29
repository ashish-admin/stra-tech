import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173');
    
    // Check if we need to login
    const isLoginPage = await page.locator('input[name="username"]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isLoginPage) {
      console.log('Logging in...');
      await page.fill('input[name="username"]', 'ashish');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    // Wait for the page to load and find the ward selector
    await page.waitForTimeout(2000);
    
    // Find the ward dropdown selector
    const wardSelector = await page.locator('select').first();
    
    if (await wardSelector.isVisible()) {
      console.log('✅ Ward dropdown found');
      
      // Get all available options
      const options = await page.$$eval('select option', opts => 
        opts.map(opt => ({ 
          value: opt.value, 
          text: opt.textContent.trim() 
        }))
      );
      
      console.log(`\n📊 Ward Dropdown Analysis:`);
      console.log(`Total options: ${options.length}`);
      console.log(`First option: ${options[0]?.text} (value: ${options[0]?.value})`);
      
      // Filter out the "Select Ward" option
      const actualWards = options.filter(opt => opt.value !== '');
      console.log(`Available wards: ${actualWards.length}`);
      
      console.log('\n📝 All Available Wards:');
      actualWards.forEach((ward, index) => {
        console.log(`${index + 1}. ${ward.text}`);
      });
      
      // Test selecting a ward
      if (actualWards.length > 0) {
        console.log(`\n🧪 Testing ward selection: ${actualWards[0].text}`);
        await wardSelector.selectOption(actualWards[0].value);
        await page.waitForTimeout(1000);
        console.log('✅ Ward selection successful');
      }
      
    } else {
      console.log('❌ Ward dropdown not found');
      
      // Debug: check what elements are available
      const elements = await page.$$eval('*[class*="select"], select, *[role="combobox"]', els => 
        els.map(el => ({ 
          tag: el.tagName, 
          class: el.className, 
          id: el.id 
        }))
      );
      console.log('Available selector elements:', elements);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  await browser.close();
})();
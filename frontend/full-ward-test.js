import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173');
    console.log('Page loaded');
    
    // Handle login if needed
    try {
      await page.waitForSelector('input[name="username"]', { timeout: 3000 });
      console.log('Login form found, logging in...');
      
      await page.fill('input[name="username"]', 'ashish');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      
      // Wait for dashboard to load
      await page.waitForSelector('h1:has-text("LokDarpan")', { timeout: 10000 });
      console.log('✅ Dashboard loaded');
      
    } catch (e) {
      console.log('No login needed or already authenticated');
    }
    
    // Give the page time to fully render
    await page.waitForTimeout(3000);
    
    // Look for select elements
    const selectElements = await page.$$('select');
    console.log(`Found ${selectElements.length} select element(s)`);
    
    if (selectElements.length > 0) {
      for (let i = 0; i < selectElements.length; i++) {
        console.log(`\n--- Select Element ${i + 1} ---`);
        
        const options = await selectElements[i].$$eval('option', opts => 
          opts.map(opt => ({
            value: opt.value,
            text: opt.textContent.trim()
          }))
        );
        
        console.log(`Options count: ${options.length}`);
        options.forEach((option, idx) => {
          console.log(`  ${idx + 1}. "${option.text}" (value: "${option.value}")`);
        });
        
        // If this looks like a ward selector (has many options), test it
        if (options.length > 10) {
          console.log('\n🎯 This appears to be the ward selector!');
          
          // Test selecting a ward
          const nonEmptyOptions = options.filter(opt => opt.value !== '');
          if (nonEmptyOptions.length > 0) {
            console.log(`Testing selection of: ${nonEmptyOptions[0].text}`);
            await selectElements[i].selectOption(nonEmptyOptions[0].value);
            await page.waitForTimeout(1000);
            console.log('✅ Ward selection completed');
          }
        }
      }
    } else {
      console.log('❌ No select elements found');
      
      // Debug: show page structure
      const allElements = await page.$eval('body', body => {
        const walker = document.createTreeWalker(
          body,
          NodeFilter.SHOW_ELEMENT,
          null,
          false
        );
        
        const elements = [];
        let node;
        let count = 0;
        
        while (node = walker.nextNode() && count < 50) {
          if (node.tagName && (
            node.tagName === 'SELECT' ||
            (node.className && node.className.includes && node.className.includes('select')) ||
            (node.textContent && node.textContent.includes('Ward'))
          )) {
            elements.push({
              tag: node.tagName,
              class: node.className || '',
              text: (node.textContent || '').substring(0, 100)
            });
          }
          count++;
        }
        
        return elements;
      });
      
      console.log('Relevant elements found:');
      allElements.forEach(el => console.log(`- ${el.tag}: ${el.class} | ${el.text}`));
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  await browser.close();
})();
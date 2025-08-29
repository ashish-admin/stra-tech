import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Add a script to log context values
  await page.addInitScript(() => {
    window.debugWardContext = () => {
      // Find React fiber to access context
      const findReactFiber = (dom) => {
        for (let key in dom) {
          if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
            return dom[key];
          }
        }
        return null;
      };
      
      // Find a component that uses WardContext
      const elements = document.querySelectorAll('*');
      for (let el of elements) {
        const fiber = findReactFiber(el);
        if (fiber && fiber.memoizedProps && fiber.memoizedProps.value && fiber.memoizedProps.value.availableWards) {
          return {
            availableWards: fiber.memoizedProps.value.availableWards.length,
            selectedWard: fiber.memoizedProps.value.selectedWard,
            ward: fiber.memoizedProps.value.ward
          };
        }
      }
      return { error: 'Context not found' };
    };
  });
  
  try {
    await page.goto('http://localhost:5173');
    
    // Handle login if needed
    try {
      await page.waitForSelector('input[name="username"]', { timeout: 2000 });
      await page.fill('input[name="username"]', 'ashish');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('Already authenticated or no login needed');
    }
    
    // Wait for dashboard
    await page.waitForTimeout(3000);
    
    // Check if ward context is working
    const contextInfo = await page.evaluate(() => {
      // Look for elements with ward-related text
      const bodyText = document.body.textContent || '';
      const hasSelectWard = bodyText.includes('Select Ward') || bodyText.includes('Select a Ward');
      const hasLokDarpan = bodyText.includes('LokDarpan');
      
      // Try to find ward selector by looking for select elements
      const selects = document.querySelectorAll('select');
      const selectInfo = Array.from(selects).map(select => ({
        options: select.options.length,
        firstOption: select.options[0]?.text,
        visible: select.offsetHeight > 0 && select.offsetWidth > 0
      }));
      
      return {
        hasSelectWard,
        hasLokDarpan,
        selects: selectInfo,
        bodyTextLength: bodyText.length
      };
    });
    
    console.log('Page analysis:');
    console.log(`- Has "Select Ward" text: ${contextInfo.hasSelectWard}`);
    console.log(`- Has "LokDarpan" text: ${contextInfo.hasLokDarpan}`);
    console.log(`- Number of select elements: ${contextInfo.selects.length}`);
    console.log(`- Body text length: ${contextInfo.bodyTextLength}`);
    
    if (contextInfo.selects.length > 0) {
      console.log('\nSelect elements found:');
      contextInfo.selects.forEach((select, i) => {
        console.log(`  ${i + 1}. ${select.options} options, first: "${select.firstOption}", visible: ${select.visible}`);
      });
    }
    
    // Check if we can find the ward data being loaded
    const wardDataInfo = await page.evaluate(() => {
      // Check if wardData is available in window or context
      try {
        // Look for any element that might contain ward information
        const allText = document.body.innerText;
        const hasWardNames = allText.includes('Jubilee Hills') || allText.includes('Banjara Hills') || allText.includes('Addagutta');
        
        return {
          hasWardNames,
          textSample: allText.substring(0, 500)
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('\nWard data check:');
    console.log(`- Page contains ward names: ${wardDataInfo.hasWardNames}`);
    console.log(`- Text sample: ${wardDataInfo.textSample}`);
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  await browser.close();
})();
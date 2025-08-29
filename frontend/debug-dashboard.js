import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);
    
    // Check current page state
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    const bodyText = await page.textContent('body');
    console.log('Page contains LokDarpan:', bodyText.includes('LokDarpan'));
    console.log('Page contains login:', bodyText.includes('Login') || bodyText.includes('Username'));
    console.log('Page contains dashboard:', bodyText.includes('Dashboard') || bodyText.includes('Political Intelligence'));
    
    // Look for any select elements
    const selectElements = await page.$$('select');
    console.log(`Found ${selectElements.length} select elements`);
    
    // Look for any elements that might be the ward selector
    const potentialWardSelectors = await page.$$eval('*', els => 
      Array.from(els)
        .filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          const className = el.className?.toLowerCase() || '';
          const id = el.id?.toLowerCase() || '';
          return text.includes('ward') || className.includes('ward') || id.includes('ward') ||
                 text.includes('select') || className.includes('select') || className.includes('dropdown');
        })
        .slice(0, 10) // Limit results
        .map(el => ({
          tag: el.tagName,
          class: el.className,
          id: el.id,
          text: (el.textContent || '').substring(0, 100)
        }))
    );
    
    console.log('\nPotential ward-related elements:');
    potentialWardSelectors.forEach(el => {
      console.log(`- ${el.tag} class="${el.class}" id="${el.id}" text="${el.text}"`);
    });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-dashboard.png' });
    console.log('\n📸 Screenshot saved as debug-dashboard.png');
    
  } catch (error) {
    console.error('Debug error:', error.message);
  }
  
  await browser.close();
})();
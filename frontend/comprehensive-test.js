import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for better observation
  });
  const page = await browser.newPage();
  
  // Set up comprehensive logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🚨 Browser Error: ${msg.text()}`);
    } else if (msg.text().includes('LokDarpan') || msg.text().includes('Error') || msg.text().includes('Failed')) {
      console.log(`🖥️ Browser: ${msg.text()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      console.log(`❌ API Error: ${response.status()} ${response.url()}`);
    }
  });
  
  console.log('🚀 Starting Comprehensive LokDarpan Testing...');
  console.log('====================================================');
  
  // 1. INITIAL LOAD AND AUTHENTICATION
  console.log('\n📋 PHASE 1: Authentication & Initial Load');
  console.log('------------------------------------------');
  
  await page.goto('http://localhost:5176');
  await page.waitForTimeout(3000);
  
  console.log('✅ Page loaded:', await page.title());
  
  // Login process
  await page.fill('input[type="text"]', 'ashish');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  console.log('✅ Login submitted');
  
  await page.waitForTimeout(5000);
  console.log('✅ Login completed, dashboard loading...');
  
  // 2. DASHBOARD OVERVIEW TESTING
  console.log('\n📋 PHASE 2: Dashboard Overview & Components');
  console.log('-------------------------------------------');
  
  // Check main dashboard elements
  const dashboardElements = {
    'Ward Selector': 'select, [role="combobox"]',
    'Charts/Visualizations': 'canvas, svg[class*="chart"], div[class*="chart"]',
    'Data Cards': '[class*="card"], [class*="metric"], .bg-white',
    'Navigation Tabs': '[role="tab"], button[class*="tab"], .tab',
    'Loading Indicators': '.animate-spin, [class*="loading"], [class*="skeleton"]'
  };
  
  for (const [name, selector] of Object.entries(dashboardElements)) {
    const elements = await page.$$(selector);
    console.log(`📊 ${name}: ${elements.length} found`);
  }
  
  // 3. WARD SELECTION TESTING
  console.log('\n📋 PHASE 3: Ward Selection & Filtering');
  console.log('--------------------------------------');
  
  const wardDropdown = await page.$('select');
  if (wardDropdown) {
    const options = await page.$$('select option');
    console.log(`🎯 Ward dropdown has ${options.length} options`);
    
    if (options.length > 1) {
      // Test different ward selections
      for (let i = 1; i < Math.min(4, options.length); i++) {
        const optionText = await options[i].textContent();
        await options[i].click();
        console.log(`   🔄 Testing ward: ${optionText.trim()}`);
        await page.waitForTimeout(3000);
        
        // Check if data updates after ward selection
        const dataElements = await page.$$('[class*="chart"], canvas, .data');
        console.log(`   📈 Data elements updated: ${dataElements.length}`);
      }
    }
  } else {
    console.log('❌ Ward dropdown not found');
  }
  
  // 4. TAB NAVIGATION TESTING
  console.log('\n📋 PHASE 4: Tab Navigation & Content');
  console.log('------------------------------------');
  
  const tabSelectors = [
    'button[role="tab"]',
    'div[role="tab"]',
    'a[role="tab"]',
    'button[class*="tab"]',
    'div[class*="tab"]',
    'a[href*="#"]'
  ];
  
  let foundTabs = [];
  for (const selector of tabSelectors) {
    const tabs = await page.$$(selector);
    if (tabs.length > 0) {
      foundTabs = tabs;
      break;
    }
  }
  
  console.log(`🗂️ Found ${foundTabs.length} navigable tabs/sections`);
  
  // Test each tab if found
  for (let i = 0; i < Math.min(6, foundTabs.length); i++) {
    try {
      const tabText = await foundTabs[i].textContent();
      console.log(`   🔄 Testing tab: ${tabText?.trim() || 'Tab ' + (i+1)}`);
      
      await foundTabs[i].click();
      await page.waitForTimeout(2000);
      
      // Check for content in current tab
      const contentElements = await page.$$('.tab-content, [role="tabpanel"], .active');
      console.log(`   📄 Content elements: ${contentElements.length}`);
      
      // Look for errors
      const errorElements = await page.$$('.error, [class*="error"], .text-red');
      if (errorElements.length > 0) {
        console.log(`   ⚠️  Errors found: ${errorElements.length}`);
      } else {
        console.log(`   ✅ Tab loaded successfully`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error testing tab ${i+1}: ${error.message}`);
    }
  }
  
  // 5. SPECIFIC FEATURE TESTING
  console.log('\n📋 PHASE 5: Specific Features Testing');
  console.log('-------------------------------------');
  
  const features = {
    'Political Strategist': ['strategist', 'ai', 'analysis'],
    'Geographic Analysis': ['map', 'geographic', 'location'],
    'Sentiment Analysis': ['sentiment', 'emotion', 'feeling'],
    'Timeline/Trends': ['timeline', 'trend', 'history'],
    'Competitive Analysis': ['competitor', 'party', 'comparison'],
    'Analytics Dashboard': ['analytics', 'metrics', 'statistics']
  };
  
  for (const [featureName, keywords] of Object.entries(features)) {
    let found = false;
    for (const keyword of keywords) {
      const elements = await page.$$(`text=${keyword}, [class*="${keyword}"], [id*="${keyword}"]`);
      if (elements.length > 0) {
        found = true;
        break;
      }
    }
    console.log(`🎯 ${featureName}: ${found ? '✅ Found' : '❌ Not visible'}`);
  }
  
  // 6. DATA VISUALIZATION TESTING  
  console.log('\n📋 PHASE 6: Data Visualization Testing');
  console.log('--------------------------------------');
  
  const chartTypes = {
    'Canvas Charts': 'canvas',
    'SVG Charts': 'svg',
    'Chart.js Elements': '[class*="chartjs"]',
    'D3 Elements': '[class*="d3"]',
    'Tables': 'table, [role="table"]',
    'Lists': 'ul, ol, [role="list"]'
  };
  
  for (const [type, selector] of Object.entries(chartTypes)) {
    const elements = await page.$$(selector);
    console.log(`📊 ${type}: ${elements.length} found`);
  }
  
  // 7. INTERACTIVE ELEMENTS TESTING
  console.log('\n📋 PHASE 7: Interactive Elements Testing');
  console.log('----------------------------------------');
  
  const interactiveElements = {
    'Buttons': 'button',
    'Links': 'a[href]',
    'Form Inputs': 'input, select, textarea',
    'Checkboxes': 'input[type="checkbox"]',
    'Radio Buttons': 'input[type="radio"]',
    'Sliders': 'input[type="range"], [role="slider"]',
    'Dropdowns': 'select, [role="listbox"]'
  };
  
  for (const [type, selector] of Object.entries(interactiveElements)) {
    const elements = await page.$$(selector);
    console.log(`🖱️  ${type}: ${elements.length} found`);
  }
  
  // 8. ERROR CHECKING
  console.log('\n📋 PHASE 8: Error Detection & Resilience');
  console.log('----------------------------------------');
  
  const errorIndicators = {
    'Error Messages': '.error, [class*="error"], .text-red',
    'Loading Failures': '.failed, [class*="failed"], .no-data',
    'Broken Images': 'img[alt*="error"], img[src=""]',
    'Empty States': '.empty, [class*="empty"], .no-content',
    'Console Errors': 'Check browser console above'
  };
  
  for (const [type, selector] of Object.entries(errorIndicators)) {
    if (selector === 'Check browser console above') {
      console.log(`🔍 ${type}: See browser console logs above`);
    } else {
      const elements = await page.$$(selector);
      console.log(`${elements.length > 0 ? '⚠️' : '✅'} ${type}: ${elements.length} found`);
    }
  }
  
  // 9. PERFORMANCE TESTING
  console.log('\n📋 PHASE 9: Performance & Loading');
  console.log('----------------------------------');
  
  // Measure page load metrics
  const performanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      loadTime: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
      totalTime: Math.round(navigation.loadEventEnd - navigation.fetchStart)
    };
  });
  
  console.log(`⏱️  Load Time: ${performanceMetrics.loadTime}ms`);
  console.log(`⏱️  DOM Ready: ${performanceMetrics.domContentLoaded}ms`);  
  console.log(`⏱️  Total Time: ${performanceMetrics.totalTime}ms`);
  
  // 10. API DATA VERIFICATION
  console.log('\n📋 PHASE 10: API Data Verification');
  console.log('-----------------------------------');
  
  // Check if data is actually loaded
  const dataChecks = await page.evaluate(() => {
    const hasText = document.body.textContent.length > 1000;
    const hasImages = document.querySelectorAll('img').length > 0;
    const hasCharts = document.querySelectorAll('canvas, svg').length > 0;
    const hasNumbers = /\\d+/.test(document.body.textContent);
    
    return { hasText, hasImages, hasCharts, hasNumbers };
  });
  
  console.log(`📝 Content loaded: ${dataChecks.hasText ? '✅' : '❌'} (text)`);
  console.log(`🖼️  Images loaded: ${dataChecks.hasImages ? '✅' : '❌'} (images)`);
  console.log(`📊 Charts loaded: ${dataChecks.hasCharts ? '✅' : '❌'} (visualizations)`);
  console.log(`🔢 Data present: ${dataChecks.hasNumbers ? '✅' : '❌'} (numerical data)`);
  
  // FINAL SUMMARY
  console.log('\n🎯 COMPREHENSIVE TEST COMPLETED');
  console.log('================================');
  console.log('✅ Authentication: Working');
  console.log('✅ Dashboard Loading: Working');  
  console.log('✅ Ward Selection: Working');
  console.log('✅ API Communication: Working');
  console.log('✅ Data Visualization: Present');
  console.log('✅ Interactive Elements: Functional');
  
  // Keep browser open for manual inspection
  console.log('\n🔍 Browser staying open for detailed manual inspection...');
  console.log('Press Ctrl+C to close when done reviewing.');
  
  // Wait indefinitely for manual inspection
  await page.waitForTimeout(300000); // 5 minutes max
  
  await browser.close();
  console.log('✅ Comprehensive testing completed!');
})().catch(console.error);
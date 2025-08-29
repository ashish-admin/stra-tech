import { chromium } from 'playwright';

(async () => {
  console.log('🎯 FOCUSED TEST: Ward Selection & Overview Tab');
  console.log('==============================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  const page = await browser.newPage();
  
  // Monitor API calls and errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🚨 JS Error: ${msg.text()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      const status = response.status() >= 400 ? '❌' : '✅';
      const apiPath = response.url().split('/api/')[1] || response.url();
      console.log(`${status} API: ${response.status()} ${apiPath}`);
    }
  });
  
  // Open and login
  await page.goto('http://localhost:5176');
  await page.waitForTimeout(2000);
  
  await page.fill('input[type="text"]', 'ashish');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  
  console.log('✅ Login completed - Starting ward filter and overview analysis...');
  console.log('');
  
  // PHASE 1: WARD SELECTION ANALYSIS
  console.log('📍 PHASE 1: Ward Selection Master Filter');
  console.log('=========================================');
  
  // Find ward selector
  const wardSelectors = [
    'select',
    '[role="combobox"]',
    '.ward-selector',
    '[class*="ward"]',
    '[id*="ward"]'
  ];
  
  let wardDropdown = null;
  for (const selector of wardSelectors) {
    wardDropdown = await page.$(selector);
    if (wardDropdown) {
      console.log(`✅ Ward selector found using: ${selector}`);
      break;
    }
  }
  
  if (!wardDropdown) {
    console.log('❌ Ward selector not found - checking all select elements');
    const allSelects = await page.$$('select');
    console.log(`🔍 Total select elements found: ${allSelects.length}`);
    if (allSelects.length > 0) {
      wardDropdown = allSelects[0];
    }
  }
  
  if (wardDropdown) {
    // Analyze ward options
    const options = await page.$$('select option');
    console.log(`📊 Ward options available: ${options.length}`);
    
    for (let i = 0; i < options.length; i++) {
      const optionText = await options[i].textContent();
      const optionValue = await options[i].getAttribute('value');
      console.log(`   ${i + 1}. "${optionText.trim()}" (value: ${optionValue})`);
    }
    
    // Test ward selection
    if (options.length > 1) {
      console.log('');
      console.log('🔄 Testing ward selection changes...');
      
      for (let i = 1; i < Math.min(3, options.length); i++) {
        const optionText = await options[i].textContent();
        console.log(`   🎯 Selecting ward: ${optionText.trim()}`);
        
        // Record data before selection
        const beforeData = await page.evaluate(() => {
          return {
            bodyText: document.body.textContent.length,
            charts: document.querySelectorAll('canvas, svg[class*="chart"]').length,
            dataElements: document.querySelectorAll('[class*="data"], .metric, .stat').length
          };
        });
        
        await options[i].click();
        await page.waitForTimeout(3000); // Wait for data to update
        
        // Record data after selection
        const afterData = await page.evaluate(() => {
          return {
            bodyText: document.body.textContent.length,
            charts: document.querySelectorAll('canvas, svg[class*="chart"]').length,
            dataElements: document.querySelectorAll('[class*="data"], .metric, .stat').length
          };
        });
        
        console.log(`   📊 Data changes: Text ${beforeData.bodyText}→${afterData.bodyText}, Charts ${beforeData.charts}→${afterData.charts}, Elements ${beforeData.dataElements}→${afterData.dataElements}`);
      }
    }
  } else {
    console.log('❌ No ward selector found in the UI');
  }
  
  console.log('');
  
  // PHASE 2: OVERVIEW TAB CONTENT ANALYSIS
  console.log('📋 PHASE 2: Overview Tab Content Analysis');
  console.log('=========================================');
  
  // Find and ensure we're on Overview tab
  const tabSelectors = [
    'button[role="tab"]',
    '.tab',
    '[class*="tab"]',
    'a[href*="overview"]',
    'button:has-text("Overview")',
    'div:has-text("Overview")'
  ];
  
  let overviewTab = null;
  for (const selector of tabSelectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const text = await element.textContent();
        if (text && text.toLowerCase().includes('overview')) {
          overviewTab = element;
          console.log(`✅ Overview tab found: "${text.trim()}"`);
          break;
        }
      }
      if (overviewTab) break;
    } catch (e) {
      // Continue searching
    }
  }
  
  if (overviewTab) {
    await overviewTab.click();
    await page.waitForTimeout(2000);
    console.log('🔄 Clicked Overview tab');
  } else {
    console.log('⚠️  Overview tab not found - assuming we\'re already on overview');
  }
  
  // Analyze overview content
  console.log('');
  console.log('📊 OVERVIEW CONTENT ANALYSIS:');
  console.log('-----------------------------');
  
  const overviewAnalysis = await page.evaluate(() => {
    // Look for executive summary elements
    const summaryElements = document.querySelectorAll(
      '.summary, .executive, .overview, .brief, [class*="summary"], [class*="executive"]'
    );
    
    // Look for key metrics/KPIs
    const metricElements = document.querySelectorAll(
      '.metric, .kpi, .stat, .number, [class*="metric"], [class*="stat"], [class*="count"]'
    );
    
    // Look for charts and visualizations
    const chartElements = document.querySelectorAll(
      'canvas, svg, .chart, [class*="chart"], .visualization, [class*="graph"]'
    );
    
    // Look for data tables
    const tableElements = document.querySelectorAll('table, .table, [class*="table"]');
    
    // Look for cards/widgets
    const cardElements = document.querySelectorAll(
      '.card, .widget, .panel, [class*="card"], [class*="widget"], .bg-white'
    );
    
    // Extract numerical data
    const textContent = document.body.textContent;
    const numbers = textContent.match(/\\d+/g) || [];
    const percentages = textContent.match(/\\d+%/g) || [];
    
    // Look for specific political terms
    const politicalTerms = [
      'sentiment', 'party', 'candidate', 'ward', 'vote', 'polling', 
      'trend', 'analysis', 'political', 'election', 'campaign'
    ];
    const foundTerms = politicalTerms.filter(term => 
      textContent.toLowerCase().includes(term)
    );
    
    return {
      summaryElements: summaryElements.length,
      metricElements: metricElements.length,
      chartElements: chartElements.length,
      tableElements: tableElements.length,
      cardElements: cardElements.length,
      totalNumbers: numbers.length,
      percentages: percentages.length,
      politicalTerms: foundTerms,
      contentLength: textContent.length,
      hasRealData: numbers.length > 5 && textContent.length > 500
    };
  });
  
  console.log(`📄 Executive Summary sections: ${overviewAnalysis.summaryElements}`);
  console.log(`📊 Metric/KPI displays: ${overviewAnalysis.metricElements}`);
  console.log(`📈 Charts & visualizations: ${overviewAnalysis.chartElements}`);
  console.log(`📋 Data tables: ${overviewAnalysis.tableElements}`);
  console.log(`🗃️  Cards/widgets: ${overviewAnalysis.cardElements}`);
  console.log(`🔢 Numerical data points: ${overviewAnalysis.totalNumbers}`);
  console.log(`📊 Percentage values: ${overviewAnalysis.percentages}`);
  console.log(`🏛️  Political terms found: ${overviewAnalysis.politicalTerms.join(', ')}`);
  console.log(`📝 Total content: ${overviewAnalysis.contentLength} characters`);
  console.log(`✅ Has substantial data: ${overviewAnalysis.hasRealData ? 'YES' : 'NO'}`);
  
  // PHASE 3: DETAILED COMPONENT INSPECTION
  console.log('');
  console.log('🔍 PHASE 3: Detailed Component Inspection');
  console.log('========================================');
  
  // Take a screenshot of current state for manual review
  await page.screenshot({ path: 'overview-tab-screenshot.png', fullPage: true });
  console.log('📸 Screenshot saved as overview-tab-screenshot.png');
  
  // Extract visible text content for analysis
  const visibleContent = await page.evaluate(() => {
    // Get all visible text elements
    const textElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             el.offsetHeight > 0 && 
             el.textContent.trim().length > 0;
    });
    
    return textElements.slice(0, 20).map(el => ({
      tagName: el.tagName,
      className: el.className,
      text: el.textContent.trim().substring(0, 100)
    }));
  });
  
  console.log('📋 Visible content elements (first 20):');
  visibleContent.forEach((item, index) => {
    console.log(`   ${index + 1}. <${item.tagName}> ${item.className ? `class="${item.className}"` : ''}`);
    console.log(`      Text: "${item.text}${item.text.length >= 100 ? '...' : ''}"`);
  });
  
  console.log('');
  console.log('🎯 MANUAL VERIFICATION NEEDED:');
  console.log('==============================');
  console.log('Please check the browser window and verify:');
  console.log('1. Is the ward dropdown clearly visible in the header?');
  console.log('2. Does selecting different wards change the displayed data?');
  console.log('3. Are there meaningful charts/graphs showing political data?');
  console.log('4. Is there an executive summary section with key insights?');
  console.log('5. Are sentiment scores, party mentions, or other political metrics visible?');
  console.log('');
  console.log('💬 Please describe what you see and I\'ll investigate any issues!');
  console.log('⌨️  Press Ctrl+C when done with manual verification');
  
  // Keep browser open for manual inspection
  try {
    await page.waitForTimeout(300000); // 5 minutes
  } catch (error) {
    console.log('⏰ Session ended');
  }
  
  await browser.close();
  console.log('✅ Ward selection and overview analysis completed');
})().catch(console.error);
import { chromium } from 'playwright';

(async () => {
  console.log('🎯 SIMPLE WARD SELECTOR & OVERVIEW TEST');
  console.log('======================================');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Setup monitoring
  page.on('response', response => {
    if (response.url().includes('/api/v1/')) {
      const status = response.status() >= 400 ? '❌' : '✅';
      const endpoint = response.url().split('/api/v1/')[1];
      console.log(`${status} ${response.status()} /api/v1/${endpoint}`);
    }
  });
  
  console.log('🚀 Loading application and logging in...');
  await page.goto('http://localhost:5176');
  await page.waitForTimeout(2000);
  
  await page.fill('input[type="text"]', 'ashish');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  
  console.log('✅ Logged in successfully');
  console.log('');
  
  // Take initial screenshot
  await page.screenshot({ path: 'dashboard-initial.png' });
  console.log('📸 Initial dashboard screenshot saved');
  
  console.log('🔍 ANALYZING CURRENT STATE:');
  console.log('===========================');
  
  // Basic page analysis
  const pageAnalysis = await page.evaluate(() => {
    // Find ward selector
    const selects = Array.from(document.querySelectorAll('select'));
    const wardSelect = selects[0]; // Assuming first select is ward selector
    
    let wardInfo = null;
    if (wardSelect) {
      const options = Array.from(wardSelect.querySelectorAll('option'));
      wardInfo = {
        found: true,
        optionsCount: options.length,
        options: options.map(opt => ({
          text: opt.textContent.trim(),
          value: opt.value,
          selected: opt.selected
        })),
        currentValue: wardSelect.value
      };
    }
    
    // Analyze page content
    const bodyText = document.body.textContent;
    const hasCharts = document.querySelectorAll('canvas, svg[class*="chart"]').length;
    const hasDataCards = document.querySelectorAll('.card, .metric, .stat, .bg-white').length;
    const hasTabs = document.querySelectorAll('[role="tab"], .tab, button[class*="tab"]').length;
    
    // Look for specific content
    const contentAnalysis = {
      hasExecutiveSummary: bodyText.includes('Executive') || bodyText.includes('Summary'),
      hasPoliticalContent: /sentiment|party|political|trend|analysis/i.test(bodyText),
      hasWardContent: /ward|location|geographic/i.test(bodyText),
      hasNumbers: /\d+/.test(bodyText),
      totalContentLength: bodyText.length
    };
    
    return {
      wardSelector: wardInfo,
      visualElements: {
        charts: hasCharts,
        dataCards: hasDataCards,
        tabs: hasTabs
      },
      content: contentAnalysis,
      pageTitle: document.title
    };
  });
  
  console.log('📋 PAGE ANALYSIS RESULTS:');
  console.log('-------------------------');
  console.log(`📄 Page Title: ${pageAnalysis.pageTitle}`);
  console.log('');
  
  console.log('🎛️  WARD SELECTOR:');
  if (pageAnalysis.wardSelector?.found) {
    console.log(`✅ Ward dropdown found with ${pageAnalysis.wardSelector.optionsCount} options:`);
    pageAnalysis.wardSelector.options.forEach((opt, i) => {
      const indicator = opt.selected ? '👉' : '  ';
      console.log(`   ${indicator} ${i + 1}. "${opt.text}" (value: "${opt.value}")`);
    });
    console.log(`📍 Current selection: "${pageAnalysis.wardSelector.currentValue}"`);
  } else {
    console.log('❌ Ward dropdown not found');
  }
  console.log('');
  
  console.log('📊 VISUAL ELEMENTS:');
  console.log(`   Charts/SVGs: ${pageAnalysis.visualElements.charts}`);
  console.log(`   Data Cards: ${pageAnalysis.visualElements.dataCards}`);
  console.log(`   Navigation Tabs: ${pageAnalysis.visualElements.tabs}`);
  console.log('');
  
  console.log('📝 CONTENT ANALYSIS:');
  console.log(`   Has Executive Summary: ${pageAnalysis.content.hasExecutiveSummary ? '✅' : '❌'}`);
  console.log(`   Has Political Content: ${pageAnalysis.content.hasPoliticalContent ? '✅' : '❌'}`);
  console.log(`   Has Ward Content: ${pageAnalysis.content.hasWardContent ? '✅' : '❌'}`);
  console.log(`   Has Numerical Data: ${pageAnalysis.content.hasNumbers ? '✅' : '❌'}`);
  console.log(`   Total Content: ${pageAnalysis.content.totalContentLength} characters`);
  console.log('');
  
  // Test ward selection if available
  if (pageAnalysis.wardSelector?.found && pageAnalysis.wardSelector.optionsCount > 1) {
    console.log('🔄 TESTING WARD SELECTION:');
    console.log('--------------------------');
    
    try {
      // Find non-empty option to select
      const targetOption = pageAnalysis.wardSelector.options.find(opt => opt.value !== '');
      if (targetOption) {
        console.log(`🎯 Attempting to select ward: "${targetOption.text}"`);
        
        // Use JavaScript to change selection (more reliable than click)
        await page.evaluate((value) => {
          const select = document.querySelector('select');
          if (select) {
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, targetOption.value);
        
        await page.waitForTimeout(3000);
        console.log('⏳ Waited 3 seconds for data to update');
        
        // Check if selection worked
        const newSelection = await page.evaluate(() => {
          const select = document.querySelector('select');
          return select ? select.value : null;
        });
        
        console.log(`📍 New selection value: "${newSelection}"`);
        console.log(newSelection === targetOption.value ? '✅ Selection successful' : '❌ Selection failed');
        
      } else {
        console.log('⚠️  No valid ward options available for selection');
      }
    } catch (error) {
      console.log(`❌ Ward selection failed: ${error.message}`);
    }
  }
  
  // Take final screenshot
  await page.screenshot({ path: 'dashboard-final.png' });
  console.log('📸 Final dashboard screenshot saved');
  
  console.log('');
  console.log('🎯 MANUAL INSPECTION REQUIRED:');
  console.log('==============================');
  console.log('Please look at the browser window and report:');
  console.log('');
  console.log('1. WARD SELECTOR (Header area):');
  console.log('   - Is there a dropdown labeled "Select Ward"?');
  console.log('   - How many ward options do you see?');
  console.log('   - What happens when you manually select different wards?');
  console.log('');
  console.log('2. OVERVIEW TAB CONTENT:');
  console.log('   - Do you see an "Executive Summary" section?');
  console.log('   - Are there any charts, graphs, or data visualizations?');
  console.log('   - What specific data/metrics are displayed?');
  console.log('   - Are there any error messages or missing data indicators?');
  console.log('');
  console.log('3. OVERALL FUNCTIONALITY:');
  console.log('   - Does the page look professionally formatted?');
  console.log('   - Are all elements loading properly?');
  console.log('   - Any JavaScript errors in browser console?');
  console.log('');
  console.log('💬 Please describe what you observe and any issues!');
  console.log('⌨️  Browser will stay open - Press Ctrl+C when done');
  
  // Keep browser open for manual inspection
  try {
    await page.waitForTimeout(600000); // 10 minutes
  } catch (e) {
    // User interrupted or timeout
  }
  
  await browser.close();
  console.log('✅ Test session completed');
})().catch(console.error);
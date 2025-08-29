import { chromium } from 'playwright';

(async () => {
  console.log('🤝 Starting Manual Collaboration Test Session');
  console.log('=============================================');
  console.log('This browser will stay open for manual testing collaboration');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const page = await browser.newPage();
  
  // Set up monitoring
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
  
  console.log('🚀 Opening LokDarpan application...');
  await page.goto('http://localhost:5176');
  await page.waitForTimeout(2000);
  
  console.log('🔑 Performing automatic login...');
  await page.fill('input[type="text"]', 'ashish');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  console.log('✅ Login completed - Dashboard should now be visible');
  console.log('');
  console.log('🔍 MANUAL TESTING GUIDE:');
  console.log('========================');
  console.log('');
  console.log('1. NAVIGATION TABS - Check each tab:');
  console.log('   - Overview/Dashboard tab');
  console.log('   - Analytics tab');
  console.log('   - Geographic/Map tab');
  console.log('   - Political Strategist tab');
  console.log('   - Timeline tab');
  console.log('');
  console.log('2. WARD SELECTION - Test dropdown:');
  console.log('   - Click ward dropdown');
  console.log('   - Select different wards');
  console.log('   - Verify data updates for each ward');
  console.log('');
  console.log('3. DATA VISUALIZATION - Look for:');
  console.log('   - Charts (line, bar, pie, etc.)');
  console.log('   - Maps with ward boundaries');
  console.log('   - Data tables');
  console.log('   - Sentiment indicators');
  console.log('');
  console.log('4. INTERACTIVE FEATURES - Test:');
  console.log('   - Hover effects on charts');
  console.log('   - Click interactions');
  console.log('   - Filter controls');
  console.log('   - Search functionality');
  console.log('');
  console.log('5. ERROR CHECKING - Watch for:');
  console.log('   - Red error messages');
  console.log('   - Broken images');
  console.log('   - Loading states that never complete');
  console.log('   - Console errors (watch this terminal)');
  
  // Perform quick automated checks and report
  console.log('');
  console.log('🤖 AUTOMATED FINDINGS:');
  console.log('======================');
  
  const quickChecks = await page.evaluate(() => {
    return {
      title: document.title,
      hasSelect: document.querySelectorAll('select').length,
      hasButtons: document.querySelectorAll('button').length,
      hasCanvas: document.querySelectorAll('canvas').length,
      hasSVG: document.querySelectorAll('svg').length,
      hasImages: document.querySelectorAll('img').length,
      hasLinks: document.querySelectorAll('a').length,
      hasTables: document.querySelectorAll('table').length,
      bodyTextLength: document.body.textContent.length,
      hasErrorElements: document.querySelectorAll('.error, [class*="error"]').length
    };
  });
  
  console.log(`📄 Page Title: ${quickChecks.title}`);
  console.log(`🎛️  Interactive Elements:`);
  console.log(`   - Dropdowns: ${quickChecks.hasSelect}`);
  console.log(`   - Buttons: ${quickChecks.hasButtons}`);
  console.log(`   - Links: ${quickChecks.hasLinks}`);
  console.log(`📊 Data Visualization:`);
  console.log(`   - Canvas charts: ${quickChecks.hasCanvas}`);
  console.log(`   - SVG graphics: ${quickChecks.hasSVG}`);
  console.log(`   - Images: ${quickChecks.hasImages}`);
  console.log(`   - Tables: ${quickChecks.hasTables}`);
  console.log(`📝 Content: ${quickChecks.bodyTextLength} characters`);
  console.log(`🚨 Errors: ${quickChecks.hasErrorElements} error elements found`);
  
  console.log('');
  console.log('🕒 Browser will stay open for manual testing...');
  console.log('📍 You can now manually test all features in the browser');
  console.log('💬 Describe what you find and I\'ll help investigate specific issues');
  console.log('⌨️  Press Ctrl+C in terminal when done testing');
  
  // Keep running for manual testing
  try {
    await page.waitForTimeout(600000); // 10 minutes max
  } catch (error) {
    console.log('⏰ Session timeout or interruption');
  }
  
  await browser.close();
  console.log('✅ Manual testing session completed');
})().catch(console.error);
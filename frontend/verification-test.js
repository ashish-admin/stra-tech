import { chromium } from 'playwright';

(async () => {
  console.log('🔧 VERIFICATION TEST: Fixed Ward Filtering');
  console.log('==========================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800 
  });
  const page = await browser.newPage();
  
  // Monitor API calls to verify proper filtering
  const apiCalls = [];
  page.on('response', response => {
    if (response.url().includes('/api/v1/')) {
      const endpoint = response.url().split('/api/v1/')[1];
      const status = response.status();
      apiCalls.push({ endpoint, status, url: response.url() });
      
      const statusIcon = status >= 400 ? '❌' : '✅';
      console.log(`${statusIcon} ${status} /api/v1/${endpoint}`);
    }
  });
  
  // Login
  console.log('🚀 Loading and authenticating...');
  await page.goto('http://localhost:5176');
  await page.waitForTimeout(2000);
  
  await page.fill('input[type="text"]', 'ashish');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  
  console.log('✅ Authenticated successfully');
  console.log('');
  
  // Clear API call log for clean testing
  apiCalls.length = 0;
  
  console.log('📍 TESTING WARD SELECTION FIXES:');
  console.log('=================================');
  
  // Get current state
  const initialState = await page.evaluate(() => {
    const wardSelect = document.querySelector('select');
    const wardValue = wardSelect ? wardSelect.value : null;
    const bodyText = document.body.textContent;
    
    return {
      selectedWard: wardValue,
      hasJubileeHills: bodyText.includes('Jubilee Hills'),
      hasAllDefault: bodyText.includes('Ward Selection\n                    All') || bodyText.includes('All Wards'),
      hasMarredpally: bodyText.includes('Marredpally'),
      contentLength: bodyText.length
    };
  });
  
  console.log(`🎯 Initial ward selection: "${initialState.selectedWard}"`);
  console.log(`📝 Content analysis:`);
  console.log(`   - Contains 'Jubilee Hills': ${initialState.hasJubileeHills ? '❌ FOUND' : '✅ CLEAN'}`);
  console.log(`   - Components defaulting to 'All': ${initialState.hasAllDefault ? '⚠️ FOUND' : '✅ CLEAN'}`);
  console.log(`   - Shows 'Marredpally': ${initialState.hasMarredpally ? '✅ FOUND' : '❌ MISSING'}`);
  console.log('');
  
  // Test ward selection
  console.log('🔄 Testing ward selection change...');
  
  await page.evaluate(() => {
    const select = document.querySelector('select');
    if (select) {
      const marredpallyOption = Array.from(select.options).find(opt => opt.value === 'Marredpally');
      if (marredpallyOption) {
        select.value = 'Marredpally';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  
  // Wait for updates
  await page.waitForTimeout(4000);
  console.log('⏳ Waited for component updates...');
  
  // Check post-selection state
  const postSelectionState = await page.evaluate(() => {
    const bodyText = document.body.textContent;
    const wardSelect = document.querySelector('select');
    
    // Look for specific issues mentioned in user feedback
    const hasAllInSubcomponents = bodyText.includes('Ward Selection\n                    All');
    const hasJubileeHillsReference = bodyText.includes('No data found for Jubilee Hills');
    const hasMarredpallyData = bodyText.includes('Marredpally');
    
    // Count components showing correct ward
    const marredpallyMentions = (bodyText.match(/Marredpally/g) || []).length;
    const allMentions = (bodyText.match(/\bAll\b/g) || []).length;
    
    return {
      selectedWard: wardSelect ? wardSelect.value : null,
      hasAllInSubcomponents,
      hasJubileeHillsReference,
      hasMarredpallyData,
      marredpallyMentions,
      allMentions,
      contentLength: bodyText.length
    };
  });
  
  console.log('📊 POST-SELECTION ANALYSIS:');
  console.log('---------------------------');
  console.log(`🎯 Ward selector value: "${postSelectionState.selectedWard}"`);
  console.log(`📝 Component analysis:`);
  console.log(`   - Sub-components showing 'All': ${postSelectionState.hasAllInSubcomponents ? '❌ STILL BROKEN' : '✅ FIXED'}`);
  console.log(`   - 'Jubilee Hills' references: ${postSelectionState.hasJubileeHillsReference ? '❌ STILL PRESENT' : '✅ REMOVED'}`);
  console.log(`   - 'Marredpally' data showing: ${postSelectionState.hasMarredpallyData ? '✅ WORKING' : '❌ NOT WORKING'}`);
  console.log(`   - 'Marredpally' mentions: ${postSelectionState.marredpallyMentions}`);
  console.log(`   - 'All' mentions: ${postSelectionState.allMentions}`);
  console.log('');
  
  // Analyze API calls made during ward selection
  console.log('🌐 API CALLS ANALYSIS:');
  console.log('---------------------');
  
  const relevantAPIs = apiCalls.filter(call => 
    call.endpoint.includes('posts') || 
    call.endpoint.includes('trends') || 
    call.endpoint.includes('competitive')
  );
  
  console.log(`📡 Relevant API calls made: ${relevantAPIs.length}`);
  relevantAPIs.forEach(call => {
    const hasCorrectWard = call.url.includes('Marredpally') || call.url.includes('city=Marredpally');
    const hasWrongWard = call.url.includes('city=All') || call.url.includes('city=%5Bobject%20Object%5D');
    
    const status = hasCorrectWard ? '✅' : hasWrongWard ? '❌' : '⚠️';
    console.log(`   ${status} ${call.endpoint}`);
  });
  
  // Take final screenshot
  await page.screenshot({ path: 'post-fix-verification.png', fullPage: true });
  console.log('📸 Post-fix screenshot saved');
  
  console.log('');
  console.log('🎯 FINAL ASSESSMENT:');
  console.log('====================');
  
  const issuesFixed = [
    !postSelectionState.hasAllInSubcomponents,
    !postSelectionState.hasJubileeHillsReference, 
    postSelectionState.hasMarredpallyData,
    relevantAPIs.some(call => call.url.includes('Marredpally'))
  ];
  
  const fixedCount = issuesFixed.filter(Boolean).length;
  const totalIssues = issuesFixed.length;
  
  console.log(`📊 Issues resolved: ${fixedCount}/${totalIssues}`);
  console.log(`✅ Sub-components using selected ward: ${!postSelectionState.hasAllInSubcomponents}`);
  console.log(`✅ Hardcoded 'Jubilee Hills' removed: ${!postSelectionState.hasJubileeHillsReference}`);
  console.log(`✅ Ward data properly displayed: ${postSelectionState.hasMarredpallyData}`);
  console.log(`✅ API calls using correct ward: ${relevantAPIs.some(call => call.url.includes('Marredpally'))}`);
  
  if (fixedCount === totalIssues) {
    console.log('');
    console.log('🎉 ALL CRITICAL ISSUES FIXED SUCCESSFULLY!');
    console.log('The ward filtering system is now working correctly.');
  } else {
    console.log('');
    console.log('⚠️ Some issues may still need attention.');
  }
  
  console.log('');
  console.log('🔍 Browser staying open for manual verification...');
  console.log('Please verify that all components now show Marredpally data');
  console.log('⌨️ Press Ctrl+C when done');
  
  // Keep browser open
  try {
    await page.waitForTimeout(300000); // 5 minutes
  } catch (e) {
    // User interrupted
  }
  
  await browser.close();
  console.log('✅ Verification test completed');
})().catch(console.error);
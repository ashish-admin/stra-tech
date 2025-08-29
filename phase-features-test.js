// Test for Phase 3-5 Features in LokDarpan Dashboard
const { chromium } = require('playwright');

async function testPhaseFeatures() {
  console.log('🔍 TESTING PHASE 3-5 FEATURES');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  try {
    console.log('📍 Loading application...');
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(3000);
    
    // Login if needed
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible({ timeout: 3000 })) {
      console.log('🔐 Logging in...');
      await page.fill('input[name="username"], input[type="text"]', 'ashish');
      await page.fill('input[name="password"], input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    console.log('\n🔍 CHECKING PHASE 3 FEATURES (Political Strategist):');
    
    // Look for Political Strategist components
    const strategistElements = await page.locator('[class*="strategist"], [class*="Strategist"], [data-testid*="strategist"]').all();
    console.log(`  → Found ${strategistElements.length} Strategist elements`);
    
    // Check for SSE streaming indicators
    const sseIndicators = await page.locator('[class*="connection"], [class*="streaming"], [class*="sse"]').all();
    console.log(`  → Found ${sseIndicators.length} SSE/streaming indicators`);
    
    // Check for AI analysis components
    const aiElements = await page.locator('[class*="analysis"], [class*="intelligence"], [class*="ai-"]').all();
    console.log(`  → Found ${aiElements.length} AI/Intelligence elements`);
    
    console.log('\n🔍 CHECKING PHASE 4 FEATURES (Enhanced Components):');
    
    // Check for enhanced error boundaries
    const errorBoundaries = await page.locator('[class*="error-boundary"], [class*="ErrorBoundary"]').all();
    console.log(`  → Found ${errorBoundaries.length} Error Boundary components`);
    
    // Check for enhanced visualizations
    const enhancedCharts = await page.locator('[class*="heatmap"], [class*="SentimentHeatmap"], canvas').all();
    console.log(`  → Found ${enhancedCharts.length} Enhanced visualization components`);
    
    // Check for accessibility features
    const accessibilityElements = await page.locator('[aria-label], [role="navigation"], [class*="accessibility"]').all();
    console.log(`  → Found ${accessibilityElements.length} Accessibility elements`);
    
    console.log('\n🔍 CHECKING PHASE 5 FEATURES (Consolidated Dashboard):');
    
    // Check for Executive Summary (5-card layout)
    const executiveSummary = await page.locator('[class*="executive"], [class*="Executive"], [class*="summary-card"]').all();
    console.log(`  → Found ${executiveSummary.length} Executive Summary elements`);
    
    // Check for consolidated tabs
    const tabs = await page.locator('[role="tab"], button[class*="tab"], [class*="Tab"]').all();
    console.log(`  → Found ${tabs.length} Tab elements`);
    
    // Check for lazy loading components
    const lazyComponents = await page.locator('[class*="lazy"], [class*="Lazy"]').all();
    console.log(`  → Found ${lazyComponents.length} Lazy-loaded components`);
    
    console.log('\n📋 CHECKING HTML STRUCTURE:');
    
    // Get page title and check for key elements
    const pageTitle = await page.title();
    console.log(`  → Page title: ${pageTitle}`);
    
    // Check for main dashboard container
    const dashboardContainer = await page.locator('[class*="dashboard"], [class*="Dashboard"]').first();
    if (await dashboardContainer.isVisible()) {
      const dashboardClasses = await dashboardContainer.getAttribute('class');
      console.log(`  → Dashboard classes: ${dashboardClasses?.substring(0, 100)}...`);
    }
    
    // Check for ward selector
    const wardSelector = await page.locator('select, [class*="ward-select"]').first();
    if (await wardSelector.isVisible()) {
      console.log('  → Ward selector: ✅ Found');
    }
    
    console.log('\n🔍 CHECKING COMPONENT VISIBILITY:');
    
    // Test tab clicking to reveal Phase 3-5 features
    const tabButtons = await page.locator('button').all();
    for (const button of tabButtons) {
      const text = await button.textContent();
      if (text && (text.includes('Strategist') || text.includes('Analytics') || text.includes('Timeline'))) {
        console.log(`  → Found tab: "${text}"`);
        try {
          await button.click();
          await page.waitForTimeout(2000);
          
          // Check what loaded after clicking
          const newElements = await page.locator('[class*="strategist"], [class*="timeline"], [class*="analytics"]').all();
          if (newElements.length > 0) {
            console.log(`    ✅ Tab loaded ${newElements.length} new components`);
          }
        } catch (e) {
          console.log(`    ⚠️ Could not click tab: ${e.message}`);
        }
      }
    }
    
    console.log('\n📊 CONSOLE LOG ANALYSIS:');
    const errors = consoleLogs.filter(log => log.includes('[error]'));
    const warnings = consoleLogs.filter(log => log.includes('[warning]'));
    console.log(`  → Errors: ${errors.length}`);
    console.log(`  → Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERROR DETAILS:');
      errors.slice(0, 5).forEach(err => console.log(`  ${err}`));
    }
    
    // Take diagnostic screenshot
    await page.screenshot({ 
      path: 'phase-features-diagnostic.png',
      fullPage: true 
    });
    console.log('\n📸 Diagnostic screenshot saved: phase-features-diagnostic.png');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

console.log('🚀 PHASE 3-5 FEATURE DETECTION TEST');
testPhaseFeatures()
  .then(() => console.log('\n✅ Test complete'))
  .catch(err => console.error('❌ Test failed:', err.message));
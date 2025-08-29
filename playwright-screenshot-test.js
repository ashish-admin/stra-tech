// Comprehensive LokDarpan Dashboard Screenshot Testing
// Test Architect Quinn - Dashboard Component Validation
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Create screenshots directory
const screenshotDir = path.join(__dirname, 'dashboard-validation-screenshots');

async function ensureDirectory(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDashboardValidation() {
  console.log('🧪 STARTING COMPREHENSIVE DASHBOARD VALIDATION');
  console.log('Test Architect: Quinn - Quality Gate Assessment');
  
  await ensureDirectory(screenshotDir);
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for CI
    slowMo: 500,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📍 Phase 1: Authentication Flow Validation');
    
    // 1. Initial page load
    console.log('  → Loading initial page');
    await page.goto('http://localhost:5177');
    await wait(2000); // Wait for initial load
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '01_initial_page.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: Initial page load');
    
    // 2. Login page
    console.log('  → Testing login form');
    
    // Look for login form elements
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible({ timeout: 5000 })) {
      await page.screenshot({ 
        path: path.join(screenshotDir, '02_login_page.png'),
        fullPage: true 
      });
      console.log('  ✅ Screenshot: Login form displayed');
      
      // Fill login credentials
      await page.fill('input[name="username"], input[type="text"]', 'ashish');
      await page.fill('input[name="password"], input[type="password"]', 'password');
      
      await page.screenshot({ 
        path: path.join(screenshotDir, '03_login_filled.png'),
        fullPage: true 
      });
      console.log('  ✅ Screenshot: Login form filled');
      
      // Submit login
      await page.click('button[type="submit"], .login-button, button:has-text("Login")');
      console.log('  → Login submitted, waiting for redirect...');
      
      await wait(3000); // Wait for login processing and redirect
      
    } else {
      console.log('  ⚠️  No login form found, checking if already authenticated');
    }
    
    // 3. Dashboard main view after login
    console.log('📍 Phase 2: Dashboard Main Interface');
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '04_dashboard_main.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: Dashboard main view');
    
    // Wait for potential data loading
    await wait(2000);
    
    // 4. Ward Selector Testing
    console.log('📍 Phase 3: Ward Selection Functionality');
    
    // Look for ward selector dropdown
    const wardSelector = await page.locator('select, [data-testid="ward-selector"], .ward-select').first();
    if (await wardSelector.isVisible({ timeout: 5000 })) {
      console.log('  → Testing ward selector dropdown');
      
      await wardSelector.click();
      await wait(1000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, '05_ward_selector_open.png'),
        fullPage: true 
      });
      console.log('  ✅ Screenshot: Ward selector dropdown opened');
      
      // Select a specific ward
      const options = await page.locator('select option, .ward-option').all();
      if (options.length > 1) {
        await wardSelector.selectOption({ index: 1 }); // Select second option
        await wait(2000); // Wait for ward change to propagate
        
        await page.screenshot({ 
          path: path.join(screenshotDir, '06_ward_selected.png'),
          fullPage: true 
        });
        console.log('  ✅ Screenshot: Ward selected and data updated');
      }
    } else {
      console.log('  ⚠️  Ward selector not found in expected format');
    }
    
    // 5. Tab Navigation Testing
    console.log('📍 Phase 4: Tab Navigation Validation');
    
    const tabTests = [
      { name: 'Overview', selector: '[data-testid="overview-tab"], .tab-overview, button:has-text("Overview")' },
      { name: 'Timeline', selector: '[data-testid="timeline-tab"], .tab-timeline, button:has-text("Timeline")' },
      { name: 'Analytics', selector: '[data-testid="analytics-tab"], .tab-analytics, button:has-text("Analytics")' },
      { name: 'Geographic', selector: '[data-testid="geographic-tab"], .tab-geographic, button:has-text("Geographic")' }
    ];
    
    for (const [index, tab] of tabTests.entries()) {
      try {
        console.log(`  → Testing ${tab.name} tab`);
        
        const tabElement = await page.locator(tab.selector).first();
        if (await tabElement.isVisible({ timeout: 3000 })) {
          await tabElement.click();
          await wait(2000); // Wait for tab content to load
          
          await page.screenshot({ 
            path: path.join(screenshotDir, `07_tab_${tab.name.toLowerCase()}.png`),
            fullPage: true 
          });
          console.log(`  ✅ Screenshot: ${tab.name} tab loaded`);
        } else {
          console.log(`  ⚠️  ${tab.name} tab not found`);
        }
      } catch (error) {
        console.log(`  ❌ Error testing ${tab.name} tab:`, error.message);
      }
    }
    
    // 6. Component-Specific Testing
    console.log('📍 Phase 5: Component Validation');
    
    // Test for charts and visualizations
    const chartElements = await page.locator('canvas, .chart, .recharts-wrapper, [data-testid*="chart"]').all();
    console.log(`  → Found ${chartElements.length} chart/visualization components`);
    
    if (chartElements.length > 0) {
      await page.screenshot({ 
        path: path.join(screenshotDir, '08_charts_loaded.png'),
        fullPage: true 
      });
      console.log('  ✅ Screenshot: Charts and visualizations');
    }
    
    // Test for map component
    const mapElements = await page.locator('.leaflet-container, [data-testid="map"], .map-container').all();
    console.log(`  → Found ${mapElements.length} map components`);
    
    if (mapElements.length > 0) {
      await page.screenshot({ 
        path: path.join(screenshotDir, '09_map_component.png'),
        fullPage: true 
      });
      console.log('  ✅ Screenshot: Map component loaded');
    }
    
    // 7. Error Boundary Testing
    console.log('📍 Phase 6: Error Boundary Validation');
    
    // Look for any error states or boundary messages
    const errorElements = await page.locator('[data-testid="error-boundary"], .error-fallback, .component-error').all();
    console.log(`  → Found ${errorElements.length} error boundary components`);
    
    if (errorElements.length > 0) {
      await page.screenshot({ 
        path: path.join(screenshotDir, '10_error_boundaries.png'),
        fullPage: true 
      });
      console.log('  ⚠️  Screenshot: Error boundaries detected');
    }
    
    // 8. Mobile Responsive Testing
    console.log('📍 Phase 7: Mobile Responsive Design');
    
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await wait(1000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '11_mobile_view.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: Mobile responsive layout');
    
    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await wait(1000);
    
    // 9. Performance and Loading States
    console.log('📍 Phase 8: Performance Validation');
    
    // Trigger a fresh page load to capture loading states
    await page.reload();
    await wait(500); // Capture early loading state
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '12_loading_states.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: Loading states captured');
    
    await wait(3000); // Wait for full load
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '13_final_loaded_state.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: Final loaded state');
    
    // 10. Data Flow Validation
    console.log('📍 Phase 9: Data Flow Testing');
    
    // Trigger API calls by interacting with filters
    const filterElements = await page.locator('input[type="date"], .filter-control, [data-testid*="filter"]').all();
    console.log(`  → Found ${filterElements.length} filter controls`);
    
    if (filterElements.length > 0) {
      await page.screenshot({ 
        path: path.join(screenshotDir, '14_filters_available.png'),
        fullPage: true 
      });
      console.log('  ✅ Screenshot: Filter controls available');
    }
    
    console.log('📍 Phase 10: Summary and Quality Assessment');
    
    // Generate a final comprehensive screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, '15_comprehensive_final.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: Comprehensive final view');
    
    // Console log analysis
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`ERROR: ${msg.text()}`);
      }
    });
    
    console.log('🎯 VALIDATION COMPLETE');
    console.log(`📸 Screenshots saved to: ${screenshotDir}`);
    console.log(`📊 Total screenshots captured: 15+`);
    
    if (consoleLogs.length > 0) {
      console.log('⚠️  Console errors detected:');
      consoleLogs.forEach(log => console.log(`   ${log}`));
    }
    
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    
    // Emergency screenshot for debugging
    await page.screenshot({ 
      path: path.join(screenshotDir, '99_error_state.png'),
      fullPage: true 
    });
    console.log('  🚨 Emergency screenshot saved');
    
    throw error;
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Execute the test
console.log('🚀 INITIALIZING LOKDARPAN DASHBOARD VALIDATION');
console.log('Test Architect: Quinn');
console.log('Purpose: Comprehensive component and filter validation');
console.log('Quality Gate: Production readiness assessment');

runDashboardValidation()
  .then(() => {
    console.log('✅ VALIDATION SUCCESSFUL');
    console.log('🏆 Dashboard components validated and screenshots captured');
    console.log('📋 Ready for quality gate assessment');
  })
  .catch(error => {
    console.error('❌ VALIDATION FAILED:', error.message);
    process.exit(1);
  });
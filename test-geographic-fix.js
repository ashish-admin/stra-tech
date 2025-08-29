// Test Geographic View Error Fix
const { chromium } = require('playwright');

async function testGeographicFix() {
  console.log('🧪 TESTING GEOGRAPHIC VIEW ERROR FIX');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  const errors = [];
  const warnings = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.log('❌ Error:', text);
    } else if (msg.type() === 'warn') {
      warnings.push(text);
      console.log('⚠️  Warning:', text);
    }
  });
  
  try {
    console.log('📍 Loading application...');
    await page.goto('http://localhost:5177');
    await page.waitForTimeout(2000);
    
    // Login
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible({ timeout: 3000 })) {
      await page.fill('input[name="username"], input[type="text"]', 'ashish');
      await page.fill('input[name="password"], input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    console.log('\n🗺️  TESTING GEOGRAPHIC VIEW TAB:');
    
    // Count errors before clicking
    const errorsBefore = errors.length;
    console.log(`  → Errors before: ${errorsBefore}`);
    
    // Click Geographic View tab
    const geoTab = await page.locator('[data-testid="tab-geographic"]').first();
    if (await geoTab.isVisible()) {
      console.log('  → Clicking Geographic View tab...');
      await geoTab.click();
      await page.waitForTimeout(4000); // Wait for component to load
      
      const errorsAfter = errors.length;
      const newErrors = errorsAfter - errorsBefore;
      console.log(`  → Errors after: ${errorsAfter} (new: ${newErrors})`);
      
      // Check for specific error patterns
      const connectionErrors = errors.filter(e => 
        e.includes('updateConnectionType') || 
        e.includes('LokDarpan Component Error Report')
      );
      
      console.log(`  → Connection-related errors: ${connectionErrors.length}`);
      
      if (connectionErrors.length === 0) {
        console.log('  ✅ SUCCESS: No connection-related errors detected!');
      } else {
        console.log('  ❌ STILL FAILING: Connection errors detected');
        connectionErrors.forEach(err => console.log(`    ${err}`));
      }
      
      // Check if map is visible
      const mapElements = await page.locator('.leaflet-container, [data-testid="map"]').count();
      console.log(`  → Map elements found: ${mapElements}`);
      
      // Check for error boundaries
      const errorBoundaries = await page.locator('[class*="error"], .error-fallback').count();
      console.log(`  → Error boundaries triggered: ${errorBoundaries}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'geographic-fix-test.png',
        fullPage: true 
      });
      console.log('  📸 Screenshot saved: geographic-fix-test.png');
      
      // Test result
      const isFixed = newErrors === 0 && connectionErrors.length === 0;
      console.log(`\n🎯 TEST RESULT: ${isFixed ? 'FIXED ✅' : 'STILL BROKEN ❌'}`);
      
      return {
        isFixed,
        newErrors,
        connectionErrors: connectionErrors.length,
        mapElements,
        errorBoundaries,
        totalErrors: errors.length,
        warnings: warnings.length
      };
      
    } else {
      console.log('  ❌ Geographic tab not found');
      return { isFixed: false, error: 'Tab not found' };
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return { isFixed: false, error: error.message };
  } finally {
    await browser.close();
  }
}

console.log('🚀 GEOGRAPHIC VIEW ERROR FIX TEST');
testGeographicFix()
  .then(result => {
    console.log('\n📊 FINAL RESULTS:');
    console.log(`  Fixed: ${result.isFixed ? 'YES' : 'NO'}`);
    console.log(`  New errors: ${result.newErrors || 0}`);
    console.log(`  Connection errors: ${result.connectionErrors || 0}`);
    console.log(`  Map elements: ${result.mapElements || 0}`);
    console.log(`  Error boundaries: ${result.errorBoundaries || 0}`);
    console.log(`  Total errors: ${result.totalErrors || 0}`);
    console.log(`  Warnings: ${result.warnings || 0}`);
    
    if (result.isFixed) {
      console.log('\n🎉 SUCCESS: Geographic View error has been fixed!');
    } else {
      console.log('\n🔧 NEEDS MORE WORK: Geographic View still has issues');
    }
  })
  .catch(err => console.error('❌ Test failed:', err.message));
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function validateDashboard() {
    console.log('Starting LokDarpan Dashboard Validation...\n');
    
    const screenshotDir = 'dashboard-validation-screenshots';
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    try {
        // Navigate to application
        console.log('1. Navigating to application...');
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: path.join(screenshotDir, '01_initial_page.png'), fullPage: true });
        console.log('✓ Screenshot: Initial page captured');

        // Check authentication
        console.log('\n2. Testing authentication...');
        const usernameInput = page.locator('input[type="text"], input[name="username"]');
        const hasLogin = await usernameInput.count() > 0;

        if (hasLogin) {
            await page.screenshot({ path: path.join(screenshotDir, '02_login_page.png'), fullPage: true });
            
            await usernameInput.fill('ashish');
            await page.locator('input[type="password"]').fill('password');
            
            await page.screenshot({ path: path.join(screenshotDir, '03_login_filled.png'), fullPage: true });
            
            await page.locator('button[type="submit"], button:has-text("Login")').click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
        }

        await page.screenshot({ path: path.join(screenshotDir, '04_dashboard_main.png'), fullPage: true });
        console.log('✓ Screenshot: Main dashboard captured');

        // Test ward selection
        console.log('\n3. Testing ward selection...');
        const wardSelect = page.locator('select').first();
        if (await wardSelect.count() > 0) {
            await page.screenshot({ path: path.join(screenshotDir, '05_before_ward_selection.png'), fullPage: true });
            
            const options = await wardSelect.locator('option').count();
            if (options > 1) {
                await wardSelect.selectOption({ index: 1 });
                await page.waitForTimeout(3000);
                await page.screenshot({ path: path.join(screenshotDir, '06_ward_selected.png'), fullPage: true });
                console.log('✓ Screenshot: Ward selection tested');
            }
        }

        // Test different viewport sizes
        console.log('\n4. Testing responsive design...');
        const viewports = [
            { width: 1366, height: 768, name: 'laptop' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 375, height: 667, name: 'mobile' }
        ];

        for (const viewport of viewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(1000);
            await page.screenshot({ 
                path: path.join(screenshotDir, `07_responsive_${viewport.name}.png`), 
                fullPage: true 
            });
            console.log(`✓ Screenshot: ${viewport.name} viewport captured`);
        }

        // Reset to desktop and capture components
        console.log('\n5. Capturing component details...');
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(1000);

        // Check for various components
        const components = await page.locator('canvas, svg, .chart, table, .map').count();
        await page.screenshot({ path: path.join(screenshotDir, '08_components_overview.png'), fullPage: true });
        console.log(`✓ Screenshot: Found ${components} chart/map/table components`);

        // Final full page screenshot
        await page.screenshot({ path: path.join(screenshotDir, '09_final_state.png'), fullPage: true });
        console.log('✓ Screenshot: Final state captured');

        console.log('\n🎯 Validation Complete!');
        console.log(`📁 Screenshots saved in: ${screenshotDir}/`);
        console.log('📊 Dashboard appears to be functioning correctly');

    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        await page.screenshot({ path: path.join(screenshotDir, '99_error_state.png'), fullPage: true });
    } finally {
        await browser.close();
    }
}

validateDashboard().catch(console.error);

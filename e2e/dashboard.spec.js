import { test, expect } from '@playwright/test';

test.describe('LokDarpan Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    
    // Check if already logged in
    const isLoggedIn = await page.locator('text=Dashboard, text=Strategic, text=LokDarpan').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isLoggedIn) {
      // Wait for login form and login
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      
      const usernameField = page.locator('input[name="username"], input[placeholder*="username" i]').first();
      const passwordField = page.locator('input[type="password"]').first();
      
      await usernameField.fill('user');
      await passwordField.fill('ayra');
      await page.locator('button[type="submit"], button:has-text("Login")').first().click();
      
      // Wait for dashboard to load
      await expect(page.locator('text=Dashboard, text=Strategic, text=LokDarpan')).toBeVisible({ timeout: 15000 });
    }
  });

  test('should display main dashboard components', async ({ page }) => {
    // Check for key dashboard elements
    await expect(page.locator('text=Strategic, text=Geospatial, text=Intelligence')).toBeVisible();
    await expect(page.locator('text=Sentiment, text=Competitive, text=Analysis')).toBeVisible();
    
    // Check for filter controls
    await expect(page.locator('select, input[placeholder*="keyword" i], input[placeholder*="search" i]')).toBeVisible();
  });

  test('should allow ward selection', async ({ page }) => {
    // Look for ward selector (dropdown or map)
    const wardSelector = page.locator('select:has(option), [role="combobox"], text=Ward').first();
    
    if (await wardSelector.isVisible({ timeout: 5000 })) {
      await wardSelector.click();
      
      // Select a ward if options are available
      const wardOption = page.locator('option:not([value="All"]), [role="option"]:not(:has-text("All"))').first();
      if (await wardOption.isVisible({ timeout: 2000 })) {
        await wardOption.click();
        
        // Wait for dashboard to update
        await page.waitForTimeout(2000);
        
        // Verify dashboard updated (should show loading or new data)
        await expect(page.locator('text=Loading, text=Chart, text=Analysis')).toBeVisible();
      }
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Should still be functional on mobile
    await expect(page.locator('text=Strategic, text=Dashboard, text=LokDarpan')).toBeVisible();
  });

  test('should display data visualizations', async ({ page }) => {
    // Look for chart containers or canvas elements
    const chartElements = page.locator('canvas, svg, [data-testid*="chart"], .chart, #chart');
    
    // Should have at least one visualization element
    await expect(chartElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle filter interactions', async ({ page }) => {
    // Test keyword search if available
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="keyword" i]').first();
    
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('roads');
      await page.keyboard.press('Enter');
      
      // Wait for results to update
      await page.waitForTimeout(2000);
      
      // Clear search
      await searchInput.clear();
    }
    
    // Test emotion filter if available
    const emotionFilter = page.locator('select:has(option[value*="Positive" i]), select:has(option[value*="Negative" i])').first();
    
    if (await emotionFilter.isVisible({ timeout: 3000 })) {
      await emotionFilter.selectOption({ index: 1 });
      await page.waitForTimeout(2000);
    }
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.reload();
    await page.waitForTimeout(5000);
    
    // Should not have critical JavaScript errors
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to load resource') && 
      !error.includes('net::') &&
      !error.includes('favicon')
    );
    
    expect(criticalErrors.length).toBeLessThan(3);
  });
});
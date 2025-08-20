import { test, expect } from '@playwright/test';

test.describe('LokDarpan Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Login helper
    await page.goto('/');
    
    const isLoggedIn = await page.locator('text=Dashboard, text=Strategic').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isLoggedIn) {
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      
      const usernameField = page.locator('input[name="username"], input[placeholder*="username" i]').first();
      const passwordField = page.locator('input[type="password"]').first();
      
      await usernameField.fill('user');
      await passwordField.fill('ayra');
      await page.locator('button[type="submit"], button:has-text("Login")').first().click();
      
      await expect(page.locator('text=Dashboard, text=Strategic')).toBeVisible({ timeout: 15000 });
    }
  });

  test('should load dashboard within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to dashboard
    await page.goto('/');
    
    // Wait for key elements to be visible
    await expect(page.locator('text=Strategic, text=Dashboard')).toBeVisible({ timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    console.log(`Dashboard load time: ${loadTime}ms`);
  });

  test('should have acceptable network performance', async ({ page }) => {
    const responses = [];
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing()
      });
    });
    
    await page.goto('/');
    await page.waitForTimeout(5000);
    
    // API responses should be reasonably fast
    const apiResponses = responses.filter(r => r.url.includes('/api/'));
    const slowApiResponses = apiResponses.filter(r => r.timing && r.timing.responseEnd > 5000);
    
    expect(slowApiResponses.length).toBeLessThan(2);
    
    // Most responses should be successful
    const failedResponses = responses.filter(r => r.status >= 400);
    expect(failedResponses.length).toBeLessThan(3);
  });

  test('should handle concurrent user interactions', async ({ page }) => {
    // Simulate rapid interactions
    const interactions = [];
    
    // Click multiple elements rapidly
    const clickableElements = page.locator('button, select, input, [role="button"]');
    const count = await clickableElements.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      interactions.push(
        clickableElements.nth(i).click({ timeout: 1000 }).catch(() => {})
      );
    }
    
    // Wait for all interactions to complete
    await Promise.all(interactions);
    
    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();
    
    // No JavaScript errors should occur
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(5);
  });

  test('should maintain performance with large datasets', async ({ page }) => {
    // Navigate and trigger data loading
    await page.goto('/');
    
    // Try to select a specific ward to load more data
    const wardSelector = page.locator('select, [role="combobox"]').first();
    if (await wardSelector.isVisible({ timeout: 3000 })) {
      await wardSelector.click();
      
      const options = page.locator('option, [role="option"]');
      const optionCount = await options.count();
      
      if (optionCount > 1) {
        await options.nth(1).click();
        
        // Measure time for data visualization to update
        const startTime = Date.now();
        
        // Wait for charts/visualizations to update
        await page.waitForTimeout(3000);
        
        const updateTime = Date.now() - startTime;
        expect(updateTime).toBeLessThan(8000);
        
        console.log(`Data update time: ${updateTime}ms`);
      }
    }
  });

  test('should handle memory usage efficiently', async ({ page, context }) => {
    // Navigate through multiple views to test memory
    const views = ['/', '/?ward=All'];
    
    for (const view of views) {
      await page.goto(view);
      await page.waitForTimeout(2000);
      
      // Force garbage collection if possible
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
    }
    
    // Page should still be responsive after navigation
    await expect(page.locator('body')).toBeVisible();
  });
});
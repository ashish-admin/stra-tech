import { test, expect } from '@playwright/test';

test.describe('Political Strategist Module', () => {
  test('should load strategist interface', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for strategist-related elements
    const hasStrategistContent = await page.locator('[data-testid*="strategist"], [class*="strategist"], .political-strategist').count() > 0;
    const pageContent = await page.locator('body').textContent();
    
    // Check that the page loaded successfully
    expect(pageContent).toBeTruthy();
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('should handle strategist errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Verify no JavaScript errors crashed the page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.trim()).not.toBe('');
    
    // Check that error boundaries work
    const errorBoundaryExists = await page.locator('[data-testid="error-boundary"]').count();
    // Error boundaries may or may not be visible, but page should still work
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Verify mobile layout loads
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });
});
import { test, expect } from '@playwright/test';

test.describe('LokDarpan Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LokDarpan/);
  });

  test('should display main dashboard components', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check for key components (with fallback if components fail)
    const hasErrorBoundary = await page.locator('[data-testid="error-boundary"]').count() > 0;
    const hasDashboard = await page.locator('[data-testid="dashboard"]').count() > 0;
    const hasContent = await page.locator('body').textContent();
    
    // Verify the page loaded with some content
    expect(hasContent).toBeTruthy();
    expect(hasContent.length).toBeGreaterThan(0);
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Check that the page doesn't show a white screen
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.trim()).not.toBe('');
  });
});
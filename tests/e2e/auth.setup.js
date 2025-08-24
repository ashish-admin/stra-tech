import { test as setup, expect } from '@playwright/test';

const authFile = './tests/e2e/.auth/user.json';

/**
 * Authentication setup for LokDarpan E2E tests
 * This setup runs once and saves authentication state for all tests
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/');
  
  // Wait for login form to load
  await page.waitForSelector('input[type="password"]', { timeout: 30000 });
  
  // Fill login credentials - using production validated credentials
  const usernameField = page.locator('input[name="username"], input[placeholder*="username" i]').first();
  const passwordField = page.locator('input[type="password"]').first();
  
  await usernameField.fill('ashish'); // Production validated username
  await passwordField.fill('password'); // Production validated password
  
  // Submit login form
  const loginButton = page.locator('button[type="submit"], button:has-text("Login")').first();
  await loginButton.click();
  
  // Wait for successful authentication and dashboard load
  await expect(page).toHaveURL(/dashboard|\/$/);
  
  // Verify authentication by checking for dashboard elements
  await expect(page.locator('text=Strategic, text=Geospatial, text=Intelligence').first()).toBeVisible({ timeout: 30000 });
  
  // Ensure API authentication is working
  await page.waitForLoadState('networkidle');
  
  // Wait for initial data load to complete
  await page.waitForTimeout(2000);
  
  // Save authenticated state
  await page.context().storageState({ path: authFile });
  
  console.log('✅ Authentication setup completed successfully');
});
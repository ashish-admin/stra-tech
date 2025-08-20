import { test, expect } from '@playwright/test';

test.describe('LokDarpan Authentication', () => {
  test('should display login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login or show login form
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Login')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[name="username"], input[placeholder*="username" i]', { timeout: 10000 });
    
    // Fill login form
    const usernameField = page.locator('input[name="username"], input[placeholder*="username" i]').first();
    const passwordField = page.locator('input[type="password"]').first();
    
    await usernameField.fill('user');
    await passwordField.fill('ayra');
    
    // Submit form
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click();
    
    // Should redirect to dashboard after successful login
    await expect(page.locator('text=Dashboard, text=LokDarpan, text=Strategic')).toBeVisible({ timeout: 15000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Wait for login form
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    
    // Fill with invalid credentials
    const usernameField = page.locator('input[name="username"], input[placeholder*="username" i]').first();
    const passwordField = page.locator('input[type="password"]').first();
    
    await usernameField.fill('invalid');
    await passwordField.fill('invalid');
    
    // Submit form
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click();
    
    // Should show error message
    await expect(page.locator('text=error, text=invalid, text=incorrect, text=failed')).toBeVisible({ timeout: 5000 });
  });
});
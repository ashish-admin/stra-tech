/**
 * E2E Test: Login Session Persistence
 * 
 * Tests the complete authentication flow:
 * 1. Login button click → POST /api/v1/login
 * 2. Session cookie persistence through Vite proxy
 * 3. Automatic status check → GET /api/v1/status 
 * 4. Dashboard loads with authenticated state
 */

import { test, expect } from '@playwright/test';

test.describe('Login Session Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
    await page.goto('http://localhost:5173');
  });

  test('complete login flow with session persistence', async ({ page }) => {
    // 1. Verify login page is displayed
    await expect(page.locator('h2')).toHaveText('Login');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // 2. Monitor network requests for session cookie analysis
    const loginRequest = page.waitForRequest(request => 
      request.url().includes('/api/v1/login') && request.method() === 'POST'
    );
    const loginResponse = page.waitForResponse(response => 
      response.url().includes('/api/v1/login') && response.status() === 200
    );
    const statusRequest = page.waitForRequest(request => 
      request.url().includes('/api/v1/status') && request.method() === 'GET'
    );
    const statusResponse = page.waitForResponse(response => 
      response.url().includes('/api/v1/status') && response.status() === 200
    );

    // 3. Fill login form and submit
    await page.fill('input[type="text"]', 'user');
    await page.fill('input[type="password"]', 'ayra');
    await page.click('button[type="submit"]');

    // 4. Wait for login request and verify response
    const loginReq = await loginRequest;
    const loginRes = await loginResponse;
    
    // Verify login request includes credentials
    expect(loginReq.headers()['content-type']).toContain('application/json');
    
    // Verify login response sets session cookie
    const setCookieHeader = loginRes.headers()['set-cookie'];
    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain('lokdarpan_session');
    expect(setCookieHeader).toContain('Domain=localhost');
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('SameSite=Lax');

    // 5. Wait for automatic status check and verify session persistence
    const statusReq = await statusRequest;
    const statusRes = await statusResponse;
    
    // Verify status request includes session cookie
    const cookieHeader = statusReq.headers()['cookie'];
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toContain('lokdarpan_session');
    
    // Verify status response indicates authentication
    const statusData = await statusRes.json();
    expect(statusData.authenticated).toBe(true);
    expect(statusData.user).toBeTruthy();
    expect(statusData.user.username).toBe('user');

    // 6. Verify dashboard loads with authenticated state
    await expect(page.locator('h1')).toHaveText('LokDarpan: Political War Room');
    await expect(page.locator('text=Signed in as user')).toBeVisible();
    
    // Verify ward selection component is visible (indicates full dashboard load)
    await expect(page.locator('select')).toBeVisible(); // Ward selector
    
    // 7. Test session persistence across page refresh
    await page.reload();
    
    // Should not show login page again
    await expect(page.locator('h2')).not.toHaveText('Login');
    await expect(page.locator('h1')).toHaveText('LokDarpan: Political War Room');
    await expect(page.locator('text=Signed in as user')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    // Fill invalid credentials
    await page.fill('input[type="text"]', 'invalid');
    await page.fill('input[type="password"]', 'wrong');
    
    // Monitor for 401 response
    const loginResponse = page.waitForResponse(response => 
      response.url().includes('/api/v1/login') && response.status() === 401
    );
    
    await page.click('button[type="submit"]');
    
    // Verify error response
    await loginResponse;
    
    // Verify error message is displayed
    await expect(page.locator('text=Invalid username or password')).toBeVisible();
    
    // Verify still on login page
    await expect(page.locator('h2')).toHaveText('Login');
  });

  test('session cookie domain and security attributes', async ({ page }) => {
    // Login to trigger session cookie
    await page.fill('input[type="text"]', 'user');
    await page.fill('input[type="password"]', 'ayra');
    
    const loginResponse = page.waitForResponse(response => 
      response.url().includes('/api/v1/login') && response.status() === 200
    );
    
    await page.click('button[type="submit"]');
    const response = await loginResponse;
    
    // Verify session cookie security attributes
    const setCookieHeader = response.headers()['set-cookie'];
    expect(setCookieHeader).toContain('lokdarpan_session');
    expect(setCookieHeader).toContain('Domain=localhost');  // Critical fix
    expect(setCookieHeader).toContain('HttpOnly');          // Security
    expect(setCookieHeader).toContain('SameSite=Lax');      // CSRF protection
    expect(setCookieHeader).not.toContain('Secure');        // Dev mode only
    
    // Verify cookie is accessible in browser context
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(cookie => cookie.name === 'lokdarpan_session');
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie.domain).toBe('localhost');
    expect(sessionCookie.httpOnly).toBe(true);
    expect(sessionCookie.sameSite).toBe('Lax');
  });
});
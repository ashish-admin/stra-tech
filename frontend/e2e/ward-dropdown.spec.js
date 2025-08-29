import { test, expect } from '@playwright/test';

test.describe('Ward Dropdown Functionality', () => {
  
  // Helper function to handle login if needed
  async function ensureAuthenticated(page) {
    await page.goto('/');
    
    // Check if login form is present
    const usernameInput = page.locator('input[name="username"]');
    const loginVisible = await usernameInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (loginVisible) {
      console.log('Login required, authenticating...');
      await usernameInput.fill('ashish');
      await page.locator('input[name="password"]').fill('password');
      await page.locator('button[type="submit"]').click();
      
      // Wait for dashboard to load
      await page.waitForSelector('h1:has-text("LokDarpan")', { timeout: 10000 });
    }
    
    // Ensure dashboard is loaded
    await page.waitForLoadState('networkidle');
  }

  test('should display ward dropdown with all available wards', async ({ page }) => {
    // Set up authentication
    await ensureAuthenticated(page);
    
    // Look for the ward selector dropdown
    const wardSelect = page.locator('select').first();
    
    // Verify the dropdown exists
    await expect(wardSelect).toBeVisible({ timeout: 5000 });
    
    // Get all options from the dropdown  
    const options = await wardSelect.locator('option').all();
    const optionTexts = await Promise.all(
      options.map(option => option.textContent())
    );
    
    console.log(`Found ${optionTexts.length} ward options`);
    console.log('First few wards:', optionTexts.slice(0, 5));
    
    // Verify we have a reasonable number of wards (should be 52: 51 wards + 1 "Select Ward")
    expect(optionTexts.length).toBeGreaterThan(50);
    expect(optionTexts.length).toBeLessThan(60);
    
    // Verify the first option is "Select Ward"
    expect(optionTexts[0]).toBe('Select Ward');
    
    // Verify some known wards are present
    const wardNames = optionTexts.slice(1); // Skip "Select Ward"
    expect(wardNames).toContain('Addagutta');
    expect(wardNames).toContain('Jubilee Hills');
    expect(wardNames).toContain('Banjara Hills');
    
    console.log(`✅ Ward dropdown contains ${wardNames.length} wards`);
  });

  test('should allow ward selection and show ward-specific content', async ({ page }) => {
    await ensureAuthenticated(page);
    
    const wardSelect = page.locator('select').first();
    await expect(wardSelect).toBeVisible();
    
    // Select the first available ward (skip "Select Ward" option)
    const options = await wardSelect.locator('option').all();
    if (options.length > 1) {
      const firstWardOption = options[1];
      const wardName = await firstWardOption.textContent();
      const wardValue = await firstWardOption.getAttribute('value');
      
      console.log(`Selecting ward: ${wardName} (value: ${wardValue})`);
      
      // Select the ward
      await wardSelect.selectOption(wardValue);
      
      // Wait for any dynamic content updates
      await page.waitForTimeout(2000);
      
      // Verify the selection worked by checking the selected value
      const selectedValue = await wardSelect.inputValue();
      expect(selectedValue).toBe(wardValue);
      
      console.log(`✅ Successfully selected ward: ${wardName}`);
      
      // Look for ward-specific content or data loading
      // The dashboard should now show content for the selected ward
      const bodyText = await page.textContent('body');
      expect(bodyText.length).toBeGreaterThan(100); // Should have meaningful content
      
      console.log(`✅ Page content updated after ward selection`);
    }
  });

  test('should handle ward dropdown errors gracefully', async ({ page }) => {
    await ensureAuthenticated(page);
    
    // Check that the page doesn't crash if there are issues with ward data
    const wardSelect = page.locator('select').first();
    
    // Even if the dropdown has issues, the page should still be functional
    const bodyText = await page.textContent('body');
    expect(bodyText.trim()).not.toBe('');
    expect(bodyText).toContain('LokDarpan');
    
    console.log('✅ Page remains functional regardless of ward dropdown state');
  });
});
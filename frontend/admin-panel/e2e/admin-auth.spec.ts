import { test, expect } from '@playwright/test';

test.describe('Admin Authentication', () => {
  test('should allow admin to login', async ({ page }) => {
    await page.goto('/');

    // Fill admin login form using label/placeholder or text content
    await page.fill('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]', 'admin@uberfoods.com');
    await page.fill('input[type="password"], input[placeholder*="password" i], input[placeholder*="Password" i]', 'admin123');

    // Submit form using button with text
    await page.click('button:has-text("Anmelden"), button:has-text("Login"), button[type="submit"]');

    // Wait for navigation or API response
    await page.waitForLoadState('networkidle');

    // Check if we're redirected away from login page or see any content
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login'); // Should redirect away from login

    // Or check for any content that indicates we're logged in
    await expect(page.locator('body')).toContainText(/Dashboard|Admin|Restaurants|Orders|Willkommen|Übersicht/i);
  });

  test('should show error for invalid admin credentials', async ({ page }) => {
    await page.goto('/');

    // Fill with invalid credentials
    await page.fill('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]', 'invalid@admin.com');
    await page.fill('input[type="password"], input[placeholder*="password" i], input[placeholder*="Password" i]', 'wrongpassword');

    // Submit form
    await page.click('button:has-text("Anmelden"), button:has-text("Login"), button[type="submit"]');

    // Should show error message or stay on login page
    await expect(page.locator('body')).toContainText(/Login fehlgeschlagen|Error|Invalid|Wrong|Falsch|Ungültig|Fehler/i);
  });
});
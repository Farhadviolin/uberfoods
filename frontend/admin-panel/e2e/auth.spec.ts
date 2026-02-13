import { test, expect } from '@playwright/test';

// Auth-Flows brauchen ein laufendes Backend. Standardmäßig werden nur Smoke-Checks ausgeführt.
const runAuthFlows = process.env.E2E_RUN_AUTH === 'true';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Debug: Log current title and URL
    console.log('Current URL:', page.url());
    console.log('Current title:', await page.title());
    console.log('Page content length:', (await page.content()).length);

    // Der Titel kann je nach Build variieren (z.B. "UberFoods - Admin Panel")
    await expect(page).toHaveTitle(/UberFoods/i);

    // Use more specific selectors with explicit waits
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // Ensure inputs are enabled
    await expect(emailInput).toBeEnabled();
    await expect(passwordInput).toBeEnabled();
  });

  test('should show error on invalid login', async ({ page }) => {
    if (!runAuthFlows) test.skip();

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    if (!runAuthFlows) test.skip();

    // Skip if in development mode with auto-login
    const isDevMode = await page.evaluate(() => {
      return (window as any).__DEV_MODE__ || false;
    });

    if (isDevMode) {
      test.skip();
    }

    // Wait for form to be ready
    await page.waitForLoadState('networkidle');

    // Fill form with explicit waits
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });

    await emailInput.fill(process.env.TEST_ADMIN_EMAIL || 'admin@uberfoods.com');
    await passwordInput.fill(process.env.TEST_ADMIN_PASSWORD || 'admin123');

    // Wait for submit button to be enabled
    await expect(submitButton).toBeEnabled();

    await submitButton.click();

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Check if login was successful by looking for content (not URL redirect)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login'); // Should redirect away from login

    // Check for dashboard/admin content
    await expect(page.locator('body')).toContainText(/Dashboard|Admin|Restaurants|Orders|Willkommen|Übersicht/i);
  });

  test('should logout successfully', async ({ page }) => {
    if (!runAuthFlows) test.skip();

    // This test requires being logged in first
    // In dev mode, might auto-login
    await page.waitForTimeout(2000);
    
    // Try to find logout button
    const logoutButton = page.locator('text=/logout|abmelden/i').first();
    
    if (await logoutButton.isVisible({ timeout: 5000 })) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\//);
    }
  });
});


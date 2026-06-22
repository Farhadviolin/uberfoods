import { test, expect } from '@playwright/test';

test.describe('Login-Seite', () => {
  test('zeigt Formular und Validierungen', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByTestId('login-title')).toBeVisible();
    await expect(page.getByTestId('login-subtitle')).toHaveText(/fahrer login|driver login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await expect(page.locator('input[type="email"]')).toHaveAttribute('required', '');
    await expect(page.locator('input[type="password"]')).toHaveAttribute('required', '');

    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });
});

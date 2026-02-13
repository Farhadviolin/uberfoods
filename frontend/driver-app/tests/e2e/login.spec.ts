import { test, expect } from '@playwright/test';

test.describe('Login-Seite', () => {
  test('zeigt Formular und Validierungen', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /fahrer login/i })).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/passwort/i)).toBeVisible();

    await expect(page.getByLabel(/e-mail/i)).toHaveAttribute('required', '');
    await expect(page.getByLabel(/passwort/i)).toHaveAttribute('required', '');

    await page.getByRole('button', { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

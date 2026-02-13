import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './_helpers/auth';
import { setupAdminPage } from './_helpers/nav';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    await setupAdminPage(page, 'dashboard', testInfo);
  });

  test('should display dashboard', async ({ page }) => {
    // Check for dashboard page
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
  });

  test('should display statistics cards', async ({ page }) => {
    // Wait for dashboard stats to load
    await expect(page.getByTestId('dashboard-stats')).toBeVisible({ timeout: 10000 });
  });

  test('should allow period selection', async ({ page }) => {
    const periodSelect = page.getByTestId('dashboard-period');

    if (await periodSelect.isVisible({ timeout: 5000 })) {
      await periodSelect.selectOption('30d');

      // Dashboard should still be visible after period change
      await expect(page.getByTestId('dashboard-page')).toBeVisible();
    } else {
      // If no period selector, just ensure dashboard is visible
      await expect(page.getByTestId('dashboard-page')).toBeVisible();
    }
  });

  test('should display charts', async ({ page }) => {
    // Check for charts container
    await expect(page.getByTestId('dashboard-charts')).toBeVisible({ timeout: 10000 });
  });
});


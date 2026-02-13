import { expect, Page, test } from '@playwright/test';
import { loginAsAdmin } from './_helpers/auth';
import { setupAdminPage, ensureSidebarClosedOnMobile, scrollContentTop } from './_helpers/nav';
import { smartCheck, smartPress, smartFill } from './_helpers/ui';

async function closeBlockingOverlays(page: Page) {
  const modal = page.locator('[data-testid="restaurant-modal"], [data-testid="confirm-dialog"]');
  if (await modal.first().isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await expect(modal.first()).toBeHidden({ timeout: 5000 }).catch(() => {});
  }
}

async function ensureMobileSidebarOpen(page: Page) {
  const sidebar = page.getByTestId('sidebar');

  // Sidebar muss existieren (AdminShell gerendert)
  await expect(sidebar).toBeVisible({ timeout: 15000 });

  const open = await sidebar.getAttribute('data-open');

  if (open !== '1') {
    const mobileToggle = page.getByTestId('mobile-menu-toggle');
    if (await mobileToggle.isVisible().catch(() => false)) {
      await mobileToggle.scrollIntoViewIfNeeded();
      await mobileToggle.click({ timeout: 5000 });

      // ✅ Ground Truth: Sidebar wirklich offen
      await expect(sidebar).toHaveAttribute('data-open', '1', { timeout: 10000 });
    }
  }
}

async function scrollRestaurantContainerToTop(page: Page) {
  const container = page.getByTestId('restaurant-management');
  await container.evaluate((el) => {
    // falls der Bereich selbst scrollt
    (el as HTMLElement).scrollTop = 0;
  }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
}

async function getIdFromBulkRow(rowCheckbox: import('@playwright/test').Locator) {
  const tid = await rowCheckbox.getAttribute('data-testid');
  if (!tid) throw new Error('bulk-row checkbox has no data-testid');
  // bulk-row-<id>
  return tid.replace('bulk-row-', '');
}

async function gotoRestaurantManagement(page: Page) {
  await closeBlockingOverlays(page);

  // Mobile: Sidebar deterministisch öffnen (statt isVisible-Heuristik)
  await ensureMobileSidebarOpen(page);

  // Restaurant-Link finden und klicken (global)
  const restaurantLink = page.getByTestId('sidebar-link-restaurants');

  // Debug: Prüfen ob Link existiert
  await expect(restaurantLink).toBeVisible({ timeout: 5000 });

  await restaurantLink.scrollIntoViewIfNeeded();
  await restaurantLink.click({ timeout: 5000 });

  // SPA: nicht URL warten, sondern Content
  await expect(page.getByTestId('restaurant-management')).toBeVisible({ timeout: 15000 });
}

test.describe('Admin - Restaurant Management (E2E)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    await setupAdminPage(page, 'restaurants', testInfo);
  });

  test('create new restaurant', async ({ page }, testInfo) => {
    // Click create restaurant button
    await smartPress(page.getByTestId('btn-create-restaurant'), testInfo);

    // Fill restaurant form
    await page.fill('[data-testid="restaurant-name"]', 'Test Restaurant E2E');
    await page.fill('[data-testid="restaurant-address"]', 'Teststrasse 123, 1010 Wien');

    // Submit form
    await smartPress(page.getByTestId('btn-save-restaurant'), testInfo);

    // Verify success message
    await expect(page.locator('text=Restaurant erfolgreich hinzugefügt')).toBeVisible({ timeout: 5000 });

    // Verify restaurant appears in table
    await expect(page.locator('td:has-text("Test Restaurant E2E")')).toBeVisible();
  });

  test('edit restaurant', async ({ page }, testInfo) => {
    const isMobile = !!(testInfo.project.use as any)?.hasTouch;

    if (isMobile) {
      // Mobile version: deterministic with data-testid assertions
      const firstRow = page.locator('[data-testid^="bulk-row-"]').first();
      await expect(firstRow).toBeVisible({ timeout: 10000 });
      const id = await getIdFromBulkRow(firstRow);

      await smartPress(page.getByTestId(`btn-actions-${id}`), testInfo);
      await expect(page.getByTestId(`actions-menu-${id}`)).toHaveAttribute('data-open', '1', { timeout: 15000 });

      await smartPress(page.getByTestId(`btn-edit-${id}`), testInfo);
      await expect(page.getByTestId('restaurant-modal')).toBeVisible({ timeout: 15000 });

      await smartFill(page.getByTestId('restaurant-name'), testInfo, 'Updated Restaurant');
      await smartFill(page.getByTestId('restaurant-address'), testInfo, 'Updated Address');

      await smartPress(page.getByTestId('btn-save-restaurant'), testInfo);

      await expect(page.getByTestId('restaurant-modal')).toBeHidden({ timeout: 15000 });
      await expect(page.locator(`[data-testid^="restaurant-row-${id}"]`).locator('text=Updated Restaurant')).toBeVisible();
    } else {
      // Desktop version: original logic
      await smartPress(page.locator('[data-testid^="btn-actions-"]').first(), testInfo);
      await smartPress(page.locator('[data-testid^="btn-edit-"]').first(), testInfo);

      const nameInput = page.locator('[data-testid="restaurant-name"]');
      await nameInput.clear();
      await nameInput.fill('Updated Restaurant Name');

      await smartPress(page.getByTestId('btn-save-restaurant'), testInfo);
      await expect(page.locator('text=Restaurant erfolgreich aktualisiert')).toBeVisible();
    }
  });

  test('toggle restaurant status', async ({ page }, testInfo) => {
    const isMobile = !!(testInfo.project.use as any)?.hasTouch;

    if (isMobile) {
      // Mobile version: deterministic with data-testid assertions
      const firstRow = page.locator('[data-testid^="bulk-row-"]').first();
      await expect(firstRow).toBeVisible({ timeout: 10000 });
      const id = await getIdFromBulkRow(firstRow);

      const badge = page.getByTestId(`restaurant-status-${id}`);
      const before = await badge.textContent();

      await smartPress(page.getByTestId(`btn-actions-${id}`), testInfo);
      await expect(page.getByTestId(`actions-menu-${id}`)).toHaveAttribute('data-open', '1', { timeout: 15000 });

      await smartPress(page.getByTestId(`btn-toggle-${id}`), testInfo);

      await page.waitForTimeout(1000);
      const after = await badge.textContent();
      expect((after || '').trim()).not.toBe((before || '').trim());
    } else {
      // Desktop version: original logic
      const initialStatus = await page.locator('[data-testid^="restaurant-status-"]').first().textContent();
      await smartPress(page.locator('[data-testid^="btn-actions-"]').first(), testInfo);
      await smartPress(page.locator('[data-testid^="btn-toggle-"]').first(), testInfo);

      const newStatus = await page.locator('[data-testid^="restaurant-status-"]').first().textContent();
      expect(newStatus).not.toBe(initialStatus);
    }
  });

  test('delete restaurant with confirmation', async ({ page }, testInfo) => {
    const isMobile = !!(testInfo.project.use as any)?.hasTouch;

    if (isMobile) {
      // Mobile version: deterministic with data-testid assertions
      const firstRow = page.locator('[data-testid^="bulk-row-"]').first();
      await expect(firstRow).toBeVisible({ timeout: 10000 });
      const id = await getIdFromBulkRow(firstRow);

      await smartPress(page.getByTestId(`btn-actions-${id}`), testInfo);
      await expect(page.getByTestId(`actions-menu-${id}`)).toHaveAttribute('data-open', '1', { timeout: 15000 });

      await smartPress(page.getByTestId(`btn-delete-${id}`), testInfo);

      await expect(page.getByTestId('confirm-dialog')).toBeVisible({ timeout: 15000 });
      await smartPress(page.getByTestId('btn-confirm-delete'), testInfo);

      await expect(page.getByTestId(`restaurant-row-${id}`)).toBeHidden({ timeout: 15000 });
    } else {
      // Desktop version: original logic
      const initialCount = await page.locator('tbody tr').count();

      await smartPress(page.locator('[data-testid^="btn-actions-"]').first(), testInfo);
      await smartPress(page.locator('[data-testid^="btn-delete-"]').first(), testInfo);

      await smartPress(page.getByTestId('btn-confirm-delete'), testInfo);

      await expect(page.locator('text=Restaurant erfolgreich gelöscht')).toBeVisible();

      const newCount = await page.locator('tbody tr').count();
      expect(newCount).toBe(initialCount - 1);
    }
  });

  test('bulk operations on restaurants', async ({ page }, testInfo) => {
    // Nach Navigation: Sidebar auf Mobile schließen, damit nichts blockiert
    await ensureSidebarClosedOnMobile(page, testInfo);
    await scrollContentTop(page);

    // Tabelle sichtbar machen
    await page.getByTestId('restaurant-table').scrollIntoViewIfNeeded();

    // Mindestens 2 Rows selektieren
    const rowChecks = page.locator('[data-testid^="bulk-row-"]');
    await expect(rowChecks.first()).toBeVisible({ timeout: 15000 });
    await expect(rowChecks.nth(1)).toBeVisible({ timeout: 15000 });

    const first = rowChecks.nth(0);
    const second = rowChecks.nth(1);

    const id1 = await getIdFromBulkRow(first);
    const id2 = await getIdFromBulkRow(second);

    // Mobile: tap ist oft stabiler als click/check
    const isMobileProject = testInfo.project.name.toLowerCase().includes('mobile');

    await first.scrollIntoViewIfNeeded();
    await second.scrollIntoViewIfNeeded();

    // Mobile-spezifische Checkbox-Interaktion
    await smartCheck(first, testInfo, true);
    await smartCheck(second, testInfo, true);

    // Bulk Actions erscheinen erst wenn selection > 0
    await expect(page.getByTestId('bulk-actions')).toBeVisible({ timeout: 10000 });

    // Aktion wählen + anwenden
    await page.getByTestId('bulk-action').selectOption('deactivate');

    const applyButton = page.getByTestId('bulk-apply');
    await smartPress(applyButton, testInfo);

    // Nach Apply: Selection Reset (dein neuer deterministischer Cleanup)
    await expect(page.getByTestId('bulk-actions')).toBeHidden({ timeout: 10000 });

    // Status-Badges prüfen (deine data-testid Hooks)
    await expect(page.getByTestId(`restaurant-status-${id1}`)).toContainText(/inaktiv|deaktiv/i, { timeout: 10000 });
    await expect(page.getByTestId(`restaurant-status-${id2}`)).toContainText(/inaktiv|deaktiv/i, { timeout: 10000 });
  });

  test('filter and search restaurants', async ({ page }, testInfo) => {
    const isMobile = !!(testInfo.project.use as any)?.hasTouch;

    if (isMobile) {
      // Mobile version: deterministic with smartFill
      const searchInput = page.getByTestId('input-search-restaurants');
      await smartFill(searchInput, testInfo, '');

      const rows = page.locator('[data-testid^="restaurant-row-"]');
      const baseline = await rows.count();
      expect(baseline).toBeGreaterThan(0);

      await smartFill(searchInput, testInfo, 'zzzz-not-found');
      await expect.poll(async () => await rows.count()).toBe(0);

      await smartFill(searchInput, testInfo, '');
      const firstRow = rows.first();
      const firstRowText = await firstRow.textContent() || '';
      const searchTerm = firstRowText.split(' ')[0];

      await smartFill(searchInput, testInfo, searchTerm);
      await expect.poll(async () => await rows.count()).toBeGreaterThanOrEqual(1);
    } else {
      // Desktop version: original logic
      await page.fill('[data-testid="input-search-restaurants"]', 'Pizza');
      await page.waitForTimeout(500);

      const rows = page.locator('[data-testid^="restaurant-row-"]');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);

      await smartPress(page.locator('button:has-text("Erweiterte Filter")'), testInfo);
      await page.selectOption('select[name="status"]', 'OPEN');
      await page.waitForTimeout(500);
    }
  });

  test('export restaurants to CSV', async ({ page }, testInfo) => {
    const isMobile = !!(testInfo.project.use as any)?.hasTouch;

    if (isMobile) {
      // Mobile version: deterministic download handling
      const exportBtn = page.getByTestId('btn-export-csv');
      await expect(exportBtn).toBeVisible({ timeout: 15000 });

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        smartPress(exportBtn, testInfo)
      ]);

      const name = download.suggestedFilename();
      const nameLower = name.toLowerCase();
      expect(nameLower).toMatch(/restaurants|\.csv/);
      await download.path();
    } else {
      // Desktop version: original logic
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="btn-export-csv"]'),
      ]);

      expect(download.suggestedFilename()).toContain('restaurants');
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });
});

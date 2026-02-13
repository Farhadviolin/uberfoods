import { expect, Page } from '@playwright/test';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Wait for the page to stabilize - either login form or admin shell should appear
  // This handles the case where AuthContext is still loading
  await page.waitForFunction(() => {
    const hasForm = document.querySelector('form') !== null;
    const hasAdminShell = document.querySelector('[data-testid="admin-shell"]') !== null;
    const hasLoadingSpinner = document.querySelector('.loading-spinner, [class*="loading"], [class*="spinner"]') !== null;

    // Debug logging (will appear in Playwright output)
    if (!hasForm && !hasAdminShell && !hasLoadingSpinner) {
      console.log('Auth Debug: No form, no admin shell, no loading spinner found on page');
      console.log('Auth Debug: Page title:', document.title);
      console.log('Auth Debug: Body classes:', document.body.className);
      console.log('Auth Debug: First few elements:', Array.from(document.body.children).slice(0, 3).map(el => el.tagName + '.' + el.className).join(', '));
    }

    return hasForm || hasAdminShell || hasLoadingSpinner;
  }, { timeout: 20_000 });

  // If we're already logged in (admin shell is visible), we're done
  const adminShell = page.locator('[data-testid="admin-shell"]');
  if (await adminShell.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Auth Debug: Already logged in - admin shell visible');
    return;
  }

  // Check if there's a loading spinner (AuthContext still loading)
  const loadingSpinner = page.locator('.loading-spinner, [class*="loading"], [class*="spinner"]').first();
  if (await loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Auth Debug: Loading spinner visible, waiting for it to disappear');
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  // Now wait for the login form to be visible
  const loginForm = page.locator('form');
  if (await loginForm.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Auth Debug: Login form is visible, proceeding with login');
  } else {
    console.log('Auth Debug: Login form not visible, waiting...');
    await loginForm.waitFor({ timeout: 10_000 });
  }

  await page.fill('[name="email"]', 'admin@uberfoods.com');
  await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'admin123');

  const [loginRes] = await Promise.all([
    page.waitForResponse(res =>
      res.url().includes('/api/auth/login') &&
      res.request().method() === 'POST'
    ),
    page.click('button[type="submit"]'),
  ]);

  const body = await loginRes.text().catch(() => '');
  if (loginRes.status() >= 500) {
    throw new Error(`Login API 5xx (${loginRes.status()}). Body: ${body.slice(0, 400)}`);
  }
  if (loginRes.status() >= 400) {
    throw new Error(`Login API failed (${loginRes.status()}). Body: ${body.slice(0, 400)}`);
  }

  await expect(page.getByTestId('admin-shell')).toBeVisible({ timeout: 15_000 });
}

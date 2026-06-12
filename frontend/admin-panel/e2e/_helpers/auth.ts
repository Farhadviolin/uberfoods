import { expect, Page } from '@playwright/test';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const loginForm = page.locator('form[aria-label="Login-Formular"]');
  const adminShell = page.locator('[data-testid="admin-shell"]');
  const loadingSpinner = page.locator('[role="status"], .loading-spinner-container, .loading-spinner').first();

  // Wait for one of the real app states instead of a brittle DOM heuristic.
  try {
    await Promise.race([
      loginForm.waitFor({ state: 'visible', timeout: 20_000 }),
      adminShell.waitFor({ state: 'visible', timeout: 20_000 }),
      loadingSpinner.waitFor({ state: 'visible', timeout: 20_000 }),
    ]);
  } catch (error) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('Auth Debug: Admin login state did not appear in time');
    console.log('Auth Debug: URL:', page.url());
    console.log('Auth Debug: Title:', await page.title().catch(() => ''));
    console.log('Auth Debug: Body text:', bodyText.slice(0, 500));
    console.log('Auth Debug: Form visible:', await loginForm.isVisible().catch(() => false));
    console.log('Auth Debug: Admin shell visible:', await adminShell.isVisible().catch(() => false));
    console.log('Auth Debug: Loading spinner visible:', await loadingSpinner.isVisible().catch(() => false));
    throw new Error(`Admin login UI did not become ready: ${(error as Error).message}`);
  }

  // If we're already logged in (admin shell is visible), we're done
  if (await adminShell.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Auth Debug: Already logged in - admin shell visible');
    return;
  }

  // Check if there's a loading spinner (AuthContext still loading)
  if (await loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Auth Debug: Loading spinner visible, waiting for it to disappear');
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  // Now wait for the login form to be visible
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

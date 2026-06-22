import { expect, Page } from '@playwright/test';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const loginForm = page.locator('form[aria-label="Login-Formular"]');
  const adminShell = page.locator('[data-testid="admin-shell"]');
  const loadingSpinner = page.locator('[role="status"], .loading-spinner-container, .loading-spinner').first();

  const readinessDeadline = Date.now() + 20_000;
  let lastState = 'none';

  while (Date.now() < readinessDeadline) {
    const shellVisible = await adminShell.isVisible({ timeout: 500 }).catch(() => false);
    if (shellVisible) {
      console.log('Auth Debug: Already logged in - admin shell visible');
      return;
    }

    const formVisible = await loginForm.isVisible({ timeout: 500 }).catch(() => false);
    if (formVisible) {
      console.log('Auth Debug: Login form is visible, proceeding with login');
      break;
    }

    const spinnerVisible = await loadingSpinner.isVisible({ timeout: 500 }).catch(() => false);
    if (spinnerVisible) {
      lastState = 'spinner';
      await page.waitForTimeout(250);
      continue;
    }

    lastState = 'blank';
    await page.waitForTimeout(250);
  }

  if (!(await loginForm.isVisible({ timeout: 1000 }).catch(() => false))) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const forms = await page.locator('form').evaluateAll(nodes =>
      nodes.map(node => (node as HTMLFormElement).getAttribute('aria-label') || node.outerHTML.slice(0, 300))
    ).catch(() => []);
    const inputs = await page.locator('input').evaluateAll(nodes =>
      nodes.map(node => {
        const el = node as HTMLInputElement;
        return `${el.name || '(no-name)'}|${el.type || '(no-type)'}|${el.placeholder || '(no-placeholder)'}`;
      })
    ).catch(() => []);
    const buttons = await page.locator('button').evaluateAll(nodes =>
      nodes.map(node => {
        const el = node as HTMLButtonElement;
        return `${el.getAttribute('aria-label') || el.textContent?.trim() || '(no-label)'}`;
      })
    ).catch(() => []);
    const testIds = await page.locator('[data-testid]').evaluateAll(nodes =>
      nodes.map(node => (node as HTMLElement).getAttribute('data-testid')).filter(Boolean)
    ).catch(() => []);
    const storageKeys = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
    })).catch(() => ({ localStorage: [], sessionStorage: [] }));

    console.log('Auth Debug: Admin login state did not appear in time');
    console.log('Auth Debug: URL:', page.url());
    console.log('Auth Debug: Title:', await page.title().catch(() => ''));
    console.log('Auth Debug: Body text:', bodyText.slice(0, 500));
    console.log('Auth Debug: Forms:', forms.join(' || ') || '(none)');
    console.log('Auth Debug: Inputs:', inputs.join(' || ') || '(none)');
    console.log('Auth Debug: Buttons:', buttons.join(' || ') || '(none)');
    console.log('Auth Debug: data-testid values:', testIds.join(', ') || '(none)');
    console.log('Auth Debug: localStorage keys:', storageKeys.localStorage.join(', ') || '(none)');
    console.log('Auth Debug: sessionStorage keys:', storageKeys.sessionStorage.join(', ') || '(none)');
    console.log('Auth Debug: Last observed state:', lastState);
    throw new Error('Admin login UI did not become ready within 20s');
  }

  if (await loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Auth Debug: Loading spinner visible, waiting for it to disappear');
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 15_000 });
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

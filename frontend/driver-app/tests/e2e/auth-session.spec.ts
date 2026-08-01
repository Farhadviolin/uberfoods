import { expect, test } from '@playwright/test';

const invalidAccessToken = 'driver-session-012-invalid-access-token';
const invalidRefreshToken = 'driver-session-012-invalid-refresh-token';

const persistedDriver = {
  id: 'driver-session-012',
  name: 'Browser Session Driver',
  email: 'driver-session-012@example.test',
  phone: '+431234567890',
  isActive: true,
  role: 'DRIVER',
  currentStatus: 'OFFLINE',
};

test.describe('Driver-Session-Lifecycle', () => {
  test('verwirft eine vor dem ersten App-Load persistierte ungültige Session', async ({ page }) => {
    const authResponses: Array<{ path: string; status: number }> = [];
    page.on('response', (response) => {
      const path = new URL(response.url()).pathname;
      if (path === '/api/auth/me' || path === '/api/auth/refresh') {
        authResponses.push({ path, status: response.status() });
      }
    });

    await page.addInitScript(({ driver, accessToken, refreshToken }) => {
      if (window.name === 'driver-session-012-init-complete') return;
      window.name = 'driver-session-012-init-complete';
      localStorage.setItem('driver_token', accessToken);
      localStorage.setItem('driver_refresh_token', refreshToken);
      localStorage.setItem('driver_data', JSON.stringify(driver));
      localStorage.setItem('driver_user', JSON.stringify(driver));
      (window as Window & {
        __driverSession012InitEvidence?: { keys: string[]; accessToken: string };
      }).__driverSession012InitEvidence = {
        keys: ['driver_token', 'driver_refresh_token', 'driver_data', 'driver_user'],
        accessToken,
      };
    }, {
      driver: persistedDriver,
      accessToken: invalidAccessToken,
      refreshToken: invalidRefreshToken,
    });

    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-title')).toBeVisible();
    await expect(page.getByTestId('driver-dashboard')).toHaveCount(0);

    const initEvidence = await page.evaluate(() =>
      (window as Window & {
        __driverSession012InitEvidence?: { keys: string[]; accessToken: string };
      }).__driverSession012InitEvidence,
    );
    expect(initEvidence).toEqual({
      keys: ['driver_token', 'driver_refresh_token', 'driver_data', 'driver_user'],
      accessToken: invalidAccessToken,
    });

    const storageAfterReset = await page.evaluate(() =>
      ['driver_token', 'driver_refresh_token', 'driver_data', 'driver_user'].map((key) => [
        key,
        localStorage.getItem(key),
      ]),
    );
    expect(storageAfterReset).toEqual([
      ['driver_token', null],
      ['driver_refresh_token', null],
      ['driver_data', null],
      ['driver_user', null],
    ]);

    expect(authResponses).toEqual([
      { path: '/api/auth/me', status: 401 },
      { path: '/api/auth/refresh', status: 401 },
    ]);

    const requestCountAfterReset = authResponses.length;
    await page.waitForTimeout(500);
    expect(authResponses).toHaveLength(requestCountAfterReset);

    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('driver-dashboard')).toHaveCount(0);
    expect(authResponses).toHaveLength(requestCountAfterReset);

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('driver-dashboard')).toHaveCount(0);
  });

  test('erlaubt regulären Login, Dashboard-Zugriff und sichtbaren Logout', async ({ page }) => {
    const authResponses: number[] = [];
    page.on('response', (response) => {
      const path = new URL(response.url()).pathname;
      if (path === '/api/auth/me') authResponses.push(response.status());
    });

    const login = async () => {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill('driver@uberfoods.local');
      await page.locator('input[type="password"]').fill('driver123');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByTestId('driver-dashboard')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Abmelden' })).toBeVisible();
    };

    await login();
    expect(authResponses).not.toContain(401);

    await page.getByRole('button', { name: 'Abmelden' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('driver-dashboard')).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('driver-dashboard')).toHaveCount(0);

    await login();
    expect(authResponses).not.toContain(401);
  });
});

import { Page } from '@playwright/test';

export const e2eDriver = {
  id: 'driver-123',
  name: 'Test Driver',
  email: 'driver@test.com',
  phone: '+4312345678',
  isActive: true,
  role: 'DRIVER' as const,
};

export async function installDriverSession(page: Page): Promise<string> {
  const accessToken = crypto.randomUUID();
  await page.addInitScript(({ driver, token }) => {
    localStorage.setItem('driver_token', token);
    localStorage.setItem('driver_data', JSON.stringify(driver));
    localStorage.setItem('driver_user', JSON.stringify(driver));
  }, { driver: e2eDriver, token: accessToken });
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: e2eDriver.id, role: e2eDriver.role, isActive: true }),
    });
  });
  return accessToken;
}

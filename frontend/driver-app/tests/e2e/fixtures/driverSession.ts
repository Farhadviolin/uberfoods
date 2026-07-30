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
  return accessToken;
}

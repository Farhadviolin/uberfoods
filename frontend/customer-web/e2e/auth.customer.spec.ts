import { expect } from '@playwright/test';
import { test, TestHelpers, testUrls } from './test-helpers';

test.use({ storageState: undefined });

test.describe('Customer Authentication', () => {
  test('should allow user to login', async ({ page }) => {
    const credentials = TestHelpers.createCustomerCredentials();
    await TestHelpers.registerCustomer(page, credentials, testUrls.customer);
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await TestHelpers.loginCustomer(page, credentials, testUrls.customer);
    const storedToken = await page.evaluate(() => localStorage.getItem('customer_token'));
    expect(storedToken).toBeTruthy();
  });

  test('should allow user to register', async ({ page }) => {
    const credentials = TestHelpers.createCustomerCredentials();
    await TestHelpers.registerCustomer(page, credentials, testUrls.customer);
  });

  test('should persist login state', async ({ page, context }) => {
    const credentials = TestHelpers.createCustomerCredentials();
    await TestHelpers.registerCustomer(page, credentials, testUrls.customer);
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await TestHelpers.loginCustomer(page, credentials, testUrls.customer);
    const token = await page.evaluate(() => localStorage.getItem('customer_token'));
    expect(token).toBeTruthy();
  });
});

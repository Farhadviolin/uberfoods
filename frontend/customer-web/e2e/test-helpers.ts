import { test as base, Page, BrowserContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { testDataFactory, TestUser } from '../../test-utils/test-data-factory';

// Generate unique run ID for test isolation
const RUN_ID = process.env.RUN_ID || `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

type CustomerCredentials = {
  email: string;
  password: string;
  name: string;
  phone: string;
  address?: string;
};

// Extended test fixture with authentication helpers and runId
export const test = base.extend<{
  authenticatedPage: {
    customer: Page;
    restaurant: Page;
    driver: Page;
    admin: Page;
  };
  runId: string;
  testData: typeof testDataFactory;
}>({
  runId: RUN_ID,

  testData: testDataFactory,

  authenticatedPage: async ({ browser }, use) => {
    const contexts = {
      customer: await browser.newContext({ storageState: 'playwright/.auth/customer.json' }),
      restaurant: await browser.newContext({ storageState: 'playwright/.auth/restaurant.json' }),
      driver: await browser.newContext({ storageState: 'playwright/.auth/driver.json' }),
      admin: await browser.newContext({ storageState: 'playwright/.auth/admin.json' }),
    };

    const pages = {
      customer: await contexts.customer.newPage(),
      restaurant: await contexts.restaurant.newPage(),
      driver: await contexts.driver.newPage(),
      admin: await contexts.admin.newPage(),
    };

    await use(pages);

    // Cleanup
    await contexts.customer.close();
    await contexts.restaurant.close();
    await contexts.driver.close();
    await contexts.admin.close();
  },
});

// Helper functions for common test operations
export class TestHelpers {
  static createCustomerCredentials() {
    const uniqueEmail = `customer-${RUN_ID}-${randomUUID()}@example.test`;
    const password = 'customer123';
    return {
      email: uniqueEmail,
      password,
      name: 'Test Customer',
      phone: '+43 123 456 789',
      address: undefined as string | undefined,
    };
  }

  static async waitForStablePage(page: Page, timeout = 5000) {
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForTimeout(500);
  }

  static async loginUser(page: Page, user: TestUser, appUrl: string) {
    await page.goto(`${appUrl}/login`);
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('button[type="submit"], button:has-text("Login")').click();
    await page.waitForURL(/.*(dashboard|home)/i);
  }

  static async registerCustomer(page: Page, user: Pick<TestUser, 'email' | 'password' | 'name' | 'phone'>, appUrl: string) {
    await page.goto(`${appUrl}/register`);
    const registerRoute = '/api/auth/customer/register';
    const registerResponsePromise = page.waitForResponse(
      response => response.request().method() === 'POST'
        && new URL(response.url()).pathname === registerRoute,
      { timeout: 15000 }
    );

    const credentials = {
      email: user.email,
      password: user.password,
      name: user.name ?? 'Test Customer',
      phone: user.phone ?? '+43 123 456 789',
    };

    await page.locator('input[type="text"], input[name="name"]').first().fill(credentials.name);
    await page.locator('input[type="email"]').fill(credentials.email);
    await page.locator('input[type="tel"], input[name="phone"]').first().fill(credentials.phone);
    await page.locator('input[type="password"]').first().fill(credentials.password);
    await page.locator('input[type="password"]').nth(1).fill(credentials.password);
    await page.locator('button[type="submit"], button:has-text("Register")').click();

    const registerResponse = await registerResponsePromise;
    if (registerResponse.status() !== 201) {
      const body = await registerResponse.text().catch(() => '');
      throw new Error(`Customer register failed: ${registerResponse.status()} ${registerResponse.statusText()} ${body}`);
    }

    return credentials;
  }

  static async loginCustomer(page: Page, credentials: Pick<CustomerCredentials, 'email' | 'password'>, appUrl: string) {
    if (!page.url().includes('/login')) {
      await page.goto(`${appUrl}/login`);
    }

    const loginResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST'
        && response.url().includes('/api/auth/customer/login'),
      { timeout: 15000 },
    );

    await page.locator('input[type="email"]').fill(credentials.email);
    await page.locator('input[type="password"]').fill(credentials.password);
    await page.locator('button[type="submit"], button:has-text("Login")').click();

    const response = await loginResponsePromise;
    if (!response.ok()) {
      const body = await response.text().catch(() => '');
      throw new Error(`Customer login failed: ${response.status()} ${response.statusText()} ${body}`);
    }
    return response;
  }

  static getSelectors() {
    return testDataFactory.getSelectors();
  }

  static getUrls() {
    return testDataFactory.getFrontendUrls();
  }

  static getApiEndpoints() {
    return testDataFactory.getApiEndpoints();
  }

  // Generate namespaced identifiers for test isolation
  static namespacedId(prefix: string): string {
    return `${prefix}_${RUN_ID}`;
  }

  static namespacedEmail(role: string): string {
    return `${role}_${RUN_ID}@example.com`;
  }

  // Cleanup helper for test artifacts
  static async cleanupTestArtifacts(page: Page) {
    // Clear local storage, session storage, and cookies
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  // Screenshot helper with namespacing
  static async takeScreenshot(page: Page, name: string) {
    const namespacedName = `${name}_${RUN_ID}`;
    await page.screenshot({ path: `test-results/${namespacedName}.png` });
  }

  // Wait for element with better error messages
  static async waitForElement(page: Page, selector: string, options?: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached' }) {
    try {
      await page.waitForSelector(selector, {
        timeout: options?.timeout || 10000,
        state: options?.state || 'visible'
      });
    } catch (error) {
      const url = page.url();
      const title = await page.title();
      throw new Error(`Element not found: ${selector} on page "${title}" (${url}). ${error}`);
    }
  }
}

// Export commonly used test data
export const testUsers = {
  customer: testDataFactory.getTestCustomer(),
  restaurant: testDataFactory.getTestRestaurant(),
  driver: testDataFactory.getTestDriver(),
  admin: testDataFactory.getTestAdmin(),
};

export const testUrls = testDataFactory.getFrontendUrls();
export const testSelectors = testDataFactory.getSelectors();

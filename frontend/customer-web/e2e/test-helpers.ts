import { test as base, Page, BrowserContext } from '@playwright/test';
import { testDataFactory, TestUser } from '../../test-utils/test-data-factory';

// Generate unique run ID for test isolation
const RUN_ID = process.env.RUN_ID || `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  static async registerCustomer(page: Page, user: TestUser, appUrl: string) {
    await page.goto(`${appUrl}/register`);

    // Wait for register API response
    const registerResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/register') && response.status() === 201,
      { timeout: 10000 }
    );

    await page.locator('input[name="firstName"]').fill('Test');
    await page.locator('input[name="lastName"]').fill('Customer');
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('input[name="phone"]').fill(user.phone);
    await page.locator('button[type="submit"], button:has-text("Register")').click();

    // Wait for register API response
    await registerResponsePromise;

    await page.waitForURL(/.*(dashboard|home|verify)/i);
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

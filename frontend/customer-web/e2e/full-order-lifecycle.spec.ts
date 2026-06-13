import { expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { test, TestHelpers, testUrls, testSelectors } from './test-helpers';
import { testDataFactory } from '../../test-utils/test-data-factory';

// Generate unique run ID for test isolation
const RUN_ID = process.env.GITHUB_RUN_ID
  || process.env.RUN_ID
  || `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT || '1';
const LIFECYCLE_CUSTOMER_ADDRESS = 'Test Street 123, 1010 Vienna';

function createLifecycleCustomerCredentials() {
  const token = `${RUN_ID}.${RUN_ATTEMPT}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.${randomUUID()}`;
  return {
    email: `customer.lifecycle.fullorder.${token}@example.test`,
    password: `customer.${token}`,
    name: `Full Order Lifecycle Customer ${token}`,
    phone: '+43 123 456 789',
    address: LIFECYCLE_CUSTOMER_ADDRESS,
  };
}

async function withStepTimeout<T>(
  label: string,
  action: () => Promise<T>,
  timeoutMs = 30000,
): Promise<T> {
  console.log(`➡️ lifecycle step start: ${label}`);
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Lifecycle step timed out: ${label}`));
      }, timeoutMs);
    });

    const result = await Promise.race([action(), timeout]);
    console.log(`✅ lifecycle step done: ${label}`);
    return result;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

type LifecycleCustomerCredentials = {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
};

async function registerCustomerForLifecycleWithDiagnostics(
  page: Page,
  credentials: LifecycleCustomerCredentials,
  appUrl: string,
): Promise<LifecycleCustomerCredentials> {
  const registerUrl = `${appUrl}/register`;
  console.log('[customer-e2e] register navigation', {
    appUrl,
    registerUrl,
    apiBaseUrl: process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || 'unset',
  });

  await withStepTimeout('register: build register url', async () => {
    expect(registerUrl).toContain('/register');
    console.log('✅ register: register url built');
  }, 5000);

  await withStepTimeout('register: goto register page', async () => {
    await page.goto(registerUrl, { waitUntil: 'domcontentloaded' });
  }, 30000);

  await withStepTimeout('register: wait for register form', async () => {
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 15000 });
    console.log('✅ register: register form visible');
  }, 20000);

  await withStepTimeout('register: fill name', async () => {
    await page.locator('input[type="text"], input[name="name"]').first().fill(credentials.name);
  }, 15000);

  await withStepTimeout('register: fill email', async () => {
    await page.locator('input[type="email"]').fill(credentials.email);
  }, 15000);

  await withStepTimeout('register: fill phone if present', async () => {
    const phoneField = page.locator('input[type="tel"], input[name="phone"]').first();
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill(credentials.phone);
      console.log('✅ register: phone field filled');
    } else {
      console.log('ℹ️ register: phone field not visible');
    }
  }, 15000);

  await withStepTimeout('register: fill password', async () => {
    await page.locator('input[type="password"]').first().fill(credentials.password);
  }, 15000);

  await withStepTimeout('register: fill confirm password if present', async () => {
    const passwordFields = page.locator('input[type="password"]');
    if (await passwordFields.count() > 1) {
      await passwordFields.nth(1).fill(credentials.password);
      console.log('✅ register: confirm password field filled');
    } else {
      console.log('ℹ️ register: confirm password field not visible');
    }
  }, 15000);

  const registerRoute = '/api/auth/customer/register';
  const registerResponsePromise = page.waitForResponse(
    response => response.request().method() === 'POST'
      && new URL(response.url()).pathname === registerRoute,
    { timeout: 15000 },
  );

  await withStepTimeout('register: submit form', async () => {
    await page.locator('button[type="submit"], button:has-text("Register")').click();
  }, 15000);

  const registerResponse = await withStepTimeout('register: wait for register response', async () => {
    const response = await registerResponsePromise;
    console.log(`✅ register: response received (${response.status()})`);
    return response;
  }, 20000);

  if (registerResponse.status() !== 201) {
    const body = await registerResponse.text().catch(() => '');
    const normalizedBody = body.toLowerCase();
    const isAlreadyExists = (registerResponse.status() === 401 || registerResponse.status() === 409)
      && normalizedBody.includes('already exists');

    console.error('[REGISTER FAILED DEBUG]', {
      status: registerResponse.status(),
      route: registerUrl,
      body,
    });

    if (isAlreadyExists) {
      console.warn('[REGISTER FALLBACK] Customer already exists, attempting login with the same credentials');
      await withStepTimeout('register: login fallback after already-exists', async () => {
        await TestHelpers.loginCustomer(page, credentials, appUrl);
      }, 30000);
      return credentials;
    }

    throw new Error(`Customer register failed: ${registerResponse.status()} ${registerResponse.statusText()} ${body}`);
  }

  await withStepTimeout('register: wait for post-register app state', async () => {
    await Promise.race([
      page.waitForURL(/.*(login|dashboard|home|restaurants|menu|restaurant)/i, { timeout: 10000 }).catch(() => null),
      page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null),
    ]);
    console.log(`ℹ️ register: post-register URL is ${page.url()}`);
  }, 15000);

  return credentials;
}

test.describe('Full Order Lifecycle UI-E2E', () => {
  let orderId: string;
  let customerCredentials = createLifecycleCustomerCredentials();
  const selectors = testSelectors;
  const testOrder = testDataFactory.getTestOrder();
  const driverUser = testDataFactory.getTestDriver();

  test.beforeAll(() => {
    // Reset test data factory with consistent seed for this run
    testDataFactory.resetSeed(1234567890); // Fixed seed for deterministic results
    customerCredentials = createLifecycleCustomerCredentials();
  });

  test.beforeEach(async () => {
    console.log(`🆔 Test Run ID: ${RUN_ID}`);
  });

  test.setTimeout(300000); // 5 minutes for full lifecycle across four apps

  test('Complete Order Lifecycle: Customer → Restaurant → Driver → Admin', async ({ browser }) => {
    console.log(`🆔 Starting Full Order Lifecycle Test (Run: ${RUN_ID})`);

    // Create browser contexts for each app with isolated sessions
    const customerContext = await browser.newContext({
      storageState: undefined, // Fresh session for registration
    });
    const restaurantContext = await browser.newContext({
      storageState: 'playwright/.auth/restaurant.json'
    });
    const driverContext = await browser.newContext({
      storageState: 'playwright/.auth/driver.json'
    });
    const adminContext = await browser.newContext({
      storageState: 'playwright/.auth/admin.json'
    });

    // Create pages for each app
    const customerPage = await customerContext.newPage();
    const restaurantPage = await restaurantContext.newPage();
    const driverPage = await driverContext.newPage();
    const adminPage = await adminContext.newPage();

    try {
      // ============================================
      // PHASE 1: CUSTOMER CREATES ORDER
      // ============================================
      console.log('🚀 Phase 1: Customer creates order');

      await withStepTimeout('phase1 customer initial navigation', async () => {
        console.log(`➡️ lifecycle: phase1 opening customer home (${testUrls.customer})`);
        await customerPage.goto(testUrls.customer);
        await TestHelpers.waitForStablePage(customerPage);
        console.log('✅ lifecycle: phase1 customer home ready');
      });

      await withStepTimeout('phase1 customer registration', async () => {
        console.log('➡️ lifecycle: phase1 registering customer');
        await registerCustomerForLifecycleWithDiagnostics(customerPage, customerCredentials, testUrls.customer);
        console.log('✅ lifecycle: phase1 customer registered');
      });

      await withStepTimeout('phase1 customer registration screenshot', async () => {
        await TestHelpers.takeScreenshot(customerPage, 'customer_registered');
      });

      await withStepTimeout('phase1 restaurant list navigation', async () => {
        console.log('➡️ lifecycle: phase1 opening restaurant list');
        await customerPage.goto(`${testUrls.customer}/restaurants`);
        await testDataFactory.waitForStablePage(customerPage);
        console.log('✅ lifecycle: phase1 restaurant list visible');
      });

      await withStepTimeout('phase1 restaurant selection', async () => {
        const restaurantCard = customerPage.locator('[data-testid="restaurant-card"], .restaurant-card').first();
        await expect(restaurantCard).toBeVisible();
        console.log('✅ lifecycle: phase1 restaurant card visible');
        await restaurantCard.click();
        await customerPage.waitForURL(/\/restaurant\/[^/]+$/);
        await expect(customerPage.locator('[data-testid="menu-content"]')).toBeVisible();
        console.log('✅ lifecycle: phase1 restaurant selected');
        console.log('✅ lifecycle: phase1 menu content visible');
      });

      const addToCartButtons = customerPage.locator('[data-testid="add-to-cart-button"]');

      await withStepTimeout('phase1 add first items to cart', async () => {
        const addToCartButtonCount = await addToCartButtons.count();
        expect(addToCartButtonCount).toBeGreaterThan(0);
        console.log(`✅ lifecycle: phase1 add-to-cart buttons found (${addToCartButtonCount})`);

        console.log('➡️ lifecycle: phase1 adding initial items to cart');
        for (let i = 0; i < Math.min(3, addToCartButtonCount); i += 1) {
          console.log(`➡️ lifecycle: phase1 clicking add-to-cart button ${i + 1}`);
          await addToCartButtons.nth(i).click();
          await customerPage.waitForTimeout(500);
          console.log(`✅ lifecycle: phase1 add-to-cart button ${i + 1} clicked`);
        }

        await expect(customerPage.locator('[data-testid="cart-placeholder"]')).toContainText(/Cart: [1-9]/i);
        await expect.poll(async () => {
          return customerPage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('cart_')).length);
        }).toBeGreaterThan(0);
        console.log('✅ lifecycle: phase1 cart state contains items');
      });

      await withStepTimeout('phase1 minimum order satisfaction', async () => {
        const minOrderSummary = customerPage.locator('.cart-summary-row.min-order');
        const getMissingMinOrderAmount = async () => {
          const summaryText = (await minOrderSummary.textContent().catch(() => '')) || '';
          const match = summaryText.match(/Noch\s+([\d.,]+)\s*€\s*fehlen/i);
          if (!match) {
            return 0;
          }

          return Number(match[1].replace(',', '.'));
        };

        const minimumWarningVisible = async () => (await minOrderSummary.isVisible().catch(() => false))
          && (await getMissingMinOrderAmount()) > 0;

        for (let attempt = 1; attempt <= 10; attempt += 1) {
          const missingAmount = await getMissingMinOrderAmount();

          if (!missingAmount || Number.isNaN(missingAmount)) {
            console.log(`✅ lifecycle: minimum order satisfied after ${attempt - 1} extra attempts`);
            return;
          }

          console.log(`➡️ lifecycle: minimum order still open (${missingAmount.toFixed(2)}€ missing), adding item attempt ${attempt}`);
          const count = await addToCartButtons.count();
          expect(count).toBeGreaterThan(0);
          await addToCartButtons.nth((attempt - 1) % count).click();
          await customerPage.waitForTimeout(300);

          if (!(await minimumWarningVisible())) {
            console.log(`✅ lifecycle: minimum order satisfied after ${attempt} extra attempts`);
            return;
          }
        }

        throw new Error('Minimum order value was not satisfied after 10 add-to-cart attempts');
      });

      await withStepTimeout('phase1 navigate to checkout', async () => {
        console.log('➡️ lifecycle: phase1 navigating to checkout');
        const menuCheckoutButton = customerPage.getByTestId('checkout-button').first();
        await expect(menuCheckoutButton).toBeVisible();
        await menuCheckoutButton.click();
        await customerPage.waitForURL(/\/checkout(?:\?.*)?$/);
        await customerPage.waitForTimeout(500);
        console.log('✅ lifecycle: phase1 checkout reached');
      });

      await withStepTimeout('phase1 checkout state and delivery address', async () => {
        const cartItems = customerPage.locator('[data-testid="cart-item"], .cart-item');
        await expect(customerPage.getByTestId('cart')).toBeVisible();
        await expect.poll(async () => cartItems.count()).toBeGreaterThan(0);
        console.log('✅ lifecycle: phase1 checkout cart has items');

        const addressForm = customerPage.locator('[data-testid="address-form"], .address-form');
        if (await addressForm.isVisible()) {
          console.log('➡️ lifecycle: phase1 filling delivery address');
          await customerPage.locator('input[name="street"]').fill(testOrder.deliveryAddress.street);
          await customerPage.locator('input[name="city"]').fill(testOrder.deliveryAddress.city);
          await customerPage.locator('input[name="zipCode"]').fill(testOrder.deliveryAddress.zipCode);
          await customerPage.locator('input[name="phone"]').fill(testOrder.deliveryAddress.phone);
          console.log('✅ lifecycle: phase1 delivery address filled');
        } else {
          console.log('ℹ️ lifecycle: phase1 delivery address form not visible');
        }

        const paymentMethods = customerPage.locator('[data-testid="payment-methods"], .payment-methods');
        if (await paymentMethods.isVisible()) {
          console.log('➡️ lifecycle: phase1 selecting payment method');
          const cardPayment = customerPage.locator('input[type="radio"][value="card"]');
          if (await cardPayment.isVisible()) {
            await cardPayment.check();
            console.log('✅ lifecycle: phase1 payment method selected');
          }
        }
      });

      await withStepTimeout('phase1 final order submit', async () => {
        console.log('➡️ lifecycle: phase1 preparing final order submit');
        const minOrderSummary = customerPage.locator('.cart-summary-row.min-order');
        const getMissingMinOrderAmount = async () => {
          const summaryText = (await minOrderSummary.textContent().catch(() => '')) || '';
          const match = summaryText.match(/Noch\s+([\d.,]+)\s*€\s*fehlen/i);
          if (!match) {
            return 0;
          }

          return Number(match[1].replace(',', '.'));
        };

        await expect.poll(getMissingMinOrderAmount, { timeout: 10000 }).toBe(0);
        console.log('✅ lifecycle: phase1 minimum order satisfied');

        const orderCreateResponsePromise = customerPage.waitForResponse((response) => {
          const request = response.request();
          return request.method() === 'POST'
            && new URL(response.url()).pathname === '/api/orders/customer';
        }, { timeout: 20000 });
        const cartContainer = customerPage.getByTestId('cart');
        const finalPlaceOrderButton = cartContainer.getByRole('button', { name: /^Place Order$/i });

        await expect(cartContainer).toBeVisible();
        console.log('✅ lifecycle: phase1 checkout/cart visible');
        await expect(finalPlaceOrderButton).toBeVisible();
        console.log('✅ lifecycle: phase1 final Place Order button visible');
        await expect(finalPlaceOrderButton).toBeEnabled();
        console.log('✅ lifecycle: phase1 final Place Order button enabled');
        console.log('➡️ lifecycle: phase1 clicking final Place Order');

        await Promise.all([
          orderCreateResponsePromise,
          finalPlaceOrderButton.click(),
        ]);
        console.log('✅ lifecycle: phase1 final Place Order click completed');

        const orderCreateResponse = await orderCreateResponsePromise;
        console.log(`✅ lifecycle: phase1 order response received (${orderCreateResponse.status()})`);
        const createdOrder = await orderCreateResponse.json().catch(() => ({}));
        orderId = createdOrder.id || orderId;
        if (!orderId) {
          throw new Error('Order creation response did not include an id');
        }
        console.log(`✅ lifecycle: phase1 order id resolved (${orderId})`);
      });

      // Complete payment in the modal if the UI shows one, otherwise accept
      // the direct navigation flow after the order is created.
      const paymentModal = customerPage.getByTestId('payment-modal');
      const orderTrackingPage = customerPage.getByTestId('order-tracking-page');

      await Promise.race([
        paymentModal.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
        customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: 15000 }).catch(() => null),
      ]);

      if (await paymentModal.isVisible().catch(() => false)) {
        const cardForm = customerPage.locator('.card-form');
        if (await cardForm.isVisible()) {
          await customerPage.getByLabel(/karteninhaber/i).fill(testOrder.customer.name);
          await customerPage.getByLabel(/kartennummer/i).fill('4242 4242 4242 4242');
          await customerPage.getByLabel(/gültig bis/i).fill('12/34');
          await customerPage.getByLabel(/cvc/i).fill('123');
        }

        const paymentConfirmButton = customerPage.getByTestId('payment-confirm-button');
        await expect(paymentConfirmButton).toBeVisible();
        await paymentConfirmButton.click();
      } else {
        console.log('ℹ️ Payment modal not shown, waiting for direct order navigation');
      }

      if (!/\/orders\/[^/?]+(?:\?.*)?$/.test(customerPage.url())) {
        console.log(`ℹ️ Navigating directly to created order ${orderId}`);
        await customerPage.goto(`${testUrls.customer}/orders/${orderId}`);
      }

      await customerPage.waitForURL(/\/orders\/[^/?]+(?:\?.*)?$/, { timeout: 20000 });
      await expect(orderTrackingPage).toBeVisible({ timeout: 20000 });

      // Get order ID from URL or response
      const orderUrlMatch = customerPage.url().match(/orders\/([^/?]+)/);
      if (orderUrlMatch) {
        orderId = orderUrlMatch[1];
        console.log(`📦 Order created: ${orderId}`);
      }

      // ============================================
      // PHASE 2: RESTAURANT SETS READY FOR PICKUP
      // ============================================
      console.log('🍽️  Phase 2: Restaurant sets order ready for pickup');

      // Restaurant already authenticated via storageState
      await restaurantPage.goto(testUrls.restaurant);
      await TestHelpers.waitForStablePage(restaurantPage);

      // Verify we're logged in
      await expect(restaurantPage).toHaveURL(/.*(dashboard|home)/i);

      // Navigate to orders
      await restaurantPage.locator(selectors.navOrders).click();

      // Find the order and mark as ready
      const orderCard = restaurantPage.locator(selectors.orderCard).filter({ hasText: orderId || testOrder.id });
      await expect(orderCard).toBeVisible();

      const readyBtn = orderCard.locator(selectors.readyForPickupBtn);
      await readyBtn.click();

      // Verify status changed
      await expect(orderCard.locator(selectors.orderStatus)).toContainText('READY_FOR_PICKUP');

      console.log(`✅ Restaurant marked order ${orderId} as ready for pickup`);

      // ============================================
      // PHASE 3: DRIVER ACCEPTS AND DELIVERS ORDER
      // ============================================
      console.log('🚚 Phase 3: Driver accepts and delivers order');

      // Driver already authenticated via storageState
      await driverPage.goto(testUrls.driver);
      await TestHelpers.waitForStablePage(driverPage);

      // Verify we're logged in
      await expect(driverPage).toHaveURL(/.*(dashboard|home)/i);

      // Navigate to available orders
      await driverPage.locator('a[href*="orders"], nav a:has-text("Orders")').click();

      // Find available order
      const availableOrder = driverPage.locator(selectors.orderCard).first();
      await expect(availableOrder).toBeVisible();

      // Accept order
      await availableOrder.locator(selectors.acceptOrderBtn).click();

      // Verify accepted status
      await expect(availableOrder.locator(selectors.orderStatus)).toContainText('IN_TRANSIT');

      console.log(`✅ Driver accepted order ${orderId}`);

      // Mark as delivered
      await availableOrder.locator(selectors.markDeliveredBtn).click();

      // Verify delivered status
      await expect(availableOrder.locator(selectors.orderStatus)).toContainText('DELIVERED');

      console.log(`✅ Driver marked order ${orderId} as delivered`);

      // ============================================
      // PHASE 4: ADMIN VERIFIES FINAL STATE
      // ============================================
      console.log('👨‍💼 Phase 4: Admin verifies order completion');

      // Admin already authenticated via storageState
      await adminPage.goto(testUrls.admin);
      await TestHelpers.waitForStablePage(adminPage);

      // Verify we're logged in
      await expect(adminPage).toHaveURL(/.*(dashboard|home)/i);

      // Navigate to orders management
      await adminPage.locator('a[href*="orders"], nav a:has-text("Orders")').click();

      // Find the completed order
      const adminOrderRow = adminPage.locator(selectors.adminOrderRow).filter({ hasText: orderId || testOrder.id });
      await expect(adminOrderRow).toBeVisible();

      // Verify final status and driver assignment
      await expect(adminOrderRow.locator('[data-testid="status"]')).toContainText('DELIVERED');
      await expect(adminOrderRow.locator('[data-testid="driver-id"], [data-testid="assigned-driver"]')).toContainText(driverUser.id);

      console.log(`✅ Admin verified order ${orderId}: DELIVERED with driver ${driverUser.id}`);

      // ============================================
      // FINAL VERIFICATION: CROSS-APP CONSISTENCY
      // ============================================
      console.log('🔍 Final verification: Cross-app consistency check');

      // Check order status in all apps
      const customerOrderStatus = customerPage.locator(selectors.orderStatus);
      const restaurantOrderStatus = restaurantPage.locator(selectors.orderStatus);
      const driverOrderStatus = driverPage.locator(selectors.orderStatus);

      // All should show DELIVERED
      await expect(customerOrderStatus).toContainText('DELIVERED');
      await expect(restaurantOrderStatus).toContainText('DELIVERED');
      await expect(driverOrderStatus).toContainText('DELIVERED');

      console.log('🎉 SUCCESS: Full order lifecycle completed successfully!');
      console.log(`   Order ID: ${orderId}`);
      console.log(`   Final Status: DELIVERED`);
      console.log(`   Assigned Driver: ${driverUser.id}`);
      console.log(`   Total Amount: €${testOrder.totalAmount}`);

    } finally {
      // Cleanup: Close all contexts and take final screenshots if test failed
      try {
        await TestHelpers.takeScreenshot(customerPage, 'final_customer_state');
        await TestHelpers.takeScreenshot(restaurantPage, 'final_restaurant_state');
        await TestHelpers.takeScreenshot(driverPage, 'final_driver_state');
        await TestHelpers.takeScreenshot(adminPage, 'final_admin_state');
      } catch (error) {
        console.warn('Failed to take final screenshots:', error);
      }

      await customerContext.close();
      await restaurantContext.close();
      await driverContext.close();
      await adminContext.close();
    }
  });

  test('API Health Check Before UI Tests', async () => {
    // This test ensures backend is ready before running UI tests
    const endpoints = TestHelpers.getApiEndpoints();

    // Test health endpoint
    const response = await fetch(endpoints.health);
    expect(response.status).toBe(200);

    const healthData = await response.json();
    expect(healthData.status).toBe('ok');

    console.log(`✅ Backend health check passed (Run: ${RUN_ID})`);
  });
});

import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { test, TestHelpers, testUrls, testSelectors } from './test-helpers';
import { testDataFactory } from '../../test-utils/test-data-factory';

// Generate unique run ID for test isolation
const RUN_ID = process.env.GITHUB_RUN_ID
  || process.env.RUN_ID
  || `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT || '1';

function createLifecycleCustomerCredentials() {
  const token = `${RUN_ID}.${RUN_ATTEMPT}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.${randomUUID()}`;
  return {
    email: `customer.lifecycle.fullorder.${token}@example.test`,
    password: `customer.${token}`,
    name: `Full Order Lifecycle Customer ${token}`,
    phone: '+43 123 456 789',
  };
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

      await customerPage.goto(testUrls.customer);
      await TestHelpers.waitForStablePage(customerPage);

      // Customer registration (fresh session)
      await TestHelpers.registerCustomer(customerPage, customerCredentials, testUrls.customer);

      // Take screenshot for debugging if needed
      await TestHelpers.takeScreenshot(customerPage, 'customer_registered');

      // Browse restaurants
      await customerPage.goto(`${testUrls.customer}/restaurants`);
      await testDataFactory.waitForStablePage(customerPage);

      const restaurantCard = customerPage.locator('[data-testid="restaurant-card"], .restaurant-card').first();
      await expect(restaurantCard).toBeVisible();
      await restaurantCard.click();
      await customerPage.waitForURL(/\/restaurant\/[^/]+$/);
      await expect(customerPage.locator('[data-testid="menu-content"]')).toBeVisible();

      // Add items to cart and checkout
      const addToCartButtons = customerPage.locator('[data-testid="add-to-cart-button"]');
      const addToCartButtonCount = await addToCartButtons.count();
      expect(addToCartButtonCount).toBeGreaterThan(0);

      // Add first 3 items
      for (let i = 0; i < Math.min(3, await addToCartButtons.count()); i++) {
        await addToCartButtons.nth(i).click();
        await customerPage.waitForTimeout(500);
      }

      await expect(customerPage.locator('[data-testid="cart-placeholder"]')).toContainText(/Cart: [1-9]/i);

      // Der Checkout wird in der echten App direkt über /checkout gerendert.
      // Ein /cart-Fallback wäre hier falsch, da diese Route nicht existiert.
      await customerPage.goto(`${testUrls.customer}/checkout`);
      await customerPage.waitForURL(/\/checkout(?:\?.*)?$/);

      // Verify cart has items on the checkout page
      const cartItems = customerPage.locator('[data-testid="cart-item"], .cart-item');
      const cartItemCount = await cartItems.count();
      expect(cartItemCount).toBeGreaterThan(0);

      // Proceed to checkout
      const checkoutBtn = customerPage.locator('button[data-testid="checkout-button"], button:has-text("Place Order"), button:has-text("Checkout")').first();
      await expect(checkoutBtn).toBeVisible();
      await checkoutBtn.click();

      // Fill delivery address
      const addressForm = customerPage.locator('[data-testid="address-form"], .address-form');
      if (await addressForm.isVisible()) {
        await customerPage.locator('input[name="street"]').fill(testOrder.deliveryAddress.street);
        await customerPage.locator('input[name="city"]').fill(testOrder.deliveryAddress.city);
        await customerPage.locator('input[name="zipCode"]').fill(testOrder.deliveryAddress.zipCode);
        await customerPage.locator('input[name="phone"]').fill(testOrder.deliveryAddress.phone);
      }

      // Select payment method (skip actual payment in E2E)
      const paymentMethods = customerPage.locator('[data-testid="payment-methods"], .payment-methods');
      if (await paymentMethods.isVisible()) {
        const cardPayment = customerPage.locator('input[type="radio"][value="card"]');
        if (await cardPayment.isVisible()) {
          await cardPayment.check();
        }
      }

      // Place order
      const placeOrderBtn = customerPage.locator('button[data-testid="place-order"], .place-order, button:has-text("Place Order")');
      await placeOrderBtn.click();

      // Verify order confirmation
      await expect(customerPage.locator('text=/order placed|order confirmed|bestellung erfolgreich/i')).toBeVisible();

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

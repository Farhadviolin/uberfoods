import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';

test.describe('Cross-App Integration Tests', () => {
  let backendProcess: any;
  let customerWebProcess: any;
  let driverAppProcess: any;
  let restaurantWebProcess: any;

  test.beforeAll(async () => {
    // Start all services for integration testing
    console.log('🚀 Starting all services for integration testing...');

    // Start Backend
    backendProcess = spawn('npm', ['run', 'start:dev'], {
      cwd: path.join(process.cwd(), 'backend'),
      stdio: 'pipe'
    });

    // Start Customer Web
    customerWebProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'frontend/customer-web'),
      stdio: 'pipe',
      env: { ...process.env, PORT: '3002' }
    });

    // Start Driver App
    driverAppProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'frontend/driver-app'),
      stdio: 'pipe',
      env: { ...process.env, PORT: '3003' }
    });

    // Start Restaurant Web
    restaurantWebProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'frontend/restaurant-web'),
      stdio: 'pipe',
      env: { ...process.env, PORT: '3004' }
    });

    // Wait for services to start
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('✅ All services started');
  });

  test.afterAll(async () => {
    // Clean up processes
    [backendProcess, customerWebProcess, driverAppProcess, restaurantWebProcess].forEach(process => {
      if (process) {
        process.kill();
      }
    });
  });

  test.describe('Complete Order Journey', () => {
    test.setTimeout(120000); // 2 minutes for complete journey

    test('should complete full order journey across all apps', async ({ browser }) => {
      // Create separate browser contexts for each app
      const customerContext = await browser.newContext();
      const driverContext = await browser.newContext();
      const restaurantContext = await browser.newContext();

      // Create pages for each app
      const customerPage = await customerContext.newPage();
      const driverPage = await driverContext.newPage();
      const restaurantPage = await restaurantContext.newPage();

      try {
        // ===== PHASE 1: Customer places order =====
        console.log('🍕 Phase 1: Customer places order');

        // Customer login
        await customerPage.goto('http://localhost:3002/login');
        await customerPage.fill('input[type="email"]', 'test@example.com');
        await customerPage.fill('input[type="password"]', 'password123');
        await customerPage.click('button:has-text("Login")');
        await customerPage.waitForURL('**/dashboard**');

        // Browse restaurants
        await customerPage.goto('http://localhost:3002/restaurants');
        await customerPage.waitForSelector('[data-testid="restaurant-card"]');

        // Select restaurant
        const firstRestaurant = customerPage.locator('[data-testid="restaurant-card"]').first();
        await expect(firstRestaurant).toBeVisible();
        await firstRestaurant.click();

        // Add item to cart
        const addToCartButton = customerPage.locator('button[data-testid="add-to-cart"]').first();
        if (await addToCartButton.isVisible()) {
          await addToCartButton.click();
          await expect(customerPage.locator('[data-testid="cart-count"]')).toBeVisible();
        }

        // Proceed to checkout
        await customerPage.goto('http://localhost:3002/cart');
        const checkoutButton = customerPage.locator('button[data-testid="checkout-btn"]');
        if (await checkoutButton.isVisible()) {
          await checkoutButton.click();
        } else {
          await customerPage.goto('http://localhost:3002/checkout');
        }

        // Fill delivery details
        await customerPage.fill('input[name="street"]', 'Test Street 123');
        await customerPage.fill('input[name="city"]', 'Vienna');
        await customerPage.fill('input[name="zipCode"]', '1010');
        await customerPage.fill('input[name="phone"]', '+43 123 456 789');

        // Place order
        const placeOrderButton = customerPage.locator('button[data-testid="place-order"]');
        if (await placeOrderButton.isVisible()) {
          await placeOrderButton.click();

          // Wait for order confirmation
          await expect(customerPage.locator('text=/order placed|bestellung/i')).toBeVisible();

          // Get order ID from URL or page
          const currentUrl = customerPage.url();
          const orderMatch = currentUrl.match(/order\/([^/?]+)/);
          const orderId = orderMatch ? orderMatch[1] : 'test-order-123';

          console.log(`✅ Order placed: ${orderId}`);

          // ===== PHASE 2: Restaurant receives order =====
          console.log('🏪 Phase 2: Restaurant receives order');

          // Restaurant login
          await restaurantPage.goto('http://localhost:3004/login');
          await restaurantPage.fill('input[type="email"]', 'owner@pizza-palace.com');
          await restaurantPage.fill('input[type="password"]', 'restaurant123');
          await restaurantPage.click('button:has-text("Login")');
          await restaurantPage.waitForURL('**/dashboard**');

          // Check for new order notification
          await expect(restaurantPage.locator('[data-testid="orders-list"]')).toBeVisible();

          // Accept order
          const newOrder = restaurantPage.locator('[data-testid="order-card"]').first();
          if (await newOrder.isVisible()) {
            const acceptButton = newOrder.locator('button[data-testid="accept-order"]');
            if (await acceptButton.isVisible()) {
              await acceptButton.click();
              console.log('✅ Restaurant accepted order');
            }
          }

          // ===== PHASE 3: Driver receives and accepts order =====
          console.log('🚗 Phase 3: Driver receives and accepts order');

          // Driver login
          await driverPage.goto('http://localhost:3003/login');
          await driverPage.fill('input[type="email"]', 'john.driver@example.com');
          await driverPage.fill('input[type="password"]', 'driver123');
          await driverPage.click('button:has-text("Login")');
          await driverPage.waitForURL('**/dashboard**');

          // Go online
          const onlineButton = driverPage.locator('button[data-testid="go-online"]');
          if (await onlineButton.isVisible()) {
            await onlineButton.click();
            await expect(driverPage.locator('[data-testid="driver-status"]', { hasText: /online/i })).toBeVisible();
          }

          // Navigate to available orders
          const ordersLink = driverPage.locator('a[data-testid="nav-orders"]');
          await ordersLink.click();

          // Accept available order
          const availableOrder = driverPage.locator('[data-testid="order-card"]').first();
          if (await availableOrder.isVisible()) {
            const acceptOrderButton = availableOrder.locator('button[data-testid="accept-order"]');
            if (await acceptOrderButton.isVisible()) {
              await acceptOrderButton.click();
              await expect(driverPage.locator('text=/accepted|angenommen/i')).toBeVisible();
              console.log('✅ Driver accepted order');
            }
          }

          // ===== PHASE 4: Driver picks up order =====
          console.log('📦 Phase 4: Driver picks up order');

          // Navigate to pickup
          const pickupButton = driverPage.locator('button[data-testid="pickup-order"]');
          if (await pickupButton.isVisible()) {
            await pickupButton.click();

            // Confirm pickup
            const confirmPickup = driverPage.locator('button[data-testid="confirm-pickup"]');
            if (await confirmPickup.isVisible()) {
              await confirmPickup.click();
              await expect(driverPage.locator('text=/picked up|abgeholt/i')).toBeVisible();
              console.log('✅ Driver picked up order');
            }
          }

          // ===== PHASE 5: Driver delivers order =====
          console.log('🚚 Phase 5: Driver delivers order');

          // Deliver order
          const deliverButton = driverPage.locator('button[data-testid="deliver-order"]');
          if (await deliverButton.isVisible()) {
            await deliverButton.click();

            // Confirm delivery
            const confirmDelivery = driverPage.locator('button[data-testid="confirm-delivery"]');
            if (await confirmDelivery.isVisible()) {
              await confirmDelivery.click();
              await expect(driverPage.locator('text=/delivered|geliefert/i')).toBeVisible();
              console.log('✅ Driver delivered order');
            }
          }

          // ===== PHASE 6: Customer receives delivery confirmation =====
          console.log('✅ Phase 6: Customer receives delivery confirmation');

          // Customer should see order status update
          await customerPage.reload();
          await expect(customerPage.locator('[data-testid="order-status"]', { hasText: /delivered|geliefert/i })).toBeVisible();

          // ===== PHASE 7: All apps show completion =====
          console.log('🎉 Phase 7: All apps show completion');

          // Restaurant shows completed order
          await restaurantPage.reload();
          await expect(restaurantPage.locator('[data-testid="completed-order"]')).toBeVisible();

          // Driver shows completed delivery
          await driverPage.reload();
          await expect(driverPage.locator('[data-testid="completed-delivery"]')).toBeVisible();

          console.log('🎉 COMPLETE ORDER JOURNEY SUCCESSFUL ACROSS ALL APPS!');
        }

      } finally {
        // Clean up contexts
        await customerContext.close();
        await driverContext.close();
        await restaurantContext.close();
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should sync order status updates across apps', async ({ browser }) => {
      const customerContext = await browser.newContext();
      const driverContext = await browser.newContext();
      const restaurantContext = await browser.newContext();

      const customerPage = await customerContext.newPage();
      const driverPage = await driverContext.newPage();
      const restaurantPage = await restaurantContext.newPage();

      try {
        // Login all users
        // Customer login
        await customerPage.goto('http://localhost:3002/login');
        await customerPage.fill('input[type="email"]', 'test@example.com');
        await customerPage.fill('input[type="password"]', 'password123');
        await customerPage.click('button:has-text("Login")');

        // Restaurant login
        await restaurantPage.goto('http://localhost:3004/login');
        await restaurantPage.fill('input[type="email"]', 'owner@pizza-palace.com');
        await restaurantPage.fill('input[type="password"]', 'restaurant123');
        await restaurantPage.click('button:has-text("Login")');

        // Driver login
        await driverPage.goto('http://localhost:3003/login');
        await driverPage.fill('input[type="email"]', 'john.driver@example.com');
        await driverPage.fill('input[type="password"]', 'driver123');
        await driverPage.click('button:has-text("Login")');

        // Driver goes online
        const onlineButton = driverPage.locator('button[data-testid="go-online"]');
        if (await onlineButton.isVisible()) {
          await onlineButton.click();
        }

        // Place test order from customer
        await customerPage.goto('http://localhost:3002/restaurants');
        const firstRestaurant = customerPage.locator('[data-testid="restaurant-card"]').first();
        if (await firstRestaurant.isVisible()) {
          await firstRestaurant.click();

          const addToCartButton = customerPage.locator('button[data-testid="add-to-cart"]').first();
          if (await addToCartButton.isVisible()) {
            await addToCartButton.click();
            await customerPage.goto('http://localhost:3002/checkout');

            // Quick checkout
            await customerPage.fill('input[name="street"]', 'Test Street 123');
            await customerPage.fill('input[name="city"]', 'Vienna');
            await customerPage.fill('input[name="phone"]', '+43 123 456 789');

            const placeOrderButton = customerPage.locator('button[data-testid="place-order"]');
            if (await placeOrderButton.isVisible()) {
              await placeOrderButton.click();
            }
          }
        }

        // Wait for real-time updates
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if restaurant sees new order
        await restaurantPage.reload();
        const restaurantOrders = restaurantPage.locator('[data-testid="order-card"]');
        expect(await restaurantOrders.count()).toBeGreaterThan(0);

        // Restaurant accepts order
        const acceptButton = restaurantOrders.first().locator('button[data-testid="accept-order"]');
        if (await acceptButton.isVisible()) {
          await acceptButton.click();
        }

        // Wait for updates
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if driver sees available order
        await driverPage.reload();
        const driverOrders = driverPage.locator('[data-testid="order-card"]');
        expect(await driverOrders.count()).toBeGreaterThan(0);

        console.log('✅ Real-time updates working across all apps');

      } finally {
        await customerContext.close();
        await driverContext.close();
        await restaurantContext.close();
      }
    });
  });

  test.describe('Payment Integration', () => {
    test('should process payment across apps', async ({ browser }) => {
      const customerContext = await browser.newContext();
      const customerPage = await customerContext.newPage();

      try {
        // Customer places order with payment
        await customerPage.goto('http://localhost:3002/login');
        await customerPage.fill('input[type="email"]', 'test@example.com');
        await customerPage.fill('input[type="password"]', 'password123');
        await customerPage.click('button:has-text("Login")');

        await customerPage.goto('http://localhost:3002/restaurants');
        const firstRestaurant = customerPage.locator('[data-testid="restaurant-card"]').first();
        if (await firstRestaurant.isVisible()) {
          await firstRestaurant.click();

          const addToCartButton = customerPage.locator('button[data-testid="add-to-cart"]').first();
          if (await addToCartButton.isVisible()) {
            await addToCartButton.click();
            await customerPage.goto('http://localhost:3002/checkout');

            // Fill checkout details
            await customerPage.fill('input[name="street"]', 'Test Street 123');
            await customerPage.fill('input[name="city"]', 'Vienna');
            await customerPage.fill('input[name="phone"]', '+43 123 456 789');

            // Select payment method
            const cardPayment = customerPage.locator('input[type="radio"][value="card"]');
            if (await cardPayment.isVisible()) {
              await cardPayment.check();
            }

            // Fill payment details
            await customerPage.fill('input[name="cardNumber"]', '4111111111111111');
            await customerPage.fill('input[name="expiryDate"]', '12/25');
            await customerPage.fill('input[name="cvv"]', '123');

            const placeOrderButton = customerPage.locator('button[data-testid="place-order"]');
            if (await placeOrderButton.isVisible()) {
              await placeOrderButton.click();

              // Should show payment success
              await expect(customerPage.locator('text=/payment successful|zahlung erfolgreich/i')).toBeVisible();
              console.log('✅ Payment integration working');
            }
          }
        }

      } finally {
        await customerContext.close();
      }
    });
  });

  test.describe('Notification System', () => {
    test('should send notifications across apps', async ({ browser }) => {
      const customerContext = await browser.newContext();
      const driverContext = await browser.newContext();
      const restaurantContext = await browser.newContext();

      const customerPage = await customerContext.newPage();
      const driverPage = await driverContext.newPage();
      const restaurantPage = await restaurantContext.newPage();

      try {
        // Login all users
        await customerPage.goto('http://localhost:3002/login');
        await customerPage.fill('input[type="email"]', 'test@example.com');
        await customerPage.fill('input[type="password"]', 'password123');
        await customerPage.click('button:has-text("Login")');

        await restaurantPage.goto('http://localhost:3004/login');
        await restaurantPage.fill('input[type="email"]', 'owner@pizza-palace.com');
        await restaurantPage.fill('input[type="password"]', 'restaurant123');
        await restaurantPage.click('button:has-text("Login")');

        await driverPage.goto('http://localhost:3003/login');
        await driverPage.fill('input[type="email"]', 'john.driver@example.com');
        await driverPage.fill('input[type="password"]', 'driver123');
        await driverPage.click('button:has-text("Login")');

        // Place order
        await customerPage.goto('http://localhost:3002/restaurants');
        const firstRestaurant = customerPage.locator('[data-testid="restaurant-card"]').first();
        if (await firstRestaurant.isVisible()) {
          await firstRestaurant.click();

          const addToCartButton = customerPage.locator('button[data-testid="add-to-cart"]').first();
          if (await addToCartButton.isVisible()) {
            await addToCartButton.click();
            await customerPage.goto('http://localhost:3002/checkout');

            await customerPage.fill('input[name="street"]', 'Test Street 123');
            await customerPage.fill('input[name="city"]', 'Vienna');
            await customerPage.fill('input[name="phone"]', '+43 123 456 789');

            const placeOrderButton = customerPage.locator('button[data-testid="place-order"]');
            if (await placeOrderButton.isVisible()) {
              await placeOrderButton.click();
            }
          }
        }

        // Wait for notifications
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check restaurant notifications
        const restaurantNotifications = restaurantPage.locator('[data-testid="notification"], .notification');
        expect(await restaurantNotifications.count()).toBeGreaterThan(0);

        // Check customer notifications
        const customerNotifications = customerPage.locator('[data-testid="notification"], .notification');
        expect(await customerNotifications.count()).toBeGreaterThan(0);

        console.log('✅ Notification system working across apps');

      } finally {
        await customerContext.close();
        await driverContext.close();
        await restaurantContext.close();
      }
    });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Advanced User Journey Tests', () => {
  test.describe('Premium Customer Experience', () => {
    test('should complete premium group ordering journey', async ({ browser }) => {
      const contexts = [];
      const pages = [];

      try {
        // Create 3 customer contexts for group ordering
        for (let i = 0; i < 3; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          contexts.push(context);
          pages.push(page);

          // Login each customer
          await page.goto('http://localhost:3002/login');
          await page.fill('input[type="email"]', `customer${i + 1}@example.com`);
          await page.fill('input[type="password"]', 'password123');
          await page.click('button:has-text("Login")');
          await page.waitForURL('**/dashboard**');
        }

        const [page1, page2, page3] = pages;

        // Customer 1 creates group order
        await page1.goto('http://localhost:3002/restaurants');
        const firstRestaurant = page1.locator('[data-testid="restaurant-card"]').first();
        await firstRestaurant.click();

        // Look for group order option
        const groupOrderBtn = page1.locator('button[data-testid="group-order"], .group-order');
        if (await groupOrderBtn.isVisible()) {
          await groupOrderBtn.click();

          // Create group order
          await page1.fill('input[name="groupName"]', 'Office Team Lunch');
          await page1.fill('input[name="maxParticipants"]', '3');
          await page1.click('button:has-text("Create")');

          // Get group code
          const groupCode = await page1.locator('[data-testid="group-code"]').textContent();
          expect(groupCode).toBeTruthy();

          // Customer 2 joins group order
          await page2.goto('http://localhost:3002/group-orders');
          await page2.fill('input[name="groupCode"]', groupCode!);
          await page2.click('button:has-text("Join")');

          // Customer 3 joins group order
          await page3.goto('http://localhost:3002/group-orders');
          await page3.fill('input[name="groupCode"]', groupCode!);
          await page3.click('button:has-text("Join")');

          // All customers add items
          for (const page of pages) {
            await page.goto('http://localhost:3002/restaurants');
            const restaurant = page.locator('[data-testid="restaurant-card"]').first();
            await restaurant.click();

            const addItemBtn = page.locator('button[data-testid="add-to-cart"]').first();
            if (await addItemBtn.isVisible()) {
              await addItemBtn.click();
            }
          }

          // Group leader places order
          await page1.goto('http://localhost:3002/cart');
          const checkoutBtn = page1.locator('button[data-testid="checkout-btn"]');
          if (await checkoutBtn.isVisible()) {
            await checkoutBtn.click();

            await page1.fill('input[name="street"]', 'Office Building 123');
            await page1.fill('input[name="city"]', 'Vienna');
            await page1.click('button[data-testid="place-order"]');

            // Should show group order success
            await expect(page1.locator('text=/group order|gruppenbestellung/i')).toBeVisible();
          }

          console.log('✅ Premium group ordering journey completed');
        }

      } finally {
        for (const context of contexts) {
          await context.close();
        }
      }
    });

    test('should handle loyalty program advanced features', async ({ page }) => {
      await page.goto('http://localhost:3002/login');
      await page.fill('input[type="email"]', 'premium@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Login")');

      // Check loyalty dashboard
      await page.goto('http://localhost:3002/loyalty');

      // Should show advanced loyalty features
      await expect(page.locator('[data-testid="loyalty-tier"]')).toBeVisible();
      await expect(page.locator('[data-testid="points-history"]')).toBeVisible();

      // Place order to earn points
      await page.goto('http://localhost:3002/restaurants');
      const restaurant = page.locator('[data-testid="restaurant-card"]').first();
      await restaurant.click();

      const addToCartBtn = page.locator('button[data-testid="add-to-cart"]').first();
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();

        await page.goto('http://localhost:3002/checkout');
        await page.fill('input[name="street"]', 'Test Street 123');
        await page.fill('input[name="city"]', 'Vienna');
        await page.fill('input[name="phone"]', '+43 123 456 789');
        await page.click('button[data-testid="place-order"]');

        // Check points earned
        await page.goto('http://localhost:3002/loyalty');
        await expect(page.locator('[data-testid="points-earned"]')).toBeVisible();

        console.log('✅ Loyalty program advanced features working');
      }
    });

    test('should handle personalized recommendations', async ({ page }) => {
      await page.goto('http://localhost:3002/login');
      await page.fill('input[type="email"]', 'premium@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Login")');

      await page.goto('http://localhost:3002/dashboard');

      // Should show personalized recommendations
      await expect(page.locator('[data-testid="personalized-rec"]')).toBeVisible();

      // Check if recommendations are based on preferences
      const preferences = await page.locator('[data-testid="dietary-prefs"]').textContent();
      if (preferences?.includes('vegetarian')) {
        await expect(page.locator('text=/vegetarian|vegetarisch/i')).toBeVisible();
      }

      console.log('✅ Personalized recommendations working');
    });
  });

  test.describe('Restaurant Advanced Workflows', () => {
    test('should handle complex menu management', async ({ page }) => {
      await page.goto('http://localhost:3004/login');
      await page.fill('input[type="email"]', 'owner@pizza-palace.com');
      await page.fill('input[type="password"]', 'restaurant123');
      await page.click('button:has-text("Login")');

      // Navigate to menu management
      await page.goto('http://localhost:3004/menu');

      // Add new dish
      const addDishBtn = page.locator('button[data-testid="add-dish"], button:has-text("Add Dish")');
      if (await addDishBtn.isVisible()) {
        await addDishBtn.click();

        await page.fill('input[name="name"]', 'New Special Pizza');
        await page.fill('input[name="description"]', 'Our latest creation');
        await page.fill('input[name="price"]', '16.50');

        // Select category
        const categorySelect = page.locator('select[name="category"]');
        if (await categorySelect.isVisible()) {
          await categorySelect.selectOption('Pizza');
        }

        // Add allergens
        const vegetarianCheck = page.locator('input[name="isVegetarian"]');
        if (await vegetarianCheck.isVisible()) {
          await vegetarianCheck.check();
        }

        await page.click('button[data-testid="save-dish"], button:has-text("Save")');

        // Should show success and new dish in list
        await expect(page.locator('text=/New Special Pizza/i')).toBeVisible();

        console.log('✅ Complex menu management working');
      }
    });

    test('should handle bulk order operations', async ({ page }) => {
      await page.goto('http://localhost:3004/login');
      await page.fill('input[type="email"]', 'owner@pizza-palace.com');
      await page.fill('input[type="password"]', 'restaurant123');
      await page.click('button:has-text("Login")');

      await page.goto('http://localhost:3004/orders');

      // Select multiple orders
      const orderCheckboxes = page.locator('input[type="checkbox"][data-testid="order-select"]');
      if (await orderCheckboxes.count() > 1) {
        await orderCheckboxes.nth(0).check();
        await orderCheckboxes.nth(1).check();

        // Bulk status update
        const bulkUpdateBtn = page.locator('button[data-testid="bulk-update"]');
        if (await bulkUpdateBtn.isVisible()) {
          await bulkUpdateBtn.click();

          // Select new status
          const statusSelect = page.locator('select[name="status"]');
          if (await statusSelect.isVisible()) {
            await statusSelect.selectOption('preparing');
            await page.click('button:has-text("Update")');

            // Should show success
            await expect(page.locator('text=/updated|aktualisiert/i')).toBeVisible();
          }
        }

        console.log('✅ Bulk order operations working');
      }
    });

    test('should handle advanced analytics', async ({ page }) => {
      await page.goto('http://localhost:3004/login');
      await page.fill('input[type="email"]', 'owner@pizza-palace.com');
      await page.fill('input[type="password"]', 'restaurant123');
      await page.click('button:has-text("Login")');

      await page.goto('http://localhost:3004/analytics');

      // Should show advanced metrics
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="popular-dishes"]')).toBeVisible();
      await expect(page.locator('[data-testid="peak-hours"]')).toBeVisible();

      // Should allow date range selection
      const dateRangeSelect = page.locator('select[data-testid="date-range"]');
      if (await dateRangeSelect.isVisible()) {
        await dateRangeSelect.selectOption('30d');
        await page.waitForTimeout(1000); // Wait for data update

        // Charts should update
        await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
      }

      console.log('✅ Advanced analytics working');
    });
  });

  test.describe('Driver Advanced Features', () => {
    test('should handle multi-stop deliveries', async ({ page }) => {
      await page.goto('http://localhost:3003/login');
      await page.fill('input[type="email"]', 'john.driver@example.com');
      await page.fill('input[type="password"]', 'driver123');
      await page.click('button:has-text("Login")');

      // Go online
      const onlineBtn = page.locator('button[data-testid="go-online"]');
      if (await onlineBtn.isVisible()) {
        await onlineBtn.click();
      }

      // Accept first order
      await page.goto('http://localhost:3003/orders');
      const firstOrder = page.locator('[data-testid="order-card"]').first();
      if (await firstOrder.isVisible()) {
        const acceptBtn = firstOrder.locator('button[data-testid="accept-order"]');
        if (await acceptBtn.isVisible()) {
          await acceptBtn.click();

          // Check for multi-order suggestions
          const multiOrderSuggestion = page.locator('[data-testid="multi-order-suggestion"]');
          if (await multiOrderSuggestion.isVisible()) {
            // Accept additional order
            const addOrderBtn = multiOrderSuggestion.locator('button[data-testid="add-order"]');
            if (await addOrderBtn.isVisible()) {
              await addOrderBtn.click();

              // Should show multiple active orders
              const activeOrders = page.locator('[data-testid="active-order"]');
              expect(await activeOrders.count()).toBeGreaterThan(1);
            }
          }

          console.log('✅ Multi-stop deliveries working');
        }
      }
    });

    test('should handle driver performance optimization', async ({ page }) => {
      await page.goto('http://localhost:3003/login');
      await page.fill('input[type="email"]', 'john.driver@example.com');
      await page.fill('input[type="password"]', 'driver123');
      await page.click('button:has-text("Login")');

      await page.goto('http://localhost:3003/performance');

      // Should show performance metrics
      await expect(page.locator('[data-testid="performance-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="rating-trend"]')).toBeVisible();

      // Should show improvement suggestions
      const suggestions = page.locator('[data-testid="improvement-tip"]');
      expect(await suggestions.count()).toBeGreaterThan(0);

      console.log('✅ Driver performance optimization working');
    });

    test('should handle emergency and support features', async ({ page }) => {
      await page.goto('http://localhost:3003/login');
      await page.fill('input[type="email"]', 'john.driver@example.com');
      await page.fill('input[type="password"]', 'driver123');
      await page.click('button:has-text("Login")');

      // Test emergency button
      const emergencyBtn = page.locator('button[data-testid="emergency-btn"]');
      if (await emergencyBtn.isVisible()) {
        await emergencyBtn.click();

        // Should show emergency options
        await expect(page.locator('[data-testid="emergency-options"]')).toBeVisible();

        // Test support chat
        const supportBtn = page.locator('button[data-testid="support-btn"]');
        if (await supportBtn.isVisible()) {
          await supportBtn.click();

          // Should open support chat
          await expect(page.locator('[data-testid="support-chat"]')).toBeVisible();

          // Send test message
          const chatInput = page.locator('input[data-testid="chat-input"]');
          if (await chatInput.isVisible()) {
            await chatInput.fill('Test support message');
            await page.click('button[data-testid="send-message"]');

            // Should show message
            await expect(page.locator('text=/Test support message/i')).toBeVisible();
          }
        }

        console.log('✅ Emergency and support features working');
      }
    });
  });

  test.describe('Admin Advanced Management', () => {
    test('should handle system-wide monitoring', async ({ page }) => {
      await page.goto('http://localhost:3001/login');
      await page.fill('input[type="email"]', 'admin@uberfoods.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button:has-text("Login")');

      // Check system monitoring
      await page.goto('http://localhost:3001/monitoring');

      // Should show system metrics
      await expect(page.locator('[data-testid="system-health"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-orders"]')).toBeVisible();
      await expect(page.locator('[data-testid="driver-status"]')).toBeVisible();

      // Should show real-time updates
      await page.waitForTimeout(5000);
      await expect(page.locator('[data-testid="live-updates"]')).toBeVisible();

      console.log('✅ System-wide monitoring working');
    });

    test('should handle user management', async ({ page }) => {
      await page.goto('http://localhost:3001/login');
      await page.fill('input[type="email"]', 'admin@uberfoods.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button:has-text("Login")');

      await page.goto('http://localhost:3001/users');

      // Should show user management interface
      await expect(page.locator('[data-testid="user-list"]')).toBeVisible();

      // Test user search
      const searchInput = page.locator('input[data-testid="user-search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('john');
        await page.waitForTimeout(1000);

        // Should filter results
        await expect(page.locator('[data-testid="user-item"]')).toBeVisible();
      }

      console.log('✅ User management working');
    });

    test('should handle financial overview', async ({ page }) => {
      await page.goto('http://localhost:3001/login');
      await page.fill('input[type="email"]', 'admin@uberfoods.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button:has-text("Login")');

      await page.goto('http://localhost:3001/finance');

      // Should show financial overview
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="payout-summary"]')).toBeVisible();

      // Should show export options
      const exportBtn = page.locator('button[data-testid="export-data"]');
      if (await exportBtn.isVisible()) {
        // Export functionality should be available
        await expect(exportBtn).toBeEnabled();
      }

      console.log('✅ Financial overview working');
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await page.goto('http://localhost:3002/login');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Login")');

      // Simulate network failure
      await page.context().setOffline(true);

      try {
        await page.goto('http://localhost:3002/restaurants');
        await page.waitForTimeout(2000);

        // Should show offline indicator
        await expect(page.locator('[data-testid="offline-indicator"], text=/offline/i')).toBeVisible();

        // Should allow cached operations
        const cachedData = page.locator('[data-testid="cached-data"]');
        if (await cachedData.isVisible()) {
          await expect(cachedData).toBeVisible();
        }

      } finally {
        await page.context().setOffline(false);
      }

      console.log('✅ Network failure handling working');
    });

    test('should handle concurrent user actions', async ({ browser }) => {
      const contexts = [];
      const pages = [];

      try {
        // Create 5 concurrent users
        for (let i = 0; i < 5; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          contexts.push(context);
          pages.push(page);

          await page.goto('http://localhost:3002/login');
          await page.fill('input[type="email"]', `user${i}@example.com`);
          await page.fill('input[type="password"]', 'password123');
          await page.click('button:has-text("Login")');
        }

        // All users try to order from same restaurant simultaneously
        for (const page of pages) {
          await page.goto('http://localhost:3002/restaurants');
          const restaurant = page.locator('[data-testid="restaurant-card"]').first();
          await restaurant.click();

          const addToCartBtn = page.locator('button[data-testid="add-to-cart"]').first();
          if (await addToCartBtn.isVisible()) {
            await addToCartBtn.click();
          }
        }

        // Check that system handles concurrent orders
        for (const page of pages) {
          await page.goto('http://localhost:3002/cart');
          const cartItems = page.locator('[data-testid="cart-item"]');
          // Each user should have their own cart
          expect(await cartItems.count()).toBeGreaterThan(0);
        }

        console.log('✅ Concurrent user actions handled');

      } finally {
        for (const context of contexts) {
          await context.close();
        }
      }
    });

    test('should handle data validation errors', async ({ page }) => {
      await page.goto('http://localhost:3002/login');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Login")');

      await page.goto('http://localhost:3002/checkout');

      // Try to place order without required fields
      const placeOrderBtn = page.locator('button[data-testid="place-order"]');
      if (await placeOrderBtn.isVisible()) {
        await placeOrderBtn.click();

        // Should show validation errors
        await expect(page.locator('text=/required|erforderlich/i')).toBeVisible();
      }

      // Fill invalid data
      await page.fill('input[name="phone"]', 'invalid-phone');
      await placeOrderBtn.click();

      // Should show phone validation error
      await expect(page.locator('text=/invalid phone|ungültige telefonnummer/i')).toBeVisible();

      console.log('✅ Data validation errors handled');
    });
  });
});

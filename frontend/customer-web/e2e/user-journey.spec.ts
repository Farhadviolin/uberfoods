import { test, expect } from './test-helpers';

test.describe('Complete User Journey', () => {
  test.setTimeout(120000); // 2 minutes timeout for complete journey

  test('should complete full ordering journey from registration to delivery', async ({ page }) => {
    // 1. Registration
    await page.goto('/register');

    // Fill registration form
    await page.locator('input[name="firstName"], input[placeholder*="first name"]').fill('Test');
    await page.locator('input[name="lastName"], input[placeholder*="last name"]').fill('User');
    await page.locator('input[type="email"], input[placeholder*="email"]').fill(`test${Date.now()}@example.com`);
    await page.locator('input[type="password"], input[placeholder*="password"]').fill('Password123!');

    // Submit registration
    await page.locator('button[type="submit"], button:has-text("Register")').click();

    // Should redirect to dashboard or email verification
    await expect(page).toHaveURL(/.*(dashboard|verify|home)/i);

    // 2. Browse restaurants
    await page.goto('/restaurants');

    // Select first restaurant
    const firstRestaurant = page.locator('[data-testid="restaurant-card"], .restaurant-card').first();
    await expect(firstRestaurant).toBeVisible();
    await firstRestaurant.click();

    // 3. Add items to cart
    const menuItems = page.locator('[data-testid="menu-item"], .menu-item, .dish-card');
    await expect(menuItems).toHaveCountGreaterThan(0);

    // Add first item
    const addToCartButton = menuItems.first().locator('button[data-testid="add-to-cart"], .add-to-cart');
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();

      // Should show cart indicator
      await expect(page.locator('[data-testid="cart-count"], .cart-count, .cart-indicator')).toBeVisible();
    }

    // Add second item
    const secondMenuItem = menuItems.nth(1);
    if (await secondMenuItem.isVisible()) {
      const addSecondButton = secondMenuItem.locator('button[data-testid="add-to-cart"], .add-to-cart');
      if (await addSecondButton.isVisible()) {
        await addSecondButton.click();
      }
    }

    // 4. Go to cart
    const cartButton = page.locator('[data-testid="cart-btn"], .cart-btn, a[href*="cart"]');
    if (await cartButton.isVisible()) {
      await cartButton.click();
    } else {
      await page.goto('/cart');
    }

    // Verify cart contents
    const cartItems = page.locator('[data-testid="cart-item"], .cart-item');
    await expect(cartItems).toHaveCountGreaterThan(0);

    // 5. Proceed to checkout
    const checkoutButton = page.locator('button[data-testid="checkout-btn"], .checkout, button:has-text("Checkout")');
    if (await checkoutButton.isVisible()) {
      await checkoutButton.click();
    } else {
      await page.goto('/checkout');
    }

    // 6. Fill delivery address
    const addressForm = page.locator('[data-testid="address-form"], .address-form');
    if (await addressForm.isVisible()) {
      await page.locator('input[name="street"], input[placeholder*="street"]').fill('Test Street 123');
      await page.locator('input[name="city"], input[placeholder*="city"]').fill('Vienna');
      await page.locator('input[name="zipCode"], input[placeholder*="zip"], input[name="postalCode"]').fill('1010');
      await page.locator('input[name="phone"], input[placeholder*="phone"]').fill('+43 123 456 789');
    }

    // 7. Select payment method
    const paymentMethods = page.locator('[data-testid="payment-methods"], .payment-methods');
    if (await paymentMethods.isVisible()) {
      // Select card payment
      const cardPayment = page.locator('input[type="radio"][value="card"], [data-testid="card-payment"]');
      if (await cardPayment.isVisible()) {
        await cardPayment.check();
      }
    }

    // 8. Add special instructions
    const instructionsInput = page.locator('textarea[name="instructions"], textarea[placeholder*="instructions"]');
    if (await instructionsInput.isVisible()) {
      await instructionsInput.fill('Please ring the doorbell twice. Apartment 5B.');
    }

    // 9. Place order
    const placeOrderButton = page.locator('button[data-testid="place-order"], .place-order, button:has-text("Place Order")');
    if (await placeOrderButton.isVisible()) {
      await placeOrderButton.click();

      // Should show order confirmation
      await expect(page.locator('text=/order placed|order confirmed|bestellung erfolgreich/i')).toBeVisible();
    }

    // 10. Check order status
    await page.goto('/orders');
    const orderItems = page.locator('[data-testid="order-item"], .order-item');
    await expect(orderItems).toHaveCountGreaterThan(0);

    // Click on latest order
    await orderItems.first().click();

    // Should show order details and status
    await expect(page.locator('[data-testid="order-status"], .order-status')).toBeVisible();
    await expect(page.locator('[data-testid="order-timeline"], .order-timeline')).toBeVisible();

    // 11. Test order tracking
    const trackOrderButton = page.locator('button[data-testid="track-order"], .track-order');
    if (await trackOrderButton.isVisible()) {
      await trackOrderButton.click();

      // Should show tracking information
      await expect(page.locator('[data-testid="tracking-info"], .tracking-info')).toBeVisible();
    }
  });

  test('should handle group ordering workflow', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("Login"), button:has-text("Sign In")').click();
    await page.waitForURL(/.*(dashboard|home)/i);

    // Navigate to restaurants
    await page.goto('/restaurants');

    // Look for group ordering option
    const groupOrderButton = page.locator('button[data-testid="group-order"], .group-order, button:has-text("Group")');
    if (await groupOrderButton.isVisible()) {
      await groupOrderButton.click();

      // Should show group order creation form
      await expect(page.locator('[data-testid="group-order-form"], .group-order-form')).toBeVisible();

      // Fill group order details
      await page.locator('input[name="groupName"], input[placeholder*="group name"]').fill('Office Lunch');
      await page.locator('input[name="maxParticipants"], input[placeholder*="participants"]').fill('5');

      // Create group order
      const createButton = page.locator('button[data-testid="create-group"], button:has-text("Create")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Should show group order code
        await expect(page.locator('[data-testid="group-code"], .group-code')).toBeVisible();

        // Should show share options
        await expect(page.locator('[data-testid="share-group"], .share-group')).toBeVisible();
      }
    }
  });

  test('should handle loyalty program workflow', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("Login"), button:has-text("Sign In")').click();
    await page.waitForURL(/.*(dashboard|home)/i);

    // Navigate to loyalty/profile section
    const loyaltyLink = page.locator('a[data-testid="loyalty-link"], a[href*="loyalty"], a[href*="profile"]');
    if (await loyaltyLink.isVisible()) {
      await loyaltyLink.click();

      // Should show loyalty information
      await expect(page.locator('[data-testid="loyalty-points"], .loyalty-points')).toBeVisible();

      // Should show available rewards
      const rewardsSection = page.locator('[data-testid="rewards-list"], .rewards-list');
      if (await rewardsSection.isVisible()) {
        await expect(rewardsSection.locator('[data-testid="reward-item"], .reward-item')).toHaveCountGreaterThan(0);

        // Try to claim a reward
        const claimButton = rewardsSection.locator('button[data-testid="claim-reward"], .claim-reward').first();
        if (await claimButton.isVisible()) {
          await claimButton.click();

          // Should show claim confirmation or error
          await expect(page.locator('text=/claimed|insufficient|erfolgreich|fehler/i')).toBeVisible();
        }
      }
    }
  });

  test('should handle search and filtering workflow', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("Login"), button:has-text("Sign In")').click();
    await page.waitForURL(/.*(dashboard|home)/i);

    await page.goto('/restaurants');

    // Test search functionality
    const searchInput = page.locator('input[data-testid="search"], input[type="search"], input[placeholder*="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Italian');

      // Should show filtered results
      await expect(page.locator('text=/italian|italienisch/i')).toBeVisible();
    }

    // Test cuisine filter
    const cuisineFilter = page.locator('select[data-testid="cuisine-filter"], .cuisine-filter');
    if (await cuisineFilter.isVisible()) {
      await cuisineFilter.selectOption('Italian');

      // Should update results
      await expect(page.locator('[data-testid="restaurant-card"]')).toHaveCountGreaterThan(0);
    }

    // Test delivery time filter
    const deliveryFilter = page.locator('select[data-testid="delivery-filter"], .delivery-filter');
    if (await deliveryFilter.isVisible()) {
      await deliveryFilter.selectOption('30');

      // Results should be filtered
      await expect(page.locator('[data-testid="restaurant-card"]')).toBeVisible();
    }

    // Test price range filter
    const priceFilter = page.locator('select[data-testid="price-filter"], .price-filter');
    if (await priceFilter.isVisible()) {
      await priceFilter.selectOption('€€');

      // Results should be filtered
      await expect(page.locator('[data-testid="restaurant-card"]')).toBeVisible();
    }
  });

  test('should handle favorites and preferences', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("Login"), button:has-text("Sign In")').click();
    await page.waitForURL(/.*(dashboard|home)/i);

    await page.goto('/restaurants');

    // Add restaurant to favorites
    const firstRestaurant = page.locator('[data-testid="restaurant-card"]').first();
    const favoriteButton = firstRestaurant.locator('button[data-testid="favorite-btn"], .favorite-btn');
    if (await favoriteButton.isVisible()) {
      await favoriteButton.click();

      // Should show success feedback
      await expect(page.locator('text=/added to favorites|zu favoriten/i')).toBeVisible();
    }

    // Navigate to favorites
    const favoritesLink = page.locator('a[data-testid="favorites-link"], a[href*="favorites"]');
    if (await favoritesLink.isVisible()) {
      await favoritesLink.click();

      // Should show favorited restaurants
      await expect(page.locator('[data-testid="restaurant-card"], .restaurant-card')).toHaveCountGreaterThan(0);
    }

    // Test dietary preferences
    const preferencesLink = page.locator('a[data-testid="preferences-link"], a[href*="preferences"]');
    if (await preferencesLink.isVisible()) {
      await preferencesLink.click();

      // Should show preference settings
      await expect(page.locator('[data-testid="dietary-preferences"], .dietary-preferences')).toBeVisible();

      // Update preferences
      const vegetarianCheckbox = page.locator('input[type="checkbox"][value="vegetarian"], [data-testid="vegetarian-checkbox"]');
      if (await vegetarianCheckbox.isVisible()) {
        await vegetarianCheckbox.check();

        // Save preferences
        const saveButton = page.locator('button[data-testid="save-preferences"], button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();

          // Should show success message
          await expect(page.locator('text=/saved|gespeichert/i')).toBeVisible();
        }
      }
    }
  });
});

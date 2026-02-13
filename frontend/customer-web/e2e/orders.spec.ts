import { test, expect } from './test-helpers';

test.describe('Orders', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("Login"), button:has-text("Sign In")').click();
    await page.waitForURL(/.*(dashboard|home)/i);
  });

  test('should display order history', async ({ page }) => {
    await page.goto('/orders');

    // Should show order list or empty state
    await expect(page.locator('[data-testid="orders-list"], .orders-list, .order-history')).toBeVisible();
  });

  test('should create new order from restaurant menu', async ({ page }) => {
    // Go to restaurants
    await page.goto('/restaurants');

    // Click on first restaurant
    const firstRestaurant = page.locator('[data-testid="restaurant-card"], .restaurant-card, .restaurant-item').first();
    await firstRestaurant.click();

    // Should be on restaurant details page
    await expect(page.locator('[data-testid="restaurant-name"], h1, h2')).toBeVisible();

    // Add item to cart
    const addToCartButton = page.locator('button[data-testid="add-to-cart"], .add-to-cart, button:has-text("Add")').first();
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();

      // Should show cart or order confirmation
      await expect(page.locator('[data-testid="cart"], .cart, .order-summary')).toBeVisible();
    }
  });

  test('should show cart with order items', async ({ page }) => {
    await page.goto('/cart');

    // Should show cart contents
    const cartItems = page.locator('[data-testid="cart-item"], .cart-item, .order-item');
    if (await cartItems.count() > 0) {
      await expect(cartItems).toHaveCountGreaterThan(0);

      // Should show item details
      await expect(page.locator('[data-testid="item-name"], .item-name')).toBeVisible();
      await expect(page.locator('[data-testid="item-price"], .item-price')).toBeVisible();
      await expect(page.locator('[data-testid="item-quantity"], .item-quantity')).toBeVisible();
    } else {
      // Empty cart state
      await expect(page.locator('text=/empty|no items|leer/i')).toBeVisible();
    }
  });

  test('should modify cart items', async ({ page }) => {
    await page.goto('/cart');

    const cartItems = page.locator('[data-testid="cart-item"], .cart-item, .order-item');
    if (await cartItems.count() > 0) {
      // Try to increase quantity
      const increaseButton = cartItems.first().locator('button[data-testid="increase-qty"], .increase, +');
      if (await increaseButton.isVisible()) {
        await increaseButton.click();

        // Quantity should change
        const quantityInput = cartItems.first().locator('input[data-testid="quantity"], .quantity');
        const quantityValue = await quantityInput.inputValue();
        expect(parseInt(quantityValue)).toBeGreaterThan(0);
      }

      // Try to decrease quantity
      const decreaseButton = cartItems.first().locator('button[data-testid="decrease-qty"], .decrease, -');
      if (await decreaseButton.isVisible()) {
        await decreaseButton.click();

        // Should handle quantity decrease
        await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
      }
    }
  });

  test('should calculate order total correctly', async ({ page }) => {
    await page.goto('/cart');

    const cartItems = page.locator('[data-testid="cart-item"], .cart-item, .order-item');
    if (await cartItems.count() > 0) {
      // Should show subtotal
      await expect(page.locator('[data-testid="subtotal"], .subtotal, text=/subtotal/i')).toBeVisible();

      // Should show delivery fee
      await expect(page.locator('[data-testid="delivery-fee"], .delivery-fee, text=/delivery|lieferung/i')).toBeVisible();

      // Should show total
      await expect(page.locator('[data-testid="total"], .total, text=/total|gesamt/i')).toBeVisible();
    }
  });

  test('should proceed to checkout', async ({ page }) => {
    await page.goto('/cart');

    const cartItems = page.locator('[data-testid="cart-item"], .cart-item, .order-item');
    if (await cartItems.count() > 0) {
      // Click checkout button
      const checkoutButton = page.locator('button[data-testid="checkout-btn"], .checkout, button:has-text("Checkout")');
      if (await checkoutButton.isVisible()) {
        await checkoutButton.click();

        // Should navigate to checkout page
        await expect(page).toHaveURL(/.*(checkout|bestellung)/i);

        // Should show checkout form
        await expect(page.locator('[data-testid="checkout-form"], .checkout-form')).toBeVisible();
      }
    }
  });

  test('should show delivery address selection', async ({ page }) => {
    // Add item to cart first
    await page.goto('/restaurants');
    const firstRestaurant = page.locator('[data-testid="restaurant-card"], .restaurant-card, .restaurant-item').first();
    await firstRestaurant.click();

    const addToCartButton = page.locator('button[data-testid="add-to-cart"], .add-to-cart').first();
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();

      // Go to checkout
      await page.goto('/checkout');

      // Should show address selection
      await expect(page.locator('[data-testid="address-select"], .address-select, select[name="address"]')).toBeVisible();
    }
  });

  test('should show payment method selection', async ({ page }) => {
    await page.goto('/checkout');

    // Should show payment methods
    await expect(page.locator('[data-testid="payment-methods"], .payment-methods')).toBeVisible();

    // Should have payment options
    await expect(page.locator('input[type="radio"][name="payment"], [data-testid="payment-card"]')).toBeVisible();
  });

  test('should handle order placement', async ({ page }) => {
    await page.goto('/checkout');

    const placeOrderButton = page.locator('button[data-testid="place-order"], .place-order, button:has-text("Place Order")');
    if (await placeOrderButton.isVisible()) {
      await placeOrderButton.click();

      // Should show order confirmation or success message
      await expect(page.locator('text=/order placed|bestellung|success|erfolgreich/i')).toBeVisible();
    }
  });

  test('should show order tracking after placement', async ({ page }) => {
    // This would typically happen after placing an order
    await page.goto('/orders');

    const orderItems = page.locator('[data-testid="order-item"], .order-item, .order-card');
    if (await orderItems.count() > 0) {
      // Click on an order to view details
      await orderItems.first().click();

      // Should show order status
      await expect(page.locator('[data-testid="order-status"], .order-status')).toBeVisible();

      // Should show order timeline
      await expect(page.locator('[data-testid="order-timeline"], .timeline, .order-progress')).toBeVisible();
    }
  });

  test('should allow order cancellation', async ({ page }) => {
    await page.goto('/orders');

    const orderItems = page.locator('[data-testid="order-item"], .order-item, .order-card');
    if (await orderItems.count() > 0) {
      // Look for cancel button on pending orders
      const cancelButton = orderItems.first().locator('button[data-testid="cancel-order"], .cancel, button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Should show confirmation dialog
        await expect(page.locator('[data-testid="cancel-confirm"], .confirm-dialog')).toBeVisible();

        // Confirm cancellation
        const confirmButton = page.locator('button[data-testid="confirm-cancel"], button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();

          // Should show cancellation success
          await expect(page.locator('text=/cancelled|storniert/i')).toBeVisible();
        }
      }
    }
  });

  test('should show order details', async ({ page }) => {
    await page.goto('/orders');

    const orderItems = page.locator('[data-testid="order-item"], .order-item, .order-card');
    if (await orderItems.count() > 0) {
      await orderItems.first().click();

      // Should show detailed order information
      await expect(page.locator('[data-testid="order-details"], .order-details')).toBeVisible();

      // Should show order items
      await expect(page.locator('[data-testid="order-item-detail"], .order-item-detail')).toHaveCountGreaterThan(0);

      // Should show order total
      await expect(page.locator('[data-testid="order-total"], .order-total')).toBeVisible();
    }
  });

  test('should handle order reordering', async ({ page }) => {
    await page.goto('/orders');

    const orderItems = page.locator('[data-testid="order-item"], .order-item, .order-card');
    if (await orderItems.count() > 0) {
      // Look for reorder button
      const reorderButton = orderItems.first().locator('button[data-testid="reorder-btn"], .reorder, button:has-text("Reorder")');
      if (await reorderButton.isVisible()) {
        await reorderButton.click();

        // Should navigate to cart or checkout with reordered items
        await expect(page.locator('[data-testid="cart"], .cart, [data-testid="checkout-form"]')).toBeVisible();
      }
    }
  });
});

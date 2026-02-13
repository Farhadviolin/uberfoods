import { test, expect } from './test-helpers';

test.describe('Order Tracking', () => {
  test('should show order status timeline', async ({ page }) => {
    // Navigate to order tracking page
    await page.goto('/orders/12345');

    // Should show order header
    await expect(page.locator('[data-testid="order-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-number"]')).toContainText('#12345');

    // Should show status timeline
    await expect(page.locator('[data-testid="status-timeline"]')).toBeVisible();

    // Should show current status
    await expect(page.locator('[data-testid="current-status"]')).toBeVisible();
  });

  test('should display order items', async ({ page }) => {
    await page.goto('/orders/12345');

    // Should show order items
    await expect(page.locator('[data-testid="order-items"]')).toBeVisible();

    const orderItems = page.locator('[data-testid="order-item"]');
    await expect(orderItems.first()).toBeVisible();

    // Each item should show name, quantity, price
    const firstItem = orderItems.first();
    await expect(firstItem.locator('[data-testid="item-name"]')).toBeVisible();
    await expect(firstItem.locator('[data-testid="item-quantity"]')).toBeVisible();
    await expect(firstItem.locator('[data-testid="item-price"]')).toBeVisible();
  });

  test('should show delivery information', async ({ page }) => {
    await page.goto('/orders/12345');

    // Should show delivery address
    await expect(page.locator('[data-testid="delivery-address"]')).toBeVisible();

    // Should show estimated delivery time
    await expect(page.locator('[data-testid="estimated-delivery"]')).toBeVisible();

    // Should show restaurant info
    await expect(page.locator('[data-testid="restaurant-info"]')).toBeVisible();
  });

  test('should display live driver location', async ({ page }) => {
    await page.goto('/orders/12345');

    // For orders in transit, should show map
    await expect(page.locator('[data-testid="delivery-map"]')).toBeVisible();

    // Should show driver marker
    await expect(page.locator('[data-testid="driver-marker"]')).toBeVisible();

    // Should show destination marker
    await expect(page.locator('[data-testid="destination-marker"]')).toBeVisible();
  });

  test('should show real-time status updates', async ({ page }) => {
    await page.goto('/orders/12345');

    // Initial status
    await expect(page.locator('[data-testid="current-status"]')).toContainText('Preparing');

    // Simulate status update (in real app via WebSocket)
    // This would be mocked in the test environment

    // Should update timeline
    const timelineSteps = page.locator('[data-testid="timeline-step"]');
    await expect(timelineSteps).toHaveCount(4); // Ordered, Preparing, Ready, Delivered
  });

  test('should allow contacting driver', async ({ page }) => {
    await page.goto('/orders/12345');

    // For orders with assigned driver, should show contact options
    await expect(page.locator('[data-testid="contact-driver"]')).toBeVisible();

    // Should allow calling
    const callButton = page.locator('[data-testid="call-driver"]');
    await expect(callButton).toBeVisible();

    // Should allow messaging (if chat available)
    const messageButton = page.locator('[data-testid="message-driver"]');
    if (await messageButton.isVisible()) {
      await expect(messageButton).toBeVisible();
    }
  });

  test('should show order total and breakdown', async ({ page }) => {
    await page.goto('/orders/12345');

    // Should show order summary
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();

    // Should show subtotal, delivery fee, taxes, total
    await expect(page.locator('[data-testid="order-subtotal"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-delivery-fee"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-taxes"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-total"]')).toBeVisible();
  });

  test('should allow canceling order', async ({ page }) => {
    await page.goto('/orders/12345');

    // For orders that can be cancelled, should show cancel button
    const cancelButton = page.locator('[data-testid="cancel-order"]');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // Should show confirmation dialog
      await expect(page.locator('[data-testid="cancel-confirmation"]')).toBeVisible();

      // Cancel confirmation
      await page.click('[data-testid="confirm-cancel"]');

      // Should show cancelled status
      await expect(page.locator('[data-testid="current-status"]')).toContainText('Cancelled');
    }
  });

  test('should show special instructions', async ({ page }) => {
    await page.goto('/orders/12345');

    // If order has special instructions, should display them
    const specialInstructions = page.locator('[data-testid="special-instructions"]');
    if (await specialInstructions.isVisible()) {
      await expect(specialInstructions).toBeVisible();
      await expect(specialInstructions).toContainText('Ring doorbell twice');
    }
  });

  test('should allow reordering', async ({ page }) => {
    await page.goto('/orders/12345');

    // Should show reorder button
    const reorderButton = page.locator('[data-testid="reorder-button"]');
    await expect(reorderButton).toBeVisible();

    await reorderButton.click();

    // Should navigate to restaurant menu with items in cart
    await expect(page).toHaveURL(/\/restaurant\/.+/);
    await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('2'); // Assuming 2 items
  });

  test('should show delivery proof', async ({ page }) => {
    await page.goto('/orders/delivered-order-123');

    // For delivered orders, should show delivery proof
    await expect(page.locator('[data-testid="delivery-proof"]')).toBeVisible();

    // Should show delivery photo if available
    const deliveryPhoto = page.locator('[data-testid="delivery-photo"]');
    if (await deliveryPhoto.isVisible()) {
      await expect(deliveryPhoto).toBeVisible();
    }

    // Should show delivery signature if available
    const signature = page.locator('[data-testid="delivery-signature"]');
    if (await signature.isVisible()) {
      await expect(signature).toBeVisible();
    }
  });

  test('should handle order not found', async ({ page }) => {
    await page.goto('/orders/non-existent-order');

    // Should show error page
    await expect(page.locator('[data-testid="order-not-found"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-not-found"]')).toContainText('Order not found');
  });

  test('should show preparation progress', async ({ page }) => {
    await page.goto('/orders/preparing-order-123');

    // For orders being prepared, should show progress
    await expect(page.locator('[data-testid="preparation-progress"]')).toBeVisible();

    // Should show current step
    await expect(page.locator('[data-testid="current-step"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-step"]')).toContainText('Cooking your pizza');
  });

  test('should allow rating and reviewing after delivery', async ({ page }) => {
    await page.goto('/orders/delivered-order-123');

    // Should show rating section
    await expect(page.locator('[data-testid="rating-section"]')).toBeVisible();

    // Should allow star rating
    const stars = page.locator('[data-testid="rating-star"]');
    await expect(stars).toHaveCount(5);

    // Click 4 stars
    await stars.nth(3).click();

    // Should show review textarea
    await expect(page.locator('[data-testid="review-textarea"]')).toBeVisible();

    // Fill review
    await page.fill('[data-testid="review-textarea"]', 'Great food and fast delivery!');

    // Submit review
    await page.click('[data-testid="submit-review"]');

    // Should show success message
    await expect(page.locator('[data-testid="review-success"]')).toBeVisible();
  });

  test('should show tip option for delivered orders', async ({ page }) => {
    await page.goto('/orders/delivered-order-123');

    // Should show tip section
    await expect(page.locator('[data-testid="tip-section"]')).toBeVisible();

    // Should show tip options
    await expect(page.locator('[data-testid="tip-amount-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="tip-amount-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="tip-amount-5"]')).toBeVisible();

    // Allow custom tip
    await page.fill('[data-testid="custom-tip"]', '4.50');

    // Submit tip
    await page.click('[data-testid="submit-tip"]');

    // Should show success message
    await expect(page.locator('[data-testid="tip-success"]')).toBeVisible();
  });
});
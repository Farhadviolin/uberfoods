import { test, expect } from './test-helpers';

test.describe('Payment Process', () => {
  test('should complete credit card payment', async ({ page }) => {
    // Start with order in cart
    await page.goto('/restaurant/test-restaurant-id');
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    // Should be on checkout page
    await expect(page).toHaveURL('/checkout');

    // Fill delivery address
    await page.fill('[data-testid="address-input"]', '123 Test Street');
    await page.fill('[data-testid="city-input"]', 'Test City');
    await page.fill('[data-testid="postal-code-input"]', '12345');

    // Proceed to payment
    await page.click('[data-testid="continue-to-payment"]');

    // Select credit card
    await page.click('[data-testid="credit-card-option"]');

    // Fill card details (using test card)
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '1230');
    await page.fill('[data-testid="card-cvc"]', '123');

    // Submit payment
    await page.click('[data-testid="pay-button"]');

    // Should show success page
    await expect(page).toHaveURL('/order-success');
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });

  test('should complete PayPal payment', async ({ page }) => {
    // Setup order
    await page.goto('/restaurant/test-restaurant-id');
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    // Fill address and continue
    await page.fill('[data-testid="address-input"]', '123 Test Street');
    await page.fill('[data-testid="city-input"]', 'Test City');
    await page.fill('[data-testid="postal-code-input"]', '12345');
    await page.click('[data-testid="continue-to-payment"]');

    // Select PayPal
    await page.click('[data-testid="paypal-option"]');
    await page.click('[data-testid="pay-with-paypal"]');

    // Mock PayPal popup completion
    // In real test, would handle popup
    await page.waitForURL('**/order-success');

    // Should show success
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });

  test('should handle payment errors', async ({ page }) => {
    // Setup order
    await page.goto('/restaurant/test-restaurant-id');
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    // Fill address and continue
    await page.fill('[data-testid="address-input"]', '123 Test Street');
    await page.fill('[data-testid="city-input"]', 'Test City');
    await page.fill('[data-testid="postal-code-input"]', '12345');
    await page.click('[data-testid="continue-to-payment"]');

    // Select credit card
    await page.click('[data-testid="credit-card-option"]');

    // Fill with invalid card
    await page.fill('[data-testid="card-number"]', '4000000000000002'); // Declined card
    await page.fill('[data-testid="card-expiry"]', '1230');
    await page.fill('[data-testid="card-cvc"]', '123');

    // Submit payment
    await page.click('[data-testid="pay-button"]');

    // Should show error
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('declined');
  });

  test('should validate payment form', async ({ page }) => {
    // Setup order and go to payment
    await page.goto('/restaurant/test-restaurant-id');
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    await page.fill('[data-testid="address-input"]', '123 Test Street');
    await page.fill('[data-testid="city-input"]', 'Test City');
    await page.fill('[data-testid="postal-code-input"]', '12345');
    await page.click('[data-testid="continue-to-payment"]');

    await page.click('[data-testid="credit-card-option"]');

    // Try to submit without filling card details
    await page.click('[data-testid="pay-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="card-number-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-expiry-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-cvc-error"]')).toBeVisible();
  });

  test('should add tip to order', async ({ page }) => {
    // Setup order and go to payment
    await page.goto('/restaurant/test-restaurant-id');
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    await page.fill('[data-testid="address-input"]', '123 Test Street');
    await page.fill('[data-testid="city-input"]', 'Test City');
    await page.fill('[data-testid="postal-code-input"]', '12345');
    await page.click('[data-testid="continue-to-payment"]');

    // Add tip
    await page.click('[data-testid="tip-3-euro"]');

    // Should update total
    await expect(page.locator('[data-testid="order-total"]')).toContainText('€');
    await expect(page.locator('[data-testid="tip-amount"]')).toContainText('€3.00');
  });

  test('should save payment method', async ({ page }) => {
    // Setup order and complete payment with save option
    await page.goto('/restaurant/test-restaurant-id');
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    await page.fill('[data-testid="address-input"]', '123 Test Street');
    await page.fill('[data-testid="city-input"]', 'Test City');
    await page.fill('[data-testid="postal-code-input"]', '12345');
    await page.click('[data-testid="continue-to-payment"]');

    await page.click('[data-testid="credit-card-option"]');
    await page.check('[data-testid="save-card-checkbox"]');

    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '1230');
    await page.fill('[data-testid="card-cvc"]', '123');

    await page.click('[data-testid="pay-button"]');
    await expect(page).toHaveURL('/order-success');

    // Check if card is saved in profile
    await page.goto('/profile');
    await expect(page.locator('[data-testid="saved-cards"]')).toContainText('**** **** **** 4242');
  });

  test('should use saved payment method', async ({ page }) => {
    // Assuming user has saved card from previous test
    await page.goto('/restaurant/test-restaurant-id');
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    await page.fill('[data-testid="address-input"]', '123 Test Street');
    await page.fill('[data-testid="city-input"]', 'Test City');
    await page.fill('[data-testid="postal-code-input"]', '12345');
    await page.click('[data-testid="continue-to-payment"]');

    // Should show saved cards
    await expect(page.locator('[data-testid="saved-cards-section"]')).toBeVisible();
    await page.click('[data-testid="use-saved-card-4242"]');

    // Should not need to enter card details
    await page.click('[data-testid="pay-button"]');

    // Should complete payment
    await expect(page).toHaveURL('/order-success');
  });

  test('should handle delivery address validation', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    // Try to continue without address
    await page.click('[data-testid="continue-to-payment"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="address-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="city-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="postal-code-error"]')).toBeVisible();
  });

  test('should show order summary with all fees', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    await page.fill('[data-testid="address-input"]', '123 Test Street');
    await page.fill('[data-testid="city-input"]', 'Test City');
    await page.fill('[data-testid="postal-code-input"]', '12345');
    await page.click('[data-testid="continue-to-payment"]');

    // Should show complete breakdown
    await expect(page.locator('[data-testid="subtotal"]')).toBeVisible();
    await expect(page.locator('[data-testid="delivery-fee"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-fee"]')).toBeVisible();
    await expect(page.locator('[data-testid="taxes"]')).toBeVisible();
    await expect(page.locator('[data-testid="final-total"]')).toBeVisible();
  });
});
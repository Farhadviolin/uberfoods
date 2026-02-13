import { test, expect } from './test-helpers';

test.describe('Menu & Ordering', () => {
  test('should display menu categories', async ({ page }) => {
    // Navigate to restaurant menu
    await page.goto('/restaurant/test-restaurant-id');

    // Should show loading first
    await expect(page.locator('[data-testid="menu-loading"]')).toBeVisible();

    // Should display menu categories
    await expect(page.locator('[data-testid="menu-categories"]')).toBeVisible();

    // Should have at least one category
    const categories = page.locator('[data-testid="menu-category"]');
    await expect(categories.first()).toBeVisible();
  });

  test('should display menu items', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Wait for menu to load
    await expect(page.locator('[data-testid="menu-categories"]')).toBeVisible();

    // Should show menu items
    const menuItems = page.locator('[data-testid="menu-item"]');
    await expect(menuItems.first()).toBeVisible();

    // Each item should have name, description, and price
    const firstItem = menuItems.first();
    await expect(firstItem.locator('[data-testid="item-name"]')).toBeVisible();
    await expect(firstItem.locator('[data-testid="item-price"]')).toBeVisible();
  });

  test('should add item to cart', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Wait for menu to load
    await expect(page.locator('[data-testid="menu-categories"]')).toBeVisible();

    // Find first menu item and add to cart
    const firstItem = page.locator('[data-testid="menu-item"]').first();
    await firstItem.locator('[data-testid="add-to-cart-button"]').click();

    // Should show success message
    await expect(page.locator('[data-testid="cart-success-message"]')).toBeVisible();

    // Cart should have items
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toBeVisible();
    await expect(cartBadge).toHaveText('1');
  });

  test('should customize menu item', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Wait for menu to load
    await expect(page.locator('[data-testid="menu-categories"]')).toBeVisible();

    // Find item with customizations
    const customizableItem = page.locator('[data-testid="menu-item"]').filter({
      hasText: 'Pizza' // Assuming pizza has customizations
    }).first();

    await customizableItem.locator('[data-testid="customize-button"]').click();

    // Should open customization modal
    await expect(page.locator('[data-testid="customization-modal"]')).toBeVisible();

    // Should show customization options
    await expect(page.locator('[data-testid="customization-options"]')).toBeVisible();

    // Select customization and add to cart
    await page.click('[data-testid="extra-cheese-option"]');
    await page.click('[data-testid="add-customized-to-cart"]');

    // Should show success message
    await expect(page.locator('[data-testid="cart-success-message"]')).toBeVisible();
  });

  test('should show cart with items', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Add item to cart first
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await expect(page.locator('[data-testid="cart-success-message"]')).toBeVisible();

    // Open cart
    await page.click('[data-testid="cart-button"]');

    // Should show cart modal/sidebar
    await expect(page.locator('[data-testid="cart-modal"]')).toBeVisible();

    // Should show cart items
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();

    // Should show total
    await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
  });

  test('should update cart quantities', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Add item to cart
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');

    // Should show cart
    await expect(page.locator('[data-testid="cart-modal"]')).toBeVisible();

    // Increase quantity
    await page.click('[data-testid="quantity-increase"]');

    // Should update quantity and total
    await expect(page.locator('[data-testid="item-quantity"]')).toHaveText('2');
    await expect(page.locator('[data-testid="cart-total"]')).toContainText('€'); // Should be updated
  });

  test('should remove item from cart', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Add item to cart
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');

    // Remove item
    await page.click('[data-testid="remove-item"]');

    // Cart should be empty
    await expect(page.locator('[data-testid="empty-cart-message"]')).toBeVisible();
  });

  test('should proceed to checkout', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Add item to cart
    await page.locator('[data-testid="menu-item"]').first().locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');

    // Proceed to checkout
    await page.click('[data-testid="checkout-button"]');

    // Should navigate to checkout page
    await expect(page).toHaveURL('/checkout');

    // Should show order summary
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkout-total"]')).toBeVisible();
  });

  test('should validate minimum order amount', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Add cheap item
    await page.locator('[data-testid="menu-item"]').filter({
      hasText: '€5' // Find cheap item
    }).first().locator('[data-testid="add-to-cart-button"]').click();

    await page.click('[data-testid="cart-button"]');

    // Try to checkout
    await page.click('[data-testid="checkout-button"]');

    // Should show minimum order message
    await expect(page.locator('[data-testid="minimum-order-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="minimum-order-warning"]')).toContainText('Minimum order');
  });

  test('should show delivery time and fee', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Should show delivery info
    await expect(page.locator('[data-testid="delivery-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="delivery-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="delivery-fee"]')).toBeVisible();
  });

  test('should handle unavailable items', async ({ page }) => {
    await page.goto('/restaurant/test-restaurant-id');

    // Find unavailable item
    const unavailableItem = page.locator('[data-testid="menu-item"]').filter({
      has: page.locator('[data-testid="unavailable-badge"]')
    }).first();

    // Unavailable items should not have add to cart button or should be disabled
    const addButton = unavailableItem.locator('[data-testid="add-to-cart-button"]');
    await expect(addButton).toBeDisabled();
  });
});
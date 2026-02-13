import { test, expect } from './test-helpers';

test.describe('Customer Order Flow (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
  });

  test('complete order flow from browse to checkout', async ({ page }) => {
    // Step 1: Browse restaurants
    await expect(page.locator('h1:has-text("Restaurants")')).toBeVisible();
    
    // Step 2: Click on a restaurant
    await page.click('text=Pizza Paradise');
    await page.waitForURL('**/restaurant/**');
    
    // Step 3: Add dish to cart
    await expect(page.locator('text=Margherita Pizza')).toBeVisible();
    await page.click('button:has-text("Add to Cart")');
    
    // Step 4: Verify cart updated
    await expect(page.locator('.cart-count:has-text("1")')).toBeVisible();
    
    // Step 5: Open cart
    await page.click('.floating-cart');
    
    // Step 6: Proceed to checkout
    await page.click('button:has-text("Checkout")');
    
    // Step 7: Fill delivery address (if not logged in, login first)
    const loginButton = page.locator('button:has-text("Login")');
    if (await loginButton.isVisible()) {
      await page.fill('[name="email"]', 'test@customer.com');
      await page.fill('[name="password"]', 'TestPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/checkout');
    }
    
    // Step 8: Confirm order
    await page.fill('[name="notes"]', 'Please ring the bell');
    await page.click('button:has-text("Place Order")');
    
    // Step 9: Verify order confirmation
    await expect(page.locator('text=Order Placed Successfully')).toBeVisible({ timeout: 10000 });
    
    // Step 10: Navigate to order tracking
    await page.click('button:has-text("Track Order")');
    await expect(page.locator('text=Order Status')).toBeVisible();
  });

  test('search and filter restaurants', async ({ page }) => {
    // Step 1: Use search
    await page.fill('[placeholder*="Search"]', 'Pizza');
    await page.waitForTimeout(500);
    
    // Step 2: Verify filtered results
    await expect(page.locator('text=Pizza Paradise')).toBeVisible();
    
    // Step 3: Filter by cuisine
    await page.click('button:has-text("Filters")');
    await page.click('text=Italian');
    
    // Step 4: Verify filtered results
    await expect(page.locator('.restaurant-card')).toHaveCount(1);
  });

  test('manage cart items', async ({ page }) => {
    // Add first item
    await page.click('text=Pizza Paradise');
    await page.click('button:has-text("Add to Cart")');
    
    // Add second item
    await page.goBack();
    await page.click('text=Burger King');
    
    // Verify cart cleared (different restaurant)
    await expect(page.locator('.cart-count:has-text("0")')).toBeVisible();
    
    // Add from new restaurant
    await page.click('button:has-text("Add to Cart")');
    
    // Open cart
    await page.click('.floating-cart');
    
    // Increase quantity
    await page.click('button[aria-label="Increase quantity"]');
    await expect(page.locator('.item-quantity:has-text("2")')).toBeVisible();
    
    // Decrease quantity
    await page.click('button[aria-label="Decrease quantity"]');
    await expect(page.locator('.item-quantity:has-text("1")')).toBeVisible();
    
    // Remove item
    await page.click('button[aria-label="Remove item"]');
    await expect(page.locator('text=Cart is empty')).toBeVisible();
  });

  test('view order history', async ({ page }) => {
    // Login
    await page.click('button:has-text("Login")');
    await page.fill('[name="email"]', 'test@customer.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    // Navigate to orders
    await page.click('a[href="/orders"]');
    await page.waitForURL('**/orders');
    
    // Verify orders displayed
    await expect(page.locator('.order-card')).toHaveCount(1);
    
    // Click on order details
    await page.click('.order-card:first-child');
    
    // Verify order details visible
    await expect(page.locator('text=Order Details')).toBeVisible();
    await expect(page.locator('text=Pizza Paradise')).toBeVisible();
  });

  test('track order in real-time', async ({ page }) => {
    // Navigate to tracking page
    await page.goto('/orders/order_123');
    
    // Verify tracking map visible
    await expect(page.locator('.tracking-map')).toBeVisible();
    
    // Verify order status
    await expect(page.locator('.order-status')).toBeVisible();
    
    // Verify driver info (if assigned)
    const driverInfo = page.locator('.driver-info');
    if (await driverInfo.isVisible()) {
      await expect(driverInfo.locator('text=Driver')).toBeVisible();
    }
  });
});

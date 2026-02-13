import { test, expect } from '@playwright/test';

test.describe('Restaurant - Order Management (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as restaurant
    await page.goto('http://localhost:3003');
    
    const loginForm = page.locator('form');
    if (await loginForm.isVisible()) {
      await page.fill('[name="email"]', 'restaurant@uberfoods.com');
      await page.fill('[name="password"]', 'RestaurantPass123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
    }
  });

  test('process incoming order', async ({ page }) => {
    // Navigate to orders
    await page.click('text=Bestellungen');
    
    // Check if new orders exist
    const newOrders = page.locator('.order-card.status-pending');
    const count = await newOrders.count();
    
    if (count > 0) {
      // Click on first pending order
      await newOrders.first().click();
      
      // Confirm order
      await page.click('button:has-text("Bestätigen")');
      
      // Verify confirmation
      await expect(page.locator('text=Bestellung bestätigt')).toBeVisible();
      
      // Mark as preparing
      await page.click('button:has-text("In Zubereitung")');
      
      // Verify status updated
      await expect(page.locator('text=Status: Preparing')).toBeVisible();
      
      // Mark as ready
      await page.click('button:has-text("Fertig")');
      
      // Verify ready status
      await expect(page.locator('text=Status: Ready')).toBeVisible();
    }
  });

  test('view kitchen display', async ({ page }) => {
    // Navigate to kitchen display
    await page.click('text=Küche');
    
    // Verify kitchen display loaded
    await expect(page.locator('.kitchen-display')).toBeVisible();
    
    // Verify orders grouped by status
    await expect(page.locator('.pending-orders')).toBeVisible();
    await expect(page.locator('.preparing-orders')).toBeVisible();
  });

  test('manage menu items', async ({ page }) => {
    // Navigate to menu
    await page.click('text=Menü');
    
    // Add new dish
    await page.click('button:has-text("Neues Gericht")');
    
    // Fill form
    await page.fill('[name="name"]', 'Test Dish E2E');
    await page.fill('[name="description"]', 'E2E Test Dish');
    await page.fill('[name="price"]', '15.90');
    await page.selectOption('[name="category"]', 'Pizza');
    
    // Submit
    await page.click('button:has-text("Erstellen")');
    
    // Verify created
    await expect(page.locator('text=Gericht erstellt')).toBeVisible();
    await expect(page.locator('text=Test Dish E2E')).toBeVisible();
  });

  test('toggle dish availability', async ({ page }) => {
    // Navigate to menu
    await page.click('text=Menü');

    // Find availability toggle
    const toggleButton = page.locator('button.availability-toggle').first();
    const initialStatus = await toggleButton.textContent();

    // Toggle and wait for text to change (more deterministic than timeout)
    await toggleButton.click();
    await page.waitForFunction(
      (button, initial) => button.textContent !== initial,
      toggleButton.elementHandle(),
      initialStatus,
      { timeout: 5000 }
    );

    // Verify changed
    const newStatus = await toggleButton.textContent();
    expect(newStatus).not.toBe(initialStatus);
  });

  test('view dashboard analytics', async ({ page }) => {
    // Navigate to dashboard
    await page.click('text=Dashboard');
    
    // Verify stats cards
    await expect(page.locator('.stat-card')).toHaveCount(4);
    
    // Verify revenue chart
    await expect(page.locator('.revenue-chart')).toBeVisible();
    
    // Verify top dishes
    await expect(page.locator('.top-dishes')).toBeVisible();
  });

  test('manage business hours', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Einstellungen');
    
    // Navigate to business hours
    await page.click('text=Öffnungszeiten');
    
    // Update hours for Monday
    await page.fill('[name="monday-open"]', '10:00');
    await page.fill('[name="monday-close"]', '22:00');
    
    // Save
    await page.click('button:has-text("Speichern")');
    
    // Verify saved
    await expect(page.locator('text=Öffnungszeiten aktualisiert')).toBeVisible();
  });

  test('track driver location for order', async ({ page }) => {
    // Navigate to orders
    await page.click('text=Bestellungen');
    
    // Find order with driver
    const orderWithDriver = page.locator('.order-card:has(.driver-info)').first();
    
    if (await orderWithDriver.isVisible()) {
      await orderWithDriver.click();
      
      // Verify driver tracking map
      await expect(page.locator('.driver-tracking-map')).toBeVisible();
      
      // Verify driver location marker
      await expect(page.locator('.driver-marker')).toBeVisible();
    }
  });
});

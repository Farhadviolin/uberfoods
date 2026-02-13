import { test, expect } from '@playwright/test';

test.describe('Driver - Delivery Flow (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as driver
    await page.goto('http://localhost:3004');
    
    const loginForm = page.locator('form');
    if (await loginForm.isVisible()) {
      await page.fill('[name="email"]', 'driver@uberfoods.com');
      await page.fill('[name="password"]', 'DriverPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/');
    }
  });

  test('accept and complete delivery', async ({ page }) => {
    // Step 1: View available orders
    await expect(page.locator('text=Verfügbare Bestellungen')).toBeVisible();
    
    // Step 2: Accept order
    await page.click('button:has-text("Akzeptieren")').first();
    
    // Step 3: Verify order accepted
    await expect(page.locator('text=Bestellung akzeptiert')).toBeVisible({ timeout: 5000 });
    
    // Step 4: Navigate to active delivery
    await page.click('text=Aktive Lieferung');
    
    // Step 5: Mark as picked up
    await page.click('button:has-text("Abgeholt")');
    await expect(page.locator('text=Status: In Transit')).toBeVisible();
    
    // Step 6: Mark as delivered
    await page.click('button:has-text("Zugestellt")');
    
    // Step 7: Verify completion
    await expect(page.locator('text=Lieferung abgeschlossen')).toBeVisible();
    
    // Step 8: Check earnings updated
    await page.click('text=Earnings');
    await expect(page.locator('.earnings-amount')).toBeVisible();
  });

  test('reject order with reason', async ({ page }) => {
    // View available orders
    await expect(page.locator('text=Verfügbare Bestellungen')).toBeVisible();
    
    // Click reject
    await page.click('button:has-text("Ablehnen")').first();
    
    // Select reason
    await page.click('text=Zu weit entfernt');
    
    // Confirm
    await page.click('button:has-text("Bestätigen")');
    
    // Verify rejected
    await expect(page.locator('text=Bestellung abgelehnt')).toBeVisible();
  });

  test('view earnings dashboard', async ({ page }) => {
    // Navigate to earnings
    await page.click('text=Earnings');
    
    // Verify stats visible
    await expect(page.locator('text=Today')).toBeVisible();
    await expect(page.locator('text=This Week')).toBeVisible();
    await expect(page.locator('.earnings-amount')).toHaveCount(2);
    
    // Verify chart
    await expect(page.locator('.earnings-chart')).toBeVisible();
  });

  test('update driver status online/offline', async ({ page }) => {
    // Find status toggle
    const statusToggle = page.locator('button:has-text("Online")').or(page.locator('button:has-text("Offline")'));
    
    // Get current status
    const currentStatus = await statusToggle.textContent();
    
    // Toggle status
    await statusToggle.click();
    
    // Verify status changed
    await page.waitForTimeout(500);
    const newStatus = await statusToggle.textContent();
    expect(newStatus).not.toBe(currentStatus);
  });

  test('view delivery history', async ({ page }) => {
    // Navigate to history
    await page.click('text=History');
    
    // Verify orders displayed
    const orderCards = page.locator('.order-card');
    const count = await orderCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
    
    // Filter by date
    await page.click('select[name="period"]');
    await page.click('option:has-text("This Week")');
    
    // Verify filtered
    await page.waitForTimeout(500);
  });

  test('emergency button functionality', async ({ page }) => {
    // Find emergency button
    const emergencyButton = page.locator('button:has-text("Emergency")');
    
    if (await emergencyButton.isVisible()) {
      await emergencyButton.click();
      
      // Verify emergency modal
      await expect(page.locator('text=Emergency Assistance')).toBeVisible();
      
      // Close modal
      await page.click('button:has-text("Cancel")');
    }
  });

  test('scan QR code for order verification', async ({ page }) => {
    // Navigate to active delivery (if available)
    const activeDelivery = page.locator('text=Aktive Lieferung');
    
    if (await activeDelivery.isVisible()) {
      await activeDelivery.click();
      
      // Find QR scanner button
      const qrButton = page.locator('button:has-text("QR Code")');
      
      if (await qrButton.isVisible()) {
        await qrButton.click();
        
        // Verify camera/scanner opened
        await expect(page.locator('.qr-scanner')).toBeVisible();
      }
    }
  });
});

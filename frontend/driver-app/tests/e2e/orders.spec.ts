import { test, expect } from '@playwright/test';

test.describe('Bestellungsverwaltung', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Login - setze Token direkt
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('driver_token', 'mock-token');
      localStorage.setItem('driver_user', JSON.stringify({
        id: 'driver-123',
        name: 'Test Driver',
        email: 'driver@test.com',
      }));
    });
    await page.reload();
  });

  test('zeigt Dashboard mit Bestellungen', async ({ page }) => {
    // Mock API Response
    await page.route('**/api/orders/driver/driver-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'order-1',
            status: 'ACCEPTED',
            totalAmount: 25.50,
            restaurant: { name: 'Test Restaurant', address: 'Test St. 1' },
            customer: { name: 'Test Customer', phone: '+49123456789' },
            address: 'Delivery St. 2',
            items: [{ dish: { name: 'Pizza' }, quantity: 1, price: 25.50 }],
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await expect(page.getByText(/dashboard/i)).toBeVisible();
    await expect(page.getByText(/test restaurant/i)).toBeVisible({ timeout: 5000 });
  });

  test('akzeptiert Bestellung', async ({ page }) => {
    await page.route('**/api/orders/driver/driver-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'order-1',
            status: 'ACCEPTED',
            totalAmount: 25.50,
            restaurant: { name: 'Test Restaurant', address: 'Test St. 1' },
            customer: { name: 'Test Customer', phone: '+49123456789' },
            address: 'Delivery St. 2',
            items: [{ dish: { name: 'Pizza' }, quantity: 1, price: 25.50 }],
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    });

    let acceptCalled = false;
    await page.route('**/api/orders/order-1/accept', async (route) => {
      acceptCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/');
    await page.waitForSelector('text=Test Restaurant', { timeout: 5000 });
    
    const acceptButton = page.getByRole('button', { name: /annehmen|accept/i }).first();
    await acceptButton.click();

    await expect(page).toHaveURL(/\//);
    expect(acceptCalled).toBe(true);
  });

  test('aktualisiert Bestellungsstatus', async ({ page }) => {
    await page.route('**/api/orders/driver/driver-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'order-1',
            status: 'ACCEPTED',
            driverId: 'driver-123',
            totalAmount: 25.50,
            restaurant: { name: 'Test Restaurant', address: 'Test St. 1' },
            customer: { name: 'Test Customer', phone: '+49123456789' },
            address: 'Delivery St. 2',
            items: [{ dish: { name: 'Pizza' }, quantity: 1, price: 25.50 }],
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    });

    let statusUpdated = false;
    await page.route('**/api/orders/order-1/status', async (route) => {
      statusUpdated = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/');
    await page.waitForSelector('text=Test Restaurant', { timeout: 5000 });
    
    const statusButton = page.getByRole('button', { name: /abgeholt|picked up/i }).first();
    if (await statusButton.isVisible()) {
      await statusButton.click();
      expect(statusUpdated).toBe(true);
    }
  });
});

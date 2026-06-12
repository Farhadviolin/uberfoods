import { test, expect } from '@playwright/test';

test.describe('Chat-Funktionalität', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Login
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

  test('öffnet Chat für Bestellung', async ({ page }) => {
    await page.route('**/api/orders/driver/driver-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'order-1',
            status: 'IN_TRANSIT',
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

    await page.route('**/api/chat/order-1/messages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');
    await expect(page.getByTestId('driver-dashboard')).toBeVisible();
    await page.waitForSelector('text=Test Restaurant', { timeout: 5000 });

    const chatButton = page.getByRole('button', { name: /chat/i }).first();
    await chatButton.click();

    await expect(page.getByTestId('chat-message-input')).toBeVisible();
  });

  test('sendet Chat-Nachricht', async ({ page }) => {
    await page.route('**/api/orders/driver/driver-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'order-1',
            status: 'IN_TRANSIT',
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

    await page.route('**/api/chat/order-1/messages', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await page.route('**/api/chat/message', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'chat-message-1',
            orderId: 'order-1',
            senderId: 'driver-123',
            senderType: 'driver',
            message: 'Test message',
            timestamp: new Date().toISOString(),
            read: false,
          }),
        });
      }
    });

    await page.goto('/');
    await expect(page.getByTestId('driver-dashboard')).toBeVisible();
    await page.waitForSelector('text=Test Restaurant', { timeout: 5000 });

    const chatButton = page.getByRole('button', { name: /chat/i }).first();
    await chatButton.click();

    const messageInput = page.getByTestId('chat-message-input');
    await messageInput.fill('Test message');

    const sendButton = page.getByTestId('chat-send-button');
    await sendButton.click();

    await expect(messageInput).toHaveValue('');
  });
});

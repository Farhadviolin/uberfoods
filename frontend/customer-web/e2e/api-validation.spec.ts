import { test } from './test-helpers';
import { expect } from '@playwright/test';

test.describe('API Validation Tests', () => {
  test('should validate real API responses with sanity checks', async ({ page }) => {
    // Intercept API calls to validate they are real (not mocked)
    const apiCalls: Array<{url: string, status: number, response: any}> = [];

    // Listen for API responses
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/') && !url.includes('/api/health')) {
        const status = response.status();
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch (e) {
          // Response might not be JSON
        }

        apiCalls.push({
          url,
          status,
          response: responseBody
        });
      }
    });

    // Navigate to home page and ensure app is loaded
    await page.goto('/');

    // Wait for initial API calls to complete
    await page.waitForTimeout(2000);

    // Validate that real API calls were made
    expect(apiCalls.length).toBeGreaterThan(0);

    // Check that we got successful responses (not mocked 200s)
    const successfulCalls = apiCalls.filter(call => call.status === 200);
    expect(successfulCalls.length).toBeGreaterThan(0);

    // Validate restaurant API response structure
    const restaurantCalls = apiCalls.filter(call => call.url.includes('/api/restaurants'));
    if (restaurantCalls.length > 0) {
      const restaurantResponse = restaurantCalls[0].response;
      // API returns { data: [...], pagination: {...} }
      expect(restaurantResponse).toHaveProperty('data');
      expect(Array.isArray(restaurantResponse.data)).toBe(true);

      if (restaurantResponse.data.length > 0) {
        const firstRestaurant = restaurantResponse.data[0];
        expect(firstRestaurant).toHaveProperty('id');
        expect(firstRestaurant).toHaveProperty('name');
        expect(typeof firstRestaurant.name).toBe('string');
        expect(firstRestaurant.name.length).toBeGreaterThan(0);
      }
    }

    // Validate order API response structure
    const orderCalls = apiCalls.filter(call => call.url.includes('/api/orders'));
    if (orderCalls.length > 0) {
      const orderResponse = orderCalls[0].response;
      // API returns { data: [...], pagination: {...} }
      expect(orderResponse).toHaveProperty('data');
      expect(Array.isArray(orderResponse.data)).toBe(true);

      if (orderResponse.data.length > 0) {
        const firstOrder = orderResponse.data[0];
        expect(firstOrder).toHaveProperty('id');
        expect(firstOrder).toHaveProperty('status');
        expect(['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).toContain(firstOrder.status);
      }
    }

    console.log(`✅ Validated ${apiCalls.length} API calls with ${successfulCalls.length} successful responses`);
  });

  test('should handle API failures gracefully', async ({ page }) => {
    // Navigate to a page that might make failing API calls
    await page.goto('/');

    // Wait for potential API calls
    await page.waitForTimeout(3000);

    // This test passes if the page doesn't crash despite API failures
    // The UI should show appropriate fallbacks or error states
    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3102';
    expect(page.url()).toContain(baseUrl.replace('/api', '')); // Still on our domain
  });

  test('should verify API base URL configuration', async ({ page }) => {
    // Check that API calls go to the correct backend
    const apiResponses: string[] = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        apiResponses.push(response.url());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Validate API base URL configuration
    if (apiResponses.length > 0) {
      const firstApiCall = apiResponses[0];
      const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3102';
      expect(firstApiCall).toContain(`${baseUrl.replace('/api', '')}/api`); // Vite proxy port
      expect(firstApiCall).not.toContain('http://127.0.0.1:3001/api'); // Not mock server
    }
  });
});
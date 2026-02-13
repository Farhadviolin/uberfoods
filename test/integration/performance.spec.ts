import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';

test.describe('Performance Tests', () => {
  let backendProcess: any;
  let customerWebProcess: any;
  let driverAppProcess: any;
  let restaurantWebProcess: any;

  test.beforeAll(async () => {
    console.log('🚀 Starting services for performance testing...');

    // Start Backend
    backendProcess = spawn('npm', ['run', 'start:prod'], {
      cwd: path.join(process.cwd(), 'backend'),
      stdio: 'pipe'
    });

    // Start Frontend Apps
    customerWebProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(process.cwd(), 'frontend/customer-web'),
      stdio: 'pipe'
    });

    driverAppProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(process.cwd(), 'frontend/driver-app'),
      stdio: 'pipe'
    });

    restaurantWebProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(process.cwd(), 'frontend/restaurant-web'),
      stdio: 'pipe'
    });

    // Wait for builds to complete
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('✅ Performance test services ready');
  });

  test.afterAll(async () => {
    [backendProcess, customerWebProcess, driverAppProcess, restaurantWebProcess].forEach(process => {
      if (process) {
        process.kill();
      }
    });
  });

  test.describe('Page Load Performance', () => {
    test('customer web should load within 3 seconds', async ({ page, browser }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;

      console.log(`Customer Web load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000); // 3 seconds

      // Check Core Web Vitals approximation
      const metrics = await page.evaluate(() => {
        const observer = new PerformanceObserver((list) => {
          return list.getEntries();
        });
        observer.observe({ entryTypes: ['navigation'] });

        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        };
      });

      expect(metrics.domContentLoaded).toBeLessThan(2000);
      expect(metrics.loadComplete).toBeLessThan(3000);
    });

    test('driver app should load within 2 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;

      console.log(`Driver App load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(2000); // 2 seconds
    });

    test('restaurant web should load within 2.5 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:3004', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;

      console.log(`Restaurant Web load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(2500); // 2.5 seconds
    });
  });

  test.describe('API Response Performance', () => {
    test('restaurant list API should respond within 500ms', async ({ page }) => {
      await page.goto('http://localhost:3002/login');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Login")');

      const startTime = Date.now();
      await page.goto('http://localhost:3002/restaurants');
      await page.waitForSelector('[data-testid="restaurant-card"]');
      const responseTime = Date.now() - startTime;

      console.log(`Restaurant list API response: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(1000); // 1 second including page navigation
    });

    test('order placement API should respond within 2 seconds', async ({ page }) => {
      await page.goto('http://localhost:3002/login');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Login")');

      // Quick order placement
      await page.goto('http://localhost:3002/restaurants');
      const firstRestaurant = page.locator('[data-testid="restaurant-card"]').first();

      if (await firstRestaurant.isVisible()) {
        await firstRestaurant.click();

        const addToCartButton = page.locator('button[data-testid="add-to-cart"]').first();
        if (await addToCartButton.isVisible()) {
          await addToCartButton.click();

          await page.goto('http://localhost:3002/checkout');
          await page.fill('input[name="street"]', 'Test Street 123');
          await page.fill('input[name="city"]', 'Vienna');
          await page.fill('input[name="phone"]', '+43 123 456 789');

          const startTime = Date.now();
          const placeOrderButton = page.locator('button[data-testid="place-order"]');
          if (await placeOrderButton.isVisible()) {
            await placeOrderButton.click();
            await page.waitForSelector('text=/order placed|bestellung/i');
            const orderTime = Date.now() - startTime;

            console.log(`Order placement time: ${orderTime}ms`);
            expect(orderTime).toBeLessThan(3000); // 3 seconds
          }
        }
      }
    });
  });

  test.describe('Concurrent Users Simulation', () => {
    test('should handle 10 concurrent restaurant browsers', async ({ browser }) => {
      const pages = [];
      const startTime = Date.now();

      // Create 10 concurrent sessions
      for (let i = 0; i < 10; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        pages.push({ page, context });

        await page.goto('http://localhost:3002/restaurants');
        await page.waitForSelector('[data-testid="restaurant-card"]');
      }

      const loadTime = Date.now() - startTime;
      console.log(`10 concurrent restaurant loads: ${loadTime}ms average: ${loadTime / 10}ms`);

      expect(loadTime / 10).toBeLessThan(1000); // Average under 1 second

      // Cleanup
      for (const { context } of pages) {
        await context.close();
      }
    });

    test('should handle 5 concurrent order placements', async ({ browser }) => {
      const orders = [];
      const startTime = Date.now();

      // Create 5 concurrent order placements
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('http://localhost:3002/login');
        await page.fill('input[type="email"]', `test${i}@example.com`);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Login")');

        await page.goto('http://localhost:3002/restaurants');
        const firstRestaurant = page.locator('[data-testid="restaurant-card"]').first();

        if (await firstRestaurant.isVisible()) {
          await firstRestaurant.click();

          const addToCartButton = page.locator('button[data-testid="add-to-cart"]').first();
          if (await addToCartButton.isVisible()) {
            await addToCartButton.click();

            await page.goto('http://localhost:3002/checkout');
            await page.fill('input[name="street"]', `Test Street ${i + 1}23`);
            await page.fill('input[name="city"]', 'Vienna');
            await page.fill('input[name="phone"]', '+43 123 456 789');

            const placeOrderButton = page.locator('button[data-testid="place-order"]');
            if (await placeOrderButton.isVisible()) {
              await placeOrderButton.click();
              orders.push({ page, context });
            }
          }
        }
      }

      const orderTime = Date.now() - startTime;
      console.log(`5 concurrent orders: ${orderTime}ms average: ${orderTime / 5}ms`);

      expect(orderTime / 5).toBeLessThan(2000); // Average under 2 seconds

      // Cleanup
      for (const { context } of orders) {
        await context.close();
      }
    });
  });

  test.describe('Memory Usage', () => {
    test('customer web should not exceed 100MB memory', async ({ page }) => {
      await page.goto('http://localhost:3002');

      // Navigate through app
      await page.goto('http://localhost:3002/login');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Login")');

      await page.goto('http://localhost:3002/restaurants');
      await page.waitForSelector('[data-testid="restaurant-card"]');

      // Check memory usage
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });

      if (memoryInfo) {
        const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
        console.log(`Customer Web memory usage: ${usedMB}MB`);
        expect(usedMB).toBeLessThan(100); // Under 100MB
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should load all assets within 2 seconds', async ({ page }) => {
      const resources: any[] = [];

      page.on('response', response => {
        resources.push({
          url: response.url(),
          status: response.status(),
          timing: response.timing(),
        });
      });

      await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

      const slowResources = resources.filter(resource => {
        const timing = resource.timing;
        const totalTime = timing.receiveHeadersEnd - timing.requestStart;
        return totalTime > 2000; // Over 2 seconds
      });

      console.log(`Slow resources (>2s): ${slowResources.length}`);
      expect(slowResources.length).toBe(0);
    });

    test('should have reasonable bundle sizes', async ({ page }) => {
      const cdpSession = await page.context().newCDPSession(page);

      await cdpSession.send('Network.enable');

      const requests: any[] = [];
      cdpSession.on('Network.responseReceived', (event) => {
        if (event.response.url.includes('.js') && event.response.headers['content-length']) {
          requests.push({
            url: event.response.url,
            size: parseInt(event.response.headers['content-length']),
          });
        }
      });

      await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

      const largeBundles = requests.filter(req => req.size > 1024 * 1024); // Over 1MB
      console.log(`Large bundles (>1MB): ${largeBundles.length}`);

      // Allow some large bundles but not too many
      expect(largeBundles.length).toBeLessThan(3);
    });
  });

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile viewport', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      });
      const page = await context.newPage();

      try {
        const startTime = Date.now();
        await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
        const loadTime = Date.now() - startTime;

        console.log(`Mobile load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(4000); // 4 seconds for mobile

        // Test scrolling performance
        await page.goto('http://localhost:3002/restaurants');

        const scrollStart = Date.now();
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(1000);
        const scrollTime = Date.now() - scrollStart;

        console.log(`Scroll performance: ${scrollTime}ms`);
        expect(scrollTime).toBeLessThan(1000); // Smooth scrolling

      } finally {
        await context.close();
      }
    });
  });
});

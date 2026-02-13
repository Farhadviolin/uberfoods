import { test, expect } from '@playwright/test';

test('debug - just visit login page', async ({ page }) => {
  console.log('Starting debug test...');

  await page.goto('http://127.0.0.1:3102/login');
  console.log('Page loaded');

  await page.screenshot({ path: 'debug-screenshot.png' });
  console.log('Screenshot taken');

  // Check if we can find basic elements
  const title = await page.title();
  console.log('Page title:', title);

  expect(title).toBeTruthy();
  console.log('Test completed successfully');
});
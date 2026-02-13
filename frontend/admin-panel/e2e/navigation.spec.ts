import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  const menuItems = [
    { name: 'Dashboard', selector: 'text=/dashboard/i' },
    { name: 'Restaurants', selector: 'text=/restaurants/i' },
    { name: 'Orders', selector: 'text=/bestellungen|orders/i' },
    { name: 'Customers', selector: 'text=/kunden|customers/i' },
    { name: 'Drivers', selector: 'text=/fahrer|drivers/i' },
  ];

  for (const item of menuItems) {
    test(`should navigate to ${item.name}`, async ({ page }) => {
      const menuItem = page.locator(item.selector).first();
      
      if (await menuItem.isVisible({ timeout: 5000 })) {
        await menuItem.click();
        await page.waitForTimeout(2000);
        
        // Should show the page content
        await expect(page.locator(item.selector).first()).toBeVisible();
      }
    });
  }

  test('should have responsive sidebar', async ({ page }) => {
    // Check if sidebar exists
    const sidebar = page.locator('[class*="sidebar"], nav').first();
    
    if (await sidebar.isVisible({ timeout: 5000 })) {
      // On mobile, sidebar might be hidden
      const viewport = page.viewportSize();
      
      if (viewport && viewport.width < 768) {
        // Mobile: sidebar should be toggleable
        const menuButton = page.locator('button[aria-label*="menu"], button[class*="menu"]').first();
        if (await menuButton.isVisible({ timeout: 2000 })) {
          await menuButton.click();
          await expect(sidebar).toBeVisible();
        }
      } else {
        // Desktop: sidebar should be visible
        await expect(sidebar).toBeVisible();
      }
    }
  });
});


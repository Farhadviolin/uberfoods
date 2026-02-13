import { test, expect } from './test-helpers';

test.describe('Restaurant Browsing', () => {
  test('should display restaurant list', async ({ page }) => {
    await page.goto('/');

    // Should show loading state first
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Should display restaurants
    await expect(page.locator('[data-testid="restaurant-list"]')).toBeVisible();

    // Should have at least one restaurant
    const restaurantCards = page.locator('[data-testid="restaurant-card"]');
    await expect(restaurantCards.first()).toBeVisible();
  });

  test('should filter restaurants by cuisine', async ({ page }) => {
    await page.goto('/');

    // Wait for restaurants to load
    await expect(page.locator('[data-testid="restaurant-list"]')).toBeVisible();

    // Find and click cuisine filter
    await page.click('[data-testid="cuisine-filter"]');
    await page.click('[data-testid="cuisine-italian"]');

    // Should show filtered results
    const restaurantCards = page.locator('[data-testid="restaurant-card"]');
    const italianRestaurants = await restaurantCards.filter({
      hasText: 'Italian'
    }).count();

    expect(italianRestaurants).toBeGreaterThan(0);
  });

  test('should search restaurants', async ({ page }) => {
    await page.goto('/');

    // Wait for restaurants to load
    await expect(page.locator('[data-testid="restaurant-list"]')).toBeVisible();

    // Search for specific restaurant
    await page.fill('[data-testid="search-input"]', 'Pizza Palace');
    await page.click('[data-testid="search-button"]');

    // Should show search results
    await expect(page.locator('[data-testid="restaurant-card"]').filter({
      hasText: 'Pizza Palace'
    })).toBeVisible();
  });

  test('should show restaurant details', async ({ page }) => {
    await page.goto('/');

    // Wait for restaurants to load
    await expect(page.locator('[data-testid="restaurant-list"]')).toBeVisible();

    // Click on first restaurant
    await page.locator('[data-testid="restaurant-card"]').first().click();

    // Should navigate to restaurant page
    await expect(page).toHaveURL(/\/restaurant\/.+/);

    // Should show restaurant details
    await expect(page.locator('[data-testid="restaurant-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="restaurant-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="restaurant-rating"]')).toBeVisible();
  });

  test('should display restaurant rating and reviews', async ({ page }) => {
    await page.goto('/');

    // Wait for restaurants to load
    await expect(page.locator('[data-testid="restaurant-list"]')).toBeVisible();

    // Click on first restaurant
    await page.locator('[data-testid="restaurant-card"]').first().click();

    // Should show rating
    await expect(page.locator('[data-testid="restaurant-rating"]')).toBeVisible();

    // Should show reviews section
    await expect(page.locator('[data-testid="reviews-section"]')).toBeVisible();
  });

  test('should handle empty search results', async ({ page }) => {
    await page.goto('/');

    // Search for non-existent restaurant
    await page.fill('[data-testid="search-input"]', 'NonExistentRestaurant12345');
    await page.click('[data-testid="search-button"]');

    // Should show no results message
    await expect(page.locator('[data-testid="no-results-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-results-message"]')).toContainText('No restaurants found');
  });

  test('should sort restaurants by rating', async ({ page }) => {
    await page.goto('/');

    // Wait for restaurants to load
    await expect(page.locator('[data-testid="restaurant-list"]')).toBeVisible();

    // Click sort by rating
    await page.click('[data-testid="sort-rating"]');

    // First restaurant should have highest rating
    const firstRating = await page.locator('[data-testid="restaurant-rating"]').first().textContent();
    const ratings = await page.locator('[data-testid="restaurant-rating"]').allTextContents();

    // Convert to numbers and check if sorted descending
    const ratingNumbers = ratings.map(r => parseFloat(r));
    const isSortedDescending = ratingNumbers.every((val, i, arr) =>
      !i || arr[i - 1] >= val
    );

    expect(isSortedDescending).toBe(true);
  });

  test('should show delivery time and fee', async ({ page }) => {
    await page.goto('/');

    // Wait for restaurants to load
    await expect(page.locator('[data-testid="restaurant-list"]')).toBeVisible();

    // Check first restaurant card
    const firstCard = page.locator('[data-testid="restaurant-card"]').first();

    // Should show delivery time
    await expect(firstCard.locator('[data-testid="delivery-time"]')).toBeVisible();

    // Should show delivery fee
    await expect(firstCard.locator('[data-testid="delivery-fee"]')).toBeVisible();
  });
});
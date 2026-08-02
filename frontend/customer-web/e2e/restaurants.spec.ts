import { expect } from '@playwright/test';
import { test } from './test-helpers';

test.describe('Restaurant public browsing', () => {
  test('should expose a safe public restaurant list', async ({ page }) => {
    const response = await page.request.get('/api/restaurants/public');

    expect(response.status()).toBe(200);
    const payload = await response.json();
    const restaurants = Array.isArray(payload)
      ? payload
      : payload.data ?? payload.restaurants;

    expect(Array.isArray(restaurants)).toBe(true);
    expect(restaurants.length).toBeGreaterThan(0);
    expect(restaurants[0]).toEqual(expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
      dishes: expect.any(Array),
    }));

    for (const restaurant of restaurants) {
      expect(restaurant).not.toHaveProperty('password');
      expect(restaurant).not.toHaveProperty('passwordHash');
      expect(restaurant).not.toHaveProperty('accessToken');
      expect(restaurant).not.toHaveProperty('refreshToken');
    }
  });

  test('should render the public restaurant list with delivery metadata', async ({ page }) => {
    await page.goto('/');

    const restaurantList = page.getByTestId('restaurant-list');
    await expect(restaurantList).toBeVisible();

    const restaurantCards = page.getByTestId('restaurant-card');
    await expect(restaurantCards).toHaveCount(3);
    await expect(restaurantCards.first().getByTestId('restaurant-name')).toBeVisible();
    await expect(restaurantCards.first().locator('.delivery-time')).toBeVisible();
    await expect(restaurantCards.first().locator('.delivery-fee')).toBeVisible();
  });

  test('should open a public restaurant detail and its dishes', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.getByTestId('restaurant-card').first();

    await firstCard.click();

    await expect(page).toHaveURL(/\/restaurant\/.+/);
    await expect(page.getByTestId('restaurant-name')).toBeVisible();
    await expect(page.locator('.dish-card').first()).toBeVisible();
  });

  test('should return not found for an unknown public restaurant', async ({ page }) => {
    const response = await page.request.get(
      '/api/restaurants/public/00000000-0000-0000-0000-000000000000',
    );

    expect(response.status()).toBe(404);
  });

  test('should keep the private restaurant profile protected', async ({ page }) => {
    const response = await page.request.get('/api/restaurants/me');

    expect(response.status()).toBe(401);
  });
});

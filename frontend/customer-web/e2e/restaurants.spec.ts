import { expect } from '@playwright/test';
import { test } from './test-helpers';

type PublicRestaurant = Record<string, unknown>;

function unwrapRestaurantList(payload: unknown): PublicRestaurant[] {
  if (Array.isArray(payload)) return payload as PublicRestaurant[];
  if (!payload || typeof payload !== 'object') return [];

  const wrapped = payload as { data?: unknown; restaurants?: unknown };
  const list = wrapped.data ?? wrapped.restaurants;
  return Array.isArray(list) ? list as PublicRestaurant[] : [];
}

function unwrapRestaurant(payload: unknown): PublicRestaurant {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};

  const wrapped = payload as { data?: unknown };
  if (wrapped.data && typeof wrapped.data === 'object' && !Array.isArray(wrapped.data)) {
    return wrapped.data as PublicRestaurant;
  }

  return payload as PublicRestaurant;
}

test.describe('Restaurant public browsing', () => {
  test('should expose a safe public restaurant list', async ({ request }) => {
    const response = await request.get('/api/restaurants/public');

    expect(response.status()).toBe(200);
    const restaurants = unwrapRestaurantList(await response.json());

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

  test('should expose public cuisine metadata for every restaurant', async ({ request }) => {
    const response = await request.get('/api/restaurants/public');
    const restaurants = unwrapRestaurantList(await response.json());

    expect(response.status()).toBe(200);
    expect(restaurants).toHaveLength(3);
    for (const restaurant of restaurants) {
      expect(restaurant).toHaveProperty('cuisines');
      expect(Array.isArray(restaurant.cuisines)).toBe(true);
    }
  });

  test('should expose the seeded Pizza Palace in the public list', async ({ request }) => {
    const response = await request.get('/api/restaurants/public');
    const restaurants = unwrapRestaurantList(await response.json());

    expect(response.status()).toBe(200);
    expect(restaurants).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Pizza Palace' }),
    ]));
  });

  test('should open a public restaurant detail and its dishes', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.getByTestId('restaurant-card').first();

    await firstCard.click();

    await expect(page).toHaveURL(/\/restaurant\/.+/);
    await expect(page.getByTestId('restaurant-name')).toBeVisible();
    await expect(page.locator('.dish-card').first()).toBeVisible();
  });

  test('should return a complete public restaurant detail', async ({ request }) => {
    const listResponse = await request.get('/api/restaurants/public');
    const restaurants = unwrapRestaurantList(await listResponse.json());
    const restaurantId = restaurants[0]?.id;

    expect(restaurantId).toEqual(expect.any(String));
    const detailResponse = await request.get(`/api/restaurants/public/${restaurantId}`);
    const restaurant = unwrapRestaurant(await detailResponse.json());

    expect(detailResponse.status()).toBe(200);
    expect(restaurant).toEqual(expect.objectContaining({
      id: restaurantId,
      name: expect.any(String),
      dishes: expect.any(Array),
    }));
  });

  test('should return not found for an unknown public restaurant', async ({ request }) => {
    const response = await request.get(
      '/api/restaurants/public/00000000-0000-0000-0000-000000000000',
    );

    expect(response.status()).toBe(404);
  });

  test('should keep the private restaurant profile protected', async ({ request }) => {
    const response = await request.get('/api/restaurants/me');

    expect(response.status()).toBe(401);
  });
});

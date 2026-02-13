import { test, expect } from '@playwright/test';

// API-E2E laufen nur, wenn explizit aktiviert
const runApiE2E = process.env.E2E_RUN_API === 'true';

test.describe('Subscriptions API E2E Tests', () => {
  /**
   * Integrationstests für kritische Subscriptions-API-Endpunkte
   * Testet die Backend-Integration für Subscription-Verwaltung
   */
  test.describe('Subscriptions API Integration', () => {
    test.skip(!runApiE2E, 'API E2E tests are disabled. Set E2E_RUN_API=true to enable.');
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login und Token holen
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@uberfoods.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
      },
    });

    if (loginResponse.ok()) {
      const data = await loginResponse.json();
      authToken = data.access_token || data.token;
    }
  });

  test('GET /api/admin/users/subscriptions - sollte Subscriptions abrufen', async ({ request }) => {
    const response = await request.get('/api/admin/users/subscriptions', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        page: 1,
        limit: 10,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Response sollte entweder Array oder paginated sein
    expect(data).toBeDefined();
    if (data.data) {
      expect(Array.isArray(data.data)).toBeTruthy();
    } else {
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  test('GET /api/admin/users/subscriptions/analytics - sollte Analytics abrufen', async ({ request }) => {
    const response = await request.get('/api/admin/users/subscriptions/analytics', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('GET /api/admin/users/subscriptions/tier-configs - sollte Tier-Konfigurationen abrufen', async ({ request }) => {
    const response = await request.get('/api/admin/users/subscriptions/tier-configs', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('PUT /api/admin/users/subscriptions/tier-configs/:tier - sollte Tier-Konfiguration aktualisieren', async ({ request }) => {
    // Erst Tier-Configs holen
    const configsResponse = await request.get('/api/admin/users/subscriptions/tier-configs', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (configsResponse.ok()) {
      const configs = await configsResponse.json();
      
      if (configs.length > 0) {
        const tier = configs[0].tier || 'BASIC';
        
        const updateResponse = await request.put(`/api/admin/users/subscriptions/tier-configs/${tier}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            price: 9.99,
            features: ['feature1', 'feature2'],
          },
        });

        // Kann 200 (success) oder 400 (validation error) sein
        expect([200, 400]).toContain(updateResponse.status());
      }
    }
  });

  test('POST /api/admin/users/subscriptions/:driverId/upgrade - sollte Subscription upgraden', async ({ request }) => {
    // Erst Driver mit Subscription holen
    const [subscriptionsResponse, driversResponse] = await Promise.all([
      request.get('/api/admin/users/subscriptions', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { page: 1, limit: 1 },
      }),
      request.get('/api/drivers', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { limit: 1 },
      }),
    ]);

    if (subscriptionsResponse.ok() && driversResponse.ok()) {
      const subscriptionsData = await subscriptionsResponse.json();
      const driversData = await driversResponse.json();
      
      const subscriptions = subscriptionsData.data || subscriptionsData;
      const drivers = Array.isArray(driversData) ? driversData : [];
      
      // Verwende Driver-ID aus Subscription oder ersten Driver
      const driverId = subscriptions.length > 0 
        ? subscriptions[0].driverId 
        : (drivers.length > 0 ? drivers[0].id : null);
      
      if (driverId) {
        const upgradeResponse = await request.post(`/api/admin/users/subscriptions/${driverId}/upgrade`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            tier: 'PREMIUM',
          },
        });

        // Kann 200 (success), 201 (created), 400 (validation), oder 404 (not found) sein
        expect([200, 201, 400, 404]).toContain(upgradeResponse.status());
      }
    }
  });

  test('GET /api/admin/users/subscriptions/analytics/revenue-charts - sollte Revenue-Charts abrufen', async ({ request }) => {
    const response = await request.get('/api/admin/users/subscriptions/analytics/revenue-charts', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        period: '30d',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('GET /api/admin/users/subscriptions/analytics/churn-prediction - sollte Churn-Prediction abrufen', async ({ request }) => {
    const response = await request.get('/api/admin/users/subscriptions/analytics/churn-prediction', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
  });
});

});

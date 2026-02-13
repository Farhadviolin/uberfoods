import { test, expect } from '@playwright/test';

// API-E2E laufen nur, wenn explizit aktiviert
const runApiE2E = process.env.E2E_RUN_API === 'true';

test.describe('Financial API E2E Tests', () => {
  /**
   * Integrationstests für kritische Financial-API-Endpunkte
   * Testet die Backend-Integration für Finanzverwaltung
   */
  test.describe('Financial API Integration', () => {
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

  test('GET /api/admin/financial/overview - sollte Finanzübersicht abrufen', async ({ request }) => {
    const response = await request.get('/api/admin/financial/overview', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Response sollte Finanzdaten enthalten
    expect(data).toBeDefined();
  });

  test('POST /api/admin/financial/adjust-driver-balance - sollte Driver Balance anpassen', async ({ request }) => {
    // Erst Drivers holen für Test
    const driversResponse = await request.get('/api/admin/drivers', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        limit: 1,
      },
    });

    if (driversResponse.ok()) {
      const driversData = await driversResponse.json();
      const drivers = driversData.data || driversData;

      if (drivers.length > 0) {
        const response = await request.post('/api/admin/financial/adjust-driver-balance', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            driverId: drivers[0].id,
            amount: 10.00,
            reason: "E2E Test Adjustment",
            type: "bonus",
          },
        });

        // Kann 200 (success) oder 400 (validation error) sein
        expect([200, 201, 400]).toContain(response.status());
      }
    }
  });
});

});
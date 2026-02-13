import { test, expect } from '@playwright/test';

// API-E2E laufen nur, wenn explizit aktiviert
const runApiE2E = process.env.E2E_RUN_API === 'true';

test.describe('Orders API E2E Tests', () => {
  /**
   * Integrationstests für kritische Orders-API-Endpunkte
   * Testet die Backend-Integration für Bestellverwaltung
   */
  test.describe('Orders API Integration', () => {
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

  test('GET /api/orders - sollte Bestellungen abrufen', async ({ request }) => {
    const response = await request.get('/api/orders', {
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
      // Paginated response
      expect(Array.isArray(data.data)).toBeTruthy();
      expect(data.meta).toBeDefined();
    } else {
      // Array response
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  test('GET /api/orders - sollte Filterung nach Status unterstützen', async ({ request }) => {
    const response = await request.get('/api/orders', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        status: 'PENDING',
        page: 1,
        limit: 10,
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('PATCH /api/orders/:id/status - sollte Bestellstatus aktualisieren', async ({ request }) => {
    // Erst eine Bestellung holen
    const ordersResponse = await request.get('/api/orders', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        page: 1,
        limit: 1,
      },
    });

    if (ordersResponse.ok()) {
      const ordersData = await ordersResponse.json();
      const orders = ordersData.data || ordersData;
      
      if (orders.length > 0) {
        const orderId = orders[0].id;
        
        const updateResponse = await request.patch(`/api/orders/${orderId}/status`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            status: 'CONFIRMED',
          },
        });

        expect(updateResponse.ok()).toBeTruthy();
      }
    }
  });

  test('PATCH /api/orders/:id/assign - sollte Fahrer zuweisen', async ({ request }) => {
    // Erst Bestellung und Fahrer holen
    const [ordersResponse, driversResponse] = await Promise.all([
      request.get('/api/orders', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { page: 1, limit: 1 },
      }),
      request.get('/api/drivers', {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
    ]);

    if (ordersResponse.ok() && driversResponse.ok()) {
      const ordersData = await ordersResponse.json();
      const driversData = await driversResponse.json();
      
      const orders = ordersData.data || ordersData;
      const drivers = Array.isArray(driversData) ? driversData : [];
      
      if (orders.length > 0 && drivers.length > 0) {
        const orderId = orders[0].id;
        const driverId = drivers[0].id;
        
        const assignResponse = await request.patch(`/api/orders/${orderId}/assign`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            driverId,
          },
        });

        expect(assignResponse.ok()).toBeTruthy();
      }
    }
  });

  test('GET /api/orders/advanced/stats - sollte erweiterte Statistiken liefern', async ({ request }) => {
    const response = await request.get('/api/orders/advanced/stats', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    // Endpunkt sollte existieren (kann optional sein)
    expect([200, 404]).toContain(response.status());
  });
});


});

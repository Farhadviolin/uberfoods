const axios = require('axios');

async function testRestaurantManagement() {
  const baseURL = 'http://localhost:3005/api';
  console.log('🧪 Teste Restaurant-Management APIs...\n');

  const tests = [
    // 1. Restaurants abrufen
    {
      name: 'GET /restaurants',
      method: 'GET',
      url: '/restaurants',
      expectStatus: 200,
      expectArray: true
    },

    // 2. Einzelnes Restaurant abrufen
    {
      name: 'GET /restaurants/:id',
      method: 'GET',
      url: '/restaurants/rest-1',
      expectStatus: 200,
      expectObject: true
    },

    // 3. Nicht existierendes Restaurant
    {
      name: 'GET /restaurants/:id (404)',
      method: 'GET',
      url: '/restaurants/non-existent',
      expectStatus: 404
    },

    // 4. Restaurant erstellen
    {
      name: 'POST /restaurants',
      method: 'POST',
      url: '/restaurants',
      data: {
        name: 'Test Restaurant',
        description: 'Test Description',
        address: 'Test Address 123',
        phone: '+43 1 23456789',
        email: 'test@example.com',
        isActive: true
      },
      expectStatus: 201,
      expectObject: true
    },

    // 5. Restaurant aktualisieren
    {
      name: 'PUT /restaurants/:id',
      method: 'PUT',
      url: '/restaurants/rest-1',
      data: {
        name: 'Updated Pizza Palace Wien',
        description: 'Updated description'
      },
      expectStatus: 200,
      expectObject: true
    },

    // 6. Restaurant löschen
    {
      name: 'DELETE /restaurants/:id',
      method: 'DELETE',
      url: '/restaurants/rest-3',
      expectStatus: 200
    },

    // 7. Settings APIs
    {
      name: 'GET /settings/restaurant/:id/hours',
      method: 'GET',
      url: '/settings/restaurant/rest-1/hours',
      expectStatus: 200,
      expectObject: true
    },

    {
      name: 'PUT /settings/restaurant/:id/hours',
      method: 'PUT',
      url: '/settings/restaurant/rest-1/hours',
      data: {
        monday: { open: '10:00', close: '20:00', isClosed: false }
      },
      expectStatus: 200
    },

    {
      name: 'GET /settings/restaurant/:id/holidays',
      method: 'GET',
      url: '/settings/restaurant/rest-1/holidays',
      expectStatus: 200,
      expectArray: true
    },

    {
      name: 'PUT /settings/restaurant/:id/holidays',
      method: 'PUT',
      url: '/settings/restaurant/rest-1/holidays',
      data: { holidays: [{ date: '2025-12-25', name: 'Christmas' }] },
      expectStatus: 200
    },

    // 8. Statistics APIs
    {
      name: 'GET /statistics/restaurant/:id',
      method: 'GET',
      url: '/statistics/restaurant/rest-1',
      expectStatus: 200,
      expectObject: true
    },

    // 9. Promotions (bereits getestet)
    {
      name: 'GET /promotions',
      method: 'GET',
      url: '/promotions',
      expectStatus: 200,
      expectArray: true
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const config = {
        method: test.method,
        url: `${baseURL}${test.url}`,
        ...(test.data && { data: test.data }),
        timeout: 5000
      };

      const response = await axios(config);

      // Status überprüfen
      if (response.status !== test.expectStatus) {
        console.log(`❌ ${test.name}: Erwartet Status ${test.expectStatus}, bekam ${response.status}`);
        failed++;
        continue;
      }

      // Datenstruktur überprüfen
      if (test.expectArray && !Array.isArray(response.data)) {
        console.log(`❌ ${test.name}: Erwartet Array, bekam ${typeof response.data}`);
        failed++;
        continue;
      }

      if (test.expectObject && typeof response.data !== 'object') {
        console.log(`❌ ${test.name}: Erwartet Object, bekam ${typeof response.data}`);
        failed++;
        continue;
      }

      console.log(`✅ ${test.name}: ${response.status} - OK`);
      passed++;

    } catch (error) {
      if (error.response) {
        if (error.response.status === test.expectStatus) {
          console.log(`✅ ${test.name}: ${error.response.status} - OK (erwarteter Fehler)`);
          passed++;
        } else {
          console.log(`❌ ${test.name}: Erwartet Status ${test.expectStatus}, bekam ${error.response.status}`);
          failed++;
        }
      } else {
        console.log(`❌ ${test.name}: Netzwerk-Fehler - ${error.message}`);
        failed++;
      }
    }
  }

  console.log(`\n📊 Test-Ergebnisse:`);
  console.log(`✅ Bestanden: ${passed}`);
  console.log(`❌ Fehlgeschlagen: ${failed}`);
  console.log(`📈 Erfolgsrate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 Alle Restaurant-Management-APIs funktionieren korrekt!');
  } else {
    console.log('\n⚠️ Einige Tests sind fehlgeschlagen. Überprüfen Sie die Implementierung.');
  }

  return failed === 0;
}

testRestaurantManagement().catch(console.error);
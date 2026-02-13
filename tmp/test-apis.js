const axios = require('axios');

async function testAPIs() {
  const baseURL = 'http://localhost:3005/api';
  const endpoints = [
    '/health',
    '/statistics/dashboard',
    '/statistics/revenue',
    '/statistics/top-restaurants',
    '/statistics/driver-performance',
    '/statistics/top-promotions',
    '/statistics/customer-growth',
    '/statistics/order-status-distribution',
  ];

  console.log('🧪 Teste API-Endpunkte...\n');

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${baseURL}${endpoint}`, {
        timeout: 5000
      });

      console.log(`✅ ${endpoint}: ${response.status} - ${response.data ? 'Daten erhalten' : 'Leer'}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || error.code || 'Fehler'}`);
    }
  }

  console.log('\n🎉 API-Tests abgeschlossen!');
}

testAPIs().catch(console.error);
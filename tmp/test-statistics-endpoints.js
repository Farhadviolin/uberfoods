// Test script to validate statistics endpoints implementation
const axios = require('axios');

async function testStatisticsEndpoints() {
  const baseURL = 'http://localhost:3001'; // Adjust if different
  const authToken = 'your-jwt-token-here'; // Would need actual token

  const endpoints = [
    '/statistics/top-restaurants',
    '/statistics/driver-performance',
    '/statistics/top-promotions',
    '/statistics/promotion-performance?promotionId=test',
    '/statistics/customer-growth',
    '/statistics/order-status-distribution'
  ];

  console.log('Testing Statistics Endpoints Implementation...\n');

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        timeout: 5000
      });

      console.log(`✅ ${endpoint}: SUCCESS (${response.status})`);
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${endpoint}: FAILED (${error.response.status})`);
        console.log(`   Error: ${error.response.data?.message || 'Unknown error'}\n`);
      } else {
        console.log(`⚠️  ${endpoint}: NETWORK ERROR (${error.code})\n`);
      }
    }
  }

  console.log('Test completed.');
}

// Export for potential use
module.exports = { testStatisticsEndpoints };

// Run if called directly
if (require.main === module) {
  testStatisticsEndpoints().catch(console.error);
}
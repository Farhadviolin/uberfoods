// k6 Load Test Configuration
// Shared configuration for all test scenarios

export const CONFIG = {
  // API Configuration
  API_BASE_URL: __ENV.API_BASE_URL || 'http://localhost:3000/api',
  WS_BASE_URL: __ENV.WS_BASE_URL || 'http://localhost:3000',

  // Test Data Configuration
  TEST_DATA_SIZE: __ENV.TEST_DATA_SIZE || 'medium', // small, medium, large

  // Performance Thresholds (ms)
  THRESHOLDS: {
    // API Response Times
    ORDERS_PAGINATION_P95: 500,
    ORDERS_PAGINATION_P99: 1000,
    DASHBOARD_AGGREGATION_P95: 800,
    DASHBOARD_AGGREGATION_P99: 1500,
    ORDER_STATUS_UPDATE_P95: 400,
    ORDER_STATUS_UPDATE_P99: 800,

    // Error Rates (%)
    MAX_ERROR_RATE: 1.0,

    // Throughput (requests/second)
    MIN_THROUGHPUT_ORDERS: 100,
    MIN_THROUGHPUT_DASHBOARD: 50,
    MIN_THROUGHPUT_UPDATES: 200,
  },

  // Load Test Configuration
  LOAD_PATTERNS: {
    // Orders pagination load distribution
    ORDERS_RECENT_PERCENTAGE: 0.8,      // 80% read recent orders
    ORDERS_FILTERED_PERCENTAGE: 0.15,   // 15% search with filters
    ORDERS_DEEP_PAGINATION_PERCENTAGE: 0.05, // 5% deep pagination

    // Dashboard concurrent requests
    DASHBOARD_CONCURRENT_REQUESTS: 3,   // Simultaneous dashboard calls

    // WebSocket connections
    WS_RAMP_UP_TIME: 30,                 // seconds to ramp up connections
    WS_MAX_CONNECTIONS: 1000,           // maximum concurrent WS connections

    // Driver location updates
    DRIVER_UPDATE_INTERVAL_MIN: 500,    // minimum ms between updates
    DRIVER_UPDATE_INTERVAL_MAX: 2000,   // maximum ms between updates
  },

  // Test Data IDs (populated by data seeding)
  TEST_DATA: {
    restaurantIds: [],
    customerIds: [],
    driverIds: [],
    orderIds: [],
    totalOrders: 0,
  },

  // Authentication
  AUTH: {
    adminToken: __ENV.ADMIN_TOKEN,
    customerTokens: [],
    driverTokens: [],
  },

  // Test Options
  OPTIONS: {
    // Default k6 options that can be overridden
    vus: parseInt(__ENV.K6_VUS) || 10,
    duration: __ENV.K6_DURATION || '60s',

    // Thresholds for k6
    thresholds: {
      'http_req_duration{status:200}': ['p(95)<500'],
      'http_req_duration{status:400}': ['p(95)<300'],
      'http_req_failed': ['rate<0.01'], // Error rate < 1%
    },
  },

  // Environment Detection
  ENVIRONMENT: {
    isProduction: __ENV.NODE_ENV === 'production',
    isStaging: __ENV.NODE_ENV === 'staging',
    isDevelopment: __ENV.NODE_ENV === 'development',
    isCI: __ENV.CI === 'true',
  },
};

// Validate configuration
export function validateConfig() {
  if (!CONFIG.AUTH.adminToken) {
    throw new Error('ADMIN_TOKEN environment variable is required');
  }

  if (!CONFIG.API_BASE_URL.startsWith('http')) {
    throw new Error('API_BASE_URL must be a valid HTTP URL');
  }

  console.log(`🔧 Test Configuration:`);
  console.log(`   API URL: ${CONFIG.API_BASE_URL}`);
  console.log(`   Environment: ${__ENV.NODE_ENV || 'development'}`);
  console.log(`   Test Data Size: ${CONFIG.TEST_DATA_SIZE}`);
  console.log(`   VUs: ${CONFIG.OPTIONS.vus}`);
  console.log(`   Duration: ${CONFIG.OPTIONS.duration}`);
}

// Helper function to get random item from array
export function randomFromArray(array) {
  if (!array || array.length === 0) {
    throw new Error('Array is empty or undefined');
  }
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get random integer in range
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep helper for pacing
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
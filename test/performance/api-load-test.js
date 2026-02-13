/**
 * k6 Load Test für UberFoods API
 * 
 * Installation: brew install k6 (macOS) oder https://k6.io/docs/get-started/installation/
 * 
 * Run: k6 run test/performance/api-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom Metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Test Configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'http_req_failed': ['rate<0.01'],   // Error rate should be below 1%
    'errors': ['rate<0.1'],             // Custom error rate below 10%
  },
};

const BASE_URL = 'http://localhost:3000/api';

// Test Scenarios
export default function () {
  // Scenario 1: Health Check (10%)
  if (Math.random() < 0.1) {
    testHealthCheck();
  }
  
  // Scenario 2: Browse Restaurants (40%)
  else if (Math.random() < 0.5) {
    testBrowseRestaurants();
  }
  
  // Scenario 3: Get Restaurant Menu (30%)
  else if (Math.random() < 0.8) {
    testGetMenu();
  }
  
  // Scenario 4: Create Order (20%)
  else {
    testCreateOrder();
  }

  sleep(1);
}

function testHealthCheck() {
  const response = http.get(`${BASE_URL}/health`);
  
  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check has ok status': (r) => r.json('status') === 'ok',
  });

  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
}

function testBrowseRestaurants() {
  const response = http.get(`${BASE_URL}/restaurants?page=1&limit=20`);
  
  const success = check(response, {
    'restaurants status is 200': (r) => r.status === 200,
    'restaurants response time < 500ms': (r) => r.timings.duration < 500,
    'restaurants has data array': (r) => Array.isArray(r.json('data')),
  });

  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
}

function testGetMenu() {
  const restaurantId = 'rest_test_' + Math.floor(Math.random() * 100);
  const response = http.get(`${BASE_URL}/dishes?restaurantId=${restaurantId}`);
  
  const success = check(response, {
    'menu status is 200 or 404': (r) => [200, 404].includes(r.status),
    'menu response time < 300ms': (r) => r.timings.duration < 300,
  });

  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
}

function testCreateOrder() {
  const token = 'test-token'; // In real test, login first
  
  const payload = {
    restaurantId: 'rest_test',
    items: [
      { dishId: 'dish_test_1', quantity: 2 },
      { dishId: 'dish_test_2', quantity: 1 },
    ],
    deliveryAddress: {
      street: 'Teststrasse 1',
      city: 'Wien',
      zipCode: '1010',
    },
  };

  const response = http.post(
    `${BASE_URL}/orders`,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const success = check(response, {
    'create order status is 201 or 401': (r) => [201, 401].includes(r.status),
    'create order response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
}

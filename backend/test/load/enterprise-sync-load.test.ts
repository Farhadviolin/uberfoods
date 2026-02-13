import { performance } from 'perf_hooks';
import axios from 'axios';
import { getTestToken } from '../utils/test-credentials';

/**
 * Load Testing für Enterprise Sync Services
 * 
 * Diese Tests simulieren hohe Last auf die Sync-Endpoints
 * und messen Performance-Metriken.
 */

const BASE_URL = process.env.API_URL || 'https://localhost:3000/api';
const ADMIN_TOKEN =
  process.env.ADMIN_TOKEN || getTestToken("TEST_ADMIN_TOKEN", "admin-load");
const CONCURRENT_REQUESTS = 50;
const REQUESTS_PER_ENDPOINT = 100;

interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ status: number; message: string }>;
}

class LoadTester {
  private results: LoadTestResult[] = [];

  async testEndpoint(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    headers?: Record<string, string>
  ): Promise<LoadTestResult> {
    const responseTimes: number[] = [];
    const errors: Array<{ status: number; message: string }> = [];
    let successfulRequests = 0;
    let failedRequests = 0;

    const startTime = performance.now();

    // Concurrent requests
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, async () => {
      for (let i = 0; i < REQUESTS_PER_ENDPOINT / CONCURRENT_REQUESTS; i++) {
        const requestStart = performance.now();
        try {
          const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
              'Authorization': `Bearer ${ADMIN_TOKEN}`,
              'Content-Type': 'application/json',
              ...headers,
            },
            data,
            timeout: 10000,
          };

          const response = await axios(config);
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;

          responseTimes.push(responseTime);
          successfulRequests++;

          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error: any) {
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;

          responseTimes.push(responseTime);
          failedRequests++;

          errors.push({
            status: error.response?.status || 0,
            message: error.message || 'Unknown error',
          });
        }
      }
    });

    await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000; // Convert to seconds
    const totalRequests = successfulRequests + failedRequests;
    const requestsPerSecond = totalRequests / totalTime;

    // Calculate percentiles
    responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    const result: LoadTestResult = {
      endpoint,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      requestsPerSecond,
      errors: errors.slice(0, 10), // Keep only first 10 errors
    };

    this.results.push(result);
    return result;
  }

  printResults() {
    console.log('\n=== Load Test Results ===\n');
    
    this.results.forEach(result => {
      console.log(`Endpoint: ${result.endpoint}`);
      console.log(`  Total Requests: ${result.totalRequests}`);
      console.log(`  Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)`);
      console.log(`  Failed: ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(2)}%)`);
      console.log(`  Average Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`  Min Response Time: ${result.minResponseTime.toFixed(2)}ms`);
      console.log(`  Max Response Time: ${result.maxResponseTime.toFixed(2)}ms`);
      console.log(`  P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  P99 Response Time: ${result.p99ResponseTime.toFixed(2)}ms`);
      console.log(`  Requests/Second: ${result.requestsPerSecond.toFixed(2)}`);
      
      if (result.errors.length > 0) {
        console.log(`  Errors:`);
        result.errors.forEach(error => {
          console.log(`    - ${error.status}: ${error.message}`);
        });
      }
      console.log('');
    });

    // Summary
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = this.results.reduce((sum, r) => sum + r.successfulRequests, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedRequests, 0);
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.averageResponseTime, 0) / this.results.length;
    const avgRPS = this.results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / this.results.length;

    console.log('=== Summary ===');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Total Successful: ${totalSuccessful} (${((totalSuccessful / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Total Failed: ${totalFailed} (${((totalFailed / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Average Requests/Second: ${avgRPS.toFixed(2)}`);
    console.log('');
  }

  getResults(): LoadTestResult[] {
    return this.results;
  }
}

// Test Suites
describe('Enterprise Sync Load Tests', () => {
  const tester = new LoadTester();

  beforeAll(() => {
    console.log('Starting Enterprise Sync Load Tests...');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
    console.log(`Requests per Endpoint: ${REQUESTS_PER_ENDPOINT}`);
    console.log('');
  });

  afterAll(() => {
    tester.printResults();
  });

  describe('Unified Notifications Load Test', () => {
    it('should handle high load on notification endpoint', async () => {
      const result = await tester.testEndpoint(
        '/notifications/unified',
        'POST',
        {
          id: 'test-notification',
          type: 'order',
          priority: 'high',
          title: 'Test Notification',
          message: 'Test message',
          recipients: [{ app: 'admin', broadcast: true }],
          channels: ['websocket'],
        }
      );

      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.95); // 95% success rate
      expect(result.averageResponseTime).toBeLessThan(500); // Less than 500ms average
      expect(result.p95ResponseTime).toBeLessThan(1000); // P95 less than 1s
    });
  });

  describe('Financial Sync Load Test', () => {
    it('should handle high load on financial sync endpoint', async () => {
      const result = await tester.testEndpoint(
        '/financial/sync/summary/admin/admin-1?period=30d',
        'GET'
      );

      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.95);
      expect(result.averageResponseTime).toBeLessThan(300);
    });
  });

  describe('Analytics Sync Load Test', () => {
    it('should handle high load on analytics sync endpoint', async () => {
      const result = await tester.testEndpoint(
        '/analytics/sync/summary/admin/admin-1?period=30d',
        'GET'
      );

      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.95);
      expect(result.averageResponseTime).toBeLessThan(500);
    });
  });

  describe('Security Sync Load Test', () => {
    it('should handle high load on security sync endpoint', async () => {
      const result = await tester.testEndpoint(
        '/security/sync/events?period=7d',
        'GET'
      );

      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.95);
      expect(result.averageResponseTime).toBeLessThan(300);
    });
  });

  describe('Performance Monitoring Load Test', () => {
    it('should handle high load on performance monitoring endpoint', async () => {
      const result = await tester.testEndpoint(
        '/monitoring/sync/summary?period=1h',
        'GET'
      );

      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.95);
      expect(result.averageResponseTime).toBeLessThan(200);
    });
  });

  describe('AI/ML Sync Load Test', () => {
    it('should handle high load on AI/ML sync endpoint', async () => {
      const result = await tester.testEndpoint(
        '/ai-ml/sync/predictions/admin/admin-1',
        'GET'
      );

      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.90); // 90% for ML (can be slower)
      expect(result.averageResponseTime).toBeLessThan(1000); // ML can take longer
    });
  });

  describe('Mixed Load Test', () => {
    it('should handle mixed load across all endpoints', async () => {
      const endpoints = [
        { path: '/notifications/unified', method: 'POST' as const, data: { id: 'test', type: 'order', priority: 'high', title: 'Test', message: 'Test', recipients: [{ app: 'admin', broadcast: true }], channels: ['websocket'] } },
        { path: '/financial/sync/summary/admin/admin-1?period=30d', method: 'GET' as const },
        { path: '/analytics/sync/summary/admin/admin-1?period=30d', method: 'GET' as const },
        { path: '/security/sync/events?period=7d', method: 'GET' as const },
        { path: '/monitoring/sync/summary?period=1h', method: 'GET' as const },
      ];

      const promises = endpoints.map(endpoint =>
        tester.testEndpoint(endpoint.path, endpoint.method, endpoint.data)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.90);
      });
    });
  });
});

// Export for standalone execution
export { LoadTester };


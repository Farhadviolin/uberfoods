#!/usr/bin/env node

/**
 * Simple Performance Testing Script for UberFoods
 * Tests basic API endpoints for response times and throughput
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'https://localhost:3000';
// Enforce HTTPS unless explicitly allowed (for local dev)
if (BASE_URL.startsWith('http://') && !process.env.ALLOW_HTTP) {
  throw new Error('Refusing to send traffic over insecure HTTP. Set ALLOW_HTTP=true to allow for local testing.');
}
const CONCURRENT_REQUESTS = process.env.CONCURRENT_REQUESTS || 10;
const TOTAL_REQUESTS = process.env.TOTAL_REQUESTS || 100;
const TEST_DURATION = process.env.TEST_DURATION || 30; // seconds

const endpoints = [
  { path: '/api/health', method: 'GET', description: 'Health Check' },
  { path: '/api/restaurants/public', method: 'GET', description: 'Public Restaurants' },
  {
    path: '/api/auth/login',
    method: 'POST',
    description: 'Login',
    data: {
      email: process.env.TEST_PERF_EMAIL || 'test@example.com',
      password: process.env.TEST_PERF_PASSWORD || `perf-pw-${Date.now()}`,
    },
  },
];

class PerformanceTester {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      endpointStats: {}
    };
  }

  async makeRequest(endpoint, requestId) {
    const startTime = Date.now();
    const url = `${BASE_URL}${endpoint.path}`;

    return new Promise((resolve) => {
      // Note: HTTP protocol is only used for local testing environments
      // In production, always use HTTPS via BASE_URL environment variable
      const protocol = BASE_URL.startsWith('https') ? https : http;
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UberFoods-Performance-Test/1.0'
        }
      };

      const req = protocol.request(url, options, (res) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        this.results.totalRequests++;
        this.results.responseTimes.push(responseTime);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.results.successfulRequests++;
        } else {
          this.results.failedRequests++;
          this.results.errors.push({
            endpoint: endpoint.path,
            statusCode: res.statusCode,
            responseTime
          });
        }

        // Track per-endpoint stats
        if (!this.results.endpointStats[endpoint.path]) {
          this.results.endpointStats[endpoint.path] = {
            requests: 0,
            avgResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0
          };
        }

        const stats = this.results.endpointStats[endpoint.path];
        stats.requests++;
        stats.minResponseTime = Math.min(stats.minResponseTime, responseTime);
        stats.maxResponseTime = Math.max(stats.maxResponseTime, responseTime);
        stats.avgResponseTime = (stats.avgResponseTime * (stats.requests - 1) + responseTime) / stats.requests;

        resolve({ responseTime, statusCode: res.statusCode });
      });

      req.on('error', (error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        this.results.totalRequests++;
        this.results.failedRequests++;
        this.results.responseTimes.push(responseTime);
        this.results.errors.push({
          endpoint: endpoint.path,
          error: error.message,
          responseTime
        });

        resolve({ responseTime, error: error.message });
      });

      // Send request body if POST
      if (endpoint.method === 'POST' && endpoint.data) {
        req.write(JSON.stringify(endpoint.data));
      }

      req.setTimeout(10000, () => {
        req.abort();
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        this.results.totalRequests++;
        this.results.failedRequests++;
        this.results.responseTimes.push(responseTime);
        this.results.errors.push({
          endpoint: endpoint.path,
          error: 'Timeout',
          responseTime
        });

        resolve({ responseTime, error: 'Timeout' });
      });

      req.end();
    });
  }

  async runLoadTest() {
    console.log('🚀 Starting Performance Test...');
    console.log(`📍 Target: ${BASE_URL}`);
    console.log(`⚡ Concurrent Requests: ${CONCURRENT_REQUESTS}`);
    console.log(`📊 Total Requests: ${TOTAL_REQUESTS}`);
    console.log('─'.repeat(60));

    const startTime = Date.now();
    const promises = [];

    // Create concurrent requests
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      const endpoint = endpoints[i % endpoints.length];
      promises.push(this.makeRequest(endpoint, i));

      // Control concurrency
      if (promises.length >= CONCURRENT_REQUESTS) {
        await Promise.all(promises.splice(0, CONCURRENT_REQUESTS));
      }
    }

    // Wait for remaining requests
    await Promise.all(promises);

    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;

    return this.generateReport(totalDuration);
  }

  generateReport(totalDuration) {
    const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
    const minResponseTime = Math.min(...this.results.responseTimes);
    const maxResponseTime = Math.max(...this.results.responseTimes);
    const requestsPerSecond = this.results.totalRequests / totalDuration;
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;

    console.log('\n📊 PERFORMANCE TEST RESULTS');
    console.log('═'.repeat(60));
    console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}s`);
    console.log(`📈 Total Requests: ${this.results.totalRequests}`);
    console.log(`✅ Successful: ${this.results.successfulRequests}`);
    console.log(`❌ Failed: ${this.results.failedRequests}`);
    console.log(`📊 Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`⚡ Requests/Second: ${requestsPerSecond.toFixed(2)}`);
    console.log(`🐌 Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`🏃 Min Response Time: ${minResponseTime}ms`);
    console.log(`🐌 Max Response Time: ${maxResponseTime}ms`);

    console.log('\n📋 PER-ENDPOINT STATISTICS');
    console.log('─'.repeat(60));
    Object.entries(this.results.endpointStats).forEach(([endpoint, stats]) => {
      console.log(`🔗 ${endpoint}`);
      console.log(`   Requests: ${stats.requests}`);
      console.log(`   Avg: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`   Min: ${stats.minResponseTime}ms`);
      console.log(`   Max: ${stats.maxResponseTime}ms`);
    });

    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS');
      console.log('─'.repeat(60));
      this.results.errors.slice(0, 10).forEach((error, i) => {
        console.log(`${i + 1}. ${error.endpoint}: ${error.error || `Status ${error.statusCode}`} (${error.responseTime}ms)`);
      });
      if (this.results.errors.length > 10) {
        console.log(`... and ${this.results.errors.length - 10} more errors`);
      }
    }

    console.log('\n🎯 PERFORMANCE ASSESSMENT');
    console.log('─'.repeat(60));

    if (avgResponseTime < 500 && successRate > 95) {
      console.log('✅ EXCELLENT: System performs well under load');
    } else if (avgResponseTime < 1000 && successRate > 90) {
      console.log('⚠️  GOOD: System performs adequately but could be optimized');
    } else if (avgResponseTime < 2000 && successRate > 80) {
      console.log('🟡  FAIR: System needs performance improvements');
    } else {
      console.log('❌ POOR: System has significant performance issues');
    }

    return {
      duration: totalDuration,
      totalRequests: this.results.totalRequests,
      successRate,
      avgResponseTime,
      requestsPerSecond,
      assessment: avgResponseTime < 500 && successRate > 95 ? 'EXCELLENT' :
                  avgResponseTime < 1000 && successRate > 90 ? 'GOOD' :
                  avgResponseTime < 2000 && successRate > 80 ? 'FAIR' : 'POOR'
    };
  }
}

// Run the test
async function main() {
  try {
    const tester = new PerformanceTester();
    const results = await tester.runLoadTest();

    // Exit with appropriate code
    if (results.assessment === 'EXCELLENT' || results.assessment === 'GOOD') {
      console.log('\n✅ Performance test passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Performance test failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Performance test failed with error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceTester;

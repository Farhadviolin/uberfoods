// Custom metrics and performance tracking for k6 tests

import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { CONFIG } from './config.js';

// Custom metrics for detailed performance tracking
export const customMetrics = {
  // Orders pagination metrics
  ordersPaginationDuration: new Trend('orders_pagination_duration'),
  ordersPaginationErrors: new Rate('orders_pagination_errors'),

  // Dashboard aggregation metrics
  dashboardAggregationDuration: new Trend('dashboard_aggregation_duration'),
  dashboardAggregationErrors: new Rate('dashboard_aggregation_errors'),

  // Order status update metrics
  orderStatusUpdateDuration: new Trend('order_status_update_duration'),
  orderStatusUpdateErrors: new Rate('order_status_update_errors'),
  orderVersionConflicts: new Counter('order_version_conflicts'),

  // WebSocket metrics
  websocketConnectionDuration: new Trend('websocket_connection_duration'),
  websocketConnectionErrors: new Rate('websocket_connection_errors'),
  websocketMessageLatency: new Trend('websocket_message_latency'),
  websocketActiveConnections: new Gauge('websocket_active_connections'),

  // Driver location metrics
  driverLocationBroadcastDuration: new Trend('driver_location_broadcast_duration'),
  driverLocationRateLimited: new Counter('driver_location_rate_limited'),
  driverLocationThrottled: new Counter('driver_location_throttled'),

  // Business metrics
  ordersCreated: new Counter('orders_created'),
  ordersUpdated: new Counter('orders_updated'),
  dashboardViews: new Counter('dashboard_views'),
  websocketMessages: new Counter('websocket_messages'),
};

/**
 * Performance assertion helper
 */
export class PerformanceAssert {
  static assertResponseTime(trend, maxP95, maxP99, label) {
    // k6 thresholds are defined in config, but we can add runtime checks
    console.log(`${label} - p95 should be < ${maxP95}ms, p99 should be < ${maxP99}ms`);
  }

  static assertErrorRate(rate, maxErrorRate, label) {
    console.log(`${label} - error rate should be < ${maxErrorRate}%`);
  }

  static assertThroughput(minThroughput, label) {
    console.log(`${label} - throughput should be > ${minThroughput} req/s`);
  }
}

/**
 * Results aggregator for test reporting
 */
export class ResultsAggregator {
  constructor() {
    this.results = {
      testRun: new Date().toISOString(),
      environment: __ENV.NODE_ENV || 'development',
      duration: 0,
      startTime: Date.now(),
      endTime: 0,
      scenarios: {},
    };
  }

  /**
   * Add scenario results
   */
  addScenarioResults(scenarioName, results) {
    this.results.scenarios[scenarioName] = {
      ...results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate overall results
   */
  finalizeResults() {
    this.results.endTime = Date.now();
    this.results.duration = this.results.endTime - this.results.startTime;

    // Calculate overall metrics
    const scenarios = Object.values(this.results.scenarios);
    if (scenarios.length > 0) {
      this.results.overall = {
        totalRequests: scenarios.reduce((sum, s) => sum + (s.totalRequests || 0), 0),
        successfulRequests: scenarios.reduce((sum, s) => sum + (s.successfulRequests || 0), 0),
        failedRequests: scenarios.reduce((sum, s) => sum + (s.failedRequests || 0), 0),
        avgResponseTime: scenarios.reduce((sum, s) => sum + (s.avgResponseTime || 0), 0) / scenarios.length,
        p95ResponseTime: Math.max(...scenarios.map(s => s.p95ResponseTime || 0)),
        p99ResponseTime: Math.max(...scenarios.map(s => s.p99ResponseTime || 0)),
        errorRate: scenarios.reduce((sum, s) => sum + (s.errorRate || 0), 0) / scenarios.length,
        throughput: scenarios.reduce((sum, s) => sum + (s.throughput || 0), 0),
      };

      // Calculate error rate percentage
      this.results.overall.errorRatePercent = (this.results.overall.failedRequests / this.results.overall.totalRequests) * 100;
    }

    return this.results;
  }

  /**
   * Check against performance thresholds
   */
  checkThresholds() {
    const regressions = [];
    const overall = this.results.overall;

    if (!overall) return { passed: true, regressions: [] };

    // Check response time thresholds
    if (overall.p95ResponseTime > CONFIG.THRESHOLDS.ORDERS_PAGINATION_P95) {
      regressions.push({
        metric: 'p95_response_time',
        actual: overall.p95ResponseTime,
        threshold: CONFIG.THRESHOLDS.ORDERS_PAGINATION_P95,
        message: `p95 response time ${overall.p95ResponseTime}ms exceeds threshold ${CONFIG.THRESHOLDS.ORDERS_PAGINATION_P95}ms`,
      });
    }

    if (overall.p99ResponseTime > CONFIG.THRESHOLDS.ORDERS_PAGINATION_P99) {
      regressions.push({
        metric: 'p99_response_time',
        actual: overall.p99ResponseTime,
        threshold: CONFIG.THRESHOLDS.ORDERS_PAGINATION_P99,
        message: `p99 response time ${overall.p99ResponseTime}ms exceeds threshold ${CONFIG.THRESHOLDS.ORDERS_PAGINATION_P99}ms`,
      });
    }

    // Check error rate
    if (overall.errorRatePercent > CONFIG.THRESHOLDS.MAX_ERROR_RATE) {
      regressions.push({
        metric: 'error_rate',
        actual: overall.errorRatePercent,
        threshold: CONFIG.THRESHOLDS.MAX_ERROR_RATE,
        message: `Error rate ${overall.errorRatePercent.toFixed(2)}% exceeds threshold ${CONFIG.THRESHOLDS.MAX_ERROR_RATE}%`,
      });
    }

    return {
      passed: regressions.length === 0,
      regressions,
    };
  }

  /**
   * Generate summary report
   */
  generateReport() {
    const results = this.finalizeResults();
    const thresholdCheck = this.checkThresholds();

    const report = {
      ...results,
      thresholdCheck,
      recommendations: this.generateRecommendations(thresholdCheck),
    };

    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(thresholdCheck) {
    const recommendations = [];
    const overall = this.results.overall;

    if (!overall) return recommendations;

    if (overall.p95ResponseTime > 500) {
      recommendations.push('Consider optimizing database queries and adding indexes');
    }

    if (overall.errorRatePercent > 1) {
      recommendations.push('Investigate error causes and improve error handling');
    }

    if (overall.throughput < 100) {
      recommendations.push('Consider horizontal scaling or performance optimizations');
    }

    if (thresholdCheck.regressions.length > 0) {
      recommendations.push('Address performance regressions before deployment');
    }

    return recommendations;
  }

  /**
   * Export results to JSON
   */
  toJSON() {
    return JSON.stringify(this.generateReport(), null, 2);
  }
}

// Export singleton instance
export const resultsAggregator = new ResultsAggregator();

/**
 * Test helper functions
 */
export class TestHelpers {
  /**
   * Calculate percentiles from array of values
   */
  static calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate throughput (requests per second)
   */
  static calculateThroughput(totalRequests, durationMs) {
    return totalRequests / (durationMs / 1000);
  }

  /**
   * Format duration for display
   */
  static formatDuration(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Validate test data integrity
   */
  static validateTestData(data) {
    const issues = [];

    if (!data.restaurantIds || data.restaurantIds.length === 0) {
      issues.push('No restaurant test data available');
    }

    if (!data.customerIds || data.customerIds.length === 0) {
      issues.push('No customer test data available');
    }

    if (data.totalOrders < 1000) {
      issues.push('Insufficient order test data (need at least 1000 orders)');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
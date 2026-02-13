import { Injectable, Logger } from "@nestjs/common";
import {
  register,
  collectDefaultMetrics,
  Gauge,
  Counter,
  Histogram,
  Summary,
} from "prom-client";

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // HTTP Metrics
  public httpRequestDuration: Histogram<string>;
  public httpRequestsTotal: Counter<string>;
  public httpRequestsInFlight: Gauge<string>;

  // Database Metrics
  public dbConnectionsTotal: Gauge<string>;
  public dbQueryDuration: Histogram<string>;

  // WebSocket Metrics
  public wsConnectionsActive: Gauge<string>;
  public wsMessagesTotal: Counter<string>;

  // Business Metrics
  public ordersCreatedTotal: Counter<string>;
  public ordersStatusChangesTotal: Counter<string>;

  // Outbox Metrics
  public outboxMessagesTotal: Counter<string>;
  public outboxMessagesProcessedTotal: Counter<string>;
  public outboxQueueDepth: Gauge<string>;

  // Rate Limiting Metrics
  public rateLimitExceededTotal: Counter<string>;
  public rateLimitRequestsTotal: Counter<string>;

  // Circuit Breaker Metrics
  public circuitBreakerState: Gauge<string>;

  constructor() {
    // Enable default Node.js metrics
    collectDefaultMetrics({ prefix: "uberfoods_" });

    this.initializeMetrics();
    this.logger.log("Prometheus metrics initialized");
  }

  private initializeMetrics(): void {
    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: "uberfoods_http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    this.httpRequestsTotal = new Counter({
      name: "uberfoods_http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
    });

    this.httpRequestsInFlight = new Gauge({
      name: "uberfoods_http_requests_in_flight",
      help: "Number of HTTP requests currently being processed",
    });

    // Database Metrics
    this.dbConnectionsTotal = new Gauge({
      name: "uberfoods_db_connections_total",
      help: "Total number of database connections",
    });

    this.dbQueryDuration = new Histogram({
      name: "uberfoods_db_query_duration_seconds",
      help: "Duration of database queries in seconds",
      labelNames: ["operation", "table"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    // WebSocket Metrics
    this.wsConnectionsActive = new Gauge({
      name: "uberfoods_ws_connections_active",
      help: "Number of active WebSocket connections",
    });

    this.wsMessagesTotal = new Counter({
      name: "uberfoods_ws_messages_total",
      help: "Total number of WebSocket messages",
      labelNames: ["type", "direction"], // 'type' could be 'location_update', 'direction' could be 'in'/'out'
    });

    // Business Metrics
    this.ordersCreatedTotal = new Counter({
      name: "uberfoods_orders_created_total",
      help: "Total number of orders created",
      labelNames: ["status"],
    });

    this.ordersStatusChangesTotal = new Counter({
      name: "uberfoods_orders_status_changes_total",
      help: "Total number of order status changes",
      labelNames: ["from_status", "to_status"],
    });

    // Outbox Metrics
    this.outboxMessagesTotal = new Counter({
      name: "uberfoods_outbox_messages_total",
      help: "Total number of messages added to outbox",
      labelNames: ["type"],
    });

    this.outboxMessagesProcessedTotal = new Counter({
      name: "uberfoods_outbox_messages_processed_total",
      help: "Total number of outbox messages processed",
      labelNames: ["type", "result"], // 'result' could be 'success'/'error'
    });

    this.outboxQueueDepth = new Gauge({
      name: "uberfoods_outbox_queue_depth",
      help: "Current depth of outbox queue",
    });

    // Rate Limiting Metrics
    this.rateLimitExceededTotal = new Counter({
      name: "uberfoods_rate_limit_exceeded_total",
      help: "Total number of rate limit violations",
      labelNames: ["type", "identifier"], // 'type' could be 'http_ip', 'http_user', 'ws_driver'
    });

    this.rateLimitRequestsTotal = new Counter({
      name: "uberfoods_rate_limit_requests_total",
      help: "Total number of rate limit checks",
      labelNames: ["type", "allowed"], // 'allowed' could be 'true'/'false'
    });

    // Circuit Breaker Metrics
    this.circuitBreakerState = new Gauge({
      name: "uberfoods_circuit_breaker_state",
      help: "Current state of circuit breaker (0=closed, 1=open, 2=half-open)",
    });
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    try {
      // Update gauge metrics that need current values
      await this.updateGaugeMetrics();

      return register.metrics();
    } catch (error) {
      this.logger.error("Error generating metrics:", error);
      throw error;
    }
  }

  /**
   * Update gauge metrics with current values
   */
  private async updateGaugeMetrics(): Promise<void> {
    try {
      // These would be populated from actual system state
      // For now, using placeholder values
      // Example: Get actual DB connection count
      // this.dbConnectionsTotal.set(await this.getActualDbConnectionCount());
      // Example: Get actual WS connection count
      // this.wsConnectionsActive.set(await this.getActualWsConnectionCount());
      // Example: Get actual outbox queue depth
      // this.outboxQueueDepth.set(await this.getActualOutboxQueueDepth());
    } catch (error) {
      this.logger.error("Error updating gauge metrics:", error);
    }
  }

  /**
   * Get metrics as JSON (for controllers)
   */
  async getMetricsAsJSON(): Promise<any> {
    try {
      const metricsString = await this.getMetrics();
      // Simple parsing - in production you might want proper parsing
      return {
        metrics: metricsString,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Error getting metrics as JSON:", error);
      return { error: "Failed to get metrics" };
    }
  }

  /**
   * Get health status based on metrics
   */
  async getHealthStatus(): Promise<any> {
    try {
      // Simple health check based on basic metrics
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    } catch (error) {
      this.logger.error("Error getting health status:", error);
      return { status: "unhealthy", error: error.message };
    }
  }

  /**
   * Check thresholds (placeholder implementation)
   */
  async checkThresholds(): Promise<any[]> {
    try {
      // Placeholder - in production this would check actual thresholds
      return [];
    } catch (error) {
      this.logger.error("Error checking thresholds:", error);
      return [];
    }
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    try {
      switch (name) {
        case "websocket.connections.total":
          this.wsConnectionsActive.inc(labels || {});
          break;
        case "websocket.disconnections.total":
          // Could add a disconnections counter if needed
          break;
        case "websocket.rooms.joined":
        case "websocket.rooms.left":
          this.wsMessagesTotal.inc({
            type: "room",
            direction: "unknown",
            ...labels,
          });
          break;
        case "websocket.messages.sent":
        case "websocket.messages.received":
          this.wsMessagesTotal.inc({
            type: "message",
            direction: name.includes("sent") ? "out" : "in",
            ...labels,
          });
          break;
        case "websocket.driver.location.rate_limited":
          this.rateLimitExceededTotal.inc({
            type: "ws_driver",
            identifier: "location",
            ...labels,
          });
          break;
        case "websocket.driver.location.sent":
          this.wsMessagesTotal.inc({
            type: "location",
            direction: "out",
            ...labels,
          });
          break;
        default:
          this.logger.warn(`Unknown counter metric: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Error incrementing counter ${name}:`, error);
    }
  }

  /**
   * Record a gauge value
   */
  recordGauge(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    try {
      switch (name) {
        case "websocket.drivers.active":
          this.wsConnectionsActive.set(labels || {}, value);
          break;
        default:
          this.logger.warn(`Unknown gauge metric: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Error recording gauge ${name}:`, error);
    }
  }

  /**
   * Record a histogram value
   */
  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    try {
      switch (name) {
        case "http_request_duration":
          this.httpRequestDuration.observe(labels || {}, value);
          break;
        case "db_query_duration":
          this.dbQueryDuration.observe(labels || {}, value);
          break;
        default:
          this.logger.warn(`Unknown histogram metric: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Error recording histogram ${name}:`, error);
    }
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    register.clear();
    this.initializeMetrics();
    this.logger.log("All metrics reset");
  }
}

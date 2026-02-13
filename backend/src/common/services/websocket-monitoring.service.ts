import { Injectable, Logger } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  connectionsByUserType: Record<string, number>;
  roomsCount: number;
  messagesSent: number;
  messagesReceived: number;
}

interface DriverMetrics {
  activeDrivers: number;
  locationUpdatesSent: number;
  locationUpdatesRateLimited: number;
  avgUpdatesPerDriver: number;
  topDriversByUpdates: Array<{ driverId: string; updateCount: number }>;
}

interface PerformanceMetrics {
  avgMessageProcessingTime: number;
  messageQueueSize: number;
  redisLatency: number;
  memoryUsage: number;
  uptime: number;
}

@Injectable()
export class WebSocketMonitoringService {
  private readonly logger = new Logger(WebSocketMonitoringService.name);

  // Metrics storage (in production, use Redis or a time-series database)
  private connectionMetrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    connectionsByUserType: {},
    roomsCount: 0,
    messagesSent: 0,
    messagesReceived: 0,
  };

  private driverMetrics: DriverMetrics = {
    activeDrivers: 0,
    locationUpdatesSent: 0,
    locationUpdatesRateLimited: 0,
    avgUpdatesPerDriver: 0,
    topDriversByUpdates: [],
  };

  private performanceMetrics: PerformanceMetrics = {
    avgMessageProcessingTime: 0,
    messageQueueSize: 0,
    redisLatency: 0,
    memoryUsage: 0,
    uptime: Date.now(),
  };

  // Rolling window for performance tracking (last 1000 operations)
  private processingTimes: number[] = [];
  private readonly MAX_PROCESSING_SAMPLES = 1000;

  constructor(private readonly metricsService: MetricsService) {
    // Periodic cleanup and metrics reporting
    setInterval(() => {
      this.reportMetrics();
    }, 60000); // Report every minute

    // Update uptime
    setInterval(() => {
      this.performanceMetrics.uptime = Date.now();
    }, 1000);
  }

  // Connection tracking
  recordConnection(userType?: string): void {
    this.connectionMetrics.totalConnections++;
    this.connectionMetrics.activeConnections++;

    if (userType) {
      this.connectionMetrics.connectionsByUserType[userType] =
        (this.connectionMetrics.connectionsByUserType[userType] || 0) + 1;
    }

    this.metricsService.incrementCounter("websocket.connections.total");
    this.metricsService.incrementCounter(
      `websocket.connections.${userType || "unknown"}`,
    );
  }

  recordDisconnection(userType?: string): void {
    this.connectionMetrics.activeConnections = Math.max(
      0,
      this.connectionMetrics.activeConnections - 1,
    );

    if (
      userType &&
      this.connectionMetrics.connectionsByUserType[userType] > 0
    ) {
      this.connectionMetrics.connectionsByUserType[userType]--;
    }

    this.metricsService.incrementCounter("websocket.disconnections.total");
  }

  recordRoomJoin(room: string): void {
    this.connectionMetrics.roomsCount++;
    this.metricsService.incrementCounter("websocket.rooms.joined");
  }

  recordRoomLeave(room: string): void {
    this.connectionMetrics.roomsCount = Math.max(
      0,
      this.connectionMetrics.roomsCount - 1,
    );
    this.metricsService.incrementCounter("websocket.rooms.left");
  }

  // Message tracking
  recordMessageSent(event: string, room?: string): void {
    this.connectionMetrics.messagesSent++;
    this.metricsService.incrementCounter("websocket.messages.sent");
    this.metricsService.incrementCounter(`websocket.messages.sent.${event}`);
  }

  recordMessageReceived(event: string, userType?: string): void {
    this.connectionMetrics.messagesReceived++;
    this.metricsService.incrementCounter("websocket.messages.received");
    this.metricsService.incrementCounter(
      `websocket.messages.received.${event}`,
    );
  }

  // Driver location tracking
  recordDriverLocationUpdate(
    driverId: string,
    wasRateLimited: boolean = false,
  ): void {
    if (wasRateLimited) {
      this.driverMetrics.locationUpdatesRateLimited++;
      this.metricsService.incrementCounter(
        "websocket.driver.location.rate_limited",
      );
    } else {
      this.driverMetrics.locationUpdatesSent++;
      this.metricsService.incrementCounter("websocket.driver.location.sent");
    }

    // Update top drivers list (simple implementation)
    this.updateTopDriversList(driverId);
  }

  private updateTopDriversList(driverId: string): void {
    // This is a simplified implementation. In production, you'd want more sophisticated tracking
    const existingIndex = this.driverMetrics.topDriversByUpdates.findIndex(
      (d) => d.driverId === driverId,
    );

    if (existingIndex >= 0) {
      this.driverMetrics.topDriversByUpdates[existingIndex].updateCount++;
    } else {
      this.driverMetrics.topDriversByUpdates.push({
        driverId,
        updateCount: 1,
      });
    }

    // Keep only top 10 and sort
    this.driverMetrics.topDriversByUpdates.sort(
      (a, b) => b.updateCount - a.updateCount,
    );
    this.driverMetrics.topDriversByUpdates =
      this.driverMetrics.topDriversByUpdates.slice(0, 10);
  }

  setActiveDrivers(count: number): void {
    this.driverMetrics.activeDrivers = count;
    this.metricsService.recordGauge("websocket.drivers.active", count);
  }

  // Performance tracking
  recordMessageProcessingTime(processingTime: number): void {
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > this.MAX_PROCESSING_SAMPLES) {
      this.processingTimes.shift();
    }

    // Update average
    this.performanceMetrics.avgMessageProcessingTime =
      this.processingTimes.reduce((sum, time) => sum + time, 0) /
      this.processingTimes.length;

    this.metricsService.recordHistogram(
      "websocket.message.processing_time",
      processingTime,
    );
  }

  setRedisLatency(latency: number): void {
    this.performanceMetrics.redisLatency = latency;
    this.metricsService.recordGauge("websocket.redis.latency", latency);
  }

  setMessageQueueSize(size: number): void {
    this.performanceMetrics.messageQueueSize = size;
    this.metricsService.recordGauge("websocket.queue.size", size);
  }

  updateMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.performanceMetrics.memoryUsage = memUsage.heapUsed;
    this.metricsService.recordGauge(
      "websocket.memory.heap_used",
      memUsage.heapUsed,
    );
    this.metricsService.recordGauge(
      "websocket.memory.heap_total",
      memUsage.heapTotal,
    );
  }

  // Metrics reporting
  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  getDriverMetrics(): DriverMetrics {
    // Calculate average updates per driver
    const totalUpdates =
      this.driverMetrics.locationUpdatesSent +
      this.driverMetrics.locationUpdatesRateLimited;
    this.driverMetrics.avgUpdatesPerDriver =
      this.driverMetrics.activeDrivers > 0
        ? totalUpdates / this.driverMetrics.activeDrivers
        : 0;

    return { ...this.driverMetrics };
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  getAllMetrics() {
    return {
      connections: this.getConnectionMetrics(),
      drivers: this.getDriverMetrics(),
      performance: this.getPerformanceMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  // Health checks
  async performHealthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    details: Record<string, any>;
  }> {
    const metrics = this.getAllMetrics();
    const details: Record<string, any> = {
      activeConnections: metrics.connections.activeConnections,
      messagesPerSecond: this.calculateMessagesPerSecond(),
      avgProcessingTime: metrics.performance.avgMessageProcessingTime,
      memoryUsage: metrics.performance.memoryUsage,
    };

    // Determine health status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (metrics.performance.avgMessageProcessingTime > 1000) {
      // > 1 second average
      status = "degraded";
      details.highProcessingTime = true;
    }

    if (metrics.performance.memoryUsage > 500 * 1024 * 1024) {
      // > 500MB
      status = "degraded";
      details.highMemoryUsage = true;
    }

    if (metrics.performance.redisLatency > 100) {
      // > 100ms Redis latency
      status = "degraded";
      details.highRedisLatency = true;
    }

    return { status, details };
  }

  private calculateMessagesPerSecond(): number {
    const totalMessages =
      this.connectionMetrics.messagesSent +
      this.connectionMetrics.messagesReceived;
    const uptimeSeconds = (Date.now() - this.performanceMetrics.uptime) / 1000;
    return uptimeSeconds > 0 ? totalMessages / uptimeSeconds : 0;
  }

  private reportMetrics(): void {
    const metrics = this.getAllMetrics();

    this.logger.debug("WebSocket Metrics Report", {
      connections: metrics.connections.activeConnections,
      messagesPerSec: this.calculateMessagesPerSecond(),
      driverUpdates: metrics.drivers.locationUpdatesSent,
      avgProcessingTime: Math.round(
        metrics.performance.avgMessageProcessingTime,
      ),
      memoryUsage:
        Math.round(metrics.performance.memoryUsage / 1024 / 1024) + "MB",
    });

    // Update memory usage
    this.updateMemoryUsage();
  }

  // Reset metrics (useful for testing)
  resetMetrics(): void {
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      connectionsByUserType: {},
      roomsCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
    };

    this.driverMetrics = {
      activeDrivers: 0,
      locationUpdatesSent: 0,
      locationUpdatesRateLimited: 0,
      avgUpdatesPerDriver: 0,
      topDriversByUpdates: [],
    };

    this.processingTimes = [];
    this.performanceMetrics.uptime = Date.now();
  }
}

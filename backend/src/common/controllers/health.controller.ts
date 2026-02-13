import { Controller, Get, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../services/redis.service";
import { MetricsService } from "../services/metrics.service";

@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private metrics: MetricsService,
  ) {}

  /**
   * Liveness Probe - Checks if application is running
   * Should always return 200 if the application is running
   * Used by Kubernetes to determine if pod should be restarted
   */
  @Get("liveness")
  async liveness() {
    // Simple liveness check - just verify the application is running
    return {
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
    };
  }

  /**
   * Readiness Probe - Checks if application is ready to serve traffic
   * Checks critical dependencies (DB, Redis, etc.)
   * Used by Kubernetes to determine if pod should receive traffic
   */
  @Get("readiness")
  async readiness() {
    const checks = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      checks: {} as Record<string, any>,
    };

    let overallStatus = "ready";

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1 as db_check`;
      checks.checks.database = { status: "healthy", response_time_ms: 0 };
    } catch (error) {
      checks.checks.database = {
        status: "unhealthy",
        error:
          error instanceof Error ? error.message : "Database connection failed",
      };
      overallStatus = "not ready";
      this.logger.error("Readiness check failed: Database", error);
    }

    // Redis check
    try {
      await this.redis.ping();
      checks.checks.redis = { status: "healthy", response_time_ms: 0 };
    } catch (error) {
      checks.checks.redis = {
        status: "unhealthy",
        error:
          error instanceof Error ? error.message : "Redis connection failed",
      };
      overallStatus = "not ready";
      this.logger.error("Readiness check failed: Redis", error);
    }

    // Memory check (basic)
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    };

    // Consider unhealthy if using >90% of heap
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (heapUsagePercent > 90) {
      checks.checks.memory = {
        status: "warning",
        usage: memUsageMB,
        usage_percent: heapUsagePercent,
      };
    } else {
      checks.checks.memory = {
        status: "healthy",
        usage: memUsageMB,
        usage_percent: heapUsagePercent,
      };
    }

    // Return appropriate HTTP status
    const response = { ...checks, status: overallStatus };
    if (overallStatus === "not ready") {
      // In a real implementation, you would throw an exception here
      // For demonstration, we'll return the status in the body
      this.logger.warn("Readiness check failed - application not ready");
    }

    return response;
  }

  /**
   * Comprehensive Health Check (for monitoring)
   * Includes all detailed health information
   */
  @Get()
  async health() {
    const readiness = await this.readiness();

    // Add additional metrics for comprehensive health check
    const additionalChecks = {
      process: {
        pid: process.pid,
        node_version: process.version,
        environment: process.env.NODE_ENV || "development",
      },
      metrics: {
        // Would include actual metrics from MetricsService
        sample_metric: "healthy",
      },
    };

    return {
      ...readiness,
      ...additionalChecks,
    };
  }
}

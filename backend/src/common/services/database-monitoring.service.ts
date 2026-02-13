import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  slowQuery: boolean;
}

interface ConnectionStats {
  active: number;
  idle: number;
  pending: number;
  total: number;
  timestamp: Date;
}

@Injectable()
export class DatabaseMonitoringService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseMonitoringService.name);
  private monitoringInterval: NodeJS.Timeout;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second
  private maxMetricsHistory = 10000;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    // Start monitoring
    this.startMonitoring();

    // Enable query logging in development
    if (this.configService.get("NODE_ENV") === "development") {
      this.enableQueryLogging();
    }
  }

  onModuleDestroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  private startMonitoring() {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkSlowQueries();
        await this.updatePerformanceCache();
      } catch (error) {
        this.logger.error("Database monitoring error", error);
      }
    }, 30000);
  }

  private enableQueryLogging() {
    // Note: Prisma $use middleware is deprecated
    // Query logging should be implemented using Prisma Client Extensions or middleware
    // For now, we'll log queries manually in service methods
    this.logger.log("Query logging enabled (manual implementation required)");
  }

  private async collectMetrics() {
    try {
      // Get database connection stats
      const connectionStats = await this.getConnectionStats();

      // Log connection pool status
      this.logger.debug(
        `DB Connections - Active: ${connectionStats.active}, Idle: ${connectionStats.idle}, Pending: ${connectionStats.pending}`,
      );

      // Store connection stats
      await this.storeConnectionStats(connectionStats);

      // Get table sizes
      const tableSizes = await this.getTableSizes();
      this.logger.debug("Table sizes collected", tableSizes);

      // Check for long-running queries
      const longRunningQueries = await this.getLongRunningQueries();
      if (longRunningQueries.length > 0) {
        this.logger.warn(
          `Found ${longRunningQueries.length} long-running queries`,
        );
        longRunningQueries.forEach((query) => {
          this.logger.warn(
            `Long-running query: ${query.query} (${query.duration}s)`,
          );
        });
      }
    } catch (error) {
      this.logger.error("Failed to collect database metrics", error);
    }
  }

  private async checkSlowQueries() {
    const slowQueries = this.queryMetrics.filter(
      (metric) =>
        metric.slowQuery && metric.timestamp > new Date(Date.now() - 300000), // Last 5 minutes
    );

    if (slowQueries.length > 0) {
      this.logger.warn(
        `Detected ${slowQueries.length} slow queries in the last 5 minutes`,
      );

      // Group by query pattern
      const queryGroups = this.groupQueriesByPattern(slowQueries);

      for (const [pattern, queries] of queryGroups.entries()) {
        const avgDuration =
          queries.reduce((sum, q) => sum + q.duration, 0) / queries.length;
        this.logger.warn(
          `Slow query pattern: ${pattern} - Avg duration: ${avgDuration}ms - Count: ${queries.length}`,
        );
      }
    }
  }

  private async updatePerformanceCache() {
    try {
      // Update restaurant popularity cache
      await this.updateRestaurantPopularityCache();

      // Update driver performance cache
      await this.updateDriverPerformanceCache();

      // Clean up old cache entries
      await this.cleanupOldCacheEntries();
    } catch (error) {
      this.logger.error("Failed to update performance cache", error);
    }
  }

  private async getConnectionStats(): Promise<ConnectionStats> {
    try {
      // This is a simplified version. In production, you'd use pg_stat_activity
      const result = await this.prisma.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle,
          COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
          COUNT(*) as total
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      return {
        active: Number(result[0].active || 0),
        idle:
          Number(result[0].idle || 0) +
          Number(result[0].idle_in_transaction || 0),
        pending: 0, // Would need connection pool stats
        total: Number(result[0].total || 0),
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to get connection stats", error);
      return {
        active: 0,
        idle: 0,
        pending: 0,
        total: 0,
        timestamp: new Date(),
      };
    }
  }

  private async getTableSizes() {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `;

      return result;
    } catch (error) {
      this.logger.error("Failed to get table sizes", error);
      return [];
    }
  }

  private async getLongRunningQueries() {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT
          pid,
          now() - pg_stat_activity.query_start as duration,
          query
        FROM pg_stat_activity
        WHERE state = 'active'
          AND now() - pg_stat_activity.query_start > interval '30 seconds'
          AND query NOT LIKE '%pg_stat_activity%'
        ORDER BY duration DESC
        LIMIT 5
      `;

      return (
        result as Array<{
          pid: number;
          duration: { seconds: number };
          query: string;
        }>
      ).map((row) => ({
        pid: row.pid,
        duration: row.duration.seconds || 0,
        query: row.query,
      }));
    } catch (error) {
      this.logger.error("Failed to get long running queries", error);
      return [];
    }
  }

  private recordQueryMetrics(metrics: QueryMetrics) {
    this.queryMetrics.push(metrics);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }

    // Log slow queries immediately
    if (metrics.slowQuery) {
      this.logger.warn(
        `Slow query detected: ${metrics.duration}ms - ${metrics.query.substring(0, 100)}...`,
      );
    }
  }

  private groupQueriesByPattern(
    queries: QueryMetrics[],
  ): Map<string, QueryMetrics[]> {
    const groups = new Map<string, QueryMetrics[]>();

    queries.forEach((query) => {
      // Simple pattern extraction (you might want to use a more sophisticated approach)
      const pattern = query.query.replace(/\d+/g, "?").replace(/'[^']*'/g, "?");
      const key = pattern.substring(0, 100);

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(query);
    });

    return groups;
  }

  private async updateRestaurantPopularityCache() {
    try {
      // Calculate restaurant popularity based on recent orders and ratings
      await this.prisma.$queryRaw`
        INSERT INTO "RestaurantPopularityCache" ("restaurantId", "score", "orderCount", "avgRating", "updatedAt")
        SELECT
          r.id,
          (
            COALESCE(avg_rating, 0) * 0.4 +
            LEAST(order_count / 100.0, 1) * 0.3 +
            CASE WHEN r."isOpen" THEN 0.3 ELSE 0 END
          ) as score,
          COALESCE(order_count, 0) as order_count,
          COALESCE(avg_rating, 0) as avg_rating,
          NOW()
        FROM "Restaurant" r
        LEFT JOIN (
          SELECT
            "restaurantId",
            COUNT(*) as order_count,
            AVG(rating) as avg_rating
          FROM "Order" o
          LEFT JOIN "Review" rv ON o.id = rv."orderId"
          WHERE o."createdAt" > NOW() - INTERVAL '30 days'
          GROUP BY "restaurantId"
        ) stats ON r.id = stats."restaurantId"
        ON CONFLICT ("restaurantId")
        DO UPDATE SET
          "score" = EXCLUDED."score",
          "orderCount" = EXCLUDED."orderCount",
          "avgRating" = EXCLUDED."avgRating",
          "updatedAt" = EXCLUDED."updatedAt"
      `;
    } catch (error) {
      this.logger.error("Failed to update restaurant popularity cache", error);
    }
  }

  private async updateDriverPerformanceCache() {
    try {
      await this.prisma.$queryRaw`
        INSERT INTO "DriverPerformanceCache" ("driverId", "avgDeliveryTime", "successRate", "rating", "totalDeliveries", "updatedAt")
        SELECT
          d.id,
          COALESCE(avg_delivery_time, 45) as avg_delivery_time,
          COALESCE(success_rate, 0) as success_rate,
          COALESCE(avg_rating, 0) as avg_rating,
          COALESCE(total_deliveries, 0) as total_deliveries,
          NOW()
        FROM "Driver" d
        LEFT JOIN (
          SELECT
            "driverId",
            AVG(EXTRACT(EPOCH FROM ("deliveredAt" - "createdAt"))/60) as avg_delivery_time,
            AVG(rv.rating) as avg_rating,
            COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL as success_rate,
            COUNT(*) as total_deliveries
          FROM "Order" o
          LEFT JOIN "Review" rv ON o.id = rv."orderId"
          WHERE o."createdAt" > NOW() - INTERVAL '30 days'
          GROUP BY "driverId"
        ) stats ON d.id = stats."driverId"
        WHERE d."isActive" = true
        ON CONFLICT ("driverId")
        DO UPDATE SET
          "avgDeliveryTime" = EXCLUDED."avgDeliveryTime",
          "successRate" = EXCLUDED."successRate",
          "rating" = EXCLUDED."rating",
          "totalDeliveries" = EXCLUDED."totalDeliveries",
          "updatedAt" = EXCLUDED."updatedAt"
      `;
    } catch (error) {
      this.logger.error("Failed to update driver performance cache", error);
    }
  }

  private async cleanupOldCacheEntries() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      await this.prisma.$queryRaw`
        DELETE FROM "QueryPerformanceLog"
        WHERE "timestamp" < ${thirtyDaysAgo}
      `;

      await this.prisma.$queryRaw`
        DELETE FROM "ConnectionPoolStats"
        WHERE "timestamp" < ${thirtyDaysAgo}
      `;
    } catch (error) {
      this.logger.error("Failed to cleanup old cache entries", error);
    }
  }

  private async storeConnectionStats(stats: ConnectionStats) {
    try {
      await this.prisma.$queryRaw`
        INSERT INTO "ConnectionPoolStats" ("id", "timestamp", "activeConnections", "idleConnections", "pendingConnections", "totalCount")
        VALUES (${this.generateId()}, ${stats.timestamp}, ${stats.active}, ${stats.idle}, ${stats.pending}, ${stats.total})
      `;
    } catch (error) {
      this.logger.error("Failed to store connection stats", error);
    }
  }

  private extractQueryString(params: any): string {
    // Extract query string from Prisma params (simplified)
    try {
      return JSON.stringify(params).substring(0, 500);
    } catch {
      return "Unknown query";
    }
  }

  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for external monitoring
  getQueryMetrics(hours: number = 1): QueryMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.queryMetrics.filter((metric) => metric.timestamp > cutoff);
  }

  getSlowQueryCount(hours: number = 1): number {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.queryMetrics.filter(
      (metric) => metric.slowQuery && metric.timestamp > cutoff,
    ).length;
  }

  async getDatabaseHealth(): Promise<any> {
    try {
      const connectionStats = await this.getConnectionStats();
      const tableSizes = await this.getTableSizes();
      const slowQueryCount = this.getSlowQueryCount(1);

      return {
        status: "healthy",
        connections: connectionStats,
        tableSizes,
        slowQueries: slowQueryCount,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }
}

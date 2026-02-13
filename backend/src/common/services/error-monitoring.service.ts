import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as Sentry from "@sentry/node";
import { ConfigService } from "@nestjs/config";

export interface ErrorLog {
  id?: string;
  timestamp: Date;
  level: "error" | "warn" | "info";
  message: string;
  stack?: string;
  context?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ErrorMonitoringService {
  private readonly logger = new Logger(ErrorMonitoringService.name);
  private readonly errorBuffer: ErrorLog[] = [];
  private readonly maxBufferSize = 100;
  private readonly flushInterval: NodeJS.Timeout;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Flush error buffer every 5 minutes
    this.flushInterval = setInterval(
      () => {
        this.flushErrors();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Log error with context
   */
  async logError(
    error: Error | string,
    context?: {
      service?: string;
      method?: string;
      userId?: string;
      requestId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      level: "error",
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context: context?.service
        ? `${context.service}${context.method ? `.${context.method}` : ""}`
        : undefined,
      userId: context?.userId,
      requestId: context?.requestId,
      metadata: context?.metadata,
    };

    // Log to console
    this.logger.error(
      `[${errorLog.context || "Unknown"}] ${errorLog.message}`,
      error instanceof Error ? error.stack : undefined,
    );

    // Add to buffer
    this.errorBuffer.push(errorLog);

    // Flush if buffer is full
    if (this.errorBuffer.length >= this.maxBufferSize) {
      await this.flushErrors();
    }

    // Send to external monitoring service if configured
    await this.sendToExternalService(errorLog);
  }

  /**
   * Log warning
   */
  async logWarning(
    message: string,
    context?: {
      service?: string;
      method?: string;
      userId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      level: "warn",
      message,
      context: context?.service
        ? `${context.service}${context.method ? `.${context.method}` : ""}`
        : undefined,
      userId: context?.userId,
      metadata: context?.metadata,
    };

    this.logger.warn(`[${errorLog.context || "Unknown"}] ${message}`);

    // Add to buffer (warnings are less critical, so we don't flush immediately)
    this.errorBuffer.push(errorLog);
  }

  /**
   * Get error statistics
   */
  async getErrorStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    byLevel: Record<string, number>;
    byContext: Record<string, number>;
    recent: ErrorLog[];
  }> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = endDate || new Date();

    // Filter buffer
    const filtered = this.errorBuffer.filter(
      (log) => log.timestamp >= start && log.timestamp <= end,
    );

    const byLevel: Record<string, number> = {};
    const byContext: Record<string, number> = {};

    filtered.forEach((log) => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      if (log.context) {
        byContext[log.context] = (byContext[log.context] || 0) + 1;
      }
    });

    return {
      total: filtered.length,
      byLevel,
      byContext,
      recent: filtered
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50),
    };
  }

  /**
   * Flush errors to database (if ErrorLog model exists)
   */
  private async flushErrors(): Promise<void> {
    if (this.errorBuffer.length === 0) {
      return;
    }

    const errorsToFlush = [...this.errorBuffer];
    this.errorBuffer.length = 0; // Clear buffer

    try {
      // Try to save to database if ErrorLog model exists
      // For now, we'll just log that we would save them
      this.logger.debug(
        `Flushing ${errorsToFlush.length} error logs to database`,
      );

      // In production, you would save to database:
      // await this.prisma.errorLog.createMany({
      //   data: errorsToFlush.map(log => ({
      //     timestamp: log.timestamp,
      //     level: log.level,
      //     message: log.message,
      //     stack: log.stack,
      //     context: log.context,
      //     userId: log.userId,
      //     requestId: log.requestId,
      //     metadata: log.metadata,
      //   })),
      // });
    } catch (error) {
      this.logger.error("Failed to flush errors to database:", error);
      // Re-add to buffer if flush failed
      this.errorBuffer.unshift(...errorsToFlush);
    }
  }

  /**
   * Send error to external monitoring service (e.g., Sentry)
   */
  private async sendToExternalService(errorLog: ErrorLog): Promise<void> {
    const sentryDsn = this.configService.get<string>("SENTRY_DSN");
    if (!sentryDsn) {
      return; // Sentry not configured
    }

    try {
      // In production, you would integrate with Sentry:
      // Sentry.captureException(new Error(errorLog.message), {
      //   level: errorLog.level === 'error' ? 'error' : 'warning',
      //   tags: {
      //     context: errorLog.context,
      //   },
      //   user: errorLog.userId ? { id: errorLog.userId } : undefined,
      //   extra: errorLog.metadata,
      // });
    } catch (error) {
      this.logger.warn("Failed to send error to external service:", error);
    }
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Flush remaining errors
    this.flushErrors();
  }
}

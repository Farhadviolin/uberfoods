import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "./redis.service";

export interface OutboxMessage {
  id: string;
  type: string;
  payload: any;
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
  lastError?: string;
}

@Injectable()
export class OutboxService implements OnModuleInit {
  private readonly logger = new Logger(OutboxService.name);
  private isProcessing = false;
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 10;
  private readonly POLL_INTERVAL_MS = 5000; // 5 seconds

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.startOutboxProcessor();
  }

  /**
   * Add a message to the outbox
   */
  async addToOutbox(type: string, payload: any): Promise<string> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.prisma.$executeRaw`
      INSERT INTO outbox_events (id, type, payload, created_at, retry_count)
      VALUES (${messageId}, ${type}, ${JSON.stringify(payload)}, NOW(), 0)
    `;

    this.logger.log(`Added message to outbox: ${messageId} (${type})`);
    return messageId;
  }

  /**
   * Start the outbox processor (runs in background)
   */
  private startOutboxProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing) {
        return;
      }

      try {
        this.isProcessing = true;
        await this.processOutboxMessages();
      } catch (error) {
        this.logger.error("Error processing outbox messages:", error);
      } finally {
        this.isProcessing = false;
      }
    }, this.POLL_INTERVAL_MS);

    this.logger.log("Outbox processor started");
  }

  /**
   * Process pending outbox messages
   */
  private async processOutboxMessages(): Promise<void> {
    // Get unprocessed messages
    const messages = await this.prisma.$queryRaw<OutboxMessage[]>`
      SELECT id, type, payload, created_at, processed_at, retry_count, last_error
      FROM outbox_events
      WHERE processed_at IS NULL
      ORDER BY created_at ASC
      LIMIT ${this.BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `;

    if (messages.length === 0) {
      return;
    }

    this.logger.debug(`Processing ${messages.length} outbox messages`);

    for (const message of messages) {
      try {
        await this.publishMessage(message);
        await this.markAsProcessed(message.id);
        this.logger.debug(
          `Successfully processed outbox message: ${message.id}`,
        );
      } catch (error) {
        await this.handleProcessingError(message, error);
      }
    }
  }

  /**
   * Publish message to Redis streams
   */
  private async publishMessage(message: OutboxMessage): Promise<void> {
    const streamKey = `events:${message.type}`;

    await this.redisService.xadd(streamKey, "*", {
      id: message.id,
      type: message.type,
      payload: JSON.stringify(message.payload),
      created_at: message.createdAt.toISOString(),
    });
  }

  /**
   * Mark message as processed
   */
  private async markAsProcessed(messageId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE outbox_events
      SET processed_at = NOW()
      WHERE id = ${messageId}
    `;
  }

  /**
   * Handle processing errors with retry logic
   */
  private async handleProcessingError(
    message: OutboxMessage,
    error: any,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const newRetryCount = message.retryCount + 1;

    if (newRetryCount >= this.MAX_RETRIES) {
      // Mark as failed (could move to dead letter queue)
      await this.prisma.$executeRaw`
        UPDATE outbox_events
        SET last_error = ${errorMessage}, retry_count = ${newRetryCount}
        WHERE id = ${message.id}
      `;
      this.logger.error(
        `Message ${message.id} failed permanently after ${newRetryCount} retries: ${errorMessage}`,
      );
    } else {
      // Increment retry count and leave for next processing
      await this.prisma.$executeRaw`
        UPDATE outbox_events
        SET last_error = ${errorMessage}, retry_count = ${newRetryCount}
        WHERE id = ${message.id}
      `;
      this.logger.warn(
        `Message ${message.id} failed (attempt ${newRetryCount}/${this.MAX_RETRIES}): ${errorMessage}`,
      );
    }
  }

  /**
   * Get outbox statistics
   */
  async getStats(): Promise<any> {
    const stats = await this.prisma.$queryRaw`
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as pending_messages,
        COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed_messages,
        COUNT(CASE WHEN retry_count > 0 THEN 1 END) as retried_messages,
        AVG(retry_count) as avg_retry_count
      FROM outbox_events
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;

    return stats[0];
  }
}

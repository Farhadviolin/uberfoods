import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { RedisService } from "./redis.service";

interface IdempotencyRecord {
  response: any;
  statusCode: number;
  headers: Record<string, string>;
  createdAt: number;
  expiresAt: number;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private redisService: RedisService) {}

  /**
   * Check if an operation has already been processed
   * Returns the cached response if found, null if not found
   */
  async checkIdempotency(key: string): Promise<IdempotencyRecord | null> {
    if (!key) {
      return null;
    }

    try {
      const cached = await this.redisService.get(`idempotency:${key}`);
      if (!cached) {
        return null;
      }

      const record: IdempotencyRecord = JSON.parse(cached);

      // Check if expired
      if (Date.now() > record.expiresAt) {
        await this.redisService.del(`idempotency:${key}`);
        return null;
      }

      this.logger.debug(`Idempotency hit for key: ${key}`);
      return record;
    } catch (error) {
      this.logger.error(`Error checking idempotency for key ${key}:`, error);
      return null; // Fail open - allow operation to proceed
    }
  }

  /**
   * Store the result of an idempotent operation
   */
  async storeIdempotency(
    key: string,
    response: any,
    statusCode: number,
    headers: Record<string, string>,
    ttlSeconds: number,
  ): Promise<void> {
    if (!key) {
      return;
    }

    try {
      const record: IdempotencyRecord = {
        response,
        statusCode,
        headers,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttlSeconds * 1000,
      };

      await this.redisService.setex(
        `idempotency:${key}`,
        ttlSeconds,
        JSON.stringify(record),
      );

      this.logger.debug(`Stored idempotency result for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error storing idempotency for key ${key}:`, error);
      // Don't fail the operation if caching fails
    }
  }

  /**
   * Validate idempotency key format
   */
  validateIdempotencyKey(key: string): boolean {
    if (!key) {
      return false;
    }

    // Should be a UUID or similar unique identifier
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(key) || key.length >= 16; // Allow longer custom keys
  }
}

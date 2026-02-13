import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "./redis.service";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix: string; // Redis key prefix
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  current: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(private redisService: RedisService) {}

  /**
   * Check rate limit for a given key
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowKey = `${config.keyPrefix}:${key}:${Math.floor(now / config.windowMs)}`;
    const resetTime = (Math.floor(now / config.windowMs) + 1) * config.windowMs;

    try {
      // Use Redis sorted set to track requests in current window
      const member = `${now}:${Math.random()}`;

      // Add current request to the window
      await this.redisService.zadd(windowKey, now, member);

      // Remove expired entries (older than current window)
      const windowStart = now - config.windowMs;
      await this.redisService.zremrangebyscore(windowKey, 0, windowStart);

      // Count requests in current window
      const requestCount = await this.redisService.zcard(windowKey);

      // Set expiry on the key (cleanup)
      await this.redisService.expire(
        windowKey,
        Math.ceil(config.windowMs / 1000) * 2,
      );

      const allowed = requestCount <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - requestCount);

      if (!allowed) {
        this.logger.warn(
          `Rate limit exceeded for key: ${key} (${requestCount}/${config.maxRequests})`,
        );
      }

      return {
        allowed,
        remaining,
        resetTime,
        current: requestCount,
      };
    } catch (error) {
      this.logger.error(`Rate limiter error for key ${key}:`, error);
      // Fail open - allow request if Redis fails
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
        current: 1,
      };
    }
  }

  /**
   * HTTP API rate limiting (per IP + per user)
   */
  async checkHttpRateLimit(
    ip: string,
    userId?: string,
  ): Promise<{ allowed: boolean; headers: Record<string, string> }> {
    const now = Date.now();

    // Check IP-based limit (more restrictive)
    const ipLimit: RateLimitConfig = {
      windowMs: 60000, // 1 minute
      maxRequests: 100, // 100 requests per minute per IP
      keyPrefix: "ratelimit:http:ip",
    };

    const ipResult = await this.checkLimit(ip, ipLimit);

    // Check user-based limit (if authenticated, more generous)
    let userResult: RateLimitResult | null = null;
    if (userId) {
      const userLimit: RateLimitConfig = {
        windowMs: 60000, // 1 minute
        maxRequests: 500, // 500 requests per minute per user
        keyPrefix: "ratelimit:http:user",
      };

      userResult = await this.checkLimit(userId, userLimit);
    }

    // Use the more restrictive result
    const result =
      userResult && userResult.remaining < ipResult.remaining
        ? userResult
        : ipResult;
    const limitType =
      userResult && userResult.remaining < ipResult.remaining ? "user" : "ip";

    const headers = {
      "X-RateLimit-Limit": result.allowed ? "100" : "100",
      "X-RateLimit-Remaining": Math.max(0, result.remaining - 1).toString(),
      "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
      "X-RateLimit-Type": limitType,
      "Retry-After": result.allowed
        ? "0"
        : Math.ceil((result.resetTime - now) / 1000).toString(),
    };

    return {
      allowed: result.allowed,
      headers,
    };
  }

  /**
   * Get rate limit statistics
   */
  async getStats(keyPrefix: string): Promise<any> {
    try {
      // This is a simplified stats implementation
      // In production, you might want more detailed metrics
      const keys = await this.redisService.keys(`${keyPrefix}:*`);

      const stats = {
        totalKeys: keys.length,
        sampleKeys: keys.slice(0, 5),
        timestamp: new Date().toISOString(),
      };

      return stats;
    } catch (error) {
      this.logger.error("Error getting rate limit stats:", error);
      return { error: "Failed to get stats" };
    }
  }
}

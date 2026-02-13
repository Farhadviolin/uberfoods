import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { createClient, RedisClientType } from "redis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    const redisUrl =
      process.env.REDIS_URL ||
      process.env.REDIS_SOCKET_URL ||
      "redis://localhost:6379";

    this.client = createClient({
      url: redisUrl,
    });

    this.client.on("error", (err) => {
      this.logger.error("Redis Client Error", err);
      this.isConnected = false;
    });

    this.client.on("connect", () => {
      this.logger.log("Redis Client Connected");
      this.isConnected = true;
    });

    this.client.on("disconnect", () => {
      this.logger.warn("Redis Client Disconnected");
      this.isConnected = false;
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error("Failed to connect to Redis on module init", error);
      // Don't throw - allow graceful degradation
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.disconnect();
    } catch (error) {
      this.logger.error("Error disconnecting from Redis", error);
    }
  }

  // Basic operations
  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) return null;
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      await this.client.set(key, value);
      return true;
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      this.logger.error(`Redis SETEX error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string | string[]): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      const keys = Array.isArray(key) ? key : [key];
      return await this.client.del(keys);
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      const result = await this.client.expire(key, ttl);
      return typeof result === "number" ? result > 0 : Boolean(result);
    } catch (error) {
      this.logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // Sorted Set operations
  async zadd(key: string, score: number, member: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      await this.client.zAdd(key, { score, value: member });
      return true;
    } catch (error) {
      this.logger.error(`Redis ZADD error for key ${key}:`, error);
      return false;
    }
  }

  async zcard(key: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      return await this.client.zCard(key);
    } catch (error) {
      this.logger.error(`Redis ZCARD error for key ${key}:`, error);
      return 0;
    }
  }

  async zremrangebyscore(
    key: string,
    min: number,
    max: number,
  ): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      return await this.client.zRemRangeByScore(key, min, max);
    } catch (error) {
      this.logger.error(`Redis ZREMRANGEBYSCORE error for key ${key}:`, error);
      return 0;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      return await this.client.zRange(key, start, stop);
    } catch (error) {
      this.logger.error(`Redis ZRANGE error for key ${key}:`, error);
      return [];
    }
  }

  // Key operations
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (!this.isConnected) return null;
      return await this.client.hGet(key, field);
    } catch (error) {
      this.logger.error(
        `Redis HGET error for key ${key}, field ${field}:`,
        error,
      );
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      await this.client.hSet(key, field, value);
      return true;
    } catch (error) {
      this.logger.error(
        `Redis HSET error for key ${key}, field ${field}:`,
        error,
      );
      return false;
    }
  }

  async hdel(key: string, field: string | string[]): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      const fields = Array.isArray(field) ? field : [field];
      return await this.client.hDel(key, fields);
    } catch (error) {
      this.logger.error(`Redis HDEL error for key ${key}:`, error);
      return 0;
    }
  }

  // Connection status
  isHealthy(): boolean {
    return this.isConnected;
  }

  // Ping
  async ping(): Promise<string | null> {
    try {
      if (!this.isConnected) return null;
      return await this.client.ping();
    } catch (error) {
      this.logger.error("Redis PING error:", error);
      return null;
    }
  }

  // Redis Streams operations
  async xadd(
    key: string,
    id: string,
    data: Record<string, string>,
  ): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.xAdd(key, id, data);
    } catch (error) {
      this.logger.error("Redis XADD failed", error);
      return null;
    }
  }
}

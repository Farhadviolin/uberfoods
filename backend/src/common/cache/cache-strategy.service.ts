import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "./cache.service";

@Injectable()
export class CacheStrategyService {
  private readonly logger = new Logger(CacheStrategyService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Cache-aside pattern with automatic refresh
   */
  async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
  ): Promise<T> {
    const cached = this.cacheService.get<T>(key);
    if (cached) {
      this.logger.debug(`Cache hit for ${key}`);
      return cached;
    }

    this.logger.debug(`Cache miss for ${key}, fetching...`);
    const data = await fetcher();
    this.cacheService.set(key, data, ttl);
    return data;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateDriverCache(driverId: string, pattern: string) {
    const patterns = [
      `driver:${pattern}:${driverId}*`,
      `driver:overview:${driverId}`,
      `driver:stats:${driverId}*`,
      `driver:earnings:${driverId}*`,
    ];

    for (const p of patterns) {
      // In production, would use Redis pattern matching
      // For now, clear known keys
      this.cacheService.delete(p.replace("*", ""));
    }

    this.logger.debug(
      `Invalidated cache for driver ${driverId}, pattern: ${pattern}`,
    );
  }

  /**
   * Warm cache for frequently accessed data
   */
  async warmDriverCache(driverId: string) {
    // This would preload common queries
    // Implementation depends on specific use case
    this.logger.debug(`Warming cache for driver ${driverId}`);
  }

  /**
   * Cache with automatic refresh before expiration
   */
  async getCachedWithRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    refreshThreshold: number = 0.8, // Refresh at 80% of TTL
  ): Promise<T> {
    const cached = this.cacheService.get<{ data: T; timestamp: number }>(key);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      const shouldRefresh = age > ttl * refreshThreshold;

      if (shouldRefresh) {
        // Refresh in background
        fetcher()
          .then((data) => {
            this.cacheService.set(key, { data, timestamp: Date.now() }, ttl);
          })
          .catch((err) => {
            this.logger.warn(`Background cache refresh failed for ${key}`, err);
          });
      }

      return cached.data;
    }

    // Cache miss - fetch and store
    const data = await fetcher();
    this.cacheService.set(key, { data, timestamp: Date.now() }, ttl);
    return data;
  }
}

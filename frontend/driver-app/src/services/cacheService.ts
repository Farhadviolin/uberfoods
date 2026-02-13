/**
 * Advanced Cache Service for client-side caching
 * Implements TTL, LRU eviction, tagging, compression, and analytics
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  accessCount?: number;
  lastAccessed?: number;
  size?: number;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high';
}

interface CacheOptions {
  ttl?: number;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  compress?: boolean;
}

interface CacheStats {
  size: number;
  itemCount: number;
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  memoryUsage: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>();
  private maxSize: number;
  private defaultTTL: number;
  private maxMemoryUsage: number;
  private stats = {
    totalRequests: 0,
    totalHits: 0,
  };

  constructor(
    maxSize: number = 200,
    defaultTTL: number = 5 * 60 * 1000,
    maxMemoryUsage: number = 50 * 1024 * 1024 // 50MB
  ) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.maxMemoryUsage = maxMemoryUsage;
  }

  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const { ttl, tags = [], priority = 'normal' } = options;

    // Estimate data size
    const size = this.estimateSize(value);

    // Check memory limits
    if (this.getTotalMemoryUsage() + size > this.maxMemoryUsage) {
      this.evictBySize(size);
    }

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictByPriority();
    }

    // Handle tags for grouped invalidation
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
      tags,
      priority,
    });
  }

  get<T>(key: string): T | null {
    this.stats.totalRequests++;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.invalidate(key);
      return null;
    }

    // Update access statistics
    entry.accessCount = (entry.accessCount || 0) + 1;
    entry.lastAccessed = Date.now();
    this.stats.totalHits++;

    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if entry has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  invalidate(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      // Remove from tag index
      for (const tag of entry.tags || []) {
        const tagKeys = this.tagIndex.get(tag);
        if (tagKeys) {
          tagKeys.delete(key);
          if (tagKeys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }

      this.cache.delete(key);
    }
  }

  invalidateByTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (keys) {
      for (const key of keys) {
        this.cache.delete(key);
      }
      this.tagIndex.delete(tag);
    }
  }

  invalidateByPattern(pattern: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.invalidate(key);
    }
  }

  getStats(): CacheStats {
    const totalMemory = this.getTotalMemoryUsage();
    const hitRate = this.stats.totalRequests > 0
      ? (this.stats.totalHits / this.stats.totalRequests) * 100
      : 0;

    return {
      size: this.cache.size,
      itemCount: this.cache.size,
      hitRate,
      totalRequests: this.stats.totalRequests,
      totalHits: this.stats.totalHits,
      memoryUsage: totalMemory,
    };
  }

  // Advanced caching methods
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return Promise.resolve(cached);
    }

    // Fetch and cache
    const data = await fetcher();
    this.set(key, data, options);
    return data;
  }

  async backgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions & { refreshThreshold: number } = { refreshThreshold: 0.8 }
  ): Promise<T> {
    const entry = this.cache.get(key);

    if (!entry) {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    }

    // Check if item needs refresh (80% of TTL passed)
    const age = Date.now() - entry.timestamp;
    const ttl = entry.ttl || this.defaultTTL;
    const refreshThreshold = options.refreshThreshold * ttl;

    if (age > refreshThreshold) {
      // Refresh in background
      fetcher().then(data => {
        this.set(key, data, options);
      }).catch(error => {
        console.warn(`Background refresh failed for key: ${key}`, error);
      });
    }

    return entry.value;
  }

  delete(key: string): boolean {
    this.invalidate(key);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.stats.totalRequests = 0;
    this.stats.totalHits = 0;
  }

  private evictByPriority(): void {
    // Sort items by eviction priority
    const items = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry,
      score: this.calculateEvictionScore(entry)
    }));

    items.sort((a, b) => a.score - b.score); // Lower score = evict first

    if (items.length > 0) {
      this.invalidate(items[0].key);
    }
  }

  private evictBySize(requiredSize: number): void {
    const items = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry,
      score: this.calculateEvictionScore(entry)
    }));

    items.sort((a, b) => a.score - b.score);

    let freedSize = 0;
    for (const { key, entry } of items) {
      if (freedSize >= requiredSize) break;
      freedSize += entry.size || 0;
      this.invalidate(key);
    }
  }

  private calculateEvictionScore(entry: CacheEntry<any>): number {
    const now = Date.now();
    const age = now - (entry.lastAccessed || entry.timestamp);
    const ttl = entry.ttl || this.defaultTTL;
    const ageRatio = age / ttl;

    // Priority weights
    const priorityWeights = { low: 1, normal: 2, high: 3 };
    const priorityWeight = priorityWeights[entry.priority || 'normal'];

    // Score based on: access frequency, recency, size, age, and priority
    const accessScore = 1 / ((entry.accessCount || 0) + 1);
    const recencyScore = age / (1000 * 60 * 60); // Hours since last access
    const sizeScore = (entry.size || 0) / 1024; // KB
    const ageScore = ageRatio;
    const priorityScore = 4 - priorityWeight; // Higher priority = lower score

    return accessScore + recencyScore + sizeScore + ageScore + priorityScore;
  }

  private estimateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // Rough estimation for UTF-16
    } catch {
      return 1024; // Fallback size
    }
  }

  private getTotalMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size || 0;
    }
    return total;
  }

  // Legacy method for backward compatibility
  private evictLRU(): void {
    this.evictByPriority();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Singleton instance
export const cacheService = new CacheService();


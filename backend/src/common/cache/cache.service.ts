import { Injectable, Logger } from "@nestjs/common";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags?: string[];
  hits?: number;
  lastAccessed?: number;
  size?: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 300000; // 5 Minuten
  private tagIndex = new Map<string, Set<string>>(); // tag -> Set<keys>
  private totalHits = 0;
  private totalMisses = 0;

  /**
   * Setzt einen Wert im Cache
   */
  set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultTTL,
    tags?: string[],
  ): void {
    const expiresAt = Date.now() + ttl;
    const size = this.calculateSize(value);

    this.cache.set(key, {
      data: value,
      expiresAt,
      tags,
      hits: 0,
      lastAccessed: Date.now(),
      size,
    });

    // Update tag index
    if (tags && tags.length > 0) {
      tags.forEach((tag) => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      });
    }

    this.logger.debug(
      `Cache set: ${key} (TTL: ${ttl}ms, tags: ${tags?.join(",") || "none"})`,
    );
  }

  /**
   * Holt einen Wert aus dem Cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.totalMisses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.totalMisses++;
      return null;
    }

    // Update access statistics
    entry.hits = (entry.hits || 0) + 1;
    entry.lastAccessed = Date.now();
    this.totalHits++;

    return entry.data as T;
  }

  /**
   * Prüft ob ein Key im Cache existiert
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Löscht einen Wert aus dem Cache
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * Löscht alle Werte die einem Pattern entsprechen
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.logger.debug(
        `Cache pattern deleted: ${pattern} (${deleted} entries)`,
      );
    }
  }

  /**
   * Löscht den gesamten Cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`Cache cleared (${size} entries)`);
  }

  /**
   * Gibt die Anzahl der Cache-Einträge zurück
   */
  size(): number {
    // Bereinige abgelaufene Einträge
    this.cleanExpired();
    return this.cache.size;
  }

  /**
   * Bereinigt abgelaufene Einträge
   */
  private cleanExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Generiert einen Cache-Key
   */
  generateKey(
    prefix: string,
    ...parts: (string | number | undefined)[]
  ): string {
    const filtered = parts.filter((p) => p !== undefined && p !== null);
    return `${prefix}:${filtered.join(":")}`;
  }

  // ========== EXTENDED CACHE FEATURES ==========

  /**
   * Löscht alle Cache-Einträge mit einem bestimmten Tag
   */
  deleteByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) {
      return 0;
    }

    let deleted = 0;
    keys.forEach((key) => {
      this.delete(key);
      deleted++;
    });

    this.tagIndex.delete(tag);
    this.logger.debug(`Deleted ${deleted} cache entries by tag: ${tag}`);
    return deleted;
  }

  /**
   * Löscht alle Cache-Einträge mit mehreren Tags
   */
  deleteByTags(tags: string[]): number {
    let totalDeleted = 0;
    tags.forEach((tag) => {
      totalDeleted += this.deleteByTag(tag);
    });
    return totalDeleted;
  }

  /**
   * Fügt Tags zu einem bestehenden Cache-Eintrag hinzu
   */
  addTags(key: string, tags: string[]): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    entry.tags = [...(entry.tags || []), ...tags];

    tags.forEach((tag) => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    });

    return true;
  }

  /**
   * Gibt Cache-Statistiken zurück
   */
  getStats() {
    this.cleanExpired();

    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, e) => sum + (e.size || 0), 0);
    const avgHits =
      entries.length > 0
        ? entries.reduce((sum, e) => sum + (e.hits || 0), 0) / entries.length
        : 0;

    return {
      totalEntries: this.cache.size,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate:
        this.totalHits + this.totalMisses > 0
          ? (this.totalHits / (this.totalHits + this.totalMisses)) * 100
          : 0,
      totalSize,
      avgEntrySize: entries.length > 0 ? totalSize / entries.length : 0,
      avgHits,
      tags: Array.from(this.tagIndex.keys()),
      tagCount: this.tagIndex.size,
    };
  }

  /**
   * Gibt die Top-N am häufigsten verwendeten Cache-Keys zurück
   */
  getTopKeys(
    limit: number = 10,
  ): Array<{ key: string; hits: number; size: number }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        hits: entry.hits || 0,
        size: entry.size || 0,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);

    return entries;
  }

  /**
   * Berechnet die Größe eines Objekts (vereinfacht)
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  /**
   * Warmt den Cache mit vordefinierten Daten auf
   */
  async warmCache(
    warmupData: Array<{
      key: string;
      value: any;
      ttl?: number;
      tags?: string[];
    }>,
  ): Promise<number> {
    let warmed = 0;

    for (const item of warmupData) {
      if (!this.has(item.key)) {
        this.set(item.key, item.value, item.ttl || this.defaultTTL, item.tags);
        warmed++;
      }
    }

    this.logger.log(`Cache warmed with ${warmed} entries`);
    return warmed;
  }

  /**
   * Preloads Daten für häufig verwendete Keys
   */
  async preload(
    loader: (key: string) => Promise<any>,
    keys: string[],
    ttl?: number,
    tags?: string[],
  ): Promise<number> {
    let preloaded = 0;

    await Promise.all(
      keys.map(async (key) => {
        if (!this.has(key)) {
          try {
            const value = await loader(key);
            this.set(key, value, ttl || this.defaultTTL, tags);
            preloaded++;
          } catch (error) {
            this.logger.warn(`Failed to preload cache key ${key}:`, error);
          }
        }
      }),
    );

    this.logger.log(`Preloaded ${preloaded} cache entries`);
    return preloaded;
  }

  /**
   * Gibt Cache-Analytics zurück
   */
  getAnalytics() {
    const stats = this.getStats();
    const entries = Array.from(this.cache.entries());

    const byTag: Record<string, number> = {};
    this.tagIndex.forEach((keys, tag) => {
      byTag[tag] = keys.size;
    });

    const sizeDistribution = {
      small: entries.filter(([, e]) => (e.size || 0) < 1000).length,
      medium: entries.filter(
        ([, e]) => (e.size || 0) >= 1000 && (e.size || 0) < 10000,
      ).length,
      large: entries.filter(([, e]) => (e.size || 0) >= 10000).length,
    };

    return {
      ...stats,
      byTag,
      sizeDistribution,
      topKeys: this.getTopKeys(10),
    };
  }

  /**
   * Setzt Cache-Statistiken zurück
   */
  resetStats(): void {
    this.totalHits = 0;
    this.totalMisses = 0;

    // Reset hits for all entries
    this.cache.forEach((entry) => {
      entry.hits = 0;
    });
  }

  /**
   * Optimiert den Cache durch Entfernen von wenig genutzten Einträgen
   */
  optimize(maxSize: number): number {
    if (this.cache.size <= maxSize) {
      return 0;
    }

    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        hits: entry.hits || 0,
        lastAccessed: entry.lastAccessed || 0,
      }))
      .sort((a, b) => {
        // Sort by hits first, then by last accessed
        if (a.hits !== b.hits) {
          return a.hits - b.hits;
        }
        return a.lastAccessed - b.lastAccessed;
      });

    const toRemove = entries.slice(0, this.cache.size - maxSize);
    let removed = 0;

    toRemove.forEach(({ key }) => {
      this.delete(key);
      removed++;
    });

    this.logger.log(`Cache optimized: removed ${removed} entries`);
    return removed;
  }
}

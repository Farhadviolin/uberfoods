/**
 * Request Optimization Utilities
 * For batching, deduplication, and caching API requests
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestOptimizer {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private batchQueue: Array<{ key: string; request: () => Promise<any> }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // ms
  private readonly DEFAULT_CACHE_TTL = 5000; // ms

  /**
   * Deduplicates concurrent requests
   */
  async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = this.DEFAULT_CACHE_TTL
  ): Promise<T> {
    // Check cache first
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise;
    }

    // Create new request
    const promise = requestFn().then((data) => {
      // Cache the result
      this.requestCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      // Remove from pending
      this.pendingRequests.delete(key);
      return data;
    }).catch((error) => {
      // Remove from pending on error
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Batches multiple requests
   */
  async batchRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        key,
        request: requestFn,
      });

      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }

      this.batchTimeout = setTimeout(async () => {
        const queue = [...this.batchQueue];
        this.batchQueue = [];

        try {
          const results = await Promise.all(queue.map((item) => item.request()));
          resolve(results[0] as T); // Return first result for simplicity
        } catch (error) {
          reject(error);
        }
      }, this.BATCH_DELAY);
    });
  }

  /**
   * Clears cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.requestCache.delete(key);
    } else {
      this.requestCache.clear();
    }
  }

  /**
   * Clears pending requests
   */
  clearPending(): void {
    this.pendingRequests.clear();
  }
}

// Singleton instance
export const requestOptimizer = new RequestOptimizer();


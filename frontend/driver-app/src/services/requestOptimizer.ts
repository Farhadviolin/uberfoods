import { logger } from '../utils/logger';
import { cacheService } from './cacheService';

export interface RequestOptions {
  cache?: boolean;
  cacheTTL?: number;
  debounce?: number;
  throttle?: number;
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
}

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data?: any;
  options: RequestOptions;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class RequestOptimizer {
  private static instance: RequestOptimizer;
  private pendingRequests = new Map<string, Promise<any>>();
  private requestQueue: QueuedRequest[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private throttleTimers = new Map<string, NodeJS.Timeout>();
  private isOnline = navigator.onLine;
  private batchQueue: Map<string, QueuedRequest[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;

  static getInstance(): RequestOptimizer {
    if (!RequestOptimizer.instance) {
      RequestOptimizer.instance = new RequestOptimizer();
    }
    return RequestOptimizer.instance;
  }

  constructor() {
    this.setupNetworkListeners();
    this.setupBatchProcessing();
  }

  // Main optimization method
  async optimizeRequest<T>(
    url: string,
    method: string = 'GET',
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const requestKey = this.generateRequestKey(url, method, data);

    // Check if request is already pending
    if (this.pendingRequests.has(requestKey)) {
      logger.debug(`Request deduplicated: ${requestKey}`);
      return this.pendingRequests.get(requestKey)!;
    }

    // Handle offline mode
    if (!this.isOnline && method !== 'GET') {
      return this.queueForOffline(requestKey, url, method, data, options);
    }

    // Apply optimizations
    const optimizedRequest = await this.applyOptimizations(requestKey, url, method, data, options);

    // Execute the request
    const request = this.executeRequest(optimizedRequest.url, optimizedRequest.method, optimizedRequest.data, optimizedRequest.options);

    // Cache the promise to prevent duplicate requests
    this.pendingRequests.set(requestKey, request);

    try {
      const result = await request;
      this.pendingRequests.delete(requestKey);
      return result;
    } catch (error) {
      this.pendingRequests.delete(requestKey);
      throw error;
    }
  }

  private async applyOptimizations(
    requestKey: string,
    url: string,
    method: string,
    data: any,
    options: RequestOptions
  ): Promise<{ url: string; method: string; data: any; options: RequestOptions }> {
    let optimizedUrl = url;
    let optimizedData = data;
    let optimizedOptions = { ...options };

    // Debouncing
    if (options.debounce && options.debounce > 0) {
      optimizedUrl = await this.applyDebounce(requestKey, url, method, data, options.debounce);
    }

    // Throttling
    if (options.throttle && options.throttle > 0) {
      optimizedUrl = await this.applyThrottle(requestKey, url, method, data, options.throttle);
    }

    // Caching for GET requests
    if (options.cache && method === 'GET') {
      const cacheKey = `api:${requestKey}`;
      const cached = cacheService.get(cacheKey);

      if (cached !== null) {
        logger.debug(`Cache hit for request: ${requestKey}`);
        return Promise.resolve({ url: optimizedUrl, method, data: optimizedData, options: optimizedOptions, cached: true });
      }

      // Add cache callback
      optimizedOptions.cacheKey = cacheKey;
      optimizedOptions.cacheTTL = options.cacheTTL;
    }

    // Request batching for similar requests
    if (this.shouldBatch(url, method)) {
      return this.addToBatch(requestKey, url, method, data, options);
    }

    return { url: optimizedUrl, method, data: optimizedData, options: optimizedOptions };
  }

  private async executeRequest(
    url: string,
    method: string,
    data: any,
    options: RequestOptions
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Use the existing API instance
      const response = await (window as any).api({
        url,
        method,
        data,
        ...options,
      });

      const duration = Date.now() - startTime;
      logger.debug(`Request completed: ${method} ${url} (${duration}ms)`);

      // Cache the response if caching is enabled
      if (options.cacheKey && method === 'GET') {
        cacheService.set(options.cacheKey, response.data, {
          ttl: options.cacheTTL,
          tags: options.tags,
          priority: options.priority
        });
      }

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.warn(`Request failed: ${method} ${url} (${duration}ms)`, error);

      // Handle retries
      if (options.retry?.enabled && this.shouldRetry(error, options.retry.maxAttempts)) {
        return this.retryRequest(url, method, data, options, error);
      }

      throw error;
    }
  }

  // Debouncing implementation
  private applyDebounce(
    requestKey: string,
    url: string,
    method: string,
    data: any,
    delay: number
  ): Promise<string> {
    return new Promise((resolve) => {
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(requestKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        this.debounceTimers.delete(requestKey);
        resolve(url);
      }, delay);

      this.debounceTimers.set(requestKey, timer);
    });
  }

  // Throttling implementation
  private applyThrottle(
    requestKey: string,
    url: string,
    method: string,
    data: any,
    delay: number
  ): Promise<string> {
    return new Promise((resolve) => {
      const existingTimer = this.throttleTimers.get(requestKey);

      if (!existingTimer) {
        // Execute immediately
        const timer = setTimeout(() => {
          this.throttleTimers.delete(requestKey);
        }, delay);

        this.throttleTimers.set(requestKey, timer);
        resolve(url);
      } else {
        // Wait for existing timer
        setTimeout(() => resolve(url), delay);
      }
    });
  }

  // Request batching
  private shouldBatch(url: string, method: string): boolean {
    // Batch similar requests (e.g., multiple location updates)
    return method === 'POST' && (
      url.includes('/location') ||
      url.includes('/status') ||
      url.includes('/orders/bulk')
    );
  }

  private addToBatch(
    requestKey: string,
    url: string,
    method: string,
    data: any,
    options: RequestOptions
  ): Promise<{ url: string; method: string; data: any; options: RequestOptions }> {
    return new Promise((resolve, reject) => {
      const batchKey = this.getBatchKey(url);

      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }

      this.batchQueue.get(batchKey)!.push({
        id: requestKey,
        url,
        method,
        data,
        options,
        timestamp: Date.now(),
        resolve,
        reject,
      });

      // Trigger batch processing
      this.scheduleBatchProcessing();
    });
  }

  private getBatchKey(url: string): string {
    // Group similar requests
    if (url.includes('/location')) return 'location_updates';
    if (url.includes('/status')) return 'status_updates';
    if (url.includes('/orders/bulk')) return 'order_updates';
    return url;
  }

  private scheduleBatchProcessing(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processBatches();
    }, 100); // Process batches every 100ms
  }

  private async processBatches(): Promise<void> {
    for (const [batchKey, requests] of this.batchQueue.entries()) {
      if (requests.length === 0) continue;

      try {
        // Process batch based on type
        await this.processBatch(batchKey, requests);
      } catch (error) {
        // Reject all requests in batch
        requests.forEach(req => req.reject(error));
      }
    }

    this.batchQueue.clear();
    this.batchTimer = null;
  }

  private async processBatch(batchKey: string, requests: QueuedRequest[]): Promise<void> {
    switch (batchKey) {
      case 'location_updates':
        await this.processLocationBatch(requests);
        break;
      case 'status_updates':
        await this.processStatusBatch(requests);
        break;
      default:
        // Process individually for other types
        await Promise.all(requests.map(req =>
          this.executeRequest(req.url, req.method, req.data, req.options)
            .then(result => req.resolve(result))
            .catch(error => req.reject(error))
        ));
    }
  }

  private async processLocationBatch(requests: QueuedRequest[]): Promise<void> {
    // Take the latest location update
    const latestRequest = requests.sort((a, b) => b.timestamp - a.timestamp)[0];

    const result = await this.executeRequest(
      latestRequest.url,
      latestRequest.method,
      latestRequest.data,
      latestRequest.options
    );

    // Resolve all requests with the same result
    requests.forEach(req => req.resolve(result));
  }

  private async processStatusBatch(requests: QueuedRequest[]): Promise<void> {
    // Take the latest status update
    const latestRequest = requests.sort((a, b) => b.timestamp - a.timestamp)[0];

    const result = await this.executeRequest(
      latestRequest.url,
      latestRequest.method,
      latestRequest.data,
      latestRequest.options
    );

    // Resolve all requests with the same result
    requests.forEach(req => req.resolve(result));
  }

  // Retry logic
  private shouldRetry(error: any, maxAttempts: number): boolean {
    const currentAttempt = error.config?.__retryCount || 0;
    return currentAttempt < maxAttempts && this.isRetryableError(error);
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, 5xx errors, and timeouts
    return !error.response ||
           error.response.status >= 500 ||
           error.response.status === 408 ||
           error.code === 'NETWORK_ERROR';
  }

  private async retryRequest(
    url: string,
    method: string,
    data: any,
    options: RequestOptions,
    originalError: any
  ): Promise<any> {
    const retryCount = originalError.config?.__retryCount || 0;
    const delay = options.retry?.delay || 1000;

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retryCount)));

    // Increment retry count
    const config = {
      ...originalError.config,
      __retryCount: retryCount + 1
    };

    return this.executeRequest(url, method, data, { ...options, ...config });
  }

  // Offline handling
  private queueForOffline(
    requestKey: string,
    url: string,
    method: string,
    data: any,
    options: RequestOptions
  ): Promise<any> {
    // Store in offline queue
    const offlineRequest = {
      id: requestKey,
      url,
      method,
      data,
      options,
      timestamp: Date.now(),
    };

    // Store in localStorage for persistence
    const offlineQueue = JSON.parse(localStorage.getItem('offline_requests') || '[]');
    offlineQueue.push(offlineRequest);
    localStorage.setItem('offline_requests', JSON.stringify(offlineQueue));

    logger.info(`Request queued for offline: ${requestKey}`);

    // Return a promise that will resolve when back online
    return new Promise((resolve, reject) => {
      // This promise will resolve when the request is synced
      // Implementation depends on your offline sync strategy
      reject(new Error('Offline mode - request will be synced when online'));
    });
  }

  // Network listeners
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
      logger.info('Network connection restored');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.warn('Network connection lost');
    });
  }

  private async processOfflineQueue(): Promise<void> {
    const offlineQueue = JSON.parse(localStorage.getItem('offline_requests') || '[]');

    if (offlineQueue.length === 0) return;

    logger.info(`Processing ${offlineQueue.length} offline requests`);

    for (const request of offlineQueue) {
      try {
        await this.optimizeRequest(
          request.url,
          request.method,
          request.data,
          request.options
        );
      } catch (error) {
        logger.warn(`Failed to sync offline request: ${request.id}`, error);
      }
    }

    localStorage.removeItem('offline_requests');
  }

  private setupBatchProcessing(): void {
    // Periodic batch processing
    setInterval(() => {
      if (this.batchQueue.size > 0) {
        this.processBatches();
      }
    }, 1000);
  }

  private generateRequestKey(url: string, method: string, data?: any): string {
    const dataHash = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${dataHash}`;
  }

  // Public API
  getStats(): any {
    return {
      pendingRequests: this.pendingRequests.size,
      queuedRequests: this.requestQueue.length,
      batchedRequests: Array.from(this.batchQueue.values()).flat().length,
      isOnline: this.isOnline,
      cacheStats: cacheService.getStats(),
    };
  }

  clearCache(): void {
    cacheService.clear();
  }

  flushQueue(): Promise<void> {
    return this.processBatches();
  }
}

// Singleton instance
export const requestOptimizer = RequestOptimizer.getInstance();

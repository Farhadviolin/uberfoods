/**
 * Query Optimizer Utilities
 * Provides pagination, limits, and query optimization for large datasets
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
  defaultLimit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class QueryOptimizer {
  /**
   * Normalize pagination parameters with safety limits
   */
  static normalizePagination(options: PaginationOptions = {}): {
    skip: number;
    take: number;
    page: number;
    limit: number;
  } {
    const { page = 1, limit, maxLimit = 100, defaultLimit = 20 } = options;

    // Ensure page is at least 1
    const normalizedPage = Math.max(1, Math.floor(page));

    // Normalize limit with safety bounds
    const normalizedLimit = limit
      ? Math.max(1, Math.min(Math.floor(limit), maxLimit))
      : defaultLimit;

    const skip = (normalizedPage - 1) * normalizedLimit;
    const take = normalizedLimit;

    return {
      skip,
      take,
      page: normalizedPage,
      limit: normalizedLimit,
    };
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Apply safe limit to queries (prevents excessive data fetching)
   */
  static applySafeLimit(
    requestedLimit?: number,
    maxLimit: number = 1000,
    defaultLimit: number = 100,
  ): number {
    if (!requestedLimit) {
      return defaultLimit;
    }

    return Math.max(1, Math.min(Math.floor(requestedLimit), maxLimit));
  }

  /**
   * Optimize date range queries (prevent queries that are too large)
   */
  static optimizeDateRange(
    startDate?: Date,
    endDate?: Date,
    maxDays: number = 365,
  ): { start: Date; end: Date } {
    const now = new Date();
    const defaultEnd = endDate || now;
    const defaultStart =
      startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Ensure end date is not in the future
    const end = defaultEnd > now ? now : defaultEnd;

    // Ensure range is not too large
    const maxStart = new Date(end.getTime() - maxDays * 24 * 60 * 60 * 1000);
    const start = defaultStart < maxStart ? maxStart : defaultStart;

    // Ensure start is before end
    if (start > end) {
      return {
        start: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000),
        end,
      };
    }

    return { start, end };
  }

  /**
   * Add cursor-based pagination support
   */
  static createCursorPagination<T>(
    data: T[],
    cursorField: keyof T,
    limit: number,
    cursor?: string,
  ): {
    data: T[];
    nextCursor?: string;
    hasMore: boolean;
  } {
    let filteredData = data;

    // Apply cursor if provided
    if (cursor) {
      const cursorIndex = data.findIndex(
        (item) => String(item[cursorField]) === cursor,
      );
      if (cursorIndex >= 0) {
        filteredData = data.slice(cursorIndex + 1);
      }
    }

    // Apply limit
    const limitedData = filteredData.slice(0, limit);
    const hasMore = filteredData.length > limit;
    const nextCursor = hasMore
      ? String(limitedData[limitedData.length - 1][cursorField])
      : undefined;

    return {
      data: limitedData,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Batch process large datasets
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 100,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Add query timeout protection
   */
  static withQueryTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 30000, // 30 seconds default
    errorMessage: string = "Query timeout",
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }
}

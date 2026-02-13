/**
 * Standard API Response Wrapper
 * Ensures consistent response format across all endpoints
 */
export class ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  path?: string;
  method?: string;

  constructor(data: T, message?: string, path?: string, method?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.path = path;
    this.method = method;
  }

  static success<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse(data, message);
  }

  static error(
    message: string,
    path?: string,
    method?: string,
  ): ApiResponse<null> {
    return {
      success: false,
      data: null,
      message,
      timestamp: new Date().toISOString(),
      path,
      method,
    };
  }
}

/**
 * Paginated API Response
 */
export class PaginatedApiResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  constructor(
    data: T[],
    meta: { total: number; page: number; limit: number; totalPages: number },
    message?: string,
  ) {
    super(data, message);
    this.meta = meta;
  }

  static create<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
  ): PaginatedApiResponse<T> {
    const totalPages = Math.ceil(total / limit);
    return new PaginatedApiResponse(
      data,
      { total, page, limit, totalPages },
      message,
    );
  }
}

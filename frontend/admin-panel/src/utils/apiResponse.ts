export interface StandardApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    path: string;
    method: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export function extractData<T>(response: unknown): T {
  if (
    response &&
    typeof response === "object" &&
    "success" in response &&
    "data" in response
  ) {
    return (response as StandardApiResponse<T>).data;
  }
  return response as T;
}

export function extractPagination(response: unknown) {
  if (
    response &&
    typeof response === "object" &&
    "pagination" in response
  ) {
    return (response as StandardApiResponse<unknown>).pagination || null;
  }
  return null;
}

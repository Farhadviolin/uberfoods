import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
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

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      map((data) => {
        // Preserve already-standardized responses
        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          "data" in data
        ) {
          return data as ApiResponse<T>;
        }

        // Handle paginated responses: { data, pagination }
        if (data && typeof data === "object" && "pagination" in data) {
          return {
            success: true,
            data: (data as any).data ?? data,
            pagination: (data as any).pagination,
            meta: {
              timestamp: new Date().toISOString(),
              path: url,
              method: method,
            },
          };
        }

        // Default standardized response
        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            path: url,
            method: method,
          },
        };
      }),
    );
  }
}

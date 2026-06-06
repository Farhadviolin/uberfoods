import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { SanitizeUtil } from "../utils/sanitize.util";

/**
 * Sanitization Interceptor
 * Automatically sanitizes request body and query parameters to prevent XSS attacks
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    this.sanitizeRequestProperty(request, "body");
    this.sanitizeRequestProperty(request, "query");
    this.sanitizeRequestProperty(request, "params");

    return next.handle().pipe(
      map((data) => {
        // Optionally sanitize response data (be careful with this)
        // return SanitizeUtil.sanitizeObject(data, false);
        return data;
      }),
    );
  }

  private sanitizeRequestProperty(
    request: Record<string, any>,
    property: "body" | "query" | "params",
  ): void {
    const value = request[property];

    if (!value || typeof value !== "object") {
      return;
    }

    const sanitized = SanitizeUtil.sanitizeObject(value, false);

    try {
      request[property] = sanitized;
    } catch {
      Object.defineProperty(request, property, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: sanitized,
      });
    }
  }
}

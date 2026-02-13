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

    // Sanitize request body
    if (request.body && typeof request.body === "object") {
      request.body = SanitizeUtil.sanitizeObject(request.body, false);
    }

    // Sanitize query parameters
    if (request.query && typeof request.query === "object") {
      request.query = SanitizeUtil.sanitizeObject(request.query, false);
    }

    // Sanitize route parameters
    if (request.params && typeof request.params === "object") {
      request.params = SanitizeUtil.sanitizeObject(request.params, false);
    }

    return next.handle().pipe(
      map((data) => {
        // Optionally sanitize response data (be careful with this)
        // return SanitizeUtil.sanitizeObject(data, false);
        return data;
      }),
    );
  }
}

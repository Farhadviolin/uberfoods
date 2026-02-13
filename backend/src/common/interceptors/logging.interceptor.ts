import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("Request");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, query, params, ip } = request;
    const user = (request as any).user;
    const requestId = (request as any).requestId;
    const now = Date.now();

    const logContext = {
      requestId,
      method,
      url,
      route: `${method} ${url}`,
      user: user ? { id: user.sub, role: user.role } : null,
      ip,
      body: this.sanitizeBody(body),
      query,
      params,
    };

    this.logger.debug(`Incoming request: ${method} ${url}`, logContext);

    return next.handle().pipe(
      tap({
        next: (_data) => {
          const duration = Date.now() - now;
          const statusCode = response.statusCode || 200;

          this.logger.log(`Request completed: ${method} ${url}`, {
            requestId,
            route: `${method} ${url}`,
            statusCode,
            durationMs: duration,
            userId: user?.sub,
            ip,
          });
        },
        error: (error) => {
          const duration = Date.now() - now;
          const statusCode = error.status || error.getStatus?.() || 500;

          this.logger.error(`Request failed: ${method} ${url}`, error.stack, {
            requestId,
            route: `${method} ${url}`,
            statusCode,
            durationMs: duration,
            userId: user?.sub,
            ip,
            error: error.message,
          });
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // Entferne sensible Daten
    if (sanitized.password) {
      sanitized.password = "***";
    }
    if (sanitized.currentPassword) {
      sanitized.currentPassword = "***";
    }
    if (sanitized.newPassword) {
      sanitized.newPassword = "***";
    }
    if (sanitized.token) {
      sanitized.token = "***";
    }

    return sanitized;
  }
}

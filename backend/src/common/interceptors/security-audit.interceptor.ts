import {
  Injectable,
  Logger,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditLedgerService } from "../audit/audit-ledger.service";

@Injectable()
export class SecurityAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityAuditInterceptor.name);

  constructor(private auditLedger: AuditLedgerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user || {};
    const now = new Date().toISOString();

    // Log security-relevant events
    const eventType = this.getEventType(request);
    if (eventType) {
      // Extract safe, non-sensitive context
      const auditContext = {
        method: request.method,
        path: request.path,
        userAgent: request.get("User-Agent")?.substring(0, 200) || "unknown", // Truncate for safety
        ip: request.ip || request.connection?.remoteAddress || "unknown",
        timestamp: now,
        userId: user.sub || user.id || "anonymous",
        userType: user.type || "unknown",
      };

      // Remove any potential PII from user agent
      if (auditContext.userAgent) {
        auditContext.userAgent = auditContext.userAgent.replace(
          /[^\w\s\-\.\(\)]/g,
          "",
        );
      }

      // Async audit logging (fire and forget)
      this.auditLedger
        .appendEntry(
          "system",
          "security-audit",
          eventType,
          "api",
          `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          auditContext,
        )
        .catch((error) => {
          this.logger.error("Failed to write security audit event:", error);
        });
    }

    return next.handle().pipe(
      tap((response) => {
        // Log authentication/authorization outcomes
        if (
          request.path.includes("/auth") ||
          response?.statusCode === 401 ||
          response?.statusCode === 403
        ) {
          const outcome = response?.statusCode === 200 ? "success" : "failure";
          this.logAuthEvent(request, outcome);
        }
      }),
    );
  }

  private getEventType(request: any): string | null {
    const path = request.path;
    const method = request.method;

    // Authentication events
    if (path.includes("/auth/login") && method === "POST") {
      return "auth.login_attempt";
    }

    // Authorization events
    if (
      method === "PATCH" &&
      path.includes("/orders/") &&
      path.includes("/status")
    ) {
      return "auth.order_status_change";
    }

    // Admin operations
    if (path.startsWith("/admin/") || path.startsWith("/internal/")) {
      return "auth.admin_operation";
    }

    // Rate limit events (would be triggered by rate limit middleware)
    // Export operations or data access
    if (path.includes("/export") || path.includes("/report")) {
      return "auth.data_export";
    }

    return null; // No audit event for this request
  }

  private async logAuthEvent(request: any, outcome: string) {
    try {
      const auditData = {
        method: request.method,
        path: request.path,
        outcome,
        timestamp: new Date().toISOString(),
        ip: request.ip || "unknown",
        userAgent: (request.get("User-Agent") || "unknown").substring(0, 200),
      };

      await this.auditLedger.appendEntry(
        "system",
        "auth-monitor",
        `auth.${outcome}`,
        "security",
        `auth-${Date.now()}`,
        auditData,
      );
    } catch (error) {
      this.logger.error("Failed to log auth event:", error);
    }
  }
}

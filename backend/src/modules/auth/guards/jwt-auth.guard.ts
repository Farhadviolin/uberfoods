import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";

interface UserPayload {
  id: string;
  email?: string;
  role?: string;
  status?: string;
  currentStatus?: string;
  isActive?: boolean;
  exp?: number;
  [key: string]: unknown;
}

interface RequestWithUser {
  user?: UserPayload;
  path?: string;
  url?: string;
  headers?: {
    authorization?: string;
    "user-agent"?: string;
    [key: string]: string | string[] | undefined;
  };
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  ip?: string;
  connection?: {
    remoteAddress?: string;
  };
  socket?: {
    remoteAddress?: string;
  };
  [key: string]: unknown;
}

interface AuthError {
  message?: string;
  [key: string]: unknown;
}

interface AuthInfo {
  message?: string;
  [key: string]: unknown;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Verwende request.path (ohne Query-Parameter) oder request.url
    const requestPath = request.path || request.url.split("?")[0];

    // Allow access to certain endpoints without authentication
    const allowUnauthenticated = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/driver/login",
      "/api/auth/restaurant/login",
      "/api/auth/customer/login",
      "/api/auth/customer/register",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
      "/api/auth/refresh",
      "/api/restaurants/public",
      "/api/health",
      "/api/payments/webhooks",
      "/api/legal",
      // ✅ Öffentliche Gamification-Endpunkte
      "/api/gamification/achievements",
      "/api/gamification/leaderboard",
      // ✅ Öffentliche Analytics-Endpunkte
      "/api/analytics/weather",
      // ✅ Öffentliche Promotions-Endpunkte (alle Unterpfade)
      "/api/promotions/public",
      // ✅ Push Notification Public Key - öffentlich (VAPID Public Key)
      "/api/drivers/push/public-key",
      "/api/drivers/subscription/tiers",
    ];

    // ✅ Development mode: Skip authentication for development
    // Akzeptiere ALLE Requests in Development (auch ohne Token oder mit invaliden Tokens)
    const allowDevAuth = this.configService.get("ALLOW_DEV_AUTH") === "true";
    const nodeEnv = this.configService.get("NODE_ENV") || "development";
    const devToken = request.headers.authorization?.replace("Bearer ", "");

    // Driver endpoints require authentication
    const isDriverEndpoint = requestPath.startsWith("/api/drivers/");
    console.log(
      `JWT Guard: path=${requestPath}, isDriver=${isDriverEndpoint}, nodeEnv=${nodeEnv}, allowDevAuth=${allowDevAuth}`,
    );

    // Prüfe ob der Request-Pfad mit einem erlaubten Pfad beginnt
    const isAllowed = allowUnauthenticated.some((path) =>
      requestPath.startsWith(path),
    );

    if (isAllowed) {
      this.logger.debug(`🔓 Allowing unauthenticated access to ${requestPath}`);
      return true;
    }

    // In Development: Only bypass for non-driver endpoints. Never bypass in E2E.
    const isE2E = nodeEnv === "e2e";
    const isAdminEndpoint = requestPath.startsWith("/api/admin");
    if (
      !isE2E &&
      (allowDevAuth || nodeEnv !== "production") &&
      !devToken &&
      !isDriverEndpoint &&
      !isAdminEndpoint
    ) {
      this.logger.debug(
        `🔓 Dev Mode: Bypassing authentication for ${request.url}`,
      );
      request.user = {
        id: "dev-admin-123",
        email: "admin@UberFoods.com",
        role: "admin",
        status: "ACTIVE",
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      };
      return true; // ✅ Return hier, überspringe alle nachfolgenden Checks
    }

    // Nur in Production: Rate Limiting und Suspicious Activity Checks
    this.checkRateLimit(request);
    this.checkSuspiciousActivity(request);

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    // ✅ Development mode: Falls JWT-Validierung fehlschlägt, trotzdem Admin-User zurückgeben
    const allowDevAuth = this.configService.get("ALLOW_DEV_AUTH") === "true";
    const nodeEnv = this.configService.get("NODE_ENV") || "development";

    if (err || !user) {
      // In Development: Akzeptiere auch fehlgeschlagene Authentifizierung (aber nicht für Driver-Endpunkte)
      const request = context.switchToHttp().getRequest();
      const requestPath = request.path || request.url.split("?")[0];
      const isDriverEndpoint = requestPath.startsWith("/api/drivers/");
      const isAuthEndpoint = requestPath.startsWith("/api/auth/");

      const isE2EBypass = nodeEnv === "e2e";
      if (
        !isE2EBypass &&
        (allowDevAuth || nodeEnv !== "production") &&
        !isDriverEndpoint &&
        !requestPath.startsWith("/api/admin")
      ) {
        this.logger.debug(
          `🔓 Dev Mode: JWT validation failed, but allowing as admin: ${err?.message || info?.message || "Unknown error"}`,
        );
        return {
          id: "dev-admin-123",
          email: "admin@UberFoods.com",
          role: "admin",
          status: "ACTIVE",
          exp: Math.floor(Date.now() / 1000) + 86400,
        } as TUser;
      }
      // Production: Strikt ablehnen
      this.logger.warn(
        `Authentication failed: ${err?.message || info?.message || "Unknown error"}`,
      );
      throw (
        err ||
        new UnauthorizedException("Invalid or missing authentication token")
      );
    }

    // Additional user validation
    if (!user.id || !user.role) {
      throw new UnauthorizedException("Invalid user data in token");
    }

    // Check if user is active (skip in dev mode, or for drivers in E2E testing)
    const userStatus =
      user.currentStatus || user.status || (user.isActive === true ? "ACTIVE" : undefined);
    const skipStatusCheck =
      allowDevAuth || (nodeEnv !== "production" && user.role === "driver");
    if (
      !skipStatusCheck &&
      userStatus !== "ACTIVE" &&
      userStatus !== "AVAILABLE"
    ) {
      throw new ForbiddenException("Account is not active");
    }

    // Check token expiration
    if (user.exp && user.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Token has expired");
    }

    // Log successful authentication for monitoring
    this.logger.debug(`User ${user.id} authenticated successfully`);

    return user as TUser;
  }

  private checkRateLimit(request: RequestWithUser) {
    const clientIP = this.getClientIP(request);
    const endpoint = request.url;

    // Simple in-memory rate limiting (for production, use Redis)
    const key = `${clientIP}:${endpoint}`;
    const now = Date.now();

    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }

    const store = global.rateLimitStore as Map<
      string,
      { count: number; resetTime: number }
    >;

    if (!store.has(key)) {
      store.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
    } else {
      const data = store.get(key)!;
      if (now > data.resetTime) {
        data.count = 1;
        data.resetTime = now + 60000;
      } else {
        data.count++;
        if (data.count > 100) {
          // 100 requests per minute
          this.logger.warn(
            `Rate limit exceeded for IP ${clientIP} on ${endpoint}`,
          );
          throw new ForbiddenException("Too many requests");
        }
      }
      store.set(key, data);
    }
  }

  private checkSuspiciousActivity(request: RequestWithUser) {
    const userAgent = request.headers["user-agent"] || "";
    const clientIP = this.getClientIP(request);

    // Check for common attack patterns
    const suspiciousPatterns = [
      /\b(sql|union|select|insert|delete|update|drop|create|alter)\b/i,
      /\b(script|javascript|vbscript|onload|onerror)\b/i,
      /<.*script.*>/i,
      /\.\./, // Directory traversal
    ];

    const requestData =
      JSON.stringify(request.body || {}) + JSON.stringify(request.query || {});

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData) || pattern.test(userAgent)) {
        this.logger.warn(
          `Suspicious activity detected from IP ${clientIP}: ${request.url}`,
        );
        throw new ForbiddenException("Suspicious activity detected");
      }
    }
  }

  private getClientIP(request: RequestWithUser): string {
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      (request as any).socket?.remoteAddress ||
      (request as any).connection?.socket?.remoteAddress ||
      "unknown"
    );
  }
}

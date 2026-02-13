import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { SecurityService } from "../../modules/security/security.service";

@Injectable()
export class IPWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IPWhitelistGuard.name);
  private readonly enabled: boolean;

  constructor(
    private configService: ConfigService,
    private securityService: SecurityService,
  ) {
    // IP Whitelisting kann über Environment Variable aktiviert werden
    this.enabled =
      this.configService.get<string>("IP_WHITELIST_ENABLED") === "true";
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Wenn IP Whitelisting deaktiviert ist, erlaube alle Requests
    if (!this.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIP(request);
    const user = (request as any).user;

    // Prüfe IP Whitelist
    const isWhitelisted = await this.securityService.isIPWhitelisted(ip);

    if (!isWhitelisted) {
      this.logger.warn(
        `IP ${ip} is not whitelisted for user ${user?.id || "anonymous"}`,
      );
      throw new ForbiddenException(
        "Your IP address is not authorized to access this resource",
      );
    }

    return true;
  }

  /**
   * Extrahiert die echte Client-IP aus dem Request
   * Berücksichtigt Proxies und Load Balancer
   */
  private getClientIP(request: Request): string {
    // Prüfe X-Forwarded-For Header (für Proxies/Load Balancer)
    const forwardedFor = request.headers["x-forwarded-for"];
    if (forwardedFor) {
      // X-Forwarded-For kann mehrere IPs enthalten (komma-separiert)
      // Die erste IP ist die ursprüngliche Client-IP
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(",")[0].trim();
    }

    // Prüfe X-Real-IP Header
    const realIP = request.headers["x-real-ip"];
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    // Fallback zu request.ip oder request.connection.remoteAddress
    return request.ip || request.socket?.remoteAddress || "unknown";
  }
}

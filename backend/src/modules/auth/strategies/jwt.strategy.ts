import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";

interface JWTPayload {
  sub?: string;
  role?: string;
  email?: string;
  type?: string;
  [key: string]: unknown;
}

function getRequiredJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>("JWT_SECRET");
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but not set");
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredJwtSecret(configService),
    });
  }

  async validate(payload: JWTPayload) {
    const { sub: userId, role, email, type } = payload;
    const nodeEnv = this.configService.get("NODE_ENV") || "development";
    const allowDevAuth = this.configService.get("ALLOW_DEV_AUTH") === "true";

    const typeUpper = type?.toUpperCase();
    const roleUpper = role?.toUpperCase();

    // ADMIN: immer DB-Validierung, kein Dev-Fallback
    if (typeUpper === "ADMIN" || roleUpper === "ADMIN" || roleUpper === "SUPER_ADMIN") {
      if (!userId) {
        throw new UnauthorizedException("Invalid admin token (missing sub)");
      }
      const admin = await this.prisma.admin.findUnique({ where: { id: userId } });
      if (!admin) {
        throw new UnauthorizedException("Admin not found");
      }
      return {
        ...admin,
        id: admin.id,
        sub: admin.id,
        email: admin.email ?? email,
        role: roleUpper || String(admin.role).toUpperCase(),
        type: "ADMIN",
      };
    }

    // Andere Rollen: bisherige Logik beibehalten, inkl. Dev-Fallback
    const requireDbValidation =
      nodeEnv === "production" || !allowDevAuth || role === "driver";
    if (requireDbValidation) {
      let user;
      try {
        if (role === "restaurant") {
          user = await this.prisma.restaurant.findUnique({
            where: { id: userId },
          });
        } else if (role === "driver") {
          user = await this.prisma.driver.findUnique({ where: { id: userId } });
        } else {
          user = await this.prisma.customer.findUnique({
            where: { id: userId },
          });
        }

        if (!user) {
          throw new UnauthorizedException("User not found");
        }

        return {
          ...user,
          id: user.id,
          sub: user.id,
          email: user.email ?? email,
          role,
          type: type ?? "CUSTOMER",
          currentStatus:
            role === "restaurant"
              ? "ACTIVE"
              : (user as { currentStatus?: string }).currentStatus,
        };
      } catch (error) {
        this.logger.warn(
          `JWT validation failed for user ${userId}:`,
          (error as Error).message,
        );
        throw new UnauthorizedException("Invalid token");
      }
    }

    // Development mode: Skip DB nur für Nicht-Admin-Rollen
    return {
      id: userId || "dev-user-123",
      sub: userId || "dev-user-123",
      email,
      role: role || "customer",
      type: type || "CUSTOMER",
      status: "ACTIVE",
      isActive: true,
    };
  }
}

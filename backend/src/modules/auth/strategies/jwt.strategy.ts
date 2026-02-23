import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";

interface JWTPayload {
  sub?: string;
  role?: string;
  [key: string]: unknown;
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
      secretOrKey:
        configService.get<string>("JWT_SECRET") || "fallback-secret-key",
    });
  }

  async validate(payload: JWTPayload) {
    const { sub: userId, role } = payload;

    // ✅ Development mode: Überspringe DB-Abfrage und gib Admin-User zurück
    const allowDevAuth = this.configService.get("ALLOW_DEV_AUTH") === "true";
    const nodeEnv = this.configService.get("NODE_ENV") || "development";

    // In production or for driver role: Always validate JWT via DB
    const requireDbValidation =
      nodeEnv === "production" || !allowDevAuth || role === "driver";
    if (requireDbValidation) {
      // Production mode: Always require valid JWT
      let user;
      try {
        if (role === "admin") {
          user = await this.prisma.admin.findUnique({ where: { id: userId } });
        } else if (role === "restaurant") {
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

        return { ...user, role };
      } catch (error) {
        this.logger.warn(
          `JWT validation failed for user ${userId}:`,
          (error as Error).message,
        );
        throw new UnauthorizedException("Invalid token");
      }
    }

    // Development mode: Skip DB for non-driver roles
    return {
      id: userId || "dev-admin-123",
      email: "admin@uberfoods.com",
      role: role || "admin",
      status: "ACTIVE",
      isActive: true,
    };
  }
}

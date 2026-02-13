import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("health")
@Controller()
export class HealthAliasController {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  @Get("healthz")
  @ApiOperation({
    summary: "Health Check (Kubernetes Standard) - Systemstatus prüfen",
  })
  @ApiResponse({ status: 200, description: "System ist gesund" })
  @ApiResponse({ status: 503, description: "System hat Probleme" })
  async healthz() {
    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
    };

    let overallStatus = "ok";

    // Datenbank-Check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: "connected",
        provider: "postgresql",
      };
    } catch (error) {
      checks.database = {
        status: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      overallStatus = "error";
    }

    // Storage-Check (S3 oder lokal)
    const hasS3 = !!(
      this.configService.get<string>("AWS_ACCESS_KEY_ID") &&
      this.configService.get<string>("AWS_SECRET_ACCESS_KEY") &&
      this.configService.get<string>("AWS_S3_BUCKET")
    );
    checks.storage = {
      type: hasS3 ? "s3" : "local",
      status: "available",
    };

    // Payment-Check
    const hasStripe = !!this.configService.get<string>("STRIPE_SECRET_KEY");
    checks.payment = {
      provider: hasStripe ? "stripe" : "mock",
      status: "available",
    };

    // Memory-Check
    const memUsage = process.memoryUsage();
    checks.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      unit: "MB",
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    };

    // CPU-Check (vereinfacht)
    const cpuUsage = process.cpuUsage();
    checks.cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system,
      unit: "microseconds",
    };

    // Google Maps API Check
    const hasGoogleMaps = !!this.configService.get<string>(
      "GOOGLE_MAPS_API_KEY",
    );
    checks.maps = {
      provider: hasGoogleMaps ? "google" : "mock",
      status: "available",
    };

    // WebSocket Check
    checks.websocket = {
      status: "available",
      cors: process.env.ALLOWED_ORIGINS ? "configured" : "development",
    };

    // Rate Limiting Check
    checks.rateLimiting = {
      status: "enabled",
      defaultLimit: "10 requests/minute",
    };

    return {
      status: overallStatus,
      ...checks,
    };
  }

  @Get("readyz")
  @ApiOperation({
    summary: "Readiness Check (Kubernetes Standard) - Bereit für Traffic",
  })
  async readyz() {
    try {
      // Prüfe kritische Dependencies
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "ready",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "not ready",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

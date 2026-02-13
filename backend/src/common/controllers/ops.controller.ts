import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RegionConfig, RegionUtils } from "../config/region.config";

@Controller("ops")
export class OpsController {
  constructor(private configService: ConfigService) {}

  /**
   * Operational information endpoint
   * Provides region, role, and health information for operations teams
   * No sensitive data exposed
   */
  @Get("info")
  getOperationalInfo() {
    const regionConfig = this.configService.get<RegionConfig>("region");

    return {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      uptime: Math.floor(process.uptime()),
      region: RegionUtils.getRegionInfo(regionConfig),
      features: {
        writeGuardEnabled: regionConfig.writeGuardEnabled,
        readReplicaEnabled: !!process.env.DATABASE_URL_READ,
        multiRegionEventing: process.env.FEATURE_DUAL_PUBLISH === "true",
      },
      limits: {
        maxMemoryMB: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024),
        pid: process.pid,
      },
    };
  }
}

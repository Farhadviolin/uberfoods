import { registerAs } from "@nestjs/config";

export interface RegionConfig {
  region: string;
  role: "primary" | "secondary" | "canary";
  datacenter: string;
  environment: string;
  writeGuardEnabled: boolean;
}

export default registerAs("region", () => ({
  region: process.env.REGION || "local",
  role: (process.env.ROLE || "primary") as "primary" | "secondary" | "canary",
  datacenter: process.env.DATACENTER || "local-dc",
  environment: process.env.NODE_ENV || "development",
  writeGuardEnabled: process.env.FEATURE_WRITE_GUARD === "true",
}));

// Region utilities
export class RegionUtils {
  static isPrimary(config: RegionConfig): boolean {
    return config.role === "primary";
  }

  static isSecondary(config: RegionConfig): boolean {
    return config.role === "secondary";
  }

  static isCanary(config: RegionConfig): boolean {
    return config.role === "canary";
  }

  static canAcceptWrites(config: RegionConfig): boolean {
    // Primary can always accept writes
    if (this.isPrimary(config)) return true;

    // Secondary can accept writes only if write guard is disabled
    if (this.isSecondary(config)) return !config.writeGuardEnabled;

    // Canary deployments never accept writes in production
    return config.environment !== "production";
  }

  static getRegionInfo(config: RegionConfig) {
    return {
      region: config.region,
      role: config.role,
      datacenter: config.datacenter,
      environment: config.environment,
      canAcceptWrites: this.canAcceptWrites(config),
    };
  }
}

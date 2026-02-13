import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerOptions } from "@nestjs/throttler";
import { Request } from "express";

@Injectable()
export class DriverRateLimitGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // Rate Limiting basierend auf Driver ID oder IP
    const driverId = req.user?.driverId || req.user?.sub;
    return Promise.resolve(driverId || req.ip || "unknown");
  }

  protected async getLimit(
    context: ExecutionContext,
  ): Promise<ThrottlerOptions> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Unterschiedliche Limits basierend auf Driver Status
    if (user?.role === "driver") {
      // Premium Drivers haben höhere Limits
      if (
        user?.subscriptionTier === "ENTERPRISE" ||
        user?.subscriptionTier === "FULLTIME"
      ) {
        return {
          ttl: 60000, // 1 Minute
          limit: 200, // 200 Requests pro Minute für Premium Drivers
        };
      }
      return {
        ttl: 60000,
        limit: 100, // 100 Requests pro Minute für Standard Drivers
      };
    }

    // Default Limit
    return {
      ttl: 60000,
      limit: 10,
    };
  }
}

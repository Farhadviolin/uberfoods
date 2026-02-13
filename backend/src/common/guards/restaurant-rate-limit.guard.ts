import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerOptions } from "@nestjs/throttler";
import { Request } from "express";

@Injectable()
export class RestaurantRateLimitGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // Rate Limiting basierend auf Restaurant ID oder IP
    const restaurantId = req.user?.restaurantId || req.user?.sub;
    return Promise.resolve(restaurantId || req.ip || "unknown");
  }

  protected async getLimit(
    context: ExecutionContext,
  ): Promise<ThrottlerOptions> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Unterschiedliche Limits basierend auf Rolle
    if (user?.role === "restaurant") {
      return {
        ttl: 60000, // 1 Minute
        limit: 100, // 100 Requests pro Minute für Restaurants
      };
    }

    // Default Limit
    return {
      ttl: 60000,
      limit: 10,
    };
  }
}

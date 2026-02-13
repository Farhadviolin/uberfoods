import { Injectable, Logger } from "@nestjs/common";

export interface TenantContext {
  tenantId?: string;
  restaurantId?: string;
  userId?: string;
  region: string;
  role: string;
}

@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  /**
   * Resolve tenant context from request
   * This is a foundation for future sharding/multi-tenancy
   */
  resolveTenantContext(request: any): TenantContext {
    const user = request.user || {};
    const params = request.params || {};
    const query = request.query || {};

    // Extract tenant identifiers (restaurantId is primary shard key)
    const restaurantId =
      params.restaurantId || query.restaurantId || user.restaurantId;
    const userId = user.sub || user.id || params.userId;
    const tenantId = user.tenantId || query.tenantId; // Future: global tenant identifier

    return {
      tenantId,
      restaurantId,
      userId,
      region: process.env.REGION || "local",
      role: process.env.ROLE || "primary",
    };
  }

  /**
   * Validate if operation requires tenant filtering
   * Feature flag controlled for gradual rollout
   */
  requiresTenantFilter(operation: string, context: TenantContext): boolean {
    const featureEnabled = process.env.FEATURE_REQUIRE_TENANT_FILTER === "true";

    if (!featureEnabled) {
      return false; // Guard disabled, allow all operations
    }

    // Operations that require tenant context
    const tenantRequiredOps = [
      "orders.list", // Must filter by restaurant
      "dashboard.aggregations", // Must scope to tenant
      "analytics.reports", // Must be tenant-scoped
    ];

    if (tenantRequiredOps.includes(operation)) {
      // For restaurant-scoped operations, restaurantId is required
      if (
        operation.startsWith("orders.") ||
        operation.startsWith("dashboard.")
      ) {
        return !context.restaurantId;
      }
    }

    return false;
  }

  /**
   * Apply tenant filtering to Prisma where conditions
   */
  applyTenantFilter(
    where: any,
    context: TenantContext,
    operation: string,
  ): any {
    if (!this.requiresTenantFilter(operation, context)) {
      return where; // No filtering required
    }

    const filteredWhere = { ...where };

    // Apply restaurant-based filtering for orders
    if (context.restaurantId && operation.startsWith("orders.")) {
      filteredWhere.restaurantId = context.restaurantId;
    }

    // Apply tenant-based filtering for multi-tenant operations
    if (context.tenantId && operation.includes("analytics.")) {
      filteredWhere.tenantId = context.tenantId;
    }

    this.logger.debug(`Applied tenant filter for ${operation}:`, {
      tenantId: context.tenantId,
      restaurantId: context.restaurantId,
      operation,
    });

    return filteredWhere;
  }

  /**
   * Validate tenant access permissions
   */
  validateTenantAccess(
    context: TenantContext,
    requiredPermissions: string[] = [],
  ): boolean {
    // Basic validation - can be extended with RBAC
    if (!context.userId) {
      return false; // Must be authenticated
    }

    // Restaurant staff can only access their restaurant's data
    if (
      context.restaurantId &&
      requiredPermissions.includes("restaurant.access")
    ) {
      // In a real implementation, check user's restaurant association
      return true; // Placeholder - assume valid for now
    }

    // Admin users can access all tenants
    if (requiredPermissions.includes("admin.access")) {
      // Check if user has admin role
      return true; // Placeholder
    }

    return true; // Default allow
  }
}

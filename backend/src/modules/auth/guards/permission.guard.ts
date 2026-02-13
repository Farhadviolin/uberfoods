import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../../../common/decorators/require-permission.decorator";
import { RbacService } from "../../rbac/rbac.service";

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // No permissions required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn("PermissionGuard: No user found in request");
      throw new ForbiddenException("User not authenticated");
    }

    // Super Admin has all permissions
    const userRole = user.role?.toUpperCase();
    if (userRole === "SUPER_ADMIN") {
      return true;
    }

    try {
      // Get user's permissions from RBACService
      const userPermissions = await this.rbacService.getUserPermissions(
        user.id,
        userRole,
      );

      // Check if user has all required permissions
      // Permissions are stored as "resource:action" strings
      const hasAllPermissions = requiredPermissions.every((permission) => {
        // Check exact match
        if (userPermissions.includes(permission)) {
          return true;
        }

        // Check wildcard permissions (e.g., "order:*" matches "order:read")
        const [resource, action] = permission.split(":");
        if (resource && action) {
          const wildcardPermission = `${resource}:*`;
          return userPermissions.includes(wildcardPermission);
        }

        return false;
      });

      if (!hasAllPermissions) {
        // Log permission denial for monitoring
        this.logger.warn(
          `PermissionGuard: User ${user.id} (${userRole}) does not have required permissions: ${requiredPermissions.join(", ")}. Has: ${userPermissions.join(", ")}`,
        );

        // Increment denial counter in RBACService
        this.rbacService.incrementPermissionDenial(
          user.id,
          requiredPermissions.join(","),
        );

        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(", ")}`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error("PermissionGuard: Error checking permissions", error);
      throw new ForbiddenException("Error checking permissions");
    }
  }
}

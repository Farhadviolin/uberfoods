import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../../../common/decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      // No roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn("RolesGuard: No user found in request");
      throw new ForbiddenException("User not authenticated");
    }

    const userRole = user.role?.toUpperCase();

    // SUPER_ADMIN has access to all roles
    if (userRole === "SUPER_ADMIN") {
      return true;
    }

    // Check if user has one of the required roles
    const hasRole = requiredRoles.some((role) => {
      const normalizedRole = role.toUpperCase();
      return userRole === normalizedRole;
    });

    if (!hasRole) {
      this.logger.warn(
        `RolesGuard: User ${user.id} with role ${userRole} does not have required roles: ${requiredRoles.join(", ")}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}

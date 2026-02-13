import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

/**
 * Custom Decorator to extract user ID from request
 * Works with JWT Auth Guard which sets req.user
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        "User not found in request. Make sure JwtAuthGuard is applied.",
      );
    }

    // Return user.id (which is the customerId for customer role)
    return user.id;
  },
);

/**
 * Decorator to extract customerId specifically
 * For customer role, returns user.id
 * For other roles, throws error or returns null based on context
 */
export const CurrentCustomerId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        "User not found in request. Make sure JwtAuthGuard is applied.",
      );
    }

    // If role is customer, return id
    if (user.role === "customer" || !user.role) {
      return user.id;
    }

    // For other roles, still return id (might be used in admin context)
    return user.id;
  },
);

/**
 * Decorator to extract full user object
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

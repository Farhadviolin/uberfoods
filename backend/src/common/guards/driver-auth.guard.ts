import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";

@Injectable()
export class DriverAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization token");
    }

    // For now, just check if token contains "driver" (simplified check)
    const token = authHeader.replace("Bearer ", "");
    if (!token.includes("driver")) {
      throw new ForbiddenException(
        "Insufficient permissions. Driver role required",
      );
    }

    // Set mock user for testing
    request.user = {
      id: "test-driver-123",
      role: "driver",
      email: "driver@test.com",
    };

    return true;
  }
}

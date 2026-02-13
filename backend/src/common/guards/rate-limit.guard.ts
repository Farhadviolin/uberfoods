import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";

interface RateLimitOptions {
  ttl: number; // Time window in seconds
  limit: number; // Max requests per window
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get rate limit options from decorator or use defaults
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      "rateLimit",
      handler,
    ) ||
      this.reflector.get<RateLimitOptions>("rateLimit", controller) || {
        ttl: 60,
        limit: 100,
      }; // Default: 100 requests per minute

    const key = this.getKey(request);
    const now = Date.now();

    // Get or create rate limit entry
    let rateLimit = this.requestCounts.get(key);

    if (!rateLimit || now > rateLimit.resetTime) {
      // Reset window
      rateLimit = {
        count: 1,
        resetTime: now + rateLimitOptions.ttl * 1000,
      };
      this.requestCounts.set(key, rateLimit);
      return true;
    }

    // Increment count
    rateLimit.count++;

    if (rateLimit.count > rateLimitOptions.limit) {
      const retryAfter = Math.ceil((rateLimit.resetTime - now) / 1000);
      throw new HttpException(
        {
          message: "Too many requests",
          retryAfter,
          limit: rateLimitOptions.limit,
          remaining: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.requestCounts.set(key, rateLimit);
    return true;
  }

  private getKey(request: any): string {
    // Use IP address or user ID
    const ip = request.ip || request.connection.remoteAddress;
    const userId = request.user?.id;

    if (userId) {
      return `user:${userId}`;
    }

    return `ip:${ip}`;
  }
}

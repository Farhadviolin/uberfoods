import { SetMetadata } from "@nestjs/common";

export interface RateLimitOptions {
  ttl: number; // Time window in seconds
  limit: number; // Max requests per window
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata("rateLimit", options);

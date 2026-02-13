import { SetMetadata } from "@nestjs/common";

export const IDEMPOTENT_KEY = "idempotent_operation";

export interface IdempotentOptions {
  ttlSeconds?: number; // How long to store the response (default: 24 hours)
  headerName?: string; // Header name for idempotency key (default: 'Idempotency-Key')
}

export const Idempotent = (options: IdempotentOptions = {}) => {
  return SetMetadata(IDEMPOTENT_KEY, {
    ttlSeconds: options.ttlSeconds || 86400, // 24 hours
    headerName: options.headerName || "Idempotency-Key",
  });
};

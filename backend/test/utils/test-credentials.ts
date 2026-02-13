import { randomUUID } from "crypto";

type RoleKey =
  | "CUSTOMER_LOGIN"
  | "CUSTOMER2"
  | "RESTAURANT_LOGIN"
  | "DRIVER_LOGIN"
  | "ADMIN"
  | "MFA_CUSTOMER"
  | "GENERIC";

const EMAIL_FALLBACK_DOMAIN = "example.test";

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getTestEmail(role: RoleKey = "GENERIC"): string {
  const envKey = `TEST_${role}_EMAIL`;
  const fromEnv = process.env[envKey];
  if (fromEnv) return fromEnv;

  const roleLabel = role.toLowerCase().replace(/_login/, "");
  return `${roleLabel}-${randomSuffix()}@${EMAIL_FALLBACK_DOMAIN}`;
}

export function getTestPassword(role?: RoleKey): string {
  const envRoleKey = role ? `TEST_${role}_PASSWORD` : undefined;
  const fromEnvRole = envRoleKey ? process.env[envRoleKey] : undefined;
  const fromEnvGeneric = process.env.TEST_PASSWORD;
  const base = fromEnvRole || fromEnvGeneric;
  if (base) return base;
  return `Pw-${role ?? "user"}-${randomSuffix()}!`;
}

export function getTestToken(envKey: string, label = "token"): string {
  const fromEnv = process.env[envKey];
  if (fromEnv) return fromEnv;
  return `${label}-${randomUUID()}`;
}

export function getExpiredTestToken(): string {
  return getTestToken("TEST_EXPIRED_TOKEN", "expired");
}

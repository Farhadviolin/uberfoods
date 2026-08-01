import * as dotenv from "dotenv";
import { resolve } from "path";

process.env.NODE_ENV = "e2e";
jest.setTimeout(30000);

// Load .env.e2e for test credentials (TEST_ADMIN_EMAIL, etc.)
const candidates = [
  resolve(process.cwd(), ".env.e2e"),
  resolve(process.cwd(), "..", ".env.e2e"),
  resolve(process.cwd(), "..", "backend", ".env.e2e"),
];
for (const p of candidates) {
  const r = dotenv.config({ path: p, override: true });
  if (!r.error) break;
}

// Keep seeded-account E2E suites deterministic when no local .env.e2e exists.
// These defaults only affect the test process; callers can still override them.
process.env.TEST_ADMIN_EMAIL ??= "admin@uberfoods.com";
process.env.TEST_ADMIN_PASSWORD ??= "admin123";
process.env.TEST_CUSTOMER_LOGIN_EMAIL ??= "customer@uberfoods.local";
process.env.TEST_CUSTOMER_LOGIN_PASSWORD ??= "customer123";
process.env.TEST_RESTAURANT_LOGIN_EMAIL ??= "restaurant@uberfoods.local";
process.env.TEST_RESTAURANT_LOGIN_PASSWORD ??= "restaurant123";
process.env.TEST_DRIVER_LOGIN_EMAIL ??= "driver@uberfoods.local";
process.env.TEST_DRIVER_LOGIN_PASSWORD ??= "driver123";

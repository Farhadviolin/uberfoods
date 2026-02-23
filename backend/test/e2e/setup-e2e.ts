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

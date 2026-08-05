import * as dotenv from "dotenv";
import { resolve } from "path";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { resolveExplicitE2EDatabaseUrl } from "../../src/common/config/e2e-database-url";

// Load E2E env
const candidates = [
  resolve(process.cwd(), ".env.e2e"),
  resolve(process.cwd(), "..", ".env.e2e"),
  resolve(process.cwd(), "..", "backend", ".env.e2e"),
];

let loaded = false;
for (const p of candidates) {
  const r = dotenv.config({ path: p, override: true });
  if (!r.error) {
    loaded = true;
    console.log("[E2E global-setup] Loaded .env.e2e from:", p);
    break;
  }
}

if (!loaded) {
  console.warn(
    "[E2E global-setup] No .env.e2e found - DATABASE_URL may be missing",
  );
}

const explicitDatabaseUrl = resolveExplicitE2EDatabaseUrl(process.env);
process.env.DATABASE_URL = explicitDatabaseUrl;

process.env.NODE_ENV = "e2e";

export default async function globalSetup(): Promise<void> {
  const e2eEnv = {
    ...process.env,
    DATABASE_URL: explicitDatabaseUrl,
    E2E_DATABASE_URL: explicitDatabaseUrl,
  };

  // Deploy migrations and seed (run from backend dir)
  const backendDir = process.cwd().includes("backend")
    ? process.cwd()
    : resolve(process.cwd(), "backend");
  execSync("npx prisma migrate deploy --schema=./prisma/schema.prisma", {
    cwd: backendDir,
    stdio: "inherit",
    env: e2eEnv,
  });

  execSync("npx prisma db seed --schema=./prisma/schema.prisma", {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...e2eEnv,
      SEED_CUSTOMER_PASSWORD:
        process.env.SEED_CUSTOMER_PASSWORD || "customer123",
      SEED_RESTAURANT_PASSWORD:
        process.env.SEED_RESTAURANT_PASSWORD || "restaurant123",
      SEED_DRIVER_PASSWORD: process.env.SEED_DRIVER_PASSWORD || "driver123",
    },
  });

  // E2E-specific fixtures (IDs used by legacy tests)
  const prisma = new PrismaClient();
  try {
    const restaurant = await prisma.restaurant.upsert({
      where: { email: "test-restaurant@e2e.local" },
      update: {},
      create: {
        id: "test-restaurant",
        email: "test-restaurant@e2e.local",
        name: "E2E Test Restaurant",
        address: "Teststraße 1",
        isActive: true,
        status: "OPEN",
      },
    });

    await prisma.dish.upsert({
      where: { id: "dish-1" },
      update: {},
      create: {
        id: "dish-1",
        name: "E2E Dish",
        price: 5.99,
        category: "Test",
        restaurantId: restaurant.id,
        isAvailable: true,
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log("[E2E global-setup] DB ready");
}

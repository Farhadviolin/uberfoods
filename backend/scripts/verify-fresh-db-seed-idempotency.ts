import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const TEMP_DATABASE_PREFIX = "uberfoods_seed_idempotency_";
const SENTINEL_EMAIL = "seed-idempotency-sentinel@verification.local";
const allowedHosts = new Set(
  (process.env.SEED_IDEMPOTENCY_ALLOWED_HOSTS || "localhost,127.0.0.1,postgres")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
);

type SeedSnapshot = {
  addresses: Array<{ id: string; customerEmail: string }>;
  admins: string[];
  customers: string[];
  dishes: Array<{ id: string; restaurantEmail: string }>;
  drivers: string[];
  permissions: string[];
  restaurants: string[];
  roles: Array<{ name: string; permissions: string[] }>;
  tierConfigs: string[];
};

function requireDatabaseUrl(): URL {
  if (process.env.SEED_IDEMPOTENCY_ALLOW_TEMP_DATABASES !== "true") {
    throw new Error(
      "SEED_IDEMPOTENCY_ALLOW_TEMP_DATABASES=true is required before creating temporary databases.",
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const url = new URL(process.env.DATABASE_URL);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error(
      "Refusing to run against a host outside SEED_IDEMPOTENCY_ALLOWED_HOSTS.",
    );
  }

  return url;
}

function assertTemporaryDatabaseName(name: string): void {
  if (!new RegExp(`^${TEMP_DATABASE_PREFIX}[a-z0-9_]+$`).test(name)) {
    throw new Error(
      "Refusing to operate on a database outside the temporary verifier namespace.",
    );
  }
}

function databaseUrlFor(baseUrl: URL, name: string): string {
  assertTemporaryDatabaseName(name);
  const url = new URL(baseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

function adminDatabaseUrl(baseUrl: URL): string {
  const url = new URL(baseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  execFileSync(command, args, {
    cwd: process.cwd(),
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
}

function runPrisma(args: string[], databaseUrl: string): void {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  run(
    npx,
    ["--no-install", "prisma", ...args, "--schema=./prisma/schema.prisma"],
    {
      ...process.env,
      DATABASE_URL: databaseUrl,
      SEED_CUSTOMER_PASSWORD:
        process.env.SEED_CUSTOMER_PASSWORD || "customer123",
      SEED_RESTAURANT_PASSWORD:
        process.env.SEED_RESTAURANT_PASSWORD || "restaurant123",
      SEED_DRIVER_PASSWORD: process.env.SEED_DRIVER_PASSWORD || "driver123",
    },
  );
}

async function createDatabase(adminPool: Pool, name: string): Promise<void> {
  assertTemporaryDatabaseName(name);
  await adminPool.query(`CREATE DATABASE "${name}"`);
}

async function dropDatabase(adminPool: Pool, name: string): Promise<void> {
  assertTemporaryDatabaseName(name);
  await adminPool.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}

async function assertNoApplicationTables(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    );
    if (result.rows.length !== 0) {
      throw new Error(
        "Fresh temporary database already contains application tables.",
      );
    }
  } finally {
    await pool.end();
  }
}

async function snapshot(databaseUrl: string): Promise<SeedSnapshot> {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    const [
      addresses,
      admins,
      customers,
      dishes,
      drivers,
      permissions,
      restaurants,
      roles,
      tierConfigs,
    ] = await Promise.all([
      prisma.address.findMany({
        select: { id: true, customer: { select: { email: true } } },
        orderBy: { id: "asc" },
      }),
      prisma.admin.findMany({
        select: { email: true },
        orderBy: { email: "asc" },
      }),
      prisma.customer.findMany({
        where: { email: { not: SENTINEL_EMAIL } },
        select: { email: true },
        orderBy: { email: "asc" },
      }),
      prisma.dish.findMany({
        select: { id: true, restaurant: { select: { email: true } } },
        orderBy: { id: "asc" },
      }),
      prisma.driver.findMany({
        select: { email: true },
        orderBy: { email: "asc" },
      }),
      prisma.permission.findMany({
        select: { resource: true, action: true },
        orderBy: [{ resource: "asc" }, { action: "asc" }],
      }),
      prisma.restaurant.findMany({
        select: { email: true },
        orderBy: { email: "asc" },
      }),
      prisma.role.findMany({
        select: { name: true, permissions: true },
        orderBy: { name: "asc" },
      }),
      prisma.subscriptionTierConfig.findMany({
        select: { tier: true },
        orderBy: { tier: "asc" },
      }),
    ]);

    const state: SeedSnapshot = {
      addresses: addresses.map((address) => ({
        id: address.id,
        customerEmail: address.customer.email,
      })),
      admins: admins.map((admin) => admin.email),
      customers: customers.map((customer) => customer.email),
      dishes: dishes.map((dish) => ({
        id: dish.id,
        restaurantEmail: dish.restaurant.email,
      })),
      drivers: drivers.map((driver) => driver.email),
      permissions: permissions.map(
        (permission) => `${permission.resource}:${permission.action}`,
      ),
      restaurants: restaurants.map((restaurant) => restaurant.email),
      roles: roles.map((role) => ({
        name: role.name,
        permissions: [...role.permissions].sort(),
      })),
      tierConfigs: tierConfigs.map((tierConfig) => tierConfig.tier),
    };

    assertNoDuplicates("restaurants", state.restaurants);
    assertNoDuplicates(
      "dishes",
      state.dishes.map((dish) => dish.id),
    );
    assertNoDuplicates("customers", state.customers);
    assertNoDuplicates("drivers", state.drivers);
    assertNoDuplicates("admins", state.admins);
    assertNoDuplicates("permissions", state.permissions);
    assertNoDuplicates(
      "roles",
      state.roles.map((role) => role.name),
    );
    assertNoDuplicates("tier configs", state.tierConfigs);
    assertNoDuplicates(
      "addresses",
      state.addresses.map((address) => address.id),
    );

    return state;
  } finally {
    await prisma.$disconnect();
  }
}

function assertNoDuplicates(label: string, values: string[]): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate stable business keys found in ${label}.`);
  }
}

function assertSameSnapshot(
  left: SeedSnapshot,
  right: SeedSnapshot,
  label: string,
): void {
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`Normalized seed snapshot mismatch: ${label}.`);
  }
}

async function createAndVerifySentinel(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    await prisma.customer.create({
      data: {
        email: SENTINEL_EMAIL,
        password: "sentinel-not-a-login-password",
        firstName: "Seed",
        lastName: "Sentinel",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function assertSentinelPreserved(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    const sentinel = await prisma.customer.findUnique({
      where: { email: SENTINEL_EMAIL },
      select: { firstName: true, lastName: true },
    });
    if (sentinel?.firstName !== "Seed" || sentinel.lastName !== "Sentinel") {
      throw new Error(
        "The non-seed sentinel was changed or removed by the second seed run.",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyDatabase(
  adminPool: Pool,
  baseUrl: URL,
  name: string,
): Promise<SeedSnapshot> {
  const databaseUrl = databaseUrlFor(baseUrl, name);
  await createDatabase(adminPool, name);
  await assertNoApplicationTables(databaseUrl);
  console.log(`Created isolated temporary database: ${name}`);

  runPrisma(["migrate", "deploy"], databaseUrl);
  runPrisma(["migrate", "status"], databaseUrl);
  runPrisma(["db", "seed"], databaseUrl);
  const firstSnapshot = await snapshot(databaseUrl);
  await createAndVerifySentinel(databaseUrl);
  runPrisma(["db", "seed"], databaseUrl);
  const secondSnapshot = await snapshot(databaseUrl);
  await assertSentinelPreserved(databaseUrl);
  assertSameSnapshot(
    firstSnapshot,
    secondSnapshot,
    `${name} after the second seed run`,
  );
  console.log(
    `Verified idempotent seed snapshot and sentinel preservation: ${name}`,
  );
  return secondSnapshot;
}

async function main(): Promise<void> {
  const baseUrl = requireDatabaseUrl();
  const runId = randomUUID().replace(/-/g, "").slice(0, 16);
  const databaseA = `${TEMP_DATABASE_PREFIX}${runId}_a`;
  const databaseB = `${TEMP_DATABASE_PREFIX}${runId}_b`;
  const adminPool = new Pool({ connectionString: adminDatabaseUrl(baseUrl) });

  try {
    const snapshotA = await verifyDatabase(adminPool, baseUrl, databaseA);
    const snapshotB = await verifyDatabase(adminPool, baseUrl, databaseB);
    assertSameSnapshot(
      snapshotA,
      snapshotB,
      "database A compared with database B",
    );
    console.log("Fresh database and seed idempotency verification passed.");
  } finally {
    await dropDatabase(adminPool, databaseA);
    await dropDatabase(adminPool, databaseB);
    await adminPool.end();
    console.log("Temporary verifier databases removed.");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `Fresh database seed idempotency verification failed: ${message}`,
  );
  process.exitCode = 1;
});

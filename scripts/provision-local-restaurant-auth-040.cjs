#!/usr/bin/env node

/**
 * Provisions the isolated LOCAL-13 restaurant auth fixture.
 *
 * This script is intentionally fail-closed. It only runs when both explicit
 * local-fixture flags are present and only repairs existing records. It never
 * creates restaurants, dishes, production users, or tokens.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const TARGET_RESTAURANT_ID = "cmsc0knb70000p90j906xki7n";
const FIXTURE_FLAG = "restaurant-local13-040";
const DEFAULT_HANDOFF_DIR = path.join(
  os.tmpdir(),
  "uberfoods-local13-auth-040",
);
const HANDOFF_FILE_NAME = "restaurant-human-login.txt";

function requireLocalFixtureMode() {
  if (
    process.env.LOCAL_AUTH_FIXTURE !== FIXTURE_FLAG ||
    process.env.LOCAL_AUTH_ISOLATED !== "true"
  ) {
    throw new Error(
      "Refusing to run: explicit LOCAL_AUTH_FIXTURE and LOCAL_AUTH_ISOLATED flags are required.",
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Refusing to run: DATABASE_URL is required.");
  }
}

function createPassword() {
  return `Local13-${crypto.randomBytes(24).toString("base64url")}`;
}

function parseHandoff(content) {
  const values = new Map();
  for (const line of content.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return values;
}

function readOrCreateCredentials(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      ownerAPassword: createPassword(),
      ownerBPassword: createPassword(),
      customerPassword: createPassword(),
      createdAt: new Date().toISOString(),
    };
  }

  const values = parseHandoff(fs.readFileSync(filePath, "utf8"));
  const ownerAPassword = values.get("Owner A Testpasswort");
  const ownerBPassword = values.get("Owner B Testpasswort");
  const customerPassword = values.get("Nicht-Restaurant-Testpasswort");
  if (!ownerAPassword || !ownerBPassword || !customerPassword) {
    throw new Error(
      "Existing handoff file is incomplete; refusing to replace local credentials.",
    );
  }

  return {
    ownerAPassword,
    ownerBPassword,
    customerPassword,
    createdAt: values.get("Erstellungszeitpunkt") || new Date().toISOString(),
  };
}

function writeHandoff(filePath, credentials, ownerA, ownerB, customer) {
  const content = [
    "UberFoods LOCAL-13 Auth-Fixture",
    "Hinweis: ausschließlich lokale isolierte Testumgebung",
    `Frontend-URL: ${process.env.LOCAL_AUTH_FRONTEND_URL || "http://127.0.0.1:18324/login"}`,
    `Erstellungszeitpunkt: ${credentials.createdAt}`,
    "",
    `Owner A Login-Identifier: ${ownerA.email}`,
    `Owner A Testpasswort: ${credentials.ownerAPassword}`,
    `Owner A Restaurant-ID: ${ownerA.id}`,
    "Owner A Rolle: RESTAURANT",
    "Owner A Status: aktiv",
    "",
    `Owner B Login-Identifier: ${ownerB.email}`,
    `Owner B Testpasswort: ${credentials.ownerBPassword}`,
    `Owner B Restaurant-ID: ${ownerB.id}`,
    "Owner B Rolle: RESTAURANT",
    "Owner B Status: aktiv",
    "",
    `Nicht-Restaurant-Identifier: ${customer.email}`,
    `Nicht-Restaurant-Testpasswort: ${credentials.customerPassword}`,
    `Nicht-Restaurant-User-ID: ${customer.id}`,
    "Nicht-Restaurant-Rolle: CUSTOMER",
    "Nicht-Restaurant-Status: aktiv",
    "",
  ].join("\n");

  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, content, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporaryPath, filePath);
}

async function main() {
  requireLocalFixtureMode();

  const handoffDir =
    process.env.LOCAL_AUTH_HANDOFF_DIR || DEFAULT_HANDOFF_DIR;
  fs.mkdirSync(handoffDir, { recursive: true, mode: 0o700 });
  const handoffPath = path.join(handoffDir, HANDOFF_FILE_NAME);
  const credentials = readOrCreateCredentials(handoffPath);

  const prisma = new PrismaClient({ log: ["error"] });
  try {
    const ownerA = await prisma.restaurant.findUnique({
      where: { id: TARGET_RESTAURANT_ID },
      select: { id: true, email: true, isActive: true },
    });
    if (!ownerA) {
      throw new Error("Target restaurant does not exist; refusing to create it.");
    }

    const ownerB = await prisma.restaurant.findFirst({
      where: { id: { not: TARGET_RESTAURANT_ID }, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, isActive: true },
    });
    if (!ownerB) {
      throw new Error(
        "No second active restaurant exists; refusing to create an owner fixture.",
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, isActive: true },
    });
    if (!customer) {
      throw new Error(
        "No active customer exists; refusing to create a role fixture.",
      );
    }

    const [ownerAHash, ownerBHash, customerHash] = await Promise.all([
      bcrypt.hash(credentials.ownerAPassword, 10),
      bcrypt.hash(credentials.ownerBPassword, 10),
      bcrypt.hash(credentials.customerPassword, 10),
    ]);

    await prisma.$transaction([
      prisma.restaurant.update({
        where: { id: ownerA.id },
        data: { password: ownerAHash, isActive: true, mustChangePassword: false },
      }),
      prisma.restaurant.update({
        where: { id: ownerB.id },
        data: { password: ownerBHash, isActive: true, mustChangePassword: false },
      }),
      prisma.customer.update({
        where: { id: customer.id },
        data: { password: customerHash, isActive: true },
      }),
    ]);

    writeHandoff(handoffPath, credentials, ownerA, ownerB, customer);

    const [restaurantCount, dishCount, customerCount] = await Promise.all([
      prisma.restaurant.count(),
      prisma.dish.count(),
      prisma.customer.count(),
    ]);

    console.log(
      JSON.stringify(
        {
          status: "provisioned",
          handoffPath,
          ownerA: { id: ownerA.id, email: ownerA.email, role: "RESTAURANT" },
          ownerB: { id: ownerB.id, email: ownerB.email, role: "RESTAURANT" },
          nonRestaurant: {
            id: customer.id,
            email: customer.email,
            role: "CUSTOMER",
          },
          counts: { restaurants: restaurantCount, dishes: dishCount, customers: customerCount },
          mutationScope: "existing auth records only",
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Fixture provisioning failed: ${error.message}`);
  process.exitCode = 1;
});

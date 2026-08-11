#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import path from "node:path";

export const FINDING_ID = "P2-LOCAL-DRIVER-ROUTE-ACCEPTANCE-FIXTURE-135";
export const NAMESPACE = "P2-MANUAL-DRIVER-ROUTE-FIXTURE-135";
export const STATUS = "IN_TRANSIT";
export const IDS = Object.freeze({
  order: "p2-manual-driver-route-fixture-135-order",
  assignment: "p2-manual-driver-route-fixture-135-assignment",
  address: "p2-manual-driver-route-fixture-135-address",
  dish: "p2-manual-driver-route-fixture-135-dish",
});

const ACCOUNTS = Object.freeze({
  customer: "customer@uberfoods.local",
  restaurant: "restaurant@uberfoods.local",
  driver: "driver@uberfoods.local",
});
export const COORDINATES = Object.freeze({
  pickup: Object.freeze({ lat: 48.2082, lng: 16.3738 }),
  delivery: Object.freeze({ lat: 48.217, lng: 16.395 }),
  driver: Object.freeze({ lat: 48.205, lng: 16.366 }),
});
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "postgres",
  "uberfoods_postgres",
]);
const LOCAL_PORTS = new Set(["", "5432", "5434"]);

export function normalizeCoordinate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function validCoordinate(value) {
  const coordinate = normalizeCoordinate(value);
  return Boolean(
    coordinate &&
      coordinate.lat >= -90 && coordinate.lat <= 90 &&
      coordinate.lng >= -180 && coordinate.lng <= 180 &&
      !(coordinate.lat === 0 && coordinate.lng === 0),
  );
}

export function equalCoordinate(left, right) {
  const a = normalizeCoordinate(left);
  const b = normalizeCoordinate(right);
  return Boolean(a && b && a.lat === b.lat && a.lng === b.lng);
}

export function distanceKm(left, right) {
  const a = normalizeCoordinate(left);
  const b = normalizeCoordinate(right);
  if (!a || !b) return Number.NaN;
  const radians = (value) => (value * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function assertSafeEnvironment({ nodeEnv, databaseUrl, optIn }) {
  if (String(nodeEnv || "").toLowerCase() === "production") {
    throw new Error("Refusing fixture mutation when NODE_ENV=production.");
  }
  if (optIn !== "1") {
    throw new Error("Refusing fixture mutation without UBERFOODS_ALLOW_LOCAL_ACCEPTANCE_FIXTURE=1.");
  }
  if (!databaseUrl) throw new Error("Refusing fixture mutation without DATABASE_URL.");
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Refusing fixture mutation: DATABASE_URL is invalid.");
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error("Refusing fixture mutation: DATABASE_URL is not PostgreSQL.");
  }
  if (!LOCAL_HOSTS.has(parsed.hostname.toLowerCase()) || !LOCAL_PORTS.has(parsed.port)) {
    throw new Error("Refusing fixture mutation: DATABASE_URL does not reference an approved local host.");
  }
  return { host: parsed.hostname.toLowerCase(), port: parsed.port || "5432" };
}

export function fixtureOrder(record) {
  return Boolean(
    record && record.id === IDS.order && record.notes === NAMESPACE &&
      record.metadata && record.metadata.fixtureNamespace === NAMESPACE,
  );
}

export function shouldRestoreLocation(current, expected, owned) {
  return owned === true && equalCoordinate(current, expected);
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function checkCoordinates() {
  for (const value of Object.values(COORDINATES)) {
    if (!validCoordinate(value)) throw new Error("Fixture coordinate is invalid.");
  }
  if (distanceKm(COORDINATES.pickup, COORDINATES.delivery) < 1) {
    throw new Error("Fixture pickup and delivery coordinates are too close.");
  }
}

async function client() {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient({ log: ["error"] });
}

async function accounts(prisma) {
  const [customer, restaurant, driver] = await Promise.all([
    prisma.customer.findUnique({ where: { email: ACCOUNTS.customer }, select: { id: true, isActive: true, password: true } }),
    prisma.restaurant.findUnique({ where: { email: ACCOUNTS.restaurant }, select: { id: true, isActive: true, password: true, location: true } }),
    prisma.driver.findUnique({ where: { email: ACCOUNTS.driver }, select: { id: true, isActive: true, password: true, location: true } }),
  ]);
  for (const [role, record] of Object.entries({ customer, restaurant, driver })) {
    if (!record?.isActive || typeof record.password !== "string") {
      throw new Error(`Required local ${role} test account is missing or inactive.`);
    }
  }
  return { customer, restaurant, driver };
}

function locationPlan(current, expected, prior, label) {
  if (prior?.owned) {
    if (!equalCoordinate(current, expected)) throw new Error(`${label} fixture location changed unexpectedly.`);
    return { owned: true, previous: prior.previous ?? null, write: false };
  }
  if (current === null || current === undefined) return { owned: true, previous: null, write: true };
  if (equalCoordinate(current, expected)) return { owned: false, previous: null, write: false };
  throw new Error(`${label} already has a non-fixture location; refusing to overwrite it.`);
}

async function resolveDish(tx, restaurantId) {
  const seeded = await tx.dish.findUnique({ where: { id: "dish-pizza-pepperoni" }, select: { id: true, restaurantId: true, price: true, isActive: true, isAvailable: true } });
  if (seeded) {
    if (seeded.restaurantId !== restaurantId || !seeded.isActive || !seeded.isAvailable) throw new Error("Seeded local fixture dish is unavailable.");
    return { dish: seeded, owned: false };
  }
  const existing = await tx.dish.findUnique({ where: { id: IDS.dish }, select: { id: true, restaurantId: true, price: true } });
  if (existing) {
    if (existing.restaurantId !== restaurantId) throw new Error("Fixture dish belongs to another restaurant.");
    return { dish: existing, owned: true };
  }
  const dish = await tx.dish.create({
    data: { id: IDS.dish, restaurantId, name: "Local Route Acceptance Dish", description: "Namespaced local acceptance fixture", price: 12.5, category: "LOCAL_ACCEPTANCE_FIXTURE", isActive: true, isAvailable: true },
    select: { id: true, restaurantId: true, price: true },
  });
  return { dish, owned: true };
}

export async function provision(prisma) {
  checkCoordinates();
  const local = await accounts(prisma);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id: IDS.order }, select: { id: true, notes: true, metadata: true, customerId: true, restaurantId: true, driverId: true } });
    if (existing && !fixtureOrder(existing)) throw new Error("Deterministic fixture order ID belongs to another record.");
    if (existing && (existing.customerId !== local.customer.id || existing.restaurantId !== local.restaurant.id || existing.driverId !== local.driver.id)) {
      throw new Error("Existing fixture order ownership does not match local test accounts.");
    }
    const prior = object(existing?.metadata);
    const savedLocations = object(prior.locations);
    const legacyLocations = object(prior.locationOwnership);
    const savedRestaurant = object(savedLocations.restaurant);
    const savedDriver = object(savedLocations.driver);
    const priorRestaurant = Object.keys(savedRestaurant).length ? savedRestaurant : object(legacyLocations.restaurant);
    const priorDriver = Object.keys(savedDriver).length ? savedDriver : object(legacyLocations.driver);
    const restaurant = await tx.restaurant.findUnique({ where: { id: local.restaurant.id }, select: { id: true, location: true } });
    const driver = await tx.driver.findUnique({ where: { id: local.driver.id }, select: { id: true, location: true } });
    const restaurantPlan = locationPlan(restaurant.location, COORDINATES.pickup, priorRestaurant, "Restaurant");
    const driverPlan = locationPlan(driver.location, COORDINATES.driver, priorDriver, "Driver");
    if (restaurantPlan.write) await tx.restaurant.update({ where: { id: restaurant.id }, data: { location: COORDINATES.pickup } });
    if (driverPlan.write) await tx.driver.update({ where: { id: driver.id }, data: { location: COORDINATES.driver } });

    let address = await tx.address.findUnique({ where: { id: "address-max-musterstrasse" }, select: { id: true, customerId: true, latitude: true, longitude: true } });
    let addressState;
    if (address) {
      if (address.customerId !== local.customer.id) throw new Error("Seeded local address belongs to another customer.");
      const savedAddress = object(prior.address);
      const legacyAddress = object(prior.addressOwnership);
      const previousAddress = Object.keys(savedAddress).length ? savedAddress : legacyAddress;
      const addressWasOwned = previousAddress.owned === true || previousAddress.changed === true;
      if (addressWasOwned && !equalCoordinate({ lat: address.latitude, lng: address.longitude }, COORDINATES.delivery)) throw new Error("Fixture delivery coordinates changed unexpectedly.");
      if (!addressWasOwned && (address.latitude !== null || address.longitude !== null) && !equalCoordinate({ lat: address.latitude, lng: address.longitude }, COORDINATES.delivery)) throw new Error("Seeded local address already has non-fixture coordinates.");
      addressState = { id: address.id, created: false, owned: addressWasOwned || address.latitude === null || address.longitude === null, previous: previousAddress.previous ?? { latitude: address.latitude, longitude: address.longitude } };
      if (addressState.owned && !equalCoordinate({ lat: address.latitude, lng: address.longitude }, COORDINATES.delivery)) {
        await tx.address.update({ where: { id: address.id }, data: { latitude: COORDINATES.delivery.lat, longitude: COORDINATES.delivery.lng } });
      }
    } else {
      address = await tx.address.upsert({
        where: { id: IDS.address },
        create: { id: IDS.address, customerId: local.customer.id, label: "Local route acceptance fixture", street: "Local test delivery point", city: "Vienna", postalCode: "1010", country: "Austria", latitude: COORDINATES.delivery.lat, longitude: COORDINATES.delivery.lng, isDefault: false },
        update: { latitude: COORDINATES.delivery.lat, longitude: COORDINATES.delivery.lng },
        select: { id: true },
      });
      addressState = { id: address.id, created: true, owned: true, previous: { latitude: null, longitude: null } };
    }

    const { dish, owned: dishOwned } = await resolveDish(tx, local.restaurant.id);
    const metadata = {
      fixtureNamespace: NAMESPACE,
      findingId: FINDING_ID,
      fixtureVersion: 1,
      locations: { restaurant: { owned: restaurantPlan.owned, previous: restaurantPlan.previous }, driver: { owned: driverPlan.owned, previous: driverPlan.previous } },
      address: addressState,
      dishOwned,
    };
    const data = {
      customerId: local.customer.id,
      restaurantId: local.restaurant.id,
      driverId: local.driver.id,
      status: STATUS,
      totalAmount: 16.25,
      subtotal: 12.5,
      deliveryFee: 2.5,
      taxAmount: 1.25,
      paymentStatus: "PENDING",
      paymentMethod: "LOCAL_TEST_FIXTURE",
      address: "LOCAL ROUTE FIXTURE DELIVERY POINT",
      deliveryAddress: "LOCAL ROUTE FIXTURE DELIVERY POINT",
      deliveryInstructions: "Local acceptance fixture; no external delivery.",
      customerLocation: COORDINATES.delivery,
      notes: NAMESPACE,
      metadata,
      route: null,
    };
    await tx.order.upsert({
      where: { id: IDS.order },
      create: { id: IDS.order, ...data, items: { create: { dishId: dish.id, quantity: 1, price: dish.price, specialInstructions: "Local route acceptance fixture" } } },
      update: { ...data, items: { deleteMany: {}, create: { dishId: dish.id, quantity: 1, price: dish.price, specialInstructions: "Local route acceptance fixture" } } },
    });
    await tx.assignmentLog.upsert({
      where: { id: IDS.assignment },
      create: { id: IDS.assignment, orderId: IDS.order, driverId: local.driver.id, algorithm: "local-acceptance-fixture", score: 1, estimatedDeliveryTime: 20, estimatedDistance: distanceKm(COORDINATES.pickup, COORDINATES.delivery), confidence: 1, reasoning: ["Finding-135 local route acceptance fixture"], success: true },
      update: { orderId: IDS.order, driverId: local.driver.id, algorithm: "local-acceptance-fixture", score: 1, estimatedDeliveryTime: 20, estimatedDistance: distanceKm(COORDINATES.pickup, COORDINATES.delivery), confidence: 1, reasoning: ["Finding-135 local route acceptance fixture"], success: true },
    });
  });
  return verify(prisma);
}

export async function verify(prisma) {
  const [count, order] = await Promise.all([
    prisma.order.count({ where: { notes: NAMESPACE } }),
    prisma.order.findUnique({ where: { id: IDS.order }, select: { id: true, notes: true, metadata: true, customerId: true, restaurantId: true, driverId: true, status: true, customerLocation: true, items: { select: { id: true } } } }),
  ]);
  if (!fixtureOrder(order)) throw new Error("Finding-135 fixture order missing.");
  const metadata = object(order.metadata);
  const [restaurant, driver, address, assignment] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: order.restaurantId }, select: { location: true } }),
    prisma.driver.findUnique({ where: { id: order.driverId }, select: { location: true } }),
    prisma.address.findUnique({ where: { id: object(metadata.address).id }, select: { customerId: true, latitude: true, longitude: true } }),
    prisma.assignmentLog.findUnique({ where: { id: IDS.assignment }, select: { orderId: true, driverId: true } }),
  ]);
  const pickup = validCoordinate(restaurant?.location);
  const delivery = validCoordinate(order.customerLocation) && validCoordinate({ lat: address?.latitude, lng: address?.longitude });
  const driverLocation = validCoordinate(driver?.location);
  const ownership = Boolean(order.driverId && address?.customerId === order.customerId && assignment?.orderId === order.id && assignment?.driverId === order.driverId);
  const suitable = count === 1 && order.status === STATUS && pickup && delivery && driverLocation && ownership && order.items.length === 1;
  if (!suitable) throw new Error("Finding-135 fixture verification failed.");
  return { count, status: order.status, assignedDriver: true, pickup, delivery, driverLocation, ownership, suitable, shortId: `${order.id.slice(0, 12)}…` };
}

export async function cleanup(prisma) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: IDS.order }, select: { id: true, notes: true, metadata: true, customerId: true, restaurantId: true, driverId: true } });
    if (!order) return { status: "not_found" };
    if (!fixtureOrder(order)) throw new Error("Refusing cleanup: order is not Finding-135 owned.");
    const metadata = object(order.metadata);
    const assignment = await tx.assignmentLog.findUnique({ where: { id: IDS.assignment }, select: { orderId: true, driverId: true } });
    if (assignment && (assignment.orderId !== order.id || assignment.driverId !== order.driverId)) throw new Error("Refusing cleanup: assignment is not Finding-135 owned.");
    if (assignment) await tx.assignmentLog.delete({ where: { id: IDS.assignment } });
    await tx.order.delete({ where: { id: order.id } });
    const addressState = object(metadata.address);
    const address = await tx.address.findUnique({ where: { id: addressState.id }, select: { id: true, customerId: true, latitude: true, longitude: true } });
    if (address?.customerId === order.customerId) {
      if (addressState.created) await tx.address.delete({ where: { id: address.id } });
      else if (shouldRestoreLocation({ lat: address.latitude, lng: address.longitude }, COORDINATES.delivery, addressState.owned)) await tx.address.update({ where: { id: address.id }, data: { latitude: addressState.previous?.latitude ?? null, longitude: addressState.previous?.longitude ?? null } });
    }
    const locations = object(metadata.locations);
    const restaurant = await tx.restaurant.findUnique({ where: { id: order.restaurantId }, select: { id: true, location: true } });
    if (restaurant && shouldRestoreLocation(restaurant.location, COORDINATES.pickup, object(locations.restaurant).owned)) await tx.restaurant.update({ where: { id: restaurant.id }, data: { location: object(locations.restaurant).previous ?? null } });
    const driver = await tx.driver.findUnique({ where: { id: order.driverId }, select: { id: true, location: true } });
    if (driver && shouldRestoreLocation(driver.location, COORDINATES.driver, object(locations.driver).owned)) await tx.driver.update({ where: { id: driver.id }, data: { location: object(locations.driver).previous ?? null } });
    if (metadata.dishOwned) {
      const references = await tx.orderItem.count({ where: { dishId: IDS.dish } });
      if (references === 0) await tx.dish.delete({ where: { id: IDS.dish } });
    }
    return { status: "cleaned" };
  });
}

function redact(error) {
  return String(error?.message || error).replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "[redacted-database-url]");
}

async function main() {
  const environment = { nodeEnv: process.env.NODE_ENV || "development", databaseUrl: process.env.DATABASE_URL, optIn: process.env.UBERFOODS_ALLOW_LOCAL_ACCEPTANCE_FIXTURE };
  assertSafeEnvironment(environment);
  checkCoordinates();
  const prisma = await client();
  try {
    if (process.argv.includes("--cleanup")) {
      console.log(JSON.stringify(await cleanup(prisma)));
    } else {
      const result = await provision(prisma);
      console.log(JSON.stringify({ findingId: FINDING_ID, fixtureOrdersSuitable: result.count, canonicalStatus: result.status, assignedDriver: result.assignedDriver, pickupCoordinatesValid: result.pickup, deliveryCoordinatesValid: result.delivery, driverCoordinatesValid: result.driverLocation, ownershipValid: result.ownership, suitableForFinding133: result.suitable, finalOrder: result.shortId }));
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`DRIVER_ROUTE_FIXTURE=FAIL ${redact(error)}`);
    process.exitCode = 1;
  });
}

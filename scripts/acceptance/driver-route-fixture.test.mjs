import assert from "node:assert/strict";
import test from "node:test";
import { COORDINATES, IDS, NAMESPACE, STATUS, assertSafeEnvironment, distanceKm, equalCoordinate, fixtureOrder, validCoordinate, shouldRestoreLocation } from "./driver-route-fixture.mjs";

test("production guard blocks before mutation", () => {
  assert.throws(() => assertSafeEnvironment({ nodeEnv: "production", databaseUrl: "postgresql://local@localhost:5434/uberfoods", optIn: "1" }), /NODE_ENV=production/);
});

test("non-local database guard blocks before mutation", () => {
  assert.throws(() => assertSafeEnvironment({ nodeEnv: "development", databaseUrl: "postgresql://local@remote.example.invalid:5432/uberfoods", optIn: "1" }), /approved local host/);
});

test("explicit opt-in is mandatory", () => {
  assert.throws(() => assertSafeEnvironment({ nodeEnv: "development", databaseUrl: "postgresql://local@localhost:5434/uberfoods" }), /UBERFOODS_ALLOW_LOCAL_ACCEPTANCE_FIXTURE=1/);
});

test("approved local runtime form is accepted", () => {
  assert.deepEqual(assertSafeEnvironment({ nodeEnv: "test", databaseUrl: "postgresql://local@localhost:5434/uberfoods", optIn: "1" }), { host: "localhost", port: "5434" });
});

test("coordinates are valid and route-like", () => {
  for (const coordinate of Object.values(COORDINATES)) assert.equal(validCoordinate(coordinate), true);
  assert.equal(validCoordinate({ lat: 0, lng: 0 }), false);
  assert.equal(validCoordinate({ lat: Number.NaN, lng: 1 }), false);
  assert.ok(distanceKm(COORDINATES.pickup, COORDINATES.delivery) >= 1);
});

test("namespace and cleanup selectors are precise", () => {
  assert.equal(fixtureOrder({ id: IDS.order, notes: NAMESPACE, metadata: { fixtureNamespace: NAMESPACE } }), true);
  assert.equal(fixtureOrder({ id: "foreign", notes: NAMESPACE, metadata: { fixtureNamespace: NAMESPACE } }), false);
  assert.equal(STATUS, "IN_TRANSIT");
  assert.equal(shouldRestoreLocation(COORDINATES.driver, COORDINATES.driver, true), true);
  assert.equal(shouldRestoreLocation({ lat: 48.3, lng: 16.4 }, COORDINATES.driver, true), false);
  assert.equal(equalCoordinate(COORDINATES.pickup, COORDINATES.pickup), true);
});

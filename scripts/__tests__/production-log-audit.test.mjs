import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCleanupVolumeOwnership,
  assertIsolatedProjectName,
  assertPostgresRecreateEvidence,
  auditRuntimeLogs,
} from "../lib/production-log-audit.mjs";

const started = new Date("2026-07-28T10:00:00.000Z");
const recovered = new Date("2026-07-28T10:00:10.000Z");
const expectedLine =
  "postgres-1 | 2026-07-28T10:00:05.000Z 2026-07-28 10:00:05.000 UTC [61] FATAL: the database system is shutting down";
const validContext = {
  phase: "postgres-recreate",
  postgresService: "postgres-1",
  recreateStartedAt: started,
  recoveredAt: recovered,
  containerRecreated: true,
  postgresHealthy: true,
  persistenceVerified: true,
};

test("accepts one exact postgres shutdown diagnostic in the proven recreate window", () => {
  assert.deepEqual(auditRuntimeLogs(expectedLine, validContext), {
    unexpected: [],
    expectedShutdowns: 1,
  });
});

const administratorLine =
  "2026-07-28T10:00:05.000Z 2026-07-28 10:00:05.000 UTC [61] FATAL: terminating connection due to administrator command";
const administratorContext = {
  phase: "postgres-recreate",
  oldContainerId: "old-postgres",
  newContainerId: "new-postgres",
  sourceContainerId: "old-postgres",
  oldContainerStopStartedAt: started,
  oldContainerStoppedAt: recovered,
  backendRecoveryAt: recovered,
  containerRecreated: true,
  postgresHealthy: true,
  persistenceVerified: true,
};

test("accepts only the exact administrator disconnect from the old container in its stop window", () => {
  assert.deepEqual(auditRuntimeLogs(administratorLine, administratorContext), {
    unexpected: [],
    expectedShutdowns: 1,
  });
});

test("rejects the administrator disconnect from the new container or outside the stop window", () => {
  assert.equal(
    auditRuntimeLogs(administratorLine, {
      ...administratorContext,
      sourceContainerId: "new-postgres",
    }).unexpected.length,
    1,
  );
  assert.equal(
    auditRuntimeLogs(
      administratorLine.replace("10:00:05", "10:00:11"),
      administratorContext,
    ).unexpected.length,
    1,
  );
});

test("rejects the shutdown diagnostic before the recreate window", () => {
  const result = auditRuntimeLogs(
    expectedLine.replace("10:00:05", "09:59:59"),
    validContext,
  );
  assert.equal(result.unexpected.length, 1);
});

test("rejects the shutdown diagnostic after recovery", () => {
  const result = auditRuntimeLogs(
    expectedLine.replace("10:00:05", "10:00:11"),
    validContext,
  );
  assert.equal(result.unexpected.length, 1);
});

test("rejects the shutdown diagnostic from another service", () => {
  assert.equal(
    auditRuntimeLogs(
      expectedLine.replace("postgres-1", "backend-1"),
      validContext,
    ).unexpected.length,
    1,
  );
});

test("rejects a critical diagnostic without a compose timestamp", () => {
  assert.equal(
    auditRuntimeLogs(
      "postgres-1 | FATAL: the database system is shutting down",
      validContext,
    ).unexpected.length,
    1,
  );
});

test("rejects another postgres FATAL during recreate", () => {
  assert.equal(
    auditRuntimeLogs(
      expectedLine.replace(
        "the database system is shutting down",
        "password authentication failed",
      ),
      validContext,
    ).unexpected.length,
    1,
  );
});

test("rejects postgres PANIC during recreate", () => {
  assert.equal(
    auditRuntimeLogs(
      expectedLine.replace(
        "FATAL: the database system is shutting down",
        "PANIC: invalid checkpoint record",
      ),
      validContext,
    ).unexpected.length,
    1,
  );
});

test("rejects expected shutdown when postgres did not recover healthy", () => {
  assert.equal(
    auditRuntimeLogs(expectedLine, {
      ...validContext,
      postgresHealthy: false,
    }).unexpected.length,
    1,
  );
});

test("rejects repeated shutdown diagnostics beyond the bounded lifecycle allowance", () => {
  assert.equal(
    auditRuntimeLogs(`${expectedLine}\n${expectedLine}`, validContext)
      .unexpected.length,
    1,
  );
});

test("keeps normal post-recovery FATAL diagnostics strict", () => {
  assert.equal(
    auditRuntimeLogs(expectedLine, { phase: "post-recovery" }).unexpected
      .length,
    1,
  );
});

test("accepts valid recreate identity, volume, health, persistence and no reseed", () => {
  assert.doesNotThrow(() =>
    assertPostgresRecreateEvidence({
      oldContainerId: "old",
      newContainerId: "new",
      oldVolumeName: "volume",
      newVolumeName: "volume",
      oldVolumeCreatedAt: "created",
      newVolumeCreatedAt: "created",
      postgresHealthy: true,
      persistenceVerified: true,
    }),
  );
});

test("rejects an unchanged postgres container id", () => {
  assert.throws(() =>
    assertPostgresRecreateEvidence({
      oldContainerId: "same",
      newContainerId: "same",
    }),
  );
});

test("rejects a changed postgres volume", () => {
  assert.throws(() =>
    assertPostgresRecreateEvidence({
      oldContainerId: "old",
      newContainerId: "new",
      oldVolumeName: "old-volume",
      newVolumeName: "new-volume",
    }),
  );
});

test("rejects a recreated volume with a new creation timestamp", () => {
  assert.throws(() =>
    assertPostgresRecreateEvidence({
      oldContainerId: "old",
      newContainerId: "new",
      oldVolumeName: "volume",
      newVolumeName: "volume",
      oldVolumeCreatedAt: "old",
      newVolumeCreatedAt: "new",
    }),
  );
});

test("rejects a failed physical persistence comparison", () => {
  assert.throws(() =>
    assertPostgresRecreateEvidence({
      oldContainerId: "old",
      newContainerId: "new",
      oldVolumeName: "volume",
      newVolumeName: "volume",
      oldVolumeCreatedAt: "created",
      newVolumeCreatedAt: "created",
      postgresHealthy: true,
      persistenceVerified: false,
    }),
  );
});

test("rejects reseeding after postgres recreate", () => {
  assert.throws(() =>
    assertPostgresRecreateEvidence({
      oldContainerId: "old",
      newContainerId: "new",
      oldVolumeName: "volume",
      newVolumeName: "volume",
      oldVolumeCreatedAt: "created",
      newVolumeCreatedAt: "created",
      postgresHealthy: true,
      persistenceVerified: true,
      seedRanAfterRecreate: true,
    }),
  );
});

test("allows cleanup only for the exact labeled isolated postgres volume", () => {
  assert.doesNotThrow(() =>
    assertCleanupVolumeOwnership({
      project: "uberfoods_prod_sim_a1b2c3d4",
      volumeName: "uberfoods_prod_sim_a1b2c3d4_postgres-data",
      expectedVolumeName: "uberfoods_prod_sim_a1b2c3d4_postgres-data",
      projectLabel: "uberfoods_prod_sim_a1b2c3d4",
      volumeLabel: "postgres-data",
      attachedContainerProjects: ["uberfoods_prod_sim_a1b2c3d4"],
    }),
  );
});

test("rejects cleanup of a foreign volume attachment", () => {
  assert.throws(() =>
    assertCleanupVolumeOwnership({
      project: "uberfoods_prod_sim_a1b2c3d4",
      volumeName: "uberfoods_prod_sim_a1b2c3d4_postgres-data",
      expectedVolumeName: "uberfoods_prod_sim_a1b2c3d4_postgres-data",
      projectLabel: "uberfoods_prod_sim_a1b2c3d4",
      volumeLabel: "postgres-data",
      attachedContainerProjects: ["other-project"],
    }),
  );
});

test("rejects unsafe project names before cleanup", () => {
  assert.throws(() => assertIsolatedProjectName("uberfoods_prod_sim_*"));
});

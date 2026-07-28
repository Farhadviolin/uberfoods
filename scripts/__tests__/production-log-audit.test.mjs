import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCleanupVolumeOwnership,
  assertIsolatedProjectName,
  assertPostgresRecreateEvidence,
  auditRuntimeLogs,
} from "../lib/production-log-audit.mjs";

const oldContainerId = "a".repeat(64);
const newContainerId = "b".repeat(64);
const unknownContainerId = "c".repeat(64);
const requestedAt = new Date("2026-07-28T10:00:00.000Z");
const endedAt = new Date("2026-07-28T10:00:06.000Z");
const newStartedAt = new Date("2026-07-28T10:00:07.000Z");
const expectedLine =
  "2026-07-28T10:00:05.000Z 2026-07-28 10:00:05.000 UTC [61] FATAL: the database system is shutting down";
const administratorLine =
  "2026-07-28T10:00:04.500Z 2026-07-28 10:00:04.500 UTC [61] FATAL: terminating connection due to administrator command";
const shutdownStartLine =
  "2026-07-28T10:00:04.000Z 2026-07-28 10:00:04.000 UTC [1] LOG: received fast shutdown request";
const shutdownCompleteLine =
  "2026-07-28T10:00:05.500Z 2026-07-28 10:00:05.500 UTC [1] LOG: database system is shut down";
const validContext = {
  phase: "postgres-recreate",
  isolatedNamespace: "uberfoods_prod_sim_a1b2c3d4",
  recreateRequestedAt: requestedAt,
  shutdownWindowStart: requestedAt,
  shutdownWindowEnd: endedAt,
  oldPostgresContainerEndedAt: endedAt,
  newPostgresContainerStartedAt: newStartedAt,
  postgresVolumeIdentityBefore: "volume-identity",
  postgresVolumeIdentityAfter: "volume-identity",
  postgresRecovered: true,
  backendRecovered: true,
  persistenceVerified: true,
  ownershipVerified: true,
  oldContainerId,
  newContainerId,
  sourceContainerId: oldContainerId,
  controlledStop: {
    eventType: "controlled-postgres-stop",
    namespace: "uberfoods_prod_sim_a1b2c3d4",
    targetContainerId: oldContainerId,
    startedAt: requestedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    exitCode: 0,
    operation: "docker compose stop postgres",
  },
};
const bootstrapContainerId = "d".repeat(64);
const otherBootstrapContainerId = "e".repeat(64);
const bootstrapStart = new Date("2026-07-28T09:59:59.000Z");
const bootstrapEnd = new Date("2026-07-28T10:00:06.000Z");
const bootstrapFastLine =
  "2026-07-28T10:00:01.000Z 2026-07-28 10:00:01.000 UTC [41] LOG: received fast shutdown request";
const bootstrapFatalLine =
  "2026-07-28T10:00:02.000Z 2026-07-28 10:00:02.000 UTC [60] FATAL: the database system is shutting down";
const bootstrapInitCompleteLine =
  "2026-07-28T10:00:03.000Z PostgreSQL init process complete; ready for start up.";
const bootstrapReadyLine =
  "2026-07-28T10:00:04.000Z 2026-07-28 10:00:04.000 UTC [1] LOG: database system is ready to accept connections";
const bootstrapLogs = [
  bootstrapFastLine,
  bootstrapFatalLine,
  bootstrapInitCompleteLine,
  bootstrapReadyLine,
].join("\n");
const validBootstrapContext = {
  phase: "fresh-database-initdb",
  bootstrapWindowStart: bootstrapStart,
  bootstrapWindowEnd: bootstrapEnd,
  initialContainerId: bootstrapContainerId,
  sourceContainerId: bootstrapContainerId,
  isolatedNamespace: "uberfoods_prod_sim_a1b2c3d4",
  freshNamespaceVerified: true,
  initialVolumeName: "uberfoods_prod_sim_a1b2c3d4_postgres-data",
  expectedInitialVolumeName: "uberfoods_prod_sim_a1b2c3d4_postgres-data",
  initialVolumeIdentity: "fresh-volume-identity",
  initialVolumeCreatedAt: "2026-07-28T10:00:00.000Z",
  applicationDatabaseReachable: true,
  migrationsApplied: true,
  schemaReachable: true,
  databaseOperationVerified: true,
  seedSucceeded: true,
  seedIdempotent: true,
  postgresHealthy: true,
  backendReady: true,
  recreateRequestedAt: undefined,
};

function expectBootstrapRejected(
  logs = bootstrapLogs,
  context = validBootstrapContext,
) {
  const result = auditRuntimeLogs(logs, context);
  assert.equal(result.classifiedBootstrapShutdownDiagnostics.length, 0);
  assert.ok(result.unexpected.length >= 1);
}

test("classifies a Linux Compose initdb shutdown only with complete structural evidence", () => {
  const composeLogs = bootstrapLogs
    .split("\n")
    .map((line) => `postgres-1 | ${line}`)
    .join("\n");
  const result = auditRuntimeLogs(composeLogs, validBootstrapContext);
  assert.equal(result.unexpected.length, 0);
  assert.equal(result.expectedShutdowns, 1);
  assert.equal(result.classifiedBootstrapShutdownDiagnostics.length, 1);
  assert.equal(result.classifiedRecreateShutdownDiagnostics.length, 0);
  assert.equal(
    result.classifiedBootstrapShutdownDiagnostics[0].matchedRule,
    "postgres-initdb-bootstrap-shutdown",
  );
  assert.equal(
    result.classifiedBootstrapShutdownDiagnostics[0].sourceContainerId,
    bootstrapContainerId,
  );
});

test("classifies Windows docker logs without trusting a Compose prefix", () => {
  const result = auditRuntimeLogs(bootstrapLogs, validBootstrapContext);
  assert.equal(result.unexpected.length, 0);
  assert.equal(result.classifiedBootstrapShutdownDiagnostics.length, 1);
  assert.deepEqual(
    result.classifiedBootstrapShutdownDiagnostics[0].bootstrapSequence,
    {
      fastShutdownAt: "2026-07-28T10:00:01.000Z",
      fatalAt: "2026-07-28T10:00:02.000Z",
      initCompleteAt: "2026-07-28T10:00:03.000Z",
      finalReadyAt: "2026-07-28T10:00:04.000Z",
    },
  );
  assert.deepEqual(result.unexplainedFatalDiagnostics, []);
});

const withoutLine = (logs, line) =>
  logs
    .split("\n")
    .filter((candidate) => candidate !== line)
    .join("\n");
const similarBootstrapFatal = bootstrapFatalLine.replace(
  "the database system is shutting down",
  "database system shutdown in progress",
);
const missingDatabaseFatal = bootstrapFatalLine.replace(
  "the database system is shutting down",
  'database "uberfoods" does not exist',
);
const bootstrapNegativeCases = [
  [
    "missing fast-shutdown marker",
    withoutLine(bootstrapLogs, bootstrapFastLine),
  ],
  [
    "missing init-complete marker",
    withoutLine(bootstrapLogs, bootstrapInitCompleteLine),
  ],
  [
    "missing final ready marker",
    withoutLine(bootstrapLogs, bootstrapReadyLine),
  ],
  [
    "ready only before the FATAL",
    [
      bootstrapReadyLine,
      bootstrapFastLine,
      bootstrapFatalLine,
      bootstrapInitCompleteLine,
    ].join("\n"),
  ],
  [
    "contradictory marker order",
    [
      bootstrapInitCompleteLine,
      bootstrapFastLine,
      bootstrapFatalLine,
      bootstrapReadyLine,
    ].join("\n"),
  ],
  [
    "missing outer timestamp",
    bootstrapLogs.replace(
      bootstrapFatalLine,
      "FATAL: the database system is shutting down",
    ),
  ],
  [
    "unparseable outer timestamp",
    bootstrapLogs.replace(
      bootstrapFatalLine,
      bootstrapFatalLine.replace("2026-07-28T10:00:02.000Z", "not-a-time"),
    ),
  ],
  [
    "FATAL outside bootstrap window",
    bootstrapLogs.replace(
      bootstrapFatalLine,
      bootstrapFatalLine.replace(
        "2026-07-28T10:00:02.000Z",
        "2026-07-28T10:00:07.000Z",
      ),
    ),
  ],
  [
    "FATAL after final readiness",
    [
      bootstrapFastLine,
      bootstrapInitCompleteLine,
      bootstrapReadyLine,
      bootstrapFatalLine.replace(
        "2026-07-28T10:00:02.000Z",
        "2026-07-28T10:00:05.000Z",
      ),
    ].join("\n"),
  ],
  ["normal runtime phase", bootstrapLogs, { phase: "normal-operation" }],
  ["incomplete recreate phase", bootstrapLogs, { phase: "postgres-recreate" }],
  [
    "missing initial container id",
    bootstrapLogs,
    { initialContainerId: undefined },
  ],
  [
    "short initial container id",
    bootstrapLogs,
    { initialContainerId: "d".repeat(12) },
  ],
  [
    "unknown initial container id",
    bootstrapLogs,
    { initialContainerId: otherBootstrapContainerId },
  ],
  [
    "source container mismatch",
    bootstrapLogs,
    { sourceContainerId: otherBootstrapContainerId },
  ],
  [
    "Compose prefix without source identity",
    bootstrapLogs,
    { sourceContainerId: undefined },
  ],
  [
    "pre-bootstrap namespace not proven empty",
    bootstrapLogs,
    { freshNamespaceVerified: false },
  ],
  [
    "fresh volume identity missing",
    bootstrapLogs,
    { initialVolumeIdentity: undefined },
  ],
  [
    "old or changed volume",
    bootstrapLogs,
    { initialVolumeName: "uberfoods_prod_sim_a1b2c3d4_old-postgres-data" },
  ],
  [
    "old volume creation timestamp",
    bootstrapLogs,
    { initialVolumeCreatedAt: "2026-07-27T10:00:00.000Z" },
  ],
  ["Fresh Database phase missing", bootstrapLogs, { phase: undefined }],
  [
    "recreate already requested",
    bootstrapLogs,
    { recreateRequestedAt: new Date("2026-07-28T10:00:00.500Z") },
  ],
  ["PostgreSQL not healthy", bootstrapLogs, { postgresHealthy: false }],
  [
    "application database unreachable",
    bootstrapLogs,
    { applicationDatabaseReachable: false },
  ],
  ["migrations missing", bootstrapLogs, { migrationsApplied: false }],
  ["schema access missing", bootstrapLogs, { schemaReachable: false }],
  [
    "database operation missing",
    bootstrapLogs,
    { databaseOperationVerified: false },
  ],
  ["seed failed", bootstrapLogs, { seedSucceeded: false }],
  ["seed idempotence missing", bootstrapLogs, { seedIdempotent: false }],
  ["backend readiness missing", bootstrapLogs, { backendReady: false }],
  [
    "two matching shutdown FATAL lines",
    `${bootstrapLogs}\n${bootstrapFatalLine.replace(
      /10:00:02\.000/g,
      "10:00:02.500",
    )}`,
  ],
  [
    "additional unknown FATAL",
    `${bootstrapLogs}\n2026-07-28T10:00:02.500Z 2026-07-28 10:00:02.500 UTC [61] FATAL: password authentication failed`,
  ],
  [
    "additional PANIC",
    `${bootstrapLogs}\n2026-07-28T10:00:02.500Z 2026-07-28 10:00:02.500 UTC [61] PANIC: invalid checkpoint record`,
  ],
  [
    "additional crash or corruption",
    `${bootstrapLogs}\n2026-07-28T10:00:02.500Z 2026-07-28 10:00:02.500 UTC [61] LOG: database crash caused corruption`,
  ],
  [
    "similar but non-exact message",
    bootstrapLogs.replace(bootstrapFatalLine, similarBootstrapFatal),
  ],
  [
    "missing application database FATAL",
    bootstrapLogs.replace(bootstrapFatalLine, missingDatabaseFatal),
  ],
  [
    "later runtime shutdown offered as bootstrap",
    bootstrapLogs,
    {
      phase: "normal-operation",
      bootstrapWindowStart: new Date("2026-07-28T09:00:00.000Z"),
      bootstrapWindowEnd: new Date("2026-07-28T11:00:00.000Z"),
    },
  ],
];

assert.equal(bootstrapNegativeCases.length, 37);
for (const [name, logs, override = {}] of bootstrapNegativeCases) {
  test(`bootstrap evidence rejects ${name}`, () => {
    expectBootstrapRejected(logs, {
      ...validBootstrapContext,
      ...override,
    });
  });
}

const controlledShutdownLogs = [
  shutdownStartLine,
  administratorLine,
  expectedLine,
  shutdownCompleteLine,
].join("\n");
const shutdownMarkersOnlyLogs = [shutdownStartLine, shutdownCompleteLine].join(
  "\n",
);

function expectRejected(logs = controlledShutdownLogs, context = validContext) {
  const result = auditRuntimeLogs(logs, context);
  assert.ok(result.unexpected.length >= 1);
  return result;
}

test("bootstrap classification never replaces the recreate classification", () => {
  const recreate = auditRuntimeLogs(controlledShutdownLogs, validContext);
  assert.equal(recreate.classifiedBootstrapShutdownDiagnostics.length, 0);
  assert.equal(recreate.classifiedRecreateShutdownDiagnostics.length, 2);
});

test("classifies a structured PostgreSQL shutdown with both optional FATAL diagnostics", () => {
  const result = auditRuntimeLogs(controlledShutdownLogs, validContext);
  assert.equal(result.unexpected.length, 0);
  assert.equal(result.expectedShutdowns, 2);
  assert.equal(result.classifiedExpectedShutdownDiagnostics.length, 2);
  assert.deepEqual(result.unexplainedFatalDiagnostics, []);
  assert.deepEqual(result.lifecycleState, {
    controlledStopRequested: true,
    shutdownStarted: true,
    shutdownCompleted: true,
    containerRecreated: true,
    databaseRecovered: true,
    backendRecovered: true,
    persistenceVerified: true,
    ownershipVerified: true,
  });
  assert.equal(
    result.classifiedExpectedShutdownDiagnostics[0].sourceContainerId,
    oldContainerId,
  );
  assert.equal(
    result.classifiedExpectedShutdownDiagnostics[0].matchedRule,
    "postgres-administrator-disconnect-during-proven-container-recreate",
  );
  assert.equal(
    result.classifiedExpectedShutdownDiagnostics[1].matchedRule,
    "postgres-database-shutdown-during-proven-container-recreate",
  );
  assert.ok(
    result.classifiedExpectedShutdownDiagnostics.every(
      ({ lifecyclePosition }) =>
        lifecyclePosition === "after-shutdown-start-before-shutdown-complete",
    ),
  );
});

test("accepts a structured PostgreSQL shutdown with only the administrator disconnect", () => {
  const result = auditRuntimeLogs(
    [shutdownStartLine, administratorLine, shutdownCompleteLine].join("\n"),
    validContext,
  );
  assert.equal(result.unexpected.length, 0);
  assert.equal(result.expectedShutdowns, 1);
});

test("accepts a structured PostgreSQL shutdown without any FATAL diagnostic", () => {
  const result = auditRuntimeLogs(shutdownMarkersOnlyLogs, validContext);
  assert.equal(result.unexpected.length, 0);
  assert.equal(result.expectedShutdowns, 0);
});

test("accepts multiple distinct bound administrator disconnects without a numeric limit", () => {
  const secondAdministratorLine = administratorLine.replace(
    /10:00:04\.500/g,
    "10:00:04.750",
  );
  const result = auditRuntimeLogs(
    [
      shutdownStartLine,
      administratorLine,
      secondAdministratorLine,
      shutdownCompleteLine,
    ].join("\n"),
    validContext,
  );
  assert.equal(result.unexpected.length, 0);
  assert.equal(result.expectedShutdowns, 2);
});

test("deduplicates identical lifecycle records before classification", () => {
  const result = auditRuntimeLogs(
    [
      shutdownStartLine,
      administratorLine,
      administratorLine,
      shutdownCompleteLine,
    ].join("\n"),
    validContext,
  );
  assert.equal(result.unexpected.length, 0);
  assert.equal(result.expectedShutdowns, 1);
});

test("accepts a Compose prefix only when immutable source metadata also identifies the old container", () => {
  const result = auditRuntimeLogs(
    controlledShutdownLogs
      .split("\n")
      .map((line) => `postgres-1 | ${line}`)
      .join("\n"),
    validContext,
  );
  assert.equal(result.unexpected.length, 0);
  assert.equal(result.expectedShutdowns, 2);
});

test("rejects a missing shutdown-start marker", () =>
  expectRejected(
    [administratorLine, expectedLine, shutdownCompleteLine].join("\n"),
  ));

test("rejects a missing shutdown-complete marker", () =>
  expectRejected(
    [shutdownStartLine, administratorLine, expectedLine].join("\n"),
  ));

test("rejects a shutdown-complete marker before the start marker", () =>
  expectRejected([shutdownCompleteLine, shutdownStartLine].join("\n")));

test("rejects shutdown markers from different containers", () =>
  expectRejected(
    `${oldContainerId} | ${shutdownStartLine}\n${newContainerId} | ${shutdownCompleteLine}`,
  ));

test("rejects an optional FATAL before shutdown start", () =>
  expectRejected(
    [
      administratorLine.replace(/10:00:04\.500/g, "10:00:03.500"),
      shutdownStartLine,
      shutdownCompleteLine,
    ].join("\n"),
  ));

test("rejects an optional FATAL after shutdown completion", () =>
  expectRejected(
    [
      shutdownStartLine,
      shutdownCompleteLine,
      administratorLine.replace(/10:00:04\.500/g, "10:00:05.750"),
    ].join("\n"),
  ));

test("rejects an optional FATAL outside the stop window", () =>
  expectRejected(
    [
      shutdownStartLine,
      shutdownCompleteLine,
      administratorLine.replace(/10:00:04\.500/g, "10:00:06.500"),
    ].join("\n"),
  ));

test("rejects an optional FATAL from a different container", () =>
  expectRejected(
    `${oldContainerId} | ${shutdownStartLine}\n${newContainerId} | ${administratorLine}\n${oldContainerId} | ${shutdownCompleteLine}`,
  ));

test("rejects a diagnostic attributed to the new container", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    sourceContainerId: newContainerId,
  }));

test("rejects a diagnostic attributed to an unknown container", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    sourceContainerId: unknownContainerId,
  }));

test("rejects a missing source container id", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    sourceContainerId: undefined,
  }));

test("rejects an incomplete old container id", () =>
  expectRejected(shutdownMarkersOnlyLogs, {
    ...validContext,
    oldContainerId: oldContainerId.slice(0, 12),
  }));

test("rejects unchanged old and new container ids", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    newContainerId: oldContainerId,
  }));

test("rejects a missing new container id", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    newContainerId: undefined,
  }));

test("rejects changed volume identity", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    postgresVolumeIdentityAfter: "replacement-volume",
  }));

test("rejects missing volume evidence", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    postgresVolumeIdentityBefore: undefined,
  }));

test("rejects missing PostgreSQL recovery", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    postgresRecovered: false,
  }));

test("rejects missing backend recovery", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    backendRecovered: false,
  }));

test("rejects missing persistence verification", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    persistenceVerified: false,
  }));

test("rejects missing ownership verification", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    ownershipVerified: false,
  }));

test("rejects a lifecycle outside the isolated namespace", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    isolatedNamespace: "foreign_project",
  }));

test("rejects a similar but unsupported shutdown FATAL", () =>
  expectRejected(
    controlledShutdownLogs.replace(
      "the database system is shutting down",
      "database system shutdown in progress",
    ),
  ));

test("rejects the expected message when another FATAL remains", () => {
  const result = auditRuntimeLogs(
    `${controlledShutdownLogs}\n${expectedLine.replace("the database system is shutting down", "password authentication failed")}`,
    validContext,
  );
  assert.ok(result.unexpected.length >= 1);
});

test("rejects a correct sequence with an additional PostgreSQL ERROR", () =>
  expectRejected(
    `${controlledShutdownLogs}\n2026-07-28T10:00:05.500Z 2026-07-28 10:00:05.500 UTC [62] ERROR:  unexpected database error`,
  ));

test("rejects PANIC and corruption diagnostics", () => {
  const result = auditRuntimeLogs(
    `${controlledShutdownLogs}\n2026-07-28T10:00:05.500Z 2026-07-28 10:00:05.500 UTC [62] PANIC: invalid checkpoint record corruption`,
    validContext,
  );
  assert.ok(result.unexpected.length >= 1);
});

test("rejects a Compose service prefix without immutable source identity", () =>
  expectRejected(
    controlledShutdownLogs
      .split("\n")
      .map((line) => `postgres-1 | ${line}`)
      .join("\n"),
    {
      ...validContext,
      sourceContainerId: undefined,
    },
  ));

test("rejects a marker with an unparseable timestamp", () =>
  expectRejected(
    controlledShutdownLogs.replace(
      "2026-07-28T10:00:04.000Z",
      "not-a-timestamp",
    ),
  ));

test("rejects contradictory recreate event order", () =>
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    newPostgresContainerStartedAt: new Date("2026-07-28T10:00:05.000Z"),
  }));

test("rejects a successful cleanup context when a severe primary diagnostic remains", () =>
  expectRejected(
    controlledShutdownLogs.replace(
      "the database system is shutting down",
      "password authentication failed",
    ),
  ));

test("rejects an invalid controlled-stop control-plane evidence object", () =>
  expectRejected(shutdownMarkersOnlyLogs, {
    ...validContext,
    controlledStop: { ...validContext.controlledStop, exitCode: 1 },
  }));

test("rejects an unbound control-plane namespace", () =>
  expectRejected(shutdownMarkersOnlyLogs, {
    ...validContext,
    controlledStop: {
      ...validContext.controlledStop,
      namespace: "foreign_project",
    },
  }));

test("does not require a second expected shutdown FATAL", () => {
  const result = auditRuntimeLogs(
    [shutdownStartLine, administratorLine, shutdownCompleteLine].join("\n"),
    validContext,
  );
  assert.equal(result.unexpected.length, 0);
  assert.equal(result.expectedShutdowns, 1);
});

test("keeps normal-operation and post-recovery diagnostics strict", () => {
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    phase: "normal-operation",
  });
  expectRejected(controlledShutdownLogs, {
    ...validContext,
    phase: "post-recovery",
  });
});

test("accepts complete recreate identity, volume, recovery, persistence and ownership evidence", () => {
  assert.doesNotThrow(() =>
    assertPostgresRecreateEvidence({
      oldContainerId,
      newContainerId,
      oldVolumeName: "volume",
      newVolumeName: "volume",
      oldVolumeCreatedAt: "created",
      newVolumeCreatedAt: "created",
      postgresVolumeIdentityBefore: "volume-identity",
      postgresVolumeIdentityAfter: "volume-identity",
      recreateRequestedAt: requestedAt,
      oldPostgresContainerEndedAt: endedAt,
      newPostgresContainerStartedAt: newStartedAt,
      postgresRecovered: true,
      backendRecovered: true,
      persistenceVerified: true,
      ownershipVerified: true,
    }),
  );
});

const validRecreateEvidence = {
  oldContainerId,
  newContainerId,
  oldVolumeName: "volume",
  newVolumeName: "volume",
  oldVolumeCreatedAt: "created",
  newVolumeCreatedAt: "created",
  postgresVolumeIdentityBefore: "volume-identity",
  postgresVolumeIdentityAfter: "volume-identity",
  recreateRequestedAt: requestedAt,
  oldPostgresContainerEndedAt: endedAt,
  newPostgresContainerStartedAt: newStartedAt,
  postgresRecovered: true,
  backendRecovered: true,
  persistenceVerified: true,
  ownershipVerified: true,
};

for (const [name, override] of [
  ["unchanged container id", { newContainerId: oldContainerId }],
  ["changed volume name", { newVolumeName: "other-volume" }],
  ["changed volume creation time", { newVolumeCreatedAt: "replacement" }],
  [
    "changed inspected volume identity",
    { postgresVolumeIdentityAfter: "other" },
  ],
  [
    "invalid old-container end timestamp",
    { oldPostgresContainerEndedAt: new Date("invalid") },
  ],
  ["contradictory event order", { newPostgresContainerStartedAt: endedAt }],
  ["failed PostgreSQL recovery", { postgresRecovered: false }],
  ["failed backend recovery", { backendRecovered: false }],
  ["failed persistence", { persistenceVerified: false }],
  ["failed ownership", { ownershipVerified: false }],
  ["post-recreate reseed", { seedRanAfterRecreate: true }],
]) {
  test(`recreate evidence rejects ${name}`, () => {
    assert.throws(() =>
      assertPostgresRecreateEvidence({
        ...validRecreateEvidence,
        ...override,
      }),
    );
  });
}

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

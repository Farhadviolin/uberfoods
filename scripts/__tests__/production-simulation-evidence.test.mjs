import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertEvidenceSummaryContract,
  canonicalJson,
  createEvidenceRun,
  finalizeSimulationEvidence,
  normalizeEvidenceError,
  redact,
  safeJsonValue,
  sha256,
} from "../lib/production-simulation-evidence.mjs";

function withEvidence(callback, options = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "uberfoods-evidence-"));
  try {
    return callback(
      root,
      createEvidenceRun({
        repoRoot: root,
        runId: "uberfoods_prod_sim_a1b2c3d4",
        namespace: "uberfoods_prod_sim_a1b2c3d4",
        branch: "test",
        head: "deadbeef",
        ...options,
      }),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function passingFinalState(overrides = {}) {
  return {
    exitCode: 0,
    result: "PASS",
    primaryResult: "PASS",
    cleanupResult: "PASS",
    runtimeLogAudit: {
      result: "PASS",
      classifiedBootstrapShutdownDiagnostics: [],
      classifiedRecreateShutdownDiagnostics: [],
      classifiedExpectedShutdownDiagnostics: [],
      unexplainedFatalDiagnostics: [],
    },
    driverRuntimeLifecycle: { result: "PASS" },
    postgresBootstrap: {
      result: "PASS",
      classifiedBootstrapShutdownDiagnostics: [],
    },
    postgresRecreate: {
      result: "PASS",
      classifiedRecreateShutdownDiagnostics: [],
    },
    secretScan: { result: "PASS" },
    classifiedBootstrapShutdownDiagnostics: [],
    classifiedRecreateShutdownDiagnostics: [],
    classifiedExpectedShutdownDiagnostics: [],
    unexplainedFatalDiagnostics: [],
    ...overrides,
  };
}

function circularSentinelPaths(value, valuePath = "$") {
  if (value === "[Circular]") return [valuePath];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) =>
    circularSentinelPaths(entry, `${valuePath}.${key}`),
  );
}

test("redacts authorization, JWTs, URL credentials, passwords and API keys", () => {
  const output = redact(
    "Authorization: Bearer eyJabc.def.ghi password=secret api_key=key postgresql://user:pass@db/app",
  );
  assert.match(output, /REDACTED/);
  assert.doesNotMatch(output, /secret|eyJabc|user:pass|api_key=key/);
});

test("keeps normal diagnostics readable", () =>
  assert.equal(redact("backend readiness passed"), "backend readiness passed"));

test("redaction preserves JSON syntax around a quoted sensitive value", () => {
  const redacted = redact(JSON.stringify({ message: "password=secret" }));
  assert.equal(JSON.parse(redacted).message, "password=[REDACTED]");
});

test("canonical snapshots produce stable hashes", () => {
  assert.equal(sha256({ b: 2, a: 1 }), sha256({ a: 1, b: 2 }));
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
});

test("serializes repeated bootstrap and recreate diagnostics at every summary path", () =>
  withEvidence((root, evidence) => {
    const bootstrapDiagnostics = [
      {
        classification: "EXPECTED_POSTGRES_INITDB_BOOTSTRAP_SHUTDOWN",
        sequence: { fastShutdown: true, finalReady: true },
      },
    ];
    const recreateDiagnostics = [
      {
        classification: "EXPECTED_CONTROLLED_POSTGRES_SHUTDOWN",
        lifecycle: { oldContainerStopped: true, replacementReady: true },
      },
    ];
    const result = evidence.finalize(
      passingFinalState({
        runtimeLogAudit: {
          result: "PASS",
          classifiedBootstrapShutdownDiagnostics: bootstrapDiagnostics,
          classifiedRecreateShutdownDiagnostics: recreateDiagnostics,
          classifiedExpectedShutdownDiagnostics: recreateDiagnostics,
          unexplainedFatalDiagnostics: [],
        },
        postgresBootstrap: {
          result: "PASS",
          classifiedBootstrapShutdownDiagnostics: bootstrapDiagnostics,
        },
        postgresRecreate: {
          result: "PASS",
          classifiedRecreateShutdownDiagnostics: recreateDiagnostics,
        },
        classifiedBootstrapShutdownDiagnostics: bootstrapDiagnostics,
        classifiedRecreateShutdownDiagnostics: recreateDiagnostics,
        classifiedExpectedShutdownDiagnostics: recreateDiagnostics,
      }),
    );
    const summary = JSON.parse(readFileSync(result.summaryPath, "utf8"));
    assert.deepEqual(
      summary.postgresBootstrap.classifiedBootstrapShutdownDiagnostics,
      bootstrapDiagnostics,
    );
    assert.deepEqual(
      summary.runtimeLogAudit.classifiedRecreateShutdownDiagnostics,
      recreateDiagnostics,
    );
    assert.deepEqual(
      summary.classifiedExpectedShutdownDiagnostics,
      recreateDiagnostics,
    );
    assert.deepEqual(circularSentinelPaths(summary), []);
    assertEvidenceSummaryContract(summary);
  }));

test("finalized evidence is an independent plain-data snapshot", () =>
  withEvidence((root, evidence) => {
    const diagnostic = { nested: { matchedRule: "exact" } };
    const result = evidence.finalize(
      passingFinalState({
        postgresBootstrap: {
          result: "PASS",
          classifiedBootstrapShutdownDiagnostics: [diagnostic],
        },
        classifiedBootstrapShutdownDiagnostics: [diagnostic],
      }),
    );
    diagnostic.nested.matchedRule = "mutated-after-finalization";
    const summary = JSON.parse(readFileSync(result.summaryPath, "utf8"));
    assert.equal(
      summary.postgresBootstrap.classifiedBootstrapShutdownDiagnostics[0].nested
        .matchedRule,
      "exact",
    );
    assert.notStrictEqual(
      summary.postgresBootstrap.classifiedBootstrapShutdownDiagnostics,
      summary.classifiedBootstrapShutdownDiagnostics,
    );
  }));

test("fails closed with exact paths for direct and indirect evidence cycles", () => {
  const direct = {};
  direct.self = direct;
  assert.throws(
    () => safeJsonValue(direct),
    /cyclic evidence reference at \$\.self/,
  );
  const bootstrap = {};
  const recreate = { bootstrap };
  bootstrap.recreate = recreate;
  assert.throws(
    () => safeJsonValue({ bootstrap }),
    /cyclic evidence reference at \$\.bootstrap\.recreate\.bootstrap/,
  );
});

test("a cyclic mandatory evidence object prevents a successful final summary", () =>
  withEvidence((root, evidence) => {
    evidence.summary.postgresBootstrap = {
      result: "PASS",
      classifiedBootstrapShutdownDiagnostics: [],
    };
    evidence.summary.postgresBootstrap.self =
      evidence.summary.postgresBootstrap;
    const diagnostics = [];
    const result = finalizeSimulationEvidence({
      evidence,
      repoRoot: root,
      phase: "final",
      step: "summary",
      stderr: (line) => diagnostics.push(line),
    });
    const fallback = JSON.parse(
      readFileSync(
        path.join(evidence.directory, "summary-finalization-failure.json"),
        "utf8",
      ),
    );
    assert.equal(result.ok, false);
    assert.equal(result.exitCode, 1);
    assert.equal(fallback.summaryStatus, "FAIL");
    assert.match(fallback.normalizedError.message, /cyclic evidence reference/);
    assert.equal(
      fallback.normalizedError.relativePath,
      "$.postgresBootstrap.self",
    );
    assert.equal(diagnostics.length, 1);
  }));

test("rejects circular sentinels and invalid mandatory evidence contracts", () => {
  const valid = {
    runId: "uberfoods_prod_sim_a1b2c3d4",
    namespace: "uberfoods_prod_sim_a1b2c3d4",
    artifactFiles: [],
    ...passingFinalState(),
  };
  assert.doesNotThrow(() => assertEvidenceSummaryContract(valid));
  assert.throws(
    () =>
      assertEvidenceSummaryContract({
        ...valid,
        classifiedRecreateShutdownDiagnostics: "[Circular]",
      }),
    /mandatory evidence array is missing or invalid/,
  );
  assert.throws(
    () =>
      assertEvidenceSummaryContract({
        ...valid,
        runtimeLogAudit: {
          ...valid.runtimeLogAudit,
          classifiedExpectedShutdownDiagnostics: "[Circular]",
        },
      }),
    /mandatory evidence array is missing or invalid/,
  );
  assert.throws(
    () =>
      assertEvidenceSummaryContract({
        ...valid,
        postgresRecreate: { result: "PASS" },
      }),
    /mandatory evidence array is missing or invalid/,
  );
});

test("finalizes a parseable atomic summary once and removes its temporary file", () =>
  withEvidence((root, evidence) => {
    const result = evidence.finalize(
      passingFinalState({ cleanup: { result: "PASS" } }),
    );
    assert.equal(result.ok, true);
    assert.equal(
      JSON.parse(readFileSync(result.summaryPath, "utf8")).result,
      "PASS",
    );
    assert.equal(existsSync(`${result.summaryPath}.tmp`), false);
    assert.throws(() => evidence.finalize({}), /already attempted/);
    assert.equal(path.isAbsolute(result.summaryPath), true);
  }));

test("removes a stale own temporary summary file before the real write", () =>
  withEvidence((root, evidence) => {
    const temporary = path.join(evidence.directory, "summary.json.tmp");
    writeFileSync(temporary, "stale", "utf8");
    const result = evidence.finalize(passingFinalState());
    assert.equal(existsSync(temporary), false);
    assert.equal(
      JSON.parse(readFileSync(result.summaryPath, "utf8")).exitCode,
      0,
    );
  }));

test("normalizes BigInt, Error, causes, secrets and absolute paths", () =>
  withEvidence((root) => {
    const failure = Object.assign(new Error(`password=topsecret at ${root}`), {
      code: "EWRITE",
      syscall: "write",
      cause: "Bearer eyJabc.def.ghi",
    });
    const result = normalizeEvidenceError(failure, {
      repoRoot: root,
      relativePath: path.join(root, "summary.json"),
      phase: "final",
      step: "write",
    });
    assert.equal(result.code, "EWRITE");
    assert.equal(result.relativePath, "summary.json");
    assert.doesNotMatch(
      JSON.stringify({ result, value: BigInt(4) }, (_, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
      /topsecret|eyJabc/,
    );
  }));

test("primary or cleanup failure still produces one valid nonzero summary", () =>
  withEvidence((root, evidence) => {
    evidence.summary.cleanup = { result: "FAIL" };
    const result = finalizeSimulationEvidence({
      evidence,
      repoRoot: root,
      phase: "cleanup",
      step: "cleanup",
      cleanupFailure: new Error("cleanup failed"),
    });
    assert.equal(result.ok, true);
    assert.equal(result.exitCode, 1);
    const summary = JSON.parse(readFileSync(result.result.summaryPath, "utf8"));
    assert.equal(summary.result, "FAIL");
    assert.equal(summary.primaryResult, "PASS");
    assert.equal(summary.cleanupResult, "FAIL");
    assert.equal(summary.runtimeLogAudit.result, "NOT_PROVEN");
    assert.equal(summary.driverRuntimeLifecycle.result, "NOT_PROVEN");
    assert.equal(summary.postgresBootstrap.result, "NOT_PROVEN");
    assert.equal(summary.initialPostgresContainerId, null);
    assert.deepEqual(summary.classifiedBootstrapShutdownDiagnostics, []);
    assert.deepEqual(summary.classifiedRecreateShutdownDiagnostics, []);
    assert.deepEqual(summary.classifiedExpectedShutdownDiagnostics, []);
    assert.deepEqual(summary.unexplainedFatalDiagnostics, []);
  }));

test("driver runtime lifecycle is mandatory for a successful final summary", () =>
  withEvidence((root, evidence) => {
    const state = passingFinalState();
    delete state.driverRuntimeLifecycle;
    const result = finalizeSimulationEvidence({
      evidence,
      repoRoot: root,
      phase: "final",
      step: "summary",
    });
    const summary = JSON.parse(readFileSync(result.result.summaryPath, "utf8"));
    assert.equal(result.exitCode, 1);
    assert.equal(summary.result, "FAIL");
    assert.equal(summary.driverRuntimeLifecycle.result, "NOT_PROVEN");
  }));

test("final summary preserves structured PostgreSQL lifecycle evidence", () =>
  withEvidence((root, evidence) => {
    Object.assign(evidence.summary, {
      postgresBootstrap: {
        result: "PASS",
        initialPostgresContainerId: "c".repeat(64),
        sourcePostgresContainerId: "c".repeat(64),
        freshNamespaceVerified: true,
        classifiedBootstrapShutdownDiagnostics: [
          {
            sourceContainerId: "c".repeat(64),
            classification: "EXPECTED_POSTGRES_INITDB_BOOTSTRAP_SHUTDOWN",
            matchedRule: "postgres-initdb-bootstrap-shutdown",
          },
        ],
      },
      classifiedBootstrapShutdownDiagnostics: [
        {
          sourceContainerId: "c".repeat(64),
          classification: "EXPECTED_POSTGRES_INITDB_BOOTSTRAP_SHUTDOWN",
          matchedRule: "postgres-initdb-bootstrap-shutdown",
        },
      ],
      classifiedRecreateShutdownDiagnostics: [
        {
          sourceContainerId: "a".repeat(64),
          classification: "EXPECTED_CONTROLLED_POSTGRES_SHUTDOWN",
        },
      ],
      oldPostgresContainerId: "a".repeat(64),
      newPostgresContainerId: "b".repeat(64),
      sourcePostgresContainerId: "a".repeat(64),
      oldPostgresContainerEndedAt: "2026-07-28T10:00:06.000Z",
      recreateRequestedAt: "2026-07-28T10:00:00.000Z",
      newPostgresContainerStartedAt: "2026-07-28T10:00:07.000Z",
      shutdownWindowStart: "2026-07-28T10:00:00.000Z",
      shutdownWindowEnd: "2026-07-28T10:00:06.000Z",
      postgresVolumeIdentityBefore: "volume-identity",
      postgresVolumeIdentityAfter: "volume-identity",
      postgresRecovered: true,
      backendRecovered: true,
      persistenceVerified: true,
      ownershipVerified: true,
      classifiedExpectedShutdownDiagnostics: [
        {
          sourceContainerId: "a".repeat(64),
          classification: "EXPECTED_CONTROLLED_POSTGRES_SHUTDOWN",
        },
      ],
      unexplainedFatalDiagnostics: [],
      secretScan: { result: "PASS", checkedRuntimeSecretValues: 8 },
    });
    evidence.summary.cleanup = { result: "PASS" };
    const result = finalizeSimulationEvidence({
      evidence,
      repoRoot: root,
      phase: "final",
      step: "summary",
    });
    const summary = JSON.parse(readFileSync(result.result.summaryPath, "utf8"));
    assert.equal(summary.primaryResult, "PASS");
    assert.equal(summary.cleanupResult, "PASS");
    assert.equal(summary.postgresRecovered, true);
    assert.equal(summary.backendRecovered, true);
    assert.equal(summary.persistenceVerified, true);
    assert.equal(summary.ownershipVerified, true);
    assert.equal(summary.postgresBootstrap.result, "PASS");
    assert.equal(summary.initialPostgresContainerId, "c".repeat(64));
    assert.equal(summary.classifiedBootstrapShutdownDiagnostics.length, 1);
    assert.equal(summary.classifiedRecreateShutdownDiagnostics.length, 1);
    assert.equal(summary.oldPostgresContainerId, "a".repeat(64));
    assert.equal(summary.newPostgresContainerId, "b".repeat(64));
    assert.equal(summary.sourcePostgresContainerId, "a".repeat(64));
    assert.equal(summary.classifiedExpectedShutdownDiagnostics.length, 1);
    assert.deepEqual(summary.unexplainedFatalDiagnostics, []);
    assert.equal(summary.secretScan.result, "PASS");
  }));

test("a realistic port primary failure survives cleanup and reaches the finalizer", () =>
  withEvidence((root, evidence) => {
    const portFailure = new Error(
      "Bind for 127.0.0.1:18100 failed: port is already allocated",
    );
    evidence.summary.primaryFailure = {
      result: "FAIL",
      sanitizedMessage: portFailure.message,
    };
    evidence.summary.cleanup = { result: "PASS" };
    const result = finalizeSimulationEvidence({
      evidence,
      repoRoot: root,
      phase: "database",
      step: "backend-start",
      primaryFailure: portFailure,
    });
    const summary = JSON.parse(readFileSync(result.result.summaryPath, "utf8"));
    assert.equal(result.exitCode, 1);
    assert.match(summary.primaryFailure.sanitizedMessage, /18100/);
    assert.equal(summary.cleanup.result, "PASS");
    assert.equal(summary.runtimeLogAudit.result, "NOT_PROVEN");
  }));

test("summary rename failure writes exactly one redacted fallback and stays nonzero", () =>
  withEvidence((root) => {
    let renameAttempts = 0;
    const evidence = createEvidenceRun({
      repoRoot: root,
      runId: "uberfoods_prod_sim_a1b2c3d4",
      namespace: "uberfoods_prod_sim_a1b2c3d4",
      branch: "test",
      head: "deadbeef",
      fs: {
        renameSync() {
          renameAttempts += 1;
          throw Object.assign(new Error(`password=secret ${root}`), {
            code: "EPERM",
            syscall: "rename",
          });
        },
      },
    });
    const diagnostics = [];
    const result = finalizeSimulationEvidence({
      evidence,
      repoRoot: root,
      phase: "final",
      step: "summary",
      stderr: (line) => diagnostics.push(line),
    });
    const fallbackPath = path.join(
      evidence.directory,
      "summary-finalization-failure.json",
    );
    assert.equal(result.ok, false);
    assert.equal(result.exitCode, 1);
    assert.equal(renameAttempts, 1);
    assert.equal(
      JSON.parse(readFileSync(fallbackPath, "utf8")).summaryStatus,
      "FAIL",
    );
    assert.equal(diagnostics.length, 1);
    assert.doesNotMatch(
      `${readFileSync(fallbackPath, "utf8")}\n${diagnostics.join("\n")}`,
      /password=secret/,
    );
  }));

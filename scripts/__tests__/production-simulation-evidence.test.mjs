import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  renameSync as defaultRenameSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

async function withEvidenceAsync(callback, options = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "uberfoods-evidence-"));
  try {
    return await callback(
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

const writerModuleUrl = pathToFileURL(
  fileURLToPath(new URL("../lib/production-simulation-evidence.mjs", import.meta.url)),
).href;

function runParallelWriter(root, worker, count) {
  const source = `
    const { parentPort, workerData } = require("node:worker_threads");
    (async () => {
      try {
        const { createEvidenceRun } = await import(workerData.moduleUrl);
        const evidence = createEvidenceRun({
          repoRoot: workerData.root,
          runId: "parallel",
          namespace: "parallel",
          branch: "test",
          head: "deadbeef",
        });
        for (let sequence = 0; sequence < workerData.count; sequence += 1)
          evidence.events({
            eventId: workerData.worker + "-" + sequence,
            worker: workerData.worker,
            sequence,
          });
        parentPort.postMessage({ ok: true });
      } catch (error) {
        parentPort.postMessage({
          ok: false,
          code: error?.code,
          syscall: error?.syscall,
          message: error?.message,
        });
      }
    })();
  `;
  return new Promise((resolve, reject) => {
    const instance = new Worker(source, {
      eval: true,
      workerData: {
        moduleUrl: writerModuleUrl,
        root,
        worker: `worker-${worker}`,
        count,
      },
    });
    let result;
    instance.once("message", (message) => {
      result = message;
    });
    instance.once("error", reject);
    instance.once("exit", (code) => {
      if (code !== 0)
        reject(new Error(`parallel evidence worker exited with ${code}`));
      else resolve(result);
    });
  });
}

async function runParallelEvidence(root, workers = 4, eventsPerWorker = 25) {
  const results = await Promise.all(
    Array.from({ length: workers }, (_, worker) =>
      runParallelWriter(root, worker, eventsPerWorker),
    ),
  );
  const target = path.join(
    root,
    "artifacts",
    "production-simulation",
    "parallel",
    "events.jsonl",
  );
  const lines = readFileSync(target, "utf8").split(/\r?\n/).filter(Boolean);
  const parsed = [];
  let invalidJsonLines = 0;
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      invalidJsonLines += 1;
    }
  }
  const expected = new Set(
    Array.from({ length: workers }, (_, worker) =>
      Array.from(
        { length: eventsPerWorker },
        (_, sequence) => `worker-${worker}-${sequence}`,
      ),
    ).flat(),
  );
  const actual = parsed.map((event) => event.eventId);
  const actualSet = new Set(actual);
  const directoryEntries = readdirSync(path.dirname(target));
  return {
    results,
    expected: expected.size,
    persisted: parsed.length,
    invalidJsonLines,
    missing: [...expected].filter((eventId) => !actualSet.has(eventId)),
    duplicates: actual.length - actualSet.size,
    temporaryFiles: directoryEntries.filter((name) =>
      name.startsWith("events.jsonl.tmp-"),
    ),
    lockFiles: directoryEntries.filter((name) => name === "events.jsonl.lock"),
  };
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

test("writes one event atomically without leaving writer artifacts", () =>
  withEvidence((root, evidence) => {
    const target = evidence.events({ eventId: "single" });
    const lines = readFileSync(target, "utf8").trim().split(/\r?\n/);
    assert.deepEqual(JSON.parse(lines[0]).eventId, "single");
    assert.equal(lines.length, 1);
    assert.equal(existsSync(`${target}.lock`), false);
    assert.deepEqual(
      readdirSync(path.dirname(target)).filter((name) =>
        name.startsWith("events.jsonl.tmp-"),
      ),
      [],
    );
  }));

test("serializes 100 parallel events across writer instances for 20 consecutive runs", async () => {
  const roots = [];
  try {
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      const root = mkdtempSync(path.join(tmpdir(), "uberfoods-evidence-stress-"));
      roots.push(root);
      const result = await runParallelEvidence(root);
      assert.equal(result.results.every((worker) => worker.ok), true, JSON.stringify(result));
      assert.equal(result.persisted, 100);
      assert.equal(result.expected, 100);
      assert.equal(result.invalidJsonLines, 0);
      assert.deepEqual(result.missing, []);
      assert.equal(result.duplicates, 0);
      assert.deepEqual(result.temporaryFiles, []);
      assert.deepEqual(result.lockFiles, []);
    }
    console.log(
      "parallel evidence stress: 20/20 PASS, 100 events/run, 0 EPERM, 0 missing, 0 duplicates, 0 temp files",
    );
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
});

test("a failed write releases only its own temporary file and target lock", () =>
  withEvidence((root) => {
    let failNext = true;
    const evidence = createEvidenceRun({
      repoRoot: root,
      runId: "uberfoods_prod_sim_a1b2c3d4",
      namespace: "uberfoods_prod_sim_a1b2c3d4",
      branch: "test",
      head: "deadbeef",
      fs: {
        renameSync(...args) {
          if (failNext) {
            failNext = false;
            throw Object.assign(new Error("controlled evidence rename failure"), {
              code: "EWRITE",
              syscall: "rename",
            });
          }
          return defaultRenameSync(...args);
        },
      },
    });
    const target = path.join(evidence.directory, "events.jsonl");
    const foreignTemporary = `${target}.tmp-foreign`;
    writeFileSync(foreignTemporary, "foreign", "utf8");
    assert.throws(
      () => evidence.events({ eventId: "rejected" }),
      /controlled evidence rename failure/,
    );
    evidence.events({ eventId: "recovered" });
    assert.equal(JSON.parse(readFileSync(target, "utf8")).eventId, "recovered");
    assert.equal(existsSync(foreignTemporary), true);
    assert.equal(existsSync(`${target}.lock`), false);
    assert.deepEqual(
      readdirSync(path.dirname(target)).filter((name) =>
        name.startsWith("events.jsonl.tmp-") && name !== "events.jsonl.tmp-foreign",
      ),
      [],
    );
  }));

test("finalization completes after all accepted synchronous event writes", async () => {
  await withEvidenceAsync(async (root, evidence) => {
    const writes = Array.from({ length: 25 }, (_, sequence) =>
      Promise.resolve().then(() => evidence.events({ eventId: `final-${sequence}` })),
    );
    await Promise.all(writes);
    const result = evidence.finalize(passingFinalState());
    assert.equal(result.ok, true);
    const eventIds = readFileSync(
      path.join(evidence.directory, "events.jsonl"),
      "utf8",
    )
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line).eventId);
    assert.equal(eventIds.length, 25);
    assert.deepEqual(
      [...eventIds].sort(),
      Array.from({ length: 25 }, (_, sequence) => `final-${sequence}`).sort(),
    );
  });
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

test("does not touch a legacy temporary path owned by another operation", () =>
  withEvidence((root, evidence) => {
    const temporary = path.join(evidence.directory, "summary.json.tmp");
    writeFileSync(temporary, "stale", "utf8");
    const result = evidence.finalize(passingFinalState());
    assert.equal(existsSync(temporary), true);
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

test("structured HTTP primary diagnostics survive primary-failure and final summary", () =>
  withEvidence((root, evidence) => {
    const httpDiagnostics = {
      phase: "runtime",
      step: "backend-readiness",
      requestLabel: "backend readiness",
      method: "GET",
      service: "backend",
      url: "http://127.0.0.1:19306/api/health/ready",
      attempt: 6,
      durationMs: 12,
      error: {
        name: "TypeError",
        message: "fetch failed",
        cause: {
          code: "ECONNREFUSED",
          syscall: "connect",
          address: "127.0.0.1",
          port: 19306,
        },
      },
    };
    const primary = {
      phase: "runtime",
      step: "backend-readiness",
      exitCode: 1,
      sanitizedMessage: "backend readiness GET http://127.0.0.1:19306/api/health/ready: TypeError fetch failed cause.code=ECONNREFUSED",
      httpDiagnostics,
      sourceLogFile: "events.jsonl",
    };
    evidence.summary.primaryFailure = primary;
    evidence.write("primary-failure.txt", JSON.stringify(primary, null, 2));
    evidence.summary.cleanup = { result: "PASS" };
    const failure = Object.assign(new Error(primary.sanitizedMessage), {
      httpDiagnostics,
    });
    const result = finalizeSimulationEvidence({
      evidence,
      repoRoot: root,
      phase: "finalization",
      step: "summary",
      primaryFailure: failure,
    });
    const summary = JSON.parse(readFileSync(result.result.summaryPath, "utf8"));
    const primaryArtifact = JSON.parse(
      readFileSync(path.join(evidence.directory, "primary-failure.txt"), "utf8"),
    );
    assert.deepEqual(summary.primaryFailure.httpDiagnostics, httpDiagnostics);
    assert.deepEqual(primaryArtifact.httpDiagnostics, httpDiagnostics);
    assert.equal(summary.primaryResult, "FAIL");
    assert.equal(summary.cleanupResult, "PASS");
    assert.equal(summary.result, "FAIL");
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

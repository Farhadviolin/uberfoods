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
  canonicalJson,
  createEvidenceRun,
  finalizeSimulationEvidence,
  normalizeEvidenceError,
  redact,
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

test("finalizes a parseable atomic summary once and removes its temporary file", () =>
  withEvidence((root, evidence) => {
    evidence.summary.persistenceComparison = { result: "PASS" };
    evidence.summary.runtimeLogAudit = { result: "PASS" };
    const result = evidence.finalize({
      result: "PASS",
      exitCode: 0,
      cleanup: { result: "PASS" },
    });
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
    const result = evidence.finalize({ result: "PASS", exitCode: 0 });
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
    assert.equal(summary.runtimeLogAudit.result, "NOT_PROVEN");
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

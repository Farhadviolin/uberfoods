import { createHash } from "node:crypto";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import path from "node:path";

export function redact(value) {
  return String(value ?? "")
    .replace(
      /(authorization|cookie|set-cookie|password|api[_-]?key|secret)\s*[:=]\s*[^\s,;"']+/gi,
      "$1=[REDACTED]",
    )
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[REDACTED]",
    )
    .replace(/([a-z]+:\/\/)[^\s/@:"']+:[^\s/@:"']+@/gi, "$1[REDACTED]@")
    .replace(
      /postgresql:\/\/[^\s@"']+:[^\s@"']+@[^\s/"']+\/[^\s)"']+/gi,
      "postgresql://[REDACTED]",
    );
}

export function safeJsonValue(value, seen = new WeakSet()) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error)
    return {
      name: value.name,
      message: redact(value.message),
      code: value.code,
    };
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value))
    return value.map((entry) => safeJsonValue(entry, seen));
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      safeJsonValue(entry, seen),
    ]),
  );
}

export function normalizeEvidenceError(
  error,
  { repoRoot, phase, step, operation, relativePath } = {},
) {
  const candidate =
    error && typeof error === "object" ? error : { message: String(error) };
  const relative = (value) => {
    if (!value) return undefined;
    const text = String(value);
    return repoRoot && path.isAbsolute(text)
      ? path.relative(repoRoot, text)
      : text;
  };
  return safeJsonValue({
    name: candidate.name || "Error",
    code: candidate.code,
    syscall: candidate.syscall,
    operation: candidate.operation || operation,
    message: redact(candidate.message || String(error)),
    relativePath: relative(
      candidate.relativePath || candidate.path || relativePath,
    ),
    phase,
    step,
    cause: candidate.cause
      ? normalizeEvidenceError(candidate.cause, { repoRoot })
      : undefined,
  });
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function atomicWrite(target, contents, fs = {}) {
  const api = {
    mkdirSync,
    openSync,
    writeSync,
    closeSync,
    renameSync,
    rmSync,
    ...fs,
  };
  const temporary = `${target}.tmp`;
  let handle;
  try {
    api.mkdirSync(path.dirname(target), { recursive: true });
    api.rmSync(temporary, { force: true });
    handle = api.openSync(temporary, "w");
    api.writeSync(handle, contents, undefined, "utf8");
    api.closeSync(handle);
    handle = undefined;
    api.renameSync(temporary, target);
  } catch (error) {
    if (handle !== undefined) {
      try {
        api.closeSync(handle);
      } catch (closeError) {
        void closeError;
      }
    }
    try {
      api.rmSync(temporary, { force: true });
    } catch (cleanupError) {
      void cleanupError;
    }
    const wrapped = error instanceof Error ? error : new Error(String(error));
    wrapped.operation ??= "atomic-summary-write";
    wrapped.path ??= target;
    throw wrapped;
  }
}

export function createEvidenceRun({
  repoRoot,
  runId,
  namespace,
  branch,
  head,
  fs,
} = {}) {
  const directory = path.join(
    repoRoot,
    "artifacts",
    "production-simulation",
    runId,
  );
  mkdirSync(directory, { recursive: true });
  const files = new Set();
  let finalized = false;
  const write = (name, value) => {
    const target = path.join(directory, name);
    const serialized =
      typeof value === "string"
        ? value
        : JSON.stringify(safeJsonValue(value), null, 2);
    atomicWrite(target, redact(serialized), fs);
    files.add(name);
    return target;
  };
  const events = (event) => {
    const target = path.join(directory, "events.jsonl");
    const prior = files.has("events.jsonl") ? readFileSync(target, "utf8") : "";
    write(
      "events.jsonl",
      `${prior}${JSON.stringify(safeJsonValue({ schemaVersion: 1, runId, namespace, timestamp: new Date().toISOString(), ...event }))}\n`,
    );
  };
  const summary = {
    schemaVersion: 1,
    runId,
    namespace,
    gitBranch: branch,
    gitHead: head,
    startedAt: new Date().toISOString(),
    artifactFiles: [],
  };
  return {
    directory,
    summary,
    write,
    events,
    finalize(extra = {}) {
      if (finalized)
        throw Object.assign(
          new Error("summary finalization already attempted"),
          { operation: "summary-finalize" },
        );
      finalized = true;
      Object.assign(summary, safeJsonValue(extra), {
        endedAt: new Date().toISOString(),
        artifactFiles: [...files],
      });
      const summaryPath = write("summary.json", summary);
      return { ok: true, summaryPath, summaryHash: sha256(summary) };
    },
    writeFinalizationFallback(payload) {
      const target = path.join(directory, "summary-finalization-failure.json");
      writeFileSync(
        target,
        redact(JSON.stringify(safeJsonValue(payload), null, 2)),
        "utf8",
      );
      return target;
    },
  };
}

export function finalizeSimulationEvidence({
  evidence,
  repoRoot,
  phase,
  step,
  primaryFailure,
  cleanupFailure,
  runtimeLogAuditStatus,
  stderr = console.error,
}) {
  const exitCode = primaryFailure || cleanupFailure ? 1 : 0;
  const finalState = {
    exitCode,
    result: exitCode === 0 ? "PASS" : "FAIL",
    primaryFailure: evidence.summary.primaryFailure ?? null,
    cleanupFailure: evidence.summary.cleanupFailure ?? null,
    runtimeLogAudit: evidence.summary.runtimeLogAudit ?? {
      result: runtimeLogAuditStatus || "NOT_PROVEN",
    },
    persistenceComparison: evidence.summary.persistenceComparison ?? {
      result: "NOT_PROVEN",
    },
    postgresRecreate: evidence.summary.postgresRecreate ?? {
      result: "NOT_PROVEN",
    },
  };
  try {
    const result = evidence.finalize(finalState);
    if (!result?.ok || !result.summaryPath)
      throw Object.assign(
        new Error("summary finalizer did not confirm success"),
        { operation: "summary-finalize" },
      );
    return { ok: true, exitCode, result };
  } catch (error) {
    const normalizedError = normalizeEvidenceError(error, {
      repoRoot,
      phase,
      step,
      operation: "summary-finalize",
    });
    const fallback = {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      namespace: evidence.summary.namespace,
      phase,
      step,
      summaryStatus: "FAIL",
      primaryStatus: primaryFailure ? "FAIL" : "PASS",
      cleanupStatus: cleanupFailure
        ? "FAIL"
        : evidence.summary.cleanup?.result || "NOT_PROVEN",
      runtimeLogAuditStatus:
        evidence.summary.runtimeLogAudit?.result ||
        runtimeLogAuditStatus ||
        "NOT_PROVEN",
      normalizedError,
      expectedSummaryPath: "summary.json",
      processExitCode: 1,
    };
    try {
      evidence.writeFinalizationFallback(fallback);
    } catch (fallbackError) {
      stderr(
        `Evidence fallback failure: ${JSON.stringify(normalizeEvidenceError(fallbackError, { repoRoot, phase, step, operation: "summary-finalization-fallback" }))}`,
      );
    }
    stderr(
      `Evidence summary finalization failure: ${JSON.stringify(normalizedError)}`,
    );
    return { ok: false, exitCode: 1, error: normalizedError };
  }
}

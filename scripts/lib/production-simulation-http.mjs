import { redact } from "./production-simulation-evidence.mjs";

const DEFAULT_STARTUP_BACKOFF_MS = [0, 100, 250, 500, 1_000, 1_500];

function optional(value) {
  return value === undefined || value === null || value === ""
    ? undefined
    : value;
}

function normalizeMethod(method) {
  return String(method || "GET").toUpperCase();
}

function sanitizeHost(hostname) {
  return hostname.includes(":") ? `[${hostname}]` : hostname;
}

export function sanitizeHttpUrl(input) {
  try {
    const parsed = new URL(String(input));
    const host = sanitizeHost(parsed.hostname);
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.protocol}//${host}${port}${parsed.pathname || "/"}`;
  } catch {
    return redact(String(input)).replace(/[?#].*$/, "");
  }
}

function errorCause(error) {
  if (error?.cause && typeof error.cause === "object") return error.cause;
  return error;
}

function normalizedCause(error) {
  const cause = errorCause(error);
  return {
    name: optional(cause?.name),
    message: optional(redact(cause?.message || String(cause || ""))),
    code: optional(cause?.code),
    errno: optional(cause?.errno),
    syscall: optional(cause?.syscall),
    address: optional(cause?.address),
    port: optional(cause?.port),
  };
}

export function createHttpDiagnostic(
  error,
  {
    phase,
    step,
    requestLabel,
    method,
    service,
    url,
    attempt = 1,
    durationMs = 0,
    responseStatus,
  } = {},
) {
  const candidate = error instanceof Error ? error : new Error(String(error));
  return {
    phase: optional(phase),
    step: optional(step),
    requestLabel: optional(requestLabel),
    method: normalizeMethod(method),
    service: optional(service),
    url: sanitizeHttpUrl(url),
    attempt,
    durationMs,
    responseStatus: optional(responseStatus),
    error: {
      name: candidate.name || "Error",
      message: redact(candidate.message || String(error)),
      cause: normalizedCause(candidate),
    },
  };
}

export function formatHttpDiagnostic(diagnostic) {
  const cause = diagnostic?.error?.cause || {};
  const fields = [
    ["cause.code", cause.code],
    ["cause.errno", cause.errno],
    ["cause.syscall", cause.syscall],
    ["cause.address", cause.address],
    ["cause.port", cause.port],
  ]
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}=${value}`)
    .join(" ");
  return `${diagnostic.service || "http"} ${diagnostic.requestLabel || "request"} ${diagnostic.method} ${diagnostic.url}: ${diagnostic.error?.name || "Error"} ${diagnostic.error?.message || "request failed"}${fields ? ` ${fields}` : ""}`;
}

export function createHttpTransportError(error, context = {}) {
  const diagnostic = createHttpDiagnostic(error, context);
  const wrapped = new Error(formatHttpDiagnostic(diagnostic), {
    cause: error instanceof Error ? error : undefined,
  });
  wrapped.name = "ProductionSimulationHttpError";
  wrapped.httpDiagnostics = diagnostic;
  return wrapped;
}

function emit(onEvent, event) {
  if (typeof onEvent === "function") onEvent(event);
}

export async function requestHttp({
  url,
  options = {},
  phase,
  step,
  requestLabel,
  method = options.method,
  service,
  attempt = 1,
  fetchImpl = globalThis.fetch,
  onEvent,
} = {}) {
  const normalizedMethod = normalizeMethod(method);
  const context = {
    phase,
    step,
    requestLabel,
    method: normalizedMethod,
    service,
    url,
    attempt,
  };
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      ...options,
      method: normalizedMethod,
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
    const diagnostic = {
      phase,
      step,
      requestLabel,
      method: normalizedMethod,
      service,
      url: sanitizeHttpUrl(url),
      attempt,
      durationMs: Date.now() - startedAt,
      responseStatus: response.status,
    };
    emit(onEvent, {
      type: "http-request",
      status: "HTTP_RESPONSE",
      ...diagnostic,
      sanitizedMessage: `HTTP ${response.status}`,
    });
    return { response, text, json, httpDiagnostics: diagnostic };
  } catch (error) {
    const wrapped = createHttpTransportError(error, {
      ...context,
      durationMs: Date.now() - startedAt,
    });
    emit(onEvent, {
      type: "http-request",
      status: "FAIL",
      exitCode: 1,
      ...wrapped.httpDiagnostics,
      errorName: wrapped.httpDiagnostics.error.name,
      errorMessage: wrapped.httpDiagnostics.error.message,
      errorCause: wrapped.httpDiagnostics.error.cause,
      sanitizedMessage: wrapped.message,
    });
    throw wrapped;
  }
}

function notReadyError(label, result, attempt) {
  const error = new Error(
    `${label} returned a non-ready response on attempt ${attempt}`,
  );
  error.name = "ProductionSimulationReadinessError";
  error.httpDiagnostics = result?.httpDiagnostics
    ? {
        ...result.httpDiagnostics,
        attempt,
        readiness: "NOT_READY",
      }
    : undefined;
  return error;
}

export async function probeWithBoundedRetries({
  label,
  probe,
  isReady = () => true,
  maxAttempts = DEFAULT_STARTUP_BACKOFF_MS.length,
  backoffMs = DEFAULT_STARTUP_BACKOFF_MS,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  if (typeof probe !== "function") throw new TypeError("startup probe requires a probe function");
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1)
    throw new RangeError("startup probe maxAttempts must be a positive integer");

  const delays = Array.from({ length: maxAttempts }, (_, index) =>
    Math.max(0, Number(backoffMs[index] ?? backoffMs.at(-1) ?? 0)),
  );
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await probe(attempt);
      if (await isReady(result)) return result;
      lastError = notReadyError(label, result, attempt);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (attempt < maxAttempts) await sleep(delays[attempt]);
  }

  const exhausted = new Error(
    `${label} startup probe failed after ${maxAttempts} attempts: ${lastError?.message || "not ready"}`,
    { cause: lastError },
  );
  exhausted.name = "ProductionSimulationStartupProbeError";
  exhausted.attempts = maxAttempts;
  exhausted.httpDiagnostics = lastError?.httpDiagnostics;
  throw exhausted;
}

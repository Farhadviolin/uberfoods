import test from "node:test";
import assert from "node:assert/strict";
import {
  probeWithBoundedRetries,
  requestHttp,
} from "../lib/production-simulation-http.mjs";

function refusedFetch({ port = 19301, message = "fetch failed" } = {}) {
  return async () => {
    const cause = Object.assign(new Error(`connect password=hidden ${message}`), {
      code: "ECONNREFUSED",
      errno: -111,
      syscall: "connect",
      address: "127.0.0.1",
      port,
    });
    throw Object.assign(new TypeError("fetch failed"), {
      cause,
    });
  };
}

test("transport diagnostics preserve request context and socket cause fields", async () => {
  const events = [];
  await assert.rejects(
    requestHttp({
      url: "http://user:password@127.0.0.1:19301/api/health/ready?access_token=secret",
      options: {
        method: "POST",
        headers: {
          authorization: "Bearer eyJheader.payload.signature",
          cookie: "session=secret",
        },
        body: JSON.stringify({ password: "secret", token: "secret" }),
      },
      phase: "runtime",
      step: "backend-readiness",
      requestLabel: "backend readiness",
      service: "backend",
      attempt: 2,
      fetchImpl: refusedFetch(),
      onEvent: (event) => events.push(event),
    }),
    (error) => {
      assert.equal(error.name, "ProductionSimulationHttpError");
      assert.equal(error.httpDiagnostics.phase, "runtime");
      assert.equal(error.httpDiagnostics.step, "backend-readiness");
      assert.equal(error.httpDiagnostics.requestLabel, "backend readiness");
      assert.equal(error.httpDiagnostics.method, "POST");
      assert.equal(error.httpDiagnostics.service, "backend");
      assert.equal(
        error.httpDiagnostics.url,
        "http://127.0.0.1:19301/api/health/ready",
      );
      assert.equal(error.httpDiagnostics.attempt, 2);
      assert.equal(error.httpDiagnostics.error.name, "TypeError");
      assert.equal(error.httpDiagnostics.error.message, "fetch failed");
      assert.equal(error.httpDiagnostics.error.cause.code, "ECONNREFUSED");
      assert.equal(error.httpDiagnostics.error.cause.errno, -111);
      assert.equal(error.httpDiagnostics.error.cause.syscall, "connect");
      assert.equal(error.httpDiagnostics.error.cause.address, "127.0.0.1");
      assert.equal(error.httpDiagnostics.error.cause.port, 19301);
      assert.doesNotMatch(
        JSON.stringify(error.httpDiagnostics),
        /hidden|secret|eyJ|Bearer\s+eyJ|session=secret/i,
      );
      assert.equal(events.length, 1);
      assert.equal(events[0].status, "FAIL");
      assert.equal(events[0].errorCause.code, "ECONNREFUSED");
      return true;
    },
  );
});

test("bounded startup probe can overcome a controlled ECONNREFUSED", async () => {
  let calls = 0;
  const events = [];
  const result = await probeWithBoundedRetries({
    label: "backend readiness",
    maxAttempts: 4,
    backoffMs: [0, 0, 0, 0],
    sleep: async () => {},
    probe: (attempt) => {
      calls += 1;
      return requestHttp({
        url: "http://127.0.0.1:19302/api/health/ready",
        phase: "runtime",
        step: "backend-readiness",
        requestLabel: "backend readiness",
        service: "backend",
        attempt,
        fetchImpl:
          calls < 3
            ? refusedFetch({ port: 19302 })
            : async () => new Response(JSON.stringify({ status: "ready" }), { status: 200 }),
        onEvent: (event) => events.push(event),
      });
    },
    isReady: (value) => value.response.status === 200 && value.json.status === "ready",
  });
  assert.equal(result.response.status, 200);
  assert.equal(calls, 3);
  assert.deepEqual(events.map((event) => event.status), ["FAIL", "FAIL", "HTTP_RESPONSE"]);
  assert.deepEqual(events.map((event) => event.attempt), [1, 2, 3]);
});

test("bounded startup probe stops at its fixed limit and retains the last error", async () => {
  let calls = 0;
  const sleeps = [];
  await assert.rejects(
    probeWithBoundedRetries({
      label: "customer listener startup",
      maxAttempts: 3,
      backoffMs: [0, 10, 20],
      sleep: async (milliseconds) => sleeps.push(milliseconds),
      probe: (attempt) => {
        calls += 1;
        return requestHttp({
          url: "http://127.0.0.1:19303/",
          phase: "runtime",
          step: "customer-web",
          requestLabel: "customer listener startup",
          service: "customer-web",
          attempt,
          fetchImpl: refusedFetch({ port: 19303 + attempt }),
        });
      },
    }),
    (error) => {
      assert.equal(error.name, "ProductionSimulationStartupProbeError");
      assert.equal(error.attempts, 3);
      assert.equal(error.httpDiagnostics.error.cause.port, 19306);
      assert.match(error.message, /ECONNREFUSED/);
      return true;
    },
  );
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [10, 20]);
});

test("functional requests are not automatically retried", async () => {
  let calls = 0;
  await assert.rejects(
    requestHttp({
      url: "http://127.0.0.1:19304/api/orders",
      method: "POST",
      requestLabel: "order creation",
      service: "backend",
      fetchImpl: async () => {
        calls += 1;
        throw Object.assign(new TypeError("fetch failed"), {
          cause: Object.assign(new Error("connect"), { code: "ECONNREFUSED" }),
        });
      },
    }),
  );
  assert.equal(calls, 1);
});

test("HTTP status failures remain responses, not transport errors", async () => {
  const events = [];
  const result = await requestHttp({
    url: "http://127.0.0.1:19305/api/auth/driver/login",
    options: { method: "POST", body: "credentials" },
    phase: "auth",
    step: "driver",
    requestLabel: "driver login",
    service: "backend",
    fetchImpl: async () => new Response("unauthorized", { status: 401 }),
    onEvent: (event) => events.push(event),
  });
  assert.equal(result.response.status, 401);
  assert.equal(result.httpDiagnostics.responseStatus, 401);
  assert.equal(events[0].status, "HTTP_RESPONSE");
  assert.equal("error" in events[0], false);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  BACKEND_CONTRACT_PATHS,
  LifecycleError,
  LifecycleTimeoutError,
  collectProcessTree,
  processTreePids,
  stopOwnedProcessTree,
  waitForHttpContract,
} from "../backend-start-lifecycle.mjs";

test("captures wrapper and listener descendants without including unrelated processes", () => {
  const processes = [
    { processId: 10, parentProcessId: 1, name: "harness" },
    { processId: 20, parentProcessId: 10, name: "cmd" },
    { processId: 30, parentProcessId: 20, name: "npm" },
    { processId: 40, parentProcessId: 30, name: "nest" },
    { processId: 50, parentProcessId: 999, name: "foreign-node" },
  ];
  assert.deepEqual(processTreePids(processes, 10), [10, 20, 30, 40]);
  assert.equal(collectProcessTree(processes, 10).some(({ processId }) => processId === 50), false);
});

test("uses the health and readiness contracts and never probes health/readiness", async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(new URL(url).pathname);
    return { status: 200 };
  };
  const result = await waitForHttpContract({ baseUrl: "http://127.0.0.1:1234", fetchImpl, timeoutMs: 100, intervalMs: 1 });
  assert.deepEqual(Object.keys(result).sort(), ["fixture", "health", "readiness"]);
  assert.deepEqual(requested.sort(), ["/api/health", "/api/health/ready", "/api/restaurants/public"]);
  assert.equal(BACKEND_CONTRACT_PATHS.readiness, "/api/health/ready");
  assert.equal(requested.includes("/api/health/readiness"), false);
});

test("successful stop resolves and permits a second start", async () => {
  let reads = 0;
  const stopped = [];
  const result = await stopOwnedProcessTree({
    rootPid: 10,
    port: 1234,
    readProcesses: async () => (++reads < 3)
      ? [{ processId: 10, parentProcessId: 1 }, { processId: 20, parentProcessId: 10 }]
      : [],
    readListenerPids: async () => [],
    signalRoot: async () => {},
    stopOwnPid: async (pid) => { stopped.push(pid); reads = 2; },
    timeoutMs: 100,
    intervalMs: 1,
  });
  assert.deepEqual(result.ownedPids, [10, 20]);
  assert.deepEqual(stopped, [20]);

  let startedAgain = false;
  await stopOwnedProcessTree({
    rootPid: 30,
    port: 1234,
    readProcesses: async () => startedAgain ? [] : [{ processId: 30, parentProcessId: 1 }],
    readListenerPids: async () => [],
    signalRoot: async () => { startedAgain = true; },
    stopOwnPid: async () => {},
    timeoutMs: 100,
    intervalMs: 1,
  });
  assert.equal(startedAgain, true);
});

test("remaining listener fails the stop even when the process tree is gone", async () => {
  let stopped = false;
  await assert.rejects(
    stopOwnedProcessTree({
      rootPid: 10,
      port: 1234,
      readProcesses: async () => stopped ? [] : [{ processId: 10, parentProcessId: 1 }],
      readListenerPids: async () => [999],
      signalRoot: async () => { stopped = true; },
      stopOwnPid: async () => {},
      timeoutMs: 100,
      intervalMs: 1,
    }),
    LifecycleError,
  );
});

test("a process that remains after the bounded fallback fails with a timeout", async () => {
  await assert.rejects(
    stopOwnedProcessTree({
      rootPid: 10,
      port: 1234,
      readProcesses: async () => [{ processId: 10, parentProcessId: 1 }],
      readListenerPids: async () => [],
      signalRoot: async () => {},
      stopOwnPid: async () => {},
      timeoutMs: 20,
      intervalMs: 5,
    }),
    LifecycleTimeoutError,
  );
});

test("health timeout is a failure rather than an ignored error", async () => {
  await assert.rejects(
    waitForHttpContract({
      baseUrl: "http://127.0.0.1:1234",
      fetchImpl: async () => ({ status: 503 }),
      timeoutMs: 20,
      intervalMs: 1,
    }),
    LifecycleTimeoutError,
  );
});

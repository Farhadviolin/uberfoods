import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ChildProcessError, PhaseTimeoutError, fetchWithDeadline, onceAsync, parseComposePort, requireLoopbackBinding, runChildProcess, waitForHealth } from '../driver-login-runtime-utils.mjs';

const runNode = (source, options = {}) => runChildProcess({
  command: process.execPath,
  args: ['-e', source],
  phase: options.phase ?? 'test-child',
  timeoutMs: options.timeoutMs ?? 2_000,
});

test('resolves a child process exactly once after a successful close', async () => {
  const result = await runNode('process.exit(0)');
  assert.equal(result.code, 0);
  assert.equal(result.signal, null);
});

test('rejects a non-zero child close with the phase name', async () => {
  await assert.rejects(runNode('process.exit(7)', { phase: 'nonzero-phase' }), (error) => error instanceof ChildProcessError && error.code === 7 && /nonzero-phase/.test(error.message));
});

test('captures a child signal termination after close (or Windows equivalent exit code)', async () => {
  await assert.rejects(runNode("process.kill(process.pid, 'SIGTERM')", { phase: 'signal-phase' }), (error) => error instanceof ChildProcessError && (error.signal === 'SIGTERM' || error.code !== 0));
});

test('rejects spawn errors instead of leaving a pending promise', async () => {
  await assert.rejects(runChildProcess({ command: 'definitely-not-a-real-executable', phase: 'spawn-phase', timeoutMs: 1_000 }), /spawn-phase/);
});

test('times out with the phase name and terminates the child', async () => {
  await assert.rejects(runNode('setInterval(() => {}, 1000)', { phase: 'timeout-phase', timeoutMs: 50 }), (error) => error instanceof PhaseTimeoutError && /timeout-phase/.test(error.message));
});

test('health polling returns on success and fails with deadline diagnostics', async () => {
  let attempts = 0;
  await waitForHealth({
    baseUrl: 'http://127.0.0.1:1', timeoutMs: 100, intervalMs: 1, requestTimeoutMs: 50,
    fetchImpl: async () => ({ ok: ++attempts === 2, status: 503 }),
  });
  await assert.rejects(waitForHealth({
    baseUrl: 'http://127.0.0.1:1', timeoutMs: 10, intervalMs: 1, requestTimeoutMs: 5,
    fetchImpl: async () => ({ ok: false, status: 503 }),
  }), (error) => error instanceof PhaseTimeoutError && /backend-health/.test(error.message));
});

test('fetch deadline keeps the watchdog referenced until success or timeout', async () => {
  const response = await fetchWithDeadline(async () => ({ ok: true }), 'http://127.0.0.1:1', {}, 100);
  assert.equal(response.ok, true);
  await assert.rejects(fetchWithDeadline(() => new Promise(() => {}), 'http://127.0.0.1:1', {}, 10), /timed out/i);
});

test('onceAsync makes cleanup idempotent without parallel invocation', async () => {
  let calls = 0;
  const cleanup = onceAsync(async () => { calls += 1; });
  await Promise.all([cleanup(), cleanup(), cleanup()]);
  assert.equal(calls, 1);
});

test('parses IPv4 and loopback IPv6 Docker Compose port output', () => {
  assert.deepEqual(parseComposePort('127.0.0.1:49152'), { host: '127.0.0.1', port: 49152 });
  assert.deepEqual(parseComposePort('[::1]:49153'), { host: '::1', port: 49153 });
});

test('parses Docker Compose wildcard formats but refuses public bindings', () => {
  assert.deepEqual(parseComposePort('0.0.0.0:49154'), { host: '0.0.0.0', port: 49154 });
  assert.deepEqual(parseComposePort(':::49155'), { host: '::', port: 49155 });
  assert.throws(() => requireLoopbackBinding(parseComposePort('0.0.0.0:49154'), 'postgres'), /non-loopback/);
  assert.throws(() => requireLoopbackBinding(parseComposePort(':::49155'), 'postgres'), /non-loopback/);
});

test('rejects malformed, empty, multiline, and invalid port output', () => {
  for (const output of ['', '127.0.0.1:0', '127.0.0.1:65536', '49152', '127.0.0.1:49152\n127.0.0.1:49153']) {
    assert.throws(() => parseComposePort(output));
  }
});

test('scopes the Puppeteer download skip to the isolated driver-login Docker build', async () => {
  const [compose, runtimeDockerfile, defaultDockerfile] = await Promise.all([
    readFile(new URL('../../docker-compose.driver-login-local.yml', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/Dockerfile.driver-login-runtime', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/Dockerfile.dev', import.meta.url), 'utf8'),
  ]);

  assert.match(compose, /dockerfile:\s+backend\/Dockerfile\.driver-login-runtime/);
  assert.match(compose, /image:\s+uberfoods-driver-login-runtime:local/);
  assert.match(runtimeDockerfile, /ENV PUPPETEER_SKIP_DOWNLOAD=true/);
  assert.doesNotMatch(defaultDockerfile, /PUPPETEER_SKIP_DOWNLOAD/);
});

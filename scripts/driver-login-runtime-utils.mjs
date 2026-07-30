import { spawn } from 'node:child_process';

const PORT_PATTERN = /^(?<host>127\.0\.0\.1|0\.0\.0\.0|localhost):(?<port>\d+)$|^\[(?<ipv6>[^\]]+)\]:(?<ipv6Port>\d+)$|^(?<bareIpv6>::):(?<bareIpv6Port>\d+)$/;

export class PhaseTimeoutError extends Error {
  constructor(phase, elapsedMs, lastActivity, output) {
    super(`${phase} timed out after ${elapsedMs}ms; last activity: ${lastActivity || 'none'}${output ? `; output: ${output}` : ''}`);
    this.name = 'PhaseTimeoutError';
  }
}

export class ChildProcessError extends Error {
  constructor(phase, message, { code, signal, output } = {}) {
    super(`${phase}: ${message}${output ? `; output: ${output}` : ''}`);
    this.name = 'ChildProcessError';
    this.code = code;
    this.signal = signal;
  }
}

function compactOutput(chunks) {
  return Buffer.concat(chunks).toString('utf8').trim().slice(-8_000);
}

export function runChildProcess({ command, args = [], phase, env, cwd, timeoutMs, diagnostics = () => {} }) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const stdout = [];
    const stderr = [];
    let lastActivity = 'spawned';
    let settled = false;
    let timedOut = false;
    let timer;
    let child;
    const settle = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(result);
    };
    const output = () => [compactOutput(stdout), compactOutput(stderr)].filter(Boolean).join('\n');

    try {
      child = spawn(command, args, { cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      settle(new ChildProcessError(phase, `spawn failed: ${error.message}`));
      return;
    }
    diagnostics({ phase, event: 'spawn', childPid: child.pid, command });
    child.stdout.on('data', (chunk) => { stdout.push(Buffer.from(chunk)); lastActivity = 'stdout'; });
    child.stderr.on('data', (chunk) => { stderr.push(Buffer.from(chunk)); lastActivity = 'stderr'; });
    child.once('error', (error) => settle(new ChildProcessError(phase, `spawn failed: ${error.message}`, { output: output() })));
    child.once('exit', (code, signal) => diagnostics({ phase, event: 'exit', childPid: child.pid, code, signal }));
    child.once('close', (code, signal) => {
      const elapsedMs = Date.now() - startedAt;
      diagnostics({ phase, event: 'close', childPid: child.pid, code, signal, elapsedMs });
      if (timedOut) {
        settle(new PhaseTimeoutError(phase, elapsedMs, lastActivity, output()));
      } else if (code === 0) {
        settle(null, { code, signal, stdout: compactOutput(stdout), stderr: compactOutput(stderr), elapsedMs, childPid: child.pid });
      } else {
        settle(new ChildProcessError(phase, `exited with code ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}`, { code, signal, output: output() }));
      }
    });
    timer = setTimeout(() => {
      timedOut = true;
      lastActivity = `deadline reached after ${timeoutMs}ms (${lastActivity})`;
      diagnostics({ phase, event: 'timeout', childPid: child.pid, elapsedMs: Date.now() - startedAt });
      child.kill();
    }, timeoutMs);
  });
}

export function onceAsync(action) {
  let pending;
  return () => {
    if (!pending) pending = Promise.resolve().then(action);
    return pending;
  };
}

export async function fetchWithDeadline(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([fetchImpl(url, { ...options, signal: controller.signal }), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForHealth({ baseUrl, fetchImpl = fetch, timeoutMs, intervalMs, requestTimeoutMs, diagnostics = () => {} }) {
  const startedAt = Date.now();
  let lastError = 'not attempted';
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchWithDeadline(fetchImpl, `${baseUrl}/api/health`, {}, requestTimeoutMs);
      if (response.ok) return;
      lastError = `health endpoint returned ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    diagnostics({ phase: 'backend-health', event: 'retry', elapsedMs: Date.now() - startedAt, lastActivity: lastError });
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new PhaseTimeoutError('backend-health', Date.now() - startedAt, lastError);
}

export function parseComposePort(output) {
  const value = output.trim();
  if (!value || value.includes('\n')) {
    throw new Error('docker compose port returned no single host binding');
  }

  const match = value.match(PORT_PATTERN);
  if (!match) {
    throw new Error(`docker compose port returned an unsupported binding: ${value}`);
  }

  const host = match.groups.host ?? match.groups.ipv6 ?? match.groups.bareIpv6;
  const port = Number(match.groups.port ?? match.groups.ipv6Port ?? match.groups.bareIpv6Port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`docker compose port returned an invalid port: ${value}`);
  }

  return { host, port };
}

export function requireLoopbackBinding(binding, service) {
  if (binding.host !== '127.0.0.1' && binding.host !== '::1' && binding.host !== 'localhost') {
    throw new Error(`${service} was published on non-loopback address ${binding.host}`);
  }
  return binding;
}

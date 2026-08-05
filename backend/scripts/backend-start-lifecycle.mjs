import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { openSync } from "node:fs";

const execFileAsync = promisify(execFile);

export const BACKEND_CONTRACT_PATHS = Object.freeze({
  health: "/api/health",
  readiness: "/api/health/ready",
  fixture: "/api/restaurants/public",
});

export class LifecycleTimeoutError extends Error {
  constructor(phase, timeoutMs, details = "") {
    super(`${phase} timed out after ${timeoutMs}ms${details ? `: ${details}` : ""}`);
    this.name = "LifecycleTimeoutError";
    this.phase = phase;
    this.timeoutMs = timeoutMs;
  }
}

export class LifecycleError extends Error {
  constructor(message, evidence = {}) {
    super(message);
    this.name = "LifecycleError";
    this.evidence = evidence;
  }
}

export function collectProcessTree(processes, rootPid) {
  const byParent = new Map();
  for (const process of processes) {
    const children = byParent.get(process.parentProcessId) ?? [];
    children.push(process);
    byParent.set(process.parentProcessId, children);
  }

  const tree = [];
  const queue = [rootPid];
  const seen = new Set();
  while (queue.length > 0) {
    const pid = queue.shift();
    if (seen.has(pid)) continue;
    seen.add(pid);
    const process = processes.find((candidate) => candidate.processId === pid);
    if (process) tree.push(process);
    for (const child of byParent.get(pid) ?? []) queue.push(child.processId);
  }
  return tree.sort((left, right) => left.processId - right.processId);
}

export function processTreePids(processes, rootPid) {
  return collectProcessTree(processes, rootPid).map((process) => process.processId);
}

export function parseJsonLines(value) {
  if (!value.trim()) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function assertOwnListener(listenerPids, ownedPids, port) {
  const foreign = listenerPids.filter((pid) => !ownedPids.includes(pid));
  if (foreign.length > 0) {
    throw new LifecycleError(`Port ${port} is owned by a process outside the captured tree.`, {
      port,
      listenerPids,
      ownedPids,
      foreignPids: foreign,
    });
  }
  return listenerPids;
}

export async function waitForHttpContract({
  baseUrl,
  child,
  fetchImpl = fetch,
  timeoutMs = 180_000,
  intervalMs = 250,
  requestTimeoutMs = 5_000,
  onProbe = () => {},
}) {
  const startedAt = Date.now();
  const seen = {};
  const paths = Object.entries(BACKEND_CONTRACT_PATHS);
  while (Date.now() - startedAt < timeoutMs) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new LifecycleError(`Backend process exited before the HTTP contract became ready (exit code ${child.exitCode}).`);
    }
    for (const [name, path] of paths) {
      if (seen[name]) continue;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetchImpl(`${baseUrl}${path}`, { signal: controller.signal });
        onProbe({ name, path, status: response.status, at: new Date().toISOString() });
        if (response.status === 200) seen[name] = new Date().toISOString();
      } catch (error) {
        onProbe({ name, path, error: error instanceof Error ? error.message : String(error) });
      } finally {
        clearTimeout(timer);
      }
    }
    if (Object.keys(seen).length === paths.length) return seen;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new LifecycleTimeoutError("backend health/readiness/fixture", timeoutMs, `seen=${Object.keys(seen).join(",") || "none"}`);
}

async function waitUntil(predicate, { timeoutMs, intervalMs, phase }) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new LifecycleTimeoutError(phase, timeoutMs);
}

export async function stopOwnedProcessTree({
  rootPid,
  port,
  readProcesses,
  readListenerPids,
  signalRoot,
  stopOwnPid,
  timeoutMs = 20_000,
  intervalMs = 250,
  onEvidence = () => {},
}) {
  const before = collectProcessTree(await readProcesses(), rootPid);
  if (before.length === 0) throw new LifecycleError(`Root process ${rootPid} was not found.`);
  const ownedPids = before.map((process) => process.processId);
  onEvidence({ phase: "before-stop", rootPid, ownedPids });

  await signalRoot(rootPid);
  await new Promise((resolve) => setTimeout(resolve, Math.min(500, intervalMs)));

  const stillRunning = async () => {
    const processes = await readProcesses();
    return processes.filter((process) => ownedPids.includes(process.processId));
  };

  let remaining = await stillRunning();
  if (remaining.length > 0) {
    const fallbackPids = remaining
      .map((process) => process.processId)
      .filter((pid) => pid !== rootPid)
      .sort((left, right) => right - left);
    onEvidence({ phase: "fallback", rootPid, fallbackPids });
    for (const pid of fallbackPids) await stopOwnPid(pid);
  }

  await waitUntil(async () => (await stillRunning()).length === 0, {
    timeoutMs,
    intervalMs,
    phase: "owned process tree shutdown",
  });

  const listenerPids = await readListenerPids(port);
  assertOwnListener(listenerPids, [], port);
  onEvidence({ phase: "after-stop", rootPid, ownedPids, listenerPids });
  return { rootPid, ownedPids, listenerPids };
}

function powershellArgs(script) {
  return ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script];
}

export async function readWindowsProcesses() {
  const script = "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine,CreationDate | ConvertTo-Json -Compress";
  const { stdout } = await execFileAsync("powershell.exe", powershellArgs(script), { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  return parseJsonLines(stdout).map((process) => ({
    processId: Number(process.ProcessId),
    parentProcessId: Number(process.ParentProcessId),
    name: process.Name ?? "",
    executablePath: process.ExecutablePath ?? "",
    commandLine: process.CommandLine ?? "",
    creationDate: process.CreationDate ?? "",
  }));
}

export async function readWindowsListenerPids(port) {
  const script = `$rows = @(Get-NetTCPConnection -State Listen -LocalPort ${Number(port)} -ErrorAction SilentlyContinue | Select-Object OwningProcess); $rows | ConvertTo-Json -Compress`;
  const { stdout } = await execFileAsync("powershell.exe", powershellArgs(script), { windowsHide: true, maxBuffer: 1024 * 1024 });
  return parseJsonLines(stdout).map((row) => Number(row.OwningProcess));
}

async function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new LifecycleTimeoutError("npm start wrapper exit", timeoutMs)), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export async function startOfficialBackend({ backendRoot, env, port, logDir, startupTimeoutMs = 180_000, onProbe }) {
  const stdoutPath = `${logDir}/npm-start.stdout.log`;
  const stderrPath = `${logDir}/npm-start.stderr.log`;
  const child = process.platform === "win32"
    ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm.cmd start"], {
      cwd: backendRoot,
      env,
      windowsHide: true,
      detached: false,
      stdio: ["ignore", openSync(stdoutPath, "w"), openSync(stderrPath, "w")],
    })
    : spawn("npm", ["start"], {
      cwd: backendRoot,
      env,
      detached: false,
      stdio: ["ignore", openSync(stdoutPath, "w"), openSync(stderrPath, "w")],
    });

  const rootPid = child.pid;
  if (!rootPid) throw new LifecycleError("npm start did not expose a root PID.");
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const contracts = await waitForHttpContract({ child, baseUrl, timeoutMs: startupTimeoutMs, onProbe });
    return { child, rootPid, baseUrl, contracts, stdoutPath, stderrPath, waitForExit: () => waitForChildExit(child, 30_000) };
  } catch (error) {
    error.backendProcess = { child, rootPid, baseUrl, stdoutPath, stderrPath };
    throw error;
  }
}

export async function stopOfficialBackend({ rootPid, port, onEvidence }) {
  const readProcesses = process.platform === "win32" ? readWindowsProcesses : async () => [];
  const readListenerPids = process.platform === "win32" ? readWindowsListenerPids : async () => [];
  const signalRoot = async (pid) => {
    if (process.platform === "win32") {
      try { process.kill(pid, "SIGINT"); } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    } else {
      process.kill(pid, "SIGINT");
    }
  };
  const stopOwnPid = async (pid) => {
    if (process.platform === "win32") {
      const script = `if (Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue) { Stop-Process -Id ${Number(pid)} }`;
      await execFileAsync("powershell.exe", powershellArgs(script), { windowsHide: true });
    } else {
      try { process.kill(pid, "SIGTERM"); } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    }
  };
  return stopOwnedProcessTree({ rootPid, port, readProcesses, readListenerPids, signalRoot, stopOwnPid, onEvidence });
}

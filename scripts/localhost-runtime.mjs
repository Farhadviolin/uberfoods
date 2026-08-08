#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const stateRoot = path.join(tmpdir(), "UberFoods-localhost-runtime");
const activePath = path.join(stateRoot, "active-session.json");
const fixedPorts = {
  backend: 3000,
  customer: 3102,
  admin: 3002,
  restaurant: 3003,
  driver: 3004,
};
const urls = {
  backend: "http://127.0.0.1:3000",
  customer: "http://127.0.0.1:3102",
  admin: "http://127.0.0.1:3002",
  restaurant: "http://127.0.0.1:3003",
  driver: "http://127.0.0.1:3004",
};
const requiredContainers = ["postgres", "redis", "backend", "customer-web", "admin-panel", "restaurant-web", "driver-web"];

function fail(message) {
  throw new Error(message);
}

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) fail(`git ${args.join(" ")} fehlgeschlagen`);
  return result.stdout.trim();
}

function currentGit() {
  const root = git(["rev-parse", "--show-toplevel"]);
  if (path.resolve(root).toLowerCase() !== repoRoot.toLowerCase()) {
    fail(`Repository-Root stimmt nicht: ${root}`);
  }
  return {
    root,
    head: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]) || "DETACHED",
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

function redact(value) {
  return String(value || "")
    .replace(/(password|secret|token|authorization|cookie)\s*[=:]\s*[^\s,}]+/gi, "$1=[redacted]")
    .replace(/(PAYPAL_|STRIPE_|DATABASE_URL|REDIS_URL|SEED_[A-Z_]+)[^\r\n]*/gi, "$1[redacted]");
}

function local13(args, env = {}) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "local13-session.mjs"), ...args], {
    cwd: repoRoot,
    env: { ...process.env, LOCAL13_FIXED_PORTS: "true", ...env },
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) fail(`local13-session konnte nicht gestartet werden: ${result.error.message}`);
  return {
    status: result.status,
    output: redact(`${result.stdout || ""}${result.stderr || ""}`),
  };
}

function sessionFileFrom(output) {
  const match = output.match(/^LOCAL13_SESSION_FILE=(.+)$/m);
  return match ? match[1].trim() : null;
}

function active() {
  return existsSync(activePath) ? readJson(activePath) : null;
}

function assertActiveSession(session) {
  if (!session?.sessionFile || !existsSync(session.sessionFile)) {
    fail("Aktive Session-Datei fehlt; keine automatische Fremdprozess-Bereinigung");
  }
  const metadata = readJson(session.sessionFile);
  if (!metadata.namespace.startsWith("uberfoods_local13_")) fail("Session-Namespace ist nicht LOCAL13-eigen");
  if (path.resolve(metadata.repoRoot).toLowerCase() !== repoRoot.toLowerCase()) fail("Session-Root stimmt nicht mit dem aktuellen Checkout überein");
  return metadata;
}

async function assertPortFree(port) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  }).catch((error) => {
    if (error?.code === "EADDRINUSE") fail(`Port ${port} ist belegt; PID/CommandLine bleiben unangetastet`);
    throw error;
  });
  await new Promise((resolve) => server.close(resolve));
}

async function assertFixedPortsFree() {
  for (const port of Object.values(fixedPorts)) await assertPortFree(port);
}

async function httpStatus(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(3000) })).status;
  } catch {
    return null;
  }
}

async function verifyHttp() {
  const result = {};
  result.backendHealth = await httpStatus(`${urls.backend}/api/health`);
  result.backendReady = await httpStatus(`${urls.backend}/api/health/ready`);
  for (const key of ["customer", "admin", "restaurant", "driver"]) result[key] = await httpStatus(`${urls[key]}/`);
  if (result.backendHealth !== 200 || result.backendReady !== 200 || ["customer", "admin", "restaurant", "driver"].some((key) => result[key] !== 200)) {
    fail(`HTTP-Vertrag nicht erfüllt: ${JSON.stringify(result)}`);
  }
  return result;
}

function parseLocal13Status(output) {
  try {
    return JSON.parse(output.trim());
  } catch {
    fail(`local13 status ist kein JSON: ${output.slice(-500)}`);
  }
}

function containerStatus(status, service) {
  return status?.containers?.find((row) => row.service === service) || null;
}

function consistency(metadata, status, gitState) {
  const appPortsMatch = Object.entries(fixedPorts).every(([key, port]) => metadata.ports?.[key] === port);
  const containersMatch = requiredContainers.every((service) => {
    const row = containerStatus(status, service);
    return row && row.state === "running" && (!row.health || row.health === "healthy");
  });
  return path.resolve(metadata.repoRoot).toLowerCase() === repoRoot.toLowerCase() &&
    metadata.gitHead === gitState.head && appPortsMatch && containersMatch;
}

function displayTable(metadata, health, status) {
  const rows = [
    ["Backend", fixedPorts.backend, health.backendHealth === 200 && health.backendReady === 200, urls.backend],
    ["Customer", fixedPorts.customer, health.customer === 200, urls.customer],
    ["Admin", fixedPorts.admin, health.admin === 200, urls.admin],
    ["Restaurant", fixedPorts.restaurant, health.restaurant === 200, urls.restaurant],
    ["Driver", fixedPorts.driver, health.driver === 200, urls.driver],
  ];
  console.log("Service     Port  Result  URL");
  for (const [name, port, ok, url] of rows) console.log(`${name.padEnd(10)} ${String(port).padEnd(5)} ${ok ? "PASS" : "FAIL"}    ${url}`);
  console.log("");
  console.log(`RUNTIME_ROOT=${metadata.repoRoot}`);
  console.log(`RUNTIME_HEAD=${metadata.gitHead}`);
  console.log(`SESSION_ID=${metadata.runId}`);
  console.log(`NAMESPACE=${metadata.namespace}`);
  console.log(`CONSISTENT_RUNTIME=${consistency(metadata, status, currentGit()) ? "YES" : "NO"}`);
  console.log(`SESSION_FILE=${metadata.sessionFile}`);
  console.log(`ARTIFACT_ROOT=${metadata.artifactRoot}`);
}

async function up() {
  if (active()) fail(`Eine Localhost-Session ist bereits aktiv: ${active().runId}`);
  const gitState = currentGit();
  await assertFixedPortsFree();
  const result = local13(["start"]);
  const sessionFile = sessionFileFrom(result.output);
  if (result.status !== 0 || !sessionFile) {
    const recoverable = sessionFileFrom(result.output);
    if (recoverable) local13(["cleanup", "--session-file", recoverable]);
    fail(`LOCAL13-Start fehlgeschlagen (Exit ${result.status}): ${result.output.slice(-1200)}`);
  }
  const metadata = readJson(sessionFile);
  if (metadata.gitHead !== gitState.head || path.resolve(metadata.repoRoot).toLowerCase() !== repoRoot.toLowerCase()) {
    local13(["cleanup", "--session-file", sessionFile]);
    fail("LOCAL13-Session wurde nicht aus demselben Root/HEAD erzeugt");
  }
  const health = await verifyHttp();
  const status = parseLocal13Status(local13(["status", "--session-file", sessionFile]).output);
  writeJson(activePath, {
    runId: metadata.runId,
    sessionFile,
    repoRoot: metadata.repoRoot,
    gitHead: metadata.gitHead,
    namespace: metadata.namespace,
    createdAt: metadata.createdAt,
  });
  console.log("LOCALHOST_UP=PASS");
  displayTable(metadata, health, status);
}

async function status() {
  const gitState = currentGit();
  const marker = active();
  console.log(`CURRENT_GIT_ROOT=${gitState.root}`);
  console.log(`CURRENT_GIT_HEAD=${gitState.head}`);
  if (!marker) {
    console.log("SESSION_ID=NONE");
    console.log("CONSISTENT_RUNTIME=NO");
    process.exitCode = 1;
    return;
  }
  const metadata = assertActiveSession(marker);
  const statusResult = local13(["status", "--session-file", metadata.sessionFile]);
  if (statusResult.status !== 0) fail(`LOCAL13-Status fehlgeschlagen: ${statusResult.output.slice(-800)}`);
  const runtimeStatus = parseLocal13Status(statusResult.output);
  const health = await verifyHttp().catch(() => ({ backendHealth: null, backendReady: null, customer: null, admin: null, restaurant: null, driver: null }));
  console.log(`RUNTIME_ROOT=${metadata.repoRoot}`);
  console.log(`RUNTIME_HEAD=${metadata.gitHead}`);
  console.log(`SESSION_ID=${metadata.runId}`);
  console.log(`NAMESPACE=${metadata.namespace}`);
  console.log(`CONSISTENT_RUNTIME=${consistency(metadata, runtimeStatus, gitState) && Object.values(health).every((value) => value === 200) ? "YES" : "NO"}`);
  console.log("");
  console.log("Service     Container ID                         Port  State       Health");
  for (const [service, port] of [["backend", 3000], ["customer-web", 3102], ["admin-panel", 3002], ["restaurant-web", 3003], ["driver-web", 3004]]) {
    const row = containerStatus(runtimeStatus, service);
    console.log(`${service.padEnd(12)} ${(row?.id || "-").padEnd(38)} ${String(port).padEnd(5)} ${(row?.state || "DOWN").padEnd(11)} ${row?.health || "-"}`);
  }
  for (const service of ["postgres", "redis"]) {
    const row = containerStatus(runtimeStatus, service);
    console.log(`${service.padEnd(12)} ${(row?.id || "-").padEnd(38)} ${(service === "postgres" ? "internal" : "internal").padEnd(5)} ${(row?.state || "DOWN").padEnd(11)} ${row?.health || "-"}`);
  }
  console.log(`SESSION_FILE=${metadata.sessionFile}`);
  if (!consistency(metadata, runtimeStatus, gitState)) process.exitCode = 1;
}

async function down() {
  const marker = active();
  if (!marker) {
    console.log("LOCALHOST_DOWN=PASS");
    console.log("SESSION_ID=NONE");
    return;
  }
  const metadata = assertActiveSession(marker);
  const gitState = currentGit();
  if (metadata.gitHead !== gitState.head) fail("Git-HEAD hat sich seit dem Start geändert; Session bleibt unangetastet");
  const result = local13(["cleanup", "--session-file", metadata.sessionFile]);
  if (result.status !== 0) fail(`LOCAL13-Cleanup fehlgeschlagen: ${result.output.slice(-1000)}`);
  await assertFixedPortsFree();
  unlinkSync(activePath);
  console.log("LOCALHOST_DOWN=PASS");
  console.log(`SESSION_ID=${metadata.runId}`);
  console.log("Ports 3000, 3102, 3002, 3003, 3004 sind frei.");
}

async function restart() {
  await down();
  await up();
}

const command = process.argv[2] || "help";
try {
  if (command === "up") await up();
  else if (command === "status") await status();
  else if (command === "down") await down();
  else if (command === "restart") await restart();
  else {
    console.log("Usage: node scripts/localhost-runtime.mjs <up|status|down|restart>");
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`LOCALHOST_RUNTIME_FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const composeFile = path.join(repoRoot, "docker-compose.production-sim.yml");
const requiredServices = [
  "postgres",
  "redis",
  "backend",
  "customer-web",
  "admin-panel",
  "restaurant-web",
  "driver-web",
];

function fail(message) {
  throw new Error(message);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function commandOutput(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.error) fail(`${command} konnte nicht gestartet werden: ${result.error.message}`);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0 && !options.allowFailure) {
    fail(`${command} ${args.join(" ")} fehlgeschlagen (Exit ${result.status})`);
  }
  return { ...result, output };
}

function gitValue(args) {
  return commandOutput("git", args).stdout.trim();
}

function safeRunId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `local13_${stamp}_${randomBytes(4).toString("hex")}`;
}

function strongValue(prefix) {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

function safeSessionDir(runId) {
  const configured = process.env.LOCAL13_SESSION_ROOT;
  const root = configured
    ? path.resolve(configured)
    : path.join(os.tmpdir(), "UberFoods-local13-080");
  mkdirSync(root, { recursive: true });
  return path.join(root, runId);
}

async function allocatePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolve) => server.close(resolve));
  if (!port) fail("Dynamischer Port konnte nicht ermittelt werden");
  return port;
}

async function allocatePorts() {
  const ports = [];
  while (ports.length < 5) {
    const port = await allocatePort();
    if (!ports.includes(port)) ports.push(port);
  }
  return ports;
}

function writePrivateJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // Windows does not consistently implement POSIX mode bits.
  }
  if (process.platform === "win32") {
    const user = process.env.USERDOMAIN && process.env.USERNAME
      ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
      : process.env.USERNAME;
    if (user) {
      commandOutput(
        "icacls",
        [filePath, "/inheritance:r", "/grant:r", `${user}:(R,W)`],
        { allowFailure: true, stdio: "ignore" },
      );
    }
  }
}

function composeArgs(namespace, args) {
  return ["compose", "-p", namespace, "-f", composeFile, ...args];
}

function compose(namespace, args, env, options = {}) {
  return commandOutput("docker", composeArgs(namespace, args), {
    env,
    allowFailure: options.allowFailure,
    stdio: options.stdio,
  });
}

function buildEnvironment(credentials, session) {
  return {
    PROD_SIM_POSTGRES_PASSWORD: credentials.internal.postgresPassword,
    PROD_SIM_JWT_SECRET: credentials.internal.jwtSecret,
    PROD_SIM_JWT_REFRESH_SECRET: credentials.internal.jwtRefreshSecret,
    PROD_SIM_DRIVER_PASSWORD: credentials.roles.driverA.password,
    PROD_SIM_DRIVER_B_PASSWORD: credentials.roles.driverB.password,
    TEST_DRIVER_PASSWORD: credentials.roles.driverA.password,
    PROD_SIM_RESTAURANT_PASSWORD: credentials.roles.restaurant.password,
    PROD_SIM_SEED_CUSTOMER_PASSWORD: credentials.internal.seedCustomerPassword,
    PROD_SIM_SEED_RESTAURANT_PASSWORD: credentials.internal.seedRestaurantPassword,
    PROD_SIM_SEED_DRIVER_PASSWORD: credentials.internal.seedDriverPassword,
    PROD_SIM_ADMIN_EMAIL: credentials.roles.admin.email,
    PROD_SIM_ADMIN_PASSWORD: credentials.roles.admin.password,
    ADMIN_TEST_EMAIL: credentials.roles.admin.email,
    ADMIN_TEST_PASSWORD: credentials.roles.admin.password,
    PROD_SIM_ALLOWED_ORIGINS: Object.values(session.urls).join(","),
    PROD_SIM_BACKEND_PORT: String(session.ports.backend),
    PROD_SIM_CUSTOMER_PORT: String(session.ports.customer),
    PROD_SIM_ADMIN_PORT: String(session.ports.admin),
    PROD_SIM_RESTAURANT_PORT: String(session.ports.restaurant),
    PROD_SIM_DRIVER_PORT: String(session.ports.driver),
  };
}

function createCredentials(runId) {
  const suffix = randomBytes(8).toString("hex");
  const internal = {
    postgresPassword: strongValue("local13_postgres"),
    jwtSecret: strongValue("local13_jwt"),
    jwtRefreshSecret: strongValue("local13_refresh"),
    seedCustomerPassword: strongValue("local13_seed_customer"),
    seedRestaurantPassword: strongValue("local13_seed_restaurant"),
    seedDriverPassword: strongValue("local13_seed_driver"),
  };
  return {
    runId,
    roles: {
      customer: {
        email: "customer@uberfoods.local",
        password: internal.seedCustomerPassword,
      },
      admin: {
        email: `local13-admin-${suffix}@example.test`,
        password: strongValue("local13_admin"),
      },
      restaurant: {
        email: "ci-restaurant@example.test",
        password: strongValue("local13_restaurant"),
      },
      driverA: {
        email: "testdriver@example.com",
        password: strongValue("local13_driver_a"),
      },
      driverB: {
        email: "production-sim-driver-b@example.test",
        password: strongValue("local13_driver_b"),
      },
    },
    internal,
  };
}

function sanitizeText(value, credentials) {
  let text = String(value ?? "");
  const secretValues = [
    ...Object.values(credentials.roles).flatMap((role) => [role.email, role.password]),
    ...Object.values(credentials.internal),
  ];
  for (const secret of secretValues) {
    if (secret) text = text.split(secret).join("[redacted]");
  }
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .replace(/(password|secret|token|cookie|authorization)\s*[=:]\s*[^\s,}]+/gi, "$1=[redacted]");
}

function metadataPath() {
  return argValue("--session-file") || process.env.LOCAL13_SESSION_FILE;
}

function loadSession() {
  const filePath = metadataPath();
  if (!filePath) fail("LOCAL13_SESSION_FILE oder --session-file ist erforderlich");
  if (!existsSync(filePath)) fail(`Session-Datei nicht gefunden: ${filePath}`);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function loadCredentials(session) {
  if (!existsSync(session.credentialBundlePath)) {
    fail(`Credential-Bundle nicht gefunden: ${session.credentialBundlePath}`);
  }
  return JSON.parse(readFileSync(session.credentialBundlePath, "utf8"));
}

function containerRows(namespace, env) {
  const result = compose(namespace, ["ps", "--format", "json"], env, { allowFailure: true });
  return result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function updateSession(session) {
  writePrivateJson(session.sessionFile, session);
}

async function prepare() {
  const runId = argValue("--run-id") || safeRunId();
  const sessionDir = safeSessionDir(runId);
  mkdirSync(sessionDir, { recursive: true });
  const artifactRoot = path.join(os.tmpdir(), "UberFoods-local13-080-artifacts", runId);
  mkdirSync(path.join(artifactRoot, "screenshots"), { recursive: true });
  const [backend, customer, admin, restaurant, driver] = await allocatePorts();
  const sessionFile = path.join(sessionDir, "session.json");
  const credentialBundlePath = path.join(sessionDir, "credentials.json");
  const credentials = createCredentials(runId);
  const session = {
    runId,
    namespace: `uberfoods_local13_${runId.replace(/[^a-z0-9_]/gi, "_").toLowerCase()}`,
    repoRoot,
    composeFile,
    branch: gitValue(["branch", "--show-current"]),
    gitHead: gitValue(["rev-parse", "HEAD"]),
    sessionFile,
    credentialBundlePath,
    artifactRoot,
    ports: { backend, customer, admin, restaurant, driver },
    urls: {
      backend: `http://127.0.0.1:${backend}`,
      customer: `http://127.0.0.1:${customer}`,
      admin: `http://127.0.0.1:${admin}`,
      restaurant: `http://127.0.0.1:${restaurant}`,
      driver: `http://127.0.0.1:${driver}`,
    },
    services: requiredServices.map((service) => ({ service, containerId: null, health: "pending" })),
    startCommands: {
      prepare: `node scripts/local13-session.mjs prepare --run-id ${runId}`,
      start: "node scripts/local13-session.mjs start --session-file <session-file>",
      status: "node scripts/local13-session.mjs status --session-file <session-file>",
      browser: "node scripts/local13-browser-acceptance.mjs --session-file <session-file>",
      cleanup: "node scripts/local13-session.mjs cleanup --session-file <session-file>",
    },
    createdAt: new Date().toISOString(),
  };
  writePrivateJson(credentialBundlePath, credentials);
  updateSession(session);
  const env = buildEnvironment(credentials, session);
  compose(session.namespace, ["config", "--quiet"], env);
  console.log(`LOCAL13_SESSION_FILE=${sessionFile}`);
  console.log(`LOCAL13_CREDENTIAL_BUNDLE=${credentialBundlePath}`);
  console.log(`LOCAL13_ARTIFACT_ROOT=${artifactRoot}`);
  console.log(`LOCAL13_NAMESPACE=${session.namespace}`);
  console.log(`LOCAL13_URL_BACKEND=${session.urls.backend}`);
  console.log(`LOCAL13_URL_CUSTOMER=${session.urls.customer}`);
  console.log(`LOCAL13_URL_ADMIN=${session.urls.admin}`);
  console.log(`LOCAL13_URL_RESTAURANT=${session.urls.restaurant}`);
  console.log(`LOCAL13_URL_DRIVER=${session.urls.driver}`);
  return session;
}

async function start() {
  const session = metadataPath() ? loadSession() : await prepare();
  const credentials = loadCredentials(session);
  const env = buildEnvironment(credentials, session);
  compose(session.namespace, ["build"], env, { stdio: "inherit" });
  compose(session.namespace, ["up", "-d", "--wait", "postgres", "redis"], env, { stdio: "inherit" });
  compose(session.namespace, ["run", "--rm", "migration"], env, { stdio: "inherit" });
  compose(session.namespace, ["run", "--rm", "seed"], env, { stdio: "inherit" });
  compose(session.namespace, ["run", "--rm", "tooling", "node", "scripts/create-test-restaurant.js"], env, { stdio: "inherit" });
  compose(session.namespace, ["run", "--rm", "tooling", "node", "scripts/create-test-driver.js"], env, { stdio: "inherit" });
  compose(session.namespace, ["run", "--rm", "tooling", "node", "scripts/create-production-sim-driver-b.js"], env, { stdio: "inherit" });
  compose(
    session.namespace,
    ["run", "--rm", "-e", "ADMIN_TEST_EMAIL", "-e", "ADMIN_TEST_PASSWORD", "tooling", "node", "scripts/create-test-admin.js"],
    env,
    { stdio: "inherit" },
  );
  compose(session.namespace, ["up", "-d", "--wait", "backend", "customer-web", "admin-panel", "restaurant-web", "driver-web"], env, { stdio: "inherit" });
  const rows = containerRows(session.namespace, env);
  session.services = requiredServices.map((service) => {
    const row = rows.find((candidate) => candidate.Service === service || candidate.Name?.includes(`-${service}-`));
    return {
      service,
      containerId: row?.ID || null,
      name: row?.Name || null,
      state: row?.State || null,
      health: row?.Health || null,
      port: ({
        postgres: null,
        redis: null,
        backend: session.ports.backend,
        "customer-web": session.ports.customer,
        "admin-panel": session.ports.admin,
        "restaurant-web": session.ports.restaurant,
        "driver-web": session.ports.driver,
      })[service] || null,
    };
  });
  session.startedAt = new Date().toISOString();
  updateSession(session);
  console.log(`LOCAL13_SESSION_FILE=${session.sessionFile}`);
  console.log(`LOCAL13_CREDENTIAL_BUNDLE=${session.credentialBundlePath}`);
  console.log(`LOCAL13_NAMESPACE=${session.namespace}`);
  for (const [name, url] of Object.entries(session.urls)) console.log(`LOCAL13_URL_${name.toUpperCase()}=${url}`);
  console.log(`LOCAL13_STATUS_COMMAND=node scripts/local13-session.mjs status --session-file ${session.sessionFile}`);
  console.log("LOCAL13_START=PASS");
}

function status() {
  const session = loadSession();
  const credentials = loadCredentials(session);
  const env = buildEnvironment(credentials, session);
  const rows = containerRows(session.namespace, env);
  const result = {
    runId: session.runId,
    namespace: session.namespace,
    gitHead: session.gitHead,
    ports: session.ports,
    urls: session.urls,
    containers: rows.map((row) => ({
      service: row.Service,
      name: row.Name,
      id: row.ID,
      state: row.State,
      health: row.Health || null,
      ports: row.Publishers?.map((publisher) => ({ published: publisher.PublishedPort, target: publisher.TargetPort })) || [],
    })),
    credentialBundlePath: session.credentialBundlePath,
    credentialBundleExists: existsSync(session.credentialBundlePath),
  };
  console.log(JSON.stringify(result, null, 2));
}

function verifyNamespaceOwnership(namespace, session) {
  if (!namespace.startsWith("uberfoods_local13_")) fail("Cleanup verweigert: Namespace ist nicht LOCAL-13-eigen");
  if (path.resolve(session.repoRoot) !== path.resolve(repoRoot)) fail("Cleanup verweigert: Repository-Scope stimmt nicht");
}

function cleanup() {
  const session = loadSession();
  verifyNamespaceOwnership(session.namespace, session);
  const credentials = loadCredentials(session);
  const env = buildEnvironment(credentials, session);
  const down = compose(session.namespace, ["down", "--volumes", "--remove-orphans"], env, { allowFailure: true, stdio: "inherit" });
  const containers = commandOutput("docker", ["ps", "-aq", "--filter", `label=com.docker.compose.project=${session.namespace}`], { allowFailure: true }).stdout.trim().split(/\r?\n/).filter(Boolean);
  const networks = commandOutput("docker", ["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${session.namespace}`], { allowFailure: true }).stdout.trim().split(/\r?\n/).filter(Boolean);
  const volumes = commandOutput("docker", ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${session.namespace}`], { allowFailure: true }).stdout.trim().split(/\r?\n/).filter(Boolean);
  if (containers.length || networks.length || volumes.length) {
    fail("Cleanup ließ eigene Docker-Ressourcen zurück");
  }
  rmSync(session.credentialBundlePath, { force: false });
  const credentialBundleExists = existsSync(session.credentialBundlePath);
  const cleanup = {
    result: down.status === 0 && !credentialBundleExists ? "PASS" : "FAIL",
    namespace: session.namespace,
    containers: containers.length,
    networks: networks.length,
    volumes: volumes.length,
    credentialBundlePath: session.credentialBundlePath,
    credentialBundleExists,
    completedAt: new Date().toISOString(),
  };
  mkdirSync(session.artifactRoot, { recursive: true });
  writeFileSync(path.join(session.artifactRoot, "cleanup.json"), `${JSON.stringify(cleanup, null, 2)}\n`, "utf8");
  session.cleanup = cleanup;
  updateSession(session);
  console.log(JSON.stringify(cleanup, null, 2));
  if (cleanup.result !== "PASS") process.exitCode = 1;
}

const command = process.argv[2] || "help";
try {
  if (command === "prepare") await prepare();
  else if (command === "start") await start();
  else if (command === "status") status();
  else if (command === "cleanup") cleanup();
  else {
    console.log("Usage: node scripts/local13-session.mjs <prepare|start|status|cleanup> [--session-file <path>] [--run-id <id>]");
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`LOCAL13_SESSION_FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

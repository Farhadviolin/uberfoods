import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";
import {
  collectProcessTree,
  readWindowsListenerPids,
  readWindowsProcesses,
  startOfficialBackend,
  stopOfficialBackend,
} from "./backend-start-lifecycle.mjs";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, "..");
const packageRoot = path.resolve(backendRoot, "..");
const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const resourcePrefix = `p1-local03-067-${runId}`;
const evidenceDir = path.join(process.env.TEMP ?? "/tmp", resourcePrefix);
mkdirSync(evidenceDir, { recursive: true });

const SEED_ENV = {
  SEED_CUSTOMER_PASSWORD: "local03-067-customer-runtime-only",
  SEED_RESTAURANT_PASSWORD: "local03-067-restaurant-runtime-only",
  SEED_DRIVER_PASSWORD: "local03-067-driver-runtime-only",
};

function redact(value) {
  return String(value)
    .replaceAll(/postgresql:\/\/[^@]+@/g, "postgresql://<redacted>@")
    .replaceAll(/redis:\/\/[^@]+@/g, "redis://<redacted>@");
}

async function run(command, args, options = {}) {
  const result = await execFileAsync(command, args, {
    cwd: options.cwd ?? packageRoot,
    env: options.env ?? process.env,
    windowsHide: true,
    maxBuffer: options.maxBuffer ?? 12 * 1024 * 1024,
  });
  return {
    stdout: redact(result.stdout),
    stderr: redact(result.stderr),
    code: 0,
  };
}

async function runAllowFailure(command, args, options = {}) {
  try {
    return await run(command, args, options);
  } catch (error) {
    return {
      stdout: redact(error.stdout ?? ""),
      stderr: redact(error.stderr ?? error.message ?? ""),
      code: error.code ?? 1,
    };
  }
}

async function docker(args, allowFailure = false) {
  return allowFailure ? runAllowFailure("docker", args) : run("docker", args);
}

async function npmRun(script, env) {
  if (process.platform === "win32") {
    return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm.cmd run ${script}`], { cwd: backendRoot, env });
  }
  return run("npm", ["run", script], { cwd: backendRoot, env });
}

async function npmRunWithWindowsFileLockRetry(script, env) {
  const attempts = process.platform === "win32" && script === "prisma:generate" ? 6 : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await npmRun(script, env);
    } catch (error) {
      const retryable = /EPERM: operation not permitted, unlink .*query_engine-windows\.dll\.node/i.test(error.message ?? "");
      if (!retryable || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }
  throw new Error(`Unreachable retry state for ${script}.`);
}

function commandSummary(label, result) {
  const lastLine = [...result.stdout.split(/\r?\n/), ...result.stderr.split(/\r?\n/)]
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1) ?? "";
  return { label, exitCode: result.code, lastLine };
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForContainerHealth(name, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const inspection = await docker(["inspect", name]);
    const state = JSON.parse(inspection.stdout)[0]?.State;
    if (state?.Health?.Status === "healthy") return;
    if (state?.Status !== "running") throw new Error(`${name} stopped before becoming healthy.`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${name} did not become healthy within ${timeoutMs}ms.`);
}

async function hostPort(name, containerPort) {
  const result = await docker(["port", name, String(containerPort) + "/tcp"]);
  const match = result.stdout.trim().match(/:(\d+)$/);
  if (!match) throw new Error(`Could not resolve loopback port for ${name}.`);
  return Number(match[1]);
}

async function createResources(label) {
  const network = `${resourcePrefix}-${label}-network`;
  const volume = `${resourcePrefix}-${label}-pgdata`;
  const postgres = `${resourcePrefix}-${label}-postgres`;
  const redis = `${resourcePrefix}-${label}-redis`;
  await docker(["network", "create", network]);
  await docker(["volume", "create", volume]);
  await docker([
    "run", "--detach", "--name", postgres, "--network", network,
    "--env", "POSTGRES_USER=local03", "--env", "POSTGRES_PASSWORD=local03-067-db-runtime-only",
    "--env", `POSTGRES_DB=local03_067_${label}_${runId}`,
    "--volume", `${volume}:/var/lib/postgresql/data`, "--publish", "127.0.0.1::5432",
    "--health-cmd", `pg_isready -U local03 -d local03_067_${label}_${runId}`,
    "--health-interval", "2s", "--health-timeout", "3s", "--health-retries", "30", "postgres:15-alpine",
  ]);
  await docker([
    "run", "--detach", "--name", redis, "--network", network, "--publish", "127.0.0.1::6379",
    "--health-cmd", "redis-cli ping", "--health-interval", "2s", "--health-timeout", "3s", "--health-retries", "30", "redis:7-alpine",
  ]);
  await waitForContainerHealth(postgres);
  await waitForContainerHealth(redis);
  const pgPort = await hostPort(postgres, 5432);
  const redisPort = await hostPort(redis, 6379);
  const database = `local03_067_${label}_${runId}`;
  return {
    label,
    network,
    volume,
    postgres,
    redis,
    pgPort,
    redisPort,
    database,
    databaseUrl: `postgresql://local03:local03-067-db-runtime-only@127.0.0.1:${pgPort}/${database}?schema=public`,
    ids: {
      postgres: (await docker(["inspect", "--format", "{{.Id}}", postgres])).stdout.trim(),
      redis: (await docker(["inspect", "--format", "{{.Id}}", redis])).stdout.trim(),
    },
  };
}

async function applicationTableCount(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'");
    return result.rows[0].count;
  } finally {
    await pool.end();
  }
}

async function snapshot(databaseUrl) {
  const result = await run(process.execPath, [path.join(scriptDir, "read-seed-snapshot.mjs")], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    maxBuffer: 4 * 1024 * 1024,
  });
  return JSON.parse(result.stdout);
}

function assertEqual(left, right, label) {
  if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(`${label} mismatch.`);
}

async function migrationStatus(env) {
  const result = await npmRun("prisma:migrate:status", env);
  if (result.code !== 0 || !/up to date|Database schema is up to date/i.test(`${result.stdout}\n${result.stderr}`)) {
    throw new Error(`Migration status was not clean: ${result.lastLine ?? result.stderr}`);
  }
  return commandSummary("prisma:migrate:status", result);
}

function runtimeEnv(resources, port) {
  return {
    ...process.env,
    DATABASE_URL: resources.databaseUrl,
    REDIS_URL: `redis://127.0.0.1:${resources.redisPort}`,
    REDIS_SOCKET_URL: `redis://127.0.0.1:${resources.redisPort}`,
    JWT_SECRET: "local03-067-jwt-runtime-only",
    NODE_ENV: "development",
    APP_ENV: "development",
    DEFAULT_DRIVER_PASSWORD: "local03-067-driver-runtime-only",
    ALLOWED_ORIGINS: `http://127.0.0.1:${port}`,
    PORT: String(port),
    ...SEED_ENV,
  };
}

async function stopResources(resources) {
  const errors = [];
  const cleanup = async (label, args) => {
    const result = await docker(args, true);
    if (result.code !== 0) {
      errors.push(`${label}: ${result.stderr || result.stdout || `exit ${result.code}`}`);
    }
  };
  for (const name of [resources.postgres, resources.redis]) {
    await cleanup(`stop ${name}`, ["stop", name]);
    await cleanup(`remove ${name}`, ["rm", name]);
  }
  await cleanup(`remove network ${resources.network}`, ["network", "rm", resources.network]);
  await cleanup(`remove volume ${resources.volume}`, ["volume", "rm", resources.volume]);
  if (errors.length > 0) throw new Error(`Owned Docker cleanup failed: ${errors.join(" | ")}`);
}

async function runCycle(label) {
  const resources = await createResources(label);
  const evidence = { label, resources, commands: [], starts: [], snapshots: {} };
  try {
    if (await applicationTableCount(resources.databaseUrl) !== 0) throw new Error(`${label}: database was not empty before migration.`);
    const generate = await npmRunWithWindowsFileLockRetry("prisma:generate", runtimeEnv(resources, await findFreePort()));
    evidence.commands.push(commandSummary("prisma:generate", generate));
    const migrate = await npmRun("prisma:migrate:deploy", runtimeEnv(resources, await findFreePort()));
    evidence.commands.push(commandSummary("prisma:migrate:deploy", migrate));
    evidence.migrationCount = 2;
    evidence.commands.push(await migrationStatus(runtimeEnv(resources, await findFreePort())));
    const seedOne = await npmRun("prisma:seed", runtimeEnv(resources, await findFreePort()));
    evidence.commands.push(commandSummary("prisma:seed 1", seedOne));
    const first = await snapshot(resources.databaseUrl);
    const seedTwo = await npmRun("prisma:seed", runtimeEnv(resources, await findFreePort()));
    evidence.commands.push(commandSummary("prisma:seed 2", seedTwo));
    const second = await snapshot(resources.databaseUrl);
    assertEqual(first, second, `${label} seed idempotency`);
    evidence.snapshots.seed1 = first;
    evidence.snapshots.seed2 = second;

    for (const phase of ["start-1", "start-2", "start-3"]) {
      const port = await findFreePort();
      const env = runtimeEnv(resources, port);
      const startedAt = new Date().toISOString();
      const startLogDir = path.join(evidenceDir, `${label}-${phase}`);
      mkdirSync(startLogDir, { recursive: true });
      let backend;
      try {
        backend = await startOfficialBackend({ backendRoot, env, port, logDir: startLogDir, onProbe: (probe) => evidence.lastProbe = probe });
      } catch (error) {
        if (error.backendProcess) {
          await stopOfficialBackend({ rootPid: error.backendProcess.rootPid, port, onEvidence: (stop) => evidence.failedStartStop = stop }).catch(() => {});
        }
        throw error;
      }
      const processTree = process.platform === "win32" ? collectProcessTree(await readWindowsProcesses(), backend.rootPid) : [];
      const listenerPids = process.platform === "win32" ? await readWindowsListenerPids(port) : [];
      evidence.starts.push({ phase, startedAt, port, configuredRedisPort: resources.redisPort, rootPid: backend.rootPid, listenerPids, processTree: processTree.map(({ processId, parentProcessId, name, commandLine, creationDate }) => ({ processId, parentProcessId, name, commandLine, creationDate })), contracts: backend.contracts });
      await stopOfficialBackend({ rootPid: backend.rootPid, port, onEvidence: (stop) => evidence.starts.at(-1).stop = stop });
      if (phase === "start-1") {
        evidence.snapshots.afterStart1 = await snapshot(resources.databaseUrl);
        assertEqual(first, evidence.snapshots.afterStart1, `${label} persistence after backend stop/start 1`);
      }
      if (phase === "start-2") {
        evidence.snapshots.afterStart2 = await snapshot(resources.databaseUrl);
        assertEqual(first, evidence.snapshots.afterStart2, `${label} persistence after backend restart`);
      }
      if (phase === "start-3") {
        evidence.snapshots.afterStart3 = await snapshot(resources.databaseUrl);
        assertEqual(first, evidence.snapshots.afterStart3, `${label} persistence after PostgreSQL/Redis restart`);
      }
      if (phase === "start-1") evidence.commands.push(await migrationStatus(env));
      if (phase === "start-2") {
        await docker(["restart", resources.postgres]);
        await docker(["restart", resources.redis]);
        await waitForContainerHealth(resources.postgres);
        await waitForContainerHealth(resources.redis);
        resources.pgPort = await hostPort(resources.postgres, 5432);
        resources.redisPort = await hostPort(resources.redis, 6379);
        resources.databaseUrl = `postgresql://local03:local03-067-db-runtime-only@127.0.0.1:${resources.pgPort}/${resources.database}?schema=public`;
        evidence.containerRestart = {
          postgres: resources.ids.postgres,
          redis: resources.ids.redis,
          volume: resources.volume,
          pgPort: resources.pgPort,
          redisPort: resources.redisPort,
        };
      }
    }
    evidence.status = "PASS";
    return evidence;
  } finally {
    await stopResources(resources);
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const cycles = [];
  try {
    cycles.push(await runCycle("a"));
    cycles.push(await runCycle("b"));
    assertEqual(cycles[0].snapshots.seed1, cycles[1].snapshots.seed1, "independent cycle seed state");
    console.log(JSON.stringify({ package: "P1-LOCAL03-WINDOWS-NPM-LIFECYCLE-AND-TWO-CYCLE-PERSISTENCE-067", startedAt, evidenceDir, cycles }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ package: "P1-LOCAL03-WINDOWS-NPM-LIFECYCLE-AND-TWO-CYCLE-PERSISTENCE-067", status: "FAIL", message: redact(error instanceof Error ? error.message : error), evidenceDir, cycles }, null, 2));
    process.exitCode = 1;
  }
}

main();

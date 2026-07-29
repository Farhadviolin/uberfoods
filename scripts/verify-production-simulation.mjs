import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertCleanupVolumeOwnership,
  assertIsolatedProjectName,
  assertPostgresRecreateEvidence,
  auditRuntimeLogs,
} from "./lib/production-log-audit.mjs";
import {
  createEvidenceRun,
  finalizeSimulationEvidence,
  sha256,
} from "./lib/production-simulation-evidence.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const composeFile = path.join(repoRoot, "docker-compose.production-sim.yml");
const project = `uberfoods_prod_sim_${randomBytes(4).toString("hex")}`;
const secretValues = new Set();
let postgresVolumeName;
let evidence;
let evidencePhase = "startup";
let evidenceStep = "initialization";

function setEvidencePhase(phase, step) {
  evidencePhase = phase;
  evidenceStep = step;
  evidence?.events({
    phase,
    step,
    status: "STARTED",
    exitCode: null,
    durationMs: 0,
    sanitizedMessage: "",
  });
  console.log(`[production-simulation] ${phase}: ${step}`);
}

function fail(message) {
  throw new Error(message);
}

function requireNonEmptyEnvironment(name, value) {
  if (typeof value !== "string" || value.trim().length === 0)
    fail(`${name} must be set to a non-empty value`);
  return value;
}

function requireStrongSecret(name, value) {
  const secret = requireNonEmptyEnvironment(name, value);
  if (Buffer.byteLength(secret, "utf8") < 32)
    fail(`${name} must contain at least 32 bytes`);
  if (
    /^(.)\1{31,}$/.test(secret) ||
    /^(?:password|secret|changeme|development-secret|test-secret)$/i.test(
      secret,
    )
  ) {
    fail(`${name} must not use a predictable value`);
  }
  return secret;
}

function assertJwtSecretContract(accessSecret, refreshSecret) {
  requireStrongSecret("PROD_SIM_JWT_SECRET", accessSecret);
  requireStrongSecret("PROD_SIM_JWT_REFRESH_SECRET", refreshSecret);
  if (accessSecret === refreshSecret)
    fail(
      "PROD_SIM_JWT_SECRET and PROD_SIM_JWT_REFRESH_SECRET must be different",
    );
}

function assertCredentialEnvironmentSelfTests() {
  const specialCharacterPassword = 'contract-$pecial-"-\\-value';
  if (
    requireNonEmptyEnvironment(
      "PROD_SIM_DRIVER_PASSWORD",
      specialCharacterPassword,
    ) !== specialCharacterPassword
  ) {
    fail("driver credential contract altered a special-character value");
  }
  for (const invalidValue of [undefined, "", " \t "]) {
    try {
      requireNonEmptyEnvironment("PROD_SIM_DRIVER_PASSWORD", invalidValue);
      fail("driver credential contract accepted a missing or empty value");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("PROD_SIM_DRIVER_PASSWORD")
      )
        throw error;
    }
  }

  const environment = {
    PROD_SIM_RESTAURANT_PASSWORD: specialCharacterPassword,
    TEST_DRIVER_PASSWORD: specialCharacterPassword,
  };
  const childEnvironment = finalVerificationEnvironment(environment);
  if (childEnvironment.RESTAURANT_TEST_PASSWORD !== specialCharacterPassword) {
    fail("restaurant credential contract altered the child environment value");
  }
  const child = spawnSync(
    process.execPath,
    [
      "-e",
      "process.exit(process.env.RESTAURANT_TEST_PASSWORD === process.env.EXPECTED_PASSWORD ? 0 : 1)",
    ],
    {
      encoding: "utf8",
      env: {
        RESTAURANT_TEST_PASSWORD: childEnvironment.RESTAURANT_TEST_PASSWORD,
        EXPECTED_PASSWORD: specialCharacterPassword,
      },
    },
  );
  if (child.status !== 0 || child.stdout || child.stderr) {
    fail(
      "restaurant credential was not transported unchanged through the child environment",
    );
  }
  for (const invalidValue of [undefined, "", " \t "]) {
    try {
      finalVerificationEnvironment({
        ...environment,
        PROD_SIM_RESTAURANT_PASSWORD: invalidValue,
      });
      fail("restaurant credential contract accepted a missing or empty value");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("PROD_SIM_RESTAURANT_PASSWORD")
      )
        throw error;
    }
  }
}

function assertJwtSecretContractSelfTests() {
  const accessSecret = `access-${"a1".repeat(32)}`;
  const refreshSecret = `refresh-${"b2".repeat(32)}-$pecial-"`;
  assertJwtSecretContract(accessSecret, refreshSecret);

  const invalidCases = [
    [undefined, refreshSecret, "PROD_SIM_JWT_SECRET"],
    ["", refreshSecret, "PROD_SIM_JWT_SECRET"],
    [" \t ", refreshSecret, "PROD_SIM_JWT_SECRET"],
    ["short", refreshSecret, "PROD_SIM_JWT_SECRET"],
    ["a".repeat(64), refreshSecret, "PROD_SIM_JWT_SECRET"],
    [accessSecret, accessSecret, "must be different"],
    [accessSecret, undefined, "PROD_SIM_JWT_REFRESH_SECRET"],
    [accessSecret, "", "PROD_SIM_JWT_REFRESH_SECRET"],
    [accessSecret, " \t ", "PROD_SIM_JWT_REFRESH_SECRET"],
    [accessSecret, "short", "PROD_SIM_JWT_REFRESH_SECRET"],
  ];
  for (const [
    candidateAccess,
    candidateRefresh,
    expectedMessage,
  ] of invalidCases) {
    try {
      assertJwtSecretContract(candidateAccess, candidateRefresh);
      fail("JWT secret contract accepted an invalid value");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes(expectedMessage))
        throw error;
    }
  }

  secretValues.add(accessSecret);
  const sanitized = sanitize(`before:${accessSecret}:after`);
  secretValues.delete(accessSecret);
  if (sanitized.includes(accessSecret) || !sanitized.includes("[redacted]"))
    fail("JWT secret sanitizer self-test failed");
}

function sanitize(value) {
  let result = String(value ?? "");
  for (const secret of secretValues)
    result = result.split(secret).join("[redacted]");
  return result.replace(
    /postgresql:\/\/[^\s@]+:[^\s@]+@[^\s/]+\/[^\s)]+/gi,
    "postgresql://[redacted]",
  );
}

function run(
  command,
  args,
  { allowFailure = false, quiet = false, env = {}, input } = {},
) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
    input,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (evidence) {
    const artifactFile = `commands/${String(evidenceStep).replace(/[^a-z0-9_-]/gi, "_")}-${Date.now()}.log`;
    evidence.write(
      artifactFile,
      output ? sanitize(output) : "[command completed without output]\n",
    );
    evidence.events({
      phase: evidencePhase,
      step: evidenceStep,
      status: result.status === 0 ? "PASS" : "FAIL",
      exitCode: result.status,
      durationMs: Date.now() - started,
      sanitizedMessage: sanitize(output).slice(-500),
      artifactFile,
    });
  } else if (!quiet && output) process.stdout.write(sanitize(output));
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure)
    fail(`${command} ${args.join(" ")} failed with exit ${result.status}`);
  return { ...result, output };
}

function finalVerificationEnvironment(environment) {
  return {
    ...environment,
    RESTAURANT_TEST_EMAIL: "ci-restaurant@example.test",
    RESTAURANT_TEST_PASSWORD: requireNonEmptyEnvironment(
      "PROD_SIM_RESTAURANT_PASSWORD",
      environment.PROD_SIM_RESTAURANT_PASSWORD,
    ),
  };
}

function compose(args, options) {
  return run(
    "docker",
    ["compose", "-p", project, "-f", composeFile, ...args],
    options,
  );
}

function assertProject() {
  assertIsolatedProjectName(project);
}

function inspectJson(type, name) {
  const result = run(
    "docker",
    [type, "inspect", "--format", "{{json .}}", name],
    { quiet: true },
  );
  return JSON.parse(result.output);
}

function postgresIdentity(environment) {
  const containerId = compose(["ps", "-q", "postgres"], {
    env: environment,
    quiet: true,
  }).output.trim();
  if (!containerId) fail("PostgreSQL container identity is missing");
  const container = inspectJson("container", containerId);
  const mount = container.Mounts?.find(
    (candidate) =>
      candidate.Type === "volume" &&
      candidate.Destination === "/var/lib/postgresql/data",
  );
  if (!mount?.Name) fail("PostgreSQL named data volume is missing");
  const volume = inspectJson("volume", mount.Name);
  const volumeIdentity = sha256({
    name: mount.Name,
    createdAt: volume.CreatedAt,
    driver: volume.Driver,
    mountpoint: volume.Mountpoint,
    labels: volume.Labels,
  });
  return {
    containerId,
    containerName: String(container.Name ?? "").replace(/^\//, ""),
    healthy: container.State?.Health?.Status === "healthy",
    startedAt: container.State?.StartedAt,
    finishedAt: container.State?.FinishedAt,
    volumeName: mount.Name,
    volumeCreatedAt: volume.CreatedAt,
    volumeIdentity,
  };
}

function namespaceResourceSnapshot() {
  const filters = [`label=com.docker.compose.project=${project}`];
  const list = (type, extraArgs = []) =>
    run(
      "docker",
      [
        type,
        "ls",
        "--quiet",
        ...filters.flatMap((filter) => ["--filter", filter]),
        ...extraArgs,
      ],
      { quiet: true },
    )
      .output.split(/\r?\n/)
      .filter(Boolean);
  return {
    containers: run(
      "docker",
      [
        "ps",
        "-a",
        "--quiet",
        "--filter",
        `label=com.docker.compose.project=${project}`,
      ],
      { quiet: true },
    )
      .output.split(/\r?\n/)
      .filter(Boolean),
    networks: list("network"),
    volumes: list("volume"),
    namedPostgresVolumes: run(
      "docker",
      [
        "volume",
        "ls",
        "--quiet",
        "--filter",
        `name=^${project}_postgres-data$`,
      ],
      { quiet: true },
    )
      .output.split(/\r?\n/)
      .filter((name) => name === `${project}_postgres-data`),
  };
}

function auditLogs(logs, context, label) {
  const result = auditRuntimeLogs(logs, context);
  if (result.unexpected.length) {
    evidence.summary.runtimeLogAudit = {
      result: "FAIL",
      classifiedExpectedShutdownDiagnostics:
        result.classifiedExpectedShutdownDiagnostics,
      classifiedBootstrapShutdownDiagnostics:
        result.classifiedBootstrapShutdownDiagnostics,
      classifiedRecreateShutdownDiagnostics:
        result.classifiedRecreateShutdownDiagnostics,
      unexplainedFatalDiagnostics: result.unexplainedFatalDiagnostics,
      lifecycleState: result.lifecycleState,
    };
    evidence.summary.classifiedExpectedShutdownDiagnostics =
      result.classifiedExpectedShutdownDiagnostics;
    evidence.summary.unexplainedFatalDiagnostics =
      result.unexplainedFatalDiagnostics;
    evidence.write("runtime-log-audit.json", evidence.summary.runtimeLogAudit);
    fail(
      `${label} found unexplained fatal diagnostics: ${sanitize(result.unexpected.slice(0, 3).join(" | "))}`,
    );
  }
  return result;
}

function safeFinalCleanup(environment) {
  assertProject();
  const down = compose(["down", "--remove-orphans"], {
    env: environment,
    allowFailure: true,
  });
  const cleanupErrors = [];
  if (down.status !== 0) {
    cleanupErrors.push(
      `namespace container/network cleanup failed with exit ${down.status}`,
    );
  }

  const candidates = run(
    "docker",
    [
      "volume",
      "ls",
      "--quiet",
      "--filter",
      `label=com.docker.compose.project=${project}`,
      "--filter",
      "label=com.docker.compose.volume=postgres-data",
    ],
    { quiet: true },
  )
    .output.split(/\r?\n/)
    .filter(Boolean);
  if (candidates.length > 1) fail("cleanup found ambiguous PostgreSQL volumes");
  if (postgresVolumeName && candidates.length === 0) {
    cleanupErrors.push(
      "captured PostgreSQL volume disappeared before verified cleanup",
    );
  }
  if (candidates.length === 1) {
    const candidate = candidates[0];
    const volume = inspectJson("volume", candidate);
    const attachedContainers = run(
      "docker",
      ["ps", "-a", "--quiet", "--filter", `volume=${candidate}`],
      { quiet: true },
    )
      .output.split(/\r?\n/)
      .filter(Boolean);
    const attachedContainerProjects = attachedContainers.map((containerId) =>
      run(
        "docker",
        [
          "inspect",
          "--format",
          '{{index .Config.Labels "com.docker.compose.project"}}',
          containerId,
        ],
        { quiet: true },
      ).output.trim(),
    );
    assertCleanupVolumeOwnership({
      project,
      volumeName: candidate,
      expectedVolumeName: postgresVolumeName ?? candidate,
      projectLabel: volume.Labels?.["com.docker.compose.project"],
      volumeLabel: volume.Labels?.["com.docker.compose.volume"],
      attachedContainerProjects,
    });
    run("docker", ["volume", "rm", candidate], { quiet: true });
  }

  for (const [type, args] of [
    [
      "containers",
      [
        "ps",
        "-a",
        "--quiet",
        "--filter",
        `label=com.docker.compose.project=${project}`,
      ],
    ],
    [
      "networks",
      [
        "network",
        "ls",
        "--quiet",
        "--filter",
        `label=com.docker.compose.project=${project}`,
      ],
    ],
    [
      "volumes",
      [
        "volume",
        "ls",
        "--quiet",
        "--filter",
        `label=com.docker.compose.project=${project}`,
      ],
    ],
  ]) {
    if (run("docker", args, { quiet: true }).output.trim())
      cleanupErrors.push(`cleanup left production simulation ${type}`);
  }
  if (cleanupErrors.length) fail(cleanupErrors.join("; "));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(label, check, timeoutMs = 120_000) {
  const started = Date.now();
  let lastError = "not ready";
  while (Date.now() - started < timeoutMs) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(1_000);
  }
  fail(
    `${label} was not ready within ${Math.round(timeoutMs / 1000)} seconds: ${lastError}`,
  );
}

async function available(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}

async function allocatePorts() {
  for (let base = 18100; base < 22000; base += 10) {
    const candidates = [base, base + 1, base + 2, base + 3, base + 4];
    if ((await Promise.all(candidates.map(available))).every(Boolean))
      return candidates;
  }
  fail("could not reserve an isolated group of local simulation ports");
}

function unwrap(value) {
  return value && typeof value === "object" && "data" in value
    ? value.data
    : value;
}

async function request(url, options = {}) {
  const response = await fetch(url, { redirect: "manual", ...options });
  const text = await response.text();
  let json;
  let primaryFailure;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { response, text, json };
}

function assertStatus(result, statuses, label) {
  if (!statuses.includes(result.response.status))
    fail(
      `${label}: expected ${statuses.join("/")}, got ${result.response.status}`,
    );
}

function jwtHasValidHs256Signature(token, secret) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return false;
  const expected = createHmac("sha256", secret)
    .update(`${parts[0]}.${parts[1]}`)
    .digest();
  let actual;
  try {
    actual = Buffer.from(parts[2], "base64url");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const forbiddenRuntimeTokens =
  /(?:^|\s)(?:ts-node|tsx|nest(?:\s+start)?|nodemon|vite|npm\s+run\s+dev)(?:\s|$)|\.ts(?:\s|$)/i;

export function isProductionNodeCommand(command) {
  const normalized = String(command ?? "")
    .trim()
    .replace(/\\/g, "/");
  if (!normalized || forbiddenRuntimeTokens.test(normalized)) return false;
  const tokens = normalized.split(/\s+/);
  const nodeIndex = tokens.findIndex((token) =>
    /(?:^|\/)node(?:\.exe)?$/i.test(token),
  );
  if (nodeIndex === -1) return false;
  const prefix = tokens.slice(0, nodeIndex).join(" ");
  if (prefix && !/(?:^|\/)dumb-init\s+--$/i.test(prefix)) return false;
  const entrypoint = tokens
    .slice(nodeIndex + 1)
    .find((token) => !token.startsWith("-"));
  return (
    entrypoint === "dist/main.prod.js" ||
    entrypoint?.endsWith("/dist/main.prod.js") === true
  );
}

function assertRuntimeAuditSelfTests() {
  const cases = [
    ["node dist/main.prod.js", true],
    ["/usr/local/bin/node /app/dist/main.prod.js", true],
    ["dumb-init -- node dist/main.prod.js", true],
    ["node --enable-source-maps dist/main.prod.js", true],
    ["node dist/main.js", false],
    ["ts-node src/main.ts", false],
    ["tsx src/main.ts", false],
    ["nest start", false],
    ["nest start --watch", false],
    ["npm run dev", false],
    ["vite", false],
    ["echo node dist/main.prod.js", false],
  ];
  for (const [command, expected] of cases) {
    if (isProductionNodeCommand(command) !== expected)
      fail(`runtime audit self-test failed for ${command}`);
  }
}

const orderSnapshotSql =
  'SELECT "id", "status", "customerId", "restaurantId", COALESCE("driverId", \'\') FROM "orders" WHERE "id" = :\'order_id\'::text';

function requireOrderId(orderId) {
  if (typeof orderId !== "string" || !/^[A-Za-z0-9_-]+$/.test(orderId)) {
    fail("production lifecycle order identifier has an unsafe format");
  }
  return orderId;
}

function parseOrderSnapshot(output, orderId) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) {
    fail(
      `expected exactly one persisted lifecycle order, found ${lines.length}`,
    );
  }
  const [persistedId, status, customerId, restaurantId, driverId] =
    lines[0].split("|");
  if (persistedId !== orderId) {
    fail("persisted lifecycle order identifier does not match");
  }
  if (status !== "DELIVERED") {
    fail(
      `persisted lifecycle order status is ${status || "missing"}, expected DELIVERED`,
    );
  }
  if (!customerId || !restaurantId || !driverId) {
    fail("persisted lifecycle order relationships are incomplete");
  }
  return lines[0];
}

function assertPersistenceContractSelfTests() {
  const orderId = "contract_order_1";
  if (
    !orderSnapshotSql.includes('FROM "orders"') ||
    orderSnapshotSql.includes('FROM "Order"')
  ) {
    fail("persistence contract does not use the physical orders table");
  }
  const valid = `${orderId}|DELIVERED|customer_1|restaurant_1|driver_1`;
  if (parseOrderSnapshot(valid, orderId) !== valid) {
    fail("valid persistence snapshot was altered");
  }
  for (const invalid of [
    "",
    `${orderId}|PICKED_UP|customer_1|restaurant_1|driver_1`,
    `${orderId}|DELIVERED||restaurant_1|driver_1`,
    `${orderId}|DELIVERED|customer_1||driver_1`,
    `${orderId}|DELIVERED|customer_1|restaurant_1|`,
    `other_order|DELIVERED|customer_1|restaurant_1|driver_1`,
    `${valid}\n${valid}`,
  ]) {
    let rejected = false;
    try {
      parseOrderSnapshot(invalid, orderId);
    } catch {
      rejected = true;
    }
    if (!rejected) {
      fail("persistence contract accepted an invalid snapshot");
    }
  }
}

function databaseSnapshot(orderId) {
  const validatedOrderId = requireOrderId(orderId);
  const result = compose(
    [
      "exec",
      "-T",
      "postgres",
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "uberfoods",
      "-d",
      "uberfoods",
      "-At",
      "-F",
      "|",
      "-v",
      `order_id=${validatedOrderId}`,
    ],
    { quiet: true, input: `${orderSnapshotSql};\n` },
  );
  return parseOrderSnapshot(result.output, validatedOrderId);
}

function structuredOrderSnapshot(snapshot) {
  const [orderId, status, customerId, restaurantId, driverId] =
    String(snapshot).split("|");
  return { orderId, status, customerId, restaurantId, driverId };
}

async function assertPsqlStdinIntegration() {
  const containerName = `uberfoods_psql_contract_${randomBytes(4).toString("hex")}`;
  if (!/^uberfoods_psql_contract_[a-f0-9]+$/.test(containerName)) {
    fail("refusing to use an untrusted psql contract container name");
  }

  try {
    run(
      "docker",
      [
        "run",
        "-d",
        "--name",
        containerName,
        "-e",
        "POSTGRES_HOST_AUTH_METHOD=trust",
        "postgres:15-alpine",
      ],
      { quiet: true },
    );
    await waitFor(
      "psql contract PostgreSQL",
      () =>
        run("docker", ["exec", containerName, "pg_isready", "-U", "postgres"], {
          allowFailure: true,
          quiet: true,
        }).status === 0,
      60_000,
    );

    run(
      "docker",
      [
        "exec",
        "-i",
        containerName,
        "psql",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
      ],
      {
        quiet: true,
        input: `
CREATE TABLE "orders" (
  "id" text PRIMARY KEY,
  "status" text NOT NULL,
  "customerId" text NOT NULL,
  "restaurantId" text NOT NULL,
  "driverId" text
);
INSERT INTO "orders" VALUES ('contract_order_1', 'DELIVERED', 'customer_1', 'restaurant_1', 'driver_1');
`,
      },
    );

    const psqlArgs = [
      "exec",
      "-i",
      containerName,
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-At",
      "-F",
      "|",
      "-v",
      "order_id=contract_order_1",
    ];
    if (psqlArgs.includes("-c")) {
      fail("psql contract unexpectedly passes SQL through -c");
    }
    const snapshot = run("docker", psqlArgs, {
      quiet: true,
      input: `${orderSnapshotSql};\n`,
    });
    parseOrderSnapshot(snapshot.output, "contract_order_1");

    const missing = run(
      "docker",
      [...psqlArgs.slice(0, -1), "order_id=missing_order"],
      { quiet: true, input: `${orderSnapshotSql};\n` },
    );
    let missingRejected = false;
    try {
      parseOrderSnapshot(missing.output, "missing_order");
    } catch {
      missingRejected = true;
    }
    if (!missingRejected) fail("psql contract accepted a missing order");

    const syntaxFailure = run("docker", psqlArgs, {
      allowFailure: true,
      quiet: true,
      input: "SELECT FROM;\n",
    });
    if (syntaxFailure.status === 0) {
      fail("psql contract accepted invalid SQL");
    }
  } finally {
    if (!/^uberfoods_psql_contract_[a-f0-9]+$/.test(containerName)) {
      fail("refusing cleanup for an untrusted psql contract container name");
    }
    run("docker", ["rm", "-f", "-v", containerName], {
      allowFailure: true,
      quiet: true,
    });
  }
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) fail("JWT payload could not be decoded");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}

function driverRefreshAuditSnapshot(driverId, environment) {
  if (!/^[A-Za-z0-9_-]+$/.test(driverId))
    fail("driver audit identifier has an unsafe format");
  const query = `SELECT count(*), count(*) FILTER (WHERE "metadata"::text ~* '(access_token|refresh_token|secret|password|authorization)') FROM "driver_audit_events" WHERE "driverId" = '${driverId}' AND "action" = 'LOGIN' AND "metadata"->>'refresh' = 'true'`;
  const result = compose(
    [
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "uberfoods",
      "-d",
      "uberfoods",
      "-At",
      "-F",
      "|",
      "-c",
      query,
    ],
    { env: environment, quiet: true },
  );
  const [count, sensitiveCount] = result.output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .at(-1)
    .split("|")
    .map(Number);
  if (!Number.isInteger(count) || !Number.isInteger(sensitiveCount))
    fail("driver refresh audit snapshot is invalid");
  if (sensitiveCount !== 0)
    fail("driver refresh audit metadata contains a sensitive field");
  return count;
}

async function checkFrontend(name, port, route) {
  const base = `http://127.0.0.1:${port}`;
  const root = await request(`${base}/`);
  assertStatus(root, [200], `${name} root`);
  if (!root.response.headers.get("content-type")?.includes("text/html"))
    fail(`${name} root did not return HTML`);
  const deepLink = await request(`${base}${route}`, {
    headers: { accept: "text/html" },
  });
  assertStatus(deepLink, [200], `${name} deep link`);
  if (!deepLink.response.headers.get("content-type")?.includes("text/html"))
    fail(`${name} deep link did not use SPA fallback`);
  const asset = [
    ...root.text.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g),
  ]
    .map((match) => match[1])
    .find((entry) => entry.startsWith("/"));
  if (!asset) fail(`${name} did not expose a built JS or CSS asset`);
  const staticAsset = await request(`${base}${asset}`);
  assertStatus(staticAsset, [200], `${name} static asset`);
  if (
    !/(javascript|text\/css)/.test(
      staticAsset.response.headers.get("content-type") ?? "",
    )
  )
    fail(`${name} asset MIME type is unsafe`);
  const missing = await request(
    `${base}/assets/missing-production-simulation.js`,
  );
  assertStatus(missing, [404], `${name} missing static asset`);
  const api = await request(`${base}/api/health`);
  assertStatus(api, [200], `${name} API proxy`);
  for (const header of [
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
  ]) {
    if (!root.response.headers.get(header))
      fail(`${name} is missing ${header}`);
  }
}

function assertBackendSecretEnvironment(environment) {
  compose(
    [
      "exec",
      "-T",
      "backend",
      "node",
      "-e",
      "const a=process.env.JWT_SECRET,r=process.env.JWT_REFRESH_SECRET;process.exit(a&&r&&a!==r&&Buffer.byteLength(a)>=32&&Buffer.byteLength(r)>=32?0:1)",
    ],
    { env: environment, quiet: true },
  );
}

async function verifyAuthSecretContract(
  backendBase,
  driverPassword,
  accessSecret,
  refreshSecret,
  environment,
) {
  const wrongLogin = await request(`${backendBase}/api/auth/driver/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "testdriver@example.com",
      password: `${driverPassword}-invalid`,
    }),
  });
  assertStatus(wrongLogin, [401], "driver login with wrong password");

  const login = await request(`${backendBase}/api/auth/driver/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "testdriver@example.com",
      password: driverPassword,
    }),
  });
  assertStatus(login, [200, 201], "driver login");
  const loginData = unwrap(login.json);
  const accessToken = loginData?.access_token;
  const refreshToken = loginData?.refresh_token;
  if (!accessToken || !refreshToken)
    fail("driver login did not return both access and refresh tokens");
  if (!jwtHasValidHs256Signature(accessToken, accessSecret))
    fail("access token was not signed with PROD_SIM_JWT_SECRET");
  if (jwtHasValidHs256Signature(accessToken, refreshSecret))
    fail("access token unexpectedly verified with PROD_SIM_JWT_REFRESH_SECRET");
  if (!jwtHasValidHs256Signature(refreshToken, refreshSecret))
    fail("refresh token was not signed with PROD_SIM_JWT_REFRESH_SECRET");
  if (jwtHasValidHs256Signature(refreshToken, accessSecret))
    fail("refresh token unexpectedly verified with PROD_SIM_JWT_SECRET");
  secretValues.add(accessToken);
  secretValues.add(refreshToken);

  const driverId = decodeJwtPayload(refreshToken)?.sub;
  if (typeof driverId !== "string" || !driverId)
    fail("driver refresh token is missing its subject");
  const auditBeforeInvalid = driverRefreshAuditSnapshot(driverId, environment);
  const invalidRefreshToken = `${refreshToken.slice(0, -1)}${refreshToken.endsWith("a") ? "b" : "a"}`;
  secretValues.add(invalidRefreshToken);
  const invalidRefresh = await request(`${backendBase}/api/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: invalidRefreshToken }),
  });
  assertStatus(invalidRefresh, [401], "invalid driver refresh token");
  if (driverRefreshAuditSnapshot(driverId, environment) !== auditBeforeInvalid)
    fail("invalid driver refresh created a success audit event");

  await verifyRefreshFlow(
    backendBase,
    refreshToken,
    accessSecret,
    refreshSecret,
    driverId,
    environment,
  );
  return { accessToken, refreshToken, driverId };
}

async function loginDriver(backendBase, email, password, label) {
  const login = await request(`${backendBase}/api/auth/driver/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assertStatus(login, [200, 201], label);
  const data = unwrap(login.json);
  if (!data?.access_token) fail(`${label} did not return an access token`);
  secretValues.add(data.access_token);
  return {
    accessToken: data.access_token,
    driverId: decodeJwtPayload(data.access_token)?.sub,
  };
}

function parseDriverRuntimeEvidence(output, expectedOrderId) {
  const match = output.match(
    /^PRODUCTION_SIM_DRIVER_RUNTIME_EVIDENCE=([A-Za-z0-9_-]+)$/m,
  );
  if (!match) fail("final verification did not report driver runtime evidence");
  let value;
  try {
    value = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
  } catch {
    fail("driver runtime evidence was not valid base64url JSON");
  }
  const exact = {
    result: "PASS",
    orderId: expectedOrderId,
    noAuthAvailableStatus: 401,
    wrongRoleAvailableStatus: 403,
    availableStatus: 200,
    activeStatus: 200,
    acceptStatus: 201,
    crossReadStatus: 403,
    crossAcceptStatus: 409,
    crossStatusUpdateStatus: 403,
    illegalTransitionStatus: 409,
    finalStatus: "DELIVERED",
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (value?.[field] !== expected)
      fail(`driver runtime evidence ${field} did not equal ${expected}`);
  }
  if (
    !value.driverAId ||
    !value.driverBId ||
    value.driverAId === value.driverBId ||
    value.finalDriverId !== value.driverAId ||
    JSON.stringify(value.lifecycle) !==
      JSON.stringify(["READY_FOR_PICKUP", "ACCEPTED", "PICKED_UP", "DELIVERED"])
  ) {
    fail("driver runtime evidence did not prove lifecycle ownership");
  }
  return value;
}

async function verifyDriverPersistenceHttp(
  backendBase,
  orderId,
  driverA,
  driverB,
  checkpoint,
) {
  const ownerRead = await request(`${backendBase}/api/orders/${orderId}`, {
    headers: { authorization: `Bearer ${driverA.accessToken}` },
  });
  assertStatus(ownerRead, [200], `${checkpoint} Driver A order read`);
  const ownerOrder = unwrap(ownerRead.json);
  if (
    ownerOrder?.id !== orderId ||
    ownerOrder?.status !== "DELIVERED" ||
    ownerOrder?.driverId !== driverA.driverId
  )
    fail(`${checkpoint} Driver A ownership/state was not preserved`);
  const foreignRead = await request(`${backendBase}/api/orders/${orderId}`, {
    headers: { authorization: `Bearer ${driverB.accessToken}` },
  });
  assertStatus(foreignRead, [403], `${checkpoint} Driver B order read`);
  const foreignPayload = foreignRead.json;
  if (
    foreignPayload?.data ||
    foreignPayload?.order ||
    foreignPayload?.customer ||
    foreignPayload?.restaurant
  )
    fail(`${checkpoint} Driver B response leaked protected order data`);
  for (const driver of [driverA, driverB]) {
    const active = await request(`${backendBase}/api/drivers/orders/active`, {
      headers: { authorization: `Bearer ${driver.accessToken}` },
    });
    assertStatus(active, [200], `${checkpoint} active orders`);
    if (active.text.includes(orderId))
      fail(`${checkpoint} delivered order remained active`);
  }
  const alias = await request(
    `${backendBase}/api/drivers/${driverA.driverId}/orders/active`,
    { headers: { authorization: `Bearer ${driverB.accessToken}` } },
  );
  assertStatus(alias, [403], `${checkpoint} cross-driver alias`);
  return { result: "PASS", checkpoint };
}

async function verifyRefreshFlow(
  backendBase,
  refreshToken,
  accessSecret,
  refreshSecret,
  driverId,
  environment,
) {
  const auditBefore = driverRefreshAuditSnapshot(driverId, environment);
  const refresh = await request(`${backendBase}/api/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  assertStatus(refresh, [200, 201], "refresh token flow");
  const refreshData = unwrap(refresh.json);
  if (!refreshData?.access_token || refreshData?.refresh_token !== refreshToken)
    fail("refresh flow returned an invalid token pair");
  if (!jwtHasValidHs256Signature(refreshData.access_token, accessSecret))
    fail("refreshed access token was not signed with PROD_SIM_JWT_SECRET");
  if (jwtHasValidHs256Signature(refreshData.access_token, refreshSecret))
    fail(
      "refreshed access token unexpectedly verified with PROD_SIM_JWT_REFRESH_SECRET",
    );
  secretValues.add(refreshData.access_token);
  if (driverRefreshAuditSnapshot(driverId, environment) !== auditBefore + 1)
    fail("valid driver refresh did not create exactly one audit event");
}

async function verifyRestaurantLogin(backendBase, restaurantPassword) {
  const login = await request(`${backendBase}/api/auth/restaurant/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "ci-restaurant@example.test",
      password: restaurantPassword,
    }),
  });
  assertStatus(login, [200, 201], "restaurant login");
}

async function main() {
  if (process.argv.includes("--self-test-secret-contract")) {
    assertJwtSecretContractSelfTests();
    console.log(
      "Production simulation JWT secret contract self-tests passed: 12/12",
    );
    return;
  }
  if (process.argv.includes("--self-test-credential-contract")) {
    assertCredentialEnvironmentSelfTests();
    console.log(
      "Production simulation credential contract self-tests passed: 8/8",
    );
    return;
  }
  if (process.argv.includes("--self-test-runtime-audit")) {
    assertRuntimeAuditSelfTests();
    console.log("Runtime audit self-tests passed: 12/12");
    return;
  }
  if (process.argv.includes("--self-test-persistence-contract")) {
    assertPersistenceContractSelfTests();
    console.log(
      "Production simulation persistence contract self-tests passed: 9/9",
    );
    return;
  }
  if (process.argv.includes("--self-test-psql-stdin-integration")) {
    await assertPsqlStdinIntegration();
    console.log("Production simulation psql stdin integration passed: 5/5");
    return;
  }
  const branch = spawnSync("git", ["branch", "--show-current"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).stdout.trim();
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).stdout.trim();
  evidence = createEvidenceRun({
    repoRoot,
    runId: project,
    namespace: project,
    branch,
    head,
  });
  evidence.write("primary-failure.txt", "none\n");
  evidence.write("cleanup-failure.txt", "none\n");
  evidence.events({
    phase: "startup",
    step: "evidence-initialized",
    status: "PASS",
    exitCode: 0,
    durationMs: 0,
    sanitizedMessage: "evidence initialized",
  });
  console.log(`Production simulation evidence: ${evidence.directory}`);
  const ports = await allocatePorts();
  const [backendPort, customerPort, adminPort, restaurantPort, driverPort] =
    ports;
  const postgresPassword = `sim_db_${randomBytes(12).toString("hex")}`;
  const jwtSecret = `sim_jwt_${randomBytes(32).toString("hex")}`;
  const jwtRefreshSecret = `sim_refresh_${randomBytes(32).toString("hex")}`;
  const driverPassword = `sim_driver_${randomBytes(12).toString("hex")}`;
  const driverBPassword = `sim_driver_b_${randomBytes(12).toString("hex")}`;
  const restaurantPassword = `sim_restaurant_${randomBytes(12).toString("hex")}`;
  const seedCustomerPassword = `sim_customer_${randomBytes(12).toString("hex")}`;
  const seedRestaurantPassword = `sim_seed_restaurant_${randomBytes(12).toString("hex")}`;
  const seedDriverPassword = `sim_seed_driver_${randomBytes(12).toString("hex")}`;
  [
    postgresPassword,
    jwtSecret,
    jwtRefreshSecret,
    driverPassword,
    driverBPassword,
    restaurantPassword,
    seedCustomerPassword,
    seedRestaurantPassword,
    seedDriverPassword,
  ].forEach((value) => secretValues.add(value));
  const origins = [customerPort, adminPort, restaurantPort, driverPort]
    .map((port) => `http://127.0.0.1:${port}`)
    .join(",");
  const environment = {
    PROD_SIM_POSTGRES_PASSWORD: postgresPassword,
    PROD_SIM_JWT_SECRET: jwtSecret,
    PROD_SIM_JWT_REFRESH_SECRET: jwtRefreshSecret,
    PROD_SIM_DRIVER_PASSWORD: driverPassword,
    PROD_SIM_DRIVER_B_PASSWORD: driverBPassword,
    TEST_DRIVER_PASSWORD: driverPassword,
    PROD_SIM_RESTAURANT_PASSWORD: restaurantPassword,
    PROD_SIM_SEED_CUSTOMER_PASSWORD: seedCustomerPassword,
    PROD_SIM_SEED_RESTAURANT_PASSWORD: seedRestaurantPassword,
    PROD_SIM_SEED_DRIVER_PASSWORD: seedDriverPassword,
    PROD_SIM_ALLOWED_ORIGINS: origins,
    PROD_SIM_BACKEND_PORT: String(backendPort),
    PROD_SIM_CUSTOMER_PORT: String(customerPort),
    PROD_SIM_ADMIN_PORT: String(adminPort),
    PROD_SIM_RESTAURANT_PORT: String(restaurantPort),
    PROD_SIM_DRIVER_PORT: String(driverPort),
  };
  requireNonEmptyEnvironment(
    "PROD_SIM_DRIVER_PASSWORD",
    environment.PROD_SIM_DRIVER_PASSWORD,
  );
  requireNonEmptyEnvironment(
    "TEST_DRIVER_PASSWORD",
    environment.TEST_DRIVER_PASSWORD,
  );
  assertJwtSecretContract(
    environment.PROD_SIM_JWT_SECRET,
    environment.PROD_SIM_JWT_REFRESH_SECRET,
  );
  process.env = { ...process.env, ...environment };
  console.log(`Production simulation namespace: ${project}`);
  console.log(
    `Production simulation ports: backend=${backendPort}, customer=${customerPort}, admin=${adminPort}, restaurant=${restaurantPort}, driver=${driverPort}`,
  );

  let primaryFailure = null;
  let cleanupFailure = null;
  let finalizationResult = null;
  let finalExitCode = 1;

  try {
    setEvidencePhase("build", "compose-config");
    compose(["config", "--quiet"], { env: environment });
    setEvidencePhase("build", "no-cache-images");
    compose(["build", "--no-cache"], { env: environment });
    setEvidencePhase("database", "fresh-database");
    const expectedInitialVolumeName = `${project}_postgres-data`;
    const namespaceBeforeBootstrap = namespaceResourceSnapshot();
    if (
      namespaceBeforeBootstrap.containers.length ||
      namespaceBeforeBootstrap.networks.length ||
      namespaceBeforeBootstrap.volumes.length ||
      namespaceBeforeBootstrap.namedPostgresVolumes.length
    ) {
      fail("isolated namespace was not empty before Fresh DB bootstrap");
    }
    evidence.write("fresh-namespace-before-bootstrap.json", {
      result: "PASS",
      namespace: project,
      ...namespaceBeforeBootstrap,
    });
    const freshDatabaseStartedAt = new Date();
    compose(["up", "-d", "--wait", "postgres", "redis"], { env: environment });
    const bootstrapWindowEnd = new Date();
    const initialPostgres = postgresIdentity(environment);
    postgresVolumeName = initialPostgres.volumeName;
    if (initialPostgres.volumeName !== expectedInitialVolumeName)
      fail("Fresh DB bootstrap used an unexpected PostgreSQL volume");
    let applicationDatabaseReachable = false;
    let migrationsApplied = false;
    let schemaReachable = false;
    let databaseOperationVerified = false;
    let seedSucceeded = false;
    let seedIdempotent = false;
    let backendReady = false;
    const freshTables = compose(
      [
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "uberfoods",
        "-d",
        "uberfoods",
        "-Atqc",
        "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'",
      ],
      { env: environment, quiet: true },
    ).output.trim();
    applicationDatabaseReachable = true;
    databaseOperationVerified = true;
    if (freshTables !== "0")
      fail(
        `fresh production database unexpectedly has ${freshTables} public tables`,
      );
    compose(["run", "--rm", "migration"], { env: environment });
    compose(
      [
        "run",
        "--rm",
        "migration",
        "npx",
        "prisma",
        "migrate",
        "status",
        "--schema=./prisma/schema.prisma",
      ],
      { env: environment },
    );
    migrationsApplied = true;
    schemaReachable = true;
    compose(["run", "--rm", "seed"], { env: environment });
    seedSucceeded = true;
    compose(["run", "--rm", "seed"], { env: environment });
    seedIdempotent = true;
    compose(
      ["run", "--rm", "tooling", "node", "scripts/create-test-restaurant.js"],
      { env: environment },
    );
    compose(
      ["run", "--rm", "tooling", "node", "scripts/create-test-driver.js"],
      { env: environment },
    );
    compose(
      [
        "run",
        "--rm",
        "tooling",
        "node",
        "scripts/create-production-sim-driver-b.js",
      ],
      { env: environment },
    );
    compose(
      [
        "up",
        "-d",
        "--wait",
        "backend",
        "customer-web",
        "admin-panel",
        "restaurant-web",
        "driver-web",
      ],
      { env: environment },
    );

    assertRuntimeAuditSelfTests();
    const backendContainer = compose(["ps", "-q", "backend"], {
      env: environment,
      quiet: true,
    }).output.trim();
    if (!backendContainer)
      fail("backend runtime audit could not identify the running container");
    const configuredProcess = run(
      "docker",
      [
        "inspect",
        "--format",
        "{{.Path}} {{range .Args}}{{.}} {{end}}",
        backendContainer,
      ],
      { quiet: true },
    ).output.trim();
    const processInfo = compose(
      [
        "exec",
        "-T",
        "backend",
        "sh",
        "-c",
        "id -u; for pid in $(cat /proc/1/task/1/children); do tr '\\000' ' ' < /proc/$pid/cmdline; echo; done; test -f /app/dist/main.prod.js; test ! -e /app/src",
      ],
      { env: environment, quiet: true },
    ).output;
    const processLines = processInfo
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const runningCommands = processLines.filter((line) => !/^1001$/.test(line));
    if (
      !isProductionNodeCommand(configuredProcess) ||
      runningCommands.length !== 1 ||
      !isProductionNodeCommand(runningCommands[0]) ||
      !/^1001\r?$/m.test(processInfo)
    )
      fail(
        `backend runtime audit failed: configured=${configuredProcess || "missing"}; running=${runningCommands.join(" | ") || "missing"}`,
      );
    const backendBase = `http://127.0.0.1:${backendPort}`;
    await waitFor("backend readiness", async () => {
      const health = await request(`${backendBase}/api/health/ready`);
      return (
        health.response.status === 200 &&
        unwrap(health.json)?.status === "ready"
      );
    });
    backendReady = true;
    for (const pathPart of [
      "/api/health/live",
      "/api/health/ready",
      "/api/healthz",
      "/api/readyz",
    ])
      assertStatus(
        await request(`${backendBase}${pathPart}`),
        [200],
        `backend ${pathPart}`,
      );
    const invalidRoute = await request(
      `${backendBase}/api/production-simulation-missing`,
    );
    assertStatus(invalidRoute, [404], "backend invalid route");
    if (/stack|postgresql:|sim_jwt_/i.test(invalidRoute.text))
      fail("production error response exposed implementation detail or secret");
    const allowedOrigin = `http://127.0.0.1:${customerPort}`;
    const corsAllowed = await request(`${backendBase}/api/health`, {
      headers: { origin: allowedOrigin },
    });
    if (
      corsAllowed.response.headers.get("access-control-allow-origin") !==
      allowedOrigin
    )
      fail("allowed simulation origin was not accepted by CORS");
    const corsDenied = await request(`${backendBase}/api/health`, {
      headers: { origin: "https://not-allowed.example" },
    });
    if (corsDenied.response.headers.get("access-control-allow-origin"))
      fail("unexpected origin was accepted by CORS");
    for (const header of [
      "content-security-policy",
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
    ]) {
      if (!corsAllowed.response.headers.get(header))
        fail(`backend is missing ${header}`);
    }
    await checkFrontend("customer-web", customerPort, "/restaurants");
    await checkFrontend("admin-panel", adminPort, "/login");
    await checkFrontend("restaurant-web", restaurantPort, "/login");
    await checkFrontend("driver-web", driverPort, "/login");

    assertBackendSecretEnvironment(environment);
    const driverA = await verifyAuthSecretContract(
      backendBase,
      driverPassword,
      jwtSecret,
      jwtRefreshSecret,
      environment,
    );
    const driverB = await loginDriver(
      backendBase,
      "production-sim-driver-b@example.test",
      driverBPassword,
      "Driver B login",
    );
    const finalVerification = run(
      "pwsh",
      [
        "-NoLogo",
        "-NoProfile",
        "-File",
        "backend/scripts/final-verification.ps1",
        "-BaseUrl",
        backendBase,
      ],
      {
        env: finalVerificationEnvironment(environment),
      },
    );
    const orderIdMatch = finalVerification.output.match(
      /^PRODUCTION_SIM_ORDER_ID=([A-Za-z0-9_-]+)$/m,
    );
    if (!orderIdMatch) {
      fail("final verification did not report its lifecycle order identifier");
    }
    const lifecycleOrderId = requireOrderId(orderIdMatch[1]);
    const driverRuntimeLifecycle = parseDriverRuntimeEvidence(
      finalVerification.output,
      lifecycleOrderId,
    );
    if (driverRuntimeLifecycle.driverAId !== driverA.driverId)
      fail("final verification Driver A did not match authenticated Driver A");
    if (driverRuntimeLifecycle.driverBId !== driverB.driverId)
      fail("final verification Driver B did not match authenticated Driver B");
    evidence.summary.driverRuntimeLifecycle = driverRuntimeLifecycle;
    evidence.write("driver-runtime-lifecycle.json", driverRuntimeLifecycle);
    const beforeRestart = databaseSnapshot(lifecycleOrderId);
    const beforeRestartStructured = structuredOrderSnapshot(beforeRestart);
    const persistenceBefore = {
      orderId: lifecycleOrderId,
      snapshot: beforeRestart,
      ownership: beforeRestartStructured,
      sha256: sha256({ orderId: lifecycleOrderId, snapshot: beforeRestart }),
    };
    evidence.write("persistence-before.json", persistenceBefore);
    compose(
      [
        "restart",
        "backend",
        "customer-web",
        "admin-panel",
        "restaurant-web",
        "driver-web",
      ],
      { env: environment },
    );
    await waitFor(
      "backend after controlled restart",
      async () =>
        (await request(`${backendBase}/api/health/ready`)).response.status ===
        200,
    );
    assertBackendSecretEnvironment(environment);
    await verifyRefreshFlow(
      backendBase,
      driverA.refreshToken,
      jwtSecret,
      jwtRefreshSecret,
      driverA.driverId,
      environment,
    );
    await verifyRestaurantLogin(backendBase, restaurantPassword);
    await checkFrontend(
      "customer-web after restart",
      customerPort,
      "/restaurants",
    );
    if (databaseSnapshot(lifecycleOrderId) !== beforeRestart)
      fail("order state changed during controlled restart");
    evidence.summary.driverRuntimeLifecycle.afterControlledRestart =
      await verifyDriverPersistenceHttp(
        backendBase,
        lifecycleOrderId,
        driverA,
        driverB,
        "controlled restart",
      );
    compose(["run", "--rm", "migration"], { env: environment });
    const backendContainerBeforeRecreate = compose(["ps", "-q", "backend"], {
      env: environment,
      quiet: true,
    }).output.trim();
    compose(
      [
        "up",
        "-d",
        "--force-recreate",
        "--no-deps",
        "backend",
        "customer-web",
        "admin-panel",
        "restaurant-web",
        "driver-web",
      ],
      { env: environment },
    );
    await waitFor(
      "backend after recreation",
      async () =>
        (await request(`${backendBase}/api/health/ready`)).response.status ===
        200,
    );
    assertBackendSecretEnvironment(environment);
    await verifyRefreshFlow(
      backendBase,
      driverA.refreshToken,
      jwtSecret,
      jwtRefreshSecret,
      driverA.driverId,
      environment,
    );
    await verifyRestaurantLogin(backendBase, restaurantPassword);
    await checkFrontend("driver-web after recreation", driverPort, "/login");
    if (databaseSnapshot(lifecycleOrderId) !== beforeRestart)
      fail("order state changed during application recreation");
    const backendContainerAfterRecreate = compose(["ps", "-q", "backend"], {
      env: environment,
      quiet: true,
    }).output.trim();
    if (
      !backendContainerBeforeRecreate ||
      !backendContainerAfterRecreate ||
      backendContainerBeforeRecreate === backendContainerAfterRecreate
    )
      fail("backend container recreation was not proven");
    evidence.summary.driverRuntimeLifecycle.afterApplicationRecreate =
      await verifyDriverPersistenceHttp(
        backendBase,
        lifecycleOrderId,
        driverA,
        driverB,
        "application recreation",
      );
    evidence.summary.driverRuntimeLifecycle.backendContainerRecreated = true;

    const bootstrapPostgresLogs = run(
      "docker",
      ["logs", "--timestamps", initialPostgres.containerId],
      { quiet: true },
    ).output;
    const preRecreateLogs = compose(
      [
        "logs",
        "--no-color",
        "--timestamps",
        "redis",
        "backend",
        "customer-web",
        "admin-panel",
        "restaurant-web",
        "driver-web",
      ],
      {
        env: environment,
        quiet: true,
      },
    ).output;
    for (const value of secretValues)
      if (
        preRecreateLogs.includes(value) ||
        bootstrapPostgresLogs.includes(value)
      )
        fail("simulation logs contain a generated secret");
    const bootstrapContext = {
      phase: "fresh-database-initdb",
      bootstrapWindowStart: freshDatabaseStartedAt,
      bootstrapWindowEnd,
      initialContainerId: initialPostgres.containerId,
      sourceContainerId: initialPostgres.containerId,
      isolatedNamespace: project,
      freshNamespaceVerified: true,
      initialVolumeName: initialPostgres.volumeName,
      expectedInitialVolumeName,
      initialVolumeIdentity: initialPostgres.volumeIdentity,
      initialVolumeCreatedAt: initialPostgres.volumeCreatedAt,
      applicationDatabaseReachable,
      migrationsApplied,
      schemaReachable,
      databaseOperationVerified,
      seedSucceeded,
      seedIdempotent,
      postgresHealthy: initialPostgres.healthy,
      backendReady,
      recreateRequestedAt: undefined,
    };
    evidence.summary.postgresBootstrap = {
      result: "NOT_PROVEN",
      initialPostgresContainerId: initialPostgres.containerId,
      sourcePostgresContainerId: initialPostgres.containerId,
      namespace: project,
      freshNamespaceVerified: true,
      bootstrapWindowStart: freshDatabaseStartedAt.toISOString(),
      bootstrapWindowEnd: bootstrapWindowEnd.toISOString(),
      initialVolumeName: initialPostgres.volumeName,
      initialVolumeIdentity: initialPostgres.volumeIdentity,
      initialVolumeCreatedAt: initialPostgres.volumeCreatedAt,
      postconditions: {
        postgresHealthy: initialPostgres.healthy,
        applicationDatabaseReachable,
        migrationsApplied,
        schemaReachable,
        databaseOperationVerified,
        seedSucceeded,
        seedIdempotent,
        backendReady,
      },
      classifiedBootstrapShutdownDiagnostics: [],
    };
    evidence.write(
      "postgres-bootstrap.json",
      evidence.summary.postgresBootstrap,
    );
    const bootstrapAudit = auditLogs(
      bootstrapPostgresLogs,
      bootstrapContext,
      "phase 1 PostgreSQL initdb bootstrap log audit",
    );
    evidence.summary.postgresBootstrap = {
      ...evidence.summary.postgresBootstrap,
      result: "PASS",
      classifiedBootstrapShutdownDiagnostics:
        bootstrapAudit.classifiedBootstrapShutdownDiagnostics,
    };
    evidence.summary.classifiedBootstrapShutdownDiagnostics =
      bootstrapAudit.classifiedBootstrapShutdownDiagnostics;
    evidence.write(
      "postgres-bootstrap.json",
      evidence.summary.postgresBootstrap,
    );
    auditLogs(
      preRecreateLogs,
      { phase: "normal-operation" },
      "phase 1 non-PostgreSQL runtime log audit",
    );

    const oldPostgres = postgresIdentity(environment);
    if (oldPostgres.containerId !== initialPostgres.containerId)
      fail("initial PostgreSQL container changed before controlled recreate");
    if (!oldPostgres.healthy)
      fail("PostgreSQL was not healthy before controlled recreate");
    postgresVolumeName = oldPostgres.volumeName;
    setEvidencePhase("postgres-recreate", "controlled-stop");
    const recreateRequestedAt = new Date();
    const controlledStopResult = compose(["stop", "postgres"], {
      env: environment,
    });
    const stoppedPostgresContainer = inspectJson(
      "container",
      oldPostgres.containerId,
    );
    const oldPostgresContainerEndedAt = new Date(
      stoppedPostgresContainer.State?.FinishedAt,
    );
    if (Number.isNaN(oldPostgresContainerEndedAt.getTime()))
      fail("old PostgreSQL container end timestamp is missing");
    const controlledStop = {
      eventType: "controlled-postgres-stop",
      namespace: project,
      targetContainerId: oldPostgres.containerId,
      startedAt: recreateRequestedAt.toISOString(),
      endedAt: oldPostgresContainerEndedAt.toISOString(),
      exitCode: controlledStopResult.status,
      operation: "docker compose stop postgres",
    };
    const shutdownLogs = run(
      "docker",
      [
        "logs",
        "--timestamps",
        "--since",
        recreateRequestedAt.toISOString(),
        oldPostgres.containerId,
      ],
      { quiet: true },
    ).output;
    compose(["rm", "-f", "postgres"], { env: environment });
    if (
      compose(["ps", "-a", "-q", "postgres"], {
        env: environment,
        quiet: true,
      }).output.trim()
    ) {
      fail("old PostgreSQL container still exists after controlled removal");
    }
    compose(["up", "-d", "--wait", "postgres"], { env: environment });
    await waitFor(
      "PostgreSQL after controlled recreate",
      () =>
        compose(
          [
            "exec",
            "-T",
            "postgres",
            "pg_isready",
            "-U",
            "uberfoods",
            "-d",
            "uberfoods",
          ],
          { env: environment, allowFailure: true, quiet: true },
        ).status === 0,
    );
    const recoveredAt = new Date();
    const newPostgres = postgresIdentity(environment);
    const newPostgresContainerStartedAt = new Date(newPostgres.startedAt);
    if (Number.isNaN(newPostgresContainerStartedAt.getTime()))
      fail("new PostgreSQL container start timestamp is missing");
    compose(
      [
        "run",
        "--rm",
        "migration",
        "npx",
        "prisma",
        "migrate",
        "status",
        "--schema=./prisma/schema.prisma",
      ],
      { env: environment },
    );

    compose(["restart", "backend"], { env: environment });
    await waitFor(
      "backend after PostgreSQL recreate",
      async () =>
        (await request(`${backendBase}/api/health/ready`)).response.status ===
        200,
    );
    assertBackendSecretEnvironment(environment);
    await verifyRefreshFlow(
      backendBase,
      driverA.refreshToken,
      jwtSecret,
      jwtRefreshSecret,
      driverA.driverId,
      environment,
    );
    await verifyRestaurantLogin(backendBase, restaurantPassword);
    await checkFrontend(
      "customer-web after PostgreSQL recreate",
      customerPort,
      "/restaurants",
    );
    const afterPostgresRecreate = databaseSnapshot(lifecycleOrderId);
    evidence.summary.driverRuntimeLifecycle.afterPostgresRecreate =
      await verifyDriverPersistenceHttp(
        backendBase,
        lifecycleOrderId,
        driverA,
        driverB,
        "PostgreSQL recreation",
      );
    evidence.write(
      "driver-runtime-lifecycle.json",
      evidence.summary.driverRuntimeLifecycle,
    );
    const afterPostgresRecreateStructured = structuredOrderSnapshot(
      afterPostgresRecreate,
    );
    const persistenceVerified = afterPostgresRecreate === beforeRestart;
    const ownershipVerified =
      beforeRestartStructured.orderId ===
        afterPostgresRecreateStructured.orderId &&
      beforeRestartStructured.status ===
        afterPostgresRecreateStructured.status &&
      beforeRestartStructured.customerId ===
        afterPostgresRecreateStructured.customerId &&
      beforeRestartStructured.restaurantId ===
        afterPostgresRecreateStructured.restaurantId &&
      beforeRestartStructured.driverId ===
        afterPostgresRecreateStructured.driverId;
    const postgresRecovered =
      newPostgres.healthy &&
      afterPostgresRecreateStructured.status === "DELIVERED";
    const backendRecovered = true;
    const persistenceAfter = {
      orderId: lifecycleOrderId,
      snapshot: afterPostgresRecreate,
      ownership: afterPostgresRecreateStructured,
      sha256: sha256({
        orderId: lifecycleOrderId,
        snapshot: afterPostgresRecreate,
      }),
      result: persistenceVerified ? "PASS" : "FAIL",
      ownershipResult: ownershipVerified ? "PASS" : "FAIL",
    };
    evidence.write("persistence-after.json", persistenceAfter);
    evidence.summary.persistenceComparison = {
      ...persistenceAfter,
      beforeSha256: persistenceBefore.sha256,
    };
    if (!persistenceVerified)
      fail("order state changed during PostgreSQL container recreation");
    if (!ownershipVerified)
      fail("order ownership changed during PostgreSQL container recreation");

    assertPostgresRecreateEvidence({
      oldContainerId: oldPostgres.containerId,
      newContainerId: newPostgres.containerId,
      oldVolumeName: oldPostgres.volumeName,
      newVolumeName: newPostgres.volumeName,
      oldVolumeCreatedAt: oldPostgres.volumeCreatedAt,
      newVolumeCreatedAt: newPostgres.volumeCreatedAt,
      postgresVolumeIdentityBefore: oldPostgres.volumeIdentity,
      postgresVolumeIdentityAfter: newPostgres.volumeIdentity,
      recreateRequestedAt,
      oldPostgresContainerEndedAt,
      newPostgresContainerStartedAt,
      postgresRecovered,
      backendRecovered,
      persistenceVerified,
      ownershipVerified,
      seedRanAfterRecreate: false,
    });
    const backendRecoveryAt = new Date();
    evidence.summary.postgresRecreate = {
      result: "PASS",
      composeProject: project,
      service: "postgres",
      oldContainerName: oldPostgres.containerName,
      oldContainerId: oldPostgres.containerId,
      newContainerName: newPostgres.containerName,
      newContainerId: newPostgres.containerId,
      containerIdsDiffer: oldPostgres.containerId !== newPostgres.containerId,
      volumeBefore: oldPostgres.volumeName,
      volumeAfter: newPostgres.volumeName,
      volumeIdentical: oldPostgres.volumeName === newPostgres.volumeName,
      postgresVolumeIdentityBefore: oldPostgres.volumeIdentity,
      postgresVolumeIdentityAfter: newPostgres.volumeIdentity,
      postgresHealthyBefore: oldPostgres.healthy,
      postgresHealthyAfter: newPostgres.healthy,
      postgresRecovered,
      backendRecovered,
      persistenceVerified,
      ownershipVerified,
      backendReadyAfter: backendRecovered,
      controlledStop,
      recreateRequestedAt: recreateRequestedAt.toISOString(),
      shutdownWindowStart: recreateRequestedAt.toISOString(),
      shutdownWindowEnd: oldPostgresContainerEndedAt.toISOString(),
      oldPostgresContainerEndedAt: oldPostgresContainerEndedAt.toISOString(),
      newPostgresContainerStartedAt:
        newPostgresContainerStartedAt.toISOString(),
      postgresRecoveredAt: recoveredAt.toISOString(),
      backendRecoveredAt: backendRecoveryAt.toISOString(),
      classifiedRecreateShutdownDiagnostics: [],
    };
    const lifecycleAudit = auditLogs(
      shutdownLogs,
      {
        phase: "postgres-recreate",
        recreateRequestedAt,
        shutdownWindowStart: recreateRequestedAt,
        shutdownWindowEnd: oldPostgresContainerEndedAt,
        oldPostgresContainerEndedAt,
        newPostgresContainerStartedAt,
        postgresVolumeIdentityBefore: oldPostgres.volumeIdentity,
        postgresVolumeIdentityAfter: newPostgres.volumeIdentity,
        postgresRecovered,
        backendRecovered,
        persistenceVerified,
        ownershipVerified,
        oldContainerId: oldPostgres.containerId,
        newContainerId: newPostgres.containerId,
        sourceContainerId: oldPostgres.containerId,
        isolatedNamespace: project,
        controlledStop,
      },
      "phase 2 PostgreSQL lifecycle log audit",
    );
    const postRecoveryLogs = compose(["logs", "--no-color", "--timestamps"], {
      env: environment,
      quiet: true,
    }).output;
    for (const value of secretValues)
      if (postRecoveryLogs.includes(value))
        fail("post-recovery simulation logs contain a generated secret");
    auditLogs(
      postRecoveryLogs,
      { phase: "post-recovery" },
      "phase 3 post-recovery log audit",
    );
    evidence.summary.runtimeLogAudit = {
      result: "PASS",
      bootstrapExpectedShutdowns: bootstrapAudit.expectedShutdowns,
      lifecycleExpectedShutdowns: lifecycleAudit.expectedShutdowns,
      classifiedExpectedShutdownDiagnostics: [
        ...bootstrapAudit.classifiedExpectedShutdownDiagnostics,
        ...lifecycleAudit.classifiedExpectedShutdownDiagnostics,
      ],
      classifiedBootstrapShutdownDiagnostics:
        bootstrapAudit.classifiedBootstrapShutdownDiagnostics,
      classifiedRecreateShutdownDiagnostics:
        lifecycleAudit.classifiedRecreateShutdownDiagnostics,
      unexplainedFatalDiagnostics: lifecycleAudit.unexplainedFatalDiagnostics,
      lifecycleState: lifecycleAudit.lifecycleState,
    };
    evidence.summary.postgresRecreate.classifiedRecreateShutdownDiagnostics =
      lifecycleAudit.classifiedRecreateShutdownDiagnostics;
    evidence.summary.postgresRecreate.lifecycleState =
      lifecycleAudit.lifecycleState;
    Object.assign(evidence.summary, {
      oldPostgresContainerId: oldPostgres.containerId,
      newPostgresContainerId: newPostgres.containerId,
      sourcePostgresContainerId: oldPostgres.containerId,
      oldPostgresContainerEndedAt: oldPostgresContainerEndedAt.toISOString(),
      recreateRequestedAt: recreateRequestedAt.toISOString(),
      newPostgresContainerStartedAt:
        newPostgresContainerStartedAt.toISOString(),
      shutdownWindowStart: recreateRequestedAt.toISOString(),
      shutdownWindowEnd: oldPostgresContainerEndedAt.toISOString(),
      postgresVolumeIdentityBefore: oldPostgres.volumeIdentity,
      postgresVolumeIdentityAfter: newPostgres.volumeIdentity,
      postgresRecovered,
      backendRecovered,
      persistenceVerified,
      ownershipVerified,
      classifiedExpectedShutdownDiagnostics:
        evidence.summary.runtimeLogAudit.classifiedExpectedShutdownDiagnostics,
      classifiedBootstrapShutdownDiagnostics:
        bootstrapAudit.classifiedBootstrapShutdownDiagnostics,
      classifiedRecreateShutdownDiagnostics:
        lifecycleAudit.classifiedRecreateShutdownDiagnostics,
      unexplainedFatalDiagnostics: lifecycleAudit.unexplainedFatalDiagnostics,
      lifecycleState: lifecycleAudit.lifecycleState,
      secretScan: {
        result: "PASS",
        checkedRuntimeSecretValues: secretValues.size,
      },
    });
    evidence.write("postgres-recreate.json", evidence.summary.postgresRecreate);
    evidence.write("runtime-log-audit.json", evidence.summary.runtimeLogAudit);
    console.log(
      `PostgreSQL recreate evidence: old-container=${oldPostgres.containerName}/${oldPostgres.containerId}; new-container=${newPostgres.containerName}/${newPostgres.containerId}; volume=${postgresVolumeName}; expected-shutdown-diagnostics=${lifecycleAudit.expectedShutdowns}`,
    );
    console.log(
      "Production simulation passed: compiled runtime, static delivery, CORS/security, application lifecycle, PostgreSQL recreation, persistence, and phased log audit.",
    );
  } catch (error) {
    primaryFailure = error;
    const primary = {
      phase: evidencePhase,
      step: evidenceStep,
      timestamp: new Date().toISOString(),
      exitCode: 1,
      sanitizedMessage: sanitize(
        error instanceof Error ? error.message : error,
      ),
      sourceLogFile: "events.jsonl",
    };
    evidence.summary.primaryFailure = primary;
    evidence.write("primary-failure.txt", JSON.stringify(primary, null, 2));
    console.error(
      `Primary failure: ${sanitize(error instanceof Error ? error.message : error)}`,
    );
    const logs = compose(["logs", "--no-color"], {
      env: environment,
      allowFailure: true,
      quiet: true,
    }).output;
    if (logs)
      console.error(sanitize(logs).split(/\r?\n/).slice(-120).join("\n"));
  } finally {
    try {
      safeFinalCleanup(environment);
      evidence.summary.cleanup = { result: "PASS" };
      evidence.write("cleanup-result.json", evidence.summary.cleanup);
      console.log("Final isolated namespace cleanup passed.");
    } catch (error) {
      cleanupFailure = error;
      const cleanup = {
        result: "FAIL",
        sanitizedMessage: sanitize(
          error instanceof Error ? error.message : error,
        ),
      };
      evidence.summary.cleanupFailure = cleanup;
      evidence.write("cleanup-failure.txt", JSON.stringify(cleanup, null, 2));
      console.error(
        `Cleanup failure: ${sanitize(error instanceof Error ? error.message : error)}`,
      );
    }
    finalizationResult = finalizeSimulationEvidence({
      evidence,
      repoRoot,
      phase: evidencePhase,
      step: evidenceStep,
      primaryFailure,
      cleanupFailure,
      runtimeLogAuditStatus: evidence.summary.runtimeLogAudit?.result,
    });
    if (finalizationResult.ok)
      console.log(
        `Production simulation summary: ${finalizationResult.result.summaryPath}`,
      );
    finalExitCode = finalizationResult.exitCode;
    process.exitCode = finalExitCode;
  }
}

main().catch((error) => {
  console.error(
    `Production simulation unexpected failure: ${sanitize(error instanceof Error ? error.message : error)}`,
  );
  process.exitCode = 1;
});

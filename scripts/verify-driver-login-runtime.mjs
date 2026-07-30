import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fetchWithDeadline, onceAsync, parseComposePort, requireLoopbackBinding, runChildProcess, waitForHealth } from './driver-login-runtime-utils.mjs';

const composeFile = 'docker-compose.driver-login-local.yml';
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const project = `uberfoods_driver_login_${revision}_${randomBytes(4).toString('hex')}`;
const env = {
  ...process.env,
  COMPOSE_PROJECT_NAME: project,
  DRIVER_LOGIN_POSTGRES_PASSWORD: randomBytes(24).toString('base64url'),
  DRIVER_LOGIN_JWT_SECRET: randomBytes(32).toString('base64url'),
  DRIVER_LOGIN_JWT_REFRESH_SECRET: randomBytes(32).toString('base64url'),
  SEED_CUSTOMER_PASSWORD: randomBytes(24).toString('base64url'),
  SEED_RESTAURANT_PASSWORD: randomBytes(24).toString('base64url'),
  SEED_DRIVER_PASSWORD: randomBytes(24).toString('base64url'),
};
const compose = ['compose', '-p', project, '-f', composeFile];
let cleanedUp = false;
const diagnosticsEnabled = process.env.DRIVER_LOGIN_RUNTIME_DIAGNOSTICS === '1';
const phaseTimeouts = {
  config: 30_000,
  services: 120_000,
  port: 30_000,
  prepareDatabase: 12 * 60_000,
  backendStart: 8 * 60_000,
  backendHealth: 3 * 60_000,
  login: 20_000,
  cleanup: 120_000,
};

function diagnostic(event) {
  if (diagnosticsEnabled) console.error(`[driver-login-runtime] ${JSON.stringify({ project, ...event })}`);
}

async function runCompose(phase, args, timeoutMs) {
  console.log(`[driver-login-runtime] phase=${phase}`);
  return runChildProcess({ command: 'docker', args: [...compose, ...args], env, cwd: process.cwd(), phase, timeoutMs, diagnostics: diagnostic });
}

const cleanup = onceAsync(async () => {
  cleanedUp = true;
  try {
    await runCompose('cleanup', ['down', '--volumes', '--remove-orphans'], phaseTimeouts.cleanup);
  } catch (error) {
    console.error(`Cleanup for ${project} failed: ${error.message}`);
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void cleanup().finally(() => { process.exitCode = signal === 'SIGINT' ? 130 : 143; });
  });
}

async function publishedPort(service, containerPort) {
  const result = await runCompose(`port-${service}`, ['port', service, String(containerPort)], phaseTimeouts.port);
  const binding = parseComposePort(result.stdout);
  return requireLoopbackBinding(binding, service);
}

async function healthWithLogs(baseUrl) {
  try {
    await waitForHealth({ baseUrl, timeoutMs: phaseTimeouts.backendHealth, intervalMs: 1_000, requestTimeoutMs: 5_000, diagnostics: diagnostic });
  } catch (error) {
    try {
      const logs = await runCompose('backend-health-logs', ['logs', '--no-color', '--tail', '80', 'backend'], phaseTimeouts.port);
      if (logs.stdout || logs.stderr) console.error([logs.stdout, logs.stderr].filter(Boolean).join('\n'));
    } catch (logsError) {
      console.error(`Could not collect backend logs: ${logsError.message}`);
    }
    throw error;
  }
}

async function requestJson(baseUrl, body) {
  const response = await fetchWithDeadline(fetch, `${baseUrl}/api/auth/driver/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }, phaseTimeouts.login);
  return { response, body: await response.json() };
}

function assertNoTokens(result, description) {
  if (result.response.ok || result.body?.data?.access_token || result.body?.data?.refresh_token) {
    throw new Error(`${description} did not fail closed`);
  }
}

async function main() {
  console.log(`Starting isolated driver-login verification project ${project}`);
  await runCompose('config', ['config', '--quiet'], phaseTimeouts.config);
  await runCompose('services-start', ['up', '-d', 'postgres', 'redis'], phaseTimeouts.services);

  const postgres = await publishedPort('postgres', 5432);
  const redis = await publishedPort('redis', 6379);
  console.log(`Allocated loopback ports: postgres=${postgres.host}:${postgres.port}, redis=${redis.host}:${redis.port}`);

  await runCompose('database-prepare', ['run', '--rm', '--no-deps', 'backend', 'sh', '-lc', 'cd /app/backend && npm run prisma:generate && npm run prisma:migrate:deploy && npm run prisma:seed && npm run prisma:seed'], phaseTimeouts.prepareDatabase);
  await runCompose('backend-start', ['up', '-d', '--no-build', 'backend'], phaseTimeouts.backendStart);

  const backend = await publishedPort('backend', 3000);
  const baseUrl = `http://127.0.0.1:${backend.port}`;
  console.log(`Allocated loopback backend port: ${backend.host}:${backend.port}`);
  await healthWithLogs(baseUrl);

  console.log('[driver-login-runtime] phase=positive-login');
  const login = await requestJson(baseUrl, { email: 'driver@uberfoods.local', password: env.SEED_DRIVER_PASSWORD });
  const role = String(login.body?.data?.user?.role ?? login.body?.data?.user?.userType ?? '').toUpperCase();
  if (!login.response.ok || login.body?.success !== true || typeof login.body?.data?.access_token !== 'string' || typeof login.body?.data?.refresh_token !== 'string' || role !== 'DRIVER') {
    throw new Error('Seeded driver login did not return the expected successful driver session');
  }

  console.log('[driver-login-runtime] phase=negative-logins');
  assertNoTokens(await requestJson(baseUrl, { email: 'driver@uberfoods.local', password: 'not-the-seeded-password' }), 'Invalid driver password');
  assertNoTokens(await requestJson(baseUrl, { email: 'missing-driver@uberfoods.local', password: env.SEED_DRIVER_PASSWORD }), 'Unknown driver');
  assertNoTokens(await requestJson(baseUrl, { email: 'driver@uberfoods.local' }), 'Invalid driver payload');
  console.log('Isolated driver seed/login verification passed.');
}

try {
  await main();
} catch (error) {
  console.error(error.stack ?? error);
  process.exitCode = 1;
} finally {
  await cleanup();
}

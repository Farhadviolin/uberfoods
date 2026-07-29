import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const compose = readFileSync(
  path.join(repoRoot, "docker-compose.production-sim.yml"),
  "utf8",
);
const verifier = readFileSync(
  path.join(repoRoot, "scripts/verify-production-simulation.mjs"),
  "utf8",
);

test("bootstrap healthcheck cannot query the application database before initdb creates it", () => {
  assert.match(
    compose,
    /pg_isready -U uberfoods -d postgres/,
    "bootstrap readiness must use PostgreSQL's maintenance database",
  );
  assert.doesNotMatch(compose, /pg_isready -U uberfoods -d uberfoods/);
});

test("the verifier still proves the application database and migration schema after bootstrap", () => {
  assert.match(verifier, /pg_tables WHERE schemaname = 'public'/);
  assert.match(verifier, /prisma[\s\S]*migrate[\s\S]*status/);
  assert.match(
    verifier,
    /"pg_isready",\s*"-U",\s*"uberfoods",\s*"-d",\s*"uberfoods"/,
  );
});

test("command evidence is non-empty and failed log audits preserve unexplained diagnostics", () => {
  assert.match(verifier, /\[command completed without output\]/);
  assert.match(
    verifier,
    /evidence\.summary\.unexplainedFatalDiagnostics\s*=\s*result\.unexplainedFatalDiagnostics/,
  );
});

test("production simulation provisions and proves two-driver runtime isolation", () => {
  assert.match(
    compose,
    /PROD_SIM_DRIVER_B_PASSWORD: \$\{PROD_SIM_DRIVER_B_PASSWORD:\?set by verifier\}/,
  );
  assert.match(verifier, /create-production-sim-driver-b\.js/);
  assert.match(verifier, /parseDriverRuntimeEvidence/);
  assert.match(verifier, /crossReadStatus: 403/);
  assert.match(verifier, /crossAcceptStatus: 409/);
  assert.match(verifier, /crossStatusUpdateStatus: 403/);
  assert.match(verifier, /illegalTransitionStatus: 409/);
  assert.match(verifier, /verifyDriverPersistenceHttp/);
  assert.match(verifier, /backend container recreation was not proven/);
});

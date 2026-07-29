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
const finalVerification = readFileSync(
  path.join(repoRoot, "backend/scripts/final-verification.ps1"),
  "utf8",
);
const apiVerificationWorkflows = [
  ".github/workflows/ci.yml",
  ".github/workflows/api-verification.yml",
  ".github/workflows/local-development.yml",
].map((relativePath) => ({
  relativePath,
  source: readFileSync(path.join(repoRoot, relativePath), "utf8"),
}));

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

test("every API verification workflow provisions the second production-simulation driver", () => {
  for (const { relativePath, source } of apiVerificationWorkflows) {
    assert.match(
      source,
      /PROD_SIM_DRIVER_B_PASSWORD:\s+\S+/,
      `${relativePath} must configure Driver B's runtime credential`,
    );
    assert.match(
      source,
      /node scripts\/create-production-sim-driver-b\.js/,
      `${relativePath} must provision Driver B before final verification`,
    );
    assert.ok(
      source.indexOf("node scripts/create-production-sim-driver-b.js") <
        source.indexOf("final-verification.ps1"),
      `${relativePath} must provision Driver B before final verification runs`,
    );
  }
});

test("final verification preserves a single available order enumerated by PowerShell", () => {
  assert.match(
    finalVerification,
    /if \(Get-OrderIdFromResponse -ResponseJson \$ResponseJson\) \{ return @\(\$ResponseJson\) \}/,
  );
});

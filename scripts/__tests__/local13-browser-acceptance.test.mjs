import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sessionSource = readFileSync(path.join(repoRoot, "scripts/local13-session.mjs"), "utf8");
const browserSource = readFileSync(path.join(repoRoot, "scripts/local13-browser-acceptance.mjs"), "utf8");

test("LOCAL-13 session isolates namespace, ports, credentials, and cleanup", () => {
  assert.match(sessionSource, /createServer\(\)/);
  assert.match(sessionSource, /listen\(0,\s*["']127\.0\.0\.1["']/);
  assert.match(sessionSource, /randomBytes\(/);
  assert.match(sessionSource, /os\.tmpdir\(\)/);
  assert.match(sessionSource, /icacls/);
  assert.match(sessionSource, /uberfoods_local13_/);
  assert.match(sessionSource, /down.*--volumes.*--remove-orphans/s);
  assert.match(sessionSource, /verifyNamespaceOwnership/);
  assert.match(sessionSource, /rmSync\(session\.credentialBundlePath/);
  assert.match(sessionSource, /UberFoods-local13-080-artifacts/);
});

test("browser acceptance uses independent UI contexts and real controls", () => {
  for (const role of ["customer", "admin", "restaurant", "driverA", "driverB", "guest"]) {
    assert.match(browserSource, new RegExp(`browserContexts\\.${role}`));
  }
  assert.match(browserSource, /browser\.newContext\(/g);
  assert.match(browserSource, /getByTestId\("payment-confirm-button"\)/);
  assert.match(browserSource, /driver-accept-order-/);
  assert.match(browserSource, /driver-\$\{testIdSuffix\}-order-\$\{orderId\}/);
  assert.match(browserSource, /sidebar-link-orders/);
  assert.doesNotMatch(browserSource, /localStorage\.setItem/);
  assert.doesNotMatch(browserSource, /storageState\s*:/);
  assert.doesNotMatch(browserSource, /page\.evaluate\(/);
  assert.doesNotMatch(browserSource, /fetch\(/);
  assert.doesNotMatch(browserSource, /request\.(post|get|put|patch|delete)\(/);
});

test("evidence is path-only and secret-scan guarded", () => {
  assert.match(browserSource, /new URL\(url\)\.pathname/);
  assert.match(browserSource, /sanitized-network\.json/);
  assert.match(browserSource, /sanitized-console\.json/);
  assert.match(browserSource, /scanTextArtifacts/);
  assert.match(browserSource, /credentialFreeEvidence/);
  assert.match(browserSource, /screenshot\(/);
  assert.doesNotMatch(browserSource, /response\.body\(/);
  assert.doesNotMatch(browserSource, /response\.allHeaders\(/);
});

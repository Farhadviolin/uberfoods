import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRenderBlueprint } from "../lib/render-blueprint-contract.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const requireFromBackend = createRequire(
  path.join(repoRoot, "backend", "package.json"),
);
const yaml = requireFromBackend("js-yaml");
const read = (relativePath) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");
const blueprintSource = read("render.yaml");
const sources = {
  csp: {
    customer: read("frontend/customer-web/index.html"),
    admin: read("frontend/admin-panel/index.html"),
    driver: read("frontend/driver-app/index.html"),
  },
  adminConfig: read("frontend/admin-panel/src/config.ts"),
};
const parse = () => yaml.load(blueprintSource);
const clone = (value) => structuredClone(value);
const service = (document, name) =>
  document.services.find((item) => item.name === name);
const env = (document, serviceName, key) =>
  service(document, serviceName).envVars.find((item) => item.key === key);

test("the repository Render staging contract is deployment-ready", () => {
  assert.equal(validateRenderBlueprint(parse(), sources).result, "PASS");
});

for (const [name, mutate, expected] of [
  [
    "missing SPA rewrite",
    (document) => {
      delete service(document, "uberfoods-customer-web-staging").routes;
    },
    /must define a \/\* route/,
  ],
  [
    "redirect instead of rewrite",
    (document) => {
      service(document, "uberfoods-customer-web-staging").routes[0].type =
        "redirect";
    },
    /must use a rewrite/,
  ],
  [
    "wrong rewrite destination",
    (document) => {
      service(document, "uberfoods-customer-web-staging").routes[0].destination =
        "/404.html";
    },
    /must rewrite to \/index\.html/,
  ],
  [
    "missing Admin deep-link variable",
    (document) => {
      service(document, "uberfoods-admin-panel-staging").envVars =
        service(document, "uberfoods-admin-panel-staging").envVars.filter(
          (item) => item.key !== "VITE_DRIVER_APP_URL",
        );
    },
    /VITE_DRIVER_APP_URL is incorrect/,
  ],
  [
    "localhost production URL",
    (document) => {
      env(
        document,
        "uberfoods-admin-panel-staging",
        "VITE_DRIVER_APP_URL",
      ).value = "http://localhost:3004";
    },
    /VITE_DRIVER_APP_URL must not contain a local host/,
  ],
  [
    "HTTP staging URL",
    (document) => {
      env(
        document,
        "uberfoods-customer-web-staging",
        "VITE_API_BASE_URL",
      ).value = "http://uberfoods-backend-staging.onrender.com/api";
    },
    /VITE_API_BASE_URL must target the staging backend/,
  ],
  [
    "missing CORS origin",
    (document) => {
      env(document, "uberfoods-backend-staging", "ALLOWED_ORIGINS").value =
        env(document, "uberfoods-backend-staging", "ALLOWED_ORIGINS")
          .value.split(",")
          .slice(0, 3)
          .join(",");
    },
    /ALLOWED_ORIGINS must be exact/,
  ],
  [
    "committed JWT secret",
    (document) => {
      env(document, "uberfoods-backend-staging", "JWT_SECRET").value =
        "must-not-be-committed";
    },
    /JWT_SECRET must not be committed/,
  ],
]) {
  test(`rejects ${name}`, () => {
    const document = clone(parse());
    mutate(document);
    assert.throws(() => validateRenderBlueprint(document, sources), expected);
  });
}

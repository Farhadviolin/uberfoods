import assert from "node:assert/strict";

export const BACKEND_ORIGIN =
  "https://uberfoods-backend-staging.onrender.com";
export const BACKEND_WS_ORIGIN =
  "wss://uberfoods-backend-staging.onrender.com";

export const FRONTENDS = Object.freeze({
  "uberfoods-customer-web-staging": {
    rootDir: "frontend/customer-web",
    apiKey: "VITE_API_BASE_URL",
  },
  "uberfoods-admin-panel-staging": {
    rootDir: "frontend/admin-panel",
    apiKey: "VITE_API_URL",
  },
  "uberfoods-restaurant-web-staging": {
    rootDir: "frontend/restaurant-web",
    apiKey: "VITE_API_URL",
  },
  "uberfoods-driver-app-staging": {
    rootDir: "frontend/driver-app",
    apiKey: "VITE_API_URL",
  },
});

export const FRONTEND_ORIGINS = Object.freeze([
  "https://uberfoods-customer-web-staging.onrender.com",
  "https://uberfoods-admin-panel-staging.onrender.com",
  "https://uberfoods-restaurant-web-staging.onrender.com",
  "https://uberfoods-driver-app-staging.onrender.com",
]);

const ADMIN_LINKS = Object.freeze({
  VITE_CUSTOMER_WEB_URL: FRONTEND_ORIGINS[0],
  VITE_DRIVER_APP_URL: FRONTEND_ORIGINS[3],
  VITE_RESTAURANT_WEB_URL: FRONTEND_ORIGINS[2],
});

function envMap(service) {
  return new Map((service.envVars ?? []).map((entry) => [entry.key, entry]));
}

function assertExactService(services, name) {
  const matches = services.filter((service) => service.name === name);
  assert.equal(matches.length, 1, `expected exactly one service named ${name}`);
  return matches[0];
}

function assertSafePublicUrl(value, key) {
  assert.equal(typeof value, "string", `${key} must be a URL`);
  assert.ok(value.length > 0, `${key} must not be empty`);
  assert.doesNotMatch(
    value,
    /localhost|127\.0\.0\.1|\.local(?:[/:]|$)/i,
    `${key} must not contain a local host`,
  );
  const url = new URL(value);
  const expectedProtocol = key === "VITE_WS_URL" ? "wss:" : "https:";
  assert.equal(url.protocol, expectedProtocol, `${key} must use ${expectedProtocol}`);
}

function assertSpaRewrite(service) {
  const route = (service.routes ?? []).find((item) => item.source === "/*");
  assert.ok(route, `${service.name} must define a /* route`);
  assert.equal(route.type, "rewrite", `${service.name} must use a rewrite`);
  assert.equal(
    route.destination,
    "/index.html",
    `${service.name} must rewrite to /index.html`,
  );
}

function connectSource(csp) {
  const match = csp.match(/connect-src\s+([^;]+)/);
  assert.ok(match, "CSP must define connect-src");
  return match[1].split(/\s+/);
}

export function validateRenderBlueprint(document, sources) {
  assert.ok(document && typeof document === "object", "render.yaml must be YAML");
  const services = document.services ?? [];
  const backend = assertExactService(services, "uberfoods-backend-staging");
  assert.equal(backend.type, "web");
  assert.equal(backend.runtime, "node");
  assert.equal(backend.rootDir, "backend");
  assert.match(backend.buildCommand ?? "", /npm (?:ci|install).+npm run build/);
  assert.equal(backend.startCommand, "npm run start:prod");
  assert.equal(backend.healthCheckPath, "/api/health");

  const staticServices = services.filter((service) => service.runtime === "static");
  assert.equal(staticServices.length, 4, "expected exactly four static sites");

  for (const [name, contract] of Object.entries(FRONTENDS)) {
    const service = assertExactService(services, name);
    assert.equal(service.type, "web");
    assert.equal(service.runtime, "static");
    assert.equal(service.rootDir, contract.rootDir);
    assert.match(service.buildCommand ?? "", /npm (?:ci|install).+npm run build/);
    assert.equal(service.staticPublishPath, "./dist");
    assertSpaRewrite(service);

    const environment = envMap(service);
    assert.equal(
      environment.get(contract.apiKey)?.value,
      `${BACKEND_ORIGIN}/api`,
      `${contract.apiKey} must target the staging backend`,
    );
    assert.equal(environment.get("VITE_WS_URL")?.value, BACKEND_WS_ORIGIN);
    for (const [key, entry] of environment) {
      if (/URL$/.test(key) && "value" in entry) {
        assertSafePublicUrl(entry.value, key);
      }
    }
  }

  const adminEnvironment = envMap(
    assertExactService(services, "uberfoods-admin-panel-staging"),
  );
  for (const [key, value] of Object.entries(ADMIN_LINKS)) {
    assert.equal(adminEnvironment.get(key)?.value, value, `${key} is incorrect`);
  }

  const backendEnvironment = envMap(backend);
  const cors = backendEnvironment.get("ALLOWED_ORIGINS")?.value?.split(",") ?? [];
  assert.deepEqual(cors, FRONTEND_ORIGINS, "ALLOWED_ORIGINS must be exact");
  for (const key of ["JWT_SECRET", "JWT_REFRESH_SECRET"]) {
    const entry = backendEnvironment.get(key);
    assert.ok(entry, `${key} must be declared`);
    assert.equal(entry.sync, false, `${key} must be supplied outside Git`);
    assert.ok(!("value" in entry), `${key} must not be committed`);
  }

  for (const [name, csp] of Object.entries(sources.csp)) {
    const connect = connectSource(csp);
    assert.ok(connect.includes(BACKEND_ORIGIN), `${name} CSP lacks HTTPS backend`);
    assert.ok(connect.includes(BACKEND_WS_ORIGIN), `${name} CSP lacks WSS backend`);
    assert.ok(!connect.includes("*"), `${name} CSP must not allow *`);
    assert.ok(!connect.includes("https:"), `${name} CSP must not allow all HTTPS`);
    assert.ok(!connect.includes("wss:"), `${name} CSP must not allow all WSS`);
  }

  assert.match(sources.adminConfig, /VITE_CUSTOMER_WEB_URL/);
  assert.match(sources.adminConfig, /VITE_DRIVER_APP_URL/);
  assert.match(sources.adminConfig, /VITE_RESTAURANT_WEB_URL/);
  assert.match(sources.adminConfig, /Missing required environment variable/);

  return {
    backend: backend.name,
    staticSites: Object.keys(FRONTENDS),
    result: "PASS",
  };
}

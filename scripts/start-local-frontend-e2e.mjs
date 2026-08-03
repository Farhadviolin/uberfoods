#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [app, port, backendUrl = "http://127.0.0.1:3315"] = process.argv.slice(2);
const apps = {
  customer: "frontend/customer-web",
  admin: "frontend/admin-panel",
  restaurant: "frontend/restaurant-web",
  driver: "frontend/driver-app",
};

if (!apps[app] || !/^\d+$/.test(port || "") || !backendUrl) {
  throw new Error("usage: start-local-frontend-e2e.mjs <customer|admin|restaurant|driver> <port> <backend-url>");
}

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cwd = resolve(repoRoot, apps[app]);
const viteBin = resolve(cwd, "node_modules/vite/bin/vite.js");
const env = { ...process.env };

if (app === "customer") {
  env.VITE_API_BASE_URL = `${backendUrl}/api`;
  env.VITE_WS_URL = backendUrl;
} else if (app === "admin") {
  env.VITE_API_PROXY_TARGET = backendUrl;
} else if (app === "restaurant") {
  env.RESTAURANT_API_PROXY_TARGET = backendUrl;
  env.VITE_WS_URL = backendUrl;
} else {
  env.DRIVER_API_PROXY_TARGET = backendUrl;
}

const child = spawn(process.execPath, [viteBin, "--mode", "e2e", "--host", "127.0.0.1", "--port", port], {
  cwd,
  env,
  stdio: "inherit",
});

const stop = () => {
  if (!child.killed) child.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

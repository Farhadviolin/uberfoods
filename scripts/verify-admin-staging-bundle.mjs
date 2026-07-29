import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dist = path.resolve("frontend/admin-panel/dist");
const expected = [
  "https://uberfoods-backend-staging.onrender.com",
  "wss://uberfoods-backend-staging.onrender.com",
  "https://uberfoods-customer-web-staging.onrender.com",
  "https://uberfoods-driver-app-staging.onrender.com",
  "https://uberfoods-restaurant-web-staging.onrender.com",
];

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? files(absolute) : [absolute];
  });
}

const bundle = files(dist)
  .filter(
    (file) =>
      /\.js$/.test(file) &&
      !file.endsWith(".map") &&
      !path.basename(file).startsWith("vendor-"),
  )
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

for (const url of expected) {
  assert.ok(bundle.includes(url), `Admin staging bundle is missing ${url}`);
}
assert.doesNotMatch(
  bundle,
  /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/,
  "Admin staging bundle contains a local HTTP navigation target",
);

console.log("Admin staging bundle contract passed");

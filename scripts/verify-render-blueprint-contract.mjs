import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRenderBlueprint } from "./lib/render-blueprint-contract.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const requireFromBackend = createRequire(
  path.join(repoRoot, "backend", "package.json"),
);
const yaml = requireFromBackend("js-yaml");

const read = (relativePath) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");

try {
  const result = validateRenderBlueprint(yaml.load(read("render.yaml")), {
    csp: {
      customer: read("frontend/customer-web/index.html"),
      admin: read("frontend/admin-panel/index.html"),
      driver: read("frontend/driver-app/index.html"),
    },
    adminConfig: read("frontend/admin-panel/src/config.ts"),
  });
  console.log(
    `Render staging blueprint contract passed: ${result.staticSites.length} static sites`,
  );
} catch (error) {
  console.error(`Render staging blueprint contract failed: ${error.message}`);
  process.exitCode = 1;
}

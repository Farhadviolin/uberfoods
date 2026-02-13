import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

console.log("== Admin Panel: typecheck (app) ==");
run("npx", ["tsc", "-p", "tsconfig.json", "--noEmit"]);

console.log("== Admin Panel: typecheck (node/config) ==");
run("npx", ["tsc", "-p", "tsconfig.node.json", "--noEmit"]);

console.log("== Admin Panel: typecheck (e2e) ==");
run("npx", ["tsc", "-p", "tsconfig.e2e.json", "--noEmit"]);

console.log("✅ Typecheck OK");

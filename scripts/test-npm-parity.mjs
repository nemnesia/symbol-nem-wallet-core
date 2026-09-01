import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

try {
  execFileSync(process.execPath, ["scripts/test-npm-package.mjs", "--formal-parity"], {
    cwd: repositoryRoot,
    stdio: "inherit",
  });
} catch (error) {
  process.exitCode = typeof error?.status === "number" && error.status !== 0 ? error.status : 1;
}

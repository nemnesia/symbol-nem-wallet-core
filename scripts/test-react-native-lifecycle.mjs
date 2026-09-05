import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "snwc-rn-lifecycle-"));
try {
  const output = resolve(temporaryRoot, "lifecycle-test");
  execFileSync("c++", [
    "-std=c++17",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-pthread",
    resolve(repositoryRoot, "packages/wallet-core/cpp/RnLifecycleCoordinator.cpp"),
    resolve(repositoryRoot, "scripts/rn-lifecycle-coordinator.test.cpp"),
    "-o",
    output,
  ], { cwd: repositoryRoot, stdio: "inherit" });
  execFileSync(output, [], { cwd: repositoryRoot, stdio: "inherit" });
  process.stdout.write("React Native lifecycle coordinator tests passed\n");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

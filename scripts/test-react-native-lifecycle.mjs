import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "snwc-rn-lifecycle-"));

function assertProductionDiagnosticsAreTestOnly() {
  const source = readFileSync(
    resolve(repositoryRoot, "packages/wallet-core/cpp/NativeSymbolNemWalletCore.cpp"),
    "utf8",
  );
  const integrationGuard = "#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)";
  const markers = [
    "std::string pointerIdentity",
    'if (operation == "__snwc_lifecycle_probe")',
  ];

  for (const marker of markers) {
    const markerOffset = source.indexOf(marker);
    const guardOffset = source.lastIndexOf(integrationGuard, markerOffset);
    const previousEndif = source.lastIndexOf("#endif", markerOffset);
    if (markerOffset < 0 || guardOffset < 0 || previousEndif > guardOffset) {
      throw new Error(`${marker} is not integration-test guarded`);
    }
  }
}

assertProductionDiagnosticsAreTestOnly();
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

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  // production AdmissionTicket本体をそのままcompileし、mutex取得順序まで検証する。
  const source = readFileSync(resolve(repositoryRoot, "packages/wallet-core/cpp/NativeSymbolNemWalletCore.cpp"), "utf8");
  const start = source.indexOf("class AdmissionTicket final {");
  const end = source.indexOf("\n};", start);
  if (start < 0 || end < 0) throw new Error("production AdmissionTicket unavailable");
  const harness = resolve(temporaryRoot, "admission.cpp");
  writeFileSync(harness, `
#include "RnLifecycleCoordinator.h"
#include <cassert>
#include <atomic>
#include <thread>
#include <stdexcept>
#include <utility>
using namespace facebook::react;
struct Runtime {};
constexpr const char *kBindingFailure = "BindingFailure";
[[noreturn]] void fail(const char *code) { throw std::runtime_error(code); }
${source.slice(start, end + 3)}
int main() {
  auto &coordinator = RnLifecycleCoordinator::shared();
  Runtime runtime;
  int registry = 0, context = 0, provider = 0;
  auto registration = coordinator.registerModule({&runtime, &registry, &context, &provider, 0});
  std::atomic<bool> started{false}, admitted{false};
  std::thread concurrent;
  {
    AdmissionTicket outer(coordinator, registration, runtime);
    bool rejected = false;
    try { AdmissionTicket nested(coordinator, registration, runtime); }
    catch (const std::runtime_error &error) { rejected = std::string(error.what()) == kBindingFailure; }
    assert(rejected);
    outer.ensureLive();
    concurrent = std::thread([&] {
      started = true;
      AdmissionTicket ticket(coordinator, registration, runtime);
      admitted = true;
      ticket.ensureLive();
    });
    while (!started) std::this_thread::yield();
    assert(!admitted);
  }
  concurrent.join();
  assert(admitted && !coordinator.hasActiveRequestOnCurrentThread());
  coordinator.invalidate(registration);
  bool staleRejected = false;
  try { AdmissionTicket stale(coordinator, registration, runtime); }
  catch (const std::runtime_error &) { staleRejected = true; }
  assert(staleRejected);
}
`);
  const admissionOutput = resolve(temporaryRoot, "admission-test");
  execFileSync("c++", ["-std=c++17", "-Wall", "-Wextra", "-Werror", "-pthread",
    "-I", resolve(repositoryRoot, "packages/wallet-core/cpp"),
    resolve(repositoryRoot, "packages/wallet-core/cpp/RnLifecycleCoordinator.cpp"), harness, "-o", admissionOutput],
    { cwd: repositoryRoot, stdio: "inherit" });
  execFileSync(admissionOutput, [], { cwd: repositoryRoot, stdio: "inherit", timeout: 5000 });
  process.stdout.write("React Native lifecycle coordinator tests passed\n");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

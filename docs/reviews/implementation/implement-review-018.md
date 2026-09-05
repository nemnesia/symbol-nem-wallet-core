# React Native Implementation Re-review 018

## 1. Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/react-native-support`
- Review target: `28112ffd1435f49d330c737c071f7ddc38bcf74d`
- Target parent: `9ce4cddb77554e8fa6b818b9488704912eb5c5da`
- Previous review: `docs/reviews/implementation/implement-review-017.md`
- Review date: 2026-09-06 (Asia/Tokyo)
- Scope: React Native New Architecture implementation, Android/iOS native artifact
  production and admission, release evidence/SBOM, lifecycle and stale-secret safety,
  and the existing Node / Browser / WASM / C ABI regression boundary.

## 2. Execution Audit

The Implementation Reviewer procedure was applied using four review paths:

- A: approved specification, API, and Android/iOS integration
- B: native artifact trust, provenance, fail-closed behavior, and secret lifecycle
- C: runtime identity, ABI/platform interoperability, and C ABI boundary
- D: tests, release workflow, package assembly, and regression evidence

The four paths were executed as independent evidence passes by the review chair. No
reviewer vote or unrecorded approval is used as evidence.

## 3. Evidence Used

- Repository `AGENTS.md`
- `.agents/skills/implement-review/SKILL.md` and its review-common, gate, security,
  reviewer, and output instructions
- `docs/design/architecture.md`, `docs/design/bindings.md`, and
  `docs/design/security.md`
- `docs/specifications/react-native.md`, especially §§4, 6, 8–16, 20–22
- `docs/specifications/npm-typescript-facade.md`
- `docs/reviews/implementation/implement-review-017.md`, including its Required
  Changes and Recheck criteria
- Target source, package assembly, release workflow, fixtures, and tests listed in
  the findings below

## 4. Review Result

**REVISE IMPLEMENTATION**

IR-023, IR-024, IR-025, and IR-026 remain HIGH and are reopened. The target contains
material partial corrections, but the required clean consumer build, reproducible
producer, native identity admission, and actual RN lifecycle identity contract are
not yet established.

## 5. Summary

The target improves the previous implementation by adding a source-controlled RN
consumer template, application-level Android registration wiring, structured ELF and
Mach-O inspection, package-level manifest checks, C ABI RAII release, and a delivery
barrier. Those changes do not close the following independent root causes:

| ID | Severity | Status | Gate impact |
| --- | --- | --- | --- |
| IR-023 | HIGH | Reopened | Android source/consumer build path is not buildable from the submitted CMake target |
| IR-024 | HIGH | Reopened | iOS source producer and dependency resolution are not reproducible from a clean checkout |
| IR-025 | HIGH | Reopened | Embedded target identity and final native load/link admission are not fail-closed |
| IR-026 | HIGH | Reopened | RN registry/context/process/request identity is still synthetic or module-local |
| IR-027 | LOW | Deferred | Dependabot evidence is non-blocking; alerts are confirmed dismissed |

## 6. Finding Status

| ID | Severity | Status | Current conclusion |
| --- | --- | --- | --- |
| IR-023 | HIGH | Reopened | The producer's Android source-build target cannot find its own C ABI header because the include path is consumer-only. |
| IR-024 | HIGH | Reopened | The iOS producer installs a source Pod before the C ABI is linked, and RN dependency resolution is not lockfile-frozen. |
| IR-025 | HIGH | Reopened | The parser now reads native tables, but runtime accepts any allowlisted identity and no final artifact load/link check binds the embedded identity. |
| IR-026 | HIGH | Reopened | Registration uses `jsInvoker.get()` and `this` as stand-ins for RN registry/context and lacks actual lifecycle hooks. |
| IR-027 | LOW | Deferred | Four dismissed LOW webpack alerts were observed through the Dependabot API; no package audit vulnerability was reported. |
| IR-001–IR-022 | — | Not reopened | No new regression evidence in the reviewed scope contradicts the prior status. |

Current unresolved findings: **CRITICAL 0 / HIGH 4 / MEDIUM 0 / LOW 1 deferred**.

## 7. Required Changes

### IR-023 — Android New Architecture source/consumer build path remains incomplete (HIGH / Reopened)

- **Location:** `packages/wallet-core/android/CMakeLists.txt:18-22,47-50`,
  `packages/wallet-core/cpp/NativeSymbolNemWalletCore.cpp:1-3`,
  `integration/react-native/consumer/android/app/src/main/jni/CMakeLists.txt:7-18`.
- **Fact:** The source-build branch creates `symbol_nem_wallet_core_rn` from
  `NativeSymbolNemWalletCore.cpp`, but the only include directories are attached with
  `INTERFACE`. `NativeSymbolNemWalletCore.cpp` directly includes
  `symbol_nem_wallet_core.h`, which is located at `cpp/include/symbol_nem_wallet_core.h`.
  An `INTERFACE` usage requirement is propagated to consumers; it does not provide the
  include directory to the target's own compilation. The controlled Android producer
  therefore cannot compile the source target as submitted.
- **Impact:** A clean RN 0.87 New Architecture producer cannot reach the intended
  per-ABI C ABI link and OnLoad/provider artifact. This is an implementation defect,
  independent of the unavailable local Android toolchain.
- **Minimum correction:** Give the package target a `PRIVATE` or `PUBLIC` include path
  for its own sources, retain the source-controlled application-level registration,
  and make the published package and source producer exercise the same ABI-specific
  CMake/provider contract without external repository variables.
- **Recheck:** From a clean checkout, build a normal RN 0.87.x New Architecture
  consumer for `arm64-v8a` and `x86_64`; load the provider and invoke all 16 APIs.
  Missing provider, missing artifact, wrong ABI, and missing C ABI symbols must fail
  as `WalletCoreBackendInitializationError` without a Node/WASM fallback.

### IR-024 — Four-artifact producer and iOS archive/XCFramework order remain non-reproducible (HIGH / Reopened)

- **Location:** `packages/wallet-core/ios/SymbolNemWalletCoreRN.podspec:12-24`,
  `scripts/build-react-native-release.mjs:100-127,166-212`,
  `integration/react-native/consumer/ios/Podfile`.
- **Fact:** The iOS producer first installs the source Pod at
  `build-react-native-release.mjs:177-180`. When the XCFramework is absent, the
  podspec compiles the RN C++ adapter and coordinator from `../cpp`, but it supplies
  no C ABI archive or linker flag. The C ABI is only combined later by
  `libtool` at lines 208-211. Thus the source build can fail on unresolved C ABI
  symbols before the final archive exists.
- **Fact:** The producer invokes `npx --yes react-native@0.87.0` and plain
  `npm install --ignore-scripts` without a source-controlled lockfile or frozen,
  integrity-bound dependency graph. `verifyTemplate` does not verify the iOS Podfile,
  and the generated RN project overwrites the copied template project files before
  the producer appends its own Pod entry.
- **Impact:** A clean checkout is not a reproducible producer for the two iOS slices,
  and a nominal four-target workflow cannot be treated as proof that the same inputs
  produce the same RN artifacts. The downstream manifest and SBOM checks cannot repair
  an upstream source-build/link failure or unpinned dependency resolution.
- **Minimum correction:** Make the complete consumer inputs, RN CLI/dependency graph,
  and relevant toolchain inputs source-controlled and frozen; link the target C ABI
  before the source Pod build or build the binding archive through a defined target;
  then assemble the two verified iOS archives into the XCFramework and only after
  that run the artifact-consuming Pod/link check. Keep all four target identities,
  manifest, tarball, provenance, SBOM, and inventory digests cross-verified.
- **Recheck:** Execute the producer from a clean checkout twice with identical inputs,
  generate exactly `android-arm64-v8a`, `android-x86_64`, `ios-arm64`, and
  `ios-simulator-arm64`, create the XCFramework after both iOS archives, consume it
  through the package Pod, and verify deterministic bytes and rejection of missing,
  extra, or incomplete inputs.

### IR-025 — Native identity and final load/link admission remain insufficiently fail-closed (HIGH / Reopened)

- **Location:** `packages/wallet-core/cpp/NativeSymbolNemWalletCoreProvider.cpp:28-38`,
  `packages/wallet-core/src/react-native/native-module.mjs:45-79,104-119`,
  `packages/wallet-core/src/react-native-manifest.mjs:212-274,277-397,450-495`,
  `scripts/build-react-native-release.mjs:193-212,231-245`.
- **Fact:** The target now parses ELF program headers/dynamic symbols and Mach-O
  archive members, checks platform/architecture, and rejects many malformed inputs.
  However, `snwc_rn_artifact_identity()` returns a compile-time target string, while
  the native parser records ELF/Mach-O structural identity but does not extract or
  bind that embedded target string to the manifest target. The JS admission check
  accepts `expectedArtifactIdentities.has(identity.artifact_identity)`, meaning any of
  the four canonical identities is accepted rather than the identity corresponding
  to the actually loaded ABI/slice and package path. An ABI-correct binary carrying a
  different allowlisted embedded identity can therefore pass both checks.
- **Fact:** The producer performs structural inspection after copying the Android
  output or combining the iOS archive, but the submitted workflow has no final
  `dlopen`/`System.loadLibrary`-equivalent check for the Android image and the iOS
  consumer command performs only `pod install` (`build-react-native-release.mjs:243-245`)
  after XCFramework assembly. There is no final consumer link/load check of the
  combined XCFramework slices.
- **Fact:** The positive native fixtures in `scripts/react-native-fixtures.mjs` are
  synthetic generated buffers. They exercise parser branches but do not provide
  valid production ELF/Mach-O artifacts or prove OS loader behavior. No negative test
  covers an ABI-correct artifact with a wrong embedded allowlisted identity.
- **Impact:** Wrong target identity or an untested final archive/load condition can
  cross the RN trust boundary while satisfying the current JSON/path allowlist.
  This is an implementation/admission gap; the actual native load/link execution is
  additionally unvalidated because the required toolchains are absent.
- **Minimum correction:** Bind the embedded native identity to the exact manifest
  target and current runtime-selected ABI/slice, reject any other allowlisted target,
  and validate the final produced bytes with an actual platform linker/loader check.
  Record independently verifiable target/toolchain/provenance evidence. Add negative
  tests for mismatched embedded identity, malformed/non-loadable ELF, wrong
  platform/slice, missing/non-exported symbols, final XCFramework slice mismatch,
  and real four-target artifacts.
- **Recheck:** Use real producer outputs, verify ELF/Mach-O/XCFramework identity and
  final load/link, then run the Android device/emulator and iOS device/Apple Silicon
  simulator admission paths. Every mismatch must fail closed as
  `WalletCoreBackendInitializationError`.

### IR-026 — RN runtime/registry/context/request lifecycle identity remains synthetic (HIGH / Reopened)

- **Location:** `packages/wallet-core/cpp/NativeSymbolNemWalletCore.cpp:70-98,618-628`,
  `packages/wallet-core/cpp/RnLifecycleCoordinator.h:22-41`,
  `packages/wallet-core/cpp/RnLifecycleCoordinator.cpp:42-122`,
  `scripts/rn-lifecycle-coordinator.test.cpp:14-24`.
- **Fact:** The module constructor registers `jsInvoker.get()` as `registry` and
  `this` as `context`. The actual `jsi::Runtime` is captured only on the first
  operation. These are module-local pointer stand-ins, not the RN module-registry and
  logical context identities required by the specification. `processGeneration` is
  generated from `getpid()` and a coordinator-local atomic counter, and request
  identity is only an internal incrementing ticket value. iOS registers process
  readiness but has no corresponding process teardown hook in the provider.
- **Fact:** `invalidate()` invalidates only the registration held by that module
  instance. The coordinator has a shared delivery barrier and the output-copy code
  checks liveness before `memcpy`/JSI construction, which is a valid partial correction,
  but those checks do not establish that the registration belongs to the active RN
  runtime, registry, context, process generation, and request lifecycle.
- **Fact:** The lifecycle test uses local integers as fake registry/context/runtime
  pointers and tests the coordinator in isolation. It does not exercise actual RN
  module construction, runtime reload, registry replacement, context destruction, or
  every output-bearing operation during invalidation.
- **Impact:** A stale completion can still be admitted on synthetic/module-local
  identity rather than a real RN lifecycle identity. The previous JSI copy ordering is
  improved, but the required stale completion and independent-runtime guarantees are
  not established.
- **Minimum correction:** Obtain and retain actual RN runtime/registry/context
  registration identities through the New Architecture lifecycle hooks; make process
  generation and request state represent the actual coordinator lifecycle and
  cancellation/supersession barrier; invalidate the correct scope before delivery.
  Keep stale completion cleanup-only, release C ABI buffers, zeroize temporary secret
  material, and check staleness before any JSI allocation/copy.
- **Recheck:** Add deterministic concurrent tests for every output-bearing operation,
  invalidation during C ABI execution, runtime reload, registry/provider replacement,
  independent runtimes, nested valid/invalid callbacks, exact C ABI release,
  zeroization, and absence of stale JSI success or secret output.

## 8. Optional Improvements

No additional non-gating improvement is recorded. The required corrections above are
necessary before optional optimization or responsiveness work can be evaluated.

## 9. Resolved Findings

The following parts of the previous findings were materially corrected but do not
justify closing their parent HIGH finding:

- IR-023: external repository consumer-root variables were removed from the current
  workflow, and a source-controlled Android application-level CMake entry was added.
- IR-024: the workflow now models four RN target artifacts, post-archive XCFramework
  assembly, package assembly, release evidence, and SBOM inputs.
- IR-025: validation moved beyond magic/string checks to ELF program/dynamic tables,
  Mach-O object/symbol tables, archive slice structure, and target-specific negative
  cases.
- IR-026: C ABI-owned output is released through RAII, secret-containing temporary
  buffers are wiped, and liveness is checked before final JSI conversion under a
  shared delivery barrier.

## 10. Upstream Feedback

No unresolved upstream requirement or specification ambiguity blocked this review.

## 11. Deferred Findings

### IR-027 — Dependabot evidence (LOW / Deferred)

The authenticated Dependabot API returned four LOW `webpack` alerts, all in
`dismissed` state, covering `GHSA-8fgc-7cc6-rx7x` and `GHSA-38r7-794h-5758` with
patched versions `5.104.1` and `5.104.0`. `pnpm audit --json` reported zero
vulnerabilities at info/low/moderate/high/critical levels. The finding remains LOW /
Deferred as an external dependency-evidence follow-up and does not affect the RN
implementation Gate.

## 12. Scope and Traceability

| Scope item | Result | Traceability |
| --- | --- | --- |
| Existing 16-operation RN public facade | Static PASS; native execution unvalidated | `docs/specifications/react-native.md` §§3–5; RN package tests |
| Android New Architecture consumer integration | REVISE | IR-023; specification §13; Android CMake/OnLoad/provider |
| iOS TurboModule/XCFramework integration | REVISE / native execution unvalidated | IR-024; specification §§15–16 |
| Four RN artifact producer and assembly | REVISE | IR-024; specification §§21–22 |
| ELF/Mach-O/XCFramework identity and admission | REVISE | IR-025; specification §§14,16,21 |
| RN lifecycle and stale-secret barrier | REVISE | IR-026; specification §§4,6,8–11,13 |
| Node / WASM / C ABI regression | PASS for executed paths | `docs/specifications/npm-typescript-facade.md`; parity and C ABI tests |
| Browser runtime regression | PARTIAL / not validated | deterministic checks passed; Chromium runtime unavailable |
| IR-027 dependency evidence | LOW / Deferred | Dependabot API and pnpm audit |

## 13. Domain Checks

| Domain | Result | Notes |
| --- | --- | --- |
| Specification conformance | FAIL | Four HIGH findings remain outside the required RN contract. |
| Security / secret lifecycle | FAIL | Native identity admission and actual RN lifecycle identity remain incomplete. |
| Native interoperability | REVISE / NOT VALIDATED | C ABI runtime passed; RN native build/load/invoke was not executed. |
| Public API and package regression | PASS for executed checks; PARTIAL overall | 16 operations and single-package conditional surface passed; RN/native/browser runtime gaps remain. |
| Failure and malformed-input paths | REVISE | Static negative paths pass, but identity mismatch and final load/link paths are incomplete. |
| Release evidence / SBOM | PARTIAL / REVISE | Deterministic downstream checks pass; producer reproducibility and native attestation remain incomplete. |
| Symbol/NEM binding boundary | PASS for C ABI regression; RN PARTIAL | No protocol or existing C ABI semantic regression was observed; RN native boundary is unvalidated. |

## 14. Validation Results

| Validation | Result | Notes |
| --- | --- | --- |
| `git diff --check 9ce4cddb77554e8fa6b818b9488704912eb5c5da..28112ffd1435f49d330c737c071f7ddc38bcf74d` | PASS | Target implementation diff has no whitespace errors. |
| `node --test packages/wallet-core/test/*.mjs` | PASS with one skip | 30 passed; Browser runtime parity was skipped as blocked. |
| RN/package targeted tests | PASS | 17/17 manifest, package, and RN integration tests passed. |
| `node scripts/test-react-native-lifecycle.mjs` | PASS | Coordinator-only C++ test passed; it uses synthetic identities. |
| `node scripts/build-react-native-release.mjs verify` | PASS | Source-controlled RN consumer baseline is structurally accepted. |
| `node scripts/build-react-native-release.mjs build-input ...` | PASS | Digest generation is deterministic for the supplied metadata. |
| `node scripts/test-release-evidence.mjs` | PASS | Deterministic evidence/negative tests; native fixtures are synthetic. |
| `node scripts/test-release-identity.mjs` | PASS | Deterministic release identity tests. |
| `node scripts/test-release-operation.mjs` | PASS | Deterministic operation/provenance tests. |
| `node scripts/test-release-record.mjs` | PASS | Deterministic release record and negative tests. |
| `node scripts/test-release-sbom.mjs` | PASS | Deterministic SBOM/license inventory tests. |
| `node scripts/test-release-license-policy.mjs` | PASS | Deterministic license policy and negative tests. |
| `node scripts/test-npm-provenance.mjs` | PASS | Fixture-only provenance tests. |
| `node scripts/test-c-abi-release.mjs && node scripts/test-c-abi-sbom.mjs` | PASS | Existing C ABI release/SBOM checks. |
| `node scripts/test-release-recovery.mjs` | PASS | Published recovery constituent/binding checks. |
| `node scripts/test-browser-parity.mjs` | PASS | Deterministic observability/parity checks only. |
| `node scripts/test-npm-parity.mjs` | PARTIAL / BLOCKED | Node native and WASM passed; Browser WASM runtime unavailable. |
| `node scripts/test-npm-bundlers.mjs` | BLOCKED | No Chromium-compatible browser is installed. |
| `node scripts/test-npm-release.mjs` | NOT VALIDATED | Local ignored `dist` lacks the formal four native artifacts; the gate stopped before clean-release execution. |
| `./crates/c-abi/tests/run_c_abi_runtime.sh` | PASS | Existing C ABI runtime exited successfully. |
| `pnpm audit --json` | PASS | 0 vulnerabilities at all reported severity levels. |
| Dependabot API query | INFO / DEFERRED | Four LOW `webpack` alerts were returned, all dismissed. |
| `actionlint .github/workflows/node.yml .github/workflows/release.yml` | PASS | Workflow syntax/lint passed. |
| `yamllint -d relaxed ...` | PASS with warnings | Existing line-length warnings only; no syntax error. |
| Android Gradle/CMake build and provider/device/emulator checks | NOT VALIDATED | `gradle`, `adb` unavailable and `ANDROID_HOME` unset; IR-023 has an independent static CMake defect. |
| iOS CocoaPods/Xcode/archive/XCFramework/device/simulator checks | NOT VALIDATED | `pod`, `bundle`, and `xcodebuild` unavailable; IR-024 has an independent static producer/link defect. |
| Real four-target artifacts and final native load/link | NOT VALIDATED | No native toolchain or real RN artifacts were available in this environment. |

## 15. Review Gates

| Gate | Result | Reason |
| --- | --- | --- |
| Approved specification conformance | FAIL | IR-023, IR-024, IR-025, and IR-026 remain open HIGH. |
| Security and secret lifecycle | FAIL | Artifact target admission and actual RN lifecycle identity are incomplete. |
| Symbol/NEM interoperability and binding boundary | PARTIAL / FAIL for RN | Existing C ABI passed; RN native boundary was not established. |
| Abnormal/error/fail-closed behavior | FAIL | Allowlisted identity mismatch and final load/link paths are not fully rejected. |
| Test sufficiency | FAIL | Synthetic/static tests do not replace real four-target native and lifecycle evidence. |
| Regression | PASS for validated existing paths; PARTIAL overall | Node/WASM/C ABI passed; Browser runtime and RN native execution remain unvalidated. |
| Release readiness | FAIL | The clean reproducible producer and native provenance/admission chain are incomplete. |

## 16. Remaining Risks and Open Decisions

- The Android CMake target must compile its own sources with the C ABI include path
  while preserving ordinary RN consumer integration and per-ABI linkage.
- The iOS producer must define the C ABI link before the source binding build and use
  frozen, source-controlled consumer inputs.
- The producer and runtime must bind embedded native identity to the exact loaded
  target rather than accepting any member of the global allowlist.
- The final combined iOS archive/XCFramework and Android image require actual
  platform link/load evidence, not only structural parsing.
- RN lifecycle ownership must be connected to real runtime, registry, context,
  process-generation, and request invalidation events without expanding the 16 API
  public surface.
- IR-027 remains a non-blocking external dependency follow-up.

## 17. Automatic Changes

No implementation, specification, test, fixture, workflow, or package source was
automatically changed by this review. This document is the requested review artifact.

## 18. Final Decision

**REVISE IMPLEMENTATION**

IR-023, IR-024, IR-025, and IR-026 are reopened as HIGH findings. IR-027 remains LOW /
Deferred and does not block the implementation Gate. The reviewed implementation is
not READY for merge or release.

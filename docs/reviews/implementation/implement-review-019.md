# Implementation Re-review 019 — React Native Support

## 1. Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/react-native-support`
- Reviewed HEAD: `4d30bc516805d0f4aa3d30a672c3593f98475edf`
- Review date: 2026-09-07 (JST)
- Previous review authority: `docs/reviews/implementation/implement-review-017.md`
- Continuity record also inspected: `docs/reviews/implementation/implement-review-018.md`
- Requested validation run: GitHub Actions `34029844292` — `PASS`
- Scope: React Native implementation re-review, with focused re-checks of IR-023 through IR-027 and regression evidence for the existing public surfaces.
- Change policy: this review changed only this review artifact. Rust, binding, workflow, package, fixture, and formal upstream documents were not modified.

## 2. Execution Audit

This review was performed as a formal implementation review using the repository `implement-review` skill and `AGENTS.md`.

The four required self-review paths were executed by the review chair because no review subagents were available:

- Path A — specification and design conformance
- Path B — security and secret lifecycle
- Path C — interoperability, native artifact, and packaging evidence
- Path D — implementation quality, failure paths, and regression tests

The implementation, tests, workflow, generated artifacts, release metadata, and consumer evidence were inspected directly. CI success and implementation reports were treated as evidence to verify, not as automatic resolution.

## 3. Evidence Used

- `AGENTS.md` and `.agents/skills/implement-review/SKILL.md`, including the repository review gates, security checklist, output format, and change-aware validation rules.
- `docs/specifications/react-native.md` §§4–23, especially lifecycle identity and invalidation (§§5–9), C ABI and ownership (§§11–13), Android/iOS artifact contracts (§§14–16), manifest/provenance/package rules (§§21–23), and acceptance criteria (§22).
- `docs/specifications/npm-typescript-facade.md`, `docs/requirements/requirements.md`, `docs/design/architecture.md`, `docs/design/bindings.md`, and `docs/design/security.md` for upstream traceability and binding/trust-boundary constraints.
- `docs/reviews/implementation/implement-review-017.md` as the requested prior Required Changes/Recheck authority, with the current branch's `implement-review-018.md` checked for continuity.
- Current implementation: `scripts/build-react-native-release.mjs`, `packages/wallet-core/android/CMakeLists.txt`, `integration/react-native/consumer/android/app/src/main/jni/CMakeLists.txt`, Android `OnLoad.cpp`, the RN provider and lifecycle coordinator, `react-native-manifest.mjs`, and `native-module.mjs`.
- Current tests and fixtures: `packages/wallet-core/test/*.mjs`, `scripts/rn-lifecycle-coordinator.test.cpp`, and `scripts/test-react-native-lifecycle.mjs`.
- GitHub Actions run `34029844292`, including the four producer jobs, Android x86_64 clean-emulator job, XCFramework assembly and CocoaPods consumer job, final npm candidate assembly, release evidence checks, and existing-platform jobs.
- Downloaded run artifacts: both Android `.so`/APK/evidence sets, both iOS archives/evidence sets, the XCFramework and simulator consumer app, and the final npm candidate package with manifest, `SHA256SUMS`, SBOM, release manifest, and provenance evidence.
- Direct checks: ELF `file`/`readelf`/embedded identity inspection, Mach-O/static-archive inspection, XCFramework `Info.plist` and slice inspection, deliberate `BinaryPath`/`LibraryPath` mismatch rejection, package manifest/hash/SHA verification, tarball extraction and clean package validation, and SBOM/release-manifest cross-checks.

No secret, mnemonic, password, private key, signature payload, or other sensitive value was included in the evidence or this report.

## 4. Review Result

**REVISE IMPLEMENTATION**

Two HIGH findings remain open: IR-024 (iOS producer reproducibility and release evidence) and IR-026 (actual React Native runtime lifecycle identity and stale-completion contract). IR-023 and IR-025 are resolved by direct implementation and artifact evidence. IR-027 remains an independent deferred LOW item and does not block the implementation or security gate.

## 5. Summary

| Finding | Severity | Final status | Gate impact |
|---|---:|---|---|
| IR-023 | HIGH | Resolved | None |
| IR-024 | HIGH | Reopened | Required Change |
| IR-025 | HIGH | Resolved | None |
| IR-026 | HIGH | Reopened | Required Change |
| IR-027 | LOW | Deferred | Independent / non-blocking |

Open finding counts:

- Critical: **0**
- High: **2** — IR-024, IR-026
- Medium: **0**
- Low: **0** open; IR-027 is deferred and non-blocking

### Android native runtime validation

Both Android producers completed from the source-controlled New Architecture consumer and produced the expected arm64-v8a and x86_64 artifacts. The x86_64 target was installed and launched in a clean emulator. The evidence contains the required runtime observations:

```text
SNWC_RN_NATIVE_PROVIDER_READY:android-x86_64:android|x86_64|dist/react-native/android/jni/x86_64/libsymbol_nem_wallet_core_rn.so
SNWC_RN_NATIVE_SMOKE_PASS:16
```

The consumer app loaded the provider through the appmodules/native registration path, and the 16-operation native smoke completed. The arm64-v8a producer and linkage were validated, but this run did not separately install and invoke the arm64-v8a artifact on a device.

### iOS native runtime / packaging validation

The ios-arm64 and ios-simulator-arm64 producers completed; the two archives were assembled into the expected two-slice XCFramework. The generated XCFramework was installed through the source-controlled CocoaPods consumer and the linked consumer launched on an Apple Silicon simulator. The workflow's simulator log predicate found `SNWC_RN_NATIVE_SMOKE_PASS:16`. No physical iOS device runtime was executed in this review run.

### Security / secret lifecycle validation

The C ABI output wrappers, move-only secret buffer, exact-once owned-byte/profile/key release, zeroization path, and delivery barrier were directly inspected and covered by local tests. Evidence was checked for secret leakage and contained no secret material. IR-026 remains HIGH because the lifecycle identities used by the coordinator are not yet demonstrated to be the actual RN runtime, module-registry, and provider-replacement identities required by the specification; this limits the assurance of stale-completion cleanup across real RN lifecycle transitions.

### Release artifact / provenance validation

The final candidate package contains one npm package with the four canonical RN artifacts. Per-target evidence, final artifact manifest, release manifest, `SHA256SUMS`, SBOM, and tarball contents agree on source commit, target, path, identity, architecture, and digest. The final package validator and a deliberate XCFramework `BinaryPath`/`LibraryPath` mismatch test passed. IR-024 remains HIGH because a successful single candidate build is not reproducibility evidence when the iOS Ruby/CocoaPods dependency graph is ranged and unlocked and no second identical producer run is recorded.

### Existing platform regression

The existing Rust, Native C ABI, Node, Browser, WASM, and package surfaces showed no regression in the executed validation. The 16 existing native operations were exercised by the RN smoke application, and the final package remained a single npm package with RN assets included rather than a separate RN package.

## 6. Finding Status

### IR-023 — Android New Architecture consumer integration and runtime provider load

- Previous status: Reopened / HIGH.
- Final status: **Resolved**.
- Resolution basis: the source-controlled consumer CMake target now exposes the package's required private include paths; the package provider and C ABI are linked through the application-level `appmodules` target; both Android target producers complete from a clean consumer copy; and the x86_64 clean-emulator run proves provider registration/load and `SNWC_RN_NATIVE_SMOKE_PASS:16`.
- No new finding is added for the absence of a separate arm64 runtime invocation; it is explicitly recorded as a remaining validation limitation rather than treated as an x86 result.

### IR-024 — Android/iOS producer reproducibility and release evidence

- Previous status: Reopened / HIGH.
- Final status: **Reopened / HIGH**.
- The implementation corrected the source-controlled consumer overlay, fixed C ABI archive placement before iOS Pod installation, produces all four required target entries, assembles the XCFramework after both iOS archives, and emits internally consistent manifest/provenance/SBOM/package evidence.
- Closure is not supported because `integration/react-native/consumer/Gemfile` contains version ranges and no source-controlled `Gemfile.lock`; `scripts/build-react-native-release.mjs` verifies the Gemfile but does not require a lockfile and runs `bundle install` without frozen/deployment lock enforcement. The workflow therefore does not establish a reproducible CocoaPods/Ruby dependency graph from clean checkout.
- The requested run has one producer execution per target and does not contain the required second independent producer run with byte/metadata comparison. It demonstrates a successful candidate build, not repeatability of the producer/release chain.

### IR-025 — Native identity, architecture, slice, symbol, metadata, and provenance validation

- Previous status: Reopened / HIGH.
- Final status: **Resolved**.
- Direct inspection confirmed real ELF64 ET_DYN artifacts for AArch64 and x86_64 with target-specific embedded identity, SONAME, dynamic symbols, and loadable structure; real arm64 Mach-O static archives with the required provider and identity exports; exact two-slice XCFramework metadata and slice paths; and consistent final package, SHA, SBOM, release-manifest, and per-target evidence digests.
- `validateReactNativeXcframework` now requires `LibraryPath` to match the actual slice library and, when present, requires `BinaryPath === LibraryPath`. A deliberately mutated `BinaryPath` was rejected. No identity, path, architecture, or provenance issue from IR-025 remains open.

### IR-026 — React Native runtime lifecycle identity, invalidation barrier, and stale completion cleanup

- Previous status: Reopened / HIGH.
- Final status: **Reopened / HIGH**.
- The current coordinator has materially improved local safety: process execution serialization, registration invalidation barriers, request identity checks, move-only secret cleanup, exact-once C ABI releases, and cleanup-oriented stale handling are present and deterministic coordinator tests pass.
- Closure is not supported because the module constructor stores the `CallInvoker` as `registryLifetime`, uses an empty module-local context token, and observes only a runtime pointer captured at first admission. The Android/iOS provider hooks shown in the current implementation provide process teardown and module construction, but do not demonstrate registration against the actual RN runtime/module-registry lifecycle or provider replacement/reload identities required by `react-native.md` §§5–9 and `docs/design/architecture.md`.
- The lifecycle test uses synthetic shared pointers and stack `int` runtime stand-ins. It does not construct a real RN runtime/module registry, reload a registry/provider, run an output-bearing operation during actual invalidation, or prove that stale completion cannot reach JS under those transitions.

### IR-027 — Dependabot detail / dependency follow-up

- Previous status: Deferred / LOW.
- Final status: **Deferred / LOW; independent and non-blocking**.
- The available Dependabot data contains four LOW webpack alerts, all dismissed with `fix_started`, and no active alert was observed. This lane is not used to block IR-023–IR-026 or the security/release gate. No new dependency finding is opened.

## 7. Required Changes

### IR-024 — Reproducible iOS producer and release evidence

**Location:** `integration/react-native/consumer/Gemfile:1-18`; absence of `integration/react-native/consumer/Gemfile.lock`; `scripts/build-react-native-release.mjs:73-91,162-165,269-280`; iOS matrix in `.github/workflows/node.yml:304-375`.

**Facts and condition:** npm inputs are source-controlled and installed with `npm ci`, and the final four-target evidence chain is internally consistent. However, the CocoaPods/Ruby dependency declarations are ranged, the lockfile is absent, template verification does not require one, and `bundle install` is not frozen. The workflow produces each target once and does not compare two clean producer runs.

**Authority:** `docs/specifications/react-native.md` §§16.2, 21.2, 22, and 23; the IR-017 Recheck requirement for reproducible Android/iOS producer and assembly evidence.

**Impact and severity:** a clean checkout can resolve a different CocoaPods/Ruby tool graph and produce a different linked iOS artifact or consumer result while retaining the same source commit. This breaks the required controlled-build/provenance/reproducibility assurance for the two iOS slices and the release package. This is HIGH because it affects release trust and native consumer compatibility, not only build convenience.

**Minimum fix and recheck:** source-control an exact Ruby/CocoaPods dependency lock (or an equivalent repository-controlled exact toolchain input), require it during template verification, and use frozen/deployment installation. Run two independent clean producer builds from identical inputs, compare target bytes and identity metadata, then assemble and validate the two-slice XCFramework, install it through CocoaPods, launch the simulator consumer, and retain cross-checked manifest/provenance/SBOM/package evidence.

**Completion condition:** no uncontrolled iOS dependency resolution remains, and repeat runs demonstrate identical producer/assembly evidence under the specification's production-equivalent protocol.

### IR-026 — Actual RN lifecycle identity and stale-completion proof

**Location:** `packages/wallet-core/cpp/RnLifecycleCoordinator.h:21-40`; `packages/wallet-core/cpp/RnLifecycleCoordinator.cpp:35-145`; `packages/wallet-core/cpp/NativeSymbolNemWalletCore.cpp:619-624`; `packages/wallet-core/ios/NativeSymbolNemWalletCoreProvider.mm:32-37`; `scripts/rn-lifecycle-coordinator.test.cpp:14-24`.

**Facts and condition:** the coordinator's barrier and RAII cleanup are present, but `CallInvoker` is used as a surrogate registry lifetime token, the module context is module-local, runtime identity is only a captured pointer, and platform hooks do not show actual runtime/registry/provider-replacement registration. The current regression test uses synthetic stand-ins and does not exercise real RN reload/replacement or stale output-bearing completion.

**Authority:** `docs/specifications/react-native.md` §§5–9, 11.3, 13, 15, and 22–23; `docs/design/architecture.md` process-wide RN coordination and invalidation design; IR-017 and IR-018 Required Changes/Recheck.

**Impact and severity:** a completion from a retired RN runtime, module registry, or provider registration could be judged live by a surrogate/local identity, weakening the invalidation barrier and potentially allowing stale JS-visible output or retained sensitive material across lifecycle replacement. The existing cleanup code reduces risk but does not prove the required trust boundary. This is HIGH because it concerns lifecycle isolation and secret/output delivery.

**Minimum fix and recheck:** bind registration and invalidation to actual New Architecture runtime, module-registry, logical-context, and provider-replacement lifecycle identities; preserve the process-wide admission and delivery barrier; exercise module construction, reload, registry replacement, provider replacement, independent runtimes, teardown during C ABI execution, and every output-bearing operation. Verify stale completions perform cleanup only, never deliver JS success or sensitive output, and release/zeroize C ABI-owned data exactly once.

**Completion condition:** deterministic production-equivalent RN tests demonstrate the specification's generation/runtime/registry/context/request delivery predicate and stale cleanup behavior across actual lifecycle transitions.

## 8. Optional Improvements

None recorded. The review does not expand scope with unrequired API, compatibility, or release features.

## 9. Resolved Findings

### IR-023

The package CMake target now supplies the private C++ include paths needed by the provider, and the source-controlled Android consumer links the provider/C ABI through the New Architecture appmodules target. Both Android producers completed, and the clean x86_64 emulator supplied the provider-ready and 16-operation smoke markers.

### IR-025

Real target binaries and the assembled XCFramework were inspected rather than relying only on synthetic fixtures. Manifest paths, target identity, architecture, exported provider/module symbols, embedded identity, SHA256 digests, release manifest, SBOM, and tarball contents were cross-checked. The added `BinaryPath`/`LibraryPath` equality check rejected a deliberate mismatch.

## 10. Upstream Feedback

No contradiction with the approved Concept, Requirements, Design, or Specification was found. Those upstream documents are not reopened. The two remaining findings are implementation/release-evidence issues within the approved React Native scope.

## 11. Deferred Findings

IR-027 remains deferred and independent as described above. No additional formal finding is created for the separately unexecuted arm64 Android runtime, physical iOS device runtime, or performance measurement; those limits are explicitly listed in the validation and remaining-risk sections and must not be represented as completed evidence.

## 12. Scope and Traceability

- Requirements traceability: RN support, New Architecture, native provider/C ABI, package routing, security cleanup, and existing-surface parity were checked against `docs/requirements/requirements.md` AC/NFR/SEC entries, especially AC-054 through AC-061.
- Specification traceability: runtime admission/delivery, lifecycle identity, ownership, native artifact identity, exact Android/iOS targets, manifest/provenance/package, fail-closed behavior, and evidence protocol were checked against `docs/specifications/react-native.md` §§4–23.
- Design traceability: binding responsibility, trust boundary, process-wide RN coordination, secret ownership, and artifact trust chain were checked against `docs/design/architecture.md`, `docs/design/bindings.md`, and `docs/design/security.md`.
- Implementation traceability: source-controlled consumer setup, Android CMake/provider registration, iOS producer and XCFramework assembly, manifest validation, lifecycle coordinator, tests, workflow, and generated release evidence were inspected directly.
- Existing platform traceability: Rust Core, Native C ABI, Node, Browser, WASM, and one-package npm behavior were included in local and CI validation.

## 13. Domain Checks

### Specification conformance

IR-023 and IR-025 satisfy the reviewed implementation and artifact checks. IR-024 and IR-026 remain incomplete against the reproducibility and actual-lifecycle portions of the specification. No Symbol/NEM protocol behavior, public C ABI, or existing public API was changed by the reviewed implementation.

### Security and secret lifecycle

Secret-bearing temporary buffers are move-only and wiped on destruction/assignment; C ABI-owned output is released through RAII wrappers; delivery checks occur before JSI object construction; stale paths do not intentionally construct success DTOs; and evidence/logs contain no secret material. The unresolved IR-026 identity gap prevents a full claim that those guarantees hold through actual RN runtime replacement/reload.

### Interoperability and native artifacts

The required Android ELF and iOS Mach-O/static-archive identities, provider symbols, target identities, architecture/slice metadata, package paths, and hashes were checked on real generated artifacts. The XCFramework contains exactly `ios-arm64` and `ios-arm64-simulator`, with no x86_64 slice. Existing C ABI and platform parity tests passed.

### Failure-closed behavior

Manifest, missing/incorrect identity, wrong architecture/slice, required symbol, package hash, and XCFramework path/metadata checks were exercised. The deliberate `BinaryPath`/`LibraryPath` mismatch was rejected. Runtime/provider initialization paths map native load/link/artifact failures to the existing initialization failure boundary without fallback.

### Lifecycle and test quality

Local coordinator tests deterministically cover admission, reentry, invalidation, teardown waiting, closed/reload, and expired context for the coordinator model. They are not sufficient to close IR-026 because the model is synthetic and does not cover actual RN runtime/registry/provider lifecycle transitions or output-bearing stale completion.

## 14. Validation Results

### Executed and passed

- `node scripts/build-react-native-release.mjs verify`
- `node scripts/test-react-native-lifecycle.mjs`
- `node --test packages/wallet-core/test/*.mjs` — 31 tests passed
- `./crates/c-abi/tests/run_c_abi_runtime.sh`
- C ABI header compile with `-std=c11 -Wall -Wextra -Werror`
- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- `cargo test --workspace --all-features` — Rust core 46 unit tests and all reported workspace/integration suites passed
- Release evidence, identity, operation, record, SBOM, npm provenance fixture, and browser parity test scripts — all passed
- Direct final package manifest/hash/tarball/SHA/SBOM/release-manifest validation — passed
- Deliberate XCFramework `BinaryPath`/`LibraryPath` mismatch rejection — passed

### GitHub Actions `34029844292`

The run was completed with conclusion `success` at the reviewed HEAD. The following evidence was directly inspected:

- Android arm64-v8a and x86_64 producer jobs — passed; clean source-controlled New Architecture consumer builds and links completed.
- Android x86_64 clean emulator — passed; provider-ready and `SNWC_RN_NATIVE_SMOKE_PASS:16` markers were required and observed.
- iOS arm64 and iOS simulator arm64 producer jobs — passed.
- XCFramework assembly/inspection, CocoaPods consumer install, and simulator install/launch — passed.
- Final candidate npm assembly, four-target evidence validation, manifest/SBOM/license policy, final clean install, and revalidation — passed.
- Existing Core/C ABI, Node clean tarball consumer matrix, Native, WASM, Browser bundler/MV3, and other platform jobs — passed.

### Not validated or not fully closed

- No source-controlled `Gemfile.lock` or equivalent frozen Ruby/CocoaPods dependency graph was present; no second independent iOS producer run with byte/metadata comparison was recorded. This is IR-024.
- The reviewed CI run did not separately install and invoke the arm64-v8a Android artifact on a device.
- No physical iOS device runtime was executed; the iOS runtime evidence is the Apple Silicon simulator consumer.
- No production-equivalent test exercised actual RN runtime reload, module-registry replacement, provider replacement, or stale completion during every output-bearing operation. This is IR-026.
- No separate performance/responsiveness measurement for AC-061 was recorded in this re-review.

The arm64/physical-device/performance items are reported as unvalidated scope and are not silently counted as passed. They do not create additional findings in this re-review; the two required implementation findings remain IR-024 and IR-026.

## 15. Review Gates

| Gate | Result | Basis |
|---|---|---|
| Specification conformance | **FAIL / REVISE** | IR-024 and IR-026 remain incomplete against required reproducibility and lifecycle evidence |
| Security / secret lifecycle | **FAIL / REVISE** | local cleanup and ownership checks pass, but actual RN lifecycle identity remains unproven under IR-026 |
| Interoperability / native artifact | **PASS for checked scope** | real ELF/Mach-O/XCFramework identity, architecture, symbols, metadata, and paths validated |
| Failure-path / fail-closed | **PASS for checked scope** | invalid manifest, identity, path, package, and XCFramework cases rejected; no fallback observed |
| Test sufficiency | **FAIL / REVISE** | actual RN lifecycle transition coverage and iOS reproducibility repeat evidence are missing |
| Existing platform regression | **PASS for checked scope** | Rust, C ABI, Node, Browser, WASM, package, and CI parity evidence passed |
| Release artifact / provenance | **FAIL / REVISE** | candidate artifact chain is internally consistent but iOS tool resolution and repeatability are not controlled/proven |

Overall Review Gate: **REVISE IMPLEMENTATION**.

## 16. Remaining Risks and Open Decisions

- IR-024: the project must decide and record the repository-controlled exact Ruby/CocoaPods toolchain input and produce repeat-build evidence before release reproducibility can be claimed.
- IR-026: the implementation must establish the actual RN runtime, module registry, logical context, and provider replacement identity hooks and prove stale completion behavior across those transitions.
- Android arm64 runtime, physical iOS runtime, and AC-061 performance evidence remain outside the executed evidence set. No success claim is made for them.
- The final GitHub Actions artifact is a `candidate` package. Its internal consistency does not by itself establish a publishable reproducibility claim while IR-024 is open.

## 17. Automatic Changes

None. Only this formal review artifact was created; no implementation, test, workflow, manifest, or formal upstream document was changed.

## 18. Final Decision

**REVISE IMPLEMENTATION**

IR-023 and IR-025 are resolved. IR-027 remains deferred and independent. IR-024 and IR-026 are Required Changes and keep the Implementation Review Gate open. The implementation may be re-reviewed after the locked/repeatable iOS producer evidence and actual RN lifecycle identity/stale-completion evidence are supplied.

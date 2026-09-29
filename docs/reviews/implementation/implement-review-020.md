# Implementation Closure Review 020 — React Native Support

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/react-native-support`
- Review date: 2026-09-07 (JST)
- Review artifact: `docs/reviews/implementation/implement-review-020.md`
- Previous formal review: `docs/reviews/implementation/implement-review-019.md`
- Previous reviewed implementation HEAD: `4d30bc516805d0f4aa3d30a672c3593f98475edf`
- Implementation-fix starting HEAD: `7c7035b3cc3ee607df80519dc04fd74469710f2c`
- Reviewed current HEAD: `c76a5c5c0372271be0547d347ea92dbf4cc0f361`
- Reviewed commit range: `7c7035b3cc3ee607df80519dc04fd74469710f2c..c76a5c5c0372271be0547d347ea92dbf4cc0f361`
- Range coverage: all 23 commits and 36 changed files in the requested fix range, including follow-up iOS archive/Pod/package-inventory changes.
- Requested primary fix commits: `88f2ddf7a97322b9edfffc122204ca8644e06018` (IR-024), `286b80a7b62d1cc4c0ed5e8051f3cb5fda1b9672` (IR-026).
- GitHub Actions validation: [Release candidate validation, run 34107655205](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/34107655205), conclusion `success`.

The authority for this closure review is the repository `implement-review` skill, `AGENTS.md`, the approved Concept / Requirements / Design / Specification, and `implement-review-019.md`. This review does not modify implementation, Concept, Requirements, Design, Specification, or the previous review.

Unconfirmed in this environment and not represented as successful evidence: a physical Android arm64 runtime, a physical iOS device runtime, and an actual RN reload test that proves post-reload re-admission plus stale output-bearing completion cleanup. Those gaps are evaluated below under IR-026 rather than silently treated as passed.

## Execution Audit

Four independent Luna xhigh reviewer paths were used. Each reviewer was instructed to inspect the complete requested range without relying on another reviewer's conclusion and not to modify repository files.

| Reviewer | Agent ID | Independent lane | Completion |
|---|---|---|---|
| A / Ohm | `01a07bb3-ddce-7892-82b2-6d3380b0ee9e` | IR-024: iOS producer reproducibility, CocoaPods/Ruby inputs, build evidence, provenance | completed |
| B / Mencius | `01a07bb3-def6-74e0-a148-ee1262f4f273` | IR-026: Android RN 0.87.x New Architecture lifecycle and security | completed |
| C / Raman | `01a07bb3-e07a-7f82-afb0-0fe36ba078bb` | IR-026: iOS runtime replacement, stale completion, cleanup | completed |
| D / Feynman | `01a07bb3-e1c3-7b23-8ad0-3ee6a6b172a1` | Cross-cutting regression, public API, C ABI, release evidence, adversarial review | completed |

The chair independently inspected the full range, the implementation and tests, the formal documents, the workflow and relevant GitHub job evidence, then reconciled the reviewers' disagreement on IR-024 against the explicit completion conditions supplied by the user and the specification's provenance contract.

## Evidence Used

- `AGENTS.md` and `.agents/skills/implement-review/**` for review scope, status transitions, severity, gates, security checklist application, artifact naming, and change-aware validation.
- `docs/reviews/implementation/implement-review-019.md` for the previous IR-024 / IR-026 Required Changes and Completion Conditions.
- Approved `docs/consept/`, `docs/requirements/`, `docs/design/`, and `docs/specifications/` documents. The principal normative source was `docs/specifications/react-native.md` §§5–9, 11–16, 21–23 and its acceptance / provenance matrix.
- `integration/react-native/consumer/Gemfile`, `Gemfile.lock`, `ios/Podfile`, `package-lock.json`, source-controlled Android/iOS consumers, and package manifests.
- `scripts/build-react-native-release.mjs:66-117,180-226,318-467` for template validation, dependency installation, producer invocation, archive assembly, and XCFramework consumer installation.
- `scripts/react-native-evidence.mjs:398-475` for independent iOS artifact comparison and evidence fields.
- `packages/wallet-core/src/react-native-manifest.mjs:550-597` for exact XCFramework slice and package-artifact validation.
- `packages/wallet-core/cpp/RnLifecycleCoordinator.cpp:23-200`, `NativeSymbolNemWalletCore.cpp`, Android Cxx package/lifecycle sources, and iOS provider/delegate sources for admission, identity, invalidation, cleanup, and JSI delivery.
- `.github/workflows/node.yml:560-606,633-727,839-915,930-1139` and the fetched logs / job metadata for actual producer, consumer, simulator/emulator, parity, and final release-evidence execution.
- Relevant successful jobs in run `34107655205`: source `101696284023`; Core/C ABI `101696340607`; parity `101696340622`; iOS simulator producer `101696340675`; iOS device producer `101696340762`; Android arm64 producer `101696340718`; Android x86_64 producer `101696340759`; XCFramework consumer `101698591023`; final package `101700611903`.
- CI producer comparison evidence:
  - `ios-arm64`: producer 1 and 2 both SHA-256 `3aede8b1fffaf55f545a2b07d11a9ea77c3dceb12dbfa16a4977e5c010348ff7`, size `19,866,768`.
  - `ios-simulator-arm64`: producer 1 and 2 both SHA-256 `dea33e0c7d129b2d46039081062f9c054e1934294f980d28c41a4ae7a286c1c7`, size `19,860,376`.
  - Both comparisons reported identical native identity, architecture, metadata, and required symbols.
- Local non-destructive validation at the reviewed HEAD: `node scripts/test-react-native-lifecycle.mjs`; `node --test packages/wallet-core/test/*.mjs`; `./crates/c-abi/tests/run_c_abi_runtime.sh`; `cargo fmt --all -- --check`; and `git diff --check` for the requested range. The Node tests were rerun outside the sandbox after the sandbox blocked child-process creation with `EPERM`.

No secret, mnemonic, password, private key, signature payload, decrypted Store, credential, or sensitive fixture value is included in this review artifact.

## Review Result

**REVISE IMPLEMENTATION**

IR-024 and IR-026 remain HIGH and not closed. The green CI conclusion is valid as execution evidence, but it does not satisfy the missing CocoaPods graph contract or the actual RN lifecycle identity/stale-completion closure conditions.

## Summary

| Finding | Severity | Current status | Gate impact |
|---|---:|---|---|
| IR-023 | HIGH | Resolved; no regression found | none |
| IR-024 | HIGH | Open; previous status was Reopened and closure is not established | Required Change |
| IR-025 | HIGH | Resolved; no regression found | none |
| IR-026 | HIGH | Open; previous status was Reopened and closure is not established | Required Change |
| IR-027 | LOW | Deferred / non-blocking | none |
| New findings | — | None | none |

Open counts are Critical `0`, High `2` (`IR-024`, `IR-026`), Medium `0`, Low `0`. Current transition-to-Reopened count is `0`: IR-024 and IR-026 were already Reopened in the previous review and have not reached Resolved; under the repository status rule they remain Open until a later review closes them. Historical Reopened findings from the previous review: `2`.

## Finding Status

### IR-024 — iOS producer reproducibility

- Previous status: HIGH / Reopened.
- Current status: **HIGH / Open — closure not established**.
- Root-cause correction assessment: **partial only**.

The following parts are corrected and directly evidenced:

- `Gemfile` and source-controlled `Gemfile.lock` fix Ruby `3.3.8`, Bundler `2.5.22`, CocoaPods `1.16.2`, `xcodeproj 1.27.0`, `activesupport 7.2.2.2`, and the transitive Ruby gem graph.
- `verifyTemplate()` requires the Gemfile, Gemfile.lock, RN/npm inputs, and selected exact lockfile identities (`scripts/build-react-native-release.mjs:66-117`).
- Ruby installation uses `BUNDLE_DEPLOYMENT=true`, `BUNDLE_FROZEN=true`, `bundle install --deployment --frozen`, and `bundle check` (`scripts/build-react-native-release.mjs:188-205`). CocoaPods is launched through the selected Bundler/Ruby executable (`:208-226`).
- The two iOS producer invocations use separate clean temporary consumer workspaces and separate output paths (`.github/workflows/node.yml:580-606`). The comparison reads both produced files and fails on differing bytes/digest/size, native identity, architecture, binary format, metadata, or required symbols (`scripts/react-native-evidence.mjs:398-475`).
- The follow-up static-archive fixes did not weaken the comparison. They disable relevant debug metadata inputs, require and remove only the exact producer dummy member, and use `libtool -static -D` before strict comparison (`scripts/build-react-native-release.mjs:341-406`).
- The exact two-slice XCFramework contract is enforced: only `Info.plist`, `ios-arm64`, and `ios-arm64-simulator` are accepted; each slice must contain exactly one `libsymbol_nem_wallet_core_rn.a` and exact platform, architecture, and variant metadata (`packages/wallet-core/src/react-native-manifest.mjs:550-585`).
- The source-controlled CocoaPods consumer installs and builds the generated XCFramework, and the Apple Silicon simulator process launches. CI observes `SNWC_RN_NATIVE_SMOKE_PASS:16` and the lifecycle reload request marker (`.github/workflows/node.yml:681-720`).
- Before npm assembly, both producer comparisons are rerun and their JSON is compared with the recorded evidence (`.github/workflows/node.yml:839-854`). The final package/release workflow generates and revalidates the release manifest and `SHA256SUMS`, then generates and revalidates SPDX SBOM, license inventory, and their digest set (`.github/workflows/node.yml:930-1139`).

The blocking residual is the CocoaPods resolved graph:

- `integration/react-native/consumer/Podfile.lock` is not source-controlled, and no equivalent exact CocoaPods graph manifest is present.
- `verifyTemplate()` requires `Gemfile.lock` but not `Podfile.lock` or an equivalent CocoaPods graph/provenance input (`scripts/build-react-native-release.mjs:98-117`).
- Producer and consumer steps execute bare `pod install` (`scripts/build-react-native-release.mjs:338`, `:443`). `BUNDLE_FROZEN` freezes Ruby/Bundler resolution; it does not freeze CocoaPods' `Podfile.lock` graph.
- The successful `88 dependencies / 87 total pods installed` output establishes that installation occurred, not that the complete resolved pod graph, pod sources, and pod versions were repository-controlled and fail-closed.
- The build-input hash includes the source-controlled Gemfile.lock, but not a source-controlled resolved CocoaPods graph. A hash of an approved Ruby lock cannot substitute for an exact CocoaPods graph check.

Therefore the user-required condition “CocoaPods dependency graph inconsistency or omission fails closed” and the previous review condition “no uncontrolled iOS dependency resolution remains” are not met. This is a release-trust / native-consumer HIGH finding, not a claim that the successful producer pair was merely a duplicate inspection. The producer pair itself is independent and byte-identical; it cannot prove that an unpinned future CocoaPods resolution is approved.

### IR-026 — actual React Native lifecycle identity and stale completion

- Previous status: HIGH / Reopened.
- Current status: **HIGH / Open — closure not established**.
- Root-cause correction assessment: **partial, with a concrete Android identity defect remaining**.

#### Actual identity mapping

| Identity | Current implementation | Assessment |
|---|---|---|
| Process generation | `getpid()` plus an owned process-generation object in `RnLifecycleCoordinator.cpp:23-34` | Bound to the OS process; not an arbitrary counter. Pass. |
| Actual RN runtime | iOS obtains `&runtime` from `SnwcRnLifecycleDelegate.mm:28-33` and stores it in the binding used by `NativeSymbolNemWalletCoreProvider.mm:75-97`. Android passes the per-invocation JSI runtime to `begin()`, but leaves `RegistrationIdentity.runtime` null in `SymbolNemWalletCoreCxxReactPackage.cpp:31-39`. | iOS code path is connected to an actual RN runtime callback; Android registration is a wildcard. Fail. |
| Module-registry / registration identity | iOS uses `host.moduleRegistry`; Android uses the actual CxxReactPackage object as `moduleRegistry` and the actual ReactContext object as logical context (`SymbolNemWalletCoreCxxReactPackage.cpp:31-39`). | Concrete objects are used, but Android lifecycle replacement is not bound to runtime identity or post-reload re-admission. Partial. |
| Logical context | iOS uses the actual `RCTHost*`; Android uses the actual `ReactApplicationContext` object. | Not an empty/module-local token. Invalidation connection is incomplete on Android when `currentReactContext` is null (`SymbolNemWalletCoreRnLifecycle.kt:44-52`). Partial. |
| Provider replacement / generation | Coordinator assigns `providerGeneration` on registration (`RnLifecycleCoordinator.cpp:48-70`); iOS provider invalidation is connected to `-invalidate`; Android before-destroy calls `nativeInvalidate`. | Counter and hooks exist, but actual Android replacement/re-admission and iOS adversarial replacement are not evidenced. Partial. |
| Request identity | `begin()` and `isLive()` carry/check process generation, runtime pointer, registry, context, provider, provider generation, and request identity (`RnLifecycleCoordinator.cpp:73-127`). | Structurally present, but Android's nullable registration runtime makes the runtime predicate non-binding. Fail. |

The decisive defect is explicit in the implementation:

- Android constructs identity without `identity.runtime` (`packages/wallet-core/android/SymbolNemWalletCoreCxxReactPackage.cpp:31-39`).
- `begin()` accepts any runtime when registration runtime is null (`packages/wallet-core/cpp/RnLifecycleCoordinator.cpp:89-94`).
- `isLive()` repeats the same wildcard (`packages/wallet-core/cpp/RnLifecycleCoordinator.cpp:111-126`).
- The deterministic test accepts a different runtime on that Android-style registration (`scripts/rn-lifecycle-coordinator.test.cpp:82-87`), so the synthetic test does not demonstrate the required rejection.

This violates `docs/specifications/react-native.md:370-405`: active admission and delivery require actual runtime and registry identity, reload/replacement creates a new registration identity, and stale completion must not inherit the old identity. The Android lifecycle listener's `onReactContextInitialized()` only stores a weak context (`packages/wallet-core/android/src/main/java/com/nemnesia/symbolnemwalletcore/SymbolNemWalletCoreRnLifecycle.kt:16-25`); it does not bind a runtime or perform native re-admission. Its `currentReactContext ?: return` path can also skip provider invalidation during teardown (`:44-52`). That is retained as IR-026 evidence, not a duplicate IR-028 finding.

#### Actual RN evidence and adversarial lifecycle coverage

- Android source-controlled consumer is RN `0.87.0`, uses actual `ReactHost`, `cxxReactPackageProviders`, `ReactApplicationContext`, and actual `CxxReactPackage` construction. The clean x86_64 emulator loaded the provider and passed `SNWC_RN_NATIVE_SMOKE_PASS:16`; the arm64 target built successfully. The app calls `reactHost.reload()` after logging `SNWC_RN_NATIVE_LIFECYCLE_RELOAD_REQUESTED` (`MainActivity.kt:28-34`).
- This run does not verify reload completion, old provider invalidation, new runtime/registry construction, provider re-admission, post-reload 16-API smoke, independent runtimes, or an in-flight C ABI operation crossing invalidation. The marker is emitted immediately before the call and is not a post-reload lifecycle acknowledgement (`.github/workflows/node.yml:564-578`).
- iOS source-controlled consumer uses actual `RCTReactNativeFactory` / `RCTHost` lifecycle delegate, CocoaPods, XCFramework, Apple Silicon simulator launch, and the 16-API smoke. `host:didInitializeRuntime:` receives the actual `jsi::Runtime&`; `hostDidStart:` invalidates the prior host registration (`SnwcRnLifecycleDelegate.mm:13-33`). The app calls the host reload helper after emitting `SNWC_RN_NATIVE_LIFECYCLE_RELOAD_REQUESTED` (`AppDelegate.swift:33-37`).
- The iOS workflow gate observes the initial 16-API smoke and the pre-call reload marker (`.github/workflows/node.yml:689-720`). It does not assert post-reload new-generation admission or stale completion rejection. The iOS binding lookup is keyed by `std::thread::id` (`NativeSymbolNemWalletCoreProvider.mm:47-98`), so the production-equivalent independent-runtime and thread/replacement association remains unproven.
- Synthetic C++ tests use stack integers / synthetic shared pointers and synthetic sensitive output. They are useful coordinator-unit evidence but are explicitly insufficient for this closure. No source-controlled actual RN consumer test exercises initial construction, runtime replacement, registry replacement, provider replacement, teardown during an output-bearing C ABI operation, retired completion, and new-generation admission as one adversarial sequence.

#### Stale completion, cleanup, and output-bearing operations

Static implementation inspection supports the following local properties:

- `AdmissionTicket::deliver()` rechecks liveness before constructing JSI objects (`NativeSymbolNemWalletCore.cpp:71-99`).
- C ABI-owned bytes, warnings, profiles, and software keys have ownership guards and release paths (`NativeSymbolNemWalletCore.cpp:125-271`).
- Secret temporary buffers are move-only and zeroized on destruction / move assignment (`NativeSymbolNemWalletCore.cpp:101-123`).
- Output-bearing branches, including `Uint8Array`, mnemonic, private key, signature, profile, and replacement Store, are delivered inside the ticket path (`NativeSymbolNemWalletCore.cpp:633-887`).
- The delivery barrier and process teardown wait are present in the coordinator (`RnLifecycleCoordinator.cpp:137-200`).

These properties are not enough to close IR-026 because Android's active registration accepts a different runtime and the actual RN invalidation/re-admission sequence is not exercised. The review therefore cannot claim actual-RN proof that a stale completion can never deliver JS success, a JS error containing sensitive data, `Uint8Array`, private key, mnemonic, profile, replacement Store, or C ABI-owned bytes. It also cannot claim actual-RN exactly-once release/zeroization and cleanup-before-JSI ordering during runtime replacement. The static RAII and synthetic tests are positive evidence, not closure evidence for the required production lifecycle boundary.

## Required Changes

### IR-024 — exact CocoaPods producer input and frozen graph

- Source-control an exact `Podfile.lock` or an equivalent repository-controlled exact CocoaPods dependency graph, including resolved pod versions/sources and the relevant RN/native pod identity.
- Make template validation reject a missing, changed, incomplete, or inconsistent CocoaPods graph, in addition to the existing Gemfile/Gemfile.lock/Ruby/Bundler checks.
- Make both source-producer and XCFramework-consumer installation fail closed if the resolved CocoaPods graph differs from the approved input or would update the lock; retain the existing frozen Ruby/Bundler installation.
- Re-run two genuinely clean iOS producer invocations with separated state/output, compare bytes/SHA-256/native identity/architecture/archive metadata and exact slice/member expectations, assemble the exact two-slice XCFramework, and re-run the source-controlled CocoaPods consumer/simulator and npm pre-assembly evidence linkage.

Completion condition: no uncontrolled CocoaPods graph resolution remains, and the approved iOS producer/release evidence chain is reproducible and linked before npm assembly.

### IR-026 — actual RN lifecycle identity and adversarial stale cleanup

- Bind Android registration admission to the actual RN runtime identity; a null registration runtime wildcard is not acceptable. The implementation must not admit a different JSI runtime merely because the old package/context/provider remains active.
- Connect Android `ReactHost` / `ReactApplicationContext` construction, destruction, reload, provider invalidation, and re-admission to explicit coordinator identity transitions. The null-context teardown path must not leave the old registration active.
- Preserve iOS actual runtime/module-registry/provider identity through replacement, and demonstrate that the binding association remains valid across the supported RN lifecycle rather than only a thread-local lookup assumption.
- Add source-controlled, production-equivalent RN 0.87.x native evidence for initial construction, runtime replacement, ReactHost/equivalent reload, registry replacement, provider replacement, independent runtimes, teardown during C ABI execution, stale completion, output-bearing operation, retired-generation completion, and new-generation admission.
- For actual RN transitions, verify that stale success/error, `Uint8Array`, private key, mnemonic, profile, replacement Store, and C ABI-owned bytes are never delivered; cleanup/release/zeroization occurs exactly once and before any JSI object construction. Include negative checks for double-free and leak.

Completion condition: actual RN runtime/registry/context/provider/request identity predicates and stale cleanup behavior are demonstrated across lifecycle replacement, not only by synthetic pointers, counters, or application-side reload markers.

## Optional Improvements

None. No scope-expanding API, compatibility mode, fallback, or future hardening is introduced as a review requirement.

## Resolved Findings

### IR-023 — Resolved

No regression found. The source-controlled Android New Architecture consumer links the provider through the appmodules path, both Android target producers build, and the clean x86_64 emulator demonstrates provider admission/load and the 16-operation smoke. The absence of a separate arm64 runtime invocation is recorded as unconfirmed evidence, not used to reopen IR-023.

### IR-025 — Resolved

No regression found. Real Android and iOS artifacts were inspected through target identity, architecture, required symbols, archive/XCFramework layout, package paths, digests, and release evidence. The strict two-slice validator rejects extra directories/slices and mismatched path metadata. No IR-025 defect was found in the complete follow-up range.

## Upstream Feedback

None. No authoritative Concept, Requirement, Design, or Specification contradiction was found. The two blocking results are implementation/release-evidence failures within the approved React Native scope; no upstream document is modified or reopened.

## Deferred Findings

### IR-027 — LOW / Deferred / non-blocking

IR-027 remains deferred and is not a gate blocker. It is not reopened by this range.

The physical Android arm64 runtime, physical iOS device runtime, performance/resource evidence, and a post-reload actual-RN stale-completion scenario are not reported as successful validation. The first two and performance evidence are not issued as new findings here; the lifecycle evidence gap is already covered by IR-026.

## Scope and Traceability

- Requirements: RN support, New Architecture, private native provider/C ABI boundary, public API parity, secret cleanup, package routing, fail-closed behavior, and release evidence were traced against the approved requirements, including AC/NFR/SEC entries corresponding to AC-054–AC-061.
- Design: process-wide RN coordination, runtime/registry/context identity, trust boundary, secret ownership, and artifact trust chain were checked against `docs/design/architecture.md`, `docs/design/bindings.md`, and `docs/design/security.md`.
- Specification: admission and delivery identity (`react-native.md` §§5–7), reentrancy/teardown/stale completion (§§8–9), C ABI and platform boundaries (§§11–16), manifest/provenance/package inventory (§21), acceptance evidence (§22), and resource/lifecycle evidence (§23).
- Implementation: all source, tests, fixtures, consumer, workflow, package assembly, and release-evidence changes in `7c7035b..c76a5c5` were in scope. No primary-only review shortcut was used.
- Platform regression: Rust/Core, C ABI, Node native, WASM fallback, Browser, Browser Extension/MV3, single npm package, public 16-function facade, Android RN, iOS RN, manifest/provenance/SBOM/package inventory were checked through local tests and the integrated CI run.

## Domain Checks

### Specification conformance

IR-023 and IR-025 are consistent with the reviewed contracts. IR-024 fails the exact/frozen CocoaPods graph portion of §§16.2, 21.2, and 22. IR-026 fails the actual runtime identity, replacement, stale completion, and production-equivalent evidence portions of §§5–9 and 22–23.

### Public API and binding regression

The public React Native facade remains exactly 16 synchronous functions, with existing argument ordering, DTO behavior, `Uint8Array` behavior, `null` / `undefined` handling, and error mapping covered by local package tests and CI parity. No new public function, error code, fallback, package, or selector was found.

### Security and secret lifecycle

Applied checklist areas: JSI/native trust boundary, C ABI-owned output, secret temporary ownership/zeroization, stale completion, cleanup-before-JSI, provider invalidation, concurrency/barrier behavior, failure-closed artifact loading, and secret leakage in logs/errors/evidence. Static RAII and delivery ordering are positive. Actual-RN lifecycle isolation remains unproven and Android runtime wildcard is a concrete security-sensitive defect, so the security gate fails on IR-026.

Not applicable to this range: new cryptographic primitive, KDF, nonce, RNG, signing-byte, Symbol/NEM protocol, address, or chain/network algorithm changes. Existing Core/C ABI parity was checked rather than re-derived from implementation convenience.

### Interoperability and release artifacts

The approved Android ABI identities and exact iOS `ios-arm64` / `ios-simulator-arm64` slices were produced and validated. Independent iOS producer bytes/digests/native identity/architecture/metadata/required symbols matched in CI, and the same evidence was rechecked before npm assembly. Final release manifest, `SHA256SUMS`, provenance-related evidence, SBOM, license inventory, and package inventory were generated and strictly revalidated. The missing approved CocoaPods graph is the remaining IR-024 release-trust failure.

### Failure paths and memory safety

Manifest/path/identity/slice mismatch checks fail closed. C ABI release guards, move-only secrets, zeroization, delivery barriers, and process teardown waiting were inspected. No new double-free or use-after-free was observed in the checked static/local paths. Actual lifecycle replacement failure paths remain insufficiently exercised for IR-026.

### Test quality

The coordinator synthetic tests are deterministic and useful for local state-machine behavior, but they use synthetic runtime/provider pointers and intentionally allow the Android-style nullable runtime identity. They cannot close the actual-RN requirement. The source-controlled consumers provide real initial runtime/load/smoke evidence, but current CI predicates do not verify post-reload admission or stale output cleanup.

## Validation Results

### Local validation executed

| Validation | Result |
|---|---|
| `node scripts/test-react-native-lifecycle.mjs` | PASS |
| `node --test packages/wallet-core/test/*.mjs` | PASS, 31 tests |
| `node packages/wallet-core/test/react-native.test.mjs` | PASS, 6/6 |
| `node packages/wallet-core/test/package.test.mjs` | PASS, 5/5 |
| `./crates/c-abi/tests/run_c_abi_runtime.sh` | PASS / exit 0 |
| `cargo fmt --all -- --check` | PASS |
| `git diff --check 7c7035b..c76a5c5` | PASS |

The first sandboxed attempts of the two Node tests failed only because the sandbox denied child Node processes with `EPERM`; the same commands were rerun outside that restriction and passed. This is reported as environment evidence, not an implementation failure.

### Integrated CI validation

Run `34107655205` completed with `success`. Relevant jobs and steps were executed rather than treated as skipped: Core/C ABI, native/WASM/npm parity, Browser/MV3, Android arm64 and x86_64 producer builds, clean Android x86_64 emulator provider/16-API smoke, iOS arm64 and simulator-arm64 producer builds with independent producer-2 comparison, exact two-slice XCFramework assembly, CocoaPods consumer build, Apple Silicon simulator launch, npm assembly, release manifest/SHA-256 validation, provenance-related evidence, SBOM/license inventory generation and final revalidation.

The workflows use `set -euo pipefail` for the required predicates. The observed `|| true` uses are limited to diagnostics or idempotent simulator boot/termination; they do not wrap producer comparison, required smoke markers, package assembly, or final validation. The application reload markers are nevertheless pre-call markers, so they are not treated as proof of completed replacement or re-admission.

### Not validated / not successful evidence

- Actual Android arm64 device/emulator invocation.
- Physical iOS device invocation.
- Actual RN post-reload second-generation admission and 16-API smoke.
- Actual RN stale output-bearing completion during teardown/replacement, including exactly-once release/zeroization counters.
- Source-controlled/frozen CocoaPods resolved graph independent of the successful build.

## Review Gates

| Gate | Result | Evidence / finding |
|---|---|---|
| Specification conformance | FAIL | IR-024 CocoaPods graph contract; IR-026 runtime/replacement/stale completion contract |
| Security | FAIL | IR-026 Android runtime wildcard and missing actual-RN stale-output proof |
| Interoperability | PASS for checked artifacts; overall gate blocked | Exact platform/ABI/slice/package evidence passed; IR-024 still blocks reproducibility trust |
| Abnormal / failure paths | PARTIAL | Manifest/C ABI/RAII fail-closed checks pass; actual lifecycle invalidation paths are incomplete |
| Test sufficiency | FAIL | Synthetic lifecycle tests and pre-call reload markers do not establish actual-RN closure |
| Implementation quality / memory safety | PARTIAL | Static ownership/barrier paths pass inspection; lifecycle identity contract remains unsafe/incomplete |
| Existing regression | PASS | IR-023 and IR-025 remain resolved; Node/Browser/WASM/C ABI/single-package/16 API parity passed |
| Release evidence | FAIL | Final evidence linkage passes, but approved CocoaPods graph input is not frozen/source-controlled |

## Remaining Risks and Open Decisions

- A future clean CocoaPods resolution can change the native dependency graph while preserving the same source commit and Ruby Gemfile.lock. The existing two-run comparison only proves repeatability of the currently resolved environment, not approval of the graph.
- An Android request from a replaced/independent JSI runtime can pass the current coordinator predicate while the old registration remains active because the registration runtime is null. This weakens retired-generation isolation and can undermine stale output cleanup at the JSI trust boundary.
- The iOS callback integration is materially improved, but thread-keyed binding and missing adversarial post-reload evidence leave independent-runtime and replacement guarantees unconfirmed.
- No upstream decision is required to interpret these failures; the specification already states the required runtime identity, frozen provenance, and stale cleanup behavior.

## Automatic Changes

None. Only this new review artifact is being added; implementation, specification, requirements, design, and previous review artifacts are unchanged.

## Final Decision

**REVISE IMPLEMENTATION**

The required conditions for `IMPLEMENTATION READY` are not met because both IR-024 and IR-026 remain HIGH / Open. CI run `34107655205` being green is supporting evidence for the portions that executed, not a substitute for the missing frozen CocoaPods graph or actual React Native lifecycle identity and stale-completion proof.

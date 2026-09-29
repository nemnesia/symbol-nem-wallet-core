# Implementation Review 017

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/react-native-support`
- Implementation HEAD: `e8c57b60b246c7feae6e8789c1475b7076858b8f`
- Parent: `e8529cb08bbbc0aee61d8084eabbe2234f1f0e1e`
- Review date: 2026-09-05 (JST)
- Review type: formal React Native implementation re-review
- Previous review: `docs/reviews/implementation/implement-review-016.md`
- Scope: IR-023 through IR-027, React Native Android/iOS implementation and packaging, RN
  artifact assembly/provenance/SBOM/release evidence, stale-secret lifecycle, and regression of
  the existing 16-operation public API, single npm package, Node, Browser, WASM, and C ABI paths.
- Pre-existing worktree changes: none at review start; no pre-existing change was modified.

The review is against the approved requirements, design, and specification. Android/iOS native
toolchains and device/simulator execution are treated as separate validation limits; their absence
does not waive static implementation requirements.

## Execution Audit

### Required material loading

The following were read before the review:

1. `AGENTS.md`
2. `.agents/skills/implement-review/SKILL.md`
3. `.agents/skills/review-common/review-playbook.md`
4. `.agents/skills/review-common/output-format.md`
5. `.agents/skills/implement-review/{reviewers.md,review-gates.md,output-format.md,security-checklist.md}`
6. `docs/requirements/requirements.md`
7. `docs/design/{architecture.md,bindings.md,security.md}`
8. `docs/decisions/react-native-platform-baseline.md`
9. `docs/specifications/{react-native.md,npm-typescript-facade.md,specification.md}`
10. `docs/reviews/implementation/implement-review-016.md`
11. `docs/reviews/design/react-native-design-review-005.md`
12. `docs/reviews/specifications/specification-review-015.md`

The target implementation, tests, package manifest, Android/iOS integration, release workflow,
assembly scripts, release manifest, SBOM, dependency evidence, and existing C ABI declarations were
then inspected. No Phase Context was registered for this review.

### Independent reviewer passes

Subagents were not available. The Chair performed four independent passes and integrated the
results:

- Specification and public API: Codegen metadata, root `react-native` export, 16-operation facade,
  DTO/`Uint8Array` boundaries, C ABI reuse, errors, and single-package behavior.
- Native and security boundary: Android TurboModule/provider registration, iOS pod integration,
  JSI output ownership, invalidation, runtime/registry/context/process/request identity, and
  secret cleanup.
- Release and supply chain: four RN targets, ELF/Mach-O identity, XCFramework assembly, controlled
  build evidence, source/digest/provenance binding, release manifest, SBOM, and package inventory.
- Regression and abnormal paths: Node/native/WASM, deterministic Browser checks, C ABI runtime,
  malformed artifacts, release scripts, unavailable toolchains, and IR-027 dependency evidence.

## Evidence Used

| Category | Evidence | Use |
| --- | --- | --- |
| Requirements | `docs/requirements/requirements.md` | Binding, security, interoperability, and release obligations |
| Design | `docs/design/{architecture.md,bindings.md,security.md}` | Native boundary, ownership, lifecycle, and fail-closed decisions |
| Platform decision | `docs/decisions/react-native-platform-baseline.md` | React Native 0.87.x, Android, iOS, and supported target baseline |
| Specification | `docs/specifications/react-native.md`, `docs/specifications/npm-typescript-facade.md` | TurboModule/JSI, lifecycle, artifact, package, and release contracts |
| Prior review | `docs/reviews/implementation/implement-review-016.md` | IR-023–IR-027 baseline and claimed corrections |
| Implementation | `packages/wallet-core/android/**`, `packages/wallet-core/ios/**`, `packages/wallet-core/cpp/**`, `packages/wallet-core/src/react-native/**`, `packages/wallet-core/package.json` | Native integration, provider, lifecycle, manifest, and public facade |
| Release | `.github/workflows/{node.yml,release.yml}`, `scripts/{build-npm-package.mjs,react-native-evidence.mjs,release-manifest.mjs,release-sbom.mjs,release-operation.mjs}` | Artifact production, assembly, provenance, release manifest, SBOM, and operation gates |
| Tests | `packages/wallet-core/test/{manifest.test.mjs,package.test.mjs,react-native.test.mjs}`, `scripts/test-{release-evidence,release-sbom,release-record,release-operation,browser-parity,npm-parity}.mjs` | Static, deterministic, release, parity, and negative-path evidence |
| C ABI | `crates/c-abi/include/symbol_nem_wallet_core.h`, `crates/c-abi/tests/run_c_abi_runtime.sh` | Existing 16-operation ABI and runtime regression |
| External primary source | [React Native pure C++ modules](https://reactnative.dev/docs/the-new-architecture/pure-cxx-modules), [RN 0.87 OnLoad.cpp](https://github.com/react/react-native/blob/v0.87.0/packages/react-native/ReactAndroid/cmake-utils/default-app-setup/OnLoad.cpp) | Android app-level CMake/OnLoad/provider integration baseline |

## Review Result

**REVISE IMPLEMENTATION**

IR-023 through IR-026 remain HIGH after partial corrections. The target now contains an Android
`OnLoad.cpp`, provider hooks, RN evidence/assembly plumbing, basic ELF/Mach-O header checks, and a
native output-copy ordering fix. Those additions do not yet establish a publishable consumer
integration, a reproducible four-artifact build, fail-closed native identity/provenance, or the
required independent RN lifecycle identities and invalidation barrier. These findings block READY.

IR-027 remains LOW / Deferred follow-up. The invalid GitHub token prevents Dependabot alert detail
retrieval, but `pnpm audit --json` reports zero advisories and the missing Dependabot detail is not
itself an implementation failure or a reason to block the other gates.

## Summary

- The single package, root `react-native` export ordering, Codegen metadata, existing 16-operation
  facade shape, C ABI reuse, and existing Node/native/WASM paths remain present. No new public API
  was added.
- IR-023 is not closed: the package still applies `com.android.library`, while its CMake entry point
  requires application-level `ReactNative-application.cmake` inputs and non-package properties
  (`snwcReactAndroidDir` and `snwcCAbiLibrary`). No source-controlled consumer/autolinking setup
  supplies those values in a normal published package. The new `OnLoad.cpp` is therefore not a
  complete consumer registration path.
- IR-024 is not closed: the workflow now has four-target download/assembly/manifest/SBOM wiring,
  but it requires externally supplied consumer roots. The release workflow supplies only repository
  variables for those roots, and the iOS podspec references the generated XCFramework before the
  workflow creates it. A clean formal release cannot produce the required four artifacts through
  the submitted repository alone.
- IR-025 is not closed: the validator checks ELF/Mach-O magic, selected architecture/platform
  fields, and byte substrings, but does not parse loadable ELF/Mach-O symbol identity or bind the
  artifact to an independently attested build. The tests accept synthetic header-plus-string files
  as native artifacts. The runtime loader also does not perform the specified manifest/ABI/path
  admission checks.
- IR-026 is not closed: C ABI buffers are now released and the lifecycle check is held before the
  final JSI conversion, so the specific previous copy-before-check ordering defect is corrected.
  However, registry, context, and process-generation values are synthetic module-local counters;
  request identity is local to an admission ticket; and `invalidate()` only flips one module-local
  flag. The implementation does not track the actual RN runtime/registry/context/process lifecycle
  or establish the required invalidation barrier.
- The C ABI runtime, package/RN static tests, release evidence/SBOM/record/operation tests, and
  deterministic Browser parity test passed. Node native/WASM parity passed. Browser runtime parity
  and RN native build/load/invoke were not validated.
- Android/iOS toolchains are unavailable in this environment (`gradle`, `adb`, `xcodebuild`, and
  `pod` are absent; `ANDROID_HOME` is unset). This prevents native execution evidence but does not
  explain away the static integration and release defects above.

## Finding Status

| ID | Severity | Status | Gate impact |
| --- | --- | --- | --- |
| IR-023 | HIGH | Reopened | Android TurboModule/JSI package integration remains incomplete |
| IR-024 | HIGH | Reopened | Formal four-artifact assembly and release evidence cannot be established from a clean release path |
| IR-025 | HIGH | Reopened | Native artifact identity/provenance remains insufficiently fail-closed |
| IR-026 | HIGH | Reopened | Required RN lifecycle identity and stale-secret barrier remain incomplete |
| IR-027 | LOW | Deferred follow-up | Dependabot detail is unavailable; not an implementation Gate blocker |
| IR-001–IR-022 | — | Not reopened | No contradiction was found in the reviewed regression evidence |

Current unresolved findings: **CRITICAL 0 / HIGH 4 / MEDIUM 0 / LOW 1 deferred**.

## Required Changes

### IR-023 — Android TurboModule / JSI registration and consumer build path remains incomplete (HIGH / Reopened)

- **Location:** `packages/wallet-core/android/build.gradle:1-29`,
  `packages/wallet-core/android/CMakeLists.txt:3-26`, `packages/wallet-core/android/OnLoad.cpp:53-64`.
- **Fact:** The Gradle module is a library, while the CMake file invokes the React Native
  application-level entry point and requires `REACT_ANDROID_DIR` and an existing C ABI library.
  The package defaults both Gradle properties to empty values. The submitted package contains no
  normal consumer/autolinking configuration that supplies these values or mounts the appmodules
  target into a consumer application. The workflow supplies them only from an external consumer
  root.
- **Approved root:** `docs/specifications/react-native.md` §§13.1–13.3 and 15; the approved RN
  design; and the official React Native pure C++ module integration. Provider functions and an
  `OnLoad.cpp` source are necessary but do not by themselves make the published package loadable.
- **Impact:** A normal RN consumer cannot configure/build the module from the package as published,
  and `TurboModuleRegistry.getEnforcing("NativeSymbolNemWalletCore")` has no verified Android
  provider path. The failure is at initialization/build integration, not merely at an unavailable
  device test.
- **Minimum correction:** Provide the approved package-to-consumer New Architecture integration,
  including the application-level CMake/OnLoad/provider registration contract, per-ABI C ABI/native
  linkage, and fail-closed missing-provider behavior. Do not add a legacy Bridge or JS/WASM fallback.
- **Recheck:** Build a clean RN 0.87.x New Architecture app for `arm64-v8a` and `x86_64`, load the
  provider, invoke all 16 operations, and verify missing provider/artifact maps to
  `BackendInitializationError`.

### IR-024 — RN artifact assembly, provenance, and release evidence remain non-reproducible (HIGH / Reopened)

- **Location:** `.github/workflows/node.yml:347-444,543-606`,
  `.github/workflows/release.yml:73-81`, `packages/wallet-core/ios/SymbolNemWalletCoreRN.podspec:12`.
- **Fact:** The workflow requires `SNWC_RN_ANDROID_CONSUMER_ROOT` and
  `SNWC_RN_IOS_CONSUMER_ROOT` from external inputs/variables. The release workflow passes repository
  variables, but does not check out or construct those consumer projects. The iOS podspec points to
  `../dist/react-native/ios/SymbolNemWalletCoreRN.xcframework`, while the iOS job runs `pod install`
  before any package assembly creates that generated XCFramework. The release scripts now include
  RN artifacts and evidence in the downstream manifest/SBOM inputs, but this upstream build path
  cannot reliably produce them from a clean checkout.
- **Approved root:** `docs/specifications/react-native.md` §§14, 16, 21.1–21.3 and AC-058–AC-060.
- **Impact:** The formal release cannot be shown to produce exactly the four approved RN targets
  from source through controlled build, package, release manifest, provenance, and SBOM. The
  downstream fail-closed gate is present, but a gate with no reproducible producer is not a passing
  release path.
- **Minimum correction:** Make the consumer build inputs source-controlled or otherwise explicitly
  reproducible and available to the workflow; order iOS framework generation before pod consumption;
  produce all four target artifacts and evidence from the reviewed source commit; and cross-verify
  artifact, manifest, tarball, release manifest, provenance, SBOM, and inventory digests.
- **Recheck:** Execute a clean formal assembly with exactly four RN targets, verify the npm tarball
  inventory and canonical manifest, and assert missing/extra/incomplete artifact evidence fails.

### IR-025 — ELF / Mach-O artifact identity and provenance are not fail-closed (HIGH / Reopened)

- **Location:** `packages/wallet-core/src/react-native-manifest.mjs:73-163`,
  `scripts/react-native-evidence.mjs:124-186`, `packages/wallet-core/test/manifest.test.mjs:30-74`,
  `scripts/test-release-evidence.mjs` synthetic artifact fixtures.
- **Fact:** Android validation checks ELF magic/class/endian/type/machine and searches the complete
  file for two symbol strings. iOS validation checks archive framing, arm64 CPU, and a selected
  `LC_BUILD_VERSION` platform, then searches the complete archive for the same strings. It does not
  establish loadable segments, actual exported symbol-table entries, SONAME/target linkage, valid
  archive object identity, or a complete XCFramework slice identity. The deterministic fixtures are
  header-plus-string buffers without real ELF program/symbol tables or Mach-O object symbols and are
  accepted by the validator. `controlled_build` is self-created JSON whose fields are internally
  compared, not independently attested to the build output. The JS native loader does not perform
  the specified manifest-entry, ABI-identity, package-local-path, and native-load admission checks.
- **Approved root:** `docs/specifications/react-native.md` §§14.1–14.2, 16.2, and 21.1–21.2.
- **Impact:** Wrong-ABI, wrong-platform, non-loadable, or otherwise unapproved bytes can cross the
  RN native artifact boundary if they are placed at an allowed path and hashed. Release evidence can
  report an identity that was not independently established.
- **Minimum correction:** Parse and validate the actual native format and target identity, including
  loadability and required symbols/slices, reject unsupported/extra slices, bind evidence to a
  controlled build attestation/source revision, and enforce the manifest/ABI/path checks at runtime.
  Keep all checks fail-closed and secret-free.
- **Recheck:** Add negative tests for text-as-`.so`, malformed/non-loadable ELF, wrong ABI, missing
  or non-exported symbols, wrong Mach-O platform/architecture, extra XCFramework slices, provenance
  mismatch, and valid real four-target artifacts.

### IR-026 — RN lifecycle identity and stale-secret invalidation barrier remain incomplete (HIGH / Reopened)

- **Location:** `packages/wallet-core/cpp/NativeSymbolNemWalletCore.cpp:60-151,635-652` and the
  output-bearing operation paths beginning at `packages/wallet-core/cpp/NativeSymbolNemWalletCore.cpp:653`.
- **Fact:** The target now copies C ABI output into native-owned buffers, releases C ABI ownership,
  and holds the lifecycle shared lock while checking liveness before JSI conversion. This corrects
  the prior output-copy-before-check ordering. However, `registryIdentity_` and `contextIdentity_`
  are allocated process-local counters, `processGeneration_` is a constant, request identity is
  only a per-ticket counter, and `invalidate()` only stores `false` in the module-local `valid_`
  flag. There is no actual RN registry/context/process-generation hook or barrier that proves the
  output belongs to the active runtime lifecycle.
- **Approved root:** `docs/specifications/react-native.md` §§4.1, 6.2, 9.1–9.2, 11.1, 12, and
  13.2; approved binding/security design.
- **Impact:** The previous secret-bearing JSI allocation race is narrowed, but teardown/reload and
  independent-runtime cases still cannot be proven safe under the specified identity contract.
  A stale completion may be admitted based only on one module-local flag and a runtime pointer.
- **Minimum correction:** Bind admission to actual runtime, registry, context, process-generation,
  and request identities; implement the required invalidation barrier; and make stale completion a
  cleanup-only path after C ABI release and before any JSI allocation/copy.
- **Recheck:** Add deterministic concurrent tests for every output-bearing operation, invalidation
  during C ABI execution, independent runtimes, exact C ABI release, zeroization, and absence of any
  stale JSI success object or secret output.

### IR-027 — Dependabot alert identity remains unverified (LOW / Deferred follow-up)

- **Fact:** `gh auth status` still reports an invalid GitHub token for `ccHarvestasya`, so the
  Dependabot alert endpoint cannot be queried. `pnpm audit --json` on this target reports an empty
  advisory set and zero vulnerabilities at info/low/moderate/high/critical levels.
- **Impact:** The reported four low default-branch alerts cannot be mapped here to a GHSA, package,
  fixed version, or the dependency change. This is an evidence gap, not proof of a current package
  vulnerability and not the reason for the React Native implementation Gate decision.
- **Follow-up:** Re-authenticate with Dependabot read access, record package/version/GHSA/severity/
  fixed version for each alert, compare with the final lockfile, and record the resulting mitigation
  or approved risk decision. Re-run the dependency audit after that decision.

## Optional Improvements

None. The remaining items are required implementation or release-evidence corrections, not optional
quality improvements.

## Resolved Findings

No finding in IR-023–IR-026 is eligible for closure. The following partial corrections are recorded
without treating the parent findings as resolved:

- IR-023: provider functions and an `OnLoad.cpp` source were added.
- IR-024: RN artifact/evidence inputs now flow through package assembly, release manifest, and SBOM
  scripts, with deterministic script coverage.
- IR-025: basic ELF/Mach-O framing and selected target fields are now checked.
- IR-026: C ABI ownership is released before final JSI conversion, and the lifecycle shared lock
  prevents invalidation from racing that final conversion. The required real lifecycle identity
  and barrier remain absent.

## Upstream Feedback

No new upstream requirements, design, or specification defect was identified. The current approved
documents are sufficient to judge the remaining implementation gaps.

## Deferred Findings

- IR-027 remains LOW / Deferred pending GitHub Dependabot authentication and authoritative alert
  details. It does not block the implementation Gate.
- Actual Android/iOS native build, provider load, device/simulator invocation, and production
  responsiveness evidence remain unexecuted because the required toolchains and consumer projects
  are unavailable in this environment. This is reported as NOT VALIDATED, not PASS.
- Browser runtime parity is not validated because no browser runtime was available. Deterministic
  Browser parity checks passed; Node native and WASM parity passed.

## Scope and Traceability

| Scope item | Result | Traceability |
| --- | --- | --- |
| React Native public facade and 16 operations | Partial / static PASS | `docs/specifications/react-native.md` §§3–6; package and static RN tests |
| Android TurboModule / Codegen / JSI registration | REVISE | IR-023; `docs/specifications/react-native.md` §13 |
| iOS TurboModule / Codegen / JSI packaging | REVISE / unvalidated natively | IR-024; `docs/specifications/react-native.md` §§15–16 |
| Four RN artifact assembly | REVISE | IR-024; `docs/specifications/react-native.md` §21 |
| ELF / Mach-O identity and provenance | REVISE | IR-025; `docs/specifications/react-native.md` §§14,16,21 |
| Invalidation and stale-secret lifecycle | REVISE | IR-026; `docs/specifications/react-native.md` §§9,11–13 |
| Existing Node / Browser / WASM / C ABI surfaces | Node/WASM/C ABI PASS; Browser runtime NOT VALIDATED | `docs/specifications/npm-typescript-facade.md`; regression scripts |
| Dependabot evidence | Deferred | IR-027 |

## Domain Checks

| Domain | Result | Notes |
| --- | --- | --- |
| Specification conformance | REVISE | Android integration, release production, artifact trust, and lifecycle contract remain incomplete |
| Security / secret lifecycle | REVISE | IR-026 residual lifecycle gap and IR-025 artifact trust gap are HIGH |
| Native interoperability | REVISE / NOT VALIDATED | Existing C ABI runtime passed; RN native load/invoke and real artifact identity were not executed |
| Public API / package regression | PASS for static and Node/native/WASM checks | Existing 16-operation shape and single package remain; no public API addition found |
| Browser | PARTIAL | Deterministic parity passed; browser runtime unavailable |
| Failure and malformed-input paths | REVISE | Static artifact checks are insufficient for real native identity/loadability; lifecycle tests are incomplete |
| Release evidence / SBOM | PARTIAL / REVISE | Downstream scripts include RN inputs and deterministic tests pass, but clean producer/provenance path is not established |

## Validation Results

| Validation | Result | Notes |
| --- | --- | --- |
| `git diff --check e8c57b60b246c7feae6e8789c1475b7076858b8f^ e8c57b60b246c7feae6e8789c1475b7076858b8f` | PASS | Target diff has no whitespace errors |
| `node --test packages/wallet-core/test/package.test.mjs packages/wallet-core/test/react-native.test.mjs` | PASS | 8/8 tests |
| `node scripts/test-release-evidence.mjs` | PASS | Deterministic evidence/negative-path tests; fixtures are synthetic and do not prove real native loading |
| `node scripts/test-release-sbom.mjs` | PASS | Deterministic SBOM/license checks |
| `node scripts/test-release-record.mjs` | PASS | Deterministic release record checks |
| `node scripts/test-release-operation.mjs` | PASS | Deterministic release-operation checks |
| `node scripts/test-browser-parity.mjs` | PASS | Deterministic browser observability/parity checks |
| `node scripts/test-npm-parity.mjs` | PARTIAL / BLOCKED | Node native and WASM execution passed; Browser WASM runtime unavailable |
| `./crates/c-abi/tests/run_c_abi_runtime.sh` | PASS | Exit code 0 |
| `pnpm audit --json` | PASS | Empty advisory set; 0 vulnerabilities at all reported levels |
| `gh auth status` | NOT VALIDATED | GitHub token invalid; Dependabot detail unavailable |
| Android Gradle/CMake build, provider load, device/emulator | NOT VALIDATED | `gradle`/`adb` unavailable and `ANDROID_HOME` unset; static IR-023 defect remains independently actionable |
| iOS CocoaPods/Xcode build, provider load, device/simulator | NOT VALIDATED | `pod`/`xcodebuild` unavailable; static IR-024 ordering/producer defect remains independently actionable |
| Formal four-target RN artifacts and clean npm release | NOT VALIDATED | No verified artifacts/consumer projects available; local ignored manifest is empty/stale and is not release evidence |
| Production-equivalent RN responsiveness evidence | NOT VALIDATED | No native app execution available |

## Review Gates

| Gate | Result | Reason |
| --- | --- | --- |
| Approved specification conformance | FAIL | IR-023, IR-024, and IR-026 remain outside the required contract |
| Security and secret lifecycle | FAIL | IR-025 and IR-026 leave native trust/lifecycle guarantees incomplete |
| Symbol/NEM interoperability and binding boundary | PARTIAL / FAIL for RN | Existing C ABI runtime passed; RN native artifact/load boundary was not established |
| Abnormal/error/fail-closed behavior | FAIL | Artifact identity and lifecycle admission are not sufficiently fail-closed |
| Test sufficiency | FAIL | Static/synthetic tests cannot replace real RN build/load/invoke and lifecycle evidence |
| Regression | PASS for validated existing paths; PARTIAL overall | Node/native/WASM/C ABI passed; Browser runtime and RN native paths remain unvalidated |
| Release readiness | FAIL | A clean producer for four RN artifacts and independently bound provenance is not established |

## Remaining Risks and Open Decisions

- The implementation must decide and document a reproducible, package-consumer-compatible Android
  appmodules registration path before the RN platform can be considered supported.
- The iOS build must establish whether the XCFramework is produced before pod resolution or supplied
  as a verified release input; the current ordering cannot be treated as an implementation pass.
- Real native binary identity and provenance must be established independently of the JSON evidence
  generator; synthetic fixtures must not be used as the only proof of native artifact validity.
- The RN lifecycle owner must expose or bind actual registry/context/process identity and define the
  invalidation barrier in the implementation without expanding the public API.
- IR-027 remains an external evidence follow-up and is intentionally not coupled to the four HIGH
  implementation findings.

## Automatic Changes

None. This review changed no source, specification, test, fixture, or configuration file.

## Final Decision

**REVISE IMPLEMENTATION**

IR-023, IR-024, IR-025, and IR-026 are reopened as HIGH findings. IR-027 is LOW / Deferred and does
not block the implementation Gate. The reviewed implementation is not READY for merge or release.

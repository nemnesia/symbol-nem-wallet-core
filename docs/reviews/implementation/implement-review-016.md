# Implementation Review 016

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/react-native-support`
- Implementation HEAD: `b29b3206144137b3c7810204e141ad659889282f`
- Parent: `781b5631fbc54af47f7ab1e94b562f8164763126`
- Review date: 2026-09-05 (JST)
- Review scope: React Native implementation introduced by the target commit, its package/release
  integration, dependency update, and non-regression against the existing Node, Browser, Browser
  Extension, WASM, and C ABI surfaces.
- Existing user change preserved: `docs/reviews/concept/concept-sheet-review-011.md` was not modified.

Concept / Requirements / Design / Specification are stated to be formally READY with Open 0. The
current target was reviewed against those approved documents; prior findings were not mechanically
carried forward.

## Execution Audit

### Required material loading

The following materials were read before the review:

1. `AGENTS.md`
2. `.agents/skills/implement-review/SKILL.md`
3. `.agents/skills/review-common/review-playbook.md`
4. `.agents/skills/implement-review/reviewers.md`
5. `.agents/skills/implement-review/review-gates.md`
6. `.agents/skills/implement-review/output-format.md`
7. `.agents/skills/implement-review/security-checklist.md`

The current Requirements, Design, Specification, latest Design / Specification review artifacts,
React Native platform decision, target implementation, tests, package assembly, release evidence,
workflow, dependency lockfile, and C ABI declarations were inspected. No registered Phase Context
was used.

### Independent reviewer passes

Subagents were not available. The same Chair performed four independent passes and then integrated
and refuted the candidate findings:

- Specification conformance: 16-function synchronous facade, root `react-native` export, DTO,
  `Uint8Array`, error mapping, serialization, C ABI reuse, and single-package contract.
- Native and security boundary: TurboModule / Codegen / JSI, Android and iOS registration,
  process-wide admission, runtime identity, stale completion, output ownership, zeroization,
  and C ABI release paths.
- Release and supply chain: RN manifest, ABI/slice identity, package assembly, fail-closed mode,
  release manifest, SBOM, provenance, inventory, and dependency evidence.
- Regression and abnormal paths: Node / Browser / Browser Extension coverage, C ABI runtime,
  malformed and failure paths, local release gates, platform/toolchain availability, and
  Dependabot evidence.

## Evidence Used

| Category | Evidence | Use |
| --- | --- | --- |
| Requirements | `docs/requirements/requirements.md` | Core authority, binding boundary, security, interoperability, and release expectations |
| Design | `docs/design/architecture.md`, `docs/design/bindings.md`, `docs/design/security.md` | Native boundary, process-wide coordination, secret lifecycle, fail-closed behavior |
| Design review | `docs/reviews/design/react-native-design-review-005.md` | Approved React Native design decisions and resolved design findings |
| Platform decision | `docs/decisions/react-native-platform-baseline.md` | Approved RN / Android / iOS support baseline |
| Specification | `docs/specifications/react-native.md`, `docs/specifications/npm-typescript-facade.md`, `docs/specifications/specification.md` | Public contract, lifecycle, C ABI, artifact, package, and release evidence rules |
| Specification review | `docs/reviews/specifications/specification-review-015.md` | READY status and current resolved specification findings |
| Implementation | `packages/wallet-core/src/react-native/**`, `packages/wallet-core/cpp/**`, `packages/wallet-core/android/**`, `packages/wallet-core/ios/**`, `packages/wallet-core/package.json` | RN entry, JSI adapter, provider, Codegen metadata, and native packaging |
| Release | `.github/workflows/node.yml`, `scripts/build-npm-package.mjs`, `scripts/release-manifest.mjs`, `scripts/release-sbom.mjs`, `scripts/test-npm-release.mjs`, `scripts/test-release-evidence.mjs` | Assembly, fail-closed gates, release manifest, SBOM, and provenance coverage |
| C ABI | `crates/c-abi/include/symbol_nem_wallet_core.h`, `packages/wallet-core/cpp/include/symbol_nem_wallet_core.h`, `crates/c-abi/tests/run_c_abi_runtime.sh` | Existing 16-function ABI declaration and runtime reuse |
| Regression | `packages/wallet-core/test/*.mjs`, `scripts/test-browser-parity.mjs`, `scripts/test-npm-parity.mjs` | Node / Browser / WASM and public surface checks |
| Dependency | `package.json`, `pnpm-lock.yaml`, `pnpm audit --json`, `gh auth status` | webpack update and available vulnerability evidence |
| External primary source | [React Native Cross-Platform Native Modules (C++)](https://reactnative.dev/docs/the-new-architecture/pure-cxx-modules) | Codegen, C++ module build, and Android provider registration baseline |

## Review Result

**REVISE IMPLEMENTATION**

The React Native implementation has a valid public facade shape and reuses the existing C ABI
operation set, but the supported Android registration path is incomplete, the formal release path
does not assemble or evidence the four RN artifacts, artifact preflight does not verify binary
identity/provenance, and stale output is copied into JSI objects before lifecycle validation.
These are open HIGH findings and block READY.

## Summary

- The package root export, `react-native` condition ordering, private RN entry, synchronous 16-operation
  facade, `Uint8Array` boundary, existing error namespace, and single npm package shape are present.
- The C++ adapter declares and invokes the same 16 existing C ABI functions; the checked-in private
  header's declarations match the public C ABI types and function signatures. The C ABI runtime passed.
- Android contains only an OBJECT CMake target and a provider function. There is no consumer/app
  `appmodules` integration, `externalNativeBuild` path, or Android provider registration hook, so the
  formal TurboModule cannot be exposed to JS by the submitted package integration.
- The release workflow never supplies `--react-native-artifact`, never builds/downloads RN artifact
  evidence, and does not include RN artifacts in the release manifest or SBOM. Formal release mode is
  fail-closed, but the workflow has no path that can satisfy that gate; candidate mode can advertise
  the RN condition with an empty RN manifest.
- RN artifact validation checks declared target/path/filename and a self-generated SHA-256 only. It
  does not inspect ELF/Mach-O architecture, symbols, XCFramework slice identity, or controlled-build
  provenance. Existing deterministic fixtures use arbitrary bytes under native artifact filenames.
- `AdmissionTicket::ensureLive()` runs after output conversion and C ABI release. A concurrent
  invalidation therefore causes secret-bearing output to be copied into a JSI `Uint8Array`/DTO before
  the request is rejected; runtime, context, registry, and request identities are not tracked.
- Node / Browser / WASM parity, Browser parity, public package tests, C ABI runtime, release evidence,
  release SBOM/license checks, and `pnpm audit` passed. Chromium parity is not the same as a complete
  Chromium MV3 extension smoke test.
- Android/iOS native builds, device/simulator runtime, formal four-target RN artifacts, and complete
  MV3 runtime smoke remain unverified because the required platform toolchains/artifacts were not
  available. They are not reported as PASS.

## Finding Status

| ID | Severity | Status | Gate impact |
| --- | --- | --- | --- |
| IR-023 | HIGH | Open / New | Required change; Android RN initialization is not implementable through the submitted integration |
| IR-024 | HIGH | Open / New | Required change; formal RN package/release evidence cannot be produced by the workflow |
| IR-025 | HIGH | Open / New | Required change; native artifact identity and provenance are not fail-closed |
| IR-026 | HIGH | Open / New | Required change; stale output crosses the native/runtime lifecycle boundary |
| IR-027 | LOW | Deferred follow-up | Dependabot alert identity is unverified; not the reason for the implementation gate decision |
| IR-001–IR-022 | — | Not reopened by this target | Existing prior closure evidence was not contradicted by the RN regression checks |

Current unresolved findings: **CRITICAL 0 / HIGH 4 / MEDIUM 0 / LOW 1 deferred**.

## Required Changes

### IR-023 — Android TurboModule / JSI registration path is incomplete (HIGH / Open)

- **Location:** `packages/wallet-core/android/CMakeLists.txt:5-14`,
  `packages/wallet-core/android/build.gradle:1-15`,
  `packages/wallet-core/cpp/NativeSymbolNemWalletCoreProvider.cpp:5-12`.
- **Fact:** The Android CMake file creates only an OBJECT target for the two C++ source files and
  assumes that an application target supplies React Native Codegen/JSI/C ABI symbols. The Gradle
  library does not configure `externalNativeBuild` and only points `jniLibs` at prebuilt files. The
  submitted package contains no `OnLoad.cpp`, `appmodules` `target_sources`/link integration,
  React Native package registration, or other reference that calls
  `symbolNemWalletCoreCxxModuleProvider`.
- **Approved root:** `docs/specifications/react-native.md` §§3.1, 13.1, 13.3, 18; approved RN
  design and platform baseline. A Codegen spec and C++ class alone are not a registration path.
  React Native's official C++ module guide explicitly separates Codegen scaffolding from platform
  registration and requires Android CMake integration plus an Android provider registration hook.
- **Problem:** `TurboModuleRegistry.getEnforcing("NativeSymbolNemWalletCore")` has no submitted
  Android path that links and registers the provider. The existing `javaPackageName` Codegen metadata
  does not register a pure C++ provider.
- **Impact:** On the formal Android target, RN initialization fails or the module is absent; none of
  the 16 synchronous operations can be invoked. This is an implementation defect, not merely an
  unexecuted device test.
- **Severity basis:** HIGH because a formally supported platform's required native boundary is
  unavailable and the failure occurs at initialization.
- **Minimum correction:** Add the approved New Architecture Android integration that compiles/links
  the adapter and existing C ABI into the two approved ABI artifacts and registers the C++ provider
  in the consumer/autolinking path. Do not add a legacy Bridge or a JS/WASM fallback.
- **Recheck:** Build a minimal RN `0.87.x` New Architecture app for API 24 `arm64-v8a` and `x86_64`,
  verify provider lookup and all 16 sync calls, and verify missing provider/artifact maps to
  `BackendInitializationError`.

### IR-024 — RN artifacts are absent from formal assembly, release evidence, and SBOM (HIGH / Open)

- **Location:** `.github/workflows/node.yml:395-414,424-447,492-518`,
  `scripts/build-npm-package.mjs:174-179,265-329`,
  `scripts/release-manifest.mjs:513-530,607-618`,
  `scripts/release-sbom.mjs:31-39,1035-1049`.
- **Fact:** The package assembler accepts RN artifact inputs, but the workflow passes only four Node
  artifacts and WASM; it never passes `--react-native-artifact`, downloads RN build/evidence outputs,
  or invokes an RN-specific validation step. `SNWC_REQUIRE_REACT_NATIVE_ARTIFACTS=true` is set for
  formal release, while the same workflow leaves the RN manifest empty. The release manifest schema
  and digest set contain Node/WASM/npm entries but no RN manifest or RN artifact entries. The SBOM
  target list likewise contains Node and WASM only.
- **Approved root:** `docs/specifications/react-native.md` §§21.1-21.3 and 22 (`AC-058`–`AC-060`),
  together with the approved release/provenance design. The formal package inventory requires the
  four RN files in one npm package and the source → controlled build → target artifact → manifest →
  package → SBOM/provenance chain.
- **Problem:** The formal gate is correctly fail-closed for an empty RN manifest, but the submitted
  workflow has no way to produce the required non-empty manifest. Candidate mode can continue with an
  empty RN manifest while the package exports the RN condition.
- **Impact:** A formal RN release cannot be assembled; a candidate can be incomplete and still expose
  the RN entry. RN artifacts are also absent from release digest/provenance/SBOM cross-verification.
- **Severity basis:** HIGH because release integrity and the supported single-package inventory are
  incomplete at the release boundary.
- **Minimum correction:** Add controlled Android/iOS artifact jobs and evidence inputs, pass all four
  canonical RN artifacts to assembly, enforce the intended completeness policy for every publishable
  package, and include RN artifact/manifest digests and target identities in release manifest,
  provenance, and SBOM validation. Preserve fail-closed behavior.
- **Recheck:** Assemble a clean candidate and formal package with exactly four RN entries, verify
  package inventory and tarball contents, verify release manifest/SHA256SUMS/SBOM/provenance links,
  and verify incomplete/extra/missing RN inputs fail.

### IR-025 — RN artifact preflight does not verify target binary identity or provenance (HIGH / Open)

- **Location:** `packages/wallet-core/src/react-native-manifest.mjs:193-235`,
  `scripts/build-npm-package.mjs:174-179`,
  `scripts/test-release-evidence.mjs:153-167`.
- **Fact:** `validateReactNativeArtifactInputs()` checks target allowlisting, duplicate target IDs,
  filename suffix, file readability, and SHA-256 computed from the supplied bytes. It does not inspect
  ELF class/architecture/SONAME/symbol identity, Mach-O architecture/platform, XCFramework slice
  identity, or controlled build evidence/source/toolchain association. The deterministic release test
  writes `Buffer.from("react-native-${targetId}")` as each `.so`/`.a` artifact and accepts it as a
  manifest input.
- **Approved root:** `docs/specifications/react-native.md` §§14.1-14.2, 16.2, 21.1-21.2. The
  specification requires actual target/architecture identity, required slice validation, wrong-ABI
  rejection, and source-to-controlled-build provenance; a digest alone authenticates only the bytes
  selected by the assembler.
- **Problem:** A wrong-ABI, wrong-platform, non-native, or otherwise unapproved file can be placed at
  an allowed path, hashed, and packaged as a formal RN artifact. The package gate cannot distinguish
  the approved native output from arbitrary bytes.
- **Impact:** ABI selection/load may fail late, or an untrusted/wrong native binary may cross the
  package/native trust boundary. Release evidence can claim an identity that was never established.
- **Severity basis:** HIGH because the defect is at the native artifact integrity and supply-chain
  boundary, affecting both availability and the trustworthiness of the formal package.
- **Minimum correction:** Validate platform binary headers/architectures and approved symbols/slices,
  reject extra/unsupported slices, and bind each artifact to controlled build evidence containing
  source revision, package version, target identity, toolchain, and digest. Keep the validation
  fail-closed and secret-free.
- **Recheck:** Add negative tests for text-as-`.so`, wrong ELF ABI, wrong Mach-O platform/architecture,
  extra XCFramework slice, digest mismatch, provenance mismatch, and valid four-target artifacts.

### IR-026 — Stale native output is copied into JSI objects before lifecycle validation (HIGH / Open)

- **Location:** `packages/wallet-core/cpp/NativeSymbolNemWalletCore.cpp:69-96,373-390,513-518`,
  representative operation paths at `520-533`, `597-615`, and `683-698`.
- **Fact:** `AdmissionTicket` checks one module-local atomic `valid_` before the C ABI call and
  `ensureLive()` after output conversion. Operations first allocate/copy output into JSI objects,
  release C ABI buffers, and only then call `ensureLive()`. `AdmissionTicket` ignores the supplied
  runtime (`(void)runtime`), and `invalidate()` only flips `valid_`; there is no runtime, registry,
  context, process-generation, or request identity/barrier.
- **Approved root:** `docs/specifications/react-native.md` §§4.1, 6.2, 9.1-9.2, 11.1, 12, and
  13.2. The contract requires output validation/release followed by identity checking *before* JS
  output copy; stale output must be cleanup-only and must not be copied into JS.
- **Problem:** If invalidation occurs while C ABI execution is in flight, the binding constructs a
  `Uint8Array`/DTO containing a secret, signature, replacement Store, or other output before the
  stale check throws `BindingFailure`. Although the object is not returned after the throw, it has
  already crossed into the JSI heap and its lifetime is no longer controlled by the operation-local
  native cleanup.
- **Impact:** Runtime teardown/reload can expose stale secret-bearing material to the wrong lifecycle
  identity and violates the required cleanup-only stale path. The implementation also cannot prove
  that an unrelated runtime remains valid while another runtime is invalidated.
- **Severity basis:** HIGH because secret lifecycle and native/runtime boundary guarantees are broken
  on a concurrent teardown path.
- **Minimum correction:** Track the required runtime/registry/context/process/request identities and
  establish invalidation/cleanup barriers. After C ABI release, perform the identity check before any
  JSI allocation or output copy; stale paths must release/zeroize and throw only when the outer caller
  can observe it.
- **Recheck:** Add deterministic lifecycle tests that invalidate/reload during each output-bearing
  operation, assert no JSI success object or secret output is allocated/delivered, assert exact C ABI
  release, and verify independent runtimes do not invalidate one another.

### IR-027 — Dependabot alert identity remains unverified (LOW / Deferred follow-up)

- **Location:** repository default-branch Dependabot alert state; review evidence boundary rather than
  an implementation source file.
- **Fact:** `pnpm audit --json` on this target reported zero vulnerabilities (`info/low/moderate/high/
  critical: 0`) across the installed dependency graph. The target diff updates root webpack from
  `5.99.9` to `5.104.1` and updates the lockfile transitive entries. `gh auth status` reported an
  invalid GitHub token, and the Dependabot alert endpoint could not be queried. The reported four low
  default-branch alerts therefore cannot be mapped to a GHSA, package, fixed version, or the webpack
  update from this review environment.
- **Impact:** The repository has no verified evidence that the reported alerts are resolved, unrelated,
  or covered by the webpack update. This is a release evidence gap, not proof that webpack remains
  vulnerable.
- **Severity basis:** LOW pending authoritative alert details; no current `pnpm audit` vulnerability
  was observed.
- **Minimum follow-up:** Re-authenticate GitHub with permission to read Dependabot alerts, query the
  default branch, record package/version/GHSA/severity/fixed version for all four alerts, compare them
  with `pnpm-lock.yaml` on this branch, and either update/mitigate or record an approved risk decision.
  Re-run `pnpm audit --json` after the final dependency decision.
- **Closure evidence:** Authenticated alert export/API response and a lockfile/package mapping showing
  whether each alert is fixed, unrelated, or explicitly accepted before release.

## Optional Improvements

- The RN adapter currently carries a compact private copy of the C ABI header. Its declarations match
  the checked-in public C ABI header in this review, but a CI declaration-parity check or a controlled
  vendoring step would reduce future drift risk without changing the public C ABI.
- Add a real generated-Codegen fixture to the RN tests so that the C++ provider and generated JSI base
  class are compiled in CI rather than only represented by a mock TurboModule object.

## Resolved Findings

- No current RN-specific finding was resolved during this review; the four HIGH findings above remain
  open.
- Existing IR-001–IR-022 were not reopened by the reviewed RN diff. Current C ABI runtime, Node/Browser/
  WASM parity, and package-level tests did not show a regression in those previously reviewed surfaces.

## Upstream Feedback

No upstream document change is required to explain the findings. The approved Design and Specification
already define the Android registration, lifecycle identity, stale-output, artifact identity,
provenance, single-package, and release evidence requirements. The implementation must be brought into
conformance with those existing decisions.

## Deferred Findings

The following are unverified environment-dependent checks and are not reported as PASS:

- No `gradle`, `xcodebuild`, `pod`, `adb`, or Android emulator was available. Android build/runtime,
  iOS Xcode/Pods build, and device/simulator execution were not run.
- No formal four-target RN artifacts were available. The checked local RN manifest is empty; this is
  evidence of incomplete local assembly, not evidence that the four artifacts are valid.
- The complete Chromium MV3 extension runtime smoke was not run. `test-browser-parity.mjs` did pass its
  Chromium parity check, but that is not a full MV3 extension installation/runtime validation.
- `node scripts/test-npm-bundlers.mjs` was not validated because its clean-install helper attempted
  `npm install` on the Node executable path and failed with `ENOTDIR`; this environment failure is not
  treated as a package bundler PASS or as an implementation finding.
- `node scripts/test-npm-release.mjs` stopped on the local empty/inconsistent native manifest before
  completing package smoke. It is recorded as a failed gate, not as a successful release validation.
- Formal native runtime, package artifact identity, and release evidence remain blocked by IR-023–IR-025;
  they cannot be promoted to PASS merely because platform execution was unavailable.

## Scope and Traceability

| Review area | Approved traceability | Implementation evidence |
| --- | --- | --- |
| 16-function facade / DTO / errors | RN Specification §§3-5, 19; npm facade Specification §§4-10 | `src/react-native/index.mjs`, `native-module.mjs`, `facade-runtime.mjs`, C++ operation dispatch |
| Uint8Array / ownership / serialization | RN Specification §§4, 11-12; Design security/bindings | C++ `SecretBytes`, `bytesToJs`, owned-output guards, C ABI declarations |
| Lifecycle / security boundary | RN Specification §§6, 9, 13.2, 15.2 | `AdmissionTicket`, `valid_`, `invalidate()`, operation output paths |
| Android integration | RN Specification §§13-14, 18, 20 | Android CMake/Gradle, Codegen metadata, C++ provider |
| iOS integration | RN Specification §§15-16, 18, 20 | iOS provider, podspec, XCFramework assembly code; runtime unverified |
| Single package / exports | RN Specification §21.3; npm facade Specification §§3, 12-14 | package `exports`, `files`, build assembler, package tests |
| Artifact / release / provenance / SBOM | RN Specification §§21-22; release design | RN manifest validator, workflow, release manifest, SBOM, package gates |
| Existing binding non-regression | RN Specification `AC-057`; Requirements / Design binding contracts | C ABI runtime, Node tests, Browser/WASM parity and package tests |
| Dependency risk | release gate policy; package root manifest/lock | webpack diff, lockfile, `pnpm audit`, GitHub auth limitation |

## Domain Checks

| Gate / domain | Result | Basis / limitation |
| --- | --- | --- |
| Design / Specification conformance | **REVISE** | Public surface and C ABI reuse are aligned; Android registration, lifecycle, artifact identity, and release evidence are not. |
| Security / native boundary | **REVISE** | IR-025 and IR-026 cross the native artifact and stale-secret lifecycle boundaries. No secret values appeared in logs or this artifact. |
| Symbol / NEM / C ABI interoperability | **PASS for exercised C ABI path; RN platform deferred** | Existing C ABI runtime and declaration parity passed; actual RN native load/invoke was unavailable. |
| Node / Browser / Browser Extension non-regression | **PASS with deferred MV3 evidence** | Node tests, Browser parity, and Node/WASM parity passed; complete MV3 runtime smoke was not run. |
| Error / DTO / Uint8Array / serialization contract | **PARTIAL** | Static facade and mock tests passed; lifecycle stale-output and platform conversion runtime remain open. |
| Package / single npm package | **PARTIAL / REVISE** | Root export and inventory code are present; formal RN artifacts and release assembly are missing. |
| Artifact manifest / fail-closed | **REVISE** | Empty formal release is rejected, but supplied RN bytes are not target-identity/provenance verified and no workflow input exists. |
| Test sufficiency | **PARTIAL WITH DEFERRED EVIDENCE** | Relevant JS/C ABI/release self-tests passed; platform/native/artifact/MV3 evidence is unavailable. |

## Validation Results

| Validation | Result | Notes |
| --- | --- | --- |
| `git diff --check` | PASS | Target diff was clean before review artifact creation. |
| `node --test packages/wallet-core/test/*.mjs` | PASS | Public package, manifest, RN mock module, facade, and regression tests passed; two existing guarded cases were skipped. |
| `node scripts/test-browser-parity.mjs` | PASS | Chromium parity check passed; not a complete MV3 smoke. |
| `node scripts/test-npm-parity.mjs` | PASS | Node native/WASM and Chromium browser parity result was equal. |
| `./crates/c-abi/tests/run_c_abi_runtime.sh` | PASS | C ABI native library built and runtime caller completed successfully. |
| C ABI declaration comparison | PASS | Private RN header declarations matched the checked-in public types and 16 function signatures; comments/formatting differ. |
| `node scripts/test-release-evidence.mjs` | PASS | Deterministic release evidence/manifest tests passed with required local execution permission. |
| `node scripts/test-release-sbom.mjs` | PASS | Deterministic SBOM/license inventory tests passed. |
| `node scripts/test-release-license-policy.mjs` | PASS | Deterministic and negative policy tests passed. |
| `pnpm audit --json` | PASS | 0 info, low, moderate, high, and critical advisories in the available dependency graph. |
| `node scripts/test-npm-release.mjs` | FAIL / incomplete local fixture | Stopped because local `dist/native/artifact-manifest.json` had zero artifacts and no common toolchain identifier; no release PASS claimed. |
| `node scripts/test-npm-bundlers.mjs` | NOT VALIDATED | Clean-install helper failed with `ENOTDIR` while treating the Node executable path as an npm package. |
| Android Gradle/CMake build and runtime | NOT VALIDATED | Gradle/Android SDK/emulator tooling unavailable; IR-023 is established by static integration inspection. |
| iOS Xcode/Pods/device/simulator | NOT VALIDATED | Apple toolchain unavailable; provider/podspec static inspection only. |
| Formal four RN artifact build/load | NOT VALIDATED | No controlled Android `.so` or iOS XCFramework evidence was available. |
| Full Chromium MV3 runtime smoke | NOT VALIDATED | Browser parity is weaker than extension installation/runtime evidence. |
| Dependabot API query | NOT VALIDATED | GitHub CLI token invalid and alert details unavailable. |

The first local attempts that invoked Node child processes were blocked by the sandbox's `EPERM` policy;
the relevant release/test commands were rerun with the required local execution permission. Those
environment errors are not reported as implementation passes.

## Review Gates

| Gate | Result | Basis |
| --- | --- | --- |
| 1. Specification conformance | **REVISE** | IR-023, IR-024, IR-025, and IR-026 are direct violations of approved RN contracts. |
| 2. Security | **REVISE** | Stale secret-bearing output copy and unverified native artifact identity/provenance remain open. |
| 3. Interoperability | **REVISE / DEFERRED** | Existing C ABI path passes, but no Android/iOS native load/invoke or formal ABI artifacts were verified. |
| 4. Abnormal conditions / fail-closed | **REVISE** | Formal empty release rejects, but candidate incompleteness and weak native identity validation remain. |
| 5. Test sufficiency | **NOT READY** | Platform, artifact, MV3, and clean package release evidence are not available; no unverified area is treated as PASS. |
| 6. Implementation quality / boundary | **REVISE** | Android integration and lifecycle identity are incomplete despite a coherent JS/C++ facade shape. |

Overall gate: **REVISE IMPLEMENTATION**. The implementation must not be marked READY or used as formal
RN release evidence until the HIGH findings are closed and the deferred platform evidence is collected.

## Remaining Risks and Open Decisions

- The exact Android registration file layout is intentionally not fixed by the Specification, but a
  working New Architecture provider registration and linked ABI artifacts are mandatory.
- The iOS provider and podspec are structurally present, but static inspection cannot establish link,
  slice, symbol, or runtime identity.
- The C++ adapter uses a process-wide mutex, but this does not substitute for runtime/context/request
  identity and teardown barriers.
- The webpack update is observed and `pnpm audit` is clean in this environment; the four reported
  GitHub low alerts remain unmapped until authenticated Dependabot evidence is obtained.

## Automatic Changes

No implementation, specification, design, test, dependency, or existing review file was changed. This
artifact is the only intended new file. The pre-existing uncommitted Concept Review change was left
untouched.

## Final Decision

**REVISE IMPLEMENTATION**

Close IR-023 through IR-026, obtain the Android/iOS/MV3/artifact evidence listed above, and complete
the Dependabot follow-up before requesting a new formal Implementation Review.

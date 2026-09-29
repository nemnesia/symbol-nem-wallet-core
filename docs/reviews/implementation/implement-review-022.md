# Implementation Re-review 022 — React Native Support Final Closure

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/react-native-support`
- Reviewed HEAD: `7cd1af89e8f015449b47f297b5610682fc73b4e8`
- Review date: 2026-09-29 (JST)
- 成果物: `docs/reviews/implementation/implement-review-022.md`
- Previous review authorities: `implement-review-019.md`, `implement-review-020.md`, `implement-review-021.md`
- Review scope: final React Native implementation closure, focused re-check of IR-024 and IR-026 plus release-blocking regression evidence.
- Unconfirmed scope: physical Android arm64 device, physical iOS arm64 device, RN 0.86.x compatibility line, Expo SDK 57 Development Build / Prebuild, and §23 production-equivalent responsiveness/resource observations. These are not silently counted as passed and do not create a new implementation defect without negative evidence.

## Execution Audit

- Reviewer A / specification-conformance path: previous completion conditions, current RN specification, locked iOS producer inputs, release workflow and final package gates.
- Reviewer B / security path: runtime/provider registration, invalidation, stale-completion rejection, delivery barrier, cleanup ordering and secret-bearing output paths.
- Reviewer C / interoperability path: canonical RN targets, XCFramework, provenance/manifest gates, Node/WASM/browser non-regression and clean consumers.
- Reviewer D / test-quality path: Pod graph negative tests, lifecycle markers, reload/re-admission, stale-completion gate and full RC result.
- Chair integration: completed. No sub-agents were used.

## Evidence Used

| Evidence | Purpose / result |
| --- | --- |
| `implement-review-019.md` / `020.md` | IR-024 / IR-026 prior HIGH completion conditions |
| `docs/specifications/react-native.md` | normative RN lifecycle, producer, artifact and fail-closed contracts |
| `integration/react-native/consumer/Gemfile.lock` | source-controlled exact Ruby dependency graph |
| `integration/react-native/consumer/ios/Podfile.lock` | source-controlled resolved CocoaPods graph |
| `scripts/react-native-pod-lock.mjs` | canonical digests, CocoaPods 1.16.2 and RN 0.87.0 graph validation |
| `scripts/test-react-native-pod-lock.mjs` | missing/mutated/version/metadata/checksum negative tests |
| `packages/wallet-core/cpp/RnLifecycleCoordinator.cpp` | registration generation, invalidation, delivery barrier and stale gate |
| Android/iOS lifecycle adapters | actual ReactHost/RCTHost/runtime/context/provider hooks |
| GitHub Actions run `36515394421` | full RC validation at reviewed HEAD: all 23 jobs SUCCESS |

## Review Result

`READY`

## Summary

The two previously blocking HIGH findings are closed. IR-024 now has repository-controlled Ruby/CocoaPods inputs, an exact source-controlled Pod graph, digest/version validation, mutation rejection, target-specific native artifacts, XCFramework inspection and final package/provenance validation. IR-026 now binds admission to actual RN lifecycle identities, retires prior registrations under the delivery barrier, rejects stale output-bearing completion, performs exactly-once cleanup, and exercises actual Android/iOS reload/re-admission paths in the RC workflow.

The final RC workflow completed all 23 jobs, including Android arm64-v8a/x86_64, iOS arm64/simulator, XCFramework integration, Core/C ABI, native/WASM parity, final npm assembly, browser/MV3 and Node 22/24 clean tarball consumers. No new formal implementation finding was confirmed.

## Finding Status

| ID | Severity | Status | First review | Current basis |
| --- | --- | --- | --- | --- |
| IR-023 | HIGH | Resolved | 017 | previously resolved; no regression observed |
| IR-024 | HIGH | Resolved | 017 | frozen producer inputs/Pod graph, negative validation and successful RC evidence |
| IR-025 | HIGH | Resolved | 017 | previously resolved; no regression observed |
| IR-026 | HIGH | Resolved | 017 | actual RN lifecycle/reload/re-admission, stale rejection and cleanup evidence |
| IR-027 | LOW | Deferred / non-blocking | 017 | unchanged; outside this release-blocking closure |

## Required Changes

なし。

## Optional Improvements

なし。

## Resolved Findings

### IR-024 — iOS producer reproducibility and release evidence

The branch now source-controls `Gemfile.lock` and `ios/Podfile.lock`; `react-native-pod-lock.mjs` pins and validates canonical Podfile/lock digests, CocoaPods 1.16.2 and the RN 0.87.0 graph. Negative tests reject missing or mutated graph inputs. The successful RC run produced and inspected both iOS slices and the XCFramework before final npm assembly. Completion condition satisfied.

### IR-026 — actual React Native lifecycle identity, invalidation barrier and stale completion cleanup

Current code registers actual platform lifecycle identities, assigns a monotonic provider generation, retires replacement registrations while holding the delivery barrier, binds Android registration to the actual JSI runtime, and rejects inactive/retired/mismatched runtime requests. Integration exercises actual reload/re-admission and requires `LIFECYCLE_RELOAD_REQUESTED`, `LIFECYCLE_RELOAD_COMPLETED`, `STALE_COMPLETION_REJECTED`, `CLEANUP_PASS:EXACTLY_ONCE`, runtime replacement and provider-generation replacement. Android x86_64 and iOS simulator lifecycle gates passed in the final RC run. Completion condition satisfied.

## Upstream Feedback

なし。

## Deferred Findings

- IR-027 remains LOW / Deferred / non-blocking.
- Physical Android arm64 and physical iOS arm64 runtime execution were not independently observed in this review.
- RN 0.86.x compatibility and Expo SDK 57 Development Build / Prebuild evidence were not independently observed.
- Specification §23 production-equivalent responsiveness/resource observations remain a release-evidence lane. No negative evidence was identified that triggers the async/exclusion decision gate.

## Scope and Traceability

| Contract / boundary | Implementation/evidence | Result |
| --- | --- | --- |
| frozen iOS producer graph | Gemfile.lock, Podfile.lock, validator/negative tests | PASS |
| canonical RN artifacts | Android arm64/x86_64, iOS arm64/simulator, XCFramework | PASS |
| actual runtime/provider lifecycle | platform adapters + RnLifecycleCoordinator | PASS |
| stale result fail-closed | delivery barrier + stale rejection marker | PASS |
| cleanup | exactly-once cleanup marker | PASS |
| public API/non-regression | parity + final package + clean consumers | PASS |
| browser/extension | browser bundler and MV3 integration | PASS |

## Domain Checks

| Domain | Result | Basis |
| --- | --- | --- |
| Specification Conformance | PASS for reviewed closure scope | IR-024/026 completion conditions evidenced |
| Test Evaluation | PASS | negative Pod graph tests, actual lifecycle integration and full RC gates |
| Security | PASS | stale rejection, actual runtime binding, invalidation barrier and cleanup evidence |
| Interoperability | PASS | canonical ABI/slices and maintained consumer surfaces passed |
| Abnormal paths | PASS | graph mutation, stale completion, reload/replacement and fail-closed gates |
| Implementation quality / memory safety | PASS for reviewed paths | no new UAF/double-free/secret-delivery defect confirmed |
| Types/dependencies/public compatibility | PASS | no public 16-function facade regression; clean consumers pass |

## Validation Results

| Validation | Result |
| --- | --- |
| GitHub Actions RC run `36515394421` | PASS — 23/23 jobs SUCCESS |
| Core and C ABI maintained CI | PASS |
| Native / WASM / npm parity regression | PASS |
| Android arm64-v8a RN artifact | PASS |
| Android x86_64 RN artifact + lifecycle | PASS |
| iOS arm64 RN artifact | PASS |
| iOS simulator arm64 + lifecycle | PASS |
| XCFramework assembly/inspection | PASS |
| Final npm RC assembly | PASS |
| Browser bundler / MV3 | PASS |
| Linux/macOS/Windows Node 22/24 clean consumers | PASS |
| Physical devices / RN 0.86.x / Expo 57 / §23 production measurements | NOT OBSERVED |

## Review Gates

| Gate | Result | Basis |
| --- | --- | --- |
| 1. Specification conformance | PASS | IR-024/026 closure conditions satisfied for reviewed scope |
| 2. Security | PASS | actual lifecycle invalidation, stale rejection, cleanup and fail-closed delivery evidence |
| 3. Interoperability | PASS | canonical artifacts and maintained consumers pass |
| 4. Abnormal paths | PASS | mutation/reload/stale/fail-closed paths exercised |
| 5. Test sufficiency | PASS | prior blocking gaps now have integration/negative evidence |
| 6. Implementation quality / memory safety | PASS | no release-blocking defect confirmed in reviewed paths |

## Remaining Risks and Open Decisions

IR-027 and explicitly deferred physical-device/version/Expo/performance evidence remain outside this closure decision and must not be represented as validated until separately executed. No open CRITICAL or HIGH implementation finding remains for the reviewed React Native closure scope.

## Automatic Changes

なし。レビュー対象コード、仕様、テスト、README、workflow は変更していない。本レビュー成果物のみ新規追加する。

## Final Decision

`READY`

IR-024 and IR-026 are Resolved. IR-023 and IR-025 remain Resolved. IR-027 remains LOW / Deferred / non-blocking. The React Native implementation at `7cd1af89e8f015449b47f297b5610682fc73b4e8` satisfies the Implementation Review gate for the reviewed closure scope and can proceed to the next release/merge gate.

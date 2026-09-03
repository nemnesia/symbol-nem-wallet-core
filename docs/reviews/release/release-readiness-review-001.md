# Release Readiness Review 001

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/monorepo-migration`
- Target commit: `439402f9ef8ee4ebdb072958de425fea26c025d6`
- 確認日: 2026-09-03 (JST)
- Artifact intended path: `docs/reviews/release/release-readiness-review-001.md`
- Target: repository-wide composite release target
  - Rust Core
  - npm TypeScript facade
  - Node-API native distribution
  - canonical WASM
  - Native C ABI release assets
  - SPDX SBOM / license inventory / strict license policy / third-party text evidence
  - npm Trusted Publishing / OIDC / provenance
  - unified release-record
  - durable GitHub Release publication
  - retry / recovery
- Production release status at review start: HOLD
- 未確認範囲:
  - production tag / npm 0.1.0 publish / GitHub Release は未実施
  - exact final HEAD Phase E matrix は未実施
  - GitHub Environment / npm Trusted Publisher の外部設定はユーザー提示済み状態を前提とする
  - npm registry bootstrap/dist-tag state はユーザー提示済み状態を引き継ぐ

## Execution Audit

Reviewer A〜D の独立 self-review pass と Chair integration を実施した。

- Reviewer A — Public contract / Documentation
- Reviewer B — Metadata / Package / Artifact
- Reviewer C — Version / Compatibility / Distribution contract
- Reviewer D — Validation / Supply chain / Release operation
- サブエージェントは使用していない。
- review target の source / docs / workflow / registry を変更していない。
- complete release matrix の手動 rerun は行っていない。

## Evidence Used

| Evidence | 用途 |
| --- | --- |
| root/package JA/EN README | public distribution / API / runtime / security contract |
| `packages/wallet-core/package.json` | npm identity / metadata / exports / engines / files |
| `packages/wallet-core/src/index.d.ts` | TypeScript public API |
| `packages/wallet-core/src/node/index.mjs`, `index.cjs` | Node native/WASM routing と runtime validation |
| `packages/wallet-core/src/manifest.mjs` | native target / manifest / SHA-256 schema |
| `scripts/build-npm-package.mjs`, `package-contents.mjs`, package tests | package assembly / allowlist / npm pack contract |
| `scripts/c-abi-targets.mjs`, C ABI manifest/header/workflow evidence | 4 target C ABI set / ABI distribution |
| `scripts/release-identity.mjs` | tag / main / version / clean source / npm duplicate gate |
| `scripts/release-operation.mjs` | release bundle validation、OIDC boundary、workflow policy validator、retry evidence |
| `.github/workflows/release.yml` | identity → candidate → C ABI → release-record → publish → publication |
| `scripts/release-publication.mjs`, GitHub Release validator | durable exact asset set |
| `docs/migration/release-supply-chain-gate.md` | approved release / supply-chain decision |
| `docs/migration/release-operation-provenance.md` | Final RC implementation record |
| `docs/migration/release-license-policy.md`, third-party evidence manifest | SPDX/license/text policy |
| `CHANGELOG.md`, `LICENSE`, package LICENSE | release metadata / public hygiene |
| Current HEAD CI run 33745636454 | npm/native/WASM/browser/consumer/SBOM/license current evidence |
| Current HEAD C ABI run 33745636366 | 4-target C ABI current evidence |
| Current HEAD Rust/dependency jobs | quality / audit / Dependency Review current evidence |
| GitHub tag/release API | `v0.1.0` absent、GitHub Releases empty |

## Review Result

`NOT READY`

## Summary

Composite release implementation is substantially complete: version/source identity, npm metadata, four native targets, canonical WASM, C ABI archives, npm tarball allowlist, SPDX/license evidence, provenance capture, unified release record, exact durable asset assembly, duplicate-version recovery and current CI evidence are present.

However two release-blocking contract gaps remain.

1. The approved Node native integrity policy requires SHA-256 verification of the selected package-local `.node` bytes before load. The manifest contains `sha256`, but both ESM and CJS Node loaders validate only manifest schema/path and then load the artifact without comparing its actual bytes to `entry.sha256`.
2. The approved protected Environment policy says npm publish and GitHub Release upload are both connected to the protected release Environment. The implemented workflow attaches `environment: release` only to `publish`; `publication` has `contents: write` but no Environment. The deterministic workflow validator and implementation document explicitly codify this drift.

README parity review additionally reports `RM-004` for the root English README. This is referenced rather than duplicated as an RL finding.

Therefore production release remains HOLD. Full matrix rerun would not repair these contract gaps and should not be performed until corrections are complete.

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| RL-001 | Major | New | `release-readiness-review-001` | selected native artifact SHA-256 is never checked by Node ESM/CJS loader before `require` |
| RL-002 | Major | New | `release-readiness-review-001` | approved protected Environment contract covers GitHub Release upload, but publication job is unprotected and validator expects only publish to use Environment |

Cross-review dependency:
- `RM-004` WARN / New — root README EN release/C ABI semantic parity.

## Required Changes

### RL-001 — Node native runtime digest verification is missing

- Target:
  - `packages/wallet-core/src/node/index.mjs`
  - `packages/wallet-core/src/node/index.cjs`
  - related manifest / loader tests
  - public README wording as necessary
- Existing approved contract:
  selected native artifact must be checked in order:
  manifest entry → path/target → readable bytes → SHA-256 match → native load → initialization.
  SHA mismatch is fail closed and must not become WASM fallback.
- Observed implementation:
  - `artifact-manifest.json` records each artifact `sha256`.
  - `validateNativeManifest()` validates that the field is a 64-hex value.
  - ESM/CJS `loadNativeBackend()` selects the entry, resolves `entry.relative_path`, and invokes `require()` without hashing the file or comparing bytes with `entry.sha256`.
- Problem:
  the digest currently authenticates release/assembly evidence but is not enforced at the runtime loader boundary required by the approved policy.
- Impact:
  a replaced `.node` that remains loadable and API-compatible is not rejected merely because its bytes differ from the packaged manifest. Current fail-closed load tests do not establish the required digest boundary.
- Minimum correction:
  1. read/hash the exact selected `.node` bytes before native load;
  2. compare SHA-256 with `entry.sha256`;
  3. mismatch/read failure => `WalletCoreBackendInitializationError`;
  4. never fall back to WASM for a declared target digest mismatch;
  5. implement ESM/CJS parity;
  6. add negative test where the native bytes remain loadable but manifest digest is deliberately mismatched, proving digest mismatch itself blocks load;
  7. update README security/runtime wording to the implemented contract.
- Completion:
  static source inspection + deterministic negative test + affected Node/package tests PASS.

### RL-002 — GitHub Release publication is not directly protected by the approved release Environment

- Target:
  - `.github/workflows/release.yml`
  - `scripts/release-operation.mjs` workflow-boundary validator/tests
  - `docs/migration/release-operation-provenance.md`
- Existing approved contract:
  npm publish and GitHub Release upload are separated from normal CI and connected to the protected GitHub Environment; release write jobs use least privilege.
- Observed implementation:
  - `publish`: `environment: release`, `contents: read`, `id-token: write`.
  - `publication`: no Environment, `contents: write`.
  - `validateReleaseWorkflowBoundary()` requires exactly one `environment: release` match and identifies `publish` as the sole protected job.
  - implementation documentation table explicitly records `publication | なし | contents: write`.
- Problem:
  Final RC implementation / validation documentation drifted from the approved Stage 10 Environment policy.
- Impact:
  GitHub Release write operations are not directly subject to the Environment protection boundary specified by the approved release decision.
- Minimum policy-conforming correction:
  1. attach `publication` to `environment: release`;
  2. retain `contents: write` only in `publication`;
  3. keep `id-token: write` only in `publish`;
  4. update workflow boundary validator and negative tests to require Environment protection on both write-side jobs;
  5. update implementation documentation.
- Decision boundary:
  If a single Environment approval protecting only npm publish is preferred to avoid a second Environment deployment/approval, that would change the already approved policy and must be handled as `NEEDS USER DECISION`; it must not be silently substituted for the current contract.
- Completion:
  workflow structure / deterministic tests / implementation doc all agree with the approved policy.

## Optional Improvements

なし。

## Resolved Findings

なし。This is the first review using the RL finding series.

## Upstream Feedback

なし。The approved release policy is sufficiently explicit to identify RL-001 and RL-002 as implementation drift rather than upstream ambiguity.

## Deferred Findings

- `RM-004` is handled by README Review 003.
- exact final HEAD complete release matrix is deferred to Phase E after all findings are resolved.
- actual npm provenance and durable GitHub Release bytes are production-operation evidence and cannot exist before the production release; the release path and deterministic verification are reviewed here.
- npm bootstrap/dist-tag state is user-provided external evidence and is not mutated by this review.

## Scope and Traceability

| Surface | Primary evidence | Result |
| --- | --- | --- |
| Rust Core identity/version/license | Cargo manifests / current CI | PASS |
| npm package metadata | package.json / metadata validator / npm pack test | PASS |
| TypeScript public API | `index.d.ts`, package READMEs | PASS |
| Node supported targets | manifest + four-target CI | PASS |
| native/WASM routing | Node loader + consumer CI | PASS |
| native artifact runtime digest | manifest vs Node loader | FAIL RL-001 |
| canonical WASM | build assembly + CI | PASS |
| npm tarball contents | package allowlist + dry-run/current CI | PASS |
| C ABI target/archive contract | target table + C ABI CI | PASS |
| LICENSE / author / copyright | root/package LICENSE + package metadata | PASS |
| SPDX / license inventory / strict policy | scripts/docs/current CI | PASS at candidate level |
| third-party license text | checked-in evidence + formal gate implementation | final formal execution deferred to Phase E/release mode |
| tag/source/version binding | release identity gate | PASS design/implementation |
| OIDC/provenance path | release workflow / provenance validators | PASS design/implementation |
| protected Environment | Stage 10 decision vs workflow | FAIL RL-002 |
| durable asset set | publication assembler / validator | PASS mechanics; protection FAIL RL-002 |
| retry / recovery | existing-version + provenance / GitHub Release reconciliation | PASS |
| public documentation | README Review 003 | FAIL RM-004 |
| production tag/release state | GitHub API | PASS: v0.1.0 absent, no GitHub Release |

## Domain Checks

1. Target / release-set identification — PASS
2. Public documentation consistency — FAIL (`RM-004`)
3. Package / crate metadata — PASS
4. Public API / ABI / compatibility — PASS
5. Distribution contents — PASS based on current deterministic + CI evidence
6. Platform / runtime support — FAIL (`RL-001`)
7. Security / secret handling — FAIL (`RL-001`)
8. SBOM / license evidence — PASS at current candidate evidence; formal final text run deferred
9. Provenance / release identity — FAIL protected Environment portion (`RL-002`); OIDC/provenance identity otherwise PASS
10. Durable publication — FAIL protection boundary (`RL-002`); exact-set mechanics PASS
11. Retry / recovery — PASS
12. Validation evidence — current evidence PASS; Phase E exact final matrix NOT YET RUN by process
13. Public hygiene — FAIL only through `RM-004`; LICENSE/metadata otherwise PASS

## Validation Results

Current HEAD evidence observed without rerunning full matrix:

- Release candidate validation run `33745636454`: PASS.
  - four Node native targets built
  - canonical WASM built
  - native/WASM/npm parity PASS
  - final four-target npm assembly PASS
  - package / clean-install / fail-closed gates PASS
  - SPDX + license inventory PASS
  - Phase 4B license policy PASS
  - Node 22/24 clean tarball consumers PASS
  - Vite / webpack / esbuild / Browser / MV3 PASS
- C ABI release asset preparation run `33745636366`: PASS.
  - Windows x64 / macOS x64 / macOS arm64 / Linux x64 GNU assets PASS
  - static/dynamic consumer smoke PASS
  - exact C ABI aggregation PASS
- Rust quality / dependency audit / Dependency Review: PASS at current HEAD.
- formal release-only third-party text finalization in normal PR candidate run: SKIPPED as designed.
- Phase E exact final HEAD complete release matrix: NOT RUN.
- No production tag, npm production publish, dist-tag mutation, or GitHub Release was performed.

## Review Gates

| Gate | Result | Finding / note |
| --- | --- | --- |
| 1. Target / release-set identification | PASS | composite target discovered |
| 2. Public documentation consistency | FAIL | RM-004 |
| 3. Package / crate metadata | PASS | package/license/version metadata consistent |
| 4. Public API / ABI / compatibility | PASS | declarations / C ABI / routing contract consistent |
| 5. Distribution contents | PASS | allowlist, npm pack, C ABI aggregation evidence |
| 6. Platform / runtime support | FAIL | RL-001 |
| 7. Security / secret handling | FAIL | RL-001 runtime integrity boundary |
| 8. SBOM / license evidence | PASS WITH FINAL EXECUTION PENDING | formal final text gate reserved for final/release mode |
| 9. Provenance / release identity | FAIL | RL-002 Environment contract; provenance path itself PASS |
| 10. Durable publication | FAIL | RL-002 protection boundary; exact asset mechanics PASS |
| 11. Retry / recovery | PASS | recovered-existing + exact reconciliation path |
| 12. Validation evidence | NOT YET FINAL | current CI PASS; Phase E intentionally pending |
| 13. Public hygiene | FAIL | RM-004; metadata/license otherwise clean |

## Remaining Risks and Open Decisions

- Blocking:
  - RL-001
  - RL-002
  - RM-004
- NEEDS USER DECISION:
  - none if existing approved Environment policy is preserved.
  - only if changing that policy to protect `publish` but not `publication`.
- NEEDS USER ACTION:
  - none for Phase C itself.
  - after findings are fixed and re-reviewed, run the exact final HEAD complete release matrix once.
- Production release remains prohibited until Final Gate is READY.

## Automatic Changes

なし。

## Final Decision

`NOT READY`

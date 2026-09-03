# Release Readiness Review 002

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/monorepo-migration`
- Exact target HEAD: `ab1d071be31c78a33e68168c985a16c9fea2c293`
- Review date: 2026-09-03 (JST)
- Previous review artifact: [`release-readiness-review-001.md`](release-readiness-review-001.md)
- Applied skill: [`release-readiness-review`](../../../.agents/skills/release-readiness-review/SKILL.md)
- Review mode: repository-wide composite release readiness; Phase D remediation rereview
- Composite release target:
  - Rust Core crate
  - Native C ABI crate and four desktop release asset targets
  - Node-API native addon distribution
  - npm TypeScript facade and canonical WASM distribution
  - package/crate metadata, public API/ABI, package inventory, license and SBOM evidence
  - npm Trusted Publishing/OIDC/provenance path
  - unified release record and durable GitHub Release publication path
  - retry/recovery and release validation evidence
- Production release status: not executed; `v0.1.0` tag, npm `0.1.0`, and GitHub Release are absent.
- Phase E status: pending. The exact-final-HEAD complete release matrix and production release operation remain separate gates.
- Review boundary: independently verify `RL-001`, `RL-002`, the cross-review `RM-004`, and all release-readiness gates without changing source, README, workflow, specification, test, fixture, release policy, registry, tag, or remote release state.

## Execution Audit

The Chair performed four independent self-review passes and integrated them after contradiction checks.

- Reviewer A — Public contract / Documentation: root/package JA/EN, CHANGELOG, release docs, README security boundary, C ABI/native/WASM responsibility, release status, and deferred claims.
- Reviewer B — Metadata / Package / Artifact: Cargo/npm manifests, package exports/files, declaration, package-local build output, C ABI target metadata, package tests, and current CI artifact preparation evidence.
- Reviewer C — Version / Compatibility / Distribution contract: version equality, public API/ABI surface, Node ESM/CJS runtime routing, native/WASM fallback, target support, and C ABI vs Node-API separation.
- Reviewer D — Validation / Supply chain / Release operation: workflow trigger, Environment, permission boundary, OIDC/provenance, SBOM/license evidence, durable publication, retry/recovery, deterministic validators, external status, and CI evidence.
- No sub-agent was used; no unperformed agent execution is claimed.
- The initial local worktree was clean at the expected pre-review HEAD after `git pull --ff-only`; review-time source/workflow/README/manifest/specification/test/fixture changes were not made.
- No manual workflow rerun, full release matrix rerun, tag, publish, dist-tag mutation, GitHub Release creation, or PR operation was performed.

## Evidence Used

| Evidence | Use |
| --- | --- |
| `Cargo.toml`, `crates/*/Cargo.toml`, `Cargo.lock` | Rust/Core/Native/WASM/Node package identity, version, license, dependency and lockfile consistency |
| `packages/wallet-core/package.json`, `src/index.d.ts`, exports and package tests | npm identity, metadata, public API, types, files allowlist, engines and compatibility |
| Root/package JA/EN README, `CHANGELOG.md`, LICENSE files | Public documentation, distribution status, release claims, security boundary, license and hygiene |
| `packages/wallet-core/src/node/index.mjs`, `index.cjs`, `src/manifest.mjs` | Native target selection, exact bytes hashing, strict digest comparison, native load, initialization and fallback boundary |
| `packages/wallet-core/test/facade.test.mjs` and package/parity tests | ESM/CJS digest negative test, missing artifact failure, WASM fallback, public surface and runtime parity |
| `.github/workflows/release.yml`, `.github/workflows/node.yml`, `.github/workflows/c-abi-release.yml` | Release set, job/environment/permission split, candidate matrix, package/C ABI assembly and publication path |
| `scripts/release-operation.mjs`, `scripts/test-release-operation.mjs` | Deterministic workflow boundary, OIDC/provenance, permission, protected-job and retry/recovery validators with positive/negative tests |
| `docs/migration/release-operation-provenance.md` | Current implementation record for protected Environment, Node native integrity, provenance and durable publication |
| `docs/migration/release-supply-chain-gate.md`, `release-evidence-finalization.md` | Approved Stage 10 decisions, SBOM/license/provenance/durable publication boundaries and deferred process scope |
| `scripts/test-release-evidence.mjs`, `test-release-sbom.mjs`, `test-release-license-policy.mjs`, `test-third-party-license-evidence.mjs` | Deterministic release evidence, SBOM, license and third-party evidence validation |
| `scripts/test-c-abi-release.mjs`, `test-c-abi-sbom.mjs` | Four-target C ABI archive, header, SBOM and license policy validation |
| Current HEAD CI runs [`33754230082`](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33754230082), [`33754229897`](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33754229897), [`33754230025`](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33754230025), [`33754223779`](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33754223779), [`33754229888`](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33754229888), [`33754230340`](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33754230340) | Existing automatic CI evidence for package/native/WASM/browser, C ABI, Rust quality, CodeQL, dependency audit, and dependency review; all completed successfully |
| Read-only GitHub Environment API and repository tag/release API | `release` Environment, required reviewer rule, `main` / `v*` deployment policies, and absence of production tag/release |
| Read-only npm registry query | `@nemnesia/symbol-nem-wallet-core@0.1.0` is not published; no registry production evidence was created |

## Review Result

`READY`

## Summary

Both remediation findings are resolved in the current repository implementation. The Node ESM and CJS loaders validate the selected manifest entry, read the exact package-local native artifact bytes, calculate SHA-256, require strict equality with `entry.sha256`, then load the addon and initialize the facade. Missing/unreadable artifacts, digest mismatch, native load failure, and facade initialization failure fail closed as `WalletCoreBackendInitializationError`; a declared native failure is not converted to WASM fallback. The new negative test first proves the artifact is loadable, then changes only the manifest digest and proves both ESM and CJS reject it.

The release workflow now protects both `publish` and `publication` with the `release` Environment. `publish` has only `contents: read` and `id-token: write`; `publication` has only `contents: write`. Identity, candidate, C ABI, and release-record processing remain outside the protected Environment. The deterministic validator and its positive/negative tests enforce this boundary and reject provenance-disabled publish, extra Environment use, missing publication protection, and unnecessary token/write permissions.

The composite release target is therefore ready to enter Phase E's exact-final-HEAD complete release matrix. This is not a statement that production `v0.1.0` has been released or that external npm Trusted Publishing configuration has been independently proven by this review.

## Finding Status

| ID | Severity | Status | Initial review | Current status basis |
| --- | --- | --- | --- | --- |
| RL-001 | Major | Resolved | `release-readiness-review-001` | ESM/CJS source and generated loaders hash exact selected native bytes and compare strict SHA-256 before load; loadable-artifact/wrong-manifest-digest tests pass for both syntaxes. |
| RL-002 | Major | Resolved | `release-readiness-review-001` | `publish` and `publication` both use `release`; permissions and no-token policy match approved Stage 10; validator/docs/tests agree and pass. |

Cross-review `RM-004` is resolved by README Review 004 and is not duplicated as an RL finding.

New findings: none.

Unresolved count by severity: `Critical 0`, `Major 0`, `Minor 0`.

## Required Changes

なし。`Critical` / `Major` の New / Open / Reopened finding はない。

## Optional Improvements

なし。`Minor` の New / Open / Reopened finding はない。

## Resolved Findings

### RL-001 — Node native runtime digest verification

- Target: [`packages/wallet-core/src/node/index.mjs`](../../../packages/wallet-core/src/node/index.mjs#L36), [`index.cjs`](../../../packages/wallet-core/src/node/index.cjs#L36), manifest validation, and package tests.
- Verified sequence: manifest JSON/schema validation → runtime target selection → manifest entry selection → `resolve` of the validated package-local path → `readFileSync` of exact artifact bytes → `createHash("sha256")` → strict `actualSha256 !== entry.sha256` rejection → native `require` → facade initialization.
- Verified failures: `readJson`/manifest errors, missing selected artifact, unreadable artifact, digest mismatch, native load failure, and `createFacade` initialization failure produce `WalletCoreBackendInitializationError` with the generic message `backend initialization failed`; no secret or internal payload is included.
- Fallback boundary: only a valid target with no manifest entry, an unsupported target, or explicit `--no-addons` reaches package-local WASM. The digest mismatch negative test does not reach WASM.
- Negative test quality: `facade.test.mjs` first loads the current native artifact successfully in both ESM and CJS, changes only the selected `entry.sha256`, and then requires both forms to fail with `WalletCoreBackendInitializationError`. This demonstrates digest mismatch itself, rather than an invalid/broken binary, blocks load.
- Evidence: source inspection, rebuilt targeted package suite (`pnpm test:npm`, 19/19 tests), current HEAD release candidate CI package gate, and current ESM/CJS parity CI.
- Completion/reconfirmation: PASS; the failure path is identical in ESM and CJS and is documented as a loader-boundary control.

### RL-002 — Protected Environment for durable GitHub Release publication

- Target: [`release.yml`](../../../.github/workflows/release.yml#L145) `publish` and `publication` jobs; [`release-operation.mjs`](../../../scripts/release-operation.mjs#L569); [`test-release-operation.mjs`](../../../scripts/test-release-operation.mjs#L119); [`release-operation-provenance.md`](../../migration/release-operation-provenance.md#L36).
- Verified environment boundary: `publish.environment.name = release` and `publication.environment.name = release`; `identity`, `candidate`, `c-abi`, and `release-record` do not use the protected Environment.
- Verified permissions: `publish` has `contents: read` and `id-token: write`, without `contents: write`; `publication` has `contents: write`, without `id-token: write`. No `packages: write`, `actions: write`, or long-lived npm token reference is present in the production workflow.
- Verified validator: current validator requires exactly two `release` Environment job blocks, specifically checks both write-side jobs, rejects protected candidate/build jobs, checks one OIDC permission occurrence and one contents-write occurrence, and requires exactly one provenance-enabled `npm publish` command. Current deterministic tests include positive validation and negative cases for missing publication protection, extra Environment use, provenance-disabled publish, and altered workflow identity.
- External status: read-only GitHub API confirms Environment `release`, a required-reviewer protection rule, and deployment policies `main` and `v*`. The npm package version is not published, so the npm Trusted Publisher mapping cannot be independently observed from registry metadata; the current implementation record identifies the required external configuration.
- Completion/reconfirmation: PASS for the repository workflow/validator/documentation contract; external npm configuration confirmation and the production operation remain Phase E actions.

## Upstream Feedback

なし。The approved Stage 10 decision explicitly distinguishes runtime integrity and protected release publication, so both previous findings were objective implementation/documentation drift rather than upstream ambiguity.

## Deferred Findings

- Phase E exact-final-HEAD complete release matrix, formal release-mode license-text finalization, and production release operation are later process gates. They are intentionally not executed in Phase D.
- Actual npm provenance, registry attestation, durable GitHub Release asset bytes, and post-publication reconciliation require production publication and cannot be generated during this review.
- npm Trusted Publisher/OIDC external configuration must be confirmed before the Phase E production tag/publish operation. This is `NEEDS USER ACTION`, not an unresolved repository finding.
- Local `test-npm-release.mjs` was not a valid four-target release evidence source because the local targeted build contained one host native artifact; current HEAD CI supplied the four-target package-gate evidence.

## Scope and Traceability

| Release surface / gate | Primary evidence | Result |
| --- | --- | --- |
| Target / release-set identification | manifests, workflows, package/C ABI target tables | PASS |
| Public documentation consistency | README Review 004, README/CHANGELOG/release docs | PASS; RM-004 resolved |
| Package / crate metadata | Cargo manifests, package.json, package tests | PASS |
| Public API / ABI / compatibility | declarations, Node facade, C header, Rust/C ABI CI | PASS |
| Distribution contents | package allowlist, npm pack/package tests, current four-target CI package gate, C ABI aggregation CI | PASS |
| Platform / runtime support | target mapping, Node ESM/CJS loaders, native/WASM/package/browser CI | PASS; RL-001 resolved |
| Security / secret handling | README boundary, generic initialization error, no-token workflow, security/CodeQL/dependency evidence | PASS |
| SBOM / license evidence | SPDX/license scripts, third-party evidence, current candidate CI; formal final text step is release-mode deferred | PASS for current candidate gate |
| Provenance / release identity | release identity/provenance scripts, tag/version/source validators, OIDC workflow boundary | PASS for repository contract; external npm mapping pending Phase E confirmation |
| Durable GitHub Release publication | publication assembler, GitHub Release validator, protected publication job | PASS for implementation path; actual publication intentionally not executed |
| Retry / recovery | release identity `--allow-existing-version`, recovered-existing mode, exact asset reconciliation, deterministic release operation tests | PASS |
| Validation evidence | targeted local tests, current HEAD CI, explicit unexecuted production/full-matrix scope | PASS for Phase D review scope |
| Public repository hygiene | package contents/license checks, README/docs scan, absence of production artifacts | PASS |

## Domain Checks

| Domain | Result | Basis |
| --- | --- | --- |
| Version Assessment | PASS | Rust/C ABI/WASM/Node/npm versions are `0.1.0`; release identity and duplicate/version gates are present. |
| Documentation / Translation Parity | PASS | README Review 004 is READY; RM-004 resolved. |
| Package Metadata | PASS | Name, version, repository, license, exports, engines, files, and package tests agree. |
| API / ABI | PASS | 16 synchronous npm operations, TypeScript declaration, C header, ownership/free contracts, and CI agree. |
| Distribution | PASS | Four desktop C ABI target set, one canonical WASM, npm allowlist, and current CI package/C ABI evidence agree. |
| Platform | PASS | Windows x64 MSVC, macOS x64, macOS arm64, Linux x64 glibc target contracts and fallback behavior are consistent. |
| Security | PASS | Native digest is enforced before load; failures are generic/fail-closed; secret handling and supply-chain responsibility are not overclaimed. |
| SBOM / License | PASS | SPDX, inventory, strict policy, third-party evidence, and negative tests pass at candidate level; formal release-only finalization remains Phase E. |
| Provenance | PASS | OIDC-only publish and required provenance path are deterministic and documented; actual registry attestation is production evidence. |
| Durable Publication | PASS | Exact asset assembly, create/resume, missing-only upload, and verification path are implemented and publication is protected. |
| Retry / Recovery | PASS | Existing-version recovery avoids republish and rejects identity/asset mismatches. |
| Validation Evidence | PASS | Current HEAD CI is complete and successful; intentionally unexecuted Phase E operations are not claimed as passed. |
| Public Hygiene | PASS | No credential, token, secret, unsupported release claim, stale RM-004 wording, or public package contamination was found. |

## Validation Results

- `node scripts/test-release-operation.mjs`: PASS after rerun outside the sandbox restriction; includes workflow boundary, protected-job, permission, provenance, and retry/recovery checks.
- `node scripts/test-release-identity.mjs`, `test-npm-provenance.mjs`, `test-github-release.mjs`, `test-release-record.mjs`: PASS.
- `node scripts/test-release-evidence.mjs`, `test-release-sbom.mjs`, `test-release-license-policy.mjs`, `test-third-party-license-evidence.mjs`: PASS.
- `node scripts/test-c-abi-release.mjs`, `test-c-abi-sbom.mjs`: PASS.
- `pnpm test:npm`: PASS after rebuilding ignored package `dist` from current source. Package, manifest, API, ESM/CJS, WASM, browser parity, and the loadable-native/wrong-manifest-digest negative test passed (19 tests total).
- `node scripts/test-npm-release.mjs`: not counted as PASS locally; it correctly stopped because the local targeted package had one host native artifact rather than the four-target formal assembly. Current HEAD CI run `33754230082` passed the equivalent four-target package assembly and final package/fail-closed gate.
- Current HEAD CI, all with `headSha = ab1d071be31c78a33e68168c985a16c9fea2c293`:
  - `33754230082` Node-API addon smoke / release candidate validation: completed success; native/WASM/npm parity, four-target assembly, package/fail-closed gate, browser/bundler/MV3 and Node 22/24 consumers passed.
  - `33754229897` C ABI release asset preparation: completed success; four target archives, header/consumer smoke, aggregate asset set, SBOM/license evidence passed.
  - `33754230025` Rust quality: completed success; format, clippy, tests, WASM, C ABI runtime/sanitizer, and coverage jobs passed.
  - `33754223779` CodeQL, `33754229888` Rust dependency audit, `33754230340` Dependency review: completed success.
- Read-only external checks: `release` Environment exists with required-reviewer protection and `main`/`v*` deployment policies; GitHub tags/releases list is empty; npm query reports no published `0.1.0`.
- `git diff --check`: PASS before artifact creation.
- Full release matrix, workflow manual rerun, production tag, npm publish, GitHub Release publication, and dist-tag mutation: NOT RUN by explicit Phase D boundary.

## Review Gates

| Gate | Result | Basis / finding |
| --- | --- | --- |
| 1. Target / release-set identification | PASS | Composite Rust/npm/Node/WASM/C ABI/release evidence surface is uniquely discovered. |
| 2. Public documentation consistency | PASS | README Review 004 READY; RM-004 resolved. |
| 3. Package / crate metadata | PASS | Current manifests, lockfile, package tests, and CI agree. |
| 4. Public API / ABI / compatibility | PASS | Public declarations, facade, C ABI header/ownership, and compatibility evidence agree. |
| 5. Distribution contents | PASS | Allowlist, clean-install/package evidence, four-target CI assembly, and C ABI archive evidence pass. |
| 6. Platform / runtime support | PASS | RL-001 resolved; native digest/load/fallback behavior and target matrix are evidenced. |
| 7. Security / secret handling | PASS | Fail-closed runtime boundary, generic errors, no long-lived npm token, and security CI are consistent. |
| 8. SBOM / license evidence | PASS | Deterministic SBOM/license/third-party tests and current candidate CI pass; formal release-only finalization remains explicitly pending. |
| 9. Provenance / release identity | PASS | Version/tag/source/OIDC/provenance validators and workflow path agree; external Trusted Publisher configuration is a Phase E prerequisite. |
| 10. Durable publication | PASS | Exact GitHub Release asset path and protected `publication` job agree; actual publication is intentionally pending. |
| 11. Retry / recovery | PASS | Existing-version and partial-failure recovery is fail-closed and deterministically tested. |
| 12. Validation evidence | PASS | Current HEAD CI and targeted deterministic checks are complete; no unexecuted check is represented as success. |
| 13. Public hygiene | PASS | No new stale release statement, public secret, unsupported capability, or package contamination found. |

## Remaining Risks and Open Decisions

- No open release-readiness finding remains.
- This `READY` result means the remediation findings are resolved and the repository may proceed to the Phase E exact-final-HEAD complete release matrix. It does not authorize or assert production release completion.
- Phase E must confirm the npm Trusted Publisher/OIDC external mapping and protected Environment configuration at operation time, then execute the separately approved release procedure. The GitHub `release` Environment and its required reviewer/main/v* policies were read-only verified during this review.
- Actual npm provenance, registry attestation, durable GitHub Release assets, and post-publication reconciliation remain uncreated until production operation.
- `NEEDS USER DECISION`: none. The approved Stage 10 policy was not re-decided.
- `NEEDS USER ACTION`: yes — before Phase E production operation, confirm the external npm Trusted Publisher/OIDC mapping (package is not yet published) and then run the exact-final-HEAD complete release matrix. This is a process prerequisite, not an unresolved defect.

## Automatic Changes

なし。レビュー成果物の作成以外に source、README、workflow、specification、test、fixture、manifest、release policy、registry、tag、remote release state は変更していない。

## Final Decision

`READY`

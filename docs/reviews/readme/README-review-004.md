# README Review 004

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/monorepo-migration`
- Exact target HEAD: `ab1d071be31c78a33e68168c985a16c9fea2c293`
- Review date: 2026-09-03 (JST)
- Previous review artifact: [`README-review-003.md`](README-review-003.md)
- Applied skill: [`readme-review`](../../../.agents/skills/readme-review/SKILL.md)
- Review mode: README parity mode; Phase D remediation rereview
- Target README set:
  - [`README.md`](../../../README.md) — canonical / authoritative Japanese root README
  - [`README.en.md`](../../../README.en.md) — English root translation
  - [`packages/wallet-core/README.md`](../../../packages/wallet-core/README.md) — canonical / authoritative Japanese package README
  - [`packages/wallet-core/README.en.md`](../../../packages/wallet-core/README.en.md) — English package translation
- Review boundary: independent verification of `RM-001` through `RM-004`, including the README impact of `RL-001`; documentation, public contract, package metadata, runtime implementation, tests, and release documentation were inspected as supporting evidence.
- Phase E exact-final-HEAD complete release matrix: not run by process boundary.
- Production npm publish, tag creation, GitHub Release publication, dist-tag mutation, and release workflow rerun: not performed.

## Execution Audit

The Chair performed the three required independent self-review passes and integrated them after contradiction checks.

- Reviewer A — Factual / API accuracy: README package/crate names, installation, imports, 16-function public surface, types, runtime routing, C ABI metadata, version, license, and implementation were compared.
- Reviewer B — Onboarding / Examples / Links: installation, ESM/CJS quick start, root/package role split, examples, relative links, and package-local distribution path were checked.
- Reviewer C — Constraints / Security / Cross-language parity: JA/EN and root/package semantic parity, Symbol/NEM and Mainnet/Testnet boundaries, handoff/export/signing approval, native/WASM boundary, runtime digest behavior, release status, and deferred mobile scope were checked.
- No sub-agent was used; no unperformed agent execution is claimed.
- Review-time changes to README, source, workflow, manifest, specification, test, fixture, registry, or remote state were not made. The only later working-tree changes are the two review artifacts specified by the request.

## Evidence Used

| Evidence | Use |
| --- | --- |
| `README.md`, `README.en.md` | Root JA/EN public contract parity, C ABI distribution, supported desktop targets, mobile deferred scope, runtime integrity, OIDC/provenance boundary |
| `packages/wallet-core/README.md`, `README.en.md` | Package JA/EN parity, installation/import, API, runtime routing, failure behavior, security boundary |
| `packages/wallet-core/package.json` | Package identity, version, exports, Node engine, files allowlist, license, repository metadata |
| `packages/wallet-core/src/index.d.ts` | Public TypeScript API and binary/error contracts |
| `packages/wallet-core/src/node/index.mjs`, `index.cjs`, `src/manifest.mjs` | Native target selection, manifest validation, exact-byte SHA-256 verification, load/failure behavior |
| `packages/wallet-core/test/facade.test.mjs`, `manifest.test.mjs`, `package.test.mjs`, `parity.test.mjs` | Runtime integrity negative test, manifest validation, package inventory, public API, ESM/CJS/WASM parity |
| `docs/specifications/npm-typescript-facade.md` | Approved facade and runtime integrity contract |
| `CHANGELOG.md`, `docs/migration/release-operation-provenance.md`, `docs/migration/release-evidence-finalization.md` | Release status, C ABI asset boundary, OIDC/provenance wording, deferred scope |
| `scripts/c-abi-targets.mjs`, Cargo manifests | Four desktop C ABI targets and package/crate metadata |
| Current HEAD CI runs `33754230082`, `33754229897`, `33754230025`, `33754223779`, `33754229888`, `33754230340` | Existing automated evidence for package, native/WASM, C ABI, Rust, CodeQL, dependency audit, and dependency review; all completed successfully |

## Review Result

`READY`

## Summary

The four README surfaces have the required semantic parity for the remediated public contract. Root JA/EN now agree that formal release C ABI archives/evidence for the four supported desktop targets are GitHub Release assets separate from the Node-API `.node` artifacts and npm package, that Android/iOS C ABI support is deferred to MosaicLynx integration, and that formal npm publishing uses GitHub Actions/OIDC with required npm provenance. The package JA/EN documents agree on native digest mismatch handling and the fail-closed boundary.

The runtime integrity wording is correctly scoped as a package/loader-boundary control. README text does not present provenance, SBOM, or Trusted Publishing as Core runtime security features. Existing `RM-001`, `RM-002`, and `RM-003` contracts remain present and consistent. No factual inconsistency, public API mismatch, unsupported capability claim, onboarding break, or new parity issue was found.

## Finding Status

| ID | Severity | Status | Initial review | Current status basis |
| --- | --- | --- | --- | --- |
| RM-001 | WARN | Resolved | `README-review-001` | Current root/package JA/EN still require explicit user handoff confirmation before generated Mnemonic finalization; no regression found. |
| RM-002 | WARN | Resolved | `README-review-001` | Current root README and package README retain C ABI ownership/free-function and failure-safe output guidance; no regression found. |
| RM-003 | WARN | Resolved | `README-review-001` | Current package README and runtime documentation retain package-local canonical WASM, package-root consumer path, and no remote-download contract; no regression found. |
| RM-004 | WARN | Resolved | `README-review-003` | Root JA/EN now have matching C ABI GitHub Release distribution, four desktop targets, Node-API distinction, Android/iOS deferred scope, and OIDC/provenance release-path meaning. |

New findings: none.

Unresolved count by severity: `ERROR 0`, `WARN 0`, `NIT 0`.

## Required Changes

なし。`ERROR` / `WARN` の New / Open / Reopened finding はない。

## Optional Improvements

なし。`NIT` の New / Open / Reopened finding はない。

## Resolved Findings

### RM-001 — Generated Mnemonic handoff confirmation

- Target: root/package README handoff sections and quick-start guidance.
- Verified fact: current README set requires the Application to present the complete generated Mnemonic and obtain current-user explicit confirmation before finalization; it does not permit inferred or reused confirmation.
- Basis: root README security-sensitive operation section; package README generated Mnemonic handoff section; public declaration and facade tests.
- Impact after remediation: the onboarding contract remains explicit and does not regress into automatic confirmation.
- Completion/reconfirmation: JA/EN semantic meaning matches and current package tests pass.

### RM-002 — C ABI onboarding and ownership contract

- Target: root README `Native C ABI` section.
- Verified fact: the public header, native integration package, caller-owned inputs, binding-owned outputs, corresponding free APIs, static error strings, and failure-safe empty outputs remain documented.
- Basis: root README C ABI section, `crates/c-abi/include/symbol_nem_wallet_core.h`, C ABI metadata, and current C ABI CI.
- Impact after remediation: no ownership or package-boundary regression was introduced.
- Completion/reconfirmation: JA/EN describe the same C ABI responsibility boundary; current C ABI preparation and Rust quality runs pass.

### RM-003 — WASM consumer path and distribution boundary

- Target: root/package README runtime and WASM sections.
- Verified fact: consumers use the npm package root; package-local canonical WASM is used for Browser and allowed fallback paths; raw generated modules/assets are not public subpaths; remote download and install-time build are not part of the contract.
- Basis: both package READMEs, package exports/files metadata, facade/package tests, and current release candidate validation.
- Impact after remediation: no regression in the documented consumer path or fallback boundary.
- Completion/reconfirmation: current package and browser/WASM parity validations pass.

### RM-004 — Root JA/EN release, C ABI, and security contract parity

- Target: [`README.md`](../../../README.md#L228), [`README.en.md`](../../../README.en.md#L228), and their security sections at line 287.
- Verified fact: both root documents state that C ABI is separate from the Node-API `.node` artifact and npm API, formal releases retain four desktop C ABI archives/evidence as GitHub Release assets, Android/iOS support is deferred to MosaicLynx integration, and formal npm publishing follows GitHub Actions/OIDC/required provenance. Both also state that native SHA-256 verification is a loader-boundary control and that provenance/SBOM/Trusted Publishing are not Core runtime security features.
- Basis: current root README pair, `CHANGELOG.md`, `docs/migration/release-operation-provenance.md`, `.github/workflows/release.yml`, Node loader source, and current CI.
- Impact after remediation: the English root README no longer gives a stale or incomplete release/distribution meaning to English consumers.
- Completion/reconfirmation: semantic parity is present without requiring literal translation; package README parity and current package tests pass.

## Upstream Feedback

なし。Current README defects were remediation/documentation drift, not an unresolved Requirements, Design, or Specification ambiguity.

## Deferred Findings

- Phase E exact-final-HEAD complete release matrix remains a later process gate and is not a README finding.
- Actual npm provenance and durable GitHub Release bytes require the production release operation and were not created in this review.
- External npm Trusted Publisher configuration is not independently observable while the package version is unpublished; confirmation is retained as a Phase E external-configuration action, not as a README defect.

## Scope and Traceability

| Public contract | Root JA | Root EN | Package JA | Package EN | Supporting source/evidence | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Package name/install/import | Present | Present | Present | Present | `package.json`, package tests | PASS |
| 16 synchronous functions / DTOs | Present | Present | Present | Present | `src/index.d.ts`, facade/package tests | PASS |
| Uint8Array and ownership | Present | Present | Present | Present | declaration, facade runtime, tests | PASS |
| Native preferred / WASM fallback | Present | Present | Present | Present | Node loaders, manifest, package tests | PASS |
| Declared native failure fail closed | Present | Present | Present | Present | Node loaders, facade negative tests | PASS |
| Native exact-byte SHA-256 control | Present | Present | Present | Present | Node loaders, specification, `pnpm test:npm` | PASS |
| C ABI vs Node-API artifact boundary | Present | Present | Package scope not required | Package scope not required | C ABI metadata, release docs | PASS |
| Four desktop C ABI durable distribution | Present | Present | Package scope not required | Package scope not required | `c-abi-targets.mjs`, workflow, changelog | PASS |
| Android/iOS deferred scope | Present | Present | Package scope not required | Package scope not required | changelog, release docs | PASS |
| OIDC / npm provenance release path | Present | Present | Runtime security scope only | Runtime security scope only | release workflow/docs | PASS |
| Provenance/SBOM/Trusted Publishing not Core runtime security | Present | Present | Present | Present | README security sections | PASS |
| License / public links / release status | Present | Present | Present | Present | package metadata, LICENSE, CHANGELOG | PASS |

## Domain Checks

| Domain | Result | Basis |
| --- | --- | --- |
| Documentation / onboarding | PASS | Install, import, quick start, package/root role split, and public API path are usable and consistent. |
| Examples | PASS | Examples use environment inputs, correct package/API names, explicit replacement Store handling, and Application-side confirmation/approval placeholders. |
| Links | PASS | Reviewed relative and repository links resolve to present repository paths or public repository pages. |
| Constraints | PASS | Symbol/NEM, Chain/Network, supported desktop targets, mobile deferred scope, and unsupported/fallback boundaries are not conflated. |
| Security | PASS | Secret handling, approval responsibility, loader digest enforcement, fail-closed behavior, and Core-vs-supply-chain boundary are accurately scoped. |
| Translation / Cross-document Parity | PASS | Root JA/EN and package JA/EN share the required public facts and contract meaning. |

## Validation Results

- Static parity and source/manifest/specification cross-review: PASS.
- `node scripts/test-release-operation.mjs`: PASS.
- `node scripts/test-release-identity.mjs`, `test-npm-provenance.mjs`, `test-github-release.mjs`, and `test-release-record.mjs`: PASS.
- `node scripts/test-release-evidence.mjs`, `test-release-sbom.mjs`, `test-release-license-policy.mjs`, and `test-third-party-license-evidence.mjs`: PASS.
- `node scripts/test-c-abi-release.mjs` and `test-c-abi-sbom.mjs`: PASS.
- `pnpm test:npm` after rebuilding ignored package `dist` from current source: PASS, including 19 package/runtime/parity tests. The loadable-native-plus-wrong-manifest-digest negative test passed for both ESM and CJS, and the no-entry WASM fallback test passed.
- An initial direct test against pre-existing ignored `dist` failed the digest negative test because that generated loader predated the remediation. The stale generated output was not treated as HEAD evidence; it was rebuilt from current source, and the targeted suite then passed.
- `node scripts/test-npm-release.mjs` was not treated as a successful local validation: it requires the four-target assembled package, while the local targeted build intentionally contained only the host Linux native artifact. Current HEAD CI run `33754230082` passed the equivalent final four-target package gate.
- Current HEAD automatic CI: all six observed runs completed successfully. See the release review artifact for the complete run inventory. No workflow rerun was requested or performed.
- `git diff --check`: PASS before artifact creation.
- Phase E exact-final-HEAD complete release matrix: NOT RUN by explicit process boundary.

## Review Gates

| Gate | Result | Basis / finding |
| --- | --- | --- |
| 1. 正確性 | PASS | README facts match metadata, declarations, source, tests, and release docs. |
| 2. 利用可能性 | PASS | Install/import/quick-start path and root/package navigation are present. |
| 3. 制約の正確性 | PASS | Deferred mobile scope, runtime failure, fallback boundary, and security responsibility are explicit. |
| 4. 整合性 | PASS | README, public API, implementation, specification, test, license, and release docs agree. |
| 5. 構成 | PASS | First-use information is available in root/package sections without requiring internal implementation knowledge. |
| 6. Translation / multi-document parity | PASS | RM-004 is resolved; RM-001〜RM-003 show no regression. |

## Remaining Risks and Open Decisions

- No open README finding remains.
- The current review does not create production provenance, GitHub Release assets, or registry evidence.
- Phase E must use an exact final HEAD and execute the separate complete release matrix after this review artifact is accepted.
- `NEEDS USER DECISION`: none.
- `NEEDS USER ACTION`: none for the README gate. Phase E external configuration/operation is recorded as deferred process work, not a README defect.

## Automatic Changes

なし。レビュー成果物の作成以外に README、source、workflow、manifest、specification、test、fixture、registry、remote は変更していない。

## Final Decision

`READY`

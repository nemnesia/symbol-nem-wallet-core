# Release Readiness Review 003

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/monorepo-migration`
- Exact target HEAD: `dced3ccfa96ac1dc54fed1233e60c432b23b7651`
- Previous production source / `origin/main`: `09e6ff5629b09fa7867b4faa74a99aa73d681b0f`
- Existing production tag: `v0.1.0 -> 09e6ff5629b09fa7867b4faa74a99aa73d681b0f`
- Review date: 2026-09-04 (JST)
- Previous formal review: [`release-readiness-review-002.md`](release-readiness-review-002.md)
- Failed production workflow: [run 33763842399](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33763842399)
- Remediation commit: `dced3ccfa96ac1dc54fed1233e60c432b23b7651`
- Applied skill: [`release-readiness-review`](../../../.agents/skills/release-readiness-review/SKILL.md)
- Review mode: formal production release failure remediation rereview
- Composite release target: Rust Core, Native C ABI, WASM, Node-API/npm package, release evidence, SBOM/license evidence, OIDC/provenance, Environment boundary, and durable GitHub Release publication.
- Review boundary: independently verify the production identity-gate failure, the two-file remediation, RL-001/RL-002 carry-forward, RL-003 lifecycle, and release-readiness impact. No source, tag, registry, release, workflow run, or production artifact was changed.
- Not a release operation: exact-final-HEAD Phase E validation, tag recovery, npm publication, GitHub Release publication, and workflow rerun remain separate activities.

## Execution Audit

The Chair performed four independent self-review passes and integrated them after contradiction checks.

- Reviewer A — Public contract / Documentation: previous review carry-forward and release-status wording.
- Reviewer B — Metadata / Package / Artifact: differential confirmation that the remediation touched no package, crate, binding, API, ABI, or artifact assembly file.
- Reviewer C — Version / Compatibility / Distribution contract: source/tag/main identity, release version, npm path, and target HEAD change.
- Reviewer D — Validation / Supply chain / Release operation: failed production run, strict cleanliness gate, pipeline propagation, OIDC/provenance, Environment, retry/recovery, durable publication, and deterministic validators.
- No sub-agent was used; no unperformed agent execution is claimed.
- Start-state verification found a clean worktree, the expected branch and HEAD, and the expected `origin/main` and `v0.1.0` tag. The first local fetch attempt hit an SSH configuration permission error; the same fetch was successfully retried with the required external read-only access.
- No failed workflow rerun, release matrix, npm publish, provenance generation, GitHub Release operation, tag mutation, main update, or registry mutation was performed.

## Evidence Used

| Evidence | Use |
| --- | --- |
| `git status --short`, branch/HEAD/ref checks, and `git fetch origin --prune --tags` | Start state and immutable production refs |
| `git show dced3cc...` and `git diff 09e6ff.....dced3cc...` | Remediation boundary and changed-file confirmation |
| [`release.yml`](../../../.github/workflows/release.yml#L49) before and after remediation | Old failure pattern, fixed temporary evidence path, pipeline ordering, and unchanged downstream release path |
| [`release-identity.mjs`](../../../scripts/release-identity.mjs#L312) | Strict cleanliness semantics and identity validation |
| [`test-release-operation.mjs`](../../../scripts/test-release-operation.mjs#L168) | Static workflow contract, old/fixed cleanliness behavior, copy ordering, failure propagation, and existing release-operation checks |
| [`release-readiness-review-002.md`](release-readiness-review-002.md) | RL-001/RL-002 status and unchanged release surfaces carried forward |
| [production run 33763842399](https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33763842399), jobs and failed log | Historical production failure, skipped downstream jobs, and exact failure message |
| Read-only GitHub Release/tag APIs and npm registry query | Existing production partial-state audit |
| `node scripts/test-release-identity.mjs`, `node scripts/test-release-operation.mjs`, and `git diff --check` | Targeted remediation validation |

## Review Result

`READY`

## Summary

Production run `33763842399` failed at the identity gate because the pre-fix workflow started `tee release-identity.json` inside the checkout before `release-identity.mjs` ran its strict cleanliness check. The check correctly reported `release source checkout is not clean`; all downstream release jobs were skipped, so publication failed closed.

RL-003 is independently classified as `Major`: it made the production release path unusable and blocked candidate, provenance, and durable publication, but the failure occurred before publication and no incorrect release artifact or secret exposure was observed.

The remediation moves the pipeline capture to `$RUNNER_TEMP/release-identity.json`, keeps `set -euo pipefail`, and copies the evidence into the repository only after the identity pipeline succeeds. The strict cleanliness implementation and retry/recovery behavior were not weakened or changed. Static contract checks and deterministic cleanliness/copy-order tests pass. No additional release-readiness finding was found.

This result authorizes the next exact-final-HEAD release matrix only. It is not `READY FOR v0.1.0 RELEASE`: the release source HEAD has changed from `09e6ff...` to `dced3cc...`.

## Finding Status

| ID | Severity | Status | Initial review | Current status basis |
| --- | --- | --- | --- | --- |
| RL-001 | Major | Resolved | `release-readiness-review-001` | Previous review 002 confirmed strict SHA-256 verification in both Node loaders; the remediation diff does not touch that surface. |
| RL-002 | Major | Resolved | `release-readiness-review-001` | Previous review 002 confirmed protected `publish`/`publication` Environment boundaries and least-privilege permissions; the remediation diff does not alter them. |
| RL-003 | Major | Resolved | This review; production run `33763842399` | Temporary evidence capture preserves the clean gate, propagates pipeline failure, copies only after success, and passes deterministic regression/static checks. |

New findings: none.

Unresolved count by severity: `Critical 0`, `Major 0`, `Minor 0`.

## Required Changes

なし。`Critical` / `Major` の New / Open / Reopened finding はない。

## Optional Improvements

なし。`Minor` の New / Open / Reopened finding はない。

## Resolved Findings

### RL-001 — Node native runtime digest verification

`RL-001` remains `Resolved` by the previous formal review. The current remediation commit contains no change to the Node loader, manifest, package, or native runtime integrity path. The previous evidence and current differential review are sufficient for carry-forward; no unnecessary implementation rereview was performed.

### RL-002 — Protected Environment for durable GitHub Release publication

`RL-002` remains `Resolved` by the previous formal review. The current workflow diff is limited to the identity job's evidence capture. The `publish` and `publication` Environment blocks, OIDC permission boundary, provenance-required publish command, durable publication flow, and validator contract are unchanged and remain covered by the previous evidence and the current `test-release-operation.mjs` run.

### RL-003 — Production identity gate self-contaminated by evidence output

- Target: pre-fix [`release.yml`](../../../.github/workflows/release.yml#L49) at `09e6ff...`; current [`release.yml`](../../../.github/workflows/release.yml#L49-L66); [`release-identity.mjs`](../../../scripts/release-identity.mjs#L312-L324); and [`test-release-operation.mjs`](../../../scripts/test-release-operation.mjs#L168-L247).
- Confirmed pre-fix behavior: `node scripts/release-identity.mjs "${identity_args[@]}" | tee release-identity.json` created an untracked repository file before the identity command's `git status --porcelain=v1 --untracked-files=all --ignored=matching` check.
- Confirmed production impact: run `33763842399` passed identity deterministic tests, release-operation deterministic tests, and final evidence deterministic tests, then failed with `Release identity gate failed: release source checkout is not clean`. Candidate, C ABI, release-record, publish, and publication were skipped. The identity evidence upload was also skipped.
- Current remediation: `identity_tmp="$RUNNER_TEMP/release-identity.json"`; the identity command pipes only to that external path; `cp "$identity_tmp" release-identity.json` follows the successful pipeline.
- Strictness preserved: `release-identity.mjs` is unchanged by the remediation commit and still includes both untracked and ignored entries in the porcelain check. No clean-check deletion, forced `clean=true`, ignored/untracked exception, `release-identity.json` exception, or `.gitignore` workaround was introduced.
- Failure propagation preserved: `set -euo pipefail` remains in the workflow. The regression test proves a failing pipeline does not execute the subsequent copy.
- Recovery preserved: `--allow-existing-version`, `recovered-existing`, provenance capture/finalization, and GitHub Release reconciliation remain in the workflow and pass the existing release-operation validator/tests.
- Completion condition: PASS. The fixed path remains clean through identity validation, evidence is captured outside the checkout, evidence is copied only after success, and the workflow artifact path remains `release-identity.json`.

## Upstream Feedback

なし。The production log, pre-fix workflow, and strict identity implementation establish an objective implementation/workflow interaction defect; no upstream requirement, design, or specification ambiguity prevented this review.

## Deferred Findings

- Phase E exact-final-HEAD complete release matrix for `dced3ccfa96ac1dc54fed1233e60c432b23b7651`.
- Confirmation of external npm Trusted Publisher/OIDC mapping and the separately approved production operation.
- Phase F/tag recovery strategy for the existing `v0.1.0 -> 09e6ff...` tag. This review does not delete, move, recreate, or force-update the tag.
- Actual npm provenance, durable GitHub Release assets, environment approval, and post-publication reconciliation. These remain uncreated because no release operation was run.

## Scope and Traceability

The remediation diff from production main is exactly:

- `.github/workflows/release.yml`
- `scripts/test-release-operation.mjs`

`scripts/release-identity.mjs`, `scripts/release-operation.mjs`, `.gitignore`, manifests, package source, bindings, public APIs, README, SBOM/license implementation, and publication scripts were not changed by `dced3cc...`.

| Release surface / requested impact | Current evidence | Result |
| --- | --- | --- |
| Release identity | `release.yml` identity step; unchanged strict identity implementation; identity deterministic test | PASS; remediation verified |
| Source cleanliness | `git status` semantics in `release-identity.mjs`; old/fixed temp-repository assertions | PASS; strict gate retained |
| Tag/source/main binding | `release-identity.mjs`, `release-operation.mjs`, identity/operation deterministic tests | PASS for the unchanged contract; exact target binding is deferred to Phase E / release operation |
| OIDC/provenance path | Protected publish job, `npm publish --provenance`, provenance capture/finalization | PASS; unchanged, actual attestation deferred to production |
| Environment boundary | `publish` and `publication` use `release`; validator requires exactly those two jobs | PASS; unchanged |
| npm publish path | Identity registry status and single provenance-required publish branch | PASS; unchanged; npm `0.1.0` remains absent |
| Retry/recovery | `GITHUB_RUN_ATTEMPT` / `--allow-existing-version`, `recovered-existing`, provenance verification and finalize path | PASS; unchanged and revalidated |
| GitHub Release publication | Protected `publication` job and exact asset reconciliation | PASS; unchanged; no release exists |
| Deterministic validation | New static workflow/copy-order/cleanliness assertions plus existing release-operation checks | PASS |
| Unchanged product surfaces | Previous review 002 evidence; no relevant diff in Core, Node API, WASM, C ABI, npm package, public API, README, or SBOM/license implementation | Carry forward; no unnecessary rereview |

## Domain Checks

| Domain | Result | Basis |
| --- | --- | --- |
| Target / release-set identification | PASS | Composite release target remains uniquely identified; remediation changes only release workflow/test evidence handling. |
| Public documentation consistency | PASS (carry-forward) | Previous review 002 and associated documentation evidence remain applicable; no documentation diff. |
| Package / crate metadata | PASS (carry-forward) | No manifest, lockfile, package, or dependency change. |
| Public API / ABI / compatibility | PASS (carry-forward) | No Core, Node-API, WASM, Native C ABI, public header, or package API change. |
| Distribution contents | PASS (carry-forward) | No package/archive assembly or allowlist change; prior evidence remains applicable. |
| Platform / runtime support | PASS (carry-forward) | No target routing or runtime loader change; RL-001 remains resolved. |
| Security / secret handling | PASS | Strict cleanliness and fail-closed pipeline behavior are preserved; no secret is emitted by the remediation. |
| SBOM / License evidence | PASS (carry-forward) | No SBOM, license policy, inventory, or third-party evidence implementation change. |
| Provenance / release identity | PASS | Identity evidence is now captured outside the checkout; OIDC/provenance contract remains unchanged. Exact target/tag/main binding and actual production attestation are deferred to Phase E / release operation. |
| Durable publication | PASS (carry-forward) | Publication job, exact asset reconciliation, and protected Environment remain unchanged. |
| Retry / recovery | PASS | Existing-version recovery and provenance/GitHub Release reconciliation remain present and are covered by deterministic validator tests. |
| Validation evidence | PASS | Targeted identity/operation tests and diff checks pass; sandbox EPERM is classified as environment-only and not an assertion failure. |
| Public hygiene | PASS (carry-forward) | No public documentation, metadata, package contents, or release claim changed. |

## Validation Results

### Start-state verification

| Check | Result |
| --- | --- |
| `git status --short` | PASS; empty |
| `git branch --show-current` | `agent/monorepo-migration` |
| `git rev-parse HEAD` | `dced3ccfa96ac1dc54fed1233e60c432b23b7651` |
| `git rev-parse origin/main` | `09e6ff5629b09fa7867b4faa74a99aa73d681b0f` |
| `git rev-parse refs/tags/v0.1.0` | `09e6ff5629b09fa7867b4faa74a99aa73d681b0f` |
| `git fetch origin --prune --tags` | PASS after read-only external retry; refs matched expected values |

### Remediation validation

- `node scripts/test-release-identity.mjs`: PASS.
- `node scripts/test-release-operation.mjs`: initial local attempt stopped at `spawnSync tar EPERM` while creating an isolated tar fixture (`scripts/test-release-operation.mjs:137`). This was a sandbox subprocess permission failure, not a code assertion failure. No source or test change occurred between attempts. The same source was rerun with the sandbox restriction removed and returned `release operation deterministic tests passed`.
- `git diff --check 09e6ff... dced3cc...`: PASS.
- Remediation diff changed exactly the two expected files; `release-identity.mjs`, `.gitignore`, and all product/publication surfaces were unchanged.

### Production partial-state audit

| Production observation | Read-only evidence | Result |
| --- | --- | --- |
| Run identity | Run `33763842399`, `head_sha=09e6ff...`, attempt 1, completed failure | Confirmed |
| Identity deterministic tests | Job step succeeded | Confirmed |
| Release operation deterministic tests | Job step succeeded | Confirmed |
| Final evidence deterministic tests | npm provenance, GitHub Release, and release-record fixture tests succeeded | Confirmed |
| Identity validation | Failed with `release source checkout is not clean` | Confirmed |
| Downstream jobs | Candidate, C ABI, release-record, publish, and publication skipped | Confirmed |
| Identity artifact | Upload step skipped; run artifact list is empty | Confirmed absent |
| npm `0.1.0` | npm registry query returned E404 | Confirmed absent |
| npm provenance | Publish was skipped; no attestation was generated | Confirmed absent |
| GitHub Release | Release API for `v0.1.0` returned 404 | Confirmed absent |
| Environment approval | Protected publish/publication jobs were skipped | Not reached |
| Production assets | No run artifacts or durable release assets were created | Confirmed absent |

### Not validated / not run

- Exact-final-HEAD full release matrix, production workflow rerun, npm publish, provenance generation, GitHub Release creation, tag recovery, and post-publication reconciliation were not run by this review.
- Rust, Native C ABI, WASM, Node package, and full release matrix tests were not rerun because those surfaces were unchanged and the request specifically requires targeted remediation validation plus previous-evidence carry-forward. Their previous review evidence remains the applicable basis.

## Review Gates

| Gate | Result | Basis / finding |
| --- | --- | --- |
| 1. Target / release-set identification | PASS | Composite release set and exact remediation boundary are identified. |
| 2. Public documentation consistency | PASS | No documentation/public contract change; previous review carry-forward. |
| 3. Package / crate metadata | PASS | No metadata or dependency change; previous review carry-forward. |
| 4. Public API / ABI / compatibility | PASS | No API, ABI, binding, or compatibility change; previous review carry-forward. |
| 5. Distribution contents | PASS | No package/archive contents change; previous review carry-forward. |
| 6. Platform / runtime support | PASS | No runtime/target routing change; RL-001 remains resolved. |
| 7. Security / secret handling | PASS | Strict clean gate and fail-closed pipeline behavior remain intact. |
| 8. SBOM / license evidence | PASS | No evidence-generation implementation change; previous evidence carries forward. |
| 9. Provenance / release identity | PASS | Fixed identity evidence ordering; OIDC/provenance contract unchanged. RL-003 resolved. |
| 10. Durable publication | PASS | Publication path and Environment protection unchanged; actual publication remains deferred. |
| 11. Retry / recovery | PASS | Existing-version recovery, provenance verification, and release reconciliation remain present and tested. |
| 12. Validation evidence | PASS | Targeted tests and diff checks pass; sandbox EPERM is separately classified and not reported as a test assertion failure. |
| 13. Public hygiene | PASS | No public surface or release documentation contamination introduced. |

## Remaining Risks and Open Decisions

- No open release-readiness finding remains.
- `origin/main` and `v0.1.0` remain at `09e6ff...`; this review did not alter either ref.
- The remediation target is `dced3cc...`, so previous final-matrix evidence cannot be treated as exact-final-HEAD evidence for a new `v0.1.0` operation.
- `NEEDS USER DECISION`: approve the separate tag recovery strategy after Phase E / Phase F. No recovery choice is made here.
- `NEEDS USER ACTION`: confirm the external npm Trusted Publisher/OIDC mapping and execute the exact-final-HEAD Phase E complete release matrix at `dced3ccfa96ac1dc54fed1233e60c432b23b7651`. Only after those gates should the separately approved production recovery/release process be considered.

## Automatic Changes

なし。Requested review artifact のみを新規作成した。Source、workflow、test、fixture、manifest、README、tag、main、remote release state、registry、failed workflow run は変更していない。

## Final Decision

`RELEASE READINESS REREVIEW: READY`

`READY FOR NEW FINAL RELEASE MATRIX`

`PRODUCTION RELEASE REMAINS HOLD`

This review does not authorize tag recovery or production publication and does not mean `READY FOR v0.1.0 RELEASE`.

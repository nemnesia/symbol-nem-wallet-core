# README Review 003

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/monorepo-migration`
- Target commit: `439402f9ef8ee4ebdb072958de425fea26c025d6`
- Previous README Review: `docs/reviews/readme/README-review-002.md`
- 確認日: 2026-09-03 (JST)
- Artifact intended path: `docs/reviews/readme/README-review-003.md`
- Mode: README parity mode
- 対象:
  - `README.md` (canonical / authoritative JA)
  - `README.en.md`
  - `packages/wallet-core/README.md` (canonical / authoritative JA)
  - `packages/wallet-core/README.en.md`
  - root / package README 間の共有 public contract
- 未確認範囲:
  - production npm publish / GitHub Release は未実施
  - Phase E の exact final HEAD complete release matrix は未実施
  - npm registry state はユーザー提示状態を引き継ぎ、今回独立取得していない

## Execution Audit

Reviewer A〜C の独立 self-review pass と Chair integration を実施した。

- Reviewer A — Factual / API accuracy:
  package metadata、TypeScript declaration、Node routing、C ABI metadata、version、license を README と照合。
- Reviewer B — Onboarding / Examples / Links:
  install、ESM/CJS、quick start、root/package role split、公開 link と package-local distribution を確認。
- Reviewer C — Constraints / Security / Cross-language parity:
  JA/EN、root/package 間で runtime routing、security-sensitive operation、C ABI、release status、unsupported/deferred capability を比較。
- サブエージェントは使用していない。
- レビュー中に README、source、workflow、manifest、registry、remote state は変更していない。

## Evidence Used

| Evidence | 用途 |
| --- | --- |
| `README.md`, `README.en.md` | root JA/EN semantic parity、C ABI / release / security boundary |
| `packages/wallet-core/README.md`, `README.en.md` | package JA/EN parity、install / API / runtime / security |
| `packages/wallet-core/package.json` | package name、version、Node engine、conditional exports、files、license / author / repository |
| `packages/wallet-core/src/index.d.ts` | public types、DTO、16 functions、sync contract |
| `packages/wallet-core/src/node/index.mjs`, `index.cjs` | native/WASM routing、failure behavior |
| `scripts/c-abi-targets.mjs` | C ABI target set と glibc baseline |
| `crates/c-abi/Cargo.toml` | C ABI package identity / version |
| `CHANGELOG.md` | 0.1.0 release scope、C ABI target、Android/iOS deferred、supply-chain claims |
| `LICENSE`, `packages/wallet-core/LICENSE` | copyright / license |
| current PR CI evidence | package / consumer / browser / C ABI の既存実行 evidence。Phase E final matrix とは扱わない |

## Review Result

`REVISE README`

## Summary

package README の JA/EN は、package name、Node requirement、ESM/CJS、16-function synchronous API、DTO、binary type、native/WASM routing、no postinstall / remote download、handoff / export / signing approval、security boundary、error contract について semantic parity を維持している。

root README も大半は一致するが、canonical JA が Final RC 後の正式 release contract として記載している C ABI durable publication、Android/iOS deferred status、formal npm publish path が EN に反映されていない。特に EN C ABI section の `This README does not imply an unimplemented GitHub Release distribution.` は、現在の canonical JA / CHANGELOG が「formal release では C ABI assets を GitHub Release に保存する」としている状態と意味がずれている。

この差は翻訳表現差ではなく、public distribution / deferred capability / release path の契約差なので WARN とする。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| RM-001 | WARN | Resolved | `README-review-001` | generated Mnemonic handoff は現在も明示確認後のみ finalize する説明を維持 |
| RM-002 | WARN | Resolved | `README-review-001` | C ABI onboarding / ownership / free API の説明を維持 |
| RM-003 | WARN | Resolved | `README-review-001` | WASM consumer path は npm facade / package-local canonical WASM へ更新され、現実装と整合 |
| RM-004 | WARN | New | `README-review-003` | root EN が canonical JA の current release / C ABI / deferred contract を欠落または古い表現で記載 |

## Required Changes

### RM-004 — Root EN release / C ABI contract is stale relative to canonical JA

- 対象:
  - `README.md` — `Native C ABI` と `Security / sensitive data handling`
  - `README.en.md` — 対応する `Native C ABI` と `Security / sensitive data handling`
- 確認事実:
  - canonical JA は formal release で4 target C ABI archive/evidenceを npm package と分離した GitHub Release assets として保存すると記載する。
  - canonical JA は Android / iOS C ABI を `MosaicLynx integration` まで deferred と記載する。
  - canonical JA は formal npm publish を GitHub Actions / OIDC / npm provenance path に限定すると記載する。
  - EN は C ABI について `This README does not imply an unimplemented GitHub Release distribution.` と記載し、4-target durable publication と Android/iOS deferred を欠落させる。
  - EN security section も formal npm publish path の current fact を欠落させる。
- 問題:
  translation README が public distribution status、deferred platform scope、release path で canonical README と semantic / contractual parity を満たさない。
- 影響:
  英語利用者が C ABI の正式配布方法、mobile C ABI の current scope、production npm release path を canonical JA と異なる意味で理解できる。
- 必要な最小修正:
  1. EN `Native C ABI` を canonical JA と同じ current contract に更新する。
  2. 4 desktop target C ABI archives/evidence が formal GitHub Release assets であることを明記する。
  3. Android / iOS C ABI deferred status を明記する。
  4. EN security/release paragraph に formal npm publish が GitHub Actions / OIDC / provenance path に限定される current fact を反映する。
  5. 逐語訳ではなく semantic parity を維持する。
- 完了条件:
  JA/EN root README で C ABI distribution、deferred mobile scope、production publish path の意味が一致し、package README / CHANGELOG / release docs と矛盾しないこと。

## Optional Improvements

なし。

## Resolved Findings

RM-001〜RM-003 は current public contract に照らして Reopened する根拠を確認しなかった。

## Upstream Feedback

なし。今回の差は既存 release decision の不足ではなく translation の追随不足である。

## Deferred Findings

- exact final HEAD の complete release matrix は Phase E へ引き継ぐ。
- production registry / provenance / GitHub Release は production operation 未実施のため実体確認対象外。
- Release implementation の runtime digest / Environment boundary は Release Readiness Review 側の formal finding とする。

## Scope and Traceability

| Public contract | JA root | EN root | JA package | EN package | Implementation / metadata | 結果 |
| --- | --- | --- | --- | --- | --- | --- |
| package name / install | 一致 | 一致 | 一致 | 一致 | `package.json` | PASS |
| Node / browser entry | 一致 | 一致 | 詳細 | 詳細 | conditional exports | PASS |
| 16 sync functions / DTO | 一致 | 一致 | 詳細 | 詳細 | `index.d.ts`, Node facade | PASS |
| Uint8Array | 一致 | 一致 | 一致 | 一致 | declaration | PASS |
| native preferred / WASM fallback | 一致 | 一致 | 一致 | 一致 | Node loader | PASS |
| declared native failure fail closed | 一致 | 一致 | 一致 | 一致 | Node loader | PASS |
| no postinstall / remote download | rootは概説 | rootは概説 | 一致 | 一致 | package metadata / loader | PASS |
| handoff / export / signing approval | 一致 | 一致 | 詳細 | 詳細 | public contract | PASS |
| C ABI responsibility boundary | 一致 | 一致 | package scope外 | package scope外 | C ABI crate | PASS |
| formal C ABI durable distribution | current | stale/欠落 | scope外 | scope外 | release workflow/docs | FAIL RM-004 |
| Android/iOS deferred | current | 欠落 | scope外 | scope外 | CHANGELOG/release docs | FAIL RM-004 |
| formal npm OIDC/provenance path | current | 欠落 | runtime security非保証 | runtime security非保証 | release workflow | FAIL RM-004 |
| license / author | 一致 | 一致 | 一致 | 一致 | package.json / LICENSE | PASS |

## Domain Checks

- Documentation: PASS except RM-004
- Examples: PASS
- Links: PASS in reviewed public paths
- Constraints: PASS except RM-004 deferred scope parity
- Security: PASS except RM-004 release-path parity
- Translation / Cross-document Parity: FAIL — RM-004

## Validation Results

- Static cross-document review: PASS except RM-004.
- Current package metadata / declaration / routing source inspection: PASS.
- Current HEAD automatic PR CI evidence:
  native/WASM/npm parity, four-target npm assembly, Node 22/24 consumers, browser/bundlers and C ABI preparation are successful.
- Phase E complete release matrix: NOT RUN by explicit process rule.
- No review-time source or README mutation performed.

## Review Gates

| Gate | Result | 根拠 |
| --- | --- | --- |
| 1. 正確性 | FAIL | RM-004 |
| 2. 利用可能性 | PASS | install / quick start / package consumer path は成立 |
| 3. 制約の正確性 | FAIL | RM-004 mobile deferred / release distribution |
| 4. 整合性 | FAIL | RM-004 canonical JA vs EN |
| 5. 構成 | PASS | root overview / package consumer detail の分担は妥当 |
| 6. Translation / multi-document parity | FAIL | RM-004 |

## Remaining Risks and Open Decisions

- `RM-004` の修正が必要。
- NEEDS USER DECISION: なし。
- Phase E final validation は finding 修正後まで実行しない。

## Automatic Changes

なし。

## Final Decision

`REVISE README`

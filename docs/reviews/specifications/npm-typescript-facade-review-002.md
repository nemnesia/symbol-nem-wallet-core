# npm / TypeScript Facade Specification Review 002

## Review Target

| 項目 | 内容 |
| --- | --- |
| Reviewed commit | `f98a67f` |
| Canonical Specification | [`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md) |
| Review date | 2026-09-23 (Asia/Tokyo) |
| Review scope | 単一 npm package、公開 TypeScript facade、Node / Browser / React Native の runtime routing、error / secret boundary、package assembly、検証可能性 |
| Related Specifications | [`react-native.md`](../../specifications/react-native.md)、[`specification.md`](../../specifications/specification.md)、[`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) |
| Unverified scope | 実装、package tarball、native / WASM / React Native artifact、runtime test、device test、release evidence |

## Execution Audit

`spec-review` と review-common policy を適用し、サブエージェントを使用せず、次の3観点を独立して確認した。

1. Reviewer A: 公開 API、DTO、型、error、routing、fallback、package inventory の契約の明確性と完全性
2. Reviewer B: Mobile を含む v1 scope、単一 package、利用経路、失敗時の外部結果、既存 runtime 非退行の運用適合性
3. Reviewer C: secret exposure、Binding non-authority、fail-closed、artifact integrity、runtime 間の相互運用性と検証可能性

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| ユーザー判断 | 2026-09-23 の明示判断 | Mobile（React Native Android / iOS）を v1 対象とする方針を確認 |
| 主対象 | [`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md) §1〜§21 | 公開 facade、runtime routing、error、artifact、package assembly の契約を確認 |
| 対象差分 | commit `f98a67f` とその親の対象ファイル差分 | 日本語表現の整理による契約意味の維持を確認 |
| 上流 | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md) | Mobile を含む v1 scope、単一 package、共通 Core、Binding non-authority、受け入れ条件を追跡 |
| 前段レビュー | [`concept-sheet-review-015.md`](../concept/concept-sheet-review-015.md)、[`requirements-review-014.md`](../requirements/requirements-review-014.md) | 上流 Gate がともに `READY` で、未解決 Critical がないことを確認 |
| Design | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md) | runtime 分離、依存方向、secret ownership、failure boundary を追跡 |
| Design レビュー | [`architecture-review-004.md`](../design/architecture-review-004.md)、[`bindings-review-004.md`](../design/bindings-review-004.md)、[`security-review-004.md`](../design/security-review-004.md) | 3件がすべて `READY` で、未解決 Critical がないことを確認 |
| 承認済み判断 | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) | React Native / Android / iOS / New Architecture / Expo の承認済み基準を確認 |
| 同一フェーズ | [`react-native.md`](../../specifications/react-native.md) §1〜§3、§19〜§25 | 同じ16 API、private entry、runtime routing、error、package inventory、非退行契約を照合 |
| 直前レビュー | [`npm-typescript-facade-review-001.md`](npm-typescript-facade-review-001.md) | 変更前 Gate、既存 finding と deferred evidence の状態を確認 |
| 作業指針・手順 | [`AGENTS.md`](../../../AGENTS.md)、`spec-review`、`review-common` | 仕様境界、Security checklist、Gate、成果物形式、docs-only validation を確認 |
| Phase Context | なし | `AGENTS.md` に Specification の Phase Context 登録がないため使用していない |

## Review Result

`READY`

## Summary

対象仕様は、一つの `@nemnesia/symbol-nem-wallet-core` package と root entry に16個の公開 operation を固定し、Node native、Node / Browser WASM、React Native private entry の選択経路を分離している。Mobile を v1 対象とする上流方針は、`react-native` condition、RN 固有の silent fallback 禁止、単一 package inventory、および関連 RN 仕様への明示的な委譲として既に契約へ反映されている。

commit `f98a67f` の対象差分は、見出しと説明を日本語として読みやすく整理する変更である。公開 API、型、routing、fallback、error、artifact、secret boundary の規範的意味に変更や欠落はなく、直前レビューの `READY` を維持できる。新規または再発した Specification finding はない。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| 新規 finding | なし | なし | 本レビュー | 契約、運用、Security / Interoperability の3観点で Critical / Major / Minor 候補を採用しなかった。 |
| `SR-001〜SR-028` | 過去の各 Severity | Resolved / 回帰なし | 既存 cross-layer reviews | 16 API、DTO、runtime routing、error、single package、artifact、WASM、RN 非退行の契約が現行本文に維持されている。 |

## Required Changes

なし。

## Optional Improvements

なし。

## Resolved Findings

直前レビューで解消済みとされた public API / DTO / sync、routing、error、single package、artifact truth rule、single WASM binary、React Native non-regression の各契約は、commit `f98a67f` 後も回帰していない。

## Upstream Feedback

なし。Concept、Requirements、Design の前段レビューはいずれも `READY` であり、Mobile を v1 対象とする方針と本仕様の runtime / package 契約に解消不能な不足・曖昧さ・矛盾は確認されなかった。

## Deferred Findings

- `dist/index.d.ts`、ESM / CJS、Node / WASM / React Native adapter が同じ16 API、DTO、error、同期契約を実装していることの確認
- package exports の条件解決、Metro の `react-native` entry 選択、RN provider 初期化、Node / Browser routing の runtime evidence
- Node / RN manifest、SHA-256、native target / ABI / slice、single WASM、npm pack / clean install の release evidence
- secret-bearing buffer、failure cleanup、stale result、no fallback、既存 runtime 非退行の実装・device / runtime 検証

これらは Implementation / integration / release verification の対象であり、docs-only の本レビューでは成功扱いにしていない。

## Scope and Traceability

| 上流要求・設計 | Facade Specification の対応 |
| --- | --- |
| Mobile を含む v1 scope / single package | §§1、3、9、16、18 |
| 16 operation / platform parity | §§3〜6、9.2 |
| Binding non-authority / Core authority | §§3.2、6〜7 |
| Node / Browser / React Native routing | §§9〜10、14、16 |
| secret exposure / error boundary | §§4、7〜8、10.2、14.3 |
| fail-closed / no duplicate mutation | §§6、8、10.2、12、14.3 |
| artifact integrity / package assembly | §§11〜16、20 |
| RN 固有契約への委譲 | §§1、3.1、9〜10、12、16、18 |

本仕様は共通 facade と Node / Browser 契約を正本とし、React Native 固有の lifecycle、native artifact、platform matrix、Expo、process-wide coordination は `react-native.md` へ委譲する。RN 仕様は同じ root facade、16 API、error namespace、single package、no fallback を参照しており、循環する再定義や公開 API の分岐はない。

## Domain Checks

| 領域 | 結果 | 根拠 |
| --- | --- | --- |
| 公開 API・データ契約 | PASS | §§3〜6が16 function、引数順、同期 return、DTO、binary、`null` / `undefined` を一意に定める。 |
| validation | PASS | §§4、7〜8が scalar、UUID、typed array、DTO field、Core validation と facade normalization の境界を区別する。 |
| error | PASS | §8が18 Core `ErrorCode` と generic `BackendInitializationError` を分離し、RN 仕様 §19と一致する。 |
| runtime routing | PASS | §§9〜10が package exports を選択 authority とし、Node / Browser / RN の branch と fallback domain を分離する。 |
| 処理・状態 | PASS | §6が mutation の replacement Store、failure 時の状態不変、signing payload の opaque transfer を定める。 |
| protected asset exposure | PASS | §§3.2、4.2、7〜8が facade の秘密情報非保持、成功時以外の非返却、診断情報への非露出を定める。 |
| authorization / signing authority | PASS | §§3.2、5.1、7が confirmation、export intent、approval、password authorization を facade が生成・補完しないことを定める。 |
| Chain / Network | PASS | §§4〜7が Symbol / NEM、Mainnet / Testnet、保存済み context の照合を Core に残し、facade の補正を禁止する。 |
| malformed input / fail-closed | PASS | §§8、10、12、14が input failure、artifact failure、backend initialization、operation failureを区別し、silent retryを禁止する。 |
| artifact / interoperability | PASS | §§11〜16が target、manifest、hash、WASM、package inventoryを固定し、RN artifact namespaceを分離する。 |
| React Native parity | PASS | §§3.1、9〜10、12、16、18がRN private entryを同じ facadeへ接続し、`react-native.md` のpublic API / error / no-fallback契約と整合する。 |
| 検証可能性 | PASS | §20の受け入れ条件と関連 RN 仕様 §22〜§24により、declaration、routing、artifact、runtime parityを独立検証できる。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別レビュー | 契約の明確性と完全性、利用価値と運用適合性、Security / Interoperability primary の3パスを完了した。 |
| 対象差分 | `git diff f98a67f^ f98a67f -- docs/specifications/npm-typescript-facade.md` を確認し、規範的契約を変えない日本語表現の整理であることを確認した。 |
| 上流 Gate | Concept Review 015、Requirements Review 014、Design Review 3件がすべて `READY` で、未解決 Critical がないことを確認した。 |
| 過去 finding | `npm-typescript-facade-review-001.md` の Gate と finding 状態を確認し、現行本文で回帰確認を実施した。 |
| 文書間整合 | Requirements、Architecture、Bindings、Security、Platform Baseline、React Native Specification と単一 package、公開 API、routing、error、secret boundary を照合した。 |
| Markdown / 相対リンク / 差分 | 成果物作成後に章構成、相対リンク、whitespace、working tree を確認する。 |
| Rust / Binding / WASM / Node / React Native test | `NOT APPLICABLE / SKIPPED (docs-only review)`。既存 Implementation との適合確認は依頼範囲外。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 目的と範囲 | PASS | §§1〜3、13、16、20で共通 facade、各 runtime、実装・release 境界を特定できる。 | なし |
| 契約 | PASS | §§3〜12、14、16で公開 API、型、validation、error、routing、artifact、禁止事項を確認できる。 | なし |
| 処理と例外 | PASS | §§6〜8、10、12、14が成功、failure、fallback、state resultを区別する。 | なし |
| 内部整合性 | PASS | Mobile の v1 対象化、single package、RN private entry、既存 runtime 非退行に関連資料との矛盾がない。 | なし |
| 検証可能性 | PASS | §§11〜16、20とRN仕様のevidence matrixにより、契約・境界・failureを独立して検証できる。 | なし |
| 安全性と相互運用性 | PASS | secret非保持、authorization非生成、Core authority、fail-closed、artifact integrity、runtime parityを一意に確認できる。 | なし |
| 上流整合性 | PASS | Concept / Requirements / Designの前段レビューはすべて`READY`で、Mobileを含むv1 scopeと本仕様が整合する。 | なし |

## Remaining Risks and Open Decisions

Specification 内に active な user decision または blocked item はない。React Native の同期契約は、関連仕様に定める negative responsiveness evidence が確認された場合にのみ別の user decision を必要とするが、現時点では発動していない。

実装、artifact、package assembly、runtime / device、release evidence は本レビューで未確認であり、後工程の検証対象として残る。

## Automatic Changes

本レビュー成果物だけを新規作成した。Specification、Requirements、Design、実装、package、テスト、fixture、CI は変更していない。

## Final Decision

**NPM / TYPESCRIPT FACADE SPECIFICATION REVIEW GATE: READY**

新規または再発した Critical / Major / Minor finding はない。

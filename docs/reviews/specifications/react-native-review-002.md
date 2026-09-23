# React Native Specification Review 002 — Mobile の v1 対象化

## Review Target

- 対象: [`react-native.md`](../../specifications/react-native.md)
- 確認日: 2026-09-23（Asia/Tokyo）
- 成果物: `docs/reviews/specifications/react-native-review-002.md`
- レビュー範囲: commit `f98a67f` の親との差分、および差分反映後の Specification 全体について、Mobile（React Native Android / iOS）の v1 対象化、公開 API parity、runtime routing、process-wide coordination、lifecycle、error、secret boundary、Android / iOS / Expo、artifact、検証可能性を確認した。
- 未確認範囲: Rust / C ABI / TurboModule / JSI / Android / iOS の実装適合性、実機・simulator 動作、性能、resource、cancellation、artifact build、provenance、npm assembly、release evidence。これらの下流 evidence 不在を Specification の欠陥とは扱っていない。

## Execution Audit

- Reviewer A（契約の明確性と完全性）: 自己レビューの独立パスとして、対象範囲、16 operation、DTO、binary、同期 return / throw、runtime selection、状態、順序、lifecycle、error、acceptance を確認した。
- Reviewer B（利用価値と運用適合性）: 自己レビューの独立パスとして、Mobile の v1 利用経路、Android / iOS / Expo の formal scope、既存 runtime の非退行、失敗時の外部結果、Application の責任を確認した。
- Reviewer C（Security / Interoperability primary）: 自己レビューの独立パスとして、secret exposure、authorization、signing authority、Chain / Network、C ABI、buffer ownership、malformed input、fail-closed、stale result、artifact integrity、platform parity を確認した。
- Chair 統合: 完了。サブエージェントは使用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| ユーザー判断 | 2026-09-23 の明示判断 | Mobile（React Native Android / iOS）を v1 対象とする方針の確認 |
| 主対象 | [`react-native.md`](../../specifications/react-native.md) §1〜§26 | RN の外部契約、runtime routing、lifecycle、error、secret、platform、artifact、acceptance を確認 |
| 対象差分 | commit `f98a67f` とその親の `react-native.md` 差分 | 43行の見出し・用語・文章表現の日本語化を確認 |
| 上流 Concept / Requirements | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md) | Mobile を含む v1 scope、共通 Core、Binding non-authority、fail-closed、`FR-019`、`NFR-006〜NFR-015`、`AC-051〜AC-061` を追跡 |
| 前段レビュー | [`concept-sheet-review-015.md`](../concept/concept-sheet-review-015.md)、[`requirements-review-014.md`](../requirements/requirements-review-014.md) | 現行 Concept / Requirements Gate が `READY`、未解決 Critical がないことを確認 |
| Design / 前段レビュー | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md)、[`architecture-review-004.md`](../design/architecture-review-004.md)、[`bindings-review-004.md`](../design/bindings-review-004.md)、[`security-review-004.md`](../design/security-review-004.md) | responsibility、process-wide coordination、secret flow、failure、artifact、承認済み baseline、および全 Design Gate が `READY` であることを確認 |
| 承認済み判断 | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) | `PD-RN-001〜PD-RN-007 = APPROVED` と 2026-09-23 の Mobile v1 再適用を確認 |
| 関連仕様 | [`specification.md`](../../specifications/specification.md)、[`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md)、[`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) | Core / C ABI、公開 TypeScript facade、conditional exports、error、Store の正本との整合を確認 |
| 直前レビュー | [`react-native-review-001.md`](react-native-review-001.md) | `SR-001〜SR-028` の解消状態、既存 Gate、下流委譲を確認 |
| 実装フィードバック | [`implement-spec-feedback.md`](../implementation/implement-spec-feedback.md) | 既存3件が解決済みであり、RN 固有契約への未解決 feedback がないことを確認 |
| 作業指針・手順 | [`AGENTS.md`](../../../AGENTS.md)、`spec-review`、`review-common` の各手順書 | フェーズ境界、Security checklist、Gate、Severity、成果物形式、docs-only validation を確認 |
| Phase Context | なし | `AGENTS.md` に Specification の Phase Context 登録がないため使用していない |

## Review Result

`READY`

## Summary

更新後の React Native Specification は、Mobile を React Native Android / iOS の v1 実行環境として扱い、共通 TypeScript facade から private RN entry、TurboModule / JSI、薄い native layer、既存 C ABI、Rust Core へ至る単一経路を維持している。既存16 operation、DTO、`Uint8Array`、同期 return / throw、18 Core error、Store / secret semantics は Android / iOS で分岐していない。

runtime selection は `react-native` condition と native provider registration に限定され、RN failure を Node / WASM へ fallback しない。process-wide admission、runtime / registry / context identity、re-entry、cancellation、stale completion、runtime-local / process-wide teardown、secret の operation-local mediation、C ABI ownership と exact release は、失敗時の外部結果まで定義されている。Android API / ABI、iOS version / slice、New Architecture、Expo workflow、artifact manifest / provenance は承認済み Platform Baseline と一致する。

commit `f98a67f` の対象差分は見出しと説明語の日本語化であり、外部可視契約、security behavior、wire behavior、platform matrix を変更していない。新規 Critical / Major finding、`SR-001〜SR-028` の回帰は確認されなかった。一方、§1.1、§25.1、§26 は Mobile を v1 へ再適用した後の最新 Review Gate ではなく、過去の Requirements / Design Review を現行入力・follow-up 状態として示しているため、追跡性の軽微な改善を `SR-029` として記録する。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `SR-001〜SR-028` | 過去の各 Severity | Resolved / 回帰なし | specification-review-001〜016 | API、Store、authorization、signing、Chain / Network、binding、failure、RN lifecycle / evidence の解消状態が維持されている。 |
| `SR-029` | Minor | New | react-native-review-002 | §1.1、§25.1、§26 が `requirements-review-010.md` と `react-native-design-review-003.md` を現行入力として示し、Mobile v1 再適用後の Requirements Review 014 と Design Review 004群を参照していない。 |

## Required Changes

なし。Critical の New / Open / Reopened は確認されなかった。

## Optional Improvements

### SR-029 — 現行の Mobile v1 Review Gate へ追跡を更新する

- Severity: Minor
- Status: New
- 対象箇所: `react-native.md` §1.1、§25.1、§26。
- 確認事実: 本文は `requirements-review-010.md` と `react-native-design-review-003.md` を適用入力および follow-up 状態の根拠として示す。2026-09-23 の Mobile v1 再適用後は、Requirements Review 014、Architecture / Bindings / Security Design Review 004 が現行本文を `READY` と判定し、`DR-RN-005` の解消も確認している。
- 既存の根拠: 更新済み Concept / Requirements / Design、Concept Review 015、Requirements Review 014、Architecture / Bindings / Security Design Review 004、Platform Baseline の再適用状態。
- 問題: 外部契約の値は現行上流と一致するが、レビュー番号だけを読むと、Mobile の v1 対象化と Design status 同期より前の Gate が現在の根拠であるように見える。
- 影響: 実装動作、安全性、相互運用性は分岐しない。ただし、次回の監査・レビューで現行上流 Gate と Specification の承認経路を追加確認する必要がある。
- 必要な最小修正: §1.1、§25.1、§26 の review reference / status を、現行の Requirements Review 014 と Architecture / Bindings / Security Design Review 004へ更新する。過去レビューを履歴として残す場合は、現行 Gate と履歴を区別する。
- 完了条件: Mobile v1 再適用後の Concept → Requirements → Design → Specification の Gate と、`DR-RN-005` の解消状態を本文から一意に追跡できること。

## Resolved Findings

- `SR-001〜SR-024`: public API、Core / C ABI、secret、Store、error、Chain / Network の契約に回帰なし。
- `SR-025〜SR-028`: operation evidence、re-entry、initializing state、finite support window の契約に回帰なし。
- 直前レビューの Design feedback `DR-RN-005`: Architecture / Bindings / Security Design Review 004で解消済みであり、現行 Design は承認済み Platform Baseline と同期している。

## Upstream Feedback

なし。現行 Concept、Requirements、Design および Platform Baseline は Mobile の v1 対象化、責任、security property、platform 値を一意に定め、いずれの前段 Review Gate も `READY` である。`SR-029` は上流の不足ではなく、対象 Specification 内の参照更新に限定される。

## Deferred Findings

Formal finding はなし。次は Implementation / integration / release verification へ引き継ぐ。

- Android / iOS / Expo build、device / simulator、New Architecture registration と native load / invoke の実測。
- multi-runtime admission、re-entry、cancellation、reload、teardown、stale result、secret cleanup の runtime evidence。
- JS / UI blocking、starvation、resource boundedness、negative evidence gate の production-equivalent evidence。
- artifact manifest、digest / provenance、npm assembly、unsupported environment / extra artifact rejection。
- C ABI / TurboModule / JSI / native buffer の実装上の pointer、copy、zeroization、release、memory lifetime。

## Scope and Traceability

- Concept / Requirements の Mobile v1 scope は、§1〜§3、§13〜§20、§22〜§24へ追跡できる。
- `FR-019`、`NFR-006〜NFR-015`、`AC-051〜AC-061` は、公開 parity、routing、Core authority、platform matrix、failure、artifact、responsiveness evidence へ具体化されている。
- Architecture / Bindings / Security Design の process-wide coordination、runtime-local lifecycle、secret flow、Binding non-authority、artifact trust chain は、§4〜§12、§19〜§23へ具体化されている。
- `PD-RN-001〜PD-RN-007` は §1.1、§14〜§18、§20〜§24へ同じ確定値で反映されている。
- Core / C ABI / common error は `specification.md`、公開 facade / conditional exports は `npm-typescript-facade.md`、Store wire は `wallet-store-format-v1.md` を参照し、RN 固有仕様が再定義していない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| API・データ契約 | PASS | §2、§4、§11〜§12で同じ16 operation、DTO、`Uint8Array`、ownership、C ABI mediation を定義する。 |
| Runtime routing | PASS | §3、§19〜§20で private `react-native` entry、registered provider、no Node / WASM fallback、unsupported host の失敗を定義する。 |
| 状態・順序・lifecycle | PASS | §4〜§10で process-wide admission、identity、順序、re-entry、cancellation、stale completion、teardown を一意にする。 |
| Error | PASS | §19で Core error、Binding failure、initialization failure、unsupported platform、stale result の外部写像を区別する。 |
| Protected asset / authorization | PASS | §1.2、§10〜§12で Core authority、Binding non-authority、secret non-retention、explicit export / signing boundary を維持する。 |
| Fail-closed / malformed input | PASS | detached / unreadable buffer、length、output validation、artifact、provider、ABI / slice failureを成功や fallback に変換しない。 |
| Android / iOS / Expo | PASS | §13〜§18、§20〜§21が承認済み version、ABI / slice、New Architecture、Expo scope、artifact を区別する。 |
| 相互運用性 | PASS | Core error / signature / Store semantics、raw bytes、Chain / Network を共通仕様から継承し、RN 固有変換を許可しない。 |
| 検証可能性 | PASS | §22〜§24で `AC-054〜AC-061`、platform、artifact、lifecycle、responsiveness evidence を追跡できる。 |
| 上流追跡 | PASS with Minor | 外部契約は現行上流と一致する。review reference の最新化だけを `SR-029` として残す。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別レビュー | 契約の明確性と完全性、利用価値と運用適合性、Security / Interoperability の3パスを完了。 |
| 対象差分 | `git diff f98a67f^..f98a67f -- docs/specifications/react-native.md` と word diff を確認し、43行の変更が見出し・用語・説明の日本語化であることを確認した。 |
| 上流 Gate | Concept Review 015、Requirements Review 014、Architecture / Bindings / Security Design Review 004がすべて `READY` で、未解決 Critical がないことを確認した。 |
| 文書間整合 | Core Specification、npm / TypeScript facade、Wallet Store Format、Platform Baseline と API、routing、error、ownership、platform 値を照合した。 |
| 過去 finding / feedback | `SR-001〜SR-028` の回帰なし、`DR-RN-005` の解消、Implementation feedback 3件の解決済み状態を確認した。 |
| Markdown / 相対リンク / 差分 | 共通形式の18章が順番どおりに存在し、末尾空白がなく、成果物内の相対リンク先がすべて存在することを確認した。対象 commit と対象 Specification の working tree に whitespace error がないことも確認した。 |
| Rust / Binding / WASM / Node test | `NOT APPLICABLE / SKIPPED (docs-only review)`。既存 Implementation との適合確認は依頼範囲外。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 目的と範囲 | PASS | §1〜§3で Mobile の v1 経路、対象外、責任、公開範囲を一意に理解できる。 | なし |
| 契約 | PASS | API、binary、routing、ownership、state、error、platform、artifact を確認できる。 | なし |
| 処理と例外 | PASS | admission、initialization、re-entry、cancellation、stale、teardown、failure mapping が明確である。 | なし |
| 内部整合性 | PASS with Minor | 契約値は関連仕様・Platform Baseline と一致する。現行 review reference の更新だけが残る。 | `SR-029` |
| 検証可能性 | PASS | parity、failure、platform、artifact、responsiveness の acceptance evidence を独立して確認できる。 | なし |
| 安全性と相互運用性 | PASS | Core authority、secret ownership、C ABI、fail-closed、no fallback、Android / iOS parity が一意である。 | なし |
| 上流整合性 | PASS with Minor | 現行 Concept / Requirements / Design と契約上の矛盾はない。レビュー番号の最新化だけが残る。 | `SR-029` |

## Remaining Risks and Open Decisions

- Specification Gate を止める Open Critical はない。
- `SR-029` は追跡性だけの Minor であり、実装開始を妨げない。
- async API または operation-specific RN support exclusion は、negative evidence が出るまで `DEFERRED UNTIL NEGATIVE EVIDENCE` である。
- 実装、runtime、device / simulator、performance、resource、artifact、release evidence の適合性は未判定である。

## Automatic Changes

本レビュー成果物のみを新規作成した。Concept、Requirements、Design、Specification、Implementation、テスト、README、既存レビュー成果物は変更していない。

## Final Decision

`READY`

Critical は0件。Mobile（React Native Android / iOS）を v1 対象とする React Native Specification は実装・検証へ進める品質を満たす。`SR-029` は現行 Review Gate への参照更新として任意改善に残す。

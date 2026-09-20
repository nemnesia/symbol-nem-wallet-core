# Requirements Review 013 — v1 Mobile scope exclusion

## Review Target

- 対象: [`requirements.md`](../../requirements/requirements.md)
- 確認日: 2026-09-20（Asia/Tokyo）
- 成果物: `docs/reviews/requirements/requirements-review-013.md`
- Review Scope: Mobile の v1 対象外化、v1 runtime、Binding責任、非機能・security要求、受入条件、未決定事項、下流引継ぎ
- 未確認範囲: Design / Specification の修正結果、Browser実環境、release evidence、将来Mobile実装

## Execution Audit

- Reviewer A（明確性と完全性）: 自己レビューの独立パスとして、要求ID、scope、MUST / SHOULD、受入条件、内部参照を確認した。
- Reviewer B（利用価値とスコープ）: 自己レビューの独立パスとして、Conceptとの整合、v1対象、対象外、将来再開条件を確認した。
- Reviewer C（Security primary）: 自己レビューの独立パスとして、protected assets、confidentiality、integrity、authorization、lifecycle、failure safety、責任境界、Chain / Network分離を確認した。
- Chair統合: 完了。サブエージェントは使用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| 上流 | [`concept-sheet.md`](../../consept/concept-sheet.md) | v1対象、Mobile対象外、将来候補、責任境界 |
| 前段Review | [`concept-sheet-review-014.md`](../concept/concept-sheet-review-014.md) | Concept Gate `READY`、未解決Criticalなし |
| 主対象 | [`requirements.md`](../../requirements/requirements.md) | 要求、制約、security、受入条件、未決定事項 |
| 過去Review | [`requirements-review-012.md`](requirements-review-012.md) | 変更前Gateと既存finding状態 |
| 作業規則 | [`AGENTS.md`](../../../AGENTS.md)、`requirements-review`、`review-common` | Phase境界、Security checklist、Gate、成果物形式 |

## Review Result

`READY`

## Summary

Requirementsはv1対象をDesktop、Node.js、Browser / Browser Extensionへ限定し、Android / iOSを含むMobileを実装・受け入れ・release support claimの対象外としている。`NFR-016`と`AC-062`により、Mobile対応はBrowser安定稼働の承認済みevidenceと新しい上流承認後の別フェーズであることを外部から判定できる。

RN固有の機能・品質・architecture matrix・性能受入条件はv1要求から除かれ、Coreのsecret ownership、Binding non-authority、fail-closed、Symbol / NEMおよびMainnet / Testnet分離は維持される。削除された過去IDには欠番が残るが、現行要求への参照はなく、過去レビューの追跡性を壊さない。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| なし | — | — | — | New / Open / Reopened findingはない。 |

## Required Changes

なし。

## Optional Improvements

なし。

## Resolved Findings

過去のOpen findingはない。変更前のsecurity、Store、authorization、handoff、export、signing、Chain / Network要求に回帰はない。

## Upstream Feedback

なし。更新済みConceptと前段ReviewはMobileのv1対象外化を一意に定める。

## Deferred Findings

- Browserの安定稼働を判断する具体的なquality、compatibility、release evidenceはDesign / Specification / release verificationへ引き継ぐ。
- 既存DesignとSpecificationに残るRN v1 scopeは、更新済みRequirementsを根拠に整理する。
- Mobileのversion、OS、architecture、binding、API、artifactはv1の下流決定事項ではなく、将来の上流承認後に再検討する。

## Scope and Traceability

- ConceptのDesktop / Web / Node.js v1 scopeはRequirements §1、§2、`NFR-001`、`NFR-004`、`NFR-006`へ追跡できる。
- Mobile対象外と将来再開GateはConcept §1、§7、§11〜§13から`NFR-016`、`AC-062`へ追跡できる。
- Core / Binding / Application責任、secret lifecycle、failure safety、Chain / Networkの既存要求は維持される。
- RN固有IDを別の意味へ再利用せず、削除による欠番を許容して過去資料との識別を維持している。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 要求の完全性 | PASS | v1対象、対象外、主要機能、品質、security、未決定事項が識別できる。 |
| 責任・範囲 | PASS | Desktop / Node / BrowserとMobile将来候補を区別し、Core / Binding / Application責任を維持する。 |
| MUST / SHOULD | PASS | Mobile対象外は`NFR-016 = MUST`、coverage目標は既存`SHOULD`として区別される。 |
| 受入条件 | PASS | `AC-062`によりMobileがv1 claimへ含まれないことと、将来再開の前提を判定できる。 |
| Security | PASS | protected assets、非開示、integrity、処理単位authorization、secret lifecycle、fail-closed、host責任が維持される。 |
| 相互運用性 | PASS | Symbol / NEM、Mainnet / Testnet、Native / Node-API / WASMの境界に回帰がない。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別Review | 明確性、scope、Security primaryの3パスを完了。 |
| RN残存検索 | Mobileに関する残存記載がv1対象外、将来Gateまたは未決定evidenceに限定されることを確認。 |
| 内部参照 | 削除した`NFR-013〜NFR-015`、`AC-051〜AC-061`への現行参照がないことを確認。 |
| Markdown / 差分 | `git diff --check`と相対リンク確認を本成果物作成後に実施する。 |
| 実装テスト | `NOT APPLICABLE / SKIPPED (docs-only)`。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応ID |
| --- | --- | --- | --- |
| 目的と課題 | PASS | Browserを含むv1対象で共通Coreを提供する目的が明確。 | なし |
| 利用者と責任 | PASS | Wallet開発者、Application、Binding、Core、hostの責任が明確。 | なし |
| 対象範囲 | PASS | Mobileをv1対象外として一意に区別する。 | なし |
| 要件と制約 | PASS | Mobile scope、Browser evidence、security、support matrixを識別できる。 | なし |
| 受け入れ条件 | PASS | 主要要求とMobile対象外を外部から判定できる。 | なし |
| 内部整合性 | PASS | 目的、要求、security、受入条件、未決定事項に矛盾がない。 | なし |
| 不可欠な前提 | PASS | Browser安定evidenceの具体化を下流へ明示的に委譲する。 | なし |
| コンセプト整合性 | PASS | Concept Review 014の`READY`と更新済みscopeを引き継ぐ。 | なし |

## Remaining Risks and Open Decisions

- supported browser baselineとBrowser安定稼働evidenceの具体値・判定方法は未決定である。
- 下流Design / Specificationは変更前のRN v1 scopeを含み、更新完了までは現行Requirementsと競合する。

## Automatic Changes

本レビュー成果物のみを新規作成した。Concept、Requirements、Design、Specification、Implementation、テストおよび既存レビュー成果物は変更していない。

## Final Decision

`READY`

現行Requirementsは、Mobileをv1対象外とするDesign再整理へ進める品質を満たす。

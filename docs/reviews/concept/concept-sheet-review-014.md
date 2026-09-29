# Concept Review 014 — v1 Mobile scope exclusion

## Review Target

- 対象: [`concept-sheet.md`](../../consept/concept-sheet.md)
- 確認日: 2026-09-20（Asia/Tokyo）
- 成果物: `docs/reviews/concept/concept-sheet-review-014.md`
- レビュー範囲: Android / iOS を含む Mobile の v1 対象外化、Browser 安定稼働後の将来候補化、および課題・目的・対象ユーザー・成功条件・責任境界への整合
- 未確認範囲: Requirements、Design、Specification、Implementation、Browser の具体的な安定判定基準、Mobile の実装方式

## Execution Audit

- Reviewer A（品質と論理）: 自己レビューの独立パスとして、用語、v1 と将来構想、本文内部の整合を確認した。
- Reviewer B（課題と価値）: 自己レビューの独立パスとして、対象ユーザー、利用場面、提供価値、成功条件を確認した。
- Reviewer C（境界と成立性）: 自己レビューの独立パスとして、対象外、将来候補、外部責任、前提、リスクを確認した。
- Chair 統合: 完了。サブエージェントは使用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| ユーザー判断 | 2026-09-20 の明示判断 | Android / iOS は v1 対象外、Browser の安定稼働後に将来実装する方針 |
| 主対象 | [`concept-sheet.md`](../../consept/concept-sheet.md) | 目的、対象、v1 境界、成功条件、将来候補、引継ぎの確認 |
| 前回レビュー | [`concept-sheet-review-013.md`](concept-sheet-review-013.md) | 変更前 Concept の Gate と既存 finding 状態の確認 |
| 作業規則 | [`AGENTS.md`](../../../AGENTS.md)、`concept-review`、`review-common` | フェーズ境界、Gate、成果物形式の確認 |

## Review Result

`READY`

## Summary

Concept は、v1 の対象を Desktop、Node.js、Browser / Browser Extension とし、Android / iOS を含む Mobile を明示的に対象外へ分離している。Mobile は Browser での安定稼働確認後に改めて検討する将来候補であり、v1 の成功条件や責任へ混入していない。

秘密情報の継続 ownership、通常処理での非開示、単一 Rust Core、Symbol / NEM と Mainnet / Testnet の区別は維持される。Browser の安定稼働を判定する証拠は後続で具体化する未決定事項として分離され、Concept が実装方式や数値を先取りしていない。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| なし | — | — | — | New / Open / Reopened finding はない。 |

## Required Changes

なし。

## Optional Improvements

なし。

## Resolved Findings

過去の Open finding はない。変更前の `concept-sheet-review-013.md` が確認した責任境界と security invariant に回帰はない。

## Upstream Feedback

なし。今回の scope 変更はユーザーが明示的に決定している。

## Deferred Findings

- Browser の安定稼働を判定する品質・互換性・release evidence は Requirements 以降で具体化する。
- 既存 Requirements、Design、Specification に残る RN Android / iOS の v1 要求・契約・設計は、更新済み Concept を根拠に各工程で整理する。
- Mobile 対応を再開する場合は、その時点の正式な Concept 以降の工程を改めて通す。

## Scope and Traceability

- v1 対象: Desktop、Node.js、Browser / Browser Extension。
- v1 対象外: Android / iOS を含む Mobile。
- 将来候補: Browser の安定稼働確認後の Mobile 対応。
- 維持する境界: Core の secret ownership、通常処理での非開示、Application / host の責任、単一 Rust Core。
- 下流引継ぎ: v1 の platform scope と Browser 安定判定の証拠を Requirements で検証可能な形へ具体化する。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | PASS | Browser を含む対象環境で鍵管理を共通 Core へ集約する課題と価値が維持される。 |
| 対象ユーザー | PASS | v1 の Desktop / Web / Node.js ウォレット開発者が明示される。 |
| v1 の境界 | PASS | Mobile の対象外と将来候補が、v1 の対象・成功条件から分離される。 |
| 責任 | PASS | Core、Application、Web host の責任境界に変更や混同がない。 |
| 成功条件 | PASS | v1 対象環境だけで達成状態を判定でき、Mobile を要求しない。 |
| 成立性 | PASS | Mobile 非対応でも v1 の目的と提供価値が成立する。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別レビュー | 品質と論理、課題と価値、境界と成立性の3パスを完了。 |
| 用語・scope 検索 | Mobile / Android / iOS の記載が v1 対象外または将来候補として一貫することを確認。 |
| Markdown / 差分 | `git diff --check` と相対リンク確認を本成果物作成後に実施する。 |
| 実装テスト | `NOT APPLICABLE / SKIPPED (docs-only)`。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 明確さ | PASS | v1 の対象環境と Mobile の扱いが一意である。 | なし |
| 課題 | PASS | 対象ユーザーの鍵管理分散という課題を説明できる。 | なし |
| 対象ユーザーと価値 | PASS | 利用者、利用場面、共通 Core の価値が対応する。 | なし |
| v1 の境界 | PASS | v1、対象外、将来候補が区別される。 | なし |
| 責任境界 | PASS | Core、Application、host の責任を混同しない。 | なし |
| 内部整合性 | PASS | 概要、目的、scope、成功条件、前提、将来候補が整合する。 | なし |
| 成立性 | PASS | Mobile を除外した v1 の価値と達成条件が成立する。 | なし |

## Remaining Risks and Open Decisions

- Browser の「安定稼働」を判断する具体的な証拠は未決定であり、Requirements 以降へ引き継ぐ。
- 下流の正式文書は変更前の Mobile v1 scope を含むため、現時点では更新済み Concept と競合している。

## Automatic Changes

本レビュー成果物のみを新規作成した。Concept、Requirements、Design、Specification、Implementation、テストおよび既存レビュー成果物は変更していない。

## Final Decision

`READY`

更新済み Concept は、Mobile を v1 対象外とする Requirements の再整理へ進める品質を満たす。

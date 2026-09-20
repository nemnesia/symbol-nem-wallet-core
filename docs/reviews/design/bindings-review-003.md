# Bindings Design Review Findings

## Review Target

- 対象: [`bindings.md`](../../design/bindings.md)
- 確認日: 2026-09-20（Asia/Tokyo）
- 成果物: `docs/reviews/design/bindings-review-003.md`
- Review Scope: Native C ABI / Node-API / WASM / React Native Binding の責務、依存方向、trust boundary、ownership / lifecycle、主要 mediation flow、runtime routing、RN coordination / artifact / support status および下流委譲を確認した。
- 未確認範囲: exact API / ABI / DTO、pointer / free、wire format、暗号、memory / zeroization 実装、native artifact build、実機 runtime および性能実測。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。
- Reviewer A（構造と責務）: 完了。Binding non-authority、依存方向、各 runtime boundary を確認した。
- Reviewer B（Security primary）: 完了。secret ownership、temporary mediation、authorization、failure、Store、buffer、artifact trust を確認した。
- Reviewer C（フローと運用）: 完了。handoff、export、signing、retry / restart、RN initialization / teardown / coordination を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。上流・同一 Design・承認済み decision・Specification handoff を確認した。
- Chair 統合: 完了。既存 `DR-RN-005` の未解決範囲を Bindings 上で再確認し、新規 formal finding は採用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| 主対象 | [`bindings.md`](../../design/bindings.md) §1〜§13 | Binding responsibility、mediation、ownership、runtime / RN design を確認 |
| 上流 | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md) | scope、security property、Binding 要求を追跡 |
| 前段レビュー | [`concept-sheet-review-013.md`](../concept/concept-sheet-review-013.md)、[`requirements-review-012.md`](../requirements/requirements-review-012.md) | 上流 Gate `READY` を確認 |
| 同一 Design | [`architecture.md`](../../design/architecture.md)、[`security.md`](../../design/security.md)、[`architecture-review-003.md`](architecture-review-003.md) | authority、trust boundary、lifecycle、Open finding の整合確認 |
| Design decision | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) | `PD-RN-001〜PD-RN-007` の `APPROVED` 状態を確認 |
| 過去レビュー | [`bindings-review-002.md`](bindings-review-002.md)、[`react-native-design-review-004.md`](react-native-design-review-004.md) | `DR-001〜DR-006`、`DR-RN-001〜DR-RN-005` の状態を追跡 |
| 作業指針・手順 | [`AGENTS.md`](../../../AGENTS.md)、`design-review`、`review-common` の各手順書 | フェーズ境界、Gate、Security review 観点、成果物形式を確認 |

## Review Result

`READY`

## Summary

Bindings Design は、Application / UI → Binding → Rust Core の依存方向を維持し、Binding を representation、transport、ownership、lifecycle、error / warning の non-authoritative mediation に限定している。Core の secret ownership、per-operation authorization、handoff / export / signing、Store / version、pending / failure、Chain / Network の意味を Binding が変更しない。Native / Node.js / Web / RN の保証境界、RN private routing、process-wide coordination、no silent fallback、artifact trust chain も一貫する。

既存 Major `DR-RN-005` は Bindings 上でも未解決である。§12.2、§12.6〜§12.7、§12.13、DDR-RN-001 / 007 / 008、§13は RN version、Android API / ABI、iOS floor / architecture、New Architecture、Expo を候補・未決定・user decision として残すが、正式 decision では `PD-RN-001〜PD-RN-007` が承認済みである。候補比較は有用でも、現行 baseline と履歴を区別する必要がある。

Critical と新規 finding はなく、Bindings Gate は `READY`。`DR-RN-005` は Open Major として維持する。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `DR-001〜DR-006` | Major / Minor | Resolved / 回帰なし | bindings-review-001〜002 | Source of Truth、mediation、guarantee boundary、FFI safety intent、phase boundary、Extension responsibility が維持される。 |
| `DR-RN-001〜DR-RN-004` | Major | Resolved / 回帰なし | react-native-design-review-001〜003 | sync evidence、process-wide authority、C ABI reuse、artifact trust chain が維持される。 |
| `DR-RN-005` | Major | Open | react-native-design-review-004 | RN platform 値が承認済みでも、本文の複数箇所が候補・未決定・user decision の status を保持する。 |

## Required Changes

なし。Critical の New / Open / Reopened はない。

## Optional Improvements

### DR-RN-005 — 承認済み RN platform baseline と Bindings Design の status を同期する

- 対象箇所: §12.2、§12.6〜§12.7、§12.13、DDR-RN-001、DDR-RN-007、DDR-RN-008、§13。
- 確認事実: minimum RN、Android API / ABI、iOS version / architecture、New Architecture、Expo が未決定または候補とされる一方、`PD-RN-001〜PD-RN-007` は `APPROVED`。
- 問題: 現行 normative baseline、過去の選択肢比較、条件付き future decision を本文単独で区別できない。
- 影響: Specification / Implementation / release verification が参照すべき support baseline の Design traceability が不明瞭になる。Core / Binding の security boundary と runtime semantics は変わらないため Gate blocker ではない。
- 必要な最小修正: 承認済み decision への trace と現行 status を明示し、候補表は historical / non-normative comparison とラベル付けする。Browser baseline と negative evidence 時の async / exclusion は別 lane として残す。
- 完了条件: Bindings Design から approved / unsupported / historical / conditionally deferred を一意に識別できる。

## Resolved Findings

- `DR-001〜DR-006`: Binding Source of Truth、Core-owned meaning、all-runtime guarantee、Native fail-safe intent、実装方式の委譲、Extension responsibility に回帰なし。
- `DR-RN-001〜DR-RN-004`: RN sync evidence、coordination、C ABI reuse、artifact provenance に回帰なし。

## Upstream Feedback

なし。Concept / Requirements は Binding Design の責任、security property、runtime scope および受入条件を十分に定めている。

## Deferred Findings

- exact API / ABI / DTO / error / warning / package exports / resolver condition。
- pointer、length、alias、free、allocator、copy、zeroization、thread primitive、JNI / Swift / ObjC++ の実装。
- artifact manifest / provenance format、build / CI / release workflow、実機 runtime / performance / cleanup evidence。
- negative evidence 発生時の async contract または RN support exclusion decision。

## Scope and Traceability

- Concept / Requirements の Core continuous ownership、normal-output non-disclosure、Binding non-authority、per-operation authorization、handoff / export / signing、Store、Chain / Network は §3〜§11へ追跡できる。
- RN single package、private entry、TurboModule / JSI、C ABI reuse、runtime resolution、artifact、process-wide coordination は §12へ追跡できる。
- `DR-RN-005` は承認済み decision の status / traceability に限定され、新しい platform 値や API を追加しない。
- 具体 API、memory、artifact mechanics、test / release evidence は下流へ委譲されている。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 責務・依存方向 | PASS | §3〜§4で Binding non-authority と Application → Binding → Core を定める。 |
| Secret ownership / lifecycle | PASS | §5〜§6、§12.8〜§12.9で Core 原本、一時 mediation、外部コピー、non-retention を区別する。 |
| Authentication / signing | PASS | password authorization、user intent、signing approval を分離し、Binding が判断しない。 |
| Store / failure | PASS | opaque Store、no migration、pending 非昇格、retry / restart、fail-closed を維持する。 |
| Runtime separation | PASS | Node、Browser / Extension、RN の private backend と no silent fallback を定める。 |
| RN coordination / artifact | PASS | process-wide admission、stale result rejection、C ABI reuse、artifact trust chain を定める。 |
| Platform status | PASS with finding | 値の設計は decision / Specification と整合するが、本文 status が `DR-RN-005`。 |
| 下流 handoff | PASS | security meaning を固定し、API / ABI / memory / implementation / release evidence を委譲する。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 対象確定 | `bindings.md` を個別 Design review 対象として確認。 |
| 上流 / 同一 Design | Concept / Requirements Gate と Architecture の責任・Open finding を確認。 |
| Decision status | `PD-RN-001〜PD-RN-007` が `APPROVED` で、Bindings の旧 status 表記が残ることを確認。 |
| 過去 finding | `DR-001〜DR-006`、`DR-RN-001〜DR-RN-005` を現行本文で回帰確認。 |
| Rust / Binding / WASM / Node test | `NOT APPLICABLE / SKIPPED (docs-only review)`。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 目的と範囲 | PASS | §1〜§2で対象、対象外、Source of Truth、下流境界を定める。 | なし |
| コンテキストと責任 | PASS | §3〜§5で主体、guarantee boundary、ownership を定める。 | なし |
| 依存方向 | PASS | Application → Binding → Core と authority 非逆流を定める。 | なし |
| 主要フロー | PASS | §6、§12で handoff、export、signing、failure、RN lifecycle を定める。 | なし |
| データ所有 | PASS | secret、Store、pending / replacement、buffer の owner を区別する。 | なし |
| セキュリティと相互運用性 | PASS | non-disclosure、authorization、fail-closed、Chain / Network、runtime separation を維持する。 | なし |
| 上流整合性 | PASS | Concept / Requirements / Architecture と重大な矛盾はない。decision status に Open Major がある。 | `DR-RN-005` |
| 下流実装可能性 | PASS | 下流は責任・invariant と承認済み decision を参照できる。 | `DR-RN-005` |

## Remaining Risks and Open Decisions

- `DR-RN-005` が Open。Bindings の RN platform status を承認済み decision と同期する必要がある。
- Browser baseline と negative evidence 後の async / support exclusion は別の decision lane である。
- 実 runtime、native artifact、memory、performance、release evidence は未検証。

## Automatic Changes

本レビュー成果物のみを新規作成した。Bindings、関連 Design、Requirements、Specification、Implementation、テストおよび既存レビュー成果物は変更していない。

## Final Decision

`READY`

Critical は0件。`DR-RN-005` の Open Major を Design 修正へ引き継ぎつつ、Security Design の再レビューへ進める。

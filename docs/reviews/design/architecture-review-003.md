# Architecture Review Findings

## Review Target

- 対象: [`architecture.md`](../../design/architecture.md)
- 確認日: 2026-09-20（Asia/Tokyo）
- 成果物: `docs/reviews/design/architecture-review-003.md`
- Review Scope: Architecture 全13章について、上流追跡、システムコンテキスト、責務・依存方向、trust boundary、secret ownership / lifecycle、主要フロー、失敗・再試行・再起動、RN topology および下流委譲を確認した。
- 未確認範囲: API、wire format、暗号パラメータ、具体的 ABI / WASM / RN 実装、runtime artifact、実機性能およびテスト実装。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。
- Reviewer A（構造と責務）: 完了。component、ownership、dependency direction、Core / Binding / Application / storage の責任を確認した。
- Reviewer B（Security primary）: 完了。protected assets、trust boundary、secret lifecycle、authorization、signing authority、failure / replacement、binding non-authority を確認した。
- Reviewer C（フローと運用）: 完了。handoff、mutation、signing、export、retry、restart、RN lifecycle / coordination を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept / Requirements / Design decision との追跡、Specification への委譲および status の整合を確認した。
- Chair 統合: 完了。既存 `DR-RN-005` の未解決状態を再確認し、新規 formal finding は採用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| 主対象 | [`architecture.md`](../../design/architecture.md) §1〜§13 | 責務、依存方向、trust boundary、ownership、flow、RN architecture を確認 |
| 上流 | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md) | 製品目的、scope、security property、受入条件を追跡 |
| 前段レビュー | [`concept-sheet-review-013.md`](../concept/concept-sheet-review-013.md)、[`requirements-review-012.md`](../requirements/requirements-review-012.md) | 上流 Gate `READY`、未解決 Critical なしを確認 |
| 同一フェーズ | [`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md) | 責任、RN boundary、security invariant の整合確認 |
| Design decision | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) | `PD-RN-001〜PD-RN-007` の `APPROVED` 状態を確認 |
| 過去レビュー | [`architecture-review-002.md`](architecture-review-002.md)、[`react-native-design-review-004.md`](react-native-design-review-004.md) | `DR-001〜DR-009` と `DR-RN-001〜DR-RN-005` の状態を追跡 |
| 作業指針・手順 | [`AGENTS.md`](../../../AGENTS.md)、`design-review`、`review-common` の各手順書 | フェーズ境界、Security checklist、Gate、成果物形式を確認 |

## Review Result

`READY`

## Summary

Architecture は、Application / Binding → Rust Core の依存方向、Core の secret / authorization / Store authority、Application の利用者意思・current Store authority、Binding non-authority、通常処理での秘密情報非開示、atomic / fail-closed、Symbol / NEM と Chain / Network の分離を一貫して定めている。主要フローと RN process-wide coordination も下流へ実装可能な責任・lifecycle・failure invariant を持つ。

一方、既存 Major `DR-RN-005` は未解決である。§12.4 は final ABI / OS floor を `NEEDS USER DECISION`、§12.6 は RN version、Android / iOS、ABI、New Architecture、Expo の最終値を固定しないと記載するが、正式 decision では `PD-RN-001〜PD-RN-007` が承認済みである。Architecture の topology や security architecture の欠陥ではないが、現行状態と履歴候補を区別できない traceability 不整合である。

Critical はなく、Architecture Gate は `READY`。`DR-RN-005` は Design author による status 同期が必要な Open Major として維持する。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `DR-001〜DR-009` | 過去の各 Severity | Resolved / 回帰なし | architecture-review-001〜002 | 責務、dependency、handoff、export、signing、Store、failure、Chain / Network の設計が維持される。 |
| `DR-RN-001〜DR-RN-004` | Major | Resolved / 回帰なし | react-native-design-review-001〜003 | sync evidence、process-wide coordination、C ABI reuse、artifact trust chain が維持される。 |
| `DR-RN-005` | Major | Open | react-native-design-review-004 | §12.4、§12.6 の `NEEDS USER DECISION` / 未固定表記が、承認済み `PD-RN-001〜PD-RN-007` と未同期。 |

## Required Changes

なし。Gate を不合格にする Critical の New / Open / Reopened はない。

## Optional Improvements

### DR-RN-005 — 承認済み RN platform baseline と Architecture の status を同期する

- 対象箇所: `architecture.md` §12.4、§12.6。
- 確認事実: 本文は final ABI matrix、Android API、minimum iOS、RN version、New Architecture、Expo scope を未決定として扱う。`react-native-platform-baseline.md` §11、§16、§18は `PD-RN-001〜PD-RN-007` を `APPROVED` とする。
- 問題: 現行の規範入力と、承認前の候補・未決定状態を読者が区別できない。
- 影響: Specification / release gate へ渡す platform baseline の traceability が Design 単独では不明瞭になる。ただし責務・security architecture・API semantics は変わらず、下流は承認済み decision を参照できるため Gate blocker ではない。
- 必要な最小修正: RN-specific platform 項目を承認済み decision へ trace し、Browser baseline と negative evidence 時の async / support exclusion だけを別の未決定 lane として区別する。過去の候補分析を残す場合は非規範・履歴と明示する。
- 完了条件: Architecture から、承認済み値、未決定事項、条件付き future decision を一意に識別できる。

## Resolved Findings

- `DR-001〜DR-009`: 現行 Architecture で解消状態を維持。
- `DR-RN-001〜DR-RN-004`: RN execution evidence gate、process-wide authority、existing C ABI reuse、artifact provenance に回帰なし。

## Upstream Feedback

なし。Requirements review 012 は `READY` で、Architecture の評価に必要な scope、responsibility、security property および acceptance は揃っている。

## Deferred Findings

- API、ABI、DTO、wire / Store format、crypto、memory / zeroization、parser、error の具体契約。
- RN queue / lock / worker / lifecycle hook、artifact manifest、package exports、実機 performance / resource / cleanup evidence。
- negative evidence が生じた場合の async contract または RN support exclusion の user decision。

## Scope and Traceability

- Concept / Requirements の共通 Core、secret ownership、normal-output non-disclosure、operation authorization、handoff / export / signing、Store authority、failure safety、Chain / Network は §3〜§10へ追跡できる。
- RN scope、single package、private backend、existing C ABI reuse、process-wide coordination、artifact trust chain は §12〜§13へ追跡できる。
- `DR-RN-005` は承認済み decision の状態表示だけに関係し、新しい Requirement や platform 値を作らない。
- API、wire format、暗号方式、実装 primitive は下流へ委譲されている。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| システムコンテキスト / 責務 | PASS | §3〜§4で利用者、Application、Binding、Core、storage、Transaction / Network、host を区別する。 |
| 依存方向 | PASS | Application / UI → Binding → Core の一方向と Binding non-authority を定める。 |
| Trust boundary / secret ownership | PASS | §3.1、§5.1で protected assets、Core 原本、外部コピー、host guarantee limit を定める。 |
| Authentication / signing authority | PASS | §6.3〜§6.5で user approval、Profile password authorization、Core signing authority を分離する。 |
| Failure / state consistency | PASS | §5.2〜§6で committed / pending / replacement、retry / restart、existing state preservation を定める。 |
| Chain / Network separation | PASS | §5.1、§7で Profile Network、Software Key Chain、Account、Core validation を区別する。 |
| RN architecture | PASS with finding | topology、coordination、failure invariant は成立。platform decision status のみ `DR-RN-005`。 |
| 下流実装可能性 | PASS | 責任・invariant を固定し、具体契約・方式を下流へ委譲する。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 対象確定 | `architecture.md` を個別 Design review 対象として確認。 |
| 上流 Gate | Concept review 013 / Requirements review 012 が `READY`。 |
| Decision status | `PD-RN-001〜PD-RN-007` が `APPROVED` で、Architecture の旧 status 表記が残ることを確認。 |
| 過去 finding | `DR-001〜DR-009`、`DR-RN-001〜DR-RN-005` の状態を現行本文で確認。 |
| Rust / Binding / WASM / Node test | `NOT APPLICABLE / SKIPPED (docs-only review)`。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 目的と範囲 | PASS | §1〜§2で対象、対象外、上流・下流境界を定める。 | なし |
| コンテキストと責任 | PASS | §3〜§4で主体、trust boundary、責任を定める。 | なし |
| 依存方向 | PASS | §4.5と§12で一方向依存と authority を定める。 | なし |
| 主要フロー | PASS | §6、§12.3〜§12.5で正常・失敗・retry / restart / teardown を定める。 | なし |
| データ所有 | PASS | §5で secret、Store、pending / replacement の owner を定める。 | なし |
| セキュリティと相互運用性 | PASS | secret lifecycle、authorization、fail-closed、Chain / Network、Binding boundary を維持する。 | なし |
| 上流整合性 | PASS | Concept / Requirements と重大な矛盾はない。decision status に Open Major がある。 | `DR-RN-005` |
| 下流実装可能性 | PASS | 下流は責務・invariant と承認済み decision を参照できる。 | `DR-RN-005` |

## Remaining Risks and Open Decisions

- `DR-RN-005` が Open。Design の status 表示を承認済み RN baseline へ同期する必要がある。
- Browser baseline と negative evidence 発生時の async / RN support exclusion は、承認済み RN platform baseline とは別の decision lane である。
- runtime / artifact / performance / release evidence は下流で未検証。

## Automatic Changes

本レビュー成果物のみを新規作成した。Architecture、関連 Design、Requirements、Specification、Implementation、テストおよび既存レビュー成果物は変更していない。

## Final Decision

`READY`

Critical は0件。`DR-RN-005` の Open Major を Design 修正へ引き継ぎつつ、Bindings の再レビューへ進める。

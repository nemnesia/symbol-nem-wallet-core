# Specification Review Findings

## Review Target

- 対象: `docs/specifications/specification.md`
- 確認日: 2026-08-20 09:00 +0900
- 成果物: `docs/reviews/specifications/specification-review-006.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a01d90-c430-7013-ace4-bc9a970bc092`
- Reviewer B agent_id: `01a01d90-da99-7911-8953-1900f0c2122a`
- Reviewer C agent_id: `01a01d90-ef1a-7832-a610-73bcc9fc58ed`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの agent_id へ全メモを個別送信し、各送信に対応する `multi_agent_v1__wait_agent` の完了を個別確認。submission_id は A: `01a01d97-e8ee-7aa3-a084-0aacfc359597`、B: `01a01d97-e90b-7c81-9e63-1bda8540cb20`、C: `01a01d97-e93a-74d3-a31b-b1d17642fcb3`
- Chair 統合: 完了

3つの `agent_id` は相互に異なる。起動、Phase 1、Phase 2 の完了および統合完了を確認した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/specification.md` §4.2、§8.2、§13、§14.1、§16、§17 | HD導出・復元互換性、Profile重複、Binding、fixtureおよび未決定事項を確認 |
| 保存フォーマット仕様 | `docs/specifications/wallet-store-format-v1.md` §12、§14.1 | `duplicate_tag` の意味的一致検証と新規Profile作成時の事前検証範囲を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | Coreの責任境界、対象利用者、v1スコープとの整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 公開された判定と品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` §3.1〜§3.2、FR-017〜FR-019、AC-018、AC-020、§12.1 | 互換性、Profile重複、Binding利用および受入条件を確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | RR-020〜RR-022の公開された判定と既存Wallet互換性の未解決範囲を確認 |
| 承認済み要件またはプロジェクト資料 | `docs/decisions/open-001.md`、`docs/decisions/binding-implementation.md` | `symbol-sdk` 3.3.2および既存Wallet復元互換性の決定、Binding方針との整合性を確認。Binding決定の承認状態・優先順位は明記されていない |
| 実装者からの仕様フィードバック | `docs/reviews/implementation/implement-spec-feedback.md` | INTEROP-001、CRITICAL-001、INTEROP-002の解決状況を確認 |
| 過去仕様レビュー | `docs/reviews/specifications/specification-review-001.md`〜`specification-review-005.md` | SR-001〜SR-014の正式ID、状態および同一性を確認 |

## Review Result

実装へ進める

## Summary

HD導出の規範、Chain別の重複条件、Mnemonic受渡し、AADおよびunknown fieldの扱いは前回指摘を反映している。
一方、既存Wallet復元互換性の保証範囲と、意味的一致を確認できない既存Profileがある場合の新規Profile作成・復元結果は、既存要件を一意に検証するための明確化が残る。
また、`binding-implementation.md` の決定内容と仕様本文のBinding選択肢に不一致があり、決定の権威性も明記されていない。
いずれもMajorであり、Criticalな品質ゲート不合格は確認しないため、判定は実装へ進めるとする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Reopened | specification-review-001 | 導出規則は解消されたが、既存Wallet復元互換性の対象・保証・判定責任が要件のRR-021およびOPEN-001に対して未確定である。 |
| SR-002 | Major | Resolved | specification-review-001 | §8.1でMnemonic提示、利用者確認、finalize条件、失敗・中断時のProfile非作成を確認した。 |
| SR-003 | Major | Resolved | specification-review-001 | 保存フォーマット仕様でCBOR、AAD、HMAC入力およびdeterministic表現を確認した。 |
| SR-004 | Major | Resolved | specification-review-001 | §9でDTO、byte表現、公開情報、署名結果およびNative/WASM同一性を確認した。 |
| SR-005 | Major | Resolved | specification-review-001 | `registry_key` / `duplicate_tag`をAAD対象とし、改変時の認証失敗を確認した。 |
| SR-006 | Minor | Resolved | specification-review-001 | §10で主要失敗条件と共通error codeを対応付けた。 |
| SR-007 | Major | Resolved | specification-review-001 | §8.1、§10、§11、§14.2でPendingの検証、重複、認証および失敗時不変条件を確認した。 |
| SR-008 | Major | Resolved | specification-review-002 | passwordless `list_software_keys` が`origin`を返さない契約を確認した。 |
| SR-009 | Major | Resolved | specification-review-002 | 予測不能な乱数源、fallback禁止、妥当性検証および失敗時不変条件を確認した。 |
| SR-010 | Minor | Resolved | specification-review-003 | §6.4、§14.2でパスワード復旧・リセット禁止と紛失時の失敗結果を確認した。 |
| SR-011 | Major | Resolved | specification-review-003 | §8.3、§9.2で表示名管理をCore v1の対象外と確認した。 |
| SR-012 | Major | Resolved | specification-review-004 | profile_idとProfile内key_idの一意性、曖昧なStoreの`InvalidStore`処理を確認した。 |
| SR-013 | Major | Resolved | specification-review-004 | 認証・復号後の`duplicate_tag`とMnemonic / Networkの意味的一致検証を確認した。 |
| SR-014 | Major | Resolved | specification-review-005 | 同一Chain内のみ重複とし、異なるChainの同一private keyを別Software Keyとして扱う方針が要件・保存形式・テストで一致している。 |
| SR-015 | Major | New | specification-review-006 | 新規Profile作成・復元時に既存Profileの`duplicate_tag`と暗号化Mnemonic / Networkの意味的一致を事前確認できない場合の結果が未定義である。 |
| SR-016 | Major | New | specification-review-006 | Binding決定記録のNative C ABI / WASM `wasm-bindgen`と、仕様のNative C ABI / UniFFI選択可能という記述が、優先順位不明のまま不一致である。 |

## Required Changes

### SR-001

- Priority: Major
- Status: Reopened
- 対象箇所: `docs/specifications/specification.md` §4.2、§14.1
- 問題: 仕様は`symbol-sdk` 3.3.2をHD導出・鍵処理の基準とするが、既存Symbol / NEM Walletの復元互換性について、対象Walletの範囲、版または基準時点、保証範囲および判定責任を一意に定めていない。既存Walletとの互換性をfixtureの範囲に限定する記述だけでは、要件DR-008、AC-033およびOPEN-001の既存Wallet互換性要求の適用範囲を判定できない。
- 根拠: 仕様本文 §4.2、§14.1; 要件本文 §3.2、§12.1; 要件レビュー結果 RR-021; `docs/decisions/open-001.md` §HD Wallet
- 影響: Wallet開発者が既存Mnemonicを復元できることをv1の保証対象と判断できず、fixtureによる受入判定と実際の既存Wallet復元の責任範囲が分岐する。
- 修正内容: 既存Wallet復元互換性の対象範囲、保証の有無・範囲、基準および判定責任を、仕様または追跡可能な承認済み資料から一意に確認できるようにする。追加のWalletを予防的に採用することや、具体的な実装方式をレビューで決定することは求めない。
- 修正完了条件: 対象Walletの範囲、互換性保証の範囲、判定責任およびfixtureまたは受入根拠を、仕様・要件・決定記録から同じ解釈で確認できる。

### SR-015

- Priority: Major
- Status: New
- 対象箇所: `docs/specifications/specification.md` §8.2、§17; `docs/specifications/wallet-store-format-v1.md` §12、§14.1
- 問題: 新規Profileの作成・復元では、既存Profileを認証・復号せず平文`duplicate_tag`と候補値を比較する一方、既存Profileの`duplicate_tag`と暗号化Mnemonic / Networkの意味的一致を事前検証できない場合の登録可否、結果および保存状態を定めていない。§17はStore全体の事前検証を未決定として残している。
- 根拠: 仕様本文 §8.2、§17; 保存フォーマット仕様 §12、§14.1; 要件本文 FR-017、AC-018
- 影響: 既存Storeに意味的不一致を持つProfileがある場合、同一Mnemonic + Networkの重複を拒否するか、新しいProfile作成を許可するか、`InvalidStore`等の失敗とするかが実装ごとに分かれ、FR-017 / AC-018の結果を一意に検証できない。
- 修正内容: 既存Profileの意味的一致を事前確認できない状態について、Profile作成・復元の期待結果、保存状態および既存Profileの扱いを既存要件と整合する形で明記する。全Store事前検証の方式や新規APIを追加で設計することは求めない。
- 修正完了条件: 意味的一致を確認できない既存Profileが存在するケースについて、登録可否、返却結果、input Storeの扱いおよび受入テストを仕様・要件・保存形式から一意に判定できる。

### SR-016

- Priority: Major
- Status: New
- 対象箇所: `docs/specifications/specification.md` §13、§16; `docs/decisions/binding-implementation.md` §決定
- 問題: 仕様はNative BindingをC ABI / UniFFI等から実装側で選択できるとしているが、決定記録はNativeをC ABI、WASMを`wasm-bindgen`に固定している。決定記録の承認状態と仕様に対する優先順位も明記されていないため、正本の解釈が分かれる。
- 根拠: 仕様本文 §13、§16; プロジェクト決定記録 `docs/decisions/binding-implementation.md` §決定。決定記録に承認状態・優先順位の明記がないことも確認した。
- 影響: Native利用者向けのABI、DTO表現、buffer所有権・解放契約の実装対象が一意に定まらず、仕様適合性とBinding境界の検証結果が分岐する。
- 修正内容: `binding-implementation.md`を現行の承認済み決定として仕様へ反映するか、仕様を現行正本とすることおよび既存決定の失効・置換を追跡可能にする。レビューでBinding方式自体を追加選定することは求めない。
- 修正完了条件: Native / WASM Bindingの現行正本、方式、仕様との優先順位および変更履歴を、仕様と決定記録から一意に確認できる。

## Optional Improvements

なし

## Resolved Findings

### SR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §8.1
- 対応確認: Applicationの提示、利用者の明示確認、finalize成功条件、失敗・中断時のProfile非作成が仕様本文と§14.2に定義されている。

### SR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: 保存フォーマット仕様 §2、§7.1、§11
- 対応確認: CBOR、AAD、HMAC入力およびdeterministic表現が保存フォーマット仕様へ固定されている。

### SR-004

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §9、§13
- 対応確認: DTO項目、秘密情報のbyte表現、公開情報、署名結果およびNative/WASM共通結果が定義されている。

### SR-005

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §6.3、§11; 保存フォーマット仕様 §11
- 対応確認: `registry_key` / `duplicate_tag`をAADへ含め、manifest改変時の認証失敗を定義している。

### SR-006

- Priority: Minor
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §10
- 対応確認: 主要な入力、認証、重複、Store、Pending、暗号・乱数失敗を共通error codeへ対応付けている。

### SR-007

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §8.1、§10、§11、§14.2
- 対応確認: Pendingの版、対象Store、認証、重複および失敗時不変条件を確認できる。

### SR-008

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: §9.3
- 対応確認: passwordless `list_software_keys` が`origin`を返さない契約を確認できる。

### SR-009

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: §5.2、§14.2
- 対応確認: 予測不能な乱数源、fallback禁止、妥当性検証および失敗時Profile不変条件を確認できる。

### SR-010

- Priority: Minor
- Status: Resolved
- 初出レビュー: specification-review-003
- 対象箇所: §6.4、§14.2
- 対応確認: パスワード復旧・リセットを提供せず、紛失時に秘密情報処理・変更・削除を成功させないことを確認できる。

### SR-011

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-003
- 対象箇所: §8.3、§9.2
- 対応確認: 表示名をCoreが受け取らず、保存せず、返さず、変更APIを提供しないことを確認できる。

### SR-012

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-004
- 対象箇所: §3.1、§7、§9.2、§10、§11; 保存フォーマット仕様 §6〜§9
- 対応確認: ID一意性、曖昧なStoreの`InvalidStore`処理および対象の一意解決を確認できる。

### SR-013

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-004
- 対象箇所: §6.3、§10、§11、§14.2; 保存フォーマット仕様 §11〜§12
- 対応確認: 認証・復号後に`duplicate_tag`とMnemonic / Networkの意味的一致を検証し、不一致時に正常結果・秘密情報・replacement Storeを返さないことを確認できる。

### SR-014

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-005
- 対象箇所: §5.3、§14.2; 要件 FR-018、AC-020; 保存フォーマット仕様 §9
- 対応確認: 同一Profile・同一Chain・同一private keyだけを重複とし、異なるChainでは別Software Keyとして登録可能とする記述が一致している。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | §1〜§2でCore、Binding、Applicationの責任境界と対象外を確認できる。 |
| 機能と制約 | 合格 | §3〜§10、保存フォーマット仕様および要件で主要機能・入力・出力・制約を確認できる。SR-001、SR-015、SR-016はMajorであり、Criticalな欠落ではない。 |
| 処理と例外 | 合格 | §4.3、§8、§10〜§11、§14で正常系、失敗条件、atomicityおよび検証対象を確認できる。SR-015は既存Storeの境界条件の明確化を要するMajorである。 |
| 内部整合性 | 合格 | Coreの責任、Profile、Mnemonic、Software Key、暗号化および状態変更の基本関係にCriticalな矛盾はない。SR-016は決定記録との正本整合を要するMajorである。 |
| 検証可能性 | 合格 | §14およびAC-001〜AC-043で主要な互換性、暗号、失敗、削除およびBindingを独立検証できる。SR-001、SR-015、SR-016は既存契約の境界を補完するMajorである。 |
| 不可欠な前提の現実性と安全性 | 合格 | `open-001`、`open-002`、`open-validity-001`、保存フォーマット仕様および§5〜§13で主要前提を確認でき、Criticalな未確認前提はない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | `concept-sheet-review-005.md`は「要件定義へ進める」、`requirements-review-004.md`は「仕様設計へ進める」と判定している。前段に仕様設計を妨げるCritical判定はない。 |

## Final Decision

実装へ進める。品質ゲートはすべて合格し、Criticalな欠陥は確認されない。
SR-001、SR-015およびSR-016は既存要件・決定記録・仕様間の整合性を確定するMajor修正であり、実装開始を全面的に妨げるものではない。

# Specification Review Findings

## Review Target

- 対象: `docs/specifications/specification.md`
- 確認日: 2026-08-20 18:00 +0900
- 成果物: `docs/reviews/specifications/specification-review-007.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a01e43-6e5e-7523-b530-e51bf92679ec`
- Reviewer B agent_id: `01a01e43-8a32-7de3-8fdc-92de2e444ac2`
- Reviewer C agent_id: `01a01e43-a254-7320-974b-7b4e9a2befa7`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの agent_id へ全メモを個別送信し、各送信に対応する `multi_agent_v1__wait_agent` の完了を個別確認。submission_id は A: `01a01e4a-26c8-7751-bb9d-a7f890d0fd76`、B: `01a01e4a-26e9-7561-b6ea-6b675483983e`、C: `01a01e4a-2722-7102-8002-cae2165b4da7`
- Chair 統合: 完了

3つの `agent_id` は相互に異なる。起動、Phase 1、Phase 2 の完了および統合完了を確認した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/specification.md` §4.2、§6.3、§7、§8.2、§10、§11、§13、§16、§17 | 前回指摘の対応、Wallet互換性、重複判定、unknown field、Bindingおよび失敗時契約を確認 |
| 保存フォーマット仕様 | `docs/specifications/wallet-store-format-v1.md` §2、§7.1、§11、§14.1 | unknown fieldのopaque保持、AAD、atomicityおよび重複判定境界を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | Coreの責任境界、対象利用者およびv1スコープとの整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 公開された判定と品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` §3.2、FR-017、FR-018、NFR-001〜004、DR-008、AC-018、AC-020、AC-033 | 既存Wallet互換性、Profile重複、Bindingおよび受入条件を確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | RR-021等の公開された未解決事項と前段判定を確認 |
| 承認済み要件またはプロジェクト資料 | `docs/decisions/open-001.md`、`docs/decisions/binding-implementation.md` | HD互換性基準およびBinding決定との整合性を確認。Binding決定の仕様に対する優先順位は未確認 |
| 実装者からの仕様フィードバック | `docs/reviews/implementation/implement-spec-feedback.md` | INTEROP-001、CRITICAL-001、INTEROP-002の公開された解決記録を補助資料として確認。規範根拠とは扱わない |
| 過去仕様レビュー | `docs/reviews/specifications/specification-review-001.md`〜`specification-review-006.md` | SR-001〜SR-016の正式ID、状態、同一性および解消状況を確認 |

## Review Result

実装へ進める

## Summary

前回変更により、HD導出、fatal/skip境界、schema version、AAD、atomicity、Chain別重複および既存Profileの通常復元結果は明確化された。
一方、既存Wallet互換性の対象・保証責任、Binding決定との正本関係、既存要件と復元時の重複例外の整合性は未解決である。
unknown fieldは現行仕様上losslessに保持する方針だが、「forward-compatible wire data」という表現が保存形式の限定より広く読める。
いずれもMajorまたはMinorであり、Criticalな品質ゲート不合格は確認しないため、判定は実装へ進めるとする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Open | specification-review-001 | SDK 3.3.2の導出規則は固定されたが、既存Wallet互換性の対象・保証・判定責任・fixtureが未確定のままである。 |
| SR-002 | Major | Resolved | specification-review-001 | §8.1でMnemonic提示、利用者確認、finalize条件、失敗・中断時のProfile非作成を確認した。 |
| SR-003 | Major | Resolved | specification-review-001 | 保存形式仕様でCBOR、AAD、HMAC入力およびdeterministic表現を確認した。 |
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
| SR-014 | Major | Resolved | specification-review-005 | 同一Chain内のみ重複とし、異なるChainの同一private keyを別Software Keyとして扱う方針が一致している。 |
| SR-015 | Major | Open | specification-review-006 | §8.2の「平文tag不一致なら拒否しない」例外が、FR-017 / AC-018の同一Mnemonic + Network重複拒否と整合していない。 |
| SR-016 | Major | Open | specification-review-006 | Binding決定記録のNative C ABI / WASM `wasm-bindgen`と、仕様の実装選択可能という記述が不一致である。 |
| SR-017 | Minor | New | specification-review-007 | unknown fieldの限定的opaque保持を「forward-compatible wire data」と表現し、一般的な将来互換性と区別していない。 |

## Required Changes

### SR-001

- Priority: Major
- Status: Open
- 対象箇所: §4.2、§14.1、§17
- 問題: `symbol-sdk` 3.3.2との導出結果は固定されたが、既存Symbol / NEM Walletとの復元互換性について、対象Wallet、保証範囲、判定責任および受入fixtureを一意に定めていない。§17は未列挙Walletを保証しないとしている一方、要件DR-008、AC-033および`open-001.md`は既存Wallet互換性を要求している。
- 根拠: 仕様本文 §4.2、§14.1、§17; 要件本文 DR-008、AC-033; 要件レビュー結果 RR-021; `docs/decisions/open-001.md` §HD Wallet
- 影響: 既存Walletからの復元可否、互換性保証の責任範囲および受入判定が実装者ごとに分岐する。
- 修正内容: 既存Wallet互換性の対象、保証の有無・範囲、判定責任およびfixture/受入根拠を、既存要件または追跡可能な承認済み資料から一意に確認できるようにする。新しいWallet対象や実装方式は追加要求しない。
- 修正完了条件: 既存Wallet互換性の適用範囲と受入根拠を、仕様・要件・決定記録から同じ解釈で確認できる。

### SR-015

- Priority: Major
- Status: Open
- 対象箇所: §8.2、§17; 保存フォーマット仕様 §12、§14.1
- 問題: 候補の`duplicate_tag`が既存Profileの平文tagと不一致なら、暗号化Mnemonicとの意味的一致を検証できなくても復元を拒否しないと定めている。しかしFR-017 / AC-018は、同一Mnemonic + 同一Networkの既存Profile重複登録をMUSTとして拒否する。この例外は承認済み要件・決定記録に明示されていない。
- 根拠: 仕様本文 §8.2、§17; 保存フォーマット仕様 §12、§14.1; 要件本文 FR-017、AC-018; 前回仕様レビュー SR-015
- 影響: 既存Profileが同一Mnemonic + Networkであるにもかかわらずtag不整合だけで検出できない場合、重複Profileを作成できる解釈が残り、要件の受入結果と保存状態が分岐する。
- 修正内容: 不一致・意味検証不能時の復元結果をFR-017 / AC-018に整合させるか、この例外を承認済み要件または決定記録として明示し、重複拒否の適用範囲を確定する。全Store事前復号などの方式はレビューで指定しない。
- 修正完了条件: 同一Mnemonic + Networkの既存Profileがtag不整合または意味検証不能な場合の登録可否、結果、input Storeおよび受入条件を一意に判定できる。

### SR-016

- Priority: Major
- Status: Open
- 対象箇所: §13、§16、§17; `docs/decisions/binding-implementation.md` §決定
- 問題: 仕様はNative BindingをC ABI / UniFFI等から実装側で選択できるとしているが、決定記録はNative C ABI、WASM `wasm-bindgen`を決定している。決定記録の有効性・仕様との優先順位も明記されていない。
- 根拠: 仕様本文 §13、§16、§17; `docs/decisions/binding-implementation.md` §決定; 前回仕様レビュー SR-016
- 影響: Native ABI、WASM搬送方式、DTO、buffer所有権および解放契約の適合判定が分岐する。
- 修正内容: 現行Bindingの正本、方式および仕様との優先順位を明示し、仕様と決定記録を同じ契約へ揃える。Binding方式自体の再選定は要求しない。
- 修正完了条件: Native / WASM Bindingの現行正本、方式、優先順位および変更履歴を仕様・決定記録から一意に確認できる。

## Optional Improvements

### SR-017

- Priority: Minor
- Status: New
- 対象箇所: §6.3、§7、§11; 保存フォーマット仕様 §2、§11
- 改善内容: unknown fieldの扱いを、既存wire値の限定的なopaque/lossless保持であり、将来versionの一般的な前方互換性や意味解釈を保証しないものとして表現する。
- 根拠: 仕様本文 §6.3; 保存フォーマット仕様 §2、§11
- 影響: 実装者がunknown fieldを将来仕様として意味解釈したり、限定された保持規則を一般的な互換性保証と誤解する余地を減らせる。

## Resolved Findings

### SR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §8.1
- 対応確認: Mnemonic提示、利用者確認、finalize成功条件、失敗・中断時のProfile非作成を確認した。

### SR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: 保存フォーマット仕様 §2、§7.1、§11
- 対応確認: CBOR、AAD、HMAC入力およびdeterministic表現を確認した。

### SR-004

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §9、§13
- 対応確認: DTO、byte表現、公開情報、署名結果およびNative/WASM共通結果を確認した。

### SR-005

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §6.3、§11; 保存フォーマット仕様 §11
- 対応確認: `registry_key` / `duplicate_tag`をAADへ含め、改変時の認証失敗を確認した。

### SR-006

- Priority: Minor
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §10
- 対応確認: 主要な入力、認証、重複、Store、Pending、暗号・乱数失敗を共通error codeへ対応付けた。

### SR-007

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §8.1、§10、§11、§14.2
- 対応確認: Pendingの版、対象Store、認証、重複および失敗時不変条件を確認した。

### SR-008

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: §9.3
- 対応確認: passwordless `list_software_keys` が`origin`を返さない契約を確認した。

### SR-009

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: §5.2、§14.2
- 対応確認: 予測不能な乱数源、fallback禁止、妥当性検証および失敗時Profile不変条件を確認した。

### SR-010

- Priority: Minor
- Status: Resolved
- 初出レビュー: specification-review-003
- 対象箇所: §6.4、§14.2
- 対応確認: パスワード復旧・リセットを提供せず、紛失時に秘密情報処理・変更・削除を成功させないことを確認した。

### SR-011

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-003
- 対象箇所: §8.3、§9.2
- 対応確認: 表示名をCoreが受け取らず、保存せず、返さず、変更APIを提供しないことを確認した。

### SR-012

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-004
- 対象箇所: §3.1、§7、§9.2、§10、§11; 保存フォーマット仕様 §6〜§9
- 対応確認: ID一意性、曖昧なStoreの`InvalidStore`処理および対象の一意解決を確認した。

### SR-013

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-004
- 対象箇所: §6.3、§10、§11、§14.2; 保存フォーマット仕様 §11〜§12
- 対応確認: 認証・復号後に`duplicate_tag`とMnemonic / Networkの意味的一致を検証し、不一致時に正常結果・秘密情報・replacement Storeを返さないことを確認した。

### SR-014

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-005
- 対象箇所: §5.3、§14.2; 要件 FR-018、AC-020; 保存フォーマット仕様 §9
- 対応確認: 同一Profile・同一Chain・同一private keyだけを重複とし、異なるChainでは別Software Keyとして登録可能とする記述を確認した。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | §1〜§2でCore、Binding、Applicationの責任境界と対象外を確認できる。 |
| 機能と制約 | 合格 | §3〜§10、保存フォーマット仕様および要件で主要機能・入力・出力・制約を確認できる。SR-001、SR-015、SR-016はMajorであり、Criticalな欠落ではない。 |
| 処理と例外 | 合格 | §4.3、§8、§10〜§11、§14で正常系、失敗条件、atomicityおよび検証対象を確認できる。SR-015は既存要件との整合を要するMajorである。 |
| 内部整合性 | 合格 | Profile、Mnemonic、Software Key、暗号化、Bindingおよび状態変更の基本関係にCriticalな矛盾はない。SR-016は決定記録との正本整合を要するMajorである。 |
| 検証可能性 | 合格 | §14およびAC-001〜AC-043で主要な互換性、暗号、失敗、削除およびBindingを独立検証できる。SR-001、SR-015、SR-016は既存契約の境界を補完するMajorである。 |
| 不可欠な前提の現実性と安全性 | 合格 | `open-001`、`open-002`、`open-validity-001`、保存フォーマット仕様および§5〜§13で主要前提を確認でき、Criticalな未確認前提はない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | `concept-sheet-review-005.md`は「要件定義へ進める」、`requirements-review-004.md`は「仕様設計へ進める」と判定している。前段に仕様設計を妨げるCritical判定はない。 |

## Final Decision

実装へ進める。品質ゲートはすべて合格し、Criticalな欠陥は確認されない。
SR-001、SR-015およびSR-016は既存要件・決定記録・仕様間の整合性を確定するMajor修正、SR-017は既存のunknown field責任境界を明確化するMinorである。

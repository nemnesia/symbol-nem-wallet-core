# Specification Review Findings

## Review Target

- 対象: `docs/specifications/specification.md`
- 確認日: 2026-08-20 05:25 +0900
- 成果物: `docs/reviews/specifications/specification-review-003.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a01baa-958f-75b0-a584-d8b38bb22edb`
- Reviewer B agent_id: `01a01baa-adf8-7721-9eb8-a277ca0a6aae`
- Reviewer C agent_id: `01a01baa-c5ed-7341-9b18-a6d15173e6b4`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの agent_id へ全メモを個別送信し、補正版送信を含め各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/specification.md` §1〜§17、特に§4.2、§6.4、§8.1、§8.3、§9、§10〜§14 | HD導出、初回受渡し、名称管理、API DTO、認証、エラー、Binding境界および検証条件を確認 |
| 保存フォーマット仕様 | `docs/specifications/wallet-store-format-v1.md` §7、§11 | optional metadata、名前、AAD、manifest整合性およびwire表現を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 対象利用者、提供価値、Core / Application / UIの責任境界および対象範囲を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 実在する最大連番レビューとして、公開された判定「要件定義へ進める」と品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` §2〜§12、特にSEC-013、FR-001/019、DR-008、AC-001/030/033/034 | パスワード復旧禁止、初回受渡し、HD互換性、Core/Application責任境界および受入条件を確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | 公開された判定「仕様設計へ進める」、RR-020〜RR-022および品質ゲートを確認。本文が参照する不存在の `concept-sheet-review-006.md` は未確認とし、実在する `concept-sheet-review-005.md` を確認 |
| 承認済み要件またはプロジェクト資料 | `docs/decisions/open-001.md`、`docs/decisions/open-002.md`、`docs/decisions/open-validity-001.md` | 互換性、パスワード責任、Mnemonic / 秘密鍵の妥当性・安全性判定責任を確認 |
| 過去仕様レビュー | `docs/reviews/specifications/specification-review-001.md`、`specification-review-002.md` | SR-001〜SR-009の同一性、対応状況および正式IDを引き継ぎ確認 |
| 実装者からの仕様フィードバック | 未確認 | 対応する実装ソースの単一 source-root と指定ファイルを確認できないため |

## Review Result

実装へ進める

## Summary

仕様書は、前回指摘されたHD導出、保存形式・AAD、DTO、Pending、error mapping、Generated Keyおよび一覧APIの契約を具体化した。
これらに対応する SR-001、SR-003〜SR-009 は解消と確認した。
初回Mnemonic受渡しの外部から判定可能な完了条件はなお不足しており、SR-002をOpen Majorとして引き継ぐ。
また、承認済み要件から追跡できない名前管理のCore機能と、パスワード復旧禁止の明示不足を記録するが、Criticalな欠陥はない。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Resolved | specification-review-001 | §4.2でHD導出規則、path、`symbol-sdk` 3.3.2基準および特定Wallet主張のfixture範囲を固定した。 |
| SR-002 | Major | Open | specification-review-001 | §8.1は責任と失敗時状態を定めるが、受渡し完了の外部判定条件が不明確である。 |
| SR-003 | Major | Resolved | specification-review-001 | 保存形式§7.3・§11でoptional field、CBOR、AAD、HMAC入力の表現を固定した。 |
| SR-004 | Major | Resolved | specification-review-001 | §9でDTO、byte表現、署名結果およびNative/WASM同一性を定めた。 |
| SR-005 | Major | Resolved | specification-review-001 | `registry_key` / `duplicate_tag`をAAD対象とし、改変時の認証失敗を定めた。 |
| SR-006 | Minor | Resolved | specification-review-001 | §10で主要失敗条件と共通error codeを対応付けた。 |
| SR-007 | Major | Resolved | specification-review-001 | §8.1と§14.2でPendingの版、Store結合、認証、重複、失敗時不変条件を定めた。 |
| SR-008 | Major | Resolved | specification-review-002 | §9.3でpasswordless一覧から`origin`を除外した。 |
| SR-009 | Major | Resolved | specification-review-002 | §5.2と§14.2で予測不能な乱数源、fallback禁止、失敗時不変条件を定めた。 |
| SR-010 | Minor | New | specification-review-003 | SEC-013/AC-030のパスワード復旧・リセット禁止が仕様本文に明示されていない。 |
| SR-011 | Major | New | specification-review-003 | Profile/Account名の永続化・変更API・AAD対象化が承認済みCore要件から追跡できない。 |

## Required Changes

### SR-002

- Priority: Major
- Status: Open
- 対象箇所: `specification.md:284-292`
- 問題: 初回Mnemonic受渡しの確認方法と受領者確認をApplication / 利用者の責任とする一方、どの外部条件を満たせば `finalize_generated_profile` を呼べるかが一意でない。
- 根拠: 要件本文 `FR-001`・`FR-019`・`SEC-010`・`SEC-017`・`AC-001`・`AC-034`、要件レビュー結果 `RR-022`、コンセプト本文 §4・§7
- 影響: バックアップ未完了または意図しない受渡しでもProfile作成が成功扱いとなり、復元可能性とCore / Applicationの責任境界を受入判定できない。
- 修正内容: UI方式を指定せず、Profile作成成功となる受渡し完了条件、確認責任および失敗・中断時のProfile状態を外部から判定可能にする。
- 修正完了条件: 受渡し成功・失敗・中断、責任主体およびProfile作成可否を仕様から一意に判定できる。

### SR-011

- Priority: Major
- Status: New
- 対象箇所: `specification.md:298-302, 349-429, 601-612, 750`; `wallet-store-format-v1.md:196-223, 299-330`
- 問題: Profile/Account名の永続化、平文metadata、AAD対象化、`set_profile_name` / `set_software_key_name`、再暗号化・atomic mutationが仕様へ追加されているが、承認済み要件はこれらのCore管理・変更APIを要求していない。コンセプトおよび要件では表示・ウォレット固有設定はUI / Application側の責任である。
- 根拠: 要件本文 §2.2・§2.4、`FR-019`、コンセプト本文 §7、仕様本文 §8.3・§9.2
- 影響: 未承認の永続データ、wire形式、Core / Binding API、状態変更および検証範囲がv1へ入り、CoreとApplicationの責任境界が拡大する。
- 修正内容: 名前の保存・変更をv1 Core仕様から除外するか、Coreによる永続化・変更APIを承認する要件または決定記録を明示する。新しい名前管理方式は提案しない。
- 修正完了条件: 名前機能のCore責任とAPI範囲が承認済み資料から追跡でき、または未承認の名前機能が仕様から除外されている。

## Optional Improvements

### SR-010

- Priority: Minor
- Status: New
- 対象箇所: `specification.md:236-240, 344-464, 547-593`
- 改善内容: v1ではProfileパスワードの復旧・リセットを提供せず、正しいパスワードを必要とする処理を紛失時に成功させないことを明記する。
- 根拠: 要件本文 `SEC-013`・`AC-030`、仕様本文 §6.4・§9.2・§10
- 影響: 実装者が、現在のパスワードを要求しない復旧・リセット経路を仕様範囲内と解釈する余地を減らせる。新APIや復旧方式は要求しない。

## Resolved Findings

### SR-001

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `specification.md:111-139, 684-690`
- 対応確認: HD導出の規範、固定path、`symbol-sdk` 3.3.2基準、特定Walletの追加主張をfixture範囲に限定する条件を確認した。

### SR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `wallet-store-format-v1.md:221, 326, 475-507`
- 対応確認: optional map keyの省略、CBOR null拒否、AAD内の同一表現、HMAC入力およびdeterministic encodingを確認した。

### SR-004

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `specification.md:316-543`
- 対応確認: DTO項目、秘密情報のbyte表現、公開鍵・アドレス・署名結果およびNative/WASM同一性を確認した。

### SR-005

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `specification.md:230, 614`; `wallet-store-format-v1.md:475-507`
- 対応確認: `registry_key` / `duplicate_tag`をAADへ含め、改変時に認証失敗とする条件を確認した。

### SR-006

- Priority: Minor
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `specification.md:577-593`
- 対応確認: 主要な入力、認証、重複、Store、Pending、暗号・乱数失敗を既存error codeへ対応付けた。

### SR-007

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `specification.md:288-292, 719-721`
- 対応確認: Pendingのversion、対象Store結合、認証、改ざん、重複、失敗時input Store不変条件を確認した。

### SR-008

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: `specification.md:481-495, 719`
- 対応確認: passwordless `list_software_keys` が `SoftwareKeyListItem` を返し、`origin`を含めない契約を確認した。

### SR-009

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: `specification.md:171-181, 721`
- 対応確認: 予測不能な乱数源、禁止fallback、候補鍵の妥当性検証、乱数源失敗時のProfile不変条件を確認した。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | 仕様§1〜§2でCore、Binding、Applicationの責任境界と対象外を確認できる。SR-011は範囲整合性のMajorとして記録した。 |
| 機能と制約 | 合格 | 仕様§3〜§10および要件FR/SEC/DRで主要機能・制約を確認できる。SR-002とSR-011は既存契約の補完・範囲修正でありCriticalではない。 |
| 処理と例外 | 合格 | 仕様§4.3、§8、§10〜§11、§14で正常系、失敗条件、Pending、atomicityを確認できる。SR-002は受渡し判定条件のMajor補完である。 |
| 内部整合性 | 合格 | HD、保存形式、AAD、DTO、Bindingおよび状態変更の基本関係にCriticalな矛盾はない。SR-011は要件とのスコープ不整合として記録した。 |
| 検証可能性 | 合格 | 仕様§14と要件AC-001〜AC-043で主要な互換性、暗号、失敗、削除、Bindingを検証できる。SR-002、SR-010、SR-011は既存契約の明示・範囲整合性の補完である。 |
| 不可欠な前提の現実性と安全性 | 合格 | `open-001`、`open-002`、`open-validity-001`および仕様§5〜§13で互換性、認可、秘密情報保護、乱数、AADの前提を確認できる。Criticalな未確認前提はない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | 実在する `concept-sheet-review-005.md` は「要件定義へ進める」、`requirements-review-004.md` は「仕様設計へ進める」と判定している。前段にCriticalなブロック判定はない。 |

## Final Decision

実装へ進める。SR-001、SR-003〜SR-009は対応済みと確認した。
SR-002とSR-011は既存要件への適合に必要なMajor修正、SR-010は既存のパスワード責任境界を明示するMinorとして記録するが、Criticalな品質ゲート不合格はない。

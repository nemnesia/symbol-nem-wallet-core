# Specification Review Findings

## Review Target

- 対象: docs/specifications/specification.md
- 確認日: 2026-08-20 08:05 +0900
- 成果物: docs/reviews/specifications/specification-review-005.md

## Execution Audit

- 実行モード: multi_agent_v1__spawn_agent で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: 01a01c3b-85f5-7673-8d0a-220b8471671b
- Reviewer B agent_id: 01a01c3b-b502-79a1-ac7b-098d855b2070
- Reviewer C agent_id: 01a01c3b-e2c7-79c1-b88e-8de6cf92df1f
- Phase 1: 完了。各 Reviewer の multi_agent_v1__wait_agent で個別確認
- Phase 2: 完了。同じ3つの agent_id へ全メモを個別送信し、各送信に対応する multi_agent_v1__wait_agent の完了を個別確認。submission_id は A: 01a01c43-973b-7b82-a55f-1585d9e41bc2、B: 01a01c44-0bdb-7da1-a65f-019bb305c832、C: 01a01c44-7f97-70e2-87db-2484c1d7b5dc
- Chair 統合: 完了

3つの agent_id は相互に異なる。起動、Phase 1、Phase 2 の完了および統合完了を確認した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | docs/specifications/specification.md §1〜§18、特に§4.2、§5.3、§6.3、§7、§10、§14.2、§17 | HD導出、Chain別Software Key、重複判定、ID・保存状態の検証、エラー、テストおよび未確認事項を確認 |
| 保存フォーマット仕様 | docs/specifications/wallet-store-format-v1.md §7.1、§9、§12、§14.1 | Software KeyのChain別重複条件、duplicate_tag、既存Profileの意味的一致検証範囲を確認 |
| コンセプト本文 | docs/consept/concept-sheet.md §1〜§13 | Symbol / NEMの共通Core利用、対象利用者、提供価値および責任境界を確認 |
| コンセプトレビュー結果 | docs/reviews/concept/concept-sheet-review-005.md | 対象ベース名の最大連番として、公開された判定「要件定義へ進める」と品質ゲートを確認 |
| 要件本文 | docs/requirements/requirements.md UC-009、FR-013、FR-018、DR-005、DR-007、AC-020、SEC-013、AC-030 | Symbol / NEMの共通利用、同一Profile内の秘密鍵重複禁止、パスワード復旧禁止および受入条件を確認 |
| 要件レビュー結果 | docs/reviews/requirements/requirements-review-004.md | 公開された判定「仕様設計へ進める」、前段の品質ゲートおよび既存要件を確認 |
| 承認済み要件またはプロジェクト資料 | docs/decisions/open-001.md、docs/decisions/open-002.md、docs/decisions/open-validity-001.md、docs/decisions/requirements-baseline-001.md | 互換性、パスワード責任、妥当性および現行要件正本を確認 |
| 過去仕様レビュー | docs/reviews/specifications/specification-review-001.md〜specification-review-004.md | SR-001〜SR-013の正式ID、状態、同一性および対応状況を確認 |
| 実装者からの仕様フィードバック | 未確認 | 単一の実装 source-root と指定されたフィードバックファイルを確認できないため |

## Review Result

実装へ進める

## Summary

現行仕様は、前回のSR-012（ID一意性）およびSR-013（duplicate_tagの意味的一致検証）を仕様・保存形式・テストへ反映している。
一方、異なるChainの同一private keyを別Software Keyとして許可する記述が、同一Profile内の同一秘密鍵重複禁止を定める要件と衝突し、SR-014をMajorとして記録する。
SR-010はパスワード復旧・リセット禁止の明示不足としてOpenで継続する。
Criticalな品質ゲート不合格は確認されないため、判定は実装へ進めるとする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Resolved | specification-review-001 | §4.2、§14.1でHD導出規則、path、symbol-sdk 3.3.2基準およびfixture範囲を確認した。 |
| SR-002 | Major | Resolved | specification-review-001 | §8.1でMnemonic提示、利用者確認、finalize条件、失敗・中断時のProfile非作成を確認した。 |
| SR-003 | Major | Resolved | specification-review-001 | 保存形式仕様でCBOR、AAD、HMAC入力およびdeterministic表現を確認した。 |
| SR-004 | Major | Resolved | specification-review-001 | §9でDTO、byte表現、公開情報、署名結果およびNative/WASM同一性を確認した。 |
| SR-005 | Major | Resolved | specification-review-001 | registry_key / duplicate_tagをAAD対象とし、manifest改変時の認証失敗を確認した。 |
| SR-006 | Minor | Resolved | specification-review-001 | §10で主要な失敗条件と共通error codeの対応を確認した。 |
| SR-007 | Major | Resolved | specification-review-001 | §8.1、§10、§11、§14.2でPendingの検証、重複、認証および失敗時不変条件を確認した。 |
| SR-008 | Major | Resolved | specification-review-002 | passwordless list_software_keys がoriginを返さない契約を確認した。 |
| SR-009 | Major | Resolved | specification-review-002 | 予測不能な乱数源、fallback禁止、妥当性検証および失敗時不変条件を確認した。 |
| SR-010 | Minor | Open | specification-review-003 | SEC-013/AC-030に対応するパスワード復旧・リセット禁止と紛失時の失敗結果が仕様本文に未明記である。 |
| SR-011 | Major | Resolved | specification-review-003 | §8.3、§9.2で表示名管理をCore v1の対象外と確認した。 |
| SR-012 | Major | Resolved | specification-review-004 | profile_idとProfile内key_idの一意性、曖昧なStoreのInvalidStore処理を確認した。 |
| SR-013 | Major | Resolved | specification-review-004 | 認証・復号後のduplicate_tagとMnemonic / Networkの意味的一致検証を確認した。 |
| SR-014 | Major | New | specification-review-005 | Chainをまたぐ同一private keyの重複判定について、仕様のChain例外と要件のChain例外なしが衝突している。 |

## Required Changes

### SR-014

- Priority: Major
- Status: New
- 対象箇所: docs/specifications/specification.md §4.2、§4.3、§5.3、§14.2、§17; docs/specifications/wallet-store-format-v1.md §9
- 問題: 現行仕様と保存形式仕様は、異なるChainの同一private keyを別Software Keyとして扱い、同一Chainの場合だけ重複とする。一方、要件FR-018、DR-007、AC-020は同一Profile内の同一秘密鍵をChainによらず重複管理しないと定め、Chain例外を明記していない。仕様§17もこの不整合を未確認事項として残している。
- 根拠: 仕様本文 §5.3、§14.2、§17; 保存フォーマット仕様 §9; 要件本文 FR-018、DR-007、AC-020。FR-013およびUC-009は同一ProfileでSymbol / NEMのSoftware Keyを扱う範囲の確認に使用した。
- 影響: 同一Profileで異なるChainの同一private keyを導出・インポートした場合に、登録成功とするかDuplicateSoftwareKeyとするかが一意に決まらない。Testnetでは同一Mnemonicとaccount indexから同一private keyが得られ得るため、AC-020の受入判定、登録・削除・重複判定の期待結果が仕様と要件で分岐する。
- 修正内容: Chainをまたぐ同一private keyの重複判定範囲と期待結果を、要件または承認済みDecisionで確定する。確定した方針に合わせて、仕様、保存フォーマット仕様、FR-018、DR-007、AC-020、関連するFR-013 / UC-009およびテスト条件の記述を一貫させる。レビューで採用方針自体や実装方式を決定しない。
- 修正完了条件: 同一Profile内で同一private keyを異なるChainへ登録するケースについて、登録可否、返す結果、保存状態および受入テストを仕様・要件・承認済みDecisionから同じ解釈で判定できる。

## Optional Improvements

### SR-010

- Priority: Minor
- Status: Open
- 対象箇所: docs/specifications/specification.md §6.4、§8.4、§9.2、§10
- 改善内容: v1ではProfileパスワードの復旧・リセットを提供せず、紛失時は正しいProfileパスワードを必要とする秘密情報処理、パスワード変更および削除を成功させないことを明記する。
- 根拠: 要件本文 SEC-013、AC-030; 過去仕様レビュー specification-review-004.md のSR-010
- 影響: 実装者が現在のパスワードを要求しない復旧・リセット経路を仕様範囲内と解釈する余地を減らし、既存の認証責任と受入条件を明確にできる。復旧方式や追加APIは要求しない。

## Resolved Findings

### SR-001

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: docs/specifications/specification.md §4.2、§14.1
- 対応確認: HD導出の規範、固定path、symbol-sdk 3.3.2基準および特定Walletの追加主張をfixture範囲に限定する条件を確認した。

### SR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: docs/specifications/specification.md §8.1
- 対応確認: ApplicationがMnemonicを提示し利用者の明示確認後だけfinalizeを呼ぶこと、確認前・受渡し失敗・中断・finalize失敗時にProfileを残さないことを確認した。

### SR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: docs/specifications/wallet-store-format-v1.md §7.1、§11〜§12
- 対応確認: optional field、CBOR null拒否、AAD内の同一表現、HMAC入力およびdeterministic encodingを確認した。

### SR-004

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: docs/specifications/specification.md §9、§13
- 対応確認: DTO項目、秘密情報のbyte表現、公開鍵・アドレス・署名結果およびNative/WASM同一性を確認した。

### SR-005

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: docs/specifications/specification.md §6.3、§11; docs/specifications/wallet-store-format-v1.md §11
- 対応確認: registry_key / duplicate_tagをAADへ含め、manifest改変時に認証失敗とする条件を確認した。

### SR-006

- Priority: Minor
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: docs/specifications/specification.md §10〜§11
- 対応確認: 主要な入力、認証、重複、Store、Pending、暗号・乱数失敗を既存error codeへ対応付けた。

### SR-007

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: docs/specifications/specification.md §8.1、§11、§14.2
- 対応確認: Pendingのversion、対象Store結合、認証、改ざん、重複および失敗時input Store不変条件を確認した。

### SR-008

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: docs/specifications/specification.md §9.3
- 対応確認: passwordless list_software_keys がSoftwareKeyListItemを返し、originを含めない契約を確認した。

### SR-009

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: docs/specifications/specification.md §5.2、§14.2
- 対応確認: 予測不能な乱数源、禁止fallback、候補鍵の妥当性検証、乱数源失敗時のProfile不変条件を確認した。

### SR-011

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-003
- 対象箇所: docs/specifications/specification.md §8.3、§9.2; docs/decisions/specification-review-003-resolution.md
- 対応確認: 表示名をCoreが受け取らず、保存せず、返さず、変更APIを提供しないこと、およびApplication責任とする方針を確認した。

### SR-012

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-004
- 対象箇所: docs/specifications/specification.md §3.1、§7、§9.2、§10、§11、§14.2; docs/specifications/wallet-store-format-v1.md §6、§7.1、§8、§9
- 対応確認: profile_idとProfile内key_idの一意性、曖昧なIDを含むStoreをInvalidStoreとして拒否する条件、対象の一意解決および検証fixtureを確認した。

### SR-013

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-004
- 対象箇所: docs/specifications/specification.md §6.3、§10、§11、§14.2; docs/specifications/wallet-store-format-v1.md §11〜§12
- 対応確認: AEAD認証後にduplicate_tagと復号済みMnemonic / Networkの意味的一致を検証し、不一致時に正常結果・秘密情報・replacement Storeを返さない条件を確認した。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | 仕様§1〜§2でCore、Binding、Applicationの責任境界と対象外を確認できる。 |
| 機能と制約 | 合格 | 仕様§3〜§10、保存形式仕様および要件FR/SEC/DRで主要機能・入力・出力・制約を確認できる。SR-014は既存要件との整合を要するMajorであり、Criticalな欠落ではない。 |
| 処理と例外 | 合格 | 仕様§4.3、§8、§10〜§11、§14で正常系、失敗条件、atomicityおよび検証対象を確認できる。SR-014はChain別重複の期待結果を整合させる補完である。 |
| 内部整合性 | 合格 | 仕様内部のProfile、Mnemonic、Software Key、Network、暗号化、Bindingおよび状態変更の関係にCriticalな矛盾はない。SR-014は仕様と上流要件の整合性に関するMajorである。 |
| 検証可能性 | 合格 | 仕様§14と要件AC-001〜AC-043で主要な互換性、暗号、失敗、削除およびBindingを独立検証できる。SR-014は境界ケースの期待結果を要件と仕様で統一するためのMajorである。 |
| 不可欠な前提の現実性と安全性 | 合格 | open-001、open-002、open-validity-001、保存形式仕様および仕様§5〜§13で互換性、妥当性、認可、秘密情報保護およびatomicityの前提を確認できる。Criticalな未確認前提はない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | concept-sheet-review-005.mdは「要件定義へ進める」、requirements-review-004.mdは「仕様設計へ進める」と判定しており、前段に仕様設計を妨げるCriticalなブロック判定はない。SR-014は上流要件との整合確認を要するMajorである。 |

## Final Decision

実装へ進める。品質ゲートはすべて合格し、Criticalな欠陥は確認されない。
SR-014は既存MUST要件と仕様のChain別重複条件を整合させるMajor修正、SR-010は既存のパスワード責任境界を明示するMinorの継続指摘として記録する。

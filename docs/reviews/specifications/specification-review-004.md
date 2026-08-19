# Specification Review Findings

## Review Target

- 対象: `docs/specifications/specification.md`
- 確認日: 2026-08-20 06:50 +0900
- 成果物: `docs/reviews/specifications/specification-review-004.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a01bf5-9755-76b1-b990-75fa0d75b0ee`
- Reviewer B agent_id: `01a01bf5-c2a6-7e01-b415-8624679d2343`
- Reviewer C agent_id: `01a01bf5-f5e3-7242-8126-483bb1fc7ef3`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの agent_id へ全メモを個別送信し、各 Reviewer の `submission_id`（A: `01a01bfd-9da2-7323-83f0-d225e4b69e3b`、B: `01a01bfd-f8d1-75b2-a184-e52ef053796b`、C: `01a01bfe-542f-7e81-81fb-f50f4c4142aa`）に対応する `multi_agent_v1__wait_agent` の完了を個別確認
- Chair 統合: 完了

3つの `agent_id` は相互に異なる。起動、Phase 1、Phase 2 の完了および統合完了を確認した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/specification.md` §1〜§17、特に§3.1、§6.3〜§6.4、§7、§8、§9.2、§10〜§11、§14.2 | Coreの責任、ID、保存状態、API対象指定、認証、重複判定、atomicity、エラーおよび検証条件を確認 |
| 保存フォーマット仕様 | `docs/specifications/wallet-store-format-v1.md` §6、§7.1、§8、§9、§11〜§12 | `profile_id`、`key_id`、`software_key_index`、AADおよび`duplicate_tag`のwire-level条件を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 対象利用者、提供価値、Core / Application / UIの責任境界および対象範囲を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 対象ベース名の最大連番として、公開された判定「要件定義へ進める」と品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` §2〜§12、特にFR-017、FR-018、SEC-004、SEC-013、SEC-019、DR-006、DR-007、AC-017、AC-018、AC-020、AC-030、AC-039 | 重複禁止、破損データ拒否、Profile間分離、パスワード復旧禁止および受入条件を確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | 公開された判定「仕様設計へ進める」、前段の品質ゲートおよび既存要求を確認 |
| 承認済み要件またはプロジェクト資料 | `docs/decisions/open-001.md`、`docs/decisions/open-002.md`、`docs/decisions/open-validity-001.md`、`docs/decisions/requirements-baseline-001.md`、`docs/decisions/specification-review-003-resolution.md` | 互換性、パスワード責任、妥当性、要件正本および過去指摘の対応方針を確認 |
| 過去仕様レビュー | `docs/reviews/specifications/specification-review-001.md`〜`specification-review-003.md` | SR-001〜SR-011の正式ID、状態、同一性および対応状況を確認 |
| 実装者からの仕様フィードバック | 未確認 | 単一の実装 source-root と指定されたフィードバックファイルを確認できないため |

## Review Result

実装へ進める

## Summary

仕様書は、v1の対象範囲、秘密情報保護、主要API、保存形式との境界、状態遷移および検証方針を定義している。
過去のSR-001〜SR-009は対応済みであり、SR-002とSR-011も現行仕様および対応方針により解消と確認した。
SR-010はパスワード復旧・リセット禁止の明示不足としてOpenで継続する。
さらに、対象IDの一意性（SR-012）と`duplicate_tag`の意味的一貫性検証（SR-013）をMajorとして記録するが、Criticalな品質ゲート不合格はない。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Resolved | specification-review-001 | §4.2でHD導出規則、path、`symbol-sdk` 3.3.2基準およびfixture範囲を固定した。 |
| SR-002 | Major | Resolved | specification-review-001 | §8.1と対応方針でMnemonic提示、利用者確認、finalize条件、失敗・中断時のProfile非作成を確認した。 |
| SR-003 | Major | Resolved | specification-review-001 | 保存形式仕様でCBOR、AAD、HMAC入力およびdeterministic表現を固定した。 |
| SR-004 | Major | Resolved | specification-review-001 | §9でDTO、byte表現、公開情報、署名結果およびNative/WASM同一性を確認した。 |
| SR-005 | Major | Resolved | specification-review-001 | `registry_key` / `duplicate_tag`をAAD対象とし、manifest改変時の認証失敗を確認した。 |
| SR-006 | Minor | Resolved | specification-review-001 | §10で主要な失敗条件と共通error codeの対応を確認した。 |
| SR-007 | Major | Resolved | specification-review-001 | §8.1、§10、§11および§14.2でPendingの版、対象Store、認証、重複および失敗時不変条件を確認した。 |
| SR-008 | Major | Resolved | specification-review-002 | passwordless `list_software_keys` が`origin`を返さない契約を確認した。 |
| SR-009 | Major | Resolved | specification-review-002 | 予測不能な乱数源、fallback禁止、妥当性検証および失敗時Profile不変条件を確認した。 |
| SR-010 | Minor | Open | specification-review-003 | SEC-013/AC-030に対応するパスワード復旧・リセット禁止と紛失時の失敗結果が仕様本文に未明記である。 |
| SR-011 | Major | Resolved | specification-review-003 | §8.3、§9.2および対応方針で表示名管理をCore v1の対象外と確認した。 |
| SR-012 | Major | New | specification-review-004 | `profile_id`とAPIで単独指定される`key_id`の重複時に、対象を一意に解決できないStoreの扱いが未定義である。 |
| SR-013 | Major | New | specification-review-004 | 認証済み`duplicate_tag`と復号済みMnemonic / Networkの意味的一致を検証する条件が未定義である。 |

## Required Changes

### SR-012

- Priority: Major
- Status: New
- 対象箇所: `docs/specifications/specification.md` §3.1、§7、§9.2、§10、§11、§14.2; `docs/specifications/wallet-store-format-v1.md` §6、§7.1、§8、§9
- 問題: `profile_id`と`key_id`がAPIの対象指定に使用される一方、Store内の`profile_id`の一意性、Profile内の`key_id`の一意性および重複時の扱いが定義されていない。保存形式は同一`(key_id, chain)`の重複を禁止するが、Chainが異なる同一`key_id`の扱いを定めておらず、`key_id`単独指定の署名・公開情報取得・エクスポート・削除で対象が一意に定まらない。
- 根拠: 仕様本文 §3.1、§9.2、§11; 保存フォーマット仕様 §6、§7.1、§8、§9; 要件本文 `SEC-004`、`SEC-019`、`DR-007`、`AC-017`、`AC-020`、`AC-039`
- 影響: 破損または不正なStoreを正常状態として受け入れた場合、認証後の署名、エクスポート、削除等が別のProfileまたはSoftware Keyを対象にする可能性があり、Profile間分離とNative/WASM共通契約を独立検証できない。
- 修正内容: 正常StoreでProfileおよび既存APIが単独指定するSoftware Keyの対象を一意に解決できる不変条件を定義する。重複または曖昧なIDを含むStoreは正常状態として受け入れず、秘密情報処理およびmutationへ進まないことを明記する。異なるChainの同一private keyを別Software Keyとして扱う既存方針は変更しない。
- 修正完了条件: `profile_id`の重複、Profile内のChainをまたぐ`key_id`の重複および対象解決不能なStoreを独立して検証でき、該当Storeが既存の致命的Store不正として処理されることを判定できる。

### SR-013

- Priority: Major
- Status: New
- 対象箇所: `docs/specifications/specification.md` §6.3、§10、§11、§14.2; `docs/specifications/wallet-store-format-v1.md` §11〜§12
- 問題: `duplicate_tag`の生成式は定義され、値自体はAADで認証されるが、AEAD復号後に保存された`duplicate_tag`が復号済み`mnemonic_entropy`とProfileのNetworkから再計算した値と一致するかを検証する条件が定義されていない。
- 根拠: 仕様本文 §6.3、§10、§11; 保存フォーマット仕様 §11〜§12; 要件本文 `FR-017`、`DR-006`、`SEC-004`、`AC-017`、`AC-018`
- 影響: AAD認証には成功するもののtagと暗号化payloadのMnemonicが不整合なStoreを正常状態として扱うと、同一Mnemonic + NetworkのProfile重複判定を誤り、破損データの利用または重複登録につながる可能性がある。
- 修正内容: 既存の`duplicate_tag`生成式と復号済み`mnemonic_entropy` / Networkの対応関係を、重複判定およびmutationより前に検証する条件を定義する。不一致は正常Storeとして扱わず、秘密情報処理およびmutationを実行しないことを明記する。新しい暗号方式や重複判定機構は追加しない。
- 修正完了条件: `duplicate_tag`と復号済みMnemonic / Networkの不一致を独立して検証でき、不一致のStoreが正常な重複判定またはmutationへ進まないことを判定できる。

## Optional Improvements

### SR-010

- Priority: Minor
- Status: Open
- 対象箇所: `docs/specifications/specification.md` §6.4、§9.2、§10
- 改善内容: v1ではProfileパスワードの復旧・リセットを提供せず、紛失時は正しいProfileパスワードを必要とする秘密情報処理、パスワード変更および削除を成功させないことを明記する。
- 根拠: 要件本文 `SEC-013`、`AC-030`; 過去仕様レビュー `specification-review-003.md` のSR-010
- 影響: 実装者が現在のパスワードを要求しない復旧・リセット経路を仕様範囲内と解釈する余地を減らし、既存の認証責任と受入条件を明確にできる。復旧方式や追加APIは要求しない。

## Resolved Findings

### SR-001

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `docs/specifications/specification.md` §4.2、§14.1
- 対応確認: HD導出の規範、固定path、`symbol-sdk` 3.3.2基準および特定Walletの追加主張をfixture範囲に限定する条件を確認した。

### SR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `docs/specifications/specification.md` §8.1
- 対応確認: ApplicationがMnemonicsを提示し利用者の明示確認後だけfinalizeを呼ぶこと、確認前・受渡し失敗・中断・finalize失敗時にProfileを残さないことを確認した。

### SR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `docs/specifications/wallet-store-format-v1.md` §7.1、§11〜§12
- 対応確認: optional field、CBOR null拒否、AAD内の同一表現、HMAC入力およびdeterministic encodingを確認した。

### SR-004

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `docs/specifications/specification.md` §9、§13
- 対応確認: DTO項目、秘密情報のbyte表現、公開鍵・アドレス・署名結果およびNative/WASM同一性を確認した。

### SR-005

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `docs/specifications/specification.md` §6.3、§11; `docs/specifications/wallet-store-format-v1.md` §11
- 対応確認: `registry_key` / `duplicate_tag`をAADへ含め、manifest改変時に認証失敗とする条件を確認した。SR-013の意味的一貫性検証とは別問題である。

### SR-006

- Priority: Minor
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `docs/specifications/specification.md` §10〜§11
- 対応確認: 主要な入力、認証、重複、Store、Pending、暗号・乱数失敗を既存error codeへ対応付けた。

### SR-007

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: `docs/specifications/specification.md` §8.1、§11、§14.2
- 対応確認: Pendingのversion、対象Store結合、認証、改ざん、重複、失敗時input Store不変条件を確認した。

### SR-008

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: `docs/specifications/specification.md` §9.3
- 対応確認: passwordless `list_software_keys` が`SoftwareKeyListItem`を返し、`origin`を含めない契約を確認した。

### SR-009

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-002
- 対象箇所: `docs/specifications/specification.md` §5.2、§14.2
- 対応確認: 予測不能な乱数源、禁止fallback、候補鍵の妥当性検証、乱数源失敗時のProfile不変条件を確認した。

### SR-011

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-003
- 対象箇所: `docs/specifications/specification.md` §8.3、§9.2; `docs/decisions/specification-review-003-resolution.md`
- 対応確認: 表示名をCoreが受け取らず、保存せず、返さず、変更APIを提供しないこと、およびApplication責任とする方針を確認した。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | 仕様§1〜§2でCore、Binding、Applicationの責任境界と対象外を確認できる。 |
| 機能と制約 | 合格 | 仕様§3〜§10、保存形式仕様および要件FR/SEC/DRで主要機能・入力・出力・制約を確認できる。SR-012とSR-013は既存要件に関するMajorの補完であり、Criticalな欠落ではない。 |
| 処理と例外 | 合格 | 仕様§4.3、§8、§10〜§11、§14で正常系、失敗条件、Pending、atomicityおよび検証対象を確認できる。SR-012とSR-013は不正保存状態の追加的な明示条件である。 |
| 内部整合性 | 合格 | Profile、Mnemonic、Software Key、Network、暗号化、Bindingおよび状態変更の基本関係に実装を妨げるCriticalな矛盾はない。SR-012とSR-013は整合性条件の補完である。 |
| 検証可能性 | 合格 | 仕様§14と要件AC-001〜AC-043で主要な互換性、暗号、失敗、削除およびBindingを独立検証できる。SR-012とSR-013は保存状態の追加境界を明確化するMajorである。 |
| 不可欠な前提の現実性と安全性 | 合格 | `open-001`、`open-002`、`open-validity-001`、保存形式仕様および仕様§5〜§13で互換性、妥当性、認可、秘密情報保護およびatomicityの前提を確認できる。Criticalな未確認前提はない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | `concept-sheet-review-005.md`は「要件定義へ進める」、`requirements-review-004.md`は「仕様設計へ進める」と判定しており、前段に仕様設計を妨げるCriticalなブロック判定はない。 |

## Final Decision

実装へ進める。既存の品質ゲートはすべて合格し、Criticalな欠陥は確認されない。
SR-012とSR-013は既存要件を一意に実装・検証するためのMajor修正、SR-010は既存のパスワード責任境界を明示するMinorの継続指摘として記録する。

# Specification Review Findings

## Review Target

- 対象: `docs/specifications/specification.md`
- 確認日: 2026-08-22 20:36 +0900
- 成果物: `docs/reviews/specifications/specification-review-010.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A 識別子: `01a02935-b0d5-7a13-a85d-4b201af2ffc7`
- Reviewer B 識別子: `01a02935-dba3-70e1-a5e4-9271bac6717a`
- Reviewer C 識別子: `01a02936-0492-7e53-a56c-f42a11a485d2`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの識別子へPhase 1メモを個別送信し、`multi_agent_v1__wait_agent` で各完了を個別確認
- Chair 統合: 完了

3つの識別子は相互に異なる。起動、Phase 1、Phase 2の完了およびChair統合を確認した。
各Reviewerは新規指摘なし、SR-017およびSR-019はResolved、全ゲート合格、Review Result「実装へ進める」と判定した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/specification.md` §6.3、§7、§10、§13、§14.2、およびHEAD `ee55fa1` の変更 | unknown fieldの限定的opaque保持、完全なCBOR itemの受理境界、version/error mapping、破損Store時の安全側動作および検証条件を確認 |
| 保存フォーマット仕様 | `docs/specifications/wallet-store-format-v1.md` §2〜§2.2、§11 | CBOR wire境界、top-level構造、version分類、unknown field/enumおよび秘密情報非返却の規則を確認 |
| 保存フォーマット仕様レビュー結果 | `docs/reviews/specifications/wallet-store-format-v1-review-002.md` SR-007、SR-008 | 関連するtop-level decode/error mappingおよびunknown field指摘の履歴を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §4、§7、§9〜§10 | 対象利用者、v1範囲、責任境界および上位制約との整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 対象一致、Review Result「要件定義へ進める」および品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` §2、§3、§7、§9、§12.1〜§12.3 | HD互換性、Store、Binding、秘密情報保護および受入条件の引継ぎを確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | Review Result「仕様設計へ進める」および前段品質ゲートを確認 |
| 設計判断資料 | `docs/decisions/open-001.md`、`docs/decisions/binding-implementation.md`、`docs/decisions/curve25519-dalek-local-patch.md`（Superseded） | HD互換性、Binding方式およびlocal patchの現行適用状態を確認 |
| 実装者からの仕様フィードバック | `docs/reviews/implementation/implement-spec-feedback.md` | 公開された仕様フィードバックの解決状況を確認 |
| テスト | `tests/unit/store.rs:1271-1333`、既存unknown fieldテスト | CBOR境界、top-level不正、version型・未対応値およびunknown field保持条件の検証可能性を確認 |
| 過去仕様レビュー | `docs/reviews/specifications/specification-review-001.md`〜`specification-review-009.md` | SR-001〜SR-019の正式ID、状態および対応履歴を確認 |

## Review Result

実装へ進める

## Summary

現行仕様は、既存の承認済みスコープに対して実装・検証可能な状態である。
前回OpenであったSR-017は、unknown fieldを現行schema version内のopaque/lossless保持に限定し、将来versionの一般的なforward compatibilityを保証しないことを明記して解消した。
前回NewであったSR-019は、完全なdeterministic CBOR item、top-level構造、trailing/multiple item、version型・未対応値および公開error codeを仕様間で統一して解消した。
新規のCritical、Major、Minor指摘はなく、Required Changes、Optional Improvements、Deferred Findingsもない。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Resolved | specification-review-001 | §4.2、§14.1、要件および`open-001.md`で固定導出規則・deterministic fixture基準と特定Wallet包括互換性の保証外を確認した。 |
| SR-002 | Major | Resolved | specification-review-001 | §8.1でMnemonic提示、利用者確認、finalize条件、失敗・中断時のProfile非作成を確認した。 |
| SR-003 | Major | Resolved | specification-review-001 | 保存フォーマット仕様でCBOR、AAD、HMAC入力およびdeterministic表現を確認した。 |
| SR-004 | Major | Resolved | specification-review-001 | §9、§13でDTO、byte表現、公開情報、署名結果およびNative/WASM共通結果を確認した。 |
| SR-005 | Major | Resolved | specification-review-001 | §6.3および保存フォーマット仕様で`registry_key` / `duplicate_tag`をAADへ含め、改変時の認証失敗を確認した。 |
| SR-006 | Minor | Resolved | specification-review-001 | §10で主要な失敗条件と共通error codeの対応を確認した。 |
| SR-007 | Major | Resolved | specification-review-001 | §8.1、§10、§11、§14.2でPending、対象Store、認証、重複および失敗時不変条件を確認した。 |
| SR-008 | Major | Resolved | specification-review-002 | §9.3でpasswordless `list_software_keys` が`origin`を返さない契約を確認した。 |
| SR-009 | Major | Resolved | specification-review-002 | §5.2、§14.2で予測不能な乱数源、fallback禁止、妥当性検証および失敗時不変条件を確認した。 |
| SR-010 | Minor | Resolved | specification-review-003 | §6.4、§14.2でパスワード復旧・リセット禁止と紛失時の失敗結果を確認した。 |
| SR-011 | Major | Resolved | specification-review-003 | §8.3、§9.2で表示名管理をCore v1の対象外と確認した。 |
| SR-012 | Major | Resolved | specification-review-004 | §3.1、§7、§9.2、§10、§11でID一意性、曖昧なStoreの`InvalidStore`処理および対象の一意解決を確認した。 |
| SR-013 | Major | Resolved | specification-review-004 | §6.3、§10、§11、§14.2で認証・復号後の`duplicate_tag`とMnemonic / Networkの意味的一致検証を確認した。 |
| SR-014 | Major | Resolved | specification-review-005 | §5.3、§14.2および保存フォーマット仕様で同一Chain内のみ重複とする方針を確認した。 |
| SR-015 | Major | Resolved | specification-review-006 | §8.2、§17、保存フォーマット仕様および要件で整合Storeへの重複保証とtag不一致時の継続規則を確認した。 |
| SR-016 | Major | Resolved | specification-review-006 | §13、§16および`binding-implementation.md`でNative C ABI / WASM `wasm-bindgen`を確認した。 |
| SR-017 | Minor | Resolved | specification-review-007 | §6.3、§7、§10、§10.1および保存フォーマット仕様§11で、unknown fieldを現行schema version内のopaque/lossless保持に限定し、将来versionの一般的forward compatibility・意味解釈・自動migrationを保証しないことを確認した。 |
| SR-018 | Major | Resolved | specification-review-008 | §12.1と`curve25519-dalek-local-patch.md`のStatus `Superseded`および後継指定の一致を確認した。 |
| SR-019 | Major | Resolved | specification-review-009 | §7:277-285、§10:599-609、保存フォーマット仕様§2〜§2.1およびtests/unit/store.rs:1271-1333で、完全なdeterministic CBOR item、構造不正・trailing/multiple itemの`InvalidStore`、version型不正と未対応値の分類を確認した。 |

## Required Changes

なし

## Optional Improvements

なし

## Resolved Findings

### SR-001

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §4.2、§14.1、§17; 要件DR-008、AC-033; `docs/decisions/open-001.md`
- 対応確認: v1のHD復元互換性を仕様固定の導出規則とdeterministic fixtureで判定し、特定Wallet包括互換性を保証対象外とする記述が一致している。

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
- 対象箇所: `wallet-store-format-v1.md` §2、§7.1、§11
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
- 対象箇所: §6.3、§11; `wallet-store-format-v1.md` §11
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
- 対応確認: 認証・復号後に`duplicate_tag`と復号済みMnemonic / Networkの意味的一致を検証し、不一致時に正常結果・秘密情報・replacement Storeを返さないことを確認した。

### SR-014

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-005
- 対象箇所: §5.3、§14.2; 要件FR-018、AC-020; 保存フォーマット仕様 §9
- 対応確認: 同一Profile・同一Chain・同一private keyだけを重複とし、異なるChainでは別Software Keyとして登録可能とする記述を確認した。

### SR-015

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-006
- 対象箇所: §8.2、§17; 保存フォーマット仕様 §14.1; 要件FR-017、AC-018
- 対応確認: 重複拒否保証をCoreが生成・維持する整合Storeに適用し、tag不一致だけでは拒否せず、認証・復号後の意味的不一致は`InvalidStore`とする方針を統一した。

### SR-016

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-006
- 対象箇所: §13、§16; `docs/decisions/binding-implementation.md`
- 対応確認: Native C ABI、WASM `wasm-bindgen`、v1方式の固定および変更時の仕様・decision同時更新を確認した。

### SR-017

- Priority: Minor
- Status: Resolved
- 初出レビュー: specification-review-007
- 対象箇所: §6.3:245-251、§7:285、§10:583; `wallet-store-format-v1.md` §11
- 対応確認: unknown fieldを現行schema versionのwire object内で意味解釈しないopaque extension fieldとし、一覧・重複・写像検証から除外し、必要なmutation時だけlosslessに保持する規則を確認した。将来versionの一般的なforward compatibility、自動migration、unsupported versionの受理を保証せず、unknown enumはfatal errorとしている。

### SR-018

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-008
- 対象箇所: §12.1; `docs/decisions/curve25519-dalek-local-patch.md`
- 対応確認: 第三者ライブラリ内部temporaryの完全消去を保証対象外とし、local patch decisionをSupersededとして§12.1を後継に指定したことを確認した。

### SR-019

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-009
- 対象箇所: §7:277-285、§10:599-609; `wallet-store-format-v1.md` §2〜§2.1
- 対応確認: 完全なdeterministic CBOR itemを1個だけ受理し、空・truncated・decode failure・非最短表現・duplicate key・許可外型・trailing bytes・複数item・top-level非map・構造不正を`InvalidStore`へ分類する規則を確認した。versionの欠落・型不正は`InvalidStore`、構造上正しいunsigned integerの未対応値だけをversion専用errorとし、tests/unit/store.rs:1271-1333で検証条件を確認した。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | §1〜§2でCore、Binding、Applicationの責任境界、v1対象外およびzeroizeの責任範囲を確認できる。 |
| 機能と制約 | 合格 | §3〜§13、保存フォーマット仕様および要件で主要機能・入力・出力・制約を確認できる。SR-017/SR-019の解消によりunknown fieldとStore受理境界も一意である。 |
| 処理と例外 | 合格 | §7、§10〜§11、§14および保存フォーマット§2.1で正常系、失敗条件、atomicity、秘密情報非返却およびStore拒否結果を確認できる。 |
| 内部整合性 | 合格 | specificationとwallet-store-formatのCBOR、version、unknown field、unknown enumおよび公開error codeの規則が一致している。 |
| 検証可能性 | 合格 | §14.2、保存フォーマット仕様および`tests/unit/store.rs:1271-1333`で、CBOR境界、version分類、unknown field保持、破損Store時不変条件を独立検証できる。 |
| 不可欠な前提の現実性と安全性 | 合格 | §7、§10、§12、保存フォーマット§2.1およびBinding decisionでStore拒否、秘密情報保護、error境界およびBinding方式を確認できる。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | `concept-sheet-review-005.md`は「要件定義へ進める」、`requirements-review-004.md`は「仕様設計へ進める」と判定しており、現行仕様との阻害矛盾はない。 |

## Final Decision

実装へ進める。SR-017およびSR-019を含むSR-001〜SR-019はすべてResolvedであり、新規の採用指摘はない。
仕様本文、Wallet Store保存フォーマット、上流要件、設計判断および検証条件の間に、現行スコープの実装を妨げる未解決の矛盾は確認されなかった。

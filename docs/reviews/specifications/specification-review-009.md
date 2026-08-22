# Specification Review Findings

## Review Target

- 対象: `docs/specifications/specification.md`
- 確認日: 2026-08-22 20:05 +0900
- 成果物: `docs/reviews/specifications/specification-review-009.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A 識別子: `01a0291a-65cc-70d1-90e8-e7045610d8bc`
- Reviewer B 識別子: `01a0291a-8eda-7da0-8b9b-c5c66745280b`
- Reviewer C 識別子: `01a0291a-b877-77f0-b1c9-ec5e029ff289`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの識別子へ全メモを個別送信し、`multi_agent_v1__wait_agent` で各完了を個別確認
- Chair 統合: 完了

3つの識別子は相互に異なる。起動、Phase 1、Phase 2 の完了および統合完了を確認した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/specification.md` §4.2、§7、§8.1〜§8.2、§10、§12.1、§13、§14.1、§16〜§17、および今回の差分 | HD復元互換性、Store重複判定、error mapping、zeroize境界、Binding方式および適用上の確定事項を確認 |
| 保存フォーマット仕様 | `docs/specifications/wallet-store-format-v1.md` §2〜§2.1、§11、§14.1 | CBOR受理境界、top-level構造不正、unknown field保持および重複判定のwire-level規則を確認 |
| 保存フォーマット仕様レビュー結果 | `docs/reviews/specifications/wallet-store-format-v1-review-002.md` SR-007、SR-008 | top-level decode/error mappingおよびunknown field表現の関連指摘を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §4、§7、§9〜§10 | 対象利用者、v1範囲、責任境界および外部環境の制約との整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 対象一致、Review Result「要件定義へ進める」および品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` §2、§3、§7、§9、§12.1〜§12.3 | HD互換性、重複判定、Binding、秘密情報保護および受入条件の引継ぎを確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | Review Result「仕様設計へ進める」および前段品質ゲートを確認。現行作業ツリーの要件差分自体は同レビュー後のため、別レビュー結果は未確認 |
| プロジェクト資料 | `docs/decisions/open-001.md`、`docs/decisions/binding-implementation.md`、`docs/decisions/curve25519-dalek-local-patch.md`（Status: Superseded） | HD互換性、Binding方式およびlocal patch decisionの現行適用状態を確認 |
| 実装者からの仕様フィードバック | `docs/reviews/implementation/implement-spec-feedback.md` | 公開された仕様フィードバックの解決状況を確認。今回のtop-level decode/error mappingについて直接の記載は未確認 |
| 過去仕様レビュー | `docs/reviews/specifications/specification-review-001.md`〜`specification-review-008.md` | SR-001〜SR-018の正式ID、状態、同一問題の継承および対応済み根拠を確認 |

確認できない事実は「未確認」とし、実装者レビューの過去時点の判定を現行仕様の根拠へ置き換えていない。

## Review Result

実装へ進める

## Summary

今回の更新により、HD復元互換性、整合したWallet Storeに対するProfile重複判定、Native / WASM Binding方式、およびlocal patchの現行適用状態が前回指摘と整合した。
Core / Bindingの秘密情報責任境界と、第三者ライブラリ・runtime等の完全消去保証外の境界も明確である。
一方、unknown fieldの「forward-compatible wire data」表現は限定的なwire保持の範囲を超えて読めるため、既存SR-017をOpenとして継続する。
また、Wallet Store top-level decode errorと`InvalidStore`の対応、および完全なCBOR itemの受理境界が仕様間で一致していないため、SR-019をMajorとして追加する。
Criticalな品質ゲート不合格は確認されないため、判定は「実装へ進める」とする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Resolved | specification-review-001 | §4.2、§14.1、要件DR-008/AC-033および`open-001.md`で、固定導出規則・deterministic fixture基準と特定Wallet包括互換性の保証外を統一した。 |
| SR-002 | Major | Resolved | specification-review-001 | §8.1でMnemonic提示、利用者確認、finalize条件、失敗・中断時のProfile非作成を確認した。 |
| SR-003 | Major | Resolved | specification-review-001 | 保存フォーマット仕様でCBOR、AAD、HMAC入力およびdeterministic表現を確認した。 |
| SR-004 | Major | Resolved | specification-review-001 | §9でDTO、byte表現、公開情報、署名結果およびNative/WASM同一性を確認した。 |
| SR-005 | Major | Resolved | specification-review-001 | `registry_key` / `duplicate_tag`をAAD対象とし、改変時の認証失敗を確認した。 |
| SR-006 | Minor | Resolved | specification-review-001 | §10で主要な失敗条件と共通error codeを対応付けた。 |
| SR-007 | Major | Resolved | specification-review-001 | §8.1、§10、§11、§14.2でPendingの検証、重複、認証および失敗時不変条件を確認した。 |
| SR-008 | Major | Resolved | specification-review-002 | passwordless `list_software_keys` が`origin`を返さない契約を確認した。 |
| SR-009 | Major | Resolved | specification-review-002 | 予測不能な乱数源、fallback禁止、妥当性検証および失敗時不変条件を確認した。 |
| SR-010 | Minor | Resolved | specification-review-003 | §6.4、§14.2でパスワード復旧・リセット禁止と紛失時の失敗結果を確認した。 |
| SR-011 | Major | Resolved | specification-review-003 | §8.3、§9.2で表示名管理をCore v1の対象外と確認した。 |
| SR-012 | Major | Resolved | specification-review-004 | `profile_id`とProfile内`key_id`の一意性、曖昧なStoreの`InvalidStore`処理および対象の一意解決を確認した。 |
| SR-013 | Major | Resolved | specification-review-004 | 認証・復号後の`duplicate_tag`とMnemonic / Networkの意味的一致検証を確認した。 |
| SR-014 | Major | Resolved | specification-review-005 | 同一Chain内のみ重複とし、異なるChainの同一private keyを別Software Keyとして扱う方針が一致している。 |
| SR-015 | Major | Resolved | specification-review-006 | §8.2、§17、保存形式§14.1、要件FR-017/AC-018で、整合Storeへの重複保証とtag不一致時の継続規則を統一した。 |
| SR-016 | Major | Resolved | specification-review-006 | §13、§16および`binding-implementation.md`でNative C ABI / WASM `wasm-bindgen`をv1方式として統一した。 |
| SR-017 | Minor | Open | specification-review-007 | §10の「forward-compatible wire data」が、保存形式§11の限定的なopaque/lossless保持を超えて読める。今回の差分では未修正である。 |
| SR-018 | Major | Resolved | specification-review-008 | §12.1の保証境界と、`curve25519-dalek-local-patch.md`のStatus `Superseded`および§12.1を後継とする記述が一致した。 |
| SR-019 | Major | New | specification-review-009 | top-level Store不正のerror分類と完全なCBOR itemの受理境界が、仕様書と保存フォーマット仕様で一致していない。 |

## Required Changes

### SR-019

- Priority: Major
- Status: New
- 対象箇所: `specification.md` §7・§10、`wallet-store-format-v1.md` §2・§2.1
- 問題: `wallet-store-format-v1.md` §2.1はWallet Store top-level自体を解釈できない不正を一般的な`decode error`としている。一方、`specification.md` §7・§10はStore top-levelを解釈できない不正を`InvalidStore`またはversion専用errorとし、Binding共通error codeへ対応付けている。さらに、1つの完全なWallet Store CBOR itemとして受理する範囲、trailing bytes、複数CBOR item、top-level型不正およびdeterministic制約違反の外部結果が一意でない。
- 根拠: 仕様本文 §7・§10; 保存フォーマット仕様 §2・§2.1; 要件SEC-004、AC-017; `wallet-store-format-v1-review-002` SR-007
- 影響: 同一の破損Storeに対する拒否可否、Bindingへ返すerror code、認証・秘密情報処理・replacement Store非返却の検証結果が実装ごとに分岐する。
- 修正内容: 完全なdeterministic CBOR itemの受理範囲、top-level構造不正・deterministic制約違反・trailing bytes・複数itemの拒否条件、および`InvalidStore` / version専用errorの対応を仕様間とBinding契約で一意に定める。未対応Store / Profile versionの専用errorは維持し、破損Storeでは秘密情報、正常なread結果またはreplacement Storeを返さない条件を維持する。
- 修正完了条件: 同じ入力bytesについて、Wallet Store仕様、Core仕様およびBinding契約から受理・拒否、error code、秘密情報処理の可否およびreplacement Store返却可否を同じ結果として判定できる。

## Optional Improvements

### SR-017

- Priority: Minor
- Status: Open
- 対象箇所: §10、特に「正常な `forward-compatible wire data`」の表現; `wallet-store-format-v1.md` §11
- 改善内容: unknown fieldの扱いを、現行v1 wire objectに対する限定的なopaque/lossless保持であり、将来versionの一般的な前方互換性、意味解釈または自動migrationを保証しないものとして表現する。
- 根拠: 仕様本文 §7・§10; 保存フォーマット仕様 §2・§11; specification-review-008 SR-017
- 影響: 限定されたwire保持規則と、将来versionの一般的な互換性保証を実装者が混同する余地を減らせる。

## Resolved Findings

### SR-001

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-001
- 対象箇所: §4.2、§14.1、§17; 要件DR-008、AC-033; `docs/decisions/open-001.md`
- 対応確認: v1のHD復元互換性を仕様固定の導出規則とdeterministic fixtureで判定し、特定Wallet包括互換性を保証対象外とする記述が一致した。

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

### SR-018

- Priority: Major
- Status: Resolved
- 初出レビュー: specification-review-008
- 対象箇所: §12.1; `docs/decisions/curve25519-dalek-local-patch.md`
- 対応確認: 第三者ライブラリ内部temporaryの完全消去を保証対象外とし、local patch decisionをSupersededとして§12.1を後継に指定したことを確認した。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | §1〜§2でCore、Binding、Applicationの責任境界、対象外およびzeroizeの責任範囲を確認できる。 |
| 機能と制約 | 合格 | §3〜§13、保存フォーマット仕様および要件で主要機能・入力・出力・制約を確認できる。SR-019は既存Store error契約のMajor補完であり、Criticalな欠落ではない。 |
| 処理と例外 | 合格 | §8、§10〜§11、§14および保存フォーマット§2.1で正常系、失敗条件、atomicityおよび主要な破損Store処理を確認できる。SR-019はtop-level受理境界とerror mappingのMajor補完である。 |
| 内部整合性 | 合格 | HD互換性、Profile重複、Binding方式、zeroize責任の基本関係は整合した。SR-019は仕様間のtop-level decode/error mappingを補うMajorである。 |
| 検証可能性 | 合格 | §14、要件AC-017/AC-018/AC-033および保存フォーマット§2.1、§14.1で主要な互換性、破損Store、重複、秘密情報およびatomicityを検証できる。SR-019は受理境界を一意化するMajorである。 |
| 不可欠な前提の現実性と安全性 | 合格 | §7、§10、§12、保存フォーマット§2.1およびBinding決定で主要なStore拒否、秘密情報保護、error境界およびBinding方式を確認でき、Criticalな未確認前提はない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | `concept-sheet-review-005.md`は「要件定義へ進める」、`requirements-review-004.md`は「仕様設計へ進める」と判定している。前段に仕様設計を妨げるCritical判定はない。 |

## Final Decision

実装へ進める。前回のMajor指摘SR-001、SR-015、SR-016、SR-018は現行資料で解消した。
SR-019はWallet Storeのtop-level受理境界とerror mappingを仕様間で統一するMajor、SR-017は表現上のMinorとして継続する。
いずれもCriticalではないため、品質ゲートはすべて合格とする。

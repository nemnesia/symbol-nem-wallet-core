# Specification Review Findings

## Review Target

- 対象: `docs/specifications/wallet-store-format-v1.md`
- 確認日: 2026-08-20 18:30 +0900
- 成果物: `docs/reviews/specifications/wallet-store-format-v1-review-002.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a01e4d-704a-7033-93bc-fdafd4de3425`
- Reviewer B agent_id: `01a01e4d-86f3-7421-95a5-c1b582719138`
- Reviewer C agent_id: `01a01e4d-9cd4-7b22-9e1c-805da7ca6aff`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの agent_id へ全メモを個別送信し、各送信に対応する `multi_agent_v1__wait_agent` の完了を個別確認。submission_id は A: `01a01e54-3b32-7120-84c3-5cb0951ec60d`、B: `01a01e54-3b52-7c11-940b-c3cf3ce005a4`、C: `01a01e54-3b89-7520-9950-fad2ce35b15b`
- Chair 統合: 完了

3つの `agent_id` は相互に異なる。起動、Phase 1、Phase 2 の完了および統合完了を確認した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/wallet-store-format-v1.md` §2、§2.1、§11、§12、§14.1 | CBOR受理境界、fatal error、AAD、unknown field、重複tagおよびmutation規則を確認 |
| Companion仕様本文 | `docs/specifications/specification.md` §7、§8.2、§10、§11 | `InvalidStore`契約、Profile重複、error mapping、unknown fieldおよびatomicityとの整合性を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | Coreの責任境界、秘密情報保護およびv1スコープとの整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 公開された判定と品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` FR-017、FR-019、SEC-004、SEC-019、AC-018、AC-039 | Profile重複、破損データ、Store操作およびatomic replacementの要求を確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | 公開された判定と前段品質ゲートを確認 |
| 承認済み要件またはプロジェクト資料 | `docs/decisions/open-001.md`、`docs/decisions/open-validity-001.md`、`docs/decisions/requirements-baseline-001.md` | 互換性、妥当性および現行要件正本を確認 |
| 実装者からの仕様フィードバック | `docs/reviews/implementation/implement-spec-feedback.md` | INTEROP-001、CRITICAL-001、INTEROP-002の公開された解決記録を補助資料として確認。旧記述は現行規範とは扱わない |
| 過去仕様レビュー | `docs/reviews/specifications/wallet-store-format-v1-review-001.md`、`specification-review-007.md` | 対象SR-001〜SR-006、関連するcompanion SR-015/SR-017の状態と同一性を確認 |

## Review Result

実装へ進める

## Summary

前回の6件は、UUID変換、fatal/skip境界、schema version、payload/index検証、unknown field保持およびmutation atomicityの変更により解消された。
一方、既存Profileの`duplicate_tag`不一致時に復元を許可する例外は、FR-017 / AC-018の重複拒否要求と整合していない。
また、top-level decode errorのAPI error codeと、deterministic CBORの入力受理境界が一意でなく、unknown fieldの限定的保持を「forward-compatible」と表現する差も残る。
Criticalな品質ゲート不合格は確認しないため、判定は実装へ進めるとする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Resolved | wallet-store-format-v1-review-001 | UUID文字列とraw bytes[16]の変換・byte orderを§3.3で確認した。 |
| SR-002 | Major | Open | wallet-store-format-v1-review-001 | §14.1の重複tag不一致時の継続規則がFR-017 / AC-018と整合せず、同一Mnemonic + Networkの重複を許可し得る。 |
| SR-003 | Major | Resolved | wallet-store-format-v1-review-001 | 未対応Profile schema versionのStore操作全体拒否とreplacement禁止を§13、§14.1で確認した。 |
| SR-004 | Major | Resolved | wallet-store-format-v1-review-001 | index entry不正、未知enum、重複およびpayload対応不一致をfatalとして扱う境界を§2.1、§7.1で確認した。 |
| SR-005 | Major | Resolved | wallet-store-format-v1-review-001 | 認証済みpayloadの構造不正時にProfileを正常利用・mutationしない条件を§8とcompanion仕様で確認した。 |
| SR-006 | Major | Resolved | wallet-store-format-v1-review-001 | 非対象Profileのwire保持、保持不能時のmutation拒否およびreplacement非返却を§11で確認した。 |
| SR-007 | Major | New | wallet-store-format-v1-review-002 | deterministic CBORの完全なStore item受理境界と、top-level構造不正を`InvalidStore`へ分類するAPI結果が一意でない。 |
| SR-008 | Minor | New | wallet-store-format-v1-review-002 | 限定的なopaque wire保持と、companion仕様の「forward-compatible wire data」表現が不一致である。 |

## Required Changes

### SR-002

- Priority: Major
- Status: Open
- 対象箇所: §14.1; companion仕様 §8.2、§17
- 問題: 候補`duplicate_tag`が既存Profileの平文tagと不一致なら、暗号化Mnemonicとの意味的一致を検証できなくても作成・復元を拒否しないとしている。しかしFR-017 / AC-018は同一Mnemonic + 同一Networkの既存Profile重複登録をMUSTとして拒否する。この例外は承認済み要件・決定記録に明示されていない。
- 根拠: 本仕様 §14.1; companion仕様 §8.2; 要件 FR-017、AC-018; companionレビュー SR-015
- 影響: 同一Mnemonic + Networkの既存Profileがtag不整合だけで検出できない場合、重複Profileを作成できる解釈が残り、登録結果・input Store・受入条件が要件と分岐する。
- 修正内容: 不一致・意味検証不能時の登録結果をFR-017 / AC-018に整合させるか、この例外を承認済み要件または決定記録として明示し、登録可否、errorおよびStore状態を確定する。全Store事前復号などの方式は指定しない。
- 修正完了条件: 当該境界ケースの登録可否、返却結果、input/replacement Storeおよび受入テストを本仕様・companion仕様・要件から一意に判定できる。

### SR-007

- Priority: Major
- Status: New
- 対象箇所: §2、§2.1
- 問題: Wallet Store v1がdeterministic CBORを要求し、top-level構造不正をgeneric `decode error`とする一方、companion仕様はfatal Store構造エラーを`InvalidStore`としてAPIへ返す契約を定めている。また、parse可能だがdeterministic制約に違反する表現、trailing bytesおよび「1つの完全なWallet Store item」の受理・拒否境界が明記されていない。
- 根拠: 本仕様 §2、§2.1; companion仕様 §7、§10
- 影響: 同じStore blobに対するdecoderの受理可否、Bindingへ返すerror code、AAD検証および受入fixtureの結果が実装ごとに分かれる。
- 修正内容: 1つの完全なWallet Store CBOR itemのみを受理し、既定のdeterministic制約に違反する表現、trailing bytesおよびtop-level構造不正を`InvalidStore`へ分類する境界を定義する。version専用errorは維持し、追加のcanonicalization方式やparser固有error分類は要求しない。
- 修正完了条件: top-level Storeの完全性、deterministic制約違反、trailing bytesおよびversion不一致について、受理可否とAPI error codeを独立fixtureで一意に検証できる。

## Optional Improvements

### SR-008

- Priority: Minor
- Status: New
- 対象箇所: §2、§11; companion仕様 §10
- 改善内容: unknown fieldの扱いを、現行v1 wire objectの限定的なopaque/lossless保持であり、将来versionの一般的な前方互換性や意味解釈を保証しないものとして表現する。
- 根拠: 本仕様 §2、§11; companion仕様 §10; companionレビュー SR-017
- 影響: 実装者が限定されたwire保持を将来schemaの一般的な互換性保証と誤解する余地を減らせる。動作や保持機構の追加は要求しない。

## Resolved Findings

### SR-001

- Priority: Major
- Status: Resolved
- 初出レビュー: wallet-store-format-v1-review-001
- 対象箇所: §3.3
- 対応確認: lowercase UUID stringとStore内raw `bytes[16]`の変換、byte orderおよびfixtureを確認した。

### SR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: wallet-store-format-v1-review-001
- 対象箇所: §13、§14.1
- 対応確認: 未対応Profile schema versionをStore操作全体で拒否し、skipやreplacement生成を行わない条件を確認した。

### SR-004

- Priority: Major
- Status: Resolved
- 初出レビュー: wallet-store-format-v1-review-001
- 対象箇所: §2.1、§4.3、§7.1
- 対応確認: index entryの不正、未知enum、重複およびpayloadとの不一致をfatalとして拒否する条件を確認した。

### SR-005

- Priority: Major
- Status: Resolved
- 初出レビュー: wallet-store-format-v1-review-001
- 対象箇所: §8、§9
- 対応確認: 認証済みpayload自体の構造不正を正常Profileとして扱わず、秘密情報・mutation・replacementを許可しない条件を確認した。

### SR-006

- Priority: Major
- Status: Resolved
- 初出レビュー: wallet-store-format-v1-review-001
- 対象箇所: §11
- 対応確認: 非対象Profileのwire/AAD保持、unknown field保持不能時のmutation全体拒否およびreplacement非返却を確認した。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | §1〜§2でopaque Store、wire-level仕様および不正Storeの責任境界を確認できる。 |
| 機能と制約 | 合格 | §2〜§14で整数key、enum、CBOR、Profile、AAD、重複判定およびmigrationを確認できる。SR-002、SR-007はMajorであり、Criticalな欠落ではない。 |
| 処理と例外 | 合格 | §2.1、§4.3、§7.1、§11〜§14で主要な不正入力、version、AAD、重複およびmutation処理を確認できる。SR-002、SR-007は境界条件の明確化を要するMajorである。 |
| 内部整合性 | 合格 | wire layout、AAD、重複tag、unknown fieldおよびmigrationの基本関係にCriticalな矛盾はない。SR-007はAPI mappingと受理境界の補完である。 |
| 検証可能性 | 合格 | companion仕様 §14.1〜§14.2と要件AC-018、AC-039等で主要なencoding、暗号、破損データ、重複およびatomicityを検証できる。SR-002、SR-007は追加境界を明確化するMajorである。 |
| 不可欠な前提の現実性と安全性 | 合格 | AAD、秘密payload、破損データおよびatomicityの主要前提は確認でき、Criticalな未確認前提はない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | `concept-sheet-review-005.md`は「要件定義へ進める」、`requirements-review-004.md`は「仕様設計へ進める」と判定している。前段に仕様設計を妨げるCritical判定はない。 |

## Final Decision

実装へ進める。品質ゲートはすべて合格し、Criticalな欠陥は確認されない。
SR-002およびSR-007は既存の重複・wire/API契約を整合させるMajor修正、SR-008は既存のunknown field責任境界を明確化するMinorである。

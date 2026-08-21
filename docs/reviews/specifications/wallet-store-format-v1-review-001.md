# Specification Review Findings

## Review Target

- 対象: `docs/specifications/wallet-store-format-v1.md`
- 確認日: 2026-08-20 09:20 +0900
- 成果物: `docs/reviews/specifications/wallet-store-format-v1-review-001.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a01d9c-c372-7ee2-a05f-0b572aa3bf33`
- Reviewer B agent_id: `01a01d9c-d9d9-7f83-985c-63e224bd811c`
- Reviewer C agent_id: `01a01d9c-efc8-70f2-863d-dc3c1aebe490`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの agent_id へ全メモを個別送信し、各送信に対応する `multi_agent_v1__wait_agent` の完了を個別確認。submission_id は A: `01a01da4-09fa-7bb3-b6ad-ae4018eb19fe`、B: `01a01da4-0a21-7d03-8fcf-8dd49b5e6c13`、C: `01a01da4-0a67-7a20-b614-3902fd95cfb9`
- Chair 統合: 完了

3つの `agent_id` は相互に異なる。起動、Phase 1、Phase 2 の完了および統合完了を確認した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/wallet-store-format-v1.md` §2、§3.3、§4.3、§7.1、§8、§11〜§14 | wire encoding、ID、version、index、encrypted payload、AAD、重複判定およびmutation規則を確認 |
| Companion仕様本文 | `docs/specifications/specification.md` §7、§8.2、§10、§11、§14.2 | Wallet StoreのAPI契約、Profile作成・復元、失敗時不変条件およびatomicityとの整合性を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | Coreの責任境界、秘密情報保護およびv1スコープとの整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 公開された判定と品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` FR-017、FR-019、SEC-004、SEC-019、AC-018、AC-039 | Profile重複、破損データ、Bindingからの利用およびatomic replacementの要求を確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | 公開された判定および上流の未解決事項を確認 |
| 承認済み要件またはプロジェクト資料 | `docs/decisions/open-001.md`、`docs/decisions/open-validity-001.md`、`docs/decisions/requirements-baseline-001.md` | 互換性、妥当性および現行要件正本の位置付けを確認 |
| 実装者からの仕様フィードバック | `docs/reviews/implementation/implement-spec-feedback.md` | INTEROP-001、CRITICAL-001、INTEROP-002の解決状況を確認 |
| Companion仕様レビュー結果 | `docs/reviews/specifications/specification-review-006.md` | 関連するSR-015の重複検証境界を確認。対象フォーマット自体の過去レビューは未確認 |

## Review Result

実装へ進める

## Summary

Wallet Store v1の主要な整数key、enum、CBOR、AAD、unknown field、重複tagおよびmigrationの構造は定義されている。
一方、UUIDのwire変換、既存Profileの重複検証不能時、未対応Profile schema version、index／payloadの不正処理、mutation時の非対象Profile保持には実装間で結果が分かれる余地がある。
これらは既存のwire互換性、Profile重複、破損データ拒否およびatomicity要件に関するMajorである。
Criticalな品質ゲート不合格は確認しないため、判定は実装へ進めるとする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | New | wallet-store-format-v1-review-001 | UUID文字列とStore内raw bytes[16]の相互変換・byte orderが未定義である。 |
| SR-002 | Major | New | wallet-store-format-v1-review-001 | 既存Profileの`duplicate_tag`を意味検証できない場合の新規Profile作成・復元結果が未定義である。 |
| SR-003 | Major | New | wallet-store-format-v1-review-001 | 未対応Profile schema versionの拒否範囲と混在Storeでの一覧・mutation・replacement結果が未定義である。 |
| SR-004 | Major | New | wallet-store-format-v1-review-001 | `SoftwareKeyIndexEntryV1`の不正fieldに対するskip/warningとProfile全体拒否の優先順位が未定義である。 |
| SR-005 | Major | New | wallet-store-format-v1-review-001 | AEAD復号後の`ProfilePayloadV1`自体の構造不正時に秘密情報処理・mutationを許可するかが未定義である。 |
| SR-006 | Major | New | wallet-store-format-v1-review-001 | 不正な非対象Profileをskipしたmutationが、そのProfileをreplacement Storeから消失させない条件が未定義である。 |

## Required Changes

### SR-001

- Priority: Major
- Status: New
- 対象箇所: §3.3、§11
- 問題: 外部のlowercase UUID stringとStore内のraw `bytes[16]`は定義されているが、文字列から16 bytesへの変換規則とbyte orderが定義されていない。
- 根拠: 本仕様 §3.3、§11; companion仕様 §3.1
- 影響: 独立実装間でProfileId / SoftwareKeyIdのwire値、lookup、並び順および関連fixtureが一致しない。
- 修正内容: UUID外部表現とraw 16 bytesの相互変換およびbyte orderを規範的に定義する。
- 修正完了条件: 同一UUID stringから生成されるStore内bytes、並び順およびAPI lookup結果を独立実装が同じ期待値で判定できる。

### SR-002

- Priority: Major
- Status: New
- 対象箇所: §12、§14.1; companion仕様 §8.2、§17
- 問題: 新規Profile作成・復元では既存Profileの平文`duplicate_tag`と候補値を比較するが、既存Profileの`duplicate_tag`と暗号化Mnemonic / Networkの意味的一致をpasswordなしで確認できない場合の登録可否、返却結果およびinput Storeの扱いを定義していない。
- 根拠: 本仕様 §12、§14.1; 要件 FR-017、AC-018; companion仕様レビュー SR-015
- 影響: 同一Mnemonic + Networkの重複を許可するか、`InvalidStore`等で拒否するか、replacement Storeを返すかが実装ごとに分かれ、Profile重複の受入判定が一意でない。
- 修正内容: 意味的一致を事前確認できない既存Profileが存在する場合の登録結果、既存Profileの扱いおよびinput/replacement Storeの不変条件を、FR-017 / AC-018と整合する形で定義する。新規APIや全Store事前検証方式の選定は要求しない。
- 修正完了条件: 当該境界ケースの登録可否、error/result、Store状態および受入テストを本仕様とcompanion仕様から同じ解釈で判定できる。

### SR-003

- Priority: Major
- Status: New
- 対象箇所: §4.3、§13
- 問題: 未対応`ProfileEnvelope.schema_version`は`UnsupportedProfileSchemaVersion`とされる一方、一般の子オブジェクトskip/warning規則との優先順位、複数Profileが混在するStoreでの適用範囲、一覧・mutation・replacement Storeの扱いが定義されていない。
- 根拠: 本仕様 §2.1、§4.3、§13; companion仕様 §7、§10
- 影響: 未対応versionを含むStoreで、対象Profileだけを隠すのかStore全体を拒否するのか、また他Profileの公開・mutationを許可するのかが実装ごとに分かれる。
- 修正内容: `UnsupportedProfileSchemaVersion`の適用範囲、skipとの優先順位、返却error、一覧・mutationの可否およびreplacement Store生成禁止条件を定義する。暗黙migrationは追加しない。
- 修正完了条件: version混在Storeに対するdecode、一覧、mutation、失敗時input Storeおよびreplacement Storeの結果を一意に検証できる。

### SR-004

- Priority: Major
- Status: New
- 対象箇所: §2.1、§4.3、§7.1
- 問題: 一般則は子オブジェクトの必須field欠落・型・長さ・値・未知enumをwarning付きでskipするが、`SoftwareKeyIndexEntryV1`の不正値はProfile全体を`InvalidStore`として拒否するとされている。index entryの未知enum・型不正などが両方の規則に該当し得る。
- 根拠: 本仕様 §2.1、§4.3、§7.1; companion仕様 §7
- 影響: index/payload対応検証、warning/error、Profile受理可否および一覧結果が実装ごとに分かれる。
- 修正内容: index entryについて、field不正・未知enum・重複・payloadとの不一致をどの検証段階でどの結果に分類するか、一般のskip規則との優先順位を定義する。
- 修正完了条件: 不正index entryごとのwarning/error、Profile受理可否、秘密情報処理およびreplacement Store可否を一意に判定できる。

### SR-005

- Priority: Major
- Status: New
- 対象箇所: §2.1、§8、§9
- 問題: AEAD復号・認証には成功したが、復号後の`ProfilePayloadV1`自体がCBORとして不正、必須field欠落またはProfile payloadの必須構造を満たさない場合に、Profile全体を拒否するのか、skip/warningとするのかが定義されていない。
- 根拠: 本仕様 §2.1、§8; 要件 SEC-004; companion仕様 §10、§11、§14.2
- 影響: Mnemonicを持たない不完全Profileを正常なProfileとして扱う実装や、構造不正payloadから秘密情報・通常read結果・replacement Storeを返す実装が生じ得る。
- 修正内容: 復号後`ProfilePayloadV1`自体の構造不正を検出した場合のerror/warning、Profile受理可否、秘密情報利用、mutationおよびreplacement Store生成の禁止条件を定義する。個別Software Key recordの既存skip規則を超える新しい一般防御は要求しない。
- 修正完了条件: 認証済み構造不正payloadについて、正常結果・秘密情報・mutation・replacement Storeを許可しない範囲と返却結果をfixtureで検証できる。

### SR-006

- Priority: Major
- Status: New
- 対象箇所: §2.1、§11; companion仕様 §11
- 問題: 不正な非対象Profileを§2.1の子オブジェクトskipで読み飛ばせる一方、mutationは対象Profileだけを置換し他Profileへ影響させないとされている。skipされた非対象Profileをreplacement Storeへ保持するのか、mutationを失敗させてreplacement Storeを返さないのかが未定義である。
- 根拠: 本仕様 §2.1、§6、§11; companion仕様 §11; 要件 SEC-019、AC-039
- 影響: mutation成功時に非対象Profileが黙って消失し、Profile間分離、atomic replacementおよび既存Store保持の受入条件に反する可能性がある。
- 修正内容: skip・構造不正・未対応versionを含む非対象Profileがある場合に、対象Profile mutationを成功させる条件と、非対象Profileのwire値を変更なく保持するか失敗してreplacementを返さないかを定義する。
- 修正完了条件: 非対象Profileに不正があるStoreでのmutationについて、秘密情報処理、成功・失敗結果、input Store不変性およびreplacement StoreのProfile集合を一意に検証できる。

## Optional Improvements

なし

## Resolved Findings

なし

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | §1〜§2でopaque Store、wire-level仕様および不正オブジェクトの責任境界を確認できる。 |
| 機能と制約 | 合格 | §2〜§13で整数key、enum、CBOR、Profile、暗号metadata、AAD、重複判定およびmigrationを確認できる。SR-001〜SR-006はMajorであり、Criticalな欠落ではない。 |
| 処理と例外 | 合格 | §2.1、§4.3、§7.1、§11〜§14で主要な不正入力、version、AAD、重複およびmutationの処理を確認できる。SR-002〜SR-006は境界条件の明確化を要するMajorである。 |
| 内部整合性 | 合格 | 主要なwire layout、AAD、重複tagおよびmigrationの関係にCriticalな矛盾はない。SR-003〜SR-006は優先順位・適用範囲を補完するMajorである。 |
| 検証可能性 | 合格 | Companion仕様 §14.1〜§14.2と要件AC-018、AC-039等により主要なencoding、暗号、破損データ、重複およびatomicityを検証できる。SR-001〜SR-006は追加境界を明確化するMajorである。 |
| 不可欠な前提の現実性と安全性 | 合格 | AAD、秘密payload、破損データおよびatomicityの主要前提は確認でき、Criticalな未確認前提はない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | `concept-sheet-review-005.md`は「要件定義へ進める」、`requirements-review-004.md`は「仕様設計へ進める」と判定している。前段に仕様設計を妨げるCritical判定はない。 |

## Final Decision

実装へ進める。品質ゲートはすべて合格し、Criticalな欠陥は確認されない。
SR-001〜SR-006は、既存のwire互換性、Profile重複、破損データ拒否およびatomicity要件を実装・検証するためのMajor修正である。

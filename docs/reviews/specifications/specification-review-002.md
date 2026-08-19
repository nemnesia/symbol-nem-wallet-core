# Specification Review Findings

## Review Target

- 対象: `docs/specifications/specification.md`
- 確認日: 2026-08-19 21:22 +0900
- 成果物: `docs/reviews/specifications/specification-review-002.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a019ef-f1c4-7792-b242-4d95c9cc7912`
- Reviewer B agent_id: `01a019f0-0d7b-7421-91ca-93c0434a36df`
- Reviewer C agent_id: `01a019f0-2ba6-7130-bbc3-7fc343df4ce6`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの agent_id へ全メモを個別送信し、各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/specification.md` §1〜§17、特に§4.2、§5.2、§8.1、§9、§10〜§14、§16 | 対象範囲、導出、初回受渡し、API DTO、署名、暗号・Store契約、状態遷移、Binding境界および検証条件を確認 |
| 保存フォーマット仕様 | `docs/specifications/wallet-store-format-v1.md` §6〜§12 | CBOR schema、平文 metadata、AAD、重複タグ、導出情報および optional field の wire 表現を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 対象利用者、提供価値、Core / Application / Binding の責任境界および秘密情報ライフサイクルとの整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 実在する対象ベース名の最大連番として確認。公開された判定「要件定義へ進める」と品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` §3〜§12、特にFR-001/003/005/009/017/019/021、SEC-004/010/017/018、DR-006/008、AC-001/005/009/018/033〜035/038 | 仕様が満たすべき既存要件、互換性、生成鍵妥当性、秘密情報境界、初回受渡し、atomicity および受入条件を確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | 公開された判定「仕様設計へ進める」、RR-020〜RR-022および品質ゲートを確認。本文が参照する不存在の `concept-sheet-review-006.md` は未確認とし、実在する `concept-sheet-review-005.md` を確認 |
| 承認済み要件またはプロジェクト資料 | `docs/decisions/open-001.md`、`docs/decisions/open-validity-001.md` | `symbol-sdk` 3.3.2 互換性、HD Wallet の仕様設計責任、Mnemonic / 秘密鍵の妥当性・安全性判定責任を確認 |
| 実装者からの仕様フィードバック | 未確認 | 対応する実装ソースの単一 source-root と指定ファイルを確認できないため |

## Review Result

実装へ進める

## Summary

仕様書は、v1の対象範囲、責任境界、秘密情報保護、主要API、保存形式の参照先、atomic 更新および検証方針を定義している。
前回指摘のうち、保存形式の整数 key、variant、AAD、HMAC 入力などの大部分は `wallet-store-format-v1.md` へ具体化された。
一方、HD導出・既存Wallet互換性、初回Mnemonic受渡し、API DTO・署名結果、manifest整合性、Pending blob、Generated Key安全性には既存要件に基づく補完が残る。
Criticalな欠陥は確認されず、MajorおよびMinorの対応事項を残して実装へ進める判定とする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | Open | specification-review-001 | HD導出の一意な規則と既存Wallet互換性の対象・保証・判定責任が未確定のまま残る。 |
| SR-002 | Major | Open | specification-review-001 | 初回Mnemonic受渡しの成功条件、責任、保護範囲および失敗・中断時の扱いが未確定のまま残る。 |
| SR-003 | Major | Open | specification-review-001 | 広範な符号化不足は縮小したが、`AccountMetadataV1.name` の optional wire 表現とAAD内表現が未確定である。 |
| SR-004 | Major | Open | specification-review-001 | 共通API DTO、署名結果および外部表現の不足が残る。 |
| SR-005 | Major | Open | specification-review-001 | `registry_key` / `duplicate_tag` の改変検出・拒否または重複判定維持条件が未定義である。 |
| SR-006 | Minor | Open | specification-review-001 | 主要APIの失敗条件と既存error codeの対応が未定義である。 |
| SR-007 | Major | Open | specification-review-001 | `PendingProfileBlob` の有効性、適用整合性、重複および失敗時不変条件が未定義である。 |
| SR-008 | Major | New | specification-review-002 | passwordless `list_software_keys` と暗号化payload内の `origin` の契約が整合していない。 |
| SR-009 | Major | New | specification-review-002 | Generated Software Key の安全な生成条件と検証可能な乱数源要件が未定義である。 |

## Required Changes

### SR-001

- Priority: Major
- Status: Open
- 対象箇所: `specification.md:107-122, 161, 594-606`
- 問題: 導出パス、BIP39 seed生成および固定fixtureは示されているが、HD master/child key の導出規則とChainごとの鍵変換規則、既存Symbol / NEM Walletの対象・保証範囲・判定責任が一意でない。
- 根拠: 仕様本文 §4.2、§14.1、要件本文 `DR-008`・`AC-033`、要件レビュー結果 `RR-021`、承認済み決定 `docs/decisions/open-001.md:21-36`
- 影響: 同じ Mnemonic、Network、account index から異なる秘密鍵が生成され得て、Derived Key の再現性と既存Wallet復元互換性を独立検証できない。
- 修正内容: 既存Walletの対象、互換性保証範囲、判定責任および導出結果を一意に判定できる規範または承認済み固定ベクタを明記する。具体的な実装方式は指定しない。
- 修正完了条件: 対象Wallet、保証範囲、判定責任および同一入力からの導出結果を仕様または承認済み資料から確認できる。

### SR-002

- Priority: Major
- Status: Open
- 対象箇所: `specification.md:249-266, 321-331, 562-576`
- 問題: `finalize_generated_profile` を呼べる初回Mnemonic受渡し完了の外部判定条件、責任主体、意図した受領者への受渡し、失敗・中断時のProfile作成可否が一意でない。
- 根拠: 要件本文 `FR-001`・`FR-019`・`SEC-010`・`SEC-017`・`AC-001`・`AC-034`、要件レビュー結果 `RR-022`
- 影響: バックアップ未完了または意図しない受渡しでもProfile作成を成功扱いする解釈が残り、利用者の復元可能性と責任境界を検証できない。
- 修正内容: 受渡し成功の成立条件、責任主体、保護対象、失敗・中断時にProfileを正常状態として残さない条件を、外部から判定可能な形で明記する。UI方式や具体的な確認手順は指定しない。
- 修正完了条件: 受渡しの成功・失敗・中断、保護対象、責任主体およびProfile状態を仕様から一意に判定できる。

### SR-003

- Priority: Major
- Status: Open
- 対象箇所: `specification.md:230, 438`; `wallet-store-format-v1.md:297-326, 469-493`
- 問題: 保存形式の整数 key、deterministic CBOR、AADおよびHMAC入力は大部分が定義されたが、`AccountMetadataV1.name` が未指定の場合の map key 省略と `null` の扱い、およびAAD内の nested `accounts` における optional field 表現が一意でない。
- 根拠: 保存フォーマット §7.3・§11、仕様本文 §6.3・§7、前回仕様レビュー `SR-003`
- 影響: 同じ論理metadataから異なるAAD、暗号文またはStore bytesが生成され、Native/WASMや独立実装間で認証・保存形式の互換性を検証できない。
- 修正内容: optional field の wire 表現とAAD内 `accounts` 表現を、既存保存形式の範囲で一意に確認可能にする。CBORライブラリや保存方式の再設計は指定しない。
- 修正完了条件: 名前未指定の `AccountMetadataV1` について、独立実装が同じAADおよびStore bytesを再現できる。

### SR-004

- Priority: Major
- Status: Open
- 対象箇所: `specification.md:288, 326, 402-415, 440-486, 582-605`
- 問題: `PreparedProfile`、`PublicAccountInfo`、`Signature` および公開API DTOについて、観測可能な項目、型の意味、公開鍵・アドレス・署名の外部表現、署名対象と結果の契約が不足している。
- 根拠: 仕様本文 §9・§13・§14.1、要件本文 `FR-009`・`FR-013`・`FR-019`・`NFR-001`〜`NFR-004`・`AC-009`・`AC-013`・`AC-015`・`AC-024`
- 影響: Native/WASM Bindingが同じAPI結果を解釈できず、公開情報および署名結果を独立検証できない。
- 修正内容: 公開API DTOの観測可能な項目、値の意味、秘密情報を含まない外部表現、payloadの署名対象および署名結果の外部表現とNative/WASM間の同一性を明記する。Transaction構築、ライブラリおよび内部実装方式は指定しない。
- 修正完了条件: Native/WASMの双方で各公開API結果と署名結果を同じ外部契約として解釈・検証できる。

### SR-005

- Priority: Major
- Status: Open
- 対象箇所: `specification.md:204-218, 230-241, 522-537`; `wallet-store-format-v1.md:153-180, 184-219, 469-541`
- 問題: Profile重複判定に使う `registry_key` と `duplicate_tag` がProfile encryptionのAAD構成に含まれず、これらの改変時に破損Storeとして拒否する条件または重複判定を正しく維持する条件が定義されていない。
- 根拠: 仕様本文 §6.3・§7・§11、保存フォーマット §6・§7・§11・§12、要件本文 `FR-017`・`DR-006`・`SEC-004`・`AC-018`
- 影響: 平文manifestの重複判定情報だけが改変されてもAEAD認証に成功し、破損Storeの受理や同一Mnemonic・Networkの重複Profile登録につながる可能性がある。
- 修正内容: 重複判定と保存データ整合性に必要なmanifest項目の改変を、既存の破損データ拒否および重複禁止の要件に従って検証可能にする。検知方式は指定しない。
- 修正完了条件: manifestの改変が正常Storeとして扱われず、同一Mnemonic・Networkの重複禁止を検証できる。

### SR-007

- Priority: Major
- Status: Open
- 対象箇所: `specification.md:249-266, 328-331, 490-518, 522-537`
- 問題: `PendingProfileBlob` が versioned opaque blob とされるだけで、有効性、適用対象Storeとの整合性、既存Profile重複時の扱い、`PendingProfileInvalid` の発生条件および無効値・失敗時の入力Store不変条件が定義されていない。
- 根拠: 仕様本文 §8.1・§10・§11・§13、要件本文 `FR-001`・`FR-017`・`FR-019`・`SEC-018`・`AC-001`・`AC-018`・`AC-034`・`AC-038`
- 影響: 別Store由来・破損・不正なPending blobのfinalize可否、重複防止、Profile作成済み／未作成の結果およびatomicityを独立検証できない。
- 修正内容: Pending blobの受理・拒否条件、対象Storeとの整合性、重複時の結果および失敗・中断時に入力Storeを変更せずreplacement Storeを返さない条件を明記する。内部構造、期限、再利用回数およびWASM固有構造は指定しない。
- 修正完了条件: 有効・無効Pending、適用不整合、重複、失敗・中断時のStore結果を仕様から一意に判定できる。

### SR-008

- Priority: Major
- Status: New
- 対象箇所: `specification.md:356-360, 440-460`; `wallet-store-format-v1.md:297-326, 330-385`
- 問題: `list_software_keys` はパスワードなしで実行でき、`SoftwareKeyInfo` は `origin` を返すが、平文 `AccountMetadataV1` に `origin` はなく、`origin` は暗号化された `SoftwareKeyRecordV1` 内に保存される。
- 根拠: 仕様本文 §9.2〜§9.3、保存フォーマット §7.3・§8・§9、要件本文 `DR-004`・`FR-019`
- 影響: パスワード不要の一覧APIと保存形式を同時に満たすことができず、Software Keyの由来を同じ外部契約で一覧表示・検証できない。
- 修正内容: passwordless一覧で利用可能なデータと `SoftwareKeyInfo` の外部契約を、既存の秘密情報非公開およびSoftware Key由来の識別要件に整合させる。新しい秘密情報公開や特定の保存方式は指定しない。
- 修正完了条件: パスワードなし一覧の入力条件で、`SoftwareKeyInfo` の各項目を仕様に反する追加秘密情報なしで一意に取得または扱える。

### SR-009

- Priority: Major
- Status: New
- 対象箇所: `specification.md:152-161, 379-385, 610-634`
- 問題: Generated Software Key の生成について、Mnemonic生成に記載されたCSPRNG要件が適用されることも、生成鍵の安全性を判定する条件も明記されていない。all-zero拒否と公開鍵生成可否だけでは、予測可能な鍵を排除できない。
- 根拠: 仕様本文 §5.2、`generate_software_key` API、§14.2、要件本文 `FR-005`・`FR-021`・`AC-005`・`AC-035`、承認済み決定 `docs/decisions/open-validity-001.md:9-34`
- 影響: Coreが生成したGenerated Keyの妥当性・安全性を受入条件として検証できず、既存要件の安全な秘密鍵生成を一意に確認できない。
- 修正内容: Generated Keyについて、予測可能な値を受理しない安全な生成条件、乱数源の規範的条件および検証可能な受入条件を明記する。特定ライブラリ、実装構造または追加暗号方式は指定しない。
- 修正完了条件: Generated Keyの生成が既存の妥当性・安全性要件を満たすことを、実装と独立テストで判定できる。

## Optional Improvements

### SR-006

- Priority: Minor
- Status: Open
- 対象箇所: `specification.md:490-518` と §9.2の各API
- 改善内容: 既存のerror code一覧について、主要な入力不正、対象不存在、認証失敗、重複、破損Store、Pending不正等と各APIの対応を明記する。
- 根拠: 仕様本文 §9・§10・§13.1、要件本文 `FR-019`・`NFR-001`〜`NFR-004`・`AC-015`・`AC-024`
- 影響: Native/WASM間で同じ失敗条件を異なるerror codeとして公開する解釈差を減らせる。全例外の網羅や新規error codeは必要としない。

## Resolved Findings

なし

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | 仕様§1〜§2でCore、Native/WASM Binding、Applicationの責任境界、対象外、Profile / Network / Chainの範囲を確認できる。 |
| 機能と制約 | 合格 | 仕様§3〜§10および要件FR/SEC/DRで主要機能・入力・出力・制約を確認できる。SR-001、SR-003〜SR-005、SR-007〜SR-009は既存契約のMajor補完であり、Criticalな欠落ではない。 |
| 処理と例外 | 合格 | 仕様§4.3、§8、§10〜§11、§14で主要な正常系、失敗条件、atomicityおよび検証対象を確認できる。SR-002、SR-007は初回受渡し・Pendingの判定条件を補うMajorである。 |
| 内部整合性 | 合格 | Profile、Mnemonic、Software Key、Network、暗号化、Bindingおよび状態変更の基本関係にCriticalな矛盾はない。SR-005とSR-008は既存保存形式とAPI契約の整合条件を補う。 |
| 検証可能性 | 合格 | 仕様§14と要件AC-001〜AC-043で主要な互換性、暗号、失敗、削除、生成鍵、初回受渡しおよびBindingの検証対象を確認できる。SR-001〜SR-009は既存検証を一意化する補完である。 |
| 不可欠な前提の現実性と安全性 | 合格 | 要件本文、`open-001`、`open-validity-001`および仕様§5〜§13で主要な互換性、妥当性、認可、秘密情報保護およびatomicityの前提を確認できる。未確認の実装者フィードバックはあるが、Criticalな未確認前提は確認されない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | 実在する `concept-sheet-review-005.md` は「要件定義へ進める」、`requirements-review-004.md` は「仕様設計へ進める」と判定している。RR-021/RR-022はSR-001/SR-002へ追跡され、前段のMajor/Minorは仕様設計を妨げるCriticalな矛盾ではない。 |

## Final Decision

実装へ進める。全品質ゲートにCriticalな不合格はなく、現在のスコープは実装・検証へ移行できる。
SR-001〜SR-005、SR-007〜SR-009は既存要件に基づくMajorの仕様補完、SR-006は既存error code契約のMinor補完として記録する。

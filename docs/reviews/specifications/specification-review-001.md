# Specification Review Findings

## Review Target

- 対象: `docs/specifications/specification.md`
- 確認日: 2026-08-19 05:46
- 成果物: `docs/reviews/specifications/specification-review-001.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a0169a-40a4-7a21-abd9-d8f53d83216b`
- Reviewer B agent_id: `01a0169a-40eb-7181-802a-5c2844409611`
- Reviewer C agent_id: `01a0169a-4143-7a91-9691-4aa5b41c441f`
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ3つの agent_id へ全メモを個別送信し、各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 仕様本文 | `docs/specifications/specification.md` §1〜§19、特に§4.4、§6.3、§7、§8.1、§9、§10、§14、§15 | 仕様の範囲、HD導出、保存形式、初回受渡し、公開API、エラー、互換性・暗号化fixtureおよび検証条件を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 対象利用者、v1範囲、Core・Binding・Applicationの責任境界および秘密情報ライフサイクルとの整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-005.md` | 対象一致、Review Result「要件定義へ進める」、公開された継続指摘および品質ゲートを確認 |
| 要件本文 | `docs/requirements/requirements.md` §4〜§12、特にFR-001/003/009/011/012/017/019、SEC-004/005/010/017/018、DR-006/008、AC-001/009/012/017/033/034 | 仕様が満たすべき既存要件、責任境界、互換性、整合性、削除、受渡しおよび受入条件を確認 |
| 要件レビュー結果 | `docs/reviews/requirements/requirements-review-004.md` | 対象一致、Review Result「仕様設計へ進める」、RR-020〜RR-022および品質ゲートを確認 |
| 実装者からの仕様フィードバック | 未確認 | 対応する `source-root` を一意に特定できる実装ソースがなく、指定されたフィードバックファイルを確認できないため |

要件レビュー結果が参照する `concept-sheet-review-006.md` は存在しないため、実在する対象ベース名の最大番号である `concept-sheet-review-005.md` を確認した。これは未確認事項として扱い、存在しないレビュー内容を根拠にしていない。

## Review Result

実装へ進める

## Summary

仕様書は、v1の対象範囲、責任境界、秘密情報保護、状態変更、主要APIおよび検証方針を定義している。
一方、既存要件を実装・検証するため、HD導出と既存Wallet互換性、初回Mnemonic受渡し、暗号・保存データ符号化、manifest整合性、DTO、error mapping、Pending blobの条件を補完する必要がある。
これらはMajorまたはMinorの仕様補完であり、Criticalな品質ゲート不合格は確認されない。
上流のコンセプトレビューおよび要件レビューは、いずれも次工程への進行判定である。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| SR-001 | Major | New | specification-review-001 | HD導出の再現性と既存Wallet互換性の対象・保証・判定責任が一意でない。 |
| SR-002 | Major | New | specification-review-001 | 初回Mnemonic受渡しの完了条件、責任、保護範囲および失敗・中断時の扱いが一意でない。 |
| SR-003 | Major | New | specification-review-001 | AAD、CBOR、列挙値、整数、文字列およびHMAC入力の規範的符号化が一意でない。 |
| SR-004 | Major | New | specification-review-001 | 共通API DTOの観測可能な項目、型および外部表現が不足している。 |
| SR-005 | Major | New | specification-review-001 | 平文manifestの重複判定情報について改変時の検証条件がない。 |
| SR-006 | Minor | New | specification-review-001 | 公開APIの失敗条件と共通error codeの対応が不足している。 |
| SR-007 | Major | New | specification-review-001 | PendingProfileBlobの有効性、適用整合性、重複検証および失敗時不変条件が不足している。 |

## Required Changes

### SR-001

- Priority: Major
- Status: New
- 対象箇所: `specification.md:155-170, 732-752`
- 問題: HD導出方式が「Ed25519系の hardened derivation」と導出パスの列挙に留まり、導出結果を一意に再現できない。既存 Symbol / NEM Wallet との復元互換性についても、対象Walletの範囲・世代、保証範囲および判定責任が定義されていない。
- 根拠: 仕様本文 §4.4、§14.1〜§14.2、要件本文 `DR-008`・`AC-033`、要件レビュー結果 `requirements-review-004.md:69-78`（RR-021）、承認済み決定 `docs/decisions/open-001.md:21-36`
- 影響: Derived Software Keyの実装結果および既存Wallet復元互換性を一意に判定できず、`AC-033`の受入検証と互換性責任が不安定になる。
- 修正内容: 既存Walletの対象範囲、互換性保証範囲、判定責任および受入根拠を確認可能にし、導出結果を一意に再現できる規範または承認済み固定ベクタを明示する。具体的な方式の選択は、既存要件と承認済み資料の範囲に留める。
- 修正完了条件: 対象Wallet、保証範囲、判定責任および導出結果の判定根拠を仕様または承認済み資料から一意に確認できる。

### SR-002

- Priority: Major
- Status: New
- 対象箇所: `specification.md:411-434, 469-478, 680-692, 833-845`
- 問題: `finalize_generated_profile` を呼べる「初回Mnemonic受渡し完了」の外部確認条件、意図した受領者への受渡し、受渡し中の保持・公開・診断出力禁止の保護範囲および完了判定責任が一意に定義されていない。
- 根拠: 要件本文 `FR-001`・`FR-019`・`SEC-010`・`SEC-017`・`AC-001`・`AC-034`、要件レビュー結果 `requirements-review-004.md:80-89`（RR-022）
- 影響: 不完全または意図しない受渡しでもProfile作成を成功扱いでき、Binding・Application・利用者の責任分界と失敗時の受入判定が不安定になる。
- 修正内容: Profile作成成功となる受渡し成立条件、意図した受領者、保護対象、責任主体および受渡し失敗・中断時のProfile作成可否を、外部から確認可能な条件として明記する。UIや具体的な受渡し方式は指定しない。
- 修正完了条件: 受渡しの成功・失敗・中断、保護対象および責任主体を仕様から一意に判定できる。

### SR-003

- Priority: Major
- Status: New
- 対象箇所: `specification.md:264-278, 305-397, 732-764`
- 問題: AAD、deterministic CBOR、variant、整数、文字列およびHMAC入力の正規化・連結・符号化が一意に定義されていない。
- 根拠: 仕様本文 §6.3、§7.1〜§7.6、§14.3、要件本文の暗号化・保存形式・重複判定に関する `FR-006`・`FR-017`・`SEC-004`・`DR-006`
- 影響: 実装間でAAD、暗号文、duplicate tagおよびWallet Store bytesが一致せず、暗号化fixture、重複判定およびNative/WASM共通処理を検証できない。
- 修正内容: 各値、variant、整数、文字列、連結データおよびCBORのバイト表現を、規範的な符号化規則またはそれと同等に結果を一意に拘束する承認済み固定ベクタで確認可能にする。ライブラリや実装構造は指定しない。
- 修正完了条件: 同一入力からAAD、duplicate tag、暗号化fixtureおよびStore bytesを独立実装間で一意に再現できる。

### SR-004

- Priority: Major
- Status: New
- 対象箇所: `specification.md:460-584, 696-728`
- 問題: `PreparedProfile`、`PublicAccountInfo`、`Signature`および一部の公開API DTOについて、外部から観測可能なフィールド、型の意味、秘密情報を含まない外部表現、署名・バイト列表現が定義されていない。
- 根拠: 仕様本文 §9・§13、要件本文 `FR-009`・`FR-013`・`FR-019`・`NFR-001`〜`NFR-004`・`AC-009`・`AC-013`・`AC-015`・`AC-024`
- 影響: Native/WASM Bindingが共通API契約を同じ意味で実装できず、公開鍵・アドレス・署名結果の互換性を独立検証できない。
- 修正内容: 概念APIに列挙された公開APIについて、利用者が観測する項目、型の意味、秘密情報を含まない外部表現、署名およびバイト列の表現とNative/WASM間の同一性を明記する。Binding方式や言語固有型は指定しない。
- 修正完了条件: Native/WASMの双方で、各公開APIの結果を同じ外部契約として解釈・検証できる。

### SR-005

- Priority: Major
- Status: New
- 対象箇所: `specification.md:264-278, 317-351, 386-401`
- 問題: 平文manifestに保存される `registry_key` と `duplicate_tag` がAADの構成値に含まれず、これらの改変を検出した場合の扱いも定義されていない。
- 根拠: 仕様本文 §2.1、§6.3、§7.2〜§7.6、要件本文 `FR-017`・`DR-006`・`SEC-004`
- 影響: 暗号化payloadの復号は成功したまま重複判定情報だけが改変され、破損Storeを正常データとして受理したり、同一Mnemonic・Networkの重複Profile登録を許したりする可能性がある。
- 修正内容: 重複判定および保存データ整合性に必要なmanifest項目について、改変を破損Storeとして検出・拒否するか、改変後も重複判定を正しく維持できる検証条件を明記する。検知方式は指定しない。
- 修正完了条件: manifestの改変が正常Storeとして受理されず、既存の重複Profile禁止と破損データ拒否を検証できる。

### SR-007

- Priority: Major
- Status: New
- 対象箇所: `specification.md:413-445, 469-478`
- 問題: `PendingProfileBlob` の有効性、対象Storeとの適用整合性、finalize時の既存Profileとの重複・Network検証および無効値・失敗時にStoreを変更しない条件が定義されていない。
- 根拠: 仕様本文 §8.1・§10・§11、要件本文 `FR-001`・`FR-017`・`SEC-018`・`AC-001`・`AC-018`・`AC-038`、要件レビュー結果 `requirements-review-004.md:80-89`（RR-022）
- 影響: 別Store由来または不正なPending blobのfinalize可否、Profile重複防止および初回受渡し失敗時のatomicityを一意に検証できない。
- 修正内容: PendingProfileBlobの目的・版・構造の有効性、finalize時に確認すべき既存Profileとの整合性および異常時に入力Storeを変更しない条件を明記する。対象Storeへの結合方式など、既存要件にない具体的設計は指定しない。
- 修正完了条件: 有効・無効Pending blob、重複、適用不整合および失敗・中断時のStore結果を仕様から一意に判定できる。

## Optional Improvements

### SR-006

- Priority: Minor
- Status: New
- 対象箇所: `specification.md:588-609`
- 改善内容: 定義済み公開APIの主要な失敗条件と、Binding共通の安定したerror codeとの対応を明記する。
- 根拠: 仕様本文 §9・§10・§13.1、要件本文 `FR-019`・`NFR-001`〜`NFR-004`および受入条件 `AC-015`・`AC-024`
- 影響: Native/WASM間で同一失敗条件のエラー解釈および受入テスト判定が異なる可能性を減らせる。

## Resolved Findings

なし

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と範囲 | 合格 | 仕様書§1〜§2でCoreの責務、対象外、Profile・Network・Chainの範囲を確認できる。 |
| 機能と制約 | 合格 | 仕様書§3〜§10および要件本文FR/SEC/DRで主要機能・入力・出力・制約を確認できる。SR-001、SR-003〜SR-005、SR-007はMajorの仕様補完であり、Criticalな欠落ではない。 |
| 処理と例外 | 合格 | 仕様書§4.5、§8、§10〜§11、§15で主要な正常系、失敗条件、atomicityおよび検証項目を確認できる。SR-002、SR-007は受渡し・Pending条件のMajor補完である。 |
| 内部整合性 | 合格 | 仕様書内のProfile、Mnemonic、Software Key、Network、暗号化、Bindingおよび状態変更の基本関係に実装を妨げるCriticalな矛盾はない。SR-005はmanifest整合性条件のMajor補完である。 |
| 検証可能性 | 合格 | 仕様書§14〜§15と要件AC-001〜AC-040で主要な互換性、暗号、失敗、削除およびBindingの検証対象を確認できる。SR-001〜SR-007は既存検証を一意化する補完である。 |
| 不可欠な前提の現実性と安全性 | 合格 | 要件本文、`open-001`、`open-002`、`open-validity-001`および仕様書§6、§12、§15で主要な互換性、妥当性、認可、秘密情報保護およびatomicityの前提を確認できる。Criticalな未確認前提はない。 |
| コンセプト・要件定義との整合性と前段品質判定 | 合格 | `concept-sheet-review-005.md` は「要件定義へ進める」、`requirements-review-004.md` は「仕様設計へ進める」と判定している。上流のRR-021/RR-022はSR-001/SR-002へ追跡され、仕様設計を妨げるCriticalな矛盾はない。 |

## Final Decision

実装へ進める。仕様書は現在のv1範囲と主要な保護・検証方針を備え、品質ゲートに合格した。
実装時の解釈差を防ぐため、SR-001、SR-002、SR-003、SR-004、SR-005およびSR-007はMajorの対応事項として仕様へ反映し、SR-006は共通エラー契約の明確化事項として扱う。

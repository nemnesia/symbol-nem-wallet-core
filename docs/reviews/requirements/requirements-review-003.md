# Requirements Review Findings

## Review Target

- 対象: `docs/requirements/requirements.md`
- 確認日: 2026-08-17 22:37
- 成果物: `docs/reviews/requirements/requirements-review-003.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a00fe9-5f75-72a3-bca7-56b0156ffae2`
- Reviewer B agent_id: `01a00fe9-908a-7681-a33a-896ab06b9acd`
- Reviewer C agent_id: `01a00fe9-c0d5-7531-8856-c479ec2635f5`
- Phase 1: 完了。各 Reviewer を個別に `multi_agent_v1__wait_agent` で確認
- Phase 2: 完了。同一 Reviewer へ候補全集合を送信し、各 Reviewer を個別に `multi_agent_v1__wait_agent` で確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 要件本文 | `docs/requirements/requirements.md` §1〜§14 | 目的、対象範囲、責任、機能・非機能・セキュリティ要件、受け入れ条件、失敗時整合性、未決定事項、過去指摘への対応状態を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 要件定義書との目的、対象、提供価値、秘密情報ライフサイクル、責任境界および成功条件の整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-004.md` | 対象一致、鮮度、Review Result「要件定義へ進める」、CR-010〜CR-012および品質ゲートを確認 |
| 承認済み決定・ベースライン | `docs/decisions/open-001.md`、`docs/decisions/open-002.md`、`docs/decisions/requirements-baseline-001.md` | 互換性基準、パスワード品質の責任分界、要件承認・追跡性および現行正本を確認 |
| 過去要件レビュー | `docs/reviews/requirements/requirements-review-001.md`、`requirements-review-002.md` | RR-001〜RR-017の正式ID、重大度、状態および同一問題の継承を確認 |

## Review Result

仕様設計へ進める

## Summary

現行要件定義書は、前回の主要指摘を要件本文と承認済み決定記録へ反映し、互換性、認可、秘密情報保護、WASM境界、状態変更整合性を受入条件まで追跡できる。
一方、初回Mnemonicバックアップの責任・失敗時扱い、およびProfile削除後の外部Mnemonic再利用可否は、Mnemonic復元ライフサイクルの境界として一意でない。
また、生成・復元・取込みに適用する「承認済み妥当性基準」の根拠・承認責任が追跡できない。
これらはMajorの継続・再発指摘とMinorの追跡性指摘であり、仕様設計開始を妨げるCriticalな品質ゲート不合格は確認されない。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| RR-001 | Major | Resolved | requirements-review-001 | OPEN-001と`symbol-sdk` 3.3.2互換基準、基準日、HD Walletの設計分離を確認した。requirements.md:107-119,314-315、docs/decisions/open-001.md |
| RR-002 | Major | Resolved | requirements-review-001 | 未指定・空・Core既定値のProfileパスワード拒否と、品質ポリシーを上位責任とする分界を確認した。requirements.md:68-79,190,281、docs/decisions/open-002.md |
| RR-003 | Minor | Resolved | requirements-review-001 | Mnemonicを含む秘密情報の暗号化保存と平文永続保存禁止を確認した。requirements.md:172,176,210,238-240,253-254 |
| RR-004 | Minor | Resolved | requirements-review-001 | 公開情報とMnemonic・秘密鍵・Profileパスワードの返却境界を確認した。requirements.md:83,159,189,219,224,277-278 |
| RR-005 | Minor | Resolved | requirements-review-001 | `DEC-REQ-001`により初期承認ベースライン、現行正本、決定記録およびGit履歴への追跡性を確認した。requirements.md:13-20,367、docs/decisions/requirements-baseline-001.md |
| RR-006 | Major | Resolved | requirements-review-001 | 処理単位の認可と継続Unlocked状態禁止を確認した。requirements.md:73-75,141-143,177,259 |
| RR-007 | Major | Resolved | requirements-review-001 | パスワード復旧・リセット非提供、Core認可、破壊的操作の認証を確認した。requirements.md:76,155,211,217-223,282-283 |
| RR-008 | Major | Resolved | requirements-review-001 | 失敗・入力エラー・破損データ・診断／補助出力を含む秘密情報非開示を確認した。requirements.md:219-225,284,288 |
| RR-009 | Major | Resolved | requirements-review-002 | Imported／Generated Software Key登録のProfileパスワード認可と失敗時状態不変を確認した。requirements.md:133-139,174-175,211,256-257 |
| RR-010 | Major | Reopened | requirements-review-002 | 初回Mnemonic受渡しは追加されたが、バックアップ確保責任、受渡し失敗・紛失時の復旧責任、Profile削除後のMnemonic再作成可否が一意でない。requirements.md:88,103,127,155,189,219,286,297-306 |
| RR-011 | Minor | Resolved | requirements-review-002 | Derived／Imported／Generatedすべてについて指定Chain・Networkの公開鍵・アドレス・署名結果を扱うことを確認した。requirements.md:157-159,183,242,265 |
| RR-012 | Major | Resolved | requirements-review-002 | OPEN-002によりProfileパスワード品質ポリシーを上位Application／Packageの責任とすることを確認した。requirements.md:78-79,190,230,281,293,338、docs/decisions/open-002.md |
| RR-013 | Major | Reopened | requirements-review-002 | 妥当性確認と失敗時未登録は明示されたが、「承認済み妥当性基準」の出所・適用範囲・承認責任を追跡できない。requirements.md:174-175,191,256-257,287,324-329、docs/decisions/open-001.md、open-002.md |
| RR-014 | Major | Resolved | requirements-review-002 | 一時的に扱う秘密情報を必要範囲に限定し、成功・失敗・中断後に継続利用可能状態や診断出力へ残さないことを確認した。requirements.md:220-225,280,288,330-336 |
| RR-015 | Major | Resolved | requirements-review-002 | `symbol-sdk` 3.3.2との外部検証互換性を要件・受入条件・決定記録で確認した。requirements.md:111-119,179,245,261,285、docs/decisions/open-001.md |
| RR-016 | Major | Resolved | requirements-review-002 | 状態変更を外部観測上atomicに扱い、失敗時に部分適用を残さないことを確認した。requirements.md:180-182,226,263-264,289,297-304 |
| RR-017 | Major | Resolved | requirements-review-002 | 要求対象Profile以外の秘密情報・認証状態・利用可否へ作用しないことを確認した。requirements.md:227,290,306 |
| RR-018 | Minor | New | requirements-review-003 | 要件本文の目的・ユースケースと、コンセプト本文の背景・対象利用者・主要利用場面との明示的な追跡が弱い。requirements.md:3-24,123-163、concept-sheet.md:12-49 |
| RR-019 | Major | New | requirements-review-003 | Profile削除後に利用者が保持するMnemonicから同一NetworkのProfileを再作成できるか、SEC-005の「再利用不可」がCore内削除データだけを指すかが不明である。requirements.md:125-127,153-155,171,187,214,253-264,286 |

## Required Changes

### RR-010

- Priority: Major
- Status: Reopened
- 対象箇所: §2.4〜§2.5、UC-001、UC-008、FR-001、FR-012、FR-019、SEC-005、SEC-010、SEC-017、AC-012、AC-034、§10
- 問題: 新規Mnemonicの初回バックアップ用一時受渡し、保存済み暗号化Profileデータのバックアップ対象外、既存MnemonicからのProfile復元はそれぞれ記載されている。しかし、初回Mnemonicのバックアップ確保責任、受渡し失敗・中断・紛失時のProfile作成結果と復旧責任、およびProfile削除後の外部Mnemonic再利用との関係が一意でない。
- 根拠: 要件本文 requirements.md:88,103,127,155,189,219,225,286,297-306、コンセプトレビュー結果 concept-sheet-review-004.md:49-64
- 影響: Mnemonicを失った場合のCore、上位Application／Package、利用者の責任、Profile削除の不可逆性、既存Mnemonic復元の受入判定を仕様設計で別解釈できる。
- 修正内容: 初回Mnemonicバックアップ、既存MnemonicからのProfile復元、Profile削除後のMnemonic再作成、暗号化Profileデータの復旧を別のライフサイクルとして整理し、各経路の提供範囲、責任主体、受渡し失敗・紛失時のProfile状態と復旧可否を要件化する。バックアップ形式、API、内部状態遷移は仕様設計へ残す。
- 修正完了条件: 生成Mnemonic、利用者保有Mnemonic、削除済みProfile、暗号化Profileデータの各状態について、再利用・復元の可否と責任分界を要件本文から判定できる。

### RR-013

- Priority: Major
- Status: Reopened
- 対象箇所: FR-001、FR-004、FR-005、FR-021、AC-004、AC-005、AC-035、§12.1、§14
- 問題: Mnemonic・秘密鍵について妥当性基準を満たす値だけを登録・利用し、失敗時に登録しないことは定義されているが、「承認済み妥当性基準」の出所、適用範囲、承認・維持責任が要件本文または承認済み決定記録から追跡できない。
- 根拠: 要件本文 requirements.md:174-175,191,256-257,285-287,324-329、承認済み決定 docs/decisions/open-001.md:21-36、open-002.md:8-26、requirements-baseline-001.md:18-32
- 影響: 新規生成、既存Mnemonic復元、外部秘密鍵取込みの合否を第三者が再現可能な根拠で判定できず、生成品質と入力受入境界を仕様設計で補完することになる。
- 修正内容: Mnemonicおよび秘密鍵の生成・復元・取込みに適用する妥当性・安全性基準の承認済み根拠または責任主体を要件または承認済み決定記録へ追跡可能にする。基準が未確定なら要件レベルの未決定事項として管理する。具体的なアルゴリズム、入力形式、暗号方式は指定しない。
- 修正完了条件: 各秘密情報経路に適用される妥当性基準、適用範囲、承認・維持責任をリポジトリ内の承認済み根拠へ追跡できる。

### RR-019

- Priority: Major
- Status: New
- 対象箇所: UC-001、UC-008、FR-001、FR-012、SEC-005、AC-012、AC-018、AC-034
- 問題: Profile削除はProfile、Mnemonic、全Software Keyを破棄するとされ、SEC-005は削除済みProfileの秘密情報を再利用できないと定める。一方、UC-001／FR-001は既存MnemonicからProfileを復元・作成できると定めるため、利用者が削除前に保持したMnemonicからの再作成可否と、SEC-005が禁止する対象の範囲が一意でない。
- 根拠: 要件本文 requirements.md:125-127,153-155,171,182,187,214,253-264,286
- 影響: Profile削除の不可逆性、Mnemonic復元の対象範囲、削除後の受入判定および利用者の復旧責任が仕様設計で分岐する。
- 修正内容: 明示的なProfile削除後に利用者が保持するMnemonicから同一NetworkのProfileを再作成できるかを決定し、許可する場合はSEC-005をCore内の削除済みデータの再利用禁止として限定するなど、UC-001、SEC-005、FR-012、AC-012、AC-034の適用範囲を整合させる。Mnemonicの形式や保存方式は定めない。
- 修正完了条件: Profile削除後の外部Mnemonic再利用可否と、削除済み秘密情報の再利用禁止の対象範囲を要件本文から一意に判定できる。

## Optional Improvements

### RR-018

- Priority: Minor
- Status: New
- 対象箇所: §1.1、§2、§4、§5、コンセプト対応根拠
- 改善内容: コンセプト本文にある背景・解決課題、対象利用者、主要利用場面と、要件本文の目的・ユースケース・責任境界との対応を明示的に追跡できるようにする。要件書へコンセプト内容を全面的に重複記載する必要はない。
- 根拠: 要件本文 requirements.md:3-24,123-163、コンセプト本文 concept-sheet.md:12-49、コンセプトレビュー結果 concept-sheet-review-004.md:77-84
- 影響: 要件単独で、誰のどの課題を対象にするか、どの利用主体がCoreを呼び出すかを確認しやすくなる。CR-011に関連するが、コンセプトレビューのGate 8は合格である。

## Resolved Findings

### RR-001

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-001
- 対象箇所: §3、§11〜§12
- 対応確認: `symbol-sdk` 3.3.2を対象互換性基準として記録し、HD Walletの具体方式を仕様設計へ分離した。requirements.md:107-119,314-315、docs/decisions/open-001.md

### RR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-001
- 対象箇所: §2.3、FR-020、AC-001、AC-029
- 対応確認: 未指定・空・Core既定値を拒否し、パスワード品質ポリシーを上位Application／Packageの責任とした。requirements.md:68-79,190,281、docs/decisions/open-002.md

### RR-003

- Priority: Minor
- Status: Resolved
- 初出レビュー: requirements-review-001
- 対象箇所: FR-006、SEC-001、AC-002、AC-006
- 対応確認: Mnemonicと全Software Keyを暗号化保存対象とし、平文永続保存を禁止した。requirements.md:176,210,238-240,253-258

### RR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: requirements-review-001
- 対象箇所: §2.4、FR-019、SEC-010、SEC-015、AC-025〜AC-026、AC-032
- 対応確認: 公開情報の責任主体と、通常結果・失敗結果・診断等に含めない秘密情報の範囲を明示した。requirements.md:83,159,189,219,224,277-278,284

### RR-005

- Priority: Minor
- Status: Resolved
- 初出レビュー: requirements-review-001
- 対象箇所: §1.2、根拠追跡
- 対応確認: `DEC-REQ-001`が初期承認blob、現行統合baseline、個別決定記録およびGit履歴への追跡順序を定めている。requirements.md:13-20,367、docs/decisions/requirements-baseline-001.md

### RR-006

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-001
- 対象箇所: §2.3、UC-005、FR-007、AC-007
- 対応確認: 正しいパスワードによる処理単位の認可と、処理をまたぐUnlocked状態の禁止を明示した。requirements.md:73-75,141-143,177,259

### RR-007

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-001
- 対象箇所: §2.3、SEC-008〜SEC-014、AC-030〜AC-031
- 対応確認: パスワード復旧・リセット非提供とCoreの認可責任を明示した。requirements.md:76,211,217-223,282-283

### RR-008

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-001
- 対象箇所: SEC-015、AC-032
- 対応確認: 初回Mnemonicバックアップ例外を除き、通常・失敗・診断・補助出力で秘密情報を非開示とした。requirements.md:224,284

### RR-009

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-002
- 対象箇所: UC-003、UC-004、FR-004、FR-005、AC-004、AC-005
- 対応確認: Imported／Generated Software Key登録に正しいProfileパスワードのCore認可を要求し、失敗時にProfile状態を変更しない。requirements.md:133-139,174-175,211,256-257

### RR-011

- Priority: Minor
- Status: Resolved
- 初出レビュー: requirements-review-002
- 対象箇所: UC-009、FR-013、DR-005、AC-013
- 対応確認: Derived／Imported／Generatedの全Software Keyについて指定Chain・Profile Networkの公開情報・署名結果を扱う。requirements.md:157-159,183,242,265

### RR-012

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-002
- 対象箇所: §2.3、FR-020、SEC-016廃止、AC-029、§12.2
- 対応確認: OPEN-002によりWallet Coreがパスワード品質を独自評価せず、上位Application／Packageが品質ポリシーを担うと決定した。requirements.md:78-79,190,230,281,293,338、docs/decisions/open-002.md

### RR-014

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-002
- 対象箇所: SEC-017、AC-037
- 対応確認: 一時的に扱う秘密情報を必要な処理範囲に限定し、成功・失敗・中断後の継続利用可能状態・診断出力への残留を禁止した。requirements.md:225,288

### RR-015

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-002
- 対象箇所: FR-009、DR-008、AC-009、AC-033
- 対応確認: `symbol-sdk` 3.3.2と互換な外部検証結果を署名および鍵・アドレス・Network処理の受入基準とした。requirements.md:111-119,179,245,261,285、docs/decisions/open-001.md

### RR-016

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-002
- 対象箇所: SEC-018、AC-038、§10
- 対応確認: パスワード変更、鍵登録・削除、Profile削除について、失敗時に外部観測上の部分適用を残さないと定めた。requirements.md:226,289,297-304

### RR-017

- Priority: Major
- Status: Resolved
- 初出レビュー: requirements-review-002
- 対象箇所: SEC-019、AC-039、§10
- 対応確認: 要求対象Profile以外の秘密情報・認証状態・利用可否へ作用しないことを明示した。requirements.md:227,290,306

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と課題 | 合格 | §1に製品目的があり、コンセプト本文§1〜§3に背景・課題・目的がある。RR-018は追跡性のMinorであり、目的の判定を妨げない。 |
| 利用者と関係者 | 合格 | §2、§4、§8およびUC-001〜UC-010で利用環境、責任主体、利用場面を確認できる。RR-018はコンセプトとの明示対応を補うMinorである。 |
| 対象範囲 | 合格 | §2、§3、§4、§5、§6およびv1対象外一覧で、Symbol／NEM、Mainnet／Testnet、Desktop／Mobile／Web、Native／WASM、Mnemonic、Software Key、Bindingの対象と対象外を区別している。 |
| 要件と制約 | 合格 | §1.2、§2〜§8、§10〜§12、OPEN-001/002および承認済みベースラインで、要件、制約、責任分界、決定事項と設計引継ぎを識別できる。RR-010、RR-013、RR-019はMajorとして記録した。 |
| 受け入れ条件 | 合格 | AC-001〜AC-040が主要なProfile、鍵管理、署名、削除、Binding、秘密情報保護および失敗時整合性の条件を示している。RR-010、RR-013、RR-019は一部ライフサイクル・基準追跡の補足であり、Criticalな欠落ではない。 |
| 内部整合性 | 合格 | 互換性、認可、暗号化保存、WASM境界、状態変更整合性は要件・受入条件で整合している。Profile削除後のMnemonic再利用境界をRR-019として記録したが、品質ゲートを不合格にするCriticalな矛盾ではない。 |
| 不可欠な前提の現実性と安全性 | 合格 | OPEN-001/002、要件ベースラインおよび現行要件で主要な互換性・責任・秘密情報保護の前提を確認できる。妥当性基準の追跡不足はRR-013のMajorであり、未確認Criticalな前提ではない。 |
| コンセプト整合性と前段品質判定 | 合格 | `concept-sheet-review-004.md`は対象一致、Review Result「要件定義へ進める」、全ゲート合格である。CR-010〜CR-012は要件側へ反映または許容可能なMinorとして引き継がれており、未解決Criticalな矛盾はない。 |

## Final Decision

仕様設計へ進める。現行要件は主要な目的、範囲、責任、互換性、安全性および受け入れ条件を備え、品質ゲートはすべて合格した。RR-010、RR-013、RR-019はMajorとして要件上の明確化を要するが、仕様設計開始を止めるCriticalな不合格要因ではない。

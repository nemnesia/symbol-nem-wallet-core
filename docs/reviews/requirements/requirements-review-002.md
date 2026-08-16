# Requirements Review Findings

## Review Target

- 対象: `docs/requirements/requirements.md`
- 確認日: 2026-08-16 07:54
- 成果物: `docs/reviews/requirements/requirements-review-002.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a0079a-a9ba-7140-ab3b-e6ff6195ce79`
- Reviewer B agent_id: `01a0079a-cfab-74d3-9a71-d00306db84f2`
- Reviewer C agent_id: `01a0079a-f493-72f2-aa42-c4e068929f25`
- Phase 1: 完了。各 Reviewer を個別に `multi_agent_v1__wait_agent` で確認
- Phase 2: 完了。同一 Reviewer へ候補全集合を送信し、各 Reviewer を個別に `multi_agent_v1__wait_agent` で確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 要件本文 | `docs/requirements/requirements.md` §1〜§12 | 目的、対象範囲、責任、機能・非機能・セキュリティ要件、受け入れ条件、未決定事項および根拠追跡性を確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 要件定義書との目的、対象、提供価値、秘密情報ライフサイクル、責任境界および成功条件の整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-004.md` | 対象一致、鮮度、Review Result「要件定義へ進める」、CR-010〜CR-012および品質ゲートを確認 |

## Review Result

仕様設計へ進める

## Summary

要件定義書は、前回指摘のプロトコル基準、パスワード条件、ロック／アンロック、復旧方針、認可責任、失敗時の秘密情報非開示を要件本文へ反映している。
OPEN-001は要件レベルの未決定事項として明示され、仕様設計開始前に確定する条件として管理されている。
一方、インポート・生成時の認証条件、生成Mnemonicと保存データの回復責任、秘密情報の生成・取込み品質、状態変更の失敗時整合性などに要件レベルの未確定事項が残る。
これらはMajorまたはMinorの採用指摘であり、仕様設計開始を妨げるCriticalな品質ゲート不合格は確認されない。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| RR-001 | Major | Resolved | requirements-review-001 | 対象プロトコル版、互換性基準、基準時点および承認済み参照資料をOPEN-001として明示し、仕様設計開始前に確定すると定めた。requirements.md:133,391,410-412 |
| RR-002 | Major | Resolved | requirements-review-001 | 空・未指定・Core既定値を拒否する条件をProfile作成・変更・受入条件へ反映した。具体的な強度目標の不足は新規RR-012で扱う。requirements.md:71,144,315,343 |
| RR-003 | Minor | Resolved | requirements-review-001 | Mnemonicの暗号化保存と平文永続保存禁止をFR-006、SEC-001、AC-002へ直接対応付けた。requirements.md:249,278,316 |
| RR-004 | Minor | Resolved | requirements-review-001 | Bindingが返せる公開情報とMnemonic、秘密鍵、Profileパスワードの除外境界を明示した。requirements.md:235,335-336 |
| RR-005 | Minor | Open | requirements-review-001 | 「ユーザー確定事項」の出所と、独立した承認記録が存在しないことは明示されたが、第三者が確認できる承認済み決定記録への追跡は未解決である。requirements.md:240 |
| RR-006 | Major | Resolved | requirements-review-001 | v1のロック／アンロックを処理単位のパスワード利用として定義し、継続的Unlocked状態を禁止した。requirements.md:75-76,146,250,321 |
| RR-007 | Major | Resolved | requirements-review-001 | パスワード紛失時の復旧・リセットをv1対象外とし、破壊的操作の認可をCoreが担うと明示した。requirements.md:77-78,283,285-291,343-345 |
| RR-008 | Major | Resolved | requirements-review-001 | 成功・失敗・入力エラー・破損データ・診断／補助出力で秘密情報および復元可能表現を非開示とした。requirements.md:380,292 |
| RR-009 | Major | New | requirements-review-002 | UC-003／UC-004および対応受入条件に、Profileパスワード提示・検証、認証失敗時の状態不変条件が明示されず、インポート・生成だけ認証なしで成功可能とも解釈できる。requirements.md:172-186,247-248,318-319 |
| RR-010 | Major | New | requirements-review-002 | 新規生成Mnemonicのバックアップ・回復、保存データ消失・破損・端末変更時のv1対応範囲と責任分界が未決定である。requirements.md:155-162,244,287,292,315,349-357,407 |
| RR-011 | Minor | New | requirements-review-002 | Imported／Generated Software Keyについて、Derived Keyと同様にChain別の公開鍵・アドレス・アカウント情報取得対象となるか、およびその利用範囲が一意でない。requirements.md:39-42,201,235,262,335-336 |
| RR-012 | Major | New | requirements-review-002 | Profileパスワードは空・未指定拒否に留まり、秘密情報保護に必要な安全性目標や推測攻撃への耐性が要件化されていない。requirements.md:71,144,278-286 |
| RR-013 | Major | New | requirements-review-002 | 新規Mnemonic・Generated Software Keyの生成品質、外部Mnemonic・秘密鍵の妥当性検証、検証・保存失敗時の未登録が全経路で一貫して定義されていない。requirements.md:244-249,315-320,399 |
| RR-014 | Major | New | requirements-review-002 | 取込み時にUI／ApplicationやBindingが秘密情報を一時的に扱う場合、成功・失敗・中断後に継続利用可能な秘密情報や不要な複製が残らない責任・受入条件が不足している。requirements.md:99-105,175-178,289,341-342 |
| RR-015 | Major | New | requirements-review-002 | 署名結果が承認済みSymbol／NEMおよびNetworkの外部検証規則に適合し、有効と判定される相互運用性要件が明示されていない。requirements.md:204,252,323 |
| RR-016 | Major | New | requirements-review-002 | パスワード変更・Software Key削除・Profile削除の保存失敗、中断、部分失敗時に、状態を一貫させ部分適用を許可しない要件が未定義である。requirements.md:206-212,253-255,283-286,324-326 |
| RR-017 | Major | New | requirements-review-002 | 複数Profileを扱う場合に、一方のProfileに対する認証・署名・導出・削除要求が他Profileの秘密情報や状態へ越境しない分離要件が明示されていない。requirements.md:70-78,105,291 |

## Required Changes

### RR-009

- Priority: Major
- Status: New
- 対象箇所: UC-003、UC-004、FR-004、FR-005、AC-004、AC-005
- 問題: 既存Profileへの秘密鍵インポートとSoftware Key生成で、Profileパスワードを要求するか、要求しない例外とするかが明示されていない。SEC-002およびSEC-014の一般要件だけでは、対象操作への適用範囲が一意でない。
- 根拠: 要件本文 requirements.md:172-186,247-248,318-319
- 影響: Profile配下へ秘密情報を追加する操作の認証境界と、認証失敗時にProfile状態が変化しない条件を仕様設計で別解釈できる。
- 修正内容: UC-003／UC-004および対応する機能・受入条件で、現在のProfileパスワードの要求有無、Coreによる認可、認証失敗・取込み失敗・生成失敗時の状態不変条件を明示する。具体的なAPIや認証方式は定めない。
- 修正完了条件: 秘密鍵インポートとSoftware Key生成が、認証を要求する処理なのか意図的な例外なのかを要件本文から一意に判定できる。

### RR-010

- Priority: Major
- Status: New
- 対象箇所: UC-001、FR-001、FR-002、FR-006、SEC-010、§11〜§12
- 問題: Coreが生成Mnemonicを保存し通常処理結果として返さない一方、利用者のバックアップ・回復に生成Mnemonicを提供するか、v1対象外とするかが定まっていない。暗号化Profileデータの消失、破損、端末変更時の復元責任も同じく未定義である。
- 根拠: 要件本文 requirements.md:155-162,244,287,292,315,349-357,407、コンセプト本文 concept-sheet.md:24-31
- 影響: Mnemonic生成機能の回復可能性、Profileデータ復旧との違い、データ消失時の利用者責任を仕様設計で補完することになる。
- 修正内容: v1で生成Mnemonicのバックアップ・回復を提供するか対象外とするか、暗号化保存データのバックアップ・復元を提供するか外部責任とするかを要件として決定する。MnemonicからのProfile復元と保存データ復旧を区別する。バックアップ形式や受渡し方式は仕様設計へ残してよい。
- 修正完了条件: 生成Mnemonic、既存Mnemonic、暗号化Profileデータの各回復経路について、v1の対象範囲と責任分界を要件本文から判定できる。

### RR-012

- Priority: Major
- Status: New
- 対象箇所: §2、FR-001、FR-010、SEC-001、SEC-006、AC-001、AC-010
- 問題: 空・未指定・既定値の拒否は定義されているが、秘密情報を保護するProfileパスワードに求める最低限の安全性目標が定義されていない。
- 根拠: 要件本文 requirements.md:71,144,278-286
- 影響: 弱く推測容易なパスワードを許容するか、安全性をどの基準で受け入れるかが仕様設計時に分岐する。
- 修正内容: 具体的なKDF、文字数、文字種、試行回数を決定するのではなく、Profileパスワードに求める安全性水準、推測攻撃への耐性および不適合時の不受理を要件化する。
- 修正完了条件: Profile作成・パスワード変更について、空でないことに加えて保護要件を満たすパスワードの受入目標を要件から判定できる。

### RR-013

- Priority: Major
- Status: New
- 対象箇所: UC-001、UC-003、UC-004、FR-001、FR-004、FR-005、§12
- 問題: MnemonicおよびGenerated Software Keyの生成品質、外部Mnemonic・秘密鍵の妥当性検証、検証または保存に失敗した場合の未登録が、生成・復元・取込みの全経路で一貫していない。
- 根拠: 要件本文 requirements.md:244-249,315-320,399
- 影響: 不正・未対応・検証不能な秘密情報や不完全な生成結果がProfile配下の正常な秘密情報として残る解釈を排除できない。
- 修正内容: Core生成物が承認済みの安全性・妥当性基準を満たすこと、外部入力が妥当でない場合に登録・利用しないこと、生成・検証・保存失敗時に正常状態を変更しないことを要件化する。生成方式や入力形式は仕様設計へ残す。
- 修正完了条件: 新規生成、Mnemonic復元、秘密鍵インポートの各失敗経路で、無効または不完全な秘密情報が正常状態として保存・利用されないことを確認できる。

### RR-014

- Priority: Major
- Status: New
- 対象箇所: §2、UC-003、SEC-011、SEC-012、SEC-015、AC-004、AC-028
- 問題: Binding境界を通過する秘密情報について、不必要な複製や長期保持を前提としないことはあるが、成功・失敗・中断後の一時保持責任と受入条件が十分に明示されていない。
- 根拠: 要件本文 requirements.md:99-105,175-178,289,341-342
- 影響: 取込み失敗や処理中断の後に、UI／ApplicationやBinding側で秘密情報が継続利用可能な状態や診断出力へ残る余地を仕様設計で別解釈できる。
- 修正内容: 取込み・受渡しが処理の範囲に限定され、処理終了・成功・失敗・中断後に上流側・Binding側へ秘密情報が継続利用可能な状態または診断出力として残らないことを要件化する。具体的な消去方式、所有権、zeroize方式は仕様設計へ残す。
- 修正完了条件: 秘密情報を一時的に扱う各境界について、成功・失敗・中断後の保持禁止または責任分界と受入条件が明示される。

### RR-015

- Priority: Major
- Status: New
- 対象箇所: UC-006、FR-009、FR-013、AC-009、AC-013
- 問題: 対象Chainを指定して署名することは定義されているが、生成署名が承認済みのSymbol／NEMおよびNetworkの検証規則と互換し、外部検証で有効と判定されることが受入条件になっていない。
- 根拠: 要件本文 requirements.md:201-204,252,323
- 影響: 「署名結果が得られる」ことだけで要件を満たす解釈が残り、Symbol／NEM間およびMainnet／Testnet間の相互運用性を一意に検証できない。
- 修正内容: OPEN-001で承認された基準に基づき、対象Chain・Networkの外部検証規則に適合する署名を生成することを要件および受入条件へ追加する。署名バイト列、digest、前処理、アルゴリズムは仕様設計へ残す。
- 修正完了条件: 対象Chain・Networkの承認済み検証規則に対する署名結果の適合性を、要件から受入判定できる。

### RR-016

- Priority: Major
- Status: New
- 対象箇所: UC-007、UC-008、FR-010〜FR-012、SEC-006、SEC-008、SEC-009、AC-010〜AC-012
- 問題: パスワード変更、Software Key削除、Profile削除の成功時結果は定義されているが、保存失敗・中断・部分失敗時の状態一貫性と部分適用禁止が未定義である。
- 根拠: 要件本文 requirements.md:206-212,253-255,283-286,324-326
- 影響: 秘密情報の一部だけが新パスワードで利用可能になる、削除対象が一部だけ残るなど、破壊的・影響の大きい操作の結果を仕様設計で別解釈できる。
- 修正内容: これらの状態変更が失敗・中断した場合、外部から観測可能な認証状態、秘密情報の利用可否、削除結果を一貫させ、意図しない部分適用を許可しないことを要件化する。ストレージ方式やトランザクション機構は仕様設計へ残す。
- 修正完了条件: 成功・失敗・中断・保存失敗時に保持される状態の一貫性と、部分適用の扱いを要件から判定できる。

### RR-017

- Priority: Major
- Status: New
- 対象箇所: §2、UC-005〜UC-008、SEC-002、SEC-005、SEC-014
- 問題: Profile単位のパスワード認証は定義されているが、複数Profileが存在する場合に、一つのProfileへの要求が別Profileの秘密情報・署名・導出・削除へ影響しないことが明示されていない。
- 根拠: 要件本文 requirements.md:70-78,105,279,282,291
- 影響: Profileの認証境界、対象秘密情報、状態変更範囲の分離を仕様設計で補完することになり、越境操作を受け入れる解釈が残る。
- 修正内容: Profileごとに秘密情報、認証、操作対象および状態変更を分離し、要求対象と異なるProfileへの越境利用・変更を許可しないことを要件および受入条件へ追加する。Profile IDやAPI構造は指定しない。
- 修正完了条件: 複数Profile環境で、認証済み操作が要求対象Profileだけに作用し、他Profileへ影響しないことを要件から判定できる。

## Optional Improvements

### RR-005

- Priority: Minor
- Status: Open
- 対象箇所: §6「機能要件」〜§9「データ要件」の根拠欄
- 改善内容: 「ユーザー確定事項 §…」の根拠を、第三者が参照できる承認済み決定記録または出典の識別情報へ対応付ける。現在の記載により、独立した承認記録が存在しないこと自体は透明化されている。
- 根拠: 要件本文 requirements.md:240、コンセプト本文 concept-sheet.md §1〜§13
- 影響: 要件がどの上位判断を引き継いだかを監査でき、将来の変更時に影響範囲を追跡しやすくなる。

## Resolved Findings

- RR-001: `requirements.md:133,391,410-412`でOPEN-001、確定時期、対象版・互換性基準・参照資料の項目を明示した。
- RR-002: `requirements.md:71,144,315,343`で空・未指定・既定値のProfileパスワードを拒否する条件を明示した。
- RR-003: `requirements.md:249,278,316,320`でMnemonicを含む秘密情報の暗号化保存と平文永続保存禁止を受入条件へ対応付けた。
- RR-004: `requirements.md:235,335-336`で公開情報の範囲と秘密情報の除外境界を明示した。
- RR-006: `requirements.md:75-76,146,250,321`で処理単位のロック／アンロックと継続Unlocked禁止を明示した。
- RR-007: `requirements.md:77-78,283,285-291,343-345`で復旧・リセット対象外、Core認可、破壊的操作の認証を明示した。
- RR-008: `requirements.md:292,380`で通常結果、失敗結果、入力エラー、破損データ、診断・補助出力の秘密情報非開示を明示した。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と課題 | 合格 | §1で背景、目的および解決する課題が明示されている。 |
| 利用者と関係者 | 合格 | §2〜§3で主な利用者、関係者、利用場面および責任境界が記載されている。 |
| 対象範囲 | 合格 | §2、§5、FR-001〜FR-020および対象外一覧で、Profile、Mnemonic、Software Key、Symbol／NEM、Mainnet／Testnet、Desktop／Mobile、Bindingの対象と対象外が区別されている。 |
| 要件と制約 | 合格 | §4、§6〜§9、§11〜§12で機能、非機能、セキュリティ、データ要件、制約および仕様設計へ引き継ぐ事項を識別できる。RR-009〜RR-017は追加の要件明確化事項として記録した。 |
| 受け入れ条件 | 合格 | AC-001〜AC-031が主要なProfile、鍵管理、署名、削除、Bindingおよび責任境界の観測可能な条件を示している。RR-009、RR-013、RR-015、RR-016は不足する条件を補足するMajor指摘である。 |
| 内部整合性 | 合格 | 要件、ユースケース、受け入れ条件および責任境界に、仕様設計開始を妨げるCriticalな矛盾は確認されない。Imported／Generated Keyの認証・Chain利用・Profile分離はRR-009、RR-011、RR-017で明確化を求める。 |
| 不可欠な前提の現実性と安全性 | 合格 | OPEN-001は仕様設計開始前に確定する前提として管理され、秘密情報の暗号化保存、パスワード保護、非開示、削除時の認証も要件化されている。未解決の安全性不足はMajorとしてRR-012〜RR-016に記録した。 |
| コンセプト整合性と前段品質判定 | 合格 | 最新の `concept-sheet-review-004.md` は対象一致かつReview Resultが「要件定義へ進める」。CR-010〜CR-012と現行要件に仕様設計を妨げる未解決Criticalな矛盾はない。 |

## Final Decision

仕様設計へ進める。要件定義書は目的、対象範囲、責任境界、主要機能および受け入れ条件を備え、品質ゲートはすべて合格した。RR-009〜RR-017は要件レベルの明確化を要するが、未決定事項として管理されたOPEN-001を含め、仕様設計開始を止めるCriticalな不合格要因ではない。

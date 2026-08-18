# Requirements Review Findings

## Review Target

- 対象: `docs/requirements/requirements.md`
- 確認日: 2026-08-19 05:35
- 成果物: `docs/reviews/requirements/requirements-review-004.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a0168e-d671-7953-aece-cc4edabfc5c9`
- Reviewer B agent_id: `01a0168e-f284-7302-8e05-e36f278924ae`
- Reviewer C agent_id: `01a0168f-1264-7921-8afb-3ced2d442b01`
- Phase 1: 完了。`multi_agent_v1__wait_agent` で各agent_idを個別確認
- Phase 2: 完了。`multi_agent_v1__wait_agent` で各agent_idを個別確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 要件本文 | `docs/requirements/requirements.md` §1〜§14、特に§2.1、§3.2、UC-001、FR-001/003/019、SEC-010/017、AC-001/033/034 | 要件の目的、対象範囲、外部互換性、初回Mnemonic受渡し、受入条件および設計引継ぎを確認 |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 要件の目的、対象ユーザー、v1範囲、責任境界およびMnemonicライフサイクルとの整合性を確認 |
| コンセプトレビュー結果 | `docs/reviews/concept/concept-sheet-review-006.md` | 対象一致、Review Result「要件定義へ進める」、CR-010〜CR-012および品質ゲートを確認 |
| 過去要件レビュー | `docs/reviews/requirements/requirements-review-001.md`〜`requirements-review-003.md` | RR-001〜RR-019の正式ID、状態、同一問題の継承および対応済み根拠を確認 |
| 承認済み決定 | `docs/decisions/open-001.md`、`open-002.md`、`open-validity-001.md`、`requirements-baseline-001.md` | 互換性、パスワード責任、秘密情報妥当性および要件の承認・追跡根拠を確認 |

## Review Result

仕様設計へ進める

## Summary

現行要件定義書は、主要な目的、対象範囲、責任境界、Symbol / NEM互換性、秘密情報保護、認可、状態変更整合性および受入条件を定義している。
過去レビューで指摘されたMnemonic復元・削除後再作成、妥当性基準、承認追跡およびコンセプト対応は、現行本文または承認済み決定記録で解消された。
一方、ChainとNetworkの用語関係、既存Wallet復元互換性の保証対象、初回Mnemonic受渡しの外部契約と受渡し中の安全性特性には、要件レベルの明確化余地が残る。
これらはMajorまたはMinorの継続課題であり、仕様設計開始を妨げるCriticalな品質ゲート不合格は確認されない。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| RR-001 | Major | Resolved | requirements-review-001 | `symbol-sdk` 3.3.2とHD Walletの設計分離を確認。requirements.md:109-121,316-332、open-001 |
| RR-002 | Major | Resolved | requirements-review-001 | Profileパスワードの空値拒否と上位責任を確認。requirements.md:70-81,192,283、open-002 |
| RR-003 | Minor | Resolved | requirements-review-001 | Mnemonic / Software Keyの暗号化保存を確認。requirements.md:174,178,212,240-243,256-260 |
| RR-004 | Minor | Resolved | requirements-review-001 | 公開情報と秘密情報の返却境界を確認。requirements.md:83-90,191,221-230,279-286 |
| RR-005 | Minor | Resolved | requirements-review-001 | 現行正本と承認記録の追跡を確認。requirements.md:13-22,361-387、requirements-baseline-001 |
| RR-006 | Major | Resolved | requirements-review-001 | 処理単位の認可と継続Unlocked状態禁止を確認。requirements.md:72-78,143-145,179,261 |
| RR-007 | Major | Resolved | requirements-review-001 | パスワード復旧・リセット非提供とCore認可を確認。requirements.md:78,213-225,284-285 |
| RR-008 | Major | Resolved | requirements-review-001 | 失敗・診断を含む秘密情報非開示を確認。requirements.md:226-227,286,290 |
| RR-009 | Major | Resolved | requirements-review-002 | Imported / Generated登録の認可と失敗時状態不変を確認。requirements.md:135-141,176-177,258-259 |
| RR-010 | Major | Resolved | requirements-review-002 | 初回Mnemonic受渡し、保管・紛失防止責任、失敗時Profile非作成およびProfileデータ復旧対象外を確認。requirements.md:90,105,129,157,191,227,255,266,288,376 |
| RR-011 | Minor | Resolved | requirements-review-002 | 全Software Key由来でChain / Network公開情報・署名結果を扱うことを確認。requirements.md:159-161,185,244,267 |
| RR-012 | Major | Resolved | requirements-review-002 | Profileパスワード品質ポリシーを上位責任とする決定を確認。requirements.md:80,192,232,283,295,317,378、open-002 |
| RR-013 | Major | Resolved | requirements-review-002 | 妥当性基準の適用範囲・Core判定責任を確認。requirements.md:19,176-177,193,258-259,289,318-331,379、open-validity-001 |
| RR-014 | Major | Resolved | requirements-review-002 | 一時秘密情報の範囲と成功・失敗・中断後の非保持を確認。requirements.md:223,227,282,288,290 |
| RR-015 | Major | Resolved | requirements-review-002 | `symbol-sdk` 3.3.2との外部検証互換性を確認。requirements.md:109-121,181,247,263,287,329-332、open-001 |
| RR-016 | Major | Resolved | requirements-review-002 | 変更・登録・削除の部分適用禁止を確認。requirements.md:228,258-259,291,299-308 |
| RR-017 | Major | Resolved | requirements-review-002 | 要求対象Profile以外への越境禁止を確認。requirements.md:229,292,308 |
| RR-018 | Minor | Resolved | requirements-review-003 | コンセプトの背景・目的・対象利用者・利用場面・責任境界への追跡を確認。requirements.md:13-20,361-385 |
| RR-019 | Major | Resolved | requirements-review-003 | Profile削除後の外部Mnemonicによる同一Network再作成とSEC-005の適用範囲を確認。requirements.md:157,184,216,266,272,385 |
| RR-020 | Minor | New | requirements-review-004 | Chain / Networkの用語関係と「指定Chain」の対応範囲が一意に定義されていない。requirements.md:34-52,109-121,127-165,173-193 |
| RR-021 | Major | New | requirements-review-004 | 既存Symbol / NEM Walletとの復元互換性の対象群・世代・保証範囲・判定責任が未確定である。requirements.md:117-121,327-332、open-001:21-25 |
| RR-022 | Major | New | requirements-review-004 | 初回Mnemonic受渡しの外部完了契約、意図した受領者以外への非公開、受渡し中の保持・診断出力禁止の適用範囲が一意でない。requirements.md:129,173,191,221,226-227,255,288 |

## Required Changes

### RR-021

- Priority: Major
- Status: New
- 対象箇所: §3.2、FR-003、DR-008、AC-033、§12.1
- 問題: 既存Symbol / NEM Walletとの復元互換性を要求しているが、対象となるWallet群・世代または基準時点、互換性を保証する範囲、判定責任が要件から一意に判定できない。
- 根拠: 要件本文 requirements.md:117-121,327-332、承認済み決定 open-001.md:21-25
- 影響: HD Walletの復元互換性を仕様設計・受入判定で任意に解釈でき、外部互換性契約と保守責任が不安定になる。
- 修正内容: 復元互換性を保証する既存Walletの対象範囲、基準時点または対象世代、保証の有無・範囲および判定責任を、要件または要件レベルの未決定事項として追跡可能にする。具体的なMnemonic方式、導出方式、テスト手順は仕様設計へ残す。
- 修正完了条件: 対象Walletの範囲、互換性保証の範囲、判定責任および受入根拠を要件または承認済み資料から一意に確認できる。

### RR-022

- Priority: Major
- Status: New
- 対象箇所: UC-001、FR-001、FR-019、SEC-010、SEC-015、SEC-017、AC-001、AC-034
- 問題: 初回Mnemonic受渡しはProfile作成の成功条件と責任主体を定めているが、外部から確認可能な受渡し完了契約、意図した受領者以外への非公開、および受渡し中の不要な保持・診断出力禁止の適用範囲が一意でない。
- 根拠: 要件本文 requirements.md:129,173,191,221,226-227,255,288
- 影響: 不完全または意図しない公開を伴う受渡しでもProfile作成成功と扱う解釈が残り、Binding / Application / 利用者間の責任分界と秘密情報保護の受入判定が不安定になる。
- 修正内容: 初回Mnemonic受渡しについて、意図した受領者への受渡し、外部から確認可能な完了条件、受渡し中の不要な公開・保持・診断出力の禁止、完了判定責任、および失敗・中断時のProfile作成可否を要件として明記する。受渡し方式・API・内部状態遷移は仕様設計へ残す。
- 修正完了条件: Profile作成成功となる受渡しの成立条件、保護対象、責任主体および失敗・中断時の扱いを要件本文から一意に判定できる。

## Optional Improvements

### RR-020

- Priority: Minor
- Status: New
- 対象箇所: §2.1、§3.1〜§3.2、UC-002・UC-006・UC-009、FR-003・FR-009・FR-013
- 改善内容: `Chain`、`Network`、「指定Chain」の意味、両者の概念上の関係、対応対象および許容範囲を要件用語または適用範囲として明記する。具体的なデータ形式やAPIは定めない。
- 根拠: 要件本文 requirements.md:34-52,109-121,127-165,173-193,244-247
- 影響: Symbol / NEMとMainnet / Testnetの組合せ、互換性および受入判定の解釈差を減らせる。

## Resolved Findings

過去のRR-001〜RR-019は、現行要件本文の§13および各対応箇所によりすべてResolvedと確認した。特に、RR-010は初回Mnemonic受渡しとProfile削除後の再作成境界、RR-013は`OPEN-VALIDITY-001`、RR-019はSEC-005のCore管理下限定が根拠となる。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 目的と課題 | 合格 | §1.1の目的と§1.2のコンセプト追跡、コンセプト本文§1〜§3を確認。RR-018はResolvedであり、Criticalな欠落ではない。 |
| 利用者と関係者 | 合格 | §2.2、§2.4、§4、§6およびUC-001〜UC-010で利用環境・責任主体・利用場面を確認。 |
| 対象範囲 | 合格 | §2.1、§2.5、§3、§4〜§5でSymbol / NEM、Mainnet / Testnet、Desktop / Mobile / Web、Native / WASM、秘密情報種別、対象外を確認。RR-020はMinorである。 |
| 要件と制約 | 合格 | §1.2〜§1.3、§2〜§8、§10〜§12および承認済み決定で、要件・責任・制約・設計引継ぎを識別できる。RR-021/022はMajorとして記録したが、Criticalな欠落ではない。 |
| 受け入れ条件 | 合格 | AC-001〜AC-040で主要機能、秘密情報保護、互換性、Binding、失敗時整合性を外部観測条件として確認できる。RR-021/022は追加の要件明確化であり、Criticalな欠落ではない。 |
| 内部整合性 | 合格 | Profile、Mnemonic、Software Key、Network、認可、削除、状態変更の記述は整合している。RR-020〜RR-022は仕様設計開始を妨げるCriticalな矛盾ではない。 |
| 不可欠な前提の現実性と安全性 | 合格 | `open-001`、`open-002`、`open-validity-001`および現行要件で互換性、妥当性、責任境界、秘密情報保護の主要前提を確認できる。 |
| コンセプト整合性と前段品質判定 | 合格 | `concept-sheet-review-006.md`は対象一致、Review Result「要件定義へ進める」、全ゲート合格。CR-010のMnemonic管理境界は要件本文へ反映され、CR-011/CR-012も要件の追跡・用語・範囲で仕様設計を妨げる矛盾はない。 |

## Final Decision

仕様設計へ進める。現行要件は主要な目的、範囲、責任、互換性、安全性および受入条件を備え、全品質ゲートに合格した。RR-021とRR-022は外部互換性契約および初回Mnemonic受渡しの要件レベルの明確化、RR-020は用語追跡性の改善であり、Criticalな差し戻し要因ではない。

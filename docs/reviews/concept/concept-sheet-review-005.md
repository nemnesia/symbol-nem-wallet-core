# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-08-18 05:32
- 成果物: `docs/reviews/concept/concept-sheet-review-005.md`

## Execution Audit

- 実行モード: 3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a01167-4553-7ca0-a240-cb66e3c0fc51`
- Reviewer B agent_id: `01a01167-6b6b-7c41-b528-9b57c534dc1d`
- Reviewer C agent_id: `01a01167-959c-7133-8b41-e576a4c9aab9`
- Phase 0: 完了
- Phase 1: 完了。各 Reviewer を個別に `multi_agent_v1__wait_agent` で確認
- Phase 2: 完了。同一 Reviewer へ候補全集合を送信し、各 Reviewer を個別に `multi_agent_v1__wait_agent` で確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 背景、課題、対象ユーザー、提供価値、v1範囲、責任境界、成功条件、前提・制約および未決定事項を確認 |

## Review Result

要件定義へ進める

## Summary

コンセプトシートは、対象ユーザー、主要利用場面、提供価値、v1対象外、責任境界、成功条件および後工程への引継ぎを明示している。
Desktop / Mobile / Web、Symbol / NEM、Mainnet / Testnetを含む製品像と、外部署名者・OS固有鍵保管機能等を除外する境界は一貫している。
一方、Mnemonic自体のCore管理対象とライフサイクル、利用者課題とプロジェクト上の仮定の区別、AccountとHD Wallet・Software Keyの概念関係には継続的な曖昧さがある。
これらはMajorまたはMinorの継続指摘であり、コンセプト自体の成立または要件定義開始を妨げるCriticalな欠落は確認されない。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| CR-001 | Critical | Resolved | concept-sheet-review-001 | v1で扱う能力、対象外、成功条件を§7〜§8で確認できる。concept-sheet.md:72-101,122-133 |
| CR-002 | Major | Resolved | concept-sheet-review-001 | Core、UI / Application、OS固有鍵保管、External Signerの責任境界を§1、§7、§9〜§10で確認できる。concept-sheet.md:8-10,72-120,145-150 |
| CR-003 | Major | Resolved | concept-sheet-review-001 | Symbol / NEMウォレット開発者とDesktop / Mobile / Webの主要利用場面を§2、§4で確認できる。concept-sheet.md:12-20,34-49 |
| CR-004 | Minor | Resolved | concept-sheet-review-001 | 秘密鍵処理、鍵管理、署名処理、Signer、Software Key、Watch-onlyの範囲を§5で確認できる。concept-sheet.md:51-62 |
| CR-005 | Major | Resolved | concept-sheet-review-002 | 鍵管理に含む生成、復元、取込み、保存、ロック、アンロック、署名利用、破棄を§5、§7で確認できる。concept-sheet.md:53-58,74-86 |
| CR-006 | Major | Resolved | concept-sheet-review-002 | HD Wallet由来の鍵をSoftware Keyとして扱う関係を§3、§5、§7で確認できる。concept-sheet.md:26-29,53-58,78-84 |
| CR-007 | Minor | Resolved | concept-sheet-review-002 | Watch-onlyをSignerおよび将来のSigner実装候補と区別している。concept-sheet.md:59,62,93-101,152-161 |
| CR-008 | Minor | Resolved | concept-sheet-review-002 | 提供価値に対応する責任範囲、実装・レビュー・保守負担の抑制、成功条件を§6、§8で確認できる。concept-sheet.md:64-70,122-133 |
| CR-009 | Major | Resolved | concept-sheet-review-003 | 取込み時の一時仲介、取込み後のCore管理、秘密鍵を通常結果として返さない境界を§1、§3、§7〜§8で確認できる。concept-sheet.md:5-10,30-31,76,85-87,113-120,126-131 |
| CR-010 | Major | Open | concept-sheet-review-004 | MnemonicをCoreが継続管理・保持するのか、復元・導出時だけ扱うのか、Software Keyとのライフサイクル関係が現行本文でも一意でない。concept-sheet.md:5,10,26-31,53-58,76-89,167-183 |
| CR-011 | Minor | Open | concept-sheet-review-004 | 利用者の課題と、共通利用形態が確定していないというプロジェクト上の仮定が§2でなお混在している。concept-sheet.md:14-20 |
| CR-012 | Minor | Open | concept-sheet-review-004 | Account、HD Wallet、Software KeyおよびUI / Applicationのアカウント選択の概念関係が、用語・目的・主要利用場面でなお一意に定義されていない。concept-sheet.md:26-29,34-49,51-59,76-85,113-120,176-187 |

## Required Changes

### CR-010

- Priority: Major
- Status: Open
- 対象箇所: §1、§3、§5、§7、§12〜§13
- 問題: ニーモニックとSoftware Keyの鍵管理をCoreへ集約すると説明する一方、Mnemonic自体をCoreの継続的な管理対象として保持するのか、復元・導出時だけ扱うのかが明示されていない。取込み後の責任境界は示されているが、Mnemonicの管理対象範囲とライフサイクルが一意でない。
- 根拠: コンセプト本文 concept-sheet.md:5,10,26-31,53-58,76-89,167-183
- 影響: Coreが担う秘密情報の範囲、Mnemonicの復元・保存・破棄の責任、Software Keyとの関係を要件定義で別解釈できる。
- 修正内容: Mnemonicと導出後Software Keyを概念上区別し、MnemonicをCore管理下に保持するか、復元・導出時だけ利用するかをコンセプト本文で明示する。保存方式、暗号方式、受渡し方式は決定しない。
- 修正完了条件: MnemonicとSoftware KeyそれぞれのCore管理対象、ライフサイクル、および取込み・復元後の責任境界を本文から一意に確認できる。

## Optional Improvements

### CR-011

- Priority: Minor
- Status: Open
- 対象箇所: §2「解決したい課題」
- 改善内容: 利用者が現在抱える課題と、Desktop / Mobile / Webで共通利用する形がプロジェクト上まだ確定していないという仮定を分けて記載する。課題が未検証であることを示す場合も、課題と仮定の主体を区別する。
- 根拠: コンセプト本文 concept-sheet.md:14-20
- 影響: 解決対象となる利用者課題と、プロジェクト上の前提・未決定事項を第三者が区別しやすくなる。

### CR-012

- Priority: Minor
- Status: Open
- 対象箇所: §3「目的」、§4「対象ユーザーと主要利用場面」、§5「用語」、§7「v1のスコープと責任境界」
- 改善内容: Account、HD Wallet、Software Keyの概念上の関係と、「アカウント導出」が指す範囲を明示する。UI / Applicationが担うアカウント選択と、Coreが担う鍵管理の境界も概念レベルで対応付ける。APIやデータモデルは決定しない。
- 根拠: コンセプト本文 concept-sheet.md:26-29,34-49,51-59,76-85,113-120,176-187
- 影響: 鍵導出、アカウント利用、Software Key管理、UI / Applicationの責任範囲を同じ意味で理解しやすくなる。

## Resolved Findings

### CR-001

- Priority: Critical
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: §7「v1で扱う範囲」、§7「v1では実施しないこと」、§8「成功条件」
- 対応確認: v1の能力、対象外および成功条件が列挙され、将来候補と区別されている。concept-sheet.md:72-101,122-133,152-161

### CR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: §1、§7、§9〜§10
- 対応確認: Core、UI / Application、OS固有機能、External Signer、Web実行環境および後続工程の責任境界が明示されている。concept-sheet.md:8-10,72-120,135-150

### CR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: §2、§4
- 対応確認: 対象ユーザーをSymbol / NEMウォレット開発者とし、Desktop / Mobile / Webの主要利用場面を示している。concept-sheet.md:12-20,34-49

### CR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: §5「用語」
- 対応確認: 秘密鍵処理、鍵管理、署名処理、Signer、Software Key、Watch-onlyの概念範囲を定義している。concept-sheet.md:51-62

### CR-005

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: §5、§7
- 対応確認: 鍵管理の範囲に生成、復元、取込み、保存、ロック、アンロック、署名利用、破棄が含まれる。concept-sheet.md:53-58,74-86

### CR-006

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: §3、§5、§7
- 対応確認: HD Walletから導出された秘密鍵をCore管理下のSoftware Keyとして扱う関係を確認できる。concept-sheet.md:26-29,53-58,78-84

### CR-007

- Priority: Minor
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: §5、§7、§11
- 対応確認: Watch-onlyを署名能力を持たない別概念とし、Signer実装候補から除外している。concept-sheet.md:59,62,93-101,152-161

### CR-008

- Priority: Minor
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: §6、§8
- 対応確認: 実装・レビュー・保守負担の抑制、責任範囲の限定およびCore集約を提供価値・成功条件で対応付けている。concept-sheet.md:64-70,122-133

### CR-009

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-003
- 対象箇所: §1、§3、§7、§8
- 対応確認: 取込み時のUI / Applicationによる一時仲介、取込み後のCore管理、秘密鍵を通常結果として返さない境界を確認できる。concept-sheet.md:5-10,30-31,85-87,113-120,126-131

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| コンセプトの明確さ | 合格 | §1、§3、§5、§7、§8で製品像、用語、v1能力、対象外および成功条件を確認できる。CR-010はMnemonicのライフサイクル範囲を補うMajorである。 |
| 課題の明確さ | 合格 | §2で対象者、現在の課題、原因、既存手段の不足および放置時の影響を確認できる。CR-011は課題とプロジェクト仮定を分けるMinorである。 |
| 対象ユーザー | 合格 | §4でSymbol / NEMウォレット開発者とDesktop / Mobile / Webの主要利用場面を確認できる。 |
| 提供価値 | 合格 | §6で秘密鍵処理の分離、責任範囲の限定、鍵種別の共通化、Chain / Networkの混同回避を価値として確認できる。 |
| MVP の境界 | 合格 | §7でv1の能力、v1対象外、プロジェクト対象外および将来候補を区別し、§8でv1成功条件を示している。内部優先順位の追加確定は要件定義開始に不可欠ではない。 |
| 内部整合性 | 合格 | 目的、対象ユーザー、提供価値、v1範囲および成功条件に、コンセプト成立を妨げる重大な矛盾は確認されない。CR-010、CR-012は概念境界の明確化事項である。 |
| コンセプト成立性 | 合格 | §9〜§10でWebの制約、Coreの責任限界、後続工程へ委譲する方式を明示し、コンセプト自体を成立不能にする未解決の外部制約は確認されない。 |

## Final Decision

要件定義へ進める。コンセプトシートは対象ユーザー、提供価値、v1範囲、責任境界および成功条件を備え、全品質ゲートに合格した。CR-010は要件定義前にコンセプトの管理対象範囲を明確化すべきMajor、CR-011およびCR-012はMinorの継続指摘である。

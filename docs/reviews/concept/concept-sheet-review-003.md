# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-08-15 09:27
- 成果物: `docs/reviews/concept/concept-sheet-review-003.md`

## Execution Audit

- 実行モード: 3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a002cc-2e2d-7222-a963-46a3a9e6fa1b`
- Reviewer B agent_id: `01a002cc-2e6c-72b1-bb86-6b56c5b666c4`
- Reviewer C agent_id: `01a002cc-2ec1-7c82-ab4b-ceea756eeba8`
- Phase 1: 完了（A/B/C 個別確認済み）
- Phase 2: 完了（A/B/C 個別確認済み）
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| コンセプト本文 | 1〜13章、特に 1章「概要」、5章「用語」、7章「v1のスコープと責任境界」、9章「成功条件」 | 製品像、課題、対象ユーザー、提供価値、v1範囲、責任境界、成功条件および未決定事項を確認 |

## Review Result

要件定義へ進める

## Summary

Software Keyを管理するCoreという製品像、対象ユーザー、主要利用場面、v1の対象外および責任境界は本文から確認できる。
HD Wallet、Software Key、Watch-onlyおよび鍵管理ライフサイクルの関係も、現行本文で確認できる。
一方、直接インポート時の秘密情報の取込み・保持・返却に関する高レベルな責任境界と、提供価値の達成状態には限定的な曖昧さが残る。
これらは要件定義へ移行可能な範囲の整理であり、コンセプト自体の成立を妨げる Critical な欠落は確認されない。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| CR-001 | Critical | Resolved | concept-sheet-review-001 | 7章でv1の能力と対象外が明示され、9章の成功条件と対応している。 |
| CR-002 | Major | Resolved | concept-sheet-review-001 | 7章・8章・10章でCore、UI / Application、OS機能および外部署名者のv1責任境界が整理されている。 |
| CR-003 | Major | Resolved | concept-sheet-review-001 | 4章でDesktop / MobileのSymbol / NEMウォレット開発者と主要利用場面がv1対象として明示されている。 |
| CR-004 | Minor | Resolved | concept-sheet-review-001 | 5章で秘密鍵処理、鍵管理、署名処理、Signer、Software Keyの範囲が定義されている。 |
| CR-005 | Major | Resolved | concept-sheet-review-002 | 5章および7章で、鍵管理に含む取込み・破棄と、ニーモニック復元を含むv1能力が確認できる。 |
| CR-006 | Major | Resolved | concept-sheet-review-002 | 5章および7章で、HD Walletから導出された鍵をSoftware Keyとして扱う関係が明記されている。 |
| CR-007 | Minor | Resolved | concept-sheet-review-002 | 5章、7章および11章で、Watch-onlyをSignerおよび将来のSigner実装候補と別概念として扱っている。 |
| CR-008 | Minor | Open | concept-sheet-review-002 | 6章の提供価値と9章の成功条件に、実装・レビュー・保守負担や責任境界の改善状態の直接的な対応がまだ明示されていない。 |
| CR-009 | Major | New | concept-sheet-review-003 | 「秘密鍵をUIへ返さない」方針と、外部から秘密鍵を直接インポートする機能の取込み時責任境界が本文から一意に確認できない。 |

## Required Changes

### CR-009

- Priority: Major
- Status: New
- 対象箇所: 1章「概要」、3章「目的」、4章「主要利用場面」、7章「v1で扱う範囲」、8章「判断原則」
- 問題: 「UI / Applicationが秘密鍵そのものを保持しない」という中心方針と、「外部から秘密鍵そのものを直接インポートする」というv1機能の関係が明確でない。
- 根拠: コンセプト本文（5〜8、24〜28、41〜45、73〜82、122〜126行）
- 影響: 秘密鍵またはニーモニックの取込み時に、UI / ApplicationとCoreのどちらが取込み・保持・返却の責任を担うかを複数に解釈でき、中心価値とv1スコープの理解が分かれる。
- 修正内容: 秘密鍵およびニーモニックの取込み・保持・返却について、UI / ApplicationとCoreの高レベルな責任境界をコンセプト本文で明示する。APIや受渡し方式は後工程で決定する。
- 修正完了条件: 直接インポートおよびニーモニック復元について、秘密情報を扱う主体とCoreが担う責任を本文から一意に確認できる。

## Optional Improvements

### CR-008

- Priority: Minor
- Status: Open
- 対象箇所: 6章「提供価値」、9章「成功条件」
- 改善内容: 実装・レビュー・保守負担および責任境界のばらつきが、どの状態になれば価値提供と判断できるかを、成功条件へ概念レベルで接続する。
- 根拠: コンセプト本文（61〜65、146〜151行）
- 影響: 機能が利用可能になったことと、対象ユーザーへ提供価値が生じたことを区別しやすくなる。

## Resolved Findings

### CR-001

- Priority: Critical
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 7章「v1のスコープと責任境界」、9章「成功条件」
- 対応確認: 7章でv1の能力と対象外が列挙され、9章で対応する成功条件が示されている（71〜94、146〜151行）。

### CR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 1章「概要」、7章「v1のスコープと責任境界」、10章「前提条件と主なリスク」
- 対応確認: v1をSoftware Key管理Coreに限定し、OS固有機能、Hardware Wallet、External Signerをv1の製品責任から除外している（5〜8、71〜94、106〜112行）。

### CR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 2章「解決したい課題」、4章「対象ユーザーと主要利用場面」
- 対応確認: Desktop / MobileのSymbol / NEMウォレット開発者を対象とし、CLI等を将来候補として区別している（12〜16、30〜45行）。

### CR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 5章「用語」
- 対応確認: 秘密鍵処理、鍵管理、署名処理、Signer、Software KeyおよびWatch-onlyの定義が記載されている（49〜57行）。

### CR-005

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: 5章「用語」、7章「v1で扱う範囲」
- 対応確認: 鍵管理の定義に生成、復元、取込み、保存、ロック、アンロック、署名への利用、破棄が含まれ、v1の能力列挙にも取込みと破棄が記載されている（51、73〜80行）。

### CR-006

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: 3章「目的」、5章「用語」、7章「v1で扱う範囲」
- 対応確認: HD Walletから導出された秘密鍵をCoreの管理下でSoftware Keyとして扱う関係が、用語定義とv1能力に明記されている（24〜26、50、54、73〜76行）。

### CR-007

- Priority: Minor
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: 5章「用語」、7章「v1では実施しないこと」、11章「将来構想」
- 対応確認: Watch-onlyは署名能力を持たず、SignerおよびSigner実装候補とは別概念と明記されている（55〜57、91、174行）。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| コンセプトの明確さ | 合格 | 1章、3章、5章、7章で製品像、主要能力、用語、対象外が明示されている。CR-009は入力時の責任境界の補足であり、製品像自体を不明にしない。 |
| 課題の明確さ | 合格 | 2章に対象者、秘密鍵処理の分散、責任境界のばらつきおよび放置時の影響が記載されている。 |
| 対象ユーザー | 合格 | 4章にDesktop / MobileのSymbol / NEMウォレット開発者と主要利用場面が記載されている。 |
| 提供価値 | 合格 | 6章に秘密鍵処理の分離、責任範囲の限定、実装・レビュー・保守負担の抑制が記載されている。CR-008は達成状態の表現改善である。 |
| MVP の境界 | 合格 | 7章でv1の能力、対象外、プロジェクト非対象が区別され、11章で将来構想も分離されている。 |
| 内部整合性 | 合格 | 1章、5章、7章、8章、9章の製品責任、用語、判断原則、成功条件は同じv1境界を示している。CR-009は直接インポート時の補足である。 |
| 不可欠な前提の現実性 | 合格 | 本文から、コンセプト自体を成立不能にする明白な外部制約・前提矛盾は確認されない。未決定事項は要件定義以降へ引き継がれている。 |

## Final Decision

要件定義へ進める。v1の製品像、対象ユーザー、主要能力、対象外および責任境界は品質ゲートを満たしている。CR-009は直接インポート時の責任境界を明確化するMajor、CR-008は提供価値と成功条件を接続するMinorとして、後続のコンセプト整理または要件定義で扱える範囲にある。

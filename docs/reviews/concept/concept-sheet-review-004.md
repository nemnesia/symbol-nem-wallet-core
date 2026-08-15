# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-08-15 09:54
- 成果物: `docs/reviews/concept/concept-sheet-review-004.md`

## Execution Audit

- 実行モード: 3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a002e5-e97e-7963-a2a8-ceaa881226fe`
- Reviewer B agent_id: `01a002e5-e9ca-76c1-8c83-b35b2528c1a5`
- Reviewer C agent_id: `01a002e5-ea1e-7240-8b8a-a8766fa70228`
- Phase 1: 完了（A/B/C 個別確認済み）
- Phase 2: 完了（A/B/C 個別確認済み）
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| コンセプト本文 | 1〜13章、特に 1章「概要」、2章「解決したい課題」、3章「目的」、5章「用語」、7章「v1のスコープと責任境界」、9章「成功条件」 | 製品像、課題、対象ユーザー、用語、v1範囲、責任境界、提供価値および成功条件を確認 |

## Review Result

要件定義へ進める

## Summary

秘密情報の取込み時にUI / Applicationが一時的に仲介し、取込み後の管理責任をCoreへ集約する境界が本文に追記され、前回の責任境界指摘は解消された。
提供価値と成功条件の対応も、個別実装・レビュー・保守範囲および責任境界を示す成功条件によって補強されている。
一方、ニーモニック自体の管理対象範囲、課題とプロジェクト上の未決定事項の区別、アカウント概念の関係には限定的な曖昧さが残る。
これらは要件定義へ移行可能な範囲の整理であり、コンセプト自体の成立を妨げるCriticalな欠落は確認されない。

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
| CR-008 | Minor | Resolved | concept-sheet-review-002 | 9章に個別実装・レビュー・保守範囲の区別と、Coreへ集約する範囲の説明が追加されている。 |
| CR-009 | Major | Resolved | concept-sheet-review-003 | 1章、3章、7章および8章で、取込み時の一時仲介、取込み後のCore管理、秘密鍵を通常の処理結果として返さない境界が明示されている。 |
| CR-010 | Major | New | concept-sheet-review-004 | ニーモニックを含む秘密情報の取込み後の管理責任は示されているが、ニーモニック自体をCore管理下に保持するか、復元時だけ利用するかが一意でない。 |
| CR-011 | Minor | New | concept-sheet-review-004 | 2章の「既存手段の不足」に、利用者課題とプロジェクト上の共通利用形態の未決定が混在して読める。 |
| CR-012 | Minor | New | concept-sheet-review-004 | アカウント導出、HD Wallet、Software KeyおよびUI / Applicationによるアカウント選択の概念上の関係が未定義である。 |

## Required Changes

### CR-010

- Priority: Major
- Status: New
- 対象箇所: 1章「概要」、3章「目的」、5章「用語」、7章「v1のスコープと責任境界」
- 問題: ニーモニックとSoftware Keyの鍵管理をCoreへ集約すると説明する一方、「鍵管理」はSoftware Keyを対象として定義されている。ニーモニック自体をCoreが管理対象として保持するのか、復元時だけ利用して保持しないのかが明確でない。
- 根拠: コンセプト本文（5、10、26〜31、54、76〜86行）
- 影響: Coreが管理する秘密情報の範囲、UI / Applicationに許される保持範囲、暗号化保存・ロック・破棄の対象が複数に解釈される。
- 修正内容: ニーモニックと導出後の秘密鍵を概念上区別し、ニーモニックをCore管理下に保持するか、復元時だけ利用するかをコンセプト本文で明示する。暗号方式や保存方式は後工程で決定する。
- 修正完了条件: ニーモニックとSoftware KeyそれぞれのCore管理対象としての扱い、および取込み後のライフサイクル対象を本文から一意に確認できる。

## Optional Improvements

### CR-011

- Priority: Minor
- Status: New
- 対象箇所: 2章「解決したい課題」、6章「提供価値」
- 改善内容: 「既存手段の不足」が利用者の課題なのか、Desktop / Mobileで共通利用する形がプロジェクト上未決定であることなのかを区別して記載する。
- 根拠: コンセプト本文（15〜20、66〜68行）
- 影響: 解決すべき利用者課題と、プロジェクト内の前提・未決定事項を区別しやすくなる。

### CR-012

- Priority: Minor
- Status: New
- 対象箇所: 3章「目的」、4章「主要利用場面」、5章「用語」、7章「v1のスコープと責任境界」
- 改善内容: アカウント、HD Wallet、Software Keyの概念上の関係と、「アカウント導出」が指す範囲を明示する。APIやデータモデルは決定しない。
- 根拠: コンセプト本文（26、29、44〜46、52〜58、76〜84行）
- 影響: Coreの鍵導出と、アカウントという利用単位の生成・選択・管理の責任範囲を同じ意味で理解しやすくなる。

## Resolved Findings

### CR-001

- Priority: Critical
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 7章「v1のスコープと責任境界」、9章「成功条件」
- 対応確認: 7章でv1の能力と対象外が列挙され、9章で対応する成功条件が示されている（74〜98、150〜160行）。

### CR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 1章「概要」、7章「v1のスコープと責任境界」、10章「前提条件と主なリスク」
- 対応確認: v1をSoftware Key管理Coreに限定し、OS固有機能、Hardware Wallet、External Signerをv1の製品責任から除外している（8、88〜118行）。

### CR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 2章「解決したい課題」、4章「対象ユーザーと主要利用場面」
- 対応確認: Desktop / MobileのSymbol / NEMウォレット開発者を対象とし、CLI等を将来候補として区別している（14〜20、35〜48行）。

### CR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 5章「用語」
- 対応確認: 秘密鍵処理、鍵管理、署名処理、Signer、Software KeyおよびWatch-onlyの定義が記載されている（52〜60行）。

### CR-005

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: 5章「用語」、7章「v1で扱う範囲」
- 対応確認: 鍵管理の定義に生成、復元、取込み、保存、ロック、アンロック、署名への利用、破棄が含まれ、v1の能力列挙にも取込みと破棄が記載されている（54、76〜82行）。

### CR-006

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: 3章「目的」、5章「用語」、7章「v1で扱う範囲」
- 対応確認: HD Walletから導出された秘密鍵をCoreの管理下でSoftware Keyとして扱う関係が、用語定義とv1能力に明記されている（26〜27、53、57、76〜78行）。

### CR-007

- Priority: Minor
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: 5章「用語」、7章「v1では実施しないこと」、11章「将来構想」
- 対応確認: Watch-onlyは署名能力を持たず、SignerおよびSigner実装候補とは別概念と明記されている（58〜60、95、183行）。

### CR-008

- Priority: Minor
- Status: Resolved
- 初出レビュー: concept-sheet-review-002
- 対象箇所: 6章「提供価値」、9章「成功条件」
- 対応確認: 9章に、個別実装・レビュー・保守する範囲とCoreへ集約する範囲の区別、共通方針の利用および第三者が責任境界を説明できる状態が成功条件として記載されている（66〜68、152〜159行）。

### CR-009

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-003
- 対象箇所: 1章「概要」、3章「目的」、7章「v1のスコープと責任境界」、8章「判断原則」
- 対応確認: UI / Applicationによる入力の一時仲介、取込み後のCore管理、Core管理下の秘密鍵を通常の処理結果として返さない責任境界が明示されている（10、30〜31、83〜84、112、116、130行）。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| コンセプトの明確さ | 合格 | 1章、3章、5章、7章で製品像、主要能力、用語および対象外が明示されている。CR-010はニーモニックのライフサイクル範囲の補足であり、製品像自体を不明にしない。 |
| 課題の明確さ | 合格 | 2章に対象者、秘密鍵処理の分散、責任境界のばらつきおよび放置時の影響が記載されている。CR-011は課題と未決定事項の表現整理である。 |
| 対象ユーザー | 合格 | 4章にDesktop / MobileのSymbol / NEMウォレット開発者と主要利用場面が記載されている。 |
| 提供価値 | 合格 | 6章に秘密鍵処理の分離、責任範囲の限定、実装・レビュー・保守負担の抑制が記載され、9章に対応する高レベルな成功条件がある。 |
| MVP の境界 | 合格 | 7章でv1の能力、対象外、プロジェクト非対象が区別され、11章で将来構想も分離されている。v1内部の優先順位はコンセプト成立に必須な欠落とは確認されない。 |
| 内部整合性 | 合格 | 1章、5章、7章、8章、9章の製品責任、用語、判断原則、成功条件は同じv1境界を示している。CR-010はニーモニックの管理対象範囲を補足する指摘である。 |
| 不可欠な前提の現実性 | 合格 | 本文から、コンセプト自体を成立不能にする明白な外部制約・前提矛盾は確認されない。未決定事項は要件定義以降へ引き継がれている。 |

## Final Decision

要件定義へ進める。v1の製品像、対象ユーザー、主要能力、対象外および責任境界は品質ゲートを満たしている。CR-010〜CR-012は、ニーモニック管理範囲、課題表現、アカウント概念を明確化する後続整理であり、要件定義開始を妨げるCritical指摘ではない。

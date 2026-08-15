# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-08-15 09:01
- 成果物: `docs/reviews/concept/concept-sheet-review-002.md`

## Execution Audit

- 実行モード: 3つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a002b4-b330-7b10-b66d-7a5b6534b6b0`
- Reviewer B agent_id: `01a002b4-ca4c-7680-a4a9-5568fb7c3e01`
- Reviewer C agent_id: `01a002b4-e673-7b90-a9f6-14d8eb759864`
- Phase 1: 完了（A/B/C 個別確認済み）
- Phase 2: 完了（A/B/C 個別確認済み）
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| コンセプト本文 | 1〜13章、特に 3章「目的」、5章「用語」、7章「v1のスコープと責任境界」、9章「成功条件」 | v1の能力、対象外、責任境界、用語、提供価値および成功条件を確認 |

## Review Result

要件定義へ進める

## Summary

v1の製品像、対象ユーザー、利用場面、主要能力、対象外および責任境界が本文で明示されている。
前回確認したv1範囲、責任境界、優先対象、主要用語の問題は、現行本文で解消された。
一方、鍵管理の定義とv1列挙の差、HD WalletとSoftware Keyの概念関係、提供価値と成功条件の接続には限定的な曖昧さが残る。
これらは要件定義を開始できないほどの欠落ではなく、後続の範囲整理と用語確認で扱える。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| CR-001 | Critical | Resolved | concept-sheet-review-001 | 7章でv1の主要能力と対象外が明示され、9章の成功条件と対応している。 |
| CR-002 | Major | Resolved | concept-sheet-review-001 | 1章、7章、8章および10章でCore、UI、外部機能のv1責任境界が整理されている。 |
| CR-003 | Major | Resolved | concept-sheet-review-001 | 3章、4章、8章でDesktop/Mobileのウォレット開発者と主要利用場面がv1対象として明示されている。 |
| CR-004 | Minor | Resolved | concept-sheet-review-001 | 5章に主要用語の定義が追加され、秘密鍵処理、鍵管理、署名処理、Signer、Software Keyの範囲を確認できる。 |
| CR-005 | Major | New | concept-sheet-review-002 | 「鍵管理」の定義にある取込み・破棄と、v1の能力列挙との関係が未明示である。 |
| CR-006 | Major | New | concept-sheet-review-002 | HD Wallet由来の鍵・アカウントと独立したSoftware Keyの概念関係が未説明である。 |
| CR-007 | Minor | New | concept-sheet-review-002 | Watch-onlyがSignerの分類と将来候補の列挙に近接し、分類が曖昧に読める。 |
| CR-008 | Minor | New | concept-sheet-review-002 | 提供価値に示された実装・レビュー・保守負担の軽減が成功条件に直接対応していない。 |

## Required Changes

### CR-005

- Priority: Major
- Status: New
- 対象箇所: 5章「用語」、7章「v1で扱う範囲」、13章「要件定義への引継ぎ」
- 問題: 「鍵管理」は生成、取込み、保存、ロック、アンロック、破棄までを含むと定義されているが、v1の能力列挙には取込みと破棄が明記されていない。ニーモニック復元との関係も本文から一意に確認できない。
- 根拠: コンセプト本文（48〜50、68〜76、180〜186行）
- 影響: v1の鍵管理ライフサイクルとMVPの範囲を複数に解釈できる。
- 修正内容: 取込み・破棄をv1に含めるか対象外にするかを明記し、ニーモニックによる復元との関係をコンセプト上で整理する。
- 修正完了条件: v1の鍵管理ライフサイクルについて、取込み・破棄およびニーモニック復元の扱いを本文から確認できる。

### CR-006

- Priority: Major
- Status: New
- 対象箇所: 3章「目的」、4章「主要利用場面」、5章「用語」、7章「v1で扱う範囲」
- 問題: HD Walletの生成・復元・アカウント導出とSoftware Keyの生成が別能力として記載されているが、HD Walletから導出される鍵・アカウントとSoftware Keyの概念上の関係が説明されていない。
- 根拠: コンセプト本文（24〜27、39〜42、48〜54、68〜74行）
- 影響: 独立したSoftware Keyの生成とHD Wallet由来のアカウント導出が同一機能か別機能か判断できず、v1の責任範囲を誤解しうる。
- 修正内容: HD Wallet、導出アカウント、Software Keyの関係を概念レベルで整理し、各箇所の用語を統一する。具体的なデータ構造や実装方式は決定しない。
- 修正完了条件: 3章、4章、5章、7章で、HD Wallet由来の鍵・アカウントとSoftware Keyの関係を同じ意味で解釈できる。

## Optional Improvements

### CR-007

- Priority: Minor
- Status: New
- 対象箇所: 5章「用語」、7章「v1では実施しないこと」、11章「将来構想」
- 改善内容: Watch-onlyをSignerとは別の概念として扱うことを明記し、将来のSigner実装候補との分類を整理する。
- 根拠: コンセプト本文（51〜54、80〜88、164〜170行）
- 影響: Watch-onlyが署名能力を持つ主体の一種であるかのように読まれる可能性を減らせる。

### CR-008

- Priority: Minor
- Status: New
- 対象箇所: 6章「提供価値」、9章「成功条件」
- 改善内容: 秘密鍵処理の分散、責任境界のばらつき、実装・レビュー・保守負担がどの状態になれば価値提供と判断するかを、成功条件へ概念レベルで接続する。
- 根拠: コンセプト本文（60〜62、140〜144行）
- 影響: 機能が利用可能になったことと、対象ユーザーへ提供価値が生じたことを区別しやすくなる。

## Resolved Findings

### CR-001

- Priority: Critical
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 6章「v1のスコープと責任境界」、8章「成功条件」
- 対応確認: 7章でv1の能力と対象外が明示され、9章で対応する成功条件が記載されている（68〜88、138〜144行）。

### CR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 1章「概要」、6章「v1のスコープと責任境界」
- 対応確認: v1をSoftware Key管理Coreに限定し、OS固有機能、Hardware Wallet、External Signerをv1の製品責任から除外している（8、68〜88、100〜106行）。

### CR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 4章「対象ユーザーと主要利用場面」
- 対応確認: Desktop/MobileのSymbol/NEMウォレット開発者を対象とし、CLI等を将来候補として区別している（22、31〜44行）。

### CR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: concept-sheet-review-001
- 対象箇所: 1章、6章、7章、9章
- 対応確認: 5章に秘密鍵処理、鍵管理、署名処理、Signer、Software Keyの定義が追加されている（46〜54行）。

## Deferred Findings

なし

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| コンセプトの明確さ | 合格 | 1章、3章、5章、7章で製品像、主要能力、用語、対象外が明示されている。残るCR-005/006は限定的な関係整理であり、製品像自体を不明にしない。 |
| 課題の明確さ | 合格 | 2章、4章に対象開発者、秘密鍵処理の分散、責任境界のばらつきおよび期待状態が記載されている。 |
| 対象ユーザー | 合格 | 4章にDesktop/MobileのSymbol/NEMウォレット開発者と主要利用場面が記載され、他用途は将来候補として区別されている。 |
| 提供価値 | 合格 | 6章に秘密鍵処理の分離、責任範囲の限定、実装・レビュー・保守負担の抑制が記載されている。 |
| MVP の境界 | 合格 | 7章でv1の能力、対象外、プロジェクト非対象が区別され、11章で将来構想も分離されている。 |
| 内部整合性 | 合格 | 1章、7章、8章、9章の製品責任、判断原則、成功条件が同じv1境界を示している。 |
| 不可欠な前提の現実性 | 合格 | 本文から、コンセプト自体を成立不能にする明白な外部制約・前提矛盾は確認できない。未決定事項は要件定義以降へ引き継がれている。 |

## Final Decision

要件定義へ進める。v1の製品像、対象ユーザー、主要能力、対象外および責任境界が確定しており、品質ゲートを満たしている。CR-005〜CR-008は、要件定義へ移行可能な範囲の概念整理または後続確認事項である。

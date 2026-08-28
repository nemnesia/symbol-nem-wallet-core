# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-08-28
- 成果物: `docs/reviews/concept/concept-sheet-review-006.md`
- レビュー範囲: コンセプト本文の背景、課題、目的、対象ユーザー、提供価値、v1の境界、責任、成功条件、前提、リスク、将来候補および未決定事項
- 未確認範囲: Requirements、Design、Specification、Implementation、READMEおよび技術方式の正否。これらはコンセプト段階の finding の根拠として確認していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス
- Reviewer A（品質と論理）: 完了。用語、本文内整合性、背景から価値までの因果、v1と将来候補の分離を確認
- Reviewer B（課題と価値）: 完了。課題、対象ユーザー、利用場面、提供価値、成功条件、利用者と協力者の関係を確認
- Reviewer C（境界と成立性）: 完了。v1対象外、外部責任、前提、リスク、コンセプト自体を成立不能にする制約を確認
- Phase 0: 完了。対象、根拠、レビュー境界および出力先を確定
- Phase 1: 完了。Reviewer A/B/C を独立した観点で確認
- Phase 2: 完了。候補の重複、根拠、影響、対象工程および過去 finding の状態を再確認
- Chair 統合: 完了。現行本文へ追跡できる finding のみを採用

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 背景、課題、対象ユーザー、価値、v1範囲、責任境界、成功条件、前提、リスクおよび未決定事項を確認 |
| 作業指針 | `AGENTS.md` | レビュー範囲、Source of Truth、変更禁止範囲、Gitおよび検証方針を確認 |
| レビュー手順 | `.agents/skills/concept-review/SKILL.md`、`.agents/skills/review-common/review-playbook.md`、`.agents/skills/concept-review/reviewers.md`、`.agents/skills/concept-review/review-gates.md`、`.agents/skills/concept-review/output-format.md`、`.agents/skills/review-common/output-format.md` | Reviewer A/B/C の観点、finding の採用基準、Review Gate、成果物形式を確認 |
| 過去レビュー | `docs/reviews/concept/concept-sheet-review-001.md`〜`concept-sheet-review-005.md` | 回帰確認および過去 CR-001〜CR-012 の状態追跡に限定して使用。過去判定を現行本文の根拠とはしない |

## Review Result

`READY`

## Summary

現行コンセプトシートは、Symbol / NEMウォレット開発者を対象に、Desktop / Mobile / Webから利用するRust製のソフトウェア鍵管理Coreを提供するという製品像を説明している。課題、提供価値、v1の能力、対象外、UI / Application・Web実行環境・Network層・Transaction構築層との責任境界、成功条件および後工程への委譲も本文から確認できる。

ゼロベースで再確認した結果、MnemonicをCoreが取込み後も継続管理するのか、復元・導出時だけ扱うのかが一意でないというMajorの境界曖昧さを採用した。また、利用者課題とプロジェクト上の仮定の混在、AccountとHD Wallet・Software Key・UI / Applicationの関係の未定義をMinorの任意改善として採用した。

これらは要件定義へ引き継ぐべき明確化事項ではあるが、Coreの高レベルな製品像、対象ユーザー、v1の境界、外部責任および成立性を消失させるCritical欠陥ではない。したがって、全Review Gateを合格とし、要件定義へ進める。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| CS-001 | Major | New（CR-010を再確認） | concept-sheet-review-006（過去対応: concept-sheet-review-004） | §1、§3、§5、§7、§12〜§13にMnemonicの取込み後ライフサイクルとCore管理対象範囲を一意に定める記述がない。 |
| CS-002 | Minor | New（CR-011を再確認） | concept-sheet-review-006（過去対応: concept-sheet-review-004） | §2の「既存手段の不足」が利用者課題とプロジェクト上の共通利用形態に関する仮定を同じ項目で扱っている。 |
| CS-003 | Minor | New（CR-012を再確認） | concept-sheet-review-006（過去対応: concept-sheet-review-004） | §3〜§7および§13でAccount、HD Wallet、Software Key、UI / Applicationのアカウント選択の概念関係を一意に確認できない。 |

## Required Changes

### CS-001

- Severity: Major
- Status: New
- 対象箇所: `concept-sheet.md:5,10,26-31,53-58,76-89,115,120,167-183`
- 発生条件または確認できた事実: 本文はMnemonicを用いたHD Walletの生成・復元・導出をv1能力とし、取込み後の「秘密情報」の管理責任をCoreへ集約すると説明している。一方、「鍵管理」はSoftware Keyを対象として定義され、Mnemonic自体をCoreの継続的な管理対象として保持するのか、復元・導出時だけ扱うのかを定めていない。§12および§13でもMnemonicの管理単位とライフサイクルを未決定事項としている。
- 既存の根拠: コンセプト本文 §1「概要」、§3「目的」、§5「用語」、§7「v1のスコープと責任境界」、§12「未決定事項」、§13「次工程への引継ぎ」
- 問題: Coreが継続的に管理する秘密情報の範囲、Mnemonicの復元・保存・破棄に関する責任、およびUI / Applicationが取込み後に保持してよい範囲を複数に解釈できる。
- 影響: 製品責任と秘密情報の境界を同じコンセプトとして要件定義へ引き継げず、MnemonicとSoftware Keyのライフサイクルおよび成功条件の解釈が分かれる。
- 必要な最小修正または確認: Mnemonicと導出後のSoftware Keyを概念上区別し、MnemonicをCore管理下の継続的なライフサイクル対象とするか、復元・導出時だけ扱うかをコンセプト本文で明示する。暗号方式、保存形式、受渡し方式および消去方式は決定しない。
- 完了条件または再確認方法: 第三者が、MnemonicとSoftware KeyそれぞれのCore管理対象、取込み・復元後の責任およびライフサイクル範囲を本文から一意に確認できる。

## Optional Improvements

### CS-002

- Severity: Minor
- Status: New
- 対象箇所: `concept-sheet.md:14-20,68-70`
- 発生条件または確認できた事実: §2の「現在の課題」「既存手段の不足」は利用者が経験する課題として読める一方、Desktop / Mobile / Webで共通利用できる責任領域が「確定していない」というプロジェクト上の仮定も同じ課題整理に含む。§2末尾では課題と仮定の整理であると注記している。
- 既存の根拠: コンセプト本文 §2「解決したい課題」および§6「提供価値」
- 問題: 利用者の問題、プロジェクトが置く仮定、未検証の価値仮説の主体が一読で分離されず、何を検証すべきかが曖昧になる。
- 影響: 課題から提供価値・成功条件へ至る因果を第三者が評価しにくくなる。
- 必要な最小修正または確認: 利用者課題とプロジェクト上の仮定を別項目または明示的なラベルで区別する。コンセプト段階で脅威モデルや定量的効果を新規に決定しない。
- 完了条件または再確認方法: 利用者課題、プロジェクト仮定および未検証の価値仮説を本文から区別できる。

### CS-003

- Severity: Minor
- Status: New
- 対象箇所: `concept-sheet.md:26-29,34-49,51-59,76-87,113-120,176-187`
- 発生条件または確認できた事実: 「アカウント導出」「HD Walletから導出された秘密鍵」「Software Key」「UI / Applicationによるアカウント選択」がそれぞれ記載されているが、アカウントが導出された鍵の利用単位なのか、別の概念を含むのか、またCoreの導出責任とUI / Applicationの選択責任がどう対応するかは定義されていない。
- 既存の根拠: コンセプト本文 §3「目的」、§4「対象ユーザーと主要利用場面」、§5「用語」、§7「v1のスコープと責任境界」、§13「次工程への引継ぎ」
- 問題: HD Wallet、導出されたSoftware Key、Accountおよびウォレット側のアカウント選択の境界を複数に解釈できる。
- 影響: Coreが提供する価値とUI / Applicationへ委ねる責任の説明が、読者によって異なる。
- 必要な最小修正または確認: Account、HD Wallet、Software Keyの高レベルな関係と、Coreの導出責任・UI / Applicationの選択責任を概念レベルで対応付ける。APIやデータモデルは決定しない。
- 完了条件または再確認方法: §3〜§7および§13を通じて、導出、鍵管理、アカウント利用、アカウント選択の概念上の責任境界を一意に確認できる。

## Resolved Findings

過去レビューの CR-001〜CR-009 は、現行本文で次のとおり解決済みであることを再確認した。過去成果物は変更していない。

| 過去 ID | 初出 | 今回の確認 |
| --- | --- | --- |
| CR-001 | concept-sheet-review-001 | §7〜§8にv1の能力、対象外および対応する成功条件がある。 |
| CR-002 | concept-sheet-review-001 | §1、§7、§9〜§10にCore、UI / Application、OS固有機能、External SignerおよびWeb実行環境の責任境界がある。 |
| CR-003 | concept-sheet-review-001 | §2、§4にSymbol / NEMウォレット開発者とDesktop / Mobile / Webの主要利用場面がある。 |
| CR-004 | concept-sheet-review-001 | §5に秘密鍵処理、鍵管理、署名処理、Signer、Software KeyおよびWatch-onlyの範囲がある。 |
| CR-005 | concept-sheet-review-002 | §5、§7に生成、復元、取込み、保存、ロック、アンロック、署名利用および破棄がある。 |
| CR-006 | concept-sheet-review-002 | §3、§5、§7にHD Wallet由来の鍵をSoftware Keyとして扱う関係がある。 |
| CR-007 | concept-sheet-review-002 | §5、§7、§11にWatch-onlyをSignerおよびSigner実装候補と別概念として扱う記述がある。 |
| CR-008 | concept-sheet-review-002 | §6の実装・レビュー・保守負担の抑制と、§8のCoreへの責任集約・共通利用の状態が対応している。 |
| CR-009 | concept-sheet-review-003 | §1、§3、§7〜§8に取込み時の一時仲介、取込み後のCore管理および秘密鍵を通常結果として返さない境界がある。 |

CR-010〜CR-012は過去レビューでも未解決として記録されており、今回それぞれ CS-001〜CS-003 として現行本文から再確認した。

## Deferred Findings

なし。以下はコンセプトの欠陥としては採用せず、本文が明示的に要件定義または仕様設計へ委譲している未決定事項である。

- 対象プロトコル版、互換性基準および基準時点
- Profile、Mnemonic、Software Keyの具体的な管理単位とライフサイクルの詳細
- パスワード安全性、認可条件および受入条件
- Native / Web Binding、対象OS・Browser、ビルド・配布方式
- Web環境での受渡し、コピー、保持および消去方式
- API、データ形式、暗号方式、保存形式、メモリ消去方式および具体的な検証

## Scope and Traceability

- 対象境界: Symbol / NEMウォレット開発者向けのSoftware Key管理Coreというコンセプト。Desktop / Mobile / Webを対象に含め、WebにはWeb ApplicationとBrowser Extensionを含める。
- 製品責任: HD Wallet、秘密鍵の取込み・生成・導出、Software Keyの管理・署名利用および取込み後の秘密情報管理責任をCoreへ集約する高レベル方針。
- 外部責任: UI / Applicationはアカウント選択、公開情報表示、ユーザー操作および一時的な入力仲介を担い、Web固有状態、Network層、Transaction構築層もCore外とする。
- 上流根拠: 今回のコンセプトレビューでは、明示されたコンセプト本文とレビュー手順・作業指針を根拠とした。上位の別コンセプトは指定されていない。
- 下流追跡: §12〜§13がRequirements / Specificationへ引き継ぐ事項を示している。下流文書との相違は今回の finding の根拠にしていない。
- 境界外: API、データ形式、暗号方式、処理順序、アーキテクチャ、Binding実装、受入テストおよびコードの設計・正否はレビューしていない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | 合格 | §2、§6に秘密鍵処理の分散、責任境界のばらつき、実装・レビュー・保守負担の抑制およびChain / Networkの混同回避という価値がある。CS-002は課題と仮定の表現を分ける任意改善である。 |
| 対象ユーザー | 合格 | §4にSymbol / NEMウォレット開発者、Desktop / Mobile / Webでの利用目的・主要場面および一般利用者を直接対象としない境界がある。 |
| v1の境界 | 合格 | §7、§11にv1能力、v1対象外、プロジェクト非対象および将来候補が区別されている。 |
| 責任 | 合格 | §1、§7、§9〜§10にCore、UI / Application、Web実行環境、OS固有保管、Network層およびTransaction構築層の高レベルな責任分界がある。CS-001はMnemonicのライフサイクル粒度の明確化である。 |
| 成功条件 | 合格 | §8に同一Coreへの責任集約、鍵の共通Software Key化、取込み後の管理主体、秘密鍵非返却およびChain / Network・実行環境の区別がある。具体的な測定方法は後工程へ委譲されている。 |
| 成立性 | 合格 | §9〜§10がWebを恒久的な保護境界とみなさない前提、Coreの責任限界および後工程で検証するリスクを明示しており、コンセプト自体を成立不能にする明白な外部制約・前提矛盾は確認されない。 |

## Validation Results

- 実施: 指定された手順書の全文確認、コンセプト本文の全文確認、過去のコンセプトレビュー5件の状態確認、Reviewer A/B/Cの独立自己レビューおよびChair統合。
- 未実施: Rust formatter、clippy、cargo test、WASM check。今回の変更対象はコンセプトレビュー成果物のみで、コードおよびBindingを変更していないため対象外。
- 未確認: 外部Node、ネットワーク相互運用、暗号方式、API、データ形式、実装および下流工程の適合性。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 明確さ | 合格 | 製品像、提供対象、主要能力、対象外および将来候補を§1、§3、§5、§7、§11で一意に把握できる。CS-001はMnemonicの継続管理範囲を補うMajorであり、製品像そのものを不明にしない。 | CS-001 |
| 課題 | 合格 | §2に対象者、秘密鍵処理の分散、原因、放置時の影響および未検証の仮定であることがある。CS-002は表現上の改善である。 | CS-002 |
| 対象ユーザーと価値 | 合格 | §4、§6に対象ユーザー、利用場面、得られる価値および利用理由がある。 | なし |
| v1の境界 | 合格 | §7にv1の能力、v1対象外、プロジェクト非対象、外部へ委ねる責任があり、§11に将来候補が分離されている。 | なし |
| 責任境界 | 合格 | Coreが取込み後の秘密情報管理責任を担い、UI / Application、Web実行環境、Network層およびTransaction構築層の責任を分ける方針が§1、§7、§9〜§10で確認できる。CS-001はMnemonicの継続管理を具体化する補足である。 | CS-001 |
| 内部整合性 | 合格 | 目的、価値、v1範囲、対象外、責任および成功条件は同じCore集約方針を示している。CS-002、CS-003は補足的な概念整理であり、成立を妨げる矛盾ではない。 | CS-002, CS-003 |
| 成立性 | 合格 | Webの制約とCoreの限界を本文が前提・リスクとして明示している。コンセプト自体を成立不能にする未解決の外部制約は確認されない。 | なし |

## Remaining Risks and Open Decisions

- CS-001が未解決のままでは、MnemonicとSoftware KeyのCore管理範囲およびライフサイクルの解釈が分かれる。
- CS-002が未整理のままでは、利用者課題とプロジェクト仮定、未検証の価値仮説の追跡が弱くなる。
- CS-003が未整理のままでは、Account、HD Wallet、Software KeyおよびUI / Applicationの選択責任の概念境界が読者により異なる。
- 対象プロトコル版、互換性基準、対象OS・Browser、Binding、認可条件、保存方式および消去方式は本文の未決定事項であり、要件定義・仕様設計で決定する必要がある。
- Webを恒久的な秘密情報保護境界とみなさない前提、およびUI / ApplicationやBinding境界でのコピー・保持のリスクは、後工程で受入条件とともに確認する必要がある。

## Automatic Changes

レビュー中にコンセプト本文、Requirements、Design、Specification、Implementation、テスト、READMEまたは過去レビュー成果物は変更していない。新規成果物として本レビュー文書のみを作成した。

## Final Decision

`READY`

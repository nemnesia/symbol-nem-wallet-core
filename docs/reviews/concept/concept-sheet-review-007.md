# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-08-28
- 成果物: `docs/reviews/concept/concept-sheet-review-007.md`
- レビュー範囲: コンセプト本文の背景、課題、目的、対象ユーザー、提供価値、v1の境界、責任、成功条件、前提、リスク、将来候補および未決定事項。CS-001〜CS-003の解消、CR-001〜CR-009の回帰および新規findingを含む。
- 未確認範囲: Requirements、Design、Specification、Implementation、READMEおよび技術方式の正否。これらはコンセプト段階のfindingの根拠として確認していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス
- Reviewer A（品質と論理）: 完了。Mnemonic、HD Wallet、Software Key、Accountの用語関係、本文内整合性、背景から価値までの因果、v1と将来候補の分離を確認
- Reviewer B（課題と価値）: 完了。§2の利用者課題・プロジェクト上の仮定・未検証の価値仮説の分離、対象ユーザー、利用場面、提供価値、成功条件を確認
- Reviewer C（境界と成立性）: 完了。MnemonicのCore管理責任、UI / ApplicationのAccount選択責任、v1対象外、外部責任、前提、リスクおよび成立性を確認
- Phase 0: 完了。対象、根拠、レビュー境界および出力先を確定
- Phase 1: 完了。Reviewer A/B/Cを独立した観点で確認
- Phase 2: 完了。CS-001〜CS-003の解消、CR-001〜CR-009の回帰、候補の重複、根拠、影響および対象工程を再確認
- Chair統合: 完了。現行本文へ追跡できるfindingのみを採用し、未確認の下流詳細はfindingにしていない

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 背景、課題、対象ユーザー、価値、v1範囲、責任境界、成功条件、前提、リスク、用語および未決定事項を確認 |
| 作業指針 | `AGENTS.md` | レビュー範囲、Source of Truth、変更禁止範囲、Gitおよび検証方針を確認 |
| レビュー手順 | `.agents/skills/concept-review/SKILL.md`、`.agents/skills/review-common/review-playbook.md`、`.agents/skills/concept-review/reviewers.md`、`.agents/skills/concept-review/review-gates.md`、`.agents/skills/concept-review/output-format.md`、`.agents/skills/review-common/output-format.md` | Reviewer A/B/Cの観点、findingの採用基準、Review Gate、成果物形式を確認 |
| 過去レビュー | `docs/reviews/concept/concept-sheet-review-006.md` | CS-001〜CS-003の完了条件およびCR-001〜CR-009の回帰確認に使用。過去判定を現行本文の代わりにはしていない |

## Review Result

`READY`

## Summary

現行コンセプトシートは、Symbol / NEMウォレット開発者を対象に、Desktop / Mobile / Webから利用するRust製のソフトウェア鍵管理Coreを提供する製品像を説明している。課題、提供価値、v1の能力、対象外、UI / Application・Web実行環境・Network層・Transaction構築層との責任境界、成功条件および後工程への委譲も確認できる。

Review 006で残ったCS-001〜CS-003を確認した結果、Mnemonicは生成・復元・取込み後もCoreが継続管理するHD Walletの元秘密情報であり、導出されたSoftware Keyとは別の管理対象であることが明示された。§2では利用者の課題、プロジェクト上の仮定、未検証の価値仮説が見出しと記述で分離され、AccountはSoftware Keyをチェーン上で利用する概念、Account選択はUI / Application、秘密情報管理はCoreという関係が明示された。

ゼロベースで再確認した結果、CS-001〜CS-003の解消による既存境界の回帰、新たなコンセプト欠陥、Critical / Major / Minorの未解決findingは確認されなかった。具体的な保存・保護方式、API、データ形式、Binding、プロトコル版などは本文どおり後工程へ委譲されており、コンセプトレビューの範囲を超える指摘は採用していない。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| CS-001 | Major | Resolved | concept-sheet-review-006（CR-010を再確認） | §1、§3、§5、§7、§8、§12で、Mnemonicを生成・復元・取込み後もCoreが継続管理すること、HD Walletの元秘密情報であること、Software Keyとは別の管理対象であること、具体的な保存・保護方式は後工程で決定することが確認できる。 |
| CS-002 | Minor | Resolved | concept-sheet-review-006（CR-011を再確認） | §2が「利用者が実際に直面する課題」「プロジェクト上の仮定」「未検証の価値仮説」に分かれ、既存手段の不足と価値の効果を検証済み事実として扱っていない。 |
| CS-003 | Minor | Resolved | concept-sheet-review-006（CR-012を再確認） | §3〜§7で、Mnemonicを基礎にHD Walletで鍵を導出し、秘密鍵をSoftware KeyとしてCoreが管理し、Accountとしてチェーン上で利用する関係、Coreの導出責任およびUI / ApplicationのAccount選択責任が確認できる。 |

## Required Changes

なし。

## Optional Improvements

なし。

## Resolved Findings

### CS-001

- Severity: Major
- Status: Resolved
- 対象箇所: `concept-sheet.md:12,37-38,65,93-94,144,186,197`
- 確認できた事実: MnemonicはHD Walletの元秘密情報であり、生成・復元・取込みの後もCoreが継続的に管理すること、導出されたSoftware Keyとは別の管理対象であることが明記されている。UI / Applicationは取込み後のMnemonicを継続的に保有・管理する責任を持たない。保存・保護・消去などの詳細は後工程へ委譲されている。
- 既存の根拠: `docs/reviews/concept/concept-sheet-review-006.md` のCS-001、および現行コンセプト本文 §1、§3、§5、§7、§8、§12、§13。
- 問題と影響: Review 006で確認されたMnemonicの継続管理責任の曖昧さは、現行本文では確認できない。MnemonicとSoftware Keyの管理対象およびUI / Applicationとの責任境界を、要件定義へ一意に引き継げる。
- 必要な最小修正または確認: コンセプト本文で責任境界を明示し、具体的な保存・保護方式、API、データ形式、消去方式は決定しないこと。現行本文がこの条件を満たすことを確認した。
- 完了条件または再確認方法: 第三者が、MnemonicをCoreが生成・復元・取込み後も継続管理すること、Software Keyとは別であること、UI / Applicationが継続保有・管理責任を持たないことを本文から確認できる。

### CS-002

- Severity: Minor
- Status: Resolved
- 対象箇所: `concept-sheet.md:14-31`
- 確認できた事実: §2が「利用者が実際に直面する課題」「プロジェクト上の仮定」「未検証の価値仮説」に分かれ、既存手段の不足をプロジェクト上の仮定、Coreへの責任集約による効果を未検証の価値仮説として記述している。
- 既存の根拠: `docs/reviews/concept/concept-sheet-review-006.md` のCS-002、および現行コンセプト本文 §2。
- 問題と影響: Review 006で確認された課題と仮定の混在は解消され、利用者課題、プロジェクト仮定および未検証の価値仮説を別々に追跡できる。
- 必要な最小修正または確認: 課題、仮定および価値仮説を見出しまたは明示的なラベルで分離し、定量的効果や新しい脅威モデルを追加しないこと。現行本文がこの条件を満たすことを確認した。
- 完了条件または再確認方法: 本文から、利用者課題、プロジェクト上の仮定および未検証の価値仮説を区別できる。

### CS-003

- Severity: Minor
- Status: Resolved
- 対象箇所: `concept-sheet.md:37-43,56-58,65-75,93-103,131`
- 確認できた事実: Mnemonicを基礎にHD Walletで鍵を導出し、導出した秘密鍵をSoftware KeyとしてCoreが管理し、そのSoftware KeyをAccountとしてチェーン上で利用する概念上の順序が明記されている。Accountの選択はUI / Applicationが担うが、秘密情報の管理責任を持つことを意味しない。
- 既存の根拠: `docs/reviews/concept/concept-sheet-review-006.md` のCS-003、および現行コンセプト本文 §3、§4、§5、§7。
- 問題と影響: Review 006で確認されたAccount、HD Wallet、Software KeyおよびUI / Applicationの選択責任の曖昧さは解消され、Coreの鍵生成・復元・導出・管理とUI / ApplicationのAccount選択を区別して引き継げる。
- 必要な最小修正または確認: 概念上の関係と責任分担だけを本文で明示し、API、型、field、ID、schema、状態遷移を追加しないこと。現行本文がこの条件を満たすことを確認した。
- 完了条件または再確認方法: 第三者が、Mnemonic → HD Wallet → Software Key → Accountとして利用、Coreの鍵管理責任、UI / ApplicationのAccount選択責任を本文から確認できる。

### Review 006 findings

| ID | 今回の確認 |
| --- | --- |
| CS-001 | MnemonicのCoreによる継続管理、Software Keyとの区別、UI / Applicationが取込み後に継続保有・管理する責任を持たないこと、および具体方式の後工程委譲を確認した。 |
| CS-002 | §2の見出しと記述により、利用者課題、プロジェクト上の仮定、未検証の価値仮説を区別できることを確認した。 |
| CS-003 | §5の用語定義と概念上の関係、§4・§7の利用場面・責任境界により、HD Wallet、Software Key、AccountおよびUI / Applicationの関係を確認した。 |

### CR-001〜CR-009 の回帰確認

| 過去ID | 今回の確認 |
| --- | --- |
| CR-001 | §7〜§8のv1能力、対象外および対応する成功条件は維持されている。 |
| CR-002 | §1、§7、§9〜§10のCore、UI / Application、OS固有機能、External SignerおよびWeb実行環境の責任境界は維持されている。 |
| CR-003 | §2、§4のSymbol / NEMウォレット開発者とDesktop / Mobile / Webの主要利用場面は維持されている。 |
| CR-004 | §5の秘密鍵処理、鍵管理、署名処理、Signer、Software KeyおよびWatch-onlyの範囲は維持されている。 |
| CR-005 | §5、§7の生成、復元、取込み、保存、ロック、アンロック、署名利用および破棄の記述は維持されている。 |
| CR-006 | §3、§5、§7のHD Wallet由来の鍵をSoftware Keyとして扱う関係は維持され、さらにMnemonicとの区別が明確化された。 |
| CR-007 | §5、§7、§11のWatch-onlyをSignerおよびSigner実装候補と別概念として扱う記述は維持されている。 |
| CR-008 | §6の実装・レビュー・保守負担の抑制と§8のCoreへの責任集約・共通利用の対応は維持されている。 |
| CR-009 | §1、§3、§7〜§8の取込み時の一時仲介、取込み後のCore管理および秘密鍵を通常結果として返さない境界は維持されている。 |

## Deferred Findings

なし。以下はコンセプトの欠陥としては採用せず、本文が要件定義または仕様設計へ委譲している未決定事項である。

- 対象プロトコル版、互換性基準および基準時点
- Profile、Mnemonic、Software Keyの具体的な管理単位と詳細なライフサイクル
- パスワード安全性、認可条件および受入条件
- Native / Web Binding、対象OS・Browser、ビルド・配布方式
- Web環境での受渡し、コピー、保持および消去方式
- API、データ形式、暗号方式、保存形式、メモリ上の保持方法および消去方式

## Scope and Traceability

- 対象境界: Symbol / NEMウォレット開発者向けのSoftware Key管理Coreというコンセプト。Desktop / Mobile / Webを対象に含め、WebにはWeb ApplicationとBrowser Extensionを含める。
- 製品責任: MnemonicをCore管理下の秘密情報として継続的に扱い、HD Walletからの導出、秘密鍵の取込み・生成、Software Keyの管理・署名利用および取込み後の秘密情報管理責任をCoreへ集約する高レベル方針。
- 概念関係: Mnemonicを基礎にHD Walletで鍵を導出し、導出した秘密鍵をSoftware KeyとしてCoreが管理し、そのSoftware KeyをAccountとしてチェーン上で利用する。Accountの選択はUI / Applicationが担う。
- 外部責任: UI / ApplicationはAccount選択、公開情報表示、ユーザー操作および一時的な入力仲介を担うが、MnemonicやSoftware Keyの継続的な秘密情報管理主体ではない。Web固有状態、Network層、Transaction構築層もCore外とする。
- 上流根拠: 今回のレビューでは、明示されたコンセプト本文、作業指針およびレビュー手順を根拠とした。下流文書との相違はfindingの根拠にしていない。
- 下流追跡: §12〜§13がRequirements / Specificationへ引き継ぐ事項を示している。保存・保護方式、API、データ形式、Bindingおよび具体的なライフサイクルは後工程に残されている。
- 境界外: API、データ形式、暗号方式、処理順序、アーキテクチャ、Binding実装、受入テストおよびコードの設計・正否はレビューしていない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | 合格 | §2で利用者課題、プロジェクト上の仮定、未検証の価値仮説が分離され、§6・§8に対応する価値と成功条件がある。 |
| 対象ユーザー | 合格 | §4にSymbol / NEMウォレット開発者、Desktop / Mobile / Webでの利用目的・主要場面および一般利用者を直接対象としない境界がある。 |
| v1の境界 | 合格 | §7、§11にv1能力、v1対象外、プロジェクト非対象および将来候補が区別されている。 |
| 責任 | 合格 | §1、§3、§5、§7〜§10に、MnemonicとSoftware KeyのCore管理責任、Account選択を含むUI / Applicationの責任、Web実行環境、OS固有保管、Network層およびTransaction構築層の高レベルな分界がある。 |
| 成功条件 | 合格 | §8に同一Coreへの責任集約、鍵の共通Software Key化、MnemonicおよびSoftware Keyの取込み後管理主体、秘密鍵非返却、Chain / Networkおよび実行環境の区別がある。 |
| 成立性 | 合格 | §9〜§10がWebを恒久的な保護境界とみなさない前提、Coreの責任限界および後工程で検証するリスクを明示しており、コンセプト自体を成立不能にする明白な外部制約・前提矛盾は確認されない。 |

## Validation Results

- 実施: 指定されたAGENTS.md、concept-review Skill一式、更新後コンセプト本文およびReview 006の全文確認。
- 実施: Reviewer A/B/Cの独立自己レビュー、Chairによる候補の反証・統合、CS-001〜CS-003の完了条件確認およびCR-001〜CR-009の回帰確認。
- 実施: Phase 1でコンセプト本文のみを変更し、`git diff --check`を実行して成功。レビュー中はコンセプト本文を変更していない。
- 未実施: Rust formatter、clippy、cargo test、WASM check。今回の対象はコンセプト本文とレビュー成果物であり、コードおよびBindingを変更していないため対象外。
- 未確認: 外部Node、ネットワーク相互運用、暗号方式、API、データ形式、実装および下流工程の適合性。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 明確さ | 合格 | §1、§3、§5、§7に製品像、Mnemonic・HD Wallet・Software Key・Accountの関係、主要能力、対象外および将来候補がある。 | CS-001, CS-003（解消確認） |
| 課題 | 合格 | §2で利用者が直面する課題、プロジェクト上の仮定、未検証の価値仮説が明示的に分離されている。 | CS-002（解消確認） |
| 対象ユーザーと価値 | 合格 | §4、§6、§8に対象ユーザー、利用場面、得られる価値および成功条件がある。 | なし |
| v1の境界 | 合格 | §7にv1の能力、v1対象外、プロジェクト非対象、外部へ委ねる責任があり、§11に将来候補が分離されている。 | なし |
| 責任境界 | 合格 | MnemonicとSoftware KeyはCore管理下にあり、UI / ApplicationはAccountを選択するが秘密情報管理主体ではないことが§1、§3、§5、§7〜§8で確認できる。 | CS-001, CS-003（解消確認） |
| 内部整合性 | 合格 | 目的、課題、価値、v1範囲、対象外、責任および成功条件は同じCore集約方針を示し、CS-001〜CS-003の修正による矛盾は確認されない。 | CR-001〜CR-009（回帰なし） |
| 成立性 | 合格 | §9〜§10がWebの制約とCoreの限界を前提・リスクとして明示している。コンセプト自体を成立不能にする未解決の外部制約は確認されない。 | なし |

## Remaining Risks and Open Decisions

- 対象プロトコル版、互換性基準、対象OS・Browser、Binding、認可条件、保存・保護方式、消去方式および詳細なライフサイクルは、本文が明示する未決定事項であり、要件定義・仕様設計で決定する必要がある。
- Webを恒久的な秘密情報保護境界とみなさない前提、およびUI / ApplicationやBinding境界でのコピー・保持のリスクは、後工程で受入条件とともに確認する必要がある。
- 上記はコンセプトの残存findingではなく、本文から明示的に引き継がれている未決定事項およびリスクである。

## Automatic Changes

レビュー中にコンセプト本文、Requirements、Design、Specification、Implementation、テスト、READMEまたは過去レビュー成果物は変更していない。新規成果物として本レビュー文書のみを作成した。

## Final Decision

`READY`

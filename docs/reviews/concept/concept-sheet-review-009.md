# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-08-30
- 成果物: `docs/reviews/concept/concept-sheet-review-009.md`
- Review Scope: Concept本文の目的、課題、対象ユーザー、利用場面、提供価値、v1境界、Mnemonic / HD Wallet / Software Key / Accountの関係、責任分界、Security Invariant、Trust Boundary、成功条件、前提、リスク、用語、未決定事項および次工程への委譲。特にCS-004 / CS-005の解消確認を、過去判定に依存せず再評価した。
- Intended Audience / 可読性評価の前提: プロダクト担当、企画担当、デザイナー、セキュリティ担当、プロジェクト管理者、意思決定者、将来のコントリビューター、Symbol / NEMや暗号技術に詳しくない関係者を含む。Concept本文単独で、製品目的、利用者、CoreとUI / Applicationの役割、Core管理下の情報、Core外の責任および次工程の範囲を概念的に理解できるかを確認した。
- 未確認範囲: API、型、schema、wire format、KDF / Cipher、cryptographic parameter、処理順序、state machine、class / module構成、Binding実装、保存形式、詳細UX、テスト実装、コード、外部Nodeとの相互運用および下流成果物の正否。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。
- Reviewer A（品質と論理）: 完了。製品目的、課題から価値までの因果、用語の説明と関係、本文内整合性、v1と将来候補の分離、修正による過去事項の回帰を確認した。
- Reviewer B（課題と価値）: 完了。対象ユーザー、利用場面、提供価値、成功条件、プロジェクト上の仮定と未検証の価値仮説の分離、および非エンジニアが目的・価値を理解できる構成を確認した。
- Reviewer C（境界と成立性）: 完了。Mnemonic / Software Keyの継続管理、通常処理と明示的な秘密情報アクセス、Core / UI / Application / Browser / OSの責任境界、v1対象外、前提、リスクおよび成立性を確認した。
- Phase 0: 完了。対象、根拠、出力先およびConceptフェーズの境界を確定した。
- Phase 1: 完了。Reviewer A/B/Cを独立した観点で確認した。
- Phase 2: 完了。CS-004 / CS-005の完了条件、過去findingの回帰、新規候補の重複、根拠、重大度および後工程への委譲可否を再確認した。
- Chair統合: 完了。現行本文へ追跡でき、Conceptの成立・解釈・境界に直接影響する問題だけを正式finding候補として評価した。新規findingは採用していない。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 修正後Concept本文 | `docs/consept/concept-sheet.md` §1〜§13 | 製品目的、課題、対象ユーザー、価値、v1範囲、用語、Security Invariant、責任境界、成功条件、前提、リスクおよび委譲事項を主根拠として確認 |
| 前回レビュー | `docs/reviews/concept/concept-sheet-review-008.md` | CS-004 / CS-005の発生条件、完了条件、対象箇所および前回の未解決状態を確認。前回判定を現行本文の代わりにはしていない |
| 過去レビュー | `docs/reviews/concept/concept-sheet-review-001.md`〜`concept-sheet-review-007.md` | CR-001〜CR-009、CS-001〜CS-003の状態および回帰対象を確認 |
| 作業指針 | `AGENTS.md` | Source of Truth、Conceptフェーズ境界、変更範囲、秘密情報および検証方針を確認 |
| Reviewer Skill | `.agents/skills/concept-review/SKILL.md`、`reviewers.md`、`review-gates.md`、`output-format.md` | Reviewer A/B/C、finding採用基準、Review Gate、重大度および成果物構成を確認 |
| 共通 reviewer policy | `.agents/skills/review-common/review-playbook.md`、`output-format.md` | Phase 0〜3、Upstream Feedback / Deferred Findings、検証およびGit運用を確認 |
| Phase Context | なし | `AGENTS.md`にConceptのContext登録がないため、Contextは使用していない |

## Review Result

`READY`

## Summary

修正後Concept Sheetは、Symbol / NEMウォレットで使う秘密情報を管理し署名に利用する共通Coreを作るプロジェクトであること、UI / Applicationとの役割分担、対象ユーザー、価値、v1の範囲およびCore外の責任を、Concept本文単独で概念的に理解できる構成になっている。§1に平易な製品説明があり、§5にSymbol / NEM、Chain / Network、Core、UI / Application、秘密鍵、Mnemonic、HD Wallet、Software Key、Accountの意味と関係がある。

CS-005については、§7のSecurity InvariantがMnemonicとSoftware Keyの双方を対象に、継続管理主体、一時的入力仲介、通常処理での非返却・非共有、実行環境に依存しない原則およびホスト侵害に対する保証限界を明記している。ユーザーが明示的に求める回復・表示・exportは通常処理と区別し、可否・認可・UX・受渡し方式をRequirements / Designへ委譲している。

CS-004 / CS-005の解消により不合格ゲートはなく、独立した再確認で新たなCritical / Major / Minor findingは確認されなかった。過去のCR-001〜CR-009およびCS-001〜CS-003にも回帰はない。したがって、現在のConceptは `CONCEPT READY` と判定し、Requirements再レビューへ進められる。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| CS-004 | Critical | Resolved | concept-sheet-review-008 | §1に非専門家向けの製品説明が追加され、§5に中心用語の平易な定義と関係が示され、Core / UI / Applicationの役割が本文から追跡できる。 |
| CS-005 | Critical | Resolved | concept-sheet-review-008 | §7にMnemonicとSoftware Keyを対象とするSecurity Invariant、通常処理と明示的アクセスの区別、ホスト環境に対する保証限界が追加され、§8・§10・§12・§13にも対応がある。 |

## Required Changes

なし。CriticalのNew / Open / Reopenedは確認されなかった。

## Optional Improvements

なし。Major / MinorのNew / Open / Reopenedも確認されなかった。

## Resolved Findings

### CS-004

- Severity: Critical
- Status: Resolved
- 対象箇所: `docs/consept/concept-sheet.md:5-9,50-86,98-127,152-170`
- 発生時の事実: 前回は専門用語を前提とする一文と、§4の専門知識前提により、非エンジニアが製品目的・価値・責任範囲を本文だけで理解しにくかった。
- 今回確認した事実: §1が「秘密情報を管理し署名に使う共通Core」「CoreとUI / Applicationの役割」「対象環境」「分離による目的」を短い文で説明している。§5はSymbol / NEMを取引とAccountを扱う仕組み、Chain / Networkをブロックチェーンと本番・検証環境の区分、CoreとUI / Applicationをそれぞれの役割として定義している。秘密鍵、Mnemonic、HD Wallet、Software Key、Accountも相互関係を含めて定義され、§5末尾で「Mnemonic → HD Wallet → Software Key → Account利用」と説明している。
- 既存の根拠: 前回レビューCS-004の完了条件、および現行Concept本文§1、§4、§5、§7、§8。
- 解消確認: プロダクト担当、企画担当、デザイナー、プロジェクト管理者、意思決定者は、外部資料なしに何を作るか、なぜ必要か、誰が使うか、CoreとUI / Applicationの役割、Core管理下の秘密情報、Core外の責任を概念的に読み取れる。セキュリティ担当と将来のコントリビューターも、用語の関係と後工程への委譲を追跡できる。
- Conceptフェーズとしての判定: 用語と製品責任を理解するための説明に留まり、暗号方式、API、詳細UX、実装構造を追加していない。可読性上の単なる好みを超える問題は残っていない。
- 完了条件または再確認方法: Concept本文単独で、想定読者が製品目的・価値・利用者・Core / UI / Applicationの役割・管理対象・責任外を説明できることを確認した。

### CS-005

- Severity: Critical
- Status: Resolved
- 対象箇所: `docs/consept/concept-sheet.md:15-17,42-48,75-86,104-128,154-170,179-189,204-227`
- 発生時の事実: 前回はMnemonicとSoftware Keyの双方をCoreが管理することは示されていたが、通常処理での非開示・非返却原則が全Core管理下秘密情報に一貫して適用されるか、明示的アクセスとどう区別するかが不明確だった。
- 今回確認した事実: §7のSecurity Invariantが、(1) MnemonicおよびSoftware Keyの秘密情報をCoreが継続管理すること、(2) UI / Applicationの一時的仲介は管理責任の移転ではないこと、(3)通常の処理結果としてCore外へ返却・共有しないこと、(4) Desktop / Mobile / Webで原則を変えないこと、(5) UI / Application、Browser、OS等のホスト侵害をCoreが防止する保証ではないことを列挙している。§7・§8・§10・§12・§13で同じ境界が繰り返し対応付けられている。
- 今回確認した明示的アクセスの区別: §7および§12〜§13が、ユーザーが明示的に求めるMnemonic / Software Keyの回復、表示、exportを通常処理と異なる意図的な秘密情報アクセスとして扱い、その可否、認可条件、UX、受渡し方式を後工程で決定するとしている。Concept本文は具体的な可否、API、UX、認可方式を確定していない。
- 既存の根拠: 前回レビューCS-005の完了条件、および現行Concept本文§7、§8、§9、§10、§12、§13。
- 解消確認: MnemonicとSoftware Keyについて、Coreが継続管理主体であり、初期入力の一時仲介が責任移転でなく、通常処理でCore外へ返却・共有しないことが一意に確認できる。ホスト環境の侵害に対するCoreの保証限界も、Security Invariantと区別されている。
- Conceptフェーズとしての判定: 高レベルのSecurity InvariantとTrust Boundaryのみを定め、保存方式、メモリ保持、暗号、API、詳細な回復・表示・export UXはRequirements / Designへ適切に委譲している。
- 完了条件または再確認方法: 指定された5項目、通常処理と明示的アクセスの区別、具体方式の後工程委譲を本文から確認した。

### CR-001〜CR-009 / CS-001〜CS-003

| 過去ID | 今回の確認 |
| --- | --- |
| CR-001 | §7のv1能力・対象外・プロジェクト非対象および§8の成功条件が区別されている。回帰なし。 |
| CR-002 | Core、UI / Application、Web実行環境、OS固有保管、External Signer、Network層およびTransaction構築層の高レベルな責任分界が§1、§7、§9〜§10に維持されている。回帰なし。 |
| CR-003 | §2、§4にSymbol / NEMウォレット開発者とDesktop / Mobile / Webの主要利用場面が維持されている。回帰なし。 |
| CR-004 | §5に秘密鍵処理、鍵管理、署名処理、Signer、Software KeyおよびWatch-onlyの概念が定義されている。回帰なし。 |
| CR-005 | §5、§7に生成、復元、取込み、保存、ロック、アンロック、署名利用および破棄が鍵管理の範囲として維持されている。回帰なし。 |
| CR-006 | §3、§5、§7にHD Wallet由来の鍵をSoftware Keyとして扱う関係が維持されている。回帰なし。 |
| CR-007 | §5、§7、§11にWatch-onlyをSignerおよび将来のSigner実装候補と区別する方針が維持されている。回帰なし。 |
| CR-008 | §6、§8に実装・レビュー・保守負担の抑制とCoreへの責任集約・共通利用の関係が維持されている。回帰なし。 |
| CR-009 | §1、§3、§7〜§8に取込み時の一時仲介、取込み後のCore管理およびCore管理下秘密情報を通常処理結果としてCore外へ返却・共有しない境界が維持されている。回帰なし。 |
| CS-001 | §1、§3、§5、§7、§8、§12〜§13にMnemonicの生成・復元・取込み後のCore継続管理とSoftware Keyとの区別が維持されている。回帰なし。 |
| CS-002 | §2で利用者課題、プロジェクト上の仮定、未検証の価値仮説が見出しで分離されている。回帰なし。 |
| CS-003 | §3〜§7にMnemonic、HD Wallet、Software Key、AccountおよびUI / ApplicationのAccount選択責任の関係が維持されている。回帰なし。 |

## Upstream Feedback

なし。Conceptより上流の正式資料やdecisionの不足を、今回の正式findingの根拠にはしていない。

## Deferred Findings

正式findingはなし。Conceptフェーズの責務を越える次の事項は、本文の未決定事項および次工程への引継ぎとして扱われており、現行Conceptの欠陥ではない。

- 対象プロトコル版、互換性基準、基準時点、対象OS・Browserおよび配布方式。
- Profile、Mnemonic、Software Keyの具体的な管理単位、状態、保存・保護・消去および詳細ライフサイクル。
- 認可条件、パスワード安全性、入力検証、エラー、認証失敗・破損時の動作。
- API、型、schema、データ形式、Binding、暗号方式、保存形式、メモリ保持・消去方式。
- 意図的なMnemonic / Software Keyの回復、表示、exportをv1で許可するか、その詳細なUX・受渡し方式。
- 実装可能性、外部Node、相互運用fixtureおよび具体的な受入テスト。

## Scope and Traceability

- 対象境界: `docs/consept/concept-sheet.md`のConcept本文。Symbol / NEMウォレット開発者向けのSoftware Key管理Coreを、Desktop / Mobile / Webから利用する構想を対象とした。
- 上流根拠: Conceptより上流の正式資料は参照していない。AGENTS.mdとReviewer Skillは作業規則として使用し、製品仕様の根拠にはしていない。
- 同一フェーズ根拠: 修正後Concept本文を主根拠とし、Review 008はCS-004 / CS-005の完了条件確認に、過去レビューは状態・回帰追跡に限定して使用した。
- 製品責任: MnemonicとSoftware Keyの継続管理、署名利用および通常処理での非返却・非共有はCore。Account選択、公開情報表示、ユーザー操作および取込み時の一時的入力仲介はUI / Application。Web固有状態・Browser / OSのセキュリティ、Network、Transaction構築はCore外である。
- Security / Trust Boundary: §7のSecurity InvariantがCore管理下秘密情報、通常処理、明示的アクセス、ホスト侵害の保証限界および実行環境差異の扱いを定義している。
- Concept → Requirements / Designへの委譲評価: 高レベルの管理主体・非開示原則・責任境界はConceptにあり、API、暗号、保存、認可、詳細ライフサイクル、Binding、詳細UXおよび受入条件は後工程へ適切に委譲されている。
- Conceptフェーズ逸脱: なし。今回、ConceptにAPI、schema、暗号パラメータ、state machine、実装方式、保存形式または詳細UXを要求していない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | 合格 | §2で利用者課題、プロジェクト上の仮定、未検証の価値仮説が分離され、§6・§8に提供価値と成功条件がある。§1の平易な説明により非専門家も因果を追いやすい。 |
| 対象ユーザー | 合格 | §4に製品利用者であるSymbol / NEMウォレット開発者、利用目的、主要利用場面および一般利用者がCoreを直接操作しない境界がある。 |
| v1の境界 | 合格 | §7にv1能力、対象外、プロジェクト非対象、外部責任があり、§11に将来候補が分離されている。 |
| 責任 | 合格 | §1、§5、§7、§9〜§10にCore、UI / Application、Browser / OS、Network層およびTransaction構築層の責任分界がある。CS-005の解消により秘密情報全体の非開示境界も確認できる。 |
| 成功条件 | 合格 | §8にCoreへの管理責任集約、MnemonicおよびSoftware Keyの継続管理主体、通常処理での非返却・非共有、Chain / Network区別および環境差異によらない原則がある。 |
| Security / Trust Boundary / responsibility | 合格 | §7が指定された5項目をSecurity Invariantとして一貫して示し、§10がホスト侵害に対する保証限界を区別している。明示的な回復・表示・exportは後工程へ委譲されている。 |
| 非エンジニアを含む可読性 | 合格 | §1の製品説明、§5の平易な用語定義、§7の責任分界により、Concept本文単独で目的・価値・管理対象・責任外を概念的に把握できる。 |
| 専門用語 | 合格 | Symbol / NEM、Chain / Network、Core、UI / Application、秘密鍵、Mnemonic、HD Wallet、Software Key、AccountがConcept上の意味と関係を伴って説明されている。 |
| 成立性 | 合格 | §9〜§10がWeb・UI / Application・Browser・OSの限界、Coreの保証範囲および後工程で検証するリスクを明示しており、成立不能にする明白な前提矛盾は確認されない。 |

## Validation Results

- 実施: `AGENTS.md`、Concept Reviewer Skill一式、共通 reviewer policy、修正後Concept本文、Review 008および過去レビューの確認。
- 実施: Reviewer A/B/Cの独立自己レビュー、Chairによる候補の反証・統合、CS-004 / CS-005の完了条件確認およびCR-001〜CR-009・CS-001〜CS-003の回帰確認。
- 未実施: Rust formatter、clippy、cargo test、WASM check。今回の変更対象はレビュー成果物のみで、コード・Binding・仕様を変更していないため対象外。
- 実施: Markdown見出し構造、finding ID重複、参照パス、Concept本文の行番号範囲、`git diff --check`および変更範囲。Markdown lint実行ファイルは未導入だったため、見出し順・末尾空白・参照パスをシェル検査した。
- 未確認: 外部Node、ネットワーク相互運用、暗号方式、API、データ形式、実装および下流工程の適合性。

## Review Gates

| Gate | 結果 | 根拠 | 対応ID |
| --- | --- | --- | --- |
| 明確さ | 合格 | §1、§5、§7に製品目的、主要用語、Core / UI / Applicationの役割、管理対象および責任外があり、CS-004の完了条件を満たす。 | CS-004（解消確認） |
| 課題 | 合格 | §2に対象者、現在の課題、原因、放置時の影響、プロジェクト上の仮定および未検証の価値仮説がある。 | なし |
| 対象ユーザーと価値 | 合格 | §1、§4、§6、§8に誰が利用し、何を解決し、どの価値を得るかがある。中心用語の説明により非専門家にも追跡可能である。 | CS-004（解消確認） |
| v1の境界 | 合格 | §7にv1能力、対象外、プロジェクト非対象および外部責任、§11に将来候補がある。 | なし |
| 責任境界 | 合格 | §7のSecurity InvariantがMnemonicとSoftware Keyの継続管理、一時仲介、通常処理での非返却・非共有、環境差異によらない原則およびホスト侵害の保証限界を明示する。 | CS-005（解消確認） |
| 内部整合性 | 合格 | 目的、課題、価値、v1範囲、用語、責任、成功条件およびSecurity Invariantが同じCore集約方針を示し、修正による矛盾はない。 | なし |
| 成立性 | 合格 | Web環境を恒久的な保護境界としない前提、Coreの限界および後工程で検証するリスクが示されている。成立不能にする明白な外部制約は確認されない。 | なし |

## Remaining Risks and Open Decisions

- CS-004 / CS-005は解消確認済みであり、Conceptレビューとして残るCritical / Major / Minor findingはない。
- 対象プロトコル版、互換性基準、対象OS・Browser、Binding、認可、保存方式、詳細ライフサイクルおよび意図的な回復・表示・exportの可否は未決定であり、本文が定めた高レベル境界を前提に後工程で決定する必要がある。
- Web・UI / Application・Browser・OSなどのホスト環境侵害をCoreが防止する保証ではないという限界は、Requirements / Designでも維持する必要がある。
- Symbol / NEMおよびMainnet / Testnetの具体的な互換性基準は、本文が指定する区別を前提に後工程で確定する必要がある。

## Automatic Changes

レビュー中にConcept、Requirements、Design、Specification、Implementation、テスト、README、Skill本体または過去レビュー成果物は変更していない。新規成果物として本レビュー文書のみを追加した。

## Final Decision

`READY`

CS-004とCS-005は解消された。修正後Concept Sheetは、非エンジニアを含む読者にも製品目的・価値・用語・責任境界を説明でき、MnemonicとSoftware Keyを含むCore管理下秘密情報のSecurity Invariant、通常処理と明示的アクセスの区別、ホスト環境に対する保証限界をConceptレベルで定義している。過去findingの回帰および新規Critical findingはないため、`CONCEPT READY` とし、Requirements再レビューへ進める。

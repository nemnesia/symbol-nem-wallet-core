# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-08-30
- 成果物: `docs/reviews/concept/concept-sheet-review-008.md`
- Review Scope: Concept本文の目的、課題、対象ユーザー、利用場面、提供価値、v1境界、Mnemonic / HD Wallet / Software Key / Accountの関係、責任分界、Security / Trust Boundary、成功条件、前提、リスク、用語、未決定事項および次工程への委譲。
- Intended Audience / 可読性評価の前提: プロダクト担当、企画担当、デザイナー、セキュリティ担当、プロジェクト管理者、将来のコントリビューター、Symbol / NEMや暗号技術に詳しくない関係者、実装詳細を知らない意思決定者を含む。エンジニアだけを前提にせず、Concept本文だけで製品目的、価値、責任範囲および重要情報の扱いを概念的に理解できるかを確認した。
- 未確認範囲: API、型、schema、wire format、暗号方式、KDF / Cipher、処理順序、state machine、class / module構成、Binding実装、詳細UX、コード、テスト、外部Nodeとの相互運用および下流成果物の正否。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。
- Reviewer A（品質と論理）: 完了。製品目的、課題から価値までの因果、用語関係、本文内整合性、v1と将来候補の分離および非エンジニアが読んだ場合の解釈可能性を確認した。
- Reviewer B（課題と価値）: 完了。対象ユーザー、利用場面、提供価値、成功条件、プロジェクト上の仮定と未検証の価値仮説の分離を確認した。
- Reviewer C（境界と成立性）: 完了。MnemonicとSoftware Keyの継続管理、Core / UI / Application / Web実行環境の責任、秘密情報のアクセス・非開示境界、v1対象外、前提、リスクおよび成立性を確認した。
- Phase 0: 完了。対象、根拠、出力先およびConceptフェーズの境界を確定した。
- Phase 1: 完了。Reviewer A/B/Cを独立した観点で確認した。
- Phase 2: 完了。過去指摘の回帰、新規候補の重複、根拠、影響、重大度および後工程への委譲可否を再確認した。
- Chair統合: 完了。本文から追跡でき、概念の解釈・責任・安全性・成立に直接影響する指摘だけを採用した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| コンセプト本文 | `docs/consept/concept-sheet.md` §1〜§13 | 目的、課題、対象ユーザー、価値、v1範囲、責任、Security / Trust Boundary、成功条件、前提、リスク、用語および委譲事項を確認 |
| 作業指針 | `AGENTS.md` | Source of Truth、Conceptフェーズ境界、変更範囲、秘密情報および検証方針を確認 |
| Reviewer Skill | `.agents/skills/concept-review/SKILL.md`、`reviewers.md`、`review-gates.md`、`output-format.md` | Reviewer A/B/C、finding採用基準、Review Gate、重大度および成果物構成を確認 |
| 共通 reviewer policy | `.agents/skills/review-common/review-playbook.md`、`output-format.md` | Phase 0〜3、Upstream Feedback / Deferred Findings、検証およびGit運用を確認 |
| 過去レビュー | `docs/reviews/concept/concept-sheet-review-001.md`〜`concept-sheet-review-007.md` | 既存 finding ID、状態、ゲートおよび回帰対象を確認。過去判定を現行本文の代わりにはしていない |
| Phase Context | なし | `AGENTS.md`にはConceptのContext登録がないため、Contextは使用していない |

## Review Result

`REVISE CONCEPT`

## Summary

現行Concept Sheetは、Symbol / NEMウォレット開発者向けに、MnemonicとSoftware Keyを扱うRust製Coreを提供する製品像、v1範囲、主要な責任分界および後工程への委譲を記述している。過去レビューで指摘されたv1境界、Mnemonicの継続管理、AccountとSoftware Keyの概念関係には回帰がない。

ただし、新しいレビュー前提である非エンジニアを含む読者に対して、製品目的・価値・責任境界が専門用語と長い一文に埋もれている。また、Mnemonicを含むCore管理下の全秘密情報について、Core外へのアクセス・返却・非開示を支える一貫したSecurity Invariantが本文から確認できない。この2点はConceptの明確さおよび責任境界のゲートを満たさないため、要件定義へ進む前にConcept本文を修正すべきである。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| CS-004 | Critical | New | 今回 | 非エンジニアを含む想定読者に対し、製品目的・価値・責任範囲の理解に必要な説明が不足し、§4が専門知識を前提としている。 |
| CS-005 | Critical | New | 今回 | MnemonicとSoftware Keyの管理責任は示されるが、Mnemonicを含む全Core管理下秘密情報の非開示・アクセス境界を一つの不変条件として確認できない。 |

## Required Changes

### CS-004

- Severity: Critical
- Category: 明確さ / 非エンジニア向け可読性 / 製品責務
- 対象箇所: `docs/consept/concept-sheet.md:5-12,35-43,47-50,62-75,81-85,129-149`
- 確認できた事実: 製品の一言説明が「Symbol / NEM」「Mnemonic」「Software Key」「Rust製Core」「UI / Application」などを前提に一文で記述されている。§4は対象開発者の前提知識として秘密鍵、Mnemonic、HD Wallet等を列挙している。§5ではMnemonicをHD Walletで、AccountをSoftware Keyで説明しており、Symbol / NEM、Core、UI / Application、Chain / Networkの平易な文脈説明はない。
- 問題: Concept Sheetが、実装知識やSymbol / NEM固有知識を持たない読者にとって、何を作るのか、なぜ必要か、誰が何を管理するのかを本文だけで理解しにくい。製品定義、価値、責任分界を一文に詰め込んだ箇所もあり、読み手が技術用語の意味を補完しないと解釈が分かれうる。
- なぜ問題なのか: これは言い回しの好みではなく、製品責務と意思決定の前提を誤認させる明確さの問題である。Reviewer Skillの「明確さ」ゲート、および想定読者に対する「対象ユーザーと価値」の理解を満たせない。
- 想定読者への影響: プロダクト担当・企画担当・デザイナー・プロジェクト管理者・意思決定者は、Coreが提供する価値とUI / Application・Web環境の責任外を判断できない可能性がある。セキュリティ担当は、用語の意味を外部資料で補わない限り、保護対象と責任境界を読み違える可能性がある。将来のコントリビューターは、技術的背景からスコープを逆推測する可能性がある。
- Conceptフェーズとして必要な修正方向: 冒頭に、ウォレットの秘密情報を共通のCoreで管理・署名利用する製品であること、分散実装による課題、開発者が得る価値を平易な短文で示す。Mnemonic、HD Wallet、Software Key、Account、Core、UI / Application、Symbol / NEMは専門用語を残したまま、Concept上の意味と相互関係を一文ずつ説明する。責任分界を一文へ詰め込まず、管理主体・一時的入力仲介・Core外の責任を分けて記述する。暗号方式、API、詳細UX、実装構造は追加しない。
- 完了条件または再確認方法: 非専門家がConcept本文だけを読み、(a)何を作るか、(b)なぜ必要か、(c)どの情報をCoreが管理するか、(d)何がCore外か、(e)次工程で何を決めるかを説明できる。中心用語の意味を下流資料や外部資料に依存せず把握でき、修正後もSymbol / NEMや鍵概念の技術的意味が曖昧になっていないことを再確認する。

### CS-005

- Severity: Critical
- Category: Security / Trust Boundary / responsibility
- 対象箇所: `docs/consept/concept-sheet.md:10-12,37-43,64-71,91-105,129-149,156-166,181-203`
- 確認できた事実: Mnemonicは生成・復元・取込み後もCoreが継続管理する秘密情報とされ、UI / Applicationは取込み後の継続的な管理主体ではない。一方、明示的に「通常の処理結果として返さない」とされる対象はCore管理下の秘密鍵であり、Mnemonicについて同等の非開示・非返却方針は明記されていない。Web環境を恒久的な保護境界としないことは記載されているが、MnemonicとSoftware Keyの双方について、Core外のコンポーネントが何にアクセスでき、何を受け取ってはならないかを統合したSecurity Invariantは確認できない。
- 問題: 「Coreが管理する」と「Core外へ秘密情報を渡さない」の関係が秘密情報の種類ごとに一貫して定義されていない。特にMnemonicは、UI / Applicationによる一時的な入力仲介の範囲、通常結果としての返却禁止、意図的な回復・表示・取込み時の例外の扱いが本文から区別できず、要件定義・設計で責任が逆流する解釈を許す。
- なぜ問題なのか: MnemonicはHD Walletの元秘密情報であり、Software Keyと同等以上にCoreの責任境界に直接関わる。Conceptで具体的な暗号方式やAPIを決める必要はないが、誰が継続管理し、どの境界を越えて漏えいさせてはならないかという高レベルのSecurity Invariantは、要件・設計が安全に分岐しないための前提である。現状はReviewer Skillの「責任境界」ゲートを満たさない。
- 想定読者への影響: セキュリティ担当はCoreの保証範囲とApplication側の責任を一意に評価できない。プロダクト担当や意思決定者は「MnemonicもCore外へ出ない」のかを判断できず、UI / Application開発者は入力仲介と継続保持の境界を誤解する可能性がある。将来のコントリビューターは、秘密情報を通常出力として返す設計をConceptと矛盾しないと解釈する可能性がある。
- Conceptフェーズとして必要な修正方向: MnemonicとSoftware Keyをまとめた「Core管理下の秘密情報」について、Coreが継続管理すること、UI / Applicationの一時的な入力仲介は管理責任の移転を意味しないこと、通常の処理結果としてCore外へ返却・共有・漏えいさせないことを明示する。意図的なユーザー回復・表示・取込みの具体的な可否や受渡し方式は決定せず、必要なら例外を明示的に分類してRequirements / Designで決定する。Web・OS・UI / Applicationの侵害をCoreが防止する保証ではないことも、上記Invariantと分けて示す。
- 完了条件または再確認方法: 第三者がMnemonicとSoftware Keyのそれぞれについて、(a)継続管理主体、(b)初期入力を仲介できる範囲、(c)通常処理で越えてはならない境界、(d)Coreが保証しないホスト環境の責任を本文から確認できる。具体的なAPI、暗号方式、メモリ保持方式、詳細UXを追加せずに、この境界をRequirements / Designへ一意に引き継げることを再確認する。

## Optional Improvements

なし。今回のMajor / Minorのみの任意改善は、CS-004およびCS-005の修正方向に含めた。

## Resolved Findings

### 過去レビューの回帰確認

| 過去ID | 今回の確認 |
| --- | --- |
| CR-001 | §7〜§8でv1能力、v1対象外、プロジェクト非対象および成功条件が区別されている。回帰なし。 |
| CR-002 | §1、§7、§9〜§10でCore、UI / Application、Web実行環境、OS固有保管、External Signer、Network層およびTransaction構築層の高レベルな境界が維持されている。回帰なし。 |
| CR-003 | §2、§4でSymbol / NEMウォレット開発者とDesktop / Mobile / Webの主要利用場面が維持されている。回帰なし。 |
| CR-004 | §5で秘密鍵処理、鍵管理、署名処理、Signer、Software KeyおよびWatch-onlyの概念が定義されている。回帰なし。 |
| CR-005 | §5、§7で生成、復元、取込み、保存、ロック、アンロック、署名利用および破棄が鍵管理の範囲として維持されている。回帰なし。 |
| CR-006 | §3、§5、§7でHD Wallet由来の鍵をSoftware Keyとして扱う関係が維持されている。回帰なし。 |
| CR-007 | §5、§7、§11でWatch-onlyをSignerおよび将来のSigner実装候補と区別している。回帰なし。 |
| CR-008 | §6、§8で実装・レビュー・保守負担の抑制とCoreへの責任集約・共通利用の関係が維持されている。回帰なし。 |
| CR-009 | §1、§3、§7〜§8で取込み時の一時仲介、取込み後のCore管理およびCore管理下の秘密鍵を通常結果として返さない境界が維持されている。回帰なし。ただしMnemonicを含む全秘密情報のInvariant不足はCS-005で新規に扱う。 |
| CS-001 | §1、§3、§5、§7、§8、§12〜§13でMnemonicの生成・復元・取込み後のCore継続管理とSoftware Keyとの区別が維持されている。回帰なし。 |
| CS-002 | §2で利用者課題、プロジェクト上の仮定、未検証の価値仮説が見出しで分離されている。回帰なし。 |
| CS-003 | §3〜§7でMnemonic、HD Wallet、Software Key、AccountおよびUI / ApplicationのAccount選択責任の関係が維持されている。回帰なし。 |

## Upstream Feedback

なし。Conceptより上流の正式資料やdecisionの不足を今回の正式findingの根拠にはしていない。

## Deferred Findings

Conceptフェーズの範囲外として、次をRequirements / Design / Specificationへ引き継ぐ。これらは現行Conceptの欠陥としては採用しない。

- 対象プロトコル版、互換性基準、基準時点および対象OS・Browser。
- Profile、Mnemonic、Software Keyの具体的な管理単位、状態および詳細ライフサイクル。
- 認可条件、パスワード安全性、入力検証、エラー、認証失敗・破損時の動作。
- API、型、データ形式、Binding、暗号方式、保存形式、メモリ保持・消去方式。
- 秘密情報の意図的な回復・表示・exportをv1で許可するか、その詳細なUX・受渡し方式。
- 実装可能性、外部Node、相互運用fixtureおよび具体的な受入テスト。

CS-005を解消した後であれば、上記のアクセス詳細や例外の可否を後続工程で決定する委譲は適切である。詳細を先に決めること自体は本レビューでは要求しない。

## Scope and Traceability

- 対象境界: `docs/consept/concept-sheet.md`のConcept本文。Symbol / NEMウォレット開発者向けのSoftware Key管理Coreを、Desktop / Mobile / Webから利用する構想を対象とした。
- 上流根拠: Conceptより上流の正式資料は参照していない。AGENTS.mdとReviewer Skillは作業規則として使用し、製品仕様の根拠にはしていない。
- 同一フェーズ根拠: 現行Concept本文を主根拠とし、過去レビューはfindingの状態・回帰の追跡に限定した。
- 製品責任の確認: MnemonicとSoftware Keyの取込み後の継続管理はCore、Account選択・公開情報表示・ユーザー操作・一時的入力仲介はUI / Application、Web固有状態・Network・Transaction構築はCore外という高レベル方針は本文から追跡できる。ただしCS-005のため、秘密情報全体の非開示Invariantは追跡不十分である。
- Concept → Requirements / Designへの委譲評価: API、暗号方式、詳細ライフサイクル、Binding、対象環境および詳細UXを後工程へ委譲する構成は適切である。管理主体と非開示境界というConcept上のSecurity Invariantだけは、後工程へ委譲する前に本文で明確化する必要がある。
- Conceptフェーズ逸脱: なし。今回のfindingはAPI、schema、暗号パラメータ、state machine、実装方式または詳細UXを要求していない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | 内容は合格、説明は要修正 | §2で課題・仮定・未検証の価値仮説が分離され、§6・§8に価値と成功条件がある。ただしCS-004により非専門家が因果を理解するための説明が不足している。 |
| 対象ユーザー | 部分合格 | §4の製品利用者であるウォレット開発者と主要場面は明確。ただしConcept Sheetの想定読者を専門知識保有者に狭める前提があり、CS-004の対象となる。 |
| v1の境界 | 合格 | §7、§11にv1能力、対象外、プロジェクト非対象、外部責任および将来候補が区別されている。 |
| 責任 | 不合格 | Core、UI / Application、Web環境、OS固有保管、Network層およびTransaction構築層の役割はあるが、Mnemonicを含む全秘密情報の非開示・アクセス境界が一意でなく、CS-005に該当する。 |
| 成功条件 | 要修正 | §8にCore管理、秘密鍵非返却、Mnemonicの管理主体およびChain / Networkの区別がある。Mnemonicを含む全秘密情報のSecurity Invariantを成功条件へ対応付ける必要がある。 |
| Security / Trust Boundary / responsibility | 不合格 | Webを恒久的な保護境界としないこと、Coreの管理責任、UI / Applicationの一時仲介は示されるが、CS-005のとおり秘密情報全体の境界が明示されていない。 |
| 非エンジニアを含む可読性 | 不合格 | 中心用語の説明が技術用語を別の未説明用語で説明し、§1の製品定義と責任分界も長文に集中している。CS-004に該当する。 |
| 専門用語 | 要修正 | 用語を残すこと自体は適切だが、Symbol / NEM、Core、UI / Application、Chain / Network等のConcept上の意味が非専門家向けに十分説明されていない。CS-004に該当する。 |
| 成立性 | 合格 | §9〜§10がWeb・UI / Application・実行環境の限界と後工程で検証するリスクを明示しており、コンセプト自体を成立不能にする明白な外部制約・前提矛盾は確認されない。 |

## Validation Results

- 実施: `AGENTS.md`、Concept Reviewer Skill一式、共通 reviewer policy、現行Concept本文、過去レビューの状態およびゲートの確認。
- 実施: Reviewer A/B/Cの独立自己レビュー、Chairによる候補の反証・統合、CR-001〜CR-009およびCS-001〜CS-003の回帰確認。
- 作成後に実施: Markdown構造、finding ID重複、参照パス、`git diff --check`、変更範囲の確認。Markdown lint実行ファイルは環境に存在しなかったため、見出し順、末尾空白および参照パスを手動・シェル検査した。
- 未実施: Rust formatter、clippy、cargo test、WASM check。今回の変更対象はレビュー成果物のみで、コード・Binding・仕様を変更していないため対象外。
- 未確認: 外部Node、ネットワーク相互運用、暗号方式、API、データ形式、実装および下流工程の適合性。

## Review Gates

| Gate | 結果 | 根拠 | 対応ID |
| --- | --- | --- | --- |
| 明確さ | 不合格 | 製品像自体は技術者には読めるが、想定する非エンジニアを含む読者が、外部資料なしに目的・価値・責任を理解できない。 | CS-004 |
| 課題 | 合格 | §2に対象者、現在の課題、原因、放置時の影響、プロジェクト上の仮定および未検証の価値仮説がある。 | なし |
| 対象ユーザーと価値 | 不合格 | §4、§6、§8に製品利用者・利用場面・価値はあるが、技術用語の前提により、要求された非専門家を含む読者がその価値と責任範囲を一意に理解できない。 | CS-004 |
| v1の境界 | 合格 | §7にv1能力、対象外、プロジェクト非対象および外部責任、§11に将来候補がある。 | なし |
| 責任境界 | 不合格 | MnemonicとSoftware Keyの管理主体は読めるが、Mnemonicを含む全Core管理下秘密情報の非開示・アクセス境界が一意でない。 | CS-005 |
| 内部整合性 | 合格 | 目的、課題、価値、v1範囲、対象外および成功条件のCore集約方針に重大な矛盾はない。CS-005は不整合ではなく、Security Invariantの範囲不足である。 | なし |
| 成立性 | 合格 | Web環境を恒久的な保護境界としない前提、Coreの限界および後工程で検証するリスクが示されている。コンセプト自体を成立不能にする明白な外部制約は確認されない。 | なし |

## Remaining Risks and Open Decisions

- CS-004が未解消のままでは、非エンジニアを含む関係者が製品目的、価値および責任外範囲を誤認し、要件の前提を誤って引き継ぐリスクがある。
- CS-005が未解消のままでは、MnemonicとSoftware Keyの受渡し・保持・表示に関する責任がUI / Application側へ逆流する解釈が残る。
- 具体的な保存・保護・消去、認可、Binding、対象環境、プロトコル版、詳細UXおよび意図的な回復・表示・exportの可否は未決定であり、CS-005の高レベルInvariantを前提に後工程で決定する必要がある。
- 過去レビューのCR-001〜CR-009およびCS-001〜CS-003に、今回確認した回帰はない。

## Automatic Changes

レビュー中にConcept、Requirements、Design、Specification、Implementation、テスト、README、Skill本体または過去レビュー成果物は変更していない。新規成果物として本レビュー文書のみを追加した。

## Final Decision

`REVISE CONCEPT`

CS-004（非エンジニアを含む読者に対する明確さ・可読性）とCS-005（Mnemonicを含む全秘密情報のSecurity Invariant・Trust Boundary）がCriticalであり、それぞれ「明確さ」「対象ユーザーと価値」「責任境界」ゲートを不合格にする。Concept Sheetを修正して再レビューした後、Requirements再レビューへ進むべきである。

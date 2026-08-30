# Concept Review Findings

## Review Target

- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-08-30
- 成果物: `docs/reviews/concept/concept-sheet-review-010.md`
- Review Scope: Concept Sheet の13章全体を対象に、単独文書としての一貫性、クリーンアップによる semantic regression、過去 finding の再発、鍵モデルと用語、v1・将来候補・対象外の境界、Core / UI / Application / ホスト環境の責任境界、Concept フェーズの境界および非エンジニア可読性を確認した。
- Review Perspective: Reviewer A（品質と論理）、Reviewer B（課題と価値）、Reviewer C（境界と成立性）の3観点を独立した自己レビュー・パスとして実施した。
- 未確認範囲: Requirements、Design、Specification、Implementation、API、schema、wire format、暗号方式、KDF / Cipher、保存形式、state machine、Binding 実装、詳細 UX、実装可能性および外部 Node との相互運用性の正否。これらは Concept の欠陥を判定する根拠として確認していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。
- Reviewer A（品質と論理）: 完了。13章の説明順、目的・課題・価値・成功条件の因果、用語の一貫性、`Mnemonic → HD Wallet → Software Key → Account` の関係、v1 と将来候補の分離、およびクリーンアップで統合・移動・削除された箇所の意味保持を確認した。
- Reviewer B（課題と価値）: 完了。対象ユーザー、主要利用場面、提供価値、成功条件、利用者課題・プロジェクト上の仮定・未検証の価値仮説の区別、および非エンジニアが製品像を追えるかを確認した。
- Reviewer C（境界と成立性）: 完了。Mnemonic と Software Key の継続管理、取込み時の一時的な入力仲介、通常処理での非返却・非共有、Core / UI / Application / Browser / OS の責任境界、v1 対象外、将来候補、前提、リスクおよびホスト侵害に対する保証限界を確認した。
- Phase 0: 完了。対象、根拠、成果物の出力先および Concept フェーズのレビュー境界を確定した。
- Phase 1: 完了。Reviewer A / B / C を独立した観点で確認した。
- Phase 2: 完了。クリーンアップ前後の差分、過去 finding の状態、再発候補の根拠・影響・対象工程および Concept に残すべき詳細の有無を再確認した。
- Chair 統合: 完了。現行本文の成立・解釈・境界に直接影響する候補だけを採用基準に照らして評価し、新規 formal finding は採用していない。

## Evidence Used

| 種別 | Reviewed Documents / 参照箇所 | 用途 |
| --- | --- | --- |
| 主対象文書 | `docs/consept/concept-sheet.md` §1〜§13 | 製品目的、課題、対象ユーザー、利用場面、提供価値、鍵モデル、v1 範囲、将来候補、責任境界、Security Invariant、成功条件、制約、リスク、未決定事項および次工程への引継ぎを確認 |
| クリーンアップ差分 | `HEAD^..HEAD` の `docs/consept/concept-sheet.md` 差分 | 文章の統合・移動・削除が、既存の合意事項や意味を失わせていないかを確認 |
| 直前レビュー | `docs/reviews/concept/concept-sheet-review-009.md` | CS-004 / CS-005 の解消状態、直前の Gate 判定および過去 finding の回帰確認範囲を確認。直前判定を現行本文の代わりにはしていない |
| 過去レビュー | `docs/reviews/concept/concept-sheet-review-001.md`〜`concept-sheet-review-008.md` | CR-001〜CR-012 および CS-001〜CS-005 の初出、状態、完了条件および再発対象を追跡 |
| 作業指針 | `AGENTS.md` | Source of Truth、Concept フェーズ境界、変更範囲、秘密情報および検証方針を確認 |
| Concept Review 手順 | `.agents/skills/concept-review/SKILL.md`、`reviewers.md`、`review-gates.md`、`output-format.md` | Reviewer A / B / C、finding 採用基準、Gate、Severity、Review Result および成果物形式を確認 |
| 共通レビュー手順 | `.agents/skills/review-common/review-playbook.md`、`output-format.md` | Phase 0〜3、過去 finding 追跡、Deferred Findings、検証および Git 運用を確認 |
| Phase Context | なし | `AGENTS.md` に Concept の Context 登録がないため、Phase Context は使用していない |

## Review Result

`READY`

## Summary

現行 Concept Sheet は、Symbol / NEM ウォレット開発者向けに、Desktop / Mobile / Web から共通利用する Rust 製の秘密情報管理 Core を作る製品像を、§1〜§13 の単独文書として一貫して説明している。目的、課題、対象ユーザー、価値、v1 の範囲、対象外、責任境界、成功条件、制約、リスクおよび次工程への引継ぎに重大な矛盾はない。

クリーンアップでは、§1 の重複説明、§4 の利用場面のラベル列挙、§5 の用語列挙、§12〜§13 の重複する方針記述などが統合・整理された。しかし、Mnemonic の生成・復元・取込み後も Core が継続管理すること、Mnemonic と Software Key が別の管理対象であること、HD Wallet から導出された秘密鍵を Software Key として扱うこと、Account の選択を UI / Application が担うことは、§1、§3〜§7、§8 および §13 から引き続き追跡できる。

§7 の Security Invariant は、Mnemonic と Software Key の双方について、Core の継続管理、一時的な入力仲介は責任移転ではないこと、通常処理で Core 外へ返却・共有しないこと、Desktop / Mobile / Web で原則を変えないことを維持している。また、ユーザーが明示的に求める回復・表示・export と通常処理を区別し、ホスト環境そのものの侵害を Core が防止する保証ではないことも維持している。

過去の CR-001〜CR-012 および CS-001〜CS-005 について、現行本文への再発は確認されなかった。新たな Critical / Major / Minor finding も確認されず、Requirements / Design 相当の具体方式を Concept の不足として採用する理由もない。

## Finding Status

Formal findings: なし。新規、Open、Reopened の Critical / Major / Minor finding は確認されなかった。

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| CR-001〜CR-009 | 過去の各 Severity | Resolved / 回帰なし | concept-sheet-review-001〜003 | §7〜§8 の v1 能力・対象外・成功条件、§1・§7・§9〜§10 の責任境界、§2・§4 の対象ユーザー、§5 の用語、§6・§8 の価値と成功条件、§1・§3・§7〜§8 の取込み境界を確認した。 |
| CR-010〜CR-012 | 過去の各 Severity | CS-001〜CS-003 で再評価・Resolved / 回帰なし | concept-sheet-review-004〜006 | Mnemonic の継続管理、課題・仮定・価値仮説の分離、`Mnemonic → HD Wallet → Software Key → Account` と Core / UI の責任関係を確認した。 |
| CS-001〜CS-003 | Major / Minor | Resolved / 回帰なし | concept-sheet-review-006〜007 | §1、§2、§3〜§7、§8、§12〜§13 に、Mnemonic の Core 継続管理、課題分類、鍵モデルと Account 利用の関係が維持されている。 |
| CS-004〜CS-005 | Critical | Resolved / 回帰なし | concept-sheet-review-008〜009 | §1、§5、§7、§8、§10、§12〜§13 に、非エンジニア向けの製品説明、用語、Security Invariant、通常処理と明示的アクセスの区別、ホスト侵害への保証限界が維持されている。 |

## Required Changes

なし。Concept Review の必須変更対象となる Critical の New / Open / Reopened は確認されなかった。

## Optional Improvements

なし。Concept Review の任意改善対象となる Major / Minor の New / Open / Reopened は確認されなかった。

## Resolved Findings

### 過去 finding の再発確認

| 過去 finding | 再発確認 |
| --- | --- |
| CR-001 | §7 の v1 で扱う能力、v1 対象外、プロジェクトとして扱わない領域、外部責任および§8 の成功条件が区別されている。再発なし。 |
| CR-002 | §1、§7、§9〜§10 に Core、UI / Application、Web 実行環境、OS 固有保管、Network 層、Transaction 構築層および External Signer の高レベルな責任分界がある。再発なし。 |
| CR-003 | §2、§4 に Symbol / NEM ウォレット開発者、Desktop / Mobile / Web の対象および主要利用場面がある。再発なし。 |
| CR-004 | §5 に秘密鍵処理、鍵管理、署名処理、Signer、Software Key および Watch-only の意味がある。再発なし。 |
| CR-005 | §5、§7 に生成、復元、取込み、保存、ロック、アンロック、署名利用および破棄の鍵管理範囲がある。再発なし。 |
| CR-006 | §3、§5、§7 に HD Wallet 由来の秘密鍵を Software Key として扱う関係がある。再発なし。 |
| CR-007 | §5、§7、§11 に Watch-only を署名能力のない別の Account 利用形態として扱い、Signer および将来の Signer 実装候補と区別する記述がある。再発なし。 |
| CR-008 | §6、§8 に UI からの分離、Core への責任集約、共通利用および実装・レビュー・保守負担の抑制の関係がある。再発なし。 |
| CR-009 | §1、§3、§4、§7〜§8 に、取込み時の一時的な入力仲介、取込み後の Core 管理および通常処理での Core 外への秘密情報非返却・非共有がある。再発なし。 |
| CR-010 / CS-001 | §1、§5、§7、§8、§12〜§13 に、Mnemonic は生成・復元・取込み後も Core が継続管理する秘密情報であり、Software Key とは別の管理対象であることを確認できる。再発なし。 |
| CR-011 / CS-002 | §2 が「利用者が実際に直面する課題」「プロジェクト上の仮定」「未検証の価値仮説」に分かれている。再発なし。 |
| CR-012 / CS-003 | §5 の関係説明、§3・§4・§7 の利用場面と責任境界により、Mnemonic → HD Wallet → Software Key → Account 利用、Core の導出・管理責任、UI / Application の Account 選択責任を追跡できる。再発なし。 |
| CS-004 | §1、§4〜§5、§7 に製品像、主要用語、Core / UI / Application の役割、管理対象および責任外があり、非エンジニアを含む読者が概念的に理解できる。再発なし。 |
| CS-005 | §7 に Mnemonic と Software Key の Security Invariant、取込み時の一時仲介、通常処理での非返却・非共有、環境差異によらない原則、明示的アクセスとの区別、ホスト侵害に対する保証限界がある。再発なし。 |

### クリーンアップによる semantic regression の有無

なし。クリーンアップで主に変更されたのは、重複していた説明の統合、見出しと箇条書きの整理、用語表記の統一、§12〜§13 の重複する引継ぎ記述の整理である。次の合意事項は、単語の残存だけでなく複数章の意味の連鎖として確認できる。

- Mnemonic は生成・復元・取込み後も Core が継続管理する。§1、§5、§7、§8。
- Mnemonic と Software Key は別の管理対象である。§1、§5、§7。
- Mnemonic を基礎とする HD Wallet から秘密鍵を導出し、導出鍵を Software Key として扱い、Account として利用する。§3、§4、§5、§7。
- Core は鍵の生成、復元、導出、管理および署名利用を担う。§3、§5、§7、§8。
- UI / Application は秘密情報の継続的な管理・保存主体ではないが、取込み時にユーザー入力を一時的に仲介する場合がある。§1、§3、§4、§5、§7。
- Core 管理下の秘密情報は、通常処理の結果として Core 外へ返却・共有しない。§3、§4、§7、§8。
- Desktop / Mobile / Web で Core の基本的な秘密情報管理責任と公開範囲を変えない。§1、§3、§7〜§10。
- Core は UI / Application、Browser、OS などホスト環境そのものの侵害を防止する保証をしない。§7、§9〜§10。

### 新規 finding の採否

独立レビューで確認した範囲では、§1 の説明に含まれる専門用語、§5 の用語定義の簡潔化、§7 の高レベルな能力記述、§12〜§13 の後工程委譲は、いずれも別章で補完されるか、Concept の抽象度に適合している。表現上の好み、追加の将来機能、API・schema・暗号・保存方式の不足は finding としなかった。

## Upstream Feedback

なし。Concept より上流の正式資料または decision の不足・矛盾を、今回の判定根拠として確認していない。

## Deferred Findings

Formal finding はなし。次の事項は本文が未決定事項または次工程への引継ぎとして明示しており、Concept の欠陥ではない。

- 対象プロトコル版、互換性基準、基準時点、対象 OS・Browser および配布方式。
- Profile、Mnemonic、Software Key の具体的な管理単位、状態、保存・保護・消去および詳細ライフサイクル。
- パスワード安全性、認可条件、入力検証、エラー、認証失敗・破損時の動作および受入条件。
- API、型、schema、データ形式、Binding、暗号方式、保存形式、メモリ保持・消去方式、具体的な処理順序および検証。
- ユーザーが明示的に求める Mnemonic / Software Key の回復、表示、export を v1 で許可するか、その認可条件、UX および受渡し方式。
- Web 環境における秘密情報のコピー、保持、消去方式および実装上の保護強度。

## Scope and Traceability

- 対象境界: `docs/consept/concept-sheet.md` の Concept 本文。Symbol / NEM ウォレット開発者向けの Software Key 管理 Core を、Desktop / Mobile / Web（Web Application / Browser Extension を含む）から利用する構想を対象とした。
- 製品責任: Mnemonic と Software Key の継続管理、HD Wallet からの導出、秘密鍵の取込み・生成、Software Key の管理・署名利用、通常処理での秘密情報非返却・非共有および実行環境に依存しない公開範囲を Core に集約する。
- 外部責任: UI / Application は Account の選択、公開情報の表示、ユーザー操作、ウォレット固有の表示・設定および取込み時の一時的な入力仲介を担うが、Mnemonic / Software Key の継続的な保存・管理主体ではない。Web Application / Browser Extension の固有状態とセキュリティ、Network 層、Transaction 構築層は Core 外である。
- Security / Trust Boundary: §7 の Security Invariant が、Core 管理下の秘密情報、通常処理、明示的アクセス、実行環境差異およびホスト環境に対する保証限界を定めている。
- 将来候補との境界: Hardware Wallet、External Signer、OS-backed Key、Watch-only、SNIF 連携および CLI 等は §7・§11 で v1 の製品責任・成功条件から除外され、将来候補または別の利用形態として扱われている。Watch-only は Signer ではなく、Hardware Wallet / External Signer / OS-backed Key は将来の Signer 実装候補である。
- Concept → Requirements / Design への委譲: 管理主体、非開示原則、通常処理と意図的アクセスの区別、v1 境界および責任分界は Concept に残されている。API、データ形式、暗号、保存、認可、詳細ライフサイクル、Binding、詳細 UX および受入条件は後工程へ委譲されている。
- Concept フェーズ逸脱: なし。本文に詳細方式を後工程で決定する旨はあるが、方式そのものを Concept の決定として固定していない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | 合格 | §2 が利用者課題、プロジェクト上の仮定、未検証の価値仮説を分け、§6・§8 が Core への責任集約と共通利用による価値・成功条件を示している。 |
| 対象ユーザー | 合格 | §4 が Symbol / NEM ウォレット開発者を明示し、Desktop / Mobile / Web への組込みと主要利用場面を説明している。 |
| v1 の境界 | 合格 | §7 が v1 の能力、v1 で実施しないこと、プロジェクトとして扱わないこと、外部責任を分け、§11 が将来候補を分離している。Hardware Wallet、External Signer、OS-backed Key、Watch-only、SNIF の現在提供と将来候補の混同はない。 |
| 責任 | 合格 | Core の継続管理・署名利用、UI / Application の Account 選択・入力仲介、Web / Browser / OS、Network、Transaction 構築層の境界が §1、§5、§7、§9〜§10 にある。 |
| 成功条件 | 合格 | §8 が共通 Core、Software Key、Mnemonic / Software Key の継続管理主体、通常処理での非返却・非共有、Chain / Network 区別および実行環境非依存の責任を対応付けている。 |
| Security / Responsibility Boundary | 合格 | §7 が Mnemonic と Software Key の双方を対象とする Security Invariant、一時的な入力仲介、通常処理での非開示、明示的アクセスとの区別およびホスト環境への保証限界を保持している。 |
| Phase Boundary | 合格 | Concept は Why / Who / What / Scope / Value / Responsibility / Constraints / Principles を扱い、API、schema、暗号方式、保存形式、state machine、Binding 実装および詳細な受入条件を後工程へ委譲している。 |
| 非エンジニア可読性 | 合格 | §1 が何を作るか、なぜ分離するか、誰が使うかを平易に示し、§4〜§5 が役割・主要用語・関係を補足する。専門用語を知らない読者でも製品像、v1 の範囲、責任外を文脈から追える。 |
| 用語と鍵モデル | 合格 | Mnemonic、HD Wallet、Software Key、Account、Signer、Watch-only、External Signer、OS-backed Key、Core、UI / Application の意味と境界に章間の矛盾はない。 |
| 成立性 | 合格 | §9〜§10 が Web、UI / Application、Browser、OS の限界と Core の保証範囲を明示しており、Concept 自体を成立不能にする明白な前提矛盾・外部制約は確認されない。 |

## Validation Results

- 実施: `AGENTS.md`、Concept Review Skill 一式、共通 reviewer policy、現行 Concept Sheet §1〜§13、既存 Concept Review 001〜009 の確認。
- 実施: Reviewer A / B / C の独立自己レビュー、Chair による候補の反証・統合、過去 finding の再発確認、クリーンアップ差分の semantic regression 確認。
- 実施: `git diff --check HEAD^ HEAD -- docs/consept/concept-sheet.md`。クリーンアップ差分に whitespace error は確認されなかった。
- 実施: 13章の連番、見出し構造、主要用語の出現および現行本文の行番号範囲を確認した。
- 未実施: Rust formatter、clippy、cargo test、WASM check、Native / Web binding 検証。今回のレビュー対象は Concept 文書であり、コード・Binding・仕様を変更していないため対象外。
- 未確認: 外部 Node、ネットワーク相互運用、暗号方式、API、データ形式、実装、詳細 UX および下流成果物の適合性。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 明確さ | 合格 | §1、§4〜§5、§7 に製品像、主要用語、鍵モデル、Core / UI / Application の役割、v1 範囲および対象外がある。 | なし（CS-004 回帰なし） |
| 課題 | 合格 | §2 に対象者、課題、原因、放置時の影響、プロジェクト上の仮定および未検証の価値仮説がある。 | なし（CS-002 回帰なし） |
| 対象ユーザーと価値 | 合格 | §1、§4、§6、§8 に利用者、利用場面、解決対象、提供価値および成功条件がある。 | なし |
| v1 の境界 | 合格 | §7 が v1 の能力・対象外・外部責任を区別し、§11 が Hardware Wallet、External Signer、OS-backed Key、Watch-only、SNIF 等を将来候補として分離している。 | なし |
| 責任境界 | 合格 | §7 の Security Invariant が Mnemonic / Software Key の継続管理、一時仲介、通常処理での非返却・非共有、実行環境非依存の原則およびホスト侵害への保証限界を示している。 | なし（CS-005 回帰なし） |
| 内部整合性 | 合格 | §1〜§13 は、Core に秘密情報管理・署名責任を集約し、UI / Application は利用者操作・Account 選択・一時入力仲介を担うという同じ方針を示している。クリーンアップによる意味の反転・欠落はない。 | なし |
| 成立性 | 合格 | §9〜§10 が Core の保証範囲とホスト環境の限界を明示しており、Concept 自体を成立不能にする未解決の前提矛盾はない。 | なし |

全 Gate 合格。Concept Review の Gate 不合格に対応する Critical finding はない。

## Remaining Risks and Open Decisions

- 対象プロトコル版、互換性基準、対象 OS・Browser、Binding、認可条件、保存・保護方式、消去方式、詳細ライフサイクルおよび意図的な秘密情報アクセスの可否は、本文に記載された未決定事項であり、後工程で決定する必要がある。
- Web を恒久的な秘密情報保護境界とみなさない前提、および UI / Application・Binding 境界でのコピー・保持のリスクは、後工程で受入条件とともに確認する必要がある。
- これらは現行 Concept の残存 finding ではなく、本文が明示した Requirements / Design / Specification への引継ぎ事項である。

## Automatic Changes

レビュー中に `docs/consept/concept-sheet.md`、Requirements、Design、Specification、Implementation、テスト、README または既存レビュー成果物は変更していない。新規成果物として本レビュー文書のみを作成した。

## Final Decision

`READY`

**CONCEPT PHASE READY TO CLOSE**

この判定は、Concept Sheet がこれ以上改善できないという意味ではない。現行文書が、Requirements / Design / Specification の上位基準文書として安定しており、Concept フェーズを再度編集する必要がないことを意味する。

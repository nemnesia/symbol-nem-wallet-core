# Concept Review Findings

## Review Target

- 対象 branch: `agent/react-native-support`
- 対象 HEAD: `bb529efd19c4e0b45f596a0588a4bb2a3f9a1db7`
- 対象: `docs/consept/concept-sheet.md`
- 確認日: 2026-09-05
- 成果物: `docs/reviews/concept/concept-sheet-review-011.md`
- Review Scope: Concept Sheet の §1〜§13 全体を対象に、React Native Android / iOS の追加による既存コンセプトとの整合性、対象 platform の境界、単一 repository / 単一 npm package、共通 Rust Core、Security Invariant、Core / UI / Application の責任境界、Concept の抽象度、MosaicLynx 固有要件の混入、Requirements への委譲および過去 finding の回帰を確認した。
- 変更差分: `origin/main...HEAD` の Concept Sheet 差分を確認した。対象 branch では React Native 対応方針を中心とする Concept Sheet の変更のみが確認できた。
- 未確認範囲: Requirements、Design、Specification、Implementation、API、schema、wire format、暗号方式、KDF / Cipher、保存形式、Binding の実装方式、JSI / TurboModule 等の採否、build / release workflow、詳細 UX、実装可能性および外部 Node との相互運用性の正否。これらは今回の Concept Review の判定対象にしていない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。
- Reviewer A（品質と論理）: 完了。§1〜§13 の説明順、用語、目的・課題・価値・成功条件の因果、`Mnemonic → HD Wallet → Software Key → Account` の関係、既存記述との整合および React Native 追加による矛盾を確認した。
- Reviewer B（課題と価値）: 完了。対象ユーザー、主要利用場面、platform coverage、単一 package による共通利用の価値、Browser と Browser Extension の区別、および MosaicLynx 固有要件の混入有無を確認した。
- Reviewer C（境界と成立性）: 完了。v1 の境界、共通 Rust Core の責任、Mnemonic / Software Key の継続管理、Security Invariant、UI / Application と host environment の責任、React Native 側への責任移転の有無、前提、リスクおよび成立性を確認した。
- Phase 0: 完了。対象 branch、HEAD、主対象文書、差分、過去 artifact、出力先および Concept Review の境界を確定した。
- Phase 1: 完了。Reviewer A / B / C を独立した観点で確認した。
- Phase 2: 完了。React Native 追加による新規候補、既存 finding の回帰、ユーザー決定済み方針の再審議要否、Concept から後工程へ委譲すべき事項および候補の採否を再確認した。
- Chair 統合: 完了。本文へ追跡でき、Concept の成立・解釈・境界に直接影響する問題だけを formal finding 候補として評価した。新規 formal finding は採用していない。

## Evidence Used

| 種別 | Reviewed Documents / 参照箇所 | 用途 |
| --- | --- | --- |
| 主対象文書 | `docs/consept/concept-sheet.md` §1〜§13 | 製品目的、課題、対象ユーザー、platform coverage、提供価値、v1 範囲、責任境界、Security Invariant、成功条件、前提、リスク、未決定事項および次工程への引継ぎを確認 |
| 今回の変更差分 | `origin/main...HEAD` の `docs/consept/concept-sheet.md` 差分 | React Native Android / iOS の追加、platform 定義、共通 Rust Core、単一 repository / npm package、Security Invariant および後工程委譲の追加・変更を確認 |
| 直前レビュー | `docs/reviews/concept/concept-sheet-review-010.md` | 前回の `READY` 判定、過去 finding の回帰確認範囲および artifact の継続性を確認。前回判定を現行本文の代わりにはしていない |
| 過去レビュー | `docs/reviews/concept/concept-sheet-review-001.md`〜`concept-sheet-review-009.md` | `CR-001`〜`CR-012`、`CS-001`〜`CS-005` の初出、状態、完了条件および再発対象を追跡 |
| 作業指針 | `AGENTS.md` | Source of Truth、Concept フェーズ境界、変更範囲、秘密情報、change-aware validation および Git 運用を確認 |
| Concept Review 手順 | `.agents/skills/concept-review/SKILL.md`、`reviewers.md`、`review-gates.md`、`output-format.md` | Reviewer A / B / C、finding 採用基準、severity、Review Gate、Review Result および artifact 形式を確認 |
| 共通レビュー手順 | `.agents/skills/review-common/review-playbook.md`、`output-format.md` | Phase 0〜3、過去 finding 追跡、Deferred Findings、検証および成果物運用を確認 |
| Phase Context | なし | `AGENTS.md` に Concept の Context 登録がないため、Design Context は使用していない |

## Review Result

`READY`
## Summary

React Native Android / iOS の追加は、既存の Desktop / Mobile / Web / Node.js という上位の製品像を壊さず、§5 で Mobile を React Native Android / iOS、Web を Browser（Web Application）および Browser Extension と定義し、§7〜§10 で対象範囲・Security Invariant・成功条件・リスクへ反映されている。Browser Extension は Browser と同一視されず、Web Application とは別の利用形態として本文から確認できる。

単一 repository、単一 npm package、React Native 専用 package を作らないこと、各 runtime / platform から同じ Rust Core を利用することは、§1、§7、§8、§12〜§13 で矛盾なく扱われている。React Native Android / iOS は別の Wallet Core として定義されず、runtime / platform 固有の差異を package 内部に隠蔽し、platform 固有に分ける必然性がない公開 API は一貫した利用モデルを目指すという Concept レベルの方針に留まっている。

React Native 対応を理由に、暗号処理、Mnemonic、秘密鍵、Wallet Store、署名処理または秘密情報 lifecycle の責任を React Native、Kotlin、Swift、JavaScript 等へ移す記述はない。§7 の Security Invariant は Mnemonic と Software Key の双方に適用され、runtime / platform によって Core の管理責任と通常処理での非開示原則を変えない。ホスト環境の侵害を Core が防止する保証ではないという限界も維持されている。

Concept Sheet に JSI、TurboModule、Native Module、Kotlin / Swift / Objective-C++、NDK、`.so`、AAR、XCFramework、CocoaPods、Swift Package Manager、Metro resolver、conditional exports、autolinking、ABI、threading / async model、exact API signature、architecture matrix、CI / release workflow の実装詳細は混入していない。MosaicLynx 固有の UI、画面構成、Deep Link、アプリフロー、署名 UX も記載されていない。Requirements / Design へ送る具体事項は本文の未決定事項および次工程への引継ぎとして整理されており、Concept の不足として扱うべき formal finding はない。

過去 `CR-001`〜`CR-012` および `CS-001`〜`CS-005` の回帰は確認されなかった。新規、Open、Reopened の Critical / Major / Minor finding はないため、既存運用上の正式な Review Result は `READY` とし、Requirements へ進められる。

## Finding Status

Formal findings: なし。今回の New / Open / Reopened は 0 件であり、Reopened finding もない。

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `CR-001`〜`CR-009` | 初出時の各 Severity | Resolved / 回帰なし | `concept-sheet-review-001`〜`concept-sheet-review-003` | v1 範囲、Core と外部責任、対象ユーザー、用語、鍵管理範囲、HD Wallet と Software Key、Watch-only、価値と成功条件、取込み時の責任境界が現行 §1〜§13 に維持されている。 |
| `CR-010`〜`CR-012` | Major / Minor | Resolved / 回帰なし | `concept-sheet-review-004`〜`concept-sheet-review-007` | Mnemonic の Core 継続管理、課題・仮定・価値仮説の分離、`Mnemonic → HD Wallet → Software Key → Account` と Core / UI の責任関係が現行本文に維持されている。 |
| `CS-001`〜`CS-003` | Major / Minor | Resolved / 回帰なし | `concept-sheet-review-006`〜`concept-sheet-review-007` | Mnemonic の lifecycle 境界、課題分類および Account / HD Wallet / Software Key の関係について、前回の解消状態からの回帰はない。 |
| `CS-004`〜`CS-005` | Critical | Resolved / 回帰なし | `concept-sheet-review-008`〜`concept-sheet-review-009` | 非専門家を含む読者への製品説明、Mnemonic を含む Security Invariant、通常処理と意図的な秘密情報アクセスの区別、host environment に対する保証限界が現行本文に維持されている。 |

## Required Changes

なし。Concept Review の必須変更対象となる Critical の New / Open / Reopened は確認されなかった。

## Optional Improvements

なし。Major / Minor の formal finding も確認されなかった。§1、§5、§7、§8、§9、§12、§13 では上位の `Desktop / Mobile / Web / Node.js` 表記と、対象を明示する `Browser / Browser Extension / React Native Android / iOS` 表記が併存するが、§5 の定義と各章の文脈から対応関係を追跡でき、現時点で Concept の解釈を妨げる曖昧さとは判定しなかった。

## Resolved Findings

### 過去 finding の回帰確認

| 過去 finding | 今回の確認 |
| --- | --- |
| `CR-001` | §7 の v1 能力、v1 対象外、プロジェクトとして扱わない領域、外部責任および §8 の成功条件が区別されている。回帰なし。 |
| `CR-002` | §1、§7、§9〜§10 に Core、UI / Application、Web / Browser、OS、Network 層、Transaction 構築層および External Signer の高レベルな責任分界がある。回帰なし。 |
| `CR-003` | §2、§4 に Symbol / NEM ウォレット開発者と対象 runtime / platform、主要利用場面がある。RN Android / iOS の追加後も対象ユーザーは変わっていない。回帰なし。 |
| `CR-004`〜`CR-008` | §5〜§8 に秘密鍵処理、鍵管理、署名処理、Signer、Software Key、Watch-only、提供価値および成功条件が維持されている。回帰なし。 |
| `CR-009` | §1、§3、§7〜§8 に取込み時の一時仲介、取込み後の Core 管理および通常処理での秘密情報非返却・非共有が維持されている。回帰なし。 |
| `CR-010` / `CS-001` | §1、§5、§7、§8、§12〜§13 に Mnemonic は生成・復元・取込み後も Core が継続管理する秘密情報であり、Software Key とは別の管理対象であることが維持されている。回帰なし。 |
| `CR-011` / `CS-002` | §2 が利用者の課題、プロジェクト上の仮定、未検証の価値仮説を見出しと記述で分離している。回帰なし。 |
| `CR-012` / `CS-003` | §5 の関係説明、§3・§4・§7 の利用場面と責任境界により、Mnemonic、HD Wallet、Software Key、Account および UI / Application の責任関係を追跡できる。回帰なし。 |
| `CS-004` | §1、§4〜§5、§7 に製品像、主要用語、Core / UI / Application の役割、管理対象および責任外があり、非専門家を含む読者が概念的に理解できる。回帰なし。 |
| `CS-005` | §7 に Mnemonic と Software Key の Security Invariant、取込み時の一時仲介、通常処理での非返却・非共有、runtime / platform 非依存の原則、明示的アクセスとの区別および host environment への保証限界がある。回帰なし。 |

### React Native 追加による semantic regression の有無

なし。変更後も次の意味の連鎖が維持されている。

- React Native Android / iOS は Mobile の具体的な対象として追加され、別の Core や別の製品責任として扱われていない（§1、§5、§7〜§10）。
- Browser と Browser Extension は Web の内訳としてそれぞれ明示され、Browser Extension を単なる別名として扱っていない（§1、§5、§7〜§10）。
- 単一 repository / 単一 npm package と、各 runtime / platform からの共通 Rust Core 利用が維持されている（§1、§7、§8、§12〜§13）。
- React Native 対応後も、暗号処理、Mnemonic、Software Key、署名および秘密情報 lifecycle の責任は Core に残り、Security Invariant の適用対象と公開範囲は変化していない（§1、§3、§7〜§10）。
- UI / Application はユーザー操作、表示、Account 選択および取込み時の一時仲介を担うが、秘密情報の継続的な管理主体にはならない（§1、§3〜§5、§7〜§8）。

## Upstream Feedback

なし。Concept より上流の正式資料または decision の不足・曖昧さ・矛盾を、今回の判定根拠として確認していない。

## Deferred Findings

Formal finding はなし。以下は本文が明示的に Requirements / Design / Specification へ委譲している事項であり、Concept の欠陥としては採用しない。

### FOLLOW-UP FOR REQUIREMENTS

- Node.js、Browser、Browser Extension、React Native Android、React Native iOS（および既存 Concept が対象に含める Desktop）について、v1 で共通に対象とする能力、互換性基準、対象 version および成功条件の確認方法を定める。Browser と Browser Extension、React Native Android と iOS の差異を別の Core としてではなく、同じ Core を利用する platform 境界として扱う。
- 全 runtime / platform で Mnemonic および Software Key に適用する Security Invariant、通常処理での非返却・非共有、意図的な回復・表示・export の扱い、および host environment の侵害に対する保証限界を受入条件へ具体化する。
- 単一 repository `nemnesia/symbol-nem-wallet-core` と単一 npm package `@nemnesia/symbol-nem-wallet-core` から各対象環境で共通利用するという決定済み方針を、要件として追跡可能にする。package resolution、binding、build architecture などの方式はここでは決めない。
- React Native を含む binding 境界での秘密情報の一時的な受渡し、コピー、保持および破棄について、Core の責任と host / application の限界を踏まえた必要な受入条件を定める。具体方式は Design / Specification へ委譲する。

### 後続 Design / Specification への委譲

- 具体的な Binding 方式、runtime / platform 固有差異の隠蔽方法、公開 API の共通化範囲、対象 OS・Browser・version、build / 配布方式。
- 具体的な入力形式、validation、暗号方式、保存形式、メモリ保持・消去方式、認可条件、状態、error および相互運用性検証。

これらは React Native 対応の実装手段を Concept Review で決める要求ではなく、本文 §12〜§13 に従った後工程の検討事項である。

## Scope and Traceability

- 対象境界: `docs/consept/concept-sheet.md` の Concept 本文全体。Symbol / NEM ウォレット開発者向けの Software Key 管理 Core を、Node.js、Browser、Browser Extension、React Native Android / iOS、および既存範囲の Desktop / Mobile / Web から利用する構想を対象とした。
- 今回差分の意味: React Native Android / iOS を Mobile の具体的な対象として明示し、Browser / Browser Extension を Web の具体的な対象として明示し、単一 repository / npm package と共通 Rust Core の方針を追加・反映している。
- 製品責任: Mnemonic と Software Key の継続管理、HD Wallet からの導出、秘密鍵の取込み・生成、Software Key の管理・署名利用、通常処理での秘密情報非返却・非共有および runtime / platform に依存しない公開範囲を Core に集約する。
- 外部責任: UI / Application は Account 選択、公開情報表示、ユーザー操作、ウォレット固有の表示・設定および取込み時の一時仲介を担うが、Mnemonic / Software Key の継続的な保存・管理主体ではない。Web Application / Browser Extension、Node.js Application、host environment、Network 層および Transaction 構築層の固有責任は Core 外である。React Native 専用の秘密情報管理責任は定義されていない。
- Security / Trust Boundary: §7 の Security Invariant が、Mnemonic と Software Key、通常処理、意図的アクセス、runtime / platform 差異および host environment に対する保証限界を定めている。
- 再利用性: MosaicLynx の UI、画面構成、Deep Link、アプリフロー、署名 UX 等の製品固有要件は Concept Sheet に記載されておらず、Wallet Core の reusable library という境界を維持している。
- 過去成果物との追跡: `concept-sheet-review-010.md` の `READY` 判定および `CR-001`〜`CR-012`、`CS-001`〜`CS-005` の解消状態を確認し、現行本文から回帰がないことを確認した。過去 artifact は上書きしていない。
- Concept → Requirements / Design / Specification への委譲: 責任主体、非開示原則、対象 platform、単一 package / 共通 Core 方針および v1 境界は Concept に残され、API、データ形式、暗号、保存、認可、詳細 lifecycle、Binding、version、詳細 UX および受入条件は後工程へ委譲されている。
- Concept フェーズ逸脱: なし。本文は React Native の実装方式を定義せず、package 内部に差異を隠蔽するという高レベル方針に留めている。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | 合格 | §2、§6、§8 が、実行環境ごとの秘密鍵処理の分散、Core への責任集約、共通利用による価値および成功条件を示している。React Native の追加は既存の課題・価値の対象環境を拡張するもので、別の価値提案を発明していない。 |
| 対象ユーザー | 合格 | §4 は引き続き Symbol / NEM ウォレット開発者を対象とし、React Native Android / iOS を既存 Mobile の具体的な利用環境として位置付けている。一般利用者を直接の利用者にする記述もない。 |
| Platform Coverage | 合格 | §1、§5、§7、§8、§9、§12、§13 で Node.js、Browser、Browser Extension、React Native Android / iOS が追跡できる。Browser Extension は Browser（Web Application）と別に明示され、React Native Android / iOS は Mobile の内訳として別 Core を意味しない。 |
| Single Repository / Single npm Package | 合格 | §1 が `nemnesia/symbol-nem-wallet-core` と `@nemnesia/symbol-nem-wallet-core` の単一化、React Native 専用 package を作らない方針を明示し、§7、§8、§12〜§13 と矛盾しない。resolution / packaging implementation の詳細は決めていない。 |
| Shared Rust Core Boundary | 合格 | §1、§3、§7、§8、§10 が、全対象環境で同じ Rust Core を利用し、runtime / platform ごとの別 Wallet Core や React Native 側の暗号・秘密情報管理実装を追加しない責任境界を維持している。 |
| Security Responsibility Boundary | 合格 | §7 の Security Invariant が Mnemonic と Software Key の Core 継続管理、通常処理での非返却・非共有、runtime / platform 非依存および host environment 侵害に対する保証限界を定めている。React Native を理由とする例外はない。 |
| Concept Scope | 合格 | React Native の対象追加は目的・対象環境・上位責任の記述に留まり、JSI、TurboModule、Native Module、Kotlin / Swift / Objective-C++、NDK、artifact、resolver、autolinking、ABI、threading、exact API、architecture、CI / release workflow を決めていない。 |
| Product-specific Leakage | 合格 | MosaicLynx の名前、固有 UI、画面構成、Deep Link、アプリフロー、署名 UX 等はなく、§7 の「特定ウォレットアプリ専用ロジックを扱わない」という reusable library の境界が維持されている。 |
| v1 の境界 | 合格 | §7、§11 が v1 能力、v1 対象外、プロジェクト非対象および将来候補を区別している。React Native Android / iOS は v1 対象へ追加されるが、Hardware Wallet、External Signer、OS-backed Key、Watch-only 等の境界は変わらない。 |
| 既存 Concept との整合性 | 合格 | Core の責務、UI / Application の責任、Mnemonic の継続管理、Software Key / Account の位置付け、Chain / Network の区別、security / portability / interoperability の上位原則および利用者像に回帰はない。 |
| Requirements Leakage | 合格 | 単一 package、共通 Core、platform 非依存の責任という高レベル方針は Concept に適合し、具体的な API、データ形式、暗号、保存、Binding、build、release および acceptance の詳細は §12〜§13 と本 artifact の FOLLOW-UP FOR REQUIREMENTS / 後続委譲へ分離されている。 |
| 成功条件 | 合格 | §8 が全対象環境から同じ Rust Core を利用すること、秘密情報の管理主体・公開範囲を変えないこと、Chain / Network の区別および共通 Software Key を対応付けている。 |
| 成立性 | 合格 | §9〜§10 が portable Core の前提、Web / host environment の保証限界、runtime / platform 差異が増えるリスクおよび後工程での検証を明示している。React Native 追加によるコンセプト自体の成立不能な前提矛盾は確認されない。 |

## Validation Results

- 実施: `agent/react-native-support` の checkout 状態、working tree、HEAD、直近 commit および対象 branch を確認した。
- 実施: `docs/consept/concept-sheet.md` の §1〜§13 全文を確認した。
- 実施: `docs/reviews/concept/` の既存 artifact 一覧を確認し、最大連番 `concept-sheet-review-010.md` の次として本 artifact を作成した。既存 artifact は上書きしていない。
- 実施: `origin/main...HEAD` の Concept Sheet 差分、React Native 追加箇所および既存記述との対応を確認した。
- 実施: `git diff --check`。エラーなし。
- 実施: `git status --short`、working tree / cached 差分のファイル一覧および未追跡ファイルを確認し、レビュー artifact 以外の変更がないことを確認した。
- 未実施: Rust formatter、clippy、cargo test、WASM check、Native / Node / Browser / React Native build、runtime test、release CI。今回の対象は Concept Review の文書のみであり、ユーザー指示および change-aware validation により対象外。
- 未確認: 外部 Node、ネットワーク相互運用、暗号方式、API、データ形式、Binding 実装、platform version の実現可能性および下流成果物の適合性。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 明確さ | 合格 | §1、§5、§7〜§8 に、何を作り、誰が利用し、React Native Android / iOS、Browser、Browser Extension をどの位置付けで含めるかがある。 | なし |
| 課題 | 合格 | §2 が秘密情報処理の分散、実行環境差異、責任境界の不一貫性および放置時の影響を示している。 | なし |
| 対象ユーザーと価値 | 合格 | §4、§6、§8 が Symbol / NEM ウォレット開発者、利用場面、共通 Core と単一 package による再利用価値および成功条件を示している。 | なし |
| v1 の境界 | 合格 | §7、§11 が React Native 対応を v1 対象に含めつつ、v1 対象外、プロジェクト非対象、将来候補および外部責任を区別している。 | なし |
| 責任境界 | 合格 | §1、§3、§5、§7、§9〜§10 に、Rust Core が Mnemonic、Software Key、署名および秘密情報 lifecycle を担い、React Native / UI / Application は別 Core や秘密情報管理主体にならないことがある。 | なし |
| 内部整合性 | 合格 | RN Android / iOS の追加は §1、§5、§7〜§10、§12〜§13 で同じ Core、同じ Security Invariant、同じ reusable library の方針に接続され、既存記述との矛盾がない。 | なし |
| 成立性 | 合格 | §9〜§10 が host environment の侵害を Core の保証外とし、runtime / platform 差異のリスクと後工程での検証を明示している。コンセプトを成立不能にする未解決の前提矛盾は確認されない。 | なし |

全 Gate が合格であり、Skill および過去 artifact の正式運用に従い Review Result は `READY` とする。

## Remaining Risks and Open Decisions

- React Native Android / iOS と Browser / Browser Extension を含む各対象環境の version、互換性基準、v1 機能範囲、受入条件および相互運用性は未決定であり、Requirements 以降で具体化する必要がある。
- Binding 境界での秘密情報のコピー、保持、破棄、意図的な回復・表示・export の認可および受渡しは、Core の Security Invariant と host environment の保証限界を前提に後工程で定める必要がある。
- 単一 npm package から各対象環境で共通利用することは決定済みであり、未決定なのはその resolution、binding、build、配布等の実装方式である。これらを user decision として再審議しない。
- NEEDS USER DECISION: なし。repository 分割、npm package 分割、React Native Android / iOS の対象化、共通 Rust Core の方針はユーザー決定済みとして扱い、JSI / TurboModule / packaging / build architecture も今回の Concept Review では判断要求にしていない。

## Automatic Changes

レビュー中に `docs/consept/concept-sheet.md`、Requirements、Design、Specification、Implementation、テスト、README、設定または過去レビュー artifact は変更していない。レビュー成果物として `docs/reviews/concept/concept-sheet-review-011.md` のみを新規作成した。

## Final Decision

`READY`

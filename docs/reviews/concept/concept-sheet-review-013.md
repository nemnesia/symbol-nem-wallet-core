# Concept Review Findings

## Review Target

- 対象: [`concept-sheet.md`](../../consept/concept-sheet.md)
- 確認日: 2026-09-20（Asia/Tokyo）
- 成果物: `docs/reviews/concept/concept-sheet-review-013.md`
- Review Scope: Concept Sheet 全13章について、課題と価値、対象ユーザー、v1 の境界、責任境界、成功条件、内部整合性および成立性を再確認した。
- 未確認範囲: Requirements、Design、Specification、Implementation の適合性、API、データ形式、暗号方式、Binding、配布物および実機動作。これらを Concept の欠陥を作る根拠には使用していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない3つの独立した自己レビュー・パス。
- Reviewer A（品質と論理）: 完了。背景、課題、目的、価値、成功条件の因果、用語、v1 と将来候補の分離を確認した。
- Reviewer B（課題と価値）: 完了。対象ユーザー、主要利用場面、提供価値、利用者課題・プロジェクト上の仮定・未検証の価値仮説の区別を確認した。
- Reviewer C（境界と成立性）: 完了。Core、UI / Application、ホスト環境、外部層の責任、Security Invariant、対象外、前提およびリスクを確認した。
- Chair 統合: 完了。Concept の成立・解釈・境界に直接影響する候補だけを採用基準に照らし、新規 formal finding は採用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| 主対象 | [`concept-sheet.md`](../../consept/concept-sheet.md) §1〜§13 | 製品目的、課題、対象ユーザー、価値、v1 scope、責任、成功条件、前提、リスク、未決定事項を確認 |
| 直前レビュー | [`concept-sheet-review-012.md`](concept-sheet-review-012.md) | 直前 Gate、過去 finding の集約状態および前回の確認範囲を追跡 |
| 過去レビュー | `concept-sheet-review-001.md`〜`concept-sheet-review-011.md` | `CR-001〜CR-012`、`CS-001〜CS-005` の初出、解消条件および再発対象を追跡 |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、Concept 境界、scope discipline、change-aware validation を確認 |
| Review 手順 | `concept-review` および `review-common` の各手順書 | Reviewer A / B / C、採用基準、Gate、Severity、成果物形式を確認 |
| Phase Context | なし | `AGENTS.md` に Concept の Phase Context 登録がないため使用していない |

## Review Result

`READY`

## Summary

現行 Concept は、Symbol / NEM ウォレット開発者が Desktop、Node.js、Browser / Browser Extension、React Native Android / iOS から共通利用する、単一の Rust 製 Software Key 管理 Core という製品像を一貫して示している。

利用者課題、プロジェクト上の仮定および未検証の価値仮説は区別されている。Mnemonic、HD Wallet、Software Key、Account の関係、Core と UI / Application の責任、取込み時の一時仲介、通常処理での秘密情報非開示、ホスト侵害に対する保証限界も追跡できる。v1、プロジェクト対象外、将来候補および後工程へ委譲する事項に重大な混同はない。

過去の `CR-001〜CR-012` および `CS-001〜CS-005` の再発、新規 Critical / Major / Minor finding、Concept 自体を成立不能にする前提矛盾は確認されなかった。

## Finding Status

Formal findings: なし。

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `CR-001〜CR-012` | 過去の各 Severity | Resolved / 回帰なし | concept-sheet-review-001〜006 | §1〜§8、§11〜§13で、製品像、課題、価値、鍵モデル、v1 境界、責任および引継ぎが維持されている。 |
| `CS-001〜CS-003` | Major / Minor | Resolved / 回帰なし | concept-sheet-review-006〜007 | Mnemonic の継続管理、課題・仮定・価値仮説の分離、`Mnemonic → HD Wallet → Software Key → Account` の関係が維持されている。 |
| `CS-004〜CS-005` | Critical | Resolved / 回帰なし | concept-sheet-review-008〜009 | 平易な製品説明、用語、Security Invariant、通常処理と意図的アクセスの区別、ホスト侵害への保証限界が維持されている。 |

## Required Changes

なし。Critical の New / Open / Reopened は確認されなかった。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened は確認されなかった。

## Resolved Findings

- `CR-001〜CR-009`: v1 能力、対象外、対象ユーザー、用語、鍵管理範囲、価値、成功条件および取込み境界に再発なし。
- `CR-010 / CS-001`: Mnemonic を Software Key と別の Core 管理対象として継続管理する境界に再発なし。
- `CR-011 / CS-002`: 利用者課題、プロジェクト上の仮定、未検証の価値仮説の区別に再発なし。
- `CR-012 / CS-003`: Mnemonic、HD Wallet、Software Key、Account および Core / UI の関係に再発なし。
- `CS-004`: 対象ユーザーが製品目的、価値および責任範囲を追跡できる説明に再発なし。
- `CS-005`: 全 Core 管理下秘密情報に対する Security Invariant と保証限界に再発なし。

## Upstream Feedback

なし。Concept より上流の正式資料または decision はない。

## Deferred Findings

Formal finding はなし。次は Concept が後工程へ明示的に委譲している事項であり、Concept の欠陥ではない。

- 対象プロトコル版、互換性基準、対象 OS / Browser、配布方式。
- Profile、Mnemonic、Software Key の詳細ライフサイクル、保存・保護・消去。
- パスワード安全性、認可条件、意図的な秘密情報アクセスの可否と条件。
- API、データ形式、Binding、暗号方式、保存形式、メモリ保持・消去方式。
- Web および各 runtime での秘密情報の受渡し、コピー、保持、消去の具体方式。

## Scope and Traceability

- Concept の対象は、Software Key を扱う共通 Rust Core と、その製品目的、対象ユーザー、v1 scope および高位の責任境界である。
- Symbol と NEM、Mainnet と Testnet は明示的に区別されている。
- Desktop、Node.js、Browser / Browser Extension、React Native Android / iOS は同じ Core を利用し、runtime / platform 固有差異は後工程へ委譲されている。
- API、wire format、暗号パラメータ、Binding topology、実装可能性は今回の Concept Gate の判定対象外とした。
- Concept が Requirements へ渡す事項は §12〜§13 に明示され、下流詳細から新しい Concept 要求を逆生成していない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | PASS | §2、§6で対象者の課題、原因、影響、価値仮説および提供価値を区別している。 |
| 対象ユーザー | PASS | §4で Symbol / NEM ウォレット開発者と主要利用場面を特定している。 |
| v1 の境界 | PASS | §7、§11で v1、プロジェクト対象外、将来候補を区別している。 |
| 責任 | PASS | §7で Core、UI / Application、ホスト環境および外部層の責任を区別している。 |
| 成功条件 | PASS | §8の6条件が目的、価値および v1 scope に対応している。 |
| 成立性 | PASS | §9〜§10で前提、制約、platform 差異および保証限界を認識し、成立不能な矛盾はない。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 対象確定 | `docs/consept/` の Concept 候補は `concept-sheet.md` 1件であることを確認。 |
| 過去 finding | 直前レビューと過去 finding の集約状態を確認し、現行本文で回帰確認を実施。 |
| 文書構造 | 目的、課題、価値、scope、責任、成功条件、前提、リスク、未決定事項の追跡を確認。 |
| 差分 | レビュー開始時に対象 Concept と既存 Concept review に working tree / staged 差分がないことを確認。 |
| Rust / Binding / WASM / Node test | `NOT APPLICABLE / SKIPPED (docs-only review)`。既存 Implementation との適合確認は依頼範囲外。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 明確さ | PASS | §1、§3、§5、§7で製品像、主要概念、能力、責任を追跡できる。 | なし |
| 課題 | PASS | §2で誰のどの課題をなぜ扱うかを説明している。 | なし |
| 対象ユーザーと価値 | PASS | §4、§6で対象ユーザー、利用場面、価値を説明している。 | なし |
| v1 の境界 | PASS | §7、§11で初期範囲、対象外、将来候補を区別している。 | なし |
| 責任境界 | PASS | §7の Security Invariant と外部責任表で管理主体と保証限界を区別している。 | なし |
| 内部整合性 | PASS | 目的、課題、価値、scope、成功条件に重大な矛盾がない。 | なし |
| 成立性 | PASS | Concept 自体を成立不能にする明白な前提矛盾または外部制約は確認されない。 | なし |

## Remaining Risks and Open Decisions

Concept Gate を止める残存リスクまたは Open Decision はない。§12〜§13の事項は Requirements 以降で具体化し、各工程の Gate で確認する必要がある。

## Automatic Changes

本レビュー成果物のみを新規作成した。Concept、Requirements、Design、Specification、Implementation、テストおよび既存レビュー成果物は変更していない。

## Final Decision

`READY`

現行 Concept は Requirements の再レビューへ進める品質を満たす。

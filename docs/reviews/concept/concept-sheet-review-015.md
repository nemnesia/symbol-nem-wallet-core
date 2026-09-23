# Concept Review 015 — Mobile の v1 対象化

## Review Target

- 対象: [`concept-sheet.md`](../../consept/concept-sheet.md)
- 確認日: 2026-09-23（Asia/Tokyo）
- 成果物: `docs/reviews/concept/concept-sheet-review-015.md`
- レビュー範囲: commit `f98a67f` の親との差分、および差分反映後の Concept 全体について、Mobile（React Native Android / iOS）の v1 対象化、文章整理、課題と価値、対象ユーザー、v1 の境界、責任、成功条件、内部整合性、成立性を確認した。
- 未確認範囲: Requirements、Design、Specification、Implementation の適合性、API、データ形式、暗号方式、Binding の具体方式、配布物、実機動作。これらを Concept の欠陥を作る根拠には使用していない。

## Execution Audit

- Reviewer A（品質と論理）: 自己レビューの独立パスとして、用語、文章の明確さ、背景から価値までの因果、v1 と将来候補、本文内部の整合を確認した。
- Reviewer B（課題と価値）: 自己レビューの独立パスとして、対象ユーザー、主要利用場面、提供価値、成功条件、Mobile を含む対象環境との対応を確認した。
- Reviewer C（境界と成立性）: 自己レビューの独立パスとして、v1 対象、対象外、外部責任、前提、リスク、Mobile を含めた場合の成立性を確認した。
- Chair 統合: 完了。サブエージェントは使用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| ユーザー判断 | 2026-09-23 の明示判断 | Mobile（React Native Android / iOS）を v1 対象とする方針の確認 |
| 主対象 | [`concept-sheet.md`](../../consept/concept-sheet.md) §1〜§13 | 製品目的、課題、対象ユーザー、価値、v1 scope、責任、成功条件、前提、リスク、未決定事項を確認 |
| 対象差分 | commit `f98a67f` とその親の `concept-sheet.md` 差分 | Mobile の v1 対象化と文章整理の変更箇所を確認 |
| 直前レビュー | [`concept-sheet-review-014.md`](concept-sheet-review-014.md) | 変更前の Mobile 対象外判断、直前 Gate、過去 finding の状態を確認 |
| 関連レビュー | [`concept-sheet-review-013.md`](concept-sheet-review-013.md) | Mobile を v1 対象としていた時点の Gate と既存 finding の回帰確認範囲を追跡 |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、Concept 境界、scope discipline、change-aware validation を確認 |
| Review 手順 | `concept-review` および `review-common` の各手順書 | Reviewer A / B / C、採用基準、Gate、Severity、成果物形式を確認 |
| Phase Context | なし | `AGENTS.md` に Concept の Phase Context 登録がないため使用していない |

## Review Result

`READY`

## Summary

更新後の Concept は、Mobile を React Native Android / iOS と定義し、Desktop、Web、Node.js とともに v1 の対象へ一貫して組み込んでいる。対象化は概要、課題、目的、対象ユーザー、主要利用場面、v1 scope、Security Invariant、成功条件、前提、リスク、未決定事項、次工程への引継ぎまで追跡できる。Mobile は対象外や将来候補に残っていない。

単一の Rust Core、単一 npm package、Core による秘密情報の継続管理、通常処理での非開示、UI / Application とホスト環境の責任、Symbol / NEM と Mainnet / Testnet の区別は維持されている。React Native 固有の Binding や保護方式は後工程へ適切に委譲され、Concept が実装詳細を先取りしていない。

文章整理により冒頭の製品像と Mobile / Web の定義が短い段落へ分かれ、変更前より対象範囲を追跡しやすい。過去の `CR-001〜CR-012` および `CS-001〜CS-005` の再発、新規 Critical / Major / Minor finding、Concept 自体を成立不能にする前提矛盾は確認されなかった。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `CR-001〜CR-012` | 過去の各 Severity | Resolved / 回帰なし | concept-sheet-review-001〜006 | §1〜§8、§11〜§13で、製品像、課題、価値、鍵モデル、v1 境界、責任、成功条件、引継ぎが維持されている。 |
| `CS-001〜CS-003` | Major / Minor | Resolved / 回帰なし | concept-sheet-review-006〜007 | Mnemonic の継続管理、課題・仮定・価値仮説の分離、`Mnemonic → HD Wallet → Software Key → Account` の関係が維持されている。 |
| `CS-004〜CS-005` | Critical | Resolved / 回帰なし | concept-sheet-review-008〜009 | 平易な製品説明、用語、Security Invariant、通常処理と意図的アクセスの区別、ホスト侵害への保証限界が維持されている。 |

## Required Changes

なし。Critical の New / Open / Reopened は確認されなかった。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened は確認されなかった。

## Resolved Findings

- `CR-001〜CR-009`: v1 能力、対象外、対象ユーザー、用語、鍵管理範囲、価値、成功条件、取込み境界に再発なし。
- `CR-010 / CS-001`: Mnemonic を Software Key と別の Core 管理対象として継続管理する境界に再発なし。
- `CR-011 / CS-002`: 利用者課題、プロジェクト上の仮定、未検証の価値仮説の区別に再発なし。
- `CR-012 / CS-003`: Mnemonic、HD Wallet、Software Key、Account、Core / UI の関係に再発なし。
- `CS-004`: 対象ユーザーが製品目的、価値、責任範囲を追跡できる説明に再発なし。
- `CS-005`: 全 Core 管理下秘密情報に対する Security Invariant と保証限界に再発なし。

## Upstream Feedback

なし。Concept より上流の正式資料または decision はない。今回の Mobile 対象化はユーザーが明示的に決定している。

## Deferred Findings

Formal finding はなし。次は Concept が後工程へ明示的に委譲している事項であり、Concept の欠陥ではない。

- 対象プロトコル版、互換性基準、対象 OS / Browser / バージョン、配布方式。
- Profile、Mnemonic、Software Key の詳細ライフサイクル、保存・保護・消去。
- パスワード安全性、認可条件、意図的な秘密情報アクセスの可否と条件。
- 単一 npm package から各実行環境で利用するための Binding、公開 API の共通化範囲、runtime / platform 差異の隠蔽方法。
- Web および Mobile を含む各実行環境での秘密情報の受渡し、コピー、保持、消去の具体方式。

## Scope and Traceability

- v1 対象: Desktop、Node.js、Browser / Browser Extension、React Native Android / iOS。
- v1 対象外・将来候補: Hardware Wallet、External Signer、OS-backed Key、Watch-only Account、SNIF、CLI、署名専用アプリ、認証・SSO 向けクライアント。
- 維持する境界: Core の秘密情報管理責任、通常処理での非開示、UI / Application とホスト環境の責任、単一 Rust Core、単一 npm package。
- 下流引継ぎ: 対象環境ごとの Binding、互換性基準、保護方式、配布方式を Requirements 以降で検証可能な形へ具体化する。
- API、wire format、暗号パラメータ、Binding topology、実装可能性は今回の Concept Gate の判定対象外とした。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 課題・価値 | PASS | §2、§6で、Mobile を含む環境ごとの鍵管理分散という課題と、共通 Core へ集約する価値が対応している。 |
| 対象ユーザー | PASS | §4で、Desktop / Mobile / Web / Node.js の Symbol / NEM ウォレット開発者と主要利用場面を特定している。 |
| v1 の境界 | PASS | §1、§5、§7、§11で Mobile の定義、v1 対象、対象外、将来候補を区別している。 |
| 責任 | PASS | §7で、対象環境によらない Core の管理責任、UI / Application の一時仲介、ホスト侵害の保証限界を区別している。 |
| 成功条件 | PASS | §8の6条件が Mobile を含む v1 scope、鍵管理責任、非開示、Chain / Network の区別に対応している。 |
| 成立性 | PASS | §9〜§10で platform 差異と後続検証の必要性を認識しつつ、単一 Rust Core の価値を維持しており、成立不能な矛盾はない。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別レビュー | 品質と論理、課題と価値、境界と成立性の3パスを完了。 |
| 対象差分 | `git diff f98a67f^..f98a67f -- docs/consept/concept-sheet.md` を確認し、Mobile の対象化と文章整理を特定した。 |
| 過去 finding | 直前レビューと関連レビューを確認し、現行本文で回帰確認を実施した。 |
| 文書構造・traceability | 目的、課題、価値、scope、責任、成功条件、前提、リスク、未決定事項、引継ぎの対応を確認した。 |
| Markdown / 相対リンク / 差分 | 18章の構成・順序、成果物の whitespace error、参照先4件の存在、対象 commit 差分の whitespace error がないことを確認した。 |
| Rust / Binding / WASM / Node test | `NOT APPLICABLE / SKIPPED (docs-only review)`。既存 Implementation との適合確認は依頼範囲外。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 明確さ | PASS | §1、§5、§7で製品像、Mobile の定義、主要能力、責任を追跡できる。 | なし |
| 課題 | PASS | §2で、誰のどの課題をなぜ扱うかを Mobile を含む対象環境について説明している。 | なし |
| 対象ユーザーと価値 | PASS | §4、§6で対象ユーザー、利用場面、共通 Core の価値が対応している。 | なし |
| v1 の境界 | PASS | Mobile が v1 対象へ組み込まれ、§7と§11で対象外・将来候補との混同がない。 | なし |
| 責任境界 | PASS | §7のセキュリティ不変条件と外部責任で、Core、Application、ホスト環境の責任を混同していない。 | なし |
| 内部整合性 | PASS | 概要、目的、対象ユーザー、scope、成功条件、前提、リスク、引継ぎが Mobile の v1 対象化について整合する。 | なし |
| 成立性 | PASS | Mobile を含む platform 差異をリスクとして認識し、後工程へ委譲すべき具体方式を分離している。 | なし |

## Remaining Risks and Open Decisions

Concept Gate を止める残存リスクまたは Open Decision はない。Mobile を含む対象環境ごとの Binding、互換性、配布、秘密情報の受渡し・保持・消去は、§12〜§13に従って Requirements 以降で具体化し、各工程の Gate で確認する必要がある。

## Automatic Changes

本レビュー成果物のみを新規作成した。Concept、Requirements、Design、Specification、Implementation、テスト、既存レビュー成果物は変更していない。

## Final Decision

`READY`

更新済み Concept は、Mobile（React Native Android / iOS）を v1 対象とする Requirements の再レビューへ進める品質を満たす。

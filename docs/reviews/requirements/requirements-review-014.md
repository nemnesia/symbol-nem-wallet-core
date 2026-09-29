# Requirements Review 014 — Mobile の v1 対象化

## Review Target

- 対象: [`requirements.md`](../../requirements/requirements.md)
- 確認日: 2026-09-23（Asia/Tokyo）
- 成果物: `docs/reviews/requirements/requirements-review-014.md`
- レビュー範囲: commit `f98a67f` の親との差分、および差分反映後の Requirements 全体について、Mobile（React Native Android / iOS）の v1 対象化、Concept 追跡、対象・責任、MUST / SHOULD、受け入れ条件、セキュリティ、相互運用性、未決定事項、内部整合性を確認した。
- 未確認範囲: Design、Specification、Implementation の適合性、具体的な Binding topology、API、wire format、暗号パラメータ、native artifact、実機性能、release evidence。これらの下流詳細不足を Requirements の欠陥には使用していない。

## Execution Audit

- Reviewer A（明確性と完全性）: 自己レビューの独立パスとして、要求 ID、用語、対象、対象外、責任、MUST / SHOULD、受け入れ条件、内部参照を確認した。
- Reviewer B（利用価値とスコープ）: 自己レビューの独立パスとして、Concept の目的・対象ユーザー・利用場面・v1 境界と、React Native Android / iOS を含む runtime 方針の整合を確認した。
- Reviewer C（Security primary）: 自己レビューの独立パスとして、protected assets、confidentiality、integrity、authentication / authorization、lifecycle、failure safety、responsibility boundary、input boundary、Chain / Network separation を確認した。
- Chair 統合: 完了。サブエージェントは使用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| ユーザー判断 | 2026-09-23 の明示判断 | Mobile（React Native Android / iOS）を v1 対象とする方針の確認 |
| 主対象 | [`requirements.md`](../../requirements/requirements.md) §1〜§13 | 機能・非機能・セキュリティ・データ要求、受け入れ条件、責任、未決定事項を確認 |
| 対象差分 | commit `f98a67f` とその親の `requirements.md` 差分 | Mobile の v1 対象化、要求 ID の復帰、文章整理を確認 |
| 上流 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) | 目的、対象ユーザー、Mobile を含む v1 scope、責任境界、Security Invariant を追跡 |
| 前段レビュー | [`concept-sheet-review-015.md`](../concept/concept-sheet-review-015.md) | Concept Gate `READY`、未解決 Critical なし、Mobile 対象化の整合を確認 |
| 直前レビュー | [`requirements-review-013.md`](requirements-review-013.md) | 変更前 Gate と formal finding がなかったことを確認。Mobile 対象外という当時の前提は今回のユーザー判断と Concept 更新により置き換えられている |
| 関連レビュー | [`requirements-review-012.md`](requirements-review-012.md) | Mobile を v1 対象としていた要求の Gate、`RR-001〜RR-029` と `UF-RN-001` の集約状態を確認 |
| 承認済み判断 | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) | React Native / Android / iOS / architecture / Expo の support baseline が承認済みであることを確認 |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、Requirements 境界、scope discipline、change-aware validation を確認 |
| Review 手順 | `requirements-review` および `review-common` の各手順書 | Reviewer A / B / C、Security checklist、Gate、Severity、成果物形式を確認 |
| Phase Context | なし | `AGENTS.md` に Requirements の Phase Context 登録がないため使用していない |

## Review Result

`READY`

## Summary

更新後の Requirements は、React Native Android / iOS を Desktop、Node.js、Browser / Browser Extension と並ぶ v1 対象として明示し、同じ Rust Wallet Core、単一 repository / npm package、共通の秘密情報管理・認可・非開示方針へ一貫して組み込んでいる。Mobile の対象化は、目的と責任境界から `FR-019`、`NFR-001`、`NFR-004`、`NFR-006〜NFR-015`、`SEC-011`、`SEC-012`、`SEC-017`、`SEC-018`、`SEC-020`、`AC-022`、`AC-051〜AC-061`、未決定事項、下流引継ぎまで追跡できる。

React Native Binding は platform integration と Core invocation の境界であり、暗号処理、鍵導出、署名、Wallet Store、認可、秘密情報ライフサイクルの authority は Rust Core に維持される。unsupported platform、load / invocation failure、security-sensitive operation failure は fail-closed とされ、秘密情報の不要な複製・保持・診断出力、既存 runtime の退行、Symbol / NEM または Mainnet / Testnet の混同も許容していない。

承認済み Platform Baseline と同期 API の compatibility baseline が区別され、性能・responsiveness・resource・cleanup の実測によって async 化または support exclusion が必要になった場合は、対象と影響を記録したうえで新たなユーザー判断を要求する。具体的な API、Binding 実装、artifact、閾値、検証方式は下流へ適切に委譲されている。新規 Critical / Major / Minor finding はなく、過去の `RR-001〜RR-029` と `UF-RN-001` の再発も確認されなかった。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `RR-001〜RR-029` | 過去の各 Severity | Resolved / 回帰なし | requirements-review-001〜010 | Profile / Store、認証、handoff / export / signing、version、failure safety、Core / Binding / Application、runtime 非退行の要求が現行本文に維持されている。 |
| `UF-RN-001` | Upstream Feedback | Resolved / 回帰なし | requirements-review-009〜010 | `NFR-008`、`NFR-015`、`AC-061` に synchronous baseline、React Native の実測 evidence、async 化または support exclusion の user decision 条件が維持されている。 |

## Required Changes

なし。Critical の New / Open / Reopened は確認されなかった。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened は確認されなかった。

## Resolved Findings

- `RR-001〜RR-029`: Profile / Store、秘密情報管理、処理単位の認証、初回 Mnemonic handoff、個別 export、署名承認、削除、version、Chain / Network、Binding 責任、失敗時整合性に再発なし。
- `UF-RN-001`: React Native の synchronous baseline、responsiveness / resource / cleanup evidence、および契約変更時の user decision gate に再発なし。
- requirements-review-013 に formal finding はなかった。同レビューの Mobile 対象外という Review Scope は当時の正式資料に対する判定であり、今回のユーザー判断、更新済み Concept、更新済み Requirements の normative scope を上書きしない。

## Upstream Feedback

なし。更新済み Concept と Concept Review 015 は Mobile（React Native Android / iOS）を v1 対象として一意に定め、Requirements から目的、利用者、scope、責任境界、成功条件を追跡できる。

## Deferred Findings

Formal finding はなし。次は Requirements が後続工程へ明示的に委譲している事項であり、Requirements の欠陥ではない。

- React Native の具体的な Binding topology、値変換、ownership / lifetime、package exports、runtime resolution、native artifact。
- 承認済み Platform Baseline を support matrix、CI、release gate、利用者向け support claim へ反映する具体方式と evidence。
- 高コストとなり得る operation の execution cost、JS blocking、responsiveness、resource、cancellation / interruption、failure cleanup の実測値と判定閾値。
- API、型、error mapping、serialization、Wallet Store format、暗号方式、KDF、salt / nonce、導出規則。
- secret memory の具体的な保持・消去方式と side-channel 検証方式。
- supported browser baseline の製品判断と、それを検証可能にする support matrix / release evidence。

## Scope and Traceability

- Concept §1〜§4、§7〜§10、§13の Mobile を含む製品像は、Requirements §1〜§4、`FR-019`、`NFR-001`、`NFR-004`、`NFR-006〜NFR-015`、`SEC-*`、`AC-022`、`AC-051〜AC-061`、§11〜§12へ追跡できる。
- v1 対象は Desktop、Node.js、Browser / Browser Extension、React Native Android / iOS である。Mobile は独立した consumer target ではなく、React Native Android / iOS の実行環境を指す。
- v1 対象外は Hardware Wallet、External Signer、OS-backed Key、Watch-only、SNIF、CLI、署名専用アプリ、認証・SSO 向けクライアント、Network / Transaction / UI 領域であり、Mobile と混同されていない。
- Core、Binding、Application、利用者、host、Network 層、Transaction 構築層、persistence layer の責任を区別している。
- Symbol / NEM、Mainnet / Testnet、Profile Network / Software Key Chain、protocol / SDK の保証範囲を区別している。
- 下流の実装方式や API 詳細を Requirements の新しい根拠として逆生成していない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 要求の完全性 | PASS | Mobile を含む利用場面、FR / NFR / SEC / DR、AC、失敗時整合性、未決定事項、下流引継ぎが対応している。 |
| 責任・範囲 | PASS | §2、§4、NFR、SECで Core、Binding、Application、利用者、host、Network / Transaction / persistence layer を区別している。 |
| MUST / SHOULD | PASS | Mobile の v1 対象、共通 Core、Binding non-authority、fail-closed、support matrix は MUST、coverage 目標は SHOULD として識別できる。 |
| 受け入れ条件 | PASS | `AC-022`、`AC-051〜AC-061` が Android / iOS の利用可能性、単一 package、API 整合、security boundary、failure、非退行、support matrix、architecture、runtime 分離、性能 evidence を外部から判定可能にする。 |
| Protected assets / confidentiality | PASS | Mnemonic、private key、Profile password、復号後 material、signing authority、暗号化 Store の保護と公開例外を定義し、React Native Binding にも同じ非開示・非保持原則を適用する。 |
| Integrity / failure safety | PASS | tampered / malformed / unsupported Store、認証失敗、Binding load / invocation failure、状態変更失敗を fail-closed・非部分適用として要求する。 |
| Authentication / authorization | PASS | Profile password、利用者意思、signing approval、export confirmation、Application freshness responsibility を分離し、Binding による迂回を禁止する。 |
| Lifecycle / responsibility boundary | PASS | generation、restore、import、derive、use、store、password change、export、delete と、Core / Binding / Application の責任を対象 runtime 共通で定義する。 |
| Input / attacker boundary | PASS | Binding 入力、Store、password、署名対象、Chain / Network の不正・不整合を安全に拒否し、状態変更や秘密情報返却を伴わない要求がある。 |
| 相互運用性 | PASS | Symbol / NEM、Mainnet / Testnet、SDK 基準、BIP-0039、fixture の保証範囲を分離し、React Native 追加による既存 runtime の退行を禁止する。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別レビュー | 明確性と完全性、利用価値とスコープ、Security primary の3パスを完了。 |
| 対象差分 | `git diff f98a67f^..f98a67f -- docs/requirements/requirements.md` を確認し、Mobile の対象化、要求 ID、受け入れ条件、未決定事項、引継ぎの変更を特定した。 |
| 上流 Gate | Concept Review 015 が `READY` で、未解決 Critical がないことを確認した。 |
| 過去 finding | Requirements Review 012〜013を確認し、`RR-001〜RR-029` と `UF-RN-001` の回帰確認を実施した。 |
| 文書構造・traceability | Concept、要求、受け入れ条件、Platform Baseline、下流引継ぎの対応を確認した。 |
| Markdown / 相対リンク / 差分 | 18章の構成・順序、末尾空白がないこと、参照先7件の存在、対象 commit 差分の whitespace error がないこと、Requirements 本文に未コミット差分がないことを確認した。 |
| Rust / Binding / WASM / Node test | `NOT APPLICABLE / SKIPPED (docs-only review)`。既存 Implementation との適合確認は依頼範囲外。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 目的と課題 | PASS | §1、Concept 追跡、UC が Mobile を含む対象環境で共通 Core が必要な目的を説明する。 | なし |
| 利用者と責任 | PASS | §2、§4、NFR、SEC が Wallet 開発者、Core、Binding、Application、host、利用者の責任を区別する。 | なし |
| 対象範囲 | PASS | Mobile を React Native Android / iOS と定義し、Desktop / Node.js / Browser とともに v1 対象へ含め、対象外機能と区別する。 | なし |
| 要件と制約 | PASS | FR / NFR / SEC / DR、Platform Baseline、host guarantee、support matrix、未決定事項、下流委譲を識別できる。 | なし |
| 受け入れ条件 | PASS | Mobile の利用可能性、Core 共用、単一 package、security、failure、compatibility、support matrix、performance evidence に対応する AC がある。 | なし |
| 内部整合性 | PASS | 目的、scope、責任、要求、受け入れ条件、未決定事項、引継ぎが Mobile の v1 対象化について矛盾しない。 | なし |
| 不可欠な前提 | PASS | host compromise の保証限界、Store authority、承認済み Platform Baseline、契約変更の user decision gate を明示する。 | なし |
| コンセプト整合性 | PASS | Concept Review 015 は `READY` であり、Mobile を含む目的、scope、責任、Security Invariant を Requirements が引き継ぐ。 | なし |

## Remaining Risks and Open Decisions

Requirements Gate を止める Open finding はない。supported browser baseline は引き続き製品判断が必要である。React Native の platform support 値は承認済みだが、artifact、実機・simulator matrix、性能 evidence、release verification を下流の正式資料と Gate で確認する必要がある。実測により synchronous public contract を安全に維持できない場合は、Requirements が定める条件に従い async contract または対象 operation の support exclusion を改めてユーザー判断へ戻す。

## Automatic Changes

本レビュー成果物のみを新規作成した。Concept、Requirements、Design、Specification、Implementation、テスト、既存レビュー成果物は変更していない。

## Final Decision

`READY`

更新済み Requirements は、Mobile（React Native Android / iOS）を v1 対象とする Design の再レビューへ進める品質を満たす。

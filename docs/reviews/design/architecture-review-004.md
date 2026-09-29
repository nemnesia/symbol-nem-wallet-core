# Architecture Review 004 — Mobile の v1 対象化

## Review Target

- 対象: [`architecture.md`](../../design/architecture.md)
- 確認日: 2026-09-23（Asia/Tokyo）
- 成果物: `docs/reviews/design/architecture-review-004.md`
- レビュー範囲: commit `f98a67f` の親との差分、および差分反映後の Architecture 全体について、Mobile（React Native Android / iOS）の v1 対象化、文章整理、上流追跡、システムコンテキスト、責務・依存方向、信頼境界、秘密情報の所有とライフサイクル、主要フロー、失敗時の責任、下流引継ぎを確認した。
- 未確認範囲: API、wire format、暗号パラメータ、具体的な ABI / WASM / React Native 実装、native artifact、実機性能、release evidence、テスト実装。指定された関連資料 `docs/design/react-native-design.md` は現行ツリーに存在しないため未確認とし、存在する正本だけを根拠にした。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。
- Reviewer A（構造と責務）: 完了。対象環境、コンポーネント、所有権、依存方向、Core / Binding / Application / Storage の責任を確認した。
- Reviewer B（Security primary）: 完了。保護対象資産、信頼境界、秘密情報の所有とライフサイクル、認証・認可、署名権限、失敗・置換、Binding non-authority を確認した。
- Reviewer C（フローと運用）: 完了。handoff、状態変更、署名、export、再試行・再起動、React Native の初期化・teardown・process-wide coordination を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept / Requirements / Design decision との追跡、Specification への委譲、既存 finding の状態を確認した。
- Chair 統合: 完了。新規 formal finding は採用せず、既存 `DR-RN-005` の解消を確認した。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| ユーザー判断 | 2026-09-23 の明示判断 | Mobile（React Native Android / iOS）を v1 対象とする方針を確認 |
| 主対象 | [`architecture.md`](../../design/architecture.md) §1〜§13 | 責務、依存方向、信頼境界、所有、主要フロー、React Native architecture を確認 |
| 対象差分 | commit `f98a67f` とその親の `architecture.md` 差分 | 日本語表現、用語、図、見出し、開発フェーズ表記の変更を確認 |
| 上流 | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md) | Mobile を含む v1 scope、責任、security property、受け入れ条件を追跡 |
| 前段レビュー | [`concept-sheet-review-015.md`](../concept/concept-sheet-review-015.md)、[`requirements-review-014.md`](../requirements/requirements-review-014.md) | 上流 Gate がともに `READY` で、未解決 Critical がないことを確認 |
| 同一フェーズ | [`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md) | React Native の責任、process-wide coordination、秘密情報境界、失敗時責任の整合を確認 |
| Design decision | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) | `PD-RN-001〜PD-RN-007` の承認済み値と条件付き future decision を確認 |
| 過去レビュー | [`architecture-review-003.md`](architecture-review-003.md)、[`react-native-design-review-004.md`](react-native-design-review-004.md) | `DR-001〜DR-009`、`DR-RN-001〜DR-RN-005` の状態を追跡 |
| 作業指針・手順 | [`AGENTS.md`](../../../AGENTS.md)、`design-review`、`review-common` の各手順書 | フェーズ境界、Security checklist、Gate、成果物形式を確認 |
| Phase Context | なし | `AGENTS.md` に Design の Phase Context 登録がないため使用していない |

## Review Result

`READY`

## Summary

更新後の Architecture は、React Native Android / iOS を Mobile の具体的な v1 実行環境として、Desktop、Web、Node.js と同じ Rust Wallet Core へ接続する構成を明示している。Application / UI → Binding → Core の依存方向、Core の秘密情報・認可・Store validity の責任、Application の利用者意思・current Store 選択の責任、Binding non-authority は全対象環境で一貫している。

React Native についても、private runtime entry、既存 public C ABI の内部再利用、process-wide admission / serialization authority、runtime-local teardown、stale result rejection、package-local artifact、fail-closed routing が同一フェーズの Bindings / Security Design と整合する。Symbol / NEM、Mainnet / Testnet、Profile Network / Software Key Chain の区別、通常処理での秘密情報非開示、処理単位認証、失敗時の既存状態維持も Mobile の追加によって弱められていない。

commit `f98a67f` の Architecture 差分は、開発フェーズを `Design` に統一し、日本語の見出し・用語・文の区切りを整理したもので、責務や外部可視動作を変更していない。過去の `DR-RN-005` が求めた承認済み React Native Platform Baseline との同期は、§12.4、§12.6、§12.7 と関連 Design で確認できる。新規 Critical / Major / Minor finding はない。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `DR-001〜DR-009` | 過去の各 Severity | Resolved / 回帰なし | architecture-review-001〜002 | 責務、依存方向、handoff、export、signing、Store、failure、Chain / Network の設計が維持されている。 |
| `DR-RN-001〜DR-RN-004` | Major | Resolved / 回帰なし | react-native-design-review-001〜003 | 同期実行の evidence gate、process-wide coordination、C ABI reuse、artifact trust chain が維持されている。 |
| `DR-RN-005` | Major | Resolved | react-native-design-review-004 | §12.4、§12.6、§12.7 が `PD-RN-001〜PD-RN-007 = APPROVED` を現行入力として明示し、Browser baseline と negative evidence 後の async / support exclusion を別の未決定レーンとして区別する。 |

## Required Changes

なし。Gate を不合格にする Critical の New / Open / Reopened はない。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened はない。

## Resolved Findings

- `DR-RN-005`: 承認済み React Native version、Android / iOS floor、ABI / architecture、New Architecture、Expo baseline を Architecture の現行入力として識別できる。Browser baseline と、negative responsiveness evidence 後の async contract / operation-specific support exclusion は別の decision lane として区別されている。
- `DR-001〜DR-009`、`DR-RN-001〜DR-RN-004`: 現行 Architecture で解消状態を維持している。

## Upstream Feedback

なし。Concept Review 015 と Requirements Review 014 はともに `READY` であり、Mobile を含む scope、責任、security property、受け入れ条件を Design から一意に追跡できる。

## Deferred Findings

Formal finding はなし。次は Architecture が下流へ明示的に委譲している事項であり、Design の欠陥ではない。

- API、ABI、DTO、wire / Store format、暗号方式、parser、validation、error mapping、memory / zeroization の具体契約。
- React Native の queue / lock / worker / lifecycle hook、package exports、artifact manifest、build / packaging の具体方式。
- Android / iOS の実機・simulator、performance、resource、cancellation / interruption、cleanup、release provenance の evidence。
- negative evidence が確認された場合の async contract または operation-specific React Native support exclusion のユーザー判断。

## Scope and Traceability

- Concept / Requirements の共通 Rust Core、環境共通の秘密情報管理、通常処理での非開示、処理単位認証、handoff / export / signing、Store authority、failure safety、Chain / Network 分離は Architecture §1〜§11へ追跡できる。
- Mobile の v1 対象化は、Architecture §1、§3〜§4、§8〜§9、§11〜§13で React Native Android / iOS として追跡できる。
- Requirements `FR-019`、`NFR-006〜NFR-015`、`SEC-011〜SEC-012`、`AC-051〜AC-061` は、private backend、既存 C ABI reuse、process-wide coordination、artifact trust chain、fail-closed、performance evidence へ接続される。
- `PD-RN-001〜PD-RN-007` の承認済み値は §12.4、§12.6から参照でき、条件付き future decision と混同されていない。
- API、wire format、暗号パラメータ、実装 primitive は下流へ委譲され、Architecture が先取りしていない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| システムコンテキスト / 責務 | PASS | §3〜§4で利用者、Application、Binding、Core、Storage、Transaction / Network、host を区別し、React Native Application / Binding を配置する。 |
| 依存方向 | PASS | §4.5と§12で Application / UI → Binding → Core の一方向と Binding non-authority を定める。 |
| 信頼境界 / 秘密情報の所有 | PASS | §3.1〜§3.3、§5.1で保護対象資産、Core 原本、明示的な外部コピー、host の保証限界を定める。 |
| 認証 / 署名権限 | PASS | §6.3〜§6.5で利用者の承認、Profile password authorization、Core の signing authority を分離する。 |
| 主要フロー / 状態整合性 | PASS | §5.2〜§6で committed / pending / replacement、失敗、再試行、再起動、既存状態維持を定める。 |
| React Native lifecycle / concurrency | PASS | §12.3〜§12.5で process-wide authority、runtime-local teardown、stale completion rejection、artifact failure を一意に扱う。 |
| Chain / Network separation | PASS | §5.1、§7で Profile Network、Software Key Chain、Account、Core validation を区別する。 |
| Security invariant / 下流引継ぎ | PASS | §3.1、§8、§10、§13で環境共通の非開示、fail-closed、Binding non-authority、検証責任を下流へ渡す。 |
| 設計判断の整合 | PASS | §12.4〜§12.7と関連 Design が承認済み Platform Baseline、条件付き future decision、Browser baseline を区別する。 |
| 下流実装可能性 | PASS | 責任・所有・信頼境界・lifecycle・failure invariant を固定し、具体方式を下流へ委譲する。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別レビュー | 構造と責務、Security primary、フローと運用、追跡と下流実装可能性の4パスを完了。 |
| 対象差分 | `git diff f98a67f^ f98a67f -- docs/design/architecture.md` を確認し、文章・用語・図・見出し・フェーズ表記の変更を特定した。 |
| 上流 Gate | Concept Review 015 / Requirements Review 014 がともに `READY` で、未解決 Critical がないことを確認した。 |
| 過去 finding | Architecture Review 003 / React Native Design Review 004を確認し、`DR-001〜DR-009`、`DR-RN-001〜DR-RN-005` の状態を現行本文で再確認した。 |
| 文書間整合 | Architecture、Bindings、Security、React Native Platform Baseline の責任・platform status・未決定レーンを照合した。 |
| Markdown / 相対リンク / 差分 | 共通形式の18章が揃っていること、末尾空白がないこと、レビュー成果物内の相対リンク先が存在すること、正式資料に未コミット差分を加えていないことを確認した。 |
| Rust / Binding / WASM / Node test | `NOT APPLICABLE / SKIPPED (docs-only review)`。既存 Implementation との適合確認は依頼範囲外。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 目的と範囲 | PASS | §1〜§2で Mobile を含む対象、対象外、上流・下流境界を定める。 | なし |
| コンテキストと責任 | PASS | §3〜§4で主体、信頼境界、Core / Binding / Application の責任を定める。 | なし |
| 依存方向 | PASS | §4.5、§12.1〜§12.3で一方向依存と process-wide authority を定める。 | なし |
| 主要フロー | PASS | §6、§12.3〜§12.5で正常・失敗・再試行・再起動・teardown を定める。 | なし |
| データ所有 | PASS | §5、§12.3〜§12.5で secret、Store、pending / replacement、RN temporary / resource の owner を定める。 | なし |
| セキュリティと相互運用性 | PASS | secret lifecycle、authorization、fail-closed、Chain / Network、Binding boundary を全対象環境で維持する。 | なし |
| 上流整合性 | PASS | Concept / Requirements の Mobile を含む v1 scope、責任、security property と重大な矛盾がない。 | なし |
| 下流実装可能性 | PASS | 責任・invariant・承認済み support baseline を、具体方式と区別して引き渡せる。 | なし |

## Remaining Risks and Open Decisions

- Design Gate を止める Open finding はない。
- supported browser baseline は React Native Platform Baseline とは別の product decision として未決定である。
- React Native の runtime / artifact / performance / resource / cleanup / release evidence は下流で未検証である。
- negative evidence が生じた場合の async contract または operation-specific React Native support exclusion は、現時点では決定せず、改めてユーザー判断へ戻す。
- 指定された `docs/design/react-native-design.md` は存在しない。現行の React Native Design は `architecture.md`、`bindings.md`、`security.md` の各§12と承認済み Platform Baseline に分散して記録されている。

## Automatic Changes

本レビュー成果物のみを新規作成した。Architecture、関連 Design、Requirements、Specification、Implementation、テストおよび既存レビュー成果物は変更していない。

## Final Decision

`READY`

Critical は0件。Mobile（React Native Android / iOS）を v1 対象とする Architecture は、関連 Design / Platform Baseline の責任と状態を保ったまま Specification の再レビューへ進める。

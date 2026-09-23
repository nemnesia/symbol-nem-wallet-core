# Bindings Design Review 004 — Mobile の v1 対象化

## Review Target

- 対象: [`bindings.md`](../../design/bindings.md)
- 確認日: 2026-09-23（Asia/Tokyo）
- 成果物: `docs/reviews/design/bindings-review-004.md`
- レビュー範囲: commit `f98a67f` の親との差分、および差分反映後の Bindings Design 全体について、Mobile（React Native Android / iOS）の v1 対象化、Core / Native C ABI / Node-API / WASM / React Native / Application の責任、依存方向、信頼境界、秘密情報の所有とライフサイクル、runtime 分離、Native 成果物、失敗時責任、下流への引継ぎを確認した。
- 未確認範囲: API / ABI / DTO / wire format、pointer / free、暗号パラメータ、メモリ消去の実装、Native 成果物の build、実機 runtime、性能実測、Specification / Implementation の適合性。関連資料として指定された `docs/design/react-native-design.md` はリポジトリ内に存在しないため確認できなかったが、React Native の現行設計は `bindings.md` §12、`architecture.md` §12、`security.md` §12、承認済み platform baseline から確認した。

## Execution Audit

- Reviewer A（構造と責務）: 自己レビューの独立パスとして、対象範囲、コンポーネント責務、依存方向、runtime 分離、C ABI の内部再利用を確認した。
- Reviewer B（Security primary）: 自己レビューの独立パスとして、保護対象資産、信頼境界、secret ownership / lifecycle、authorization、signing authority、失敗時責任、Binding non-authority を確認した。
- Reviewer C（フローと運用）: 自己レビューの独立パスとして、handoff、export、signing、Store replacement、retry / restart、RN initialization / teardown、process-wide coordination、artifact trust chain を確認した。
- Reviewer D（追跡と下流実装可能性）: 自己レビューの独立パスとして、Concept / Requirements、Architecture / Security Design、承認済み platform baseline、過去 finding、Specification / Implementation への委譲を確認した。
- Chair 統合: 完了。サブエージェントは使用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| ユーザー判断 | 2026-09-23 の明示判断 | Mobile（React Native Android / iOS）を v1 対象とする方針の確認 |
| 主対象 | [`bindings.md`](../../design/bindings.md) §1〜§13 | Binding の責任、境界、所有、主要フロー、RN 設計、下流委譲を確認 |
| 対象差分 | commit `f98a67f` とその親の `bindings.md` 差分 | Mobile の v1 対象化に伴う表現・範囲・共通保証・platform status の整合を確認 |
| 上流 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) | Mobile を含む v1 scope、Core の継続 ownership、通常処理での秘密情報非開示を追跡 |
| 上流 Requirements | [`requirements.md`](../../requirements/requirements.md) | React Native Binding、共通 Core、fail-closed、support / performance evidence、受け入れ条件を追跡 |
| 上流レビュー | [`concept-sheet-review-015.md`](../concept/concept-sheet-review-015.md)、[`requirements-review-014.md`](../requirements/requirements-review-014.md) | Concept / Requirements Gate がともに `READY`、未解決 Critical がないことを確認 |
| 同一 Design | [`architecture.md`](../../design/architecture.md)、[`security.md`](../../design/security.md) | Core / Binding / Application、RN runtime、秘密情報、process-wide coordination、artifact の責任整合を確認 |
| 承認済み判断 | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) | `PD-RN-001〜PD-RN-007` の `APPROVED` 値と条件付き判断を確認 |
| 直前レビュー | [`bindings-review-003.md`](bindings-review-003.md) | `DR-RN-005` の Open 条件、および過去 finding の状態を確認 |
| 作業指針・手順 | [`AGENTS.md`](../../../AGENTS.md)、`design-review`、`review-common` の各手順書 | Design 境界、Reviewer A〜D、Security checklist、Gate、成果物形式、docs-only validation を確認 |
| Phase Context | なし | `AGENTS.md` に Design の Phase Context 登録がないため使用していない |

## Review Result

`READY`

## Summary

更新後の Bindings Design は、React Native Android / iOS を Desktop、Node.js、Web / Browser Extension と並ぶ v1 実行環境として明示し、Application / UI → runtime-specific Binding → Rust Wallet Core の依存方向へ一貫して配置している。Binding は値・表現・所有権・ライフサイクル・エラーの仲介に限定され、暗号、Profile password 認可、署名権限、Store の内部意味、Chain / Network policy、利用者意思の authority を持たない。

RN 経路は、共通 TypeScript facade、private runtime entry、JSI / TurboModule adapter、Android / iOS Native 層、既存 C ABI contract、Rust Core の順に分離されている。Node addon / WASM への silent fallback を禁止し、process-wide coordination、runtime-local lifecycle、operation-local secret mediation、artifact trust chain、unsupported platform の明示的失敗を設計上の責任としている。Mobile の追加によって Core の secret ownership、操作単位の認可、通常処理での非開示、Store の opaque boundary、Symbol / NEM および Mainnet / Testnet の分離は弱められていない。

前回 Open Major の `DR-RN-005` は解消された。現行本文は `PD-RN-001〜PD-RN-007` の承認済み値を normative baseline として明示し、候補表を履歴的・非規範的な比較、Browser baseline を別の未決定事項、negative evidence 後の async 化または support exclusion を条件付き future decision として区別している。Critical / Major / Minor の New / Open / Reopened はなく、Design Gate は `READY` である。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `DR-001〜DR-006` | 過去の Major / Minor | Resolved / 回帰なし | bindings-review-001〜002 | 正本、Binding non-authority、全環境共通保証、Native 境界の安全側責任、phase boundary、Browser Extension 責任が維持されている。 |
| `DR-RN-001〜DR-RN-004` | Major | Resolved / 回帰なし | react-native-design-review-001〜003 | 同期実行の evidence gate、process-wide coordination、C ABI の内部再利用、artifact trust chain が維持されている。 |
| `DR-RN-005` | Major | Resolved | react-native-design-review-004 / bindings-review-003 | §12.2、§12.6〜§12.7、§12.13、DDR-RN-001 / 007 / 008、§13が承認済み baseline、unsupported 範囲、履歴的比較、条件付き future decision を一意に区別している。 |

## Required Changes

なし。Critical の New / Open / Reopened は確認されなかった。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened は確認されなかった。

## Resolved Findings

### DR-RN-005 — 承認済み RN platform baseline と Bindings Design の status を同期する

- 対象箇所: `bindings.md` §12.2、§12.6〜§12.7、§12.13、DDR-RN-001、DDR-RN-007、DDR-RN-008、§13。
- 確認事実: `PD-RN-001〜PD-RN-007` の承認済み値が、RN `0.86.x / 0.87.x`、Android `minSdk = 24` と formal ABI、Bare / Expo の iOS floor、arm64 device / simulator、New Architecture mandatory、Expo の formal / unsupported 範囲として本文へ反映されている。候補表は「履歴的・非規範的な比較」と明記されている。
- 既存の根拠: `react-native-platform-baseline.md` §11、§16、§18、および Requirements `NFR-006〜NFR-015`、`AC-051〜AC-061`。
- 解消内容: 現行 baseline、unsupported 範囲、過去の比較、Browser baseline、negative evidence 後の conditional decision が別の status として追跡できる。
- 影響確認: Specification / Implementation / release verification は、候補から値を再推論せず、承認済み baseline を直接利用できる。
- 完了条件または再確認方法: `bindings.md` 単独で approved / unsupported / historical / conditionally deferred を識別でき、platform decision record と値・status が一致することを確認した。

過去の `DR-001〜DR-006` と `DR-RN-001〜DR-RN-004` にも回帰は確認されなかった。

## Upstream Feedback

なし。更新済み Concept / Requirements は Mobile を v1 対象として一意に定め、Binding Design が必要とする scope、責任、security property、受け入れ条件を提供している。

## Deferred Findings

Formal finding はなし。次は Design から下流へ明示的に委譲されており、Design の欠陥ではない。

- API / ABI / DTO、request / result / warning / error、package exports、resolver condition、TurboModule / Codegen / JSI / JNI / Swift / Objective-C++ の具体契約。
- pointer / length / alias / free、allocator、copy、zeroization、thread primitive、reentrancy guard、buffer lifecycle の実装。
- Native 成果物の layout、manifest、digest / provenance、build、CI、release workflow、実機 load / invoke / cleanup evidence。
- representative device と production-equivalent build による同期 API の responsiveness、resource、cancellation / interruption、failure cleanup の実測。
- negative evidence が発生した場合の operation-specific async contract または RN support exclusion のユーザー判断。

## Scope and Traceability

- v1 対象: Desktop、Node.js、Web / Browser Extension、React Native Android / iOS。Mobile は React Native Android / iOS の実行環境を指す。
- 依存方向: Application / UI → Native C ABI、Node-API、Web / WASM または React Native Binding → Rust Wallet Core。
- Core の責任: secret ownership、操作単位の認可、暗号・導出・署名、Store validity / version、Chain / Network compatibility、成功状態の確定。
- Binding の責任: 表現・型・opaque data・所有権・ライフサイクル・エラーの仲介、境界で検出可能な失敗の fail-closed、Core の意味を変更しない transport。
- Application の責任: 利用者への表示・確認・承認、Account 選択、current Store の選択・保存・replacement、Core 外へ渡った secret copy の保護。
- RN 固有の責任: private runtime routing、New Architecture / TurboModule registration、private JSI transport、薄い platform layer、C ABI の内部再利用、process-wide coordination、approved artifact の package / load / link boundary。
- 下流引継ぎ: Design は authority、ownership、trust boundary、failure responsibility、support baseline を確定し、具体 API、ABI、memory、artifact、test / release evidence を Specification / Implementation / release verification へ委譲している。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| システムコンテキスト | PASS | §3、§12.1で利用者、Application、runtime-specific Binding、Native 層、C ABI、Core、host を配置している。 |
| 責務・依存方向 | PASS | §4、§12.1〜§12.2で Application → Binding → Core と Binding non-authority を維持している。 |
| 信頼境界 | PASS | §3.2、§8、§12.14で全 runtime 共通の保証、host compromise の限界、境界入力の fail-closed を区別している。 |
| Secret ownership / lifecycle | PASS | §5〜§6、§12.8〜§12.11で Core 原本、一時 mediation、明示的な外部 copy、non-retention、failure cleanup を区別している。 |
| Authentication / signing authority | PASS | §3.1、§6.2〜§6.5で Application の意思確認、Core の operation authorization、Core の signing authority、Binding の非権限性を分離している。 |
| Failure / state consistency | PASS | §6.6、§8、§12.5〜§12.12で pending 非昇格、既存状態保護、no fallback、stale result rejection、teardown barrier を定める。 |
| Runtime / package 分離 | PASS | §12.4〜§12.5で Node、Browser / Extension、RN の private backend を分け、誤判定・public selector・silent fallback を禁止している。 |
| Symbol / NEM、Network | PASS | §7で Symbol / NEM、Mainnet / Testnet、Profile Network、Software Key Chain の判断を Core に残し、Binding の補正を禁止している。 |
| Platform baseline | PASS | §12.2、§12.6〜§12.7、§12.13、DDR-RN-001 / 007 / 008、§13で承認済み値と各 status を一意に追跡できる。 |
| 下流実装可能性 | PASS | §10〜§12.17で設計上の責任・不変条件と、仕様・実装・リリース検証へ委譲する詳細を分離している。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別レビュー | 構造と責務、Security primary、フローと運用、追跡と下流実装可能性の4パスを完了。 |
| 対象差分 | `git diff f98a67f^..f98a67f -- docs/design/bindings.md` を確認し、Mobile の v1 対象化に関わる用語・範囲・status の変更を特定した。 |
| 上流 Gate | Concept Review 015、Requirements Review 014 がともに `READY` で、未解決 Critical がないことを確認した。 |
| 過去 finding | `bindings-review-001〜003` と関連 RN review の状態を確認し、`DR-RN-005` の解消とその他 finding の回帰なしを確認した。 |
| 文書間整合性 | `architecture.md`、`security.md`、`react-native-platform-baseline.md` と責任、秘密情報境界、runtime 方針、platform 値を照合した。 |
| Markdown / 相対リンク / 差分 | 18章の構成・順序、成果物と対象差分の whitespace error、成果物内の相対リンク先、対象ファイルに未コミット差分がないことを確認した。 |
| 指定関連資料 | `docs/design/react-native-design.md` は存在せず未確認。現行 RN 設計の正本は、確認できた `bindings.md`、`architecture.md`、`security.md` および承認済み platform baseline として扱った。 |
| Rust / Binding / WASM / Node test | `NOT APPLICABLE / SKIPPED (docs-only review)`。既存 Implementation との適合確認は依頼範囲外。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 目的と範囲 | PASS | §1〜§2で React Native Android / iOS を含む対象、対象外、正本、下流境界を定める。 | なし |
| コンテキストと責任 | PASS | §3〜§5、§12.1で Application、Binding、Native 層、C ABI、Core、host の責任と秘密情報境界を定める。 | なし |
| 依存方向 | PASS | Application / UI → runtime-specific Binding → Core を維持し、authority の逆流・循環を導入していない。 | なし |
| 主要フロー | PASS | §6、§12.3、§12.6〜§12.12で認証、handoff、export、signing、failure、初期化、teardown、coordination を定める。 | なし |
| データ所有 | PASS | §5、§12.8〜§12.11で secret、Store、pending / replacement、buffer、Native resource の owner と保持範囲を区別する。 | なし |
| セキュリティと相互運用性 | PASS | Core authority、non-disclosure、per-operation authorization、fail-closed、Chain / Network、runtime 分離を維持する。 | なし |
| 上流整合性 | PASS | Concept / Requirements の Mobile v1 scope、Architecture / Security Design、承認済み platform baseline と重大な矛盾がない。 | `DR-RN-005`（Resolved） |
| 下流実装可能性 | PASS | 承認済み support baseline、責任、不変条件、委譲先を推測なしに追跡できる。 | `DR-RN-005`（Resolved） |

## Remaining Risks and Open Decisions

Design Gate を止める Open finding はない。Browser baseline は RN platform decision と別の product policy として未決定である。同期 baseline が成立しない negative evidence が得られた場合の async contract または operation-specific RN support exclusion も条件付き future decision であり、現時点では未決定のままが正しい。実機 runtime、Native 成果物、性能、メモリ、release evidence は下流で検証する必要がある。

指定された `docs/design/react-native-design.md` は存在しないため、その文書名に対応する独立資料は確認できなかった。ただし、RN の責務・境界・platform baseline は現行の複数の正式資料から一意に確認でき、この欠落は `bindings.md` の Design Gate を妨げない。

## Automatic Changes

本レビュー成果物のみを新規作成した。Concept、Requirements、Design、Specification、Implementation、テスト、README、既存レビュー成果物は変更していない。

## Final Decision

`READY`

Critical は0件で、`DR-RN-005` は `Resolved`。更新済み Bindings Design は、Mobile（React Native Android / iOS）を v1 対象とする Specification の確認へ進める品質を満たす。

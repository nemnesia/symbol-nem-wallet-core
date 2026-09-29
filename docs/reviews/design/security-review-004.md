# Security Design Review 004 — Mobile の v1 対象化

## Review Target

- 対象: [`security.md`](../../design/security.md)
- 確認日: 2026-09-23（Asia/Tokyo）
- 成果物: `docs/reviews/design/security-review-004.md`
- レビュー範囲: commit `f98a67f` の親との差分と、差分反映後の Security Design 全体について、Mobile（React Native Android / iOS）の v1 対象化、保護対象資産、信頼境界、秘密情報の所有・ライフサイクル、認証・認可、署名権限、失敗時責任、React Native 境界、セキュリティ不変条件、下流への引継ぎを確認した。
- 未確認範囲: 暗号方式・パラメータ、API / ABI / wire format、具体的な memory / zeroization / unsafe、parser、Native 成果物の build、実機性能、release evidence、Specification / Implementation / test の適合性。指定された `docs/design/react-native-design.md` はリポジトリに存在しないため未確認とし、現行の React Native 設計が統合されている `architecture.md`、`bindings.md`、`security.md` と承認済み Platform Baseline を確認した。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。
- Reviewer A（構造と責務）: 完了。目的、対象、主体、依存方向、Core / Binding / Application / host の責任と信頼境界を確認した。
- Reviewer B（Security primary）: 完了。Mnemonic、Software Key private key、derived / decrypted secret、Profile password、Wallet Store、signing authority、pending state の ownership、lifecycle、公開例外、認可、失敗時保護を確認した。
- Reviewer C（フローと運用）: 完了。handoff、import、derivation、export、signing、replacement、deletion、retry、restart、React Native の initialization / teardown / stale completion を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept / Requirements、Architecture / Bindings、Platform Baseline、Specification / Implementation への引継ぎを確認した。
- Chair 統合: 完了。新規 formal finding は採用していない。

## Evidence Used

| 種別 | 資料 | 用途 |
| --- | --- | --- |
| ユーザー判断 | 2026-09-23 の明示判断 | Mobile（React Native Android / iOS）を v1 対象とする方針を確認 |
| 主対象 | [`security.md`](../../design/security.md) §1〜§13 | security responsibility、ownership、trust boundary、failure model、React Native 境界を確認 |
| 対象差分 | commit `f98a67f` とその親の `security.md` 差分 | 日本語表現、フェーズ表記、信頼境界・責任の明確化による意味の維持を確認 |
| 上流 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) | Mobile を含む v1 scope、Core の継続管理、通常処理での非開示、host の保証限界を追跡 |
| 上流 Requirements | [`requirements.md`](../../requirements/requirements.md) | protected assets、処理単位認証、Binding non-authority、fail-closed、React Native の受け入れ条件を追跡 |
| 前段レビュー | [`concept-sheet-review-015.md`](../concept/concept-sheet-review-015.md)、[`requirements-review-014.md`](../requirements/requirements-review-014.md) | 上流 Gate がともに `READY` で、未解決 Critical がないことを確認 |
| 同一 Design | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md) | actor、authority、process-wide coordination、artifact trust chain、下流委譲との整合を確認 |
| 同一 Design レビュー | [`architecture-review-004.md`](architecture-review-004.md)、[`bindings-review-004.md`](bindings-review-004.md) | Mobile の v1 対象化と `DR-RN-005` の解消状態を関連 Design の履歴として確認 |
| 承認済み判断 | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) | `PD-RN-001〜PD-RN-007` の承認済み値と条件付き future decision を確認 |
| 過去レビュー | [`security-review-003.md`](security-review-003.md) | `DR-001〜DR-012` の解消状態と回帰確認の基準 |
| 作業指針・手順 | [`AGENTS.md`](../../../AGENTS.md)、`design-review`、`review-common` の各手順書 | フェーズ境界、Security checklist、Gate、成果物形式、docs-only validation を確認 |
| Phase Context | なし | `AGENTS.md` に Design の Phase Context 登録がないため使用していない |

## Review Result

`READY`

## Summary

更新後の Security Design は、React Native Android / iOS を Desktop、Web、Node.js と同じ v1 の責任体系へ組み込み、Core の継続的な secret ownership、処理単位認証、通常処理での非開示、Binding non-authority、host compromise の保証限界を全環境で共通に維持している。

React Native 固有の JS / Native / C ABI / Core 境界では、秘密情報を operation-local に仲介し、Binding や coordinator が secret owner、authorization authority、Store authority にならない。resolver、artifact、ABI / slice、initialization、invocation、output、lifecycle の失敗は no-fallback で安全側に扱われ、partial result、継続 authorization、secret cache、stale completion を成功状態へ昇格させない。

commit `f98a67f` による変更は、用語・見出し・文章を日本語で明確にし、フェーズ表記を `Concept → Requirements → Design → Specification → Implementation` に統一するものが中心である。保護対象資産、秘密情報の許可された流れ、署名権限、Chain / Network 分離、失敗時保護および下流への引継ぎの意味を弱める変更はない。`DR-001〜DR-012` の再発、新規 Critical / Major / Minor finding は確認されなかった。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `DR-001〜DR-012` | Major / Minor | Resolved / 回帰なし | security-review-001〜002 | 正本の依存方向、protected assets、全環境の信頼境界、処理単位認証、handoff / export / signing、Store / failure、Chain / Network、side-channel / memory の Design 境界が現行本文に維持されている。 |

新規、Open、Reopened の Security Design finding はない。

## Required Changes

なし。Critical の New / Open / Reopened は確認されなかった。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened は確認されなかった。

## Resolved Findings

- `DR-001〜DR-010`: normative dependency、protected assets、全環境の trust boundary、per-operation authentication、handoff、export、signing、Store、failure、Chain / Network の解消状態を維持している。
- `DR-011〜DR-012`: side-channel / constant-time と secret lifetime / zeroization の Design invariant が具体的な実装方式から分離され、下流へ引き継がれている。
- 関連 Design の `DR-RN-005`: 承認済み Platform Baseline が Architecture / Bindings に反映され、Security Design §12 の artifact、lifecycle、no-fallback、Core authority と矛盾しない。

## Upstream Feedback

なし。Concept Review 015 と Requirements Review 014 はともに `READY` であり、Mobile を含む対象範囲、protected assets、Core / Binding / Application の責任、security property、受け入れ条件を Security Design から一意に追跡できる。

## Deferred Findings

Formal finding はなし。次は Security Design が下流へ明示的に委譲している事項であり、Design の欠陥ではない。

- API / ABI / DTO / wire / error、暗号方式・パラメータ、derivation / signing byte contract。
- exact buffer、copy、allocator、pointer、free、memory layout、zeroization、unsafe / FFI safety。
- parser、resource limit、side-channel 実装、test / fuzz / fixture、artifact build / provenance / release verification。
- React Native の実 runtime、device / simulator、blocking、resource、cancellation / interruption、failure cleanup の実証。
- negative evidence が発生した場合の operation-specific async contract または React Native support exclusion のユーザー判断。

## Scope and Traceability

- v1 対象は Desktop、Node.js、Web / Browser Extension、React Native Android / iOS であり、Mobile は React Native Android / iOS の実行環境を指す。
- Concept / Requirements の Core 継続 ownership、通常処理での非開示、処理単位認証、handoff / export / signing、Store / failure、Chain / Network は Security Design §3〜§11へ追跡できる。
- React Native の v1 scope、Binding non-authority、secret flow、artifact / runtime failure、process-wide coordination、host limitation は §12〜§13へ追跡できる。
- Architecture の owner、信頼境界、lifecycle、failure responsibility は Security Design が詳細化し、上書きしていない。
- Bindings の transport / conversion / lifecycle、private backend、artifact、coordination の責任は Security Design と同じ Core authority と fail-closed invariant を維持する。
- API、wire format、暗号パラメータ、実装 primitive は下流へ委譲され、Security Design から新しい外部契約を発明していない。

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| Protected assets / ownership | PASS | §5.1で Mnemonic、Software Key、derived / decrypted secret、password、temporary secret、Store、signing authority、pending state の owner、公開例外、failure、終了責任を定める。 |
| Trust boundaries | PASS | §3〜§4、§12.1で利用者、Application、Binding、Android / iOS Native 層、C ABI、Core、storage、Transaction / Network、host を区別する。 |
| Secret lifecycle | PASS | §5〜§6、§12.2〜§12.5で generation、restore、import、derivation、use、signing、replacement、deletion、failure / restart の責任を接続する。 |
| Authentication / authorization | PASS | §6.1で Core の処理単位認証、Application の fresh assertion、Binding の authorization cache 禁止を区別する。 |
| Signing authority | PASS | §6.4で Account 選択と利用者承認を Application、compatibility と signing primitive を Core に分離する。 |
| Failure / state consistency | PASS | §6.5〜§6.6、§12.3〜§12.5で fail-closed、既存状態保護、pending 非昇格、no fallback、stale result cleanup を定める。 |
| React Native boundary | PASS | §12で operation-local mediation、Native 層の非権限性、artifact trust chain、process-wide coordination、runtime-local teardown を定める。 |
| Attacker-controlled input | PASS | Store、DTO / bytes、detached / altered buffer、unexpected object、artifact mismatch を trust transition 前に安全側へ扱う責任を配置する。 |
| Chain / Network separation | PASS | §6.4、§7で Profile Network、Software Key Chain、Account、Core reject を区別し、Binding の補正を禁止する。 |
| Security invariants / handoff | PASS | §3.2、§8〜§10、§13で非開示、Core authority、failure safety、guarantee boundary と下流検証責任を一意に渡す。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| 観点別レビュー | 構造と責務、Security primary、フローと運用、追跡と下流実装可能性の4パスを完了。 |
| 対象差分 | `git diff f98a67f^..f98a67f -- docs/design/security.md` を確認し、文章・用語・見出し・フェーズ表記の変更を特定した。 |
| 上流 Gate | Concept Review 015 / Requirements Review 014 がともに `READY` で、未解決 Critical がないことを確認した。 |
| 過去 finding | Security Review 001〜003を確認し、`DR-001〜DR-012` の回帰確認を実施した。 |
| 文書間整合 | Architecture、Bindings、Platform Baseline と authority、secret flow、lifecycle、artifact / failure boundary を照合した。 |
| Rust / Binding / WASM / Node test | `NOT APPLICABLE / SKIPPED (docs-only review)`。既存 Implementation との適合確認は依頼範囲外。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 目的と範囲 | PASS | §1〜§2で Mobile を含む対象、対象外、上流・下流境界を定める。 | なし |
| コンテキストと責任 | PASS | §3〜§4、§12.1で主体、信頼境界、secret authority、failure responsibility を定める。 | なし |
| 依存方向 | PASS | Application / UI → Binding → Core と Architecture 非上書きを定め、責任の逆流がない。 | なし |
| 主要フロー | PASS | §6、§12で正常・失敗・retry / restart / cancellation / teardown を定める。 | なし |
| データ所有 | PASS | §5、§12.2〜§12.5で secret、Store、signing authority、pending、RN temporary / resource の owner を定める。 | なし |
| セキュリティと相互運用性 | PASS | non-disclosure、authorization、fail-closed、Chain / Network、Core / Binding / RN 境界を維持する。 | なし |
| 上流整合性 | PASS | Concept / Requirements の Mobile を含む v1 scope、責任、security property と重大な矛盾がない。 | なし |
| 下流実装可能性 | PASS | security invariant と責任を固定し、具体契約・実装・検証を下流へ委譲する。 | なし |

## Remaining Risks and Open Decisions

- Security Design Gate を止める Open finding はない。
- React Native の runtime、Native 成果物、memory、performance、resource、cleanup、side-channel および release evidence は下流で未検証である。
- 同期 baseline が成立しない negative evidence が得られた場合の async contract または operation-specific React Native support exclusion は、現時点では決定せず、改めてユーザー判断へ戻す。
- `docs/design/react-native-design.md` という独立文書は存在しない。React Native の現行設計は `architecture.md`、`bindings.md`、`security.md` と承認済み Platform Baseline に分散して記録されている。

## Automatic Changes

本レビュー成果物のみを新規作成した。Security Design、関連 Design、Requirements、Specification、Implementation、テスト、README、既存レビュー成果物は変更していない。

## Final Decision

`READY`

Critical は0件。Mobile（React Native Android / iOS）を v1 対象とする Security Design は、Core の秘密情報所有、認可、失敗時保護および Binding の非権限性を維持したまま Specification の再レビューへ進める。

# Specification Review 018 — Core Specification の Mobile v1 整合レビュー

## Review Target

| 項目 | 内容 |
| --- | --- |
| Repository / Branch | `nemnesia/symbol-nem-wallet-core` / `agent/react-native-support` |
| Reviewed commit | `f98a67f9a335d0b845d1b2979b1f9da906fde3fd` |
| Canonical Specification | [`specification.md`](../../specifications/specification.md) |
| Upstream | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md)、[`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md) |
| Related Specification / Decision | [`react-native.md`](../../specifications/react-native.md)、[`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md)、[`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md)、[`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) |
| Previous Review | [`specification-review-017.md`](specification-review-017.md) — `READY` |
| Review date | 2026-09-23 (Asia/Tokyo) |
| Scope | commit `f98a67f` における Core Specification の変更、Mobile（React Native Android / iOS）を v1 対象とする上流資料との整合、共通 Core / C ABI 契約から RN 固有仕様への責任委譲 |
| 未確認範囲 | 実装、fixture、Android / iOS build、実機・simulator、npm package assembly、runtime / performance evidence |

## Execution Audit

`spec-review` と review-common playbook を適用し、サブエージェントは使用せず、次の3観点を独立に確認した。

- Reviewer A 相当: 目的・範囲、公開 API、入力・出力、error、状態、Binding 契約の明確性と完全性
- Reviewer B 相当: Mobile v1 の利用価値、Application / Binding / Core の責任、RN 固有仕様への委譲、上流追跡
- Reviewer C 相当: secret exposure、authorization、Chain / Network、署名対象、Wallet Store、fail-closed、C ABI / JavaScript 境界、相互運用性と検証可能性

候補を統合して既存 `SR-001〜SR-028` の回帰を確認し、Critical / Major / Minor の新規 finding は採用しなかった。

## Evidence Used

| 区分 | 資料 / 用途 |
| --- | --- |
| 作業・review policy | [`AGENTS.md`](../../../AGENTS.md)、`spec-review` / `review-common` — phase boundary、finding、gate、出力形式 |
| 対象差分 | `f98a67f^..f98a67f` の `specification.md` — 見出し・日本語表現、RN 正式仕様への参照、要件トレーサビリティを確認 |
| Concept / Requirements | `concept-sheet.md`、`requirements.md`、[`concept-sheet-review-015.md`](../concept/concept-sheet-review-015.md)、[`requirements-review-014.md`](../requirements/requirements-review-014.md) — Mobile v1、共通 Rust Core、runtime / platform、受け入れ条件と `READY` 判定 |
| Design | `architecture.md`、`bindings.md`、`security.md`、[`architecture-review-004.md`](../design/architecture-review-004.md)、[`bindings-review-004.md`](../design/bindings-review-004.md)、[`security-review-004.md`](../design/security-review-004.md) — RN の責務、C ABI reuse、secret boundary、fail-closed と各 `READY` 判定 |
| 同一フェーズ | `react-native.md`、`npm-typescript-facade.md`、`wallet-store-format-v1.md` — RN 固有 platform / lifecycle、公開 TypeScript facade、Store wire 契約との整合 |
| Approved decision | `react-native-platform-baseline.md` — `PD-RN-001〜PD-RN-007 = APPROVED`、後続 Specification への入力 |
| Prior review | `specification-review-017.md` — `SR-001〜SR-028` の resolved baseline |

## Review Result

`READY`

## Summary

Core Specification は、公開 API、暗号、署名、Wallet Store、error、状態遷移、secret lifecycle、Native C ABI / Node-API / WASM の共通契約を維持している。今回の変更は、日本語の見出しと説明を読みやすくし、React Native Android / iOS の private entry、TurboModule / JSI、platform artifact、lifecycle を `react-native.md` の正式な下流仕様へ委譲する関係を明確にしたもので、既存の外部契約は変更していない。

Mobile を v1 対象とする上流要求は、§13 の RN 経路への共通 Core / C ABI / secret / error 契約と、§15 の `NFR-006..015`、`AC-051..061` へのトレーサビリティに反映されている。RN 固有の公開 facade、runtime routing、platform baseline、Android / iOS artifact、lifecycle、resource evidence は `react-native.md` に一意に定義され、Core Specification と異なる security meaning、暗号処理または fallback を導入していない。

新規、Open、Reopened の Specification finding はない。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `SR-001〜SR-028` | 過去の各 Severity | Resolved / 回帰なし | `specification-review-001〜017` | Core API、Store、authorization、export、signing、Chain / Network、Binding、failure-safe 契約は維持され、今回の文言整理で意味は変わっていない。 |

新規、Open、Reopened の finding はない。

## Required Changes

なし。

## Optional Improvements

なし。実装、fixture、Android / iOS runtime、package assembly および responsiveness evidence の適合性は Implementation / Release Review で確認する。

## Resolved Findings

- `SR-001〜SR-028` が対象とした Store、authorization、export、signing、Chain / Network、Binding、failure-safe 契約に回帰はない。
- Mobile v1 の共通 Core 契約と RN 固有契約の境界は、`specification.md` §13、§15 と `react-native.md` §1、§12〜§25 の相互参照によって一意に追跡できる。
- `PD-RN-001〜PD-RN-007` の承認値は `react-native.md` に具体化され、Core Specification が platform 固有値を重複定義していない。

## Upstream Feedback

なし。Concept、Requirements、Architecture、Bindings、Security の最新レビューはすべて `READY` であり、Mobile v1 の責任・対象・保証境界に未解決 Critical はない。

## Deferred Findings

- Rust Core / Native C ABI / Node-API / WASM / React Native 実装の仕様適合性。
- Android / iOS artifact、TurboModule / JSI registration、lifecycle、concurrency、secret cleanup の runtime evidence。
- `AC-054〜AC-061` の package、実機・simulator、responsiveness / resource、release evidence。

## Scope and Traceability

| 上流要求・設計 | Specification の対応 |
| --- | --- |
| Desktop / Node.js / Browser / Browser Extension / React Native Android / iOS が同一 Rust Core を利用する | §1、§13、§15。RN 固有経路は `react-native.md` §1〜§3、§12〜§18 |
| Binding が Core の暗号・認証・Store・署名 authority を複製しない | §§2、§9、§13。RN は `react-native.md` §1.2、§10〜§12 |
| 全 runtime で secret ownership、authorization、fail-closed を共通化する | §§6、§8〜§13。RN は `react-native.md` §9〜§13、§19 |
| RN platform baseline と support matrix | §13、§15 から `react-native.md` §1.1、§14〜§18、§20〜§24 へ委譲 |
| Mobile v1 の受け入れ条件 | §15 の `NFR-006..015`、`AC-051..061` と `react-native.md` §22〜§24 |
| Wallet Store wire / mutation / fail-closed | §§6〜§11 と `wallet-store-format-v1.md`。RN は opaque bytes としてのみ橋渡し |

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| API・データ契約 | PASS | 16 operation、DTO、binary、Store、結果型の共通契約を維持し、RN は同じ public facade を使用する。 |
| Validation / error / state | PASS | malformed input、認証失敗、context mismatch、replacement、retry / restart の失敗時結果が一意で、RN 固有 failure は下流仕様へ分離される。 |
| Security | PASS | secret return condition、authorization、signing approval、zeroization、diagnostic 非漏えい、fail-closed が RN 経路にも共通適用される。 |
| Chain / Network / signing | PASS | Symbol / NEM、Mainnet / Testnet、raw payload、Chain 固有署名を Binding が変更しない。 |
| Wallet Store / persistence | PASS | Store は opaque、current Store authority は Application、mutation は replacement、RN は decode / migration / fallback を行わない。 |
| Native / JavaScript boundary | PASS | Core Specification の C ABI ownership / error / binary 契約を RN private adapter が再利用し、RN 固有 lifecycle と artifact は `react-native.md` に定義される。 |
| Interoperability / parity | PASS | Native C ABI / Node-API / WASM / RN が同じ Core semantics を使い、RN に別の暗号・Store・error meaning を設けない。 |
| 検証可能性 | PASS | Core fixture / negative path と RN の `AC-054〜AC-061` evidence が別々に観測可能な条件として定義される。 |

## Validation Results

| 検証 | 結果 |
| --- | --- |
| Change classification | `f98a67f^..f98a67f` は Markdown / README / `MEMORY.md` のみ。実装、manifest、dependency、test、fixture の変更なし。 |
| Target diff | `specification.md` は 15 additions / 16 deletions。見出しと日本語表現、および RN 正式仕様への委譲文言を確認。 |
| Structural review | §§1〜18、上流資料、最新 READY review、関連 Specification、Approved Platform Baseline の追跡を確認。 |
| Markdown / links | review artifact 作成後、相対リンクの存在、`git diff --check`、`git status --short` を確認する。 |
| Implementation tests | `NOT APPLICABLE / SKIPPED (docs-only)`。Rust / Native / Node / WASM / RN の build / test は実行していない。 |

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | PASS | Core 共通契約と RN 固有仕様の対象・責任が区別される。 | なし |
| 2. 契約 | PASS | API、data、validation、error、state、Binding の禁止事項を確認できる。 | なし |
| 3. 処理と例外 | PASS | success、failure、retry / restart、replacement、RN fail-closed の関係が一意である。 | なし |
| 4. 内部整合性 | PASS | Core、Store、npm facade、RN Specification、Platform Baseline 間に実装を妨げる矛盾はない。 | なし |
| 5. 検証可能性 | PASS | fixture、negative path、parity、platform / lifecycle / responsiveness evidence を独立に確認できる。 | なし |
| 6. 安全性と相互運用性 | PASS | secret、authorization、signing、Chain / Network、Store、C ABI / JS boundary、fail-closed が共通化される。 | なし |
| 7. 上流整合性 | PASS | Concept 015、Requirements 014、Architecture / Bindings / Security 004 はすべて `READY`。 | なし |

## Remaining Risks and Open Decisions

Core Specification に active な未決定事項はない。RN の operation-specific async API または support exclusion は、`react-native.md` §23.3 の negative evidence が発生した場合だけ別途ユーザー判断する条件付き事項であり、現時点の Mobile v1 scope または本レビューの `READY` を妨げない。

実装、runtime、artifact、package、responsiveness / resource および release evidence は未確認であり、本レビューはそれらの適合を保証しない。

## Automatic Changes

本 review artifact のみを新規作成した。正式な Concept、Requirements、Design、Specification、Decision、実装、テスト、fixture は変更していない。

## Final Decision

**CORE SPECIFICATION REVIEW GATE: READY**

Critical は0件。Mobile（React Native Android / iOS）を v1 対象とする上流資料と、Core Specification から RN 固有仕様への責任委譲は整合しており、実装・検証可能な契約として次工程へ進める。

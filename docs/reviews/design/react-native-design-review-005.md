# React Native Design Review 005 — formal re-review

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/react-native-support`
- Reviewed HEAD: `0481ac449bfabeb7ef7fb2fabb26afa94175b083`
- Review date: 2026-09-05 (Asia/Tokyo)
- Review artifact: `docs/reviews/design/react-native-design-review-005.md`
- Canonical Design:
  - [`architecture.md`](../../design/architecture.md)
  - [`bindings.md`](../../design/bindings.md)
  - [`security.md`](../../design/security.md)
- Previous review: [`react-native-design-review-004.md`](react-native-design-review-004.md), `READY` with `DR-RN-005` Open
- Review scope: `DR-RN-005` resolution, `DR-RN-001`〜`DR-RN-004` regression, new Design findings, RN platform baseline traceability, Design Gate, and the existing RN responsibility / security / lifecycle / downstream handoff boundaries.
- Explicit scope boundary: Browser baseline and the conditional async / RN support-exclusion lane remain separate existing decisions. This review does not reopen or decide them.
- Unvalidated scope: Rust / Native C ABI / WASM / Node / RN runtime, Android / iOS device or simulator execution, native artifact build, package assembly, CI, release and provenance evidence. These are not treated as successful based on document review.

## Execution Audit

- Execution mode: no sub-agent; four independent self-review paths were performed by the main agent as Review Board Chair.
- Reviewer A（構造・責務）: 完了。RN topology、Core / C ABI / binding / Application の責務、依存方向、runtime separation、platform status の Design placement を確認した。
- Reviewer B（Security primary）: 完了。protected assets、secret ownership / lifecycle、authorization、signing authority、fail-closed、artifact trust boundary、Core / Native / WASM / Application boundary を確認した。
- Reviewer C（フロー・運用）: 完了。initialization、process-wide coordination、runtime-local teardown、stale completion、failure、retry、restart、platform baseline の適用境界を確認した。
- Reviewer D（追跡・下流実装可能性）: 完了。Concept → Requirements → Design → Specification の trace、`PD-RN-001`〜`PD-RN-007` の同期、既存 finding status、下流委譲を確認した。
- Phase 0: 完了。指定 branch / HEAD、対象 Design、前回 artifact、上流 decision と下流整合確認先を固定した。Phase Context は `AGENTS.md` に登録がないため使用していない。
- Phase 1〜3: 完了。前回 finding の完了条件を反証し、新規候補を Design-level finding の採用条件で統合し、formal Gate と artifact を確定した。

## Evidence Used

| 区分 | 資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、phase boundary、security、change-aware validation、Git 変更範囲を確認 |
| Review policy | `design-review` Skill、`review-common` playbook / reviewers / security checklist / gates / output format | Reviewer A〜D、Security primary、DR severity、Gate、artifact 形式を確認 |
| 上流 Concept / Requirements | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md) | RN coverage、single repository / package、shared Core、API parity、security、fail-closed、support matrix / evidence 要求を確認 |
| Platform decision | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) §3、§11、§15〜§18 | `PD-RN-001`〜`PD-RN-007` の approved value、conditional lane、Design follow-up の境界を確認 |
| Canonical Design | `architecture.md` §12.1〜§12.7、`bindings.md` §12.1〜§12.16、`security.md` §12 | 修正後の platform status、責務、trust boundary、lifecycle、coordination、artifact、security invariant を確認 |
| Previous Design reviews | [`react-native-design-review-003.md`](react-native-design-review-003.md)、[`react-native-design-review-004.md`](react-native-design-review-004.md) | `DR-RN-001`〜`DR-RN-005` の初出・解消条件・前回状態を追跡 |
| Existing Design reviews | `architecture-review-002.md`、`bindings-review-002.md`、`security-review-002.md`、`upstream-cross-adversarial-review-002.md` | 既存 Design / cross-layer finding の Resolved 状態と regression を確認 |
| Downstream consistency | [`react-native.md`](../../specifications/react-native.md)、[`specification-review-015.md`](../specifications/specification-review-015.md) | approved baseline、RN support matrix、conditional async lane が Design と矛盾しないことを補助確認 |
| Target diff | `0481ac4` の `architecture.md` / `bindings.md` 差分 | `DR-RN-005` に対する変更が platform status 同期に限定されることを確認 |

## Review Result

`READY`

## Summary

`DR-RN-005` は `Resolved` と判定する。`architecture.md` は `PD-RN-002`〜`PD-RN-005` の platform baseline、`PD-RN-006` の New Architecture mandatory、`PD-RN-007` の Expo scope を current status として明示し、Browser baseline を RN decision の対象外として分離している。`bindings.md` §12.13 は承認前の候補比較を履歴として明示し、7 decision の `Current status` と approved decision への trace を記録している。

`DR-RN-001`〜`DR-RN-004` の execution evidence gate、process-wide RN coordination、existing public C ABI の RN-private reuse、RN artifact の source → build → target → digest / provenance → npm assembly trust chain は維持されている。Core の secret / cryptographic / authorization authority、Binding non-authority、fail-closed、no cross-runtime fallback、stateless Store および lifecycle / stale result invariant に回帰はない。

新規の Design-level finding、reopened finding、Requirements への feedback はない。正式 Gate は `Critical = 0` であり、`READY` とする。

## Finding Status

| ID | Severity | Status | 初出 / 前回状態 | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `DR-RN-001` | Major | Resolved / no regression | Review 001 Open → Review 002 Resolved | `architecture.md` §12.3、`bindings.md` §12.3、`security.md` §12.5 が sync baseline と execution context を分離し、responsiveness / resource / cleanup evidence と negative-evidence 時の async / support-exclusion user decision を維持する。 |
| `DR-RN-002` | Major | Resolved / no regression | Review 001〜002 Open → Review 003 Resolved | process-wide RN binding coordination が全 RN runtime / module registry / logical context の admission、serialization、ordering、shared lifecycle、teardown barrier、stale completion を一意に管理する。 |
| `DR-RN-003` | Major | Resolved / no regression | Review 001 Open → Review 002 Resolved | RN-private adapter が existing public C ABI contract を内部再利用し、Application-facing C ABI、新規 public C ABI、RN-only supported symbol、standalone C ABI artifact を追加しない。 |
| `DR-RN-004` | Major | Resolved / no regression | Review 001 Open → Review 002 Resolved | RN artifact の source revision → controlled build → target artifact → digest / provenance → approved npm assembly chain と Android / iOS verification point、fail-closed を維持する。 |
| `DR-RN-005` | Major | **Resolved** | Review 004 Open / New | approved `PD-RN-001`〜`PD-RN-007` と current Design status が同期され、候補比較は履歴、Browser baseline は別 lane と明示された。 |

### Open findings

- Critical: 0
- Major: 0
- Minor: 0

なし。

### Reopened findings

なし。`DR-RN-001`〜`DR-RN-004` は Resolved を維持し、`DR-RN-005` は前回 Open の解消確認である。

### New finding IDs

なし。

## Required Changes

なし。`Critical` の New / Open / Reopened はなく、Design Gate の formal required change は発生しない。

## Optional Improvements

Design-level の Major / Minor New / Open / Reopened はない。下流での native build、platform artifact、runtime、responsiveness、cleanup、CI / release evidence は既存の委譲先で確認する。

## Resolved Findings

### `DR-RN-005` — approved platform baseline と Design current status の同期

- ID: `DR-RN-005`
- Severity: `Major`
- Status: `Resolved`
- Location: [`architecture.md`](../../design/architecture.md) §12.4、§12.6（現行 lines 494-516）、[`bindings.md`](../../design/bindings.md) §12.2、§12.6、§12.13（現行 lines 413-425、501-520、625-715）。
- Confirmed fact before correction: `PD-RN-001`〜`PD-RN-007` が approved となった後も、RN-specific Design の一部が候補 / `NEEDS USER DECISION` と読める状態を残していた。
- Root cause / basis: Platform decision [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) §3、§11、§16、§18 は7 decisionを `APPROVED` とし、Approved Value を次工程の正式入力としている。前回 Design Review 004 は候補比較と current status の区別を Design に追加することを completion condition とした。
- Correction confirmed: `architecture.md` §12.4 / §12.6 は approved platform baseline を current status として扱い、New Architecture / Legacy と Expo scope を明示する。`bindings.md` は mandatory / formal support 外の status、Android / iOS baseline、RN version、Expo scope を approved decision へ traceし、§12.13 の候補比較を承認前の履歴としてラベル付けする。Browser baseline は RN decision の対象外として `NEEDS USER DECISION` を維持し、conditional async / RN support exclusion は negative evidence 後の別 lane として維持する。
- Completion condition / recheck: 7 decision の Approved Value と Design の current status を突合し、候補比較・Browser baseline・conditional async lane が approved RN baseline と混同されないことを確認した。Specification の baseline table / traceability とも一致する。

### `DR-RN-001`〜`DR-RN-004` — regression check

前回の解消根拠である sync / responsiveness evidence、process-wide coordination、C ABI boundary、artifact trust chain は今回の2ファイルの status 同期後も本文に残っている。platform status の更新は、execution model、secret ownership、coordination、C ABI reuse、artifact verification point、fallback policy または Core security authority を変更していないため、4件を Reopened とする事実はない。

### Other existing Design findings

既存 Architecture `DR-001`〜`DR-009`、Security Design `DR-001`〜`DR-012`、Bindings Design `DR-001`〜`DR-006` および横断 `DR-XA-001`〜`DR-XA-004` は、前回確認済みの Resolved 状態からの回帰を確認しなかった。今回の変更はこれらの finding namespace や意味を再利用・変更していない。

## Upstream Feedback

なし。Concept / Requirements は、RN の対象範囲、single Core / package、Core security authority、API parity、fail-closed、non-regression、platform decision lane および conditional async lane の評価に十分である。`DR-RN-005` は上流不足ではなく、canonical Design の current status 同期で解消された。

## Deferred Findings

- RN `0.86.x` compatibility / `0.87.x` primary、Android API 24、Android `arm64-v8a` / `x86_64`、Bare iOS 15.1、Expo subset iOS 16.4、iOS arm64 device / Apple Silicon arm64 simulator、New Architecture mandatory、Expo formal workflow の実 build / release / CI evidence。
- exact TurboModule / Codegen / JSI / JNI / ObjC++、C ABI signature、buffer mechanics、queue / lock / worker、timeout、cancellation primitive、manifest schema、Gradle / Xcode / CocoaPods、package exports および release workflow。
- `NFR-015` / `AC-061` に基づく production-equivalent responsiveness / resource / cleanup / starvation evidence。negative evidence が確認された場合の operation-specific async contract または RN support exclusion は、Platform Baseline の conditional decision lane として別途扱う。
- Browser baseline は既存 package policy の別 decision lane であり、今回の RN platform status synchronization の対象外である。

## Scope and Traceability

| Approved decision | Current Design trace | Downstream consistency |
| --- | --- | --- |
| `PD-RN-001` | `bindings.md` §12.13 Current status: `>=0.86.x`、`0.86.x` compatibility、`0.87.x` primary、stable only | `react-native.md` §1.1 / §24.2 |
| `PD-RN-002` | `architecture.md` §12.4、`bindings.md` §12.6 / §12.13: API 24 | `react-native.md` §1.1 / §14.3 |
| `PD-RN-003` | `architecture.md` §12.4、`bindings.md` §12.7 / §12.13: Bare 15.1、Expo subset 16.4 | `react-native.md` §§1.1、15〜17 |
| `PD-RN-004` | `architecture.md` §12.4、`bindings.md` §12.6 / §12.13: `arm64-v8a` / `x86_64` only | `react-native.md` §§1.1、14、21 |
| `PD-RN-005` | `architecture.md` §12.4、`bindings.md` §12.7 / §12.13: arm64 device / Apple Silicon arm64 simulator | `react-native.md` §§1.1、16、20.1 |
| `PD-RN-006` | `architecture.md` §12.6、`bindings.md` §§12.2 / 12.13: New Architecture mandatory、Legacy unsupported | `react-native.md` §§1.1、13、18 |
| `PD-RN-007` | `architecture.md` §12.6、`bindings.md` §12.13: Bare / Development Build / Prebuild / CNG / custom native formal、Expo Go unsupported | `react-native.md` §§1.1、17、20.1〜20.2 |

The Design still preserves the intended topology: public TypeScript facade → private RN entry → TurboModule / JSI adapter → thin platform layer → existing public C ABI contract → same Rust Core. RN platform status is now explicit without promoting the binding to a cryptographic, authorization, Store or public C ABI authority.

## Domain Checks

| 評価項目 | 結果 | 根拠 |
| --- | --- | --- |
| 目的・範囲 | PASS | RN remains a v1 Mobile runtime using the same Rust Core, single repository and single npm package. |
| コンテキスト・責務・依存方向 | PASS | Core / C ABI / binding / Application responsibility and one-way dependency remain unchanged; RN coordinator does not become Core security authority. |
| platform / runtime boundary | PASS | Approved RN baseline is current status; Node / Browser / Extension routing is unchanged; Browser baseline is explicitly separate. |
| lifecycle / coordination / failure | PASS | Process-wide RN coordination, runtime-local teardown, stale result rejection, no secret-bearing queue and fail-closed infrastructure failure remain explicit. |
| data ownership / secret lifecycle | PASS | Core retains secret, cryptographic, authorization and Store authority; binding remains operation-local mediation without cache / unlock session / mutable Store singleton. |
| signing / Chain / Network separation | PASS | Core retains signing and compatibility authority; RN status synchronization does not alter Symbol / NEM or Mainnet / Testnet boundaries. |
| artifact / supply chain | PASS | RN package-internal artifact remains separate from standalone public C ABI artifact and bound to source, target, digest / provenance and npm assembly evidence. |
| downstream handoff | PASS | Exact API, ABI, build, runtime and evidence details remain delegated; current platform values are no longer left for implementer inference. |

### Security domain coverage

The applied security checks covered protected assets, JS / native / C ABI / Core trust boundaries, secret ownership and operation-local lifecycle, authorization and signing authority, malformed attacker-controlled input, artifact substitution, fail-closed behavior, replacement / stale state, process-wide coordination, Chain / Network separation, binding non-authority and downstream security handoff. No security architecture regression or new Design-level security finding was identified.

## Validation Results

- 実施: `git status --short --branch`、target HEAD の `git rev-parse`、target commit の stat / diff、working tree / staged / untracked file の差分範囲を確認した。
- 実施: `architecture.md`、`bindings.md`、`security.md` の RN sections と `react-native-platform-baseline.md` の7 Approved Valueを line-numbered で突合した。
- 実施: `react-native.md` および `specification-review-015.md` の baseline / traceability / conditional lane を補助確認した。
- 実施: `DR-RN-001`〜`DR-RN-005`、既存 Architecture / Security / Bindings / cross-layer finding の status、resolution condition、regression を確認した。
- 実施予定: artifact 作成後に Markdown の章順・相対リンク、`git diff --check`、変更範囲、staged diff を確認する。
- NOT APPLICABLE / SKIPPED (docs-only): `cargo fmt`、`cargo clippy`、`cargo test`、WASM、Native C ABI、Node / RN build / runtime test。Rust / binding / manifest / test / fixture の変更はなく、AGENTS.md の change-aware validation により実装検証は実行しない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | PASS | RN platform baseline の current status が明確になり、Browser baseline / conditional async lane を混同しない。 | なし |
| 2. コンテキストと責任 | PASS | Application / Binding / C ABI / Core、RN platform layer および secret boundary の責任が維持される。 | なし |
| 3. 依存方向 | PASS | private RN entry → adapter → native → existing C ABI → Core の方向と runtime separation が維持される。 | なし |
| 4. 主要フロー | PASS | initialization、admission、serialization、teardown、stale completion、failure / cleanup の既存 invariant に変更がない。 | なし |
| 5. データ所有 | PASS | secret、Profile、Store、pending、artifact ownership の境界に変更がない。 | なし |
| 6. セキュリティと相互運用性 | PASS | Core authority、fail-closed、artifact trust、Chain / Network separation、no fallback が維持される。 | なし |
| 7. 上流整合性 | PASS | `PD-RN-001`〜`PD-RN-007` の approved value と Design current status が一致する。 | `DR-RN-005` Resolved |
| 8. 下流実装可能性 | PASS | RN version / platform / ABI / architecture / Expo status は approved input として明示され、詳細実装は適切に委譲される。 | `DR-RN-005` Resolved |
| Formal Design Review Gate | **READY** | Critical = 0、Major / Minor New / Open / Reopened = 0。 | なし |

## Remaining Risks and Open Decisions

- Design-level Open finding: なし。
- `PD-RN-001`〜`PD-RN-007`: approved baseline。別の formally approved decision による supersede がない限り現行入力とする。
- Async API / operation-specific RN support exclusion: `DEFERRED UNTIL NEGATIVE EVIDENCE`。現時点で自動的に async 化、support exclusion または API divergence は発生しない。
- Browser baseline: RN platform decision の対象外であり、既存 package policy の別 lane として扱う。
- 実装・build・release evidence と `NFR-015` / `AC-061` の実測は下流未確認範囲として残る。

## Automatic Changes

この review artifact のみを新規作成する。Concept Review の既存未コミット差分、Design、Requirements、Specification、コード、テスト、fixture、設定は変更しない。

## Final Decision

`DESIGN PHASE REVIEW GATE: READY`

`DR-RN-005` は、approved `PD-RN-001`〜`PD-RN-007` を current Design status として明示し、承認前候補・Browser baseline・conditional async lane を分離したことで `Resolved`。`DR-RN-001`〜`DR-RN-004` は Resolved を維持し、新規 / reopened finding はない。Design Review Skill の formal rule により、最終判定は `READY` である。

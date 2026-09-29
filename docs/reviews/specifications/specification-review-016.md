# Specification Review 016 — React Native cross-layer review

## Review Target

| 項目                          | 内容                                                                                                                                                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                    | `nemnesia/symbol-nem-wallet-core`                                                                                                                                                                                                                                                  |
| Branch                        | `agent/react-native-support`                                                                                                                                                                                                                                                       |
| Reviewed HEAD                 | `eae6d08e1bbe14f2f4390c5cb3ac4a551947166e`                                                                                                                                                                                                                                         |
| Canonical Specification       | [`react-native.md`](../../specifications/react-native.md)、[`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md)、[`specification.md`](../../specifications/specification.md)、[`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md) |
| Upstream Concept              | [`concept-sheet.md`](../../consept/concept-sheet.md) — Concept review 012 `READY`                                                                                                                                                                                                  |
| Upstream Requirements         | [`requirements.md`](../../requirements/requirements.md) — Requirements review 011 `READY`                                                                                                                                                                                          |
| Upstream Design               | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md) — RN Design review 004 `READY` with `DR-RN-005` open                                                                                       |
| Platform Decision             | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) — `PD-RN-001〜PD-RN-007` `APPROVED`                                                                                                                                                       |
| Previous Specification Review | [`specification-review-015.md`](specification-review-015.md) — `READY`、`SR-025〜SR-028` Resolved                                                                                                                                                                                  |
| Review date                   | 2026-09-05 (Asia/Tokyo)                                                                                                                                                                                                                                                            |
| Review scope                  | Specification 単体の再確認、Concept → Requirements → Design → Specification traceability、public API / DTO / sync contract、runtime / platform / security、Node / Browser / Extension / RN parity、single repository / package、既存 finding regression                            |
| Unvalidated scope             | Rust / C ABI / Node / WASM / RN runtime、Android / iOS / Expo build、device / simulator、package assembly、CI、release、performance および interoperability の実測                                                                                                                 |

下流の実装・runtime・release はユーザーが依頼した review scope に含まれるが、実行可能な成果物がこの HEAD に存在することを意味しない。未実行範囲は成功扱いにしていない。

## Execution Audit

`spec-review` Skill、`review-common` playbook、reviewer policy、security / interoperability checklist、gate policy および共通 output format を適用した。サブエージェントは使用せず、Chair が次の3パスを独立に確認した。

1. **契約の明確性**: 16 operation、DTO、binary、sync、routing、error、state、ordering、lifecycle、platform、artifact、acceptance を確認した。
2. **価値・運用**: single package、Node / Browser / Extension / RN の routing、API parity、support matrix、release / evidence、existing consumer non-regression を確認した。
3. **Security / Interoperability primary**: Core authority、C ABI reuse、secret lifecycle、authorization、Store、Chain / Network、Symbol / NEM、fail-closed、ownership、artifact integrity を確認した。

Phase 2 では `SR-001〜SR-028` の状態、`DR-RN-005` の影響範囲、Requirements の delegated decision lane、approved platform baseline と現行 Specification の値を照合した。

## Evidence Used

| 区分                          | 資料 / 確認内容                                                                                                                                | 用途                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 作業指針                      | [`AGENTS.md`](../../../AGENTS.md)                                                                                                              | phase boundary、Source of Truth、security、scope、docs-only validation                                    |
| Review policy                 | [`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md)、review-common playbook / reviewers / checklist / gates / output format | reviewer path、finding、severity、gate、artifact 形式                                                     |
| Concept                       | [`concept-sheet.md`](../../consept/concept-sheet.md)、`concept-sheet-review-012.md`                                                            | 製品 scope、shared Core、single package、security invariant                                               |
| Requirements                  | [`requirements.md`](../../requirements/requirements.md)、`requirements-review-011.md`                                                          | `NFR-006〜NFR-015`、`AC-051〜AC-061`、non-regression、decision / evidence gate                            |
| Design                        | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md)        | topology、ownership、trust boundary、lifecycle、coordination、C ABI reuse                                 |
| Design Review                 | [`react-native-design-review-004.md`](../design/react-native-design-review-004.md)                                                             | `DR-RN-001〜004` resolution、`DR-RN-005` の Design status issue                                           |
| Platform Decision             | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) §1〜§2、§18                                           | approved RN version / OS / ABI / architecture / Expo / New Architecture                                   |
| RN Specification              | [`react-native.md`](../../specifications/react-native.md) §§1〜25                                                                              | RN public contract、routing、process-wide coordination、buffer、lifecycle、platform、artifact、acceptance |
| Common facade                 | [`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md) §§1〜19                                                            | 16 operation、DTO、error、exports、Node / Browser / WASM、single package                                  |
| Core / Store Specification    | [`specification.md`](../../specifications/specification.md)、[`wallet-store-format-v1.md`](../../specifications/wallet-store-format-v1.md)     | Core semantics、C ABI、Store、crypto、Chain / Network、error、determinism                                 |
| Previous Specification Review | [`specification-review-015.md`](specification-review-015.md)                                                                                   | `SR-025〜SR-028` completion conditions と `SR-001〜SR-024` regression baseline                            |

## Review Result

`READY`

## Summary

現行 Specification は、Concept の shared Rust Core / single repository / single package 方針、Requirements の Core security authority / Binding non-authority / API parity / fail-closed / non-regression、Design の RN private topology / existing C ABI reuse / process-wide coordination / lifecycle boundary を、実装・検証可能な契約へ具体化している。

RN は既存16 operation、DTO、binary semantics、18 Core error、synchronous public return / throw を維持し、`react-native` private entry + TurboModule / JSI + native artifact のみを使用する。Node.js、Browser、Browser Extension、WASM、native Node の既存 routing、Node 22 / 24 policy、C ABI、Store、Chain / Network、Symbol / NEM semantics に RN-specific fallback や別 API を混入させていない。

`PD-RN-001〜PD-RN-007` の approved baseline は RN Specification §1.1、§13〜§21、§24 に反映され、Specification 内に active な RN platform decision はない。Design に残る旧 status 表記は `DR-RN-005` として Design へ feedback するが、current Specification の値・契約・実装可能性を阻害しないため Specification finding にはしない。

## Finding Status

| 区分                            | 件数 / 状態                    |
| ------------------------------- | ------------------------------ |
| New Specification findings      | 0                              |
| Open Specification findings     | Critical 0 / Major 0 / Minor 0 |
| Reopened Specification findings | 0                              |
| `SR-001〜SR-024`                | Resolved / no regression       |
| `SR-025〜SR-028`                | Resolved / no regression       |

### Open findings

なし。`DR-RN-005` は upstream Design feedback であり、`SR-*` の Open finding ではない。

### Reopened findings

なし。前回 `SR-025〜SR-028` の completion condition は現行 RN Specification に残り、`SR-001〜SR-024` の public contract、security、Store、chain / network、C ABI、failure semantics に回帰はない。

### New finding IDs

なし。Design の status synchronization を Specification の誤契約として二重計上していない。

## Required Changes

なし。Specification の正式 Gate を不合格にする Critical、または現行 contract の修正を要求する finding はない。

## Optional Improvements

なし。実装・release で実測すべき性能、artifact、device / simulator、Expo、multi-runtime および package evidence は Specification の未実行検証として残るが、未検証であることを仕様 finding としない。

## Resolved Findings

`SR-001〜SR-024` は既存の Core / Store / DTO / error / authorization / export / signing / Chain / Network / C ABI / failure-safe / security invariant を RN 追加後も維持している。

`SR-025〜SR-028` は次のとおり現行 Specification で再確認した。

- `SR-025`: §4.2〜§4.3、§22、§23 が16 operation の common baseline、C0 / C1 / C2、trigger-set、production-equivalent evidence を接続する。
- `SR-026`: §8、§9、§13.2、§19 が active re-entry、invalid / cancelled / teardown nested request、stale cleanup、error mapping を区別する。
- `SR-027`: §5 が process-wide initializing 中の即時 `BackendInitializationError`、ticket / descriptor / secret / retry の禁止、failure 後 unavailable を定める。
- `SR-028`: §1.1、§17、§20、§22、§24 が RN `0.86.x / 0.87.x` finite window、stable-only、Expo SDK57 + RN0.86.x pair、unsupported set、re-baseline を定める。

## Upstream Feedback

`DR-RN-005` を Design へ返す。Platform Decision 承認後も [`architecture.md`](../../design/architecture.md) §12.4 / §12.6 と [`bindings.md`](../../design/bindings.md) §12.13 の RN-specific platform sections に `NEEDS USER DECISION` が残り、候補分析が履歴なのか現行 status なのかが Specification reader に明示されていない。Specification は approved baseline を正しく反映しているため、Spec 側の修正は不要である。

これは formal Specification finding、Severity、Spec Gate 判定または Required Change ではない。Design review 004 の `DR-RN-005` と一つの issue として trace する。

## Deferred Findings

- Rust / Native C ABI / Node-API / WASM / RN runtime の実行、API parity、ownership、error propagation。
- Android / iOS device / simulator、Expo Development Build / Prebuild、New Architecture registration、multi-runtime reload / teardown。
- artifact manifest、target / ABI / slice、digest / provenance、npm pack / clean install、release / supply-chain evidence。
- process-wide contention、blocking、starvation、resource boundedness、cancellation / interruption、cleanup および stale result の実測。
- negative evidence 後だけ発動する operation-specific async contract または RN support exclusion の user decision。
- RN decision 対象外の Browser baseline と既存 Node / Browser / Extension release validation。

## Scope and Traceability

### Concept → Requirements → Design → Specification

| 上流                                                      | 現行 Specification への trace                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Concept shared Core / single package / security invariant | `react-native.md` §§1〜2、`npm-typescript-facade.md` §§1、`specification.md` §§1〜4 |
| Requirements `NFR-006〜NFR-010`、`NFR-014`                | `react-native.md` §§1〜3、§5、§19〜§21                                              |
| Requirements `NFR-008`、`NFR-015`、`AC-054〜AC-061`       | `react-native.md` §§2、§4、§5、§8〜§10、§22〜§25                                    |
| Design topology / C ABI reuse / Core authority            | `react-native.md` §§1.2、§12〜§15、`specification.md` §13                           |
| Design process-wide coordinator / lifecycle               | `react-native.md` §§5〜§10、§19                                                     |
| Approved `PD-RN-001〜007`                                 | `react-native.md` §§1.1、§13〜§21、§24.2                                            |

### Public API / DTO / sync non-regression

The root package exposes the existing 16 named functions only. RN uses the same argument order, return DTO, `null` / `undefined`, `Uint8Array`, Core error and replacement Store semantics. RN does not add a Promise variant, `AbortSignal`, backend selector, native handle, or secret export. Public functions synchronously return or throw; native worker use does not permit a false no-blocking claim.

### Runtime and platform consistency

| Runtime                     | Normal route                                                                    | RN impact                                         |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| Node.js                     | `node-addons` native; allowed package-local WASM fallback under existing policy | unchanged                                         |
| Browser / Browser Extension | package-local WASM                                                              | unchanged; Extension remains Browser runtime form |
| React Native Android / iOS  | `react-native` private entry + approved native artifact                         | no Node / Browser / WASM fallback                 |

All routes use one public package and the same Rust Core. RN platform-specific responsibilities do not become public backend choice or alter existing runtime policy.

### Security / ownership

RN binding validates conversion and transport but does not own cryptography、Mnemonic、private key、signing semantics、authorization、Store decode / mutation、current Store、secret cache、unlocked session or zeroization authority. Core owns security semantics; Application owns user display / confirmation, current Store replacement and Core-external copies. Failures, stale results, teardown and artifact mismatch are not success and do not silently fallback.

### Design status feedback boundary

The approved values are authoritative for this Specification. The Design status issue is limited to documentation traceability: it does not justify changing the RN values, the public API, the runtime route, the C ABI, or any security behavior in this phase.

## Domain Checks

| 評価項目                     | 結果                        | 根拠                                                                                                                      |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Contract completeness        | PASS                        | API、DTO、binary、sync、routing、error、state、lifecycle、platform、artifact、acceptance が定義される。                   |
| Concept / Requirements trace | PASS                        | shared Core、single package、security、support、non-regression、evidence requirements が下位契約へ追跡できる。            |
| Design trace                 | PASS with upstream feedback | topology、authority、coordination、lifecycle、C ABI reuse が反映される。旧 Design status は `DR-RN-005`。                 |
| Node / Browser / Extension   | PASS                        | existing Node native / WASM、Browser / Extension WASM、Node 22 / 24 policy、public facade を保持する。                    |
| RN Android / iOS             | PASS                        | same API / Core、TurboModule / JSI、approved ABI / slice、New Architecture、Expo scope、no fallback を定義する。          |
| Single repository / package  | PASS                        | RN private entry / artifacts を一つの npm package に含め、public subpath / separate package を作らない。                  |
| Security / secret lifecycle  | PASS                        | Core authority、processing-unit auth、explicit export / signing approval、copy / cleanup、failure-safe を保持する。       |
| Store / Symbol / NEM         | PASS                        | opaque Store、version、atomicity、Chain / Network、Symbol / NEM の共通化禁止、existing C ABI を維持する。                 |
| Interoperability / failure   | PASS                        | exact bytes、UTF-8、ownership、error mapping、unsupported / mismatch / stale / partial failure を外部観測可能に定義する。 |
| Existing findings            | PASS                        | `SR-001〜SR-028` に reopen / regression なし。                                                                            |

## Validation Results

| 検証                   | 結果                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch / HEAD          | `agent/react-native-support` / `eae6d08e1bbe14f2f4390c5cb3ac4a551947166e` を確認。                                                                                     |
| Canonical source state | Review 開始時点で Concept / Requirements / Design / Specification / decision は未変更。直前 HEAD 差分は `specification-review-015.md` のみ。                           |
| Prior finding recheck  | `SR-001〜SR-028` と `DR-RN-001〜DR-RN-004` の状態を確認。                                                                                                              |
| Platform recheck       | `PD-RN-001〜PD-RN-007 = APPROVED` と RN Specification §§1、13〜21、24 の反映を照合。                                                                                   |
| Docs-only validation   | 本 artifact 作成後に `git diff --check`、Markdown heading / relative link の確認を実施する。Rust、binding、runtime、package、release test は実装変更なしのため対象外。 |

## Review Gates

| Gate                           | 結果                          | 根拠                                                                                                          | 対応        |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------- |
| 1. 目的 / scope                | PASS                          | RN contract の対象、対象外、single package が明確。                                                           | なし        |
| 2. Contract                    | PASS                          | 16 operation、DTO、binary、sync、routing、error、artifact、platform が明確。                                  | なし        |
| 3. Processing / exception      | PASS                          | initialization、re-entry、teardown、stale、failure、cleanup、no fallback が一意。                             | なし        |
| 4. Internal consistency        | PASS                          | common facade、RN spec、Core / Store spec、Requirements、approved decision が一致。                           | なし        |
| 5. Verifiability               | PASS                          | AC-054〜AC-061、operation evidence、artifact / release evidence が追跡可能。                                  | なし        |
| 6. Security / interoperability | PASS                          | Core authority、ownership、bytes、Store、Chain / Network、Symbol / NEM、fail-closed が一貫。                  | なし        |
| 7. Upstream alignment          | PASS with non-formal feedback | Design の status marker は upstream feedback として trace するが、Spec contract は approved baseline と一致。 | `DR-RN-005` |
| Critical finding               | PASS                          | 0 件。                                                                                                        | なし        |
| Formal Review Gate             | **READY**                     | Critical がなく、Specification finding の Open / Reopened はない。                                            | なし        |

## Remaining Risks and Open Decisions

Specification の active な `NEEDS USER DECISION` はない。async API / operation-specific RN support exclusion は negative evidence まで `DEFERRED UNTIL NEGATIVE EVIDENCE` である。実装、runtime、native artifact、release、device / simulator、性能、cleanup および existing consumer evidence は未実行であり、Stage 下流の検証が必要である。Design の `DR-RN-005` は別途 Design 層で status を同期する。

## Automatic Changes

この review artifact のみを新規作成する。Concept、Requirements、Design、Specification、Platform Decision、実装、テスト、fixture、README、package、CI / release workflow および既存 review artifact は変更しない。

## Final Decision

**SPECIFICATION PHASE REVIEW GATE: READY**

現行 Specification は Concept → Requirements → Design → approved Platform Decision の内容を外部契約へ一貫して接続し、Node.js、Browser、Browser Extension、RN Android / iOS、single repository / package、public API / DTO / sync contract、security boundary および既存 finding resolution に回帰がない。新規 / reopened `SR-*` はなく、Design status に関する `DR-RN-005` は upstream feedback として明示した。

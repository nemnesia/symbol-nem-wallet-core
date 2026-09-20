# Implementation Review 016 — Full implementation review after React Native specification

## Review Target

| 項目 | 内容 |
| --- | --- |
| Repository / Branch | `nemnesia/symbol-nem-wallet-core` / `agent/react-native-support` |
| Reviewed HEAD | `c4955c6f4d5b6972cd0d3f7202fc91b11530bfb8` |
| Previous Review | [`implement-review-015.md`](implement-review-015.md) — `READY`、`IR-001〜IR-022` Resolved |
| Review date | 2026-09-20 (Asia/Tokyo) |
| Scope | Rust Core、Native C ABI、Node-API、WASM、npm facade、React Native Android / iOS、関連 tests / package assembly |
| Upstream baseline | Concept / Requirements / Design / Specification の現行正本と approved RN Platform Decision |

## Execution Audit

`implement-review`、review-common playbook、reviewers、security checklist、gate policy、output format を適用した。サブエージェントは使用せず、Chair が次の4パスを独立に実施した。

1. Reviewer A — 16 operation、DTO、error、Store、binding、npm / RN public contract の仕様適合。
2. Reviewer B — secret lifecycle、crypto、AAD、RNG、authorization、C ABI / WASM ownership、failure atomicity、およびRN trust boundaryの実体。
3. Reviewer C — Symbol / NEM、Chain / Network、derivation / signing fixture、CBOR、Native / WASM parity。
4. Reviewer D — malformed / authentication / allocation failure、package routing / allowlist、tests、build / runtime evidence。

候補を要件・仕様・実装・実行結果へ追跡し、RN source / entry / artifact / tests / evidence の欠落は同一 root cause `IR-023` に統合した。

## Evidence Used

| 区分 | Evidence / 用途 |
| --- | --- |
| Procedure | [`AGENTS.md`](../../../AGENTS.md)、`implement-review` / review-common — scope、security、severity、gate |
| Upstream | Concept、[`requirements.md`](../../requirements/requirements.md)、Design 3文書、approved RN decision — v1 target、責任、platform / artifact baseline |
| Specification | Core、Store、npm facade、[`react-native.md`](../../specifications/react-native.md) — exact external contract |
| Core / bindings | `crates/core`、`crates/c-abi`、`crates/node`、`crates/wasm` — crypto、Store、ownership、binding |
| Package implementation | `packages/wallet-core/package.json`、`src/`、`dist/`、`scripts/build-npm-package.mjs`、`scripts/package-contents.mjs` |
| Tests | Core / C ABI / Node / WASM tests、npm facade / package / parity tests、fuzz target |
| Prior review | `implement-review-015.md` — `IR-001〜IR-022` completion baseline |

## Review Result

**REVISE IMPLEMENTATION**

## Summary

既存の Rust Core、Native C ABI、Node-API、WASM、Node / Browser npm facade には新しい仕様違反を確認しなかった。format、clippy、workspace tests、C ABI runtime、WASM target check、npm package tests は通過した。

しかし、Requirements が v1 target とする React Native Android / iOS の実装が存在しない。package の conditional exports は `types → node-addons → default` の旧構成で、RN private entry、TurboModule / JSI layer、process-wide coordinator、Android / iOS native integration、RN manifest / artifacts、Expo integration、platform / lifecycle / responsiveness tests がない。package build と tests も RN file を allowlist に含めず、旧構成を成功条件としている。

このため、現行 package は RN で仕様上の経路を提供できず、RN condition・fail-closed・no-WASM-fallback・platform artifact・AC-054〜AC-061 を満たせない。`IR-023 / HIGH / New` により Implementation Gate は不合格である。

## Finding Status

| ID | Severity | Status | 概要 |
| --- | --- | --- | --- |
| `IR-001〜IR-022` | 既存 | Resolved / no regression | Core / Store / Native / WASM の既存 completion condition を維持。 |
| `IR-023` | HIGH | New | React Native Android / iOS の必須実装・package経路・検証が存在しない。 |

Current unresolved findings: **CRITICAL 0 / HIGH 1 / MEDIUM 0 / LOW 0**。

## Required Changes

### IR-023 — React Native Android / iOS implementation is absent

- **Severity / Status**: `HIGH / New`
- **対象箇所**:
  - `packages/wallet-core/package.json:32-44` — `react-native` condition がない。
  - `scripts/build-npm-package.mjs:133-209` — Node / WASM / Node manifest だけを assembly する。
  - `scripts/package-contents.mjs:4-15,32-69` — RN entry / manifest / artifact を allowlist に含めない。
  - `packages/wallet-core/test/package.test.mjs:41-90,120-159` — RN を含まない exports / dist / tarball を期待値として固定する。
  - `packages/wallet-core/`、`crates/` — RN private entry、TurboModule / JSI、Android / iOS integration、process-wide coordinator、RN artifact / manifest の実体がない。
- **発生条件 / 確認済み事実**: React Native Android / iOS consumer が root package を解決・初期化しようとしても、仕様の `react-native` condition と private native provider が存在しない。build / package test は RN inventory を生成・受理しない。
- **根拠**:
  - Requirements `NFR-006〜NFR-015`、`AC-054〜AC-061` は RN Android / iOS を v1 target とし、same package / API、Core authority、fail-closed、support matrix、artifact、responsiveness evidence を要求する。
  - `react-native.md` §§2〜4 は16 API、`react-native` private entry、no Node / WASM fallback、process-wide admissionを固定する。
  - 同 §§13〜23 は Android / iOS / Expo / New Architecture、formal artifact / manifest、package inventory、acceptance evidence を固定する。
- **問題**: v1 の必須 platform capability が未実装であり、RN consumer は仕様どおりの Core 経路へ到達できない。resolver が `default` を選ぶ環境では、RN で禁止された WASM 経路へ進む可能性もあり、所定の generic initialization failure と platform isolation を保証できない。現行 tests はこの欠落を検出せず、反対に旧 package shape を正としている。
- **影響**: React Native Android / iOS 全体の availability、API parity、failure semantics、platform isolation、artifact integrity、secret ownership / cleanup の検証可能性が成立しない。直接の secret leakage は確認していないが、要求された2 platform と release evidence 全体を阻害する。
- **Severity 根拠**: 影響は optional edge path ではなく v1 mandatory platform 全域に及び、package routing・native boundary・lifecycle・artifact・acceptanceを一括して欠落させる。回避策として Node / Browser backend を使うことは仕様上許可されないため `HIGH` とする。
- **必要な最小修正**: 承認済み RN Specification の範囲内で、root conditional export、private RN facade、New Architecture TurboModule / JSI、existing C ABI mediation、process-wide coordination / lifecycle / cleanup、Android / iOS formal targets、RN manifest / package assemblyを実装し、現行 Node / Browser経路を退行させない。仕様外の公開APIや別packageを追加しない。
- **完了条件 / 再確認**:
  1. root package が exact orderで `react-native` private entryを解決し、16 API / DTO / sync / error parityを満たす。
  2. provider不在、wrong ABI / slice、artifact / integrity、initialization / invocation / stale / teardown failureがfail closedとなり、Node / WASMへfallbackしない。
  3. process-wide coordination、identity、re-entry、cancellation、teardown、secret / C ABI ownershipが実装・negative testで確認できる。
  4. Android `arm64-v8a` / `x86_64`、iOS device / Apple Silicon simulator `arm64`、approved RN / OS / Expo matrixのbuild / load / invoke evidenceがある。
  5. RN manifest、digest / provenance、single-package inventory、npm pack / clean installが仕様どおりである。
  6. AC-054〜AC-061 の parity、non-regression、responsiveness / resource / cleanup evidenceを取得し、`IR-023` を再レビューする。

## Optional Improvements

なし。`IR-023` は必須修正であり、任意改善へ降格しない。

## Resolved Findings

`IR-001〜IR-022` は現行 Core / C ABI / Node / WASM source と tests で新たな回帰を確認しなかった。特に authorization、chain-specific derivation / signing、deterministic CBOR / AAD、unknown field、atomic replacement、secret redaction / zeroization、C ABI allocation / release、WASM exact binary boundary は既存経路で維持される。

## Upstream Feedback

既存 `DR-RN-005` を Design へ継続して返す。送信元は Implementation review、受信先は Design、対象は `architecture.md` / `bindings.md` のRN platform statusである。approved `PD-RN-001〜007` 後も旧候補・未決定表記が残るため、正式Designを同期する必要がある。

これは非規範的な既存 feedback であり、`IR-023` の原因ではない。RN Specification は実装に必要な契約を十分に定義しており、Design status 文言の修正を待たず実装作業は開始可能である。解消条件はDesign正本がapproved baselineを現行決定として明示すること。

## Deferred Findings

- Browser実機 parity: 実行環境に browser がなく未確認。
- 長時間 fuzz campaign、external verifier / node、LSan、nightly branch coverage。
- RN device / simulator / Expo / performance / artifact / release evidence: `IR-023` 修正後に実行可能となる。

## Scope and Traceability

| Area | Upstream | Implementation / evidence |
| --- | --- | --- |
| Core / Store / crypto | Core / Store Specification | `crates/core` と workspace tests — PASS |
| Native C ABI | Core §13.1、Design bindings | `crates/c-abi`、header/runtime tests — PASS |
| Node / WASM | npm facade、Core §13 | `crates/node`、`crates/wasm`、npm package/parity — PASS with browser deferred |
| npm package | npm facade §§9〜16 | current Node / WASM route — PASS for pre-RN contract |
| RN public / lifecycle | RN Specification §§2〜12 | implementation absent — `IR-023` |
| RN platform / artifact | RN Specification §§13〜23、approved decision | implementation / evidence absent — `IR-023` |

## Domain Checks

| Gate / domain | Result | Evidence / limitation |
| --- | --- | --- |
| Specification conformance | FAIL | RN mandatory contract が全面未実装。既存 Core / Node / WASM はPASS。 |
| Security | FAIL (unverifiable RN boundary) | 既存 secret / crypto / Store / C ABI / WASM path に回帰なし。RN ownership、cleanup、lifecycle、no-fallback は実体がなく検証不能。 |
| Interoperability | PASS for implemented paths | Symbol / NEM、Chain / Network、derivation / signing fixture、Native / WASM parityを確認。RN parityは`IR-023`。 |
| Abnormal / failure paths | FAIL for RN | existing malformed / auth / allocation / Store failureはPASS。RN initialization / lifecycle / ABI / stale pathsなし。 |
| Test sufficiency | FAIL | tests が RN欠落を検出せず旧 exports / allowlist を期待する。 |
| Implementation quality / memory safety | PASS for implemented paths | Rust ownership、C ABI unsafe境界、WASM conversionに新規問題なし。RN native境界は未実装。 |
| Checklist applicability | Applied | protected assets、secret lifecycle/copy/zeroize、crypto/RNG/signing、Store/parser、C ABI、WASM、failure atomicity、testsを既存pathへ適用。 |
| Major N/A / unvalidated | N/A / pending | RN concurrency / native unsafe / platform memory safetyは実装がないため`IR-023`後に適用。external nodeとbrowser実機は未確認。 |

## Validation Results

| Validation | Result | Notes |
| --- | --- | --- |
| `cargo fmt --all -- --check` | PASS | workspace current HEAD。 |
| `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` | PASS | warningなし。 |
| `cargo test --workspace --all-features --locked` | PASS | Core 46 + integration 6 + C ABI unit 2 + C ABI integration 2 + Node 1、doc tests。 |
| `crates/c-abi/tests/run_c_abi_runtime.sh` | PASS | C caller runtime。 |
| `cargo check --target wasm32-unknown-unknown --package symbol-nem-wallet-core-wasm --locked` | PASS | workspace再編後の実manifestに合わせた command。 |
| 旧 `cargo check --target wasm32-unknown-unknown --features wasm --locked` | NOT APPLICABLE | workspace rootに `wasm` featureがなく失敗。実装不具合ではなく旧command不適用。 |
| `pnpm test:npm` | PASS | package / facade tests、Node native vs Node WASM parity。Browser parityは1件skip。 |
| `pnpm test:npm:parity` | NOT VALIDATED | browser executable不在により `BLOCKED / Browser WASM runtime parity evidence unavailable`。 |
| RN build / runtime / package tests | FAIL / ABSENT | target、script、source、artifact、evidenceが存在しない。`IR-023`。 |

## Review Gates

| Gate | Result | Basis |
| --- | --- | --- |
| 1. Specification conformance | FAIL | RN v1 mandatory surface / route / platform実装なし。 |
| 2. Security | FAIL | RN secret transport / ownership / lifecycle / fail-closedを実装で確認不能。 |
| 3. Interoperability | PASS for implemented scope | Core / C ABI / Node / WASM fixtureに回帰なし。RNは未実装。 |
| 4. Abnormal conditions | FAIL | RN provider / ABI / artifact / lifecycle negative pathなし。 |
| 5. Test sufficiency | FAIL | package testsが旧Node/WASM-only shapeを固定。 |
| 6. Implementation quality / memory safety | PASS for implemented scope | 既存境界はPASS、RN native境界は未実装。 |
| Formal Implementation Gate | **REVISE IMPLEMENTATION** | New HIGH `IR-023` が1件。 |

## Remaining Risks and Open Decisions

- `IR-023` が解消されるまでReact Native対応をv1実装済みまたはrelease-readyと宣言できない。
- Designの`DR-RN-005`は未解消だが、approved decisionとRN Specificationがあるため実装開始のblockerではない。
- async API / RN support exclusionはnegative evidenceまで未決定化しない。まず仕様どおりの実装とAC-061 evidenceが必要である。
- Browser実機、長時間 fuzz、external verifier / node、LSan、nightly branch coverageは未確認。

## Automatic Changes

本 review artifact のみを新規作成した。Implementation、tests、package、Specification、Design、Requirements、fixture、README、CI / release workflowは変更していない。

## Final Decision

**IMPLEMENTATION REVIEW GATE: REVISE IMPLEMENTATION**

既存 Core / C ABI / Node / WASM path は検証範囲で回帰なし。ただしReact Native Android / iOS の必須実装・package経路・artifact・acceptance evidenceが存在しないため、`IR-023 / HIGH / New` の解消と再レビューが必要である。

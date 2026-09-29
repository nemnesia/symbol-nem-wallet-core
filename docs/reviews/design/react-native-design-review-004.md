# React Native Design Review 004 — cross-layer review

## Review Target

| 項目                      | 内容                                                                                                                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                | `nemnesia/symbol-nem-wallet-core`                                                                                                                                                                                                                        |
| Branch                    | `agent/react-native-support`                                                                                                                                                                                                                             |
| Reviewed HEAD             | `eae6d08e1bbe14f2f4390c5cb3ac4a551947166e`                                                                                                                                                                                                               |
| Canonical Design          | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md)                                                                                                                  |
| Upstream Concept          | [`concept-sheet.md`](../../consept/concept-sheet.md) — Concept review 012 `READY`                                                                                                                                                                        |
| Upstream Requirements     | [`requirements.md`](../../requirements/requirements.md) — Requirements review 011 `READY`                                                                                                                                                                |
| Previous RN Design Review | [`react-native-design-review-003.md`](react-native-design-review-003.md) — `READY`、`DR-RN-001〜DR-RN-004` Resolved                                                                                                                                      |
| Other Design reviews      | `architecture-review-002.md`、`security-review-002.md`、`bindings-review-002.md` — `READY`                                                                                                                                                               |
| Downstream evidence       | Platform Baseline Decision Gate、RN Specification、npm facade Specification、Specification review 015                                                                                                                                                    |
| Review date               | 2026-09-05 (Asia/Tokyo)                                                                                                                                                                                                                                  |
| Review scope              | RN topology、責務・trust boundary、runtime / platform / security、process-wide coordination、lifecycle、single repository / package、既存 runtime / public contract 非退行、Concept / Requirements / Specification traceability、既存 finding regression |
| Unvalidated scope         | Rust / C ABI / Node / WASM / RN runtime、Android / iOS device / simulator、native artifact build、package assembly、CI、release および実測 evidence                                                                                                      |

今回の下流参照は、ユーザーが明示した cross-layer consistency / traceability、委譲および既存 contract 非退行を確認するために行った。API、wire format、暗号パラメータ、mutex / queue 等の実装詳細を Design finding として要求していない。

## Execution Audit

`design-review` Skill、`review-common` playbook、reviewer policy、security checklist、gate policy および共通 output format を適用した。サブエージェントは使用せず、Chair が次の4パスを独立に確認した。

1. **構造・責務**: process-wide RN coordination、runtime / module-registry、logical consumer context、native layer、C ABI、Rust Core、Application の依存方向と ownership。
2. **Security primary**: secret authority、authorization、signing、Store、binding non-authority、failure isolation、stale result、cleanup、host guarantee boundary。
3. **フロー・運用**: initialization、admission、serialization、re-entry、runtime-local / process-wide teardown、reload、cancellation、cross-runtime contention。
4. **追跡・実装可能性**: Concept / Requirements / approved decision から Design、Specification への trace、既存 finding regression、下流へ推測なしに渡る設計判断。

Platform baseline の承認前後を区別して、旧 review artifact の状態をそのまま現行状態へ再利用しないよう確認した。

## Evidence Used

| 区分                       | 資料 / 確認内容                                                                                                                                             | 用途                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 作業指針                   | [`AGENTS.md`](../../../AGENTS.md)                                                                                                                           | phase boundary、Source of Truth、security、scope、change-aware validation                       |
| Review policy              | [`design-review/SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、review-common playbook / reviewers / security checklist / gates / output format | Design reviewer path、formal finding、severity、gate、artifact 形式                             |
| Upstream Concept           | [`concept-sheet.md`](../../consept/concept-sheet.md)、`concept-sheet-review-012.md`                                                                         | 製品目的、RN coverage、single Core / package、security invariant                                |
| Upstream Requirements      | [`requirements.md`](../../requirements/requirements.md)、`requirements-review-011.md`                                                                       | `NFR-006〜NFR-015`、`AC-051〜AC-061`、Core / Binding / Application、support / evidence gate     |
| Architecture               | [`architecture.md`](../../design/architecture.md) §12.1〜§12.7                                                                                              | RN topology、runtime separation、process-wide authority、artifact architecture、platform status |
| Bindings                   | [`bindings.md`](../../design/bindings.md) §12.1〜§12.17                                                                                                     | binding boundary、coordination、C ABI reuse、secret / lifecycle、platform candidate tables      |
| Security Design            | [`security.md`](../../design/security.md) §12                                                                                                               | RN trust boundary、secret lifecycle、failure、host guarantee、downstream handoff                |
| Previous RN Design Review  | [`react-native-design-review-003.md`](react-native-design-review-003.md)                                                                                    | `DR-RN-001〜DR-RN-004` の resolution と historical status                                       |
| Other Design Reviews       | `architecture-review-002.md`、`security-review-002.md`、`bindings-review-002.md`                                                                            | existing Design findings の resolution と non-regression                                        |
| Approved platform decision | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) §1〜§2、§18                                                        | `PD-RN-001〜PD-RN-007` の approval、Design follow-up の意味、RN baseline                        |
| Downstream Specification   | [`react-native.md`](../../specifications/react-native.md) §§1〜25、[`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md) §§1〜16      | approved baseline の反映、16 operation、routing、package、existing runtime non-regression       |
| Specification Review       | [`specification-review-015.md`](../specifications/specification-review-015.md)                                                                              | `SR-001〜SR-028` の resolution と Spec Gate                                                     |

## Review Result

`READY`

## Summary

RN Design は、TypeScript public facade → private RN entry → TurboModule / JSI adapter → Android / iOS thin native layer → existing public C ABI → Rust Core の一方向 topology を維持している。Rust Core は cryptography、secret、authorization、Store integrity、validation、zeroization の authority、Application は user intent / current Store / Core 外 copy の責任、RN binding は transport / conversion / registration / artifact / lifecycle / coordination / error mediation の責任であり、security responsibility の逆流はない。

RN の全 runtime / module registry / logical consumer context を覆う process-wide coordination、runtime-local teardown、stale completion rejection、no secret-bearing queue、no silent Node / WASM fallback、existing 16-operation synchronous facade および single repository / single npm package は Requirements と Specification へ一貫して接続される。Node.js、Browser、Browser Extension の routing / public contract / release policy に RN-specific semantics を混入させていない。

ただし、Platform Baseline Decision Gate で `PD-RN-001〜PD-RN-007` が承認された後も、canonical Design の RN-specific platform sections が現行文面として `NEEDS USER DECISION` を保持している。この status は承認済み decision と Specification の exact baseline を読む利用者に、Design がまだ未決定なのか、候補分析を履歴として保持しているのかを判別させない。これは Design 層の新規 traceability finding である。

## Finding Status

| ID          | Severity | 今回判定                 | 初出 / 前回状態                                | 状態根拠                                                                                                               |
| ----------- | -------- | ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DR-RN-001` | Major    | Resolved / no regression | RN Design review 001〜003                      | sync baseline と execution context、responsiveness gate、async escalation が維持される。                               |
| `DR-RN-002` | Major    | Resolved / no regression | RN Design review 001 / 002 Open → 003 Resolved | 全 RN runtime / registry / context に対する process-wide authority、ordering、teardown、stale rejection が維持される。 |
| `DR-RN-003` | Major    | Resolved / no regression | RN Design review 001〜003                      | RN-private adapter の existing public C ABI reuse と public C ABI non-exposure が維持される。                          |
| `DR-RN-004` | Major    | Resolved / no regression | RN Design review 001〜003                      | source → controlled build → target artifact → digest / provenance → npm assembly の trust chain が維持される。         |
| `DR-RN-005` | Major    | **Open / New**           | 今回初出                                       | 承認済み RN platform baseline と canonical Design の現行 `NEEDS USER DECISION` 表記の status / traceability が未同期。 |

### Open findings

- Critical: 0
- Major: 1（`DR-RN-005`）
- Minor: 0

### Reopened findings

なし。`DR-RN-001〜DR-RN-004` は解決状態を維持している。`DR-RN-005` は旧 finding の再オープンではない。

### New finding IDs

`DR-RN-005` の1件。

## Required Changes

Formal Design Gate を不合格にする Critical はないため、Gate の必須差し戻しはない。ただし `DR-RN-005` を close するには Design 層で次を行う必要がある。

1. [`architecture.md`](../../design/architecture.md) §12.4、§12.6 の RN-specific platform status を、[`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) の approved input と明示する。`Browser baseline` は RN decision の対象外なので、別の未決定状態として区別する。
2. [`bindings.md`](../../design/bindings.md) §12.13 の RN version、Android API、iOS version、Android ABI、iOS architecture、New Architecture、Expo の7項目について、候補比較を履歴 / 非規範としてラベル付けするか、approved baseline への trace と現行状態へ更新する。
3. Design の責務・topology・security architecture を変更せず、候補分析を残す場合も「承認済み baseline が優先し、表は過去の選択肢比較である」ことを明示する。

この correction は platform value の再決定や Specification の変更を要求しない。

## Optional Improvements

`DR-RN-005` 以外の Design-level New / Open / Reopened finding はない。queue、lock、worker、callback、JNI / Swift class、exact artifact build command、benchmark threshold は下流委譲のままでよく、Design へ追加しない。

## Resolved Findings

`DR-RN-001〜DR-RN-004`、Architecture `DR-001〜DR-009`、Security Design `DR-001〜DR-012`、Bindings Design `DR-001〜DR-006` の resolution に回帰はない。特に process-wide coordination は RN domain に閉じ、Node / Browser / Extension の backend policy を変更していない。

## Upstream Feedback

なし。Concept / Requirements の目的、scope、Core authority、single package、security boundary、non-regression、support decision lane および responsiveness policy は Design の評価に十分である。`DR-RN-005` の修正対象は上流ではなく canonical Design である。

## Deferred Findings

- Native runtime、Android / iOS device / simulator、Expo build、ABI / slice、artifact digest / provenance、package assembly の実証。
- process-wide contention、starvation、JS blocking、resource、cancellation / interruption、cleanup および stale result の実測。
- exact queue / fairness / worker / lock / generation / callback / lifecycle primitive、JNI / Swift / Objective-C++ の実装方式。
- Browser baseline の package-wide decision と、negative evidence 後の async / RN support exclusion decision。

これらは Design の責務・境界・invariant が下流で検証されるための事項であり、今回の `DR-RN-005` とは別である。

## Scope and Traceability

### Concept → Requirements → Design

Concept の RN coverage、single repository / package、shared Rust Core、Core の secret authority、Application / host boundary は Requirements `NFR-006〜NFR-010`、`NFR-014`、`AC-051〜AC-057` を経て `architecture.md` / `bindings.md` / `security.md` §12 に配置される。Requirements の sync / responsiveness decision gate は `architecture.md` §12.3 と bindings / security の lifecycle / failure boundary に追跡できる。

### Design → Specification

| Design responsibility                                           | RN Specification contract                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| private RN path、RN native-only routing、no backend fallback    | `react-native.md` §§1〜3、`npm-typescript-facade.md` §§9〜16 |
| existing 16-operation synchronous facade、no RN-only API        | `react-native.md` §2、common facade §§3〜8                   |
| process-wide admission / serialization / runtime-local context  | `react-native.md` §§5〜10                                    |
| buffer ownership、strict encoding、C ABI reuse                  | `react-native.md` §§11〜12、common `specification.md` §13    |
| Android / iOS native boundary、artifact、Expo、New Architecture | `react-native.md` §§13〜21                                   |
| failure, secret cleanup, evidence and re-baseline               | `react-native.md` §§19〜25、Requirements `AC-055〜AC-061`    |

### Platform decision status

`PD-RN-001〜PD-RN-007` は approved input であり、Specification は RN `0.86.x / 0.87.x` window、Android API 24、Bare iOS 15.1+、Expo subset、arm64 / x86_64、iOS arm64、New Architecture mandatory、TurboModule / JSI required、Expo Go unsupported を反映している。Design の old status 表記だけが未同期であり、値そのものの Design / Specification conflict はない。

### Runtime / package consistency

Node.js normal は Node native、Node `--no-addons` / Browser / Browser Extension は package-local WASM、RN は `react-native` private entry + native artifact である。all paths use the same facade / Rust Core and one npm package. RN coordinator / artifact policy does not become a Node / Browser policy.

## Domain Checks

| 評価項目                        | 結果              | 根拠                                                                                                                                     |
| ------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 目的・範囲                      | PASS              | RN は shared Core の利用環境であり、別 Wallet Core / package を導入しない。                                                              |
| 責務・依存方向                  | PASS              | facade → private RN → native → C ABI → Core の一方向を維持する。                                                                         |
| Runtime boundary                | PASS              | Node、Browser / Extension、RN の routing と fallback policy を混同しない。                                                               |
| Platform boundary               | PASS with finding | Specification / decision は exact baseline。Design の RN-specific status 表記のみ `DR-RN-005`。Browser baseline は別 lane として未決定。 |
| Secret / security authority     | PASS              | Rust Core が secret、crypto、authorization、Store integrity、zeroization authority。Binding は authority ではない。                      |
| Lifecycle / concurrency         | PASS              | process-wide coordinator、runtime-local teardown、stale rejection、no secret queue、no forced kill を追跡できる。                        |
| API / DTO / sync contract       | PASS              | existing 16 operations、DTO、binary、error、sync public contract を変更しない。                                                          |
| Single repository / package     | PASS              | RN artifacts / private entry を同一 package に束ね、RN-only package を作らない。                                                         |
| Existing runtime non-regression | PASS              | Node.js policy、Browser / Extension WASM、C ABI、public facade、release / supply-chain boundary を RN domain と分離する。                |
| Symbol / NEM / Network          | PASS              | Design は protocol semantics を再定義せず、Core / Specification の chain / network distinction を維持する。                              |

## Validation Results

| 検証                      | 結果                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch / HEAD             | `agent/react-native-support` / `eae6d08e1bbe14f2f4390c5cb3ac4a551947166e` を確認。                                                           |
| Canonical source state    | Review 開始時点で Concept / Requirements / Design / Specification / decision は未変更。直前 HEAD 差分は Specification review artifact のみ。 |
| Existing Design findings  | RN `DR-RN-001〜004`、Architecture / Security / Bindings Design の既存 resolution を確認。                                                    |
| Decision / Spec alignment | `PD-RN-001〜007` の approval と RN Specification の反映値を照合。                                                                            |
| Docs-only validation      | 本 artifact 作成後に `git diff --check`、Markdown heading / relative link の確認を実施する。実装 / runtime test は対象外。                   |

## Review Gates

| Gate                               | 結果                           | 根拠                                                                                     | 対応                                       |
| ---------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1. 目的と範囲                      | PASS                           | shared Rust Core、RN scope、single package が明確。                                      | なし                                       |
| 2. Context / 責務 / trust boundary | PASS                           | Core / binding / Application / host の ownership が明確。                                | なし                                       |
| 3. 依存方向                        | PASS                           | private RN path と existing C ABI reuse が一方向。                                       | なし                                       |
| 4. 主要フロー / lifecycle          | PASS                           | initialization、admission、teardown、stale、failure が配置される。                       | なし                                       |
| 5. データ所有                      | PASS                           | Store / secret / temporary buffer / current Store の責任が分離される。                   | なし                                       |
| 6. Security / interoperability     | PASS                           | secret authority、fail-closed、Symbol / NEM、Network、existing runtime boundary を維持。 | なし                                       |
| 7. 上流整合性                      | PASS with non-blocking finding | Requirements / decision / Spec の値は一致し、Design の status marker のみ未同期。        | `DR-RN-005`                                |
| 8. 下流実装可能性                  | PASS with non-blocking finding | Specification は推測なしに進められるが、Design status の明示が望ましい。                 | `DR-RN-005`                                |
| Critical finding                   | PASS                           | 0 件。                                                                                   | なし                                       |
| Formal Review Gate                 | **READY**                      | Critical がなく、Major のみでは Gate failure にならない。                                | `DR-RN-005` を次回 Design refresh で close |

## Remaining Risks and Open Decisions

`DR-RN-005` 以外の Design-level Open Decision はない。`DR-RN-005` の原因は approved platform baseline 後の Design status synchronization であり、platform value の再判断ではない。Browser baseline は RN decision に含まれず、別の既存 package policy として残る。

実装開始後には、RN 0.86.x / 0.87.x、Android API 24、approved ABI、iOS slices、Expo subset、New Architecture、artifact trust chain、process-wide lifecycle、blocking / resource / cleanup と既存 runtime non-regression の evidence が必要である。

## Automatic Changes

この review artifact のみを新規作成する。canonical Concept、Requirements、Design、Specification、Platform Decision、実装、テスト、fixture、README、package、CI / release workflow および既存 review artifact は変更しない。

## Final Decision

**DESIGN PHASE REVIEW GATE: READY WITH `DR-RN-005` OPEN**

Design の Critical は0件であり、formal gate は `READY`。ただし、現行 canonical Design の RN-specific platform status を approved decision と整合する表示へ更新することが、`DR-RN-005` を解消するために必要である。これは Design 層の修正であり、Requirements、Specification、Concept または platform value の再変更は不要である。

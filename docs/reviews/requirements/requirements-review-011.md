# Requirements Review 011 — React Native cross-layer review

## Review Target

| 項目                         | 内容                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                   | `nemnesia/symbol-nem-wallet-core`                                                                                                                                                                       |
| Branch                       | `agent/react-native-support`                                                                                                                                                                            |
| Reviewed HEAD                | `eae6d08e1bbe14f2f4390c5cb3ac4a551947166e`                                                                                                                                                              |
| Canonical Requirements       | [`requirements.md`](../../requirements/requirements.md)                                                                                                                                                 |
| Upstream Concept             | [`concept-sheet.md`](../../consept/concept-sheet.md) — Concept review 012 `READY`                                                                                                                       |
| Previous Requirements Review | [`requirements-review-010.md`](requirements-review-010.md) — `READY`                                                                                                                                    |
| Downstream evidence          | RN Design review 003、Platform Baseline Decision Gate、Specification review 015、canonical Design / Specification                                                                                       |
| Review date                  | 2026-09-05 (Asia/Tokyo)                                                                                                                                                                                 |
| Review scope                 | Requirements 単体の再確認、Concept 追跡、RN support / runtime / security / non-regression 要求、下流への委譲、approved platform decision、既存 finding の回帰および Concept → Specification consistency |
| Unvalidated scope            | 実装、Node / Browser / RN runtime、native artifact、device / simulator、package assembly、CI、release および性能実測                                                                                    |

下流資料はユーザーが明示した cross-layer consistency の確認のため補助的に参照した。下流の API・binding 方式・artifact detail を Requirements の新規要求へ逆生成していない。

## Execution Audit

`requirements-review` Skill、`review-common` playbook、reviewer policy、security checklist、gate policy および共通 output format を適用した。サブエージェントは使用せず、Chair が次の3パスを独立に確認した。

1. **明確性・完全性**: RN の利用環境、機能、非機能、acceptance、未決定事項および下流委譲を確認した。
2. **価値・範囲**: Concept と同じ single repository / package、全 runtime coverage、既存 Node / Browser / Extension 非退行を確認した。
3. **Security primary**: Rust Core authority、Binding non-authority、secret lifecycle、authorization、failure-safe、Chain / Network 分離を確認した。

加えて、Concept → Requirements → Design → Specification の traceability、approved platform decision による RN-specific TBD の解消、および既存 `RR-*` / `UF-RN-001` の状態を反証した。

## Evidence Used

| 区分                         | 資料 / 確認内容                                                                                                                                                                                     | 用途                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 作業指針                     | [`AGENTS.md`](../../../AGENTS.md)                                                                                                                                                                   | phase boundary、Source of Truth、security、scope、docs-only validation          |
| Review policy                | [`requirements-review/SKILL.md`](../../../.agents/skills/requirements-review/SKILL.md)、review-common playbook / reviewers / checklist / gates / output format                                      | reviewer path、formal finding、gate、artifact 形式                              |
| Upstream Concept             | [`concept-sheet.md`](../../consept/concept-sheet.md) §1、§7〜§10、§13                                                                                                                               | RN scope、shared Core、single package、責任境界、success condition              |
| Concept Review               | [`concept-sheet-review-012.md`](../concept/concept-sheet-review-012.md)                                                                                                                             | Concept `READY` と cross-layer 上流状態                                         |
| Canonical Requirements       | [`requirements.md`](../../requirements/requirements.md) §1〜§12、`NFR-006〜NFR-015`、`AC-051〜AC-061`                                                                                               | RN 要求、security、failure、API parity、non-regression、support / evidence gate |
| Previous Requirements Review | [`requirements-review-010.md`](requirements-review-010.md)                                                                                                                                          | `UF-RN-001`、`RR-001〜RR-029`、直前 Gate                                        |
| Design                       | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md)                                                             | Requirements の責務・境界・lifecycle 配置と下流委譲                             |
| Design Review                | [`react-native-design-review-003.md`](../design/react-native-design-review-003.md)                                                                                                                  | `DR-RN-001〜DR-RN-004` の解決履歴                                               |
| Approved decision            | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md)                                                                                                            | Requirements が下流 decision として委譲した RN platform 値の承認状態            |
| Specification                | [`react-native.md`](../../specifications/react-native.md)、[`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md)、[`specification.md`](../../specifications/specification.md) | Requirements の API / routing / Core / security / non-regression trace          |
| Specification Review         | [`specification-review-015.md`](../specifications/specification-review-015.md)                                                                                                                      | `SR-001〜SR-028` の resolution と Spec Gate                                     |

## Review Result

`READY`

## Summary

Requirements は RN Android / iOS を同一 Rust Wallet Core の利用環境として要求し、single repository / single npm package、既存 public API parity、Node.js / Browser / Browser Extension / WASM / native Node の非退行、Core security authority、Binding non-authority、fail-closed、secret cleanup および application current Store responsibility を維持している。

`NFR-008`、`NFR-015`、`AC-054〜AC-061` は synchronous public contract を compatibility baseline としつつ、RN の blocking / responsiveness / resource / cleanup に否定的 evidence が出た場合だけ async contract または support exclusion を user decision に戻す。これは `UF-RN-001` の resolution と整合する。

RN-specific platform 値は Requirements 自身が具体値を決めず、別 decision gate へ委譲していた。承認済み `PD-RN-001〜PD-RN-007` がその委譲を解消し、Specification が値を反映している。Requirements の抽象度・既存の未決定事項・下流委譲を欠陥として扱う必要はない。

## Finding Status

| 区分              | 件数 / 状態                                 |
| ----------------- | ------------------------------------------- |
| New findings      | 0                                           |
| Open findings     | Critical 0 / Major 0 / Minor 0              |
| Reopened findings | 0                                           |
| `UF-RN-001`       | Resolved（Design からの upstream feedback） |
| `RR-001〜RR-029`  | Resolved / no regression                    |

### Open findings

なし。

### Reopened findings

なし。Requirements 本文の RN-specific `NEEDS USER DECISION` は、要件更新時に具体値を固定しないという下流委譲の記述であり、approved decision により現在の support claim が確定したことと矛盾しない。これは Requirements finding の再オープンではない。

### New finding IDs

なし。

## Required Changes

なし。Requirements の Gate を不合格にする Critical、または現行の外部要求を欠落させる finding は確認されなかった。

## Optional Improvements

なし。exact platform value、API、DTO、error、binding、artifact、thread、performance threshold は Requirements に追加しない。`docs/design` の RN platform status 表記に関する current cross-layer finding は Design 層で扱い、Requirements は変更対象としない。

## Resolved Findings

- `UF-RN-001`: `Resolved`。sync baseline、RN responsiveness / resource evidence、failure cleanup、compatibility impact、async / exclusion decision gate および silent divergence 禁止が要求・受入条件へ反映されている。
- `RR-001〜RR-029`: `Resolved / no regression`。Profile / Store / authorization、Chain / Network、handoff / export / signing、version、failure-safe、Core / Binding / Application boundary、non-regression を再確認した。

## Upstream Feedback

なし。Concept review 012 は `READY` で、Concept の目的、v1 boundary、shared Core、single package、security invariant および host guarantee limit は Requirements へ十分に引き継がれている。

## Deferred Findings

Requirements が明示的に下流へ委譲する事項は未解決 Requirements finding ではない。

- binding topology、runtime resolution、package exports、ownership / lifetime、error mapping、artifact trust chain。
- exact operation contract、buffer、serialization、crypto / Store、platform support matrix の implementation / release detail。
- representative device / simulator、blocking、resource、cancellation / interruption、cleanup の evidence、threshold、async contract。

## Scope and Traceability

### Concept → Requirements

Concept §1、§7〜§10、§13 の RN coverage、single repository / package、shared Rust Core、Core / Application / host boundary、通常処理での secret non-disclosure は Requirements §1〜§3、`NFR-006〜NFR-010`、`AC-051〜AC-057` に追跡できる。Concept にない RN-only Core、host security guarantee、別 package または別 public model は追加されていない。

### Requirements → Design

`NFR-008`、`NFR-009`、`NFR-010`、`NFR-014`、`NFR-015` および `AC-054〜AC-061` は、Design の Core / C ABI / RN adapter / Application hierarchy、process-wide coordinator、lifecycle、failure、secret boundary および evidence handoff へ追跡できる。Design の候補表に残る RN-specific status 表記は Design の traceability issue であり、Requirements の要求内容を欠落させるものではない。

### Design → Specification

Specification は Requirements が要求した public parity、same Core、fail-closed、security authority、non-regression、support / evidence gate を具体化している。Design が固定しなかった exact implementation detail を Specification が勝手に public API や別 requirement として拡張していない。

### Runtime / platform matrix

`NFR-006`、`NFR-007`、`NFR-011〜NFR-014`、`AC-051〜AC-060` は、Node.js、Browser、Browser Extension、RN Android / iOS および既存 Desktop の関係を一つの package / Core 方針へ接続する。Node.js `engines.node >=22.0.0`、22.x minimum / support、24.x primary は維持され、RN が Node / WASM backend を要求しない。Browser Extension は Browser runtime の利用形態として維持される。

### Platform decision bridge

Requirements §1.3、§11、`NFR-012`、`NFR-013`、`AC-058`、`AC-059` は RN version、Android / iOS floor、ABI / architecture、New Architecture、Expo を別 decision と release gate に委譲していた。`react-native-platform-baseline.md` の `APPROVED` がこの decision lane を確定し、RN Specification §1.1、§13〜§21、§24 が反映する。Browser baseline はこの RN decision の対象外であり、既存 package-wide policy として別に扱う。

## Domain Checks

| 評価項目                   | 結果 | 根拠                                                                                                                                   |
| -------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 目的 / scope               | PASS | RN は v1 Core の利用環境であり、別 Wallet Core や別 package を要求しない。                                                             |
| API / DTO parity           | PASS | `NFR-008`、`AC-054` が existing consumer-facing model の一貫性と unnecessary RN API expansion の禁止を要求する。                       |
| Runtime consistency        | PASS | Node native / WASM、Browser / Extension WASM、RN native-only の役割分離を要求し、silent backend fallback を許容しない。                |
| Security boundary          | PASS | Core が secret / crypto / authorization authority、Binding が mediation、Application が user intent / current Store authority である。 |
| Failure / atomicity        | PASS | unsupported、load、invocation、security failure、partial state、stale result を success にしない。                                     |
| Symbol / NEM               | PASS | Chain-specific processing と Profile Network を区別し、共通化で意味を失わせていない。                                                  |
| Platform decision          | PASS | Requirements の委譲状態を approved decision が解消し、Specification が具体値を反映している。                                           |
| Existing resolved findings | PASS | `RR-001〜RR-029` および `UF-RN-001` に回帰なし。                                                                                       |

## Validation Results

| 検証                 | 結果                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Branch / HEAD        | `agent/react-native-support` / `eae6d08e1bbe14f2f4390c5cb3ac4a551947166e` を確認。                               |
| Change scope         | Canonical Requirements は review 開始時点で未変更。HEAD 直前の差分は review artifact のみ。                      |
| Formal artifacts     | Concept 012、Requirements 010、Design RN 003、Specification 015 と approved decision の状態を確認。              |
| Docs-only validation | 本 artifact 作成後に `git diff --check`、Markdown heading / relative link の確認を実施する。実装 test は対象外。 |

## Review Gates

| Gate                       | 結果      | 根拠                                                                                                          |
| -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| 目的・範囲・利用者         | PASS      | Concept の RN scope と一貫する。                                                                              |
| 機能 / 非機能 / acceptance | PASS      | RN operation、API parity、failure、security、non-regression、support / responsiveness evidence を追跡できる。 |
| 責任 / security            | PASS      | Core / Binding / Application / host の責任が逆流していない。                                                  |
| 検証可能性 / traceability  | PASS      | NFR / AC から Design、Specification、approved decision へ追跡できる。                                         |
| Critical finding           | PASS      | 0 件。                                                                                                        |
| Formal Review Gate         | **READY** | Requirements Skill の gate rule に適合。                                                                      |

## Remaining Risks and Open Decisions

Requirements 自体の Open finding はない。async contract / RN support exclusion は negative evidence が得られた場合だけ user decision に戻る。実装・release で platform artifact、runtime lifecycle、性能、resource、cleanup、package assembly および既存 runtime の証跡を確認する必要がある。Browser baseline は既存 package policy の decision lane として残る。

## Automatic Changes

この review artifact のみを新規作成する。Concept、Requirements、Design、Specification、decision、実装、テスト、fixture、package、README および CI / release workflow は変更しない。

## Final Decision

**REQUIREMENTS PHASE REVIEW GATE: READY**

Requirements は Concept と整合し、下流 Design / Specification とも要求の欠落・矛盾なく接続される。新規 / reopened Requirements finding はなく、`UF-RN-001` と `RR-001〜RR-029` の解決状態に回帰はない。

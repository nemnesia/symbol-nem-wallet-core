# Concept Review 012 — React Native cross-layer review

## Review Target

| 項目                           | 内容                                                                                                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                     | `nemnesia/symbol-nem-wallet-core`                                                                                                                                                                    |
| Branch                         | `agent/react-native-support`                                                                                                                                                                         |
| Reviewed HEAD                  | `eae6d08e1bbe14f2f4390c5cb3ac4a551947166e`                                                                                                                                                           |
| Canonical Concept              | [`concept-sheet.md`](../../consept/concept-sheet.md)                                                                                                                                                 |
| Previous Concept Review        | [`concept-sheet-review-011.md`](concept-sheet-review-011.md) — `READY`                                                                                                                               |
| Upstream / same-phase evidence | Concept review 011、Concept 本文                                                                                                                                                                     |
| Cross-layer evidence           | Requirements review 010、RN Design review 003、Platform Baseline Decision Gate、Specification review 015、canonical Requirements / Design / Specification                                            |
| Review date                    | 2026-09-05 (Asia/Tokyo)                                                                                                                                                                              |
| Review scope                   | Concept 単体の再確認に加え、Concept → Requirements → Design → Specification の RN scope、責任境界、single repository / single npm package、既存 runtime 非退行および解決済み finding の traceability |
| Unvalidated scope              | 実装、binding runtime、native artifact、device / simulator、package assembly、CI、release および性能実測                                                                                             |

本レビューは、ユーザーが明示した cross-layer review のため下流資料を補助的に参照した。ただし Concept の妥当性は Concept 自身の抽象度と上位方針を根拠に判定し、下流の API、形式または実装詳細を Concept の要求へ逆生成していない。

## Execution Audit

`concept-review` Skill、`review-common` playbook、reviewer policy、gate policy および共通 output format を適用した。サブエージェントは使用せず、Chair が次の3パスを独立に確認した。

1. **品質・論理**: RN Android / iOS の追加が目的、価値、用語、v1 境界および Concept の抽象度を変えていないか。
2. **課題・価値**: Desktop、Node.js、Browser、Browser Extension、RN Android / iOS を同一製品方針へ追跡できるか。
3. **境界・成立性**: shared Rust Core、Core / Application / host の責任、secret invariant、single repository / package および platform risk を確認した。

追加で、ユーザー指定に基づき下流の traceability を補助照合し、Concept の主張が下位層で欠落・矛盾または不要な拡張になっていないかを確認した。

## Evidence Used

| 区分                    | 資料 / 確認内容                                                                                                                                                                                     | 用途                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 作業指針                | [`AGENTS.md`](../../../AGENTS.md)                                                                                                                                                                   | phase boundary、Source of Truth、scope、security、docs-only validation        |
| Review policy           | [`concept-review/SKILL.md`](../../../.agents/skills/concept-review/SKILL.md)、review-common playbook / reviewers / gates / output format                                                            | Concept の3 reviewer path、finding、gate、artifact 形式                       |
| Concept                 | [`concept-sheet.md`](../../consept/concept-sheet.md) §1〜§13                                                                                                                                        | 目的、対象、v1、責任、single Core / package、security invariant、未決定事項   |
| Previous Concept Review | [`concept-sheet-review-011.md`](concept-sheet-review-011.md)                                                                                                                                        | `CR-001〜CR-012`、`CS-001〜CS-005` の解決状態と直前 Gate                      |
| Requirements            | [`requirements.md`](../../requirements/requirements.md) §1〜§12                                                                                                                                     | Concept からの RN / runtime / security / non-regression 引継ぎ                |
| Requirements Review     | [`requirements-review-010.md`](../requirements/requirements-review-010.md)                                                                                                                          | `READY`、`UF-RN-001` 解消および `RR-001〜RR-029` の非退行                     |
| Design                  | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md)                                                             | Core / binding / Application の責務、trust boundary、既存 runtime 境界        |
| Design Review           | [`react-native-design-review-003.md`](../design/react-native-design-review-003.md)                                                                                                                  | `DR-RN-001〜DR-RN-004` の解決履歴と Design の引継ぎ                           |
| Approved decision       | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md)                                                                                                            | RN platform baseline が Concept の scope を越えて具体化されたことの確認       |
| Specification           | [`react-native.md`](../../specifications/react-native.md)、[`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md)、[`specification.md`](../../specifications/specification.md) | shared public surface、RN routing、same Core、existing runtime non-regression |
| Specification Review    | [`specification-review-015.md`](../specifications/specification-review-015.md)                                                                                                                      | `SR-001〜SR-028` の解決状態と直前 Gate                                        |

## Review Result

`READY`

## Review Gate Rule

Concept Review Skill の7 Gate（明確さ、課題、対象ユーザーと価値、v1 境界、責任境界、内部整合性、成立性）を適用した。Concept に Gate を不合格にする Critical がないため `READY` とする。下流の platform decision や exact contract の不足は Concept の Gate failure としない。

## Summary

Concept は RN Android / iOS を既存の Desktop、Node.js、Browser、Browser Extension と同一の製品方針に追加し、単一の Rust Core、単一 repository、単一 npm package、環境共通の秘密情報責任および通常処理での非開示を維持している。

下位層では、Requirements が support / security / non-regression を要求し、Design が Core → C ABI → binding の責務境界と RN の lifecycle / coordination を配置し、Specification が既存16 operation、同一 DTO / error semantics、RN native-only routing および承認済み platform baseline を契約化している。Concept の目的・価値・境界を下位層が逸脱した証拠はない。

## Finding Status

| 区分              |                           件数 |
| ----------------- | -----------------------------: |
| New findings      |                              0 |
| Open findings     | Critical 0 / Major 0 / Minor 0 |
| Reopened findings |                              0 |
| `CR-001〜CR-012`  |       Resolved / no regression |
| `CS-001〜CS-005`  |       Resolved / no regression |

Concept の現在の正式 finding はない。下流 Design に確認した status traceability の改善余地は Concept の欠陥ではないため、Concept finding として採番していない。

## Required Changes

なし。Concept の目的、scope、責任境界および security invariant の修正は不要である。

## Optional Improvements

なし。RN platform の具体値、binding、package exports、artifact、performance evidence および release matrix は Concept の抽象度を越えるため、Concept へ追加しない。

## Resolved Findings

`CR-001〜CR-012` および `CS-001〜CS-005` は再発していない。特に、RN の追加による別 Core、別 package、別の secret authority、host compromise 保証の拡張、Symbol / NEM または Chain / Network の混同は確認されなかった。

## Upstream Feedback

なし。Concept より上流の正式資料はなく、現行 Concept の評価を妨げる不足・矛盾は確認されなかった。

## Deferred Findings

以下は Concept が後工程へ委譲しており、未解決 Concept finding ではない。

- RN version、Android / iOS floor、ABI / slice、New Architecture、Expo および Browser baseline の具体的 support policy。
- binding topology、runtime resolution、public API / DTO / error、ownership、lifetime、artifact、package assembly。
- sync / async の evidence、lifecycle / cancellation、native implementation、CI、release および device / simulator 検証。

## Scope and Traceability

### Concept → Requirements

`concept-sheet.md` §1、§7〜§10、§13 の RN Android / iOS、single repository / package、shared Rust Core、Core security authority、Application responsibility および host guarantee の限界は、Requirements §1〜§3、`NFR-006〜NFR-015`、`AC-051〜AC-061` へ追跡できる。Requirements は Concept にない独立 Core や RN-only package を追加していない。

### Requirements → Design

Requirements の platform-specific binding、Core / Binding / Application boundary、failure-safe、API parity、runtime non-regression および responsiveness decision gate は Design の `architecture.md` §12、`bindings.md` §12、`security.md` §12 へ配置されている。exact API、artifact、thread または crypto detail を Concept へ逆流させていない。

### Design → Specification

Design の topology、existing public C ABI reuse、RN binding non-authority、process-wide coordination、stale cleanup、no silent fallback および secret non-retention は RN Specification §§1〜25 へ具体化されている。Specification は Concept の single Core / package 方針を維持し、RN-only public API や Node / Browser fallback を導入していない。

### Runtime and package consistency

Node.js は Node native と許可された package-local WASM fallback、Browser / Browser Extension は existing WASM、RN Android / iOS は dedicated RN entry + native artifact と分離され、同じ facade / Rust Core を利用する。これは Concept の「環境差異を package 内部へ隠蔽する」方針と整合する。

## Domain Checks

| 評価項目                    | 結果 | 根拠                                                                                                                                      |
| --------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 課題・価値                  | PASS | 秘密情報処理の責任分散を shared Core へ集約する Concept の価値が RN 追加後も変わらない。                                                  |
| Platform coverage           | PASS | Desktop、Node.js、Browser、Browser Extension、RN Android / iOS の対象関係が明示され、Browser Extension と Mobile を別 Core としていない。 |
| Single repository / package | PASS | `nemnesia/symbol-nem-wallet-core` と `@nemnesia/symbol-nem-wallet-core` を維持し、RN-only package を導入していない。                      |
| Shared Rust Core            | PASS | Mnemonic、key、signing、secret management を環境別実装へ分散していない。                                                                  |
| Security boundary           | PASS | Core の継続的 secret authority、Application の user interaction / current Store responsibility、host compromise の保証限界が維持される。  |
| Public API concept          | PASS | 共通利用モデルを示すが、Concept で exact API / DTO / error を発明していない。                                                             |
| v1 / out-of-scope           | PASS | hardware、external signer、OS-backed key、watch-only、network client 等の out-of-scope を RN 対応が復活させていない。                     |
| Symbol / NEM separation     | PASS | Chain / Network、Symbol / NEM を一つの仕様へ暗黙に統合していない。                                                                        |

## Validation Results

| 検証                     | 結果                                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch / HEAD            | `agent/react-native-support` / `eae6d08e1bbe14f2f4390c5cb3ac4a551947166e` を確認。                                                           |
| Review scope diff        | HEAD 直前の canonical source は変更されず、直前の差分は Specification review artifact のみであることを確認。                                 |
| Existing artifact status | Concept 011、Requirements 010、Design RN 003、Specification 015 の Gate / finding status を確認。                                            |
| Docs-only validation     | 本レビュー artifact 作成後に `git diff --check`、Markdown heading / relative link の確認を実施する。Rust / binding / package test は対象外。 |

## Review Gates

| Gate                 | 結果      | 根拠                                                                   |
| -------------------- | --------- | ---------------------------------------------------------------------- |
| 明確さ / 課題 / 価値 | PASS      | RN 追加の理由と利用環境の関係が Concept で理解できる。                 |
| v1 boundary          | PASS      | RN は既存 Wallet Core の利用環境追加であり、別製品や別 Core ではない。 |
| 責任 / security      | PASS      | Core / Application / host の境界と保証限界が維持される。               |
| 内部整合性 / 成立性  | PASS      | 下流で scope の欠落・矛盾・不要な拡張は確認されない。                  |
| Critical finding     | PASS      | 0 件。                                                                 |
| Formal Review Gate   | **READY** | Concept Skill の gate rule に適合。                                    |

## Remaining Risks and Open Decisions

Concept 自体の Open Decision はない。下流で、platform baseline の再基準化、実装・release evidence、host compromise、native lifecycle および性能実測を確認する必要がある。Browser baseline は RN platform decision とは別の既存 package policy として扱う。

## Automatic Changes

この review artifact のみを新規作成する。Concept、Requirements、Design、Specification、decision、実装、テスト、fixture、package および CI / release workflow は変更しない。

## Final Decision

**CONCEPT PHASE REVIEW GATE: READY**

Concept は次工程の Requirements、Design、Specification と cross-layer で整合し、既存 finding の回帰もない。Concept の修正、reopen または新規 finding は不要である。

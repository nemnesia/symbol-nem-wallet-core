# Requirements Review Findings

## Review Target

- Reviewed branch: `agent/react-native-support`
- Reviewed HEAD: `82e8f3e04db920155bb174a58f997437a215aed6`
- Reviewed Requirements: [`docs/requirements/requirements.md`](../../requirements/requirements.md)
- Upstream Concept: [`docs/consept/concept-sheet.md`](../../consept/concept-sheet.md)
- Concept Review: [`concept-sheet-review-011.md`](../concept/concept-sheet-review-011.md) (`READY`)
- Previous Requirements Review: [`requirements-review-009.md`](requirements-review-009.md) (`READY`)
- Design Review: [`react-native-design-review-001.md`](../design/react-native-design-review-001.md)
- Trigger: `UF-RN-001` from the Design Review
- Review date: 2026-09-05 (Asia/Tokyo)
- Review scope: `UF-RN-001` resolution, `NFR-008` / `NFR-015` / `AC-061`, synchronous compatibility baseline, responsiveness and resource evidence, failure / cleanup, security boundary, runtime non-regression, support decision state, and semantic regression of existing Requirements.
- Unvalidated scope: Rust / Native / WASM / Node implementation, Android / iOS runtime execution, device / simulator performance, package assembly, and release execution. These are outside this document-only Requirements Review and the user-requested validation scope.

## Execution Audit

- Review method: Requirements Review Skill の Phase 0〜3、Review Board Chair による Reviewer A / B / C の独立観点確認、候補の反証・統合、既存 finding の再追跡および Requirements Gate 判定を適用した。
- Reviewer A（明確性・完全性）: `NFR-008`、`NFR-015`、`AC-054`、`AC-061`、§1.3、§11、§12.3 の MUST 条件、外部観測性、traceability、Requirements / Design boundary を確認した。
- Reviewer B（利用価値・スコープ）: Concept との整合、既存 runtime / platform の非退行、single repository / single npm package、API consistency、React Native の product support scope を確認した。
- Reviewer C（Security primary）: protected asset、Core / Binding / Application の責任、failure safety、atomicity、secret lifecycle、non-disclosure、Chain / Network separation が今回の性能方針で弱まっていないことを確認した。
- サブエージェントは使用していない。Chair が各観点を別パスで確認し、Phase 2 で重複候補を統合した。

## Evidence Used

| 種別                         | 参照資料 / 実行結果                                                                                                                                                                         | 用途                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 作業指針                     | [`AGENTS.md`](../../../AGENTS.md)                                                                                                                                                           | Source of Truth、phase boundary、scope discipline、security、change-aware validation、Git 運用             |
| Review Skill                 | [`requirements-review/SKILL.md`](../../../.agents/skills/requirements-review/SKILL.md)、review-common の playbook / reviewers / checklist / gates / output format                           | Reviewer 観点、finding 採用基準、Severity、Gate、artifact 形式                                             |
| Reviewed Requirements        | [`requirements.md`](../../requirements/requirements.md) §1.3、§2、§4〜§12、特に `NFR-008`、`NFR-009〜014`、`NFR-015`、`SEC-011`、`SEC-012`、`SEC-017`、`SEC-018`、`AC-054〜AC-061`          | 現行要件、責任境界、failure safety、公開 API、非機能要求および受入条件の直接確認                           |
| 上位 Concept                 | [`concept-sheet.md`](../../consept/concept-sheet.md) §1、§3〜§5、§7〜§10、§13                                                                                                               | React Native の位置付け、shared Rust Core、single repository / package、API 方針、security boundary の追跡 |
| Concept Review               | [`concept-sheet-review-011.md`](../concept/concept-sheet-review-011.md)                                                                                                                     | Concept の `READY`、Open / Reopened finding なし、Requirements への引継ぎを確認                            |
| Previous Requirements Review | [`requirements-review-009.md`](requirements-review-009.md)                                                                                                                                  | `RR-001〜RR-029` の状態、直前 Gate `READY`、直前の既存 Requirements integrity を確認                       |
| Trigger Review               | [`react-native-design-review-001.md`](../design/react-native-design-review-001.md) §3、§10、§12、§15                                                                                        | `UF-RN-001` の不足、解消条件、Design 側の downstream follow-up を確認                                      |
| Reviewed HEAD diff           | `git show 82e8f3e04db920155bb174a58f997437a215aed6 -- docs/requirements/requirements.md`                                                                                                    | Requirements 変更が `NFR-008`、`NFR-015`、`AC-061`、§1.3、§11、§12.3 に限定されることを確認                |
| Repository state             | `git status --short --branch`、`git rev-parse --abbrev-ref HEAD`、`git rev-parse HEAD`、`git diff --name-only`、`git diff --cached --name-only`、`git ls-files --others --exclude-standard` | branch、HEAD、レビュー開始時の変更範囲、正本未変更を確認                                                   |

## Review Result

`READY`

## Summary

`UF-RN-001` は解消された。`NFR-008` は既存 synchronous public API を compatibility baseline としつつ、React Native の safety、responsiveness、resource boundedness を犠牲にして同期性を絶対化しない。`NFR-015` と `AC-061` は、代表的な実行環境・native build・入力 / Store 条件における execution cost、JS runtime blocking、responsiveness、resource behavior、cancellation / interruption、failure cleanup および compatibility impact を下流で evidence 化できる要求へ具体化している。

同時に、evidence が同期 contract の安全な維持不能を示した場合でも、対象 operation と影響範囲を記録し、async contract または React Native support exclusion の採否を user decision とする。user decision なしの Promise 化、automatic async fallback、runtime ごとの silent semantic divergence は禁止されている。したがって同期性を絶対要件とも、実装者判断で async 化可能とも読めない。

今回の追加は Requirements レベルの評価可能性と decision gate に留まり、exact threshold、benchmark device、worker / queue、thread、timeout value、cancellation API、Promise shape、native scheduler、RN adapter serialization、C ABI または artifact trust-chain の方式を決定していない。既存の fail-closed、atomicity、no partial state、no secret leakage / retention、Rust Core authority および既存 runtime policy の意味も維持されている。

## Finding Status

### Findings summary

- New findings: なし
- Open findings: Critical 0 / Major 0 / Minor 0
- Reopened findings: なし
- New finding IDs: なし
- `UF-RN-001`: `Resolved`（Design Review 由来の upstream feedback。Requirements の formal finding ID ではない）

### Open findings

なし。

### Reopened findings

なし。既存 `RR-001〜RR-029` の再発は確認されなかった。

### New finding IDs

なし。`UF-RN-001` を `RR-*` として再採番していない。

### Existing finding status

直前レビューの `RR-001〜RR-029` を現行 Requirements と今回の HEAD 差分へ再追跡し、すべて `Resolved / no regression` と確認した。

| ID             | Severity      | Status   | 今回の状態根拠                                                                                                                                                    |
| -------------- | ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RR-001〜RR-004 | Major / Minor | Resolved | `§3`、FR-006、SEC-010、SEC-015、AC-002、AC-006、AC-025〜AC-026、AC-032 の互換性・保存・秘密情報返却境界を今回の変更は変更していない。                             |
| RR-005〜RR-008 | Major         | Resolved | `§1.2`、§2.3、FR-007、SEC-013〜SEC-015、AC-001、AC-007、AC-030〜AC-032 の根拠追跡・認証・非開示を維持している。                                                   |
| RR-009〜RR-017 | Major / Minor | Resolved | FR-003〜FR-005、FR-021、SEC-017〜SEC-019、AC-003〜AC-005、AC-038〜AC-039 の登録、妥当性、atomicity、Profile 分離を今回の性能要求は弱めていない。                  |
| RR-018〜RR-022 | Major / Minor | Resolved | Concept traceability、Chain / Network、handoff、削除責任および失敗時非成功を維持している。                                                                        |
| RR-023〜RR-025 | Major         | Resolved | 署名承認、explicit export、全環境共通の秘密情報非開示と host compromise の保証限界を維持している。                                                                |
| RR-026〜RR-029 | Major / Minor | Resolved | v1 migration 非提供、unsupported data の reject、Derived fail-closed、`§1.3` / §12 の下流委譲を維持している。今回の §1.3 / §12.3 補強はこれらを再発させていない。 |

## Required Changes

なし。Requirements Review Gate を不合格にする `Critical` の New / Open / Reopened はない。

## Optional Improvements

なし。今回の Review Result を `READY` から変更する Major / Minor finding はない。下流での evidence record、operation class、timeout / cancellation の外部契約化は `Deferred Findings` として引き継ぐ。

## Resolved Findings

- `UF-RN-001`: `Resolved`。synchronous public contract と React Native responsiveness / resource behavior の関係、evidence の必要性、async 化条件、compatibility impact、user decision gate および silent divergence 禁止が `NFR-008`、`NFR-015`、`AC-061`、§1.3、§11、§12.3 に反映された。
- `RR-001〜RR-029`: `Resolved / no regression`。直前 Requirements Review の状態を維持した。

## Upstream Feedback

なし。`UF-RN-001` は本レビューの Trigger として確認・解消した upstream feedback であり、現在の Requirements から上流へ返す新しい不足・曖昧さ・矛盾はない。

## Deferred Findings

### Design / Specification follow-up

- `DR-RN-001〜DR-RN-004` は Design Review artifact 上では Open の downstream Design findings として扱われている。本 Requirements Review はそれらを close / reopen しない。`UF-RN-001` の解消後、次の Design Review で各 finding の正式 Resolution を確認する。
- Design / Specification では、operation class ごとの execution model、representative input / Store boundary、JS blocking / responsiveness の evidence、timeout / cancellation / interruption の observable behavior、result delivery、failure cleanup、no partial state、no stale result、secret non-retention および compatibility impact の記録方法を定義・検証する。
- exact ms threshold、benchmark device、worker / queue / thread、timeout value、cancellation API、Promise shape、native scheduler、C ABI reuse、TurboModule / JSI、artifact trust chain、build / package format は本 Requirements の finding ではなく、下流で決定・検証する事項である。

### Requirements follow-up

通常の Requirements correction は不要である。否定的な prototype / benchmark / 実測 evidence が得られた場合だけ、対象 operation、evidence、影響範囲、compatibility impact および async contract / support exclusion の候補を記録し、採否を `NEEDS USER DECISION` として再提案する。

## Scope and Traceability

### Concept alignment

Concept は React Native Android / iOS を Mobile の実行環境として扱い、single repository / single npm package、shared Rust Core、runtime / platform によらない Core の秘密情報管理責任と通常処理での非開示を定めている。Requirements の `NFR-008` / `NFR-015` / `AC-061` はこの責任境界を変更せず、RN の実行品質を評価可能にする下位要求を追加している。Concept の目的、v1 scope、Core / UI / Application の責任、out-of-scope および success condition との矛盾はない。

### UF-RN-001 trace

Design Review の不足は、(1) synchronous public contract と RN JS blocking の関係、(2) resource boundedness / responsiveness、(3) performance evidence、(4) timeout / cancellation / interruption の評価可能性、(5) async 化条件、(6) compatibility impact、(7) user decision gate であった。現行本文では `NFR-008`、`NFR-015`、`AC-061` および §11 がそれぞれを外部要求・受入条件・条件付き decision として接続している。`NFR-015` は具体値を決定せず、下流の evidence に委譲している。

### Runtime matrix and non-regression trace

`NFR-006`、`NFR-011〜NFR-014`、`FR-019`、`AC-051〜AC-060` は React Native Android / iOS を同一 Rust Core の対象とし、single repository、single npm package、Node.js 22.x / 24.x policy、Browser / Browser Extension、WASM、native Node、public API compatibility、security boundary、release / supply-chain guarantee を RN 対応前後で維持する。minimum RN / Android API / iOS / Browser baseline、ABI / architecture、New Architecture、Expo は §11 の product decision として残り、Node.js 22 / 24 は未決定へ戻されていない。

## Domain Checks

### UF-RN-001 status

`Resolved`。要求レベルで必要な property と判定経路が追加され、Design が sync / async と resource policy を実装者の推測だけで選ばなくてよい状態になった。exact execution mechanism は下流委譲のままである。

### API Consistency

`NFR-008` と `AC-054` は、同一 operation の application-facing contract consistency、RN-only public API expansion の禁止、Android / iOS 差異だけによる分岐の禁止を維持している。既存 synchronous public API は compatibility baseline だが、RN safety / responsiveness / resource boundedness を犠牲にしてまで同期性を絶対化していない。否定的 evidence の場合も対象 operation・影響・compatibility impact を記録し、user decision 前の async 化、Promise 化、automatic fallback、runtime-specific silent divergence を禁止している。同期性を絶対要件とも、実装者が自由に async 化できるとも読めない。

### Responsiveness / Resource Policy

`NFR-015` は、potentially expensive な operation について execution cost、JS runtime thread の blocking、responsiveness、bounded input / Store size との関係、resource behavior、cancellation / interruption の可能性、failure cleanup を評価対象にしている。`NFR-008` と §11 は、synchronous execution が safe responsiveness、resource boundedness、lifetime / cleanup または必要な interruption semantics を満たせない場合の条件付き decision を定める。高コスト候補は「高コストである」と断定されず、`含め得る` として evidence で判定される。

### Testability

`AC-061` は、Android / iOS の代表的 execution environment、production-equivalent native build、代表的 Store / input size、合理的 worst-case input class を条件に、execution cost、JS blocking、responsiveness、resource behavior、cancellation / interruption、failure cleanup を測定・評価できることを要求する。否定的 evidence の場合は対象 operation、影響範囲、compatibility impact、async contract / support exclusion の候補が記録される。exact benchmark protocol、threshold、device、timeout value、cancellation API は固定していないため、testability と Design / Specification の裁量を両立している。timeout-specific observable contract は下流で cancellation / interruption semantics と併せて定義する。

### Potentially Expensive Operations

NFR-015 は password KDF、Store encrypt / decrypt、Mnemonic seed / derivation、key derivation、signing、大きな Store processing を候補として列挙するが、常に高コストとは仮定しない。候補列挙は性能リスクを無視しないための Requirements-level scope であり、具体的な cost model や implementation class を決めていない。

### Failure / Cleanup

`SEC-017`、`SEC-018`、`AC-037`、`AC-038`、`AC-055`、§10 が、失敗・中断後の no partial state、atomic / fail-closed、no secret leakage、no continued secret retention を維持する。`AC-048` は current Store / replacement Store の適用と stale / historical Store の再適用防止責任を追跡し、`AC-056` は failure の success 扱いと silent fallback を禁止する。今回の cancellation / interruption 評価要求は、partial Store mutation、stale result、temporary secret residue または silent fallback を許可する例外を追加していない。

### Security Boundary

`NFR-009`、`SEC-011〜SEC-012`、`SEC-014`、`SEC-017〜SEC-020`、`AC-055` により、Rust Core が secret management、validation、authorization、cryptographic processing の authority であり、Binding は authority ではない。Application は current Store authority と user intent / confirmation の責任を持つ。性能・threading・resource evidence を理由に security-sensitive business logic を React Native binding へ移す要求はなく、Core validation bypass も許されない。

### Non-Regression

既存の public operation set は `FR-019`、`AC-015`、`AC-021〜AC-022`、`AC-040` および `NFR-006` に追跡でき、今回の変更は operation の追加・削除・API field・error semantics を行っていない。`NFR-007` の single repository / single npm package、`NFR-011` の Node.js、Browser、Browser Extension、WASM、native Node、public API、security boundary、release / supply-chain non-regression、`NFR-012` の Node.js 22.x / 24.x policy は再オープンされていない。RN responsiveness 要求は既存 runtime の policy を変更する fallback ではない。

### NEEDS USER DECISION

現在残る product support decision は次の8項目である。

1. minimum React Native version
2. minimum Android API level
3. minimum iOS version
4. supported browser baseline
5. React Native Android の supported CPU architecture matrix
6. React Native iOS の supported device / simulator architecture matrix
7. React Native New Architecture mandatory / legacy compatibility
8. Expo support scope

同期 / 非同期は「常時未決定」ではない。既存 synchronous public API が compatibility baseline として決定済みであり、NFR-015 / AC-061 の negative evidence が synchronous safety を否定した operation についてのみ、async contract または RN support exclusion の採否を future `NEEDS USER DECISION` とする。Node.js `engines.node >=22.0.0`、22.x minimum / support line、24.x primary verification line、single repository、single npm package、Browser Extension の Browser runtime 扱いは再オープンされていない。

### Acceptance Criteria Coverage

| 対象               | 評価                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AC-054`           | API consistency、不要な RN-only divergence / expansion の禁止を維持。synchronous baseline と safety exception は `NFR-008` へ追跡可能。                                                                                                                                                          |
| `AC-055`〜`AC-056` | Core authority、secret cleanup、failure identification、fail-closed、no silent fallback を維持。                                                                                                                                                                                                 |
| `AC-057`〜`AC-060` | 既存 runtime、Node policy、single package、support / architecture decision と consumer routing の非退行を維持。                                                                                                                                                                                  |
| `AC-061`           | 高コスト候補について execution cost、blocking、responsiveness、resource、representative conditions、cancellation / interruption、failure cleanup を外部から測定・評価可能にし、negative evidence 時の compatibility impact と decision gate を要求。過剰な API / benchmark protocol 固定はない。 |

`AC-061` は複数の測定観点を含むが、いずれも「RN 上の同期 contract を安全に維持できるか」を判定する同一の acceptance objective に属する。既存 failure / security 条件を置き換えず、対象条件と decision record を明示するため、検証不能な過積載とは判定しない。

### Existing Requirements Integrity

- `NFR-008`: synchronous contract は baseline に留まり、absolute requirement ではない。negative evidence と user decision gate が追加され、API consistency と safety の関係が明示された。
- `NFR-010`、`NFR-011`、`NFR-012`、`NFR-014`: fail-closed、non-regression、Node.js 22 / 24 policy、consumer routing は意味を維持し、RN responsiveness 対応を理由に再オープンされていない。
- `NFR-015`: 新規 MUST は性能・resource・cleanup evidence の評価可能性であり、exact implementation / threshold を固定していない。
- `SEC-011`、`SEC-012`、`SEC-017`、`SEC-018`: Binding の非 authority、secret lifetime、temporary copy、atomicity、failure / interruption safety は緩和されていない。
- `AC-054`、`AC-056`、`AC-057`、`AC-058`、`AC-060`: API consistency、failure、runtime non-regression、support matrix、consumer routing は維持されている。
- `AC-061`: `NFR-008` / `NFR-015` を一意に受け、外部観測可能な evidence と decision record を要求する。一方、`AC-061` が既存の AC-055 / AC-056 / AC-057 の責任を上書きする記述はない。

### Requirements / Design Boundary

Requirements に留まっているものは、safety / responsiveness を評価可能にすること、sync baseline、evidence、compatibility impact、user decision gate、silent divergence 禁止および Core security boundary である。以下は固定されていない。

- exact ms threshold、benchmark device、Store byte limit、worker thread、queue、mutex、scheduler、native execution topology
- exact timeout、cancellation API、interruption API、Promise shape、result delivery API、error code / mapping
- JSI、TurboModule、Legacy Native Module、JNI、Swift、Objective-C++、C ABI reuse、RN adapter serialization
- Android / iOS artifact format、ABI / slice packaging、release trust chain、build command

`§12.3` は上記を下流の仕様・設計・性能検証へ引き継ぐと明示しており、今回の変更は Design / Specification の詳細へ踏み込んでいない。

## Validation Results

- 実施: `git rev-parse --abbrev-ref HEAD` で branch `agent/react-native-support` を確認した。
- 実施: `git rev-parse HEAD` で Reviewed HEAD が `82e8f3e04db920155bb174a58f997437a215aed6` と一致することを確認した。
- 実施: Concept Review 011 の `READY`、Previous Requirements Review 009 の `READY`、Design Review 001 の `UF-RN-001` 内容を確認した。
- 実施: `git show 82e8f3e04db920155bb174a58f997437a215aed6 -- docs/requirements/requirements.md` で、今回の Requirements 変更箇所を確認した。
- 実施: `sha256sum docs/requirements/requirements.md` の値 `743cd9179259f2018ed24eaab948de509669f2e8f8102fc5fca45bbb5a67d8f2` をレビュー開始時と artifact 作成後に確認し、Requirements 正本を変更していないことを確認した。
- 実施: artifact 作成後に `git diff --check`、Prettier による Markdown check、内部 relative link / referenced file の確認、`git status` と変更ファイル一覧の確認を行った。
- 未実施 / skipped: Rust formatter / clippy / cargo test、WASM build / test、Native C ABI runtime / header test、Node / npm build / test、Android / iOS build、device / simulator、React Native runtime、package assembly、CI、release / supply-chain execution。docs-only の review artifact であり、ユーザーも full test を不要としているため。
- 未確認: 実際の RN responsiveness、resource usage、timeout / cancellation、cleanup、API parity および native artifact integrity。これらは下流 evidence / Design / Specification / Implementation / Release の責任であり、本 Requirements Review の合否根拠にはしていない。

## Review Gates

Requirements Review Skill の Gate rule を適用した。`Critical` が1件以上なら `REVISE REQUIREMENTS`、`Critical` がなく `Major` / `Minor` のみなら `READY` とする。

| Gate              | 結果 | 根拠                                                                                                                                                           | 対応 ID |
| ----------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1. 目的と課題     | 合格 | RN は既存 Concept の shared Rust Core / wallet integration scope と整合し、性能 evidence 要求は目的を実現可能にする下位要求である。                            | なし    |
| 2. 利用者と責任   | 合格 | Core、Binding、Application / UI、host の責任を変更せず、性能判断の authority を Binding へ移していない。                                                       | なし    |
| 3. 対象範囲       | 合格 | RN Android / iOS、既存 runtime、single repository / package、Node / Browser policy を区別し、support values は §11 に残している。                              | なし    |
| 4. 要件と制約     | 合格 | sync baseline、responsiveness / resource evidence、compatibility impact、conditional user decision、silent divergence 禁止を MUST として追跡できる。           | なし    |
| 5. 受け入れ条件   | 合格 | `AC-061` が representative environment / input、measurement dimensions、negative evidence、cleanup、compatibility impact、decision gate を外部観測可能にする。 | なし    |
| 6. 内部整合性     | 合格 | `NFR-008` の API consistency と safety exception、§11 の baseline と conditional future decision、既存 fail-closed / secret cleanup は矛盾しない。             | なし    |
| 7. 不可欠な前提   | 合格 | exact performance threshold や platform values は下流 / user decision として明示され、未確認の値を supported claim としていない。                              | なし    |
| 8. Concept 整合性 | 合格 | Concept Review 011 は `READY`。Concept の scope、shared Core、security invariant、single repository / package と矛盾しない。                                   | なし    |

Critical: 0。Major: 0。Minor: 0。Gate failure に対応する finding はない。

## Remaining Risks and Open Decisions

- 実測前は、各 operation の execution cost、JS blocking、responsiveness、resource behavior、timeout / cancellation / interruption の実際の結果は未確認である。
- negative evidence が得られた場合の対象 operation、impact、候補 contract、support exclusion の採否は、user decision なしに確定できない。
- minimum RN / Android API / iOS / Browser baseline、ABI / architecture、New Architecture / legacy、Expo scope は §11 の未決定事項として残る。決定前に supported claim を行わない。
- `DR-RN-001〜DR-RN-004` の Design 側 resolution および subsequent Specification / Implementation / release evidence は、次工程で正式に再確認する。

## Automatic Changes

本レビュー中に変更したのは、新規 artifact [`requirements-review-010.md`](requirements-review-010.md) のみである。Requirements 正本、Concept、既存 Requirements Review、Design 正本、Design Review artifact、Specification、Implementation、テスト、fixture、package、CI、release file は変更していない。

## Final Decision

`READY`

**REQUIREMENTS PHASE FORMAL GATE: READY**

`82e8f3e04db920155bb174a58f997437a215aed6` の Requirements は、Concept と整合し、`UF-RN-001` を `Resolved` とできる responsiveness / resource / evidence / compatibility / decision policy を持つ。`NFR-015` と `AC-061` は Requirements として適切な抽象度に留まり、`NFR-008` は API consistency と安全性の関係を明示する。既存の security boundary、failure / cleanup、public API consistency、runtime non-regression、Node.js 22 / 24 policy および `RR-001〜RR-029` の Resolved 状態に回帰はない。Critical finding はなく、Gate は `READY` である。

# React Native Design Review 003

## Review Target

| 項目                     | 内容                                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository               | `nemnesia/symbol-nem-wallet-core`                                                                                                                                      |
| Branch                   | `agent/react-native-support`                                                                                                                                           |
| Reviewed HEAD            | `37facb8bbaa68d3a1e507ec91e2adeb586d4d238`                                                                                                                             |
| Canonical Design         | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md)                                |
| Upstream Requirements    | [`requirements.md`](../../requirements/requirements.md)                                                                                                                |
| Requirements Review      | [`requirements-review-010.md`](../requirements/requirements-review-010.md) — `READY`                                                                                   |
| Previous Design Review   | [`react-native-design-review-002.md`](react-native-design-review-002.md) — `READY`、`DR-RN-002` は `Open`                                                              |
| Initial finding artifact | [`react-native-design-review-001.md`](react-native-design-review-001.md) — `DR-RN-002` 初出                                                                            |
| Review date              | 2026-09-05 (Asia/Tokyo)                                                                                                                                                |
| Review scope             | `DR-RN-002` の Resolution、RN process-wide authority、runtime / context lifecycle、serialization、security authority、Requirements traceability、既存 finding の非退行 |
| Unvalidated scope        | Rust / Native / WASM / Node 実装、RN runtime、Android / iOS device / simulator、package assembly、CI、release および実測 evidence                                      |

今回のレビューは、指定された canonical Design HEAD に対する正式な再レビューである。レビュー中に Concept、Requirements、canonical Design、Specification、実装、CI / release workflow は変更していない。

## Execution Audit

`design-review` Skill、`review-common` playbook、reviewer policy、security checklist、review gate および共通 output format の Phase 0〜3 を適用した。サブエージェントは使用せず、Chair が次の4パスを独立に確認し、候補を反証・統合した。

1. **Reviewer A — 構造と責務**: process-wide RN binding coordination、runtime / module-registry、logical consumer context、C ABI、Rust Core の責務、依存方向、共有 resource ownership。
2. **Reviewer B — Security primary**: secret ownership / lifecycle、Core security authority、binding non-authority、failure isolation、stale result、cleanup、shared-state prohibition。
3. **Reviewer C — フローと運用**: 同時 admission、runtime-local teardown、process-wide teardown、reload、cancellation、shutdown、cross-runtime blocking、responsiveness。
4. **Reviewer D — 追跡と下流実装可能性**: `UF-RN-001`、`NFR-008`、`NFR-015`、`AC-054`〜`AC-061` との追跡、既存 finding の resolution、Specification / Implementation への委譲境界。

## Evidence Used

| 種別                      | 参照資料 / 確認内容                                                                                                                                                                                      | 用途                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 作業指針                  | [`AGENTS.md`](../../../AGENTS.md)                                                                                                                                                                        | Source of Truth、phase boundary、scope、security、change-aware validation、Git 運用           |
| Review policy             | [`design-review/SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、reviewer / security / gate / output format | 正式 reviewer 観点、finding 採用条件、severity、gate および artifact 形式                     |
| Previous Design Review    | [`react-native-design-review-002.md`](react-native-design-review-002.md)                                                                                                                                 | reviewed HEAD、`DR-RN-002` の Open 状態、Required correction、Resolution 条件                 |
| Initial finding           | [`react-native-design-review-001.md`](react-native-design-review-001.md)                                                                                                                                 | `DR-RN-002` の初出内容、scope、影響および completion 条件                                     |
| Canonical Architecture    | [`architecture.md`](../../design/architecture.md) §12.1〜§12.7、特に §12.3                                                                                                                               | RN topology、process-wide authority、hierarchy、lifecycle、non-regression                     |
| Canonical Bindings        | [`bindings.md`](../../design/bindings.md) §12.1〜§12.17、特に §12.3、§12.11、DDR-RN-009                                                                                                                  | binding authority、serialization、secret queue、teardown、C ABI reuse、下流委譲               |
| Canonical Security        | [`security.md`](../../design/security.md) §12.3〜§12.5                                                                                                                                                   | Core / RN security boundary、shared state、cancellation、failure isolation、secret lifecycle  |
| Requirements              | [`requirements.md`](../../requirements/requirements.md) §1.3、§2、§6、§9〜§12                                                                                                                            | `UF-RN-001`、`NFR-008`、`NFR-015`、`AC-054`〜`AC-061`、security / non-regression requirements |
| Requirements Review       | [`requirements-review-010.md`](../requirements/requirements-review-010.md)                                                                                                                               | `UF-RN-001: Resolved`、Requirements `READY`、Requirements follow-up の有無                    |
| Upstream Concept          | [`concept-sheet.md`](../../consept/concept-sheet.md)、[`concept-sheet-review-011.md`](../concept/concept-sheet-review-011.md)                                                                            | shared Rust Core、single package、Core security authority、上流整合性                         |
| Canonical correction diff | `git diff 72c2cd9...37facb8 -- docs/design/architecture.md docs/design/bindings.md docs/design/security.md`                                                                                              | 今回の Design correction が3 canonical Design に限定されること、および内容                    |

## Review Result

`READY`

## Summary

`DR-RN-002` は `Resolved` と判定する。今回の Design は、同一 process 内の全 RN runtime / module registry / logical consumer context を覆う、単一の process-wide RN binding coordination を Core / C ABI admission、process-wide serialization、cross-context execution ordering、shared native resource lifecycle、stale completion rejection および process-wide teardown barrier の authority として明示した。

runtime / module-registry scope と logical consumer context は登録、validity、delivery、local ordering、reentrancy および request lifecycle に限定され、process-wide coordinator を bypass しない。Rust Core の cryptography、private key、Mnemonic、signature semantics、Wallet Store integrity、validation、authorization および zeroization authority は移転していない。

v1 の process-wide serialization は safety-first の内部 policy として Requirements と整合する。public synchronous contract、worker + blocking wait の非同値性、JS / UI responsiveness、resource、cancellation / interruption、cleanup および negative evidence 時の async / support exclusion decision gate は維持されている。process-wide contention による admission wait / starvation risk は下流 evidence の対象として残るが、exact fairness algorithm、queue policy または worker implementation を Design finding としない。

`DR-RN-001`、`DR-RN-003`、`DR-RN-004` に回帰はなく、今回新たな問題は確認されなかった。正式 Gate は Critical 0 件により `READY` である。

## Finding Status

| ID          | Severity | 今回判定     | 初出 / 前回状態                         | 今回の状態根拠                                                                                                                                                        |
| ----------- | -------- | ------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DR-RN-001` | Major    | **Resolved** | Review 001: Open / Review 002: Resolved | public synchrony と execution context を分離し、blocking wait、responsiveness evidence、cancellation / interruption、cleanup および async escalation を維持している。 |
| `DR-RN-002` | Major    | **Resolved** | Review 001: Open / Review 002: Open     | process-wide authority、複数 runtime scope、cross-context order、shared lifecycle、teardown barrier、stale result および failure boundary が3 Designで一致している。  |
| `DR-RN-003` | Major    | **Resolved** | Review 001: Open / Review 002: Resolved | RN-private adapter が existing public C ABI contract を内部再利用し、RN Application-facing API / 新規 public C ABI を追加していない。                                 |
| `DR-RN-004` | Major    | **Resolved** | Review 001: Open / Review 002: Resolved | RN artifact の source → controlled build → target artifact → digest / provenance → npm assembly chain と fail-closed verification point を維持している。              |

### Open findings

- Critical: 0
- Major: 0
- Minor: 0

### Reopened findings

なし。`DR-RN-002` は前回からの Open を Resolution 判定したものであり、Resolved finding の再オープンではない。

### New finding IDs

なし。process-wide scope、lifecycle、serialization および shared-state の確認結果は既存 `DR-RN-002` の resolution scope に収まり、新しい formal finding は発行しない。

## Required Changes

なし。Design Review の gate を不合格にする `Critical` の New / Open / Reopened はない。

## Optional Improvements

正式な Major / Minor の Open finding はない。下流では、process-wide admission contention、cross-runtime wait、starvation risk、JS / UI responsiveness および resource behavior を `NFR-015` / `AC-061` の evidence 条件に含めて確認する。これは exact fairness / queue policy を要求する Design finding ではない。

## Resolved Findings

### `DR-RN-002: Resolved`

原 finding は、同一 process 内の複数 RN runtime / module registry / logical consumer context が同じ Core / C ABI に到達した場合に、context 内 serialization だけでは process-wide concurrency、initialization、shutdown、ordering、stale result および shared resource lifetime の責任を一意にできない、というものだった。

今回の canonical Design は次を直接解消している。

- [`architecture.md`](../../design/architecture.md) §12.3 は、全 RN invocation domain を覆う process-wide coordination を一意の admission / serialization authority とし、複数 runtime は許容しつつ独立 Core access authority を禁止する（§12.3、特に lines 467〜490）。
- [`bindings.md`](../../design/bindings.md) §12.11 は、process-wide coordinator、runtime / module-registry scope、logical consumer context、RN adapter admission、existing public C ABI contract、Rust Core の責任を分離し、全 invocation が coordinator と context adapter の admission を通ることを定める（lines 583〜599）。
- [`security.md`](../../design/security.md) §12.4〜§12.5 は、concurrent invocation / reentrancy / same-Store mutation の authority を process-wide coordinator に置き、context-local failure と shared native resource failure を分離する（lines 491〜530）。
- v1 では read、secret-capable operation、Store processing を含む全 RN Core / C ABI execution を process-wide に同時実行しない。これにより Core / C ABI の thread-safety を RN integration contract にする二択を残していない。
- process-wide coordinator は shared native resource の初期化・利用・終了、process-wide admission barrier、cross-context execution order、stale completion rejection および process-wide teardown barrier を所有する。runtime-local teardown は当該 runtime / context の新規 admission と delivery を失効させるだけで、他 runtime が使用中の shared resource を破棄しない。

したがって、process-wide authority は一意であり、per-runtime / logical-context authority はその下位の局所責務として競合しない。Application の current Store selection / replacement application は引き続き Application / persistence layer の責任であり、process-wide execution order が Store history authority や cryptographic authority に昇格していない。

### `DR-RN-001: Resolved`

今回の process-wide serialization が `DR-RN-001` を再発させていないことを確認した。public sync は同期的な return / throw の観測契約であり、Core が JS thread で直接実行されることを意味しない。worker + blocking wait は non-blocking と扱わず、execution cost、JS blocking、responsiveness、resource、interruption / cancellation および cleanup の evidence gate を維持している。negative evidence の場合の operation-specific async contract または RN support exclusion は `NEEDS USER DECISION` に戻り、user decision 前の silent Promise 化・automatic fallback はない。

### `DR-RN-003: Resolved`

RN topology は public TypeScript facade → private RN entry → TurboModule / JSI adapter → Android / iOS thin native layer → existing public C ABI contract → Rust Core を維持する。C ABI は RN Application-facing API ではなく internal implementation boundary であり、process-wide RN policy を public C ABI semantics、ownership、error、release contract に漏らしていない。新規 public C ABI、RN-only public symbol、C ABIへの lifecycle authority の移転はない。

### `DR-RN-004: Resolved`

RN artifact の source revision、controlled build、target identity、digest / provenance、approved npm assembly、published package の trust chain、Android package / release assembly verification および iOS package / link / composition verification は維持されている。process-wide coordination の追加は artifact ownership、conditional exports、Node / WASM routing、SBOM、provenance、artifact integrity または release policy を変更していない。

## Upstream Feedback

なし。`UF-RN-001` は [`requirements-review-010.md`](../requirements/requirements-review-010.md) で `Resolved` であり、現行 Requirements の不足・曖昧さ・矛盾は、今回の Design の安全な評価を妨げていない。

## Deferred Findings

以下は下流へ正しく委譲された確認事項であり、今回の formal finding ではない。

- coordinator の mutex / queue / executor / worker、thread affinity、generation、single-flight、cancellation primitive、shutdown hook、lock ordering および memory ordering。
- exact result / error delivery mechanism、JNI / Swift / Objective-C++、JSI / TurboModule method、C ABI signature、timeout および callback mechanism。
- process-wide admission wait、cross-runtime contention、starvation risk、JS / UI blocking、resource behavior、cancellation / interruption および cleanup の production-equivalent evidence。`NFR-015` / `AC-061` の responsiveness evaluation は process-wide serialization を理由に免除されない。
- platform support decision と release verification: minimum RN / Android API / iOS version、Android ABI matrix、iOS architecture matrix、New Architecture mandatory / legacy compatibility、Expo formal support scope。

既存 package-wide Browser baseline は今回の `DR-RN-002` 対応範囲外であり、変更も新規 RN user decision も導入していない。

## Scope and Traceability

### Requirements ↔ Design

| Requirement / feedback | Design evidence                                                                                                                        | 評価                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UF-RN-001`            | [`bindings.md`](../../design/bindings.md) §12.3、§12.11、§12.15、`DDR-RN-004`; [`architecture.md`](../../design/architecture.md) §12.3 | `Resolved`。sync baseline、execution context、blocking / resource evidence、cleanup、negative evidence 時の async / support exclusion gate を維持。                                |
| `NFR-008`              | `architecture.md` §12.3、§12.5; `bindings.md` §12.3、§12.11                                                                            | process-wide serialization は内部 execution policy であり、16 operation、public API parity、error / binary semantics、user decision 前の public semantics 不変を維持。             |
| `NFR-015`              | `architecture.md` §12.3; `bindings.md` §12.3、§12.15                                                                                   | execution cost、JS runtime blocking、responsiveness、resource、cancellation / interruption、failure cleanup を evidence 対象として維持。process-wide wait もこの評価を免除しない。 |
| `AC-054`               | `architecture.md` §12.1〜§12.3; `bindings.md` §12.1、§12.3                                                                             | Android / iOS と既存 runtime の application-facing API parity を維持。RN-only public API はない。                                                                                  |
| `AC-055`               | `architecture.md` §12.3、§12.5; `security.md` §12.4〜§12.5                                                                             | Core の crypto、key、Mnemonic、Store integrity、validation、zeroization、secret ownership authority を維持。                                                                       |
| `AC-056`               | `architecture.md` §12.3〜§12.5; `bindings.md` §12.10〜§12.11                                                                           | local failure と shared native failure を分け、fail-closed、stale result rejection、no silent fallback を維持。                                                                    |
| `AC-057`               | `architecture.md` §12.2、§12.6; `bindings.md` §12.4、§12.12                                                                            | Node native、Node WASM fallback、Browser WASM、Browser Extension、conditional routing、release policy を RN coordination の対象へ拡張しない。                                      |
| `AC-058` / `AC-059`    | `bindings.md` §12.13                                                                                                                   | RN / Android / iOS version、ABI / architecture matrix は未決定のまま。Node 22.x / 24.x policy は不変。                                                                             |
| `AC-060`               | `architecture.md` §12.2; `bindings.md` §12.4〜§12.5                                                                                    | runtime-specific private entry、RN native-only normal path、cross-runtime fallback 禁止を維持。                                                                                    |
| `AC-061`               | `architecture.md` §12.3; `bindings.md` §12.3、§12.15                                                                                   | representative environment / input、production-equivalent build、responsiveness、resource、cancellation / interruption、cleanup、negative evidence と decision record を維持。     |

### Authority and boundary traceability

- **Process-wide RN binding coordination**: RN invocation domain 全体の admission、serialization、cross-context execution ordering、shared native resource lifecycle、process-wide teardown barrier、stale completion rejection および delivery gate。
- **Runtime / module-registry**: registration、runtime validity、runtime-local teardown、結果 delivery 先。process-wide resource を破棄せず、coordinator を bypass しない。
- **Logical consumer context**: context-local ordering、reentrancy、request lifecycle、local cancellation / invalidation。別 context の order や resource lifecycle を変更しない。
- **C ABI**: existing public C ABI contract の internal reuse。RN-specific lifecycle / concurrency policy の public C ABI contract への移転はない。
- **Rust Core**: cryptography、private key、Mnemonic、signature semantics、authorization、validation、Wallet Store integrity、security semantics および zeroization authority。
- **Application / persistence**: user intent、current Store selection、successful replacement の適用、Store history / freshness。process-wide coordinator は Store state cache や replacement authority にならない。

## Domain Checks

### 1. `DR-RN-002` Resolution adequacy

原 finding の論点であった authority scope、複数 runtime、module registry、logical context、concurrent Core / C ABI execution、initialization、shutdown、ordering、stale completion、shared resource ownership は、process-wide coordinator と下位 local scopes の責務分離で直接解消されている。process-wide authority は一意で、per-runtime / context authority は local validity・delivery・ordering に限定される。

### 2. Authority hierarchy

Design の hierarchy は `process-wide RN binding coordination → runtime / module-registry scope → logical consumer context → RN adapter admission → existing public C ABI contract → Rust Wallet Core` で一貫している。図の下方向は invocation / dependency flow であり、C ABI や Rust Core が RN lifecycle authority の単純な下位になることを意味しない。C ABI は既存 contract の境界、Rust Core は security / cryptographic authority である。RN coordinator は execution / lifecycle / delivery control に限定され、Core security meaning を取得しない。

### 3. Security authority

RN process-wide coordinator に追加された authority は、admission、concurrency coordination、lifecycle coordination、execution ordering、binding resource ownership、stale result / result delivery control および infrastructure failure の fail-closed propagation に限定される。cryptographic policy、private-key authority、Mnemonic authority、signature semantics、Wallet Store integrity、validation semantics、secret zeroization semantics は Rust Core に残る。`security.md` §12.5 はこの separation を明示している。

### 4. Process-wide serialization と Requirements compatibility

v1 の「同一 process 内で Core / C ABI を同時実行しない」は、Core / C ABI の thread-safety を RN integration contract にしない安全側の内部 policy であり、`NFR-008` の public API parity と衝突しない。`NFR-015` / `AC-061` の execution cost、JS blocking、responsiveness、resource、cancellation / interruption、failure cleanup の evidence は維持され、worker へ移した後の blocking wait を non-blocking と扱わない。serialization により UI / JS thread を block してよい、または長時間 operation の評価を免除する、という記述はない。

### 5. Cross-runtime blocking / responsiveness

runtime A の長時間 operation 中に runtime B が admission 待ちになることは、process-wide safety policy の意図された結果として扱える。A と B の request は coordinator の一つの admission boundary で順序付けられ、B が A と同時に Core / C ABI を実行しない。これに伴う contention、admission wait および starvation risk は responsiveness / resource evidence の対象として下流へ残り、process-wide serialization を理由に免除されない。negative evidence が得られた場合は対象 operation、影響範囲、compatibility impact とともに async public contract または RN support exclusion を `NEEDS USER DECISION` とする。exact fairness algorithm / queue policy は Specification / Implementation scope である。

### 6. Multiple-runtime lifecycle cases

| Case                                                        | Design-level 判定                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: A / B が同時に operation を要求                          | 両方が process-wide coordinator と各 context adapter の admission を通過し、v1 では process-wide に一つずつ実行される。cross-context execution order は coordinator の admission order。                                                                                                      |
| B: A が teardown 中に B が admission を要求                 | A は A の新規 admission / delivery を停止する。B は process-wide resource が有効なら coordinator の順序に従って待機または admission され、process-wide teardown / barrier 中なら新規 admission は fail-closed。A の in-flight cleanup と shared resource lifetime は coordinator が管理する。 |
| C: A の completion 時に A が invalidated 済み               | A への delivery / success application は行わず、stale result として cleanup する。process-wide と A の lifecycle の双方が有効な場合だけ delivery。                                                                                                                                            |
| D: A が cancellation、B は正常                              | cancellation は A の runtime / context に閉じ、B へ不要に伝播しない。A の stale completion は delivery せず cleanup する。shared native failure の場合だけ process-wide admission barrier が適用される。                                                                                      |
| E: module registry / RN runtime が reload で再生成          | 旧 runtime / registry は invalidation 後の delivery を失い、新 registry は process-wide coordinator 配下で再登録する。旧 completion は stale として棄却する。generation の具体実装は下流。                                                                                                    |
| F: A / B が shared native resource を参照中に A が teardown | A の runtime-local teardown は B が使用中の process-wide resource を破棄しない。shared resource の終了は coordinator の process-wide lifecycle。                                                                                                                                              |
| G: process-wide shutdown と runtime-local teardown が競合   | runtime-local barrier と process-wide barrier を同一視せず、process-wide coordinator が全 registration / in-flight state を対象に teardown を管理する。shutdown 中の新規 invoke は許可せず、後続 completion は lifecycle 有効性を再確認する。                                                 |

### 7. Runtime-local teardown vs process-wide teardown

runtime-local teardown は当該 runtime / context の validity、delivery、local teardown を失効させるだけであり、他 runtime の shared native resource を破壊しない。process-wide teardown は coordinator の単一 lifecycle authority が所有し、process-wide admission barrier により新規 invocation を受け付けない fail-closed 状態を表現できる。teardown 後に到着した completion は stale result として delivery せず cleanup する。

### 8. Cancellation

cancellation は runtime / logical context に結び付き、無関係な runtime へ不要に propagation しない。admission 前の queued request は descriptor / cancellation state だけで表現し secret-bearing payload を保持しない。Core invocation 開始後の unsafe forced thread kill は要求せず、completion が stale になった場合も temporary、native resource、authorization-capable state の cleanup を維持する。

### 9. Shared resource ownership

process-wide shared state は registration metadata、native resource availability、admission barrier、in-flight lifecycle、runtime / context validity 等の coordination metadata に限定される。Profile、Store、password、private key、Mnemonic、seed、signing secret、decrypted material、unlocked session または secret cache は coordinator の shared state でも lifetime anchor でもない。

### 10. Failure isolation

conversion failure、Core operation error、cancellation、stale completion および result delivery failure は原則として対象 runtime / context に閉じる。一方、shared native resource の load / initialization / integrity failure のように RN domain 全体の safe access を保証できない failure は、coordinator が全 RN domain の新規 admission を止め、影響する operation を明示的に失敗させる。単一 request failure が無関係 runtime を恒久的に disable する policy にはなっていない。具体的な再初期化 / recovery は下流で定義する。

### 11. Deadlock / ordering principle

authority は上位から下位への一方向で、context-local coordination と process-wide coordination の循環待ちを要求しない。Core call 中の JS callback、UI / public facade re-entry、recursive invoke、lower-level callback からの upper-level synchronous re-entry を要求しない。teardown は invalidated callback / result delivery の同期完了を待たず、operation completion と cleanup の barrier を coordinator が管理する。mutex、lock ordering、atomic、queue および callback mechanism は downstream scope である。

### 12. Secret lifecycle regression

secret は admission 後かつ実行直前に必要最小限だけ materialize し、queued request は descriptor / cancellation state のみ保持する。success、failure、exception、cancellation、shutdown、reload、teardown および stale completion の経路で binding cache、継続 authorization、secret-bearing queue item、diagnostic leakage または partial success を許可しない。Rust Core の zeroize semantics / security authority は変わっていない。

### 13. Existing resolved finding regression

`DR-RN-001` の sync / responsiveness / cleanup boundary、`DR-RN-003` の existing public C ABI reuse / non-exposure、および `DR-RN-004` の artifact trust chain / verification point は今回の変更後も canonical Design に残る。これらを `Reopened` とする事実はない。

### 14. Runtime / Binding Architecture

TypeScript public facade → private RN entry → TurboModule / JSI adapter → Android / iOS thin native layer → existing public C ABI contract → Rust Core の topology は変わらない。process-wide coordinator は private RN binding coordination であり、public TypeScript API、C ABI public contract、conditional exports、Node / WASM routing に不要な変更を要求しない。

### 15. TurboModule / JSI

TurboModule / Codegen は New Architecture の registration / typed boundary、JSI は private synchronous / binary substrate として扱われる。`New Architecture primary` は維持されるが、New Architecture mandatory、legacy compatibility policy、minimum RN version は `NEEDS USER DECISION` のままで、今回の Resolution により暗黙確定されていない。

### 16. C ABI reuse

existing public C ABI contract は RN-private adapter から内部再利用され、Application-facing API には露出しない。process-wide coordinator の admission / lifecycle policy は C ABI public contract へ漏れず、RN lifecycle authority も C ABI へ移転していない。RN-specific public C ABI surface は追加されていない。

### 17. Platform decisions

次は引き続き `NEEDS USER DECISION` であり、`DR-RN-002` Resolution を理由に確定されていない。

- minimum React Native version
- minimum Android API level
- minimum iOS version
- Android ABI matrix
- iOS device / simulator architecture matrix
- New Architecture mandatory / legacy compatibility policy
- Expo formal support scope
- negative responsiveness / resource evidence 発生時の operation-specific async contract または RN support exclusion

既存 canonical Design §12.13 の supported browser baseline の扱いは package-wide の既存事項であり、今回の RN concurrency correction の対象外である。今回新しい Browser user decision は追加していない。

### 18. Browser baseline

Browser WASM、Browser Extension、既存 package-wide Browser baseline、no-remote-code / routing policy に変更や新規 user decision を持ち込んでいない。RN process-wide coordinator は Browser backend、Node native backend、Node WASM fallback または他 backend へ適用されない。

### 19. Non-regression

Node native backend、Node WASM fallback、Browser WASM、Browser Extension、TypeScript public API、existing public C ABI、conditional exports、fail-closed backend routing、SBOM、provenance、artifact integrity および release policy の責任・挙動は今回の RN Design correction で変更されていない。RN の process-wide coordination は RN invocation domain に限定され、他 backend の process-wide policy へ一般化されていない。

### 20. Design / Specification boundary

canonical Design は responsibility、scope、invariant、lifecycle、failure model、execution model、security boundary および verification intent に留まっている。mutex、queue、worker count、exact thread model、generation token、cancellation primitive、lock ordering、callback mechanism、JNI、Swift / Objective-C API、JSI exact method、TypeScript signature、Promise shape、timeout、benchmark threshold は未確定のまま下流へ委譲されている。これらの未確定性は `DR-RN-002` の未解消を意味しない。

### 21. Requirements follow-up

今回 Requirements の変更は不要である。`UF-RN-001` は Requirements Review 010 で解消済みであり、`NFR-008`、`NFR-015`、`AC-054`〜`AC-061` は process-wide serialization、safety-first lifecycle、responsiveness evidence、secret cleanup および user decision gate と両立する。`NEEDS REQUIREMENTS FOLLOW-UP` はない。

## Validation Results

| 検証                      | 結果                                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch                    | `agent/react-native-support` を確認。                                                                                                                                                         |
| Reviewed HEAD             | `37facb8bbaa68d3a1e507ec91e2adeb586d4d238` と一致。                                                                                                                                           |
| Previous Review HEAD      | `72c2cd9baebabdb7782ba94a1be13f1da2484dfc` が reviewed HEAD の祖先であり、今回の canonical correction diff がそこからの3 Design文書に限定されることを確認。                                   |
| Requirements integrity    | `docs/requirements/requirements.md` の SHA-256 `743cd9179259f2018ed24eaab948de509669f2e8f8102fc5fca45bbb5a67d8f2` を確認し、直前 reviewed HEAD と同一であることを確認。                       |
| Canonical Design diff     | `docs/design/architecture.md`、`docs/design/bindings.md`、`docs/design/security.md` の process-wide authority / lifecycle / security boundary correction を確認。レビュー中は変更していない。 |
| Finding traceability      | 初出 `DR-RN-002`、前回 Open、今回 Resolved の状態と、`DR-RN-001` / `003` / `004` の Resolved 継続を確認。                                                                                     |
| Requirements traceability | `UF-RN-001`、`NFR-008`、`NFR-015`、`AC-054`〜`AC-061` と canonical Design の対応を確認。                                                                                                      |
| Relative links            | artifact が参照する Concept、Requirements、Design、Requirements Review、Design Review および Skill reference の存在を確認。                                                                   |
| Markdown / fenced blocks  | artifact 作成後に Markdown format と fenced block balance を確認する。                                                                                                                        |
| `git diff --check`        | artifact 作成後、commit 前および commit 後に実行する。                                                                                                                                        |
| Change scope              | artifact 以外の作業中差分がないことを確認し、commit 対象を artifact のみに限定する。                                                                                                          |
| Full tests                | docs-only Design Review のため、Rust / npm / Node / WASM / React Native / Android / iOS / release full tests は実行しない。                                                                   |

### Not validated

実際の RN responsiveness、cross-runtime admission wait / starvation、resource usage、cancellation / interruption、secret cleanup の runtime behavior、API parity、native artifact integrity、package assembly、CI / release evidence は実行環境・実装・下流仕様の検証範囲であり、本 docs-only review では未検証である。未検証範囲を成功扱いしない。

## Review Gates

Design Review の正式 rule（`Critical` が1件以上なら `REVISE DESIGN`、`Critical` がない場合は `READY`）を適用した。

| Gate                           | 判定      | 根拠                                                                                                               | 対応 ID |
| ------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------ | ------- |
| 1. 目的と範囲                  | PASS      | RN は既存 Mobile scope、single repository / package、shared Rust Core の範囲に留まる。                             | なし    |
| 2. コンテキストと責任          | PASS      | process-wide、runtime、logical context、C ABI、Core、Application の authority / trust boundary が分離されている。  | なし    |
| 3. 依存方向                    | PASS      | process-wide coordination から下位 adapter / C ABI / Core への一方向で、責務逆流・循環を要求しない。               | なし    |
| 4. 主要フロー                  | PASS      | concurrent admission、teardown、reload、cancellation、stale completion、shared failure の責任が判断可能である。    | なし    |
| 5. データ所有                  | PASS      | process-wide shared state は coordination metadata に限定され、secret / Store cache を所有しない。                 | なし    |
| 6. Security / interoperability | PASS      | Rust Core の security authority、fail-closed、cleanup、Core / C ABI / RN boundary、runtime non-regression を維持。 | なし    |
| 7. 上流整合性                  | PASS      | Requirements Review 010 は `READY`、`UF-RN-001` は `Resolved`、Requirements 変更は不要。                           | なし    |
| 8. 下流実装可能性              | PASS      | authority、scope、invariant は確定し、exact synchronization / platform mechanism は適切に downstream へ委譲。      | なし    |
| Critical finding               | PASS      | Critical 0 件。                                                                                                    | なし    |
| Formal Review Gate             | **READY** | Critical がないため project rule に適合。                                                                          | なし    |

## Remaining Risks and Open Decisions

- process-wide serialization により、長時間 operation 中の他 runtime admission wait / starvation risk が発生し得る。実際の responsiveness、resource および安全な interruption は `NFR-015` / `AC-061` の下流 evidence で確認する。
- platform support decision として、minimum React Native version、minimum Android API level、minimum iOS version、Android ABI matrix、iOS architecture matrix、New Architecture mandatory / legacy compatibility、Expo formal support scope が残る。
- negative responsiveness / resource / cleanup evidence が operation-specific に得られた場合、async public contract または RN support exclusion の採否は user decision なしに確定できない。
- existing package-wide Browser baseline は今回の変更対象外であり、今回の Resolution によって変更・確定されていない。
- exact coordinator implementation、queue、fairness、thread、generation、cancellation、lifecycle hook、error delivery および benchmark protocol は下流で決定・検証する。

### NEEDS REQUIREMENTS FOLLOW-UP

**なし。** 現行 Requirements は process-wide serialization と responsiveness / security / compatibility policy を許容しており、今回の Design Resolution のための upstream correction は不要である。

## Automatic Changes

レビュー artifact [`react-native-design-review-003.md`](react-native-design-review-003.md) のみを新規作成する。canonical Design、Concept、Requirements、Specification、実装、テスト、fixture、package、CI / release workflow は変更しない。

## Final Decision

**Review Gate: READY**

`DR-RN-001`、`DR-RN-002`、`DR-RN-003`、`DR-RN-004` はすべて `Resolved`。`DR-RN-002` は、複数 RN runtime / module registry / logical consumer context を覆う process-wide RN binding coordination の一意の authority、下位 scope の非競合な local responsibility、process-wide serialization、lifecycle / teardown barrier、stale completion rejection、shared-state prohibition、failure isolation および Rust Core security authority の維持により正式に解消された。

Requirements、既存 backend、C ABI public contract、platform decision gate、Browser baseline および Design / Specification boundary に回帰はない。Critical finding は0件であり、project の正式 gate rule に基づく最終判定は `READY` である。

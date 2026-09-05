# Specification Review 014

## Review Target

| 項目 | 内容 |
| --- | --- |
| Repository | `nemnesia/symbol-nem-wallet-core` |
| Branch | `agent/react-native-support` |
| Reviewed HEAD | `0dd0d9d941095bcf5de660c8b677293046e0a762` |
| Canonical Specification | [`react-native.md`](../../specifications/react-native.md)、[`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md)、[`specification.md`](../../specifications/specification.md) |
| Previous Specification Review | [`specification-review-013.md`](specification-review-013.md) — `READY`、`SR-001`〜`SR-024` は `RESOLVED` |
| Upstream Requirements Review | [`requirements-review-010.md`](../requirements/requirements-review-010.md) — `READY`、`UF-RN-001` および `RR-001`〜`RR-029` は Resolved |
| Upstream Design Review | [`react-native-design-review-003.md`](../design/react-native-design-review-003.md) — `READY`、`DR-RN-001`〜`DR-RN-004` は Resolved |
| Platform Decision | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) — `PD-RN-001`〜`PD-RN-007` は `APPROVED` |
| Review date | 2026-09-05 (Asia/Tokyo) |
| Review scope | RN Specification の implementation-ready 性、Requirements / Design / Platform Decision traceability、既存 public API / C ABI / Node / Browser / WASM / release policy との非退行、`SR-001`〜`SR-024` の再追跡、および RN-specific lifecycle / security / artifact contract |
| Unvalidated scope | Rust、Native C ABI、Node、WASM、React Native、Android、iOS、Expo、package assembly、CI、release、device / simulator 実行、実装適合性および production responsiveness evidence |
| Phase Context | `AGENTS.md` に Specification の登録はなく、使用していない |

対象は指定された Specification HEAD であり、レビュー中に Concept、Requirements、Design、Decision、Specification、Implementation、Test、CI / release workflow は変更していない。

## Execution Audit

- 実行モード: サブエージェントを使用しない自己レビュー。実施していない起動・投票は記録していない。
- Reviewer A（契約の明確性・完全性）: 完了。public API、DTO、binary、sync、conditional exports、operation classification、runtime identity、lifecycle、error、artifact、acceptance を確認した。
- Reviewer B（利用価値・運用適合性）: 完了。Requirements / Design / Decision との追跡、Node / Browser / WASM 非退行、RN / Expo support matrix、cross-runtime blocking、responsiveness gate、package assembly を確認した。
- Reviewer C（Security / Interoperability primary）: 完了。Rust Core authority、C ABI reuse、secret transport / cleanup、stale completion、fail-closed、String / binary、artifact provenance、error boundary を確認した。
- Phase 0（対象・根拠・境界）: 完了。指定された三 Specification、必須 upstream、既存 Specification Review、Skill の rule と新規 artifact のみを変更対象に確定した。
- Phase 1（独立レビュー）: 完了。Reviewer A / B / C の観点を分けて確認した。
- Phase 2（反証・統合）: 完了。16 operation、re-entry、initialization race、multi-runtime teardown、C0 / C1 / C2 evidence scope、Expo pair、RN version window、secret lifecycle および既存 SR finding を反証した。重複候補は統合し、`SR-025`〜`SR-028` を採用した。
- Phase 3（Gate・成果物）: 完了。既存 `review-gates.md` の Critical 基準、Finding Status、traceability、docs-only validation、Git scope を適用した。

## Evidence Used

| 区分 | 資料 / 確認内容 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、phase boundary、scope、security、change-aware validation、Git 運用 |
| Review policy | [`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md)、`review-common` playbook / reviewers / security checklist / gates / output format | Reviewer A〜C、SR severity、Gate、artifact 構成および finding 採用条件 |
| Current Specification | [`react-native.md`](../../specifications/react-native.md) §§1〜26 | RN public contract、coordination、identity、lifecycle、security、platform、artifact、acceptance |
| Common facade Specification | [`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md) §§3〜16 | 16 function、DTO、binary、error、conditional exports、Node / Browser / WASM、package assembly |
| Common Core Specification | [`specification.md`](../../specifications/specification.md) §§4〜14、RN reference diff | Core authority、operation、C ABI、secret、Store、error、non-regression |
| Requirements | [`requirements.md`](../../requirements/requirements.md) `UF-RN-001`、`NFR-008`、`NFR-015`、`AC-054`〜`AC-061` | 外部要求、sync baseline、responsiveness、support matrix、acceptance |
| Requirements Review | [`requirements-review-010.md`](../requirements/requirements-review-010.md) | `READY`、`UF-RN-001: Resolved`、Requirements follow-up がないこと |
| Design | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md) | process-wide authority、runtime / context、C ABI、secret boundary、artifact trust、下流委譲 |
| Design Review | [`react-native-design-review-003.md`](../design/react-native-design-review-003.md) | `DR-RN-001`〜`DR-RN-004` が Resolved、`DR-RN-002` の resolution scope |
| Platform Decision | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) | `PD-RN-001`〜`PD-RN-007` の approved value、support window / Expo pair の specification impact、async gate |
| Previous Specification Review | [`specification-review-013.md`](specification-review-013.md) | `SR-001`〜`SR-024` の初出・severity・completion condition・既存 status |
| Initial DR finding | [`react-native-design-review-001.md`](../design/react-native-design-review-001.md) `DR-RN-002`、[`react-native-design-review-002.md`](../design/react-native-design-review-002.md) | process-wide scope の初出、required correction、前回 Open 状態 |
| Target diff / hashes | target commit の三 Specification diff、requirements / design / decision の unchanged diff、SHA-256 | reviewed HEAD、変更範囲、source identity |

Target Specification の SHA-256 は次のとおりである。

| File | SHA-256 |
| --- | --- |
| `docs/specifications/react-native.md` | `4f1dfd88c76e361f6d04b4f537d99d616aa956f94e9e8242be4ab5e346285443` |
| `docs/specifications/npm-typescript-facade.md` | `01c4bca3426211d1e813bb67024ef9e9a0c155d3b8ca1d1198d8d2e2be897803` |
| `docs/specifications/specification.md` | `c393fa0cec7761474b294f21f82d82e7c414c1ec5d56d9e5fabc81500b16c681` |

Requirements の SHA-256 は `743cd9179259f2018ed24eaab948de509669f2e8f8102fc5fca45bbb5a67d8f2` であり、target commit の親との差分はない。

## Review Result

`READY`

## Summary

RN Specification は、`DR-RN-002` が要求した process-wide RN binding coordination を `§5`〜`§10` に落とし込み、複数 runtime / module registry / logical consumer context の全 invocation、single in-flight Core / C ABI execution、registration、cross-context ordering、runtime-local / process-wide teardown、stale completion、shared-state prohibition および failure isolation を一つのモデルで追跡可能にしている。したがって `DR-RN-002` の Design resolution は Specification 上も適切に反映され、既存の `DR-RN-001`、`DR-RN-003`、`DR-RN-004` の regression も確認されない。

一方、implementation-ready contract としては、次の4件の `Major` finding が残る。

- `SR-025`: C0 / C1 / C2 の意味境界と AC-061 evidence 適用が、C0 は低コストを保証しないという記述と両立していない。C1 / C0 に含まれる password / decrypt / mutation / large Store 相当の評価漏れを許す。
- `SR-026`: callback-originated re-entry と Android lifecycle callback re-entry が `BindingFailure` または stale cleanup の二択で、同じ条件に複数の observable behavior を許す。
- `SR-027`: process-wide coordinator の `initializing` 中の new execution が「待機または fail closed」であり、initialization race の結果、error mapping、ticket の扱いが一意でない。
- `SR-028`: approved decision が要求する RN support window / re-baseline 条件、および formal Expo SDK 57 / RN 0.86 compatibility line が Specification の support matrix に列挙されていない。

Critical はなく、既存 Gate rule では `READY` となる。ただし `READY` は finding-free を意味せず、上記 Major は Specification Author の follow-up として残る。

## Finding Status

### Existing Specification Findings

| ID | Severity | 今回の状態 | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `SR-001` | Major | `RESOLVED / no regression` | specification-review-001 | RN は Core の Chain-specific derivation と既存 facade を再定義せず、共通 Specification を参照する。 |
| `SR-002` | Major | `RESOLVED / no regression` | specification-review-001 / Reopened in 011 | RN は生成 handoff / confirmed finalize と restore の既存区別を維持する。 |
| `SR-003` | Major | `RESOLVED / no regression` | specification-review-001 | Wallet Store wire format、AAD、CBOR、validation は共通正本を参照する。 |
| `SR-004` | Major | `RESOLVED / no regression` | specification-review-001 | DTO、raw bytes、secret boundary、Native / WASM 共通 semantics を維持する。 |
| `SR-005` | Major | `RESOLVED / no regression` | specification-review-001 | `registry_key`、`duplicate_tag`、AAD、index / payload の共通規則を変更しない。 |
| `SR-006` | Minor | `RESOLVED / no regression` | specification-review-001 / Reopened in 011 | Core error / BindingFailure、failure-safe output、secret / replacement 非返却を維持する。 |
| `SR-007` | Major | `RESOLVED / no regression` | specification-review-001 / Reopened in 011 | pending、retry、restart、認証・confirmation の非継承を維持する。 |
| `SR-008` | Major | `RESOLVED / no regression` | specification-review-002 | passwordless key list の DTO 境界を維持する。 |
| `SR-009` | Major | `RESOLVED / no regression` | specification-review-002 | CSPRNG、invalid key、`RandomSourceFailure` を維持する。 |
| `SR-010` | Minor | `RESOLVED / no regression` | specification-review-003 | password recovery / reset 禁止を維持する。 |
| `SR-011` | Major | `RESOLVED / no regression` | specification-review-003 | display name を Core / Store に追加しない。 |
| `SR-012` | Major | `RESOLVED / no regression` | specification-review-004 | Profile / key の一意な対象解決を維持する。 |
| `SR-013` | Major | `RESOLVED / no regression` | specification-review-004 | authentication 後の duplicate / semantic consistency を維持する。 |
| `SR-014` | Major | `RESOLVED / no regression` | specification-review-005 | 同一 Profile・同一 Chain・同一 private key の duplicate 条件を維持する。 |
| `SR-015` | Major | `RESOLVED / no regression` | specification-review-006 | passwordless metadata と整合 Store の境界を維持する。 |
| `SR-016` | Major | `RESOLVED / no regression` | specification-review-006 / Reopened in 011 | Native / WASM の ownership、length、release、failure mapping を維持する。 |
| `SR-017` | Minor | `RESOLVED / no regression` | specification-review-007 | opaque extension、current schema、future version の境界を維持する。 |
| `SR-018` | Major | `RESOLVED / no regression` | specification-review-008 | third-party / host guarantee と Core / Binding responsibility を分離する。 |
| `SR-019` | Major | `RESOLVED / no regression` | specification-review-009 | complete CBOR item、trailing、type、version、fatal validation を維持する。 |
| `SR-020` | Critical | `RESOLVED / no regression` | specification-review-011 | export target、Requested、target-specific Confirmed、password authorization を分離する。 |
| `SR-021` | Critical | `RESOLVED / no regression` | specification-review-011 | signing approval、target、payload、context、password authorization を分離する。 |
| `SR-022` | Major | `RESOLVED / no regression` | specification-review-011 | Profile fixed Network、key fixed Chain、AccountContext mismatch を維持する。 |
| `SR-023` | Major | `RESOLVED / no regression` | specification-review-011 | Symbol / NEM scheme、raw payload、64-byte signature、SDK compatibility を維持する。 |
| `SR-024` | Minor | `RESOLVED / no regression` | specification-review-011 | coverage target と shortfall / security evidence の独立性を維持する。 |

### New Findings

| ID | Severity | Status | 初出 | 概要 |
| --- | --- | --- | --- | --- |
| `SR-025` | Major | **Open** | 本レビュー | C0 / C1 / C2 の class boundary と NFR-015 / AC-061 evidence coverage が一意でない。 |
| `SR-026` | Major | **Open** | 本レビュー | re-entry 時の `BindingFailure` と stale cleanup の選択が observable contract として二択である。 |
| `SR-027` | Major | **Open** | 本レビュー | process-wide `initializing` 中の待機 / fail-closed が二択である。 |
| `SR-028` | Major | **Open** | 本レビュー | RN support window / re-baseline と formal Expo compatibility pair が support matrix に不足する。 |

### Open findings

- Critical: 0
- Major: 4 (`SR-025`〜`SR-028`)
- Minor: 0

### Reopened findings

なし。`SR-001`〜`SR-024` に regression はない。

### New finding IDs

`SR-025`、`SR-026`、`SR-027`、`SR-028`。既存 `SR-001`〜`SR-024`、他フェーズの `DR-*` / `PD-*`、および Design Decision Record と重複しない。

## Required Changes

なし。現行 Specification Review Gate は `Critical` の New / Open / Reopened がある場合だけ `REVISE SPECIFICATION` とするため、今回の Major findings はこの lane には入らない。

## Optional Improvements

本節の4件は単なる文体改善ではなく、現行 Skill の severity lane 上 `Major` の formal follow-up である。Formal Gate は `READY` のままだが、実装・release claim 前に Specification Author が解消し、次回レビューで再確認すべきである。

### `SR-025` — C0 / C1 / C2 evidence scope の不足

- **ID:** `SR-025`
- **Severity:** `Major`
- **Status:** `Open`
- **Location:** [`react-native.md`](../../specifications/react-native.md) §4.2 lines 223〜248、§23.1 lines 940〜967。関連 Requirements は [`requirements.md`](../../requirements/requirements.md) `NFR-015` line 245、`AC-061` line 357。
- **Facts / conditions:** §4.2 は classification を Core step、secret lifetime、Store mutation、evidence type で決めるとするが、C1 の一般的な意味境界を定義していない。C2 だけを `NFR-015` / `AC-061` の responsiveness、blocking、resource、starvation、cleanup evidence の対象とし、C1 は「evidence 上 cost が大きい場合」に限り測定する。さらに C0 は低コストを保証しないと明記する一方、§23 は C0 を測定対象に含めない。
- **Basis:** `NFR-015` / `AC-061` は password KDF、Store encrypt / decrypt、Mnemonic seed / derivation、key derivation、signing、large Store processing 等、classification 名ではなく operation が要求する処理を対象にする。共通 Specification 上、C1 に置かれた `import_software_key`、`generate_software_key`、`get_public_account`、delete 系も password、decrypt、crypto または mutation を必要とし得る。C0 の “not always low cost” も現行本文の明示である。
- **Problem:** class 名の付与と evidence 対象の対応が再現できず、同じ NFR-015 対象処理を持つ operation の一部が C1 / C0 で AC-061 の測定・評価から外れ得る。実装者は class 表だけを根拠に JS blocking、cross-runtime starvation、resource retention、cancellation cleanup を測定しない選択ができる。
- **Impact:** responsiveness の negative evidence を見逃し、async / support exclusion decision gate を発動すべき operation が残る可能性がある。C0 / C1 / C2 が implementation / release evidence の選別に使われるため、これは単なる test organization や exact benchmark detail ではなく、受入条件の適用範囲の欠陥である。
- **Minimum correction:** C0 / C1 / C2 の semantic criteria と各 class の normative effect を定義し、operation が NFR-015 の対象 step、secret-bearing work、Store size または cross-runtime blocking を実行し得る場合に §23 / AC-061 evidence を適用する規則を明示する。C0 / C1 を除外する場合は、その理由と評価責任を operation 単位で明記する。numeric threshold、device model、queue / worker implementation は要求しない。
- **Completion / recheck:** 16 operation が一意の class に残り、class assignment の根拠、serialization / cancellation / cleanup、AC-061 evidence の包含関係を第三者が再現できること。C0 / C1 の該当 operation が responsiveness / resource evidence から意図せず除外されないことを再確認する。

### `SR-026` — re-entry の observable outcome が二択

- **ID:** `SR-026`
- **Severity:** `Major`
- **Status:** `Open`
- **Location:** [`react-native.md`](../../specifications/react-native.md) §8 lines 370〜382、特に callback-originated re-entry の line 375 および Android lifecycle callback の §13.2 lines 583〜589。
- **Facts / conditions:** 同一 context の nested synchronous invocation は `BindingFailure` と明示されるが、callback-originated re-entry は `BindingFailure` **または** stale cleanup、Android lifecycle callback が再入させる場合も `BindingFailure` **または** stale cleanup とされる。§9.2 は invalid identity の stale completion を cleanup-only とし、§19 は caller が観測できる場合に BindingFailure とするが、re-entry が発生した時点で runtime / context が valid か、どの結果を caller が観測するかを §8 の event contract が決めていない。
- **Basis:** Design は lower scope から upper scope への synchronous re-entry を要求せず、common C ABI / facade は binding failure を success に変換しない外部契約を持つ。Specification phase では、valid state の recursive invocation と invalidated state の stale completion を別条件として一意に定義する必要がある。
- **Problem:** 同一条件の callback-originated re-entry に、同期 `WalletCoreError(code = "BindingFailure")` を返す実装と、error / callback を届けず cleanup-only とする実装の両方が適合し得る。これは caller-visible error、retry、ordering および teardown behavior を分岐させる。
- **Impact:** reentrancy guard、lifecycle callback、deadlock avoidance および stale-result handling の相互運用が実装ごとに変わり、public synchronous contract の failure semantics を実装者が選ぶことになる。Core の再入を禁止する safety invariant 自体はあるが、失敗の外部結果が一意でない。
- **Minimum correction:** active な process / runtime / registry / context で callback-originated または lifecycle-originated recursive invocation が発生した場合は一つの failure outcome を定め、既に identity が invalid、cancelled または teardown 中の場合だけ stale cleanup-only とするなど、状態条件と public mapping を分離して明記する。exact guard、mutex、callback primitive は要求しない。
- **Completion / recheck:** §8、§9、§13.2、§19 の event / phase / error table が同じ条件に同じ observable outcome を割り当て、valid re-entry と invalidated stale completion の境界を実装者が推測せずに判断できること。

### `SR-027` — initialization race の admission outcome が二択

- **ID:** `SR-027`
- **Severity:** `Major`
- **Status:** `Open`
- **Location:** [`react-native.md`](../../specifications/react-native.md) §3.2 lines 187〜191、§5.2 lines 285〜299、特に `initializing` state の line 288。関連する process-wide state は §5.1〜§5.3。
- **Facts / conditions:** `initializing` 中の new execution は「待機または fail closed」とされ、first valid registration が initialization を開始する。待機する場合の ticket / descriptor と lifecycle change の扱い、fail closed の場合の public error mapping、B runtime に対する同一 rule、そして初期化失敗後の状態遷移との関係が固定されていない。
- **Basis:** `DR-RN-002` の resolved model は一意の process-wide admission / initialization / teardown authority を要求し、`NFR-008` / `AC-056` は platform / runtime 間で failure を成功と区別できる contract を要求する。exact queue / mutex / single-flight primitive は下流でよいが、wait と fail closed は observable result の選択である。
- **Problem:** runtime A が initializing 中に runtime B が operation を要求したとき、B が後に正常結果を受け取る実装と、initialization error を同期 throw する実装の両方が許される。どちらが適用されるか、どの段階で ticket を持つか、初期化失敗を retry できるかが implementation choice のまま残る。
- **Impact:** cross-runtime ordering、transient initialization failure、JS blocking、retry / fail-closed behavior および test expectation が実装間で分岐する。process-wide coordinator の safety ownership は定義されているが、initialization race を安全に検証できる外部 contract が不足する。
- **Minimum correction:** `initializing` 中の new execution に対する deterministic policy を選び、待機なら readiness / invalidation / failure 時の結果と secret-free descriptor を定義し、fail closed なら public error、ticket、再初期化条件を定義する。初期化失敗は既存の process-wide `unavailable` policy と一貫させる。exact wait primitive / queue は要求しない。
- **Completion / recheck:** Case A / B と initialization failure / runtime invalidation を含む状態表が、全 runtime に同じ admission outcome、error mapping、cleanup、no-secret-retention を与えることを再確認する。

### `SR-028` — approved platform support matrix の window / Expo pair 不足

- **ID:** `SR-028`
- **Severity:** `Major`
- **Status:** `Open`
- **Location:** [`react-native.md`](../../specifications/react-native.md) §1.1 lines 39〜55、§17.1 lines 703〜717、§20.1〜§20.2 lines 791〜819、§22 `AC-058` line 922、§24.2 lines 996〜1006。
- **Facts / conditions:** Specification は RN `>=0.86.x`、`0.87.x` primary、stable-only を記載するが、formal support window、re-baseline condition、将来の stable RN line の扱いを定義していない。Expo は “supported stable Expo SDK / React Native version pair” とだけ記載し、どの pair が formal compatibility line かを列挙していない。
- **Basis:** Approved Decision の `PD-RN-001` は `>=0.86.x` が RN 0.88 等を無期限に保証する意味ではなく、Specification に support window / re-baseline condition が必要と明記する。`PD-RN-007` は Expo SDK 57 stable / RN 0.86 pair を formal compatibility line とし、unlisted pair / mismatch を unsupported とする。`NFR-012` / `AC-058` は support matrix と CI / release gate で判定可能な version support を要求する。
- **Problem:** 現行 Specification の `supported stable pair` は許可集合が未定義で、実装・release は SDK 57 / RN 0.86 だけを対象にも、将来の任意の stable pair を対象にも解釈できる。`incompatible Expo SDK / RN pair` の検出条件も、formal support claim も一意にならない。
- **Impact:** unsupported な stable RN / Expo combination を formal support と誤認したり、release matrix が将来無制限に拡張したりする。Expo prebuild / build-time rejection、support documentation、CI / release evidence の observable scope が分岐し、`AC-058` を実装者の判断だけで完了できる。
- **Minimum correction:** approved input を変更せず、formal RN compatibility lines、support window、re-baseline / end-of-support 条件を記録する。また `PD-RN-007` の formal Expo SDK 57 / RN 0.86 line と、unlisted / mismatch / canary / nightly の exclusion を support matrix / detection contract に反映する。新しい platform choice を要求せず、既存 approved decision の具体化だけを行う。
- **Completion / recheck:** `PD-RN-001` / `PD-RN-007` の approved value と同じ許可集合・除外集合・re-baseline rule が §17、§20、§22、§24 で一致し、Expo pair の build / init rejection が実装者に推測を残さないことを再確認する。

## Resolved Findings

### `SR-001`〜`SR-024`

前回 `specification-review-013.md` で `RESOLVED` とされた `SR-001`〜`SR-024` は、今回の RN 追加によって再発していない。特に次を確認した。

- generated Mnemonic の handoff / confirmed finalize と restore の handoff 対象外を変更していない。
- `Requested` / `Confirmed` / `Approved`、target、payload、AccountContext、per-operation password authorization および assertion freshness の責任境界を維持している。
- Profile fixed Network、Software Key fixed Chain、Symbol / NEM の signing scheme、raw payload、raw 64-byte signature を変更していない。
- Store は opaque であり、current Store / replacement / historical Store の責任を Application / persistence layer に残している。
- C ABI / WASM の error、ownership、length、release、failure-safe output、Native / WASM parity を維持している。
- no-secret-cache、zeroize responsibility、unknown field / version、CBOR / AAD / duplicate semantics、coverage policy の共通契約を変更していない。

Upstream の `DR-RN-001`、`DR-RN-003`、`DR-RN-004` は Design Review 003 の公開判定どおり Resolved を維持し、`DR-RN-002` も §5〜§10 に直接 trace できるため reopened ではない。

## Upstream Feedback

なし。

今回の `SR-025`〜`SR-028` は current Specification の不足であり、Requirements、Design または approved Platform Decision の新しい矛盾ではない。したがって `REQUIREMENTS FOLLOW-UP REQUIRED`、`DESIGN FOLLOW-UP REQUIRED`、`DECISION FOLLOW-UP REQUIRED` は発行しない。Specification Author は既存の approved upstream を変更せずに修正できる。

## Deferred Findings

- exact mutex、queue container、worker / executor、thread model、lock ordering、atomic / memory ordering、generation token、cancellation primitive、JNI、Swift / Objective-C API、JSI method、Codegen method、Kotlin / Swift class decomposition は Implementation scope とする。
- exact timeout、benchmark numeric threshold、device model、copy count、allocator、zeroization primitive、callback mechanism は、現行 Requirements / Design / Specification が要求する evidence と ownership を変えない範囲で下流へ委譲する。
- 実際の Android / iOS build、ABI / slice load、Expo Development Build、Prebuild / CNG、Metro resolver、package assembly、SBOM、provenance、artifact integrity、device / simulator parity は Implementation / Release verification で確認する。
- `NFR-015` / `AC-061` の negative evidence が得られた場合の operation-specific async API または RN support exclusion は `DEFERRED UNTIL NEGATIVE EVIDENCE` を維持する。自動 Promise 化、silent fallback、support exclusion はしない。
- Application が UI で current assertion を取得した事実、current Store を保存・適用する事実、JS engine / OS / crash dump 全体の secret erase は本 Specification Review の実行証拠ではない。
- Browser baseline は今回の RN 対応の対象外であり、新しい Browser policy または user decision は導入していない。

## Scope and Traceability

### Requirements → Specification

| Requirement / feedback | Specification evidence | 判定 |
| --- | --- | --- |
| `UF-RN-001` | `react-native.md` §§4.3、23; sync compatibility、blocking / resource evidence、cleanup、async / exclusion gate | 追跡可能。`SR-025` は evidence 適用範囲の不足として記録 |
| `NFR-008` | §§2〜4、§22、§24.1; 16 operation parity、sync baseline、no runtime-specific silent divergence | 追跡可能。`SR-026` / `SR-027` は failure / admission outcome の明確化が必要 |
| `NFR-015` | §§4.2、4.3、23; cost、JS blocking、resource、starvation、cancellation、cleanup | 追跡あり。ただし C0 / C1 の包含関係が `SR-025` |
| `AC-054` | §22; Android / iOS の同一 facade / DTO / sync return / throw | 追跡可能 |
| `AC-055` | §§1.2、10、11、12、22; Core authority、secret ownership、cleanup、no cache / log | 追跡可能 |
| `AC-056` | §§3、12、13、19、20; fail closed、error mapping、no Node / WASM fallback | 追跡可能 |
| `AC-057` | `npm-typescript-facade.md` §§9〜16、`react-native.md` §§21〜24 | 既存 Node / Browser / WASM / C ABI / release policy の非退行を追跡可能 |
| `AC-058` | `react-native.md` §§1.1、17、20、22、24.2 | baseline は追跡あり。formal window / Expo pair の不足は `SR-028` |
| `AC-059` | §§14、16、20、21、22 | Android / iOS ABI / slice、artifact、rejection を追跡可能 |
| `AC-060` | §§3、12、20、21、`npm-typescript-facade.md` §§9〜10、16 | root import、conditional resolution、no cross-backend fallback を追跡可能 |
| `AC-061` | §§4.2、4.3、22、23 | protocol は存在。class-based evidence の不足は `SR-025` |

### Design → Specification

| Design finding / decision | Specification evidence | 判定 |
| --- | --- | --- |
| `DR-RN-001` | §§2.3、4.3、8、9、23 | public synchrony と execution context、blocking、cleanup、negative gate を維持 |
| `DR-RN-002` | §§5〜10、24.1 | process-wide coordinator、runtime / registry、logical context、serialization、teardown、stale を直接具体化。Resolution reflected |
| `DR-RN-003` | §§1.2、2、11、12、13、15、19、21 | private RN adapter、existing public C ABI reuse、non-exposure、artifact distinction を維持 |
| `DR-RN-004` | §§14、16、21、22、25 | source → controlled build → target → digest / provenance → npm assembly を追跡 |
| Rust Core / RN authority boundary | §§1.2、5.1、10、12、13、19 | RN coordinator は admission / lifecycle / ordering / delivery に限定し、Core の cryptographic / Store / validation / zeroize authority を移転しない |

### Platform Decision → Specification

| Decision | Specification evidence | 判定 |
| --- | --- | --- |
| `PD-RN-001` | §§1.1、17.1、20.1、22、24.2 | RN floor / primary / stable-only は反映。support window / re-baseline は `SR-028` |
| `PD-RN-002` | §§1.1、14.3、20.1 | API 24、target / compile の別管理を反映 |
| `PD-RN-003` | §§1.1、15、16、17.1、20.1 | Bare iOS 15.1、Expo subset 16.4 を反映 |
| `PD-RN-004` | §§1.1、14.1、20.1、21 | Android `arm64-v8a` / `x86_64` only を反映 |
| `PD-RN-005` | §§1.1、16、20.1 | iOS arm64 device / Apple Silicon arm64 simulator を反映 |
| `PD-RN-006` | §§1.1、13、15、18 | New Architecture、TurboModule / JSI、Legacy unsupported を反映 |
| `PD-RN-007` | §§1.1、17、20.1、20.2、22 | workflow / Expo Go / mismatch exclusion は反映。SDK 57 / RN 0.86 formal pair の明示不足は `SR-028` |

## Domain Checks

### Specification structure

`react-native.md` は RN 固有の lifecycle、platform、artifact、Expo、coordination を集約し、public facade、Node / Browser / WASM、C ABI、Core semantics は `npm-typescript-facade.md` と `specification.md` を参照している。`npm-typescript-facade.md` は conditional exports と single root facade の共通正本、`specification.md` は Core / C ABI の共通正本として機能している。RN §2.1 の16 operation列挙と facade §5 / §6 は parity assertion の範囲であり、独立した別 DTO / API を定義していない。normative duplication の新規 divergence は確認されない。

### Public API / exact facade

16 function、argument order、DTO、`Uint8Array`、required field、`null` / `undefined`、sync return / throw、18 Core `ErrorCode` は facade と一致し、TurboModule、JSI、JNI、Swift / Objective-C、C ABI、backend selector、runtime / context ID は application-facing surface に露出しない。RN-specific public API、Promise variant、AbortSignal、secret export、DTO variant もない。

### Runtime selection / conditional exports / RN entry

`react-native` condition は `types` の後、`node-addons` / `default` の前に置かれ、Node normal、Node `--no-addons`、Browser / Extension、RN の routing domain を分離している。Metro が exports を無効化または別 entry を強制する場合の build / initialization failure、RN の Node / WASM silent fallback 禁止、root-only import、`dist/react-native/index.js` の private bootstrap と同一 facade 提供は整合している。`private` は package root の conditional target から到達する内部 implementation entry を意味し、public subpath を意味しないため論理矛盾はない。

### Sync execution / C0-C1-C2

public synchrony と native execution context を分離し、worker + synchronous wait を non-blocking と扱わず、negative evidence なしの Promise 化を禁止している。process-wide serialization は UI / JS thread block の免除ではなく、§23 の blocking / responsiveness evidence 対象である。全16 operation は一意に table 化され、process-wide serialization、cancellation relevance、cleanup、evidence の列を持つ。ただし class の定義・適用範囲に `SR-025` がある。

### Process-wide authority / DR-RN-002 resolution adequacy

全 RN runtime、module registry、module instance、logical consumer context の invocation が一つの process-wide RN coordinator を通り、v1 は Core / C ABI execution を最大1件に制限する。runtime / registry は registration、validity、delivery、local teardown、logical context は local ordering、reentrancy、request lifecycle を担い、coordinator を bypass しない。Rust Core は cryptography、private key、Mnemonic、signature、Store integrity、validation、authorization、zeroization の authority を維持する。従って process-wide authority は一意で、DR-RN-002 の原問題を直接解消している。

### Serialization / cross-runtime responsiveness

admission identity に基づく cross-context order、in-flight、cleanup 後の次 operation、starvation observation、JS / UI blocking、resource retention、negative async / exclusion gate がある。長時間の runtime A により runtime B が待つ可能性を safety-first v1 policy として扱い、NFR-015 / AC-061 を免除していない。exact fairness / queue policy は Implementation scope であり、不要に固定していない。

### Runtime / registry identity / logical context

runtime、module registry、module instance、reload、replacement、provider replacement は新しい registration identity とし、generation / token primitive は実装へ委譲している。delivery は process / runtime / registry / context / request identity の一致を要求する。logical context は internal-only で、Application が ID を生成・保存・指定せず、context-local ordering、reentrancy、request cancellation / lifecycle を持つ。authority overlap は階層上説明可能である。

### Reentrancy

同一 context の nested synchronous invocation は BindingFailure と明記され、lower-to-upper synchronous re-entry、Core callback、UI callback、recursive public call を要求しない。しかし callback-originated / Android lifecycle callback re-entry の `BindingFailure または stale cleanup` が二択であり、`SR-026` を発行する。

### Cancellation / teardown / stale completion

admission 前、admission 後 / Core 前、Core 中、Core 完了後 / delivery 前、runtime invalidation、process teardown の phase distinction がある。public cancellation API は追加せず、Core 開始後の forced thread kill を要求せず、cancellation / reload / replacement / context destruction / teardown / superseded request の stale result を delivery せず cleanup する。runtime-local teardown は他 runtime の shared resource を破壊せず、process-wide teardown は coordinator が admission reject、delivery disable、cleanup barrier、closed transition を所有する。

### Shared resource / secret transport / string / binary

process-wide shared state は coordinator、registration、artifact / native availability、in-flight validity、teardown metadata に限定され、private key、Mnemonic、seed、password、passphrase、decrypted Store、payload、signature intermediate、Profile secret state、authorization result、cache は共有しない。`Uint8Array` の view range（`byteOffset` / `byteLength`）、caller ownership、native temporary、`InputBytes` pointer + length、no NUL、C ABI output copy、`snwc_release_bytes` exact once、stale-before-copy、failure / cancellation / teardown cleanup が定義される。semantic string は strict UTF-8、no implicit normalization、embedded NUL / unpaired surrogate rejection、Core の password / mnemonic semantics を維持する。secret lifetime regression はない。

### Error model / C ABI reuse

Core error、C ABI error、`BindingFailure`、`BackendInitializationError`、unsupported platform / ABI / architecture、runtime invalidation、stale、Expo Go、shared resource failure の境界が既存 public namespace へ mapping される。RN-specific public error code / class は追加しない。RN private adapter は existing public C ABI の InputBytes、OperationResult、OwnedBytes、error、release、ownership を内部再利用し、新規 public C ABI、lifecycle policy の C ABI 漏出、Core semantics の再実装を要求しない。

### Android / iOS / Expo / New Architecture

Android は API 24、`arm64-v8a` / `x86_64`、TurboModule / Codegen / JSI、thin native mediation、exact two `.so`、unsupported ABI rejection、target / compile policy 分離を定義する。iOS は TurboModule / JSI、C ABI reuse、device arm64、Apple Silicon simulator arm64、Intel simulator exclusion、Bare 15.1、Expo subset 16.4、XCFramework slice / link / provenance を定義する。Expo Development Build、Prebuild / CNG、custom native module workflow は formal、Expo Go、incompatible pair、canary / nightly は unsupported であり、New Architecture mandatory / Legacy fallback なしも明確である。Expo pair の許可集合だけ `SR-028` に残る。

### Artifact integrity / provenance / npm assembly

source revision → controlled build → target artifact → digest / provenance → approved npm assembly → published package の一方向 chain、RN manifest、Android allowlist、iOS slices、single npm package、Node manifest との分離、extra artifact / mismatch reject、SBOM / provenance non-regression を定義している。RN artifact を standalone public C ABI release asset にせず、既存 release policy を置き換えない。

### Acceptance / responsiveness / deferred async

`AC-054`〜`AC-061` の API parity、Core authority / secret cleanup、fail closed、non-regression、version、ABI、integration、responsiveness evidence を §22 に trace している。§23 は representative Android / iOS device class、production-equivalent build、representative / reasonable worst-case input、JS / UI blocking、resource、starvation、cleanup、lifecycle interruption、raw observation、evaluation result、compatibility impact を求め、arbitrary numeric threshold は追加していない。negative evidence 時だけ async API / RN exclusion の user decision に戻る。なお C0 / C1 の evidence containment は `SR-025`、platform matrix completeness は `SR-028` の follow-up である。

### Non-regression / Design-Implementation boundary

Node native、Node WASM fallback、Browser WASM、Browser Extension、TypeScript facade、existing public C ABI、existing conditional exports semantics、single package、SBOM、provenance、artifact integrity、release policy は RN-specific domain と分離される。RN specification は responsibility、observable contract、invariant、acceptance evidence に留まり、exact mutex、queue、worker、class decomposition、JNI / Swift / ObjC API、JSI exact method、Promise shape、timeout、benchmark threshold を不必要に固定していない。未定義のうち observable admission / re-entry / support matrix は `SR-026`〜`SR-028`、実装詳細は Deferred と区別した。

### Decision and follow-up status

- `NEEDS USER DECISION`: 現時点の active decision は **なし**。`PD-RN-001`〜`PD-RN-007` は Approved。
- `DEFERRED UNTIL NEGATIVE EVIDENCE`: operation-specific async API / RN support exclusion。レビュー中に発動していない。
- `REQUIREMENTS FOLLOW-UP REQUIRED`: **なし**。
- `DESIGN FOLLOW-UP REQUIRED`: **なし**。
- `DECISION FOLLOW-UP REQUIRED`: **なし**。`SR-028` は既存 Approved Decision の Specification への反映不足であり、新しい decision を要求しない。

## Validation Results

- 実施: `git rev-parse --abbrev-ref HEAD`、`git rev-parse HEAD`、`git status --short --branch` により branch `agent/react-native-support`、HEAD `0dd0d9d...`、レビュー開始時 clean を確認した。
- 実施: `git diff --name-only <target>^ <target>` により target commit の canonical Specification 変更が指定された三ファイルだけであることを確認した。
- 実施: Requirements、Design、Decision の target parent 差分を確認し、Requirements が変更されていないこと、既存 upstream artifact をレビュー中に変更しないことを確認した。
- 実施: target Specification 三ファイル、Requirements、Design、Decision、upstream review の SHA-256 を取得した。target Specification hash は Evidence Used に記録した。
- 実施: 16 operation の facade declaration、operation traceability table、RN classification table、`AC-054`〜`AC-061` matrix の coverage を照合した。
- 実施: `SR-001`〜`SR-024` の ID / severity / status / completion condition を previous review と照合し、全件 `RESOLVED / no regression` とした。`SR-025`〜`SR-028` の未使用 ID を確認した。
- 実施: normative duplication、cross-spec consistency、Requirements → Design → Decision → Specification traceability、C ABI reuse、non-regression、platform matrix、secret / stale / teardown contract を本文と参照資料で照合した。
- 実施: fenced block の開閉、Markdown table の構文、相対 link の存在、review artifact の章順序・finding format を検証した。
- 実施: `git diff --check` および staging 後の `git diff --cached --check` を実行し、whitespace error がないことを確認した。
- 未実施: Rust、npm、Node、WASM、React Native、Android、iOS、Expo、release の full tests / build。今回の変更は docs-only review artifact であり、ユーザー指定どおり実装変更がないためである。
- 未確認: 実装が Specification に適合すること、native buffer の実 lifetime、device / simulator responsiveness、package assembly、artifact digest / provenance の実証および AC evidence の実データ。未実行・未確認を成功とは扱っていない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | PASS | RN 固有 scope、共通 facade / Core、platform、Expo、non-regression、Design / Implementation boundary が一意に示される。 | `SR-028` は support matrix follow-up |
| 2. 契約 | PASS（Major follow-up） | public API、DTO、binary、sync、routing、error、lifecycle、secret、C ABI の大枠は確認可能。ただし C0/C1/C2、re-entry、initializing outcome に Major gap がある。 | `SR-025`〜`SR-027` |
| 3. 処理と例外 | PASS（Major follow-up） | admission、in-flight、cancellation、teardown、stale、fail closed、cleanup の主要 flow は定義されるが、initialization / re-entry outcome が二択である。 | `SR-026`、`SR-027` |
| 4. 内部整合性 | PASS（Major follow-up） | Requirements / Design / Decision との主要整合、Core / RN authority、Node / Browser / WASM non-regression は維持される。class evidence と support matrix の不足を残す。 | `SR-025`、`SR-028` |
| 5. 検証可能性 | PASS（Major follow-up） | AC-054〜AC-061 と responsiveness protocol は存在するが、C0/C1 の evidence containment と Expo/version allowed set が未完成である。 | `SR-025`、`SR-028` |
| 6. 安全性と相互運用性 | PASS | Rust Core security authority、secret non-retention、C ABI ownership、String / binary、fail closed、artifact trust、Symbol / NEM 共通 contract に Critical gap はない。 | なし |
| 7. 上流整合性 | PASS | Requirements Review / Design Review は READY、Platform Decision は Approved。今回の findings は upstream contradiction ではない。 | なし |

Formal Gate: **`READY`**。`Critical = 0` のため、既存 `review-gates.md` の rule に従う。Major / Minor を独自に Gate failure へ変更していない。`SR-025`〜`SR-028` は Open のため、Specification が finding-free または implementation-ready 完了済みであることを意味しない。

## Remaining Risks and Open Decisions

- Open Major: `SR-025`〜`SR-028`。C0/C1/C2 evidence scope、re-entry outcome、initialization race outcome、RN support window / Expo pair を Specification Author が明確化する必要がある。
- Specification の active `NEEDS USER DECISION`: なし。`PD-RN-001`〜`PD-RN-007` は Approved。
- Async decision: `DEFERRED UNTIL NEGATIVE EVIDENCE`。negative responsiveness / resource / cleanup evidence は今回実行していないため、gate を発動していない。
- Upstream: Requirements follow-up、Design follow-up、Decision follow-up はいずれもなし。
- `DR-RN-002`: upstream Design Review 003 で Resolved。process-wide authority、runtime / registry、logical context、teardown、stale、shared resource の Specification trace は確認済みで、reopen していない。
- Residual downstream risk: 実装が sync wait を UI / JS non-blocking と誤認しないこと、C0/C1 operation の evidence 漏れを `SR-025` 解消後に防ぐこと、unlisted Expo pair を `SR-028` 解消後に formal support と誤認しないこと。

## Automatic Changes

レビュー中に変更したのは、この新規 review artifact のみである。Canonical Specification、Requirements、Design、Platform Decision、Concept、Implementation、Test、Fixture、README、package.json、CI / release workflow、既存 review artifact は変更していない。

## Final Decision

`READY`

Formal Gate は Critical 0 件により `READY`。`SR-001`〜`SR-024` は Resolved、`SR-025`〜`SR-028` は Major Open、Reopened はなく、Requirements / Design / Decision follow-up はない。RN の process-wide coordination と security boundary は implementation contract に反映されているが、Major findings の再確認を終えるまで Specification を finding-free と扱わない。

# Specification Review 015

## Review Target

| 項目 | 内容 |
| --- | --- |
| Repository | `nemnesia/symbol-nem-wallet-core` |
| Branch | `agent/react-native-support` |
| Reviewed HEAD | `a15431353fe348369ca1a2532461d5d0e832afc7` |
| Previous Specification Review | [`specification-review-014.md`](specification-review-014.md) — `READY`、`SR-025`〜`SR-028` は Open |
| Canonical Specification | [`react-native.md`](../../specifications/react-native.md)、[`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md)、[`specification.md`](../../specifications/specification.md) |
| Upstream Requirements | [`requirements.md`](../../requirements/requirements.md)、[`requirements-review-010.md`](../requirements/requirements-review-010.md) — `READY`、Requirements finding は解消済み |
| Upstream Design | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md)、[`react-native-design-review-003.md`](../design/react-native-design-review-003.md) — `READY`、`DR-RN-001`〜`DR-RN-004` は Resolved |
| Platform Decision | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) — `PD-RN-001`〜`PD-RN-007` は `APPROVED` |
| Review date | 2026-09-05 (Asia/Tokyo) |
| Review scope | 前回 Open の `SR-025`〜`SR-028` の resolution、Specification 全体の実装可能性、Requirements / Design / Platform Decision traceability、既存 public API / C ABI / Node / Browser / WASM / release policy の非退行 |
| Unvalidated scope | Rust、Native C ABI、Node、WASM、React Native、Android、iOS、Expo、package assembly、CI、release、device / simulator 実行および production responsiveness evidence |
| Phase Context | `AGENTS.md` に Specification の登録はなく、使用していない |

指定された HEAD を対象とし、レビュー中に Concept、Requirements、Design、Decision、Canonical Specification、Implementation、Test、CI / release workflow は変更していない。

今回の対象 HEAD の親からの変更は [`react-native.md`](../../specifications/react-native.md) のみである。`npm-typescript-facade.md`、`specification.md`、Requirements、Design および Platform Decision は前回レビュー対象から変更されていない。

## Execution Audit

- 実行モード: サブエージェントを使用しない自己レビュー。実施していない起動・投票は記録していない。
- Reviewer A（契約の明確性・完全性）: 完了。SR-025〜SR-028 の修正、16 operation、API、DTO、error、state、ordering、runtime identity、lifecycle および acceptance contract を確認した。
- Reviewer B（利用価値・運用適合性）: 完了。Requirements / Design / Decision traceability、support matrix、cross-runtime blocking、responsiveness gate、conditional exports、Node / Browser / WASM non-regression を確認した。
- Reviewer C（Security / Interoperability primary）: 完了。Rust Core authority、C ABI reuse、secret transport / cleanup、stale completion、fail-closed、String / binary、artifact provenance、Store / signing / chain / network boundary を確認した。
- Phase 0（対象・根拠・境界）: 完了。指定 HEAD、前回 review、upstream、同一 phase の既存 artifact、Skill rule および review artifact のみを変更対象として確定した。
- Phase 1（独立レビュー）: 完了。Reviewer A / B / C の担当観点を分けて確認した。
- Phase 2（反証・統合）: 完了。SR-025〜SR-028 の completion condition、全16 operation、re-entry、initialization race、support window、Expo pair、既存 finding regression および新規矛盾を反証した。
- Phase 3（Gate・成果物）: 完了。既存 `review-gates.md` の Critical 基準、finding status、traceability、docs-only validation および Git scope を適用した。

## Evidence Used

| 区分 | 資料 / 確認内容 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、phase boundary、scope、security、change-aware validation、Git 運用 |
| Review policy | [`spec-review/SKILL.md`](../../../.agents/skills/spec-review/SKILL.md)、[`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、reviewers、security checklist、gates、output format | Reviewer 観点、SR severity、Gate、finding 条件、artifact 形式 |
| Previous review | [`specification-review-014.md`](specification-review-014.md) | `SR-025`〜`SR-028` の原 finding、minimum correction、completion / recheck condition、前回 Gate |
| Current RN Specification | [`react-native.md`](../../specifications/react-native.md) §§1〜26 | 今回の修正、RN public contract、classification、coordination、identity、lifecycle、platform、artifact、acceptance |
| Common facade | [`npm-typescript-facade.md`](../../specifications/npm-typescript-facade.md) §§1〜16 | 16 operation、DTO、binary、error、conditional exports、Node / Browser / WASM、package assembly |
| Common Specification | [`specification.md`](../../specifications/specification.md) §§1〜14 | Core、C ABI、Store、cryptography、authorization、String / binary、failure-safe、parity |
| Requirements | [`requirements.md`](../../requirements/requirements.md) `UF-RN-001`、`NFR-008`、`NFR-015`、`AC-054`〜`AC-061` | 上流要求と acceptance traceability |
| Requirements Review | [`requirements-review-010.md`](../requirements/requirements-review-010.md) | Requirements `READY`、`UF-RN-001` / `RR-001`〜`RR-029` の status |
| Design | [`architecture.md`](../../design/architecture.md)、[`bindings.md`](../../design/bindings.md)、[`security.md`](../../design/security.md) | authority hierarchy、lifecycle、secret boundary、process-wide coordination、C ABI reuse |
| Design Review | [`react-native-design-review-003.md`](../design/react-native-design-review-003.md) | `DR-RN-001`〜`DR-RN-004` の Resolution と upstream Gate |
| Platform Decision | [`react-native-platform-baseline.md`](../../decisions/react-native-platform-baseline.md) `PD-RN-001`〜`PD-RN-007` | RN / Android / iOS / Expo / architecture の approved value と re-baseline policy |
| Git evidence | target commit diff、working tree、target / upstream hashes | 変更範囲、immutability、target identity |

## Review Result

`READY`

## Summary

前回 Open だった `SR-025`〜`SR-028` は、今回の Specification 修正によりすべて `Resolved` と判定する。

- `SR-025`: C0 / C1 / C2 の semantic criteria と evidence の包含関係が明示され、全16 operation の common baseline、NFR-015 / AC-061 trigger-set、C2 の常時対象、C0 / C1 の operation-specific evidence、唯一の full execution-cost 除外対象が定義された。
- `SR-026`: valid active identity の callback / lifecycle re-entry は即時 `BindingFailure`、invalid / cancelled / teardown 中の nested request は admission せず stale cleanup-only と明示され、Android と public error mapping が一致した。
- `SR-027`: `initializing` 中の全 runtime の new execution は即時 `BackendInitializationError` とし、ticket / descriptor / secret conversion / retry を持たず、失敗後は process-wide `unavailable` とする一意の admission policy になった。
- `SR-028`: RN の finite support window を `0.86.x` compatibility / `0.87.x` primary に限定し、re-baseline 条件および Expo SDK `57` stable + RN `0.86.x` の formal pair と除外集合が明示された。

既存 `SR-001`〜`SR-024` に regression はなく、新規 finding もない。Critical / Major / Minor はすべて 0 件であり、既存 project rule に基づく Formal Review Gate は `READY` である。

## Finding Status

### Existing Specification Findings

| ID | Severity | 今回の状態 | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| `SR-001` | Major | `RESOLVED / no regression` | specification-review-001 | RN は既存 facade / Core の Chain-specific semantics を再定義しない。 |
| `SR-002` | Major | `RESOLVED / no regression` | specification-review-001 / Reopened in 011 | generated handoff / confirmed finalize と restore の区別を維持する。 |
| `SR-003` | Major | `RESOLVED / no regression` | specification-review-001 | Wallet Store wire format、AAD、CBOR、validation は共通正本を参照する。 |
| `SR-004` | Major | `RESOLVED / no regression` | specification-review-001 | DTO、raw bytes、secret boundary、Native / WASM 共通 semantics を維持する。 |
| `SR-005` | Major | `RESOLVED / no regression` | specification-review-001 | registry key、duplicate tag、AAD、index / payload の規則を変更しない。 |
| `SR-006` | Minor | `RESOLVED / no regression` | specification-review-001 / Reopened in 011 | Core error、BindingFailure、failure-safe、secret / replacement 非返却を維持する。 |
| `SR-007` | Major | `RESOLVED / no regression` | specification-review-001 / Reopened in 011 | pending、retry、restart、authentication / confirmation の非継承を維持する。 |
| `SR-008` | Major | `RESOLVED / no regression` | specification-review-002 | passwordless key list の DTO 境界を維持する。 |
| `SR-009` | Major | `RESOLVED / no regression` | specification-review-002 | CSPRNG、invalid key、`RandomSourceFailure` を維持する。 |
| `SR-010` | Minor | `RESOLVED / no regression` | specification-review-003 | password recovery / reset 禁止を維持する。 |
| `SR-011` | Major | `RESOLVED / no regression` | specification-review-003 | display name を Core / Store に追加しない。 |
| `SR-012` | Major | `RESOLVED / no regression` | specification-review-004 | Profile / key の一意な対象解決を維持する。 |
| `SR-013` | Major | `RESOLVED / no regression` | specification-review-004 | authentication 後の duplicate / semantic consistency を維持する。 |
| `SR-014` | Major | `RESOLVED / no regression` | specification-review-005 | 同一 Profile・同一 Chain・同一 private key の duplicate 条件を維持する。 |
| `SR-015` | Major | `RESOLVED / no regression` | specification-review-006 | passwordless metadata と整合 Store の境界を維持する。 |
| `SR-016` | Major | `RESOLVED / no regression` | specification-review-006 / Reopened in 011 | Native / WASM ownership、length、release、failure mapping を維持する。 |
| `SR-017` | Minor | `RESOLVED / no regression` | specification-review-007 | opaque extension、current schema、future version の境界を維持する。 |
| `SR-018` | Major | `RESOLVED / no regression` | specification-review-008 | third-party / host guarantee と Core / Binding responsibility を分離する。 |
| `SR-019` | Major | `RESOLVED / no regression` | specification-review-009 | complete CBOR item、trailing、type、version、fatal validation を維持する。 |
| `SR-020` | Critical | `RESOLVED / no regression` | specification-review-011 | export target、Requested、target-specific Confirmed、password authorization を分離する。 |
| `SR-021` | Critical | `RESOLVED / no regression` | specification-review-011 | signing approval、target、payload、context、password authorization を分離する。 |
| `SR-022` | Major | `RESOLVED / no regression` | specification-review-011 | Profile fixed Network、key fixed Chain、AccountContext mismatch を維持する。 |
| `SR-023` | Major | `RESOLVED / no regression` | specification-review-011 | Symbol / NEM scheme、raw payload、64-byte signature、SDK compatibility を維持する。 |
| `SR-024` | Minor | `RESOLVED / no regression` | specification-review-011 | coverage target と shortfall / security evidence の独立性を維持する。 |

### Re-reviewed findings

| ID | Severity | 今回判定 | 解決確認 |
| --- | --- | --- | --- |
| `SR-025` | Major | **Resolved** | `react-native.md` §4.2 が class criteria、common baseline、NFR-015 / AC-061 trigger-set、16 operation 単位の inclusion / exclusion を定義した。 |
| `SR-026` | Major | **Resolved** | `react-native.md` §§8、13.2、19.1 が valid active re-entry と invalid / cancelled / teardown stale request を分離し、各 outcome を一意化した。 |
| `SR-027` | Major | **Resolved** | `react-native.md` §5.2 が initializing 中の all-runtime immediate fail-closed、no ticket / descriptor / secret / retry、failure 後の unavailable を定義した。 |
| `SR-028` | Major | **Resolved** | `react-native.md` §§1.1、17、20、22、24.2 が finite RN window、re-baseline、Expo SDK 57 + RN 0.86.x pair、unsupported set を反映した。 |

### Open findings

- Critical: 0
- Major: 0
- Minor: 0

### Reopened findings

なし。`SR-001`〜`SR-028` はすべて Resolved であり、今回の target commit による regression は確認されなかった。

### New finding IDs

なし。

## Required Changes

なし。Critical の New / Open / Reopened は存在しない。

## Optional Improvements

なし。Major / Minor の New / Open / Reopened は存在しない。実装、integration、release で収集すべき evidence は `Deferred Findings` として区別する。

## Resolved Findings

### `SR-025`〜`SR-028`

前回の completion condition をすべて満たす。

- `SR-025`: class は速度や non-blocking を保証せず、全16 operation に common baseline evidence を要求したうえで、NFR-015 / AC-061 に該当し得る Core step、secret lifetime、Store / opaque input size または result lifecycle を持つ C0 / C1 にも operation-specific evidence を適用する。`create_empty_store` のみ full execution-cost measurement の除外理由が明示され、`list_profiles` / `list_software_keys` と全C1は対象とされる。
- `SR-026`: valid active process / runtime / registry / context の callback-originated または recursive invocation は `WalletCoreError(code = "BindingFailure")`、invalid / cancelled / teardown 中の nested request は admission せず error callback を合成しない stale cleanup-only である。Android §13.2 と §19.1 の mapping も同じ条件を使用する。
- `SR-027`: `initializing` 中は全 runtime 共通で同期 `BackendInitializationError`、ticket / queue descriptor / secret conversion / C ABI invocation / automatic retry なし。初期化失敗または initiating identity invalidation は `unavailable` とし、後続 execution を同じ error で拒否する。
- `SR-028`: `>=0.86.x` を floor としつつ v1 formal window を stable `0.86.x` compatibility / `0.87.x` primary に限定し、未列挙 minor、canary / nightly / `next` を除外する。Expo formal pair は SDK `57` stable + RN `0.86.x` のみで、matrix、detection、acceptance、traceability に反映される。

`SR-001`〜`SR-024` は前回までに Resolved とされた completion condition を維持しており、今回の RN Specification 更新で再発していない。

## Upstream Feedback

なし。`SR-025`〜`SR-028` は current Specification の defect であり、承認済み Requirements、Design または Platform Decision の追加修正を必要としない。`REQUIREMENTS FOLLOW-UP REQUIRED`、`DESIGN FOLLOW-UP REQUIRED`、`DECISION FOLLOW-UP REQUIRED` は発行しない。

## Deferred Findings

以下は本レビューの formal finding ではなく、Implementation / Integration / Release で確認する事項である。

- 実際の Android / iOS device・simulator における API parity、Core / C ABI output parity、runtime reload、multi-runtime serialization、teardown、cancellation、stale result および secret cleanup。
- production-equivalent build における JS / UI blocking、admission wait、starvation、native CPU / memory / resource retention と `AC-061` の raw observation。negative evidence が出た場合だけ async API / RN support exclusion を user decision へ戻す。
- Android / iOS artifact、ABI / slice、manifest digest、controlled build、provenance、npm assembly、Expo Development Build / Prebuild の実証。
- exact mutex、queue、executor、worker、thread、generation primitive、lock ordering、callback mechanism、JNI、Swift / Objective-C API、JSI method、timeout および benchmark threshold。これらは Specification に新しい observable divergence を生じさせない範囲で下流へ委譲されている。
- Browser baseline および既存 Node / WASM release validation。今回の Specification correction は RN domain に限定され、Browser policy や新しい user decision を追加しない。

## Scope and Traceability

### Requirements → Specification

| Requirement / feedback | Specification evidence | 判定 |
| --- | --- | --- |
| `UF-RN-001` | `react-native.md` §§4.3、23 | sync compatibility、responsiveness / resource evidence、cleanup、async / exclusion gate を維持。SR-025 resolution により class-based omission を禁止 |
| `NFR-008` | §§2、3、4 | 16 operation parity、sync baseline、no silent runtime divergence、SR-026 / SR-027 の deterministic outcome |
| `NFR-015` | §4.2、§4.3、§23 | class-independent trigger-set、JS / UI blocking、resource、starvation、cancellation、cleanup evidence |
| `AC-054` | §22 | Android / iOS の同一 facade、DTO、sync return / throw |
| `AC-055` | §§1.2、10、11、22 | Core authority、secret ownership、cleanup、no cache / no log |
| `AC-056` | §§3、12、13、19、20、22 | fail closed、error mapping、no Node / WASM fallback |
| `AC-057` | facade §§9〜16、RN §§21〜24 | Node / Browser / WASM / C ABI / release non-regression |
| `AC-058` | RN §§1.1、17、20、22、24.2 | finite RN window、re-baseline、Expo SDK 57 + RN 0.86.x pair |
| `AC-059` | §§14、16、20、22 | Android ABI、iOS slice、artifact、unsupported rejection |
| `AC-060` | §§3、12、20、21、22 | root import、conditional resolution、no cross-backend fallback |
| `AC-061` | §§4.2、4.3、22、23 | common baseline、trigger-set、production-equivalent evidence、negative gate |

### Design → Specification

| Design finding / decision | Specification evidence | 判定 |
| --- | --- | --- |
| `DR-RN-001` | §§2.3、4.1〜4.3、8、9 | public synchrony と execution context、blocking、cancellation、cleanup、async gate を維持 |
| `DR-RN-002` | §§5〜10、12、19 | process-wide coordinator、runtime / registry、logical context、serialization、teardown、stale、shared failure を具体化 |
| `DR-RN-003` | §§1.2、3.2、11、12、13、15、21 | private RN entry、existing public C ABI reuse、non-exposure、artifact boundary を維持 |
| `DR-RN-004` | §§14、16、20、21、22、25 | source → controlled build → target → digest / provenance → npm assembly を維持 |
| Rust Core / RN authority boundary | §§1.2、5.1、10、12、19 | RN は admission / lifecycle / ordering / delivery に限定し、Core の crypto、private key、Mnemonic、signature、Store、validation、authorization、zeroize authority を移転しない |

### Platform Decision → Specification

| Decision | Specification evidence | 判定 |
| --- | --- | --- |
| `PD-RN-001` | §§1.1、17.1、20.1、20.2、22、23、24.2 | floor、finite `0.86.x` / `0.87.x` window、stable-only、re-baseline を反映 |
| `PD-RN-002` | §§1.1、14.3、20.1 | Android API 24、target / compile policy の分離 |
| `PD-RN-003` | §§1.1、15、16、17.1、20.1 | Bare iOS 15.1、Expo subset iOS 16.4 |
| `PD-RN-004` | §§1.1、14.1、20.1、21 | Android `arm64-v8a` / `x86_64` only |
| `PD-RN-005` | §§1.1、16、20.1 | iOS device arm64、Apple Silicon simulator arm64 |
| `PD-RN-006` | §§1.1、13、15、18 | New Architecture、TurboModule / JSI required、Legacy unsupported |
| `PD-RN-007` | §§1.1、17、20.1、20.2、22、23 | Bare / Development Build / Prebuild / custom module formal、Expo SDK 57 + RN 0.86.x pair、Expo Go / mismatch / unlisted / canary / nightly unsupported |

## Domain Checks

### Specification structure

RN 固有の coordination、runtime identity、lifecycle、platform、artifact、Expo および responsiveness contract は `react-native.md` に集約され、public facade、Node / Browser / WASM routing、C ABI、Core / Store semantics は共通 Specification を参照する。facade / common Specification との同一 API は parity assertion と traceability であり、別の DTO / operation contract を二重定義していない。今回の変更で normative duplication、contradicting requirement、stale duplicate は確認されない。

### Requirements / Design / Decision traceability

`UF-RN-001`、`NFR-008`、`NFR-015`、`AC-054`〜`AC-061`、`DR-RN-001`〜`DR-RN-004`、`PD-RN-001`〜`PD-RN-007` が現行 Specification の該当節へ追跡できる。Specification は upstream にない public API、mandatory platform value、async contract または user decision を追加していない。SR-028 の finite window / Expo pair は approved decision の具体化である。

### Public API / exact TypeScript facade

既存16 function、argument order、return type、DTO shape、`Uint8Array`、`null` / `undefined`、synchronous return / throw、既存18 Core `ErrorCode` が RN と `npm-typescript-facade.md` で一致する。RN-specific Promise、AbortSignal、backend selector、runtime / context ID、TurboModule、JSI、JNI、Swift / Objective-C、C ABI surface は application-facing public API に露出しない。

### Runtime selection / conditional exports / RN entry

`react-native` condition は `types` の後、`node-addons` / `default` の前に置かれ、Node normal、Node `--no-addons`、Browser / Extension、RN の routing を分離する。Metro が exports を無効化または別 entry を強制する場合、RN native provider 不在として initialization failure になり、Node / Browser / WASM へ silent fallback しない。`dist/react-native/index.js` は root conditional target から到達する private bootstrap であり、public subpath や backend-specific API ではない。

### Sync execution / C0-C1-C2 / process-wide coordination

public synchrony と native execution context を分離し、worker + synchronous wait を non-blocking と扱わない。全16 operation は一意に C0 / C1 / C2 へ分類され、class criteria、serialization、cancellation、cleanup、common baseline および operation-specific evidence の包含関係が明示された。全 RN invocation は単一 process-wide coordinator を通過し、v1 の Core / C ABI execution は一件のみである。`initializing` の admission outcome も一意である。

### Serialization / responsiveness / cross-runtime blocking

runtime A の long-running operation が runtime B を待たせ得ることは safety-first v1 policy として維持される。全 operation の blocking、admission wait、starvation、resource retention、lifecycle cleanup が common baseline の evidence 対象で、trigger-set operation は §23 の full evidence 対象である。process-wide serialization は UI / JS thread blocking の免除ではなく、negative evidence 時の async / support exclusion gate も維持される。fairness algorithm、queue policy、worker count は固定されていない。

### Runtime / registry identity / logical context

runtime、module registry、module instance、reload、replacement、provider replacement は新しい registration identity とし、generation / token の primitive は implementation に委譲される。delivery は process、runtime、registry、context、request identity と state validity の一致を要求する。logical context は binding-owned internal scope であり、Application に context ID を公開せず、runtime / registry を跨いで共有しない。ordering、reentrancy、cancellation、lifecycle の責任は process-wide authority と競合しない。

### Reentrancy / cancellation / teardown / stale completion

valid active identity の callback / lifecycle recursive invocation は `BindingFailure`、invalid / cancelled / teardown 中の nested request は stale cleanup-only で一意である。admission 前、admission 後 / Core 前、Core 中、Core 完了後 / delivery 前、runtime invalidation、process teardown の cancellation phase が定義され、forced thread kill は要求されない。runtime-local teardown は他 runtime の shared resource を破壊せず、process-wide teardown は coordinator が draining、delivery disable、cleanup barrier、closed transition を所有する。reload、replacement、cancellation、context destruction、superseded request 等の stale result は success delivery、state mutation、secret retention を行わない。

### Shared resource / secret transport / string / binary

process-wide shared state は coordination metadata、registration、native availability、in-flight validity、teardown metadata に限定され、private key、Mnemonic、seed、password、passphrase、decrypted Store、payload、signature intermediate、Profile secret state、authorization result、cache は共有されない。`Uint8Array` は view の `byteOffset` / `byteLength` 範囲だけを読み、native temporary、C ABI `InputBytes`、`OwnedBytes`、copy、release once、stale-before-copy、failure / cancellation / teardown cleanup が定義される。strict UTF-8、no implicit normalization、embedded NUL / unpaired surrogate rejection、既存 Core password / Mnemonic semantics も維持される。

### Error model / C ABI / Core authority

Core error、C ABI error、`BindingFailure`、`BackendInitializationError`、unsupported platform / ABI / architecture、runtime invalidation、stale、Expo Go、shared resource failure の public mapping が定義される。RN private adapter は既存 public C ABI の InputBytes、OperationResult、OwnedBytes、error、release、ownership を再利用し、新規 public C ABI、RN lifecycle policy の C ABI 漏出、Core semantics の再実装を要求しない。Rust Core の cryptographic policy、private-key、Mnemonic、signature、Store integrity、validation、authorization、zeroization authority は移転していない。

### Android / iOS / Expo / New Architecture

Android は API 24、`arm64-v8a` / `x86_64`、TurboModule / Codegen / JSI、thin native layer、artifact allowlist、unsupported ABI rejection、target / compile policy 分離を定義する。iOS は TurboModule / JSI、C ABI reuse、device arm64、Apple Silicon simulator arm64、Intel simulator exclusion、Bare iOS 15.1、Expo subset iOS 16.4、XCFramework integrity を定義する。Expo Development Build、Prebuild / CNG、custom native module workflow は SDK 57 / RN 0.86.x pair で formal、Expo Go、mismatch、unlisted、canary / nightly、Legacy Architecture は unsupported である。New Architecture mandatory を optional 化していない。

### Unsupported environment / artifact integrity / npm assembly

RN floor / outside-window stable minor、canary / nightly / next、Legacy、Android API / ABI、Intel simulator、Expo Go、unsupported Expo pair、missing / wrong / extra artifact、Metro wrong entry の earliest detection と final fail-closed behavior が定義される。source revision → controlled build → target artifact → digest / provenance → approved npm assembly → published package の chain、single npm package、Node / WASM / RN inventory、manifest relationship、SBOM / provenance policy の非退行が維持される。

### Acceptance / responsiveness / deferred async

`AC-054`〜`AC-061` は API parity、Core authority、secret cleanup、fail-closed、non-regression、version / ABI、integration、cleanup、cancellation、stale completion、multi-runtime serialization、teardown、unsupported rejection、Expo workflow、Node / Browser / WASM non-regression、responsiveness evidence へ追跡可能である。§23 は representative device / simulator class、production-equivalent build、representative / reasonable worst-case input、blocking、resource、starvation、cleanup、lifecycle interruption、raw observation、evaluation result を要求し、arbitrary threshold は追加しない。negative evidence 時だけ async API / RN exclusion の user decision に戻る。

### Non-regression / Specification-Implementation boundary

Node native、Node WASM fallback、Browser WASM、Browser Extension、TypeScript facade、existing C ABI、existing conditional exports、single package、SBOM、provenance、artifact integrity、release policy は RN-specific policy と分離されている。Specification は observable contract、responsibility、invariant、acceptance evidence を定義し、exact mutex、queue container、worker、class decomposition、JNI、Swift / Objective-C API、JSI method、Promise shape、timeout、benchmark threshold、file layout を不必要に固定していない。Observable outcome を下流へ曖昧に委譲する SR-025〜SR-028 の問題は解消された。

### Decision / follow-up status

- `NEEDS USER DECISION`: なし。`PD-RN-001`〜`PD-RN-007` は Approved。
- `DEFERRED UNTIL NEGATIVE EVIDENCE`: operation-specific async API / RN support exclusion。negative evidence は本 review では実測しておらず、発動していない。
- `REQUIREMENTS FOLLOW-UP REQUIRED`: なし。
- `DESIGN FOLLOW-UP REQUIRED`: なし。
- `DECISION FOLLOW-UP REQUIRED`: なし。SR-028 は approved decision の Specification 反映であり、新しい decision を要求しない。

## Validation Results

- 実施: `git rev-parse --abbrev-ref HEAD`、`git rev-parse HEAD`、`git status --short --branch` により branch `agent/react-native-support`、HEAD `a15431353fe348369ca1a2532461d5d0e832afc7`、開始時 clean を確認した。
- 実施: `git diff --name-status a15431353fe348369ca1a2532461d5d0e832afc7^ a15431353fe348369ca1a2532461d5d0e832afc7` により target commit が `docs/specifications/react-native.md` のみを変更することを確認した。
- 実施: target commit と前回 target 間で Requirements、Design、Platform Decision、`npm-typescript-facade.md`、`specification.md` に差分がないことを確認した。
- 実施: target Specification、Requirements、Design、Decision、前回 review artifact の SHA-256 を取得した。target hash は下表に記録した。
- 実施: facade declaration / operation traceability / RN classification を照合し、16 operation の漏れ・重複がなく、RN public API が common facade と一致することを確認した。
- 実施: `SR-001`〜`SR-024` の status / severity / completion condition を前回 review と照合し、`SR-025`〜`SR-028` は current Specification の修正箇所と completion condition を再確認した。新規 `SR-029` は発行していない。
- 実施: normative duplication、cross-spec consistency、Requirements → Design → Decision → Specification traceability、C ABI reuse、non-regression、secret / stale / teardown、platform matrix、artifact / provenance contract を照合した。
- 実施: fenced block の開閉、Markdown table、相対 link、review artifact の章順序・finding format を検証する。
- 実施: `git diff --check` および staging 後の `git diff --cached --check` を実行する。
- 未実施: Rust、npm、Node、WASM、React Native、Android、iOS、Expo、release の full tests / build。変更は docs-only review artifact であり、実装変更がないためである。
- 未確認: implementation の Specification 適合性、native buffer の実 lifetime、device / simulator responsiveness、package assembly、artifact digest / provenance の実証および AC evidence の実データ。未実行・未確認を成功とは扱わない。

### Target hashes

| File | SHA-256 |
| --- | --- |
| `docs/specifications/react-native.md` | `36f7cbcd70856440e0d34fc5bfa0b8775e8c778b4ab19ec002c1d0d74228cce7` |
| `docs/specifications/npm-typescript-facade.md` | `01c4bca3426211d1e813bb67024ef9e9a0c155d3b8ca1d1198d8d2e2be897803` |
| `docs/specifications/specification.md` | `c393fa0cec7761474b294f21f82d82e7c414c1ec5d56d9e5fabc81500b16c681` |
| `docs/requirements/requirements.md` | `743cd9179259f2018ed24eaab948de509669f2e8f8102fc5fca45bbb5a67d8f2` |
| `docs/design/architecture.md` | `601dbe8de16ce2d7c236517e091f811713bbd4556f9b1e2a8858e27e05c0250f` |
| `docs/design/bindings.md` | `aae216f7b0b7d65f325057e21943437b425e0d286c7633ae04f5f54035649e29` |
| `docs/design/security.md` | `b738cfa5d085f160f305a27f9884597af194371171422939e2b7b3557defcd6d` |
| `docs/decisions/react-native-platform-baseline.md` | `51c63c4520f75a3fd804b8f81510eb155afd41bbfb783e67236ccc7c000b709c` |
| `docs/reviews/specifications/specification-review-014.md` | `ef01f35936411723673ffad391a1b2fb025cbbc73a8710b91c710f6a8ffc7240` |

## Review Gates

既存 `review-gates.md` の rule、すなわち Critical が1件以上なら `REVISE SPECIFICATION`、Critical がなく Major / Minor のみなら `READY` を適用する。

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | PASS | RN固有 scope、共通 facade / Core、platform、Expo、non-regression、Implementation boundary が一意に示される。 | なし |
| 2. 契約 | PASS | API、DTO、binary、sync、routing、error、classification、admission、lifecycle、secret、C ABI の外部契約を確認できる。 | なし |
| 3. 処理と例外 | PASS | admission、in-flight、initialization、re-entry、cancellation、teardown、stale、fail-closed、cleanup の結果が一意である。 | なし |
| 4. 内部整合性 | PASS | Requirements / Design / Decision、3 Specification、Node / Browser / WASM、platform matrix の整合を確認した。 | なし |
| 5. 検証可能性 | PASS | AC-054〜AC-061、operation-specific trigger-set、common baseline、responsiveness protocol、negative gate が検証可能である。 | なし |
| 6. 安全性と相互運用性 | PASS | Rust Core authority、secret non-retention、C ABI ownership、String / binary、Store / signing / chain / network、fail-closed、artifact trust を確認した。 | なし |
| 7. 上流整合性 | PASS | Requirements / Design は READY、Platform Decision は Approved、upstream follow-up は不要である。 | なし |
| Critical finding | PASS | Critical 0 件。 | なし |
| Formal Review Gate | **READY** | project rule に適合し、Open / Reopened finding はない。 | なし |

## Remaining Risks and Open Decisions

- 実装・integration・release で実際の API parity、multi-runtime ordering、blocking / starvation、resource、cancellation、stale cleanup、artifact integrity、Expo build evidence を収集する必要がある。
- `DEFERRED UNTIL NEGATIVE EVIDENCE` の async API / RN support exclusion は未発動であり、negative evidence が出た場合だけ user decision に戻す。
- exact queue / fairness / worker / lock / generation / callback mechanism は下流の Implementation scope である。
- active な `NEEDS USER DECISION`、Requirements / Design / Decision follow-up はない。
- Browser baseline は今回の RN Specification correction の対象外であり、変更・新規決定はない。

## Automatic Changes

レビュー中に変更したのは、この新規 review artifact のみである。Canonical Specification、Requirements、Design、Platform Decision、Concept、Implementation、Test、Fixture、README、package.json、CI / release workflow、既存 review artifact は変更していない。

## Final Decision

`READY`

`SR-001`〜`SR-028` はすべて Resolved、Reopened はなく、新規 finding はない。`SR-025`〜`SR-028` の修正により C0〜C2 evidence、re-entry、initializing admission、RN / Expo support matrix が implementation-ready な外部契約として一意化された。Critical は0件であり、project の正式 gate rule に基づく最終判定は `READY` である。

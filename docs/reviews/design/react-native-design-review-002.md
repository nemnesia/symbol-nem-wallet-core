# React Native Design Review 002

## Review Target

| 項目                         | 内容                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                   | `nemnesia/symbol-nem-wallet-core`                                                                                                       |
| Branch                       | `agent/react-native-support`                                                                                                            |
| Reviewed HEAD                | `72c2cd9baebabdb7782ba94a1be13f1da2484dfc`                                                                                              |
| Canonical Design             | [`architecture.md`](../../design/architecture.md), [`bindings.md`](../../design/bindings.md), [`security.md`](../../design/security.md) |
| Upstream Concept             | [`concept-sheet.md`](../../consept/concept-sheet.md)                                                                                    |
| Concept Review               | [`concept-sheet-review-011.md`](../concept/concept-sheet-review-011.md) — READY                                                         |
| Reviewed Requirements        | [`requirements.md`](../../requirements/requirements.md)                                                                                 |
| Requirements Review          | [`requirements-review-010.md`](../requirements/requirements-review-010.md) — READY; Critical 0 / Major 0 / Minor 0                      |
| Previous Requirements Review | [`requirements-review-010.md`](../requirements/requirements-review-010.md)                                                              |
| Previous Design Review       | [`react-native-design-review-001.md`](react-native-design-review-001.md)                                                                |
| Trigger                      | `UF-RN-001` 解消後の正式 Design 再レビュー                                                                                              |
| Review method                | `design-review` Skill、reviewer policy、security checklist、gate rule、traceability の適用                                              |
| Gate rule                    | Critical あり → `REVISE DESIGN`、Critical なし → `READY`                                                                                |

対象は Design canonical documents のレビューだけとした。Concept、Requirements、Design 正本、Specification、実装、CI および release workflow は変更していない。

## Execution Audit

本レビューは `design-review` Skill、`review-common` の reviewer policy、severity、gate rule および output format に従い、次の観点を独立に確認した。Gate rule は「Critical が 1 件以上なら `REVISE DESIGN`、Critical がない場合は `READY`」を適用した。

1. Responsibility / architecture: Concept、Requirements、既存 runtime、RN binding の責務境界と依存方向
2. Security: Rust Core の authority、secret lifecycle、fail-closed、atomicity、artifact trust
3. Flow / operations: 同期 compatibility baseline、responsiveness evidence、lifecycle、concurrency、failure cleanup
4. Traceability / downstream: Requirements traceability、user decision、Specification / Implementation / Release への委譲境界

レビューは指定 HEAD の canonical Design、既存レビュー artifact、Concept Review および Requirements Review を読み、変更差分も確認して実施した。設計正本を修正して finding を解消することは行っていない。

## Evidence Used

- [`concept-sheet.md`](../../consept/concept-sheet.md) および [`concept-sheet-review-011.md`](../concept/concept-sheet-review-011.md)
- [`requirements.md`](../../requirements/requirements.md)
- [`requirements-review-010.md`](../requirements/requirements-review-010.md)
- [`architecture.md`](../../design/architecture.md)
- [`bindings.md`](../../design/bindings.md)
- [`security.md`](../../design/security.md)
- [`react-native-design-review-001.md`](react-native-design-review-001.md)
- `architecture-review-002.md`、`bindings-review-002.md`、`security-review-002.md`
- `.agents/skills/design-review/` および `.agents/skills/review-common/` の reviewer policy、checklist、gate、output format

## Review Result

### Summary

`UF-RN-001` は Requirements で解消され、その要求を Design が実行モデル、資源境界、evidence、async escalation、cleanup へ具体的に追跡できる形で受けている。`DR-RN-001`、`DR-RN-003`、`DR-RN-004` は Resolved と判定する。

`DR-RN-002` は、RN adapter が concurrency authority を持つこと自体は明確になったが、その authority の範囲が「1 つの RN JS runtime + module registry」に限定されている。同一プロセスで複数の RN runtime / module registry / adapter domain が同じ Core / C ABI に到達する場合の排他・初期化・終了境界が明示されていないため、前回の Open を維持する。

正式 Gate は既存 rule に従い `READY` とする。Critical finding はなく、Major finding が残る場合も本 project の gate rule では `REVISE DESIGN` にはならない。ただし `DR-RN-002` は RN の Specification、Implementation および release readiness に進む前に再確認が必要な未解消課題である。

### Finding Status

| ID          | Severity | 今回判定     | 根拠                                                                                                                                                                                        |
| ----------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DR-RN-001` | Major    | **Resolved** | 実行コスト、JS blocking、bounded input / Store、responsiveness、resource、interruption、cleanup、async / support exclusion の decision gate が Design に追加された。                        |
| `DR-RN-002` | Major    | **Open**     | RN adapter の局所的な serialization は明示されたが、複数 runtime / module registry が同一 Core / C ABI に到達する場合の authority scope と cross-context lifecycle barrier が未定義である。 |
| `DR-RN-003` | Major    | **Resolved** | 既存 public C ABI contract の RN-private 内部再利用、Application-facing 非公開、新規 public C ABI 非追加、package artifact との責務分離が明示された。                                       |
| `DR-RN-004` | Major    | **Resolved** | source revision から npm assembly / published package までの artifact trust chain、Android load 前検証、iOS package / link / release evidence、fail-closed が明示された。                   |

### Open Findings

#### `DR-RN-002`

- **ID:** `DR-RN-002`
- **Severity:** Major
- **Status:** Open（前回から継続。前回も Open であり Reopened ではない）
- **Location:** [`architecture.md:467`](../../design/architecture.md#L467)、[`bindings.md:583-591`](../../design/bindings.md#L583)、[`security.md:524-526`](../../design/security.md#L524)、前回 finding [`react-native-design-review-001.md`](react-native-design-review-001.md)
- **Problem:** Design は「同一 logical consumer context」を「1 つの RN JS runtime + module registry」と定義し、その単位では admission、serialization、ordering、reentrancy、init / shutdown を RN adapter の authority としている。一方、複数の runtime / module registry / adapter domain が同一プロセスで同じ Core / C ABI を呼び得るか、許可する場合に process 内でどの authority が初期化・終了・同時 invocation を管理するか、許可しない場合にどう明示的に制約・拒否するかが未記載である。Core / C ABI の global thread-safety を public contract にしない方針は適切だが、その場合は adapter 側の authority scope がすべての到達可能な invocation を覆う必要がある。
- **Impact:** context 内の直列化だけでは context 間の concurrent Core / C ABI invocation、shutdown 中の別 context admission、Store replacement の順序、stale completion および failure cleanup の安全性を検証可能な単一モデルにできない。実装者が process-wide serialization、single-context 制約または別の共有境界を暗黙に選び、platform-specific な semantics を生むおそれがある。
- **Required correction:** Design 間で、RN adapter の authority scope が同一 Core / C ABI に到達する全 RN invocation domain を覆うこと、または同一 process に許可する logical context 数と、追加 context の初期化・invocation・shutdown をどう制約 / 拒否するかを明示すること。併せて、複数 context を許可する場合の init / shutdown barrier、cross-context ordering、failure cleanup および stale result の扱いを外部観測可能な lifecycle invariant として揃えること。queue、mutex、worker 数、thread primitive などの実装方式は下流へ委譲してよい。
- **Completion / recheck:** 全 RN invocation がどの authority domain を通るか、domain 間の許可・拒否・分離条件、Core / C ABI invocation 中の teardown と結果 delivery の invariant が Architecture、Bindings、Security で一致していることを再確認する。

### Reopened Findings

なし。`DR-RN-002` は前回から未解消のため Open を継続し、過去に Resolved とされた finding を再オープンしたものではない。

### New Finding IDs

なし。新たな問題は既存の `DR-RN-002` の意味と scope に収まるため、新規 ID は発行しない。

### UF-RN-001 Status

**`UF-RN-001: Resolved`**。Requirements Review 010 で、synchronous public contract を compatibility baseline としつつ、RN の blocking、responsiveness、resource boundedness、failure cleanup、interruption / cancellation および performance evidence を downstream で評価し、否定的 evidence の場合だけ operation-specific async contract または RN support exclusion を user decision に戻す条件が要求された。現 Design はこれを [`architecture.md:459-467`](../../design/architecture.md#L459)、[`bindings.md:431-465`](../../design/bindings.md#L431)、[`security.md:568-575`](../../design/security.md#L568) で受けている。

## Required Changes

Critical finding はないため、既存 Design Review gate の `Required Changes` 条件は発生しない。`DR-RN-002` の Major correction は次工程へ進む前の必須の Design follow-up として `Optional Improvements` ではなく Open finding に記録するが、formal gate の判定は project rule に従う。

## Optional Improvements

### `DR-RN-002` follow-up

上記の authority scope を Design author が補完し、同一 process 内の複数 RN context の扱いを暗黙の実装判断にしないこと。具体的な synchronization primitive、queue、worker、thread affinity、ABI signature は要求しない。

## Resolved Findings

### `DR-RN-001: Resolved`

`architecture.md` と `bindings.md` は、public synchrony と Core execution context を分離し、worker 実行後の blocking wait を non-blocking とみなさないことを明示している。KDF、Store encrypt / decrypt、Mnemonic seed / derivation、key derivation、signing、大きな Store processing を「常に遅い」と断定せず、potentially expensive な候補として bounded operation / input / Store envelope と representative Android / iOS environment による evidence を要求している。cost、blocking、responsiveness、resource、interruption / cancellation、cleanup が評価対象であり、exact threshold、device、worker、timeout、API は下流へ委譲されている。

negative evidence の場合に対象 operation、impact、compatibility impact を記録し、async public contract または RN support exclusion を `NEEDS USER DECISION` とするため、sync baseline を safety / responsiveness より上位に固定していない。silent Promise conversion、automatic async fallback、runtime-specific silent divergence も禁止されている。

### `DR-RN-003: Resolved`

RN topology は public TypeScript facade から private RN entry、RN-private JSI / TurboModule adapter、Android / iOS thin native layer、既存 public C ABI contract、Rust Core へ接続する。C ABI は RN application-facing API とせず、新しい public C ABI symbol や RN package を追加しない。C ABI の既存 semantics、ownership、error、release identity を再利用し、RN-specific lifecycle / concurrency は adapter 側に置いているため、既存 public C ABI が RN product API や security authority に変質していない。

### `DR-RN-004: Resolved`

Android / iOS artifact は source revision、controlled build、target artifact、identity / digest / provenance、approved npm assembly、published package の chain に含まれる。Android は package / release assembly 後かつ loader 前に検証し、iOS は package / framework / archive composition、link、release evidence で検証する。欠落、不一致、未承認、load failure は fail-closed であり Node / WASM fallback を誘発しない。exact Gradle、Xcode、podspec、CI command、manifest は downstream に委譲されている。

## Upstream Feedback

今回の Design から Requirements への新しい feedback はない。`UF-RN-001` は Requirements Review 010 で Resolved であり、今回の残存 `DR-RN-002` は Design 内の authority scope の問題であるため `NEEDS REQUIREMENTS FOLLOW-UP` にはしない。

## Deferred Findings

以下は Design から下流へ正しく委譲されており、今回の finding ではない。

- exact TypeScript、Promise、JNI、Swift / Objective-C、JSI、Codegen、C ABI signature
- exact buffer copy / allocator / zeroization、timeout、cancellation API、queue、mutex、worker 数、thread affinity
- operation envelope、benchmark protocol、device 名、threshold、evidence format
- Metro / conditional exports / resolver の具体設定
- Gradle、Xcode、podspec、manifest、CI command、artifact schema
- minimum React Native / Android API / iOS version、ABI / architecture matrix、New Architecture mandatory / legacy policy、Expo formal support

## Scope and Traceability

### Requirements ↔ Design traceability

| Requirement         | Design evidence                                                                                                                                                                        | 評価                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `UF-RN-001`         | [`architecture.md:459-467`](../../design/architecture.md#L459)、[`bindings.md:451-465`](../../design/bindings.md#L451)、[`security.md:568-575`](../../design/security.md#L568)         | Resolved。sync baseline と RN responsiveness / resource evidence、negative evidence の user decision gate が追跡可能。                         |
| `NFR-008`           | [`architecture.md:459-467`](../../design/architecture.md#L459)、[`architecture.md:479-485`](../../design/architecture.md#L479)、[`bindings.md:431-465`](../../design/bindings.md#L431) | 同一 operation の public contract を維持し、safe に維持不能な場合のみ明示的判断へ戻す。silent divergence / fallback はない。                   |
| `NFR-015`           | [`architecture.md:463-467`](../../design/architecture.md#L463)、[`bindings.md:451-465`](../../design/bindings.md#L451)、[`bindings.md:724-737`](../../design/bindings.md#L724)         | cost、blocking、responsiveness、resource、代表入力、interruption、cleanup を downstream evidence で検証可能。exact protocol は固定していない。 |
| `AC-054`            | [`architecture.md:424-457`](../../design/architecture.md#L424)、[`bindings.md:383-425`](../../design/bindings.md#L383)                                                                 | single package の public facade と private RN backend が分離され、16 operation parity を維持。                                                 |
| `AC-055`            | [`architecture.md:63-85`](../../design/architecture.md#L63)、[`bindings.md:524-557`](../../design/bindings.md#L524)、[`security.md:410-448`](../../design/security.md#L410)            | Core が cryptographic / validation / secret authority。binding は secret cache / authority にならない。                                        |
| `AC-056`            | [`architecture.md:447-457`](../../design/architecture.md#L447)、[`bindings.md:559-581`](../../design/bindings.md#L559)                                                                 | RN misroute、load、init、invocation failure は明示的 failure、他 backend fallback なし。                                                       |
| `AC-057`            | [`architecture.md:469-477`](../../design/architecture.md#L469)、[`architecture.md:487-508`](../../design/architecture.md#L487)                                                         | Node、Browser、Extension、WASM、native Node の routing / release policy を変更せず、RN artifact を chain に追加。                              |
| `AC-058` / `AC-059` | [`architecture.md:487-493`](../../design/architecture.md#L487)、[`bindings.md:617-696`](../../design/bindings.md#L617)                                                                 | platform / version / ABI / architecture の未決定値を固定せず、support matrix / release gate へ委譲。                                           |
| `AC-060`            | [`architecture.md:447-457`](../../design/architecture.md#L447)、[`bindings.md:467-485`](../../design/bindings.md#L467)                                                                 | runtime-specific entry を private に分離し、Node / WASM と RN の誤 routing を拒否。                                                            |
| `AC-061`            | [`architecture.md:459-467`](../../design/architecture.md#L459)、[`bindings.md:724-737`](../../design/bindings.md#L724)                                                                 | 外部観測可能な evidence、negative evidence の記録、async semantics の明示判断、failure / cleanup を追跡可能。                                  |

### Single Repository / Single npm Package

[`architecture.md:424-457`](../../design/architecture.md#L424) と [`bindings.md:383-409`](../../design/bindings.md#L383) は、repository `nemnesia/symbol-nem-wallet-core` と npm package `@nemnesia/symbol-nem-wallet-core` の単一方針を維持し、Node.js、Browser、Browser Extension、RN Android / iOS を同じ public facade の runtime-specific backend として扱う。RN 専用 package / repository を要求していない。

### Runtime / Binding Architecture

public TypeScript facade と private RN entry が分離され、RN implementation detail は public API surface へ漏れない。RN failure は explicit failure となり、Node / Browser / WASM fallback を起こさない。Rust Core が Profile、Store validity、authentication、derivation、signing、secret lifecycle の authority であり、C ABI、JSI、TurboModule、Android / iOS native layer は transport、registration、lifetime、conversion、routing の境界に留まる。

### TurboModule / JSI Design Validity

TurboModule / Codegen は New Architecture の registration / typed boundary、JSI は private な synchronous / binary substrate として architecture-level の選択に留まり、exact HostObject、Codegen、JSI method、JNI / Swift signature は downstream に委譲されている。Design の「New Architecture primary」は現行の方向性であり、「mandatory / legacy compatibility」は別の product support decision として未決定であるため、論理矛盾はない。Design は legacy support を勝手に確定していない。

### Existing Public C ABI Reuse

既存 public C ABI contract は RN-private adapter から内部再利用されるが、application-facing API として露出せず、新しい public C ABI も追加しない。ABI は既存 semantics、ownership、error、release identity を担い、RN の admission、serialization、lifecycle、cancellation / interruption の評価可能性は adapter 側に置かれる。既存 ABI が RN-specific な cancellation を表現しない場合に native thread kill や部分成功で補完せず、安全な sync 維持ができない operation は async contract / support exclusion の user decision gate に戻る。RN-specific semantics を C ABI に移転したり、ABI implementation detail を Specification 前に過剰固定したりしていない。

### Execution / Responsiveness Model

public synchronous contract は compatibility baseline だが、Core が JS thread で直接実行されることを意味しない。worker 実行後に blocking wait するだけでは responsiveness 改善とみなさず、JS / UI thread blocking、execution cost、bounded operation / input / Store、resource behavior、safe lifetime / cleanup、interruption を evidence で評価する。KDF、Store encrypt / decrypt、Mnemonic seed / derivation、key derivation、signing、大きな Store processing は候補として扱われ、常に高コストとは断定されていない。

### Async Escalation Decision Gate

negative evidence がある operation について、対象と影響範囲、compatibility impact を記録したうえで async public contract または RN support exclusion を `NEEDS USER DECISION` とする。user decision 前の Promise 化、automatic async fallback、runtime-specific silent divergence は禁止され、安全性・responsiveness を犠牲にして sync を絶対化もしない。不可逆な public API semantics は user decision 前に確定されていない。

### Concurrency Authority

RN adapter が admission、同一 logical context 内の serialization、ordering、reentrancy、initialization / shutdown barrier を担い、Core / C ABI の thread-safety を public contract にしない分離は適切である。Application が current Store の authority を持ち、adapter は Store history、password cache、unlocked / decrypted state、current Store selection を持たないため、concurrency policy が cryptographic authority へ昇格していない。

ただし、複数 runtime / module registry の process-wide scope が未定義であり、`DR-RN-002` が残る。exact queue / mutex / worker を求めるものではなく、到達可能な invocation 全体をどの authority が覆うかという Design-level の不足である。

### Secret Lifecycle

queued request は descriptor / cancellation state のみ保持し、password、private key、mnemonic、seed、decrypted Store material、signing intermediate は admission 後に遅く materialize する。success、failure、cancellation / interruption、native exception、shutdown、initialization failure の各経路で temporary material を継続利用可能な状態や診断出力に残さず、secret cache を成功状態として扱わない。JS、RN native、C ABI、Rust Core 間で不要な long-lived copy を許さず、zeroize の具体実装は下流へ委譲している。

### Android / iOS Lifecycle

Android / iOS は initialization 完了前の admission を拒否し、background / foreground / scene、teardown、invalidation、process termination を lifecycle boundary として扱う。in-flight operation は Core 完了、output validation、replacement integrity、temporary cleanup、result delivery が成立したときだけ成功として delivery され、それ以外は failure として扱う。teardown 後の新規 admission、stale completion、continued authorization、secret cache、partial state を許容しない。OS callback、re-init、keep-alive の具体方式は下流へ委譲されている。

### Failure Atomicity

失敗・中断・native exception・shutdown で partial Store mutation、partial Profile、stale result、continued authentication、secret retention を success と扱わず、Core の fail-closed / atomic semantics を維持する。RN backend failure は Node / WASM へ fallback せず、application が failure と success を区別できる explicit failure となる。cancellation が thread kill や部分適用の許可に変わっていない。

### Android / iOS Artifact Trust

source revision → controlled build → target artifact → digest / provenance → approved npm assembly → published package の trust chain は、既存の release / supply-chain model と整合する。Android は loader 前、iOS は package / framework / archive composition / link / release evidence の境界で検証し、欠落・不一致・未承認は fail-closed。Design は exact Gradle、Xcode、podspec、CI command、artifact schema を要求せず、release specification / verification へ委譲している。

### Expo Scope

Expo Go、development build、prebuild、custom native module を技術候補として区別し、Expo formal support は `NEEDS USER DECISION` に残している。Expo Go を formal support candidate から外す方向の記載は recommendation / technical constraint であり、正式な support commitment を暗黙に確定していない。

### Platform Baseline Decisions

minimum React Native version、minimum Android API level、minimum iOS version、Android ABI matrix、iOS device / simulator architecture matrix、New Architecture mandatory / legacy compatibility、Expo formal support は具体値を確定していない。New Architecture primary は architecture direction として記録されるが、legacy compatibility の採否・期間は user decision gate に残る。現時点で未決定であること自体は Design の成立を妨げない。

### Browser Baseline Scope

supported browser baseline は既存 package-wide support policy の user decision として記載されるが、RN Design は Browser policy を変更しないと明記している。RN 追加のために Browser baseline の再決定を要求する scope expansion にはなっていない。ここでの確認対象は single package、conditional routing、release non-regression との整合であり、Browser 対応の新要件を導入していない。

### Security Boundary

Rust Core が private key、mnemonic、cryptographic operation、Store integrity、validation、zeroization semantics、signature semantics の authority を維持する。TypeScript facade、RN adapter、Android / iOS layer、C ABI は authority ではなく、binding が Core validation を bypass しない。RN adapter の concurrency / lifecycle control は invocation の安全な境界を管理するが、cryptographic authority、current Store authority、secret ownership を取得しない。

### Non-Regression

16 operation、DTO、`Uint8Array`、Core error / warning、replacement Store、auth、export、handoff、signing、Store semantics は変更しない。Node native、Node WASM fallback、Browser WASM、Browser Extension、TypeScript facade、conditional exports、native load failure の fail-closed、single npm package、SBOM、provenance、artifact integrity、release policy を RN backend の追加で再定義していない。Node の既存 routing / fallback は維持し、RN misroute にだけ RN → Node / WASM fallback を許していない。

### Design / Specification Boundary

Design は architecture、responsibility、boundary、lifecycle、execution model、security / failure model、platform strategy、trade-off と検証方針に留まっている。exact TypeScript / Promise、JNI / Swift / Objective-C / JSI / C ABI signature、timeout、queue size、mutex、worker count、benchmark threshold、manifest、Gradle、podspec、CI command、artifact schema は固定していない。`DR-RN-002` の correction も authority scope と lifecycle invariant に限定し、実装 primitive を要求しない。

### NEEDS USER DECISION

Canonical Design が維持する未決定事項は次のとおり。

- minimum React Native version
- minimum Android API level
- minimum iOS version
- supported browser baseline の再確認・正式承認
- Android ABI matrix
- iOS device / simulator architecture matrix
- New Architecture mandatory / legacy compatibility policy
- Expo formal support scope（Expo Go、development build、prebuild、custom native module）
- negative evidence が得られた operation の async public contract または RN support exclusion

sync / async は常時未決定ではない。現時点の決定は existing synchronous public API を compatibility baseline とし、safe に維持できない operation についてのみ future decision gate を開く条件付き方針である。

### NEEDS REQUIREMENTS FOLLOW-UP

**なし。** `UF-RN-001`、`NFR-008`、`NFR-015`、`AC-061` は Requirements Review 010 で定義済みの範囲に Design が追跡している。`DR-RN-002` は Requirements の不足ではなく、同一 process 内の RN concurrency authority scope に関する Design の残存課題である。

## Domain Checks

### Concept Alignment

Concept の Core authority、Application responsibility、single package / multi-runtime、security-first、fail-closed の上位方針と整合する。RN-specific implementation を Concept の新しい product promise や security authority に拡張していない。

### Existing Requirements Integrity

`NFR-008` は sync absolute requirement に変質しておらず、`NFR-010`、`NFR-011`、`NFR-012`、`NFR-014`、`NFR-015` との semantic conflict はない。`SEC-011`、`SEC-012`、`SEC-017`、`SEC-018` および `AC-054`〜`AC-061` の secret ownership、cleanup、atomicity、compatibility、support matrix、responsiveness evidence は維持されている。Requirements 正本の変更は不要である。

### Existing Finding Integrity

既存 `RR-001`〜`RR-029` は Requirements Review 010 で Resolved のまま、今回の Design 更新による再発は確認されない。既存の非 RN Design finding の意味も変更せず、RN finding は `DR-RN-001`〜`DR-RN-004` の既存 namespace だけを追跡した。

### API Consistency

既存の synchronous public API と 16 operation contract を compatibility baseline とし、RN-only public API、native handle、Promise variant、secret convenience output を追加しない。安全性・responsiveness・resource evidence が baseline の維持不能を示した場合も、user decision 前に API semantics を変更しない。

### Responsiveness / Resource Policy

public synchrony、Core execution context、JS / UI thread blocking を分離し、worker + blocking wait を non-blocking と誤認しない。bounded operation / input / Store、representative environment、execution cost、resource behavior、interruption、cleanup の evidence を要求し、exact threshold や実行方式は固定していない。

### Testability

AC-061 に対応して、production-equivalent build、代表的な Android / iOS device、representative Store / input、reasonable worst-case class、failure / cleanup、compatibility impact、negative evidence を下流で外部観測・記録できる。exact benchmark protocol、device 名、threshold、timeout、cancellation API は未固定である。

### Failure / Cleanup

失敗・中断・shutdown・native exception・lifecycle interruption で partial state、stale result、継続認証、secret retention を success と扱わず、Core の fail-closed / atomic semantics と no-fallback policy を維持する。cancellation / interruption の具体 API は下流へ委譲されるが、安全な cleanup invariant は Design に残っている。

## Validation Results

| 検証                         | 結果                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch                       | `agent/react-native-support` を確認。                                                                                                              |
| Reviewed HEAD                | `72c2cd9baebabdb7782ba94a1be13f1da2484dfc` と一致。                                                                                                |
| Requirements integrity       | `docs/requirements/requirements.md` の SHA-256 `743cd9179259f2018ed24eaab948de509669f2e8f8102fc5fca45bbb5a67d8f2` を確認し、レビュー中に変更なし。 |
| Review artifact scope        | 作成後の差分は本 artifact のみ。canonical Design、Concept、Requirements、Specification、実装、CI / release workflow の変更なし。                   |
| Markdown format              | 新規 artifact に対して Prettier check を実行し、成功。                                                                                             |
| Relative links               | artifact 内の canonical document、Concept、Requirements、既存 review への relative link を確認。                                                   |
| Traceability / IDs           | `UF-RN-001`、`DR-RN-001`〜`DR-RN-004`、`NFR-008`、`NFR-015`、`AC-054`〜`AC-061` の参照と status を手動・検索で確認。                               |
| `git diff --check`           | 成功。                                                                                                                                             |
| Concept / Requirements gates | Concept Review 011 = READY、Requirements Review 010 = READY を確認。                                                                               |

Rust、npm、Node、WASM、React Native、Android、iOS、release の full test は docs-only の Design Review であり、実装・manifest・dependency・build configuration・test fixture を変更していないため実行していない。未実行範囲を成功扱いしていない。

## Review Gates

| Gate                               | 判定                                                             |
| ---------------------------------- | ---------------------------------------------------------------- |
| Critical finding                   | PASS — 0 件                                                      |
| Major / Minor finding の gate rule | PASS — project rule では Critical なしの場合 `READY`             |
| Upstream Requirements gate         | PASS — Requirements Review 010 は READY、`UF-RN-001` は Resolved |
| Traceability gate                  | PASS — ただし `DR-RN-002` の authority scope は Open             |
| Security / failure gate            | PASS — Core authority、fail-closed、atomicity、cleanup を維持    |
| Non-regression gate                | PASS — existing runtime / package / release policy の変更なし    |
| Design / Specification boundary    | PASS — exact implementation detail は downstream                 |
| Formal result                      | **READY**                                                        |

## Remaining Risks and Open Decisions

- `DR-RN-002` の process-wide concurrency authority scope が未確定である。これは formal gate を REVISE にする Critical ではないが、RN の下流 Specification / Implementation / release readiness 前に再確認する。
- platform baseline、ABI / architecture matrix、New Architecture mandatory / legacy policy、Expo formal support は未決定のまま保持されている。
- negative responsiveness / resource evidence が出た operation については、operation-specific async contract または RN support exclusion を user decision に戻す必要がある。
- exact performance threshold、cancellation API、native lifecycle callback、artifact manifest / CI は下流で決定・検証する。

## Automatic Changes

レビュー中に自動修正は行っていない。変更対象はこの review artifact のみであり、Requirements 正本、Design canonical documents、Specification、実装および workflow は変更していない。

## Final Decision

**Review Gate: READY**

`UF-RN-001` は Resolved、`DR-RN-001` / `DR-RN-003` / `DR-RN-004` は Resolved とする。`DR-RN-002` は Open のまま継続する。Critical 0 件の既存 gate rule により正式結果は READY だが、RN の複数 invocation domain を含む concurrency authority scope を補完し、再確認するまで RN の下流設計・実装・release readiness を無条件に完了扱いしない。

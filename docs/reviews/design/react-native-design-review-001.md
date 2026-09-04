# React Native 対応 Design Review

## Review Target

- Reviewed branch: `agent/react-native-support`
- Reviewed HEAD: `e09174d81ed290b6b9d9b576ab4079d776143d94`
- 確認日: 2026-09-05
- Review artifact: `docs/reviews/design/react-native-design-review-001.md`
- Reviewed Design:
  - [`docs/design/architecture.md`](../../design/architecture.md)
  - [`docs/design/bindings.md`](../../design/bindings.md)
  - [`docs/design/security.md`](../../design/security.md)
- Review scope: React Native Android / iOS の binding architecture、TurboModule / JSI / thin native layer / C ABI の責務、既存 16 operation の API parity、sync / async execution、secret memory flow、zeroization / lifetime、buffer ownership、hostile JavaScript input、error / fail-closed、runtime resolution、Android / iOS artifact、artifact integrity / provenance、threading / concurrency、stateless Store、support matrix、New Architecture、Expo、threat model、non-regression および Design / Specification boundary。
- 未確認範囲: React Native native 実装、Android / iOS build、device / simulator、C ABI / JSI / TurboModule の実 runtime、package assembly、Node / Browser / WASM の full regression、CI / release / provenance の実行結果。文書レビューのため、これらを成功根拠にはしていない。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として候補の反証、重複排除、重大度、Gate および artifact を担当した。
- Reviewer A（構造・責務）: 完了。Concept / Requirements からの追跡、Core / Binding / Application の責務、single repository / package、runtime topology、Design / Specification 境界を確認した。
- Reviewer B（Security primary）: 完了。Mnemonic、private key、derived / decrypted material、Profile password、Store、signing authority を対象に、JS/native/C ABI/Core の trust boundary、secret lifetime、zeroization、認証、fail-closed、artifact threat を確認した。
- Reviewer C（フロー・運用）: 完了。16 operation、handoff、import / export、signing、Store replacement、sync execution、initialization、concurrency、reentrancy、retry、cancellation、restart および Android / iOS lifecycle を確認した。
- Reviewer D（追跡・下流引継ぎ）: 完了。Concept → Requirements → Design → Specification → Implementation の方向、AC-051〜AC-060、既存 Node / Browser / WASM / C ABI / release policy との整合、下流が推測なしに受け取れる Design decision の範囲を確認した。
- Phase 0（対象・根拠・境界）: 完了。対象 HEAD を `e09174d...` に固定し、Concept / Requirements を normative upstream、3つの Design 文書を primary target、既存 Design review を履歴として確定した。Design Phase Context の登録はないため使用していない。
- Phase 1（独立レビュー）: 完了。A〜D の各観点で、React Native 追加による責務逆流、runtime misrouting、secret handling、failure、compatibility および未決定事項を独立に評価した。
- Phase 2（反証・統合）: 完了。既存 finding の reopen 要否、今回の候補が exact implementation の不足ではないか、Requirements / Specification へ委譲可能か、同一問題の二重計上でないかを確認した。Major 4件を採用した。
- Phase 3（ゲート・成果物）: 完了。本 artifact 作成後に Markdown、relative reference、finding ID、`git diff --check`、変更範囲、commit message、push 結果を確認した。

## Evidence Used

### Review Basis

| 種別 | 参照資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md) | Source of Truth、phase boundary、security、validation、変更範囲および Git 規則を確認 |
| Design Review Skill | [`SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`reviewers.md`](../../../.agents/skills/design-review/reviewers.md)、[`security-checklist.md`](../../../.agents/skills/design-review/security-checklist.md)、[`review-gates.md`](../../../.agents/skills/design-review/review-gates.md)、[`output-format.md`](../../../.agents/skills/design-review/output-format.md) | Reviewer A〜D、Security primary、formal finding 条件、`DR` prefix、Severity および Gate を確認 |
| 共通 reviewer policy | [`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、[`output-format.md`](../../../.agents/skills/review-common/output-format.md) | Phase 0〜3、Upstream Feedback / Deferred Findings、artifact 章順および finding 記載項目を確認 |
| 上位 Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) | platform scope、single repository / package、shared Rust Core、runtime 差異の隠蔽、Core security responsibility、v1 境界を確認 |
| Concept Review | [`concept-sheet-review-011.md`](../concept/concept-sheet-review-011.md) | React Native Concept の `READY` と、Concept finding の状態を履歴として確認。Design の正否の代替にはしていない |
| 上位 Requirements | [`requirements.md`](../../requirements/requirements.md) | NFR-001〜NFR-014、SEC-011〜SEC-023、FR-019、AC-051〜AC-060、API parity、fail-closed、support / architecture gate を確認 |
| Requirements Review | [`requirements-review-009.md`](../requirements/requirements-review-009.md) | Requirements の `READY`、Node 22 / 24 継承、RN support policy の未決定事項、既存 finding の状態を確認 |
| 既存 Design reviews | [`architecture-review-002.md`](architecture-review-002.md)、[`bindings-review-002.md`](bindings-review-002.md)、[`security-review-002.md`](security-review-002.md)、[`upstream-cross-adversarial-review-002.md`](upstream-cross-adversarial-review-002.md) | 既存 `DR-*` / `DR-XA-*` の resolved 状態、責務・secret・Store・failure 境界および reopen 要否を確認 |
| 関連 distribution Design | [`monorepo-npm-distribution-design.md`](../../migration/monorepo-npm-distribution-design.md)、[`c-abi-release-assets.md`](../../migration/c-abi-release-assets.md)、[`release-operation-provenance.md`](../../migration/release-operation-provenance.md) | 既存 C ABI と npm native artifact の分離、Android / iOS C ABI の deferred 状態、Node artifact の integrity / provenance chain を整合確認用に参照 |

### External feasibility references

2026-09-05 に React Native / Expo の公式資料を feasibility 確認のため参照した。これらは本 repository の product support policy、public API または release policy の normative source ではない。

- [React Native New Architecture](https://reactnative.dev/architecture/landing-page)
- [Turbo Native Modules](https://reactnative.dev/docs/turbo-native-modules-introduction)
- [React Native 0.82 - A New Era](https://reactnative.dev/blog/2025/10/08/react-native-0.82): 0.82 から New Architecture only とする公式説明を、Design の「New Architecture primary」推奨の時点根拠として確認した。
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/): custom native library を含む development build と固定 native library の Expo Go の違いを確認した。

## Review Result

`READY`

### Review Gate

Design Review Skill の formal rule を適用した。`Critical` が1件以上の場合は `REVISE DESIGN`、`Critical` が0件で `Major` / `Minor` のみの場合は `READY` とする。今回の New / Open / Reopened は `Critical 0 / Major 4 / Minor 0` であるため formal Review Gate は `READY` とする。ただし、Major finding は次工程で解消または明示的に再確認されるまで、RN の Specification / Implementation / release claim を無条件に完了扱いにしない。

## Summary

React Native 追加後の3つの Design は、Concept / Requirements の主要な意図を追跡可能な形で反映している。Desktop、Node.js、Browser、Browser Extension、React Native Android / iOS の platform coverage、Browser Extension を Browser runtime の利用形態として扱うこと、Mobile を RN Android / iOS に限定すること、`nemnesia/symbol-nem-wallet-core` と `@nemnesia/symbol-nem-wallet-core` の単一方針、同じ Rust Core、Core の secret ownership、Binding non-authority、opaque Store、per-operation authorization、API parity、no cross-runtime fallback および host compromise limitation は維持されている。

TurboModule / JSI / thin native layer / internal C ABI の hybrid は、Concept / Requirements に反する新しい product surface を導入しておらず、exact implementation を過度に固定してもいない。buffer、proxy、detached input、error category、native artifact、Android / iOS slice、stateless Store および threat surface も、検証すべき invariant として広く配置されている。

しかし、Design は次の4点を「下流の exact implementation」として扱うには重要すぎる未確定を残している。

1. 高コストの KDF、Store encryption / decryption、Mnemonic derivation、signing および large Store processing を、同期 public contract のまま JS runtime thread から実行するための安全な execution policy がない。
2. concurrent invocation について、Core / C ABI の thread safety と RN adapter の serialization が代替選択肢として記述され、責任主体・対象 operation・lifecycle・ordering が一意でない。
3. 既存の公開 C ABI / separate release artifact と、RN package 内部の `existing / adapted C ABI` の関係が、互換性・artifact・release ownership の観点で確定していない。
4. RN Android / iOS artifact を既存の digest / provenance / release evidence chain に含め、Android load または iOS static integration 前に検証する責任と trust anchor が、原則の再利用を超えて確定していない。

この4件は exact JSI、JNI、Swift、Gradle、C ABI signature、manifest schema または mutex primitive を要求するものではない。Design が安全な責任主体、execution invariant、artifact trust chain を先に確定し、具体形式を下流へ委譲することを要求する。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| DR-RN-001 | Major | Open | 本レビュー | `bindings.md` §12.3 / DDR-RN-004 は JS thread からの同期 invoke と async 化禁止を決める一方、KDF 等の blocking budget、実行 thread、cancel / timeout および安全な worker policy を下流へ委譲している。 |
| DR-RN-002 | Major | Open | 本レビュー | `architecture.md` §12.3、`bindings.md` §12.11、`security.md` §12.5 が `Core / C ABI` の thread safety と adapter serialization を二択で示し、責任主体と対象範囲を確定していない。 |
| DR-RN-003 | Major | Open | 本レビュー | `architecture.md` / `bindings.md` は `existing / adapted C ABI` を RN internal boundary とするが、既存 C ABI の公開・配布境界と RN private adaptation の関係を一意に定めていない。 |
| DR-RN-004 | Major | Open | 本レビュー | `bindings.md` §12.12 と `security.md` §12.4 は既存 Node artifact の integrity / provenance の考え方を RN に適用するとするが、RN artifact の trust anchor、verification point、release evidence inclusion を明示していない。 |

既存の関連 Design finding `DR-001〜DR-012` および横断 finding `DR-XA-001〜DR-XA-004` は、既存の最新 artifact 上で Resolved である。React Native 追加によってそれらを reopen する事実は確認されなかった。`DDR-RN-*` / `DDR-SEC-RN-*` は Design decision であり、formal finding ID とは別である。

### Open findings

`DR-RN-001`、`DR-RN-002`、`DR-RN-003`、`DR-RN-004`（Major 4件）。

### Reopened findings

なし。

### New finding IDs

`DR-RN-001`〜`DR-RN-004`。既存 `DR-*`、`DR-XA-*` および `DDR-RN-*` との重複はない。

## Required Changes

なし。Formal Gate を不合格にする `Critical` の New / Open / Reopened はない。`DR-RN-001〜004` は Major のため、Skill の Gate rule 上は `READY` のまま Optional Improvements / downstream handoff として扱う。

## Optional Improvements

Major finding 4件は任意の文体改善ではなく、RN の Specification / Implementation 開始前に解消すべき Design follow-up である。

- `DR-RN-001`: public synchrony と native execution / result delivery を分離し、安全な実行制約を選択する。
- `DR-RN-002`: Core / C ABI / RN adapter の concurrency ownership、serialization scope、lifecycle および ordering を一意にする。
- `DR-RN-003`: 既存 C ABI contract / artifact と RN private adapted boundary の compatibility / release ownership を決める。
- `DR-RN-004`: RN artifact を既存 release integrity / provenance chain へ bind し、Android / iOS の use-before-verification を禁止する。

## Resolved Findings

### 既存 Design findings

既存 artifact の `DR-001〜DR-012` および `DR-XA-001〜DR-XA-004` は、現行3 Design文書で再発していない。特に以下は本レビューで再確認した。

- Core が Mnemonic、private key、derived / decrypted secret、Profile password authorization、signing primitive、Store validity / replacement の authority であり、RN binding がこれを代替しない。
- Application が user intent、handoff / export / signing confirmation、current Store selection / persistence を担い、Binding が current Store authority、secret cache、unlock session、Store interpretation を持たない。
- 初回 Mnemonic handoff、explicit export、signing approval、failure / retry / restart、Chain / Network compatibility、v1 no migration および host compromise limitation の意味は RN 追加で変更されていない。
- Node.js の `engines.node >=22.0.0`、22.x minimum / support line、24.x primary verification line は Requirements / Design に継承され、RN 対応を理由に再オープンされていない。

### Existing Design integrity

既存 finding の再発ではないが、既存の C ABI / distribution Design と RN の接続については `DR-RN-003`、既存 Node artifact integrity model と RN artifact の接続については `DR-RN-004` として今回新規に記録した。既存 finding を削除・改名・再利用していない。

## Upstream Feedback

### UF-RN-001 — sync contract と observable resource / responsiveness policy

- 送信元フェーズ: Design Review
- 受領すべき上流フェーズ: Requirements
- 対象となる正式資料 / decision: Requirements `NFR-008`、`NFR-012`、`AC-054`、`AC-058` と、既存 facade の synchronous contract
- 不足・曖昧さ・矛盾: API parity と synchronous contract の互換性は要求されているが、password KDF、Store encryption / decryption、Mnemonic derivation、signing、large Store processing の JS responsiveness、resource bound、timeout / cancellation または async 変更の許容条件は Requirements の外部性質として明示されていない。
- 下流への影響: Design が public synchrony を維持する場合の安全な execution envelope と、async 化が互換性変更となる条件を選べない。これは `DR-RN-001` の Design finding と trace するが、Requirements 自体を本レビューで変更しない。
- non-normative status: Requirements を変更するまで normative requirement、performance target または API decision ではない。
- 解消条件: Requirements owner が sync contract と non-blocking / bounded execution / async compatibility の関係を決定し、必要な外部要求と AC を承認すること。

他の上流資料に対する formal feedback はない。Concept は implementation detail を決めず、Requirements は RN support matrix、security responsibility、failure、non-regression および後続 decision gate を定めており、version 値未決定そのものを上流欠陥とはしない。

## Deferred Findings

次の事項は、現在の Design が責務と invariant を示しているため、Design finding とはしない。決定・実装・release gate へ引き継ぐ。

- exact TurboModule / Codegen spec、JSI HostObject、JNI、Kotlin、Swift、Objective-C++、Gradle、CMake、CocoaPods、Swift Package Manager、AAR、XCFramework、Metro、autolinking、artifact filename。
- exact TypeScript declaration、C ABI signature、struct / pointer / length / allocator / free、error code / class / message、package exports JSON、resolver condition。
- exact typed-array offset / length、SharedArrayBuffer policy、copy count、zero-copy、allocator、zeroization primitive、GC / crash behavior、thread primitive、queue / executor、timeout / cancellation API。
- minimum React Native / Android API / iOS version、Android / iOS architecture matrix、New Architecture mandatory / legacy window、Expo scope、Browser baseline の具体値。
- native build、device / simulator、package assembly、CI job、SBOM / provenance generation、release workflow、runtime parity、fuzz、sanitizer および artifact execution evidence。

## Scope and Traceability

### Upstream Traceability

| Concept / Requirements policy | Design location | Review result |
| --- | --- | --- |
| Desktop / Node.js / Browser / Browser Extension / RN Android / RN iOS の共通 Core 利用。Browser Extension は Browser の利用形態、Mobile は RN Android / iOS | `architecture.md` §1、§3、§12.1〜§12.2; `bindings.md` §1、§12.1、§12.4; `security.md` §1、§3、§12.1 | 追跡可能。別 Mobile consumer、別 Core、Browser と Extension の別 security model は導入されていない。 |
| single repository `nemnesia/symbol-nem-wallet-core`、single npm package `@nemnesia/symbol-nem-wallet-core`、RN 専用 package なし | Requirements `NFR-007`, `AC-053`; `architecture.md` §12.1〜§12.2、`bindings.md` §12.4 | 適合。内部 backend / artifact を分けることは public repository / package の分割ではない。 |
| 同じ Rust Core、runtime 差異の package 内隠蔽、不要な API 分岐回避 | Requirements `NFR-001`, `NFR-008`, `NFR-014`, `AC-054`, `AC-060`; `architecture.md` §3〜§4、§12; `bindings.md` §3〜§4 | 適合。RN 専用 cryptographic / Store / authorization implementation、backend selector、native handle は公開しない。 |
| Binding は transport / conversion / lifecycle / error mediation、Core が暗号・KDF・signing・Store・secret ownership・authorization | Requirements `NFR-002〜004`, `NFR-009`, `SEC-011〜012`, `SEC-017`, `SEC-020`; `security.md` §3〜§4、§12.1〜§12.3 | 適合。JSI / TurboModule / C ABI / Android / iOS layer は Core authority にならない。 |
| unsupported / initialization / load / invocation / security-sensitive failure の fail-closed | Requirements `NFR-010`, `AC-056`; `architecture.md` §12.5、`bindings.md` §12.10、`security.md` §12.3〜§12.4 | 適合。Node / WASM への silent fallback、partial output、stale Store success は禁止されている。 |
| Node / Browser / WASM / native Node / release / supply-chain non-regression | Requirements `NFR-011`, `NFR-012`, `AC-057〜AC-060`; `architecture.md` §12.2、§12.6; `bindings.md` §12.4、§12.12 | 原則適合。ただし RN artifact evidence の接続は `DR-RN-004`、C ABI 配布境界は `DR-RN-003` で open。 |

### Platform Coverage

| Consumer / platform | Design path | 判定 |
| --- | --- | --- |
| Desktop Application | Native C ABI → same Rust Core | 合格。RN 追加で変更なし。 |
| Node.js | Node-API → same Rust Core。既存 Node 22 / 24 policy 継承 | 合格。RN backend へ fallback しない。 |
| Browser | WASM → same Rust Core | 合格。RN native を要求しない。 |
| Browser Extension | Browser runtime の WASM 利用形態 | 合格。独立 consumer target / Core として復活していない。 |
| React Native Android | private RN entry → JSI / TurboModule adapter → Android thin layer → internal / adapted C ABI → same Rust Core | 条件付き。topology は追跡可能だが、sync / concurrency / C ABI / artifact の `DR-RN-001〜004` が残る。 |
| React Native iOS | private RN entry → JSI / TurboModule adapter → iOS thin layer → internal / adapted C ABI → same Rust Core | 条件付き。static linkage first と slice build selection は明示されているが、`DR-RN-003〜004` が残る。 |

### Single Repository / Single npm Package

Design は public repository と package を分割せず、runtime-specific implementation を package 内部の private backend として扱う。RN 専用 npm package、public backend selector、native handle、remote binary download、postinstall compile は採用していない。exact directory、exports、artifact filename を固定していない点は Design / Specification boundary に適合する。

### Public API Preservation

`bindings.md` §12.3 は既存16 operation、TypeScript-facing DTO、`Uint8Array` binary model、Core error semantics、warning、replacement、handoff、export、signing approval および synchronous call contract を RN baseline としている。RN-specific API、Promise variant、secret convenience export は追加しない。exact declaration、DTO field、error code は Specification へ委譲されており、Design の過剰固定はない。

ただし、synchronous public contract と JS thread execution が同一視されているため、`DR-RN-001` を解消するまで、API parity が実行可能な安全性を保証するとは判定しない。

## Domain Checks

| 評価項目 | 結果 | 根拠 / finding |
| --- | --- | --- |
| Upstream Traceability | 条件付き合格 | Concept / Requirements の主要 policy は `architecture.md` §11〜§12、`bindings.md` §11〜§12、`security.md` §11〜§12 へ追跡可能。sync resource policy の upstream gap は `UF-RN-001`。 |
| RN Binding Architecture | 条件付き | TurboModule / JSI / thin native / internal C ABI の役割分担と alternatives はある。高コスト同期 execution は `DR-RN-001`。 |
| C ABI Reuse | Open | `existing / adapted C ABI` の rationale はあるが、既存公開 C ABI / separate artifact と RN private adaptation の互換性・配布責任が未確定。`DR-RN-003`。 |
| Public API Preservation | 合格（execution 条件付き） | 16 operation、DTO、binary、error、synchrony、no RN-only surface を維持。sync execution の未解決は `DR-RN-001`。 |
| Sync / Async | Open | JS runtime thread からの同期 invoke、async variant 禁止、blocking budget / worker / cancellation の deferred が同居する。`DR-RN-001`。 |
| Secret Memory Flow | 合格（後続検証） | password、Mnemonic、private key、signing payload、Store の JS → native temp / view → Core flow、no cache / no alias / explicit output がある。JS GC / crash-wide erase は保証外として正しく扱う。 |
| Zeroization / Lifetime | 合格（後続検証） | Core ownership、operation-local native temp、success / error / exception / cancellation cleanup、JS-side full erase の保証外が明記される。exact primitive は downstream。 |
| Buffer Ownership | 合格（後続検証） | caller-owned input、bounded view / temp、call-only pointer、new output、no mutation / alias、detached / proxy / invalid length rejection がある。typed-array mechanics は downstream。 |
| Hostile JavaScript Input | 合格（後続検証） | malformed object、proxy、getter side effect、detached / altered buffer、conversion failure を Core invocation / commit 前に reject する invariant がある。 |
| Error Model | 合格（Specification handoff） | Core、conversion、initialization、load、unsupported、internal binding を区別し、application が Core error と RN infrastructure failure を識別する。exact mapping は downstream。 |
| Fail-Closed | 合格 | resolver mis-detection、missing / substituted artifact、ABI / slice mismatch、load / init / invoke / conversion / output / release failure を no-fallback で明示的に失敗させる。 |
| Runtime Resolution | 合格（具体化待ち） | heuristic を禁止し、RN private entry / condition と native capability check の二段階、cross-runtime fallback 禁止を定める。exact exports / Metro は downstream。 |
| Android Integration | 条件付き | per-ABI package-local artifact、build-time selection、loader / registration / thin adapter、unsupported / load / ABI failure はある。C ABI boundary は `DR-RN-003`、artifact trust は `DR-RN-004`。 |
| iOS Integration | 条件付き | device / simulator slice、static linkage first、native selection、link / load / slice failure はある。C ABI / release evidence の接続は `DR-RN-003〜004`。 |
| Artifact Security | Open | allowlist / integrity / digest / provenance を再利用する方針はあるが、RN artifact の authoritative evidence、verification point、iOS static integration gate が未定義。`DR-RN-004`。 |
| Threading / Concurrency | Open | reentrancy / thread safety または adapter serialization、Application Store ordering の記述はあるが、binding / Core / lifecycle の一意の責任がない。`DR-RN-002`。 |
| Stateless Store Model | 合格 | RN binding は Profile state、password session、decrypted Store、active wallet、cached key / Mnemonic、current Store cache を保持せず、opaque Store processor を維持する。 |
| Android ABI Matrix | 合格（decision pending） | arm64-v8a device + x86_64 emulator を初期候補、32-bit を原則対象外とし、final matrix を user decision / gate に残す。 |
| iOS Architecture Matrix | 合格（decision pending） | arm64 device + arm64 simulator を初期候補、x86_64 simulator は要求時のみとし、final matrix を user decision / gate に残す。 |
| Version Support | 合格（decision pending） | RN / Android API / iOS / Browser の具体値を未固定の product decision とし、決定前の supported claim を禁止する。Node 22 / 24 は再オープンしていない。 |
| New Architecture | 合格（policy pending） | TurboModule / Codegen registration、JSI private substrate、New Architecture primary の候補と legacy 条件を比較。公式資料は feasibility evidence のみ。 |
| Expo | 合格（scope pending） | Expo Go は native artifact を含まないため formal support 候補外、bare / development build / prebuild を候補とする。final support claim は user decision / release gate。 |
| Threat Model | 条件付き | JS/native、hostile input、buffer、artifact、resolver、error leakage、secret lifetime、reentrancy、init race、concurrency を列挙し mitigation を配置。sync / concurrency / artifact の設計確定が必要。`DR-RN-001〜004`。 |
| Non-Regression | 条件付き | Rust Core semantics、Store、Profile、authorization、16 operation、Node / Browser / WASM routing、Node 22 / 24、release policy を維持する。RN artifact / C ABI evidence の接続は open。 |
| Design / Specification Boundary | 合格（Major handoffあり） | exact API / ABI / platform code / exports / error code / buffer primitive / CI command は固定していない。一方、execution / concurrency / artifact trust の責任原則は Design で確定すべきで、`DR-RN-001〜004` を下流へそのまま推測委譲してはならない。 |

## Findings

### DR-RN-001 — 同期 public contract に対する RN execution policy の不足

- ID: `DR-RN-001`
- Severity: `Major`
- Status: `Open`
- Location: [`docs/design/bindings.md`](../../design/bindings.md) §12.3（特に lines 424-451、DDR-RN-004 lines 726-733）、[`docs/design/architecture.md`](../../design/architecture.md) §12.3、[`docs/design/security.md`](../../design/security.md) §12.5
- Problem: Design は既存16 operationを RN でも synchronous とし、RN adapter が JS runtime thread から native module を同期 invoke することを採用している。同時に、JS thread blocking があり得ること、Core operation が短時間で終わる保証がないことを認め、password KDF、Store encryption / decryption、Mnemonic derivation、signing、large Store processing の worst-case、blocking budget、resource bound、timeout / cancellation、safe worker dispatch および deadlock / watchdog policy を下流へ委譲している。native worker + Promise は public contract を変えるため禁止され、native worker から同期結果を返す場合も JS thread が待機するため、現在の記述だけでは「public API synchrony」「native execution synchrony」「JS thread blocking」「worker execution」「result delivery」が分離されていない。
- Impact: KDF や large Store 処理で UI / JS event loop が長時間停止し、Android ANR、iOS watchdog、強制終了またはキャンセル時の cleanup 不全を招き得る。同期 API を守るための待機が native → JS re-entry、初期化待ち、queue deadlock または error delivery failure と結び付く可能性もある。16 operation の API parity は維持できても、RN consumer で安全に利用可能な実行条件と検証可能な上限がなく、availability と secret lifetime の failure path が実装者判断に残る。
- Basis: Requirements `NFR-008`、`NFR-010`、`NFR-011`、`AC-054`、`AC-056〜057`、既存 synchronous facade contract、`bindings.md` §12.3 / DDR-RN-004。これは exact async API、thread primitive または timeout value を求める finding ではなく、Design が高コスト operation の execution responsibility と safety envelope を確定していないことを問題とする。
- Required correction: Design Gate の decision として、public result contract と native execution / result-delivery model を分離する。少なくとも、(a) sync contract を維持する場合の許容 operation / input resource envelope、JS thread blocking の明示的上限または boundedness、native wait / deadlock / re-entry / cancellation / forced interruption 時の failure invariant と責任主体、(b) それを満たせない operation の public async 化または support exclusion の判断主体・互換性影響を定める。exact Promise signature、executor、timeout number、method 名および error mapping は Specification / Implementation に委譲してよい。
- Completion / recheck: Design に上記の選択と decision owner が記録され、KDF、Store、Mnemonic、signing、large input を含む operation class ごとに、JS blocking、worker、result delivery、failure cleanup、no secret carry-over を推測なく下流へ引き継げること。Specification / Implementation review で worst-case / cancellation / forced termination evidence を確認する。

### DR-RN-002 — concurrent invocation / initialization / shutdown の責任主体が二択のまま

- ID: `DR-RN-002`
- Severity: `Major`
- Status: `Open`
- Location: [`docs/design/bindings.md`](../../design/bindings.md) §12.11 lines 563-569、[`docs/design/security.md`](../../design/security.md) §12.5 lines 493-499、[`docs/design/architecture.md`](../../design/architecture.md) §12.3 lines 459-464
- Problem: Design は「Core / C ABI が concurrent invocation に対して reentrant / thread-safe である必要があり、同時 mutation を許さない場合は adapter が deterministic に直列化する」と記載し、Application に same-Store mutation ordering を置いている。しかし、Core / C ABI が常に thread-safe であることを契約にするのか、RN adapter が全 invocation を serialize するのか、または read / mutation / initialization / shutdown ごとに異なるのかが一意でない。複数の RN module instance、複数 JS call、native registration race、unload / shutdown、re-entry、cancellation および Store replacement ordering の境界も、mutex / queue primitive だけでなく責任分担として未確定である。
- Impact: 二重初期化、同時 C ABI 呼出し、同じ Store snapshot からの競合 replacement、stale result の適用、shutdown 中の use-after-release、reentrancy deadlock または Profile 間の非決定的な failure を実装が許す余地がある。Binding が state cache を持たないことだけでは、同時に実行された operation の ordering、Core resource lifetime、native artifact lifecycle を保証できない。security-sensitive operation の failure / cleanup と Store atomicity の検証責任も分散する。
- Basis: Requirements `NFR-009〜010`、`SEC-017〜019`、`AC-055〜057`、Architecture / Security / Bindings の stateless Store、atomic replacement、no re-entry、no cache invariant。User が指摘した「Core thread-safe または native serialization」という曖昧な二択を、単なる implementation detail として扱わず、Design responsibility の欠落として評価した。
- Required correction: Core / C ABI / RN adapter の concurrency policy を一つの責任モデルとして選択する。少なくとも、同一 process 内の invocation、secret-capable operation、read、Store mutation、module initialization、shutdown、re-entry、cancellation の各クラスについて、thread-safety または serialization の owner、scope、ordering、lifecycle barrier、failure / cleanup および Application の current Store ordering との境界を明示する。mutex、queue、executor、thread affinity、memory ordering の exact form は下流へ委譲してよいが、`Core が保証する` と `RN adapter が保証する` を条件分岐のまま残さない。
- Completion / recheck: 1つの concurrency owner と operation / lifecycle matrix が Architecture / Bindings / Security で一致し、複数 instance、同時 read / mutation、init race、shutdown、re-entry、cancellation、retry / restart の failure safety と secret cleanup を Specification / Implementation が検証できること。

### DR-RN-003 — 既存 C ABI の公開配布境界と RN private adaptation の接続不足

- ID: `DR-RN-003`
- Severity: `Major`
- Status: `Open`
- Location: [`docs/design/architecture.md`](../../design/architecture.md) §12.1 lines 420-445、§12.7 lines 489-504、[`docs/design/bindings.md`](../../design/bindings.md) §12.2 lines 408-420、DDR-RN-002 lines 708-715。整合確認先は [`monorepo-npm-distribution-design.md`](../../migration/monorepo-npm-distribution-design.md) lines 164-175、192-216 および [`c-abi-release-assets.md`](../../migration/c-abi-release-assets.md) lines 23-28、91-96、152-153。
- Problem: RN Design は `existing / adapted Native C ABI` を package 内部の RN implementation boundary とし、C ABI を Application に公開しない。一方、既存 distribution Design は C ABI を Native Application 向けの外部 FFI boundary、npm の Node `.node` artifact とは別の artifact / release path として定義し、既存 C ABI の Android / iOS release を MosaicLynx integration まで deferred としている。RN Design は `existing C ABI contract をそのまま target 拡張する` のか、`同じ Core を共有する RN private adapted boundary を別 artifact とする` のかを選ばず、「existing / adapted」として下流へ委譲している。16 operation、ownership、error、release evidence、C ABI public consumer compatibility の関係も一意でない。
- Impact: 実装者が既存 C ABI public artifact を RN package に誤って組み込む、RN 用に API / ownership / error を変えた adapted ABI を既存 C ABI と同じものとして扱う、または C ABI target が未検証のまま RN を supported と宣言する余地がある。結果として C ABI public compatibility、npm single-package assembly、native artifact identity、duplicate conversion / error / secret lifetime responsibility および release / supply-chain evidence が分岐する。`C ABI を使う` という rationale だけでは、既存 C ABI を再利用する利点と RN で成立する抽象度・testability を証明できない。
- Basis: Requirements `NFR-007〜009`、`NFR-011〜014`、`AC-053〜060`、既存 C ABI の external contract / artifact boundary、`architecture.md` §12.1、`bindings.md` DDR-RN-002。Exact C ABI signature や artifact filename の不足ではなく、既存 public boundary と RN private boundary の設計関係が未確定である点を問題とする。
- Required correction: Design で次のいずれかを明示的に選ぶ。(A) RN は既存 C ABI contract / library を再利用し、既存 public C ABI consumer の ABI / ownership / error semantics を維持したまま Android / iOS target と package / release evidence の関係を拡張する、または (B) RN は Core source と security invariant を共有する private adapted native boundary / artifact を持ち、既存 C ABI public contract / release artifact とは別であることを明示する。どちらの場合も、C ABI / RN adapter の責任、16 operation parity、artifact identity、public compatibility、test / release evidence の owner を定め、RN が未検証の C ABI artifact を暗黙利用しないことを確定する。exact function / struct / archive は downstream。
- Completion / recheck: 選択したモデル、dependency direction、public C ABI compatibility、RN package assembly、artifact / manifest ownership、error / ownership parity が3 Design文書と migration / release Design で一致し、C ABI Review / Release Review が検証対象を一意に特定できること。

### DR-RN-004 — RN native artifact の integrity / provenance verification point が未確定

- ID: `DR-RN-004`
- Severity: `Major`
- Status: `Open`
- Location: [`docs/design/bindings.md`](../../design/bindings.md) §12.12 lines 571-575、§12.14 lines 675-682、[`docs/design/security.md`](../../design/security.md) §12.4 lines 475-491、[`docs/design/architecture.md`](../../design/architecture.md) §12.4 lines 465-471。既存 model は [`release-operation-provenance.md`](../../migration/release-operation-provenance.md) lines 55-62、76-88 にある。
- Problem: RN Design は Android per-ABI library group と iOS device / simulator slice group を single package の release input とし、Node native artifact の package-local allowlist、digest、provenance、release evidence の「考え方」を RN に適用する。しかし、RN artifact が既存 npm `release-manifest` / evidence set に入るのか、RN artifact の source / version / target identity を誰が authoritative に記録するのか、Android loader が use 前に exact bytes を検証するのか、iOS static linkage で package / build gate が verification point になるのか、wrong ABI / wrong slice / substituted artifact をどの trust anchor と比較するのかが決まっていない。`manifest / digest / provenance format` と `release workflow` を下流へ委譲すること自体は妥当だが、verification obligation と authority まで委譲されている。
- Impact: package-local native code が integrity / provenance evidence と結び付かないまま load / link され、artifact substitution、wrong ABI selection、source-to-artifact confusion、RN package と C ABI / Node artifact の混同を検出できない可能性がある。これは Requirements `NFR-011`、`SEC-020`、`AC-057〜059` の既存 release / supply-chain guarantee を RN artifact だけが弱める回帰となり得る。iOS の static artifact は runtime loader failure が発生しないため、build / release 時の検証責任を明示しなければ fail-closed の観測点が消える。
- Basis: Requirements `NFR-011〜013`、`SEC-015`、`SEC-020`、`AC-057〜059`、既存 Node native integrity design。Exact digest algorithm、manifest field、archive / framework format、CI command を要求するものではなく、同じ trust chain に RN artifact を必ず bind する Design invariant の不足を問題とする。
- Required correction: RN Android / iOS artifact を既存の正式な source → version → target → package / release evidence chain の対象とすることを Design で明示し、native / packaging / release の authority と verification point を一意にする。Android は approved artifact の use / load 前、iOS は static / integrated artifact の package / link gate 前に、identity / integrity / target compatibility が確認され、missing / mismatch / verification failure は no-fallback で停止する invariant を定める。既存 npm manifest を拡張するか RN evidence を同一 release record に束ねるか、exact schema / command は下流へ委譲してよい。
- Completion / recheck: RN artifact group が source commit、version、approved target、package bytes、integrity / provenance evidence と追跡可能で、Android / iOS の load / link path が未検証 artifact を成功扱いしないことを Design、Specification、Release Readiness evidence で確認する。

## Requirements / Specification follow-up

- Requirements follow-up: `UF-RN-001` を受け、sync public contract が product requirement なのか、RN での UI blocking / resource boundedness / async compatibility を許容するのかを Requirements owner が決定する。既存 Node.js 22.x / 24.x policy、Browser baseline の既存決定状況、NFR-012 / NFR-013 の support / architecture gate は RN 対応を理由に再オープンしない。
- Specification follow-up: `DR-RN-001` の決定後に、16 operation ごとの execution class、input / Store size boundary、result delivery、timeout / cancellation、error mapping、no re-entry、cleanup、secret non-retention を外部観測可能な contract として定義する。`DR-RN-002` の concurrency owner と ordering を API / lifecycle / failure contract に反映する。
- Binding / Implementation follow-up: `DR-RN-003` の C ABI model、`DR-RN-004` の artifact evidence model、resolver / Metro / native registration、Android / iOS load / link、hostile JS buffer、concurrency、parity、failure、secret cleanup を決定後に実装・検証する。
- Release follow-up: final RN / OS / ABI / slice / New Architecture / Expo decision を NFR-012 / NFR-013 の matrix、CI / release gate、package contents、integrity / provenance evidence に反映する。決定前の target を supported と宣言しない。

## NEEDS USER DECISION classification

| 項目 | 決定時点 | 判定理由 |
| --- | --- | --- |
| 1. minimum React Native version | Implementation 前 | Codegen / native integration / compatibility test matrix の前提となる。具体 major は未決定のまま Design Gate を阻害しないが、実装対象を宣言する前に決める。 |
| 2. minimum Android API level | Implementation 前 | Android native API、build target、device coverage および artifact test matrix を決める前提。 |
| 3. minimum iOS version | Implementation 前 | iOS native integration、linkage、device / simulator validation の前提。 |
| 4. supported browser baseline | Release 前 | RN 対応を理由に Browser policy を変更しない。既存 Browser baseline が Requirements で未固定のため、正式 supported claim / release matrix 前に確認する。決定済み Node policy は含まれない。 |
| 5. Android ABI matrix | Implementation 前 | per-ABI build、artifact、loader、CI / test matrix の対象を決める前提。現行候補 arm64-v8a + x86_64 は Design candidate。 |
| 6. iOS device / simulator matrix | Implementation 前 | slice、static / integrated artifact、device / simulator test matrix の前提。現行候補 arm64 device + arm64 simulator は Design candidate。 |
| 7. New Architecture mandatory / legacy compatibility | Implementation 前 | Design は New Architecture primary を選んでいるが、legacy adapter の有無・期間は native registration / test topology に影響する。New Architecture primary 自体は現行 Design decision としてレビュー可能で、legacy support を実装する場合は着手前に確定する。 |
| 8. Expo support scope | Release 前 | bare / development build / prebuild を実装候補にでき、Expo Go の formal claim は native artifact を含む consumer を検証できる場合だけ行う。正式 support / non-support 宣言を release matrix 前に決める。 |
| 9. sync contract を維持できない場合の async 化方針 | Design Gate 前 | public API compatibility、JS thread availability、worker / result delivery の architecture を決めるため。現行 Design の未解決は `DR-RN-001` および `UF-RN-001` として記録した。 |

既に決定済みの事項として、Node.js `engines.node >=22.0.0`、Node.js 22.x minimum / support line、24.x primary verification line、single repository、single npm package、Browser Extension の Browser runtime 扱いおよび React Native が独立 package ではないことを確認した。これらを `NEEDS USER DECISION` に戻していない。

## Review Gates

| Gate | 結果 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | RN は共通 Rust Core を利用する追加 runtime であり、別 Wallet Core、別 package、別 product line ではない。 | なし |
| 2. コンテキストと責任 | 条件付き合格 | Core / Binding / Application / host の security responsibility は明確。concurrency owner と C ABI private/public boundary が open。 | DR-RN-002, DR-RN-003 |
| 3. 依存方向 | 条件付き合格 | RN → private facade → adapter → native → C ABI / Core の方向はある。C ABI artifact / package / release identity の選択が open。 | DR-RN-003, DR-RN-004 |
| 4. 主要フロー | 条件付き合格 | 16 operation、handoff、export、signing、Store、failure / restart は追跡可能。sync execution、init、concurrency、cancellation が open。 | DR-RN-001, DR-RN-002 |
| 5. データ所有 | 条件付き合格 | Core secret ownership、operation-local temporary、no cache、opaque Store は明確。forced interruption と execution resource policy の確認が必要。 | DR-RN-001, DR-RN-002 |
| 6. セキュリティと相互運用性 | 条件付き合格 | Core boundary、per-operation authorization、no secret logging、fail-closed、Chain / Network separation は維持。artifact trust chain が RN へ未接続。 | DR-RN-003, DR-RN-004 |
| 7. 上流整合性 | 合格（feedback 付き） | Concept / Requirements の主要 policy と Node / Browser non-regression に矛盾なし。sync resource policy は `UF-RN-001`。 | なし（UF-RN-001） |
| 8. 下流実装可能性 | 条件付き合格 | exact implementation は適切に委譲。ただし execution owner、concurrency owner、C ABI model、artifact verification obligation は Design で確定が必要。 | DR-RN-001〜004 |

Formal Review Gate: `READY`。Design Review Skill の規則により `Critical = 0` であるため、Major 4件が存在しても `REVISE DESIGN` にはしない。なお、RN の Specification / Implementation / release readiness は、open Major の correction または承認済み再確認を経て進めること。

## Remaining Risks and Open Decisions

- `DR-RN-001`: JS thread blocking、high-cost secret operation、forced termination、cancellation cleanup および sync / async compatibility が未解決。
- `DR-RN-002`: concurrent invocation、initialization、shutdown、same-Store replacement、re-entry の責任主体が未解決。
- `DR-RN-003`: existing public C ABI と RN private adapted boundary、artifact、16 operation parity、release evidence の対応が未解決。
- `DR-RN-004`: RN native artifact の source / version / target identity、integrity / provenance trust chain、Android use-before-load / iOS static gate が未解決。
- support version、Android API、iOS version、ABI / slice、New Architecture legacy window、Expo scope、Browser baseline は表の decision timing に従う。具体値未決定だけでは finding としない。
- JS engine、GC、crash dump、OS、debugger、host compromise に対する全コピー消去は既存どおり保証外だが、通常処理の non-disclosure、no needless retention、per-operation authorization、fail-closed は保証する。

## Automatic Changes

レビュー中に変更したのは新規 artifact [`react-native-design-review-001.md`](react-native-design-review-001.md) のみである。Concept、Requirements、3つの Design 正本、既存 review artifact、Specification、Implementation、package、CI、release file は変更していない。

## Validation Results

- 実施: `git status --short --branch` と `git rev-parse HEAD` により、review 開始時 branch が `agent/react-native-support`、current HEAD が `e09174d81ed290b6b9d9b576ab4079d776143d94` であることを確認した。
- 実施: Reviewed HEAD の commit stat / diff を確認し、対象 Design 3文書が `e09174d...` の変更対象であること、レビュー中に正本を変更していないことを確認した。
- 実施: Concept Review 011 の Reviewed HEAD `bb529efd19c4e0b45f596a0588a4bb2a3f9a1db7` と `READY`、Requirements Review 009 の `READY`、Node 22 / 24 policy および RN support decision の状態を確認した。
- 実施: Concept、Requirements、Design 3文書、既存 Design Review artifact、migration / release evidence を line-numbered で確認し、既存 finding ID の連続性と `DR-RN-001〜004` の新規性を確認した。
- 実施: 公式 React Native / Expo 資料を 2026-09-05 に feasibility reference として確認した。公式資料を本 repository の normative requirement へ変換していない。
- 実施: artifact の headings、table、code span、relative link target、internal reference、`git diff`、`git diff --check`、commit 内容および remote branch を確認した。
- 未実施: Rust formatter / clippy / cargo test、WASM build / test、Native C ABI runtime / header test、Node / npm build / test、Android / iOS build、device / simulator、React Native runtime、package assembly、CI、release / supply-chain execution。docs-only review artifact のため、またユーザー指定により full test を実行しない。
- 未確認: `DR-RN-001〜004` の correction 後の実装可能性、具体 support values、artifact evidence、actual API parity、actual secret cleanup。未確認範囲を PASS の根拠にしていない。

## Final Decision

`READY`

**DESIGN PHASE FORMAL GATE: READY**

`e09174d81ed290b6b9d9b576ab4079d776143d94` 時点の React Native Design は、上位 Concept / Requirements に追跡可能で、single repository / single npm package、shared Rust Core、Core security boundary、public API preservation、fail-closed、runtime non-regression および Design / Specification boundary の基礎を満たす。Formal rule 上の Critical はないため Gate は `READY` である。

ただし、Major の `DR-RN-001〜004` は、RN の Specification / Implementation / release readiness が自動的に完了したことを意味しない。高コスト同期 execution、concurrency ownership、C ABI reuse boundary、native artifact integrity / provenance を、それぞれの decision gate で解消または承認済み evidence により再確認する必要がある。

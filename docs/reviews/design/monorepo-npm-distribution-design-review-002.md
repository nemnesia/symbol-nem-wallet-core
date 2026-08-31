# Monorepo / npm Distribution Design Review 002

## Review Target

- 対象: [`docs/migration/monorepo-npm-distribution-design.md`](../../migration/monorepo-npm-distribution-design.md)
- 確認日: 2026-09-01
- 対象 HEAD: `c6a6819aef4a38af7b4855d2fe833cab17d2cdcc` (`agent/monorepo-migration`)
- 前回レビュー: [`monorepo-npm-distribution-design-review-001.md`](monorepo-npm-distribution-design-review-001.md)
- 成果物: `docs/reviews/design/monorepo-npm-distribution-design-review-002.md`
- Review Scope: target monorepo topology、Rust workspace、Core / Native C ABI / WASM / Node-API の責務と依存方向、npm single facade、conditional exports、native / WASM artifact 配布、versioning、migration gate / sequence、README更新順、security / supply-chain boundary、Concept → Requirements → Design → Specification の整合。
- 整合確認対象: [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md)、[`architecture.md`](../../design/architecture.md)、[`security.md`](../../design/security.md)、[`bindings.md`](../../design/bindings.md)、[`specification.md`](../../specifications/specification.md)。
- 補助確認範囲: 現行の root [`Cargo.toml`](../../../Cargo.toml)、[`bindings/native/Cargo.toml`](../../../bindings/native/Cargo.toml)、[`fuzz/Cargo.toml`](../../../fuzz/Cargo.toml)、[`scripts/build-wasm.sh`](../../../scripts/build-wasm.sh)、[`README.md`](../../../README.md)、関連CI。これらは normative source ではなく、現行 topology、既存 path、READMEの利用経路および migration の実現可能性の確認に限って参照した。
- 未確認範囲: Rust / Native C ABI / WASM / Node-API の実装適合性、build / test の実行結果、Node.js target matrix の実機確認、Browser bundler の実機確認、npm tarball の実生成、SBOM / provenance の生成実績、external consumer inventory の実査結果。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として候補の反証・統合、severity、Gate および成果物を担当した。
- Reviewer A（構造と責務）: 完了。target tree、Stage 1 / Stage 2 / Stage 3 / Stage 4 の boundary、Rust / npm dependency direction、Core host-neutrality、Binding non-authority、C ABI / fuzz の path resolution を確認した。
- Reviewer B（Security primary）: 完了。Mnemonic、Software Key private key、Profile password、Store、signing authority、handoff / export / approval、Core / Binding / facade boundary、fallback、package contents、release evidence の責任を確認した。
- Reviewer C（フローと運用）: 完了。workspace preparation、atomic relocation、WASM transitional validation、WASM extraction、README更新、Node/npm実装、releaseの段階分離、failure / retry / restart、artifact assembly の責任を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept / Requirements / Design / Specification の Node.js scope、Binding responsibility、公開範囲、error、Store、Chain / Network、下流委譲、OPEN項目および前回findingの対応箇所を確認した。
- Phase 0（対象・根拠・境界）: 完了。主対象を migration design 1件、前回成果物を状態追跡資料、指定された上流・同一Design・下流資料と現行構成を確認資料として確定した。`AGENTS.md` にDesign Phase Contextの登録はなく、Contextは使用していない。
- Phase 1（独立レビュー）: 完了。A〜Dの担当観点から主対象本文と整合確認対象を独立に確認した。
- Phase 2（反証・統合）: 完了。DR-001/002が現在のDesignで解消されたかを、設計責務・段階境界・互換判断・完了gateへ追跡した。Node/npm implementation gateおよびrelease gateの未決定事項はstructural blockerへ昇格していない。
- Phase 3（ゲート・成果物）: 完了。共通章順、finding必須項目、相対リンク、変更範囲およびdocs-only validationを確認する。

## Evidence Used

| 区分 | 資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md)、[`design-review/SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、`reviewers.md`、`security-checklist.md`、`review-gates.md`、`output-format.md` | Design Reviewの対象境界、A〜Dの担当、Security findingの採用条件、Critical / Gate、成果物構成、docs-only validationおよびGit変更範囲を確認 |
| 主対象 | [`monorepo-npm-distribution-design.md`](../../migration/monorepo-npm-distribution-design.md) §1〜§23 | target tree、責務、dependency graph、npm contract、routing、artifact、versioning、supply-chain、gate、sequence、open decision、readinessを評価 |
| 前回レビュー | [`monorepo-npm-distribution-design-review-001.md`](monorepo-npm-distribution-design-review-001.md) §41〜§98 | DR-001 / DR-002の初出内容、Critical判定、必要修正および再確認条件を追跡 |
| Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1、§3、§7〜§10、§12〜§13 | 全環境共通のCore ownership、Node.jsのv1対象、独立Node.js / TypeScript Core非採用、通常処理の非開示、host compromise保証外を確認 |
| Requirements | [`requirements.md`](../../requirements/requirements.md) §1〜§2、UC-001 / UC-005 / UC-006 / UC-010 / UC-011、FR-001 / FR-007 / FR-009 / FR-019 / FR-022〜FR-024、NFR-001〜NFR-004、SEC-001〜SEC-023、AC-001、AC-007、AC-009、AC-015〜AC-050 | 同じRust Core、Binding non-authority、per-operation authorization、handoff / export / signing、Store、Chain / Network、failure safety、全環境parityの根拠を確認 |
| Architecture | [`architecture.md`](../../design/architecture.md) §3〜§10 | Core / Application / Binding / storageの責務、依存方向、trust boundary、Store authority、lifecycle、failure、Specificationへの委譲を確認 |
| Security Design | [`security.md`](../../design/security.md) §3〜§10 | protected asset、secret ownership、authorization、signing authority、Store、pending、fallback、failure safety、host guarantee boundary、下流security handoffを確認 |
| Bindings Design | [`bindings.md`](../../design/bindings.md) §3〜§10 | Native C ABI / Node-API / WASMの共通non-authority、representation / ownership mediation、error、retry / restart、Chain / Network、下流委譲を確認 |
| Specification | [`specification.md`](../../specifications/specification.md) §1〜§2、§7〜§14、§15〜§18 | Node-APIを同じCoreのthin bindingとする契約、共通error / parity、WASM / JavaScript boundary、既存Core security meaningの維持を確認 |
| Current topology evidence | [`Cargo.toml`](../../../Cargo.toml)、[`bindings/native/Cargo.toml`](../../../bindings/native/Cargo.toml)、[`fuzz/Cargo.toml`](../../../fuzz/Cargo.toml)、[`build-wasm.sh`](../../../scripts/build-wasm.sh)、関連CI、[`README.md`](../../../README.md) | 現行root package、Native / fuzz path dependency、`wasm` feature、root `cdylib`、WASM generation command / output、READMEの既存利用経路を確認 |
| Current change evidence | current HEADとその直前commitのdiff | 今回のDesign修正がStage 2 / 4のWASM検証分離とREADME更新順だけに限定されることを確認 |

## Review Result

`READY`

## Summary

前回のCritical findingであるDR-001とDR-002は、今回のHEADでいずれも解消されている。現在のformal findingはなく、集計は `Critical 0 / Major 0 / Minor 0` である。

- DR-001は、Stage 1をroot Rust packageを維持するworkspace preparationに限定し、Stage 2でCore relocation、root Cargoのvirtual workspace化、`crates/core` / existing `bindings/native`のworkspace member化、Native / fuzzのCore path更新を同一atomic stageにまとめた。stage boundaryごとのbuildable dependency graph、root packageを先に消さないこと、`symbol-nem-wallet-core` package nameとRust public APIの維持、新しいCoreへの一意な参照が明記されている。
- DR-002は、旧root raw WASM build / distribution interfaceを互換contractとして維持しないDD-002を確定したうえで、Stage 2を非公開transitional WASM regression validation、Stage 4を`crates/wasm`へのextractionと旧interface廃止確認として分離した。root `pkg/`、旧command / output contract、compatibility shimを復活させないことも明記されている。
- Stage 2のWASM validationは、移動後Coreに一時的に残るWASM wiringでwasm32 build / checkとrelocation前後のWASM boundary behaviorを確認する設計であり、旧root WASM public interfaceの維持ではない。具体的commandは実装時に委譲されており、Designで固定されていない。
- README更新は、Stage 4で旧root WASM build手順を削除または利用不可と明示し、raw WASMをpublic entry pointとせず、npm facadeを完成済みと記載しない。Stage 7でnpm facadeの実装・検証後に実在する利用方法を追加し、Stage 11で文書群との最終整合を確認する順序になっている。
- target topology、Core host-neutrality、Core security authority、Native C ABI / Node-API / WASMのthin boundary、Node-APIのC ABI FFI非再利用、npm single facade、conditional exports、限定fallback、lock-step versioning、同梱artifact、no remote download / no postinstall、およびCoreのauthorization / secret ownership / Store / signing semantics不変は、今回確認した範囲で回帰していない。
- OPEN-001、OPEN-002、OPEN-004、OPEN-005、OPEN-008はNode/npm implementation gate、OPEN-006、OPEN-007はrelease gateとして残るが、structural migration開始のblockerではない。OPEN-003はC ABI package renameを選択する場合だけ拘束し、未解決時は既存package nameを維持したpath moveが可能である。

したがって、**MONOREPO STRUCTURAL MIGRATION READY**。**Stage 1 workspace preparation を開始可能**と判定する。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| DR-001 | Critical | Resolved | Review 001 | Stage 1はroot package / `src/` / existing Native / fuzz pathを維持し、Stage 2でCore relocation、root virtual workspace化、workspace member化、Native / fuzz path更新を同一atomic stageで完了する。stage boundaryにbroken dependency graphを定義していない（主対象 §8.1、§19.2、§19.3、§21.1、§22.2）。 |
| DR-002 | Critical | Resolved | Review 001 | DD-002で旧root raw WASM interfaceの非互換方針を確定し、Stage 2の非公開transitional regressionとStage 4のWASM extraction / old interface廃止、Stage 4 / 7 / 11のREADME更新順を明示した。raw consumerの存在可能性はriskとして残すが、compatibility decisionを未決定事項へ戻していない（主対象 §14.3、§19.1〜§19.3、§20、§21.1、§22.2）。 |

集計: `Critical 0 / Major 0 / Minor 0`（現行未解決finding）。解消済みCriticalは2件。

## Required Changes

なし。DR-001 / DR-002はいずれもResolvedであり、Gateを不合格にするCriticalは残っていない。

## Optional Improvements

なし。Node/npm implementationおよびreleaseに残るOPEN項目は、後続gateへ委譲する事項であり、今回のDesign findingとして重複計上していない。

## Resolved Findings

### DR-001

Stage 1のvirtual workspace化を撤回し、root packageを維持する準備段階へ変更した。root packageを廃止する操作はStage 2へ移し、Core relocation、root virtual workspace化、existing `bindings/native`のworkspace member化、Native / fuzzのpath更新および直接必要なscript / test path更新を同一atomic stageにした。これにより、root packageを先に消した状態でNative / fuzzが旧pathを参照する中間状態を設計上のstage boundaryから排除している。`crates/core`のpackage name `symbol-nem-wallet-core`、Rust public API、Native / fuzzからのpath解決先も維持・明示されている。

再確認箇所: 主対象 §8.1（特にL289〜L291）、§8.2（L293〜L300）、§19.2 Stage 1 / Stage 2（L731〜L732）、§19.3（L745〜L746）、§21.1 DD-001（L779）、§22.2（L814）。

判定: `Resolved`。Stage 1 / Stage 2のsequenceを理由とするstructural blockerはない。

### DR-002

旧rootの`--features wasm`、Core `cdylib`、`pkg/`、`scripts/build-wasm.sh`の旧invocation / output contractおよびraw generated wasm-bindgen packageを、v1のconsumer-facing compatibility contractとして維持しないDD-002が確定している。Stage 2ではroot package cutover後に旧root interfaceやshimを復活させず、移動後Coreの非公開transitional WASM pathでrelocation regressionだけを確認する。Stage 4では`crates/wasm`へ抽出し、旧feature / cdylib / `pkg/` / raw build interfaceの廃止を確認する。`crates/wasm`はnpm facadeの内部artifact sourceであり、raw generated package、低レベル`.wasm`、`pkg/`はpublic entry point / public subpathではない。

READMEはStage 4で旧root WASM build手順を削除または利用不可と明示し、raw WASM非公開を記録する。npm facadeの利用方法はStage 7の実装・検証後に追加し、Stage 11でREADME、migration note、Design、Specification、release documentationの整合を確認する。したがって、実装前のnpm facadeをREADMEで利用可能と誤記する時系列矛盾はない。

再確認箇所: 主対象 §14.3（L560〜L573）、§19.1（L714〜L724）、§19.2 Stage 2 / Stage 4 / Stage 7 / Stage 11（L732、L734、L737、L741）、§19.3（L747〜L748）、§20（L761）、§21.1 DD-002（L780）、§22.2（L815）。

判定: `Resolved`。旧raw WASM consumerの存在可能性はcompatibility riskとして残るが、structural gateを止める未決定事項ではない。

## Upstream Feedback

なし。Concept、Requirements、Architecture、Security Design、Bindings DesignおよびSpecificationは、Node.jsを同じRust Wallet Coreへ接続するv1 supported environmentとし、Node-APIをthin / non-authoritative bindingとして扱う。Node-APIが独立Node.js / TypeScript Core implementationを意味しない点、Core ownership、binding boundary、error / Store / signing semanticsの維持も追跡可能である。今回の前回findingは上流資料の欠落ではなく、migration Design内の段階順序とdistribution interface decisionの不足であり、今回のDesign本文で解消されている。

## Deferred Findings

- **Node/npm implementation gate**: OPEN-001（Node.js / Node-API / ESM / CJS compatibility floor）、OPEN-002（native target matrix）、OPEN-004（Node-API wrapper libraryとJS / TypeScript shape）、OPEN-005（tarball sizeとoptional artifact packageの条件）、OPEN-008（Browser bundler / Extension integration baseline）。`crates/node`およびnpm facadeの実装開始前に解決する。Core / C ABI / WASMのstructural migration開始条件にはしない。
- **Release gate**: OPEN-006（runtime native artifact hash verification）とOPEN-007（SBOM format / generator、artifact signing、provenance retention、release permissions）。publish / release前に解決する。structural migrationまたはNode/npm実装の開始条件にはしない。
- **OPEN-003**: `symbol-nem-wallet-core-native`の既存外部利用と`-c-abi` rename / compatibility aliasの判断。package renameを行う場合だけstructural migrationに拘束し、未解決時は既存package nameを維持してpath moveを進める。C ABI symbol / header / ownership contractの変更を導かない。
- **後続検証**: target matrix、artifact digest、SBOM、provenance、npm pack、clean install、Browser smoke、Native runtime、Node-API parityの実行実績は未確認であり、Implementation / release-readinessで確認する。本レビューのREADYはDesign Gateの判定であり、これらの実行結果を成功扱いしない。

## Scope and Traceability

| 対象設計領域 | 上流・同一Design・下流との追跡 | 判定 |
| --- | --- | --- |
| Structural sequence / buildable dependency graph | Requirements §2.2、NFR-001〜NFR-004 → Architecture §4.5 → migration design §8、§19.2〜§19.3、§21.1、§22.2 | 適合。Stage 1はroot packageを維持し、Stage 2はCore relocation・root virtual workspace化・Native / fuzz path更新をatomicに扱う。 |
| Core package identity / public Rust API | Requirementsの同一Core / Binding要件、Architecture §4 → migration design §8.2、§19.2 Stage 2 | 適合。`crates/core`のpackage name `symbol-nem-wallet-core`とRust public APIを維持する。 |
| Native C ABI / Node-API / WASM responsibility | Requirements FR-019、NFR-001〜NFR-004、AC-015〜AC-024、AC-040、AC-043 → Architecture §4、Security §4、Bindings §3〜§8、Specification §13 → migration design §6、§7、§12 | 適合。3 Bindingは同じCoreを利用し、Node-APIはC ABIをJavaScript FFIで再利用しない。 |
| Stage 2 transitional WASM regression | Specification §13.3、§14、Bindings Design §6、§10 → migration design §1.1、§8.2、§14.3、§19.2、§19.3 | 適合。wasm32 build / checkとrelocation前後のWASM boundary behaviorを非公開pathで検証し、old root public interfaceを維持しない。具体commandは実装へ委譲する。 |
| Stage 4 WASM extraction / raw interface cutover | Concept §7〜§10、Requirements FR-019、NFR-004、AC-015〜AC-016、AC-040、AC-043 → migration design §14.3、§19.2〜§19.3、§20、§21.1 | 適合。`crates/wasm`をthin Binding / artifact sourceとし、raw generated package、`.wasm` public subpath、root `pkg/`およびcompatibility shimをpublic contractにしない。 |
| README Stage 4 / 7 / 11 order | migration design §2.3、§14.3、§19.2 Stage 4 / Stage 7 / Stage 11 → current README is pre-cutover evidence | 適合。Stage 4で旧手順を利用不可とし、Stage 7で実装後のnpm facade利用方法を追加し、Stage 11で最終整合する。 |
| npm single facade / conditional exports / fallback | Requirements NFR-003〜NFR-004、SEC-010〜SEC-020、AC-024、AC-040、AC-043 → Specification §13 → migration design §9〜§12、§18 | 適合。root entryを正本とし、`node-addons`はnative、`default`はWASM、`--no-addons`およびunsupported targetだけをfallback条件とする。supported native artifactのload / initialization / operation failureはWASM retryで隠さない。 |
| Artifact / supply-chain boundary | Requirements SEC-015、SEC-020、NFR-004 → Security / Bindings guarantee boundary → migration design §13〜§18 | 適合。同梱artifact、no remote binary / WASM download、no postinstall compile / download、allowlist、digest、SBOM / provenanceをrelease gateへ分離している。 |
| Versioning | Requirements NFR-001〜NFR-004、AC-015〜AC-024 → Specification §13〜§14 → migration design §15〜§17 | 適合。Core、C ABI、WASM、Node-API、npm facadeをv1 lock-stepで管理し、公開contractのSemVerとC ABI / protocol変更の責任を分離している。 |
| Store / secret / authorization / Chain / Network invariants | Requirements SEC-001〜SEC-023、AC-001〜AC-050 → Architecture / Security / Bindings → Specification §1〜§14 → migration design §5〜§7、§10〜§12、§17〜§18 | 適合。Core ownership、per-operation authorization、handoff / export / signing、Store opaque / replacement、existing state safety、BindingFailure / Core error、Chain / Network separationを弱めていない。 |

## Domain Checks

### System context / responsibility

`Application / UI → Binding → Core`、`Application / persistence → opaque Store → Core`、`Core → replacement Store → Application`のcontextは明確である。`packages/wallet-core`はpublic TypeScript contract、routing、adapter、artifact assemblyを担うが、Coreのauthorization、secret ownership、Store semantics、signing authorityを複製しない。Node nativeをWASMより強いsecret isolation boundaryとしない点も上流整合している。判定は適合。

### Dependency direction / topology

最終graphは `crates/c-abi → crates/core`、`crates/wasm → crates/core`、`crates/node → crates/core`、`packages/wallet-core → node / wasm artifact` であり、`core → binding / npm`、`node → c-abi`、`wasm → node`を禁止している。Stage 1は現行root packageを維持し、Stage 2のroot virtual workspace化とCore / Native / fuzz参照更新は同一atomic boundaryで行うため、DR-001のbroken intermediate graphは再発しない。判定は適合。

### Security domain

適用したprotected assetはMnemonic、Software Key private key、derived / decrypted secret、Profile password、encrypted / decrypted Store、signing authorityおよびpending / replacement stateである。trust boundaryはCore、Native C ABI、Node-API、WASM、npm facade、Application / UI、persistent storage、Browser / OS / Node.js host processとした。

Coreが継続secret owner、Binding / facadeがnon-authority、passwordがprocessing-unit authorization、handoff / export / signing approvalがApplicationとCoreの分担、Storeがopaque、current Store authorityがApplication / persistence、failureがfail-closed、Chain / NetworkがCore-ownedであることを確認した。attacker-controlled Store / request / bufferのvalidationとconversion failureの責任、state consistency / replacement、retry / restartでのauthorization非継承、Node native failureとCore operation errorの分離、supported native failureのWASM retry禁止も明確である。Node-API、WASMまたはnpm routingによるsecret ownership、authorization、signing authority、Store interpretationの逆流はない。Security findingはなし。

### Lifecycle / failure / operation

Stage 1準備、Stage 2 atomic relocation、Stage 3 C ABI relocation、Stage 4 WASM extraction、Stage 6〜8 Node/npm実装、Stage 9〜11 release / documentationの順序と完了責任は分離されている。Stage 2のtransitional WASM validationはrelocation regressionに限定され、Stage 4はextraction後のWASM parityとold interface廃止を担当する。Core error、Binding failure、native initialization / load failure、unsupported target fallback、retryおよびrestartの意味をfacadeで隠さない。判定は適合。

### Interoperability / upstream consistency

ConceptのNode.js scope、Requirementsの同一Rust Core、Architecture / Security / Bindingsのnon-authority、Specification §13のNode-API / WASM parityと整合する。Symbol / NEM、Mainnet / Testnet、Store、error、handoff、export、signingの意味をnpm化によって変更していない。旧raw WASM interfaceの非互換方針は、上流のCore security meaningやprotocol contractを変更せず、repository / build / distribution interfaceのcutoverとして明示されている。判定は適合。

### Downstream implementation handoff

Structural migrationに必要なtarget topology、責務境界、atomic stage、Core package identity、transitional WASM validationの目的、Stage 4 extraction、README順序、single facade、fallbackおよびsupply-chain boundaryは推測なしに下流へ引き渡せる。WASM validationの具体command、Node-API wrapper、Node version / target matrix、TypeScript shape、bundler baseline、runtime hash方式、SBOM / provenance方式は、それぞれ意図した下流gateへ委譲されている。判定は適合。

## Validation Results

- 実行: `git status --short --branch`。作業開始時のworking treeはcleanで、branchは`agent/monorepo-migration`だった。
- 実行: `git rev-parse --verify HEAD`、`git log -1 --format=...`。対象HEADは`c6a6819aef4a38af7b4855d2fe833cab17d2cdcc`であることを確認した。
- 実行: `git show --stat`および直前commitとの差分確認。今回のHEADでは主対象Designだけが変更され、上流資料、README、source、manifest、script、CI、test、fixtureは変更されていないことを確認した。
- 実行: 主対象、前回レビュー、指定されたConcept / Requirements / Design / Specification、現行manifest / script / CI / READMEのline-numbered reading。DR-001/002の対応、Stage 1 / 2 sequence、Stage 2 transitional WASM validation、Stage 4 extraction、README順、npm facade、fallback、supply-chainおよびtraceabilityを確認した。
- 実行: `git diff --check HEAD^ HEAD`。現行Design差分にwhitespace errorはないことを確認した。
- docs-only validation: レビュー成果物作成後に、相対リンクの対象ファイル存在、Markdownの章順、`git diff --check`、working tree / 変更ファイルを確認する。
- `cargo test`: **NOT APPLICABLE / SKIPPED (no relevant change)**。レビュー成果物のみのdocs変更であり、Rust source / manifest / test / fixtureを変更していない。
- `cargo clippy`: **NOT APPLICABLE / SKIPPED (no relevant change)**。
- WASM build / test: **NOT APPLICABLE / SKIPPED (no relevant change)**。
- Native C ABI runtime / header validation: **NOT APPLICABLE / SKIPPED (no relevant change)**。
- Node/npm build / test: **NOT APPLICABLE / SKIPPED (no relevant change)**。
- 未実行・未確認: external consumer inventoryの実査、Stage 2 / Stage 4の実build・runtime回帰、Node / Browser matrix、npm pack / clean install、SBOM / provenance generation、artifact integrity evidence、implementation parity。これらを本Design Reviewの成功結果として扱わない。

## Review Gates

| Gate | 判定 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | migrationの目的、target topology、旧raw WASM interfaceの意図的cutover、Node/npm implementation gateとrelease gateの分離、scope disciplineが明確。新しいWallet機能や独立Node.js Core implementationを追加していない | なし |
| 2. コンテキストと責任 | 合格 | Core、C ABI、WASM、Node-API、npm facade、Application / persistence、release CI、hostの責任とtrust boundaryが明確。Core security authorityの逆流なし | なし |
| 3. 依存方向 | 合格 | Stage 1はroot packageを維持し、Stage 2でCore relocation、root virtual workspace化、existing Native / fuzz path更新をatomicに完了する。root package先行廃止によるbroken dependency graphをstage boundaryにしない | なし |
| 4. 主要フロー | 合格 | workspace preparation、atomic relocation、Stage 2 / 4 WASM regression分離、C ABI relocation、README更新、Node/npm実装、releaseのsequenceとfailure / retry / restart責任が明確 | なし |
| 5. データ所有 | 合格 | CoreがMnemonic / Software Key / Store semantics / signing authorityを継続所有し、Binding / facadeはsecret cache、Store interpretation、current Store authorityを持たない | なし |
| 6. セキュリティと相互運用性 | 合格 | secret ownership、per-operation authorization、handoff / export / approval、Store opaque / replacement、Chain / Network、Core error / BindingFailure、native failure fail-closedおよびno remote artifactを維持 | なし |
| 7. 上流整合性 | 合格 | Concept → Requirements → Design → Specificationの同一Rust Core、Node-API scope、Binding non-authority、security invariant、Store / signing semanticsに重大な矛盾なし | なし |
| 8. 下流実装可能性 | 合格 | Stage boundaryごとのbuildable dependency graph、Core package identity、WASM transitional validationの目的、Stage 4 extraction、README順、npm / release gateへのhandoffが推測なしに追跡可能 | なし |

Criticalが残っていないため、Design Review SkillのGate policyに従いReview Resultは`READY`とする。OPEN-001 / 002 / 004 / 005 / 008およびOPEN-006 / 007は、それぞれ指定された後続gateの未決定事項であり、この判定を変更しない。OPEN-003もpackage renameを選択しない限りstructural migrationを阻害しない。

## Remaining Risks and Open Decisions

- **Structural migration**: 残存するDesign blockerはない。Stage 0の正式Design Review再承認とconsumer inventory等は、Stage 1開始前に実行・記録する運用上の完了条件であり、DR-001 / DR-002の未解決を意味しない。OPEN-003を未解決のままにする場合は既存package nameを維持するため、package rename以外のpath moveは阻害されない。
- **OPEN-003**: C ABI package rename / compatibility aliasの判断は未決定。既存package name `symbol-nem-wallet-core-native`を維持する選択肢が本文に残っているため、package renameを行わないpath moveは開始可能である。external consumer inventoryの実査結果は未確認。
- **Node/npm implementation gate**: OPEN-001、OPEN-002、OPEN-004、OPEN-005、OPEN-008はStage 6〜7の実装開始前に解消する。これらは`crates/core`、既存Native Binding、fuzz、`crates/wasm`のstructural migration開始を止めない。
- **Release gate**: OPEN-006、OPEN-007および全artifact / package / integrity / SBOM / provenance / protected release workflowの検証はpublish前に解消する。structural migrationやNode/npm実装の開始を止めない。
- **旧raw WASM consumer**: root feature、root `cdylib`、root `pkg/`、旧script / output contractを利用する外部consumerが存在する可能性はcompatibility riskとして残る。ただしDD-002でv1の互換contractとして維持しない判断は確定しており、未決定事項へ戻していない。Stage 4のmigration note / READMEでcutoverを明示する。
- **Stage 2 WASM validation**: 具体command、tool versionおよびtest harnessは実装時に決める。Design上は、非公開transitional pathでwasm32 build / checkとrelocation前後のWASM boundary behaviorを確認し、old root public interfaceを復活させない目的と完了条件が明確である。
- **Not validated**: actual build / runtime / packaging / supply-chain evidenceは未実行であり、今回のREADYはDesign Gateに限る。

## Automatic Changes

自動的な設計・要件・仕様・実装変更はなし。レビュー成果物のみを新規作成した。

## Final Decision

`READY`

**MONOREPO STRUCTURAL MIGRATION READY**

**Stage 1 workspace preparation を開始可能**。

DR-001 / DR-002はいずれも`Resolved`で、structural migrationを止めるCritical / Major / Minor findingはない。Stage 1ではroot Rust package、root `Cargo.toml`のpackage状態、`src/`、existing Native / fuzz pathを維持すること。Stage 2ではCore relocation、root virtual workspace化、Native / fuzz path更新および非公開transitional WASM regression validationを同一atomic stageとして扱うこと。Stage 4では旧root raw WASM interfaceを廃止し、`crates/wasm`をnpm facadeの内部sourceとして確立することを開始条件として引き継ぐ。

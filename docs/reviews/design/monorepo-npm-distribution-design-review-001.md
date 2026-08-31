# Monorepo / npm Distribution Design Review 001

## Review Target

- 対象: [`docs/migration/monorepo-npm-distribution-design.md`](../../migration/monorepo-npm-distribution-design.md)
- 確認日: 2026-09-01
- 対象 HEAD: `7f260d2bab650ff68c17f129ae63abe4e91d9067` (`agent/monorepo-migration`)
- 成果物: `docs/reviews/design/monorepo-npm-distribution-design-review-001.md`
- Review Scope: monorepo topology、Rust workspace、Core / Native C ABI / WASM / Node-API の責務と依存方向、npm single facade、conditional exports、native / WASM artifact 配布、versioning、migration gate / sequence、security / supply-chain boundary、Concept → Requirements → Design → Specification の整合。
- 整合確認対象: [`concept-sheet.md`](../../consept/concept-sheet.md)、[`requirements.md`](../../requirements/requirements.md)、[`architecture.md`](../../design/architecture.md)、[`security.md`](../../design/security.md)、[`bindings.md`](../../design/bindings.md)、[`specification.md`](../../specifications/specification.md)。
- 補助確認範囲: 現行の root `Cargo.toml`、`bindings/native/Cargo.toml`、`fuzz/Cargo.toml`、WASM build script、CI、README。これらは設計の normative source ではなく、migration の段階順序、既存 public path および互換性リスクの事実確認に限って参照した。
- 未確認範囲: Rust / Native C ABI / WASM / Node-API の実装適合性、build / test の実行結果、Node.js target matrix の実機確認、Browser bundler の実機確認、npm tarball の実生成、SBOM / provenance の生成実績、外部 consumer inventory の実査結果。

## Execution Audit

- 実行モード: サブエージェントを使用しない4つの独立した自己レビュー・パス。メインエージェントは Review Board Chair として候補の反証・統合、severity、Gate および成果物を担当した。
- Reviewer A（構造と責務）: 完了。最終 target tree、Rust / npm dependency direction、Core host-neutrality、Binding non-authority、npm facade の責務、artifact 境界および migration 中の暫定依存を確認した。Stage 1 の root virtual workspace 化と現行 path dependency の衝突を DR-001 として採用した。
- Reviewer B（Security primary）: 完了。Mnemonic、Software Key、Profile password、Store、signing authority、handoff / export / approval、Core / Binding / facade boundary、native / WASM 配布、fallback、package contents、provenance の責任を確認した。npm 化による security authority の逆流、secret ownership の変更または fallback による security error の隠蔽は確認されなかった。
- Reviewer C（フローと運用）: 完了。path move、package rename、WASM extraction、Node-API 追加、facade、CI、release の段階分離、既存 build / test path、fallback、failure、retry、restart、artifact assembly の責任を確認した。Stage 1 の完了条件を満たせない順序と、既存 raw WASM 利用経路の扱い未確定を確認した。
- Reviewer D（追跡と下流実装可能性）: 完了。Concept / Requirements / Design / Specification の Node.js scope、Binding responsibility、公開範囲、error、Store、Chain / Network、下流委譲および open decision の traceability を確認した。WASM feature 分離の既存互換性リスクが structural gate または open decision に接続されていない点を DR-002 として採用した。
- Phase 0（対象・根拠・境界）: 完了。主対象を migration design 1件、成果物を本書、Concept / Requirements / 既存 Design を主な根拠、Specification をユーザー指定の下流整合確認先、現行 manifest / script / README を互換性確認の補助資料として確定した。`AGENTS.md` に Design Phase Context の登録はあるが、登録された Context は使用せず正式資料を直接確認した。
- Phase 1（独立レビュー）: 完了。A〜D の担当観点から主対象本文と整合確認対象を独立に確認した。
- Phase 2（反証・統合）: 完了。候補を Design で決定すべき責務・境界・migration sequence・compatibility decision か、Node/npm implementation / release へ委譲できる詳細かで分類した。Node.js version、wrapper library、bundler、SBOM generator、runtime hash の未決定は structural blocker にしていない。
- Phase 3（ゲート・成果物）: 完了。本成果物作成後に共通章順、finding 必須項目、相対リンク、変更範囲および docs-only validation を確認する。

## Evidence Used

| 区分 | 資料 | 用途 |
| --- | --- | --- |
| 作業指針 | [`AGENTS.md`](../../../AGENTS.md)、[`design-review/SKILL.md`](../../../.agents/skills/design-review/SKILL.md)、[`review-playbook.md`](../../../.agents/skills/review-common/review-playbook.md)、`reviewers.md`、`security-checklist.md`、`review-gates.md`、`output-format.md` | Design Review の対象境界、A〜D の担当、Security finding の採用条件、Critical / Gate、成果物構成、docs-only validation および Git 変更範囲を確認 |
| 主対象 | [`monorepo-npm-distribution-design.md`](../../migration/monorepo-npm-distribution-design.md) §1〜§23 | target tree、責務、dependency graph、npm contract、routing、artifact、versioning、supply-chain、gate、sequence、open decision、readiness を独立評価 |
| Concept | [`concept-sheet.md`](../../consept/concept-sheet.md) §1、§3、§7〜§10、§12〜§13 | 全環境共通 Core ownership、Node.js の v1 対象、独立 Node.js / TypeScript Core 非採用、通常処理の非開示、host compromise 保証外を確認 |
| Requirements | [`requirements.md`](../../requirements/requirements.md) §1〜§2、UC-001 / UC-005 / UC-006 / UC-010 / UC-011、FR-001 / FR-007 / FR-009 / FR-019 / FR-022〜FR-024、NFR-001〜NFR-004、SEC-001〜SEC-023、AC-001、AC-007、AC-009、AC-015〜AC-050 | 同じ Rust Core、Binding non-authority、per-operation authorization、handoff / export / signing、Store、Chain / Network、failure safety、全環境 parity の根拠を確認 |
| Architecture | [`architecture.md`](../../design/architecture.md) §3〜§10 | Core / Application / Binding / storage の責務、依存方向、trust boundary、Store authority、lifecycle、failure、Specification への委譲を確認 |
| Security Design | [`security.md`](../../design/security.md) §3〜§10 | protected asset、secret ownership、authorization、signing authority、Store、pending、fallback、failure safety、host guarantee boundary、下流 security handoff を確認 |
| Bindings Design | [`bindings.md`](../../design/bindings.md) §3〜§10 | Native C ABI / Node-API / WASM の共通 non-authority、representation / ownership mediation、error、retry / restart、Chain / Network、下流委譲を確認 |
| Specification | [`specification.md`](../../specifications/specification.md) §1〜§2、§7〜§14、§15〜§18 | Node-API を同じ Core の thin binding とする契約、共通 error / parity、WASM / JavaScript boundary、現在の root WASM feature が仕様上の下流 binding へ接続されることを確認。§16 の package layout 非固定は、今回の Design が具体 topology を選択する余地として扱った |
| Current compatibility evidence | [`Cargo.toml`](../../../Cargo.toml)、[`bindings/native/Cargo.toml`](../../../bindings/native/Cargo.toml)、[`fuzz/Cargo.toml`](../../../fuzz/Cargo.toml)、[`build-wasm.sh`](../../../scripts/build-wasm.sh)、[`coverage.yml`](../../../.github/workflows/coverage.yml)、[`README.md`](../../../README.md) | 現行 root package、native / fuzz path dependency、`wasm` feature、root `cdylib`、WASM generation command / output、既存の利用者向け path を確認 |
| Official primary reference | [Node.js Modules: Packages](https://nodejs.org/api/packages.html)、[Node.js Command-line API](https://nodejs.org/api/cli.html) | `node-addons`、`default`、condition order、`--no-addons` の設計事実を確認。Node.js docs は設計の security authority または本プロジェクトの要求の代替にはしていない |

## Review Result

`REVISE DESIGN`

Critical は2件で、いずれも monorepo structural migration の安全な開始条件に直接影響する。最終 target tree、責務分離、npm single facade、conditional exports、versioning および supply-chain boundary そのものは概ね成立しているが、現在の12段階 sequence は最初の workspace 切替時点で既存 path dependency を壊し、WASM extraction は既存に公開・文書化された root `wasm` feature / raw WASM 経路の互換方針を未決定のまま進め得る。

## Summary

主対象の設計は、次の観点では上流資料と整合する。

- `crates/core` を host-neutral Rust Core とし、`crates/c-abi`、`crates/wasm`、`crates/node` が Core だけへ依存する方向は、Architecture / Security / Bindings の `Application → Binding → Core` と整合する。
- Native C ABI は low-level native integration boundary、Node-API は C ABI の JavaScript FFI 再利用ではない Node.js addon boundary、WASM は Browser / Browser Extension / universal fallback、npm facade は public TypeScript contract と routing の mediation に分離されている。
- `@nemnesia/symbol-nem-wallet-core` を唯一の consumer-facing package とし、root entry point だけを公開し、raw `.node`、generated wasm-bindgen module、C ABI struct、backend-specific type を public contract にしない方針は、既存の共通 Binding contract と整合する。
- `node-addons` → native、`default` → WASM、`--no-addons` / unsupported target の限定 fallback、supported artifact の load / initialization / operation failure を WASM retry で隠さない方針は、Node.js の条件解決モデルと Core error / Binding failure の区別に整合する。
- native `.node` と WASM glue / binary を npm tarball に同梱し、install 時の remote download、postinstall compile、runtime remote code を要求しない方針は、秘密情報を扱う facade の supply-chain boundary として妥当である。SBOM generator、artifact signing、provenance retention の具体方式は release gate へ委譲されており、structural migration の前提にはしていない。
- Core、C ABI、WASM、Node-API、npm facade の v1 lock-step versioning は、parity、security fix の適用時点および artifact traceability を明確にする。独立 versioning を必要とする根拠は現行資料から確認できない。

ただし、次の2点は構造移行を開始する前に設計を修正しなければならない。

- **DR-001**: Stage 1 で root manifest を virtual workspace にすると、まだ root package を参照する現行 native / fuzz path dependency と root `src/` が同一段階で成立しない。Stage 1 の完了 gate（既存 Core / Native / fuzz build / test 維持）を満たせない。
- **DR-002**: Stage 4 が削除する root `wasm` feature、root `cdylib` を使う現行 WASM build、`pkg/` 出力および README の raw WASM 利用経路について、互換維持・移行期間・意図的 breaking change のいずれを採用するかが structural gate / Open Decision に登録されていない。本文自身がこのリスクを記載しているため、未決定事項を見落としたまま readiness を `開始可能` と宣言している。

従って、現時点の判定は `REVISE DESIGN` であり、**monorepo structural migration はまだ開始不可**である。Node/npm implementation の OPEN-001、OPEN-002、OPEN-004、OPEN-005、OPEN-008、および release の OPEN-006、OPEN-007 は、今回の2件とは別に、それぞれの gate で解消すべき未決定事項である。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| DR-001 | Critical | New | 本レビュー | Stage 1 の root virtual workspace 化が、現行 `bindings/native` / `fuzz` の root path dependency と root Core source の移動前状態に先行する。Stage 1 の完了 gate と同時に成立しない |
| DR-002 | Critical | New | 本レビュー | Stage 4 の WASM feature / root artifact 分離が、現行 README と build script で利用可能な raw WASM 経路を変更するが、互換方針・移行 gate・決定 ID がない |

集計: `Critical 2 / Major 0 / Minor 0`。

## Required Changes

### DR-001 — root virtual workspace 切替と既存 path dependency の段階順序

- Severity / Status: `Critical / New`
- 対象箇所: [`monorepo-npm-distribution-design.md:266-287`](../../migration/monorepo-npm-distribution-design.md#L266)、[`monorepo-npm-distribution-design.md:699-716`](../../migration/monorepo-npm-distribution-design.md#L699)。補助事実は [`Cargo.toml:1-10`](../../../Cargo.toml#L1)、[`bindings/native/Cargo.toml:1-16`](../../../bindings/native/Cargo.toml#L1)、[`fuzz/Cargo.toml:13-23`](../../../fuzz/Cargo.toml#L13)。
- 確認できた事実: 最終構成は root を virtual workspace とし、Core を `crates/core`、C ABI を `crates/c-abi` へ移す。現行 root は `symbol-nem-wallet-core` package と `src/` を所有し、native crate は `path = "../.."`、fuzz workspace は `path = ".."` で root package を参照する。一方、sequence は Stage 1 で root Cargo virtual workspace を準備し、Core、C ABI、fuzz path の移動・更新を Stage 2〜5 に分けている。
- 発生条件: Stage 1 の変更で root `Cargo.toml` から `[package]` を除いて virtual workspace 化し、Stage 2 の Core 移動、Stage 3 の native 移動、Stage 5 の fuzz path 更新をまだ実施していない場合。
- 問題: root `src/` は package として build 対象でなくなり、`bindings/native` の `../..` と `fuzz` の `..` は package ではない virtual manifest を参照する。従って Stage 1 の完了 gate が要求する既存 Core / Native / fuzz build / test の維持と、各段階を独立した検証で完了させる方針が両立しない。後段で facade、Node-API または release CI が隠せる問題ではない。
- 影響: path dependency の解決失敗、Core package の一時的消失、fuzz 検証の停止が起こり得る。Stage 1 に未記載の compatibility shim、先行 path 更新または複数 package の一括移動を実装者が推測する必要があり、既存 Core / C ABI / fuzz の behavior-preserving migration という前提を破る。
- 必要な最小修正または確認: root package を維持したまま準備する段階と、root virtual workspace 化を実施する段階を設計上分離するか、virtual 化と同じ差分で root Core / native / fuzz の全 path dependency を解消する明示的な transitional step を sequence と完了 gate に追加する。具体的な shim や一括移動方式は本レビューで選択しない。いずれの場合も、root が package でなくなる時点で `bindings/native` と `fuzz` が有効な Core package を参照することを明示する。
- 完了条件または再確認方法: 現行 HEAD から Stage 1 の差分だけを適用した状態、または設計で定めた transitional state について、root Core / Native / fuzz の manifest 解決先が一意に示され、Stage 1 の既存 build / test gate を満たす path と、Stage 2〜5 の最終 path への更新順が文書から推測なしに追跡できること。修正後に本 finding を再レビューする。
- Gate impact: Gate 3（依存方向）、Gate 4（主要フロー・段階 sequence）、Gate 8（下流実装可能性）。構造移行開始条件に直接影響するため `Critical` とする。

### DR-002 — 既存 root WASM public path の互換方針が structural gate に接続されていない

- Severity / Status: `Critical / New`
- 対象箇所: [`monorepo-npm-distribution-design.md:307-315`](../../migration/monorepo-npm-distribution-design.md#L307)、[`monorepo-npm-distribution-design.md:711-716`](../../migration/monorepo-npm-distribution-design.md#L711)、[`monorepo-npm-distribution-design.md:732-739`](../../migration/monorepo-npm-distribution-design.md#L732)、[`monorepo-npm-distribution-design.md:749-770`](../../migration/monorepo-npm-distribution-design.md#L749)。補助事実は [`Cargo.toml:8-32`](../../../Cargo.toml#L8)、[`build-wasm.sh:18-35`](../../../scripts/build-wasm.sh#L18)、[`README.md:311-357`](../../../README.md#L311)。
- 確認できた事実: 現行 root package は `wasm` feature と `cdylib` を提供し、`scripts/build-wasm.sh` は root package を `--features wasm` で build して `pkg/` に `wasm-bindgen` web glue と `.wasm` を生成する。README は利用者向けに `wasm` feature、`pkg/`、生成 module および初期化手順を説明している。target sequence は Stage 4 で `src/wasm.rs`、WASM feature、`wasm-bindgen` / `js-sys` を `crates/wasm` へ抽出し、Core から WASM-specific dependency を除く。
- 発生条件: Stage 4 の extraction を、現行 root feature / script / generated output を利用する consumer の互換範囲と、移行期間の path / package policy を決めずに実施する場合。
- 問題: 本書は同じ表の Compatibility risks で root `--features wasm` consumer、raw generated package、script が壊れる可能性を認識し、「facade contract と raw binding の互換範囲を明示し、移行期間の compatibility path を別判断する」と記録している。しかしその別判断が Open Decision、structural migration gate、Stage 4 completion gate、version / deprecation policy のいずれにも接続されていない。本文の「既存 Rust / C ABI / WASM public contract を維持する」開始条件と、「monorepo structural migration は開始可能」という readiness 宣言も、この未確定範囲を解消していない。
- 影響: raw WASM consumer が root package の feature / command / generated output を前提としている場合、facade が完成する前の Stage 4 で利用経路が破壊され得る。これは Node/npm implementation 前の TypeScript API shape ではなく、既存 WASM Binding の public path と behavior-preserving structural migration の判断である。実装者は、旧 path を維持するのか、互換 alias / 移行期間を設けるのか、または意図的 breaking change として version / README / consumer notice を要求するのかを推測しなければならない。
- 必要な最小修正または確認: 現行 root WASM feature、root `cdylib`、`scripts/build-wasm.sh`、`pkg/` generated output および README の利用経路を structural migration gate の consumer inventory に含め、Stage 4 前に互換維持・移行期間・意図的 breaking change のいずれかを明示的に承認する。選択した方針を Stage 4 の completion gate、既存 WASM / raw binding の public contract、README / deprecation の更新順へ接続する。具体的な alias、package name または compatibility implementation は本レビューで選択しない。
- 完了条件または再確認方法: root `wasm` feature / raw generated output の supported / unsupported 範囲、既存 consumer への影響、Stage 4 で許可される path / package change、移行期間または breaking change の version / documentation policy が、Open Decision と structural gate から一意に追跡できること。Stage 4 の開始前に、既存 WASM binding の公開利用経路と target `crates/wasm` の対応を再レビューする。
- Gate impact: Gate 1（範囲・前提）、Gate 4（段階 sequence）、Gate 7（上流・既存契約整合）、Gate 8（下流実装可能性）。既存 public path の扱いが決まらないまま structural extraction を開始できないため `Critical` とする。

## Optional Improvements

なし。Major / Minor の新規指摘はない。Node/npm implementation および release に残る未決定事項は、それぞれの後続 gate へ委譲する事項であり、今回の Optional Improvement として重複計上していない。

## Resolved Findings

なし。主対象ベースの既存レビュー成果物はなく、追跡すべき過去 finding はない。

## Upstream Feedback

なし。Node.js は Concept と Requirements で v1 supported environment として扱われ、独立した Node.js / TypeScript Wallet Core implementation は対象外である。Architecture、Security Design、Bindings Design および Specification も、Node-API が同じ Rust Wallet Core を利用する thin / non-authoritative binding であること、既存 security meaning と error / ownership / failure semantics を変更しないことを明示している。今回の2件は上流資料の欠落ではなく、migration design の段階順序と既存下流 public path の gate 接続不足である。

## Deferred Findings

- **Node/npm implementation gate**: OPEN-001（Node.js / Node-API / ESM / CJS compatibility floor）、OPEN-002（native target matrix）、OPEN-004（Node-API wrapper library と JS / TypeScript shape）、OPEN-005（tarball size と optional artifact package の条件）、OPEN-008（Browser bundler / Extension integration baseline）は、本文どおり `crates/node` / npm facade の実装前に解決する。これらを structural migration の blocker にはしない。
- **Release gate**: OPEN-006（runtime native artifact hash verification）と OPEN-007（SBOM format / generator、artifact signing、provenance retention、release permissions）は、publish 前の release candidate / artifact / package 検証へ委譲する。structural migration または Node/npm implementation の開始条件にはしない。
- **C ABI package name**: OPEN-003 は `symbol-nem-wallet-core-native` の外部利用と `-c-abi` rename / compatibility alias の判断である。未解決時に既存 package name を維持して path move を行えるという本文の条件は成立するが、実際の external consumer inventory と package rename は Stage 0〜3 の gate で確認する。
- **Node/npm の具体 API**: `WalletCore` は本書の概念名に留まり、class、constructor、factory、method、async shape、DTO field、error representation は本書で確定していない。Specification / Node/npm implementation gate で決定する事項を、本レビューで public API として確定しない。
- **Runtime / release evidence**: target matrix、artifact digest、SBOM、provenance、npm pack、clean install、Browser smoke、Native runtime、Node-API parity の実行実績は未確認である。Implementation / release readiness の後続検証で確認する。

## Scope and Traceability

| 対象設計領域 | 上流・下流との追跡 | 判定 |
| --- | --- | --- |
| Core host-neutrality / dependency direction | Concept §7〜§9、Requirements §2.2、NFR-001〜NFR-004 → Architecture §4.5、Security §4、Bindings §4 → migration design §6〜§8 | 最終 topology は適合。DR-001 は最終方向ではなく移行途中の manifest 解決順序の欠陥 |
| Native C ABI / Node-API / WASM responsibility | Requirements FR-019、NFR-001〜NFR-004、AC-015〜AC-024、AC-040、AC-043 → Architecture §4、Security §4、Bindings §3〜§8、Specification §13 → migration design §6、§12 | 適合。3 Binding は同じ Core を利用し、Node-API は C ABI FFI 再利用をしない |
| npm single facade / public contract | Requirements NFR-003〜NFR-004、SEC-010〜SEC-020 → Architecture / Security / Bindings の non-authority → Specification §1、§9、§13 → migration design §9〜§12 | 適合。root entry、共通 declaration、backend-specific type 非公開、secret cache 非保持を確認 |
| Conditional exports / fallback | Specification §13.2〜§13.3、Requirements AC-024、AC-040、AC-043 → migration design §9、§11、§18 | 適合。`node-addons` / `default`、`--no-addons`、unsupported target fallback と native failure fail-closed を分離している。具体的 Node / bundler matrix は下流へ委譲 |
| Native / WASM artifact distribution | Requirements SEC-015、SEC-020、NFR-004 → Security / Bindings guarantee boundary → migration design §13〜§18 | 設計方針は適合。同梱、no remote download、no postinstall compile、C ABI 分離、allowlist、digest、SBOM / provenance gate を確認 |
| Versioning | Requirements NFR-001〜NFR-004、AC-015〜AC-024、Specification §13〜§14 → migration design §15〜§17 | 適合。v1 lock-step が parity / security fix / traceability の目的に合致する |
| Existing WASM public path | 現行 [`Cargo.toml`](../../../Cargo.toml)、[`build-wasm.sh`](../../../scripts/build-wasm.sh)、[`README.md`](../../../README.md) → migration design §20 risk | **不適合 / DR-002**。既存 root feature、cdylib、script、pkg path の扱いが gate / Open Decision へ未接続 |
| Structural sequence | 現行 root package、native path、fuzz path → migration design §8、§19 | **不適合 / DR-001**。Stage 1 の virtual 化が Stage 2〜5 の参照更新に先行している |
| Store / secret / authorization / Chain / Network invariants | Requirements SEC-001〜SEC-023、AC-001〜AC-050 → Architecture §3〜§9、Security §3〜§10、Bindings §3〜§9、Specification §1〜§14 → migration design §5〜§7、§10〜§12、§17〜§18 | 適合。Core ownership、per-operation authorization、handoff / export / signing、Store opaque / replacement、existing state safety、BindingFailure / Core error、Chain / Network separation を弱めていない |

## Domain Checks

### System context / responsibility

`Application / UI → Binding → Core`、`Application / persistence → opaque Store → Core`、`Core → replacement Store → Application` の context は明確である。npm facade は routing / representation / package assembly に限定され、Core security authority が逆流していない。Node native を WASM より強い secret isolation boundary としない点も整合する。判定は適合。

### Dependency direction / topology

最終 graph は `c-abi → core`、`wasm → core`、`node → core`、`wallet-core → node / wasm artifact` であり、禁止依存を列挙している。`core → binding / npm`、`node → c-abi`、`wasm → node` は禁止され、最終責務分離は適合する。ただし、移行 sequence の Stage 1 は現行 path dependency を壊すため DR-001 とした。

### Security domain

適用した protected asset は Mnemonic、Software Key private key、derived / decrypted secret、Profile password、Wallet Store、signing authority および pending / replacement である。trust boundary は Core、Native C ABI、Node-API、WASM、npm facade、Application / UI、persistent storage、Browser / OS / Node.js host process とした。

Core が継続 secret owner、Binding / facade が non-authority、password が processing-unit authorization、handoff / export / signing approval が Application responsibility、Store が opaque、current Store authority が Application / persistence、failure が fail-closed、Chain / Network が Core-owned であることを確認した。npm routing は security meaning を変更せず、supported native load failure を WASM retry で隠さない。host compromise を保証外としながら Core / Binding の non-disclosure / failure safety を弱めない。Security finding はなし。

### Lifecycle / failure / operation

handoff、export、signing、mutation、replacement、retry、restart および native / WASM initialization failure の責任は区別されている。`BindingFailure` と Core operation error の区別、unsupported target fallback と supported artifact failure の区別、Core error を empty success や warning-only へ変換しない方針も明確である。移行 lifecycle については Stage 1 の path resolution と Stage 4 の既存 WASM public path が未確定であり、DR-001 / DR-002 に対応する。

### Interoperability / upstream consistency

Concept の Node.js scope、Requirements の Node-API 同一 Core、Architecture / Security / Bindings の non-authority、Specification §13 の Node-API / WASM parity は migration design と整合する。Symbol / NEM、Mainnet / Testnet、Store、error、handoff、export、signing の意味を npm 化によって変更していない。Specification §16 が package layout を固定しないことは、後続 Design が concrete topology を選択することと矛盾しない。上流 feedback はなし。

### Downstream implementation handoff

Node/npm implementation 前に OPEN-001、002、004、005、008 を解消し、release 前に OPEN-006、007 を解消する gate 分離は適切である。TypeScript API shape、wrapper library、browser bundler、SBOM generator を本レビューで確定していない点も適切である。一方、structural migration 前に必要な root manifest transitional state と既存 raw WASM path policy の handoff が不足しているため、現状は下流実装へ安全に引き渡せない。

## Validation Results

- 実行: `git status --short --branch`、`git rev-parse HEAD`、`git log -1 --oneline --decorate`。作業開始時の working tree は clean、対象 HEAD は `7f260d2bab650ff68c17f129ae63abe4e91d9067`、branch は `agent/monorepo-migration` であることを確認した。
- 実行: `git log --follow --oneline -- docs/migration/monorepo-npm-distribution-design.md`、`rg --files docs/reviews/design`。主対象の既存 review artifact はなく、新規成果物名を `monorepo-npm-distribution-design-review-001.md` と確定した。既存 review は上書きしていない。
- 実行: 対象文書、整合確認対象、補助 manifest / script / CI / README の line-numbered reading。target tree、gate、sequence、public path、upstream traceability を確認した。
- 実行: Node.js 公式 documentation の確認。`node-addons`、`default`、key order、`--no-addons` の記載を確認し、conditional exports の設計事実と一致することを確認した。
- 実行: 文書差分・相対リンク・Markdown 構造の review は成果物作成後に実施する。
- `cargo test`: **NOT APPLICABLE / SKIPPED (no relevant change)**。今回の変更は docs review artifact のみで、Rust source / manifest / test / fixture を変更していない。
- `cargo clippy`: **NOT APPLICABLE / SKIPPED (no relevant change)**。
- WASM build / test: **NOT APPLICABLE / SKIPPED (no relevant change)**。
- Native C ABI runtime / header validation: **NOT APPLICABLE / SKIPPED (no relevant change)**。
- Node/npm build / test: **NOT APPLICABLE / SKIPPED (no relevant change)**。
- 実行していない範囲: external consumer inventory の実査、package tarball / artifact の実生成、Node / Browser matrix、SBOM / provenance generation、implementation parity。これらは本レビューの文書整合性・設計 Gate の実行結果として成功扱いしない。

## Review Gates

| Gate | 判定 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 1. 目的と範囲 | 合格 | migration の目的、対象、対象外、Node/npm implementation と release の gate 分離、scope discipline が明確。新しい Wallet 機能や独立 Node.js Core implementation を追加していない | なし |
| 2. コンテキストと責任 | 合格 | Core、3 Binding、npm facade、Application / persistence、release CI、host の責任と trust boundary が明確。Core security authority の逆流なし | なし |
| 3. 依存方向 | 不合格 | 最終 dependency graph は適合するが、Stage 1 の virtual root が現行 native / fuzz path dependency と成立しない | DR-001 |
| 4. 主要フロー | 不合格 | migration sequence の最初の workspace 切替が既存検証を維持できず、WASM extraction の既存 public path policy も未接続 | DR-001、DR-002 |
| 5. データ所有 | 合格 | Core が Mnemonic / Software Key / Store semantics / signing authority を継続所有し、facade / Binding は cache / authority を持たない | なし |
| 6. セキュリティと相互運用性 | 合格 | secret ownership、per-operation authorization、handoff / export / approval、Store opaque / replacement、Chain / Network、Core error / BindingFailure、native failure fail-closed を維持 | なし |
| 7. 上流整合性 | 合格 | Concept → Requirements → Design → Specification と Node.js / Binding / security invariant の traceability に重大な矛盾なし | なし |
| 8. 下流実装可能性 | 不合格 | Stage 1 transitional manifest state と Stage 4 existing WASM public path policy が実装者の推測に残る | DR-001、DR-002 |

Critical が2件存在するため、Design Review Skill の Gate policy に従い Review Result は `REVISE DESIGN` とする。

## Remaining Risks and Open Decisions

- 構造移行開始前の blocker: **DR-001** の transitional workspace / path dependency sequence、**DR-002** の既存 root WASM public path compatibility policy。これらを修正・承認するまで structural migration gate は未承認である。
- `OPEN-003` は C ABI package name / compatibility alias の判断であり、既存名維持を選ぶ場合は path move 自体を止めない。ただし external consumer inventory は Stage 0〜3 の開始条件として実施・記録が必要である。
- Node/npm implementation 前の blocker: `OPEN-001`、`OPEN-002`、`OPEN-004`、`OPEN-005`、`OPEN-008`。これらは DR-001 / DR-002 を解消した後、`crates/node` と npm facade の実装開始前に解消する。Node/npm implementation 前に Node.js version matrix、wrapper library、browser bundler、SBOM generator を先に structural migration の条件にする必要はない。
- Release 前の blocker: `OPEN-006`、`OPEN-007`、全 target artifact / package contents / integrity / SBOM / provenance / protected release workflow の検証。これらは structural migration や Node/npm implementation の開始を止める blocker ではない。
- 残存 security risk: host compromise、Browser / OS / Node.js process の memory isolation、third-party crypto library / compiler / runtime の完全な side-channel absence は既存資料どおり Core guarantee 外。ただしこの制限は Core / Binding の non-disclosure、authorization、failure safety を弱めない。

## Automatic Changes

なし。レビュー成果物のみを新規作成し、主対象、Concept、Requirements、Design、Specification、source、manifest、CI、README、test、fixture は変更していない。

## Final Decision

`REVISE DESIGN`

Critical finding の DR-001 と DR-002 が structural migration gate を不合格にする。従って、**monorepo structural migration は現時点では開始不可**である。

最終 topology、Core / C ABI / WASM / Node-API responsibility、npm single-facade、conditional exports / fallback、lock-step versioning および no-remote-artifact supply-chain 方針は、今回確認した範囲では成立している。上記2件を設計・gate・sequenceへ反映して再レビューに合格した後に、Stage 1 を開始できる。Node/npm implementation と release は、本文の各 gate（それぞれ OPEN-001 / 002 / 004 / 005 / 008、OPEN-006 / 007）を満たすまで開始しない。

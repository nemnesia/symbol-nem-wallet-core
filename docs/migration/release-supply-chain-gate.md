# Release / supply-chain security decision gate

## 1. Scope

本書は、`agent/monorepo-migration` の Stage 10（release / supply-chain security の
docs / decision gate only）として、release / supply-chain security policy の decision を整理するものである。
Stage 9 の release candidate が成立した後、npm package、C ABI artifact、canonical WASM、
source commit、version、build evidence および release operation をどのように結び付けるかを
定める。

本書は、Stage 10 で確定した decision を後続 implementation へ引き渡すための記録である。
後続 implementation は Stage 10 の範囲外であり、本書の更新だけでは publish、GitHub Release、
Trusted Publishing、SBOM生成、provenance生成、runtime digest verification または release
workflow の実装を開始しない。今回確定した decision は、実装上の事実ではなく、後続の
implementation / operation が従う policy として記録する。

対象は次の公開物と release evidence である。

- `@nemnesia/symbol-nem-wallet-core` npm package と、その単一 tarball に同梱される
  native artifact / canonical WASM
- C ABI の GitHub Release artifact（binary、public header および関連 evidence）
- Rust / npm dependency と license inventory
- source commit、git tag、version、build evidence、release artifact、provenance および
  SBOM
- Node native runtime の package-local integrity boundary

対象外は Core の暗号、Store、authorization、署名、protocol behavior、public API、既存の
Stage 9 implementation および Stage 9 CI の変更である。

## 2. Existing confirmed constraints

次の事項は既存の承認済み設計・仕様および今回の依頼によって確定しており、本 gate で変更しない。

- `symbol-nem-wallet-core` / Rust Core が唯一の security authority である。Core が暗号、
  password authorization、Store validity、key derivation、signing、Chain / Network
  policy、
  failure semantics を所有する。
- Native C ABI、Node-API Binding、WASM Binding、npm facade および release CI は
  non-authoritative boundary であり、Core の security semantics を再実装・上書きしない。
- `postinstall`、install-time native compilation、install-time binary / WASM
  download、
  consumer 環境での Cargo 実行および remote code / artifact download は禁止する。
- supported native target で manifest entry が存在する場合、artifact の corruption、
  missing、unreadable、load failure または initialization failure は fail closed とする。
  それを WASM fallback に変換しない。
- WASM fallback を許可するのは unsupported target と `--no-addons` の場合だけである。
- npm facade の public API は既存の exact 16 functions とし、backend API、raw native /
  WASM backend、generated module、C ABI は public package subpath または npm public
  API にしない。
- C ABI は npm public API ではない。C ABI の library と Node-API の `.node` native
  artifact を同一視しない。
- canonical WASM は package assembly の入力となる一つの Core WASM artifact である。Node、
  Browser、ESM、CJS ごとに Core semantics の異なる WASM を生成しない。
- npm package は package-local artifact と declared dependency だけで成立し、実行時ネットワーク
  依存を持たない。
- release build は clean checkout、locked dependency、同じ release commit、同じ version
  policy および固定された build evidence に基づいて行う。
- release evidence、manifest、SBOM、provenance、license inventory、ログおよび公開文書に
  Mnemonic、private key、Profile password、seed、復号済み payload または秘密 Store 内容を含めない。

これらは release operation の convenience や npm の機能によって緩和しない。公開方式や
artifact signing を追加しても、Core の authority boundary は変更しない。

## 3. Stage 9 evidence

以下は開始HEAD `b880c5439faf84a0ffd03eba1dd10211ef9f646d` に対して、依頼時点で確認済みとして
引き継ぐ Stage 9 evidence である。本 gate では docs-only validation のため Stage 9 の
full matrix を再実行しない。実装・CIの結果を本作業で再検証したものではない。

| evidence | status |
| --- | --- |
| Stage 9 release candidate gates | PASS |
| 全18 jobs | PASS |
| Dependency Review | PASS |
| Rust dependency audit | PASS |
| Rust quality | PASS |
| Core / C ABI | PASS |
| Stage 8 parity regression | PASS |
| 4 native artifacts | PASS |
| canonical WASM | PASS |
| final npm package assembly | PASS |
| npm pack / clean install | PASS |
| Windows / macOS / Linux Node 22 / 24 consumer | 8/8 PASS |
| Vite / webpack 5 / esbuild | PASS |
| Google Chrome actual browser runtime | PASS |
| Chromium actual MV3 unpacked extension | PASS |
| Linux x64 minimum glibc | 2.28 |
| feature branch Stage 9 重複 push run | 解消済み |

Stage 9 workflow は build、artifact evidence、final assembly、npm pack、clean
install、
consumer smoke および bundler / browser integration を対象とする。npm registry への publish、
GitHub Release 作成、Trusted Publishing、SBOM、provenance、protected environment および
runtime SHA-256 verification は Stage 9 evidence に含めない。これらは Stage 10 で decision
を確定した後、承認済み decision を入力として実施する post-Stage-10 / later implementation
の対象であり、Stage 10 自体は decision boundary のみとする。

主な確認資料は [`node.yml`](../../.github/workflows/node.yml)、
[`monorepo-npm-distribution-design.md`](monorepo-npm-distribution-design.md)、
[`node-npm-implementation-gate.md`](node-npm-implementation-gate.md) および
[`npm-typescript-facade.md`](../specifications/npm-typescript-facade.md) である。

## 4. Decision table

`RECOMMENDED` は security / operability 上の採用方針を示す既存の status であり、今回の8件は
ユーザー承認済みである。ユーザー承認の対象外である採用推奨も同じ status で表し、承認済みの
decision は各詳細節で明記する。`DEFERRED` は Stage 10 の decision gate 後、承認済み decision
を入力とする後続 implementation / operation で決める詳細である。

| # | decision | status |
| --- | --- | --- |
| 1 | npm publishing mechanism | `RECOMMENDED` |
| 2 | npm provenance | `RECOMMENDED` |
| 3 | SBOM format | `RECOMMENDED` |
| 4a | dependency / license inventory | `RECOMMENDED` |
| 4b | unknown / unapproved license policy | `RECOMMENDED` |
| 5 | artifact digest policy | `RECOMMENDED` |
| 6 | Node native runtime integrity | `RECOMMENDED` |
| 7 | WASM integrity boundary | `RECOMMENDED` |
| 8a | SemVer / version equality | `RECOMMENDED` |
| 8b | git tag / duplicate / clean commit policy | `RECOMMENDED` |
| 9 | protected release environment | `RECOMMENDED` |
| 10 | C ABI GitHub Release | `RECOMMENDED` |
| 11 | reproducibility | `RECOMMENDED` |
| 12 | release evidence retention | `RECOMMENDED` |
| 13 | artifact signing | `RECOMMENDED` |

## 5. Detailed decisions

### 5.1 npm publishing mechanism

**Status: `RECOMMENDED`（ユーザー承認済み）**

primary mechanism は npm Trusted Publishing / OIDC とする。release workflow の
identity
と npm 側の trust configuration を結び、release job に長期有効な npm token を保存しない。
これにより、secret の漏えい・rotation・scope管理を release workflow から減らせる。

通常 release では長期 npm automation token を使用しない。manual / break-glass publish は通常経路
とせず、exact emergency procedure は後続 implementation / operation detail とする。実装時まで
npm publish や npm 側の設定を変更しない。

### 5.2 npm provenance

**Status: `RECOMMENDED`**

通常の release path では `npm publish --provenance` を使用し、provenance が生成できない、
検証できない、または対象の source commit / tag / workflow identity と結び付かない場合は
publish を中止する。provenance は source、build instruction、publisher および workflow
identity の追跡 evidence として扱い、「コードが悪意のないものである」ことの証明とは扱わない。

最低限、次の対応関係を release manifest から追跡可能にする。

```text
git tag -> release commit -> source evidence -> package -> npm provenance
```

provenance が利用できない publish path を暗黙の fallback にしない。provenance は、5.1 の npm
publishing mechanism と 5.13 の artifact signing decision に従う release evidence として
有効化する。provenance の生成・検証 workflow は後続 implementation で扱う。

### 5.3 SBOM format

**Status: `RECOMMENDED`（ユーザー承認済み）**

v1 release の canonical SBOM format は SPDX JSON とする。CycloneDX JSON は v1 の canonical
artifact として追加しない。canonical format の generator、exact version および workflow は
後続 implementation で固定する。

選択した format には、Rust の direct / transitive dependency、npm の direct / transitive
dependency、version、source / lockfile identity、license expression および release
artifact との対応を含める。ただし SBOM は Core の runtime security authority ではない。

### 5.4 Dependency / license inventory

**Dependency inventory — Status: `RECOMMENDED`**

Rust と npm を別 ecosystem として扱い、次を release 単位で収録する。

- Rust direct dependency と transitive dependency、Cargo.lock identity
- npm direct dependency と transitive dependency、package lock identity
- package / crate version、依存関係の関係、release source commit
- license expression、unknown license、複数 license または license exception の状態

Cargo の license metadata と npm package metadata を無条件に同じ意味とみなさない。依存関係
の一覧は package tarball と C ABI release asset のどちらに含まれるか、または evidence として
別保存するかを明示する。

**Unknown / unapproved license policy — Status: `RECOMMENDED`（ユーザー承認済み）**

unknown、解析不能または project allowlist にない license が存在する場合は release を fail
closed とし、明示的にレビュー・承認されるまで release しない。allowlist、例外の有効範囲、
承認記録および具体的な workflow は後続 implementation / operation detail とする。

### 5.5 Artifact digest policy

**Status: `RECOMMENDED`**

digest は同じ SHA-256 というアルゴリズムを使用しても、異なる assurance class を一つの値へ
統合しない。

| digest class | 対象 | 用途 |
| --- | --- | --- |
| build evidence | source / lockfile / toolchain | build input の追跡 |
| release artifact | npm / native / WASM / C ABI | 公開 bytes の固定 |
| runtime integrity | supported native artifact | load 前の改変検知 |

build evidence digest と release artifact digest は release CI / inventory の
evidence であり、Core security authority ではない。runtime integrity digest は
Binding / loader の fail-closed boundary であり、Core の crypto / authorization
authority ではない。

build evidence digest を release artifact digest の代用にしない。release tarball の
digest を
runtime artifact digest の代用にしない。runtime integrity digest を導入した場合も、manifest
自体の version / schema / path / target 整合を別途確認する。

### 5.6 Node native runtime integrity

**Status: `RECOMMENDED`**

supported target に manifest entry がある場合、Node native loader は次の順序で package-local
artifact を確認する。

```text
manifest entry
  -> expected relative path / target metadata
  -> artifact existence and readable bytes
  -> SHA-256 match
  -> native load
  -> addon initialization
  -> public operation availability
```

entry の missing、path mismatch、artifact missing、SHA-256 mismatch、load failure または
initialization failure は fail closed とする。これらを `WASM fallback`、operation error、
silent retry または remote download に変換しない。manifest entry が存在しない unsupported
target または明示された `--no-addons` だけが WASM fallback の条件である。

この integrity check は package / loader boundary の control であり、Core が security
authority であるという不変条件を変更しない。runtime verification の exact implementation、
error mapping、performance budget および negative test は、Stage 10 で承認された decision を
入力とする後続 implementation で固定する。

### 5.7 WASM integrity boundary

**Status: `RECOMMENDED`**

WASM を次の二つに分けて扱う。

1. **npm tarball 内 canonical WASM**: release commit から assembly された
   package-local
   artifact。後続 implementation で作成する release manifest、artifact digest、SBOM /
   inventory および npm provenance の対象とする。
2. **bundler emitted asset**: Vite、webpack 5、esbuild、Browser または MV3
   application の
   build 後に生成・配置される application-owned asset。application build の output として
   扱い、Core package の canonical artifact を再定義する authority にしない。

bundler が asset を hash、rename、chunk または copy することは、npm tarball 内 canonical
   WASM の source identity を変更しない。application 側の asset integrity は application の
   release responsibility であり、本 gate で Core へ custom PKI、update server、remote
   artifact service または runtime network dependency を追加しない。

### 5.8 Git tag / version policy

**SemVer / version equality — Status: `RECOMMENDED`（ユーザー承認済み）**

Core、C ABI、WASM、Node-API および npm facade の release version は同一 SemVer とする。現在の
package version は開始HEADで `0.1.0` だが、次の version を本書で決定しない。public API、ABI、
WASM export、Store format、error contract または default behavior の互換性に応じた SemVer
判定は、release candidate の差分と合わせて確認する。

**Tag / duplicate / clean commit — Status: `RECOMMENDED`（ユーザー承認済み）**

正式 release の policy は次のとおりである。

- 正式 release は `main` branch からのみ行い、tag は `v<SemVer>`（例: `v0.1.0`）の形式にする。
- Cargo version、npm version、release manifest version を一致させる。
- 既存 tag または既存 npm version を再利用せず、duplicate version / tag は fail closed とする。
- release source commit は clean であることを必須とし、必要な lockfile と generated input が
  release commit に含まれることを確認する。
- pre-release policy は必要になった時点で別 decision とする。

exact duplicate check と release workflow の実装方法は後続 implementation detail とする。

### 5.9 Protected release environment

**Status: `RECOMMENDED`（ユーザー承認済み）**

publish と GitHub Release upload は通常の CI job から分離し、protected GitHub Environment に
接続する。release job のみがこの Environment に接続し、required reviewer は1名必須とする。
Environment は `main` branch と approved release tag policy に制限する。

- build / test job には release write permission を与えない。
- release job の permission は least privilege とし、必要な場合のみ `contents: write` と
  `id-token: write` を付与する。

permission は job 単位の least privilege を原則とする。通常の build job を
`contents: read` 相当に留め、release job だけに GitHub Release のための `contents: write` と
npm provenance / OIDC のための `id-token: write` を必要最小限で付与し、不要な
`packages: write`、`actions: write`、repository-wide write permission を付与しない方式である。
exact job split、Environment name、workflow と GitHub 側の release operation の接続方法は
後続 implementation detail とする。

### 5.10 C ABI GitHub Release

**Status: `RECOMMENDED`**

C ABI は npm package に含めず、npm facade と同じ version / tag に対応する GitHub Release asset
として配布する。最低限の asset / evidence は次のとおりとする。

- supported target ごとの C ABI binary
- public C header
- binary と header の SHA-256
- 選択済み SBOM と Rust / native dependency / license inventory
- release manifest（version、tag、source commit、target、artifact path、digest）
- provenance または provenance を生成できない場合の release gate 結果

C ABI artifact と Node-API `.node` artifact は別の公開物であり、同じ version に同期しても
同じ file、同じ ABI または同じ npm distribution path にはしない。binary、header、checksum、
SBOM、provenance の exact archive layout と target extension は、Stage 10 で承認された policy
に従い、後続 implementation で固定する。

### 5.11 Reproducibility

**Status: `RECOMMENDED`（ユーザー承認済み）**

次の二つを分ける。

- **bit-for-bit reproducibility**: 同じ source、toolchain、dependency、environment、
  build input から binary / package bytes が完全一致すること。
- **source / toolchain / evidence reproducibility**: source commit、lockfile、
  toolchain、target、build command、artifact digest および assembly evidence を追跡し、
  同じ入力から
  再 build できる状態を証明すること。

v1 gate では source / toolchain / evidence reproducibility を必須とする。source commit、
lockfile、toolchain、target、build command、artifact digest および build evidence を追跡可能
にし、同じ入力から再 build できる状態を証明する。bit-for-bit reproducibility は v1 の必須条件
にせず、将来の強化候補とする。bit-identical を達成・検証していない artifact を「再現可能」または
「reproducible」と表現しない。

### 5.12 Release evidence retention

**Status: `RECOMMENDED`（ユーザー承認済み）**

release record は少なくとも次の同一 version / tag / source commit の一式を追跡できるようにする。

- npm `.tgz`
- C ABI binary と public header
- 各 release artifact の SHA-256
- SBOM
- npm provenance / provenance record
- Rust / npm license inventory
- release manifest
- source / lockfile / toolchain build evidence

GitHub Release を正式 release evidence の長期保存の正本とする。GitHub Actions artifact は
build / validation / handoff 用の一時的な保存先とする。Actions artifact の exact retention days
などの operation detail は後続で決める。保存先へ secret、password、private key または不要な
workspace dump を含めない。

### 5.13 Artifact signing

**Status: `RECOMMENDED`（ユーザー承認済み）**

v1 は npm provenance only とし、cosign / Sigstore、GPG および custom artifact signing は採用
しない。provenance は build / publisher identity の evidence であり、artifact signature と同じ
意味ではないため、「artifact signed」と過剰表現しない。additional signing は将来の別 decision
とする。

additional signing を採用する場合の trust root、key ownership、secret storage、key rotation、
revocation / compromise response、verification command、consumer verification UX および
release evidence retention は、その別 decision で決める。現時点で custom PKI、custom signing
protocol または独自 key distribution を追加しない。

## 6. USER ACTION REQUIRED — 解消済み

今回のユーザー判断により、Stage 10 の USER ACTION REQUIRED は解消済みである。確定した
decision は次のとおりである。

1. npm publishing mechanism: npm Trusted Publishing / OIDC を primary とし、通常 release では
   長期 npm automation token を使用しない。manual / break-glass publish は通常経路としない。
2. SBOM canonical format: SPDX JSON とし、CycloneDX JSON を v1 canonical artifact として追加
   しない。
3. unknown / unapproved license policy: fail closed とし、unknown / unapproved license が存在
   する場合は明示的なレビュー・承認まで release を停止する。
4. git tag / version / release source policy: 正式 release は `main` branch からのみ行い、tag は
   `v<SemVer>` とする。Cargo version、npm version、release manifest version を一致させ、既存
   tag / npm version の再利用と duplicate version / tag を拒否し、clean source commit を必須
   とする。pre-release policy は必要時に別 decision とする。
5. protected release environment: protected GitHub Environment を採用し、release job のみ接続
   する。required reviewer は1名必須とし、`main` / approved release tag policy に制限する。
   build / test job に release write permission を与えず、release job は least privilege とし、
   必要な場合のみ `contents: write` / `id-token: write` を付与する。
6. reproducibility gate: v1 では source / toolchain / evidence reproducibility を必須とする。
   bit-for-bit reproducibility は v1 の必須条件にしない。
7. release evidence retention: GitHub Release を正式 release evidence の長期保存の正本とし、
   GitHub Actions artifact は build / validation / handoff 用の一時保存とする。npm tgz、C ABI
   artifacts、SHA-256、SPDX JSON SBOM、provenance、license inventory、release manifest、source /
   lockfile / toolchain evidence を同一 release record として追跡する。
8. artifact signing: v1 は npm provenance only とし、cosign / Sigstore、GPG、custom artifact
   signing は採用しない。provenance を「artifact signed」と表現しない。

これらの decision を入力とする後続 implementation / release operation は、§7 の deferred
items および §9 の handoff に従う。Stage 10 では workflow、Environment、secret、publish、SBOM、
provenance、runtime verification または C ABI release implementation を実施しない。

## 7. Deferred items

**Status: `DEFERRED`**

次は、Stage 10 の decision gate 完了後、承認済み decision を入力とする後続 implementation /
operation として扱う。Stage 10 ではこれらを実装せず、今回の docs-only change でも実装しない。

- npm publish
- GitHub Release 作成
- npm Trusted Publishing / OIDC の npm 側設定
- GitHub protected Environment の作成
- secrets の追加・rotation設定
- SBOM workflow と選択した format の generator 固定
- provenance workflow / publish workflow
- runtime native SHA-256 verification
- C ABI release workflow
- exact action、toolchain、SBOM generator、license scanner および npm CLI version の固定
- release manifest の最終 schema と archive layout
- digest / provenance / license inventory の negative test と clean release
  rehearsal

本書の対象外または後続で再評価する事項は、custom PKI、custom signing protocol、update server、
remote artifact service、per-platform npm package、telemetry、runtime network
dependency、追加の native target、package size threshold および release rollback /
recovery runbook である。
これらを本 decision gate または後続 implementation の対象へ暗黙に追加しない。

## 8. Security impact

本 gate は Core の security authority、Binding の non-authority、public API、C ABI /
npm 境界、
fallback policy、postinstall 禁止および remote download 禁止を変更しない。

採用後に得られる security / supply-chain benefit は次のとおりである。

- source commit、tag、workflow identity、build inputs、release artifact および npm
  publish
  の追跡性を一つの release record に結び付ける。
- SBOM と license inventory により、Rust / npm の direct / transitive dependency と
  license
  expression を release 単位で監査できる。
- package / C ABI artifact の digest と Node native runtime digest を分離し、assembly時の
  integrity と実行時の fail-closed control をそれぞれ検証できる。
- canonical WASM と application build 後の emitted asset を混同せず、application 側の変更を
  Core package の authority と誤認しない。
- protected environment、required reviewers、OIDC および least privilege によって publish
  credential と release operation の blast radius を抑える。

残存する限界も明示する。provenance、SBOM、license inventory、digest、GitHub Release または
追加署名は、Core の暗号が正しいこと、host process が安全であること、application が user intent
を正しく表示することまたは秘密情報が侵害されないことを単独では保証しない。Node native
integrity failure を fail closed にしても、WASM や host environment の security
guarantee を
拡張しない。

## 9. Post-gate implementation handoff

以下は Stage 10 の implementation ではない。Stage 10 で承認された decisions を将来の
implementation stage へ引き渡すための deferred outline であり、今回は workflow / code /
configuration を変更しない。

本書で確定した decision を将来の release workflow implementation へ引き渡す。以下はその
後続 implementation の順序案である。

1. clean release commit、SemVer、tag、Cargo / npm version equality、duplicate
   rejection、
   source / lockfile identity の gate を実装する。
2. protected release Environment、required reviewers、tag / branch restriction および
   job
   単位の minimum permissions を設定する。secrets を追加する場合は承認済みの必要最小限にする。
3. Stage 9 の build / assembly evidence を入力として、build evidence digest、native /
   WASM /
   npm tarball / C ABI release artifact digest を別々に生成し、release manifest へ記録する。
4. 選択済み SBOM format と license policy に従って Rust / npm direct / transitive
   inventory、
   license expression、unknown / unapproved license gate を実装する。
5. npm tarball 内 canonical WASM と 4 native artifact を package allowlist、version、
   source
   commit、manifest および digest とともに assembly し、bundler emitted asset と別管理する。
6. supported native target では manifest、existence、SHA-256、load、initialization を
   確認し、mismatch / failure を fail closed とする。unsupported target /
   `--no-addons` だけを WASM
   fallback として維持する。
7. 承認済みの npm mechanism と provenance policy に従って publish を実装し、provenance failure、
   source / tag / workflow identity mismatch および package contents failure で fail
   closed とする。
8. 同じ tag / version の C ABI binary、header、checksum、SBOM、license inventory、
   provenance /
   manifest を GitHub Release asset として publish する。C ABI は npm package へ移さない。
9. npm `.tgz`、C ABI release asset、digest、SBOM、provenance、inventory、manifest を
   承認済み retention policy に従って保存し、clean consumer / runtime negative test と
   release rehearsal
   の evidence を記録する。

各段階で Stage 9 の source、CI、public API、fallback、authority boundary に意図しない変更が
ないことを確認する。後続 implementation が既存仕様の外部可視動作を変更する必要を発見した
場合は、実装で補完せず上流の decision / specification review へ戻す。

## 10. Gate result

**判定: `READY`**

Stage 9 は、依頼時点で引き継がれた evidence に基づき正式に `READY` である。本作業の docs-only
変更は Stage 9 の実装・CI・設定・生成物を変更しない。

npm publishing mechanism、SBOM canonical format、unknown / unapproved license policy、
tag / release source policy、protected release environment、reproducibility gate、evidence
retention および artifact signing の8件は、上記のとおりユーザー承認済みである。したがって
Stage 10 = decision gate `READY` とする。

本書は decision gate を正本化する成果物であり、Stage 10 `READY` は release implementation
完了を意味しない。npm publish、GitHub Release、Trusted Publishing 設定、GitHub Environment、
secrets、SBOM / provenance workflow、runtime digest verification、C ABI release workflow または
artifact signing implementation は引き続き post-Stage-10 の後続 implementation とする。

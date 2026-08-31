# モノレポ構成・npm 配布基本設計

## 文書の位置付け

本書は、`symbol-nem-wallet-core` の実装移行を開始する前に、Rust workspace、Binding の責務境界、npm 配布、runtime routing、release artifact および移行順序を固定するための設計成果物である。

本書は、`docs/design/architecture.md`、`docs/design/security.md`、`docs/design/bindings.md` および `docs/specifications/` の security meaning、既存 API、Store semantics、error semantics、ownership 契約または protocol 契約を変更しない。今回の impact review では、Node.js の v1 support が同じ Rust Wallet Core を Node-API Binding 経由で利用することを上流資料へ明記し、独立した Node.js / TypeScript Wallet Core 実装を対象外とする意味を明確化する。これらの資料が定める責務と契約を、モノレポおよび npm という配布単位へ配置する。

今回はソースコード、Cargo manifest、npm manifest、CI、生成物および実装 migration を変更しない。上流資料との scope 整合に必要な設計文書の更新だけを行う。

## 1. Goals / Non-goals

### 1.1 Goals

- Rust Core、C ABI、WASM、Node-API の最終的な workspace 配置と依存方向を確定する。
- `symbol-nem-wallet-core` を唯一の security authority とし、各 Binding を thin / non-authoritative boundary として分離する。
- `@nemnesia/symbol-nem-wallet-core` を consumer-facing npm package の唯一の公開 entry point とする配布境界を定める。
- Node.js と Browser / Browser Extension で、公開 TypeScript API、成功・失敗の意味、error、secret return condition、Store replacement の意味および lifecycle responsibility を一致させる。
- Node.js では Node-API native addon を優先し、Browser では WASM を使用する静的 routing を定める。native addon が明示的に無効、対象外または配布対象に含まれない場合に WASM へ安全にフォールバックできるようにする。
- native および WASM artifact を npm install 時の外部 URL download、postinstall build または postinstall script に依存させず、配布物の integrity、再現性、SBOM および provenance を検証できるようにする。
- Core、C ABI、WASM、Node-API および npm facade を v1 では同一 release version で管理する。
- 各 migration 段階で、その段階の maintained topology に対応する Core、Native C ABI、WASM、fuzz および interop 検証を成立させ、段階ごとに回帰を検出できるようにする。旧 root raw WASM build interface は DD-002 により compatibility contract として維持せず、Stage 2 では移動後 Core の非公開 transitional path、Stage 4 以降では `crates/wasm` 経路で WASM を検証する。

### 1.2 Non-goals

- Core の暗号、KDF、nonce、salt、署名対象 byte 列、HD 導出規則、Store schema、error code、authorization または failure semantics の変更。
- Rust Wallet Core と独立した Node.js / TypeScript 等による Wallet Core の別実装の作成。Node-API、C ABI および WASM の各 Binding は同一 Core を呼び出す。
- `c-abi` を npm から JavaScript FFI で呼び出す構成。
- Transaction の構築・解釈、Network 通信、Wallet UI、Browser Extension の page / background / storage architecture の設計。
- Hardware Wallet、External Signer、OS-backed Key、Profile migration または Store version migration の追加。
- npm package からの remote binary / WASM download、install 時の native compile、利用者環境での cargo 実行。
- npm package の内部実装、Node-API wrapper library、bundler の実装を Core の公開仕様へ昇格すること。

## 2. 上流根拠、用語および影響方針

### 2.1 上流根拠

設計判断の根拠は次の順序で扱う。

1. ユーザー依頼で明示された target tree、依存方向、npm routing および配布制約。
2. `docs/consept/concept-sheet.md` の v1 scope と全環境共通の責任境界。
3. `docs/requirements/requirements.md` の Core、Binding、secret ownership、security、compatibility および acceptance criteria。
4. `docs/design/architecture.md`、`docs/design/security.md`、`docs/design/bindings.md` の責務、trust boundary、lifecycle、fail-closed、opaque Store および Binding non-authority。
5. `docs/specifications/specification.md` と `docs/specifications/wallet-store-format-v1.md` の外部契約、既存実装および配布の実現可能性。
6. Node.js / npm の公式文書における conditional exports、Node-API、package contents、provenance および trusted publishing の説明。

下流の既存コードや README の配置を、Core の security meaning または仕様の根拠にはしない。既存コードは現状と migration の回帰対象として参照する。

### 2.2 用語

- **Core**: `symbol-nem-wallet-core` crate。Mnemonic、Software Key、Profile、Store、authorization、署名および Chain / Network compatibility の正本。
- **C ABI**: Native application が利用する低レベル FFI boundary。現行 `bindings/native` の責務を `crates/c-abi` へ移す。
- **WASM binding**: Browser / Browser Extension から Core を利用する `wasm-bindgen` boundary。WASM-specific glue、buffer conversion および JavaScript representation を所有する。
- **Node-API binding**: Node.js native addon boundary。Node-API ABI を利用し、C ABI を JavaScript FFI で再利用しない。
- **npm facade**: `@nemnesia/symbol-nem-wallet-core`。Node-API と WASM の実装差を隠し、単一の TypeScript contract を公開する package。
- **Native artifact**: Node-API crate から target ごとに生成される `.node`。C ABI の `.a` / `.so` / `.dylib` / `.dll` とは別 artifact である。
- **Universal fallback**: Node-API native addon に依存しない WASM 経路。Browser、Bundler、`--no-addons` および native target 非対応の Node.js で使用する。

### 2.3 上流資料への影響評価

Node.js の v1 scope と Binding non-authority を上流資料へ反映し、実装 migration 前の impact review を次のとおり記録する。

| 資料 | 今回の扱い | 実装開始前の確認 |
| --- | --- | --- |
| Concept | scope / environment レベルで Node.js を追加 | Node.js を対象利用環境として明記し、Rust Wallet Core と独立した Node.js / TypeScript 等の別実装を対象外として明確化する。Node-API、conditional exports および npm artifact の詳細は追加しない。 |
| Requirements | Node.js を supported environment として追加 | Node.js は Node-API Binding 経由で同じ Rust Wallet Core を利用すること、`Node.js 代替実装` は独立した Wallet Core implementation を意味し Node-API を除外しないことを明確化する。 |
| Architecture | Node-API を Native / WASM と並ぶ Binding として追加 | Node-API を thin / non-authoritative boundary とし、security authority、secret ownership、Store authority および signing authority は Core に残す。 |
| Security Design | Node.js の guarantee boundary を既存原則へ追加 | Node-API を理由に新しい security authority や native-isolation guarantee を追加せず、Node.js host process compromise を Core / Binding の保証外とする。 |
| Bindings Design | Binding の分類を Native C ABI / Node-API / WASM へ拡張 | 3 Binding とも同じ Core security meaning を mediation し、Node-API は C ABI を JavaScript FFI で呼び出さない。具体契約は下流仕様へ委譲する。 |
| Specification | Node-API の高位 boundary 契約を追加 | Node-API が同じ Core の operation、error、ownership、failure semantics を橋渡しすることを定める。wrapper library、Node version、target matrix、TypeScript API および npm artifact 契約は確定しない。 |
| README | 変更しない | Stage 4 の raw WASM cutover で旧 root WASM build 手順を削除または利用不可と明示し、raw WASM を public entry point としないことを記録する。npm facade の実在する利用方法は Stage 7 で追加し、Stage 11 で README / migration note / Design / Specification / release documentation の最終整合を確認する。 |

Node.js 経路は同じ Rust Wallet Core を利用する v1 supported environment として扱う。`Node.js 代替実装` は Rust Wallet Core と独立した Node.js / TypeScript 等による Wallet Core implementation を意味し、Node-API Binding はこれに含めない。

## 3. Current structure

現在確認できる構成は次のとおりである。

```text
/
├── Cargo.toml                         # root package = symbol-nem-wallet-core
├── Cargo.lock
├── src/
│   ├── lib.rs                          # Rust Core 本体
│   ├── wasm.rs                         # Core crate 内の WASM-specific code
│   ├── crypto.rs
│   ├── cbor.rs
│   ├── store.rs
│   ├── types.rs
│   └── error.rs
├── tests/                              # Core の integration / unit tests
├── bindings/
│   └── native/
│       ├── Cargo.toml                  # symbol-nem-wallet-core-native
│       ├── src/lib.rs                   # C ABI
│       ├── include/                     # 公開 C header
│       └── tests/                       # C compile / runtime / ABI tests
├── fuzz/
│   ├── Cargo.toml                       # 独立 cargo-fuzz workspace
│   ├── Cargo.lock
│   └── fuzz_targets/
├── scripts/build-wasm.sh                # root package の WASM 生成
├── docs/
└── README.md
```

現行 manifest では、root package が `rlib` / `cdylib` を提供し、workspace member は `bindings/native` である。root package の `wasm` feature が `wasm-bindgen` / `js-sys` を有効化し、WASM-specific source は `src/wasm.rs` に存在する。Native package は `symbol-nem-wallet-core-native` という package name で root Core に path dependency を持ち、`staticlib` / `cdylib` を生成する。Node-API crate、npm facade、root `package.json` および `pnpm-workspace.yaml` はまだ存在しない。

現行の WASM 利用経路は、root package の `wasm` feature と `cdylib`、`scripts/build-wasm.sh`、root `pkg/` および README に記載された `wasm-bindgen` generated module の組み合わせである。この経路は現行 repository の利用者向け build / distribution interface だが、最終構成の consumer-facing entry point ではない。互換方針は §14.3 および DD-002 で定める。

fuzz は独自の `[workspace]` と `fuzz/Cargo.lock` を持つため、root Cargo workspace とは別の cargo-fuzz workspace として扱う。生成される `pkg/` は現行でも repository の仕様正本ではない。

## 4. Target repository tree

### 4.1 推奨 target tree

```text
/
├── Cargo.toml                         # virtual Rust workspace
├── Cargo.lock                         # release Rust workspace の lockfile
├── package.json                       # private monorepo tooling package
├── pnpm-workspace.yaml                # packages/* の npm workspace
├── pnpm-lock.yaml
│
├── crates/
│   ├── core/
│   │   ├── Cargo.toml                 # package: symbol-nem-wallet-core
│   │   └── src/
│   ├── c-abi/
│   │   ├── Cargo.toml                 # package: symbol-nem-wallet-core-c-abi (候補)
│   │   ├── include/
│   │   └── src/
│   ├── wasm/
│   │   ├── Cargo.toml                 # package: symbol-nem-wallet-core-wasm
│   │   └── src/
│   └── node/
│       ├── Cargo.toml                 # package: symbol-nem-wallet-core-node
│       └── src/
│
├── packages/
│   └── wallet-core/
│       ├── package.json               # @nemnesia/symbol-nem-wallet-core
│       ├── src/                       # facade source only
│       ├── dist/                      # release build output; source of truth ではない
│       │   ├── index.d.ts
│       │   ├── node/
│       │   │   ├── index.mjs
│       │   │   └── index.cjs
│       │   ├── wasm/
│       │   │   ├── index.mjs
│       │   │   ├── index.cjs
│       │   │   └── *.wasm
│       │   └── native/
│       │       ├── artifact-manifest.json
│       │       └── <supported-target>/*.node
│       └── README.md
│
├── fuzz/                              # 独立 cargo-fuzz workspace のまま
├── scripts/
├── docs/
└── README.md
```

`dist/` は generated artifact であり、通常の開発ソースおよび Core の正本ではない。上記の native artifact は npm facade 用であり、C ABI library と同じものではない。target の数が増えた場合でも v1 の consumer-facing package は `packages/wallet-core` だけとする。target ごとの native artifact を別 npm package として切り出す方式は、サイズ問題が顕在化した場合の代替案であり、現時点の v1 target tree には採用しない。

### 4.2 Repository 上の authority

| 内容 | 正本 |
| --- | --- |
| Core security / ownership / lifecycle | `crates/core` と既存 `docs/design/*` / `docs/specifications/*` |
| C ABI の外部契約 | `crates/c-abi/include/` と既存仕様。header の symbol、ownership、error、free 契約を維持する。 |
| WASM の JavaScript bridge | `crates/wasm` と下流の binding specification |
| Node-API bridge | `crates/node` と Node-API / npm 下流仕様 |
| npm public surface | `packages/wallet-core/package.json` の `exports` と統一 TypeScript declaration |
| package artifact | release commit から CI が生成する `dist/` と artifact manifest |
| current Wallet Store | Application / persistence layer。Core、Binding、npm facade は current Store authority ではない。 |

## 5. システムコンテキストと trust boundary

```text
User
  │ display / confirm / approve
  ▼
Application / UI
  │ common TypeScript contract
  ▼
@nemnesia/symbol-nem-wallet-core
  │ static exports routing
  ├── node-addons ──> Node-API wrapper ──> crates/node ──> crates/core
  └── default     ──> WASM wrapper      ──> crates/wasm ──> crates/core

Desktop / Mobile native application
  └── C ABI ──> crates/c-abi ──> crates/core

Application / persistence layer ── opaque Store ──> Core
Core ── complete replacement Store ──> Application / persistence layer
```

- Core は Mnemonic、Software Key、Profile password authorization、Store validity、状態変更、署名および Chain / Network compatibility の authority である。
- C ABI、WASM、Node-API および npm facade は、型、buffer、error、warning、lifecycle、ownership、module loading および artifact routing の mediation だけを行う。
- Node native が存在することは、Node-API wrapper が Core の authority になること、または Node.js が WASM より強い secret isolation boundary になることを意味しない。
- WASM は JavaScript / Browser と同じ execution context で動作し、Application、Browser、OS または host process の compromise を防止する保証を追加しない。
- npm facade は backend の選択、load、変換を行うが、Core の authorization、secret ownership、failure semantics、Store semantics または signing authority を複製しない。
- Core 外へ渡る秘密情報は、既存仕様で認められた初回 Mnemonic handoff および条件付き個別 export に限定する。package routing はこの公開範囲を広げない。

## 6. Component responsibilities

| component | 所有する責務 | 所有しない責務 |
| --- | --- | --- |
| `crates/core` / `symbol-nem-wallet-core` | Mnemonic、Software Key、Profile、暗号、Store、認証、署名、Chain / Network、atomic replacement、failure safety | Browser API、Node-API、C ABI、npm、UI、Store の保存先、Transaction の構築・解釈 |
| `crates/c-abi` | C header、C ABI の scalar / bytes / DTO / error / ownership / free bridge、C ABI artifact | Core policy、独自暗号、password cache、Store 解釈、Node-API、npm |
| `crates/wasm` | `wasm-bindgen` export、JavaScript representation、`Uint8Array` bridge、WASM artifact 生成境界 | Core policy、Browser storage、UI、Node native loading、C ABI |
| `crates/node` | Node-API の ABI-stable addon boundary、JavaScript value / buffer bridge、native artifact の entry | C ABI の FFI reuse、Core policy、WASM fallback policy の正本、UI |
| `packages/wallet-core` | public TypeScript contract、conditional exports、backend adapter、native / WASM artifact の package assembly | Core security policy、Store schema 解釈、secret cache、backend-specific public type |
| Application / UI | user intent、handoff / export / signing confirmation、Account 選択、Store currentness、保存・表示・バックアップ | Core authorization、signing authority、Store 内部の解釈、Binding の代替 |
| release CI | source-to-artifact traceability、matrix build、hash、SBOM、provenance、package contents 検証 | runtime の Core security decision、利用者環境での secret protection |

### 6.1 Secret ownership の不変条件

全 backend で次を共通に維持する。

- Mnemonic、Software Key private key、derived / decrypted secret material の継続的な security responsibility は Core に残る。
- Binding および npm facade は、呼出し中の受渡しを除き、秘密情報を cache、global state、diagnostics、log、persistent storage または次の operation へ持ち越さない。
- Profile password は処理単位で Core へ渡し、継続的な unlocked session、password cache、authorization cache を追加しない。
- `Confirmed`、`Requested`、`Approved` を Binding または facade が生成・補完・再利用しない。freshness は Application / UI の責任である。
- Core の error、warning、replacement Store、signature、export result を backend の都合で成功、空の正常値、warning-only または別の security meaning へ変換しない。

## 7. Dependency graph

### 7.1 Rust dependency graph

```text
crates/c-abi ──┐
crates/wasm  ──┼──> crates/core (symbol-nem-wallet-core)
crates/node  ──┘
```

禁止する依存は次のとおりである。

```text
core -> wasm
core -> node
core -> c-abi
core -> npm
c-abi -> node
wasm -> node
node -> c-abi
```

`crates/node` は Node-API を利用するための binding であり、既存 C ABI を呼ぶ JavaScript FFI adapter ではない。`crates/wasm` は `crates/node` を参照せず、`crates/c-abi` は Node.js artifact を生成しない。

### 7.2 npm / artifact graph

```text
packages/wallet-core
   ├── conditional exports: node-addons ──> dist/node/* ──> native .node ──> crates/node
   └── conditional exports: default     ──> dist/wasm/* ──> *.wasm       ──> crates/wasm

crates/c-abi ──> native application / Swift / Kotlin / C / C++ integration
```

`packages/wallet-core` は C ABI artifact を依存または同梱しない。C ABI は npm package の内部実装ではない。

## 8. Rust workspace design

### 8.1 Root workspace

最終 root `Cargo.toml` は virtual workspace とし、root package を廃止する。概念的な構成は次のとおりである。

```toml
[workspace]
resolver = "2"
members = [
    "crates/core",
    "crates/c-abi",
    "crates/wasm",
    "crates/node",
]
exclude = ["fuzz"]

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT"
```

実際の dependency version、feature、metadata は migration 時に現行 manifest と lockfile を差分確認して移す。workspace centralization を理由に、暗号 dependency、protocol behavior または public API を変更しない。

ここで示す virtual workspace は最終構成であり、migration Stage 1 の準備状態を表さない。Stage 1 では root の `[package]` と `symbol-nem-wallet-core` package を維持する。root package を virtual workspace へ切り替えるのは、Core relocation、現行 Native Binding と fuzz の path dependency 更新、およびそれらを解決する workspace member 更新を同じ atomic stage で完了できる Stage 2 に限る。

`fuzz/` は cargo-fuzz の独立 workspace として維持し、Core の path dependency を `../crates/core` へ変更する。root の `Cargo.lock` は release workspace の正本、`fuzz/Cargo.lock` は fuzz workspace の lockfile として分離する。

### 8.2 `crates/core`

- package name は `symbol-nem-wallet-core` を維持する。
- 現行 `src/` の Core responsibility、Rust public operation、型、Store、暗号、Symbol / NEM 処理および error semantics を移す。
- Core は通常の Rust library として利用し、C ABI、Node-API または WASM の配布用 `cdylib` を Core 自身の責務として持たない。
- `wasm-bindgen`、`js-sys`、Node-API、Browser API、Node.js API、C ABI wrapper を直接依存させない。
- Core の API は backend-neutral な Rust API とし、Binding が Core 外の policy を実装する必要をなくす。
- 現行 `getrandom` の WASM feature wiring は migration 時の検証対象とする。Core に WASM-specific JavaScript dependency を逆流させず、Core の CSPRNG semantics と各 target の適切な randomness source を両立させる。exact Cargo feature arrangement は実装 migration の gate とする。

### 8.3 `crates/c-abi`

- 現行 `bindings/native` の source、公開 header、C runtime test、header compile test を最小差分で移す。
- C ABI の symbol、固定長・可変長 DTO、caller-owned input、Binding-owned output、専用 release、NULL / length、error、warning、partial output failure semantics を維持する。
- 内部 crate としては `crates/core` にだけ依存する。boundary implementation に必要な外部 dependency は現行契約を変えない範囲で扱い、Node-API や npm の build system は参照しない。
- C ABI release build は static library と dynamic library を提供し、target / toolchain に応じた filename と link 条件を release metadata へ記録する。
- crate package name は target として `symbol-nem-wallet-core-c-abi` を推奨する。ただし、既存 `symbol-nem-wallet-core-native` package が外部公開・外部依存されている場合の compatibility alias / package name 維持は、consumer inventory 後に決定する。C symbol / header 契約は package name の変更理由で変えない。
- release artifact は target ごとの C library と header であり、npm facade には含めない。

### 8.4 `crates/wasm`

- 現行 `src/wasm.rs` の WASM-specific export と JavaScript conversion を移す。
- `wasm-bindgen`、`js-sys`、WASM test support はこの crate の責務とする。
- release build は wasm-bindgen が利用できる WASM library artifact と生成 glue を作り、Core 側へ JavaScript dependency を戻さない。
- `crates/core` の同じ operation を呼び、`Uint8Array`、string、scalar、result、error、warning および replacement Store を既存仕様どおりに bridge する。
- Store、Pending、Mnemonic、password、private key、payload、public key、signature の意味を decode、normalize、migration または補正しない。
- `crates/node`、Node.js filesystem、Browser storage または npm facade には依存しない。

### 8.5 `crates/node`

- package name は `symbol-nem-wallet-core-node` とする。
- Node-API の C ABI-stable boundary を提供し、Node.js runtime / JavaScript value / buffer と `crates/core` の間を bridge する。
- V8 API、Node internal API、`nan`、C ABI 直接 FFI を Node public contract の基礎にしない。Node-API wrapper library の選択は実装開始時に固定し、Node-API 以外へ依存しないことを検証する。
- Core の operation、error、warning、ownership、secret return condition、Store replacement および failure semantics を 1 対 1 で伝える。
- Node-API addon の `.node` artifact を target ごとに生成するが、npm facade の public API や fallback policy の authority にはならない。
- release build は target ごとの Node-API native addon (`.node`) を生成し、C ABI の static / dynamic library と同一視しない。

Node.js の Node-API は underlying JavaScript engine から独立した ABI-stable API だが、外部 library や Node-API 以外の Node / V8 API まで ABI stable になるわけではない。このため native addon は Node-API 限定で構成し、依存する外部 native library の ABI も release matrix で確認する。

## 9. npm workspace design

### 9.1 Workspace の責務

root `package.json` は private monorepo tooling package とし、公開しない。`pnpm-workspace.yaml` は原則として `packages/*` を workspace に含める。Cargo workspace と npm workspace は別の dependency graph と lockfile を持つ。

`packages/wallet-core` だけが consumer-facing npm package であり、公開名は `@nemnesia/symbol-nem-wallet-core` とする。`crates/*` は npm workspace package ではない。

conceptual な root package metadata は次のとおりである。

```json
{
  "name": "symbol-nem-wallet-core-monorepo",
  "private": true,
  "packageManager": "pnpm@<pinned-version>"
}
```

`<pinned-version>`、Node version、pnpm version および CI action version は release CI の実装時に固定する。今回の設計文書では未確定の version を事実として記録しない。

### 9.2 `packages/wallet-core`

package は次の層で構成する。

```text
packages/wallet-core
├── src/
│   ├── public contract / facade
│   ├── node adapter
│   └── wasm adapter
├── package.json
└── dist/                                # build 時に生成
```

- `src/` は backend-neutral facade と module routing の source であり、Core の暗号・Store・authorization を実装しない。
- `dist/index.d.ts` は Node / Browser で共通の TypeScript declaration とする。
- `dist/node/*` と `dist/wasm/*` は implementation detail であり、`exports` の root entry 以外から直接 import させない。
- raw `.node`、raw generated wasm-bindgen module、C header、Rust type、backend-specific error type は public subpath としない。
- package contents は allowlist 方式で管理し、source tree、tests、fuzz、秘密値、build cache、private CI metadata を npm tarball に含めない。

### 9.3 ESM / CommonJS 方針

v1 の facade は ESM-first の dual entry とする。Node.js の `import` と `require`、および Browser / Bundler の ESM を、同じ TypeScript contract と同じ observable semantics へ正規化する。

最終 `package.json` の形は implementation 時に検証するが、exports の設計は次を基準とする。

```json
{
  "name": "@nemnesia/symbol-nem-wallet-core",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "node-addons": {
        "import": "./dist/node/index.mjs",
        "require": "./dist/node/index.cjs"
      },
      "default": {
        "import": "./dist/wasm/index.mjs",
        "require": "./dist/wasm/index.cjs"
      }
    }
  },
  "types": "./dist/index.d.ts",
  "main": "./dist/wasm/index.cjs",
  "module": "./dist/wasm/index.mjs",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

この snippet は public method、DTO、error code または initialization API を新規定義するものではない。`types` は type resolution のために最初に置き、runtime condition は `node-addons`、最後に universal な `default` を置く。conditional exports の key order は解決優先度に影響するため、生成・review で固定する。

`main` / `module` は `exports` を理解しない古い tool のための互換 hint であり、現行 Node.js / bundler の routing authority ではない。`browser` condition、独自 `wasm` condition、`process` による public API routing は追加しない。

## 10. Public npm API boundary

### 10.1 公開 entry point

consumer は次の root import だけを契約として利用する。

```ts
import { WalletCore } from "@nemnesia/symbol-nem-wallet-core";
```

ここでの `WalletCore` は consumer-facing facade の概念名である。既存仕様にない class、constructor、factory、method、async shape、DTO field または error code を本書だけで新規確定しない。実装前に既存 Rust / Native / WASM operation set を追跡した TypeScript specification を作成し、公開 symbol の最終形をそこで固定する。

### 10.2 Public contract の不変条件

- Node と Browser で同じ操作集合、入力の意味、成功 / 失敗、Core error、warning、signature bytes、replacement Store の意味を提供する。
- backend-specific 型を public API に漏らさない。Node-API handle、native pointer、WASM class、generated binding module、C ABI struct、allocator または `.node` path は public type ではない。
- 既存仕様が定める binary data は `Uint8Array` 相当、opaque Store / Pending は opaque byte 列、秘密情報の通常非開示、explicit export の条件および caller-side copy responsibility を維持する。hex、Base64、JSON Store または文字列 private key を facade の convenience API として追加しない。
- `AuthenticationFailed`、`InvalidStore`、`NetworkMismatch`、`InvalidArgument`、`BindingFailure` 等の既存 error meaning を backend ごとに再分類しない。
- native addon load error は Core operation error と異なる infrastructure boundary の失敗であり、Core の authorization failure や Store failure を隠す理由にしない。具体的な TypeScript error representation は下流 specification で固定する。
- facade、Node adapter、WASM adapter は secret を cache、log、diagnostics、global state または implicit session に残さない。
- root 以外の backend subpath を公開しないことで、consumer が native / WASM implementation detail に依存することを防ぐ。

### 10.3 API parity の対象

次を Node native と WASM で同じ入力 fixture に対して比較する。

- Profile create / restore、Mnemonic handoff、key derive / import / generate。
- public account、signing、explicit Mnemonic / private key export。
- password change、key delete、Profile delete。
- valid / malformed / unsupported / unauthenticated Store、wrong password、wrong Chain / Network、invalid request、unconfirmed / unapproved request。
- warnings、replacement Store、signature bytes、public output、failure 時の output empty-state および既存状態不変。

## 11. Node / Browser backend routing

### 11.1 Static routing を正本とする

backend の選択は runtime 内の `typeof window`、`process` の有無、native module の試行順序または任意の dynamic probing を第一の判定根拠にしない。

次の conditional exports を routing authority とする。

```text
Node.js（通常）
  node-addons condition
    └── dist/node/index.(mjs|cjs)
          └── target manifest で定義された Node-API .node
                └── crates/node -> crates/core

Node.js（--no-addons）
  node-addons condition が無効
    └── default -> dist/wasm/index.(mjs|cjs)

Browser / Browser Extension / bundler
  default condition
    └── dist/wasm/index.(mjs|cjs) + 同梱 *.wasm
          └── crates/wasm -> crates/core
```

Node.js package condition の仕様上、`node-addons` は native addon の entry point に、`default` はより universal な実装（WASM など）に使う。`default` は最後に置き、unknown environment が Node.js を偽装しなくても universal implementation を利用できる形にする。

### 11.2 Native artifact の決定と限定 fallback

`node-addons` branch に入った後の Node adapter は、配布済みの静的 `artifact-manifest.json` と Node が提供する target 情報を照合し、1 つの事前定義済み `.node` path を選択する。この target mapping は native / WASM の環境判定ではなく、Node branch 内で native file を選ぶための packaging lookup である。

許可する fallback は次の二つだけとする。

1. `--no-addons` により conditional export の `node-addons` が無効になり、`default` が選択される。
2. Node branch が選択されたが、target が manifest に存在しない場合に、対象外 platform / architecture として WASM を選択する。

manifest が native artifact の存在を宣言している supported target で、load、signature、initialization または operation 実行が失敗した場合は、native failure を隠して WASM に差し替えない。特に Core の `AuthenticationFailed`、`InvalidStore`、`NetworkMismatch`、署名失敗または CSPRNG failure を WASM retry へ変換しない。package 破損や loader error を安全側に明示的な backend initialization failure として扱う具体表現は下流仕様で定める。

これにより、静的 routing を維持しつつ、unsupported target では universal fallback を提供できる。native binary を試して失敗したら任意に別 backend を試す方式、network 上の capability probe、environment heuristics および user-visible な backend selection API は v1 に導入しない。

### 11.3 Node.js / Browser の parity

facade は Node / Browser で backend 固有の型や semantics を公開しない。Node-API と WASM の差は facade の内側で吸収し、公開側では次を一致させる。

- operation の呼出し shape と結果の shape。
- success / failure の判定。
- Core error / warning の code と意味。
- secret が結果に含まれる条件、caller-owned copy、利用後の破棄責任。
- Store を入力として直接変更せず、成功時だけ完全な replacement Store を返す意味。
- Chain / Network mismatch、wrong password、malformed Store、pending、confirmation および approval の fail-closed semantics。

Browser Extension の context、storage、permission、CSP、worker、page と background の構成は、この routing 設計の外側にある Application / Browser Extension architecture の責任とする。

## 12. Node-API / C ABI / WASM の役割分担

| boundary | 主な利用者 | 入力・出力 bridge | Core security meaning |
| --- | --- | --- | --- |
| C ABI | Swift / Kotlin / C / C++ / native application | raw bytes、固定長 DTO、owned output、専用 free、C error | 変更しない。C ABI は低レベル integration boundary。 |
| Node-API | Node.js | JavaScript value / Buffer / typed value と Core operation の bridge、`.node` addon | 変更しない。Node-API は C ABI の再利用ではなく Core への thin binding。 |
| WASM | Browser / Browser Extension / universal fallback | `Uint8Array`、string、scalar、generated wasm-bindgen glue | 変更しない。WASM は host compromise や secret isolation を保証しない。 |
| npm facade | TypeScript consumer | conditional exports、共通 declaration、adapter、artifact load | authority を持たない。Core error、authorization、Store semantics を再解釈しない。 |

3 つの Rust Binding は、片方を別の正本として扱わない。C ABI の実装を Node-API から呼ばず、WASM の JavaScript glue を Node backend に流用せず、Node adapter が Store / key / signing の意味を独自に実装しない。

## 13. Native artifact distribution strategy

### 13.1 v1 採用案: facade tarball への同梱

v1 は、サポート対象 target の Node-API `.node` を `@nemnesia/symbol-nem-wallet-core` の package tarball に同梱する方式を採用する。

- npm package は一つの installable facade で完結する。
- native artifact は `dist/native/<target>/*.node` として固定された target manifest から参照する。
- package install 後に別 URL から binary を取得しない。
- postinstall script、node-gyp による利用者環境 build、cargo install、任意 compiler、remote release asset の runtime download を必要としない。
- target 外の Node.js は WASM fallback を使用する。
- C ABI library は同梱しない。Native application 向け C ABI artifact は GitHub release asset 等の別配布物とする。

同梱方式は tarball size と target 数の増加が trade-off になる。target 数が大きくなった場合も、まず public facade の contract は維持し、別 target package を optional dependency として切り出す案を再評価する。切り出しを採用する場合は、package topology、install integrity、provenance および consumer-facing package 原則を別設計として承認する。

### 13.2 Supported platform / architecture

supported set は package release ごとに target manifest と README へ明示する。最低限、OS、CPU architecture、ABI / libc 区分、Node-API compatibility、artifact filename、WASM fallback の有無を列挙する。

Node.js の version floor と native target matrix は未確定であるため、現時点で特定の Node LTS、Linux libc、Windows toolchain または macOS deployment target を v1 の事実として固定しない。実装開始前に、次の matrix を CI と package metadata の両方へ反映する。

| 軸 | 必須の記録 |
| --- | --- |
| OS | Linux / macOS / Windows 等の supported target |
| CPU | x64 / arm64 等 |
| ABI | Node-API version、OS ABI、Linux libc 等 |
| native availability | `.node` が同梱されるか、WASM fallback のみか |
| test environment | 実機、container、cross build、smoke test の別 |
| release evidence | artifact hash、build log、SBOM、provenance |

### 13.3 Integrity と再現性

- 各 `.node` は release build で SHA-256 digest を計算し、target、crate version、source commit、toolchain identifier とともに `artifact-manifest.json` と release metadata に記録する。
- npm tarball は allowlist と `npm pack --dry-run` で contents を検査する。不要な source、test、secret、private key、Mnemonic、password、build cache は含めない。
- 同じ release tag、同じ lockfile、同じ build input から同一 artifact digest を再確認できることを目標とする。完全な byte-for-byte reproducibility が toolchain 上実現できない場合は、差異の理由と検証範囲を release record に残す。
- artifact hash は Core の runtime error semantics や cryptographic protocol semantics を変更する機能ではなく、release / supply-chain evidence として扱う。

## 14. WASM artifact distribution strategy

### 14.1 npm への同梱

WASM は `crates/wasm` を `wasm32-unknown-unknown` で build し、`wasm-bindgen` の生成 glue と `.wasm` を `@nemnesia/symbol-nem-wallet-core` 内の `dist/wasm/` に同梱する。

- Browser が外部 CDN、remote URL、runtime binary download に依存しない。
- Browser / Browser Extension package へ asset を含めて bundler が扱えるよう、WASM glue と `.wasm` の相対配置を release smoke test で確認する。
- Browser Extension の package から remote code を取得する方式は採用しない。Extension への組込みと CSP / resource policy は統合 Application の責任である。
- Node.js の `default` fallback も同じ同梱 WASM asset を使用する。Node branch の native failure を隠すための任意 retry ではない。
- WASM binary の digest、source commit、Core version、wasm binding version、生成 toolchain を release manifest と SBOM に記録する。

### 14.2 WASM integrity

npm registry の package integrity、tarball contents allowlist、artifact digest、CI provenance を組み合わせて検証する。browser runtime に remote integrity metadata を問い合わせる設計や、untrusted URL から `.wasm` を受け取る設計は追加しない。

runtime hash verification を facade の公開動作として追加するかは、本書では固定しない。追加する場合も、検証失敗を Core の `InvalidStore`、`AuthenticationFailed` または別の security meaning へ変換せず、package / backend initialization failure として仕様化する。

### 14.3 旧 root raw WASM 経路の互換方針（DD-002 / DR-002 対応）

v1 の JavaScript 向け正式な consumer-facing 配布は `@nemnesia/symbol-nem-wallet-core` の root entry point だけとする。したがって、次の現行 repository-level raw WASM build / distribution interface は compatibility contract として維持しない。

- root Cargo package の `--features wasm`。
- root Core `cdylib` を利用する WASM 生成。
- root `pkg/` を既定または前提とする build output。
- `scripts/build-wasm.sh` の旧 invocation、旧 output layout および README に記載された raw generated package の利用手順。

root package を廃止する Stage 2 の boundary で、root package に属する `wasm` feature、root Core `cdylib` および root `pkg/` を利用する旧 root interface を維持しない。これは DR-001 の atomic workspace cutover に伴う意図的な distribution interface cutover であり、root package が存在しないまま旧 feature や旧 output layout を compatibility shim として残す中間状態を作らないことを意味する。Core package の source / manifest を移す都合で、Stage 2 の `crates/core` に WASM-specific source、feature または `cdylib` の一時的な内部 wiring が残ることは許容するが、これは consumer compatibility ではなく Stage 4 で必ず除去する transitional state である。Stage 2 では `scripts/build-wasm.sh` の旧 root invocation / output contract を廃止し、必要な内部検証 helper があっても新しい非公開経路として扱う。Stage 4 では一時的な Core wiring も `crates/wasm` へ抽出し、旧 interface の廃止を検証上も完了させる。旧 script は実装時に削除または新しい内部 build helper へ置換できるが、旧 command / output contract は引き継がない。

`crates/wasm` は `wasm-bindgen` glue と WASM artifact の内部 Binding / artifact source であり、npm facade の Browser / universal fallback backend を生成するためにだけ使用する。raw generated wasm-bindgen package、generated module、低レベル `.wasm` artifact および `pkg/` directory は consumer-facing public entry point または public subpath にしない。新しい WASM artifact は `packages/wallet-core` の同梱物として assembly され、consumer は npm facade の root entry point だけを利用する。

この cutover は、Core cryptographic behavior、Core Rust public operation semantics、Store format、error semantics、authorization、secret ownership または signing behavior の breaking change ではない。変更されるのは pre-monorepo の repository / build / distribution interface から正式な npm distribution interface への切替である。旧 raw WASM 経路を利用している外部 consumer が存在する可能性は compatibility risk として記録するが、未確認 consumer のために旧 interface を無期限に残さない。Stage 4 の cutover 時には README から旧 root WASM build 手順を削除または利用不可と明示し、raw WASM が consumer-facing public entry point ではないことを記録する。この時点で npm facade の利用方法を完成済み機能として記載せず、必要な場合だけ後続提供予定として扱う。Stage 7 で npm facade の実装・検証後に実在する利用方法を README へ追加し、Stage 11 で README / migration note / Design / Specification / release documentation の最終整合を確認する。release / migration note では旧 raw WASM build path、new npm facade、low-level WASM artifact の非公開位置付けを説明する。

## 15. Versioning policy

### 15.1 v1 fixed-version policy

特別な理由がない限り、次を同一 release version で lock-step 管理する。

```text
crates/core       symbol-nem-wallet-core
crates/c-abi      symbol-nem-wallet-core-c-abi（または互換維持の package name）
crates/wasm       symbol-nem-wallet-core-wasm
crates/node       symbol-nem-wallet-core-node
npm facade        @nemnesia/symbol-nem-wallet-core
```

v1 の release tag、Cargo workspace version、crate artifact metadata、WASM artifact、Node native artifact、npm package version は同一の `vX.Y.Z` source snapshot に対応させる。npm package の SemVer が consumer-facing version の正本であり、Rust crate version は同じ release train の構成要素として管理する。

一つの Binding だけを更新する場合でも、parity test、artifact manifest、release metadata を更新した同じ release version を生成する。Binding 間の version divergence は v1 では許可しない。

### 15.2 SemVer の責任

- public npm facade の TypeScript contract、root exports、observable semantics、error、secret return condition または backend-independent behavior の変更は npm SemVer に従う。
- C ABI の symbol、header、ownership、allocator、error mapping の変更は C ABI compatibility review を必須とし、npm SemVer だけで正当化しない。
- Node-API の `.node` artifact は ABI-stable API を利用しても、supported Node version、OS ABI、外部 native dependency および target matrix の変更を伴い得るため、release metadata と CI matrix で管理する。
- Store format、protocol compatibility、暗号仕様の変更は package version の問題だけではなく、既存 Requirements / Design / Specification の変更判断を要する。

### 15.3 divergence を許可しない理由

Node、WASM、C ABI の各実装を独立 version にすると、同じ Core operation の parity、signature bytes、Store replacement、error mapping および security fix の適用時点を consumer が判断しにくくなる。v1 では lock-step にして、独立 release が必要になった理由、互換性マトリクス、security patch policy を新しい設計判断として承認する。

## 16. Release / CI architecture

### 16.1 Artifact flow

```text
protected tag vX.Y.Z
        │
        ├── Rust Core tests / clippy / format / audit
        ├── C ABI target matrix
        │     └── .a / .so / .dylib / .dll + header + hash
        ├── WASM build
        │     └── wasm-bindgen glue + .wasm + hash
        ├── Node-API target matrix
        │     └── .node + hash
        ├── Core / C ABI / WASM / Node parity tests
        ├── npm facade assembly
        │     └── dist + index.d.ts + manifest + allowlisted files
        ├── npm pack dry-run / clean install / ESM / CJS / Browser smoke
        ├── SBOM / provenance / release manifest
        └── publish npm facade + upload C ABI release assets
```

### 16.2 CI stages

1. Source checkout と tag / version / lockfile の整合確認。
2. Core の format、lint、unit / integration、fuzz compile、interop fixture および security regression。
3. C ABI の header compile、runtime、ownership / release、sanitizer および target build。
4. WASM の target build、wasm-bindgen generation、Node / browser test、asset placement。
5. Node-API の target build、ESM / CJS addon load、Node version matrix、native-to-Core contract test。
6. 同じ fixture を Core、C ABI、WASM、Node-API へ投入する parity test。
7. npm facade の `exports` resolution、type resolution、bundler resolution、`--no-addons`、unsupported target fallback、clean install および package smoke test。
8. package contents allowlist、artifact digest、SBOM、provenance、release metadata の review。
9. protected release workflow から npm publish と C ABI artifact upload を実行する。

各 artifact は別 job で生成してよいが、最終 assembly は同じ release commit、Cargo lock、pnpm lock、workspace version および artifact manifest に対して行う。native artifact、WASM、TypeScript declaration の一部だけを手動で差し替えて publish しない。

### 16.3 Publish policy

- npm facade は public scoped package とし、publish 前に tarball を検査する。
- GitHub Actions の OIDC / npm trusted publishing を第一候補とし、long-lived npm token を release job に常設しない。
- provenance が利用できる release environment では provenance attestation を生成する。provenance は「悪意のないコード」を証明するものではなく、source、build instruction、publisher、build environment の追跡 evidence として扱う。
- C ABI artifacts は npm へ publish せず、同じ tag の GitHub release asset として hash、SBOM、provenance とともに提供する。
- publish を実行するまで、registry への publish、remote URL download、postinstall script の有効化を行わない。

## 17. Security / supply-chain constraints

### 17.1 Install / runtime

- install 時に external URL から `.node`、`.wasm`、Rust library または compiler を取得しない。
- `postinstall` で native compile、binary download、環境判定、権限昇格または remote script 実行をしない。
- npm package は同梱 artifact と declared dependencies だけで動作する。通常の npm registry package download は必要だが、facade が追加の artifact download を起動しない。
- native artifact の存在、target mapping、load 結果を Core operation の security error と混同しない。
- WASM は package に同梱し、CDN、user-provided URL、Browser storage の値または network response を code source として解釈しない。

### 17.2 Secret handling

- release log、package manifest、artifact manifest、SBOM、provenance、README、test output に Mnemonic、private key、Profile password、seed、復号済み payload または秘密 Store 内容を含めない。
- parity test は秘密値の出力ではなく、成功 / 失敗、error code、signature bytes、public output、replacement Store の検証結果を比較する。failure diagnostics は秘密情報を含めない。
- package facade は password、secret buffer、pending、authorization status を backend 間で保持・再利用しない。
- native / WASM の選択を理由に、通常処理の secret non-disclosure、per-operation authentication、explicit export guard または Core ownership を弱めない。

### 17.3 Build integrity

- Cargo.lock、pnpm-lock.yaml、build tool、wasm-bindgen tool、Node version、Rust toolchain、target matrix を release record に固定する。
- dependency audit、license review、native external dependency review、SBOM 生成を release gate とする。
- generated `dist/` は clean checkout から生成し、未追跡ファイル、ローカル cache、developer home path、environment secret を混入させない。
- package `files` allowlist と `npm pack --dry-run` で、公開内容を release 前に review する。
- npm registry signature、package integrity、provenance を相互に異なる evidence として扱い、どれか一つだけで source / artifact の完全性を断定しない。

## 18. Test strategy

### 18.1 Core / binding 回帰

- 既存 Core unit / integration test を `crates/core` で維持する。
- C ABI test は header compile、C caller runtime、NULL / length、ownership、dedicated free、partial output failure、sanitizer を維持する。
- WASM test は wasm-bindgen boundary、exact `Uint8Array`、detached / unreadable buffer、error conversion、output ownership、asset initialization を確認する。
- Node-API test は Node-API version matrix、ESM / CJS load、Buffer / typed value conversion、addon initialization、operation result、addon load failure を確認する。
- fuzz target は `crates/core` の Store decode / parser を対象に継続し、path 移動によって fuzz scope を狭めない。

### 18.2 Contract parity

同一 release source、同一 Core logic、同じ入力を用いて、次を比較する。

| 項目 | 比較対象 |
| --- | --- |
| operation success / failure | Rust Core / C ABI / WASM / Node-API / npm facade |
| error / warning | symbolic code、warning の有無と secret non-disclosure |
| public output | Profile / Key metadata、public key、address、signature |
| mutation | 完全な replacement Store、失敗時の existing Store 不変 |
| security guard | password、Chain / Network、confirmation、approval、export 条件 |
| ownership | input borrow、output copy、release / discard responsibility |
| lifecycle | retry、restart、pending、authorization の非継承 |

秘密情報そのものはログへ出さない。必要な interop fixture は既存仕様で承認された範囲の deterministic fixture とし、fixture の出力を debug dump しない。

### 18.3 npm / runtime smoke

- `import` と `require` の両方で root entry point だけを import する。
- Browser bundler が `default` WASM branch と asset を静的に bundle できることを確認する。
- Node 通常起動が `node-addons` branch、`--no-addons` が `default` branch になることを確認する。
- supported native target、unsupported target、manifest mismatch、native load failure を区別して確認する。
- clean temporary project で package tarball を install し、postinstall がないこと、network binary download がないこと、package contents が allowlist と一致することを確認する。
- package の raw backend subpath、C ABI、generated internal module が public import できないことを確認する。

## 19. Migration sequence

実装 migration は本書の設計 gate が承認されるまで開始しない。開始後も、各段階を独立した差分と検証結果で完了させる。大規模な一括 rename / move と API change を同じ差分へ混在させない。

### 19.1 Gate classification

今回の Node.js scope clarification により、Node.js support は既存 v1 scope と正式に整合した。`OPEN-009` は解消済みであり、実装者が Node.js を独立した Wallet Core と解釈する余地を残さない。

DR-001 と DR-002 は、本書の migration invariant、sequence および resolved design decision に反映済みとする。未決定事項は、物理的なモノレポ構造移行、Node/npm 実装、公開 release の異なる gate に分類する。旧 root raw WASM 経路の compatibility 方針は未決定事項ではなく DD-002 で確定しており、残るのは外部 consumer の存在可能性を compatibility risk として inventory / migration note に記録することである。

| Gate | 対象 | 段階 1〜5 の structural migration への扱い |
| --- | --- | --- |
| monorepo structural migration gate | upstream impact review、target tree、依存方向、責務境界、Rust / Native / fuzz / 旧 raw WASM を含む既存 consumer inventory、DD-001 / DD-002、および各段階の buildable dependency graph。`OPEN-003` は package name を変更する場合だけ該当する。 | DR-001 / DR-002 の設計上の未解決は残さない。`OPEN-001`、`OPEN-002`、`OPEN-004`、`OPEN-005`、`OPEN-006`、`OPEN-007`、`OPEN-008` は blocker にしない。`OPEN-003` が未解決でも、既存 package name を維持して path migration を進められる。正式な Design Review の再承認と Stage 0 gate の完了は、実装開始前に必要である。 |
| Node/npm implementation gate | `OPEN-001`、`OPEN-002`、`OPEN-004`、`OPEN-005`、`OPEN-008` | crates/core、crates/c-abi、crates/wasm の structural migration 開始条件にはしない。`crates/node` と npm facade の実装開始前に解決する。 |
| release gate | `OPEN-006`、`OPEN-007` と release candidate の全 artifact / package 検証 | structural migration および Node/npm 実装の開始条件にはしない。publish、GitHub release asset 提供および provenance 完了前に解決する。 |

Node-API wrapper library、exact Node.js version matrix、Browser bundler baseline、artifact size threshold、runtime hash verification および SBOM / provenance の具体方式は、Core / C ABI / WASM の物理的な path move を Stage 1 から開始する blocker ではない。旧 raw WASM interface の廃止方針そのものは DD-002 で確定しているため、implementation が compatibility shim の有無を再判断してはならない。

### 19.2 Migration stages

| 段階 | 作業 | 完了 gate |
| --- | --- | --- |
| 0 | 本書、上流 impact、crate / package name、target tree、依存方向、公開範囲、既存 consumer inventory および gate 分類を review し、structural migration 開始を承認する。旧 raw WASM interface を維持しない DD-002 と、各段階の buildable dependency graph を含む DD-001 を確認する。 | Node.js scope clarification と `OPEN-009` の解消、DR-001 / DR-002 を反映した本書の正式 Design Review 再承認、structural migration gate の承認、source code 未変更。 |
| 1 | **workspace preparation**。root Rust package はまだ virtual workspace 化しない。root npm private package、`pnpm-workspace.yaml`、lockfile policy、`crates/` / `packages/` の配置準備および migration に必要な非破壊的 tooling preparation だけを行う。root `Cargo.toml` の `[package]`、`symbol-nem-wallet-core`、`src/`、現行 workspace member、Native / fuzz の root path dependency を維持する。 | 既存 root Core / Native / WASM / fuzz topology が成立し、既存の対応する build / test gate を維持できる。root package を消す変更、root virtual workspace 化、Core / Native / fuzz の path 変更はこの段階に含めない。 |
| 2 | **Core relocation + Rust workspace cutover**。root の `symbol-nem-wallet-core` package と package-owned source / tests を `crates/core` へ移し、package name と Rust public API を維持する。同じ atomic stage で root `Cargo.toml` を virtual workspace 化し、`crates/core` と既存の `bindings/native` を workspace member とする。`bindings/native` の Core path dependency を `../../crates/core`、独立 fuzz workspace の Core path dependency を `../crates/core` へ更新し、Core relocation に直接必要な script / test path を更新する。この stage の boundary で、root package を消したが Core、Native または fuzz の参照が旧 path のまま残る state を作らない。Core package を移した直後に WASM-specific source / feature / `cdylib` の一時的な内部 wiring が残る場合も、root package の外部 interface や root `pkg/` は維持しない。 | root virtual workspace の Cargo dependency graph が `crates/core` と existing `bindings/native` で成立し、Native と fuzz が新しい `crates/core` を一意に解決する。Core / Native / fuzz の対応する build、test、format / lint および必要な path validation が通る。加えて、移動後 `crates/core` に一時的に残る WASM wiring を使った非公開の transitional WASM regression validation path で wasm32 target build / check が成立し、relocation 前後の既存 WASM boundary behavior に意図しない変更がないことを確認する。この確認は Stage 2 の relocation regression であり、root `--features wasm`、root Core `cdylib`、root `pkg/`、および `scripts/build-wasm.sh` の旧 invocation / output contract を consumer compatibility として維持するものではない。root `pkg/`、旧 command / output contract、compatibility shim は作成・復活させず、DD-002 に従って旧 root interface は廃止対象として扱う。 |
| 3 | **C ABI relocation**。`bindings/native` を `crates/c-abi` へ移す。header、C symbols、ownership / free、C runtime tests を最小差分で移し、workspace member と Core path dependency を更新する。既存 package name の変更は `OPEN-003` の確認後に別差分で扱う。 | C header compile、runtime、sanitizer、C ABI compatibility review が通り、`crates/c-abi -> crates/core` の dependency graph が成立する。 |
| 4 | **WASM extraction / raw interface cutover completion**。Stage 2 で `crates/core` に一時的に残った `src/wasm.rs`、WASM feature、`wasm-bindgen` / `js-sys` および WASM-specific wiring を `crates/wasm` へ抽出し、Core から WASM-specific dependency と Core 自身の WASM 配布用 `cdylib` を除く。`scripts/build-wasm.sh` の旧 root invocation / output contract を廃止済みとして確認し、root `pkg/` を生成・復活させない。新しい WASM build は `crates/wasm` を artifact source とする内部経路へ切り替える。README から旧 root WASM build 手順を削除または利用不可と明示し、raw WASM が consumer-facing public entry point ではないことを記録する。npm facade の利用方法はまだ完成済み機能として記載せず、必要な場合だけ後続 Stage 7 で提供予定として記録する。 | `crates/wasm -> crates/core` の dependency graph、wasm target build、generated export parity、WASM boundary tests、Core の host-neutral dependency check が通る。Stage 2 の relocation regression とは分離して、WASM extraction 後の binding / artifact source の parity が成立する。root `wasm` feature、root Core `cdylib`、root `pkg/` および旧 raw build interface が存在しないことを確認する。新しい raw generated wasm-bindgen package を consumer-facing entry point にしない。 |
| 5 | root / moved package の remaining tests、fuzz path、scripts、fixture path および README の内部参照を、Stage 2〜4 で確定した path と public distribution policy に合わせて整理する。旧 raw WASM への参照は移行案内以外に残さない。 | Core / C ABI / `crates/wasm` / fuzz の対応検証が新 path で通り、fixture scope が変わっていない。raw WASM compatibility shim、旧 `pkg/` layout または旧 root command への暗黙の fallback がない。 |
| 6 | `crates/node` を作り、Node-API wrapper library、Node-API version、target build、JS value / error / ownership bridge を実装する。C ABI は再利用しない。 | Node-API addon load、Core operation parity、Node version / target matrix が通る。 |
| 7 | `packages/wallet-core` の TypeScript facade、統一 declaration、ESM / CJS wrapper、conditional exports、WASM asset assembly、native manifest assembly を作る。npm facade の実装・検証後に README へ `@nemnesia/symbol-nem-wallet-core` の利用方法、Node / Browser 共通の root entry point、および consumer が backend を直接選択しないことを追加する。 | public root import、raw backend non-export、type resolution、WASM default routing が通り、README の npm facade 記述が実在する実装・検証結果と一致する。 |
| 8 | Node native、Node WASM fallback、Browser WASM の contract parity tests を追加し、wrong password、Store corruption、confirmation、approval、Chain / Network mismatch を比較する。 | security meaning、error、replacement Store、signature bytes、secret return condition が一致する。 |
| 9 | Rust / WASM / Node-API / C ABI の build matrix、npm pack、clean install、ESM / CJS、bundler、`--no-addons`、unsupported target smoke を CI へ組み込む。 | release candidate が同一 source snapshot から再生成できる。 |
| 10 | artifact digest、SBOM、license / dependency review、provenance、GitHub Actions protected release、npm trusted publishing、C ABI release asset を実装する。 | publish 前の supply-chain review が完了し、秘密情報や不要ファイルがない。 |
| 11 | README / migration note / Design / Specification / release documentation の最終整合を確認し、package name note を更新して、公開前の release-readiness review を行う。Stage 4 の旧 raw WASM interface 記述と Stage 7 の npm facade 利用記述が、それぞれの実在する状態と一致していることを確認する。 | upstream security meaning / public contract の差分がないことを確認し、README、migration note、Design、Specification および release documentation の記述が実装・配布状態と一致したうえで、実装移行を完了とする。 |

### 19.3 各段階の共通ルール

- **Buildable dependency graph invariant**: 各段階の完了時点で、repository のその段階における maintained topology の Cargo dependency graph は buildable でなければならない。特に package を廃止・移動する段階では、全ての in-scope path dependency、workspace member、fuzz workspace および直接必要な script / test path が同じ段階内で新しい package を参照することを確認する。root package を先に消し、Core relocation や参照更新を後段へ残す intermediate broken state を stage boundary として定義しない。
- Stage 1 は root Rust package を維持する準備段階である。root virtual workspace 化は Stage 2 の Core relocation、existing Native Binding / fuzz path 更新および workspace member 更新と同時にだけ行う。
- **WASM regression isolation**: Stage 2 は、移動後 `crates/core` に一時的に残る WASM wiring を使う非公開 transitional path で、Core relocation による wasm32 target build / check と relocation 前後の既存 WASM boundary behavior の regression だけを確認する。Stage 4 は、`crates/wasm` への extraction 後に WASM binding / artifact source の parity、Core の host-neutrality および旧 root interface の廃止を確認する。Stage 2 の確認は旧 root raw WASM compatibility、root `pkg/`、旧 script contract または compatibility shim の復活を意味しない。
- DD-002 により、Stage 2 の root package cutover 以後、旧 root raw WASM build interface は maintained public contract ではない。Stage 4 は `crates/wasm` への extraction、旧 `wasm` wiring / root `cdylib` / root `pkg/` の廃止確認および新しい内部 artifact source への切替を完了する段階である。旧 interface をつなぐ compatibility shim を追加して各段階の graph を見かけ上維持しない。
- 新しい Binding を追加する段階でも Core の authorization、secret ownership、Store semantics、failure semantics を再実装しない。
- path move と package rename は別の変更として扱い、既存利用者に影響し得る package name は registry / repository consumer inventory 後に決める。
- ある段階で test / build が失敗した場合、その段階の error を解消してから次へ進み、後段の facade や release workflow で隠さない。
- release build は clean checkout、locked dependency、固定 toolchain、同じ release version で行う。
- migration 中の一時的 compatibility path は、最終 target tree に残す public API または別 Core implementation へ昇格させない。

## 20. Compatibility risks

| risk | 影響 | 緩和策 / gate |
| --- | --- | --- |
| root crate の path change | Rust consumer の path dependency、README、fuzz、CI が壊れる。 | Core package name と API を維持し、`git mv` と manifest update を段階化する。 |
| `symbol-nem-wallet-core-native` の package name change | 既存 Cargo consumer / registry user が解決できなくなる可能性。 | external usage inventory。未確認のまま `-c-abi` へ rename しない。C symbol / header は維持する。 |
| 旧 root raw WASM 経路の廃止 | root package の `--features wasm`、root Core `cdylib`、`scripts/build-wasm.sh`、root `pkg/` および raw generated package を前提とする外部 consumer が利用不能になる可能性。 | DD-002 として互換維持しない意図的な repository / build / distribution interface cutover を確定する。Stage 2 で root package cutover に伴う旧 root interface の維持をやめ、transitional WASM regression validation だけを非公開経路で行う。Stage 4 で `crates/wasm` への extraction、旧 interface の廃止確認、旧 root 手順の README 更新を行い、Stage 7 で実在する npm facade の利用方法を README に追加する。Stage 11 で最終整合を確認する。外部 consumer の存在可能性は inventory と compatibility risk に記録し、旧 interface を無期限に残さない。 |
| `getrandom` target wiring | Browser CSPRNG、native CSPRNG、cross build が変わる可能性。 | Core host-neutral dependency check と target matrix、randomness regression を gate にする。 |
| Node-API ABI / external native dependency | Node version、OS、CPU、libc の一部で addon が load できない可能性。 | Node-API 限定、明示的 target matrix、artifact manifest、unsupported target の WASM fallback。 |
| `node-addons` condition の tool support | 古い Node / TypeScript / bundler が exports を解釈しない可能性。 | supported version floor、`main` / `module` fallback、ESM / CJS / bundler smoke。 |
| native load failure の fallback | arbitrary retry が security error を隠し、backend parity を壊す可能性。 | unsupported target / explicit disable だけ fallback。listed artifact の load failure は fail closed。 |
| npm tarball size | native targets の同梱により install / cache size が増える。 | v1 は単一 facade を優先し、size threshold を測定して optional artifact package を再評価する。 |
| WASM asset bundling | Browser / Extension の relative asset、CSP、worker、MIME の差で初期化に失敗する可能性。 | ESM / bundler / Extension integration smoke。Host architecture は Application 側で設計する。 |
| generated file drift | `.wasm`、JS glue、`.node`、declaration の source mismatch。 | clean release assembly、hash、same commit、package contents review。 |
| public API overexposure | backend-specific type、raw secret、C ABI、internal path に consumer が依存する可能性。 | root `exports` のみ、unified declaration、subpath smoke。 |
| upstream document drift | Node binding の追加が Node.js alternative implementation と誤解される可能性。 | Requirements / Design / Specification impact review を Node stage 前に実施する。 |

## 21. Open decisions

本書で repository topology、依存方向、single npm facade、static routing、v1 fixed version、no postinstall remote artifact および migration sequence は確定する。次の事項は、実装移行前に決定し、未決定のまま public release を行わない。

### 21.1 Resolved

- **OPEN-009 — 解消**: Node.js は Node-API Binding 経由で同じ Rust Wallet Core を利用する v1 supported environment である。`Node.js 代替実装` は Rust Wallet Core と独立した Node.js / TypeScript 等による Wallet Core implementation を意味し、Node-API Binding はこれに含めない。この判断を Concept、Requirements、Architecture、Security Design、Bindings Design および Specification に反映した。
- **DD-001 / DR-001 対応 — 各段階の buildable dependency graph**: Stage 1 は root `symbol-nem-wallet-core` package と現行 Rust / Native / WASM / fuzz topology を維持する workspace preparation とする。Stage 2 で Core package / source / tests の `crates/core` への relocation、root Cargo virtual workspace 化、`crates/core` と existing `bindings/native` の workspace member 化、Native / fuzz の Core path dependency 更新および直接必要な script / test path 更新を同じ atomic stage として完了する。root package を消した後に Core relocation または Native / fuzz path 更新を行う intermediate broken state は定義しない。この判断を §8.1、§19.2、§19.3、§23 に反映した。
- **DD-002 / DR-002 対応 — 旧 root raw WASM interface の意図的 cutover**: v1 の JavaScript 向け正式な consumer-facing entry point は `@nemnesia/symbol-nem-wallet-core` の root entry point だけとする。root `--features wasm`、root Core `cdylib`、root `pkg/`、旧 `scripts/build-wasm.sh` invocation / output contract および raw generated wasm-bindgen package は compatibility contract として維持しない。Stage 2 の root package cutover 以後、旧 root interface を互換 shim で残さず、移動後 Core の非公開 transitional WASM path で relocation regression だけを確認する。Stage 4 で `crates/wasm` を内部 Binding / artifact source として完成させ、旧 interface の廃止を検証し、README から旧 root 手順を削除または利用不可と明示する。Stage 7 で実在する npm facade の利用方法を README に追加し、Stage 11 で README / migration note / Design / Specification / release documentation の最終整合を確認する。これは Core cryptographic behavior、Core Rust public operation semantics、Store format、error semantics、authorization、secret ownership または signing behavior の変更ではなく、repository / build / distribution interface の意図的な切替である。旧 raw WASM consumer の存在可能性は compatibility risk として記録するが、未確認 consumer のために旧 interface を無期限に残さない。この判断を §14.3、§19.1〜§19.3、§20、§23 に反映した。

### 21.2 Remaining open decisions

| ID | 未決定事項 | Gate | 影響 | 決定時期 |
| --- | --- | --- | --- | --- |
| OPEN-001 | Node.js の最低 supported version、Node-API version、ESM / CJS の compatibility floor | Node/npm implementation gate | `exports`、Node-API matrix、`main` / `module` fallback、CI matrix | 段階 6〜7 |
| OPEN-002 | supported OS / CPU / Linux libc / deployment target の最終 matrix | Node/npm implementation gate | `.node` 同梱、WASM fallback、artifact build、package size | 段階 6〜9 |
| OPEN-003 | `symbol-nem-wallet-core-native` の既存外部利用有無と、`c-abi` package name / compatibility alias | monorepo structural migration gate（package rename のみ） | Cargo consumer の破壊的変更、registry package topology | 段階 0〜3。未解決時は既存名を維持して path move 可 |
| OPEN-004 | Node-API wrapper library と exact JS / TypeScript sync・async shape | Node/npm implementation gate | `crates/node` 実装、facade declaration、event loop behavior | 段階 6〜7 |
| OPEN-005 | all-in-one npm tarball の size threshold と、将来 optional platform artifact package を導入する条件 | Node/npm implementation gate | npm topology、install dependency、integrity / provenance | 段階 7〜9 |
| OPEN-006 | runtime native artifact hash verification を行うか | release gate | initialization behavior、failure type、performance、package manifest | 段階 9〜10 |
| OPEN-007 | SBOM format / generator、artifact signing、provenance retention、GitHub release permissions | release gate | supply-chain evidence と release operation | 段階 9〜10 |
| OPEN-008 | Browser bundler、Browser Extension、CSP、worker context の supported integration baseline | Node/npm implementation gate | WASM asset loading、README、integration test | 段階 7〜9 |

OPEN-001、OPEN-002、OPEN-004、OPEN-005 および OPEN-008 は Node/npm 実装開始前に解決する。OPEN-006 と OPEN-007 は release gate の項目であり、構造移行や Node/npm 実装の開始を止めない。OPEN-003 は package name 変更の判断に限って構造移行を拘束し、既存名を維持する path move は阻害しない。

## 22. Traceability と参照資料

### 22.1 要求・設計との対応

| 本書の設計領域 | 追跡先 |
| --- | --- |
| Core が継続 secret owner、通常非開示、per-operation authorization | `docs/consept/concept-sheet.md` §1、§3、§7〜§10; `docs/requirements/requirements.md` §2、SEC-001〜SEC-023、AC-007、AC-025〜AC-032、AC-037、AC-049〜AC-050; `docs/design/architecture.md` §3〜§6; `docs/design/security.md` §3〜§8 |
| Binding thin / non-authoritative、依存方向、Native C ABI / Node-API / WASM 共通 boundary | `docs/requirements/requirements.md` §2.2、NFR-001〜NFR-004、AC-023〜AC-024、AC-040、AC-043; `docs/design/architecture.md` §3〜§4; `docs/design/security.md` §3〜§4; `docs/design/bindings.md` §3〜§9; `docs/specifications/specification.md` §13 |
| Store opaque、replacement、current Store authority、no migration | `docs/requirements/requirements.md` SEC-004〜SEC-005、SEC-018、AC-045、AC-048; `docs/design/architecture.md` §5〜§6、§9.3; `docs/design/security.md` §6.5〜§6.6; `docs/specifications/wallet-store-format-v1.md` |
| Initial Mnemonic handoff、explicit export、signing approval | `docs/requirements/requirements.md` FR-001、FR-009、FR-022〜FR-023、SEC-010、SEC-021〜SEC-022、AC-034、AC-041〜AC-042、AC-050; `docs/design/bindings.md` §6; `docs/specifications/specification.md` §8〜§10、§13 |
| Symbol / NEM、Mainnet / Testnet、signature / interop | `docs/requirements/requirements.md` §3; `docs/specifications/specification.md` §3〜§5、§9、§14 |
| Rust / Native C ABI / Node-API / WASM の既存・下流契約 | `docs/design/bindings.md` §4〜§10; `docs/specifications/specification.md` §13; current `bindings/native/`、`src/wasm.rs`、README。Node-API の具体契約は未確定であり、本書の下流 gate で決定する。 |

### 22.2 Review finding への対応

| Finding | 本書での resolved decision / 対応箇所 | 次回 review での確認点 |
| --- | --- | --- |
| [DR-001](../reviews/design/monorepo-npm-distribution-design-review-001.md#L76) | DD-001、§8.1、§19.1〜§19.3、§23。Stage 1 は root package 維持、Stage 2 は Core relocation・root virtual workspace 化・Native / fuzz path 更新を atomic に扱う。 | Stage boundary ごとの buildable dependency graph と、root virtual workspace 時点の `crates/core` / existing Native Binding / fuzz の解決先が一意であること。 |
| [DR-002](../reviews/design/monorepo-npm-distribution-design-review-001.md#L88) | DD-002、§14.3、§19.1〜§19.3、§20、§23。旧 root raw WASM interface は互換維持せず、Stage 2 は非公開 transitional regression、Stage 4 は extraction / 旧手順の README 更新、Stage 7 は実在する npm facade の利用方法、Stage 11 は最終文書整合、`crates/wasm` は npm facade の内部 source とする。 | root `wasm` feature / Core `cdylib` / root `pkg/` / 旧 build contract の廃止方針、raw consumer risk、Stage 2 / 4 の WASM regression 分離、README 更新順が決定済みであること。 |

### 22.3 External primary references

- [Node.js Modules: Packages](https://nodejs.org/api/packages.html): `exports`、`types`、`node-addons`、`default`、condition order および `--no-addons`。
- [Node.js Node-API](https://nodejs.org/api/n-api.html): ABI stability と Node-API 以外の native API / external library の制約。
- [npm `package.json`](https://docs.npmjs.com/files/package.json/): `files`、optional dependency 等の package metadata。
- [npm publish](https://docs.npmjs.com/commands/npm-publish/): `npm pack --dry-run` による公開 contents の確認。
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/): source / build / publisher の provenance evidence。
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/): GitHub Actions / OIDC による publish authentication と provenance。

## 23. Implementation migration readiness

DR-001 と DR-002 の設計上の修正は本書へ反映済みであり、次回の正式 Design Review に再提出できる状態である。ただし、再レビューの承認前に monorepo の structural migration を開始しない。Node/npm implementation と release も、それぞれの gate が解決するまで開始しない。開始条件と残存事項は次のとおりである。

- monorepo structural migration gate として、次回の正式 Design Review を承認し、本書の target tree、依存方向、responsibility、各段階の buildable dependency graph、既存 Rust / C ABI / WASM public contract および Rust / Native / fuzz / 旧 raw WASM を含む external consumer inventory を確認する。`OPEN-003` 未解決時は既存 C ABI package name を維持し、package rename だけを延期する。DR-001 / DR-002 の設計判断自体は追加の OPEN 項目として残さない。
- Node/npm implementation gate として、`OPEN-001`、`OPEN-002`、`OPEN-004`、`OPEN-005` および `OPEN-008` を解決し、必要な下流仕様・package contract への impact を記録する。
- release gate として、`OPEN-006`、`OPEN-007`、全 target artifact、package contents、integrity、SBOM、provenance および release workflow の review を完了する。
- structural gate 承認後にのみ migration Stage 1 を開始し、Stage 1 は root Rust package を維持する。Stage 2 では DD-001 に従い Core relocation、root virtual workspace 化、existing Native Binding / fuzz path 更新を一つの atomic stage として実施する。Stage 4 では DD-002 に従い旧 root raw WASM interface を廃止し、`crates/wasm` を npm facade の内部 source として確立する。

したがって、本設計修正の完了時点の判定は **DR-001 / DR-002 の対応を反映し、正式 Design Review の再レビューが可能、monorepo structural migration は未開始、Node/npm implementation と release も未開始** である。旧 raw WASM consumer の存在可能性は残存 compatibility risk だが、互換維持を未決定事項としては扱わない。

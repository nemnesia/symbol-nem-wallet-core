# Node/npm implementation gate decision record

## 1. Scope

本書は、Stage 6 の `crates/node` 実装および後続の npm facade 実装を開始する前に、承認済みモノレポ移行設計が未決定事項として残していた `OPEN-001`、`OPEN-002`、`OPEN-004`、`OPEN-005` および `OPEN-008` を、ユーザー承認済みの実装可能な decision として確定記録する decision artifact である。

本書はコード、Cargo manifest、npm manifest、CI、package、公開 API または仕様を変更しない。ここでの推奨は実装開始前の判断材料であり、Stage 6 / 7 の実装結果や release gate の合格を意味しない。

確認日: 2026-09-01
評価対象の開始 HEAD: `b5887714e12f00614fc5a58315a48bec7a8b630c` (`agent/monorepo-migration`)
今回のdecision確定更新開始 HEAD: `f47cd8105029429597763fbf3fe37d7c0eb932f2` (`agent/monorepo-migration`)
Decision status: `READY`

Status は次の3値で記録する。

- `RECOMMENDED`: 技術的な根拠から実装開始時の採用案を一つに絞れる。
- `NEEDS USER DECISION`: 製品の対応範囲、コストまたは公開互換性をユーザーが確定する必要がある。
- `DEFERRED`: 現在の implementation gate の対象外であり、後続 gate で決定する。

## 2. Current confirmed constraints

### 2.1 承認済み設計から変えないこと

- `symbol-nem-wallet-core` が唯一の security authority であり、暗号、Store、password authentication、authorization、key derivation、signing、duplicate detection、Chain / Network policy および failure semantics を所有する。
- Node-API、WASM および C ABI は thin / non-authoritative Binding である。Node-API は C ABI を JavaScript FFI として再利用せず、`crates/node` は `crates/core` だけを参照する。
- public npm entry point は将来の `@nemnesia/symbol-nem-wallet-core` root entry point 一つとする。raw WASM、C ABI、Node addon、backend-specific internal path を consumer-facing entry point にしない。
- native artifact と WASM artifact は npm package に同梱し、install 時の remote download、postinstall compile および利用者環境での Cargo 実行に依存しない。
- routing は static conditional exports とし、native addon が明示的に無効または対象外の場合に WASM branch を選べる。supported target での addon missing、hash mismatch、load failure、initialization failure または Core operation failure を WASM retry で隠さず、fail closed とする。
- Browser / Browser Extension は WASM を使う。Browser 側の WASM は remote code ではなく、consumer application の build に含める local asset でなければならない。
- Core の operation、error、warning、secret return condition、replacement Store、ownership、lifecycle および Symbol / NEM の意味は backend 間で一致させる。

### 2.2 正本と今回の判断範囲

作業手順と docs-only validation は [`AGENTS.md`](../../AGENTS.md) に従う。責務、trust boundary、Core ownership、依存方向および guarantee boundary は、[`architecture.md`](../design/architecture.md)、[`security.md`](../design/security.md)、[`bindings.md`](../design/bindings.md) を基準にする。外部可視 operation、error、WASM / Native の buffer 契約および Core semantics は [`specification.md`](../specifications/specification.md) を基準にする。monorepo topology、Stage sequence、single facade、fallback、artifact 同梱および OPEN 項目は [`monorepo-npm-distribution-design.md`](monorepo-npm-distribution-design.md) とその承認済み review である [`monorepo-npm-distribution-design-review-002.md`](../reviews/design/monorepo-npm-distribution-design-review-002.md) を基準にする。

既存設計は Node.js version、target matrix、Node-API wrapper library、exact JavaScript / TypeScript shape、tarball threshold および Browser integration baseline を未確定として下流 gate に委譲している。本書はその委譲を埋めるための候補を示すが、Core / C ABI / WASM の既存 security semantics を変更しない。

### 2.3 公式資料の確認範囲

Node.js の release status と Node-API の ABI 方針は、確認日現在の [Node.js Release Working Group の release schedule](https://github.com/nodejs/Release) と [Node-API documentation](https://nodejs.org/api/n-api.html) を確認した。package routing は [Node.js Modules: Packages](https://nodejs.org/api/packages.html) を確認した。

候補 library は、公式の [napi-rs repository](https://github.com/napi-rs/napi-rs)、[napi-rs getting started](https://github.com/napi-rs/website/blob/main/pages/en/docs/introduction/getting-started.md)、[Neon repository](https://github.com/neon-bindings/neon) および [node-bindgen repository](https://github.com/infinyon/node-bindgen) を確認した。Browser / bundler / Extension は、[Vite WebAssembly guide](https://vite.dev/guide/features)、[webpack asset modules](https://webpack.js.org/guides/asset-modules/)、[webpack WASM loading configuration](https://webpack.js.org/configuration/output/)、[esbuild browser API](https://esbuild.github.io/api/)、[MDN Baseline](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility)、[Chrome MV3 remote-hosted code policy](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code) および [Chrome Extension CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy) を確認した。Native target のrunner状態は、[GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)、[Windows ARM64 GA announcement](https://github.com/actions/runner-images/issues/14592) および [runner images](https://github.com/actions/runner-images/blob/main/README.md) を確認した。

## 3. OPEN-001 — Node.js / Node-API / module baseline

**Status: `RECOMMENDED`**（ユーザー承認済み。exact consumer runtime patch floor だけは Stage 7 へ委譲する。）

### 3.1 確認できた Node.js の状態

2026-09-01 時点の公式 release schedule では、Node.js 22.x は Maintenance LTS、24.x は Active LTS、26.x は Current である。production では Active LTS または Maintenance LTS を使うという Node.js の方針に沿うと、v1 の primary release line は 24.x、互換対象の保守 line は 22.x とするのが自然である。26.x は Current のため、v1 の必須 floor ではなく、release line の昇格後に追加確認する対象とする。

Node-API は JavaScript engine から独立した ABI-stable API であり、Node.js 公式資料は、古い Node-API version でビルドした addon が後続 Node.js で再コンパイルなしに動作できる設計を説明している。Node-API v8 は Node.js 12.22.0 以降、v10 は Node.js 22.14.0 以降で利用できる。v9 以降も後続 Node.js が過去の version を提供する互換方針である。

### 3.2 推奨案

| 項目 | 推奨 | 理由 / gate |
| --- | --- | --- |
| minimum supported Node.js release line | **22.x LTS** | 22.x を Maintenance LTS の互換 floor として残し、24.x だけに狭めない。consumer runtime の exact patch floor は、Node-API v8、facade の JavaScript syntax および package contract の必要性を Stage 7 で確認して固定する。 |
| primary supported release line | **24.x Active LTS** | v1 の通常 CI / release / smoke test の主対象とする。26.x は Current のため必須 target にしない。 |
| Node-API version | **v8** | Core operation に必要な Buffer / TypedArray bridge は v8 の範囲で成立する。新しい Node-API version に依存せず、22 / 24 / 後続 line を同じ addon で扱う。N-API version と Node.js major ごとの再ビルドを結びつけない。 |
| build / release tooling | **採用する `@napi-rs/cli` version の `engines` を満たす Node.js** | 現行公式 tooling documentation の CLI requirement（`^20.17.0 || ^22.13.0 || >=23.5.0`）は build / release environment のもの。これを consumer runtime の minimum patch floor の根拠にしない。 |
| ESM | **supported** | facade の `import` root entry point を正式経路とする。backend-specific path は公開しない。 |
| CommonJS | **supported** | facade の `require` root entry point を同じ contract で提供する。 |
| native ABI policy | **Node-API only** | V8、Node internal API、`nan`、Node major 固有 ABI を使用しない。`.node` は OS / CPU / libc target ごとに作るが Node.js major ごとには作らない。 |

`@napi-rs/cli` の CLI requirement（現行公式資料にある `^20.17.0 || ^22.13.0 || >=23.5.0`）は CLI / build tooling を実行する環境の requirement であり、生成された Node-API addon を利用する consumer runtime の requirement ではない。consumer runtime は Node 22.x release line を minimum として推奨し、exact patch floor と `engines.node` は、Node-API v8、facade の JavaScript syntax および package contract を Stage 7 で確認して固定する。採用 CLI version の build environment は、その CLI の `engines` を満たさなければならない。

### 3.3 module routing

将来の package `exports` は、概念的に `import` / `require` の両方を root facade へ解決し、Node.js native branch と universal WASM branch を条件付きで選ぶ。Node.js 公式の `node-addons` / `default` の考え方に従い、`default` はより universal な WASM enhancement として扱う。`--no-addons` は native addon を使わない明示条件であり WASM branch を選択してよい。

ただし、supported target で native artifact のロード、初期化または Core operation が失敗した場合は、module resolution 時の「target に artifact が存在しない」ケースと区別する。その場合に silent WASM retry をしてはならない。

## 4. OPEN-002 — native target matrix

**Status: `RECOMMENDED`**（ユーザー承認済み。v1 native必須 target と、当面のWASM fallback targetを以下のとおり固定する。）

### 4.1 推奨 v1 matrix

| Target | 分類案 | 判断 |
| --- | --- | --- |
| Windows x64 | **v1 必須** | 最も広い Windows desktop 利用を対象にする。GitHub-hosted x64 runner で build / native smoke を行う。 |
| Windows arm64 | **v1 native非必須 / WASM fallback** | `windows-11-vs2026-arm` は 2026-08-20 時点で Generally Available。v1 native artifactには当面含めず、target manifestに存在しないunsupported native targetとしてWASM fallbackを許可する。将来の追加はnative addon runtime smoke、package size、target matrixの製品範囲および実利用需要で再評価する。 |
| macOS x64 | **v1 必須** | Intel macOS 利用者との互換性を維持する。x64 runner で build / smoke を行う。 |
| macOS arm64 | **v1 必須** | Apple Silicon が主流であり、arm64 runner で build / smoke を行う。community action の arm64 compatibility は個別に確認する。 |
| Linux x64 glibc | **v1 必須** | server / desktop の主要 target。glibc baseline を明記し、native smoke を実施する。 |
| Linux arm64 glibc | **v1 native非必須 / WASM fallback** | `ubuntu-24.04-arm` / `ubuntu-22.04-arm` 等の GitHub-hosted Linux ARM64 runner label が存在し、GitHub-hosted runners referenceではこれらはPublic previewと表記されている。当面native artifactには含めず、target manifestに存在しないunsupported native targetとしてWASM fallbackを許可する。将来の追加はarm64 native smoke、glibc baseline、runner maturity、package sizeおよび実利用需要で再評価する。 |
| Linux x64 musl | **fallback-only** | musl 固有の配布・smoke・互換性を v1 native artifact に含めず、対象外 target では WASM を使う。実績が得られた場合だけ再評価する。 |
| Linux arm64 musl | **fallback-only** | x64 musl と同じ。最初から native artifact を同梱せず、追加 target として deferred にする。 |
| 上記以外の OS / CPU / libc | **将来対応** | v1 の package size と smoke matrix を増やさない。WASM fallback の対象とする。 |

この確定方針は、初期 native artifact 4個（Windows x64、macOS x64、macOS arm64、Linux x64 glibc）だけをv1必須とする。Windows arm64 / Linux arm64 glibc / Linux muslは当面native artifactに含めず、unsupported native targetとしてWASM fallbackを許可する。Windows ARM64 runnerのGA statusは、v1 native必須化の判断理由にはしない。将来の追加は、addonの正しいload、runtime smoke、native dependency、artifact provenance、package size、runner maturityおよび実利用需要のevidenceを得た後に別decisionで再評価する。Linux ARM64については、使用するrunner labelがPublic preview表記であることをbuild / smokeの運用前提として記録する。

### 4.2 target gate

必須 target は同じ release commit から build し、各 target で少なくとも addon load、代表 operation、error / warning、Buffer ownership の smoke を実行する。cross compile のみ成功した target は「buildable」であって「v1 supported」ではない。target ごとの `.node` は npm facade tarball に同梱し、target manifest と digest の対象にする。

Linux は glibc の最低 runtime baseline を target policy として別途明記する。musl native artifact を追加するまで、unsupported target と `--no-addons` は WASM fallback の同じ条件で扱う。native load failure を fallback 条件へ広げない。

## 5. OPEN-004 — Node-API wrapper library

**Status: `RECOMMENDED`** — `napi-rs` を採用する。

### 5.1 比較

| 候補 | Node-API / ABI | Buffer / TypedArray と ownership 制御 | tooling / target | maintenance / surface 評価 |
| --- | --- | --- | --- | --- |
| **napi-rs** | Node-API を使用し、`napi1`〜`napi10` の feature で API floor を選べる。v8 を明示すれば Node major ごとの build を避けられる。 | `Buffer`、`Uint8Array` / TypedArray、`Result` を扱える。低レベル value API と明示的な copy を選択し、secret input / output の境界を wrapper code で固定しやすい。 | `napi-build` と公式 `@napi-rs/cli` の build / target template があり、`.node` と loader / declaration を生成できる。公開 facade の JS wrapper は採用せず、自前の thin facade に限定できる。 | 公式 repository と release history で 2026-08 時点の v3 系更新を確認でき、Rust / Node-API ecosystem の候補として最も実装 evidence が多い。依存は増えるため lockfile、license、SBOM を review する。 |
| Neon | Node.js の current / maintenance release と Node-API を対象とする Rust binding。 | Rust value API による明示的変換は可能。高水準の context / handle model が ownership 制御を補助するが、今回の Buffer copy / failure-safe contract を個別に検証する必要がある。 | Linux / macOS / Windows を公式に案内し、generator / npm tooling がある。 | 活動中の有力な代替だが、既存 WASM と同じ boundary を最小 surface で揃える実装比較が必要なため deferred。 |
| node-bindgen | Node-API v8 を使用し、Node.js major ごとの再コンパイルを不要にする。 | Rust type から自動 conversion できる一方、generated glue と `tslink` の規約に ownership / copy / failure mapping を依存し過ぎない設計が必要。 | `nj-cli`、build script、generated C glue、必要に応じて `tslink` が必要。Linux / macOS / Windows を案内する。 | 公式資料は v6.1.0 / N-API v8 を示すが、napi-rs と比較して現在の target / release / ecosystem evidence が少ない。候補から除外はしないが、今回の gate では deferred。 |

### 5.2 推奨理由と採用条件

`napi-rs` を推奨する理由は、Node-API を直接の ABI boundary とし、Buffer / TypedArray の conversion を Rust 側で検証しながら、build tooling を `.node` target assembly に限定できることにある。generated JS / declaration は便利な補助であり、public contract の authority にはしない。特に次を実装条件とする。

- `crates/node` は `symbol-nem-wallet-core` だけを dependency とし、`crates/c-abi` を参照しない。
- Node-API floor は v8 とし、V8 API、Node internal API、Node major 固有 ABI を使わない。
- caller の `Buffer` / `Uint8Array` は呼出し中だけ借用し、Core に渡す必要な copy を明示する。Core 外へ返す byte buffer の ownership、copy、zeroization の扱いは既存 Native / WASM の security meaning と同等に記録する。
- conversion、allocation、ownership、lifecycle の失敗は `BindingFailure` として扱い、部分 output や secret を返さない。
- `napi-rs` が生成する loader / TypeScript は内部補助に留め、consumer-facing contract は後続 `packages/wallet-core` の統一 facade が所有する。

### 5.3 version の扱い

ここで `napi-rs` の crate / CLI の具体的な version を lock しない。実装開始時に release candidate の最新安定版を一次資料、MSRV、Node-API v8、target matrix、依存 license、SBOM および reproducible build の条件で固定する。version を決めること自体は Stage 6 の dependency change であり、本書の docs-only 変更には含めない。

## 6. OPEN-004 — public JavaScript / TypeScript API shape

**Status: `RECOMMENDED`** — ユーザー承認済み。v1 は function-based synchronous API とし、native / WASM backend の差を facade 内に隠す。

### 6.1 比較

| 形 | 評価 | v1 判断 |
| --- | --- | --- |
| function-based + sync | Core operation が local CPU 処理で network I/O を行わず、Core の operation boundary と 1 対 1 に対応しやすい。failure / replacement Store / warning をその場で返せる。 | **採用推奨** |
| function-based + Promise / async | event loop blocking を避けられる可能性はあるが、worker / task lifecycle、input copy の保持期間、cancellation、error timing および test parity が増える。 | v1 public contract には含めず **deferred** |
| class-based | Store / secret lifecycle を facade が所有する誤解を生み、stateful session、cache、authorization の複製へ誘導しやすい。 | v1 では **採用しない** |
| class + async | 上記二つの複雑性を合わせ、Core が持たない継続 unlocked state を facade に持ち込みやすい。 | **deferred** |

### 6.2 公開 shape の推奨

- root facade は既存 Core / WASM operation set に対応する named functions を公開する。operation 名、引数の意味、result field、error code、warning、secret return condition、replacement Store および confirmation / approval field は既存仕様から変更しない。
- Node native と WASM は同じ function contract と同じ security meaning を返す。backend-specific class、native handle、raw addon object、raw wasm-bindgen object、C ABI DTO を public type にしない。
- local CPU 処理の完了を同期 return で表現し、Promise 化を「便利な wrapper」として暗黙に追加しない。重い処理が実利用上問題になる場合は、worker を使う別の Application integration または明示的な後続 API decision とする。
- exact TypeScript declaration、result / error の JavaScript 表現および function naming は Stage 7 の facade specification で existing operation inventory と照合して固定する。本書は operation の追加・削除・rename を承認しない。

この決定は Node native と Browser WASM の演算意味を揃えるための execution-shape の決定であり、Core の暗号、認証、authorization、signing、Store decode または Chain / Network policy を JavaScript 側へ移すものではない。

## 7. OPEN-005 — all-in-one tarball threshold

**Status: `RECOMMENDED`**（ユーザー承認済み。single tarball と再評価 thresholdを以下のとおり固定する。）

### 7.1 現時点の方針

v1 は supported native `.node` と WASM artifact、glue、declaration を一つの `@nemnesia/symbol-nem-wallet-core` tarball へ同梱する。現時点では per-platform npm package へ変更しない。target 不支持時の WASM fallback を package topology に持たせることで、optional platform package を必須にしない。

Stage 6〜7 の artifact はまだ生成されていないため、以下は測定値ではなく、実装開始時に使う初期予算と再評価条件である。

| 測定項目 | 初期計画値 | 再評価条件 |
| --- | ---: | --- |
| native `.node` artifact 数 | 必須4、推奨を含む場合は最大6 | **7個以上**になったら single tarball を再評価 |
| 1 native artifact の unpacked size | 15 MiB 以下を計画 budget とする | **15 MiB 超**の artifact があれば原因と target inclusion を再評価 |
| WASM artifact + glue | WASM 10 MiB、glue / declaration 2 MiB 以下を計画 budget とする | **合計12 MiB 超**なら compression、optimization、asset assembly を再評価 |
| `npm pack` tarball size | 50 MiB 未満を目標とする | **50 MiB 以上**なら single tarball を再評価 |
| package unpacked size | 150 MiB 未満を目標とする | **150 MiB 以上**なら single tarball を再評価 |

artifact 数は native `.node` の数だけを数え、WASM / JS / declaration は別に計測する。サイズは `npm pack --json` と clean package の unpacked file inventory で測り、debug symbol、source、test fixture、Cargo target の中間物を tarball に含めない。gzip 圧縮率を事前に仮定して合否を決めない。

### 7.2 threshold 到達時の扱い

いずれかの再評価条件に到達しても、自動的に per-platform npm package へ変更しない。次の選択肢を比較して、ユーザーが再決定する。

1. target matrix を縮小し、unsupported target は WASM fallback とする。
2. compression / release stripping / package contents allowlist を見直す。
3. single facade を維持しつつ、platform artifact package を optional dependency として分離する。
4. per-platform package 方式へ変更する。

3 と 4 は現在 `DEFERRED` であり、artifact digest、install behavior、offline install、provenance、package manager compatibility を含む別 decision を要する。

## 8. OPEN-008 — Browser baseline

**Status: `RECOMMENDED`**（ユーザー承認済み。v1のBrowser / Browser Extension baselineを以下のとおり固定する。）

### 8.1 推奨 baseline

- **modern evergreen**: release 時点で、Chrome desktop / Android、Edge desktop、Firefox desktop / Android、Safari macOS / iOS の各 current stable と previous major を対象にする。legacy browser、IE、古い embedded WebView は v1 対象外とする。より安定した基準として、機能 availability は MDN Baseline Widely Available 相当を最低条件にする。
- **WebAssembly**: `WebAssembly` JavaScript API と local packaged binary の compile / instantiate を必須とする。remote fetch に依存せず、bundler が出力した local asset または inlined bytes を使う。
- **ES module**: Browser facade は ESM を primary module form とする。CommonJS は Node facade の互換形であり、Browser integration の前提にしない。
- **bundler**: 特定 bundler の runtime API を facade contract にしない。package は local WASM asset を build graph に取り込める形で提供し、application 側の URL / asset handling に依存する箇所を明示する。
- **Browser Extension / Manifest V3 (MV3)**: extension package 内に JS glue と WASM を同梱し、remote hosted code と remote WASM を禁止する。MV3 service worker は利用可能な execution context とするが、package が service worker の寿命・storage・message routing を所有しない。
- **CSP**: `eval`、`new Function` および remote script を要求しない。Chrome MV3 extension pages で WASM を実行する場合は、対象 extension の CSP に `wasm-unsafe-eval` を明示する必要がある。既存 Extension の CSP を facade が勝手に変更することはできないため、integration documentation / smoke で確認する。
- **worker**: v1 では worker は **任意**。WASM facade は main thread と worker の双方で初期化できることを目標にするが、worker がないことを理由に backend semantics を変えない。高負荷処理を UI thread から退避する責任は Application 側に置く。
- **Node `--no-addons` 共用条件**: Node.js で addon を明示的に無効にした場合、または target manifest に native artifact がない場合だけ WASM branch を選ぶ。supported target の addon load / initialization / operation failure は fail closed とし、WASM retry に変換しない。

### 8.2 bundler 比較と v1 gate

| Bundler | 公式資料で確認できる WASM / asset model | v1 の扱い |
| --- | --- | --- |
| Vite | `.wasm` の direct ESM import、`?init`、`?url` および static asset handling を案内する。 | **必須 smoke**。local asset が production output に含まれ、facade の初期化と代表 operation が通ることを確認する。 |
| webpack 5 | `asyncWebAssembly`、`wasmLoading`、`webassemblyModuleFilename` と Asset Modules / `new URL(..., import.meta.url)` を提供する。 | **必須 smoke**。webpack 固有設定を public API に漏らさず、生成 `.wasm` の URL / load を確認する。 |
| esbuild | Browser API は ESM と local WASM URL を使う設計を説明する。一般の wasm-bindgen runtime contract を自動で定めるものではない。 | **必須 smoke**。explicit asset URL / copy strategy を使い、facade が remote URL や bundler-specific global に依存しないことを確認する。 |

v1 release gate は、全 browser version と全 bundler version の組み合わせを CI することではない。次を最小 gate とする。

1. Browser baseline の一つの代表 current browser で、Vite / webpack 5 / esbuild の production build が local WASM を同梱する。
2. Browser runtime で ESM import、WASM initialization、代表 Core operation、Core error、Store replacement、secret byte lifecycle を確認する。
3. MV3 fixture で extension page または service worker から local WASM を初期化し、CSP と package contents を確認する。
4. remote URL、postinstall download、CDN runtime、未同梱 asset を失敗として検出する。

Browserのcurrent stable / previous major、legacy browser / old embedded WebViewのv1対象外、MV3 local WASM / CSP smokeおよびworker optionalの方針は確定済みである。個別ApplicationのExtension page / service worker / storage architectureは本artifactの対象外であり、既存設計どおりApplication側へ委譲する。

## 9. Approved decision set

| ID / 項目 | 推奨決定 | Status |
| --- | --- | --- |
| OPEN-001 / Node.js | minimum release line は Node 22.x、primary は Node 24.x Active LTS、26.x は optional compatibility check。exact consumer runtime patch floor は Stage 7 で固定し、`@napi-rs/cli` の build requirement と分離 | `RECOMMENDED` |
| OPEN-001 / Node-API | Node-API v8、Node major ごとの addon rebuild なし | `RECOMMENDED` |
| OPEN-001 / modules | ESM / CommonJS の両方を root facade で support。conditional exports は native `node-addons` と universal `default` WASM を静的 routing | `RECOMMENDED` |
| OPEN-002 / target | v1 native必須4: Windows x64、macOS x64、macOS arm64、Linux x64 glibc。Windows arm64 / Linux arm64 glibc / muslは当面unsupported native targetとしてWASM fallback | `RECOMMENDED` |
| OPEN-004 / wrapper | `napi-rs`、Node-API v8、明示的 Buffer / TypedArray copy / failure mapping | `RECOMMENDED` |
| OPEN-004 / public API | backend-neutral function-based synchronous API。class、implicit Promise 化、backend-specific type は v1 に入れない | `RECOMMENDED` |
| OPEN-005 | supported native artifact と WASM を single facade tarball に同梱し、50 MiB compressed、150 MiB unpacked、native 7 artifacts を再評価 threshold とする | `RECOMMENDED` |
| OPEN-008 | evergreen current / previous major、WebAssembly + ESM、local asset、MV3 / CSP、Vite / webpack 5 / esbuild smoke。worker は任意 | `RECOMMENDED` |

## 10. Alternatives rejected / deferred

### 10.1 今回採用しない案

- Node.js major ごとに native addon を再ビルドする方式。Node-API の ABI stability を使う設計目標に反するため採用しない。
- V8、Node internal API、`nan` または C ABI を Node public boundary の基礎にする方式。ABI stability、責務分離および C ABI / Node-API の独立性を損なうため採用しない。
- `native load failure -> WASM retry`。load failure、初期化失敗、hash mismatch または Core operation failure を隠し、artifact integrity と fail-closed semantics を壊すため採用しない。
- Node / TypeScript で crypto、Store decode、authentication、authorization、signing、key derivation、duplicate detection または Chain / Network authority を実装する方式。Core authority を複製するため採用しない。
- raw WASM、C ABI、Node addon の直接 export。single facade の public boundary と backend-neutral contract を壊すため採用しない。
- 最初から per-platform npm package へ分割する方式。single tarball 方針と現在の設計 sequence を変更するため、threshold 到達まで採用しない。

### 10.2 Deferred

- `napi-rs` の具体 crate / CLI version、Rust MSRV、exact `Cargo.toml` feature。Stage 6 dependency gate。
- Node 26.x の Active LTS 昇格後の primary support への切替。release line review。
- Windows arm64 / Linux arm64 glibc のnative artifact追加。実機 smoke、runner maturity、cost、tarball size、利用者 evidenceの確認後に別decisionで再評価する。
- Linux musl native artifact、追加 OS / CPU target、platform-specific npm package。OPEN-005 の threshold review。
- exact TypeScript declarations、error class / result object の命名、conditional exports の完全な JSON。Stage 7 facade specification。
- 個別Browser versionのpinning、Application固有のWebView統合、およびMV3 service worker / dedicated workerの実装詳細。これは確定済みbaselineを実装へ適用する際の後続integration detailであり、user decisionではない。
- artifact hash verification、SBOM format、signing、provenance retention および publish permission。`OPEN-006` / `OPEN-007` の release gate。

## 11. Security impact

本書の推奨は、Core の security semantics を変更しない。security invariant は次のとおりである。

```text
Node-API Binding ──> crates/core
WASM Binding     ──> crates/core
```

- Node-API から `crates/c-abi` を呼ばない。C ABI の symbol、header、ownership / free contract は Node/npm 実装の authority ではない。
- Node-API / WASM / facade は、Core の crypto、password authentication、Store decode、signing policy、key derivation、duplicate detection、Chain / Network authority を再実装しない。
- `Buffer` / `Uint8Array` の conversion は representation / ownership mediation に限定し、Core が返す secret return condition、failure-safe output、replacement Store、warning および error code を変更しない。
- Node.js native addon は WASM より強い secret isolation boundary ではない。Node.js host process、OS、Browser または Application の compromise は Core の保証外だが、通常処理での non-disclosure、不要な copy / retention の禁止および authorization boundary は維持する。
- public facade は user intent、confirmation、approval、current Store、secret lifecycle または authorization の authority にならない。stale assertion、password authorization、pending state を cache して別 operation へ渡さない。
- Browser / Extension では WASM asset と JS glue を package / application に同梱し、remote code / remote WASM を実行しない。CSP は eval なしを維持し、Extension 側の `wasm-unsafe-eval` は必要な場合に明示的に設定して review する。

## 12. Compatibility impact

- Core crate name、Core version、Rust public API、Store format、error semantics、C ABI package name、C symbols、WASM export set、JS-visible operation semantics は変更しない。
- Node-API v8 を使うことで、Node.js major ごとの native rebuild を要求せず、後続 Node.js が v8 を提供する限り同じ addon を使用できる。ただし OS / CPU / libc の binary compatibility は別であり、target artifact を個別に build / smoke する。
- ESM / CommonJS の両方を root facade で提供するが、raw backend path、C ABI、raw WASM は新しい public compatibility contract にしない。
- unsupported target と explicit `--no-addons` は WASM fallback になる。listed native artifact の missing / corrupt / load / initialization / operation failure は silent fallback せず、利用者に明示的な failure を返す。
- single tarball の threshold を超えた場合の package topology 変更は、今回の推奨だけでは発生しない。別の user decision と compatibility review が必要である。
- Browser は modern evergreen + ESM + WebAssembly を前提にし、legacy browser / remote runtime / unreviewed extension code を v1 contract に含めない。

## 13. Implementation consequences

Stage 6 を開始する場合、少なくとも次を implementation plan と test plan に反映する。

1. `crates/node` を新規作成し、`symbol-nem-wallet-core` への一方向 dependency と `napi-rs` Node-API v8 binding を実装する。C ABI の FFI reuse は行わない。
2. 4必須 target（Windows x64、macOS x64、macOS arm64、Linux x64 glibc）について、同じ source snapshot から `.node` を生成し、native load / operation / error / ownership smoke を行う。Windows arm64、Linux arm64 glibc および musl は当面WASM fallbackとし、追加native targetは別decisionで再評価する。
3. Node-API wrapper は Core operation の入力・出力・error・warning・replacement Store を 1 対 1 で bridge し、Buffer / TypedArray を明示的に検証・copy する。security logic、Store schema 解釈、secret cache は追加しない。
4. Stage 7 の facade は function-based sync contract を root entry point として assembly し、ESM / CommonJS、`node-addons` / `default` routing、`--no-addons`、unsupported target および fail-closed error を検証する。
5. WASM asset は npm package / browser build に同梱し、Vite / webpack 5 / esbuild と MV3 の minimal smoke fixture で local asset、CSP、worker optionality および no-remote-code を確認する。
6. `npm pack --json`、unpacked inventory、artifact count、hash、SBOM、provenance および clean install を release gate へ接続する。threshold 到達時は package split を自動決定しない。

これらは implementation consequences であり、今回の commit でファイルや依存関係を変更するものではない。

## 14. Remaining user decisions

**残存するユーザー判断: 0件。**

ユーザー承認により、OPEN-001、OPEN-002、OPEN-004（wrapper / public API）、OPEN-005およびOPEN-008の implementation gate decision は確定した。exact version、MSRV、runtime patch、追加targetおよびrelease gate詳細は、本文のDEFERRED項目として扱い、Node/npm implementation gateを妨げない。

次はユーザー承認済みの Stage 6 実装入力として確定している。

- Node-API v8
- `napi-rs`
- backend-neutral function-based synchronous public shape
- ESM / CommonJS の両方
- Node-API → Core、WASM → Core の一方向 dependency
- unsupported target / `--no-addons` だけの WASM fallback と、native failure の fail closed

## 15. Node/npm implementation gate result

**判定: `READY`。**

OPEN-001、OPEN-002、OPEN-004（wrapper / public API）、OPEN-005およびOPEN-008について、Node/npm implementation開始に必要なdecisionはすべてユーザー承認済みである。exact napi-rs / CLI version、Rust MSRV、consumer `engines.node` exact patch floor、exact TypeScript declaration / conditional exports JSON、追加native target、OPEN-006およびOPEN-007はDEFERREDだが、このimplementation gateを妨げない。

Stage 6は開始可能である。ただし本commitはdecision artifactの確定だけを行い、Stage 6実装、dependency追加、`crates/node`作成、CI変更またはnpm facade実装を行っていない。Stage 6開始後も、承認済みの依存方向、security invariantおよびfallback invariantを維持する。

本 artifact は Stage 6 実装、Stage 7 npm facade、package publish、Node/npm dependency 追加、`crates/node` 作成、CI 変更または README 変更を行っていない。READY判定後も Stage 6 へ自動的に進まず、次の実装依頼を待つ。

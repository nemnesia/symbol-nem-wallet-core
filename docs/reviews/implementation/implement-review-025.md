# 実装レビュー 025 — Native / WASM integrity と facade DTO snapshot

## Review Target

| 項目 | 内容 |
| --- | --- |
| Repository | `nemnesia/symbol-nem-wallet-core` |
| Branch | `fix/security-input-resource-bounds` |
| Reviewed HEAD | `8e20517d7349bde2ee394c531a1d45464ce183ab` |
| Base HEAD | `c0a01ca1073a2d2ab2aff68e9a6e4d711146c661` |
| 確認日 | 2026-10-03 (Asia/Tokyo) |
| 成果物 | 本レビュー記録 |
| 範囲 | 指摘 #2 Native / WASM runtime integrity、指摘 #4 facade DTO snapshot、関連仕様・設計・package assembly・release / recovery / provenance・変更テスト |
| 未確認 | 実 Chromium での Browser WASM runtime、全 platform release artifact / hosted release workflow |

## Execution Audit

サブエージェントは使用せず、次の4観点で独立に確認した。

- A — Specification conformance: 16 operation、DTO / error /同期契約、runtime routing、Store opaque boundary と上流資料を照合。
- B — Security: digestからWASM initializationへのbyte経路、fail-closed、fallback、payload copy / cleanup、Proxyとsecret boundaryを確認。
- C — Interoperability: canonical WASM、release manifest / recovery / provenance、Node ESM/CJS、Browser bundler、RN / Native parityを追跡。
- D — Tests / quality: negative testがdigest拒否を識別できるか、nested snapshot / error path、実行検証を確認。

## Evidence Used

| 種別 | 資料 / 対象 | 用途 |
| --- | --- | --- |
| 作業指針 | `AGENTS.md`、`implement-review`、review-common playbook / reviewers / gates / output format / security checklist | scope、根拠、判定、成果物と検証規則 |
| 上流 / 同一フェーズ | `docs/design/security.md`、`docs/specifications/specification.md`、`npm-typescript-facade.md`、`wallet-store-format-v1.md` | security responsibility、public API、DTO / error、WASM artifact / initialization、Store境界 |
| 既存レビュー | `implement-review-024.md`、`release-readiness-review-004.md`、`npm-typescript-facade-review-002.md` | 既存実装・release gate・公開契約の前提 |
| 実装 | `packages/wallet-core/src/{node,wasm}/`、`facade-runtime.mjs`、`scripts/build-npm-package.mjs`、`package-contents.mjs`、`release-manifest.mjs`、`release-operation.mjs`、`npm-provenance.mjs`、recovery scripts | loader、same-byte initialization、digest chain、snapshot / ownership |
| テスト | `facade.test.mjs`、`wasm-integrity.test.mjs`、package / provenance / release / bundler tests | positive / negative、error mapping、package consistency |
| 変更基準 | `c0a01ca..8e20517` | 19-file remediation scopeと周辺コードを確認 |
| 個別再現 | ESM package copyのmanifest missing / malformed、facade payload snapshot後のapproval failure | ESM generic error contract違反、失敗時copy残留を確認 |

## Review Result

`READY`

## Summary

CRITICAL / HIGH / MEDIUM の新規 finding はない。WASM loader はESM Node、CJS Node、Browserの各経路でhash対象と同じ取得済みbytesを初期化へ渡す。release manifest、package runtime manifest、tarball / provenance validationも同じcanonical artifactへ結び付く。Native loaderに残るpath-based TOCTOUは文書で正しく限定されている。

DTO fieldはown data descriptorから取得され、nested DTOをnull-prototype snapshotに変換してからbackendへ渡す。payload viewの範囲copy、caller buffer非変更、backend呼出し中のfinally cleanupも実装されている。残るのはLOW 3件: ESM manifest load errorのgeneric化漏れ、snapshot作成途中に失敗した場合のpayload copy cleanup漏れ、WASM mismatch integration testの識別力不足である。Skillのgateに従い、LOWのみのため `READY` とする。

## Finding Status

| ID | Severity | Status | 初出 | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| IR-031 | LOW | New | `implement-review-025` | ESM static JSON importのmissing / malformed errorが初期化用generic errorを迂回することをtemp packageで再現 |
| IR-032 | LOW | New | `implement-review-025` | payload copy後、approval validationで失敗するとsignのfinallyへ到達せずcopyが残ることをfacadeで再現 |
| IR-033 | LOW | New | `implement-review-025` | invalid WASM byteのintegration testはhash拒否と通常のmodule parse failureを区別しない |

## Required Changes

なし。CRITICAL / HIGH の New / Open / Reopened finding はない。

## Optional Improvements

### IR-031 — ESM WASM manifestの読込失敗がgeneric initialization errorを迂回する

- `packages/wallet-core/src/wasm/index.mjs:3,17-40`
- `artifact-manifest.json` はtry block外のstatic JSON importである。temp packageでmanifestを削除すると通常の `Error` と絶対pathを含むmessage、`{` に置き換えるとpathとJSON parse detailを含む `SyntaxError` がimport callerへ伝わった。CJS側のJSON parseはtry/catch内でgeneric errorへ正規化される。
- digest mismatch、metadata schema mismatch、WASM init failureはfail-closedだが、missing / syntactically malformed ESM metadataのconsumer-visible errorが仕様 §8.3 / §14.3 の `WalletCoreBackendInitializationError` と一致しない。Core operationやfallbackへの到達はない。影響はerror contract / filesystem path disclosureに限定されるためLOW。
- 最小修正: ESM metadata load / parse failureもgeneric initialization errorへ正規化する。
- 完了条件: ESMでmissing、malformed JSON、malformed digestを別々に試し、すべてgeneric errorで停止し、operationとfallbackへ到達しないことを確認する。

### IR-032 — Signing payload snapshot後のvalidation failureでtemporary copyが消去されない

- `packages/wallet-core/src/facade-runtime.mjs:494-503,649-660`
- `snapshotSigningRequest` はtarget snapshot後にpayloadをcopyし、その後approvalをsnapshot / validationする。approval missing、accessor、invalid status、またはProxy descriptor trapでここがthrowすると、`sign()`の `requestSnapshot` 代入自体が完了せず、後続の `finally` は実行されない。
- validation failure時にbackend operationは呼ばれないが、facade-owned payload copyがzeroizeされずGCまで残る。再現ではmalformed approvalが `InvalidArgument` を返し、捕捉したfacade copyに元payload bytesが残っていた。payloadはopaque inputで秘密とは限らないが、既存copy cleanup責任の失敗としてLOW。
- 最小修正: payload copy後に失敗する全snapshot処理をcleanup scopeで囲むか、semantic validation完了後にcopyする。
- 完了条件: approval欠落 / malformed / accessor / throwing Proxyの各ケースで、backend非到達とfacade copyのzeroizeをテストする。成功・backend error・output normalization errorの既存cleanupとcaller buffer非変更も維持する。

### IR-033 — WASM tamper integration testがdigest拒否を立証しない

- `packages/wallet-core/test/wasm-integrity.test.mjs:45-72`、`scripts/test-npm-bundlers.mjs` のBrowser corruption test
- integration testはWASM先頭byteを反転する。これはWebAssembly moduleとしてinvalidなbytesであるため、digest検証を誤って外してもModule parse / instantiate側が先に失敗し、generic initialization errorになり得る。`WebAssembly.Instance` 呼出し数0もModule parse failureで成立する。helper単体のhash比較testはあるが、loaderがwrong expected digestでvalid moduleを初期化前に拒否することを確かめていない。
- 実装sourceは実際にverify後に同じbytesを渡しているため、現行runtime defectは確認していない。テストは将来digest checkが外れてもpassし得るという限定された保証不足のためLOW。
- 最小修正: WASM bytesを有効なまま保ち、runtime manifestのsha256だけを別の有効な64桁hexへ変更したESM / CJSケースを追加する。Browserも可能ならvalid asset + wrong expected digestをbundler integrationで確認する。
- 完了条件: integrity checkを外すとテストが失敗し、現状実装では汎用error、初期化 / operation / fallbackなしとなることを確認する。

## Resolved Findings

本レビュー内で再確認できた #2 / #4 の主要要件は満たされているが、全指摘を完全closeとはしない。IR-031〜033は新規LOWとして記録した。既存レビューの他 finding lifecycleは本レビュー対象外。

## Upstream Feedback

なし。generic initialization error、DTO snapshot、Application assertionおよびpayload lifecycleは既存仕様・設計から判定できる。

## Deferred Findings

- Chromium executableがなく、実Browserでのsuccess / mismatch initializationは実行していない。Vite / webpack / esbuild / MV3 packagingは確認した。
- 全OS / release hosted matrix、registry provenanceの実artifact、Native path loaderへの同一bytes loadは未実施。既知のNative TOCTOUは下記残存リスクに記録する。

## Scope and Traceability

| Surface | 根拠と結果 |
| --- | --- |
| Canonical WASM / runtime loader | Specification `npm-typescript-facade.md` §§14, 16 と build / loader。package-local single binaryを読込み、同じbytesをverify後にinit |
| Release / provenance | `release-manifest.mjs` の `wasm.canonical_artifact.sha256`、package assembly、`release-operation.mjs` / `npm-provenance.mjs` のtarball bytes / runtime metadata comparison |
| Node native routing | Node manifest entry mismatchでfail closed。target entryなし / unsupported targetだけが既存WASM fallbackへ進む |
| Facade DTO | Specification `npm-typescript-facade.md` §§5, 7, 8, 14 と `specification.md` のapproval契約。public operation、DTO shape、Core assertion責任は維持 |
| Wallet Store | `wallet-store-format-v1.md` のopaque Store contract。今回Store format / Core crypto変更なし |
| React Native | package consumerは共通facade利用。RN consumer CI成功、operation / declaration変更なし |

## Domain Checks

| Domain | 結果 |
| --- | --- |
| Specification Conformance | 16 operation、同期operation、DTO shape、error responsibility、no retry / no fallbackを維持。generic ESM metadata failureはIR-031 |
| Security | same-byte WASM init、fail-closed、no fallback、DTO source elimination、buffer ownershipを確認。Native TOCTOUを過剰保証せず文書化。payload snapshot-construction cleanup gapはIR-032 |
| Interoperability | single canonical WASM、release manifest / package / provenance / recovery pathsの関係を確認。Node ESM/CJSとbundler package buildが成功 |
| Test Evaluation | DTO adversarial testsとruntime digest testsあり。invalid-module tamperの偽陽性余地はIR-033。実Browser runtime未実行 |
| Implementation quality / memory safety | new temp file / custom dlopen / permission changeなし。TypedArray view offset / length intrinsicからcopyし、同期backend operation終了後にcleanup |
| Public compatibility | 16 root export、declaration、Store format、Native/WASM semantics、RN facade parityに変更なし |
| 適用外 | Core cryptography、Argon2 / AES-GCM、Store rollback、duplicate_tag、protocol fixtureは今回の差分に含まれない |

## Validation Results

| Command / check | 結果 |
| --- | --- |
| `git diff --check c0a01ca..8e20517` | PASS |
| `bash scripts/check-local.sh wasm` | PASS。wasm-bindgen `0.2.127`一致、WASM tests 7/7、wasm32 target check |
| `node scripts/test-npm-package.mjs` | PASS。facade 13/13、manifest 6/6、output ownership 1/1、package 5/5、Node/native-WASM parity PASS、RN consumer tests 6/6、WASM integrity 3/3。Browser runtime parity 1件はChromium unavailableでskip |
| `bash scripts/ci/node-source.sh` | PASS。release evidence / identity、facade cleanup、license、RN lifecycle / Pod graph、npm provenance / release record / recovery、browser parity observability fixtures |
| `npm_config_cache=/tmp/snwc-review-npm-cache bash scripts/ci/react-native.sh` | PASS (exit 0)。package rebuild、ESLint、TypeScript、Jest test inventory、React Native config |
| `npm_config_cache=/tmp/snwc-review-npm-cache bash scripts/ci/pack-npm-package.sh /tmp/snwc-review-pack` | PASS。local package tarball作成 |
| `node scripts/test-npm-bundlers.mjs --tarball /tmp/snwc-review-pack/nemnesia-symbol-nem-wallet-core-0.1.0.tgz --skip-browser` | PASS。Vite、webpack 5、esbuild、MV3 package checks。Browser executionはskip。webpackに既存のcritical-dependency / asset-size warningあり |
| temp ESM manifest missing / malformed probe | 再現: raw Error / SyntaxErrorとpathがcallerへ出る (IR-031) |
| facade payload cleanup probe | 再現: approval validation failure後にfacade copyが残る (IR-032) |

最初のsandbox内 `node scripts/test-npm-package.mjs` はC compiler child process `EPERM` で止まった。同じpackage testをsandbox escalation下で再実行し成功した。`check-local.sh wasm` の最初のsandbox実行はcanonical lock読み出し制約で止まり、escalation下で同じ検証が成功した。bundler testの初回はtarball名の指定誤りで起動できず、実際のpack filenameで再実行して成功した。これらをsource failureとして扱っていない。

## Review Gates

| Gate | 結果 / 根拠 |
| --- | --- |
| 1. Specification conformance | PASS with LOW IR-031。generic error mismatchのみ |
| 2. Security | PASS with LOW IR-032。WASM mismatch fail-closedとDTO snapshotは現行コードで成立 |
| 3. Interoperability | PASS。single canonical WASMとNode / Browser bundler / RN package contracts維持 |
| 4. Failure handling | PASS with LOW IR-031 / IR-032。operation / fallback fail-closed。初期化error normalizationとtemporary copy cleanupを改善 |
| 5. Test sufficiency | PASS with LOW IR-033。integration testのdigest-specific sensitivityを補強 |
| 6. Implementation quality / memory safety | PASS。new unsafe loader / temp copyなし、Native residual documented |

## Remaining Risks and Open Decisions

- Node Native addonはdigest確認後 `require(path)` で再読込される。portableに検証済みBufferそのものをloadできずTOCTOU riskが残る。package directoryへのwrite accessがある攻撃者に対するcode-signing mechanismではないことをDesign / Specificationが明記しており、今回の範囲では許容。
- 同じnpm package内のJavaScriptとdigest metadataを書き換えられる攻撃者に対しruntime hashは真正性を保証しない。npm provenance、lockfile integrity、deployment integrityの代替ではない。
- Proxy descriptor trapの副作用、全fieldのatomic snapshot、malicious Applicationのtrustworthinessを保証しない。`SigningApproval` は引き続きApplication assertion。
- ESM JSON moduleの実Browser runtime compatibilityはbundler buildまでは確認し、Chromiumでの実行を未確認。

## Automatic Changes

レビュー対象のsource、仕様、testは変更していない。本レビュー成果物 `docs/reviews/implementation/implement-review-025.md` を追加した。

## Final Decision

`READY`

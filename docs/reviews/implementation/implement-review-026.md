# 実装レビュー 026 — Review 025 security remediation follow-up

## Review Target

| 項目 | 内容 |
| --- | --- |
| Repository | `nemnesia/symbol-nem-wallet-core` |
| Branch | `fix/security-input-resource-bounds` |
| Reviewed HEAD | `f4823030529a60854903b2826788fd010f750c17` |
| Review 025 HEAD | `8e20517d7349bde2ee394c531a1d45464ce183ab` |
| Remediation starting HEAD | `13145fdd87ba1b872e85d64ea3edaf204e23746b` |
| 確認日 | 2026-10-03 (Asia/Tokyo) |
| 成果物 | 本レビュー記録 |
| 範囲 | IR-031〜IR-033、Review 025後の累積差分、WASM loader、facade snapshot、package / bundler tests、関連仕様 |
| 未確認 | Chromiumでの実Browser runtime test、hosted release matrix |

## Execution Audit

サブエージェントは使用せず、次の4観点で独立に確認した。

- A — Specification conformance: generic backend initialization error、DTO error mapping、同期operation、16 public operationを仕様と照合。
- B — Security: manifest・WASM bytesのfailure path、fallbackの有無、payload copyの所有権・cleanupを追跡。
- C — Interoperability: ESM / CJS / Browser loader、bundler output、Node / WASM / RN facade contractを照合。
- D — Tests / quality: negative testがdigest mismatchとparse failureを区別すること、approval failureのcleanupをbackend mockとbytes観測で確認。

## Evidence Used

| 種別 | 資料 / 対象 | 用途 |
| --- | --- | --- |
| 作業・レビュー指針 | `AGENTS.md`、`implement-review`、review-common playbook、reviewers、gates、output format、security checklist | 対象範囲、評価観点、判定、成果物形式 |
| 既存レビュー | `docs/reviews/implementation/implement-review-025.md` | IR-031〜033の初出内容と完了条件 |
| 設計・仕様 | `docs/design/security.md`、`docs/specifications/npm-typescript-facade.md` | payload ownership、DTO snapshot、generic error、WASM loader、public contract |
| 差分 | `8e20517..f482303`、`13145fdd..f482303` | Review 025後の全変更と直接remediation差分の区別 |
| 実装 | `facade-runtime.mjs`、WASM ESM / CJS loader、`asset.mjs`、Node entry | cleanup、error normalization、initialization経路、fallback境界 |
| テスト・assembly | `facade.test.mjs`、`wasm-integrity.test.mjs`、`test-npm-bundlers.mjs`、package/release tests | failure injection、digest検証、bundlerとpackage構成 |

## Review Result

`READY`
## Summary

IR-031〜IR-033はすべてResolved。新規Critical / High / Medium / Low findingはない。

ESMのmanifest読み込みとparseは初期化用try/catch内にあり、CJSと同じgeneric initialization errorへ正規化される。SigningRequest snapshotはpayload copy後の失敗をcatchしてそのcopyを消去し、snapshot成功後は同期backend呼び出し全体をfinallyで覆う。有効なWASM bytesを保ったままmanifest digestだけを変えるESM / CJS testとBrowser loader相当testが、digest mismatchを初期化前に検出する。

累積差分でpublic operation、DTO shape、error code、Store format、Rust Core crypto、RN APIに変更はない。実Browser runtimeはChromiumが環境になく未実行だが、Browser loader相当testとVite / webpack / esbuild / MV3 bundler assemblyを確認した。この未実行項目はfindingにしない。

## Finding Status

| ID | Severity | Status | 初出 | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| IR-031 | LOW | Resolved | `implement-review-025` | ESM manifestの取得・parse・validation・hash・WASM initializationがtry/catch内。missing / malformed / mismatchのloader integration testsがgeneric errorを確認 |
| IR-032 | LOW | Resolved | `implement-review-025` | snapshot construction catchが作成済みpayload copyを消去。missing / invalid / accessor / throwing Proxy testでcopy zeroization、caller bytes不変、backend非到達を確認 |
| IR-033 | LOW | Resolved | `implement-review-025` | WebAssembly.validate済みのbytesと別の有効64桁hex digestを使い、ESM / CJS / Browser相当でmismatchを識別 |

## Required Changes

なし。

## Optional Improvements

なし。

## Resolved Findings

### IR-031 — ESM WASM manifest読込失敗のgeneric error正規化

`packages/wallet-core/src/wasm/index.mjs:16-50`でNode ESMのmanifest read / JSON parse、BrowserのJSON module import、schema・digest検証、WASM取得・hash・initializationを同じtry/catchで処理する。失敗時は`WalletCoreBackendInitializationError` / `backend initialization failed`だけをthrowし、元例外をcauseに保持しない。対応テストはESM / CJS双方のmissing manifest、malformed JSON、malformed schema、malformed digest、およびvalid WASM + wrong digestを通している。loader module evaluationがrejectするためpublic operation exportは利用できず、WASM loader内に別backend fallbackはない。

Node CJS (`packages/wallet-core/src/wasm/index.cjs:3-26`)もmanifest read、parse、schema / digest validation、WASM read、hash、initializationをcatchし同じgeneric errorへ正規化する。Browser `loadWasmAsset`のfetch・response・ArrayBuffer変換・WebCrypto failureもESM loaderのcatchに到達する。

### IR-032 — snapshot途中failure時のpayload copy cleanup

`packages/wallet-core/src/facade-runtime.mjs:494-509`はtargetを先にsnapshotし、payloadをcopyした後のapproval snapshot等をtry/catchで覆う。catchは`clearSecretBytes(payload)`を呼び、cleanupがthrowしても元のvalidation errorを維持する。copyの作成前に起きるnested target failureでは消去対象がない。成功時は同じcopyをsnapshotとしてbackendへ渡し、`sign`の`finally` (`:655-666`)がbackend success、backend error、output normalization errorの全経路で消去する。

`snapshotUint8Array` (`:128-142`)はTypedArray intrinsicからbuffer・byteOffset・byteLengthを読み、view範囲をfacade-owned arrayへcopyする。caller bufferは書き換えず、Transactionとして解釈しない。追加テストはapproval missing / invalid literal / accessor / descriptor trapでcopyがzeroizeされること、caller bufferが不変であること、backendが呼ばれないことを確認する。新しいpublic hook / exportはない。

### IR-033 — digest mismatchを識別するWASM negative test

`packages/wallet-core/test/wasm-integrity.test.mjs:84-114`はWASM bytesを変更せず`WebAssembly.validate(bytes) === true`を確認してから、manifestのsha256先頭hex digitだけを変更する。変更後も64桁lowercase hexであり、actual digestと異なる。ESM importとCJS requireはgeneric initialization errorで失敗し、`WebAssembly.Instance`は呼ばれない。digest verificationを削除した場合、valid moduleの初期化が成功してreject assertionが失敗するため、parse failureだけではtestを通過できない。

Browser loader相当test (`wasm-integrity.test.mjs:116-149`)もvalid fetched bytes、mock fetch、Node WebCrypto `subtle.digest`を用い、Browser分岐でmismatchを初期化前に検出する。bundler fixtureはserved JS / JSON中のexpected digestだけを別の有効digestへ差し替え、WASM assetは変更しない。実Chromiumでのこのfixtureの実行は環境にbrowser executableがなく未確認。

## Upstream Feedback

なし。error、snapshot ownership、Browser / Node WASM initializationの契約は既存仕様と設計から判定できる。

## Deferred Findings

- Chromium executableがなく、Vite / webpack / esbuild outputの実Browser success / wrong-digest runtimeは実行していない。Browser分岐のloader相当testは実行済み。
- hosted release workflow / 全platform artifact matrixは今回のremediation差分に含まれず、再実行していない。

## Scope and Traceability

| Surface | 根拠と結果 |
| --- | --- |
| ESM / CJS WASM init | `npm-typescript-facade.md` §§8.3, 14.2, 14.3のgeneric initialization errorと同期operation契約を満たす |
| Browser asset / digest | 既存のpackage-local asset・同じ取得bytesのverify→initialize構造を維持。fetch / hash / init failureはfail-closed |
| SigningRequest | 仕様§7のown-data DTO snapshot、null-prototype snapshot、payload view copy、caller buffer非変更、同期backend終了時cleanupを満たす |
| Release / provenance | remediaton差分にrelease manifest、package assembler、provenance / recovery implementationの変更なし。Review 025で確認されたcanonical digest chainに変更なし |
| Public compatibility | 16 operation、public DTO shape、error code、Store format、Core crypto、RN APIに差分なし |

## Domain Checks

| Domain | 結果 |
| --- | --- |
| Specification Conformance | PASS。初期化generic error、DTO error mapping、同期operationを維持 |
| Security | PASS。fail-closed initialization、no fallback、snapshot copy cleanup、caller buffer ownershipを確認。悪意ある同一realm ApplicationやProxy trap副作用をtrustworthyにする保証は追加していない |
| Interoperability | PASS。canonical WASMと既存Node / Browser / RN routing contractに変更なし |
| Test Evaluation | PASS。wrong valid digestがinvalid WASM parse failureから独立し、facade copy zeroizationをbackend mockと捕捉copyで検証 |
| Implementation quality / memory safety | PASS。cleanup ownershipはsnapshot construction catchまたは成功後sign finallyのいずれか一方が担う。同期backend契約と整合し、二重cleanupはない |
| 適用外 | Rust Core crypto、Store format、Native C ABI ownership、Symbol / NEM serializationは今回の変更差分に含まれない |

## Validation Results

| Command / check | 結果 |
| --- | --- |
| `git diff 8e20517..f482303 --check` | PASS |
| `git diff 13145fdd..f482303 --check` | PASS |
| `bash scripts/check-local.sh wasm` | PASS。wasm-bindgen version一致、WASM tests 7/7、wasm32 check |
| `node scripts/test-npm-package.mjs` | PASS。facade 14/14、release manifest 6/6、Node secret ownership 1/1、package checks 5/5、RN consumer 6/6、WASM integrity 6/6。Node native / WASM parity PASS。Browser parityはChromium unavailableでskip |
| `bash scripts/ci/node-source.sh` | PASS。release evidence / identity、secret cleanup、license、RN lifecycle / Pod graph、provenance / recovery、browser parity observability checks |
| `npm_config_cache=/tmp/snwc-final-review-npm-cache bash scripts/ci/react-native.sh` | PASS (exit 0)。React Native dependency install、lint / type / test discovery / dependency checks |
| `npm pack --json --ignore-scripts --pack-destination /tmp/snwc-final-review-pack ./packages/wallet-core` | PASS。package tarballを生成 |
| `node scripts/test-npm-bundlers.mjs --tarball /tmp/snwc-final-review-pack/nemnesia-symbol-nem-wallet-core-0.1.0.tgz --skip-browser` | PASS。Vite / webpack 5 / esbuild / MV3 assembly。Chromium runtimeはskip |
| Browser executable probe (`google-chrome`, `chromium`, `chromium-browser`, `chrome`) | 実行済み。利用可能なexecutableは検出されず |

webpackはdynamic import dependencyとasset sizeのwarningを出したがbuildは成功した。今回のコード差分で実Browser runtime compatibilityを実行確認できなかったため、Deferred Findingsに範囲を記録する。

## Review Gates

| Gate | 結果 / 根拠 |
| --- | --- |
| 1. Specification conformance | PASS。IR-031のgeneric error差異を解消 |
| 2. Security | PASS。IR-032のtemporary payload copy failure cleanupを解消 |
| 3. Interoperability | PASS。ESM / CJS、browser-mode loader、package bundler pathsを確認 |
| 4. Failure handling | PASS。manifest / fetch / hash / initialization failures fail closedしgeneric errorへ正規化 |
| 5. Test sufficiency | PASS。IR-033のvalid WASM + wrong digest regression guardを追加 |
| 6. Implementation quality / memory safety | PASS。copy ownershipとcleanup pathが一意で、public contract変更なし |

## Remaining Risks and Open Decisions

- 実Chromiumによるbundled Browser runtime testは未実行。Node上のBrowser loader相当testとbundler assemblyを実行した。
- Native path-based loader TOCTOUとpackage directory write accessを持つ攻撃者への非防御はReview 025既知境界であり、本remediationで変更していない。
- runtime digest metadataはpackage全体のcode-signing機構ではなく、npm provenance / lockfile / deployment integrityの代替ではない。

## Automatic Changes

レビュー中のコード・仕様・テスト・設定変更はなし。本レビュー記録を新規作成した。

## Final Decision

`READY`

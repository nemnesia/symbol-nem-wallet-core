# Implementation Review 013

## 1. Review Target

- 対象リポジトリ: `nemnesia/symbol-nem-wallet-core`
- 対象ブランチ: `agent/concept-review-follow-up`
- 対象 HEAD: `da26a209a273a3375484f8ccfb45a1f71148608b`
- レビュー日: 2026-08-31
- レビュー種別: Implementation 全体再レビュー（差分限定ではない）
- 前回レビュー: `docs/reviews/implementation/implement-review-012.md`
- 対象範囲: Rust Core、Native C ABI、WASM Binding、公開 API、Store parser / serializer、暗号・署名・秘密情報 lifecycle、tests / fixture、fuzz target、Cargo manifest / lock、feature、build / runtime / coverage 導線
- 変更制約: Implementation、Requirements、Design、Specification、Store Format、tests、fixture は変更せず、本 review artifact だけを新規作成する。

開始時に現在の branch、upstream および HEAD が上記と一致することを確認した。開始時の worktree は clean であり、前回 artifact `implement-review-012.md` は上書きしていない。

## 2. Review Execution Audit

### Phase 0 — Scope and source fixation

- `AGENTS.md`、`.agents/skills/implement-review/SKILL.md`、同 Skill が参照する reviewer / gate / output / security checklist を確認した。
- `review-common/review-playbook.md` はリポジトリおよび利用可能な workspace path に存在せず、読込不能だった。この欠落は artifact に記録し、利用可能な Skill、AGENTS、normative documents、reviewer / gate / security instructions を適用した。
- `Phase Contexts` の登録はなく、未登録の Context は利用していない。
- 主な根拠は `docs/requirements/requirements.md`、`docs/design/architecture.md`、`docs/design/bindings.md`、`docs/design/security.md`、`docs/specifications/specification.md`、`docs/specifications/wallet-store-format-v1.md` である。
- IR-001〜IR-022 の status は前回値を機械的に継承せず、現行 source、現行 tests、runtime evidence および completion condition から再判定した。

### Phase 1 — Reviewer A〜D

Reviewer runtime は利用可能な subagent を持たないため、Skill の指示に従い、同一 review chair による4つの独立 pass として実行した。

- Reviewer A — Specification conformance: API / DTO、HandoffConfirmation、ExportRequest、SigningRequest / SigningApproval、AccountContext、error、Store Format、Native / WASM binding contract を確認した。
- Reviewer B — Deep security: authorization、secret owner / zeroization、authentication、AAD、RNG、custom scalar arithmetic、panic / diagnostic、FFI allocation / release、failure-safe output を確認した。
- Reviewer C — Protocol / interoperability: Symbol / NEM、Mainnet / Testnet、BIP39 / HD、address、raw signing、deterministic CBOR、fixture および Native / WASM parity を確認した。
- Reviewer D — Test / quality: unit / integration、Native Rust、header compile、Native C runtime、WASM Node runtime、failure injection、fuzz target compile、sanitizer、coverage、feature / dependency を確認した。

### Phase 2 — Refutation and integration

- IR-020 は Native の fallible binding-owned allocation、partial output guard、release layout、zeroization および WASM の recoverable conversion / allocation failure mappingを再確認した。
- IR-022 は input object の override可能 method を経由しない actual view / backing buffer path、Proxy reject、detached / empty、bounds、store limit および same-length signing testを再確認した。
- IR-016〜IR-019、IR-021、IR-007、IR-017を含む前回 Resolved findingは、現行実装全体の再読と該当テストで回帰がないことを確認した。
- Symbol / NEM signing、BIP39 / HD、Argon2id / AES-256-GCM、Pending、deterministic CBOR、Store atomicity、Core statelessnessについて新たな具体的 defect は確認されなかった。

### Phase 3 — Gate and artifact

- Critical / High の New、Open、Reopened は0件である。
- Medium / Low の未解決 findingも0件である。
- coverage threshold 未達、branch coverage未測定、fuzz campaign、external verifierおよびLSAN未完了は、formal findingではなく未確認事項として分離した。NFR-005 / AC-044のcoverage targetは仕様上 SHOULDであり、未達だけでは `REVISE IMPLEMENTATION` gateを発生させない。

## 3. Review Decision

**READY**

現行 Implementation Review Skill の gate ruleでは、未解決 Critical / High が存在する場合だけ `REVISE IMPLEMENTATION` とする。現行 HEADでは全 severity の未解決 findingが0件であるため、`IMPLEMENTATION READY` を宣言可能と判定する。

これは fuzz campaign、external verifier、branch coverage、LeakSanitizer または全 browser matrix が完了したことを意味しない。これらは Validation / 未確認事項に記録する。

## 4. Finding Status

| ID | Severity | Current status | 現行 HEADでの再評価 |
| --- | --- | --- | --- |
| IR-001 | HIGH | Resolved | secret temporary と scalar arithmetic に回帰なし。 |
| IR-002 | HIGH | Resolved | BIP39、entropy、seed、HD lifecycle に回帰なし。 |
| IR-003 | HIGH | Resolved | decrypted payload、CBOR、key record、secret owner に回帰なし。 |
| IR-004 | MEDIUM | Resolved | fixed field、enum、fatal parser に回帰なし。 |
| IR-005 | MEDIUM | Resolved | AAD、unknown wire value、duplicate、atomicity に回帰なし。 |
| IR-006 | MEDIUM | Resolved | Native / WASM DTO、ownership、parity に回帰なし。 |
| IR-007 | LOW | Resolved | generated Software Keyのpublic boundary、RNG / serialization failureを確認。 |
| IR-008 | MEDIUM | Resolved | error、malformed input、fail-closed に回帰なし。 |
| IR-009 | MEDIUM | Resolved | Store atomicity、replacement、Pending に回帰なし。 |
| IR-010 | HIGH | Resolved | password、key、payload temporaryのzeroizationに回帰なし。 |
| IR-011 | HIGH | Resolved | authentication、AAD、semantic validationに回帰なし。 |
| IR-012 | HIGH | Resolved | Symbol / NEM signing、key、addressに回帰なし。 |
| IR-013 | LOW | Resolved | diagnostics / Debug secret leakageに回帰なし。 |
| IR-014 | LOW | Resolved | resource limit と allocation前検査に回帰なし。 |
| IR-015 | LOW | Resolved | secret comparison、failure diagnosticに回帰なし。 |
| IR-016 | CRITICAL | Resolved | authorization assertion、Handoff、Export、Signing、AccountContextに回帰なし。 |
| IR-017 | MEDIUM | Resolved | recursive unknown CBOR validation、preservation、AADに回帰なし。 |
| IR-018 | MEDIUM | Resolved | Native operation-start reset と partial output防止に回帰なし。 |
| IR-019 | HIGH | Resolved | Native release lifecycle、mutable handle、double releaseに回帰なし。 |
| IR-020 | MEDIUM | **Resolved** | fallible Native / WASM output allocation、failure-safe output、guard、release、test seamがcompletion conditionを満たす。 |
| IR-021 | LOW | Resolved | Core-owned secret-dependent early exitに回帰なし。 |
| IR-022 | MEDIUM | **Resolved** | actual Uint8Array view / backing buffer pathとsame-length payload signingがcompletion conditionを満たす。 |

Current formal finding count: **CRITICAL 0 / HIGH 0 / MEDIUM 0 / LOW 0**。

## 5. IR-020 Re-evaluation — Binding-owned output allocation

### Native

`bindings/native/src/lib.rs:390-491` の `allocate_output_slice` は、0長を除いて `Layout::array` を検証し、raw `alloc` のNULLを `BindingFailure` へ変換する。成功したbufferは `OwnedSliceGuard` または `OwnedBytesGuard` が所有し、失敗時はDropで解放される。release側は同じ要素型・長さから同じ `Layout` を再構成して `dealloc`する。

すべてのpublic operationは `reset_output` / `reset_array_output` (`bindings/native/src/lib.rs:330-343` および各API)をCore処理より前に実行する。`snwc_prepare_generated_profile` は mnemonic、pending、warnings の出力を assignment前に変換し、`OwnedBytesGuard` により途中失敗した先行allocationを回収する。特に複数outputの失敗順序を確認する test-only seam (`bindings/native/src/lib.rs:345-382`) に対し、`inject(1)` で二つ目のallocationを失敗させ、次を確認する。

- errorは `BindingFailure`。
- mnemonic、pending、warningsはすべてNULL / 0。
- 成功済み一時allocationはguard Dropでcallerへ公開される前に回収される。
- Coreが生成した秘密DTOの未移動部分はDropでzeroizeされる。

warnings、Profile list、Software Key listも同じ `OwnedSliceGuard`、assignment後のrelease handle、NULL / 0 resetを使用する (`bindings/native/src/lib.rs:529-535,848-918,1316-1367`)。warning / list DTOは秘密情報を含まない。Store、Mnemonic、Pending、address、private key、signature等のbyte outputは `snwc_free_bytes` が内容をzeroizeしてから同じlayoutで解放する (`bindings/native/src/lib.rs:466-491,1303-1314`)。既存outputの再利用時には先にfreeするというheader契約を維持しており、release APIとのallocator / layout不整合は確認されなかった。

test-only failure injectionは `#[cfg(test)]` moduleに限定され、production wrapperは常にfalseを返す (`bindings/native/src/lib.rs:345-382`)。public artifactへseamやtest symbolを露出する経路は確認されなかった。

### WASM

`src/wasm.rs:215-260` は object、array、Uint8Array constructionをcatch可能なinline bridgeへ通し、JS exceptionを `BindingFailure`へ変換する。Rust側のbinary copyは `try_reserve_exact` の失敗を `BindingFailure`へ変換する。`mutation_result`、`read_result`、secret DTO conversionは `Result`の失敗を成功値へ変換せず、failure時にsuccess object、signature、secret、replacement Storeを返さない (`src/wasm.rs:475-588`)。Coreが返す `ErrorCode`は `binding_error`を通じて変更されない。

WASMのtest-only allocation seam (`src/wasm.rs:187-213`)は `#[cfg(test)]` に限定され、object construction / list output / Uint8Array constructionのfailure mappingをruntime test (`tests/unit/wasm.rs:806-816`)で確認した。

recoverable Rust / JS construction failureは `BindingFailure`へ変換できる一方、host / runtimeが例外を返す前にabortする真のOOMをBindingがcatchして保証するものではない。この境界は `src/wasm.rs:249-255` のコメントと仕様 §10、§13.2のBinding failure contractに整合する。host/runtime全体のOOM防止を追加保証するものではない。

**IR-020 completion condition: 満足。判定: Resolved。**

## 6. IR-022 Re-evaluation — WASM binary input integrity

`src/wasm.rs:69-125,138-184` のbinary input pathは、入力から `slice`、`subarray`、`set`等を取得していない。module initialization時に捕捉したTypedArray intrinsic accessor、`ArrayBuffer.isView`、actual backing `ArrayBuffer`およびbinding側のcopy bridgeを使用する。

確認した条件は次のとおり。

- `ArrayBuffer.isView` によってactual viewを検証し、`instanceof`だけで通過するProxyを拒否する。
- TypedArrayのintrinsic `buffer`、`byteOffset`、`byteLength`、`length` getterとbacking bufferのbyte lengthを取得する。
- offset / length / boundsを検証し、範囲外や不整合を `BindingFailure`にする。
- detached backing bufferはdetached getterの結果または例外を `BindingFailure`にする。
- detached判定をlength == 0で代用しないため、attached zero-length inputは正常な空bytesとして扱う。
- `store_bytes`はview検証後、Rust `Vec` allocation前に `MAX_WALLET_STORE_BYTES`を確認する。
- signing payloadはinput methodをdispatchせず、検証済みbacking bufferからfresh viewを作ってcopyするため、同じlengthの別bytesへ置換できない。

runtime test `tests/unit/wasm.rs:818-924` は、同じlengthの `PAYLOAD_A` / `PAYLOAD_B`を用いて、instance `slice` overrideとprototype `slice` overrideの両方を設定する。実際に返ったsignatureは、overrideの返却値ではなく、`PAYLOAD_A`に対するexpected signatureと一致した。Proxy unreadable input、detached Store / Mnemonic / password / Pending / private key / payload、attached empty payloadも `tests/unit/wasm.rs:709-804`で確認した。

`ArrayBuffer.prototype.detached` は比較的新しいJavaScript intrinsicである。現行資料に最低browser versionの定義はなく、Node.js WASM runtime (`node v26.5.0`)でmodule initializationと6 testsを成功させた。現行主要browserの対応範囲については、[MDNのBaseline 2024説明](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/detached)および[Can I Useの対応表](https://caniuse.com/mdn-javascript_builtins_arraybuffer_detached)を確認した。最低browser versionが未定義であるため、旧browserがこのintrinsicを持たないことだけではformal findingにしない。現行主要runtimeのmodule initialization failure、既定のsupported runtimeを破壊する事実は確認されなかった。個別browser実機runtime matrixは未確認事項として残す。

**IR-022 completion condition: 満足。判定: Resolved。**

## 7. New Findings

**なし。**

現行Implementation全体をゼロベースで再確認し、特に次の領域に新規 Critical / High / Medium / Low defectを採用しなかった。

- IR-016 authorization assertions、HandoffConfirmation、ExportRequest、SigningRequest / SigningApproval、AccountContext
- IR-017 recursive unknown CBOR validation
- IR-018 Native failure-safe output、IR-019 Native release lifecycle
- IR-021 secret-dependent control flow、IR-007 generated Software Key failure boundary
- Symbol / NEM signing、BIP39 / HD、custom scalar arithmetic
- Argon2id / AES-256-GCM、Pending Profile、deterministic CBOR、Store atomicity、secret zeroization、Core statelessness

## 8. Domain Evaluation

| Domain | Result | Evidence / boundary |
| --- | --- | --- |
| Native allocation / ownership | PASS | fallible raw allocation、guard、zeroize、exact-layout release、failure reset、multi-output partial防止。 |
| WASM binary integrity | PASS | actual view、backing buffer、detached / Proxy reject、bounds、store limit前検査、same-length signing test。 |
| Native / WASM parity | PASS | 共通Core、同一error意味、同一authorization、Native fixture / C runtime / WASM runtime。external verifierは未実行。 |
| Handoff / restore | PASS | finalizeはConfirmed必須、restoreはhandoff対象外、PendingはStore/password/AADで検証。 |
| Export authorization | PASS | target、Requested、target-specific Confirmed、per-operation password authorizationを別々に検証。 |
| Signing authorization | PASS | Approved、password、profile/key/contextを別々に検証し、raw payloadを変更しない。 |
| AccountContext / Chain / Network | PASS | Symbol / NEM、Mainnet / Testnet、fixed Chain / Network mismatchをfail-closed。 |
| Store parser / IR-017 | PASS | canonical CBOR、recursive unknown allow-list、unknown preservation、fatal enum / version。 |
| Store atomicity / Pending | PASS | failure時replacementなし、input Store非変更、Core history / replay stateなし。 |
| Secret lifecycle / IR-021 | PASS | Core DTO / temporary / decrypted payload / Native outputをzeroize。host / third-party内部は仕様保証外。 |
| Symbol / NEM interoperability | PASS WITH EXTERNAL VERIFIER DEFERRED | in-repo fixture、SDK expected bytes、Native / WASM parityはPASS。外部verifier processは未実行。 |
| Security blocking gap | なし | 未解決 Critical / Highなし。 |
| Interoperability blocking gap | なし | protocol fixture上の不適合なし。external verifier未実行は未確認事項。 |

## 9. Validation Results

| Command / check | Result | Evidence / limitation |
| --- | --- | --- |
| `cargo fmt --all -- --check` | PASS | exit 0。 |
| `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` | PASS | exit 0。 |
| `cargo test --workspace --all-features --locked` | PASS | Core unit 46、Core integration 6、Native Rust unit 2、Native API 2、doc-test 0。全件PASS。 |
| Core tests | PASS | workspace test内のunit 46 + integration 6。CBOR、crypto、Store、authorization、atomicityを含む。 |
| Native Rust tests | PASS | workspace test内のNative unit 2 + API 2。allocation failure seam、C ABI mapping、fixtureを含む。 |
| `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c` | PASS | public header compile。 |
| `./bindings/native/tests/run_c_abi_runtime.sh` | PASS | Native build、C compile、C runtime、ownership / release / fixture。 |
| `cargo check --target wasm32-unknown-unknown --features wasm --locked` | PASS | exit 0。 |
| `wasm-pack test --node --locked --features wasm` | PASS | Node runtime 6 tests、0 failure。IR-022のinstance / prototype override、Proxy、detached、empty、allocation seamを含む。 |
| `cargo check --manifest-path fuzz/Cargo.toml --locked --bin wallet_store_decode` | PASS | fuzz target compile。campaignは未実行。 |
| `python3 scripts/check-invisible-characters.py` | PASS | 22 source files、invisible characterなし。 |
| `cargo tree --workspace --all-features --locked -e features` | PASS | WASM optional dependency、`getrandom/wasm_js`、Native path dependency等を確認。 |
| `SNWC_C_ABI_SANITIZERS=1 ./bindings/native/tests/run_c_abi_runtime.sh` | NOT VALIDATED | ASan/UBSan起動後、LeakSanitizerがptrace環境でfatal。 |
| `ASAN_OPTIONS=detect_leaks=0 SNWC_C_ABI_SANITIZERS=1 ./bindings/native/tests/run_c_abi_runtime.sh` | PASS (partial) | ASan / UBSan runtimeはexit 0。LSAN検査結果ではない。 |
| `cargo llvm-cov --package symbol-nem-wallet-core --all-features --locked --json` | MEASURED / TARGET NOT MET | line 1909/3698 = 51.62%、function 195/416 = 46.88%、branch 0/0。 |
| coverage threshold report (`--fail-under-lines 90 --fail-under-functions 90`) | FAIL | local reportはexit 1。NFR-005 / AC-044はSHOULDであり、formal findingにはしない。 |
| branch coverage | NOT VALIDATED | stable toolchainのみ。nightly branch jobは未実行。 |
| `cargo fuzz run wallet_store_decode -- -max_total_time=60 -timeout=5` | NOT RUN | fuzz campaign未実行。target compileとparser testsはPASS。 |
| external `symbol-sdk` / reference verifier process | NOT RUN | in-repo SDK fixture / differential evidenceはPASS。外部process証跡は未取得。 |

`wasm-pack` は初回sandbox実行ではtool cache用temporary directoryのRead-only制約で開始できなかったが、許可済みの環境で再実行し、上表のNode runtime 6 testsをPASSした。

## 10. Coverage Result

`cargo-llvm-cov v0.9.0`でCore coverageを測定した。

| Metric | Covered | Total | Result |
| --- | ---: | ---: | --- |
| Lines | 1909 | 3698 | 51.62%（90% target未達） |
| Functions | 195 | 416 | 46.88%（90% target未達） |
| Branches | 0 | 0 | branch counterなし（85% target未測定） |

Toolが報告した代表的なuncovered rangeは次のとおりである。

- `src/cbor.rs`: 34-37、147、155、212-215、256、263、278-317、341
- `src/crypto.rs`: 38-46、140-145、162-165、197-209、250-260、434-435
- `src/store.rs`: 38-40、155-165、400-456、740-788、998-1138、1461-1466、1682-1689
- `src/types.rs`: 33-43、171-228、234-247

Coverage reportには、`#[path]`で組み込まれたtest moduleや未実行のerror / boundary branchがsource summaryへ含まれる影響がある。数値を過去artifactから継承せず、今回の実測値を採用した。重要なsecurity、authorization、failure、interop pathについては、coverage率とは独立にunit / integration / Native C / WASM runtimeで確認した。coverage未達は改善対象だが、仕様 §14.3に従い、それだけを理由に仕様外API、authorization bypassまたは暗号方式変更を追加しない。

## 11. Unconfirmed Items and Boundaries

- scheduled fuzz campaignは未実行。fuzz target compile、CBOR resource limit、malformed / canonical parser testsはPASS。
- 外部 `symbol-sdk` / reference verifierを独立processとして実行していない。既存の固定fixture、Rust differential、Native / WASM parityはPASS。
- nightly branch coverageは未実行。stable reportのbranch counterは0/0。
- LeakSanitizerはptrace制約で完了していない。ASan / UBSanはLSAN無効化でPASS。
- Node.js WASM runtimeはPASSだが、個別のBrowser / OS実機matrixは未実行。最低browser versionは現行Requirements / Design / Specificationに定義されていないため、旧browser対応不足をformal findingとして採用していない。
- `review-common/review-playbook.md`は利用可能なpathに存在しなかった。利用可能なImplementation Review Skill一式とrepository normative documentsを適用した。
- Browser / OS / host compromise prevention、JavaScript runtime全体のsecret isolation、third-party cryptographic library内部の完全zeroization / constant-time、Applicationのcurrent Store selection / rollback preventionは既存Designの保証外であり、本reviewのfindingへ拡張していない。

## 12. Automatic Changes

- 新規作成: `docs/reviews/implementation/implement-review-013.md`
- 変更なし: Implementation、Requirements、Design、Specification、Store Format、tests、fixture、README、前回review artifact
- このreview artifact以外のsource / test / specification変更は行っていない。

## 13. Final Handoff

1. Review artifact: `docs/reviews/implementation/implement-review-013.md`
2. 対象 HEAD: `da26a209a273a3375484f8ccfb45a1f71148608b`
3. Review Gate: **READY**
4. severity別未解決finding件数: **Critical 0 / High 0 / Medium 0 / Low 0**
5. IR-001〜IR-022: **全件 Resolved**
6. IR-020再評価: **Resolved**
7. IR-022再評価: **Resolved**
8. 新規finding: **なし**
9. Native allocation / ownership: **PASS**
10. WASM binary integrity: **PASS**
11. Native / WASM parity: **PASS（external verifierは未確認）**
12. Security blocking gap: **なし**
13. Interoperability blocking gap: **なし（external verifierは未確認）**
14. Validation: formatter、clippy、workspace tests、Core、Native Rust、Native header、Native C runtime、WASM compile / Node runtime、fuzz target compileはPASS
15. Coverage: line 51.62%、function 46.88%、branch 0/0。target未達・branch未測定
16. 未確認事項: fuzz campaign、external verifier、nightly branch coverage、LSAN、Browser実機matrix
17. `IMPLEMENTATION READY`: **宣言可能**
18. 未解決finding 0件: **はい**
19. Review commit SHA: artifactを含むcommitのSHAをcommit後の最終報告に記載する。
20. Push先: `origin/agent/concept-review-follow-up`

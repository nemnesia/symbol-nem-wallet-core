# Implementation Review 012

## 1. Review Target

- 対象リポジトリ: `nemnesia/symbol-nem-wallet-core`
- 対象ブランチ: `agent/concept-review-follow-up`
- 対象 HEAD: `a23840c3c0038264112215fc779e848bb4161117`
- レビュー日: 2026-08-31
- レビュー種別: Implementation 全体再レビュー（差分限定ではない）
- 比較対象: `docs/reviews/implementation/implement-review-011.md`
- 対象範囲: Rust Core、Native C ABI、WASM Binding、公開 API、Store parser / serializer、暗号・署名・秘密情報 lifecycle、tests / fixtures、fuzz target、Cargo manifest / lock、feature、CI / build / runtime / coverage 導線
- 変更制約: Implementation、Requirements、Design、Specification、Store Format、tests、fixture は変更せず、新規 review artifact だけを作成した。

## 2. Execution Audit

### Phase 0 — Scope and source fixation

- `AGENTS.md`、`implement-review/SKILL.md`、`review-common/review-playbook.md`、`reviewers.md`、`review-gates.md`、`output-format.md`、`security-checklist.md` を適用した。
- 現行ブランチと対象 HEAD が一致することを確認した。
- 開始時の worktree は clean であり、`implement-review-011.md` は上書きしていない。
- Phase Context の登録はなく、未登録の Context は利用していない。
- 現行 Implementation 全体を対象とし、`ffd305a...` から `a23840c...` の差分だけに限定しなかった。

### Phase 1 — Independent review

- Reviewer A（Specification conformance）: handoff、restore、export、signing、AccountContext、error、Store Format、unknown field、binding contract を確認した。
- Reviewer B（Deep security）: secret owner / zeroization、authentication、approval、AAD、RNG、custom arithmetic、side-channel、panic / diagnostic leakage、FFI memory safety を確認した。
- Reviewer C（Protocol / interoperability）: Symbol / NEM の分離、Mainnet / Testnet、BIP39 / HD、address、署名 scheme、raw payload、CBOR wire と fixture を確認した。
- Reviewer D（Test / quality）: unit / integration、Native Rust / C runtime / header、WASM public runtime、failure / boundary、fuzz compile、coverage、dependency / feature configuration を確認した。

### Phase 2 — Refutation and integration

- IR-001〜IR-021 の過去 status を継承せず、現行コード、現行テストおよび runtime evidence で completion condition を再判定した。
- IR-016〜IR-019、IR-021 は修正成立を確認した。
- IR-007 は public function の直下にある test-only boundary seam と production wrapper の分離を確認し、completion condition を満たすと判定した。
- IR-020 は conversion / panic / detached / unreadable mapping の修正を確認したが、output allocation failure の stable `BindingFailure` 経路が実装上成立していないため Reopened とした。
- 現行 a23840c の WASM safe-copy が overridable な `Uint8Array.slice` を dispatch することを独立に確認し、IR-022 を新規採用した。
- custom scalar arithmetic、AEAD、nonce、Store history、Pending auto-promotion、Symbol / NEM primitive 混同、Core の不要な state / replay cacheについては、具体的な新規 defect を採用しなかった。

### Phase 3 — Gate and artifact

- 現行 gate rule に従い、Critical / High の New、Open、Reopened がないことを確認した。
- Medium の IR-020、IR-022 は残るが、Skill の gate rule では Medium / Low のみの場合は READY とする。
- coverage、branch coverage、fuzz campaign、external verifier、LeakSanitizer 完了の未確認事項は、PASS とせず Validation / Remaining Risks に分離した。
- 本 artifact 作成以外の変更、commit、push は行っていない。

## 3. Evidence Used

### Normative documents

| 区分 | 資料 | 使用範囲 |
| --- | --- | --- |
| Requirements | `docs/requirements/requirements.md` | FR-001〜FR-024、NFR-001〜NFR-005、SEC-001〜SEC-023、AC-001〜AC-049 |
| Design | `docs/design/architecture.md` | Core / Application / Binding 責務、trust boundary、stateless Store、ownership |
| Design | `docs/design/bindings.md` | Native / WASM boundary、DTO、error、ownership、lifecycle、parity |
| Design | `docs/design/security.md` | protected asset、secret lifecycle、authorization、zeroization、fail-closed |
| Specification | `docs/specifications/specification.md` | §4〜§9 API / DTO、§10 error、§11 failure、§13 Binding、§14 test / coverage |
| Store Format | `docs/specifications/wallet-store-format-v1.md` | CBOR、unknown field、deterministic encoding、resource limit、AAD、version、atomicity |
| Review history | `docs/reviews/implementation/implement-review-011.md` | IR-001〜IR-021 の初回 completion condition と未解決 finding |
| Upstream review | `docs/reviews/specifications/specification-review-013.md`、`wallet-store-format-v1-review-004.md` | 現行上流仕様の確定状態 |

### Implementation and test evidence

| 領域 | Evidence |
| --- | --- |
| Core API / lifecycle | `src/store.rs`、`src/types.rs`、`src/error.rs`、`src/crypto.rs`、`src/cbor.rs`、`src/lib.rs` |
| Store Format | `src/cbor.rs:1-370`、`src/store.rs:887-1137,1755-1812`、`tests/unit/store.rs:1238-` |
| Handoff / export / sign | `src/types.rs:103-228`、`src/store.rs:221-475,751-780,1514-1541`、`tests/core.rs:457-`、`tests/unit/wasm.rs:550-684` |
| Native | `bindings/native/src/lib.rs:261-1232`、`bindings/native/include/symbol_nem_wallet_core.h:7-255`、`bindings/native/tests/api.rs`、`caller_runtime.c`、`header_compile.c` |
| WASM | `src/wasm.rs:39-144,208-360,473-784`、`tests/unit/wasm.rs:686-782` |
| Generated key boundary | `src/store.rs:595-700`、`tests/unit/store.rs:761-802` |
| CI / fuzz / build | `.github/workflows/coverage.yml`、`.github/workflows/fuzz.yml`、`fuzz/Cargo.toml`、`fuzz/fuzz_targets/wallet_store_decode.rs`、`scripts/build-wasm.sh` |

## 4. Review Result

**READY**（Critical / High の未解決 finding なし。Medium 2件を条件付き残存リスクとして記録）

## 5. Summary

現行 HEAD は、implement-review-011 の Critical IR-016、High IR-019 およびその他の未解決 finding に対する主要修正を実装している。生成 Profile の handoff、explicit export、signing approval、AccountContext、recursive unknown-field validation、Native output / release lifecycle、BindingFailure の具体的 conversion mapping、secret validation の早期終了除去を確認した。

一方、次の2件は現行実装に残る。

1. **IR-020 Reopened / Medium**: Native の `Vec` / `Box`、WASM の `Vec` / `Uint8Array::from` 等が infallible allocation のままであり、仕様が定める output allocation failure → `BindingFailure` を return する経路がない。
2. **IR-022 New / Medium**: WASM の共通 binary copy path が `Reflect::get(value, "slice")` で取得した JavaScript method を呼ぶため、instance または prototype の overridable `slice` によって同じ長さの入力 byte 列を置換できる。これは raw payload をそのまま扱う契約と一致しない。

この2件は現行 gate で Required Change となる Critical / High ではない。Symbol / NEM の protocol bytes、Core authorization、Native / WASM の主要 parity、secret lifecycle に Critical / High の blocking gap は確認していない。

## 6. Finding Status

| ID | Severity | Current status | 再評価 |
| --- | --- | --- | --- |
| IR-001 | HIGH | Resolved | secret temporary / scalar arithmetic の境界を再確認。回帰なし。 |
| IR-002 | HIGH | Resolved | BIP39、entropy、seed、HD lifecycle を再確認。回帰なし。 |
| IR-003 | HIGH | Resolved | decrypted payload、CBOR、key record、secret owner を再確認。回帰なし。 |
| IR-004 | MEDIUM | Resolved | fixed field、enum、fatal parser を再確認。回帰なし。 |
| IR-005 | MEDIUM | Resolved | AAD、unknown wire value、duplicate、atomicity を再確認。回帰なし。 |
| IR-006 | MEDIUM | Resolved | Native / WASM DTO、ownership、parity を再確認。回帰なし。 |
| IR-007 | LOW | Resolved | public `generate_software_key` boundary seam と failure paths を確認。 |
| IR-008 | MEDIUM | Resolved | error / malformed / fail-closed を再確認。回帰なし。 |
| IR-009 | MEDIUM | Resolved | Store atomicity、replacement、pending を再確認。回帰なし。 |
| IR-010 | HIGH | Resolved | key、password、payload temporary の zeroization を再確認。回帰なし。 |
| IR-011 | HIGH | Resolved | authentication、AAD、semantic validation を再確認。回帰なし。 |
| IR-012 | HIGH | Resolved | Symbol / NEM signing と key/address を再確認。回帰なし。 |
| IR-013 | LOW | Resolved | diagnostics / Debug secret leakage を再確認。回帰なし。 |
| IR-014 | LOW | Resolved | resource limits / allocation 前検査を再確認。回帰なし。 |
| IR-015 | LOW | Resolved | secret comparison / failure diagnostic を再確認。回帰なし。 |
| IR-016 | CRITICAL | Resolved | handoff、export、signing approval、AccountContext、Chain / Network fail-closed を確認。 |
| IR-017 | MEDIUM | Resolved | unknown CBOR type、recursive validation、preservation、AAD、enum fatal を確認。 |
| IR-018 | MEDIUM | Resolved | Native operation-start initialization、partial output 防止を確認。 |
| IR-019 | HIGH | Resolved | mutable release、NULL / 0、double release no-op、header parity を確認。 |
| IR-020 | MEDIUM | Reopened | conversion / panic / detached は解消。output allocation failure mapping は未成立。 |
| IR-021 | LOW | Resolved | Core-owned validation / duplicate comparison の secret-dependent early exit を確認。 |
| IR-022 | MEDIUM | New | WASM `slice` method dispatch による binary input substitution。 |

Current formal finding count（Resolved を除く）: **CRITICAL 0 / HIGH 0 / MEDIUM 2 / LOW 0**。

## 7. Required Changes

現行 Skill gate 上、Critical / High の未解決 finding がないため、gate 必須の Required Change はない。

ただし、公開前の実装品質として IR-020 と IR-022 の修正を推奨する。これらを修正する場合は、Binding の公開契約と runtime test を再レビューすること。

## 8. Optional Improvements

- IR-020: Native / WASM の output allocation failure を明示的に `BindingFailure` として返し、部分 output を返さない allocation failure injection / runtime evidence を追加する。
- IR-022: overridable JavaScript method dispatch を避けた intrinsic typed-array copy path と、same-length byte substitution の public runtime test を追加する。detached / unreadable / attached empty の既存条件を維持する。
- fuzz campaign、branch coverage、外部 `symbol-sdk` / reference verifier の実行証跡を CI または外部検証環境で補完する。
- coverage tool version と test-source mapping を固定または説明可能にし、CI threshold と local report の再現性を高める。

## 9. Resolved Findings

### IR-007 — public `generate_software_key` failure boundary

- **判定**: Resolved / LOW
- **事実**: production `generate_software_key` (`src/store.rs:595-609`) は `crypto::generate_private_key` と `encode_store` を渡して `generate_software_key_with` を呼び、test-only injection は `#[cfg(test)]` の `generate_software_key_public_boundary_for_test` (`src/store.rs:656-700`) に隔離されている。
- **Evidence**: `tests/unit/store.rs:761-802` が RNG failure、all-zero invalid candidate retry、serialization failure を確認し、各失敗で input Store の byte 列を変更しない。成功時だけ replacement を返し、production wrapper に test RNG の依存はない。
- **Completion condition**: public wrapper が実際の CSPRNG / serializer を使用し、failure seam が同一 public boundary直下の処理を検証し、failure 時に input mutation / replacement / partial key がないことを満たす。

### IR-016 — authorization assertions and AccountContext

- **判定**: Resolved / CRITICAL
- **事実**: `finalize_generated_profile` は `Confirmed` の handoff を要求し (`src/store.rs:221-231`)、restore (`src/store.rs:311-316`) は handoff を受け取らない。export は target、`Requested`、target-specific `Confirmed`、password を `validate_export_request` (`src/store.rs:1514-1530`) で要求する。sign は `Approved` を要求し (`src/store.rs:751-780`)、`get_public_account` / sign は `validate_account_context` (`src/store.rs:1532-1541`) を通る。
- **Binding**: Native header (`symbol_nem_wallet_core.h:139-227`) と WASM public API (`src/wasm.rs:502-725`) は DTO field を公開し、Binding が assertion を生成・補完しない。sign は `request.payload` を Core へそのまま渡す。
- **State**: Core、Native、WASM に freshness nonce、replay cache、authorization cache、Store history state は追加されていない。freshness は Application / UI の責任として維持される。
- **Evidence**: `tests/core.rs:457-590`、`tests/unit/wasm.rs:550-684`、Native API / C runtime の unconfirmed、not requested、not approved、target mismatch、wrong context を確認した。WASM runtime でも assertion negative path が PASS。
- **Completion condition**: missing / unconfirmed / wrong target / wrong context / wrong password で secret、signature、profile success、replacement を返さず、confirmed / approved と password / fixed context が一致した場合だけ成功することを満たす。

### IR-017 — unknown CBOR field type and recursive validation

- **判定**: Resolved / MEDIUM
- **事実**: top-level (`src/store.rs:887-945`)、Profile、KDF、Cipher、payload、key record、origin、index の各 map が `validate_unknown_fields` を呼ぶ。`validate_unknown_value` (`src/store.rs:1771-1792`) は unsigned integer、bytes、text、array、map だけを許可し、array element と map value を再帰検証する。map key / canonical order / depth / collection / byte limits は `src/cbor.rs` の parser が先に検証する。
- **Reject**: negative、tag、float、simple、boolean、null は `InvalidStore`。known enum の unknown value も preservation せず fatal error。
- **Preservation / AAD**: 許可された unknown value は `Value` として lossless に保持し、`aad_software_key_index` は受信 wire value を保持して AAD に再利用する。known field の logical reconstruction で置換しない。
- **Evidence**: `tests/unit/store.rs:1238-1258,1272-1375` の recursive allow-list、nested value、serialization / mutation preservation、payload / fixed-field / non-canonical order tests、workspace test PASS。
- **Completion condition**: specified object locations全体で type allow-list、recursive reject、lossless preservation、AAD wire semantics、unknown enum fatal が成立することを満たす。

### IR-018 — Native failure-safe output initialization

- **判定**: Resolved / MEDIUM
- **事実**: 各 public operation が開始直後に `reset_output` または `reset_array_output` (`bindings/native/src/lib.rs:324-337` および public functions) を呼び、`require_output` 後に Core / conversion を実行する。success assignments は必要な conversion の後に行われる。
- **Atomicity**: `snwc_prepare_generated_profile` は mnemonic / pending / warnings の conversion 前に output を公開せず (`bindings/native/src/lib.rs:506-543`)、複数 output operation は全 pointer の妥当性確認後に処理する。
- **Evidence**: `bindings/native/tests/api.rs:140-215`、`caller_runtime.c:212-229` で invalid input / NULL output / malformed mnemonic の failure-safe state と partial output 不在を確認。header は `symbol_nem_wallet_core.h:17-20` で同じ契約を記載。
- **Completion condition**: invalid input、Core error、conversion failure の Native operation で success DTO / secret / replacement / partial output を残さず、failure-safe state を返すことを満たす。

### IR-019 — Native release lifecycle

- **判定**: Resolved / HIGH
- **事実**: `snwc_free_bytes` (`bindings/native/src/lib.rs:1155-1165`) は mutable handle を受け、内容を zeroize してから解放し、常に ptr / len を NULL / 0 にする。warnings、profile array、software-key array (`:1173-1232`) も同じ failure-safe handle transition を行う。
- **Safety contract**: header (`symbol_nem_wallet_core.h:14-25,252-255`) が binding-owned pointer と mutable release を明示し、foreign pointer / inconsistent length は保証外とする。
- **Evidence**: `bindings/native/tests/api.rs` および `caller_runtime.c:95-108,151-165` で list array の release 後 NULL / 0 と second release no-op を確認し、secret bytes / address / signature / store も `snwc_free_bytes` 経由で解放した。header compile と C runtime は PASS。
- **Completion condition**: byte、secret、address、signature、pending、store、warnings、list array の release 後再利用不能、二度目の release no-op、header / implementation parity を満たす。

### IR-021 — Core-owned secret comparison control flow

- **判定**: Resolved / LOW
- **事実**: private key validation (`src/crypto.rs:169-187`) は全 byte を走査して invalid state を集約する。duplicate comparison (`src/store.rs:1562-1587`) は各候補の全32 byteを走査し、first mismatch で early exit しない。secret-dependent indexing はない。
- **Scope**: candidate validity の必要な retry、third-party cryptographic library 内部、compiler / runtime / CPU の完全 constant-time はこの finding の要求範囲に含めない。
- **Evidence**: all-zero / candidate retry、duplicate、custom scalar / signing tests、clippy / workspace test PASS。
- **Completion condition**: Core-owned validation / duplicate comparison に不要な secret-dependent early exit、branch、indexing が残らず、必要な retry semantics を壊していないことを満たす。

## 10. Upstream Feedback

なし。IR-020 と IR-022 は現行 Binding implementation の問題であり、Requirements / Design / Specification / Store Format の欠落や競合ではない。上流資料は allocation failure mapping と raw payload semantics を既に定義しているため、Implementation で仕様を緩和・補完していない。

## 11. Deferred Findings

Formal finding としては採用しないが、次の検証は外部環境または追加実行が必要である。

- 外部 `symbol-sdk` 3.3.2 / reference verifier を新規 process として実行した証跡。既存の deterministic fixture と Rust differential test は PASS だが、外部 verifier runtime の今回実行はない。
- `cargo fuzz run wallet_store_decode -- -max_total_time=60 -timeout=5` の campaign / corpus。target compile は PASS、campaign は未実行。
- stable `cargo llvm-cov` report の branch counter は 0/0。nightly branch coverage は未実行。
- LeakSanitizer を有効にした sanitizer runtime。ASan / UBSan は `detect_leaks=0` で PASS したが、LeakSanitizer は ptrace 環境エラーで完了していない。
- output allocation failure injection。現行コードに fallible allocation seam がなく、IR-020 Reopened の根拠になっている。
- same-length overridable `Uint8Array.slice` substitution の public WASM runtime test。Node の JavaScript property behavior は再現したが、現行 runtime test は throwing getter / detach / empty の確認までである。

## 12. Scope and Traceability

| 要求 / 設計 / 仕様 | 現行確認 |
| --- | --- |
| FR-001、FR-019、SEC-010、SEC-017、AC-001、AC-034 | generated handoff、restore、Native / WASM DTO |
| FR-009、FR-013、SEC-004、SEC-011、SEC-023、AC-009、AC-047、AC-049 | signing approval、AccountContext、Chain / Network、side-channel |
| FR-022 / FR-023、SEC-015、SEC-020、AC-041〜AC-043 | explicit export authorization、secret result lifecycle |
| FR-003〜FR-005、FR-017〜FR-021、AC-005、AC-037〜AC-039、AC-046 | generated / derived / imported、atomicity、RNG、Pending |
| DR-001〜DR-009、AC-044〜AC-048 | stateless Core、Store history、coverage、version、failure |
| Store Format §2、§2.1、§2.2、§4、§7、§11、§12 | CBOR type、recursive limits、unknown preservation、AAD、determinism |
| Specification §10、§13.1、§13.2、§14.1〜§14.3 | error mapping、Native / WASM parity、test / fixture / coverage |

## 13. Domain Checks

| Check | 判定 | Evidence / note |
| --- | --- | --- |
| Specification conformance | PARTIAL WITH MEDIUM FINDINGS | IR-020、IR-022。authorization / Store / error の主要契約は適合。 |
| Handoff / restore | PASS | finalize の Confirmed 必須、restore の handoff 不要、pending target / password / store hash 検証。 |
| Export authorization | PASS | target + Requested + target-specific Confirmed + password。未成立時 secret / replacement なし。 |
| Signing authorization | PASS | SigningRequest + Approved + password、payload raw、AccountContext verification。 |
| Chain / Network | PASS | Symbol / NEM、Mainnet / Testnet、fixed Chain / Network mismatch fail-closed。 |
| BIP39 / HD | PASS | English 24 words、BIP32 intermediate、all v1 chain / network boundary fixture。 |
| Symbol / NEM signing | PASS WITH EXTERNAL VERIFIER DEFERRED | Symbol Ed25519 と NEM ed25519-keccak の fixture / SDK expected bytes。 |
| Custom scalar arithmetic | PASS | dalek differential、order boundary、signing vector。 |
| Argon2id / AES-256-GCM | PASS | fixed parameters、encryption fixture、authentication failure。 |
| AAD | PASS | registry / profile / network / duplicate tag / received index wire value。 |
| Pending / Store atomicity | PASS | input unchanged、target hash、failure no replacement、Core historyなし。 |
| Deterministic CBOR | PASS | canonical integer / length、map order、complete item、no duplicate、resource limits。 |
| Unknown fields | PASS | top-level / Profile / KDF / Cipher / payload / key / origin / index の recursive allow-list と preservation。 |
| Unknown enum / version | PASS | fatal `InvalidStore` または version-specific error、skip / fallback / migrationなし。 |
| Error / fail-closed | PARTIAL | Core error preservation、conversion / panic / detach mappingはPASS。allocation failureはIR-020。 |
| Secret owner / zeroization | PASS | Core DTO / temporary / decrypted payload / Native release。host GC / third-party internalsは保証外。 |
| Native / WASM parity | PARTIAL | Core result / errors / authorization parityはPASS。WASM byte copy substitutionはIR-022。 |
| Native memory safety | PASS WITH ALLOCATION GAP | output reset、mutable release、double release no-op、header parity。allocation mappingはIR-020。 |
| WASM boundary | PARTIAL | actual runtimeで detach / throwing getter / empty をPASS。overridable `slice` はIR-022。 |
| Resource limits | PASS | raw Store 16 MiB、bytes/text 1 MiB、collections 256、depth 32、object limits。 |
| RNG / generated key | PASS | CSPRNG、invalid candidate retry、RNG / serialization failure atomicity。 |
| Dependency / feature configuration | PASS | `cargo tree --workspace --all-features --locked`、WASM optional deps、crypto feature flags、Native path dependency。 |
| Fuzz / parser robustness | PARTIAL | target compile と parser boundary testsはPASS。campaignは未実行。 |
| Coverage | NOT TARGET PASS | local line 51.62%、function 46.88%、branch 0/0。NFR-005 は SHOULD。未達理由と影響を本 artifact に記録。 |

## 14. Validation Results

| Command / check | Result | Evidence / limitation |
| --- | --- | --- |
| `cargo fmt --all -- --check` | PASS | exit 0 |
| `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` | PASS | exit 0 |
| `cargo test --workspace --all-features --locked` | PASS | Core unit 46、Core integration 6、Native Rust unit 1、Native API 2、doc-tests 0。全 test PASS。 |
| Core tests | PASS | workspace test に含む。BIP39 / HD、Symbol / NEM、scalar、CBOR、AAD、Pending、atomicity を確認。 |
| Native Rust tests | PASS | workspace test に含む。Native unit / API tests全件 PASS。 |
| `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -c bindings/native/tests/header_compile.c -o /tmp/snwc-header-compile.o` | PASS | standalone public header compile。 |
| `./bindings/native/tests/run_c_abi_runtime.sh` | PASS | Native build、C compile、C caller runtime。DTO、failure-safe output、secret / store / list release、second release。 |
| `cargo check --target wasm32-unknown-unknown --features wasm --locked` | PASS | exit 0 |
| `wasm-pack test --node --locked --features wasm` | PASS | temp directoryを `/tmp` に固定した再実行。public WASM runtime 4 tests PASS。detach、throwing getter、unreadable、attached empty payload を実行。初回は sandbox read-onlyで未完了。 |
| `cargo check --manifest-path fuzz/Cargo.toml --locked --bin wallet_store_decode` | PASS | registry接続許可後に exit 0。campaignは未実行。sandbox DNSのみの初回試行は失敗。 |
| `cargo llvm-cov --package symbol-nem-wallet-core --all-features --locked --json` | MEASURED / TARGET NOT MET | `cargo-llvm-cov v0.9.0`。line 1909/3698 = 51.62%、function 195/416 = 46.88%、branch 0/0。 |
| CI threshold report (`--fail-under-lines 90 --fail-under-functions 90`) | FAIL | local tool report は exit 1。NFR-005 / AC-044 は SHOULDであり、uncovered source mapping / branch未測定を本 artifact に記録。 |
| branch coverage | NOT VALIDATED | stable report counter 0/0。nightly toolchain未導入のためCI informational branch jobは実行していない。 |
| `SNWC_C_ABI_SANITIZERS=1 ./bindings/native/tests/run_c_abi_runtime.sh` | NOT VALIDATED | LeakSanitizer が ptrace環境で fatal error。コード assertion / sanitizer defectとは判定していない。 |
| `ASAN_OPTIONS=detect_leaks=0 LSAN_OPTIONS=detect_leaks=0 SNWC_C_ABI_SANITIZERS=1 ./bindings/native/tests/run_c_abi_runtime.sh` | PASS (partial) | ASan / UBSan runtime は exit 0。LeakSanitizer の検査結果ではない。 |
| external verifier / fuzz campaign | NOT RUN | 外部 `symbol-sdk` / reference verifierと60秒 fuzz campaignは今回未実行。 |
| `cargo tree --workspace --all-features --locked -e features` | PASS | optional WASM dependency、`getrandom/wasm_js`、crypto feature、Native dependencyを確認。 |
| `git diff --check` | PASS | artifact作成前の現行実装に whitespace errorなし。artifact自体も末尾空白検査を実施。 |

Coverage の未達は、現行 `cargo-llvm-cov v0.9.0` が `#[path]` で組み込まれた test module の未実行行を `src/*.rs` の source summary に含める出力となり、implement-review-011 の過去測定値と直接比較できないことも影響している。過去値を継承して target PASS とは扱わない。仕様 §14.3 に従い、実測値、threshold exit code、未達理由、branch 0/0 および重要な security / interoperability / failure-path の独立 validation を分離して記録した。

## 15. Review Gates

| Gate | Result | Basis |
| --- | --- | --- |
| Specification conformance | PASS WITH MEDIUM FINDINGS | IR-016、IR-017、request DTO、Store Format、Core errorは適合。IR-020、IR-022を記録。 |
| Security | PASS WITH MEDIUM FINDINGS | Critical authorization bypass、secret leak、nonce reuse、custom crypto defect、Native double-freeは確認なし。IR-020 / IR-022は非blocking。 |
| Interoperability | PASS | Symbol / NEM、Mainnet / Testnet、BIP39 / HD、raw signature fixtureは適合。external verifierは未確認。 |
| Abnormal / error / fail-closed | PASS WITH MEDIUM FINDINGS | Core / request / Store / detached / panic / output resetは適合。allocation mapping gapをIR-020。 |
| Tests / evidence | PASS WITH DEFERRED EVIDENCE | unit、integration、Native C、WASM runtime、fuzz compileはPASS。campaign / branch / external verifier / LeakSanitizerは未実行。 |
| Quality / memory / dependency | PASS WITH MEDIUM FINDINGS | ownership、release、header parity、feature configは適合。allocation handlingとWASM method dispatchを記録。 |

Formal Gate: **READY**。Skill gate rule上、未解決 Critical / High が0件であり、Medium / Low のみのため `REVISE IMPLEMENTATION` にはしない。

## 16. Remaining Risks and Open Decisions

- IR-020 は、ホスト allocator の失敗を Rust `catch_unwind` だけで捕捉できないという実装上の gap である。通常 input の resource limit は適用されるが、仕様上の stable output allocation failure contract は未充足である。
- IR-022 は、JS realm 内の instance / prototype method override により、typed array の実 backing bytes と異なる same-length bytes を Core へ渡し得る。これは host compromise 全体を防止する主張ではなく、Binding が受け取った binary representation の取り扱いに関する defect である。
- `IMPLEMENTATION READY` は現行 Skill gate の意味では宣言可能。ただし、Medium 2件は release readiness で解消または明示的に受容判断する必要がある。
- Security blocking gap: **なし**。Critical / High の未解決 findingなし。
- Interoperability blocking gap: **なし**。内部 fixture / differential はPASS。外部 verifier runtime未確認は残るが、現時点で protocol defect は採用していない。
- Upstream decision: **なし**。Requirements / Design / Specification / Store Format の変更は不要。
- Core statelessness: **PASS**。authorization freshness、replay cache、Store history detector、rollback stateを追加していない。
- Coverage target: NFR-005 / AC-044 の targetは未達実測であり、branchは未測定。仕様上 SHOULD であり、独立した重要 failure / security testの合格を置き換えない。

## 17. Automatic Changes

- 新規作成: `docs/reviews/implementation/implement-review-012.md`
- 変更なし: Implementation、Requirements、Design、Specification、Store Format、tests、fixture、README、過去 review。
- commit: 作成していない。
- push: 実行していない。

## 18. Final Decision

**READY**

**IMPLEMENTATION READY は、現行 Implementation Review Skill の gate rule 上、宣言可能。**

ただしこれは「Critical / High の未解決 finding がない」という gate 判定であり、IR-020（Medium / Reopened）、IR-022（Medium / New）、coverage target、branch coverage、external verifier、fuzz campaign、LeakSanitizer 完了を意味しない。

Review artifact の commit SHA: **なし（未commit）**

Push先: **未実施**。対象ブランチの upstream は `origin/agent/concept-review-follow-up`。

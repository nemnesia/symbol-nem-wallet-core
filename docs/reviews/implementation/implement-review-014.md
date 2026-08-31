# Implementation Review 014

## Review Target

- 対象リポジトリ: `nemnesia/symbol-nem-wallet-core`
- 対象ブランチ: `agent/concept-review-follow-up`（作業ブランチを維持）
- 対象 Implementation HEAD: `da26a209a273a3375484f8ccfb45a1f71148608b`
- レビュー日: 2026-08-31
- 前回レビュー: `docs/reviews/implementation/implement-review-013.md`
- 成果物: `docs/reviews/implementation/implement-review-014.md`
- レビュー種別: Implementation 全体再レビュー。差分限定レビューではない。
- 対象範囲: Rust Core、Native C ABI、WASM Binding、公開 API、Store parser / serializer、暗号・署名・秘密情報 lifecycle、tests / fixture、fuzz target、Cargo manifest / lock、feature、build / runtime / coverage 導線。
- 変更制約: Implementation、Requirements、Design、Specification、Store Format、tests、fixture、README、Skill および既存 review artifact は変更せず、本 artifact だけを新規作成する。

開始時に worktree は clean で、現行 branch の HEAD は `77a19b01541b68a8e4337922c3a82094eeaa0ce9` だった。指定 Implementation HEAD と現行 branch の差分は `implement-review-013.md` のみであり、Implementation の source / test tree は指定 HEAD と一致していた。`implement-review-012.md` と `implement-review-013.md` は変更していない。

未確認範囲は、個別 Browser 実機 matrix、fuzz campaign、独立 external verifier process、nightly branch coverage および完了した LeakSanitizer 実行である。これらは PASS として扱わない。

## Execution Audit

### Required material loading

repository root から次の資料を実際に開いて確認した。

1. `AGENTS.md` — repository 作業指針、Source of Truth、変更・検証・Git の制約。
2. `.agents/skills/implement-review/SKILL.md` — Implementation Review の責務、Phase 0〜3、判定規則。
3. `.agents/skills/review-common/review-playbook.md` — 共通の Phase 0〜3、独立 pass、反証・統合、成果物と Git の規則。
4. `.agents/skills/implement-review/reviewers.md` — Reviewer A〜D の責務と Chair の採用基準。
5. `.agents/skills/implement-review/review-gates.md` — 6 gate、severity および READY / REVISE IMPLEMENTATION 規則。
6. `.agents/skills/implement-review/output-format.md` — Implementation 固有の出力形式、IR prefix、required / optional の扱い。
7. `.agents/skills/implement-review/security-checklist.md` — 適用可能な security、secret、crypto、FFI、WASM、failure、test 観点。

`review-common/review-playbook.md` は実際には `.agents/skills/review-common/review-playbook.md` に存在し、正常に読み込めた。013 の「`review-common/review-playbook.md` が存在せず読込不能」という記録は、repository root からの実パス確認が不十分だった手順上の誤りである。013 の技術判定・status・gate はこの監査結果をもって機械的には継承していない。`AGENTS.md` に Implementation Phase Context の登録はなく、未登録 Context は使用していない。

### Phase 0 — Scope, source and boundary fixation

- 対象 HEAD、branch、worktree、前回 artifact および source-only の差分を固定した。
- 主な normative source として `docs/requirements/requirements.md`、`docs/design/architecture.md`、`docs/design/bindings.md`、`docs/design/security.md`、`docs/specifications/specification.md`、`docs/specifications/wallet-store-format-v1.md` を確認した。
- Core、Native、WASM、tests、fixture、fuzz、feature / dependency を全体対象とした。Browser / OS / host compromise、Application の current Store 選択・rollback prevention、third-party crypto library 内部の完全消去は既存 Design の保証外として境界を維持した。
- README は公開 API の追跡補助として確認したが、Implementation formal finding の対象にはせず、別の README review へ deferred とした。

### Phase 1 — Independent Reviewer A〜D passes

利用可能な subagent はなく、実施していない subagent を記録しない。playbook の規定どおり、同一 Chair が相互に独立した4つの review pass として実行した。

- Reviewer A — Specification conformance: API / DTO、HandoffConfirmation、ExportRequest、SigningRequest / SigningApproval、AccountContext、error、Store Format、Native / WASM contract を照合した。IR-022 の actual `Uint8Array` brand 条件を残存候補として抽出した。
- Reviewer B — Deep security: protected asset、authorization、secret owner / zeroization、authentication、AAD、RNG、custom scalar arithmetic、panic / diagnostic、FFI allocation / release、WASM representation および failure atomicity を確認した。IR-020 の failure-safe output と IR-022 の input integrity を攻撃経路として再確認した。
- Reviewer C — Protocol / interoperability: Symbol / NEM、Mainnet / Testnet、BIP39 / HD、address、raw signing、deterministic CBOR、fixture および Native / WASM の結果一致を確認した。同長 payload の signature substitution は再現しなかった。
- Reviewer D — Test / quality: Core / Native / WASM test、C header、C runtime、failure injection、fuzz target compile、sanitizer、coverage、feature / dependency および supplemental generated binding probe を確認した。IR-022 の non-`Uint8Array` negative test 不足を Chair へ返した。

### Phase 2 — Refutation and integration

- 過去 IR-001〜IR-022 の status を機械的に継承せず、現行 source、test、runtime および completion condition を再確認した。
- IR-020 は Native の raw allocation / guard / exact-layout release / zeroization、WASM の recoverable copy・construction failure mapping、multi-output failure および test-only seam の境界を独立に確認した。completion condition を満たすため Resolved とした。
- IR-022 の元の問題である input の `slice` / `subarray` / `set` dispatch と同長 payload replacement は、intrinsic accessor / backing buffer copy と runtime test により解消されていた。
- ただし `src/wasm.rs:69-96,138-184` の `ArrayBuffer.isView` は view 全般を検証するだけで、WASM public entrypoint の `&Uint8Array` に対する実際の typed-array brand を検証していない。生成 binding を Node.js で一時 build して、valid empty Store の backing buffer を共有する `Uint8ClampedArray` を `list_profiles` に渡すと受理されることを確認した。`Uint8ClampedArray` は `Uint8Array` ではないため、actual `Uint8Array` 条件は未達である。
- この残存欠陥は元の IR-022 の representation / input-integrity completion condition に属するため、新しい IR-023 は作成せず、IR-022 を Reopened とした。Proxy reject、detached / unreadable fail-closed、attached empty、bounds、same-length payload signature の条件は別途満たしている。

### Phase 3 — Gate and artifact

- CRITICAL / HIGH の New / Open / Reopened は0件である。
- MEDIUM の IR-022 Reopened が1件ある。Implementation Review gate は CRITICAL / HIGH の未解決 finding のみ `REVISE IMPLEMENTATION` を発生させるため、最終判定は `READY` とする。
- `READY` は IR-022 が解決済みであることを意味しない。IR-022 は正式な未解決 finding として Optional / non-blocking に記録する。
- coverage、branch coverage、fuzz campaign、external verifier、LSan および Browser matrix は実行結果と未実行結果を分離して記録する。

## Evidence Used

| 区分 | 資料 / 対象 | 確認目的 |
| --- | --- | --- |
| Procedure | `AGENTS.md`、`.agents/skills/implement-review/SKILL.md`、`.agents/skills/review-common/review-playbook.md`、`reviewers.md`、`review-gates.md`、`output-format.md`、`security-checklist.md` | 必須資料、Phase 0〜3、Reviewer A〜D、採用基準、gate、出力形式、security観点 |
| History | `docs/reviews/implementation/implement-review-012.md`、`implement-review-013.md` | IR-001〜IR-022 の初出・completion condition・前回判断。ただし current evidence から再判定 |
| Requirements / Design | `docs/requirements/requirements.md`、`docs/design/architecture.md`、`docs/design/bindings.md`、`docs/design/security.md` | Core / Binding 責務、authorization、secret ownership、host compromise 境界、statelessness |
| Specification | `docs/specifications/specification.md` | API、error、Handoff、export、signing、AccountContext、Native / WASM、failure、zeroization、テスト契約 |
| Store format | `docs/specifications/wallet-store-format-v1.md` | deterministic CBOR、recursive unknown validation、AAD、limits、atomic replacement |
| Core | `src/lib.rs`、`src/error.rs`、`src/types.rs`、`src/cbor.rs`、`src/crypto.rs`、`src/store.rs` | 暗号、parser、Store、lifecycle、authorization、atomicity、secret owner |
| Native | `bindings/native/src/lib.rs`、`bindings/native/include/symbol_nem_wallet_core.h` | C ABI、fallible allocation、guard、release、zeroization、failure-safe output |
| WASM | `src/wasm.rs`、生成 binding の supplemental build | binary view、intrinsic accessor、copy、construction、error mapping、module initialization |
| Tests / fixture | `tests/core.rs`、`tests/unit/wasm.rs`、`tests/unit/store.rs`、`bindings/native/tests/api.rs`、`caller_runtime.c`、`header_compile.c`、fuzz target | normal / malformed / boundary / parity / allocation failure / signature / parser coverage |
| Compatibility | MDN の [`ArrayBuffer.prototype.detached`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/detached)、[Can I Use の対応表](https://caniuse.com/mdn-javascript_builtins_arraybuffer_detached) | intrinsic の現行 browser availability と最低 browser version 未定義の扱い |

## Review Result

**READY**

IR-022 Reopened は MEDIUM であり、現行 Implementation Review の gate rule 上、CRITICAL / HIGH の未解決 finding がないため `REVISE IMPLEMENTATION` にはしない。ただし、implementation の全 completion condition が満たされた状態ではなく、IR-022 の exact `Uint8Array` validation は修正・再確認が必要である。

## Summary

IR-020 の Native / WASM failure-safe output、ownership、guard、release、zeroization および test-only failure seam は completion condition を満たした。IR-016、IR-017、IR-018、IR-019、IR-021、IR-007を含む過去の重要 findingにも回帰は確認されなかった。

IR-022 の元の `slice` override による同長 payload replacement は解消され、runtime test でも payload A の signature が維持された。一方、WASM の入力判定が `ArrayBuffer.isView` と1 byte element の長さ整合性に留まり、`Uint8ClampedArray` を `Uint8Array` として受理するため、actual `Uint8Array` の公開型契約は満たされない。このため IR-022 は Reopened とする。

新規の CRITICAL / HIGH / MEDIUM / LOW ID は作成しない。IR-022 の残存欠陥を別 ID として二重計上しない。

## Finding Status

| ID | Severity | Current status | 現行 HEADでの再評価 |
| --- | --- | --- | --- |
| IR-001 | HIGH | Resolved | secret temporary と scalar arithmetic に回帰なし。 |
| IR-002 | HIGH | Resolved | BIP39、seed、HD lifecycle、chain / network path に回帰なし。 |
| IR-003 | HIGH | Resolved | decrypted payload、key record、secret owner に回帰なし。 |
| IR-004 | MEDIUM | Resolved | fixed field、enum、fatal parser に回帰なし。 |
| IR-005 | MEDIUM | Resolved | AAD、unknown wire value、duplicate、atomicity に回帰なし。 |
| IR-006 | MEDIUM | Resolved | Native / WASM DTO、ownership、通常結果の parity に回帰なし。 |
| IR-007 | LOW | Resolved | generated Software Key の CSPRNG / serialization failure boundary と production / test seam 分離を確認。 |
| IR-008 | MEDIUM | Resolved | error、malformed input、fail-closed mapping に回帰なし。 |
| IR-009 | MEDIUM | Resolved | Store atomicity、replacement、Pending lifecycle に回帰なし。 |
| IR-010 | HIGH | Resolved | password、seed、key、payload temporary の zeroization に回帰なし。 |
| IR-011 | HIGH | Resolved | authentication、AAD、semantic validation に回帰なし。 |
| IR-012 | HIGH | Resolved | Symbol / NEM signing、key、address に回帰なし。 |
| IR-013 | LOW | Resolved | Debug / diagnostic による secret leakage に回帰なし。 |
| IR-014 | LOW | Resolved | resource limit と allocation 前検査に回帰なし。 |
| IR-015 | LOW | Resolved | secret comparison と failure diagnostic に回帰なし。 |
| IR-016 | CRITICAL | Resolved | HandoffConfirmation、ExportRequest、SigningApproval、AccountContext、Core authorization を確認。 |
| IR-017 | MEDIUM | Resolved | recursive unknown CBOR validation、preservation、AAD、unknown enum fatal を確認。 |
| IR-018 | MEDIUM | Resolved | Native operation-start reset と partial output 防止を確認。 |
| IR-019 | HIGH | Resolved | Native release lifecycle、exact layout、double release no-op を確認。 |
| IR-020 | MEDIUM | Resolved | Native / WASM output allocation failure と failure-safe completion condition を確認。 |
| IR-021 | LOW | Resolved | Core-owned secret-dependent early exit に具体的回帰なし。 |
| IR-022 | MEDIUM | **Reopened** | override method と同長 payload substitution は解消。ただし non-`Uint8Array` view の受理により actual `Uint8Array` condition 未達。 |

未解決 formal finding は **MEDIUM 1 / LOW 0** であり、CRITICAL / HIGH は0件である。

## Required Changes

なし。CRITICAL / HIGH の New / Open / Reopened は存在しない。

## Optional Improvements

### IR-022 — WASM binary input の exact `Uint8Array` validation（MEDIUM / Reopened）

- 対象箇所: `src/wasm.rs:69-96,138-184` および `&Uint8Array` を受ける public entrypoint。
- 発生条件・確認事実: `snwc_is_uint8_array_view` は `ArrayBuffer.isView(value)` のみを呼び、`byteLength == length` 等を確認する。現行 generated binding の supplemental Node probe では、valid empty Store と同じ backing buffer の `Uint8ClampedArray` を `list_profiles` に渡すと受理された。これは実際の `Uint8Array` ではない。
- 既存根拠: Specification §13.2 は WASM binary input の基本型を `Uint8Array` 相当とし、representation conversion / type mismatch は `BindingFailure` とする。Native / WASM は同じ public input contract と failure boundary を提供しなければならない。
- 問題・影響: `Uint8ClampedArray` は1 byte viewのため、今回の probe では任意の同長 payload replacement、secret return、signature forgeryまたは memory unsafety は確認されない。しかし WASM が指定外の typed-array brand を受理し、Native と異なる公開 representation contract を形成する。Store、password、Pending、private key 等の複数 binary input に及ぶため、限定的な単一入力の誤差ではない。
- Severity 根拠: cryptographic primitive の破壊や arbitrary signing は成立しないが、承認済みの exact binary representation と fail-closed 型境界に対する具体的な契約違反であり、MEDIUM とする。
- 必要な最小修正または確認: override可能な input method を取得せず、actual `Uint8Array` の brand / internal view typeを検証する binding-side checkへ置き換える。`Uint8ClampedArray`、他の typed view、Proxy、detached、unreadable、attached empty を公開 runtime testで区別し、既存の instance / prototype slice override と payload A signature testを維持する。
- 完了条件: 指定された `Uint8Array` だけが binary input として受理され、指定外 typed view は `BindingFailure`、Proxy / detached / unreadable は fail-closed、attached zero-length は正常な空 byte列として扱われる。same-length payload A / B の signature が backing bytes A と一致することを再確認する。

## Resolved Findings

- IR-001〜IR-006、IR-008〜IR-015、IR-021: Core の秘密情報 lifecycle、認証、Store parser / atomicity、暗号・署名・診断および resource boundaryに回帰なし。
- IR-007: generated Software Key の production CSPRNG / serializer path、all-zero candidate retry、RandomSourceFailure / SerializationFailure および test-only failure boundaryを確認した。test seam は `#[cfg(test)]` に限定される。
- IR-016: HandoffConfirmation は finalize の必須条件であり、ExportRequest の target / Requested / target-specific Confirmed / password、SigningApproval、AccountContext は Binding から補完されず Core で検証される。失敗時に success / secret / signature / replacement を返さない。
- IR-017: CBOR parser の canonical order / duplicate / trailing / resource limit と、Store各 object の recursive unknown allow-list、lossless preservation、unknown enum fatalを確認した。
- IR-018 / IR-019: Native の全 public operation の operation-start reset、assignment前の conversion、multi-output guard、mutable release、exact allocator layout、zeroize、double release no-opを確認した。
- IR-020: 下記のとおり、completion conditionを満たしたため Resolved とした。

### IR-020 — Binding-owned output allocation（MEDIUM / Resolved）

- Native の `allocate_output_slice` (`bindings/native/src/lib.rs:390-407`) は 0長以外の `Layout::array` と raw `alloc` を検証し、layout overflow / NULL allocation を `BindingFailure` とする。全 public operation は開始時に output を NULL / 0 / emptyへ resetする。
- `OwnedSliceGuard`、`OwnedBytesGuard` は assignment前の一時所有者であり、`snwc_prepare_generated_profile` の mnemonic / pending / warningsを含む複数 outputで、後続 allocation failure時に先行 allocationをDropで回収する。`snwc_prepare_generated_profile` の test seamで二つ目の allocationを失敗させ、全 outputが NULL / 0で callerへ partial output、secret、replacement Storeを公開しないことを確認した。
- warning、Profile list、Software Key listも同じ guard / release ownershipを使用する。bytes outputは `snwc_free_bytes` が内容を zeroizeしてから、発行時と同じ element型・長さの layoutで解放し、release後に NULL / 0へ遷移する。配列要素は秘密情報を含まないため、対応する配列 releaseは exact layoutで解放する。
- `#[cfg(test)]` の Native allocation seamは production artifactへ入らず、production wrapperは常に falseである。WASMの object / array / Uint8Array construction seamも `#[cfg(test)]` のみで、production public APIへ露出していない。
- WASM の `try_reserve_exact`、catch付き JS construction、DTO conversion failureは `BindingFailure`となる。失敗時に success object、signature、Mnemonic、private keyまたは replacement Storeを返さず、Core error codeは `binding_error`で維持する。Node runtimeの allocation seam testで確認した。
- `ArrayBuffer` / host runtimeがrecoverable exceptionを返さずabortする真のOOMはBindingが捕捉して `BindingFailure`へ変換する保証の対象外であり、Specification §13.2および既存 Design の runtime境界と整合する。
- IR-022 のうち、override可能 `slice` / `subarray` / `set` の不使用、actual backing bufferからの fresh copy、Proxy / detached / unreadable / bounds / attached empty、Store limitのallocation前検査、payload A signature維持は確認済みである。残存する exact brand 問題は Resolved に含めず Reopened とした。

## Upstream Feedback

なし。現行 Specification は Native / WASM の failure mapping、`Uint8Array` binary contract、raw payload semantics、authorization、Store atomicity および secret lifecycle を定義しており、IR-020 / IR-022の現行判定を妨げる上流の欠落・競合は確認しなかった。最低 browser version が Requirements / Design / Specification に固定されていないことは、旧 browser を formal findingへ変換する根拠とはしなかった。

## Deferred Findings

- Browser 実機 matrix: `ArrayBuffer.prototype.detached` を含む module initialization、Chrome / Edge / Firefox / Safari の supported-version matrix は未実行。MDN はこの intrinsic を Baseline 2024 と説明し、Can I Use は主要 browser の対応範囲を掲載しているが、repositoryは最低 browser versionを定義していない。Node.js v26.5.0での WASM module initialization と runtime testは成功している。旧 browserだけを理由に formal findingは作成しない。
- fuzz campaign / corpus: `wallet_store_decode` の compile と parser の in-repo negative testsはPASSだが、長時間 campaign は未実行。
- external verifier: in-repo fixture、SDK expected bytes、Rust differential、Native C runtime、WASM runtime は確認したが、独立した Symbol / NEM reference verifier processおよび外部 node は未実行。
- branch coverage: stable `cargo llvm-cov` reportのbranch counterは `0/0` で、nightly branch coverageは未実行。
- LeakSanitizer: ptrace制約で fatalとなり、完了したLSan結果はない。ASan / UBSan は `detect_leaks=0` で別途 exit 0を確認した。
- README compatibility: `README.md:60,89,92,104,111-112` の例・API表には現行の HandoffConfirmation、ExportRequest、AccountContext を含まない旧シグネチャが残る。これは公開ドキュメントの別 review 対象であり、本 Implementation formal findingやgateには二重計上しない。READMEは変更していない。

## Scope and Traceability

| Contract / risk | Upstream trace | Implementation / validation trace |
| --- | --- | --- |
| authorization、handoff、export、signing、AccountContext | Requirements FR / SEC / AC、Design architecture / security、Specification §§8-9、§10-11 | `src/store.rs`、`src/types.rs`、`src/wasm.rs`、Native parsers、`tests/core.rs`、`tests/unit/wasm.rs`、Native API / C runtime |
| Store validity、recursive unknown、AAD、determinism、limits | `wallet-store-format-v1.md` §§2、§7、§11-12、Specification §§7、§10-11 | `src/cbor.rs`、`src/store.rs`、`tests/unit/store.rs`、Core integration tests |
| secret ownership、zeroization、statelessness、failure atomicity | Requirements SEC-004/005/008/023、Design architecture / bindings / security、Specification §§11-13 | `src/types.rs`、`src/store.rs`、`src/crypto.rs`、Native release / guard、WASM DTO conversion |
| Native allocation / release | Specification §13.1、Design bindings | `bindings/native/src/lib.rs:330-491,619-1367`、header、Rust unit、C ABI runtime、ASan / UBSan |
| WASM binary input / output | Specification §13.2、Design bindings | `src/wasm.rs:69-260,475-845`、`tests/unit/wasm.rs:709-939`、Node runtime、supplemental generated package probe |
| Symbol / NEM interoperability | Specification §§4-5、§9、§14.1、related knowledge / SDK fixtures | `src/crypto.rs`、crypto unit vectors、Core integration、Native API、WASM parity |

## Domain Checks

| Domain | Result | Evidence / boundary |
| --- | --- | --- |
| Specification conformance | PASS WITH MEDIUM REOPEN | API、error、state、Store、authorization、failure boundaryは適合。IR-022の exact `Uint8Array` brand validationだけ未達。 |
| IR-020 Native allocation / ownership | PASS | fallible `Layout` / `alloc`、NULL→BindingFailure、operation-start reset、multi-output guard、warning / profile / key list guard、exact release layout、owned byte zeroization、test-only seam。 |
| IR-020 WASM allocation / failure | PASS | recoverable `try_reserve_exact`、catchされた JS object / array / Uint8Array construction exception、success object / secret / signature / replacement非返却、productionからの seam除外。fatal host OOMはcatch保証外として仕様境界内。 |
| IR-022 WASM binary integrity | PARTIAL | intrinsic accessor、actual backing buffer、Proxy / detached / unreadable / bounds / empty / store limit前検査、method override耐性、同長 signatureはPASS。`Uint8ClampedArray`のbrand受理が残る。 |
| Native / WASM parity | PASS WITH NON-BLOCKING TYPE GAP | Core result、error、authorization、signature、replacement semanticsは共通。WASM public binary typeの厳密性だけIR-022として残る。 |
| Handoff / Export / Signing / AccountContext | PASS | Coreが status、target、context、passwordを別々に検証し、Bindingが補完・再解釈しない。 |
| Symbol / NEM / Mainnet / Testnet | PASS | Chain-specific HD、key、address、signature、network mappingおよびfixtureを確認。 |
| BIP39 / HD / arithmetic / crypto | PASS | 24-word BIP39、Symbol / NEM BIP32 vector、custom scalar differential、Argon2id、AES-256-GCM、AAD、nonce / RNG failureを確認。 |
| Store / Pending / deterministic CBOR | PASS | version、unknown recursive allow-list、canonical encoding、resource limits、Pending binding、atomic replacement、Core statelessnessを確認。 |
| Security checklist — 適用 | PASS WITH DEFERRED TESTS | protected asset、secret lifecycle / owner / zeroization、auth、AEAD / AAD、RNG、parser、FFI unsafe、WASM boundary、failure atomicity、diagnosticを適用。具体的 leakage / memory unsafetyはなし。 |
| Security checklist — 主な適用外 | N/A BY BOUNDARY | Browser / OS / host compromise、Application current Store / rollback、JS heap全体、third-party crypto internalsの完全zeroize / constant-timeはDesignの保証外。通常処理の非開示・authorization・failure safetyは適用した。 |
| Test quality | PASS WITH UNCONFIRMED RANGE | required validationはPASS。fuzz campaign、external verifier、browser matrix、nightly branch coverage、LSanは未完了。exact brand negative test追加がIR-022 completion condition。 |

## Validation Results

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| `cargo fmt --all -- --check` | PASS | exit 0。 |
| `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` | PASS | exit 0。 |
| `cargo test --workspace --all-features --locked` | PASS | Core unit 46、Core integration 6、Native Rust 2、Native API 2、doc tests 0。 |
| Core tests | PASS | CBOR、crypto、BIP39 / HD、authorization、Store、atomicity、generated key failureを含む。 |
| Native Rust tests | PASS | panic mapping、allocation failure、multi-output partial outputなしを含む。 |
| Native header compile | PASS | `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c`。 |
| Native C runtime | PASS | `./bindings/native/tests/run_c_abi_runtime.sh`。C caller、ownership、release、failure reset、fixtureを実行。 |
| `cargo check --target wasm32-unknown-unknown --features wasm --locked` | PASS | exit 0。 |
| `wasm-pack test --node --locked --features wasm` | PASS | Node.js v26.5.0、WASM runtime 6 tests、0 failure。detach / unreadable / empty、allocation failure、slice override、same-length signatureを含む。初回 sandboxはtemporary read-onlyで停止し、許可済み環境で再実行してPASS。 |
| fuzz target compile | PASS | `cargo check --manifest-path fuzz/Cargo.toml --locked --bin wallet_store_decode`。campaignは未実行。 |
| supplemental WASM package build | PASS | `wasm-pack build --target nodejs --out-dir /tmp/snwc-wasm-check-014 --no-typescript --locked --features wasm`。生成 glueで public `&Uint8Array` entryに明示brand checkがないことを確認。repository filesは変更していない。 |
| supplemental runtime type probe | FINDING EVIDENCE | valid empty Storeを共有する `Uint8ClampedArray` は `list_profiles` に受理され、`Uint16Array` / `DataView` は拒否された。IR-022 Reopenedの根拠であり、PASSではない。 |
| ASan / UBSan Native C runtime | PASS (partial) | `ASAN_OPTIONS=detect_leaks=0 SNWC_C_ABI_SANITIZERS=1 ./bindings/native/tests/run_c_abi_runtime.sh` がexit 0。LSanを無効化した結果。 |
| LeakSanitizer | NOT VALIDATED | `SNWC_C_ABI_SANITIZERS=1` 実行は ptrace 環境でLeakSanitizer fatal。 |
| Core coverage | MEASURED / TARGET NOT MET | `cargo llvm-cov --package symbol-nem-wallet-core --all-features --locked --json`。lines 1909/3698 = 51.62%、functions 195/416 = 46.88%、branches 0/0。 |
| branch coverage | NOT VALIDATED | stable reportにbranch counterがなく、nightly branch coverageは未実行。 |
| fuzz campaign | NOT RUN | target compileとparser negative testsのみ。 |
| external verifier / external node | NOT RUN | in-repo known vector、SDK expected bytes、Rust differential、Native / WASM parityまで。 |
| Browser実機 matrix | NOT RUN | Node runtimeと公開 compatibility資料の確認まで。 |

Coverage target は Specification §14.3 / NFR-005 / AC-044 の SHOULD として記録し、未達を任意の追加API・暗号変更や CRITICAL / HIGH gateへ拡張していない。coverageの未達と未実行項目は、IR-022の具体的な型境界欠陥とは別に扱う。

## Review Gates

| Gate | Result | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 仕様適合性 | PASS WITH NON-BLOCKING FINDING | 全主要 contractは適合。WASM exact `Uint8Array` brandだけが未達。 | IR-022 |
| セキュリティ | PASS | 未解決 CRITICAL / HIGH、secret leakage、authorization bypass、cryptographic misuse、memory unsafetyなし。host compromiseは対象外。 | IR-001、IR-007、IR-010〜IR-012、IR-016、IR-019、IR-021 |
| 相互運用性 | PASS | Symbol / NEM、Mainnet / Testnet、raw signature、BIP39 / HD、deterministic CBOR fixtureが一致。 | IR-002、IR-004、IR-005、IR-012、IR-017、IR-022（非blocking型gap） |
| 異常系 | PASS | malformed、truncated、duplicate、unknown、tamper、auth、detach、unreadable、allocation、panic、partial outputを確認。 | IR-008、IR-009、IR-014、IR-017、IR-018、IR-020、IR-022 |
| テスト十分性 | PASS WITH DEFERRED EVIDENCE | required validation、runtime、known vector、failure injectionはPASS。fuzz campaign、external verifier、browser matrix、branch、LSanは未確認。 | IR-020、IR-022およびDeferred Findings |
| 実装品質・memory safety | PASS WITH NON-BLOCKING FINDING | Rust ownership、Native unsafe、allocator / release、WASM catch境界に具体的 memory defectなし。型brand gapはIR-022。 | IR-006、IR-018、IR-019、IR-022 |

Overall gate: **READY**。`CRITICAL` / `HIGH` の New / Open / Reopened が0件であるため、Skill の正式 gate ruleに従う。IR-022の再修正・再レビューが不要という意味ではない。

## Remaining Risks and Open Decisions

- IR-022 exact `Uint8Array` brand validationは未解決である。現時点で同長 payload置換、signature forgery、secret disclosureまたはmemory unsafetyは確認されないが、public representation contractを満たさない。
- `ArrayBuffer.prototype.detached` は現行主要 browser では対応が進んでいる一方、古い runtimeでは module initialization時の intrinsic getter取得が失敗し得る。最低 browser versionは正式資料にないため、旧browser対応不足は findingにせず、release時のsupported runtime決定と実機matrixへ委譲する。
- Application / Browser / OS / host process の compromise、JavaScript heap全体の隔離、third-party dependency内部temporaryの完全消去、current Store選択・rollback防止は既存Designの保証外である。これらを Implementation gateへ拡張しない。
- fuzz campaign、external verifier、nightly branch coverage、LSan、Browser matrixの証跡は残っていない。これらを完了済みと扱わない。
- READMEの現行APIとの不一致は別の公開ドキュメント reviewで解消すべきである。本レビューではImplementation defectとして二重計上しない。

## Automatic Changes

- なし（レビュー中にImplementation、Requirements、Design、Specification、Store Format、tests、fixture、README、Skillおよび既存artifactを変更していない）。
- 成果物として本ファイル `docs/reviews/implementation/implement-review-014.md` のみを新規作成する。

## Final Decision

**Review Result: READY**

正式 gate上、`IMPLEMENTATION READY` は宣言可能である。ただし、全 finding解消済みではなく、IR-022（MEDIUM / Reopened）が1件残るため、未解決 finding 0件とは言えない。IR-022の exact `Uint8Array` validation修正後に再確認することを推奨する。

### Final handoff

1. Review artifact: `docs/reviews/implementation/implement-review-014.md`
2. 対象 Implementation HEAD: `da26a209a273a3375484f8ccfb45a1f71148608b`
3. Review Gate: **READY**
4. severity別未解決 finding: **CRITICAL 0 / HIGH 0 / MEDIUM 1 / LOW 0**
5. IR-001〜IR-022: IR-001〜IR-021は **Resolved**、IR-022は **Reopened**
6. IR-020再評価: **Resolved**。Native / WASMのfallible allocation、BindingFailure、partial outputなし、guard、zeroization、release整合、production seam非露出を確認。
7. IR-022再評価: **Reopened**。override method / same-length replacementは解消したが、`Uint8ClampedArray`を受理し actual `Uint8Array`条件を満たさない。
8. 新規 finding: **なし**（IR-022残存欠陥をIR-023として二重計上していない）。
9. Security blocking gap: **なし**。未解決 CRITICAL / HIGHなし。
10. Interoperability blocking gap: **なし**。Symbol / NEM protocol bytesとsignature fixtureは一致。WASM type gapはnon-blocking。
11. Native / WASM parity: **PASS WITH NON-BLOCKING TYPE GAP**。Core semantics、error、authorization、signature、replacementは一致。
12. Validation: fmt、Clippy、workspace test、Core、Native Rust、header compile、Native C runtime、WASM check / Node runtime、fuzz target compileはPASS。ASan / UBSanはLSan無効化でPASS。
13. Coverage: lines **51.62%**、functions **46.88%**、branches **0/0**。target未達、branch未測定。
14. 未確認事項: fuzz campaign、external verifier / node、nightly branch coverage、LSan、Browser実機 matrix、README別review。
15. `review-common/review-playbook.md` 読込: **はい**。`.agents/skills/review-common/review-playbook.md` を正常に読込済み。013の手順監査誤りを本 artifactに記録。
16. `IMPLEMENTATION READY` 宣言: **可能（gate上）**。IR-022 Reopenedは残る。
17. 未解決 finding 0件: **いいえ**。MEDIUM 1件（IR-022）。
18. Review commit SHA: 本 artifactを含む commit 作成後の最終報告に記載する。
19. Push先: `origin/agent/concept-review-follow-up`。

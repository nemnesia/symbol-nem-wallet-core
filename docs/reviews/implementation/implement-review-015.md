# Implementation Review 015

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/concept-review-follow-up`（作業開始時の branch を維持）
- Implementation HEAD: `d519cd4102010a02c5892293705fce041e214769`
- Previous review: `docs/reviews/implementation/implement-review-014.md`
- Review date: 2026-08-31 (JST)

IR-022 / MEDIUM の修正を再評価し、差分だけに限定せず、現行 Implementation 全体を
Requirements、Design、Specification、Wallet Store Format、tests、fixture および binding
契約に対して再確認した。

## Execution Audit

### Required material loading

作業開始時に次を実際に読み込んだ。

1. `AGENTS.md`
2. `.agents/skills/implement-review/SKILL.md`
3. `.agents/skills/review-common/review-playbook.md`
4. `.agents/skills/implement-review/reviewers.md`
5. `.agents/skills/implement-review/review-gates.md`
6. `.agents/skills/implement-review/output-format.md`
7. `.agents/skills/implement-review/security-checklist.md`

併せて、前回 artifact、承認済み Requirements、Design、Specification、Wallet Store
Format、README、現行 Source、Native header、tests、fixture および依存設定を確認した。
実際の Phase Context は登録されておらず、使用していない。

### Phase 0 — Scope, source and boundary fixation

- Implementation の対象を Rust Core、Native C ABI、WASM binding、関連 tests、fixture、
  dependency/feature および公開 README の追跡確認に固定した。
- 外部可視動作の正本は承認済み Specification、Store Format、上流 Requirements / Design
  とし、既存コード・既存 test のみから仕様を推定しなかった。
- Application の current Store 選択、host/browser compromise、third-party crypto library
  内部、compiler/runtime/OS 内部の完全な保証は既存 Design の boundary 外とした。
- README の旧シグネチャ記載は別の documentation review に属するため、Implementation
  finding として二重計上しなかった。

### Phase 1 — Independent Reviewer A〜D passes

Subagent は利用できないため、同一 Chair が次の4つを独立した review pass として実施した。
各 pass で候補を抽出し、Phase 2 で反証してから採否を決定した。

- Reviewer A — Specification conformance: Core の公開 API / DTO / error / state、
  HandoffConfirmation、ExportRequest、SigningRequest / SigningApproval、AccountContext、
  Store parser / atomicity、Native / WASM の外部契約を照合した。IR-022 の exact
  `Uint8Array` 型境界を現行 source と runtime で再確認した。
- Reviewer B — Deep security: protected asset、secret ownership / zeroization、per-operation
  authentication、authorization assertion、AAD、RNG、custom scalar arithmetic、panic /
  diagnostic、Native allocation / release、WASM representation、failure atomicity および
  secret-dependent control flow を security checklist に沿って確認した。
- Reviewer C — Protocol / interoperability: Symbol / NEM、Mainnet / Testnet、BIP39 / HD、
  chain-specific key / address / signing、raw payload、deterministic CBOR、Store fixture と
  Native / WASM parity を確認した。
- Reviewer D — Quality / abnormal paths: malformed / truncated / duplicate / unknown / tamper、
  failure injection、output cleanup、fuzz target compile、sanitizer、coverage、WASM runtime
  negative tests、prototype cleanup および same-length payload integrity を確認した。

### Phase 2 — Refutation and integration

- IR-001〜IR-022 の過去 status を機械的に継承せず、現行 source、tests、generated Node
  binding runtime、fixtures および completion condition から再判定した。
- IR-020 は Native の fallible allocation / guard / operation-start reset / release / zeroize、
  WASM の `try_reserve_exact` / catch-enabled output construction / failure mapping / test-only
  seam を再確認し、Resolved を維持した。
- IR-022 は exact brand、Proxy、detached / unreadable、empty、bounds、copy source、Store
  allocation limit、method override、same-length signing、wrong-brand payload、prototype
  restorationをすべて再確認し、completion condition を満たすため Resolved とした。
- Reviewer A〜D の候補に、現行実装へ結び付く Critical / High / Medium / Low の新規問題は
  残らなかった。既存 finding の重複採番、仕様外の改善提案、host compromise を finding
  へ昇格することは行わなかった。

### Phase 3 — Gate and artifact

- 正式 gate の6領域を判定し、Critical / High / Medium / Low の New / Open / Reopened は
  すべて0件とした。
- IR-001〜IR-022 は全件 Resolved、未解決 finding は0件である。
- Review artifact は本ファイルだけを新規作成する。Implementation、Requirements、Design、
  Specification、Store Format、tests、fixture、README および Skill は変更していない。

## Evidence Used

| 区分 | Evidence | 確認内容 |
| --- | --- | --- |
| Procedure | `AGENTS.md`、implement-review Skill、review-common playbook、reviewers / gates / output-format / security-checklist | 必須資料、Phase 0〜3、Reviewer A〜D、採用基準、gate、出力および security 観点 |
| Previous review | `docs/reviews/implementation/implement-review-014.md` | IR-001〜IR-022 の履歴、IR-020 / IR-022 completion condition、前回の未確認事項 |
| Requirements | `docs/requirements/requirements.md` | Core の責務、authorization、handoff / export / signing、chain/network、atomicity、security、coverage |
| Design | `docs/design/architecture.md`、`docs/design/bindings.md`、`docs/design/security.md` | trust boundary、binding non-authority、statelessness、secret lifecycle、Native / WASM parity |
| Specification | `docs/specifications/specification.md` | API / DTO / error、raw signing、Symbol/NEM、BIP39/HD、AES/Argon2id、AAD、atomicity、binding 契約 |
| Store format | `docs/specifications/wallet-store-format-v1.md` | deterministic CBOR、recursive unknown allow-list、AAD、index/payload consistency、version、保存規則 |
| Implementation | `src/*.rs`、`bindings/native/src/lib.rs`、Native public header、`Cargo.toml` / lock files | 現行 Core、Native、WASM、allocation、ownership、crypto、parser、API と依存境界 |
| Tests / fixtures | `tests/*.rs`、`tests/unit/*.rs`、`fuzz/`、Native C runtime | 正常系、異常系、interop fixture、failure injection、WASM runtime、fuzz compile |

## Review Result

**READY**

現行 Implementation は正式 gate を満たし、IR-001〜IR-022 が全件 Resolved、未解決 finding 0件
である。IR-022 の exact `Uint8Array` brand validation と prototype restoration は、現行
HEAD の source および runtime evidence で completion condition を満たした。

## Summary

- IR-020 の Native / WASM failure-safe output、allocation、guard、zeroization、release、
  partial output 防止および test-only failure seam に回帰はない。
- IR-022 は `ArrayBuffer.isView`、capture 済み `%TypedArray%.prototype[Symbol.toStringTag]`
  getter、internal typed-array brand、actual backing `ArrayBuffer` copy により修正成立した。
- `Uint8ClampedArray`、`Int8Array`、`Uint16Array`、`DataView`、Proxy、detached input、unreadable
  input および wrong-brand signing payload は runtime で拒否された。
- Symbol / NEM の chain-specific signing、Mainnet / Testnet、BIP39 / HD、Argon2id / AES-256-GCM、
  AAD、deterministic CBOR、authorization、Pending Profile、atomic replacement、Native / WASM
  parity に新しい回帰は確認されなかった。
- 新規 finding はない。Security blocking gap および interoperability blocking gap もない。

## Finding Status

| ID | Severity | Current status | Current evidence |
| --- | --- | --- | --- |
| IR-001 | HIGH | Resolved | secret temporary と custom scalar arithmetic に回帰なし。 |
| IR-002 | HIGH | Resolved | BIP39、seed、HD lifecycle、Chain / Network path に回帰なし。 |
| IR-003 | HIGH | Resolved | decrypted payload、KeyRecord、secret owner の境界に回帰なし。 |
| IR-004 | MEDIUM | Resolved | fixed field、enum、fatal parser に回帰なし。 |
| IR-005 | MEDIUM | Resolved | AAD、unknown wire value、duplicate、atomicity に回帰なし。 |
| IR-006 | MEDIUM | Resolved | Native / WASM DTO、ownership、通常結果の parity に回帰なし。 |
| IR-007 | LOW | Resolved | generated Software Key の CSPRNG、candidate validation、serialization failure boundary と test-only seam を確認。 |
| IR-008 | MEDIUM | Resolved | error mapping、malformed input、fail-closed path に回帰なし。 |
| IR-009 | MEDIUM | Resolved | Store atomicity、replacement、Pending lifecycle に回帰なし。 |
| IR-010 | HIGH | Resolved | password、seed、key、payload temporary の zeroization に回帰なし。 |
| IR-011 | HIGH | Resolved | authentication、AAD、semantic validation に回帰なし。 |
| IR-012 | HIGH | Resolved | Symbol / NEM signing、key、address、raw signature に回帰なし。 |
| IR-013 | LOW | Resolved | Debug、Display、error、warning の secret leakage に回帰なし。 |
| IR-014 | LOW | Resolved | parser resource limit と allocation 前検査に回帰なし。 |
| IR-015 | LOW | Resolved | fixed-length secret comparison と failure diagnostic に回帰なし。 |
| IR-016 | CRITICAL | Resolved | HandoffConfirmation、ExportRequest、SigningApproval、AccountContext、Core authorization を確認。 |
| IR-017 | MEDIUM | Resolved | recursive unknown CBOR validation、preservation、AAD、unknown enum fatal を確認。 |
| IR-018 | MEDIUM | Resolved | Native operation-start reset と partial output 防止を確認。 |
| IR-019 | HIGH | Resolved | Native release lifecycle、exact layout、double release no-op を確認。 |
| IR-020 | MEDIUM | Resolved | Native / WASM output allocation failure、BindingFailure、guard、zeroization、release、非公開 seam を確認。 |
| IR-021 | LOW | Resolved | Core-owned secret-dependent early exit に具体的な回帰なし。 |
| IR-022 | MEDIUM | Resolved | exact Uint8Array brand、copy integrity、wrong-brand reject、prototype restoration の全条件を確認。 |

Current unresolved findings: **CRITICAL 0 / HIGH 0 / MEDIUM 0 / LOW 0**。

## Required Changes

なし。

## Optional Improvements

なし。未実行の外部・環境依存検証は Deferred Findings に記録するが、現行 gate の finding には
しない。

## Resolved Findings

### IR-020 — Binding-owned output allocation（MEDIUM / Resolved）

- Native `allocate_output_slice` は `Layout::array` overflow と raw `alloc` の NULL を
  `BindingFailure` とし、各 public operation は開始時に output を failure-safe state へ reset
  する。
- `OwnedSliceGuard` / `OwnedBytesGuard` が assignment 前の allocation を所有する。複数 output
  の後続 allocation failure 時に先行 allocation を回収し、partial mnemonic / pending /
  replacement / signature を公開しない。
- `snwc_free_bytes` は内容を zeroize して発行時と同じ layout で解放し、release 後に NULL / 0
  へ更新する。固定 DTO と warning/list 配列は秘密情報を含まず、各 exact release path を持つ。
- WASM は `try_reserve_exact`、catch-enabled JS object / array / `Uint8Array` construction、
  conversion failure の `BindingFailure` mapping を使用する。output failure seam は
  `#[cfg(test)]` のみで、production WASM API に公開されない。
- Native unit / C runtime、WASM runtime、ASan/UBSan（LSan 無効化条件）で completion condition
  を再確認した。

### IR-022 — WASM binary input integrity（MEDIUM / Resolved）

`src/wasm.rs:69-126,139-185` と `tests/unit/wasm.rs:63-105,851-932,947-1078` を確認した。

- `ArrayBuffer.isView` と capture 済み `%TypedArray%.prototype[Symbol.toStringTag]` getter
  の返値が `Uint8Array` の場合だけ受理し、element width / length 偶然の一致に依存しない。
- `Uint8ClampedArray`、`Int8Array`、`Uint16Array`、`DataView`、Proxy-wrapped TypedArray は
  reject される。Proxy では input trap に依存する前に reject される。
- own `constructor`、own `Symbol.toStringTag`、`Uint8Array.prototype[Symbol.toStringTag]` を
  spoof しても captured getter による actual internal brand 判定は変わらない。module
  initialization 前の host realm intrinsic compromise は既存 Design boundary 外である。
- `slice` / `subarray` / input の `set` 等を取得せず、validated actual backing `ArrayBuffer` から
  fresh view を作り、capture 済み `Uint8Array.prototype.set` で Rust destination へ copy する。
- detached / unreadable / bounds 不正は `BindingFailure`、attached zero-length は正常な empty
  bytes として扱う。byteOffset / byteLength / backing buffer bounds を検証し、Store size limit
  は Rust allocation 前に検査する。
- instance / prototype の `slice` override に対して、同じ長さの `PAYLOAD_A` / `PAYLOAD_B` を
  差し替えても、実際の signature は `PAYLOAD_A` の expected signature と一致する。wrong-brand
  signing payload は `InvalidArgument` で reject され、signature を返さない。
- test-only `PropertyDeleteRestore` は元の own descriptor を保存し、元 descriptor がなければ
  delete する。test property は `configurable: true`、正常終了時は明示 restore、cleanup 後に
  own property が残らない。`Drop` は restore error を無視して panic せず、assertion failure
  の unwinding 中にも RAII cleanup を試みる実装になっている。WASM Node runtime は cleanup
  assertion を含めて成功した。

## Upstream Feedback

なし。現行 Requirements / Design / Specification は、今回の IR-020 / IR-022 判定に必要な
binding failure mapping、binary representation、raw payload、authorization、Store atomicity、
secret lifecycle および interop 条件を定義している。資料間の未解消競合は確認しなかった。

## Deferred Findings

Formal finding ではない未確認事項は次のとおり。

- fuzz campaign: target compile は成功したが、長時間 campaign は実行していない。
- external verifier / external node: repository 内の Symbol / NEM SDK-derived fixture と binding
  parity は確認したが、外部 verifier / node への実接続検証は実行していない。
- nightly branch coverage: stable `cargo llvm-cov` の結果は取得したが、nightly branch
  instrumentation は実行していない。stable output の branches は `0/0` と表示された。
- LeakSanitizer: sanitizer runtime の通常実行は、この環境の ptrace 制約で LSan fatal となった。
  `ASAN_OPTIONS=detect_leaks=0` で ASan/UBSan 本体を実行し成功したが、LSan は未確認である。
- Browser 実機 matrix: Node.js runtime は成功したが、Chrome / Edge / Firefox / Safari の実機・
  supported-version matrix は実行していない。最低 browser version は正式資料に固定されていない。
- README の旧 API 例・表記: HandoffConfirmation、ExportRequest、AccountContext を含まない
  記載が残る。これは README review の対象であり、本 Implementation finding には含めていない。

## Scope and Traceability

| Review area | Upstream traceability | Implementation evidence |
| --- | --- | --- |
| API / DTO / error / authorization | Specification §§9-10、Requirements AC-025〜AC-050、Design security §§3-6 | `src/lib.rs`、`src/types.rs`、`src/error.rs`、`src/store.rs`、`src/wasm.rs`、Native parser |
| Store / CBOR / AAD / atomicity | Specification §§6-7, 11、Wallet Store Format §§2, 7, 11-12 | `src/cbor.rs`、`src/store.rs`、`tests/unit/store.rs` |
| Secret lifecycle / side-channel boundary | Specification §12、Requirements SEC-004/005/023、Design security §§5, 8 | `src/crypto.rs`、`src/store.rs`、`src/types.rs` |
| Native binding | Specification §13.1、Design bindings §§7-10 | `bindings/native/src/lib.rs`、`bindings/native/include/symbol_nem_wallet_core.h`、C runtime |
| WASM binding / IR-022 | Specification §13.2, §14.2、Design bindings §§8-10 | `src/wasm.rs`、`tests/unit/wasm.rs`、generated Node runtime |
| Symbol / NEM interoperability | Specification §§4-5, 9.5、Requirements DR-008 / AC-033 | `src/crypto.rs`、`tests/unit/crypto.rs`、WASM/Native fixture tests |

## Domain Checks

| Gate / domain | Result | Evidence / limitation |
| --- | --- | --- |
| Specification conformance | PASS | API、DTO、error、state、authorization、Store、binary contract を確認。 |
| Security | PASS | secret leakage、authorization bypass、cryptographic misuse、failure disclosure、Native memory defect、IR-020/022 regression なし。host compromise / third-party internals は対象外。 |
| Interoperability | PASS | Symbol / NEM、Mainnet / Testnet、BIP39 / HD、raw signature、deterministic CBOR fixture と Native / WASM parity を確認。外部 verifier/node は未実行。 |
| Abnormal / failure paths | PASS | malformed、truncated、duplicate、unknown、tamper、auth、detach、unreadable、allocation、panic、partial output、wrong brand を確認。 |
| Test sufficiency | PASS WITH DEFERRED EVIDENCE | required runtime / fixture / failure injection / sanitizer subset / coverage は確認。fuzz campaign、browser matrix、nightly branch、LSan は未確認。 |
| Implementation quality / memory safety | PASS | Rust ownership、Native unsafe boundary、allocator/release exactness、WASM catch boundary、cleanup を確認。 |
| IR-020 completion | PASS | Native/WASM allocation、BindingFailure、failure-safe output、guard、zeroization、release、production seam 非公開。 |
| IR-022 completion | PASS | exact brand、spoof resistance、copy integrity、all required reject/accept、prototype restoration。 |
| Native / WASM parity | PASS | Core result、error、authorization、signature、replacement semantics と secret output policy を共有。 |

## Validation Results

| Validation | Result | Notes |
| --- | --- | --- |
| `cargo fmt --all -- --check` | PASS | 現行 HEAD。 |
| `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` | PASS | warning なし。 |
| `cargo test --workspace --all-features --locked` | PASS | Core 46、workspace integration 6、Native 2、合計54 tests。doc tests も失敗なし。 |
| Native header compile | PASS | `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c` |
| Native C runtime | PASS | `./bindings/native/tests/run_c_abi_runtime.sh` |
| `cargo check --target wasm32-unknown-unknown --features wasm --locked` | PASS | 現行 HEAD。 |
| `wasm-pack test --node --locked --features wasm` | PASS | WASM unit 7 tests 全件、integration は対象なし。version probe の warning は非blocking。 |
| fuzz target compile | PASS | `cargo check --manifest-path fuzz/Cargo.toml --locked --bin wallet_store_decode` |
| WASM exact-brand runtime | PASS | `Uint8ClampedArray` / `Int8Array` / `Uint16Array` / `DataView` / Proxy / detached を reject。 |
| WASM unreadable / empty / spoof runtime | PASS | unreadable reject、attached empty accept、own/prototype spoof resistance、prototype cleanup。 |
| WASM signing integrity runtime | PASS | instance/prototype `slice` override、same-length payload integrity、wrong-brand signing payload reject。 |
| Generated Node public binding probe | PASS | wrong-brand 5種 + detached は `BindingFailure`、brand spoof actual `Uint8Array` は受理。 |
| `SNWC_C_ABI_SANITIZERS=1 ...` | NOT VALIDATED (LSan) | LSan が ptrace 制約で fatal。 |
| `ASAN_OPTIONS=detect_leaks=0 SNWC_C_ABI_SANITIZERS=1 ...` | PASS (ASan/UBSan subset) | LSan を無効化した ASan/UBSan runtime。 |

## Review Gates

| Gate | Result | Basis |
| --- | --- | --- |
| 1. Specification conformance | PASS | 現行 API、外部可視動作、error、state、binary type、Store contract に違反なし。 |
| 2. Security | PASS | CRITICAL / HIGH 未解決0、secret lifecycle、authorization、crypto、failure-safe、memory 境界を確認。 |
| 3. Interoperability | PASS | Symbol / NEM、Network、BIP39 / HD、signature、CBOR / AAD fixture と parity を確認。 |
| 4. Abnormal conditions | PASS | malformed / tamper / auth / detached / unreadable / wrong brand / allocation / panic / partial output を確認。 |
| 5. Test sufficiency | PASS WITH DEFERRED EVIDENCE | coverage と required runtime は確認。外部・長時間・実機検証は Deferred。 |
| 6. Implementation quality / memory safety | PASS | ownership、unsafe Native ABI、allocation guard、release、zeroization、WASM conversion を確認。 |

Overall gate: **READY**。CRITICAL / HIGH / MEDIUM / LOW の未解決 finding はすべて0件である。

## Remaining Risks and Open Decisions

- LSan、fuzz campaign、external verifier/node、nightly branch coverage、Browser 実機 matrix は
  未確認であり、検証範囲の残存リスクとして扱う。
- Core は valid historical Store の rollback/currentness を判定せず、Application / persistence
  layer が current Store authority を担う。これは既存 Design / Specification の明示境界である。
- WASM の module initialization 前の host intrinsic compromise、browser/runtime 内部の完全な
  zeroization、third-party crypto library 内部の side-channel は既存 boundary 外である。
- README の旧 API 記載は別 documentation review で更新要否を判断する。

## Automatic Changes

- 本 artifact の新規作成以外に、Implementation、Requirements、Design、Specification、Store
  Format、tests、fixture、README、Skill を自動変更していない。
- Review 中に生成した WASM package は一時検証後に削除した。

## Final Decision

**Review Result: READY**

正式 gate、completion condition、現行 runtime evidence に基づき、`IMPLEMENTATION READY` を
宣言可能である。未解決 finding は0件である。

### Final handoff

1. Review artifact: `docs/reviews/implementation/implement-review-015.md`
2. 対象 Implementation HEAD: `d519cd4102010a02c5892293705fce041e214769`
3. Review Gate: **READY**
4. severity別未解決 finding: **CRITICAL 0 / HIGH 0 / MEDIUM 0 / LOW 0**
5. IR-001〜IR-022 status: **全件 Resolved**
6. IR-020再評価: **Resolved**。Native / WASM の fallible allocation、BindingFailure、failure-safe output、guard、zeroization、release、partial output 防止、test-only seam を確認。
7. IR-022再評価: **Resolved**。exact brand、wrong-brand reject、copy integrity、prototype restoration の全 completion condition を確認。
8. exact Uint8Array brand validation: **PASS**。captured `%TypedArray%.prototype[Symbol.toStringTag]` getter と internal brand を使用。
9. prototype restoration: **PASS**。descriptor 保存、configurable test property、explicit restore/delete、cleanup、Drop/RAII を確認。
10. WASM binary integrity: **PASS**。backing buffer copy、override耐性、same-length signature integrity、bounds、detach/unreadable fail-closed。
11. 新規 finding: **なし**。
12. Security blocking gap: **なし**。
13. Interoperability blocking gap: **なし**。
14. Native / WASM parity: **PASS**。
15. Validation結果: fmt、clippy、workspace test、Native header/C runtime、WASM check/Node runtime、fuzz compile は PASS。ASan/UBSan は LSan 無効化条件で PASS。
16. Coverage結果: Core total **96.17% lines / 90.70% functions / 91.67% regions**。90% line/function threshold を満たす。stable branch output は **0/0**、nightly branch coverage は未実行。
17. 未確認事項: fuzz campaign、external verifier/node、nightly branch coverage、LSan、Browser 実機 matrix、README 別 review。
18. `IMPLEMENTATION READY` 宣言: **可能**。
19. 未解決 finding 0件: **はい**。
20. Review commit SHA: commit 後に完了報告へ記録する。
21. Push先: `origin/agent/concept-review-follow-up`。

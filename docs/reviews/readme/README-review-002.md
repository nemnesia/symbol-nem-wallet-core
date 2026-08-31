# README Review 002

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/concept-review-follow-up`（レビュー中に変更しない）
- README target commit: `d14dbd198847213b49f549d2d606f1b6c27e8fb2`
- Previous README Review: `docs/reviews/readme/README-review-001.md`
- Implementation Review: `docs/reviews/implementation/implement-review-015.md`
- Implementation Review Gate: `READY`
- Implementation HEAD reviewed: `d519cd4102010a02c5892293705fce041e214769`
- 確認日: 2026-09-01（JST）
- Artifact: `docs/reviews/readme/README-review-002.md`
- 範囲: ルート `README.md` 全文の正確性、利用開始可能性、制約・責任分界、構成、README Review 001 の RM-001〜RM-003 の再判定
- 未確認範囲: Implementation Review 015 が Deferred とした長時間 fuzz campaign、external verifier / node、nightly branch coverage、LeakSanitizer、Browser 実機 matrix そのもの。これらを今回実行していないことは README finding としない

## Execution Audit

Review Board Chair として、Reviewer A〜C の3観点を独立した self-review pass として実施した。

- Reviewer A — Cargo manifest / lock、workspace、Rust public API と DTO、Native public header / symbols / ownership、WASM exports / generated output、package / version / toolchain を照合
- Reviewer B — Rust、Native C ABI、WASM の install / build から最初の呼び出しまでの導線を確認し、Rust handoff、C example、生成 web module example を compile / runtime 確認
- Reviewer C — Core / Binding / Application responsibility、handoff / export / signing authorization、blind signing、Store / Pending、Symbol / NEM、Mainnet / Testnet、AccountContext、error、license、links、Deferred 表現、過剰保証を確認
- サブエージェントは使用していない
- 指定された `AGENTS.md`、`readme-review/SKILL.md`、review playbook、reviewers、review-gates、output-format、README Review 001 を全文確認済み
- `AGENTS.md` に対象フェーズの Phase Context 登録はなく、Context は使用していない
- README、Rust source、Native source / header、WASM source、manifest、requirements、design、specification、test、fixture、CI、skill はレビュー中に変更していない

## Evidence Used

| 資料 | 用途 |
| --- | --- |
| `README.md`（target commit） | レビュー対象全文、行番号、API・導線・責任分界・制約の確認 |
| `Cargo.toml`、`bindings/native/Cargo.toml`、`Cargo.lock` | package 名、version、workspace、crate type、feature、WASM CLI 互換 version の確認 |
| `src/lib.rs`、`src/types.rs`、`src/store.rs`、`src/error.rs` | 16 operation、DTO、`ReadResult` / `MutationResult`、handoff、Store replacement、error、AccountContext、signing / export contract の確認 |
| `src/wasm.rs`、`scripts/build-wasm.sh` | WASM export、初期化、`Uint8Array`、結果表現、出力先、`--target web` の確認 |
| `bindings/native/include/symbol_nem_wallet_core.h`、`bindings/native/src/lib.rs` | Native C ABI symbols、入力 / 出力、success / failure、ownership、release API の確認 |
| `bindings/native/tests/header_compile.c`、`bindings/native/tests/caller_runtime.c`、`bindings/native/tests/run_c_abi_runtime.sh` | Native header / runtime の実行可能性と failure-safe / release 契約の確認 |
| `docs/requirements/requirements.md` | Core、Binding、Application、handoff、export、signing、Chain / Network、security の要求根拠 |
| `docs/design/architecture.md`、`docs/design/bindings.md`、`docs/design/security.md` | trust boundary、current Store、secret ownership、Binding non-authority、user intent の設計根拠 |
| `docs/specifications/specification.md`、`docs/specifications/wallet-store-format-v1.md` | API、DTO、authorization、raw signing、error、opaque Store、canonical / unknown / migration 規則の正本 |
| `docs/reviews/implementation/implement-review-015.md` | Implementation `READY`、検証済み範囲、Deferred 範囲の確認 |
| `.github/workflows/coverage.yml`、`.github/workflows/dependency-audit.yml`、`.github/workflows/fuzz.yml` | CI command、tool version、検証済み・Deferred 表現の確認 |
| `LICENSE` | MIT license の確認 |

## Review Result

`READY`

## Summary

README Review 001 の RM-001〜RM-003 は、現行 README と現在の公開契約に照らしてすべて `Resolved` と判定した。

生成 Profile の sample は Mnemonic 全体を Application が提示し、明示的な受領確認を取得する placeholder を通過しない限り成功せず、確認 guard の後だけ `HandoffConfirmationStatus::Confirmed` を構築する。Native C ABI は Linux に限定した filename / static-link 具体例と、`snwc_create_empty_store` の success / failure・release を含む最小例を持つ。WASM は `scripts/build-wasm.sh` の `--target web` 出力に対する import、default initialization、`await init()`、`create_empty_store()`、`Uint8Array` の最小例を持つ。

Rust 16 operation、DTO、Store replacement、Pending、handoff / export / signing authorization、blind signing guidance、Core / Binding / Application boundary、Symbol / NEM、Mainnet / Testnet、`AccountContext`、Native / WASM ownership、error contract、package / version / toolchain、license、links、初回利用導線および Deferred verification の表現に、新しい ERROR / WARN / NIT は確認されなかった。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| RM-001 | WARN | Resolved | `README-review-001` | `README.md:97-139` に Mnemonic 全体の提示責任、明示確認 placeholder、確認失敗時の non-finalize、guard 後の `Confirmed` 構築があり、placeholder は既定で error を返す。handoff sample は compile check 済み |
| RM-002 | WARN | Resolved | `README-review-001` | `README.md:235-309` に Native package build、`target/release/`、Linux 限定の artifact / link 例、public header、最小 C 呼び出し、failure 判定、`snwc_free_bytes`、input / output ownership があり、C compile / runtime 済み |
| RM-003 | WARN | Resolved | `README-review-001` | `README.md:311-357` が script の `pkg/` output、生成 JS import、default init、`await init()`、`create_empty_store()`、`Uint8Array`、同居する `.wasm` の配置を説明し、生成物で runtime check 済み |

新規 formal finding はない。

## Required Changes

なし。ERROR / WARN の New / Open / Reopened finding はない。

## Optional Improvements

なし。NIT の New / Open / Reopened finding はない。

## Resolved Findings

### RM-001 — Generated Profile handoff sample

`README.md:97-142` を再確認した。

- Application が `mnemonic_utf8` 全体を現在の利用者へ提示し、明示的な受領確認を取得する責任を `README.md:99` と `README.md:110` に明記している。
- `obtain_explicit_handoff_confirmation(&prepared.value.mnemonic_utf8)` が確認処理の入力経路であり、確認できない場合は `false` または error を返して finalize を呼ばない。
- `if !user_confirmed { return Err(...) }` の guard の後、`HandoffConfirmationStatus::Confirmed` を構築している。`finalize_generated_profile` へ渡す経路はこの guard の後だけである。
- placeholder 自体は `Err` を返すため、未実装のままでは確認成功にも Profile finalize にもならない。README は Core が UI 表示、利用者操作または assertion freshness を自動証明するとは記述せず、Application の責任としている。
- `README.md:142`、`README.md:186-214`、`README.md:372-376` は handoff、export、signing の user assertion と Core の password authorization を分離している。
- README の handoff sample を一時 Cargo project へ移し、現行 package に対して `cargo check --offline` を実行して成功した。既存の restore / derive / public-account sample も同じ方法で compile check に成功した。

Completion condition を全件満たすため、`RM-001` は `Resolved` とする。

### RM-002 — Native C ABI onboarding

`README.md:235-309` と公開 header / implementation を再確認した。

- `cargo build --package symbol-nem-wallet-core-native --release --locked` と、repository root からの `target/release/` output を記載している。
- filename / extension が target / toolchain 依存であることを明示し、具体的な `lib...a` / `lib...so` と static-link command は Linux の例として限定している。macOS / Windows の未検証 concrete filename は記載していない。
- public header include、`SnwcOwnedBytes store = {NULL, 0}`、`snwc_create_empty_store(&store)`、`NULL` success / non-`NULL` failure 判定、failure-safe empty output、`snwc_free_bytes(&store)` を最小 C example に含めている。
- error は Binding-owned static string で free せず、output は Binding-owned で専用 release API を使い、その他の `SnwcBytes` は caller-owned borrowed input と説明している。header の `SnwcOwnedBytes`、`SnwcBytes`、`snwc_free_bytes` 契約と一致する。
- README の C example を `cc -std=c11 -Wall -Wextra -Werror` で現行 release static library に link して compile し、runtime 実行も成功した。公開 header syntax check と既存 C ABI runtime test も成功した。

Completion condition を全件満たすため、`RM-002` は `Resolved` とする。

### RM-003 — WASM / TypeScript onboarding

`README.md:311-357`、`src/wasm.rs`、`scripts/build-wasm.sh` および実生成物を再確認した。

- script は `wasm32-unknown-unknown` release binary を `wasm-bindgen --target web --out-dir` へ渡す。README の default output `pkg/`、`symbol_nem_wallet_core.js`、`symbol_nem_wallet_core_bg.wasm` と相対 import の説明は実生成物と一致する。
- `import init, { create_empty_store } from "./pkg/symbol_nem_wallet_core.js"`、`await init()`、`create_empty_store()` の export 名と default initialization API が generated JS / d.ts と一致する。
- `create_empty_store()` の戻り値を `Uint8Array` と検査し、returned copy を opaque Store として扱う説明が現行 WASM implementation と一致する。
- generated npm package を repository に含むとは記載せず、WASM を Application / Browser から秘密情報を隔離する境界とも記載していない。むしろ同一 execution context であり隔離境界ではないと明記している。
- `./scripts/build-wasm.sh` を一時出力先へ実行し、生成 JS / d.ts / `.wasm` の存在、export、default init、出力型を確認した。generated module の default init 相当と `create_empty_store()` を runtime 実行し成功した。Node の `file://` 直接 fetch は web server 前提のため使用せず、local fetch shim で生成 module の初期化経路を確認した。

Completion condition を全件満たすため、`RM-003` は `Resolved` とする。

## Upstream Feedback

なし。Requirements、Design、Specification は、README の現行 API、責任分界、authorization、Store、Binding、error および Chain / Network の正誤判定を妨げない。

## Deferred Findings

- Implementation Review 015 の長時間 fuzz campaign、external verifier / node、nightly branch coverage、LeakSanitizer、Browser 実機 matrix は引き続き Deferred である。これらを今回実行したとは扱わない。
- README `README.md:433` は上記を同レビューの Deferred 範囲として明記し、検証済みとは表現していない。Deferred の未実行自体は README finding ではない。
- `cargo audit` は今回の README 再レビューでは実行していないが、README は command の入口を示すだけで audit 成功結果を主張していない。README の誤誘導とは判定しない。

## Scope and Traceability

Implementation Review 015 の reviewed HEAD は current HEAD の祖先であり、その後の source / manifest / test 変更はなく、current HEAD では README と review artifact のみが追加・更新されている。README の current claims については、Implementation Review の `READY` を機械的に継承せず、公開 header / implementation、WASM generated output、仕様および対象 samples を再確認した。

| README 領域 | 主な対応資料 | 結果 |
| --- | --- | --- |
| Rust package / 16 operation / DTO / argument / return value | `Cargo.toml`、`src/lib.rs`、`src/types.rs`、`src/store.rs`、`docs/specifications/specification.md` | 一致 |
| Rust onboarding / handoff sample | `README.md:37-142`、`src/store.rs`、`docs/requirements/requirements.md`、`docs/specifications/specification.md` | 一致。RM-001 resolved |
| Core / Binding / Application responsibility | `docs/requirements/requirements.md`、`docs/design/architecture.md`、`docs/design/bindings.md`、`docs/design/security.md`、`docs/specifications/specification.md` | 一致 |
| Wallet Store / Pending / replacement / atomicity | `src/store.rs`、`docs/specifications/wallet-store-format-v1.md`、`docs/specifications/specification.md` | 一致 |
| Handoff / export / signing authorization and blind signing | `src/store.rs`、`src/types.rs`、`docs/design/security.md`、`docs/specifications/specification.md` | 一致。current-operation assertion と Core password authorization を分離 |
| Symbol / NEM / Chain / Network / Mainnet / Testnet / raw signing | `src/types.rs`、`src/store.rs`、`src/crypto.rs`、`docs/requirements/requirements.md`、`docs/specifications/specification.md` | 一致 |
| `AccountContext` and mismatch | `src/types.rs`、`src/store.rs`、`src/wasm.rs`、Native header、`docs/specifications/specification.md` | 一致。fixed Profile Network / Software Key Chain mismatch は `NetworkMismatch` |
| Native C ABI / Linux onboarding / ownership / release | `bindings/native/include/symbol_nem_wallet_core.h`、`bindings/native/src/lib.rs`、`bindings/native/tests/`、`bindings/native/Cargo.toml` | 一致。RM-002 resolved |
| WASM exports / generated web module / TypeScript representation / ownership | `src/wasm.rs`、`scripts/build-wasm.sh`、generated output、`tests/unit/wasm.rs`、`docs/specifications/specification.md` | 一致。RM-003 resolved |
| Error contract / failure-safe behavior | `src/error.rs`、`src/store.rs`、Native implementation、`src/wasm.rs`、`docs/specifications/specification.md` | 一致 |
| Package / version / toolchain / license / links | `Cargo.toml`、`Cargo.lock`、CI workflows、`LICENSE`、README links | 一致 |
| Deferred verification | `docs/reviews/implementation/implement-review-015.md`、CI workflows、`README.md:409-433` | README は Deferred を検証済みと表現していない |

## Domain Checks

| Documentation Check | 判定 | 根拠 / 指摘 |
| --- | --- | --- |
| install、package 名、version、workspace | PASS | Core / Native とも `0.1.0`。package 名、path dependency、workspace member、Native crate type が manifest / metadata と一致 |
| Rust 16 operation、DTO、argument、return value | PASS | 現行公開 operation 16件、`ReadResult` / `MutationResult`、主要 DTO、引数、status、`AccountContext`、raw bytes の説明が public API / specification と一致 |
| Store replacement model | PASS | mutation 成功時だけ完全な replacement Store を返し、Application が保存済み replacement を current Store として atomic に適用する説明が一致 |
| Pending Profile / handoff | PASS | Pending は committed Profile ではなく、対象 Store / password / confirmation 条件を満たすまで finalize しない。RM-001 resolved |
| export / signing authorization / blind signing guidance | PASS | user request、Application confirmation、signing approval、Core password authorization、target / payload / context の一致と blind signing の禁止が一致 |
| Core / Binding / Application responsibility boundary | PASS | Binding は status / authority を補完せず、Application は UI / current Store / user intent を担い、Core は authorization / key operation / validation を担う |
| Symbol / NEM | PASS | Chain-specific derivation、public key、address、signature scheme を同一視せず、`symbol-sdk` 3.3.2 と deterministic fixture の基準を正しく限定 |
| Mainnet / Testnet / `AccountContext` | PASS | Profile fixed Network、Software Key fixed Chain、context compatibility、mismatch error、fallback / implicit conversion 禁止を正しく説明 |
| Native C ABI | PASS | 16 symbols、public header、wire values、DTO、success / failure error、failure-safe output、caller input / Binding output ownership、release API が一致。RM-002 resolved |
| WASM / TypeScript / `Uint8Array` | PASS | 16 snake_case exports、web init、`create_empty_store`、DTO representation、exact `Uint8Array`、returned copy、`.wasm` placement、non-isolation boundary が一致。RM-003 resolved |
| error contract | PASS | Rust `WalletResult`、stable `ErrorCode`、`InvalidArgument` / `InvalidStore` / `AuthenticationFailed` / `NetworkMismatch` / `BindingFailure` の範囲、failure 時の非返却・非変更が一致 |
| package / version / toolchain | PASS | package version、`wasm-bindgen-cli 0.2.127`、`wasm-pack 0.15.0`、`cargo-audit 0.22.2`、build commands が manifest / lock / CI と一致 |
| LICENSE / links | PASS | `LICENSE` は MIT。README の header、requirements、design、specification、review、knowledge、license link の対象が存在 |
| Deferred verification 表現 | PASS | IR-015 Deferred の5項目を検証済みと主張せず、実行範囲とレビュー artifact を区別 |
| 初回利用導線 / usability | PASS | Rust restore path、handoff guard、Native build→C call→release、WASM build→generated web import→init→first call が README から追跡可能 |

## Validation Results

レビュー対象の正確性と examples の実行可能性を確認するために実行した。実装全体の品質保証へ範囲を拡張しない。

| コマンド / 確認 | 結果 |
| --- | --- |
| `git status --short --branch`（artifact 作成前） | PASS。`agent/concept-review-follow-up`、tracked worktree clean |
| `git rev-parse HEAD` / `git rev-parse HEAD:README.md` | PASS。README target `d14dbd198847213b49f549d2d606f1b6c27e8fb2`、README blob `d09ed745a3e4c6cbf131c6fb9ffc81377ab06af8` |
| `git diff --check` | PASS |
| `python3 scripts/check-invisible-characters.py` | PASS。22 source files |
| `cargo metadata --locked --format-version 1 --no-deps` | PASS。Core / Native package、workspace、crate type、feature を確認 |
| `rustc --version` / `cargo --version` / `wasm-pack --version` / `cc --version` | PASS。Rust / Cargo 1.98.0、wasm-pack 0.15.0、cc 15.2.0 |
| `cargo fmt --all -- --check` | PASS |
| `cargo clippy --workspace --all-targets --all-features --locked --offline -- -D warnings` | PASS |
| `cargo test --workspace --all-features --locked --offline` | PASS。Core unit 46、Core integration 6、Native unit 2、Native API 2、doc-tests 0 failures |
| `cargo check --target wasm32-unknown-unknown --features wasm --locked --offline` | PASS |
| `cargo check --manifest-path fuzz/Cargo.toml --locked --bin wallet_store_decode --offline` | PASS。fuzz target compile のみ |
| Rust README restore / derive / public-account sample compile check | PASS。一時 Cargo project で現行 package に対して `cargo check --offline` |
| Rust README handoff sample compile check | PASS。一時 Cargo project で `cargo check --offline`。placeholder default error と guard を含む現行 sample |
| `cargo build --package symbol-nem-wallet-core-native --release --locked` | PASS。Linux release static / shared artifact を確認 |
| README の Linux C example `cc ... target/release/libsymbol_nem_wallet_core_native.a ...` | PASS。現行 header / release static library に対する compile と runtime |
| `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c` | PASS |
| `./bindings/native/tests/run_c_abi_runtime.sh` | PASS |
| `./scripts/build-wasm.sh /tmp/...`（`wasm-bindgen-cli 0.2.127`） | PASS。一時 output に JS、d.ts、`symbol_nem_wallet_core_bg.wasm` を生成し、repository の `pkg/` は作成していない |
| generated `symbol_nem_wallet_core.js` / `.d.ts` inspection | PASS。default init、`create_empty_store` export、`Uint8Array` return、`.wasm` relative path、16 public exports を確認 |
| generated web module default init + `create_empty_store()` runtime check | PASS。Node local fetch shim で `await init()`、`create_empty_store()`、`Uint8Array`、non-empty Store を確認。Browser 実機 matrix ではない |
| `wasm-pack test --node --locked --features wasm --offline` | PASS。WASM tests 7件 |
| `cargo audit` | 未実行。README は audit 成功結果を記載していない |
| 長時間 fuzz campaign、external verifier / node、nightly branch coverage、LeakSanitizer、Browser 実機 matrix | 未実行。IR-015 の Deferred 範囲。README finding にはしない |

生成した一時 Cargo project、C example、WASM CLI、WASM output は検証後に `/tmp` から削除した。秘密情報は artifact、command output、報告へ記録していない。

## Review Gates

| Gate | 判定 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 正確性 | PASS | Rust API / DTO、Native ABI、WASM export、manifest、version、仕様、license、links が一致 | なし |
| 利用可能性 | PASS | Rust restore / handoff、Native build→call→release、WASM build→import→init→first call の導線を確認済み | なし |
| 制約の正確性 | PASS | user intent と Core authorization、Store / Pending、Chain / Network、blind signing、WASM non-isolation、Deferred を誤認させない | なし |
| 整合性 | PASS | README と公開 API、implementation、specification、CI、test、license に利用を妨げる矛盾なし | なし |
| 構成 | PASS | 初回利用に必要な最小例と責任・制約が追跡可能な順序で記載されている | なし |

## Remaining Risks and Open Decisions

- Browser 実機 matrix、external verifier / node、長時間 fuzz、nightly branch coverage、LeakSanitizer は IR-015 の Deferred のままであり、README の READY 判定とは独立している。
- macOS / Windows の Native artifact filename / link は README が未検証値を推測せず、platform / toolchain 依存として扱っている。今回それらを concrete 値で追加・保証していない。
- `cargo audit` の実行結果は今回の review evidence に含めていない。README は command の入口と tool version を示すだけで、audit 済みとは記載していない。
- 新しい公開 API、仕様、設計判断または互換性要求を今回追加していない。

## Automatic Changes

- レビュー対象 README、Rust、Native、WASM、manifest、requirements、design、specification、test、fixture、CI、skill は変更していない。
- 許可された正式 review artifact `docs/reviews/readme/README-review-002.md` のみを新規作成した。
- 検証用一時生成物は `/tmp` に作成し、検証後に削除した。

## Final Decision

`READY`

RM-001〜RM-003 は completion condition を満たして `Resolved` であり、新規 ERROR / WARN / NIT はない。正式 README Review Gate に基づき、README の `READY` 宣言は可能である。

# README Review 001

## Review Target

- Repository: `nemnesia/symbol-nem-wallet-core`
- Branch: `agent/concept-review-follow-up`（レビュー中に変更しない）
- README update commit: `dd9b17f66ec35666ff8921848d317e709be2a992`
- Implementation Review: `docs/reviews/implementation/implement-review-015.md`
- Implementation Review Gate: `READY`
- Implementation HEAD reviewed: `d519cd4102010a02c5892293705fce041e214769`
- 確認日: 2026-08-31（JST）
- Artifact: `docs/reviews/readme/README-review-001.md`
- 範囲: ルート `README.md` 全文の正確性、利用開始可能性、制約・責任分界、構成
- 未確認範囲: README の問題を修正した後の再レビュー、および Implementation Review 015 が Deferred とした外部検証そのもの

## Execution Audit

Chair が Reviewer A〜C の3観点を独立したパスとして実施した。

- Reviewer A — manifest、lock、workspace、Rust public API、Native header、WASM export、build/version、サンプルを照合
- Reviewer B — install/build から Rust、Native、WASM の最初の利用までの導線を確認
- Reviewer C — security responsibility、Wallet Store / Pending、Symbol / NEM / Network、ownership、license、Deferred 表現、過剰保証を確認
- サブエージェントは使用していない
- 指定された `AGENTS.md`、`readme-review/SKILL.md`、review playbook、reviewers、review-gates、output-format を確認済み
- `AGENTS.md` に対象フェーズの Phase Context 登録はなく、Context は使用していない

## Evidence Used

| 資料 | 用途 |
| --- | --- |
| `README.md`（対象 commit） | レビュー対象本文、行番号、API・利用導線・制約の確認 |
| `Cargo.toml`、`bindings/native/Cargo.toml`、`Cargo.lock` | package 名、version、workspace、feature、依存解決 version |
| `src/lib.rs`、`src/types.rs`、`src/store.rs`、`src/wasm.rs` | Rust API、DTO、error、Core / WASM の外部可視動作 |
| `bindings/native/include/symbol_nem_wallet_core.h`、`bindings/native/src/lib.rs` | Native C ABI、wire value、ownership、release API |
| `scripts/build-wasm.sh` | WASM build、出力先、`wasm-bindgen` CLI の扱い |
| `.github/workflows/coverage.yml`、`dependency-audit.yml`、`fuzz.yml` | CI の build、tool version、検証範囲、Deferred との整合 |
| `docs/requirements/requirements.md` | Core、Application、Binding の責任分界と安全要求 |
| `docs/design/architecture.md`、`bindings.md`、`security.md` | trust boundary、Store ownership、handoff / signing responsibility |
| `docs/specifications/specification.md` | API、DTO、authorization、atomicity、Native / WASM 契約 |
| `docs/specifications/wallet-store-format-v1.md` | opaque Store、canonical CBOR、unknown field / enum、malformed input の扱い |
| `docs/reviews/implementation/implement-review-015.md` | Implementation Gate、解決済み指摘、Deferred 検証範囲 |
| `tests/`、`bindings/native/tests/`、`LICENSE` | fixture、binding runtime、failure path、license の確認 |

## Review Result

`REVISE README`

## Summary

現行16 operation の Rust API、DTO、Native C ABI、WASM export、Store replacement、Symbol / NEM と Network / Chain の境界、Core / Application / Binding の責任分界、tool version、Deferred verification の記載は、確認した実装・仕様・設定と整合している。

一方、生成 Profile の handoff 例は、利用者への提示と受領確認をコード上で取得せず、`Confirmed` を直ちに渡すため、例をそのまま利用すると安全な handoff を省略できる。また、Native と WASM は build と契約説明で止まり、生成物の利用・初回呼び出しまでの最小導線がない。これらは利用開始可能性と security-sensitive operation の誤用防止に影響するため、WARN として README の再修正を要求する。

## Finding Status

| ID | Severity | Status | 初出レビュー | 今回の状態根拠 |
| --- | --- | --- | --- | --- |
| RM-001 | WARN | New | 本レビュー | handoff の説明は正しいが、Rust サンプルの実行経路が現在の利用者確認を取得せず `Confirmed` を固定している |
| RM-002 | WARN | New | 本レビュー | Native は build、symbol、ownership の説明はあるが、link/output と最初の C 呼び出しまで到達する例がない |
| RM-003 | WARN | New | 本レビュー | WASM は build、生成、型契約の説明はあるが、生成 web module の初期化・import・最初の呼び出し例がない |

### RM-001 — handoff サンプルが確認済み status を固定している

- 対象箇所: `README.md:95-123`、特に `README.md:109-118`
- 確認できた事実: 本文は Application が Mnemonic 全体を提示し、利用者の受領確認後だけ `finalize_generated_profile` を呼ぶと説明している。しかしサンプルの `create_generated_profile` は、提示、受領確認、現在の利用者意思の取得を行わず、`prepared.value.mnemonic_utf8` も使用せずに `HandoffConfirmationStatus::Confirmed` を渡している。
- 根拠: `docs/requirements/requirements.md`、`docs/design/security.md`、`docs/specifications/specification.md` は handoff confirmation を Application が取得し、Core が `Confirmed` status と password を operation 単位で検証する責任分界を定める。`src/store.rs` は status を検証できるが、UI 上の提示・受領を代わりに証明することはできない。
- 問題: コメントだけを守ることを前提にした copy-paste 可能なコードになっており、利用者が Mnemonic を渡していない状態で Profile を committed Store に finalize し得る。
- 影響: 利用者が生成 Mnemonic をバックアップできず、Profile を失う可能性がある。handoff と認証 assertion の扱いを誤らせ、利用開始・security guidance の gate を不合格にする。
- 必要な最小修正: 直接 `Confirmed` を構築する実行例を、Application から取得した明示的な確認結果を検証してから finalize する例へ変更する。確認処理を実装できない場合は、コードを擬似コードまたは未実装 placeholder と明記し、現状の関数が安全な handoff を自動取得しないことを本文にも明示する。
- 完了条件 / 再確認: サンプルの finalize 経路に、Mnemonic 全体の提示と現在の利用者確認を表す外部入力または明示的な guard があり、確認なしで `Confirmed` を渡す copy-paste 経路がないことを README と Rust compile check で再確認する。

### RM-002 — Native の初回利用導線が不足している

- 対象箇所: `README.md:218-254`
- 確認できた事実: package 名、release build command、16 symbol、`SnwcBytes` / `SnwcOwnedBytes`、UUID / wire value、request DTO、各 release function、failure-safe output、error ownership は記載されている。しかし、生成される Native library の利用方法、link/output の確認方法、header を include して最初の operation を呼び、返却 buffer を release する最小 C 例または既存 runtime test への導線がない。
- 根拠: `bindings/native/Cargo.toml` は `rlib`、`cdylib`、`staticlib` を生成する。公開 header は16 operationと `snwc_free_*` を提供し、`bindings/native/tests/header_compile.c` と `run_c_abi_runtime.sh` は実際の利用例に相当する。
- 問題: Native 利用者は package を build できても、C/C++ 側からどの生成物をどう link し、最初の output をどの release API で解放するかを README だけで一連に確認できない。ownership の説明が単独で記載され、呼び出し順序と適用箇所が分離している。
- 影響: 初回利用まで進めず、caller-owned input と Binding-owned output の境界を実際の operation に適用しにくい。Native onboarding gate を不合格にする。
- 必要な最小修正: 既存 header / runtime test の契約だけを使い、library output / link の前提と `snwc_create_empty_store` など一つの呼び出し、成功・失敗時の output、`snwc_free_bytes` の最小 C 例または runtime test への明示的な導線を追加する。
- 完了条件 / 再確認: README の C 例または参照先が、現在の公開 header で compile でき、caller input と Binding output の release 契約を誤りなく示すことを確認する。

### RM-003 — WASM の初回利用導線が不足している

- 対象箇所: `README.md:256-283`
- 確認できた事実: `wasm` feature、target、raw build、`cargo install wasm-bindgen-cli`、`scripts/build-wasm.sh`、default output、snake_case export、`Uint8Array`、DTO、read / mutation result、input / output ownership、WASM の trust boundary は記載されている。しかし、生成された web glue module の import、初期化、`create_empty_store` または最初の read / mutation の呼び出し、生成物の import path を示す JS / TypeScript の最小例がない。
- 根拠: `scripts/build-wasm.sh` は `wasm-bindgen --target web --out-dir` を実行し、生成 npm package は repository に含まれない。`src/wasm.rs` は README 記載の snake_case export と `Uint8Array` / DTO 契約を実装している。
- 問題: WASM 利用者は package 生成までは進めても、web target の生成 module をどう初期化して最初の Core operation を実行するかを README だけで確認できない。
- 影響: WASM onboarding の最初の実行で停止し、入力借用・出力 copy の契約を実際の呼び出しに結び付けにくい。利用可能性と構成 gate を不合格にする。
- 必要な最小修正: 生成物を repository に追加せず、`--target web` の生成 module を import / initialize し、`create_empty_store` と一つの read または mutation を呼ぶ最小 JS / TypeScript 例を追加する。例には exact `Uint8Array` と returned copy の扱いを反映する。
- 完了条件 / 再確認: `./scripts/build-wasm.sh` の出力を対象に、README の例が現行 export 名・初期化形式・型契約で動作することを確認する。

## Required Changes

- `RM-001`（WARN / New）: handoff confirmation を利用者確認なしで固定するサンプルを修正する。
- `RM-002`（WARN / New）: Native の build 後から最初の C 呼び出し・release までの導線を追加する。
- `RM-003`（WARN / New）: WASM の生成 web module の初期化・最初の呼び出しまでの導線を追加する。

## Optional Improvements

なし。NIT はない。

## Resolved Findings

- 本 README に対する既存の正式 artifact は確認できなかった。
- Implementation Review 015 が README review へ Deferred とした旧 API 記載の懸念は、対象 commit の現行 README では解消されている。16 operation、`finalize_generated_profile` の4引数、`export_mnemonic` / `export_private_key` の `ExportRequest`、`get_public_account` の `AccountContext`、`sign` の `SigningRequest` を独立に照合した。この確認は Implementation Review の `READY` を機械的に継承したものではない。

## Upstream Feedback

なし。Requirements、Design、Specification に、今回の README の正誤判定を妨げる不足・曖昧さ・矛盾は確認されなかった。

## Deferred Findings

- Implementation Review 015 で Deferred の長時間 fuzz campaign、external verifier / node、nightly branch coverage、LeakSanitizer、Browser 実機 matrix は、README review の成果物ではない。README はこれらを検証済みと記載しておらず、現状の表現は正確である。
- 上記外部検証を未実行であること自体は、README の finding としない。README の修正後に行う再レビューでは、Deferred の状態を維持したまま、検証済み範囲を再確認する。

## Scope and Traceability

README の外部可視記載を、同じ契約を定める上流・実装・検証資料へ追跡した。

| README 領域 | 主な対応資料 | 結果 |
| --- | --- | --- |
| Rust package / 16 operation / DTO | `Cargo.toml`、`src/lib.rs`、`src/types.rs`、`src/store.rs`、`docs/specifications/specification.md` | 一致 |
| Core / Application / Binding responsibility | `docs/requirements/requirements.md`、`docs/design/architecture.md`、`docs/design/bindings.md`、`docs/design/security.md`、`docs/specifications/specification.md` | 一致 |
| Wallet Store / Pending / replacement / atomicity | `src/store.rs`、`docs/specifications/wallet-store-format-v1.md`、`docs/specifications/specification.md` | 一致。handoff の実例だけ RM-001 |
| Symbol / NEM / Chain / Network / raw signing | `src/types.rs`、`src/store.rs`、`src/crypto.rs`、`tests/unit/crypto.rs`、`docs/specifications/specification.md` | 一致 |
| Native ABI / ownership / release | 公開 header、`bindings/native/src/lib.rs`、`bindings/native/tests/`、`docs/specifications/specification.md` | 契約は一致。導線だけ RM-002 |
| WASM / TypeScript representation / failure | `src/wasm.rs`、`tests/unit/wasm.rs`、`scripts/build-wasm.sh`、`docs/specifications/specification.md` | 契約は一致。導線だけ RM-003 |
| Build / versions / license / Deferred | `Cargo.lock`、CI workflows、`scripts/build-wasm.sh`、`LICENSE`、IR-015 | 一致 |

## Domain Checks

| Documentation Check | 判定 | 根拠 / 指摘 |
| --- | --- | --- |
| install、package 名、version、workspace | PASS | Core / Native はともに `0.1.0`、package 名と path、workspace member が manifest と一致 |
| Rust API と DTO | PASS | README の16 operation、引数順、status、target、context、payload、戻り値に旧 API は残っていない |
| Native C ABI | PASS | 16 symbol、`SnwcBytes`、`SnwcOwnedBytes`、raw UUID、wire value、request DTO、release API、failure-safe output が header / implementation と一致 |
| WASM / TypeScript 契約 | PASS | snake_case、exact `Uint8Array`、DTO representation、read / mutation result、ownership、`BindingFailure` の範囲が一致 |
| security responsibility | PASS（RM-001 は例の問題） | Core の operation authorization、Application の current intent / display / current Store、Binding 非authority、password と assertion の分離、raw signing が一致 |
| Wallet Store / Pending Profile | PASS | opaque、replacement、failure atomicity、pending 非committed、handoff 前 finalize 不可、migration 非対応、malformed / unsupported / unknown enum の扱いが一致。Specification 上 unknown field は opaque extension として扱われるが、README は unknown field を拒否すると主張していない |
| Symbol / NEM / Network | PASS | Profile Network 固定、Software Key Chain 固定、Profile の非 Chain 固定、両 Chain、`AccountContext`、mismatch、chain 固有暗号・導出・address、raw payload signing が一致 |
| build / version / toolchain | PASS | `0.1.0`、Native package、`wasm` feature、target、`wasm-pack 0.15.0`、`wasm-bindgen-cli 0.2.127`、`cargo-audit 0.22.2` が manifest / lock / CI / version command で裏付けられる。build script 自体は CLI version を強制しないが、README と CI の記載はその事実と矛盾しない |
| Deferred verification 表現 | PASS | fuzz campaign、external verifier / node、nightly branch coverage、LeakSanitizer、Browser 実機 matrix を検証済みと誤認させず、Implementation 全体を未完成とも記載していない |
| license、links | PASS | `LICENSE` は MIT、README のリンク先は存在し、対象資料を指している |
| examples / 利用開始可能性 | FAIL | Rust handoff の安全な確認経路が不在（RM-001）、Native 初回利用導線不足（RM-002）、WASM 初回利用導線不足（RM-003） |

## Validation Results

このレビューで実行した結果を記録する。実行結果はレビュー対象の README の正確性確認に使用し、実装全体の別の品質保証へ拡張しない。

| コマンド / 確認 | 結果 |
| --- | --- |
| `git status --short --branch`（artifact 作成前） | PASS。対象 branch は `agent/concept-review-follow-up`、開始時の tracked worktree は clean |
| `git diff --check` | PASS |
| `cargo metadata --locked --format-version 1 --no-deps` | PASS。Core / Native package、workspace、crate type、`wasm` feature を確認 |
| `rustc --version`、`cargo --version`、`wasm-bindgen --version`、`wasm-pack --version`、`cargo audit --version` | PASS。`rustc/cargo 1.98.0`、`wasm-bindgen 0.2.127`、`wasm-pack 0.15.0`、`cargo-audit 0.22.2` |
| `python3 scripts/check-invisible-characters.py` | PASS |
| `cargo fmt --all -- --check` | PASS |
| `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` | PASS |
| `cargo test --workspace --all-features --locked` | PASS。Core unit 46、Core integration 6、Native unit 2、Native API 2 |
| `cargo check --target wasm32-unknown-unknown --features wasm --locked` | PASS |
| `cargo check --manifest-path fuzz/Cargo.toml --locked --bin wallet_store_decode` | PASS |
| `cargo build --package symbol-nem-wallet-core-native --release --locked` | PASS |
| `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c` | PASS |
| `./bindings/native/tests/run_c_abi_runtime.sh` | PASS |
| `wasm-pack test --node --locked --features wasm` | PASS。7 WASM tests。tool が version 取得に関する warning を出したが、終了 status は0で、README の契約不一致ではない |
| `cargo audit` | 未実行。このレビューでは tool version、workflow の固定 version、README の command を確認した。audit の実行結果を成功とは扱わない |
| 長時間 fuzz、external verifier / node、nightly branch coverage、LeakSanitizer、Browser 実機 matrix | 未実行。IR-015 の Deferred 範囲であり、README も検証済みとは記載していない |

レビュー中の README、Rust、Native、WASM、manifest、仕様、test、fixture、skill は変更していない。artifact の新規作成のみを行った。

## Review Gates

| Gate | 判定 | 根拠 | 対応 ID |
| --- | --- | --- | --- |
| 正確性 | PASS | API、binding、仕様、manifest、version、license の記載は一致 | なし |
| 利用可能性 | FAIL | handoff の安全な例と Native / WASM の初回利用導線が不足 | RM-001, RM-002, RM-003 |
| 制約の正確性 | FAIL | Core の契約自体は正確だが、RM-001 の例が handoff assertion の取得を省略して実行できる | RM-001 |
| 整合性 | PASS | README と公開契約・仕様・テスト・CI に反する記載はない | なし |
| 構成 | FAIL | 初回利用に必要な手順が Native / WASM の詳細契約だけでは完結せず、handoff 例も安全な実行順序を示していない | RM-001, RM-002, RM-003 |

## Remaining Risks and Open Decisions

- RM-001〜RM-003 の README 修正後に、対象 commit を更新して再レビューが必要。
- Native の link command、WASM の生成 module 初期化形式など、具体例を追加する際は現行 header / `--target web` 生成物との一致を再確認する必要がある。今回のレビューでは新しい API や仕様を決定していない。
- Implementation Review 015 の Deferred 検証は未完了のままであり、README の READY 判定とは独立である。
- 未確認の external node、browser、長時間 fuzz の結果を README へ追加する場合は、実際の検証記録が必要である。

## Automatic Changes

なし。レビュー対象の README と関連 source / specification / test は変更せず、本 artifact のみ新規作成した。

## Final Decision

`REVISE README`

WARN 3件（RM-001〜RM-003）があるため、正式 gate の規則により README は `READY` と宣言できない。RM-001〜RM-003 の修正後、README の target commit を更新して再レビューすること。

# Implementation Review Findings

## Review Target

- 対象: `bindings/`, `src/`, `third_party/curve25519-dalek-4.1.3/` および関連するテスト、fixture、manifest、CI 検証設定
- 確認日: 2026-08-22 18:23 +0900
- レビュー範囲: 現行 `HEAD` (`bdbc873`) の Native / WASM Binding、Core 実装、local `curve25519-dalek` patch、関連テスト
- 未確認範囲: 外部 upstream archive を用いた local patch 検査、WASM runtime test、coverage、sanitizer 実行、全 backend の独立検証
- 成果物: `docs/reviews/implementation/implement-review-007.md`

## Execution Audit

- 実行モード: `spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A 識別子: `01a028a9-a530-7a52-a8f4-25984824e37e`
- Reviewer B 識別子: `01a028a9-bdd9-7fb1-a95c-25d07c2557c1`
- Reviewer C 識別子: `01a028a9-d6da-7d80-94a9-32243e51be90`
- Reviewer D 識別子: `01a028a9-eda8-7a91-a9a9-420c7094c795`
- 起動再試行: なし
- Phase 1: 完了。4名を個別に `wait_agent` で確認
- Phase 2: 完了。4名へ個別に follow-up を送信し、`wait_agent` で確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `src/crypto.rs:211-353`; `third_party/curve25519-dalek-4.1.3/src/scalar.rs:292-294,1164-1174`; `third_party/curve25519-dalek-4.1.3/src/backend/serial/{u32,u64}/scalar.rs` | 署名・公開鍵生成における secret scalar temporary と local patch の確認 |
| 実装コードまたは差分 | `src/store.rs:1014-1053,1649-1653`; `src/wasm.rs:50-80,292-479`; `bindings/native/src/lib.rs:357-390` | malformed payload の失敗経路、Binding の数値変換・資源境界・出力所有権の確認 |
| テストまたは fixture | `tests/unit/store.rs:594-623,701-823`; `tests/core.rs:143-333,511-613`; `tests/unit/wasm.rs`; `bindings/native/tests/api.rs`; `bindings/native/tests/caller_runtime.c` | atomicity、AAD/tag、Core、WASM、Native の検証範囲確認 |
| 承認済み仕様 | `docs/specifications/specification.md:112-162,631-673,677-760`; `docs/specifications/wallet-store-format-v1.md:11-70` | HD/account validation、secret memory、Binding、resource limit、テスト契約との照合 |
| 要件・設計判断 | `docs/requirements/requirements.md:174-244,260-326`; `docs/decisions/binding-implementation.md`; `docs/decisions/crypto-constant-time.md`; `docs/decisions/curve25519-dalek-local-patch.md` | 要件、Binding ownership、zeroize 方針、local patch の採用範囲確認 |

## Review Result

公開可能

## Summary

Critical 指摘は確認されなかったため、レビューゲート規則上の判定は公開可能とする。
一方、署名 scalar temporary と malformed payload の private key copy に関する既存 Major 指摘が再発している。
WASM の範囲外数値の wrap と Native の出力 pointer aliasing にも、現在の Binding 契約に対する具体的な欠陥がある。
Core の暗号・Store・atomicity の主要 fixture と Native の通常 C ABI runtime test は成功した。
Major 指摘は修正後に再レビューすることを推奨する。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | Reopened | `implement-review-001` | local scalar patch 後も active backend の secret arithmetic temporary に Drop 時 zeroize 保証がない。 |
| IR-002 | Major | Resolved | `implement-review-001` | BIP39 Mnemonic、entropy、seed の zeroize 経路に退行なし。 |
| IR-003 | Major | Reopened | `implement-review-001` | malformed authenticated payload の origin validation early return に plain private key copy が残る。 |
| IR-004 | Minor | Resolved | `implement-review-001` | 未知 enum と既知固定値不一致の fatal 分類を確認した。 |
| IR-005 | Minor | Resolved | `implement-review-001` | tag/AAD 改変、semantic mismatch、全主要 mutation の input 不変性テストを確認した。 |
| IR-006 | Minor | Open | `implement-review-001` | WASM / C ABI の未実行 API、DTO、ownership、failure parity の検証不足が残る。 |
| IR-007 | Minor | Open | `implement-review-001` | public Generated failure / atomicity の独立検証不足が残る。 |
| IR-008 | Minor | Resolved | `implement-review-002` | fixed field 不正を warning skip せず `InvalidStore` とする実装・テストを確認した。 |
| IR-009 | Minor | Resolved | `implement-review-004` | authenticated Pending の Profile ID 衝突を `PendingProfileInvalid` とする実装・テストを確認した。 |
| IR-010 | Major | Resolved | `implement-review-006` | 乱数失敗時の出力 owner を `Zeroizing` で管理する実装・テストを確認した。 |
| IR-011 | Major | New | `implement-review-007` | WASM の `u8` / `u32` 引数が JavaScript の範囲外値を wrap して受理する。 |
| IR-012 | Major | New | `implement-review-007` | Native prepare API が alias された二つの output pointer で秘密 buffer を失う。 |
| IR-013 | Minor | New | `implement-review-007` | Mnemonic / Pending の Rust-side owned buffer を不要に複製する。 |
| IR-014 | Minor | New | `implement-review-007` | WASM が Store の 16 MiB decoder limit 検査前に入力全体を複製する。 |

## Required Changes

### IR-001

- Priority: Major
- Status: Reopened
- 対象箇所: `src/crypto.rs:221-233,321-353`; `third_party/curve25519-dalek-4.1.3/src/scalar.rs:292-294,1164-1174`; `third_party/curve25519-dalek-4.1.3/src/backend/serial/u64/scalar.rs` および `serial/u32/scalar.rs` の scalar conversion / reduction / arithmetic
- 問題: `Scalar::from_bytes_mod_order_wide` と serial backend の reduction が、secret 由来の `Scalar52` / `Scalar29` や arithmetic temporary を plain `Copy` 値として生成する。`Zeroize` 実装があっても Drop 時の消去保証にはならず、署名・公開鍵生成の処理後または unwind 時に source-level zeroize 保証が成立しない。
- 根拠: 承認済み仕様 `specification.md §12.1–§12.2`、`docs/decisions/curve25519-dalek-local-patch.md`、`docs/decisions/crypto-constant-time.md`、既存 `IR-001`
- 発生条件: Symbol / NEM の公開鍵生成または署名で、nonce / challenge を scalar 化し、active u64 または u32 backend の conversion・reduction・arithmetic を通る場合。
- 影響: 署名 temporary の secret scalar material が処理後のメモリへ残る可能性があり、仕様で要求された secret temporary zeroize 保証を満たさない。
- 修正内容: active backend の secret 由来 conversion、reduction、arithmetic の中間値と戻り値を、通常 return・error・unwind の各経路で zeroize 保証のある所有値として扱う。
- 修正完了条件: source audit で対象経路に unprotected secret scalar temporary が残らず、既存の Symbol / NEM 公開鍵・署名 fixture が変わらないことを確認する。
- 追加テスト: u64 / u32 backend を強制した scalar・公開鍵・署名 fixture、および通常 return / failure path の確認。

### IR-003

- Priority: Major
- Status: Reopened
- 対象箇所: `src/store.rs:1014-1053,1649-1653`; `src/types.rs:109-123`
- 問題: `parse_key_record` が authenticated payload の `private_key` を plain `[u8; 32]` に取り出した後で origin map を検証する。origin の欠落、型不正、未知値、account index 範囲外などで early return すると、`KeyRecord` の zeroize `Drop` が実行されない。
- 根拠: 承認済み仕様 `specification.md §10, §12.1–§12.2`、`wallet-store-format-v1.md §2.1`、既存 `IR-003`
- 発生条件: AEAD 認証済み payload に有効長の private key と不正な origin map を含め、export、公開情報取得、署名または mutation の認証経路を実行する場合。
- 影響: 認証済み malformed payload の拒否時に private key の plain copy が zeroize 保証なしで破棄され、secret memory 要件に違反する。
- 修正内容: origin および関連 field の検証が完了するまで private key を zeroize 保証のある owner で保持し、成功時だけ KeyRecord へ所有権を移す。
- 修正完了条件: origin の全 early-return path で private key copy が zeroize され、正常な payload の外部結果・wire bytes が変わらないことを確認する。
- 追加テスト: 認証済み payload の unknown origin、origin field 欠落、非整数 account index、範囲外 account index を各 API から確認する。

### IR-011

- Priority: Major
- Status: New
- 対象箇所: `src/wasm.rs:60-80,292-303,328-342,420-479`
- 問題: WASM public API の network / chain / account index を `u8` / `u32` として受け取り、範囲検証前に wasm-bindgen の数値変換を通す。`256` が `0`、`4294967296` が `0` へ wrap し、`parse_network` / `parse_chain` / Core の account index 検証へ届く前に有効値として扱われる。
- 根拠: `specification.md §4.2, §9.2, §10, §13, §14.2`、`wallet-store-format-v1.md §4`、実装コード。account index の有効範囲は `0..=2147483647` で、入力不正は `InvalidArgument` または `InvalidAccountIndex` とする。
- 発生条件: JavaScript から network / chain に 256 など、または account index に 32-bit unsigned 範囲外の整数を渡す場合。
- 影響: 無効な入力が Testnet / NEM / account 0 などの別の有効処理として実行され、指定値と異なる Profile / Chain / HD 結果を返す。WASM と他 Binding の入力検証が一致しない。
- 修正内容: JavaScript 数値の有限性・整数性・許容範囲を狭い整数型へ変換する前に検証し、範囲外値を対応する error code で拒否する。
- 修正完了条件: 範囲内の値だけが既存 Core API へ到達し、範囲外値が Store を変更せず拒否され、Native / Core と同じ DTO・error 結果になること。
- 追加テスト: `256`、負数、`NaN`、小数、`4294967296` および account index `2147483648` の WASM runtime test。

### IR-012

- Priority: Major
- Status: New
- 対象箇所: `bindings/native/src/lib.rs:357-390`; `bindings/native/include/symbol_nem_wallet_core.h:17-19,84-90`; `bindings/native/tests/header_compile.c:24-28`
- 問題: `snwc_prepare_generated_profile` は `out_mnemonic` へ owned mnemonic を格納した後、同じ pointer が `out_pending` に渡されていると pending を同じ構造体へ上書きする。先に格納した mnemonic allocation は caller から到達不能になり、秘密 buffer の解放・zeroize が行われない。
- 根拠: `docs/decisions/binding-implementation.md §Native C ABI safety contract`、`specification.md §8.1, §12.1–§12.2, §13`、公開ヘッダーおよび実装。ヘッダーは NULL と初期化を要求するが、二つの output pointer の alias を禁止していない。
- 発生条件: 有効な prepare 呼出しで `out_mnemonic == out_pending` とする場合。
- 影響: 初回 Mnemonic backup handoff の出力が pending blob で上書きされ、必要な秘密情報を受け取れない。また mnemonic の owned allocation が leak し、zeroize されない。
- 修正内容: 複数 output の alias により所有 buffer が失われないよう、入力 alias を拒否するか、alias を安全に処理して各出力契約を満たす。
- 修正完了条件: valid call で mnemonic と pending がそれぞれ正しく受け取れ、alias または不正出力時に秘密 buffer の leak・未消去・部分成功が発生しないこと。
- 追加テスト: 有効な prepare 呼出しの distinct output、同一 output pointer、NULL output、既存 sentinel output を C runtime / sanitizer で確認する。

## Optional Improvements

### IR-006

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/wasm.rs:36-278`; `bindings/native/tests/api.rs:38-547`; `bindings/native/tests/caller_runtime.c:13-144`
- 改善内容: 仕様で公開される WASM / Native API のうち、export、list、generation、password change、delete および対応する error、DTO、ownership、failure path の runtime parity を追加確認する。C header compile は実行時 ownership の証拠にならない。
- 根拠: `specification.md §9, §13, §14.2`、`docs/decisions/binding-implementation.md`、既存 `IR-006`
- 影響: Core テストと代表的 Binding テストが通っても、Binding 固有の mapping、失敗時 output 保持、free 対応の退行を検出できない。

### IR-007

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/store.rs:594-623`; `tests/core.rs:511-522`
- 改善内容: public `generate_software_key` の乱数源失敗、候補妥当性失敗、保存失敗について、helper ではなく公開 mutation の error propagation、input Store 不変、replacement Store 非返却を確認する。
- 根拠: `specification.md §14.2`、`requirements.md AC-005`、既存 `IR-007`
- 影響: private injection helper と public success test が通っても、公開 API の failure wiring と atomicity が退行する可能性がある。

### IR-013

- Priority: Minor
- Status: New
- 対象箇所: `src/store.rs:194-201`; `bindings/native/src/lib.rs:385-389,489-492`
- 改善内容: `PreparedProfile`、Mnemonic export、Native prepare/export の Rust-side secret Vec を、必要な JavaScript / C owned output への境界 transfer 以外では複製せず所有権移動する。
- 根拠: `specification.md §12.1–§12.3`、`docs/decisions/binding-implementation.md §Common boundary`。`src/wasm.rs` の JavaScript-owned `Uint8Array` 生成そのものは本指摘の対象外とする。
- 影響: 現行実装でも Drop/zeroize は行われるが、同時に存在する secret buffer が増え、仕様の不要な clone 回避に反する。

### IR-014

- Priority: Minor
- Status: New
- 対象箇所: `src/wasm.rs:50-54`; Store decoder `src/store.rs:818-825`; `wallet-store-format-v1.md §2.2`
- 改善内容: Store を受け取る WASM API では、`Uint8Array::to_vec()` による Rust-side copy の前に 16 MiB 上限を検査し、超過入力を `InvalidStore` として拒否する。password、payload、Pending へ Store limit を拡張しない。
- 根拠: `wallet-store-format-v1.md §2.2` は allocation 開始前の raw Store limit 検査を要求する。Phase 2 で Store 入力に限定して採用した。
- 影響: 16 MiB を超える入力が Core decoder の拒否前に WASM memory へ追加確保され、allocation DoS の防御順序が Binding 境界で弱くなる。

## Resolved Findings

### IR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `Cargo.toml` の `bip39` zeroize feature、`src/crypto.rs` の Mnemonic / entropy / seed 処理
- 対応確認: Mnemonic、normalized buffer、entropy、seed の zeroize 所有期間と failure path に退行を確認しなかった。

### IR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `src/store.rs` の enum / fixed-field decoder と `tests/unit/store.rs`
- 対応確認: 未知 enum、既知値の固定パラメータ不一致、fixed field 不正を現行仕様どおり fatal `InvalidStore` とする実装・fixtureを確認した。

### IR-005

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `tests/unit/store.rs:701-823`
- 対応確認: ciphertext/tag 改変、AAD に含まれる registry key 改変、authenticated semantic mismatch、および export・公開情報取得・署名・全 mutation の失敗時 error / input Store 不変性を確認した。

### IR-008

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-002`
- 対象箇所: `src/store.rs` の fixed field parser、`tests/unit/store.rs`
- 対応確認: `duplicate_tag`、`private_key`、その他 fixed field の欠落・型・長さ不正を skip warning せず `InvalidStore` とする実装・テストを維持している。

### IR-009

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-004`
- 対象箇所: `src/store.rs:256-264`; `tests/unit/store.rs`
- 対応確認: authenticated Pending の Profile ID 衝突を `PendingProfileInvalid` とし、input Store を変更しない回帰テストを確認した。

### IR-010

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-006`
- 対象箇所: `src/crypto.rs:42-62`; `tests/unit/crypto.rs` の random failure fixture
- 対応確認: `random_with` が乱数源 failure 時にも output owner を zeroize し、`random_source_failure_uses_zeroizing_output_owner` が回帰を検出することを確認した。

## Deferred Findings

なし

## Specification Conformance

- 適合している要件: Core の BIP39 24 words、Symbol / NEM HD 導出、Mainnet / Testnet、Argon2id / AES-256-GCM、deterministic CBOR、AAD、unknown field 保持、認証後意味検証、atomic replacement、個別 export、Native / WASM の raw byte 境界、主要 C ABI ownership。`requirements.md FR-001〜FR-023` の主要経路を確認した。
- 不適合の要件: `specification.md §12.1–§12.2` の scalar / malformed-payload secret temporary zeroize（IR-001、IR-003）、WASM の strict numeric input validation（IR-011）、Native output ownership（IR-012）。
- 実装されていない要件: なし。IR-006 / IR-007 は実装欠落ではなく、既存仕様を独立検出するテスト証拠の不足として記録する。
- 仕様が曖昧で判定できない要件: なし

## Test Evaluation

- 十分に検証されている範囲: `cargo test --workspace --all-features` の Core 40 tests、Core integration 5 tests、Native API 2 tests、doc-test、Symbol / NEM key・address・signature fixture、HD fixture、CBOR / Store / AAD / semantic mismatch / atomicity。`cargo check --target wasm32-unknown-unknown --features wasm`、C header compile、通常の `run_c_abi_runtime.sh` も成功した。
- カバレッジ: 今回は未計測。CI には line 90%、function 90% の fail-under 基準と branch 85% の informational 基準がある。
- 不足しているテスト: IR-006 の未実行 WASM / C ABI API・ownership・failure parity、IR-007 の public Generated failure injection。IR-011 の WASM numeric boundary、IR-012 の valid aliased output、IR-013 / IR-014 の境界回帰も追加確認が必要である。
- fixture または期待値の問題: 既存 fixture の不一致は確認していない。
- 実行されていない検証: `wasm-bindgen-test` runtime test、C ABI sanitizer mode、coverage、Miri、forced u64 / u32 backend の独立検証、`bash scripts/check-curve25519-dalek-patch.sh`。最後の script は crates.io archive 取得時の HTTP 403 で実行継続できなかった。

実行結果:

- `cargo fmt --all -- --check`: 成功
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`: 終了コード0。vendored SIMD code から不要な `unsafe` warning 27件を出力
- `cargo test --workspace --all-features`: 成功（Core 40、integration 5、Native 2、doc-test 0）
- `cargo check --target wasm32-unknown-unknown --features wasm`: 成功
- `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c`: 成功
- `bash bindings/native/tests/run_c_abi_runtime.sh`: 成功。debug static library を使用する通常経路
- `git diff --check`: 成功
- `bash scripts/check-curve25519-dalek-patch.sh`: 未完了。外部 archive request が HTTP 403

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | IR-001、IR-003、IR-011、IR-012 を Required Changes として記録。Critical なしのためゲート規則上は合格。 |
| セキュリティ | 合格 | Major の secret temporary / ownership 欠陥は残るが、Critical な認証破壊、秘密情報の意図しない返却、鍵生成の破壊は確認なし。 |
| 相互運用性とプロトコル | 合格 | Symbol / NEM、Mainnet / Testnet、HD、署名、address、CBOR / AAD の既存 fixture は成功。IR-011 は Binding numeric validation の Major として記録。 |
| 処理と異常系 | 合格 | malformed Store、認証、semantic mismatch、Pending、主要 atomicity は確認済み。IR-003、IR-011、IR-012 は修正対象として記録。 |
| テスト十分性 | 合格 | Core / Native の主要 test suite は成功。IR-006、IR-007 および IR-011〜IR-014 で具体的な未検証経路を記録。 |
| 変更範囲内の品質 | 合格 | fmt、clippy、workspace test、WASM check、C header compile、C ABI runtime、diff check が成功。 |

## Remaining Risks

- IR-001 が解消されるまで、署名および公開鍵生成の scalar conversion / reduction temporary の zeroize 保証が不完全である。
- IR-003 が解消されるまで、authenticated malformed payload の early-return private key copy が残る。
- IR-011 / IR-012 が解消されるまで、WASM の無効 numeric input と Native prepare output alias がそれぞれ別の有効値・破損 output として扱われる可能性がある。
- IR-006 / IR-007、WASM runtime、sanitizer、coverage、forced backend 検証は未完了である。
- local curve25519 patch の upstream provenance / allowed-diff 検査は HTTP 403 のため未確認である。

## Final Decision

公開可能。Critical 指摘はなく、レビューゲートはすべて合格とした。
ただし IR-001、IR-003、IR-011、IR-012 は現在の対象範囲に関係する Major 指摘であり、修正後に再レビューすることを推奨する。

# Implementation Review Findings

## Review Target

- 対象: 現行作業ツリー HEAD `e4aac50a5f88a7e3cf4a13d1c535f20e795a621f` の `bindings/`、`src/`、`third_party/` と関連テスト・fixture
- 確認日: 2026-08-22 13:48 +0900
- レビュー範囲: Rust Core、WASM binding、Native C ABIと公開ヘッダー、`curve25519-dalek` ローカル修正版、対象テスト・fixture、承認済み要件・仕様・設計判断および既存実装レビュー
- 未確認範囲: sanitizer、Miri、branch coverage、vendored crate単独テスト、全backend・全最適化構成の独立zeroize検証
- 成果物: `docs/reviews/implementation/implement-review-006.md`

## Execution Audit

- 実行モード: `spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A 識別子: `01a027ae-a8b5-7af2-9ec0-322afdddbdff`
- Reviewer B 識別子: `01a027ae-c47d-7e00-be83-6e5bfddcb91d`
- Reviewer C 識別子: `01a027ae-dce2-7ae0-bfac-ba7289bfea47`
- Reviewer D 識別子: `01a027ae-f478-7ab0-95f9-e9e17dd9aa52`
- 起動再試行: なし
- Phase 1: 完了。4名すべてを個別 `wait_agent` で確認
- Phase 2: 完了。4名へ個別 follow-up (`multi_agent_v1__send_input`) を送信し、4名すべてを個別 `wait_agent` で確認
- Chair 統合: 完了

4つの識別子は相互に異なる。レビュー中、実装、仕様書、fixtureおよびテストは変更していない。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `src/crypto.rs:42-48,211-243,327-343`、`src/store.rs:256-264,702-706`、`src/wasm.rs`、`bindings/native/src/lib.rs`、`bindings/native/include/symbol_nem_wallet_core.h` | 乱数失敗経路、secret scalar生成・公開鍵・署名、Store状態遷移、Binding DTO・所有権を確認 |
| 実装コードまたは差分 | `third_party/curve25519-dalek-4.1.3/src/scalar.rs:279-294,597-602,1164-1174`、`backend/serial/u64/scalar.rs:22-37,88-114,211-224,254-287`、`backend/serial/u32/scalar.rs:21-37,89-126,217-274` | local patchのzeroize適用範囲とsecret scalar conversion/reductionのtemporaryを確認 |
| テストまたは fixture | `tests/unit/crypto.rs`、`tests/unit/store.rs`、`tests/unit/wasm.rs`、`tests/core.rs`、`bindings/native/tests/api.rs`、`bindings/native/tests/caller_runtime.c` | 暗号・Store・Native/WASM・C ABIの検証範囲と残存する未検証経路を確認 |
| 承認済み仕様 | `docs/requirements/requirements.md`、`docs/specifications/specification.md` §4、§5、§8、§9、§10、§12、§13、§14、`docs/specifications/wallet-store-format-v1.md` §12、§14.1 | zeroize、CSPRNG、Store順序、重複、Binding境界、fixtureおよび異常系を照合 |
| 設計判断・過去レビュー | `docs/decisions/binding-implementation.md`、`docs/decisions/curve25519-dalek-local-patch.md`、`third_party/curve25519-dalek-4.1.3/PATCHES.md`、`implement-review-001`〜`005` | Binding方式、local patchの意図、既存指摘の同一性・解消状態を確認 |
| 技術資料 | `getrandom 0.3.4` local source `src/lib.rs:66-84`、backend `linux_raw.rs:121-133`、`getentropy.rs:19-25` | `fill` が失敗時にもdestを初期化済みのまま保持し得る契約を確認 |

## Review Result

公開可能

## Summary

現行実装は、Symbol/NEMの主要fixture、Store/AAD、Native/WASM境界、C ABI実ランタイムおよびWASM実ランタイムで大きな相互運用性不具合を示さなかった。
ただし、既存 `IR-001` はlocal patchでradix表現が保護された後も、secret scalarのbackend conversion/reductionにsource-levelの未zeroize temporaryが残るため再オープンとした。
また、CSPRNG失敗時の出力バッファがplain arrayのまま破棄される具体的なzeroize欠陥を `IR-010` として採用した。
`IR-005`〜`IR-007` は、仕様が要求するtag/AAD改変、Binding境界、Generated失敗経路の検証証拠不足として継続する。
Critical指摘はなく、ゲート規則に従い判定は「公開可能」とするが、Major指摘は修正後の再確認を推奨する。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | Reopened | implement-review-001 | radix temporaryは改善されたが、`from_bytes_mod_order[_wide]` のbackend scalar temporaryにzeroize/drop保証がない。 |
| IR-002 | Major | Resolved | implement-review-001 | Mnemonic、entropy、seedのzeroize経路に退行なし。 |
| IR-003 | Major | Resolved | implement-review-001 | 復号plaintext、CBOR、payloadおよびprivate key中間値のzeroize経路に退行なし。 |
| IR-004 | Minor | Resolved | implement-review-001 | 未知enumを現行仕様どおりfatal `InvalidStore`として扱う。 |
| IR-005 | Minor | Open | implement-review-001 | tag/AAD改変と一部mutation失敗時atomicityの独立fixtureが未確認。 |
| IR-006 | Minor | Open | implement-review-001 | WASM/Native主要APIのparity、失敗時出力および全C ABI ownership経路の証拠が一部不足。 |
| IR-007 | Minor | Open | implement-review-001 | 公開Generated failure/atomicity経路などの検証が未完了。HD/manifest fixtureは大部分を確認。 |
| IR-008 | Minor | Resolved | implement-review-002 | fixed field不正をfatal `InvalidStore`として拒否する実装とテストを維持。 |
| IR-009 | Minor | Resolved | implement-review-004 | authenticated PendingのProfile ID衝突を `PendingProfileInvalid` と分類する実装とテストを確認。 |
| IR-010 | Major | New | implement-review-006 | `random` のgetrandom失敗時にplain output bufferをzeroizeせず破棄する経路を確認。 |

## Required Changes

### IR-001

- Priority: Major
- Status: Reopened
- 対象箇所: `src/crypto.rs:211-214,222-243,327-343`、`third_party/curve25519-dalek-4.1.3/src/scalar.rs:292-294,1164-1174`、`backend/serial/u64/scalar.rs:88-114,211-224,254-287`、`backend/serial/u32/scalar.rs:89-126,217-274`
- 問題: `Scalar::from_bytes_mod_order[_wide]` から使われる `Scalar52` / `Scalar29` の `words`、`lo`、`hi`、`limbs`、`[u128; 9]` 等がplain localとして生成される。これらはsecret scalarから直接計算されるが、`Zeroize`実装がある型もDrop時自動消去されず、現在のlocal patchはradix配列経路だけを保護している。
- 根拠: 実装コード、承認済み仕様 `specification.md` §12.1-§12.2、`DEC-CRYPTO-001` および `PATCHES.md`
- 発生条件: 公開鍵生成またはSymbol/NEM署名でsecret scalarの生成・reduction・basepoint multiplicationを実行する。
- 影響: secret scalar由来のsource-level temporaryが処理後メモリに残存する可能性があり、仕様のsigning temporary zeroize保証を満たす根拠が不足する。
- 修正内容: 実際に使用されるscalar conversion/reduction経路のsecret temporaryについて、正常・失敗・unwind経路を含むzeroizeまたは同等のdrop保証を確立する。既存の公開鍵・署名bytes互換性は維持する。
- 修正完了条件: 現行Coreの公開鍵・署名呼出し経路で生成されるsecret scalar中間値に未管理のsource-level temporaryが残らず、使用するbackend構成でその保証を根拠付きで確認できる。
- 追加テスト: 既存のSymbol/NEM公開鍵・署名fixtureを維持し、修正対象backendのzeroize経路を確認できる検証を追加する。

### IR-010

- Priority: Major
- Status: New
- 対象箇所: `src/crypto.rs:42-48`
- 問題: `random` は `[u8; N]` のplain bufferへ `getrandom::fill` を行い、失敗時に `?` で戻る。`getrandom 0.3.4` は失敗時にもdestをde-initializeしないが、部分書込み後の内容を消去する契約ではないため、乱数値を含み得るbufferがzeroizeされず破棄される。
- 根拠: 実装コード、`getrandom 0.3.4` `src/lib.rs:66-84`、対象backend `linux_raw.rs:121-133` および `getentropy.rs:19-25`、承認済み仕様 `specification.md` §4.1、§5.2、§6.2、§12.1
- 発生条件: entropy、Generated private-key候補、registry key、saltまたはnonceの乱数取得中に乱数源が部分書込み後に失敗する。
- 影響: 乱数源失敗時にsecretまたはsecret材料を含む一時bufferが処理後メモリへ残る可能性がある。外部error codeの `RandomSourceFailure` 分類自体は適合している。
- 修正内容: 乱数出力bufferを失敗経路でもzeroizeする所有型で保持するか、失敗分岐で全体を明示的にzeroizeする。
- 修正完了条件: 成功・乱数源失敗・panic/unwindの各終了経路で、`random` が所有する出力bufferをzeroize対象として確認でき、既存のCSPRNGと `RandomSourceFailure` 契約を維持する。
- 追加テスト: 乱数源失敗を注入できるテストで、error分類、既存Store不変、replacement Store非返却および失敗bufferのzeroize経路を確認する。

## Optional Improvements

### IR-005

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/store.rs` の改ざん・semantic mismatch・mutation failureテスト
- 改善内容: 仕様 §14.2 のauthentication tag 1-bit改変、AAD 1-bit改変および未確認の公開mutation失敗経路について、正確なerror、秘密結果・replacement Store非返却、input Store不変を独立fixtureで確認する。既に確認済みのciphertext、registry key、意味的不一致および一部atomicityテストは重複実装しない。
- 根拠: 承認済み仕様 `specification.md` §14.2、`wallet-store-format-v1.md` §12、既存 `IR-005`
- 影響: GCM tag/AAD受渡しや認証後意味検証の退行を、現在のテストだけでは独立検出できない。

### IR-006

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/wasm.rs`、`bindings/native/tests/api.rs`、`bindings/native/tests/caller_runtime.c`
- 改善内容: 主要WASM APIの未実行DTO/error/result変換、Nativeの未実行出力カテゴリ・free経路・失敗経路を、同一Core fixtureと照合する。現在追加されたC ABI実ランタイムの成功・失敗出力保持テストは維持する。
- 根拠: 承認済み仕様 `specification.md` §9、§13、§14.2、`docs/decisions/binding-implementation.md`、既存 `IR-006`
- 影響: Core単体テストと代表的Bindingテストが成功しても、Binding固有のDTO、error mapping、ownershipの退行を一部検出できない。

### IR-007

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/crypto.rs`、`tests/unit/store.rs`、`tests/core.rs`
- 改善内容: 現在残る、公開 `generate_software_key` の乱数候補不正・乱数源失敗・保存失敗におけるerror伝播とatomicityを、test-only注入で公開mutation全体から確認する。HD中間値とmanifest fixtureは現HEADで確認できた範囲を維持する。
- 根拠: 承認済み仕様 `specification.md` §14.1-§14.2、要件 `requirements.md` AC-005、既存 `IR-007`
- 影響: helper単体の乱数テストと公開成功テストだけでは、公開APIの失敗分類、input Store不変およびreplacement Store非返却の退行を検出できない。

## Resolved Findings

### IR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `Cargo.toml`、`src/crypto.rs`、`src/store.rs`
- 対応確認: BIP39のzeroize feature、Mnemonic/entropy/seedの所有期間および失敗時消去経路に退行を確認しなかった。

### IR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `src/cbor.rs`、`src/store.rs`
- 対応確認: 復号plaintext、CBOR `Value`、payload、Software Key秘密値および暗号中間値のzeroize/drop経路に退行を確認しなかった。

### IR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `src/store.rs`、`tests/unit/store.rs`
- 対応確認: 現行仕様どおり未知enumをfatal `InvalidStore`として拒否する実装と回帰テストを確認した。

### IR-008

- Priority: Minor
- Status: Resolved
- 初出レビュー: implement-review-002
- 対象箇所: `src/store.rs`、`tests/unit/store.rs`
- 対応確認: fixed field不正をwarningでskipせずfatal `InvalidStore`として拒否する実装と回帰テストを確認した。

### IR-009

- Priority: Minor
- Status: Resolved
- 初出レビュー: implement-review-004
- 対象箇所: `src/store.rs:256-264`、`tests/unit/store.rs`
- 対応確認: 認証済みPendingのProfile ID衝突を `PendingProfileInvalid` として拒否し、input Storeを変更しない回帰テストを確認した。

## Deferred Findings

なし

## Specification Conformance

- 適合している要件: BIP39 English 24 words、Symbol/NEM HD導出、Mainnet/Testnet、NEM private key byte order、Argon2id/AES-256-GCM、deterministic CBOR、AAD、unknown field保持、Store認証順序、atomic replacement、Native/WASM binary境界、C ABI ownershipの主要契約。`requirements.md` FR-001〜FR-023およびNFR-001〜NFR-004に対応する主要経路を確認。
- 不適合の要件: `specification.md` §12.1のsigning temporary zeroize保証（IR-001）、CSPRNG失敗時のsecret temporary zeroize保証（IR-010）。
- 実装されていない要件: なし。仕様が要求する追加検証証拠の不足はIR-005〜IR-007で管理する。
- 仕様が曖昧で判定できない要件: `change_profile_password` で不正なnew passwordと不正Store・対象不存在・current password不一致が同時に発生した場合のerror precedence、Native成功呼出しで既存out bufferを再利用する場合のcaller/binding責任。これらは今回のコード欠陥として採用しない。

## Test Evaluation

- 十分に検証されている範囲: Core unit 33件、Core integration 5件、Native API 2件、WASM runtime 1件が成功。Symbol/NEM暗号・HD・署名 fixture、CBOR/Store/AAD、unknown field、semantic mismatch、Profile/Software Key lifecycle、Native/C ABIおよびWASMの代表的境界を確認した。
- カバレッジ: `.github/workflows/coverage.yml` の基準は行90%、関数90%、分岐85%（branchはinformational）。現行 `cargo llvm-cov` は行 `1725/1806 = 95.51%`、関数 `187/207 = 90.34%`、region `2668/2931 = 91.03%`。`cargo llvm-cov report --fail-under-lines 90 --fail-under-functions 90` は成功。branchは今回未計測。
- 不足しているテスト: IR-005のtag/AAD独立改変、IR-006の未実行Binding API・ownership経路、IR-007の公開Generated failure/atomicity注入。
- fixture または期待値の問題: 既存fixtureの不一致は確認していない。
- 実行されていない検証: sanitizer、Miri、branch coverage、vendored `curve25519-dalek` crate単独テスト、全backend・全最適化構成の独立zeroize検証。

実行結果:

- `python3 scripts/check-invisible-characters.py`: 成功
- `cargo fmt --all -- --check`: 成功
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`: 終了コード0（vendored SIMDコードから不要な`unsafe`警告あり）
- `cargo test --workspace --all-features`: 成功（33 unit、5 core integration、2 native API）
- `CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUNNER=wasm-bindgen-test-runner cargo test --target wasm32-unknown-unknown --features wasm --locked --lib`: 成功（1 runtime test）
- `cargo check --target wasm32-unknown-unknown --features wasm`: 成功
- `cargo build --package symbol-nem-wallet-core-native --release --locked`: 成功
- `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c`: 成功
- `bindings/native/tests/run_c_abi_runtime.sh`: 成功
- `cargo llvm-cov --package symbol-nem-wallet-core --all-features --locked --json`: 成功
- `cargo llvm-cov report --package symbol-nem-wallet-core --fail-under-lines 90 --fail-under-functions 90`: 成功（行95.51%、関数90.34%）
- `git diff --check`: 成功

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | IR-001/IR-010はMajorとしてRequired Changesへ記録。Criticalなしのためゲート規則上は合格。 |
| セキュリティ | 合格 | IR-001/IR-010は具体的なMajorとして継続するが、Criticalな認証破壊・秘密返却・鍵生成欠陥は確認なし。 |
| 相互運用性とプロトコル | 合格 | Symbol/NEM、Mainnet/Testnet、HD、署名、address、CBOR/AAD、Native/WASM/C ABIの代表fixtureと実ランタイムが一致。 |
| 処理と異常系 | 合格 | malformed Store、認証・意味検証、atomicity、Pending collisionおよび主要error分類を確認。残存検証不足はIR-005〜IR-007。 |
| テスト十分性 | 合格 | CIの行・関数coverage閾値と主要実ランタイム検証は成功。具体的な不足はIR-005〜IR-007に限定。 |
| 変更範囲内の品質 | 合格 | fmt、clippy、workspace test、WASM check/runtime、Native build、C header/runtime、diff checkが成功。 |

## Remaining Risks

- IR-001が解消されるまで、secret scalarのbackend conversion/reduction temporaryが処理後メモリに残存する可能性がある。
- IR-010が解消されるまで、CSPRNG失敗時の部分書込み乱数bufferがzeroizeされない可能性がある。
- IR-005〜IR-007により、tag/AAD改変、未実行Binding所有権経路、公開Generated failure/atomicityの自動検出範囲が限定される。
- branch coverage、sanitizer、Miri、vendored crate単独テストおよび全backend・全最適化構成の独立zeroize検証は未実行である。
- error precedenceとNative successful out-buffer reuseは仕様上の未決定事項として残る。

## Final Decision

公開可能。Critical指摘はなく、品質ゲートはすべて合格とした。
ただし、IR-001とIR-010のMajor指摘は秘密temporaryのzeroize保証に直接関係するため、修正後に再レビューすることを推奨する。IR-005〜IR-007はMinorの検証証拠不足として継続管理する。

# Implementation Review Findings

## Review Target

- 対象: 現行作業ツリー HEAD `b307ade2fd379f830ae105a7f4f7cd5ac9dce60d` の `src/` および `bindings/`
- 確認日: 2026-08-22 10:16 +0900
- レビュー範囲: Rust Core、WASM binding、Native C ABIと公開ヘッダー、`tests/`、`bindings/native/tests/`、関連する承認済み要件・仕様・設計判断および既存実装レビュー
- 未確認範囲: sanitizer、Miri、分岐カバレッジ、外部 SDK を実行する全組合せ round-trip、実Cプログラムをリンク・実行するABI検証、乱数源・ID衝突・serialization failureの実注入
- 成果物: `docs/reviews/implementation/implement-review-004.md`

## Execution Audit

- 実行モード: `spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A 識別子: `/root/reviewer_a_spec`
- Reviewer B 識別子: `/root/reviewer_b_security`
- Reviewer C 識別子: `/root/reviewer_c_interop`
- Reviewer D 識別子: `/root/reviewer_d_quality`
- 起動再試行: なし
- Phase 1: 完了。`wait_agent` で4名すべてのメモ返却を確認
- Phase 2: 完了。Phase 1の全候補を同じ4名へ `followup_task` で個別送信し、`wait_agent` で4名すべての評価返却を確認
- Chair 統合: 完了

4つの識別子は相互に異なる。レビュー対象の実装、仕様書、fixtureおよびテストは変更していない。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `src/*.rs`、`bindings/native/src/lib.rs`、`bindings/native/include/symbol_nem_wallet_core.h`、前回対象 `8d962ef` から HEAD までの対象差分 | Core、署名temporary、Store状態遷移、WASMおよびNative境界を確認 |
| テストまたは fixture | `tests/core.rs`、`tests/unit/*.rs`、`bindings/native/tests/api.rs`、`bindings/native/tests/header_compile.c` | Core、Store、暗号fixture、Binding parity、異常系および所有権の検証範囲を確認 |
| 承認済み仕様 | `docs/requirements/requirements.md`、`docs/specifications/specification.md`、`docs/specifications/wallet-store-format-v1.md` | 公開API、識別子、暗号、Store、error、atomicity、Bindingおよびテスト要件との適合を確認 |
| 技術資料 | `docs/decisions/*.md`、`docs/reviews/implementation/implement-review-001.md`〜`003.md`、`curve25519-dalek 4.1.3` の `scalar.rs`、`edwards.rs`、`macros.rs` | 承認済み判断、過去指摘の状態、`Scalar`のCopy特性とowned乗算時のコピー経路を確認 |

## Review Result

公開可能

## Summary

現行実装では、前回 IR-001 の署名response算術が固定長のzeroize対象byte演算へ置換され、両Chainの署名fixtureも維持された。
ただし、署名および公開鍵計算にowned `Scalar`を渡すpoint乗算が残り、秘密Scalarコピーの消去保証は未解消であるため、IR-001を継続する。
Store、暗号、Native/WASMの主要経路に新たなCritical欠陥は確認しなかった。
一方、生成ProfileのID衝突時に正常な入力Storeを`InvalidStore`と分類するIR-009を新規採用した。
IR-005〜IR-007の仕様上必須な異常系、Binding parity、失敗注入・固定fixtureの不足も継続する。
Critical指摘はなく、規定に基づく品質ゲートはすべて合格し、公開可能と判定する。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | Reopened | implement-review-001 | response算術は改善したが、owned point乗算がsecret `Scalar`の未消去コピーを生成する経路が残る。 |
| IR-002 | Major | Resolved | implement-review-001 | Mnemonic、entropy、seedのzeroize経路に退行なし。 |
| IR-003 | Major | Resolved | implement-review-001 | 復号plaintext、CBOR、payload、private key中間値のzeroize経路に退行なし。 |
| IR-004 | Minor | Resolved | implement-review-001 | 現行仕様どおり未知enumをfatal `InvalidStore`として扱う。 |
| IR-005 | Minor | Open | implement-review-001 | 認証後意味検証、index/payload対応、改ざん分類、mutation失敗時不変性の必須fixtureが一部不足する。 |
| IR-006 | Minor | Open | implement-review-001 | WASM runtimeとC header検査は追加されたが、主要APIのBinding parity・失敗時出力・C ABI実行時所有権の検証が一部不足する。 |
| IR-007 | Minor | Open | implement-review-001 | 4 Chain/Network fixtureは改善したが、仕様で固定する中間fixture、Generated失敗経路、乱数・ID衝突・保存失敗の検証が不足する。 |
| IR-008 | Minor | Resolved | implement-review-002 | fixed field不正をfatal `InvalidStore`として拒否する実装と回帰テストを維持する。 |
| IR-009 | Minor | New | implement-review-004 | 生成Pendingの`profile_id`衝突時、正常Storeを`InvalidStore`として扱う経路を確認した。 |

## Required Changes

### IR-001

- Priority: Major
- Status: Reopened
- 対象箇所: `src/crypto.rs:210`、`src/crypto.rs:317`、`curve25519-dalek 4.1.3/src/macros.rs:89-110`
- 問題: `ED25519_BASEPOINT_POINT * nonce`および`ED25519_BASEPOINT_POINT * scalar`はowned `Scalar`を乗算へ渡す。依存ライブラリのowned `Mul`実装は引数をcallee内で借用する別のCopy値を生成し、その値にはdrop時zeroize保証がない。呼出元の`nonce`または`scalar`を後で明示消去しても、このコピーの消去は保証されない。
- 根拠: 承認済み仕様 `docs/specifications/specification.md` §12.1、実装 `src/crypto.rs:198-242,305-319`、技術資料 `curve25519-dalek 4.1.3/src/scalar.rs:192-195`、`src/edwards.rs:717-728`、`src/macros.rs:89-110`。
- 発生条件: SymbolまたはNEMの署名処理、または秘密鍵から公開鍵を計算する処理を実行する。
- 影響: private key由来のsecret `Scalar`コピーが処理後のメモリに残存する可能性があり、仕様§12.1のsigning temporary消去および秘密情報コピーの限定を満たすことを確認できない。
- 修正内容: アプリケーションコードが生成するsecret `Scalar`のby-valueコピーを残さず、秘密Scalar中間値が正常・失敗の各終了経路で消去される保証を成立させる。
- 修正完了条件: 署名・公開鍵計算でアプリケーションが生成するsecret `Scalar`の未管理コピーがなく、元の変数と内部byte表現の消去経路を根拠付きで確認できる。
- 追加テスト: 既存のSymbol/NEM署名・公開鍵fixtureを維持し、修正による出力互換性の退行がないことを確認する。

## Optional Improvements

### IR-005

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/store.rs:245-355`、`tests/unit/store.rs:605-636`、`tests/core.rs`
- 改善内容: 仕様§14.2で明示された未検証範囲に限定し、tag/AAD改変、認証済み`software_key_index`とpayloadの写像不一致、`duplicate_tag`意味的不一致、および代表的mutation失敗時について、規定error、秘密結果・replacement Store非返却、input Store不変性を独立fixtureで検証する。
- 根拠: `docs/specifications/specification.md` §11、§14.2、`docs/specifications/wallet-store-format-v1.md` §7.1、§11、§12。
- 影響: 認証後の意味検証、異常入力分類およびatomicityの仕様違反が自動テストを通過する可能性がある。

### IR-006

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/wasm.rs:31-153`、`bindings/native/tests/api.rs:38-289`、`bindings/native/tests/header_compile.c`
- 改善内容: v1公開契約の主要API、Chain依存処理、主要error/warning、失敗時出力、secret byte境界および返却buffer/free対応を、Native/WASMで同じCore fixtureへ照合する。C ABIは公開ヘッダーの構文だけでなく、代表的なC callerからの実行・所有権境界も確認する。
- 根拠: `docs/specifications/specification.md` §9、§13、§14.2、`docs/decisions/binding-implementation.md`。
- 影響: Core単体テストでは検出できないBinding固有のDTO・error mapping・所有権退行を検出する証拠が限定される。

### IR-007

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/crypto.rs:89-229`、`tests/unit/store.rs:605-636`、`tests/core.rs`、`src/crypto.rs:43-55,181-188`、`src/store.rs:570-607,1407-1428`
- 改善内容: 仕様§14.1で明示された各hardened childのprivate key/chain code、NEMを含む最終node、および空・複数indexのdeterministic manifest bytesを固定fixtureで照合する。仕様§14.2で明示されたGeneratedの乱数・妥当性・保存失敗、ID衝突および失敗時atomicityを独立検証する。
- 根拠: `docs/specifications/specification.md` §3、§4.2、§11、§14.1-§14.2。
- 影響: HD中間導出、決定的Store表現、Generated lifecycleおよび失敗時一意性・atomicityの退行検出が限定される。

### IR-009

- Priority: Minor
- Status: New
- 対象箇所: `src/store.rs:187-192`、`src/store.rs:256-262`
- 改善内容: 生成Pendingの`profile_id`が対象Storeの既存IDと衝突した場合もID一意性を維持し、正常な入力Storeを`InvalidStore`として分類しない。
- 根拠: 承認済み仕様 `docs/specifications/specification.md` §3.1、§8.1、§10。`prepare_generated_profile`は既存IDを確認せず1回だけ生成し、`finalize_generated_profile`は衝突を`InvalidStore`とする。
- 影響: 極小確率ながらCore自身が確定不能なPendingを返し、正常Storeに対するfinalizeが不正なerror分類で失敗する。

## Resolved Findings

### IR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `Cargo.toml`、`src/crypto.rs`、`src/store.rs`
- 対応確認: `bip39`のzeroize featureとMnemonic、entropy、seedの所有・消去経路を確認し、現HEADで退行を確認しなかった。

### IR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `src/cbor.rs`、`src/store.rs`
- 対応確認: 復号plaintext、CBOR `Value`、payload、Software Key秘密値および暗号化中間値のDrop/`Zeroizing`経路を確認した。

### IR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `src/store.rs`、`tests/unit/store.rs:272-323`
- 対応確認: 現行仕様どおり未知enumをProfile skipやwarningにせずfatal `InvalidStore`として拒否する。

### IR-008

- Priority: Minor
- Status: Resolved
- 初出レビュー: implement-review-002
- 対象箇所: `src/store.rs`、`tests/unit/store.rs:272-323`
- 対応確認: `duplicate_tag`、`private_key`その他のfixed field不正をfatal `InvalidStore`として拒否する実装と回帰テストを維持する。

### SR-010 / SR-014

- Priority: Minor / Major
- Status: Resolved
- 初出レビュー: 過去仕様レビューおよびimplement-review-001
- 対象箇所: `docs/specifications/specification.md` §5.3、§6.4、§8.4、`docs/specifications/wallet-store-format-v1.md` §9
- 対応確認: v1でpassword recovery/resetを提供しないこと、およびSoftware Key重複を同一Profile・同一Chainで判定して異なるChainの同一raw keyを許可することが、現行要件・仕様で明示されている。

## Deferred Findings

なし。

## Specification Conformance

- 適合している要件: BIP39 English 24 words、Symbol/NEM HD導出、Mainnet/Testnet、NEM private key byte order、Argon2id/AES-256-GCM、deterministic CBOR、AAD、unknown field保持、Store認証順序、atomic replacement、Native/WASMのbinary境界と主要DTO。
- 不適合の要件: `specification.md` §12.1のsecret temporary消去保証（IR-001）、§8.1・§10のPending作成条件とerror分類（IR-009）。
- 実装されていない要件: なし。仕様が明示する検証証拠の不足はIR-005〜IR-007で管理する。
- 仕様が曖昧で判定できない要件: CBOR parserのnesting・collection資源上限は外部契約として規定されておらず、現実装の固定上限の適否は判定対象外とした。

## Test Evaluation

- 十分に検証されている範囲: Core unit 21件、Core integration 3件、Native API 1件、WASM runtime 1件が成功。代表的Symbol/NEM暗号・HD fixture、CBOR決定性・資源拒否、Store malformed/unknown field/AAD、Profile/Software Key lifecycle、Native/WASMの代表parityを確認した。
- カバレッジ: Coreは行88.33%（1589/1799）、関数71.84%（148/206）。リポジトリの行・関数90%目標を下回り、CIと同じ閾値確認は終了コード1。分岐は未計測。数値単独の指摘にはせず、仕様上重要な未カバー経路をIR-005〜IR-007へ記録した。
- 不足しているテスト: IR-005〜IR-007の認証後意味検証、異常系atomicity、Binding parity/ownership、HD中間・manifest fixture、Generated・乱数・ID衝突・保存失敗。
- fixture または期待値の問題: 既存fixtureの不一致は確認していない。仕様§14.1が要求する一部の中間・manifest固定値は未実装（IR-007）。
- 実行されていない検証: sanitizer、Miri、分岐カバレッジ、外部SDK全組合せround-trip、実C caller runtime、乱数・ID衝突・serialization failure injection。

実行結果:

- `python3 scripts/check-invisible-characters.py`: 成功
- `cargo fmt --all -- --check`: 成功
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`: 成功
- `cargo test --workspace --all-features`: 成功
- `cargo test --target wasm32-unknown-unknown --features wasm --locked --lib`（`wasm-bindgen-test-runner`）: 成功
- `cargo check --target wasm32-unknown-unknown --features wasm`: 成功
- `cargo build --package symbol-nem-wallet-core-native --release --locked`: 成功
- `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c`: 成功
- `cargo llvm-cov --package symbol-nem-wallet-core --all-features --locked --json`: 成功
- `cargo llvm-cov report --package symbol-nem-wallet-core --fail-under-lines 90 --fail-under-functions 90`: 失敗（行88.33%、関数71.84%）
- `git diff --check`: 成功

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | IR-001とIR-009を記録したがCriticalなし。Major/Minorだけでは不合格にしない規則を適用。 |
| セキュリティ | 合格 | IR-001をMajorとして継続。暗号方式、認証、秘密情報返却境界にCriticalな欠陥は確認なし。 |
| 相互運用性とプロトコル | 合格 | 代表Symbol/NEM・Mainnet/Testnet・CBOR・AAD・Binding fixtureは一致。未固定fixtureはIR-007。 |
| 処理と異常系 | 合格 | 主要なStore拒否・認証・atomicityを確認。未検証分岐はIR-005、ID衝突分類はIR-009。Criticalなし。 |
| テスト十分性 | 合格 | 必須検証は実行成功。coverage目標未達と具体的不足をIR-005〜IR-007へ記録したが、Criticalな未検証事項はない。 |
| 変更範囲内の品質 | 合格 | fmt、clippy、workspace test、WASM runtime/check、Native build、C header検査に成功し、新規Critical欠陥なし。 |

## Remaining Risks

- IR-001が解消されるまで、秘密Scalarのby-valueコピーが処理後のメモリに残存する可能性がある。
- IR-005〜IR-007により、認証後意味検証、異常系atomicity、Binding境界、Generated失敗経路および一部の外部互換fixtureの実行証拠が限定される。
- IR-009により、Profile ID衝突時に正常Storeが誤分類される経路が残る。
- Core coverageはCI目標を下回り、現HEADのcoverage閾値確認は失敗する。
- CBOR parserの資源上限は仕様上の外部契約として未決定である。

## Final Decision

公開可能。新規Critical指摘はなく、IR-001をMajor、IR-005〜IR-007とIR-009をMinorとして継続管理する。
coverage閾値確認は失敗するが、数値単独では品質ゲートを不合格にしない規則を適用し、未カバーの具体的影響を既存指摘と残存リスクへ記録した。

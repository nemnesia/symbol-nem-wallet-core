# Implementation Review Findings

## Review Target

- 対象: 現行作業ツリー HEAD `03df3b6b77b8535ee4fabaed237464fda966cb02` の `src/` および `bindings/`、ならびに関連する `tests/` と `bindings/native/tests/`
- 確認日: 2026-08-22 11:06 +0900
- レビュー範囲: Rust Core、WASM binding、Native C ABIと公開ヘッダー、対象差分、関連テスト・fixture、承認済み要件・仕様・設計判断および既存実装レビュー
- 未確認範囲: sanitizer、Miri、分岐カバレッジ、外部SDKを実行する全組合せround-trip、実C callerのリンク・実行時ABI検証、乱数・serialization failureの実注入
- 成果物: `docs/reviews/implementation/implement-review-005.md`

## Execution Audit

- 実行モード: `spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A 識別子: `/root/reviewer_a_spec_005`
- Reviewer B 識別子: `/root/reviewer_b_security_005`
- Reviewer C 識別子: `/root/reviewer_c_interop_005`
- Reviewer D 識別子: `/root/reviewer_d_quality_005`
- 起動再試行: なし
- Phase 1: 完了。`wait_agent` で4名すべてのメモ返却を確認
- Phase 2: 完了。Phase 1の全候補を同じ4名へ `followup_task` で個別送信し、`wait_agent` で4名すべての評価返却を確認
- Chair 統合: 完了

4つの識別子は相互に異なる。レビュー対象の実装、仕様書、fixtureおよびテストは変更していない。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `src/crypto.rs:192-225,300-315`、`src/store.rs:182-262`、`bindings/native/src/`、WASM binding、HEADとの差分 | 署名・公開鍵算術、Generated Profile ID、Store状態遷移、Native/WASM境界を確認 |
| テストまたは fixture | `tests/unit/crypto.rs`、`tests/unit/store.rs`、`tests/unit/wasm.rs`、`bindings/native/tests/api.rs`、`bindings/native/tests/header_compile.c` | 暗号・Store・AAD・ID衝突・Binding parity・ABI境界の検証範囲を確認 |
| 承認済み仕様 | `docs/requirements/requirements.md`、`docs/specifications/specification.md` §3、§8、§10、§12、§14、`docs/specifications/wallet-store-format-v1.md` | Error分類、秘密temporary、Store整合性、fixtureとBinding検証要件を照合 |
| 技術資料 | `curve25519-dalek 4.1.3` の `edwards.rs:1014-1024`、`scalar.rs:985-1016,1059-1115`、`docs/decisions/binding-implementation.md`、`implement-review-001`〜`004` | `mul_base`内部のsecret radix表現、Binding境界、過去指摘の状態を確認 |

## Review Result

公開可能

## Summary

現行実装は、署名・公開鍵計算のアプリケーション側でowned `Scalar`をpoint乗算へ渡さない形へ改善され、既存のSymbol/NEM出力fixtureを維持している。
Generated Profile IDはStore内の既存IDを確認して再試行するため、通常の生成経路における前回IR-009の衝突問題は改善された。
ただし、依存ライブラリの`mul_base`内部にはsecret scalarのradix表現が残り、消去保証を確認できないためIR-001を継続する。
認証済みPendingの防御的なProfile ID衝突はなお`InvalidStore`へ分類され、IR-009の残存経路となる。
IR-005〜IR-007の認証後意味検証、Binding parityおよび固定fixture・失敗注入の不足も継続する。
Critical指摘はなく、規定上Major/Minorは品質ゲートを不合格にしないため公開可能と判定する。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | Reopened | implement-review-001 | 呼出元のowned `Scalar`コピーは改善したが、`mul_base`内部のsecret radix配列表現にzeroize/Drop保証がない。 |
| IR-002 | Major | Resolved | implement-review-001 | Mnemonic、entropy、seedのzeroize経路に退行なし。 |
| IR-003 | Major | Resolved | implement-review-001 | 復号plaintext、CBOR、payload、private key中間値のzeroize経路に退行なし。 |
| IR-004 | Minor | Resolved | implement-review-001 | 未知enumをfatal `InvalidStore`として扱う現行仕様適合を維持。 |
| IR-005 | Minor | Open | implement-review-001 | 認証後意味検証、改ざん分類およびmutation失敗時不変性の独立fixtureが一部不足。 |
| IR-006 | Minor | Open | implement-review-001 | Native/WASM主要APIの独立fixture parity、失敗時出力およびC ABI実行時所有権の証拠が一部不足。 |
| IR-007 | Minor | Open | implement-review-001 | HD中間・manifest固定fixture、Generatedの公開失敗経路、乱数・保存失敗の検証が不足。 |
| IR-008 | Minor | Resolved | implement-review-002 | fixed field不正をfatal `InvalidStore`として拒否する実装と回帰テストを維持。 |
| IR-009 | Minor | Open | implement-review-004 | 通常生成経路は再試行で改善したが、初出から未解決の認証済みPendingの既存`profile_id`衝突は`InvalidStore`のまま。 |

## Required Changes

### IR-001

- Priority: Major
- Status: Reopened
- 対象箇所: `src/crypto.rs:205,313`、curve25519-dalek 4.1.3の`edwards.rs:1014-1024`、`scalar.rs:985-1016,1059-1115`
- 問題: `EdwardsPoint::mul_base(&nonce)`および`mul_base(&scalar)`は呼出元のowned `Scalar`コピーを避けるが、依存実装はsecret scalarをradix-2w表現（通常`[i8; 64]`）へ展開する。このtemporaryにzeroizeまたはdrop時消去の保証がない。
- 根拠: 承認済み仕様 `docs/specifications/specification.md` §12.1、§12.2、依存実装の`mul_base`・`as_radix_2w`経路。
- 発生条件: SymbolまたはNEMの署名処理、または秘密鍵から公開鍵を計算する処理を実行する。
- 影響: secret scalarの内部表現が処理後メモリに残存する可能性があり、秘密temporaryの消去保証を確認できない。
- 修正内容: secret scalarの内部temporaryが正常・失敗の各終了経路で消去されることを、使用する算術経路の実装または根拠で保証する。既存の公開鍵・署名出力互換性は維持する。
- 修正完了条件: 署名・公開鍵計算で生成されるsecret scalarおよびradix等の内部表現について、未管理の残存コピーがなく、消去経路を根拠付きで確認できる。
- 追加テスト: 既存のSymbol/NEM署名・公開鍵固定fixtureを維持し、成功・エラー経路の消去保証を検証できるテストまたは依存保証を追加する。

## Optional Improvements

### IR-005

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/store.rs` のAAD・semantic mismatch・mutationテスト、`tests/core.rs`
- 改善内容: 仕様§11、§14.2に明示されたtag/AAD改変、認証済み`software_key_index`とpayloadの写像不一致、`duplicate_tag`意味的不一致、および代表的なmutation失敗時について、規定error、秘密結果・replacement Store非返却、input Store不変性を独立fixtureで確認する。
- 根拠: `docs/specifications/specification.md` §11、§14.2、`docs/specifications/wallet-store-format-v1.md` §7.1、§11、§12。
- 影響: 認証後の意味検証や異常入力分類、atomicityの退行を自動検出できる範囲が限定される。

### IR-006

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/wasm.rs`、`bindings/native/tests/api.rs`、`bindings/native/tests/header_compile.c`
- 改善内容: 主要API、Symbol/NEM処理、主要error/warning、失敗時出力、secret byte境界および返却buffer/free対応を、独立した同一Core fixtureへNative/WASMから照合する。NEMについてもCore外部期待値を用い、C ABIは公開ヘッダー構文だけでなく代表的C callerの実行・所有権境界を確認する。
- 根拠: `docs/specifications/specification.md` §9、§13、§14.2、`docs/decisions/binding-implementation.md`。
- 影響: Core出力を同じ生成結果へ再照合するだけでは、Binding固有のDTO・error mapping・所有権退行を十分に検出できない。

### IR-007

- Priority: Minor
- Status: Open
- 対象箇所: `tests/unit/crypto.rs`、`tests/unit/store.rs` のmanifest・Generatedテスト、`tests/core.rs`
- 改善内容: 仕様§14.1で明示された各hardened childのprivate key/chain code、NEMを含む最終node、空・複数indexのdeterministic manifest bytesを固定fixtureで照合する。仕様§14.2のGenerated乱数・妥当性・保存失敗、公開API経由のID衝突および失敗時atomicityを独立検証する。
- 根拠: `docs/specifications/specification.md` §3、§4.2、§11、§14.1-§14.2。
- 影響: HD中間導出、deterministic Store表現、Generated lifecycleおよび失敗時一意性・atomicityの退行検出が限定される。

### IR-009

- Priority: Minor
- Status: Open
- 対象箇所: `src/store.rs:191`、`src/store.rs:256-262`
- 改善内容: 通常の`prepare_generated_profile`は既存Profile IDを避ける再試行で改善済みである。残る、認証済みPendingの`profile_id`が対象Storeの既存IDと衝突する経路では、正常なStoreを`InvalidStore`として分類しない。仕様上のPending不整合分類に従うか、対象条件の正式な決定を記録する。
- 根拠: `docs/specifications/specification.md` §8.1、§10。§8.1はPendingのProfile作成条件未達を`PendingProfileInvalid`として扱い、`InvalidStore`はStore自体の構造・意味的不正に限定している。
- 影響: 外部から認証済みopaque Pendingを受けた場合、正常Storeに対する誤ったerror分類が発生する。

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
- 対応確認: 復号plaintext、CBOR `Value`、payload、Software Key秘密値および暗号中間値のDrop/`Zeroizing`経路を確認した。

### IR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `src/store.rs`、`tests/unit/store.rs`
- 対応確認: 現行仕様どおり未知enumをProfile skipやwarningにせずfatal `InvalidStore`として拒否する。

### IR-008

- Priority: Minor
- Status: Resolved
- 初出レビュー: implement-review-002
- 対象箇所: `src/store.rs`、`tests/unit/store.rs`
- 対応確認: `duplicate_tag`、`private_key`その他のfixed field不正をfatal `InvalidStore`として拒否する実装と回帰テストを維持する。

### SR-010 / SR-014

- Priority: Minor / Major
- Status: Resolved
- 初出レビュー: 過去仕様レビューおよびimplement-review-001
- 対象箇所: `docs/specifications/specification.md` §5.3、§6.4、§8.4、`docs/specifications/wallet-store-format-v1.md` §9
- 対応確認: v1でpassword recovery/resetを提供しないこと、およびSoftware Key重複を同一Profile・同一Chainで判定することが現行要件・仕様で明示されている。

## Deferred Findings

なし。

## Specification Conformance

- 適合している要件: BIP39 English 24 words、Symbol/NEM HD導出、Mainnet/Testnet、NEM private key byte order、Argon2id/AES-256-GCM、deterministic CBOR、AAD、unknown field保持、Store認証順序、atomic replacement、Native/WASMのbinary境界と主要DTO。
- 不適合の要件: `specification.md` §12.1・§12.2のsecret temporary消去保証（IR-001）、§8.1・§10のPending Profile ID衝突時error分類（IR-009）。
- 実装されていない要件: なし。仕様が明示する検証証拠の不足はIR-005〜IR-007で管理する。
- 仕様が曖昧で判定できない要件: CBOR parserのnesting・collection資源上限、およびPending再利用時の細かなerror precedenceは外部契約として十分に固定されておらず、今回の正式指摘にはしなかった。

## Test Evaluation

- 十分に検証されている範囲: Core unit 25件、Core integration 3件、Native API 1件、WASM runtime 1件が成功。Symbol/NEM暗号・HD fixture、CBOR決定性・資源拒否、Store malformed/unknown field/AAD、Profile/Software Key lifecycle、代表的Native/WASM parityを確認した。
- カバレッジ: `cargo llvm-cov` JSONのCore合計は行1600/1801（88.84%）、関数149/206（72.33%）、region 2452/2927（83.77%）、分岐0（未計測）。`--fail-under-lines 90 --fail-under-functions 90`は終了コード1。requirements NFR-005は90%行・関数を目標（SHOULD）としており、数値単独の指摘にはせず、具体的な不足をIR-005〜IR-007へ記録した。
- 不足しているテスト: IR-005〜IR-007の認証後意味検証、異常系atomicity、独立NEM fixture、Binding parity/ownership、HD中間・manifest fixture、Generated公開APIのID衝突・保存失敗。
- fixture または期待値の問題: 既存fixtureの不一致は確認していない。仕様§14.1が要求する一部の中間・manifest固定値は未実装（IR-007）。
- 実行されていない検証: sanitizer、Miri、分岐カバレッジ、外部SDK全組合せround-trip、実C caller runtime、乱数・serialization failure injection。

実行結果:

- `python3 scripts/check-invisible-characters.py`: 成功
- `cargo fmt --all -- --check`: 成功
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`: 成功
- `cargo test --workspace --all-features`: 成功
- `CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUNNER=wasm-bindgen-test-runner cargo test --target wasm32-unknown-unknown --features wasm --locked --lib`: 成功
- `cargo check --target wasm32-unknown-unknown --features wasm`: 成功
- `cargo build --package symbol-nem-wallet-core-native --release --locked`: 成功
- `cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c`: 成功
- `cargo llvm-cov --package symbol-nem-wallet-core --all-features --locked --json`: 成功
- `cargo llvm-cov report --package symbol-nem-wallet-core --fail-under-lines 90 --fail-under-functions 90`: 失敗（行88.84%、関数72.33%）
- `git diff --check`: 成功

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | IR-001とIR-009を記録したがCriticalなし。Major/Minorだけでは不合格にしない規則を適用。 |
| セキュリティ | 合格 | IR-001をMajorとして継続。暗号方式、認証、秘密情報返却境界にCriticalな欠陥は確認なし。 |
| 相互運用性とプロトコル | 合格 | 代表Symbol/NEM・Mainnet/Testnet・CBOR・AAD・Binding fixtureは一致。独立fixture不足はIR-006/IR-007。 |
| 処理と異常系 | 合格 | 主要なStore拒否・認証・atomicityを確認。未検証分岐はIR-005、ID衝突分類はIR-009。Criticalなし。 |
| テスト十分性 | 合格 | 必須検証は実行成功。coverage目標未達と具体的不足をIR-005〜IR-007へ記録したが、Criticalな未検証事項はない。 |
| 変更範囲内の品質 | 合格 | fmt、clippy、workspace test、WASM runtime/check、Native build、C header検査に成功し、新規Critical欠陥なし。 |

## Remaining Risks

- IR-001が解消されるまで、secret scalarのradix表現が処理後のメモリに残存する可能性がある。
- IR-005〜IR-007により、認証後意味検証、異常系atomicity、独立Binding境界、Generated失敗経路および一部の外部互換fixtureの実行証拠が限定される。
- IR-009により、認証済みPendingのProfile ID衝突時に正常Storeが誤分類される経路が残る。
- Core coverageはCI目標を下回り、現HEADのcoverage閾値確認は失敗する。
- CBOR parserの資源上限とPending再利用時の細かなerror precedenceは、仕様上の未決定事項として残る。

## Final Decision

公開可能。新規Critical指摘はなく、IR-001をMajor、IR-005〜IR-007とIR-009をMinorとして継続管理する。
coverage閾値確認は失敗するが、数値単独では品質ゲートを不合格にしない規則を適用し、未カバーの具体的影響を既存指摘と残存リスクへ記録した。

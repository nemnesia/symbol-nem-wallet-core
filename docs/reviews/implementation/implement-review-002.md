# Implementation Review Findings

## Review Target

- 対象: `origin/main...agent/implement-wallet-core`（HEAD `de12313`）の Rust Wallet Core、WASM binding、Native C ABI、テストおよび `bb0f12b..de12313` の修正差分
- 確認日: 2026-08-20 12:10 +0900
- レビュー範囲: `src/crypto.rs`、`src/store.rs`、`src/cbor.rs`、`src/wasm.rs`、`bindings/native/`、`tests/core.rs`、Cargo manifest、前回レビュー指摘の修正箇所
- 未確認範囲: WASM runtime、Cコンパイラからの直接ABI検証、外部SDKとの全wire fixture照合、sanitizer、Miri、カバレッジ、乱数失敗・ID衝突・serialization failureの注入検証
- 成果物: `docs/reviews/implementation/implement-review-002.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a01d1b-fd03-7a52-be7d-667dd677e195`
- Reviewer B agent_id: `01a01d1e-0d47-7131-921f-7b04b3a6d64b`
- Reviewer C agent_id: `01a01d1f-505d-7e92-98f2-bd43912c39ec`
- Reviewer D agent_id: `01a01d21-96f2-7952-8efd-5906b94d68b8`
- 起動再試行: なし
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ4つの agent_id へ全Phase 1メモを個別送信し、完了を個別確認。submission_id は A: `01a01d24-3806-79d3-93ad-8d31994c9bc3`、B: `01a01d24-74ea-7a32-b28b-9c7f38407901`、C: `01a01d24-9dd8-7332-8675-f22a8a23e125`、D: `01a01d24-cd17-7b20-afd2-ff56a80a076e`
- Chair 統合: 完了

4つの `agent_id` は相互に異なる。レビュー対象の実装、仕様書、テストおよびfixtureは変更していない。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `git diff origin/main...HEAD`、`bb0f12b..de12313`、`src/crypto.rs:62-253`、`src/store.rs:22-1275`、`src/cbor.rs:11-220`、`src/wasm.rs`、`bindings/native/` | 暗号処理、秘密情報のライフタイム、Store/wire処理、Bindingの境界および前回指摘の修正を確認 |
| テストまたはfixture | `src/crypto.rs:400-508`、`src/store.rs:1570-1733`、`tests/core.rs:1-236`、`bindings/native/tests/api.rs:1-270` | Crypto vector、HD境界、Store異常系、atomicity、Native parityおよび所有権境界の検証範囲を確認 |
| 承認済み仕様 | `docs/specifications/specification.md` §3、§4.1-§4.2、§5、§6、§7、§9、§11-§14、§17; `docs/specifications/wallet-store-format-v1.md` §2、§4、§7-§9、§11-§12 | API、HD導出、秘密情報消去、CBOR、AAD、warning、atomicity、テスト要件との適合を確認 |
| 技術資料 | `docs/reviews/implementation/implement-review-001.md`、`docs/reviews/implementation/implement-spec-feedback.md`、`docs/reviews/specifications/specification-review-005.md`、`bip39 2.2.2`、`curve25519-dalek 4.1.3` | 前回指摘の状態、既知の仕様競合、依存型のzeroize前提を確認 |

## Review Result

公開可能

## Summary

前回のIR-002〜IR-004は、Mnemonic/seed、復号・CBOR中間値、未知KDF/Cipher enumの修正により解消された。
一方、署名式のScalar演算temporaryと`response.to_bytes()`の一時値は明示的なzeroize保証がなく、IR-001をMajor・Reopenedとして採用した。
また、`duplicate_tag`と`private_key`の型不正が`InvalidFieldLength`に分類されるIR-008をMinorとして採用した。
異常系、Binding parity/ownership、乱数失敗・衝突・外部fixtureの検証不足はIR-005〜IR-007として継続する。
Criticalな指摘はなく、レビューゲート規則上の判定は公開可能とする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | Reopened | `implement-review-001` | Scalar本体はzeroizeされるが、署名式内の演算temporaryと`response.to_bytes()`の一時配列が未管理。 |
| IR-002 | Major | Resolved | `implement-review-001` | `bip39`の`zeroize` feature、Mnemonic/normalized buffer/entropy/seedの消去経路を確認。 |
| IR-003 | Major | Resolved | `implement-review-001` | 復号plaintext、CBOR `Value`、payload、KeyRecordおよび暗号化中間値の消去経路を確認。 |
| IR-004 | Minor | Resolved | `implement-review-001` | KDF/Cipherの未知algorithm値が`UnknownEnumValue`へ分類され、回帰テストも追加された。 |
| IR-005 | Minor | Open | `implement-review-001` | 異常系と失敗時atomicityのテストは増えたが、仕様列挙の全分類・全経路は未検証。 |
| IR-006 | Minor | Open | `implement-review-001` | Nativeの代表parityは追加されたが、全Binding API、WASM runtime、所有権境界は未検証。 |
| IR-007 | Minor | Open | `implement-review-001` | Chain/Network/account境界は追加されたが、乱数失敗、ID衝突、外部SDK fixture等は未検証。 |
| IR-008 | Minor | New | `implement-review-002` | `duplicate_tag`と`private_key`の非bytes型が`InvalidFieldLength`としてwarningされる。 |

## Required Changes

### IR-001

- Priority: Major
- Status: Reopened
- 対象箇所: `src/crypto.rs:213-215`
- 問題: `nonce + challenge * private_scalar`の演算temporaryと、`response.to_bytes()`が生成するsecret byte arrayが、明示的なzeroize対象またはzeroize保証付き所有値になっていない。
- 根拠: 承認済み仕様 `docs/specifications/specification.md` §12.1。依存型 `curve25519-dalek 4.1.3` のScalarはzeroize可能だが、主要なtemporary全体の消去を自動保証する根拠は確認できない。
- 発生条件: `sign()`が正常終了する。
- 影響: 署名応答由来のScalarおよびbyte表現が、処理終了後のメモリに残存する可能性がある。
- 修正内容: 署名処理で生成されるsecret Scalar演算temporaryとsecret byte temporaryについて、正常終了および失敗終了の全経路でzeroize保証を成立させる。
- 修正完了条件: 署名式の全secret中間値に未管理の終了経路がなく、仕様§12.1のtemporary消去条件をコード上確認できる。
- 追加テスト: 既存署名ベクタを維持し、署名演算temporaryのzeroize保証を退行させない回帰確認を追加する。

## Optional Improvements

### IR-005

- Priority: Minor
- Status: Open
- 対象箇所: `src/store.rs:1570-1733`、`tests/core.rs:166-236`
- 改善内容: warning/fatal境界、AAD各構成要素改変、duplicate_tag意味的不一致、payload/index不一致、各mutation失敗時のinput不変性を、独立fixtureと期待値で検証する。
- 根拠: `specification.md` §11、§14.2、`wallet-store-format-v1.md` §2、§4、§7、§11、§12。
- 影響: Store異常系とatomic replacementの仕様退行を検出できる証拠が不足している。

### IR-006

- Priority: Minor
- Status: Open
- 対象箇所: `bindings/native/tests/api.rs:1-270`、`src/wasm.rs`、`bindings/native/src/lib.rs`
- 改善内容: Native/WASMの同一fixtureに対するDTO、error/warning、失敗時output状態、null/zero-length境界、返却bufferとfree APIの対応を検証する。
- 根拠: `specification.md` §9、§13、§14.2、`docs/decisions/binding-implementation.md`。
- 影響: Core単体テストで検出できないBinding固有のmapping・所有権退行の検出証拠が不足している。

### IR-007

- Priority: Minor
- Status: Open
- 対象箇所: `src/crypto.rs:464-508`、`src/store.rs:1300-1335`、関連fixture
- 改善内容: ID衝突retry、乱数源失敗、serialization failure時のatomicity、およびSymbol/NEM・Mainnet/Testnet・account index・NEM reverseの固定fixtureを検証する。
- 根拠: `specification.md` §3、§4.2、§5.2、§11、§14.1-§14.2。
- 影響: ID一意性、失敗時不変性、Chain/Network/path差異および外部実装互換性の検証が限定されている。

### IR-008

- Priority: Minor
- Status: New
- 対象箇所: `src/store.rs:706-715`、`src/store.rs:963-975`
- 改善内容: `duplicate_tag`と`private_key`について、欠落を`MissingRequiredField`、非bytes型を`InvalidFieldType`、bytes型の長さ不正を`InvalidFieldLength`として分類する。
- 根拠: `docs/specifications/wallet-store-format-v1.md` §2.1。
- 影響: 別実装およびBinding利用者がwarning codeから不正原因を正しく識別できず、wire-formatのwarning semanticsと不一致になる。

## Resolved Findings

### IR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `Cargo.toml:22`、`src/crypto.rs:62-84`
- 対応確認: `bip39`の`zeroize` featureが有効化され、normalized mnemonic、entropy、seedが`Zeroizing`または同等の消去経路で管理されている。

### IR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `src/cbor.rs:22-29`、`src/store.rs:22-127`、`src/store.rs:180-230`、`src/store.rs:1080-1216`
- 対応確認: `Value`のbyte/text、復号plaintext、payload、KeyRecord、暗号化前のpayload bytesおよび主要なearly-return経路にDrop/`Zeroizing`による消去が追加されている。

### IR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `src/store.rs:732-747`、`src/store.rs:781-843`、`src/store.rs:1672-1690`
- 対応確認: KDF/Cipherの未知algorithm値を`UnknownEnumValue`、既知値の固定パラメータ不一致を`InvalidFieldValue`として区別し、回帰テストで確認している。

## Deferred Findings

### SR-014

- Priority: Major
- Status: Deferred
- 対象箇所: `src/store.rs:1280-1295`、`docs/specifications/specification.md` §5.3、§17、`docs/specifications/wallet-store-format-v1.md` §9
- 引継ぎ内容: 現行仕様・保存形式は同一Profile・同一Chain・同一private keyを重複とする一方、上流要件はChain横断の重複禁止とも読める。仕様方針確定後に、実装とテストを再確認する。

### SR-010

- Priority: Minor
- Status: Deferred
- 対象箇所: `docs/specifications/specification.md` §6.4、§8.4、§9.2、要件SEC-013/AC-030
- 引継ぎ内容: v1でpassword recovery/resetを提供しないことの仕様本文への明示が未解決。現実装へ認証API追加を要求する指摘ではない。

## Specification Conformance

- 適合している要件: Symbol/NEMのHD導出、coin type、NEMの最終private key byte order、Mainnet/Testnet分離、代表的な公開鍵・アドレス・署名、BIP39入力、Argon2id/AES-256-GCM、AAD、deterministic CBOR、duplicate semantics、payload/index整合性、error code、atomic replacement、Nativeの主要結果parity。
- 不適合の要件: `specification.md` §12.1のsecret temporary zeroize（IR-001）、`wallet-store-format-v1.md` §2.1の既知bytes fieldに対する型warning分類（IR-008）。
- 実装されていない要件: なし。検証証拠の不足はIR-005〜IR-007で管理する。
- 仕様が曖昧で判定できない要件: SR-014のChain横断private key重複方針、CBOR map入力順序の受入条件。SR-010は仕様本文の禁止事項明示に関するDeferred事項として扱う。

## Test Evaluation

- 十分に検証されている範囲: `cargo test --workspace`でCore unit 5件、Core integration 3件、Native API 1件およびdoc testを実行し成功。Symbol/NEMの代表crypto vector、BIP39/HD導出、全Chain/Network/account境界、Profile/Software Key lifecycle、wrong password、重複、malformed Store、unknown enum、child skip、AAD改変、Nativeのsignature/public-key/address parityを確認。
- カバレッジ: 行・分岐・関数カバレッジは未計測。90%目標の達成状況および未カバー範囲は判定できない。
- 不足しているテスト: IR-005〜IR-007のwarning/fatal全分類、AAD各要素、失敗時input不変性、全Binding ownership/parity、乱数失敗・ID衝突・serialization failure、外部SDK全組合せfixture。
- fixture または期待値の問題: 代表ベクタはあるが、外部Symbol/NEM SDKとのWallet Store binary round-trip、全Network/account indexの独立SDK期待値、NEM reverseの追加独立fixtureは未確認（IR-007）。
- 実行されていない検証: WASM runtime、Cコンパイラからの直接ABI検証、sanitizer、Miri、coverage、乱数/ID衝突/serialization failure injection、外部SDK round-trip。

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | IR-001とIR-008の不適合は記録したが、Criticalはなく、Major/Minorだけではゲート不合格にしない規則を適用。 |
| セキュリティ | 合格 | IR-001はMajorとして修正要求に記録。秘密情報漏えい、暗号アルゴリズム、認証境界に関するCriticalは確認なし。 |
| 相互運用性とプロトコル | 合格 | 代表crypto vector、HD path、Chain/Network wire、deterministic CBOR、AADおよびNative parityに新規不整合なし。外部SDK照合未確認はIR-007。 |
| 処理と異常系 | 合格 | 基本の入力検証、warning/child skip、fatal malformed、AAD改変およびatomic replacementを確認。不足する失敗fixtureはIR-005/IR-007。 |
| テスト十分性 | 合格 | workspace test、clippy、fmt、WASM compile checkは成功。重要な未検証範囲はIR-005〜IR-007として明示し、Criticalな未検証事項なし。 |
| 変更範囲内の品質 | 合格 | `cargo clippy --workspace --all-targets -- -D warnings`、`cargo fmt --all -- --check`、`cargo check --target wasm32-unknown-unknown --features wasm`、`git diff --check`が成功。 |

## Remaining Risks

- IR-001が解消されるまで、署名応答由来のtemporaryがメモリに残存する可能性がある。
- IR-008が解消されるまで、Store warningの型分類が別実装・Binding利用者の期待と一致しない。
- IR-005〜IR-007により、異常系atomicity、Binding parity/ownership、乱数失敗・衝突および外部SDK互換性の実行時証拠が限定される。
- WASM runtime、直接C ABI、sanitizer、Miri、coverageは未実行である。
- SR-014のChain横断重複方針およびSR-010のpassword recovery/reset禁止の仕様明示は未決定または未解消である。

## Final Decision

公開可能。前回のMajor指摘のうちIR-002とIR-003は解消されたが、IR-001は署名temporaryの未消去として再発し、IR-008も未解消である。
ただし、レビューゲート規則ではCriticalのみがゲート不合格となるため、Criticalなしの現行対象は公開可能と判定する。

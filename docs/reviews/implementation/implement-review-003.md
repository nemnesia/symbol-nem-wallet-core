# Implementation Review Findings

## Review Target

- 対象: 現行作業ツリー HEAD `8d962ef` の `src/` および `bindings/native/src/`、対応テスト
- 確認日: 2026-08-22 06:31 +0900
- レビュー範囲: Rust Core、Native C ABI、WASM binding、`tests/core.rs`、`bindings/native/tests/api.rs`、関連する承認済み仕様および既存実装レビュー
- 未確認範囲: WASM runtime test、Cコンパイラからの直接ABI検証、sanitizer、Miri、カバレッジ、乱数・ID衝突・serialization failure injection
- 成果物: `docs/reviews/implementation/implement-review-003.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a02636-7b43-7f01-939e-266f695a611a`
- Reviewer B agent_id: `01a02636-9fc5-7bb3-b275-eb61d545d78a`
- Reviewer C agent_id: `01a02636-c4a6-75e2-b8ee-bb195cb1e4ad`
- Reviewer D agent_id: `01a02636-e6ee-7991-afeb-3a5ea3b5e555`
- 起動再試行: なし
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ4つの agent_id へ全 memo を個別送信し、各送信に対応する `multi_agent_v1__wait_agent` で個別確認。submission_id は A: `01a02638-78a4-7612-af4b-010d8a27df58`、B: `01a02638-b455-7d40-83fe-fd04c6c50dcd`、C: `01a02638-eca8-7f41-b926-5bc041149123`、D: `01a02639-2847-7552-8321-6f9671787cd2`
- Chair 統合: 完了

4つの `agent_id` は相互に異なる。レビュー対象の実装、仕様書、fixtureおよびテストは変更していない。作業ツリーにあった未コミットの `README.md` 変更はレビュー対象外として保持した。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `src/crypto.rs:181-225`、`src/store.rs:692-985`、`src/cbor.rs`、`src/wasm.rs`、`bindings/native/src/lib.rs` | 署名temporaryのzeroize、Store decoder/AAD、CBOR、Binding境界および所有権を確認 |
| テストまたは fixture | `src/crypto.rs`内テスト、`src/store.rs:1707-2066`、`tests/core.rs`、`bindings/native/tests/api.rs`、`src/wasm.rs:518-674` | 暗号・HD・Store異常系・unknown field・Native parityおよびWASMテストコードの検証範囲を確認 |
| 承認済み仕様 | `docs/specifications/specification.md` §4.1-§4.2、§5、§6、§9、§11-§14、§17; `docs/specifications/wallet-store-format-v1.md` §2、§4、§7-§9、§11-§12 | API、HD導出、zeroize、CBOR、AAD、atomicity、Bindingおよびテスト要件を確認 |
| 技術資料 | `docs/decisions/binding-implementation.md`、`docs/reviews/implementation/implement-review-001.md`、`docs/reviews/implementation/implement-review-002.md`、`curve25519-dalek 4.1.3` の `scalar.rs` / `macros.rs` | Binding方針、過去指摘の状態、ScalarのCopy/zeroize/演算実装を確認 |

## Review Result

公開可能

## Summary

現行実装に新規の仕様適合性、暗号方式、相互運用性またはBinding実装欠陥は確認されなかった。
一方、署名式のScalar演算が内部で生成するsecret temporaryについて、仕様§12.1のzeroize保証をコード上確認できないIR-001が継続している。
前回のIR-002〜IR-004はMnemonic・復号中間値・未知enum分類の修正により解消され、IR-008も現行仕様に合わせたfatal `InvalidStore`処理で解消された。
IR-005〜IR-007は、異常系atomicity、Binding実行時境界および失敗注入・外部fixtureの検証証拠不足として継続する。
品質ゲートはCritical指摘がないため、規定に基づき公開可能と判定する。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | Reopened | implement-review-001 | `Scalar`の明示変数はzeroizeされるが、演算実装が生成するCopy型のsecret temporary全体の消去保証は確認できない。 |
| IR-002 | Major | Resolved | implement-review-001 | `bip39`のzeroize featureとMnemonic・entropy・seedの消去経路を確認した。 |
| IR-003 | Major | Resolved | implement-review-001 | 復号plaintext、CBOR Value、payloadおよび主要な中間値のzeroize経路を確認した。 |
| IR-004 | Minor | Resolved | implement-review-001 | 現行仕様で未知enumをfatal `InvalidStore`として扱い、旧warning分類要求は適用されないことを確認した。 |
| IR-005 | Minor | Open | implement-review-001 | Store異常系テストは増えたが、warning/fatal境界、AAD各要素および各mutation失敗時不変性の全範囲は未検証である。 |
| IR-006 | Minor | Open | implement-review-001 | Native代表テストとWASMテストコードはあるが、WASM runtime、直接C ABIおよび全API所有権境界は未検証である。 |
| IR-007 | Minor | Open | implement-review-001 | Chain/Network fixtureは増えたが、乱数失敗、ID衝突、serialization failure injectionおよび外部SDK全組合せ照合は未検証である。 |
| IR-008 | Minor | Resolved | implement-review-002 | 現行の`parse_profile`/`parse_key_record`は不正fixed fieldをwarningでskipせずfatal `InvalidStore`とし、回帰テストも確認した。 |

## Required Changes

### IR-001

- Priority: Major
- Status: Reopened
- 対象箇所: `src/crypto.rs:213-224`
- 問題: `private_term *= private_scalar` および `response += private_term` は、`curve25519-dalek 4.1.3` の `Scalar`演算実装を通じて新しい`Scalar`値を生成する。`Scalar`は`Copy`で、`Zeroize`は実装されているがDrop時zeroizeではないため、明示的にzeroizeされる`private_term`、`response`、`response_bytes`だけでは演算中に生成されたsecret temporary全体の消去保証を確認できない。
- 根拠: 承認済み仕様 `docs/specifications/specification.md` §12.1、実装 `src/crypto.rs:213-224`、技術資料 `curve25519-dalek 4.1.3/src/scalar.rs:195-198, 315-337` および `src/macros.rs`。
- 発生条件: `sign()`が正常終了または署名演算中に失敗する。
- 影響: private key由来のScalar中間値が処理後のメモリに残存する可能性があり、仕様が要求するsecret temporary消去を満たすことを確認できない。
- 修正内容: 署名式で生成される全secret Scalarおよびそのbyte表現について、正常終了・エラー終了の双方で仕様§12.1のzeroize保証を成立させる。
- 修正完了条件: 署名演算の全secret中間値に未管理の終了経路がなく、依存型または実装側の消去保証を根拠付きで確認できる。
- 追加テスト: 既存署名fixtureを維持し、署名演算temporaryのzeroize保証が退行していないことを確認する。

## Optional Improvements

### IR-005

- Priority: Minor
- Status: Open
- 対象箇所: `src/store.rs:1707-2066`、`tests/core.rs`
- 改善内容: warning/fatal境界、AAD構成要素改変、duplicate_tag意味的不一致、payload/index不一致、各mutation失敗時のinput Store不変性を独立fixtureで検証する。
- 根拠: `docs/specifications/specification.md` §11、§14.2、`docs/specifications/wallet-store-format-v1.md` §2、§4、§7、§11-§12。
- 影響: 不正入力の分類、認証失敗、atomic replacementおよび入力不変性の退行検出が限定される。

### IR-006

- Priority: Minor
- Status: Open
- 対象箇所: `src/wasm.rs:518-674`、`bindings/native/src/lib.rs`、`bindings/native/tests/api.rs`
- 改善内容: Native/WASMの同一fixtureでDTO、error/warning、失敗時出力状態、null/zero-length境界、返却bufferとfree APIの対応を実行検証する。
- 根拠: `docs/specifications/specification.md` §9、§13、§14.2、`docs/decisions/binding-implementation.md`。
- 影響: Core単体テストでは検出できないBinding固有のmapping・ABI・所有権退行の検出証拠が不足する。

### IR-007

- Priority: Minor
- Status: Open
- 対象箇所: `src/crypto.rs`のHD/乱数処理、`src/store.rs`のID生成・mutation処理、関連fixture
- 改善内容: 乱数源失敗、ID衝突、serialization failureの注入と、Symbol/NEM・Mainnet/Testnet・account index境界・NEM reverseの独立した外部SDK期待値fixtureを検証する。
- 根拠: `docs/specifications/specification.md` §3、§4.2、§5.2、§11、§14.1-§14.2。
- 影響: 失敗時atomicity、ID一意性、導出互換性の退行検出が限定される。

## Resolved Findings

### IR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `Cargo.toml`の`bip39` feature、`src/crypto.rs`のMnemonic/seed処理
- 対応確認: `bip39`の`zeroize` feature、normalized mnemonic、entropyおよびseedの消去経路を確認した。

### IR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `src/cbor.rs`、`src/store.rs`の復号・payload parse・再暗号化経路
- 対応確認: `Value`、復号plaintext、payload、KeyRecordおよび暗号化前の中間値にDrop/`Zeroizing`による消去経路を確認した。

### IR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: implement-review-001
- 対象箇所: `src/store.rs:736-777`、`src/store.rs:1707-1720`
- 対応確認: 現行のStore仕様では未知enum・子オブジェクト不正をskip warningではなくfatal `InvalidStore`として扱い、回帰テストで確認している。

### IR-008

- Priority: Minor
- Status: Resolved
- 初出レビュー: implement-review-002
- 対象箇所: `src/store.rs:692-860`、`src/store.rs:1890-2002`
- 対応確認: `duplicate_tag`、`private_key`およびその他の固定fieldの欠落・型不正・長さ不正を、現行仕様どおりStore全体の`InvalidStore`として拒否する実装とテストを確認した。

## Deferred Findings

### SR-014

- Priority: Major
- Status: Deferred
- 対象箇所: `docs/specifications/specification.md` §5.3、§17、`docs/specifications/wallet-store-format-v1.md` §9、既存レビュー `implement-review-002`
- 引継ぎ内容: 同一Profile・同一Chain・同一private keyのみを重複とする現行仕様と、上流要件にあるChain横断の重複禁止とも読める記述の競合。実装欠陥としては扱わず、方針確定後に再確認する。

### SR-010

- Priority: Minor
- Status: Deferred
- 対象箇所: `docs/specifications/specification.md` §6.4、§8.4、§9.2、既存レビュー `implement-review-002`
- 引継ぎ内容: v1でpassword recovery/resetを提供しないことの仕様本文への明示不足。実装への新API要求としては扱わない。

## Specification Conformance

- 適合している要件: BIP39 English 24-word入力、Symbol/NEMのHD導出、Chain/Network固定、NEM private key byte order、Argon2id/AES-256-GCM、AAD、deterministic CBOR、unknown field保持、duplicate_tag意味検証、payload/index整合性、atomic replacement、NativeのDTO・error・所有権変換。
- 不適合の要件: `specification.md` §12.1のsecret temporary消去保証（IR-001）。
- 実装されていない要件: なし。検証証拠の不足はIR-005〜IR-007で管理する。
- 仕様が曖昧で判定できない要件: SR-014のChain横断重複方針、SR-010のpassword recovery/reset禁止の本文明示。

## Test Evaluation

- 十分に検証されている範囲: `cargo test --workspace`でCore unit 20件、Core integration 3件、Native API 1件およびdoc testを実行して成功。CBOR deterministic/resource境界、代表的なSymbol/NEM crypto vector、HD導出、Storeのfatal malformed/unknown field/AAD整合性、Profile/Software Key lifecycle、Nativeのsignature/public-key/address parityを確認した。
- カバレッジ: 行・分岐・関数カバレッジは未計測。90%目標の達成状況は判定できない。
- 不足しているテスト: IR-005〜IR-007のwarning/fatal全分類、AAD各要素、各mutation失敗時input不変性、全Binding ownership/parity、乱数失敗・ID衝突・serialization failure injection、外部SDK全組合せfixture。
- fixtureまたは期待値の問題: 外部SDKとの全組合せround-tripおよび失敗注入fixtureは未確認（IR-007）。既存の代表fixtureに不一致は確認していない。
- 実行されていない検証: WASM runtime test、Cコンパイラからの直接ABI検証、sanitizer、Miri、coverage、乱数/ID衝突/serialization failure injection、外部SDK round-trip。

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | 新規の仕様違反はなく、IR-001はMajorとして継続管理。Criticalなし。 |
| セキュリティ | 合格 | IR-001はMajorのRequired Changesとして記録。認証・暗号方式・秘密情報境界にCriticalな新規欠陥は確認なし。 |
| 相互運用性とプロトコル | 合格 | Symbol/NEM、Network、HD、CBOR、AADおよびNative parityに新規不整合なし。全組合せの未検証はIR-007。 |
| 処理と異常系 | 合格 | Store構造検証、unknown field、AAD整合性、fatal malformedおよび基本atomicityを確認。不足する独立fixtureはIR-005/IR-007。 |
| テスト十分性 | 合格 | `cargo test --workspace`、`cargo fmt --all -- --check`、`cargo clippy --workspace --all-targets -- -D warnings`、WASM compile checkが成功。未実行範囲は具体的に記録し、Criticalな未検証事項はない。 |
| 変更範囲内の品質 | 合格 | 対象範囲の型・エラー・所有権・コメントに新規の具体的欠陥は確認なし。対象パスの`git diff --check`も成功。 |

## Remaining Risks

- IR-001が解消されるまで、署名演算由来のScalar temporaryがメモリに残存する可能性がある。
- IR-005〜IR-007により、異常系atomicity、Binding実行時境界、乱数失敗・衝突および外部SDK互換性の実行時証拠が限定される。
- WASM runtime、直接C ABI、sanitizer、Miriおよびカバレッジは未実行である。
- SR-014およびSR-010の仕様上の未決定・未明示事項は残っている。

## Final Decision

公開可能。新規のCritical指摘はなく、既存のMajor IR-001はRequired Changesとして継続する。
レビューゲート規則ではMajor/Minorだけでは不合格としないため、現行対象の最終判定は公開可能とする。

# Implementation Review Findings

## Review Target

- 対象: `origin/main...agent/implement-wallet-core`（HEAD `bb0f12b`）の Rust Wallet Core、WASM binding、Native C ABI、対応テスト
- 確認日: 2026-08-20
- レビュー範囲: `src/*.rs`、`src/wasm.rs`、`bindings/native/`、`tests/core.rs`、`bindings/native/tests/api.rs`、Cargo manifestおよび実装差分
- 未確認範囲: WASM runtime test、Cコンパイラからの直接ABI検証、sanitizer、カバレッジ実測
- 成果物: `docs/reviews/implementation/implement-review-001.md`

## Execution Audit

- 実行モード: `multi_agent_v1__spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A agent_id: `01a01ce5-5de1-77a0-b8d5-8877b4a6a75e`
- Reviewer B agent_id: `01a01ce6-5ec4-78e3-bd78-876f1080969e`
- Reviewer C agent_id: `01a01ce7-a4b8-7042-a5f3-f6dd5805dd91`
- Reviewer D agent_id: `01a01ce8-9fcd-7451-9304-5c34c2133163`
- 起動再試行: あり。初回実行でエージェント容量エラーが発生したため既存の完了済みエージェントを解放し、最終監査を4役割とも `gpt-5.6-luna` で再実行した。初回実行のメモは最終判定に採用していない。
- Phase 1: 完了。各 Reviewer の `multi_agent_v1__wait_agent` で個別確認
- Phase 2: 完了。同じ4つの agent_id へ全メモを個別送信し、各送信に対応する `multi_agent_v1__wait_agent` の完了を個別確認。submission_id は A: `01a01ce9-cb50-73c1-b154-f846267c7683`、B: `01a01cea-6f61-71b1-9a92-54834c0711aa`、C: `01a01ceb-208c-7c13-bd83-0276b9d5c092`、D: `01a01ceb-9fd4-74c2-a73b-3b048e8c9f35`
- Chair 統合: 完了

4つの `agent_id` は相互に異なる。レビュー対象コード、仕様書およびテストは変更していない。

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `git diff origin/main...HEAD`、`src/crypto.rs`、`src/store.rs`、`src/cbor.rs`、`src/wasm.rs`、`bindings/native/src/lib.rs`、`bindings/native/include/symbol_nem_wallet_core.h` | 暗号処理、秘密情報のライフタイム、保存形式、Bindingの所有権およびAPIを確認 |
| テストまたは fixture | `src/crypto.rs`内テスト、`tests/core.rs`、`bindings/native/tests/api.rs` | HD・公開情報・署名ベクタ、基本ライフサイクル、Native APIの検証範囲を確認 |
| 承認済み仕様 | `docs/specifications/specification.md` §4.2、§5.3、§6、§7、§9、§11、§12、§13、§14、§17; `docs/specifications/wallet-store-format-v1.md` §2、§4、§7、§8、§9、§11、§12 | API、HD導出、重複判定、zeroize、warning、AAD、atomicityおよびテスト要件を確認 |
| 技術資料 | `docs/reviews/implementation/implement-spec-feedback.md`、`docs/reviews/specifications/specification-review-005.md`、Cargo依存ソース `curve25519-dalek 4.1.3`、`bip39 2.2.2` | 既知の仕様競合、依存型のzeroize実装、Symbol/NEM互換性の前提を確認 |

## Review Result

修正後に再レビュー

## Summary

HD導出、Symbol/NEMの公開鍵・アドレス・署名、CBOR/AAD、Argon2id、AES-256-GCM、atomic replacementの主要実装は現行仕様と整合している。
一方、秘密情報を含むScalar、BIP39 Mnemonic、復号・CBOR中間値のzeroizeが全ライフタイムで保証されていない。
保存形式では未知KDF/Cipher enumのwarning codeが仕様の`UnknownEnumValue`と一致しない。
テストは基本ライフサイクルと代表ベクタに限られ、異常系、warning、Binding parityおよび失敗時atomicityの実証が不足している。
Criticalな指摘はないが、Majorの秘密情報消去欠陥があるため、公開前に修正と再レビューが必要である。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | New | implementation-review-001 | 署名経路の秘密Scalarに自動zeroizeがなく、仕様§12.1のsecret temporary消去条件を満たさない。 |
| IR-002 | Major | New | implementation-review-001 | BIP39 `Mnemonic`がzeroize featureなしで通常dropされ、秘密由来の単語indexを消去する保証がない。 |
| IR-003 | Major | New | implementation-review-001 | 復号entropy/plaintextの早期returnおよびCBOR encode/decode中間値にzeroizeされない秘密コピーがある。 |
| IR-004 | Minor | New | implementation-review-001 | 未知KDF/Cipher enumが`UnknownEnumValue`でなく`InvalidFieldValue`になる。 |
| IR-005 | Minor | New | implementation-review-001 | malformed Store、warning、ID重複、AAD改変、mutation失敗時不変性のテストが不足している。 |
| IR-006 | Minor | New | implementation-review-001 | Native/WASM parity、Bindingのerror/warningおよび所有権境界のテストが不足している。 |
| IR-007 | Minor | New | implementation-review-001 | ID衝突retry、乱数失敗時atomicity、全Chain/Network/account indexのfixtureが不足している。 |

## Required Changes

### IR-001

- Priority: Major
- Status: New
- 対象箇所: `src/crypto.rs:162-188`、`src/crypto.rs:208-223`
- 問題: `sign`の`nonce`、`challenge`、`private_scalar`由来の`curve25519_dalek::Scalar`は`Zeroize`実装を持つが`ZeroizeOnDrop`/`Drop`ではなく、実装から明示的にzeroizeされていない。
- 根拠: 承認済み仕様 `specification.md` §12.1、依存ソース `curve25519-dalek 4.1.3`。
- 発生条件: `sign`、`get_public_account`、秘密鍵検証など、秘密Scalarを生成する処理を実行する。
- 影響: 署名後に秘密を含むScalar中間値がメモリに残存する可能性がある。
- 修正内容: 署名および関連する秘密鍵処理の一時Scalarが、処理成功・失敗を問わず仕様のzeroize対象となることを保証する。
- 修正完了条件: 依存型または実装側の消去保証を根拠付きで確認でき、署名経路の秘密Scalarに未消去の終了経路がない。
- 追加テスト: zeroize保証の回帰確認と、署名失敗を含むtemporary lifetimeの検証。

### IR-002

- Priority: Major
- Status: New
- 対象箇所: `src/crypto.rs:56-84`、`Cargo.toml`の`bip39`依存
- 問題: `bip39 2.2.2`の`Mnemonic`はzeroize feature有効時だけzeroize導出されるが、現行依存でfeatureが有効化されていない。Mnemonicのword indexは秘密を復元可能な値である。
- 根拠: 承認済み仕様 `specification.md` §4.1、§12.1、依存ソースおよびCargo lock。
- 発生条件: Mnemonic生成、復元、seed生成、HD導出またはMnemonic exportを実行する。
- 影響: Mnemonic由来の秘密情報が通常dropされ、処理後のメモリに残存する可能性がある。
- 修正内容: Mnemonicオブジェクトとその秘密由来の一時値が、処理完了時およびエラー時に仕様どおり消去されることを保証する。
- 修正完了条件: Mnemonicの内部保持値、normalized buffer、seedおよび生成・復元時の一時コピーについて、消去保証の根拠が確認できる。
- 追加テスト: Mnemonic生成・復元・seed導出の正常系と失敗系でzeroize対象が維持されることの回帰確認。

### IR-003

- Priority: Major
- Status: New
- 対象箇所: `src/store.rs:160-192`、`src/store.rs:221-228`、`src/store.rs:1013-1025`、`src/store.rs:823-850`、`src/store.rs:1200-1225`
- 問題: `finalize_generated_profile`と`restore_profile`のentropyは重複エラー時にplain arrayのままreturnする。`authenticate_profile`では`parse_payload`のエラー時に復号plaintextのzeroizeへ到達しない。さらに、CBOR decodeの`Value::Bytes`および`encode_payload`の`KeyRecord`/`Value`のcloneが秘密値を保持するが、これらの型にzeroize Dropがない。
- 根拠: 承認済み仕様 `specification.md` §6.3、§7、§12.1-12.2、実装の所有権・Drop挙動。
- 発生条件: 重複Profile、認証済みpayloadの構造不正、復号後のparse失敗、payload再暗号化を実行する。
- 影響: entropy、復号plaintext、private keyの中間コピーが正常・異常終了後に残存する可能性がある。
- 修正内容: 復号・CBOR parse・再暗号化の全一時秘密値を、所有権を一意化するかzeroize保証付き型で保持し、早期returnを含めて消去する。
- 修正完了条件: 指摘箇所の成功・失敗・変換失敗の全経路で、秘密entropy、plaintextおよびprivate keyコピーに未消去の所有値が残らない。
- 追加テスト: 重複・parse失敗・payload再暗号化の回帰ケースを追加する。

## Optional Improvements

### IR-004

- Priority: Minor
- Status: New
- 対象箇所: `src/store.rs:697-713`、`src/store.rs:747-777`
- 改善内容: KDFまたはCipherのalgorithm fieldがunsignedの未知enum値の場合、`InvalidFieldValue`ではなく`UnknownEnumValue` warningを返す。欠落、型不正、既知範囲外の値とは区別する。
- 根拠: `wallet-store-format-v1.md` §2.1、§4.4-4.5。
- 影響: 別実装およびBinding利用者が仕様規定のwarning分類を利用できるようになる。対象Profileのskip動作自体は現行実装で維持されている。

### IR-005

- Priority: Minor
- Status: New
- 対象箇所: `tests/core.rs`、`src/store.rs:595-1000`
- 改善内容: malformed CBOR、unknown field/enum、child skip、warning内容、重複Profile/key ID、AAD改変、duplicate_tag意味不一致、各mutation失敗後のinput Store不変性をfixtureで検証する。
- 根拠: `specification.md` §7、§11、§14.2、`wallet-store-format-v1.md` §2、§4、§7、§11、§12。
- 影響: `DecodeWarning`とfatal `InvalidStore`の境界、atomic replacementおよび保存形式の退行を自動検出できる。

### IR-006

- Priority: Minor
- Status: New
- 対象箇所: `bindings/native/tests/api.rs`、`src/wasm.rs:241-498`
- 改善内容: Native/WASMの同一fixtureに対するDTO、signature、error/warning parity、Uint8Array境界、Native output/free pair、失敗時出力未生成を検証する。
- 根拠: `specification.md` §9、§12.3、§13、§14.2、`docs/decisions/binding-implementation.md`。
- 影響: Core単体テストでは検出できないBinding固有のmapping・所有権退行を検出できる。

### IR-007

- Priority: Minor
- Status: New
- 対象箇所: `src/store.rs:1294-1313`、`src/crypto.rs:30-45`、`src/crypto.rs:87-134`、`tests/core.rs`、`src/crypto.rs:420-440`
- 改善内容: ID衝突retry、乱数源失敗時の不変性、Symbol/NEMの全Network・複数account index・NEM reverseを含むSDK互換fixtureを追加する。
- 根拠: `specification.md` §3、§4.2、§5.2、§11、§14.1-14.2。
- 影響: ID一意性、乱数失敗時atomicity、Chain/Network/path差異の退行検出力が向上する。

## Resolved Findings

なし。

## Deferred Findings

### SR-014

- Priority: Major
- Status: Deferred
- 対象箇所: `src/store.rs:1279-1291`、`specification.md` §5.3、§17、`wallet-store-format-v1.md` §9、要件FR-018/DR-007/AC-020
- 引継ぎ内容: 現行仕様・保存形式は同一Profile・同一Chain・同一private keyのみ重複とする一方、上流要件はChain横断の重複禁止とも読める。現実装は現行仕様・保存形式側に適合しているため実装欠陥とは判定しない。方針確定後に実装とテストを再確認する。

### SR-010

- Priority: Minor
- Status: Deferred
- 対象箇所: `specification.md` §6.4、§8.4、§9.2、要件SEC-013/AC-030
- 引継ぎ内容: v1でパスワード復旧・リセットを提供しないことの仕様本文への明示不足。現行実装の認証API追加を要求する指摘ではなく、既存仕様レビューのOpen事項として引き継ぐ。

## Specification Conformance

- 適合している要件: Symbol/NEMのHD導出、Chain/Network固有の鍵処理、BIP39入力検証、Argon2id/AES-256-GCM、AAD、duplicate_tag意味検証、payload/index整合性、raw byte API、error code、atomic replacement、同一Chain内のSoftware Key重複判定（`src/crypto.rs`、`src/store.rs`、`src/wasm.rs`、Native binding）。
- 不適合の要件: `specification.md` §12.1のsecret temporary zeroize（IR-001〜IR-003）、`wallet-store-format-v1.md` §2.1/§4.4-4.5の未知KDF/Cipher enum warning分類（IR-004）。
- 実装されていない要件: なし。テスト不足はIR-005〜IR-007として別管理する。
- 仕様が曖昧で判定できない要件: SR-014のChain横断private key重複方針、CBOR入力map順序を拒否すべきかの受入条件。後者は実装指摘として採用していない。

## Test Evaluation

- 十分に検証されている範囲: Symbol/NEMの代表的な公開鍵・アドレス・署名ベクタ、BIP39 seedと代表HD導出、Profile/Software Keyの基本ライフサイクル、wrong password、重複、invalid mnemonic/private key/account index、Nativeの主要API。
- カバレッジ: 行・分岐・関数カバレッジは未計測。90%目標の達成状況は判定できない。
- 不足しているテスト: IR-005〜IR-007のとおり、保存形式異常系、warning分類、失敗時input不変性、Binding parity/ownership、全Chain/Network/index fixtureおよび乱数失敗。
- fixture または期待値の問題: 暗号化/AAD/CBOR/duplicate_tagの固定fixture、全Network・複数account indexのSDK相互検証fixtureが不足している。
- 実行されていない検証: WASM runtime test、Cコンパイラからの直接ABI検証、sanitizer、カバレッジ計測。

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | HD、wire、API、atomicityは概ね適合。IR-004はMinorのwarning分類不一致、IR-001〜IR-003は§12.1の秘密消去不一致。Criticalなし。 |
| セキュリティ | 合格 | IR-001〜IR-003をRequired Changesとして記録。Criticalな暗号アルゴリズム・認証欠陥は確認なし。 |
| 相互運用性とプロトコル | 合格 | 代表SDKベクタとChain/Network分岐は適合。全組合せfixture不足はIR-007。 |
| 処理と異常系 | 合格 | 基本error/atomicityは実装。malformed/warning/失敗経路の検証不足はIR-005。 |
| テスト十分性 | 合格 | workspace testは成功。重要異常系とBinding parityの不足をIR-005〜IR-007に記録。カバレッジ未計測。 |
| 変更範囲内の品質 | 合格 | `cargo clippy --workspace --all-targets -- -D warnings`、`cargo fmt --all -- --check`、WASM check成功。Majorは修正後再レビュー対象。 |

## Remaining Risks

- IR-001〜IR-003を解消するまで、秘密情報のメモリ残存リスクがある。
- SR-014の上流要件と仕様の競合が残っており、Chain横断の同一private key登録ケースは最終方針確定後に再確認が必要である。
- SR-010のパスワード復旧・リセット禁止の明示は未解決である。
- WASM runtime、C compiler ABI、sanitizerおよびカバレッジは未実行で、Bindingとメモリ安全性の実行時証拠が限定される。

## Final Decision

修正後に再レビュー。Criticalなプロトコルまたは認証欠陥は確認されなかったが、仕様§12.1に関わるMajorな秘密情報消去不足が残る。
未知enumのwarning分類と、保存形式・異常系・Bindingの検証不足も記録したため、IR-001〜IR-003を修正し、必要な回帰テストを追加した後に再レビューする。

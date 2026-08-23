# Implementation Review Findings

## Review Target

- 対象: `HEAD 694773e` の `bindings/`、`src/`、関連テストおよび依存定義
- 確認日: 2026-08-23 00:00 +0900
- レビュー範囲: `bindings/native/src/lib.rs`、`src/store.rs`、`src/wasm.rs`、`Cargo.toml` / `Cargo.lock`、関連する Native / WASM / Store テスト。前回対象 `bdbc873` からの変更と、既存 IR-001〜IR-014 の現行状態を確認
- 未確認範囲: WASM runtime test、Native sanitizer runtime、coverage計測、外部ネットワークを用いたSDK検証。作業ツリーの未コミット `tests/unit/store.rs` 変更はレビュー判定から除外したが、workspace test実行時には含まれている
- 成果物: `docs/reviews/implementation/implement-review-008.md`

## Execution Audit

- 実行モード: `spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A 識別子: `01a02b63-fd0c-7f63-b5bc-27daf0ecd7b1`
- Reviewer B 識別子: `01a02b64-1e13-7992-9a59-10c23cabf3c1`
- Reviewer C 識別子: `01a02b64-3f1e-7ed3-b8e7-d113d0864065`
- Reviewer D 識別子: `01a02b64-5c25-7dd0-a374-c602cd4a5e64`
- 起動再試行: なし
- Phase 1: 完了。4名を個別に `wait_agent` で確認
- Phase 2: 完了。同じ4名へ個別に follow-up を送信し、4名を個別に `wait_agent` で確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `src/wasm.rs:57-110,324-612` | Store入力上限、WASM数値入力、raw byte API、error mappingの確認 |
| 実装コードまたは差分 | `bindings/native/src/lib.rs:357-398,479-527` | Native output alias、所有権移動、private key export境界の確認 |
| 実装コードまたは差分 | `src/store.rs:1014-1058`、`Cargo.toml:22-23`、`Cargo.lock:186-199` | malformed payloadのprivate key owner、依存構成および前回IR-001/IR-003の状態確認 |
| テストまたは fixture | `tests/unit/wasm.rs:269-307`、`tests/unit/store.rs`、`bindings/native/tests/api.rs`、`bindings/native/tests/caller_runtime.c` | WASM入力境界、Store異常系、Native ABI境界の検証範囲確認 |
| 承認済み仕様 | `docs/specifications/specification.md` §4.2、§5-§7、§9、§12-§14; `docs/specifications/wallet-store-format-v1.md` §2、§7、§11 | API、秘密情報、CBOR/AAD、resource limit、Bindingおよびテスト契約の照合 |
| 要件・設計判断 | `docs/decisions/binding-implementation.md`、`docs/decisions/open-001.md`、`docs/decisions/curve25519-dalek-local-patch.md` | Binding ownership、Symbol/NEM互換性、第三者算術temporaryの現行適用範囲の確認 |

## Review Result

公開可能

## Summary

現行 `bindings/` と `src/` に、Critical または Major の新規不適合は確認されなかった。
前回のMajor指摘であるmalformed payload、WASM数値wrap、Native output aliasおよびlocal patch依存は、現行仕様・実装上は解消を確認した。
Native成功時ownership、WASM Store上限境界、公開Generated failureの独立runtime検証にはMinorの証拠不足が残る。
品質ゲート規則に従い、現行判定は公開可能とする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | Resolved | `implement-review-001` | 現行仕様§12.1は第三者暗号ライブラリ内部の算術temporaryを完全消去保証の対象外とし、local patchも撤去済み。 |
| IR-002 | Major | Resolved | `implement-review-001` | BIP39 `zeroize` featureとMnemonic/seedの消去経路に退行なし。 |
| IR-003 | Major | Resolved | `implement-review-001` | `parse_key_record` がorigin検証まで `Zeroizing` ownerを使用する。 |
| IR-004 | Minor | Resolved | `implement-review-001` | enum/fixed-fieldのfatal分類を現行仕様どおり確認。 |
| IR-005 | Minor | Resolved | `implement-review-001` | AAD/tag/semantic mismatchと主要mutation atomicityのテストを確認。 |
| IR-006 | Minor | Open | `implement-review-001` | Native成功ownership/freeとWASM公開API境界のruntime parityが未確認。 |
| IR-007 | Minor | Open | `implement-review-001` | 公開`generate_software_key`のfailure injection/atomicity証拠が未確認。 |
| IR-008 | Minor | Resolved | `implement-review-002` | fixed field不正をfatal `InvalidStore`とする実装・テストを確認。 |
| IR-009 | Minor | Resolved | `implement-review-004` | authenticated PendingのProfile ID衝突分類を確認。 |
| IR-010 | Major | Resolved | `implement-review-006` | 乱数源失敗時の出力owner zeroizeを確認。 |
| IR-011 | Major | Resolved | `implement-review-007` | WASMのnetwork/chain/account indexを変換前に検証する実装を確認。 |
| IR-012 | Major | Resolved | `implement-review-007` | Native prepareの同一output pointer alias拒否を確認。 |
| IR-013 | Minor | Resolved | `implement-review-007` | prepare/export mnemonicのRust-side所有権移動が`mem::take`へ修正済み。 |
| IR-014 | Minor | Open | `implement-review-007` | WASM Store上限の実装はあるが、公開APIを通る独立runtime testが未確認。 |

## Required Changes

なし

## Optional Improvements

### IR-006

- Priority: Minor
- Status: Open
- 対象箇所: `bindings/native/src/lib.rs:357-398,479-500`、`bindings/native/tests/api.rs`、`bindings/native/tests/caller_runtime.c`、`src/wasm.rs`
- 改善内容: Native prepareの成功時Mnemonic/Pending移動とfree、`snwc_export_mnemonic`成功経路、およびWASM公開APIの主要failure/ownership parityをruntimeで確認する。
- 根拠: `specification.md` §9、§13、§14.2、`binding-implementation.md`、既存IR-006
- 影響: aliasやheader compileだけでは、成功時のowned buffer内容・解放契約・Binding固有の失敗経路の退行を独立検出できない。

### IR-007

- Priority: Minor
- Status: Open
- 対象箇所: `src/store.rs` の公開`generate_software_key`経路と関連テスト
- 改善内容: 公開APIから乱数源失敗・候補妥当性失敗・保存失敗を確認し、error propagation、入力Store不変、replacement Store非返却を検証する。
- 根拠: `specification.md` §14.2、`requirements.md` AC-005、既存IR-007
- 影響: 内部helperの失敗テストだけでは、公開mutationのfailure wiringとatomicityの退行を独立検出できない。

### IR-014

- Priority: Minor
- Status: Open
- 対象箇所: `src/wasm.rs:57-65`、`tests/unit/wasm.rs`
- 改善内容: WASM公開API経由で16 MiB以内と超過のStore入力を確認し、上限超過が`InvalidStore`となることをruntimeで検証する。
- 根拠: `wallet-store-format-v1.md` §2.2、既存IR-014
- 影響: Core側の上限テストだけでは、WASMのallocation前検査が削除・移動された退行を検出できない。

## Resolved Findings

### IR-001

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `src/crypto.rs`の署名経路、`Cargo.toml`/`Cargo.lock`、`docs/specifications/specification.md` §12.1
- 対応確認: 現行仕様が第三者ライブラリ内部算術temporaryの完全消去を保証対象外とし、`curve25519-dalek 4.1.3`をregistry依存として使用している。

### IR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `Cargo.toml:22`、`src/crypto.rs`
- 対応確認: BIP39 `zeroize` featureとMnemonic/entropy/seedの現行消去経路を確認した。

### IR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `src/store.rs:1023-1055`
- 対応確認: originの全early-return前にprivate keyを`Zeroizing` ownerで保持し、正常時だけKeyRecordへ移す実装を確認した。

### IR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `src/store.rs`のenum/fixed-field parser、`tests/unit/store.rs`
- 対応確認: unknown enumと固定値不一致をwarning skipせずfatal `InvalidStore`とする実装・テストを確認した。

### IR-005

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: `tests/unit/store.rs`のAAD/tag/semantic mismatch/atomicityテスト
- 対応確認: ciphertext/tag/AAD改変、意味的不一致、主要read/mutation失敗時のStore不変性を確認した。

### IR-008

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-002`
- 対象箇所: `src/store.rs` fixed field parser、`tests/unit/store.rs`
- 対応確認: `duplicate_tag`、`private_key`等の型・長さ不正をfatalとして扱う実装・テストを確認した。

### IR-009

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-004`
- 対象箇所: Pending parser/finalize経路、関連テスト
- 対応確認: authenticated PendingのProfile ID衝突を`PendingProfileInvalid`とする実装・テストを確認した。

### IR-010

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-006`
- 対象箇所: `src/crypto.rs:51-59`、random failure test
- 対応確認: 乱数源の部分書込み失敗でも出力ownerをzeroizeする実装・テストを確認した。

### IR-011

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-007`
- 対象箇所: `src/wasm.rs:72-110`
- 対応確認: JavaScript Numberの有限性・整数性・network/chain/account index範囲を狭い型への変換前に検証している。

### IR-012

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-007`
- 対象箇所: `bindings/native/src/lib.rs:365-373`
- 対応確認: `out_mnemonic == out_pending`を拒否し、既存outputを上書きしない実装・テストを確認した。

### IR-013

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-007`
- 対象箇所: `src/store.rs:194-201`、`bindings/native/src/lib.rs:392-395,489-492`
- 対応確認: Mnemonic/PendingおよびMnemonic exportのRust-side bufferを`mem::take`で所有権移動する実装を確認した。

## Deferred Findings

なし

## Specification Conformance

- 適合している要件: 現行仕様§4.2、§5.3、§6-§9、§11-§14に関係するHD/Chain/Network、暗号Store、raw byte境界、WASM入力検証、Native alias処理、atomicityおよび秘密情報ownerの主要経路。
- 不適合の要件: なし。IR-006、IR-007、IR-014は実装不適合ではなく、独立検証証拠の不足として継続する。
- 実装されていない要件: なし
- 仕様が曖昧で判定できない要件: なし

## Test Evaluation

- 十分に検証されている範囲: Symbol/NEMの鍵・address・signature・HD fixture、CBOR/AAD/Store malformed・semantic mismatch・atomicity、WASM入力の主要境界、Native C ABIの主要Core parity、通常C runtime。
- カバレッジ: 未計測。CIにはline/function 90%、branch 85%（informational）の基準がある。
- 不足しているテスト: IR-006、IR-007、IR-014のとおり。Native成功時secret ownership、公開Generated failure、WASM Store pre-allocation limitの独立検証が不足している。
- fixture または期待値の問題: なし
- 実行されていない検証: WASM runtime test、Native sanitizer runtime、coverage計測、外部ネットワーク/SDKを用いた追加検証

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | 現行実装の不適合なし。IR-001、IR-003、IR-011、IR-012はResolved。 |
| セキュリティ | 合格 | 認証・秘密情報owner・乱数・Binding境界にCritical/Majorの現行不備なし。 |
| 相互運用性とプロトコル | 合格 | Symbol/NEM、Mainnet/Testnet、HD、CBOR/AAD、署名およびDTO/error mappingに不一致なし。 |
| 処理と異常系 | 合格 | malformed Store、入力範囲、alias、主要atomicityを確認。残りはMinorの検証証拠不足。 |
| テスト十分性 | 合格 | 実行済みのCore/Nativeテストは成功。IR-006/007/014は具体的なMinor不足として記録。 |
| 変更範囲内の品質 | 合格 | fmt、Clippy、workspace test、WASM check、Native C ABI runtime testが成功。 |

## Remaining Risks

- Native成功時のMnemonic/PendingおよびMnemonic exportのownership/free runtime検証が限定的である。
- WASM runtime、Native sanitizer、coverageを今回実行していない。
- 作業ツリーの未コミット `tests/unit/store.rs` 変更は本レビューの実装判定に含めていない。

## Final Decision

公開可能。

現行 `bindings/` と `src/` にCritical/Majorの採用指摘はなく、品質ゲートはすべて合格とした。
Minorの既存IR-006、IR-007、IR-014は検証証拠の不足として継続管理する。

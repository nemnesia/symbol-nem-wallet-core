# Implementation Review Findings

## Review Target

- 対象: `HEAD 744fad93569f2d4bd26505689ac2238ecc38195f` の `bindings/`、`src/` および関連テスト
- 確認日: 2026-08-23 11:00 +0900
- レビュー範囲: `f8ad095` 以降の `tests/unit/wasm.rs:103-141` の変更、直接対応する `bindings/native/src/lib.rs` と `src/wasm.rs`、関連仕様、既存 IR-001〜IR-015
- 未確認範囲: coverage 計測、Native sanitizer runtime、外部ネットワークまたは外部 SDK を用いた追加検証
- 成果物: `docs/reviews/implementation/implement-review-010.md`

## Execution Audit

- 実行モード: `spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A 識別子: `01a02c29-d3f9-7572-96f1-4b610ecbde08`
- Reviewer B 識別子: `01a02c29-f269-78e1-8d72-3a22ba743d80`
- Reviewer C 識別子: `01a02c2a-0ea5-7203-a219-41dc995dce86`
- Reviewer D 識別子: `01a02c2a-3103-7aa1-9ab7-55f8ec39e2fd`
- 起動再試行: なし
- Phase 1: 完了。4名を個別に `wait_agent` で確認
- Phase 2: 完了。同じ4名へ個別に follow-up を送信し、4名を個別に `wait_agent` で確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `tests/unit/wasm.rs:103-141` | 秘密値比較の失敗診断が固定文言となっていること、fixture の bytes/hex 比較を確認 |
| 実装コードまたは差分 | `bindings/native/src/lib.rs:357-398,479-500` | Native の output ownership、free、export 境界に今回の退行がないことを確認 |
| 実装コードまたは差分 | `src/wasm.rs:57-65,281-305` | WASM の Store 上限検査と秘密 DTO byte 境界に今回の退行がないことを確認 |
| テストまたは fixture | `cargo test --workspace --all-features`、WASM runtime、Native C ABI runtime | 現行 HEAD の検証結果を確認 |
| 承認済み仕様 | `docs/specifications/specification.md` §9、§12-§14 | Binding、秘密情報、fixture およびテスト診断の契約を確認 |
| 承認済み仕様 | `docs/specifications/wallet-store-format-v1.md` §2.2 | Wallet Store 最大サイズ境界を再確認 |
| 設計判断・既存レビュー | `docs/decisions/binding-implementation.md`、`docs/reviews/implementation/implement-review-009.md` | ownership、公開境界、既存 IR の状態を再確認 |

確認できない事実は未確認として扱い、今回の変更範囲を越える追加要求は採用しなかった。

## Review Result

公開可能

## Summary

今回の変更は WASM テスト失敗時の秘密値診断を固定文言へ変更するもので、前回 IR-015 を解消している。
4名の独立レビューで、今回差分または直接の `bindings/`・`src/` 境界に新規の仕様、セキュリティ、相互運用性、品質上の正式指摘は確認されなかった。
IR-006 と IR-014 は解消済みの状態を維持し、IR-007 は今回の変更範囲外の Minor として継続する。
品質ゲートはすべて合格し、現行判定は公開可能とする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | Resolved | `implement-review-001` | 現行仕様 §12.1 の適用範囲と依存構成に適合している。 |
| IR-002 | Major | Resolved | `implement-review-001` | Mnemonic/seed の zeroize 経路に退行なし。 |
| IR-003 | Major | Resolved | `implement-review-001` | malformed payload の秘密鍵 owner が `Zeroizing` で保持される。 |
| IR-004 | Minor | Resolved | `implement-review-001` | enum/fixed-field 不正を fatal `InvalidStore` とする。 |
| IR-005 | Minor | Resolved | `implement-review-001` | AAD/tag/semantic mismatch と主要 atomicity を確認した。 |
| IR-006 | Minor | Resolved | `implement-review-001` | Native ownership/free と WASM 公開 API parity のテストが存在し、今回の変更による退行はない。 |
| IR-007 | Minor | Open | `implement-review-001` | 公開 `generate_software_key` の failure injection/atomicity の独立証拠は未追加。 |
| IR-008 | Minor | Resolved | `implement-review-002` | fixed field 不正を fatal とする。 |
| IR-009 | Minor | Resolved | `implement-review-004` | authenticated Pending の Profile ID 衝突分類を確認した。 |
| IR-010 | Major | Resolved | `implement-review-006` | 乱数源失敗時の出力 owner zeroize を確認した。 |
| IR-011 | Major | Resolved | `implement-review-007` | WASM 数値入力を狭い型へ変換する前に検証する。 |
| IR-012 | Major | Resolved | `implement-review-007` | Native prepare の同一 output pointer alias を拒否する。 |
| IR-013 | Minor | Resolved | `implement-review-007` | Mnemonic/Pending/export の所有権移動を確認した。 |
| IR-014 | Minor | Resolved | `implement-review-007` | 公開 `list_profiles` 経由の最大値・超過値 runtime test が成功している。 |
| IR-015 | Minor | Resolved | `implement-review-009` | 秘密値比較の失敗時診断を固定文言へ変更し、今回 runtime test も成功した。 |

## Required Changes

なし

## Optional Improvements

### IR-007

- Priority: Minor
- Status: Open
- 対象箇所: 公開 `generate_software_key` 経路と関連テスト
- 改善内容: 公開 API から乱数源失敗、候補妥当性失敗、保存失敗を確認し、error propagation、入力 Store 不変、replacement Store 非返却を独立検証する。
- 根拠: `docs/specifications/specification.md` §14.2、`docs/requirements/requirements.md` AC-005、既存 IR-007
- 影響: 内部 helper の失敗テストだけでは、公開 mutation の failure wiring と atomicity の退行を独立検出できない。

## Resolved Findings

### IR-001

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: 署名経路、依存構成、仕様 §12.1
- 対応確認: 第三者暗号ライブラリ内部の算術 temporary は現行仕様の完全消去保証対象外であり、適用範囲に反する local patch は存在しない。

### IR-002

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: BIP39 feature と Mnemonic/entropy/seed の処理
- 対応確認: BIP39 の zeroize feature と既存の秘密情報消去経路に退行がない。

### IR-003

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: malformed payload の private key parse 経路
- 対応確認: origin 検証の early return を含め、private key は `Zeroizing` owner で保持される。

### IR-004

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: enum/fixed-field parser
- 対応確認: unknown enum と固定値不一致を warning skip せず fatal `InvalidStore` とする。

### IR-005

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: AAD/tag/semantic mismatch と mutation atomicity
- 対応確認: 改変、意味的不一致、主要 read/mutation 失敗時の Store 不変性を確認した。

### IR-006

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-001`
- 対象箇所: Native C ABI と WASM 公開境界
- 対応確認: `caller_runtime.c` の Native prepare/export ownership/free、`tests/unit/wasm.rs` の Pending finalize と Mnemonic export を確認済みで、今回の診断修正による退行もない。WASM runtime は 2 tests passed、Native C ABI runtime は exit code 0 だった。

### IR-008

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-002`
- 対象箇所: Store fixed-field parser
- 対応確認: duplicate tag、private key 等の型・長さ不正を fatal とする。

### IR-009

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-004`
- 対象箇所: Pending parser/finalize 経路
- 対応確認: authenticated Pending の Profile ID 衝突を `PendingProfileInvalid` とする。

### IR-010

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-006`
- 対象箇所: random failure path
- 対応確認: 乱数源の部分書込み失敗でも出力 owner を zeroize する。

### IR-011

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-007`
- 対象箇所: `src/wasm.rs` の network/chain/account index 入力
- 対応確認: JavaScript Number の有限性・整数性・範囲を狭い型への変換前に検証する。

### IR-012

- Priority: Major
- Status: Resolved
- 初出レビュー: `implement-review-007`
- 対象箇所: `bindings/native/src/lib.rs` の prepare output
- 対応確認: `out_mnemonic == out_pending` を拒否し、既存 output を上書きしない。

### IR-013

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-007`
- 対象箇所: prepare/export の Rust-side buffer
- 対応確認: `mem::take` による所有権移動と DTO drop の zeroize を確認した。

### IR-014

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-007`
- 対象箇所: `src/wasm.rs:57-65`、`tests/unit/wasm.rs:357-371`
- 対応確認: 16 MiB ちょうどを公開 `list_profiles` で受理し、1 byte 超過を `InvalidStore` として拒否する WASM runtime test が成功している。

### IR-015

- Priority: Minor
- Status: Resolved
- 初出レビュー: `implement-review-009`
- 対象箇所: `tests/unit/wasm.rs:103-141`
- 対応確認: Mnemonic/private key の比較失敗時に秘密値を `assert_eq!` や Debug 診断へ渡さず、固定メッセージだけを panic する実装へ変更した。WASM runtime の2テストが成功した。

## Deferred Findings

なし

## Specification Conformance

- 適合している要件: Binding の owned buffer 契約、WASM の byte/error 境界、Wallet Store の 16 MiB 上限、Symbol/NEM・Chain/Network、CBOR/AAD、秘密情報 owner、テスト失敗時の秘密値非露出および主要 atomicity。
- 不適合の要件: なし。IR-007 は実装不適合ではなく、公開 failure 経路の独立検証証拠不足である。
- 実装されていない要件: なし
- 仕様が曖昧で判定できない要件: なし

## Test Evaluation

- 十分に検証されている範囲: `cargo test --workspace --all-features`（Core 42、integration 5、Native API 2）、WASM runtime（2）、Native C ABI runtime、WASM Store 境界、Native prepare/export 境界、秘密値比較の失敗診断修正。
- カバレッジ: 未計測。CI の coverage 数値は今回確認していない。
- 不足しているテスト: IR-007 のとおり、公開 `generate_software_key` の failure injection/atomicity の独立検証が残る。
- fixture または期待値の問題: fixture の値、hex/bytes 変換、プロトコル期待値に問題は確認されなかった。
- 実行されていない検証: coverage、Native sanitizer runtime、外部ネットワーク/SDK を用いた追加検証

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | 今回差分の仕様不適合なし。IR-015 を解消確認。 |
| セキュリティ | 合格 | 秘密値の panic/Debug 診断露出を修正済みで、Critical/Major の不備なし。 |
| 相互運用性とプロトコル | 合格 | Mnemonic bytes、private key fixture、Symbol/NEM、Chain/Network、DTO/error mapping に不一致なし。 |
| 処理と異常系 | 合格 | 既存の Pending finalize、Store 上限、Native alias、主要 atomicity に今回の退行なし。 |
| テスト十分性 | 合格 | workspace、WASM、Native C ABI の検証が成功し、今回の変更経路を確認した。残存 IR-007 は Minor の独立証拠不足である。 |
| 変更範囲内の品質 | 合格 | fmt、Clippy、workspace test、WASM check/runtime、Native C ABI runtime が成功した。 |

## Remaining Risks

- 公開 `generate_software_key` の failure injection/atomicity の独立検証は未追加である（IR-007）。
- coverage、Native sanitizer、外部ネットワーク/SDK 検証は今回実施していない。

## Final Decision

公開可能。

今回の変更による Critical/Major の不備はなく、前回 IR-015 は実行検証を含めて解消した。
IR-007 は Minor の継続課題として記録する。

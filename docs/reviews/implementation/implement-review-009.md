# Implementation Review Findings

## Review Target

- 対象: `HEAD 7220a836611f8b8914e3f2bc3670a04e6a376a68` の `bindings/`、`src/` および今回追加された境界テスト
- 確認日: 2026-08-23 10:00 +0900
- レビュー範囲: `bindings/native/tests/caller_runtime.c`、`tests/unit/wasm.rs` の `d196d8f` 以降の変更、直接呼び出される `bindings/native/src/lib.rs` と `src/wasm.rs`、関連仕様、既存 IR-001〜IR-014
- 未確認範囲: coverage 計測、Native sanitizer runtime、外部ネットワークまたは外部 SDK を用いた追加検証
- 成果物: `docs/reviews/implementation/implement-review-009.md`

## Execution Audit

- 実行モード: `spawn_agent` で起動した4つの独立した Reviewer サブエージェント
- Reviewer A 識別子: `01a02c09-e2b6-7e51-835e-6e7eff64aff7`
- Reviewer B 識別子: `01a02c09-fc47-7c01-a2ed-ec00ca05c77e`
- Reviewer C 識別子: `01a02c0b-1eeb-7752-b6f7-11155e1fbf8b`
- Reviewer D 識別子: `01a02c0b-36fd-7aa2-9661-acb6337a1206`
- 起動再試行: なし
- Phase 1: 完了。4名を個別に `wait_agent` で確認
- Phase 2: 完了。同じ4名へ個別に follow-up を送信し、4名を個別に `wait_agent` で確認
- Chair 統合: 完了

## Evidence Used

| 種別 | 参照箇所 | 用途 |
| --- | --- | --- |
| 実装コードまたは差分 | `bindings/native/tests/caller_runtime.c:39-99` | Native prepare/export の成功時 owned buffer、内容、free の確認 |
| 実装コードまたは差分 | `tests/unit/wasm.rs:37-71,73-109,357-371` | WASM の Pending finalize、Mnemonic export、Store 最大サイズ境界の確認 |
| 実装コードまたは差分 | `bindings/native/src/lib.rs:357-398,479-500` | Native output alias、所有権移動、export 境界の照合 |
| 実装コードまたは差分 | `src/wasm.rs:57-65,281-305` | WASM の allocation 前 Store 上限検査と秘密 DTO の byte 境界の照合 |
| テストまたは fixture | `cargo test --workspace --all-features`、WASM runtime test、Native C ABI runtime | 追加テストを含む実行結果の確認 |
| 承認済み仕様 | `docs/specifications/specification.md` §9、§12-§14 | Binding、秘密情報、テストおよび error 契約の確認 |
| 承認済み仕様 | `docs/specifications/wallet-store-format-v1.md` §2.2 | Wallet Store 最大サイズ境界の確認 |
| 設計判断・既存レビュー | `docs/decisions/binding-implementation.md`、`docs/decisions/open-001.md`、`docs/reviews/implementation/implement-review-008.md` | ownership、公開境界、既存 IR の状態確認 |

確認できない事実は未確認として扱い、仕様外の追加要求は採用しなかった。

## Review Result

公開可能

## Summary

現行 `bindings/` と `src/` に Critical または Major の新規不適合は確認されなかった。
追加された Native C ABI と WASM の境界テストは実行に成功し、前回 IR-006 と IR-014 の未確認範囲を解消した。
一方、WASM テストの秘密値比較が失敗した場合、panic 診断へ秘密値が含まれ得る Minor 指摘 IR-015 を採用した。
IR-007 は今回の変更範囲外であり、公開 generate failure の独立検証不足として継続する。
品質ゲート規則により、現行判定は公開可能とする。

## Finding Status

| ID | Priority | Status | 初出レビュー | 今回の確認 |
| --- | --- | --- | --- | --- |
| IR-001 | Major | Resolved | `implement-review-001` | 現行仕様 §12.1 の適用範囲と依存構成に適合している。 |
| IR-002 | Major | Resolved | `implement-review-001` | Mnemonic/seed の zeroize 経路に退行なし。 |
| IR-003 | Major | Resolved | `implement-review-001` | malformed payload の秘密鍵 owner が `Zeroizing` で保持される。 |
| IR-004 | Minor | Resolved | `implement-review-001` | enum/fixed-field 不正を fatal `InvalidStore` とする。 |
| IR-005 | Minor | Resolved | `implement-review-001` | AAD/tag/semantic mismatch と主要 atomicity を確認した。 |
| IR-006 | Minor | Resolved | `implement-review-001` | Native 成功時の output 内容・非 alias・free、WASM 公開 API の主要 parity を追加テストで確認した。 |
| IR-007 | Minor | Open | `implement-review-001` | 公開 `generate_software_key` の failure injection/atomicity の独立証拠は今回も未追加。 |
| IR-008 | Minor | Resolved | `implement-review-002` | fixed field 不正を fatal とする。 |
| IR-009 | Minor | Resolved | `implement-review-004` | authenticated Pending の Profile ID 衝突分類を確認した。 |
| IR-010 | Major | Resolved | `implement-review-006` | 乱数源失敗時の出力 owner zeroize を確認した。 |
| IR-011 | Major | Resolved | `implement-review-007` | WASM 数値入力を狭い型へ変換する前に検証する。 |
| IR-012 | Major | Resolved | `implement-review-007` | Native prepare の同一 output pointer alias を拒否する。 |
| IR-013 | Minor | Resolved | `implement-review-007` | Mnemonic/Pending/export の所有権移動を確認した。 |
| IR-014 | Minor | Resolved | `implement-review-007` | 公開 `list_profiles` 経由の最大値・超過値 runtime test が成功した。 |
| IR-015 | Minor | New | `implement-review-009` | 秘密値の `assert_eq!` 失敗診断への露出経路がある。 |

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

### IR-015

- Priority: Minor
- Status: New
- 対象箇所: `tests/unit/wasm.rs:106-108,139-141`
- 改善内容: Mnemonic と private key の同値性検証が失敗した場合でも、秘密 byte 列または秘密値の文字列表現を panic/Debug 診断へ含めないようにする。
- 根拠: `docs/specifications/specification.md` §12.2、§14.2
- 影響: テスト失敗時の runner 出力へ秘密情報が含まれる可能性がある。

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
- 対応確認: `caller_runtime.c:39-99` で prepare/export の成功時 owned buffer 内容、非 alias、free を実行し、`wasm.rs:73-109` で Pending finalize と Mnemonic export を公開 API 経由で実行した。WASM runtime は 2 tests passed、Native C ABI runtime は exit code 0 だった。

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
- 対応確認: 16 MiB ちょうどを公開 `list_profiles` で受理し、1 byte 超過を `InvalidStore` として拒否する WASM runtime test が成功した。

## Deferred Findings

なし

## Specification Conformance

- 適合している要件: Binding の owned buffer 契約、WASM の byte/error 境界、Wallet Store の 16 MiB 上限、Symbol/NEM・Chain/Network、CBOR/AAD、秘密情報 owner および主要 atomicity。
- 不適合の要件: テスト失敗時の秘密値診断出力に関する `specification.md` §12.2・§14.2（IR-015、Minor）。実装の外部可視 API 不適合はなし。
- 実装されていない要件: なし
- 仕様が曖昧で判定できない要件: なし

## Test Evaluation

- 十分に検証されている範囲: `cargo test --workspace --all-features`（Core 42、integration 5、Native API 2）、WASM runtime（2）、Native C ABI runtime、WASM Store 境界、Native prepare/export 境界。
- カバレッジ: 未計測。CI の coverage 数値は今回確認していない。
- 不足しているテスト: IR-007 のとおり、公開 `generate_software_key` の failure injection/atomicity の独立検証が残る。
- fixture または期待値の問題: fixture の値またはプロトコル期待値に問題は確認されなかった。IR-015 は期待値ではなく失敗診断の問題である。
- 実行されていない検証: coverage、Native sanitizer runtime、外部ネットワーク/SDK を用いた追加検証

## Review Gates

| Gate | 結果 | 根拠 |
| --- | --- | --- |
| 仕様適合性 | 合格 | Critical/Major の不適合なし。IR-006、IR-014 を解消確認。 |
| セキュリティ | 合格 | IR-015 は Minor のテスト診断問題として記録した。秘密情報 owner、乱数、認証境界に Critical/Major の不備なし。 |
| 相互運用性とプロトコル | 合格 | Symbol/NEM、Chain/Network、CBOR/AAD、DTO/error mapping に不一致なし。 |
| 処理と異常系 | 合格 | Pending finalize、Store 上限、Native alias、主要 atomicity を確認した。 |
| テスト十分性 | 合格 | 追加した Native/WASM 境界テストを実行し成功した。残存する IR-007 は Minor の独立証拠不足である。 |
| 変更範囲内の品質 | 合格 | fmt、Clippy、workspace test、WASM check/runtime、Native C ABI runtime が成功した。 |

## Remaining Risks

- テスト失敗時に秘密値を診断へ含め得る IR-015 が残っている。
- 公開 `generate_software_key` の failure injection/atomicity の独立検証は未追加である。
- coverage、Native sanitizer、外部ネットワーク/SDK 検証は今回実施していない。

## Final Decision

公開可能。

現行 `bindings/` と `src/` に Critical/Major の採用指摘はなく、全品質ゲートを合格とした。
IR-015 と既存 IR-007 は Minor の継続課題として記録する。

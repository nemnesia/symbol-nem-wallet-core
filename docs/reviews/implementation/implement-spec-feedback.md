# 実装から仕様書への改善依頼

- 対象仕様: `docs/specifications/specification.md` v1（HEAD `2b197ba`）および `docs/specifications/wallet-store-format-v1.md`
- 実装対象: Rust Wallet Core v1
- 作成日時: 2026-08-20T00:00:00Z
- 作成者: blockchain-implementer

## INTEROP-001: NEM HD root HMAC key と symbol-sdk 3.3.2 の規範が不一致

- 分類: INTEROP
- 該当箇所: `docs/specifications/specification.md` §4.2
- 確認できた事実: 仕様 §4.2 は root HMAC key を全 Chain 共通で UTF-8 `"ed25519 seed"` と規定している。一方、リポジトリ内の `_symbol/sdk/javascript/src/facade/NemFacade.js`（`symbol-sdk` 3.3.2）は `BIP32_CURVE_NAME = 'ed25519-keccak'` を規定し、`Bip32` は `${curveName} seed` を root HMAC key とする。これは仕様書（規範仕様）と SDK 実装（互換性基準）の競合である。
- 未決定または矛盾: NEM Derived Software Key の root HMAC key を `"ed25519 seed"` とするか `"ed25519-keccak seed"` とするか、仕様だけでは SDK 3.3.2 互換との関係を一意に決定できない。
- 実装への影響: NEM の同一 Mnemonic / path から得られる private key、public key、address、signature が変わる。`derive_software_key` と NEM の互換性 fixture を一意に確定できない。
- 仕様書作成者に求める決定: Chain ごとの root HMAC key を明記し、NEM の `symbol-sdk` 3.3.2 `NemFacade.BIP32_CURVE_NAME` との互換性を含む規範 fixture として確定する。Symbol と NEM で同一 key を採用する場合は、SDK 互換性基準との関係を明示する。
- 推奨案: NEM は `"ed25519-keccak seed"`、Symbol は `"ed25519 seed"` として Chain ごとに固定し、各 Chain の `6.test-hd-derivation.json` と最終 private/public key を fixture 化する。
- 暫定対応: NEM HD 導出は未実装。仕様更新まで、NEM を含む Derived Software Key の互換性を完了扱いにしない。
- 検証条件: 24-word BIP39 mnemonic、seed、path、root/child chain code、最終 private key、public key が各 Chain の承認済み fixture と一致し、NEM は `NemFacade` 3.3.2 の結果と一致する。

## CRITICAL-001: Chain をまたぐ同一 private key の重複方針が未確定

- 分類: CRITICAL
- 該当箇所: `docs/specifications/specification.md` §5.3、§14.2、§17; `docs/specifications/wallet-store-format-v1.md` §9; `docs/reviews/specifications/specification-review-005.md` SR-014
- 確認できた事実: 現行仕様は「同一 Chain かつ同一 private key」のみを `DuplicateSoftwareKey` とし、異なる Chain の同一 private key を別 Software Key として許可する。一方、現行要件 `FR-018`、`DR-007`、`AC-020` は同一 Profile 内の同一秘密鍵を Chain によらず重複管理しないと読める。仕様レビュー SR-014 はこの競合を未解決の Major として記録している。
- 未決定または矛盾: 同一 Profile で同一 raw private key を Symbol と NEM の両方へ登録した場合の登録可否、error code、保存状態が一意に定まらない。
- 実装への影響: Imported / Generated / Derived の登録、duplicate 判定、受入テストの結果が分岐する。Testnet では同じ Mnemonic / account index が同じ private key を生成し得るため、通常経路にも影響する。
- 仕様書作成者に求める決定: 要件・仕様・保存形式・受入テストで、Chain をまたぐ同一 private key の重複判定範囲と期待結果を統一する。
- 推奨案: 既存の保存形式仕様および現行仕様を維持する場合は「同一 Profile・同一 Chain・同一 private key」を正式な重複条件として要件側を修正する。これは提案であり、実装で決定しない。
- 暫定対応: 同一 Chain の重複判定は実装対象とする。Chain をまたぐケースは仕様確定まで互換性・受入完了を主張しない。
- 検証条件: Symbol/NEM の同一 raw private key 登録ケースについて、登録可否、返却 error、`key_id`、replacement Store および再読込結果を仕様・要件・fixture が同じ期待値で判定できる。

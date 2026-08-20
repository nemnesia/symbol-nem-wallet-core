# 実装から仕様書への改善依頼

- 対象仕様: `docs/specifications/specification.md` v1（HEAD `89069e1`）および `docs/specifications/wallet-store-format-v1.md`
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

## INTEROP-002: software_key_indexの未知field保持とAAD再暗号化方針が競合

- 分類: INTEROP
- 該当箇所: `docs/specifications/wallet-store-format-v1.md` §2、§7.1、§11; `docs/specifications/specification.md` §11
- 確認できた事実: 保存フォーマットは未知fieldをdecoderが無視し、再保存時に保持しないと規定する。一方、AADは`ProfileEnvelopeV1` key `6`の実際の`software_key_index`配列を同じ要素順・整数keyで使用し、mutationは要求対象Profileのenvelopeだけを置換して他Profileの暗号化payload等を変更しないと規定する。
- 未決定または矛盾: 未知fieldを含むProfileを別Profileのmutation時に再保存する場合、未知fieldを削除するとAADが変化する。対象外Profileを再暗号化せずに認証を維持するには未知fieldを保持する必要があり、「再保存時に保持しない」と両立しない。
- 実装への影響: 実装は受信した`software_key_index`のwire値をAAD用に保持し、非対象Profileの再保存時もその値を保持する。対象Profileを再暗号化するmutationでは、payloadから生成したcanonical indexへ置換する。仕様を確定しない場合、unknown fieldを含むStoreのmutation後互換性を一意に保証できない。
- 仕様書作成者に求める決定: unknown fieldを含むProfileの別Profile mutation時について、(a)対象外Profileのwire値を保持する、(b)対象外Profileも再暗号化してunknown fieldを削除する、または(c)該当Storeを拒否する、のいずれかを仕様・atomicity・AAD規定で統一する。
- 推奨案: `software_key_index`のようにAADへ含まれるfieldは、対象Profile以外では受信wire値を保持し、対象Profileのmutation成功時だけcanonical値へ更新する。unknown fieldの再保存禁止を維持する場合は、対象外Profileの再暗号化を許可するmutation契約へ変更する。
- 暫定対応: `src/store.rs`の`ProfileEnvelope.aad_software_key_index`で受信wire値を保持し、decoderでProfile/index/payloadのcanonical orderを検証する。`reencrypt_profile`では対象Profileだけcanonical indexへ更新し、`profile_to_value`では非対象ProfileのAAD整合性を優先してwire値を保持する。
- 検証条件: unknown fieldを含むProfileと別Profileのmutationを組み合わせ、対象外Profileのciphertext/tag/AAD認証が維持されること、対象Profileのmutation後は仕様で確定したunknown field方針と一致することを固定fixtureで確認する。

## 解決状況

- `INTEROP-001`: 解決済み。仕様 §4.2 が Symbol の `"ed25519 seed"`、NEM の `"ed25519-keccak seed"`、および NEM 最終 private key の reverse を明記したため、`symbol-sdk` 3.3.2 と照合可能になった。
- `CRITICAL-001`: 解決済み。仕様・要件・保存形式が、同一 Profile・同一 Chain・同一 private key のみを重複とし、異なる Chain の同一 private key を別 Software Key として許可する方針で統一された。
- `INTEROP-002`: 解決済み。`specification.md` §6.3、§7、§11、§14.2 および `wallet-store-format-v1.md` §2、§7.1、§11 が、unknown field を論理モデル・一覧結果・意味検証へ取り込まず、対象外 Profile の受信 `software_key_index` wire 値を AAD と保存値へ保持し、対象 Profile を保持する成功 mutation では canonical index へ更新して unknown field を除去する規則を定義した。Profile delete は対象 envelope を除去する。非対象 Profile の暗号文・tag・AAD維持、および対象 Profile の canonical 化を検証条件へ追加した。

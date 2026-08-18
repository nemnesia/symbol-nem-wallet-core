# symbol-nem-wallet-core v1 仕様設計書

## 1. 目的

本書は `docs/requirements/requirements.md` を実装可能な仕様へ具体化する v1 の設計正本である。

対象は Rust Wallet Core と Native / WASM Binding の境界までとし、Wallet UI、Network、Transaction 構築、OS Keychain / Secure Enclave / TPM、Hardware Wallet、External Signer は扱わない。

本書の仕様は次を満たすことを前提とする。

- Profile は Mainnet / Testnet のいずれかに固定する。
- Profile は Symbol / NEM の Chain には固定しない。
- すべての Software Key は Symbol / NEM のいずれかの Chain に固定する。
- 1 Profile = 1 Mnemonic + 0..n Software Key とする。
- Profile 配下の秘密情報は 1 つの Profile パスワードで保護する。
- 保存済み Mnemonic / 秘密鍵を通常 API で返さず、正しい Profile パスワードを伴う明示的な個別エクスポートだけで返す。
- 秘密情報を必要とする処理は毎回 Profile パスワードを要求し、継続的な unlocked state を持たない。
- Native / WASM で同じ Core ロジックを使用する。

---

## 2. 設計原則

### 2.1 Core が所有する責務

Core は次を所有する。

- Mnemonic の生成・検証・seed 化
- HD 導出
- Software Key の生成・インポート・重複判定
- Symbol / NEM の公開鍵・アドレス生成
- Symbol / NEM の署名
- Profile パスワード認証
- 秘密情報の暗号化・復号
- 保存データの整合性検証
- Profile / Software Key の状態遷移
- atomic 更新用の新しい保存イメージ生成
- 正しい Profile パスワードを要求する Mnemonic / Software Key 秘密鍵の個別エクスポート
- Native / WASM へ公開する共通 API 契約

### 2.2 Core が所有しない責務

Core は次を行わない。

- Transaction の構築・意味解釈
- REST / WebSocket / announce
- Password strength UI または password policy 判定
- Browser Storage / filesystem の選択
- Profile データのバックアップ UI・同期・移行サービス
- 個別エクスポート結果の表示・保管・紛失防止
- 署名要求が利用者の意図に沿うかの UI 判定

### 2.3 保存方式の基本方針

Core は保存先そのものを所有せず、**opaque な Wallet Store blob** の読み込み・更新を行う。

上位層は blob を永続化できるが、内部の秘密情報管理ロジックは実装しない。

```text
Application / Binding
    │
    │ WalletStoreBlob (opaque bytes)
    ▼
Rust Wallet Core
    ├─ Manifest validation
    ├─ Profile lookup
    ├─ decrypt / operate / zeroize
    └─ replacement WalletStoreBlob
```

状態変更 API は既存 blob を受け取り、新しい完全な replacement blob を返す。上位層は temporary file + rename、IndexedDB transaction 等、その環境で利用可能な atomic replacement を使用する。

Core は「更新途中の一部分だけ」を外部へ返さない。

Wallet Store の wire-level 仕様の正本は `docs/specifications/wallet-store-format-v1.md` とする。本書と保存フォーマット仕様に重複する記述がある場合、wire 表現については `wallet-store-format-v1.md` を優先する。

---

## 3. 識別子と列挙型

### 3.1 ProfileId

- 128 bit random UUID 相当値を使用する。
- CSPRNG で生成する。
- Mnemonic、公開鍵、アドレスから導出しない。
- 外部表現は lowercase UUID string とする。
- Wallet Store 内では raw 16 bytes として保存する。

### 3.2 SoftwareKeyId

- 128 bit random UUID 相当値を使用する。
- CSPRNG で生成する。
- 秘密鍵または公開鍵そのものを ID として使用しない。
- Wallet Store 内では raw 16 bytes として保存する。

### 3.3 Network

```text
0 = Testnet
1 = Mainnet
```

Profile 作成時に固定する。変更 API は提供しない。

上記の数値は Wallet Store の wire 値であり、一度割り当てた値の意味を変更・再利用しない。

### 3.4 Chain

```text
0 = Nem
1 = Symbol
```

Chain は Profile 属性ではなく Software Key の必須属性とする。Software Key は生成・インポート・導出時に Chain を固定し、登録後に変更しない。

公開鍵・アドレス生成および署名では Software Key に保存された Chain を使用し、呼び出し側から別 Chain を指定して同一 Software Key を利用することはできない。

上記の数値は Wallet Store の wire 値であり、一度割り当てた値の意味を変更・再利用しない。

### 3.5 SoftwareKeyOrigin

```text
0 = Derived { account_index }
1 = Imported
2 = Generated
```

Software Key の Chain は `origin` とは独立した必須属性として保持する。

Derived Software Key は `derivation_path` を永続保存しない。導出 path は Profile に固定された Network、Software Key に固定された Chain、`account_index`、Profile schema version から Core が決定する。

---

## 4. Mnemonic / HD Wallet

### 4.1 Mnemonic 標準

v1 は BIP39 Mnemonic を使用する。

生成・復元ともに次へ固定する。

- wordlist: English
- entropy: 256 bit
- words: 24 words
- checksum: BIP39
- CSPRNG: Rust `getrandom` が提供する OS / Web Crypto 対応乱数源

復元時も BIP39 checksum を検証し、有効な English 24 words mnemonic のみ受け付ける。12 / 15 / 18 / 21 words は v1 では受け付けない。

BIP39 optional passphrase は v1 ではサポートしない。Mnemonic から seed を生成する際の BIP39 passphrase は空文字列に固定する。

### 4.2 Mnemonic 正規化

入力は BIP39 の規則に従って Unicode NFKD 正規化を行う。

Core は次を拒否する。

- 24 words 以外の word count
- wordlist 外単語
- checksum 不正
- 空 Mnemonic
- BIP39 seed 化不能な入力

### 4.3 seed

BIP39 の PBKDF2-HMAC-SHA512 により 512 bit seed を生成する。

seed は永続保存しない。Mnemonic から必要時に再生成し、処理終了後に zeroize 対象とする。

### 4.4 HD 導出方式

Ed25519 系の hardened derivation を使用し、既存 Symbol / NEM Wallet との復元互換性を優先する。

Profile schema version 1 の導出パスは次で固定する。

| Chain | Network | path |
| --- | --- | --- |
| Symbol | Mainnet | `m/44'/4343'/account'/0'/0'` |
| Symbol | Testnet | `m/44'/1'/account'/0'/0'` |
| NEM | Mainnet | `m/44'/43'/account'/0'/0'` |
| NEM | Testnet | `m/44'/1'/account'/0'/0'` |

`account` は `u32` の非 hardened bit 範囲 `0..=2147483647` を API 上の index とし、パス上では hardened index として使用する。

Derived Software Key の `derivation_path` 自体は保存しない。Core は次から path を再構築する。

```text
Profile.network
+
SoftwareKey.chain
+
account_index
+
ProfileEnvelope.schema_version
```

schema version 1 の導出規則は後から変更しない。将来導出規則を変更する場合は新しい Profile schema version を割り当てる。

Symbol / NEM Testnet は同じ path になるため、同一 Mnemonic / account index から同一秘密鍵が導出され得る。この場合でも Software Key は Chain に固定されるため、Symbol 用と NEM 用は別 Software Key として登録でき、重複とは扱わない。

### 4.5 導出結果の登録

導出処理は次の順序で行う。

1. Profile パスワード認証
2. Mnemonic 復号
3. seed 生成
4. Profile schema version に対応する規則で Chain / Network / account index から path 決定
5. private key 導出
6. private key 妥当性検証
7. 同一 Chain 内で Profile 内重複判定
8. 指定 Chain に固定した Software Key として暗号化・登録
9. temporary secret zeroize
10. replacement store blob 生成

失敗した場合は既存 store を変更しない。

---

## 5. 秘密鍵と Chain 互換性

### 5.1 秘密鍵表現

Core 内部の private key は 32 byte 固定長バイト列として扱う。

外部インポート API は次のみ受け付ける。

- 64 hexadecimal characters
- 大文字・小文字はいずれも受理
- prefix `0x` は受理しない。

内部保存時は raw 32 bytes とし、hex string を保存しない。

### 5.2 private key 妥当性

次を拒否する。

- 長さ不正
- hex decode 不能
- all-zero key
- 対象 Symbol / NEM 鍵処理で有効な公開鍵を生成できない値

具体的な公開鍵・アドレス・署名結果は `symbol-sdk` 3.3.2 と固定テストベクタで相互検証する。

### 5.3 Generated Software Key

Generated Software Key は Chain を指定して生成する。CSPRNG から 32 byte private key candidate を生成し、指定 Chain での妥当性確認後、その Chain に固定して登録する。

乱数生成または検証に失敗した場合は登録しない。

### 5.4 Chain 固定

Imported / Generated / Derived のすべての Software Key は、登録時に `Symbol` または `Nem` のいずれかの Chain に固定する。

公開鍵・アドレス生成および署名では保存済み Software Key の Chain を使用する。同一 Software Key を別 Chain として利用する API は提供しない。

同一 private key であっても Chain が異なる場合は別 Software Key として扱う。また Profile は Network に固定されるため、同一 private key が Mainnet Profile と Testnet Profile の双方に存在しても重複とは扱わない。

---

## 6. 暗号化仕様

### 6.1 KDF

Profile パスワードから Profile encryption key を導出する方式は Argon2id とする。

v1 default parameters:

```text
algorithm    = Argon2id
algorithm_id = 0
version      = 0x13
memory       = 65536 KiB
iterations   = 3
parallelism  = 1
salt         = 16 random bytes
output       = 32 bytes
```

KDF parameter は Profile envelope に保存し、将来 migration 可能とする。

Profile パスワード品質は Core では判定しない。ただし未指定・空文字列は拒否する。

### 6.2 AEAD

秘密 payload の暗号化は AES-256-GCM とする。

```text
algorithm    = AES-256-GCM
algorithm_id = 0
key          = Argon2id output, 32 bytes
nonce        = 12 random bytes per encryption
TAG          = 16 bytes
```

同一 key で nonce を再利用しない。nonce は毎回 CSPRNG で生成する。

### 6.3 AAD

Profile encryption の AAD は次の値を RFC 8949 Core Deterministic Encoding Requirements に従う deterministic CBOR array として encode する。

```text
[
  magic,
  store_version,
  profile_id,
  network,
  profile_schema_version,
  kdf_algorithm_id,
  cipher_algorithm_id
]
```

各要素は `docs/specifications/wallet-store-format-v1.md` で定義した wire 表現を使用する。

AAD により暗号文を別 Profile / Network / schema / algorithm context へ移植して正常データとして扱うことを防ぐ。

### 6.4 Profile パスワード認証

独立した password hash は保存しない。

AEAD 復号と認証 tag 検証の成功を Profile パスワード認証として扱う。

認証失敗時は外部へ「password 不一致」と「暗号文改ざん」の詳細差を公開せず `AuthenticationFailed` とする。

### 6.5 password change

password change は次を行う。

1. current password で復号
2. new password が未指定 / 空でないことを確認
3. new salt 生成
4. new Argon2id key 導出
5. new nonce 生成
6. Profile payload 全体を再暗号化
7. replacement store blob 生成
8. old/new temporary key と plaintext を zeroize

旧暗号 payload の一部を再利用しない。

---

## 7. Wallet Store 形式

Wallet Store の wire-level 仕様の正本は `docs/specifications/wallet-store-format-v1.md` とする。本節はその設計上の要約であり、整数 key、enum wire 値、deterministic CBOR の制約、配列順序、unknown field / enum の扱い、version / migration 規則は同文書に従う。

### 7.1 エンコーディング

保存形式は versioned deterministic CBOR とし、**RFC 8949 Core Deterministic Encoding Requirements** に固定する。

- map key は unsigned integer
- indefinite-length item は使用しない
- integer / length は最短表現
- duplicate map key は許可しない
- float は使用しない
- 未定義 field は無視する
- 未知 enum 値はエラーにせず無視する

### 7.2 top-level schema

整数 key は次で固定する。

```text
WalletStoreV1
0 = magic
1 = version
2 = registry_key
3 = profiles
```

論理 schema:

```text
WalletStoreV1 {
  0: h'534E5743',
  1: 1,
  2: bytes[32],
  3: [ProfileEnvelopeV1]
}
```

`magic` は 4 byte 固定値 `h'534E5743'` (`SNWC`) とする。

`registry_key` は初回 Store 作成時に CSPRNG で生成する。秘密鍵暗号化には使用しない。

`profiles` は `profile_id` raw 16 bytes の bytewise 昇順で保存する。登録順には意味を持たせない。

### 7.3 ProfileEnvelopeV1

整数 key は次で固定する。

```text
ProfileEnvelopeV1
0 = profile_id
1 = network
2 = duplicate_tag
3 = schema_version
4 = kdf
5 = cipher
```

論理 schema:

```text
ProfileEnvelopeV1 {
  0: bytes[16],
  1: Network,
  2: bytes[32],
  3: 1,
  4: KdfParamsV1,
  5: CiphertextV1
}
```

### 7.4 encrypted ProfilePayloadV1

整数 key は次で固定する。

```text
ProfilePayloadV1
0 = mnemonic_entropy
1 = software_keys
```

論理 schema:

```text
ProfilePayloadV1 {
  0: bytes[32],
  1: [SoftwareKeyRecordV1]
}
```

Mnemonic は word string ではなく 24 words BIP39 の 256 bit entropy として保存する。復号後に必要時のみ mnemonic words / seed へ変換する。

`software_keys` は `key_id` raw 16 bytes の bytewise 昇順で保存する。登録順には意味を持たせない。

### 7.5 SoftwareKeyRecordV1

整数 key は次で固定する。

```text
SoftwareKeyRecordV1
0 = key_id
1 = chain
2 = private_key
3 = origin
```

論理 schema:

```text
SoftwareKeyRecordV1 {
  0: bytes[16],
  1: Chain,
  2: bytes[32],
  3: SoftwareKeyOriginV1
}
```

すべての Software Key は `chain` を必須とし、登録後に変更しない。

Derived の場合は `account_index` を保存し、`derivation_path` は保存しない。path は Network / Chain / account index / Profile schema version から再構築する。

### 7.6 Profile 重複判定

同一 Mnemonic + Network の検出には次を使用する。

```text
duplicate_tag = HMAC-SHA256(
  registry_key,
  "symbol-nem-wallet-core/profile-duplicate/v1" ||
  network ||
  mnemonic_entropy
)
```

`network` は保存フォーマットで固定した wire 値を使用する。

`duplicate_tag` は Store 内でのみ安定し、異なる Store 間の Mnemonic 同一性を直接比較できない。

Profile 作成 / 復元時に既存 `duplicate_tag` と一致した場合は `DuplicateProfile` とする。同一 Mnemonic であっても Network が異なる場合は `duplicate_tag` が異なるため、別 Profile として登録できる。

### 7.7 Software Key 重複判定

Software Key の fingerprint を平文 manifest へ保存しない。

対象 Profile を password で復号した後、同一 `chain` の既存 Software Key の private key と constant-time 比較する。同一 Chain かつ同一 private key が存在する場合のみ `DuplicateSoftwareKey` とする。

同一 private key でも Chain が異なる場合は重複とは扱わない。また Software Key の重複判定は対象 Profile 内で行い、Network が異なる別 Profile の Software Key とは比較しない。

### 7.8 Version と migration

```text
WalletStore.version = 1
ProfileEnvelope.schema_version = 1
```

未対応 Store version は `UnsupportedStoreVersion`、未対応 Profile schema version は `UnsupportedProfileSchemaVersion` とする。

既存 version の意味は後から変更しない。

Store / Profile schema の migration は暗黙には行わない。読み込み時の自動 migration は禁止し、必要な migration は明示的な migration operation / API として実行する。

---

## 8. Profile 作成と初回 Mnemonic 受渡し

### 8.1 新規生成は二段階 API とする

新規 Mnemonic 生成 Profile は次の二段階とする。

```text
prepare_generated_profile(...)
        │
        ├─ mnemonic (初回バックアップ用、一度だけ)
        └─ PendingProfileBlob (opaque encrypted bytes)

finalize_generated_profile(store, pending_blob)
        │
        └─ replacement store
```

`prepare_generated_profile` は Store に Profile を追加しない。

`PendingProfileBlob` は Profile パスワードで暗号化済みの一時 envelope であり、通常 Profile と区別する purpose marker と短い format version を持つ。

Application は Mnemonic のバックアップ受渡しを完了した後だけ `finalize_generated_profile` を呼ぶ。

中断時は pending blob を破棄する。Core の正常 Store には新規 Profile が残らない。

### 8.2 復元 Profile

既存 Mnemonic からの復元は backup confirmation を要求しない。

```text
restore_profile(store, mnemonic, password, network)
    -> replacement store
```

Core は 24 words の BIP39 Mnemonic であること、checksum、duplicate を確認してから登録する。

### 8.3 保存済み秘密情報の通常取得禁止

保存済み秘密情報を対象識別子だけで取得する API は提供しない。

```text
get_mnemonic(profile_id) -> not provided
get_private_key(profile_id, key_id) -> not provided
```

Mnemonic / Software Key 秘密鍵の返却は、§9で定義する明示的な個別エクスポート操作に限る。個別エクスポートは毎回正しい Profile パスワードを要求し、Profile 全体の一括バックアップ・復旧を提供するものではない。

---

## 9. 公開 API 契約

Rust public API は implementation language 固有の細部を Binding へ漏らさない DTO を使用する。

概念 API は次とする。

```text
create_empty_store() -> WalletStoreBlob

prepare_generated_profile(
  store,
  password,
  network
) -> PreparedProfile { mnemonic, pending_profile }

finalize_generated_profile(
  store,
  pending_profile
) -> WalletStoreBlob

restore_profile(
  store,
  mnemonic,
  password,
  network
) -> WalletStoreBlob

export_mnemonic(
  store,
  profile_id,
  password
) -> MnemonicExport

export_private_key(
  store,
  profile_id,
  key_id,
  password
) -> PrivateKeyExport

list_profiles(store) -> [ProfileInfo]

list_software_keys(
  store,
  profile_id
) -> [SoftwareKeyInfo]

derive_software_key(
  store,
  profile_id,
  password,
  chain,
  account_index
) -> MutationResult<SoftwareKeyInfo>

import_software_key(
  store,
  profile_id,
  password,
  chain,
  private_key_hex
) -> MutationResult<SoftwareKeyInfo>

generate_software_key(
  store,
  profile_id,
  password,
  chain
) -> MutationResult<SoftwareKeyInfo>

get_public_account(
  store,
  profile_id,
  key_id,
  password
) -> PublicAccountInfo

sign(
  store,
  profile_id,
  key_id,
  password,
  payload
) -> Signature

change_profile_password(
  store,
  profile_id,
  current_password,
  new_password
) -> WalletStoreBlob

delete_software_key(
  store,
  profile_id,
  key_id,
  password
) -> WalletStoreBlob

delete_profile(
  store,
  profile_id,
  password
) -> WalletStoreBlob
```

### 9.1 ProfileInfo

秘密情報を含めない。

```text
ProfileInfo {
  profile_id,
  network,
  software_key_count
}
```

### 9.2 SoftwareKeyInfo

```text
SoftwareKeyInfo {
  key_id,
  chain,
  origin
}
```

公開鍵・アドレスおよび署名処理では Software Key に保存された `chain` を使用する。

### 9.3 個別エクスポート結果

個別エクスポートは秘密情報を含む明示的な例外結果であり、正しい Profile パスワードの認証後にだけ返す。エクスポート API は Store を変更せず、認証・対象確認・復号・返却のいずれかに失敗した場合は秘密情報を返さず、入力 Store をそのまま扱う。

```text
MnemonicExport {
  mnemonic: normalized BIP39 word string
}

PrivateKeyExport {
  private_key: bytes[32]
}
```

`MnemonicExport.mnemonic` は §4.2 の正規化済み 24 words BIP39 word string とする。`PrivateKeyExport.private_key` は秘密鍵の raw 32 bytes とし、Core API は hex string を返さない。Binding はこれらの値を別の秘密情報管理ロジックで変換・保存・ログ出力せず、具体的な言語固有型へのマッピングだけを行う。

個別エクスポートの成功結果を受け取った後の表示、保管、紛失防止は Application / 利用者の責任とする。Core / Binding は結果を継続保持またはキャッシュしない。

### 9.4 署名 payload

Core は payload を意味解釈しない。

```text
sign(..., payload: bytes)
```

Software Key に固定された Symbol / NEM の署名 primitive を適用するが、Transaction 構造の妥当性、generation hash の組み立て等は上流責任とする。

---

## 10. Error model

Binding 共通の安定した error code を定義する。

```text
InvalidArgument
InvalidStore
UnsupportedStoreVersion
UnsupportedProfileSchemaVersion
ProfileNotFound
SoftwareKeyNotFound
AuthenticationFailed
InvalidMnemonic
InvalidPrivateKey
DuplicateProfile
DuplicateSoftwareKey
InvalidAccountIndex
NetworkMismatch
CryptoFailure
RandomSourceFailure
SerializationFailure
PendingProfileInvalid
```

エラー message に次を含めない。

- Mnemonic
- private key
- Profile password
- derived seed
- decrypted payload
- secret の hash / hex dump

panic / stack trace に秘密値を format しない。

---

## 11. atomicity と状態遷移

### 11.1 MutationResult

状態変更 API は成功時にのみ replacement Store を返す。

```text
MutationResult<T> {
  store: WalletStoreBlob,
  value: T
}
```

途中処理に失敗した場合は replacement store を返さず error とする。

### 11.2 対象操作

次は必ず atomic replacement とする。

- Profile 作成 / 復元
- Derived / Imported / Generated key 登録
- password change
- Software Key delete
- Profile delete

個別 Mnemonic / Software Key 秘密鍵エクスポートは Store を変更しない。認証、対象確認、復号または返却に失敗した場合も、入力 Store を変更せず秘密情報を返さない。

### 11.3 Profile 分離

Mutation は要求対象 Profile の envelope だけを置換する。

他 Profile の encrypted payload、salt、nonce、ID、duplicate tag を変更しない。

Profile delete の場合のみ対象 envelope を Store から除去する。

---

## 12. メモリ上の秘密情報

### 12.1 zeroize 対象

少なくとも次を `zeroize` 対象とする。

- Profile password の Rust 側コピー
- BIP39 entropy の復号 copy
- mnemonic normalized buffer
- seed
- private key
- Argon2id output key
- decrypted ProfilePayload buffer
- signing temporary buffer のうち secret を含むもの

### 12.2 所有権

秘密情報は可能な限り owned buffer を 1 個に限定し、不必要な `clone()` を禁止する。

`Debug`, `Display`, serde diagnostic output に secret field を出さない Secret wrapper type を使用する。

### 12.3 WASM 制約

WASM linear memory を恒久的保護領域とはみなさない。

JavaScript へ secret を返すのは次だけとする。

- `prepare_generated_profile` の初回 Mnemonic
- 明示的な `export_mnemonic` の成功結果
- 明示的な `export_private_key` の成功結果
- 外部から Core へ入力する Profile password
- 外部から Core へ入力する imported private key

これらは必要な呼び出し範囲だけで使用し、Binding 側で state / cache / log へ保存しない。

WASM memory zeroize は best effort であり、JavaScript runtime / browser process 全体からの完全消去を保証する仕様とはしない。

---

## 13. Native / WASM Binding

### 13.1 共通原則

Binding は次だけを行う。

- 型変換
- byte buffer transfer
- error code mapping
- lifecycle / memory ownership の橋渡し

Binding は次を実装しない。

- 暗号化
- password authentication
- Mnemonic validation
- key derivation
- signing
- duplicate detection
- 個別エクスポート後の秘密情報の保存・表示

### 13.2 Native Binding

Native Binding は C ABI または UniFFI 等の単一方式へ実装を集約する。

Binding 層が secret を string formatting / logging しないことを必須とする。

### 13.3 WASM Binding

WASM public API は `Uint8Array` を binary data の基本型とする。

Store blob、pending blob、署名 payload は `Uint8Array` とする。

Profile password / Mnemonic / imported key は JS string から受け取る場合でも、Core への変換後に JS 側で長期保持する設計を要求しない。`export_mnemonic` の結果は Mnemonic word string、`export_private_key` の結果は `Uint8Array` 相当の bytes としてBinding越しに返すが、Bindingはそれらを state / cache / log へ保存しない。

---

## 14. 互換性テスト

### 14.1 固定ベクタ

Repository に secret ではない deterministic test vector を置く。

最低限、次を固定する。

- BIP39 24 words mnemonic -> seed
- Symbol Mainnet path -> private/public key/address
- Symbol Testnet path -> private/public key/address
- NEM Mainnet path -> private/public key/address
- NEM Testnet path -> private/public key/address
- Symbol signing payload -> signature verification
- NEM signing payload -> signature verification

### 14.2 symbol-sdk 3.3.2

公開鍵・アドレス・署名互換性 fixture は `symbol-sdk` 3.3.2 の結果と比較する。

SDK の将来 version を CI で自動採用しない。

### 14.3 暗号化 fixture

固定 password / salt / nonce を test-only で使用し、次を固定する。

- Argon2id output
- AAD bytes
- AES-256-GCM ciphertext
- authentication tag
- RFC 8949 Core Deterministic Encoding に従う CBOR bytes

production code では salt / nonce を固定しない。

---

## 15. セキュリティテスト

最低限次を自動テストする。

- wrong password で復号不可
- ciphertext / tag / AAD 1 bit 改変で認証失敗
- empty password reject
- duplicate Profile reject
- 同一 Network・同一 Chain・同一 private key の duplicate Software Key reject
- 同一 private key でも Chain が異なる場合は登録可能
- 同一 Mnemonic でも Network が異なる Profile は登録可能
- 24 words 以外の Mnemonic reject
- invalid Mnemonic reject
- invalid private key reject
- failed mutation で input Store bytes が不変
- password change 後に旧 password 使用不可
- delete key 後に対象 key で署名不可
- delete Profile 後に対象 Profile 操作不可
- 別 Profile へ mutation が越境しない
- 正しい Profile password で Mnemonic を個別エクスポートできる
- 正しい Profile password で Derived / Imported / Generated の秘密鍵を個別エクスポートできる
- 誤 password、対象不存在、復号失敗でエクスポート結果を返さず Store が不変
- 個別エクスポート結果が Core / Binding の state、cache、log に残らない
- 通常 API の結果へ Mnemonic / 秘密鍵が含まれず、明示的な個別エクスポートだけが例外
- Native / WASM が同じ fixture 結果を返す
- error / Debug output に secret が含まれない

---

## 16. crate 構成

v1 は責務単位で次の module を基本形とする。過度な crate 分割は行わず、まず単一 Core crate 内 module とする。

```text
src/
├─ lib.rs
├─ api/
├─ model/
├─ store/
├─ crypto/
│  ├─ aead.rs
│  ├─ kdf.rs
│  ├─ random.rs
│  └─ secret.rs
├─ mnemonic/
├─ hd/
├─ chains/
│  ├─ symbol.rs
│  └─ nem.rs
├─ profile/
├─ signing/
└─ error.rs
```

Binding は Core crate とは別 package / crate に分離してよいが、秘密情報処理ロジックを複製しない。

---

## 17. 要件トレーサビリティ

| 仕様領域 | 主な要件 |
| --- | --- |
| Profile / Store | FR-001, FR-002, FR-006, FR-015..018, DR-001..007 |
| Mnemonic / HD | FR-001, FR-003, FR-021, DR-008, AC-033, AC-035 |
| Imported / Generated | FR-004, FR-005, FR-018, FR-021 |
| Encryption / password | FR-006, FR-007, FR-010, FR-020, SEC-001..007, SEC-013..015 |
| Signing | FR-009, FR-013, DR-008 |
| Delete / atomicity | FR-011, FR-012, SEC-005, SEC-008, SEC-009, SEC-018, SEC-019 |
| Binding | FR-019, NFR-001..004, SEC-011, SEC-012, SEC-017, SEC-020 |
| Initial backup handoff | FR-001, FR-019, SEC-010, SEC-017, AC-034 |
| Individual secret export | FR-022, FR-023, FR-019, SEC-010, SEC-015, SEC-017, SEC-020, SEC-021, AC-041..043 |

---

## 18. v1 で固定しない実装詳細

次は本仕様を満たす限り実装側で選択可能とする。

- Rust の具体 crate 名
- C ABI / UniFFI 等 Native Binding generator
- TypeScript wrapper の package layout
- 上位 Application の filesystem / IndexedDB 保存 API
- temporary file の名称
- UI 上の password policy
- UI 上の Mnemonic backup confirmation 手順

これらを理由に Core の暗号方式、保存 schema、HD path、API security boundary を変更してはならない。

---

## 19. 参照

- `docs/requirements/requirements.md`
- `docs/specifications/wallet-store-format-v1.md`
- `docs/decisions/open-001.md`
- `docs/decisions/open-002.md`
- `docs/decisions/open-validity-001.md`
- RFC 8949: Concise Binary Object Representation (CBOR)
- BIP39: Mnemonic code for generating deterministic keys
- BIP44: Multi-Account Hierarchy for Deterministic Wallets
- SLIP-0044: registered coin types
- Symbol / NEM wallet HD derivation compatibility lineage
- `symbol-sdk` 3.3.2

本書の変更で要件そのものを変更する必要が生じた場合は、仕様側で暗黙に拡張せず `docs/requirements/requirements.md` または decision record 側へ戻して決定する。

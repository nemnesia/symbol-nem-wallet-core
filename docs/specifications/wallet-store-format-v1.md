# Wallet Store Format v1

## 1. 目的

本書は `symbol-nem-wallet-core` v1 の Wallet Store 保存フォーマットについて、確定済みの wire-level 仕様を記録する。

保存先そのものは Core の責務外とし、Application / Binding は Wallet Store を opaque な binary blob として永続化する。

---

## 2. エンコーディング

Wallet Store v1 は **RFC 8949 Core Deterministic Encoding Requirements に従う CBOR** とする。

次を必須とする。

- map key は unsigned integer とする。
- indefinite-length item は使用しない。
- integer および length は最短表現を使用する。
- duplicate map key は許可しない。
- float は使用しない。
- 未定義 field は decoder が無視する。
- 未定義 field は再保存時に保持しない。
- 未知 enum 値は decoder がエラーにせず無視する。

同一の論理値について deterministic な CBOR 表現を生成する。

### 2.1 不正オブジェクトの扱い

Profile / Software Key などの子オブジェクトについて、次のいずれかを検出した場合は、その対象オブジェクト全体をスキップする。

- 必須 field の欠落
- 既知 field の型不正
- 固定長 field の長さ不正
- field 値の許容範囲外
- 未知 enum 値

スキップ時は構造化された `DecodeWarning` を生成する。

warning に Mnemonic entropy、private key、ciphertext などの秘密情報を含めてはならない。

warning code は少なくとも次を定義する。

```text
UnknownEnumValue
MissingRequiredField
InvalidFieldType
InvalidFieldLength
InvalidFieldValue
```

Wallet Store top-level 自体の必須 field 欠落、型不正、固定長 field の長さ不正など、Store 全体を解釈できない不正は decode error とする。

---

## 3. 固定値と ID 表現

### 3.1 Magic

Store magic は次の 4 byte 固定値とする。

```text
h'534E5743'  // "SNWC"
```

### 3.2 Version

```text
WalletStore.version = 1
ProfileEnvelope.schema_version = 1
```

`WalletStore.version` は Store 全体の wire format version を表す。

`ProfileEnvelope.schema_version` は Profile payload、Software Key schema、および Derived Software Key の導出規則を含む Profile 内部仕様の version を表す。

既存 version の意味は後から変更しない。

### 3.3 ProfileId / SoftwareKeyId

外部 API では lowercase UUID string を使用できるが、Store 内では raw 16 bytes として保存する。

```text
ProfileId     = bytes[16]
SoftwareKeyId = bytes[16]
```

---

## 4. enum wire 値

### 4.1 Network

```text
0 = Testnet
1 = Mainnet
```

### 4.2 Chain

```text
0 = Nem
1 = Symbol
```

### 4.3 SoftwareKeyOrigin

```text
0 = Derived
1 = Imported
2 = Generated
```

### 4.4 KDF algorithm

```text
0 = Argon2id
```

### 4.5 Cipher algorithm

```text
0 = AES-256-GCM
```

一度割り当てた enum wire 値の意味は変更しない。廃止した値も別用途へ再利用しない。

未知 enum 値は decoder がエラーにせず無視する。ただし、対象オブジェクト内に未知 enum 値が 1 つでも存在する場合、そのオブジェクト全体をスキップする。

具体例:

- `SoftwareKeyRecordV1.chain` または `SoftwareKeyOriginV1.origin` が未知値の場合、その `SoftwareKeyRecordV1` 全体をスキップする。
- `ProfileEnvelopeV1.network`、`KdfParamsV1.algorithm` または `CiphertextV1.algorithm` が未知値の場合、その `ProfileEnvelopeV1` 全体をスキップする。
- `WalletStore.version` が未対応の場合はスキップせず `UnsupportedStoreVersion` として Store 全体を拒否する。
- `ProfileEnvelope.schema_version` が未対応の場合は `UnsupportedProfileSchemaVersion` とする。

---

## 5. Mnemonic

v1 の Mnemonic は BIP39 English 24 words 固定とする。

保存時は word string ではなく BIP39 entropy を保存する。

```text
mnemonic_entropy = bytes[32]
```

seed は永続保存せず、必要時に Mnemonic entropy から再生成する。

---

## 6. WalletStoreV1

CBOR map の整数 key は次で固定する。

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

`registry_key` は Store 初回作成時に CSPRNG で生成する 32 byte 値とし、秘密鍵暗号化には使用しない。

`profiles` は `profile_id` の raw 16 bytes を bytewise に比較した昇順で保存する。

`profiles = []` は有効な Store 初期状態とする。登録順には意味を持たせない。

---

## 7. ProfileEnvelopeV1

CBOR map の整数 key は次で固定する。

```text
ProfileEnvelopeV1
0 = profile_id
1 = network
2 = duplicate_tag
3 = schema_version
4 = kdf
5 = cipher
6 = software_key_index
```

論理 schema:

```text
ProfileEnvelopeV1 {
  0: bytes[16],                    // profile_id
  1: uint,                         // network
  2: bytes[32],                    // duplicate_tag
  3: 1,                            // schema_version
  4: KdfParamsV1,
  5: CiphertextV1,
  6: [SoftwareKeyIndexEntryV1]
}
```

`profile_id` は raw 16 bytes とする。

`network` は §4.1 の wire 値を使用する。

`software_key_index` は一覧取得に必要な公開情報だけを平文で保存する必須 field とする。`software_key_index = []` は有効な値であり、map key `6` の省略、`null`、text その他の代替表現は受け付けない。

`software_key_index` は `SoftwareKeyIndexEntryV1` の配列とし、private key、Mnemonic entropy、seed、`account_index`、origin および表示名を含めてはならない。

### 7.1 SoftwareKeyIndexEntryV1

CBOR map の整数 key は次で固定する。

```text
SoftwareKeyIndexEntryV1
0 = key_id
1 = chain
```

論理 schema:

```text
SoftwareKeyIndexEntryV1 {
  0: bytes[16],   // key_id
  1: uint         // chain
}
```

`key_id` は raw 16 bytes、`chain` は §4.2 の wire 値を使用する。配列は `key_id` の raw bytes を bytewise に比較した昇順で保存し、同一 `(key_id, chain)` の重複を許可しない。

`software_key_index` は暗号化 `ProfilePayloadV1.software_keys` の各レコードから `(key_id, chain)` を抽出した集合と一対一で一致しなければならない。不一致、重複または型・長さ・値の不正は Profile 全体を `InvalidStore` として拒否する。

### 7.2 KdfParamsV1

CBOR map の整数 key は次で固定する。

```text
KdfParamsV1
0 = algorithm
1 = version
2 = memory_kib
3 = iterations
4 = parallelism
5 = salt
```

論理 schema:

```text
KdfParamsV1 {
  0: uint,        // algorithm
  1: uint,        // Argon2 version
  2: uint,        // memory_kib
  3: uint,        // iterations
  4: uint,        // parallelism
  5: bytes[16]    // salt
}
```

v1 の具体値:

```text
{
  0: 0,           // Argon2id
  1: 19,          // 0x13
  2: 65536,
  3: 3,
  4: 1,
  5: bytes[16]
}
```

### 7.3 CiphertextV1

CBOR map の整数 key は次で固定する。

```text
CiphertextV1
0 = algorithm
1 = nonce
2 = ciphertext
3 = tag
```

論理 schema:

```text
CiphertextV1 {
  0: uint,        // algorithm
  1: bytes[12],   // nonce
  2: bytes,       // ciphertext
  3: bytes[16]    // tag
}
```

v1 の具体値:

```text
{
  0: 0,           // AES-256-GCM
  1: bytes[12],
  2: bytes,
  3: bytes[16]
}
```

---

## 8. encrypted ProfilePayloadV1

CBOR map の整数 key は次で固定する。

```text
ProfilePayloadV1
0 = mnemonic_entropy
1 = software_keys
```

論理 schema:

```text
ProfilePayloadV1 {
  0: bytes[32],               // mnemonic_entropy
  1: [SoftwareKeyRecordV1]    // software_keys
}
```

`ProfilePayloadV1` 全体を Profile パスワードから導出した鍵で暗号化する。

`software_keys` は `key_id` の raw 16 bytes を bytewise に比較した昇順で保存する。

`software_keys = []` は有効とする。登録順には意味を持たせない。

---

## 9. SoftwareKeyRecordV1

CBOR map の整数 key は次で固定する。

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
  0: bytes[16],              // key_id
  1: uint,                   // chain
  2: bytes[32],              // private_key
  3: SoftwareKeyOriginV1     // origin
}
```

すべての Software Key は `chain` を必須属性として持ち、登録後に変更しない。

同一 private key であっても Chain が異なる場合は別 Software Key として扱う。

Software Key の重複判定は対象 Profile 内で行い、同一 Chain かつ同一 private key の場合のみ重複とする。

### 9.1 SoftwareKeyOriginV1

`SoftwareKeyOriginV1` は variant tag を key `0` に持つ CBOR map とする。

Derived:

```text
DerivedV1
0 = origin
1 = account_index
```

```text
DerivedV1 {
  0: 0,      // Derived
  1: uint    // account_index
}
```

`account_index` の有効範囲は次とする。

```text
0..=2147483647
```

範囲外の場合は対象 `SoftwareKeyRecordV1` をスキップし、`InvalidFieldValue` warning を生成する。

Imported:

```text
ImportedV1
0 = origin
```

```text
ImportedV1 {
  0: 1       // Imported
}
```

Generated:

```text
GeneratedV1
0 = origin
```

```text
GeneratedV1 {
  0: 2       // Generated
}
```

Derived Software Key に `derivation_path` は保存しない。

---

## 10. Derived Software Key

Derived Software Key に `derivation_path` は保存しない。

保存する導出情報は `account_index` とする。

概念上は次の値から derivation path を Core が決定する。

```text
Profile.network
+
SoftwareKey.chain
+
account_index
+
ProfileEnvelope.schema_version
```

schema version 1 の導出規則は v1 仕様として固定する。

将来導出規則を変更する場合、schema version 1 の意味を変更してはならず、新しい schema version を割り当てる。

これにより古い Store を読み込んだ場合も、保存時と同一の導出規則を再現できるようにする。

---

## 11. AAD

Profile encryption の AAD は次の値を **RFC 8949 Core Deterministic Encoding に従う CBOR array** として encode する。

```text
[
  magic,
  store_version,
  registry_key,
  profile_id,
  network,
  duplicate_tag,
  profile_schema_version,
  kdf_algorithm_id,
  cipher_algorithm_id,
  software_key_index
]
```

各要素は本書で定義した wire 表現を使用する。

`registry_key` は `WalletStoreV1` key `2` の raw `bytes[32]`、`duplicate_tag` は `ProfileEnvelopeV1` key `2` の raw `bytes[32]` とする。これらの値は、StoreまたはProfileのmanifestが改変された場合に、Profile payloadのAEAD認証へ反映される。

`software_key_index` は `ProfileEnvelopeV1` key `6` の実際の配列値を、同じ要素順序・整数 key・空配列表現で AAD の最後の要素として使用する。別の正規化表現、`null` または省略表現へ変換してはならない。

これにより `software_key_index` の `key_id` または `chain` の改変を、`registry_key`、`duplicate_tag` とともに AES-256-GCM の認証によって検知する。認証・復号後は、index と暗号化 payload の Software Key 集合が一対一で一致することを検証し、不一致の場合は `InvalidStore` とする。

例として Mainnet / Argon2id / AES-256-GCM の場合、論理値は次となる。

```text
[
  h'534E5743',
  1,
  registry_key,
  profile_id,
  1,
  duplicate_tag,
  1,
  0,
  0,
  software_key_index
]
```

AAD により暗号文を別 Profile、Network、schema、algorithm または Software Key index context へ移植して正常データとして扱うことを防ぐ。

---

## 12. Profile 重複判定

同一 Mnemonic + Network の検出には Store ごとの `registry_key` を使用する。

```text
duplicate_tag = HMAC-SHA256(
  registry_key,
  domain_separator || network_u8 || mnemonic_entropy
)
```

`domain_separator` は次の UTF-8 byte 列とする。

```text
UTF-8("symbol-nem-wallet-core/profile-duplicate/v1")
```

`network_u8` は 1 byte 固定とする。

```text
0x00 = Testnet
0x01 = Mainnet
```

`mnemonic_entropy` は 32 bytes をそのまま連結する。

同一 Mnemonic であっても Network が異なる場合は別 Profile として登録できる。

---

## 13. バージョニングと migration

未対応 Store version は次のエラーとする。

```text
UnsupportedStoreVersion
```

未対応 Profile schema version は次のエラーとする。

```text
UnsupportedProfileSchemaVersion
```

Store / Profile schema の migration は暗黙には行わない。

読み込み時に自動で新 version へ書き換えることは禁止する。

本書の `WalletStore.version = 1` および `ProfileEnvelope.schema_version = 1` は、`name` / `accounts` を含まない本 wire layout の未公開 v1 ドラフトを表す。旧ドラフトの `name` / `accounts` layout との互換性、変換、fallback parser は提供しない。旧 layout は `software_key_index` 必須 field の欠落または型不正として正常な v1 Store に受け入れない。

migration が必要な場合は、変換元 version と変換先 version を API 名で明示した version 固定 API を提供する。

例:

```text
migrate_store_v1_to_v2(store) -> WalletStoreBlob
```

v1 の時点では migration API 自体は実装しない。将来新しい Store version を定義した時点で、必要な version 固定 migration API を追加する。

既存 version の意味は migration 実装追加後も変更しない。

---

## 14. 現時点で未確定の詳細

保存フォーマット v1 の主要な wire-level schema は確定済みである。

今後追加仕様が必要になった場合も、本書で確定済みの wire 値、整数 key、version の意味を変更してはならない。

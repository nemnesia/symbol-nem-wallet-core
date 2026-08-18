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
- 未知 enum 値は decoder がエラーにせず無視する。

同一の論理値について deterministic な CBOR 表現を生成する。

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

未知 enum 値は decoder がエラーにせず無視する。未知 enum 値をどの単位でスキップするかの詳細は別途確定する。

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

登録順には意味を持たせない。

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
```

論理 schema:

```text
ProfileEnvelopeV1 {
  0: bytes[16],        // profile_id
  1: uint,             // network
  2: bytes[32],        // duplicate_tag
  3: 1,                // schema_version
  4: KdfParamsV1,
  5: CiphertextV1
}
```

`profile_id` は raw 16 bytes とする。

`network` は §4.1 の wire 値を使用する。

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

登録順には意味を持たせない。

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
  profile_id,
  network,
  profile_schema_version,
  kdf_algorithm_id,
  cipher_algorithm_id
]
```

各要素は本書で定義した wire 表現を使用する。

例として Mainnet / Symbol / Argon2id / AES-256-GCM の場合、論理値は次となる。

```text
[
  h'534E5743',
  1,
  profile_id,
  1,
  1,
  0,
  0
]
```

AAD により暗号文を別 Profile、Network、schema または algorithm context へ移植して正常データとして扱うことを防ぐ。

---

## 12. Profile 重複判定

同一 Mnemonic + Network の検出には Store ごとの `registry_key` を使用する。

```text
duplicate_tag = HMAC-SHA256(
  registry_key,
  "symbol-nem-wallet-core/profile-duplicate/v1" ||
  network ||
  mnemonic_entropy
)
```

`network` は本書で固定した wire 値を使用する。

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

migration が必要な場合は明示的な migration operation / API として実行する。

既存 version の意味は migration 実装追加後も変更しない。

---

## 14. 現時点で未確定の詳細

次は本書作成時点では未確定とし、確定後に追記する。

- `KdfParamsV1` 内部の整数 key 割り当て
- `CiphertextV1` 内部の整数 key 割り当て
- `SoftwareKeyOriginV1` の variant ごとの具体的な CBOR schema / 整数 key 割り当て
- 未知 enum 値を無視する際の具体的なスキップ単位
- 明示 migration API の具体的な API shape

これらの未確定事項を理由に、本書で確定済みの wire 値、整数 key、version の意味を変更してはならない。

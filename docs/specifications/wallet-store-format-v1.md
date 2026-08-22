# Wallet Store Format v1

## 1. 目的

本書は `symbol-nem-wallet-core` v1 の Wallet Store 保存フォーマットについて、確定済みの wire-level 仕様を記録する。

保存先そのものは Core の責務外とし、Application / Binding は Wallet Store を opaque な binary blob として永続化する。

---

## 2. エンコーディング

Wallet Store v1 は **RFC 8949 Core Deterministic Encoding Requirements に従う CBOR** とする。

Wallet Store の入力 bytes は、完全な Wallet Store CBOR item をちょうど 1 個含み、
その item が入力 bytes 全体を消費する場合だけ wire 構造として受理する。空入力、
truncated item、trailing bytes、2 個以上の CBOR item を連結した入力は受理しない。
CBOR item は RFC 8949 Core Deterministic Encoding Requirements を満たさなければならず、
indefinite-length、integer または length の非最短表現、duplicate map key、v1 が許可しない
CBOR 型その他の deterministic CBOR 違反は受理しない。これらの入力拒否に対する公開 error
code はすべて `InvalidStore` とする。内部 parser の error 型や decode error はこの公開契約を
変更しない。

次を必須とする。

- map key は unsigned integer とする。
- indefinite-length item は使用しない。
- integer および length は最短表現を使用する。
- duplicate map key は許可しない。
- float は使用しない。
- 未知 field は、現行 schema version の wire object 内で意味解釈しない opaque extension field とする。decoder は未知 field を論理モデルへ取り込まず、一覧結果、重複判定または index と payload の写像へ使用しない。
- mutation で再出力する wire object に未知 field が存在する場合、未知 field の key/value を lossless に保持しなければならない。保持できない場合は mutation 全体を `InvalidStore` として拒否し、replacement Store を返してはならない。
- `software_key_index` が AAD に含まれる場合、未知 map key を含む受信 wire 値を同じ要素順序・整数 key・空配列表現で AAD に使用する。
- 未知 enum 値は decoder が意味解釈できないため、対象 Profile または Software Key を skip せず fatal error とする。

同一の論理値について deterministic な CBOR 表現を生成する。

### 2.1 不正オブジェクトの扱い

CBOR item の decode 後、Wallet Store の top-level は map であり、必須 field、magic、
version、型、固定長および値の規則を満たさなければならない。top-level が map でない場合、
必須 field が欠落している場合、magic の型・長さ・値が不正な場合、既知 field の型・長さ・
値が不正な場合、またはその他の top-level 構造を解釈できない場合は `InvalidStore` とする。

`WalletStore.version` と `ProfileEnvelope.schema_version` は、field が存在し unsigned
integer として解釈できることを構造上検証してから値を判定する。field の欠落または unsigned
integer 以外の型は `InvalidStore` とし、unsigned integer だが未対応の値だけを、それぞれ
`UnsupportedStoreVersion` または `UnsupportedProfileSchemaVersion` とする。これ以外の
version 専用 error は定義しない。

Profile / Software Key などの子オブジェクトについて、次のいずれかを検出した場合は、対象オブジェクトを skip せず、Store 操作全体を拒否する。

- 必須 field の欠落
- 既知 field の型不正
- 固定長 field の長さ不正
- field 値の許容範囲外
- 未知 enum 値
- 配列要素の重複または規定された canonical order 違反
- index と payload の対応不一致

その他の構造不正は `InvalidStore` とする。上記の構造検証を通過した unsigned integer の
`WalletStore.version` が未対応の場合は `UnsupportedStoreVersion`、同じ条件の
`ProfileEnvelope.schema_version` が未対応の場合は `UnsupportedProfileSchemaVersion` とする。

不正または未対応の Store を受理してはならず、秘密情報処理を開始してはならない。正常な read 結果、秘密情報または mutation の replacement Store を返してはならない。child object を skip して残りの Profile だけで read または mutation を継続してはならない。

`DecodeWarning` はこの不正条件の通知には使用しない。warning を返す結果型を使用する場合も、v1 の不正 Profile を warning 付きで受理してはならない。

warning に Mnemonic entropy、private key、ciphertext などの秘密情報を含めてはならない。v1 は不正オブジェクトの skip warning code を定義しない。未知 field は warning なしで受理するが、mutation 時に再出力する場合の lossless 保持条件は本節および §11 に従う。

Wallet Store top-level 自体の必須 field 欠落、型不正、固定長 field の長さ不正、magic の不正、
top-level が map でないことその他 Store 全体を解釈できない不正は、内部で CBOR parser または
decoder の error が発生した場合を含め、公開 error code `InvalidStore` とする。

### 2.2 Resource limits

入力由来のallocation DoSを防ぐため、v1 decoderは次の固定上限を適用する。

| 対象 | 上限 |
| --- | ---: |
| Wallet Store raw bytes | 16 MiB |
| Profile数 | 128 |
| ProfileあたりSoftware Key数 | 256 |
| CBOR Bytes / Textのbyte長 | 1 MiB |
| Profile ciphertextのbyte長 | 1 MiB |
| CBOR array / mapの要素数 | 256 |
| CBOR nesting depth | 32 |

上限値はlengthを読み取った後の`Vec`、`String`またはciphertext cloneの開始前に検査する。
Pending ProfileはWallet Store v1のCBORではなく、既存の固定長opaque envelopeとして扱う。

入力StoreまたはProfile payloadが上限を超えた場合は、子要素をskipせず`InvalidStore`とする。
上限は有効なv1 wire表現のencodingを変更するものではないが、上限を超える入力をv1 decoderが
受理する互換性は提供しない。

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

外部 API の UUID は、ハイフン区切りの16進表現を持つ UUID string とする。16進文字は大文字・小文字を受け付け、外部へ返す場合は lowercase とする。Store 内では、文字列表現の16進値を左から順に 16 bytes へ変換し、UUID のfield単位の endian 変換、byte reverse またはその他の並べ替えを行わず保存する。

```text
ProfileId     = bytes[16]
SoftwareKeyId = bytes[16]
```

UUID string から raw bytes への変換に失敗した外部入力は `InvalidArgument` とする。Store 内の UUID が欠落、型不正または `bytes[16]` 以外の場合は `InvalidStore` とする。raw bytes から外部文字列表現へ戻す場合は同じ左から右の順序を使用する。

`ProfileId` は 1 つの `WalletStoreV1` 内で一意とする。

`SoftwareKeyId` は 1 つの Profile 内で Chain にかかわらず一意とする。異なる Profile 間で同じ `SoftwareKeyId` を使用することは許可する。

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

未知 enum 値は `InvalidStore` として Store 操作全体を拒否する。未知 enum を既知値として解釈したり、対象オブジェクトを skip して処理を継続したりしてはならない。unknown field の opaque 保持規則は unknown enum には適用しない。

具体例:

- `SoftwareKeyRecordV1.chain` または `SoftwareKeyOriginV1.origin` が未知値の場合は `InvalidStore` とする。
- `ProfileEnvelopeV1.network`、`KdfParamsV1.algorithm` または `CiphertextV1.algorithm` が未知値の場合は `InvalidStore` とする。
- `WalletStore.version` が unsigned integer として構造上正しく、値だけが未対応の場合はスキップせず `UnsupportedStoreVersion` として Store 全体を拒否する。欠落または型不正は `InvalidStore` とする。
- `ProfileEnvelope.schema_version` が unsigned integer として構造上正しく、値だけが未対応の場合は `UnsupportedProfileSchemaVersion` として Store 全体を拒否する。欠落または型不正は `InvalidStore` とする。

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
Store blobの平文fieldとして保存されるため、Store blobを取得できる攻撃者から秘匿される値とは
扱わない。Store固有のdomain separationおよびProfile payloadのintegrity contextに使用する。

`profiles` は `profile_id` の raw 16 bytes を bytewise に比較した狭義昇順で保存し、同じ `profile_id` を複数の `ProfileEnvelopeV1` に使用してはならない。

decode 時にも `profiles` が同じ順序で並んでいることを検証し、狭義昇順でない場合は `InvalidStore` とする。

§2.1 の構造検証で受理された `ProfileEnvelopeV1` 間に同じ `profile_id` が存在する場合は、対象を選択またはスキップせず、Store 全体を `InvalidStore` として拒否する。

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

`key_id` は raw 16 bytes、`chain` は §4.2 の wire 値を使用する。配列は `key_id` の raw bytes を bytewise に比較した狭義昇順で保存する。同じ Profile 内では `key_id` は Chain にかかわらず一意とし、同じ `key_id` を同一または異なる Chain の複数 entry に使用してはならない。

index entry 内の未定義 map key は論理的には無視し、`key_id` と `chain` の有限写像、一覧結果および重複検証へ含めない。ただし、再出力する場合は未知 map key の key/value を lossless に保持する。既存 Profile の `software_key_index` は未知 map key を含む受信 wire 値を AAD 入力および保存値として保持する。対象 Profile を保持する mutation（Software Key 登録・削除または password change）でも、既知 field を canonical に再生成しつつ未知 map keyを保持できない場合は `InvalidStore` として mutation 全体を拒否し、replacement Store を返してはならない。Profile delete では対象 envelope を除去する。

decode 時、`software_key_index` は `key_id` の raw bytes を bytewise に比較した狭義昇順でなければならない。順序違反、`key_id` の重複または型・長さ・値の不正は Profile 全体を `InvalidStore` として拒否する。認証・復号後、`software_key_index` と暗号化 `ProfilePayloadV1.software_keys` は同一の有限写像 `key_id -> chain` を表さなければならない。両者の要素数は等しく、各 `key_id` は双方にちょうど 1 回存在し、対応する `chain` が一致しなければならない。不一致も `InvalidStore` とする。

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

`software_keys` は `key_id` の raw 16 bytes を bytewise に比較した狭義昇順で保存する。復号後も同じ順序であることを検証し、順序違反は `InvalidStore` とする。同じ Profile 内では `key_id` は Chain にかかわらず一意とし、重複する場合も `InvalidStore` とする。

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

異なる Chain の Software Key が同一 private key を持つ場合も、それぞれ異なる `key_id` を持たなければならない。

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

範囲外の場合は `InvalidStore` として Store 操作全体を拒否する。

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

既存 Profile を decode する場合、`software_key_index` は `ProfileEnvelopeV1` key `6` の受信 wire 値を、未知 map keyを含めて同じ要素順序・整数 key・空配列表現で AAD の最後の要素として使用する。logical modelから既知 fieldだけを再構築してAADを生成してはならない。新規 Profile または対象 Profile を保持する成功 mutationでは、既知 fieldをcanonicalに再生成し、既存の未知 fieldをlosslessに保持した `software_key_index` を使用する。未知 fieldを保持できない場合は mutation を失敗させる。Profile delete では対象 envelope を除去する。いずれの場合も、別の正規化表現、`null` または省略表現へ変換してはならない。

これにより `software_key_index` の `key_id` または `chain` の改変を、`registry_key`、`duplicate_tag` とともに AES-256-GCM の認証によって検知する。認証・復号後は、§7.1 に従って index と暗号化 payload が同一の `key_id -> chain` 写像を表すことを検証し、不一致の場合は `InvalidStore` とする。

AAD 認証の成功は、保存された `duplicate_tag` が改変されていないことを認証するが、その値と復号済み `mnemonic_entropy` の意味的一致までは保証しない。認証・復号後の意味的一致は §12 に従って検証する。

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

Mutation における保存規則は次のとおりとする。

- 対象外 Profile は再認証・再暗号化せず、Profile envelope と `software_key_index` の未知 fieldを含む受信 wire 値を lossless に保持して、変更前と同じ AAD を再構成できるようにする。
- 対象 Profile を保持する成功 mutation（Software Key 登録・削除または password change）は、既知 fieldをcanonicalに再生成し、既存の未知 fieldをlosslessに保持した上で、新しい nonce と AAD で再暗号化する。未知 fieldを保持できない場合は `InvalidStore` として mutation 全体を拒否し、replacement Store を返してはならない。Profile delete では対象 envelope を除去する。
- 対象外 Profile または対象 Profile の未知 fieldを、意味解釈せずに保存するための wire-preservation は、現行 schema version の wire object 内に限る opaque extension field の保持規則であり、将来 Store version または Profile schema version に対する一般的な forward compatibility を保証するものではない。

これらは、対象 Profile のみを置換する atomicity と、対象外 Profile の ciphertext / tag / AAD を変更しない契約を同時に満たすための v1 規則である。unknown field の意味解釈、自動 migration、unsupported version の受理は提供しない。unknown enum は引き続き fatal error とする。

過去のv1 decoderでAADの認証対象外だったunknown fieldに、同じschema versionのままsecurity上
意味のある解釈を追加してはならない。新しいfieldへsecurity上の意味を持たせる場合は、schema
versionの更新、AAD contractの更新、migrationおよびbackward compatibility判断を必要とする。

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

既存の対象 Profile の AEAD 認証・復号に成功した場合、Core は秘密情報の利用、当該 Profile に関する重複判定または mutation より前に、当該 Store の `registry_key`、対象 `ProfileEnvelopeV1` の `network`、復号済み `ProfilePayloadV1.mnemonic_entropy` を使用して上記の式を再計算しなければならない。

再計算した 32 bytes と、認証された AAD に含まれる `duplicate_tag` が一致しない場合は、対象 Profile を `InvalidStore` として拒否する。AEAD 認証自体には成功しているため、この不一致を `AuthenticationFailed` として扱ってはならない。不一致時は復号済み秘密情報または正常な処理結果を返さず、mutation および replacement Store の生成へ進まない。

この意味的一致検証は、その操作で認証・復号した対象 Profile に適用する。パスワードを要求しない一覧処理では実行しない。

---

## 13. バージョニングと migration

`WalletStore.version` が field として存在し unsigned integer であり、その値だけが未対応の
場合は次のエラーとする。field の欠落または unsigned integer 以外の型は `InvalidStore` とする。

```text
UnsupportedStoreVersion
```

`ProfileEnvelope.schema_version` が field として存在し unsigned integer であり、その値だけが
未対応の場合は次のエラーとする。field の欠落または unsigned integer 以外の型は
`InvalidStore` とする。

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

## 14. 適用上の補足

保存フォーマット v1 の主要な wire-level schema は確定済みである。

今後追加仕様が必要になった場合も、本書で確定済みの wire 値、整数 key、version の意味を変更してはならない。

### 14.1 Profile 重複判定の適用範囲

新規 Profile の作成・復元時は、Store と既存 Profile の構造検証を完了した後、候補の Mnemonic entropy と Network から計算した `duplicate_tag` を、構造上正常な既存 Profile の平文 `duplicate_tag` と比較する。既存 Profile のパスワードを受け取らないため、この処理では既存全 Profile の `duplicate_tag` と各暗号化 Mnemonic の意味的一致を事前検証できない。平文タグが一致する場合は `DuplicateProfile` として拒否し、不一致の場合は意味的一致を検証できないことだけを理由に拒否しない。構造不正、認証失敗または既知の意味的不一致はこの継続規則の対象外とする。

既存 `ProfileEnvelope.schema_version` が未対応の場合、一覧、個別読出し、作成・復元時の重複判定、秘密情報処理およびすべての mutation を含む Store 操作全体を `UnsupportedProfileSchemaVersion` として拒否する。未対応 Profile を skip して残りの Profile で replacement Store を生成してはならない。

Store 全体を password なしで完全に意味検証する処理は v1 では実施しない。本書はそのための新しい検証 API または保存方式を定義しない。

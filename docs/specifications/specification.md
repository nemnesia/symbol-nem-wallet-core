# symbol-nem-wallet-core v1 仕様設計書

## 1. 目的

本書は `docs/requirements/requirements.md` を実装可能な仕様へ具体化する v1 の設計正本である。

対象は Rust Wallet Core と Native / WASM Binding の境界までとし、Wallet UI、Network、Transaction 構築、OS Keychain / Secure Enclave / TPM、Hardware Wallet、External Signer は扱わない。

本書の仕様は次を前提とする。

- Profile は Mainnet / Testnet のいずれかに固定する。
- Profile は Symbol / NEM の Chain には固定しない。
- すべての Software Key は Symbol / NEM のいずれかの Chain に固定する。
- 1 Profile = 1 Mnemonic + 0..n Software Key とする。
- Profile 配下の秘密情報は 1 つの Profile パスワードで保護する。
- 保存済み Mnemonic / 秘密鍵は、正しい Profile パスワードを伴う明示的な個別エクスポートだけで返す。
- 秘密情報を必要とする処理は毎回 Profile パスワードを要求し、継続的な unlocked state を持たない。
- Native / WASM で同じ Core ロジックを使用する。

Wallet Store の wire-level 仕様の正本は `docs/specifications/wallet-store-format-v1.md` とする。本書は API、状態遷移、暗号利用、Binding 境界などの実装契約を定義し、整数 key、CBOR 表現、AAD の正確な構成、enum wire 値、version / migration 規則については保存フォーマット仕様を重複定義しない。

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
- 保存データの検証
- Profile / Software Key の状態遷移
- atomic 更新用の新しい保存イメージ生成
- Mnemonic / Software Key 秘密鍵の個別エクスポート
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

### 2.3 保存方式

Core は保存先を所有せず、opaque な `WalletStoreBlob` の読み込み・更新を行う。

状態変更 API は既存 blob を受け取り、新しい完全な replacement blob を返す。Application は temporary file + rename、IndexedDB transaction 等、その環境で利用可能な atomic replacement を使用する。

Core は更新途中の断片を外部へ返さない。

---

## 3. 識別子と列挙型

### 3.1 ProfileId / SoftwareKeyId

- 128 bit random UUID 相当値を CSPRNG で生成する。
- Mnemonic、秘密鍵、公開鍵、アドレスから導出しない。
- 外部表現は lowercase UUID string とする。
- Store 内表現は `wallet-store-format-v1.md` に従う。

### 3.2 Network

Profile 作成時に Mainnet / Testnet のいずれかへ固定し、変更 API は提供しない。

### 3.3 Chain

Chain は Profile 属性ではなく Software Key の必須属性とする。Software Key は生成・インポート・導出時に Symbol / NEM のいずれかへ固定し、登録後に変更しない。

公開鍵・アドレス生成および署名では保存済み Software Key の Chain を使用し、呼び出し側から別 Chain を指定して同一 Software Key を利用することはできない。

### 3.4 SoftwareKeyOrigin

Software Key の origin は Derived / Imported / Generated のいずれかとする。

Derived は `account_index` を保持するが `derivation_path` は保存しない。path は Profile の Network、Software Key の Chain、`account_index`、Profile schema version から Core が決定する。

---

## 4. Mnemonic / HD Wallet

### 4.1 Mnemonic

v1 は BIP39 English 24 words に固定する。

- entropy: 256 bit
- checksum: BIP39
- BIP39 optional passphrase: 非対応、seed 化時は空文字列
- CSPRNG: Rust `getrandom` が提供する OS / Web Crypto 対応乱数源

復元時は Unicode NFKD 正規化後に word count、wordlist、checksum を検証する。12 / 15 / 18 / 21 words は受け付けない。

seed は PBKDF2-HMAC-SHA512 により生成し、永続保存しない。処理終了後は zeroize 対象とする。

Core / Binding 境界では Mnemonic を JavaScript string として公開せず、正規化済み BIP39 24 words の UTF-8 byte sequence として受け渡す。Mnemonic を人間へ表示するための文字列化は Application が表示直前に行い、長期 state、cache、storage、log へ保持しない。

### 4.2 HD 導出

Profile schema version 1 の HD 導出は `symbol-sdk` 3.3.2 の `sdk/javascript/src/Bip32.js` と同一結果になることを規範とする。実装言語や利用ライブラリは問わないが、同一 seed と同一 path から得られる各ノードの private key と chain code、および最終 private key は同 SDK 実装と一致しなければならない。

v1 の導出規則は次で固定する。

1. BIP39 Mnemonic から §4.1 の方法で 64 byte seed を生成する。
2. root HMAC key は UTF-8 `"ed25519 seed"` とする。
3. root node は `HMAC-SHA512(key = "ed25519 seed", data = seed)` で生成する。
4. HMAC 結果の先頭 32 byte を node private key、後半 32 byte を chain code とする。
5. 各 path segment は hardened child とし、child data は `0x00 || parent_private_key[32] || child_index_be32` とする。
6. `child_index_be32` は `identifier | 0x80000000` を unsigned 32 bit big-endian で表現する。
7. child node は `HMAC-SHA512(key = parent_chain_code, data = child_data)` で生成し、同様に先頭 32 byte を child private key、後半 32 byte を child chain code とする。
8. path の全 segment について上記 child derivation を順番に適用し、最終 node の private key を Derived Software Key とする。

この規則は `symbol-sdk` 3.3.2 の `Bip32` / `Bip32Node` の `fromSeed`、`deriveOne`、`derivePath` と互換でなければならない。`bitcore-mnemonic` は Mnemonic の生成・seed 化に使用される SDK 依存実装であり、Wallet Core が同パッケージ自体へ依存することは要求しない。

Profile schema version 1 の導出パスは次で固定する。

| Chain | Network | path |
| --- | --- | --- |
| Symbol | Mainnet | `m/44'/4343'/account'/0'/0'` |
| Symbol | Testnet | `m/44'/1'/account'/0'/0'` |
| NEM | Mainnet | `m/44'/43'/account'/0'/0'` |
| NEM | Testnet | `m/44'/1'/account'/0'/0'` |

`account_index` の有効範囲は `0..=2147483647` とし、パス上では hardened index として使用する。

schema version 1 の導出規則は後から変更しない。将来導出規則を変更する場合は新しい Profile schema version を割り当てる。

既存 Symbol / NEM Wallet との復元互換性は、`symbol-sdk` 3.3.2 の上記 HD 導出結果を v1 の基準とする。追加で特定の既存 Wallet との互換性を主張する場合は、リポジトリ内で対象 Wallet の名称、版または commit、入力および期待値を特定できる fixture の範囲に限定する。`symbol-sdk` 3.3.2 は HD 導出、導出後の鍵、公開情報、署名および Network 処理の v1 互換性基準とする。

Symbol / NEM Testnet は同じ path になるため、同一 Mnemonic / account index から同一秘密鍵が導出され得る。この場合でも Software Key は Chain に固定されるため、Symbol 用と NEM 用は別 Software Key として登録できる。

### 4.3 導出結果の登録

導出処理は次の順序を基本とする。

1. Profile パスワード認証
2. Mnemonic 復号
3. seed 生成
4. Chain / Network / account index / schema version から path 決定
5. private key 導出・妥当性検証
6. 対象 Profile 内・同一 Chain で重複判定
7. Software Key 登録
8. temporary secret zeroize
9. replacement Store 生成

失敗した場合は replacement Store を返さない。

---

## 5. 秘密鍵と Chain 互換性

### 5.1 秘密鍵表現

Core 内部および Core / Binding 境界の private key は raw 32 byte 固定長バイト列として扱う。

外部インポート API は raw 32 bytes のみ受け付ける。hex string、`0x` prefix 付き string その他の textual private key 表現は Core / Binding の公開 API として受け付けない。Application が利用者入力として hex を受け付ける場合、Application 側で decode して raw 32 bytes に変換し、textual representation を Core へ渡さない。

内部保存時も raw 32 bytes とし、hex string を保存しない。

### 5.2 private key 妥当性

次を拒否する。

- 32 bytes 以外の長さ
- all-zero key
- 対象 Chain の鍵処理で有効な公開鍵を生成できない値

公開鍵・アドレス・署名結果は固定テストベクタと `symbol-sdk` 3.3.2 で相互検証する。

`generate_software_key` は、暗号学的に安全で予測不能な実行環境の乱数源から候補 private key を取得し、対象 Chain で有効な値として検証できたものだけを登録する。時刻、UUID、固定値、呼び出し側の決定的 seed、Mnemonic からの派生値または予測可能な fallback を生成源として使用しない。乱数源の利用に失敗した場合は `RandomSourceFailure` とし、Profile を変更しない。

### 5.3 Generated / Imported / Derived 共通規則

すべての Software Key は登録時に Chain を固定する。

同一 private key でも Chain が異なる場合は別 Software Key として扱う。重複判定は対象 Profile 内かつ同一 Chain に限定する。

---

## 6. 暗号化仕様

### 6.1 KDF

Profile パスワードから Profile encryption key を導出する方式は Argon2id とする。

v1 parameters:

```text
version      = 0x13
memory       = 65536 KiB
iterations   = 3
parallelism  = 1
salt         = 16 random bytes
output       = 32 bytes
```

KDF algorithm ID と Store 内の parameter schema は `wallet-store-format-v1.md` に従う。

Profile パスワード品質は Core では判定しない。ただし未指定・空文字列は拒否する。

Core / Binding 境界では Profile password を JavaScript string として公開 API に使用せず、UTF-8 byte sequence として受け渡す。Application が UI の password input から JavaScript string を得る場合、その string は Binding 契約外の一時入力とし、可能な限り短時間で UTF-8 bytes に変換して長期保持しない。

### 6.2 AEAD

秘密 payload の暗号化は AES-256-GCM とする。

```text
key          = Argon2id output, 32 bytes
nonce        = 12 random bytes per encryption
TAG          = 16 bytes
```

同一 key で nonce を再利用しない。nonce は暗号化ごとに CSPRNG で生成する。

### 6.3 AAD と平文 metadata

AAD の正確な構成と deterministic CBOR 表現は `wallet-store-format-v1.md` を正本とする。

Profile 名と Account metadata は一覧取得のため暗号化しないが、実際の manifest と同じ optional key 省略規則で AAD に含め、AES-256-GCM の認証対象とする。`registry_key` と `duplicate_tag` も AAD に含める。このため metadata、重複判定情報または Store identity の変更を伴う mutation は Profile password で既存 payload を認証・復号し、新しい nonce で再暗号化する。

パスワードなしの一覧 API は平文 metadata を返せるが、その時点では AEAD 認証を実行できない。Application は一覧結果を「保存された表示用 metadata」として扱い、暗号学的に認証済みの値とはみなさない。

### 6.4 Profile パスワード認証

独立した password hash は保存しない。

AEAD 復号と authentication tag 検証の成功を Profile パスワード認証として扱う。

認証失敗時は「password 不一致」と「暗号文または AAD 改ざん」の差を外部へ公開せず `AuthenticationFailed` とする。

### 6.5 password change

password change は current password で認証・復号した後、新 salt / new Argon2id key / new nonce を生成し、Profile payload 全体を再暗号化して replacement Store を返す。

旧暗号 payload の一部を再利用しない。

---

## 7. Wallet Store 契約

Wallet Store の CBOR schema、整数 key、enum wire 値、並び順、AAD、重複タグ、unknown field / enum、DecodeWarning、version / migration の正確な規則は `docs/specifications/wallet-store-format-v1.md` に従う。

本書では次の動作だけを API 契約として固定する。

- `profiles = []` と `software_keys = []` は正常状態として扱う。
- 子オブジェクトの必須 field 欠落、型・長さ・値不正、未知 enum は保存フォーマット仕様に従って対象オブジェクトをスキップし、構造化 warning を返す。
- Store top-level を解釈できない不正は `InvalidStore` または version 専用 error とする。
- 未知 field は読み込み時に無視し、再保存時に保持しない。
- Store / Profile schema の migration は暗黙に行わない。
- 将来 migration が必要な場合は `migrate_store_v1_to_v2` のような変換元・変換先 version 固定 API を追加する。

Profile 重複判定と Software Key 重複判定の wire-level 入力形式は保存フォーマット仕様を正本とする。

---

## 8. Profile 作成と初回 Mnemonic 受渡し

### 8.1 新規生成

新規 Mnemonic 生成 Profile は二段階とする。

```text
prepare_generated_profile(...)
        │
        ├─ mnemonic_utf8
        └─ PendingProfileBlob

finalize_generated_profile(store, pending_blob, password)
        │
        └─ replacement store
```

`prepare_generated_profile` は Store に Profile を追加しない。Application は Mnemonic のバックアップ受渡しを完了した後だけ `finalize_generated_profile` を呼ぶ。

受渡し完了の確認方法および受領者の確認は Application / 利用者の責任とし、Core は UI 手順や受領者本人性を検証しない。受渡し失敗・中断または `finalize_generated_profile` の失敗時は、新規 Profile を正常状態として残さず、replacement Store を返さず、Core / Binding が Mnemonic を継続保持または診断出力へ含めない。

`PendingProfileBlob` は Core 内部の versioned opaque blob とし、Wallet Store の wire-level 互換契約には含めない。外部契約として、format version を識別でき、`prepare_generated_profile` に渡した対象 Store と結び付き、Profile password で保護され、改ざん・破損を検知できることだけを要求する。具体的な CBOR key、内部 envelope schema、nonce構造、期限および再利用回数は公開契約に含めない。

`finalize_generated_profile` は同じ Profile password を受け取り、Pending、対象 Store、password、Profile schema および既存 Profile との整合性を検証する。対象 Storeとの結合が一致しない、Pendingのversionが未対応、Pendingが改ざん・破損している、またはProfile作成条件を満たさない場合は `PendingProfileInvalid` とする。Pendingのpassword認証または保護データの認証に失敗した場合は、§6.4 に従い `AuthenticationFailed` とする。既存Profileと同一 Mnemonic + Network になる場合は `DuplicateProfile` とする。

中断時は pending blob を破棄する。

### 8.2 復元 Profile

既存 Mnemonic からの復元では UTF-8 bytes を入力として受け取り、正規化・24 words BIP39 validity と Profile 重複を確認してから登録する。新規生成時の backup confirmation は要求しない。

### 8.3 表示名

Profile 名と Software Key の Account 名は optional とし、有効な UTF-8 text、最大 64 bytes とする。文字種は制限しない。

名前は平文 metadata として保存するが AAD の認証対象とする。追加時に指定でき、後から変更する API も提供する。

### 8.4 保存済み秘密情報の通常取得禁止

保存済み秘密情報を対象識別子だけで取得する API は提供しない。

Mnemonic / Software Key 秘密鍵の返却は、正しい Profile パスワードを要求する明示的な個別エクスポート操作に限る。

---

## 9. 公開 API 契約

Rust public API は implementation language 固有の細部を Binding へ漏らさない DTO を使用する。

秘密情報を表す text は公開 API では byte sequence として扱う。Mnemonic と Profile password は UTF-8 bytes、private key は raw 32 bytes とする。Profile 名、Account 名、address、UUID のような非秘密 text は通常の text 型を使用できる。

### 9.1 warning を伴う結果

Store decode 中にスキップが発生した場合、warning をログへ直接出力するのではなく operation result の diagnostics として Binding へ返す。

```text
DecodeWarning {
  code,
  object_type,
  object_id?,
  field?
}

ReadResult<T> {
  value: T,
  warnings: [DecodeWarning]
}

MutationResult<T> {
  store: WalletStoreBlob,
  value: T,
  warnings: [DecodeWarning]
}
```

warning に Mnemonic、private key、Profile password、seed、ciphertext の内容などの秘密情報を含めてはならない。

### 9.2 概念 API

```text
create_empty_store() -> WalletStoreBlob

prepare_generated_profile(
  store,
  password_utf8: bytes,
  network,
  name?
) -> ReadResult<PreparedProfile { mnemonic_utf8: bytes, pending_profile }>

finalize_generated_profile(
  store,
  pending_profile,
  password_utf8: bytes
) -> MutationResult<ProfileInfo>

restore_profile(
  store,
  mnemonic_utf8: bytes,
  password_utf8: bytes,
  network,
  name?
) -> MutationResult<ProfileInfo>

export_mnemonic(
  store,
  profile_id,
  password_utf8: bytes
) -> ReadResult<MnemonicExport>

export_private_key(
  store,
  profile_id,
  key_id,
  password_utf8: bytes
) -> ReadResult<PrivateKeyExport>

list_profiles(store) -> ReadResult<[ProfileInfo]>

list_software_keys(
  store,
  profile_id
) -> ReadResult<[SoftwareKeyListItem]>

derive_software_key(
  store,
  profile_id,
  password_utf8: bytes,
  chain,
  account_index,
  name?
) -> MutationResult<SoftwareKeyInfo>

import_software_key(
  store,
  profile_id,
  password_utf8: bytes,
  chain,
  private_key: bytes[32],
  name?
) -> MutationResult<SoftwareKeyInfo>

generate_software_key(
  store,
  profile_id,
  password_utf8: bytes,
  chain,
  name?
) -> MutationResult<SoftwareKeyInfo>

set_profile_name(
  store,
  profile_id,
  password_utf8: bytes,
  name?
) -> MutationResult<ProfileInfo>

set_software_key_name(
  store,
  profile_id,
  key_id,
  password_utf8: bytes,
  name?
) -> MutationResult<SoftwareKeyInfo>

get_public_account(
  store,
  profile_id,
  key_id,
  password_utf8: bytes
) -> ReadResult<PublicAccountInfo>

sign(
  store,
  profile_id,
  key_id,
  password_utf8: bytes,
  payload
) -> ReadResult<Signature>

change_profile_password(
  store,
  profile_id,
  current_password_utf8: bytes,
  new_password_utf8: bytes
) -> MutationResult<()>

delete_software_key(
  store,
  profile_id,
  key_id,
  password_utf8: bytes
) -> MutationResult<()>

delete_profile(
  store,
  profile_id,
  password_utf8: bytes
) -> MutationResult<()>
```

`name?` 未指定は名前なしを表す。名前の Store 表現は保存フォーマット仕様に従う。

### 9.3 ProfileInfo / SoftwareKeyInfo

秘密情報を含めない。

```text
ProfileInfo {
  profile_id,
  network,
  name?,
  software_key_count
}

SoftwareKeyInfo {
  key_id,
  chain,
  origin,
  name?
}

SoftwareKeyListItem {
  key_id,
  chain,
  name?
}
```

`list_profiles` / `list_software_keys` は平文 metadata だけで取得できるため Profile password を要求しない。`list_software_keys` は `SoftwareKeyListItem` を返し、`origin` を返さない。`SoftwareKeyInfo` は `derive_software_key`、`import_software_key`、`generate_software_key` および `set_software_key_name` のように Profile payload を認証・復号する結果で使用する。§6.3 のとおり、一覧結果の表示名・Account metadata は未認証である。

### 9.4 個別エクスポート

```text
MnemonicExport {
  mnemonic_utf8: bytes
}

PrivateKeyExport {
  private_key: bytes[32]
}
```

個別エクスポートは Store を変更しない。認証・対象確認・復号・返却のいずれかに失敗した場合は秘密情報を返さない。

`MnemonicExport.mnemonic_utf8` は正規化済み 24 words BIP39 の UTF-8 bytes、`PrivateKeyExport.private_key` は raw 32 bytes とする。Core / Binding は結果を継続保持またはキャッシュしない。

### 9.5 署名 payload

Core は payload を意味解釈しない。

```text
sign(..., payload: bytes)
```

Software Key に固定された Symbol / NEM の署名 primitive を適用する。Transaction 構造の妥当性や generation hash の組み立て等は上位層の責任とする。

`PublicAccountInfo` は次の項目を持ち、秘密鍵を含めない。

```text
PublicAccountInfo {
  key_id,
  chain,
  network,
  public_key: bytes[32],
  address: text
}
```

`public_key` は対象 Chain の公開鍵 raw bytes、`address` は対象 Chain / Network のアドレス文字列表現とする。`Signature` は次の項目を持つ。

```text
Signature {
  signature: bytes[64]
}
```

Native / WASM は同じ入力に対して同じ DTO 値および同じ署名 bytes を返す。Binding は binary 値を raw byte sequence として受け渡し、Core は payload に prefix、generation hash または Transaction 解釈を暗黙に追加しない。

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

DecodeWarning の code は `wallet-store-format-v1.md` に従い、fatal error と区別する。

error / warning message に Mnemonic、private key、Profile password、derived seed、decrypted payload、secret の hash / hex dump を含めない。

panic / stack trace に秘密値を format しない。

主要な失敗条件は次の既存 error code に対応付ける。

| 失敗条件 | error code |
| --- | --- |
| 引数・名前・payload等の入力不正 | `InvalidArgument` |
| Mnemonic / private key / account index不正 | `InvalidMnemonic` / `InvalidPrivateKey` / `InvalidAccountIndex` |
| 対象 Profile / Software Key 不存在 | `ProfileNotFound` / `SoftwareKeyNotFound` |
| password不一致またはAEAD認証失敗 | `AuthenticationFailed` |
| Profile / Software Key 重複 | `DuplicateProfile` / `DuplicateSoftwareKey` |
| Profile Network と Chain / Network 条件の不一致 | `NetworkMismatch` |
| Store構造または型の致命的な不正 | `InvalidStore` |
| 未対応 Store / Profile schema version | `UnsupportedStoreVersion` / `UnsupportedProfileSchemaVersion` |
| Pendingのversion、対象Store、改ざんまたは整合性不正 | `PendingProfileInvalid` |
| Pendingを含むpassword認証または保護データの認証失敗 | `AuthenticationFailed` |
| 乱数源、暗号または保存bytes生成の失敗 | `RandomSourceFailure` / `CryptoFailure` / `SerializationFailure` |

Store子オブジェクトのスキップ可能な不正は `wallet-store-format-v1.md` の `DecodeWarning` とし、fatal error と混同しない。認証・復号および AAD 検証は重複判定や秘密情報処理より先に実行する。

---

## 11. atomicity と状態遷移

状態変更 API は成功時にのみ replacement Store を返す。途中処理に失敗した場合は replacement Store を返さない。

次は atomic replacement とする。

- Profile 作成 / 復元
- Derived / Imported / Generated key 登録
- Profile / Account 名変更
- password change
- Software Key delete
- Profile delete

Mutation は要求対象 Profile の envelope だけを置換し、他 Profile の encrypted payload、salt、nonce、ID、duplicate tag を変更しない。Profile delete の場合のみ対象 envelope を除去する。

Profile / Account 名変更は AAD が変わるため、対象 Profile を認証・復号して new nonce で再暗号化する。

`registry_key` は Store 更新を通じて変更せず、既存 Profile の `duplicate_tag` も変更しない。これらを含む AAD の認証に失敗した場合、秘密情報処理、重複判定および mutation を実行しない。

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

秘密情報は可能な限り owned buffer を 1 個に限定し、不必要な `clone()` を避ける。

`Debug`, `Display`, serde diagnostic output に secret field を出さない Secret wrapper type を使用する。

### 12.3 WASM / JavaScript 制約

WASM linear memory を恒久的保護領域とはみなさない。

JavaScript へ secret を返す、または JavaScript から secret を受け取るのは次に限る。

- `prepare_generated_profile` の初回 Mnemonic UTF-8 bytes
- `restore_profile` の Mnemonic UTF-8 bytes
- `export_mnemonic` の成功結果の Mnemonic UTF-8 bytes
- `export_private_key` の成功結果の raw private key bytes
- 外部から Core へ入力する Profile password UTF-8 bytes
- 外部から Core へ入力する imported private key raw bytes

WASM / JavaScript Binding は Mnemonic、Profile password、private key を JavaScript string として公開 API に使用してはならない。これらは `Uint8Array` 相当の mutable byte buffer で受け渡す。秘密情報を hex / Base64 その他の text 表現へ暗黙変換しない。

`PendingProfileBlob` は opaque binary としてだけ Binding を通過し、内部 envelope schema を Binding 契約へ公開しない。

Binding は秘密入力 buffer を API 呼び出し完了後まで保持せず、不要なコピーを作らない。Binding 内部で一時コピーが必要な場合、その buffer は処理完了後に可能な範囲で zeroize する。Core は JavaScript 側の入力 buffer を所有しないため、呼び出し側は不要になった `Uint8Array` を上書き可能な形で管理する。

Binding 側で secret を component state、global state、cache、log、diagnostic、localStorage、sessionStorage、IndexedDB その他の永続領域へ保存しない。Application が Mnemonic を表示するため JavaScript string へ decode する場合、その string の完全消去は保証できないため、表示に必要な最短期間だけ参照し、再利用可能な state や log へ渡さない。

WASM memory zeroize および JavaScript `Uint8Array` の上書きは best effort であり、JavaScript runtime / browser process 全体からの完全消去を保証しない。Binding はこの制約を理由に secret の長期保持を許容してはならない。

---

## 13. Native / WASM Binding

Binding は型変換、byte buffer transfer、error / warning mapping、lifecycle / memory ownership の橋渡しだけを行う。

Binding に暗号化、password authentication、Mnemonic validation、key derivation、signing、duplicate detection を再実装しない。

Native Binding は C ABI / UniFFI 等の具体方式を実装側で選択できるが、秘密情報処理ロジックを Core と重複させない。

WASM public API は `Uint8Array` を binary data の基本型とする。Wallet Store blob、PendingProfileBlob、署名 payload、signature、public key、Mnemonic UTF-8 bytes、Profile password UTF-8 bytes、import / export private key は `Uint8Array` 相当とする。

Mnemonic / Profile password の byte sequence は strict UTF-8 とし、不正 UTF-8 は `InvalidMnemonic` または password 入力に対する `InvalidArgument` として拒否する。private key は raw 32 bytes 固定とし、Binding 層で textual encoding を受け付けない。

非秘密情報である Profile 名、Account 名、address、UUID 等は JavaScript string を利用できる。

---

## 14. テスト

### 14.1 互換性 fixture

最低限、次の deterministic fixture を固定する。

- BIP39 24 words mnemonic -> seed
- `symbol-sdk` 3.3.2 `Bip32` と同一 seed / path から root private key / chain code、各 hardened child private key / chain code、最終 private key が一致すること
- Symbol Mainnet / Testnet path -> private/public key/address
- NEM Mainnet / Testnet path -> private/public key/address
- Symbol / NEM signing payload -> signature verification
- Argon2id output
- AAD bytes
- AES-256-GCM ciphertext / authentication tag
- RFC 8949 Core Deterministic Encoding に従う CBOR bytes
- `duplicate_tag` bytes
- `registry_key` / `duplicate_tag` を含む AAD bytes
- Profile name / Account name の有無と map key省略を反映した `manifest_metadata` bytes

暗号化 fixture の password / salt / nonce 固定は test-only とする。

### 14.2 セキュリティ・状態遷移テスト

最低限次を自動テストする。

- wrong password で復号不可
- ciphertext / tag / AAD 1 bit 改変で認証失敗
- Profile / Account 平文 metadata 改変後の認証失敗
- `registry_key` または `duplicate_tag` 改変後の認証失敗
- empty password reject
- duplicate Profile reject
- 同一 Profile・同一 Chain・同一 private key の duplicate Software Key reject
- 同一 private key でも Chain が異なる場合は登録可能
- 同一 Mnemonic でも Network が異なる Profile は登録可能
- 24 words 以外 / invalid Mnemonic reject
- invalid UTF-8 Mnemonic / password byte sequence reject
- 32 bytes 以外 / all-zero / Chain 上無効な imported private key reject
- account index 範囲外 reject
- malformed child object をスキップし DecodeWarning を返す
- `list_software_keys` が `SoftwareKeyListItem` を返し、`origin` を含めない
- Pendingのversion不正、対象Store不一致、password不一致、改ざん、重複を拒否し、失敗時にinput Storeを変更しない
- Generated Software Key の乱数源失敗、妥当性失敗、保存失敗で Profile を変更しない
- failed mutation で input Store が変更されない
- password change 後に旧 password 使用不可
- delete key / Profile 後に対象操作不可
- 別 Profile へ mutation が越境しない
- 正しい password で Mnemonic / Derived / Imported / Generated private key を個別エクスポートできる
- 誤 password、対象不存在、復号失敗で秘密情報を返さない
- 通常 API に Mnemonic / private key が含まれない
- WASM public API に Mnemonic、Profile password、private key を JavaScript string で受け渡す経路が存在しない
- WASM の secret 入出力が `Uint8Array` 相当であり、private key が raw 32 bytes である
- Native / WASM が同じ fixture 結果を返す
- error / warning / Debug output に secret が含まれない

---

## 15. 要件トレーサビリティ

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

表示名は保存フォーマットと API 契約上の optional metadata とし、秘密情報・署名・鍵導出の意味を変更しない。

---

## 16. v1 で固定しない実装詳細

次は本仕様を満たす限り実装側で選択可能とする。

- Rust module / crate の具体的な配置
- C ABI / UniFFI 等 Native Binding generator
- TypeScript wrapper の package layout
- 上位 Application の filesystem / IndexedDB 保存 API
- temporary file の名称
- UI 上の password policy
- UI 上の Mnemonic backup confirmation 手順

これらを理由に Core の暗号方式、保存 schema、HD path、API security boundary を変更してはならない。

---

## 17. 参照

- `docs/requirements/requirements.md`
- `docs/specifications/wallet-store-format-v1.md`
- `docs/decisions/open-001.md`
- `docs/decisions/open-002.md`
- `docs/decisions/open-validity-001.md`
- RFC 8949: Concise Binary Object Representation (CBOR)
- BIP39: Mnemonic code for generating deterministic keys
- BIP44: Multi-Account Hierarchy for Deterministic Wallets
- SLIP-0044: registered coin types
- `symbol-sdk` 3.3.2 `sdk/javascript/src/Bip32.js`
- `symbol-sdk` 3.3.2

本書の変更で要件そのものを変更する必要が生じた場合は、仕様側で暗黙に拡張せず `docs/requirements/requirements.md` または decision record 側へ戻して決定する。
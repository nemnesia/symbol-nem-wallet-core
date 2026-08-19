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

### 4.2 HD 導出

Profile schema version 1 の導出パスは次で固定する。

| Chain | Network | path |
| --- | --- | --- |
| Symbol | Mainnet | `m/44'/4343'/account'/0'/0'` |
| Symbol | Testnet | `m/44'/1'/account'/0'/0'` |
| NEM | Mainnet | `m/44'/43'/account'/0'/0'` |
| NEM | Testnet | `m/44'/1'/account'/0'/0'` |

`account_index` の有効範囲は `0..=2147483647` とし、パス上では hardened index として使用する。

schema version 1 の導出規則は後から変更しない。将来導出規則を変更する場合は新しい Profile schema version を割り当てる。

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

Core 内部の private key は 32 byte 固定長バイト列として扱う。

外部インポート API は 64 hexadecimal characters のみ受け付ける。大文字・小文字はいずれも受理し、`0x` prefix は受理しない。

内部保存時は raw 32 bytes とし、hex string を保存しない。

### 5.2 private key 妥当性

次を拒否する。

- 長さ不正
- hex decode 不能
- all-zero key
- 対象 Chain の鍵処理で有効な公開鍵を生成できない値

公開鍵・アドレス・署名結果は固定テストベクタと `symbol-sdk` 3.3.2 で相互検証する。

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

Profile 名と Account metadata は一覧取得のため暗号化しないが、AAD に含めて AES-256-GCM の認証対象とする。このため metadata の変更を伴う mutation は Profile password で既存 payload を認証・復号し、新しい nonce で再暗号化する。

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
        ├─ mnemonic
        └─ PendingProfileBlob

finalize_generated_profile(store, pending_blob)
        │
        └─ replacement store
```

`prepare_generated_profile` は Store に Profile を追加しない。Application は Mnemonic のバックアップ受渡しを完了した後だけ `finalize_generated_profile` を呼ぶ。

`PendingProfileBlob` は Core 内部の versioned opaque blob とし、Wallet Store の wire-level 互換契約には含めない。

中断時は pending blob を破棄する。

### 8.2 復元 Profile

既存 Mnemonic からの復元では 24 words BIP39 validity と Profile 重複を確認してから登録する。新規生成時の backup confirmation は要求しない。

### 8.3 表示名

Profile 名と Software Key の Account 名は optional とし、有効な UTF-8 text、最大 64 bytes とする。文字種は制限しない。

名前は平文 metadata として保存するが AAD の認証対象とする。追加時に指定でき、後から変更する API も提供する。

### 8.4 保存済み秘密情報の通常取得禁止

保存済み秘密情報を対象識別子だけで取得する API は提供しない。

Mnemonic / Software Key 秘密鍵の返却は、正しい Profile パスワードを要求する明示的な個別エクスポート操作に限る。

---

## 9. 公開 API 契約

Rust public API は implementation language 固有の細部を Binding へ漏らさない DTO を使用する。

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
  password,
  network,
  name?
) -> ReadResult<PreparedProfile { mnemonic, pending_profile }>

finalize_generated_profile(
  store,
  pending_profile
) -> MutationResult<ProfileInfo>

restore_profile(
  store,
  mnemonic,
  password,
  network,
  name?
) -> MutationResult<ProfileInfo>

export_mnemonic(
  store,
  profile_id,
  password
) -> ReadResult<MnemonicExport>

export_private_key(
  store,
  profile_id,
  key_id,
  password
) -> ReadResult<PrivateKeyExport>

list_profiles(store) -> ReadResult<[ProfileInfo]>

list_software_keys(
  store,
  profile_id
) -> ReadResult<[SoftwareKeyInfo]>

derive_software_key(
  store,
  profile_id,
  password,
  chain,
  account_index,
  name?
) -> MutationResult<SoftwareKeyInfo>

import_software_key(
  store,
  profile_id,
  password,
  chain,
  private_key_hex,
  name?
) -> MutationResult<SoftwareKeyInfo>

generate_software_key(
  store,
  profile_id,
  password,
  chain,
  name?
) -> MutationResult<SoftwareKeyInfo>

set_profile_name(
  store,
  profile_id,
  password,
  name?
) -> MutationResult<ProfileInfo>

set_software_key_name(
  store,
  profile_id,
  key_id,
  password,
  name?
) -> MutationResult<SoftwareKeyInfo>

get_public_account(
  store,
  profile_id,
  key_id,
  password
) -> ReadResult<PublicAccountInfo>

sign(
  store,
  profile_id,
  key_id,
  password,
  payload
) -> ReadResult<Signature>

change_profile_password(
  store,
  profile_id,
  current_password,
  new_password
) -> MutationResult<()>

delete_software_key(
  store,
  profile_id,
  key_id,
  password
) -> MutationResult<()>

delete_profile(
  store,
  profile_id,
  password
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
```

`list_profiles` / `list_software_keys` は平文 metadata だけで取得できるため Profile password を要求しない。§6.3 のとおり、この時点の表示名・Account metadata は未認証である。

### 9.4 個別エクスポート

```text
MnemonicExport {
  mnemonic: normalized BIP39 word string
}

PrivateKeyExport {
  private_key: bytes[32]
}
```

個別エクスポートは Store を変更しない。認証・対象確認・復号・返却のいずれかに失敗した場合は秘密情報を返さない。

`MnemonicExport.mnemonic` は正規化済み 24 words BIP39 word string、`PrivateKeyExport.private_key` は raw 32 bytes とする。Core / Binding は結果を継続保持またはキャッシュしない。

### 9.5 署名 payload

Core は payload を意味解釈しない。

```text
sign(..., payload: bytes)
```

Software Key に固定された Symbol / NEM の署名 primitive を適用する。Transaction 構造の妥当性や generation hash の組み立て等は上位層の責任とする。

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

### 12.3 WASM 制約

WASM linear memory を恒久的保護領域とはみなさない。

JavaScript へ secret を返すのは次に限る。

- `prepare_generated_profile` の初回 Mnemonic
- `export_mnemonic` の成功結果
- `export_private_key` の成功結果
- 外部から Core へ入力する Profile password
- 外部から Core へ入力する imported private key

Binding 側で secret を state / cache / log へ保存しない。

WASM memory zeroize は best effort であり、JavaScript runtime / browser process 全体からの完全消去を保証しない。

---

## 13. Native / WASM Binding

Binding は型変換、byte buffer transfer、error / warning mapping、lifecycle / memory ownership の橋渡しだけを行う。

Binding に暗号化、password authentication、Mnemonic validation、key derivation、signing、duplicate detection を再実装しない。

Native Binding は C ABI / UniFFI 等の具体方式を実装側で選択できるが、秘密情報処理ロジックを Core と重複させない。

WASM public API は `Uint8Array` を binary data の基本型とする。Store blob、pending blob、署名 payload、private key export は `Uint8Array` 相当とする。

---

## 14. テスト

### 14.1 互換性 fixture

最低限、次の deterministic fixture を固定する。

- BIP39 24 words mnemonic -> seed
- Symbol Mainnet / Testnet path -> private/public key/address
- NEM Mainnet / Testnet path -> private/public key/address
- Symbol / NEM signing payload -> signature verification
- Argon2id output
- AAD bytes
- AES-256-GCM ciphertext / authentication tag
- RFC 8949 Core Deterministic Encoding に従う CBOR bytes
- `duplicate_tag` bytes

暗号化 fixture の password / salt / nonce 固定は test-only とする。

### 14.2 セキュリティ・状態遷移テスト

最低限次を自動テストする。

- wrong password で復号不可
- ciphertext / tag / AAD 1 bit 改変で認証失敗
- Profile / Account 平文 metadata 改変後の認証失敗
- empty password reject
- duplicate Profile reject
- 同一 Profile・同一 Chain・同一 private key の duplicate Software Key reject
- 同一 private key でも Chain が異なる場合は登録可能
- 同一 Mnemonic でも Network が異なる Profile は登録可能
- 24 words 以外 / invalid Mnemonic reject
- invalid private key reject
- account index 範囲外 reject
- malformed child object をスキップし DecodeWarning を返す
- failed mutation で input Store が変更されない
- password change 後に旧 password 使用不可
- delete key / Profile 後に対象操作不可
- 別 Profile へ mutation が越境しない
- 正しい password で Mnemonic / Derived / Imported / Generated private key を個別エクスポートできる
- 誤 password、対象不存在、復号失敗で秘密情報を返さない
- 通常 API に Mnemonic / private key が含まれない
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
- Symbol / NEM wallet HD derivation compatibility lineage
- `symbol-sdk` 3.3.2

本書の変更で要件そのものを変更する必要が生じた場合は、仕様側で暗黙に拡張せず `docs/requirements/requirements.md` または decision record 側へ戻して決定する。

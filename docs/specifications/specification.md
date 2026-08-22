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
- Profile / Software Key の表示名の生成・保存・変更・表示
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
- `profile_id` は Store 内で 1 つの Profile を一意に識別する。
- `key_id` は Profile 内で Chain にかかわらず 1 つの Software Key を一意に識別する。異なる Profile 間で同じ `key_id` を使用することは許可する。

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

Profile schema version 1 の HD 導出は `symbol-sdk` 3.3.2 の `sdk/javascript/src/Bip32.js` と、Chain ごとの `SymbolFacade` / `NemFacade` における BIP32 curve 名および BIP32 node から KeyPair への変換結果を規範とする。実装言語や利用ライブラリは問わないが、同一 Mnemonic、同一 Chain、同一 Network、同一 `account_index` から得られる BIP32 node と Derived Software Key は同 SDK 実装と一致しなければならない。

v1 の導出規則は次で固定する。

1. BIP39 Mnemonic から §4.1 の方法で 64 byte seed を生成する。
2. root HMAC key は Chain ごとに固定し、Symbol は UTF-8 `"ed25519 seed"`、NEM は UTF-8 `"ed25519-keccak seed"` とする。これは `SymbolFacade.BIP32_CURVE_NAME = "ed25519"` および `NemFacade.BIP32_CURVE_NAME = "ed25519-keccak"` を `Bip32` の curve name として使用した結果と一致させる。
3. root node は `HMAC-SHA512(key = root_hmac_key, data = seed)` で生成する。
4. HMAC 結果の先頭 32 byte を node private key、後半 32 byte を chain code とする。
5. 各 path segment は hardened child とし、child data は `0x00 || parent_private_key[32] || child_index_be32` とする。
6. `child_index_be32` は `identifier | 0x80000000` を unsigned 32 bit big-endian で表現する。
7. child node は `HMAC-SHA512(key = parent_chain_code, data = child_data)` で生成し、同様に先頭 32 byte を child private key、後半 32 byte を child chain code とする。
8. path の全 segment について上記 child derivation を順番に適用する。
9. Symbol の Derived Software Key は最終 BIP32 node の private key 32 bytes をそのまま使用する。
10. NEM の Derived Software Key は `symbol-sdk` 3.3.2 `NemFacade.bip32NodeToKeyPair()` と同様に、最終 BIP32 node の private key 32 bytes を reverse した値を使用する。以後、保存、個別エクスポート、公開鍵生成および署名へ渡す NEM private key はこの reverse 後の 32 bytes とする。

この BIP32 node derivation は `symbol-sdk` 3.3.2 の `Bip32` / `Bip32Node` の `fromSeed`、`deriveOne`、`derivePath` と互換でなければならない。Derived Software Key への最終変換は Symbol では `SymbolFacade.bip32NodeToKeyPair()`、NEM では `NemFacade.bip32NodeToKeyPair()` と互換でなければならない。`bitcore-mnemonic` は Mnemonic の生成・seed 化に使用される SDK 依存実装であり、Wallet Core が同パッケージ自体へ依存することは要求しない。

Profile schema version 1 の導出パスは次で固定する。

| Chain | Network | path |
| --- | --- | --- |
| Symbol | Mainnet | `m/44'/4343'/account'/0'/0'` |
| Symbol | Testnet | `m/44'/1'/account'/0'/0'` |
| NEM | Mainnet | `m/44'/43'/account'/0'/0'` |
| NEM | Testnet | `m/44'/1'/account'/0'/0'` |

`account_index` の有効範囲は `0..=2147483647` とし、パス上では hardened index として使用する。

schema version 1 の導出規則は後から変更しない。将来導出規則を変更する場合は新しい Profile schema version を割り当てる。

v1 の HD 復元互換性は、本項で固定した導出規則および §14.1 の deterministic fixture との一致によって判定する。特定の既存 Wallet 製品との包括的互換性は v1 の保証対象としない。特定 Wallet との互換性を追加する場合は、名称、version または commit、入力および期待値を fixture として固定した範囲に限り保証する。`symbol-sdk` 3.3.2 は HD 導出、導出後の鍵、公開情報、署名および Network 処理の v1 互換性基準とする。

Symbol / NEM Testnet は同じ path を使用するが、root HMAC key が Chain ごとに異なるため、同一 Mnemonic / `account_index` から同一 BIP32 tree を共有しない。異なる Chain の Software Key がインポート等により同一 private key を持つ場合は、§5.3 のとおり別 Software Key として扱う。

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

異なる Chain の Software Key が同一 private key を持つ場合も、それぞれ異なる `key_id` を持たなければならない。`key_id` の一意性と private key の重複判定は別の不変条件として扱う。

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

### 6.3 AAD と平文 software key index

`software_key_index` は一覧取得に必要な `key_id` と `chain` だけを持つ平文 manifest とし、`registry_key` および `duplicate_tag` とともに AES-256-GCM の AAD へ含める。AAD の正確な構成と deterministic CBOR 表現は `wallet-store-format-v1.md` を正本とする。

`registry_key` はStore blobの平文fieldであり、Store blobを取得できる攻撃者から秘匿される
秘密ではない。Store固有のdomain separationおよびintegrity contextに使用し、機密性を前提に
した機能追加を行ってはならない。

パスワードなしの一覧 API は平文 `software_key_index` を返せるが、その時点では AEAD 認証を実行できない。Application は一覧結果を未認証の保存情報として扱い、暗号学的に認証済みとはみなさない。当該操作で対象 Profile を認証・復号した後は、index と暗号化 payload が同一の `key_id -> chain` 写像を表すことを検証する。

対象 Profile の認証・復号後は、保存された `duplicate_tag` と、復号済み Mnemonic entropy および AAD で認証された Profile Network との意味的一致を `wallet-store-format-v1.md` §12 に従って検証する。AAD 認証の成功だけを、この意味的一致の証明としてはならない。

`software_key_index` の論理値には既知の `key_id` と `chain` だけを含める。Decoder は未知 field を論理モデル、一覧結果および意味検証へ取り込まない。既存 Profile の `software_key_index` の受信 wire 値（index entry 内の未知 field を含む）は、AAD の入力および再出力時の保存値として保持する。対象 Profile を保持する mutation（Software Key 登録・削除または password change）では、既知 fieldをcanonicalに再生成しつつ未知 fieldをlosslessに保持して新しい nonce で再暗号化する。対象または対象外 Profileの未知 fieldを保持できない場合は mutation 全体を拒否し、replacement Store を返してはならない。Profile delete では対象 envelope を除去し、再暗号化しない。正確な wire 表現は `wallet-store-format-v1.md` §2、§7.1、§11 を正本とする。

過去versionでAADの認証対象外だったunknown fieldに、同じschema versionのままsecurity上の
意味を与えてはならない。新しいfieldへsecurity上の意味を持たせる場合は、schema version、
AAD contractおよびmigrationを更新し、backward compatibilityを判断する。

### 6.4 Profile パスワード認証

独立した password hash は保存しない。

AEAD 復号と authentication tag 検証の成功を Profile パスワード認証として扱う。

認証失敗時は「password 不一致」と「暗号文または AAD 改ざん」の差を外部へ公開せず `AuthenticationFailed` とする。

v1 は Profile パスワードの復旧またはリセットを提供しない。パスワードを紛失した場合、正しい Profile パスワードを必要とする秘密情報処理、パスワード変更および削除は成功させず、代替認証による復旧・リセット経路も提供しない。利用者が別途保持する Mnemonic から同一 Network の新しい Profile を作成することは、削除済みまたは利用不能な Profile の復旧・リセットとは扱わない。

### 6.5 password change

password change は current password で認証・復号した後、新 salt / new Argon2id key / new nonce を生成し、Profile payload 全体を再暗号化して replacement Store を返す。

旧暗号 payload の一部を再利用しない。

---

## 7. Wallet Store 契約

Wallet Store の CBOR schema、整数 key、enum wire 値、並び順、AAD、重複タグ、unknown field / enum、DecodeWarning、version / migrationおよびresource limitの正確な規則は `docs/specifications/wallet-store-format-v1.md` に従う。

本書では次の動作だけを API 契約として固定する。

- `profiles = []` と `software_keys = []` は正常状態として扱う。
- `software_key_index = []` は正常状態として扱い、index は暗号化 payload と同一の `key_id -> chain` 写像を表さなければならない。
- 構造上受理された Profile の `profile_id` は Store 内で一意、対象 Profile の `key_id` は Chain にかかわらず Profile 内で一意でなければならない。
- 子オブジェクトの必須 field 欠落、型・長さ・値不正、未知 enum、重複、canonical order 違反および index と payload の対応不一致は、保存フォーマット仕様に従って Store 操作全体を fatal error として拒否する。対象オブジェクトをスキップして処理を継続してはならない。
- Store top-level を解釈できない不正は `InvalidStore` または version 専用 error とする。
- 未知 field は論理デコード時に無視し、意味解釈、一覧結果、重複判定または写像検証へ使用しない。未知 field を含む wire object を mutation で再出力する場合は、保存フォーマット仕様に従って未知 field を lossless に保持し、保持できない場合は `InvalidStore` として mutation 全体を拒否する。未知 field の存在自体は warning とせず、`UnknownField` warning を追加しない。
- `software_key_index` が AAD に含まれる場合、AAD は logical model から再構築せず、未知 map key を含む受信 wire 値を同じ要素順序・整数 key・空配列表現で使用する。
- Store / Profile schema の migration は暗黙に行わない。
- 将来 migration が必要な場合は `migrate_store_v1_to_v2` のような変換元・変換先 version 固定 API を追加する。

Profile 重複判定と Software Key 重複判定の wire-level 入力形式は保存フォーマット仕様を正本とする。

ID 一意性違反は子オブジェクトの選択またはスキップでは解消せず、保存フォーマット仕様に従い `InvalidStore` とする。対象 Profile の認証・復号後に検証する `duplicate_tag` と復号済み Mnemonic / Network の意味的一致、および `software_key_index` と payload の対応も同様とする。未対応 Profile schema version は `UnsupportedProfileSchemaVersion` とし、一覧、読出し、重複判定、秘密情報処理および mutation を含む Store 操作全体を拒否する。

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

Application は `prepare_generated_profile` が返した正確な Mnemonic 全体を意図した利用者へ提示し、利用者が記録・受領済みであることを明示確認した後だけ `finalize_generated_profile` を呼ばなければならない。UI方式、提示画面、確認文言および利用者本人性の検証方式は Core の契約に含めない。Core は受渡し完了の実体や利用者の確認事実を独立検証しない。

確認前、表示値不一致、受渡し失敗・中断、または `finalize_generated_profile` の失敗時は、新規 Profile を正常状態として残さず、replacement Store を返さず、Core / Binding が Mnemonic、Pending、または中間秘密情報を継続保持・cache・diagnostic output へ含めない。`finalize_generated_profile` の成功は replacement Store が返された場合だけ成立する。

`PendingProfileBlob` は Core 内部の versioned opaque blob とし、Wallet Store の wire-level 互換契約には含めない。外部契約として、format version を識別でき、`prepare_generated_profile` に渡した対象 Store と結び付き、Profile password で保護され、改ざん・破損を検知できることだけを要求する。具体的な CBOR key、内部 envelope schema、nonce構造、期限および再利用回数は公開契約に含めない。

`finalize_generated_profile` は同じ Profile password を受け取り、Pending、対象 Store、password、Profile schema および既存 Profile との整合性を検証する。対象 Storeとの結合が一致しない、Pendingのversionが未対応、Pendingが改ざん・破損している、またはProfile作成条件を満たさない場合は `PendingProfileInvalid` とする。Pendingのpassword認証または保護データの認証に失敗した場合は、§6.4 に従い `AuthenticationFailed` とする。仕様の整合性を満たす対象 Storeで既存Profileと同一 Mnemonic + Network になる場合は `DuplicateProfile` とする。

中断時は pending blob を破棄する。

### 8.2 復元 Profile

既存 Mnemonic からの復元では UTF-8 bytes を入力として受け取り、正規化・24 words BIP39 validity と Store / 既存 Profile の構造妥当性を確認してから登録する。この重複拒否保証は、Core が生成・維持する、本仕様の整合性を満たした Store を対象とする。候補 Mnemonic と Network から `wallet-store-format-v1.md` §12 の規則で計算した `duplicate_tag` を、構造上正常な既存 Profile の平文 `duplicate_tag` と比較する。一致する Profile があれば `DuplicateProfile` とし、input Store を変更せず replacement Store を返さない。不一致の場合、既存 Profile のパスワードを受け取らないため意味的一致を検証できないことだけを理由に復元を拒否しない。後続の操作で対象 Profile を認証・復号した時点に `duplicate_tag` と復号済み Mnemonic / Network の意味的不一致を検出した場合は `InvalidStore` とし、秘密情報、正常な処理結果または replacement Store を返さない。構造不正、認証失敗または認証済みpayloadとの既知の意味的不一致はこの継続規則の対象外とする。新規生成時の backup confirmation は要求しない。

### 8.3 表示名

Profile および Software Key の表示名は Core の管理対象外とする。Core は表示名を受け取らず、保存せず、返さず、変更 API を提供しない。

表示名の生成、入力検証、保存、同期、表示およびバックアップ範囲は Application の責任とし、本仕様では定義しない。表示名を `software_key_index` または Core の他の保存データへ含めてはならない。

### 8.4 保存済み秘密情報の通常取得禁止

保存済み秘密情報を対象識別子だけで取得する API は提供しない。

Mnemonic / Software Key 秘密鍵の返却は、正しい Profile パスワードを要求する明示的な個別エクスポート操作に限る。

Profile パスワードの復旧・リセット API は v1 で提供しない。パスワード紛失時は、正しい Profile パスワードを必要とする秘密情報処理、パスワード変更および削除を成功させない。

---

## 9. 公開 API 契約

Rust public API は implementation language 固有の細部を Binding へ漏らさない DTO を使用する。

秘密情報を表す text は公開 API では byte sequence として扱う。Mnemonic と Profile password は UTF-8 bytes、private key は raw 32 bytes とする。address、UUID のような非秘密 text は通常の text 型を使用できる。

### 9.1 diagnostics を伴う結果

operation result の warning はログへ直接出力せず diagnostics として Binding へ返す。v1 の不正 Profile は skip せず fatal error とし、未知 field は warning なしで受理する。

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
  network
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
  network
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
  account_index
) -> MutationResult<SoftwareKeyInfo>

import_software_key(
  store,
  profile_id,
  password_utf8: bytes,
  chain,
  private_key: bytes[32]
) -> MutationResult<SoftwareKeyInfo>

generate_software_key(
  store,
  profile_id,
  password_utf8: bytes,
  chain
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

Profile を対象とする API は `profile_id` で Store 内の 1 つの Profile を解決する。Software Key を対象とする API は、先に `profile_id` で Profile を解決し、次に当該 Profile 内の `key_id` で 1 つの Software Key を解決する。Chain または配列順を曖昧な ID の選択規則として使用してはならない。

表示名は Core API および Wallet Store に含めない。Application は `profile_id`、`key_id`、`chain` などの Core が返す識別情報と独自に管理する表示名を関連付ける。

### 9.3 ProfileInfo / SoftwareKeyInfo

秘密情報を含めない。

```text
ProfileInfo {
  profile_id,
  network,
  software_key_count
}

SoftwareKeyInfo {
  key_id,
  chain,
  origin
}

SoftwareKeyListItem {
  key_id,
  chain
}
```

`list_profiles` / `list_software_keys` は平文 `software_key_index` だけで取得できるため Profile password を要求しない。`list_software_keys` は `SoftwareKeyListItem` を返し、`origin` を返さない。`SoftwareKeyInfo` は `derive_software_key`、`import_software_key` および `generate_software_key` のように Profile payload を認証・復号する結果で使用する。§6.3 のとおり、一覧結果は未認証の平文 manifest である。

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

`DecodeWarning` を含む結果型は維持するが、v1 の不正 Profile、未知 enum、canonical order 違反または未知 field のために Profile を skip してはならない。未知 field は正常な forward-compatible wire data として warning なしで扱い、`UnknownField` warning は定義しない。fatal error の code は `wallet-store-format-v1.md` に従う。

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
| Store 内の `profile_id` 重複、または Profile 内の `key_id` 重複 | `InvalidStore` |
| 認証・復号後の `software_key_index` と Software Key payload の `key_id -> chain` 写像不一致 | `InvalidStore` |
| AEAD認証成功後の `duplicate_tag` と復号済み Mnemonic / 認証済み Network の意味的不一致 | `InvalidStore` |
| 未対応 Store / Profile schema version | `UnsupportedStoreVersion` / `UnsupportedProfileSchemaVersion` |
| Pendingのversion、対象Store、改ざんまたは整合性不正 | `PendingProfileInvalid` |
| Pendingを含むpassword認証または保護データの認証失敗 | `AuthenticationFailed` |
| 乱数源、暗号または保存bytes生成の失敗 | `RandomSourceFailure` / `CryptoFailure` / `SerializationFailure` |

Store子オブジェクトの必須 field 欠落、型・長さ・値不正、未知 enum、重複、canonical order 違反または index と payload の対応不一致は `InvalidStore` とし、Profileを skip してはならない。未対応schemaは `UnsupportedProfileSchemaVersion` とする。既存 Profile を対象とする処理では、Store構造と ID 一意性の検証、対象 Profile の一意な解決、認証・復号、`duplicate_tag` および `software_key_index` の意味的一致検証をこの順で行い、その後にだけ重複判定、秘密情報処理または mutation へ進む。パスワードを要求しない一覧処理も構造検証に失敗したStore全体を拒否し、認証後の意味的一致だけを保証しない。

---

## 11. atomicity と状態遷移

状態変更 API は成功時にのみ replacement Store を返す。途中処理に失敗した場合は replacement Store を返さない。

次は atomic replacement とする。

- Profile 作成 / 復元
- Derived / Imported / Generated key 登録
- password change
- Software Key delete
- Profile delete

Mutation は要求対象 Profile の envelope だけを置換し、他 Profile の encrypted payload、salt、nonce、ID、duplicate tag を変更しない。Profile delete の場合のみ対象 envelope を除去する。

対象外 Profile は再認証または再暗号化せず、Profile envelope と `software_key_index` の未知 fieldを含む受信 wire 値をlosslessに保持して、変更前と同じ AAD を再構成できるようにする。対象 Profile を保持する成功 mutation（Software Key 登録・削除または password change）では、既知 fieldをcanonicalに再生成し、既存の未知 fieldをlosslessに保持した上で、新しい nonce と AAD で再暗号化する。対象または対象外Profileの未知 fieldを保持できない場合は `InvalidStore` として mutation 全体を拒否し、replacement Store を返してはならない。Profile delete では対象 envelope を除去し、再暗号化しない。

成功時の replacement Store は、Store 内の `profile_id` 一意性と、各 Profile 内の Chain に依存しない `key_id` 一意性を維持しなければならない。

Software Key の登録・削除では、暗号化 payload の `software_keys` と平文 `software_key_index` を同一 replacement Store で更新する。index は payload の `(key_id, chain)` 射影から生成し、Application が index だけを変更する API は提供しない。index は AAD の一部であるため、対象 Profile を認証・復号して new nonce で再暗号化する。

`registry_key` は Store 更新を通じて変更せず、既存 Profile の `duplicate_tag` も変更しない。これらを含む AAD の認証に失敗した場合、秘密情報処理、重複判定および mutation を実行しない。AAD 認証後に `duplicate_tag` と復号済み Mnemonic / 認証済み Network の意味的不一致を検出した場合も同様とし、正常な read 結果、秘密情報または replacement Store を返さない。

---

## 12. メモリ上の秘密情報

### 12.1 zeroize 対象

Core および Binding が明示的に所有または生成する秘密情報の buffer は、利用終了時に
`zeroize` 対象とする。少なくとも次を含む。

- Profile password の Rust 側コピー
- BIP39 entropy
- mnemonic normalized buffer
- seed
- private key
- Argon2id output key
- decrypted ProfilePayload buffer
- Core 自身が明示的に確保した、secret を含む signing temporary buffer

第三者暗号ライブラリ内部の算術 temporary、コンパイラまたは optimizer が生成する暗黙の
copy、register、stack spill、runtime、allocator または OS 内部の copy について、完全な消去は
保証しない。
これらを `zeroize` するためだけに依存ライブラリを fork することは、v1 の必須要件としない。

Core は不要な secret copy を作成せず、利用する型または依存ライブラリが `zeroize` 機構を
提供する場合は、合理的な範囲でこれを利用する。ただし、source-level または process-wide
の全 secret temporary 消去をセキュリティ保証とはしない。

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

v1 Native Binding は `bindings/native` の C ABI (`cdylib` / `staticlib`) を使用し、v1 WASM Binding は `wasm-bindgen` を使用する。Binding方式を変更する場合は、本仕様と対応する決定記録を更新する。秘密情報処理ロジックを Core と重複させない。

WASM public API は `Uint8Array` を binary data の基本型とする。Wallet Store blob、PendingProfileBlob、署名 payload、signature、public key、Mnemonic UTF-8 bytes、Profile password UTF-8 bytes、import / export private key は `Uint8Array` 相当とする。

Mnemonic / Profile password の byte sequence は strict UTF-8 とし、不正 UTF-8 は `InvalidMnemonic` または password 入力に対する `InvalidArgument` として拒否する。private key は raw 32 bytes 固定とし、Binding 層で textual encoding を受け付けない。

非秘密情報である address、UUID 等は JavaScript string を利用できる。

---

## 14. テスト

### 14.1 互換性 fixture

最低限、次の deterministic fixture を固定する。

- BIP39 24 words mnemonic -> seed
- Symbol は root HMAC key `"ed25519 seed"`、NEM は root HMAC key `"ed25519-keccak seed"` を使用し、`symbol-sdk` 3.3.2 `Bip32` と同一 seed / path から root private key / chain code、各 hardened child private key / chain code、最終 BIP32 node private key が一致すること
- Symbol は最終 BIP32 node private key をそのまま、NEM はその bytes を reverse した値を Derived Software Key とし、それぞれ `SymbolFacade.bip32NodeToKeyPair()` / `NemFacade.bip32NodeToKeyPair()` の結果と一致すること
- Symbol Mainnet / Testnet path -> private/public key/address
- NEM Mainnet / Testnet path -> private/public key/address
- Symbol / NEM signing payload -> signature verification
- Argon2id output
- AAD bytes
- AES-256-GCM ciphertext / authentication tag
- RFC 8949 Core Deterministic Encoding に従う CBOR bytes
- `duplicate_tag` bytes
- `registry_key` / `duplicate_tag` を含む AAD bytes
- 空および複数要素の `software_key_index` を含む deterministic manifest bytes

暗号化 fixture の password / salt / nonce 固定は test-only とする。

### 14.2 セキュリティ・状態遷移テスト

最低限次を自動テストする。

- wrong password で復号不可
- ciphertext / tag / AAD 1 bit 改変で認証失敗
- `software_key_index` 改変後の認証失敗
- `software_key_index` と暗号化 payload の不一致を `InvalidStore` として拒否
- unknown field を含む非対象 Profile と別 Profile の mutationを組み合わせ、非対象 Profile の wire field、ciphertext、tag および AAD 認証が維持されること
- unknown field を含む対象 Profile の mutationで、既知 fieldをcanonicalに再生成しつつ未知 fieldをlosslessに保持できること。保持できない場合は mutation が `InvalidStore` となり、replacement Store を返さないこと
- profiles、`software_key_index` および復号済み `software_keys` の狭義昇順違反を `InvalidStore` として拒否すること
- unknown field を含む `software_key_index` の受信wire値をそのままAADへ使用し、logical modelだけからAADを再構築しないこと
- 構造上有効な複数 Profile が同じ `profile_id` を持つ Store を `InvalidStore` として拒否し、どの Profile も選択しない
- `software_key_index` または認証済み payload が、同一または異なる Chain で同じ `key_id` を複数持つ Profile を `InvalidStore` として拒否する
- 異なる Profile に同じ `key_id` が 1 件ずつ存在する場合は、`profile_id + key_id` で各対象を一意に解決する
- 初回 Mnemonic の明示確認前の finalize 不実行、確認後の成功、確認前の中断・失敗時の Profile 非作成
- `registry_key` または `duplicate_tag` 改変後の認証失敗
- 誤った `duplicate_tag` を AAD に含めて正常に暗号化した Profile は、AEAD認証成功後に Mnemonic entropy または Network との意味的不一致を `InvalidStore` として拒否する
- `duplicate_tag` の意味的不一致時は秘密情報、正常な read 結果または replacement Store を返さず、input Store を変更しない
- empty password reject
- duplicate Profile reject
- 同一 Profile・同一 Chain・同一 private key の duplicate Software Key reject
- 同一 private key でも Chain が異なる場合は、異なる `key_id` を持つ別 Software Key として登録可能
- 同一 Mnemonic でも Network が異なる Profile は登録可能
- 24 words 以外 / invalid Mnemonic reject
- invalid UTF-8 Mnemonic / password byte sequence reject
- 32 bytes 以外 / all-zero / Chain 上無効な imported private key reject
- account index 範囲外 reject
- malformed child object、unknown enum、未対応schema、canonical order違反およびindex/payload不一致をfatalとして拒否し、DecodeWarning付きでskipしないこと
- unknown fieldを含む正常なStoreはwarningなしで受理し、mutation時にlossless保持できない場合だけ拒否すること
- `list_software_keys` が `SoftwareKeyListItem` を返し、`origin` を含めない
- Pendingのversion不正、対象Store不一致、password不一致、改ざん、重複を拒否し、失敗時にinput Storeを変更しない
- Generated Software Key の乱数源失敗、妥当性失敗、保存失敗で Profile を変更しない
- failed mutation で input Store が変更されない
- password change 後に旧 password 使用不可
- delete key / Profile 後に対象操作不可
- パスワード紛失時に復旧・リセット API、秘密情報処理、パスワード変更および削除が成功しないこと
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

表示名は Core の保存フォーマットおよび API 契約に含めず、Application の責任とする。`software_key_index` は表示名ではなく Core 用の公開識別情報である。

---

## 16. v1 で固定しない実装詳細

次は本仕様を満たす限り実装側で選択可能とする。

- Rust module / crate の具体的な配置
- TypeScript wrapper の package layout
- 上位 Application の filesystem / IndexedDB 保存 API
- temporary file の名称
- UI 上の password policy
- UI 上の Mnemonic backup confirmation 手順

これらを理由に Core の暗号方式、保存 schema、HD path、API security boundary を変更してはならない。

---

## 17. 適用上の確定事項

- v1 では、新規 Profile の作成・復元時に既存 Profile を password なしで復号して意味的一致を事前検証しない。構造上正常な既存 Profile の平文 `duplicate_tag` が候補値と一致した場合は `DuplicateProfile` とし、不一致であることだけを理由に拒否しない。Store 全体の事前意味検証は v1 では実施しない。対象 Profile を認証・復号した時点で意味的不一致が判明した場合は `InvalidStore` とする。

---

## 18. 参照

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
- `symbol-sdk` 3.3.2 `sdk/javascript/src/facade/SymbolFacade.js`
- `symbol-sdk` 3.3.2 `sdk/javascript/src/facade/NemFacade.js`
- `symbol-sdk` 3.3.2

本書の変更で要件そのものを変更する必要が生じた場合は、仕様側で暗黙に拡張せず `docs/requirements/requirements.md` または decision record 側へ戻して決定する。

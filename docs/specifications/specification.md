# symbol-nem-wallet-core v1 仕様設計書

## 1. 目的

本書は `docs/requirements/requirements.md` を実装可能な仕様へ具体化する v1 の仕様正本である。

対象は Rust Wallet Core と Native C ABI / Node-API / WASM Binding の境界までとし、Wallet UI、Network、Transaction 構築、OS Keychain / Secure Enclave / TPM、Hardware Wallet、External Signer は扱わない。

本書の仕様は次を前提とする。

- Profile は Mainnet / Testnet のいずれかに固定する。
- Profile は Symbol / NEM の Chain には固定しない。
- すべての Software Key は Symbol / NEM のいずれかの Chain に固定する。
- 1 Profile = 1 Mnemonic + 0..n Software Key とする。
- Profile 配下の秘密情報は 1 つの Profile パスワードで保護する。
- 保存済み Mnemonic / 秘密鍵は、対象指定、利用者の明示的要求、Application / UI の確認および正しい Profile パスワードを伴う個別エクスポートだけで返す。
- 秘密情報を必要とする処理は毎回 Profile パスワードを要求し、継続的な unlocked state を持たない。
- signing は、Application / UI の明示的な利用者承認を表す request と、Core の Profile パスワード authorization の両方が成立した場合だけ実行する。
- Core が Mnemonic を新規生成するすべての Profile creation は、初回 Mnemonic handoff と利用者の受領確認を完了してから最終確定する。既存 Mnemonic の restore は生成時 handoff confirmation の対象外とする。
- Handoff、export および signing の assertion freshness は Application / UI の責任であり、Core は UI 表示・利用者操作または assertion freshness を独立には証明しない。
- Wallet Store の current Store authority、successful replacement の適用および stale / historical Store の再適用防止は Application / persistence layer の責任であり、Core は過去の Store history を保持しない。
- Native C ABI / Node-API / WASM で同じ Core ロジックを使用する。Node.js の v1 support は Node-API Binding 経由で同じ Rust Wallet Core を利用することを意味し、Rust Wallet Core と独立した Node.js / TypeScript 等による Wallet Core の別実装を意味しない。

責務、依存方向、trust boundaryおよび設計判断の正本は `docs/design/architecture.md`、`docs/design/security.md` および `docs/design/bindings.md` とする。

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
- 現在の operation に入力された Store の version、構造、authentication / integrity および consistency の検証
- Native C ABI / Node-API / WASM へ公開する共通 API 契約

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
- Handoff、export および signing assertion の freshness の独立証明
- current Store の選択、successful replacement の保存・適用および stale / historical Store の再適用防止

### 2.3 保存方式

Core は保存先を所有せず、opaque な `WalletStoreBlob` の読み込み・更新を行う。

状態変更 API は既存 blob を受け取り、新しい完全な replacement blob を返す。Application は temporary file + rename、IndexedDB transaction 等、その環境で利用可能な atomic replacement を使用する。

Application / persistence layer は、opaque blob のうちどれを current Store として採用するかを決定し、Core が成功した replacement を保存・適用する。Core は自身が返した過去の Store を保持せず、valid historical Store の currentness または rollback を単独で判定しない。

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

公開鍵・アドレス生成および署名では、保存済み Software Key の固定 Chain と Profile の固定 Network を使用する。呼び出し側が要求する Account context はこの固定関係と一致しなければならず、別 Chain / Network を指定して同一 Software Key を利用する要求は `NetworkMismatch` として拒否する。Chain / Network を別の値へ読み替えたり変換したりしてはならない。

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

| Chain  | Network | path                         |
| ------ | ------- | ---------------------------- |
| Symbol | Mainnet | `m/44'/4343'/account'/0'/0'` |
| Symbol | Testnet | `m/44'/1'/account'/0'/0'`    |
| NEM    | Mainnet | `m/44'/43'/account'/0'/0'`   |
| NEM    | Testnet | `m/44'/1'/account'/0'/0'`    |

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

未知 field は、現行 schema version の wire object 内で意味解釈しない opaque extension field とする。この保持規則は、未知 field を logical model、一覧結果、重複判定または意味検証へ取り込まず、warning なしで受理し、mutation で再出力する必要がある場合に lossless に保持することだけを定める。保持できない場合は `InvalidStore` として mutation 全体を拒否する。将来 Store version または Profile schema version に対する一般的な forward compatibility、未知 field の意味解釈、自動 migration または unsupported version の受理を保証しない。unknown enum はこの規則の対象外であり fatal error とする。

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

current Store の選択、successful replacement の保存・適用および stale / historical Store の再適用防止は Application / persistence layer の責任であり、Wallet Store の wire schema の責任ではない。v1 Core は Store history を保持せず、valid historical Store の currentness または rollback を単独で検出・拒否しない。この責任境界は、Store format の version、deterministic CBOR、unknown field / enum、AAD、authentication、integrity および consistency の契約を変更しない。

本書では次の動作だけを API 契約として固定する。

- Wallet Store の入力 bytes は、RFC 8949 Core Deterministic Encoding Requirements に従う完全な CBOR item をちょうど 1 個含み、その item が入力 bytes 全体を消費する場合だけ受理する。空入力、truncated CBOR、CBOR decode failure、indefinite-length、integer または length の非最短表現、duplicate map key、v1 が許可しない CBOR 型、trailing bytes、2 個以上の CBOR item の連結および deterministic CBOR 制約違反は `InvalidStore` とする。内部 CBOR parser error は Binding の公開 error codeへそのまま漏らさず、`InvalidStore` へ対応付ける。
- 受理した CBOR item の top-level は map でなければならない。top-level の必須 field 欠落、magic の型・長さ・値不正、既知 field の型・長さ・値不正その他の Wallet Store 構造不正は `InvalidStore` とする。

- `profiles = []` と `software_keys = []` は正常状態として扱う。
- `software_key_index = []` は正常状態として扱い、index は暗号化 payload と同一の `key_id -> chain` 写像を表さなければならない。
- 構造上受理された Profile の `profile_id` は Store 内で一意、対象 Profile の `key_id` は Chain にかかわらず Profile 内で一意でなければならない。
- 子オブジェクトの必須 field 欠落、型・長さ・値不正、未知 enum、重複、canonical order 違反および index と payload の対応不一致は、保存フォーマット仕様に従って Store 操作全体を fatal error として拒否する。対象オブジェクトをスキップして処理を継続してはならない。
- `WalletStore.version` と `ProfileEnvelope.schema_version` の field 欠落または unsigned integer 以外の型は `InvalidStore` とする。field が unsigned integer として構造上正しく解釈でき、その値だけが未対応の場合に限り、それぞれ `UnsupportedStoreVersion` または `UnsupportedProfileSchemaVersion` とする。
- 未知 field は、現行 schema version の wire object 内で意味解釈しない opaque extension field として扱う。未知 field を logical model、一覧結果、重複判定または写像検証へ使用せず、存在自体は warning としない。未知 field を含む wire object を mutation で再出力する場合は、保存フォーマット仕様に従って未知 field を lossless に保持し、保持できない場合は `InvalidStore` として mutation 全体を拒否する。unknown enum は別扱いの fatal error とする。この規則は将来 Store version または Profile schema version の一般的な forward compatibility、未知 field の意味解釈、自動 migration または unsupported version の受理を保証しない。
- `software_key_index` が AAD に含まれる場合、AAD は logical model から再構築せず、未知 map key を含む受信 wire 値を同じ要素順序・整数 key・空配列表現で使用する。
- Store / Profile schema の migration は暗黙に行わない。
- 将来 migration が必要な場合は `migrate_store_v1_to_v2` のような変換元・変換先 version 固定 API を追加する。

Profile 重複判定と Software Key 重複判定の wire-level 入力形式は保存フォーマット仕様を正本とする。

ID 一意性違反は子オブジェクトの選択またはスキップでは解消せず、保存フォーマット仕様に従い `InvalidStore` とする。対象 Profile の認証・復号後に検証する `duplicate_tag` と復号済み Mnemonic / Network の意味的一致、および `software_key_index` と payload の対応も同様とする。未対応 Profile schema version は `UnsupportedProfileSchemaVersion` とし、一覧、読出し、重複判定、秘密情報処理および mutation を含む Store 操作全体を拒否する。

---

## 8. Profile 作成と初回 Mnemonic 受渡し

### 8.1 新規生成

Core が Mnemonic を新規生成するすべての Profile creation は、次の二段階を通る。handoff を行わずに新規 Profile を成功させる経路は v1 に存在しない。

```text
prepare_generated_profile(...)
        │
        ├─ mnemonic_utf8
        └─ PendingProfileBlob

finalize_generated_profile(store, pending_blob, password, handoff_confirmation)
        │
        ├─ handoff_confirmation: Confirmed
        └─ replacement store
```

`prepare_generated_profile` は Store に Profile を追加しない。Application は初回 Mnemonic handoff を完了した後だけ、`handoff_confirmation.status = Confirmed` を持つ `finalize_generated_profile` を呼ぶ。

Application は `prepare_generated_profile` が返した正確な Mnemonic 全体を意図した利用者へ提示し、利用者が記録・受領済みであることを明示確認した後だけ、同じ `pending_profile` に対する `handoff_confirmation.status = Confirmed` を作成して `finalize_generated_profile` へ渡さなければならない。表示値の不一致、受渡し失敗・中断または確認未成立の場合は、`status = Unconfirmed` を持つ request として外部から区別できる。UI方式、提示画面、確認文言および利用者本人性の検証方式は Core の契約に含めない。Core は `Confirmed` が UI 操作の暗号学的証明であるとは扱わず、Application が確認成立の事実を正しく伝える責任を持つ。

`finalize_generated_profile` は `handoff_confirmation.status = Confirmed` の request だけを受理する。確認未成立、`Unconfirmed`、確認情報の欠落、対象 pending との対応不能またはその他の request 不正は `InvalidArgument` とし、新規 Profile を正常状態として残さず、replacement Store、Profile success、Mnemonic または中間秘密情報を返さない。`finalize_generated_profile` の成功は、確認済み request の検証、Pending / Store / password の検証および Profile 最終確定が成功し、replacement Store が返された場合だけ成立する。

確認前、表示値不一致、受渡し失敗・中断、または `finalize_generated_profile` の失敗時は、新規 Profile を正常状態として残さず、replacement Store を返さず、Core / Binding が Mnemonic、Pending、または中間秘密情報を次の operation のために継続保持・cache・diagnostic output へ含めない。未確認 pending は committed Profile へ昇格させてはならない。

`PendingProfileBlob` は Core 内部の versioned opaque blob とし、Wallet Store の wire-level 互換契約には含めない。外部契約として、format version を識別でき、`prepare_generated_profile` に渡した対象 Store と結び付き、Profile password で保護され、改ざん・破損を検知できることだけを要求する。具体的な CBOR key、内部 envelope schema、nonce構造、期限および再利用回数は公開契約に含めない。

`finalize_generated_profile` は、確認済み request、同じ Profile password、Pending、対象 Store、Profile schema および既存 Profile との整合性を検証する。対象 Storeとの結合が一致しない、Pendingのversionが未対応、Pendingが改ざん・破損している、stale である、またはProfile作成条件を満たさない場合は `PendingProfileInvalid` とする。Pendingのpassword認証または保護データの認証に失敗した場合は、§6.4 に従い `AuthenticationFailed` とする。仕様の整合性を満たす対象 Storeで既存Profileと同一 Mnemonic + Network になる場合は `DuplicateProfile` とする。

中断時は Core / Binding が保持する pending state を破棄する。Application が保持する `PendingProfileBlob` は opaque な外部値に過ぎず、restart または retry で自動復元・authorization 継承・Profile 昇格に使用してはならない。Application がそれを新しい operation に再提供する場合も、現在の Pending validation、confirmation および password 条件を改めて満たさなければならない。

### 8.2 復元 Profile

既存 Mnemonic からの復元では UTF-8 bytes を入力として受け取り、正規化・24 words BIP39 validity と Store / 既存 Profile の構造妥当性を確認してから登録する。この重複拒否保証は、Core が生成・維持する、本仕様の整合性を満たした Store を対象とする。候補 Mnemonic と Network から `wallet-store-format-v1.md` §12 の規則で計算した `duplicate_tag` を、構造上正常な既存 Profile の平文 `duplicate_tag` と比較する。一致する Profile があれば `DuplicateProfile` とし、input Store を変更せず replacement Store を返さない。不一致の場合、既存 Profile のパスワードを受け取らないため意味的一致を検証できないことだけを理由に復元を拒否しない。後続の操作で対象 Profile を認証・復号した時点に `duplicate_tag` と復号済み Mnemonic / Network の意味的不一致を検出した場合は `InvalidStore` とし、秘密情報、正常な処理結果または replacement Store を返さない。構造不正、認証失敗または認証済みpayloadとの既知の意味的不一致はこの継続規則の対象外とする。既存 Mnemonic からの restore では、生成時の handoff confirmation を要求しない。

### 8.3 表示名

Profile および Software Key の表示名は Core の管理対象外とする。Core は表示名を受け取らず、保存せず、返さず、変更 API を提供しない。

表示名の生成、入力検証、保存、同期、表示およびバックアップ範囲は Application の責任とし、本仕様では定義しない。表示名を `software_key_index` または Core の他の保存データへ含めてはならない。

### 8.4 保存済み秘密情報の通常取得禁止

保存済み秘密情報を対象識別子だけで取得する API は提供しない。

Mnemonic / Software Key 秘密鍵の返却は、§9.1.1 の `ExportRequest` による個別エクスポートに限る。成功には、(1) export target、(2) 利用者の `Requested`、(3) Application / UI の target-specific な `Confirmed`、(4) Core による当該 operation の正しい Profile パスワード authorization のすべてが必要である。password possession、対象の指定、通常 API の成功または API 呼出しだけでは、他の条件を満たしたことにならない。

未要求、未確認、target mismatch、対象不存在、認証失敗または処理失敗の場合は、secret、normal success result または replacement Store を返さず、Profile / Store を変更しない。成功した export の後も Core 内原本の ownership は Core に残る。

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

### 9.1.1 確認・承認 request DTO

UI の方式を固定せずに、Core と Binding が確認・承認の有無を同じ request 条件として扱うため、次の既存 DTO を使用する。`status` は自由な真偽値や password の結果から暗黙に生成してはならない。これらの status は、各 current operation に対して Application が生成する、利用者との確認・承認を表す外部 assertion である。Application / UI は過去に保存した `Approved`、`Confirmed` または `Requested` を新しい利用者意思として再利用してはならず、assertion の freshness を管理する。Core は status、target、payload および AccountContext 等の request 条件を検証するが、Application が UI を表示し利用者の確認・承認を取得したこと、または assertion が fresh であることを独立には証明しない。これらは新しい field、challenge または暗号学的 token を意味しない。

```text
HandoffConfirmation {
  status: HandoffConfirmationStatus
}

HandoffConfirmationStatus = Unconfirmed | Confirmed

ExportTarget =
    MnemonicTarget { profile_id: ProfileId }
  | SoftwareKeyTarget { profile_id: ProfileId, key_id: SoftwareKeyId }

ExportUserRequest {
  target: ExportTarget,
  status: ExportUserRequestStatus
}

ExportUserRequestStatus = NotRequested | Requested

ExportApplicationConfirmation {
  target: ExportTarget,
  status: ExportApplicationConfirmationStatus
}

ExportApplicationConfirmationStatus = NotConfirmed | Confirmed

ExportRequest {
  target: ExportTarget,
  user_request: ExportUserRequest,
  application_confirmation: ExportApplicationConfirmation
}

AccountContext {
  chain: Chain,
  network: Network
}

SigningTarget {
  profile_id: ProfileId,
  key_id: SoftwareKeyId,
  context: AccountContext
}

SigningApproval {
  status: SigningApprovalStatus
}

SigningApprovalStatus = NotApproved | Approved

SigningRequest {
  target: SigningTarget,
  payload: bytes,
  approval: SigningApproval
}
```

上記の `HandoffConfirmation`、`ExportRequest` および `SigningRequest` の DTO field 構造は v1 で維持し、新しい confirmation nonce、request ID、expiry、target またはその他の freshness 用 field を追加しない。

`HandoffConfirmation.status = Confirmed` は、Application が同じ `pending_profile` から返された完全な Mnemonic を意図した利用者へ提示し、その利用者から明示的な受領確認を取得した後だけ設定する。表示値不一致、提示不能、受領未確認、確認伝達不能または中断時は `Unconfirmed` とするか request を送信しない。

`ExportRequest` の成功条件は、`target`、`user_request.target` および `application_confirmation.target` が同じ構造・識別子として一致し、`user_request.status = Requested`、`application_confirmation.status = Confirmed` であることとする。Mnemonic export の target は `MnemonicTarget`、Software Key private key export の target は `SoftwareKeyTarget` でなければならない。Application / UI は対象を利用者へ提示して明示的な取得要求を確認した後だけ各 status を設定する。

`ExportRequest` の `Requested` および target-specific な `Confirmed` は、現在の export operation に対して Application / UI が生成する assertion である。Application / UI は stale assertion を再利用せず、Core はその freshness または UI 表示・利用者確認の事実を独立には証明しない。Core が行うのは、既存の target、status および password authorization の条件検証である。

上記の全条件を満たす `ExportRequest` を **confirmed export request** と呼ぶ。confirmed export request であることは password authorization とは別の条件であり、Application / Binding は status を省略または password の結果から補完してはならない。

`SigningRequest` の `approval.status = Approved` は、Application / UI が同じ `target` と `payload` を利用者へ提示し、その request に対する明示的な署名承認を取得した後だけ設定する。`NotApproved` は未承認、確認不能、内容不一致または中断を表す。Core は `Approved` の assertion を受け取るが UI を検証せず、password authentication の結果から status を生成しない。

`SigningRequest` は `target`、`payload` および `approval` の既存構造を維持する。`approval.status = Approved` は、その request 内の target / payload に対する現在の signing operation の Application assertion であり、Application / UI は stale assertion を再利用しない。Core は target、payload、AccountContext および approval status を仕様どおり検証するが、approval assertion の freshness または UI 表示・利用者承認の事実を独立には証明しない。

確認・承認 status、target または request field が欠落・未知・不整合の場合、該当 operation は `InvalidArgument` とする。確認・承認 status を理由に Core が Mnemonic、private key または Transaction を解釈・生成してはならない。

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
  password_utf8: bytes,
  handoff_confirmation: HandoffConfirmation
) -> MutationResult<ProfileInfo>

restore_profile(
  store,
  mnemonic_utf8: bytes,
  password_utf8: bytes,
  network
) -> MutationResult<ProfileInfo>

export_mnemonic(
  store,
  request: ExportRequest,
  password_utf8: bytes
) -> ReadResult<MnemonicExport>

export_private_key(
  store,
  request: ExportRequest,
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
  requested_context: AccountContext,
  password_utf8: bytes
) -> ReadResult<PublicAccountInfo>

sign(
  store,
  request: SigningRequest,
  password_utf8: bytes,
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

`get_public_account` と `sign` の `requested_context` / `SigningTarget.context` は、要求する Account の Chain / Network context を表す。選択された Account は `profile_id + key_id` で一意に定まり、Core は Profile の保存済み Network と Software Key の保存済み固定 Chain が request context と一致する場合だけ処理する。context の欠落、unsupported value、invalid Chain / Network combination または fixed Chain / Network mismatch は §10 の規則に従う。Core は context を保存済み値へ暗黙に読み替えず、別 Chain / Network へ fallback または変換しない。

`profile_id` が存在しない場合は `ProfileNotFound`、指定 `profile_id` 内に `key_id` が存在しない場合は `SoftwareKeyNotFound` とする。他 Profile に同じ `key_id` が存在しても Profile 間を検索・横断して選択してはならない。指定された `profile_id + key_id` が解決された後に context の Chain / Network が固定値と一致しない場合は `NetworkMismatch` とする。

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

`export_mnemonic` と `export_private_key` は、対象種別に対応する `ExportRequest` の全条件が成立した場合だけ成功する。`password_utf8` は各呼出しで独立して Profile password authorization に使用し、`Requested` または `Confirmed` を生成・代替しない。`ExportRequest` の target 不一致、status 不成立、対象不存在、認証失敗または処理失敗時は `ReadResult.value` を正常値として返さず、secret および replacement Store を返さない。

`export_mnemonic` は `request.target` が `MnemonicTarget` の confirmed export request だけを受理し、`export_private_key` は `request.target` が `SoftwareKeyTarget` の confirmed export request だけを受理する。各 method は request 内の target と method の対象種別を再解釈または補正してはならない。

### 9.5 署名 payload

`sign` は `SigningRequest.approval.status = Approved` の request だけを対象とする。Application / UI が Account を選択し、同じ `SigningTarget` と raw payload の内容を提示して明示的な承認を取得した request でなければならない。Core はこの approval と、各呼出しの `password_utf8` による Profile password authorization、保存済み Account context の compatibility および signing primitive を別々に検証する。`NotApproved`、approval 欠落、target/context 不一致または認証失敗時は signature を生成せず、success result と secret を返さず、Store を変更しない。正しい password だけでは signing approval にならない。

Core は payload を意味解釈しない。

```text
sign(request: SigningRequest, password_utf8: bytes)
```

Software Key に固定された Symbol / NEM の署名 primitive を、`request.payload` の byte 列そのものへ適用する。Transaction 構造の妥当性、Transaction の意味解釈、generation hash の組み立て、payload の prefix 付加その他の payload 変換は上位層の責任とする。Core は `request.payload` を再構成、正規化または追加加工しない。

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

`public_key` は対象 Chain の公開鍵 raw bytes、`address` は対象 Chain / Network のアドレス文字列表現とする。`network` は `requested_context.network`、`chain` は保存済み Software Key の Chain と一致する。`Signature` は次の項目を持つ。

```text
Signature {
  signature: bytes[64]
}
```

Native C ABI / Node-API / WASM は、同じ Store、同じ `SigningRequest`、同じ password および同じ context に対して同じ DTO 値、同じ error または同じ署名 bytes を返す。Binding は binary 値を raw byte sequence として受け渡し、Core は payload に prefix、generation hash または Transaction 解釈を暗黙に追加しない。

### 9.5.1 署名 scheme と相互運用性

署名は Chain ごとに次の scheme を使用する。Symbol と NEM の scheme、private key の Chain 固有の扱い、公開鍵および署名を相互に読み替えてはならない。

| Chain  | normative signing scheme                      | hash       | private key / signature representation                                                                        | `symbol-sdk` 3.3.2 の適用範囲                                                                       |
| ------ | --------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Symbol | Ed25519                                       | SHA-512    | §5.1 の raw 32 bytes を SDK-compatible な Ed25519 private key として使用し、署名は `R \|\| S` の raw 64 bytes | `SymbolFacade.KeyPair` / `Verifier` と同じ key pair、署名および verification 結果                   |
| NEM    | Ed25519 with the NEM `ed25519-keccak` variant | Keccak-512 | §5.1 および §4.2 の NEM private key byte order を使用し、署名は `R \|\| S` の raw 64 bytes                    | `NemFacade.KeyPair` / `Verifier` と同じ NEM private key byte handling、署名および verification 結果 |

`R` と `S` は各 32 byte の encoded group element / scalar で、signature byte sequence は `R` の 32 bytes に `S` の 32 bytes を連結した 64 bytes とする。signature の hex、Base64、text または CBOR wrapper を Core / Binding が生成・受理・返却してはならない。NEM の `ed25519-keccak` は SHA-512 を使用する通常の Symbol Ed25519 と同一視してはならない。

`symbol-sdk` 3.3.2 は、(a) Symbol / NEM の key pair、(b) 上表の Chain-specific signing primitive、(c) 64 byte signature representation、(d) supplied raw payload に対する verification の互換性基準として適用する。SDK の transaction facade が行う Transaction parsing、generation hash の追加、non-verifiable payload の構築その他の Transaction processing は、本 Core の `sign` 契約へ含めない。protocol reference は上表の Chain-specific scheme、canonical signature validation および 64 byte representation の基準として適用する。

同じ Chain、同じ raw private key、同じ raw payload から生成される署名は scheme の deterministic signing 規則に従う。Requirements `DR-008` / `AC-009` が要求する外部 interoperability の合格条件は、対応する Chain の reference verifier が、指定 context に対する raw payload と返却された 64 byte signature を受理することである。`symbol-sdk` 3.3.2 の deterministic な expected signature bytes が fixture に定義される場合は、§14.1 で exact byte equality を併せて確認して scheme・encoding・Chain-specific behavior の相違を検出する。ただし exact byte equality は、上流要求を超える独立した製品要件や別の signing acceptance gate とせず、`DR-008` の SDK 互換性を検証する fixture evidence として扱う。署名 primitive が失敗する場合、または対応する reference verifier が受理しない signature を生成した場合は `CryptoFailure` とし、signature と success result を返さない。Symbol の signature を NEM の verifier で、または NEM の signature を Symbol の verifier で検証成功と扱わない。

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
BindingFailure
```

`DecodeWarning` を含む結果型は維持するが、v1 の不正 Profile、未知 enum、canonical order 違反または未知 field のために Profile を skip してはならない。未知 field は、現行 schema version の wire object 内で意味解釈しない opaque extension field として warning なしで扱う。`UnknownField` warning は定義しない。fatal error の code は `wallet-store-format-v1.md` に従う。この規則は将来 version の一般的な forward compatibility、未知 field の意味解釈、自動 migration または unsupported version の受理を保証しない。

error / warning message に Mnemonic、private key、Profile password、derived seed、decrypted payload、secret の hash / hex dump を含めない。

panic / stack trace に秘密値を format しない。

主要な失敗条件は次の既存 error code に対応付ける。

| 失敗条件                                                                                                                                                                            | error code                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 引数・名前・payload等の入力不正                                                                                                                                                     | `InvalidArgument`                                                                                             |
| Mnemonic / private key / account index不正                                                                                                                                          | `InvalidMnemonic` / `InvalidPrivateKey` / `InvalidAccountIndex`                                               |
| 対象 Profile / Software Key 不存在                                                                                                                                                  | `ProfileNotFound` / `SoftwareKeyNotFound`                                                                     |
| password不一致またはAEAD認証失敗                                                                                                                                                    | `AuthenticationFailed`                                                                                        |
| Profile / Software Key 重複                                                                                                                                                         | `DuplicateProfile` / `DuplicateSoftwareKey`                                                                   |
| unsupported Chain、unsupported Network、invalid Chain / Network combination、確認・承認 status の欠落または不成立、Export target の不一致、またはその他の Core request field の不正 | `InvalidArgument`                                                                                             |
| Profile の fixed Network と requested Network の不一致、または Software Key の fixed Chain と requested Chain の不一致                                                              | `NetworkMismatch`                                                                                             |
| 空入力、truncated CBOR、CBOR decode failure、deterministic CBOR 制約違反、trailing bytes、複数 CBOR item、top-level 非 map、Store の必須 field・magic・型・長さ・値の不正           | `InvalidStore`                                                                                                |
| Store 内の `profile_id` 重複、または Profile 内の `key_id` 重複                                                                                                                     | `InvalidStore`                                                                                                |
| 認証・復号後の `software_key_index` と Software Key payload の `key_id -> chain` 写像不一致                                                                                         | `InvalidStore`                                                                                                |
| AEAD認証成功後の `duplicate_tag` と復号済み Mnemonic / 認証済み Network の意味的不一致                                                                                              | `InvalidStore`                                                                                                |
| unsigned integer として構造上正しいが未対応の `WalletStore.version`                                                                                                                 | `UnsupportedStoreVersion`                                                                                     |
| unsigned integer として構造上正しいが未対応の `ProfileEnvelope.schema_version`                                                                                                      | `UnsupportedProfileSchemaVersion`                                                                             |
| Pendingのversion、対象Store、改ざんまたは整合性不正                                                                                                                                 | `PendingProfileInvalid`                                                                                       |
| Pendingを含むpassword認証または保護データの認証失敗                                                                                                                                 | `AuthenticationFailed`                                                                                        |
| 乱数源、暗号または保存bytes生成の失敗                                                                                                                                               | `RandomSourceFailure` / `CryptoFailure` / `SerializationFailure`                                              |
| Binding の malformed input（検証可能な NULL / length / type / UTF-8 不正）、Core DTO への変換失敗、出力 allocation failure または ownership / lifecycle failure                     | `InvalidArgument`（malformed input） / `BindingFailure`（conversion、allocation、ownership または lifecycle） |

上表のすべての error は success result ではない。失敗時は、read operation では `value` を正常値として返さず、mutation では replacement Store を返さず、signing では signature を返さず、export では secret を返さず、Profile / Software Key / existing committed Store を変更しない。Core error と Binding error は `error` として保持し、Binding は error、warning または failure を success、empty success または別の正常状態へ変換してはならない。error / diagnostics は秘密情報を含めてはならない。

`InvalidArgument` は request の入力・status・context の外部不正を表し、`AuthenticationFailed` は Profile password または保護データの認証失敗を表す。確認・承認の不成立を password error、暗号 error または `NetworkMismatch` として置き換えてはならない。`BindingFailure` は Core operation の結果ではなく、Binding 自身が検出した representation conversion、output allocation、ownership または lifecycle の失敗に限る。任意の無効な memory address を安全に dereference できることは保証しない。

Store子オブジェクトの必須 field 欠落、型・長さ・値不正、未知 enum、重複、canonical order 違反または index と payload の対応不一致は `InvalidStore` とし、Profileを skip してはならない。CBOR item または top-level の検証に失敗した場合も `InvalidStore` とする。`WalletStore.version` または `ProfileEnvelope.schema_version` の欠落・型不正は `InvalidStore` とし、unsigned integer だが未対応の場合だけ対応する version 専用 error とする。Store の拒否時は秘密情報処理を開始せず、正常な read 結果または秘密情報を返さず、mutation では replacement Store を返さない。child object を skip して処理を継続してはならない。既存 Profile を対象とする処理では、Store構造と ID 一意性の検証、対象 Profile の一意な解決、認証・復号、`duplicate_tag` および `software_key_index` の意味的一致検証をこの順で行い、その後にだけ重複判定、秘密情報処理または mutation へ進む。パスワードを要求しない一覧処理も構造検証に失敗したStore全体を拒否し、認証後の意味的一致だけを保証しない。

---

## 11. atomicity と状態遷移

### 11.1 公開状態の意味

`committed state` は、Core が operation 全体を成功として確定し、成功結果として返した Store が Application によって保存された状態をいう。状態変更 API が返す `MutationResult.store` は保存前の replacement candidate であり、Application が保存に成功するまでは committed state ではない。保存に失敗した場合、直前の committed Store を正本として維持し、未保存 replacement を採用してはならない。

Application / persistence layer は current Store authority として、保存した replacement を current Store として採用するかを選択し、stale / historical Store の再適用を防止し、backup / snapshot の最新版を管理する。Core は stateless な opaque Store processor であり、自身が過去に返した Store history を保持しないため、入力された Store が current Store か historical Store かを自身の履歴から判定しない。

`pending / partial state` は、Profile または Software Key の成功確定前に存在する未確定値であり、正常な Profile、Software Key、`committed state` または次の operation の authorization ではない。`PendingProfileBlob` はこの意味を持つ opaque input / output であり、Wallet Store の `profiles` に含まれる Profile として扱ってはならない。`prepare_generated_profile` の成功は Mnemonic と pending の準備結果であって Profile success ではない。

stale、改ざん、破損、対象 Store と結び付かない、version が未対応または現在の operation の条件を満たさない pending は `PendingProfileInvalid` として拒否する。unconfirmed pending を committed Profile へ自動昇格させたり、pending の受領・保存・再提示だけを Profile success と扱ったりしてはならない。restart 後に外部から再提供された pending は新しい operation の opaque input であり、authorization や confirmation を含む復元済み状態ではない。

状態変更 API は成功時にのみ replacement Store を返す。途中処理に失敗した場合は replacement Store を返さず、read operation では正常な `value` を返さない。signing と export の failure でも、それぞれ signature と secret を返さない。

### 11.2 failure、retry および restart

failure、interruption、malformed input、authentication failure、confirmation / approval failure、compatibility failure、保存 failure または Binding failure の後は、既存の committed Store、Profile、Software Key、Profile isolation、secret ownership および authorization boundary を変更しない。partial Profile、partial Software Key、未保存 replacement、temporary secret、decrypted secret または authorization を成功状態・diagnostic・cache・次 operation の入力権限として残してはならない。

各 API 呼出しは独立した operation である。retry は前回 operation の continuation ではなく、新しい operation として、必要な Store、処理入力、target、現在の Profile password authorization および必要な user confirmation / signing approval を再提供・再取得して開始する。前回の password authentication、`Confirmed` / `Approved` status、pending、secret または success result を retry に暗黙継承してはならない。retry で同じ pending を入力する場合も、current operation の Pending validation と新しい確認・authorization 条件を満たさなければならない。

process restart 後は、Core / Binding / Application が processing-unit authorization、unlocked state、user confirmation、signing approval または secret-capable state を自動継続してはならない。restart 前の pending を自動復元・昇格してはならず、再提供された pending を使う場合も上記の新しい operation 条件を適用する。timeout、token、session および pending の具体的な内部実装は本仕様で定めない。

rollback については、v1 Core が historical rollback detection を保証しないことを固定する。Core は、structure、version、authentication、integrity および consistency の現在の入力条件を満たす valid historical Store を、historical であるという理由だけで reject してはならない。Core が過去の Store を記憶せず currentness を判定しないことは、Application / persistence layer が current Store を選択し、successful replacement を適用し、stale / historical Store の再適用を防止する責任を負うことを意味する。これは rollback を安全とする保証ではなく、Application / persistence layer に残る residual risk である。

v1 Core は、assertion freshness のための challenge、nonce、expiry または one-shot token を提供しない。これは Application / UI の freshness responsibility と、Core の per-operation authorization、request validation および pending 非昇格の境界を変更しない。

### 11.3 atomic replacement

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

Profile delete または Software Key delete の成功保証は、Core が返した successful replacement Store から対象 Profile / Software Key と対象秘密情報が除去されていること、および Application / persistence layer がその replacement を current Store として正しく保存・採用した状態に適用する。Application が後から削除前の valid historical Store を入力した場合、Core はそれが historical であることだけを理由に reject しない。この historical rollback boundary は Core の deletion guarantee を拡張も縮小もせず、current Store authority を担う Application / persistence layer の責任として扱う。

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

### 12.4 Side-channel responsibility

Requirements `SEC-023` および `AC-049` に対応し、Core 自身が実装・管理する秘密情報処理では、secret-dependent control flow、secret-dependent timing behavior または secret-dependent data access を不必要に導入してはならない。この contract の責任主体は Core であり、Binding は Core の side-channel responsibility を代替しない。

third-party cryptographic library 内部、compiler、runtime、OS、browser、hardware または CPU microarchitecture 内部における完全な side-channel absence は Core の保証対象外である。また、本仕様は specific constant-time library、assembly inspection、third-party library fork、particular zeroization technique、compiler flag または particular side-channel testing tool を固定しない。SEC-023 に対応する具体的な implementation / release verification は下流へ委譲する。単一の wall-clock threshold だけを security proof として扱ってはならない。

---

## 13. Native C ABI / Node-API / WASM Binding

Binding は型変換、byte buffer transfer、error / warning mapping、lifecycle / memory ownership の橋渡しだけを行う。Binding は user intent authority、assertion freshness authority または current Store authority ではなく、Application と Core の contract を忠実に伝達するだけである。

Binding は、handoff / export / signing の status を生成せず、password の認証結果から補完せず、stale assertion を cache / retain して別 operation へ再利用せず、target、payload または AccountContext を書き換えない。Binding は Store history DB、rollback detector または current Store selector を持たず、Wallet Store を opaque のまま Application と Core の間で橋渡しする。current Store の選択、successful replacement の適用および stale / historical Store の再適用防止は Application / persistence layer の責任である。

Binding に暗号化、password authentication、Mnemonic validation、key derivation、signing、duplicate detection を再実装しない。

v1 Native C ABI Binding は `crates/c-abi` の C ABI (`cdylib` / `staticlib`) を使用し、v1 WASM Binding は `wasm-bindgen` を使用する。各 Binding は §9.2 の各 operation を 1 対 1 で公開し、operation の入力条件、confirmation / approval、Core error、success boundary および `ReadResult` / `MutationResult` の意味を変更・省略してはならない。Binding方式を変更する場合は、本仕様と `docs/design/bindings.md` を更新する。秘密情報処理ロジックを Core と重複させない。

WASM public API は `Uint8Array` を binary data の基本型とする。Wallet Store blob、PendingProfileBlob、署名 payload、signature、public key、Mnemonic UTF-8 bytes、Profile password UTF-8 bytes、import / export private key は `Uint8Array` 相当とする。

Mnemonic / Profile password の byte sequence は strict UTF-8 とし、不正 UTF-8 は `InvalidMnemonic` または password 入力に対する `InvalidArgument` として拒否する。private key は raw 32 bytes 固定とし、Binding 層で textual encoding を受け付けない。

非秘密情報である address、UUID 等は JavaScript string を利用できる。

### 13.1 Native C ABI

Native の ABI は、次の共通形式で §9.2 の operation を公開する。ここで `InputBytes`、`OwnedBytes` および `OperationResult` は ABI 契約を説明するための型名であり、実装内部の型を公開するものではない。

```c
typedef struct {
    const uint8_t *data;
    size_t len;
} InputBytes;

typedef struct {
    uint8_t *data;
    size_t len;
} OwnedBytes;

/* OperationResult<T> contains the §9 DTO, optional replacement Store,
   diagnostics, and the operation status. */
ErrorCode operation(/* scalar inputs and InputBytes */, OperationResult *out);
void snwc_release_bytes(OwnedBytes *buffer);
```

§9.1.1 の request DTO は、status、target、context、payload を含む全 field を Native operation の明示的な入力として渡す。Binding は DTO field を省略、password の結果から補完または別の Core operation へ再解釈してはならない。`OperationResult<T>` は各 operation の §9 DTO、必要な replacement Store、diagnostics および operation status を表し、成功時だけ対応する field を有効な値として返す。

- `InputBytes` は caller-owned の借用入力であり、Binding は呼出し中だけ読み取る。variable-length の raw bytes と UTF-8 text は同じ pointer / length 形式で渡し、NUL 終端を要求しない。`data != NULL` は `len > 0` の必須条件とし、`data == NULL && len > 0`、要求された output struct の NULL、長さと固定長 DTO の不一致、未知 enum またはその他の検証可能な malformed input は `InvalidArgument` とする。UTF-8 を要求する field の不正 UTF-8 は field-specific な §10 および本節の mapping（Mnemonic は `InvalidMnemonic`、Profile password その他の request text は `InvalidArgument`）に従う。`len = 0` の NULL は、該当 Core operation が空入力を許可する場合に限り空 byte sequence として扱う。任意の無効な address の dereference を安全に救済することは保証しない。
- `OperationResult` は caller が確保し、caller は未使用、または前回 result のすべての可変長 field を `snwc_release_bytes` で解放済みの output struct を渡す。Binding は operation 開始時および failure return 前に、status、scalar、diagnostics、replacement Store、DTO の全フィールドを empty / zero / NULL の failure-safe 初期状態にする。failure 時に部分的な成功 DTO、secret、signature、pending または replacement Store を残してはならない。成功時だけ §9 の DTO、必要な `MutationResult.store`、diagnostics を初期化済み result へ書き込む。
- ABI を通過する caller input、Core 内部 memory および `OperationResult` の所有権を暗黙に移転しない。Core の内部 pointer は ABI へ公開しない。固定長 scalar / byte field は caller が確保した `OperationResult` の field へ Binding が値を copy し、variable-length bytes、text、配列および DTO の可変長 field はすべて Binding が所有する `OwnedBytes` 相当として返す。caller は `snwc_release_bytes` だけで可変長 field を解放し、caller が `free`、`delete`、`delete[]` または別 allocator を使ってはならない。固定長 secret field も caller が利用後に上書き・破棄する。
- `snwc_release_bytes` は Binding が返した未解放の `OwnedBytes` に対して一度だけ呼ぶ。呼出し後は `data = NULL`、`len = 0` とし、Binding はその buffer を再利用可能な所有状態として保持してはならない。secret-containing output では caller は利用後速やかに破棄・上書きし、release は可能な範囲で内容を消去してから解放する。NULL / zero-length buffer の release は no-op とする。Binding が発行していない pointer を渡した場合の動作は保証しない。
- `WalletStoreBlob`、`PendingProfileBlob` および Core の replacement は、Native では `OwnedBytes` としてのみ ABI 境界を越える。Binding はそれらを decode、normalize、migration、fallback または意味解釈しない。Core 外へ返った secret-containing output の一時所有者は caller となるが、Core 内原本の継続 ownership は Core に残る。
- Core の error code は §10 の symbolic code へ 1 対 1 で mapping し、Binding が別の success、NULL success または warning-only result へ変換してはならない。Binding 自身の conversion、output allocation、ownership または lifecycle failure は `BindingFailure` とし、Core を成功として扱わない。allocation failure を含む failure で部分 allocation を caller へ返さず、全 output を failure-safe 状態に戻す。

### 13.2 Node-API Binding

Node-API Binding は Node.js から同じ Rust Wallet Core を利用する thin / non-authoritative boundary である。C ABI を JavaScript FFI から呼び出す構成ではなく、Core の operation、error、warning、ownership、secret return condition、Store replacement、failure semantics および security meaning を変更せずに橋渡しする。Node.js host process の compromise を防止する native-isolation guarantee は追加しない。

Node-API の具体的な ABI、wrapper library、Node.js version、target matrix、JavaScript / TypeScript の表現および native artifact の配布契約は本仕様で確定せず、Node/npm の実装・配布設計および release gate へ委譲する。Node-API Binding は Core の暗号、Store、authorization、secret ownership または signing authority を複製しない。

### 13.3 WASM / JavaScript Binding

WASM の各 public operation は §9.2 の Core operation と 1 対 1 に対応する。binary input / output は `Uint8Array` 相当、非秘密の UUID / address は JavaScript string 相当、enum / scalar は対応する number または enum 値、`ReadResult` / `MutationResult` は §9.1 の field と同じ意味を持つ JavaScript object とする。`ExportRequest`、`SigningRequest`、`HandoffConfirmation` および `AccountContext` の status、target、context field を省略・再命名して security meaning を変えてはならない。

- Wallet Store blob と `PendingProfileBlob` は opaque `Uint8Array` とし、WASM / JavaScript が内部 schema、version、AAD、confirmation または approval を解釈・補正しない。
- 期待される Core failure と Binding failure は、成功値を返さない `Err { code, diagnostics }` 相当の result として返す。`null`、空の正常値、warning-only result または成功を示す例外へ変換してはならない。WASM representation への変換不能、detached / unreadable buffer、型不一致その他 Binding 自身の conversion / lifecycle failure は `BindingFailure` とし、Core error は §10 の code を維持する。
- 返却された `Uint8Array` は caller が所有する新しい外部 copy とし、Binding は呼出し完了後に保持、cache、global state、component state、log、diagnostic または永続 storage へ保存しない。JavaScript の garbage collection は secret の完全消去を保証しないため、secret-containing result の利用者は利用後速やかに buffer を上書きして参照を破棄する。Core 内原本の ownership は移転しない。
- secret-containing result は、該当 operation の成功時だけ返す。unconfirmed、unapproved、target / context mismatch、authentication、conversion、allocation または処理 failure では Mnemonic、private key、signature、正常な result および replacement Store を返さない。WASM はこれらの failure を Core の security meaning と異なる JavaScript exception または success object へ変換してはならない。
- Native C ABI、Node-API および WASM は、同じ Core input、status、target、context、password、Store および pending に対して、同じ operation success / failure、§10 error code、secret return condition、signature bytes、replacement Store の意味および lifecycle responsibility を提供する。実行環境の object / buffer 管理差は Core の authorization、ownership、Chain / Network policy または fail-closed 境界を変更しない。

---

## 14. テスト

### 14.1 互換性 fixture

最低限、次の deterministic fixture を固定する。

- BIP39 24 words mnemonic -> seed
- Symbol は root HMAC key `"ed25519 seed"`、NEM は root HMAC key `"ed25519-keccak seed"` を使用し、`symbol-sdk` 3.3.2 `Bip32` と同一 seed / path から root private key / chain code、各 hardened child private key / chain code、最終 BIP32 node private key が一致すること
- Symbol は最終 BIP32 node private key をそのまま、NEM はその bytes を reverse した値を Derived Software Key とし、それぞれ `SymbolFacade.bip32NodeToKeyPair()` / `NemFacade.bip32NodeToKeyPair()` の結果と一致すること
- Symbol Mainnet / Testnet path -> private/public key/address
- NEM Mainnet / Testnet path -> private/public key/address
- Symbol / NEM signing payload -> Chain-specific signature scheme、exact 64 byte signature、reference verification
- Symbol / NEM の同一 raw private key・同一 raw payload -> Chain-specific scheme、64 byte representation および対応する reference verifier の受理を確認する deterministic signing fixture。`symbol-sdk` 3.3.2 が固定 expected bytes を提供する場合は exact byte equality を supplementary evidence として記録する
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
- 初回 Mnemonic の `HandoffConfirmation.status = Unconfirmed`、confirmation 欠落、表示値不一致、確認伝達不能および `Confirmed` の各ケースで、finalize の error、Profile 非作成、replacement 非返却および secret 非開示が規則どおりであること
- Core が Mnemonic を新規生成するすべての Profile creation が handoff confirmation 必須の二段階 lifecycle を通り、handoff なしの生成成功経路がないこと。既存 Mnemonic の restore は生成時 handoff confirmation を要求しないこと
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
- 正しい password だけ、`NotRequested`、`NotConfirmed`、target mismatch、対象不存在、復号失敗および処理失敗の各ケースで個別 export が成功せず、secret、normal result、replacement Store を返さないこと。`Requested`、target-specific `Confirmed` および正しい password がそろう場合だけ Mnemonic / Derived / Imported / Generated private key を個別エクスポートできる
- `password authorization != export confirmation` および `password authorization != signing approval` を確認し、`SigningApproval.status = NotApproved` では署名を生成しない
- `HandoffConfirmation`、`ExportRequest` および `SigningApproval` の必須 status 欠落、不成立または target 不一致を拒否し、Application が current operation のために生成した assertion と password authorization を別条件として扱うこと。Core の authorization、確認・承認、pending および secret-capable state が operation 間、retry 間または restart 後に暗黙継承されず、Application assertion の freshness 自体は Core の検証対象外であること
- `get_public_account` / `sign` の正しい context、unsupported context、Profile Network mismatch、Software Key fixed Chain mismatch、invalid Chain / Network combination および wrong Profile-Key combination の result / error / state を確認する
- Native の NULL / length / fixed-length / malformed input、Core DTO conversion、allocation、ownership / lifecycle failure の error mapping、output zero-initialization、release、secret-containing output の解放を確認する
- WASM の `Uint8Array` / object representation、malformed input、`Err` mapping、opaque Store / Pending、secret result の caller lifecycle および Native との同一 security meaning を確認する
- retry が新しい operation として password、confirmation、approval を再取得し、previous result / pending / authorization を暗黙継承しないこと、restart 後に authorization / unconfirmed pending を復元しないことを確認する
- Core が Store history を保持せず、prior-call history を Store acceptance 条件にしないこと、および structure、version、authentication、integrity、consistency を満たす valid historical Store を historical であるという理由だけで malformed / tampered として拒否しないことを確認する。これは rollback を安全とする検証ではなく、current Store の選択と stale / historical Store の再適用防止が Application / persistence responsibility であることを確認する
- Core-owned secret processing に不要な secret-dependent control flow、timing behavior または data access を導入しないことを確認する。third-party cryptographic library、compiler、runtime、OS、browser、hardware および CPU microarchitecture の完全な side-channel absence は合格条件に含めず、specific technique を固定せず、単一の wall-clock threshold を唯一の security proof としない
- Native C ABI / Node-API / WASM Binding が status を生成・補完せず、stale assertion を別 operation へ再利用せず、target / payload / AccountContext を書き換えず、Store history DB、rollback detector または current Store selector を持たないことを確認する
- 通常 API に Mnemonic / private key が含まれない
- WASM public API に Mnemonic、Profile password、private key を JavaScript string で受け渡す経路が存在しない
- WASM の secret 入出力が `Uint8Array` 相当であり、private key が raw 32 bytes である
- Native C ABI / Node-API / WASM が同じ fixture 結果を返す
- error / warning / Debug output に secret が含まれない

### 14.3 Coverage verification

Requirements `NFR-005` / `AC-044` に従い、Core の自動検証では line coverage / function coverage **90%以上**、branch coverage **85%以上**を target とする。これは SHOULD レベルの verification requirement であり、未達でも仕様外の API、authorization bypass または暗号方式を追加・変更する理由にはしない。

target に未達した場合、verification record に少なくとも uncovered range（対象ファイル・行または関数・分岐の範囲）、未達理由および security / interoperability / failure-path への影響を記録し、第三者が確認可能にする。coverage の達成率だけでは Specification 適合、security、cryptographic interoperability、Chain / Network compatibility または重要異常系の合格を示さない。§14.1〜§14.2 の固定 fixture と security / failure 条件は、coverage と独立して合格判定する。

---

## 15. 要件トレーサビリティ

| 仕様領域                                      | 主な要件                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Profile / Store                               | FR-001, FR-002, FR-006, FR-015..018, DR-001..007                                                   |
| Mnemonic / HD                                 | FR-001, FR-003, FR-021, DR-008, AC-033, AC-035                                                     |
| Imported / Generated                          | FR-004, FR-005, FR-018, FR-021                                                                     |
| Encryption / password                         | FR-006, FR-007, FR-010, FR-020, SEC-001..007, SEC-013..015                                         |
| Signing approval / context / interoperability | FR-009, FR-013, FR-024, UC-006, SEC-022, DR-005, DR-008, AC-009, AC-013, AC-047                    |
| Delete / atomicity                            | FR-011, FR-012, SEC-005, SEC-008, SEC-009, SEC-018, SEC-019                                        |
| Current Store authority / historical rollback | FR-012, FR-017, SEC-005, SEC-018, AC-012, AC-018, AC-048                                           |
| Assertion freshness / Core authorization      | FR-007, FR-009, SEC-002, SEC-007, SEC-014, SEC-021, SEC-022, AC-007, AC-009, AC-031, AC-050        |
| Binding / Native C ABI / Node-API / WASM       | FR-019, NFR-001..004, SEC-011, SEC-012, SEC-017, SEC-020, AC-015..016, AC-021..024, AC-040, AC-043 |
| Initial Mnemonic handoff                      | FR-001, FR-019, SEC-010, SEC-017..018, AC-001, AC-034                                              |
| Individual secret export                      | FR-022, FR-023, FR-019, SEC-010, SEC-015, SEC-017, SEC-020..021, AC-025..026, AC-041..043          |
| Pending / failure / retry / restart           | FR-007, FR-019, SEC-003, SEC-005, SEC-017..019, AC-007, AC-037..039, AC-046                        |
| Side-channel responsibility                   | SEC-023, AC-049                                                                                    |
| Coverage verification                         | NFR-005, AC-044                                                                                    |

表示名は Core の保存フォーマットおよび API 契約に含めず、Application の責任とする。`software_key_index` は表示名ではなく Core 用の公開識別情報である。

### 15.1 Design トレーサビリティ

| Design の確定事項                                                                               | Specification の対応                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core の継続 secret ownership、通常非開示および user intent と Core authorization の分離         | Architecture §3.1〜§3.3、§4.1〜§4.3、§5.1、§6.1〜§6.5; Security Design §3.2、§4、§5、§6.1〜§6.4; Bindings Design §3.1〜§3.2、§5.1、§6.1〜§6.5 → §1〜§2、§8.1、§8.4、§9.1.1、§9.4〜§9.5、§10、§12〜§13 |
| Initial Mnemonic handoff の6段階、confirmation 前非 committed、失敗時非開示                     | Architecture §6.1; Security Design §6.2; Bindings Design §6.3 → §8.1、§9.1.1〜§9.2、§10〜§11、§13.2〜§13.3、§14.2                                                                                     |
| Explicit export の target / user intent / confirmation / per-operation authorization            | Architecture §6.4; Security Design §6.3; Bindings Design §6.4 → §8.4、§9.1.1、§9.2、§9.4、§10、§13、§14.2                                                                                             |
| Signing approval と signing authority の分離、Core の raw signing responsibility                | Architecture §6.3; Security Design §6.4; Bindings Design §6.5 → §2.2、§9.1.1、§9.2、§9.5、§10、§13.2〜§13.3、§14.2                                                                                    |
| Profile Network、Software Key fixed Chain、Account context、fallback / implicit conversion 禁止 | Architecture §5.1、§7; Security Design §7; Bindings Design §7 → §3.2〜§3.3、§9.1.1〜§9.2、§9.5、§10、§14.1〜§14.2                                                                                     |
| Pending / committed、atomicity、failure、retry、restart および existing state 保護              | Architecture §5.2〜§5.3、§6.1〜§6.2、§6.5、§9.3〜§9.4; Security Design §5.2、§6.5〜§6.6; Bindings Design §5.2、§6.1〜§6.2、§6.6 → §8.1、§10〜§11、§13、§14.2                                          |
| Current Store authority、stateless Core および historical rollback の保証外範囲                 | Architecture §5.2〜§5.3、§8、§9.3〜§9.4; Security Design §6.5、§9.3; Bindings Design §5.2、§6.6、§9.3 → §2.3、§7、§11、§13、§14.2                                                                     |
| Application assertion freshness と Core guarantee boundary                                      | Architecture §6.1、§6.3〜§6.5、§9.2; Security Design §3.2、§6.2〜§6.6、§9.2; Bindings Design §6.1〜§6.6、§9.1 → §8、§9.1.1、§9.4〜§9.5、§11.2、§13、§14.2                                             |
| Native C ABI / Node-API / WASM thin non-authority、opaque Store、ownership / lifecycle / failure mediation | Architecture §3.3、§4.2、§5.2; Security Design §4.3、§8.2; Bindings Design §3.1〜§3.2、§4.2、§5.2、§8.1〜§8.2、§10.1 → §7、§9.1、§10、§12.3、§13、§14.2                    |
| SEC-023 side-channel property と guarantee boundary                                             | Architecture §4.1、§8、§10; Security Design §8.1〜§8.3、§9.4、§10; Bindings Design §10.2 → §12.4、§14.2、§16                                                                                          |
| Chain-specific cryptographic scheme と下流への Transaction responsibility 委譲                  | Architecture §7、§10; Security Design §7、§10; Bindings Design §7、§10.1 → §4.2、§5、§9.5.1、§14.1、§18                                                                                               |

---

## 16. v1 で固定しない実装詳細

次は本仕様を満たす限り実装側で選択可能とする。

- Rust module / crate の具体的な配置
- TypeScript wrapper の package layout
- 上位 Application の filesystem / IndexedDB 保存 API
- temporary file の名称
- UI 上の password policy
- UI 上の Mnemonic handoff confirmation の具体的な手順

これらを理由に Core の暗号方式、保存 schema、HD path、API security boundary を変更してはならない。

---

## 17. 適用上の確定事項

- v1 では、新規 Profile の作成・復元時に既存 Profile を password なしで復号して意味的一致を事前検証しない。構造上正常な既存 Profile の平文 `duplicate_tag` が候補値と一致した場合は `DuplicateProfile` とし、不一致であることだけを理由に拒否しない。Store 全体の事前意味検証は v1 では実施しない。対象 Profile を認証・復号した時点で意味的不一致が判明した場合は `InvalidStore` とする。

---

## 18. 参照

- `docs/requirements/requirements.md`
- `docs/design/architecture.md`
- `docs/design/security.md`
- `docs/design/bindings.md`
- `docs/specifications/wallet-store-format-v1.md`
- RFC 8949: Concise Binary Object Representation (CBOR)
- BIP39: Mnemonic code for generating deterministic keys
- BIP44: Multi-Account Hierarchy for Deterministic Wallets
- SLIP-0044: registered coin types
- `symbol-sdk` 3.3.2 `sdk/javascript/src/Bip32.js`
- `symbol-sdk` 3.3.2 `sdk/javascript/src/facade/SymbolFacade.js`
- `symbol-sdk` 3.3.2 `sdk/javascript/src/facade/NemFacade.js`
- `symbol-sdk` 3.3.2
- `docs/knowledge/symbol-technicalref-jp.pdf`
- `docs/knowledge/nem-technicalref.pdf`

本書の変更で要件そのものを変更する必要が生じた場合は、仕様側で暗黙に拡張せず `docs/requirements/requirements.md` または `docs/design/` の設計判断へ戻して決定する。

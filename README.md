# symbol-nem-wallet-core

`symbol-nem-wallet-core` は、Symbol / NEM ウォレットで Mnemonic と Software Key を扱う Rust Wallet Core です。共通の Rust Core と、Native C ABI / `wasm-bindgen` Binding を提供します。パッケージの version は `0.1.0` です。

Core は Profile password による処理単位の認証、Mnemonic と Software Key の保護・導出・署名、Wallet Store の検証と状態変更を担当します。保存先、UI、Transaction の構築・解釈、ネットワーク通信は担当しません。

## 対応範囲

- Mainnet / Testnet に固定された Profile の作成、復元、一覧、削除
- BIP39 English 24 words Mnemonic の生成、検証、初回 handoff、明示的な export
- Symbol / NEM の Derived / Imported / Generated Software Key
- Profile password で保護された v1 Wallet Store
- Software Key の public key、address、Chain 固有の署名
- Profile password の変更
- Native C ABI と WASM Binding

Profile は 1 つの Mnemonic と Network を持ち、Network は作成時に固定されます。Profile 自体は Chain に固定されず、Software Key ごとに Symbol または NEM の Chain が固定されます。同じ Profile 内で両方の Chain の Software Key を扱えますが、Chain と Network を暗黙に変換しません。

次は v1 の対象外です。

- Transaction の構築、シリアライズ、意味解釈、表示 UI、署名承認 UI
- REST / WebSocket / announce、ノード選択、Explorer
- Hardware Wallet、External Signer、OS Keychain / Secure Enclave / TPM
- Wallet Store の保存先選択、同期、バックアップ UI、version migration

## 責任分界

| 主体 | 担当すること |
| --- | --- |
| Rust Core | 秘密情報の継続管理、Profile password の各 operation 認証、鍵処理、Chain / Network compatibility、Store の検証・暗号化・状態変更、raw payload への署名 |
| Native / WASM Binding | Core と実行環境の間の型・byte 列・error・warning・ownership の橋渡し |
| 統合 Application / UI | 利用者操作、Account の選択、署名内容の表示、handoff / export / signing の現在の確認・承認、current Store の選択・保存 |
| Transaction / Network layer | Transaction の構築・解釈・シリアライズ、REST / WebSocket / announce |

Binding と Application は、Core の認証、署名権限、Chain / Network 判定、Store の意味解釈を代替しません。Mnemonic と Software Key の原本の継続的な管理責任は Core に残ります。Application が入力や明示的な export 結果を一時的に仲介することは、原本の ownership の移転を意味しません。

## Rust から利用する

パッケージ名は `symbol-nem-wallet-core` です。

```toml
[dependencies]
symbol-nem-wallet-core = { path = "../symbol-nem-wallet-core" }
```

Profile を復元し、Symbol の Software Key を導出して public account を取得する最小例です。Mnemonic と password は UTF-8 byte 列として渡します。`get_public_account` には、保存済み Profile Network と Software Key Chain に一致する `AccountContext` が必要です。

```rust
use symbol_nem_wallet_core::{
    create_empty_store, derive_software_key, get_public_account, restore_profile, AccountContext,
    Chain, Network,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mnemonic = std::env::var("WALLET_MNEMONIC")?;
    let password = std::env::var("WALLET_PASSWORD")?;
    let mut store = create_empty_store()?;

    let profile = restore_profile(
        &store,
        mnemonic.as_bytes(),
        password.as_bytes(),
        Network::Mainnet,
    )?;
    let profile_id = profile.value.profile_id;
    store = profile.store;

    let key = derive_software_key(
        &store,
        profile_id,
        password.as_bytes(),
        Chain::Symbol,
        0,
    )?;
    let key_id = key.value.key_id;
    store = key.store;

    let account = get_public_account(
        &store,
        profile_id,
        key_id,
        AccountContext {
            chain: Chain::Symbol,
            network: Network::Mainnet,
        },
        password.as_bytes(),
    )?;
    println!("{}", account.value.address);
    Ok(())
}
```

この例の環境変数は説明用の入力経路です。実際の Application では Mnemonic / password の保持期間とコピーを必要最小限にしてください。

### 新規 Mnemonic の handoff

新規 Profile は一段階で作成しません。`prepare_generated_profile` は Store を変更せず、`PreparedProfile` として Mnemonic と opaque な `PendingProfileBlob` を返します。Application は Mnemonic 全体を利用者へ提示し、利用者の受領確認が成立した場合だけ、同じ Pending と Store に対して `HandoffConfirmation { status: Confirmed }` を付けて `finalize_generated_profile` を呼びます。

次の例にある `obtain_explicit_handoff_confirmation` は Application が実装する placeholder です。Application はこの処理で `mnemonic_utf8` 全体を現在の利用者へ提示し、明示的な受領確認を取得してください。確認を取得できない場合は `false` またはエラーを返し、`finalize_generated_profile` を呼び出しません。この例は UI framework を仮定せず、placeholder を実装しない限り handoff を確定できない形にしています。

```rust
use symbol_nem_wallet_core::{
    create_empty_store, finalize_generated_profile, prepare_generated_profile,
    HandoffConfirmation, HandoffConfirmationStatus, Network,
};

fn obtain_explicit_handoff_confirmation(
    mnemonic_utf8: &[u8],
) -> Result<bool, Box<dyn std::error::Error>> {
    // Application が mnemonic_utf8 全体を現在の利用者へ提示し、明示的な受領確認を取得する。
    let _ = mnemonic_utf8;
    Err(std::io::Error::other("Application must implement the user handoff confirmation").into())
}

fn create_generated_profile() -> Result<(), Box<dyn std::error::Error>> {
    let password = std::env::var("WALLET_PASSWORD")?;
    let mut store = create_empty_store()?;

    let prepared = prepare_generated_profile(&store, password.as_bytes(), Network::Mainnet)?;
    let user_confirmed =
        obtain_explicit_handoff_confirmation(&prepared.value.mnemonic_utf8)?;
    if !user_confirmed {
        return Err("handoff confirmation was not obtained".into());
    }

    // 明示確認の guard を通過した後だけ Confirmed を構築する。
    let handoff_confirmation = HandoffConfirmation {
        status: HandoffConfirmationStatus::Confirmed,
    };
    let finalized = finalize_generated_profile(
        &store,
        &prepared.value.pending_profile,
        password.as_bytes(),
        handoff_confirmation,
    )?;
    store = finalized.store;
    let _ = store;
    Ok(())
}
```

未確認の handoff、Pending の破損・改ざん・対象 Store 不一致、password 認証失敗または確定処理の失敗では Profile は作成されず、replacement Store や Mnemonic は成功結果として返りません。既存 Mnemonic を使う `restore_profile` は、生成時 handoff の対象外です。

## API の呼び出しモデル

Rust Core の read operation は `ReadResult<T>`、状態変更 operation は `MutationResult<T>` を返します。

```text
ReadResult<T>     { value, warnings }
MutationResult<T> { store, value, warnings }
```

入力 Store は直接変更されません。状態変更が成功した場合だけ、`result.store` が次の operation に渡す完全な replacement Store です。Application は保存に成功した replacement を current Store として atomic に適用し、保存に失敗した場合は従来の committed Store を維持してください。Core は過去の Store を記憶せず、valid な historical Store の currentness や rollback を単独では判定しません。

`warnings` はログではなく、秘密情報を含まない構造化 diagnostics です。`list_profiles` と `list_software_keys` は password なしで平文 manifest の公開 index を読むため、その結果を秘密情報の認証済み証明として扱わないでください。

秘密情報を必要とする各 operation は、その呼び出しで Profile password を受け取ります。v1 に継続的な unlocked session、password の永続保存・継続 cache、password recovery / reset API はありません。Profile password の品質ポリシーは上位 Application の責任で、Core は空 password を拒否しますが独自の強度判定は行いません。

## 現行 Rust API

以下は現行 Core の公開 operation です。`bytes` は byte slice、`WalletStoreBlob` と `PendingProfileBlob` は opaque byte 列です。

| API | 引数 | 成功結果 |
| --- | --- | --- |
| `create_empty_store()` | なし | `WalletStoreBlob` |
| `prepare_generated_profile(store, password_utf8, network)` | Store、password UTF-8 bytes、`Network` | `ReadResult<PreparedProfile>` |
| `finalize_generated_profile(store, pending_profile, password_utf8, handoff_confirmation)` | Store、Pending、password、`HandoffConfirmation` | `MutationResult<ProfileInfo>` |
| `restore_profile(store, mnemonic_utf8, password_utf8, network)` | Store、Mnemonic UTF-8 bytes、password、`Network` | `MutationResult<ProfileInfo>` |
| `list_profiles(store)` | Store | `ReadResult<Vec<ProfileInfo>>` |
| `export_mnemonic(store, request, password_utf8)` | Store、`ExportRequest`、password | `ReadResult<MnemonicExport>` |
| `export_private_key(store, request, password_utf8)` | Store、`ExportRequest`、password | `ReadResult<PrivateKeyExport>` |
| `list_software_keys(store, profile_id)` | Store、Profile ID | `ReadResult<Vec<SoftwareKeyListItem>>` |
| `derive_software_key(store, profile_id, password_utf8, chain, account_index)` | Store、Profile ID、password、`Chain`、`u32` account index | `MutationResult<SoftwareKeyInfo>` |
| `import_software_key(store, profile_id, password_utf8, chain, private_key)` | Store、Profile ID、password、`Chain`、raw 32 bytes | `MutationResult<SoftwareKeyInfo>` |
| `generate_software_key(store, profile_id, password_utf8, chain)` | Store、Profile ID、password、`Chain` | `MutationResult<SoftwareKeyInfo>` |
| `get_public_account(store, profile_id, key_id, requested_context, password_utf8)` | Store、Profile ID、Software Key ID、`AccountContext`、password | `ReadResult<PublicAccountInfo>` |
| `sign(store, request, password_utf8)` | Store、`SigningRequest`、password | `ReadResult<Signature>` |
| `change_profile_password(store, profile_id, current_password_utf8, new_password_utf8)` | Store、Profile ID、現在の password、新しい password | `MutationResult<()>` |
| `delete_software_key(store, profile_id, key_id, password_utf8)` | Store、Profile ID、Software Key ID、password | `MutationResult<()>` |
| `delete_profile(store, profile_id, password_utf8)` | Store、Profile ID、password | `MutationResult<()>` |

`derive_software_key` の `account_index` は `0..=2_147_483_647` です。`import_software_key` の private key は textual な hex / `0x` 形式ではなく raw 32 bytes だけを受け付けます。Mnemonic と password は strict UTF-8 bytes、署名 payload は意味解釈されない raw bytes です。

### Request DTO と operation ごとの認証

確認・承認の status は password の結果から暗黙に補完するものではありません。Application が現在の operation について利用者から得た assertion と、Core が同じ operation で行う Profile password authorization は別の条件です。

```text
HandoffConfirmation { status: Unconfirmed | Confirmed }

ExportTarget =
    MnemonicTarget { profile_id }
  | SoftwareKeyTarget { profile_id, key_id }

ExportUserRequest { target: ExportTarget, status: NotRequested | Requested }
ExportApplicationConfirmation {
  target: ExportTarget,
  status: NotConfirmed | Confirmed
}
ExportRequest {
  target: ExportTarget,
  user_request: ExportUserRequest,
  application_confirmation: ExportApplicationConfirmation
}

AccountContext { chain: Chain, network: Network }
SigningTarget { profile_id, key_id, context: AccountContext }
SigningApproval { status: NotApproved | Approved }
SigningRequest { target: SigningTarget, payload: bytes, approval: SigningApproval }
```

`finalize_generated_profile` は `Confirmed` の handoff だけを受理します。`export_mnemonic` は同じ target を持つ `Requested` + `Confirmed` の `ExportRequest` で `MnemonicTarget` を指定した場合だけ、`export_private_key` は同じ条件で `SoftwareKeyTarget` を指定した場合だけ成功します。`sign` は `SigningApproval.status = Approved`、request の target / context、そしてその呼び出しの正しい password がそろった場合だけ署名します。

Application は handoff の受領確認、export の取得要求・確認、signing の承認を現在の operation ごとに取得し、過去の `Confirmed` / `Requested` / `Approved` を新しい利用者意思として再利用しないでください。Core は assertion の freshness や UI 表示そのものを独立には証明しません。Binding も status を生成・補完・cache せず、target、context、payload を変更しません。

主な DTO は `PreparedProfile { mnemonic_utf8, pending_profile }`、`ProfileInfo { profile_id, network, software_key_count }`、`SoftwareKeyInfo { key_id, chain, origin }`、`SoftwareKeyListItem { key_id, chain }`、`PublicAccountInfo { key_id, chain, network, public_key: [u8; 32], address }`、`MnemonicExport { mnemonic_utf8: Vec<u8> }`、`PrivateKeyExport { private_key: [u8; 32] }`、`Signature { signature: [u8; 64] }` です。

## Wallet Store と Pending Profile

`WalletStoreBlob` は v1 の opaque Store です。Core 外で CBOR、version、AAD、暗号化 payload、index を解釈・編集・normalize・migration しないでください。v1 は Store / Profile version migration を提供せず、unsupported version、破損、canonical でない入力、unknown enum、整合しない index / payload を受け付けません。

`PendingProfileBlob` は Wallet Store とは別の opaque な生成途中値です。`prepare_generated_profile` の成功は Profile の committed state ではなく、Application は利用者の handoff 確認前に Profile 作成済みとして扱ってはなりません。Pending を restart 後に自動昇格したり、別 Store へ移植したり、前回の authorization を継承したりしないでください。

Application / persistence layer は Core が返した replacement Store を current Store として選び、atomic に保存します。Core は Store history を持たないため、valid historical Store の再適用防止、current snapshot の選択、stale Store の防止は統合側の責任です。未保存の replacement を committed state として扱わないでください。

## Symbol / NEM と Mainnet / Testnet

- `Network::Mainnet` / `Network::Testnet` は Profile に固定され、Profile 作成後に変更できません。
- `Chain::Symbol` / `Chain::Nem` は Software Key に固定され、登録後に変更できません。
- `AccountContext` は、Profile の Network と Software Key の Chain の組合せを明示します。
- `get_public_account` と `sign` は、requested context が保存済みの固定値と一致しない場合に `NetworkMismatch` で失敗します。別 Chain / Network への fallback や暗黙変換はありません。

Symbol と NEM は、HD 導出、public key、address、署名 scheme を同一視しません。v1 の互換性基準は `symbol-sdk` 3.3.2 と、仕様に固定された deterministic fixture です。Transaction の構築や generation hash の追加は上位層で行い、Core の `sign` は受け取った raw payload に prefix や別の解釈を追加しません。

## Native C ABI

Native Binding は `bindings/native` の `symbol-nem-wallet-core-native` package と、[公開 header](bindings/native/include/symbol_nem_wallet_core.h) で提供します。

```bash
cargo build --package symbol-nem-wallet-core-native --release --locked
```

repository root から build した場合、build artifact は `target/release/` 配下に生成されます。実際の library filename / extension は target / toolchain に依存します。Linux では例として、`staticlib` は `libsymbol_nem_wallet_core_native.a`、`cdylib` は `libsymbol_nem_wallet_core_native.so` です。macOS / Windows では platform / toolchain に応じた artifact を使用してください。C/C++ 側では公開 header を include し、static link の場合は例えば次のように link します。

```c
#include "symbol_nem_wallet_core.h"

int main(void) {
    SnwcOwnedBytes store = {NULL, 0};
    const char *error = snwc_create_empty_store(&store);
    if (error != NULL) {
        /* error は Binding 所有の静的文字列で、free しない。 */
        snwc_free_bytes(&store);
        return 1;
    }
    if (store.ptr == NULL || store.len == 0) {
        snwc_free_bytes(&store);
        return 1;
    }

    /* store は Binding-owned output。利用後は専用 release API を使う。 */
    snwc_free_bytes(&store);
    return 0;
}
```

上の例を `native_example.c` として保存した場合の Linux の static-link example です。環境に応じて loader の設定や dynamic library の配置を行ってください。

```bash
cc -std=c11 -Wall -Wextra -Werror \
  -I bindings/native/include \
  native_example.c \
  target/release/libsymbol_nem_wallet_core_native.a \
  -ldl -lpthread -lm \
  -o native_example
./native_example
```

`snwc_create_empty_store` は成功時に `NULL`、失敗時に error code 文字列を返します。成功した `SnwcOwnedBytes` の `ptr` / `len` は Binding-owned output なので、`malloc` / `free` や別 allocator を使わず、必ず `snwc_free_bytes(&store)` で解放してください。ほかの operation に渡す `SnwcBytes` は caller-owned の借用 input であり、Binding が ownership を取得するものではありません。

Rust Core と同じ operation を、`snwc_` prefix の関数として公開します。関数一覧は header の次の symbols です。

```text
snwc_create_empty_store
snwc_prepare_generated_profile
snwc_finalize_generated_profile
snwc_restore_profile
snwc_export_mnemonic
snwc_export_private_key
snwc_list_profiles
snwc_list_software_keys
snwc_derive_software_key
snwc_import_software_key
snwc_generate_software_key
snwc_get_public_account
snwc_sign
snwc_change_profile_password
snwc_delete_software_key
snwc_delete_profile
```

- `SnwcBytes` は caller-owned の借用 buffer です。NUL 終端は要求せず、`len == 0` では `ptr == NULL` を許容します。`len != 0` の pointer は呼び出し中有効でなければなりません。
- `SnwcUuid` は UUID 文字列ではなく Core と同じ raw 16 bytes です。`network` は `0 = Testnet, 1 = Mainnet`、`chain` は `0 = NEM, 1 = Symbol` です。
- `SnwcHandoffConfirmation`、`SnwcExportRequest`、`SnwcAccountContext`、`SnwcSigningRequest` は header の全 field を caller が構築します。Binding が確認・承認を補完したり、Core の認証を代替したりしません。
- `SnwcOwnedBytes` は Binding-owned output です。Store、Mnemonic、Pending、private key、signature、address の可変長出力は `snwc_free_bytes` で解放します。`SnwcPublicAccountInfo.address` も同じです。
- Profile 配列は `snwc_free_profiles`、Software Key 配列は `snwc_free_software_key_list`、warning 配列は `snwc_free_warnings` で解放します。解放後の handle は NULL / 0 になります。caller の `free` や別 allocator を使わないでください。
- 各 operation は output を開始時に failure-safe な空状態へ初期化します。成功時だけ output を有効値として扱い、失敗時は partial output を返しません。

成功時の戻り値は `NULL`、失敗時は Binding 所有の NUL 終端 error code 文字列です。error 文字列は解放しません。Binding が返していない pointer を free API に渡す動作や、任意の不正 pointer を安全に救済することは保証されません。

## WASM / TypeScript

WASM Binding は `wasm` feature と `wasm32-unknown-unknown` target で有効です。Core と同じ operation を、Rust の public name と同じ snake_case の export として提供します。

```bash
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --features wasm --release
```

生成済み npm package は repository に含まれません。`wasm-bindgen` CLI で web target の glue code と TypeScript 定義を生成します。

```bash
cargo install wasm-bindgen-cli --version 0.2.127 --locked
./scripts/build-wasm.sh
```

出力先は第1引数で変更できます。相対パスは repository root から解決されます。

第1引数を省略した場合の出力先は `pkg/` です。`--target web` の生成物は、同じディレクトリにある JavaScript glue module と `symbol_nem_wallet_core_bg.wasm` を組み合わせて使用します。生成された web module の default initialization API と `create_empty_store` の最小例は次のとおりです。

```javascript
import init, { create_empty_store } from "./pkg/symbol_nem_wallet_core.js";

// default init は同じディレクトリの symbol_nem_wallet_core_bg.wasm を読み込む。
await init();

const store = create_empty_store();
if (!(store instanceof Uint8Array)) {
    throw new TypeError("create_empty_store() did not return Uint8Array");
}

// store は新しい caller-owned copy。opaque のまま次の Core operation へ渡す。
console.log(store.byteLength);
```

この例は `pkg/` を web server から module として配信する前提です。`symbol_nem_wallet_core.js` と `symbol_nem_wallet_core_bg.wasm` を別の場所へ出力した場合は、import path と生成された module から WASM を取得できる配置を合わせてください。

`wasm-bindgen` の JavaScript 境界では、Wallet Store、Pending、Mnemonic、Profile password、private key、payload、public key、signature は `Uint8Array` 相当です。UUID と address は string、入力の `network` は `0 = testnet, 1 = mainnet`、`chain` は `0 = nem, 1 = symbol` の number です。出力 DTO の文字列表現は `"testnet"` / `"mainnet"`、`"nem"` / `"symbol"` です。

- `HandoffConfirmation` は `{ status: "unconfirmed" | "confirmed" }`、`AccountContext` は `{ chain: "nem" | "symbol", network: "testnet" | "mainnet" }` です。
- `SigningRequest` は `{ target: { profile_id, key_id, context }, payload: Uint8Array, approval: { status: "not_approved" | "approved" } }` です。
- `ExportRequest` は `target`、`user_request: { target, status: "not_requested" | "requested" }`、`application_confirmation: { target, status: "not_confirmed" | "confirmed" }` の全 field を持ちます。target の kind は `"mnemonic"` または `"software_key"` です。
- `create_empty_store` は read / mutation wrapper ではなく、Store の `Uint8Array` を直接返します。
- read の結果は `{ value, warnings }`、mutation の結果は `{ store: Uint8Array, value, warnings }` です。mutation が返す `store` は完全な replacement Store です。
- 入力は exact `Uint8Array` でなければならず、`Uint8ClampedArray`、他の typed array、`DataView`、detached / unreadable buffer は受理されません。Binding 自身の representation / conversion / lifecycle failure は `BindingFailure` です。

入力の `Uint8Array` は呼び出し中だけ使用され、Binding は ownership を取得・保持しません。返却された `Uint8Array` は caller が所有する新しい copy です。通常処理の秘密情報は利用後に上書きして参照を破棄し、不要な copy、長期 state、cache、log、diagnostics または storage を作らないでください。明示的な handoff / export で Core 外へ渡った secret copy の表示、保管、利用、破棄は Application / 利用者の責任です。WASM は JavaScript と同じ execution context で動作し、Application や Browser から秘密情報を隔離する境界ではありません。

## Security guidance

### 秘密情報と export

- Mnemonic、private key、Profile password、seed、復号済み payload、Store の内部をログ、例外、Debug、warning、diagnostics に出力しないでください。
- 通常の list / public account / key registration / signing の結果に Mnemonic や private key は含まれません。
- `export_mnemonic` と `export_private_key` は、対象指定、利用者の明示的要求、Application / UI の確認、各 target に一致する request、正しい Profile password がそろった個別 export だけを許可します。password を知っているだけでは export authorization になりません。
- 明示的に返された秘密情報の copy は受領側 Application / 利用者が表示・保管・利用・破棄を管理します。Core 内の原本の継続 ownership は Core に残ります。

### Signing と blind signing

`sign` は Transaction parser ではありません。Core は payload を解釈・検証・再構成せず、呼び出し側から渡された raw byte 列そのものへ、Software Key に固定された Symbol / NEM の署名 primitive を適用します。

Application は `sign` の前に、Transaction / payload を上位の Transaction layer で解釈し、利用者が署名内容を確認できる形式で提示し、現在の signing operation について明示的な承認を取得してください。内容を確認できない unknown / unsupported な Transaction を blind signing として進めないでください。表示・承認した target と payload と同じものを `SigningRequest` に設定し、`SigningApproval { status: Approved }` を構築します。

署名には、Application の利用者承認 assertion、Core のその呼び出しにおける Profile password authorization、`AccountContext` と保存済み Account の compatibility が別々に成立する必要があります。正しい password だけでも、`Approved` だけでも署名は成立しません。解析、表示、承認、`sign` に渡す payload は同一の byte 列にしてください。

Binding は署名承認、Transaction の意味、permission、UI または signing authority を判断しません。Application は過去の `Approved` assertion を再利用しないでください。Core / Binding は UI 表示や assertion freshness を独立には証明しません。

## Error contract

Rust Core は `WalletResult<T> = Result<T, WalletError>` を返し、`WalletError` は安定した `ErrorCode` だけを持ちます。

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

request / status / UUID / enum / context の不正は `InvalidArgument`、Store の破損・型・長さ・canonical order・unknown enum・整合性不正は `InvalidStore`、password または保護 payload の認証失敗は `AuthenticationFailed`、固定 Chain / Network と request context の不一致は `NetworkMismatch` です。Binding 自身の conversion / allocation / ownership failure は `BindingFailure` です。

失敗時は、read の正常な value、mutation の replacement Store、signing の signature、export の秘密情報を返しません。既存の input Store と committed state は変更されません。error / warning に秘密情報や内部 payload の診断値は含まれません。

## 開発・検証

次のコマンドは repository の formatter、lint、test、Native / WASM、fuzz compile および dependency audit の入口です。実行結果は実行した環境に依存します。

```bash
python3 scripts/check-invisible-characters.py
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
cargo test --workspace --all-features --locked
cargo check --target wasm32-unknown-unknown --features wasm --locked
cargo check --manifest-path fuzz/Cargo.toml --locked --bin wallet_store_decode
cargo build --package symbol-nem-wallet-core-native --release --locked
cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include \
  -fsyntax-only bindings/native/tests/header_compile.c
./bindings/native/tests/run_c_abi_runtime.sh
wasm-pack test --node --locked --features wasm
cargo audit
```

`wasm-pack` は別途インストールしてください。CI で使用する version は `0.15.0` です。`cargo audit` の初回実行前は次のように RustSec の監査ツールを導入できます。

```bash
cargo install wasm-pack --version 0.15.0 --locked
cargo install cargo-audit --version 0.22.2 --locked
```

`docs/reviews/implementation/implement-review-015.md` では、Implementation HEAD `d519cd4102010a02c5892293705fce041e214769` に対する Review Gate が `READY` です。長時間 fuzz campaign、external verifier / node、nightly branch coverage、LeakSanitizer、Browser 実機 matrix は同レビューの Deferred 範囲であり、この README はそれらを検証済みとは扱いません。詳細な確認範囲と制限はレビュー artifact を参照してください。

## 関連資料

- [要件定義](docs/requirements/requirements.md)
- [基本設計](docs/design/architecture.md)
- [Binding 設計](docs/design/bindings.md)
- [Security 設計](docs/design/security.md)
- [Wallet Core 仕様](docs/specifications/specification.md)
- [Wallet Store Format v1](docs/specifications/wallet-store-format-v1.md)
- [実装レビュー履歴](docs/reviews/implementation/)
- [技術知識ベース](docs/knowledge/)

README は現在利用できる公開 API と統合時の責任境界を説明する文書です。仕様、設計、Binding 契約の正本ではありません。Symbol / NEM の protocol behavior や SDK 互換性を判断する場合は、承認済み仕様と対応する技術資料を確認してください。

## ライセンス

[MIT License](LICENSE)

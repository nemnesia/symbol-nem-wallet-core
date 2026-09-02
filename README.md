# symbol-nem-wallet-core

[日本語](README.md) | [English](README.en.md)

この日本語版が canonical / authoritative documentation です。

`symbol-nem-wallet-core` は、Symbol / NEM の秘密情報を扱う Rust Wallet Core と、その Native C ABI、WASM、Node.js / Browser 向け npm facade を含む monorepo です。主要な distribution path は `@nemnesia/symbol-nem-wallet-core` です。

## Project overview

Wallet Core は、Profile password による operation 単位の認証、Mnemonic と Software Key の保護・導出・署名、Wallet Store の検証と状態変更を担当します。保存先、UI、Transaction の構築・解釈、ネットワーク通信は担当しません。

主な対象は次のとおりです。

- Mainnet / Testnet に固定された Profile の作成、復元、一覧、削除
- BIP39 English 24 words Mnemonic の生成、検証、初回 handoff、明示的な export
- Symbol / NEM の Derived / Imported / Generated Software Key
- Profile password で保護された v1 Wallet Store
- Software Key の public key、address、Chain 固有の署名
- Profile password の変更

Profile は1つの Mnemonic と Network を持ち、Network は作成時に固定されます。Profile 自体は Chain に固定されず、Software Key ごとに Symbol または NEM の Chain が固定されます。同じ Profile 内で両方の Chain の Software Key を扱えますが、Chain と Network を暗黙に変換しません。

## npm を使う

### Install

```bash
npm install @nemnesia/symbol-nem-wallet-core
```

### Quick Start

次は Node.js ESM で既存 Mnemonic から Profile を復元し、Symbol の Software Key を導出して public account を取得する最小例です。秘密情報を source code にハードコードせず、environment input を使用します。

```ts
import {
  create_empty_store,
  derive_software_key,
  get_public_account,
  restore_profile,
} from "@nemnesia/symbol-nem-wallet-core";

const mnemonicText = process.env.WALLET_MNEMONIC;
const passwordText = process.env.WALLET_PASSWORD;
if (mnemonicText === undefined || passwordText === undefined) {
  throw new Error("WALLET_MNEMONIC and WALLET_PASSWORD are required");
}

const encoder = new TextEncoder();
const mnemonic_utf8 = encoder.encode(mnemonicText);
const password_utf8 = encoder.encode(passwordText);

let store = create_empty_store();
const restored = restore_profile(store, mnemonic_utf8, password_utf8, 1);
store = restored.store;

const derived = derive_software_key(
  store,
  restored.value.profile_id,
  password_utf8,
  1,
  0,
);
store = derived.store;

const account = get_public_account(
  store,
  restored.value.profile_id,
  derived.value.key_id,
  { chain: "symbol", network: "mainnet" },
  password_utf8,
);

console.log(account.value.address);
```

`1` は top-level input の `Network` における mainnet 値、`Chain` における symbol 値です。出力 DTO では `network` / `chain` が `"mainnet"` / `"symbol"` になります。

入力 Store は inplace mutation されません。mutation 成功後は必ず `result.store` を次の current Store として利用し、永続化に成功した replacement だけを atomic に適用してください。失敗時は従来の committed Store を維持します。

Node.js は supported target に package-local native artifact があれば native を優先します。`node --no-addons` と native artifact のない unsupported target は package-local WASM を使用します。宣言済み native artifact の欠落、破損、読込失敗、初期化失敗は fail closed し、WASM へ silent fallback しません。Browser は package-local の canonical WASM を使い、remote download は行いません。

詳細な16関数、型、request、result、export / signing flow は [npm package README](packages/wallet-core/README.md) を参照してください。

## npm public API overview

package root の runtime export は次の16関数だけです。default export、class、backend-selection API、raw native API、raw WASM API、internal manifest API は public API ではありません。

```text
create_empty_store                 prepare_generated_profile
finalize_generated_profile         restore_profile
list_profiles                      export_mnemonic
export_private_key                 list_software_keys
derive_software_key                import_software_key
generate_software_key              get_public_account
sign                               change_profile_password
delete_software_key                delete_profile
```

公開 binary は `Uint8Array` です。Store / Pending / Mnemonic / password / private key / payload / signature を hex string として扱う契約はありません。Node では Buffer が compatible input として受理される場合がありますが、canonical public type は `Uint8Array` です。

### 安全上重要な operation

- Generated Mnemonic は `prepare_generated_profile` で準備し、Application が Mnemonic 全体を intended user に提示して明示的な受領確認を取得した後だけ、`finalize_generated_profile` で確定します。Application は確認 status を推測・補完・過去から再利用しません。
- Mnemonic / private key export は、対象、利用者の明示的要求、Application confirmation、正しい Profile password authorization を同じ operation で満たす必要があります。password を知っているだけでは export できません。
- `sign` は raw payload の署名だけを行い、Transaction の解釈や表示をしません。Application は payload / transaction contents を利用者へ表示し、現在の operation の明示的 approval を得てください。確認できない payload の blind signing を推奨しません。

## Rust Core を直接使う

Core crate の package 名は `symbol-nem-wallet-core` です。repository checkout を別の Rust workspace から参照する例です。

```toml
[dependencies]
symbol-nem-wallet-core = { path = "../symbol-nem-wallet-core/crates/core" }
```

Rust API は opaque な `WalletStoreBlob` / `PendingProfileBlob` byte 列を使います。read operation は `ReadResult<T>`、状態変更 operation は `MutationResult<T>` を返します。

```text
ReadResult<T>     { value, warnings }
MutationResult<T> { store, value, warnings }
```

入力 Store は変更されません。成功した mutation の `store` が完全な replacement Store なので、Application は保存に成功した値を current Store として atomic に適用し、失敗時は旧 Store を維持します。`warnings` は秘密情報を含まない構造化 diagnostics です。

秘密情報を必要とする operation は、その呼び出しごとに Profile password を受け取ります。継続的な unlocked session、password の永続 cache、password recovery / reset API はありません。Core は空 password を拒否しますが、password 強度ポリシーは Application の責任です。

### Rust の restore / derive / public account

```rust
use symbol_nem_wallet_core::{
    create_empty_store, derive_software_key, get_public_account, restore_profile,
    AccountContext, Chain, Network,
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

環境変数は説明用の入力経路です。実際の Application では Mnemonic / password の保持期間とコピーを必要最小限にしてください。

### Rust の handoff / confirmation

新規 Mnemonic の handoff は `prepare_generated_profile` と `finalize_generated_profile` の2段階です。Application が Mnemonic 全体を利用者へ提示し、現在の利用者から明示的な受領確認を取得した後だけ `HandoffConfirmationStatus::Confirmed` を構築してください。確認処理は Core が自動取得しません。

```rust
use symbol_nem_wallet_core::{
    create_empty_store, finalize_generated_profile, prepare_generated_profile,
    HandoffConfirmation, HandoffConfirmationStatus, Network,
};

fn obtain_explicit_handoff_confirmation(
    mnemonic_utf8: &[u8],
) -> Result<bool, Box<dyn std::error::Error>> {
    // Application が mnemonic_utf8 全体を利用者へ提示し、明示的な受領確認を取得する。
    let _ = mnemonic_utf8;
    Err(std::io::Error::other("Application must implement the user handoff confirmation").into())
}

fn create_generated_profile() -> Result<(), Box<dyn std::error::Error>> {
    let password = std::env::var("WALLET_PASSWORD")?;
    let store = create_empty_store()?;
    let prepared = prepare_generated_profile(&store, password.as_bytes(), Network::Mainnet)?;
    if !obtain_explicit_handoff_confirmation(&prepared.value.mnemonic_utf8)? {
        return Err("handoff confirmation was not obtained".into());
    }

    let finalized = finalize_generated_profile(
        &store,
        &prepared.value.pending_profile,
        password.as_bytes(),
        HandoffConfirmation {
            status: HandoffConfirmationStatus::Confirmed,
        },
    )?;
    let _current_store = finalized.store;
    Ok(())
}
```

上の確認関数は Application が実装する placeholder で、既定では error を返します。確認なしで `Confirmed` を渡す copy-paste 経路を作らないでください。`restore_profile` で既存 Mnemonic を復元する場合は生成時 handoff の対象外です。

### Symbol / NEM と Mainnet / Testnet

- `Network::Mainnet` / `Network::Testnet` は Profile に固定されます。
- `Chain::Symbol` / `Chain::Nem` は Software Key に固定されます。
- `AccountContext` は固定された Chain / Network の組み合わせを明示します。
- `get_public_account` と `sign` は context が保存値と一致しない場合に `NetworkMismatch` で失敗します。別 Chain / Network への fallback や暗黙変換はありません。

Symbol と NEM は HD 導出、public key、address、署名 scheme を同一視しません。Core の `sign` は raw payload に prefix、generation hash、Transaction 解釈を追加しません。Transaction の構築・解釈・シリアライズは上位層の責任です。

## Native C ABI

Native C ABI は npm public API ではなく、native integration 用の `symbol-nem-wallet-core-native` package と [公開 header](crates/c-abi/include/symbol_nem_wallet_core.h) です。Node-API `.node` artifact と同一物ではありません。未実装の GitHub Release distribution を前提にしません。

```bash
cargo build --package symbol-nem-wallet-core-native --release --locked
```

repository root からの artifact は `target/release/` 配下です。library filename / extension は target / toolchain に依存します。Linux static library の最小例です。

```c
#include "symbol_nem_wallet_core.h"

int main(void) {
    SnwcOwnedBytes store = {NULL, 0};
    const char *error = snwc_create_empty_store(&store);
    if (error != NULL) {
        snwc_free_bytes(&store);
        return 1;
    }
    if (store.ptr == NULL || store.len == 0) {
        snwc_free_bytes(&store);
        return 1;
    }
    snwc_free_bytes(&store);
    return 0;
}
```

```bash
cc -std=c11 -Wall -Wextra -Werror \
  -I crates/c-abi/include \
  native_example.c \
  target/release/libsymbol_nem_wallet_core_native.a \
  -ldl -lpthread -lm \
  -o native_example
./native_example
```

`SnwcBytes` は caller-owned の借用 input、`SnwcOwnedBytes` は Binding-owned output です。output は `snwc_free_bytes`、Profile 配列は `snwc_free_profiles`、Software Key 配列は `snwc_free_software_key_list`、warning 配列は `snwc_free_warnings` で解放します。error は Binding-owned の静的文字列で、free しません。C ABI は output を failure-safe な空状態へ初期化し、失敗時に partial result を返しません。

## WASM の位置付け

`crates/wasm` は npm facade へ組み込む内部 WASM binding / artifact source です。raw `wasm-bindgen` generated module、raw `.wasm`、generated glue は consumer-facing entry point や public npm subpath ではありません。Node / Browser の利用者は npm package root を使ってください。

WASM、Native C ABI、Node-API は Rust Core の cryptography、password authorization、Store semantics、confirmation / approval、Chain / Network policy を複製しません。

## Security / sensitive data handling

Mnemonic、private key、Profile password、seed、decrypted secret material、signature、Store の内部、payload の内容を log、analytics、例外、Debug、warning、diagnostics、不要な cache / storage に出力・コピーしないでください。

| 主体 | 責任 |
| --- | --- |
| Rust Core | cryptography、password authorization、Mnemonic validation、key derivation、Store validity、Chain / Network compatibility、signing |
| Native / Node / WASM Binding | Core と host の間の型、byte 列、error、warning、ownership の橋渡し。security meaning を変更しない |
| Application / UI | secure storage、current Store の persistence、backup、user confirmation UI、signing display、Transaction interpretation |

Application が explicit handoff / export のために secret copy を一時的に受け取ることは、Core 内原本の継続 ownership の移転を意味しません。Browser や host process の侵害防止は Core / Binding の保証範囲外です。

provenance、SBOM、runtime digest verification、Trusted Publishing など release / supply-chain の後続項目を、完成済みの runtime security feature として表現しません。

## 対応外

- Transaction の構築、シリアライズ、意味解釈、表示 UI、署名承認 UI
- REST / WebSocket / announce、ノード選択、Explorer
- Hardware Wallet、External Signer、OS Keychain / Secure Enclave / TPM
- Wallet Store の保存先選択、同期、backup UI、version migration

## Development documentation

設計・仕様・レビュー資料は [`docs/`](docs/) にあります。主に実装者・コントリビューター・レビュアー向けの資料です。

## Development / validation

README-only の変更では実装テストを自動的に意味しません。実装変更を含む場合は、対象に応じて次の入口を使用します。

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
```

npm package assembly と package-local validation の入口は次のとおりです。

```bash
pnpm build:npm
pnpm test:npm
```

Native / WASM / release validation の詳細な範囲は、その時点の scripts と CI 設定に従います。README は未実行の検証を成功済みとは扱いません。

## License

MIT License. [`LICENSE`](LICENSE) を参照してください。

# symbol-nem-wallet-core

Symbol と NEM のウォレット向け Wallet Core です。Rust の共通 Core と、Native / WASM の Binding を提供します。

Wallet Store は Core が保存先を管理せず、不透明な byte 列として読み込み・更新します。秘密情報を必要とする処理では、呼び出しごとに Profile password を受け取ります。

## 対応する機能

- Mainnet / Testnet に固定された Profile の作成・復元・一覧・削除
- BIP39 24 words Mnemonic の生成・検証・明示的な export
- Symbol / NEM Software Key の導出・生成・インポート・一覧・削除
- Profile password で保護された暗号化 Wallet Store
- Software Key の public key、address の取得
- 呼び出し側が渡す raw byte 列への署名
- Profile password の変更
- Native C ABI と `wasm-bindgen` による Binding

Transaction の構築、REST / WebSocket 通信、ウォレット UI、外部 Signer、Hardware Wallet、OS 固有の安全な鍵保管は対象外です。

## Rust から利用する

パッケージ名は `symbol-nem-wallet-core` です。リポジトリを依存に追加する場合は、利用側の `Cargo.toml` に次のように指定します。

```toml
[dependencies]
symbol-nem-wallet-core = { path = "../symbol-nem-wallet-core" }
```

Profile を復元し、Symbol の Software Key を導出して address を取得する最小例です。Mnemonic と password は UTF-8 byte 列として渡します。

```rust
use symbol_nem_wallet_core::{
    create_empty_store, derive_software_key, get_public_account, restore_profile, Chain, Network,
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

    let account = get_public_account(&store, profile_id, key_id, password.as_bytes())?;
    println!("{}", account.value.address);
    Ok(())
}
```

新しい Mnemonic を生成する場合は、`prepare_generated_profile` で Mnemonic と `PendingProfileBlob` を取得し、利用者へのバックアップ受渡しを明示的に確認した後に `finalize_generated_profile` を呼び出します。`prepare_generated_profile` は Store を変更しません。

## API の戻り値

- 読み取り API は `ReadResult<T>`（`value` と `warnings`）を返します。
- 状態変更 API は `MutationResult<T>`（完全な replacement `store`、`value`、`warnings`）を返します。
- 状態変更に成功した場合だけ新しい Store が返るため、成功後はアプリケーション側で保存対象を `result.store` に置き換えてください。入力 Store は変更されません。
- 失敗時は `WalletError.code` の安定した `ErrorCode` を確認します。エラーや warning に秘密情報は含まれません。

主な公開 API は次のとおりです。

- Profile: `create_empty_store`, `prepare_generated_profile`, `finalize_generated_profile`, `restore_profile`, `list_profiles`, `change_profile_password`, `delete_profile`
- Software Key: `derive_software_key`, `import_software_key`, `generate_software_key`, `list_software_keys`, `export_private_key`, `delete_software_key`
- 公開情報・署名: `get_public_account`, `sign`, `export_mnemonic`

`WalletStoreBlob` と `PendingProfileBlob` は opaque byte 列として扱い、アプリケーション側で内容を解釈・編集しないでください。`sign` は payload を Transaction として解釈せず、渡された raw byte 列に対して署名します。

## Binding のビルド

Native C ABI は `bindings/native` の `symbol-nem-wallet-core-native` パッケージと、[公開ヘッダー](bindings/native/include/symbol_nem_wallet_core.h)で提供します。

```bash
cargo build -p symbol-nem-wallet-core-native --release
```

WASM API は `wasm` feature と `wasm32-unknown-unknown` target で有効になります。

```bash
cargo build --target wasm32-unknown-unknown --features wasm --release
```

### TypeScript から利用する

このリポジトリには生成済みの npm パッケージは含まれません。別途 `wasm-bindgen` CLIをインストールしたうえで、次のスクリプトを実行すると、WASM glue code と TypeScript 定義を `pkg/` に生成できます。

`Cargo.lock` に合わせて `wasm-bindgen-cli` は `0.2.127` を使用します。

```bash
cargo install wasm-bindgen-cli --version 0.2.127
```

```bash
./scripts/build-wasm.sh
```

出力先は第1引数で変更できます。相対パスはリポジトリルートから解決されます。

```bash
./scripts/build-wasm.sh dist/wasm
```

生成された JavaScript / TypeScript 定義をアプリケーションから import し、最初に default export を `await` してWASMを初期化します。`./pkg/symbol_nem_wallet_core.js` は生成先の例です。

```typescript
import init, {
  create_empty_store,
  derive_software_key,
  get_public_account,
  restore_profile,
} from "./pkg/symbol_nem_wallet_core.js";

type Warning = {
  code: string;
  object_type: string;
  object_id: string | undefined;
  field: string | undefined;
};

type MutationResult<T> = {
  store: Uint8Array;
  value: T;
  warnings: Warning[];
};

type ProfileInfo = {
  profile_id: string;
  network: "testnet" | "mainnet";
  software_key_count: number;
};

type SoftwareKeyInfo = {
  key_id: string;
  chain: "nem" | "symbol";
  origin: { kind: "derived"; account_index: number } | { kind: "imported" | "generated" };
};

type PublicAccountInfo = {
  key_id: string;
  chain: "nem" | "symbol";
  network: "testnet" | "mainnet";
  public_key: Uint8Array;
  address: string;
};

export async function deriveSymbolAccount(
  mnemonicText: string,
  passwordText: string,
): Promise<PublicAccountInfo> {
  await init();

  const encoder = new TextEncoder();
  const mnemonic = encoder.encode(mnemonicText);
  const password = encoder.encode(passwordText);
  let store = create_empty_store();

  const profile = restore_profile(
    store,
    mnemonic,
    password,
    1, // 1 = mainnet, 0 = testnet
  ) as unknown as MutationResult<ProfileInfo>;
  store = profile.store;

  const key = derive_software_key(
    store,
    profile.value.profile_id,
    password,
    1, // 1 = Symbol, 0 = NEM
    0,
  ) as unknown as MutationResult<SoftwareKeyInfo>;
  store = key.store;

  const account = get_public_account(
    store,
    profile.value.profile_id,
    key.value.key_id,
    password,
  ) as unknown as { value: PublicAccountInfo; warnings: Warning[] };

  return account.value;
}
```

WASM APIのbyte列は `Uint8Array`、`profile_id` と `key_id` は UUID文字列、`network` は `"testnet"` / `"mainnet"`、`chain` は `"nem"` / `"symbol"` です。Rust APIと同様に、状態変更 API が返す `store` を次の呼び出しへ渡し、保存時は完全な replacement Storeとして扱ってください。エラー時は安定した error code が throw されます。

WASM の binary data は `Uint8Array`、Native の入力は借用 buffer、Native の出力は対応する free API で解放する所有 buffer です。詳細な境界契約は [Binding の設計判断](docs/decisions/binding-implementation.md) とヘッダーを参照してください。

## セキュリティ上の注意

- Mnemonic、private key、Profile password をログ、例外、debug 出力へ出力しないでください。
- `export_mnemonic` と `export_private_key` の結果は明示的な export 結果です。アプリケーション側で継続保存・キャッシュしないでください。
- Profile は Mainnet / Testnet に固定され、Software Key は Symbol / NEM のいずれかに固定されます。両者を暗黙に混在させないでください。
- Wallet Store の保存・置換は、利用する環境側で atomic に行ってください。
- Profile password を失った場合の recovery / reset API はありません。

## ドキュメント

- [要件定義書](docs/requirements/requirements.md)
- [Wallet Core 仕様設計書](docs/specifications/specification.md)
- [Wallet Store フォーマット v1](docs/specifications/wallet-store-format-v1.md)
- [コンセプトシート](docs/consept/concept-sheet.md)
- [設計判断](docs/decisions/)
- [仕様レビュー](docs/reviews/specifications/)
- [実装レビュー](docs/reviews/implementation/)
- [技術知識ベース](docs/knowledge/)

仕様、実装、SDK の利便 API は同一視せず、互換性やプロトコル上の判断が必要な場合は、承認済み仕様と対応するレビュー・決定記録を確認してください。

## 検証

```bash
cargo test --workspace
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```

## ライセンス

[MIT License](LICENSE)

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

## API の呼び出しモデル

| APIの種類 | 成功時の結果 | Storeの扱い |
| --- | --- | --- |
| 読み取り | `ReadResult<T>`（`value`、`warnings`） | 入力 Store は変更されない |
| 状態変更 | `MutationResult<T>`（`store`、`value`、`warnings`） | `result.store` を完全な replacement Store として保存する |

入力 Store はどのAPIでも直接変更されません。状態変更を続けて呼び出す場合は、成功時に返された `result.store` を次の呼び出しへ渡してください。失敗時は `WalletError.code` の安定した `ErrorCode` を確認します。エラーや warning に秘密情報は含まれません。

`list_profiles` と `list_software_keys` は password なしで公開 index を読み取ります。これらの結果は未認証の保存情報として扱い、秘密情報が認証済みであることの証明には使用しないでください。

## 公開API一覧

Rust Coreの公開関数一覧です。Native C ABIは `snwc_` prefix、WASM APIは同じsnake_case名で、同じ操作をBinding向けの型へ変換して公開します。

### Store / Profile

| 関数 | 入力 | 説明 | 成功時の戻り値 |
| --- | --- | --- | --- |
| `create_empty_store()` | なし | 空のWallet Storeを作成する | `WalletStoreBlob` |
| `prepare_generated_profile(store, password_utf8, network)` | Store、password、Network | BIP39 English 24 words Mnemonicと、確定前のopaqueなPending Profileを生成する。Storeは変更しない | `ReadResult<PreparedProfile>` |
| `finalize_generated_profile(store, pending_profile, password_utf8)` | Store、Pending Profile、password | Pending Profileを検証し、生成したProfileをStoreへ追加する | `MutationResult<ProfileInfo>` |
| `restore_profile(store, mnemonic_utf8, password_utf8, network)` | Store、Mnemonic、password、Network | 既存MnemonicからProfileを復元・登録する | `MutationResult<ProfileInfo>` |
| `list_profiles(store)` | Store | passwordなしでProfileの公開情報を一覧取得する。結果は未認証のmanifest由来 | `ReadResult<Vec<ProfileInfo>>` |
| `export_mnemonic(store, profile_id, password_utf8)` | Store、Profile ID、password | Mnemonicを明示的にexportする | `ReadResult<MnemonicExport>` |
| `change_profile_password(store, profile_id, current_password_utf8, new_password_utf8)` | Store、Profile ID、現在のpassword、新しいpassword | Profile passwordを変更する | `MutationResult<()>` |
| `delete_profile(store, profile_id, password_utf8)` | Store、Profile ID、password | Profileと配下のSoftware Keyを削除する | `MutationResult<()>` |

### Software Key

| 関数 | 入力 | 説明 | 成功時の戻り値 |
| --- | --- | --- | --- |
| `list_software_keys(store, profile_id)` | Store、Profile ID | passwordなしでKey IDとChainを一覧取得する。private keyとoriginは含まない | `ReadResult<Vec<SoftwareKeyListItem>>` |
| `derive_software_key(store, profile_id, password_utf8, chain, account_index)` | Store、Profile ID、password、Chain、account index | ProfileのMnemonicからSoftware Keyを導出して登録する | `MutationResult<SoftwareKeyInfo>` |
| `import_software_key(store, profile_id, password_utf8, chain, private_key)` | Store、Profile ID、password、Chain、raw private key | raw 32 bytesのprivate keyを検証して登録する | `MutationResult<SoftwareKeyInfo>` |
| `generate_software_key(store, profile_id, password_utf8, chain)` | Store、Profile ID、password、Chain | 暗号学的乱数からSoftware Keyを生成して登録する | `MutationResult<SoftwareKeyInfo>` |
| `export_private_key(store, profile_id, key_id, password_utf8)` | Store、Profile ID、Key ID、password | private keyを明示的にexportする | `ReadResult<PrivateKeyExport>` |
| `delete_software_key(store, profile_id, key_id, password_utf8)` | Store、Profile ID、Key ID、password | 指定したSoftware Keyを削除する | `MutationResult<()>` |

### 公開情報 / 署名

| 関数 | 入力 | 説明 | 成功時の戻り値 |
| --- | --- | --- | --- |
| `get_public_account(store, profile_id, key_id, password_utf8)` | Store、Profile ID、Key ID、password | Software Keyのpublic keyとChain / Networkに対応するaddressを取得する | `ReadResult<PublicAccountInfo>` |
| `sign(store, profile_id, key_id, password_utf8, payload_bytes)` | Store、Profile ID、Key ID、password、raw payload | payloadを解釈・加工せず、そのraw byte列に署名する | `ReadResult<Signature>` |

`password_utf8` と `mnemonic_utf8` はUTF-8 byte列、`private_key` と `payload_bytes` はraw byte列です。状態変更APIの成功時は、戻り値の `store` を次の操作と永続化に使用してください。

Coreが公開する主な型は、識別子の `ProfileId` / `SoftwareKeyId`、列挙型の `Network` / `Chain` / `SoftwareKeyOrigin`、結果型の `ReadResult<T>` / `MutationResult<T>`、公開情報の `ProfileInfo` / `SoftwareKeyInfo` / `SoftwareKeyListItem` / `PublicAccountInfo`、明示的export結果の `MnemonicExport` / `PrivateKeyExport`、opaque byte列の `WalletStoreBlob` / `PendingProfileBlob` です。

`WalletStoreBlob` と `PendingProfileBlob` は opaque byte 列として扱い、アプリケーション側で内容を解釈・編集しないでください。`sign` は payload を Transaction として解釈せず、渡された raw byte 列に対して署名します。

## Binding のビルド

### Native C ABI

Native C ABI は `bindings/native` の `symbol-nem-wallet-core-native` パッケージと、[公開ヘッダー](bindings/native/include/symbol_nem_wallet_core.h)で提供します。

```bash
cargo build -p symbol-nem-wallet-core-native --release
```

入力の `SnwcBytes` は呼び出し側が所有する借用 buffer です。出力の `SnwcOwnedBytes` と配列は、ヘッダーに定義された対応する `snwc_free_*` 関数で解放してください。

Native Bindingの解放APIは次のとおりです。

- `snwc_free_bytes`: `SnwcOwnedBytes` を解放する
- `snwc_free_warnings`: warning配列を解放する
- `snwc_free_profiles`: Profile一覧を解放する
- `snwc_free_software_key_list`: Software Key一覧を解放する

### WASM

WASM API は `wasm` feature と `wasm32-unknown-unknown` target で有効になります。

```bash
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --features wasm --release
```

WASM Bindingの実行テストは `wasm-bindgen-test` を使用し、Node.js上で次のコマンドを実行します。
`wasm-bindgen-test` は開発依存関係に含まれています。`wasm-pack` は別途インストールしてください。

```bash
cargo install wasm-pack --version 0.15.0 --locked
wasm-pack test --node --locked --features wasm
```

### TypeScript から利用する

このリポジトリには生成済みの npm パッケージは含まれません。別途 `wasm-bindgen` CLIをインストールしたうえで、次のスクリプトを実行すると、WASM glue code と TypeScript 定義を `pkg/` に生成できます。

`Cargo.lock` と CI の `wasm-bindgen` に合わせ、`wasm-bindgen-cli` は `0.2.127` を使用します。

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
  mnemonic: Uint8Array,
  password: Uint8Array,
): Promise<PublicAccountInfo> {
  await init();

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
- WASMはJavaScriptと同じexecution contextで動作し、JavaScriptから秘密情報を隔離するsecurity boundaryではありません。Rust側でzeroizeしても、呼び出し側のJavaScript `Uint8Array` のコピーは自動的には消去されません。
- XSSや悪意あるBrowser Extensionが同じJavaScript execution contextを取得した場合、WASM APIも呼び出され得ます。WebページのJavaScriptへWallet Coreを直接公開する設計は推奨しません。
- Browser Extensionでは、可能な限りpage contextから分離されたbackground / extension contextでCoreを管理してください。
- `export_mnemonic` と `export_private_key` は明示的な秘密情報exportであり、通常の署名処理では使用しないでください。
- 秘密情報をJavaScript `string`へ変換すると、明示的なzeroizeが困難になります。秘密入力は可能な限り`Uint8Array`で扱い、不要になったコピーを速やかに破棄してください。
- Profile は Mainnet / Testnet に固定され、Software Key は Symbol / NEM のいずれかに固定されます。両者を暗黙に混在させないでください。
- Wallet Store の保存・置換は、利用する環境側で atomic に行ってください。
- Profile password を失った場合の recovery / reset API はありません。

### Blind signing の防止

`sign()` は Transaction parser ではなく、呼び出し側から渡された raw byte 列を解釈・検証・加工せずに署名する低レベルの signing primitive です。Wallet Core は Transaction の意味や安全性を自動検証しないため、統合先アプリが内容確認なしで `sign()` を呼び出すと blind signing が成立します。

統合先アプリは、`sign()` を呼び出す前に Transaction / payload を解釈し、人間が確認できる形式で表示したうえで、利用者から明示的な承認を得てください。署名前確認 UI を必須とし、該当する以下の重要情報を表示してください。

- Network
- Transaction type
- recipient / destination
- amount
- mosaic / asset
- fee
- message
- Aggregate Transaction のすべての内部 Transaction
- その他、資産移動・権限・状態変更に影響する情報

unknown / unsupported Transaction type は blind signing せず拒否してください。payload を完全に解釈できない場合は fail closed とし、必須情報を確認 UI に表示できない場合も原則として署名を拒否してください。Aggregate Transaction は外側の情報だけでなく、内部 Transaction まで展開して確認してください。

### 表示対象と署名対象の同一性

解析した payload、確認 UI に表示した payload、利用者が承認した payload、`sign()` に渡す payload は、同一の byte 列であることを保証してください。確認後に payload を再生成・再取得する設計では、署名前に内容が変更されていないことを検証し、別の payload へ差し替えないでください。

```text
payload A を解析
    ↓
確認 UI に A を表示
    ↓
利用者が承認
    ↓
同じ payload A を sign(A)
```

### 責任分界

Wallet Core の責務は、raw byte 列への暗号学的署名、private key を利用した暗号処理、Wallet Store の暗号化・認証、および Chain / Network に対応した鍵処理です。

統合先アプリの責務は、Transaction parsing、human-readable representation、署名前確認 UI、利用者の明示的な承認、policy / permission checks、blind signing の防止、ならびに表示対象と署名対象の同一性保証です。

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

### レビュー資料の位置づけ

`docs/reviews/` 配下の仕様レビュー・実装レビューは、設計・実装判断の追跡、指摘と修正の履歴保存、セキュリティレビューの透明性、および将来のレビュアーが判断経緯を確認できるようにするための資料です。レビュー文書は上書きせず、次のように連番で保存します。

```text
implement-review-001.md
implement-review-002.md
...
implement-review-009.md
```

後続レビューでは Finding の状態を `Resolved` / `Open` / `New` などとして追跡します。過去レビューには、その時点では有効でも後続実装で解消された指摘が含まれるため、古いレビュー単体を現行実装の状態や、現在存在する脆弱性の一覧として解釈しないでください。現行実装のレビュー状態を確認する場合は、[実装レビュー履歴](docs/reviews/implementation/) 内の最新レビューを参照してください。過去のレビュー資料と Finding は変更せず保持します。

## 検証

```bash
python3 scripts/check-invisible-characters.py
cargo test --workspace --all-features --locked
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
wasm-pack test --node --locked --features wasm
cargo check --target wasm32-unknown-unknown --features wasm --locked
cargo build --package symbol-nem-wallet-core-native --release --locked
cc -std=c11 -Wall -Wextra -Werror -I bindings/native/include -fsyntax-only bindings/native/tests/header_compile.c
cargo audit
```

`cargo audit` の初回実行前に、RustSec の監査ツールをインストールしてください。

```bash
cargo install cargo-audit --version 0.22.2 --locked
```

## ライセンス

[MIT License](LICENSE)

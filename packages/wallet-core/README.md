# @nemnesia/symbol-nem-wallet-core

[日本語](README.md) | [English](README.en.md)

この日本語版が canonical / authoritative documentation です。

`@nemnesia/symbol-nem-wallet-core` は、Symbol / NEM Wallet Core の同期 TypeScript facade です。Node.js と Browser から package root を import し、Mnemonic、Profile、Software Key、public account、raw payload の署名を扱えます。

## Install

```bash
npm install @nemnesia/symbol-nem-wallet-core
```

## Requirements と実行環境

- Node.js `>=22.0.0`
- Browser は ESM と WebAssembly をサポートする modern evergreen 環境を対象とします。Manifest V3 extension でも利用できます。
- package-local の Node-API native artifact と canonical WASM artifact を使用します。
- `postinstall` build、`node-gyp`、Cargo の install-time 実行はありません。
- install 時または runtime に remote artifact / CDN を download しません。

Browser では package に同梱された WASM と、bundler が扱う package-local asset を使用します。Application が WASM asset を remote URL へ差し替える契約はありません。

## Import

ESM の public entry point は package root だけです。

```ts
import {
  create_empty_store,
  restore_profile,
} from "@nemnesia/symbol-nem-wallet-core";
```

CJS も package の supported conditional export です。

```js
const {
  create_empty_store,
  restore_profile,
} = require("@nemnesia/symbol-nem-wallet-core");
```

backend、raw `.node`、raw `.wasm`、generated binding module、manifest、backend selector は public subpath ではありません。consumer は package root だけを import してください。

## Quick Start

次は Node.js ESM で既存 Mnemonic から Profile を復元し、Symbol の Software Key を導出して public account を取得する最小例です。Mnemonic と password は source code に埋め込まず、例では environment input を使用します。

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

`1` は top-level input の `Network` における mainnet 値、`Chain` における symbol 値です。出力 DTO の `network` / `chain` は、それぞれ `"mainnet"` / `"symbol"` の文字列です。

入力 `store` は inplace mutation されません。mutation が成功するたびに `result.store` が完全な replacement Store になるため、次の operation にはその値を渡してください。Application が永続化に失敗した場合は、以前の committed Store を current Store として維持します。失敗結果には成功用の replacement Store はありません。

## 公開関数 (16)

package root の runtime export は次の16関数だけです。TypeScript の `interface`、`type` alias、error declaration は runtime named export ではありません。関数はすべて同期呼び出しで、`Promise` を返しません。

| Function | Arguments | Return type | Mutation / Read | Purpose |
| --- | --- | --- | --- | --- |
| `create_empty_store` | なし | `Uint8Array` | Factory | 空の Wallet Store を作る |
| `prepare_generated_profile` | `store`, `password_utf8`, `network` | `PreparedProfileResult` (`ReadResult<PreparedProfile>`) | Read / pending | 新しい Mnemonic と Pending Profile を準備する。Profile はまだ確定しない |
| `finalize_generated_profile` | `store`, `pending_profile`, `password_utf8`, `handoff_confirmation` | `ProfileMutationResult` (`MutationResult<ProfileInfo>`) | Mutation | handoff 確認済みの Pending Profile を Profile として確定する |
| `restore_profile` | `store`, `mnemonic_utf8`, `password_utf8`, `network` | `ProfileMutationResult` (`MutationResult<ProfileInfo>`) | Mutation | 既存 Mnemonic から Profile を復元する |
| `list_profiles` | `store` | `ProfileListResult` (`ReadResult<ProfileInfo[]>`) | Read | Profile の公開 index を一覧する |
| `export_mnemonic` | `store`, `request`, `password_utf8` | `MnemonicExportResult` (`ReadResult<MnemonicExport>`) | Read / explicit export | 条件を満たす明示的な Mnemonic export を行う |
| `export_private_key` | `store`, `request`, `password_utf8` | `PrivateKeyExportResult` (`ReadResult<PrivateKeyExport>`) | Read / explicit export | 条件を満たす明示的な Software Key private key export を行う |
| `list_software_keys` | `store`, `profile_id` | `SoftwareKeyListResult` (`ReadResult<SoftwareKeyListItem[]>`) | Read | Profile の Software Key 公開 index を一覧する |
| `derive_software_key` | `store`, `profile_id`, `password_utf8`, `chain`, `account_index` | `SoftwareKeyMutationResult` (`MutationResult<SoftwareKeyInfo>`) | Mutation | Mnemonic から指定 Chain / account index の Key を導出する |
| `import_software_key` | `store`, `profile_id`, `password_utf8`, `chain`, `private_key` | `SoftwareKeyMutationResult` (`MutationResult<SoftwareKeyInfo>`) | Mutation | raw private key を指定 Chain の Key として取り込む |
| `generate_software_key` | `store`, `profile_id`, `password_utf8`, `chain` | `SoftwareKeyMutationResult` (`MutationResult<SoftwareKeyInfo>`) | Mutation | Core で指定 Chain の Key を生成する |
| `get_public_account` | `store`, `profile_id`, `key_id`, `requested_context`, `password_utf8` | `PublicAccountResult` (`ReadResult<PublicAccountInfo>`) | Read | 固定された Chain / Network に対応する public key と address を取得する |
| `sign` | `store`, `request`, `password_utf8` | `SignatureResult` (`ReadResult<Signature>`) | Read / signing | 明示承認済み request の raw payload に署名する |
| `change_profile_password` | `store`, `profile_id`, `current_password_utf8`, `new_password_utf8` | `UnitMutationResult` (`MutationResult<null>`) | Mutation | Profile password を変更する |
| `delete_software_key` | `store`, `profile_id`, `key_id`, `password_utf8` | `UnitMutationResult` (`MutationResult<null>`) | Mutation | Software Key を削除する |
| `delete_profile` | `store`, `profile_id`, `password_utf8` | `UnitMutationResult` (`MutationResult<null>`) | Mutation | Profile を削除する |

引数名は public declaration の名前に対応します。`ProfileId` と `SoftwareKeyId` は UUID string、`account_index` は `0..=2_147_483_647` の整数です。`import_software_key` の `private_key` は textual hex / `0x` string ではなく raw 32 bytes です。

## Scalar と主要 DTO

### Scalar

| Type | TypeScript 表現と意味 |
| --- | --- |
| `Network` | `0 \| 1`。top-level input では `0 = testnet`, `1 = mainnet` |
| `Chain` | `0 \| 1`。top-level input では `0 = nem`, `1 = symbol` |
| `NetworkName` | `"testnet" \| "mainnet"`。output DTO の表現 |
| `ChainName` | `"nem" \| "symbol"`。output DTO の表現 |
| `ProfileId` | `string`。ハイフン区切り UUID |
| `SoftwareKeyId` | `string`。ハイフン区切り UUID |
| `AccountIndex` | `number`。runtime の有効範囲は `0..=2_147_483_647` |

`Network` / `Chain` の number 表現は operation の top-level 引数だけで使用します。`AccountContext`、`ProfileInfo`、`SoftwareKeyInfo`、`SoftwareKeyListItem`、`PublicAccountInfo` では文字列表現を使用します。

### Confirmation、request、context

```ts
HandoffConfirmationStatus = "unconfirmed" | "confirmed";
HandoffConfirmation = {
  status: HandoffConfirmationStatus;
}

ExportTarget =
  | { kind: "mnemonic"; profile_id: ProfileId; key_id?: undefined }
  | { kind: "software_key"; profile_id: ProfileId; key_id: SoftwareKeyId };

ExportUserRequestStatus = "not_requested" | "requested";
ExportUserRequest = {
  target: ExportTarget;
  status: ExportUserRequestStatus;
};

ExportApplicationConfirmationStatus = "not_confirmed" | "confirmed";
ExportApplicationConfirmation = {
  target: ExportTarget;
  status: ExportApplicationConfirmationStatus;
};

ExportRequest = {
  target: ExportTarget;
  user_request: ExportUserRequest;
  application_confirmation: ExportApplicationConfirmation;
};

AccountContext = {
  chain: "nem" | "symbol";
  network: "testnet" | "mainnet";
};

SigningTarget = {
  profile_id: ProfileId;
  key_id: SoftwareKeyId;
  context: AccountContext;
};

SigningApprovalStatus = "not_approved" | "approved";
SigningApproval = {
  status: SigningApprovalStatus;
};

SigningRequest = {
  target: SigningTarget;
  payload: Uint8Array;
  approval: SigningApproval;
};
```

全 field は required です。ただし Mnemonic の `ExportTarget.key_id` だけは absent または `undefined` で、`null` ではありません。nested target は、`ExportRequest` の3箇所で同じ対象を指定します。

### Result と公開 DTO

```ts
ReadResult<T> = {
  value: T;
  warnings: DecodeWarning[];
};

MutationResult<T> = {
  store: Uint8Array;
  value: T;
  warnings: DecodeWarning[];
};

ProfileInfo = {
  profile_id: ProfileId;
  network: NetworkName;
  software_key_count: number;
};

SoftwareKeyInfo = {
  key_id: SoftwareKeyId;
  chain: ChainName;
  origin: SoftwareKeyOrigin;
};

SoftwareKeyOrigin = {
  kind: "derived" | "imported" | "generated";
  account_index: number | null;
};

SoftwareKeyListItem = {
  key_id: SoftwareKeyId;
  chain: ChainName;
};

PublicAccountInfo = {
  key_id: SoftwareKeyId;
  chain: ChainName;
  network: NetworkName;
  public_key: Uint8Array; // raw 32 bytes
  address: string;
};

PreparedProfile = {
  mnemonic_utf8: Uint8Array;
  pending_profile: Uint8Array;
};

MnemonicExport = { mnemonic_utf8: Uint8Array };
PrivateKeyExport = { private_key: Uint8Array }; // raw 32 bytes
Signature = { signature: Uint8Array }; // raw 64 bytes
```

`DecodeWarning` は `{ code, object_type, object_id, field }` で、`object_id` と `field` の値は `string | undefined` です。warning は秘密情報を含まない構造化 diagnostics であり、ログ文字列ではありません。unit mutation の `value` は JavaScript `null` です。

## Wallet Store と replacement rule

`store` は opaque な Wallet Store blob、`pending_profile` は opaque な Pending Profile blob です。Application は CBOR、version、暗号化 payload、index などの内部表現を解釈、編集、normalize、migration してはいけません。v1 は Store / Profile version migration を提供しません。

- `create_empty_store` は Store の `Uint8Array` を直接返します。
- read result は `{ value, warnings }` です。
- mutation result は `{ store, value, warnings }` です。
- mutation 成功時の `store` は次にそのまま渡す完全な replacement Store です。
- 入力 Store を inplace mutation する契約はありません。
- mutation 失敗時は入力 Store と committed state を維持し、成功 DTO や replacement Store を返しません。

Application / persistence layer は、保存に成功した replacement Store だけを current Store として atomic に適用します。Core と facade は過去の Store の currentness、stale 判定、rollback 防止を記憶に基づいて行いません。

## Important operation flows

### Generated Mnemonic handoff

新しい Profile は `prepare_generated_profile` と `finalize_generated_profile` の2段階です。

1. `prepare_generated_profile` が `PreparedProfile` として Mnemonic 全体および opaque `pending_profile` を返す。
2. Application が Mnemonic 全体を intended user に提示する。
3. User の明示的な受領確認を Application が取得する。
4. Application が同じ Pending / Store / password と `{ status: "confirmed" }` を使って `finalize_generated_profile` を呼ぶ。

確認は Application が現在の利用者から取得する assertion です。Application が status を都合よく生成したり、過去の確認を再利用したりしてはいけません。確認を取得できない、Pending が破損している、対象 Store と一致しない、password authorization に失敗する、または finalize に失敗する場合、Profile は成功状態になりません。

```ts
const prepared = prepare_generated_profile(store, password_utf8, 1);

// Application-side placeholder:
// mnemonic_utf8 全体を intended user に提示し、現在の user から明示的な確認を取得する。
presentMnemonicToIntendedUser(prepared.value.mnemonic_utf8);
const userConfirmed = await waitForExplicitUserHandoffConfirmation();
if (!userConfirmed) {
  throw new Error("handoff confirmation was not obtained");
}

const finalized = finalize_generated_profile(
  store,
  prepared.value.pending_profile,
  password_utf8,
  { status: "confirmed" },
);
store = finalized.store;
```

上の `presentMnemonicToIntendedUser` と `waitForExplicitUserHandoffConfirmation` は Application が実装する placeholder です。確認 UI を実装しないまま `confirmed` を固定して呼び出してはいけません。`restore_profile` で既存 Mnemonic を復元する処理は、生成時 handoff の対象ではありません。

### Mnemonic / private key export

export は通常処理と分離された明示操作です。次の3者を別々に満たしてください。

1. 利用者が現在の operation について export を要求する。
2. Application が対象を表示・確認し、現在の operation の確認を取得する。
3. Core が同じ operation の Profile password authorization に成功する。

password を知っているだけでは export authorization になりません。`ExportRequest` の `target`、`user_request.target`、`application_confirmation.target` は同じ target で、status はそれぞれ `"requested"` と `"confirmed"` でなければなりません。

```ts
// これらの status は、現在の user request / Application confirmation を取得した後だけ構築する。
const target = { kind: "mnemonic", profile_id } as const;
const request = {
  target,
  user_request: { target, status: "requested" },
  application_confirmation: { target, status: "confirmed" },
};

const exported = export_mnemonic(store, request, password_utf8);
// exported.value.mnemonic_utf8 は明示 export の一時的な結果。利用後は保持しない。
```

Software Key private key の場合は `target` を `{ kind: "software_key", profile_id, key_id }` にし、同じ条件で `export_private_key` を呼びます。返された secret copy の表示・保管・利用・破棄は Application / user の責任です。

### Signing

`sign` は Transaction parser ではありません。Core は payload を解釈、再構成、prefix 追加せず、渡された raw bytes を署名します。

Application は署名前に Transaction / payload を上位の Transaction layer で解釈し、利用者が確認可能な形で内容を表示し、現在の operation の明示承認を取得します。表示・承認した target、context、payload と同じ値を `SigningRequest` に設定してください。内容を確認できない unknown / unsupported payload を blind signing として推奨・実行しないでください。

```ts
const context = { chain: "symbol", network: "mainnet" } as const;
// Application-side placeholder: 解釈・表示した同じ raw bytes について現在の user approval を取得する。
const payload = getPayloadPresentedAndApprovedByUser();

const signed = sign(
  store,
  {
    target: { profile_id, key_id, context },
    payload,
    approval: { status: "approved" },
  },
  password_utf8,
);
```

`SigningApproval`、Core の password authorization、`AccountContext` と保存済み Profile / Software Key の compatibility は別々の条件です。facade は approval や context を補完・変換しません。

## Binary data

公開 declaration の binary 型はすべて `Uint8Array` です。

| 用途 | 表現 |
| --- | --- |
| Store blob | opaque `Uint8Array` |
| Pending Profile blob | opaque `Uint8Array` |
| Mnemonic | UTF-8 `Uint8Array` |
| Profile password | UTF-8 `Uint8Array` |
| private key | raw 32-byte `Uint8Array` |
| signing payload | 意味解釈されない raw `Uint8Array` |
| public key | raw 32-byte `Uint8Array` |
| signature | raw 64-byte `Uint8Array` |

Node runtime では `Buffer` が `Uint8Array` compatible input として受理される場合がありますが、public DTO / declaration の canonical type は `Uint8Array` です。WASM では Buffer を前提にしません。private key を hex string として渡すことはできません。

入力 binary の ownership は caller にあり、facade は入力を保持しません。返却 binary は caller が所有する新しい copy です。Mnemonic、password、private key、decrypted secret material、signature を log、analytics、diagnostics、cache、長期 state、不要な storage へコピーしないでください。目的の handoff / export / signing が終わったら、caller が sensitive buffer を上書きし、参照を破棄してください。

## React Native

React Native Android / iOS は同じ package root から利用できます。RN の runtime resolver は `react-native` conditional export で private native entry を選び、New Architecture の TurboModule / JSI adapter から同じ Rust Core / C ABI を呼び出します。RN 側に Node addon や WASM の fallback はありません。

対応範囲は stable React Native `0.86.x` / `0.87.x`（`0.87.x` を primary validation line）、New Architecture、Android API 24 以上の `arm64-v8a` / `x86_64`、iOS 15.1 以上の arm64 device / Apple Silicon simulator です。Expo は SDK 57 と React Native `0.86.x` の Development Build / Prebuild（custom native module workflow）を対象とし、Expo Go は対象外です。

native artifact の integrity または provider / registration が確認できない場合は `WalletCoreBackendInitializationError` で失敗します。runtime download、postinstall compile、別 RN package、RN 用の別 WASM binary、Legacy Architecture / bridge fallback はありません。RN native build は package の `codegenConfig` と同梱の platform source / artifact manifest を使用します。

RN の 16 関数もすべて同期 API で、public binary は `Uint8Array` です。Store、Pending Profile、Mnemonic、password、private key、payload、signature の扱いと、成功時に返る replacement Store の適用規則は Node / Browser と同じです。

## Node / Browser backend behavior

### Node.js

- supported target に manifest entry がある場合、package-local Node-API native backend を優先します。
- `node --no-addons` は package-local WASM backend を使用します。
- native artifact がない unsupported target は package-local WASM backend を使用します。
- manifest entry がある native artifact の欠落、破損、読込不能、SHA-256 不一致、初期化失敗は `WalletCoreBackendInitializationError` です。
- declared native artifact の failure を WASM へ silent fallback しません。

Linux native target は x64 + recognized glibc `>=2.28` の manifest mapping だけです。その他の platform / architecture / libc combination は WASM 側へ進みます。現在の package assembly がどの native artifact を含むかは package-local manifest によって決まり、consumer が backend を直接選択する API はありません。

### Browser

Browser ESM は package-local の一つの canonical WASM binary と generated glue を使います。module initialization は host / bundler に応じて非同期になり得ますが、import 完了後の16関数は同期です。Browser、Application、Node の実行 context は秘密情報を隔離する security boundary ではありません。

raw `.node`、raw `.wasm`、generated module、manifest は implementation asset であり、public package subpath ではありません。

## Security と責任分界

### Application の責任

- secure storage と current Store の永続化方法を選ぶ。
- 成功した `result.store` を atomic に保存し、失敗時は旧 Store を維持する。
- Mnemonic handoff、export、signing の user confirmation / approval UI を実装する。
- signing 前に payload / transaction contents を理解可能な形で表示する。
- backup、復旧導線、host / browser / OS の security policy を管理する。
- Mnemonic、private key、password、decrypted secret material を log、analytics、diagnostics に出さない。

### Core の責任

- cryptography、Mnemonic validation、key derivation、private key protection、signing。
- operation ごとの Profile password authorization。
- Wallet Store / Pending Profile の validity、integrity、compatibility、状態変更。
- Profile の Network と Software Key の Chain の compatibility。`Network` / `Chain` の mismatch を暗黙に変換しない。

### facade の境界

facade は型・binary・error の representation を橋渡しするだけです。暗号、認証、authorization、confirmation / approval の生成、Transaction interpretation、Store の意味解釈、migration、current Store 判定、Chain / Network policy を代替しません。Application や Browser host の侵害防止も保証しません。

native artifact の runtime SHA-256 verification は package / loader boundary の control です。provenance、SBOM、Trusted Publishing など release / supply-chain の後続項目を、この package の Core runtime security feature として保証するものではありません。

## Errors

Core operation の失敗は `WalletCoreError` として正規化され、`name` は `"WalletCoreError"`、`code` と `message` は同じ `ErrorCode` です。主な code は次のとおりです。

```text
InvalidArgument, InvalidStore, UnsupportedStoreVersion,
UnsupportedProfileSchemaVersion, ProfileNotFound, SoftwareKeyNotFound,
AuthenticationFailed, InvalidMnemonic, InvalidPrivateKey,
DuplicateProfile, DuplicateSoftwareKey, InvalidAccountIndex,
NetworkMismatch, CryptoFailure, RandomSourceFailure,
SerializationFailure, PendingProfileInvalid, BindingFailure
```

backend の読み込み・WASM 初期化に失敗した場合は、Core operation error とは別の `WalletCoreBackendInitializationError` です。error、warning、diagnostics に secret や内部 payload を含めません。

## License

MIT License. [Repository](https://github.com/nemnesia/symbol-nem-wallet-core) と [LICENSE](https://github.com/nemnesia/symbol-nem-wallet-core/blob/main/LICENSE) を参照してください。

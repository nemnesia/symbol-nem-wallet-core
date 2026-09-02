# Stage 7A — npm / TypeScript facade public contract

## 1. 位置づけ

本書は、`agent/monorepo-migration` の開始 HEAD
`3ee039d59618e68478be886cc8ff11b0649469fa` に対する Stage 7A の仕様である。
Stage 6 Node-API Binding completion gate が PASS したことを前提に、Stage 7B の実装前に
公開 npm package と TypeScript facade の外部可視契約を固定する。

対象 package は次の一つだけとする。

```text
@nemnesia/symbol-nem-wallet-core
```

この文書は実装、package、Cargo、CI または README の変更を行うものではない。Stage 7A
で確定するのは facade、artifact manifest、backend routing および package assembly の
契約であり、4 platform の release build、npm pack、clean install、各 bundler の検証は
Stage 9 に委譲する。

Normative terms such as **MUST**, **MUST NOT** and **MAY** are used as follows:

- **MUST**: 実装が満たさなければならない契約
- **MUST NOT**: 実装および consumer-facing package が提供してはならないもの
- **MAY**: 契約を変更しない範囲で許可される実装上の選択

## 2. 根拠と現行 surface の追跡

本書のプロジェクト固有の根拠は次の順で扱う。

1. `docs/migration/monorepo-npm-distribution-design.md`
2. `docs/migration/node-npm-implementation-gate.md`
3. `docs/design/architecture.md`
4. `docs/design/security.md`
5. `docs/design/bindings.md`
6. `docs/specifications/specification.md`
7. `docs/specifications/wallet-store-format-v1.md`
8. `crates/core/src/lib.rs`、`crates/core/src/types.rs`、`crates/core/src/error.rs`、
   `crates/core/src/store.rs`
9. `crates/node/src/lib.rs`、`crates/node/tests/smoke.js`
10. `crates/wasm/src/lib.rs` および `crates/wasm/tests/unit/wasm.rs`

Core、Node-API、WASM はいずれも同じ 16 operation を公開している。本書ではその
operation set を TypeScript の一つの public contract に写像する。既存 surface の
binding 差は次のように facade で正規化する。

| 項目                                             | Node-API の現在 surface                                                      | WASM の現在 surface                                         | Stage 7 facade の契約                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| binary input / output                            | `Uint8Array`。Node では `Buffer` も `Uint8Array` compatible input として受理 | `Uint8Array`                                                | declaration は `Uint8Array` のみ。Node runtime の Buffer compatibility は補助的受理であり public type ではない |
| unit mutation の `value`                         | `null`                                                                       | `null`                                                      | `null`                                                                                                         |
| `SoftwareKeyOrigin` の非 derived `account_index` | `null`                                                                       | field が未設定で `undefined`                                | field は必須、`number \| null`。`imported` / `generated` は `null`                                             |
| warning の optional field                        | `object_id` / `field` は存在し `undefined` のことがある                      | `object_id` / `field` は存在し `undefined` のことがある     | field は必須、値は `string \| undefined`                                                                       |
| malformed UUID                                   | `InvalidArgument`                                                            | binding conversion 経由で `BindingFailure` になる経路がある | DTO の意味的な malformed UUID は `InvalidArgument` に正規化                                                    |
| Core error                                       | `Error` の `message` に code。code property はない                           | JS string に code                                           | `WalletCoreError` の `code` と `message` に同じ `ErrorCode`                                                    |
| backend initialization                           | package-level contract なし                                                  | package-level contract なし                                 | facade package の `BackendInitializationError` として Core error から分離                                      |

この表の差異を理由に Core の operation、DTO、security meaning、Store semantics または
Chain / Network policy を変更してはならない。facade は representation normalization の
境界にとどまる。

## 3. 公開境界と責務

### 3.1 公開 runtime surface

consumer-facing な runtime export は、次の named function 16 個だけとする。

```text
create_empty_store
prepare_generated_profile
finalize_generated_profile
restore_profile
list_profiles
export_mnemonic
export_private_key
list_software_keys
derive_software_key
import_software_key
generate_software_key
get_public_account
sign
change_profile_password
delete_software_key
delete_profile
```

上記以外の runtime export を追加しない。特に次を公開しない。

- `WalletCore` class
- default export
- 公開 `init` / `choose_backend` / `load_native` / `load_wasm` function
- backend object、native addon object、raw wasm-bindgen module
- runtime `ErrorCode` object、debug helper、manifest loader

`type`、`interface`、generic result alias および error declaration は TypeScript declaration
上の型であり、runtime named export の数を増やさない。

### 3.2 Facade の authority

facade の authority は次の範囲だけとする。

- conditional exports による entry 解決
- Node target に対する native artifact lookup
- package-local WASM asset の読み込み
- backend adapter 間の representation normalization
- Node / WASM の error representation normalization

facade は次を実行・判断・保持してはならない。

- cryptography、password authentication、Mnemonic validation、key derivation、signature
  implementation
- Wallet Store decode、serialization、migration、current Store 判定
- authorization、confirmation / approval の生成、assertion freshness の管理
- duplicate detection、Chain / Network compatibility policy、implicit conversion
- password cache、secret cache、unlocked session

Store と PendingProfile は facade にとって opaque な bytes である。facade は confirmation、
approval、export intent、authorization または Network / Chain policy を生成、補完、推測、
書き換えしない。

## 4. Scalar、ID および binary contract

### 4.1 TypeScript scalar types

```ts
export type Network = 0 | 1;
// 0 = Testnet, 1 = Mainnet

export type Chain = 0 | 1;
// 0 = NEM, 1 = Symbol

export type NetworkName = "testnet" | "mainnet";
export type ChainName = "nem" | "symbol";

export type ProfileId = string;
export type SoftwareKeyId = string;
export type AccountIndex = number;
```

`Network` と `Chain` の numeric representation は、Core operation の top-level scalar
argument にだけ使用する。 `AccountContext`、`ProfileInfo`、`SoftwareKeyInfo`、
`SoftwareKeyListItem` および `PublicAccountInfo` の `network` / `chain` は、現在の
Node/WASM output surface と同じ `NetworkName` / `ChainName` string representation とする。

`AccountIndex` は TypeScript の number representation であり、runtime では finite、整数、
`0 <= account_index <= 2_147_483_647` を満たさなければならない。`NaN`、infinity、fraction、
負数、上限超過は `InvalidAccountIndex` とする。別の JavaScript 型は `BindingFailure` と
する。

`ProfileId` および `SoftwareKeyId` はハイフン区切り UUID string とし、入力は UUID として
解釈できなければならない。Core から返す UUID は lowercase とする。facade は UUID を
別形式へ正規化せず、曖昧な ID や別 Profile の key を選択しない。

### 4.2 Binary

公開 declaration の全 binary は `Uint8Array` とする。

| 用途              | public type  | 意味                                  |
| ----------------- | ------------ | ------------------------------------- |
| `store`           | `Uint8Array` | opaque Wallet Store blob              |
| `pending_profile` | `Uint8Array` | opaque pending profile blob           |
| `password_utf8`   | `Uint8Array` | Profile password の UTF-8 bytes       |
| `mnemonic_utf8`   | `Uint8Array` | BIP39 English 24 words の UTF-8 bytes |
| `private_key`     | `Uint8Array` | raw 32 bytes                          |
| `payload`         | `Uint8Array` | signing 対象の raw bytes              |
| `public_key`      | `Uint8Array` | raw 32 bytes                          |
| `signature`       | `Uint8Array` | raw 64 bytes                          |

Node runtime は `Buffer` を `Uint8Array` compatible input として受理してよいが、`Buffer`
を declaration、DTO または backend-specific contract に含めない。WASM では Buffer を
前提にしない。facade は binary の hex 化、base64 化、文字列化または chain-specific
payload 解釈を行わない。

返却された binary は呼び出し側が所有する新しい外部値である。Core 内の原本の ownership
は移転しない。secret-containing output は利用後できるだけ早く呼び出し側が上書きし、
参照を破棄する。facade は秘密値を cache、log、warning、error、diagnostics または
global state へコピーしない。

## 5. Exact TypeScript declarations

次の declaration を v1 facade の公開型契約とする。すべての field は required であり、
明示した field 以外を追加しない。`?` を使う field は `ExportTarget` の mnemonic
variant の `key_id` だけであり、値は absent または `undefined` とし、`null` は契約に
含めない。

```ts
export type Network = 0 | 1;
export type Chain = 0 | 1;
export type NetworkName = "testnet" | "mainnet";
export type ChainName = "nem" | "symbol";
export type ProfileId = string;
export type SoftwareKeyId = string;
export type AccountIndex = number;

export type HandoffConfirmationStatus = "unconfirmed" | "confirmed";

export interface HandoffConfirmation {
  status: HandoffConfirmationStatus;
}

export type MnemonicExportTarget = {
  kind: "mnemonic";
  profile_id: ProfileId;
  key_id?: undefined;
};

export type SoftwareKeyExportTarget = {
  kind: "software_key";
  profile_id: ProfileId;
  key_id: SoftwareKeyId;
};

export type ExportTarget = MnemonicExportTarget | SoftwareKeyExportTarget;

export type ExportUserRequestStatus = "not_requested" | "requested";

export interface ExportUserRequest {
  target: ExportTarget;
  status: ExportUserRequestStatus;
}

export type ExportApplicationConfirmationStatus = "not_confirmed" | "confirmed";

export interface ExportApplicationConfirmation {
  target: ExportTarget;
  status: ExportApplicationConfirmationStatus;
}

export interface ExportRequest {
  target: ExportTarget;
  user_request: ExportUserRequest;
  application_confirmation: ExportApplicationConfirmation;
}

export interface AccountContext {
  chain: ChainName;
  network: NetworkName;
}

export interface SigningTarget {
  profile_id: ProfileId;
  key_id: SoftwareKeyId;
  context: AccountContext;
}

export type SigningApprovalStatus = "not_approved" | "approved";

export interface SigningApproval {
  status: SigningApprovalStatus;
}

export interface SigningRequest {
  target: SigningTarget;
  payload: Uint8Array;
  approval: SigningApproval;
}

export interface DecodeWarning {
  code: string;
  object_type: string;
  object_id: string | undefined;
  field: string | undefined;
}

export interface ProfileInfo {
  profile_id: ProfileId;
  network: NetworkName;
  software_key_count: number;
}

export type SoftwareKeyOriginKind = "derived" | "imported" | "generated";

export interface SoftwareKeyOrigin {
  kind: SoftwareKeyOriginKind;
  account_index: number | null;
}

export interface SoftwareKeyInfo {
  key_id: SoftwareKeyId;
  chain: ChainName;
  origin: SoftwareKeyOrigin;
}

export interface SoftwareKeyListItem {
  key_id: SoftwareKeyId;
  chain: ChainName;
}

export interface PublicAccountInfo {
  key_id: SoftwareKeyId;
  chain: ChainName;
  network: NetworkName;
  public_key: Uint8Array;
  address: string;
}

export interface PreparedProfile {
  mnemonic_utf8: Uint8Array;
  pending_profile: Uint8Array;
}

export interface MnemonicExport {
  mnemonic_utf8: Uint8Array;
}

export interface PrivateKeyExport {
  private_key: Uint8Array;
}

export interface Signature {
  signature: Uint8Array;
}

export interface ReadResult<T> {
  value: T;
  warnings: DecodeWarning[];
}

export interface MutationResult<T> {
  store: Uint8Array;
  value: T;
  warnings: DecodeWarning[];
}

export type ProfileListResult = ReadResult<ProfileInfo[]>;
export type SoftwareKeyListResult = ReadResult<SoftwareKeyListItem[]>;
export type PreparedProfileResult = ReadResult<PreparedProfile>;
export type MnemonicExportResult = ReadResult<MnemonicExport>;
export type PrivateKeyExportResult = ReadResult<PrivateKeyExport>;
export type PublicAccountResult = ReadResult<PublicAccountInfo>;
export type SignatureResult = ReadResult<Signature>;
export type ProfileMutationResult = MutationResult<ProfileInfo>;
export type SoftwareKeyMutationResult = MutationResult<SoftwareKeyInfo>;
export type UnitMutationResult = MutationResult<null>;

export type ErrorCode =
  | "InvalidArgument"
  | "InvalidStore"
  | "UnsupportedStoreVersion"
  | "UnsupportedProfileSchemaVersion"
  | "ProfileNotFound"
  | "SoftwareKeyNotFound"
  | "AuthenticationFailed"
  | "InvalidMnemonic"
  | "InvalidPrivateKey"
  | "DuplicateProfile"
  | "DuplicateSoftwareKey"
  | "InvalidAccountIndex"
  | "NetworkMismatch"
  | "CryptoFailure"
  | "RandomSourceFailure"
  | "SerializationFailure"
  | "PendingProfileInvalid"
  | "BindingFailure";

export interface WalletCoreError extends Error {
  readonly name: "WalletCoreError";
  readonly code: ErrorCode;
  readonly message: ErrorCode;
}

export interface BackendInitializationError extends Error {
  readonly name: "WalletCoreBackendInitializationError";
  readonly message: "backend initialization failed";
}

export function create_empty_store(): Uint8Array;

export function prepare_generated_profile(
  store: Uint8Array,
  password_utf8: Uint8Array,
  network: Network,
): PreparedProfileResult;

export function finalize_generated_profile(
  store: Uint8Array,
  pending_profile: Uint8Array,
  password_utf8: Uint8Array,
  handoff_confirmation: HandoffConfirmation,
): ProfileMutationResult;

export function restore_profile(
  store: Uint8Array,
  mnemonic_utf8: Uint8Array,
  password_utf8: Uint8Array,
  network: Network,
): ProfileMutationResult;

export function list_profiles(store: Uint8Array): ProfileListResult;

export function export_mnemonic(
  store: Uint8Array,
  request: ExportRequest,
  password_utf8: Uint8Array,
): MnemonicExportResult;

export function export_private_key(
  store: Uint8Array,
  request: ExportRequest,
  password_utf8: Uint8Array,
): PrivateKeyExportResult;

export function list_software_keys(
  store: Uint8Array,
  profile_id: ProfileId,
): SoftwareKeyListResult;

export function derive_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
  chain: Chain,
  account_index: AccountIndex,
): SoftwareKeyMutationResult;

export function import_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
  chain: Chain,
  private_key: Uint8Array,
): SoftwareKeyMutationResult;

export function generate_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
  chain: Chain,
): SoftwareKeyMutationResult;

export function get_public_account(
  store: Uint8Array,
  profile_id: ProfileId,
  key_id: SoftwareKeyId,
  requested_context: AccountContext,
  password_utf8: Uint8Array,
): PublicAccountResult;

export function sign(
  store: Uint8Array,
  request: SigningRequest,
  password_utf8: Uint8Array,
): SignatureResult;

export function change_profile_password(
  store: Uint8Array,
  profile_id: ProfileId,
  current_password_utf8: Uint8Array,
  new_password_utf8: Uint8Array,
): UnitMutationResult;

export function delete_software_key(
  store: Uint8Array,
  profile_id: ProfileId,
  key_id: SoftwareKeyId,
  password_utf8: Uint8Array,
): UnitMutationResult;

export function delete_profile(
  store: Uint8Array,
  profile_id: ProfileId,
  password_utf8: Uint8Array,
): UnitMutationResult;
```

### 5.1 Declaration interpretation

- 16 function declaration の return type はすべて同期型であり、`Promise` を含まない。
- `create_empty_store` だけが単純な `Uint8Array` を返す。その他は Core の read または
  mutation semantics に対応する result object を返す。
- `MutationResult<null>` の `value` は `undefined`、`void`、空 object または省略ではなく、
  成功時の JavaScript `null` である。
- `ReadResult.value`、`ReadResult.warnings`、`MutationResult.store`、
  `MutationResult.value`、`MutationResult.warnings` は常に required である。
- `ExportRequest` と `SigningRequest` の status は Application / UI の現在 operation に
  対する assertion であり、facade が password の成否や function 呼出しから補完しては
  ならない。
- `AccountContext` の strings は DTO representation であり、facade が numeric
  `Network` / `Chain` を受けて補正してはならない。

## 6. Operation traceability と success semantics

| public function              | Core operation                     | Node current export          | WASM current export          | result                              |
| ---------------------------- | ---------------------------------- | ---------------------------- | ---------------------------- | ----------------------------------- |
| `create_empty_store`         | `core::create_empty_store`         | `create_empty_store`         | `create_empty_store`         | `Uint8Array`                        |
| `prepare_generated_profile`  | `core::prepare_generated_profile`  | `prepare_generated_profile`  | `prepare_generated_profile`  | `ReadResult<PreparedProfile>`       |
| `finalize_generated_profile` | `core::finalize_generated_profile` | `finalize_generated_profile` | `finalize_generated_profile` | `MutationResult<ProfileInfo>`       |
| `restore_profile`            | `core::restore_profile`            | `restore_profile`            | `restore_profile`            | `MutationResult<ProfileInfo>`       |
| `list_profiles`              | `core::list_profiles`              | `list_profiles`              | `list_profiles`              | `ReadResult<ProfileInfo[]>`         |
| `export_mnemonic`            | `core::export_mnemonic`            | `export_mnemonic`            | `export_mnemonic`            | `ReadResult<MnemonicExport>`        |
| `export_private_key`         | `core::export_private_key`         | `export_private_key`         | `export_private_key`         | `ReadResult<PrivateKeyExport>`      |
| `list_software_keys`         | `core::list_software_keys`         | `list_software_keys`         | `list_software_keys`         | `ReadResult<SoftwareKeyListItem[]>` |
| `derive_software_key`        | `core::derive_software_key`        | `derive_software_key`        | `derive_software_key`        | `MutationResult<SoftwareKeyInfo>`   |
| `import_software_key`        | `core::import_software_key`        | `import_software_key`        | `import_software_key`        | `MutationResult<SoftwareKeyInfo>`   |
| `generate_software_key`      | `core::generate_software_key`      | `generate_software_key`      | `generate_software_key`      | `MutationResult<SoftwareKeyInfo>`   |
| `get_public_account`         | `core::get_public_account`         | `get_public_account`         | `get_public_account`         | `ReadResult<PublicAccountInfo>`     |
| `sign`                       | `core::sign`                       | `sign`                       | `sign`                       | `ReadResult<Signature>`             |
| `change_profile_password`    | `core::change_profile_password`    | `change_profile_password`    | `change_profile_password`    | `MutationResult<null>`              |
| `delete_software_key`        | `core::delete_software_key`        | `delete_software_key`        | `delete_software_key`        | `MutationResult<null>`              |
| `delete_profile`             | `core::delete_profile`             | `delete_profile`             | `delete_profile`             | `MutationResult<null>`              |

function の引数順は Core と同じであり、facade adapter が positional argument を再配列
しない。成功時の mutation は replacement Store を `MutationResult.store` に返し、caller が
current Store として採用する。failure 時は success DTO、secret、signature または
replacement Store を返さず、元の input Store を変更しない。

`list_profiles` と `list_software_keys` は平文 manifest の read であり password を要求
しない。`get_public_account` と `sign` の context は保存済み Profile Network と Software
Key fixed Chain に一致しなければならず、facade は他の context へ変換・fallback しない。
`sign` の `payload` は raw bytes として Core へ渡し、facade は transaction、hash、prefix、
generation、fee または chain-specific serialization を解釈しない。

## 7. DTO の security contract

`HandoffConfirmation`、`ExportRequest`、`SigningRequest`、`AccountContext` の field は
省略、再命名、既定値補完または暗黙変換をしない。次の条件は Core の既存仕様をそのまま
維持する。

- `finalize_generated_profile` は `confirmed` handoff の確認条件が成立する場合だけ
  pending profile を committed Store へ移す。
- `export_mnemonic` は `MnemonicExportTarget`、`export_private_key` は
  `SoftwareKeyExportTarget` だけを対象とし、`target`、`user_request.target`、
  `application_confirmation.target` の一致、要求 status、confirmation status、
  password authorization の全条件を要求する。
- `SigningApproval.status = "approved"` は同じ target / payload に対する Application
  assertion であり、password の成功から facade が生成してはならない。
- `AccountContext` は Profile の保存済み Network および Software Key の保存済み Chain
  と照合する要求であり、facade の policy で書き換えない。

secret-containing DTO は成功時だけ返す。error、warning、exception message、debug
representation、package metadata、manifest、artifact filename に Mnemonic、private key、
password、seed、ciphertext、Store contents または payload の内容を含めない。

## 8. ErrorCode と error representation

### 8.1 Core ErrorCode

v1 の `ErrorCode` は次の 18 code を exact string literal とする。

| ErrorCode                         | 契約上の意味                                                               |
| --------------------------------- | -------------------------------------------------------------------------- |
| `InvalidArgument`                 | DTO、string、enum representation または semantic input の不正              |
| `InvalidStore`                    | malformed、truncated、サイズ超過、deterministic CBOR 違反を含む Store 不正 |
| `UnsupportedStoreVersion`         | 構造的に読めるが未対応の Wallet Store version                              |
| `UnsupportedProfileSchemaVersion` | 構造的に読めるが未対応の Profile schema version                            |
| `ProfileNotFound`                 | Store 内に指定 Profile がない                                              |
| `SoftwareKeyNotFound`             | 指定 Profile 内に指定 Software Key がない                                  |
| `AuthenticationFailed`            | Profile password authorization に失敗                                      |
| `InvalidMnemonic`                 | Mnemonic の UTF-8 / BIP39 / entropy 条件の不正                             |
| `InvalidPrivateKey`               | raw 32-byte private key の長さまたは値の不正                               |
| `DuplicateProfile`                | Profile の重複                                                             |
| `DuplicateSoftwareKey`            | Profile 内 Software Key の重複                                             |
| `InvalidAccountIndex`             | account index が finite integer または規定範囲外                           |
| `NetworkMismatch`                 | 保存済み Network / fixed Chain と request context の不一致                 |
| `CryptoFailure`                   | Core の暗号処理失敗                                                        |
| `RandomSourceFailure`             | Core が要求する暗号学的乱数の取得失敗                                      |
| `SerializationFailure`            | Core の serialization / replacement generation 失敗                        |
| `PendingProfileInvalid`           | pending profile の構造、照合または handoff 条件の不正                      |
| `BindingFailure`                  | backend boundary の型、buffer、allocation、lifecycle、conversion failure   |

Core の現行 `#[non_exhaustive]` enum に将来 code が加わった場合、それを本 v1 facade の
成功や既存 code へ黙って畳み込まない。新しい consumer-visible code が必要なら本書の
仕様変更として扱う。

### 8.2 Core operation error

Core operation の失敗は、Node/WASM どちらから来ても、次の facade error shape に正規化
して throw する。

```ts
// TypeScript declaration only; runtime named export ではない。
interface WalletCoreError extends Error {
  readonly name: "WalletCoreError";
  readonly code: ErrorCode;
  readonly message: ErrorCode;
}
```

`message` は `code` と同じ exact string とする。`cause`、backend 名、native target、
artifact path、filename、raw addon error、raw wasm error、Rust error detail、stack 以外の
診断 detail を contract として公開しない。consumer は `error` が `Error` であり、
`name === "WalletCoreError"` かつ `code` が 18 code のいずれかであることを機械判定する。

representation failure の正規化は次の通りとする。

- object が必要な DTO の null、primitive、proxy または object shape 自体の unreadable
  failure は `BindingFailure`。
- `Uint8Array` 以外、detached / unreadable buffer、output allocation、ownership、lifecycle
  または output conversion の失敗は `BindingFailure`。
- 受け取った DTO の field 欠落、unknown literal、status 不正、malformed UUID、numeric
  Network / Chain の範囲外は `InvalidArgument`。
- attached `Uint8Array` の private key 長不正・値不正は `InvalidPrivateKey`、Store の
  malformed / oversized input は `InvalidStore` とする。

これは Node/WASM の現在の低レベル例外文字列差を隠すための representation normalization
であり、facade が Core validation、crypto または security policy を実装することを意味
しない。

### 8.3 Backend initialization error

Core `ErrorCode` と package/backend initialization error は別の namespace とする。次の
失敗は `WalletCoreError` の 18 code に偽装してはならない。

- native addon の load failure、export / Node-API version 不一致、初期化失敗
- required な manifest、adapter、generated glue または local `.wasm` の欠落・破損
- package 内 artifact の path、filename、metadata、hash または schema の不整合
- WASM instantiate / module initialization failure

これらは次の型の error として throw する。Core `code` property を付けず、Core operation
error と明確に区別する。

```ts
// TypeScript declaration only; runtime named export ではない。
interface BackendInitializationError extends Error {
  readonly name: "WalletCoreBackendInitializationError";
  readonly message: "backend initialization failed";
}
```

`message` は常に `"backend initialization failed"` とし、backend、target、filesystem path、
artifact filename、raw loader detail、hash、package local path または秘密情報を含めない。
ESM では module evaluation の rejection、CJS では `require()` の throw になり得るが、
どちらも operation の Core error result ではない。

## 9. Conditional exports と public subpath

### 9.1 Exact `package.json` exports

`package.json` の `exports` field は次の JSON を exact contract とする。object の条件順は
意味を持つため、`types`、`node-addons`、`default` の順序を変更しない。

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "node-addons": {
        "import": "./dist/node/index.mjs",
        "require": "./dist/node/index.cjs"
      },
      "default": {
        "import": "./dist/wasm/index.mjs",
        "require": "./dist/wasm/index.cjs"
      }
    }
  }
}
```

`browser` condition、独自 `wasm` / `native` condition、`process` / `window` heuristic に
よる backend routing condition を追加しない。`types` は型解決のための先頭条件であり、
runtime backend を選択しない。

公開 entry point は root のみである。

```text
@nemnesia/symbol-nem-wallet-core
```

次は `exports` に列挙せず、package specifier から到達不能とする。

```text
@nemnesia/symbol-nem-wallet-core/node
@nemnesia/symbol-nem-wallet-core/wasm
@nemnesia/symbol-nem-wallet-core/native
raw .node
raw wasm-bindgen module
raw .wasm
C ABI
internal manifest
```

package 内に実ファイルが存在することは public subpath contract を与えない。consumer は
root import だけを使用する。Node.js の package `exports` は未列挙 subpath を
`ERR_PACKAGE_PATH_NOT_EXPORTED` とするため、この封止を維持する。

### 9.2 ESM / CJS parity

root の `import` と `require` は同じ 16 named function、同じ declaration DTO、同じ
`ReadResult` / `MutationResult`、同じ 18 Core ErrorCode、同じ backend routing、同じ Store
replacement semantics を提供する。ESM にだけ class、Promise operation、追加 export を
与えず、CJS にだけ default export、Buffer DTO または backend override を与えない。

package metadata の基本値は次の通りとする。

```json
{
  "type": "module",
  "types": "./dist/index.d.ts",
  "engines": {
    "node": ">=22.0.0"
  }
}
```

`engines.node` は consumer runtime の floor を表し、build tooling の Node requirement と
混同しない。Stage 7 実装は Node 22.0.0 で利用可能な syntax / standard API を使用し、
Node 22.x の途中で追加された API を最低 runtime に要求しない。primary verification line
は Node 24.x とする。

## 10. Backend routing と fallback

### 10.1 Routing authority

backend の一次選択は package `exports` の条件解決だけで行う。

```text
Node 通常起動       -> node-addons -> Node native adapter
node --no-addons    -> default     -> WASM adapter
Browser / bundler   -> default     -> WASM adapter
```

Node branch に入った後の `process.platform`、`process.arch` および libc 情報は native
artifact lookup のためだけに使う。これは native / WASM backend の一次選択 authority では
なく、unsupported target の場合に WASM adapter へ明示的に進むための lookup 結果である。

### 10.2 許可される fallback

次の fallback だけを許可する。

```text
Node 通常起動
  -> node-addons
  -> target manifest に canonical target がない
  -> package-local WASM adapter

node --no-addons
  -> default
  -> package-local WASM adapter
```

manifest entry がないことは、valid manifest にその target の native artifact が assembly
されていないという lookup result であり、WASM fallback の条件である。

次は MUST NOT とする。

```text
manifest entry あり
  + addon missing / load failure / initialization failure / operation failure
  -> WASM retry
```

supported native target の native load / initialization failure は fail closed とし、
`BackendInitializationError` を throw する。native operation の `WalletCoreError`、
`BindingFailure`、secret export failure、sign failure またはその他 operation failure を
WASM で再試行しない。retry により重複 mutation、異なる RNG、異なる backend semantics または
failure masking を起こしてはならない。

## 11. Node native target lookup

### 11.1 Canonical mapping

native v1 mandatory target は次の 4 個だけとする。

| `process.platform` | `process.arch` | libc 判定        | canonical `target_id` | OS        | CPU     | ABI      | Rust target                |
| ------------------ | -------------- | ---------------- | --------------------- | --------- | ------- | -------- | -------------------------- |
| `win32`            | `x64`          | なし             | `win32-x64-msvc`      | `windows` | `x64`   | `msvc`   | `x86_64-pc-windows-msvc`   |
| `darwin`           | `x64`          | なし             | `darwin-x64`          | `macos`   | `x64`   | `darwin` | `x86_64-apple-darwin`      |
| `darwin`           | `arm64`        | なし             | `darwin-arm64`        | `macos`   | `arm64` | `darwin` | `aarch64-apple-darwin`     |
| `linux`            | `x64`          | recognized glibc >= 2.28 | `linux-x64-gnu`       | `linux`   | `x64`   | `gnu`    | `x86_64-unknown-linux-gnu` |

`linux-x64-gnu` の v1 minimum runtime baseline は **glibc >= 2.28** とする。この target
policy は Node.js 22.x / 24.x の GNU/Linux x64 support baseline と整合させる。これは
manifest schema に minimum glibc version field を追加するものではなく、Stage 9 release
validation で確認する target policy である。

native non-supported / WASM fallback target は次の通りである。

```text
win32 arm64
linux arm64 glibc
linux x64 musl
linux arm64 musl
その他の platform / arch / libc combination
```

上記 mapping に存在しない組み合わせには canonical native target id を割り当てず、
WASM adapter を使用する。target id は文字列の推測、Node module ABI の推測、native load
probe または artifact filename の推測で決めない。

### 11.2 Linux libc identification

Linux では native load を試して libc を判定してはならない。Node 22.x で利用可能な
`process.report.getReport()` を同期的に呼び、返却された report の
`header.glibcVersionRuntime` が非空 string の場合だけ `glibc` と判定する。

`process.report.getReport().header.glibcVersionRuntime` は libc の種別判定に使用するもので
あり、native artifact の build-time compatibility を保証するものではない。`linux-x64-gnu`
の glibc >= 2.28 baseline への適合性は、Stage 9 release validation で確認する。

次の場合は `recognized glibc` ではない。

- `process.report` または `getReport` が利用できない
- `getReport()` が throw する
- report、`header` または `glibcVersionRuntime` が欠落している
- 値が空または string でない
- `glibcVersionRuntime` が `2.28` 未満である

判定不能、musl またはその他の libc は `linux-x64-gnu` に写像せず unsupported target と
して WASM へ進む。`ldd` の実行、filesystem heuristic、dynamic loader の起動、binary の
試行 load、network capability probe は行わない。`process.report` の利用は Node branch
内の artifact lookup に限定し、Browser の routing や backend override の authority に
しない。

Node.js の report API と `glibcVersionRuntime` は [Node.js Diagnostic report
documentation](https://nodejs.org/api/report.html) を根拠とする。

## 12. Native artifact manifest

### 12.1 Location と exact schema

Stage 7 package 内の manifest は次の location だけに置く。

```text
dist/native/artifact-manifest.json
```

manifest の top-level schema は次の JSON shape とする。`artifacts` が空配列または一部
target だけを含むことは Stage 7 local assembly では許可する。

```json
{
  "schema_version": 1,
  "package_name": "@nemnesia/symbol-nem-wallet-core",
  "package_version": "<semver>",
  "source_commit": "<40 lowercase hexadecimal characters>",
  "node_api_version": 8,
  "artifacts": [
    {
      "target_id": "<canonical target id>",
      "os": "windows | macos | linux",
      "cpu": "x64 | arm64",
      "abi": "msvc | darwin | gnu",
      "libc": "glibc",
      "rust_target": "<Rust target triple>",
      "relative_path": "dist/native/<target_id>/<artifact_filename>",
      "artifact_filename": "<basename ending in .node>",
      "sha256": "<64 lowercase hexadecimal characters>",
      "toolchain_identifier": "<non-empty build toolchain identifier>"
    }
  ]
}
```

`libc` は Linux artifact でだけ required とし、Linux では `"glibc"` でなければなら
ない。Windows / macOS artifact は `libc` field を持たず、`null`、空 string または別の
libc literal を使わない。実際の artifact filename は assembly に供給された basename を
記録し、manifest が存在しない filename pattern を推測してはならない。

manifest field の validation は次の通りとする。

- top-level は object、`schema_version` は number `1`、`package_name` は exact package
  name、`package_version` は package の version と同一である。
- `source_commit` は build source commit の 40 文字 lowercase hex とする。
- `node_api_version` は number `8` とする。これは Node-API version であり、Node module
  ABI、Node major または napi-rs の内部 version ではない。
- `artifacts` は array であり、重複した `target_id` を含まない。v1 target id は
  `win32-x64-msvc`、`darwin-x64`、`darwin-arm64`、`linux-x64-gnu` のいずれかだけである。
- `target_id`、`os`、`cpu`、`abi`、`rust_target`、`relative_path`、
  `artifact_filename`、`toolchain_identifier` は non-empty string とする。
- `relative_path` は `/` 区切りの相対 path であり、`dist/native/` の下だけを指し、`..`
  を含まない。`artifact_filename` はその path の basename と一致し、`.node` で終わる。
- `target_id` と `os` / `cpu` / `abi` / `libc` / `rust_target` の組み合わせは §11.1 の
  mapping と一致する。
- `sha256` は実 artifact の SHA-256 metadata として、lowercase 64 hex で記録する。
- artifact の配列順は canonical order
  `win32-x64-msvc`、`darwin-x64`、`darwin-arm64`、`linux-x64-gnu` の順とする。
- secrets、Store、private key、Mnemonic、password、payload および local cache を
  manifest に記録しない。

上記以外の top-level field、artifact field、null、wildcard、target alias または unknown
target を v1 contract に含めない。

### 12.2 Manifest truth rule と hash verification

manifest entry の存在は、その package assembly が当該 native artifact を実際に提供する
ことを意味する。assembler は次を満たさない entry を生成してはならない。

- 指定 path に実 file が存在する
- basename、target metadata、Rust target および Node-API version が一致する
- `sha256` が実 file から計算された値である
- package に含まれる相対 path と manifest の path が一致する

したがって、次は package corruption / backend initialization failure であり、WASM
fallback ではない。

```text
manifest entry あり + binary missing / unreadable / invalid
```

valid manifest に target entry がない場合だけ、§10.2 の WASM fallback を許可する。
manifest file 自体の missing、invalid JSON、schema mismatch、package version mismatch または
assembly-time metadata mismatch は `BackendInitializationError` とする。runtime の毎回 hash
計算はここに含めず、§12.2 の OPEN-006 defer を優先する。

manifest の `sha256` は assembly / release evidence と runtime lookup の metadata である。
OPEN-006 の runtime hash verification は release gate へ DEFERRED とする。Stage 7 の
facade は runtime の毎回 SHA-256 検証を必須にせず、manifest metadata の存在だけを理由に
verification を行わない。将来 runtime verification を導入する場合は、失敗を
`BackendInitializationError` とし、Core error や WASM retry に変換しない。

## 13. Stage 7 / Stage 9 assembly boundary

### 13.1 Stage 7 の責務

Stage 7 は次を実装対象とする。

- 本書の 16 function facade
- Node / WASM adapter と representation normalization
- native target lookup
- §12 の manifest schema と manifest assembler
- package assembly logic
- package-local WASM loader と adapter

Stage 7 local manifest は、現在の assembly に実際に供給された artifact だけを記録する。
4 platform binary が存在しない local build で、binary の偽造、placeholder、空 file または
未来の target の宣言を行わない。

### 13.2 Stage 9 の責務

Stage 9 release candidate では、4 mandatory target の実際の build と compatibility
verification を含め、次を別の release gate とする。

- `win32-x64-msvc`、`darwin-x64`、`darwin-arm64`、`linux-x64-gnu` の build
- `linux-x64-gnu` artifact が glibc 2.28 より新しい runtime を暗黙に要求しないことの確認
- newer glibc 環境で偶然 build できただけの artifact を `linux-x64-gnu` supported artifact
  として release しないことの確認
- 全 artifact の収集と manifest 完全性
- final package assembly と `npm pack`
- clean install
- ESM / CJS matrix、`--no-addons`、unsupported target
- Vite、webpack 5、esbuild、Browser WASM smoke

Stage 9 では manifest に mandatory 4 target の entry と実 binary が揃っていることを要求
する。Stage 9 の release matrix 責務、Stage 8 の Node native / Node WASM / Browser WASM
parity 責務を Stage 7 local build へ逆流させない。glibc baseline 不適合を runtime WASM
fallback で隠してはならず、manifest entry が存在する supported artifact の load failure
は従来どおり fail closed とする。

## 14. WASM artifact と initialization

### 14.1 Artifact contract

`crates/wasm` を唯一の WASM binding source とする。consumer package の WASM area は次の
構造を持つ。

```text
dist/wasm/index.mjs
dist/wasm/index.cjs
dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm
dist/wasm/<generated wasm-bindgen glue files>
```

`symbol_nem_wallet_core_wasm_bg.wasm` は一つの canonical Core WASM binary である。Node
用、Browser 用、ESM 用、CJS 用に Core semantics の異なる `.wasm` を複数生成しない。
JS glue、adapter および asset loading mechanism が host ごとに異なることは許可するが、
全て同じ package-local binary と `crates/wasm` の同じ Core operation set を利用する。

raw generated wasm-bindgen module、`.wasm`、generated glue は package filesystem 内の
implementation asset であり、`exports` の public subpath または root runtime named
export にしない。

remote CDN、remote URL、user-provided URL、network capability probe、install-time download
を使用しない。package は同梱 asset だけで動作する。

### 14.2 Universal loader contract

`node-addons` または `default` の conditional branch が選択された後の WASM asset loading
mechanism は backend selection ではなく asset loading の責務である。host ごとに次の方法
を使用する。

| host / entry                      | local asset loading                                                           | initialization                                                                    | public operation                        |
| --------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| Browser ESM                       | `import.meta.url` を基準にした package-local URL と bundler の packaged asset | async wasm-bindgen initialization。必要なら module top-level await                | module evaluation 完了後は同期 function |
| Node ESM `--no-addons`            | package-local file URL を Node の local file reader で bytes として読む       | `initSync({ module: bytes })` または同等の同期 local instantiation                | `import` 後は同期 function              |
| Node CJS `--no-addons`            | `dist/wasm/index.cjs` が package-local `.wasm` を同期 read                    | `initSync` または同等の同期 local instantiation。`require()` が完了する前に初期化 | `require()` 後は同期 function           |
| Node branch の unsupported target | node adapter が package-local WASM adapter へ明示的に進める                   | 上記 Node ESM / CJS と同じ                                                        | 初期化後は同期 function                 |

Browser ESM の module import が ESM の module evaluation として非同期になることは許可
する。これは public operation が Promise を返すことを意味しない。`import` の完了後に
呼ぶ 16 function は同期であり、`await wallet.sign(...)` を契約にしない。

同じ `dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm` を使うための Node / Browser host
判定は、default branch が確定した後の asset loading mechanism に限る。host 判定を
native-vs-WASM の backend routing、network probing または operation retry に使わない。

Browser main-thread では async initialization を使用する。同期 instantiation は Node の
local file path または worker 等、該当 host で許可される方式に限定する。wasm-bindgen の
同期 instantiation の `initSync({ module: bytes })` と main-thread 制約は [wasm-bindgen
synchronous instantiation documentation](https://wasm-bindgen.github.io/wasm-bindgen/examples/synchronous-instantiation.html)
および [wasm-bindgen deployment documentation](https://wasm-bindgen.github.io/wasm-bindgen/reference/deployment.html)
を根拠とする。

### 14.3 Initialization failure

次は全て `BackendInitializationError` とし、Core の `InvalidStore`、`CryptoFailure`、
`BindingFailure`、native operation error または WASM retry に置き換えない。

- package-local `.wasm`、glue または adapter の missing / unreadable
- ESM async instantiate、Node sync instantiate または CJS require-time initialize の failure
- WASM module の validation、ABI、generated export または initialization mismatch
- same-package single asset invariant を満たさない package assembly

Browser ESM では import Promise が generic な initialization error で reject され、
Node CJS では `require()` が同期 throw される場合がある。いずれも error の consumer-visible
name / message は §8.3 と同じであり、秘密情報や raw loader detail を含めない。

## 15. Browser baseline

Browser support baseline は次の通りとする。

- modern evergreen の current / previous major
- WebAssembly と ESM
- package-local asset
- Manifest V3 extension compatibility
- remote code なし
- worker は optional。worker を使う場合も同じ single WASM binary を使う

Stage 7 は Application の storage、service worker lifecycle、page/background routing を
定義しない。これらは facade package の責務ではない。

## 16. Package contents と install contract

### 16.1 Allowlist

consumer package に含めるものは次の allowlist とする。

```text
package.json
README.md
LICENSE
dist/index.d.ts
dist/node/index.mjs
dist/node/index.cjs
dist/wasm/index.mjs
dist/wasm/index.cjs
dist/wasm/<one canonical .wasm>
dist/wasm/<generated glue required by adapters>
dist/native/artifact-manifest.json
dist/native/<declared target>/<supplied .node artifact>
```

`dist/wasm` の generated glue は adapter が必要とする内部 asset に限る。`dist/native` の
`.node` は manifest に実在 entry がある artifact だけを含める。

次は package に含めない。

```text
Rust source
test source
fixtures
Cargo target
private keys
Mnemonic fixtures
passwords
local cache
raw C ABI artifact
development config
```

### 16.2 Install contract

package は同梱 artifact だけで成立し、次を持たない。

```text
postinstall
install-time native compile
install-time binary download
install-time WASM download
node-gyp
cargo execution
```

`package.json` の `files` は少なくとも `dist`、`README.md`、`LICENSE` を assembly に含める
が、最終 tarball の過不足は Stage 9 npm pack review で確認する。npm registry に publish
済みであるとは本書で主張しない。

## 17. Node-API compatibility detail

Stage 6 Node-API Binding が SharedArrayBuffer を Rust slice 生成前に拒否するために使う
`napi-rs compat-mode` / `JsTypedArray` は Node Binding 内部 implementation detail である。
これは npm facade の public declaration、`Uint8Array` contract、runtime export、error
contract または WASM adapter へ露出しない。Stage 7 で別の箇所へ compat-mode dependency を
拡散しない。

## 18. README 追加予定内容

Stage 7 実装後の README には、少なくとも次を追加する。

- npm package name `@nemnesia/symbol-nem-wallet-core`
- Node / Browser 共通の root import
- 16 named functions
- Node native preferred
- Browser WASM
- `node --no-addons` は WASM
- unsupported native target は WASM
- backend を直接選択する public API はない
- raw native / WASM backend は非公開

README に registry publish 済み、release 完了または Stage 9 の全 target build 済みとは
記載しない。README の変更自体は本 Stage 7A の scope 外である。

## 19. Unresolved decisions / blocked status

### 19.1 NEEDS USER DECISION

なし。既存の承認済み decision、Core/Node/WASM の現行 surface および package routing から、
本書の public representation、routing、manifest、single-WASM loader boundary を確定できる。

### 19.2 BLOCKED

なし。Browser ESM は module initialization を async、Node ESM / CJS は package-local
同期 initialization とすることで、public operation の synchronous contract と single
WASM binary invariant を同時に満たす形を仕様化できる。実装時に現在の wasm-bindgen
toolchain がこの adapter arrangement を実現できない場合は、実装で別 semantics を導入せず、
その時点で `BLOCKED / facade WASM initialization contract gap` として別途報告する。

## 20. Traceability と Stage 7A acceptance

Stage 7A の仕様書は次を満たすことを acceptance condition とする。

- §5 の declaration が Core 16 operation の function name、argument order、argument type、
  return type、binary、DTO、optional / `null` / `undefined` を固定している。
- §6 の表で Core、Node、WASM の 16 operation を 1 対 1 に追跡できる。
- §4、§5、§7 で Network、Chain、AccountContext、confirmation、approval、export intent、
  authorization の representation と authority boundary を固定している。
- §8 で現行 18 ErrorCode と backend initialization failure を分離している。
- §9〜§11 で conditional exports、public subpath、Node target mapping、Linux libc lookup、
  `linux-x64-gnu` の glibc >= 2.28 minimum runtime baseline、permitted fallback と
  fail-closed rule を固定している。
- §12〜§13 で manifest truth rule、SHA-256 metadata と deferred runtime verification、
  Stage 7 / Stage 9 boundary、および Stage 9 の4 target build / compatibility verification
  責務を固定している。
- §14 で `crates/wasm`、single WASM binary、Browser ESM、Node ESM `--no-addons`、Node CJS
  `--no-addons` および synchronous operation shape を固定している。
- §16〜§18 で package contents、postinstall 禁止、facade non-authority、README planned
  content を固定している。

実装を開始する前に、この仕様と上流の承認済み資料の競合がないことを確認する。Stage 7B
実装、Stage 8 parity、Stage 9 release matrix は本書の acceptance に含めず、今回開始しない。

## 21. References

プロジェクト固有の参照:

- `AGENTS.md`
- `docs/migration/monorepo-npm-distribution-design.md`
- `docs/migration/node-npm-implementation-gate.md`
- `docs/design/architecture.md`
- `docs/design/security.md`
- `docs/design/bindings.md`
- `docs/specifications/specification.md`
- `docs/specifications/wallet-store-format-v1.md`
- `crates/core/src/lib.rs`
- `crates/core/src/types.rs`
- `crates/core/src/error.rs`
- `crates/core/src/store.rs`
- `crates/node/src/lib.rs`
- `crates/node/tests/smoke.js`
- `crates/wasm/src/lib.rs`
- `crates/wasm/tests/unit/wasm.rs`

外部仕様の参照:

- [Node.js Packages: Conditional exports](https://nodejs.org/download/release/v22.17.0/docs/api/packages.html)
- [Node.js Diagnostic report](https://nodejs.org/api/report.html)
- [wasm-bindgen deployment](https://wasm-bindgen.github.io/wasm-bindgen/reference/deployment.html)
- [wasm-bindgen synchronous instantiation](https://wasm-bindgen.github.io/wasm-bindgen/examples/synchronous-instantiation.html)

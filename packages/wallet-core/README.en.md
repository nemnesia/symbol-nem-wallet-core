# @nemnesia/symbol-nem-wallet-core

[日本語](README.md) | [English](README.en.md)

The Japanese version is authoritative if there is any discrepancy.

`@nemnesia/symbol-nem-wallet-core` is the synchronous TypeScript facade for the Symbol / NEM Wallet Core. Node.js and Browser applications import the package root to work with Mnemonics, Profiles, Software Keys, public accounts, and raw signing payloads.

## Install

```bash
npm install @nemnesia/symbol-nem-wallet-core
```

## Requirements and runtime

- Node.js `>=22.0.0`
- Browsers must be modern evergreen environments that support ESM and WebAssembly. Manifest V3 extensions are supported as well.
- The package uses package-local Node-API native artifacts and one canonical WASM artifact.
- There is no `postinstall` build, `node-gyp`, or install-time Cargo execution.
- The package does not download remote artifacts or CDN assets during installation or runtime.

Browser applications use the WASM binary bundled in the package and the package-local asset handled by the bundler. Replacing the WASM asset with a remote URL is not a package contract.

## Import

The package root is the only public ESM entry point.

```ts
import {
  create_empty_store,
  restore_profile,
} from "@nemnesia/symbol-nem-wallet-core";
```

CJS is also a supported conditional export.

```js
const {
  create_empty_store,
  restore_profile,
} = require("@nemnesia/symbol-nem-wallet-core");
```

The backend, raw `.node`, raw `.wasm`, generated binding modules, manifest, and backend selector are not public subpaths. Consumers should import only the package root.

## Quick Start

The following Node.js ESM example restores a Profile from an existing Mnemonic, derives a Symbol Software Key, and obtains its public account. Secrets are not embedded in source code; the example uses environment input.

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

`1` is the top-level `Network` value for mainnet and the `Chain` value for Symbol. Output DTOs use the string values `"mainnet"` and `"symbol"` for `network` and `chain`.

The input `store` is not mutated in place. After every successful mutation, use `result.store` as the complete replacement Store for the next operation. The Application keeps the previous committed Store if persistence of the replacement fails. A failed result does not provide a successful replacement Store.

## Public functions (16)

The package root runtime export contains only these 16 functions. TypeScript `interface`s, `type` aliases, and error declarations are not runtime named exports. All functions are synchronous and do not return `Promise`s.

| Function | Arguments | Return type | Mutation / Read | Purpose |
| --- | --- | --- | --- | --- |
| `create_empty_store` | none | `Uint8Array` | Factory | Create an empty Wallet Store |
| `prepare_generated_profile` | `store`, `password_utf8`, `network` | `PreparedProfileResult` (`ReadResult<PreparedProfile>`) | Read / pending | Prepare a new Mnemonic and Pending Profile; no Profile is committed yet |
| `finalize_generated_profile` | `store`, `pending_profile`, `password_utf8`, `handoff_confirmation` | `ProfileMutationResult` (`MutationResult<ProfileInfo>`) | Mutation | Commit a Pending Profile after confirmed handoff |
| `restore_profile` | `store`, `mnemonic_utf8`, `password_utf8`, `network` | `ProfileMutationResult` (`MutationResult<ProfileInfo>`) | Mutation | Restore a Profile from an existing Mnemonic |
| `list_profiles` | `store` | `ProfileListResult` (`ReadResult<ProfileInfo[]>`) | Read | List the public Profile index |
| `export_mnemonic` | `store`, `request`, `password_utf8` | `MnemonicExportResult` (`ReadResult<MnemonicExport>`) | Read / explicit export | Perform an explicit Mnemonic export when all conditions are satisfied |
| `export_private_key` | `store`, `request`, `password_utf8` | `PrivateKeyExportResult` (`ReadResult<PrivateKeyExport>`) | Read / explicit export | Perform an explicit Software Key private-key export when all conditions are satisfied |
| `list_software_keys` | `store`, `profile_id` | `SoftwareKeyListResult` (`ReadResult<SoftwareKeyListItem[]>`) | Read | List a Profile's public Software Key index |
| `derive_software_key` | `store`, `profile_id`, `password_utf8`, `chain`, `account_index` | `SoftwareKeyMutationResult` (`MutationResult<SoftwareKeyInfo>`) | Mutation | Derive a Key from the Mnemonic for a Chain and account index |
| `import_software_key` | `store`, `profile_id`, `password_utf8`, `chain`, `private_key` | `SoftwareKeyMutationResult` (`MutationResult<SoftwareKeyInfo>`) | Mutation | Import raw private-key bytes for a Chain |
| `generate_software_key` | `store`, `profile_id`, `password_utf8`, `chain` | `SoftwareKeyMutationResult` (`MutationResult<SoftwareKeyInfo>`) | Mutation | Generate a Key in Core for a Chain |
| `get_public_account` | `store`, `profile_id`, `key_id`, `requested_context`, `password_utf8` | `PublicAccountResult` (`ReadResult<PublicAccountInfo>`) | Read | Obtain the public key and address for the fixed Chain / Network |
| `sign` | `store`, `request`, `password_utf8` | `SignatureResult` (`ReadResult<Signature>`) | Read / signing | Sign the raw payload of an explicitly approved request |
| `change_profile_password` | `store`, `profile_id`, `current_password_utf8`, `new_password_utf8` | `UnitMutationResult` (`MutationResult<null>`) | Mutation | Change a Profile password |
| `delete_software_key` | `store`, `profile_id`, `key_id`, `password_utf8` | `UnitMutationResult` (`MutationResult<null>`) | Mutation | Delete a Software Key |
| `delete_profile` | `store`, `profile_id`, `password_utf8` | `UnitMutationResult` (`MutationResult<null>`) | Mutation | Delete a Profile |

Argument names correspond to the public declaration. `ProfileId` and `SoftwareKeyId` are UUID strings, `account_index` is an integer in `0..=2_147_483_647`, and `import_software_key.private_key` is raw 32-byte data, not a textual hex or `0x` string.

## Scalars and main DTOs

### Scalars

| Type | TypeScript representation and meaning |
| --- | --- |
| `Network` | `0 \| 1`. Top-level input: `0 = testnet`, `1 = mainnet` |
| `Chain` | `0 \| 1`. Top-level input: `0 = nem`, `1 = symbol` |
| `NetworkName` | `"testnet" \| "mainnet"`. Output DTO representation |
| `ChainName` | `"nem" \| "symbol"`. Output DTO representation |
| `ProfileId` | `string`. Hyphenated UUID |
| `SoftwareKeyId` | `string`. Hyphenated UUID |
| `AccountIndex` | `number`. Runtime range is `0..=2_147_483_647` |

The numeric `Network` / `Chain` representation is used only by top-level operation arguments. `AccountContext`, `ProfileInfo`, `SoftwareKeyInfo`, `SoftwareKeyListItem`, and `PublicAccountInfo` use the string representation.

### Confirmations, requests, and context

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

All fields are required. The only exception is `ExportTarget.key_id` in the Mnemonic variant, which may be absent or `undefined`, but not `null`. The nested targets in `ExportRequest` specify the same target in all three places.

### Results and public DTOs

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

`DecodeWarning` is `{ code, object_type, object_id, field }`; `object_id` and `field` have type `string | undefined`. Warnings are structured diagnostics without secrets, not log strings. The `value` of a unit mutation is JavaScript `null`.

## Wallet Store and replacement rule

`store` is an opaque Wallet Store blob and `pending_profile` is an opaque Pending Profile blob. Applications must not interpret, edit, normalize, or migrate their CBOR, version, encrypted payload, index, or other internal representation. v1 does not provide Store or Profile version migration.

- `create_empty_store` directly returns a Store `Uint8Array`.
- A read result is `{ value, warnings }`.
- A mutation result is `{ store, value, warnings }`.
- After a successful mutation, `store` is the complete replacement Store to pass to the next operation.
- The input Store is not mutated in place.
- On mutation failure, the input Store and committed state remain unchanged; no successful DTO or replacement Store is returned.

The Application / persistence layer atomically applies only a replacement Store that it has successfully persisted as the current Store. Core and the facade do not use remembered history to determine currentness, reject stale snapshots, or prevent rollback.

## Important operation flows

### Generated Mnemonic handoff

Creating a new Profile takes two operations: `prepare_generated_profile` and `finalize_generated_profile`.

1. `prepare_generated_profile` returns the complete Mnemonic and opaque `pending_profile` in `PreparedProfile`.
2. The Application presents the complete Mnemonic to the intended user.
3. The Application obtains an explicit acknowledgement from the user.
4. The Application calls `finalize_generated_profile` with the same Pending / Store / password and `{ status: "confirmed" }`.

The confirmation is an assertion obtained by the Application from the current user. The Application must not invent the status for convenience or reuse a previous confirmation. If confirmation is unavailable, the Pending value is corrupted or for another Store, password authorization fails, or finalization fails, the Profile does not become successful.

```ts
const prepared = prepare_generated_profile(store, password_utf8, 1);

// Application-side placeholder:
// present the complete mnemonic_utf8 to the intended user and obtain
// an explicit confirmation from the current user.
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

`presentMnemonicToIntendedUser` and `waitForExplicitUserHandoffConfirmation` are Application-side placeholders. Do not call with a fixed `confirmed` status without implementing the confirmation UI. Restoring an existing Mnemonic with `restore_profile` is outside generated handoff.

### Mnemonic / private-key export

Export is an explicit operation separate from normal use. Satisfy these three actors independently:

1. The user requests export for the current operation.
2. The Application presents and confirms the target and obtains confirmation for the current operation.
3. Core succeeds at Profile password authorization for the same operation.

Knowing the password alone is not export authorization. `ExportRequest.target`, `user_request.target`, and `application_confirmation.target` must be the same target, with statuses `"requested"` and `"confirmed"`.

```ts
// Construct these statuses only after obtaining the current user request
// and Application confirmation.
const target = { kind: "mnemonic", profile_id } as const;
const request = {
  target,
  user_request: { target, status: "requested" },
  application_confirmation: { target, status: "confirmed" },
};

const exported = export_mnemonic(store, request, password_utf8);
// exported.value.mnemonic_utf8 is a temporary explicit-export result.
// Do not retain it after its intended use.
```

For a Software Key private key, use `{ kind: "software_key", profile_id, key_id }` as the target and call `export_private_key` under the same conditions. The receiving Application / user is responsible for displaying, storing, using, and disposing of the returned secret copy.

### Signing

`sign` is not a Transaction parser. Core does not interpret, reconstruct, or prefix the payload; it signs the raw bytes supplied by the caller.

Before signing, the Application interprets the Transaction / payload in an upper-layer Transaction layer, presents its contents in a form the user can review, and obtains explicit approval for the current operation. Set the same target, context, and payload that were displayed and approved in `SigningRequest`. Do not recommend or perform blind signing for unknown or unsupported payloads whose contents cannot be reviewed.

```ts
const context = { chain: "symbol", network: "mainnet" } as const;
// Application-side placeholder: obtain current user approval for the
// same raw bytes that were interpreted and displayed.
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

`SigningApproval`, Core password authorization, and compatibility between `AccountContext` and the stored Profile / Software Key are separate conditions. The facade does not complete or convert approval or context.

## Binary data

Every binary type in the public declaration is `Uint8Array`.

| Use | Representation |
| --- | --- |
| Store blob | opaque `Uint8Array` |
| Pending Profile blob | opaque `Uint8Array` |
| Mnemonic | UTF-8 `Uint8Array` |
| Profile password | UTF-8 `Uint8Array` |
| private key | raw 32-byte `Uint8Array` |
| signing payload | uninterpreted raw `Uint8Array` |
| public key | raw 32-byte `Uint8Array` |
| signature | raw 64-byte `Uint8Array` |

At runtime on Node.js, `Buffer` may be accepted as a `Uint8Array`-compatible input, but the canonical public type in the declaration and DTOs is `Uint8Array`. WASM does not assume Buffer. A private key cannot be supplied as a hex string.

Input binary ownership remains with the caller; the facade does not retain it. Returned binary is a new copy owned by the caller. Do not copy Mnemonics, passwords, private keys, decrypted secret material, or signatures into logs, analytics, diagnostics, caches, long-lived state, or unnecessary storage. After handoff, export, or signing is complete, the caller should overwrite sensitive buffers and discard references.

## Node / Browser backend behavior

### Node.js

- When a supported target has a manifest entry, the package-local Node-API native backend is preferred.
- `node --no-addons` uses the package-local WASM backend.
- An unsupported target without a native artifact uses the package-local WASM backend.
- A missing, corrupt, unreadable, digest-mismatched, or initialization-failing native artifact with a manifest entry is `WalletCoreBackendInitializationError`.
- A declared native artifact failure is not silently retried through WASM.

The Linux native target mapping is limited to x64 with recognized glibc `>=2.28`. Other platform / architecture / libc combinations proceed through WASM. The package-local manifest determines which native artifacts a package assembly contains; consumers have no public API to select a backend directly.

### Browser

Browser ESM uses one package-local canonical WASM binary and generated glue. Module initialization may be asynchronous for the host or bundler, but the 16 functions are synchronous after import completes. Browser, Application, and Node execution contexts are not security boundaries that isolate secrets.

Raw `.node`, raw `.wasm`, generated modules, and the manifest are implementation assets, not public package subpaths.

## Security and responsibility boundary

### Application responsibilities

- Choose secure storage and a persistence method for the current Store.
- Atomically persist successful `result.store` values and keep the old Store on failure.
- Implement user confirmation / approval UI for Mnemonic handoff, export, and signing.
- Present payload / transaction contents in an understandable form before signing.
- Manage backup, recovery paths, and host / browser / OS security policy.
- Do not expose Mnemonics, private keys, passwords, or decrypted secret material in logs, analytics, or diagnostics.

### Core responsibilities

- Cryptography, Mnemonic validation, key derivation, private-key protection, and signing.
- Per-operation Profile password authorization.
- Wallet Store / Pending Profile validity, integrity, compatibility, and state changes.
- Compatibility between the Profile Network and Software Key Chain; no implicit `Network` / `Chain` conversion.

### Facade boundary

The facade only mediates type, binary, and error representations. It does not replace cryptography, authentication, authorization, confirmation / approval generation, Transaction interpretation, Store semantics, migration, current-Store selection, or Chain / Network policy. It does not guarantee protection against a compromised Application or Browser host.

Runtime SHA-256 verification of native artifacts is a package / loader-boundary control. The package does not claim provenance, SBOM, Trusted Publishing, or other later release / supply-chain work as Core runtime security features.

## Errors

Core operation failures are normalized as `WalletCoreError` with `name` `"WalletCoreError"` and matching `code` and `message` values from `ErrorCode`. The codes are:

```text
InvalidArgument, InvalidStore, UnsupportedStoreVersion,
UnsupportedProfileSchemaVersion, ProfileNotFound, SoftwareKeyNotFound,
AuthenticationFailed, InvalidMnemonic, InvalidPrivateKey,
DuplicateProfile, DuplicateSoftwareKey, InvalidAccountIndex,
NetworkMismatch, CryptoFailure, RandomSourceFailure,
SerializationFailure, PendingProfileInvalid, BindingFailure
```

Backend loading or WASM initialization failures use the separate `WalletCoreBackendInitializationError`. Errors, warnings, and diagnostics do not contain secrets or internal payloads.

## License

MIT License. See the [Repository](https://github.com/nemnesia/symbol-nem-wallet-core) and [LICENSE](https://github.com/nemnesia/symbol-nem-wallet-core/blob/main/LICENSE).

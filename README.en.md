# symbol-nem-wallet-core

[日本語](README.md) | [English](README.en.md)

The Japanese version is authoritative if there is any discrepancy.

`symbol-nem-wallet-core` is a monorepo containing a Rust Wallet Core for Symbol / NEM secrets, its Native C ABI and WASM bindings, and the Node.js / Browser npm facade. The main distribution path is `@nemnesia/symbol-nem-wallet-core`.

## Project overview

Wallet Core provides per-operation Profile password authorization, Mnemonic and Software Key protection / derivation / signing, and Wallet Store validation and state changes. It does not own persistence, UI, Transaction construction or interpretation, or network communication.

The current scope includes:

- Creating, restoring, listing, and deleting Profiles fixed to Mainnet / Testnet
- Generating, validating, handing off, and explicitly exporting BIP39 English 24-word Mnemonics
- Derived, Imported, and Generated Software Keys for Symbol / NEM
- A Profile-password-protected v1 Wallet Store
- Software Key public keys, addresses, and Chain-specific signatures
- Changing a Profile password

A Profile has one Mnemonic and Network, and its Network is fixed at creation. A Profile itself is not fixed to a Chain; each Software Key is fixed to either Symbol or NEM. A Profile may contain keys for both Chains, but Chain and Network are never implicitly converted.

## Use npm

### Install

```bash
npm install @nemnesia/symbol-nem-wallet-core
```

### Quick Start

The following Node.js ESM example restores a Profile from an existing Mnemonic, derives a Symbol Software Key, and obtains its public account. Secrets are not hardcoded in source; the example uses environment input.

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

`1` is the top-level `Network` value for mainnet and the `Chain` value for Symbol. Output DTOs use `"mainnet"` and `"symbol"` for `network` and `chain`.

The input Store is not mutated in place. After a successful mutation, always use `result.store` as the next current Store and atomically apply only replacements that were persisted successfully. Keep the previous committed Store on failure.

Node.js prefers a package-local native artifact when the target is supported. `node --no-addons` and unsupported targets without a native artifact use package-local WASM. A missing, corrupt, unreadable, or initialization-failing declared native artifact fails closed and is not silently retried through WASM. Browser applications use the package-local canonical WASM and do not download remote assets.

For the detailed 16 functions, types, requests, results, and export / signing flows, see the [npm package README](packages/wallet-core/README.en.md).

## npm public API overview

The package root runtime export contains only these 16 functions. A default export, class, backend-selection API, raw native API, raw WASM API, or internal manifest API is not public.

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

Public binary values are `Uint8Array`. The Store, Pending Profile, Mnemonic, password, private key, payload, and signature are not specified as hex strings. Node.js may accept Buffer as compatible input, but the canonical public type is `Uint8Array`.

### Security-sensitive operations

- A Generated Mnemonic is prepared with `prepare_generated_profile` and finalized with `finalize_generated_profile` only after the Application presents the complete Mnemonic to the intended user and obtains explicit acknowledgement. The Application must not infer, complete, or reuse confirmation status.
- Mnemonic / private-key export requires the target, an explicit user request, Application confirmation, and correct Profile password authorization in the same operation. Knowing the password alone is not enough.
- `sign` signs a raw payload and does not interpret or display Transactions. The Application must present the payload / Transaction contents to the user and obtain explicit approval for the current operation. Do not recommend blind signing for payloads that cannot be reviewed.

## Direct Rust Core use

The Core crate is named `symbol-nem-wallet-core`. The following is a path dependency from another Rust workspace that has checked out this repository.

```toml
[dependencies]
symbol-nem-wallet-core = { path = "../symbol-nem-wallet-core/crates/core" }
```

The Rust API uses opaque `WalletStoreBlob` / `PendingProfileBlob` byte sequences. Read operations return `ReadResult<T>`; state-changing operations return `MutationResult<T>`.

```text
ReadResult<T>     { value, warnings }
MutationResult<T> { store, value, warnings }
```

The input Store is not changed. A successful mutation returns a complete replacement Store; the Application atomically applies a successfully persisted value as the current Store and keeps the previous Store on failure. `warnings` are structured diagnostics without secrets.

Operations that need secrets receive the Profile password on every call. There is no persistent unlocked session, password cache, or password recovery / reset API. Core rejects an empty password, while password-strength policy belongs to the Application.

### Rust restore / derive / public account

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

Environment variables are only an illustrative input path. In a real Application, keep Mnemonic and password retention and copies to the minimum necessary.

### Rust handoff / confirmation

Generated Mnemonic handoff uses the two operations `prepare_generated_profile` and `finalize_generated_profile`. Construct `HandoffConfirmationStatus::Confirmed` only after the Application presents the complete Mnemonic to the user and obtains explicit acknowledgement from the current user. Core does not obtain this confirmation automatically.

```rust
use symbol_nem_wallet_core::{
    create_empty_store, finalize_generated_profile, prepare_generated_profile,
    HandoffConfirmation, HandoffConfirmationStatus, Network,
};

fn obtain_explicit_handoff_confirmation(
    mnemonic_utf8: &[u8],
) -> Result<bool, Box<dyn std::error::Error>> {
    // The Application presents all mnemonic_utf8 to the user and obtains explicit acknowledgement.
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

The confirmation function above is an Application-side placeholder and returns an error by default. Do not create a copy-paste path that passes `Confirmed` without confirmation. Restoring an existing Mnemonic with `restore_profile` is outside generated handoff.

### Symbol / NEM and Mainnet / Testnet

- `Network::Mainnet` / `Network::Testnet` are fixed to a Profile.
- `Chain::Symbol` / `Chain::Nem` are fixed to a Software Key.
- `AccountContext` makes the fixed Chain / Network combination explicit.
- `get_public_account` and `sign` fail with `NetworkMismatch` when the context does not match the stored values. There is no fallback or implicit conversion to another Chain / Network.

Symbol and NEM are not treated as one scheme for HD derivation, public keys, addresses, or signatures. Core `sign` does not add a prefix, generation hash, or Transaction interpretation to a raw payload. Transaction construction, interpretation, and serialization belong to an upper layer.

## Native C ABI

The Native C ABI is not the npm public API. It is the native integration package `symbol-nem-wallet-core-native` and the [public header](crates/c-abi/include/symbol_nem_wallet_core.h). It is not the same artifact as the Node-API `.node` artifact. This README does not imply an unimplemented GitHub Release distribution.

```bash
cargo build --package symbol-nem-wallet-core-native --release --locked
```

From the repository root, artifacts are placed under `target/release/`. Library filenames and extensions depend on the target and toolchain. The following is a minimal Linux static-library example.

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

`SnwcBytes` is caller-owned borrowed input and `SnwcOwnedBytes` is Binding-owned output. Release output with `snwc_free_bytes`, Profile arrays with `snwc_free_profiles`, Software Key arrays with `snwc_free_software_key_list`, and warning arrays with `snwc_free_warnings`. Error strings are Binding-owned static strings and must not be freed. The C ABI initializes output to a failure-safe empty state and does not return partial results on failure.

## WASM position

`crates/wasm` is the internal WASM binding / artifact source embedded in the npm facade. Raw `wasm-bindgen` generated modules, raw `.wasm`, and generated glue are not consumer-facing entry points or public npm subpaths. Node.js and Browser consumers should use the npm package root.

WASM, Native C ABI, and Node-API do not duplicate Rust Core cryptography, password authorization, Store semantics, confirmation / approval, or Chain / Network policy.

## Security / sensitive data handling

Do not output or copy Mnemonics, private keys, Profile passwords, seeds, decrypted secret material, signatures, Store internals, or payload contents into logs, analytics, exceptions, Debug output, warnings, diagnostics, or unnecessary caches / storage.

| Component | Responsibility |
| --- | --- |
| Rust Core | Cryptography, password authorization, Mnemonic validation, key derivation, Store validity, Chain / Network compatibility, and signing |
| Native / Node / WASM bindings | Mediate types, bytes, errors, warnings, and ownership between Core and the host without changing security meaning |
| Application / UI | Secure storage, current-Store persistence, backup, user-confirmation UI, signing display, and Transaction interpretation |

Temporarily receiving a secret copy for explicit handoff or export does not transfer continuing ownership of the original held by Core. Protection against a compromised Browser or host process is outside the Core / Binding guarantee boundary.

The project does not describe provenance, SBOM, runtime digest verification, Trusted Publishing, or other later release / supply-chain work as completed runtime security features.

## Out of scope

- Transaction construction, serialization, semantic interpretation, display UI, and signing-approval UI
- REST / WebSocket / announce, node selection, and explorers
- Hardware Wallet, External Signer, OS Keychain / Secure Enclave / TPM
- Wallet Store persistence selection, synchronization, backup UI, and version migration

## Development documentation

Design, specification, and review materials are available under [`docs/`](docs/). They are primarily for implementers, contributors, and reviewers.

## Development / validation

README-only changes do not automatically require implementation tests. For implementation changes, use the relevant entry points:

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
```

The npm package assembly and package-local validation entry points are:

```bash
pnpm build:npm
pnpm test:npm
```

The exact Native / WASM / release validation scope follows the scripts and CI configuration at that time. This README does not describe unexecuted validation as successful.

## License

MIT License. See [`LICENSE`](LICENSE).

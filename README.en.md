# symbol-nem-wallet-core

[日本語](README.md) | [English](README.en.md)

The Japanese version is authoritative if there is any discrepancy.

`symbol-nem-wallet-core` is a monorepo containing a Rust Wallet Core for Symbol / NEM secrets, its Native C ABI and WASM bindings, and the Node.js / Browser / React Native npm facade. The main distribution path is `@nemnesia/symbol-nem-wallet-core`.

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

### Choose your runtime first

| Runtime | First step |
| --- | --- |
| Node.js 22+ | Import the package root and use it directly |
| Browser | Import the package root; package-local WASM is used |
| React Native 0.87.x | Connect the native provider and lifecycle after npm install, then follow [React Native integration](packages/wallet-core/README.en.md#react-native-integration) |

React Native does not work from `npm install` alone. Bare React Native `0.87.x` is the currently validated line in this repository.

### 30-second smoke test

With Node.js ESM, verify package initialization without any secret input.

```ts
import { create_empty_store, list_profiles } from "@nemnesia/symbol-nem-wallet-core";

const store = create_empty_store();
console.log(list_profiles(store).value); // []
```

### What to do next

- **Create a new Wallet**: `prepare_generated_profile` → Mnemonic handoff → `finalize_generated_profile` → Software Key → address. See [Create a new Wallet](packages/wallet-core/README.en.md#create-a-new-wallet).
- **Restore an existing Wallet**: `restore_profile` → Software Key → address. See [Restore an existing Wallet](packages/wallet-core/README.en.md#restore-an-existing-wallet).
- **Sign**: the Application displays the transaction / payload and obtains approval before calling `sign`. See [Signing](packages/wallet-core/README.en.md#signing).
- **Use React Native**: Android / iOS require native setup. See [React Native integration](packages/wallet-core/README.en.md#react-native-integration).

After every successful mutation, use `result.store` as the next Store. Atomically persist only successful replacement Stores and retain the previous committed Store on failure.

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

The Native C ABI is not the npm public API. It is the native integration package `symbol-nem-wallet-core-native` and the [public header](crates/c-abi/include/symbol_nem_wallet_core.h). It is a different artifact from the Node-API `.node` artifact. Formal releases retain the archives and evidence for the four supported desktop targets as GitHub Release assets, separately from the npm package. Standalone Android / iOS C ABI artifact publication remains delegated to the MosaicLynx integration; React Native reuses the existing C ABI contract through a private adapter inside the npm package.

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

For a supported native target, the Node loader compares the package-local manifest SHA-256 with the exact artifact bytes before loading. A digest mismatch, unreadable artifact, load failure, or initialization failure is fail-closed as `WalletCoreBackendInitializationError` and is not converted into a WASM fallback or a Core operation error. This is a package / loader-boundary control, not a replacement for Core cryptography or authorization. Provenance, SBOM, and Trusted Publishing are release / supply-chain evidence rather than Core runtime security features. Formal npm publishing is limited to GitHub Actions using OIDC and the required npm provenance path.

## Out of scope

- Transaction construction, serialization, semantic interpretation, display UI, and signing-approval UI
- REST / WebSocket / announce, node selection, and explorers
- Hardware Wallet, External Signer, OS Keychain / Secure Enclave / TPM
- Wallet Store persistence selection, synchronization, backup UI, and version migration

## Development documentation

Design, specification, and review materials are available under [`docs/`](docs/). They are primarily for implementers, contributors, and reviewers.

## Development / validation

### Running CI locally

On Ubuntu 24.04, run the same verification scripts used by GitHub Actions through these entry points. Node.js and Android Java versions are recorded in [`.node-version`](.node-version) and [`.java-version`](.java-version); the root `package.json` `packageManager` field pins pnpm.

```bash
./scripts/ci/local-ci.sh quick
./scripts/ci/local-ci.sh full
```

`quick` runs Rust formatting / Clippy / tests, deterministic Node checks, package assembly from WASM, and the React Native consumer's `npm ci`, ESLint, TypeScript, Jest test discovery, and dependency resolution checks. `full` adds WASM, Native C ABI, sanitizers, the glibc 2.28 Docker builds, workspace installation, npm package build → `npm pack` → clean tarball consumer, and `cargo audit`. `quick` needs Node.js 24, npm, the Rust `wasm32-unknown-unknown` target, and the `wasm-bindgen` CLI matching Cargo.lock. `full` additionally needs Docker, `wasm-pack`, a C compiler, and `cargo-audit`.

Coverage, browser bundlers, Wallet Store fuzzing, and the Android Gradle build have separate commands:

```bash
./scripts/ci/local-ci.sh coverage
./scripts/ci/local-ci.sh browser
./scripts/ci/local-ci.sh fuzz
./scripts/ci/local-ci.sh android
```

The browser check needs Chrome / Chromium; fuzzing needs nightly Rust and `cargo-fuzz`; Android needs Java 17 and a configured Android SDK / NDK. Quick checks Jest configuration and test discovery. The only Jest App test requires the native TurboModule provider, so the app itself runs in the Android emulator / iOS simulator. iOS, macOS, and Windows native builds / simulators, GitHub Dependency Review, artifact handoff, CodeQL upload, release, and npm publishing require GitHub or their platform runner. See [`docs/development/local-ci.md`](docs/development/local-ci.md) for the workflow inventory and remaining parity gaps.

README-only changes do not automatically require implementation tests. For implementation changes, use the relevant entry points:

On Ubuntu 24.04, run the shared local / CI checks with Python 3, a C/C++ compiler
(`build-essential`), and Rust stable with rustfmt and Clippy. CI uses the current
stable toolchain; update your local stable toolchain to match it.

```bash
rustup update stable
rustup default stable
rustup component add rustfmt clippy
bash scripts/check-local.sh rust
```

The default `rust` group checks invisible characters, formatting, Clippy, the
independent fuzz lockfile and target, and workspace tests. Cargo dependency
resolution uses `--locked`: inconsistencies fail instead of being repaired.
The script prints each command and stops on the first failure.

| Argument | Checks |
| --- | --- |
| `rust` (default) | Rust checks, including the locked fuzz target build |
| `wasm` | wasm-bindgen version agreement, WASM tests on Node, WASM target check |
| `native` | C ABI release build, public header compilation, runtime test |
| `native-sanitizers` | C ABI runtime test with ASan / UBSan |
| `dependencies` | Locked pnpm workspace and React Native consumer installs, without install scripts |
| `all` | All groups above |

For WASM and dependency checks, provide Node.js 24, Corepack and npm, then install
the additional tools. The wasm-bindgen CLI version comes from the root Cargo.lock.

```bash
rustup target add wasm32-unknown-unknown
bash scripts/ci/install-wasm-tools.sh all
bash scripts/check-local.sh all
```

`all` covers these Linux checks. Coverage gates, npm artifact assembly and consumer
tests, Windows/macOS and Android/iOS matrices, and release evidence remain separate
CI checks. Select groups relevant to your changes. Initial dependency downloads
require network access.

The npm package assembly and package-local validation entry points are:

```bash
pnpm build:npm
pnpm test:npm
```

The exact Native / WASM / release validation scope follows the scripts and CI configuration at that time. This README does not describe unexecuted validation as successful.

## License

MIT License. See [`LICENSE`](LICENSE).

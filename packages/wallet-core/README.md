# @nemnesia/symbol-nem-wallet-core

`@nemnesia/symbol-nem-wallet-core` is the synchronous TypeScript facade for the
shared Rust Symbol / NEM Wallet Core. The package exposes one root entry point
for Node.js and Browser applications.

```ts
import { create_empty_store, list_profiles } from "@nemnesia/symbol-nem-wallet-core";

const store = create_empty_store();
const profiles = list_profiles(store);
```

The root runtime export contains these 16 functions only:

`create_empty_store`, `prepare_generated_profile`, `finalize_generated_profile`,
`restore_profile`, `list_profiles`, `export_mnemonic`, `export_private_key`,
`list_software_keys`, `derive_software_key`, `import_software_key`,
`generate_software_key`, `get_public_account`, `sign`,
`change_profile_password`, `delete_software_key`, and `delete_profile`.

Node.js prefers the bundled Node-API native addon when the current platform,
architecture and recognized libc have a manifest entry. `node --no-addons` and
unsupported native targets use the bundled WASM implementation. A declared
native artifact that cannot be loaded is a backend initialization failure and
does not silently retry through WASM.

Browser ESM uses the same package-local WASM binary and generated glue. No
remote download, CDN, postinstall build, `node-gyp`, or Cargo execution is
required at install time. The backend, raw `.node` file, raw WASM module,
generated binding module, manifest, and backend-selection API are not public
package subpaths; consumers import the package root only.

All binary values in the declaration are `Uint8Array`. Node input accepts
`Buffer` because it is a `Uint8Array`-compatible input, but Buffer is not part
of the public DTO. Store and pending profile values are opaque and must be
replaced only with a successful mutation result. The facade does not implement
cryptography, password authorization, export intent, signing approval,
transaction interpretation, Chain / Network policy, or Store semantics.

Mnemonic, password, private key, and signature buffers are sensitive. Do not
log, cache, persist, or place them in diagnostics. The caller owns returned
copies and should overwrite sensitive buffers and discard references as soon as
their intended handoff or export is complete.

The exact declarations and operation semantics are specified in
[`docs/specifications/npm-typescript-facade.md`](https://github.com/nemnesia/symbol-nem-wallet-core/blob/main/docs/specifications/npm-typescript-facade.md).

# Supply-chain finalization / release evidence

This document records the finalization boundary for the npm and C ABI release
evidence. It does not change Core, runtime, public API, artifact semantics,
`release-manifest.json` schema v1, or `c-abi-release-manifest.json` schema v1.

## Checked-in third-party license evidence

The source-of-truth index is
`third-party-license-evidence/manifest.json`. The exact upstream license text
is checked in below that directory so formal release validation does not depend
on a live registry or GitHub request.

The manifest records the component name/version, SPDX license, Cargo source,
upstream repository, tag, dereferenced commit, upstream file path, Git blob
SHA-1, checked-in path, and collected text SHA-256. The collection code is
[`scripts/third-party-license-evidence.mjs`](../../scripts/third-party-license-evidence.mjs).

| component | upstream tag / commit | upstream blob SHA-1 | collected text SHA-256 |
| --- | --- | --- | --- |
| `bitcoin_hashes@0.14.101` | `bitcoin_hashes-0.14.101` / `a010f1e9fd7752ee5e7ca60a909d32a58e0d3297` | `6ca207ef004cb69d03041e7e5c288a2be4968045` | `7179683e8000e6bdc9bbc60d85edf0a4ac8e76f951857f54fcb775d5886f1309` |
| `napi@3.12.2` | `napi-v3.12.2` / `444bf29b8534216dd1cec4695a71e5996a173e87` | `7fe7e35eff46457f65a4e30a717fada632de9e03` | `3f1ce66533302df3a32edbfdfc0b78f0dd34659e4c1f5817162e5ea3c2297215` |
| `napi-sys@3.3.0` | `napi-sys-v3.3.0` / `679eb79f5cf3c7c6b2850f4ab46092126f23dc5c` | `7fe7e35eff46457f65a4e30a717fada632de9e03` | same as `napi` |
| `napi-derive@3.6.3` | `napi-derive-v3.6.3` / `956e4525fea6a676ea3680b711382f167b899af9` | `7fe7e35eff46457f65a4e30a717fada632de9e03` | same as `napi` |
| `napi-derive-backend@6.1.2` | `napi-derive-backend-v6.1.2` / `956e4525fea6a676ea3680b711382f167b899af9` | `7fe7e35eff46457f65a4e30a717fada632de9e03` | same as `napi` |

The upstream sources are `rust-bitcoin/rust-bitcoin` and
`napi-rs/napi-rs`; the checked-in texts are exact upstream `LICENSE` bytes,
not generated or summarized text. The legal obligation determination remains
outside this implementation.

The npm and C ABI runtime closure is regenerated from the current target
metadata. The previous five npm-side observations and the C ABI
`bitcoin_hashes` observation are now collected from checked-in evidence;
formal output must still fail closed if any future component is missing or has
conflicting evidence.

## Reproducibility policy

The v1 gate is **source / toolchain / evidence reproducible**. A unified record
binds the source commit, Cargo.lock and pnpm-lock identities, toolchain
identities, target, workflow, build evidence, artifact SHA-256, SBOM, license
inventory, and release manifests.

Bit-for-bit reproducibility is not a v1 requirement. An artifact is not called
bit-for-bit reproducible unless that separate verification has actually been
performed.

## Unified release record

[`scripts/release-record.mjs`](../../scripts/release-record.mjs) generates and
validates `release-record.json` schema v1 plus
`RELEASE-RECORD-SHA256`. The record references the existing npm and C ABI
manifests and evidence by filename and SHA-256; it does not replace or amend
either manifest schema.

The formal pre-publish record uses
`provenance.status = required-at-publish`. This records the required boundary
without fabricating an npm attestation. After npm publication, the workflow
captures the registry's actual attestation response, verifies it with
`npm audit signatures --json --include-attestations`, binds the provenance
identity to the exact package/version/tag/source/workflow, and finalizes
`release-operation.json`. Published mode then requires both
`release-operation.json` and the identity-bound `npm-provenance.json`.

## Durable GitHub Release asset set

GitHub Release is the long-term release evidence record. GitHub Actions
artifacts are only temporary build, validation, and handoff storage.

The exact npm asset names are:

```text
<npm tarball from release-manifest.json>
SHA256SUMS
release-manifest.json
release-source.json
native-summary.json
win32-x64-msvc.node
darwin-x64.node
darwin-arm64.node
linux-x64-gnu.node
win32-x64-msvc.json
darwin-x64.json
darwin-arm64.json
linux-x64-gnu.json
wasm-summary.json
wasm-evidence.json
wasm-bindgen-version.json
sbom.spdx.json
license-inventory.json
SBOM-SHA256SUMS
license-policy.json
THIRD_PARTY_LICENSES.json
LICENSE-POLICY-SHA256SUMS
release-operation.json              # after actual npm publish
npm-provenance.json                 # after actual npm publish
```

The exact C ABI asset names are the 16 files emitted by
`c-abi-release.mjs aggregate`: four target archives, four per-target evidence
files, `c-abi-release-manifest.json`, `C-ABI-SHA256SUMS`, the C ABI SBOM and
inventory plus checksum file, and the C ABI policy and third-party evidence
plus checksum file.

The shared durable release record is attached separately as:

```text
release-record.json
RELEASE-RECORD-SHA256
```

The publication assembler derives the final count from these manifest-backed
lists. For the current v1 contract this is 24 npm assets, 16 C ABI assets, and
2 shared record files, for 42 assets total; the workflow does not use a
standalone hard-coded count as its gate.

All npm and C ABI records must contain the same version, formal tag, and source
commit. The record separately states `npm provenance required` and
`C ABI no additional artifact signing in v1`.

## Rehearsal and publication boundary

Formal release workflow order is:

1. validate the tag/source/version identity and both release evidence bundles;
2. generate and validate the pre-publish unified release record;
3. enter the protected `release` Environment;
4. publish the npm tarball only with `npm publish --provenance --access public`;
5. collect the actual npm provenance and operation evidence;
6. produce the published release record;
7. assemble the mechanically derived exact asset set and create or resume the
   same-tag GitHub Release;
8. download and verify every durable GitHub Release asset against local
   SHA-256 and the published release metadata.

The `publish` job performs the protected npm operation with
`contents: read` and `id-token: write`. A separate `publication` job alone has
`contents: write` and is responsible for creating/resuming the GitHub Release
and uploading the durable asset set. `packages: write`, `actions: write`, and
long-lived npm tokens are not used.

The v1 signing policy is npm provenance only. No cosign, Sigstore, GPG, custom
PKI, private signing key, custom attestation protocol, or C ABI artifact
signature is introduced.

## External configuration and deferred scope

The repository administrator must still explicitly create GitHub Environment
`release`, add one required reviewer, configure approved deployment branch/tag
protection, and configure npm Trusted Publishing/OIDC. The npm configuration
uses workflow filename `release.yml`; the repository path is
`.github/workflows/release.yml`, and the full path must not be entered into
the npm field.

Android / iOS C ABI release: `DEFERRED — MosaicLynx integration`

The repository CHANGELOG is finalized for the `0.1.0` release candidate. The
actual tag, npm publication, and GitHub Release remain a separate user-approved
production operation.

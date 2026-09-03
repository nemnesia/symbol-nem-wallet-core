# C ABI GitHub Release asset preparation

This document records the C ABI release-asset boundary. It is independent of
the npm package assembly and does not change `release-manifest.json` schema v1,
the npm provenance path, or the C ABI runtime/API.

## Fixed v1 target matrix

The preparation workflow uses native runners for exactly these four targets:

| target id | Rust target | runner | static library | dynamic library | companion |
| --- | --- | --- | --- | --- | --- |
| `win32-x64-msvc` | `x86_64-pc-windows-msvc` | `windows-2025-vs2026` | `symbol_nem_wallet_core_native.lib` | `symbol_nem_wallet_core_native.dll` | `symbol_nem_wallet_core_native.dll.lib` |
| `darwin-x64` | `x86_64-apple-darwin` | `macos-15-intel` | `libsymbol_nem_wallet_core_native.a` | `libsymbol_nem_wallet_core_native.dylib` | none |
| `darwin-arm64` | `aarch64-apple-darwin` | `macos-15` | `libsymbol_nem_wallet_core_native.a` | `libsymbol_nem_wallet_core_native.dylib` | none |
| `linux-x64-gnu` | `x86_64-unknown-linux-gnu` | `ubuntu-24.04` plus `manylinux_2_28_x86_64` build environment | `libsymbol_nem_wallet_core_native.a` | `libsymbol_nem_wallet_core_native.so` | none |

Linux dynamic-library evidence rejects any required `GLIBC_<version>` newer
than `2.28`. The compatibility image is therefore part of the release build
boundary, rather than an informal runner preference.

```text
Android / iOS C ABI release: DEFERRED — MosaicLynx integration
```

This deferral does not declare mobile targets permanently unsupported. Android
ABI/NDK/minSdk and iOS minimum-version/simulator/XCFramework/package choices
are intentionally not specified here.

## Archive contract

Every target produces one deterministic gzip-compressed POSIX tar archive:

```text
symbol-nem-wallet-core-c-abi-<version>-<target-id>.tar.gz
```

The archive has no top-level wrapper directory and contains exactly:

```text
include/symbol_nem_wallet_core.h
lib/static/<static library>
lib/dynamic/<dynamic library and required companion>
LICENSE
metadata/c-abi-artifact.json
```

The header is copied byte-for-byte from
`crates/c-abi/include/symbol_nem_wallet_core.h` for every target. Rust `rlib`,
debug-symbol files, and Node-API `.node` files are rejected. The Windows import
library is required in `lib/dynamic/`; no platform companion is silently
omitted.

The archive writer fixes entry order, paths, ownership, mode, and timestamps.
`metadata/c-abi-artifact.json` records the archive filename but not its own
archive digest: including that digest inside the archive would be
self-referential. The external target evidence records and verifies the
archive SHA-256.

## Evidence and aggregate asset set

Each target emits `c-abi-artifact.json`, containing the source commit, formal
tag when applicable, Cargo/npm/manifest version identity, Rust triple, runner,
toolchain, Cargo.lock digest, header/library/companion digests, archive digest,
release build mode, and Linux glibc evidence. No absolute or runner-temporary
path is included.

The aggregate job requires all four targets exactly once and emits this
GitHub-Release-ready set:

```text
symbol-nem-wallet-core-c-abi-<version>-win32-x64-msvc.tar.gz
symbol-nem-wallet-core-c-abi-<version>-darwin-x64.tar.gz
symbol-nem-wallet-core-c-abi-<version>-darwin-arm64.tar.gz
symbol-nem-wallet-core-c-abi-<version>-linux-x64-gnu.tar.gz
c-abi-artifact-win32-x64-msvc.json
c-abi-artifact-darwin-x64.json
c-abi-artifact-darwin-arm64.json
c-abi-artifact-linux-x64-gnu.json
c-abi-release-manifest.json
C-ABI-SHA256SUMS
c-abi-sbom.spdx.json
c-abi-license-inventory.json
C-ABI-SBOM-SHA256SUMS
c-abi-license-policy.json
c-abi-third-party-licenses.json
C-ABI-LICENSE-POLICY-SHA256SUMS
```

`c-abi-release-manifest.json` is a separate schema-version-1 C ABI manifest;
it does not extend or replace npm `release-manifest.json`. It links version,
formal tag, source commit, Cargo.lock identity, header identity, each target,
each archive, and each library digest to the independent SBOM/license evidence.
`C-ABI-SHA256SUMS` covers the four archives, per-target evidence, aggregate
manifest, SBOM/inventory/policy/notice artifacts, and their checksum evidence.

## SBOM, license policy, and third-party text

`c-abi-sbom.mjs` invokes target-filtered `cargo metadata` for the four Rust
triples and follows only normal Cargo dependencies. Dev/test dependencies are
not part of the C ABI runtime closure. The SPDX document is SPDX 2.3. The
inventory retains a separate component closure for each target so target
closure differences are observable instead of being flattened away.

The C ABI policy artifact applies the Phase 4B allowlist and handling without
changing the npm Phase 4B artifacts. New/unapproved licenses, reciprocal
licenses, unapproved exceptions, malformed metadata, and missing declared
metadata remain fail-closed according to that policy. Missing third-party text
is recorded as an observation separate from allowability. Upstream text is
never guessed or generated.

The final formal command includes:

```text
node scripts/c-abi-sbom.mjs validate --require-third-party-license-text ...
```

That flag fails closed when required upstream text evidence is incomplete. It
does not make a legal determination; legal necessity or an unresolvable
upstream-text observation remains `NEEDS USER DECISION`.

## Consumer validation

On each native runner the workflow extracts the archive and verifies:

1. public-header syntax compilation;
2. static library link and representative C ABI runtime smoke;
3. dynamic library link/load and representative C ABI runtime smoke.

The archive parser rejects absolute paths, `..` traversal, duplicate entries,
links, extra entries, digest mismatches, and malformed gzip/tar termination.

## Release identity and publication boundary

The aggregate gate uses the same source version set as the npm release path:
git tag, Cargo workspace/C ABI crate, npm package, and evidence all use one
version. Formal mode requires `main`, an exact `v<SemVer>` tag, the tag target
to equal the checked-out source commit, and the existing release identity
evidence. Candidate mode produces no formal tag claim.

The workflow only builds, validates, and uploads a workflow artifact named
`release-c-abi`. It does not create a GitHub Release, upload a GitHub Release
asset, create a production tag, publish to npm, configure the `release`
Environment, configure npm Trusted Publishing, publish a C ABI ABI/provenance
attestation, or finalize CHANGELOG. A later Final Release operation can pass
the exact validated `release-c-abi` asset set to the GitHub Release upload
boundary. Any future GitHub Release write permission must be limited to that
future publication job; the preparation workflow has only `contents: read`.

## User-side configuration

The already approved npm release boundary remains unchanged: Environment name
`release`, one required reviewer, main-only formal release, and npm Trusted
Publishing/OIDC with `npm publish --provenance --access public`. No long-lived
npm token or additional secret is introduced here.

Before enabling a formal release workflow, and at minimum before the first
`v<SemVer>` tag push, the repository administrator must:

1. explicitly create GitHub Environment `release`;
2. configure one required reviewer;
3. configure deployment branch/tag protection according to the approved
   release policy;
4. confirm that configuration before enabling npm Trusted Publisher; and
5. create a production release tag only after those checks.

The Environment must not be allowed to be implicitly bootstrapped by workflow
execution without protection rules.

For npm Trusted Publisher, the repository workflow file path is:

```text
.github/workflows/release.yml
```

The npm Trusted Publisher **workflow filename value is only**:

```text
release.yml
```

The full repository path must not be entered in the npm configuration field.
The repository is `nemnesia/symbol-nem-wallet-core`; no fork or alternate
repository is accepted by the npm package metadata gate.

External GitHub Environment, npm Trusted Publisher, and final GitHub Release
asset configuration are user-side actions and were not performed by this
implementation.

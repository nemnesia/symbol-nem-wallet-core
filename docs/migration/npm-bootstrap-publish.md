# npm bootstrap publish operation

This operation creates the npm package namespace for `@nemnesia/symbol-nem-wallet-core` so that npm Trusted Publishing can be configured. The bootstrap package is not a production release.

Bootstrap identity:

```text
name: @nemnesia/symbol-nem-wallet-core
version: 0.0.0-bootstrap.0
dist-tag: bootstrap
```

The bootstrap package contains only `package.json` and `README.md`. It contains no wallet-core runtime, Node-API addon, WASM, C ABI, native artifact, dependency, lifecycle script, install script, postinstall step, or production entry point.

## Step 1: final local validation

From the repository root, run the deterministic fail-closed validation:

```bash
node scripts/test-npm-bootstrap.mjs
```

Then inspect the npm pack output directly:

```bash
cd tools/npm-bootstrap
npm pack --dry-run
```

The packed file allowlist is exactly:

```text
package/package.json
package/README.md
```

If any wallet-core runtime or compiled artifact appears, stop the operation.

## Step 2: user npm account checks

The user confirms npm authentication and the account's required 2FA settings before publishing. No npm token is stored in this repository.

## Step 3: manual bootstrap publish

The user runs this command manually from `tools/npm-bootstrap`:

```bash
npm publish --access public --tag bootstrap
```

Codex must not execute this command. This command is documented for the user operation only.

Do not use the `latest` dist-tag for the bootstrap package.

## Step 4: verify the npm registry state

After the manual publish, the user verifies that:

- the package exists;
- version `0.0.0-bootstrap.0` exists;
- the `bootstrap` dist-tag points to `0.0.0-bootstrap.0`; and
- `latest` does not point to the bootstrap version.

## Step 5: configure npm Trusted Publishing

In the npm package Trusted Publisher settings, enter:

```text
provider: GitHub Actions
organization/user: nemnesia
repository: symbol-nem-wallet-core
workflow filename: release.yml
environment: release
```

The repository path is `.github/workflows/release.yml`. The npm setting is only `release.yml`; do not enter the repository path as the workflow filename.

The existing GitHub Environment `release` and the existing release workflow are the production path. Do not add an npm token, GitHub secret, or alternate publish path.

## Step 6: end of bootstrap operation

After Trusted Publisher configuration is confirmed, the bootstrap operation is complete. Do not create a Git tag or GitHub Release for the bootstrap package, and do not record it as a formal changelog release.

The release history is:

```text
0.0.0-bootstrap.0  -> bootstrap dist-tag only
0.1.0              -> first production release / latest
```

The formal `0.1.0` package is published later only by the existing release workflow with npm Trusted Publishing, OIDC, and provenance.

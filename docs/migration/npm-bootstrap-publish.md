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

The publish command requests the `bootstrap` dist-tag. On an initial namespace bootstrap,
the registry may also retain `latest` at the bootstrap version. This is an allowed
pre-production state; do not make removal of `latest` part of this operation.

## Step 4: verify the npm registry state

After the manual publish, the user verifies that:

- the package exists;
- version `0.0.0-bootstrap.0` exists;
- the `bootstrap` dist-tag points to `0.0.0-bootstrap.0`; and
- the following state is accepted for the initial namespace bootstrap:

```text
bootstrap: 0.0.0-bootstrap.0
latest: 0.0.0-bootstrap.0
```

This is temporary bootstrap state. Do not unpublish or republish the bootstrap version,
and do not retry deleting `latest` as an operation requirement.

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
0.0.0-bootstrap.0  -> bootstrap dist-tag; latest may temporarily point here
0.1.0              -> first production release / latest
```

The formal `0.1.0` package is published later only by the existing release workflow with npm Trusted Publishing, OIDC, and provenance.

## Step 7: post-release verification

After the existing release workflow publishes the formal `0.1.0` package, verify the
registry state:

```bash
npm dist-tag ls @nemnesia/symbol-nem-wallet-core
```

The expected state after the formal release is:

```text
bootstrap: 0.0.0-bootstrap.0
latest: 0.1.0
```

The formal publish must use only the existing GitHub Actions / Trusted Publishing / OIDC /
provenance path. Do not manually publish `0.1.0`, change the production package version,
change release workflow semantics, or create a production tag as part of this bootstrap
operation.

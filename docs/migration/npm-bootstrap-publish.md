# npm bootstrap publish operation (historical record)

Status: `COMPLETED`

The initial npm namespace bootstrap for `@nemnesia/symbol-nem-wallet-core` is
complete. The bootstrap package was published only to establish package
ownership and configure npm Trusted Publishing; it was not a production
release.

The bootstrap package source was removed from this repository after the
operation completed. It is not retained as a rerunnable package or test.

Bootstrap identity:

```text
name: @nemnesia/symbol-nem-wallet-core
version: 0.0.0-bootstrap.0
dist-tag: bootstrap
```

The historical bootstrap package contained only `package.json` and `README.md`.
Its packed file allowlist was exactly:

```text
package/package.json
package/README.md
```

It contained no wallet-core runtime, Node-API addon, WASM, C ABI, native
artifact, dependency, lifecycle script, install script, postinstall step, or
production entry point.

## Historical bootstrap procedure

The following steps record the completed operation. They are not instructions
to rerun it.

### npm account checks

The user confirmed npm authentication and the account's required 2FA settings
before publishing. No npm token was stored in this repository.

### Bootstrap publish

The user ran this command manually from the then-bootstrap package source:

```bash
npm publish --access public --tag bootstrap
```

This command is retained as historical operation evidence. It must not be
executed again. The command requested the `bootstrap` dist-tag. On the initial
namespace bootstrap, the registry also retained `latest` at the bootstrap
version, which was accepted as the temporary pre-production state.

### Registry state after bootstrap

The completed bootstrap operation established the following registry state:

- the package exists;
- version `0.0.0-bootstrap.0` exists;
- the `bootstrap` dist-tag points to `0.0.0-bootstrap.0`; and
- the following temporary pre-production state is accepted:

```text
bootstrap: 0.0.0-bootstrap.0
latest: 0.0.0-bootstrap.0
```

Do not unpublish, deprecate, republish, or change dist-tags for the bootstrap
version as part of this cleanup or the formal release preparation.

### npm Trusted Publishing configuration

The npm Trusted Publisher was configured with:

```text
provider: GitHub Actions
organization/user: nemnesia
repository: symbol-nem-wallet-core
workflow filename: release.yml
environment: release
```

The repository workflow path is `.github/workflows/release.yml`; the npm
workflow filename setting is only `release.yml`, not the full repository path.

The GitHub Environment `release` and the release workflow are the production
path. No npm token, GitHub secret, or alternate publish path was added.

## Completion boundary

The bootstrap operation became complete after Trusted Publisher configuration
was confirmed. No Git tag or GitHub Release was created for the bootstrap
package, and it is not recorded as a formal changelog release.

The bootstrap package source and its deterministic test were removed from the
repository after completion. The bootstrap registry version remains published
for namespace history.

The release history is:

```text
0.0.0-bootstrap.0  -> bootstrap dist-tag; latest may temporarily point here
0.1.0              -> first production release / latest
```

The formal first production version is `0.1.0` and is published later only by
the GitHub Actions release workflow with npm Trusted Publishing, OIDC, and
provenance.

## Post-release verification

After the release workflow publishes the formal `0.1.0` package, the registry
state must be verified as:

```bash
npm dist-tag ls @nemnesia/symbol-nem-wallet-core
```

The expected state after the formal release is:

```text
bootstrap: 0.0.0-bootstrap.0
latest: 0.1.0
```

The formal publish uses only the GitHub Actions / Trusted Publishing / OIDC /
provenance path. The bootstrap cleanup does not publish `0.1.0`, change the
production package version, change release workflow semantics, or create a
production tag.

# Ubuntu local CI and workflow inventory

This document maps the workflows present under `.github/workflows/` to the local entry points and identifies checks that depend on GitHub or another operating system. `scripts/ci/local-ci.sh` is the supported Ubuntu 24.04 entry point. Its mode-specific tool checks fail with a named missing tool; modes do not require unrelated platform tools.

## Local entry points

| Command | Checks |
| --- | --- |
| `./scripts/ci/local-ci.sh quick` | Rust format, Clippy, locked fuzz target check, workspace tests; deterministic Node/release tooling checks; WASM-backed package assembly; React Native consumer lockfile install, ESLint, TypeScript, Jest test discovery, and `react-native config` resolution. |
| `./scripts/ci/local-ci.sh full` | `quick`, WASM tests/check, Native C ABI build/header/runtime and sanitizers, both manylinux Docker builds, frozen pnpm workspace install, npm package build and package tests, `npm pack`, clean tarball consumer smoke including `node --no-addons`, and Cargo advisory audit. |
| `./scripts/ci/local-ci.sh linux-glibc` | Builds the Node addon and C ABI in the same manylinux glibc 2.28 Docker image used by release workflows. |
| `./scripts/ci/local-ci.sh coverage` | Core line and function coverage thresholds, using the same script as the coverage workflow. |
| `./scripts/ci/local-ci.sh browser` | Vite, webpack, esbuild, browser, and MV3 package consumer tests. Requires Chrome and Chromium. |
| `./scripts/ci/local-ci.sh fuzz` | The scheduled Wallet Store decoder fuzz run. Requires nightly Rust and `cargo-fuzz`. |
| `./scripts/ci/local-ci.sh android` | React Native static checks and Android Gradle debug assembly. Requires Java 17 and a configured Android SDK / NDK. |

The package consumer path builds the package, writes a tarball into a `mktemp` directory, installs that tarball into clean temporary consumers, runs ESM and CommonJS smoke checks with and without addons, and removes temporary files on exit. The clean consumer uses npm offline mode after `npm pack`, so its verification does not fetch a registry package. The consumer's existing Jest App test invokes the native TurboModule API and is a runtime smoke, not a Node-only unit test; local static CI checks Jest configuration and discovery, while actual API execution is exercised by Android / iOS platform runs.

## Workflow inventory

| Workflow / job | Classification | Local path or limit |
| --- | --- | --- |
| `coverage.yml` / `checks` | Ubuntu reproducible | `scripts/check-local.sh` groups shared with the workflow. Rust formatting, Clippy, locked tests, WASM fallback, C ABI runtime and sanitizers use the same entry. |
| `coverage.yml` / `core-coverage` | Ubuntu reproducible | `scripts/ci/coverage.sh` is called by CI and the `coverage` local mode. Artifact upload is GitHub-only. |
| `coverage.yml` / `core-branch-coverage` | Partly reproducible | Uses nightly Rust and unstable branch coverage; report upload and the workflow's informational `continue-on-error` behavior are GitHub-specific. |
| `dependency-audit.yml` / `cargo-audit` | Ubuntu reproducible, network-backed advisory data | `scripts/ci/audit.sh` is called by CI and `audit` / `full`. The vulnerability database may change independently of the source revision. |
| `dependency-review.yml` / `dependency-review` | GitHub-specific | The action compares the pull request dependency graph and applies the repository's advisory allowlist. It has no equivalent local PR context. |
| `fuzz.yml` / `wallet-store-decode` | Locally reproducible with nightly tools | `scripts/ci/fuzz-wallet-store.sh` is shared. Artifact upload and schedule/dispatch are GitHub-specific. |
| `node.yml` / `source` | Ubuntu reproducible plus evidence handoff | `scripts/ci/node-source.sh` runs deterministic release, facade, React Native lifecycle / Pod graph, and evidence checks. Source evidence upload and GitHub SHA binding stay in the workflow. |
| `node.yml` / `core-c-abi` | Ubuntu reproducible | Calls shared Rust and Native C ABI groups. |
| `node.yml` / `wasm` | Mostly reproducible | WASM test/build and version verification are available locally. Artifact evidence is produced by release evidence scripts; artifact transfer is GitHub-only. |
| `node.yml` / `native` | Partly reproducible | Ubuntu native addon build is local. `scripts/ci/build-manylinux.sh` shares the Linux glibc 2.28 Docker build with local `linux-glibc` mode; macOS x64/arm64 and Windows MSVC builds require their runners. Cross-target artifact evidence validation is OS-independent. |
| `node.yml` / `wasm` React Native consumer checks | Ubuntu reproducible | `scripts/ci/react-native.sh` is shared with local `quick`; install uses the committed npm lockfile and static consumer checks run without an emulator. Jest discovery runs locally; the app's native API Jest smoke needs a TurboModule provider and is exercised through platform runtime testing. |
| `node.yml` / `react-native` | Partly reproducible | Android and iOS archive production uses separate platform toolchains; Android emulator lifecycle smoke needs the configured SDK, emulator, and KVM. iOS requires Xcode / simulator. The static consumer checks are separated into the shared job above. |
| `node.yml` / `react-native-ios-xcframework` | macOS-only | XCFramework, CocoaPods consumer, and iOS simulator checks require Xcode and Apple tooling. |
| `node.yml` / `parity-regression` | Partly reproducible | Native / WASM / npm parity is locally covered by package and tarball consumer tests. The CI browser backend requires a configured browser. |
| `node.yml` / `package` | Partly reproducible | Linux can assemble and test a local package tarball through `package` / `full`. CI's exact four-target package additionally requires Windows, macOS, Android, iOS, and XCFramework artifacts plus cross-job evidence. SPDX/license evidence validation is script-based; final artifact upload is GitHub-only. |
| `node.yml` / `npm-consumer` | Partly reproducible | Ubuntu Node 24 tarball consumer and WASM fallback run locally through the shared consumer script. Windows/macOS and Node 22 matrix entries require those runners / runtime. |
| `node.yml` / `browser-integration` | Ubuntu reproducible with browser tools | `browser` uses the locked workspace install, shared pack helper, and the same bundler smoke test. Hosted browser installation and uploaded test inputs remain runner setup. |
| `c-abi-release.yml` / `target` | Partly reproducible | Ubuntu C ABI build and Unix archive consumer can be run locally; `scripts/ci/build-manylinux.sh` shares the manylinux glibc 2.28 Docker build with local `linux-glibc` mode. macOS / Windows artifacts require native runners. |
| `c-abi-release.yml` / `aggregate` | Partly reproducible | Metadata closure, SBOM, license inventory/policy, archive aggregation, and manifest checks are local Node/Rust tools when all inputs exist. Downloaded target artifacts, release identity inputs, and artifact upload are GitHub handoffs. |
| `release.yml` / `identity`, `candidate`, `c-abi`, `release-record` | Partly reproducible | Deterministic fixtures and candidate evidence validators run from repository scripts. Version availability, immutable artifact handoffs, source/tag binding, and release-mode evidence depend on GitHub or the npm registry. |
| `release.yml` / `publish`, `publication` | External environment / GitHub-specific | OIDC provenance, npm publish, GitHub token, release creation/resume, durable asset upload, and registry recovery cannot be reproduced as an ordinary local check. |
| `release-recovery.yml` / `verify`, `publication` | GitHub / external service-specific | Requires original workflow runs and artifacts, published npm registry contents, GitHub release state, and write permissions. Deterministic validators themselves are covered in `node-source.sh`. |

## Specific CI subjects

- Rust fmt, Clippy, tests, and the independent fuzz lockfile check are in the shared `rust` group.
- Cargo dependency audit uses the same `scripts/ci/audit.sh` command locally and in CI. GitHub Dependency Review remains separate because it evaluates a pull request graph.
- Node deterministic tests use `scripts/ci/node-source.sh`; package, tarball consumer, and React Native checks each have shared scripts.
- React Native lockfile validation is `npm ci --install-links --ignore-scripts`; workspace installs use `corepack pnpm install --frozen-lockfile --ignore-scripts`. Node 24 comes from `.node-version`, and pnpm from `package.json` `packageManager`.
- Android JDK 17 is sourced from `.java-version` for both setup-java and local version checks.
- Native addon and C ABI native build, JS facade, target manifest / artifact validation, clean package install, and WASM fallback are available on Ubuntu. macOS / Windows binary production and Android / iOS runtime execution still require platform runners.
- SBOM and license inventory / policy are deterministic repository tools used for release evidence. GitHub does not run CodeQL in the current workflow set; dependency review and artifact transport are GitHub actions, not local product builds.
- Release preflight scripts and candidate artifact validation can run with their required inputs. Registry queries, provenance/OIDC, publication, release creation, artifact upload/download, and recovery from prior workflow runs require external state or credentials.

## Maintenance rule

When adding CI verification, put the command sequence in a strict `scripts/ci/*.sh` entry (or an existing shared script), make the workflow call that entry, and route the matching local mode through the same entry. Keep runner setup, matrix selection, credentials, and GitHub artifact transport in YAML. Do not copy command sequences into a second local-only implementation; add a named tool preflight to the mode that invokes the check.

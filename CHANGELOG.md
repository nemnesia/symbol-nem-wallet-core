# Changelog

## [0.2.0] - 2026-09-29

- React Native New Architecture に対応。
- Android `arm64-v8a` / `x86_64`、iOS arm64 device / Apple Silicon simulator をサポート。
- Bare React Native `0.87.x` を検証済み環境として追加。
- React Native を含む npm package / release validation を強化。
- README に npm Quick Start と Wallet の作成・復元・React Native 導入手順を追加。

## [0.1.0] - 2026-09-03

- Symbol / NEM wallet core を初回 production release 候補として確定。
- Rust core と npm TypeScript facade を提供。
- native Node-API support と canonical WASM fallback を提供。
- four supported desktop native targets（win32-x64-msvc、darwin-x64、darwin-arm64、linux-x64-gnu）を含む。
- four-target C ABI release assets と、それらの SHA-256 / SPDX SBOM / license evidence を提供。
- strict license policy と third-party license text evidence を release gate に接続。
- npm Trusted Publishing / OIDC と required npm provenance を用いる release path、および durable GitHub Release evidence を提供。
- Android / iOS C ABI support is deferred to MosaicLynx integration.

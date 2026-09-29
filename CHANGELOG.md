# Changelog

## [Unreleased]

### Added

- `@nemnesia/symbol-nem-wallet-core` に React Native New Architecture 向け TurboModule / JSI binding を追加し、既存の16関数、DTO、`Uint8Array`、同期呼び出し契約を package root の `react-native` conditional export から利用可能にした。
- Android `arm64-v8a` / `x86_64` と iOS arm64 device / Apple Silicon simulator 向け native artifact、および iOS XCFramework の build / package path を追加した。
- React Native の runtime / provider lifecycle に registration generation、invalidation barrier、stale completion rejection、secret-bearing output の exactly-once cleanup を追加した。
- iOS producer inputs として Ruby / CocoaPods dependency graph と `Podfile.lock` を source control し、digest・version・graph mutation の fail-closed validation を追加した。
- Release candidate validation に Android / iOS React Native consumer、reload / re-admission lifecycle、XCFramework inspection、最終 npm package、Browser / Manifest V3、Node 22 / 24 clean-tarball consumer の gate を追加した。
- npm 利用者向け README に、30秒の初期化確認、新規 Wallet の安全な Mnemonic handoff、既存 Wallet 復元、署名、React Native 導入への Quick Start 導線を追加した。

### Changed

- React Native の現在の検証済み baseline を Bare React Native `0.87.x` として文書化した。RN `0.86.x` と Expo SDK 57 + RN `0.86.x` は仕様対象だが、正式な互換性検証は未完了として扱う。
- Android SDK setup を現行 command-line tools 経路へ更新し、配布終了した legacy `tools` package への暗黙依存を除去した。
- iOS reload integration を React Native の reload-command 経路へ一本化し、replacement runtime の二重生成を防止した。
- Pending Profile の Store binding 用 SHA-256 helper / field を Store fingerprint として明確化し、password KDF と異なる用途であることをコード上で明示した。

### Validation

- React Native implementation final closure review は `READY`。IR-023 / IR-024 / IR-025 / IR-026 は Resolved、IR-027 は LOW / Deferred / non-blocking。
- Release candidate validation run `36515394421` は 23 / 23 jobs SUCCESS。Core / C ABI、Native / WASM parity、Android arm64-v8a / x86_64、iOS arm64 / simulator、XCFramework、最終 npm assembly、Browser / Manifest V3、Linux / macOS / Windows Node 22 / 24 clean consumers を通過した。
- Physical Android arm64 device、physical iOS arm64 device、RN `0.86.x`、Expo SDK 57 Development Build / Prebuild、production-equivalent responsiveness / resource measurements は未検証であり、検証済みとして扱わない。

## [0.1.0] - 2026-09-03

- Symbol / NEM wallet core を初回 production release 候補として確定。
- Rust core と npm TypeScript facade を提供。
- native Node-API support と canonical WASM fallback を提供。
- four supported desktop native targets（win32-x64-msvc、darwin-x64、darwin-arm64、linux-x64-gnu）を含む。
- four-target C ABI release assets と、それらの SHA-256 / SPDX SBOM / license evidence を提供。
- strict license policy と third-party license text evidence を release gate に接続。
- npm Trusted Publishing / OIDC と required npm provenance を用いる release path、および durable GitHub Release evidence を提供。
- Android / iOS C ABI support is deferred to MosaicLynx integration.

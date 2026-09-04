export const NPM_REQUIRED_FILES = Object.freeze([
  "release-manifest.json",
  "SHA256SUMS",
  "release-source.json",
  "native-summary.json",
  "win32-x64-msvc.node",
  "darwin-x64.node",
  "darwin-arm64.node",
  "linux-x64-gnu.node",
  "win32-x64-msvc.json",
  "darwin-x64.json",
  "darwin-arm64.json",
  "linux-x64-gnu.json",
  "wasm-summary.json",
  "wasm-evidence.json",
  "wasm-bindgen-version.json",
  "sbom.spdx.json",
  "license-inventory.json",
  "SBOM-SHA256SUMS",
  "license-policy.json",
  "THIRD_PARTY_LICENSES.json",
  "LICENSE-POLICY-SHA256SUMS",
]);

export const PUBLISHED_RECOVERY_MANIFEST = "published-recovery-manifest.json";
export const PUBLISHED_REGISTRY_TARBALL = "published-registry.tgz";
export const PUBLISHED_PACKAGE_JSON = "published-package.json";
export const PUBLISHED_NATIVE_MANIFEST = "published-native-artifact-manifest.json";
export const PUBLISHED_NATIVE_EVIDENCE = "published-native-evidence.json";
export const PUBLISHED_WASM = "published-wasm.wasm";
export const PUBLISHED_WASM_EVIDENCE = "published-wasm-evidence.json";
export const PUBLISHED_GENERATED_EVIDENCE = "published-generated-evidence.json";
export const RECOVERY_ARTIFACT_SOURCE = "recovery-artifact-source.json";

export const PUBLISHED_RECOVERY_FILES = Object.freeze([
  PUBLISHED_RECOVERY_MANIFEST,
  PUBLISHED_REGISTRY_TARBALL,
  PUBLISHED_PACKAGE_JSON,
  PUBLISHED_NATIVE_MANIFEST,
  PUBLISHED_NATIVE_EVIDENCE,
  PUBLISHED_WASM,
  PUBLISHED_WASM_EVIDENCE,
  PUBLISHED_GENERATED_EVIDENCE,
  "published-win32-x64-msvc.node",
  "published-darwin-x64.node",
  "published-darwin-arm64.node",
  "published-linux-x64-gnu.node",
]);

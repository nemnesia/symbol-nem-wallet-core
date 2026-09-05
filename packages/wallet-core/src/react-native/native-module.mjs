import { TurboModuleRegistry } from "react-native";

const MODULE_NAME = "NativeSymbolNemWalletCore";
const EXPECTED_MODULE_IDENTITY = "symbol-nem-wallet-core-react-native-v1";
const PACKAGE_REACT_NATIVE_MANIFEST = null;

const EXPECTED_ARTIFACTS = [
  { target_id: "android-arm64-v8a", platform: "android", environment: "device", architecture: "arm64-v8a", relative_path: "dist/react-native/android/jni/arm64-v8a/libsymbol_nem_wallet_core_rn.so", artifact_filename: "libsymbol_nem_wallet_core_rn.so" },
  { target_id: "android-x86_64", platform: "android", environment: "emulator", architecture: "x86_64", relative_path: "dist/react-native/android/jni/x86_64/libsymbol_nem_wallet_core_rn.so", artifact_filename: "libsymbol_nem_wallet_core_rn.so" },
  { target_id: "ios-arm64", platform: "ios", environment: "device", architecture: "arm64", relative_path: "dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64/libsymbol_nem_wallet_core_rn.a", artifact_filename: "libsymbol_nem_wallet_core_rn.a" },
  { target_id: "ios-simulator-arm64", platform: "ios", environment: "simulator", architecture: "arm64", relative_path: "dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64-simulator/libsymbol_nem_wallet_core_rn.a", artifact_filename: "libsymbol_nem_wallet_core_rn.a" },
];

function backendInitializationError() {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  return error;
}

function manifestArtifactIdentities() {
  const manifest = PACKAGE_REACT_NATIVE_MANIFEST;
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    Object.getPrototypeOf(manifest) !== Object.prototype ||
    JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify([
      "artifacts",
      "package_name",
      "package_version",
      "schema_version",
      "source_commit",
    ]) ||
    manifest.schema_version !== 1 ||
    manifest.package_name !== "@nemnesia/symbol-nem-wallet-core" ||
    typeof manifest.package_version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.package_version) ||
    typeof manifest.source_commit !== "string" ||
    !/^[0-9a-f]{40}$/.test(manifest.source_commit) ||
    !Array.isArray(manifest.artifacts) ||
    manifest.artifacts.length !== EXPECTED_ARTIFACTS.length
  ) {
    throw new Error("invalid React Native artifact manifest");
  }

  const identities = [];
  for (const [index, artifact] of manifest.artifacts.entries()) {
    const expected = EXPECTED_ARTIFACTS[index];
    if (
      artifact === null ||
      typeof artifact !== "object" ||
      Object.getPrototypeOf(artifact) !== Object.prototype ||
      JSON.stringify(Object.keys(artifact).sort()) !== JSON.stringify([
        "architecture",
        "artifact_filename",
        "environment",
        "platform",
        "relative_path",
        "sha256",
        "target_id",
        "toolchain_identifier",
      ]) ||
      artifact.target_id !== expected.target_id ||
      artifact.platform !== expected.platform ||
      artifact.environment !== expected.environment ||
      artifact.architecture !== expected.architecture ||
      artifact.relative_path !== expected.relative_path ||
      artifact.artifact_filename !== expected.artifact_filename ||
      !/^[0-9a-f]{64}$/.test(artifact.sha256) ||
      typeof artifact.toolchain_identifier !== "string" ||
      artifact.toolchain_identifier.length === 0
    ) {
      throw new Error("invalid React Native artifact manifest");
    }
    const platformIdentity = artifact.platform === "android"
      ? `${artifact.platform}|${artifact.architecture}|${artifact.relative_path}`
      : `${artifact.platform}|${artifact.environment === "simulator" ? "ios-simulator" : "ios"}|${artifact.architecture}|${artifact.relative_path}`;
    identities.push(platformIdentity);
  }
  return new Set(identities);
}

export function getReactNativeModule() {
  let expectedArtifactIdentities;
  try {
    expectedArtifactIdentities = manifestArtifactIdentities();
  } catch {
    throw backendInitializationError();
  }
  let module;
  try {
    module = TurboModuleRegistry.getEnforcing(MODULE_NAME);
  } catch {
    throw backendInitializationError();
  }
  if (module === null || typeof module !== "object" || typeof module.invoke !== "function") {
    throw backendInitializationError();
  }
  let identity;
  try {
    identity = module.invoke("__snwc_runtime_identity", { args: [] });
  } catch {
    throw backendInitializationError();
  }
  if (
    identity === null ||
    typeof identity !== "object" ||
    Object.getPrototypeOf(identity) !== Object.prototype ||
    JSON.stringify(Object.keys(identity).sort()) !== JSON.stringify([
      "architecture",
      "artifact_identity",
      "module_identity",
      "module_name",
    ]) ||
    identity.module_name !== MODULE_NAME ||
    identity.module_identity !== EXPECTED_MODULE_IDENTITY ||
    identity.architecture !== "new" ||
    !expectedArtifactIdentities.has(identity.artifact_identity)
  ) {
    throw backendInitializationError();
  }
  return module;
}

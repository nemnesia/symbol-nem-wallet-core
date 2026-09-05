import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

const CANONICAL_REACT_NATIVE_TARGET_ORDER = [
  "android-arm64-v8a",
  "android-x86_64",
  "ios-arm64",
  "ios-simulator-arm64",
];

export const REACT_NATIVE_TARGETS = Object.freeze({
  "android-arm64-v8a": Object.freeze({
    platform: "android",
    environment: "device",
    architecture: "arm64-v8a",
    relativePath:
      "dist/react-native/android/jni/arm64-v8a/libsymbol_nem_wallet_core_rn.so",
    artifactFilename: "libsymbol_nem_wallet_core_rn.so",
  }),
  "android-x86_64": Object.freeze({
    platform: "android",
    environment: "emulator",
    architecture: "x86_64",
    relativePath:
      "dist/react-native/android/jni/x86_64/libsymbol_nem_wallet_core_rn.so",
    artifactFilename: "libsymbol_nem_wallet_core_rn.so",
  }),
  "ios-arm64": Object.freeze({
    platform: "ios",
    environment: "device",
    architecture: "arm64",
    relativePath:
      "dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64/libsymbol_nem_wallet_core_rn.a",
    artifactFilename: "libsymbol_nem_wallet_core_rn.a",
  }),
  "ios-simulator-arm64": Object.freeze({
    platform: "ios",
    environment: "simulator",
    architecture: "arm64",
    relativePath:
      "dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64-simulator/libsymbol_nem_wallet_core_rn.a",
    artifactFilename: "libsymbol_nem_wallet_core_rn.a",
  }),
});

function manifestError() {
  throw new Error("invalid React Native artifact manifest");
}

function assemblyError() {
  throw new Error("React Native artifact assembly failed");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function validPackageVersion(value) {
  return typeof value === "string" &&
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

export function validateReactNativeManifest(manifest, packageMeta, { requireComplete = false } = {}) {
  if (!isPlainObject(manifest) || !isPlainObject(packageMeta)) {
    manifestError();
  }
  if (
    !exactKeys(manifest, ["schema_version", "package_name", "package_version", "source_commit", "artifacts"]) ||
    manifest.schema_version !== 1 ||
    manifest.package_name !== "@nemnesia/symbol-nem-wallet-core" ||
    manifest.package_name !== packageMeta.name ||
    manifest.package_version !== packageMeta.version ||
    !validPackageVersion(manifest.package_version) ||
    !/^[0-9a-f]{40}$/.test(manifest.source_commit) ||
    !Array.isArray(manifest.artifacts)
  ) {
    manifestError();
  }

  let previousIndex = -1;
  const seen = new Set();
  for (const artifact of manifest.artifacts) {
    if (!isPlainObject(artifact) || !nonEmptyString(artifact.target_id) || seen.has(artifact.target_id)) {
      manifestError();
    }
    const target = REACT_NATIVE_TARGETS[artifact.target_id];
    if (target === undefined) {
      manifestError();
    }
    if (
      !exactKeys(artifact, [
        "target_id",
        "platform",
        "environment",
        "architecture",
        "relative_path",
        "artifact_filename",
        "sha256",
        "toolchain_identifier",
      ])
    ) {
      manifestError();
    }
    const index = CANONICAL_REACT_NATIVE_TARGET_ORDER.indexOf(artifact.target_id);
    if (index <= previousIndex) {
      manifestError();
    }
    previousIndex = index;
    seen.add(artifact.target_id);
    if (
      artifact.platform !== target.platform ||
      artifact.environment !== target.environment ||
      artifact.architecture !== target.architecture ||
      artifact.relative_path !== target.relativePath ||
      artifact.artifact_filename !== target.artifactFilename ||
      !/^[0-9a-f]{64}$/.test(artifact.sha256) ||
      !nonEmptyString(artifact.toolchain_identifier) ||
      artifact.relative_path.includes("\\") ||
      artifact.relative_path.includes("..") ||
      artifact.artifact_filename.includes("/")
    ) {
      manifestError();
    }
  }
  if (requireComplete && seen.size !== CANONICAL_REACT_NATIVE_TARGET_ORDER.length) {
    manifestError();
  }
  return manifest;
}

export function assembleReactNativeManifest({
  packageVersion,
  sourceCommit,
  artifacts,
  toolchainIdentifier,
  requireComplete = false,
}) {
  if (
    !validPackageVersion(packageVersion) ||
    !/^[0-9a-f]{40}$/.test(sourceCommit) ||
    !Array.isArray(artifacts) ||
    !nonEmptyString(toolchainIdentifier)
  ) {
    assemblyError();
  }
  const manifest = {
    schema_version: 1,
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: packageVersion,
    source_commit: sourceCommit,
    artifacts: validateReactNativeArtifactInputs(artifacts)
      .sort(
        (left, right) =>
          CANONICAL_REACT_NATIVE_TARGET_ORDER.indexOf(left.targetId) -
          CANONICAL_REACT_NATIVE_TARGET_ORDER.indexOf(right.targetId),
      )
      .map((item) => {
        const target = REACT_NATIVE_TARGETS[item.targetId];
        return {
          target_id: item.targetId,
          platform: target.platform,
          environment: target.environment,
          architecture: target.architecture,
          relative_path: target.relativePath,
          artifact_filename: target.artifactFilename,
          sha256: item.sha256,
          toolchain_identifier: toolchainIdentifier,
        };
      }),
  };
  try {
    validateReactNativeManifest(
      manifest,
      { name: "@nemnesia/symbol-nem-wallet-core", version: packageVersion },
      { requireComplete },
    );
  } catch {
    assemblyError();
  }
  return manifest;
}

export function validateReactNativeArtifactInputs(artifacts, { requireComplete = false } = {}) {
  if (!Array.isArray(artifacts)) {
    assemblyError();
  }
  const seen = new Set();
  const validated = artifacts.map((item) => {
    if (
      !isPlainObject(item) ||
      typeof item.targetId !== "string" ||
      REACT_NATIVE_TARGETS[item.targetId] === undefined ||
      seen.has(item.targetId) ||
      typeof item.path !== "string"
    ) {
      assemblyError();
    }
    const target = REACT_NATIVE_TARGETS[item.targetId];
    if (
      !item.path.endsWith(`/${target.artifactFilename}`) &&
      !item.path.endsWith(`\\${target.artifactFilename}`)
    ) {
      assemblyError();
    }
    let sourceBytes;
    try {
      sourceBytes = readFileSync(item.path);
      if (!statSync(item.path).isFile()) {
        assemblyError();
      }
    } catch {
      assemblyError();
    }
    seen.add(item.targetId);
    return {
      targetId: item.targetId,
      path: item.path,
      artifactFilename: target.artifactFilename,
      sha256: createHash("sha256").update(sourceBytes).digest("hex"),
    };
  });
  if (requireComplete && seen.size !== CANONICAL_REACT_NATIVE_TARGET_ORDER.length) {
    assemblyError();
  }
  return validated;
}

export { CANONICAL_REACT_NATIVE_TARGET_ORDER };

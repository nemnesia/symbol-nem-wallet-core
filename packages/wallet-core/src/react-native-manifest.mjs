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

const REQUIRED_RN_SYMBOLS = Object.freeze([
  "snwc_rn_module_identity",
  "symbolNemWalletCoreCxxModuleProvider",
]);

function hasRequiredSymbols(bytes) {
  return REQUIRED_RN_SYMBOLS.every((symbol) => bytes.includes(Buffer.from(symbol, "utf8")));
}

function inspectElf(bytes, target) {
  if (bytes.length < 64 || bytes[0] !== 0x7f || bytes.toString("ascii", 1, 4) !== "ELF") {
    assemblyError();
  }
  if (bytes[4] !== 2 || bytes[5] !== 1 || bytes.readUInt16LE(16) !== 3) {
    assemblyError();
  }
  const machine = bytes.readUInt16LE(18);
  const expectedMachine = target.architecture === "arm64-v8a" ? 183 : 62;
  if (machine !== expectedMachine) assemblyError();
  if (!hasRequiredSymbols(bytes)) assemblyError();
  return {
    format: "ELF64",
    identity: {
      format: "ELF64",
      endian: "little",
      type: "ET_DYN",
      machine: target.architecture === "arm64-v8a" ? "AArch64" : "x86_64",
      architecture: target.architecture,
    },
    requiredSymbols: [...REQUIRED_RN_SYMBOLS],
  };
}

function machOIdentity(bytes, target) {
  if (bytes.length < 32) return null;
  const magic = bytes.readUInt32LE(0);
  if (magic !== 0xfeedfacf) return null;
  const cpuType = bytes.readUInt32LE(4);
  const expectedCpuType = 0x0100000c;
  if (cpuType !== expectedCpuType) assemblyError();
  const commandCount = bytes.readUInt32LE(16);
  const commandsSize = bytes.readUInt32LE(20);
  if (commandCount === 0 || commandsSize > bytes.length - 32) assemblyError();
  let offset = 32;
  let platform;
  for (let index = 0; index < commandCount; index += 1) {
    if (offset + 8 > bytes.length) assemblyError();
    const command = bytes.readUInt32LE(offset);
    const commandSize = bytes.readUInt32LE(offset + 4);
    if (commandSize < 8 || offset + commandSize > bytes.length) assemblyError();
    if (command === 0x32) {
      if (commandSize < 16) assemblyError();
      platform = bytes.readUInt32LE(offset + 8);
    }
    offset += commandSize;
  }
  const expectedPlatform = target.environment === "simulator" ? 7 : 2;
  if (platform !== expectedPlatform) assemblyError();
  return {
    format: "Mach-O-64",
    architecture: "arm64",
    platform: target.environment === "simulator" ? "ios-simulator" : "ios",
  };
}

function inspectStaticArchive(bytes, target) {
  if (bytes.length < 8 || bytes.toString("ascii", 0, 8) !== "!<arch>\n") assemblyError();
  const identities = [];
  let offset = 8;
  while (offset < bytes.length) {
    if (offset + 60 > bytes.length) assemblyError();
    if (bytes[offset + 58] !== 0x60 || bytes[offset + 59] !== 0x0a) assemblyError();
    const sizeText = bytes.toString("ascii", offset + 48, offset + 58).trim();
    if (!/^\d+$/.test(sizeText)) assemblyError();
    const memberSize = Number(sizeText);
    const memberStart = offset + 60;
    const memberEnd = memberStart + memberSize;
    if (!Number.isSafeInteger(memberSize) || memberEnd > bytes.length) assemblyError();
    const identity = machOIdentity(bytes.subarray(memberStart, memberEnd), target);
    if (identity !== null) identities.push(identity);
    offset = memberEnd + (memberSize % 2);
  }
  if (identities.length === 0 || !hasRequiredSymbols(bytes)) assemblyError();
  const first = identities[0];
  if (identities.some((identity) => JSON.stringify(identity) !== JSON.stringify(first))) assemblyError();
  return {
    format: "Mach-O-64-static-archive",
    identity: { ...first, object_count: identities.length },
    requiredSymbols: [...REQUIRED_RN_SYMBOLS],
  };
}

export function inspectReactNativeArtifact(path, targetId) {
  const target = REACT_NATIVE_TARGETS[targetId];
  if (target === undefined || typeof path !== "string") assemblyError();
  let bytes;
  try {
    bytes = readFileSync(path);
    if (!statSync(path).isFile()) assemblyError();
  } catch {
    assemblyError();
  }
  const inspected = target.platform === "android"
    ? inspectElf(bytes, target)
    : inspectStaticArchive(bytes, target);
  return {
    targetId,
    artifactFilename: target.artifactFilename,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length,
    binaryFormat: inspected.format,
    binaryIdentity: inspected.identity,
    requiredSymbols: inspected.requiredSymbols,
  };
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
          toolchain_identifier: item.toolchainIdentifier ?? toolchainIdentifier,
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
    const inspected = inspectReactNativeArtifact(item.path, item.targetId);
    seen.add(item.targetId);
    const result = {
      targetId: item.targetId,
      path: item.path,
      artifactFilename: target.artifactFilename,
      sha256: inspected.sha256,
      size: inspected.size,
      toolchainIdentifier: typeof item.toolchainIdentifier === "string" ? item.toolchainIdentifier : undefined,
      binaryFormat: inspected.binaryFormat,
      binaryIdentity: inspected.binaryIdentity,
      requiredSymbols: inspected.requiredSymbols,
    };
    if (item.evidencePath !== undefined) result.evidencePath = item.evidencePath;
    return result;
  });
  if (requireComplete && seen.size !== CANONICAL_REACT_NATIVE_TARGET_ORDER.length) {
    assemblyError();
  }
  return validated;
}

export { CANONICAL_REACT_NATIVE_TARGET_ORDER };

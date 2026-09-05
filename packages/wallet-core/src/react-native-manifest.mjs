import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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

export const REQUIRED_RN_SYMBOLS = Object.freeze([
  "snwc_rn_module_identity",
  "symbolNemWalletCoreCxxModuleProvider",
]);

function rangeEnd(start, size, length) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(size) || start < 0 || size < 0 || start > length - size) {
    assemblyError();
  }
  return start + size;
}

function u64(bytes, offset) {
  rangeEnd(offset, 8, bytes.length);
  const value = bytes.readBigUInt64LE(offset);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) assemblyError();
  return Number(value);
}

function elfVirtualOffset(loadSegments, address, size, bytesLength) {
  for (const segment of loadSegments) {
    if (
      address >= segment.virtualAddress &&
      address <= segment.virtualAddress + segment.fileSize &&
      size <= segment.virtualAddress + segment.fileSize - address
    ) {
      const fileOffset = segment.fileOffset + address - segment.virtualAddress;
      rangeEnd(fileOffset, size, bytesLength);
      return fileOffset;
    }
  }
  assemblyError();
}

function cString(bytes, offset, limit) {
  rangeEnd(offset, 1, limit);
  const end = bytes.indexOf(0, offset);
  if (end < offset || end >= limit) assemblyError();
  return bytes.toString("utf8", offset, end);
}

function parseElfDynamicSymbols(bytes, header) {
  const { loadSegments, dynamic } = header;
  if (loadSegments.length === 0 || dynamic === null) assemblyError();
  const dynamicValues = new Map();
  let dynamicTerminated = false;
  for (let offset = dynamic.fileOffset; offset < dynamic.fileOffset + dynamic.fileSize; offset += 16) {
    const tag = bytes.readBigInt64LE(offset);
    const value = u64(bytes, offset + 8);
    if (tag === 0n) {
      dynamicTerminated = true;
      break;
    }
    dynamicValues.set(tag, value);
  }
  if (!dynamicTerminated) assemblyError();

  const stringTableAddress = dynamicValues.get(5n);
  const stringTableSize = dynamicValues.get(10n);
  const symbolTableAddress = dynamicValues.get(6n);
  const symbolEntrySize = dynamicValues.get(11n);
  const sonameOffset = dynamicValues.get(14n);
  if (
    stringTableAddress === undefined || stringTableSize === undefined ||
    symbolTableAddress === undefined || symbolEntrySize !== 24 || sonameOffset === undefined
  ) {
    assemblyError();
  }
  const stringTableOffset = elfVirtualOffset(loadSegments, stringTableAddress, stringTableSize, bytes.length);
  if (sonameOffset >= stringTableSize) assemblyError();
  const soname = cString(bytes, stringTableOffset + sonameOffset, stringTableOffset + stringTableSize);

  let symbolCount = 0;
  const sysvHashAddress = dynamicValues.get(4n);
  if (sysvHashAddress !== undefined) {
    const hashOffset = elfVirtualOffset(loadSegments, sysvHashAddress, 8, bytes.length);
    const bucketCount = bytes.readUInt32LE(hashOffset);
    const chainCount = bytes.readUInt32LE(hashOffset + 4);
    if (bucketCount === 0 || chainCount === 0) assemblyError();
    rangeEnd(hashOffset, 8 + bucketCount * 4 + chainCount * 4, bytes.length);
    symbolCount = chainCount;
  }

  const gnuHashAddress = dynamicValues.get(0x6ffffef5n);
  if (gnuHashAddress !== undefined) {
    const hashOffset = elfVirtualOffset(loadSegments, gnuHashAddress, 16, bytes.length);
    const bucketCount = bytes.readUInt32LE(hashOffset);
    const symbolOffset = bytes.readUInt32LE(hashOffset + 4);
    const bloomCount = bytes.readUInt32LE(hashOffset + 8);
    if (bucketCount === 0 || bloomCount === 0) assemblyError();
    const bucketOffset = rangeEnd(hashOffset, 16 + bloomCount * 8, bytes.length);
    const chainOffset = rangeEnd(bucketOffset, bucketCount * 4, bytes.length);
    let maximum = symbolOffset;
    let foundBucket = false;
    for (let index = 0; index < bucketCount; index += 1) {
      const bucket = bytes.readUInt32LE(bucketOffset + index * 4);
      if (bucket < symbolOffset) continue;
      foundBucket = true;
      let symbolIndex = bucket;
      for (;;) {
        const chainIndex = symbolIndex - symbolOffset;
        const chainPosition = rangeEnd(chainOffset, (chainIndex + 1) * 4, bytes.length) - 4;
        const chain = bytes.readUInt32LE(chainPosition);
        maximum = Math.max(maximum, symbolIndex + 1);
        if ((chain & 1) !== 0) break;
        symbolIndex += 1;
      }
    }
    if (!foundBucket || maximum === 0) assemblyError();
    symbolCount = Math.max(symbolCount, maximum);
  }
  if (symbolCount === 0) assemblyError();

  const symbolTableOffset = elfVirtualOffset(
    loadSegments,
    symbolTableAddress,
    symbolCount * symbolEntrySize,
    bytes.length,
  );
  const exported = new Set();
  for (let index = 0; index < symbolCount; index += 1) {
    const offset = symbolTableOffset + index * symbolEntrySize;
    const nameOffset = bytes.readUInt32LE(offset);
    const info = bytes.readUInt8(offset + 4);
    const other = bytes.readUInt8(offset + 5);
    const sectionIndex = bytes.readUInt16LE(offset + 6);
    const value = u64(bytes, offset + 8);
    if (nameOffset >= stringTableSize || (info & 0x0f) === 0 || (other & 0x03) === 2 || sectionIndex === 0) continue;
    const name = cString(bytes, stringTableOffset + nameOffset, stringTableOffset + stringTableSize);
    if (name.length === 0) continue;
    const symbolInLoadSegment = loadSegments.some(
      (segment) => value >= segment.virtualAddress && value < segment.virtualAddress + segment.memorySize,
    );
    if (symbolInLoadSegment && ((info >> 4) === 1 || (info >> 4) === 10)) exported.add(name);
  }
  return { soname, exported };
}

function inspectElf(bytes, target) {
  if (bytes.length < 64 || bytes[0] !== 0x7f || bytes.toString("ascii", 1, 4) !== "ELF") {
    assemblyError();
  }
  if (
    bytes[4] !== 2 || bytes[5] !== 1 || bytes.readUInt16LE(16) !== 3 ||
    bytes.readUInt16LE(52) < 64 || bytes.readUInt16LE(54) < 56
  ) {
    assemblyError();
  }
  const machine = bytes.readUInt16LE(18);
  const expectedMachine = target.architecture === "arm64-v8a" ? 183 : 62;
  if (machine !== expectedMachine) assemblyError();
  const programHeaderOffset = u64(bytes, 32);
  const programHeaderEntrySize = bytes.readUInt16LE(54);
  const programHeaderCount = bytes.readUInt16LE(56);
  if (programHeaderCount === 0 || programHeaderEntrySize < 56) assemblyError();
  rangeEnd(programHeaderOffset, programHeaderEntrySize * programHeaderCount, bytes.length);
  const programHeaders = [];
  const loadSegments = [];
  let dynamic = null;
  for (let index = 0; index < programHeaderCount; index += 1) {
    const offset = programHeaderOffset + index * programHeaderEntrySize;
    const segment = {
      type: bytes.readUInt32LE(offset),
      fileOffset: u64(bytes, offset + 8),
      virtualAddress: u64(bytes, offset + 16),
      fileSize: u64(bytes, offset + 32),
      memorySize: u64(bytes, offset + 40),
      alignment: u64(bytes, offset + 48),
    };
    if (segment.memorySize < segment.fileSize) assemblyError();
    rangeEnd(segment.fileOffset, segment.fileSize, bytes.length);
    if (segment.alignment > 1 && (segment.alignment & (segment.alignment - 1)) !== 0) assemblyError();
    programHeaders.push(segment);
    if (segment.type === 1 && segment.fileSize > 0 && segment.memorySize > 0) loadSegments.push(segment);
    if (segment.type === 2) {
      if (dynamic !== null || segment.fileSize === 0 || segment.fileSize % 16 !== 0) assemblyError();
      dynamic = segment;
    }
  }
  if (loadSegments.length === 0 || dynamic === null) assemblyError();
  const dynamicInLoad = loadSegments.some(
    (segment) => dynamic.fileOffset >= segment.fileOffset && dynamic.fileOffset + dynamic.fileSize <= segment.fileOffset + segment.fileSize,
  );
  if (!dynamicInLoad) assemblyError();
  const parsed = parseElfDynamicSymbols(bytes, { programHeaders, loadSegments, dynamic });
  for (const symbol of REQUIRED_RN_SYMBOLS) if (!parsed.exported.has(symbol)) assemblyError();
  if (parsed.soname !== target.artifactFilename) assemblyError();
  return {
    format: "ELF64",
    identity: {
      format: "ELF64",
      endian: "little",
      type: "ET_DYN",
      machine: target.architecture === "arm64-v8a" ? "AArch64" : "x86_64",
      architecture: target.architecture,
      soname: parsed.soname,
      loadable_segments: loadSegments.length,
      dynamic_symbols: parsed.exported.size,
    },
    requiredSymbols: [...REQUIRED_RN_SYMBOLS],
  };
}

function machOIdentity(bytes, target, { requireRequiredSymbols = true } = {}) {
  if (bytes.length < 32) return null;
  const magic = bytes.readUInt32LE(0);
  if (magic !== 0xfeedfacf) return null;
  const cpuType = bytes.readUInt32LE(4);
  const cpuSubtype = bytes.readUInt32LE(8);
  const fileType = bytes.readUInt32LE(12);
  if (cpuType !== 0x0100000c || (cpuSubtype & 0x00ffffff) !== 0 || fileType !== 1) assemblyError();
  const commandCount = bytes.readUInt32LE(16);
  const commandsSize = bytes.readUInt32LE(20);
  if (commandCount === 0 || commandsSize > bytes.length - 32) assemblyError();
  rangeEnd(32, commandsSize, bytes.length);
  let offset = 32;
  let platform;
  let symbolTable = null;
  let sectionCount = 0;
  for (let index = 0; index < commandCount; index += 1) {
    if (offset + 8 > bytes.length) assemblyError();
    const command = bytes.readUInt32LE(offset);
    const commandSize = bytes.readUInt32LE(offset + 4);
    if (commandSize < 8 || offset + commandSize > bytes.length) assemblyError();
    if (command === 0x19) {
      if (commandSize < 72) assemblyError();
      const segmentFileOffset = u64(bytes, offset + 40);
      const segmentFileSize = u64(bytes, offset + 48);
      rangeEnd(segmentFileOffset, segmentFileSize, bytes.length);
      const sections = bytes.readUInt32LE(offset + 64);
      if (commandSize < 72 + sections * 80) assemblyError();
      sectionCount += sections;
    } else if (command === 0x32) {
      if (commandSize < 24) assemblyError();
      platform = bytes.readUInt32LE(offset + 8);
      const toolCount = bytes.readUInt32LE(offset + 20);
      if (commandSize < 24 + toolCount * 8) assemblyError();
    } else if (command === 0x2) {
      if (commandSize < 24) assemblyError();
      const symbolOffset = bytes.readUInt32LE(offset + 8);
      const symbolCount = bytes.readUInt32LE(offset + 12);
      const stringOffset = bytes.readUInt32LE(offset + 16);
      const stringSize = bytes.readUInt32LE(offset + 20);
      rangeEnd(symbolOffset, symbolCount * 16, bytes.length);
      rangeEnd(stringOffset, stringSize, bytes.length);
      symbolTable = { symbolOffset, symbolCount, stringOffset, stringSize };
    }
    offset += commandSize;
  }
  if (offset !== 32 + commandsSize || platform === undefined || symbolTable === null || sectionCount === 0) assemblyError();
  const expectedPlatform = target.environment === "simulator" ? 7 : 2;
  if (platform !== expectedPlatform) assemblyError();
  const exported = new Set();
  for (let index = 0; index < symbolTable.symbolCount; index += 1) {
    const symbolOffset = symbolTable.symbolOffset + index * 16;
    const nameOffset = bytes.readUInt32LE(symbolOffset);
    const type = bytes.readUInt8(symbolOffset + 4);
    if (nameOffset >= symbolTable.stringSize || (type & 0x01) === 0 || (type & 0x0e) === 0) continue;
    const name = cString(bytes, symbolTable.stringOffset + nameOffset, symbolTable.stringOffset + symbolTable.stringSize);
    if (name.length > 0) exported.add(name.startsWith("_") ? name.slice(1) : name);
  }
  if (requireRequiredSymbols) {
    for (const symbol of REQUIRED_RN_SYMBOLS) if (!exported.has(symbol)) assemblyError();
  }
  return {
    format: "Mach-O-64",
    identity: {
      format: "Mach-O-64",
      architecture: "arm64",
      platform: target.environment === "simulator" ? "ios-simulator" : "ios",
      load_commands: commandCount,
      sections: sectionCount,
      exported_symbols: exported.size,
    },
    exportedSymbols: [...exported],
    requiredSymbols: REQUIRED_RN_SYMBOLS.filter((symbol) => exported.has(symbol)),
  };
}

function inspectStaticArchive(bytes, target) {
  if (bytes.length < 8 || bytes.toString("ascii", 0, 8) !== "!<arch>\n") assemblyError();
  const identities = [];
  const exportedSymbols = new Set();
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
    const member = bytes.subarray(memberStart, memberEnd);
    const identity = machOIdentity(member, target, { requireRequiredSymbols: false });
    if (identity !== null) {
      identities.push(identity.identity);
      for (const symbol of identity.requiredSymbols) exportedSymbols.add(symbol);
    } else {
      const memberName = bytes.toString("ascii", offset, offset + 16).trim();
      if (identities.length !== 0 || !["/", "/SYM64/", "//", "__.SYMDEF", "__.SYMDEF SORTED"].includes(memberName)) assemblyError();
    }
    offset = memberEnd + (memberSize % 2);
  }
  if (identities.length === 0 || exportedSymbols.size !== REQUIRED_RN_SYMBOLS.length) assemblyError();
  const first = identities[0];
  if (identities.some((identity) =>
    identity.format !== first.format || identity.architecture !== first.architecture || identity.platform !== first.platform
  )) assemblyError();
  if (exportedSymbols.size !== REQUIRED_RN_SYMBOLS.length) assemblyError();
  return {
    format: "Mach-O-64-static-archive",
    identity: {
      format: "Mach-O-64",
      architecture: first.architecture,
      platform: first.platform,
      load_commands: Math.max(...identities.map((identity) => identity.load_commands)),
      sections: Math.max(...identities.map((identity) => identity.sections)),
      exported_symbols: identities.reduce((total, identity) => total + identity.exported_symbols, 0),
      object_count: identities.length,
    },
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

function readXcframeworkInfo(path) {
  const infoPath = join(path, "Info.plist");
  let text;
  try {
    text = readFileSync(infoPath, "utf8");
  } catch {
    assemblyError();
  }
  if (
    !/<key>CFBundlePackageType<\/key>\s*<string>XFWK<\/string>/.test(text) ||
    !/<key>XCFrameworkFormatVersion<\/key>\s*<string>1\.0<\/string>/.test(text) ||
    !text.includes("<key>AvailableLibraries</key>")
  ) assemblyError();
  const array = text.match(/<key>AvailableLibraries<\/key>\s*<array>([\s\S]*?)<\/array>\s*<key>CFBundlePackageType<\/key>/)?.[1];
  if (array === undefined) assemblyError();
  const entries = [...array.matchAll(/<dict>([\s\S]*?)<\/dict>/g)].map((match) => match[1]);
  if (entries.length !== 2) assemblyError();
  return entries.map((entry) => {
    const values = Object.fromEntries(
      [...entry.matchAll(/<key>([^<]+)<\/key>\s*(?:<string>([^<]*)<\/string>|<array>\s*<string>([^<]*)<\/string>\s*<\/array>)/g)]
        .map((match) => [match[1], match[2] ?? [match[3]]]),
    );
    if (Object.keys(values).length === 0) assemblyError();
    return values;
  });
}

export function validateReactNativeXcframework(path) {
  let entries;
  try {
    if (!statSync(path).isDirectory()) assemblyError();
    entries = readXcframeworkInfo(path);
  } catch {
    assemblyError();
  }
  const expected = [
    { identifier: "ios-arm64", platform: "ios", architecture: "arm64", variant: undefined },
    { identifier: "ios-arm64-simulator", platform: "ios", architecture: "arm64", variant: "simulator" },
  ];
  const actualDirectories = readdirSync(path).sort();
  if (JSON.stringify(actualDirectories) !== JSON.stringify(["Info.plist", "ios-arm64", "ios-arm64-simulator"])) assemblyError();
  for (const item of expected) {
    const info = entries.find((entry) => entry.LibraryIdentifier === item.identifier);
    if (
      info === undefined ||
      !exactKeys(info, item.variant === undefined
        ? ["LibraryIdentifier", "LibraryPath", "SupportedArchitectures", "SupportedPlatform"]
        : ["LibraryIdentifier", "LibraryPath", "SupportedArchitectures", "SupportedPlatform", "SupportedPlatformVariant"],
      ) ||
      info.LibraryPath !== "libsymbol_nem_wallet_core_rn.a" ||
      info.SupportedPlatform !== item.platform ||
      JSON.stringify(info.SupportedArchitectures) !== JSON.stringify([item.architecture]) ||
      (item.variant === undefined ? info.SupportedPlatformVariant !== undefined : info.SupportedPlatformVariant !== item.variant)
    ) assemblyError();
    const sliceEntries = readdirSync(join(path, item.identifier), { withFileTypes: true });
    if (sliceEntries.length !== 1 || !sliceEntries[0].isFile() || sliceEntries[0].name !== "libsymbol_nem_wallet_core_rn.a") {
      assemblyError();
    }
    const binaryPath = join(path, item.identifier, "libsymbol_nem_wallet_core_rn.a");
    inspectReactNativeArtifact(binaryPath, item.identifier === "ios-arm64" ? "ios-arm64" : "ios-simulator-arm64");
  }
  return { format: "XCFramework", slices: expected.map((item) => item.identifier) };
}

export function validateReactNativePackageArtifacts(packageRoot, manifest) {
  for (const artifact of manifest.artifacts) {
    const artifactPath = join(packageRoot, artifact.relative_path);
    const inspected = inspectReactNativeArtifact(artifactPath, artifact.target_id);
    if (inspected.sha256 !== artifact.sha256) assemblyError();
  }
  if (manifest.artifacts.some((artifact) => artifact.platform === "ios")) {
    validateReactNativeXcframework(join(packageRoot, "dist/react-native/ios/SymbolNemWalletCoreRN.xcframework"));
  }
  return true;
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

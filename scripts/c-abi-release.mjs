import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync, gunzipSync } from "node:zlib";
import {
  C_ABI_TARGET_ORDER,
  C_ABI_TARGETS,
  cAbiArchiveFilename,
  cAbiTarget,
} from "./c-abi-targets.mjs";
import { cargoLockDigest, validateCAbiEvidenceIdentity } from "./c-abi-sbom.mjs";
import {
  collectReleaseVersionSources,
  isValidCommit,
  isValidSemVer,
  parseSemVer,
} from "./release-identity.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PROJECT_NAME = "symbol-nem-wallet-core";
const C_ABI_PACKAGE_NAME = "symbol-nem-wallet-core-native";
const NPM_PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";
const HEADER_FILENAME = "symbol_nem_wallet_core.h";
const LICENSE_FILENAME = "LICENSE";
const ARCHIVE_FORMAT = "tar.gz";
const SCHEMA_VERSION = 1;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const MODE_VALUES = new Set(["candidate", "release"]);

function fail(message) {
  throw new Error(`C ABI release gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, keys, label) {
  if (!isPlainObject(value)) fail(`${label} is not an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || !actual.every((key, index) => key === expected[index])) {
    fail(`${label} has unexpected or missing fields`);
  }
}

function validHash(value, label) {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) fail(`${label} is not a SHA-256 digest`);
}

function validCommit(value, label) {
  if (typeof value !== "string" || !COMMIT_PATTERN.test(value)) fail(`${label} is not a commit`);
}

function validSafePath(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\\") ||
    value.includes("\n") ||
    value.includes("\r") ||
    value.startsWith("/") ||
    value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    fail(`${label} is not a safe relative path`);
  }
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256File(path, label = path) {
  try {
    return sha256Bytes(readFileSync(path));
  } catch {
    fail(`${label} is unreadable`);
  }
}

function readJson(path, label = path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`${label} is unreadable or malformed`);
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureFile(path, label) {
  if (!existsSync(path) || !statSync(path).isFile()) fail(`${label} is missing`);
}

function versionGate({ sourceRoot = repositoryRoot, packageVersion, mode = "candidate", releaseTag = null }) {
  if (!isValidSemVer(packageVersion)) fail("C ABI package version is not SemVer");
  if (!MODE_VALUES.has(mode)) fail(`unsupported release mode: ${mode}`);
  const versions = collectReleaseVersionSources({ root: sourceRoot });
  for (const source of Object.values(versions)) {
    if (source.version !== packageVersion) fail(`release version mismatch: ${source.relative_path}`);
  }
  if (mode === "release") {
    if (parseSemVer(packageVersion).prerelease !== null) fail("pre-release versions are not accepted for formal release");
    if (typeof releaseTag !== "string" || releaseTag !== `v${packageVersion}`) fail("release tag does not exactly match v<SemVer>");
  } else if (releaseTag !== null && releaseTag !== undefined) {
    fail("candidate evidence must not claim a formal release tag");
  }
  return versions;
}

function validateTargetInputs({
  targetId,
  rustTarget,
  runner,
  platform,
  packageVersion,
  sourceCommit,
  mode,
  releaseTag,
  toolchainIdentifier,
  cargoLockSha256,
}) {
  const target = cAbiTarget(targetId);
  if (target === undefined) fail(`unexpected C ABI target: ${targetId}`);
  if (target.rust_target !== rustTarget) fail(`target triple mismatch: ${targetId}`);
  if (target.runner !== runner) fail(`runner identity mismatch: ${targetId}`);
  if (target.platform !== platform) fail(`platform identity mismatch: ${targetId}`);
  if (typeof toolchainIdentifier !== "string" || toolchainIdentifier.length === 0 || /[\r\n]/.test(toolchainIdentifier)) {
    fail("Rust toolchain identity is invalid");
  }
  validCommit(sourceCommit, "source commit");
  validHash(cargoLockSha256, "Cargo.lock identity");
  versionGate({ packageVersion, mode, releaseTag });
  return target;
}

function octalField(value, width) {
  const encoded = Math.floor(value).toString(8);
  if (encoded.length + 1 > width) fail("archive field is too large");
  return Buffer.from(`${encoded.padStart(width - 1, "0")}\0`, "ascii");
}

function tarHeader(path, size) {
  validSafePath(path, "archive entry");
  const header = Buffer.alloc(512, 0);
  const write = (offset, width, value) => {
    const bytes = Buffer.from(value, "ascii");
    if (bytes.length > width) fail(`archive header field is too long: ${path}`);
    bytes.copy(header, offset);
  };
  write(0, 100, path);
  octalField(0o644, 8).copy(header, 100);
  octalField(0, 8).copy(header, 108);
  octalField(0, 8).copy(header, 116);
  octalField(size, 12).copy(header, 124);
  octalField(0, 12).copy(header, 136);
  Buffer.from("        ", "ascii").copy(header, 148);
  write(156, 1, "0");
  write(257, 6, "ustar\0");
  write(263, 2, "00");
  write(265, 32, "root");
  write(297, 32, "root");
  octalField(0, 8).copy(header, 329);
  octalField(0, 8).copy(header, 337);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  octalField(checksum, 8).copy(header, 148);
  return header;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function deterministicGzip(bytes) {
  // zlib.deflateRawSync is deterministic for fixed input/options.  The gzip
  // wrapper is written here so no platform timestamp or filename is added.
  const body = deflateRawSync(bytes, { level: 9, memLevel: 9, strategy: 0 });
  const trailer = Buffer.alloc(8);
  trailer.writeUInt32LE(crc32(bytes), 0);
  trailer.writeUInt32LE(bytes.length >>> 0, 4);
  return Buffer.concat([Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x03]), body, trailer]);
}

function createTarGz(entries) {
  const names = Object.keys(entries).sort();
  const chunks = [];
  for (const name of names) {
    const bytes = entries[name];
    if (!Buffer.isBuffer(bytes)) fail(`archive entry is not bytes: ${name}`);
    chunks.push(tarHeader(name, bytes.length), bytes);
    const padding = (512 - (bytes.length % 512)) % 512;
    if (padding > 0) chunks.push(Buffer.alloc(padding));
  }
  chunks.push(Buffer.alloc(1024));
  return deterministicGzip(Buffer.concat(chunks));
}

function parseTarOctal(bytes) {
  const text = bytes.toString("ascii").replace(/\0.*$/, "").trim();
  if (!/^[0-7]*$/.test(text)) fail("archive contains an invalid tar number");
  return text.length === 0 ? 0 : Number.parseInt(text, 8);
}

function parseTarGz(bytes) {
  let tarBytes;
  try {
    tarBytes = gunzipSync(bytes);
  } catch {
    fail("archive gzip stream is invalid");
  }
  const entries = new Map();
  let offset = 0;
  let zeroBlocks = 0;
  while (offset + 512 <= tarBytes.length) {
    const header = tarBytes.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) {
      zeroBlocks += 1;
      if (zeroBlocks === 2) break;
      continue;
    }
    zeroBlocks = 0;
    const suppliedChecksum = parseTarOctal(header.subarray(148, 156));
    const checksumHeader = Buffer.from(header);
    Buffer.from("        ", "ascii").copy(checksumHeader, 148);
    const calculatedChecksum = checksumHeader.reduce((sum, byte) => sum + byte, 0);
    if (suppliedChecksum !== calculatedChecksum) fail("archive tar header checksum is invalid");
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
    const path = prefix.length === 0 ? name : `${prefix}/${name}`;
    validSafePath(path, "archive entry path");
    if (header[156] !== 0x30) fail(`archive contains a non-regular entry: ${path}`);
    const size = parseTarOctal(header.subarray(124, 136));
    if (!Number.isSafeInteger(size) || offset + size > tarBytes.length) fail(`archive entry is truncated: ${path}`);
    if (entries.has(path)) fail(`archive contains a duplicate entry: ${path}`);
    entries.set(path, Buffer.from(tarBytes.subarray(offset, offset + size)));
    offset += size + ((512 - (size % 512)) % 512);
  }
  if (zeroBlocks !== 2 || offset !== tarBytes.length) fail("archive has malformed tar termination or trailing bytes");
  return entries;
}

function expectedArchiveEntries(target, evidence, files) {
  return {
    [`include/${HEADER_FILENAME}`]: files.header,
    [`lib/static/${target.static_library}`]: files.staticLibrary,
    [`lib/dynamic/${target.dynamic_library}`]: files.dynamicLibrary,
    ...Object.fromEntries(target.companion_libraries.map((name) => [`lib/dynamic/${name}`, files.companions.get(name)])),
    [LICENSE_FILENAME]: files.license,
    "metadata/c-abi-artifact.json": Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`),
  };
}

function commonEvidence({ target, targetId, packageVersion, sourceCommit, mode, releaseTag, toolchainIdentifier, cargoLockSha256, header, license, staticLibrary, dynamicLibrary, companions, glibcMaxRequired }) {
  const result = {
    schema_version: SCHEMA_VERSION,
    artifact_kind: "c-abi-artifact",
    project_name: PROJECT_NAME,
    package_name: C_ABI_PACKAGE_NAME,
    npm_package_name: NPM_PACKAGE_NAME,
    package_version: packageVersion,
    mode,
    release_tag: releaseTag,
    source_commit: sourceCommit,
    target_id: targetId,
    rust_target: target.rust_target,
    runner: target.runner,
    platform: target.platform,
    toolchain_identifier: toolchainIdentifier,
    build_mode: "release",
    cargo_lock_sha256: cargoLockSha256,
    header: { filename: HEADER_FILENAME, sha256: sha256Bytes(header) },
    license: { filename: LICENSE_FILENAME, sha256: sha256Bytes(license) },
    static_library: { filename: target.static_library, sha256: sha256Bytes(staticLibrary) },
    dynamic_library: { filename: target.dynamic_library, sha256: sha256Bytes(dynamicLibrary) },
    companion_libraries: target.companion_libraries.map((filename) => ({ filename, sha256: sha256Bytes(companions.get(filename)) })),
  };
  if (target.glibc_baseline !== undefined) {
    result.glibc_baseline = target.glibc_baseline;
    result.max_required_glibc_symbol = glibcMaxRequired;
  }
  return result;
}

function validateCommonEvidence(evidence) {
  const keys = [
    "schema_version", "artifact_kind", "project_name", "package_name", "npm_package_name", "package_version",
    "mode", "release_tag", "source_commit", "target_id", "rust_target", "runner", "platform",
    "toolchain_identifier", "build_mode", "cargo_lock_sha256", "header", "license", "static_library",
    "dynamic_library", "companion_libraries", "archive",
  ];
  if (cAbiTarget(evidence?.target_id)?.glibc_baseline !== undefined) keys.push("glibc_baseline", "max_required_glibc_symbol");
  exactKeys(evidence, keys, "C ABI artifact evidence");
  if (
    evidence.schema_version !== SCHEMA_VERSION ||
    evidence.artifact_kind !== "c-abi-artifact" ||
    evidence.project_name !== PROJECT_NAME ||
    evidence.package_name !== C_ABI_PACKAGE_NAME ||
    evidence.npm_package_name !== NPM_PACKAGE_NAME ||
    !isValidSemVer(evidence.package_version) ||
    !MODE_VALUES.has(evidence.mode) ||
    (evidence.mode === "release" && evidence.release_tag !== `v${evidence.package_version}`) ||
    (evidence.mode === "candidate" && evidence.release_tag !== null) ||
    !isValidCommit(evidence.source_commit) ||
    evidence.build_mode !== "release" ||
    typeof evidence.toolchain_identifier !== "string" ||
    evidence.toolchain_identifier.length === 0
  ) fail("C ABI artifact evidence identity is invalid");
  validHash(evidence.cargo_lock_sha256, "C ABI Cargo.lock identity");
  const target = cAbiTarget(evidence.target_id);
  if (target === undefined || evidence.rust_target !== target.rust_target || evidence.runner !== target.runner || evidence.platform !== target.platform) {
    fail(`C ABI target mapping is invalid: ${evidence.target_id}`);
  }
  const fileRecord = (value, expectedFilename, label) => {
    exactKeys(value, ["filename", "sha256"], label);
    if (value.filename !== expectedFilename) fail(`${label} filename is invalid`);
    validHash(value.sha256, `${label} hash`);
  };
  fileRecord(evidence.header, HEADER_FILENAME, "C ABI header evidence");
  fileRecord(evidence.license, LICENSE_FILENAME, "C ABI license evidence");
  fileRecord(evidence.static_library, target.static_library, "C ABI static library evidence");
  fileRecord(evidence.dynamic_library, target.dynamic_library, "C ABI dynamic library evidence");
  fileRecord(evidence.archive, cAbiArchiveFilename(evidence.package_version, evidence.target_id), "C ABI archive evidence");
  if (!Array.isArray(evidence.companion_libraries) || evidence.companion_libraries.length !== target.companion_libraries.length) fail("C ABI companion library evidence is incomplete");
  const companionNames = new Set();
  for (const companion of evidence.companion_libraries) {
    fileRecord(companion, companion.filename, "C ABI companion library evidence");
    if (!target.companion_libraries.includes(companion.filename) || companionNames.has(companion.filename)) fail("C ABI companion library is unexpected or duplicated");
    companionNames.add(companion.filename);
  }
  if (target.glibc_baseline !== undefined) {
    if (evidence.glibc_baseline !== target.glibc_baseline || !/^\d+\.\d+$/.test(evidence.max_required_glibc_symbol)) fail("Linux glibc evidence is invalid");
    if (compareVersions(evidence.max_required_glibc_symbol, target.glibc_baseline) > 0) fail("Linux C ABI dynamic library exceeds the glibc 2.28 boundary");
  }
  return target;
}

function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function glibcMaximum(path) {
  let output;
  try {
    output = execFileSync("readelf", ["--version-info", path], { encoding: "utf8" });
  } catch {
    fail("Linux C ABI glibc symbol evidence is unavailable");
  }
  const versions = [...output.matchAll(/GLIBC_(\d+(?:\.\d+)+)/g)].map((match) => match[1]);
  if (versions.length === 0) fail("Linux C ABI dynamic library has no GLIBC symbol evidence");
  return versions.reduce((max, version) => compareVersions(version, max) > 0 ? version : max);
}

function prepareTargetArtifacts({
  targetId,
  rustTarget,
  runner,
  platform,
  packageVersion,
  sourceCommit,
  mode = "candidate",
  releaseTag = null,
  toolchainIdentifier,
  cargoLockSha256,
  headerPath,
  licensePath,
  staticLibraryPath,
  dynamicLibraryPath,
  companionPaths = [],
  outputDir,
  sourceRoot = repositoryRoot,
}) {
  const target = validateTargetInputs({ targetId, rustTarget, runner, platform, packageVersion, sourceCommit, mode, releaseTag, toolchainIdentifier, cargoLockSha256 });
  const expectedCompanions = target.companion_libraries;
  const suppliedCompanions = companionPaths.map((path) => basename(path));
  if (suppliedCompanions.length !== expectedCompanions.length || new Set(suppliedCompanions).size !== suppliedCompanions.length || suppliedCompanions.some((name) => !expectedCompanions.includes(name))) {
    fail(`C ABI companion library set is invalid: ${targetId}`);
  }
  for (const path of [headerPath, licensePath, staticLibraryPath, dynamicLibraryPath, ...companionPaths]) ensureFile(path, `C ABI input ${path}`);
  if (basename(headerPath) !== HEADER_FILENAME || basename(licensePath) !== LICENSE_FILENAME) fail("C ABI header or LICENSE filename is not canonical");
  const inputNames = [basename(staticLibraryPath), basename(dynamicLibraryPath), ...suppliedCompanions];
  if (inputNames.some((name) => name.endsWith(".rlib") || name.endsWith(".node") || name.endsWith(".pdb") || name.endsWith(".dSYM"))) fail("debug, rlib, or Node-API input was supplied to C ABI release preparation");
  const glibcMaxRequired = target.glibc_baseline === undefined ? undefined : glibcMaximum(dynamicLibraryPath);
  if (glibcMaxRequired !== undefined && compareVersions(glibcMaxRequired, target.glibc_baseline) > 0) fail("Linux C ABI dynamic library exceeds the glibc 2.28 boundary");
  const header = readFileSync(headerPath);
  const license = readFileSync(licensePath);
  const staticLibrary = readFileSync(staticLibraryPath);
  const dynamicLibrary = readFileSync(dynamicLibraryPath);
  const companions = new Map(companionPaths.map((path) => [basename(path), readFileSync(path)]));
  const common = commonEvidence({ target, targetId, packageVersion, sourceCommit, mode, releaseTag, toolchainIdentifier, cargoLockSha256, header, license, staticLibrary, dynamicLibrary, companions, glibcMaxRequired });
  const archiveFilename = cAbiArchiveFilename(packageVersion, targetId);
  const archiveMetadata = { ...common, archive: { filename: archiveFilename } };
  const archiveEntries = expectedArchiveEntries(target, archiveMetadata, { header, license, staticLibrary, dynamicLibrary, companions });
  const archiveBytes = createTarGz(archiveEntries);
  const evidence = { ...common, archive: { filename: archiveFilename, sha256: sha256Bytes(archiveBytes) } };
  const archivePath = resolve(outputDir, archiveFilename);
  const evidencePath = resolve(outputDir, "c-abi-artifact.json");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(archivePath, archiveBytes);
  writeJson(evidencePath, evidence);
  // The archive metadata is intentionally written before the archive digest is
  // known.  The external evidence records the digest; putting it inside the
  // archive would create a self-referential hash.
  validateTargetEvidence(evidence, { archivePath, sourceRoot, verifyVersionSources: true });
  return { evidence, archivePath, evidencePath };
}

function validateTargetEvidence(evidence, { archivePath, sourceRoot = repositoryRoot, verifyVersionSources = true } = {}) {
  const target = validateCommonEvidence(evidence);
  if (verifyVersionSources) versionGate({ sourceRoot, packageVersion: evidence.package_version, mode: evidence.mode, releaseTag: evidence.release_tag });
  ensureFile(archivePath, "C ABI target archive");
  if (basename(archivePath) !== evidence.archive.filename) fail("C ABI archive filename is not canonical");
  validHash(evidence.archive.sha256, "C ABI archive evidence");
  if (sha256File(archivePath, "C ABI target archive") !== evidence.archive.sha256) fail(`C ABI archive hash mismatch: ${evidence.target_id}`);
  const entries = parseTarGz(readFileSync(archivePath));
  const expectedNames = new Set([
    `include/${HEADER_FILENAME}`,
    `lib/static/${target.static_library}`,
    `lib/dynamic/${target.dynamic_library}`,
    ...target.companion_libraries.map((name) => `lib/dynamic/${name}`),
    LICENSE_FILENAME,
    "metadata/c-abi-artifact.json",
  ]);
  if (entries.size !== expectedNames.size || [...entries.keys()].some((name) => !expectedNames.has(name))) fail(`C ABI archive inventory is not exact: ${evidence.target_id}`);
  const expectedHashes = new Map([
    [`include/${HEADER_FILENAME}`, evidence.header.sha256],
    [`lib/static/${target.static_library}`, evidence.static_library.sha256],
    [`lib/dynamic/${target.dynamic_library}`, evidence.dynamic_library.sha256],
    ...evidence.companion_libraries.map((item) => [`lib/dynamic/${item.filename}`, item.sha256]),
    [LICENSE_FILENAME, evidence.license.sha256],
  ]);
  for (const [name, expectedHash] of expectedHashes) {
    if (sha256Bytes(entries.get(name)) !== expectedHash) fail(`C ABI archive entry hash mismatch: ${evidence.target_id}/${name}`);
  }
  const metadata = readJsonFromBytes(entries.get("metadata/c-abi-artifact.json"), "C ABI archive metadata");
  exactKeys(metadata, [
    "schema_version", "artifact_kind", "project_name", "package_name", "npm_package_name", "package_version",
    "mode", "release_tag", "source_commit", "target_id", "rust_target", "runner", "platform",
    "toolchain_identifier", "build_mode", "cargo_lock_sha256", "header", "license", "static_library",
    "dynamic_library", "companion_libraries", ...(target.glibc_baseline === undefined ? [] : ["glibc_baseline", "max_required_glibc_symbol"]), "archive",
  ], "C ABI archive metadata");
  const expectedMetadata = { ...evidence, archive: { filename: evidence.archive.filename } };
  if (JSON.stringify(metadata) !== JSON.stringify(expectedMetadata)) fail(`C ABI archive metadata identity mismatch: ${evidence.target_id}`);
  return evidence;
}

function readJsonFromBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${label} is malformed`);
  }
}

function validateTargetEvidenceSet(entries, { sourceRoot = repositoryRoot, packageVersion, sourceCommit, mode = "candidate", releaseTag = null } = {}) {
  if (!Array.isArray(entries)) fail("C ABI target evidence set is not an array");
  if (entries.length !== C_ABI_TARGET_ORDER.length) fail("C ABI target set is incomplete or contains unexpected targets");
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.evidence.target_id)) fail(`duplicate C ABI target: ${entry.evidence.target_id}`);
    seen.add(entry.evidence.target_id);
    if (!C_ABI_TARGET_ORDER.includes(entry.evidence.target_id)) fail(`unexpected C ABI target: ${entry.evidence.target_id}`);
    validateTargetEvidence(entry.evidence, { archivePath: entry.archivePath, sourceRoot, verifyVersionSources: false });
    if (entry.evidence.package_version !== packageVersion || entry.evidence.source_commit !== sourceCommit || entry.evidence.mode !== mode || entry.evidence.release_tag !== releaseTag) fail("C ABI target evidence identity differs across targets");
  }
  for (const targetId of C_ABI_TARGET_ORDER) if (!seen.has(targetId)) fail(`missing C ABI target: ${targetId}`);
  if (packageVersion !== undefined) versionGate({ sourceRoot, packageVersion, mode, releaseTag });
  return entries;
}

function evidenceFileRecord(filename, path) {
  return { filename, sha256: sha256File(path, filename) };
}

function validateEvidenceSumFile(path, expected, label) {
  let contents;
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    fail(`${label} is unreadable`);
  }
  const actual = contents.split("\n").filter((line) => line.length > 0);
  if (actual.length !== expected.length || actual.some((line, index) => line !== `${expected[index].hash}  ${expected[index].filename}`)) fail(`${label} differs from its evidence files`);
}

function renderCAbiSums(manifestPath, manifest, outputDir) {
  const records = [];
  for (const target of manifest.targets) {
    records.push({ filename: target.archive.filename, path: resolve(outputDir, target.archive.filename), hash: target.archive.sha256 });
    records.push({ filename: target.evidence.filename, path: resolve(outputDir, target.evidence.filename), hash: target.evidence.sha256 });
  }
  for (const evidence of Object.values(manifest.evidence)) {
    records.push({ filename: evidence.filename, path: resolve(outputDir, evidence.filename), hash: evidence.sha256 });
  }
  records.push({ filename: basename(manifestPath), path: manifestPath, hash: sha256File(manifestPath, basename(manifestPath)) });
  return `${records.map((record) => `${record.hash}  ${record.filename}`).join("\n")}\n`;
}

function aggregateCAbiArtifacts({
  inputDir,
  outputDir,
  packageVersion,
  sourceCommit,
  mode = "candidate",
  releaseTag = null,
  sourceRoot = repositoryRoot,
  evidencePaths,
  releaseIdentityPath = null,
  npmReleaseManifestPath = null,
}) {
  versionGate({ sourceRoot, packageVersion, mode, releaseTag });
  validCommit(sourceCommit, "aggregate source commit");
  if (mode === "release") {
    if (typeof releaseIdentityPath !== "string") fail("formal C ABI release identity evidence is required");
    const identity = readJson(releaseIdentityPath, "release identity evidence");
    if (
      identity.kind !== "release-identity" ||
      identity.mode !== "release" ||
      identity.package_name !== NPM_PACKAGE_NAME ||
      identity.version !== packageVersion ||
      identity.tag !== releaseTag ||
      identity.source_commit !== sourceCommit ||
      identity.checkout_head !== sourceCommit ||
      identity.tag_commit !== sourceCommit ||
      identity.main_ancestry !== true ||
      identity.clean !== true ||
      !isPlainObject(identity.version_sources) ||
      Object.values(identity.version_sources).some((entry) => entry.version !== packageVersion)
    ) fail("formal release identity evidence does not match C ABI assets");
    if (typeof npmReleaseManifestPath !== "string") fail("formal npm release manifest evidence is required");
    const npmManifest = readJson(npmReleaseManifestPath, "npm release manifest evidence");
    if (
      npmManifest.schema_version !== 1 ||
      npmManifest.mode !== "release" ||
      npmManifest.package_name !== NPM_PACKAGE_NAME ||
      npmManifest.package_version !== packageVersion ||
      npmManifest.release_tag !== releaseTag ||
      npmManifest.source_commit !== sourceCommit
    ) fail("npm release manifest identity does not match C ABI assets");
  }
  const directories = readdirSync(inputDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const expectedDirectories = [...C_ABI_TARGET_ORDER].sort();
  if (JSON.stringify(directories) !== JSON.stringify(expectedDirectories)) fail("C ABI aggregate target directories are incomplete or unexpected");
  const targetEntries = [];
  for (const targetId of C_ABI_TARGET_ORDER) {
    const targetDir = resolve(inputDir, targetId);
    const files = readdirSync(targetDir, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    const archiveFilename = cAbiArchiveFilename(packageVersion, targetId);
    if (JSON.stringify(files) !== JSON.stringify([archiveFilename, "c-abi-artifact.json"].sort())) fail(`C ABI target output contains unexpected files: ${targetId}`);
    const evidencePath = resolve(targetDir, "c-abi-artifact.json");
    const archivePath = resolve(targetDir, archiveFilename);
    const evidence = readJson(evidencePath, `C ABI evidence ${targetId}`);
    if (evidence.target_id !== targetId || evidence.package_version !== packageVersion || evidence.source_commit !== sourceCommit || evidence.mode !== mode || evidence.release_tag !== releaseTag) fail(`C ABI target identity mismatch: ${targetId}`);
    validateTargetEvidence(evidence, { archivePath, sourceRoot, verifyVersionSources: false });
    targetEntries.push({ evidence, archivePath, evidencePath });
  }
  validateTargetEvidenceSet(targetEntries, { sourceRoot, packageVersion, sourceCommit, mode, releaseTag });
  const requiredEvidence = ["sbom", "inventory", "sbom_sums", "policy", "third_party", "policy_sums"];
  if (!isPlainObject(evidencePaths) || requiredEvidence.some((key) => typeof evidencePaths[key] !== "string")) fail("C ABI license/SBOM evidence paths are incomplete");
  for (const path of Object.values(evidencePaths)) ensureFile(path, "C ABI release evidence");
  const sbom = readJson(evidencePaths.sbom, "C ABI SBOM");
  const inventory = readJson(evidencePaths.inventory, "C ABI license inventory");
  const policy = readJson(evidencePaths.policy, "C ABI license policy");
  const thirdParty = readJson(evidencePaths.third_party, "C ABI third-party license evidence");
  validateCAbiEvidenceIdentity({ sbom, inventory, policy, thirdParty, packageVersion, sourceCommit, mode, releaseTag });
  const cargoLockIdentity = targetEntries[0].evidence.cargo_lock_sha256;
  if (targetEntries.some((entry) => entry.evidence.cargo_lock_sha256 !== cargoLockIdentity) || inventory.cargo_lock_sha256 !== cargoLockIdentity || !sbom.documentNamespace.includes(`${packageVersion}-${sourceCommit}`)) fail("C ABI SBOM/license evidence lockfile or source identity mismatch");
  if (policy.inventory_sha256 !== sha256File(evidencePaths.inventory, "C ABI license inventory") || policy.sbom_sha256 !== sha256File(evidencePaths.sbom, "C ABI SBOM") || thirdParty.inventory_sha256 !== policy.inventory_sha256) fail("C ABI SBOM/license evidence digest mismatch");
  validateEvidenceSumFile(evidencePaths.sbom_sums, [
    { hash: sha256File(evidencePaths.sbom, "C ABI SBOM"), filename: "c-abi-sbom.spdx.json" },
    { hash: sha256File(evidencePaths.inventory, "C ABI license inventory"), filename: "c-abi-license-inventory.json" },
  ], "C-ABI-SBOM-SHA256SUMS");
  validateEvidenceSumFile(evidencePaths.policy_sums, [
    { hash: sha256File(evidencePaths.policy, "C ABI license policy"), filename: "c-abi-license-policy.json" },
    { hash: sha256File(evidencePaths.third_party, "C ABI third-party license evidence"), filename: "c-abi-third-party-licenses.json" },
  ], "C-ABI-LICENSE-POLICY-SHA256SUMS");
  mkdirSync(outputDir, { recursive: true });
  const copiedTargets = targetEntries.map(({ evidence, archivePath, evidencePath }) => {
    const archiveName = basename(archivePath);
    const targetEvidenceName = `c-abi-artifact-${evidence.target_id}.json`;
    copyFileSync(archivePath, resolve(outputDir, archiveName));
    copyFileSync(evidencePath, resolve(outputDir, targetEvidenceName));
    return {
      target_id: evidence.target_id,
      rust_target: evidence.rust_target,
      runner: evidence.runner,
      platform: evidence.platform,
      archive: { filename: archiveName, sha256: evidence.archive.sha256 },
      evidence: { filename: targetEvidenceName, sha256: sha256File(resolve(outputDir, targetEvidenceName), targetEvidenceName) },
      static_library: evidence.static_library,
      dynamic_library: evidence.dynamic_library,
      companion_libraries: evidence.companion_libraries,
      header: evidence.header,
    };
  });
  const evidenceAssetNames = {
    sbom: "c-abi-sbom.spdx.json",
    inventory: "c-abi-license-inventory.json",
    sbom_sums: "C-ABI-SBOM-SHA256SUMS",
    policy: "c-abi-license-policy.json",
    third_party: "c-abi-third-party-licenses.json",
    policy_sums: "C-ABI-LICENSE-POLICY-SHA256SUMS",
  };
  const copiedEvidence = {};
  for (const [key, sourcePath] of Object.entries(evidencePaths)) {
    const filename = evidenceAssetNames[key];
    const destination = resolve(outputDir, filename);
    copyFileSync(sourcePath, destination);
    copiedEvidence[key] = evidenceFileRecord(filename, destination);
  }
  const headerHashes = new Set(copiedTargets.map((entry) => entry.header.sha256));
  if (headerHashes.size !== 1) fail("C ABI public header identity differs across targets");
  const manifest = {
    schema_version: SCHEMA_VERSION,
    artifact_kind: "c-abi-release-manifest",
    project_name: PROJECT_NAME,
    package_name: C_ABI_PACKAGE_NAME,
    npm_package_name: NPM_PACKAGE_NAME,
    package_version: packageVersion,
    mode,
    release_tag: releaseTag,
    source_commit: sourceCommit,
    cargo_lock_sha256: targetEntries[0].evidence.cargo_lock_sha256,
    archive_format: ARCHIVE_FORMAT,
    header: { filename: HEADER_FILENAME, sha256: [...headerHashes][0] },
    target_order: [...C_ABI_TARGET_ORDER],
    targets: copiedTargets,
    evidence: copiedEvidence,
  };
  const manifestPath = resolve(outputDir, "c-abi-release-manifest.json");
  writeJson(manifestPath, manifest);
  writeFileSync(resolve(outputDir, "C-ABI-SHA256SUMS"), renderCAbiSums(manifestPath, manifest, outputDir));
  return { manifest, manifestPath, sumsPath: resolve(outputDir, "C-ABI-SHA256SUMS") };
}

function argumentValue(argv, name, fallback = undefined) {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  if (argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
  return argv[index + 1];
}

function repeatedArguments(argv, name) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== name) continue;
    if (argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
    values.push(argv[index + 1]);
    index += 1;
  }
  return values;
}

function resolved(value, label) {
  if (typeof value !== "string") fail(`missing ${label}`);
  return resolve(repositoryRoot, value);
}

function run() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (command === "cargo-lock-sha256") {
    process.stdout.write(`${cargoLockDigest()}\n`);
    return;
  }
  if (command === "prepare-target") {
    prepareTargetArtifacts({
      targetId: argumentValue(argv, "--target-id"),
      rustTarget: argumentValue(argv, "--rust-target"),
      runner: argumentValue(argv, "--runner"),
      platform: argumentValue(argv, "--platform"),
      packageVersion: argumentValue(argv, "--package-version"),
      sourceCommit: argumentValue(argv, "--source-commit"),
      mode: argumentValue(argv, "--mode", "candidate"),
      releaseTag: argumentValue(argv, "--release-tag", null),
      toolchainIdentifier: argumentValue(argv, "--toolchain"),
      cargoLockSha256: argumentValue(argv, "--cargo-lock-sha256"),
      headerPath: resolved(argumentValue(argv, "--header"), "--header"),
      licensePath: resolved(argumentValue(argv, "--license"), "--license"),
      staticLibraryPath: resolved(argumentValue(argv, "--static-lib"), "--static-lib"),
      dynamicLibraryPath: resolved(argumentValue(argv, "--dynamic-lib"), "--dynamic-lib"),
      companionPaths: repeatedArguments(argv, "--companion").map((value) => resolved(value, "--companion")),
      outputDir: resolved(argumentValue(argv, "--output"), "--output"),
    });
    return;
  }
  if (command === "aggregate") {
    const output = resolved(argumentValue(argv, "--output"), "--output");
    aggregateCAbiArtifacts({
      inputDir: resolved(argumentValue(argv, "--input"), "--input"),
      outputDir: output,
      packageVersion: argumentValue(argv, "--package-version"),
      sourceCommit: argumentValue(argv, "--source-commit"),
      mode: argumentValue(argv, "--mode", "candidate"),
      releaseTag: argumentValue(argv, "--release-tag", null),
      evidencePaths: {
        sbom: resolved(argumentValue(argv, "--sbom"), "--sbom"),
        inventory: resolved(argumentValue(argv, "--inventory"), "--inventory"),
        sbom_sums: resolved(argumentValue(argv, "--sbom-sums"), "--sbom-sums"),
        policy: resolved(argumentValue(argv, "--policy"), "--policy"),
        third_party: resolved(argumentValue(argv, "--third-party"), "--third-party"),
        policy_sums: resolved(argumentValue(argv, "--policy-sums"), "--policy-sums"),
      },
      releaseIdentityPath: argumentValue(argv, "--release-identity", null) === null ? null : resolved(argumentValue(argv, "--release-identity"), "--release-identity"),
      npmReleaseManifestPath: argumentValue(argv, "--npm-manifest", null) === null ? null : resolved(argumentValue(argv, "--npm-manifest"), "--npm-manifest"),
    });
    return;
  }
  fail("usage: prepare-target | aggregate");
}

export {
  ARCHIVE_FORMAT,
  C_ABI_PACKAGE_NAME,
  C_ABI_TARGET_ORDER,
  C_ABI_TARGETS,
  aggregateCAbiArtifacts,
  cAbiArchiveFilename,
  createTarGz,
  parseTarGz,
  prepareTargetArtifacts,
  validateTargetEvidence,
  validateTargetEvidenceSet,
};

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

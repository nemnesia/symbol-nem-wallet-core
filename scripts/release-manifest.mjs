import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_TARGET_ORDER,
  NATIVE_TARGETS,
  validateNativeManifest,
} from "../packages/wallet-core/src/manifest.mjs";
import {
  cargoLockSha256,
  pnpmLockSha256,
  wasmBindgenVersionFromCanonicalLock,
} from "./release-evidence.mjs";
import { isValidSemVer, parseSemVer } from "./release-identity.mjs";
import { validatePackageContents } from "./package-contents.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageName = "@nemnesia/symbol-nem-wallet-core";
const WASM_FILENAME = "symbol_nem_wallet_core_wasm_bg.wasm";
const MANIFEST_FILENAME = "release-manifest.json";
const DIGEST_FILENAME = "SHA256SUMS";
const REQUIRED_TARGETS = [...CANONICAL_TARGET_ORDER];
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const VERSION_PATTERN = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const npmAssemblyCommand = [
  "node scripts/build-npm-package.mjs",
  "--wasm <canonical-wasm-source>",
  "--wasm-bindgen-bin <lockfile-matched-wasm-bindgen>",
  ...REQUIRED_TARGETS.map((targetId) => `--native-artifact ${targetId}=<normalized-native-artifact>`),
].join(" ");

export const CANONICAL_BUILD_STEPS = Object.freeze([
  Object.freeze({
    id: "native",
    command: "cargo build --package symbol-nem-wallet-core-node --target <rust-target> --release --locked",
  }),
  Object.freeze({
    id: "wasm",
    command: "cargo build --package symbol-nem-wallet-core-wasm --target wasm32-unknown-unknown --release --locked",
  }),
  Object.freeze({
    id: "workspace-install",
    command: "corepack pnpm install --frozen-lockfile --ignore-scripts",
  }),
  Object.freeze({
    id: "npm-assembly",
    command: npmAssemblyCommand,
  }),
  Object.freeze({
    id: "npm-pack",
    command: "npm pack --json --ignore-scripts --pack-destination <release-output> ./packages/wallet-core",
  }),
]);

function fail(message) {
  throw new Error(`Release manifest gate failed: ${message}`);
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

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} is invalid`);
  return value;
}

function validCommit(value, label) {
  if (typeof value !== "string" || !COMMIT_PATTERN.test(value)) fail(`${label} is invalid`);
}

function validHash(value, label) {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) fail(`${label} is invalid`);
}

function validSize(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} is invalid`);
}

function validVersion(value, label) {
  if (!isValidSemVer(value)) fail(`${label} is invalid`);
}

function safeRelativePath(value, label) {
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

function json(path, label = path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`${label} is unreadable or malformed`);
  }
}

function bytes(path, label = path) {
  try {
    return readFileSync(path);
  } catch {
    fail(`${label} is unreadable`);
  }
}

function fileSize(path, label = path) {
  try {
    const value = statSync(path);
    if (!value.isFile()) fail(`${label} is not a file`);
    return value.size;
  } catch {
    fail(`${label} is missing`);
  }
}

function sha256(path, label = path) {
  return createHash("sha256").update(bytes(path, label)).digest("hex");
}

function readCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    fail("checked out source commit is unavailable");
  }
}

function packageMetadata(packageRoot) {
  const metadata = json(resolve(packageRoot, "package.json"), "npm package metadata");
  exactKeys(metadata, ["name", "version", "description", "license", "type", "types", "main", "module", "exports", "engines", "files"], "npm package metadata");
  if (metadata.name !== packageName) fail("npm package name is unexpected");
  validVersion(metadata.version, "npm package version");
  return metadata;
}

function readSourceEvidence(path) {
  const source = json(path, "source evidence");
  exactKeys(source, [
    "source_commit",
    "package_name",
    "package_version",
    "cargo_lock_sha256",
    "pnpm_lock_sha256",
    "required_native_targets",
  ], "source evidence");
  validCommit(source.source_commit, "source evidence source commit");
  if (source.package_name !== packageName) fail("source evidence package name differs");
  validVersion(source.package_version, "source evidence package version");
  validHash(source.cargo_lock_sha256, "source evidence Cargo.lock digest");
  validHash(source.pnpm_lock_sha256, "source evidence pnpm-lock.yaml digest");
  if (
    !Array.isArray(source.required_native_targets) ||
    source.required_native_targets.length !== REQUIRED_TARGETS.length ||
    source.required_native_targets.some((target, index) => target !== REQUIRED_TARGETS[index])
  ) {
    fail("source evidence native target order is invalid");
  }
  if (source.cargo_lock_sha256 !== cargoLockSha256()) fail("source evidence Cargo.lock digest differs from canonical source");
  if (source.pnpm_lock_sha256 !== pnpmLockSha256()) fail("source evidence pnpm-lock.yaml digest differs from canonical source");
  if (source.source_commit !== readCommit()) fail("source evidence commit differs from checked out source");
  return source;
}

function expectedNativeEvidenceKeys(targetId) {
  const keys = [
    "schema_version",
    "kind",
    "target_id",
    "rust_target",
    "source_commit",
    "package_version",
    "cargo_lock_sha256",
    "artifact_filename",
    "artifact_sha256",
    "artifact_size",
    "node_api_version",
    "toolchain_identifier",
  ];
  if (targetId === "linux-x64-gnu") {
    keys.push("glibc_version_runtime", "max_required_glibc_symbol");
  }
  return keys;
}

function compareNativeEvidence(left, right, targetId) {
  const keys = expectedNativeEvidenceKeys(targetId);
  for (const key of keys) {
    if (left[key] !== right[key]) fail(`native evidence differs for ${targetId}`);
  }
}

function validateNativeEvidence(evidence, targetId, source, packageVersion, nativeRoot) {
  exactKeys(evidence, expectedNativeEvidenceKeys(targetId), `native evidence ${targetId}`);
  const target = NATIVE_TARGETS[targetId];
  if (
    evidence.schema_version !== 1 ||
    evidence.kind !== "native" ||
    evidence.target_id !== targetId ||
    evidence.rust_target !== target.rust_target ||
    evidence.source_commit !== source.source_commit ||
    evidence.package_version !== packageVersion ||
    evidence.cargo_lock_sha256 !== source.cargo_lock_sha256 ||
    evidence.node_api_version !== 8 ||
    typeof evidence.toolchain_identifier !== "string" ||
    evidence.toolchain_identifier.length === 0
  ) {
    fail(`native evidence identity mismatch: ${targetId}`);
  }
  if (evidence.artifact_filename !== `${targetId}.node`) fail(`native evidence filename mismatch: ${targetId}`);
  validHash(evidence.artifact_sha256, `native evidence hash ${targetId}`);
  validSize(evidence.artifact_size, `native evidence size ${targetId}`);
  const artifactPath = resolve(nativeRoot, evidence.artifact_filename);
  if (!existsSync(artifactPath)) fail(`native evidence artifact is missing: ${targetId}`);
  if (sha256(artifactPath) !== evidence.artifact_sha256) fail(`native evidence artifact hash mismatch: ${targetId}`);
  if (fileSize(artifactPath) !== evidence.artifact_size) fail(`native evidence artifact size mismatch: ${targetId}`);

  if (targetId === "linux-x64-gnu") {
    if (!/^\d+\.\d+$/.test(evidence.glibc_version_runtime)) fail("Linux runtime glibc evidence is invalid");
    if (!/^\d+(?:\.\d+)+$/.test(evidence.max_required_glibc_symbol)) fail("Linux required GLIBC evidence is invalid");
    const [runtimeMajor, runtimeMinor] = evidence.glibc_version_runtime.split(".").map(Number);
    if (runtimeMajor < 2 || runtimeMajor === 2 && runtimeMinor < 28) fail("Linux runtime glibc is below 2.28");
    const required = evidence.max_required_glibc_symbol.split(".").map(Number);
    if (required[0] > 2 || required[0] === 2 && (required[1] ?? 0) > 28) {
      fail("Linux artifact requires GLIBC newer than 2.28");
    }
  }
}

function readNativeEvidenceSet(nativeSummaryPath, nativeEvidenceRoot, source, packageVersion) {
  const summary = json(nativeSummaryPath, "native summary");
  exactKeys(summary, [
    "source_commit",
    "package_version",
    "cargo_lock_sha256",
    "native_artifact_count",
    "targets",
    "toolchain_identifier",
  ], "native summary");
  if (
    summary.source_commit !== source.source_commit ||
    summary.package_version !== packageVersion ||
    summary.cargo_lock_sha256 !== source.cargo_lock_sha256 ||
    !Number.isInteger(summary.native_artifact_count) ||
    summary.native_artifact_count !== REQUIRED_TARGETS.length ||
    !Array.isArray(summary.targets) ||
    summary.targets.length !== REQUIRED_TARGETS.length ||
    typeof summary.toolchain_identifier !== "string" ||
    summary.toolchain_identifier.length === 0
  ) {
    fail("native summary identity or target count is invalid");
  }

  const entries = [];
  for (const [index, targetId] of REQUIRED_TARGETS.entries()) {
    const evidence = summary.targets[index];
    const supplied = json(resolve(nativeEvidenceRoot, `${targetId}.json`), `native evidence ${targetId}`);
    validateNativeEvidence(evidence, targetId, source, packageVersion, nativeEvidenceRoot);
    compareNativeEvidence(evidence, supplied, targetId);
    if (summary.toolchain_identifier !== evidence.toolchain_identifier) fail(`native toolchain mismatch: ${targetId}`);
    entries.push(evidence);
  }
  if (new Set(entries.map((entry) => entry.artifact_filename)).size !== entries.length) {
    fail("native artifact filename collision");
  }
  return { summary, entries };
}

function validateWasmEvidence(evidence, source, packageVersion, wasmSourcePath) {
  exactKeys(evidence, [
    "schema_version",
    "kind",
    "source_commit",
    "package_version",
    "cargo_lock_sha256",
    "artifact_filename",
    "artifact_sha256",
    "artifact_size",
    "toolchain_identifier",
  ], "WASM evidence");
  if (
    evidence.schema_version !== 1 ||
    evidence.kind !== "wasm" ||
    evidence.source_commit !== source.source_commit ||
    evidence.package_version !== packageVersion ||
    evidence.cargo_lock_sha256 !== source.cargo_lock_sha256 ||
    evidence.artifact_filename !== basename(wasmSourcePath) ||
    typeof evidence.toolchain_identifier !== "string" ||
    evidence.toolchain_identifier.length === 0
  ) {
    fail("WASM evidence identity mismatch");
  }
  validHash(evidence.artifact_sha256, "WASM evidence hash");
  validSize(evidence.artifact_size, "WASM evidence size");
  if (sha256(wasmSourcePath) !== evidence.artifact_sha256) fail("WASM source artifact hash mismatch");
  if (fileSize(wasmSourcePath) !== evidence.artifact_size) fail("WASM source artifact size mismatch");
}

function validateWasmBindgenEvidence(evidence) {
  exactKeys(evidence, ["cargo_lock_version", "cli_version", "version_match"], "wasm-bindgen evidence");
  if (
    !/^\d+\.\d+\.\d+$/.test(evidence.cargo_lock_version) ||
    evidence.cargo_lock_version !== wasmBindgenVersionFromCanonicalLock() ||
    evidence.cli_version !== evidence.cargo_lock_version ||
    evidence.version_match !== true
  ) {
    fail("wasm-bindgen toolchain evidence mismatch");
  }
  return evidence;
}

function packageRuntimeManifest(packageRoot, metadata, source, nativeEntries) {
  const manifestPath = resolve(packageRoot, "dist/native/artifact-manifest.json");
  const manifest = json(manifestPath, "runtime native artifact manifest");
  try {
    validateNativeManifest(manifest, metadata);
  } catch {
    fail("runtime native artifact manifest is invalid");
  }
  if (manifest.artifacts.length !== REQUIRED_TARGETS.length) fail("runtime native artifact count is not exactly four");
  if (manifest.source_commit !== source.source_commit || manifest.package_version !== metadata.version) {
    fail("runtime native artifact manifest source/version mismatch");
  }
  for (const [index, targetId] of REQUIRED_TARGETS.entries()) {
    const runtime = manifest.artifacts[index];
    const evidence = nativeEntries[index];
    const expectedPath = `dist/native/${targetId}/${targetId}.node`;
    if (
      runtime.target_id !== targetId ||
      runtime.rust_target !== evidence.rust_target ||
      runtime.relative_path !== expectedPath ||
      runtime.artifact_filename !== `${targetId}.node` ||
      runtime.sha256 !== evidence.artifact_sha256 ||
      runtime.toolchain_identifier !== evidence.toolchain_identifier
    ) {
      fail(`runtime native artifact mismatch: ${targetId}`);
    }
    const artifactPath = resolve(packageRoot, runtime.relative_path);
    if (!existsSync(artifactPath)) fail(`assembled native artifact is missing: ${targetId}`);
    if (sha256(artifactPath) !== evidence.artifact_sha256) fail(`assembled native artifact hash mismatch: ${targetId}`);
    if (fileSize(artifactPath) !== evidence.artifact_size) fail(`assembled native artifact size mismatch: ${targetId}`);
  }
  try {
    validatePackageContents(packageRoot, manifest);
  } catch {
    fail("assembled npm package contents are invalid");
  }
  return manifest;
}

function tarballMetadata(tarballPath) {
  let listing;
  try {
    listing = execFileSync("tar", ["-tzf", tarballPath], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
  } catch {
    fail("npm tarball is corrupt or unreadable");
  }
  const names = listing.split(/\r?\n/).filter((name) => name.length > 0);
  for (const name of names) {
    if (name.startsWith("/") || name.includes("\\") || name.split("/").some((part) => part === "..")) {
      fail("npm tarball contains an unsafe path");
    }
  }
  if (names.filter((name) => name === "package/package.json").length !== 1) {
    fail("npm tarball package metadata is missing or duplicated");
  }
  let metadata;
  try {
    metadata = JSON.parse(execFileSync("tar", ["-xOf", tarballPath, "package/package.json"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }));
  } catch {
    fail("npm tarball package metadata is unreadable");
  }
  if (!isPlainObject(metadata) || metadata.name !== packageName || typeof metadata.version !== "string") {
    fail("npm tarball package metadata identity is invalid");
  }
  validVersion(metadata.version, "npm tarball package version");
  return metadata;
}

function actualToolVersion(command, args, label) {
  try {
    const output = execFileSync(command, args, {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
    if (output.length === 0 || output.includes("\n") || output.includes("\r")) fail(`${label} is ambiguous`);
    return output;
  } catch {
    fail(`${label} is unavailable`);
  }
}

export function actualToolchains(wasmBindgenEvidence) {
  validateWasmBindgenEvidence(wasmBindgenEvidence);
  return {
    rust: { identifier: undefined },
    node: { version: process.version },
    npm: { version: actualToolVersion(process.platform === "win32" ? "npm.cmd" : "npm", ["--version"], "npm version") },
    pnpm: { version: actualToolVersion("corepack", ["pnpm", "--version"], "pnpm version") },
    wasm_bindgen: {
      cargo_lock_version: wasmBindgenEvidence.cargo_lock_version,
      cli_version: wasmBindgenEvidence.cli_version,
    },
  };
}

function validateToolchains(toolchains, nativeSummary, wasmSummary, wasmBindgen) {
  exactKeys(toolchains, ["rust", "node", "npm", "pnpm", "wasm_bindgen"], "toolchains");
  exactKeys(toolchains.rust, ["identifier"], "Rust toolchain");
  exactKeys(toolchains.node, ["version"], "Node.js toolchain");
  exactKeys(toolchains.npm, ["version"], "npm toolchain");
  exactKeys(toolchains.pnpm, ["version"], "pnpm toolchain");
  exactKeys(toolchains.wasm_bindgen, ["cargo_lock_version", "cli_version"], "wasm-bindgen toolchain");
  requiredString(toolchains.rust.identifier, "Rust toolchain identifier");
  if (toolchains.rust.identifier !== nativeSummary.toolchain_identifier || toolchains.rust.identifier !== wasmSummary.toolchain_identifier) {
    fail("Rust toolchain differs between native and WASM evidence");
  }
  if (!/^v\d+\.\d+\.\d+/.test(toolchains.node.version)) fail("Node.js version is invalid");
  if (!/^\d+\.\d+\.\d+$/.test(toolchains.npm.version)) fail("npm version is invalid");
  if (!/^\d+\.\d+\.\d+$/.test(toolchains.pnpm.version)) fail("pnpm version is invalid");
  if (
    toolchains.wasm_bindgen.cargo_lock_version !== wasmBindgen.cargo_lock_version ||
    toolchains.wasm_bindgen.cli_version !== wasmBindgen.cli_version
  ) {
    fail("wasm-bindgen toolchain summary differs from evidence");
  }
}

function validateBuildSteps(buildSteps) {
  if (!Array.isArray(buildSteps) || buildSteps.length !== CANONICAL_BUILD_STEPS.length) fail("build steps are incomplete");
  for (const [index, step] of buildSteps.entries()) {
    exactKeys(step, ["id", "command"], `build step ${index}`);
    if (
      step.id !== CANONICAL_BUILD_STEPS[index].id ||
      step.command !== CANONICAL_BUILD_STEPS[index].command
    ) {
      fail(`build step ${index} differs from the canonical workflow command`);
    }
  }
}

function validateEvidenceReferences(evidence) {
  exactKeys(evidence, ["source", "native_summary", "native_artifacts", "wasm_summary", "wasm_artifact", "wasm_bindgen"], "evidence references");
  for (const key of ["source", "native_summary", "wasm_summary", "wasm_artifact", "wasm_bindgen"]) {
    safeRelativePath(evidence[key], `evidence reference ${key}`);
  }
  exactKeys(evidence.native_artifacts, REQUIRED_TARGETS, "native evidence references");
  for (const targetId of REQUIRED_TARGETS) safeRelativePath(evidence.native_artifacts[targetId], `native evidence reference ${targetId}`);
  if (
    evidence.source !== "release-source.json" ||
    evidence.native_summary !== "native-summary.json" ||
    evidence.wasm_summary !== "wasm-summary.json" ||
    evidence.wasm_artifact !== "wasm-evidence.json" ||
    evidence.wasm_bindgen !== "wasm-bindgen-version.json"
  ) {
    fail("evidence references are not canonical");
  }
  for (const targetId of REQUIRED_TARGETS) {
    if (evidence.native_artifacts[targetId] !== `${targetId}.json`) fail(`native evidence reference is not canonical: ${targetId}`);
  }
}

function validateManifestShape(manifest) {
  if (!isPlainObject(manifest)) fail("release manifest is not an object");
  const rootKeys = [
    "schema_version",
    "mode",
    "package_name",
    "package_version",
    "source_commit",
    "cargo_lock_sha256",
    "pnpm_lock_sha256",
    "toolchains",
    "build_steps",
    "native_artifacts",
    "wasm",
    "npm_tarball",
    "digest_file",
    "evidence",
  ];
  if (manifest.mode === "release") rootKeys.push("release_tag");
  exactKeys(manifest, rootKeys, "release manifest");
  if (manifest.schema_version !== 1 || (manifest.mode !== "candidate" && manifest.mode !== "release")) fail("unsupported release manifest schema or mode");
  if (manifest.mode === "candidate") {
    if (Object.prototype.hasOwnProperty.call(manifest, "release_tag")) fail("candidate manifest must not contain a release tag");
  } else {
    if (manifest.release_tag !== `v${manifest.package_version}`) fail("release tag/version mismatch");
    if (!isValidSemVer(manifest.package_version) || parseSemVer(manifest.package_version).prerelease !== null) fail("formal release version is not an exact non-prerelease SemVer");
    if (!VERSION_PATTERN.test(manifest.release_tag)) fail("release tag is invalid");
  }
  if (manifest.package_name !== packageName) fail("release manifest package name is invalid");
  validVersion(manifest.package_version, "release manifest package version");
  validCommit(manifest.source_commit, "release manifest source commit");
  validHash(manifest.cargo_lock_sha256, "release manifest Cargo.lock digest");
  validHash(manifest.pnpm_lock_sha256, "release manifest pnpm-lock.yaml digest");
  if (manifest.digest_file !== DIGEST_FILENAME) fail("release manifest digest filename is invalid");
  validateBuildSteps(manifest.build_steps);
  validateEvidenceReferences(manifest.evidence);
  if (!Array.isArray(manifest.native_artifacts) || manifest.native_artifacts.length !== REQUIRED_TARGETS.length) fail("release manifest native artifact count is not exactly four");

  const nativeNames = new Set();
  const nativePaths = new Set();
  for (const [index, targetId] of REQUIRED_TARGETS.entries()) {
    const artifact = manifest.native_artifacts[index];
    const target = NATIVE_TARGETS[targetId];
    const keys = ["target_id", "rust_target", "artifact_filename", "relative_path", "sha256", "size", "source_commit", "package_version", "toolchain_identifier"];
    if (targetId === "linux-x64-gnu") keys.push("glibc_version_runtime", "max_required_glibc_symbol");
    exactKeys(artifact, keys, `release native artifact ${targetId}`);
    if (
      artifact.target_id !== targetId ||
      artifact.rust_target !== target.rust_target ||
      artifact.artifact_filename !== `${targetId}.node` ||
      artifact.relative_path !== `dist/native/${targetId}/${targetId}.node` ||
      artifact.source_commit !== manifest.source_commit ||
      artifact.package_version !== manifest.package_version ||
      typeof artifact.toolchain_identifier !== "string" ||
      artifact.toolchain_identifier.length === 0
    ) {
      fail(`release native artifact identity mismatch: ${targetId}`);
    }
    safeRelativePath(artifact.relative_path, `release native artifact path ${targetId}`);
    validHash(artifact.sha256, `release native artifact hash ${targetId}`);
    validSize(artifact.size, `release native artifact size ${targetId}`);
    if (nativeNames.has(artifact.artifact_filename) || nativePaths.has(artifact.relative_path)) fail("duplicate native artifact name or path");
    nativeNames.add(artifact.artifact_filename);
    nativePaths.add(artifact.relative_path);
    if (targetId === "linux-x64-gnu") {
      if (!/^\d+\.\d+$/.test(artifact.glibc_version_runtime) || !/^\d+(?:\.\d+)+$/.test(artifact.max_required_glibc_symbol)) fail("Linux glibc evidence is invalid");
    }
  }

  exactKeys(manifest.wasm, ["source_artifact", "canonical_artifact", "wasm_bindgen"], "release WASM identity");
  exactKeys(manifest.wasm.source_artifact, ["artifact_filename", "sha256", "size", "source_commit", "package_version", "cargo_lock_sha256", "toolchain_identifier"], "raw WASM artifact identity");
  exactKeys(manifest.wasm.canonical_artifact, ["artifact_filename", "relative_path", "sha256", "size", "source_commit", "package_version", "cargo_lock_sha256", "toolchain_identifier", "wasm_bindgen_version"], "canonical WASM artifact identity");
  exactKeys(manifest.wasm.wasm_bindgen, ["cargo_lock_version", "cli_version"], "WASM wasm-bindgen identity");
  if (manifest.wasm.source_artifact.artifact_filename.length === 0 || manifest.wasm.source_artifact.artifact_filename !== WASM_FILENAME) fail("raw WASM filename is invalid");
  if (manifest.wasm.canonical_artifact.artifact_filename !== WASM_FILENAME || manifest.wasm.canonical_artifact.relative_path !== `dist/wasm/${WASM_FILENAME}`) fail("canonical WASM path is invalid");
  safeRelativePath(manifest.wasm.canonical_artifact.relative_path, "canonical WASM path");
  for (const identity of [manifest.wasm.source_artifact, manifest.wasm.canonical_artifact]) {
    validHash(identity.sha256, "WASM artifact hash");
    validSize(identity.size, "WASM artifact size");
    validCommit(identity.source_commit, "WASM artifact source commit");
    validVersion(identity.package_version, "WASM artifact package version");
    validHash(identity.cargo_lock_sha256, "WASM artifact Cargo.lock digest");
    requiredString(identity.toolchain_identifier, "WASM artifact toolchain identifier");
    if (identity.source_commit !== manifest.source_commit || identity.package_version !== manifest.package_version || identity.cargo_lock_sha256 !== manifest.cargo_lock_sha256) fail("WASM artifact source/version/lockfile mismatch");
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest.wasm.wasm_bindgen.cargo_lock_version) || manifest.wasm.wasm_bindgen.cargo_lock_version !== manifest.wasm.wasm_bindgen.cli_version || manifest.wasm.canonical_artifact.wasm_bindgen_version !== manifest.wasm.wasm_bindgen.cli_version) fail("WASM wasm-bindgen version mismatch");

  exactKeys(manifest.npm_tarball, ["filename", "package_name", "package_version", "sha256", "size"], "npm tarball identity");
  if (!manifest.npm_tarball.filename.endsWith(".tgz") || basename(manifest.npm_tarball.filename) !== manifest.npm_tarball.filename) fail("npm tarball filename is invalid");
  if (manifest.npm_tarball.package_name !== manifest.package_name || manifest.npm_tarball.package_version !== manifest.package_version) fail("npm tarball package identity mismatch");
  validHash(manifest.npm_tarball.sha256, "npm tarball hash");
  validSize(manifest.npm_tarball.size, "npm tarball size");
}

function releaseManifestArtifacts(manifest) {
  const entries = manifest.native_artifacts.map((artifact) => ({ hash: artifact.sha256, path: artifact.relative_path }));
  entries.push({ hash: manifest.wasm.canonical_artifact.sha256, path: manifest.wasm.canonical_artifact.relative_path });
  entries.push({ hash: manifest.npm_tarball.sha256, path: manifest.npm_tarball.filename });
  entries.push({ hash: undefined, path: MANIFEST_FILENAME });
  const paths = new Set();
  for (const entry of entries) {
    safeRelativePath(entry.path, `digest path ${entry.path}`);
    if (paths.has(entry.path)) fail(`duplicate digest path: ${entry.path}`);
    paths.add(entry.path);
  }
  return entries;
}

export function renderSha256Sums(manifest, manifestPath) {
  validateManifestShape(manifest);
  const entries = releaseManifestArtifacts(manifest);
  const manifestHash = sha256(manifestPath, "release manifest");
  entries[entries.length - 1].hash = manifestHash;
  return `${entries.map((entry) => `${entry.hash}  ${entry.path}`).join("\n")}\n`;
}

function parseSha256Sums(path) {
  const contents = bytes(path, "SHA256SUMS").toString("utf8");
  if (!contents.endsWith("\n")) fail("SHA256SUMS must end with one newline");
  const lines = contents.slice(0, -1).split("\n");
  return lines.map((line, index) => {
    const match = /^([0-9a-f]{64}) {2}([^\s][^\r\n]*)$/.exec(line);
    if (match === null) fail(`SHA256SUMS line ${index + 1} is malformed`);
    safeRelativePath(match[2], `SHA256SUMS path ${index + 1}`);
    return { hash: match[1], path: match[2] };
  });
}

function validateSha256Sums(manifest, sumsPath, manifestPath, packageRoot, tarballPath) {
  const actual = parseSha256Sums(sumsPath);
  const expected = releaseManifestArtifacts(manifest);
  if (actual.length !== expected.length) fail("SHA256SUMS has missing or extra artifacts");
  for (const [index, entry] of expected.entries()) {
    const supplied = actual[index];
    if (supplied.path !== entry.path) fail(`SHA256SUMS path/order mismatch: ${entry.path}`);
    let artifactPath;
    if (supplied.path === MANIFEST_FILENAME) artifactPath = manifestPath;
    else if (supplied.path === manifest.npm_tarball.filename) artifactPath = tarballPath;
    else artifactPath = resolve(packageRoot, supplied.path);
    if (!existsSync(artifactPath)) fail(`SHA256SUMS artifact is missing: ${supplied.path}`);
    if (sha256(artifactPath, supplied.path) !== supplied.hash) fail(`SHA256SUMS hash mismatch: ${supplied.path}`);
    if (entry.hash !== undefined && supplied.hash !== entry.hash) fail(`SHA256SUMS differs from release manifest: ${supplied.path}`);
  }
}

function validateReleaseTag(mode, version, releaseTag) {
  if (mode === "candidate") {
    if (releaseTag !== undefined) fail("candidate mode must not receive a release tag");
    return;
  }
  if (releaseTag !== `v${version}`) fail("formal release tag must equal v<package version>");
  if (parseSemVer(version).prerelease !== null) fail("formal release does not accept a pre-release version");
}

function validateContext(manifest, input) {
  validateManifestShape(manifest);
  const source = readSourceEvidence(input.sourceEvidencePath);
  const metadata = packageMetadata(input.packageRoot);
  if (
    metadata.version !== source.package_version ||
    metadata.version !== manifest.package_version ||
    source.package_version !== manifest.package_version ||
    source.source_commit !== manifest.source_commit ||
    source.cargo_lock_sha256 !== manifest.cargo_lock_sha256 ||
    source.pnpm_lock_sha256 !== manifest.pnpm_lock_sha256
  ) {
    fail("source/package/manifest identity mismatch");
  }
  if (manifest.source_commit !== readCommit()) fail("release manifest source commit differs from checked out source");
  validateReleaseTag(manifest.mode, manifest.package_version, manifest.release_tag);

  const native = readNativeEvidenceSet(input.nativeSummaryPath, input.nativeEvidenceRoot, source, manifest.package_version);
  if (manifest.toolchains.rust.identifier !== native.summary.toolchain_identifier) fail("manifest Rust toolchain differs from native evidence");
  if (manifest.cargo_lock_sha256 !== cargoLockSha256() || manifest.pnpm_lock_sha256 !== pnpmLockSha256()) fail("release manifest lockfile digest differs from canonical source");
  for (const [index, evidence] of native.entries.entries()) {
    const artifact = manifest.native_artifacts[index];
    if (
      artifact.target_id !== evidence.target_id ||
      artifact.rust_target !== evidence.rust_target ||
      artifact.sha256 !== evidence.artifact_sha256 ||
      artifact.size !== evidence.artifact_size ||
      artifact.source_commit !== evidence.source_commit ||
      artifact.package_version !== evidence.package_version ||
      artifact.toolchain_identifier !== evidence.toolchain_identifier
    ) {
      fail(`release manifest native evidence mismatch: ${evidence.target_id}`);
    }
    if (evidence.target_id === "linux-x64-gnu" && (artifact.glibc_version_runtime !== evidence.glibc_version_runtime || artifact.max_required_glibc_symbol !== evidence.max_required_glibc_symbol)) fail("Linux glibc evidence mismatch");
  }

  const runtime = packageRuntimeManifest(input.packageRoot, metadata, source, native.entries);
  const wasmSummary = json(input.wasmSummaryPath, "WASM summary");
  validateWasmEvidence(wasmSummary, source, manifest.package_version, input.wasmSourcePath);
  const wasmEvidence = json(input.wasmEvidencePath, "WASM evidence");
  validateWasmEvidence(wasmEvidence, source, manifest.package_version, input.wasmSourcePath);
  for (const key of ["schema_version", "kind", "source_commit", "package_version", "cargo_lock_sha256", "artifact_filename", "artifact_sha256", "artifact_size", "toolchain_identifier"]) {
    if (wasmSummary[key] !== wasmEvidence[key]) fail(`WASM summary/evidence mismatch: ${key}`);
  }
  const wasmBindgen = validateWasmBindgenEvidence(json(input.wasmBindgenEvidencePath, "wasm-bindgen evidence"));
  validateToolchains(manifest.toolchains, native.summary, wasmSummary, wasmBindgen);
  const rawWasm = manifest.wasm.source_artifact;
  if (
    rawWasm.artifact_filename !== wasmSummary.artifact_filename ||
    rawWasm.sha256 !== wasmSummary.artifact_sha256 ||
    rawWasm.size !== wasmSummary.artifact_size ||
    rawWasm.toolchain_identifier !== wasmSummary.toolchain_identifier
  ) fail("raw WASM manifest identity differs from evidence");
  const canonicalWasmPath = resolve(input.packageRoot, manifest.wasm.canonical_artifact.relative_path);
  if (!existsSync(canonicalWasmPath)) fail("canonical package WASM is missing");
  if (sha256(canonicalWasmPath) !== manifest.wasm.canonical_artifact.sha256) fail("canonical package WASM hash mismatch");
  if (fileSize(canonicalWasmPath) !== manifest.wasm.canonical_artifact.size) fail("canonical package WASM size mismatch");
  if (runtime.source_commit !== source.source_commit) fail("runtime manifest source mismatch");

  const tarMetadata = tarballMetadata(input.tarballPath);
  if (tarMetadata.name !== manifest.npm_tarball.package_name || tarMetadata.version !== manifest.npm_tarball.package_version) fail("npm tarball metadata differs from release manifest");
  if (basename(input.tarballPath) !== manifest.npm_tarball.filename) fail("npm tarball filename differs from release manifest");
  if (sha256(input.tarballPath) !== manifest.npm_tarball.sha256) fail("npm tarball hash mismatch");
  if (fileSize(input.tarballPath) !== manifest.npm_tarball.size) fail("npm tarball size mismatch");
  return { source, metadata, native, wasmSummary, wasmBindgen };
}

export function createReleaseManifest({
  sourceEvidencePath,
  nativeSummaryPath,
  nativeEvidenceRoot,
  wasmSummaryPath,
  wasmEvidencePath,
  wasmBindgenEvidencePath,
  wasmSourcePath,
  packageRoot,
  tarballPath,
  mode = "candidate",
  releaseTag,
  toolchains,
}) {
  const source = readSourceEvidence(sourceEvidencePath);
  const metadata = packageMetadata(packageRoot);
  if (source.package_version !== metadata.version) fail("source and npm package versions differ");
  validateReleaseTag(mode, metadata.version, releaseTag);
  const native = readNativeEvidenceSet(nativeSummaryPath, nativeEvidenceRoot, source, metadata.version);
  const runtime = packageRuntimeManifest(packageRoot, metadata, source, native.entries);
  const wasmSummary = json(wasmSummaryPath, "WASM summary");
  validateWasmEvidence(wasmSummary, source, metadata.version, wasmSourcePath);
  const wasmEvidence = json(wasmEvidencePath, "WASM evidence");
  validateWasmEvidence(wasmEvidence, source, metadata.version, wasmSourcePath);
  for (const key of ["schema_version", "kind", "source_commit", "package_version", "cargo_lock_sha256", "artifact_filename", "artifact_sha256", "artifact_size", "toolchain_identifier"]) {
    if (wasmSummary[key] !== wasmEvidence[key]) fail(`WASM summary/evidence mismatch: ${key}`);
  }
  const wasmBindgen = validateWasmBindgenEvidence(json(wasmBindgenEvidencePath, "wasm-bindgen evidence"));
  validateToolchains(toolchains, native.summary, wasmSummary, wasmBindgen);
  const tarMetadata = tarballMetadata(tarballPath);
  if (tarMetadata.name !== metadata.name || tarMetadata.version !== metadata.version) fail("npm tarball metadata differs from package metadata");

  const manifest = {
    schema_version: 1,
    mode,
    package_name: metadata.name,
    package_version: metadata.version,
    source_commit: source.source_commit,
    cargo_lock_sha256: source.cargo_lock_sha256,
    pnpm_lock_sha256: source.pnpm_lock_sha256,
    toolchains,
    build_steps: CANONICAL_BUILD_STEPS.map((step) => ({ ...step })),
    native_artifacts: native.entries.map((evidence) => {
      const artifact = {
        target_id: evidence.target_id,
        rust_target: evidence.rust_target,
        artifact_filename: evidence.artifact_filename,
        relative_path: `dist/native/${evidence.target_id}/${evidence.artifact_filename}`,
        sha256: evidence.artifact_sha256,
        size: evidence.artifact_size,
        source_commit: evidence.source_commit,
        package_version: evidence.package_version,
        toolchain_identifier: evidence.toolchain_identifier,
      };
      if (evidence.target_id === "linux-x64-gnu") {
        artifact.glibc_version_runtime = evidence.glibc_version_runtime;
        artifact.max_required_glibc_symbol = evidence.max_required_glibc_symbol;
      }
      return artifact;
    }),
    wasm: {
      source_artifact: {
        artifact_filename: wasmSummary.artifact_filename,
        sha256: wasmSummary.artifact_sha256,
        size: wasmSummary.artifact_size,
        source_commit: wasmSummary.source_commit,
        package_version: wasmSummary.package_version,
        cargo_lock_sha256: wasmSummary.cargo_lock_sha256,
        toolchain_identifier: wasmSummary.toolchain_identifier,
      },
      canonical_artifact: {
        artifact_filename: WASM_FILENAME,
        relative_path: `dist/wasm/${WASM_FILENAME}`,
        sha256: sha256(resolve(packageRoot, `dist/wasm/${WASM_FILENAME}`), "canonical package WASM"),
        size: fileSize(resolve(packageRoot, `dist/wasm/${WASM_FILENAME}`), "canonical package WASM"),
        source_commit: source.source_commit,
        package_version: metadata.version,
        cargo_lock_sha256: source.cargo_lock_sha256,
        toolchain_identifier: wasmSummary.toolchain_identifier,
        wasm_bindgen_version: wasmBindgen.cli_version,
      },
      wasm_bindgen: {
        cargo_lock_version: wasmBindgen.cargo_lock_version,
        cli_version: wasmBindgen.cli_version,
      },
    },
    npm_tarball: {
      filename: basename(tarballPath),
      package_name: tarMetadata.name,
      package_version: tarMetadata.version,
      sha256: sha256(tarballPath, "npm tarball"),
      size: fileSize(tarballPath, "npm tarball"),
    },
    digest_file: DIGEST_FILENAME,
    evidence: {
      source: "release-source.json",
      native_summary: "native-summary.json",
      native_artifacts: Object.fromEntries(REQUIRED_TARGETS.map((targetId) => [targetId, `${targetId}.json`])),
      wasm_summary: "wasm-summary.json",
      wasm_artifact: "wasm-evidence.json",
      wasm_bindgen: "wasm-bindgen-version.json",
    },
  };
  if (mode === "release") manifest.release_tag = releaseTag;
  validateManifestShape(manifest);
  if (runtime.source_commit !== manifest.source_commit) fail("runtime manifest source differs from release manifest");
  return manifest;
}

export function validateReleaseManifest({
  manifestPath,
  sha256sumsPath,
  sourceEvidencePath,
  nativeSummaryPath,
  nativeEvidenceRoot,
  wasmSummaryPath,
  wasmEvidencePath,
  wasmBindgenEvidencePath,
  wasmSourcePath,
  packageRoot,
  tarballPath,
}) {
  if (basename(manifestPath) !== MANIFEST_FILENAME) fail("release manifest filename is invalid");
  if (basename(sha256sumsPath) !== DIGEST_FILENAME) fail("SHA256SUMS filename is invalid");
  const manifest = json(manifestPath, "release manifest");
  validateContext(manifest, {
    sourceEvidencePath,
    nativeSummaryPath,
    nativeEvidenceRoot,
    wasmSummaryPath,
    wasmEvidencePath,
    wasmBindgenEvidencePath,
    wasmSourcePath,
    packageRoot,
    tarballPath,
  });
  validateSha256Sums(manifest, sha256sumsPath, manifestPath, packageRoot, tarballPath);
  return manifest;
}

function argument(name, argv, fallback) {
  const index = argv.indexOf(name);
  if (index < 0) {
    if (fallback !== undefined) return fallback;
    fail(`missing ${name}`);
  }
  if (argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
  return argv[index + 1];
}

function validateArguments(argv, command) {
  const allowed = new Set([
    "--source-evidence",
    "--native-summary",
    "--native-evidence-root",
    "--wasm-summary",
    "--wasm-evidence",
    "--wasm-bindgen-evidence",
    "--wasm-source",
    "--package-root",
    "--tarball",
    "--manifest",
    "--sha256sums",
    ...(command === "generate" ? ["--mode", "--release-tag"] : []),
  ]);
  const counts = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--") || !allowed.has(value)) fail(`unexpected or ambiguous argument: ${value}`);
    counts.set(value, (counts.get(value) ?? 0) + 1);
    if (counts.get(value) > 1) fail(`duplicate argument: ${value}`);
    if (argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing value for ${value}`);
    index += 1;
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function pathsFromArguments(argv) {
  return {
    sourceEvidencePath: resolve(repositoryRoot, argument("--source-evidence", argv)),
    nativeSummaryPath: resolve(repositoryRoot, argument("--native-summary", argv)),
    nativeEvidenceRoot: resolve(repositoryRoot, argument("--native-evidence-root", argv)),
    wasmSummaryPath: resolve(repositoryRoot, argument("--wasm-summary", argv)),
    wasmEvidencePath: resolve(repositoryRoot, argument("--wasm-evidence", argv)),
    wasmBindgenEvidencePath: resolve(repositoryRoot, argument("--wasm-bindgen-evidence", argv)),
    wasmSourcePath: resolve(repositoryRoot, argument("--wasm-source", argv)),
    packageRoot: resolve(repositoryRoot, argument("--package-root", argv, "packages/wallet-core")),
    tarballPath: resolve(repositoryRoot, argument("--tarball", argv)),
  };
}

function run() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (command !== "generate" && command !== "validate") fail("usage: generate | validate");
  validateArguments(argv, command);
  const paths = pathsFromArguments(argv);
  const manifestPath = resolve(repositoryRoot, argument("--manifest", argv, "release-output/release-manifest.json"));
  const sumsPath = resolve(repositoryRoot, argument("--sha256sums", argv, "release-output/SHA256SUMS"));
  if (command === "generate") {
    const mode = argument("--mode", argv, "candidate");
    const releaseTag = argv.includes("--release-tag") ? argument("--release-tag", argv) : undefined;
    const wasmBindgenEvidence = json(paths.wasmBindgenEvidencePath, "wasm-bindgen evidence");
    const toolchains = actualToolchains(wasmBindgenEvidence);
    const nativeSummary = json(paths.nativeSummaryPath, "native summary");
    toolchains.rust.identifier = nativeSummary.toolchain_identifier;
    const manifest = createReleaseManifest({ ...paths, mode, releaseTag, toolchains });
    writeJson(manifestPath, manifest);
    writeFileSync(sumsPath, renderSha256Sums(manifest, manifestPath));
    validateReleaseManifest({ ...paths, manifestPath, sha256sumsPath: sumsPath });
    process.stdout.write(`${JSON.stringify({ manifest: manifestPath, sha256sums: sumsPath })}\n`);
    return;
  }
  const manifest = validateReleaseManifest({ ...paths, manifestPath, sha256sumsPath: sumsPath });
  process.stdout.write(`${JSON.stringify({ schema_version: manifest.schema_version, mode: manifest.mode, package_version: manifest.package_version, source_commit: manifest.source_commit })}\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Release manifest gate failed"}\n`);
    process.exitCode = 1;
  }
}

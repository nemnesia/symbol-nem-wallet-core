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

import { isValidSemVer, parseSemVer } from "./release-identity.mjs";
import { validateNpmRepositoryMetadata } from "./npm-repository.mjs";
import { REPOSITORY, validateNpmProvenanceEvidence } from "./npm-provenance.mjs";
import { validatePublishedRecoveryEvidence } from "./release-recovery.mjs";
import { validateNativeManifest } from "../packages/wallet-core/src/manifest.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";
const RELEASE_ENVIRONMENT = "release";
const PROVENANCE_PUBLISH_COMMAND = "npm publish --provenance";
const RELEASE_CONCURRENCY_GROUP = "${{ github.workflow }}-${{ github.ref }}";
const REF_CONCURRENCY_SUFFIX = "${{ github.ref }}";
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const REQUIRED_VERSION_SOURCE_IDS = ["core", "cAbi", "node", "wasm", "npm"];
const REQUIRED_NATIVE_TARGETS = [
  "win32-x64-msvc",
  "darwin-x64",
  "darwin-arm64",
  "linux-x64-gnu",
];

function fail(message) {
  throw new Error(`Release operation gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
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

function sha256(value, label) {
  try {
    return createHash("sha256").update(value).digest("hex");
  } catch {
    fail(`${label ?? "value"} could not be hashed`);
  }
}

function sha256File(path, label = path) {
  return sha256(bytes(path, label), label);
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

function requiredFile(root, relativePath, label = relativePath) {
  safeRelativePath(relativePath, label);
  const path = resolve(root, relativePath);
  if (!existsSync(path)) fail(`${label} is missing`);
  return path;
}

function validCommit(value, label) {
  if (typeof value !== "string" || !COMMIT_PATTERN.test(value)) fail(`${label} is invalid`);
}

function validHash(value, label) {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) fail(`${label} is invalid`);
}

function validFormalVersion(value, label) {
  if (!isValidSemVer(value) || parseSemVer(value).prerelease !== null) fail(`${label} is invalid`);
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

function readTarEntry(tarballPath, entryPath) {
  try {
    return execFileSync("tar", ["-xOf", tarballPath, entryPath], { cwd: repositoryRoot, maxBuffer: 64 * 1024 * 1024 });
  } catch {
    fail(`npm tarball entry is missing or unreadable: ${entryPath}`);
  }
}

function parseDigestFile(path, label) {
  const content = bytes(path, label).toString("utf8");
  if (!content.endsWith("\n")) fail(`${label} must end with one newline`);
  const lines = content.slice(0, -1).split("\n");
  const entries = lines.map((line, index) => {
    const match = /^([0-9a-f]{64}) {2}([^\s\r\n]+)$/.exec(line);
    if (match === null) fail(`${label} line ${index + 1} is malformed`);
    safeRelativePath(match[2], `${label} path ${index + 1}`);
    return { hash: match[1], path: match[2] };
  });
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length) fail(`${label} contains duplicate paths`);
  return entries;
}

function assertDigestEntries(path, label, expected) {
  const actual = parseDigestFile(path, label);
  if (actual.length !== expected.length) fail(`${label} has missing or extra entries`);
  for (const [index, entry] of expected.entries()) {
    const supplied = actual[index];
    if (supplied.path !== entry.path || supplied.hash !== entry.hash) fail(`${label} entry ${index + 1} differs`);
  }
}

export function validateEvidenceDigests({
  sbomPath,
  inventoryPath,
  sbomSha256sumsPath,
  policyPath,
  thirdPartyPath,
  policySha256sumsPath,
}) {
  assertDigestEntries(sbomSha256sumsPath, "SBOM-SHA256SUMS", [
    { hash: sha256File(sbomPath, "SPDX SBOM"), path: "sbom.spdx.json" },
    { hash: sha256File(inventoryPath, "license inventory"), path: "license-inventory.json" },
  ]);
  assertDigestEntries(policySha256sumsPath, "LICENSE-POLICY-SHA256SUMS", [
    { hash: sha256File(policyPath, "license policy"), path: "license-policy.json" },
    { hash: sha256File(thirdPartyPath, "third-party license evidence"), path: "THIRD_PARTY_LICENSES.json" },
  ]);
  return { sbom: true, license_policy: true };
}

export function validateSpdxReleaseIdentity(sbom, manifest) {
  if (
    !isPlainObject(manifest) ||
    manifest.package_name !== PACKAGE_NAME ||
    typeof manifest.package_version !== "string" ||
    typeof manifest.source_commit !== "string"
  ) {
    fail("release manifest identity is invalid");
  }
  validFormalVersion(manifest.package_version, "release manifest version");
  validCommit(manifest.source_commit, "release manifest source commit");

  if (
    !isPlainObject(sbom) ||
    sbom.SPDXID !== "SPDXRef-DOCUMENT" ||
    sbom.spdxVersion !== "SPDX-2.3" ||
    sbom.dataLicense !== "CC0-1.0"
  ) {
    fail("SPDX document identity is invalid");
  }

  if (sbom.name !== `symbol-nem-wallet-core-${manifest.package_version}`) {
    fail("SPDX document name differs from the release manifest");
  }
  if (
    sbom.documentNamespace !==
    `https://spdx.org/spdxdocs/symbol-nem-wallet-core-${manifest.package_version}-${manifest.source_commit}`
  ) {
    fail("SPDX document namespace differs from the release manifest");
  }
  if (
    !Array.isArray(sbom.documentDescribes) ||
    sbom.documentDescribes.length !== 1 ||
    typeof sbom.documentDescribes[0] !== "string"
  ) {
    fail("SPDX document root package identity is invalid");
  }
  if (!Array.isArray(sbom.packages)) fail("SPDX packages are missing or malformed");

  const packageIds = new Set();
  for (const packageData of sbom.packages) {
    if (
      !isPlainObject(packageData) ||
      typeof packageData.SPDXID !== "string" ||
      !/^SPDXRef-[A-Za-z0-9.-]+$/.test(packageData.SPDXID) ||
      typeof packageData.name !== "string" ||
      typeof packageData.versionInfo !== "string"
    ) {
      fail("SPDX packages are missing or malformed");
    }
    if (packageIds.has(packageData.SPDXID)) fail("SPDX package IDs are duplicated");
    packageIds.add(packageData.SPDXID);
  }

  const describedSpdxId = sbom.documentDescribes[0];
  const describedPackages = sbom.packages.filter((packageData) => packageData.SPDXID === describedSpdxId);
  if (describedPackages.length !== 1) fail("SPDX document root package is missing or duplicated");

  const rootPackages = sbom.packages.filter(
    (packageData) => packageData.name === PACKAGE_NAME && packageData.versionInfo === manifest.package_version,
  );
  if (rootPackages.length !== 1) fail("SPDX root npm package is missing or duplicated");
  if (describedPackages[0] !== rootPackages[0]) fail("SPDX document root package identity differs from the release manifest");

  return true;
}

function validateTag(tag, version) {
  validFormalVersion(version, "release version");
  if (typeof tag !== "string" || tag !== `v${version}`) fail("release tag/version mismatch");
}

function validateVersionSources(versionSources, version) {
  if (!isPlainObject(versionSources)) fail("release version sources are unavailable");
  const actualIds = Object.keys(versionSources).sort();
  const expectedIds = [...REQUIRED_VERSION_SOURCE_IDS].sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) fail("release version sources are incomplete or unexpected");
  for (const id of REQUIRED_VERSION_SOURCE_IDS) {
    const entry = versionSources[id];
    if (!isPlainObject(entry) || entry.version !== version) fail(`release version mismatch: ${id}`);
  }
}

export function validateReleaseOperationIdentity({
  environment,
  tag,
  version,
  manifestVersion,
  versionSources,
  sourceCommit,
  checkoutHead,
  tagCommit,
  mainAncestry,
  clean,
  provenanceRequired,
  oidcRequired,
}) {
  if (environment !== RELEASE_ENVIRONMENT) fail("release job is not connected to the release Environment");
  validateTag(tag, version);
  if (manifestVersion !== version) fail("release manifest version differs from release version");
  validateVersionSources(versionSources, version);
  validCommit(sourceCommit, "release source commit");
  validCommit(checkoutHead, "checkout HEAD");
  validCommit(tagCommit, "tag target commit");
  if (checkoutHead !== sourceCommit) fail("checkout HEAD differs from release source commit");
  if (tagCommit !== sourceCommit) fail("tag target differs from release source commit");
  if (mainAncestry !== true) fail("release source commit is not contained in main");
  if (clean !== true) fail("release source checkout is not clean");
  if (provenanceRequired !== true) fail("npm provenance is not required");
  if (oidcRequired !== true) fail("npm Trusted Publishing / OIDC is not required");
  return {
    environment: RELEASE_ENVIRONMENT,
    tag,
    version,
    source_commit: sourceCommit,
    provenance_required: true,
    trusted_publishing: "npm-oidc",
  };
}

function validateIdentityArtifact(identity, tag, sourceCommit, manifestVersion, environment) {
  if (!isPlainObject(identity) || identity.schema_version !== 1 || identity.kind !== "release-identity" || identity.mode !== "release") {
    fail("release identity evidence is invalid");
  }
  const result = validateReleaseOperationIdentity({
    environment,
    tag,
    version: identity.version,
    manifestVersion,
    versionSources: identity.version_sources,
    sourceCommit,
    checkoutHead: identity.checkout_head,
    tagCommit: identity.tag_commit,
    mainAncestry: identity.main_ancestry,
    clean: identity.clean,
    provenanceRequired: true,
    oidcRequired: true,
  });
  if (
    identity.package_name !== PACKAGE_NAME ||
    identity.tag !== tag ||
    identity.tag_version !== identity.version ||
    identity.tag_ref !== `refs/tags/${tag}` ||
    identity.source_commit !== sourceCommit ||
    typeof identity.main_ref !== "string" ||
    !/(^|\/)main$/.test(identity.main_ref) ||
    !COMMIT_PATTERN.test(identity.main_ref_commit) ||
    identity.tag_event?.ref !== `refs/tags/${tag}` ||
    identity.tag_event?.created !== true ||
    identity.tag_event?.deleted !== false ||
    identity.tag_event?.forced !== false ||
    identity.tag_event?.before !== "0".repeat(40)
  ) {
    fail("release identity evidence does not match the release event");
  }
  return result;
}

function validateSourceEvidence(source, manifest) {
  if (
    !isPlainObject(source) ||
    source.package_name !== PACKAGE_NAME ||
    source.package_version !== manifest.package_version ||
    source.source_commit !== manifest.source_commit ||
    source.cargo_lock_sha256 !== manifest.cargo_lock_sha256 ||
    typeof source.pnpm_lock_sha256 !== "string" ||
    source.pnpm_lock_sha256 !== manifest.pnpm_lock_sha256
  ) {
    fail("source evidence identity differs from the release manifest");
  }
  validCommit(source.source_commit, "source evidence commit");
  validHash(source.cargo_lock_sha256, "source evidence Cargo.lock digest");
  validHash(source.pnpm_lock_sha256, "source evidence pnpm-lock.yaml digest");
}

function validateReleaseManifestIdentity(manifest, tag, sourceCommit) {
  if (
    !isPlainObject(manifest) ||
    manifest.schema_version !== 1 ||
    manifest.mode !== "release" ||
    manifest.package_name !== PACKAGE_NAME ||
    manifest.source_commit !== sourceCommit ||
    manifest.digest_file !== "SHA256SUMS"
  ) {
    fail("release manifest identity is invalid");
  }
  validFormalVersion(manifest.package_version, "release manifest version");
  validateTag(manifest.release_tag, manifest.package_version);
  if (manifest.release_tag !== tag) fail("release manifest tag differs from release event");
  validCommit(manifest.source_commit, "release manifest source commit");
  validHash(manifest.cargo_lock_sha256, "release manifest Cargo.lock digest");
  validHash(manifest.pnpm_lock_sha256, "release manifest pnpm-lock.yaml digest");
  if (!Array.isArray(manifest.native_artifacts) || manifest.native_artifacts.length !== REQUIRED_NATIVE_TARGETS.length) {
    fail("release manifest native artifact set is incomplete");
  }
  for (const [index, targetId] of REQUIRED_NATIVE_TARGETS.entries()) {
    const artifact = manifest.native_artifacts[index];
    if (
      !isPlainObject(artifact) ||
      artifact.target_id !== targetId ||
      artifact.source_commit !== sourceCommit ||
      artifact.package_version !== manifest.package_version ||
      artifact.artifact_filename !== `${targetId}.node` ||
      typeof artifact.artifact_filename !== "string" ||
      typeof artifact.relative_path !== "string"
    ) {
      fail(`release manifest native artifact identity is invalid: ${targetId}`);
    }
    safeRelativePath(artifact.relative_path, `native artifact path ${targetId}`);
    validHash(artifact.sha256, `native artifact hash ${targetId}`);
  }
  if (!isPlainObject(manifest.wasm) || !isPlainObject(manifest.wasm.canonical_artifact)) fail("release manifest WASM identity is invalid");
  if (
    manifest.wasm.canonical_artifact.source_commit !== sourceCommit ||
    manifest.wasm.canonical_artifact.package_version !== manifest.package_version
  ) {
    fail("release manifest canonical WASM identity differs");
  }
  validHash(manifest.wasm.canonical_artifact.sha256, "canonical WASM hash");
  if (!isPlainObject(manifest.npm_tarball) || manifest.npm_tarball.package_name !== PACKAGE_NAME || manifest.npm_tarball.package_version !== manifest.package_version || typeof manifest.npm_tarball.filename !== "string") {
    fail("release manifest npm tarball identity is invalid");
  }
  safeRelativePath(manifest.npm_tarball.filename, "npm tarball filename");
  validHash(manifest.npm_tarball.sha256, "npm tarball hash");
  return manifest;
}

function validateNativeEvidence(releaseDir, manifest, sourceCommit) {
  for (const targetId of REQUIRED_NATIVE_TARGETS) {
    const artifact = manifest.native_artifacts.find((entry) => entry.target_id === targetId);
    if (!isPlainObject(artifact)) fail(`release manifest native artifact is missing: ${targetId}`);
    const evidencePath = requiredFile(releaseDir, `${targetId}.json`, `native evidence ${targetId}`);
    const evidence = json(evidencePath, `native evidence ${targetId}`);
    const artifactPath = requiredFile(releaseDir, artifact.artifact_filename, `native artifact ${targetId}`);
    if (
      evidence.target_id !== targetId ||
      evidence.source_commit !== sourceCommit ||
      evidence.package_version !== manifest.package_version ||
      evidence.artifact_filename !== artifact.artifact_filename ||
      evidence.artifact_sha256 !== artifact.sha256 ||
      evidence.artifact_sha256 !== sha256File(artifactPath, `native artifact ${targetId}`) ||
      evidence.artifact_size !== fileSize(artifactPath, `native artifact ${targetId}`)
    ) {
      fail(`native release evidence identity mismatch: ${targetId}`);
    }
  }
}

function validateWasmEvidence(releaseDir, manifest, sourceCommit) {
  const evidence = json(requiredFile(releaseDir, "wasm-evidence.json", "WASM evidence"), "WASM evidence");
  const source = manifest.wasm.source_artifact;
  if (
    !isPlainObject(source) ||
    evidence.source_commit !== sourceCommit ||
    evidence.package_version !== manifest.package_version ||
    evidence.artifact_filename !== source.artifact_filename ||
    evidence.artifact_sha256 !== source.sha256 ||
    evidence.artifact_size !== source.size
  ) {
    fail("WASM release evidence identity mismatch");
  }
}

function validateTarball(releaseDir, manifest, recovery) {
  const tarballPath = requiredFile(releaseDir, manifest.npm_tarball.filename, "npm tarball");
  if (basename(tarballPath) !== manifest.npm_tarball.filename) fail("npm tarball filename is unsafe");
  if (sha256File(tarballPath, "npm tarball") !== manifest.npm_tarball.sha256 || fileSize(tarballPath, "npm tarball") !== manifest.npm_tarball.size) {
    fail("npm tarball digest or size differs from the release manifest");
  }
  let metadata;
  try {
    metadata = JSON.parse(readTarEntry(tarballPath, "package/package.json").toString("utf8"));
  } catch {
    fail("npm tarball package metadata is unreadable");
  }
  if (!isPlainObject(metadata) || metadata.name !== PACKAGE_NAME || metadata.version !== manifest.package_version) {
    fail("npm tarball package identity differs from the release manifest");
  }
  try {
    validateNpmRepositoryMetadata(metadata, "npm tarball package metadata");
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  let runtimeManifest;
  try {
    runtimeManifest = JSON.parse(readTarEntry(tarballPath, "package/dist/native/artifact-manifest.json").toString("utf8"));
    validateNativeManifest(runtimeManifest, metadata);
  } catch {
    fail("npm tarball native artifact manifest is invalid");
  }
  if (runtimeManifest.source_commit !== manifest.source_commit || runtimeManifest.package_version !== manifest.package_version) fail("npm tarball native artifact manifest identity differs from the release");
  const expectedTarballTargets = recovery ? REQUIRED_NATIVE_TARGETS : manifest.native_artifacts.map((artifact) => artifact.target_id);
  if (JSON.stringify(runtimeManifest.artifacts.map((artifact) => artifact.target_id)) !== JSON.stringify(expectedTarballTargets)) fail("npm tarball native artifact set differs from the release manifest");
  for (const artifact of runtimeManifest.artifacts) {
    const runtime = runtimeManifest.artifacts.find((entry) => entry.target_id === artifact.target_id);
    if (!isPlainObject(runtime) || runtime.relative_path !== artifact.relative_path || runtime.sha256 !== artifact.sha256) fail(`native artifact in npm tarball differs from its runtime manifest: ${artifact.target_id}`);
    const artifactBytes = readTarEntry(tarballPath, `package/${runtime.relative_path}`);
    if (sha256(artifactBytes, `native artifact in npm tarball ${artifact.target_id}`) !== runtime.sha256) fail(`native artifact bytes in npm tarball differ from its runtime manifest: ${artifact.target_id}`);
    if (!recovery) {
      const expectedArtifact = manifest.native_artifacts.find((entry) => entry.target_id === artifact.target_id);
      if (!isPlainObject(expectedArtifact) || runtime.relative_path !== expectedArtifact.relative_path || runtime.sha256 !== expectedArtifact.sha256 || artifactBytes.length !== expectedArtifact.size) fail(`native artifact in npm tarball differs from the release manifest: ${artifact.target_id}`);
    }
  }
  const wasmPath = recovery ? "package/dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm" : `package/${manifest.wasm.canonical_artifact.relative_path}`;
  const wasmBytes = readTarEntry(tarballPath, wasmPath);
  if (wasmBytes.length === 0) fail("canonical WASM in npm tarball is empty");
  if (!recovery) {
    safeRelativePath(manifest.wasm.canonical_artifact.relative_path, "canonical WASM path");
    if (
      sha256(wasmBytes, "canonical WASM in npm tarball") !== manifest.wasm.canonical_artifact.sha256 ||
      wasmBytes.length !== manifest.wasm.canonical_artifact.size
    ) {
      fail("canonical WASM in npm tarball differs from the release manifest");
    }
  }
  return { tarballPath, metadata, wasmBytes };
}

function validateReleaseDigests(releaseDir, manifest, tarball, recovery) {
  const expected = manifest.native_artifacts.map((artifact) => ({
    hash: sha256File(requiredFile(releaseDir, artifact.artifact_filename), artifact.artifact_filename),
    path: artifact.relative_path,
  }));
  expected.push({
    hash: recovery ? manifest.wasm.canonical_artifact.sha256 : sha256(tarball.wasmBytes, "canonical WASM in npm tarball"),
    path: manifest.wasm.canonical_artifact.relative_path,
  });
  expected.push({ hash: sha256File(tarball.tarballPath, "npm tarball"), path: manifest.npm_tarball.filename });
  expected.push({ hash: sha256File(requiredFile(releaseDir, "release-manifest.json"), "release manifest"), path: "release-manifest.json" });
  assertDigestEntries(requiredFile(releaseDir, "SHA256SUMS"), "SHA256SUMS", expected);
}

function validatePhaseEvidence(releaseDir, manifest) {
  const sbomPath = requiredFile(releaseDir, "sbom.spdx.json", "SPDX SBOM");
  const inventoryPath = requiredFile(releaseDir, "license-inventory.json", "license inventory");
  const policyPath = requiredFile(releaseDir, "license-policy.json", "license policy");
  const thirdPartyPath = requiredFile(releaseDir, "THIRD_PARTY_LICENSES.json", "third-party license evidence");
  const sbom = json(sbomPath, "SPDX SBOM");
  const inventory = json(inventoryPath, "license inventory");
  const policy = json(policyPath, "license policy");
  const thirdParty = json(thirdPartyPath, "third-party license evidence");
  validateSpdxReleaseIdentity(sbom, manifest);
  for (const [label, value] of [["license inventory", inventory], ["license policy", policy], ["third-party license evidence", thirdParty]]) {
    if (!isPlainObject(value) || value.package_name !== PACKAGE_NAME || value.package_version !== manifest.package_version || value.source_commit !== manifest.source_commit) {
      fail(`${label} identity differs from the release manifest`);
    }
  }
  if (inventory.sbom_file !== "sbom.spdx.json") fail("Phase 4A evidence identity is invalid");
  if (
    policy.inventory_sha256 !== sha256File(inventoryPath, "license inventory") ||
    policy.sbom_sha256 !== sha256File(sbomPath, "SPDX SBOM") ||
    policy.gate_status !== "PASS"
  ) {
    fail("Phase 4B license policy evidence is not a passing identity-bound result");
  }
  if (
    thirdParty.inventory_sha256 !== sha256File(inventoryPath, "license inventory") ||
    thirdParty.final_release_text_gate?.required !== true ||
    thirdParty.final_release_text_gate?.status !== "ready"
  ) {
    fail("final third-party license text gate is not ready");
  }
  validateEvidenceDigests({
    sbomPath,
    inventoryPath,
    sbomSha256sumsPath: requiredFile(releaseDir, "SBOM-SHA256SUMS"),
    policyPath,
    thirdPartyPath,
    policySha256sumsPath: requiredFile(releaseDir, "LICENSE-POLICY-SHA256SUMS"),
  });
  return {
    sbom_sha256: sha256File(sbomPath, "SPDX SBOM"),
    inventory_sha256: sha256File(inventoryPath, "license inventory"),
    license_policy_sha256: sha256File(policyPath, "license policy"),
    third_party_sha256: sha256File(thirdPartyPath, "third-party license evidence"),
  };
}

export function validateReleaseBundle({ releaseDir, identityPath, tag, sourceCommit, environment = RELEASE_ENVIRONMENT, recovery = false }) {
  const sourceMetadata = json(resolve(repositoryRoot, "packages/wallet-core/package.json"), "source npm package metadata");
  try {
    validateNpmRepositoryMetadata(sourceMetadata, "source npm package metadata");
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  const manifestPath = requiredFile(releaseDir, "release-manifest.json", "release manifest");
  const manifest = validateReleaseManifestIdentity(json(manifestPath, "release manifest"), tag, sourceCommit);
  const identity = json(identityPath, "release identity evidence");
  const operationIdentity = validateIdentityArtifact(identity, tag, sourceCommit, manifest.package_version, environment);
  validateSourceEvidence(json(requiredFile(releaseDir, "release-source.json", "source evidence"), "source evidence"), manifest);
  validateNativeEvidence(releaseDir, manifest, sourceCommit);
  validateWasmEvidence(releaseDir, manifest, sourceCommit);
  const tarball = validateTarball(releaseDir, manifest, false);
  validateReleaseDigests(releaseDir, manifest, tarball, false);
  const evidence = validatePhaseEvidence(releaseDir, manifest);
  if (recovery) {
    const published = validatePublishedRecoveryEvidence({ releaseDir, tag, sourceCommit });
    const publishedManifestPath = requiredFile(releaseDir, "published-recovery-manifest.json", "published recovery manifest");
    return {
      schema_version: 1,
      kind: "npm-release-operation",
      package_name: PACKAGE_NAME,
      package_version: manifest.package_version,
      release_tag: tag,
      source_commit: sourceCommit,
      environment: operationIdentity.environment,
      release_manifest: {
        filename: "published-recovery-manifest.json",
        sha256: sha256File(publishedManifestPath, "published recovery manifest"),
      },
      candidate_release_manifest: {
        filename: "release-manifest.json",
        sha256: sha256File(manifestPath, "historical candidate release manifest"),
      },
      npm_tarball: {
        filename: "published-registry.tgz",
        sha256: published.published.tarball.sha256,
      },
      candidate_artifact: {
        tarball_filename: published.candidate.tarball.filename,
        tarball_sha256: published.candidate.tarball.sha256,
        tarball_size: published.candidate.tarball.size,
      },
      published_artifact: {
        source: "npm-registry-tarball",
        tarball_filename: published.published.tarball.filename,
        tarball_sha256: published.published.tarball.sha256,
        tarball_size: published.published.tarball.size,
        native: published.published.native,
        wasm: published.published.wasm,
        byte_reproducible: published.manifest.byte_reproducible,
      },
      evidence,
      provenance: {
        mechanism: "npm-trusted-publishing-oidc",
        command: PROVENANCE_PUBLISH_COMMAND,
        required: true,
        status: "required-at-publish",
      },
    };
  }
  return {
    schema_version: 1,
    kind: "npm-release-operation",
    package_name: PACKAGE_NAME,
    package_version: manifest.package_version,
    release_tag: tag,
    source_commit: sourceCommit,
    environment: operationIdentity.environment,
    release_manifest: {
      filename: "release-manifest.json",
      sha256: sha256File(manifestPath, "release manifest"),
    },
    npm_tarball: {
      filename: manifest.npm_tarball.filename,
      sha256: manifest.npm_tarball.sha256,
    },
    evidence,
    provenance: {
      mechanism: "npm-trusted-publishing-oidc",
      command: PROVENANCE_PUBLISH_COMMAND,
      required: true,
      status: "required-at-publish",
    },
  };
}

export function finalizeReleaseOperation({
  preOperationPath,
  provenancePath,
  manifestPath,
  tag,
  sourceCommit,
  environment = RELEASE_ENVIRONMENT,
  publicationMode,
  workflowRef,
  repository,
  runId,
  runAttempt,
  outputPath,
}) {
  if (publicationMode !== "published" && publicationMode !== "recovered-existing") fail("release publication mode is invalid");
  const operation = json(preOperationPath, "pre-publish release operation evidence");
  const provenance = json(provenancePath, "npm provenance evidence");
  const manifest = json(manifestPath, "release manifest");
  validCommit(sourceCommit, "release source commit");
  const recoveryManifest = manifest.artifact_kind === "published-npm-recovery-manifest";
  if (recoveryManifest && (
    manifest.schema_version !== 1 ||
    manifest.mode !== "release-recovery" ||
    manifest.package_name !== PACKAGE_NAME ||
    manifest.release_tag !== tag ||
    manifest.source_commit !== sourceCommit ||
    manifest.published_artifact?.source !== "npm-registry-tarball" ||
    typeof manifest.published_artifact?.tarball_sha512 !== "string" ||
    !/^[0-9a-f]{128}$/.test(manifest.published_artifact.tarball_sha512)
  )) {
    fail("published recovery manifest identity is invalid");
  }
  if (!isValidSemVer(manifest.package_version) || tag !== `v${manifest.package_version}`) fail("release tag/version identity is invalid");
  if (!isPlainObject(operation) || operation.package_name !== PACKAGE_NAME || operation.package_version !== manifest.package_version || operation.release_tag !== tag || operation.source_commit !== sourceCommit || operation.provenance?.status !== "required-at-publish") {
    fail("pre-publish release operation identity is invalid");
  }
  const manifestTarball = recoveryManifest ? manifest.published_artifact : manifest.npm_tarball;
  const manifestTarballSha256 = manifestTarball?.tarball_sha256 ?? manifestTarball?.sha256;
  if (!isPlainObject(manifestTarball) || operation.npm_tarball?.sha256 !== manifestTarballSha256) fail("pre-publish release operation tarball differs from the release manifest");
  if (repository !== REPOSITORY) fail("GitHub repository is not the approved release repository");
  if (workflowRef !== `${repository}/.github/workflows/release.yml@refs/tags/${tag}`) fail("GitHub workflow identity differs from the release tag");
  if (typeof runId !== "string" || !/^\d+$/.test(runId)) fail("GitHub workflow run identity is invalid");
  if (!Number.isInteger(runAttempt) || runAttempt < 1) fail("GitHub workflow run attempt is invalid");
  if (!isPlainObject(manifestTarball) || typeof (manifestTarball.tarball_sha256 ?? manifestTarball.sha256) !== "string" || !Number.isInteger(manifestTarball.tarball_size ?? manifestTarball.size)) fail("release manifest npm tarball identity is invalid");
  const expectedTarballSha256 = manifestTarballSha256;
  const expectedTarballSize = manifestTarball.tarball_size ?? manifestTarball.size;
  const expectedTarballSha512 = recoveryManifest ? manifestTarball.tarball_sha512 : provenance.registry?.tarball_sha512;
  validateNpmProvenanceEvidence(provenance, {
    packageName: PACKAGE_NAME,
    version: manifest.package_version,
    tag,
    sourceCommit,
    environment,
    repository,
    tarballSha256: expectedTarballSha256,
    tarballSize: expectedTarballSize,
    tarballSha512: expectedTarballSha512,
    workflowRunId: runId,
    workflowRunAttempt: runAttempt,
  });
  const expectedPublicationMode = publicationMode === "recovered-existing" ? "post-publish-recovery" : "fresh-publish";
  if (provenance.publication_mode !== expectedPublicationMode) fail("npm provenance publication mode does not match the publication operation");
  const provenanceDigest = sha256File(provenancePath, "npm provenance evidence");
  const finalOperation = {
    ...operation,
    provenance: {
      ...operation.provenance,
      status: "published",
      evidence: {
        filename: "npm-provenance.json",
        sha256: provenanceDigest,
      },
      predicate_types: provenance.provenance.predicate_types,
      actual_publish_invocation_ids: provenance.provenance.identities.map((identity) => identity.invocation_id),
    },
    publication: {
      mode: publicationMode,
      repository,
      workflow_ref: workflowRef,
      workflow_run_id: runId,
      workflow_run_attempt: runAttempt,
      registry_metadata_url: provenance.registry.metadata_url,
      registry_tarball_url: provenance.registry.tarball_url,
      registry_attestations_url: provenance.registry.attestations_url,
      registry_tarball_sha256: provenance.registry.tarball_sha256,
    },
  };
  if (outputPath !== undefined) writeJson(outputPath, finalOperation);
  return finalOperation;
}

function jobBlock(workflow, jobId) {
  const start = workflow.indexOf(`  ${jobId}:\n`);
  if (start < 0) fail(`workflow job is missing: ${jobId}`);
  const remainder = workflow.slice(start);
  const next = remainder.search(/\n  [A-Za-z0-9_-]+:/);
  return remainder.slice(0, next < 0 ? remainder.length : next);
}

function requireWorkflowText(workflow, pattern, message) {
  if (!pattern.test(workflow)) fail(message);
}

function workflowConcurrency(workflow, label) {
  if (typeof workflow !== "string") fail(`${label} is unavailable`);
  const match = workflow.match(/^concurrency:\n  group: (.+)\n  cancel-in-progress: (true|false)$/m);
  if (!match) fail(`${label} concurrency boundary is missing`);
  return {
    group: match[1],
    cancelInProgress: match[2] === "true",
  };
}

export function validateReleaseWorkflowConcurrency({ releaseWorkflow, candidateWorkflow, cAbiWorkflow }) {
  const release = workflowConcurrency(releaseWorkflow, "release workflow");
  const candidate = workflowConcurrency(candidateWorkflow, "candidate workflow");
  const cAbi = workflowConcurrency(cAbiWorkflow, "C ABI workflow");

  if (release.group !== RELEASE_CONCURRENCY_GROUP) fail("release workflow concurrency group changed");
  if (!release.cancelInProgress) fail("release workflow must cancel duplicate in-progress runs");
  if (candidate.group === release.group) fail("candidate reusable workflow concurrency group collides with release caller");
  if (cAbi.group === release.group) fail("C ABI reusable workflow concurrency group collides with release caller");
  if (candidate.group === cAbi.group) fail("called reusable workflow concurrency groups are not unique");
  if (candidate.group !== `node-${REF_CONCURRENCY_SUFFIX}`) fail("candidate reusable workflow concurrency group is not deterministic");
  if (cAbi.group !== `c-abi-release-${REF_CONCURRENCY_SUFFIX}`) fail("C ABI reusable workflow concurrency group is not deterministic");
  if (!candidate.cancelInProgress) fail("candidate reusable workflow must cancel duplicate in-progress runs");
  if (!cAbi.cancelInProgress) fail("C ABI reusable workflow must cancel duplicate in-progress runs");

  return {
    release: { group: release.group, cancel_in_progress: release.cancelInProgress },
    candidate: { group: candidate.group, cancel_in_progress: candidate.cancelInProgress },
    c_abi: { group: cAbi.group, cancel_in_progress: cAbi.cancelInProgress },
  };
}

export function validateReleaseArtifactPreservation({ releaseWorkflow, candidateWorkflow, cAbiWorkflow }) {
  const suffix = "${{ github.run_id }}-${{ github.run_attempt }}-${{ github.sha }}";
  const counts = {};
  for (const [label, workflow] of [["release workflow", releaseWorkflow], ["candidate workflow", candidateWorkflow], ["C ABI workflow", cAbiWorkflow]]) {
    if (/^\s+overwrite:\s*true\s*$/m.test(workflow)) fail(`${label} uses destructive artifact overwrite`);
    const names = [...workflow.matchAll(/^\s+name: (release-.*)$/gm)].map((match) => match[1]);
    if (names.length === 0 || names.some((name) => !name.includes(suffix))) fail(`${label} artifact names are not attempt-scoped`);
    counts[label] = names.length;
  }
  return { suffix, counts };
}

export function validateRecoveryWorkflowBoundary(recoveryWorkflow) {
  if (typeof recoveryWorkflow !== "string") fail("recovery workflow is unavailable");
  requireWorkflowText(recoveryWorkflow, /^name: Post-publish release recovery$/m, "recovery workflow name is invalid");
  requireWorkflowText(recoveryWorkflow, /^  workflow_dispatch:$/m, "recovery workflow is not manually triggered");
  if (/^  (push|pull_request|schedule):$/m.test(recoveryWorkflow)) fail("recovery workflow has an automatic trigger");
  requireWorkflowText(recoveryWorkflow, /ref: \$\{\{ github\.sha \}\}/, "recovery workflow does not run the reviewed recovery tooling commit");
  requireWorkflowText(recoveryWorkflow, /test "\$GITHUB_REF" = "refs\/heads\/main"/, "recovery workflow does not require a main dispatch ref");
  requireWorkflowText(recoveryWorkflow, /scripts\/release-recovery\.mjs validate-dispatch/, "recovery workflow does not bind tooling to the current origin/main SHA");
  requireWorkflowText(recoveryWorkflow, /--main-ref "\$\(git rev-parse refs\/remotes\/origin\/main\)"/, "recovery workflow does not compare the dispatch SHA with origin/main");
  requireWorkflowText(recoveryWorkflow, /refs\/tags\/\$RELEASE_TAG:refs\/tags\/\$RELEASE_TAG/, "recovery workflow does not fetch and bind the immutable release tag");
  for (const input of ["release_tag", "package_version", "expected_source_commit", "original_publish_run_id", "original_publish_run_attempt", "artifact_source_run_id", "artifact_source_run_attempt", "artifact_suffix"]) {
    requireWorkflowText(recoveryWorkflow, new RegExp(`^      ${input}:$`, "m"), `recovery workflow input is missing: ${input}`);
  }
  if (/\bnpm\s+(publish|dist-tag|unpublish)\b/.test(recoveryWorkflow)) fail("recovery workflow contains npm publication capability");
  if (/id-token:\s*write|packages:\s*write|actions:\s*write|NPM_TOKEN|NODE_AUTH_TOKEN|_authToken/.test(recoveryWorkflow)) fail("recovery workflow contains an unnecessary publication credential or permission");
  requireWorkflowText(recoveryWorkflow, /actions:\s*read/, "recovery workflow cannot read the original Actions run artifacts");
  requireWorkflowText(recoveryWorkflow, /actions\/runs\/\$ORIGINAL_PUBLISH_RUN_ID\/attempts\/\$ORIGINAL_PUBLISH_RUN_ATTEMPT/, "recovery workflow does not use the attempt-specific original publish endpoint");
  requireWorkflowText(recoveryWorkflow, /actions\/runs\/\$ARTIFACT_SOURCE_RUN_ID\/attempts\/\$ARTIFACT_SOURCE_RUN_ATTEMPT/, "recovery workflow does not use an attempt-specific artifact source endpoint");
  requireWorkflowText(recoveryWorkflow, /actions\/download-artifact@[0-9a-f]{40}[\s\S]*run-id: \$\{\{ inputs\.artifact_source_run_id \}\}/, "recovery workflow does not bind artifact downloads to the separate artifact source run");
  requireWorkflowText(recoveryWorkflow, /scripts\/npm-provenance\.mjs capture[\s\S]*--recovery/, "recovery workflow does not capture recovery provenance");
  requireWorkflowText(recoveryWorkflow, /scripts\/release-recovery\.mjs reconstruct/, "recovery workflow does not reconstruct published evidence from the registry artifact");
  requireWorkflowText(recoveryWorkflow, /scripts\/release-operation\.mjs finalize/, "recovery workflow does not finalize the release operation");
  requireWorkflowText(recoveryWorkflow, /scripts\/release-record\.mjs (generate|validate)/, "recovery workflow does not validate a reconstructed release record");
  requireWorkflowText(recoveryWorkflow, /scripts\/release-publication\.mjs assemble/, "recovery workflow does not reuse the exact publication asset contract");
  requireWorkflowText(recoveryWorkflow, /gh release create/, "recovery workflow does not create the formal GitHub Release");
  requireWorkflowText(recoveryWorkflow, /scripts\/github-release\.mjs verify/, "recovery workflow does not verify the published GitHub Release assets");
  const verify = jobBlock(recoveryWorkflow, "verify");
  const publication = jobBlock(recoveryWorkflow, "publication");
  if (!verify.includes("    permissions:\n      contents: read\n      actions: read") || verify.includes("contents: write")) fail("recovery verification permissions are not read-only");
  if (!publication.includes("    environment:\n      name: release") || !publication.includes("    permissions:\n      contents: write")) fail("recovery GitHub Release publication is not protected by the release Environment");
  if (verify.includes("    environment:")) fail("recovery verification job uses the release Environment");
  return {
    trigger: "workflow_dispatch",
    publish_capability: false,
    verification_permissions: ["contents: read", "actions: read"],
    publication_job: "publication",
    publication_environment: RELEASE_ENVIRONMENT,
  };
}

export function validateReleaseWorkflowBoundary({ releaseWorkflow, candidateWorkflow, cAbiWorkflow }) {
  requireWorkflowText(releaseWorkflow, /^name: Release operation$/m, "release workflow name is invalid");
  requireWorkflowText(releaseWorkflow, /^    tags:\n      - ["']v\*["']$/m, "release workflow is not tag-triggered");
  requireWorkflowText(releaseWorkflow, /uses: \.\/\.github\/workflows\/node\.yml/, "release workflow does not call candidate validation");
  requireWorkflowText(releaseWorkflow, /release_mode: release/, "formal release mode is not selected");
  requireWorkflowText(releaseWorkflow, /release_tag: \$\{\{ github\.ref_name \}\}/, "release tag is not passed from the tag event");
  const concurrency = validateReleaseWorkflowConcurrency({ releaseWorkflow, candidateWorkflow, cAbiWorkflow });
  const artifactPreservation = validateReleaseArtifactPreservation({ releaseWorkflow, candidateWorkflow, cAbiWorkflow });
  const environmentMatches = releaseWorkflow.match(/^    environment:\n      name: release$/gm) ?? [];
  const publish = jobBlock(releaseWorkflow, "publish");
  const publication = jobBlock(releaseWorkflow, "publication");
  if (!publish.includes("    environment:\n      name: release")) fail("publish job is not protected by Environment release");
  if (!publication.includes("    environment:\n      name: release")) fail("publication job is not protected by Environment release");
  if (environmentMatches.length !== 2) fail("exactly two release jobs must use Environment release");
  if (!publish.includes("    permissions:\n      contents: read\n      id-token: write")) fail("publish job permissions are not the least-privilege OIDC boundary");
  if (publish.includes("contents: write")) fail("publish job has GitHub Release write permission");
  if (!publication.includes("    permissions:\n      contents: write")) fail("publication job does not have GitHub Release write permission");
  for (const jobId of ["identity", "candidate", "c-abi", "release-record"]) {
    if (jobBlock(releaseWorkflow, jobId).includes("    environment:\n      name: release")) {
      fail(`${jobId} job uses Environment release`);
    }
  }
  if (!publication.includes("scripts/release-publication.mjs assemble") || !publication.includes("scripts/github-release.mjs plan") || !publication.includes("scripts/github-release.mjs verify") || !publication.includes("gh release create") || !publication.includes("gh release upload")) fail("publication job does not implement durable GitHub Release publication");
  if (!releaseWorkflow.includes("--allow-existing-version") || !publish.includes("SNWC_PUBLICATION_MODE=recovered-existing") || !publish.includes("scripts/npm-provenance.mjs capture") || !publish.includes("scripts/release-operation.mjs finalize") || !publish.includes("--provenance-status published")) fail("release workflow does not implement fail-closed publish retry recovery");
  if ((releaseWorkflow.match(/id-token: write/g) ?? []).length !== 1) fail("id-token: write is granted outside the publish job");
  if ((releaseWorkflow.match(/contents: write/g) ?? []).length !== 1 || /packages: write|actions: write|NODE_AUTH_TOKEN|NPM_TOKEN|_authToken/.test(releaseWorkflow)) {
    fail("release workflow contains an unnecessary write permission or long-lived npm token requirement");
  }
  const publishCommands = releaseWorkflow.split(/\r?\n/).filter((line) => line.includes("npm publish"));
  if (publishCommands.length !== 1 || !publishCommands[0].includes(PROVENANCE_PUBLISH_COMMAND)) {
    fail("release workflow must have exactly one provenance-required npm publish command");
  }
  if (/npm publish(?! --provenance)/.test(releaseWorkflow)) fail("provenance-disabled npm publish fallback is present");
  if (/^    environment:/m.test(candidateWorkflow)) fail("candidate build/test workflow uses release Environment");
  requireWorkflowText(candidateWorkflow, /^  workflow_call:$/m, "candidate workflow is not reusable");
  return {
    environment: RELEASE_ENVIRONMENT,
    protected_jobs: ["publish", "publication"],
    candidate_workflow: ".github/workflows/node.yml",
    concurrency,
    oidc_permission: "publish only",
    publication_job: "publication",
    durable_release_record: "GitHub Release assets",
    retry_recovery: "existing-version provenance verification without republish",
    artifact_preservation: artifactPreservation,
    provenance_command: PROVENANCE_PUBLISH_COMMAND,
  };
}

function argument(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index < 0) {
    if (fallback !== undefined) return fallback;
    fail(`missing ${name}`);
  }
  if (argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
  return argv[index + 1];
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function gitCommit(ref, label) {
  try {
    return execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    fail(`${label} is unavailable`);
  }
}

function isAncestor(ancestor, descendant) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    return true;
  } catch (error) {
    if (error?.status === 1) return false;
    fail("main ancestry could not be verified in the publish checkout");
  }
}

function run() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (command !== "verify" && command !== "finalize") fail("usage: verify | finalize");
  if (command === "finalize") {
    const publicationMode = argument(argv, "--publication-mode");
    const runAttemptValue = argument(argv, "--run-attempt", process.env.GITHUB_RUN_ATTEMPT);
    const result = finalizeReleaseOperation({
      preOperationPath: resolve(repositoryRoot, argument(argv, "--pre-operation")),
      provenancePath: resolve(repositoryRoot, argument(argv, "--provenance")),
      manifestPath: resolve(repositoryRoot, argument(argv, "--manifest")),
      tag: argument(argv, "--tag", process.env.GITHUB_REF_NAME),
      sourceCommit: argument(argv, "--source-commit", process.env.GITHUB_SHA),
      environment: argument(argv, "--environment", process.env.SNWC_RELEASE_ENVIRONMENT ?? RELEASE_ENVIRONMENT),
      publicationMode,
      workflowRef: argument(argv, "--workflow-ref", process.env.GITHUB_WORKFLOW_REF),
      repository: argument(argv, "--repository", process.env.GITHUB_REPOSITORY),
      runId: argument(argv, "--run-id", process.env.GITHUB_RUN_ID),
      runAttempt: Number(runAttemptValue),
      outputPath: resolve(repositoryRoot, argument(argv, "--output")),
    });
    process.stdout.write(`${JSON.stringify({ operation: result, status: "published" })}\n`);
    return;
  }
  const releaseDir = resolve(repositoryRoot, argument(argv, "--release-dir"));
  const identityPath = resolve(repositoryRoot, argument(argv, "--identity"));
  const tag = argument(argv, "--tag", process.env.GITHUB_REF_NAME);
  const sourceCommit = argument(argv, "--source-commit", process.env.GITHUB_SHA);
  const environment = argument(argv, "--environment", process.env.SNWC_RELEASE_ENVIRONMENT ?? RELEASE_ENVIRONMENT);
  const outputPath = argv.includes("--output") ? resolve(repositoryRoot, argument(argv, "--output")) : undefined;
  const recovery = argv.includes("--recovery");
  if (process.env.GITHUB_REF_TYPE !== undefined && process.env.GITHUB_REF_TYPE !== "tag") fail("release workflow ref type is not tag");
  if (process.env.GITHUB_REF !== undefined && process.env.GITHUB_REF !== `refs/tags/${tag}`) fail("release workflow ref differs from release tag");
  const checkoutHead = gitCommit("HEAD", "checked out release commit");
  const tagCommit = gitCommit(`refs/tags/${tag}`, "release tag ref in the publish checkout");
  if (tagCommit !== sourceCommit || (!recovery && checkoutHead !== sourceCommit)) fail("publish checkout does not match the release source commit and tag");
  const mainRefCommit = gitCommit("refs/remotes/origin/main", "main ref in the publish checkout");
  if (!isAncestor(sourceCommit, "refs/remotes/origin/main")) fail("publish source commit is not contained in main");
  const identity = json(identityPath, "release identity evidence");
  if (!recovery && identity.main_ref_commit !== mainRefCommit) fail("publish main ref differs from release identity evidence");
  if (recovery && (!COMMIT_PATTERN.test(identity.main_ref_commit) || !isAncestor(identity.main_ref_commit, "refs/remotes/origin/main"))) fail("original release main ref is not contained in the approved main history");
  const result = validateReleaseBundle({ releaseDir, identityPath, tag, sourceCommit, environment, recovery });
  if (outputPath !== undefined) writeJson(outputPath, result);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

export {
  PACKAGE_NAME,
  PROVENANCE_PUBLISH_COMMAND,
  RELEASE_ENVIRONMENT,
};

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

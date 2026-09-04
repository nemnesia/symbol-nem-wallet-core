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
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateNpmRepositoryMetadata } from "./npm-repository.mjs";
import {
  NPM_REQUIRED_FILES,
  PUBLISHED_GENERATED_EVIDENCE,
  PUBLISHED_NATIVE_EVIDENCE,
  PUBLISHED_NATIVE_MANIFEST,
  PUBLISHED_PACKAGE_JSON,
  PUBLISHED_RECOVERY_FILES,
  PUBLISHED_RECOVERY_MANIFEST,
  PUBLISHED_REGISTRY_TARBALL,
  PUBLISHED_WASM,
  PUBLISHED_WASM_EVIDENCE,
  RECOVERY_ARTIFACT_SOURCE,
} from "./recovery-evidence.mjs";
import { validateNativeManifest } from "../packages/wallet-core/src/manifest.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";
const REPOSITORY = "nemnesia/symbol-nem-wallet-core";
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const SHA512_PATTERN = /^[0-9a-f]{128}$/;
const RELEASE_WORKFLOW_PATH = ".github/workflows/release.yml";
const REQUIRED_NATIVE_TARGETS = [
  "win32-x64-msvc",
  "darwin-x64",
  "darwin-arm64",
  "linux-x64-gnu",
];
const WASM_TARBALL_PATH = "package/dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm";

function fail(message) {
  throw new Error(`Release recovery gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function json(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`${label} is unreadable or malformed`);
  }
}

function bytes(path, label) {
  try {
    return readFileSync(path);
  } catch {
    fail(`${label} is unreadable`);
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha512(value) {
  return createHash("sha512").update(value).digest("hex");
}

function safeRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.includes("\n") || value.includes("\r") || value.startsWith("/") || value.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail(`${label} is not a safe relative path`);
  }
}

function safeFilename(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("/") || value.includes("\\") || value === "." || value === "..") {
    fail(`${label} is not a safe filename`);
  }
}

function assertDirectory(root, label) {
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`${label} is missing`);
}

function assertEmptyOrMissingDirectory(root, label) {
  if (!existsSync(root)) return;
  assertDirectory(root, label);
  if (readdirSync(root).length !== 0) fail(`${label} must be empty; recovery evidence is immutable`);
}

function assertExactFiles(root, expected, label) {
  assertDirectory(root, label);
  const actual = readdirSync(root, { withFileTypes: true }).map((entry) => {
    if (!entry.isFile()) fail(`${label} contains a non-file entry: ${entry.name}`);
    safeFilename(entry.name, `${label} entry`);
    return entry.name;
  }).sort();
  const expectedSorted = [...new Set(expected)].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) fail(`${label} contains missing or unexpected files`);
}

function validateManifestIdentity(manifest, tag, sourceCommit) {
  if (!isPlainObject(manifest) || manifest.schema_version !== 1 || manifest.mode !== "release" || manifest.package_name !== PACKAGE_NAME || manifest.release_tag !== tag || manifest.source_commit !== sourceCommit || !isPlainObject(manifest.npm_tarball)) {
    fail("original candidate release manifest identity is invalid");
  }
  if (!COMMIT_PATTERN.test(sourceCommit) || tag !== `v${manifest.package_version}`) fail("original candidate release manifest tag/source identity is invalid");
  if (manifest.npm_tarball.package_name !== PACKAGE_NAME || manifest.npm_tarball.package_version !== manifest.package_version) fail("original candidate release manifest package identity is invalid");
  safeFilename(manifest.npm_tarball.filename, "original candidate release tarball filename");
  if (!HASH_PATTERN.test(manifest.npm_tarball.sha256) || !Number.isSafeInteger(manifest.npm_tarball.size) || manifest.npm_tarball.size < 0) fail("original candidate release tarball identity is invalid");
  return manifest;
}

function registryListing(tarball) {
  let listing;
  try {
    listing = execFileSync("tar", ["-tzf", "-"], { cwd: repositoryRoot, input: tarball, encoding: "utf8" });
  } catch {
    fail("published registry tarball is corrupt or unreadable");
  }
  const entries = listing.split(/\r?\n/).filter(Boolean);
  for (const entry of entries) {
    const path = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    if (path.length === 0 || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === "" || part === "." || part === "..")) fail("published registry tarball contains an unsafe path");
  }
  if (new Set(entries).size !== entries.length) fail("published registry tarball contains duplicate paths");
  return entries;
}

function registryEntry(tarball, entries, entryPath, label) {
  safeRelativePath(entryPath, `${label} path`);
  if (entries.filter((entry) => entry === entryPath).length !== 1) fail(`${label} is missing or duplicated in the published registry tarball`);
  try {
    return execFileSync("tar", ["-xzOf", "-", entryPath], { cwd: repositoryRoot, input: tarball, maxBuffer: 64 * 1024 * 1024 });
  } catch {
    fail(`${label} is unreadable in the published registry tarball`);
  }
}

function fileDigest(root, filename, label = filename) {
  safeFilename(filename, label);
  const path = resolve(root, filename);
  if (!existsSync(path) || !statSync(path).isFile()) fail(`${label} is missing`);
  const content = bytes(path, label);
  return { filename, sha256: sha256(content), size: content.length };
}

function validatePublishedPackageMetadata(metadata, version) {
  if (!isPlainObject(metadata) || metadata.name !== PACKAGE_NAME || metadata.version !== version) fail("published tarball package identity differs from the recovery identity");
  try {
    validateNpmRepositoryMetadata(metadata, "published tarball package metadata");
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  return metadata;
}

function validatePublishedRuntimeManifest(runtimeManifest, metadata, sourceCommit, version) {
  try {
    validateNativeManifest(runtimeManifest, metadata);
  } catch {
    fail("published native runtime manifest is invalid");
  }
  if (runtimeManifest.package_name !== PACKAGE_NAME || runtimeManifest.package_version !== version || runtimeManifest.source_commit !== sourceCommit) fail("published native runtime manifest identity differs from the recovery identity");
  const targets = runtimeManifest.artifacts.map((artifact) => artifact.target_id);
  if (JSON.stringify(targets) !== JSON.stringify(REQUIRED_NATIVE_TARGETS)) fail("published native runtime target set or order differs from the canonical target set");
  return runtimeManifest;
}

function validatePublishedTarball(tarball, sourceCommit, version) {
  const entries = registryListing(tarball);
  const metadata = validatePublishedPackageMetadata(JSON.parse(registryEntry(tarball, entries, "package/package.json", "published package metadata").toString("utf8")), version);
  const runtimeManifest = validatePublishedRuntimeManifest(JSON.parse(registryEntry(tarball, entries, "package/dist/native/artifact-manifest.json", "published native runtime manifest").toString("utf8")), metadata, sourceCommit, version);
  const nativeArtifacts = runtimeManifest.artifacts.map((artifact) => {
    const content = registryEntry(tarball, entries, `package/${artifact.relative_path}`, `published native artifact ${artifact.target_id}`);
    if (sha256(content) !== artifact.sha256) fail(`published native artifact bytes differ from its runtime manifest: ${artifact.target_id}`);
    return {
      target_id: artifact.target_id,
      relative_path: artifact.relative_path,
      artifact_filename: artifact.artifact_filename,
      sha256: artifact.sha256,
      size: content.length,
      source_commit: sourceCommit,
      package_version: version,
    };
  });
  const wasmBytes = registryEntry(tarball, entries, WASM_TARBALL_PATH, "published canonical WASM");
  if (wasmBytes.length === 0) fail("published canonical WASM is empty");
  const generatedEntries = entries.filter((entry) => /\.(?:cjs|mjs|js|d\.ts)$/.test(entry)).map((entry) => {
    const content = registryEntry(tarball, entries, entry, `published generated file ${entry}`);
    return { path: entry, sha256: sha256(content), size: content.length };
  });
  if (generatedEntries.length === 0) fail("published generated JS evidence is missing");
  return {
    entries,
    metadata,
    metadataBytes: registryEntry(tarball, entries, "package/package.json", "published package metadata"),
    runtimeManifest,
    runtimeManifestBytes: registryEntry(tarball, entries, "package/dist/native/artifact-manifest.json", "published native runtime manifest"),
    nativeArtifacts,
    wasm: {
      relative_path: WASM_TARBALL_PATH.slice("package/".length),
      artifact_filename: "symbol_nem_wallet_core_wasm_bg.wasm",
      sha256: sha256(wasmBytes),
      size: wasmBytes.length,
      source_commit: sourceCommit,
      package_version: version,
    },
    generatedEntries,
    nativeBytes: new Map(runtimeManifest.artifacts.map((artifact) => [artifact.target_id, registryEntry(tarball, entries, `package/${artifact.relative_path}`, `published native artifact ${artifact.target_id}`)])),
    wasmBytes,
  };
}

function validateRecoveryManifest(manifest, root, tag, sourceCommit) {
  if (!isPlainObject(manifest) || manifest.schema_version !== 1 || manifest.artifact_kind !== "published-npm-recovery-manifest" || manifest.mode !== "release-recovery" || manifest.package_name !== PACKAGE_NAME || manifest.release_tag !== tag || manifest.source_commit !== sourceCommit || !isPlainObject(manifest.candidate_artifact) || !isPlainObject(manifest.published_artifact) || !Array.isArray(manifest.native_artifacts) || !isPlainObject(manifest.wasm)) {
    fail("published recovery manifest identity is invalid");
  }
  if (manifest.package_version !== manifest.candidate_artifact.package_version || manifest.package_version !== manifest.published_artifact.package_version || tag !== `v${manifest.package_version}`) fail("published recovery manifest package identity is invalid");
  const candidateManifest = validateManifestIdentity(json(resolve(root, "release-manifest.json"), "historical candidate release manifest"), tag, sourceCommit);
  const candidateTarball = fileDigest(root, candidateManifest.npm_tarball.filename, "historical candidate npm tarball");
  const candidateManifestFile = fileDigest(root, "release-manifest.json", "historical candidate release manifest");
  if (candidateTarball.sha256 !== candidateManifest.npm_tarball.sha256 || candidateTarball.size !== candidateManifest.npm_tarball.size) fail("historical candidate tarball differs from its release manifest");
  if (manifest.candidate_artifact.manifest_filename !== "release-manifest.json" || manifest.candidate_artifact.manifest_sha256 !== candidateManifestFile.sha256 || manifest.candidate_artifact.tarball_filename !== candidateManifest.npm_tarball.filename || manifest.candidate_artifact.tarball_sha256 !== candidateTarball.sha256 || manifest.candidate_artifact.tarball_size !== candidateTarball.size) fail("published recovery candidate evidence does not match the immutable candidate files");
  const publishedTarball = fileDigest(root, PUBLISHED_REGISTRY_TARBALL, "published registry tarball");
  const publishedManifest = manifest.published_artifact;
  if (publishedManifest.tarball_filename !== PUBLISHED_REGISTRY_TARBALL || publishedManifest.tarball_sha256 !== publishedTarball.sha256 || publishedManifest.tarball_size !== publishedTarball.size || !SHA512_PATTERN.test(publishedManifest.tarball_sha512) || publishedManifest.integrity !== `sha512-${Buffer.from(publishedManifest.tarball_sha512, "hex").toString("base64")}`) fail("published recovery registry tarball identity is invalid");
  if (publishedManifest.byte_reproducible !== (candidateTarball.sha256 === publishedTarball.sha256 && candidateTarball.size === publishedTarball.size) || manifest.byte_reproducible !== publishedManifest.byte_reproducible) fail("published recovery byte reproducibility result is inconsistent");
  const packageFile = fileDigest(root, PUBLISHED_PACKAGE_JSON, "published package metadata");
  const nativeManifestFile = fileDigest(root, PUBLISHED_NATIVE_MANIFEST, "published native runtime manifest");
  const nativeEvidenceFile = fileDigest(root, PUBLISHED_NATIVE_EVIDENCE, "published native evidence");
  const wasmFile = fileDigest(root, PUBLISHED_WASM, "published WASM");
  const wasmEvidenceFile = fileDigest(root, PUBLISHED_WASM_EVIDENCE, "published WASM evidence");
  const generatedEvidenceFile = fileDigest(root, PUBLISHED_GENERATED_EVIDENCE, "published generated evidence");
  if (publishedManifest.package_json?.filename !== packageFile.filename || publishedManifest.package_json?.sha256 !== packageFile.sha256 || publishedManifest.package_json?.size !== packageFile.size || publishedManifest.native_manifest?.filename !== nativeManifestFile.filename || publishedManifest.native_manifest?.sha256 !== nativeManifestFile.sha256 || publishedManifest.native_manifest?.size !== nativeManifestFile.size || publishedManifest.native_evidence?.filename !== nativeEvidenceFile.filename || publishedManifest.native_evidence?.sha256 !== nativeEvidenceFile.sha256 || publishedManifest.native_evidence?.size !== nativeEvidenceFile.size || publishedManifest.wasm_evidence?.filename !== wasmEvidenceFile.filename || publishedManifest.wasm_evidence?.sha256 !== wasmEvidenceFile.sha256 || publishedManifest.wasm_evidence?.size !== wasmEvidenceFile.size || publishedManifest.generated_evidence?.filename !== generatedEvidenceFile.filename || publishedManifest.generated_evidence?.sha256 !== generatedEvidenceFile.sha256 || publishedManifest.generated_evidence?.size !== generatedEvidenceFile.size) fail("published recovery evidence file digests are inconsistent");
  const metadata = validatePublishedPackageMetadata(json(resolve(root, PUBLISHED_PACKAGE_JSON), "published package metadata"), manifest.package_version);
  const runtimeManifest = validatePublishedRuntimeManifest(json(resolve(root, PUBLISHED_NATIVE_MANIFEST), "published native runtime manifest"), metadata, sourceCommit, manifest.package_version);
  const publishedTarballBytes = bytes(resolve(root, PUBLISHED_REGISTRY_TARBALL), "published registry tarball");
  const tarballEvidence = validatePublishedTarball(publishedTarballBytes, sourceCommit, manifest.package_version);
  if (sha512(publishedTarballBytes) !== publishedManifest.tarball_sha512 || Buffer.compare(bytes(resolve(root, PUBLISHED_PACKAGE_JSON), "published package metadata"), tarballEvidence.metadataBytes) !== 0 || Buffer.compare(bytes(resolve(root, PUBLISHED_NATIVE_MANIFEST), "published native runtime manifest"), tarballEvidence.runtimeManifestBytes) !== 0 || JSON.stringify(tarballEvidence.metadata) !== JSON.stringify(metadata) || JSON.stringify(tarballEvidence.runtimeManifest) !== JSON.stringify(runtimeManifest)) fail("published recovery constituent evidence differs from the canonical registry tarball");
  const nativeEvidence = json(resolve(root, PUBLISHED_NATIVE_EVIDENCE), "published native evidence");
  const expectedNative = tarballEvidence.nativeArtifacts.map((artifact) => ({ ...artifact, filename: `published-${artifact.target_id}.node`, runtime_manifest_sha256: nativeManifestFile.sha256 }));
  if (!isPlainObject(nativeEvidence) || nativeEvidence.schema_version !== 1 || nativeEvidence.artifact_kind !== "published-native-evidence" || nativeEvidence.source !== "npm-registry-tarball" || nativeEvidence.package_name !== PACKAGE_NAME || nativeEvidence.package_version !== manifest.package_version || nativeEvidence.source_commit !== sourceCommit || JSON.stringify(nativeEvidence.artifacts) !== JSON.stringify(expectedNative) || JSON.stringify(manifest.native_artifacts) !== JSON.stringify(expectedNative)) fail("published native evidence identity is invalid");
  const nativeFiles = [];
  for (const artifact of tarballEvidence.nativeArtifacts) {
    const actual = fileDigest(root, `published-${artifact.target_id}.node`, `published native bytes ${artifact.target_id}`);
    if (actual.sha256 !== artifact.sha256 || actual.size !== artifact.size) fail(`published native bytes differ from registry tarball: ${artifact.target_id}`);
    nativeFiles.push(actual);
  }
  const wasmEvidence = json(resolve(root, PUBLISHED_WASM_EVIDENCE), "published WASM evidence");
  const expectedWasm = { ...tarballEvidence.wasm, filename: PUBLISHED_WASM };
  if (!isPlainObject(wasmEvidence) || wasmEvidence.schema_version !== 1 || wasmEvidence.artifact_kind !== "published-wasm-evidence" || wasmEvidence.source !== "npm-registry-tarball" || wasmEvidence.package_name !== PACKAGE_NAME || wasmEvidence.package_version !== manifest.package_version || wasmEvidence.source_commit !== sourceCommit || wasmEvidence.relative_path !== tarballEvidence.wasm.relative_path || wasmEvidence.artifact_filename !== tarballEvidence.wasm.artifact_filename || wasmEvidence.sha256 !== tarballEvidence.wasm.sha256 || wasmEvidence.size !== tarballEvidence.wasm.size || JSON.stringify(manifest.wasm) !== JSON.stringify(expectedWasm)) fail("published WASM evidence identity is invalid");
  if (wasmFile.sha256 !== tarballEvidence.wasm.sha256 || wasmFile.size !== tarballEvidence.wasm.size) fail("published WASM bytes differ from the registry tarball");
  const generatedEvidence = json(resolve(root, PUBLISHED_GENERATED_EVIDENCE), "published generated evidence");
  if (!isPlainObject(generatedEvidence) || generatedEvidence.schema_version !== 1 || generatedEvidence.artifact_kind !== "published-generated-evidence" || generatedEvidence.source !== "npm-registry-tarball" || generatedEvidence.package_name !== PACKAGE_NAME || generatedEvidence.package_version !== manifest.package_version || generatedEvidence.source_commit !== sourceCommit || JSON.stringify(generatedEvidence.files) !== JSON.stringify(tarballEvidence.generatedEntries)) fail("published generated evidence differs from the registry tarball");
  return {
    manifest,
    candidate: { manifest: candidateManifest, manifestFile: candidateManifestFile, tarball: candidateTarball },
    published: { tarball: publishedTarball, packageFile, nativeManifestFile, nativeEvidenceFile, wasmFile, wasmEvidenceFile, generatedEvidenceFile, native: nativeFiles, wasm: expectedWasm },
  };
}

export function validateOriginalReleaseRun(run, { repository, releaseTag, sourceCommit, runId, runAttempt }) {
  if (!isPlainObject(run)) fail("original release run metadata is malformed");
  if (repository !== REPOSITORY || !/^v\d+\.\d+\.\d+$/.test(releaseTag) || !COMMIT_PATTERN.test(sourceCommit) || !/^\d+$/.test(String(runId)) || !/^\d+$/.test(String(runAttempt))) fail("original release run request identity is invalid");
  if (String(run.id) !== String(runId)) fail("original release run id differs from the requested run");
  if (run.repository?.full_name !== repository || run.head_repository?.full_name !== repository) fail("original release run repository identity differs");
  if (run.event !== "push" || run.status !== "completed") fail("original release run is not a completed tag push");
  if (run.head_branch !== releaseTag || run.head_sha !== sourceCommit) fail("original release run tag or source commit differs");
  if (run.path !== RELEASE_WORKFLOW_PATH) fail("original release run workflow path differs");
  if (Number(run.run_attempt) !== Number(runAttempt) || !Number.isInteger(Number(run.run_attempt)) || Number(run.run_attempt) < 1) fail("original release run attempt differs");
  if (run.workflow_ref !== undefined && run.workflow_ref !== null && run.workflow_ref !== `${repository}/${RELEASE_WORKFLOW_PATH}@refs/tags/${releaseTag}`) fail("original release run workflow ref differs");
  return {
    id: String(run.id),
    attempt: Number(run.run_attempt),
    repository,
    workflow_path: RELEASE_WORKFLOW_PATH,
    workflow_ref: `${repository}/${RELEASE_WORKFLOW_PATH}@refs/tags/${releaseTag}`,
    release_tag: releaseTag,
    source_commit: sourceCommit,
    metadata_endpoint: `/repos/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}`,
  };
}

export function validateArtifactSource({ run, originalPublishRun = run, artifacts, repository = REPOSITORY, releaseTag, sourceCommit, runId, runAttempt, originalPublishRunId = runId, originalPublishRunAttempt = runAttempt, artifactSuffix = "" }) {
  const sourceIdentity = validateOriginalReleaseRun(run, { repository, releaseTag, sourceCommit, runId, runAttempt });
  const publishIdentity = validateOriginalReleaseRun(originalPublishRun, { repository, releaseTag, sourceCommit, runId: originalPublishRunId, runAttempt: originalPublishRunAttempt });
  if (!isPlainObject(artifacts) || !Array.isArray(artifacts.artifacts)) fail("artifact source metadata is malformed");
  if (typeof artifactSuffix !== "string" || !/^(?:-[0-9]+-[1-9][0-9]*-[0-9a-f]{40})?$/.test(artifactSuffix)) fail("artifact source suffix is invalid");
  const expectedNames = ["release-identity", "release-npm-package", "release-c-abi"].map((name) => `${name}${artifactSuffix}`);
  const selected = expectedNames.map((name) => {
    const matches = artifacts.artifacts.filter((artifact) => isPlainObject(artifact) && artifact.name === name);
    if (matches.length !== 1) fail(`artifact source does not contain exactly one ${name}`);
    const artifact = matches[0];
    if (!/^[0-9]+$/.test(String(artifact.id)) || typeof artifact.digest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(artifact.digest) || !Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes < 0 || typeof artifact.created_at !== "string" || typeof artifact.updated_at !== "string" || artifact.expired === true) fail(`artifact source metadata is incomplete: ${name}`);
    return {
      id: String(artifact.id),
      name: artifact.name,
      digest: artifact.digest,
      size_in_bytes: artifact.size_in_bytes,
      created_at: artifact.created_at,
      updated_at: artifact.updated_at,
      expired: Boolean(artifact.expired),
    };
  });
  return {
    schema_version: 1,
    artifact_kind: "release-recovery-artifact-source",
    original_publish: {
      run_id: publishIdentity.id,
      run_attempt: publishIdentity.attempt,
      metadata_endpoint: publishIdentity.metadata_endpoint,
      workflow_repository: publishIdentity.repository,
      workflow_path: publishIdentity.workflow_path,
      workflow_ref: publishIdentity.workflow_ref,
      release_tag: releaseTag,
      source_commit: sourceCommit,
    },
    artifact_source: {
      run_id: sourceIdentity.id,
      run_attempt: sourceIdentity.attempt,
      metadata_endpoint: sourceIdentity.metadata_endpoint,
      artifact_suffix: artifactSuffix,
      legacy_unscoped_names: artifactSuffix === "",
      attempt_binding: artifactSuffix === "" ? "run-metadata-bound-name-not-attempt-verifiable" : "attempt-scoped-name",
      artifacts: selected,
    },
  };
}

export function validateDispatchBoundary({ ref, sha, mainRef }) {
  if (ref !== "refs/heads/main") fail("recovery tooling must execute from refs/heads/main");
  if (!COMMIT_PATTERN.test(sha) || !COMMIT_PATTERN.test(mainRef) || sha !== mainRef) fail("recovery tooling SHA is not the current origin/main commit");
  return { ref, sha, main_ref: mainRef, status: "PASS" };
}

export function validateProvenanceInvocation(evidence, { repository = REPOSITORY, runId }) {
  if (repository !== REPOSITORY || !/^\d+$/.test(String(runId)) || !isPlainObject(evidence) || !isPlainObject(evidence.provenance) || !Array.isArray(evidence.provenance.identities)) {
    fail("recovery provenance invocation evidence is malformed");
  }
  const invocationIds = [...new Set(evidence.provenance.identities.map((identity) => identity?.invocation_id))];
  if (invocationIds.length !== 1 || typeof invocationIds[0] !== "string") fail("recovery provenance must have exactly one invocation identity");
  const match = new RegExp(`^https://github.com/${REPOSITORY}/actions/runs/([0-9]+)/attempts/([1-9][0-9]*)$`).exec(invocationIds[0]);
  if (match === null || match[1] !== String(runId)) fail("recovery provenance invocation is not bound to the original publish run attempt");
  return { run_id: match[1], run_attempt: Number(match[2]), invocation_id: invocationIds[0] };
}

export function reconstructPublishedNpmBundle({ sourceDir, registryTarballPath, outputDir, tag, sourceCommit }) {
  const sourceRoot = resolve(repositoryRoot, sourceDir);
  const outputRoot = resolve(repositoryRoot, outputDir);
  const registryPath = resolve(repositoryRoot, registryTarballPath);
  const manifest = validateManifestIdentity(json(resolve(sourceRoot, "release-manifest.json"), "historical candidate release manifest"), tag, sourceCommit);
  const candidateFiles = [...NPM_REQUIRED_FILES, manifest.npm_tarball.filename];
  assertExactFiles(sourceRoot, candidateFiles, "historical candidate npm release evidence");
  assertEmptyOrMissingDirectory(outputRoot, "published recovery npm evidence");
  const registryTarball = bytes(registryPath, "published registry tarball");
  const published = validatePublishedTarball(registryTarball, sourceCommit, manifest.package_version);
  mkdirSync(outputRoot, { recursive: true });
  for (const filename of candidateFiles) copyFileSync(resolve(sourceRoot, filename), resolve(outputRoot, filename));
  writeFileSync(resolve(outputRoot, PUBLISHED_REGISTRY_TARBALL), registryTarball);
  writeFileSync(resolve(outputRoot, PUBLISHED_PACKAGE_JSON), published.metadataBytes);
  writeFileSync(resolve(outputRoot, PUBLISHED_NATIVE_MANIFEST), published.runtimeManifestBytes);
  const nativeManifestDigest = fileDigest(outputRoot, PUBLISHED_NATIVE_MANIFEST, "published native runtime manifest");
  for (const artifact of published.nativeArtifacts) writeFileSync(resolve(outputRoot, `published-${artifact.target_id}.node`), published.nativeBytes.get(artifact.target_id));
  writeFileSync(resolve(outputRoot, PUBLISHED_NATIVE_EVIDENCE), `${JSON.stringify({ schema_version: 1, artifact_kind: "published-native-evidence", source: "npm-registry-tarball", package_name: PACKAGE_NAME, package_version: manifest.package_version, source_commit: sourceCommit, artifacts: published.nativeArtifacts.map((artifact) => ({ ...artifact, filename: `published-${artifact.target_id}.node`, runtime_manifest_sha256: nativeManifestDigest.sha256 })) }, null, 2)}\n`);
  writeFileSync(resolve(outputRoot, PUBLISHED_WASM), published.wasmBytes);
  writeFileSync(resolve(outputRoot, PUBLISHED_WASM_EVIDENCE), `${JSON.stringify({ schema_version: 1, artifact_kind: "published-wasm-evidence", source: "npm-registry-tarball", package_name: PACKAGE_NAME, package_version: manifest.package_version, source_commit: sourceCommit, relative_path: published.wasm.relative_path, artifact_filename: published.wasm.artifact_filename, sha256: published.wasm.sha256, size: published.wasm.size }, null, 2)}\n`);
  writeFileSync(resolve(outputRoot, PUBLISHED_GENERATED_EVIDENCE), `${JSON.stringify({ schema_version: 1, artifact_kind: "published-generated-evidence", source: "npm-registry-tarball", package_name: PACKAGE_NAME, package_version: manifest.package_version, source_commit: sourceCommit, files: published.generatedEntries }, null, 2)}\n`);
  const candidateTarball = fileDigest(outputRoot, manifest.npm_tarball.filename, "historical candidate npm tarball");
  const publishedTarballDigest = fileDigest(outputRoot, PUBLISHED_REGISTRY_TARBALL, "published registry tarball");
  const nativeArtifacts = published.nativeArtifacts.map((artifact) => ({ ...artifact, filename: `published-${artifact.target_id}.node`, runtime_manifest_sha256: nativeManifestDigest.sha256 }));
  const wasm = { ...published.wasm, filename: PUBLISHED_WASM };
  const byteReproducible = candidateTarball.sha256 === publishedTarballDigest.sha256 && candidateTarball.size === publishedTarballDigest.size;
  const recoveryManifest = {
    schema_version: 1,
    artifact_kind: "published-npm-recovery-manifest",
    mode: "release-recovery",
    package_name: PACKAGE_NAME,
    package_version: manifest.package_version,
    release_tag: tag,
    source_commit: sourceCommit,
    candidate_artifact: {
      source: "historical-candidate-evidence",
      manifest_filename: "release-manifest.json",
      manifest_sha256: fileDigest(outputRoot, "release-manifest.json", "historical candidate release manifest").sha256,
      tarball_filename: manifest.npm_tarball.filename,
      tarball_sha256: candidateTarball.sha256,
      tarball_size: candidateTarball.size,
      package_version: manifest.package_version,
    },
    published_artifact: {
      source: "npm-registry-tarball",
      tarball_filename: PUBLISHED_REGISTRY_TARBALL,
      tarball_sha256: publishedTarballDigest.sha256,
      tarball_sha512: sha512(registryTarball),
      tarball_size: publishedTarballDigest.size,
      integrity: `sha512-${Buffer.from(sha512(registryTarball), "hex").toString("base64")}`,
      package_version: manifest.package_version,
      package_json: fileDigest(outputRoot, PUBLISHED_PACKAGE_JSON, "published package metadata"),
      native_manifest: nativeManifestDigest,
      native_evidence: fileDigest(outputRoot, PUBLISHED_NATIVE_EVIDENCE, "published native evidence"),
      wasm_evidence: fileDigest(outputRoot, PUBLISHED_WASM_EVIDENCE, "published WASM evidence"),
      generated_evidence: fileDigest(outputRoot, PUBLISHED_GENERATED_EVIDENCE, "published generated evidence"),
      byte_reproducible: byteReproducible,
    },
    byte_reproducible: byteReproducible,
    native_artifacts: nativeArtifacts,
    wasm,
  };
  writeFileSync(resolve(outputRoot, PUBLISHED_RECOVERY_MANIFEST), `${JSON.stringify(recoveryManifest, null, 2)}\n`);
  validatePublishedRecoveryEvidence({ releaseDir: outputRoot, tag, sourceCommit });
  return {
    package_name: PACKAGE_NAME,
    package_version: manifest.package_version,
    release_tag: tag,
    source_commit: sourceCommit,
    candidate_tarball_sha256: candidateTarball.sha256,
    published_tarball_sha256: publishedTarballDigest.sha256,
    byte_reproducible: byteReproducible,
    canonical_source: "registry",
    published_native_sha256: Object.fromEntries(nativeArtifacts.map((entry) => [entry.target_id, entry.sha256])),
    published_wasm_sha256: wasm.sha256,
  };
}

export const canonicalizePublishedNpmBundle = reconstructPublishedNpmBundle;

export function validatePublishedRecoveryEvidence({ releaseDir, tag, sourceCommit }) {
  const root = resolve(repositoryRoot, releaseDir);
  const manifest = json(resolve(root, PUBLISHED_RECOVERY_MANIFEST), "published recovery manifest");
  return validateRecoveryManifest(manifest, root, tag, sourceCommit);
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

function run() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (command === "validate-run") {
    const result = validateOriginalReleaseRun(json(resolve(repositoryRoot, argument(argv, "--run-json")), "release run metadata"), {
      repository: argument(argv, "--repository"),
      releaseTag: argument(argv, "--release-tag"),
      sourceCommit: argument(argv, "--source-commit"),
      runId: argument(argv, "--run-id"),
      runAttempt: argument(argv, "--run-attempt"),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command === "validate-artifact-source") {
    const result = validateArtifactSource({
      run: json(resolve(repositoryRoot, argument(argv, "--run-json")), "artifact source run metadata"),
      originalPublishRun: argv.includes("--original-run-json") ? json(resolve(repositoryRoot, argument(argv, "--original-run-json")), "original publish run metadata") : undefined,
      artifacts: json(resolve(repositoryRoot, argument(argv, "--artifacts-json")), "artifact source artifact metadata"),
      repository: argument(argv, "--repository"),
      releaseTag: argument(argv, "--release-tag"),
      sourceCommit: argument(argv, "--source-commit"),
      runId: argument(argv, "--run-id"),
      runAttempt: argument(argv, "--run-attempt"),
      originalPublishRunId: argument(argv, "--original-run-id", argument(argv, "--run-id")),
      originalPublishRunAttempt: argument(argv, "--original-run-attempt", argument(argv, "--run-attempt")),
      artifactSuffix: argument(argv, "--artifact-suffix", ""),
    });
    writeFileSync(resolve(repositoryRoot, argument(argv, "--output")), `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command === "validate-dispatch") {
    process.stdout.write(`${JSON.stringify(validateDispatchBoundary({ ref: argument(argv, "--ref"), sha: argument(argv, "--sha"), mainRef: argument(argv, "--main-ref") }))}\n`);
    return;
  }
  if (command === "validate-provenance-invocation") {
    const result = validateProvenanceInvocation(json(resolve(repositoryRoot, argument(argv, "--provenance")), "recovery provenance evidence"), {
      repository: argument(argv, "--repository"),
      runId: argument(argv, "--run-id"),
    });
    const output = argv.includes("--output") ? argument(argv, "--output") : undefined;
    if (output !== undefined) writeFileSync(resolve(repositoryRoot, output), `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command !== "reconstruct" && command !== "canonicalize") fail("usage: reconstruct | validate-run | validate-artifact-source | validate-dispatch | validate-provenance-invocation");
  const result = reconstructPublishedNpmBundle({
    sourceDir: argument(argv, "--source-dir"),
    registryTarballPath: argument(argv, "--registry-tarball"),
    outputDir: argument(argv, "--output"),
    tag: argument(argv, "--tag"),
    sourceCommit: argument(argv, "--source-commit"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

export {
  NPM_REQUIRED_FILES,
  PACKAGE_NAME,
  PUBLISHED_GENERATED_EVIDENCE,
  PUBLISHED_NATIVE_EVIDENCE,
  PUBLISHED_NATIVE_MANIFEST,
  PUBLISHED_PACKAGE_JSON,
  PUBLISHED_RECOVERY_FILES,
  PUBLISHED_RECOVERY_MANIFEST,
  PUBLISHED_REGISTRY_TARBALL,
  PUBLISHED_WASM,
  PUBLISHED_WASM_EVIDENCE,
  RECOVERY_ARTIFACT_SOURCE,
  REQUIRED_NATIVE_TARGETS,
};

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { validateNpmRepositoryMetadata } from "./npm-repository.mjs";
import { validateNativeManifest } from "../packages/wallet-core/src/manifest.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const NPM_REGISTRY = "https://registry.npmjs.org/";
const PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";
const REPOSITORY = "nemnesia/symbol-nem-wallet-core";
const WORKFLOW_PATH = ".github/workflows/release.yml";
const RELEASE_ENVIRONMENT = "release";
const REQUIRED_NATIVE_TARGETS = [
  "win32-x64-msvc",
  "darwin-x64",
  "darwin-arm64",
  "linux-x64-gnu",
];
const ATTESTATION_RETRY_ATTEMPTS = 6;
const ATTESTATION_RETRY_INITIAL_DELAY_MS = 2_000;
const ATTESTATION_RETRY_MAX_DELAY_MS = 10_000;
const ATTESTATION_REQUEST_TIMEOUT_MS = 10_000;
const PROVENANCE_PREDICATE_TYPES = new Set([
  "https://slsa.dev/provenance/v1",
  "https://slsa.dev/provenance/v0.2",
]);
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

function fail(message) {
  throw new Error(`npm provenance gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`${label} is unreadable or malformed`);
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function hash(value, algorithm) {
  return createHash(algorithm).update(value).digest("hex");
}

function sha256(value) {
  return hash(value, "sha256");
}

function sha512(value) {
  return hash(value, "sha512");
}

function validCommit(value, label) {
  if (typeof value !== "string" || !COMMIT_PATTERN.test(value)) fail(`${label} is invalid`);
}

function validHash(value, label) {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) fail(`${label} is invalid`);
}

function safeHttpsUrl(value, label, expectedOrigin = new URL(NPM_REGISTRY).origin) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} is not a URL`);
  }
  if (parsed.protocol !== "https:" || parsed.origin !== expectedOrigin || parsed.username !== "" || parsed.password !== "" || parsed.hash !== "") fail(`${label} is not an npm registry HTTPS URL`);
  return parsed.href;
}

function packagePurl(packageName, version) {
  const name = packageName.startsWith("@") ? `%40${packageName.slice(1)}` : packageName;
  return `pkg:npm/${name}@${version}`;
}

function registryVersionUrl(packageName, version) {
  return `${NPM_REGISTRY}${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
}

async function fetchResponse(url, label, { fetchImpl = fetch } = {}) {
  if (typeof fetchImpl !== "function") fail("fetch is unavailable");
  let response;
  try {
    response = await fetchImpl(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: { accept: "application/json" },
    });
  } catch {
    fail(`${label} request failed`);
  }
  if (!response.ok) fail(`${label} request returned HTTP ${response.status}`);
  return response;
}

async function fetchJson(url, label, options = {}) {
  const response = await fetchResponse(url, label, options);
  try {
    return await response.json();
  } catch {
    fail(`${label} response is malformed`);
  }
}

async function fetchBytes(url, label, { fetchImpl = fetch } = {}) {
  if (typeof fetchImpl !== "function") fail("fetch is unavailable");
  let currentUrl = safeHttpsUrl(url, `${label} URL`);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    let response;
    try {
      response = await fetchImpl(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      fail(`${label} request failed`);
    }
    if (response.status >= 300 && response.status <= 399) {
      const location = response.headers?.get?.("location");
      if (typeof location !== "string" || location.length === 0) fail(`${label} returned a redirect without a location`);
      currentUrl = safeHttpsUrl(new URL(location, currentUrl).href, `${label} redirect`);
      if (redirect === 3) fail(`${label} exceeded the redirect limit`);
      continue;
    }
    if (!response.ok) fail(`${label} request returned HTTP ${response.status}`);
    try {
      return Buffer.from(await response.arrayBuffer());
    } catch {
      fail(`${label} response is unreadable`);
    }
  }
  fail(`${label} request did not complete`);
}

function retryDelay(attempt, initialDelayMs, maxDelayMs) {
  return Math.min(maxDelayMs, initialDelayMs * 2 ** (attempt - 1));
}

function sleep(delayMs) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, delayMs));
}

function retryableAttestationStatus(status) {
  return status === 404 || status === 429 || status >= 500 && status <= 599;
}

export async function fetchAttestationRecord(
  url,
  {
    fetchImpl = fetch,
    sleepImpl = sleep,
    attempts = ATTESTATION_RETRY_ATTEMPTS,
    initialDelayMs = ATTESTATION_RETRY_INITIAL_DELAY_MS,
    maxDelayMs = ATTESTATION_RETRY_MAX_DELAY_MS,
  } = {},
) {
  if (!Number.isInteger(attempts) || attempts < 1) fail("npm attestation retry attempts are invalid");
  if (!Number.isFinite(initialDelayMs) || initialDelayMs < 0 || !Number.isFinite(maxDelayMs) || maxDelayMs < initialDelayMs) {
    fail("npm attestation retry delay policy is invalid");
  }
  safeHttpsUrl(url, "npm attestations URL");
  if (typeof fetchImpl !== "function") fail("fetch is unavailable");

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(ATTESTATION_REQUEST_TIMEOUT_MS),
        headers: { accept: "application/json" },
      });
    } catch {
      if (attempt === attempts) fail("npm attestation record request failed after bounded retry");
      await sleepImpl(retryDelay(attempt, initialDelayMs, maxDelayMs));
      continue;
    }

    if (response?.ok === true) {
      try {
        const value = await response.json();
        if (!isPlainObject(value) || !Array.isArray(value.attestations)) fail("npm attestation record response is malformed");
        return value;
      } catch {
        fail("npm attestation record response is malformed");
      }
    }

    const status = response?.status;
    if (!Number.isInteger(status)) fail("npm attestation record response is ambiguous");
    if (!retryableAttestationStatus(status)) fail(`npm attestation record request returned HTTP ${status}`);
    if (attempt === attempts) fail(`npm attestation record request returned HTTP ${status} after bounded retry`);
    await sleepImpl(retryDelay(attempt, initialDelayMs, maxDelayMs));
  }

  fail("npm attestation record retry did not complete");
}

function decodeStatement(bundle, label) {
  if (!isPlainObject(bundle) || !isPlainObject(bundle.dsseEnvelope) || typeof bundle.dsseEnvelope.payload !== "string") {
    fail(`${label} has no DSSE payload`);
  }
  let payload;
  try {
    payload = Buffer.from(bundle.dsseEnvelope.payload, "base64").toString("utf8");
    if (Buffer.from(payload, "utf8").toString("base64") !== bundle.dsseEnvelope.payload) fail(`${label} payload is not canonical base64`);
    return JSON.parse(payload);
  } catch {
    fail(`${label} DSSE payload is malformed`);
  }
}

function provenanceIdentity(attestation, expected) {
  if (!isPlainObject(attestation) || typeof attestation.predicateType !== "string") fail("npm attestation identity is malformed");
  const statement = decodeStatement(attestation.bundle, `npm attestation ${attestation.predicateType}`);
  if (statement.predicateType !== attestation.predicateType) fail("npm attestation predicate type differs from its DSSE statement");
  if (!Array.isArray(statement.subject) || !statement.subject.some((subject) => isPlainObject(subject) && subject.name === packagePurl(expected.packageName, expected.version) && subject.digest?.sha512 === expected.tarballSha512)) {
    fail("npm attestation subject does not match the registry tarball");
  }
  if (!PROVENANCE_PREDICATE_TYPES.has(attestation.predicateType)) return null;

  const workflow = statement.predicate?.buildDefinition?.externalParameters?.workflow;
  if (!isPlainObject(workflow) || workflow.repository !== `https://github.com/${expected.repository}` || workflow.path !== WORKFLOW_PATH || workflow.ref !== `refs/tags/${expected.tag}`) {
    fail("npm provenance workflow identity does not match the release");
  }
  const dependencies = statement.predicate?.buildDefinition?.resolvedDependencies;
  if (!Array.isArray(dependencies) || !dependencies.some((dependency) => isPlainObject(dependency) && dependency.uri === `git+https://github.com/${expected.repository}@refs/tags/${expected.tag}` && dependency.digest?.gitCommit === expected.sourceCommit)) {
    fail("npm provenance source commit identity does not match the release");
  }
  const invocationId = statement.predicate?.runDetails?.metadata?.invocationId;
  if (typeof invocationId !== "string" || !invocationId.startsWith(`https://github.com/${expected.repository}/actions/runs/`)) {
    fail("npm provenance invocation identity is unavailable");
  }
  if (expected.workflowRunId !== undefined) {
    const expectedInvocationPrefix = `https://github.com/${expected.repository}/actions/runs/${expected.workflowRunId}`;
    if (invocationId !== expectedInvocationPrefix && !invocationId.startsWith(`${expectedInvocationPrefix}/attempts/`)) {
      fail("npm provenance invocation identity does not match the original release run");
    }
    if (expected.workflowRunAttempt !== undefined && invocationId.includes("/attempts/") && !invocationId.endsWith(`/attempts/${expected.workflowRunAttempt}`)) {
      fail("npm provenance invocation attempt does not match the original release run");
    }
  }
  return {
    predicate_type: attestation.predicateType,
    subject_name: packagePurl(expected.packageName, expected.version),
    subject_sha512: expected.tarballSha512,
    workflow_repository: workflow.repository,
    workflow_path: workflow.path,
    workflow_ref: workflow.ref,
    source_commit: expected.sourceCommit,
    invocation_id: invocationId,
  };
}

function provenanceIdentities(attestations, expected) {
  if (!Array.isArray(attestations) || attestations.length === 0) fail("npm registry returned no attestations");
  const identities = attestations
    .map((attestation) => provenanceIdentity(attestation, expected))
    .filter((identity) => identity !== null);
  if (identities.length === 0) fail("npm registry returned no provenance attestation");
  return identities;
}

function validateAuditSignatures(audit, expected) {
  if (!isPlainObject(audit) || !Array.isArray(audit.invalid) || !Array.isArray(audit.missing) || !Array.isArray(audit.verified)) {
    fail("npm audit signatures output is incomplete");
  }
  if (audit.invalid.length !== 0 || audit.missing.length !== 0) fail("npm audit signatures reported invalid or missing evidence");
  const packageResult = audit.verified.find((entry) => isPlainObject(entry) && entry.name === expected.packageName && entry.version === expected.version);
  if (!packageResult || !Array.isArray(packageResult.attestationBundles)) fail("npm audit signatures did not verify the release package attestation");
  if (!packageResult.attestationBundles.some((bundle) => PROVENANCE_PREDICATE_TYPES.has(bundle?.predicateType))) fail("npm audit signatures did not verify a provenance attestation");
  return {
    package_name: expected.packageName,
    package_version: expected.version,
    invalid_count: audit.invalid.length,
    missing_count: audit.missing.length,
    verified_attestation: true,
  };
}

function tarEntry(tarball, entryPath, label) {
  try {
    return execFileSync("tar", ["-xOf", "-", entryPath], {
      cwd: repositoryRoot,
      input: tarball,
    });
  } catch {
    fail(`${label} is missing or unreadable in the registry tarball`);
  }
}

function validateRegistryTarballContent(tarball, expected, manifest, recovery) {
  let listing;
  try {
    listing = execFileSync("tar", ["-tzf", "-"], { cwd: repositoryRoot, input: tarball, encoding: "utf8" });
  } catch {
    fail("registry tarball is corrupt or unreadable");
  }
  const entries = listing.split(/\r?\n/).filter(Boolean);
  if (entries.some((entry) => entry.startsWith("/") || entry.includes("\\") || entry.split("/").some((part) => part === ".."))) {
    fail("registry tarball contains an unsafe path");
  }
  if (entries.filter((entry) => entry === "package/package.json").length !== 1) fail("registry tarball package metadata is missing or duplicated");

  let metadata;
  try {
    metadata = JSON.parse(tarEntry(tarball, "package/package.json", "registry package metadata").toString("utf8"));
  } catch {
    fail("registry tarball package metadata is malformed");
  }
  if (!isPlainObject(metadata) || metadata.name !== PACKAGE_NAME || metadata.version !== expected.version) fail("registry tarball package identity differs from the release");
  try {
    validateNpmRepositoryMetadata(metadata, "registry tarball package metadata");
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  if (!isPlainObject(manifest) || !isPlainObject(manifest.wasm?.canonical_artifact) || !Array.isArray(manifest.native_artifacts)) {
    fail("release manifest artifact identity is unavailable for registry tarball verification");
  }
  let runtimeManifest;
  try {
    runtimeManifest = JSON.parse(tarEntry(tarball, "package/dist/native/artifact-manifest.json", "registry native artifact manifest").toString("utf8"));
    validateNativeManifest(runtimeManifest, metadata);
  } catch {
    fail("registry native artifact manifest is malformed");
  }
  if (!isPlainObject(runtimeManifest) || runtimeManifest.package_name !== PACKAGE_NAME || runtimeManifest.package_version !== expected.version || runtimeManifest.source_commit !== expected.sourceCommit || !Array.isArray(runtimeManifest.artifacts)) {
    fail("registry native artifact manifest identity differs from the release");
  }
  const expectedTargets = recovery ? REQUIRED_NATIVE_TARGETS : manifest.native_artifacts.map((artifact) => artifact.target_id);
  const actualTargets = runtimeManifest.artifacts.map((artifact) => artifact.target_id);
  if (JSON.stringify(actualTargets) !== JSON.stringify(expectedTargets)) fail("registry native artifact set differs from the release");
  for (const artifact of runtimeManifest.artifacts) {
    const runtime = runtimeManifest.artifacts.find((entry) => entry?.target_id === artifact.target_id);
    if (!isPlainObject(runtime) || runtime.relative_path !== artifact.relative_path || runtime.sha256 !== artifact.sha256) fail(`registry native artifact identity differs: ${artifact.target_id}`);
    const artifactBytes = tarEntry(tarball, `package/${runtime.relative_path}`, `registry native artifact ${artifact.target_id}`);
    if (sha256(artifactBytes) !== runtime.sha256) fail(`registry native artifact bytes differ: ${artifact.target_id}`);
    if (!recovery) {
      const expectedArtifact = manifest.native_artifacts.find((entry) => entry.target_id === artifact.target_id);
      if (!isPlainObject(expectedArtifact) || runtime.relative_path !== expectedArtifact.relative_path || runtime.sha256 !== expectedArtifact.sha256 || artifactBytes.length !== expectedArtifact.size) fail(`registry native artifact differs from the release: ${artifact.target_id}`);
    }
  }
  const wasmPath = recovery ? "package/dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm" : `package/${manifest.wasm.canonical_artifact.relative_path}`;
  const wasmBytes = tarEntry(tarball, wasmPath, "registry canonical WASM");
  if (wasmBytes.length === 0) fail("registry canonical WASM is empty");
  if (!recovery) {
    const wasm = manifest.wasm.canonical_artifact;
    if (sha256(wasmBytes) !== wasm.sha256 || wasmBytes.length !== wasm.size) fail("registry canonical WASM differs from the release manifest");
  }
  return { metadata, runtimeManifest };
}

function expectedFromManifest(manifest, tag, sourceCommit, environment, repository, recovery = false) {
  if (!isPlainObject(manifest) || manifest.mode !== "release" || manifest.package_name !== PACKAGE_NAME || typeof manifest.package_version !== "string" || manifest.release_tag !== tag || manifest.source_commit !== sourceCommit || !isPlainObject(manifest.npm_tarball)) {
    fail("release manifest identity is invalid");
  }
  if (tag !== `v${manifest.package_version}`) fail("release tag/version identity is invalid");
  validCommit(sourceCommit, "source commit");
  validHash(manifest.npm_tarball.sha256, "release tarball SHA-256");
  if (!Number.isInteger(manifest.npm_tarball.size) || manifest.npm_tarball.size < 0) fail("release tarball size is invalid");
  if (environment !== RELEASE_ENVIRONMENT) fail("release Environment is invalid");
  if (repository !== REPOSITORY) fail("GitHub repository is not the approved release repository");
  return {
    packageName: PACKAGE_NAME,
    version: manifest.package_version,
    tag,
    sourceCommit,
    environment,
    repository,
    tarballSha256: recovery ? undefined : manifest.npm_tarball.sha256,
  };
}

export function validateNpmProvenanceEvidence(evidence, expected) {
  if (!isPlainObject(evidence) || evidence.schema_version !== 1 || evidence.artifact_kind !== "npm-provenance") fail("npm provenance evidence schema is invalid");
  if (evidence.package_name !== expected.packageName || evidence.package_version !== expected.version || evidence.release_tag !== expected.tag || evidence.source_commit !== expected.sourceCommit || evidence.environment !== expected.environment) fail("npm provenance evidence identity differs from the release");
  const registry = evidence.registry;
  if (!isPlainObject(registry) || registry.package_name !== expected.packageName || registry.package_version !== expected.version || registry.tarball_sha256 !== expected.tarballSha256 || registry.tarball_size !== expected.tarballSize || typeof registry.tarball_sha512 !== "string" || !/^[0-9a-f]{128}$/.test(registry.tarball_sha512) || typeof registry.dist_integrity !== "string") fail("npm registry evidence identity is invalid");
  if (registry.dist_integrity !== `sha512-${Buffer.from(registry.tarball_sha512, "hex").toString("base64")}`) fail("npm registry integrity does not match the tarball digest");
  if (expected.tarballSha512 !== undefined && registry.tarball_sha512 !== expected.tarballSha512) fail("npm registry SHA-512 differs from the downloaded tarball");
  if (!isPlainObject(evidence.canonical_artifact) || evidence.canonical_artifact.source !== "registry" || evidence.canonical_artifact.sha256 !== registry.tarball_sha256 || evidence.canonical_artifact.sha512 !== registry.tarball_sha512 || evidence.canonical_artifact.size !== registry.tarball_size || evidence.canonical_artifact.integrity !== registry.dist_integrity || evidence.canonical_artifact.tarball_url !== registry.tarball_url) {
    fail("npm canonical published artifact identity is invalid");
  }
  if (evidence.publication_mode !== "fresh-publish" && evidence.publication_mode !== "post-publish-recovery") fail("npm provenance publication mode is invalid");
  if (evidence.publication_mode === "post-publish-recovery" && (!isPlainObject(evidence.candidate_artifact) || typeof evidence.candidate_artifact.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(evidence.candidate_artifact.sha256) || !Number.isInteger(evidence.candidate_artifact.size) || evidence.candidate_artifact.size < 0)) {
    fail("npm recovery candidate artifact evidence is missing");
  }
  if (registry.metadata_url !== registryVersionUrl(expected.packageName, expected.version)) fail("npm metadata URL is not the exact package/version registry endpoint");
  safeHttpsUrl(registry.metadata_url, "npm metadata URL");
  safeHttpsUrl(registry.tarball_url, "npm tarball URL");
  safeHttpsUrl(registry.attestations_url, "npm attestations URL");
  if (!isPlainObject(evidence.registry_metadata) || evidence.registry_metadata.name !== expected.packageName || evidence.registry_metadata.version !== expected.version || !isPlainObject(evidence.registry_metadata.dist) || evidence.registry_metadata.dist.tarball !== registry.tarball_url || evidence.registry_metadata.dist.integrity !== registry.dist_integrity || evidence.registry_metadata.dist.attestations?.url !== registry.attestations_url) {
    fail("npm registry metadata evidence is incomplete or inconsistent");
  }
  try {
    validateNpmRepositoryMetadata(evidence.registry_metadata, "npm registry metadata evidence");
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  const attestations = evidence.registry_attestations?.attestations;
  const identities = provenanceIdentities(attestations, {
    ...expected,
    tarballSha512: registry.tarball_sha512,
  });
  if (!Array.isArray(evidence.provenance?.identities) || JSON.stringify(evidence.provenance.identities) !== JSON.stringify(identities)) fail("npm provenance identity summary differs from the registry attestation");
  if (evidence.verification?.status !== "PASS" || evidence.verification?.command !== "npm audit signatures --json --include-attestations") fail("npm provenance was not verified by the npm signature verifier");
  validateAuditSignatures(evidence.audit_signatures, expected);
  return true;
}

function npmVersion() {
  try {
    return execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["--version"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    fail("npm version is unavailable");
  }
}

function runNpmAudit(expected) {
  const auditRoot = mkdtempSync(join(tmpdir(), `snwc-npm-signatures-${process.pid}-`));
  try {
    writeJson(join(auditRoot, "package.json"), {
      name: "snwc-npm-provenance-audit",
      private: true,
      dependencies: { [expected.packageName]: expected.version },
    });
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    try {
      execFileSync(npmCommand, [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--no-package-lock",
        "--prefix",
        auditRoot,
        `${expected.packageName}@${expected.version}`,
      ], {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, npm_config_update_notifier: "false" },
        stdio: ["ignore", "pipe", "inherit"],
      });
    } catch {
      fail("npm registry package installation for signature verification failed");
    }
    let stdout;
    try {
      stdout = execFileSync(npmCommand, ["audit", "signatures", "--json", "--include-attestations", "--prefix", auditRoot], {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, npm_config_update_notifier: "false" },
        stdio: ["ignore", "pipe", "inherit"],
      });
    } catch {
      fail("npm audit signatures failed");
    }
    return readJsonFromString(stdout, "npm audit signatures output");
  } finally {
    rmSync(auditRoot, { recursive: true, force: true });
  }
}

function readJsonFromString(value, label) {
  try {
    return JSON.parse(value.trim());
  } catch {
    fail(`${label} is malformed`);
  }
}

export async function captureNpmProvenance({ manifestPath, tag, sourceCommit, environment = RELEASE_ENVIRONMENT, repository = process.env.GITHUB_REPOSITORY, outputPath, tarballOutputPath, recovery = false, workflowRunId, workflowRunAttempt, fetchImpl = fetch, sleepImpl = sleep }) {
  const manifest = readJson(resolve(repositoryRoot, manifestPath), "release manifest");
  const metadataUrl = registryVersionUrl(PACKAGE_NAME, manifest.package_version);
  const metadata = await fetchJson(metadataUrl, "npm package metadata", { fetchImpl });
  if (!isPlainObject(metadata) || metadata.name !== PACKAGE_NAME || metadata.version !== manifest.package_version || !isPlainObject(metadata.dist)) fail("npm registry package metadata identity is invalid");
  try {
    validateNpmRepositoryMetadata(metadata, "npm registry package metadata");
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  const tarballUrl = safeHttpsUrl(metadata.dist.tarball, "npm tarball URL");
  if (typeof metadata.dist.integrity !== "string") fail("npm registry tarball integrity is missing");
  const attestationsUrl = safeHttpsUrl(metadata.dist.attestations?.url, "npm attestations URL");
  const tarball = await fetchBytes(tarballUrl, "npm release tarball", { fetchImpl });
  const tarballSha256 = sha256(tarball);
  const tarballSha512 = sha512(tarball);
  const expected = expectedFromManifest(manifest, tag, sourceCommit, environment, repository, recovery);
  if (!recovery && (tarballSha256 !== expected.tarballSha256 || tarball.length !== manifest.npm_tarball.size)) fail("registry tarball differs from the release manifest");
  const expectedIntegrity = `sha512-${Buffer.from(tarballSha512, "hex").toString("base64")}`;
  if (metadata.dist.integrity !== expectedIntegrity) fail("registry tarball integrity differs from the downloaded bytes");
  validateRegistryTarballContent(tarball, { ...expected, tarballSha512, tarballSize: tarball.length }, manifest, recovery);
  const registryAttestations = await fetchAttestationRecord(attestationsUrl, { fetchImpl, sleepImpl });
  const provenanceExpected = { ...expected, tarballSha256, tarballSha512, tarballSize: tarball.length, workflowRunId, workflowRunAttempt };
  const identities = provenanceIdentities(registryAttestations.attestations, provenanceExpected);
  const audit = runNpmAudit(provenanceExpected);
  const auditSummary = validateAuditSignatures(audit, provenanceExpected);
  const evidence = {
    schema_version: 1,
    artifact_kind: "npm-provenance",
    package_name: PACKAGE_NAME,
    package_version: manifest.package_version,
    release_tag: tag,
    source_commit: sourceCommit,
    environment,
    publication_mode: recovery ? "post-publish-recovery" : "fresh-publish",
    candidate_artifact: recovery ? { sha256: manifest.npm_tarball.sha256, size: manifest.npm_tarball.size } : null,
    canonical_artifact: {
      source: "registry",
      sha256: tarballSha256,
      sha512: tarballSha512,
      size: tarball.length,
      integrity: metadata.dist.integrity,
      tarball_url: tarballUrl,
    },
    registry_metadata: metadata,
    registry: {
      package_name: metadata.name,
      package_version: metadata.version,
      metadata_url: metadataUrl,
      tarball_url: tarballUrl,
      tarball_sha256: tarballSha256,
      tarball_sha512: tarballSha512,
      tarball_size: tarball.length,
      dist_integrity: metadata.dist.integrity,
      attestations_url: attestationsUrl,
    },
    registry_attestations: registryAttestations,
    provenance: {
      predicate_types: identities.map((identity) => identity.predicate_type),
      identities,
    },
    verification: {
      status: "PASS",
      command: "npm audit signatures --json --include-attestations",
      npm_version: npmVersion(),
      target: auditSummary,
    },
    audit_signatures: audit,
  };
  validateNpmProvenanceEvidence(evidence, {
    ...expected,
    tarballSha256,
    tarballSha512,
    tarballSize: tarball.length,
  });
  if (tarballOutputPath !== undefined) {
    const outputTarballPath = resolve(repositoryRoot, tarballOutputPath);
    mkdirSync(resolve(outputTarballPath, ".."), { recursive: true });
    writeFileSync(outputTarballPath, tarball);
  }
  writeJson(resolve(repositoryRoot, outputPath), evidence);
  process.stdout.write(`${JSON.stringify({ package_name: PACKAGE_NAME, package_version: manifest.package_version, provenance_status: "PASS", tarball_sha256: tarballSha256, provenance_attestation_count: identities.length })}\n`);
  return evidence;
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

async function run() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (command !== "capture") fail("usage: capture");
  await captureNpmProvenance({
    manifestPath: argument(argv, "--manifest"),
    tag: argument(argv, "--tag", process.env.GITHUB_REF_NAME),
    sourceCommit: argument(argv, "--source-commit", process.env.GITHUB_SHA),
    environment: argument(argv, "--environment", process.env.SNWC_RELEASE_ENVIRONMENT ?? RELEASE_ENVIRONMENT),
    repository: argument(argv, "--repository", process.env.GITHUB_REPOSITORY),
    outputPath: argument(argv, "--output"),
    tarballOutputPath: argv.includes("--tarball-output") ? argument(argv, "--tarball-output") : undefined,
    recovery: argv.includes("--recovery"),
    workflowRunId: argv.includes("--workflow-run-id") ? argument(argv, "--workflow-run-id") : undefined,
    workflowRunAttempt: argv.includes("--workflow-run-attempt") ? Number(argument(argv, "--workflow-run-attempt")) : undefined,
  });
}

export {
  PACKAGE_NAME,
  ATTESTATION_RETRY_ATTEMPTS,
  ATTESTATION_RETRY_INITIAL_DELAY_MS,
  ATTESTATION_RETRY_MAX_DELAY_MS,
  PROVENANCE_PREDICATE_TYPES,
  REPOSITORY,
  RELEASE_ENVIRONMENT,
  WORKFLOW_PATH,
  packagePurl,
  provenanceIdentities,
};

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

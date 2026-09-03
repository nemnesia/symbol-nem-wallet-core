import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const NPM_REGISTRY = "https://registry.npmjs.org/";
const PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";
const REPOSITORY = "nemnesia/symbol-nem-wallet-core";
const WORKFLOW_PATH = ".github/workflows/release.yml";
const RELEASE_ENVIRONMENT = "release";
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
  if (parsed.protocol !== "https:" || parsed.origin !== expectedOrigin) fail(`${label} is not an npm registry HTTPS URL`);
  return parsed.href;
}

function packagePurl(packageName, version) {
  const name = packageName.startsWith("@") ? `%40${packageName.slice(1)}` : packageName;
  return `pkg:npm/${name}@${version}`;
}

function registryVersionUrl(packageName, version) {
  return `${NPM_REGISTRY}${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
}

async function fetchResponse(url, label) {
  if (typeof fetch !== "function") fail("fetch is unavailable");
  let response;
  try {
    response = await fetch(url, {
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

async function fetchJson(url, label) {
  const response = await fetchResponse(url, label);
  try {
    return await response.json();
  } catch {
    fail(`${label} response is malformed`);
  }
}

async function fetchBytes(url, label) {
  if (typeof fetch !== "function") fail("fetch is unavailable");
  let response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    fail(`${label} request failed`);
  }
  if (!response.ok) fail(`${label} request returned HTTP ${response.status}`);
  try {
    return Buffer.from(await response.arrayBuffer());
  } catch {
    fail(`${label} response is unreadable`);
  }
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

function expectedFromManifest(manifest, tag, sourceCommit, environment, repository) {
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
    tarballSha256: manifest.npm_tarball.sha256,
  };
}

export function validateNpmProvenanceEvidence(evidence, expected) {
  if (!isPlainObject(evidence) || evidence.schema_version !== 1 || evidence.artifact_kind !== "npm-provenance") fail("npm provenance evidence schema is invalid");
  if (evidence.package_name !== expected.packageName || evidence.package_version !== expected.version || evidence.release_tag !== expected.tag || evidence.source_commit !== expected.sourceCommit || evidence.environment !== expected.environment) fail("npm provenance evidence identity differs from the release");
  const registry = evidence.registry;
  if (!isPlainObject(registry) || registry.package_name !== expected.packageName || registry.package_version !== expected.version || registry.tarball_sha256 !== expected.tarballSha256 || registry.tarball_size !== expected.tarballSize || typeof registry.tarball_sha512 !== "string" || !/^[0-9a-f]{128}$/.test(registry.tarball_sha512) || typeof registry.dist_integrity !== "string") fail("npm registry evidence identity is invalid");
  if (registry.dist_integrity !== `sha512-${Buffer.from(registry.tarball_sha512, "hex").toString("base64")}`) fail("npm registry integrity does not match the tarball digest");
  if (expected.tarballSha512 !== undefined && registry.tarball_sha512 !== expected.tarballSha512) fail("npm registry SHA-512 differs from the downloaded tarball");
  safeHttpsUrl(registry.metadata_url, "npm metadata URL");
  safeHttpsUrl(registry.tarball_url, "npm tarball URL");
  safeHttpsUrl(registry.attestations_url, "npm attestations URL");
  const attestations = evidence.registry_attestations?.attestations;
  const identities = provenanceIdentities(attestations, {
    ...expected,
    tarballSha512: expected.tarballSha512,
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

export async function captureNpmProvenance({ manifestPath, tag, sourceCommit, environment = RELEASE_ENVIRONMENT, repository = process.env.GITHUB_REPOSITORY, outputPath }) {
  const manifest = readJson(resolve(repositoryRoot, manifestPath), "release manifest");
  const metadataUrl = registryVersionUrl(PACKAGE_NAME, manifest.package_version);
  const metadata = await fetchJson(metadataUrl, "npm package metadata");
  if (!isPlainObject(metadata) || metadata.name !== PACKAGE_NAME || metadata.version !== manifest.package_version || !isPlainObject(metadata.dist)) fail("npm registry package metadata identity is invalid");
  const tarballUrl = safeHttpsUrl(metadata.dist.tarball, "npm tarball URL");
  if (typeof metadata.dist.integrity !== "string") fail("npm registry tarball integrity is missing");
  const attestationsUrl = safeHttpsUrl(metadata.dist.attestations?.url, "npm attestations URL");
  const tarball = await fetchBytes(tarballUrl, "npm release tarball");
  const tarballSha256 = sha256(tarball);
  const tarballSha512 = sha512(tarball);
  const expected = expectedFromManifest(manifest, tag, sourceCommit, environment, repository);
  if (tarballSha256 !== expected.tarballSha256 || tarball.length !== manifest.npm_tarball.size) fail("registry tarball differs from the release manifest");
  const expectedIntegrity = `sha512-${Buffer.from(tarballSha512, "hex").toString("base64")}`;
  if (metadata.dist.integrity !== expectedIntegrity) fail("registry tarball integrity differs from the downloaded bytes");
  const registryAttestations = await fetchJson(attestationsUrl, "npm attestation record");
  const provenanceExpected = { ...expected, tarballSha512, tarballSize: tarball.length };
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
    tarballSha512,
    tarballSize: tarball.length,
  });
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
  });
}

export {
  PACKAGE_NAME,
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

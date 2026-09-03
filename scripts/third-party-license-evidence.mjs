import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_MANIFEST_PATH = resolve(repositoryRoot, "third-party-license-evidence/manifest.json");
const MANIFEST_SCHEMA_VERSION = 1;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const SHA1_PATTERN = /^[0-9a-f]{40}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;

function fail(message) {
  throw new Error(`Third-party license evidence gate failed: ${message}`);
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

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`manifest is unreadable or malformed: ${path}`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex");
}

function resolveCheckedInPath(value) {
  safeRelativePath(value, "checked-in evidence path");
  const path = resolve(repositoryRoot, value);
  const repositoryRelative = relative(repositoryRoot, path);
  if (isAbsolute(repositoryRelative) || repositoryRelative.startsWith("..")) fail("checked-in evidence path is outside the repository");
  return path;
}

function validateEntry(entry, index) {
  const label = `third-party evidence entry ${index + 1}`;
  exactKeys(entry, [
    "ecosystem",
    "name",
    "version",
    "source",
    "spdx_license",
    "upstream_repository",
    "upstream_tag",
    "upstream_commit",
    "upstream_file_path",
    "upstream_blob_sha1",
    "checked_in_path",
    "collected_text_sha256",
  ], label);
  if (entry.ecosystem !== "cargo" || typeof entry.name !== "string" || entry.name.length === 0 || typeof entry.version !== "string" || !/^\d+\.\d+\.\d+$/.test(entry.version) || typeof entry.source !== "string" || !entry.source.startsWith("registry+")) fail(`${label} component identity is invalid`);
  if (typeof entry.spdx_license !== "string" || entry.spdx_license.length === 0) fail(`${label} SPDX license is invalid`);
  for (const field of ["upstream_repository", "upstream_tag", "upstream_file_path"]) {
    if (typeof entry[field] !== "string" || entry[field].length === 0) fail(`${label} ${field} is invalid`);
  }
  if (!COMMIT_PATTERN.test(entry.upstream_commit)) fail(`${label} upstream commit is invalid`);
  if (!SHA1_PATTERN.test(entry.upstream_blob_sha1)) fail(`${label} upstream blob identity is invalid`);
  if (!HASH_PATTERN.test(entry.collected_text_sha256)) fail(`${label} collected text digest is invalid`);
  safeRelativePath(entry.upstream_file_path, `${label} upstream file path`);
  const checkedInPath = resolveCheckedInPath(entry.checked_in_path);
  if (!existsSync(checkedInPath)) fail(`${label} checked-in license text is missing`);
  let content;
  try {
    content = readFileSync(checkedInPath);
  } catch {
    fail(`${label} checked-in license text is unreadable`);
  }
  if (sha256(content) !== entry.collected_text_sha256) fail(`${label} checked-in license text digest mismatch`);
  if (gitBlobSha1(content) !== entry.upstream_blob_sha1) fail(`${label} upstream blob identity mismatch`);
  return { ...entry, absolute_checked_in_path: checkedInPath };
}

export function loadThirdPartyLicenseEvidence(manifestPath = DEFAULT_MANIFEST_PATH) {
  const manifest = readJson(manifestPath);
  exactKeys(manifest, ["schema_version", "artifact_kind", "entries"], "third-party evidence manifest");
  if (manifest.schema_version !== MANIFEST_SCHEMA_VERSION || manifest.artifact_kind !== "third-party-license-source-evidence" || !Array.isArray(manifest.entries)) {
    fail("third-party evidence manifest schema is unsupported");
  }
  const entries = manifest.entries.map(validateEntry);
  const identities = new Set();
  const paths = new Map();
  for (const entry of entries) {
    const identity = `${entry.ecosystem}|${entry.name}|${entry.version}|${entry.source}`;
    if (identities.has(identity)) fail(`duplicate component identity: ${identity}`);
    identities.add(identity);
    if (paths.has(entry.checked_in_path) && paths.get(entry.checked_in_path) !== entry.collected_text_sha256) fail(`checked-in evidence path has conflicting digests: ${entry.checked_in_path}`);
    paths.set(entry.checked_in_path, entry.collected_text_sha256);
  }
  entries.sort((left, right) => `${left.ecosystem}|${left.name}|${left.version}|${left.source}`.localeCompare(`${right.ecosystem}|${right.name}|${right.version}|${right.source}`));
  return entries;
}

export function thirdPartyLicenseEvidenceForComponent(component, manifestPath = DEFAULT_MANIFEST_PATH) {
  const identity = `cargo|${component.name}|${component.version}|${component.source}`;
  const entry = loadThirdPartyLicenseEvidence(manifestPath).find((candidate) => `${candidate.ecosystem}|${candidate.name}|${candidate.version}|${candidate.source}` === identity);
  if (entry === undefined) return null;
  if (component.license_expression !== entry.spdx_license) fail(`license expression differs from authoritative evidence: ${identity}`);
  return entry;
}

export function readThirdPartyLicenseText(entry) {
  let content;
  try {
    content = readFileSync(entry.absolute_checked_in_path);
  } catch {
    fail(`checked-in license text is unreadable: ${entry.checked_in_path}`);
  }
  if (sha256(content) !== entry.collected_text_sha256) fail(`checked-in license text digest mismatch: ${entry.checked_in_path}`);
  return content;
}

export function thirdPartyLicenseEvidenceMetadata(entry) {
  return {
    upstream_repository: entry.upstream_repository,
    upstream_tag: entry.upstream_tag,
    upstream_commit: entry.upstream_commit,
    upstream_file_path: entry.upstream_file_path,
    upstream_blob_sha1: entry.upstream_blob_sha1,
    checked_in_path: entry.checked_in_path,
    collected_text_sha256: entry.collected_text_sha256,
  };
}

export function validateThirdPartyLicenseEvidenceMetadata(component, metadata) {
  const expected = thirdPartyLicenseEvidenceForComponent(component);
  if (expected === null) {
    if (metadata !== undefined && metadata !== null) fail(`unexpected upstream evidence metadata: ${component.name}`);
    return null;
  }
  if (!isPlainObject(metadata)) fail(`upstream evidence metadata is missing: ${component.name}`);
  exactKeys(metadata, ["upstream_repository", "upstream_tag", "upstream_commit", "upstream_file_path", "upstream_blob_sha1", "checked_in_path", "collected_text_sha256"], `upstream evidence metadata ${component.name}`);
  if (JSON.stringify(metadata) !== JSON.stringify(thirdPartyLicenseEvidenceMetadata(expected))) fail(`upstream evidence identity mismatch: ${component.name}`);
  return expected;
}

export { DEFAULT_MANIFEST_PATH, MANIFEST_SCHEMA_VERSION };

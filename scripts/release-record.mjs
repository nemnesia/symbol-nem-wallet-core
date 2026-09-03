import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { C_ABI_TARGET_ORDER } from "./c-abi-targets.mjs";
import { isValidCommit, isValidSemVer, parseSemVer } from "./release-identity.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const RECORD_SCHEMA_VERSION = 1;
const RECORD_FILENAME = "release-record.json";
const RECORD_SUMS_FILENAME = "RELEASE-RECORD-SHA256";
const NPM_PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";
const C_ABI_PACKAGE_NAME = "symbol-nem-wallet-core-native";
const NPM_WORKFLOW = ".github/workflows/node.yml";
const C_ABI_WORKFLOW = ".github/workflows/c-abi-release.yml";
const PUBLISHED_NPM_EVIDENCE_FILES = ["release-operation.json", "npm-provenance.json"];
const NPM_REQUIRED_FILES = [
  "release-manifest.json",
  "SHA256SUMS",
  "release-source.json",
  "native-summary.json",
  "win32-x64-msvc.node",
  "darwin-x64.node",
  "darwin-arm64.node",
  "linux-x64-gnu.node",
  "win32-x64-msvc.json",
  "darwin-x64.json",
  "darwin-arm64.json",
  "linux-x64-gnu.json",
  "wasm-summary.json",
  "wasm-evidence.json",
  "wasm-bindgen-version.json",
  "sbom.spdx.json",
  "license-inventory.json",
  "SBOM-SHA256SUMS",
  "license-policy.json",
  "THIRD_PARTY_LICENSES.json",
  "LICENSE-POLICY-SHA256SUMS",
];
const C_ABI_EVIDENCE_KEYS = ["sbom", "inventory", "sbom_sums", "policy", "third_party", "policy_sums"];
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function fail(message) {
  throw new Error(`Release record gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, keys, label) {
  if (!isPlainObject(value)) fail(`${label} is not an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || !actual.every((key, index) => key === expected[index])) fail(`${label} has unexpected or missing fields`);
}

function safeRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.includes("\n") || value.includes("\r") || value.startsWith("/") || value.split("/").some((part) => part === "" || part === "." || part === "..")) fail(`${label} is not a safe relative path`);
}

function validHash(value, label) {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) fail(`${label} is not a SHA-256 digest`);
}

function validIdentity(version, sourceCommit, tag, mode) {
  if (!isValidSemVer(version) || !VERSION_PATTERN.test(version)) fail("release record version is invalid");
  if (!COMMIT_PATTERN.test(sourceCommit)) fail("release record source commit is invalid");
  if (mode === "candidate") {
    if (tag !== null) fail("candidate release record must not contain a tag");
  } else if (mode === "release") {
    if (parseSemVer(version).prerelease !== null || tag !== `v${version}`) fail("formal release record tag/version identity is invalid");
  } else {
    fail("release record mode is unsupported");
  }
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

function hashFile(path, label = path) {
  return createHash("sha256").update(bytes(path, label)).digest("hex");
}

function resolveUnder(root, path, label) {
  safeRelativePath(path, label);
  const absolute = resolve(root, path);
  const rootRelative = relative(root, absolute);
  if (rootRelative.startsWith("..") || rootRelative.includes("/../")) fail(`${label} escapes its evidence directory`);
  return absolute;
}

function fileRecord(root, filename, label = filename) {
  const path = resolveUnder(root, filename, label);
  if (!existsSync(path) || !statSync(path).isFile()) fail(`${label} is missing`);
  return { filename, sha256: hashFile(path, label) };
}

function assertExactFiles(root, expected, label) {
  const expectedNames = [...new Set(expected)].sort();
  const actualNames = readdirSync(root, { withFileTypes: true })
    .map((entry) => entry.isDirectory() ? `${entry.name}/` : entry.name)
    .sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) fail(`${label} contains missing or unexpected files`);
}

function assertDigestFile(root, filename, expected, label) {
  const path = resolveUnder(root, filename, label);
  const content = bytes(path, label).toString("utf8");
  if (!content.endsWith("\n")) fail(`${label} must end with one newline`);
  const actual = content.slice(0, -1).split("\n").map((line, index) => {
    const match = /^([0-9a-f]{64}) {2}([^\s\r\n]+)$/.exec(line);
    if (match === null) fail(`${label} line ${index + 1} is malformed`);
    safeRelativePath(match[2], `${label} path ${index + 1}`);
    return { hash: match[1], filename: match[2] };
  });
  for (const entry of expected) {
    if (!actual.some((candidate) => candidate.hash === entry.sha256 && candidate.filename === entry.filename)) fail(`${label} is missing ${entry.filename}`);
  }
}

function validateNpmManifest(npmDir, mode, tag, sourceCommit, provenanceStatus) {
  const manifestPath = resolveUnder(npmDir, "release-manifest.json", "npm release manifest");
  const manifest = json(manifestPath, "npm release manifest");
  if (!isPlainObject(manifest) || manifest.schema_version !== 1 || manifest.package_name !== NPM_PACKAGE_NAME || manifest.mode !== mode || manifest.source_commit !== sourceCommit) fail("npm release manifest identity is invalid");
  if (manifest.package_version === undefined) fail("npm release manifest version is missing");
  validIdentity(manifest.package_version, sourceCommit, tag, mode);
  if (mode === "release" && manifest.release_tag !== tag) fail("npm release manifest tag differs from release record");
  if (mode === "candidate" && Object.prototype.hasOwnProperty.call(manifest, "release_tag")) fail("candidate npm release manifest contains a release tag");
  validHash(manifest.cargo_lock_sha256, "npm Cargo.lock identity");
  validHash(manifest.pnpm_lock_sha256, "npm pnpm-lock.yaml identity");
  if (!isPlainObject(manifest.npm_tarball) || manifest.npm_tarball.package_name !== NPM_PACKAGE_NAME || manifest.npm_tarball.package_version !== manifest.package_version || typeof manifest.npm_tarball.filename !== "string" || !manifest.npm_tarball.filename.endsWith(".tgz")) fail("npm tarball identity is invalid");
  safeRelativePath(manifest.npm_tarball.filename, "npm tarball filename");
  validHash(manifest.npm_tarball.sha256, "npm tarball digest");
  if (!isPlainObject(manifest.toolchains) || typeof manifest.toolchains.rust?.identifier !== "string" || typeof manifest.toolchains.node?.version !== "string" || typeof manifest.toolchains.npm?.version !== "string" || typeof manifest.toolchains.pnpm?.version !== "string") fail("npm toolchain evidence is incomplete");
  const source = json(resolveUnder(npmDir, "release-source.json", "npm source evidence"), "npm source evidence");
  if (!isPlainObject(source) || source.source_commit !== sourceCommit || source.package_version !== manifest.package_version || source.cargo_lock_sha256 !== manifest.cargo_lock_sha256 || source.pnpm_lock_sha256 !== manifest.pnpm_lock_sha256) fail("npm source/lock evidence identity differs from the release manifest");
  const npmInventory = json(resolveUnder(npmDir, "license-inventory.json", "npm license inventory"), "npm license inventory");
  const npmPolicy = json(resolveUnder(npmDir, "license-policy.json", "npm license policy"), "npm license policy");
  const npmThirdParty = json(resolveUnder(npmDir, "THIRD_PARTY_LICENSES.json", "npm third-party license evidence"), "npm third-party license evidence");
  if (!isPlainObject(npmInventory) || npmInventory.package_name !== NPM_PACKAGE_NAME || npmInventory.package_version !== manifest.package_version || npmInventory.source_commit !== sourceCommit || npmInventory.cargo_lock_sha256 !== manifest.cargo_lock_sha256) fail("npm license inventory identity differs from the release manifest");
  if (!isPlainObject(npmPolicy) || npmPolicy.package_name !== NPM_PACKAGE_NAME || npmPolicy.package_version !== manifest.package_version || npmPolicy.source_commit !== sourceCommit || npmPolicy.gate_status !== "PASS") fail("npm license policy evidence is not a passing identity-bound result");
  if (!isPlainObject(npmThirdParty) || npmThirdParty.package_name !== NPM_PACKAGE_NAME || npmThirdParty.package_version !== manifest.package_version || npmThirdParty.source_commit !== sourceCommit) fail("npm third-party evidence identity differs from the release manifest");
  if (mode === "release" && npmThirdParty.final_release_text_gate?.status !== "ready") fail("formal npm third-party license text gate is not ready");
  const tarball = fileRecord(npmDir, manifest.npm_tarball.filename, "npm tarball");
  if (tarball.sha256 !== manifest.npm_tarball.sha256) fail("npm tarball digest differs from the release manifest");
  const required = [...NPM_REQUIRED_FILES, manifest.npm_tarball.filename];
  if (new Set(required).size !== required.length) fail("npm release evidence contains duplicate filenames");
  const assets = required.map((filename) => fileRecord(npmDir, filename, `npm evidence ${filename}`));
  const digestRecord = assets.find((entry) => entry.filename === manifest.npm_tarball.filename);
  assertDigestFile(npmDir, "SHA256SUMS", [digestRecord, fileRecord(npmDir, "release-manifest.json", "npm release manifest")], "npm SHA256SUMS required entries");
  const publishedEvidence = provenanceStatus === "published" ? PUBLISHED_NPM_EVIDENCE_FILES : [];
  assertExactFiles(npmDir, [...required, ...publishedEvidence], "npm durable evidence set");
  return { manifest, assets };
}

function validateCAbiManifest(cAbiDir, mode, tag, sourceCommit) {
  const manifestPath = resolveUnder(cAbiDir, "c-abi-release-manifest.json", "C ABI release manifest");
  const manifest = json(manifestPath, "C ABI release manifest");
  if (!isPlainObject(manifest) || manifest.schema_version !== 1 || manifest.artifact_kind !== "c-abi-release-manifest" || manifest.package_name !== C_ABI_PACKAGE_NAME || manifest.npm_package_name !== NPM_PACKAGE_NAME || manifest.mode !== mode || manifest.source_commit !== sourceCommit) fail("C ABI release manifest identity is invalid");
  validIdentity(manifest.package_version, sourceCommit, tag, mode);
  if (mode === "release" && manifest.release_tag !== tag) fail("C ABI release manifest tag differs from release record");
  if (mode === "candidate" && manifest.release_tag !== null) fail("candidate C ABI release manifest contains a release tag");
  validHash(manifest.cargo_lock_sha256, "C ABI Cargo.lock identity");
  if (manifest.archive_format !== "tar.gz" || !Array.isArray(manifest.target_order) || JSON.stringify(manifest.target_order) !== JSON.stringify(C_ABI_TARGET_ORDER) || !Array.isArray(manifest.targets) || manifest.targets.length !== C_ABI_TARGET_ORDER.length || !isPlainObject(manifest.evidence)) fail("C ABI release manifest target/evidence shape is invalid");
  const assets = [];
  const expectedSums = [];
  for (const [index, targetId] of C_ABI_TARGET_ORDER.entries()) {
    const target = manifest.targets[index];
    if (!isPlainObject(target) || target.target_id !== targetId || typeof target.rust_target !== "string" || !isPlainObject(target.archive) || !isPlainObject(target.evidence)) fail(`C ABI target evidence is invalid: ${targetId}`);
    for (const entry of [target.archive, target.evidence]) {
      if (typeof entry.filename !== "string") fail(`C ABI target evidence filename is invalid: ${targetId}`);
      safeRelativePath(entry.filename, `C ABI target evidence ${targetId}`);
      validHash(entry.sha256, `C ABI target evidence digest ${targetId}`);
      const actual = fileRecord(cAbiDir, entry.filename, `C ABI target ${targetId}/${entry.filename}`);
      if (actual.sha256 !== entry.sha256) fail(`C ABI target digest mismatch: ${targetId}/${entry.filename}`);
      assets.push(actual);
      expectedSums.push(actual);
    }
  }
  for (const key of C_ABI_EVIDENCE_KEYS) {
    const entry = manifest.evidence[key];
    if (!isPlainObject(entry) || typeof entry.filename !== "string" || typeof entry.sha256 !== "string") fail(`C ABI evidence reference is invalid: ${key}`);
    safeRelativePath(entry.filename, `C ABI evidence ${key}`);
    validHash(entry.sha256, `C ABI evidence digest ${key}`);
    const actual = fileRecord(cAbiDir, entry.filename, `C ABI evidence ${key}`);
    if (actual.sha256 !== entry.sha256) fail(`C ABI evidence digest mismatch: ${key}`);
    assets.push(actual);
    expectedSums.push(actual);
  }
  const manifestAsset = fileRecord(cAbiDir, "c-abi-release-manifest.json", "C ABI release manifest");
  assets.push(manifestAsset);
  expectedSums.push(manifestAsset);
  assertDigestFile(cAbiDir, "C-ABI-SHA256SUMS", expectedSums, "C-ABI-SHA256SUMS");
  const cAbiInventory = json(resolveUnder(cAbiDir, manifest.evidence.inventory.filename, "C ABI license inventory"), "C ABI license inventory");
  const cAbiPolicy = json(resolveUnder(cAbiDir, manifest.evidence.policy.filename, "C ABI license policy"), "C ABI license policy");
  const cAbiThirdParty = json(resolveUnder(cAbiDir, manifest.evidence.third_party.filename, "C ABI third-party license evidence"), "C ABI third-party license evidence");
  if (!isPlainObject(cAbiInventory) || cAbiInventory.package_name !== C_ABI_PACKAGE_NAME || cAbiInventory.npm_package_name !== NPM_PACKAGE_NAME || cAbiInventory.package_version !== manifest.package_version || cAbiInventory.source_commit !== sourceCommit || cAbiInventory.cargo_lock_sha256 !== manifest.cargo_lock_sha256) fail("C ABI license inventory identity differs from the release manifest");
  if (!isPlainObject(cAbiPolicy) || cAbiPolicy.package_name !== C_ABI_PACKAGE_NAME || cAbiPolicy.npm_package_name !== NPM_PACKAGE_NAME || cAbiPolicy.package_version !== manifest.package_version || cAbiPolicy.source_commit !== sourceCommit || cAbiPolicy.gate_status !== "PASS") fail("C ABI license policy evidence is not a passing identity-bound result");
  if (!isPlainObject(cAbiThirdParty) || cAbiThirdParty.package_name !== C_ABI_PACKAGE_NAME || cAbiThirdParty.npm_package_name !== NPM_PACKAGE_NAME || cAbiThirdParty.package_version !== manifest.package_version || cAbiThirdParty.source_commit !== sourceCommit) fail("C ABI third-party evidence identity differs from the release manifest");
  if (mode === "release" && cAbiThirdParty.final_release_text_gate?.status !== "ready") fail("formal C ABI third-party license text gate is not ready");
  assets.push(fileRecord(cAbiDir, "C-ABI-SHA256SUMS", "C-ABI-SHA256SUMS"));
  assertExactFiles(cAbiDir, assets.map((entry) => entry.filename), "C ABI durable evidence set");
  return { manifest, assets };
}

function optionalPublishedEvidence(npmDir, provenanceStatus, sourceCommit, version, tag) {
  if (provenanceStatus === "not-executed" || provenanceStatus === "required-at-publish") return [];
  if (provenanceStatus !== "published") fail("unsupported npm provenance status");
  const operation = fileRecord(npmDir, "release-operation.json", "npm release operation evidence");
  const provenance = fileRecord(npmDir, "npm-provenance.json", "npm provenance record");
  const operationDocument = json(resolveUnder(npmDir, "release-operation.json", "npm release operation evidence"), "npm release operation evidence");
  if (!isPlainObject(operationDocument) || operationDocument.package_version !== version || operationDocument.release_tag !== tag || operationDocument.source_commit !== sourceCommit || operationDocument.provenance?.required !== true) fail("npm release operation evidence identity is invalid");
  const provenanceDocument = json(resolveUnder(npmDir, "npm-provenance.json", "npm provenance record"), "npm provenance record");
  if (!isPlainObject(provenanceDocument) || provenanceDocument.package_name !== NPM_PACKAGE_NAME || provenanceDocument.package_version !== version || provenanceDocument.release_tag !== tag || provenanceDocument.source_commit !== sourceCommit) fail("npm provenance record identity is invalid");
  return [operation, provenance];
}

export function createReleaseRecord({ npmDir, cAbiDir, outputDir, mode = "candidate", tag = null, sourceCommit, provenanceStatus = mode === "candidate" ? "not-executed" : "required-at-publish", write = true }) {
  if (provenanceStatus === "published" && mode !== "release") fail("published npm provenance requires formal release mode");
  const npm = validateNpmManifest(npmDir, mode, tag, sourceCommit, provenanceStatus);
  const cAbi = validateCAbiManifest(cAbiDir, mode, tag, sourceCommit);
  const publishedEvidence = optionalPublishedEvidence(npmDir, provenanceStatus, sourceCommit, npm.manifest.package_version, tag);
  const npmAssets = [...npm.assets, ...publishedEvidence];
  const allAssetNames = [...npmAssets, ...cAbi.assets].map((entry) => entry.filename);
  if (new Set(allAssetNames).size !== allAssetNames.length) fail("durable release asset filenames are duplicated");
  const record = {
    schema_version: RECORD_SCHEMA_VERSION,
    artifact_kind: "release-record",
    mode,
    package_name: NPM_PACKAGE_NAME,
    version: npm.manifest.package_version,
    tag,
    source_commit: sourceCommit,
    shared_evidence: {
      source_commit: sourceCommit,
      cargo_lock_sha256: npm.manifest.cargo_lock_sha256,
      pnpm_lock_sha256: npm.manifest.pnpm_lock_sha256,
      npm_workflow: NPM_WORKFLOW,
      c_abi_workflow: C_ABI_WORKFLOW,
      source_evidence: { filename: "release-source.json", sha256: npm.assets.find((entry) => entry.filename === "release-source.json").sha256 },
      npm_toolchains: npm.manifest.toolchains,
    },
    reproducibility: {
      policy: "source / toolchain / evidence reproducible",
      bit_for_bit_required: false,
      validation: "source commit, lockfile identity, toolchain, workflow, artifact and evidence SHA-256 are identity-bound",
    },
    npm: {
      package_name: NPM_PACKAGE_NAME,
      version: npm.manifest.package_version,
      tag,
      source_commit: sourceCommit,
      release_manifest: npm.assets.find((entry) => entry.filename === "release-manifest.json"),
      tarball: npm.assets.find((entry) => entry.filename === npm.manifest.npm_tarball.filename),
      evidence: npm.assets.filter((entry) => entry.filename !== npm.manifest.npm_tarball.filename),
      provenance: {
        mechanism: "npm-trusted-publishing-oidc",
        required: true,
        status: provenanceStatus,
        record: publishedEvidence.find((entry) => entry.filename === "npm-provenance.json") ?? null,
      },
    },
    c_abi: {
      package_name: C_ABI_PACKAGE_NAME,
      version: cAbi.manifest.package_version,
      tag,
      source_commit: sourceCommit,
      release_manifest: cAbi.assets.find((entry) => entry.filename === "c-abi-release-manifest.json"),
      evidence: cAbi.assets,
    },
    signing: {
      policy: "npm provenance only",
      npm: "provenance required",
      c_abi: "no additional artifact signing in v1",
    },
    durable_asset_list: {
      npm: npmAssets,
      c_abi: cAbi.assets,
    },
  };
  const recordPath = resolve(outputDir, RECORD_FILENAME);
  const sumsPath = resolve(outputDir, RECORD_SUMS_FILENAME);
  if (write) {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    writeFileSync(sumsPath, `${hashFile(recordPath, RECORD_FILENAME)}  ${RECORD_FILENAME}\n`);
  }
  return { record, recordPath, sumsPath };
}

export function validateReleaseRecord({ npmDir, cAbiDir, outputDir, mode = "candidate", tag = null, sourceCommit, provenanceStatus = mode === "candidate" ? "not-executed" : "required-at-publish" }) {
  const expected = createReleaseRecord({ npmDir, cAbiDir, outputDir, mode, tag, sourceCommit, provenanceStatus, write: false });
  const actual = json(resolve(outputDir, RECORD_FILENAME), RECORD_FILENAME);
  if (JSON.stringify(actual) !== JSON.stringify(expected.record)) fail(`${RECORD_FILENAME} differs from deterministic output`);
  const sums = bytes(resolve(outputDir, RECORD_SUMS_FILENAME), RECORD_SUMS_FILENAME).toString("utf8");
  const expectedSums = `${hashFile(resolve(outputDir, RECORD_FILENAME), RECORD_FILENAME)}  ${RECORD_FILENAME}\n`;
  if (sums !== expectedSums) fail(`${RECORD_SUMS_FILENAME} differs from ${RECORD_FILENAME}`);
  return expected;
}

function argument(argv, name, fallback = undefined) {
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
  const command = argv[0];
  if (command !== "generate" && command !== "validate") fail("usage: generate | validate");
  const mode = argument(argv, "--mode", "candidate");
  const tag = argument(argv, "--tag", null);
  const sourceCommitValue = argument(argv, "--source-commit");
  const provenanceStatus = argument(argv, "--provenance-status", mode === "candidate" ? "not-executed" : "required-at-publish");
  const input = {
    npmDir: resolve(repositoryRoot, argument(argv, "--npm-dir")),
    cAbiDir: resolve(repositoryRoot, argument(argv, "--c-abi-dir")),
    outputDir: resolve(repositoryRoot, argument(argv, "--output")),
    mode,
    tag,
    sourceCommit: sourceCommitValue,
    provenanceStatus,
  };
  const result = command === "generate" ? createReleaseRecord(input) : validateReleaseRecord(input);
  process.stdout.write(`${JSON.stringify({ record: result.recordPath, sums: result.sumsPath, asset_count: result.record.durable_asset_list.npm.length + result.record.durable_asset_list.c_abi.length, provenance_status: result.record.npm.provenance.status })}\n`);
}

export { C_ABI_WORKFLOW, NPM_REQUIRED_FILES, NPM_WORKFLOW, RECORD_FILENAME, RECORD_SCHEMA_VERSION, RECORD_SUMS_FILENAME };

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

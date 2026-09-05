import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalCargoLockBytes,
  cargoLockSha256,
  pnpmLockSha256,
} from "./release-evidence.mjs";
import { validateReleaseManifest } from "./release-manifest.mjs";
import { thirdPartyLicenseEvidenceForComponent } from "./third-party-license-evidence.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(repositoryRoot, "packages/wallet-core");
const SPDX_VERSION = "SPDX-2.3";
const INVENTORY_SCHEMA_VERSION = 2;
const CARGO_SBOM_VERSION = "0.10.0";
const SBOM_FILENAME = "sbom.spdx.json";
const INVENTORY_FILENAME = "license-inventory.json";
const SBOM_SUMS_FILENAME = "SBOM-SHA256SUMS";
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const NATIVE_TARGETS = Object.freeze([
  Object.freeze({ target: "x86_64-pc-windows-msvc", package: "symbol-nem-wallet-core-node", role: "native" }),
  Object.freeze({ target: "x86_64-apple-darwin", package: "symbol-nem-wallet-core-node", role: "native" }),
  Object.freeze({ target: "aarch64-apple-darwin", package: "symbol-nem-wallet-core-node", role: "native" }),
  Object.freeze({ target: "x86_64-unknown-linux-gnu", package: "symbol-nem-wallet-core-node", role: "native" }),
  Object.freeze({ target: "wasm32-unknown-unknown", package: "symbol-nem-wallet-core-wasm", role: "wasm" }),
]);
const NATIVE_TARGET_TRIPLES = NATIVE_TARGETS.map(({ target }) => target);
const NPM_PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";

// These are SPDX syntax/identifier catalogues, not a license policy or allowlist.
// They contain identifiers observed in the release closure. A new identifier
// fails closed until it is verified as SPDX syntax; legal acceptability is out
// of scope for this phase.
const SPDX_LICENSE_IDENTIFIER_CATALOGUE = new Set([
  "Apache-2.0",
  "BSD-1-Clause",
  "BSD-3-Clause",
  "CC0-1.0",
  "ISC",
  "LGPL-2.1-or-later",
  "MIT",
  "Unicode-3.0",
  "Unlicense",
  "Zlib",
]);
const SPDX_EXCEPTION_IDENTIFIER_CATALOGUE = new Set(["LLVM-exception"]);
const CURVE25519_DALEK_DERIVE_NORMALIZATION = Object.freeze({
  name: "curve25519-dalek-derive",
  version: "0.1.1",
  raw: "MIT/Apache-2.0",
  normalized: "MIT OR Apache-2.0",
  repository: "https://github.com/dalek-cryptography/curve25519-dalek",
  licenseFiles: Object.freeze(["LICENSE-APACHE", "LICENSE-MIT"]),
});

function fail(message) {
  throw new Error(`Release SBOM gate failed: ${message}`);
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

function validVersion(value, label) {
  if (typeof value !== "string" || !VERSION_PATTERN.test(value)) fail(`${label} is invalid`);
}

function validateLicenseNormalization(value, component) {
  exactKeys(value, ["applied", "basis"], `license normalization ${component.name ?? "unknown"}`);
  if (typeof value.applied !== "boolean") fail(`license normalization applied flag is invalid: ${component.name ?? "unknown"}`);
  if (!value.applied) {
    if (value.basis !== null) fail(`license normalization basis is unexpected: ${component.name ?? "unknown"}`);
    return;
  }
  exactKeys(value.basis, ["type", "repository", "declared_license_metadata", "license_text_files", "normalized_spdx_expression"], `license normalization basis ${component.name ?? "unknown"}`);
  if (
    value.basis.type !== "upstream-package-metadata-and-license-files" ||
    value.basis.repository !== CURVE25519_DALEK_DERIVE_NORMALIZATION.repository ||
    value.basis.declared_license_metadata !== component.declared_license_metadata ||
    value.basis.normalized_spdx_expression !== component.license_expression ||
    !Array.isArray(value.basis.license_text_files) ||
    value.basis.license_text_files.length === 0
  ) {
    fail(`license normalization basis is inconsistent: ${component.name ?? "unknown"}`);
  }
  for (const file of value.basis.license_text_files) safeRelativePath(file, `license normalization evidence ${component.name}`);
  if (tryParseLicenseExpression(value.basis.normalized_spdx_expression).parsed === undefined) fail(`license normalization expression is invalid: ${component.name}`);
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

function sha256(path, label = path) {
  return createHash("sha256").update(bytes(path, label)).digest("hex");
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
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

function pathRelativeToRepository(path, label) {
  const value = relative(repositoryRoot, path).replaceAll("\\", "/");
  safeRelativePath(value, label);
  return value;
}

function packageIdentityKey(component) {
  return `${component.ecosystem}|${component.name}|${component.version}|${component.source}`;
}

function cargoIdentityKey(packageData) {
  return `cargo|${packageData.name}|${packageData.version}|${cargoPackageSource(packageData)}`;
}

function cargoPackageSource(packageData) {
  if (typeof packageData.source === "string" && packageData.source.length > 0) return packageData.source;
  const manifestDirectory = dirname(packageData.manifest_path);
  const relativeDirectory = relative(repositoryRoot, manifestDirectory).replaceAll("\\", "/");
  if (relativeDirectory.length === 0 || relativeDirectory.startsWith("..")) {
    fail(`Cargo path package is outside the checked out source: ${packageData.name}`);
  }
  return `path:${relativeDirectory}`;
}

function tokenizeLicenseExpression(expression) {
  if (typeof expression !== "string" || expression.length === 0) fail("license expression is missing");
  const tokens = [];
  let index = 0;
  while (index < expression.length) {
    if (/\s/.test(expression[index])) {
      index += 1;
      continue;
    }
    if (expression[index] === "(" || expression[index] === ")") {
      tokens.push(expression[index]);
      index += 1;
      continue;
    }
    const match = /^[A-Za-z0-9][A-Za-z0-9.+-]*/.exec(expression.slice(index));
    if (match === null) fail(`license expression has invalid token: ${expression}`);
    tokens.push(match[0]);
    index += match[0].length;
  }
  return tokens;
}

function parseLicenseExpressionSyntax(expression) {
  const tokens = tokenizeLicenseExpression(expression);
  let index = 0;
  const identifiers = [];
  const exceptions = [];

  function peek() {
    return tokens[index];
  }

  function consume(value) {
    if (peek() !== value) fail(`license expression expected ${value}: ${expression}`);
    index += 1;
  }

  function parseOr() {
    let node = parseAnd();
    while (peek() === "OR") {
      consume("OR");
      node = { kind: "binary", operator: "OR", left: node, right: parseAnd() };
    }
    return node;
  }

  function parseAnd() {
    let node = parseWith();
    while (peek() === "AND") {
      consume("AND");
      node = { kind: "binary", operator: "AND", left: node, right: parseWith() };
    }
    return node;
  }

  function parseWith() {
    const node = parsePrimary();
    if (peek() !== "WITH") return node;
    if (node.kind !== "license") fail(`license exception must follow a license identifier: ${expression}`);
    consume("WITH");
    const exception = peek();
    if (exception === undefined || exception === "(" || exception === ")" || exception === "AND" || exception === "OR" || exception === "WITH") {
      fail(`license exception is missing: ${expression}`);
    }
    index += 1;
    exceptions.push(exception);
    node.exception = exception;
    return node;
  }

  function parsePrimary() {
    if (peek() === "(") {
      consume("(");
      const node = parseOr();
      consume(")");
      return node;
    }
    const identifier = peek();
    if (identifier === undefined || identifier === "AND" || identifier === "OR" || identifier === "WITH" || identifier === ")") {
      fail(`license expression is malformed: ${expression}`);
    }
    index += 1;
    identifiers.push(identifier);
    return { kind: "license", identifier };
  }

  const tree = parseOr();
  if (index !== tokens.length) fail(`license expression has trailing tokens: ${expression}`);
  return { tree, identifiers: [...new Set(identifiers)], exceptions: [...new Set(exceptions)] };
}

function validateSpdxLicenseExpressionSyntax(parsed) {
  function visit(node) {
    if (node.kind === "license") {
      if (!SPDX_LICENSE_IDENTIFIER_CATALOGUE.has(node.identifier) && !(node.identifier.startsWith("LicenseRef-") && node.identifier.length > "LicenseRef-".length)) {
        fail(`unknown SPDX license identifier: ${node.identifier}`);
      }
      if (node.exception !== undefined && !SPDX_EXCEPTION_IDENTIFIER_CATALOGUE.has(node.exception)) {
        fail(`unknown SPDX exception identifier: ${node.exception}`);
      }
      return;
    }
    visit(node.left);
    visit(node.right);
  }
  visit(parsed.tree);
  return parsed;
}

function parseLicenseExpression(expression) {
  const parsed = validateSpdxLicenseExpressionSyntax(parseLicenseExpressionSyntax(expression));
  return { tree: parsed.tree, identifiers: parsed.identifiers };
}

function tryParseLicenseExpression(expression) {
  try {
    return { parsed: parseLicenseExpression(expression), error: undefined };
  } catch (error) {
    return { parsed: undefined, error: error instanceof Error ? error.message : String(error) };
  }
}

function parseCargoLock(contents) {
  const records = [];
  const matches = contents.matchAll(/\[\[package\]\]\r?\n([\s\S]*?)(?=\r?\n\[\[package\]\]|\s*$)/g);
  for (const match of matches) {
    const block = match[1];
    const field = (name) => {
      const result = new RegExp(`^${name} = "([^"]+)"$`, "m").exec(block);
      return result?.[1];
    };
    const name = field("name");
    const version = field("version");
    if (name === undefined || version === undefined) fail("Cargo.lock contains a package without name/version");
    records.push({
      name,
      version,
      source: field("source"),
      checksum: field("checksum"),
    });
  }
  return records;
}

function cargoLockIndex() {
  const records = parseCargoLock(canonicalCargoLockBytes().toString("utf8"));
  const index = new Map();
  for (const record of records) {
    if (record.source === undefined) continue;
    const key = `cargo|${record.name}|${record.version}|${record.source}`;
    if (index.has(key)) fail(`Cargo.lock contains duplicate package identity: ${key}`);
    index.set(key, record);
  }
  return index;
}

function readCargoMetadata(path, target) {
  const metadata = json(path, `Cargo metadata ${target}`);
  if (metadata.version !== 1 || !Array.isArray(metadata.packages) || !isPlainObject(metadata.resolve) || !Array.isArray(metadata.resolve.nodes)) {
    fail(`Cargo metadata ${target} has an unsupported shape`);
  }
  return metadata;
}

function normalRuntimeDependency(dep) {
  return Array.isArray(dep.dep_kinds) && dep.dep_kinds.some((kind) => kind.kind === null);
}

function addCargoPackage(packageMap, packageData, role) {
  const identity = cargoIdentityKey(packageData);
  const current = packageMap.get(identity);
  if (current === undefined) {
    packageMap.set(identity, { packageData, roles: new Set([role]) });
    return identity;
  }
  if (current.packageData.name !== packageData.name || current.packageData.version !== packageData.version || cargoPackageSource(current.packageData) !== cargoPackageSource(packageData)) {
    fail(`Cargo package identity is inconsistent: ${identity}`);
  }
  current.roles.add(role);
  return identity;
}

function collectCargoGraph(metadataInputs) {
  const packageMap = new Map();
  const edgeMap = new Map();
  const allPackageMap = new Map();
  const roleByMetadataTarget = new Map();

  for (const target of NATIVE_TARGETS) {
    const metadata = readCargoMetadata(metadataInputs.get(target.target), target.target);
    roleByMetadataTarget.set(target.target, metadata);
    const byId = new Map(metadata.packages.map((packageData) => [packageData.id, packageData]));
    for (const packageData of metadata.packages) {
      const identity = cargoIdentityKey(packageData);
      const existing = allPackageMap.get(identity);
      if (existing !== undefined && (existing.name !== packageData.name || existing.version !== packageData.version)) {
        fail(`Cargo metadata contains an inconsistent package identity: ${identity}`);
      }
      allPackageMap.set(identity, packageData);
    }
    const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
    const rootCandidates = metadata.packages.filter((packageData) => packageData.name === target.package);
    if (rootCandidates.length !== 1) fail(`Cargo metadata ${target.target} has an ambiguous ${target.package} root`);
    const root = rootCandidates[0];
    if (!nodes.has(root.id)) fail(`Cargo metadata ${target.target} has no resolve node for ${target.package}`);
    const stack = [root.id];
    const visited = new Set();
    while (stack.length > 0) {
      const packageId = stack.pop();
      if (visited.has(packageId)) continue;
      visited.add(packageId);
      const packageData = byId.get(packageId);
      const node = nodes.get(packageId);
      if (packageData === undefined || node === undefined) fail(`Cargo dependency graph references an unknown package: ${packageId}`);
      const sourceIdentity = addCargoPackage(packageMap, packageData, target.role);
      for (const dependency of node.deps ?? []) {
        if (!normalRuntimeDependency(dependency)) continue;
        const dependencyData = byId.get(dependency.pkg);
        if (dependencyData === undefined) fail(`Cargo dependency graph references an unknown dependency: ${dependency.pkg}`);
        const relatedIdentity = addCargoPackage(packageMap, dependencyData, target.role);
        edgeMap.set(`${sourceIdentity}\n${relatedIdentity}`, {
          source: sourceIdentity,
          target: relatedIdentity,
        });
        stack.push(dependency.pkg);
      }
    }
  }

  return {
    packages: [...packageMap.values()].sort((left, right) => cargoIdentityKey(left.packageData).localeCompare(cargoIdentityKey(right.packageData))),
    edges: [...edgeMap.values()].sort((left, right) => `${left.source}\n${left.target}`.localeCompare(`${right.source}\n${right.target}`)),
    allPackages: [...allPackageMap.values()].sort((left, right) => cargoIdentityKey(left).localeCompare(cargoIdentityKey(right))),
    metadataByTarget: roleByMetadataTarget,
  };
}

function parseCargoSbom(path, binding) {
  const document = json(path, `cargo-sbom ${binding} output`);
  if (document.SPDXID !== "SPDXRef-DOCUMENT" || document.spdxVersion !== SPDX_VERSION || !Array.isArray(document.packages) || !Array.isArray(document.relationships)) {
    fail(`cargo-sbom ${binding} output is not SPDX 2.3 JSON`);
  }
  const ids = new Set([document.SPDXID]);
  const packageIdentities = new Set();
  for (const packageData of document.packages) {
    if (!isPlainObject(packageData) || typeof packageData.SPDXID !== "string" || typeof packageData.name !== "string" || typeof packageData.versionInfo !== "string" || typeof packageData.downloadLocation !== "string" || typeof packageData.licenseDeclared !== "string") {
      fail(`cargo-sbom ${binding} output contains an incomplete package`);
    }
    if (!/^SPDXRef-[A-Za-z0-9.-]+$/.test(packageData.SPDXID) || ids.has(packageData.SPDXID)) fail(`cargo-sbom ${binding} output contains a duplicate or invalid SPDX ID`);
    ids.add(packageData.SPDXID);
    const identity = `${packageData.name}|${packageData.versionInfo}|${packageData.downloadLocation}`;
    if (packageIdentities.has(identity)) fail(`cargo-sbom ${binding} output contains a duplicate package identity: ${identity}`);
    packageIdentities.add(identity);
  }
  for (const relationship of document.relationships) {
    if (!isPlainObject(relationship) || typeof relationship.spdxElementId !== "string" || typeof relationship.relatedSpdxElement !== "string" || typeof relationship.relationshipType !== "string" || !ids.has(relationship.spdxElementId) || !ids.has(relationship.relatedSpdxElement)) {
      fail(`cargo-sbom ${binding} output contains an invalid relationship`);
    }
  }
  return document;
}

function cargoSbomPackageMatches(packageData, generatedPackage) {
  if (generatedPackage.name !== packageData.name || generatedPackage.versionInfo !== packageData.version) return false;
  if (typeof packageData.source !== "string") return generatedPackage.downloadLocation === "NONE";
  return generatedPackage.downloadLocation === packageData.source;
}

function validateGeneratorCoverage(graph, generatorDocuments, lockIndex) {
  const generatedByBinding = new Map(Object.entries(generatorDocuments));
  const excluded = new Map();
  for (const [binding, document] of generatedByBinding) {
    const generatedByNameVersion = new Map();
    for (const generatedPackage of document.packages) {
      const key = `${generatedPackage.name}|${generatedPackage.versionInfo}`;
      const values = generatedByNameVersion.get(key) ?? [];
      values.push(generatedPackage);
      generatedByNameVersion.set(key, values);
    }
    const role = binding === "node" ? "native" : "wasm";
    for (const entry of graph.packages.filter((candidate) => candidate.roles.has(role))) {
      const packageData = entry.packageData;
      const key = `${packageData.name}|${packageData.version}`;
      const matches = generatedByNameVersion.get(key) ?? [];
      if (matches.length !== 1 || !cargoSbomPackageMatches(packageData, matches[0])) {
        fail(`cargo-sbom ${binding} output does not exactly cover ${packageData.name}@${packageData.version}`);
      }
      const generatedLicense = matches[0].licenseDeclared;
      const declaredLicense = cargoLicenseMetadata(packageData).expression;
      if (declaredLicense !== null) {
        if (generatedLicense !== declaredLicense) fail(`cargo-sbom ${binding} changed a valid license expression: ${packageData.name}@${packageData.version}`);
      } else if (typeof generatedLicense !== "string" || tryParseLicenseExpression(generatedLicense).parsed === undefined) {
        fail(`cargo-sbom ${binding} did not provide a valid expression for unresolved license metadata: ${packageData.name}@${packageData.version}`);
      }
      const existingLicense = entry.generator_license_expression;
      if (existingLicense !== undefined && existingLicense !== generatedLicense) fail(`cargo-sbom license output differs between bindings: ${packageData.name}@${packageData.version}`);
      entry.generator_license_expression = generatedLicense;
    }
    for (const generatedPackage of document.packages) {
      const key = `${generatedPackage.name}|${generatedPackage.versionInfo}`;
      const expected = graph.packages.find((candidate) => candidate.packageData.name === generatedPackage.name && candidate.packageData.version === generatedPackage.versionInfo);
      if (expected !== undefined) continue;
      const allMatches = graph.allPackages.filter((candidate) => candidate.name === generatedPackage.name && candidate.version === generatedPackage.versionInfo);
      let excludedIdentity;
      let excludedEntry;
      if (allMatches.length === 1) {
        const packageData = allMatches[0];
        if (!cargoSbomPackageMatches(packageData, generatedPackage)) fail(`cargo-sbom ${binding} metadata differs for excluded package: ${key}`);
        excludedIdentity = cargoIdentityKey(packageData);
        excludedEntry = { name: packageData.name, version: packageData.version, source: cargoPackageSource(packageData) };
      } else if (allMatches.length === 0) {
        const lockMatches = [...lockIndex.values()].filter((record) => record.name === generatedPackage.name && record.version === generatedPackage.versionInfo);
        if (lockMatches.length !== 1 || generatedPackage.downloadLocation !== lockMatches[0].source) fail(`cargo-sbom ${binding} output contains an untraceable package: ${key}`);
        const record = lockMatches[0];
        excludedIdentity = `cargo|${record.name}|${record.version}|${record.source}`;
        excludedEntry = { name: record.name, version: record.version, source: record.source };
        if (typeof generatedPackage.licenseDeclared !== "string" || tryParseLicenseExpression(generatedPackage.licenseDeclared).parsed === undefined) fail(`cargo-sbom ${binding} excluded package license is invalid: ${key}`);
      } else {
        fail(`cargo-sbom ${binding} output contains an ambiguous package: ${key}`);
      }
      excluded.set(excludedIdentity, {
        ...excludedEntry,
        reason: "cargo-sbom output is outside the normal dependency closure for the formal target set",
      });
    }
  }
  return [...excluded.values()].sort((left, right) => `${left.name}|${left.version}|${left.source}`.localeCompare(`${right.name}|${right.version}|${right.source}`));
}

function cargoLicenseMetadata(packageData) {
  const raw = typeof packageData.license === "string" ? packageData.license : null;
  if (
    packageData.name === CURVE25519_DALEK_DERIVE_NORMALIZATION.name &&
    packageData.version === CURVE25519_DALEK_DERIVE_NORMALIZATION.version &&
    raw === CURVE25519_DALEK_DERIVE_NORMALIZATION.raw &&
    packageData.repository === CURVE25519_DALEK_DERIVE_NORMALIZATION.repository &&
    typeof packageData.manifest_path === "string"
  ) {
    const sourceDirectory = dirname(packageData.manifest_path);
    const evidenceFiles = CURVE25519_DALEK_DERIVE_NORMALIZATION.licenseFiles.filter((file) => existsSync(resolve(sourceDirectory, file)));
    if (evidenceFiles.length === CURVE25519_DALEK_DERIVE_NORMALIZATION.licenseFiles.length) {
      return {
        expression: CURVE25519_DALEK_DERIVE_NORMALIZATION.normalized,
        normalization: {
          applied: true,
          basis: {
            type: "upstream-package-metadata-and-license-files",
            repository: packageData.repository,
            declared_license_metadata: raw,
            license_text_files: [...evidenceFiles],
            normalized_spdx_expression: CURVE25519_DALEK_DERIVE_NORMALIZATION.normalized,
          },
        },
      };
    }
  }

  const parsed = raw === null ? { parsed: undefined } : tryParseLicenseExpression(raw);
  return {
    expression: parsed.parsed === undefined ? null : raw,
    normalization: {
      applied: false,
      basis: null,
    },
  };
}

function packageLicenseFiles(packageData, expression) {
  const parsed = tryParseLicenseExpression(expression);
  if (parsed.parsed === undefined) return { status: "unavailable", files: [], reason: parsed.error };
  if (typeof packageData.source === "string") {
    const checkedInEvidence = thirdPartyLicenseEvidenceForComponent({ ...packageData, license_expression: expression });
    if (checkedInEvidence !== null) {
      return {
        status: "resolved",
        files: [{ path: checkedInEvidence.upstream_file_path, sha256: checkedInEvidence.collected_text_sha256 }],
      };
    }
  }
  const sourceDirectory = typeof packageData.source !== "string" ? repositoryRoot : dirname(packageData.manifest_path);
  const entries = readdirSync(sourceDirectory, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
  const licenseFiles = entries.filter((entry) => /^(license|copying|unlicense|notice)(?:[-_.].*)?$/i.test(entry));
  const selected = [];
  const used = new Set();
  const generic = licenseFiles.filter((entry) => /^(license|copying|unlicense|notice)$/i.test(entry));
  const candidates = (identifier) => {
    const names = {
      "Apache-2.0": ["LICENSE-APACHE", "LICENSE-APACHE-2.0"],
      "BSD-1-Clause": ["LICENSE-BSD-1-CLAUSE", "LICENSE"],
      "BSD-3-Clause": ["LICENSE-BSD-3-CLAUSE", "LICENSE"],
      "CC0-1.0": ["LICENSE-CC0", "LICENSE"],
      ISC: ["LICENSE-ISC", "LICENSE"],
      MIT: ["LICENSE-MIT", "LICENSE"],
      "Unicode-3.0": ["LICENSE-UNICODE"],
      Unlicense: ["UNLICENSE"],
      Zlib: ["LICENSE-ZLIB"],
    }[identifier] ?? [];
    const explicit = licenseFiles.filter((entry) => names.filter((name) => name !== "LICENSE").some((name) => entry.toLowerCase() === name.toLowerCase() || entry.toLowerCase() === `${name.toLowerCase()}.md`));
    if (explicit.length > 0) return explicit;
    return licenseFiles.filter((entry) => names.includes("LICENSE") && entry.toLowerCase() === "license");
  };

  for (const identifier of parsed.parsed.identifiers) {
    let matches = candidates(identifier);
    if (matches.length === 0 && parsed.parsed.identifiers.length === 1 && generic.length === 1) matches = generic;
    if (matches.length === 0) return { status: "missing", files: [], reason: `no source license text for ${identifier}` };
    if (matches.length > 1) return { status: "ambiguous", files: [], reason: `multiple source license texts for ${identifier}` };
    const match = matches[0];
    if (used.has(match)) continue;
    used.add(match);
    const absolutePath = resolve(sourceDirectory, match);
    selected.push({
      path: typeof packageData.source !== "string" ? pathRelativeToRepository(absolutePath, "license text path") : match,
      sha256: sha256(absolutePath, `license text ${packageData.name}/${match}`),
    });
  }
  return { status: "resolved", files: selected.sort((left, right) => left.path.localeCompare(right.path)) };
}

function licenseStatus(expression) {
  if (expression === undefined || expression === null || expression.length === 0) return "missing";
  return "resolved";
}

function buildCargoComponents(graph, lockIndex, sourceCommit, cargoDigest) {
  return graph.packages.map(({ packageData, roles, generator_license_expression }) => {
    const source = cargoPackageSource(packageData);
    const rawLicenseMetadata = typeof packageData.license === "string" ? packageData.license : null;
    const licenseMetadata = cargoLicenseMetadata(packageData);
    const expression = licenseMetadata.expression;
    const parsed = expression === null ? { parsed: undefined, error: rawLicenseMetadata === null ? "Cargo package has no license expression" : "Cargo package license metadata is not a valid SPDX expression" } : tryParseLicenseExpression(expression);
    const text = parsed.parsed === undefined ? { status: "unavailable", files: [], reason: parsed.error } : packageLicenseFiles(packageData, expression);
    const status = expression === null ? (rawLicenseMetadata === null ? "missing" : "unknown") : licenseStatus(expression);
    let checksumSha256;
    if (typeof packageData.source === "string") {
      const record = lockIndex.get(cargoIdentityKey(packageData));
      if (record === undefined || typeof record.checksum !== "string" || !HASH_PATTERN.test(record.checksum)) {
        fail(`Cargo.lock checksum is missing for ${packageData.name}@${packageData.version}`);
      }
      checksumSha256 = record.checksum;
    }
    const component = {
      ecosystem: "cargo",
      name: packageData.name,
      version: packageData.version,
      source,
      license_expression: parsed.parsed === undefined ? null : expression,
      declared_license_metadata: rawLicenseMetadata,
      generator_license_expression: generator_license_expression ?? null,
      license_status: status,
      license_text_status: text.status,
      license_text_files: text.files,
      clarification_reason: text.reason ?? null,
      license_normalization: licenseMetadata.normalization,
      artifact_roles: [...roles].sort(),
      checksum_sha256: checksumSha256,
      description: typeof packageData.description === "string" ? packageData.description.trim() : undefined,
      repository: typeof packageData.repository === "string" ? packageData.repository : undefined,
      source_commit: sourceCommit,
      cargo_lock_sha256: cargoDigest,
    };
    component.identity = packageIdentityKey(component);
    return component;
  });
}

function packageMetadataFromRoot(root = packageRoot) {
  const metadata = json(resolve(root, "package.json"), "npm package metadata");
  if (metadata.name !== NPM_PACKAGE_NAME || typeof metadata.version !== "string" || !VERSION_PATTERN.test(metadata.version)) {
    fail("npm package identity is invalid");
  }
  return metadata;
}

function npmPurl(name, version) {
  return `pkg:npm/${name.replace(/^@/, "%40")}@${version}`;
}

function cargoPurl(name, version) {
  return `pkg:cargo/${name}@${version}`;
}

function spdxIdForComponent(component) {
  const slug = `${component.ecosystem}-${component.name}-${component.version}`.replaceAll("@", "-at-").replace(/[^A-Za-z0-9.-]/g, "-");
  const suffix = createHash("sha256").update(component.identity).digest("hex").slice(0, 16);
  return `SPDXRef-Package-${slug}-${suffix}`;
}

function spdxIdForReactNativeFile(file) {
  const slug = file.relative_path.replace(/[^A-Za-z0-9.-]/g, "-");
  return `SPDXRef-File-${slug}`;
}

function normalizedReactNativeFiles(context) {
  const files = [];
  if (context.reactNativeArtifactManifest !== undefined && context.reactNativeArtifactManifest !== null) {
    files.push({
      relative_path: context.reactNativeArtifactManifest.relative_path,
      sha256: context.reactNativeArtifactManifest.sha256,
      size: context.reactNativeArtifactManifest.size,
    });
  }
  for (const artifact of context.reactNativeArtifacts ?? []) {
    files.push({
      relative_path: artifact.relative_path,
      sha256: artifact.sha256,
      size: artifact.size,
    });
  }
  return files;
}

function commentForComponent(component) {
  return `source=${component.source}; source_commit=${component.source_commit}; cargo_lock_sha256=${component.cargo_lock_sha256}; artifact_roles=${component.artifact_roles.join(",")}; declared_license_metadata=${component.declared_license_metadata ?? "MISSING"}`;
}

function createLicenseInventory(context) {
  const components = context.components.map((component) => {
    const result = {
      ecosystem: component.ecosystem,
      name: component.name,
      version: component.version,
      source: component.source,
      spdx_id: spdxIdForComponent(component),
      license_expression: component.license_expression,
      declared_license_metadata: component.declared_license_metadata,
      generator_license_expression: component.generator_license_expression,
      license_status: component.license_status,
      license_text_status: component.license_text_status,
      license_text_files: component.license_text_files,
      clarification_reason: component.clarification_reason ?? null,
      license_normalization: component.license_normalization,
      artifact_roles: component.artifact_roles,
    };
    if (component.checksum_sha256 !== undefined) result.checksum_sha256 = component.checksum_sha256;
    return result;
  });
  const inventory = {
    schema_version: INVENTORY_SCHEMA_VERSION,
    inventory_kind: "license",
    package_name: context.packageName,
    package_version: context.packageVersion,
    source_commit: context.sourceCommit,
    cargo_lock_sha256: context.cargoLockSha256,
    pnpm_lock_sha256: context.pnpmLockSha256,
    sbom_file: SBOM_FILENAME,
    npm_runtime_dependency_count: context.npmRuntimeDependencyCount,
    rust_component_count: components.filter((component) => component.ecosystem === "cargo").length,
    rust_dependency_package_count: components.filter((component) => component.ecosystem === "cargo" && component.source.startsWith("registry+")).length,
    excluded_cargo_packages: context.excludedCargoPackages,
    react_native_artifact_manifest: context.reactNativeArtifactManifest ?? null,
    react_native_artifacts: (context.reactNativeArtifacts ?? []).map((artifact) => ({ ...artifact })),
    components: components.sort((left, right) => `${left.ecosystem}|${left.name}|${left.version}|${left.source}`.localeCompare(`${right.ecosystem}|${right.name}|${right.version}|${right.source}`)),
  };
  return inventory;
}

function createSpdxDocument(context) {
  const components = [...context.components].sort((left, right) => `${left.ecosystem}|${left.name}|${left.version}|${left.source}`.localeCompare(`${right.ecosystem}|${right.name}|${right.version}|${right.source}`));
  const root = components.find((component) => component.ecosystem === "npm");
  if (root === undefined) fail("SPDX root npm package is missing");
  const packageIds = new Map(components.map((component) => [component.identity, spdxIdForComponent(component)]));
  const packages = components.map((component) => {
    const result = {
      SPDXID: packageIds.get(component.identity),
      name: component.name,
      versionInfo: component.version,
      downloadLocation: component.ecosystem === "cargo" && component.source.startsWith("registry+") ? component.source : "NOASSERTION",
      filesAnalyzed: false,
      licenseConcluded: "NOASSERTION",
      licenseDeclared: component.license_expression ?? "NOASSERTION",
      copyrightText: "NOASSERTION",
      packageComment: commentForComponent(component),
    };
    if (component.description !== undefined) result.description = component.description;
    if (component.repository !== undefined) result.homepage = component.repository;
    if (component.checksum_sha256 !== undefined) result.checksums = [{ algorithm: "SHA256", checksumValue: component.checksum_sha256 }];
    if (component.ecosystem === "cargo" && component.source.startsWith("registry+")) {
      result.externalRefs = [{ referenceCategory: "PACKAGE-MANAGER", referenceLocator: cargoPurl(component.name, component.version), referenceType: "purl" }];
    } else if (component.ecosystem === "npm") {
      result.externalRefs = [{ referenceCategory: "PACKAGE-MANAGER", referenceLocator: npmPurl(component.name, component.version), referenceType: "purl" }];
    }
    return result;
  });
  const relationships = [
    { spdxElementId: "SPDXRef-DOCUMENT", relationshipType: "DESCRIBES", relatedSpdxElement: packageIds.get(root.identity) },
    ...normalizedReactNativeFiles(context).map((file) => ({
      spdxElementId: "SPDXRef-DOCUMENT",
      relationshipType: "DESCRIBES",
      relatedSpdxElement: spdxIdForReactNativeFile(file),
    })),
    ...context.edges.map((edge) => ({
      spdxElementId: packageIds.get(edge.source),
      relationshipType: "DEPENDS_ON",
      relatedSpdxElement: packageIds.get(edge.target),
    })),
  ];
  const node = components.find((component) => component.ecosystem === "cargo" && component.name === "symbol-nem-wallet-core-node");
  const wasm = components.find((component) => component.ecosystem === "cargo" && component.name === "symbol-nem-wallet-core-wasm");
  if (node === undefined || wasm === undefined) fail("SPDX binding packages are missing");
  relationships.push(
    { spdxElementId: packageIds.get(root.identity), relationshipType: "DEPENDS_ON", relatedSpdxElement: packageIds.get(node.identity) },
    { spdxElementId: packageIds.get(root.identity), relationshipType: "DEPENDS_ON", relatedSpdxElement: packageIds.get(wasm.identity) },
  );
  relationships.sort((left, right) => `${left.spdxElementId}|${left.relationshipType}|${left.relatedSpdxElement}`.localeCompare(`${right.spdxElementId}|${right.relationshipType}|${right.relatedSpdxElement}`));
  return {
    SPDXID: "SPDXRef-DOCUMENT",
    creationInfo: {
      created: context.creationTimestamp,
      creators: [`Tool: cargo-sbom-v${CARGO_SBOM_VERSION}`, "Tool: symbol-nem-wallet-core-release-sbom-v1"],
    },
    dataLicense: "CC0-1.0",
    documentNamespace: `https://spdx.org/spdxdocs/symbol-nem-wallet-core-${context.packageVersion}-${context.sourceCommit}`,
    documentDescribes: [packageIds.get(root.identity), ...normalizedReactNativeFiles(context).map(spdxIdForReactNativeFile)],
    files: normalizedReactNativeFiles(context).map((file) => ({
      SPDXID: spdxIdForReactNativeFile(file),
      fileName: file.relative_path,
      checksums: [{ algorithm: "SHA256", checksumValue: file.sha256 }],
      licenseConcluded: "NOASSERTION",
      copyrightText: "NOASSERTION",
    })),
    name: `symbol-nem-wallet-core-${context.packageVersion}`,
    packages,
    relationships,
    spdxVersion: SPDX_VERSION,
  };
}

function componentFromSpdxPackage(packageData, context) {
  const candidates = context.components.filter((component) => component.name === packageData.name && component.version === packageData.versionInfo);
  if (candidates.length !== 1) fail(`SPDX package identity is ambiguous: ${packageData.name}@${packageData.versionInfo}`);
  return candidates[0];
}

function validateSpdxDocument(document, context) {
  exactKeys(document, ["SPDXID", "creationInfo", "dataLicense", "documentNamespace", "documentDescribes", "files", "name", "packages", "relationships", "spdxVersion"], "SPDX document");
  if (document.SPDXID !== "SPDXRef-DOCUMENT" || document.spdxVersion !== SPDX_VERSION || document.dataLicense !== "CC0-1.0") fail("SPDX document identity is invalid");
  const expectedDocument = createSpdxDocument(context);
  if (document.documentNamespace !== expectedDocument.documentNamespace || document.name !== expectedDocument.name) fail("SPDX document identity is not source-derived");
  exactKeys(document.creationInfo, ["created", "creators"], "SPDX creationInfo");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(document.creationInfo.created) || document.creationInfo.created !== context.creationTimestamp) fail("SPDX creation timestamp is not source-derived");
  if (!Array.isArray(document.creationInfo.creators) || JSON.stringify(document.creationInfo.creators) !== JSON.stringify([`Tool: cargo-sbom-v${CARGO_SBOM_VERSION}`, "Tool: symbol-nem-wallet-core-release-sbom-v1"])) fail("SPDX generator identity is invalid");
  if (!Array.isArray(document.packages) || document.packages.length !== context.components.length) fail("SPDX package count differs from the actual runtime closure");
  const ids = new Set([document.SPDXID]);
  const expectedFiles = new Map(expectedDocument.files.map((file) => [file.SPDXID, file]));
  if (!Array.isArray(document.files) || document.files.length !== expectedFiles.size) fail("SPDX React Native file count differs from the release manifest");
  for (const file of document.files) {
    exactKeys(file, ["SPDXID", "fileName", "checksums", "licenseConcluded", "copyrightText"], `SPDX file ${file.fileName ?? "unknown"}`);
    const expectedFile = expectedFiles.get(file.SPDXID);
    if (expectedFile === undefined || JSON.stringify(file) !== JSON.stringify(expectedFile) || ids.has(file.SPDXID)) fail("SPDX React Native file identity differs from the release manifest");
    safeRelativePath(file.fileName, "SPDX React Native file path");
    if (file.licenseConcluded !== "NOASSERTION" || file.copyrightText !== "NOASSERTION") fail("SPDX React Native file legal fields are unexpected");
    ids.add(file.SPDXID);
  }
  const packageById = new Map();
  const packageIdentities = new Set();
  const expectedPackages = new Map(expectedDocument.packages.map((packageData) => [packageData.SPDXID, packageData]));
  for (const packageData of document.packages) {
    const keys = ["SPDXID", "name", "versionInfo", "downloadLocation", "filesAnalyzed", "licenseConcluded", "licenseDeclared", "copyrightText", "packageComment"];
    const optional = ["description", "homepage", "checksums", "externalRefs"];
    exactKeys(packageData, [...keys, ...optional.filter((key) => Object.prototype.hasOwnProperty.call(packageData, key))], `SPDX package ${packageData.name ?? "unknown"}`);
    if (typeof packageData.SPDXID !== "string" || !/^SPDXRef-[A-Za-z0-9.-]+$/.test(packageData.SPDXID) || ids.has(packageData.SPDXID)) fail("SPDX IDs are missing or duplicated");
    const expectedPackage = expectedPackages.get(packageData.SPDXID);
    if (expectedPackage === undefined || JSON.stringify(Object.keys(packageData).sort()) !== JSON.stringify(Object.keys(expectedPackage).sort())) fail("SPDX package fields differ from the canonical output");
    for (const key of Object.keys(expectedPackage)) {
      if (JSON.stringify(packageData[key]) !== JSON.stringify(expectedPackage[key])) fail(`SPDX package field differs from the canonical output: ${packageData.name ?? "unknown"}/${key}`);
    }
    ids.add(packageData.SPDXID);
    packageById.set(packageData.SPDXID, packageData);
    const component = componentFromSpdxPackage(packageData, context);
    const identity = packageIdentityKey(component);
    if (packageIdentities.has(identity)) fail(`SPDX package identity is duplicated: ${identity}`);
    packageIdentities.add(identity);
    validVersion(packageData.versionInfo, `SPDX package version ${packageData.name}`);
    if (packageData.filesAnalyzed !== false || packageData.licenseConcluded !== "NOASSERTION" || packageData.copyrightText !== "NOASSERTION") fail(`SPDX package legal/file fields are unexpected: ${packageData.name}`);
    if (packageData.licenseDeclared !== (component.license_expression ?? "NOASSERTION")) fail(`SPDX license expression differs: ${packageData.name}`);
    if (packageData.licenseDeclared !== "NOASSERTION" && tryParseLicenseExpression(packageData.licenseDeclared).parsed === undefined) fail(`SPDX license expression is invalid: ${packageData.name}`);
    if (packageData.packageComment !== commentForComponent(component)) fail(`SPDX package source comment differs: ${packageData.name}`);
    if (component.ecosystem === "cargo" && component.source.startsWith("registry+")) {
      if (packageData.downloadLocation !== component.source || !Array.isArray(packageData.checksums) || packageData.checksums.length !== 1 || packageData.checksums[0].algorithm !== "SHA256" || packageData.checksums[0].checksumValue !== component.checksum_sha256) fail(`SPDX Cargo package source/checksum differs: ${component.name}`);
    } else if (packageData.downloadLocation !== "NOASSERTION") {
      fail(`SPDX local package download location is not NOASSERTION: ${component.name}`);
    }
    if (component.ecosystem === "npm") {
      if (!Array.isArray(packageData.externalRefs) || packageData.externalRefs.length !== 1 || packageData.externalRefs[0].referenceLocator !== npmPurl(component.name, component.version)) fail("SPDX npm root purl is missing or invalid");
    }
  }
  const rootComponent = context.components.find((component) => component.ecosystem === "npm");
  if (rootComponent === undefined) fail("SPDX npm root component is missing");
  const expectedDescribes = expectedDocument.documentDescribes;
  if (!Array.isArray(document.documentDescribes) || JSON.stringify(document.documentDescribes) !== JSON.stringify(expectedDescribes)) fail("SPDX document described elements are invalid");
  const expectedRelationships = new Set([
    `SPDXRef-DOCUMENT|DESCRIBES|${spdxIdForComponent(rootComponent)}`,
    ...[...expectedFiles.keys()].map((id) => `SPDXRef-DOCUMENT|DESCRIBES|${id}`),
    ...context.edges.map((edge) => `${spdxIdForComponent(context.components.find((component) => component.identity === edge.source))}|DEPENDS_ON|${spdxIdForComponent(context.components.find((component) => component.identity === edge.target))}`),
  ]);
  const node = context.components.find((component) => component.ecosystem === "cargo" && component.name === "symbol-nem-wallet-core-node");
  const wasm = context.components.find((component) => component.ecosystem === "cargo" && component.name === "symbol-nem-wallet-core-wasm");
  expectedRelationships.add(`${spdxIdForComponent(rootComponent)}|DEPENDS_ON|${spdxIdForComponent(node)}`);
  expectedRelationships.add(`${spdxIdForComponent(rootComponent)}|DEPENDS_ON|${spdxIdForComponent(wasm)}`);
  if (!Array.isArray(document.relationships)) fail("SPDX relationships are missing");
  const actualRelationships = new Set();
  for (const relationship of document.relationships) {
    exactKeys(relationship, ["spdxElementId", "relationshipType", "relatedSpdxElement"], "SPDX relationship");
    if (!ids.has(relationship.spdxElementId) || !ids.has(relationship.relatedSpdxElement)) fail("SPDX relationship references an unknown ID");
    const key = `${relationship.spdxElementId}|${relationship.relationshipType}|${relationship.relatedSpdxElement}`;
    if (actualRelationships.has(key)) fail("SPDX relationship is duplicated");
    actualRelationships.add(key);
  }
  if (actualRelationships.size !== expectedRelationships.size || [...expectedRelationships].some((key) => !actualRelationships.has(key))) fail("SPDX dependency relationships do not match the actual closure");
  return true;
}

function validateLicenseInventory(inventory, context) {
  exactKeys(inventory, ["schema_version", "inventory_kind", "package_name", "package_version", "source_commit", "cargo_lock_sha256", "pnpm_lock_sha256", "sbom_file", "npm_runtime_dependency_count", "rust_component_count", "rust_dependency_package_count", "excluded_cargo_packages", "react_native_artifact_manifest", "react_native_artifacts", "components"], "license inventory");
  if (inventory.schema_version !== INVENTORY_SCHEMA_VERSION || inventory.inventory_kind !== "license") fail("license inventory schema is unsupported");
  if (inventory.package_name !== context.packageName || inventory.package_version !== context.packageVersion || inventory.source_commit !== context.sourceCommit) fail("license inventory package/source identity differs");
  if (inventory.cargo_lock_sha256 !== context.cargoLockSha256 || inventory.pnpm_lock_sha256 !== context.pnpmLockSha256 || inventory.sbom_file !== SBOM_FILENAME) fail("license inventory lockfile/SBOM identity differs");
  if (inventory.npm_runtime_dependency_count !== context.npmRuntimeDependencyCount || inventory.rust_component_count !== context.components.filter((component) => component.ecosystem === "cargo").length || inventory.rust_dependency_package_count !== context.components.filter((component) => component.ecosystem === "cargo" && component.source.startsWith("registry+")).length) fail("license inventory dependency counts differ");
  if (JSON.stringify(inventory.excluded_cargo_packages) !== JSON.stringify(context.excludedCargoPackages)) fail("license inventory excluded dependency evidence differs");
  if (JSON.stringify(inventory.react_native_artifact_manifest) !== JSON.stringify(context.reactNativeArtifactManifest ?? null)) fail("license inventory React Native manifest evidence differs");
  if (JSON.stringify(inventory.react_native_artifacts) !== JSON.stringify(context.reactNativeArtifacts ?? [])) fail("license inventory React Native artifact evidence differs");
  if (!Array.isArray(inventory.components) || inventory.components.length !== context.components.length) fail("license inventory component count differs");
  const expected = new Map(context.components.map((component) => [component.identity, component]));
  const actual = new Set();
  for (const component of inventory.components) {
    exactKeys(component, ["ecosystem", "name", "version", "source", "spdx_id", "license_expression", "declared_license_metadata", "generator_license_expression", "license_status", "license_text_status", "license_text_files", "clarification_reason", "license_normalization", "artifact_roles", ...(component.checksum_sha256 === undefined ? [] : ["checksum_sha256"])], `license inventory component ${component.name ?? "unknown"}`);
    const identity = packageIdentityKey(component);
    const expectedComponent = expected.get(identity);
    if (expectedComponent === undefined || actual.has(identity)) fail(`license inventory component identity is missing or duplicated: ${identity}`);
    actual.add(identity);
    validateLicenseNormalization(component.license_normalization, component);
    if (component.spdx_id !== spdxIdForComponent(expectedComponent) || component.license_expression !== expectedComponent.license_expression || component.declared_license_metadata !== expectedComponent.declared_license_metadata || component.generator_license_expression !== expectedComponent.generator_license_expression || component.license_status !== expectedComponent.license_status || component.license_text_status !== expectedComponent.license_text_status || JSON.stringify(component.license_text_files) !== JSON.stringify(expectedComponent.license_text_files) || (component.clarification_reason ?? null) !== (expectedComponent.clarification_reason ?? null) || JSON.stringify(component.license_normalization) !== JSON.stringify(expectedComponent.license_normalization) || JSON.stringify(component.artifact_roles) !== JSON.stringify(expectedComponent.artifact_roles)) fail(`license inventory component metadata differs: ${identity}`);
    if (component.checksum_sha256 !== expectedComponent.checksum_sha256) fail(`license inventory checksum differs: ${identity}`);
    if (component.license_expression !== null) {
      const parsed = tryParseLicenseExpression(component.license_expression);
      if (parsed.parsed === undefined) fail(`${component.ecosystem}:${component.name}@${component.version}: invalid normalized SPDX license expression`);
    }
  }
  if (actual.size !== expected.size) fail("license inventory dependency graph is incomplete");
  return true;
}

function renderSbomSums(sbomPath, inventoryPath) {
  return `${sha256(sbomPath, SBOM_FILENAME)}  ${SBOM_FILENAME}\n${sha256(inventoryPath, INVENTORY_FILENAME)}  ${INVENTORY_FILENAME}\n`;
}

function validateSbomSums(path, sbomPath, inventoryPath) {
  const contents = bytes(path, SBOM_SUMS_FILENAME).toString("utf8");
  if (!contents.endsWith("\n")) fail(`${SBOM_SUMS_FILENAME} must end with one newline`);
  const lines = contents.slice(0, -1).split("\n");
  const expected = [
    { hash: sha256(sbomPath, SBOM_FILENAME), path: SBOM_FILENAME },
    { hash: sha256(inventoryPath, INVENTORY_FILENAME), path: INVENTORY_FILENAME },
  ];
  if (lines.length !== expected.length) fail(`${SBOM_SUMS_FILENAME} has missing or extra entries`);
  for (const [index, line] of lines.entries()) {
    const match = /^([0-9a-f]{64}) {2}([^\s\r\n]+)$/.exec(line);
    if (match === null || match[1] !== expected[index].hash || match[2] !== expected[index].path) fail(`${SBOM_SUMS_FILENAME} entry ${index + 1} is invalid`);
  }
}

function creationTimestamp(sourceCommit) {
  const supplied = process.env.SOURCE_DATE_EPOCH;
  let epoch;
  if (supplied !== undefined) {
    if (!/^\d+$/.test(supplied)) fail("SOURCE_DATE_EPOCH is invalid");
    epoch = Number(supplied);
  } else {
    try {
      epoch = Number(execFileSync("git", ["show", "-s", "--format=%ct", sourceCommit], { cwd: repositoryRoot, encoding: "utf8" }).trim());
    } catch {
      fail("source commit timestamp is unavailable");
    }
  }
  if (!Number.isSafeInteger(epoch) || epoch < 0) fail("source-derived creation timestamp is invalid");
  return new Date(epoch * 1000).toISOString();
}

function createContext({ phase3, packageMetadata, packageRootPath, graph, generatorDocuments, tarballPath }) {
  const cargoDigest = phase3.cargo_lock_sha256;
  const pnpmDigest = phase3.pnpm_lock_sha256;
  if (cargoDigest !== cargoLockSha256() || pnpmDigest !== pnpmLockSha256()) fail("Phase 3 lockfile identity differs from canonical tracked source");
  const lockIndex = cargoLockIndex();
  const generatorExcludedCargoPackages = validateGeneratorCoverage(graph, generatorDocuments, lockIndex);
  const excludedCargoPackagesByIdentity = new Map();
  for (const packageData of graph.allPackages) {
    const identity = cargoIdentityKey(packageData);
    if (graph.packages.some((entry) => cargoIdentityKey(entry.packageData) === identity)) continue;
    excludedCargoPackagesByIdentity.set(identity, {
      name: packageData.name,
      version: packageData.version,
      source: cargoPackageSource(packageData),
      reason: "not reachable through a normal dependency edge for the formal native/WASM target set",
    });
  }
  for (const excluded of generatorExcludedCargoPackages) {
    const identity = `cargo|${excluded.name}|${excluded.version}|${excluded.source}`;
    if (!excludedCargoPackagesByIdentity.has(identity)) excludedCargoPackagesByIdentity.set(identity, excluded);
  }
  const excludedCargoPackages = [...excludedCargoPackagesByIdentity.values()].sort((left, right) => `${left.name}|${left.version}|${left.source}`.localeCompare(`${right.name}|${right.version}|${right.source}`));
  const cargoComponents = buildCargoComponents(graph, lockIndex, phase3.source_commit, cargoDigest);
  const runtimeDependencies = packageMetadata.dependencies ?? {};
  const optionalDependencies = packageMetadata.optionalDependencies ?? {};
  const peerDependencies = packageMetadata.peerDependencies ?? {};
  const npmRuntimeDependencyCount = Object.keys(runtimeDependencies).length + Object.keys(optionalDependencies).length + Object.keys(peerDependencies).length;
  if (npmRuntimeDependencyCount !== 0) fail("npm runtime/optional/peer dependency scope is non-empty and requires explicit SBOM expansion");
  const rootLicense = typeof packageMetadata.license === "string" ? packageMetadata.license : null;
  const rootText = rootLicense === null ? { status: "missing", files: [], reason: "npm package license metadata is missing" } : packageLicenseFiles({ source: "npm", manifest_path: resolve(packageRootPath, "package.json"), name: packageMetadata.name, version: packageMetadata.version }, rootLicense);
  const rootParsed = rootLicense === null ? { parsed: undefined, error: "npm package license metadata is missing" } : tryParseLicenseExpression(rootLicense);
  const rootComponent = {
    ecosystem: "npm",
    name: packageMetadata.name,
    version: packageMetadata.version,
    source: "path:packages/wallet-core",
    license_expression: rootParsed.parsed === undefined ? null : rootLicense,
    declared_license_metadata: rootLicense,
    generator_license_expression: null,
    license_status: rootParsed.parsed === undefined ? (rootLicense === null ? "missing" : "unknown") : licenseStatus(rootLicense),
    license_text_status: rootText.status,
    license_text_files: rootText.files,
    artifact_roles: ["npm-package"],
    license_normalization: { applied: false, basis: null },
    checksum_sha256: phase3.npm_tarball.sha256,
    source_commit: phase3.source_commit,
    cargo_lock_sha256: cargoDigest,
    clarification_reason: rootText.reason ?? null,
  };
  rootComponent.identity = packageIdentityKey(rootComponent);
  const components = [rootComponent, ...cargoComponents];
  const edgeSet = new Map(graph.edges.map((edge) => [`${edge.source}\n${edge.target}`, edge]));
  const node = cargoComponents.find((component) => component.name === "symbol-nem-wallet-core-node");
  const wasm = cargoComponents.find((component) => component.name === "symbol-nem-wallet-core-wasm");
  if (node === undefined || wasm === undefined) fail("actual Cargo graph does not contain both shipped bindings");
  return {
    packageName: phase3.package_name,
    packageVersion: phase3.package_version,
    sourceCommit: phase3.source_commit,
    cargoLockSha256: cargoDigest,
    pnpmLockSha256: pnpmDigest,
    npmRuntimeDependencyCount,
    components,
    edges: [...edgeSet.values()],
    excludedCargoPackages,
    reactNativeArtifactManifest: phase3.react_native.artifact_manifest,
    reactNativeArtifacts: phase3.react_native.artifacts,
    creationTimestamp: creationTimestamp(phase3.source_commit),
    tarballPath,
  };
}

function phase3Input(paths) {
  return {
    manifestPath: paths.releaseManifestPath,
    sha256sumsPath: paths.releaseSha256sumsPath,
    sourceEvidencePath: paths.sourceEvidencePath,
    nativeSummaryPath: paths.nativeSummaryPath,
    nativeEvidenceRoot: paths.nativeEvidenceRoot,
    reactNativeSummaryPath: paths.reactNativeSummaryPath,
    reactNativeEvidenceRoot: paths.reactNativeEvidenceRoot,
    reactNativeArtifactRoot: paths.reactNativeArtifactRoot,
    wasmSummaryPath: paths.wasmSummaryPath,
    wasmEvidencePath: paths.wasmEvidencePath,
    wasmBindgenEvidencePath: paths.wasmBindgenEvidencePath,
    wasmSourcePath: paths.wasmSourcePath,
    packageRoot: paths.packageRoot,
    tarballPath: paths.tarballPath,
  };
}

function validateAndLoad(paths) {
  const phase3 = validateReleaseManifest(phase3Input(paths));
  if (phase3.package_name !== NPM_PACKAGE_NAME || phase3.package_version !== packageMetadataFromRoot(paths.packageRoot).version) fail("Phase 3 package identity differs from npm metadata");
  const metadataInputs = new Map();
  for (const target of NATIVE_TARGET_TRIPLES) metadataInputs.set(target, paths.cargoMetadata.get(target));
  const graph = collectCargoGraph(metadataInputs);
  const generatorDocuments = {
    node: parseCargoSbom(paths.cargoSbom.get("node"), "node"),
    wasm: parseCargoSbom(paths.cargoSbom.get("wasm"), "wasm"),
  };
  const context = createContext({ phase3, packageMetadata: packageMetadataFromRoot(paths.packageRoot), packageRootPath: paths.packageRoot, graph, generatorDocuments, tarballPath: paths.tarballPath });
  return { phase3, graph, generatorDocuments, context };
}

function validateOutputs(paths, context) {
  const document = json(paths.sbomPath, "SPDX SBOM");
  const inventory = json(paths.inventoryPath, "license inventory");
  validateSpdxDocument(document, context);
  validateLicenseInventory(inventory, context);
  validateSbomSums(paths.sbomSha256sumsPath, paths.sbomPath, paths.inventoryPath);
}

function argumentValue(argv, name, required = true) {
  const index = argv.indexOf(name);
  if (index < 0) {
    if (!required) return undefined;
    fail(`missing ${name}`);
  }
  if (argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing value for ${name}`);
  return argv[index + 1];
}

function pairArguments(argv, name) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== name) continue;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`missing value for ${name}`);
    const separator = value.indexOf("=");
    if (separator <= 0 || separator === value.length - 1) fail(`${name} must be key=path`);
    values.push([value.slice(0, separator), resolve(repositoryRoot, value.slice(separator + 1))]);
    index += 1;
  }
  return new Map(values.map(([key, path]) => {
    if (values.filter(([candidate]) => candidate === key).length !== 1) fail(`duplicate ${name} key: ${key}`);
    return [key, path];
  }));
}

function pathsFromArguments(argv) {
  const metadataEntries = pairArguments(argv, "--cargo-metadata");
  const cargoSbomEntries = pairArguments(argv, "--cargo-sbom");
  if (metadataEntries.size !== NATIVE_TARGET_TRIPLES.length || NATIVE_TARGET_TRIPLES.some((target) => !metadataEntries.has(target))) fail("exact target-filtered Cargo metadata inputs are required");
  if (cargoSbomEntries.size !== 2 || !cargoSbomEntries.has("node") || !cargoSbomEntries.has("wasm")) fail("node and wasm cargo-sbom inputs are required");
  const path = (name, fallback) => resolve(repositoryRoot, argumentValue(argv, name, fallback === undefined));
  const packagePath = path("--package-root", "packages/wallet-core");
  const tarballPath = path("--tarball");
  return {
    sourceEvidencePath: path("--source-evidence"),
    nativeSummaryPath: path("--native-summary"),
    nativeEvidenceRoot: path("--native-evidence-root"),
    reactNativeSummaryPath: path("--react-native-summary"),
    reactNativeEvidenceRoot: path("--react-native-evidence-root"),
    reactNativeArtifactRoot: path("--react-native-artifact-root"),
    wasmSummaryPath: path("--wasm-summary"),
    wasmEvidencePath: path("--wasm-evidence"),
    wasmBindgenEvidencePath: path("--wasm-bindgen-evidence"),
    wasmSourcePath: path("--wasm-source"),
    packageRoot: packagePath,
    tarballPath,
    releaseManifestPath: path("--release-manifest"),
    releaseSha256sumsPath: path("--release-sha256sums"),
    sbomPath: path("--sbom"),
    inventoryPath: path("--inventory"),
    sbomSha256sumsPath: path("--sbom-sha256sums"),
    cargoMetadata: metadataEntries,
    cargoSbom: cargoSbomEntries,
  };
}

function run() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (command !== "generate" && command !== "validate") fail("usage: generate | validate");
  const paths = pathsFromArguments(argv.slice(1));
  const loaded = validateAndLoad(paths);
  if (command === "generate") {
    const document = createSpdxDocument(loaded.context);
    const inventory = createLicenseInventory(loaded.context);
    writeJson(paths.sbomPath, document);
    writeJson(paths.inventoryPath, inventory);
    writeFileSync(paths.sbomSha256sumsPath, renderSbomSums(paths.sbomPath, paths.inventoryPath));
  }
  validateOutputs(paths, loaded.context);
  process.stdout.write(`${JSON.stringify({
    sbom: paths.sbomPath,
    inventory: paths.inventoryPath,
    sbom_sha256sums: paths.sbomSha256sumsPath,
    package_count: loaded.context.components.length,
    rust_dependency_package_count: loaded.context.components.filter((component) => component.ecosystem === "cargo" && component.source.startsWith("registry+")).length,
    npm_runtime_dependency_count: loaded.context.npmRuntimeDependencyCount,
    excluded_cargo_package_count: loaded.context.excludedCargoPackages.length,
  })}\n`);
}

export {
  CARGO_SBOM_VERSION,
  INVENTORY_FILENAME,
  INVENTORY_SCHEMA_VERSION,
  SBOM_FILENAME,
  SBOM_SUMS_FILENAME,
  SPDX_VERSION,
  SPDX_LICENSE_IDENTIFIER_CATALOGUE,
  SPDX_EXCEPTION_IDENTIFIER_CATALOGUE,
  createLicenseInventory,
  createSpdxDocument,
  buildCargoComponents,
  cargoLockIndex,
  collectCargoGraph,
  parseCargoSbom,
  packageIdentityKey,
  parseLicenseExpression,
  parseLicenseExpressionSyntax,
  renderSbomSums,
  validateGeneratorCoverage,
  validateLicenseInventory,
  validateSpdxDocument,
  validateSbomSums,
};

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

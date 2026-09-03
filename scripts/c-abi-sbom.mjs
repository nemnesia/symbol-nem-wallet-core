import { createHash } from "node:crypto";
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
  C_ABI_TARGET_ORDER,
  C_ABI_TARGETS,
} from "./c-abi-targets.mjs";
import {
  APPROVED_EXCEPTION_ALLOWLIST,
  LICENSE_POLICY_ALLOWLIST,
  evaluateLicenseExpression,
} from "./release-license-policy.mjs";
import {
  parseLicenseExpression,
  SPDX_EXCEPTION_IDENTIFIER_CATALOGUE,
  SPDX_LICENSE_IDENTIFIER_CATALOGUE,
} from "./release-sbom.mjs";
import {
  collectReleaseVersionSources,
  isValidCommit,
  isValidSemVer,
  parseSemVer,
} from "./release-identity.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SPDX_VERSION = "SPDX-2.3";
const SCHEMA_VERSION = 1;
const CREATED = "1970-01-01T00:00:00.000Z";
const C_ABI_PACKAGE_NAME = "symbol-nem-wallet-core-native";
const NPM_PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";
const PROJECT_NAME = "symbol-nem-wallet-core";
const SBOM_FILENAME = "c-abi-sbom.spdx.json";
const INVENTORY_FILENAME = "c-abi-license-inventory.json";
const SBOM_SUMS_FILENAME = "C-ABI-SBOM-SHA256SUMS";
const POLICY_FILENAME = "c-abi-license-policy.json";
const THIRD_PARTY_FILENAME = "c-abi-third-party-licenses.json";
const POLICY_SUMS_FILENAME = "C-ABI-LICENSE-POLICY-SHA256SUMS";
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const MODE_VALUES = new Set(["candidate", "release"]);
const REGISTRY_PREFIX = "registry+";

function fail(message) {
  throw new Error(`C ABI SBOM gate failed: ${message}`);
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

function canonicalCargoLockBytes() {
  try {
    return readFileSync(resolve(repositoryRoot, "Cargo.lock"));
  } catch {
    fail("Cargo.lock is unavailable");
  }
}

function cargoLockDigest() {
  return sha256Bytes(canonicalCargoLockBytes());
}

function cargoLockIndex() {
  const records = [];
  const contents = canonicalCargoLockBytes().toString("utf8");
  for (const match of contents.matchAll(/\[\[package\]\]\r?\n([\s\S]*?)(?=\r?\n\[\[package\]\]|\s*$)/g)) {
    const block = match[1];
    const field = (name) => new RegExp(`^${name} = "([^"]+)"$`, "m").exec(block)?.[1];
    const name = field("name");
    const version = field("version");
    const source = field("source");
    const checksum = field("checksum");
    if (name !== undefined && version !== undefined && source !== undefined) records.push({ name, version, source, checksum });
  }
  const index = new Map();
  for (const record of records) {
    const key = `cargo|${record.name}|${record.version}|${record.source}`;
    if (index.has(key)) fail(`Cargo.lock contains duplicate package identity: ${key}`);
    index.set(key, record);
  }
  return index;
}

function safeRelative(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.includes("\n") || value.includes("\r") || value.startsWith("/") || value.split("/").some((part) => part === "" || part === "." || part === "..")) fail(`${label} is not a safe relative path`);
}

function cargoSource(packageData) {
  if (typeof packageData.source === "string" && packageData.source.length > 0) return packageData.source;
  if (typeof packageData.manifest_path !== "string") fail(`Cargo path package has no manifest path: ${packageData.name}`);
  const path = relative(repositoryRoot, dirname(packageData.manifest_path)).replaceAll("\\", "/");
  if (path.length === 0 || path.startsWith("..")) fail(`Cargo path package is outside the checked out source: ${packageData.name}`);
  return `path:${path}`;
}

function packageIdentity(packageData) {
  return `cargo|${packageData.name}|${packageData.version}|${cargoSource(packageData)}`;
}

function targetMetadata(metadataInputs, targetId) {
  const target = C_ABI_TARGETS[targetId];
  const metadata = metadataInputs.get(target.rust_target);
  if (metadata === undefined || !isPlainObject(metadata) || metadata.version !== 1 || !Array.isArray(metadata.packages) || !isPlainObject(metadata.resolve) || !Array.isArray(metadata.resolve.nodes)) fail(`Cargo metadata is missing or malformed: ${targetId}`);
  return metadata;
}

function normalRuntimeDependency(dependency) {
  return Array.isArray(dependency.dep_kinds) && dependency.dep_kinds.some((kind) => kind.kind === null);
}

function collectRuntimeGraph(metadataInputs) {
  const packages = new Map();
  const edges = new Map();
  const targetClosures = [];
  for (const targetId of C_ABI_TARGET_ORDER) {
    const metadata = targetMetadata(metadataInputs, targetId);
    const byId = new Map(metadata.packages.map((packageData) => [packageData.id, packageData]));
    const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
    const roots = metadata.packages.filter((packageData) => packageData.name === C_ABI_PACKAGE_NAME);
    if (roots.length !== 1) fail(`C ABI Cargo root is ambiguous: ${targetId}`);
    const root = roots[0];
    if (!nodes.has(root.id)) fail(`C ABI Cargo root has no resolve node: ${targetId}`);
    const stack = [root.id];
    const visited = new Set();
    const closure = new Set();
    const targetEdges = new Set();
    while (stack.length > 0) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      const packageData = byId.get(id);
      const node = nodes.get(id);
      if (packageData === undefined || node === undefined) fail(`Cargo runtime graph references an unknown package: ${targetId}`);
      const identity = packageIdentity(packageData);
      closure.add(identity);
      const current = packages.get(identity) ?? { packageData, targetIds: new Set() };
      if (current.packageData.name !== packageData.name || current.packageData.version !== packageData.version) fail(`Cargo package identity is inconsistent: ${identity}`);
      current.targetIds.add(targetId);
      packages.set(identity, current);
      for (const dependency of node.deps ?? []) {
        if (!normalRuntimeDependency(dependency)) continue;
        const dependencyData = byId.get(dependency.pkg);
        if (dependencyData === undefined) fail(`Cargo runtime graph references an unknown dependency: ${targetId}`);
        const dependencyIdentity = packageIdentity(dependencyData);
        const edgeKey = `${identity}\n${dependencyIdentity}`;
        edges.set(edgeKey, { source: identity, target: dependencyIdentity });
        targetEdges.add(edgeKey);
        stack.push(dependency.pkg);
      }
    }
    targetClosures.push({
      target_id: targetId,
      rust_target: C_ABI_TARGETS[targetId].rust_target,
      component_identities: [...closure].sort(),
      edges: [...targetEdges].sort(),
    });
  }
  return {
    packages: [...packages.values()].sort((left, right) => packageIdentity(left.packageData).localeCompare(packageIdentity(right.packageData))),
    edges: [...edges.values()].sort((left, right) => `${left.source}\n${left.target}`.localeCompare(`${right.source}\n${right.target}`)),
    targetClosures,
  };
}

function licenseNormalization(packageData, raw) {
  if (
    packageData.name === "curve25519-dalek-derive" &&
    packageData.version === "0.1.1" &&
    raw === "MIT/Apache-2.0" &&
    packageData.repository === "https://github.com/dalek-cryptography/curve25519-dalek" &&
    typeof packageData.manifest_path === "string" &&
    existsSync(resolve(dirname(packageData.manifest_path), "LICENSE-APACHE")) &&
    existsSync(resolve(dirname(packageData.manifest_path), "LICENSE-MIT"))
  ) {
    return {
      expression: "MIT OR Apache-2.0",
      normalization: {
        applied: true,
        basis: {
          type: "upstream-package-metadata-and-license-files",
          repository: packageData.repository,
          declared_license_metadata: raw,
          license_text_files: ["LICENSE-APACHE", "LICENSE-MIT"],
          normalized_spdx_expression: "MIT OR Apache-2.0",
        },
      },
    };
  }
  if (raw === null) return { expression: null, normalization: { applied: false, basis: null } };
  try {
    parseLicenseExpression(raw);
    return { expression: raw, normalization: { applied: false, basis: null } };
  } catch {
    return { expression: null, normalization: { applied: false, basis: null } };
  }
}

function licenseFiles(packageData, expression) {
  if (expression === null) return { status: "unavailable", files: [], reason: "Cargo package license metadata is not a valid SPDX expression" };
  if (typeof packageData.manifest_path !== "string") return { status: "unavailable", files: [], reason: "Cargo package manifest path is unavailable" };
  const sourceDirectory = typeof packageData.source === "string" ? dirname(packageData.manifest_path) : repositoryRoot;
  let entries;
  try {
    entries = readdirSync(sourceDirectory, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return { status: "unavailable", files: [], reason: "Cargo package source directory is unavailable" };
  }
  const available = entries.filter((entry) => /^(license|copying|unlicense|notice)(?:[-_.].*)?$/i.test(entry));
  let identifiers;
  try {
    identifiers = parseLicenseExpression(expression).identifiers;
  } catch {
    return { status: "unavailable", files: [], reason: "SPDX expression is invalid" };
  }
  const selected = [];
  const used = new Set();
  const generic = available.filter((entry) => /^(license|copying|unlicense|notice)$/i.test(entry));
  const namesFor = {
    "Apache-2.0": ["LICENSE-APACHE", "LICENSE-APACHE-2.0"],
    "BSD-3-Clause": ["LICENSE-BSD-3-CLAUSE", "LICENSE"],
    "CC0-1.0": ["LICENSE-CC0", "LICENSE"],
    ISC: ["LICENSE-ISC", "LICENSE"],
    MIT: ["LICENSE-MIT", "LICENSE"],
    "Unicode-3.0": ["LICENSE-UNICODE"],
    Unlicense: ["UNLICENSE"],
    Zlib: ["LICENSE-ZLIB"],
  };
  for (const identifier of identifiers) {
    const names = namesFor[identifier] ?? [];
    const explicitNames = names.filter((name) => name !== "LICENSE");
    let matches = available.filter((entry) => explicitNames.some((name) => entry.toLowerCase() === name.toLowerCase() || entry.toLowerCase() === `${name.toLowerCase()}.md`));
    if (matches.length === 0 && explicitNames.length === 0) matches = available.filter((entry) => entry.toLowerCase() === "license");
    if (matches.length === 0 && identifiers.length === 1 && generic.length === 1) matches = generic;
    if (matches.length === 0) return { status: "missing", files: [], reason: `no source license text for ${identifier}` };
    if (matches.length > 1) return { status: "ambiguous", files: [], reason: `multiple source license texts for ${identifier}` };
    const filename = matches[0];
    if (used.has(filename)) continue;
    used.add(filename);
    const path = resolve(sourceDirectory, filename);
    selected.push({ path: filename, sha256: sha256File(path, `license text ${packageData.name}/${filename}`) });
  }
  return { status: "resolved", files: selected.sort((left, right) => left.path.localeCompare(right.path)) };
}

function componentData(entry, lockIndex, sourceCommit) {
  const packageData = entry.packageData;
  const source = cargoSource(packageData);
  const raw = typeof packageData.license === "string" ? packageData.license : null;
  const license = licenseNormalization(packageData, raw);
  const text = licenseFiles(packageData, license.expression);
  const identity = packageIdentity(packageData);
  const result = {
    ecosystem: "cargo",
    name: packageData.name,
    version: packageData.version,
    source,
    spdx_id: spdxIdFor(identity),
    license_expression: license.expression,
    declared_license_metadata: raw,
    generator_license_expression: license.expression,
    license_status: license.expression === null ? (raw === null ? "missing" : "unknown") : "resolved",
    license_text_status: text.status,
    license_text_files: text.files,
    clarification_reason: text.reason ?? null,
    license_normalization: license.normalization,
    artifact_roles: ["c-abi-runtime"],
    target_ids: [...entry.targetIds].sort(),
    source_commit: sourceCommit,
    cargo_lock_sha256: cargoLockDigest(),
  };
  if (typeof packageData.source === "string") {
    const lock = lockIndex.get(identity);
    if (lock === undefined || typeof lock.checksum !== "string" || !HASH_PATTERN.test(lock.checksum)) fail(`Cargo.lock checksum is missing: ${identity}`);
    result.checksum_sha256 = lock.checksum;
  }
  return result;
}

function spdxIdFor(identity) {
  return `SPDXRef-Package-${createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
}

function componentPurl(component) {
  return `pkg:cargo/${component.name}@${component.version}`;
}

function commentFor(component) {
  return `source=${component.source}; source_commit=${component.source_commit}; cargo_lock_sha256=${component.cargo_lock_sha256}; target_ids=${component.target_ids.join(",")}; artifact_roles=${component.artifact_roles.join(",")}; declared_license_metadata=${component.declared_license_metadata ?? "MISSING"}`;
}

function createSpdxDocument(context) {
  const components = [...context.components].sort((left, right) => `${left.name}|${left.version}|${left.source}`.localeCompare(`${right.name}|${right.version}|${right.source}`));
  const packageIds = new Map(components.map((component) => [`cargo|${component.name}|${component.version}|${component.source}`, component.spdx_id]));
  const root = components.find((component) => component.name === C_ABI_PACKAGE_NAME && component.source === "path:crates/c-abi");
  if (root === undefined) fail("C ABI SBOM root is missing");
  const packages = components.map((component) => {
    const item = {
      SPDXID: component.spdx_id,
      name: component.name,
      versionInfo: component.version,
      downloadLocation: component.source.startsWith(REGISTRY_PREFIX) ? component.source : "NOASSERTION",
      filesAnalyzed: false,
      licenseConcluded: "NOASSERTION",
      licenseDeclared: component.license_expression ?? "NOASSERTION",
      copyrightText: "NOASSERTION",
      packageComment: commentFor(component),
    };
    if (typeof context.packageDescriptions.get(`${component.name}|${component.version}|${component.source}`) === "string") item.description = context.packageDescriptions.get(`${component.name}|${component.version}|${component.source}`);
    if (component.source.startsWith(REGISTRY_PREFIX)) {
      item.checksums = [{ algorithm: "SHA256", checksumValue: component.checksum_sha256 }];
      item.externalRefs = [{ referenceCategory: "PACKAGE-MANAGER", referenceLocator: componentPurl(component), referenceType: "purl" }];
    }
    return item;
  });
  const relationships = [
    { spdxElementId: "SPDXRef-DOCUMENT", relationshipType: "DESCRIBES", relatedSpdxElement: root.spdx_id },
    ...context.edges.map((edge) => ({ spdxElementId: packageIds.get(edge.source), relationshipType: "DEPENDS_ON", relatedSpdxElement: packageIds.get(edge.target) })),
  ].sort((left, right) => `${left.spdxElementId}|${left.relationshipType}|${left.relatedSpdxElement}`.localeCompare(`${right.spdxElementId}|${right.relationshipType}|${right.relatedSpdxElement}`));
  return {
    SPDXID: "SPDXRef-DOCUMENT",
    creationInfo: { created: CREATED, creators: ["Tool: cargo-metadata", "Tool: symbol-nem-wallet-core-c-abi-sbom-v1"] },
    dataLicense: "CC0-1.0",
    documentNamespace: `https://spdx.org/spdxdocs/symbol-nem-wallet-core-c-abi-${context.packageVersion}-${context.sourceCommit}`,
    documentDescribes: [root.spdx_id],
    name: `symbol-nem-wallet-core-c-abi-${context.packageVersion}`,
    packages,
    relationships,
    spdxVersion: SPDX_VERSION,
  };
}

function createInventory(context) {
  return {
    schema_version: SCHEMA_VERSION,
    inventory_kind: "c-abi-license",
    project_name: PROJECT_NAME,
    package_name: C_ABI_PACKAGE_NAME,
    npm_package_name: NPM_PACKAGE_NAME,
    package_version: context.packageVersion,
    mode: context.mode,
    release_tag: context.releaseTag,
    source_commit: context.sourceCommit,
    cargo_lock_sha256: context.cargoLockSha256,
    sbom_file: SBOM_FILENAME,
    runtime_dependency_policy: "normal Cargo dependencies only; dev and test dependencies excluded",
    target_closures: context.targetClosures,
    components: context.components.map((component) => {
      const result = { ...component };
      delete result.source_commit;
      delete result.cargo_lock_sha256;
      return result;
    }),
  };
}

function evaluatePolicy(inventory, sbom) {
  const entries = inventory.components.map((component) => {
    let evaluation;
    if (component.declared_license_metadata === null || component.declared_license_metadata.length === 0) {
      evaluation = { status: "missing-declared-metadata", reason_codes: ["missing-declared-metadata"], identifiers: [], exceptions: [], expression_tree: null };
    } else if (component.license_expression === null) {
      const raw = evaluateLicenseExpression(component.declared_license_metadata);
      evaluation = raw.status === "invalid-metadata"
        ? { ...raw, status: "invalid-metadata" }
        : { ...raw, status: "invalid-metadata", reason_codes: ["missing-normalized-license-expression"] };
    } else {
      evaluation = evaluateLicenseExpression(component.license_expression);
    }
    return {
      ecosystem: component.ecosystem,
      name: component.name,
      version: component.version,
      source: component.source,
      spdx_id: component.spdx_id,
      target_ids: component.target_ids,
      declared_license_metadata: component.declared_license_metadata,
      license_expression: component.license_expression,
      policy_status: evaluation.status,
      reason_codes: evaluation.reason_codes,
      identifiers: evaluation.identifiers,
      exceptions: evaluation.exceptions,
      expression_tree: evaluation.expression_tree,
      license_text_status: component.license_text_status,
      license_text_files: component.license_text_files,
      error: evaluation.error,
    };
  }).sort((left, right) => `${left.name}|${left.version}|${left.source}`.localeCompare(`${right.name}|${right.version}|${right.source}`));
  const gateStatus = entries.some((entry) => ["invalid-metadata", "missing-declared-metadata"].includes(entry.policy_status))
    ? "FAIL"
    : entries.some((entry) => entry.policy_status === "needs-user-decision") ? "NEEDS USER DECISION" : "PASS";
  return {
    schema_version: SCHEMA_VERSION,
    artifact_kind: "c-abi-license-policy",
    project_name: PROJECT_NAME,
    package_name: C_ABI_PACKAGE_NAME,
    npm_package_name: NPM_PACKAGE_NAME,
    package_version: inventory.package_version,
    mode: inventory.mode,
    release_tag: inventory.release_tag,
    source_commit: inventory.source_commit,
    inventory_file: INVENTORY_FILENAME,
    inventory_sha256: null,
    sbom_file: SBOM_FILENAME,
    sbom_sha256: null,
    gate_status: gateStatus,
    policy: {
      allowlist: [...LICENSE_POLICY_ALLOWLIST],
      approved_exceptions: [...APPROVED_EXCEPTION_ALLOWLIST],
      syntax_catalogue: [...SPDX_LICENSE_IDENTIFIER_CATALOGUE].sort(),
      exception_catalogue: [...SPDX_EXCEPTION_IDENTIFIER_CATALOGUE].sort(),
      expression_rule: "Every license identifier and exception in the SPDX expression must be approved; OR order is not significant.",
    },
    components: entries,
    needs_user_decision: entries.filter((entry) => entry.policy_status === "needs-user-decision").flatMap((entry) => entry.reason_codes.map((reason) => ({ component: `${entry.ecosystem}|${entry.name}|${entry.version}|${entry.source}`, reason }))),
    invalid_metadata: entries.filter((entry) => ["invalid-metadata", "missing-declared-metadata"].includes(entry.policy_status)).map((entry) => ({ component: `${entry.ecosystem}|${entry.name}|${entry.version}|${entry.source}`, status: entry.policy_status, reason_codes: entry.reason_codes })),
    license_text_missing_observations: entries.filter((entry) => entry.license_text_status !== "resolved").map((entry) => ({ component: `${entry.ecosystem}|${entry.name}|${entry.version}|${entry.source}`, status: entry.license_text_status, files: entry.license_text_files })),
    third_party_license_artifact: THIRD_PARTY_FILENAME,
  };
}

function createThirdPartyEvidence(inventory, components, inventorySha256) {
  const thirdParty = components.filter((component) => component.source.startsWith(REGISTRY_PREFIX)).map((component) => {
    const item = {
      ecosystem: component.ecosystem,
      name: component.name,
      version: component.version,
      source: component.source,
      spdx_id: component.spdx_id,
      target_ids: component.target_ids,
      license_expression: component.license_expression,
      license_text_status: component.license_text_status,
      license_text_files: component.license_text_files,
      collection_status: component.license_text_status === "resolved" ? "available" : "pending-source-evidence",
    };
    if (component.license_text_status === "resolved") {
      item.license_texts = component.license_text_files.map((file) => {
        const metadataPath = components.find((candidate) => candidate.spdx_id === component.spdx_id)?.manifest_path;
        if (typeof metadataPath !== "string") fail(`third-party source path is unavailable: ${component.name}`);
        const path = resolve(dirname(metadataPath), file.path);
        if (!existsSync(path) || sha256File(path, `third-party license text ${component.name}/${file.path}`) !== file.sha256) fail(`third-party license text hash mismatch: ${component.name}/${file.path}`);
        return { path: file.path, sha256: file.sha256, text: readFileSync(path, "utf8") };
      });
    }
    return item;
  }).sort((left, right) => `${left.name}|${left.version}|${left.source}`.localeCompare(`${right.name}|${right.version}|${right.source}`));
  const complete = thirdParty.every((component) => component.collection_status === "available");
  const collected = thirdParty.length === 0 || thirdParty.every((component) => Array.isArray(component.license_texts));
  return {
    schema_version: SCHEMA_VERSION,
    artifact_kind: "c-abi-third-party-license-notice-evidence",
    project_name: PROJECT_NAME,
    package_name: C_ABI_PACKAGE_NAME,
    npm_package_name: NPM_PACKAGE_NAME,
    package_version: inventory.package_version,
    mode: inventory.mode,
    release_tag: inventory.release_tag,
    source_commit: inventory.source_commit,
    inventory_file: INVENTORY_FILENAME,
    inventory_sha256: inventorySha256,
    collection_status: complete ? "complete" : "incomplete",
    text_content_status: thirdParty.length === 0 ? "not-applicable" : collected ? "collected" : "not-collected",
    final_release_text_gate: {
      required: true,
      status: complete && collected ? "ready" : "pending",
      enforcement: "c-abi-sbom.mjs validate --require-third-party-license-text",
    },
    legal_obligation_determination: "not-performed",
    components: thirdParty,
  };
}

function contextFromMetadata({ metadataInputs, packageVersion, sourceCommit, mode, releaseTag }) {
  if (!isValidSemVer(packageVersion) || !isValidCommit(sourceCommit) || !MODE_VALUES.has(mode)) fail("C ABI SBOM identity is invalid");
  if (mode === "release") {
    if (parseSemVer(packageVersion).prerelease !== null || releaseTag !== `v${packageVersion}`) fail("formal C ABI SBOM tag/version identity is invalid");
  } else if (releaseTag !== null) fail("candidate C ABI SBOM must not contain a release tag");
  const versions = collectReleaseVersionSources({ root: repositoryRoot });
  for (const version of Object.values(versions)) if (version.version !== packageVersion) fail(`release version mismatch: ${version.relative_path}`);
  const graph = collectRuntimeGraph(metadataInputs);
  const roots = graph.packages.filter((entry) => entry.packageData.name === C_ABI_PACKAGE_NAME);
  if (roots.length !== 1 || roots[0].packageData.version !== packageVersion) fail("C ABI Cargo root version differs from the release version");
  const lockIndex = cargoLockIndex();
  const components = graph.packages.map((entry) => ({ ...componentData(entry, lockIndex, sourceCommit), packageData: entry.packageData, manifest_path: entry.packageData.manifest_path }));
  const packageDescriptions = new Map(components.map((component) => [`${component.name}|${component.version}|${component.source}`, typeof component.packageData.description === "string" ? component.packageData.description.trim() : undefined]));
  const publicComponents = components.map((component) => {
    const result = { ...component };
    delete result.packageData;
    delete result.manifest_path;
    return result;
  });
  const byIdentity = new Map(publicComponents.map((component) => [`cargo|${component.name}|${component.version}|${component.source}`, component]));
  const context = {
    packageVersion,
    sourceCommit,
    mode,
    releaseTag,
    cargoLockSha256: cargoLockDigest(),
    components: publicComponents,
    edges: graph.edges,
    targetClosures: graph.targetClosures,
    packageDescriptions,
    metadataComponents: components,
  };
  if (!byIdentity.has(`cargo|${C_ABI_PACKAGE_NAME}|${packageVersion}|path:crates/c-abi`)) fail("C ABI SBOM root identity is invalid");
  return context;
}

function renderSums(sbomPath, inventoryPath) {
  return `${sha256File(sbomPath, SBOM_FILENAME)}  ${SBOM_FILENAME}\n${sha256File(inventoryPath, INVENTORY_FILENAME)}  ${INVENTORY_FILENAME}\n`;
}

function renderPolicySums(policyPath, thirdPartyPath) {
  return `${sha256File(policyPath, POLICY_FILENAME)}  ${POLICY_FILENAME}\n${sha256File(thirdPartyPath, THIRD_PARTY_FILENAME)}  ${THIRD_PARTY_FILENAME}\n`;
}

function createCAbiEvidence(context) {
  const sbom = createSpdxDocument(context);
  const inventory = createInventory(context);
  const policy = evaluatePolicy(inventory, sbom);
  policy.inventory_sha256 = sha256Bytes(Buffer.from(`${JSON.stringify(inventory, null, 2)}\n`));
  policy.sbom_sha256 = sha256Bytes(Buffer.from(`${JSON.stringify(sbom, null, 2)}\n`));
  const thirdParty = createThirdPartyEvidence(inventory, context.metadataComponents, policy.inventory_sha256);
  return { sbom, inventory, policy, thirdParty };
}

function validateCAbiEvidenceIdentity({ sbom, inventory, policy, thirdParty, packageVersion, sourceCommit, mode, releaseTag }) {
  if (sbom?.SPDXID !== "SPDXRef-DOCUMENT" || sbom.spdxVersion !== SPDX_VERSION || !Array.isArray(sbom.packages) || !Array.isArray(sbom.relationships)) fail("C ABI SBOM document identity is invalid");
  for (const [label, document] of [["inventory", inventory], ["policy", policy], ["third-party", thirdParty]]) {
    if (!isPlainObject(document) || document.package_version !== packageVersion || document.source_commit !== sourceCommit || document.mode !== mode || document.release_tag !== releaseTag || document.package_name !== C_ABI_PACKAGE_NAME || document.npm_package_name !== NPM_PACKAGE_NAME) fail(`C ABI ${label} identity mismatch`);
  }
  if (inventory.schema_version !== SCHEMA_VERSION || inventory.inventory_kind !== "c-abi-license" || inventory.sbom_file !== SBOM_FILENAME || !Array.isArray(inventory.components) || !Array.isArray(inventory.target_closures)) fail("C ABI license inventory shape is invalid");
  if (policy.schema_version !== SCHEMA_VERSION || policy.artifact_kind !== "c-abi-license-policy" || !["PASS", "FAIL", "NEEDS USER DECISION"].includes(policy.gate_status)) fail("C ABI license policy shape is invalid");
  if (thirdParty.schema_version !== SCHEMA_VERSION || thirdParty.artifact_kind !== "c-abi-third-party-license-notice-evidence" || !Array.isArray(thirdParty.components)) fail("C ABI third-party evidence shape is invalid");
}

function compareJson(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} differs from deterministic output`);
}

function generateOrValidate({
  command,
  metadataInputs,
  packageVersion,
  sourceCommit,
  mode,
  releaseTag,
  outputDir,
  requireThirdPartyLicenseText = false,
}) {
  const context = contextFromMetadata({ metadataInputs, packageVersion, sourceCommit, mode, releaseTag });
  const expected = createCAbiEvidence(context);
  const paths = {
    sbom: resolve(outputDir, SBOM_FILENAME),
    inventory: resolve(outputDir, INVENTORY_FILENAME),
    sbomSums: resolve(outputDir, SBOM_SUMS_FILENAME),
    policy: resolve(outputDir, POLICY_FILENAME),
    thirdParty: resolve(outputDir, THIRD_PARTY_FILENAME),
    policySums: resolve(outputDir, POLICY_SUMS_FILENAME),
  };
  if (command === "generate") {
    mkdirSync(outputDir, { recursive: true });
    writeJson(paths.sbom, expected.sbom);
    writeJson(paths.inventory, expected.inventory);
    writeFileSync(paths.sbomSums, renderSums(paths.sbom, paths.inventory));
    writeJson(paths.policy, expected.policy);
    writeJson(paths.thirdParty, expected.thirdParty);
    writeFileSync(paths.policySums, renderPolicySums(paths.policy, paths.thirdParty));
  } else {
    compareJson(readJson(paths.sbom, SBOM_FILENAME), expected.sbom, SBOM_FILENAME);
    compareJson(readJson(paths.inventory, INVENTORY_FILENAME), expected.inventory, INVENTORY_FILENAME);
    compareJson(readJson(paths.policy, POLICY_FILENAME), expected.policy, POLICY_FILENAME);
    compareJson(readJson(paths.thirdParty, THIRD_PARTY_FILENAME), expected.thirdParty, THIRD_PARTY_FILENAME);
    if (readFileSync(paths.sbomSums, "utf8") !== renderSums(paths.sbom, paths.inventory)) fail(`${SBOM_SUMS_FILENAME} differs from deterministic output`);
    if (readFileSync(paths.policySums, "utf8") !== renderPolicySums(paths.policy, paths.thirdParty)) fail(`${POLICY_SUMS_FILENAME} differs from deterministic output`);
  }
  validateCAbiEvidenceIdentity({ sbom: expected.sbom, inventory: expected.inventory, policy: expected.policy, thirdParty: expected.thirdParty, packageVersion, sourceCommit, mode, releaseTag });
  if (expected.policy.gate_status === "FAIL") fail(`C ABI license policy is FAIL: ${expected.policy.invalid_metadata.map((entry) => entry.component).join(", ")}`);
  if (expected.policy.gate_status === "NEEDS USER DECISION") fail(`C ABI license policy requires user decision: ${expected.policy.needs_user_decision.map((entry) => `${entry.component}: ${entry.reason}`).join("; ")}`);
  if (requireThirdPartyLicenseText && expected.thirdParty.final_release_text_gate.status !== "ready") fail("final C ABI third-party license / notice text evidence is incomplete");
  return { paths, ...expected };
}

function argumentValue(argv, name, fallback = undefined) {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  if (argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
  return argv[index + 1];
}

function metadataArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--cargo-metadata") continue;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail("missing --cargo-metadata");
    const separator = value.indexOf("=");
    if (separator <= 0 || separator === value.length - 1) fail("--cargo-metadata must be rust-target=path");
    const target = value.slice(0, separator);
    if (values.has(target)) fail(`duplicate Cargo metadata: ${target}`);
    values.set(target, readJson(resolve(repositoryRoot, value.slice(separator + 1)), `Cargo metadata ${target}`));
    index += 1;
  }
  if (values.size !== C_ABI_TARGET_ORDER.length) fail("all four C ABI Cargo metadata inputs are required");
  for (const targetId of C_ABI_TARGET_ORDER) if (!values.has(C_ABI_TARGETS[targetId].rust_target)) fail(`missing C ABI Cargo metadata: ${targetId}`);
  return values;
}

function run() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (command !== "generate" && command !== "validate") fail("usage: generate | validate");
  const outputDirValue = argumentValue(argv, "--output", "release-c-abi-evidence");
  const result = generateOrValidate({
    command,
    metadataInputs: metadataArguments(argv),
    packageVersion: argumentValue(argv, "--package-version"),
    sourceCommit: argumentValue(argv, "--source-commit"),
    mode: argumentValue(argv, "--mode", "candidate"),
    releaseTag: argumentValue(argv, "--release-tag", null),
    outputDir: resolve(repositoryRoot, outputDirValue),
    requireThirdPartyLicenseText: argv.includes("--require-third-party-license-text"),
  });
  process.stdout.write(`${JSON.stringify({
    sbom: result.paths.sbom,
    inventory: result.paths.inventory,
    policy: result.paths.policy,
    third_party: result.paths.thirdParty,
    component_count: result.inventory.components.length,
    edge_count: result.sbom.relationships.filter((relationship) => relationship.relationshipType === "DEPENDS_ON").length,
    target_closure_counts: Object.fromEntries(result.inventory.target_closures.map((entry) => [entry.target_id, entry.component_identities.length])),
    policy_status: result.policy.gate_status,
    third_party_status: result.thirdParty.collection_status,
  })}\n`);
}

export {
  C_ABI_PACKAGE_NAME,
  INVENTORY_FILENAME,
  POLICY_FILENAME,
  POLICY_SUMS_FILENAME,
  SBOM_FILENAME,
  SBOM_SUMS_FILENAME,
  THIRD_PARTY_FILENAME,
  collectRuntimeGraph,
  createCAbiEvidence,
  createInventory,
  createSpdxDocument,
  generateOrValidate,
  validateCAbiEvidenceIdentity,
};

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

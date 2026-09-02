import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  INVENTORY_SCHEMA_VERSION,
  SBOM_FILENAME,
  SPDX_EXCEPTION_IDENTIFIER_CATALOGUE,
  SPDX_LICENSE_IDENTIFIER_CATALOGUE,
  SPDX_VERSION,
  parseLicenseExpressionSyntax,
  validateSbomSums,
} from "./release-sbom.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const POLICY_SCHEMA_VERSION = 1;
const POLICY_FILENAME = "license-policy.json";
const THIRD_PARTY_LICENSES_FILENAME = "THIRD_PARTY_LICENSES.json";
const LICENSE_POLICY_SUMS_FILENAME = "LICENSE-POLICY-SHA256SUMS";
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

// This is the Phase 4B policy allowlist. It is intentionally separate from
// the SPDX syntax/identifier catalogue imported from Phase 4A.
const LICENSE_POLICY_ALLOWLIST = Object.freeze([
  "MIT",
  "Apache-2.0",
  "BSD-3-Clause",
  "CC0-1.0",
  "ISC",
  "Zlib",
  "Unlicense",
  "Unicode-3.0",
].sort());
const LICENSE_POLICY_ALLOWLIST_SET = new Set(LICENSE_POLICY_ALLOWLIST);
const APPROVED_EXCEPTION_ALLOWLIST = Object.freeze([]);
const APPROVED_EXCEPTION_ALLOWLIST_SET = new Set(APPROVED_EXCEPTION_ALLOWLIST);

// These identifiers are classified as reciprocal/c/copyleft for reporting.
// They are not legal conclusions and are never automatically allowed.
const RECIPROCAL_LICENSE_IDENTIFIERS = new Set([
  "AGPL-1.0-only",
  "AGPL-1.0-or-later",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "CDDL-1.0",
  "CDDL-1.1",
  "CPL-1.0",
  "EPL-1.0",
  "EPL-2.0",
  "EUPL-1.1",
  "EUPL-1.2",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "LGPL-2.0-only",
  "LGPL-2.0-or-later",
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "LGPL-3.0-only",
  "LGPL-3.0-or-later",
  "MPL-1.0",
  "MPL-1.1",
  "MPL-2.0",
  "OSL-1.0",
  "OSL-1.1",
  "OSL-2.0",
  "OSL-2.1",
  "OSL-3.0",
  "RPL-1.1",
  "RPL-1.5",
]);

function fail(message) {
  throw new Error(`Release license policy gate failed: ${message}`);
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

function componentIdentity(component) {
  return `${component.ecosystem}|${component.name}|${component.version}|${component.source}`;
}

function validTextFile(value, label) {
  exactKeys(value, ["path", "sha256"], label);
  safeRelativePath(value.path, `${label} path`);
  if (typeof value.sha256 !== "string" || !HASH_PATTERN.test(value.sha256)) fail(`${label} hash is invalid`);
}

function expectedPackageComment(component, inventory) {
  return `source=${component.source}; source_commit=${inventory.source_commit}; cargo_lock_sha256=${inventory.cargo_lock_sha256}; artifact_roles=${component.artifact_roles.join(",")}; declared_license_metadata=${component.declared_license_metadata ?? "MISSING"}`;
}

function validateInventoryAndSbom(inventory, document) {
  if (!isPlainObject(inventory) || inventory.schema_version !== INVENTORY_SCHEMA_VERSION || inventory.inventory_kind !== "license") {
    fail("license inventory schema is unsupported");
  }
  if (
    typeof inventory.package_name !== "string" ||
    typeof inventory.package_version !== "string" ||
    !VERSION_PATTERN.test(inventory.package_version) ||
    typeof inventory.source_commit !== "string" ||
    !COMMIT_PATTERN.test(inventory.source_commit) ||
    typeof inventory.cargo_lock_sha256 !== "string" ||
    !HASH_PATTERN.test(inventory.cargo_lock_sha256) ||
    typeof inventory.pnpm_lock_sha256 !== "string" ||
    !HASH_PATTERN.test(inventory.pnpm_lock_sha256) ||
    inventory.sbom_file !== SBOM_FILENAME ||
    !Array.isArray(inventory.components)
  ) {
    fail("license inventory identity is invalid");
  }
  if (!isPlainObject(document) || document.SPDXID !== "SPDXRef-DOCUMENT" || document.spdxVersion !== SPDX_VERSION || !Array.isArray(document.packages)) {
    fail("SPDX document identity is invalid");
  }
  if (document.packages.length !== inventory.components.length) fail("license inventory and SBOM component counts differ");

  const packageById = new Map();
  for (const packageData of document.packages) {
    if (!isPlainObject(packageData) || typeof packageData.SPDXID !== "string" || packageById.has(packageData.SPDXID)) {
      fail("SPDX package identity is missing or duplicated");
    }
    packageById.set(packageData.SPDXID, packageData);
  }

  const identities = new Set();
  const spdxIds = new Set();
  for (const component of inventory.components) {
    const optional = Object.prototype.hasOwnProperty.call(component, "checksum_sha256") ? ["checksum_sha256"] : [];
    exactKeys(component, [
      "ecosystem",
      "name",
      "version",
      "source",
      "spdx_id",
      "license_expression",
      "declared_license_metadata",
      "generator_license_expression",
      "license_status",
      "license_text_status",
      "license_text_files",
      "clarification_reason",
      "license_normalization",
      "artifact_roles",
      ...optional,
    ], `license inventory component ${component.name ?? "unknown"}`);
    if (
      typeof component.ecosystem !== "string" ||
      typeof component.name !== "string" ||
      typeof component.version !== "string" ||
      !VERSION_PATTERN.test(component.version) ||
      typeof component.source !== "string" ||
      component.source.length === 0 ||
      typeof component.spdx_id !== "string" ||
      spdxIds.has(component.spdx_id)
    ) {
      fail("license inventory component identity is invalid");
    }
    const identity = componentIdentity(component);
    if (identities.has(identity)) fail(`license inventory component identity is duplicated: ${identity}`);
    identities.add(identity);
    spdxIds.add(component.spdx_id);

    if (component.license_expression !== null && typeof component.license_expression !== "string") fail(`license expression is invalid: ${identity}`);
    if (component.declared_license_metadata !== null && typeof component.declared_license_metadata !== "string") fail(`declared license metadata is invalid: ${identity}`);
    if (!["resolved", "unknown", "missing"].includes(component.license_status)) fail(`license metadata status is invalid: ${identity}`);
    if (!["resolved", "missing", "ambiguous", "unavailable"].includes(component.license_text_status)) fail(`license text status is invalid: ${identity}`);
    if (!Array.isArray(component.license_text_files)) fail(`license text evidence is invalid: ${identity}`);
    for (const file of component.license_text_files) validTextFile(file, `license text evidence ${identity}`);
    if (component.clarification_reason !== null && typeof component.clarification_reason !== "string") fail(`license clarification is invalid: ${identity}`);
    if (!isPlainObject(component.license_normalization) || typeof component.license_normalization.applied !== "boolean") fail(`license normalization is invalid: ${identity}`);
    if (!Array.isArray(component.artifact_roles) || component.artifact_roles.some((role) => typeof role !== "string") || new Set(component.artifact_roles).size !== component.artifact_roles.length) fail(`artifact roles are invalid: ${identity}`);
    if (JSON.stringify([...component.artifact_roles].sort()) !== JSON.stringify(component.artifact_roles)) fail(`artifact roles are not canonical: ${identity}`);
    if (component.checksum_sha256 !== undefined && (typeof component.checksum_sha256 !== "string" || !HASH_PATTERN.test(component.checksum_sha256))) fail(`component checksum is invalid: ${identity}`);

    const packageData = packageById.get(component.spdx_id);
    if (packageData === undefined || packageData.name !== component.name || packageData.versionInfo !== component.version || packageData.packageComment !== expectedPackageComment(component, inventory)) {
      fail(`license inventory and SBOM identity mismatch: ${identity}`);
    }
    if (packageData.licenseDeclared !== (component.license_expression ?? "NOASSERTION")) fail(`license inventory and SBOM license mismatch: ${identity}`);
    if (component.ecosystem === "cargo" && component.license_expression !== null && component.generator_license_expression !== packageData.licenseDeclared) fail(`cargo generator license mismatch: ${identity}`);
    if (component.ecosystem === "cargo" && component.license_expression === null && packageData.licenseDeclared !== "NOASSERTION") fail(`unresolved cargo license must be NOASSERTION in SBOM: ${identity}`);
    if (component.ecosystem === "npm" && component.generator_license_expression !== null) fail(`npm generator license is unexpected: ${identity}`);
    if (component.source.startsWith("registry+") && packageData.downloadLocation !== component.source) fail(`registry source mismatch: ${identity}`);
    if (!component.source.startsWith("registry+") && packageData.downloadLocation !== "NOASSERTION") fail(`local source mismatch: ${identity}`);
    if (component.checksum_sha256 !== undefined) {
      if (!Array.isArray(packageData.checksums) || packageData.checksums.length !== 1 || packageData.checksums[0].algorithm !== "SHA256" || packageData.checksums[0].checksumValue !== component.checksum_sha256) {
        fail(`component checksum mismatch: ${identity}`);
      }
    } else if (packageData.checksums !== undefined) {
      fail(`unexpected component checksum: ${identity}`);
    }
  }
  if ([...packageById.keys()].some((spdxId) => !spdxIds.has(spdxId))) fail("SBOM contains a package absent from license inventory");
  return true;
}

function canonicalExpressionTree(node) {
  if (node.kind === "license") {
    const result = { kind: "license", identifier: node.identifier };
    if (node.exception !== undefined) result.exception = node.exception;
    return result;
  }
  const operands = [];
  const collect = (candidate) => {
    if (candidate.kind === "binary" && candidate.operator === node.operator) {
      collect(candidate.left);
      collect(candidate.right);
    } else {
      operands.push(canonicalExpressionTree(candidate));
    }
  };
  collect(node);
  operands.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return { kind: "binary", operator: node.operator, operands };
}

function identifierDecision(identifier, reasonCodes) {
  if (LICENSE_POLICY_ALLOWLIST_SET.has(identifier)) return "allowed";
  if (RECIPROCAL_LICENSE_IDENTIFIERS.has(identifier)) {
    reasonCodes.add("copyleft-or-reciprocal-license");
    return "needs-user-decision";
  }
  if (!SPDX_LICENSE_IDENTIFIER_CATALOGUE.has(identifier) && !identifier.startsWith("LicenseRef-")) {
    reasonCodes.add("unknown-license-identifier");
    return "needs-user-decision";
  }
  reasonCodes.add("unapproved-license-identifier");
  return "needs-user-decision";
}

function evaluateExpressionTree(node, reasonCodes) {
  if (node.kind === "license") {
    let status = identifierDecision(node.identifier, reasonCodes);
    if (node.exception !== undefined && !APPROVED_EXCEPTION_ALLOWLIST_SET.has(node.exception)) {
      reasonCodes.add(SPDX_EXCEPTION_IDENTIFIER_CATALOGUE.has(node.exception) ? "unapproved-spdx-exception" : "unknown-spdx-exception");
      status = "needs-user-decision";
    }
    return status;
  }
  const statuses = [evaluateExpressionTree(node.left, reasonCodes), evaluateExpressionTree(node.right, reasonCodes)];
  // Closed-world policy deliberately inspects every branch of OR as well as
  // every operand of AND, so a newly appearing unapproved identifier cannot
  // be hidden behind a syntactically valid alternative.
  return statuses.every((status) => status === "allowed") ? "allowed" : "needs-user-decision";
}

function evaluateLicenseExpression(expression) {
  if (typeof expression !== "string" || expression.length === 0) {
    return {
      status: "invalid-metadata",
      identifiers: [],
      exceptions: [],
      expression_tree: null,
      reason_codes: ["missing-license-expression"],
      error: "license expression is missing",
    };
  }
  let parsed;
  try {
    parsed = parseLicenseExpressionSyntax(expression);
  } catch (error) {
    return {
      status: "invalid-metadata",
      identifiers: [],
      exceptions: [],
      expression_tree: null,
      reason_codes: ["invalid-spdx-syntax"],
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const reasonCodes = new Set();
  const status = evaluateExpressionTree(parsed.tree, reasonCodes);
  return {
    status,
    identifiers: [...parsed.identifiers].sort(),
    exceptions: [...parsed.exceptions].sort(),
    expression_tree: canonicalExpressionTree(parsed.tree),
    reason_codes: [...reasonCodes].sort(),
  };
}

function derivedLicenseMetadataStatus(component) {
  if (component.license_expression !== null) return "resolved";
  if (component.declared_license_metadata === null || component.declared_license_metadata.length === 0) return "missing";
  return "unknown";
}

function evaluateInventory(inventory, document) {
  validateInventoryAndSbom(inventory, document);
  const evaluations = inventory.components.map((component) => {
    let evaluation;
    if (component.declared_license_metadata === null || component.declared_license_metadata.length === 0) {
      evaluation = {
        status: "missing-declared-metadata",
        identifiers: [],
        exceptions: [],
        expression_tree: null,
        reason_codes: ["missing-declared-metadata"],
      };
    } else if (component.license_expression === null) {
      const rawEvaluation = evaluateLicenseExpression(component.declared_license_metadata);
      if (rawEvaluation.status === "allowed") {
        evaluation = {
          ...rawEvaluation,
          status: "invalid-metadata",
          reason_codes: ["missing-normalized-license-expression"],
        };
      } else {
        evaluation = rawEvaluation;
      }
    } else {
      evaluation = evaluateLicenseExpression(component.license_expression);
    }
    if (component.license_status !== derivedLicenseMetadataStatus(component)) fail(`license metadata status does not match Phase 4A observation: ${componentIdentity(component)}`);
    return {
      ecosystem: component.ecosystem,
      name: component.name,
      version: component.version,
      source: component.source,
      spdx_id: component.spdx_id,
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
  });
  evaluations.sort((left, right) => componentIdentity(left).localeCompare(componentIdentity(right)));
  return evaluations;
}

function gateStatus(evaluations) {
  if (evaluations.some((entry) => entry.policy_status === "invalid-metadata" || entry.policy_status === "missing-declared-metadata")) return "FAIL";
  if (evaluations.some((entry) => entry.policy_status === "needs-user-decision")) return "NEEDS USER DECISION";
  return "PASS";
}

function createLicensePolicyArtifact(inventory, document, { inventorySha256 = null, sbomSha256 = null } = {}) {
  const evaluations = evaluateInventory(inventory, document);
  const decisions = evaluations
    .filter((entry) => entry.policy_status === "needs-user-decision")
    .flatMap((entry) => entry.reason_codes.map((reason) => ({ component: componentIdentity(entry), reason })))
    .sort((left, right) => `${left.component}|${left.reason}`.localeCompare(`${right.component}|${right.reason}`));
  const invalidMetadata = evaluations
    .filter((entry) => entry.policy_status === "invalid-metadata" || entry.policy_status === "missing-declared-metadata")
    .map((entry) => ({ component: componentIdentity(entry), status: entry.policy_status, reason_codes: entry.reason_codes }))
    .sort((left, right) => `${left.component}|${left.status}`.localeCompare(`${right.component}|${right.status}`));
  const missingText = evaluations
    .filter((entry) => entry.license_text_status !== "resolved")
    .map((entry) => ({
      component: componentIdentity(entry),
      spdx_id: entry.spdx_id,
      status: entry.license_text_status,
      files: entry.license_text_files,
    }))
    .sort((left, right) => left.component.localeCompare(right.component));
  return {
    schema_version: POLICY_SCHEMA_VERSION,
    artifact_kind: "license-policy",
    package_name: inventory.package_name,
    package_version: inventory.package_version,
    source_commit: inventory.source_commit,
    inventory_file: inventory.sbom_file === SBOM_FILENAME ? "license-inventory.json" : inventory.sbom_file,
    inventory_sha256: inventorySha256,
    sbom_file: SBOM_FILENAME,
    sbom_sha256: sbomSha256,
    gate_status: gateStatus(evaluations),
    policy: {
      allowlist: [...LICENSE_POLICY_ALLOWLIST],
      approved_exceptions: [...APPROVED_EXCEPTION_ALLOWLIST],
      syntax_catalogue: [...SPDX_LICENSE_IDENTIFIER_CATALOGUE].sort(),
      exception_catalogue: [...SPDX_EXCEPTION_IDENTIFIER_CATALOGUE].sort(),
      expression_rule: "Every license identifier and exception in the SPDX expression must be approved; OR order is not significant.",
    },
    components: evaluations.map((entry) => ({
      ecosystem: entry.ecosystem,
      name: entry.name,
      version: entry.version,
      source: entry.source,
      spdx_id: entry.spdx_id,
      declared_license_metadata: entry.declared_license_metadata,
      license_expression: entry.license_expression,
      policy_status: entry.policy_status,
      reason_codes: entry.reason_codes,
      identifiers: entry.identifiers,
      exceptions: entry.exceptions,
      expression_tree: entry.expression_tree,
      license_text_status: entry.license_text_status,
      license_text_files: entry.license_text_files,
    })),
    needs_user_decision: decisions,
    invalid_metadata: invalidMetadata,
    license_text_missing_observations: missingText,
    third_party_license_artifact: THIRD_PARTY_LICENSES_FILENAME,
  };
}

function isThirdPartyComponent(component) {
  return component.ecosystem === "cargo" && component.source.startsWith("registry+");
}

function sourceLicenseTexts(entry, cargoMetadata) {
  const candidates = cargoMetadata
    .flatMap((metadata) => Array.isArray(metadata.packages) ? metadata.packages : [])
    .filter((packageData) => packageData.name === entry.name && packageData.version === entry.version && packageData.source === entry.source && typeof packageData.manifest_path === "string")
    .sort((left, right) => left.manifest_path.localeCompare(right.manifest_path));
  if (candidates.length === 0) fail(`third-party source evidence is unavailable: ${componentIdentity(entry)}`);
  return entry.license_text_files.map((file) => {
    const matches = candidates
      .map((packageData) => resolve(dirname(packageData.manifest_path), file.path))
      .filter((path) => existsSync(path))
      .map((path) => ({ path, bytes: readFileSync(path) }))
      .filter(({ bytes }) => createHash("sha256").update(bytes).digest("hex") === file.sha256);
    if (matches.length === 0) fail(`third-party license text hash mismatch: ${componentIdentity(entry)}/${file.path}`);
    return {
      path: file.path,
      sha256: file.sha256,
      text: matches[0].bytes.toString("utf8"),
    };
  });
}

function createThirdPartyLicenseArtifact(inventory, document, { inventorySha256 = null, cargoMetadata = [] } = {}) {
  const evaluations = evaluateInventory(inventory, document);
  const components = evaluations
    .filter(isThirdPartyComponent)
    .map((entry) => {
      const result = {
        ecosystem: entry.ecosystem,
        name: entry.name,
        version: entry.version,
        source: entry.source,
        spdx_id: entry.spdx_id,
        license_expression: entry.license_expression,
        license_text_status: entry.license_text_status,
        license_text_files: entry.license_text_files,
        collection_status: entry.license_text_status === "resolved" ? "available" : "pending-source-evidence",
      };
      if (entry.license_text_status === "resolved" && cargoMetadata.length > 0) result.license_texts = sourceLicenseTexts(entry, cargoMetadata);
      return result;
    })
    .sort((left, right) => `${left.name}|${left.version}|${left.source}`.localeCompare(`${right.name}|${right.version}|${right.source}`));
  const collectionStatus = components.every((entry) => entry.collection_status === "available") ? "complete" : "incomplete";
  const textContentStatus = components.length === 0
    ? "not-applicable"
    : cargoMetadata.length > 0 && components.every((entry) => entry.collection_status === "available" && Array.isArray(entry.license_texts))
      ? "collected"
      : "not-collected";
  return {
    schema_version: POLICY_SCHEMA_VERSION,
    artifact_kind: "third-party-license-notice-evidence",
    package_name: inventory.package_name,
    package_version: inventory.package_version,
    source_commit: inventory.source_commit,
    inventory_file: "license-inventory.json",
    inventory_sha256: inventorySha256,
    collection_status: collectionStatus,
    text_content_status: textContentStatus,
    final_release_text_gate: {
      required: true,
      status: collectionStatus === "complete" && ["collected", "not-applicable"].includes(textContentStatus) ? "ready" : "pending",
      enforcement: "release-license-policy.mjs --require-third-party-license-text",
    },
    legal_obligation_determination: "not-performed",
    components,
  };
}

function renderLicensePolicySums(policyPath, thirdPartyPath) {
  return `${sha256(policyPath, POLICY_FILENAME)}  ${POLICY_FILENAME}\n${sha256(thirdPartyPath, THIRD_PARTY_LICENSES_FILENAME)}  ${THIRD_PARTY_LICENSES_FILENAME}\n`;
}

function validateLicensePolicySums(path, policyPath, thirdPartyPath) {
  const contents = bytes(path, LICENSE_POLICY_SUMS_FILENAME).toString("utf8");
  if (!contents.endsWith("\n")) fail(`${LICENSE_POLICY_SUMS_FILENAME} must end with one newline`);
  const lines = contents.slice(0, -1).split("\n");
  const expected = [
    { hash: sha256(policyPath, POLICY_FILENAME), path: POLICY_FILENAME },
    { hash: sha256(thirdPartyPath, THIRD_PARTY_LICENSES_FILENAME), path: THIRD_PARTY_LICENSES_FILENAME },
  ];
  if (lines.length !== expected.length) fail(`${LICENSE_POLICY_SUMS_FILENAME} has missing or extra entries`);
  for (const [index, line] of lines.entries()) {
    const match = /^([0-9a-f]{64}) {2}([^\s\r\n]+)$/.exec(line);
    if (match === null || match[1] !== expected[index].hash || match[2] !== expected[index].path) fail(`${LICENSE_POLICY_SUMS_FILENAME} entry ${index + 1} is invalid`);
  }
}

function enforceLicensePolicy(policy, thirdParty, requireThirdPartyLicenseText = false) {
  if (policy.gate_status === "NEEDS USER DECISION") {
    fail(`NEEDS USER DECISION: ${policy.needs_user_decision.map((entry) => `${entry.component}: ${entry.reason}`).join("; ")}`);
  }
  if (policy.gate_status === "FAIL") {
    const failures = [...policy.invalid_metadata].map((entry) => `${entry.component}: ${entry.status}`).join("; ");
    fail(`license metadata is invalid or missing: ${failures}`);
  }
  if (requireThirdPartyLicenseText && thirdParty.final_release_text_gate.status !== "ready") {
    fail("final third-party license / notice text evidence is incomplete");
  }
}

function validateOutputs(paths, inventory, document) {
  const policy = json(paths.policyPath, "license policy artifact");
  const thirdParty = json(paths.thirdPartyPath, "third-party license artifact");
  const expectedPolicy = createLicensePolicyArtifact(inventory, document, {
    inventorySha256: sha256(paths.inventoryPath, "license inventory"),
    sbomSha256: sha256(paths.sbomPath, "SPDX SBOM"),
  });
  const expectedThirdParty = createThirdPartyLicenseArtifact(inventory, document, {
    inventorySha256: sha256(paths.inventoryPath, "license inventory"),
    cargoMetadata: paths.cargoMetadata,
  });
  if (JSON.stringify(policy) !== JSON.stringify(expectedPolicy)) fail("license policy artifact differs from deterministic output");
  if (JSON.stringify(thirdParty) !== JSON.stringify(expectedThirdParty)) fail("third-party license artifact differs from deterministic output");
  validateLicensePolicySums(paths.policySha256sumsPath, paths.policyPath, paths.thirdPartyPath);
  return { policy, thirdParty };
}

function argumentValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
  return argv[index + 1];
}

function pathsFromArguments(argv) {
  const path = (name) => resolve(repositoryRoot, argumentValue(argv, name));
  const metadataPaths = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--cargo-metadata") continue;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail("missing --cargo-metadata value");
    const separator = value.indexOf("=");
    if (separator <= 0 || separator === value.length - 1) fail("--cargo-metadata must be key=path");
    metadataPaths.push([value.slice(0, separator), resolve(repositoryRoot, value.slice(separator + 1))]);
    index += 1;
  }
  if (new Set(metadataPaths.map(([key]) => key)).size !== metadataPaths.length) fail("duplicate --cargo-metadata key");
  return {
    inventoryPath: path("--inventory"),
    sbomPath: path("--sbom"),
    sbomSha256sumsPath: path("--sbom-sha256sums"),
    policyPath: path("--policy"),
    thirdPartyPath: path("--third-party"),
    policySha256sumsPath: path("--policy-sha256sums"),
    cargoMetadataPaths: metadataPaths.map(([, metadataPath]) => metadataPath),
    requireThirdPartyLicenseText: argv.includes("--require-third-party-license-text"),
  };
}

function run() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (command !== "generate" && command !== "validate") fail("usage: generate | validate");
  const paths = pathsFromArguments(argv.slice(1));
  const inventory = json(paths.inventoryPath, "license inventory");
  const document = json(paths.sbomPath, "SPDX SBOM");
  validateSbomSums(paths.sbomSha256sPath, paths.sbomPath, paths.inventoryPath);
  validateInventoryAndSbom(inventory, document);
  const cargoMetadata = paths.cargoMetadataPaths.map((metadataPath) => json(metadataPath, `Cargo metadata ${metadataPath}`));
  if (command === "generate") {
    const policy = createLicensePolicyArtifact(inventory, document, {
      inventorySha256: sha256(paths.inventoryPath, "license inventory"),
      sbomSha256: sha256(paths.sbomPath, "SPDX SBOM"),
    });
    const thirdParty = createThirdPartyLicenseArtifact(inventory, document, {
      inventorySha256: sha256(paths.inventoryPath, "license inventory"),
      cargoMetadata,
    });
    writeJson(paths.policyPath, policy);
    writeJson(paths.thirdPartyPath, thirdParty);
    writeFileSync(paths.policySha256sumsPath, renderLicensePolicySums(paths.policyPath, paths.thirdPartyPath));
  }
  paths.cargoMetadata = cargoMetadata;
  const outputs = validateOutputs(paths, inventory, document);
  enforceLicensePolicy(outputs.policy, outputs.thirdParty, paths.requireThirdPartyLicenseText);
  process.stdout.write(`${JSON.stringify({
    policy: paths.policyPath,
    third_party: paths.thirdPartyPath,
    policy_sha256sums: paths.policySha256sumsPath,
    gate_status: outputs.policy.gate_status,
    component_count: outputs.policy.components.length,
    needs_user_decision_count: outputs.policy.needs_user_decision.length,
    license_text_missing_count: outputs.policy.license_text_missing_observations.length,
    third_party_collection_status: outputs.thirdParty.collection_status,
  })}\n`);
}

export {
  APPROVED_EXCEPTION_ALLOWLIST,
  LICENSE_POLICY_ALLOWLIST,
  LICENSE_POLICY_SUMS_FILENAME,
  POLICY_FILENAME,
  POLICY_SCHEMA_VERSION,
  RECIPROCAL_LICENSE_IDENTIFIERS,
  THIRD_PARTY_LICENSES_FILENAME,
  createLicensePolicyArtifact,
  createThirdPartyLicenseArtifact,
  enforceLicensePolicy,
  evaluateInventory,
  evaluateLicenseExpression,
  renderLicensePolicySums,
  validateInventoryAndSbom,
  validateLicensePolicySums,
};

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

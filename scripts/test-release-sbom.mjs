import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import {
  buildCargoComponents,
  createLicenseInventory,
  createSpdxDocument,
  packageIdentityKey,
  parseCargoSbom,
  parseLicenseExpression,
  renderSbomSums,
  validateLicenseInventory,
  validateSpdxDocument,
  validateSbomSums,
} from "./release-sbom.mjs";

const COMMIT = "a".repeat(40);
const CARGO_LOCK = "b".repeat(64);
const PNPM_LOCK = "c".repeat(64);
const NPM_TARBALL = "d".repeat(64);
const CREATED = "2026-01-02T03:04:05.000Z";
const REGISTRY = "registry+https://github.com/rust-lang/crates.io-index";

function component(fields) {
  const value = {
    license_status: "resolved",
    license_text_status: "resolved",
    license_text_files: [{ path: "LICENSE", sha256: "e".repeat(64) }],
    artifact_roles: ["native"],
    license_normalization: { applied: false, basis: null },
    source_commit: COMMIT,
    cargo_lock_sha256: CARGO_LOCK,
    clarification_reason: undefined,
    ...fields,
  };
  value.declared_license_metadata = value.declared_license_metadata ?? value.license_expression ?? null;
  value.generator_license_expression = value.generator_license_expression ?? (value.ecosystem === "cargo" ? value.license_expression : null);
  value.identity = packageIdentityKey(value);
  return value;
}

function fixtureContext() {
  const root = component({
    ecosystem: "npm",
    name: "@nemnesia/symbol-nem-wallet-core",
    version: "0.1.0",
    source: "path:packages/wallet-core",
    license_expression: "MIT",
    artifact_roles: ["npm-package"],
    checksum_sha256: NPM_TARBALL,
  });
  const node = component({
    ecosystem: "cargo",
    name: "symbol-nem-wallet-core-node",
    version: "0.1.0",
    source: "path:crates/node",
    license_expression: "MIT",
    license_text_files: [{ path: "LICENSE", sha256: "e".repeat(64) }],
    artifact_roles: ["native"],
  });
  const wasm = component({
    ecosystem: "cargo",
    name: "symbol-nem-wallet-core-wasm",
    version: "0.1.0",
    source: "path:crates/wasm",
    license_expression: "MIT",
    license_text_files: [{ path: "LICENSE", sha256: "e".repeat(64) }],
    artifact_roles: ["wasm"],
  });
  const core = component({
    ecosystem: "cargo",
    name: "symbol-nem-wallet-core",
    version: "0.1.0",
    source: "path:crates/core",
    license_expression: "MIT",
    license_text_files: [{ path: "LICENSE", sha256: "e".repeat(64) }],
    artifact_roles: ["native", "wasm"],
  });
  const dependency = component({
    ecosystem: "cargo",
    name: "example-dependency",
    version: "1.2.3",
    source: REGISTRY,
    license_expression: "MIT OR Apache-2.0",
    artifact_roles: ["native", "wasm"],
    checksum_sha256: "f".repeat(64),
  });
  return {
    packageName: root.name,
    packageVersion: root.version,
    sourceCommit: COMMIT,
    cargoLockSha256: CARGO_LOCK,
    pnpmLockSha256: PNPM_LOCK,
    npmRuntimeDependencyCount: 0,
    components: [root, node, wasm, core, dependency],
    edges: [
      { source: node.identity, target: core.identity },
      { source: wasm.identity, target: core.identity },
      { source: core.identity, target: dependency.identity },
    ],
    excludedCargoPackages: [],
    creationTimestamp: CREATED,
  };
}

function clone(value) {
  return structuredClone(value);
}

function expectFailure(label, callback) {
  assert.throws(callback, (error) => {
    assert.match(String(error?.message), /gate failed|license expression|SPDX/);
    return true;
  }, label);
}

const context = fixtureContext();
const document = createSpdxDocument(context);
const inventory = createLicenseInventory(context);
assert.equal(document.spdxVersion, "SPDX-2.3");
assert.equal(document.SPDXID, "SPDXRef-DOCUMENT");
assert.equal(document.dataLicense, "CC0-1.0");
assert.equal(document.packages.length, 5);
assert.equal(inventory.components.length, 5);
assert.equal(inventory.schema_version, 2);
assert.equal(inventory.npm_runtime_dependency_count, 0);
assert.equal(inventory.rust_dependency_package_count, 1);
assert.equal(inventory.components.find((entry) => entry.ecosystem === "cargo" && entry.name === "example-dependency").license_expression, "MIT OR Apache-2.0");
assert.match(inventory.components.find((entry) => entry.ecosystem === "cargo" && entry.name === "example-dependency").spdx_id, /^SPDXRef-Package-/);
validateSpdxDocument(document, context);
validateLicenseInventory(inventory, context);

assert.deepEqual(parseLicenseExpression("(MIT OR Apache-2.0) AND Unicode-3.0").identifiers, ["MIT", "Apache-2.0", "Unicode-3.0"]);
expectFailure("invalid license expression", () => parseLicenseExpression("MIT / Apache-2.0"));

const missingTextContext = clone(context);
const missingTextComponent = missingTextContext.components.find((entry) => entry.name === "example-dependency");
missingTextComponent.license_text_status = "missing";
missingTextComponent.license_text_files = [];
missingTextComponent.clarification_reason = "no source license text for MIT";
const missingTextInventory = createLicenseInventory(missingTextContext);
assert.equal(missingTextInventory.components.find((entry) => entry.name === "example-dependency").license_status, "resolved");
assert.equal(missingTextInventory.components.find((entry) => entry.name === "example-dependency").license_text_status, "missing");
validateSpdxDocument(createSpdxDocument(missingTextContext), missingTextContext);
validateLicenseInventory(missingTextInventory, missingTextContext);

const observedUnknownContext = clone(context);
const observedUnknownComponent = observedUnknownContext.components.find((entry) => entry.name === "example-dependency");
observedUnknownComponent.license_expression = null;
observedUnknownComponent.declared_license_metadata = "Vendor-License";
observedUnknownComponent.generator_license_expression = "Vendor-License";
observedUnknownComponent.license_status = "unknown";
observedUnknownComponent.license_text_status = "unavailable";
observedUnknownComponent.license_text_files = [];
observedUnknownComponent.clarification_reason = "Cargo package license metadata is not a valid SPDX expression";
const observedUnknownInventory = createLicenseInventory(observedUnknownContext);
validateSpdxDocument(createSpdxDocument(observedUnknownContext), observedUnknownContext);
validateLicenseInventory(observedUnknownInventory, observedUnknownContext);

const normalizationRoot = mkdtempSync(resolve(tmpdir(), "snwc-license-normalization-"));
writeFileSync(resolve(normalizationRoot, "LICENSE-APACHE"), "Apache license evidence\n");
writeFileSync(resolve(normalizationRoot, "LICENSE-MIT"), "MIT license evidence\n");
const normalizedPackageData = {
  name: "curve25519-dalek-derive",
  version: "0.1.1",
  source: REGISTRY,
  license: "MIT/Apache-2.0",
  repository: "https://github.com/dalek-cryptography/curve25519-dalek",
  manifest_path: resolve(normalizationRoot, "Cargo.toml"),
};
const normalizedComponent = buildCargoComponents(
  { packages: [{ packageData: normalizedPackageData, roles: new Set(["native"]) }] },
  new Map([[`cargo|${normalizedPackageData.name}|${normalizedPackageData.version}|${REGISTRY}`, { checksum: "f".repeat(64) }]]),
  COMMIT,
  CARGO_LOCK,
)[0];
assert.equal(normalizedComponent.declared_license_metadata, "MIT/Apache-2.0");
assert.equal(normalizedComponent.license_expression, "MIT OR Apache-2.0");
assert.deepEqual(normalizedComponent.license_normalization, {
  applied: true,
  basis: {
    type: "upstream-package-metadata-and-license-files",
    repository: "https://github.com/dalek-cryptography/curve25519-dalek",
    declared_license_metadata: "MIT/Apache-2.0",
    license_text_files: ["LICENSE-APACHE", "LICENSE-MIT"],
    normalized_spdx_expression: "MIT OR Apache-2.0",
  },
});
assert.equal(normalizedComponent.license_text_status, "resolved");
const normalizedContext = clone(context);
normalizedContext.components = normalizedContext.components.map((entry) => entry.name === "example-dependency" ? normalizedComponent : entry);
normalizedContext.edges = normalizedContext.edges.map((edge) => edge.target === context.components.find((entry) => entry.name === "example-dependency").identity ? { ...edge, target: normalizedComponent.identity } : edge);
const normalizedInventory = createLicenseInventory(normalizedContext);
validateSpdxDocument(createSpdxDocument(normalizedContext), normalizedContext);
validateLicenseInventory(normalizedInventory, normalizedContext);
const missingEvidenceRoot = mkdtempSync(resolve(tmpdir(), "snwc-license-normalization-missing-"));
const missingEvidenceComponent = buildCargoComponents(
  { packages: [{ packageData: { ...normalizedPackageData, manifest_path: resolve(missingEvidenceRoot, "Cargo.toml") }, roles: new Set(["native"]) }] },
  new Map([[`cargo|${normalizedPackageData.name}|${normalizedPackageData.version}|${REGISTRY}`, { checksum: "f".repeat(64) }]]),
  COMMIT,
  CARGO_LOCK,
)[0];
assert.equal(missingEvidenceComponent.license_expression, null);
assert.deepEqual(missingEvidenceComponent.license_normalization, { applied: false, basis: null });
rmSync(normalizationRoot, { recursive: true, force: true });
rmSync(missingEvidenceRoot, { recursive: true, force: true });

const documentAgain = createSpdxDocument(context);
const inventoryAgain = createLicenseInventory(context);
assert.equal(JSON.stringify(documentAgain), JSON.stringify(document));
assert.equal(JSON.stringify(inventoryAgain), JSON.stringify(inventory));

const missingDependency = clone(document);
missingDependency.packages.pop();
expectFailure("dependency missing from SBOM", () => validateSpdxDocument(missingDependency, context));

const unexpectedDependency = clone(document);
unexpectedDependency.packages[1].name = "unexpected-dependency";
expectFailure("unexpected dependency", () => validateSpdxDocument(unexpectedDependency, context));

const unexpectedPackageField = clone(document);
unexpectedPackageField.packages[1].description = "untrusted description";
expectFailure("unexpected SPDX package field", () => validateSpdxDocument(unexpectedPackageField, context));

const duplicateSpdxId = clone(document);
duplicateSpdxId.packages[1].SPDXID = duplicateSpdxId.packages[0].SPDXID;
expectFailure("duplicate SPDX ID", () => validateSpdxDocument(duplicateSpdxId, context));

const duplicateIdentity = clone(document);
duplicateIdentity.packages[1].name = duplicateIdentity.packages[0].name;
duplicateIdentity.packages[1].versionInfo = duplicateIdentity.packages[0].versionInfo;
expectFailure("duplicate dependency identity", () => validateSpdxDocument(duplicateIdentity, context));

expectFailure("malformed SPDX", () => validateSpdxDocument(null, context));
const wrongSpdxVersion = clone(document);
wrongSpdxVersion.spdxVersion = "SPDX-3.0";
expectFailure("unsupported SPDX version", () => validateSpdxDocument(wrongSpdxVersion, context));

const wrongRoot = clone(document);
wrongRoot.packages.find((entry) => entry.name === "@nemnesia/symbol-nem-wallet-core").name = "@nemnesia/other";
expectFailure("wrong root package", () => validateSpdxDocument(wrongRoot, context));

const wrongVersion = clone(document);
wrongVersion.packages.find((entry) => entry.name === "@nemnesia/symbol-nem-wallet-core").versionInfo = "0.2.0";
expectFailure("wrong package version", () => validateSpdxDocument(wrongVersion, context));

const wrongSource = clone(document);
wrongSource.packages.find((entry) => entry.name === "symbol-nem-wallet-core").packageComment = wrongSource.packages.find((entry) => entry.name === "symbol-nem-wallet-core").packageComment.replace(COMMIT, "f".repeat(40));
expectFailure("wrong source commit", () => validateSpdxDocument(wrongSource, context));

const invalidSpdxLicense = clone(document);
invalidSpdxLicense.packages.find((entry) => entry.name === "symbol-nem-wallet-core").licenseDeclared = "NotARealLicense";
expectFailure("invalid SPDX license expression", () => validateSpdxDocument(invalidSpdxLicense, context));

const missingLicense = clone(inventory);
missingLicense.components[0].license_expression = null;
missingLicense.components[0].license_status = "missing";
expectFailure("missing license metadata", () => validateLicenseInventory(missingLicense, context));

const ambiguousLicense = clone(inventory);
ambiguousLicense.components[0].license_status = "ambiguous";
ambiguousLicense.components[0].license_text_status = "ambiguous";
expectFailure("ambiguous license metadata", () => validateLicenseInventory(ambiguousLicense, context));

const missingSource = clone(inventory);
missingSource.components[0].source = "";
expectFailure("missing dependency source", () => validateLicenseInventory(missingSource, context));

const inventoryMismatch = clone(inventory);
inventoryMismatch.components.pop();
expectFailure("inventory/SBOM mismatch", () => validateLicenseInventory(inventoryMismatch, context));

const lockMismatch = clone(inventory);
lockMismatch.cargo_lock_sha256 = "0".repeat(64);
expectFailure("lockfile digest mismatch", () => validateLicenseInventory(lockMismatch, context));
const unsupportedInventorySchema = clone(inventory);
unsupportedInventorySchema.schema_version = 1;
expectFailure("unsupported license inventory schema", () => validateLicenseInventory(unsupportedInventorySchema, context));

const outputRoot = mkdtempSync(resolve(tmpdir(), "snwc-release-sbom-test-"));
const sbomPath = resolve(outputRoot, "sbom.spdx.json");
const inventoryPath = resolve(outputRoot, "license-inventory.json");
const sumsPath = resolve(outputRoot, "SBOM-SHA256SUMS");
const malformedGeneratorPath = resolve(outputRoot, "cargo-sbom-malformed.json");
writeFileSync(malformedGeneratorPath, "{");
expectFailure("tool output parser failure", () => parseCargoSbom(malformedGeneratorPath, "node"));
writeFileSync(sbomPath, JSON.stringify(document));
writeFileSync(inventoryPath, JSON.stringify(inventory));
writeFileSync(sumsPath, renderSbomSums(sbomPath, inventoryPath));
validateSbomSums(sumsPath, sbomPath, inventoryPath);
const badSums = readFileSync(sumsPath, "utf8").replace("sbom.spdx.json", "unexpected.json");
writeFileSync(sumsPath, badSums);
expectFailure("digest set mismatch", () => validateSbomSums(sumsPath, sbomPath, inventoryPath));
rmSync(outputRoot, { recursive: true, force: true });

process.stdout.write("release SBOM and license inventory deterministic tests passed\n");

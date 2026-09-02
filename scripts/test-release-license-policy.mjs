import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import {
  SPDX_EXCEPTION_IDENTIFIER_CATALOGUE,
  SPDX_LICENSE_IDENTIFIER_CATALOGUE,
  buildCargoComponents,
  createLicenseInventory,
  createSpdxDocument,
  packageIdentityKey,
} from "./release-sbom.mjs";
import {
  LICENSE_POLICY_ALLOWLIST,
  createLicensePolicyArtifact,
  createThirdPartyLicenseArtifact,
  enforceLicensePolicy,
  evaluateLicenseExpression,
  validateInventoryAndSbom,
} from "./release-license-policy.mjs";

const COMMIT = "a".repeat(40);
const CARGO_LOCK = "b".repeat(64);
const PNPM_LOCK = "c".repeat(64);
const NPM_TARBALL = "d".repeat(64);
const TEXT_HASH = "e".repeat(64);
const DEPENDENCY_HASH = "f".repeat(64);
const REGISTRY = "registry+https://github.com/rust-lang/crates.io-index";

function component(fields) {
  const value = {
    license_status: "resolved",
    license_text_status: "resolved",
    license_text_files: [{ path: "LICENSE", sha256: TEXT_HASH }],
    artifact_roles: ["native"],
    license_normalization: { applied: false, basis: null },
    source_commit: COMMIT,
    cargo_lock_sha256: CARGO_LOCK,
    clarification_reason: null,
    ...fields,
  };
  value.declared_license_metadata = value.declared_license_metadata ?? value.license_expression ?? null;
  value.generator_license_expression = value.generator_license_expression ?? (value.ecosystem === "cargo" ? value.license_expression : null);
  value.identity = packageIdentityKey(value);
  return value;
}

function fixtureContext(extra = false) {
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
    artifact_roles: ["native"],
  });
  const wasm = component({
    ecosystem: "cargo",
    name: "symbol-nem-wallet-core-wasm",
    version: "0.1.0",
    source: "path:crates/wasm",
    license_expression: "MIT",
    artifact_roles: ["wasm"],
  });
  const dependency = component({
    ecosystem: "cargo",
    name: "example-dependency",
    version: "1.2.3",
    source: REGISTRY,
    license_expression: "MIT OR Apache-2.0",
    artifact_roles: ["native", "wasm"],
    checksum_sha256: DEPENDENCY_HASH,
  });
  const components = [root, node, wasm, dependency];
  const edges = [
    { source: node.identity, target: dependency.identity },
    { source: wasm.identity, target: dependency.identity },
  ];
  if (extra) {
    const future = component({
      ecosystem: "cargo",
      name: "future-dependency",
      version: "9.9.9",
      source: REGISTRY,
      license_expression: "GPL-3.0-only",
      artifact_roles: ["native", "wasm"],
      checksum_sha256: "1".repeat(64),
    });
    components.push(future);
    edges.push(
      { source: node.identity, target: future.identity },
      { source: wasm.identity, target: future.identity },
    );
  }
  return {
    packageName: root.name,
    packageVersion: root.version,
    sourceCommit: COMMIT,
    cargoLockSha256: CARGO_LOCK,
    pnpmLockSha256: PNPM_LOCK,
    npmRuntimeDependencyCount: 0,
    components,
    edges,
    excludedCargoPackages: [],
    creationTimestamp: "2026-01-02T03:04:05.000Z",
  };
}

function clone(value) {
  return structuredClone(value);
}

function expectFailure(label, callback, pattern = /Release license policy gate failed/) {
  assert.throws(callback, pattern, label);
}

for (const identifier of LICENSE_POLICY_ALLOWLIST) {
  assert.equal(evaluateLicenseExpression(identifier).status, "allowed", identifier);
}

for (const expression of [
  "MIT OR Apache-2.0",
  "Apache-2.0 OR MIT",
  "MIT",
  "CC0-1.0",
  "BSD-3-Clause",
  "(MIT OR Apache-2.0) AND Unicode-3.0",
  "MIT OR Apache-2.0 OR Zlib",
  "ISC",
  "Unlicense OR MIT",
  "Zlib OR Apache-2.0 OR MIT",
]) {
  assert.equal(evaluateLicenseExpression(expression).status, "allowed", expression);
}
assert.equal(evaluateLicenseExpression("MIT OR Apache-2.0").status, evaluateLicenseExpression("Apache-2.0 OR MIT").status);
assert.deepEqual(
  evaluateLicenseExpression("MIT OR Apache-2.0").expression_tree,
  evaluateLicenseExpression("Apache-2.0 OR MIT").expression_tree,
);

const unapproved = evaluateLicenseExpression("BSD-1-Clause");
assert.equal(unapproved.status, "needs-user-decision");
assert.deepEqual(unapproved.reason_codes, ["unapproved-license-identifier"]);

const unknown = evaluateLicenseExpression("Vendor-License");
assert.equal(unknown.status, "needs-user-decision");
assert.deepEqual(unknown.reason_codes, ["unknown-license-identifier"]);

const copyleft = evaluateLicenseExpression("GPL-3.0-only");
assert.equal(copyleft.status, "needs-user-decision");
assert.deepEqual(copyleft.reason_codes, ["copyleft-or-reciprocal-license"]);
assert.equal(evaluateLicenseExpression("LGPL-2.1-or-later").status, "needs-user-decision");
assert.equal(evaluateLicenseExpression("MPL-2.0").status, "needs-user-decision");

const unknownException = evaluateLicenseExpression("MIT WITH Future-exception");
assert.equal(unknownException.status, "needs-user-decision");
assert.deepEqual(unknownException.reason_codes, ["unknown-spdx-exception"]);
assert.equal(evaluateLicenseExpression("MIT WITH LLVM-exception").status, "needs-user-decision");

const invalid = evaluateLicenseExpression("MIT / Apache-2.0");
assert.equal(invalid.status, "invalid-metadata");
assert.deepEqual(invalid.reason_codes, ["invalid-spdx-syntax"]);
assert.notEqual(invalid.status, "needs-user-decision");

assert(SPDX_LICENSE_IDENTIFIER_CATALOGUE.has("LGPL-2.1-or-later"));
assert(SPDX_EXCEPTION_IDENTIFIER_CATALOGUE.has("LLVM-exception"));
assert(!LICENSE_POLICY_ALLOWLIST.includes("LGPL-2.1-or-later"));
assert(!LICENSE_POLICY_ALLOWLIST.includes("BSD-1-Clause"));
assert(LICENSE_POLICY_ALLOWLIST.every((identifier) => SPDX_LICENSE_IDENTIFIER_CATALOGUE.has(identifier)));

const context = fixtureContext();
const document = createSpdxDocument(context);
const inventory = createLicenseInventory(context);
validateInventoryAndSbom(inventory, document);
const policy = createLicensePolicyArtifact(inventory, document, {
  inventorySha256: "2".repeat(64),
  sbomSha256: "3".repeat(64),
});
const thirdParty = createThirdPartyLicenseArtifact(inventory, document, {
  inventorySha256: "2".repeat(64),
});
assert.equal(policy.gate_status, "PASS");
assert.deepEqual(policy.policy.allowlist, LICENSE_POLICY_ALLOWLIST);
assert(policy.policy.syntax_catalogue.includes("LGPL-2.1-or-later"));
assert(!policy.policy.allowlist.includes("LGPL-2.1-or-later"));
assert.equal(thirdParty.collection_status, "complete");
enforceLicensePolicy(policy, thirdParty);
assert.deepEqual(policy, createLicensePolicyArtifact(inventory, document, {
  inventorySha256: "2".repeat(64),
  sbomSha256: "3".repeat(64),
}));
assert.deepEqual(thirdParty, createThirdPartyLicenseArtifact(inventory, document, {
  inventorySha256: "2".repeat(64),
}));

const sourceEvidenceRoot = mkdtempSync(resolve(tmpdir(), "snwc-license-policy-source-"));
try {
  const licenseText = "Example upstream license text\n";
  writeFileSync(resolve(sourceEvidenceRoot, "LICENSE"), licenseText);
  const collectedInventory = clone(inventory);
  collectedInventory.components.find((entry) => entry.name === "example-dependency").license_text_files = [{
    path: "LICENSE",
    sha256: createHash("sha256").update(licenseText).digest("hex"),
  }];
  const collectedThirdParty = createThirdPartyLicenseArtifact(collectedInventory, document, {
    inventorySha256: "2".repeat(64),
    cargoMetadata: [{ packages: [{ name: "example-dependency", version: "1.2.3", source: REGISTRY, manifest_path: resolve(sourceEvidenceRoot, "Cargo.toml") }] }],
  });
  assert.equal(collectedThirdParty.text_content_status, "collected");
  assert.equal(collectedThirdParty.final_release_text_gate.status, "ready");
  assert.equal(collectedThirdParty.components[0].license_texts[0].text, licenseText);
  enforceLicensePolicy(policy, collectedThirdParty, true);
} finally {
  rmSync(sourceEvidenceRoot, { recursive: true, force: true });
}

const missingTextInventory = clone(inventory);
const missingTextComponent = missingTextInventory.components.find((entry) => entry.name === "example-dependency");
missingTextComponent.license_text_status = "missing";
missingTextComponent.license_text_files = [];
missingTextComponent.clarification_reason = "no source license text for MIT";
const missingTextDocument = clone(document);
const missingTextPolicy = createLicensePolicyArtifact(missingTextInventory, missingTextDocument);
const missingTextThirdParty = createThirdPartyLicenseArtifact(missingTextInventory, missingTextDocument);
assert.equal(missingTextPolicy.gate_status, "PASS");
assert.equal(missingTextPolicy.components.find((entry) => entry.name === "example-dependency").policy_status, "allowed");
assert.equal(missingTextThirdParty.collection_status, "incomplete");
enforceLicensePolicy(missingTextPolicy, missingTextThirdParty);
expectFailure("final missing license text gate", () => enforceLicensePolicy(missingTextPolicy, missingTextThirdParty, true), /incomplete/);

const unresolvedContext = clone(context);
const unresolvedComponent = unresolvedContext.components.find((entry) => entry.name === "example-dependency");
unresolvedComponent.license_expression = null;
unresolvedComponent.declared_license_metadata = "Vendor-License";
unresolvedComponent.generator_license_expression = "Vendor-License";
unresolvedComponent.license_status = "unknown";
unresolvedComponent.license_text_status = "unavailable";
unresolvedComponent.license_text_files = [];
unresolvedComponent.clarification_reason = "Cargo package license metadata is not a valid SPDX expression";
const unresolvedDocument = createSpdxDocument(unresolvedContext);
const unresolvedInventory = createLicenseInventory(unresolvedContext);
const unresolvedPolicy = createLicensePolicyArtifact(unresolvedInventory, unresolvedDocument);
assert.equal(unresolvedPolicy.gate_status, "NEEDS USER DECISION");
assert(unresolvedPolicy.needs_user_decision.some((entry) => entry.reason === "unknown-license-identifier"));
expectFailure("unresolved unknown license", () => enforceLicensePolicy(unresolvedPolicy, createThirdPartyLicenseArtifact(unresolvedInventory, unresolvedDocument)), /NEEDS USER DECISION/);

const tamperedInventory = clone(inventory);
tamperedInventory.components.find((entry) => entry.name === "example-dependency").license_expression = "MIT";
expectFailure("inventory and SBOM mismatch", () => validateInventoryAndSbom(tamperedInventory, document), /identity mismatch|license mismatch/);

const futureContext = fixtureContext(true);
const futureDocument = createSpdxDocument(futureContext);
const futureInventory = createLicenseInventory(futureContext);
const futurePolicy = createLicensePolicyArtifact(futureInventory, futureDocument);
const futureThirdParty = createThirdPartyLicenseArtifact(futureInventory, futureDocument);
assert.equal(futurePolicy.gate_status, "NEEDS USER DECISION");
assert(futurePolicy.needs_user_decision.some((entry) => entry.reason === "copyleft-or-reciprocal-license"));
expectFailure("new unapproved dependency license", () => enforceLicensePolicy(futurePolicy, futureThirdParty), /NEEDS USER DECISION/);

const normalizationRoot = mkdtempSync(resolve(tmpdir(), "snwc-license-policy-normalization-"));
try {
  writeFileSync(resolve(normalizationRoot, "LICENSE-APACHE"), "Apache license evidence\n");
  writeFileSync(resolve(normalizationRoot, "LICENSE-MIT"), "MIT license evidence\n");
  const packageData = {
    name: "curve25519-dalek-derive",
    version: "0.1.1",
    source: REGISTRY,
    license: "MIT/Apache-2.0",
    repository: "https://github.com/dalek-cryptography/curve25519-dalek",
    manifest_path: resolve(normalizationRoot, "Cargo.toml"),
  };
  const normalized = buildCargoComponents(
    { packages: [{ packageData, roles: new Set(["native"]) }] },
    new Map([[`cargo|${packageData.name}|${packageData.version}|${REGISTRY}`, { checksum: DEPENDENCY_HASH }]]),
    COMMIT,
    CARGO_LOCK,
  )[0];
  assert.equal(normalized.declared_license_metadata, "MIT/Apache-2.0");
  assert.equal(normalized.license_expression, "MIT OR Apache-2.0");
  assert.deepEqual(normalized.license_normalization, {
    applied: true,
    basis: {
      type: "upstream-package-metadata-and-license-files",
      repository: "https://github.com/dalek-cryptography/curve25519-dalek",
      declared_license_metadata: "MIT/Apache-2.0",
      license_text_files: ["LICENSE-APACHE", "LICENSE-MIT"],
      normalized_spdx_expression: "MIT OR Apache-2.0",
    },
  });
} finally {
  rmSync(normalizationRoot, { recursive: true, force: true });
}

process.stdout.write("release license policy deterministic and negative tests passed\n");

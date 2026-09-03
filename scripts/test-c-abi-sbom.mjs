import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  createCAbiEvidence,
} from "./c-abi-sbom.mjs";

const COMMIT = "be840630e3468515cf197cb1b865372dc002f9d8";
const LOCK_HASH = "b".repeat(64);
const VERSION = "0.1.0";
const REGISTRY = "registry+https://github.com/rust-lang/crates.io-index";

function id(name, version, source) {
  return `cargo|${name}|${version}|${source}`;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function component(name, version, source, targets, license, spdxId) {
  return {
    ecosystem: "cargo",
    name,
    version,
    source,
    spdx_id: spdxId,
    license_expression: license,
    declared_license_metadata: license,
    generator_license_expression: license,
    license_status: "resolved",
    license_text_status: "resolved",
    license_text_files: [{ path: "LICENSE", sha256: digest("MIT license\n") }],
    clarification_reason: null,
    license_normalization: { applied: false, basis: null },
    artifact_roles: ["c-abi-runtime"],
    target_ids: targets,
  };
}

const rootDir = mkdtempSync(resolve(tmpdir(), "snwc-c-abi-sbom-test-"));
try {
  mkdirSync(resolve(rootDir, "registry"), { recursive: true });
  writeFileSync(resolve(rootDir, "registry/LICENSE"), "MIT license\n");
  const root = component("symbol-nem-wallet-core-native", VERSION, "path:crates/c-abi", ["darwin-x64", "linux-x64-gnu"], "MIT", "SPDXRef-Package-root");
  const core = component("symbol-nem-wallet-core", VERSION, "path:crates/core", ["darwin-x64", "linux-x64-gnu"], "MIT", "SPDXRef-Package-core");
  const dependency = component("fixture-runtime", "1.2.3", REGISTRY, ["linux-x64-gnu"], "MIT OR Apache-2.0", "SPDXRef-Package-dependency");
  const devOnly = component("fixture-dev-only", "9.9.9", REGISTRY, [], "MIT", "SPDXRef-Package-dev");
  const context = {
    packageVersion: VERSION,
    sourceCommit: COMMIT,
    mode: "candidate",
    releaseTag: null,
    cargoLockSha256: LOCK_HASH,
    components: [root, core, dependency],
    edges: [
      { source: id(root.name, root.version, root.source), target: id(core.name, core.version, core.source) },
      { source: id(core.name, core.version, core.source), target: id(dependency.name, dependency.version, dependency.source) },
    ],
    targetClosures: [
      { target_id: "darwin-x64", rust_target: "x86_64-apple-darwin", component_identities: [id(root.name, root.version, root.source), id(core.name, core.version, core.source)], edges: [`${id(root.name, root.version, root.source)}\n${id(core.name, core.version, core.source)}`] },
      { target_id: "linux-x64-gnu", rust_target: "x86_64-unknown-linux-gnu", component_identities: [id(root.name, root.version, root.source), id(core.name, core.version, core.source), id(dependency.name, dependency.version, dependency.source)], edges: [`${id(root.name, root.version, root.source)}\n${id(core.name, core.version, core.source)}`, `${id(core.name, core.version, core.source)}\n${id(dependency.name, dependency.version, dependency.source)}`] },
    ],
    packageDescriptions: new Map(),
    metadataComponents: [
      { ...root, manifest_path: resolve(rootDir, "Cargo.toml"), packageData: {} },
      { ...core, manifest_path: resolve(rootDir, "Cargo.toml"), packageData: {} },
      { ...dependency, manifest_path: resolve(rootDir, "registry/Cargo.toml"), packageData: {} },
    ],
  };
  const first = createCAbiEvidence(context);
  const second = createCAbiEvidence(context);
  assert.deepEqual(first, second, "C ABI SBOM/evidence generation must be deterministic");
  assert.equal(first.sbom.spdxVersion, "SPDX-2.3");
  assert.equal(first.sbom.packages.length, 3);
  assert.equal(first.sbom.relationships.filter((relationship) => relationship.relationshipType === "DEPENDS_ON").length, 2);
  assert.equal(first.inventory.components.length, 3);
  assert.equal(first.inventory.target_closures.find((entry) => entry.target_id === "darwin-x64").component_identities.length, 2);
  assert.equal(first.inventory.target_closures.find((entry) => entry.target_id === "linux-x64-gnu").component_identities.length, 3);
  assert.equal(first.inventory.components.some((entry) => entry.name === devOnly.name), false, "dev-only packages must not enter runtime closure");
  assert.equal(first.policy.gate_status, "PASS");
  assert.equal(first.thirdParty.collection_status, "complete");
  assert.equal(first.thirdParty.text_content_status, "collected");

  const unapproved = structuredClone(context);
  unapproved.components = unapproved.components.map((entry) => entry.name === dependency.name ? { ...entry, license_expression: "GPL-3.0-only", declared_license_metadata: "GPL-3.0-only", generator_license_expression: "GPL-3.0-only" } : entry);
  unapproved.metadataComponents = unapproved.components.map((entry) => ({ ...entry, manifest_path: resolve(rootDir, "registry/Cargo.toml"), packageData: {} }));
  assert.equal(createCAbiEvidence(unapproved).policy.gate_status, "NEEDS USER DECISION");

  const malformed = structuredClone(context);
  malformed.components = malformed.components.map((entry) => entry.name === dependency.name ? { ...entry, license_expression: null, declared_license_metadata: "MIT / Apache-2.0", generator_license_expression: null } : entry);
  malformed.metadataComponents = context.metadataComponents;
  assert.equal(createCAbiEvidence(malformed).policy.gate_status, "FAIL");
} finally {
  rmSync(rootDir, { recursive: true, force: true });
}

process.stdout.write("C ABI SBOM and license-policy deterministic tests passed\n");

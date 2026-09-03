import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import {
  ARCHIVE_FORMAT,
  C_ABI_TARGET_ORDER,
  C_ABI_TARGETS,
  aggregateCAbiArtifacts,
  canonicalTextBytes,
  cAbiArchiveFilename,
  createTarGz,
  parseTarGz,
  validateTargetEvidence,
  validateTargetEvidenceSet,
} from "./c-abi-release.mjs";
import { cargoLockDigest, validateCAbiEvidenceIdentity } from "./c-abi-sbom.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const COMMIT = "be840630e3468515cf197cb1b865372dc002f9d8";
const VERSION = "0.1.0";
const LOCK_HASH = cargoLockDigest();

const lineEndingFixture = mkdtempSync(resolve(tmpdir(), "snwc-c-abi-line-ending-test-"));
try {
  const path = resolve(lineEndingFixture, "header.h");
  writeFileSync(path, "#ifndef FIXTURE\r\n#define FIXTURE\r\n#endif\r\n");
  assert.equal(canonicalTextBytes(path).toString("utf8"), "#ifndef FIXTURE\n#define FIXTURE\n#endif\n");
} finally {
  rmSync(lineEndingFixture, { recursive: true, force: true });
}

function expectFailure(callback, pattern = /C ABI .*gate failed/) {
  assert.throws(callback, (error) => pattern.test(String(error?.message)), "expected C ABI release gate failure");
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fixtureTarget(targetId, extraEntries = {}) {
  const target = C_ABI_TARGETS[targetId];
  const header = Buffer.from("/* canonical C ABI header fixture */\n");
  const license = Buffer.from("MIT License\n\nCopyright (c) 2026 ccHarvestasya\n");
  const staticLibrary = Buffer.from(`static-${targetId}\n`);
  const dynamicLibrary = Buffer.from(`dynamic-${targetId}\n`);
  const companions = new Map(target.companion_libraries.map((name) => [name, Buffer.from(`companion-${name}\n`)]));
  const common = {
    schema_version: 1,
    artifact_kind: "c-abi-artifact",
    project_name: "symbol-nem-wallet-core",
    package_name: "symbol-nem-wallet-core-native",
    npm_package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    mode: "candidate",
    release_tag: null,
    source_commit: COMMIT,
    target_id: targetId,
    rust_target: target.rust_target,
    runner: target.runner,
    platform: target.platform,
    toolchain_identifier: "rustc 1.90.0 (fixture)",
    build_mode: "release",
    cargo_lock_sha256: LOCK_HASH,
    header: { filename: "symbol_nem_wallet_core.h", sha256: hash(header) },
    license: { filename: "LICENSE", sha256: hash(license) },
    static_library: { filename: target.static_library, sha256: hash(staticLibrary) },
    dynamic_library: { filename: target.dynamic_library, sha256: hash(dynamicLibrary) },
    companion_libraries: target.companion_libraries.map((filename) => ({ filename, sha256: hash(companions.get(filename)) })),
  };
  if (target.glibc_baseline !== undefined) {
    common.glibc_baseline = target.glibc_baseline;
    common.max_required_glibc_symbol = "2.17";
  }
  const archiveFilename = cAbiArchiveFilename(VERSION, targetId);
  const metadata = { ...common, archive: { filename: archiveFilename } };
  const entries = {
    "include/symbol_nem_wallet_core.h": header,
    [`lib/static/${target.static_library}`]: staticLibrary,
    [`lib/dynamic/${target.dynamic_library}`]: dynamicLibrary,
    ...Object.fromEntries(target.companion_libraries.map((name) => [`lib/dynamic/${name}`, companions.get(name)])),
    LICENSE: license,
    "metadata/c-abi-artifact.json": Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`),
    ...extraEntries,
  };
  const archive = createTarGz(entries);
  return {
    evidence: { ...common, archive: { filename: archiveFilename, sha256: hash(archive) } },
    archive,
  };
}

assert.deepEqual(C_ABI_TARGET_ORDER, ["win32-x64-msvc", "darwin-x64", "darwin-arm64", "linux-x64-gnu"]);
assert.equal(ARCHIVE_FORMAT, "tar.gz");
assert.deepEqual(
  Object.fromEntries(C_ABI_TARGET_ORDER.map((targetId) => [targetId, [C_ABI_TARGETS[targetId].rust_target, C_ABI_TARGETS[targetId].static_library, C_ABI_TARGETS[targetId].dynamic_library]])),
  {
    "win32-x64-msvc": ["x86_64-pc-windows-msvc", "symbol_nem_wallet_core_native.lib", "symbol_nem_wallet_core_native.dll"],
    "darwin-x64": ["x86_64-apple-darwin", "libsymbol_nem_wallet_core_native.a", "libsymbol_nem_wallet_core_native.dylib"],
    "darwin-arm64": ["aarch64-apple-darwin", "libsymbol_nem_wallet_core_native.a", "libsymbol_nem_wallet_core_native.dylib"],
    "linux-x64-gnu": ["x86_64-unknown-linux-gnu", "libsymbol_nem_wallet_core_native.a", "libsymbol_nem_wallet_core_native.so"],
  },
);
assert.deepEqual(C_ABI_TARGETS["win32-x64-msvc"].companion_libraries, ["symbol_nem_wallet_core_native.dll.lib"]);

const root = mkdtempSync(resolve(tmpdir(), "snwc-c-abi-release-test-"));
try {
  const entries = [];
  for (const targetId of C_ABI_TARGET_ORDER) {
    const fixture = fixtureTarget(targetId);
    const targetDir = resolve(root, "input", targetId);
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(resolve(targetDir, fixture.evidence.archive.filename), fixture.archive);
    writeFileSync(resolve(targetDir, "c-abi-artifact.json"), `${JSON.stringify(fixture.evidence, null, 2)}\n`);
    entries.push({ evidence: fixture.evidence, archivePath: resolve(targetDir, fixture.evidence.archive.filename) });
    assert.deepEqual(parseTarGz(fixture.archive).get("include/symbol_nem_wallet_core.h"), Buffer.from("/* canonical C ABI header fixture */\n"));
    validateTargetEvidence(fixture.evidence, { archivePath: resolve(targetDir, fixture.evidence.archive.filename), verifyVersionSources: true });
  }
  validateTargetEvidenceSet(entries, { sourceRoot: repositoryRoot, packageVersion: VERSION, sourceCommit: COMMIT, mode: "candidate", releaseTag: null });
  assert.equal(new Set(entries.map((entry) => entry.evidence.header.sha256)).size, 1);

  const duplicate = [...entries.slice(0, 3), entries[0]];
  expectFailure(() => validateTargetEvidenceSet(duplicate, { packageVersion: VERSION, sourceCommit: COMMIT }), /duplicate|incomplete/);
  const wrongSource = entries.map((entry) => ({ ...entry, evidence: { ...entry.evidence, source_commit: "a".repeat(40) } }));
  expectFailure(() => validateTargetEvidenceSet(wrongSource, { packageVersion: VERSION, sourceCommit: COMMIT }), /identity/);
  const wrongHeader = entries.map((entry, index) => index === 1 ? ({ ...entry, evidence: { ...entry.evidence, header: { ...entry.evidence.header, sha256: "f".repeat(64) } } }) : entry);
  expectFailure(() => validateTargetEvidenceSet(wrongHeader, { packageVersion: VERSION, sourceCommit: COMMIT }), /hash|identity/);
  const wrongDigest = { ...entries[0].evidence, archive: { ...entries[0].evidence.archive, sha256: "0".repeat(64) } };
  expectFailure(() => validateTargetEvidence(wrongDigest, { archivePath: entries[0].archivePath, verifyVersionSources: false }), /hash/);
  const wrongVersion = { ...entries[0].evidence, package_version: "9.9.9", archive: { ...entries[0].evidence.archive, filename: cAbiArchiveFilename("9.9.9", entries[0].evidence.target_id) } };
  expectFailure(() => validateTargetEvidence(wrongVersion, { archivePath: entries[0].archivePath, verifyVersionSources: true }), /version|filename|identity/);
  const missingCompanion = { ...entries[0].evidence, companion_libraries: [] };
  expectFailure(() => validateTargetEvidence(missingCompanion, { archivePath: entries[0].archivePath, verifyVersionSources: false }), /companion/);

  const unsafe = gunzipSync(readFileSync(entries[1].archivePath));
  Buffer.from("../escape").copy(unsafe, 0, 0, 9);
  expectFailure(() => parseTarGz(gzipSync(unsafe)), /safe relative path|checksum/);
  const withNode = fixtureTarget("darwin-x64", { "unexpected.node": Buffer.from("node") });
  expectFailure(() => validateTargetEvidence(withNode.evidence, { archivePath: (() => { const path = resolve(root, withNode.evidence.archive.filename); writeFileSync(path, withNode.archive); return path; })(), verifyVersionSources: false }), /inventory/);
  const withRlib = fixtureTarget("darwin-x64", { "lib/static/unexpected.rlib": Buffer.from("rlib") });
  expectFailure(() => validateTargetEvidence(withRlib.evidence, { archivePath: (() => { const path = resolve(root, withRlib.evidence.archive.filename); writeFileSync(path, withRlib.archive); return path; })(), verifyVersionSources: false }), /inventory/);

  const evidence = {
    sbom: { SPDXID: "SPDXRef-DOCUMENT", spdxVersion: "SPDX-2.3", packages: [], relationships: [], documentNamespace: `https://spdx.org/spdxdocs/symbol-nem-wallet-core-c-abi-${VERSION}-${COMMIT}` },
    inventory: { schema_version: 1, inventory_kind: "c-abi-license", package_name: "symbol-nem-wallet-core-native", npm_package_name: "@nemnesia/symbol-nem-wallet-core", package_version: VERSION, mode: "candidate", release_tag: null, source_commit: COMMIT, cargo_lock_sha256: LOCK_HASH, sbom_file: "c-abi-sbom.spdx.json", components: [], target_closures: [] },
    policy: { schema_version: 1, artifact_kind: "c-abi-license-policy", package_name: "symbol-nem-wallet-core-native", npm_package_name: "@nemnesia/symbol-nem-wallet-core", package_version: VERSION, mode: "candidate", release_tag: null, source_commit: COMMIT, gate_status: "PASS", inventory_sha256: null, sbom_sha256: null },
    thirdParty: { schema_version: 1, artifact_kind: "c-abi-third-party-license-notice-evidence", package_name: "symbol-nem-wallet-core-native", npm_package_name: "@nemnesia/symbol-nem-wallet-core", package_version: VERSION, mode: "candidate", release_tag: null, source_commit: COMMIT, components: [] },
  };
  validateCAbiEvidenceIdentity({ ...evidence, packageVersion: VERSION, sourceCommit: COMMIT, mode: "candidate", releaseTag: null });
  const extra = entries.map((entry) => ({ evidence: entry.evidence, archivePath: entry.archivePath }));
  assert.equal(extra.length, 4);
  assert.equal(readdirSync(resolve(root, "input")).length, 4);
  assert.equal(existsSync(resolve(root, "input", "linux-x64-gnu")), true);

  const sbomPath = resolve(root, "c-abi-sbom.spdx.json");
  const inventoryPath = resolve(root, "c-abi-license-inventory.json");
  const policyPath = resolve(root, "c-abi-license-policy.json");
  const thirdPartyPath = resolve(root, "c-abi-third-party-licenses.json");
  const sbomSumsPath = resolve(root, "C-ABI-SBOM-SHA256SUMS");
  const policySumsPath = resolve(root, "C-ABI-LICENSE-POLICY-SHA256SUMS");
  writeFileSync(sbomPath, `${JSON.stringify(evidence.sbom, null, 2)}\n`);
  writeFileSync(inventoryPath, `${JSON.stringify({ ...evidence.inventory, cargo_lock_sha256: LOCK_HASH }, null, 2)}\n`);
  writeFileSync(policyPath, `${JSON.stringify({ ...evidence.policy, inventory_sha256: hash(readFileSync(inventoryPath)), sbom_sha256: hash(readFileSync(sbomPath)) }, null, 2)}\n`);
  writeFileSync(thirdPartyPath, `${JSON.stringify({ ...evidence.thirdParty, inventory_sha256: hash(readFileSync(inventoryPath)) }, null, 2)}\n`);
  writeFileSync(sbomSumsPath, `${hash(readFileSync(sbomPath))}  c-abi-sbom.spdx.json\n${hash(readFileSync(inventoryPath))}  c-abi-license-inventory.json\n`);
  writeFileSync(policySumsPath, `${hash(readFileSync(policyPath))}  c-abi-license-policy.json\n${hash(readFileSync(thirdPartyPath))}  c-abi-third-party-licenses.json\n`);
  const aggregate = aggregateCAbiArtifacts({
    inputDir: resolve(root, "input"),
    outputDir: resolve(root, "output"),
    packageVersion: VERSION,
    sourceCommit: COMMIT,
    mode: "candidate",
    releaseTag: null,
    sourceRoot: repositoryRoot,
    evidencePaths: { sbom: sbomPath, inventory: inventoryPath, sbom_sums: sbomSumsPath, policy: policyPath, third_party: thirdPartyPath, policy_sums: policySumsPath },
  });
  assert.equal(aggregate.manifest.targets.length, 4);
  assert.equal(aggregate.manifest.archive_format, "tar.gz");
  assert.equal(readdirSync(resolve(root, "output")).length, 16);
  writeFileSync(inventoryPath, "tampered\n");
  expectFailure(() => aggregateCAbiArtifacts({ inputDir: resolve(root, "input"), outputDir: resolve(root, "output-tampered"), packageVersion: VERSION, sourceCommit: COMMIT, sourceRoot: repositoryRoot, evidencePaths: { sbom: sbomPath, inventory: inventoryPath, sbom_sums: sbomSumsPath, policy: policyPath, third_party: thirdPartyPath, policy_sums: policySumsPath } }), /digest|identity|unreadable/);
} finally {
  rmSync(root, { recursive: true, force: true });
}

const workflow = readFileSync(resolve(repositoryRoot, ".github/workflows/c-abi-release.yml"), "utf8");
assert.match(workflow, /workflow_call:/);
for (const [targetId, target] of Object.entries(C_ABI_TARGETS)) {
  assert.match(workflow, new RegExp(`target_id: ${targetId}`));
  assert.match(workflow, new RegExp(`rust_target: ${target.rust_target}`));
  assert.match(workflow, new RegExp(`runner: ${target.runner}`));
}
assert.match(workflow, /--require-third-party-license-text/);
assert.doesNotMatch(workflow, /^\s+environment:/m);
assert.match(workflow, /permissions:\n\s+contents: read/);
assert.doesNotMatch(workflow, /packages:\s*write|actions:\s*write|id-token:\s*write|npm publish/);
const releaseWorkflow = readFileSync(resolve(repositoryRoot, ".github/workflows/release.yml"), "utf8");
assert.match(releaseWorkflow, /uses: \.\/\.github\/workflows\/c-abi-release\.yml/);
assert.match(readFileSync(resolve(repositoryRoot, "docs/migration/c-abi-release-assets.md"), "utf8"), /Android \/ iOS C ABI release: DEFERRED — MosaicLynx integration/);

process.stdout.write("C ABI release deterministic and negative tests passed\n");

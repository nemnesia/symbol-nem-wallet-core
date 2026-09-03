import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import {
  C_ABI_TARGET_ORDER,
} from "./c-abi-targets.mjs";
import {
  createReleaseRecord,
  NPM_REQUIRED_FILES,
  validateReleaseRecord,
} from "./release-record.mjs";
import { assemblePublicationAssets } from "./release-publication.mjs";
import {
  loadThirdPartyLicenseEvidence,
  readThirdPartyLicenseText,
  thirdPartyLicenseEvidenceMetadata,
  validateThirdPartyLicenseEvidenceMetadata,
} from "./third-party-license-evidence.mjs";

const VERSION = "0.1.0";
const COMMIT = "a".repeat(40);
const CARGO_LOCK = "b".repeat(64);
const PNPM_LOCK = "c".repeat(64);
const root = resolve(tmpdir(), `snwc-release-record-${process.pid}`);
const npmDir = resolve(root, "npm");
const cAbiDir = resolve(root, "c-abi");
const outputDir = resolve(root, "record");

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(path, value) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function write(path, value) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, value);
}

function fixture() {
  mkdirSync(npmDir, { recursive: true });
  mkdirSync(cAbiDir, { recursive: true });
  const npmTarball = "nemnesia-symbol-nem-wallet-core-0.1.0.tgz";
  const npmManifest = {
    schema_version: 1,
    mode: "candidate",
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    source_commit: COMMIT,
    cargo_lock_sha256: CARGO_LOCK,
    pnpm_lock_sha256: PNPM_LOCK,
    toolchains: {
      rust: { identifier: "rustc 1.90.0" },
      node: { version: "v24.0.0" },
      npm: { version: "11.0.0" },
      pnpm: { version: "11.18.0" },
    },
    npm_tarball: {
      filename: npmTarball,
      package_name: "@nemnesia/symbol-nem-wallet-core",
      package_version: VERSION,
      sha256: "0".repeat(64),
    },
  };
  writeJson(resolve(npmDir, "release-manifest.json"), npmManifest);
  const tarball = Buffer.from("npm tarball fixture\n");
  write(resolve(npmDir, npmTarball), tarball);
  npmManifest.npm_tarball.sha256 = hash(tarball);
  writeJson(resolve(npmDir, "release-manifest.json"), npmManifest);
  writeJson(resolve(npmDir, "release-source.json"), {
    source_commit: COMMIT,
    package_version: VERSION,
    cargo_lock_sha256: CARGO_LOCK,
    pnpm_lock_sha256: PNPM_LOCK,
  });
  for (const filename of NPM_REQUIRED_FILES) {
    if (filename === "release-manifest.json" || filename === "release-source.json") continue;
    write(resolve(npmDir, filename), `${filename}\n`);
  }
  writeJson(resolve(npmDir, "license-inventory.json"), {
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    source_commit: COMMIT,
    cargo_lock_sha256: CARGO_LOCK,
  });
  writeJson(resolve(npmDir, "license-policy.json"), {
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    source_commit: COMMIT,
    gate_status: "PASS",
  });
  writeJson(resolve(npmDir, "THIRD_PARTY_LICENSES.json"), {
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    source_commit: COMMIT,
    final_release_text_gate: { status: "ready" },
  });
  const npmSums = `${hash(tarball)}  ${npmTarball}\n${hash(readFileSync(resolve(npmDir, "release-manifest.json")))}  release-manifest.json\n`;
  write(resolve(npmDir, "SHA256SUMS"), npmSums);

  const cAbiManifest = {
    schema_version: 1,
    artifact_kind: "c-abi-release-manifest",
    project_name: "symbol-nem-wallet-core",
    package_name: "symbol-nem-wallet-core-native",
    npm_package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    mode: "candidate",
    release_tag: null,
    source_commit: COMMIT,
    cargo_lock_sha256: CARGO_LOCK,
    archive_format: "tar.gz",
    target_order: [...C_ABI_TARGET_ORDER],
    targets: [],
    evidence: {},
  };
  for (const targetId of C_ABI_TARGET_ORDER) {
    const archive = `symbol-nem-wallet-core-c-abi-${VERSION}-${targetId}.tar.gz`;
    const evidence = `c-abi-artifact-${targetId}.json`;
    write(resolve(cAbiDir, archive), `${archive}\n`);
    write(resolve(cAbiDir, evidence), `${evidence}\n`);
    cAbiManifest.targets.push({
      target_id: targetId,
      rust_target: `fixture-${targetId}`,
      archive: { filename: archive, sha256: hash(readFileSync(resolve(cAbiDir, archive))) },
      evidence: { filename: evidence, sha256: hash(readFileSync(resolve(cAbiDir, evidence))) },
    });
  }
  const evidenceFiles = {
    sbom: "c-abi-sbom.spdx.json",
    inventory: "c-abi-license-inventory.json",
    sbom_sums: "C-ABI-SBOM-SHA256SUMS",
    policy: "c-abi-license-policy.json",
    third_party: "c-abi-third-party-licenses.json",
    policy_sums: "C-ABI-LICENSE-POLICY-SHA256SUMS",
  };
  writeJson(resolve(cAbiDir, evidenceFiles.sbom), { SPDXID: "SPDXRef-DOCUMENT", spdxVersion: "SPDX-2.3" });
  writeJson(resolve(cAbiDir, evidenceFiles.inventory), { package_name: "symbol-nem-wallet-core-native", npm_package_name: "@nemnesia/symbol-nem-wallet-core", package_version: VERSION, source_commit: COMMIT, cargo_lock_sha256: CARGO_LOCK });
  writeJson(resolve(cAbiDir, evidenceFiles.policy), { package_name: "symbol-nem-wallet-core-native", npm_package_name: "@nemnesia/symbol-nem-wallet-core", package_version: VERSION, source_commit: COMMIT, gate_status: "PASS" });
  writeJson(resolve(cAbiDir, evidenceFiles.third_party), { package_name: "symbol-nem-wallet-core-native", npm_package_name: "@nemnesia/symbol-nem-wallet-core", package_version: VERSION, source_commit: COMMIT, final_release_text_gate: { status: "ready" } });
  for (const filename of [evidenceFiles.sbom_sums, evidenceFiles.policy_sums]) write(resolve(cAbiDir, filename), `${filename}\n`);
  for (const [key, filename] of Object.entries(evidenceFiles)) cAbiManifest.evidence[key] = { filename, sha256: hash(readFileSync(resolve(cAbiDir, filename))) };
  writeJson(resolve(cAbiDir, "c-abi-release-manifest.json"), cAbiManifest);
  const sums = [];
  for (const target of cAbiManifest.targets) sums.push(target.archive, target.evidence);
  for (const evidence of Object.values(cAbiManifest.evidence)) sums.push(evidence);
  sums.push({ filename: "c-abi-release-manifest.json", sha256: hash(readFileSync(resolve(cAbiDir, "c-abi-release-manifest.json"))) });
  write(resolve(cAbiDir, "C-ABI-SHA256SUMS"), `${sums.map((entry) => `${entry.sha256}  ${entry.filename}`).join("\n")}\n`);
}

function expectFailure(label, callback, pattern = /Release record gate failed/) {
  assert.throws(callback, pattern, label);
}

try {
  fixture();
  const generated = createReleaseRecord({ npmDir, cAbiDir, outputDir, mode: "candidate", tag: null, sourceCommit: COMMIT });
  assert.equal(generated.record.npm.provenance.status, "not-executed");
  assert.equal(generated.record.durable_asset_list.c_abi.length, 16);
  validateReleaseRecord({ npmDir, cAbiDir, outputDir, mode: "candidate", tag: null, sourceCommit: COMMIT });
  expectFailure(
    "candidate tag is rejected",
    () => createReleaseRecord({ npmDir, cAbiDir, outputDir, mode: "candidate", tag: "null", sourceCommit: COMMIT }),
    /candidate release record must not contain a tag/,
  );

  const tampered = JSON.parse(readFileSync(generated.recordPath, "utf8"));
  tampered.source_commit = "d".repeat(40);
  writeJson(generated.recordPath, tampered);
  expectFailure("release record source identity mismatch", () => validateReleaseRecord({ npmDir, cAbiDir, outputDir, mode: "candidate", tag: null, sourceCommit: COMMIT }));
  createReleaseRecord({ npmDir, cAbiDir, outputDir, mode: "candidate", tag: null, sourceCommit: COMMIT });

  const missing = resolve(cAbiDir, "c-abi-sbom.spdx.json");
  rmSync(missing);
  expectFailure("missing required C ABI evidence", () => createReleaseRecord({ npmDir, cAbiDir, outputDir, mode: "candidate", tag: null, sourceCommit: COMMIT }), /missing/);
  fixture();

  const evidence = loadThirdPartyLicenseEvidence()[0];
  expectFailure("modified collected license text", () => readThirdPartyLicenseText({ ...evidence, collected_text_sha256: "0".repeat(64) }), /digest mismatch/);
  const wrongMetadata = { ...thirdPartyLicenseEvidenceMetadata(evidence), upstream_commit: "b".repeat(40) };
  expectFailure("wrong upstream evidence identity", () => validateThirdPartyLicenseEvidenceMetadata({ name: evidence.name, version: evidence.version, source: evidence.source, license_expression: evidence.spdx_license }, wrongMetadata), /identity mismatch/);

  const formalNpmManifest = JSON.parse(readFileSync(resolve(npmDir, "release-manifest.json"), "utf8"));
  formalNpmManifest.mode = "release";
  formalNpmManifest.release_tag = `v${VERSION}`;
  writeJson(resolve(npmDir, "release-manifest.json"), formalNpmManifest);
  const npmTarballPath = resolve(npmDir, formalNpmManifest.npm_tarball.filename);
  write(resolve(npmDir, "SHA256SUMS"), `${hash(readFileSync(npmTarballPath))}  ${formalNpmManifest.npm_tarball.filename}\n${hash(readFileSync(resolve(npmDir, "release-manifest.json")))}  release-manifest.json\n`);
  const formalCAbiManifest = JSON.parse(readFileSync(resolve(cAbiDir, "c-abi-release-manifest.json"), "utf8"));
  formalCAbiManifest.mode = "release";
  formalCAbiManifest.release_tag = `v${VERSION}`;
  writeJson(resolve(cAbiDir, "c-abi-release-manifest.json"), formalCAbiManifest);
  const cAbiSumsPath = resolve(cAbiDir, "C-ABI-SHA256SUMS");
  const cAbiSums = readFileSync(cAbiSumsPath, "utf8").split("\n").map((line) => line.endsWith("  c-abi-release-manifest.json") ? `${hash(readFileSync(resolve(cAbiDir, "c-abi-release-manifest.json")))}  c-abi-release-manifest.json` : line).join("\n");
  write(cAbiSumsPath, cAbiSums);
  expectFailure(
    "published provenance requires collected release evidence",
    () => createReleaseRecord({ npmDir, cAbiDir, outputDir, mode: "release", tag: `v${VERSION}`, sourceCommit: COMMIT, provenanceStatus: "published" }),
    /missing/,
  );

  const provenancePath = resolve(npmDir, "npm-provenance.json");
  writeJson(provenancePath, {
    schema_version: 1,
    artifact_kind: "npm-provenance",
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    release_tag: `v${VERSION}`,
    source_commit: COMMIT,
    environment: "release",
    verification: { status: "PASS" },
  });
  writeJson(resolve(npmDir, "release-operation.json"), {
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    release_tag: `v${VERSION}`,
    source_commit: COMMIT,
    environment: "release",
    provenance: {
      required: true,
      status: "published",
      evidence: { filename: "npm-provenance.json", sha256: hash(readFileSync(provenancePath)) },
    },
    publication: {
      mode: "published",
      repository: "nemnesia/symbol-nem-wallet-core",
      workflow_ref: `nemnesia/symbol-nem-wallet-core/.github/workflows/release.yml@refs/tags/v${VERSION}`,
      workflow_run_id: "123",
      workflow_run_attempt: 1,
    },
  });
  const publishedRecordDir = resolve(root, "published-record");
  const publishedRecord = createReleaseRecord({ npmDir, cAbiDir, outputDir: publishedRecordDir, mode: "release", tag: `v${VERSION}`, sourceCommit: COMMIT, provenanceStatus: "published" });
  validateReleaseRecord({ npmDir, cAbiDir, outputDir: publishedRecordDir, mode: "release", tag: `v${VERSION}`, sourceCommit: COMMIT, provenanceStatus: "published" });
  const publicationDir = resolve(root, "github-release-assets");
  const publication = assemblePublicationAssets({ npmDir, cAbiDir, recordDir: publishedRecordDir, outputDir: publicationDir, tag: `v${VERSION}`, sourceCommit: COMMIT });
  assert.equal(publication.npm_asset_count, 24);
  assert.equal(publication.c_abi_asset_count, 16);
  assert.equal(publication.shared_asset_count, 2);
  assert.equal(publication.asset_count, 42);
  assert.equal(readdirSync(publicationDir).length, publication.asset_count);

  process.stdout.write("release record deterministic and negative tests passed\n");
} finally {
  rmSync(root, { recursive: true, force: true });
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  execFileSync,
} from "node:child_process";
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
import { provenanceIdentities } from "./npm-provenance.mjs";
import { reconstructPublishedNpmBundle } from "./release-recovery.mjs";
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
const recoveryCandidateDir = resolve(root, "recovery-candidate");
const recoveryNpmDir = resolve(root, "recovery-npm");
const recoveryRecordDir = resolve(root, "recovery-record");
const recoveryArchiveRoot = resolve(root, "recovery-archive");
const recoveryRegistryPath = resolve(root, "recovery-registry.tgz");

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
      size: 0,
    },
  };
  writeJson(resolve(npmDir, "release-manifest.json"), npmManifest);
  const tarball = Buffer.from("npm tarball fixture\n");
  write(resolve(npmDir, npmTarball), tarball);
  npmManifest.npm_tarball.sha256 = hash(tarball);
  npmManifest.npm_tarball.size = tarball.length;
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
    publication_mode: "fresh-publish",
    candidate_artifact: null,
    canonical_artifact: {
      source: "registry",
      sha256: hash(readFileSync(npmTarballPath)),
      sha512: "c".repeat(128),
      size: readFileSync(npmTarballPath).length,
      integrity: `sha512-${Buffer.from("c".repeat(128), "hex").toString("base64")}`,
      tarball_url: "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/-/symbol-nem-wallet-core-0.1.0.tgz",
    },
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
      registry_tarball_sha256: hash(readFileSync(npmTarballPath)),
    },
  });
  const operationPath = resolve(npmDir, "release-operation.json");
  const operation = JSON.parse(readFileSync(operationPath, "utf8"));
  writeJson(operationPath, { ...operation, publication: { ...operation.publication, registry_tarball_sha256: "d".repeat(64) } });
  assert.throws(
    () => createReleaseRecord({ npmDir, cAbiDir, outputDir, mode: "release", tag: `v${VERSION}`, sourceCommit: COMMIT, provenanceStatus: "published" }),
    /canonical tarball differs from the release manifest/,
  );
  writeJson(operationPath, operation);
  const publishedRecordDir = resolve(root, "published-record");
  const publishedRecord = createReleaseRecord({ npmDir, cAbiDir, outputDir: publishedRecordDir, mode: "release", tag: `v${VERSION}`, sourceCommit: COMMIT, provenanceStatus: "published" });
  validateReleaseRecord({ npmDir, cAbiDir, outputDir: publishedRecordDir, mode: "release", tag: `v${VERSION}`, sourceCommit: COMMIT, provenanceStatus: "published" });
  const publicationDir = resolve(root, "github-release-assets");
  const publication = assemblePublicationAssets({ npmDir, cAbiDir, recordDir: publishedRecordDir, outputDir: publicationDir, tag: `v${VERSION}`, sourceCommit: COMMIT });
  assert.equal(publication.npm_asset_count, 34);
  assert.equal(publication.c_abi_asset_count, 16);
  assert.equal(publication.shared_asset_count, 2);
  assert.equal(publication.asset_count, 52);
  assert.equal(readdirSync(publicationDir).length, publication.asset_count);

  const recoveryManifest = JSON.parse(readFileSync(resolve(npmDir, "release-manifest.json"), "utf8"));
  for (const filename of [...NPM_REQUIRED_FILES, recoveryManifest.npm_tarball.filename]) {
    write(resolve(recoveryCandidateDir, filename), readFileSync(resolve(npmDir, filename)));
  }
  const recoveryPackageMetadata = JSON.parse(readFileSync(resolve("packages/wallet-core", "package.json"), "utf8"));
  writeJson(resolve(recoveryArchiveRoot, "package/package.json"), recoveryPackageMetadata);
  const nativeTargets = [
    ["win32-x64-msvc", "windows", "x64", "msvc", "x86_64-pc-windows-msvc"],
    ["darwin-x64", "macos", "x64", "darwin", "x86_64-apple-darwin"],
    ["darwin-arm64", "macos", "arm64", "darwin", "aarch64-apple-darwin"],
    ["linux-x64-gnu", "linux", "x64", "gnu", "x86_64-unknown-linux-gnu"],
  ];
  const recoveryNativeManifest = {
    schema_version: 1,
    package_name: recoveryPackageMetadata.name,
    package_version: recoveryPackageMetadata.version,
    source_commit: COMMIT,
    node_api_version: 8,
    artifacts: nativeTargets.map(([targetId, os, cpu, abi, rustTarget]) => {
      const content = Buffer.from(`recovery-${targetId}\n`);
      write(resolve(recoveryArchiveRoot, `package/dist/native/${targetId}/${targetId}.node`), content);
      return {
        target_id: targetId,
        os,
        cpu,
        abi,
        rust_target: rustTarget,
        ...(targetId === "linux-x64-gnu" ? { libc: "glibc" } : {}),
        relative_path: `dist/native/${targetId}/${targetId}.node`,
        artifact_filename: `${targetId}.node`,
        sha256: hash(content),
        toolchain_identifier: "rustc recovery fixture",
      };
    }),
  };
  writeJson(resolve(recoveryArchiveRoot, "package/dist/native/artifact-manifest.json"), recoveryNativeManifest);
  write(resolve(recoveryArchiveRoot, "package/dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm"), Buffer.from("recovery wasm\n"));
  write(resolve(recoveryArchiveRoot, "package/dist/wasm/generated.mjs"), "export const recovery = true;\n");
  execFileSync("tar", ["-czf", recoveryRegistryPath, "-C", recoveryArchiveRoot, "package"]);
  const publishedTarball = readFileSync(recoveryRegistryPath);
  const publishedTarballSha512 = createHash("sha512").update(publishedTarball).digest("hex");
  const recoveryTarballUrl = "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/-/symbol-nem-wallet-core-0.1.0.tgz";
  const recoveryMetadataUrl = "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/0.1.0";
  const recoveryAttestationsUrl = "https://registry.npmjs.org/-/npm/v1/attestations/%40nemnesia%2Fsymbol-nem-wallet-core@0.1.0";
  const recoveryStatement = {
    predicateType: "https://slsa.dev/provenance/v1",
    subject: [{ name: "pkg:npm/%40nemnesia/symbol-nem-wallet-core@0.1.0", digest: { sha512: publishedTarballSha512 } }],
    predicate: {
      buildDefinition: {
        externalParameters: { workflow: { repository: "https://github.com/nemnesia/symbol-nem-wallet-core", path: ".github/workflows/release.yml", ref: `refs/tags/v${VERSION}` } },
        resolvedDependencies: [{ uri: `git+https://github.com/nemnesia/symbol-nem-wallet-core@refs/tags/v${VERSION}`, digest: { gitCommit: COMMIT } }],
      },
      runDetails: { metadata: { invocationId: "https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/123/attempts/1" } },
    },
  };
  const recoveryAttestation = { predicateType: recoveryStatement.predicateType, bundle: { dsseEnvelope: { payload: Buffer.from(JSON.stringify(recoveryStatement), "utf8").toString("base64") } } };
  const recoveryIdentities = provenanceIdentities([recoveryAttestation], {
    packageName: "@nemnesia/symbol-nem-wallet-core",
    version: VERSION,
    tag: `v${VERSION}`,
    sourceCommit: COMMIT,
    repository: "nemnesia/symbol-nem-wallet-core",
    tarballSha512: publishedTarballSha512,
    workflowRunId: "123",
    workflowRunAttempt: 1,
  });
  const recoveryRegistryMetadata = {
    name: recoveryPackageMetadata.name,
    version: recoveryPackageMetadata.version,
    repository: recoveryPackageMetadata.repository,
    dist: { tarball: recoveryTarballUrl, integrity: `sha512-${Buffer.from(publishedTarballSha512, "hex").toString("base64")}`, attestations: { url: recoveryAttestationsUrl } },
  };
  const recoveryProvenanceDocument = {
    schema_version: 1,
    artifact_kind: "npm-provenance",
    package_name: recoveryPackageMetadata.name,
    package_version: VERSION,
    release_tag: `v${VERSION}`,
    source_commit: COMMIT,
    environment: "release",
    publication_mode: "post-publish-recovery",
    candidate_artifact: { sha256: recoveryManifest.npm_tarball.sha256, size: recoveryManifest.npm_tarball.size },
    canonical_artifact: { source: "registry", sha256: hash(publishedTarball), sha512: publishedTarballSha512, size: publishedTarball.length, integrity: recoveryRegistryMetadata.dist.integrity, tarball_url: recoveryTarballUrl },
    registry_metadata: recoveryRegistryMetadata,
    registry: { package_name: recoveryPackageMetadata.name, package_version: VERSION, metadata_url: recoveryMetadataUrl, tarball_url: recoveryTarballUrl, tarball_sha256: hash(publishedTarball), tarball_sha512: publishedTarballSha512, tarball_size: publishedTarball.length, dist_integrity: recoveryRegistryMetadata.dist.integrity, attestations_url: recoveryAttestationsUrl },
    registry_attestations: { attestations: [recoveryAttestation] },
    provenance: { predicate_types: recoveryIdentities.map((identity) => identity.predicate_type), identities: recoveryIdentities },
    verification: { status: "PASS", command: "npm audit signatures --json --include-attestations", npm_version: "11.0.0", target: { package_name: recoveryPackageMetadata.name, package_version: VERSION, invalid_count: 0, missing_count: 0, verified_attestation: true } },
    audit_signatures: { invalid: [], missing: [], verified: [{ name: recoveryPackageMetadata.name, version: VERSION, attestationBundles: [{ predicateType: recoveryStatement.predicateType }] }] },
  };
  reconstructPublishedNpmBundle({ sourceDir: recoveryCandidateDir, registryTarballPath: recoveryRegistryPath, outputDir: recoveryNpmDir, tag: `v${VERSION}`, sourceCommit: COMMIT });
  const recoveryProvenancePath = resolve(recoveryNpmDir, "npm-provenance.json");
  writeJson(recoveryProvenancePath, recoveryProvenanceDocument);
  const recoveryProvenance = JSON.parse(readFileSync(recoveryProvenancePath, "utf8"));
  writeJson(resolve(recoveryNpmDir, "release-operation.json"), {
    package_name: recoveryPackageMetadata.name,
    package_version: VERSION,
    release_tag: `v${VERSION}`,
    source_commit: COMMIT,
    environment: "release",
    provenance: { required: true, status: "published", evidence: { filename: "npm-provenance.json", sha256: hash(readFileSync(recoveryProvenancePath)) } },
    publication: { mode: "recovered-existing", registry_tarball_sha256: hash(publishedTarball) },
    published_artifact: { tarball_sha256: hash(publishedTarball) },
  });
  writeJson(resolve(recoveryNpmDir, "recovery-artifact-source.json"), {
    schema_version: 1,
    artifact_kind: "release-recovery-artifact-source",
    original_publish: { run_id: "123", run_attempt: 1, metadata_endpoint: "/repos/nemnesia/symbol-nem-wallet-core/actions/runs/123/attempts/1", workflow_repository: "nemnesia/symbol-nem-wallet-core", workflow_path: ".github/workflows/release.yml", workflow_ref: `nemnesia/symbol-nem-wallet-core/.github/workflows/release.yml@refs/tags/v${VERSION}`, release_tag: `v${VERSION}`, source_commit: COMMIT },
    artifact_source: { run_id: "456", run_attempt: 1, metadata_endpoint: "/repos/nemnesia/symbol-nem-wallet-core/actions/runs/456/attempts/1", artifact_suffix: "-456-1-" + "a".repeat(40), legacy_unscoped_names: false, attempt_binding: "attempt-scoped-name", artifacts: ["release-identity", "release-npm-package", "release-c-abi"].map((name) => ({ name: `${name}-456-1-${"a".repeat(40)}` })) },
  });
  const recoveryRecord = createReleaseRecord({ npmDir: recoveryNpmDir, cAbiDir, outputDir: recoveryRecordDir, mode: "release", tag: `v${VERSION}`, sourceCommit: COMMIT, provenanceStatus: "published", recovery: true });
  assert.equal(recoveryRecord.record.npm.published_artifact.source, "npm-registry-tarball");
  assert.equal(recoveryRecord.record.npm.published_artifact.tarball.sha256, hash(publishedTarball));
  validateReleaseRecord({ npmDir: recoveryNpmDir, cAbiDir, outputDir: recoveryRecordDir, mode: "release", tag: `v${VERSION}`, sourceCommit: COMMIT, provenanceStatus: "published", recovery: true });
  const recoveryPublicationDir = resolve(root, "recovery-github-release-assets");
  const recoveryPublication = assemblePublicationAssets({ npmDir: recoveryNpmDir, cAbiDir, recordDir: recoveryRecordDir, outputDir: recoveryPublicationDir, tag: `v${VERSION}`, sourceCommit: COMMIT, recovery: true });
  assert.equal(recoveryPublication.npm_asset_count, recoveryRecord.record.durable_asset_list.npm.length);
  assert.equal(recoveryPublication.c_abi_asset_count, recoveryRecord.record.durable_asset_list.c_abi.length);
  assert.equal(readdirSync(recoveryPublicationDir).length, recoveryPublication.asset_count);

  process.stdout.write("release record deterministic and negative tests passed\n");
} finally {
  rmSync(root, { recursive: true, force: true });
}

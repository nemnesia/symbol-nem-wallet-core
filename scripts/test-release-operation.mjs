import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  NPM_REPOSITORY_METADATA,
  validateNpmRepositoryMetadata,
} from "./npm-repository.mjs";
import {
  PROVENANCE_PUBLISH_COMMAND,
  RELEASE_ENVIRONMENT,
  finalizeReleaseOperation,
  validateEvidenceDigests,
  validateReleaseOperationIdentity,
  validateReleaseArtifactPreservation,
  validateRecoveryWorkflowBoundary,
  validateReleaseWorkflowBoundary,
  validateSpdxReleaseIdentity,
} from "./release-operation.mjs";
import { validateReleaseIdentity } from "./release-identity.mjs";
import {
  PROVENANCE_PREDICATE_TYPES,
  WORKFLOW_PATH,
  packagePurl,
  provenanceIdentities,
} from "./npm-provenance.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const COMMIT = "a".repeat(40);
const OTHER_COMMIT = "b".repeat(40);
const VERSION = "0.1.0";
const ZERO_COMMIT = "0".repeat(40);

function expectFailure(callback, pattern) {
  assert.throws(callback, pattern);
}

function identityFixture(overrides = {}) {
  return {
    environment: RELEASE_ENVIRONMENT,
    tag: `v${VERSION}`,
    version: VERSION,
    manifestVersion: VERSION,
    versionSources: Object.fromEntries(["core", "cAbi", "node", "wasm", "npm"].map((id) => [id, { version: VERSION }])),
    sourceCommit: COMMIT,
    checkoutHead: COMMIT,
    tagCommit: COMMIT,
    mainAncestry: true,
    clean: true,
    provenanceRequired: true,
    oidcRequired: true,
    ...overrides,
  };
}

function releaseIdentityFixture(overrides = {}) {
  return {
    mode: "release",
    tag: `v${VERSION}`,
    tagEvent: {
      ref: `refs/tags/v${VERSION}`,
      created: true,
      deleted: false,
      forced: false,
      before: ZERO_COMMIT,
    },
    tagRefExists: true,
    checkoutHead: COMMIT,
    sourceCommit: COMMIT,
    tagCommit: COMMIT,
    mainRef: "refs/remotes/origin/main",
    mainRefCommit: OTHER_COMMIT,
    mainAncestry: true,
    clean: true,
    versionSources: {
      core: { relative_path: "crates/core/Cargo.toml", package_name: "symbol-nem-wallet-core", version: VERSION },
      cAbi: { relative_path: "crates/c-abi/Cargo.toml", package_name: "symbol-nem-wallet-core-native", version: VERSION },
      node: { relative_path: "crates/node/Cargo.toml", package_name: "symbol-nem-wallet-core-node", version: VERSION },
      wasm: { relative_path: "crates/wasm/Cargo.toml", package_name: "symbol-nem-wallet-core-wasm", version: VERSION },
      npm: { relative_path: "packages/wallet-core/package.json", package_name: "@nemnesia/symbol-nem-wallet-core", version: VERSION },
    },
    ...overrides,
  };
}

function releaseManifestFixture(overrides = {}) {
  return {
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    source_commit: COMMIT,
    ...overrides,
  };
}

function spdxReleaseFixture({ rootPackage = {}, packages, documentDescribes, ...documentOverrides } = {}) {
  const root = {
    SPDXID: "SPDXRef-Package-root",
    name: "@nemnesia/symbol-nem-wallet-core",
    versionInfo: VERSION,
    ...rootPackage,
  };
  return {
    SPDXID: "SPDXRef-DOCUMENT",
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    name: `symbol-nem-wallet-core-${VERSION}`,
    documentNamespace: `https://spdx.org/spdxdocs/symbol-nem-wallet-core-${VERSION}-${COMMIT}`,
    documentDescribes: documentDescribes ?? [root.SPDXID],
    packages: packages ?? [root],
    ...documentOverrides,
  };
}

function worktreeIsClean(root) {
  return execFileSync("git", [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--ignored=matching",
  ], { cwd: root, encoding: "utf8" }) === "";
}

const valid = validateReleaseOperationIdentity(identityFixture());
assert.equal(valid.environment, RELEASE_ENVIRONMENT);
assert.equal(valid.provenance_required, true);
assert.equal(valid.trusted_publishing, "npm-oidc");

expectFailure(() => validateReleaseOperationIdentity(identityFixture({ tag: "v0.1.0.invalid" })), /tag\/version mismatch/);
expectFailure(() => validateReleaseOperationIdentity(identityFixture({ tag: "v0.1.1" })), /tag\/version mismatch/);
expectFailure(() => validateReleaseOperationIdentity(identityFixture({ manifestVersion: "0.1.1" })), /manifest version/);
expectFailure(() => validateReleaseOperationIdentity(identityFixture({ versionSources: { ...identityFixture().versionSources, npm: { version: "0.1.1" } } })), /version mismatch/);
expectFailure(() => validateReleaseOperationIdentity(identityFixture({ sourceCommit: OTHER_COMMIT })), /checkout HEAD differs/);
expectFailure(() => validateReleaseOperationIdentity(identityFixture({ tagCommit: OTHER_COMMIT })), /tag target differs/);
expectFailure(() => validateReleaseOperationIdentity(identityFixture({ mainAncestry: false })), /not contained in main/);
expectFailure(() => validateReleaseOperationIdentity(identityFixture({ environment: "production" })), /release Environment/);
expectFailure(() => validateReleaseOperationIdentity(identityFixture({ provenanceRequired: false })), /provenance is not required/);
expectFailure(() => validateReleaseOperationIdentity(identityFixture({ oidcRequired: false })), /OIDC is not required/);

const sourcePackageMetadata = JSON.parse(readFileSync(resolve(repositoryRoot, "packages/wallet-core/package.json"), "utf8"));
assert.deepEqual(sourcePackageMetadata.repository, NPM_REPOSITORY_METADATA);
assert.equal(validateNpmRepositoryMetadata(sourcePackageMetadata, "source npm package metadata"), true);
expectFailure(
  () => validateNpmRepositoryMetadata({ ...sourcePackageMetadata, repository: { ...NPM_REPOSITORY_METADATA, url: "git+https://github.com/example/wrong-repository.git" } }, "source npm package metadata"),
  /repository url differs/,
);
expectFailure(
  () => validateNpmRepositoryMetadata({ ...sourcePackageMetadata, repository: { ...NPM_REPOSITORY_METADATA, directory: "packages/other" } }, "source npm package metadata"),
  /repository directory differs/,
);

const packageArchiveRoot = mkdtempSync(resolve(tmpdir(), "snwc-npm-repository-test-"));
try {
  const archiveRoot = resolve(packageArchiveRoot, "archive");
  mkdirSync(resolve(archiveRoot, "package"), { recursive: true });
  writeFileSync(resolve(archiveRoot, "package/package.json"), `${JSON.stringify(sourcePackageMetadata)}\n`);
  const tarball = resolve(packageArchiveRoot, "package.tgz");
  execFileSync("tar", ["-czf", tarball, "-C", archiveRoot, "package"]);
  const tarballMetadata = JSON.parse(execFileSync("tar", ["-xOf", tarball, "package/package.json"], { encoding: "utf8" }));
  assert.deepEqual(tarballMetadata.repository, NPM_REPOSITORY_METADATA);
  assert.equal(validateNpmRepositoryMetadata(tarballMetadata, "npm tarball package metadata"), true);
  expectFailure(
    () => validateNpmRepositoryMetadata({ ...tarballMetadata, repository: { ...NPM_REPOSITORY_METADATA, type: "hg" } }, "npm tarball package metadata"),
    /repository type differs/,
  );
} finally {
  rmSync(packageArchiveRoot, { recursive: true, force: true });
}

const releaseWorkflow = readFileSync(resolve(repositoryRoot, ".github/workflows/release.yml"), "utf8");
const candidateWorkflow = readFileSync(resolve(repositoryRoot, ".github/workflows/node.yml"), "utf8");
const cAbiWorkflow = readFileSync(resolve(repositoryRoot, ".github/workflows/c-abi-release.yml"), "utf8");
const recoveryWorkflow = readFileSync(resolve(repositoryRoot, ".github/workflows/release-recovery.yml"), "utf8");
const migrationDocumentation = readFileSync(resolve(repositoryRoot, "docs/migration/release-operation-provenance.md"), "utf8");
const trustedPublisherSectionStart = migrationDocumentation.indexOf("4. npm package");
const trustedPublisherSectionEnd = migrationDocumentation.indexOf("\n5.", trustedPublisherSectionStart);
assert.ok(trustedPublisherSectionStart >= 0 && trustedPublisherSectionEnd > trustedPublisherSectionStart);
const trustedPublisherSection = migrationDocumentation.slice(trustedPublisherSectionStart, trustedPublisherSectionEnd);
assert.match(trustedPublisherSection, /repository 内の実ファイル path:\s+`\.github\/workflows\/release\.yml`/);
assert.match(trustedPublisherSection, /npm Trusted Publisher の workflow filename 設定値:\s+`release\.yml`/);
assert.doesNotMatch(trustedPublisherSection, /workflow filename 設定値: `\.github\/workflows\/release\.yml`/);
assert.match(migrationDocumentation, /正式 release workflow を有効にする前、最低でも最初の `v<SemVer>` tag push より前に/);
assert.match(migrationDocumentation, /Environment が workflow 実行で暗黙生成されることを正常な bootstrap path としない/);
const workflow = validateReleaseWorkflowBoundary({ releaseWorkflow, candidateWorkflow, cAbiWorkflow });
assert.equal(workflow.environment, RELEASE_ENVIRONMENT);
assert.deepEqual(workflow.protected_jobs, ["publish", "publication"]);
assert.deepEqual(workflow.concurrency, {
  release: { group: "${{ github.workflow }}-${{ github.ref }}", cancel_in_progress: true },
  candidate: { group: "node-${{ github.ref }}", cancel_in_progress: true },
  c_abi: { group: "c-abi-release-${{ github.ref }}", cancel_in_progress: true },
});
assert.equal(workflow.provenance_command, PROVENANCE_PUBLISH_COMMAND);
assert.equal(workflow.publication_job, "publication");
assert.equal(workflow.durable_release_record, "GitHub Release assets");
assert.equal(workflow.retry_recovery, "existing-version provenance verification without republish");
assert.equal(workflow.artifact_preservation.suffix, "${{ github.run_id }}-${{ github.run_attempt }}-${{ github.sha }}");
assert.equal(validateReleaseArtifactPreservation({ releaseWorkflow, candidateWorkflow, cAbiWorkflow }).suffix, "${{ github.run_id }}-${{ github.run_attempt }}-${{ github.sha }}");
const recoveryBoundary = validateRecoveryWorkflowBoundary(recoveryWorkflow);
assert.equal(recoveryBoundary.trigger, "workflow_dispatch");
assert.equal(recoveryBoundary.publish_capability, false);
assert.match(recoveryWorkflow, /ref: \$\{\{ github\.sha \}\}/);
assert.match(recoveryWorkflow, /refs\/tags\/\$RELEASE_TAG:refs\/tags\/\$RELEASE_TAG/);
expectFailure(() => validateRecoveryWorkflowBoundary(recoveryWorkflow.replace("actions: read", "actions: write")), /publication credential or permission/);
expectFailure(() => validateRecoveryWorkflowBoundary(`${recoveryWorkflow}\nrun: npm publish`), /publication capability/);
expectFailure(() => validateReleaseArtifactPreservation({ releaseWorkflow: `${releaseWorkflow}\n      overwrite: true`, candidateWorkflow, cAbiWorkflow }), /destructive artifact overwrite/);
const identityStepStart = releaseWorkflow.indexOf("      - name: Validate release identity and npm version availability");
const identityStepEnd = releaseWorkflow.indexOf("      - name: Upload release identity evidence", identityStepStart);
assert.ok(identityStepStart >= 0 && identityStepEnd > identityStepStart);
const identityStep = releaseWorkflow.slice(identityStepStart, identityStepEnd);
assert.match(identityStep, /set -euo pipefail/);
assert.match(identityStep, /identity_tmp="\$RUNNER_TEMP\/release-identity\.json"/);
assert.match(
  identityStep,
  /node scripts\/release-identity\.mjs "\$\{identity_args\[@\]\}" \\\n\s+\| tee "\$identity_tmp"/,
);
assert.match(identityStep, /cp "\$identity_tmp" release-identity\.json/);
assert.doesNotMatch(releaseWorkflow, /\|\s*tee\s+release-identity\.json/);
const identityNodeIndex = identityStep.indexOf('node scripts/release-identity.mjs "${identity_args[@]}"');
const identityTeeIndex = identityStep.indexOf('| tee "$identity_tmp"');
const identityCopyIndex = identityStep.indexOf('cp "$identity_tmp" release-identity.json');
assert.ok(identityNodeIndex >= 0 && identityNodeIndex < identityTeeIndex && identityTeeIndex < identityCopyIndex);
expectFailure(
  () => validateReleaseWorkflowBoundary({ releaseWorkflow: releaseWorkflow.replace(PROVENANCE_PUBLISH_COMMAND, "npm publish"), candidateWorkflow, cAbiWorkflow }),
  /provenance/,
);
expectFailure(
  () => validateReleaseWorkflowBoundary({ releaseWorkflow: releaseWorkflow.replace("name: release\n", "name: production\n"), candidateWorkflow, cAbiWorkflow }),
  /Environment release/,
);
expectFailure(
  () => validateReleaseWorkflowBoundary({ releaseWorkflow: `${releaseWorkflow}\n    environment:\n      name: release\n`, candidateWorkflow, cAbiWorkflow }),
  /exactly two release jobs/,
);
expectFailure(
  () => validateReleaseWorkflowBoundary({
    releaseWorkflow: releaseWorkflow.replace(
      "    environment:\n      name: release\n    permissions:\n      contents: write",
      "    permissions:\n      contents: write",
    ),
    candidateWorkflow,
    cAbiWorkflow,
  }),
  /publication job is not protected/,
);
expectFailure(
  () => validateReleaseWorkflowBoundary({
    releaseWorkflow,
    candidateWorkflow: candidateWorkflow.replace(
      "  group: node-${{ github.ref }}",
      "  group: ${{ github.workflow }}-${{ github.ref }}",
    ),
    cAbiWorkflow,
  }),
  /candidate reusable workflow concurrency group collides with release caller/,
);
expectFailure(
  () => validateReleaseWorkflowBoundary({
    releaseWorkflow,
    candidateWorkflow,
    cAbiWorkflow: cAbiWorkflow.replace(
      "  group: c-abi-release-${{ github.ref }}",
      "  group: ${{ github.workflow }}-${{ github.ref }}",
    ),
  }),
  /C ABI reusable workflow concurrency group collides with release caller/,
);
expectFailure(
  () => validateReleaseWorkflowBoundary({
    releaseWorkflow,
    candidateWorkflow: candidateWorkflow.replace(
      "  group: node-${{ github.ref }}",
      "  group: ci-${{ github.ref }}",
    ),
    cAbiWorkflow,
  }),
  /candidate reusable workflow concurrency group is not deterministic/,
);
expectFailure(
  () => validateReleaseWorkflowBoundary({
    releaseWorkflow,
    candidateWorkflow: candidateWorkflow.replace(
      "  cancel-in-progress: true",
      "  cancel-in-progress: false",
    ),
    cAbiWorkflow,
  }),
  /candidate reusable workflow must cancel duplicate in-progress runs/,
);

const cleanlinessRoot = mkdtempSync(resolve(tmpdir(), "snwc-release-identity-cleanliness-test-"));
const evidenceTempRoot = mkdtempSync(resolve(tmpdir(), "snwc-release-identity-evidence-test-"));
try {
  execFileSync("git", ["init", "--quiet"], { cwd: cleanlinessRoot });
  execFileSync("git", ["config", "user.email", "release-test@example.invalid"], { cwd: cleanlinessRoot });
  execFileSync("git", ["config", "user.name", "Release Test"], { cwd: cleanlinessRoot });
  const trackedPath = resolve(cleanlinessRoot, "tracked.txt");
  writeFileSync(trackedPath, "tracked fixture\n");
  execFileSync("git", ["add", "tracked.txt"], { cwd: cleanlinessRoot });
  execFileSync("git", ["commit", "--quiet", "-m", "fixture"], { cwd: cleanlinessRoot });

  const repositoryEvidencePath = resolve(cleanlinessRoot, "release-identity.json");
  writeFileSync(repositoryEvidencePath, "old capture\n");
  assert.equal(worktreeIsClean(cleanlinessRoot), false);
  rmSync(repositoryEvidencePath);
  assert.equal(worktreeIsClean(cleanlinessRoot), true);

  const temporaryEvidencePath = resolve(evidenceTempRoot, "release-identity.json");
  const cleanBeforeValidation = worktreeIsClean(cleanlinessRoot);
  assert.equal(cleanBeforeValidation, true);
  const identity = validateReleaseIdentity(releaseIdentityFixture({ clean: cleanBeforeValidation }));
  writeFileSync(temporaryEvidencePath, `${JSON.stringify({ ...identity, npm_registry: { status: "not-found" } })}\n`);
  assert.equal(worktreeIsClean(cleanlinessRoot), true);
  assert.equal(existsSync(temporaryEvidencePath), true);

  execFileSync("cp", [temporaryEvidencePath, repositoryEvidencePath]);
  assert.equal(readFileSync(repositoryEvidencePath, "utf8"), readFileSync(temporaryEvidencePath, "utf8"));
  assert.equal(worktreeIsClean(cleanlinessRoot), false);

  const failedCapturePath = resolve(evidenceTempRoot, "failed-release-identity.json");
  const shouldNotCopyPath = resolve(cleanlinessRoot, "failed-release-identity.json");
  assert.throws(() => execFileSync("bash", ["-c", [
    "set -euo pipefail",
    `false | tee "${failedCapturePath}"`,
    `cp "${failedCapturePath}" "${shouldNotCopyPath}"`,
  ].join("\n")]));
  assert.equal(existsSync(shouldNotCopyPath), false);
} finally {
  rmSync(cleanlinessRoot, { recursive: true, force: true });
  rmSync(evidenceTempRoot, { recursive: true, force: true });
}

const releaseManifest = releaseManifestFixture();
const validSpdx = spdxReleaseFixture();
assert.equal(Object.hasOwn(validSpdx, "package_name"), false);
assert.equal(Object.hasOwn(validSpdx, "package_version"), false);
assert.equal(Object.hasOwn(validSpdx, "source_commit"), false);
assert.equal(validateSpdxReleaseIdentity(validSpdx, releaseManifest), true);

expectFailure(
  () => validateSpdxReleaseIdentity({ ...validSpdx, spdxVersion: "SPDX-2.2" }, releaseManifest),
  /SPDX document identity is invalid/,
);
expectFailure(
  () => validateSpdxReleaseIdentity({ ...validSpdx, name: "symbol-nem-wallet-core-0.1.1" }, releaseManifest),
  /SPDX document name differs/,
);
expectFailure(
  () => validateSpdxReleaseIdentity({ ...validSpdx, documentNamespace: `https://spdx.org/spdxdocs/symbol-nem-wallet-core-0.1.1-${COMMIT}` }, releaseManifest),
  /SPDX document namespace differs/,
);
expectFailure(
  () => validateSpdxReleaseIdentity({ ...validSpdx, documentNamespace: `https://spdx.org/spdxdocs/symbol-nem-wallet-core-${VERSION}-${OTHER_COMMIT}` }, releaseManifest),
  /SPDX document namespace differs/,
);
const missingDocumentDescribes = { ...validSpdx };
delete missingDocumentDescribes.documentDescribes;
expectFailure(
  () => validateSpdxReleaseIdentity(missingDocumentDescribes, releaseManifest),
  /SPDX document root package identity is invalid/,
);
expectFailure(
  () => validateSpdxReleaseIdentity({ ...validSpdx, documentDescribes: ["SPDXRef-Package-missing"] }, releaseManifest),
  /SPDX document root package is missing or duplicated/,
);
expectFailure(
  () => validateSpdxReleaseIdentity(spdxReleaseFixture({ rootPackage: { name: "wrong-package" } }), releaseManifest),
  /SPDX root npm package is missing or duplicated/,
);
expectFailure(
  () => validateSpdxReleaseIdentity(spdxReleaseFixture({ rootPackage: { versionInfo: "0.1.1" } }), releaseManifest),
  /SPDX root npm package is missing or duplicated/,
);
expectFailure(
  () => validateSpdxReleaseIdentity({ ...validSpdx, packages: undefined }, releaseManifest),
  /SPDX packages are missing or malformed/,
);
expectFailure(
  () => validateSpdxReleaseIdentity({ ...validSpdx, packages: [{}] }, releaseManifest),
  /SPDX packages are missing or malformed/,
);
expectFailure(
  () => validateSpdxReleaseIdentity(spdxReleaseFixture({ rootPackage: { SPDXID: "SPDXRef-Package-wrong" }, documentDescribes: ["SPDXRef-Package-root"] }), releaseManifest),
  /SPDX document root package is missing or duplicated/,
);
expectFailure(
  () => validateSpdxReleaseIdentity(spdxReleaseFixture({ packages: [validSpdx.packages[0], { ...validSpdx.packages[0], SPDXID: "SPDXRef-Package-duplicate" }] }), releaseManifest),
  /SPDX root npm package is missing or duplicated/,
);
expectFailure(
  () => validateSpdxReleaseIdentity({ ...validSpdx, documentDescribes: ["SPDXRef-Package-root", "SPDXRef-Package-other"] }, releaseManifest),
  /SPDX document root package identity is invalid/,
);

const root = mkdtempSync(resolve(tmpdir(), "snwc-release-operation-test-"));
try {
  const paths = {
    sbomPath: resolve(root, "sbom.spdx.json"),
    inventoryPath: resolve(root, "license-inventory.json"),
    sbomSha256sumsPath: resolve(root, "SBOM-SHA256SUMS"),
    policyPath: resolve(root, "license-policy.json"),
    thirdPartyPath: resolve(root, "THIRD_PARTY_LICENSES.json"),
    policySha256sumsPath: resolve(root, "LICENSE-POLICY-SHA256SUMS"),
  };
  const write = (path, value) => writeFileSync(path, value);
  write(paths.sbomPath, `${JSON.stringify(validSpdx, null, 2)}\n`);
  write(paths.inventoryPath, "inventory fixture\n");
  write(paths.policyPath, "policy fixture\n");
  write(paths.thirdPartyPath, "third-party fixture\n");
  const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
  write(paths.sbomSha256sumsPath, `${digest(paths.sbomPath)}  sbom.spdx.json\n${digest(paths.inventoryPath)}  license-inventory.json\n`);
  write(paths.policySha256sumsPath, `${digest(paths.policyPath)}  license-policy.json\n${digest(paths.thirdPartyPath)}  THIRD_PARTY_LICENSES.json\n`);
  assert.deepEqual(validateEvidenceDigests(paths), { sbom: true, license_policy: true });
  write(paths.sbomPath, "tampered SPDX fixture\n");
  expectFailure(() => validateEvidenceDigests(paths), /SBOM-SHA256SUMS entry/);
} finally {
  rmSync(root, { recursive: true, force: true });
}

const finalizeRoot = mkdtempSync(resolve(tmpdir(), "snwc-release-operation-finalize-test-"));
try {
  const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  const tarSha256 = "b".repeat(64);
  const tarSha512 = "c".repeat(128);
  const repository = "nemnesia/symbol-nem-wallet-core";
  const predicateType = [...PROVENANCE_PREDICATE_TYPES][0];
  const statement = {
    predicateType,
    subject: [{ name: packagePurl("@nemnesia/symbol-nem-wallet-core", VERSION), digest: { sha512: tarSha512 } }],
    predicate: {
      buildDefinition: {
        externalParameters: { workflow: { repository: `https://github.com/${repository}`, path: WORKFLOW_PATH, ref: `refs/tags/v${VERSION}` } },
        resolvedDependencies: [{ uri: `git+https://github.com/${repository}@refs/tags/v${VERSION}`, digest: { gitCommit: COMMIT } }],
      },
      runDetails: { metadata: { invocationId: `https://github.com/${repository}/actions/runs/123` } },
    },
  };
  const attestation = {
    predicateType,
    bundle: { dsseEnvelope: { payload: Buffer.from(JSON.stringify(statement), "utf8").toString("base64") } },
  };
  const identities = provenanceIdentities([attestation], {
    packageName: "@nemnesia/symbol-nem-wallet-core",
    version: VERSION,
    tag: `v${VERSION}`,
    sourceCommit: COMMIT,
    repository,
    tarballSha512: tarSha512,
  });
  const provenancePath = resolve(finalizeRoot, "npm-provenance.json");
  const manifestPath = resolve(finalizeRoot, "release-manifest.json");
  const operationPath = resolve(finalizeRoot, "release-operation.json");
  const outputPath = resolve(finalizeRoot, "release-operation-final.json");
  writeJson(manifestPath, {
    package_version: VERSION,
    npm_tarball: { sha256: tarSha256, size: 123 },
  });
  writeJson(operationPath, {
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    release_tag: `v${VERSION}`,
    source_commit: COMMIT,
    npm_tarball: { filename: "fixture.tgz", sha256: tarSha256 },
    provenance: { required: true, status: "required-at-publish" },
  });
  writeJson(provenancePath, {
    schema_version: 1,
    artifact_kind: "npm-provenance",
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    release_tag: `v${VERSION}`,
    source_commit: COMMIT,
    environment: RELEASE_ENVIRONMENT,
    publication_mode: "fresh-publish",
    candidate_artifact: null,
    canonical_artifact: {
      source: "registry",
      sha256: tarSha256,
      sha512: tarSha512,
      size: 123,
      integrity: `sha512-${Buffer.from(tarSha512, "hex").toString("base64")}`,
      tarball_url: "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/-/symbol-nem-wallet-core-0.1.0.tgz",
    },
    registry_metadata: {
      name: "@nemnesia/symbol-nem-wallet-core",
      version: VERSION,
      repository: { type: "git", url: "git+https://github.com/nemnesia/symbol-nem-wallet-core.git", directory: "packages/wallet-core" },
      dist: {
        tarball: "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/-/symbol-nem-wallet-core-0.1.0.tgz",
        integrity: `sha512-${Buffer.from(tarSha512, "hex").toString("base64")}`,
        attestations: { url: "https://registry.npmjs.org/-/npm/v1/attestations/@nemnesia%2Fsymbol-nem-wallet-core@0.1.0" },
      },
    },
    registry: {
      package_name: "@nemnesia/symbol-nem-wallet-core",
      package_version: VERSION,
      metadata_url: "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/0.1.0",
      tarball_url: "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/-/symbol-nem-wallet-core-0.1.0.tgz",
      tarball_sha256: tarSha256,
      tarball_sha512: tarSha512,
      tarball_size: 123,
      dist_integrity: `sha512-${Buffer.from(tarSha512, "hex").toString("base64")}`,
      attestations_url: "https://registry.npmjs.org/-/npm/v1/attestations/@nemnesia%2Fsymbol-nem-wallet-core@0.1.0",
    },
    registry_attestations: { attestations: [attestation] },
    provenance: { predicate_types: identities.map((identity) => identity.predicate_type), identities },
    verification: { status: "PASS", command: "npm audit signatures --json --include-attestations" },
    audit_signatures: { invalid: [], missing: [], verified: [{ name: "@nemnesia/symbol-nem-wallet-core", version: VERSION, attestationBundles: [{ predicateType }] }] },
  });
  const finalized = finalizeReleaseOperation({
    preOperationPath: operationPath,
    provenancePath,
    manifestPath,
    tag: `v${VERSION}`,
    sourceCommit: COMMIT,
    environment: RELEASE_ENVIRONMENT,
    publicationMode: "published",
    workflowRef: `${repository}/.github/workflows/release.yml@refs/tags/v${VERSION}`,
    repository,
    runId: "123",
    runAttempt: 1,
    outputPath,
  });
  assert.equal(finalized.provenance.status, "published");
  assert.equal(finalized.publication.mode, "published");
  assert.equal(finalized.provenance.evidence.sha256, createHash("sha256").update(readFileSync(provenancePath)).digest("hex"));
  assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), finalized);

  const recoveryProvenance = JSON.parse(readFileSync(provenancePath, "utf8"));
  recoveryProvenance.publication_mode = "post-publish-recovery";
  recoveryProvenance.candidate_artifact = { sha256: "d".repeat(64), size: 456 };
  writeJson(provenancePath, recoveryProvenance);
  const recovered = finalizeReleaseOperation({
    preOperationPath: operationPath,
    provenancePath,
    manifestPath,
    tag: `v${VERSION}`,
    sourceCommit: COMMIT,
    environment: RELEASE_ENVIRONMENT,
    publicationMode: "recovered-existing",
    workflowRef: `${repository}/.github/workflows/release.yml@refs/tags/v${VERSION}`,
    repository,
    runId: "123",
    runAttempt: 2,
    outputPath,
  });
  assert.equal(recovered.publication.mode, "recovered-existing");
  assert.notEqual(recoveryProvenance.candidate_artifact.sha256, recovered.publication.registry_tarball_sha256);
} finally {
  rmSync(finalizeRoot, { recursive: true, force: true });
}

process.stdout.write("release operation deterministic tests passed\n");

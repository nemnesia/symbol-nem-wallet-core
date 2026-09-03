import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  PROVENANCE_PUBLISH_COMMAND,
  RELEASE_ENVIRONMENT,
  validateEvidenceDigests,
  validateReleaseOperationIdentity,
  validateReleaseWorkflowBoundary,
} from "./release-operation.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const COMMIT = "a".repeat(40);
const OTHER_COMMIT = "b".repeat(40);
const VERSION = "0.1.0";

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

const releaseWorkflow = readFileSync(resolve(repositoryRoot, ".github/workflows/release.yml"), "utf8");
const candidateWorkflow = readFileSync(resolve(repositoryRoot, ".github/workflows/node.yml"), "utf8");
const workflow = validateReleaseWorkflowBoundary({ releaseWorkflow, candidateWorkflow });
assert.equal(workflow.environment, RELEASE_ENVIRONMENT);
assert.equal(workflow.provenance_command, PROVENANCE_PUBLISH_COMMAND);
expectFailure(
  () => validateReleaseWorkflowBoundary({ releaseWorkflow: releaseWorkflow.replace(PROVENANCE_PUBLISH_COMMAND, "npm publish"), candidateWorkflow }),
  /provenance/,
);
expectFailure(
  () => validateReleaseWorkflowBoundary({ releaseWorkflow: releaseWorkflow.replace("name: release\n", "name: production\n"), candidateWorkflow }),
  /Environment release/,
);
expectFailure(
  () => validateReleaseWorkflowBoundary({ releaseWorkflow: `${releaseWorkflow}\n    environment:\n      name: release\n`, candidateWorkflow }),
  /exactly one release job/,
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
  write(paths.sbomPath, "spdx fixture\n");
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

process.stdout.write("release operation deterministic tests passed\n");

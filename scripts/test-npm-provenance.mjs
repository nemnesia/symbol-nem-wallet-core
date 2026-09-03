import assert from "node:assert/strict";

import {
  PACKAGE_NAME,
  PROVENANCE_PREDICATE_TYPES,
  WORKFLOW_PATH,
  packagePurl,
  provenanceIdentities,
  validateNpmProvenanceEvidence,
} from "./npm-provenance.mjs";

// This is a structural test fixture. It is never presented as registry evidence.
const VERSION = "0.1.0";
const TAG = "v0.1.0";
const COMMIT = "a".repeat(40);
const REPOSITORY = "nemnesia/symbol-nem-wallet-core";
const TAR_SHA256 = "b".repeat(64);
const TAR_SHA512 = "c".repeat(128);
const TAR_SIZE = 123;
const PREDICATE = [...PROVENANCE_PREDICATE_TYPES][0];
const statement = {
  _type: "https://in-toto.io/Statement/v1",
  subject: [{ name: packagePurl(PACKAGE_NAME, VERSION), digest: { sha512: TAR_SHA512 } }],
  predicateType: PREDICATE,
  predicate: {
    buildDefinition: {
      externalParameters: {
        workflow: {
          repository: `https://github.com/${REPOSITORY}`,
          path: WORKFLOW_PATH,
          ref: `refs/tags/${TAG}`,
        },
      },
      resolvedDependencies: [{
        uri: `git+https://github.com/${REPOSITORY}@refs/tags/${TAG}`,
        digest: { gitCommit: COMMIT },
      }],
    },
    runDetails: {
      metadata: { invocationId: `https://github.com/${REPOSITORY}/actions/runs/123` },
    },
  },
};
const payload = Buffer.from(JSON.stringify(statement), "utf8").toString("base64");
const registryAttestations = {
  attestations: [{
    predicateType: PREDICATE,
    bundle: {
      dsseEnvelope: { payload, signatures: [{ keyid: "fixture" }] },
    },
  }],
};
const expected = {
  packageName: PACKAGE_NAME,
  version: VERSION,
  tag: TAG,
  sourceCommit: COMMIT,
  environment: "release",
  repository: REPOSITORY,
  tarballSha256: TAR_SHA256,
  tarballSha512: TAR_SHA512,
  tarballSize: TAR_SIZE,
};
const identities = provenanceIdentities(registryAttestations.attestations, expected);
const evidence = {
  schema_version: 1,
  artifact_kind: "npm-provenance",
  package_name: PACKAGE_NAME,
  package_version: VERSION,
  release_tag: TAG,
  source_commit: COMMIT,
  environment: "release",
  registry: {
    package_name: PACKAGE_NAME,
    package_version: VERSION,
    metadata_url: "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/0.1.0",
    tarball_url: "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/-/symbol-nem-wallet-core-0.1.0.tgz",
    tarball_sha256: TAR_SHA256,
    tarball_sha512: TAR_SHA512,
    tarball_size: TAR_SIZE,
    dist_integrity: `sha512-${Buffer.from(TAR_SHA512, "hex").toString("base64")}`,
    attestations_url: "https://registry.npmjs.org/-/npm/v1/attestations/@nemnesia%2Fsymbol-nem-wallet-core@0.1.0",
  },
  registry_attestations: registryAttestations,
  provenance: {
    predicate_types: identities.map((identity) => identity.predicate_type),
    identities,
  },
  verification: {
    status: "PASS",
    command: "npm audit signatures --json --include-attestations",
  },
  audit_signatures: {
    invalid: [],
    missing: [],
    verified: [{
      name: PACKAGE_NAME,
      version: VERSION,
      attestationBundles: [{ predicateType: PREDICATE }],
    }],
  },
};

assert.equal(validateNpmProvenanceEvidence(evidence, expected), true);
assert.throws(
  () => validateNpmProvenanceEvidence({ ...evidence, registry: { ...evidence.registry, dist_integrity: "sha512-invalid" } }, expected),
  /integrity does not match/,
);
assert.throws(
  () => validateNpmProvenanceEvidence({ ...evidence, source_commit: "d".repeat(40) }, expected),
  /identity differs/,
);
const wrongWorkflowEvidence = structuredClone(evidence);
const wrongStatement = structuredClone(statement);
wrongStatement.predicate.buildDefinition.externalParameters.workflow.path = ".github/workflows/other.yml";
wrongWorkflowEvidence.registry_attestations.attestations[0].bundle.dsseEnvelope.payload = Buffer.from(JSON.stringify(wrongStatement), "utf8").toString("base64");
assert.throws(() => validateNpmProvenanceEvidence(wrongWorkflowEvidence, expected), /workflow identity/);

process.stdout.write("npm provenance deterministic tests passed (fixture only)\n");

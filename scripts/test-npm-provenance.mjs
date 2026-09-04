import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { NPM_REPOSITORY_METADATA } from "./npm-repository.mjs";
import {
  PACKAGE_NAME,
  PROVENANCE_PREDICATE_TYPES,
  WORKFLOW_PATH,
  fetchAttestationRecord,
  packagePurl,
  provenanceIdentities,
  validateNpmProvenanceEvidence,
  validateRegistryTarballContent,
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
const attemptExpected = { ...expected, workflowRunId: "123", workflowRunAttempt: 1 };
const attemptStatement = structuredClone(statement);
attemptStatement.predicate.runDetails.metadata.invocationId = `https://github.com/${REPOSITORY}/actions/runs/123/attempts/1`;
const attemptAttestation = {
  predicateType: PREDICATE,
  bundle: { dsseEnvelope: { payload: Buffer.from(JSON.stringify(attemptStatement), "utf8").toString("base64") } },
};
assert.equal(provenanceIdentities([attemptAttestation], attemptExpected).length, 1);
for (const invocationId of [
  `https://github.com/${REPOSITORY}/actions/runs/123`,
  `https://github.com/${REPOSITORY}/actions/runs/123/attempts/2`,
]) {
  const wrongAttemptStatement = structuredClone(attemptStatement);
  wrongAttemptStatement.predicate.runDetails.metadata.invocationId = invocationId;
  assert.throws(
    () => provenanceIdentities([{ ...attemptAttestation, bundle: { dsseEnvelope: { payload: Buffer.from(JSON.stringify(wrongAttemptStatement), "utf8").toString("base64") } } }], attemptExpected),
    /invocation attempt/,
  );
}
const evidence = {
  schema_version: 1,
  artifact_kind: "npm-provenance",
  package_name: PACKAGE_NAME,
  package_version: VERSION,
  release_tag: TAG,
  source_commit: COMMIT,
  environment: "release",
  publication_mode: "fresh-publish",
  candidate_artifact: null,
  canonical_artifact: {
    source: "registry",
    sha256: TAR_SHA256,
    sha512: TAR_SHA512,
    size: TAR_SIZE,
    integrity: `sha512-${Buffer.from(TAR_SHA512, "hex").toString("base64")}`,
    tarball_url: "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/-/symbol-nem-wallet-core-0.1.0.tgz",
  },
  registry_metadata: {
    name: PACKAGE_NAME,
    version: VERSION,
    repository: NPM_REPOSITORY_METADATA,
    dist: {
      tarball: "https://registry.npmjs.org/%40nemnesia%2Fsymbol-nem-wallet-core/-/symbol-nem-wallet-core-0.1.0.tgz",
      integrity: `sha512-${Buffer.from(TAR_SHA512, "hex").toString("base64")}`,
      attestations: { url: "https://registry.npmjs.org/-/npm/v1/attestations/@nemnesia%2Fsymbol-nem-wallet-core@0.1.0" },
    },
  },
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
for (const [field, value] of [["repository", "https://github.com/other/repository"], ["ref", "refs/tags/v0.1.1"]]) {
  const wrongIdentityEvidence = structuredClone(evidence);
  const wrongIdentityStatement = structuredClone(statement);
  wrongIdentityStatement.predicate.buildDefinition.externalParameters.workflow[field] = value;
  wrongIdentityEvidence.registry_attestations.attestations[0].bundle.dsseEnvelope.payload = Buffer.from(JSON.stringify(wrongIdentityStatement), "utf8").toString("base64");
  assert.throws(() => validateNpmProvenanceEvidence(wrongIdentityEvidence, expected), /workflow identity/);
}
const recoveryEvidence = structuredClone(evidence);
recoveryEvidence.publication_mode = "post-publish-recovery";
recoveryEvidence.candidate_artifact = { sha256: "d".repeat(64), size: 456 };
assert.equal(validateNpmProvenanceEvidence(recoveryEvidence, expected), true);
assert.notEqual(recoveryEvidence.candidate_artifact.sha256, recoveryEvidence.canonical_artifact.sha256);
const wrongSubjectEvidence = structuredClone(evidence);
const wrongSubjectStatement = structuredClone(statement);
wrongSubjectStatement.subject[0].digest.sha512 = "d".repeat(128);
wrongSubjectEvidence.registry_attestations.attestations[0].bundle.dsseEnvelope.payload = Buffer.from(JSON.stringify(wrongSubjectStatement), "utf8").toString("base64");
assert.throws(() => validateNpmProvenanceEvidence(wrongSubjectEvidence, expected), /subject does not match/);
const wrongSourceEvidence = structuredClone(evidence);
const wrongSourceStatement = structuredClone(statement);
wrongSourceStatement.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit = "d".repeat(40);
wrongSourceEvidence.registry_attestations.attestations[0].bundle.dsseEnvelope.payload = Buffer.from(JSON.stringify(wrongSourceStatement), "utf8").toString("base64");
assert.throws(() => validateNpmProvenanceEvidence(wrongSourceEvidence, expected), /source commit identity/);
const wrongPackageMetadataEvidence = structuredClone(evidence);
wrongPackageMetadataEvidence.registry_metadata.name = "@nemnesia/wrong-package";
assert.throws(() => validateNpmProvenanceEvidence(wrongPackageMetadataEvidence, expected), /metadata evidence is incomplete/);
const wrongVersionMetadataEvidence = structuredClone(evidence);
wrongVersionMetadataEvidence.registry_metadata.version = "0.1.1";
assert.throws(() => validateNpmProvenanceEvidence(wrongVersionMetadataEvidence, expected), /metadata evidence is incomplete/);
const wrongExpectedTarballEvidence = structuredClone(evidence);
assert.throws(() => validateNpmProvenanceEvidence(wrongExpectedTarballEvidence, { ...expected, tarballSha256: "d".repeat(64) }), /registry evidence identity/);
const invalidAuditEvidence = structuredClone(evidence);
invalidAuditEvidence.audit_signatures.invalid = [{ name: PACKAGE_NAME }];
assert.throws(() => validateNpmProvenanceEvidence(invalidAuditEvidence, expected), /invalid or missing/);

async function retryFixture(statuses, body = { attestations: [] }) {
  let calls = 0;
  const result = await fetchAttestationRecord("https://registry.npmjs.org/-/npm/v1/attestations/%40nemnesia%2Fsymbol-nem-wallet-core@0.1.0", {
    attempts: statuses.length,
    initialDelayMs: 0,
    maxDelayMs: 0,
    sleepImpl: async () => {},
    fetchImpl: async () => {
      const status = statuses[calls];
      calls += 1;
      return status === 200
        ? { ok: true, status, json: async () => body }
        : { ok: false, status };
    },
  });
  return { calls, result };
}

assert.deepEqual((await retryFixture([404, 200])).result, { attestations: [] });
assert.equal((await retryFixture([404, 200])).calls, 2);
assert.equal((await retryFixture([429, 200])).calls, 2);
assert.equal((await retryFixture([500, 200])).calls, 2);
await assert.rejects(
  fetchAttestationRecord("https://registry.npmjs.org/-/npm/v1/attestations/%40nemnesia%2Fsymbol-nem-wallet-core@0.1.0", {
    attempts: 3,
    initialDelayMs: 0,
    maxDelayMs: 0,
    sleepImpl: async () => {},
    fetchImpl: async () => ({ ok: false, status: 404 }),
  }),
  /after bounded retry/,
);
let malformedCalls = 0;
await assert.rejects(
  fetchAttestationRecord("https://registry.npmjs.org/-/npm/v1/attestations/%40nemnesia%2Fsymbol-nem-wallet-core@0.1.0", {
    sleepImpl: async () => {},
    fetchImpl: async () => {
      malformedCalls += 1;
      return { ok: true, status: 200, json: async () => { throw new Error("malformed"); } };
    },
  }),
  /response is malformed/,
);
assert.equal(malformedCalls, 1);
let incompleteCalls = 0;
await assert.rejects(
  fetchAttestationRecord("https://registry.npmjs.org/-/npm/v1/attestations/%40nemnesia%2Fsymbol-nem-wallet-core@0.1.0", {
    sleepImpl: async () => {},
    fetchImpl: async () => {
      incompleteCalls += 1;
      return { ok: true, status: 200, json: async () => ({}) };
    },
  }),
  /response is malformed/,
);
assert.equal(incompleteCalls, 1);
let unexpectedStatusCalls = 0;
await assert.rejects(
  fetchAttestationRecord("https://registry.npmjs.org/-/npm/v1/attestations/%40nemnesia%2Fsymbol-nem-wallet-core@0.1.0", {
    sleepImpl: async () => {},
    fetchImpl: async () => {
      unexpectedStatusCalls += 1;
      return { ok: false, status: 400 };
    },
  }),
  /HTTP 400/,
);
assert.equal(unexpectedStatusCalls, 1);

const tarFixtureRoot = mkdtempSync(join(tmpdir(), "snwc-npm-provenance-"));
try {
  const packageRoot = join(tarFixtureRoot, "package");
  const nativeFixtureTargets = [
    ["win32-x64-msvc", "windows", "x64", "msvc", "x86_64-pc-windows-msvc"],
    ["darwin-x64", "macos", "x64", "darwin", "x86_64-apple-darwin"],
    ["darwin-arm64", "macos", "arm64", "darwin", "aarch64-apple-darwin"],
    ["linux-x64-gnu", "linux", "x64", "gnu", "x86_64-unknown-linux-gnu", "glibc"],
  ];
  const nativeArtifacts = nativeFixtureTargets.map(([targetId, os, cpu, abi, rustTarget, libc]) => {
    const artifactFilename = `${targetId}.node`;
    const relativePath = `dist/native/${targetId}/${artifactFilename}`;
    const content = Buffer.from(`deterministic native fixture: ${targetId}\n`, "utf8");
    mkdirSync(join(packageRoot, relativePath, ".."), { recursive: true });
    writeFileSync(join(packageRoot, relativePath), content);
    return {
      target_id: targetId,
      os,
      cpu,
      abi,
      rust_target: rustTarget,
      ...(libc === undefined ? {} : { libc }),
      relative_path: relativePath,
      artifact_filename: artifactFilename,
      sha256: createHash("sha256").update(content).digest("hex"),
      toolchain_identifier: "deterministic-fixture-toolchain",
    };
  });
  const wasmRelativePath = "dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm";
  const wasmContent = Buffer.from("deterministic wasm fixture\n", "utf8");
  mkdirSync(join(packageRoot, wasmRelativePath, ".."), { recursive: true });
  writeFileSync(join(packageRoot, wasmRelativePath), wasmContent);

  const packageMetadata = {
    name: PACKAGE_NAME,
    version: VERSION,
    repository: NPM_REPOSITORY_METADATA,
  };
  writeFileSync(join(packageRoot, "package.json"), `${JSON.stringify(packageMetadata)}\n`);
  const runtimeManifest = {
    schema_version: 1,
    package_name: PACKAGE_NAME,
    package_version: VERSION,
    source_commit: COMMIT,
    node_api_version: 8,
    artifacts: nativeArtifacts,
  };
  writeFileSync(join(packageRoot, "dist/native/artifact-manifest.json"), `${JSON.stringify(runtimeManifest)}\n`);

  const tarball = execFileSync("tar", [
    "--sort=name",
    "--mtime=@0",
    "--owner=0",
    "--group=0",
    "--numeric-owner",
    "-czf",
    "-",
    "-C",
    tarFixtureRoot,
    "package",
  ]);
  assert.deepEqual(tarball.subarray(0, 2), Buffer.from([0x1f, 0x8b]), "fixture must be gzip-compressed");

  // This is the exact pre-fix extraction command. It must reject a gzip .tgz.
  assert.throws(() => execFileSync("tar", ["-xOf", "-", "package/package.json"], { input: tarball }));

  const candidateManifest = {
    wasm: {
      canonical_artifact: {
        relative_path: wasmRelativePath,
        sha256: createHash("sha256").update(wasmContent).digest("hex"),
        size: wasmContent.length,
      },
    },
    native_artifacts: nativeArtifacts.map((artifact) => ({
      target_id: artifact.target_id,
      relative_path: artifact.relative_path,
      sha256: artifact.sha256,
      size: readFileSync(join(packageRoot, artifact.relative_path)).length,
    })),
  };
  const validated = validateRegistryTarballContent(
    tarball,
    { version: VERSION, sourceCommit: COMMIT },
    candidateManifest,
    true,
  );
  assert.deepEqual(validated.metadata, packageMetadata, "package/package.json must be extracted from the gzip registry tarball");
  assert.deepEqual(validated.runtimeManifest, runtimeManifest, "native artifact manifest must be extracted from the gzip registry tarball");

  const corruptTarball = tarball.subarray(0, tarball.length - 1);
  assert.throws(
    () => validateRegistryTarballContent(corruptTarball, { version: VERSION, sourceCommit: COMMIT }, candidateManifest, true),
    /registry tarball is corrupt or unreadable/,
  );
} finally {
  rmSync(tarFixtureRoot, { recursive: true, force: true });
}

process.stdout.write("npm provenance deterministic tests passed (fixture only)\n");

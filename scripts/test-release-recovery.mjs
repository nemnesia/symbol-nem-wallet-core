import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import {
  NPM_REQUIRED_FILES,
  PUBLISHED_RECOVERY_FILES,
  reconstructPublishedNpmBundle,
  validateArtifactSource,
  validateDispatchBoundary,
  validateOriginalReleaseRun,
  validateProvenanceInvocation,
  validatePublishedRecoveryEvidence,
} from "./release-recovery.mjs";

const root = resolve(tmpdir(), `snwc-release-recovery-${process.pid}`);
const sourceDir = resolve(root, "source");
const outputDir = resolve(root, "output");
const registryPath = resolve(root, "registry.tgz");
const archiveRoot = resolve(root, "archive");
const VERSION = "0.1.0";
const TAG = "v0.1.0";
const COMMIT = "a".repeat(40);
const tarballFilename = "nemnesia-symbol-nem-wallet-core-0.1.0.tgz";
const packageMetadata = JSON.parse(readFileSync(resolve("packages/wallet-core", "package.json"), "utf8"));

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

function expectFailure(label, callback, pattern = /Release recovery gate failed/) {
  assert.throws(callback, pattern, label);
}

function nativeManifest() {
  const targetData = [
    ["win32-x64-msvc", "windows", "x64", "msvc", "x86_64-pc-windows-msvc"],
    ["darwin-x64", "macos", "x64", "darwin", "x86_64-apple-darwin"],
    ["darwin-arm64", "macos", "arm64", "darwin", "aarch64-apple-darwin"],
    ["linux-x64-gnu", "linux", "x64", "gnu", "x86_64-unknown-linux-gnu"],
  ];
  return {
    schema_version: 1,
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    source_commit: COMMIT,
    node_api_version: 8,
    artifacts: targetData.map(([targetId, os, cpu, abi, rustTarget], index) => {
      const content = Buffer.from(`published-${targetId}-${index}\n`);
      write(resolve(archiveRoot, `package/dist/native/${targetId}/${targetId}.node`), content);
      return {
        target_id: targetId,
        os,
        cpu,
        abi,
        rust_target: rustTarget,
        relative_path: `dist/native/${targetId}/${targetId}.node`,
        artifact_filename: `${targetId}.node`,
        sha256: hash(content),
        toolchain_identifier: "rustc fixture",
        ...(targetId === "linux-x64-gnu" ? { libc: "glibc" } : {}),
      };
    }),
  };
}

function makeFixture() {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(resolve(archiveRoot, "package/dist/wasm"), { recursive: true });
  const registryPackage = {
    ...packageMetadata,
    name: "@nemnesia/symbol-nem-wallet-core",
    version: VERSION,
  };
  writeJson(resolve(archiveRoot, "package/package.json"), registryPackage);
  const runtimeManifest = nativeManifest();
  writeJson(resolve(archiveRoot, "package/dist/native/artifact-manifest.json"), runtimeManifest);
  write(resolve(archiveRoot, "package/dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm"), Buffer.from("published wasm\n"));
  write(resolve(archiveRoot, "package/dist/wasm/generated.mjs"), "export const fixture = true;\n");
  mkdirSync(resolve(root, "candidate-tar-source/package"), { recursive: true });
  execFileSync("tar", ["-czf", registryPath, "-C", archiveRoot, "package"]);
  const oldTarball = Buffer.from("rerun rebuild tarball\n");
  const manifest = {
    schema_version: 1,
    mode: "release",
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: VERSION,
    release_tag: TAG,
    source_commit: COMMIT,
    npm_tarball: { filename: tarballFilename, package_name: "@nemnesia/symbol-nem-wallet-core", package_version: VERSION, sha256: hash(oldTarball), size: oldTarball.length },
  };
  for (const filename of NPM_REQUIRED_FILES) {
    if (filename === "release-manifest.json" || filename === "SHA256SUMS") continue;
    write(resolve(sourceDir, filename), `${filename}\n`);
  }
  writeJson(resolve(sourceDir, "release-manifest.json"), manifest);
  write(resolve(sourceDir, tarballFilename), oldTarball);
  write(resolve(sourceDir, "SHA256SUMS"), `${hash(oldTarball)}  ${tarballFilename}\n${hash(readFileSync(resolve(sourceDir, "release-manifest.json")))}  release-manifest.json\n`);
}

function rebuildRegistry(...members) {
  execFileSync("tar", ["-czf", registryPath, "-C", archiveRoot, ...members]);
}

const validRun = {
  id: "33816373291",
  repository: { full_name: "nemnesia/symbol-nem-wallet-core" },
  head_repository: { full_name: "nemnesia/symbol-nem-wallet-core" },
  event: "push",
  status: "completed",
  head_branch: TAG,
  head_sha: COMMIT,
  path: ".github/workflows/release.yml",
  run_attempt: 1,
  workflow_ref: null,
};

assert.equal(validateOriginalReleaseRun(validRun, {
  repository: "nemnesia/symbol-nem-wallet-core",
  releaseTag: TAG,
  sourceCommit: COMMIT,
  runId: "33816373291",
  runAttempt: "1",
}).attempt, 1);
expectFailure("current run endpoint must not satisfy original attempt 1", () => validateOriginalReleaseRun({ ...validRun, run_attempt: 4 }, {
  repository: "nemnesia/symbol-nem-wallet-core",
  releaseTag: TAG,
  sourceCommit: COMMIT,
  runId: "33816373291",
  runAttempt: "1",
}), /run attempt differs/);
for (const [field, value, pattern] of [
  ["id", "33816373290", /run id differs/],
  ["head_sha", "b".repeat(40), /tag or source commit differs/],
  ["head_branch", "v0.1.1", /tag or source commit differs/],
  ["path", ".github/workflows/node.yml", /workflow path differs/],
  ["repository", { full_name: "example/wrong" }, /repository identity differs/],
]) {
  const candidate = { ...validRun, ...(field === "repository" ? { repository: value } : { [field]: value }) };
  expectFailure(`wrong ${field}`, () => validateOriginalReleaseRun(candidate, {
    repository: "nemnesia/symbol-nem-wallet-core",
    releaseTag: TAG,
    sourceCommit: COMMIT,
    runId: "33816373291",
    runAttempt: "1",
  }), pattern);
}

const artifactMetadata = {
  artifacts: [
    { id: 1, name: "release-identity-33816373291-4-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", digest: `sha256:${"1".repeat(64)}`, size_in_bytes: 1, created_at: "2026-09-04T00:00:00Z", updated_at: "2026-09-04T00:00:01Z", expired: false },
    { id: 2, name: "release-npm-package-33816373291-4-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", digest: `sha256:${"2".repeat(64)}`, size_in_bytes: 2, created_at: "2026-09-04T00:00:00Z", updated_at: "2026-09-04T00:00:01Z", expired: false },
    { id: 3, name: "release-c-abi-33816373291-4-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", digest: `sha256:${"3".repeat(64)}`, size_in_bytes: 3, created_at: "2026-09-04T00:00:00Z", updated_at: "2026-09-04T00:00:01Z", expired: false },
  ],
};
const artifactSource = validateArtifactSource({
  run: { ...validRun, run_attempt: 4 },
  originalPublishRun: validRun,
  artifacts: artifactMetadata,
  repository: "nemnesia/symbol-nem-wallet-core",
  releaseTag: TAG,
  sourceCommit: COMMIT,
  runId: "33816373291",
  runAttempt: "4",
  originalPublishRunId: "33816373291",
  originalPublishRunAttempt: "1",
  artifactSuffix: "-33816373291-4-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
});
assert.equal(artifactSource.original_publish.run_attempt, 1);
assert.equal(artifactSource.artifact_source.run_attempt, 4);
assert.equal(artifactSource.artifact_source.attempt_binding, "attempt-scoped-name");
expectFailure("wrong artifact source run attempt", () => validateArtifactSource({
  run: { ...validRun, run_attempt: 4 },
  artifacts: artifactMetadata,
  repository: "nemnesia/symbol-nem-wallet-core",
  releaseTag: TAG,
  sourceCommit: COMMIT,
  runId: "33816373291",
  runAttempt: "3",
  artifactSuffix: "-33816373291-4-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
}), /run attempt differs/);

assert.equal(validateDispatchBoundary({ ref: "refs/heads/main", sha: COMMIT, mainRef: COMMIT }).status, "PASS");
expectFailure("feature dispatch ref", () => validateDispatchBoundary({ ref: "refs/heads/feature", sha: COMMIT, mainRef: COMMIT }), /refs\/heads\/main/);
expectFailure("stale main dispatch SHA", () => validateDispatchBoundary({ ref: "refs/heads/main", sha: "b".repeat(40), mainRef: COMMIT }), /current origin\/main/);
assert.equal(validateProvenanceInvocation({ provenance: { identities: [{ invocation_id: "https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33816373291/attempts/1" }] } }, { repository: "nemnesia/symbol-nem-wallet-core", runId: "33816373291" }).run_attempt, 1);
expectFailure("wrong provenance invocation run", () => validateProvenanceInvocation({ provenance: { identities: [{ invocation_id: "https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33816373290/attempts/1" }] } }, { repository: "nemnesia/symbol-nem-wallet-core", runId: "33816373291" }), /original publish run attempt/);
expectFailure("unbound provenance invocation", () => validateProvenanceInvocation({ provenance: { identities: [{ invocation_id: "https://github.com/nemnesia/symbol-nem-wallet-core/actions/runs/33816373291" }] } }, { repository: "nemnesia/symbol-nem-wallet-core", runId: "33816373291" }), /not bound/);

try {
  makeFixture();
  const result = reconstructPublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT });
  const candidateBytes = readFileSync(resolve(outputDir, tarballFilename));
  assert.equal(hash(candidateBytes), result.candidate_tarball_sha256);
  assert.notEqual(result.candidate_tarball_sha256, result.published_tarball_sha256);
  assert.equal(result.byte_reproducible, false);
  assert.equal(hash(readFileSync(resolve(outputDir, "published-win32-x64-msvc.node"))), hash(Buffer.from("published-win32-x64-msvc-0\n")));
  assert.equal(hash(readFileSync(resolve(outputDir, "published-wasm.wasm"))), hash(Buffer.from("published wasm\n")));
  const publishedEvidence = validatePublishedRecoveryEvidence({ releaseDir: outputDir, tag: TAG, sourceCommit: COMMIT });
  assert.equal(JSON.parse(readFileSync(resolve(outputDir, "release-manifest.json"), "utf8")).npm_tarball.sha256, hash(candidateBytes));
  assert.equal(publishedEvidence.manifest.native_artifacts[0].sha256, hash(Buffer.from("published-win32-x64-msvc-0\n")));
  assert.equal(publishedEvidence.manifest.wasm.sha256, hash(Buffer.from("published wasm\n")));
  assert.equal(publishedEvidence.manifest.byte_reproducible, false);
  assert.deepEqual(readdirSync(outputDir).sort(), [...NPM_REQUIRED_FILES, tarballFilename, ...PUBLISHED_RECOVERY_FILES].sort());

  writeFileSync(resolve(outputDir, "published-win32-x64-msvc.node"), "tampered");
  expectFailure("published native bytes mismatch", () => validatePublishedRecoveryEvidence({ releaseDir: outputDir, tag: TAG, sourceCommit: COMMIT }), /published native bytes differ/);
  makeFixture();
  reconstructPublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT });
  const manifest = JSON.parse(readFileSync(resolve(outputDir, "published-native-artifact-manifest.json"), "utf8"));
  manifest.artifacts[0].source_commit = "b".repeat(40);
  writeJson(resolve(outputDir, "published-native-artifact-manifest.json"), manifest);
  expectFailure("published native source commit mismatch", () => validatePublishedRecoveryEvidence({ releaseDir: outputDir, tag: TAG, sourceCommit: COMMIT }), /published recovery evidence file digests|published native runtime manifest identity/);

  makeFixture();
  const missingTargetManifest = JSON.parse(readFileSync(resolve(archiveRoot, "package/dist/native/artifact-manifest.json"), "utf8"));
  missingTargetManifest.artifacts.pop();
  writeJson(resolve(archiveRoot, "package/dist/native/artifact-manifest.json"), missingTargetManifest);
  rmSync(resolve(archiveRoot, "package/dist/native/linux-x64-gnu/linux-x64-gnu.node"));
  rebuildRegistry("package");
  expectFailure("missing native target", () => reconstructPublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT }), /native runtime target set/);

  makeFixture();
  const duplicateTargetManifest = JSON.parse(readFileSync(resolve(archiveRoot, "package/dist/native/artifact-manifest.json"), "utf8"));
  duplicateTargetManifest.artifacts.push({ ...duplicateTargetManifest.artifacts[0] });
  writeJson(resolve(archiveRoot, "package/dist/native/artifact-manifest.json"), duplicateTargetManifest);
  rebuildRegistry("package");
  expectFailure("duplicate native target", () => reconstructPublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT }), /published native runtime manifest is invalid/);

  makeFixture();
  rmSync(resolve(archiveRoot, "package/dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm"));
  rebuildRegistry("package");
  expectFailure("missing WASM", () => reconstructPublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT }), /published canonical WASM is missing/);

  makeFixture();
  write(resolve(archiveRoot, "package/dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm"), Buffer.alloc(0));
  rebuildRegistry("package");
  expectFailure("empty WASM", () => reconstructPublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT }), /published canonical WASM is empty/);

  makeFixture();
  const wrongVersionMetadata = JSON.parse(readFileSync(resolve(archiveRoot, "package/package.json"), "utf8"));
  wrongVersionMetadata.version = "0.1.1";
  writeJson(resolve(archiveRoot, "package/package.json"), wrongVersionMetadata);
  rebuildRegistry("package");
  expectFailure("wrong package version", () => reconstructPublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT }), /package identity differs/);

  makeFixture();
  const wrongRepositoryMetadata = JSON.parse(readFileSync(resolve(archiveRoot, "package/package.json"), "utf8"));
  wrongRepositoryMetadata.repository = { type: "git", url: "https://example.invalid/wrong.git", directory: "packages/wallet-core" };
  writeJson(resolve(archiveRoot, "package/package.json"), wrongRepositoryMetadata);
  rebuildRegistry("package");
  expectFailure("wrong repository metadata", () => reconstructPublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT }), /repository .*differs/);

  makeFixture();
  execFileSync("tar", ["-czf", registryPath, "--transform=s,^package/,package/../,", "-C", archiveRoot, "package"]);
  expectFailure("unsafe registry tar path", () => reconstructPublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT }), /unsafe path/);
} finally {
  rmSync(root, { recursive: true, force: true });
}

process.stdout.write("published npm recovery constituent and binding tests passed\n");

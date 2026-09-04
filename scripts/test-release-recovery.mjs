import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { canonicalizePublishedNpmBundle, NPM_REQUIRED_FILES, validateOriginalReleaseRun } from "./release-recovery.mjs";

const root = resolve(tmpdir(), `snwc-release-recovery-${process.pid}`);
const sourceDir = resolve(root, "source");
const outputDir = resolve(root, "output");
const registryPath = resolve(root, "registry.tgz");
const VERSION = "0.1.0";
const TAG = "v0.1.0";
const COMMIT = "a".repeat(40);
const tarballFilename = "nemnesia-symbol-nem-wallet-core-0.1.0.tgz";

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
  workflow_ref: "nemnesia/symbol-nem-wallet-core/.github/workflows/release.yml@refs/tags/v0.1.0",
};

assert.equal(validateOriginalReleaseRun(validRun, {
  repository: "nemnesia/symbol-nem-wallet-core",
  releaseTag: TAG,
  sourceCommit: COMMIT,
  runId: "33816373291",
  runAttempt: "1",
}).source_commit, COMMIT);
assert.throws(() => validateOriginalReleaseRun({ ...validRun, head_sha: "b".repeat(40) }, {
  repository: "nemnesia/symbol-nem-wallet-core",
  releaseTag: TAG,
  sourceCommit: COMMIT,
  runId: "33816373291",
  runAttempt: "1",
}), /tag or source commit differs/);
assert.throws(() => validateOriginalReleaseRun({ ...validRun, event: "workflow_dispatch" }, {
  repository: "nemnesia/symbol-nem-wallet-core",
  releaseTag: TAG,
  sourceCommit: COMMIT,
  runId: "33816373291",
  runAttempt: "1",
}), /completed tag push/);

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

try {
  mkdirSync(sourceDir, { recursive: true });
  const oldTarball = Buffer.from("rerun rebuild tarball\n");
  const registryTarball = Buffer.from("published registry tarball\n");
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
    writeFileSync(resolve(sourceDir, filename), `${filename}\n`);
  }
  writeJson(resolve(sourceDir, "release-manifest.json"), manifest);
  writeFileSync(resolve(sourceDir, tarballFilename), oldTarball);
  writeFileSync(resolve(sourceDir, "SHA256SUMS"), `${hash(oldTarball)}  ${tarballFilename}\n${hash(readFileSync(resolve(sourceDir, "release-manifest.json")))}  release-manifest.json\n`);
  writeFileSync(registryPath, registryTarball);

  const result = canonicalizePublishedNpmBundle({ sourceDir, registryTarballPath: registryPath, outputDir, tag: TAG, sourceCommit: COMMIT });
  assert.equal(result.original_tarball_sha256, hash(oldTarball));
  assert.equal(result.canonical_tarball_sha256, hash(registryTarball));
  assert.notEqual(result.original_tarball_sha256, result.canonical_tarball_sha256);
  assert.equal(hash(readFileSync(resolve(sourceDir, tarballFilename))), result.original_tarball_sha256, "source artifact remains unchanged");
  const recoveredManifest = JSON.parse(readFileSync(resolve(outputDir, "release-manifest.json"), "utf8"));
  assert.equal(recoveredManifest.npm_tarball.sha256, result.canonical_tarball_sha256);
  assert.equal(recoveredManifest.npm_tarball.size, registryTarball.length);
  assert.equal(hash(readFileSync(resolve(outputDir, tarballFilename))), result.canonical_tarball_sha256);
  assert.deepEqual(
    readdirNames(outputDir),
    [...NPM_REQUIRED_FILES, tarballFilename].sort(),
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

function readdirNames(path) {
  return readdirSync(path).sort();
}

process.stdout.write("published npm recovery canonical-artifact tests passed\n");

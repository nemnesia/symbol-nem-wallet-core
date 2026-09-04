import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NPM_REQUIRED_FILES } from "./release-record.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PACKAGE_NAME = "@nemnesia/symbol-nem-wallet-core";
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const RELEASE_WORKFLOW_PATH = ".github/workflows/release.yml";

function fail(message) {
  throw new Error(`Release recovery gate failed: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function json(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`${label} is unreadable or malformed`);
  }
}

function bytes(path, label) {
  try {
    return readFileSync(path);
  } catch {
    fail(`${label} is unreadable`);
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeFilename(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("/") || value.includes("\\") || value === "." || value === "..") {
    fail(`${label} is not a safe filename`);
  }
}

function assertDirectory(root, label) {
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`${label} is missing`);
}

function assertExactFiles(root, expected, label) {
  assertDirectory(root, label);
  const actual = readdirSync(root, { withFileTypes: true }).map((entry) => {
    if (!entry.isFile()) fail(`${label} contains a non-file entry: ${entry.name}`);
    safeFilename(entry.name, `${label} entry`);
    return entry.name;
  }).sort();
  const expectedSorted = [...new Set(expected)].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) fail(`${label} contains missing or unexpected files`);
}

function validateManifestIdentity(manifest, tag, sourceCommit) {
  if (!isPlainObject(manifest) || manifest.schema_version !== 1 || manifest.mode !== "release" || manifest.package_name !== PACKAGE_NAME || manifest.release_tag !== tag || manifest.source_commit !== sourceCommit || !isPlainObject(manifest.npm_tarball)) {
    fail("original release manifest identity is invalid");
  }
  if (!COMMIT_PATTERN.test(sourceCommit) || tag !== `v${manifest.package_version}`) fail("original release manifest tag/source identity is invalid");
  if (manifest.npm_tarball.package_name !== PACKAGE_NAME || manifest.npm_tarball.package_version !== manifest.package_version) fail("original release manifest package identity is invalid");
  safeFilename(manifest.npm_tarball.filename, "original release tarball filename");
  if (!HASH_PATTERN.test(manifest.npm_tarball.sha256) || !Number.isSafeInteger(manifest.npm_tarball.size) || manifest.npm_tarball.size < 0) fail("original release tarball identity is invalid");
  return manifest;
}

function updateDigestFile(sourcePath, outputPath, tarballFilename, tarballHash, manifestHash) {
  const content = bytes(sourcePath, "SHA256SUMS").toString("utf8");
  if (!content.endsWith("\n")) fail("SHA256SUMS must end with one newline");
  const lines = content.slice(0, -1).split("\n");
  let tarballSeen = false;
  let manifestSeen = false;
  const updated = lines.map((line, index) => {
    const match = /^([0-9a-f]{64}) {2}([^\s\r\n]+)$/.exec(line);
    if (match === null) fail(`SHA256SUMS line ${index + 1} is malformed`);
    if (match[2] === tarballFilename) {
      if (tarballSeen) fail("SHA256SUMS contains a duplicate npm tarball entry");
      tarballSeen = true;
      return `${tarballHash}  ${tarballFilename}`;
    }
    if (match[2] === "release-manifest.json") {
      if (manifestSeen) fail("SHA256SUMS contains a duplicate release manifest entry");
      manifestSeen = true;
      return `${manifestHash}  release-manifest.json`;
    }
    return line;
  });
  if (!tarballSeen || !manifestSeen) fail("SHA256SUMS does not contain the npm tarball and release manifest");
  writeFileSync(outputPath, `${updated.join("\n")}\n`);
}

export function validateOriginalReleaseRun(run, { repository, releaseTag, sourceCommit, runId, runAttempt }) {
  if (!isPlainObject(run)) fail("original release run metadata is malformed");
  if (repository !== "nemnesia/symbol-nem-wallet-core" || !/^v\d+\.\d+\.\d+$/.test(releaseTag) || !COMMIT_PATTERN.test(sourceCommit) || !/^\d+$/.test(String(runId))) fail("original release run request identity is invalid");
  if (String(run.id) !== String(runId)) fail("original release run id differs from the requested run");
  if (run.repository?.full_name !== repository || run.head_repository?.full_name !== repository) fail("original release run repository identity differs");
  if (run.event !== "push" || run.status !== "completed") fail("original release run is not a completed tag push");
  if (run.head_branch !== releaseTag || run.head_sha !== sourceCommit) fail("original release run tag or source commit differs");
  if (run.path !== RELEASE_WORKFLOW_PATH) fail("original release run workflow path differs");
  if (Number(run.run_attempt) !== Number(runAttempt) || !Number.isInteger(Number(run.run_attempt)) || Number(run.run_attempt) < 1) fail("original release run attempt differs");
  if (run.workflow_ref !== undefined && run.workflow_ref !== `${repository}/${RELEASE_WORKFLOW_PATH}@refs/tags/${releaseTag}`) fail("original release run workflow ref differs");
  return {
    id: String(run.id),
    attempt: Number(run.run_attempt),
    repository,
    workflow_path: RELEASE_WORKFLOW_PATH,
    workflow_ref: `${repository}/${RELEASE_WORKFLOW_PATH}@refs/tags/${releaseTag}`,
    release_tag: releaseTag,
    source_commit: sourceCommit,
  };
}

export function canonicalizePublishedNpmBundle({ sourceDir, registryTarballPath, outputDir, tag, sourceCommit }) {
  const sourceRoot = resolve(repositoryRoot, sourceDir);
  const outputRoot = resolve(repositoryRoot, outputDir);
  const registryPath = resolve(repositoryRoot, registryTarballPath);
  const manifest = validateManifestIdentity(json(resolve(sourceRoot, "release-manifest.json"), "original release manifest"), tag, sourceCommit);
  const expectedFiles = [...NPM_REQUIRED_FILES, manifest.npm_tarball.filename];
  assertExactFiles(sourceRoot, expectedFiles, "original npm release evidence");
  if (!existsSync(registryPath) || !statSync(registryPath).isFile()) fail("published registry tarball is missing");

  mkdirSync(outputRoot, { recursive: true });
  assertDirectory(outputRoot, "recovery npm output");
  for (const filename of NPM_REQUIRED_FILES) {
    const sourcePath = resolve(sourceRoot, filename);
    const outputPath = resolve(outputRoot, filename);
    if (sourcePath !== outputPath) copyFileSync(sourcePath, outputPath);
  }
  const registryTarball = bytes(registryPath, "published registry tarball");
  const registryHash = sha256(registryTarball);
  const originalTarball = { sha256: manifest.npm_tarball.sha256, size: manifest.npm_tarball.size };
  const tarballPath = resolve(outputRoot, manifest.npm_tarball.filename);
  writeFileSync(tarballPath, registryTarball);
  const rewrittenManifest = {
    ...manifest,
    npm_tarball: {
      ...manifest.npm_tarball,
      sha256: registryHash,
      size: registryTarball.length,
    },
  };
  const manifestPath = resolve(outputRoot, "release-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(rewrittenManifest, null, 2)}\n`);
  updateDigestFile(resolve(sourceRoot, "SHA256SUMS"), resolve(outputRoot, "SHA256SUMS"), manifest.npm_tarball.filename, registryHash, sha256(bytes(manifestPath, "recovery release manifest")));
  assertExactFiles(outputRoot, expectedFiles, "recovery npm evidence");

  return {
    package_name: PACKAGE_NAME,
    package_version: manifest.package_version,
    release_tag: tag,
    source_commit: sourceCommit,
    original_tarball_sha256: originalTarball.sha256,
    original_tarball_size: originalTarball.size,
    canonical_tarball_sha256: registryHash,
    canonical_tarball_size: registryTarball.length,
    canonical_source: "registry",
  };
}

function argument(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index < 0) {
    if (fallback !== undefined) return fallback;
    fail(`missing ${name}`);
  }
  if (argv[index + 1] === undefined || argv[index + 1].startsWith("--")) fail(`missing ${name}`);
  return argv[index + 1];
}

function run() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (command === "validate-run") {
    const result = validateOriginalReleaseRun(
      json(resolve(repositoryRoot, argument(argv, "--run-json")), "original release run metadata"),
      {
        repository: argument(argv, "--repository"),
        releaseTag: argument(argv, "--release-tag"),
        sourceCommit: argument(argv, "--source-commit"),
        runId: argument(argv, "--run-id"),
        runAttempt: argument(argv, "--run-attempt"),
      },
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command !== "canonicalize") fail("usage: canonicalize | validate-run");
  const result = canonicalizePublishedNpmBundle({
    sourceDir: argument(argv, "--source-dir"),
    registryTarballPath: argument(argv, "--registry-tarball"),
    outputDir: argument(argv, "--output"),
    tag: argument(argv, "--tag"),
    sourceCommit: argument(argv, "--source-commit"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

export { NPM_REQUIRED_FILES };

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

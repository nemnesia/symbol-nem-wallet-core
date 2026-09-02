import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  assembleNativeManifest,
  validateNativeArtifactInputs,
} from "../../../scripts/native-manifest.mjs";
import {
  CANONICAL_TARGET_ORDER,
  targetForRuntime,
  validateNativeManifest,
} from "../src/manifest.mjs";

const packageMeta = {
  name: "@nemnesia/symbol-nem-wallet-core",
  version: "0.1.0",
};
const sourceCommit = "ca270941a53f3517255d37ae51501c8c13cfcd16";

test("native target lookup follows the fixed platform and glibc contract", () => {
  assert.equal(targetForRuntime("win32", "x64", undefined), "win32-x64-msvc");
  assert.equal(targetForRuntime("darwin", "x64", undefined), "darwin-x64");
  assert.equal(targetForRuntime("darwin", "arm64", undefined), "darwin-arm64");
  assert.equal(targetForRuntime("linux", "x64", "2.28"), "linux-x64-gnu");
  assert.equal(targetForRuntime("linux", "x64", "2.39"), "linux-x64-gnu");
  assert.equal(targetForRuntime("linux", "x64", "2.27"), null);
  assert.equal(targetForRuntime("linux", "x64", ""), null);
  assert.equal(targetForRuntime("linux", "x64", undefined), null);
  assert.equal(targetForRuntime("linux", "arm64", "2.39"), null);
  assert.equal(targetForRuntime("freebsd", "x64", "2.39"), null);
});

test("manifest validator accepts the empty local manifest and rejects schema drift", () => {
  const manifest = {
    schema_version: 1,
    package_name: packageMeta.name,
    package_version: packageMeta.version,
    source_commit: sourceCommit,
    node_api_version: 8,
    artifacts: [],
  };
  assert.equal(validateNativeManifest(manifest, packageMeta), manifest);

  assert.throws(() => validateNativeManifest({ ...manifest, unexpected: true }, packageMeta));
  assert.throws(() => validateNativeManifest({ ...manifest, source_commit: sourceCommit.toUpperCase() }, packageMeta));
  assert.throws(() => validateNativeManifest({ ...manifest, artifacts: [{ target_id: "linux-x64-gnu" }] }, packageMeta));
});

test("assembler records only supplied artifacts, hashes bytes, and canonicalizes order", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-manifest-"));
  try {
    const linuxPath = resolve(directory, "linux.node");
    const darwinPath = resolve(directory, "darwin.node");
    writeFileSync(linuxPath, Buffer.from([1, 2, 3]));
    writeFileSync(darwinPath, Buffer.from([4, 5, 6]));
    const manifest = assembleNativeManifest({
      packageVersion: packageMeta.version,
      sourceCommit,
      toolchainIdentifier: "rustc test",
      artifacts: [
        { targetId: "linux-x64-gnu", path: linuxPath },
        { targetId: "darwin-arm64", path: darwinPath },
      ],
    });
    assert.deepEqual(
      manifest.artifacts.map((artifact) => artifact.target_id),
      ["darwin-arm64", "linux-x64-gnu"],
    );
    assert.equal(manifest.artifacts.length, 2);
    assert.equal(manifest.artifacts[0].relative_path, "dist/native/darwin-arm64/darwin.node");
    assert.equal(manifest.artifacts[1].relative_path, "dist/native/linux-x64-gnu/linux.node");
    assert.equal(manifest.artifacts[1].sha256.length, 64);
    assert.deepEqual(
      CANONICAL_TARGET_ORDER,
      ["win32-x64-msvc", "darwin-x64", "darwin-arm64", "linux-x64-gnu"],
    );
    assert.throws(() =>
      assembleNativeManifest({
        packageVersion: packageMeta.version,
        sourceCommit,
        toolchainIdentifier: "rustc test",
        artifacts: [{ targetId: "linux-x64-gnu", path: resolve(directory, "missing.node") }],
      }),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("native artifact preflight rejects unsafe or non-canonical inputs before assembly", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-native-preflight-"));
  try {
    const validPath = resolve(directory, "native.node");
    const nonNodePath = resolve(directory, "native.so");
    writeFileSync(validPath, Buffer.from([1]));
    writeFileSync(nonNodePath, Buffer.from([2]));
    const directoryNamedAsNode = resolve(directory, "folder.node");
    mkdirSync(directoryNamedAsNode);

    assert.deepEqual(
      validateNativeArtifactInputs([{ targetId: "linux-x64-gnu", path: validPath }]),
      [{ targetId: "linux-x64-gnu", path: validPath, artifactFilename: "native.node" }],
    );
    assert.throws(() =>
      validateNativeArtifactInputs([{ targetId: "../outside", path: validPath }]),
    );
    assert.throws(() =>
      validateNativeArtifactInputs([
        { targetId: "linux-x64-gnu", path: validPath },
        { targetId: "linux-x64-gnu", path: validPath },
      ]),
    );
    assert.throws(() =>
      validateNativeArtifactInputs([{ targetId: "linux-x64-gnu", path: resolve(directory, "missing.node") }]),
    );
    assert.throws(() =>
      validateNativeArtifactInputs([{ targetId: "linux-x64-gnu", path: nonNodePath }]),
    );
    assert.throws(() =>
      validateNativeArtifactInputs([{ targetId: "linux-x64-gnu", path: directoryNamedAsNode }]),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

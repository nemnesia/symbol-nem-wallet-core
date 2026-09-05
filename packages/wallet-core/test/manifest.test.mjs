import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  validArchive,
  validElf,
  validReactNativeArtifact,
} from "../../../scripts/react-native-fixtures.mjs";

import {
  assembleNativeManifest,
  validateNativeArtifactInputs,
} from "../../../scripts/native-manifest.mjs";
import {
  CANONICAL_TARGET_ORDER,
  targetForRuntime,
  validateNativeManifest,
} from "../src/manifest.mjs";
import {
  CANONICAL_REACT_NATIVE_TARGET_ORDER,
  REACT_NATIVE_TARGETS,
  assembleReactNativeManifest,
  validateReactNativeArtifactInputs,
  validateReactNativeManifest,
  validateReactNativeXcframework,
} from "../src/react-native-manifest.mjs";

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

test("React Native manifest keeps the four approved target identities and rejects extras", () => {
  const manifest = {
    schema_version: 1,
    package_name: packageMeta.name,
    package_version: packageMeta.version,
    source_commit: sourceCommit,
    artifacts: [],
  };
  assert.equal(validateReactNativeManifest(manifest, packageMeta), manifest);
  assert.throws(() => validateReactNativeManifest(manifest, packageMeta, { requireComplete: true }));
  assert.deepEqual(CANONICAL_REACT_NATIVE_TARGET_ORDER, [
    "android-arm64-v8a",
    "android-x86_64",
    "ios-arm64",
    "ios-simulator-arm64",
  ]);
  assert.equal(REACT_NATIVE_TARGETS["android-arm64-v8a"].architecture, "arm64-v8a");
  assert.equal(REACT_NATIVE_TARGETS["ios-simulator-arm64"].architecture, "arm64");
  assert.throws(() => validateReactNativeManifest({ ...manifest, unexpected: true }, packageMeta));
  assert.throws(() => validateReactNativeManifest({ ...manifest, source_commit: sourceCommit.toUpperCase() }, packageMeta));
  assert.throws(() => validateReactNativeManifest({ ...manifest, artifacts: [{ target_id: "android-x86" }] }, packageMeta));
});

test("React Native assembly hashes only supplied canonical artifacts and rejects partial release input", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-react-native-manifest-"));
  try {
    const paths = Object.fromEntries(
      Object.entries(REACT_NATIVE_TARGETS).map(([targetId, target]) => {
        const path = resolve(directory, targetId, target.artifactFilename);
        mkdirSync(resolve(directory, targetId), { recursive: true });
        writeFileSync(path, validReactNativeArtifact(targetId));
        return [targetId, path];
      }),
    );
    assert.deepEqual(validateReactNativeArtifactInputs([]), []);
    assert.throws(() => validateReactNativeArtifactInputs([
      { targetId: "android-arm64-v8a", path: paths["android-arm64-v8a"] },
    ], { requireComplete: true }));
    const manifest = assembleReactNativeManifest({
      packageVersion: packageMeta.version,
      sourceCommit,
      toolchainIdentifier: "test-toolchain",
      requireComplete: true,
      artifacts: Object.entries(paths).reverse().map(([targetId, path]) => ({ targetId, path })),
    });
    assert.deepEqual(
      manifest.artifacts.map((artifact) => artifact.target_id),
      CANONICAL_REACT_NATIVE_TARGET_ORDER,
    );
    assert.equal(manifest.artifacts.every((artifact) => artifact.sha256.length === 64), true);
    assert.throws(() => validateReactNativeArtifactInputs([
      { targetId: "android-arm64-v8a", path: resolve(directory, "wrong.node") },
    ]));
    const textPath = resolve(directory, "text", REACT_NATIVE_TARGETS["android-arm64-v8a"].artifactFilename);
    const wrongElfPath = resolve(directory, "android-arm64-v8a", REACT_NATIVE_TARGETS["android-arm64-v8a"].artifactFilename);
    const wrongMachOPath = resolve(directory, "ios-arm64", REACT_NATIVE_TARGETS["ios-arm64"].artifactFilename);
    const extraMachOPath = resolve(directory, "ios-extra", REACT_NATIVE_TARGETS["ios-arm64"].artifactFilename);
    const missingSymbolPath = resolve(directory, "missing-symbol", REACT_NATIVE_TARGETS["android-arm64-v8a"].artifactFilename);
    const nonExportedPath = resolve(directory, "non-exported", REACT_NATIVE_TARGETS["android-arm64-v8a"].artifactFilename);
    const malformedPath = resolve(directory, "malformed", REACT_NATIVE_TARGETS["android-arm64-v8a"].artifactFilename);
    mkdirSync(resolve(directory, "text"), { recursive: true });
    mkdirSync(resolve(directory, "ios-extra"), { recursive: true });
    mkdirSync(resolve(directory, "missing-symbol"), { recursive: true });
    mkdirSync(resolve(directory, "non-exported"), { recursive: true });
    mkdirSync(resolve(directory, "malformed"), { recursive: true });
    writeFileSync(textPath, Buffer.from("not an ELF"));
    writeFileSync(wrongElfPath, validElf(62, "libsymbol_nem_wallet_core_rn.so"));
    writeFileSync(wrongMachOPath, validArchive(7));
    writeFileSync(extraMachOPath, validArchive(2, { objectPlatforms: [2, 7] }));
    writeFileSync(missingSymbolPath, validElf(183, "libsymbol_nem_wallet_core_rn.so", { symbols: ["snwc_rn_module_identity"] }));
    writeFileSync(nonExportedPath, validElf(183, "libsymbol_nem_wallet_core_rn.so", { exported: false }));
    const malformed = validElf(183, "libsymbol_nem_wallet_core_rn.so");
    malformed.writeBigUInt64LE(0n, 176 + 8);
    writeFileSync(malformedPath, malformed);
    assert.throws(() => validateReactNativeArtifactInputs([
      { targetId: "android-arm64-v8a", path: textPath },
    ]));
    assert.throws(() => validateReactNativeArtifactInputs([
      { targetId: "android-arm64-v8a", path: wrongElfPath },
    ]));
    assert.throws(() => validateReactNativeArtifactInputs([
      { targetId: "ios-arm64", path: wrongMachOPath },
    ]));
    assert.throws(() => validateReactNativeArtifactInputs([
      { targetId: "ios-arm64", path: extraMachOPath },
    ]));
    assert.throws(() => validateReactNativeArtifactInputs([
      { targetId: "android-arm64-v8a", path: missingSymbolPath },
    ]));
    assert.throws(() => validateReactNativeArtifactInputs([
      { targetId: "android-arm64-v8a", path: nonExportedPath },
    ]));
    assert.throws(() => validateReactNativeArtifactInputs([
      { targetId: "android-arm64-v8a", path: malformedPath },
    ]));

    const xcframework = resolve(directory, "SymbolNemWalletCoreRN.xcframework");
    for (const [identifier, platform] of [["ios-arm64", 2], ["ios-arm64-simulator", 7]]) {
      mkdirSync(resolve(xcframework, identifier), { recursive: true });
      writeFileSync(resolve(xcframework, identifier, "libsymbol_nem_wallet_core_rn.a"), validArchive(platform));
    }
    writeFileSync(resolve(xcframework, "Info.plist"), `<?xml version="1.0"?>
<plist version="1.0"><dict><key>AvailableLibraries</key><array>
<dict><key>LibraryIdentifier</key><string>ios-arm64</string><key>LibraryPath</key><string>libsymbol_nem_wallet_core_rn.a</string><key>SupportedArchitectures</key><array><string>arm64</string></array><key>SupportedPlatform</key><string>ios</string></dict>
<dict><key>LibraryIdentifier</key><string>ios-arm64-simulator</string><key>LibraryPath</key><string>libsymbol_nem_wallet_core_rn.a</string><key>SupportedArchitectures</key><array><string>arm64</string></array><key>SupportedPlatform</key><string>ios</string><key>SupportedPlatformVariant</key><string>simulator</string></dict>
</array><key>CFBundlePackageType</key><string>XFWK</string><key>XCFrameworkFormatVersion</key><string>1.0</string></dict></plist>`);
    assert.deepEqual(validateReactNativeXcframework(xcframework).slices, ["ios-arm64", "ios-arm64-simulator"]);
    writeFileSync(resolve(xcframework, "unexpected.txt"), "extra");
    assert.throws(() => validateReactNativeXcframework(xcframework));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

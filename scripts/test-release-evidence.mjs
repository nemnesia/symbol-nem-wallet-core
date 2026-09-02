import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  canonicalCargoLockBytes,
  canonicalPnpmLockBytes,
  cargoLockSha256,
  pnpmLockSha256,
} from "./release-evidence.mjs";
import {
  createReleaseManifest,
  renderSha256Sums,
  validateReleaseManifest,
} from "./release-manifest.mjs";
import { CANONICAL_TARGET_ORDER, NATIVE_TARGETS } from "../packages/wallet-core/src/manifest.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function commit() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
}

function wasmBindgenVersion() {
  const matches = [
    ...canonicalCargoLockBytes().toString("utf8").matchAll(/\[\[package\]\]\nname = "wasm-bindgen"\nversion = "([^"]+)"/g),
  ];
  assert.equal(matches.length, 1);
  return matches[0][1];
}

function createTarball(root, metadata, name = "nemnesia-symbol-nem-wallet-core-0.1.0.tgz") {
  const archiveRoot = resolve(root, `archive-${name}`);
  mkdirSync(resolve(archiveRoot, "package"), { recursive: true });
  writeJson(resolve(archiveRoot, "package/package.json"), metadata);
  const tarball = resolve(root, name);
  execFileSync("tar", ["-czf", tarball, "-C", archiveRoot, "package"], { cwd: repositoryRoot });
  return tarball;
}

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "snwc-release-manifest-test-"));
  const packageRoot = resolve(root, "package");
  const nativeEvidenceRoot = resolve(root, "native-evidence");
  const wasmRoot = resolve(root, "wasm-evidence");
  mkdirSync(resolve(packageRoot, "dist/native"), { recursive: true });
  mkdirSync(resolve(packageRoot, "dist/wasm/snippets/fixture"), { recursive: true });
  mkdirSync(nativeEvidenceRoot, { recursive: true });
  mkdirSync(wasmRoot, { recursive: true });

  const metadata = JSON.parse(readFileSync(resolve(repositoryRoot, "packages/wallet-core/package.json"), "utf8"));
  writeJson(resolve(packageRoot, "package.json"), metadata);
  for (const file of ["README.md", "README.en.md", "LICENSE"]) writeFileSync(resolve(packageRoot, file), file);
  for (const file of [
    "dist/index.d.ts",
    "dist/node/index.mjs",
    "dist/node/index.cjs",
    "dist/wasm/generated.mjs",
    "dist/wasm/generated.cjs",
    "dist/wasm/asset.mjs",
    "dist/wasm/index.mjs",
    "dist/wasm/index.cjs",
    "dist/wasm/snippets/fixture/index.js",
  ]) {
    const parent = resolve(packageRoot, file, "..");
    mkdirSync(parent, { recursive: true });
    writeFileSync(resolve(packageRoot, file), file);
  }

  const sourceCommit = commit();
  const toolchainIdentifier = "rustc 1.85.0 (fixture)";
  const nativeEvidence = [];
  for (const targetId of CANONICAL_TARGET_ORDER) {
    const nativeBytes = Buffer.from(`native-${targetId}`);
    const artifactFilename = `${targetId}.node`;
    const nativePath = resolve(nativeEvidenceRoot, artifactFilename);
    writeFileSync(nativePath, nativeBytes);
    const packagePath = resolve(packageRoot, `dist/native/${targetId}/${artifactFilename}`);
    mkdirSync(resolve(packagePath, ".."), { recursive: true });
    writeFileSync(packagePath, nativeBytes);
    const target = NATIVE_TARGETS[targetId];
    const evidence = {
      schema_version: 1,
      kind: "native",
      target_id: targetId,
      rust_target: target.rust_target,
      source_commit: sourceCommit,
      package_version: metadata.version,
      cargo_lock_sha256: cargoLockSha256(),
      artifact_filename: artifactFilename,
      artifact_sha256: sha256(nativeBytes),
      artifact_size: nativeBytes.length,
      node_api_version: 8,
      toolchain_identifier: toolchainIdentifier,
    };
    if (targetId === "linux-x64-gnu") {
      evidence.glibc_version_runtime = "2.28";
      evidence.max_required_glibc_symbol = "2.28";
    }
    writeJson(resolve(nativeEvidenceRoot, `${targetId}.json`), evidence);
    nativeEvidence.push(evidence);
  }

  const runtimeManifest = {
    schema_version: 1,
    package_name: metadata.name,
    package_version: metadata.version,
    source_commit: sourceCommit,
    node_api_version: 8,
    artifacts: nativeEvidence.map((evidence) => {
      const target = NATIVE_TARGETS[evidence.target_id];
      const artifact = {
        target_id: evidence.target_id,
        os: target.os,
        cpu: target.cpu,
        abi: target.abi,
        rust_target: target.rust_target,
        relative_path: `dist/native/${evidence.target_id}/${evidence.artifact_filename}`,
        artifact_filename: evidence.artifact_filename,
        sha256: evidence.artifact_sha256,
        toolchain_identifier: toolchainIdentifier,
      };
      if (target.libc !== undefined) artifact.libc = target.libc;
      return artifact;
    }),
  };
  writeJson(resolve(packageRoot, "dist/native/artifact-manifest.json"), runtimeManifest);

  const wasmBytes = Buffer.from("raw Rust wasm input");
  const wasmSourcePath = resolve(wasmRoot, "symbol_nem_wallet_core_wasm.wasm");
  writeFileSync(wasmSourcePath, wasmBytes);
  const wasmSummary = {
    schema_version: 1,
    kind: "wasm",
    source_commit: sourceCommit,
    package_version: metadata.version,
    cargo_lock_sha256: cargoLockSha256(),
    artifact_filename: "symbol_nem_wallet_core_wasm.wasm",
    artifact_sha256: sha256(wasmBytes),
    artifact_size: wasmBytes.length,
    toolchain_identifier: toolchainIdentifier,
  };
  writeJson(resolve(wasmRoot, "wasm-summary.json"), wasmSummary);
  writeJson(resolve(wasmRoot, "wasm-evidence.json"), wasmSummary);
  writeJson(resolve(wasmRoot, "wasm-bindgen-version.json"), {
    cargo_lock_version: wasmBindgenVersion(),
    cli_version: wasmBindgenVersion(),
    version_match: true,
  });
  const canonicalWasm = Buffer.from("wasm-bindgen transformed wasm");
  writeFileSync(resolve(packageRoot, "dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm"), canonicalWasm);

  const sourceEvidencePath = resolve(root, "release-source.json");
  writeJson(sourceEvidencePath, {
    source_commit: sourceCommit,
    package_name: metadata.name,
    package_version: metadata.version,
    cargo_lock_sha256: cargoLockSha256(),
    pnpm_lock_sha256: pnpmLockSha256(),
    required_native_targets: [...CANONICAL_TARGET_ORDER],
  });
  const nativeSummaryPath = resolve(root, "native-summary.json");
  writeJson(nativeSummaryPath, {
    source_commit: sourceCommit,
    package_version: metadata.version,
    cargo_lock_sha256: cargoLockSha256(),
    native_artifact_count: nativeEvidence.length,
    targets: nativeEvidence,
    toolchain_identifier: toolchainIdentifier,
  });
  const tarballPath = createTarball(root, { name: metadata.name, version: metadata.version });
  const paths = {
    sourceEvidencePath,
    nativeSummaryPath,
    nativeEvidenceRoot,
    wasmSummaryPath: resolve(wasmRoot, "wasm-summary.json"),
    wasmEvidencePath: resolve(wasmRoot, "wasm-evidence.json"),
    wasmBindgenEvidencePath: resolve(wasmRoot, "wasm-bindgen-version.json"),
    wasmSourcePath,
    packageRoot,
    tarballPath,
  };
  const toolchains = {
    rust: { identifier: toolchainIdentifier },
    node: { version: "v24.0.0" },
    npm: { version: "11.0.0" },
    pnpm: { version: "11.18.0" },
    wasm_bindgen: { cargo_lock_version: wasmBindgenVersion(), cli_version: wasmBindgenVersion() },
  };
  const manifestPath = resolve(root, "release-manifest.json");
  const sha256sumsPath = resolve(root, "SHA256SUMS");
  return {
    root,
    ...paths,
    manifestPath,
    sha256sumsPath,
    toolchains,
    manifest: createReleaseManifest({ ...paths, mode: "candidate", toolchains }),
  };
}

function validationInput(fixture) {
  return {
    ...fixture,
    manifestPath: fixture.manifestPath,
    sha256sumsPath: fixture.sha256sumsPath,
  };
}

function writeFixtureManifest(fixture, manifest) {
  writeJson(fixture.manifestPath, manifest);
  writeFileSync(fixture.sha256sumsPath, renderSha256Sums(manifest, fixture.manifestPath));
}

function expectFailure(fixture, mutate, message) {
  const original = JSON.parse(readFileSync(fixture.manifestPath, "utf8"));
  const changed = JSON.parse(JSON.stringify(original));
  mutate(changed);
  writeJson(fixture.manifestPath, changed);
  assert.throws(() => validateReleaseManifest(validationInput(fixture)), new RegExp(message));
  writeFixtureManifest(fixture, original);
}

const cargoCanonical = canonicalCargoLockBytes();
const pnpmCanonical = canonicalPnpmLockBytes();
const cargoCrlf = Buffer.from(cargoCanonical.toString("utf8").replace(/\r?\n/g, "\r\n"));
const pnpmCrlf = Buffer.from(pnpmCanonical.toString("utf8").replace(/\r?\n/g, "\r\n"));
assert.notEqual(sha256(cargoCanonical), sha256(cargoCrlf));
assert.notEqual(sha256(pnpmCanonical), sha256(pnpmCrlf));
assert.equal(cargoLockSha256(), sha256(cargoCanonical));
assert.equal(pnpmLockSha256(), sha256(pnpmCanonical));

const source = JSON.parse(
  execFileSync(process.execPath, ["scripts/release-evidence.mjs", "source"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }),
);
assert.equal(source.cargo_lock_sha256, sha256(cargoCanonical));
assert.equal(source.pnpm_lock_sha256, sha256(pnpmCanonical));

const fixtureData = fixture();
try {
  writeFixtureManifest(fixtureData, fixtureData.manifest);
  validateReleaseManifest(validationInput(fixtureData));
  const repeated = createReleaseManifest({
    sourceEvidencePath: fixtureData.sourceEvidencePath,
    nativeSummaryPath: fixtureData.nativeSummaryPath,
    nativeEvidenceRoot: fixtureData.nativeEvidenceRoot,
    wasmSummaryPath: fixtureData.wasmSummaryPath,
    wasmEvidencePath: fixtureData.wasmEvidencePath,
    wasmBindgenEvidencePath: fixtureData.wasmBindgenEvidencePath,
    wasmSourcePath: fixtureData.wasmSourcePath,
    packageRoot: fixtureData.packageRoot,
    tarballPath: fixtureData.tarballPath,
    mode: "candidate",
    toolchains: fixtureData.toolchains,
  });
  assert.deepEqual(repeated, fixtureData.manifest);
  assert.equal(renderSha256Sums(repeated, fixtureData.manifestPath), readFileSync(fixtureData.sha256sumsPath, "utf8"));
  const formal = createReleaseManifest({
    sourceEvidencePath: fixtureData.sourceEvidencePath,
    nativeSummaryPath: fixtureData.nativeSummaryPath,
    nativeEvidenceRoot: fixtureData.nativeEvidenceRoot,
    wasmSummaryPath: fixtureData.wasmSummaryPath,
    wasmEvidencePath: fixtureData.wasmEvidencePath,
    wasmBindgenEvidencePath: fixtureData.wasmBindgenEvidencePath,
    wasmSourcePath: fixtureData.wasmSourcePath,
    packageRoot: fixtureData.packageRoot,
    tarballPath: fixtureData.tarballPath,
    mode: "release",
    releaseTag: "v0.1.0",
    toolchains: fixtureData.toolchains,
  });
  assert.equal(formal.release_tag, "v0.1.0");

  expectFailure(fixtureData, (manifest) => { manifest.native_artifacts[0].sha256 = "0".repeat(64); }, "native evidence mismatch");
  expectFailure(fixtureData, (manifest) => { manifest.native_artifacts[0].size += 1; }, "native evidence mismatch");
  expectFailure(fixtureData, (manifest) => { manifest.source_commit = "b".repeat(40); }, "native artifact identity mismatch");
  expectFailure(fixtureData, (manifest) => { manifest.package_version = "0.1.1"; }, "native artifact identity mismatch");
  expectFailure(fixtureData, (manifest) => { manifest.native_artifacts[0].target_id = "darwin-x64"; }, "release native artifact identity mismatch");
  expectFailure(fixtureData, (manifest) => { manifest.native_artifacts.pop(); }, "native artifact count");
  expectFailure(fixtureData, (manifest) => { manifest.native_artifacts[1].artifact_filename = manifest.native_artifacts[0].artifact_filename; }, "release native artifact identity mismatch");
  expectFailure(fixtureData, (manifest) => { manifest.wasm.canonical_artifact.sha256 = "0".repeat(64); }, "canonical package WASM hash mismatch");
  expectFailure(fixtureData, (manifest) => { manifest.cargo_lock_sha256 = "0".repeat(64); }, "WASM artifact source/version/lockfile mismatch");
  expectFailure(fixtureData, (manifest) => { manifest.schema_version = 2; }, "unsupported release manifest schema");
  expectFailure(fixtureData, (manifest) => { manifest.unexpected = true; }, "release manifest has unexpected");
  expectFailure(fixtureData, (manifest) => { manifest.npm_tarball.filename = "other.tgz"; }, "npm tarball filename differs");

  const nativePath = resolve(fixtureData.nativeEvidenceRoot, "win32-x64-msvc.node");
  const nativeOriginal = readFileSync(nativePath);
  writeFileSync(nativePath, Buffer.concat([nativeOriginal, Buffer.from([0])]));
  assert.throws(() => validateReleaseManifest(validationInput(fixtureData)), /native evidence artifact hash mismatch/);
  writeFileSync(nativePath, nativeOriginal);

  const packageNativePath = resolve(fixtureData.packageRoot, "dist/native/win32-x64-msvc/win32-x64-msvc.node");
  const packageNativeOriginal = readFileSync(packageNativePath);
  writeFileSync(packageNativePath, Buffer.concat([packageNativeOriginal, Buffer.from([0])]));
  assert.throws(() => validateReleaseManifest(validationInput(fixtureData)), /assembled native artifact hash mismatch/);
  writeFileSync(packageNativePath, packageNativeOriginal);

  const wasmOriginal = readFileSync(fixtureData.wasmSourcePath);
  writeFileSync(fixtureData.wasmSourcePath, Buffer.concat([wasmOriginal, Buffer.from([0])]));
  assert.throws(() => validateReleaseManifest(validationInput(fixtureData)), /WASM source artifact hash mismatch/);
  writeFileSync(fixtureData.wasmSourcePath, wasmOriginal);

  const tarballOriginal = readFileSync(fixtureData.tarballPath);
  writeFileSync(fixtureData.tarballPath, Buffer.concat([tarballOriginal, Buffer.from([0])]));
  assert.throws(() => validateReleaseManifest(validationInput(fixtureData)), /npm tarball hash mismatch/);
  writeFileSync(fixtureData.tarballPath, tarballOriginal);

  const badNameTarball = createTarball(fixtureData.root, { name: "wrong-package", version: "0.1.0" }, "wrong-name.tgz");
  assert.throws(() => createReleaseManifest({
    sourceEvidencePath: fixtureData.sourceEvidencePath,
    nativeSummaryPath: fixtureData.nativeSummaryPath,
    nativeEvidenceRoot: fixtureData.nativeEvidenceRoot,
    wasmSummaryPath: fixtureData.wasmSummaryPath,
    wasmEvidencePath: fixtureData.wasmEvidencePath,
    wasmBindgenEvidencePath: fixtureData.wasmBindgenEvidencePath,
    wasmSourcePath: fixtureData.wasmSourcePath,
    packageRoot: fixtureData.packageRoot,
    tarballPath: badNameTarball,
    mode: "candidate",
    toolchains: fixtureData.toolchains,
  }), /npm tarball package metadata identity is invalid/);
  const badVersionTarball = createTarball(fixtureData.root, { name: "@nemnesia/symbol-nem-wallet-core", version: "0.1.1" }, "wrong-version.tgz");
  assert.throws(() => createReleaseManifest({
    sourceEvidencePath: fixtureData.sourceEvidencePath,
    nativeSummaryPath: fixtureData.nativeSummaryPath,
    nativeEvidenceRoot: fixtureData.nativeEvidenceRoot,
    wasmSummaryPath: fixtureData.wasmSummaryPath,
    wasmEvidencePath: fixtureData.wasmEvidencePath,
    wasmBindgenEvidencePath: fixtureData.wasmBindgenEvidencePath,
    wasmSourcePath: fixtureData.wasmSourcePath,
    packageRoot: fixtureData.packageRoot,
    tarballPath: badVersionTarball,
    mode: "candidate",
    toolchains: fixtureData.toolchains,
  }), /npm tarball metadata differs/);

  const malformed = readFileSync(fixtureData.manifestPath);
  writeFileSync(fixtureData.manifestPath, "{");
  assert.throws(() => validateReleaseManifest(validationInput(fixtureData)), /unreadable or malformed/);
  writeFileSync(fixtureData.manifestPath, malformed);

  const sumsOriginal = readFileSync(fixtureData.sha256sumsPath);
  writeFileSync(fixtureData.sha256sumsPath, `${sumsOriginal.toString().replace(/\n$/, "")}\n${"0".repeat(64)}  extra\n`);
  assert.throws(() => validateReleaseManifest(validationInput(fixtureData)), /SHA256SUMS has missing or extra artifacts/);
  writeFileSync(fixtureData.sha256sumsPath, sumsOriginal.toString().split("\n").slice(0, -2).join("\n") + "\n");
  assert.throws(() => validateReleaseManifest(validationInput(fixtureData)), /SHA256SUMS has missing or extra artifacts/);
  writeFileSync(fixtureData.sha256sumsPath, `${"0".repeat(64)}${sumsOriginal.toString().slice(64)}`);
  assert.throws(() => validateReleaseManifest(validationInput(fixtureData)), /SHA256SUMS hash mismatch/);
  writeFileSync(fixtureData.sha256sumsPath, sumsOriginal);
} finally {
  rmSync(fixtureData.root, { recursive: true, force: true });
}

process.stdout.write("release evidence and manifest deterministic tests passed\n");

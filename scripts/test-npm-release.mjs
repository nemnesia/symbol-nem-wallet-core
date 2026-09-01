import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { targetForRuntime, validateNativeManifest } from "../packages/wallet-core/src/manifest.mjs";
import { validatePackageContents } from "./package-contents.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(repositoryRoot, "packages/wallet-core");
const packageName = "@nemnesia/symbol-nem-wallet-core";
const MAX_NATIVE_BYTES = 15 * 1024 * 1024;
const MAX_WASM_BYTES = 12 * 1024 * 1024;
const MAX_TARBALL_BYTES = 50 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 150 * 1024 * 1024;

function fail(message) {
  throw new Error(`Stage 9 npm release gate failed: ${message}`);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    ...options,
  });
}

function runQuiet(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    ...options,
  });
}

function json(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`invalid JSON: ${path}`);
  }
}

function bytes(path) {
  try {
    return readFileSync(path);
  } catch {
    fail(`file is unreadable: ${path}`);
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function files(root, prefix = "") {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = resolve(root, entry.name);
    return entry.isDirectory() ? files(absolute, relative) : [relative];
  });
}

function packageMeta() {
  return json(resolve(packageRoot, "package.json"));
}

function validateAssembledManifest(manifest, meta) {
  if (process.env.SNWC_SOURCE_COMMIT !== undefined && manifest.source_commit !== process.env.SNWC_SOURCE_COMMIT) {
    fail("assembled manifest source commit differs from the release source snapshot");
  }
  const toolchains = new Set();
  for (const artifact of manifest.artifacts) {
    const artifactPath = resolve(packageRoot, artifact.relative_path);
    if (!existsSync(artifactPath) || sha256(bytes(artifactPath)) !== artifact.sha256) {
      fail(`assembled native artifact hash mismatch: ${artifact.target_id}`);
    }
    toolchains.add(artifact.toolchain_identifier);
  }
  if (toolchains.size !== 1) fail("assembled native artifacts do not share one toolchain identifier");
}

function currentTarget() {
  return targetForRuntime(
    process.platform,
    process.arch,
    process.platform === "linux" ? process.report?.getReport?.().header?.glibcVersionRuntime : undefined,
  );
}

function packagePath(projectRoot) {
  return resolve(projectRoot, "node_modules", "@nemnesia", "symbol-nem-wallet-core");
}

function validateInstallMetadata(projectRoot) {
  const installedMeta = json(resolve(packagePath(projectRoot), "package.json"));
  for (const field of ["scripts", "dependencies", "optionalDependencies", "peerDependencies", "bundledDependencies"]) {
    if (installedMeta[field] !== undefined && Object.keys(installedMeta[field]).length > 0) {
      fail(`clean package must not declare install-time code or dependencies: ${field}`);
    }
  }
  return {
    postinstall: false,
    remote_artifact_download: false,
    cargo_execution: false,
    node_gyp: false,
  };
}

function installClean(tarball) {
  const projectRoot = mkdtempSync(resolve(tmpdir(), "snwc-stage9-clean-"));
  writeFileSync(
    resolve(projectRoot, "package.json"),
    `${JSON.stringify({ name: "snwc-stage9-consumer", private: true, type: "module" }, null, 2)}\n`,
  );
  run(npmCommand(), [
    "install",
    "--ignore-scripts",
    "--offline",
    "--no-audit",
    "--no-fund",
    "--package-lock=false",
    tarball,
  ], {
    cwd: projectRoot,
    env: {
      ...process.env,
      npm_config_ignore_scripts: "true",
      npm_config_offline: "true",
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_cache: resolve(tmpdir(), "snwc-npm-cache"),
    },
  });
  validateInstallMetadata(projectRoot);
  return projectRoot;
}

function smokeSource(moduleSyntax) {
  const importLine = moduleSyntax === "esm"
    ? `import * as api from ${JSON.stringify(packageName)};`
    : `const api = require(${JSON.stringify(packageName)});`;
  return `${importLine}
const expectedNames = [
  "change_profile_password", "create_empty_store", "delete_profile", "delete_software_key",
  "derive_software_key", "export_mnemonic", "export_private_key", "finalize_generated_profile",
  "generate_software_key", "get_public_account", "import_software_key", "list_profiles",
  "list_software_keys", "prepare_generated_profile", "restore_profile", "sign",
].sort();
const names = Object.keys(api).sort();
if (JSON.stringify(names) !== JSON.stringify(expectedNames)) throw new Error("public surface mismatch");
const store = api.create_empty_store();
if (!(store instanceof Uint8Array)) throw new Error("store is not Uint8Array");
const listed = api.list_profiles(store);
if (!Array.isArray(listed.value) || listed.value.length !== 0) throw new Error("empty store operation failed");
const password = new TextEncoder().encode("stage9 release fixture password");
const prepared = api.prepare_generated_profile(store, password, 1);
const restored = api.finalize_generated_profile(
  store,
  prepared.value.pending_profile,
  password,
  { status: "confirmed" },
);
if (!(restored.store instanceof Uint8Array) || restored.store.length === 0) throw new Error("replacement Store missing");
let error;
try { api.list_profiles(Uint8Array.of(0)); } catch (value) { error = value; }
if (error?.name !== "WalletCoreError" || error?.code !== "InvalidStore" || error?.message !== "InvalidStore") throw new Error("Core error semantics mismatch");
process.stdout.write(JSON.stringify({
  public_operation_count: names.length,
  empty_store_success: true,
  replacement_store_success: true,
  core_error: { name: error.name, code: error.code, message: error.message },
}) + "\\n");
`;
}

function runSmoke(projectRoot, moduleSyntax, noAddons) {
  const extension = moduleSyntax === "esm" ? "mjs" : "cjs";
  const runner = resolve(projectRoot, `smoke-${moduleSyntax}-${noAddons ? "wasm" : "native"}.${extension}`);
  writeFileSync(runner, smokeSource(moduleSyntax));
  const args = [];
  if (noAddons) args.push("--no-addons");
  args.push(runner);
  const output = runQuiet(process.execPath, args, { cwd: projectRoot });
  return JSON.parse(output);
}

function runInitializationFailure(projectRoot, moduleSyntax) {
  const extension = moduleSyntax === "esm" ? "mjs" : "cjs";
  const runner = resolve(projectRoot, `failure-${moduleSyntax}.${extension}`);
  const source = moduleSyntax === "esm"
    ? `try { await import(${JSON.stringify(packageName)}); process.exitCode = 1; } catch (error) { if (error?.name !== "WalletCoreBackendInitializationError") process.exitCode = 2; }\n`
    : `try { require(${JSON.stringify(packageName)}); process.exitCode = 1; } catch (error) { if (error?.name !== "WalletCoreBackendInitializationError") process.exitCode = 2; }\n`;
  writeFileSync(runner, source);
  run(process.execPath, [runner], { cwd: projectRoot });
}

function runFallback(projectRoot, targetId) {
  const installedRoot = packagePath(projectRoot);
  const manifestPath = resolve(installedRoot, "dist/native/artifact-manifest.json");
  const manifest = json(manifestPath);
  manifest.artifacts = manifest.artifacts.filter((artifact) => artifact.target_id !== targetId);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const native = runSmoke(projectRoot, "esm", false);
  const wasm = runSmoke(projectRoot, "esm", true);
  assert.deepEqual(native, wasm);
  return { target_id: targetId, manifest_entry_removed: true, wasm_fallback_success: true };
}

function runCorruptArtifact(projectRoot, targetId) {
  const installedRoot = packagePath(projectRoot);
  const manifest = json(resolve(installedRoot, "dist/native/artifact-manifest.json"));
  const entry = manifest.artifacts.find((artifact) => artifact.target_id === targetId);
  if (entry === undefined) fail(`corruption smoke target is absent: ${targetId}`);
  const artifactPath = resolve(installedRoot, entry.relative_path);
  const original = bytes(artifactPath);
  const corrupt = Buffer.from(original);
  corrupt.fill(0, 0, Math.min(16, corrupt.length));
  writeFileSync(artifactPath, corrupt);
  try {
    runInitializationFailure(projectRoot, "esm");
    runInitializationFailure(projectRoot, "cjs");
  } finally {
    writeFileSync(artifactPath, original);
  }
  return { target_id: targetId, listed_artifact_failure: "fail-closed" };
}

function pack() {
  const destination = mkdtempSync(resolve(tmpdir(), "snwc-stage9-pack-"));
  const output = runQuiet(npmCommand(), [
    "pack",
    "--json",
    "--ignore-scripts",
    "--pack-destination",
    destination,
  ], { cwd: packageRoot, env: { ...process.env, npm_config_ignore_scripts: "true", npm_config_cache: resolve(tmpdir(), "snwc-npm-cache") } });
  const result = JSON.parse(output);
  const entry = Array.isArray(result) ? result[0] : Object.values(result)[0];
  if (entry === undefined || typeof entry.filename !== "string") fail("npm pack did not return a tarball");
  const tarball = resolve(destination, basename(entry.filename));
  if (!existsSync(tarball)) fail("npm pack tarball is missing");
  return { destination, tarball, entry };
}

function packageInventory(manifest, entry) {
  const expected = new Set([
    "LICENSE",
    "README.md",
    "dist/index.d.ts",
    "dist/native/artifact-manifest.json",
    ...manifest.artifacts.map((artifact) => artifact.relative_path),
    "dist/node/index.cjs",
    "dist/node/index.mjs",
    "dist/wasm/generated.cjs",
    "dist/wasm/generated.mjs",
    "dist/wasm/asset.mjs",
    "dist/wasm/index.cjs",
    "dist/wasm/index.mjs",
    "dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm",
    "package.json",
    ...entry.files
      .map((file) => file.path.replace(/^package\//, ""))
      .filter((file) => file.startsWith("dist/wasm/snippets/")),
  ]);
  const actual = entry.files.map((file) => file.path.replace(/^package\//, ""));
  if (actual.length !== expected.size || actual.some((file) => !expected.has(file))) {
    const missing = [...expected].filter((file) => !actual.includes(file));
    const unexpected = actual.filter((file) => !expected.has(file));
    fail(
      `npm pack inventory is outside the allowlist (missing=${missing.join(",")}; unexpected=${unexpected.join(",")})`,
    );
  }
  return { allowlist_match: true, file_count: actual.length };
}

function sizeEvidence(manifest, entry, tarball) {
  const nativeSizes = manifest.artifacts.map((artifact) => statSync(resolve(packageRoot, artifact.relative_path)).size);
  const wasmFiles = files(resolve(packageRoot, "dist/wasm"));
  const wasmAndDeclaration = wasmFiles.reduce(
    (sum, file) => sum + statSync(resolve(packageRoot, "dist/wasm", file)).size,
    statSync(resolve(packageRoot, "dist/index.d.ts")).size,
  );
  const unpackedSize = entry.files.reduce((sum, file) => {
    const relative = file.path.replace(/^package\//, "");
    return sum + statSync(resolve(packageRoot, relative)).size;
  }, 0);
  const evidence = {
    native_artifact_count: nativeSizes.length,
    max_native_artifact_bytes: Math.max(...nativeSizes),
    wasm_glue_declaration_bytes: wasmAndDeclaration,
    tarball_bytes: statSync(tarball).size,
    unpacked_package_bytes: unpackedSize,
  };
  if (evidence.max_native_artifact_bytes > MAX_NATIVE_BYTES) {
    fail("NEEDS USER DECISION / native artifact exceeds 15 MiB");
  }
  if (evidence.wasm_glue_declaration_bytes > MAX_WASM_BYTES) {
    fail("NEEDS USER DECISION / WASM, glue, and declaration exceed 12 MiB");
  }
  if (evidence.tarball_bytes >= MAX_TARBALL_BYTES) {
    fail("NEEDS USER DECISION / npm tarball is not below 50 MiB");
  }
  if (evidence.unpacked_package_bytes >= MAX_UNPACKED_BYTES) {
    fail("NEEDS USER DECISION / unpacked package is not below 150 MiB");
  }
  return evidence;
}

const packResult = pack();
const meta = packageMeta();
const manifest = json(resolve(packageRoot, "dist/native/artifact-manifest.json"));
validateNativeManifest(manifest, meta);
validateAssembledManifest(manifest, meta);
validatePackageContents(packageRoot, manifest);
if (manifest.artifacts.length !== 4) fail("final package must contain exactly four native artifacts");
if (files(resolve(packageRoot, "dist")).filter((file) => file.endsWith(".wasm")).length !== 1) {
  fail("final package must contain one canonical WASM asset");
}

const inventory = packageInventory(manifest, packResult.entry);
const sizes = sizeEvidence(manifest, packResult.entry, packResult.tarball);
const projectRoot = installClean(packResult.tarball);
try {
  const esmNative = runSmoke(projectRoot, "esm", false);
  const cjsNative = runSmoke(projectRoot, "cjs", false);
  const esmWasm = runSmoke(projectRoot, "esm", true);
  const cjsWasm = runSmoke(projectRoot, "cjs", true);
  assert.deepEqual(esmNative, cjsNative);
  assert.deepEqual(esmNative, esmWasm);
  assert.deepEqual(esmNative, cjsWasm);

  const targetId = currentTarget();
  if (targetId === null) fail("current target is unsupported; fallback-only runner is required on this host");
  const fallbackProject = installClean(packResult.tarball);
  const corruptProject = installClean(packResult.tarball);
  try {
    const fallback = runFallback(fallbackProject, targetId);
    const failClosed = runCorruptArtifact(corruptProject, targetId);
    process.stdout.write(`${JSON.stringify({
      package: packageName,
      native_targets: manifest.artifacts.map((artifact) => artifact.target_id),
      single_canonical_wasm: true,
      inventory,
      sizes,
      clean_install: validateInstallMetadata(projectRoot),
      esm_native: { ...esmNative, backend: "native" },
      cjs_native: { ...cjsNative, backend: "native" },
      esm_wasm: { ...esmWasm, backend: "wasm" },
      cjs_wasm: { ...cjsWasm, backend: "wasm" },
      fallback,
      fail_closed: failClosed,
    })}\n`);
  } finally {
    rmSync(fallbackProject, { recursive: true, force: true });
    rmSync(corruptProject, { recursive: true, force: true });
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(packResult.destination, { recursive: true, force: true });
}

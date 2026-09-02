import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { targetForRuntime } from "../packages/wallet-core/src/manifest.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageName = "@nemnesia/symbol-nem-wallet-core";

function fail(message) {
  throw new Error(`Release clean consumer gate failed: ${message}`);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: repositoryRoot, stdio: "inherit", ...options });
}

function quoteWindowsCommandArgument(value) {
  if (typeof value !== "string" || /[\r\n"%!]/.test(value)) {
    fail("Windows npm argument contains unsupported shell characters");
  }
  return `"${value}"`;
}

function runNpm(args, options = {}) {
  if (process.platform !== "win32") return run("npm", args, options);
  const command = ["npm.cmd", ...args].map(quoteWindowsCommandArgument).join(" ");
  return execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command], {
    cwd: repositoryRoot,
    stdio: "inherit",
    ...options,
  });
}

function quiet(command, args, options = {}) {
  return execFileSync(command, args, { cwd: repositoryRoot, encoding: "utf8", ...options });
}

function packageRoot(projectRoot) {
  return resolve(projectRoot, "node_modules", "@nemnesia", "symbol-nem-wallet-core");
}

function install(tarball) {
  const projectRoot = mkdtempSync(resolve(tmpdir(), "snwc-release-consumer-"));
  writeFileSync(resolve(projectRoot, "package.json"), `${JSON.stringify({ name: "snwc-release-consumer", private: true, type: "module" })}\n`);
  runNpm(["install", "--ignore-scripts", "--offline", "--no-audit", "--no-fund", "--package-lock=false", tarball], {
    cwd: projectRoot,
    env: { ...process.env, npm_config_ignore_scripts: "true", npm_config_offline: "true", npm_config_audit: "false", npm_config_fund: "false", npm_config_cache: resolve(tmpdir(), "snwc-npm-cache") },
  });
  return projectRoot;
}

function smoke(moduleSyntax) {
  const importLine = moduleSyntax === "esm"
    ? `import * as api from ${JSON.stringify(packageName)};`
    : `const api = require(${JSON.stringify(packageName)});`;
  return `${importLine}
const names = Object.keys(api).sort();
const expected = ["change_profile_password", "create_empty_store", "delete_profile", "delete_software_key", "derive_software_key", "export_mnemonic", "export_private_key", "finalize_generated_profile", "generate_software_key", "get_public_account", "import_software_key", "list_profiles", "list_software_keys", "prepare_generated_profile", "restore_profile", "sign"].sort();
if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error("public surface mismatch");
const store = api.create_empty_store();
const password = new TextEncoder().encode("release clean consumer fixture password");
const prepared = api.prepare_generated_profile(store, password, 1);
const replacement = api.finalize_generated_profile(store, prepared.value.pending_profile, password, { status: "confirmed" });
let error;
try { api.list_profiles(Uint8Array.of(0)); } catch (value) { error = value; }
if (!(replacement.store instanceof Uint8Array) || replacement.store.length === 0) throw new Error("replacement Store missing");
if (error?.name !== "WalletCoreError" || error?.code !== "InvalidStore" || error?.message !== "InvalidStore") throw new Error("Core error semantics mismatch");
process.stdout.write(JSON.stringify({ public_operation_count: names.length, operation_success: true, replacement_store_success: true, core_error: { name: error.name, code: error.code, message: error.message } }) + "\\n");
`;
}

function runSmoke(projectRoot, moduleSyntax, noAddons) {
  const extension = moduleSyntax === "esm" ? "mjs" : "cjs";
  const runner = resolve(projectRoot, `runner-${moduleSyntax}-${noAddons ? "wasm" : "native"}.${extension}`);
  writeFileSync(runner, smoke(moduleSyntax));
  return JSON.parse(quiet(process.execPath, [...(noAddons ? ["--no-addons"] : []), runner], { cwd: projectRoot }));
}

function runFailure(projectRoot, moduleSyntax) {
  const extension = moduleSyntax === "esm" ? "mjs" : "cjs";
  const runner = resolve(projectRoot, `failure-${moduleSyntax}.${extension}`);
  const code = moduleSyntax === "esm"
    ? `try { await import(${JSON.stringify(packageName)}); process.exitCode = 1; } catch (error) { if (error?.name !== "WalletCoreBackendInitializationError") process.exitCode = 2; }\n`
    : `try { require(${JSON.stringify(packageName)}); process.exitCode = 1; } catch (error) { if (error?.name !== "WalletCoreBackendInitializationError") process.exitCode = 2; }\n`;
  writeFileSync(runner, code);
  run(process.execPath, [runner], { cwd: projectRoot });
}

function fallback(projectRoot, targetId) {
  const root = packageRoot(projectRoot);
  const manifestPath = resolve(root, "dist/native/artifact-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.artifacts = manifest.artifacts.filter((artifact) => artifact.target_id !== targetId);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const nativeEntry = runSmoke(projectRoot, "esm", false);
  const wasmEntry = runSmoke(projectRoot, "esm", true);
  assert.deepEqual(nativeEntry, wasmEntry);
  return { target_id: targetId, native_artifact_not_included: true, wasm_fallback_success: true };
}

function failClosed(projectRoot, targetId) {
  const root = packageRoot(projectRoot);
  const manifest = JSON.parse(readFileSync(resolve(root, "dist/native/artifact-manifest.json"), "utf8"));
  const entry = manifest.artifacts.find((artifact) => artifact.target_id === targetId);
  if (entry === undefined) fail(`listed target is missing: ${targetId}`);
  const path = resolve(root, entry.relative_path);
  if (!existsSync(path) || !statSync(path).isFile()) fail(`artifact is missing: ${targetId}`);
  const original = readFileSync(path);
  const corrupt = Buffer.from(original);
  corrupt.fill(0, 0, Math.min(16, corrupt.length));
  writeFileSync(path, corrupt);
  try {
    runFailure(projectRoot, "esm");
    runFailure(projectRoot, "cjs");
  } finally {
    writeFileSync(path, original);
  }
  return { target_id: targetId, listed_artifact_load_failure: "fail-closed" };
}

const index = process.argv.indexOf("--tarball");
const tarball = index >= 0 ? process.argv[index + 1] : undefined;
if (tarball === undefined) fail("usage: node scripts/test-npm-consumer.mjs --tarball <path>");
const tarballPath = resolve(repositoryRoot, tarball);
if (!tarballPath.endsWith(".tgz") || !existsSync(tarballPath) || !statSync(tarballPath).isFile()) {
  fail("tarball must be an existing local .tgz file");
}
const projectRoot = install(tarballPath);
try {
  const esmNative = runSmoke(projectRoot, "esm", false);
  const cjsNative = runSmoke(projectRoot, "cjs", false);
  const esmWasm = runSmoke(projectRoot, "esm", true);
  const cjsWasm = runSmoke(projectRoot, "cjs", true);
  assert.deepEqual(esmNative, cjsNative);
  assert.deepEqual(esmNative, esmWasm);
  assert.deepEqual(esmNative, cjsWasm);
  const targetId = targetForRuntime(
    process.platform,
    process.arch,
    process.platform === "linux" ? process.report?.getReport?.().header?.glibcVersionRuntime : undefined,
  );
  if (targetId === null) fail("consumer runner is not on a supported native target");
  const fallbackProject = install(tarballPath);
  const corruptProject = install(tarballPath);
  try {
    process.stdout.write(`${JSON.stringify({
      runtime: process.version,
      target_id: targetId,
      esm_native: { ...esmNative, backend: "native" },
      cjs_native: { ...cjsNative, backend: "native" },
      esm_wasm: { ...esmWasm, backend: "wasm" },
      cjs_wasm: { ...cjsWasm, backend: "wasm" },
      fallback: fallback(fallbackProject, targetId),
      fail_closed: failClosed(corruptProject, targetId),
    })}\n`);
  } finally {
    rmSync(fallbackProject, { recursive: true, force: true });
    rmSync(corruptProject, { recursive: true, force: true });
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

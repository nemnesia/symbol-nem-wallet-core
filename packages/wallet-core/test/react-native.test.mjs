import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("React Native entry uses the private synchronous TurboModule and preserves facade outputs", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-react-native-entry-"));
  try {
    const packageCopy = resolve(directory, "wallet-core");
    cpSync(packageRoot, packageCopy, { recursive: true });
    const moduleDirectory = resolve(packageCopy, "node_modules/react-native");
    mkdirSync(moduleDirectory, { recursive: true });
    writeFileSync(
      resolve(moduleDirectory, "package.json"),
      JSON.stringify({ name: "react-native", type: "module", exports: "./index.mjs" }),
    );
    writeFileSync(
      resolve(moduleDirectory, "index.mjs"),
      `export const calls = [];\nexport const TurboModuleRegistry = { getEnforcing(name) { if (name !== "NativeSymbolNemWalletCore") throw new Error("missing"); return { invoke(operation, args) { calls.push({ operation, args }); if (operation === "create_empty_store") return new Uint8Array([1, 2, 3]); if (operation === "list_profiles") return { value: [], warnings: [] }; throw new Error("unexpected"); } }; } };\n`,
    );
    const api = await import(pathToFileURL(resolve(packageCopy, "dist/react-native/index.js")).href);
    assert.equal(api.create_empty_store() instanceof Uint8Array, true);
    assert.deepEqual([...api.create_empty_store()], [1, 2, 3]);
    assert.deepEqual(api.list_profiles(new Uint8Array()).value, []);
    assert.equal(api.create_empty_store() instanceof Promise, false);
    assert.deepEqual(Object.keys(api).sort(), [
      "change_profile_password",
      "create_empty_store",
      "delete_profile",
      "delete_software_key",
      "derive_software_key",
      "export_mnemonic",
      "export_private_key",
      "finalize_generated_profile",
      "generate_software_key",
      "get_public_account",
      "import_software_key",
      "list_profiles",
      "list_software_keys",
      "prepare_generated_profile",
      "restore_profile",
      "sign",
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("React Native entry fails closed when the native provider is unavailable", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-react-native-missing-provider-"));
  try {
    const packageCopy = resolve(directory, "wallet-core");
    cpSync(packageRoot, packageCopy, { recursive: true });
    const moduleDirectory = resolve(packageCopy, "node_modules/react-native");
    mkdirSync(moduleDirectory, { recursive: true });
    writeFileSync(
      resolve(moduleDirectory, "package.json"),
      JSON.stringify({ name: "react-native", type: "module", exports: "./index.mjs" }),
    );
    writeFileSync(
      resolve(moduleDirectory, "index.mjs"),
      `export const TurboModuleRegistry = { getEnforcing() { throw new Error("provider unavailable"); } };\n`,
    );
    await assert.rejects(
      () => import(pathToFileURL(resolve(packageCopy, "dist/react-native/index.js")).href),
      (error) => error?.name === "WalletCoreBackendInitializationError" && error?.message === "backend initialization failed",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("React Native condition resolves the package root to the private entry", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-react-native-condition-"));
  try {
    const packageCopy = resolve(directory, "node_modules/@nemnesia/symbol-nem-wallet-core");
    cpSync(packageRoot, packageCopy, { recursive: true });
    const moduleDirectory = resolve(directory, "node_modules/react-native");
    mkdirSync(moduleDirectory, { recursive: true });
    writeFileSync(
      resolve(moduleDirectory, "package.json"),
      JSON.stringify({ name: "react-native", type: "module", exports: "./index.mjs" }),
    );
    writeFileSync(
      resolve(moduleDirectory, "index.mjs"),
      `export const TurboModuleRegistry = { getEnforcing() { return { invoke(operation) { if (operation === "create_empty_store") return new Uint8Array([7]); throw new Error("unexpected"); } }; } };\n`,
    );
    const runner = resolve(directory, "runner.mjs");
    writeFileSync(
      runner,
      `import * as api from "@nemnesia/symbol-nem-wallet-core"; const value = api.create_empty_store(); if (!(value instanceof Uint8Array) || value[0] !== 7) throw new Error("react-native condition was not selected");\n`,
    );
    execFileSync(process.execPath, ["--conditions=react-native", runner], {
      cwd: directory,
      stdio: "pipe",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

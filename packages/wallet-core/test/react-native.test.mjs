import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { inlineReactNativeRuntime } from "../../../scripts/react-native-runtime.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function writeReactNativeRuntime(packageCopy, manifestOverrides = {}) {
  const targetDefinitions = [
    ["android-arm64-v8a", "android", "device", "arm64-v8a", "dist/react-native/android/jni/arm64-v8a/libsymbol_nem_wallet_core_rn.so", "libsymbol_nem_wallet_core_rn.so"],
    ["android-x86_64", "android", "emulator", "x86_64", "dist/react-native/android/jni/x86_64/libsymbol_nem_wallet_core_rn.so", "libsymbol_nem_wallet_core_rn.so"],
    ["ios-arm64", "ios", "device", "arm64", "dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64/libsymbol_nem_wallet_core_rn.a", "libsymbol_nem_wallet_core_rn.a"],
    ["ios-simulator-arm64", "ios", "simulator", "arm64", "dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64-simulator/libsymbol_nem_wallet_core_rn.a", "libsymbol_nem_wallet_core_rn.a"],
  ];
  const manifest = {
    schema_version: 1,
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: "0.1.0",
    source_commit: "a".repeat(40),
    artifacts: targetDefinitions.map(([target_id, platform, environment, architecture, relative_path, artifact_filename]) => ({
      target_id,
      platform,
      environment,
      architecture,
      relative_path,
      artifact_filename,
      sha256: "a".repeat(64),
      toolchain_identifier: "test-toolchain",
    })),
    ...manifestOverrides,
  };
  writeFileSync(
    resolve(packageCopy, "dist/react-native/index.js"),
    inlineReactNativeRuntime(resolve(packageCopy, "src/react-native/index.mjs"), [
      resolve(packageCopy, "src/facade-runtime.mjs"),
      resolve(packageCopy, "src/react-native/native-module.mjs"),
    ], manifest),
  );
}

test("React Native native integration registers appmodules and gates JSI delivery on lifecycle validity", () => {
  const cmake = readFileSync(resolve(packageRoot, "android/CMakeLists.txt"), "utf8");
  const gradle = readFileSync(resolve(packageRoot, "android/build.gradle"), "utf8");
  const onLoad = readFileSync(resolve(packageRoot, "android/OnLoad.cpp"), "utf8");
  const nativeSource = readFileSync(resolve(packageRoot, "cpp/NativeSymbolNemWalletCore.cpp"), "utf8");
  const coordinator = readFileSync(resolve(packageRoot, "cpp/RnLifecycleCoordinator.cpp"), "utf8");
  const config = readFileSync(resolve(packageRoot, "react-native.config.cjs"), "utf8");
  const nativeModuleSource = readFileSync(resolve(packageRoot, "src/react-native/native-module.mjs"), "utf8");

  assert.doesNotMatch(cmake, /project\(appmodules\)/);
  assert.doesNotMatch(cmake, /REACT_ANDROID_DIR/);
  assert.match(cmake, /ANDROID_ABI/);
  assert.match(cmake, /SNWC_C_ABI_LIBRARY/);
  assert.match(cmake, /react_codegen_symbolnemwalletcore/);
  assert.match(cmake, /IMPORTED_LOCATION/);
  assert.doesNotMatch(gradle, /externalNativeBuild/);
  assert.match(config, /cxxModuleCMakeListsPath/);
  assert.match(config, /NativeSymbolNemWalletCore\.h/);
  assert.match(nativeModuleSource, /PACKAGE_REACT_NATIVE_MANIFEST/);
  assert.match(nativeModuleSource, /invalid React Native artifact manifest/);
  assert.match(readFileSync(resolve(packageRoot, "../../integration/react-native/consumer/android/app/src/main/jni/CMakeLists.txt"), "utf8"), /ReactNative-application\.cmake/);
  assert.match(onLoad, /DefaultTurboModuleManagerDelegate::cxxModuleProvider/);
  assert.match(onLoad, /symbolNemWalletCoreCxxModuleProvider/);
  assert.match(onLoad, /autolinking_cxxModuleProvider/);
  assert.match(nativeSource, /std::shared_lock<std::shared_mutex> deliveryLock/);
  assert.match(nativeSource, /coordinator_\.begin/);
  assert.match(nativeSource, /snwc_free_bytes/);
  assert.match(coordinator, /getpid/);
  assert.match(coordinator, /processTeardown/);
  assert.match(coordinator, /requestIdentity/);
  assert.ok((nativeSource.match(/return ticket\.deliver\(\[&\]\(\) \{/g) ?? []).length >= 10);
  assert.doesNotMatch(nativeSource, /valid_\s*=|processGeneration_\s*=\s*1/);
});

test("React Native entry uses the private synchronous TurboModule and preserves facade outputs", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-react-native-entry-"));
  try {
    const packageCopy = resolve(directory, "wallet-core");
    cpSync(packageRoot, packageCopy, { recursive: true });
    writeReactNativeRuntime(packageCopy);
    const moduleDirectory = resolve(packageCopy, "node_modules/react-native");
    mkdirSync(moduleDirectory, { recursive: true });
    writeFileSync(
      resolve(moduleDirectory, "package.json"),
      JSON.stringify({ name: "react-native", type: "module", exports: "./index.mjs" }),
    );
    writeFileSync(
      resolve(moduleDirectory, "index.mjs"),
      `export const calls = [];\nexport const TurboModuleRegistry = { getEnforcing(name) { if (name !== "NativeSymbolNemWalletCore") throw new Error("missing"); return { invoke(operation, args) { calls.push({ operation, args }); if (operation === "__snwc_runtime_identity") return { module_name: "NativeSymbolNemWalletCore", module_identity: "symbol-nem-wallet-core-react-native-v1", artifact_identity: "android|arm64-v8a|dist/react-native/android/jni/arm64-v8a/libsymbol_nem_wallet_core_rn.so", architecture: "new" }; if (operation === "create_empty_store") return new Uint8Array([1, 2, 3]); if (operation === "list_profiles") return { value: [], warnings: [] }; throw new Error("unexpected"); } }; } };\n`,
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
    writeReactNativeRuntime(packageCopy);
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

test("React Native entry fails closed when the package artifact manifest is incomplete", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-react-native-manifest-failure-"));
  try {
    const packageCopy = resolve(directory, "wallet-core");
    cpSync(packageRoot, packageCopy, { recursive: true });
    writeReactNativeRuntime(packageCopy, { artifacts: [] });
    const moduleDirectory = resolve(packageCopy, "node_modules/react-native");
    mkdirSync(moduleDirectory, { recursive: true });
    writeFileSync(
      resolve(moduleDirectory, "package.json"),
      JSON.stringify({ name: "react-native", type: "module", exports: "./index.mjs" }),
    );
    writeFileSync(resolve(moduleDirectory, "index.mjs"), "export const TurboModuleRegistry = {};\n");
    await assert.rejects(
      () => import(pathToFileURL(resolve(packageCopy, "dist/react-native/index.js")).href),
      (error) => error?.name === "WalletCoreBackendInitializationError" && error?.message === "backend initialization failed",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("React Native entry rejects a provider whose native artifact identity is not admitted", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-react-native-wrong-artifact-"));
  try {
    const packageCopy = resolve(directory, "wallet-core");
    cpSync(packageRoot, packageCopy, { recursive: true });
    writeReactNativeRuntime(packageCopy);
    const moduleDirectory = resolve(packageCopy, "node_modules/react-native");
    mkdirSync(moduleDirectory, { recursive: true });
    writeFileSync(resolve(moduleDirectory, "package.json"), JSON.stringify({ name: "react-native", type: "module", exports: "./index.mjs" }));
    writeFileSync(resolve(moduleDirectory, "index.mjs"), `export const TurboModuleRegistry = { getEnforcing() { return { invoke(operation) { if (operation === "__snwc_runtime_identity") return { module_name: "NativeSymbolNemWalletCore", module_identity: "symbol-nem-wallet-core-react-native-v1", artifact_identity: "android|armeabi-v7a|wrong", architecture: "new" }; throw new Error("unexpected"); } }; } };\n`);
    await assert.rejects(
      () => import(pathToFileURL(resolve(packageCopy, "dist/react-native/index.js")).href),
      (error) => error?.name === "WalletCoreBackendInitializationError",
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
    writeReactNativeRuntime(packageCopy);
    const moduleDirectory = resolve(directory, "node_modules/react-native");
    mkdirSync(moduleDirectory, { recursive: true });
    writeFileSync(
      resolve(moduleDirectory, "package.json"),
      JSON.stringify({ name: "react-native", type: "module", exports: "./index.mjs" }),
    );
    writeFileSync(
      resolve(moduleDirectory, "index.mjs"),
      `export const TurboModuleRegistry = { getEnforcing() { return { invoke(operation) { if (operation === "__snwc_runtime_identity") return { module_name: "NativeSymbolNemWalletCore", module_identity: "symbol-nem-wallet-core-react-native-v1", artifact_identity: "android|x86_64|dist/react-native/android/jni/x86_64/libsymbol_nem_wallet_core_rn.so", architecture: "new" }; if (operation === "create_empty_store") return new Uint8Array([7]); throw new Error("unexpected"); } }; } };\n`,
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

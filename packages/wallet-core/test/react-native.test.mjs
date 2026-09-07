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
  const providerHeader = readFileSync(resolve(packageRoot, "cpp/NativeSymbolNemWalletCoreProvider.h"), "utf8");
  const providerSource = readFileSync(resolve(packageRoot, "cpp/NativeSymbolNemWalletCoreProvider.cpp"), "utf8");
  const coordinator = readFileSync(resolve(packageRoot, "cpp/RnLifecycleCoordinator.cpp"), "utf8");
  const coordinatorHeader = readFileSync(resolve(packageRoot, "cpp/RnLifecycleCoordinator.h"), "utf8");
  const androidPackage = readFileSync(resolve(packageRoot, "android/SymbolNemWalletCoreCxxReactPackage.cpp"), "utf8");
  const androidPackageHeader = readFileSync(resolve(packageRoot, "android/SymbolNemWalletCoreCxxReactPackage.h"), "utf8");
  const androidLifecycle = readFileSync(
    resolve(packageRoot, "android/src/main/java/com/nemnesia/symbolnemwalletcore/SymbolNemWalletCoreRnLifecycle.kt"),
    "utf8",
  );
  const androidPackageKotlin = readFileSync(
    resolve(packageRoot, "android/src/main/java/com/nemnesia/symbolnemwalletcore/SymbolNemWalletCoreCxxReactPackage.kt"),
    "utf8",
  );
  const androidConsumerApplication = readFileSync(
    resolve(packageRoot, "../../integration/react-native/consumer/android/app/src/main/java/com/snwcrnbuild/MainApplication.kt"),
    "utf8",
  );
  const iosLifecycleDelegate = readFileSync(resolve(packageRoot, "ios/SnwcRnLifecycleDelegate.mm"), "utf8");
  const iosLifecycle = readFileSync(resolve(packageRoot, "ios/SnwcRnLifecycle.h"), "utf8");
  const iosConsumerAppDelegate = readFileSync(
    resolve(packageRoot, "../../integration/react-native/consumer/ios/SnwcRnBuild/AppDelegate.swift"),
    "utf8",
  );
  const config = readFileSync(resolve(packageRoot, "react-native.config.cjs"), "utf8");
  const metroConfig = readFileSync(
    resolve(packageRoot, "../../integration/react-native/consumer/metro.config.js"),
    "utf8",
  );
  const consumerOnLoad = readFileSync(
    resolve(packageRoot, "../../integration/react-native/consumer/android/app/src/main/jni/OnLoad.cpp"),
    "utf8",
  );
  const consumerCmake = readFileSync(
    resolve(packageRoot, "../../integration/react-native/consumer/android/app/src/main/jni/CMakeLists.txt"),
    "utf8",
  );
  const podspec = readFileSync(resolve(packageRoot, "ios/SymbolNemWalletCoreRN.podspec"), "utf8");
  const nativeModuleSource = readFileSync(resolve(packageRoot, "src/react-native/native-module.mjs"), "utf8");
  const releaseProducer = readFileSync(resolve(packageRoot, "../../scripts/build-react-native-release.mjs"), "utf8");

  assert.doesNotMatch(cmake, /project\(appmodules\)/);
  assert.doesNotMatch(cmake, /REACT_ANDROID_DIR/);
  assert.match(cmake, /ANDROID_ABI/);
  assert.match(cmake, /SNWC_C_ABI_LIBRARY/);
  assert.match(cmake, /SNWC_RN_CODEGEN_TARGET/);
  assert.match(cmake, /IMPORTED_LOCATION/);
  assert.match(gradle, /org\.jetbrains\.kotlin\.android/);
  assert.doesNotMatch(gradle, /externalNativeBuild/);
  assert.match(config, /android: null/);
  assert.doesNotMatch(config, /cxxModuleCMakeListsPath|cxxModuleHeaderName/);
  assert.match(consumerCmake, /add_subdirectory\(/);
  assert.match(consumerCmake, /node_modules\/@nemnesia\/symbol-nem-wallet-core/);
  assert.match(consumerCmake, /target_link_libraries\(\$\{CMAKE_PROJECT_NAME\} symbol_nem_wallet_core_rn\)/);
  assert.match(consumerCmake, /target_link_options\(\$\{CMAKE_PROJECT_NAME\} PRIVATE/);
  assert.match(consumerCmake, /SNWC_RN_CODEGEN_TARGETS/);
  assert.match(consumerCmake, /SNWC_RN_CODEGEN_TARGET_COUNT/);
  assert.match(consumerCmake, /NO_SONAME TRUE/);
  assert.match(consumerCmake, /--export-dynamic-symbol=snwc_rn_artifact_identity_value/);
  assert.match(consumerCmake, /-soname,libsymbol_nem_wallet_core_rn\.so/);
  assert.doesNotMatch(consumerCmake, /target_sources/);
  assert.match(consumerOnLoad, /node_modules\/@nemnesia\/symbol-nem-wallet-core\/android\/OnLoad\.cpp/);
  assert.match(consumerCmake, /CMAKE_CXX_STANDARD 20/);
  assert.match(cmake, /CXX_STANDARD 20/);
  assert.match(metroConfig, /extraNodeModules/);
  assert.match(metroConfig, /@nemnesia\/symbol-nem-wallet-core/);
  assert.match(metroConfig, /@babel\/runtime/);
  assert.match(metroConfig, /consumerNodeModules/);
  assert.match(podspec, /s\.dependency "ReactCodegen"/);
  assert.match(podspec, /SnwcNativeSymbolNemWalletCore\.cpp/);
  assert.match(podspec, /SnwcRnLifecycleCoordinator\.cpp/);
  assert.match(podspec, /PODS_TARGET_SRCROOT.*cpp\/include/);
  assert.match(podspec, /generated\/ios\/ReactCodegen/);
  assert.match(podspec, /xcframework = "\.\.\/dist\/react-native\/ios\/SymbolNemWalletCoreRN\.xcframework"/);
  assert.match(podspec, /File\.directory\?\(File\.expand_path\(xcframework, __dir__\)\)/);
  assert.match(releaseProducer, /SymbolNemWalletCoreRN\.framework\/SymbolNemWalletCoreRN/);
  assert.match(releaseProducer, /-rbundler\/setup/);
  assert.match(releaseProducer, /Gem\.bin_path\('cocoapods', 'pod', '1\.16\.2'\)/);
  assert.match(releaseProducer, /libtool", \["-static", "-D", "-o"/);
  assert.match(releaseProducer, /GCC_GENERATE_DEBUGGING_SYMBOLS=NO/);
  assert.match(releaseProducer, /CLANG_ENABLE_MODULE_DEBUGGING=NO/);
  assert.doesNotMatch(releaseProducer, /bundle", \["exec", "pod", "install"\]/);
  assert.doesNotMatch(releaseProducer, /candidates\.find\(\(path\) => path\.endsWith\("\.a"\)\)/);
  assert.match(nativeModuleSource, /PACKAGE_REACT_NATIVE_MANIFEST/);
  assert.match(nativeModuleSource, /invalid React Native artifact manifest/);
  assert.match(consumerCmake, /ReactNative-application\.cmake/);
  assert.match(onLoad, /DefaultTurboModuleManagerDelegate::cxxModuleProvider/);
  assert.match(onLoad, /REACT_NATIVE_APP_CODEGEN_HEADER/);
  assert.doesNotMatch(onLoad, /symbolNemWalletCoreCxxModuleProvider/);
  assert.match(providerHeader, /std::shared_ptr<TurboModule> symbolNemWalletCoreCxxModuleProvider/);
  assert.match(providerHeader, /extern "C" const char \*symbolNemWalletCoreCxxModuleProvider\(\)/);
  assert.match(providerSource, /return nullptr/);
  assert.match(providerSource, /extern "C" SNWC_RN_EXPORT const char \*symbolNemWalletCoreCxxModuleProvider\(\)/);
  assert.match(providerSource, /extern "C" \{\s+extern const char snwc_rn_artifact_identity_value\[\];\s+\}/);
  assert.match(onLoad, /autolinking_cxxModuleProvider/);
  assert.match(nativeSource, /std::shared_lock<std::shared_mutex> deliveryLock/);
  assert.match(nativeSource, /coordinator_\.begin/);
  assert.match(nativeSource, /snwc_free_bytes/);
  assert.match(coordinator, /getpid/);
  assert.match(coordinator, /processGeneration/);
  assert.match(coordinatorHeader, /moduleRegistry/);
  assert.match(coordinatorHeader, /logicalContext/);
  assert.match(coordinatorHeader, /providerGeneration/);
  assert.match(coordinator, /invalidateProvider/);
  assert.match(coordinator, /invalidateContext/);
  assert.doesNotMatch(coordinator, /registryLifetime|contextLifetime|registration\.state->runtime\s*=/);
  assert.match(coordinator, /processTeardown/);
  assert.match(coordinator, /requestIdentity/);
  assert.doesNotMatch(nativeSource, /jsInvoker\.get\(\)|registerModule\(jsInvoker|NativeSymbolNemWalletCoreContext/);
  assert.match(androidPackage, /CxxReactPackage/);
  assert.match(androidPackageHeader, /HybridClass<SymbolNemWalletCoreCxxReactPackage, CxxReactPackage>/);
  assert.match(androidPackage, /identity\.moduleRegistry = this/);
  assert.match(androidPackage, /identity\.logicalContext = reactContext_\.get/);
  assert.match(androidPackageHeader, /JReactContext/);
  assert.match(androidPackageHeader, /com\/facebook\/react\/bridge\/ReactContext/);
  assert.match(androidPackage, /makeNativeMethod\(\s*"nativeInvalidate"/);
  assert.match(androidPackageKotlin, /invalidateFromReactHost/);
  assert.match(androidPackageKotlin, /private external fun nativeInvalidate\(\)/);
  assert.match(androidPackageHeader, /CxxReactPackage/);
  assert.match(androidLifecycle, /addBeforeDestroyListener/);
  assert.match(androidLifecycle, /addReactInstanceEventListener/);
  assert.match(androidLifecycle, /object : ReactInstanceEventListener/);
  assert.match(androidLifecycle, /onReactContextInitialized/);
  assert.match(androidLifecycle, /invalidateFromReactHost/);
  assert.match(androidConsumerApplication, /cxxReactPackageProviders/);
  assert.match(androidConsumerApplication, /SymbolNemWalletCoreRnLifecycle\.attach/);
  assert.match(iosLifecycle, /moduleRegistry/);
  assert.match(iosLifecycleDelegate, /didInitializeRuntime/);
  assert.match(iosLifecycleDelegate, /host\.moduleRegistry/);
  assert.match(iosConsumerAppDelegate, /SnwcRnLifecycleDelegate/);
  assert.match(podspec, /SnwcRnLifecycleDelegate/);
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
      `export const calls = [];\nexport const TurboModuleRegistry = { getEnforcing(name) { if (name !== "NativeSymbolNemWalletCore") throw new Error("missing"); return { invoke(operation, args) { calls.push({ operation, args }); if (operation === "__snwc_runtime_identity") return { module_name: "NativeSymbolNemWalletCore", module_identity: "symbol-nem-wallet-core-react-native-v1", artifact_identity: "android|arm64-v8a|dist/react-native/android/jni/arm64-v8a/libsymbol_nem_wallet_core_rn.so", architecture: "new", target_id: "android-arm64-v8a" }; if (operation === "create_empty_store") return new Uint8Array([1, 2, 3]); if (operation === "list_profiles") return { value: [], warnings: [] }; throw new Error("unexpected"); } }; } };\n`,
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
    writeFileSync(resolve(moduleDirectory, "index.mjs"), `export const TurboModuleRegistry = { getEnforcing() { return { invoke(operation) { if (operation === "__snwc_runtime_identity") return { module_name: "NativeSymbolNemWalletCore", module_identity: "symbol-nem-wallet-core-react-native-v1", artifact_identity: "android|x86_64|dist/react-native/android/jni/x86_64/libsymbol_nem_wallet_core_rn.so", architecture: "new", target_id: "android-arm64-v8a" }; throw new Error("unexpected"); } }; } };\n`);
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
      `export const TurboModuleRegistry = { getEnforcing() { return { invoke(operation) { if (operation === "__snwc_runtime_identity") return { module_name: "NativeSymbolNemWalletCore", module_identity: "symbol-nem-wallet-core-react-native-v1", artifact_identity: "android|x86_64|dist/react-native/android/jni/x86_64/libsymbol_nem_wallet_core_rn.so", architecture: "new", target_id: "android-x86_64" }; if (operation === "create_empty_store") return new Uint8Array([7]); throw new Error("unexpected"); } }; } };\n`,
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

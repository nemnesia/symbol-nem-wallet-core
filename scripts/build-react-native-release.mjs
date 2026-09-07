import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_REACT_NATIVE_TARGET_ORDER,
  REACT_NATIVE_TARGETS,
  inspectReactNativeArtifact,
  validateReactNativeXcframework,
} from "../packages/wallet-core/src/react-native-manifest.mjs";
import { reactNativeBuildInputSha256 } from "./react-native-evidence.mjs";
import { inlineReactNativeRuntime } from "./react-native-runtime.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const consumerTemplate = resolve(repositoryRoot, "integration/react-native/consumer");
const consumerManifestPath = resolve(consumerTemplate, "manifest.json");
const consumerGemfilePath = resolve(consumerTemplate, "Gemfile");
const consumerGemfileLockPath = resolve(consumerTemplate, "Gemfile.lock");
const packageRoot = resolve(repositoryRoot, "packages/wallet-core");

function fail(message) {
  throw new Error(`React Native release producer failed: ${message}`);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`${label} is unreadable`);
  }
}

function sourceCommit() {
  const value = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/.test(value)) fail("checked out source commit is invalid");
  return value;
}

function sourceDateEpoch() {
  const value = execFileSync("git", ["show", "-s", "--format=%ct", sourceCommit()], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  if (!/^\d+$/.test(value)) fail("source commit timestamp is invalid");
  return value;
}

function packageVersion() {
  const metadata = readJson(resolve(packageRoot, "package.json"), "package metadata");
  if (!/^\d+\.\d+\.\d+/.test(metadata.version)) fail("package version is invalid");
  return metadata.version;
}

function verifyTemplate() {
  const manifest = readJson(consumerManifestPath, "consumer manifest");
  const packageJson = readJson(resolve(consumerTemplate, "package.json"), "consumer package metadata");
  const packageLock = readJson(resolve(consumerTemplate, "package-lock.json"), "consumer dependency lockfile");
  if (
    manifest.react_native_version !== "0.87.0" ||
    manifest.new_architecture !== true ||
    JSON.stringify(manifest.android?.abis) !== JSON.stringify(["arm64-v8a", "x86_64"]) ||
    JSON.stringify(manifest.ios?.slices) !== JSON.stringify(["ios-arm64", "ios-arm64-simulator"]) ||
    packageJson.dependencies?.["react-native"] !== "0.87.0" ||
    packageJson.dependencies?.react !== "19.2.3" ||
    packageJson.devDependencies?.["@react-native-community/cli"] !== "20.2.0" ||
    packageJson.dependencies?.["@nemnesia/symbol-nem-wallet-core"] !== "file:../../../packages/wallet-core" ||
    packageLock.lockfileVersion !== 3 ||
    packageLock.packages?.[""]?.dependencies?.["react-native"] !== "0.87.0" ||
    packageLock.packages?.[""]?.devDependencies?.["@react-native-community/cli"] !== "20.2.0" ||
    packageLock.packages?.["node_modules/react-native"]?.version !== "0.87.0"
  ) fail("consumer template is not the approved RN 0.87.0 New Architecture baseline");
  const gemfile = readFileSync(consumerGemfilePath, "utf8");
  const gemfileLock = readFileSync(consumerGemfileLockPath, "utf8");
  if (
    !/^ruby\s+"3\.3\.8"\s*$/m.test(gemfile) ||
    !/^gem\s+"cocoapods",\s*"1\.16\.2"\s*$/m.test(gemfile) ||
    !/^gem\s+"xcodeproj",\s*"1\.27\.0"\s*$/m.test(gemfile) ||
    !/^  arm64-darwin-24$/m.test(gemfileLock) ||
    !/^  x86_64-darwin-24$/m.test(gemfileLock) ||
    !/^   ruby 3\.3\.8/m.test(gemfileLock) ||
    !/^   2\.5\.22$/m.test(gemfileLock) ||
    !/^    cocoapods \(1\.16\.2\)$/m.test(gemfileLock) ||
    !/^    xcodeproj \(1\.27\.0\)$/m.test(gemfileLock) ||
    !/^    CFPropertyList \(3\.0\.8\)$/m.test(gemfileLock)
  ) fail("iOS Ruby/CocoaPods dependency input is not the approved exact lockfile");
  for (const relativePath of [
    "package.json",
    "manifest.json",
    "README.md",
    "App.tsx",
    "metro.config.js",
    "android/app/src/main/jni/CMakeLists.txt",
    "android/app/src/main/jni/OnLoad.cpp",
    "ios/Podfile",
    "package-lock.json",
    "android/gradlew",
    "android/settings.gradle",
    "ios/SnwcRnBuild.xcodeproj/project.pbxproj",
    "Gemfile",
    "Gemfile.lock",
    "index.js",
  ]) {
    const path = resolve(consumerTemplate, relativePath);
    if (!existsSync(path) || !statSync(path).isFile()) fail(`consumer template file is missing: ${relativePath}`);
  }
  return manifest;
}

function buildInputDigest(targetId, toolchainIdentifier) {
  if (!REACT_NATIVE_TARGETS[targetId]) fail(`unknown target: ${targetId}`);
  return reactNativeBuildInputSha256({
    sourceCommit: sourceCommit(),
    packageVersion: packageVersion(),
    targetId,
    toolchainIdentifier,
  });
}

function requireTarget(targetId) {
  if (!CANONICAL_REACT_NATIVE_TARGET_ORDER.includes(targetId)) fail(`target is not approved: ${targetId}`);
  return REACT_NATIVE_TARGETS[targetId];
}

function createConsumerRoot(targetId) {
  verifyTemplate();
  const workspace = mkdtempSync(resolve(tmpdir(), `snwc-rn-consumer-${targetId}-`));
  const root = resolve(workspace, "integration/react-native/consumer");
  mkdirSync(root, { recursive: true });
  cpSync(consumerTemplate, root, { recursive: true });
  mkdirSync(resolve(workspace, "packages"), { recursive: true });
  cpSync(packageRoot, resolve(workspace, "packages/wallet-core"), { recursive: true });
  materializeConsumerRuntime(resolve(workspace, "packages/wallet-core"));
  return { root, workspace };
}

function materializeConsumerRuntime(consumerPackageRoot) {
  const manifest = {
    schema_version: 1,
    package_name: "@nemnesia/symbol-nem-wallet-core",
    package_version: packageVersion(),
    source_commit: sourceCommit(),
    artifacts: CANONICAL_REACT_NATIVE_TARGET_ORDER.map((targetId) => {
      const target = REACT_NATIVE_TARGETS[targetId];
      return {
        target_id: targetId,
        platform: target.platform,
        environment: target.environment,
        architecture: target.architecture,
        relative_path: target.relativePath,
        artifact_filename: target.artifactFilename,
        sha256: "0".repeat(64),
        toolchain_identifier: "consumer-runtime-input",
      };
    }),
  };
  const distRoot = resolve(consumerPackageRoot, "dist/react-native");
  mkdirSync(distRoot, { recursive: true });
  writeFileSync(resolve(distRoot, "artifact-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    resolve(distRoot, "index.js"),
    inlineReactNativeRuntime(resolve(consumerPackageRoot, "src/react-native/index.mjs"), [
      resolve(consumerPackageRoot, "src/facade-runtime.mjs"),
      resolve(consumerPackageRoot, "src/react-native/native-module.mjs"),
    ], manifest),
  );
}

function installReactNativeConsumer(root, env = {}) {
  execFileSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
}

function installIosTooling(root) {
  if (!existsSync(resolve(root, "Gemfile")) || !existsSync(resolve(root, "Gemfile.lock"))) {
    fail("generated iOS consumer has no source-controlled Gemfile.lock");
  }
  const bundleEnv = {
    ...process.env,
    BUNDLE_DEPLOYMENT: "true",
    BUNDLE_FROZEN: "true",
    BUNDLE_PATH: resolve(root, ".bundle-cache"),
  };
  execFileSync("bundle", [
    "install",
    "--deployment",
    "--frozen",
    "--jobs", "4",
    "--retry", "3",
  ], { cwd: root, env: bundleEnv, stdio: "inherit" });
  execFileSync("bundle", ["check"], { cwd: root, env: bundleEnv, stdio: "inherit" });
}

function runBundledCocoaPods(root, args, env = {}) {
  const bundleEnv = {
    ...process.env,
    ...env,
    BUNDLE_DEPLOYMENT: "true",
    BUNDLE_FROZEN: "true",
    BUNDLE_GEMFILE: resolve(root, "Gemfile"),
    BUNDLE_PATH: resolve(root, ".bundle-cache"),
  };
  // The pod executable installed by Bundler can retain the system Ruby path
  // in its shebang on macOS. Load the locked bin path from the selected Ruby
  // interpreter instead, so a second system Ruby cannot enter the producer.
  execFileSync("ruby", [
    "-rbundler/setup",
    "-e",
    "load Gem.bin_path('cocoapods', 'pod', '1.16.2')",
    "--",
    ...args,
  ], { cwd: resolve(root, "ios"), env: bundleEnv, stdio: "inherit" });
}

function configureAndroidConsumer(root, targetId, cAbiPath) {
  const target = requireTarget(targetId);
  const gradlePath = resolve(root, "android/app/build.gradle");
  const gradlePropertiesPath = resolve(root, "android/gradle.properties");
  if (!existsSync(gradlePath)) fail("generated Android consumer has no app/build.gradle");
  if (!existsSync(gradlePropertiesPath)) fail("generated Android consumer has no gradle.properties");
  writeFileSync(gradlePath, `${readFileSync(gradlePath, "utf8")}\nandroid {\n  defaultConfig {\n    ndk { abiFilters '${target.architecture}' }\n    externalNativeBuild { cmake { arguments '-DSNWC_C_ABI_LIBRARY=${resolve(cAbiPath)}' } }\n  }\n  externalNativeBuild { cmake { path file('src/main/jni/CMakeLists.txt') } }\n}\n`);
  const properties = readFileSync(gradlePropertiesPath, "utf8").replace(
    /^reactNativeArchitectures=.*$/m,
    `reactNativeArchitectures=${target.architecture}`,
  );
  writeFileSync(gradlePropertiesPath, properties);
}

function applyConsumerOverlays(root) {
  for (const relativePath of [
    "package.json",
    "package-lock.json",
    "manifest.json",
    "README.md",
    "App.tsx",
    "android/app/src/main/jni/CMakeLists.txt",
    "ios/Podfile",
  ]) {
    const source = resolve(consumerTemplate, relativePath);
    const destination = resolve(root, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true });
  }
}

function generateReactNativeConsumer(root) {
  // The complete RN 0.87.0 scaffold is source-controlled. Only the package
  // integration overlays are refreshed into the disposable copy; no CLI
  // generation can overwrite a checked-in consumer input.
  applyConsumerOverlays(root);
  for (const relativePath of [
    "android/gradlew",
    "android/app/build.gradle",
    "ios/Podfile",
    "ios/SnwcRnBuild.xcodeproj/project.pbxproj",
  ]) {
    if (!existsSync(resolve(root, relativePath))) fail(`consumer scaffold file is missing: ${relativePath}`);
  }
}

function buildAndroid(targetId, cAbiPath, outputPath, consumerApkOutput) {
  const target = requireTarget(targetId);
  if (target.platform !== "android") fail("Android producer received a non-Android target");
  if (!existsSync(cAbiPath)) fail("Android C ABI artifact is missing");
  const consumer = createConsumerRoot(targetId);
  const { root, workspace } = consumer;
  try {
    generateReactNativeConsumer(root);
    configureAndroidConsumer(root, targetId, cAbiPath);
    installReactNativeConsumer(root);
    const gradle = resolve(root, "android/gradlew");
    if (!existsSync(gradle)) fail("generated Android consumer has no Gradle wrapper");
    execFileSync(gradle, [
      "--no-daemon",
      ":app:assembleRelease",
      "-PnewArchEnabled=true",
      `-PSNWC_C_ABI_LIBRARY=${resolve(cAbiPath)}`,
    ], { cwd: resolve(root, "android"), stdio: "inherit" });
    const candidates = [];
    function walk(directory) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name === "libappmodules.so") candidates.push(path);
      }
    }
    walk(resolve(root, "android/app/build"));
    const artifact = candidates.find((path) => path.includes(`/lib/${target.architecture}/`)) ?? candidates[0];
    if (!artifact) fail("Android appmodules artifact was not produced");
    if (consumerApkOutput) {
      const apk = resolve(root, "android/app/build/outputs/apk/release/app-release.apk");
      if (!existsSync(apk)) fail("Android release consumer APK was not produced");
      mkdirSync(dirname(consumerApkOutput), { recursive: true });
      cpSync(apk, consumerApkOutput);
    }
    mkdirSync(dirname(outputPath), { recursive: true });
    cpSync(artifact, outputPath);
    inspectReactNativeArtifact(outputPath, targetId);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function buildIos(targetId, cAbiPath, outputPath) {
  const target = requireTarget(targetId);
  if (target.platform !== "ios") fail("iOS producer received a non-iOS target");
  if (!existsSync(cAbiPath)) fail("iOS C ABI artifact is missing");
  const consumer = createConsumerRoot(targetId);
  const { root, workspace } = consumer;
  try {
    generateReactNativeConsumer(root);
    rmSync(resolve(workspace, "packages/wallet-core/dist/react-native/ios/SymbolNemWalletCoreRN.xcframework"), {
      recursive: true,
      force: true,
    });
    cpSync(cAbiPath, resolve(workspace, "packages/wallet-core/ios/libsymbol_nem_wallet_core_native.a"));
    installReactNativeConsumer(root, { SNWC_RN_POD_PATH: resolve(workspace, "packages/wallet-core/ios") });
    installIosTooling(root);
    const podfile = resolve(root, "ios/Podfile");
    if (!existsSync(podfile)) fail("generated iOS consumer has no Podfile");
    // This first pod install consumes the source pod only, so Codegen can
    // build the producer. The XCFramework-consuming pod install happens only
    // after both archives have been assembled by the release job.
    runBundledCocoaPods(root, ["install"], {
      SNWC_RN_POD_PATH: resolve(workspace, "packages/wallet-core/ios"),
    });
    const reproducibleBuildEnv = {
      ...process.env,
      SOURCE_DATE_EPOCH: sourceDateEpoch(),
      ZERO_AR_DATE: "1",
      COMPILER_INDEX_STORE_ENABLE: "NO",
    };
    const sdk = target.environment === "simulator" ? "iphonesimulator" : "iphoneos";
    execFileSync("xcodebuild", [
      "-workspace", resolve(root, "ios/SnwcRnBuild.xcworkspace"),
      "-scheme", "SnwcRnBuild",
      "-derivedDataPath", resolve(root, "build"),
      "-sdk", sdk,
      "-configuration", "Release",
      "ARCHS=arm64",
      "ONLY_ACTIVE_ARCH=NO",
      "CODE_SIGNING_ALLOWED=NO",
      // The source Pod is the shipped native artifact. Xcode's default
      // release settings still emit package-object debug metadata containing
      // the randomized clean-checkout path; disable that input at compile
      // time instead of normalizing it after the artifact is produced.
      "GCC_GENERATE_DEBUGGING_SYMBOLS=NO",
      "CLANG_ENABLE_MODULE_DEBUGGING=NO",
    ], { cwd: root, env: reproducibleBuildEnv, stdio: "inherit" });
    const candidates = [];
    function walk(directory) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (
          (entry.name === "libSymbolNemWalletCoreRN.a" && path.includes("/SymbolNemWalletCoreRN/")) ||
          (entry.name === "SymbolNemWalletCoreRN" && path.endsWith("/SymbolNemWalletCoreRN.framework/SymbolNemWalletCoreRN"))
        ) candidates.push(path);
      }
    }
    walk(resolve(root, "build"));
    candidates.sort();
    const artifact = candidates[0];
    if (!artifact) fail("iOS RN archive was not produced");
    // The final static archive is deliberately combined with the approved C
    // ABI. The package podspec then consumes this XCFramework as one unit.
    mkdirSync(dirname(outputPath), { recursive: true });
    // Apple libtool otherwise stamps each archive member with the invocation
    // time. The independent producer runs would therefore differ despite
    // identical inputs. Keep the complete-byte comparison strict and make the
    // static archive metadata deterministic at its source.
    execFileSync("libtool", ["-static", "-D", "-o", outputPath, artifact, resolve(cAbiPath)], {
      env: reproducibleBuildEnv,
      stdio: "inherit",
    });
    inspectReactNativeArtifact(outputPath, targetId);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function createXcframework(deviceArchive, simulatorArchive, outputPath) {
  if (!existsSync(deviceArchive) || !existsSync(simulatorArchive)) fail("both iOS archives are required");
  rmSync(outputPath, { recursive: true, force: true });
  mkdirSync(dirname(outputPath), { recursive: true });
  execFileSync("xcodebuild", [
    "-create-xcframework",
    "-library", resolve(deviceArchive),
    "-library", resolve(simulatorArchive),
    "-output", resolve(outputPath),
  ], { stdio: "inherit" });
  validateReactNativeXcframework(outputPath);
}

function consumeIosXcframework(xcframeworkPath, simulatorAppOutput) {
  validateReactNativeXcframework(xcframeworkPath);
  const packageClone = mkdtempSync(resolve(tmpdir(), "snwc-rn-ios-package-"));
  const consumer = createConsumerRoot("ios-consumer");
  const { root: consumerRoot, workspace } = consumer;
  try {
    cpSync(resolve(packageRoot, "ios"), resolve(packageClone, "ios"), { recursive: true });
    // The pod's lifecycle delegate includes the coordinator through the
    // package's real ios/../cpp layout. Preserve that layout in the
    // artifact-consuming clone instead of creating a validation-only path.
    cpSync(resolve(packageRoot, "cpp"), resolve(packageClone, "cpp"), { recursive: true });
    mkdirSync(resolve(packageClone, "dist/react-native/ios"), { recursive: true });
    cpSync(xcframeworkPath, resolve(packageClone, "dist/react-native/ios/SymbolNemWalletCoreRN.xcframework"), { recursive: true });
    generateReactNativeConsumer(consumerRoot);
    installReactNativeConsumer(consumerRoot, { SNWC_RN_POD_PATH: resolve(packageClone, "ios") });
    installIosTooling(consumerRoot);
    // This is the artifact-consuming install. It runs only after the
    // producer has generated and structurally inspected both slices.
    runBundledCocoaPods(consumerRoot, ["install"], {
      SNWC_RN_POD_PATH: resolve(packageClone, "ios"),
    });
    execFileSync("xcodebuild", [
      "-workspace", resolve(consumerRoot, "ios/SnwcRnBuild.xcworkspace"),
      "-scheme", "SnwcRnBuild",
      "-sdk", "iphonesimulator",
      "-configuration", "Release",
      "-derivedDataPath", resolve(consumerRoot, "ios-consumer-build"),
      "ARCHS=arm64",
      "ONLY_ACTIVE_ARCH=NO",
      "CODE_SIGNING_ALLOWED=NO",
      "build",
    ], { cwd: consumerRoot, stdio: "inherit" });
    if (simulatorAppOutput) {
      const app = resolve(consumerRoot, "ios-consumer-build/Build/Products/Release-iphonesimulator/SnwcRnBuild.app");
      if (!existsSync(app)) fail("iOS simulator consumer app was not produced");
      mkdirSync(dirname(simulatorAppOutput), { recursive: true });
      cpSync(app, simulatorAppOutput, { recursive: true });
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(packageClone, { recursive: true, force: true });
  }
}

function run() {
  const [command, ...argv] = process.argv.slice(2);
  if (command === "verify") {
    verifyTemplate();
    process.stdout.write("React Native consumer template is valid\n");
    return;
  }
  if (command === "build-input") {
    verifyTemplate();
    const targetId = argv[argv.indexOf("--target-id") + 1];
    const toolchainIdentifier = argv[argv.indexOf("--toolchain-identifier") + 1];
    if (!targetId || !toolchainIdentifier) fail("build-input requires --target-id and --toolchain-identifier");
    process.stdout.write(`${buildInputDigest(targetId, toolchainIdentifier)}\n`);
    return;
  }
  if (command === "android") {
    const targetId = argv[argv.indexOf("--target-id") + 1];
    const consumerApk = argv.includes("--consumer-apk-output")
      ? resolve(argv[argv.indexOf("--consumer-apk-output") + 1])
      : undefined;
    buildAndroid(targetId, resolve(argv[argv.indexOf("--c-abi") + 1]), resolve(argv[argv.indexOf("--output") + 1]), consumerApk);
    return;
  }
  if (command === "ios") {
    const targetId = argv[argv.indexOf("--target-id") + 1];
    buildIos(targetId, resolve(argv[argv.indexOf("--c-abi") + 1]), resolve(argv[argv.indexOf("--output") + 1]));
    return;
  }
  if (command === "xcframework") {
    createXcframework(
      resolve(argv[argv.indexOf("--device") + 1]),
      resolve(argv[argv.indexOf("--simulator") + 1]),
      resolve(argv[argv.indexOf("--output") + 1]),
    );
    return;
  }
  if (command === "ios-consumer") {
    const xcframework = argv[argv.indexOf("--xcframework") + 1];
    if (!xcframework) fail("ios-consumer requires --xcframework");
    const simulatorApp = argv.includes("--simulator-app-output")
      ? resolve(argv[argv.indexOf("--simulator-app-output") + 1])
      : undefined;
    consumeIosXcframework(resolve(xcframework), simulatorApp);
    return;
  }
  fail("usage: verify | build-input | android | ios | xcframework | ios-consumer");
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : "React Native release producer failed");
  process.exitCode = 1;
}

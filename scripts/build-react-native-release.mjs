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

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const consumerTemplate = resolve(repositoryRoot, "integration/react-native/consumer");
const consumerManifestPath = resolve(consumerTemplate, "manifest.json");
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

function packageVersion() {
  const metadata = readJson(resolve(packageRoot, "package.json"), "package metadata");
  if (!/^\d+\.\d+\.\d+/.test(metadata.version)) fail("package version is invalid");
  return metadata.version;
}

function verifyTemplate() {
  const manifest = readJson(consumerManifestPath, "consumer manifest");
  const packageJson = readJson(resolve(consumerTemplate, "package.json"), "consumer package metadata");
  if (
    manifest.react_native_version !== "0.87.0" ||
    manifest.new_architecture !== true ||
    JSON.stringify(manifest.android?.abis) !== JSON.stringify(["arm64-v8a", "x86_64"]) ||
    JSON.stringify(manifest.ios?.slices) !== JSON.stringify(["ios-arm64", "ios-arm64-simulator"]) ||
    packageJson.dependencies?.["react-native"] !== "0.87.0" ||
    packageJson.dependencies?.react !== "19.1.0" ||
    packageJson.dependencies?.["@nemnesia/symbol-nem-wallet-core"] !== "file:../../../packages/wallet-core"
  ) fail("consumer template is not the approved RN 0.87.0 New Architecture baseline");
  for (const relativePath of [
    "package.json",
    "manifest.json",
    "README.md",
    "android/app/src/main/jni/CMakeLists.txt",
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
  const root = mkdtempSync(resolve(tmpdir(), `snwc-rn-consumer-${targetId}-`));
  cpSync(consumerTemplate, root, { recursive: true });
  return root;
}

function installReactNativeConsumer(root) {
  execFileSync("npm", ["install", "--ignore-scripts"], { cwd: root, stdio: "inherit" });
}

function configureAndroidConsumer(root, targetId, cAbiPath) {
  const target = requireTarget(targetId);
  const gradlePath = resolve(root, "android/app/build.gradle");
  if (!existsSync(gradlePath)) fail("generated Android consumer has no app/build.gradle");
  writeFileSync(gradlePath, `${readFileSync(gradlePath, "utf8")}\nandroid {\n  defaultConfig {\n    ndk { abiFilters '${target.architecture}' }\n    externalNativeBuild { cmake { arguments '-DSNWC_C_ABI_LIBRARY=${resolve(cAbiPath)}' } }\n  }\n}\n`);
}

function generateReactNativeConsumer(root) {
  // The CLI is selected by the source-controlled RN version. The generated
  // project is disposable and never comes from a repository variable.
  execFileSync(
    "npx",
    ["--yes", "react-native@0.87.0", "init", "SnwcRnBuild", "--version", "0.87.0", "--skip-install"],
    { cwd: root, stdio: "inherit" },
  );
  const generated = resolve(root, "SnwcRnBuild");
  for (const entry of readdirSync(generated)) cpSync(resolve(generated, entry), resolve(root, entry), { recursive: true });
  rmSync(generated, { recursive: true, force: true });
  cpSync(resolve(consumerTemplate, "android/app/src/main/jni/CMakeLists.txt"), resolve(root, "android/app/src/main/jni/CMakeLists.txt"));
  const packageJson = readJson(resolve(root, "package.json"), "generated consumer package metadata");
  packageJson.dependencies ??= {};
  packageJson.dependencies["@nemnesia/symbol-nem-wallet-core"] = `file:${packageRoot}`;
  packageJson.dependencies["react-native"] = "0.87.0";
  writeFileSync(resolve(root, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
}

function buildAndroid(targetId, cAbiPath, outputPath) {
  const target = requireTarget(targetId);
  if (target.platform !== "android") fail("Android producer received a non-Android target");
  if (!existsSync(cAbiPath)) fail("Android C ABI artifact is missing");
  const root = createConsumerRoot(targetId);
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
    mkdirSync(dirname(outputPath), { recursive: true });
    cpSync(artifact, outputPath);
    inspectReactNativeArtifact(outputPath, targetId);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function buildIos(targetId, cAbiPath, outputPath) {
  const target = requireTarget(targetId);
  if (target.platform !== "ios") fail("iOS producer received a non-iOS target");
  if (!existsSync(cAbiPath)) fail("iOS C ABI artifact is missing");
  const root = createConsumerRoot(targetId);
  try {
    generateReactNativeConsumer(root);
    installReactNativeConsumer(root);
    const podfile = resolve(root, "ios/Podfile");
    if (!existsSync(podfile)) fail("generated iOS consumer has no Podfile");
    writeFileSync(podfile, `${readFileSync(podfile, "utf8")}\npod 'SymbolNemWalletCoreRN', :path => '${resolve(packageRoot, "ios")}'\n`);
    // This first pod install consumes the source pod only, so Codegen can
    // build the producer. The XCFramework-consuming pod install happens only
    // after both archives have been assembled by the release job.
    execFileSync("bundle", ["exec", "pod", "install"], { cwd: resolve(root, "ios"), stdio: "inherit" });
    const sdk = target.environment === "simulator" ? "iphonesimulator" : "iphoneos";
    execFileSync("xcodebuild", [
      "-workspace", resolve(root, "ios/SnwcRnBuild.xcworkspace"),
      "-scheme", "SnwcRnBuild",
      "-derivedDataPath", resolve(root, "build"),
      "-sdk", sdk,
      "-configuration", "Release",
      "ARCHS=arm64",
      "ONLY_ACTIVE_ARCH=NO",
      "BUILD_LIBRARY_FOR_DISTRIBUTION=YES",
      "CODE_SIGNING_ALLOWED=NO",
    ], { cwd: root, stdio: "inherit" });
    const candidates = [];
    function walk(directory) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (
          entry.name === "libsymbol_nem_wallet_core_rn.a" ||
          entry.name.toLowerCase() === "libsymbolnemwalletcorern.a" ||
          (entry.name === "SymbolNemWalletCoreRN" && path.includes(".framework/"))
        ) candidates.push(path);
      }
    }
    walk(resolve(root, "build"));
    const artifact = candidates[0];
    if (!artifact) fail("iOS RN archive was not produced");
    // The final static archive is deliberately combined with the approved C
    // ABI. The package podspec then consumes this XCFramework as one unit.
    mkdirSync(dirname(outputPath), { recursive: true });
    execFileSync("libtool", ["-static", "-o", outputPath, artifact, resolve(cAbiPath)], { stdio: "inherit" });
    inspectReactNativeArtifact(outputPath, targetId);
  } finally {
    rmSync(root, { recursive: true, force: true });
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

function consumeIosXcframework(xcframeworkPath) {
  validateReactNativeXcframework(xcframeworkPath);
  const packageClone = mkdtempSync(resolve(tmpdir(), "snwc-rn-ios-package-"));
  const consumerRoot = createConsumerRoot("ios-consumer");
  try {
    cpSync(resolve(packageRoot, "ios"), resolve(packageClone, "ios"), { recursive: true });
    mkdirSync(resolve(packageClone, "dist/react-native/ios"), { recursive: true });
    cpSync(xcframeworkPath, resolve(packageClone, "dist/react-native/ios/SymbolNemWalletCoreRN.xcframework"), { recursive: true });
    generateReactNativeConsumer(consumerRoot);
    installReactNativeConsumer(consumerRoot);
    const podfile = resolve(consumerRoot, "ios/Podfile");
    writeFileSync(podfile, `${readFileSync(podfile, "utf8")}\npod 'SymbolNemWalletCoreRN', :path => '${resolve(packageClone, "ios")}'\n`);
    // This is the artifact-consuming install. It runs only after the
    // producer has generated and structurally inspected both slices.
    execFileSync("bundle", ["exec", "pod", "install"], { cwd: resolve(consumerRoot, "ios"), stdio: "inherit" });
  } finally {
    rmSync(consumerRoot, { recursive: true, force: true });
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
    buildAndroid(targetId, resolve(argv[argv.indexOf("--c-abi") + 1]), resolve(argv[argv.indexOf("--output") + 1]));
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
    consumeIosXcframework(resolve(xcframework));
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

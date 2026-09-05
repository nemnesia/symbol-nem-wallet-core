import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, cpSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assembleNativeManifest,
  validateNativeArtifactInputs,
} from "./native-manifest.mjs";
import {
  assembleReactNativeManifest,
  validateReactNativeArtifactInputs,
  REACT_NATIVE_TARGETS,
} from "../packages/wallet-core/src/react-native-manifest.mjs";
import { validatePackageContents } from "./package-contents.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(repositoryRoot, "packages/wallet-core");
const distRoot = resolve(packageRoot, "dist");
const wasmFilename = "symbol_nem_wallet_core_wasm_bg.wasm";

function usage() {
  console.error(
    "usage: node scripts/build-npm-package.mjs [--native-artifact target_id=path]... [--react-native-artifact target_id=path]... [--wasm path] [--wasm-bindgen-bin path]",
  );
  process.exitCode = 2;
}

function parseOptions(argv) {
  const options = { nativeArtifacts: [], reactNativeArtifacts: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--native-artifact") {
      const value = argv[++index];
      const separator = value?.indexOf("=");
      if (separator === undefined || separator < 1 || separator === value.length - 1) {
        usage();
        return null;
      }
      options.nativeArtifacts.push({
        targetId: value.slice(0, separator),
        path: resolve(repositoryRoot, value.slice(separator + 1)),
      });
    } else if (argument === "--react-native-artifact") {
      const value = argv[++index];
      const separator = value?.indexOf("=");
      if (separator === undefined || separator < 1 || separator === value.length - 1) {
        usage();
        return null;
      }
      options.reactNativeArtifacts.push({
        targetId: value.slice(0, separator),
        path: resolve(repositoryRoot, value.slice(separator + 1)),
      });
    } else if (argument === "--wasm") {
      options.wasm = resolve(repositoryRoot, argv[++index] ?? "");
    } else if (argument === "--wasm-bindgen-bin") {
      options.wasmBindgenBin = argv[++index];
    } else {
      usage();
      return null;
    }
  }
  return options;
}

function sourceCommit() {
  if (process.env.SNWC_SOURCE_COMMIT) {
    return process.env.SNWC_SOURCE_COMMIT;
  }
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
  } catch (error) {
    const output = typeof error?.stdout === "string" ? error.stdout.trim() : "";
    if (/^[0-9a-f]{40}$/.test(output)) {
      return output;
    }
    throw new Error("unable to determine source commit; set SNWC_SOURCE_COMMIT");
  }
}

function toolchainIdentifier() {
  if (process.env.SNWC_TOOLCHAIN_IDENTIFIER) {
    return process.env.SNWC_TOOLCHAIN_IDENTIFIER;
  }
  try {
    return execFileSync("rustc", ["-Vv"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    })
      .split("\n", 1)[0]
      .trim();
  } catch {
    return "local-assembly";
  }
}

function runWasmBindgen(wasmPath, binary, target, outputRoot) {
  mkdirSync(outputRoot, { recursive: true });
  execFileSync(
    binary,
    ["--target", target, "--out-dir", outputRoot, wasmPath],
    { cwd: repositoryRoot, stdio: "inherit" },
  );
}

function copyWasmGlue(sourceRoot, destinationRoot, outputName) {
  const sourceJs = resolve(sourceRoot, "symbol_nem_wallet_core_wasm.js");
  const sourceWasm = resolve(sourceRoot, "symbol_nem_wallet_core_wasm_bg.wasm");
  if (!existsSync(sourceJs) || !existsSync(sourceWasm)) {
    throw new Error("wasm-bindgen output is incomplete");
  }
  writeFileSync(resolve(destinationRoot, outputName), readFileSync(sourceJs));
  const destinationWasm = resolve(destinationRoot, wasmFilename);
  const wasmBytes = readFileSync(sourceWasm);
  if (existsSync(destinationWasm) && !Buffer.from(readFileSync(destinationWasm)).equals(wasmBytes)) {
    throw new Error("wasm-bindgen outputs do not share one canonical WASM asset");
  }
  writeFileSync(destinationWasm, wasmBytes);

  const snippets = resolve(sourceRoot, "snippets");
  if (existsSync(snippets)) {
    cpSync(snippets, resolve(destinationRoot, "snippets"), { recursive: true });
  }
}

function inlineReactNativeRuntime(entryPath, runtimePaths) {
  let source = readFileSync(entryPath, "utf8");
  const replacements = [
    {
      importLine: 'import { createFacade } from "../facade-runtime.mjs";\n',
      runtimePath: runtimePaths[0],
    },
    {
      importLine: 'import { getReactNativeModule } from "./native-module.mjs";\n',
      runtimePath: runtimePaths[1],
    },
  ];
  for (const { importLine, runtimePath } of replacements) {
    const runtime = readFileSync(runtimePath, "utf8")
      .replace(/^export \{[^;]+;\n?/gm, "")
      .replace(/^export /gm, "");
    source = source.replace(importLine, runtime);
  }
  return source;
}

function inlineRuntime(entryPath, runtimePaths) {
  let source = readFileSync(entryPath, "utf8");
  for (const runtimePath of runtimePaths) {
    const runtime = readFileSync(runtimePath, "utf8")
      .replace(/^export \{[^;]+;\n?/gm, "")
      .replace(/^export /gm, "");
    const marker = runtimePath.endsWith("manifest.mjs")
      ? "/* @snwc-manifest-runtime */"
      : "/* @snwc-facade-runtime */";
    const importLine = runtimePath.endsWith("manifest.mjs")
      ? 'import { targetForRuntime, validateNativeManifest } from "../manifest.mjs";\n'
      : 'import { createFacade } from "../facade-runtime.mjs";\n';
    if (source.includes(marker)) {
      source = source.replace(marker, runtime);
    } else {
      source = source.replace(importLine, runtime);
    }
    source = source.replace(importLine, "");
  }
  return source;
}

function build(options) {
  const nativeArtifacts = validateNativeArtifactInputs(options.nativeArtifacts);
  const reactNativeArtifacts = validateReactNativeArtifactInputs(options.reactNativeArtifacts, {
    requireComplete: options.reactNativeArtifacts.length > 0,
  });
  const packageMeta = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
  const sourceRevision = sourceCommit();
  const buildToolchain = toolchainIdentifier();
  rmSync(distRoot, { recursive: true, force: true });
  mkdirSync(resolve(distRoot, "node"), { recursive: true });
  mkdirSync(resolve(distRoot, "wasm"), { recursive: true });
  mkdirSync(resolve(distRoot, "native"), { recursive: true });
  mkdirSync(resolve(distRoot, "react-native"), { recursive: true });

  cpSync(resolve(packageRoot, "src/index.d.ts"), resolve(distRoot, "index.d.ts"));

  const wasmPath = options.wasm ?? resolve(repositoryRoot, "target/wasm32-unknown-unknown/release/symbol_nem_wallet_core_wasm.wasm");
  if (!existsSync(wasmPath)) {
    throw new Error("WASM input is missing; build crates/wasm before package assembly");
  }
  const generatedRoot = resolve(tmpdir(), `snwc-wasm-bindgen-${process.pid}`);
  rmSync(generatedRoot, { recursive: true, force: true });
  mkdirSync(generatedRoot, { recursive: true });
  const wasmBindgen = options.wasmBindgenBin ?? process.env.WASM_BINDGEN_BIN ?? "wasm-bindgen";
  const webRoot = resolve(generatedRoot, "web");
  const nodeRoot = resolve(generatedRoot, "node");
  try {
    runWasmBindgen(wasmPath, wasmBindgen, "web", webRoot);
    runWasmBindgen(wasmPath, wasmBindgen, "nodejs", nodeRoot);
    copyWasmGlue(webRoot, resolve(distRoot, "wasm"), "generated.mjs");
    copyWasmGlue(nodeRoot, resolve(distRoot, "wasm"), "generated.cjs");
  } finally {
    rmSync(generatedRoot, { recursive: true, force: true });
  }

  writeFileSync(
    resolve(distRoot, "wasm/index.mjs"),
    inlineRuntime(resolve(packageRoot, "src/wasm/index.mjs"), [
      resolve(packageRoot, "src/facade-runtime.mjs"),
    ]),
  );
  cpSync(resolve(packageRoot, "src/wasm/asset.mjs"), resolve(distRoot, "wasm/asset.mjs"));
  writeFileSync(
    resolve(distRoot, "wasm/index.cjs"),
    inlineRuntime(resolve(packageRoot, "src/wasm/index.cjs"), [
      resolve(packageRoot, "src/facade-runtime.mjs"),
    ]),
  );
  writeFileSync(
    resolve(distRoot, "node/index.mjs"),
    inlineRuntime(resolve(packageRoot, "src/node/index.mjs"), [
      resolve(packageRoot, "src/facade-runtime.mjs"),
      resolve(packageRoot, "src/manifest.mjs"),
    ]),
  );
  writeFileSync(
    resolve(distRoot, "node/index.cjs"),
    inlineRuntime(resolve(packageRoot, "src/node/index.cjs"), [
      resolve(packageRoot, "src/facade-runtime.mjs"),
      resolve(packageRoot, "src/manifest.mjs"),
    ]),
  );

  writeFileSync(
    resolve(distRoot, "react-native/index.js"),
    inlineReactNativeRuntime(resolve(packageRoot, "src/react-native/index.mjs"), [
      resolve(packageRoot, "src/facade-runtime.mjs"),
      resolve(packageRoot, "src/react-native/native-module.mjs"),
    ]),
  );

  for (const item of nativeArtifacts) {
    const targetRoot = resolve(distRoot, "native", item.targetId);
    mkdirSync(targetRoot, { recursive: true });
    cpSync(item.path, resolve(targetRoot, item.artifactFilename));
  }
  const suppliedArtifacts = nativeArtifacts.map((item) => ({
    targetId: item.targetId,
    path: resolve(distRoot, "native", item.targetId, item.artifactFilename),
  }));
  const manifest = assembleNativeManifest({
    packageVersion: packageMeta.version,
    sourceCommit: sourceRevision,
    artifacts: suppliedArtifacts,
    toolchainIdentifier: buildToolchain,
  });
  writeFileSync(
    resolve(distRoot, "native/artifact-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  for (const item of reactNativeArtifacts) {
    const target = REACT_NATIVE_TARGETS[item.targetId];
    const destination = target.platform === "android"
      ? resolve(distRoot, target.relativePath.slice("dist/".length))
      : resolve(distRoot, target.relativePath.slice("dist/".length));
    mkdirSync(resolve(destination, ".."), { recursive: true });
    cpSync(item.path, destination);
  }
  if (reactNativeArtifacts.some((item) => REACT_NATIVE_TARGETS[item.targetId].platform === "ios")) {
    const xcframeworkRoot = resolve(
      distRoot,
      "react-native/ios/SymbolNemWalletCoreRN.xcframework",
    );
    writeFileSync(
      resolve(xcframeworkRoot, "Info.plist"),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>AvailableLibraries</key>
  <array>
    <dict>
      <key>LibraryIdentifier</key>
      <string>ios-arm64</string>
      <key>LibraryPath</key>
      <string>libsymbol_nem_wallet_core_rn.a</string>
      <key>SupportedArchitectures</key>
      <array><string>arm64</string></array>
      <key>SupportedPlatform</key>
      <string>ios</string>
    </dict>
    <dict>
      <key>LibraryIdentifier</key>
      <string>ios-arm64-simulator</string>
      <key>LibraryPath</key>
      <string>libsymbol_nem_wallet_core_rn.a</string>
      <key>SupportedArchitectures</key>
      <array><string>arm64</string></array>
      <key>SupportedPlatform</key>
      <string>ios</string>
      <key>SupportedPlatformVariant</key>
      <string>simulator</string>
    </dict>
  </array>
  <key>CFBundlePackageType</key>
  <string>XFWK</string>
  <key>XCFrameworkFormatVersion</key>
  <string>1.0</string>
</dict>
</plist>
`,
    );
  }
  const reactNativeManifest = assembleReactNativeManifest({
    packageVersion: packageMeta.version,
    sourceCommit: sourceRevision,
    artifacts: reactNativeArtifacts,
    toolchainIdentifier: buildToolchain,
    requireComplete: options.reactNativeArtifacts.length > 0,
  });
  writeFileSync(
    resolve(distRoot, "react-native/artifact-manifest.json"),
    `${JSON.stringify(reactNativeManifest, null, 2)}\n`,
  );
  validatePackageContents(packageRoot, manifest, reactNativeManifest);
}

const options = parseOptions(process.argv.slice(2));
if (options !== null) {
  try {
    build(options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "package assembly failed");
    process.exitCode = 1;
  }
}

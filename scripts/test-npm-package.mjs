import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { targetForRuntime } from "../packages/wallet-core/src/manifest.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageTestRoot = resolve(repositoryRoot, "packages/wallet-core/test");

function run(command, args) {
  execFileSync(command, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
  });
}

function sourceCommitFromGit() {
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

function wasmBindgenBinary() {
  const configured = process.env.WASM_BINDGEN_BIN;
  if (configured) {
    return configured;
  }
  try {
    execFileSync("wasm-bindgen", ["--version"], { stdio: "ignore" });
    return "wasm-bindgen";
  } catch {
    throw new Error("WASM_BINDGEN_BIN must point to the wasm-bindgen CLI");
  }
}

function runtimeGlibcVersion() {
  if (process.platform !== "linux") {
    return undefined;
  }
  try {
    const version = process.report?.getReport?.().header?.glibcVersionRuntime;
    return typeof version === "string" && version.length > 0 ? version : undefined;
  } catch {
    return undefined;
  }
}

function currentNativeTarget() {
  return targetForRuntime(process.platform, process.arch, runtimeGlibcVersion());
}

function nativeArtifactPath() {
  const candidates = [
    "target/release/libsymbol_nem_wallet_core_node.so",
    "target/release/libsymbol_nem_wallet_core_node.dylib",
    "target/release/symbol_nem_wallet_core_node.dll",
    "target/release/libsymbol_nem_wallet_core_node.dll",
  ];
  for (const relativePath of candidates) {
    const path = resolve(repositoryRoot, relativePath);
    try {
      if (statSync(path).isFile()) {
        return path;
      }
    } catch {
      // Try the next platform-specific Cargo output name.
    }
  }
  throw new Error("current native Cargo artifact is missing");
}

function testFiles() {
  return readdirSync(packageTestRoot)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => resolve(packageTestRoot, name));
}

if (!process.env.SNWC_SOURCE_COMMIT) {
  process.env.SNWC_SOURCE_COMMIT = sourceCommitFromGit();
}

const wasmBindgen = wasmBindgenBinary();
let nativeStagingDirectory;
try {
  run("cargo", ["build", "--locked", "-p", "symbol-nem-wallet-core-wasm", "--target", "wasm32-unknown-unknown", "--release"]);

  const nativeTarget = currentNativeTarget();
  const nativeArguments = [];
  if (nativeTarget !== null) {
    run("cargo", ["build", "--locked", "-p", "symbol-nem-wallet-core-node", "--release"]);
    nativeStagingDirectory = mkdtempSync(resolve(tmpdir(), "snwc-native-test-"));
    const stagedArtifact = resolve(nativeStagingDirectory, `${nativeTarget}.node`);
    copyFileSync(nativeArtifactPath(), stagedArtifact);
    nativeArguments.push("--native-artifact", `${nativeTarget}=${stagedArtifact}`);
  }

  run(process.execPath, [
    "scripts/build-npm-package.mjs",
    "--wasm-bindgen-bin",
    wasmBindgen,
    ...nativeArguments,
  ]);
  for (const file of testFiles()) {
    run(process.execPath, [file]);
  }
} finally {
  if (nativeStagingDirectory !== undefined) {
    rmSync(nativeStagingDirectory, { recursive: true, force: true });
  }
}

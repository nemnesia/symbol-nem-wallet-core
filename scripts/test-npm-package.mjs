import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { targetForRuntime, validateNativeManifest } from "../packages/wallet-core/src/manifest.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageTestRoot = resolve(repositoryRoot, "packages/wallet-core/test");
const packageRoot = resolve(repositoryRoot, "packages/wallet-core");
const nodeParityRunner = resolve(packageTestRoot, "parity-node-runner.mjs");
const formalParity = process.argv.slice(2).includes("--formal-parity");
const NODE_NATIVE_BLOCKED_REASON = "BLOCKED / Node native parity evidence unavailable";

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

function nativeEvidence(nativeTarget) {
  if (nativeTarget === null) {
    throw new Error(NODE_NATIVE_BLOCKED_REASON);
  }
  try {
    const packageMeta = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "dist/native/artifact-manifest.json"), "utf8"),
    );
    validateNativeManifest(manifest, packageMeta);
    const entry = manifest.artifacts.find((artifact) => artifact.target_id === nativeTarget);
    if (entry === undefined) {
      throw new Error("native target manifest entry is missing");
    }
    const artifactPath = resolve(packageRoot, entry.relative_path);
    if (!existsSync(artifactPath) || !statSync(artifactPath).isFile()) {
      throw new Error("native target artifact is missing");
    }
    return {
      target_id: nativeTarget,
      manifest_entry_present: true,
      native_artifact_present: true,
    };
  } catch (error) {
    if (error?.message === NODE_NATIVE_BLOCKED_REASON) {
      throw error;
    }
    throw new Error(NODE_NATIVE_BLOCKED_REASON);
  }
}

function runParityResult(args) {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-formal-parity-"));
  const output = resolve(directory, "stdout");
  const outputDescriptor = openSync(output, "w");
  try {
    execFileSync(process.execPath, args, {
      cwd: packageRoot,
      stdio: ["ignore", outputDescriptor, outputDescriptor],
    });
    return JSON.parse(readFileSync(output, "utf8"));
  } finally {
    closeSync(outputDescriptor);
    rmSync(directory, { recursive: true, force: true });
  }
}

async function runFormalParity(nativeTarget) {
  const evidence = nativeEvidence(nativeTarget);
  const native = runParityResult([nodeParityRunner]);
  const wasm = runParityResult(["--no-addons", nodeParityRunner]);
  assert.deepEqual(wasm, native);

  const nodeEvidence = {
    node_native: {
      ...evidence,
      native_root_execution_success: true,
    },
    node_wasm: {
      execution_success: true,
    },
  };

  const { runBrowserParity } = await import("../packages/wallet-core/test/browser-parity.mjs");
  const browser = await runBrowserParity();
  if (browser.status === "blocked") {
    console.log(JSON.stringify({ ...nodeEvidence, browser }));
    throw new Error(browser.reason);
  }
  if (browser.status !== "ok") {
    console.log(JSON.stringify({ ...nodeEvidence, browser }));
    throw new Error(browser.reason ?? "Browser WASM parity failure");
  }
  assert.deepEqual(browser.result, native);

  console.log(
    JSON.stringify({
      ...nodeEvidence,
      browser: {
        command: browser.browser.command,
        version: browser.browser.version,
        status: "ok",
      },
      canonical_result_equal: true,
    }),
  );
}

if (!process.env.SNWC_SOURCE_COMMIT) {
  process.env.SNWC_SOURCE_COMMIT = sourceCommitFromGit();
}

const wasmBindgen = wasmBindgenBinary();
let nativeStagingDirectory;
try {
  run("cargo", ["build", "--locked", "-p", "symbol-nem-wallet-core-wasm", "--target", "wasm32-unknown-unknown", "--release"]);

  const nativeTarget = currentNativeTarget();
  if (formalParity && nativeTarget === null) {
    throw new Error(NODE_NATIVE_BLOCKED_REASON);
  }
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
  if (formalParity) {
    await runFormalParity(nativeTarget);
  } else {
    for (const file of testFiles()) {
      run(process.execPath, [file]);
    }
  }
} finally {
  if (nativeStagingDirectory !== undefined) {
    rmSync(nativeStagingDirectory, { recursive: true, force: true });
  }
}

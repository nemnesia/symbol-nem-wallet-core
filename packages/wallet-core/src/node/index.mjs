import { createFacade } from "../facade-runtime.mjs";
import { targetForRuntime, validateNativeManifest } from "../manifest.mjs";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function backendInitializationError() {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  return error;
}

function readJson(url) {
  try {
    return JSON.parse(readFileSync(url, "utf8"));
  } catch {
    throw backendInitializationError();
  }
}

function runtimeGlibcVersion() {
  try {
    if (!process.report || typeof process.report.getReport !== "function") {
      return undefined;
    }
    const report = process.report.getReport();
    const version = report?.header?.glibcVersionRuntime;
    return typeof version === "string" && version.length > 0 ? version : undefined;
  } catch {
    return undefined;
  }
}

function loadNativeBackend() {
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
  const packageMeta = readJson(new URL("../../package.json", import.meta.url));
  const manifest = readJson(new URL("../native/artifact-manifest.json", import.meta.url));
  try {
    validateNativeManifest(manifest, packageMeta);
  } catch {
    throw backendInitializationError();
  }

  const targetId = targetForRuntime(process.platform, process.arch, runtimeGlibcVersion());
  if (targetId === null) {
    return null;
  }
  const entry = manifest.artifacts.find((artifact) => artifact.target_id === targetId);
  if (entry === undefined) {
    return null;
  }

  try {
    const artifactPath = resolve(packageRoot, entry.relative_path);
    const require = createRequire(import.meta.url);
    return require(artifactPath);
  } catch {
    throw backendInitializationError();
  }
}

const nativeBackend = loadNativeBackend();
const backend =
  nativeBackend === null
    ? (await import("../wasm/index.mjs"))
    : nativeBackend;
let facade;
try {
  facade = createFacade(backend);
} catch {
  throw backendInitializationError();
}

export const {
  create_empty_store,
  prepare_generated_profile,
  finalize_generated_profile,
  restore_profile,
  list_profiles,
  export_mnemonic,
  export_private_key,
  list_software_keys,
  derive_software_key,
  import_software_key,
  generate_software_key,
  get_public_account,
  sign,
  change_profile_password,
  delete_software_key,
  delete_profile,
} = facade;

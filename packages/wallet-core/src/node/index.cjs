/* @snwc-facade-runtime */
/* @snwc-manifest-runtime */

const { createRequire } = require("node:module");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

function backendInitializationError() {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  return error;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
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
  const packageRoot = __dirname.replace(/[\\/]dist[\\/]node$/, "");
  const packageMeta = readJson(resolve(packageRoot, "package.json"));
  const manifest = readJson(resolve(packageRoot, "dist/native/artifact-manifest.json"));
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
    const actualSha256 = createHash("sha256").update(readFileSync(artifactPath)).digest("hex");
    if (actualSha256 !== entry.sha256) {
      throw backendInitializationError();
    }
    return createRequire(__filename)(artifactPath);
  } catch {
    throw backendInitializationError();
  }
}

let nativeBackend = loadNativeBackend();
const backend = nativeBackend === null ? require("../wasm/index.cjs") : nativeBackend;
try {
  module.exports = createFacade(backend);
} catch {
  throw backendInitializationError();
}

/* @snwc-facade-runtime */

let generated;
try {
  generated = require("./generated.cjs");
  const { createHash } = require("node:crypto");
  const { readFileSync } = require("node:fs");
  const artifactManifest = JSON.parse(readFileSync(`${__dirname}/artifact-manifest.json`, "utf8"));
  if (
    artifactManifest === null ||
    typeof artifactManifest !== "object" ||
    Array.isArray(artifactManifest) ||
    Object.keys(artifactManifest).sort().join(",") !== "artifact_filename,sha256" ||
    artifactManifest.artifact_filename !== "symbol_nem_wallet_core_wasm_bg.wasm" ||
    typeof artifactManifest.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(artifactManifest.sha256)
  ) throw new Error("WASM integrity metadata invalid");
  const bytes = readFileSync(`${__dirname}/symbol_nem_wallet_core_wasm_bg.wasm`);
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== artifactManifest.sha256) throw new Error("integrity mismatch");
  generated.__snwcInitializeWasm(bytes);
} catch {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  throw error;
}

try {
  module.exports = createFacade(generated);
} catch {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  throw error;
}

import { createFacade } from "../facade-runtime.mjs";
import { loadWasmAsset, verifyWasmAsset } from "./asset.mjs";
import wasmArtifactManifest from "./artifact-manifest.json" with { type: "json" };
import * as generated from "./generated.mjs";

function backendInitializationError() {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  return error;
}

const isNode =
  typeof process !== "undefined" &&
  typeof process.versions?.node === "string" &&
  process.versions.node.length > 0;

try {
  if (
    wasmArtifactManifest === null ||
    typeof wasmArtifactManifest !== "object" ||
    Array.isArray(wasmArtifactManifest) ||
    Object.keys(wasmArtifactManifest).sort().join(",") !== "artifact_filename,sha256" ||
    wasmArtifactManifest.artifact_filename !== "symbol_nem_wallet_core_wasm_bg.wasm"
  ) {
    throw new Error("WASM integrity metadata invalid");
  }
  if (isNode) {
    const nodeFsSpecifier = ["node", "fs"].join(":");
    const { readFileSync } = await import(nodeFsSpecifier);
    const bytes = readFileSync(new URL("./symbol_nem_wallet_core_wasm_bg.wasm", import.meta.url));
    await verifyWasmAsset(bytes, wasmArtifactManifest.sha256);
    generated.initSync({ module: bytes });
  } else {
    const bytes = await loadWasmAsset();
    await verifyWasmAsset(bytes, wasmArtifactManifest.sha256);
    await generated.default(bytes);
  }
} catch {
  throw backendInitializationError();
}

let facade;
try {
  facade = createFacade(generated);
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

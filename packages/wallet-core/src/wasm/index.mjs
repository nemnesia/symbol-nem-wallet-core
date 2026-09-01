import { createFacade } from "../facade-runtime.mjs";
import * as generated from "./generated.mjs";

function backendInitializationError() {
  const error = new Error("backend initialization failed");
  error.name = "WalletCoreBackendInitializationError";
  return error;
}

const wasmAsset = new URL("./symbol_nem_wallet_core_wasm_bg.wasm", import.meta.url);
const isNode =
  typeof process !== "undefined" &&
  typeof process.versions?.node === "string" &&
  process.versions.node.length > 0;

try {
  if (isNode) {
    const { readFileSync } = await import("node:fs");
    generated.initSync({ module: readFileSync(wasmAsset) });
  } else {
    await generated.default(wasmAsset);
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

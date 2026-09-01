const wasmAssetUrl = new URL("./symbol_nem_wallet_core_wasm_bg.wasm", import.meta.url);

export async function loadWasmAsset() {
  try {
    const imported = await import("./symbol_nem_wallet_core_wasm_bg.wasm?url");
    return imported.default ?? imported;
  } catch {
    return wasmAssetUrl;
  }
}

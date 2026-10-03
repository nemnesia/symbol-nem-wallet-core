const wasmAssetUrl = new URL("./symbol_nem_wallet_core_wasm_bg.wasm", import.meta.url);

export async function loadWasmAsset() {
  let url;
  try {
    const imported = await import("./symbol_nem_wallet_core_wasm_bg.wasm?url");
    url = imported.default ?? imported;
  } catch {
    url = wasmAssetUrl;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error("WASM asset unavailable");
  return new Uint8Array(await response.arrayBuffer());
}

export async function verifyWasmAsset(bytes, expectedSha256) {
  if (typeof expectedSha256 !== "string" || !/^[0-9a-f]{64}$/.test(expectedSha256)) {
    throw new Error("WASM integrity metadata invalid");
  }
  const cryptoApi = globalThis.crypto;
  if (!(bytes instanceof Uint8Array) || cryptoApi?.subtle === undefined) {
    throw new Error("WASM integrity verification unavailable");
  }
  const digest = new Uint8Array(await cryptoApi.subtle.digest("SHA-256", bytes));
  let actual = "";
  for (const byte of digest) actual += byte.toString(16).padStart(2, "0");
  if (actual !== expectedSha256) throw new Error("WASM integrity mismatch");
  return bytes;
}

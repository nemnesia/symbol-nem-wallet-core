import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import * as wasmFacade from "../dist/wasm/index.mjs";
import { verifyWasmAsset } from "../src/wasm/asset.mjs";
import wasmArtifactManifest from "../dist/wasm/artifact-manifest.json" with { type: "json" };

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wasmRelativePath = "wasm/symbol_nem_wallet_core_wasm_bg.wasm";
const require = createRequire(import.meta.url);

function makeWasmCopy() {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-wasm-integrity-"));
  const root = resolve(directory, "wasm");
  cpSync(resolve(packageRoot, "dist/wasm"), root, { recursive: true });
  return { directory, root };
}

function corruptWasm(root) {
  const path = resolve(root, wasmRelativePath.slice("wasm/".length));
  const bytes = readFileSync(path);
  bytes[0] ^= 0xff;
  writeFileSync(path, bytes);
}

function assertInitializationError(error) {
  assert.equal(error?.name, "WalletCoreBackendInitializationError");
  assert.equal(error?.message, "backend initialization failed");
  assert.equal("code" in error, false);
  assert.doesNotMatch(error.message, /path|digest|sha|wasm|secret/i);
  return true;
}

test("runtime metadata matches the one canonical WASM artifact and valid bytes initialize", () => {
  const bytes = readFileSync(resolve(packageRoot, "dist", wasmRelativePath));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), wasmArtifactManifest.sha256);
  assert.equal(wasmFacade.create_empty_store() instanceof Uint8Array, true);
});

test("WASM byte mismatch fails closed before ESM or CJS instantiation", async () => {
  for (const format of ["esm", "cjs"]) {
    const { directory, root } = makeWasmCopy();
    try {
      corruptWasm(root);
      const indexPath = resolve(root, `index.${format === "esm" ? "mjs" : "cjs"}`);
      const originalInstance = WebAssembly.Instance;
      let instanceCalls = 0;
      WebAssembly.Instance = class extends originalInstance {
        constructor(...args) {
          instanceCalls += 1;
          super(...args);
        }
      };
      try {
        if (format === "esm") {
          await assert.rejects(import(`${pathToFileURL(indexPath).href}?integrity-test=${Date.now()}`), assertInitializationError);
        } else {
          assert.throws(() => require(indexPath), assertInitializationError);
        }
      } finally {
        WebAssembly.Instance = originalInstance;
      }
      assert.equal(instanceCalls, 0, `${format} must reject before a Core instance can run`);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("integrity verification accepts the expected bytes and rejects one-byte changes", async () => {
  const bytes = readFileSync(resolve(packageRoot, "dist", wasmRelativePath));
  assert.equal(await verifyWasmAsset(bytes, wasmArtifactManifest.sha256), bytes);
  const altered = new Uint8Array(bytes);
  altered[altered.length - 1] ^= 0xff;
  await assert.rejects(verifyWasmAsset(altered, wasmArtifactManifest.sha256));
});

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

function replaceExpectedDigest(root) {
  const manifestPath = resolve(root, "artifact-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const actualDigest = manifest.sha256;
  manifest.sha256 = `${actualDigest[0] === "0" ? "1" : "0"}${actualDigest.slice(1)}`;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
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

test("valid WASM with a different valid expected digest fails in both ESM and CJS loaders", async () => {
  for (const format of ["esm", "cjs"]) {
    const { directory, root } = makeWasmCopy();
    try {
      const bytes = readFileSync(resolve(root, wasmRelativePath.slice("wasm/".length)));
      assert.equal(WebAssembly.validate(bytes), true, "the artifact must remain a valid WASM module");
      replaceExpectedDigest(root);
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
          await assert.rejects(import(`${pathToFileURL(indexPath).href}?wrong-digest=${Date.now()}`), assertInitializationError);
        } else {
          assert.throws(() => require(indexPath), assertInitializationError);
        }
      } finally {
        WebAssembly.Instance = originalInstance;
      }
      assert.equal(instanceCalls, 0, `${format} must reject the valid module before instantiation`);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("browser loader rejects valid fetched WASM when its expected digest differs", async () => {
  const { directory, root } = makeWasmCopy();
  const wasmBytes = readFileSync(resolve(root, wasmRelativePath.slice("wasm/".length)));
  assert.equal(WebAssembly.validate(wasmBytes), true, "the browser fixture must retain valid WASM bytes");
  replaceExpectedDigest(root);
  const indexPath = resolve(root, "index.mjs");
  const originalProcess = Object.getOwnPropertyDescriptor(globalThis, "process");
  const originalFetch = globalThis.fetch;
  const originalInstance = WebAssembly.Instance;
  let instanceCalls = 0;
  globalThis.process = undefined;
  globalThis.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => wasmBytes.buffer.slice(
      wasmBytes.byteOffset,
      wasmBytes.byteOffset + wasmBytes.byteLength,
    ),
  });
  WebAssembly.Instance = class extends originalInstance {
    constructor(...args) {
      instanceCalls += 1;
      super(...args);
    }
  };
  try {
    await assert.rejects(import(`${pathToFileURL(indexPath).href}?browser-wrong-digest=${Date.now()}`), assertInitializationError);
    assert.equal(instanceCalls, 0, "browser loader must reject before WASM instantiation");
  } finally {
    Object.defineProperty(globalThis, "process", originalProcess);
    globalThis.fetch = originalFetch;
    WebAssembly.Instance = originalInstance;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("ESM and CJS normalize missing and malformed runtime manifests", async () => {
  for (const format of ["esm", "cjs"]) {
    for (const failure of ["missing", "malformed-json", "malformed-schema", "malformed-digest"]) {
      const { directory, root } = makeWasmCopy();
      try {
        const manifestPath = resolve(root, "artifact-manifest.json");
        if (failure === "missing") {
          rmSync(manifestPath);
        } else if (failure === "malformed-json") {
          writeFileSync(manifestPath, "{");
        } else {
          const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
          if (failure === "malformed-schema") manifest.unexpected = true;
          else manifest.sha256 = "not-a-sha256";
          writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
        }
        const indexPath = resolve(root, `index.${format === "esm" ? "mjs" : "cjs"}`);
        if (format === "esm") {
          await assert.rejects(import(`${pathToFileURL(indexPath).href}?${failure}=${Date.now()}`), assertInitializationError);
        } else {
          assert.throws(() => require(indexPath), assertInitializationError);
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
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

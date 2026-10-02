import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../..", import.meta.url));

test("Node秘密出力はJS所有bufferへ移り、allocation・conversion失敗前にcopyしない", {
  skip: process.platform !== "linux" ? "Linux N-API fault injection" : false,
}, () => {
  const temporary = mkdtempSync(resolve(tmpdir(), "snwc-node-output-"));
  try {
    const shim = resolve(temporary, "napi-failures.so");
    execFileSync("cc", ["-std=c11", "-Wall", "-Wextra", "-Werror", "-shared", "-fPIC",
      resolve(root, "scripts/node-output-allocation-failures.c"), "-ldl", "-o", shim]);
    const runner = resolve(temporary, "runner.mjs");
    writeFileSync(runner, `
import assert from "node:assert/strict";
import * as api from ${JSON.stringify(new URL("../dist/node/index.mjs", import.meta.url).href)};
const store = api.create_empty_store();
const password = new TextEncoder().encode("output allocation fixture");
if (process.argv[2] === "success") {
  const result = api.prepare_generated_profile(store, password, 1);
  assert.ok(result.value.mnemonic_utf8 instanceof Uint8Array);
  const original = result.value.mnemonic_utf8;
  const expected = original.slice();
  const transferred = structuredClone(original, { transfer: [original.buffer] });
  assert.equal(original.byteLength, 0);
  assert.ok(transferred.length === expected.length && transferred.every((byte, index) => byte === expected[index]));
  transferred.fill(0);
  expected.fill(0);
} else {
  assert.throws(() => api.prepare_generated_profile(store, password, 1),
    error => error.name === "WalletCoreError" && error.code === "BindingFailure");
}
assert.equal(api.list_profiles(store).value.length, 0);
`);
    for (const mode of ["allocation", "typedarray", "metadata", "success"]) {
      execFileSync(process.execPath, [runner, mode], {
        env: { ...process.env, LD_AUDIT: shim, SNWC_TEST_NAPI_OUTPUT_FAILURE: mode }, stdio: "pipe", timeout: 30_000,
      });
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

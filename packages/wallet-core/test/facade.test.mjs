import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import * as facade from "@nemnesia/symbol-nem-wallet-core";
import { createFacade } from "../src/facade-runtime.mjs";
import * as wasmFacade from "../dist/wasm/index.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageName = "@nemnesia/symbol-nem-wallet-core";
const expectedExports = [
  "create_empty_store",
  "prepare_generated_profile",
  "finalize_generated_profile",
  "restore_profile",
  "list_profiles",
  "export_mnemonic",
  "export_private_key",
  "list_software_keys",
  "derive_software_key",
  "import_software_key",
  "generate_software_key",
  "get_public_account",
  "sign",
  "change_profile_password",
  "delete_software_key",
  "delete_profile",
];

function sorted(value) {
  return [...value].sort();
}

function runNode(args, cwd = packageRoot) {
  return execFileSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function makePackageCopy() {
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-package-test-"));
  const copy = resolve(directory, "wallet-core");
  cpSync(packageRoot, copy, { recursive: true });
  return { directory, copy };
}

test("root ESM export is exactly the 16 synchronous operations", () => {
  assert.deepEqual(sorted(Object.keys(facade)), sorted(expectedExports));
  assert.equal("default" in facade, false);
  assert.equal("WalletCoreError" in facade, false);
  assert.equal(facade.create_empty_store() instanceof Uint8Array, true);
  assert.equal(facade.list_profiles(facade.create_empty_store()).value.length, 0);
  assert.equal(facade.list_profiles(facade.create_empty_store()).warnings.length, 0);
});

test("Node native and direct WASM operations normalize Core errors identically", () => {
  for (const api of [facade, wasmFacade]) {
    assert.throws(
      () => api.list_profiles(Uint8Array.from([0])),
      (error) =>
        error.name === "WalletCoreError" &&
        error.code === "InvalidStore" &&
        error.message === "InvalidStore",
    );
  }
});

test("Node CJS and --no-addons WASM entries expose the same root surface", () => {
  const cjs = JSON.parse(
    runNode([
      "-e",
      `const m=require(${JSON.stringify(packageName)}); console.log(JSON.stringify({keys:Object.keys(m),isBytes:m.create_empty_store() instanceof Uint8Array}));`,
    ]),
  );
  assert.deepEqual(sorted(cjs.keys), sorted(expectedExports));
  assert.equal(cjs.isBytes, true);

  const wasmEsm = JSON.parse(
    runNode([
      "--no-addons",
      "--input-type=module",
      "-e",
      `import(${JSON.stringify(packageName)}).then((m)=>console.log(JSON.stringify({keys:Object.keys(m),isBytes:m.create_empty_store() instanceof Uint8Array})))`,
    ]),
  );
  assert.deepEqual(sorted(wasmEsm.keys), sorted(expectedExports));
  assert.equal(wasmEsm.isBytes, true);

  const wasmCjs = JSON.parse(
    runNode([
      "--no-addons",
      "-e",
      `const m=require(${JSON.stringify(packageName)}); console.log(JSON.stringify({keys:Object.keys(m),isBytes:m.create_empty_store() instanceof Uint8Array}));`,
    ]),
  );
  assert.deepEqual(sorted(wasmCjs.keys), sorted(expectedExports));
  assert.equal(wasmCjs.isBytes, true);

  for (const subpath of ["node", "wasm", "native", "dist/wasm/index.mjs"]) {
    const privateSubpath = runNode([
      "--input-type=module",
      "-e",
      `import(${JSON.stringify(`${packageName}/${subpath}`)}).then(()=>process.exit(2)).catch((error)=>console.log(error.code))`,
    ]);
    assert.equal(privateSubpath, "ERR_PACKAGE_PATH_NOT_EXPORTED");
  }
});

test("facade normalizes representation, unit null, UUID errors, and Core errors", () => {
  let called = false;
  const backend = Object.fromEntries(
    expectedExports.map((name) => [
      name,
      () => {
        throw new Error("unexpected operation");
      },
    ]),
  );
  backend.create_empty_store = () => {
    const bytes = new Uint8Array([1, 2]);
    return bytes;
  };
  backend.list_profiles = (store) => {
    called = store instanceof Uint8Array;
    return {
      value: [],
      warnings: [{ code: "DecodeWarning", object_type: "profile" }],
    };
  };
  backend.import_software_key = () => ({
    store: new Uint8Array([3]),
    value: {
      key_id: "11111111-1111-4111-8111-111111111111",
      chain: "nem",
      origin: { kind: "imported" },
    },
    warnings: [],
  });
  backend.change_profile_password = () => ({ store: new Uint8Array([4]), value: null, warnings: [] });
  backend.delete_profile = () => {
    throw "InvalidStore";
  };

  const api = createFacade(backend);
  const store = api.create_empty_store();
  assert.equal(store instanceof Uint8Array, true);
  assert.deepEqual([...store], [1, 2]);
  assert.notEqual(store, backend.create_empty_store());

  const profiles = api.list_profiles(store);
  assert.equal(called, true);
  assert.deepEqual(profiles.value, []);
  assert.deepEqual(profiles.warnings, [
    {
      code: "DecodeWarning",
      object_type: "profile",
      object_id: undefined,
      field: undefined,
    },
  ]);

  const imported = api.import_software_key(store, "11111111-1111-4111-8111-111111111111", new Uint8Array(), 0, new Uint8Array(32));
  assert.equal(imported.value.origin.account_index, null);
  assert.equal(imported.value.chain, "nem");
  assert.equal(imported.value.key_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(api.change_profile_password(store, "11111111-1111-4111-8111-111111111111", new Uint8Array(), new Uint8Array()).value, null);

  assert.throws(
    () => api.list_software_keys(store, "not-a-uuid"),
    (error) => error.name === "WalletCoreError" && error.code === "InvalidArgument" && error.message === "InvalidArgument",
  );
  assert.throws(
    () => api.delete_profile(store, "11111111-1111-4111-8111-111111111111", new Uint8Array()),
    (error) => error.name === "WalletCoreError" && error.code === "InvalidStore" && error.message === "InvalidStore",
  );
  backend.delete_profile = () => {
    throw new Error("secret backend detail");
  };
  assert.throws(
    () => api.delete_profile(store, "11111111-1111-4111-8111-111111111111", new Uint8Array()),
    (error) =>
      error.name === "WalletCoreError" &&
      error.code === "BindingFailure" &&
      error.message === "BindingFailure" &&
      !error.message.includes("secret"),
  );
});

test("a valid manifest entry with an unreadable artifact fails closed", () => {
  const { directory, copy } = makePackageCopy();
  try {
    rmSync(resolve(copy, "dist/native/linux-x64-gnu/snwc-linux-x64-gnu.node"));
    const result = runNode(
      [
        "--input-type=module",
        "-e",
        `import(${JSON.stringify(packageName)}).then(()=>process.exit(2)).catch((error)=>console.log(JSON.stringify({name:error.name,message:error.message,code:error.code})))`,
      ],
      copy,
    );
    assert.deepEqual(JSON.parse(result), {
      name: "WalletCoreBackendInitializationError",
      message: "backend initialization failed",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a valid manifest without the current target falls back to package-local WASM", () => {
  const { directory, copy } = makePackageCopy();
  try {
    writeFileSync(
      resolve(copy, "dist/native/artifact-manifest.json"),
      `${JSON.stringify({
        schema_version: 1,
        package_name: packageName,
        package_version: JSON.parse(readFileSync(resolve(copy, "package.json"), "utf8")).version,
        source_commit: "ca270941a53f3517255d37ae51501c8c13cfcd16",
        node_api_version: 8,
        artifacts: [],
      }, null, 2)}\n`,
    );
    const result = runNode(
      [
        "--input-type=module",
        "-e",
        `import(${JSON.stringify(packageName)}).then((m)=>console.log(JSON.stringify({keys:Object.keys(m),isBytes:m.create_empty_store() instanceof Uint8Array})))`,
      ],
      copy,
    );
    const output = JSON.parse(result);
    assert.deepEqual(sorted(output.keys), sorted(expectedExports));
    assert.equal(output.isBytes, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

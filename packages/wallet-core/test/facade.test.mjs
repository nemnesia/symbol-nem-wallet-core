import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import * as facade from "@nemnesia/symbol-nem-wallet-core";
import { createFacade } from "../src/facade-runtime.mjs";
import { targetForRuntime } from "../src/manifest.mjs";
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

function runtimeGlibcVersion() {
  if (process.platform !== "linux") {
    return undefined;
  }
  return process.report?.getReport?.().header?.glibcVersionRuntime;
}

const currentTargetId = targetForRuntime(process.platform, process.arch, runtimeGlibcVersion());
const currentNativeArtifact =
  currentTargetId === null
    ? null
    : (() => {
        try {
          const manifest = JSON.parse(
            readFileSync(resolve(packageRoot, "dist/native/artifact-manifest.json"), "utf8"),
          );
          const entry = manifest.artifacts.find((artifact) => artifact.target_id === currentTargetId);
          return entry === undefined ? null : resolve(packageRoot, entry.relative_path);
        } catch {
          return null;
        }
      })();

function errorShape(call) {
  try {
    call();
  } catch (error) {
    return {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    };
  }
  return null;
}

function malformedRepresentationCases(api) {
  const store = new Uint8Array();
  const profileId = "11111111-1111-4111-8111-111111111111";
  const keyId = "22222222-2222-4222-8222-222222222222";
  const target = { kind: "software_key", profile_id: profileId, key_id: keyId };
  const exportRequest = {
    target,
    user_request: { target, status: "requested" },
    application_confirmation: { target, status: "confirmed" },
  };
  const context = { chain: "nem", network: "testnet" };
  const signingTarget = { profile_id: profileId, key_id: keyId, context };
  const signingApproval = { status: "approved" };
  const signingRequest = {
    target: signingTarget,
    payload: new Uint8Array([1]),
    approval: signingApproval,
  };

  return [
    ["null HandoffConfirmation", () => api.finalize_generated_profile(store, store, store, null), "BindingFailure"],
    ["primitive HandoffConfirmation", () => api.finalize_generated_profile(store, store, store, 1), "BindingFailure"],
    ["missing HandoffConfirmation.status", () => api.finalize_generated_profile(store, store, store, {}), "InvalidArgument"],
    ["unknown HandoffConfirmation.status", () => api.finalize_generated_profile(store, store, store, { status: "future" }), "InvalidArgument"],
    [
      "unreadable HandoffConfirmation",
      () =>
        api.finalize_generated_profile(
          store,
          store,
          store,
          new Proxy({ status: "confirmed" }, { get() { throw new Error("unreadable"); } }),
        ),
      "BindingFailure",
    ],
    ["null ExportRequest", () => api.export_mnemonic(store, null, store), "BindingFailure"],
    ["primitive ExportRequest", () => api.export_mnemonic(store, 1, store), "BindingFailure"],
    ["missing ExportRequest field", () => api.export_mnemonic(store, {}, store), "InvalidArgument"],
    [
      "null nested ExportTarget",
      () => api.export_mnemonic(store, { ...exportRequest, target: null }, store),
      "BindingFailure",
    ],
    [
      "primitive nested ExportUserRequest",
      () => api.export_mnemonic(store, { ...exportRequest, user_request: 1 }, store),
      "BindingFailure",
    ],
    [
      "null nested ExportApplicationConfirmation",
      () => api.export_mnemonic(store, { ...exportRequest, application_confirmation: null }, store),
      "BindingFailure",
    ],
    [
      "missing ExportApplicationConfirmation field",
      () => api.export_mnemonic(store, { ...exportRequest, application_confirmation: {} }, store),
      "InvalidArgument",
    ],
    [
      "unknown ExportApplicationConfirmation.status",
      () =>
        api.export_mnemonic(
          store,
          { ...exportRequest, application_confirmation: { target, status: "future" } },
          store,
        ),
      "InvalidArgument",
    ],
    [
      "unknown ExportUserRequest.status",
      () =>
        api.export_mnemonic(
          store,
          { ...exportRequest, user_request: { target, status: "future" } },
          store,
        ),
      "InvalidArgument",
    ],
    [
      "malformed nested ExportTarget UUID",
      () =>
        api.export_mnemonic(
          store,
          { ...exportRequest, target: { ...target, profile_id: "not-a-uuid" } },
          store,
        ),
      "InvalidArgument",
    ],
    ["null AccountContext", () => api.get_public_account(store, profileId, keyId, null, store), "BindingFailure"],
    ["primitive AccountContext", () => api.get_public_account(store, profileId, keyId, 1, store), "BindingFailure"],
    ["missing AccountContext field", () => api.get_public_account(store, profileId, keyId, {}, store), "InvalidArgument"],
    [
      "unknown AccountContext literal",
      () => api.get_public_account(store, profileId, keyId, { chain: "future", network: "testnet" }, store),
      "InvalidArgument",
    ],
    [
      "numeric AccountContext field",
      () => api.get_public_account(store, profileId, keyId, { chain: 0, network: "testnet" }, store),
      "BindingFailure",
    ],
    ["null SigningRequest", () => api.sign(store, null, store), "BindingFailure"],
    ["primitive SigningRequest", () => api.sign(store, 1, store), "BindingFailure"],
    ["missing SigningRequest field", () => api.sign(store, {}, store), "InvalidArgument"],
    [
      "null nested SigningTarget",
      () => api.sign(store, { ...signingRequest, target: null }, store),
      "BindingFailure",
    ],
    [
      "missing nested SigningTarget.context",
      () =>
        api.sign(
          store,
          { ...signingRequest, target: { profile_id: profileId, key_id: keyId } },
          store,
        ),
      "InvalidArgument",
    ],
    [
      "null nested SigningTarget.context",
      () => api.sign(store, { ...signingRequest, target: { ...signingTarget, context: null } }, store),
      "BindingFailure",
    ],
    [
      "malformed nested SigningTarget UUID",
      () => api.sign(store, { ...signingRequest, target: { ...signingTarget, key_id: "bad" } }, store),
      "InvalidArgument",
    ],
    ["missing SigningRequest.approval", () => api.sign(store, { target: signingTarget, payload: new Uint8Array() }, store), "InvalidArgument"],
    [
      "null nested SigningApproval",
      () => api.sign(store, { ...signingRequest, approval: null }, store),
      "BindingFailure",
    ],
    ["missing SigningApproval.status", () => api.sign(store, { ...signingRequest, approval: {} }, store), "InvalidArgument"],
    [
      "unknown SigningApproval.status",
      () => api.sign(store, { ...signingRequest, approval: { status: "future" } }, store),
      "InvalidArgument",
    ],
    ["missing SigningRequest.payload", () => api.sign(store, { target: signingTarget, approval: signingApproval }, store), "InvalidArgument"],
    [
      "wrong SigningRequest.payload type",
      () => api.sign(store, { ...signingRequest, payload: new Uint16Array([1]) }, store),
      "BindingFailure",
    ],
    ["numeric Network out of range", () => api.prepare_generated_profile(store, store, 2), "InvalidArgument"],
    ["non-finite Network", () => api.prepare_generated_profile(store, store, Number.NaN), "InvalidArgument"],
    ["fractional Network", () => api.prepare_generated_profile(store, store, 0.5), "InvalidArgument"],
    ["wrong Network type", () => api.prepare_generated_profile(store, store, "0"), "BindingFailure"],
    ["numeric Chain out of range", () => api.derive_software_key(store, profileId, store, 2, 0), "InvalidArgument"],
    ["wrong Chain type", () => api.derive_software_key(store, profileId, store, "0", 0), "BindingFailure"],
    ["wrong AccountIndex type", () => api.derive_software_key(store, profileId, store, 0, "0"), "BindingFailure"],
    ["null AccountIndex", () => api.derive_software_key(store, profileId, store, 0, null), "BindingFailure"],
    ["NaN AccountIndex", () => api.derive_software_key(store, profileId, store, 0, Number.NaN), "InvalidAccountIndex"],
    ["Infinity AccountIndex", () => api.derive_software_key(store, profileId, store, 0, Number.POSITIVE_INFINITY), "InvalidAccountIndex"],
    ["fractional AccountIndex", () => api.derive_software_key(store, profileId, store, 0, 0.5), "InvalidAccountIndex"],
    ["negative AccountIndex", () => api.derive_software_key(store, profileId, store, 0, -1), "InvalidAccountIndex"],
    ["overflow AccountIndex", () => api.derive_software_key(store, profileId, store, 0, 2_147_483_648), "InvalidAccountIndex"],
  ];
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

test("native and direct WASM entries expose the same malformed DTO error shape", () => {
  const casesByBackend = [facade, wasmFacade].map((api) => malformedRepresentationCases(api));
  assert.equal(casesByBackend[0].length, casesByBackend[1].length);
  for (let index = 0; index < casesByBackend[0].length; index += 1) {
    const [name, nativeCall, expectedCode] = casesByBackend[0][index];
    const [wasmName, wasmCall, wasmCode] = casesByBackend[1][index];
    assert.equal(wasmName, name);
    assert.equal(wasmCode, expectedCode);
    const nativeShape = errorShape(nativeCall);
    const wasmShape = errorShape(wasmCall);
    assert.deepEqual(nativeShape, {
      name: "WalletCoreError",
      code: expectedCode,
      message: expectedCode,
    }, name);
    assert.deepEqual(wasmShape, nativeShape, name);
  }
});

test("facade forwards validated DTO objects without rewriting or defaulting fields", () => {
  const profileId = "11111111-1111-4111-8111-111111111111";
  const keyId = "22222222-2222-4222-8222-222222222222";
  const target = { kind: "software_key", profile_id: profileId, key_id: keyId };
  const exportRequest = {
    target,
    user_request: { target, status: "requested" },
    application_confirmation: { target, status: "confirmed" },
  };
  const context = { chain: "nem", network: "testnet" };
  const signingRequest = {
    target: { profile_id: profileId, key_id: keyId, context },
    payload: new Uint8Array([1, 2]),
    approval: { status: "approved" },
  };
  const captured = {};
  const backend = Object.fromEntries(expectedExports.map((name) => [name, () => new Uint8Array()]));
  backend.finalize_generated_profile = (...args) => {
    captured.finalize = args;
    return {
      store: new Uint8Array(),
      value: { profile_id: profileId, network: "testnet", software_key_count: 0 },
      warnings: [],
    };
  };
  backend.export_mnemonic = (...args) => {
    captured.export = args;
    return { value: { mnemonic_utf8: new Uint8Array() }, warnings: [] };
  };
  backend.get_public_account = (...args) => {
    captured.account = args;
    return {
      value: {
        key_id: keyId,
        chain: "nem",
        network: "testnet",
        public_key: new Uint8Array(32),
        address: "TALICE-ADDRESS",
      },
      warnings: [],
    };
  };
  backend.sign = (...args) => {
    captured.sign = args;
    return { value: { signature: new Uint8Array(64) }, warnings: [] };
  };

  const api = createFacade(backend);
  const store = new Uint8Array();
  const handoff = { status: "confirmed" };
  api.finalize_generated_profile(store, store, store, handoff);
  api.export_mnemonic(store, exportRequest, store);
  api.get_public_account(store, profileId, keyId, context, store);
  api.sign(store, signingRequest, store);

  assert.equal(captured.finalize[3], handoff);
  assert.equal(captured.export[1], exportRequest);
  assert.equal(captured.account[3], context);
  assert.equal(captured.sign[1], signingRequest);
  assert.deepEqual(captured.sign[1].payload, signingRequest.payload);
});

test(
  "a valid manifest entry with an unreadable artifact fails closed",
  { skip: currentNativeArtifact === null || !existsSync(currentNativeArtifact) },
  () => {
  const { directory, copy } = makePackageCopy();
  try {
    const manifest = JSON.parse(
      readFileSync(resolve(copy, "dist/native/artifact-manifest.json"), "utf8"),
    );
    const entry = manifest.artifacts.find((artifact) => artifact.target_id === currentTargetId);
    assert.ok(entry);
    rmSync(resolve(copy, entry.relative_path));
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
  },
);

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

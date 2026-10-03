import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  cpSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

test("過大MnemonicとUnicode正規化の結果がnativeとWASMで一致する", () => {
  const password = new TextEncoder().encode("mnemonic boundary fixture");
  for (const api of [facade, wasmFacade]) {
    const store = api.create_empty_store();
    for (const source of ["a".repeat(1_000_000), "\u0301".repeat(1_000_000)]) {
      assert.throws(() => api.restore_profile(store, new TextEncoder().encode(source), password, 1),
        error => error.name === "WalletCoreError" && error.code === "InvalidMnemonic");
    }
    const prepared = api.prepare_generated_profile(store, password, 1);
    const canonical = prepared.value.mnemonic_utf8.slice();
    const normalized = new TextDecoder().decode(canonical).replace(/[a-z]/g,
      letter => String.fromCharCode(letter.charCodeAt(0) + 0xfee0));
    const imported = api.restore_profile(store, new TextEncoder().encode(`\u2003${normalized}\u3000`), password, 1);
    const id = imported.value.profile_id;
    const target = { kind: "mnemonic", profile_id: id };
    const exported = api.export_mnemonic(imported.store, {
      target, user_request: { target, status: "requested" },
      application_confirmation: { target, status: "confirmed" },
    }, password);
    assert.ok(exported.value.mnemonic_utf8 instanceof Uint8Array);
    assert.ok(exported.value.mnemonic_utf8.length === canonical.length &&
      exported.value.mnemonic_utf8.every((byte, index) => byte === canonical[index]));
    exported.value.mnemonic_utf8.fill(0);
    assert.ok(prepared.value.mnemonic_utf8.length === canonical.length &&
      prepared.value.mnemonic_utf8.every((byte, index) => byte === canonical[index]));
    prepared.value.mnemonic_utf8.fill(0);
    canonical.fill(0);
  }
});
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
  const directory = mkdtempSync(resolve(tmpdir(), "snwc-node-output-"));
  const output = resolve(directory, "stdout");
  const outputDescriptor = openSync(output, "w");
  try {
    execFileSync(process.execPath, args, {
      cwd,
      stdio: ["ignore", outputDescriptor, outputDescriptor],
    });
    return readFileSync(output, "utf8").trim();
  } finally {
    closeSync(outputDescriptor);
    rmSync(directory, { recursive: true, force: true });
  }
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
          new Proxy({ status: "confirmed" }, {
            getOwnPropertyDescriptor() { throw new Error("unreadable"); },
          }),
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

test("root ESM exportが16個の同期operationだけで構成される", () => {
  assert.deepEqual(sorted(Object.keys(facade)), sorted(expectedExports));
  assert.equal("default" in facade, false);
  assert.equal("WalletCoreError" in facade, false);
  assert.equal(facade.create_empty_store() instanceof Uint8Array, true);
  assert.equal(facade.list_profiles(facade.create_empty_store()).value.length, 0);
  assert.equal(facade.list_profiles(facade.create_empty_store()).warnings.length, 0);
});

test("Node nativeとdirect WASMのoperationがCore errorを同じ形式へ正規化する", () => {
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

test("Node CJSと--no-addons WASM entryが同じroot APIを公開する", () => {
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

test("--no-addonsのWASM digest mismatchはESM/CJS共通でgeneric errorにして停止する", () => {
  const { directory, copy } = makePackageCopy();
  try {
    const wasmPath = resolve(copy, "dist/wasm/symbol_nem_wallet_core_wasm_bg.wasm");
    const bytes = readFileSync(wasmPath);
    bytes[0] ^= 0xff;
    writeFileSync(wasmPath, bytes);
    const check = `const show=(error)=>console.log(JSON.stringify({name:error?.name,message:error?.message,code:error?.code}));\n`;
    const esm = runNode([
      "--no-addons",
      "--input-type=module",
      "-e",
      `${check}try { await import(${JSON.stringify(packageName)}); process.exit(2); } catch (error) { show(error); }`,
    ], copy);
    const cjs = runNode([
      "--no-addons",
      "-e",
      `${check}try { require(${JSON.stringify(packageName)}); process.exit(2); } catch (error) { show(error); }`,
    ], copy);
    const expected = JSON.stringify({
      name: "WalletCoreBackendInitializationError",
      message: "backend initialization failed",
    });
    assert.equal(esm, expected);
    assert.equal(cjs, expected);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("facadeがrepresentation、unitのnull、UUID error、Core errorを正規化する", () => {
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

test("nativeとdirect WASM entryが不正DTOに同じerror形式を返す", () => {
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

test("facadeはDTOをown data propertyからsnapshotして転送する", () => {
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
    captured.sign = [args[0], {
      target: {
        profile_id: args[1].target.profile_id,
        key_id: args[1].target.key_id,
        context: { ...args[1].target.context },
      },
      payload: args[1].payload.slice(),
      approval: { ...args[1].approval },
    }, args[2]];
    return { value: { signature: new Uint8Array(64) }, warnings: [] };
  };

  const api = createFacade(backend);
  const store = new Uint8Array();
  const handoff = { status: "confirmed" };
  api.finalize_generated_profile(store, store, store, handoff);
  api.export_mnemonic(store, exportRequest, store);
  api.get_public_account(store, profileId, keyId, context, store);
  api.sign(store, signingRequest, store);

  assert.notEqual(captured.finalize[3], handoff);
  assert.equal(Object.getPrototypeOf(captured.finalize[3]), null);
  assert.equal(captured.finalize[3].status, "confirmed");
  assert.notEqual(captured.export[1], exportRequest);
  assert.notEqual(captured.export[1].target, target);
  assert.equal(Object.getPrototypeOf(captured.export[1]), null);
  assert.notEqual(captured.account[3], context);
  assert.equal(Object.getPrototypeOf(captured.account[3]), null);
  assert.notEqual(captured.sign[1], signingRequest);
  assert.notEqual(captured.sign[1].target.context, context);
  assert.deepEqual(captured.sign[1].payload, new Uint8Array([1, 2]));
  assert.deepEqual(signingRequest.payload, new Uint8Array([1, 2]));
});

test("DTO snapshotは継承field、getter、prototype pollutionを承認条件にしない", () => {
  const profileId = "11111111-1111-4111-8111-111111111111";
  const keyId = "22222222-2222-4222-8222-222222222222";
  let backendCalls = 0;
  const backend = Object.fromEntries(expectedExports.map((name) => [name, () => {
    backendCalls += 1;
    return { store: new Uint8Array(), value: null, warnings: [] };
  }]));
  backend.finalize_generated_profile = () => {
    backendCalls += 1;
    return {
      store: new Uint8Array(),
      value: { profile_id: profileId, network: "testnet", software_key_count: 0 },
      warnings: [],
    };
  };
  backend.sign = () => {
    backendCalls += 1;
    return { value: { signature: new Uint8Array(64) }, warnings: [] };
  };
  const api = createFacade(backend);
  const store = new Uint8Array();
  assert.throws(
    () => api.finalize_generated_profile(store, store, store, Object.create({ status: "confirmed" })),
    (error) => error.code === "InvalidArgument",
  );
  let getterReads = 0;
  const getterConfirmation = Object.defineProperty({}, "status", {
    enumerable: true,
    get() { getterReads += 1; return getterReads === 1 ? "confirmed" : "unconfirmed"; },
  });
  assert.throws(
    () => api.finalize_generated_profile(store, store, store, getterConfirmation),
    (error) => error.code === "InvalidArgument",
  );
  assert.equal(getterReads, 0);

  const polluted = Object.getOwnPropertyDescriptor(Object.prototype, "status");
  try {
    Object.defineProperty(Object.prototype, "status", {
      configurable: true,
      value: "approved",
    });
    const request = {
      target: { profile_id: profileId, key_id: keyId, context: { chain: "nem", network: "testnet" } },
      payload: new Uint8Array([1]),
      approval: {},
    };
    assert.throws(() => api.sign(store, request, store), (error) => error.code === "InvalidArgument");
  } finally {
    if (polluted === undefined) delete Object.prototype.status;
    else Object.defineProperty(Object.prototype, "status", polluted);
  }
  assert.equal(backendCalls, 0);
});

test("backendはvalidation後のcaller mutationではなくnested snapshotとpayload copyを見る", () => {
  const profileId = "11111111-1111-4111-8111-111111111111";
  const keyId = "22222222-2222-4222-8222-222222222222";
  const payloadBacking = new Uint8Array([9, 1, 2, 8]);
  const payloadView = payloadBacking.subarray(1, 3);
  const request = {
    target: { profile_id: profileId, key_id: keyId, context: { chain: "nem", network: "testnet" } },
    payload: payloadView,
    approval: { status: "approved" },
  };
  let observed;
  const backend = Object.fromEntries(expectedExports.map((name) => [name, () => new Uint8Array()]));
  backend.sign = (_store, snapshot) => {
    request.target.context.chain = "symbol";
    request.target.context.network = "mainnet";
    request.approval.status = "not_approved";
    payloadBacking.fill(7);
    observed = {
      target: {
        profile_id: snapshot.target.profile_id,
        key_id: snapshot.target.key_id,
        context: { ...snapshot.target.context },
      },
      approval: { ...snapshot.approval },
      payload: snapshot.payload.slice(),
    };
    return { value: { signature: new Uint8Array(64) }, warnings: [] };
  };
  createFacade(backend).sign(new Uint8Array(), request, new Uint8Array());
  assert.deepEqual(observed.target.context, { chain: "nem", network: "testnet" });
  assert.deepEqual(observed.approval, { status: "approved" });
  assert.deepEqual(observed.payload, new Uint8Array([1, 2]));
  assert.deepEqual(payloadBacking, new Uint8Array([7, 7, 7, 7]));
});

test("SigningRequest snapshot途中のapproval failureでfacade payload copyを消去する", () => {
  const profileId = "11111111-1111-4111-8111-111111111111";
  const keyId = "22222222-2222-4222-8222-222222222222";
  const OriginalUint8Array = globalThis.Uint8Array;
  const backend = Object.fromEntries(expectedExports.map((name) => [name, () => new OriginalUint8Array()]));
  let backendCalls = 0;
  backend.sign = () => {
    backendCalls += 1;
    return { value: { signature: new OriginalUint8Array(64) }, warnings: [] };
  };
  const api = createFacade(backend);
  const failures = [
    ["missing", undefined, "InvalidArgument"],
    ["invalid literal", { status: "approved-later" }, "InvalidArgument"],
    ["accessor", Object.defineProperty({}, "status", { get() { throw new Error("getter invoked"); } }), "InvalidArgument"],
    [
      "descriptor trap",
      new Proxy({}, {
        getOwnPropertyDescriptor(target, name) {
          if (name === "status") throw new Error("descriptor trap");
          return Reflect.getOwnPropertyDescriptor(target, name);
        },
      }),
      "BindingFailure",
    ],
  ];

  for (const [label, approval, expectedCode] of failures) {
    const copies = [];
    globalThis.Uint8Array = class TrackingUint8Array extends OriginalUint8Array {
      constructor(...args) {
        super(...args);
        if (args.length === 1 && typeof args[0] === "number") copies.push(this);
      }
    };
    const payloadBacking = new globalThis.Uint8Array([9, 1, 2, 8]);
    const payloadView = payloadBacking.subarray(1, 3);
    const request = {
      target: {
        profile_id: profileId,
        key_id: keyId,
        context: { chain: "nem", network: "testnet" },
      },
      payload: payloadView,
      ...(approval === undefined ? {} : { approval }),
    };
    try {
      assert.throws(
        () => api.sign(new OriginalUint8Array(), request, new OriginalUint8Array()),
        (error) => error.code === expectedCode,
        label,
      );
      assert.equal(copies.length, 1, `${label}: exactly one facade payload copy should be created`);
      assert.deepEqual([...copies[0]], [0, 0], `${label}: facade copy must be zeroized`);
      assert.deepEqual([...payloadBacking], [9, 1, 2, 8], `${label}: caller bytes must remain untouched`);
      assert.equal(backendCalls, 0, `${label}: backend must not be reached`);
    } finally {
      globalThis.Uint8Array = OriginalUint8Array;
    }
  }
});

test(
  "manifest entryが有効でもartifactを読めない場合はfail-closedで終了する",
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

test(
  "読み込み可能なnative artifactのmanifest digestが不一致なら、WASMへfallbackせずfail-closedで終了する",
  { skip: currentNativeArtifact === null || !existsSync(currentNativeArtifact) },
  () => {
    const { directory, copy } = makePackageCopy();
    try {
      const manifestPath = resolve(copy, "dist/native/artifact-manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const entry = manifest.artifacts.find((artifact) => artifact.target_id === currentTargetId);
      assert.ok(entry);

      const runNative = (syntax) => {
        const args = syntax === "esm"
          ? [
              "--input-type=module",
              "-e",
              `import(${JSON.stringify(packageName)}).then((m)=>console.log(JSON.stringify({isBytes:m.create_empty_store() instanceof Uint8Array})))`,
            ]
          : [
              "-e",
              `const m=require(${JSON.stringify(packageName)}); console.log(JSON.stringify({isBytes:m.create_empty_store() instanceof Uint8Array}));`,
            ];
        return JSON.parse(runNode(args, copy));
      };

      for (const syntax of ["esm", "cjs"]) {
        assert.deepEqual(runNative(syntax), { isBytes: true }, syntax);
      }

      entry.sha256 = `${entry.sha256[0] === "0" ? "1" : "0"}${entry.sha256.slice(1)}`;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      for (const syntax of ["esm", "cjs"]) {
        const args = syntax === "esm"
          ? [
              "--input-type=module",
              "-e",
              `import(${JSON.stringify(packageName)}).then(()=>process.exit(2)).catch((error)=>console.log(JSON.stringify({name:error.name,message:error.message,code:error.code})))`,
            ]
          : [
              "-e",
              `try { require(${JSON.stringify(packageName)}); process.exitCode=2; } catch (error) { console.log(JSON.stringify({name:error.name,message:error.message,code:error.code})); }`,
            ];
        assert.deepEqual(JSON.parse(runNode(args, copy)), {
          name: "WalletCoreBackendInitializationError",
          message: "backend initialization failed",
        }, syntax);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test("manifestが有効でも現在のtargetがない場合、package内WASMへfallbackする", () => {
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

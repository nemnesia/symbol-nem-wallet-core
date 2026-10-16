import assert from "node:assert/strict";
import test from "node:test";
import { createFacade } from "../packages/wallet-core/src/facade-runtime.mjs";

const operationNames = [
  "create_empty_store", "prepare_generated_profile", "finalize_generated_profile",
  "restore_profile", "list_profiles", "export_mnemonic", "export_private_key",
  "list_software_keys", "derive_software_key", "import_software_key",
  "generate_software_key", "get_public_account", "sign", "change_profile_password",
  "delete_software_key", "delete_profile",
];
const profileId = "00000000-0000-0000-0000-000000000001";
const keyId = "00000000-0000-0000-0000-000000000002";
function exportRequest(kind) {
  const target = { kind, profile_id: profileId };
  if (kind === "software_key") target.key_id = keyId;
  return {
    target,
    user_request: { target, status: "requested" },
    application_confirmation: { target, status: "confirmed" },
  };
}
function apiFor(operation, result) {
  const backend = Object.fromEntries(operationNames.map((name) => [name, () => {}]));
  backend[operation] = () => result;
  return createFacade(backend);
}
const cases = [
  { operation: "prepare_generated_profile", fields: [["mnemonic_utf8", 48], ["pending_profile", 64]],
    call: (api, store, password) => api.prepare_generated_profile(store, password, 0) },
  { operation: "export_mnemonic", fields: [["mnemonic_utf8", 48]],
    call: (api, store, password) => api.export_mnemonic(store, exportRequest("mnemonic"), password) },
  { operation: "export_private_key", fields: [["private_key", 32]],
    call: (api, store, password) => api.export_private_key(store, exportRequest("software_key"), password) },
];
for (const scenario of cases) {
  test(`${scenario.operation}: consume backend secrets while preserving caller output and inputs`, () => {
    const sources = Object.fromEntries(scenario.fields.map(([name, length]) => [name, new Uint8Array(length).fill(0x5a)]));
    // cleanup must use the intrinsic rather than an output object's own fill method.
    for (const source of Object.values(sources)) source.fill = () => { throw new Error("synthetic failure"); };
    const store = new Uint8Array([2, 3]);
    const password = new Uint8Array([4, 5]);
    const result = scenario.call(apiFor(scenario.operation, { value: sources, warnings: [] }), store, password);
    for (const [name, length] of scenario.fields) {
      assert.notEqual(result.value[name], sources[name]);
      assert.deepEqual(result.value[name], new Uint8Array(length).fill(0x5a));
      assert.ok(sources[name].every((byte) => byte === 0));
      result.value[name].fill(0);
    }
    assert.deepEqual(store, new Uint8Array([2, 3]));
    assert.deepEqual(password, new Uint8Array([4, 5]));
  });
  test(`${scenario.operation}: conversion failure clears backend secrets`, () => {
    const sources = Object.fromEntries(scenario.fields.map(([name, length]) => [name, new Uint8Array(length).fill(0x5a)]));
    assert.throws(() => scenario.call(apiFor(scenario.operation, { value: sources, warnings: null }), new Uint8Array(), new Uint8Array([1])),
      (error) => error.code === "BindingFailure");
    for (const source of Object.values(sources)) assert.ok(source.every((byte) => byte === 0));
  });
}
test("handoff partial conversion failure clears both source and unpublished copy", () => {
  const mnemonic = new Uint8Array(48).fill(0x5a);
  const from = Uint8Array.from;
  const copies = [];
  Uint8Array.from = function (...args) {
    const result = from.apply(this, args);
    copies.push(result);
    return result;
  };
  try {
    const api = apiFor("prepare_generated_profile", { value: { mnemonic_utf8: mnemonic, pending_profile: null }, warnings: [] });
    assert.throws(() => api.prepare_generated_profile(new Uint8Array(), new Uint8Array([1]), 0),
      (error) => error.code === "BindingFailure");
    assert.equal(copies.length, 1);
    assert.ok(copies[0].every((byte) => byte === 0));
    assert.ok(mnemonic.every((byte) => byte === 0));
  } finally {
    Uint8Array.from = from;
  }
});
test("invalid private key output length is rejected and cleared", () => {
  const source = new Uint8Array(31).fill(0x5a);
  const api = apiFor("export_private_key", { value: { private_key: source }, warnings: [] });
  assert.throws(() => api.export_private_key(new Uint8Array(), exportRequest("software_key"), new Uint8Array([1])),
    (error) => error.code === "BindingFailure");
  assert.ok(source.every((byte) => byte === 0));
});

test("export status validation preserves each assertion's own literals and snapshots once", () => {
  for (const [field, accepted] of [
    ["user_request", ["not_requested", "requested"]],
    ["application_confirmation", ["not_confirmed", "confirmed"]],
  ]) {
    for (const status of ["not_requested", "requested", "not_confirmed", "confirmed", "approved", "future", undefined, 0, null]) {
      const request = exportRequest("mnemonic");
      request[field].status = status;
      let calls = 0;
      const descriptorReads = [];
      request[field] = new Proxy(request[field], {
        getOwnPropertyDescriptor(target, name) {
          descriptorReads.push(name);
          return Reflect.getOwnPropertyDescriptor(target, name);
        },
        get() { throw new Error("caller property read"); },
      });
      const backend = Object.fromEntries(operationNames.map((name) => [name, () => {}]));
      backend.export_mnemonic = (_store, snapshot) => {
        calls += 1;
        assert.equal(Object.getPrototypeOf(snapshot[field]), null);
        assert.equal(snapshot[field].status, status);
        return { value: { mnemonic_utf8: new Uint8Array() }, warnings: [] };
      };
      const call = () => createFacade(backend).export_mnemonic(new Uint8Array(), request, new Uint8Array());
      if (accepted.includes(status)) call();
      else assert.throws(call, error => error.code === (status === 0 || status === null ? "BindingFailure" : "InvalidArgument"));
      assert.equal(calls, accepted.includes(status) ? 1 : 0);
      assert.deepEqual(descriptorReads, ["target", "status"]);
    }
  }
});

test("numeric boundary validation rejects invalid values before backend invocation", () => {
  let calls = 0;
  const backend = Object.fromEntries(operationNames.map(name => [name, () => {
    calls += 1;
    throw "CryptoFailure";
  }]));
  const api = createFacade(backend);
  const bytes = new Uint8Array();
  for (const value of [NaN, Infinity, -Infinity, -1, 0.5, 2, Number.MAX_VALUE]) {
    assert.throws(() => api.prepare_generated_profile(bytes, bytes, value), error => error.code === "InvalidArgument");
    assert.throws(() => api.derive_software_key(bytes, profileId, bytes, value, 0), error => error.code === "InvalidArgument");
  }
  for (const value of [NaN, Infinity, -Infinity, -1, 0.5, 2_147_483_648]) {
    assert.throws(() => api.derive_software_key(bytes, profileId, bytes, 0, value), error => error.code === "InvalidAccountIndex");
  }
  for (const value of [undefined, null, "0", 0n, {}]) {
    assert.throws(() => api.prepare_generated_profile(bytes, bytes, value), error => error.code === "BindingFailure");
    assert.throws(() => api.derive_software_key(bytes, profileId, bytes, 0, value), error => error.code === "BindingFailure");
  }
  assert.equal(calls, 0);
  // Valid endpoints must still reach Core, whose error remains unchanged.
  for (const value of [0, -0, 1]) {
    assert.throws(() => api.prepare_generated_profile(bytes, bytes, value), error => error.code === "CryptoFailure");
  }
  for (const value of [0, 2_147_483_647]) {
    assert.throws(() => api.derive_software_key(bytes, profileId, bytes, 1, value), error => error.code === "CryptoFailure");
  }
  assert.equal(calls, 5);
});

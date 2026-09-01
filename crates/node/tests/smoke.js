"use strict";

const assert = require("node:assert/strict");

const addonPath = process.argv[2];
assert.ok(addonPath, "an addon path is required");
const addon = require(addonPath);

const OPERATION_NAMES = [
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

assert.deepEqual(Object.keys(addon).sort(), [...OPERATION_NAMES].sort());
assert.ok(Number(process.versions.napi) >= 8);

const MNEMONIC = Buffer.from(
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
  "utf8",
);
const PASSWORD = Buffer.from("correct horse battery staple", "utf8");
const NEW_PASSWORD = Buffer.from("new correct horse battery staple", "utf8");
const NEM_PRIVATE_KEY = Uint8Array.from([
  0x57, 0x5d, 0xbb, 0x30, 0x62, 0x26, 0x7e, 0xff, 0x57, 0xc9, 0x70, 0xa3,
  0x36, 0xeb, 0xbc, 0x8f, 0xbc, 0xfe, 0x12, 0xc5, 0xbd, 0x3e, 0xd7, 0xbc,
  0x11, 0xeb, 0x04, 0x81, 0xd7, 0x70, 0x4c, 0xed,
]);

function expectCode(code, callback) {
  assert.throws(callback, (error) => {
    assert.equal(error.message, code);
    return true;
  });
}

function expectBinaryRejected(callback) {
  assert.throws(callback, (error) => {
    assert.match(error.message, /(?:Uint8Array|TypedArray)/);
    return true;
  });
}

function exportTarget(profileId, keyId) {
  return {
    kind: keyId === undefined ? "mnemonic" : "software_key",
    profile_id: profileId,
    ...(keyId === undefined ? {} : { key_id: keyId }),
  };
}

function exportRequest(profileId, keyId, status = "requested") {
  const target = exportTarget(profileId, keyId);
  return {
    target,
    user_request: { target: { ...target }, status },
    application_confirmation: {
      target: { ...target },
      status: "confirmed",
    },
  };
}

let emptyStore = addon.create_empty_store();
assert.ok(emptyStore instanceof Uint8Array);
const emptyStoreSnapshot = Uint8Array.from(emptyStore);

// Node Buffer is accepted through the same Uint8Array-compatible N-API boundary.
const emptyList = addon.list_profiles(Buffer.from(emptyStore));
assert.deepEqual(emptyList.value, []);
assert.deepEqual(emptyList.warnings, []);

// The input is copied for Core; mutating the caller-owned value afterwards cannot mutate output.
const inputCopyProbe = Buffer.from(emptyStore);
const inputCopyResult = addon.list_profiles(inputCopyProbe);
inputCopyProbe.fill(0);
assert.deepEqual(inputCopyResult.value, []);

const prepared = addon.prepare_generated_profile(emptyStore, PASSWORD, 1);
assert.ok(prepared.value.mnemonic_utf8 instanceof Uint8Array);
assert.ok(prepared.value.pending_profile instanceof Uint8Array);
expectCode("InvalidArgument", () =>
  addon.finalize_generated_profile(
    emptyStore,
    prepared.value.pending_profile,
    PASSWORD,
    { status: "unconfirmed" },
  ),
);
const finalized = addon.finalize_generated_profile(
  emptyStore,
  prepared.value.pending_profile,
  PASSWORD,
  { status: "confirmed" },
);
assert.equal(finalized.value.network, "mainnet");
assert.notDeepEqual(Uint8Array.from(finalized.store), emptyStoreSnapshot);

const restored = addon.restore_profile(emptyStore, MNEMONIC, PASSWORD, 1);
let store = restored.store;
const profileId = restored.value.profile_id;
assert.equal(restored.value.network, "mainnet");
assert.equal(addon.list_profiles(store).value.length, 1);
assert.deepEqual(addon.list_profiles(emptyStore).value, []);

const derived = addon.derive_software_key(store, profileId, PASSWORD, 1, 0);
store = derived.store;
const symbolKeyId = derived.value.key_id;
assert.equal(derived.value.chain, "symbol");
assert.equal(derived.value.origin.kind, "derived");
assert.equal(derived.value.origin.account_index, 0);

const imported = addon.import_software_key(
  store,
  profileId,
  PASSWORD,
  0,
  NEM_PRIVATE_KEY,
);
store = imported.store;
assert.equal(imported.value.chain, "nem");
const nemKeyId = imported.value.key_id;

const generated = addon.generate_software_key(store, profileId, PASSWORD, 0);
store = generated.store;
const generatedKeyId = generated.value.key_id;
assert.equal(generated.value.origin.kind, "generated");

const keys = addon.list_software_keys(store, profileId);
assert.equal(keys.value.length, 3);
assert.deepEqual(
  keys.value.map((item) => item.chain).sort(),
  ["nem", "nem", "symbol"],
);

const publicAccount = addon.get_public_account(
  store,
  profileId,
  symbolKeyId,
  { chain: "symbol", network: "mainnet" },
  PASSWORD,
);
assert.equal(publicAccount.value.chain, "symbol");
assert.equal(publicAccount.value.network, "mainnet");
assert.equal(publicAccount.value.public_key.length, 32);

const signed = addon.sign(
  store,
  {
    target: {
      profile_id: profileId,
      key_id: symbolKeyId,
      context: { chain: "symbol", network: "mainnet" },
    },
    payload: Buffer.from([1, 2, 3, 4]),
    approval: { status: "approved" },
  },
  PASSWORD,
);
assert.equal(signed.value.signature.length, 64);

const mnemonicExport = addon.export_mnemonic(
  store,
  exportRequest(profileId),
  PASSWORD,
);
assert.deepEqual(
  Array.from(mnemonicExport.value.mnemonic_utf8),
  Array.from(MNEMONIC),
);

const privateKeyExport = addon.export_private_key(
  store,
  exportRequest(profileId, symbolKeyId),
  PASSWORD,
);
assert.equal(privateKeyExport.value.private_key.length, 32);

const changed = addon.change_profile_password(
  store,
  profileId,
  PASSWORD,
  NEW_PASSWORD,
);
assert.equal(changed.value, null);
store = changed.store;
// list_software_keys is intentionally unauthenticated; the old password is only checked below.
assert.equal(addon.export_mnemonic(store, exportRequest(profileId), NEW_PASSWORD).value.mnemonic_utf8.length > 0, true);

expectCode("AuthenticationFailed", () =>
  addon.export_mnemonic(store, exportRequest(profileId), PASSWORD),
);
expectCode("InvalidArgument", () =>
  addon.export_mnemonic(store, exportRequest(profileId, undefined, "not_requested"), NEW_PASSWORD),
);
expectCode("NetworkMismatch", () =>
  addon.get_public_account(
    store,
    profileId,
    symbolKeyId,
    { chain: "symbol", network: "testnet" },
    NEW_PASSWORD,
  ),
);
expectCode("InvalidArgument", () =>
  addon.generate_software_key(store, profileId, NEW_PASSWORD, 2),
);
expectCode("InvalidArgument", () => addon.list_software_keys(store, "not-a-uuid"));
expectCode("InvalidArgument", () =>
  addon.sign(
    store,
    {
      target: {
        profile_id: profileId,
        key_id: symbolKeyId,
        context: { chain: "symbol", network: "mainnet" },
      },
      payload: Uint8Array.from([1]),
      approval: { status: "not_approved" },
    },
    NEW_PASSWORD,
  ),
);

const afterDeleteKey = addon.delete_software_key(
  store,
  profileId,
  generatedKeyId,
  NEW_PASSWORD,
);
assert.equal(afterDeleteKey.value, null);
store = afterDeleteKey.store;
assert.equal(addon.list_software_keys(store, profileId).value.length, 2);

// A failed mutation throws before returning any replacement Store.
expectCode("AuthenticationFailed", () =>
  addon.delete_profile(store, profileId, PASSWORD),
);
const deleted = addon.delete_profile(store, profileId, NEW_PASSWORD);
assert.equal(deleted.value, null);
assert.deepEqual(addon.list_profiles(deleted.store).value, []);

// Invalid representations are rejected by N-API type inspection, before Core input promotion.
expectBinaryRejected(() => addon.list_profiles(new Uint16Array([0])));
expectBinaryRejected(() => addon.list_profiles(new Proxy(new Uint8Array(emptyStore), {})));

// Store size is checked from the typed-array length before the Rust copy/allocation.
expectCode("InvalidStore", () =>
  addon.list_profiles(Buffer.alloc(16 * 1024 * 1024 + 1)),
);

// Detached typed arrays remain a failed input and are never promoted as Store bytes.
const detachedBuffer = new ArrayBuffer(1);
const detached = new Uint8Array(detachedBuffer);
structuredClone(detachedBuffer, { transfer: [detachedBuffer] });
assert.equal(detached.byteLength, 0);
assert.throws(() => addon.list_profiles(detached));

console.log(`Node-API v${process.versions.napi} addon smoke passed (${OPERATION_NAMES.length} operations)`);

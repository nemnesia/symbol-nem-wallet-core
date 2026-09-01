/*
 * Stage 8 contract parity scenarios.
 *
 * This module deliberately has no Node or browser imports so the exact same
 * operation sequence is executed by all consumer-facing runtime paths.
 * Secret fixtures are used only for private assertions and never enter the
 * returned canonical result.
 */

export const OPERATION_NAMES = [
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

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const MNEMONIC = new TextEncoder().encode(
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
);
const PASSWORD = new TextEncoder().encode("correct horse battery staple");
const WRONG_PASSWORD = new TextEncoder().encode("wrong password");
const NEW_PASSWORD = new TextEncoder().encode("new correct horse battery staple");
const NEM_ACCOUNT_PRIVATE_KEY = Uint8Array.from([
  0x57, 0x5d, 0xbb, 0x30, 0x62, 0x26, 0x7e, 0xff, 0x57, 0xc9, 0x70, 0xa3,
  0x36, 0xeb, 0xbc, 0x8f, 0xbc, 0xfe, 0x12, 0xc5, 0xbd, 0x3e, 0xd7, 0xbc,
  0x11, 0xeb, 0x04, 0x81, 0xd7, 0x70, 0x4c, 0xed,
]);
const NEM_SIGNATURE_PRIVATE_KEY = Uint8Array.from([
  0xab, 0xf4, 0xcf, 0x55, 0xa2, 0xb3, 0xf7, 0x42, 0xd7, 0x54, 0x3d, 0x9c,
  0xc1, 0x7f, 0x50, 0x44, 0x7b, 0x96, 0x9e, 0x6e, 0x06, 0xf5, 0xea, 0x91,
  0x95, 0xd4, 0x28, 0xab, 0x12, 0xb7, 0x31, 0x8d,
]);
const NEM_FIXTURE_PAYLOAD = Uint8Array.from([
  0x8c, 0xe0, 0x3c, 0xd6, 0x05, 0x14, 0x23, 0x3b, 0x86, 0x78, 0x97, 0x29,
  0x10, 0x2e, 0xa0, 0x9e, 0x86, 0x7f, 0xc6, 0xd9, 0x64, 0xde, 0xa8, 0xc2,
  0x01, 0x8e, 0xf7, 0xd0, 0xa2, 0xe0, 0xe2, 0x4b, 0xf7, 0xe3, 0x48, 0xe9,
  0x17, 0x11, 0x66, 0x90, 0xb9,
]);
const EXPECTED_SYMBOL_PUBLIC_KEY =
  "54ADC79E3BEE5D0EF899832172C3CCF29DC5F5F3BC0E0D5FD06E3E64D8DB51D2";
const EXPECTED_SYMBOL_ADDRESS = "NBPYVRSCYLIJH7VU6XNR7I3H7GBQOGHHAMLJC3A";
const EXPECTED_NEM_PUBLIC_KEY =
  "C5F54BA980FCBB657DBAAA42700539B207873E134D2375EFEAB5F1AB52F87844";
const EXPECTED_NEM_ADDRESS = "NDD2CT6LQLIYQ56KIXI3ENTM6EK3D44P5JFXJ4R4";
const EXPECTED_NEM_SIGNATURE =
  "D9CEC0CC0E3465FAB229F8E1D6DB68AB9CC99A18CB0435F70DEB6100948576CD5C0AA1FEB550BDD8693EF81EB10A556A622DB1F9301986827B96716A7134230C";

function fail(label) {
  throw new Error(`Stage 8 parity assertion failed: ${label}`);
}

function ensure(condition, label) {
  if (!condition) {
    fail(label);
  }
}

function sameBytes(left, right) {
  return (
    left instanceof Uint8Array &&
    right instanceof Uint8Array &&
    left.byteLength === right.byteLength &&
    left.every((value, index) => value === right[index])
  );
}

function cloneBytes(value, label) {
  ensure(value instanceof Uint8Array, `${label} is Uint8Array`);
  return Uint8Array.from(value);
}

function hex(value, label) {
  ensure(value instanceof Uint8Array, `${label} is Uint8Array`);
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function exactKeys(value, keys, label) {
  ensure(value !== null && typeof value === "object", `${label} is object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  ensure(
    actual.length === expected.length && actual.every((key, index) => key === expected[index]),
    `${label} keys`,
  );
}

function assertWarnings(value, label) {
  ensure(Array.isArray(value), `${label} warnings array`);
  for (const warning of value) {
    exactKeys(warning, ["code", "object_type", "object_id", "field"], `${label} warning`);
    ensure(typeof warning.code === "string", `${label} warning code`);
    ensure(typeof warning.object_type === "string", `${label} warning object_type`);
    ensure(warning.object_id === undefined || typeof warning.object_id === "string", `${label} warning object_id`);
    ensure(warning.field === undefined || typeof warning.field === "string", `${label} warning field`);
  }
  return value.map((warning) => ({
    code: warning.code,
    object_type: warning.object_type,
    object_id: warning.object_id,
    field: warning.field,
  }));
}

function assertProfileInfo(value, label) {
  exactKeys(value, ["profile_id", "network", "software_key_count"], label);
  ensure(typeof value.profile_id === "string" && UUID_PATTERN.test(value.profile_id), `${label} profile_id`);
  ensure(value.network === "mainnet" || value.network === "testnet", `${label} network`);
  ensure(Number.isInteger(value.software_key_count) && value.software_key_count >= 0, `${label} software_key_count`);
  return {
    network: value.network,
    software_key_count: value.software_key_count,
  };
}

function assertSoftwareKeyInfo(value, label) {
  exactKeys(value, ["key_id", "chain", "origin"], label);
  ensure(typeof value.key_id === "string" && UUID_PATTERN.test(value.key_id), `${label} key_id`);
  ensure(value.chain === "nem" || value.chain === "symbol", `${label} chain`);
  exactKeys(value.origin, ["kind", "account_index"], `${label} origin`);
  ensure(
    value.origin.kind === "derived" || value.origin.kind === "imported" || value.origin.kind === "generated",
    `${label} origin kind`,
  );
  if (value.origin.kind === "derived") {
    ensure(Number.isInteger(value.origin.account_index) && value.origin.account_index >= 0, `${label} origin index`);
  } else {
    ensure(value.origin.account_index === null, `${label} imported/generated origin index`);
  }
  return {
    chain: value.chain,
    origin: { kind: value.origin.kind, account_index: value.origin.account_index },
  };
}

function assertSoftwareKeyList(value, label) {
  ensure(Array.isArray(value), `${label} is array`);
  return value.map((item, index) => {
    exactKeys(item, ["key_id", "chain"], `${label}[${index}]`);
    ensure(typeof item.key_id === "string" && UUID_PATTERN.test(item.key_id), `${label}[${index}] key_id`);
    ensure(item.chain === "nem" || item.chain === "symbol", `${label}[${index}] chain`);
    return { chain: item.chain };
  });
}

function assertPublicAccount(value, label) {
  exactKeys(value, ["key_id", "chain", "network", "public_key", "address"], label);
  ensure(typeof value.key_id === "string" && UUID_PATTERN.test(value.key_id), `${label} key_id`);
  ensure(value.chain === "nem" || value.chain === "symbol", `${label} chain`);
  ensure(value.network === "mainnet" || value.network === "testnet", `${label} network`);
  ensure(value.public_key instanceof Uint8Array && value.public_key.byteLength === 32, `${label} public_key`);
  ensure(typeof value.address === "string", `${label} address`);
  return {
    chain: value.chain,
    network: value.network,
    public_key: hex(value.public_key, `${label} public_key`),
    address: value.address,
  };
}

function assertPreparedProfile(value, label) {
  exactKeys(value, ["mnemonic_utf8", "pending_profile"], label);
  ensure(value.mnemonic_utf8 instanceof Uint8Array && value.mnemonic_utf8.byteLength > 0, `${label} mnemonic`);
  ensure(value.pending_profile instanceof Uint8Array && value.pending_profile.byteLength > 0, `${label} pending`);
  return {
    mnemonic_is_bytes: true,
    pending_profile_is_bytes: true,
    pending_profile_nonempty: true,
  };
}

function assertMnemonicExport(value, label) {
  exactKeys(value, ["mnemonic_utf8"], label);
  ensure(value.mnemonic_utf8 instanceof Uint8Array, `${label} mnemonic bytes`);
  ensure(sameBytes(value.mnemonic_utf8, MNEMONIC), `${label} mnemonic fixture`);
  return { returned: true, is_bytes: true };
}

function assertPrivateKeyExport(value, label) {
  exactKeys(value, ["private_key"], label);
  ensure(value.private_key instanceof Uint8Array && value.private_key.byteLength === 32, `${label} private key bytes`);
  ensure(sameBytes(value.private_key, NEM_ACCOUNT_PRIVATE_KEY), `${label} private key fixture`);
  return { returned: true, is_bytes: true, byte_length: 32 };
}

function assertSignature(value, label) {
  exactKeys(value, ["signature"], label);
  ensure(value.signature instanceof Uint8Array && value.signature.byteLength === 64, `${label} signature bytes`);
  return { returned: true, is_bytes: true, byte_length: 64, bytes: hex(value.signature, `${label} signature`) };
}

function assertReadResult(value, valueAssertion, label) {
  exactKeys(value, ["value", "warnings"], label);
  const canonicalValue = valueAssertion(value.value, `${label}.value`);
  const warnings = assertWarnings(value.warnings, `${label}.warnings`);
  return { value: canonicalValue, warnings };
}

function assertMutationResult(value, valueAssertion, label, inputStore) {
  exactKeys(value, ["store", "value", "warnings"], label);
  ensure(value.store instanceof Uint8Array, `${label}.store bytes`);
  ensure(!sameBytes(value.store, inputStore), `${label}.store replacement`);
  const canonicalValue = valueAssertion(value.value, `${label}.value`);
  const warnings = assertWarnings(value.warnings, `${label}.warnings`);
  return { value: canonicalValue, warnings, returned_store: true, store_is_bytes: true };
}

function shape(error) {
  return {
    name: error?.name,
    code: error?.code,
    message: error?.message,
  };
}

function expectedError(api, label, expectedCode, operation) {
  try {
    operation();
  } catch (error) {
    const actual = shape(error);
    ensure(
      actual.name === "WalletCoreError" && actual.code === expectedCode && actual.message === expectedCode,
      `${label} error shape`,
    );
    ensure(!JSON.stringify(actual).includes("correct horse"), `${label} error secret exclusion`);
    return actual;
  }
  fail(`${label} unexpectedly succeeded`);
}

function request(target, userStatus = "requested", confirmationStatus = "confirmed") {
  return {
    target: { ...target },
    user_request: { target: { ...target }, status: userStatus },
    application_confirmation: { target: { ...target }, status: confirmationStatus },
  };
}

function signingRequest(profileId, keyId, chain = "nem", network = "mainnet", approval = "approved") {
  return {
    target: { profile_id: profileId, key_id: keyId, context: { chain, network } },
    payload: Uint8Array.from(NEM_FIXTURE_PAYLOAD),
    approval: { status: approval },
  };
}

function wrapSynchronous(api) {
  const wrapped = {};
  for (const name of OPERATION_NAMES) {
    ensure(typeof api[name] === "function", `missing operation ${name}`);
    wrapped[name] = (...args) => {
      const result = api[name](...args);
      ensure(result === null || typeof result !== "object" || typeof result.then !== "function", `${name} is synchronous`);
      return result;
    };
  }
  return wrapped;
}

function createFixture(api) {
  const emptyStore = api.create_empty_store();
  ensure(emptyStore instanceof Uint8Array, "empty store bytes");
  const emptySnapshot = cloneBytes(emptyStore, "empty store");
  const restored = api.restore_profile(emptyStore, MNEMONIC, PASSWORD, 1);
  const restoredShape = assertMutationResult(restored, assertProfileInfo, "restore", emptyStore);
  ensure(restored.value.software_key_count === 0, "restored profile starts empty");
  ensure(sameBytes(emptyStore, emptySnapshot), "restore leaves input store unchanged");

  const profileId = restored.value.profile_id;
  const derived = api.derive_software_key(restored.store, profileId, PASSWORD, 1, 0);
  assertMutationResult(derived, assertSoftwareKeyInfo, "fixture derive", restored.store);
  const symbolKeyId = derived.value.key_id;

  const imported = api.import_software_key(
    derived.store,
    profileId,
    PASSWORD,
    0,
    NEM_ACCOUNT_PRIVATE_KEY,
  );
  assertMutationResult(imported, assertSoftwareKeyInfo, "fixture import", derived.store);
  const nemAccountKeyId = imported.value.key_id;

  const signatureKey = api.import_software_key(
    imported.store,
    profileId,
    PASSWORD,
    0,
    NEM_SIGNATURE_PRIVATE_KEY,
  );
  assertMutationResult(signatureKey, assertSoftwareKeyInfo, "fixture signature import", imported.store);

  return {
    emptyStore,
    restoredStore: restored.store,
    profileId,
    symbolStore: derived.store,
    symbolKeyId,
    baseStore: signatureKey.store,
    nemAccountKeyId,
    signatureKeyId: signatureKey.value.key_id,
    restoredShape,
  };
}

function basicFlow(api, fixture) {
  const baseStoreSnapshot = cloneBytes(fixture.baseStore, "basic base store");
  const profiles = api.list_profiles(fixture.baseStore);
  const profileResult = assertReadResult(profiles, (value, label) => {
    ensure(Array.isArray(value) && value.length === 1, `${label} count`);
    return value.map((item, index) => assertProfileInfo(item, `${label}[${index}]`));
  }, "basic list profiles");

  const keys = api.list_software_keys(fixture.baseStore, fixture.profileId);
  const keyResult = assertReadResult(keys, (value, label) => {
    const items = assertSoftwareKeyList(value, label);
    ensure(items.length === 3, `${label} count`);
    items.sort((left, right) => left.chain.localeCompare(right.chain));
    return items;
  }, "basic list keys");

  const generated = api.generate_software_key(fixture.baseStore, fixture.profileId, PASSWORD, 0);
  const generatedResult = assertMutationResult(generated, assertSoftwareKeyInfo, "basic generate", fixture.baseStore);
  ensure(generated.value.origin.kind === "generated", "generated origin");

  const publicSymbol = api.get_public_account(
    fixture.baseStore,
    fixture.profileId,
    fixture.symbolKeyId,
    { chain: "symbol", network: "mainnet" },
    PASSWORD,
  );
  const publicSymbolResult = assertReadResult(publicSymbol, assertPublicAccount, "basic symbol account");
  ensure(publicSymbol.value.public_key instanceof Uint8Array, "symbol public key bytes");
  ensure(publicSymbolResult.value.public_key === EXPECTED_SYMBOL_PUBLIC_KEY, "symbol public key fixture");
  ensure(publicSymbolResult.value.address === EXPECTED_SYMBOL_ADDRESS, "symbol address fixture");

  const publicNem = api.get_public_account(
    fixture.baseStore,
    fixture.profileId,
    fixture.nemAccountKeyId,
    { chain: "nem", network: "mainnet" },
    PASSWORD,
  );
  const publicNemResult = assertReadResult(publicNem, assertPublicAccount, "basic NEM account");
  ensure(publicNemResult.value.public_key === EXPECTED_NEM_PUBLIC_KEY, "NEM public key fixture");
  ensure(publicNemResult.value.address === EXPECTED_NEM_ADDRESS, "NEM address fixture");

  const signed = api.sign(
    fixture.baseStore,
    signingRequest(fixture.profileId, fixture.signatureKeyId),
    PASSWORD,
  );
  const signatureResult = assertReadResult(signed, assertSignature, "basic signature");
  ensure(signatureResult.value.bytes === EXPECTED_NEM_SIGNATURE, "NEM signature fixture");

  const changed = api.change_profile_password(
    fixture.baseStore,
    fixture.profileId,
    PASSWORD,
    NEW_PASSWORD,
  );
  const changedResult = assertMutationResult(changed, (value, label) => {
    ensure(value === null, `${label} null`);
    return null;
  }, "basic password mutation", fixture.baseStore);
  const afterPassword = api.list_software_keys(changed.store, fixture.profileId);
  const afterPasswordResult = assertReadResult(afterPassword, (value, label) => {
    const items = assertSoftwareKeyList(value, label);
    ensure(items.length === 3, `${label} count`);
    items.sort((left, right) => left.chain.localeCompare(right.chain));
    return items;
  }, "basic list after password");

  const deletedGenerated = api.delete_software_key(
    generated.store,
    fixture.profileId,
    generated.value.key_id,
    PASSWORD,
  );
  const deletedGeneratedResult = assertMutationResult(deletedGenerated, (value, label) => {
    ensure(value === null, `${label} null`);
    return null;
  }, "basic delete generated", generated.store);
  const afterDelete = api.list_software_keys(deletedGenerated.store, fixture.profileId);
  const afterDeleteResult = assertReadResult(afterDelete, (value, label) => {
    const items = assertSoftwareKeyList(value, label);
    ensure(items.length === 3, `${label} count`);
    items.sort((left, right) => left.chain.localeCompare(right.chain));
    return items;
  }, "basic list after delete");

  return {
    restore: fixture.restoredShape.value,
    list_profiles: profileResult,
    list_software_keys: keyResult,
    generated: generatedResult,
    public_symbol: publicSymbolResult,
    public_nem: publicNemResult,
    signature: signatureResult,
    change_password: changedResult,
    after_password: afterPasswordResult,
    delete_generated: deletedGeneratedResult,
    after_delete: afterDeleteResult,
    previous_store_unchanged: sameBytes(fixture.baseStore, baseStoreSnapshot),
  };
}

function wrongPassword(api, fixture) {
  const cases = {};
  const exportMnemonicStore = cloneBytes(fixture.baseStore, "wrong export mnemonic store");
  cases.export_mnemonic = {
    error: expectedError(api, "wrong password export mnemonic", "AuthenticationFailed", () =>
      api.export_mnemonic(
        fixture.baseStore,
        request({ kind: "mnemonic", profile_id: fixture.profileId }),
        WRONG_PASSWORD,
      ),
    ),
    secret_returned: false,
    replacement_store_returned: false,
    input_store_unchanged: sameBytes(fixture.baseStore, exportMnemonicStore),
  };

  const exportPrivateStore = cloneBytes(fixture.baseStore, "wrong export private store");
  cases.export_private_key = {
    error: expectedError(api, "wrong password export private key", "AuthenticationFailed", () =>
      api.export_private_key(
        fixture.baseStore,
        request({ kind: "software_key", profile_id: fixture.profileId, key_id: fixture.nemAccountKeyId }),
        WRONG_PASSWORD,
      ),
    ),
    secret_returned: false,
    replacement_store_returned: false,
    input_store_unchanged: sameBytes(fixture.baseStore, exportPrivateStore),
  };

  const signStore = cloneBytes(fixture.baseStore, "wrong password sign store");
  cases.sign = {
    error: expectedError(api, "wrong password sign", "AuthenticationFailed", () =>
      api.sign(fixture.baseStore, signingRequest(fixture.profileId, fixture.signatureKeyId), WRONG_PASSWORD),
    ),
    signature_returned: false,
    replacement_store_returned: false,
    input_store_unchanged: sameBytes(fixture.baseStore, signStore),
  };

  const mutationStore = cloneBytes(fixture.baseStore, "wrong password mutation store");
  cases.mutation = {
    error: expectedError(api, "wrong password mutation", "AuthenticationFailed", () =>
      api.change_profile_password(fixture.baseStore, fixture.profileId, WRONG_PASSWORD, NEW_PASSWORD),
    ),
    replacement_store_returned: false,
    input_store_unchanged: sameBytes(fixture.baseStore, mutationStore),
  };
  return cases;
}

function storeCorruption(api) {
  const malformed = Uint8Array.from([0]);
  const truncated = Uint8Array.from([0xa4, 0x00, 0x44, 0x53, 0x4e, 0x57, 0x43, 0x01, 0x58, 0x20, ...new Array(31).fill(0)]);
  const deterministic = Uint8Array.from([0xa1, 0x00, 0x01]);
  return {
    malformed: { error: expectedError(api, "malformed store", "InvalidStore", () => api.list_profiles(malformed)) },
    truncated: { error: expectedError(api, "truncated store", "InvalidStore", () => api.list_profiles(truncated)) },
    deterministic: { error: expectedError(api, "deterministic corruption", "InvalidStore", () => api.list_profiles(deterministic)) },
  };
}

function confirmation(api) {
  const emptyStore = api.create_empty_store();
  const prepared = api.prepare_generated_profile(emptyStore, PASSWORD, 0);
  const preparedResult = assertReadResult(prepared, assertPreparedProfile, "confirmation prepare");
  const pending = prepared.value.pending_profile;
  const snapshot = cloneBytes(emptyStore, "confirmation empty store");

  const unconfirmed = expectedError(api, "unconfirmed handoff", "InvalidArgument", () =>
    api.finalize_generated_profile(emptyStore, pending, PASSWORD, { status: "unconfirmed" }),
  );
  const afterUnconfirmed = api.list_profiles(emptyStore);
  const afterUnconfirmedResult = assertReadResult(afterUnconfirmed, (value, label) => {
    ensure(Array.isArray(value) && value.length === 0, `${label} empty`);
    return [];
  }, "confirmation after unconfirmed");

  const confirmed = api.finalize_generated_profile(emptyStore, pending, PASSWORD, { status: "confirmed" });
  const confirmedResult = assertMutationResult(confirmed, assertProfileInfo, "confirmation confirmed", emptyStore);
  ensure(confirmed.value.network === "testnet", "confirmed network");
  ensure(confirmed.value.software_key_count === 0, "confirmed key count");
  const afterConfirmed = api.list_profiles(confirmed.store);
  const afterConfirmedResult = assertReadResult(afterConfirmed, (value, label) => {
    ensure(Array.isArray(value) && value.length === 1, `${label} count`);
    return value.map((item, index) => assertProfileInfo(item, `${label}[${index}]`));
  }, "confirmation after confirmed");

  return {
    prepared: preparedResult,
    unconfirmed: {
      error: unconfirmed,
      profile_committed: false,
      replacement_store_returned: false,
      input_store_unchanged: sameBytes(emptyStore, snapshot),
      after: afterUnconfirmedResult,
    },
    confirmed: {
      success: true,
      profile_committed: true,
      replacement_store_returned: confirmedResult.returned_store,
      result: confirmedResult.value,
      after: afterConfirmedResult,
    },
  };
}

function exportGuards(api, fixture) {
  const mnemonicTarget = { kind: "mnemonic", profile_id: fixture.profileId };
  const privateTarget = { kind: "software_key", profile_id: fixture.profileId, key_id: fixture.nemAccountKeyId };
  const wrongProfileId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const cases = {};

  for (const [operation, target, assertSecret] of [
    ["export_mnemonic", mnemonicTarget, assertMnemonicExport],
    ["export_private_key", privateTarget, assertPrivateKeyExport],
  ]) {
    const call = (value) =>
      operation === "export_mnemonic"
        ? api.export_mnemonic(fixture.baseStore, value, PASSWORD)
        : api.export_private_key(fixture.baseStore, value, PASSWORD);
    const valid = request(target);
    const userNotRequested = request(target, "not_requested", "confirmed");
    const applicationNotConfirmed = request(target, "requested", "not_confirmed");
    const targetMismatch = request(target);
    targetMismatch.application_confirmation.target.profile_id = wrongProfileId;

    const validResult = assertReadResult(call(valid), assertSecret, `${operation} valid`);
    cases[operation] = {
      user_request_missing: {
        error: expectedError(api, `${operation} user request`, "InvalidArgument", () => call(userNotRequested)),
        secret_returned: false,
        replacement_store_returned: false,
      },
      application_confirmation_missing: {
        error: expectedError(api, `${operation} application confirmation`, "InvalidArgument", () => call(applicationNotConfirmed)),
        secret_returned: false,
        replacement_store_returned: false,
      },
      target_mismatch: {
        error: expectedError(api, `${operation} target mismatch`, "InvalidArgument", () => call(targetMismatch)),
        secret_returned: false,
        replacement_store_returned: false,
      },
      valid: { ...validResult, replacement_store_returned: false },
    };
  }
  return cases;
}

function signingApproval(api, fixture) {
  const notApproved = expectedError(api, "signing not approved", "InvalidArgument", () =>
    api.sign(fixture.baseStore, signingRequest(fixture.profileId, fixture.signatureKeyId, "nem", "mainnet", "not_approved"), PASSWORD),
  );
  const wrongTarget = expectedError(api, "signing target mismatch", "SoftwareKeyNotFound", () =>
    api.sign(fixture.baseStore, signingRequest(fixture.profileId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), PASSWORD),
  );
  const approved = api.sign(
    fixture.baseStore,
    signingRequest(fixture.profileId, fixture.signatureKeyId, "nem", "mainnet", "approved"),
    PASSWORD,
  );
  const approvedResult = assertReadResult(approved, assertSignature, "signing approved");
  ensure(approvedResult.value.bytes === EXPECTED_NEM_SIGNATURE, "approved signature fixture");
  return {
    not_approved: {
      error: notApproved,
      signature_returned: false,
      replacement_store_returned: false,
    },
    approved: { success: true, signature_returned: true },
    target_mismatch: {
      error: wrongTarget,
      signature_returned: false,
      replacement_store_returned: false,
    },
    valid_signing: approvedResult,
  };
}

function chainNetworkMismatch(api, fixture) {
  const profileNetworkGet = expectedError(api, "profile network mismatch get", "NetworkMismatch", () =>
    api.get_public_account(
      fixture.baseStore,
      fixture.profileId,
      fixture.symbolKeyId,
      { chain: "symbol", network: "testnet" },
      PASSWORD,
    ),
  );
  const profileNetworkSign = expectedError(api, "profile network mismatch sign", "NetworkMismatch", () =>
    api.sign(fixture.baseStore, signingRequest(fixture.profileId, fixture.symbolKeyId, "symbol", "testnet"), PASSWORD),
  );
  const fixedChainGet = expectedError(api, "fixed chain mismatch get", "NetworkMismatch", () =>
    api.get_public_account(
      fixture.baseStore,
      fixture.profileId,
      fixture.nemAccountKeyId,
      { chain: "symbol", network: "mainnet" },
      PASSWORD,
    ),
  );
  const fixedChainSign = expectedError(api, "fixed chain mismatch sign", "NetworkMismatch", () =>
    api.sign(fixture.baseStore, signingRequest(fixture.profileId, fixture.nemAccountKeyId, "symbol", "mainnet"), PASSWORD),
  );
  return {
    profile_network: { get_public_account: profileNetworkGet, sign: profileNetworkSign },
    software_key_chain: { get_public_account: fixedChainGet, sign: fixedChainSign },
  };
}

function mutationReplacement(api, fixture) {
  const mutationInput = cloneBytes(fixture.restoredStore, "mutation input");
  const successful = api.derive_software_key(fixture.restoredStore, fixture.profileId, PASSWORD, 1, 1);
  const successfulResult = assertMutationResult(successful, assertSoftwareKeyInfo, "mutation success", fixture.restoredStore);
  const next = api.list_software_keys(successful.store, fixture.profileId);
  const nextResult = assertReadResult(next, (value, label) => {
    const items = assertSoftwareKeyList(value, label);
    return items.sort((left, right) => left.chain.localeCompare(right.chain));
  }, "mutation next state");
  const failedInput = cloneBytes(fixture.restoredStore, "mutation failed input");
  const failed = expectedError(api, "mutation wrong password", "AuthenticationFailed", () =>
    api.change_profile_password(fixture.restoredStore, fixture.profileId, WRONG_PASSWORD, NEW_PASSWORD),
  );
  const deleted = api.delete_profile(fixture.restoredStore, fixture.profileId, PASSWORD);
  const deletedResult = assertMutationResult(deleted, (value, label) => {
    ensure(value === null, `${label} null`);
    return null;
  }, "mutation delete profile", fixture.restoredStore);
  const afterDelete = assertReadResult(
    api.list_profiles(deleted.store),
    (value, label) => {
      ensure(Array.isArray(value) && value.length === 0, `${label} empty`);
      return [];
    },
    "mutation deleted state",
  );
  return {
    success: {
      result: successfulResult,
      next_state: nextResult,
      previous_store_unchanged: sameBytes(fixture.restoredStore, mutationInput),
    },
    failure: {
      error: failed,
      replacement_store_returned: false,
      input_store_unchanged: sameBytes(fixture.restoredStore, failedInput),
    },
    delete_profile: { result: deletedResult, next_state: afterDelete },
  };
}

export function runParityScenarios(backend) {
  const exportedNames = Object.keys(backend).sort();
  const expectedNames = [...OPERATION_NAMES].sort();
  ensure(
    exportedNames.length === expectedNames.length &&
      exportedNames.every((name, index) => name === expectedNames[index]),
    "runtime exports",
  );
  ensure(!Object.prototype.hasOwnProperty.call(backend, "default"), "default export");
  const api = wrapSynchronous(backend);
  const fixture = createFixture(api);
  const basic = basicFlow(api, fixture);
  const wrongPasswordResult = wrongPassword(api, fixture);
  const corruption = storeCorruption(api);
  const handoff = confirmation(api);
  const guards = exportGuards(api, fixture);
  const approval = signingApproval(api, fixture);
  const mismatch = chainNetworkMismatch(api, fixture);
  const mutation = mutationReplacement(api, fixture);

  return {
    operation_count: OPERATION_NAMES.length,
    basic,
    wrong_password: wrongPasswordResult,
    store_corruption: corruption,
    handoff_confirmation: handoff,
    export_guard: guards,
    signing_approval: approval,
    chain_network_mismatch: mismatch,
    mutation_replacement: mutation,
    secret_return_condition: {
      mnemonic: { valid_authorization_and_guards: true, failure_returned: false },
      private_key: { valid_authorization_and_guards: true, failure_returned: false },
      signature: { approved_and_authorized: true, failure_returned: false },
      pending_profile: {
        prepare_success_returned: handoff.prepared.value.pending_profile_is_bytes,
        unconfirmed_finalize_returned: false,
      },
    },
  };
}

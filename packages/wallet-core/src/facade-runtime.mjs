const CORE_ERROR_CODES = new Set([
  "InvalidArgument",
  "InvalidStore",
  "UnsupportedStoreVersion",
  "UnsupportedProfileSchemaVersion",
  "ProfileNotFound",
  "SoftwareKeyNotFound",
  "AuthenticationFailed",
  "InvalidMnemonic",
  "InvalidPrivateKey",
  "DuplicateProfile",
  "DuplicateSoftwareKey",
  "InvalidAccountIndex",
  "NetworkMismatch",
  "CryptoFailure",
  "RandomSourceFailure",
  "SerializationFailure",
  "PendingProfileInvalid",
  "BindingFailure",
]);

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const fillBytes = Function.prototype.call.bind(Uint8Array.prototype.fill);
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const typedArrayBuffer = getOwnPropertyDescriptor(typedArrayPrototype, "buffer").get;
const typedArrayByteOffset = getOwnPropertyDescriptor(typedArrayPrototype, "byteOffset").get;
const typedArrayByteLength = getOwnPropertyDescriptor(typedArrayPrototype, "byteLength").get;
const typedArraySet = Function.prototype.call.bind(Uint8Array.prototype.set);

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

class WalletCoreError extends Error {
  constructor(code) {
    super(code);
    this.name = "WalletCoreError";
    this.code = code;
    this.message = code;
  }
}

function walletError(code) {
  return new WalletCoreError(code);
}

function bindingFailure() {
  return walletError("BindingFailure");
}

function invalidArgument() {
  throw walletError("InvalidArgument");
}

function invalidAccountIndex() {
  throw walletError("InvalidAccountIndex");
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function property(value, name) {
  if (!isObject(value)) {
    throw bindingFailure();
  }
  try {
    return value[name];
  } catch {
    throw bindingFailure();
  }
}

function dtoField(value, name, required = true) {
  if (!isObject(value)) {
    throw bindingFailure();
  }
  let descriptor;
  try {
    descriptor = getOwnPropertyDescriptor(value, name);
  } catch {
    throw bindingFailure();
  }
  if (descriptor === undefined) {
    if (required) invalidArgument();
    return undefined;
  }
  if (!hasOwnProperty(descriptor, "value")) {
    invalidArgument();
  }
  if (required && descriptor.value === undefined) {
    invalidArgument();
  }
  return descriptor.value;
}

function dtoObject() {
  return Object.create(null);
}

function dtoFieldString(value, name) {
  const field = dtoField(value, name);
  if (typeof field !== "string") {
    throw bindingFailure();
  }
  return field;
}

function snapshotUint8Array(value) {
  if (!(value instanceof Uint8Array)) {
    throw bindingFailure();
  }
  try {
    const buffer = Reflect.apply(typedArrayBuffer, value, []);
    const byteOffset = Reflect.apply(typedArrayByteOffset, value, []);
    const byteLength = Reflect.apply(typedArrayByteLength, value, []);
    const source = new Uint8Array(buffer, byteOffset, byteLength);
    const snapshot = new Uint8Array(byteLength);
    typedArraySet(snapshot, source);
    return snapshot;
  } catch {
    throw bindingFailure();
  }
}

function requiredObject(value) {
  if (!isObject(value)) {
    throw bindingFailure();
  }
  return value;
}

function requiredString(value) {
  if (typeof value !== "string") {
    throw bindingFailure();
  }
  return value;
}

function requiredNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw bindingFailure();
  }
  return value;
}

function outputBytes(value, length) {
  if (!(value instanceof Uint8Array)) {
    throw bindingFailure();
  }
  if (length !== undefined && value.byteLength !== length) {
    throw bindingFailure();
  }
  try {
    return Uint8Array.from(value);
  } catch {
    throw bindingFailure();
  }
}

function outputNetwork(value) {
  if (value !== "testnet" && value !== "mainnet") {
    throw bindingFailure();
  }
  return value;
}

function outputChain(value) {
  if (value !== "nem" && value !== "symbol") {
    throw bindingFailure();
  }
  return value;
}

function outputWarnings(value) {
  if (!Array.isArray(value)) {
    throw bindingFailure();
  }
  return value.map((warning) => {
    requiredObject(warning);
    const code = requiredString(property(warning, "code"));
    const objectType = requiredString(property(warning, "object_type"));
    const objectId = property(warning, "object_id");
    const field = property(warning, "field");
    if (objectId !== undefined && typeof objectId !== "string") {
      throw bindingFailure();
    }
    if (field !== undefined && typeof field !== "string") {
      throw bindingFailure();
    }
    return {
      code,
      object_type: objectType,
      object_id: objectId,
      field,
    };
  });
}

function outputProfileInfo(value) {
  requiredObject(value);
  const profileId = requiredString(property(value, "profile_id"));
  const network = outputNetwork(property(value, "network"));
  const count = requiredNumber(property(value, "software_key_count"));
  if (!Number.isInteger(count) || count < 0) {
    throw bindingFailure();
  }
  return { profile_id: profileId, network, software_key_count: count };
}

function outputSoftwareKeyOrigin(value) {
  requiredObject(value);
  const kind = requiredString(property(value, "kind"));
  const accountIndex = property(value, "account_index");
  if (kind === "derived") {
    const index = requiredNumber(accountIndex);
    if (!Number.isInteger(index) || index < 0 || index > 2_147_483_647) {
      throw bindingFailure();
    }
    return { kind, account_index: index };
  }
  if (kind === "imported" || kind === "generated") {
    if (accountIndex !== null && accountIndex !== undefined) {
      throw bindingFailure();
    }
    return { kind, account_index: null };
  }
  throw bindingFailure();
}

function outputSoftwareKeyInfo(value) {
  requiredObject(value);
  return {
    key_id: requiredString(property(value, "key_id")),
    chain: outputChain(property(value, "chain")),
    origin: outputSoftwareKeyOrigin(property(value, "origin")),
  };
}

function outputSoftwareKeyListItem(value) {
  requiredObject(value);
  return {
    key_id: requiredString(property(value, "key_id")),
    chain: outputChain(property(value, "chain")),
  };
}

function outputPublicAccount(value) {
  requiredObject(value);
  return {
    key_id: requiredString(property(value, "key_id")),
    chain: outputChain(property(value, "chain")),
    network: outputNetwork(property(value, "network")),
    public_key: outputBytes(property(value, "public_key"), 32),
    address: requiredString(property(value, "address")),
  };
}

function clearSecretBytes(value) {
  if (value instanceof Uint8Array) {
    // backendの一時出力だけを消去する。caller-ownedの入力は変更しない。
    // own-propertyでfillが置き換えられていてもintrinsicを呼ぶ。
    try {
      fillBytes(value, 0);
    } catch {
      // detached buffer等のcleanup errorで安定した元のerrorを上書きしない。
    }
  }
}

function outputSecretReadResult(value, fields) {
  const sources = [];
  const copies = [];
  try {
    requiredObject(value);
    const secret = requiredObject(property(value, "value"));
    // 後続fieldやwarningsの変換が失敗しても、取得済みsecretをfinallyで消去する。
    for (const [name] of fields) {
      sources.push(property(secret, name));
    }
    const warnings = outputWarnings(property(value, "warnings"));
    const normalized = {};
    for (const [index, [name, length]] of fields.entries()) {
      const copy = outputBytes(sources[index], length);
      copies.push(copy);
      normalized[name] = copy;
    }
    return { value: normalized, warnings };
  } catch (error) {
    // 一部のfieldだけコピーした後の失敗では、公開されないコピーも消去する。
    for (const copy of copies) clearSecretBytes(copy);
    throw error;
  } finally {
    for (const source of sources) clearSecretBytes(source);
  }
}

function outputSignature(value) {
  requiredObject(value);
  return { signature: outputBytes(property(value, "signature"), 64) };
}

function outputReadResult(value, valueNormalizer) {
  requiredObject(value);
  return {
    value: valueNormalizer(property(value, "value")),
    warnings: outputWarnings(property(value, "warnings")),
  };
}

function outputMutationResult(value, valueNormalizer) {
  requiredObject(value);
  return {
    store: outputBytes(property(value, "store")),
    value: valueNormalizer(property(value, "value")),
    warnings: outputWarnings(property(value, "warnings")),
  };
}

function outputProfiles(value) {
  if (!Array.isArray(value)) {
    throw bindingFailure();
  }
  return value.map(outputProfileInfo);
}

function outputSoftwareKeys(value) {
  if (!Array.isArray(value)) {
    throw bindingFailure();
  }
  return value.map(outputSoftwareKeyListItem);
}

function outputNull(value) {
  if (value !== null) {
    throw bindingFailure();
  }
  return null;
}

function normalizeOperationError(error) {
  if (error instanceof WalletCoreError) {
    return error;
  }
  let candidates = [];
  if (typeof error === "string") {
    candidates = [error];
  } else if (isObject(error)) {
    try {
      candidates = [error.code, error.message].filter((value) => typeof value === "string");
    } catch {
      candidates = [];
    }
  }
  const candidate = candidates.find((value) => CORE_ERROR_CODES.has(value));
  return CORE_ERROR_CODES.has(candidate) ? walletError(candidate) : bindingFailure();
}

function validateUuidValue(value) {
  if (typeof value !== "string") {
    throw bindingFailure();
  }
  if (!UUID_PATTERN.test(value)) {
    invalidArgument();
  }
}

function validateDirectId(value) {
  validateUuidValue(value);
}

function snapshotHandoffConfirmation(value) {
  requiredObject(value);
  const status = dtoFieldString(value, "status");
  if (status !== "unconfirmed" && status !== "confirmed") invalidArgument();
  const snapshot = dtoObject();
  snapshot.status = status;
  return snapshot;
}

function snapshotExportTarget(value) {
  requiredObject(value);
  const kind = dtoFieldString(value, "kind");
  if (kind !== "mnemonic" && kind !== "software_key") invalidArgument();
  const profileId = dtoFieldString(value, "profile_id");
  validateUuidValue(profileId);
  const keyId = dtoField(value, "key_id", false);
  const snapshot = dtoObject();
  snapshot.kind = kind;
  snapshot.profile_id = profileId;
  if (kind === "mnemonic") {
    if (keyId !== undefined) {
      if (typeof keyId !== "string") throw bindingFailure();
      invalidArgument();
    }
    return snapshot;
  }
  if (keyId === undefined) invalidArgument();
  validateUuidValue(keyId);
  snapshot.key_id = keyId;
  return snapshot;
}

function snapshotExportUserRequest(value) {
  requiredObject(value);
  const target = snapshotExportTarget(dtoField(value, "target"));
  const status = dtoFieldString(value, "status");
  if (status !== "not_requested" && status !== "requested") invalidArgument();
  const snapshot = dtoObject();
  snapshot.target = target;
  snapshot.status = status;
  return snapshot;
}

function snapshotExportApplicationConfirmation(value) {
  requiredObject(value);
  const target = snapshotExportTarget(dtoField(value, "target"));
  const status = dtoFieldString(value, "status");
  if (status !== "not_confirmed" && status !== "confirmed") invalidArgument();
  const snapshot = dtoObject();
  snapshot.target = target;
  snapshot.status = status;
  return snapshot;
}

function snapshotExportRequest(value) {
  requiredObject(value);
  const target = snapshotExportTarget(dtoField(value, "target"));
  const userRequest = snapshotExportUserRequest(dtoField(value, "user_request"));
  const confirmation = snapshotExportApplicationConfirmation(
    dtoField(value, "application_confirmation"),
  );
  const snapshot = dtoObject();
  snapshot.target = target;
  snapshot.user_request = userRequest;
  snapshot.application_confirmation = confirmation;
  return snapshot;
}

function snapshotAccountContext(value) {
  requiredObject(value);
  const chain = dtoFieldString(value, "chain");
  const network = dtoFieldString(value, "network");
  if (chain !== "nem" && chain !== "symbol") invalidArgument();
  if (network !== "testnet" && network !== "mainnet") invalidArgument();
  const snapshot = dtoObject();
  snapshot.chain = chain;
  snapshot.network = network;
  return snapshot;
}

function snapshotSigningTarget(value) {
  requiredObject(value);
  const profileId = dtoFieldString(value, "profile_id");
  const keyId = dtoFieldString(value, "key_id");
  validateUuidValue(profileId);
  validateUuidValue(keyId);
  const context = snapshotAccountContext(dtoField(value, "context"));
  const snapshot = dtoObject();
  snapshot.profile_id = profileId;
  snapshot.key_id = keyId;
  snapshot.context = context;
  return snapshot;
}

function snapshotSigningApproval(value) {
  requiredObject(value);
  const status = dtoFieldString(value, "status");
  if (status !== "not_approved" && status !== "approved") invalidArgument();
  const snapshot = dtoObject();
  snapshot.status = status;
  return snapshot;
}

function snapshotSigningRequest(value) {
  requiredObject(value);
  const target = snapshotSigningTarget(dtoField(value, "target"));
  const payload = snapshotUint8Array(dtoField(value, "payload"));
  const approval = snapshotSigningApproval(dtoField(value, "approval"));
  const snapshot = dtoObject();
  snapshot.target = target;
  snapshot.payload = payload;
  snapshot.approval = approval;
  return snapshot;
}

function validateNetworkOrChain(value) {
  if (typeof value !== "number") {
    throw bindingFailure();
  }
  if (!Number.isFinite(value) || !Number.isInteger(value) || (value !== 0 && value !== 1)) {
    invalidArgument();
  }
}

function validateAccountIndex(value) {
  if (typeof value !== "number") {
    throw bindingFailure();
  }
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 2_147_483_647) {
    invalidAccountIndex();
  }
}

function invoke(backend, name, args, normalizer) {
  try {
    return normalizer(backend[name](...args));
  } catch (error) {
    throw normalizeOperationError(error);
  }
}

export function createFacade(backend) {
  if (!isObject(backend) || OPERATION_NAMES.some((name) => typeof backend[name] !== "function")) {
    throw new Error("backend operation set is incomplete");
  }

  return {
    create_empty_store: () => invoke(backend, "create_empty_store", [], (value) => outputBytes(value)),

    prepare_generated_profile: (store, passwordUtf8, network) => {
      validateNetworkOrChain(network);
      return invoke(
        backend,
        "prepare_generated_profile",
        [store, passwordUtf8, network],
        (value) => outputSecretReadResult(value, [["mnemonic_utf8"], ["pending_profile"]]),
      );
    },

    finalize_generated_profile: (store, pendingProfile, passwordUtf8, handoffConfirmation) => {
      const handoffSnapshot = snapshotHandoffConfirmation(handoffConfirmation);
      return invoke(
        backend,
        "finalize_generated_profile",
        [store, pendingProfile, passwordUtf8, handoffSnapshot],
        (value) => outputMutationResult(value, outputProfileInfo),
      );
    },

    restore_profile: (store, mnemonicUtf8, passwordUtf8, network) => {
      validateNetworkOrChain(network);
      return invoke(
        backend,
        "restore_profile",
        [store, mnemonicUtf8, passwordUtf8, network],
        (value) => outputMutationResult(value, outputProfileInfo),
      );
    },

    list_profiles: (store) =>
      invoke(backend, "list_profiles", [store], (value) => outputReadResult(value, outputProfiles)),

    export_mnemonic: (store, request, passwordUtf8) => {
      const requestSnapshot = snapshotExportRequest(request);
      return invoke(
        backend,
        "export_mnemonic",
        [store, requestSnapshot, passwordUtf8],
        (value) => outputSecretReadResult(value, [["mnemonic_utf8"]]),
      );
    },

    export_private_key: (store, request, passwordUtf8) => {
      const requestSnapshot = snapshotExportRequest(request);
      return invoke(
        backend,
        "export_private_key",
        [store, requestSnapshot, passwordUtf8],
        (value) => outputSecretReadResult(value, [["private_key", 32]]),
      );
    },

    list_software_keys: (store, profileId) => {
      validateDirectId(profileId);
      return invoke(
        backend,
        "list_software_keys",
        [store, profileId],
        (value) => outputReadResult(value, outputSoftwareKeys),
      );
    },

    derive_software_key: (store, profileId, passwordUtf8, chain, accountIndex) => {
      validateDirectId(profileId);
      validateNetworkOrChain(chain);
      validateAccountIndex(accountIndex);
      return invoke(
        backend,
        "derive_software_key",
        [store, profileId, passwordUtf8, chain, accountIndex],
        (value) => outputMutationResult(value, outputSoftwareKeyInfo),
      );
    },

    import_software_key: (store, profileId, passwordUtf8, chain, privateKey) => {
      validateDirectId(profileId);
      validateNetworkOrChain(chain);
      return invoke(
        backend,
        "import_software_key",
        [store, profileId, passwordUtf8, chain, privateKey],
        (value) => outputMutationResult(value, outputSoftwareKeyInfo),
      );
    },

    generate_software_key: (store, profileId, passwordUtf8, chain) => {
      validateDirectId(profileId);
      validateNetworkOrChain(chain);
      return invoke(
        backend,
        "generate_software_key",
        [store, profileId, passwordUtf8, chain],
        (value) => outputMutationResult(value, outputSoftwareKeyInfo),
      );
    },

    get_public_account: (store, profileId, keyId, requestedContext, passwordUtf8) => {
      validateDirectId(profileId);
      validateDirectId(keyId);
      const contextSnapshot = snapshotAccountContext(requestedContext);
      return invoke(
        backend,
        "get_public_account",
        [store, profileId, keyId, contextSnapshot, passwordUtf8],
        (value) => outputReadResult(value, outputPublicAccount),
      );
    },

    sign: (store, request, passwordUtf8) => {
      const requestSnapshot = snapshotSigningRequest(request);
      try {
        return invoke(
          backend,
          "sign",
          [store, requestSnapshot, passwordUtf8],
          (value) => outputReadResult(value, outputSignature),
        );
      } finally {
        clearSecretBytes(requestSnapshot.payload);
      }
    },

    change_profile_password: (store, profileId, currentPasswordUtf8, newPasswordUtf8) => {
      validateDirectId(profileId);
      return invoke(
        backend,
        "change_profile_password",
        [store, profileId, currentPasswordUtf8, newPasswordUtf8],
        (value) => outputMutationResult(value, outputNull),
      );
    },

    delete_software_key: (store, profileId, keyId, passwordUtf8) => {
      validateDirectId(profileId);
      validateDirectId(keyId);
      return invoke(
        backend,
        "delete_software_key",
        [store, profileId, keyId, passwordUtf8],
        (value) => outputMutationResult(value, outputNull),
      );
    },

    delete_profile: (store, profileId, passwordUtf8) => {
      validateDirectId(profileId);
      return invoke(
        backend,
        "delete_profile",
        [store, profileId, passwordUtf8],
        (value) => outputMutationResult(value, outputNull),
      );
    },
  };
}

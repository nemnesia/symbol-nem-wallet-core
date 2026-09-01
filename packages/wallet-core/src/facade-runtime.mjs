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

function isObject(value) {
  return (typeof value === "object" && value !== null) || typeof value === "function";
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

function outputPreparedProfile(value) {
  requiredObject(value);
  return {
    mnemonic_utf8: outputBytes(property(value, "mnemonic_utf8")),
    pending_profile: outputBytes(property(value, "pending_profile")),
  };
}

function outputMnemonicExport(value) {
  requiredObject(value);
  return { mnemonic_utf8: outputBytes(property(value, "mnemonic_utf8")) };
}

function outputPrivateKeyExport(value) {
  requiredObject(value);
  return { private_key: outputBytes(property(value, "private_key"), 32) };
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

function validateUuidString(value) {
  if (typeof value === "string" && !UUID_PATTERN.test(value)) {
    throw walletError("InvalidArgument");
  }
}

function validateDirectId(value) {
  validateUuidString(value);
}

function validateTargetIds(value) {
  if (!isObject(value)) {
    return;
  }
  validateUuidString(property(value, "profile_id"));
  validateUuidString(property(value, "key_id"));
}

function validateExportRequestIds(value) {
  if (!isObject(value)) {
    return;
  }
  validateTargetIds(property(value, "target"));
  const userRequest = property(value, "user_request");
  if (isObject(userRequest)) {
    validateTargetIds(property(userRequest, "target"));
  }
  const confirmation = property(value, "application_confirmation");
  if (isObject(confirmation)) {
    validateTargetIds(property(confirmation, "target"));
  }
}

function validateSigningRequestIds(value) {
  if (!isObject(value)) {
    return;
  }
  const target = property(value, "target");
  if (isObject(target)) {
    validateUuidString(property(target, "profile_id"));
    validateUuidString(property(target, "key_id"));
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

    prepare_generated_profile: (store, passwordUtf8, network) =>
      invoke(
        backend,
        "prepare_generated_profile",
        [store, passwordUtf8, network],
        (value) => outputReadResult(value, outputPreparedProfile),
      ),

    finalize_generated_profile: (store, pendingProfile, passwordUtf8, handoffConfirmation) =>
      invoke(
        backend,
        "finalize_generated_profile",
        [store, pendingProfile, passwordUtf8, handoffConfirmation],
        (value) => outputMutationResult(value, outputProfileInfo),
      ),

    restore_profile: (store, mnemonicUtf8, passwordUtf8, network) =>
      invoke(
        backend,
        "restore_profile",
        [store, mnemonicUtf8, passwordUtf8, network],
        (value) => outputMutationResult(value, outputProfileInfo),
      ),

    list_profiles: (store) =>
      invoke(backend, "list_profiles", [store], (value) => outputReadResult(value, outputProfiles)),

    export_mnemonic: (store, request, passwordUtf8) => {
      validateExportRequestIds(request);
      return invoke(
        backend,
        "export_mnemonic",
        [store, request, passwordUtf8],
        (value) => outputReadResult(value, outputMnemonicExport),
      );
    },

    export_private_key: (store, request, passwordUtf8) => {
      validateExportRequestIds(request);
      return invoke(
        backend,
        "export_private_key",
        [store, request, passwordUtf8],
        (value) => outputReadResult(value, outputPrivateKeyExport),
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
      return invoke(
        backend,
        "derive_software_key",
        [store, profileId, passwordUtf8, chain, accountIndex],
        (value) => outputMutationResult(value, outputSoftwareKeyInfo),
      );
    },

    import_software_key: (store, profileId, passwordUtf8, chain, privateKey) => {
      validateDirectId(profileId);
      return invoke(
        backend,
        "import_software_key",
        [store, profileId, passwordUtf8, chain, privateKey],
        (value) => outputMutationResult(value, outputSoftwareKeyInfo),
      );
    },

    generate_software_key: (store, profileId, passwordUtf8, chain) => {
      validateDirectId(profileId);
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
      return invoke(
        backend,
        "get_public_account",
        [store, profileId, keyId, requestedContext, passwordUtf8],
        (value) => outputReadResult(value, outputPublicAccount),
      );
    },

    sign: (store, request, passwordUtf8) => {
      validateSigningRequestIds(request);
      return invoke(
        backend,
        "sign",
        [store, request, passwordUtf8],
        (value) => outputReadResult(value, outputSignature),
      );
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

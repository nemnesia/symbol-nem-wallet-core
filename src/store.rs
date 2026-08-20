use uuid::Uuid;
use zeroize::Zeroize;

use crate::{
    cbor::{self, Value},
    crypto,
    error::{ErrorCode, WalletError, WalletResult},
    types::{
        Chain, DecodeWarning, MnemonicExport, MutationResult, Network, PreparedProfile,
        PrivateKeyExport, ProfileInfo, PublicAccountInfo, ReadResult, Signature, SoftwareKeyInfo,
        SoftwareKeyListItem, SoftwareKeyOrigin, WalletStoreBlob,
    },
};

const MAGIC: [u8; 4] = *b"SNWC";
const STORE_VERSION: u64 = 1;
const PROFILE_SCHEMA_VERSION: u64 = 1;
const KDF_ALGORITHM: u64 = 0;
const CIPHER_ALGORITHM: u64 = 0;
const PENDING_MAGIC: [u8; 8] = *b"SNWCPND1";
const PENDING_VERSION: u8 = 1;

#[derive(Clone)]
struct WalletStore {
    registry_key: [u8; 32],
    profiles: Vec<ProfileEnvelope>,
}

#[derive(Clone)]
struct ProfileEnvelope {
    profile_id: [u8; 16],
    network: Network,
    duplicate_tag: [u8; 32],
    kdf: KdfParams,
    cipher: Ciphertext,
    software_key_index: Vec<IndexEntry>,
}

#[derive(Clone)]
struct KdfParams {
    salt: [u8; 16],
}

#[derive(Clone)]
struct Ciphertext {
    nonce: [u8; 12],
    ciphertext: Vec<u8>,
    tag: [u8; 16],
}

#[derive(Clone)]
struct IndexEntry {
    key_id: [u8; 16],
    chain: Chain,
}

#[derive(Clone)]
struct KeyRecord {
    key_id: [u8; 16],
    chain: Chain,
    private_key: [u8; 32],
    origin: SoftwareKeyOrigin,
}

struct ProfilePayload {
    mnemonic_entropy: [u8; 32],
    software_keys: Vec<KeyRecord>,
}

impl Drop for ProfilePayload {
    fn drop(&mut self) {
        self.mnemonic_entropy.zeroize();
        for key in &mut self.software_keys {
            key.private_key.zeroize();
        }
    }
}

struct PendingDecoded {
    target_store_hash: [u8; 32],
    profile_id: [u8; 16],
    network: Network,
    salt: [u8; 16],
    nonce: [u8; 12],
    ciphertext: Vec<u8>,
    tag: [u8; 16],
}

impl Drop for PendingDecoded {
    fn drop(&mut self) {
        self.ciphertext.zeroize();
    }
}

/// Creates an empty v1 Wallet Store.
pub fn create_empty_store() -> WalletResult<WalletStoreBlob> {
    let store = WalletStore {
        registry_key: crypto::random()?,
        profiles: Vec::new(),
    };
    encode_store(&store)
}

/// Generates mnemonic material and returns an encrypted pending profile without mutating the Store.
pub fn prepare_generated_profile(
    store: &[u8],
    password_utf8: &[u8],
    network: Network,
) -> WalletResult<ReadResult<PreparedProfile>> {
    let (_, warnings) = decode_store(store)?;
    crypto::validate_password(password_utf8)?;
    let mut entropy = crypto::random::<32>()?;
    let mnemonic_utf8 = crypto::mnemonic_from_entropy(&entropy)?;
    let profile_id = crypto::random_uuid()?.into_bytes();
    let pending_profile = make_pending(store, &profile_id, network, &entropy, password_utf8)?;
    entropy.zeroize();
    Ok(ReadResult {
        value: PreparedProfile {
            mnemonic_utf8,
            pending_profile,
        },
        warnings,
    })
}

/// Authenticates and commits a pending generated profile atomically.
pub fn finalize_generated_profile(
    store: &[u8],
    pending_profile: &[u8],
    password_utf8: &[u8],
) -> WalletResult<MutationResult<ProfileInfo>> {
    crypto::validate_password(password_utf8)?;
    let (mut wallet, warnings) = decode_store(store)?;
    let pending = parse_pending(pending_profile)?;
    if pending.target_store_hash != crypto::sha256(store) {
        return Err(WalletError::new(ErrorCode::PendingProfileInvalid));
    }

    let mut pending_key = crypto::derive_encryption_key(password_utf8, &pending.salt)?;
    let aad = pending_aad(&pending);
    let mut entropy_bytes = crypto::decrypt(
        &pending_key,
        &pending.nonce,
        &pending.tag,
        &aad,
        &pending.ciphertext,
    )?;
    pending_key.zeroize();
    let entropy: [u8; 32] = entropy_bytes
        .as_slice()
        .try_into()
        .map_err(|_| WalletError::new(ErrorCode::PendingProfileInvalid))?;
    entropy_bytes.zeroize();

    let duplicate_tag = crypto::duplicate_tag(&wallet.registry_key, pending.network, &entropy);
    if wallet
        .profiles
        .iter()
        .any(|profile| profile.duplicate_tag == duplicate_tag)
    {
        return Err(WalletError::new(ErrorCode::DuplicateProfile));
    }
    if wallet
        .profiles
        .iter()
        .any(|profile| profile.profile_id == pending.profile_id)
    {
        return Err(WalletError::new(ErrorCode::InvalidStore));
    }

    let mut payload = ProfilePayload {
        mnemonic_entropy: entropy,
        software_keys: Vec::new(),
    };
    let profile = new_encrypted_profile(
        &wallet.registry_key,
        pending.profile_id,
        pending.network,
        duplicate_tag,
        &payload,
        password_utf8,
    )?;
    let info = profile_info(&profile);
    wallet.profiles.push(profile);
    payload.mnemonic_entropy.zeroize();
    Ok(MutationResult {
        store: encode_store(&wallet)?,
        value: info,
        warnings,
    })
}

/// Restores a profile from a validated BIP39 mnemonic and returns a replacement Store.
pub fn restore_profile(
    store: &[u8],
    mnemonic_utf8: &[u8],
    password_utf8: &[u8],
    network: Network,
) -> WalletResult<MutationResult<ProfileInfo>> {
    crypto::validate_password(password_utf8)?;
    let (mut wallet, warnings) = decode_store(store)?;
    let (entropy, _) = crypto::parse_mnemonic(mnemonic_utf8)?;
    let duplicate_tag = crypto::duplicate_tag(&wallet.registry_key, network, &entropy);
    if wallet
        .profiles
        .iter()
        .any(|profile| profile.duplicate_tag == duplicate_tag)
    {
        return Err(WalletError::new(ErrorCode::DuplicateProfile));
    }

    let profile_id = new_profile_id(&wallet)?;
    let mut payload = ProfilePayload {
        mnemonic_entropy: entropy,
        software_keys: Vec::new(),
    };
    let profile = new_encrypted_profile(
        &wallet.registry_key,
        profile_id,
        network,
        duplicate_tag,
        &payload,
        password_utf8,
    )?;
    let info = profile_info(&profile);
    wallet.profiles.push(profile);
    payload.mnemonic_entropy.zeroize();
    Ok(MutationResult {
        store: encode_store(&wallet)?,
        value: info,
        warnings,
    })
}

/// Lists profiles without decrypting profile payloads.
pub fn list_profiles(store: &[u8]) -> WalletResult<ReadResult<Vec<ProfileInfo>>> {
    let (wallet, warnings) = decode_store(store)?;
    Ok(ReadResult {
        value: wallet.profiles.iter().map(profile_info).collect(),
        warnings,
    })
}

/// Lists indexed Software Keys for an authenticated Store structure.
pub fn list_software_keys(
    store: &[u8],
    profile_id: Uuid,
) -> WalletResult<ReadResult<Vec<SoftwareKeyListItem>>> {
    let (wallet, warnings) = decode_store(store)?;
    let profile = find_profile(&wallet, &profile_id.into_bytes())?;
    Ok(ReadResult {
        value: profile
            .software_key_index
            .iter()
            .map(|entry| SoftwareKeyListItem {
                key_id: Uuid::from_bytes(entry.key_id),
                chain: entry.chain,
            })
            .collect(),
        warnings,
    })
}

/// Exports a profile mnemonic after password authentication.
pub fn export_mnemonic(
    store: &[u8],
    profile_id: Uuid,
    password_utf8: &[u8],
) -> WalletResult<ReadResult<MnemonicExport>> {
    let (wallet, mut warnings) = decode_store(store)?;
    let payload = authenticate_profile(
        &wallet,
        &profile_id.into_bytes(),
        password_utf8,
        &mut warnings,
    )?;
    let mnemonic_utf8 = crypto::mnemonic_from_entropy(&payload.mnemonic_entropy)?;
    Ok(ReadResult {
        value: MnemonicExport { mnemonic_utf8 },
        warnings,
    })
}

/// Exports a Software Key private key after password authentication.
pub fn export_private_key(
    store: &[u8],
    profile_id: Uuid,
    key_id: Uuid,
    password_utf8: &[u8],
) -> WalletResult<ReadResult<PrivateKeyExport>> {
    let (wallet, mut warnings) = decode_store(store)?;
    let payload = authenticate_profile(
        &wallet,
        &profile_id.into_bytes(),
        password_utf8,
        &mut warnings,
    )?;
    let key = payload
        .software_keys
        .iter()
        .find(|key| key.key_id == key_id.into_bytes())
        .ok_or_else(|| WalletError::new(ErrorCode::SoftwareKeyNotFound))?;
    Ok(ReadResult {
        value: PrivateKeyExport {
            private_key: key.private_key,
        },
        warnings,
    })
}

/// Derives and stores a chain-specific Software Key from the profile mnemonic.
pub fn derive_software_key(
    store: &[u8],
    profile_id: Uuid,
    password_utf8: &[u8],
    chain: Chain,
    account_index: u32,
) -> WalletResult<MutationResult<SoftwareKeyInfo>> {
    let (mut wallet, mut warnings) = decode_store(store)?;
    let profile_index = profile_index(&wallet, &profile_id.into_bytes())?;
    let payload = authenticate_profile(
        &wallet,
        &profile_id.into_bytes(),
        password_utf8,
        &mut warnings,
    )?;
    let private_key = crypto::derive_private_key(
        &payload.mnemonic_entropy,
        chain,
        wallet.profiles[profile_index].network,
        account_index,
    )?;
    ensure_not_duplicate(&payload, chain, &private_key)?;
    let key_id = new_key_id(&payload)?;
    let mut updated = payload;
    updated.software_keys.push(KeyRecord {
        key_id,
        chain,
        private_key,
        origin: SoftwareKeyOrigin::Derived { account_index },
    });
    let info = SoftwareKeyInfo {
        key_id: Uuid::from_bytes(key_id),
        chain,
        origin: SoftwareKeyOrigin::Derived { account_index },
    };
    reencrypt_profile(&mut wallet, profile_index, &updated, password_utf8, false)?;
    Ok(MutationResult {
        store: encode_store(&wallet)?,
        value: info,
        warnings,
    })
}

/// Validates and stores an imported chain-specific private key.
pub fn import_software_key(
    store: &[u8],
    profile_id: Uuid,
    password_utf8: &[u8],
    chain: Chain,
    private_key: &[u8],
) -> WalletResult<MutationResult<SoftwareKeyInfo>> {
    let (mut wallet, mut warnings) = decode_store(store)?;
    let profile_index = profile_index(&wallet, &profile_id.into_bytes())?;
    let payload = authenticate_profile(
        &wallet,
        &profile_id.into_bytes(),
        password_utf8,
        &mut warnings,
    )?;
    let private_key = crypto::validate_private_key(chain, private_key)?;
    ensure_not_duplicate(&payload, chain, &private_key)?;
    let key_id = new_key_id(&payload)?;
    let mut updated = payload;
    updated.software_keys.push(KeyRecord {
        key_id,
        chain,
        private_key,
        origin: SoftwareKeyOrigin::Imported,
    });
    let info = SoftwareKeyInfo {
        key_id: Uuid::from_bytes(key_id),
        chain,
        origin: SoftwareKeyOrigin::Imported,
    };
    reencrypt_profile(&mut wallet, profile_index, &updated, password_utf8, false)?;
    Ok(MutationResult {
        store: encode_store(&wallet)?,
        value: info,
        warnings,
    })
}

/// Generates and stores a random chain-specific private key.
pub fn generate_software_key(
    store: &[u8],
    profile_id: Uuid,
    password_utf8: &[u8],
    chain: Chain,
) -> WalletResult<MutationResult<SoftwareKeyInfo>> {
    let (mut wallet, mut warnings) = decode_store(store)?;
    let profile_index = profile_index(&wallet, &profile_id.into_bytes())?;
    let payload = authenticate_profile(
        &wallet,
        &profile_id.into_bytes(),
        password_utf8,
        &mut warnings,
    )?;
    let private_key = crypto::generate_private_key(chain)?;
    ensure_not_duplicate(&payload, chain, &private_key)?;
    let key_id = new_key_id(&payload)?;
    let mut updated = payload;
    updated.software_keys.push(KeyRecord {
        key_id,
        chain,
        private_key,
        origin: SoftwareKeyOrigin::Generated,
    });
    let info = SoftwareKeyInfo {
        key_id: Uuid::from_bytes(key_id),
        chain,
        origin: SoftwareKeyOrigin::Generated,
    };
    reencrypt_profile(&mut wallet, profile_index, &updated, password_utf8, false)?;
    Ok(MutationResult {
        store: encode_store(&wallet)?,
        value: info,
        warnings,
    })
}

/// Returns the public account and address for an authenticated Software Key.
pub fn get_public_account(
    store: &[u8],
    profile_id: Uuid,
    key_id: Uuid,
    password_utf8: &[u8],
) -> WalletResult<ReadResult<PublicAccountInfo>> {
    let (wallet, mut warnings) = decode_store(store)?;
    let profile = find_profile(&wallet, &profile_id.into_bytes())?;
    let payload = authenticate_profile(&wallet, &profile.profile_id, password_utf8, &mut warnings)?;
    let key = payload
        .software_keys
        .iter()
        .find(|key| key.key_id == key_id.into_bytes())
        .ok_or_else(|| WalletError::new(ErrorCode::SoftwareKeyNotFound))?;
    let public_key = crypto::public_key(key.chain, &key.private_key)?;
    let address = crypto::address(key.chain, profile.network, &public_key);
    Ok(ReadResult {
        value: PublicAccountInfo {
            key_id,
            chain: key.chain,
            network: profile.network,
            public_key,
            address,
        },
        warnings,
    })
}

/// Signs caller-provided bytes with an authenticated Software Key.
pub fn sign(
    store: &[u8],
    profile_id: Uuid,
    key_id: Uuid,
    password_utf8: &[u8],
    payload_bytes: &[u8],
) -> WalletResult<ReadResult<Signature>> {
    let (wallet, mut warnings) = decode_store(store)?;
    let payload = authenticate_profile(
        &wallet,
        &profile_id.into_bytes(),
        password_utf8,
        &mut warnings,
    )?;
    let key = payload
        .software_keys
        .iter()
        .find(|key| key.key_id == key_id.into_bytes())
        .ok_or_else(|| WalletError::new(ErrorCode::SoftwareKeyNotFound))?;
    Ok(ReadResult {
        value: Signature {
            signature: crypto::sign(key.chain, &key.private_key, payload_bytes)?,
        },
        warnings,
    })
}

/// Re-encrypts one profile with a new password and a new KDF salt.
pub fn change_profile_password(
    store: &[u8],
    profile_id: Uuid,
    current_password_utf8: &[u8],
    new_password_utf8: &[u8],
) -> WalletResult<MutationResult<()>> {
    crypto::validate_password(new_password_utf8)?;
    let (mut wallet, mut warnings) = decode_store(store)?;
    let profile_index = profile_index(&wallet, &profile_id.into_bytes())?;
    let payload = authenticate_profile(
        &wallet,
        &profile_id.into_bytes(),
        current_password_utf8,
        &mut warnings,
    )?;
    reencrypt_profile(
        &mut wallet,
        profile_index,
        &payload,
        new_password_utf8,
        true,
    )?;
    Ok(MutationResult {
        store: encode_store(&wallet)?,
        value: (),
        warnings,
    })
}

/// Deletes one Software Key and returns a replacement Store.
pub fn delete_software_key(
    store: &[u8],
    profile_id: Uuid,
    key_id: Uuid,
    password_utf8: &[u8],
) -> WalletResult<MutationResult<()>> {
    let (mut wallet, mut warnings) = decode_store(store)?;
    let profile_index = profile_index(&wallet, &profile_id.into_bytes())?;
    let payload = authenticate_profile(
        &wallet,
        &profile_id.into_bytes(),
        password_utf8,
        &mut warnings,
    )?;
    let mut updated = payload;
    let before = updated.software_keys.len();
    updated
        .software_keys
        .retain(|key| key.key_id != key_id.into_bytes());
    if updated.software_keys.len() == before {
        return Err(WalletError::new(ErrorCode::SoftwareKeyNotFound));
    }
    reencrypt_profile(&mut wallet, profile_index, &updated, password_utf8, false)?;
    Ok(MutationResult {
        store: encode_store(&wallet)?,
        value: (),
        warnings,
    })
}

/// Deletes one profile after password authentication.
pub fn delete_profile(
    store: &[u8],
    profile_id: Uuid,
    password_utf8: &[u8],
) -> WalletResult<MutationResult<()>> {
    let (mut wallet, mut warnings) = decode_store(store)?;
    let profile_id = profile_id.into_bytes();
    let profile_index = profile_index(&wallet, &profile_id)?;
    let _payload = authenticate_profile(&wallet, &profile_id, password_utf8, &mut warnings)?;
    wallet.profiles.remove(profile_index);
    Ok(MutationResult {
        store: encode_store(&wallet)?,
        value: (),
        warnings,
    })
}

fn decode_store(bytes: &[u8]) -> WalletResult<(WalletStore, Vec<DecodeWarning>)> {
    let value = cbor::decode(bytes).map_err(|_| WalletError::new(ErrorCode::InvalidStore))?;
    let map = as_map(&value).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let magic = fixed_bytes(map_value(map, 0), 4)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    if magic != MAGIC {
        return Err(WalletError::new(ErrorCode::InvalidStore));
    }
    if uint(map_value(map, 1)) != Some(STORE_VERSION) {
        return Err(WalletError::new(ErrorCode::UnsupportedStoreVersion));
    }
    let registry_key = fixed_bytes(map_value(map, 2), 32)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let profiles_value =
        map_value(map, 3).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let profiles_array = match profiles_value {
        Value::Array(values) => values,
        _ => return Err(WalletError::new(ErrorCode::InvalidStore)),
    };

    let mut warnings = Vec::new();
    let mut profiles = Vec::new();
    for value in profiles_array {
        if let Some(profile) = parse_profile(value, &mut warnings)? {
            if profiles
                .iter()
                .any(|existing: &ProfileEnvelope| existing.profile_id == profile.profile_id)
            {
                return Err(WalletError::new(ErrorCode::InvalidStore));
            }
            profiles.push(profile);
        }
    }
    Ok((
        WalletStore {
            registry_key,
            profiles,
        },
        warnings,
    ))
}

fn parse_profile(
    value: &Value,
    warnings: &mut Vec<DecodeWarning>,
) -> WalletResult<Option<ProfileEnvelope>> {
    let Some(map) = as_map(value) else {
        warnings.push(warning("InvalidFieldType", "ProfileEnvelope", None, None));
        return Ok(None);
    };
    let profile_id = match fixed_bytes(map_value(map, 0), 16) {
        Some(value) => value,
        None => {
            warnings.push(warning(
                "MissingRequiredField",
                "ProfileEnvelope",
                None,
                Some("profile_id"),
            ));
            return Ok(None);
        }
    };
    let profile_uuid = Uuid::from_bytes(profile_id);
    let network = match parse_network(map_value(map, 1)) {
        Some(value) => value,
        None => {
            warnings.push(warning(
                enum_warning_code(map_value(map, 1)),
                "ProfileEnvelope",
                Some(profile_uuid),
                Some("network"),
            ));
            return Ok(None);
        }
    };
    let duplicate_tag = match fixed_bytes(map_value(map, 2), 32) {
        Some(value) => value,
        None => {
            warnings.push(warning(
                "InvalidFieldLength",
                "ProfileEnvelope",
                Some(profile_uuid),
                Some("duplicate_tag"),
            ));
            return Ok(None);
        }
    };
    match uint(map_value(map, 3)) {
        Some(PROFILE_SCHEMA_VERSION) => {}
        Some(_) => return Err(WalletError::new(ErrorCode::UnsupportedProfileSchemaVersion)),
        None => {
            warnings.push(warning(
                "MissingRequiredField",
                "ProfileEnvelope",
                Some(profile_uuid),
                Some("schema_version"),
            ));
            return Ok(None);
        }
    }
    let Some(kdf) = parse_kdf(map_value(map, 4)) else {
        warnings.push(warning(
            "InvalidFieldValue",
            "ProfileEnvelope",
            Some(profile_uuid),
            Some("kdf"),
        ));
        return Ok(None);
    };
    let Some(cipher) = parse_cipher(map_value(map, 5)) else {
        warnings.push(warning(
            "InvalidFieldValue",
            "ProfileEnvelope",
            Some(profile_uuid),
            Some("cipher"),
        ));
        return Ok(None);
    };
    let Some(index_values) = map_value(map, 6).and_then(as_array) else {
        warnings.push(warning(
            "MissingRequiredField",
            "ProfileEnvelope",
            Some(profile_uuid),
            Some("software_key_index"),
        ));
        return Ok(None);
    };
    let mut software_key_index = Vec::new();
    for value in index_values {
        if let Some(entry) = parse_index_entry(value, warnings, Some(profile_uuid)) {
            if software_key_index
                .iter()
                .any(|existing: &IndexEntry| existing.key_id == entry.key_id)
            {
                return Err(WalletError::new(ErrorCode::InvalidStore));
            }
            software_key_index.push(entry);
        }
    }
    Ok(Some(ProfileEnvelope {
        profile_id,
        network,
        duplicate_tag,
        kdf,
        cipher,
        software_key_index,
    }))
}

fn parse_kdf(value: Option<&Value>) -> Option<KdfParams> {
    let map = as_map(value?)?;
    if uint(map_value(map, 0))? != KDF_ALGORITHM
        || uint(map_value(map, 1))? != crypto::KDF_VERSION as u64
        || uint(map_value(map, 2))? != crypto::KDF_MEMORY_KIB as u64
        || uint(map_value(map, 3))? != crypto::KDF_ITERATIONS as u64
        || uint(map_value(map, 4))? != crypto::KDF_PARALLELISM as u64
    {
        return None;
    }
    Some(KdfParams {
        salt: fixed_bytes(map_value(map, 5), 16)?,
    })
}

fn parse_cipher(value: Option<&Value>) -> Option<Ciphertext> {
    let map = as_map(value?)?;
    if uint(map_value(map, 0))? != CIPHER_ALGORITHM {
        return None;
    }
    let nonce = fixed_bytes(map_value(map, 1), 12)?;
    let ciphertext = match map_value(map, 2)? {
        Value::Bytes(value) => value.clone(),
        _ => return None,
    };
    let tag = fixed_bytes(map_value(map, 3), 16)?;
    Some(Ciphertext {
        nonce,
        ciphertext,
        tag,
    })
}

fn parse_index_entry(
    value: &Value,
    warnings: &mut Vec<DecodeWarning>,
    profile_id: Option<Uuid>,
) -> Option<IndexEntry> {
    let Some(map) = as_map(value) else {
        warnings.push(warning(
            "InvalidFieldType",
            "SoftwareKeyIndexEntry",
            profile_id,
            None,
        ));
        return None;
    };
    let key_id = match fixed_bytes(map_value(map, 0), 16) {
        Some(value) => value,
        None => {
            warnings.push(warning(
                "InvalidFieldLength",
                "SoftwareKeyIndexEntry",
                profile_id,
                Some("key_id"),
            ));
            return None;
        }
    };
    let chain = match parse_chain(map_value(map, 1)) {
        Some(value) => value,
        None => {
            warnings.push(warning(
                enum_warning_code(map_value(map, 1)),
                "SoftwareKeyIndexEntry",
                profile_id,
                Some("chain"),
            ));
            return None;
        }
    };
    Some(IndexEntry { key_id, chain })
}

fn parse_payload(
    bytes: &[u8],
    warnings: &mut Vec<DecodeWarning>,
    profile_id: Uuid,
) -> WalletResult<ProfilePayload> {
    let value = cbor::decode(bytes).map_err(|_| WalletError::new(ErrorCode::InvalidStore))?;
    let map = as_map(&value).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let mnemonic_entropy = fixed_bytes(map_value(map, 0), 32)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let values = map_value(map, 1)
        .and_then(as_array)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let mut software_keys = Vec::new();
    for value in values {
        if let Some(record) = parse_key_record(value, warnings, profile_id) {
            if software_keys
                .iter()
                .any(|existing: &KeyRecord| existing.key_id == record.key_id)
            {
                return Err(WalletError::new(ErrorCode::InvalidStore));
            }
            software_keys.push(record);
        }
    }
    Ok(ProfilePayload {
        mnemonic_entropy,
        software_keys,
    })
}

fn parse_key_record(
    value: &Value,
    warnings: &mut Vec<DecodeWarning>,
    profile_id: Uuid,
) -> Option<KeyRecord> {
    let Some(map) = as_map(value) else {
        warnings.push(warning(
            "InvalidFieldType",
            "SoftwareKeyRecord",
            Some(profile_id),
            None,
        ));
        return None;
    };
    let key_id = match fixed_bytes(map_value(map, 0), 16) {
        Some(value) => value,
        None => {
            warnings.push(warning(
                if map_value(map, 0).is_none() {
                    "MissingRequiredField"
                } else {
                    "InvalidFieldLength"
                },
                "SoftwareKeyRecord",
                Some(profile_id),
                Some("key_id"),
            ));
            return None;
        }
    };
    let chain = match parse_chain(map_value(map, 1)) {
        Some(value) => value,
        None => {
            warnings.push(warning(
                enum_warning_code(map_value(map, 1)),
                "SoftwareKeyRecord",
                Some(profile_id),
                Some("chain"),
            ));
            return None;
        }
    };
    let private_key = match fixed_bytes(map_value(map, 2), 32) {
        Some(value) => value,
        None => {
            warnings.push(warning(
                if map_value(map, 2).is_none() {
                    "MissingRequiredField"
                } else {
                    "InvalidFieldLength"
                },
                "SoftwareKeyRecord",
                Some(profile_id),
                Some("private_key"),
            ));
            return None;
        }
    };
    let Some(origin_value) = map_value(map, 3) else {
        warnings.push(warning(
            "MissingRequiredField",
            "SoftwareKeyRecord",
            Some(profile_id),
            Some("origin"),
        ));
        return None;
    };
    let Some(origin_map) = as_map(origin_value) else {
        warnings.push(warning(
            "InvalidFieldType",
            "SoftwareKeyRecord",
            Some(profile_id),
            Some("origin"),
        ));
        return None;
    };
    let Some(origin_value) = map_value(origin_map, 0) else {
        warnings.push(warning(
            "MissingRequiredField",
            "SoftwareKeyRecord",
            Some(profile_id),
            Some("origin"),
        ));
        return None;
    };
    let Some(origin_wire) = uint(Some(origin_value)) else {
        warnings.push(warning(
            "InvalidFieldType",
            "SoftwareKeyRecord",
            Some(profile_id),
            Some("origin"),
        ));
        return None;
    };
    let origin = match origin_wire {
        0 => {
            let Some(account_value) = map_value(origin_map, 1) else {
                warnings.push(warning(
                    "MissingRequiredField",
                    "SoftwareKeyRecord",
                    Some(profile_id),
                    Some("account_index"),
                ));
                return None;
            };
            let Some(account_index) = uint(Some(account_value)) else {
                warnings.push(warning(
                    "InvalidFieldType",
                    "SoftwareKeyRecord",
                    Some(profile_id),
                    Some("account_index"),
                ));
                return None;
            };
            if account_index > 2_147_483_647 {
                warnings.push(warning(
                    "InvalidFieldValue",
                    "SoftwareKeyRecord",
                    Some(profile_id),
                    Some("account_index"),
                ));
                return None;
            }
            SoftwareKeyOrigin::Derived {
                account_index: account_index as u32,
            }
        }
        1 => SoftwareKeyOrigin::Imported,
        2 => SoftwareKeyOrigin::Generated,
        _ => {
            warnings.push(warning(
                "UnknownEnumValue",
                "SoftwareKeyRecord",
                Some(profile_id),
                Some("origin"),
            ));
            return None;
        }
    };
    Some(KeyRecord {
        key_id,
        chain,
        private_key,
        origin,
    })
}

fn authenticate_profile(
    wallet: &WalletStore,
    profile_id: &[u8; 16],
    password_utf8: &[u8],
    warnings: &mut Vec<DecodeWarning>,
) -> WalletResult<ProfilePayload> {
    let profile = find_profile(wallet, profile_id)?;
    let aad = profile_aad(wallet, profile)?;
    let mut key = crypto::derive_encryption_key(password_utf8, &profile.kdf.salt)?;
    let plaintext = crypto::decrypt(
        &key,
        &profile.cipher.nonce,
        &profile.cipher.tag,
        &aad,
        &profile.cipher.ciphertext,
    );
    key.zeroize();
    let plaintext = plaintext?;
    let payload = parse_payload(&plaintext, warnings, Uuid::from_bytes(*profile_id))?;
    let mut plaintext = plaintext;
    plaintext.zeroize();
    validate_authenticated_profile(wallet, profile, &payload)?;
    Ok(payload)
}

fn validate_authenticated_profile(
    wallet: &WalletStore,
    profile: &ProfileEnvelope,
    payload: &ProfilePayload,
) -> WalletResult<()> {
    let expected_tag = crypto::duplicate_tag(
        &wallet.registry_key,
        profile.network,
        &payload.mnemonic_entropy,
    );
    if expected_tag != profile.duplicate_tag {
        return Err(WalletError::new(ErrorCode::InvalidStore));
    }
    if profile.software_key_index.len() != payload.software_keys.len() {
        return Err(WalletError::new(ErrorCode::InvalidStore));
    }
    for index in &profile.software_key_index {
        let Some(key) = payload
            .software_keys
            .iter()
            .find(|key| key.key_id == index.key_id)
        else {
            return Err(WalletError::new(ErrorCode::InvalidStore));
        };
        if key.chain != index.chain {
            return Err(WalletError::new(ErrorCode::InvalidStore));
        }
    }
    for key in &payload.software_keys {
        crypto::validate_private_key(key.chain, &key.private_key)
            .map_err(|_| WalletError::new(ErrorCode::InvalidStore))?;
    }
    Ok(())
}

fn reencrypt_profile(
    wallet: &mut WalletStore,
    profile_index: usize,
    payload: &ProfilePayload,
    password_utf8: &[u8],
    change_password: bool,
) -> WalletResult<()> {
    let registry_key = wallet.registry_key;
    let profile = &mut wallet.profiles[profile_index];
    profile.software_key_index = index_from_payload(payload);
    if change_password {
        profile.kdf.salt = crypto::random()?;
    }
    let mut key = crypto::derive_encryption_key(password_utf8, &profile.kdf.salt)?;
    profile.cipher.nonce = crypto::random()?;
    let aad = profile_aad_from_parts(&registry_key, profile)?;
    let mut payload_bytes = encode_payload(payload)?;
    let encryption = crypto::encrypt(&key, &profile.cipher.nonce, &aad, &payload_bytes);
    payload_bytes.zeroize();
    key.zeroize();
    let (ciphertext, tag) = encryption?;
    profile.cipher.ciphertext = ciphertext;
    profile.cipher.tag = tag;
    Ok(())
}

fn new_encrypted_profile(
    registry_key: &[u8; 32],
    profile_id: [u8; 16],
    network: Network,
    duplicate_tag: [u8; 32],
    payload: &ProfilePayload,
    password_utf8: &[u8],
) -> WalletResult<ProfileEnvelope> {
    let mut profile = ProfileEnvelope {
        profile_id,
        network,
        duplicate_tag,
        kdf: KdfParams {
            salt: crypto::random()?,
        },
        cipher: Ciphertext {
            nonce: crypto::random()?,
            ciphertext: Vec::new(),
            tag: [0u8; 16],
        },
        software_key_index: index_from_payload(payload),
    };
    let mut key = crypto::derive_encryption_key(password_utf8, &profile.kdf.salt)?;
    let aad = profile_aad_from_parts(registry_key, &profile)?;
    let mut payload_bytes = encode_payload(payload)?;
    let encryption = crypto::encrypt(&key, &profile.cipher.nonce, &aad, &payload_bytes);
    payload_bytes.zeroize();
    key.zeroize();
    let (ciphertext, tag) = encryption?;
    profile.cipher.ciphertext = ciphertext;
    profile.cipher.tag = tag;
    Ok(profile)
}

fn profile_aad(wallet: &WalletStore, profile: &ProfileEnvelope) -> WalletResult<Vec<u8>> {
    profile_aad_from_parts(&wallet.registry_key, profile)
}

fn profile_aad_from_parts(
    registry_key: &[u8; 32],
    profile: &ProfileEnvelope,
) -> WalletResult<Vec<u8>> {
    cbor::encode(&Value::Array(vec![
        Value::Bytes(MAGIC.to_vec()),
        Value::UInt(STORE_VERSION),
        Value::Bytes(registry_key.to_vec()),
        Value::Bytes(profile.profile_id.to_vec()),
        Value::UInt(profile.network.wire()),
        Value::Bytes(profile.duplicate_tag.to_vec()),
        Value::UInt(PROFILE_SCHEMA_VERSION),
        Value::UInt(KDF_ALGORITHM),
        Value::UInt(CIPHER_ALGORITHM),
        Value::Array(index_to_values(&profile.software_key_index)),
    ]))
    .map_err(|_| WalletError::new(ErrorCode::SerializationFailure))
}

fn encode_store(wallet: &WalletStore) -> WalletResult<Vec<u8>> {
    let mut profiles = wallet.profiles.clone();
    profiles.sort_by_key(|profile| profile.profile_id);
    cbor::encode(&Value::Map(vec![
        (0, Value::Bytes(MAGIC.to_vec())),
        (1, Value::UInt(STORE_VERSION)),
        (2, Value::Bytes(wallet.registry_key.to_vec())),
        (
            3,
            Value::Array(profiles.iter().map(profile_to_value).collect()),
        ),
    ]))
    .map_err(|_| WalletError::new(ErrorCode::SerializationFailure))
}

fn profile_to_value(profile: &ProfileEnvelope) -> Value {
    let mut index = profile.software_key_index.clone();
    index.sort_by_key(|entry| entry.key_id);
    Value::Map(vec![
        (0, Value::Bytes(profile.profile_id.to_vec())),
        (1, Value::UInt(profile.network.wire())),
        (2, Value::Bytes(profile.duplicate_tag.to_vec())),
        (3, Value::UInt(PROFILE_SCHEMA_VERSION)),
        (
            4,
            Value::Map(vec![
                (0, Value::UInt(KDF_ALGORITHM)),
                (1, Value::UInt(crypto::KDF_VERSION as u64)),
                (2, Value::UInt(crypto::KDF_MEMORY_KIB as u64)),
                (3, Value::UInt(crypto::KDF_ITERATIONS as u64)),
                (4, Value::UInt(crypto::KDF_PARALLELISM as u64)),
                (5, Value::Bytes(profile.kdf.salt.to_vec())),
            ]),
        ),
        (
            5,
            Value::Map(vec![
                (0, Value::UInt(CIPHER_ALGORITHM)),
                (1, Value::Bytes(profile.cipher.nonce.to_vec())),
                (2, Value::Bytes(profile.cipher.ciphertext.clone())),
                (3, Value::Bytes(profile.cipher.tag.to_vec())),
            ]),
        ),
        (6, Value::Array(index.iter().map(index_to_value).collect())),
    ])
}

fn encode_payload(payload: &ProfilePayload) -> WalletResult<Vec<u8>> {
    let mut keys = payload.software_keys.clone();
    keys.sort_by_key(|key| key.key_id);
    cbor::encode(&Value::Map(vec![
        (0, Value::Bytes(payload.mnemonic_entropy.to_vec())),
        (1, Value::Array(keys.iter().map(key_to_value).collect())),
    ]))
    .map_err(|_| WalletError::new(ErrorCode::SerializationFailure))
}

fn key_to_value(key: &KeyRecord) -> Value {
    let origin = match key.origin {
        SoftwareKeyOrigin::Derived { account_index } => Value::Map(vec![
            (0, Value::UInt(0)),
            (1, Value::UInt(account_index as u64)),
        ]),
        SoftwareKeyOrigin::Imported => Value::Map(vec![(0, Value::UInt(1))]),
        SoftwareKeyOrigin::Generated => Value::Map(vec![(0, Value::UInt(2))]),
    };
    Value::Map(vec![
        (0, Value::Bytes(key.key_id.to_vec())),
        (1, Value::UInt(key.chain.wire())),
        (2, Value::Bytes(key.private_key.to_vec())),
        (3, origin),
    ])
}

fn index_to_value(entry: &IndexEntry) -> Value {
    Value::Map(vec![
        (0, Value::Bytes(entry.key_id.to_vec())),
        (1, Value::UInt(entry.chain.wire())),
    ])
}

fn index_to_values(entries: &[IndexEntry]) -> Vec<Value> {
    entries.iter().map(index_to_value).collect()
}

fn index_from_payload(payload: &ProfilePayload) -> Vec<IndexEntry> {
    let mut index = payload
        .software_keys
        .iter()
        .map(|key| IndexEntry {
            key_id: key.key_id,
            chain: key.chain,
        })
        .collect::<Vec<_>>();
    index.sort_by_key(|entry| entry.key_id);
    index
}

fn profile_info(profile: &ProfileEnvelope) -> ProfileInfo {
    ProfileInfo {
        profile_id: Uuid::from_bytes(profile.profile_id),
        network: profile.network,
        software_key_count: profile.software_key_index.len(),
    }
}

fn find_profile<'a>(
    wallet: &'a WalletStore,
    profile_id: &[u8; 16],
) -> WalletResult<&'a ProfileEnvelope> {
    wallet
        .profiles
        .iter()
        .find(|profile| &profile.profile_id == profile_id)
        .ok_or_else(|| WalletError::new(ErrorCode::ProfileNotFound))
}

fn profile_index(wallet: &WalletStore, profile_id: &[u8; 16]) -> WalletResult<usize> {
    wallet
        .profiles
        .iter()
        .position(|profile| &profile.profile_id == profile_id)
        .ok_or_else(|| WalletError::new(ErrorCode::ProfileNotFound))
}

fn ensure_not_duplicate(
    payload: &ProfilePayload,
    chain: Chain,
    private_key: &[u8; 32],
) -> WalletResult<()> {
    if payload
        .software_keys
        .iter()
        .any(|key| key.chain == chain && key.private_key == *private_key)
    {
        return Err(WalletError::new(ErrorCode::DuplicateSoftwareKey));
    }
    Ok(())
}

fn new_profile_id(wallet: &WalletStore) -> WalletResult<[u8; 16]> {
    loop {
        let id = crypto::random::<16>()?;
        if !wallet
            .profiles
            .iter()
            .any(|profile| profile.profile_id == id)
        {
            return Ok(id);
        }
    }
}

fn new_key_id(payload: &ProfilePayload) -> WalletResult<[u8; 16]> {
    loop {
        let id = crypto::random::<16>()?;
        if !payload.software_keys.iter().any(|key| key.key_id == id) {
            return Ok(id);
        }
    }
}

fn make_pending(
    store: &[u8],
    profile_id: &[u8; 16],
    network: Network,
    entropy: &[u8; 32],
    password_utf8: &[u8],
) -> WalletResult<Vec<u8>> {
    let target_store_hash = crypto::sha256(store);
    let salt = crypto::random::<16>()?;
    let nonce = crypto::random::<12>()?;
    let pending = PendingDecoded {
        target_store_hash,
        profile_id: *profile_id,
        network,
        salt,
        nonce,
        ciphertext: Vec::new(),
        tag: [0u8; 16],
    };
    let aad = pending_aad(&pending);
    let mut key = crypto::derive_encryption_key(password_utf8, &salt)?;
    let encryption = crypto::encrypt(&key, &nonce, &aad, entropy);
    key.zeroize();
    let (ciphertext, tag) = encryption?;
    let pending = PendingDecoded {
        ciphertext,
        tag,
        ..pending
    };
    Ok(encode_pending(&pending))
}

fn parse_pending(bytes: &[u8]) -> WalletResult<PendingDecoded> {
    const SIZE: usize = 8 + 1 + 32 + 16 + 1 + 16 + 12 + 32 + 16;
    if bytes.len() != SIZE || bytes[..8] != PENDING_MAGIC || bytes[8] != PENDING_VERSION {
        return Err(WalletError::new(ErrorCode::PendingProfileInvalid));
    }
    let mut offset = 9;
    let target_store_hash = take_array::<32>(bytes, &mut offset)?;
    let profile_id = take_array::<16>(bytes, &mut offset)?;
    let network = match *bytes
        .get(offset)
        .ok_or_else(|| WalletError::new(ErrorCode::PendingProfileInvalid))?
    {
        0 => Network::Testnet,
        1 => Network::Mainnet,
        _ => return Err(WalletError::new(ErrorCode::PendingProfileInvalid)),
    };
    offset += 1;
    let salt = take_array::<16>(bytes, &mut offset)?;
    let nonce = take_array::<12>(bytes, &mut offset)?;
    let ciphertext = bytes
        .get(offset..offset + 32)
        .ok_or_else(|| WalletError::new(ErrorCode::PendingProfileInvalid))?
        .to_vec();
    offset += 32;
    let tag = take_array::<16>(bytes, &mut offset)?;
    if offset != bytes.len() {
        return Err(WalletError::new(ErrorCode::PendingProfileInvalid));
    }
    Ok(PendingDecoded {
        target_store_hash,
        profile_id,
        network,
        salt,
        nonce,
        ciphertext,
        tag,
    })
}

fn encode_pending(pending: &PendingDecoded) -> Vec<u8> {
    let mut bytes =
        Vec::with_capacity(8 + 1 + 32 + 16 + 1 + 16 + 12 + pending.ciphertext.len() + 16);
    bytes.extend_from_slice(&PENDING_MAGIC);
    bytes.push(PENDING_VERSION);
    bytes.extend_from_slice(&pending.target_store_hash);
    bytes.extend_from_slice(&pending.profile_id);
    bytes.push(pending.network.wire() as u8);
    bytes.extend_from_slice(&pending.salt);
    bytes.extend_from_slice(&pending.nonce);
    bytes.extend_from_slice(&pending.ciphertext);
    bytes.extend_from_slice(&pending.tag);
    bytes
}

fn pending_aad(pending: &PendingDecoded) -> Vec<u8> {
    let mut aad = Vec::with_capacity(8 + 1 + 32 + 16 + 1);
    aad.extend_from_slice(&PENDING_MAGIC);
    aad.push(PENDING_VERSION);
    aad.extend_from_slice(&pending.target_store_hash);
    aad.extend_from_slice(&pending.profile_id);
    aad.push(pending.network.wire() as u8);
    aad
}

fn take_array<const N: usize>(bytes: &[u8], offset: &mut usize) -> WalletResult<[u8; N]> {
    let end = offset
        .checked_add(N)
        .ok_or_else(|| WalletError::new(ErrorCode::PendingProfileInvalid))?;
    let value = bytes
        .get(*offset..end)
        .ok_or_else(|| WalletError::new(ErrorCode::PendingProfileInvalid))?;
    let result = value
        .try_into()
        .map_err(|_| WalletError::new(ErrorCode::PendingProfileInvalid))?;
    *offset = end;
    Ok(result)
}

fn as_map(value: &Value) -> Option<&[(u64, Value)]> {
    match value {
        Value::Map(entries) => Some(entries),
        _ => None,
    }
}

fn as_array(value: &Value) -> Option<&[Value]> {
    match value {
        Value::Array(values) => Some(values),
        _ => None,
    }
}

fn map_value(map: &[(u64, Value)], key: u64) -> Option<&Value> {
    map.iter()
        .find(|(candidate, _)| *candidate == key)
        .map(|(_, value)| value)
}

fn uint(value: Option<&Value>) -> Option<u64> {
    match value? {
        Value::UInt(value) => Some(*value),
        _ => None,
    }
}

fn fixed_bytes<const N: usize>(value: Option<&Value>, _length: usize) -> Option<[u8; N]> {
    match value? {
        Value::Bytes(value) if value.len() == N => value.as_slice().try_into().ok(),
        _ => None,
    }
}

fn parse_network(value: Option<&Value>) -> Option<Network> {
    match uint(value)? {
        0 => Some(Network::Testnet),
        1 => Some(Network::Mainnet),
        _ => None,
    }
}

fn parse_chain(value: Option<&Value>) -> Option<Chain> {
    match uint(value)? {
        0 => Some(Chain::Nem),
        1 => Some(Chain::Symbol),
        _ => None,
    }
}

fn enum_warning_code(value: Option<&Value>) -> &'static str {
    match value {
        None => "MissingRequiredField",
        Some(Value::UInt(_)) => "UnknownEnumValue",
        Some(_) => "InvalidFieldType",
    }
}

fn warning(
    code: &'static str,
    object_type: &'static str,
    object_id: Option<Uuid>,
    field: Option<&'static str>,
) -> DecodeWarning {
    DecodeWarning {
        code,
        object_type,
        object_id,
        field,
    }
}

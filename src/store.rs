//! Wallet Store v1のdecode、暗号化payload認証、atomic更新を担当するモジュール。
//!
//! 平文manifestは一覧処理に使用し、MnemonicとSoftware KeyはProfile passwordから
//! 導出した鍵で暗号化する。更新処理では入力Storeを変更せず、新しいbyte列を返す。

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

// Wallet Store v1の固定値。wire format仕様の値と一致させる。
const MAGIC: [u8; 4] = *b"SNWC";
const STORE_VERSION: u64 = 1;
const PROFILE_SCHEMA_VERSION: u64 = 1;
const KDF_ALGORITHM: u64 = 0;
const CIPHER_ALGORITHM: u64 = 0;
// Pending ProfileはWallet Storeのwire formatではないため、専用のmagic/versionを持つ。
const PENDING_MAGIC: [u8; 8] = *b"SNWCPND1";
const PENDING_VERSION: u8 = 1;

#[derive(Clone)]
struct WalletStore {
    registry_key: [u8; 32],
    profiles: Vec<ProfileEnvelope>,
}

impl Drop for WalletStore {
    fn drop(&mut self) {
        self.registry_key.zeroize();
    }
}

// ProfileEnvelopeは一覧取得に必要なmanifestと、暗号化payloadの認証情報を保持する。
// Mnemonicやprivate keyはここへ置かず、ProfilePayloadに限定する。
#[derive(Clone)]
struct ProfileEnvelope {
    profile_id: [u8; 16],
    network: Network,
    duplicate_tag: [u8; 32],
    kdf: KdfParams,
    cipher: Ciphertext,
    software_key_index: Vec<IndexEntry>,
    // AADには意味解釈後のindexではなく、受信した配列のwire値を使用する。
    aad_software_key_index: Vec<Value>,
}

impl Drop for ProfileEnvelope {
    fn drop(&mut self) {
        self.duplicate_tag.zeroize();
    }
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

impl Drop for Ciphertext {
    fn drop(&mut self) {
        self.ciphertext.zeroize();
    }
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

impl Drop for KeyRecord {
    fn drop(&mut self) {
        self.private_key.zeroize();
    }
}

struct ProfilePayload {
    mnemonic_entropy: [u8; 32],
    software_keys: Vec<KeyRecord>,
}

impl Drop for ProfilePayload {
    // payloadがスコープを抜けた後も、entropyとprivate keyの平文を残さない。
    fn drop(&mut self) {
        self.mnemonic_entropy.zeroize();
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
    // Pending内の暗号文も不要になった時点で上書きする。
    fn drop(&mut self) {
        self.ciphertext.zeroize();
    }
}

/// 空のv1 Wallet Storeを生成する。
///
/// Store固有のregistry keyはCSPRNGから生成し、Profileは空の状態で返す。
pub fn create_empty_store() -> WalletResult<WalletStoreBlob> {
    let store = WalletStore {
        registry_key: crypto::random()?,
        profiles: Vec::new(),
    };
    encode_store(&store)
}

/// Mnemonicを生成し、Storeを変更せずに暗号化済みPending Profileを返す。
///
/// 返却されたMnemonicは初回バックアップ受渡しに使用し、受渡し完了後に
/// [`finalize_generated_profile`]へPending Profileを渡す。
pub fn prepare_generated_profile(
    store: &[u8],
    password_utf8: &[u8],
    network: Network,
) -> WalletResult<ReadResult<PreparedProfile>> {
    let (_, warnings) = decode_store(store)?;
    crypto::validate_password(password_utf8)?;
    let entropy = zeroize::Zeroizing::new(crypto::random::<32>()?);
    let mnemonic_utf8 = zeroize::Zeroizing::new(crypto::mnemonic_from_entropy(&entropy)?);
    let profile_id = crypto::random_uuid()?.into_bytes();
    let pending_profile = make_pending(store, &profile_id, network, &entropy, password_utf8)?;
    Ok(ReadResult {
        value: PreparedProfile {
            mnemonic_utf8: mnemonic_utf8.to_vec(),
            pending_profile,
        },
        warnings,
    })
}

/// Pending Profileを認証し、atomicにProfileを確定する。
///
/// Pending Profile、対象Store、passwordおよび既存Profileの整合性を検証し、
/// 成功時だけreplacement Storeを返す。
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
    let entropy_result = crypto::decrypt(
        &pending_key,
        &pending.nonce,
        &pending.tag,
        &aad,
        &pending.ciphertext,
    );
    pending_key.zeroize();
    let entropy_bytes = zeroize::Zeroizing::new(entropy_result?);
    let entropy = zeroize::Zeroizing::new(
        entropy_bytes
            .as_slice()
            .try_into()
            .map_err(|_| WalletError::new(ErrorCode::PendingProfileInvalid))?,
    );

    let duplicate_tag = zeroize::Zeroizing::new(crypto::duplicate_tag(
        &wallet.registry_key,
        pending.network,
        &entropy,
    ));
    if wallet
        .profiles
        .iter()
        .any(|profile| profile.duplicate_tag == *duplicate_tag)
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
        mnemonic_entropy: *entropy,
        software_keys: Vec::new(),
    };
    let profile = new_encrypted_profile(
        &wallet.registry_key,
        pending.profile_id,
        pending.network,
        *duplicate_tag,
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

/// 検証済みBIP39 MnemonicからProfileを復元し、replacement Storeを返す。
pub fn restore_profile(
    store: &[u8],
    mnemonic_utf8: &[u8],
    password_utf8: &[u8],
    network: Network,
) -> WalletResult<MutationResult<ProfileInfo>> {
    crypto::validate_password(password_utf8)?;
    let (mut wallet, warnings) = decode_store(store)?;
    let (entropy, mut normalized) = crypto::parse_mnemonic(mnemonic_utf8)?;
    normalized.zeroize();
    let entropy = zeroize::Zeroizing::new(entropy);
    let duplicate_tag = zeroize::Zeroizing::new(crypto::duplicate_tag(
        &wallet.registry_key,
        network,
        &entropy,
    ));
    if wallet
        .profiles
        .iter()
        .any(|profile| profile.duplicate_tag == *duplicate_tag)
    {
        return Err(WalletError::new(ErrorCode::DuplicateProfile));
    }

    let profile_id = new_profile_id(&wallet)?;
    let mut payload = ProfilePayload {
        mnemonic_entropy: *entropy,
        software_keys: Vec::new(),
    };
    let profile = new_encrypted_profile(
        &wallet.registry_key,
        profile_id,
        network,
        *duplicate_tag,
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

/// 暗号化payloadを復号せずにProfile一覧を返す。
pub fn list_profiles(store: &[u8]) -> WalletResult<ReadResult<Vec<ProfileInfo>>> {
    let (wallet, warnings) = decode_store(store)?;
    Ok(ReadResult {
        value: wallet.profiles.iter().map(profile_info).collect(),
        warnings,
    })
}

/// 平文indexからSoftware Key一覧を返す。
///
/// 一覧にはprivate keyやoriginを含めず、Profile passwordも要求しない。
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

/// password認証後にProfileのMnemonicを明示的にexportする。
///
/// 通常のProfile情報や一覧にはMnemonicを含めず、この関数の成功結果だけで返す。
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

/// password認証後に指定Software Keyのprivate keyを明示的にexportする。
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

/// ProfileのMnemonicからChain固有のSoftware Keyを導出して保存する。
///
/// 導出pathはProfile Network、Chain、account indexおよびschema versionから決定する。
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
    let private_key = zeroize::Zeroizing::new(crypto::derive_private_key(
        &payload.mnemonic_entropy,
        chain,
        wallet.profiles[profile_index].network,
        account_index,
    )?);
    ensure_not_duplicate(&payload, chain, &private_key)?;
    let key_id = new_key_id(&payload)?;
    let mut updated = payload;
    updated.software_keys.push(KeyRecord {
        key_id,
        chain,
        private_key: *private_key,
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

/// 外部から受け取ったChain固有のprivate keyを検証して保存する。
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
        private_key: *private_key,
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

/// CSPRNGでChain固有のprivate keyを生成し、検証して保存する。
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
    let private_key = zeroize::Zeroizing::new(crypto::generate_private_key(chain)?);
    ensure_not_duplicate(&payload, chain, &private_key)?;
    let key_id = new_key_id(&payload)?;
    let mut updated = payload;
    updated.software_keys.push(KeyRecord {
        key_id,
        chain,
        private_key: *private_key,
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

/// 認証済みSoftware Keyのpublic keyとaddressを返す。
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

/// 認証済みSoftware Keyで呼び出し側のbyte列に署名する。
///
/// payloadの意味解釈やgeneration hashの追加は行わない。
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

/// 新しいpasswordとKDF saltでProfile全体を再暗号化する。
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

/// 指定Software Keyを削除し、replacement Storeを返す。
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

/// password認証後に指定Profileを削除する。
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

// Storeのトップレベルは解釈不能ならfatal error、子Profileの不正はwarningとして扱う。
fn decode_store(bytes: &[u8]) -> WalletResult<(WalletStore, Vec<DecodeWarning>)> {
    let value = cbor::decode(bytes).map_err(|_| WalletError::new(ErrorCode::InvalidStore))?;
    let map = as_map(&value).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let magic = fixed_bytes(map_value(map, 0), 4)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    if magic != MAGIC {
        return Err(WalletError::new(ErrorCode::InvalidStore));
    }
    match map_value(map, 1) {
        Some(Value::UInt(STORE_VERSION)) => {}
        Some(Value::UInt(_)) => return Err(WalletError::new(ErrorCode::UnsupportedStoreVersion)),
        None | Some(_) => return Err(WalletError::new(ErrorCode::InvalidStore)),
    }
    let registry_key = zeroize::Zeroizing::new(
        fixed_bytes(map_value(map, 2), 32)
            .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?,
    );
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
                .last()
                .is_some_and(|previous: &ProfileEnvelope| previous.profile_id >= profile.profile_id)
            {
                return Err(WalletError::new(ErrorCode::InvalidStore));
            }
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
            registry_key: *registry_key,
            profiles,
        },
        warnings,
    ))
}

// ProfileEnvelopeを検証し、子要素の不正だけをwarning付きでスキップする。
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
                fixed_bytes_warning(map_value(map, 0)),
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
                fixed_bytes_warning(map_value(map, 2)),
                "ProfileEnvelope",
                Some(profile_uuid),
                Some("duplicate_tag"),
            ));
            return Ok(None);
        }
    };
    let duplicate_tag = zeroize::Zeroizing::new(duplicate_tag);
    match map_value(map, 3) {
        Some(Value::UInt(PROFILE_SCHEMA_VERSION)) => {}
        Some(Value::UInt(_)) => {
            return Err(WalletError::new(ErrorCode::UnsupportedProfileSchemaVersion))
        }
        None => {
            warnings.push(warning(
                "MissingRequiredField",
                "ProfileEnvelope",
                Some(profile_uuid),
                Some("schema_version"),
            ));
            return Ok(None);
        }
        Some(_) => {
            warnings.push(warning(
                "InvalidFieldType",
                "ProfileEnvelope",
                Some(profile_uuid),
                Some("schema_version"),
            ));
            return Ok(None);
        }
    }
    let Some(kdf) = parse_kdf(map_value(map, 4)) else {
        warnings.push(warning(
            kdf_warning_code(map_value(map, 4)),
            "ProfileEnvelope",
            Some(profile_uuid),
            Some("kdf"),
        ));
        return Ok(None);
    };
    let Some(cipher) = parse_cipher(map_value(map, 5)) else {
        warnings.push(warning(
            cipher_warning_code(map_value(map, 5)),
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
    let aad_software_key_index = index_values.to_vec();
    let mut software_key_index = Vec::new();
    for value in index_values {
        if let Some(entry) = parse_index_entry(value, warnings, Some(profile_uuid)) {
            if software_key_index
                .last()
                .is_some_and(|previous: &IndexEntry| previous.key_id >= entry.key_id)
            {
                return Err(WalletError::new(ErrorCode::InvalidStore));
            }
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
        duplicate_tag: *duplicate_tag,
        kdf,
        cipher,
        software_key_index,
        aad_software_key_index,
    }))
}

// KDFはv1で固定されたArgon2idのパラメータだけを受理する。
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

// Cipherはv1で固定されたAES-256-GCMのnonce、ciphertext、tagを保持する。
fn parse_cipher(value: Option<&Value>) -> Option<Ciphertext> {
    let map = as_map(value?)?;
    if uint(map_value(map, 0))? != CIPHER_ALGORITHM {
        return None;
    }
    let nonce = fixed_bytes(map_value(map, 1), 12)?;
    let mut ciphertext = match map_value(map, 2)? {
        Value::Bytes(value) => value.clone(),
        _ => return None,
    };
    let tag = match fixed_bytes(map_value(map, 3), 16) {
        Some(value) => value,
        None => {
            ciphertext.zeroize();
            return None;
        }
    };
    Some(Ciphertext {
        nonce,
        ciphertext,
        tag,
    })
}

fn kdf_warning_code(value: Option<&Value>) -> &'static str {
    enum_field_warning_code(value, KDF_ALGORITHM)
}

fn cipher_warning_code(value: Option<&Value>) -> &'static str {
    enum_field_warning_code(value, CIPHER_ALGORITHM)
}

fn enum_field_warning_code(value: Option<&Value>, expected: u64) -> &'static str {
    let Some(value) = value else {
        return "MissingRequiredField";
    };
    let Some(map) = as_map(value) else {
        return "InvalidFieldType";
    };
    match map_value(map, 0) {
        None => "MissingRequiredField",
        Some(Value::UInt(value)) if *value != expected => "UnknownEnumValue",
        Some(Value::UInt(_)) => "InvalidFieldValue",
        Some(_) => "InvalidFieldType",
    }
}

// 平文indexはprivate keyを含まず、一覧取得用のkey_idとChainだけを保持する。
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
                fixed_bytes_warning(map_value(map, 0)),
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

// 認証済みciphertextを復号した後にだけ呼び出し、payload内の子Keyを解釈する。
fn parse_payload(
    bytes: &[u8],
    warnings: &mut Vec<DecodeWarning>,
    profile_id: Uuid,
) -> WalletResult<ProfilePayload> {
    let value = cbor::decode(bytes).map_err(|_| WalletError::new(ErrorCode::InvalidStore))?;
    let map = as_map(&value).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let mnemonic_entropy = zeroize::Zeroizing::new(
        fixed_bytes(map_value(map, 0), 32)
            .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?,
    );
    let values = map_value(map, 1)
        .and_then(as_array)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let mut software_keys = Vec::new();
    for value in values {
        if let Some(record) = parse_key_record(value, warnings, profile_id) {
            if software_keys
                .last()
                .is_some_and(|previous: &KeyRecord| previous.key_id >= record.key_id)
            {
                return Err(WalletError::new(ErrorCode::InvalidStore));
            }
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
        mnemonic_entropy: *mnemonic_entropy,
        software_keys,
    })
}

// SoftwareKeyRecordの不正は秘密情報をwarningへ含めず、対象record全体をスキップする。
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
                fixed_bytes_warning(map_value(map, 0)),
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
                fixed_bytes_warning(map_value(map, 2)),
                "SoftwareKeyRecord",
                Some(profile_id),
                Some("private_key"),
            ));
            return None;
        }
    };
    let private_key = zeroize::Zeroizing::new(private_key);
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
        private_key: *private_key,
        origin,
    })
}

// Profile認証の順序は、AAD認証、payload構造検証、duplicate_tag意味検証、
// index整合性検証、private key妥当性検証の順に固定する。
fn authenticate_profile(
    wallet: &WalletStore,
    profile_id: &[u8; 16],
    password_utf8: &[u8],
    warnings: &mut Vec<DecodeWarning>,
) -> WalletResult<ProfilePayload> {
    let profile = find_profile(wallet, profile_id)?;
    let aad = profile_aad(wallet, profile)?;
    let mut key = crypto::derive_encryption_key(password_utf8, &profile.kdf.salt)?;
    let plaintext_result = crypto::decrypt(
        &key,
        &profile.cipher.nonce,
        &profile.cipher.tag,
        &aad,
        &profile.cipher.ciphertext,
    );
    key.zeroize();
    let plaintext = zeroize::Zeroizing::new(plaintext_result?);
    let payload = parse_payload(&plaintext, warnings, Uuid::from_bytes(*profile_id))?;
    validate_authenticated_profile(wallet, profile, &payload)?;
    Ok(payload)
}

// AEADだけでは確認できないduplicate_tagの意味とmanifest/payloadの対応を検証する。
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

// mutation後のpayloadと平文indexを同時に新しいnonceで再暗号化する。
fn reencrypt_profile(
    wallet: &mut WalletStore,
    profile_index: usize,
    payload: &ProfilePayload,
    password_utf8: &[u8],
    change_password: bool,
) -> WalletResult<()> {
    let registry_key = zeroize::Zeroizing::new(wallet.registry_key);
    let profile = &mut wallet.profiles[profile_index];
    profile.software_key_index = index_from_payload(payload);
    profile.aad_software_key_index = index_to_values(&profile.software_key_index);
    if change_password {
        profile.kdf.salt = crypto::random()?;
    }
    let mut key = crypto::derive_encryption_key(password_utf8, &profile.kdf.salt)?;
    profile.cipher.nonce = crypto::random()?;
    let aad = profile_aad_from_parts(&registry_key, profile)?;
    let payload_bytes = zeroize::Zeroizing::new(encode_payload(payload)?);
    let encryption = crypto::encrypt(&key, &profile.cipher.nonce, &aad, &payload_bytes);
    key.zeroize();
    let (ciphertext, tag) = encryption?;
    profile.cipher.ciphertext = ciphertext;
    profile.cipher.tag = tag;
    Ok(())
}

// 新規Profileのpayloadを暗号化し、一覧用manifestと認証情報を組み立てる。
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
        aad_software_key_index: index_to_values(&index_from_payload(payload)),
    };
    let mut key = crypto::derive_encryption_key(password_utf8, &profile.kdf.salt)?;
    let aad = profile_aad_from_parts(registry_key, &profile)?;
    let payload_bytes = zeroize::Zeroizing::new(encode_payload(payload)?);
    let encryption = crypto::encrypt(&key, &profile.cipher.nonce, &aad, &payload_bytes);
    key.zeroize();
    let (ciphertext, tag) = encryption?;
    profile.cipher.ciphertext = ciphertext;
    profile.cipher.tag = tag;
    Ok(profile)
}

// 既存Profileのmanifestから、暗号化時と同じAADを再構築する。
fn profile_aad(
    wallet: &WalletStore,
    profile: &ProfileEnvelope,
) -> WalletResult<zeroize::Zeroizing<Vec<u8>>> {
    profile_aad_from_parts(&wallet.registry_key, profile)
}

// AADにはStore、Profile、暗号方式、software_key_indexの全contextを含める。
fn profile_aad_from_parts(
    registry_key: &[u8; 32],
    profile: &ProfileEnvelope,
) -> WalletResult<zeroize::Zeroizing<Vec<u8>>> {
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
        Value::Array(profile.aad_software_key_index.clone()),
    ]))
    .map(zeroize::Zeroizing::new)
    .map_err(|_| WalletError::new(ErrorCode::SerializationFailure))
}

// 保存時はProfileとpayload内のkeyをbytewise昇順へ正規化する。
// indexはAADと同じ受信wire値を保持し、未知fieldを含む既存Profileの認証を壊さない。
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
        (6, Value::Array(profile.aad_software_key_index.clone())),
    ])
}

// payloadの保存順序はkey_idのbytewise昇順とし、登録順に意味を持たせない。
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

// Pendingは対象Store hashをAAD相当のcontextへ含め、別Storeへの移植を防ぐ。
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

// Pendingは固定長のopaque envelopeとして厳密にparseする。
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
    let mut ciphertext = bytes
        .get(offset..offset + 32)
        .ok_or_else(|| WalletError::new(ErrorCode::PendingProfileInvalid))?
        .to_vec();
    offset += 32;
    let tag = match take_array::<16>(bytes, &mut offset) {
        Ok(value) => value,
        Err(error) => {
            ciphertext.zeroize();
            return Err(error);
        }
    };
    if offset != bytes.len() {
        ciphertext.zeroize();
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

fn fixed_bytes_warning(value: Option<&Value>) -> &'static str {
    match value {
        None => "MissingRequiredField",
        Some(Value::Bytes(_)) => "InvalidFieldLength",
        Some(_) => "InvalidFieldType",
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

#[cfg(test)]
mod tests {
    use super::*;

    const MNEMONIC: &[u8] = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
    const PASSWORD: &[u8] = b"correct horse battery staple";

    fn bytes<const N: usize>(hex: &str) -> [u8; N] {
        hex::decode(hex).unwrap().try_into().unwrap()
    }

    fn map_value_mut(map: &mut [(u64, Value)], key: u64) -> &mut Value {
        map.iter_mut()
            .find(|(candidate, _)| *candidate == key)
            .map(|(_, value)| value)
            .unwrap()
    }

    fn first_profile_map_mut(value: &mut Value) -> &mut Vec<(u64, Value)> {
        let map = match value {
            Value::Map(entries) => entries,
            _ => panic!("テストfixtureのStoreがmapではありません"),
        };
        let profiles = match map_value_mut(map, 3) {
            Value::Array(values) => values,
            _ => panic!("テストfixtureのprofilesがarrayではありません"),
        };
        match profiles.first_mut().unwrap() {
            Value::Map(entries) => entries,
            _ => panic!("テストfixtureのProfileがmapではありません"),
        }
    }

    fn mutate_algorithm(store: &[u8], field: u64, algorithm: u64) -> Vec<u8> {
        let mut value = cbor::decode(store).unwrap();
        let profile = first_profile_map_mut(&mut value);
        let algorithm_map = match map_value_mut(profile, field) {
            Value::Map(entries) => entries,
            _ => panic!("テストfixtureのalgorithm objectがmapではありません"),
        };
        *map_value_mut(algorithm_map, 0) = Value::UInt(algorithm);
        cbor::encode(&value).unwrap()
    }

    fn append_invalid_profile_child(store: &[u8]) -> Vec<u8> {
        let mut value = cbor::decode(store).unwrap();
        let map = match &mut value {
            Value::Map(entries) => entries,
            _ => panic!("テストfixtureのStoreがmapではありません"),
        };
        match map_value_mut(map, 3) {
            Value::Array(values) => values.push(Value::UInt(7)),
            _ => panic!("テストfixtureのprofilesがarrayではありません"),
        }
        cbor::encode(&value).unwrap()
    }

    fn duplicate_profile(store: &[u8]) -> Vec<u8> {
        let mut value = cbor::decode(store).unwrap();
        let map = match &mut value {
            Value::Map(entries) => entries,
            _ => panic!("テストfixtureのStoreがmapではありません"),
        };
        match map_value_mut(map, 3) {
            Value::Array(values) => {
                let duplicate = values.first().unwrap().clone();
                values.push(duplicate);
            }
            _ => panic!("テストfixtureのprofilesがarrayではありません"),
        }
        cbor::encode(&value).unwrap()
    }

    fn duplicate_index_entry(store: &[u8]) -> Vec<u8> {
        let mut value = cbor::decode(store).unwrap();
        let profile = first_profile_map_mut(&mut value);
        match map_value_mut(profile, 6) {
            Value::Array(values) => {
                let duplicate = values.first().unwrap().clone();
                values.push(duplicate);
            }
            _ => panic!("テストfixtureのsoftware_key_indexがarrayではありません"),
        }
        cbor::encode(&value).unwrap()
    }

    fn reverse_profiles(store: &[u8]) -> Vec<u8> {
        let mut value = cbor::decode(store).unwrap();
        let map = match &mut value {
            Value::Map(entries) => entries,
            _ => panic!("テストfixtureのStoreがmapではありません"),
        };
        match map_value_mut(map, 3) {
            Value::Array(values) => values.reverse(),
            _ => panic!("テストfixtureのprofilesがarrayではありません"),
        }
        cbor::encode(&value).unwrap()
    }

    fn reverse_index(store: &[u8]) -> Vec<u8> {
        let mut value = cbor::decode(store).unwrap();
        let profile = first_profile_map_mut(&mut value);
        match map_value_mut(profile, 6) {
            Value::Array(values) => values.reverse(),
            _ => panic!("テストfixtureのsoftware_key_indexがarrayではありません"),
        }
        cbor::encode(&value).unwrap()
    }

    fn add_unknown_index_field_with_matching_aad(store: &[u8]) -> Vec<u8> {
        let (wallet, _) = decode_store(store).unwrap();
        let profile = wallet.profiles.first().unwrap();
        let old_aad = profile_aad(&wallet, profile).unwrap();
        let key = crypto::derive_encryption_key(PASSWORD, &profile.kdf.salt).unwrap();
        let plaintext = zeroize::Zeroizing::new(
            crypto::decrypt(
                &key,
                &profile.cipher.nonce,
                &profile.cipher.tag,
                &old_aad,
                &profile.cipher.ciphertext,
            )
            .unwrap(),
        );

        let mut updated_profile = profile.clone();
        match updated_profile.aad_software_key_index.first_mut().unwrap() {
            Value::Map(entries) => entries.push((99, Value::UInt(7))),
            _ => panic!("テストfixtureのindex entryがmapではありません"),
        }
        let new_aad = profile_aad_from_parts(&wallet.registry_key, &updated_profile).unwrap();
        let (ciphertext, tag) =
            crypto::encrypt(&key, &updated_profile.cipher.nonce, &new_aad, &plaintext).unwrap();
        updated_profile.cipher.ciphertext = ciphertext;
        updated_profile.cipher.tag = tag;

        let mut profile_value = profile_to_value(&updated_profile);
        let profile_map = match &mut profile_value {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        let index = match map_value_mut(profile_map, 6) {
            Value::Array(values) => values,
            _ => unreachable!(),
        };
        assert!(matches!(index.first(), Some(Value::Map(_))));

        cbor::encode(&Value::Map(vec![
            (0, Value::Bytes(MAGIC.to_vec())),
            (1, Value::UInt(STORE_VERSION)),
            (2, Value::Bytes(wallet.registry_key.to_vec())),
            (3, Value::Array(vec![profile_value])),
        ]))
        .unwrap()
    }

    fn tamper_ciphertext(store: &[u8]) -> Vec<u8> {
        let mut value = cbor::decode(store).unwrap();
        let profile = first_profile_map_mut(&mut value);
        let cipher = match map_value_mut(profile, 5) {
            Value::Map(entries) => entries,
            _ => panic!("テストfixtureのcipherがmapではありません"),
        };
        match map_value_mut(cipher, 2) {
            Value::Bytes(bytes) => bytes[0] ^= 1,
            _ => panic!("テストfixtureのciphertextがbytesではありません"),
        }
        cbor::encode(&value).unwrap()
    }

    #[test]
    fn decode_warnings_and_fatal_errors_follow_the_store_specification() {
        let store = create_empty_store().unwrap();
        let restored = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
        let profile_id = restored.value.profile_id;

        for (field, name) in [(4, "kdf"), (5, "cipher")] {
            let malformed = mutate_algorithm(&restored.store, field, 99);
            let result = list_profiles(&malformed).unwrap();
            assert!(result.value.is_empty());
            assert_eq!(
                result.warnings,
                vec![DecodeWarning {
                    code: "UnknownEnumValue",
                    object_type: "ProfileEnvelope",
                    object_id: Some(profile_id),
                    field: Some(name),
                }]
            );
        }

        let with_invalid_child = append_invalid_profile_child(&restored.store);
        let result = list_profiles(&with_invalid_child).unwrap();
        assert_eq!(result.value.len(), 1);
        assert_eq!(
            result.warnings,
            vec![DecodeWarning {
                code: "InvalidFieldType",
                object_type: "ProfileEnvelope",
                object_id: None,
                field: None,
            }]
        );

        assert_eq!(
            list_profiles(&duplicate_profile(&restored.store))
                .unwrap_err()
                .code,
            ErrorCode::InvalidStore
        );

        let derived =
            derive_software_key(&restored.store, profile_id, PASSWORD, Chain::Symbol, 0).unwrap();
        assert_eq!(
            list_profiles(&duplicate_index_entry(&derived.store))
                .unwrap_err()
                .code,
            ErrorCode::InvalidStore
        );

        assert_eq!(
            list_profiles(&[0x01]).unwrap_err().code,
            ErrorCode::InvalidStore
        );

        let before = restored.store.clone();
        assert_eq!(
            export_mnemonic(&tamper_ciphertext(&restored.store), profile_id, PASSWORD,)
                .unwrap_err()
                .code,
            ErrorCode::AuthenticationFailed
        );
        assert_eq!(restored.store, before);
    }

    #[test]
    fn decoder_preserves_index_wire_value_for_aad_and_rejects_noncanonical_order() {
        let store = create_empty_store().unwrap();
        let restored = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
        let profile_id = restored.value.profile_id;
        let derived =
            derive_software_key(&restored.store, profile_id, PASSWORD, Chain::Symbol, 0).unwrap();

        let with_unknown_field = add_unknown_index_field_with_matching_aad(&derived.store);
        assert!(export_mnemonic(&with_unknown_field, profile_id, PASSWORD).is_ok());

        let second_profile =
            restore_profile(&with_unknown_field, MNEMONIC, PASSWORD, Network::Testnet).unwrap();
        assert!(export_mnemonic(&second_profile.store, profile_id, PASSWORD).is_ok());
        assert_eq!(
            list_profiles(&reverse_profiles(&second_profile.store))
                .unwrap_err()
                .code,
            ErrorCode::InvalidStore
        );

        let second_key =
            derive_software_key(&derived.store, profile_id, PASSWORD, Chain::Symbol, 1).unwrap();
        assert_eq!(
            list_profiles(&reverse_index(&second_key.store))
                .unwrap_err()
                .code,
            ErrorCode::InvalidStore
        );
    }

    #[test]
    fn payload_key_order_and_fixed_field_warning_codes_follow_the_format() {
        let unsorted_payload = Value::Map(vec![
            (0, Value::Bytes(vec![0; 32])),
            (
                1,
                Value::Array(vec![
                    key_to_value(&KeyRecord {
                        key_id: [2; 16],
                        chain: Chain::Symbol,
                        private_key: [1; 32],
                        origin: SoftwareKeyOrigin::Imported,
                    }),
                    key_to_value(&KeyRecord {
                        key_id: [1; 16],
                        chain: Chain::Symbol,
                        private_key: [2; 32],
                        origin: SoftwareKeyOrigin::Imported,
                    }),
                ]),
            ),
        ]);
        let mut warnings = Vec::new();
        assert_eq!(
            parse_payload(
                &cbor::encode(&unsorted_payload).unwrap(),
                &mut warnings,
                Uuid::nil()
            )
            .err()
            .unwrap()
            .code,
            ErrorCode::InvalidStore
        );

        let profile = Value::Map(vec![
            (0, Value::Bytes([1; 16].to_vec())),
            (1, Value::UInt(Network::Mainnet.wire())),
            (2, Value::Bytes([2; 32].to_vec())),
            (3, Value::UInt(PROFILE_SCHEMA_VERSION)),
            (
                4,
                Value::Map(vec![
                    (0, Value::UInt(KDF_ALGORITHM)),
                    (1, Value::UInt(crypto::KDF_VERSION as u64)),
                    (2, Value::UInt(crypto::KDF_MEMORY_KIB as u64)),
                    (3, Value::UInt(crypto::KDF_ITERATIONS as u64)),
                    (4, Value::UInt(crypto::KDF_PARALLELISM as u64)),
                    (5, Value::Bytes([3; 16].to_vec())),
                ]),
            ),
            (
                5,
                Value::Map(vec![
                    (0, Value::UInt(CIPHER_ALGORITHM)),
                    (1, Value::Bytes([4; 12].to_vec())),
                    (2, Value::Bytes(Vec::new())),
                    (3, Value::Bytes([5; 16].to_vec())),
                ]),
            ),
            (6, Value::Array(Vec::new())),
        ]);

        let warning_for = |field: u64, replacement: Option<Value>| {
            let mut value = profile.clone();
            let map = match &mut value {
                Value::Map(entries) => entries,
                _ => unreachable!(),
            };
            if let Some(replacement) = replacement {
                *map_value_mut(map, field) = replacement;
            } else {
                map.retain(|(key, _)| *key != field);
            }
            let mut warnings = Vec::new();
            assert!(parse_profile(&value, &mut warnings).unwrap().is_none());
            warnings.pop().unwrap().code
        };

        assert_eq!(warning_for(2, Some(Value::UInt(1))), "InvalidFieldType");
        assert_eq!(
            warning_for(2, Some(Value::Bytes(vec![1]))),
            "InvalidFieldLength"
        );
        assert_eq!(warning_for(2, None), "MissingRequiredField");

        let mut key_warnings = Vec::new();
        let key = Value::Map(vec![
            (0, Value::Bytes([1; 16].to_vec())),
            (1, Value::UInt(Chain::Symbol.wire())),
            (3, Value::Map(vec![(0, Value::UInt(1))])),
        ]);
        assert!(parse_key_record(&key, &mut key_warnings, Uuid::nil()).is_none());
        assert_eq!(key_warnings.pop().unwrap().code, "MissingRequiredField");

        let mut key_warnings = Vec::new();
        let key = Value::Map(vec![
            (0, Value::Bytes([1; 16].to_vec())),
            (1, Value::UInt(Chain::Symbol.wire())),
            (2, Value::UInt(1)),
            (3, Value::Map(vec![(0, Value::UInt(1))])),
        ]);
        assert!(parse_key_record(&key, &mut key_warnings, Uuid::nil()).is_none());
        assert_eq!(key_warnings.pop().unwrap().code, "InvalidFieldType");

        let mut key_warnings = Vec::new();
        let key = Value::Map(vec![
            (0, Value::Bytes([1; 16].to_vec())),
            (1, Value::UInt(Chain::Symbol.wire())),
            (2, Value::Bytes(vec![1])),
            (3, Value::Map(vec![(0, Value::UInt(1))])),
        ]);
        assert!(parse_key_record(&key, &mut key_warnings, Uuid::nil()).is_none());
        assert_eq!(key_warnings.pop().unwrap().code, "InvalidFieldLength");
    }

    #[test]
    fn store_version_missing_or_wrong_type_is_invalid_store() {
        let store = create_empty_store().unwrap();
        let mut value = cbor::decode(&store).unwrap();
        let map = match &mut value {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        map.retain(|(key, _)| *key != 1);
        assert_eq!(
            list_profiles(&cbor::encode(&value).unwrap())
                .unwrap_err()
                .code,
            ErrorCode::InvalidStore
        );

        let mut value = cbor::decode(&store).unwrap();
        let map = match &mut value {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        *map_value_mut(map, 1) = Value::Text("1".to_owned());
        assert_eq!(
            list_profiles(&cbor::encode(&value).unwrap())
                .unwrap_err()
                .code,
            ErrorCode::InvalidStore
        );
    }

    #[test]
    fn fixed_aad_and_duplicate_tag_fixture_values() {
        let registry_key = [0u8; 32];
        let profile = ProfileEnvelope {
            profile_id: [1; 16],
            network: Network::Mainnet,
            duplicate_tag: [2; 32],
            kdf: KdfParams { salt: [3; 16] },
            cipher: Ciphertext {
                nonce: [4; 12],
                ciphertext: vec![5, 6, 7],
                tag: [8; 16],
            },
            software_key_index: Vec::new(),
            aad_software_key_index: Vec::new(),
        };
        let aad = profile_aad_from_parts(&registry_key, &profile).unwrap();
        let duplicate = crypto::duplicate_tag(&registry_key, Network::Mainnet, &[9; 32]);
        assert_eq!(
            hex::encode(aad.as_slice()),
            "8a44534e574301582000000000000000000000000000000000000000000000000000000000000000005001010101010101010101010101010101015820020202020202020202020202020202020202020202020202020202020202020201000080"
        );
        assert_eq!(
            duplicate,
            bytes::<32>("9F23CC1A769817319576D8889072BB9AC635A1F1A1CC5EB086DF720CCF5D002A")
        );
    }
}

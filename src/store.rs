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
    unknown_fields: Vec<(u64, Value)>,
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
    // 未知fieldは意味解釈せず、mutation時にwire値を再出力する。
    unknown_fields: Vec<(u64, Value)>,
}

impl Drop for ProfileEnvelope {
    fn drop(&mut self) {
        self.duplicate_tag.zeroize();
    }
}

#[derive(Clone)]
struct KdfParams {
    salt: [u8; 16],
    unknown_fields: Vec<(u64, Value)>,
}

#[derive(Clone)]
struct Ciphertext {
    nonce: [u8; 12],
    ciphertext: Vec<u8>,
    tag: [u8; 16],
    unknown_fields: Vec<(u64, Value)>,
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
    unknown_fields: Vec<(u64, Value)>,
    origin_unknown_fields: Vec<(u64, Value)>,
}

impl Drop for KeyRecord {
    fn drop(&mut self) {
        self.private_key.zeroize();
    }
}

struct ProfilePayload {
    mnemonic_entropy: [u8; 32],
    software_keys: Vec<KeyRecord>,
    unknown_fields: Vec<(u64, Value)>,
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
        unknown_fields: Vec::new(),
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
        unknown_fields: Vec::new(),
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
        unknown_fields: Vec::new(),
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
        unknown_fields: Vec::new(),
        origin_unknown_fields: Vec::new(),
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
        unknown_fields: Vec::new(),
        origin_unknown_fields: Vec::new(),
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
        unknown_fields: Vec::new(),
        origin_unknown_fields: Vec::new(),
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

// StoreとProfileの構造不正は、部分的に読み飛ばさずStore全体を拒否する。
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

    let mut profiles = Vec::with_capacity(profiles_array.len());
    for value in profiles_array {
        let profile = parse_profile(value)?;
        if profiles
            .last()
            .is_some_and(|previous: &ProfileEnvelope| previous.profile_id >= profile.profile_id)
        {
            return Err(WalletError::new(ErrorCode::InvalidStore));
        }
        profiles.push(profile);
    }
    Ok((
        WalletStore {
            registry_key: *registry_key,
            profiles,
            unknown_fields: unknown_fields(map, &[0, 1, 2, 3]),
        },
        Vec::new(),
    ))
}

// ProfileEnvelopeの必須field、enum、index順序を検証する。
fn parse_profile(value: &Value) -> WalletResult<ProfileEnvelope> {
    let map = as_map(value).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let profile_id = fixed_bytes(map_value(map, 0), 16)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let network = parse_network(map_value(map, 1))
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let duplicate_tag = fixed_bytes(map_value(map, 2), 32)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    match map_value(map, 3) {
        Some(Value::UInt(PROFILE_SCHEMA_VERSION)) => {}
        Some(Value::UInt(_)) => {
            return Err(WalletError::new(ErrorCode::UnsupportedProfileSchemaVersion))
        }
        None | Some(_) => return Err(WalletError::new(ErrorCode::InvalidStore)),
    }
    let kdf = parse_kdf(map_value(map, 4))?;
    let cipher = parse_cipher(map_value(map, 5))?;
    let index_values = map_value(map, 6)
        .and_then(as_array)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let aad_software_key_index = index_values.to_vec();
    let mut software_key_index = Vec::with_capacity(index_values.len());
    for value in index_values {
        let entry = parse_index_entry(value)?;
        if software_key_index
            .last()
            .is_some_and(|previous: &IndexEntry| previous.key_id >= entry.key_id)
        {
            return Err(WalletError::new(ErrorCode::InvalidStore));
        }
        software_key_index.push(entry);
    }
    Ok(ProfileEnvelope {
        profile_id,
        network,
        duplicate_tag,
        kdf,
        cipher,
        software_key_index,
        aad_software_key_index,
        unknown_fields: unknown_fields(map, &[0, 1, 2, 3, 4, 5, 6]),
    })
}

// KDFはv1で固定されたArgon2idのパラメータだけを受理する。
fn parse_kdf(value: Option<&Value>) -> WalletResult<KdfParams> {
    let map = value
        .and_then(as_map)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    if uint(map_value(map, 0)) != Some(KDF_ALGORITHM)
        || uint(map_value(map, 1)) != Some(crypto::KDF_VERSION as u64)
        || uint(map_value(map, 2)) != Some(crypto::KDF_MEMORY_KIB as u64)
        || uint(map_value(map, 3)) != Some(crypto::KDF_ITERATIONS as u64)
        || uint(map_value(map, 4)) != Some(crypto::KDF_PARALLELISM as u64)
    {
        return Err(WalletError::new(ErrorCode::InvalidStore));
    }
    Ok(KdfParams {
        salt: fixed_bytes(map_value(map, 5), 16)
            .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?,
        unknown_fields: unknown_fields(map, &[0, 1, 2, 3, 4, 5]),
    })
}

// Cipherはv1で固定されたAES-256-GCMのnonce、ciphertext、tagを保持する。
fn parse_cipher(value: Option<&Value>) -> WalletResult<Ciphertext> {
    let map = value
        .and_then(as_map)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    if uint(map_value(map, 0)) != Some(CIPHER_ALGORITHM) {
        return Err(WalletError::new(ErrorCode::InvalidStore));
    }
    let nonce = fixed_bytes(map_value(map, 1), 12)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let ciphertext = match map_value(map, 2) {
        Some(Value::Bytes(value)) => value.clone(),
        _ => return Err(WalletError::new(ErrorCode::InvalidStore)),
    };
    let tag = fixed_bytes(map_value(map, 3), 16)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    Ok(Ciphertext {
        nonce,
        ciphertext,
        tag,
        unknown_fields: unknown_fields(map, &[0, 1, 2, 3]),
    })
}

// 平文indexはprivate keyを含まず、一覧取得用のkey_idとChainだけを保持する。
fn parse_index_entry(value: &Value) -> WalletResult<IndexEntry> {
    let map = as_map(value).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let key_id = fixed_bytes(map_value(map, 0), 16)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let chain =
        parse_chain(map_value(map, 1)).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    Ok(IndexEntry { key_id, chain })
}

// 認証済みciphertextを復号した後にだけ呼び出し、payload内の子Keyを解釈する。
fn parse_payload(bytes: &[u8]) -> WalletResult<ProfilePayload> {
    let value = cbor::decode(bytes).map_err(|_| WalletError::new(ErrorCode::InvalidStore))?;
    let map = as_map(&value).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let mnemonic_entropy = zeroize::Zeroizing::new(
        fixed_bytes(map_value(map, 0), 32)
            .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?,
    );
    let values = map_value(map, 1)
        .and_then(as_array)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let mut software_keys = Vec::with_capacity(values.len());
    for value in values {
        let record = parse_key_record(value)?;
        if software_keys
            .last()
            .is_some_and(|previous: &KeyRecord| previous.key_id >= record.key_id)
        {
            return Err(WalletError::new(ErrorCode::InvalidStore));
        }
        software_keys.push(record);
    }
    Ok(ProfilePayload {
        mnemonic_entropy: *mnemonic_entropy,
        software_keys,
        unknown_fields: unknown_fields(map, &[0, 1]),
    })
}

// SoftwareKeyRecordの不正はskipせず、Store全体を拒否する。
fn parse_key_record(value: &Value) -> WalletResult<KeyRecord> {
    let map = as_map(value).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let key_id = fixed_bytes(map_value(map, 0), 16)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let chain =
        parse_chain(map_value(map, 1)).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let private_key = fixed_bytes(map_value(map, 2), 32)
        .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let origin_map =
        as_map(map_value(map, 3).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?)
            .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let origin_wire =
        uint(map_value(origin_map, 0)).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    let origin = match origin_wire {
        0 => {
            let account_index = uint(map_value(origin_map, 1))
                .ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
            if account_index > 2_147_483_647 {
                return Err(WalletError::new(ErrorCode::InvalidStore));
            }
            SoftwareKeyOrigin::Derived {
                account_index: account_index as u32,
            }
        }
        1 => SoftwareKeyOrigin::Imported,
        2 => SoftwareKeyOrigin::Generated,
        _ => return Err(WalletError::new(ErrorCode::InvalidStore)),
    };
    let origin_known_fields = match origin {
        SoftwareKeyOrigin::Derived { .. } => &[0, 1][..],
        SoftwareKeyOrigin::Imported | SoftwareKeyOrigin::Generated => &[0][..],
    };
    Ok(KeyRecord {
        key_id,
        chain,
        private_key,
        origin,
        unknown_fields: unknown_fields(map, &[0, 1, 2, 3]),
        origin_unknown_fields: unknown_fields(origin_map, origin_known_fields),
    })
}

// Profile認証の順序は、AAD認証、payload構造検証、duplicate_tag意味検証、
// index整合性検証、private key妥当性検証の順に固定する。
fn authenticate_profile(
    wallet: &WalletStore,
    profile_id: &[u8; 16],
    password_utf8: &[u8],
    _warnings: &mut Vec<DecodeWarning>,
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
    let payload = parse_payload(&plaintext)?;
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
    profile.aad_software_key_index =
        index_values_from_payload(payload, &profile.aad_software_key_index);
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
            unknown_fields: Vec::new(),
        },
        cipher: Ciphertext {
            nonce: crypto::random()?,
            ciphertext: Vec::new(),
            tag: [0u8; 16],
            unknown_fields: Vec::new(),
        },
        software_key_index: index_from_payload(payload),
        aad_software_key_index: index_to_values(&index_from_payload(payload)),
        unknown_fields: Vec::new(),
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
// 既知fieldだけを再構築し、未知fieldは意味解釈せずwire値を保持する。
fn encode_store(wallet: &WalletStore) -> WalletResult<Vec<u8>> {
    let mut profiles = wallet.profiles.clone();
    profiles.sort_by_key(|profile| profile.profile_id);
    let mut fields = vec![
        (0, Value::Bytes(MAGIC.to_vec())),
        (1, Value::UInt(STORE_VERSION)),
        (2, Value::Bytes(wallet.registry_key.to_vec())),
        (
            3,
            Value::Array(profiles.iter().map(profile_to_value).collect()),
        ),
    ];
    fields.extend(
        wallet
            .unknown_fields
            .iter()
            .map(|(key, value)| (*key, value.clone())),
    );
    cbor::encode(&Value::Map(fields)).map_err(|_| WalletError::new(ErrorCode::SerializationFailure))
}

fn profile_to_value(profile: &ProfileEnvelope) -> Value {
    let mut fields = vec![
        (0, Value::Bytes(profile.profile_id.to_vec())),
        (1, Value::UInt(profile.network.wire())),
        (2, Value::Bytes(profile.duplicate_tag.to_vec())),
        (3, Value::UInt(PROFILE_SCHEMA_VERSION)),
        (4, kdf_to_value(&profile.kdf)),
        (5, cipher_to_value(&profile.cipher)),
        (6, Value::Array(profile.aad_software_key_index.clone())),
    ];
    fields.extend(
        profile
            .unknown_fields
            .iter()
            .map(|(key, value)| (*key, value.clone())),
    );
    Value::Map(fields)
}

// payloadの保存順序はkey_idのbytewise昇順とし、登録順に意味を持たせない。
fn encode_payload(payload: &ProfilePayload) -> WalletResult<Vec<u8>> {
    let mut keys = payload.software_keys.clone();
    keys.sort_by_key(|key| key.key_id);
    let mut fields = vec![
        (0, Value::Bytes(payload.mnemonic_entropy.to_vec())),
        (1, Value::Array(keys.iter().map(key_to_value).collect())),
    ];
    fields.extend(
        payload
            .unknown_fields
            .iter()
            .map(|(key, value)| (*key, value.clone())),
    );
    cbor::encode(&Value::Map(fields)).map_err(|_| WalletError::new(ErrorCode::SerializationFailure))
}

fn key_to_value(key: &KeyRecord) -> Value {
    let mut origin_fields = match key.origin {
        SoftwareKeyOrigin::Derived { account_index } => {
            vec![(0, Value::UInt(0)), (1, Value::UInt(account_index as u64))]
        }
        SoftwareKeyOrigin::Imported => vec![(0, Value::UInt(1))],
        SoftwareKeyOrigin::Generated => vec![(0, Value::UInt(2))],
    };
    origin_fields.extend(
        key.origin_unknown_fields
            .iter()
            .map(|(field, value)| (*field, value.clone())),
    );
    let mut fields = vec![
        (0, Value::Bytes(key.key_id.to_vec())),
        (1, Value::UInt(key.chain.wire())),
        (2, Value::Bytes(key.private_key.to_vec())),
        (3, Value::Map(origin_fields)),
    ];
    fields.extend(
        key.unknown_fields
            .iter()
            .map(|(field, value)| (*field, value.clone())),
    );
    Value::Map(fields)
}

fn kdf_to_value(kdf: &KdfParams) -> Value {
    let mut fields = vec![
        (0, Value::UInt(KDF_ALGORITHM)),
        (1, Value::UInt(crypto::KDF_VERSION as u64)),
        (2, Value::UInt(crypto::KDF_MEMORY_KIB as u64)),
        (3, Value::UInt(crypto::KDF_ITERATIONS as u64)),
        (4, Value::UInt(crypto::KDF_PARALLELISM as u64)),
        (5, Value::Bytes(kdf.salt.to_vec())),
    ];
    fields.extend(
        kdf.unknown_fields
            .iter()
            .map(|(key, value)| (*key, value.clone())),
    );
    Value::Map(fields)
}

fn cipher_to_value(cipher: &Ciphertext) -> Value {
    let mut fields = vec![
        (0, Value::UInt(CIPHER_ALGORITHM)),
        (1, Value::Bytes(cipher.nonce.to_vec())),
        (2, Value::Bytes(cipher.ciphertext.clone())),
        (3, Value::Bytes(cipher.tag.to_vec())),
    ];
    fields.extend(
        cipher
            .unknown_fields
            .iter()
            .map(|(key, value)| (*key, value.clone())),
    );
    Value::Map(fields)
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

// 既存indexのunknown fieldをkey_idで引き継ぎ、既知fieldだけを更新する。
fn index_values_from_payload(payload: &ProfilePayload, existing: &[Value]) -> Vec<Value> {
    index_from_payload(payload)
        .into_iter()
        .map(|entry| {
            let unknown = existing
                .iter()
                .find(|value| {
                    as_map(value)
                        .and_then(|map| fixed_bytes(map_value(map, 0), 16))
                        .is_some_and(|key_id| key_id == entry.key_id)
                })
                .and_then(as_map)
                .map(|map| unknown_fields(map, &[0, 1]))
                .unwrap_or_default();
            let mut fields = vec![
                (0, Value::Bytes(entry.key_id.to_vec())),
                (1, Value::UInt(entry.chain.wire())),
            ];
            fields.extend(unknown);
            Value::Map(fields)
        })
        .collect()
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

fn unknown_fields(map: &[(u64, Value)], known: &[u64]) -> Vec<(u64, Value)> {
    map.iter()
        .filter(|(key, _)| !known.contains(key))
        .map(|(key, value)| (*key, value.clone()))
        .collect()
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

    fn add_unknown_manifest_fields(store: &[u8]) -> Vec<u8> {
        let mut value = cbor::decode(store).unwrap();
        let map = match &mut value {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        map.push((99, Value::Text("store-extension".to_owned())));
        let profile = first_profile_map_mut(&mut value);
        profile.push((99, Value::Text("profile-extension".to_owned())));
        let kdf = match map_value_mut(profile, 4) {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        kdf.push((99, Value::Text("kdf-extension".to_owned())));
        let cipher = match map_value_mut(profile, 5) {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        cipher.push((99, Value::Text("cipher-extension".to_owned())));
        cbor::encode(&value).unwrap()
    }

    fn add_unknown_payload_fields(store: &[u8]) -> Vec<u8> {
        let (mut wallet, _) = decode_store(store).unwrap();
        let profile = wallet.profiles.first().unwrap();
        let key = crypto::derive_encryption_key(PASSWORD, &profile.kdf.salt).unwrap();
        let aad = profile_aad(&wallet, profile).unwrap();
        let plaintext = zeroize::Zeroizing::new(
            crypto::decrypt(
                &key,
                &profile.cipher.nonce,
                &profile.cipher.tag,
                &aad,
                &profile.cipher.ciphertext,
            )
            .unwrap(),
        );
        let mut payload = cbor::decode(&plaintext).unwrap();
        let payload_map = match &mut payload {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        payload_map.push((99, Value::Text("payload-extension".to_owned())));
        let keys = match map_value_mut(payload_map, 1) {
            Value::Array(values) => values,
            _ => unreachable!(),
        };
        let key_map = match keys.first_mut().unwrap() {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        key_map.push((99, Value::Text("key-extension".to_owned())));
        let origin = match map_value_mut(key_map, 3) {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        origin.push((99, Value::Text("origin-extension".to_owned())));
        let payload_bytes = zeroize::Zeroizing::new(cbor::encode(&payload).unwrap());
        let (ciphertext, tag) =
            crypto::encrypt(&key, &profile.cipher.nonce, &aad, &payload_bytes).unwrap();
        let profile = wallet.profiles.first_mut().unwrap();
        profile.cipher.ciphertext = ciphertext;
        profile.cipher.tag = tag;
        encode_store(&wallet).unwrap()
    }

    fn replace_duplicate_tag_with_authenticated_value(store: &[u8]) -> Vec<u8> {
        let (mut wallet, _) = decode_store(store).unwrap();
        let profile = wallet.profiles.first().unwrap();
        let key = crypto::derive_encryption_key(PASSWORD, &profile.kdf.salt).unwrap();
        let old_aad = profile_aad(&wallet, profile).unwrap();
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
        wallet.profiles.first_mut().unwrap().duplicate_tag = [0xA5; 32];
        let profile = wallet.profiles.first().unwrap();
        let new_aad = profile_aad(&wallet, profile).unwrap();
        let (ciphertext, tag) =
            crypto::encrypt(&key, &profile.cipher.nonce, &new_aad, &plaintext).unwrap();
        let profile = wallet.profiles.first_mut().unwrap();
        profile.cipher.ciphertext = ciphertext;
        profile.cipher.tag = tag;
        encode_store(&wallet).unwrap()
    }

    #[test]
    fn malformed_profiles_and_unknown_enums_are_fatal_store_errors() {
        let store = create_empty_store().unwrap();
        let restored = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
        let profile_id = restored.value.profile_id;

        for (field, name) in [(4, "kdf"), (5, "cipher")] {
            let malformed = mutate_algorithm(&restored.store, field, 99);
            assert_eq!(
                list_profiles(&malformed).unwrap_err().code,
                ErrorCode::InvalidStore,
                "未知enum {name} はProfileをskipせずfatalにする"
            );
        }

        let with_invalid_child = append_invalid_profile_child(&restored.store);
        assert_eq!(
            list_profiles(&with_invalid_child).unwrap_err().code,
            ErrorCode::InvalidStore
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
    fn unknown_wire_fields_survive_non_target_and_target_mutations() {
        let store = create_empty_store().unwrap();
        let restored = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
        let profile_id = restored.value.profile_id;
        let derived =
            derive_software_key(&restored.store, profile_id, PASSWORD, Chain::Symbol, 0).unwrap();
        let with_index = add_unknown_index_field_with_matching_aad(&derived.store);
        let with_manifest = add_unknown_manifest_fields(&with_index);
        let with_payload = add_unknown_payload_fields(&with_manifest);

        // 別Profileの追加で、対象外Profileのwire値を再構築してもunknown fieldを失わない。
        let second = restore_profile(&with_payload, MNEMONIC, PASSWORD, Network::Testnet).unwrap();
        let mutated =
            derive_software_key(&second.store, profile_id, PASSWORD, Chain::Nem, 1).unwrap();
        let value = cbor::decode(&mutated.store).unwrap();
        let map = match &value {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        assert!(map_value(map, 99).is_some());
        let profiles = match map_value(map, 3).unwrap() {
            Value::Array(values) => values,
            _ => unreachable!(),
        };
        let target = profiles
            .iter()
            .find(|value| {
                as_map(value).and_then(|map| fixed_bytes(map_value(map, 0), 16))
                    == Some(profile_id.into_bytes())
            })
            .unwrap();
        let target_map = as_map(target).unwrap();
        assert!(map_value(target_map, 99).is_some());
        assert!(as_map(map_value(target_map, 4).unwrap())
            .unwrap()
            .iter()
            .any(|(key, _)| *key == 99));
        assert!(as_map(map_value(target_map, 5).unwrap())
            .unwrap()
            .iter()
            .any(|(key, _)| *key == 99));
        let index = match map_value(target_map, 6).unwrap() {
            Value::Array(values) => values,
            _ => unreachable!(),
        };
        assert!(index
            .iter()
            .any(|value| { as_map(value).unwrap().iter().any(|(key, _)| *key == 99) }));

        let wallet = decode_store(&mutated.store).unwrap().0;
        let target_profile = wallet
            .profiles
            .iter()
            .find(|profile| profile.profile_id == profile_id.into_bytes())
            .unwrap();
        let key = crypto::derive_encryption_key(PASSWORD, &target_profile.kdf.salt).unwrap();
        let aad = profile_aad(&wallet, target_profile).unwrap();
        let plaintext = zeroize::Zeroizing::new(
            crypto::decrypt(
                &key,
                &target_profile.cipher.nonce,
                &target_profile.cipher.tag,
                &aad,
                &target_profile.cipher.ciphertext,
            )
            .unwrap(),
        );
        let payload = cbor::decode(&plaintext).unwrap();
        let payload_map = as_map(&payload).unwrap();
        assert!(map_value(payload_map, 99).is_some());
        let keys = match map_value(payload_map, 1).unwrap() {
            Value::Array(values) => values,
            _ => unreachable!(),
        };
        let key_map = keys
            .iter()
            .filter_map(as_map)
            .find(|map| map_value(map, 99).is_some())
            .unwrap();
        assert!(as_map(map_value(key_map, 3).unwrap())
            .unwrap()
            .iter()
            .any(|(key, _)| *key == 99));
    }

    #[test]
    fn restore_continues_when_existing_plaintext_tag_does_not_match_candidate() {
        let store = create_empty_store().unwrap();
        let restored = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
        let inconsistent = replace_duplicate_tag_with_authenticated_value(&restored.store);
        let result = restore_profile(&inconsistent, MNEMONIC, PASSWORD, Network::Mainnet);
        assert!(result.is_ok());
    }

    #[test]
    fn payload_order_and_fixed_fields_are_fatal_store_errors() {
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
                        unknown_fields: Vec::new(),
                        origin_unknown_fields: Vec::new(),
                    }),
                    key_to_value(&KeyRecord {
                        key_id: [1; 16],
                        chain: Chain::Symbol,
                        private_key: [2; 32],
                        origin: SoftwareKeyOrigin::Imported,
                        unknown_fields: Vec::new(),
                        origin_unknown_fields: Vec::new(),
                    }),
                ]),
            ),
        ]);
        assert_eq!(
            parse_payload(&cbor::encode(&unsorted_payload).unwrap())
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

        let error_for = |field: u64, replacement: Option<Value>| {
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
            parse_profile(&value).err().unwrap().code
        };

        assert_eq!(error_for(2, Some(Value::UInt(1))), ErrorCode::InvalidStore);
        assert_eq!(
            error_for(2, Some(Value::Bytes(vec![1]))),
            ErrorCode::InvalidStore
        );
        assert_eq!(error_for(2, None), ErrorCode::InvalidStore);

        let key = Value::Map(vec![
            (0, Value::Bytes([1; 16].to_vec())),
            (1, Value::UInt(Chain::Symbol.wire())),
            (3, Value::Map(vec![(0, Value::UInt(1))])),
        ]);
        assert_eq!(
            parse_key_record(&key).err().unwrap().code,
            ErrorCode::InvalidStore
        );

        let key = Value::Map(vec![
            (0, Value::Bytes([1; 16].to_vec())),
            (1, Value::UInt(Chain::Symbol.wire())),
            (2, Value::UInt(1)),
            (3, Value::Map(vec![(0, Value::UInt(1))])),
        ]);
        assert_eq!(
            parse_key_record(&key).err().unwrap().code,
            ErrorCode::InvalidStore
        );

        let key = Value::Map(vec![
            (0, Value::Bytes([1; 16].to_vec())),
            (1, Value::UInt(Chain::Symbol.wire())),
            (2, Value::Bytes(vec![1])),
            (3, Value::Map(vec![(0, Value::UInt(1))])),
        ]);
        assert_eq!(
            parse_key_record(&key).err().unwrap().code,
            ErrorCode::InvalidStore
        );
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
            kdf: KdfParams {
                salt: [3; 16],
                unknown_fields: Vec::new(),
            },
            cipher: Ciphertext {
                nonce: [4; 12],
                ciphertext: vec![5, 6, 7],
                tag: [8; 16],
                unknown_fields: Vec::new(),
            },
            software_key_index: Vec::new(),
            aad_software_key_index: Vec::new(),
            unknown_fields: Vec::new(),
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

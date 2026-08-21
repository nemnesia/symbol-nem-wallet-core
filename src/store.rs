//! Wallet Store v1のdecode、暗号化payload認証、atomic更新を担当するモジュール。
//!
//! 平文manifestは一覧処理に使用し、MnemonicとSoftware KeyはProfile passwordから
//! 導出した鍵で暗号化する。更新処理では入力Storeを変更せず、新しいbyte列を返す。
//!
//! デコードではStore全体の構造・canonical order・ID一意性を先に検証する。
//! 認証が必要な操作では、AAD、復号payload、`duplicate_tag`、平文indexとpayloadの
//! 対応を順番に検証してから秘密情報を利用する。

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
    // Store単位の秘密。Profile重複tagのdomain separationに使用する。
    registry_key: [u8; 32],
    // 一覧処理とProfile単位のmutationが対象にする順序付きenvelope。
    profiles: Vec<ProfileEnvelope>,
    // v1が解釈しないtop-level field。mutation時もwire値を保持する。
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
    // 秘密payloadを復号せずに解決できる公開manifest。
    profile_id: [u8; 16],
    network: Network,
    // Mnemonic + Networkとの意味的一致を認証後に検証するtag。
    duplicate_tag: [u8; 32],
    // Profile payloadを保護するKDFとAEADのwire parameters。
    kdf: KdfParams,
    cipher: Ciphertext,
    // 一覧用の論理index。private keyやMnemonicは含めない。
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
    // Argon2idへ渡すProfile固有salt。
    salt: [u8; 16],
    unknown_fields: Vec<(u64, Value)>,
}

#[derive(Clone)]
struct Ciphertext {
    // AES-256-GCMで暗号化したpayloadのnonce、ciphertext、認証tag。
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

struct KeyRecord {
    // 復号後のpayloadだけが保持する秘密Software Key。
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
/// Store固有の`registry_key`をCSPRNGから生成し、Profileを持たない完全なStoreを
/// 返す。返却されたbyte列は、以後のProfile作成・復元APIの入力として使用できる。
///
/// # Errors
///
/// 乱数源を利用できない場合は`RandomSourceFailure`を返す。失敗時に不完全なStoreは
/// 返さない。
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
/// 返却されたMnemonicは初回バックアップ受渡しに使用し、利用者が正確なMnemonicを
/// 記録・受領したことをアプリケーション側で明示確認した後に、同じStoreとpasswordを
/// 使って[`finalize_generated_profile`]へPending Profileを渡す。この関数だけでは
/// ProfileはStoreへ追加されない。
///
/// MnemonicとPending Profileは秘密情報を含むため、アプリケーションはログ、例外、
/// 長期キャッシュへ含めず、受渡しまたは破棄が完了したら保持を終了する。
///
/// # Errors
///
/// Storeが不正な場合は`InvalidStore`、passwordが空またはUTF-8でない場合は
/// `InvalidArgument`、乱数源や暗号処理に失敗した場合は対応するエラーを返す。
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
/// 成功時だけ完全なreplacement Storeを返す。Pending Profileが作成時と異なる
/// Storeへ渡された場合、または一度確定したPending Profileを再利用した場合は
/// Profileを追加しない。
///
/// # Errors
///
/// password認証に失敗した場合は`AuthenticationFailed`、Pending Profileの形式・
/// 対象Store・改ざん状態が不正な場合は`PendingProfileInvalid`、同じMnemonicと
/// NetworkのProfileが存在する場合は`DuplicateProfile`を返す。
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
///
/// 入力MnemonicはUTF-8のBIP39 English 24 wordsとして正規化・検証する。Profileの
/// Networkは作成時に固定され、後から変更できない。同じMnemonicとNetworkのProfileが
/// すでに存在する場合は、入力Storeを変更せずに拒否する。
///
/// # Errors
///
/// Mnemonicが不正な場合は`InvalidMnemonic`、passwordが不正な場合は
/// `InvalidArgument`、Storeまたは既存Profileが不正な場合は対応するエラーを返す。
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
///
/// ProfileのNetwork、ID、Software Key数は平文manifestから取得するため、passwordを
/// 要求しない。ただしStore構造全体の検証は行うため、不正な子要素を読み飛ばして
/// 部分結果を返すことはない。結果は暗号化payloadの認証済み情報とは区別する。
pub fn list_profiles(store: &[u8]) -> WalletResult<ReadResult<Vec<ProfileInfo>>> {
    let (wallet, warnings) = decode_store(store)?;
    Ok(ReadResult {
        value: wallet.profiles.iter().map(profile_info).collect(),
        warnings,
    })
}

/// 平文indexからSoftware Key一覧を返す。
///
/// 一覧にはprivate keyやoriginを含めず、Profile passwordも要求しない。返却値は
/// `key_id`とChainだけを含む未認証manifest由来の情報であり、秘密情報処理の認証結果
/// として扱ってはならない。
///
/// # Errors
///
/// Profileが存在しない場合は`ProfileNotFound`、Store構造が不正な場合は
/// `InvalidStore`を返す。
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
/// 返却されるMnemonicは正規化済みBIP39 English 24 wordsのUTF-8 byte列である。
/// `ReadResult`をDebug出力へ渡しても、秘密DTOの値はredacted表記になる。
///
/// # Errors
///
/// passwordまたは暗号認証に失敗した場合は`AuthenticationFailed`、Profileが存在
/// しない場合は`ProfileNotFound`を返し、Mnemonicは返さない。
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
///
/// private keyは対象Chainのraw 32 bytesとして返す。hexやその他のtextual encodingへ
/// 変換しない。返却された値は明示的なexport結果なので、アプリケーション側で保存・
/// キャッシュ・ログ出力を継続してはならない。
///
/// # Errors
///
/// passwordまたは暗号認証に失敗した場合は`AuthenticationFailed`、Profileまたは
/// Software Keyが存在しない場合は対応するエラーを返す。
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
/// 先にProfile passwordで認証してからMnemonicを復号する。導出pathはProfile Network、
/// Chain、account indexおよびProfile schema versionから決定し、SymbolとNEMではChain
/// 固有のBIP32 root HMAC keyを使用する。成功時はSoftware Keyを追加したreplacement
/// Storeを返し、入力Storeは変更しない。
///
/// `account_index`はv1で`0..=2_147_483_647`に限定される。
///
/// # Errors
///
/// password認証に失敗した場合は`AuthenticationFailed`、account indexが範囲外の場合は
/// `InvalidAccountIndex`、同一Profile・同一Chain・同一private keyが存在する場合は
/// `DuplicateSoftwareKey`を返す。
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
///
/// 入力は対象Chainのraw 32 bytesだけを受け付ける。hex string、`0x` prefixその他の
/// textual表現はこのAPIでは受け付けない。検証に成功したprivate keyを暗号化payloadへ
/// 登録し、完全なreplacement Storeを返す。
///
/// # Errors
///
/// 長さ、値または対象Chainでの鍵としての妥当性に失敗した場合は`InvalidPrivateKey`、
/// 同一Chainの重複は`DuplicateSoftwareKey`を返す。
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
///
/// 予測可能なfallbackやMnemonic由来の値は使用しない。乱数から得た候補を対象Chainの
/// 鍵処理で検証し、受理できる値だけを暗号化payloadへ登録する。
///
/// # Errors
///
/// 乱数源を利用できない場合は`RandomSourceFailure`、password認証に失敗した場合は
/// `AuthenticationFailed`を返す。
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
///
/// Profile passwordでpayloadを認証・復号し、Software Keyに固定されたChainとProfileの
/// Networkを使って公開鍵とaddressを計算する。Storeは変更しない。
///
/// # Errors
///
/// password認証に失敗した場合は`AuthenticationFailed`、対象Software Keyが存在しない
/// 場合は`SoftwareKeyNotFound`を返す。
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
/// 渡されたpayload byte列そのものを対象Chainの署名primitiveへ渡し、署名対象へ暗黙の
/// prefixやTransaction構造を追加しない。Storeは変更しない。
///
/// # Errors
///
/// password認証に失敗した場合は`AuthenticationFailed`、対象Software Keyが存在しない
/// 場合は`SoftwareKeyNotFound`を返す。
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
///
/// current passwordで認証・復号したpayload全体を、新しいArgon2id key、salt、AES-GCM
/// nonceで再暗号化する。旧暗号payloadを部分的に再利用せず、成功時だけreplacement
/// Storeを返す。
///
/// # Errors
///
/// new passwordが空またはUTF-8でない場合は`InvalidArgument`、current password認証に
/// 失敗した場合は`AuthenticationFailed`を返す。
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
///
/// Profile passwordで認証した後、指定した`key_id`だけを削除する。対象Profile内の
/// 他のSoftware Keyや、Store内の他Profileは保持する。成功時だけreplacement Storeを返す。
///
/// # Errors
///
/// password認証に失敗した場合は`AuthenticationFailed`、Software Keyが存在しない場合は
/// `SoftwareKeyNotFound`を返す。
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
///
/// Profile全体と、そのProfileに属するMnemonicおよびSoftware KeyをStoreから除去する。
/// Profile passwordによる認証に成功した場合だけreplacement Storeを返す。
///
/// # Errors
///
/// password認証に失敗した場合は`AuthenticationFailed`、Profileが存在しない場合は
/// `ProfileNotFound`を返す。
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
    // CBOR parserがcanonical表現、map key、深さ、trailing bytesを先に検証する。
    let value = cbor::decode(bytes).map_err(|_| WalletError::new(ErrorCode::InvalidStore))?;
    let map = as_map(&value).ok_or_else(|| WalletError::new(ErrorCode::InvalidStore))?;
    // top-levelのmagic/versionを確認してから、v1の各fieldを解釈する。
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

    // profilesはwire上の狭義昇順を要求する。重複IDや順序違反を子要素のskipで
    // 解消せず、Store全体を不正として扱う。
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
    // 既知fieldは型・長さ・enumを厳密に読み、未知fieldは意味解釈せず保持する。
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
    // AADの再現にはlogical indexではなく、受信したwire値のcloneが必要になる。
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
    // この関数はAEAD認証が完了したplaintextに対してだけ呼び出す。
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
    // AADにはStore registry key、Profile識別子、Network、duplicate tag、indexが含まれる。
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
    // 認証tagを検証できたplaintextだけをparse_payloadへ渡す。
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
    // AEAD認証はwire値の完全性を示すが、payloadと意味が一致することまでは保証しない。
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
    // 両方ともdecode時点でkey_idの狭義昇順を検証済みなので、二本の列を
    // 同時走査すれば、秘密鍵を検索するO(n^2)処理を避けられる。
    for (index, key) in profile
        .software_key_index
        .iter()
        .zip(payload.software_keys.iter())
    {
        if index.key_id != key.key_id || key.chain != index.chain {
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
    // payloadからindexを再構築し、既存indexのunknown fieldを対応するkey_idへ引き継ぐ。
    let registry_key = zeroize::Zeroizing::new(wallet.registry_key);
    let profile = &mut wallet.profiles[profile_index];
    profile.software_key_index = index_from_payload(payload);
    profile.aad_software_key_index =
        index_values_from_payload(payload, &profile.aad_software_key_index);
    if change_password {
        // password変更時だけKDF saltも更新する。通常のkey追加・削除ではsaltを維持する。
        profile.kdf.salt = crypto::random()?;
    }
    let mut key = crypto::derive_encryption_key(password_utf8, &profile.kdf.salt)?;
    profile.cipher.nonce = crypto::random()?;
    // indexを含む新しいAADを作成してから、payload全体を新nonceで暗号化する。
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
    // 新規Profileでは未知fieldを持たないmanifestを組み立て、初回payloadを暗号化する。
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
    // この配列の要素順とwire表現はWallet Store v1のAAD契約で固定されている。
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
    // cloneはwire値を再構築するためのものであり、秘密payloadを意味解釈するためではない。
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
    // KeyRecord本体はcloneせず、参照の並べ替えだけでdeterministicな配列を作る。
    // 秘密鍵を含むKeyRecord自体はcloneせず、参照だけを保存順に並べ替える。
    let mut keys = payload.software_keys.iter().collect::<Vec<_>>();
    keys.sort_unstable_by_key(|key| key.key_id);
    let mut fields = vec![
        (0, Value::Bytes(payload.mnemonic_entropy.to_vec())),
        (
            1,
            Value::Array(keys.into_iter().map(key_to_value).collect()),
        ),
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
    let mut existing = existing.iter().peekable();
    index_from_payload(payload)
        .into_iter()
        .map(|entry| {
            // 既存wire indexと新indexはいずれもkey_id昇順。現在のentryより
            // 小さい既存要素を一度だけ消費し、全体をO(n)でmergeする。
            while let Some(value) = existing.peek() {
                let Some(map) = as_map(value) else {
                    existing.next();
                    continue;
                };
                let Some(key_id) = fixed_bytes(map_value(map, 0), 16) else {
                    existing.next();
                    continue;
                };
                if key_id < entry.key_id {
                    existing.next();
                    continue;
                }
                break;
            }
            let unknown = existing
                .peek()
                .and_then(|value| as_map(value))
                .filter(|map| {
                    fixed_bytes(map_value(map, 0), 16).is_some_and(|key_id| key_id == entry.key_id)
                })
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
    // 重複条件はProfile内かつ同一Chainに限定する。異なるChainの同一raw keyは別Key。
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
    // CSPRNGで生成し、Store内の既存IDとの衝突時だけ再試行する。
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
    // key_idはprivate key等から導出せず、Profile内の衝突だけを確認する。
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
    // Pendingは対象Storeのhash、Profile情報、暗号化entropyを固定長envelopeへ格納する。
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
    // PendingはWallet Store CBORではないため、v1では固定長binary envelopeとして読む。
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
    //! Storeのfatalな構造検証、AAD、unknown field保持、atomic mutationを検証する。
    //!
    //! fixtureはCBORを直接編集して作るが、秘密payloadを扱う補助関数では復号値を
    //! `Zeroizing`で保持し、テスト失敗時にも秘密値を通常のログへ出さない。

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
        // ProfileのKDF/Cipher algorithm enumだけを変更し、未知enumの分類を検証する。
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
        // indexのunknown fieldをAADにも反映したfixtureを作り、保持と認証の両方を検証する。
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
            Value::Map(entries) => entries.push((99, Value::Simple(42))),
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
        // AEAD tagと一致しないciphertextを作り、認証失敗がmutationへ伝播しないことを確認する。
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
        // top-level、Profile、KDF、Cipherの未知fieldを追加し、再エンコード後の保持を検証する。
        let mut value = cbor::decode(store).unwrap();
        let map = match &mut value {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        map.push((99, Value::Simple(23)));
        let profile = first_profile_map_mut(&mut value);
        profile.push((99, Value::Simple(42)));
        let kdf = match map_value_mut(profile, 4) {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        kdf.push((99, Value::Simple(43)));
        let cipher = match map_value_mut(profile, 5) {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        cipher.push((99, Value::Simple(44)));
        cbor::encode(&value).unwrap()
    }

    fn add_unknown_payload_fields(store: &[u8]) -> Vec<u8> {
        // 認証済みpayloadとkey originへ未知fieldを追加して、再暗号化後の保持を検証する。
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
        payload_map.push((99, Value::Simple(23)));
        let keys = match map_value_mut(payload_map, 1) {
            Value::Array(values) => values,
            _ => unreachable!(),
        };
        let key_map = match keys.first_mut().unwrap() {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        key_map.push((99, Value::Simple(45)));
        let origin = match map_value_mut(key_map, 3) {
            Value::Map(entries) => entries,
            _ => unreachable!(),
        };
        origin.push((99, Value::Simple(23)));
        let payload_bytes = zeroize::Zeroizing::new(cbor::encode(&payload).unwrap());
        let (ciphertext, tag) =
            crypto::encrypt(&key, &profile.cipher.nonce, &aad, &payload_bytes).unwrap();
        let profile = wallet.profiles.first_mut().unwrap();
        profile.cipher.ciphertext = ciphertext;
        profile.cipher.tag = tag;
        encode_store(&wallet).unwrap()
    }

    fn replace_duplicate_tag_with_authenticated_value(store: &[u8]) -> Vec<u8> {
        // duplicate_tagだけを別値に置き換え、AADを再計算しても意味検証が必要なことを確認する。
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
        // 不正な子要素や未知enumをskipせず、Store全体をInvalidStoreとして拒否する。
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
        // AAD用wire値の保持、Profile順序、index順序のcanonical制約を検証する。
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
        // 対象外Profileと対象Profileのmutationの両方で、unknown fieldが失われないことを確認する。
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
        assert_eq!(map_value(map, 99), Some(&Value::Simple(23)));
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
        assert_eq!(map_value(target_map, 99), Some(&Value::Simple(42)));
        assert_eq!(
            map_value(as_map(map_value(target_map, 4).unwrap()).unwrap(), 99),
            Some(&Value::Simple(43))
        );
        assert_eq!(
            map_value(as_map(map_value(target_map, 5).unwrap()).unwrap(), 99),
            Some(&Value::Simple(44))
        );
        let index = match map_value(target_map, 6).unwrap() {
            Value::Array(values) => values,
            _ => unreachable!(),
        };
        assert_eq!(
            index
                .iter()
                .find_map(|value| as_map(value).and_then(|map| map_value(map, 99))),
            Some(&Value::Simple(42))
        );

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
        assert_eq!(map_value(payload_map, 99), Some(&Value::Simple(23)));
        let keys = match map_value(payload_map, 1).unwrap() {
            Value::Array(values) => values,
            _ => unreachable!(),
        };
        let key_map = keys
            .iter()
            .filter_map(as_map)
            .find(|map| map_value(map, 99).is_some())
            .unwrap();
        assert_eq!(map_value(key_map, 99), Some(&Value::Simple(45)));
        assert_eq!(
            map_value(as_map(map_value(key_map, 3).unwrap()).unwrap(), 99),
            Some(&Value::Simple(23))
        );
    }

    #[test]
    fn restore_continues_when_existing_plaintext_tag_does_not_match_candidate() {
        // 既存manifestのtag不整合が、候補Mnemonicの復元処理を誤って中断させないことを検証する。
        let store = create_empty_store().unwrap();
        let restored = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
        let inconsistent = replace_duplicate_tag_with_authenticated_value(&restored.store);
        let result = restore_profile(&inconsistent, MNEMONIC, PASSWORD, Network::Mainnet);
        assert!(result.is_ok());
    }

    #[test]
    fn payload_order_and_fixed_fields_are_fatal_store_errors() {
        // payload/key recordの順序、型、長さ、必須field違反をfatal errorとして分類する。
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
        // top-level versionの欠落と型違いをInvalidStoreとして拒否する。
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
        // Wallet Store v1で固定されたAADとduplicate_tagの期待値を照合する。
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

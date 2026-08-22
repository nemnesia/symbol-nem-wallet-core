//! C ABIによるNative Binding。
//!
//! このcrateはCのbyte slice、固定長DTO、所有権付きbuffer、error codeへの変換だけを
//! 担当する。暗号処理やStore操作は`symbol-nem-wallet-core`へ委譲する。
//!
//! C関数は、成功時に`NULL`、失敗時にNUL終端された安定error code文字列を返す。
//! 入力bufferは呼び出し側が所有し、出力buffer・warning配列・一覧配列はBindingが
//! 所有する。呼び出し側は各`snwc_free_*`関数を使って、成功・失敗後の所有権を
//! 明示的に解放する。
//!
//! Networkは`0`=Testnet / `1`=Mainnet、Chainは`0`=NEM / `1`=Symbol、Software Keyの
//! originは`0`=Derived / `1`=Imported / `2`=Generatedである。UUIDはCoreと同じraw
//! 16 bytes表現を使用する。

#![allow(unsafe_code)]

use core::ffi::c_char;
use std::{panic::AssertUnwindSafe, ptr, slice};
use zeroize::Zeroizing;

use symbol_nem_wallet_core::{
    change_profile_password, create_empty_store, delete_profile, delete_software_key,
    derive_software_key, export_mnemonic, export_private_key, finalize_generated_profile,
    generate_software_key, get_public_account, import_software_key, list_profiles,
    list_software_keys, prepare_generated_profile, restore_profile, sign, Chain, DecodeWarning,
    ErrorCode, MutationResult, Network, ProfileInfo, PublicAccountInfo, ReadResult,
    SoftwareKeyInfo, SoftwareKeyListItem, SoftwareKeyOrigin, WalletError,
};

/// C callerから借用するbyte slice。Bindingは所有権を取得しない。
///
/// `len == 0`の場合は`ptr`がNULLでも空sliceとして扱う。`len != 0`の場合、
/// `ptr`は呼び出し中に読み取り可能な範囲を指していなければならない。
#[repr(C)]
pub struct SnwcBytes {
    /// 入力byte列の先頭。所有権はC callerに残る。
    pub ptr: *const u8,
    /// `ptr`から読み取るbyte数。
    pub len: usize,
}

/// UUIDをC ABIで値渡しするための固定長型。
///
/// byte orderはRust Coreの`Uuid::as_bytes()`と同じで、文字列表現のUTF-8ではない。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcUuid {
    /// UUIDのraw 16 bytes。
    pub bytes: [u8; 16],
}

/// Coreから返された所有権付きbyte buffer。
///
/// 成功した関数が返したbufferは、内容を必要な範囲で使用した後に
/// [`snwc_free_bytes`]へ値渡しして解放する。
#[repr(C)]
pub struct SnwcOwnedBytes {
    /// Bindingが所有するbufferの先頭。
    pub ptr: *mut u8,
    /// `ptr`から読み取るbyte数。
    pub len: usize,
}

/// warning配列の所有権付きbuffer。
///
/// 配列要素の文字列ポインターはBinding所有の静的文字列を指し、個別に解放しない。
#[repr(C)]
pub struct SnwcWarnings {
    /// `SnwcWarning`配列の先頭。
    pub ptr: *mut SnwcWarning,
    /// 配列要素数。
    pub len: usize,
}

/// 秘密情報を含まないDecodeWarningのC表現。
#[repr(C)]
pub struct SnwcWarning {
    /// warning codeの静的NUL終端文字列。
    pub code: *const c_char,
    /// 対象オブジェクト種別の静的NUL終端文字列。
    pub object_type: *const c_char,
    /// 対象ID。`has_object_id == 0`の場合は未設定。
    pub object_id: [u8; 16],
    /// `object_id`が有効かを示すフラグ。
    pub has_object_id: u8,
    /// field名の静的NUL終端文字列。未設定の場合はNULL。
    pub field: *const c_char,
}

/// Profile情報のC表現。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcProfileInfo {
    /// Profile IDのraw 16 bytes。
    pub profile_id: [u8; 16],
    /// `0`=Testnet、`1`=Mainnet。
    pub network: u8,
    /// 平文indexに登録されたSoftware Key数。
    pub software_key_count: usize,
}

/// Software Key情報のC表現。
///
/// `origin`は`0`=Derived、`1`=Imported、`2`=Generated。`account_index`はDerivedの
/// 場合だけ有効で、他のoriginでは0になる。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcSoftwareKeyInfo {
    /// Software Key IDのraw 16 bytes。
    pub key_id: [u8; 16],
    /// `0`=NEM、`1`=Symbol。
    pub chain: u8,
    /// Software Keyの由来。
    pub origin: u8,
    /// Derived時のhardened account index。
    pub account_index: u32,
}

/// パスワードなしで取得できるSoftware Key一覧項目のC表現。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcSoftwareKeyListItem {
    /// Software Key IDのraw 16 bytes。
    pub key_id: [u8; 16],
    /// `0`=NEM、`1`=Symbol。
    pub chain: u8,
}

/// 公開アカウント情報のC表現。addressはUTF-8の所有権付き文字列。
#[repr(C)]
pub struct SnwcPublicAccountInfo {
    /// Software Key IDのraw 16 bytes。
    pub key_id: [u8; 16],
    /// `0`=NEM、`1`=Symbol。
    pub chain: u8,
    /// `0`=Testnet、`1`=Mainnet。
    pub network: u8,
    /// 対象Chainのraw 32 byte public key。
    pub public_key: [u8; 32],
    /// UTF-8 addressの所有buffer。`snwc_free_bytes`で解放する。
    pub address: SnwcOwnedBytes,
}

fn error_name(code: ErrorCode) -> *const c_char {
    match code {
        ErrorCode::InvalidArgument => c"InvalidArgument".as_ptr(),
        ErrorCode::InvalidStore => c"InvalidStore".as_ptr(),
        ErrorCode::UnsupportedStoreVersion => c"UnsupportedStoreVersion".as_ptr(),
        ErrorCode::UnsupportedProfileSchemaVersion => c"UnsupportedProfileSchemaVersion".as_ptr(),
        ErrorCode::ProfileNotFound => c"ProfileNotFound".as_ptr(),
        ErrorCode::SoftwareKeyNotFound => c"SoftwareKeyNotFound".as_ptr(),
        ErrorCode::AuthenticationFailed => c"AuthenticationFailed".as_ptr(),
        ErrorCode::InvalidMnemonic => c"InvalidMnemonic".as_ptr(),
        ErrorCode::InvalidPrivateKey => c"InvalidPrivateKey".as_ptr(),
        ErrorCode::DuplicateProfile => c"DuplicateProfile".as_ptr(),
        ErrorCode::DuplicateSoftwareKey => c"DuplicateSoftwareKey".as_ptr(),
        ErrorCode::InvalidAccountIndex => c"InvalidAccountIndex".as_ptr(),
        ErrorCode::NetworkMismatch => c"NetworkMismatch".as_ptr(),
        ErrorCode::CryptoFailure => c"CryptoFailure".as_ptr(),
        ErrorCode::RandomSourceFailure => c"RandomSourceFailure".as_ptr(),
        ErrorCode::SerializationFailure => c"SerializationFailure".as_ptr(),
        ErrorCode::PendingProfileInvalid => c"PendingProfileInvalid".as_ptr(),
        _ => c"InvalidArgument".as_ptr(),
    }
}

fn error(error: WalletError) -> *const c_char {
    error_name(error.code)
}

fn success() -> *const c_char {
    ptr::null()
}

unsafe fn input<'a>(value: SnwcBytes) -> Result<&'a [u8], WalletError> {
    // C callerの借用bufferをCoreが扱うsliceへ変換する。所有権は移さない。
    if value.len == 0 {
        return Ok(&[]);
    }
    if value.ptr.is_null() {
        return Err(WalletError {
            code: ErrorCode::InvalidArgument,
        });
    }
    Ok(slice::from_raw_parts(value.ptr, value.len))
}

unsafe fn output<'a, T>(value: *mut T) -> Result<&'a mut T, WalletError> {
    // すべての出力ポインターはNULLを先に拒否し、呼び出し側の領域へだけ書き込む。
    value.as_mut().ok_or(WalletError {
        code: ErrorCode::InvalidArgument,
    })
}

unsafe fn require_output<T>(value: *mut T) -> Result<(), WalletError> {
    if value.is_null() {
        Err(WalletError {
            code: ErrorCode::InvalidArgument,
        })
    } else {
        Ok(())
    }
}

fn owned_bytes(value: Vec<u8>) -> SnwcOwnedBytes {
    // Vecの所有権をC callerへ移す。解放は必ずsnwc_free_bytesで行う。
    let boxed = value.into_boxed_slice();
    let len = boxed.len();
    let ptr = Box::into_raw(boxed).cast();
    SnwcOwnedBytes { ptr, len }
}

fn warning_name(value: &str) -> *const c_char {
    match value {
        "UnknownEnumValue" => c"UnknownEnumValue".as_ptr(),
        "MissingRequiredField" => c"MissingRequiredField".as_ptr(),
        "InvalidFieldType" => c"InvalidFieldType".as_ptr(),
        "InvalidFieldLength" => c"InvalidFieldLength".as_ptr(),
        "InvalidFieldValue" => c"InvalidFieldValue".as_ptr(),
        "ProfileEnvelope" => c"ProfileEnvelope".as_ptr(),
        "SoftwareKeyIndexEntry" => c"SoftwareKeyIndexEntry".as_ptr(),
        "SoftwareKeyRecord" => c"SoftwareKeyRecord".as_ptr(),
        "profile_id" => c"profile_id".as_ptr(),
        "network" => c"network".as_ptr(),
        "duplicate_tag" => c"duplicate_tag".as_ptr(),
        "schema_version" => c"schema_version".as_ptr(),
        "kdf" => c"kdf".as_ptr(),
        "cipher" => c"cipher".as_ptr(),
        "software_key_index" => c"software_key_index".as_ptr(),
        "key_id" => c"key_id".as_ptr(),
        "chain" => c"chain".as_ptr(),
        "private_key" => c"private_key".as_ptr(),
        "origin" => c"origin".as_ptr(),
        "account_index" => c"account_index".as_ptr(),
        _ => ptr::null(),
    }
}

fn warning(value: DecodeWarning) -> SnwcWarning {
    SnwcWarning {
        code: warning_name(value.code),
        object_type: warning_name(value.object_type),
        object_id: value.object_id.map_or([0; 16], |id| *id.as_bytes()),
        has_object_id: u8::from(value.object_id.is_some()),
        field: value.field.map_or(ptr::null(), warning_name),
    }
}

fn warnings(values: Vec<DecodeWarning>) -> SnwcWarnings {
    let values = values.into_iter().map(warning).collect::<Vec<_>>();
    let boxed = values.into_boxed_slice();
    let len = boxed.len();
    let ptr = Box::into_raw(boxed).cast();
    SnwcWarnings { ptr, len }
}

fn network(value: Network) -> u8 {
    match value {
        Network::Testnet => 0,
        Network::Mainnet => 1,
    }
}

fn chain(value: Chain) -> u8 {
    match value {
        Chain::Nem => 0,
        Chain::Symbol => 1,
    }
}

fn origin(value: SoftwareKeyOrigin) -> (u8, u32) {
    match value {
        SoftwareKeyOrigin::Derived { account_index } => (0, account_index),
        SoftwareKeyOrigin::Imported => (1, 0),
        SoftwareKeyOrigin::Generated => (2, 0),
    }
}

fn profile(value: &ProfileInfo) -> SnwcProfileInfo {
    SnwcProfileInfo {
        profile_id: *value.profile_id.as_bytes(),
        network: network(value.network),
        software_key_count: value.software_key_count,
    }
}

fn software_key(value: &SoftwareKeyInfo) -> SnwcSoftwareKeyInfo {
    let (origin_value, account_index) = origin(value.origin);
    SnwcSoftwareKeyInfo {
        key_id: *value.key_id.as_bytes(),
        chain: chain(value.chain),
        origin: origin_value,
        account_index,
    }
}

fn software_key_list_item(value: &SoftwareKeyListItem) -> SnwcSoftwareKeyListItem {
    SnwcSoftwareKeyListItem {
        key_id: *value.key_id.as_bytes(),
        chain: chain(value.chain),
    }
}

fn public_account(value: PublicAccountInfo) -> SnwcPublicAccountInfo {
    SnwcPublicAccountInfo {
        key_id: *value.key_id.as_bytes(),
        chain: chain(value.chain),
        network: network(value.network),
        public_key: value.public_key,
        address: owned_bytes(value.address.into_bytes()),
    }
}

fn read_warnings<T>(value: ReadResult<T>) -> (T, SnwcWarnings) {
    (value.value, warnings(value.warnings))
}

fn mutation_warnings<T>(value: MutationResult<T>) -> (Vec<u8>, T, SnwcWarnings) {
    (value.store, value.value, warnings(value.warnings))
}

macro_rules! ffi_call {
    ($body:block) => {{
        // C ABI境界からRust panicを外へ出さず、安定したエラーコードへ変換する。
        match std::panic::catch_unwind(AssertUnwindSafe(|| $body)) {
            Ok(Ok(value)) => value,
            Ok(Err(err)) => error(err),
            Err(_) => error(WalletError {
                code: ErrorCode::CryptoFailure,
            }),
        }
    }};
}

/// 空のWallet Storeを作成する。
///
/// # Safety
///
/// `out`は、結果を書き込める有効なポインターでなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_create_empty_store(out: *mut SnwcOwnedBytes) -> *const c_char {
    ffi_call!({
        require_output(out)?;
        let out = output(out)?;
        *out = owned_bytes(create_empty_store()?);
        Ok(success())
    })
}

/// Mnemonic生成の初回段階を実行する。
///
/// # Safety
///
/// `store`、`password_utf8`および各出力ポインターは、呼び出し中有効でなければならない。
/// 入力bufferは呼び出し中だけ読み取られ、出力bufferは対応するfree関数で解放する。
#[no_mangle]
pub unsafe extern "C" fn snwc_prepare_generated_profile(
    store: SnwcBytes,
    password_utf8: SnwcBytes,
    network_value: u8,
    out_mnemonic: *mut SnwcOwnedBytes,
    out_pending: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_mnemonic)?;
        require_output(out_pending)?;
        require_output(out_warnings)?;
        if out_mnemonic == out_pending {
            return Err(WalletError {
                code: ErrorCode::InvalidArgument,
            });
        }
        let network = match network_value {
            0 => Network::Testnet,
            1 => Network::Mainnet,
            _ => {
                return Err(WalletError {
                    code: ErrorCode::InvalidArgument,
                })
            }
        };
        let store = input(store)?;
        let password = input(password_utf8)?;
        let value = prepare_generated_profile(store, password, network)?;
        let (value, warnings_value) = read_warnings(value);
        let out_mnemonic = output(out_mnemonic)?;
        let out_pending = output(out_pending)?;
        let out_warnings = output(out_warnings)?;
        // 未移動のDTO fieldはDropでzeroizeし、移動したbufferはC callerの
        // snwc_free_bytesでzeroizeして解放する。
        let mut value = value;
        *out_mnemonic = owned_bytes(std::mem::take(&mut value.mnemonic_utf8));
        *out_pending = owned_bytes(std::mem::take(&mut value.pending_profile));
        *out_warnings = warnings_value;
        Ok(success())
    })
}

/// Pending Profileを認証してProfileを確定する。
///
/// # Safety
///
/// `store`、`pending_profile`、`password_utf8`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_finalize_generated_profile(
    store: SnwcBytes,
    pending_profile: SnwcBytes,
    password_utf8: SnwcBytes,
    out_store: *mut SnwcOwnedBytes,
    out_profile: *mut SnwcProfileInfo,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_store)?;
        require_output(out_profile)?;
        require_output(out_warnings)?;
        let value = finalize_generated_profile(
            input(store)?,
            input(pending_profile)?,
            input(password_utf8)?,
        )?;
        let (store, profile_value, warnings_value) = mutation_warnings(value);
        *output(out_store)? = owned_bytes(store);
        *output(out_profile)? = profile(&profile_value);
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// UTF-8 BIP39 MnemonicからProfileを復元する。
///
/// # Safety
///
/// 入力の各bufferと各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_restore_profile(
    store: SnwcBytes,
    mnemonic_utf8: SnwcBytes,
    password_utf8: SnwcBytes,
    network_value: u8,
    out_store: *mut SnwcOwnedBytes,
    out_profile: *mut SnwcProfileInfo,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_store)?;
        require_output(out_profile)?;
        require_output(out_warnings)?;
        let network = match network_value {
            0 => Network::Testnet,
            1 => Network::Mainnet,
            _ => {
                return Err(WalletError {
                    code: ErrorCode::InvalidArgument,
                })
            }
        };
        let value = restore_profile(
            input(store)?,
            input(mnemonic_utf8)?,
            input(password_utf8)?,
            network,
        )?;
        let (store, profile_value, warnings_value) = mutation_warnings(value);
        *output(out_store)? = owned_bytes(store);
        *output(out_profile)? = profile(&profile_value);
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// ProfileのMnemonicを明示的にexportする。
///
/// # Safety
///
/// `store`、`password_utf8`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_export_mnemonic(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    password_utf8: SnwcBytes,
    out_mnemonic: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_mnemonic)?;
        require_output(out_warnings)?;
        let value = export_mnemonic(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            input(password_utf8)?,
        )?;
        let (value, warnings_value) = read_warnings(value);
        let mut value = value;
        *output(out_mnemonic)? = owned_bytes(std::mem::take(&mut value.mnemonic_utf8));
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// Software Keyのprivate keyを明示的にexportする。
///
/// # Safety
///
/// `store`、`password_utf8`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_export_private_key(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    key_id: SnwcUuid,
    password_utf8: SnwcBytes,
    out_private_key: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_private_key)?;
        require_output(out_warnings)?;
        let value = export_private_key(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            uuid::Uuid::from_bytes(key_id.bytes),
            input(password_utf8)?,
        )?;
        let (value, warnings_value) = read_warnings(value);
        let mut private_key = Zeroizing::new(value.private_key.to_vec());
        *output(out_private_key)? = owned_bytes(std::mem::take(&mut *private_key));
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// passwordなしでProfile一覧を取得する。
///
/// # Safety
///
/// `store`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_list_profiles(
    store: SnwcBytes,
    out_profiles: *mut *mut SnwcProfileInfo,
    out_len: *mut usize,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_profiles)?;
        require_output(out_len)?;
        require_output(out_warnings)?;
        let value = list_profiles(input(store)?)?;
        let (values, warnings_value) = read_warnings(value);
        let values = values
            .iter()
            .map(profile)
            .collect::<Vec<_>>()
            .into_boxed_slice();
        let len = values.len();
        let ptr = Box::into_raw(values).cast();
        *output(out_profiles)? = ptr;
        *output(out_len)? = len;
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// Profile内のSoftware Key一覧を取得する。
///
/// # Safety
///
/// `store`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_list_software_keys(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    out_keys: *mut *mut SnwcSoftwareKeyListItem,
    out_len: *mut usize,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_keys)?;
        require_output(out_len)?;
        require_output(out_warnings)?;
        let value = list_software_keys(input(store)?, uuid::Uuid::from_bytes(profile_id.bytes))?;
        let (values, warnings_value) = read_warnings(value);
        let values = values
            .iter()
            .map(software_key_list_item)
            .collect::<Vec<_>>()
            .into_boxed_slice();
        let len = values.len();
        let ptr = Box::into_raw(values).cast();
        *output(out_keys)? = ptr;
        *output(out_len)? = len;
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

fn parse_chain_value(value: u8) -> Result<Chain, WalletError> {
    match value {
        0 => Ok(Chain::Nem),
        1 => Ok(Chain::Symbol),
        _ => Err(WalletError {
            code: ErrorCode::InvalidArgument,
        }),
    }
}

/// MnemonicからSoftware Keyを導出して保存する。
///
/// # Safety
///
/// `store`、`password_utf8`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_derive_software_key(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    password_utf8: SnwcBytes,
    chain_wire: u8,
    account_index: u32,
    out_store: *mut SnwcOwnedBytes,
    out_key: *mut SnwcSoftwareKeyInfo,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_store)?;
        require_output(out_key)?;
        require_output(out_warnings)?;
        let value = derive_software_key(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            input(password_utf8)?,
            parse_chain_value(chain_wire)?,
            account_index,
        )?;
        let (store, key_value, warnings_value) = mutation_warnings(value);
        *output(out_store)? = owned_bytes(store);
        *output(out_key)? = software_key(&key_value);
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// raw private keyを検証してSoftware Keyとして保存する。
///
/// # Safety
///
/// 入力の各bufferと各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_import_software_key(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    password_utf8: SnwcBytes,
    chain_wire: u8,
    private_key: SnwcBytes,
    out_store: *mut SnwcOwnedBytes,
    out_key: *mut SnwcSoftwareKeyInfo,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_store)?;
        require_output(out_key)?;
        require_output(out_warnings)?;
        let value = import_software_key(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            input(password_utf8)?,
            parse_chain_value(chain_wire)?,
            input(private_key)?,
        )?;
        let (store, key_value, warnings_value) = mutation_warnings(value);
        *output(out_store)? = owned_bytes(store);
        *output(out_key)? = software_key(&key_value);
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// CSPRNGでSoftware Keyを生成して保存する。
///
/// # Safety
///
/// `store`、`password_utf8`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_generate_software_key(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    password_utf8: SnwcBytes,
    chain_wire: u8,
    out_store: *mut SnwcOwnedBytes,
    out_key: *mut SnwcSoftwareKeyInfo,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_store)?;
        require_output(out_key)?;
        require_output(out_warnings)?;
        let value = generate_software_key(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            input(password_utf8)?,
            parse_chain_value(chain_wire)?,
        )?;
        let (store, key_value, warnings_value) = mutation_warnings(value);
        *output(out_store)? = owned_bytes(store);
        *output(out_key)? = software_key(&key_value);
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// Software Keyのpublic account情報を取得する。
///
/// # Safety
///
/// `store`、`password_utf8`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_get_public_account(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    key_id: SnwcUuid,
    password_utf8: SnwcBytes,
    out_account: *mut SnwcPublicAccountInfo,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_account)?;
        require_output(out_warnings)?;
        let value = get_public_account(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            uuid::Uuid::from_bytes(key_id.bytes),
            input(password_utf8)?,
        )?;
        let (value, warnings_value) = read_warnings(value);
        *output(out_account)? = public_account(value);
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// Software Keyでpayload byte列に署名する。
///
/// # Safety
///
/// 入力の各bufferと各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_sign(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    key_id: SnwcUuid,
    password_utf8: SnwcBytes,
    payload: SnwcBytes,
    out_signature: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_signature)?;
        require_output(out_warnings)?;
        let value = sign(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            uuid::Uuid::from_bytes(key_id.bytes),
            input(password_utf8)?,
            input(payload)?,
        )?;
        let (value, warnings_value) = read_warnings(value);
        *output(out_signature)? = owned_bytes(value.signature.to_vec());
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// Profile passwordを変更してreplacement Storeを返す。
///
/// # Safety
///
/// 入力の各bufferと各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_change_profile_password(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    current_password_utf8: SnwcBytes,
    new_password_utf8: SnwcBytes,
    out_store: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_store)?;
        require_output(out_warnings)?;
        let value = change_profile_password(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            input(current_password_utf8)?,
            input(new_password_utf8)?,
        )?;
        let (store, _, warnings_value) = mutation_warnings(value);
        *output(out_store)? = owned_bytes(store);
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// Software Keyを削除してreplacement Storeを返す。
///
/// # Safety
///
/// `store`、`password_utf8`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_delete_software_key(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    key_id: SnwcUuid,
    password_utf8: SnwcBytes,
    out_store: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_store)?;
        require_output(out_warnings)?;
        let value = delete_software_key(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            uuid::Uuid::from_bytes(key_id.bytes),
            input(password_utf8)?,
        )?;
        let (store, _, warnings_value) = mutation_warnings(value);
        *output(out_store)? = owned_bytes(store);
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// Profileを削除してreplacement Storeを返す。
///
/// # Safety
///
/// `store`、`password_utf8`および各出力ポインターは、呼び出し中有効でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_delete_profile(
    store: SnwcBytes,
    profile_id: SnwcUuid,
    password_utf8: SnwcBytes,
    out_store: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    ffi_call!({
        require_output(out_store)?;
        require_output(out_warnings)?;
        let value = delete_profile(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            input(password_utf8)?,
        )?;
        let (store, _, warnings_value) = mutation_warnings(value);
        *output(out_store)? = owned_bytes(store);
        *output(out_warnings)? = warnings_value;
        Ok(success())
    })
}

/// `SnwcOwnedBytes`を解放し、内容を可能な範囲でzeroizeする。
///
/// # Safety
///
/// `value`はこのBindingが返した未解放のbufferでなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_free_bytes(value: SnwcOwnedBytes) {
    if value.ptr.is_null() || value.len == 0 {
        return;
    }
    let mut value = Box::from_raw(ptr::slice_from_raw_parts_mut(value.ptr, value.len));
    zeroize::Zeroize::zeroize(&mut value);
}

/// warning配列を解放する。
///
/// # Safety
///
/// `value`はこのBindingが返した未解放のwarning配列でなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_free_warnings(value: SnwcWarnings) {
    if value.ptr.is_null() || value.len == 0 {
        return;
    }
    drop(Box::from_raw(ptr::slice_from_raw_parts_mut(
        value.ptr, value.len,
    )));
}

/// Profile一覧配列を解放する。
///
/// # Safety
///
/// `ptr`と`len`は、このBindingが返した未解放のProfile一覧配列に対応しなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_free_profiles(values_ptr: *mut SnwcProfileInfo, len: usize) {
    if values_ptr.is_null() || len == 0 {
        return;
    }
    drop(Box::from_raw(ptr::slice_from_raw_parts_mut(
        values_ptr, len,
    )));
}

/// Software Key一覧配列を解放する。
///
/// # Safety
///
/// `ptr`と`len`は、このBindingが返した未解放のSoftware Key一覧配列に対応しなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_free_software_key_list(
    values_ptr: *mut SnwcSoftwareKeyListItem,
    len: usize,
) {
    if values_ptr.is_null() || len == 0 {
        return;
    }
    drop(Box::from_raw(ptr::slice_from_raw_parts_mut(
        values_ptr, len,
    )));
}

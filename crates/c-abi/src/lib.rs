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
use std::{
    alloc::{alloc, dealloc, Layout},
    marker::PhantomData,
    panic::AssertUnwindSafe,
    ptr, slice,
};
use zeroize::Zeroizing;

use symbol_nem_wallet_core::{
    change_profile_password, create_empty_store, delete_profile, delete_software_key,
    derive_software_key, export_mnemonic, export_private_key, finalize_generated_profile,
    generate_software_key, get_public_account, import_software_key, list_profiles,
    list_software_keys, prepare_generated_profile, restore_profile, sign, AccountContext, Chain,
    DecodeWarning, ErrorCode, ExportApplicationConfirmation, ExportApplicationConfirmationStatus,
    ExportRequest, ExportTarget, ExportUserRequest, ExportUserRequestStatus, HandoffConfirmation,
    HandoffConfirmationStatus, MutationResult, Network, ProfileInfo, PublicAccountInfo, ReadResult,
    SigningApproval, SigningApprovalStatus, SigningRequest, SigningTarget, SoftwareKeyInfo,
    SoftwareKeyListItem, SoftwareKeyOrigin, WalletError,
};

/// C callerから借用するbyte slice。Bindingは所有権を取得しない。
///
/// `len == 0`の場合は`ptr`がNULLでも空sliceとして扱う。`len != 0`の場合、
/// `ptr`は呼び出し中に読み取り可能な範囲を指していなければならない。
#[repr(C)]
#[derive(Clone, Copy, Default)]
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
/// [`snwc_free_bytes`]へmutable pointerで渡して解放する。
#[repr(C)]
pub struct SnwcOwnedBytes {
    /// Bindingが所有するbufferの先頭。
    pub ptr: *mut u8,
    /// `ptr`から読み取るbyte数。
    pub len: usize,
}

impl Default for SnwcOwnedBytes {
    fn default() -> Self {
        Self {
            ptr: ptr::null_mut(),
            len: 0,
        }
    }
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

impl Default for SnwcWarnings {
    fn default() -> Self {
        Self {
            ptr: ptr::null_mut(),
            len: 0,
        }
    }
}

/// 初回Mnemonic handoff confirmationのC表現。`0`=Unconfirmed、`1`=Confirmed。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcHandoffConfirmation {
    /// `0`=Unconfirmed、`1`=Confirmed。
    pub status: u8,
}

/// Export targetのC表現。`0`=Mnemonic、`1`=Software Key。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcExportTarget {
    /// `0`=Mnemonic、`1`=Software Key。
    pub kind: u8,
    /// 対象Profileのraw UUID。
    pub profile_id: SnwcUuid,
    /// Software Key対象時のraw UUID。Mnemonic対象時は未使用。
    pub key_id: SnwcUuid,
}

/// Export user requestのC表現。`0`=NotRequested、`1`=Requested。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcExportUserRequest {
    /// 利用者が要求した対象。
    pub target: SnwcExportTarget,
    /// `0`=NotRequested、`1`=Requested。
    pub status: u8,
}

/// Export Application confirmationのC表現。`0`=NotConfirmed、`1`=Confirmed。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcExportApplicationConfirmation {
    /// Applicationが確認した対象。
    pub target: SnwcExportTarget,
    /// `0`=NotConfirmed、`1`=Confirmed。
    pub status: u8,
}

/// 明示的export requestのC表現。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcExportRequest {
    /// 操作対象。
    pub target: SnwcExportTarget,
    /// 利用者要求。
    pub user_request: SnwcExportUserRequest,
    /// Application confirmation。
    pub application_confirmation: SnwcExportApplicationConfirmation,
}

/// Account contextのC表現。Chainは`0`=NEM / `1`=Symbol、Networkは`0`=Testnet / `1`=Mainnet。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcAccountContext {
    /// `0`=NEM、`1`=Symbol。
    pub chain: u8,
    /// `0`=Testnet、`1`=Mainnet。
    pub network: u8,
}

/// 署名対象のC表現。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcSigningTarget {
    /// 対象Profile。
    pub profile_id: SnwcUuid,
    /// 対象Software Key。
    pub key_id: SnwcUuid,
    /// 要求されたChain / Network。
    pub context: SnwcAccountContext,
}

/// 署名承認のC表現。`0`=NotApproved、`1`=Approved。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcSigningApproval {
    /// `0`=NotApproved、`1`=Approved。
    pub status: u8,
}

/// 署名requestのC表現。payloadはcaller-ownedの借用buffer。
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct SnwcSigningRequest {
    /// 署名対象。
    pub target: SnwcSigningTarget,
    /// caller-ownedで借用する署名対象byte列。
    pub payload: SnwcBytes,
    /// Application approval。
    pub approval: SnwcSigningApproval,
}

/// 秘密情報を含まないDecodeWarningのC表現。
#[repr(C)]
#[derive(Clone, Copy)]
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
#[derive(Default)]
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
        ErrorCode::BindingFailure => c"BindingFailure".as_ptr(),
        // 未知のCore errorを入力エラーへ偽装せず、Binding mapping failureとして扱う。
        _ => c"BindingFailure".as_ptr(),
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

unsafe fn reset_output<T: Default>(value: *mut T) {
    if let Some(value) = value.as_mut() {
        *value = T::default();
    }
}

unsafe fn reset_array_output<T>(values: *mut *mut T, len: *mut usize) {
    if let Some(values) = values.as_mut() {
        *values = ptr::null_mut();
    }
    if let Some(len) = len.as_mut() {
        *len = 0;
    }
}

#[cfg(test)]
mod allocation_failure_seam {
    use std::cell::Cell;

    thread_local! {
        // Some successful output allocations may be skipped before the next one fails.
        static FAIL_AFTER: Cell<Option<usize>> = const { Cell::new(None) };
    }

    pub(super) fn inject(after_successful_allocations: usize) {
        FAIL_AFTER.with(|value| value.set(Some(after_successful_allocations)));
    }

    pub(super) fn should_fail() -> bool {
        FAIL_AFTER.with(|value| match value.get() {
            Some(0) => {
                value.set(None);
                true
            }
            Some(remaining) => {
                value.set(Some(remaining - 1));
                false
            }
            None => false,
        })
    }
}

#[cfg(test)]
fn output_allocation_should_fail() -> bool {
    allocation_failure_seam::should_fail()
}

#[cfg(not(test))]
#[inline]
fn output_allocation_should_fail() -> bool {
    false
}

fn binding_failure() -> WalletError {
    WalletError {
        code: ErrorCode::BindingFailure,
    }
}

unsafe fn allocate_output_slice<T>(len: usize) -> Result<OwnedSliceGuard<T>, WalletError> {
    if len == 0 {
        return Ok(OwnedSliceGuard::empty());
    }
    if output_allocation_should_fail() {
        return Err(binding_failure());
    }
    let layout = Layout::array::<T>(len).map_err(|_| binding_failure())?;
    let ptr = alloc(layout).cast::<T>();
    if ptr.is_null() {
        return Err(binding_failure());
    }
    Ok(OwnedSliceGuard {
        ptr,
        len,
        marker: PhantomData,
    })
}

unsafe fn deallocate_output_slice<T>(ptr: *mut T, len: usize) {
    if ptr.is_null() || len == 0 {
        return;
    }
    if let Ok(layout) = Layout::array::<T>(len) {
        dealloc(ptr.cast(), layout);
    }
}

struct OwnedSliceGuard<T> {
    ptr: *mut T,
    len: usize,
    marker: PhantomData<T>,
}

impl<T> OwnedSliceGuard<T> {
    fn empty() -> Self {
        Self {
            ptr: ptr::null_mut(),
            len: 0,
            marker: PhantomData,
        }
    }

    fn into_raw_parts(self) -> (*mut T, usize) {
        let parts = (self.ptr, self.len);
        std::mem::forget(self);
        parts
    }

    unsafe fn write(&mut self, index: usize, value: T) {
        self.ptr.add(index).write(value);
    }
}

impl<T> Drop for OwnedSliceGuard<T> {
    fn drop(&mut self) {
        unsafe { deallocate_output_slice(self.ptr, self.len) };
    }
}

struct OwnedBytesGuard(SnwcOwnedBytes);

impl OwnedBytesGuard {
    fn into_inner(mut self) -> SnwcOwnedBytes {
        let value = std::mem::take(&mut self.0);
        std::mem::forget(self);
        value
    }
}

impl Drop for OwnedBytesGuard {
    fn drop(&mut self) {
        unsafe { release_owned_bytes(&mut self.0) };
    }
}

fn owned_bytes_from_slice(value: &[u8]) -> Result<OwnedBytesGuard, WalletError> {
    let output = unsafe { allocate_output_slice::<u8>(value.len())? };
    if !value.is_empty() {
        // The allocation has the exact byte layout used by the release helper.
        unsafe { ptr::copy_nonoverlapping(value.as_ptr(), output.ptr, value.len()) };
    }
    let (ptr, len) = output.into_raw_parts();
    Ok(OwnedBytesGuard(SnwcOwnedBytes { ptr, len }))
}

fn owned_bytes(value: Vec<u8>) -> Result<OwnedBytesGuard, WalletError> {
    // The source may contain encrypted Store material or other sensitive bytes. It is
    // zeroized even when the binding-owned allocation fails.
    let value = Zeroizing::new(value);
    owned_bytes_from_slice(&value)
}

unsafe fn release_owned_bytes(value: &mut SnwcOwnedBytes) {
    if !value.ptr.is_null() && value.len != 0 {
        let bytes = slice::from_raw_parts_mut(value.ptr, value.len);
        zeroize::Zeroize::zeroize(bytes);
        deallocate_output_slice(value.ptr, value.len);
    }
    value.ptr = ptr::null_mut();
    value.len = 0;
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

fn warnings(values: Vec<DecodeWarning>) -> Result<OwnedSliceGuard<SnwcWarning>, WalletError> {
    let mut output = unsafe { allocate_output_slice::<SnwcWarning>(values.len())? };
    for (index, value) in values.into_iter().enumerate() {
        unsafe { output.write(index, warning(value)) };
    }
    Ok(output)
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

fn public_account(value: PublicAccountInfo) -> Result<SnwcPublicAccountInfo, WalletError> {
    let PublicAccountInfo {
        key_id,
        chain: chain_value,
        network: network_value,
        public_key,
        address,
    } = value;
    let address = owned_bytes(address.into_bytes())?;
    Ok(SnwcPublicAccountInfo {
        key_id: *key_id.as_bytes(),
        chain: chain(chain_value),
        network: network(network_value),
        public_key,
        address: address.into_inner(),
    })
}

fn read_warnings<T>(
    value: ReadResult<T>,
) -> Result<(T, OwnedSliceGuard<SnwcWarning>), WalletError> {
    Ok((value.value, warnings(value.warnings)?))
}

fn mutation_warnings<T>(
    value: MutationResult<T>,
) -> Result<(Vec<u8>, T, OwnedSliceGuard<SnwcWarning>), WalletError> {
    Ok((value.store, value.value, warnings(value.warnings)?))
}

fn warnings_output(value: OwnedSliceGuard<SnwcWarning>) -> SnwcWarnings {
    let (ptr, len) = value.into_raw_parts();
    SnwcWarnings { ptr, len }
}

macro_rules! ffi_call {
    ($body:block) => {{
        // C ABI境界からRust panicを外へ出さず、安定したエラーコードへ変換する。
        match std::panic::catch_unwind(AssertUnwindSafe(|| $body)) {
            Ok(Ok(value)) => value,
            Ok(Err(err)) => error(err),
            Err(_) => error(WalletError {
                code: ErrorCode::BindingFailure,
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
    reset_output(out);
    ffi_call!({
        require_output(out)?;
        let out = output(out)?;
        *out = owned_bytes(create_empty_store()?)?.into_inner();
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
    reset_output(out_mnemonic);
    reset_output(out_pending);
    reset_output(out_warnings);
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
        let (value, warnings_value) = read_warnings(value)?;
        let out_mnemonic = output(out_mnemonic)?;
        let out_pending = output(out_pending)?;
        let out_warnings = output(out_warnings)?;
        // 未移動のDTO fieldはDropでzeroizeし、移動したbufferはC callerの
        // snwc_free_bytesでzeroizeして解放する。
        let mut value = value;
        // すべてのallocationをassignment前に完了させ、途中失敗でpartial outputを残さない。
        let mnemonic = owned_bytes(std::mem::take(&mut value.mnemonic_utf8))?;
        let pending = owned_bytes(std::mem::take(&mut value.pending_profile))?;
        *out_mnemonic = mnemonic.into_inner();
        *out_pending = pending.into_inner();
        *out_warnings = warnings_output(warnings_value);
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
    handoff_confirmation: SnwcHandoffConfirmation,
    out_store: *mut SnwcOwnedBytes,
    out_profile: *mut SnwcProfileInfo,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    reset_output(out_store);
    reset_output(out_profile);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_store)?;
        require_output(out_profile)?;
        require_output(out_warnings)?;
        let value = finalize_generated_profile(
            input(store)?,
            input(pending_profile)?,
            input(password_utf8)?,
            parse_handoff_confirmation(handoff_confirmation)?,
        )?;
        let (store, profile_value, warnings_value) = mutation_warnings(value)?;
        // conversion / allocationを先に済ませてからoutput全体を公開する。
        let store = owned_bytes(store)?;
        let profile = profile(&profile_value);
        *output(out_store)? = store.into_inner();
        *output(out_profile)? = profile;
        *output(out_warnings)? = warnings_output(warnings_value);
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
    reset_output(out_store);
    reset_output(out_profile);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_store)?;
        require_output(out_profile)?;
        require_output(out_warnings)?;
        let network = parse_network_value(network_value)?;
        let value = restore_profile(
            input(store)?,
            input(mnemonic_utf8)?,
            input(password_utf8)?,
            network,
        )?;
        let (store, profile_value, warnings_value) = mutation_warnings(value)?;
        *output(out_store)? = owned_bytes(store)?.into_inner();
        *output(out_profile)? = profile(&profile_value);
        *output(out_warnings)? = warnings_output(warnings_value);
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
    request: SnwcExportRequest,
    password_utf8: SnwcBytes,
    out_mnemonic: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    reset_output(out_mnemonic);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_mnemonic)?;
        require_output(out_warnings)?;
        let value = export_mnemonic(
            input(store)?,
            parse_export_request(request)?,
            input(password_utf8)?,
        )?;
        let (value, warnings_value) = read_warnings(value)?;
        let mut value = value;
        *output(out_mnemonic)? =
            owned_bytes(std::mem::take(&mut value.mnemonic_utf8))?.into_inner();
        *output(out_warnings)? = warnings_output(warnings_value);
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
    request: SnwcExportRequest,
    password_utf8: SnwcBytes,
    out_private_key: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    reset_output(out_private_key);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_private_key)?;
        require_output(out_warnings)?;
        let value = export_private_key(
            input(store)?,
            parse_export_request(request)?,
            input(password_utf8)?,
        )?;
        let (value, warnings_value) = read_warnings(value)?;
        *output(out_private_key)? = owned_bytes_from_slice(&value.private_key)?.into_inner();
        *output(out_warnings)? = warnings_output(warnings_value);
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
    reset_array_output(out_profiles, out_len);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_profiles)?;
        require_output(out_len)?;
        require_output(out_warnings)?;
        let value = list_profiles(input(store)?)?;
        let (values, warnings_value) = read_warnings(value)?;
        if values.is_empty() {
            *output(out_profiles)? = ptr::null_mut();
            *output(out_len)? = 0;
            *output(out_warnings)? = warnings_output(warnings_value);
            return Ok(success());
        }
        let mut profile_values = unsafe { allocate_output_slice::<SnwcProfileInfo>(values.len())? };
        for (index, value) in values.iter().enumerate() {
            unsafe { profile_values.write(index, profile(value)) };
        }
        let (ptr, len) = profile_values.into_raw_parts();
        *output(out_profiles)? = ptr;
        *output(out_len)? = len;
        *output(out_warnings)? = warnings_output(warnings_value);
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
    reset_array_output(out_keys, out_len);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_keys)?;
        require_output(out_len)?;
        require_output(out_warnings)?;
        let value = list_software_keys(input(store)?, uuid::Uuid::from_bytes(profile_id.bytes))?;
        let (values, warnings_value) = read_warnings(value)?;
        if values.is_empty() {
            *output(out_keys)? = ptr::null_mut();
            *output(out_len)? = 0;
            *output(out_warnings)? = warnings_output(warnings_value);
            return Ok(success());
        }
        let mut key_values =
            unsafe { allocate_output_slice::<SnwcSoftwareKeyListItem>(values.len())? };
        for (index, value) in values.iter().enumerate() {
            unsafe { key_values.write(index, software_key_list_item(value)) };
        }
        let (ptr, len) = key_values.into_raw_parts();
        *output(out_keys)? = ptr;
        *output(out_len)? = len;
        *output(out_warnings)? = warnings_output(warnings_value);
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

fn parse_network_value(value: u8) -> Result<Network, WalletError> {
    match value {
        0 => Ok(Network::Testnet),
        1 => Ok(Network::Mainnet),
        _ => Err(WalletError {
            code: ErrorCode::InvalidArgument,
        }),
    }
}

fn parse_handoff_confirmation(
    value: SnwcHandoffConfirmation,
) -> Result<HandoffConfirmation, WalletError> {
    let status = match value.status {
        0 => HandoffConfirmationStatus::Unconfirmed,
        1 => HandoffConfirmationStatus::Confirmed,
        _ => {
            return Err(WalletError {
                code: ErrorCode::InvalidArgument,
            })
        }
    };
    Ok(HandoffConfirmation { status })
}

fn parse_export_target(value: SnwcExportTarget) -> Result<ExportTarget, WalletError> {
    match value.kind {
        0 => Ok(ExportTarget::MnemonicTarget {
            profile_id: uuid::Uuid::from_bytes(value.profile_id.bytes),
        }),
        1 => Ok(ExportTarget::SoftwareKeyTarget {
            profile_id: uuid::Uuid::from_bytes(value.profile_id.bytes),
            key_id: uuid::Uuid::from_bytes(value.key_id.bytes),
        }),
        _ => Err(WalletError {
            code: ErrorCode::InvalidArgument,
        }),
    }
}

fn parse_export_request(value: SnwcExportRequest) -> Result<ExportRequest, WalletError> {
    let user_status = match value.user_request.status {
        0 => ExportUserRequestStatus::NotRequested,
        1 => ExportUserRequestStatus::Requested,
        _ => {
            return Err(WalletError {
                code: ErrorCode::InvalidArgument,
            })
        }
    };
    let confirmation_status = match value.application_confirmation.status {
        0 => ExportApplicationConfirmationStatus::NotConfirmed,
        1 => ExportApplicationConfirmationStatus::Confirmed,
        _ => {
            return Err(WalletError {
                code: ErrorCode::InvalidArgument,
            })
        }
    };
    Ok(ExportRequest {
        target: parse_export_target(value.target)?,
        user_request: ExportUserRequest {
            target: parse_export_target(value.user_request.target)?,
            status: user_status,
        },
        application_confirmation: ExportApplicationConfirmation {
            target: parse_export_target(value.application_confirmation.target)?,
            status: confirmation_status,
        },
    })
}

fn parse_account_context(value: SnwcAccountContext) -> Result<AccountContext, WalletError> {
    Ok(AccountContext {
        chain: parse_chain_value(value.chain)?,
        network: parse_network_value(value.network)?,
    })
}

fn parse_signing_request(value: SnwcSigningRequest) -> Result<SigningRequest, WalletError> {
    if value.approval.status > 1 {
        return Err(WalletError {
            code: ErrorCode::InvalidArgument,
        });
    }
    let payload = unsafe { input(value.payload)? }.to_vec();
    Ok(SigningRequest {
        target: SigningTarget {
            profile_id: uuid::Uuid::from_bytes(value.target.profile_id.bytes),
            key_id: uuid::Uuid::from_bytes(value.target.key_id.bytes),
            context: parse_account_context(value.target.context)?,
        },
        payload,
        approval: SigningApproval {
            status: match value.approval.status {
                0 => SigningApprovalStatus::NotApproved,
                1 => SigningApprovalStatus::Approved,
                _ => unreachable!(),
            },
        },
    })
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
    reset_output(out_store);
    reset_output(out_key);
    reset_output(out_warnings);
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
        let (store, key_value, warnings_value) = mutation_warnings(value)?;
        *output(out_store)? = owned_bytes(store)?.into_inner();
        *output(out_key)? = software_key(&key_value);
        *output(out_warnings)? = warnings_output(warnings_value);
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
    reset_output(out_store);
    reset_output(out_key);
    reset_output(out_warnings);
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
        let (store, key_value, warnings_value) = mutation_warnings(value)?;
        *output(out_store)? = owned_bytes(store)?.into_inner();
        *output(out_key)? = software_key(&key_value);
        *output(out_warnings)? = warnings_output(warnings_value);
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
    reset_output(out_store);
    reset_output(out_key);
    reset_output(out_warnings);
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
        let (store, key_value, warnings_value) = mutation_warnings(value)?;
        *output(out_store)? = owned_bytes(store)?.into_inner();
        *output(out_key)? = software_key(&key_value);
        *output(out_warnings)? = warnings_output(warnings_value);
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
    requested_context: SnwcAccountContext,
    password_utf8: SnwcBytes,
    out_account: *mut SnwcPublicAccountInfo,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    reset_output(out_account);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_account)?;
        require_output(out_warnings)?;
        let value = get_public_account(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            uuid::Uuid::from_bytes(key_id.bytes),
            parse_account_context(requested_context)?,
            input(password_utf8)?,
        )?;
        let (value, warnings_value) = read_warnings(value)?;
        *output(out_account)? = public_account(value)?;
        *output(out_warnings)? = warnings_output(warnings_value);
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
    request: SnwcSigningRequest,
    password_utf8: SnwcBytes,
    out_signature: *mut SnwcOwnedBytes,
    out_warnings: *mut SnwcWarnings,
) -> *const c_char {
    reset_output(out_signature);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_signature)?;
        require_output(out_warnings)?;
        let value = sign(
            input(store)?,
            parse_signing_request(request)?,
            input(password_utf8)?,
        )?;
        let (value, warnings_value) = read_warnings(value)?;
        *output(out_signature)? = owned_bytes_from_slice(&value.signature)?.into_inner();
        *output(out_warnings)? = warnings_output(warnings_value);
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
    reset_output(out_store);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_store)?;
        require_output(out_warnings)?;
        let value = change_profile_password(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            input(current_password_utf8)?,
            input(new_password_utf8)?,
        )?;
        let (store, _, warnings_value) = mutation_warnings(value)?;
        *output(out_store)? = owned_bytes(store)?.into_inner();
        *output(out_warnings)? = warnings_output(warnings_value);
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
    reset_output(out_store);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_store)?;
        require_output(out_warnings)?;
        let value = delete_software_key(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            uuid::Uuid::from_bytes(key_id.bytes),
            input(password_utf8)?,
        )?;
        let (store, _, warnings_value) = mutation_warnings(value)?;
        *output(out_store)? = owned_bytes(store)?.into_inner();
        *output(out_warnings)? = warnings_output(warnings_value);
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
    reset_output(out_store);
    reset_output(out_warnings);
    ffi_call!({
        require_output(out_store)?;
        require_output(out_warnings)?;
        let value = delete_profile(
            input(store)?,
            uuid::Uuid::from_bytes(profile_id.bytes),
            input(password_utf8)?,
        )?;
        let (store, _, warnings_value) = mutation_warnings(value)?;
        *output(out_store)? = owned_bytes(store)?.into_inner();
        *output(out_warnings)? = warnings_output(warnings_value);
        Ok(success())
    })
}

/// `SnwcOwnedBytes`を解放し、内容を可能な範囲でzeroizeしてhandleを空にする。
///
/// # Safety
///
/// `value`はこのBindingが返した未解放のbufferへのmutable pointerでなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_free_bytes(value: *mut SnwcOwnedBytes) {
    let Some(value) = value.as_mut() else {
        return;
    };
    release_owned_bytes(value);
}

/// warning配列を解放する。
///
/// # Safety
///
/// `value`はこのBindingが返した未解放のwarning配列へのmutable pointerでなければならない。
#[no_mangle]
pub unsafe extern "C" fn snwc_free_warnings(value: *mut SnwcWarnings) {
    let Some(value) = value.as_mut() else {
        return;
    };
    deallocate_output_slice(value.ptr, value.len);
    value.ptr = ptr::null_mut();
    value.len = 0;
}

/// Profile一覧配列を解放する。
///
/// # Safety
///
/// `values_ptr`と`len`は、このBindingが返した未解放のProfile一覧配列のhandleへのmutable
/// pointerでなければならない。正常解放後、両方をNULL / 0へ更新する。
#[no_mangle]
pub unsafe extern "C" fn snwc_free_profiles(
    values_ptr: *mut *mut SnwcProfileInfo,
    len: *mut usize,
) {
    let (Some(values_ptr), Some(len)) = (values_ptr.as_mut(), len.as_mut()) else {
        return;
    };
    deallocate_output_slice(*values_ptr, *len);
    *values_ptr = ptr::null_mut();
    *len = 0;
}

/// Software Key一覧配列を解放する。
///
/// # Safety
///
/// `values_ptr`と`len`は、このBindingが返した未解放のSoftware Key一覧配列のhandleへの
/// mutable pointerでなければならない。正常解放後、両方をNULL / 0へ更新する。
#[no_mangle]
pub unsafe extern "C" fn snwc_free_software_key_list(
    values_ptr: *mut *mut SnwcSoftwareKeyListItem,
    len: *mut usize,
) {
    let (Some(values_ptr), Some(len)) = (values_ptr.as_mut(), len.as_mut()) else {
        return;
    };
    deallocate_output_slice(*values_ptr, *len);
    *values_ptr = ptr::null_mut();
    *len = 0;
}

#[cfg(test)]
mod binding_tests {
    use super::*;
    use std::ffi::CStr;

    #[test]
    fn ffi_panic_maps_to_binding_failure() {
        let result: *const c_char = ffi_call!({
            std::panic::panic_any(());
        });
        let code = unsafe { std::ffi::CStr::from_ptr(result) };
        assert_eq!(code.to_bytes(), b"BindingFailure");
    }

    #[test]
    fn output_allocation_failure_maps_to_binding_failure_without_partial_output() {
        const PASSWORD: &[u8] = b"correct horse battery staple";

        unsafe {
            let mut store = SnwcOwnedBytes::default();
            allocation_failure_seam::inject(0);
            let error = snwc_create_empty_store(&mut store);
            assert_eq!(CStr::from_ptr(error).to_bytes(), b"BindingFailure");
            assert!(store.ptr.is_null());
            assert_eq!(store.len, 0);

            let mut input_store = SnwcOwnedBytes::default();
            assert!(snwc_create_empty_store(&mut input_store).is_null());

            // Fail at the second output allocation. The first allocation must be reclaimed
            // by its guard, and neither secret output may become visible to the C caller.
            let mut mnemonic = SnwcOwnedBytes::default();
            let mut pending = SnwcOwnedBytes::default();
            let mut warnings = SnwcWarnings::default();
            allocation_failure_seam::inject(1);
            let error = snwc_prepare_generated_profile(
                SnwcBytes {
                    ptr: input_store.ptr,
                    len: input_store.len,
                },
                SnwcBytes {
                    ptr: PASSWORD.as_ptr(),
                    len: PASSWORD.len(),
                },
                1,
                &mut mnemonic,
                &mut pending,
                &mut warnings,
            );
            assert_eq!(CStr::from_ptr(error).to_bytes(), b"BindingFailure");
            assert!(mnemonic.ptr.is_null() && mnemonic.len == 0);
            assert!(pending.ptr.is_null() && pending.len == 0);
            assert!(warnings.ptr.is_null() && warnings.len == 0);
            snwc_free_bytes(&mut input_store);
        }
    }
}

//! wasm-bindgenによるWASM Binding。
//!
//! このモジュールはUint8ArrayとJavaScript objectへの変換、Core error codeと
//! DecodeWarningのmapping、入力bufferの一時所有だけを担当する。暗号処理、
//! 認証、導出、署名および重複判定はすべて親crateのCoreへ委譲する。
//!
//! JavaScript側では、Store・Pending Profile・Mnemonic・password・private key・payload・
//! signature・public keyを`Uint8Array`で扱う。UUIDは文字列、Networkは`0`=Testnet /
//! `1`=Mainnet、Chainは`0`=NEM / `1`=Symbolとして受け取る。読み取り結果は
//! `{ value, warnings }`、状態変更結果は`{ store, value, warnings }`のobjectに変換する。
//! `Result`のエラーは秘密情報を含まないerror code文字列としてJavaScriptへ投げる。

use js_sys::{Array, Function, Object, Reflect, Uint8Array};
use uuid::Uuid;
use wasm_bindgen::{prelude::*, JsCast};
use zeroize::Zeroizing;

use crate::store::MAX_WALLET_STORE_BYTES;
use crate::{
    change_profile_password as core_change_profile_password,
    create_empty_store as core_create_empty_store, delete_profile as core_delete_profile,
    delete_software_key as core_delete_software_key,
    derive_software_key as core_derive_software_key, export_mnemonic as core_export_mnemonic,
    export_private_key as core_export_private_key,
    finalize_generated_profile as core_finalize_generated_profile,
    generate_software_key as core_generate_software_key,
    get_public_account as core_get_public_account, import_software_key as core_import_software_key,
    list_profiles as core_list_profiles, list_software_keys as core_list_software_keys,
    prepare_generated_profile as core_prepare_generated_profile,
    restore_profile as core_restore_profile, sign as core_sign, AccountContext, Chain,
    DecodeWarning, ErrorCode, ExportApplicationConfirmation, ExportApplicationConfirmationStatus,
    ExportRequest, ExportTarget, ExportUserRequest, ExportUserRequestStatus, HandoffConfirmation,
    HandoffConfirmationStatus, MnemonicExport, MutationResult, Network, PreparedProfile,
    PrivateKeyExport, ProfileInfo, PublicAccountInfo, Signature, SigningApproval,
    SigningApprovalStatus, SigningRequest, SigningTarget, SoftwareKeyInfo, SoftwareKeyListItem,
    SoftwareKeyOrigin, WalletError,
};

fn binding_error(error: WalletError) -> JsValue {
    // errorにはcodeだけを返し、秘密情報や内部メッセージはJavaScriptへ出さない。
    JsValue::from_str(error.code.as_str())
}

fn conversion_error() -> JsValue {
    JsValue::from_str(ErrorCode::BindingFailure.as_str())
}

fn invalid_argument() -> JsValue {
    JsValue::from_str(ErrorCode::InvalidArgument.as_str())
}

fn field(value: &JsValue, name: &str) -> Result<JsValue, JsValue> {
    if !value.is_object() || value.is_null() {
        return Err(invalid_argument());
    }
    Reflect::get(value, &JsValue::from_str(name)).map_err(|_| conversion_error())
}

fn string_field(value: &JsValue, name: &str) -> Result<String, JsValue> {
    field(value, name)?.as_string().ok_or_else(invalid_argument)
}

fn set(object: &Object, key: &str, value: JsValue) -> Result<(), JsValue> {
    Reflect::set(object.as_ref(), &JsValue::from_str(key), &value)
        .map(|_| ())
        .map_err(|_| conversion_error())
}

fn uint8_array_length(value: &Uint8Array) -> Result<usize, JsValue> {
    let length = Reflect::get(value.as_ref(), &JsValue::from_str("length"))
        .map_err(|_| conversion_error())?
        .as_f64()
        .filter(|length| {
            length.is_finite() && length.fract() == 0.0 && (0.0..=u32::MAX as f64).contains(length)
        })
        .ok_or_else(conversion_error)?;
    Ok(length as usize)
}

fn backing_buffer_is_detached(value: &Uint8Array) -> Result<bool, JsValue> {
    let buffer = Reflect::get(value.as_ref(), &JsValue::from_str("buffer"))
        .map_err(|_| conversion_error())?;
    let detached =
        Reflect::get(&buffer, &JsValue::from_str("detached")).map_err(|_| conversion_error())?;

    // Older runtimes may not expose ArrayBuffer.prototype.detached. In that case the
    // catch-enabled slice below remains the fallback for detached / unreadable buffers.
    match detached.as_bool() {
        Some(detached) => Ok(detached),
        None if detached.is_undefined() => Ok(false),
        None => Err(conversion_error()),
    }
}

fn copy_uint8_array(
    value: &Uint8Array,
    max_length: Option<usize>,
) -> Result<Zeroizing<Vec<u8>>, JsValue> {
    // Read the representation before allocating. A detached Uint8Array reports length 0,
    // so length alone must never be used to distinguish it from an attached empty array.
    let length = uint8_array_length(value)?;
    if backing_buffer_is_detached(value)? {
        return Err(conversion_error());
    }
    if max_length.is_some_and(|max_length| length > max_length) {
        return Err(JsValue::from_str(ErrorCode::InvalidStore.as_str()));
    }

    // Calling slice through Function::call0 gives the binding a catch-enabled JS read path.
    // This covers runtimes without ArrayBuffer.prototype.detached and any unreadable source
    // that throws while its contents are being copied.
    let slice = Reflect::get(value.as_ref(), &JsValue::from_str("slice"))
        .map_err(|_| conversion_error())?
        .dyn_into::<Function>()
        .map_err(|_| conversion_error())?;
    let copied = slice
        .call0(value.as_ref())
        .map_err(|_| conversion_error())?
        .dyn_into::<Uint8Array>()
        .map_err(|_| conversion_error())?;
    if backing_buffer_is_detached(&copied)? || uint8_array_length(&copied)? != length {
        return Err(conversion_error());
    }

    let mut output = vec![0u8; length];
    copied.copy_to(&mut output);
    // JS管理下の入力をCoreへ渡す一時Vec。Storeにもregistry_keyが含まれるため、
    // Core処理終了後はBinding側のコピーもzeroizeしてから所有を終える。
    Ok(Zeroizing::new(output))
}

fn bytes(value: &Uint8Array) -> Result<Zeroizing<Vec<u8>>, JsValue> {
    copy_uint8_array(value, None)
}

fn store_bytes(value: &Uint8Array) -> Result<Zeroizing<Vec<u8>>, JsValue> {
    // Store decoderの上限検査より前にWASM側で入力全体を複製しないよう、
    // Uint8Arrayの長さをRust側のallocation前に確認する。
    copy_uint8_array(value, Some(MAX_WALLET_STORE_BYTES))
}

fn uint8_array(value: &[u8]) -> JsValue {
    Uint8Array::from(value).into()
}

fn parse_network(value: f64) -> Result<Network, WalletError> {
    // C ABIと同じwire mappingを使い、未知値を暗黙に補正しない。
    if !value.is_finite() || value.fract() != 0.0 {
        return Err(WalletError {
            code: ErrorCode::InvalidArgument,
        });
    }
    match value {
        0.0 => Ok(Network::Testnet),
        1.0 => Ok(Network::Mainnet),
        _ => Err(WalletError {
            code: ErrorCode::InvalidArgument,
        }),
    }
}

fn parse_chain(value: f64) -> Result<Chain, WalletError> {
    // Chain値の取り違えを防ぐため、0/1以外は入力エラーにする。
    if !value.is_finite() || value.fract() != 0.0 {
        return Err(WalletError {
            code: ErrorCode::InvalidArgument,
        });
    }
    match value {
        0.0 => Ok(Chain::Nem),
        1.0 => Ok(Chain::Symbol),
        _ => Err(WalletError {
            code: ErrorCode::InvalidArgument,
        }),
    }
}

fn parse_account_index(value: f64) -> Result<u32, WalletError> {
    if !value.is_finite() || value.fract() != 0.0 || !(0.0..=2_147_483_647.0).contains(&value) {
        return Err(WalletError {
            code: ErrorCode::InvalidAccountIndex,
        });
    }
    Ok(value as u32)
}

fn parse_uuid(value: &str) -> Result<Uuid, WalletError> {
    // 公開APIのUUIDはcanonicalな36文字表現だけを受け付ける。
    let bytes = value.as_bytes();
    let hyphen_positions = [8, 13, 18, 23];
    if bytes.len() != 36
        || hyphen_positions
            .iter()
            .any(|position| bytes[*position] != b'-')
        || bytes.iter().enumerate().any(|(position, byte)| {
            !hyphen_positions.contains(&position) && !byte.is_ascii_hexdigit()
        })
    {
        return Err(WalletError {
            code: ErrorCode::InvalidArgument,
        });
    }
    Uuid::parse_str(value).map_err(|_| WalletError {
        code: ErrorCode::InvalidArgument,
    })
}

fn parse_handoff_confirmation(value: &JsValue) -> Result<HandoffConfirmation, JsValue> {
    let status = match string_field(value, "status")?.as_str() {
        "unconfirmed" => HandoffConfirmationStatus::Unconfirmed,
        "confirmed" => HandoffConfirmationStatus::Confirmed,
        _ => return Err(invalid_argument()),
    };
    Ok(HandoffConfirmation { status })
}

fn parse_export_target(value: &JsValue) -> Result<ExportTarget, JsValue> {
    let profile_id = parse_uuid(&string_field(value, "profile_id")?).map_err(binding_error)?;
    match string_field(value, "kind")?.as_str() {
        "mnemonic" => Ok(ExportTarget::MnemonicTarget { profile_id }),
        "software_key" => Ok(ExportTarget::SoftwareKeyTarget {
            profile_id,
            key_id: parse_uuid(&string_field(value, "key_id")?).map_err(binding_error)?,
        }),
        _ => Err(invalid_argument()),
    }
}

fn parse_export_request(value: &JsValue) -> Result<ExportRequest, JsValue> {
    let target = parse_export_target(&field(value, "target")?)?;
    let user_value = field(value, "user_request")?;
    let user_request = ExportUserRequest {
        target: parse_export_target(&field(&user_value, "target")?)?,
        status: match string_field(&user_value, "status")?.as_str() {
            "not_requested" => ExportUserRequestStatus::NotRequested,
            "requested" => ExportUserRequestStatus::Requested,
            _ => return Err(invalid_argument()),
        },
    };
    let confirmation_value = field(value, "application_confirmation")?;
    let application_confirmation = ExportApplicationConfirmation {
        target: parse_export_target(&field(&confirmation_value, "target")?)?,
        status: match string_field(&confirmation_value, "status")?.as_str() {
            "not_confirmed" => ExportApplicationConfirmationStatus::NotConfirmed,
            "confirmed" => ExportApplicationConfirmationStatus::Confirmed,
            _ => return Err(invalid_argument()),
        },
    };
    Ok(ExportRequest {
        target,
        user_request,
        application_confirmation,
    })
}

fn parse_account_context(value: &JsValue) -> Result<AccountContext, JsValue> {
    let chain = match string_field(value, "chain")?.as_str() {
        "nem" => Chain::Nem,
        "symbol" => Chain::Symbol,
        _ => return Err(invalid_argument()),
    };
    let network = match string_field(value, "network")?.as_str() {
        "testnet" => Network::Testnet,
        "mainnet" => Network::Mainnet,
        _ => return Err(invalid_argument()),
    };
    Ok(AccountContext { chain, network })
}

fn parse_signing_request(value: &JsValue) -> Result<SigningRequest, JsValue> {
    let target_value = field(value, "target")?;
    let target = SigningTarget {
        profile_id: parse_uuid(&string_field(&target_value, "profile_id")?)
            .map_err(binding_error)?,
        key_id: parse_uuid(&string_field(&target_value, "key_id")?).map_err(binding_error)?,
        context: parse_account_context(&field(&target_value, "context")?)?,
    };
    let payload_value = field(value, "payload")?;
    let payload = payload_value
        .dyn_into::<Uint8Array>()
        .map_err(|_| invalid_argument())?;
    let mut payload = bytes(&payload)?;
    let payload = std::mem::take(&mut *payload);
    let approval_value = field(value, "approval")?;
    let approval = SigningApproval {
        status: match string_field(&approval_value, "status")?.as_str() {
            "not_approved" => SigningApprovalStatus::NotApproved,
            "approved" => SigningApprovalStatus::Approved,
            _ => return Err(invalid_argument()),
        },
    };
    Ok(SigningRequest {
        target,
        payload,
        approval,
    })
}

fn network_text(value: Network) -> &'static str {
    match value {
        Network::Testnet => "testnet",
        Network::Mainnet => "mainnet",
    }
}

fn chain_text(value: Chain) -> &'static str {
    match value {
        Chain::Nem => "nem",
        Chain::Symbol => "symbol",
    }
}

fn origin_object(origin: SoftwareKeyOrigin) -> Result<JsValue, JsValue> {
    let object = Object::new();
    match origin {
        SoftwareKeyOrigin::Derived { account_index } => {
            set(&object, "kind", JsValue::from_str("derived"))?;
            set(
                &object,
                "account_index",
                JsValue::from_f64(account_index as f64),
            )?;
        }
        SoftwareKeyOrigin::Imported => set(&object, "kind", JsValue::from_str("imported"))?,
        SoftwareKeyOrigin::Generated => set(&object, "kind", JsValue::from_str("generated"))?,
    }
    Ok(object.into())
}

fn warning_array(warnings: &[DecodeWarning]) -> Result<JsValue, JsValue> {
    // Warningは診断情報として変換し、Mnemonicやprivate keyなどの秘密値はコピーしない。
    let array = Array::new();
    for warning in warnings {
        let object = Object::new();
        set(&object, "code", JsValue::from_str(warning.code))?;
        set(
            &object,
            "object_type",
            JsValue::from_str(warning.object_type),
        )?;
        match warning.object_id {
            Some(object_id) => set(
                &object,
                "object_id",
                JsValue::from_str(&object_id.to_string()),
            )?,
            None => set(&object, "object_id", JsValue::UNDEFINED)?,
        }
        match warning.field {
            Some(field) => set(&object, "field", JsValue::from_str(field))?,
            None => set(&object, "field", JsValue::UNDEFINED)?,
        }
        array.push(object.as_ref());
    }
    Ok(array.into())
}

fn read_result(value: JsValue, warnings: Vec<DecodeWarning>) -> Result<JsValue, JsValue> {
    // CoreのReadResult<T>をJavaScript objectへ変換する共通経路。
    let object = Object::new();
    set(&object, "value", value)?;
    set(&object, "warnings", warning_array(&warnings)?)?;
    Ok(object.into())
}

fn mutation_result<T>(result: MutationResult<T>, value: JsValue) -> Result<JsValue, JsValue> {
    // 成功時だけ完全なreplacement StoreをUint8Arrayで返す共通経路。
    let MutationResult {
        store, warnings, ..
    } = result;
    let store = Zeroizing::new(store);
    let object = Object::new();
    set(&object, "store", uint8_array(&store))?;
    set(&object, "value", value)?;
    set(&object, "warnings", warning_array(&warnings)?)?;
    Ok(object.into())
}

fn profile_info(value: &ProfileInfo) -> Result<JsValue, JsValue> {
    let object = Object::new();
    set(
        &object,
        "profile_id",
        JsValue::from_str(&value.profile_id.to_string()),
    )?;
    set(
        &object,
        "network",
        JsValue::from_str(network_text(value.network)),
    )?;
    set(
        &object,
        "software_key_count",
        JsValue::from_f64(value.software_key_count as f64),
    )?;
    Ok(object.into())
}

fn software_key_info(value: &SoftwareKeyInfo) -> Result<JsValue, JsValue> {
    let object = Object::new();
    set(
        &object,
        "key_id",
        JsValue::from_str(&value.key_id.to_string()),
    )?;
    set(&object, "chain", JsValue::from_str(chain_text(value.chain)))?;
    set(&object, "origin", origin_object(value.origin)?)?;
    Ok(object.into())
}

fn software_key_list_item(value: &SoftwareKeyListItem) -> Result<JsValue, JsValue> {
    let object = Object::new();
    set(
        &object,
        "key_id",
        JsValue::from_str(&value.key_id.to_string()),
    )?;
    set(&object, "chain", JsValue::from_str(chain_text(value.chain)))?;
    Ok(object.into())
}

fn public_account(value: &PublicAccountInfo) -> Result<JsValue, JsValue> {
    let object = Object::new();
    set(
        &object,
        "key_id",
        JsValue::from_str(&value.key_id.to_string()),
    )?;
    set(&object, "chain", JsValue::from_str(chain_text(value.chain)))?;
    set(
        &object,
        "network",
        JsValue::from_str(network_text(value.network)),
    )?;
    set(&object, "public_key", uint8_array(&value.public_key))?;
    set(&object, "address", JsValue::from_str(&value.address))?;
    Ok(object.into())
}

fn signature(value: &Signature) -> Result<JsValue, JsValue> {
    let object = Object::new();
    set(&object, "signature", uint8_array(&value.signature))?;
    Ok(object.into())
}

fn mnemonic_export(value: MnemonicExport) -> Result<JsValue, JsValue> {
    let object = Object::new();
    // DTO自身が所有するbufferを参照し、JS向け変換のための一時Rustコピーを作らない。
    // 関数終了時にはMnemonicExport::dropが元bufferをzeroizeする。
    set(&object, "mnemonic_utf8", uint8_array(&value.mnemonic_utf8))?;
    Ok(object.into())
}

fn private_key_export(value: PrivateKeyExport) -> Result<JsValue, JsValue> {
    let object = Object::new();
    // Uint8Array生成時のJS側コピーは仕様上の返却値。その後、DTO側のraw keyを破棄する。
    set(&object, "private_key", uint8_array(&value.private_key[..]))?;
    Ok(object.into())
}

fn prepared_profile(value: PreparedProfile) -> Result<JsValue, JsValue> {
    let object = Object::new();
    // Pending ProfileもDTOのDropでzeroizeし、binding内で別の通常Vecを保持しない。
    set(&object, "mnemonic_utf8", uint8_array(&value.mnemonic_utf8))?;
    set(
        &object,
        "pending_profile",
        uint8_array(&value.pending_profile),
    )?;
    Ok(object.into())
}

/// JavaScriptから空のWallet Storeを作成する。
///
/// 成功時はopaqueなStoreを`Uint8Array`で返す。Storeの内容をJavaScript側で編集せず、
/// Coreの状態変更結果へ置き換える。
#[wasm_bindgen(js_name = create_empty_store)]
pub fn create_empty_store() -> Result<Uint8Array, JsValue> {
    let value = core_create_empty_store().map_err(binding_error)?;
    let value = Zeroizing::new(value);
    Ok(Uint8Array::from(value.as_slice()))
}

/// Mnemonic生成の初回段階を実行し、Storeを変更せずにPending Profileを返す。
///
/// 成功結果は`{ value: { mnemonic_utf8, pending_profile }, warnings }`であり、秘密値は
/// すべて`Uint8Array`である。利用者へのバックアップ確認後だけfinalizeへ進む。
#[wasm_bindgen(js_name = prepare_generated_profile)]
pub fn prepare_generated_profile(
    store: &Uint8Array,
    password_utf8: &Uint8Array,
    network: f64,
) -> Result<JsValue, JsValue> {
    let network = parse_network(network).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let password = bytes(password_utf8)?;
    let result =
        core_prepare_generated_profile(&store_bytes, &password, network).map_err(binding_error)?;
    read_result(prepared_profile(result.value)?, result.warnings)
}

/// Pending Profileを認証してProfileを確定する。
///
/// 成功結果は`{ store, value: ProfileInfo, warnings }`である。
#[wasm_bindgen(js_name = finalize_generated_profile)]
pub fn finalize_generated_profile(
    store: &Uint8Array,
    pending_profile: &Uint8Array,
    password_utf8: &Uint8Array,
    handoff_confirmation: &JsValue,
) -> Result<JsValue, JsValue> {
    let store_bytes = store_bytes(store)?;
    let pending_bytes = bytes(pending_profile)?;
    let password = bytes(password_utf8)?;
    let handoff_confirmation = parse_handoff_confirmation(handoff_confirmation)?;
    let result = core_finalize_generated_profile(
        &store_bytes,
        &pending_bytes,
        &password,
        handoff_confirmation,
    )
    .map_err(binding_error)?;
    let value = profile_info(&result.value)?;
    mutation_result(result, value)
}

/// UTF-8 BIP39 MnemonicからProfileを復元する。
///
/// `mnemonic_utf8`と`password_utf8`は`Uint8Array`で渡し、成功時はreplacement Storeと
/// Profile情報を返す。Profile情報の`profile_id`はUUID文字列である。
#[wasm_bindgen(js_name = restore_profile)]
pub fn restore_profile(
    store: &Uint8Array,
    mnemonic_utf8: &Uint8Array,
    password_utf8: &Uint8Array,
    network: f64,
) -> Result<JsValue, JsValue> {
    let network = parse_network(network).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let mnemonic = bytes(mnemonic_utf8)?;
    let password = bytes(password_utf8)?;
    let result =
        core_restore_profile(&store_bytes, &mnemonic, &password, network).map_err(binding_error)?;
    let value = profile_info(&result.value)?;
    mutation_result(result, value)
}

/// ProfileのMnemonicを明示的にexportする。
///
/// 成功結果は`{ value: { mnemonic_utf8 }, warnings }`である。返却後の保管・表示・破棄は
/// アプリケーションの秘密情報管理責任であり、Bindingはキャッシュしない。
#[wasm_bindgen(js_name = export_mnemonic)]
pub fn export_mnemonic(
    store: &Uint8Array,
    request: &JsValue,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let request = parse_export_request(request)?;
    let store_bytes = store_bytes(store)?;
    let password = bytes(password_utf8)?;
    let result = core_export_mnemonic(&store_bytes, request, &password).map_err(binding_error)?;
    read_result(mnemonic_export(result.value)?, result.warnings)
}

/// Software Keyのprivate keyを明示的にexportする。
///
/// 成功結果は`{ value: { private_key }, warnings }`で、`private_key`はraw 32 bytesの
/// `Uint8Array`である。
#[wasm_bindgen(js_name = export_private_key)]
pub fn export_private_key(
    store: &Uint8Array,
    request: &JsValue,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let request = parse_export_request(request)?;
    let store_bytes = store_bytes(store)?;
    let password = bytes(password_utf8)?;
    let result =
        core_export_private_key(&store_bytes, request, &password).map_err(binding_error)?;
    read_result(private_key_export(result.value)?, result.warnings)
}

/// passwordなしでProfile一覧を取得する。
///
/// 成功結果は`{ value: ProfileInfo[], warnings }`である。結果は平文manifest由来であり、
/// payloadのAEAD認証済み情報とは区別する。
#[wasm_bindgen(js_name = list_profiles)]
pub fn list_profiles(store: &Uint8Array) -> Result<JsValue, JsValue> {
    let store_bytes = store_bytes(store)?;
    let result = core_list_profiles(&store_bytes).map_err(binding_error)?;
    let array = Array::new();
    for value in &result.value {
        let object = profile_info(value)?;
        array.push(&object);
    }
    read_result(array.into(), result.warnings)
}

/// Profile内のSoftware Key一覧を取得する。
///
/// 成功結果は`{ value: SoftwareKeyListItem[], warnings }`であり、private keyやoriginは
/// 含まない。
#[wasm_bindgen(js_name = list_software_keys)]
pub fn list_software_keys(store: &Uint8Array, profile_id: &str) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let result = core_list_software_keys(&store_bytes, profile_id).map_err(binding_error)?;
    let array = Array::new();
    for value in &result.value {
        let object = software_key_list_item(value)?;
        array.push(&object);
    }
    read_result(array.into(), result.warnings)
}

/// MnemonicからSoftware Keyを導出して保存する。
///
/// `account_index`はv1のhardened導出範囲で解釈し、成功時はreplacement Storeと
/// `SoftwareKeyInfo`を返す。
#[wasm_bindgen(js_name = derive_software_key)]
pub fn derive_software_key(
    store: &Uint8Array,
    profile_id: &str,
    password_utf8: &Uint8Array,
    chain: f64,
    account_index: f64,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let chain = parse_chain(chain).map_err(binding_error)?;
    let account_index = parse_account_index(account_index).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let password = bytes(password_utf8)?;
    let result =
        core_derive_software_key(&store_bytes, profile_id, &password, chain, account_index)
            .map_err(binding_error)?;
    let value = software_key_info(&result.value)?;
    mutation_result(result, value)
}

/// raw private keyを検証してSoftware Keyとして保存する。
///
/// `private_key`はtextual encodingではなくraw 32 bytesの`Uint8Array`で渡す。
#[wasm_bindgen(js_name = import_software_key)]
pub fn import_software_key(
    store: &Uint8Array,
    profile_id: &str,
    password_utf8: &Uint8Array,
    chain: f64,
    private_key: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let chain = parse_chain(chain).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let password = bytes(password_utf8)?;
    let private_key = bytes(private_key)?;
    let result = core_import_software_key(&store_bytes, profile_id, &password, chain, &private_key)
        .map_err(binding_error)?;
    let value = software_key_info(&result.value)?;
    mutation_result(result, value)
}

/// CSPRNGでSoftware Keyを生成して保存する。
///
/// 成功時はreplacement Storeと`SoftwareKeyInfo`を返す。乱数生成と鍵の妥当性検証は
/// Coreへ委譲する。
#[wasm_bindgen(js_name = generate_software_key)]
pub fn generate_software_key(
    store: &Uint8Array,
    profile_id: &str,
    password_utf8: &Uint8Array,
    chain: f64,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let chain = parse_chain(chain).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let password = bytes(password_utf8)?;
    let result = core_generate_software_key(&store_bytes, profile_id, &password, chain)
        .map_err(binding_error)?;
    let value = software_key_info(&result.value)?;
    mutation_result(result, value)
}

/// Software Keyのpublic account情報を取得する。
///
/// 成功結果は`{ value: { key_id, chain, network, public_key, address }, warnings }`である。
/// `public_key`はraw 32 bytes、`address`はChain/Networkに対応する文字列となる。
#[wasm_bindgen(js_name = get_public_account)]
pub fn get_public_account(
    store: &Uint8Array,
    profile_id: &str,
    key_id: &str,
    requested_context: &JsValue,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let key_id = parse_uuid(key_id).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let requested_context = parse_account_context(requested_context)?;
    let password = bytes(password_utf8)?;
    let result = core_get_public_account(
        &store_bytes,
        profile_id,
        key_id,
        requested_context,
        &password,
    )
    .map_err(binding_error)?;
    read_result(public_account(&result.value)?, result.warnings)
}

/// Software Keyでpayload byte列に署名する。
///
/// payloadをTransactionとして解釈せず、渡された`Uint8Array`をそのまま署名する。成功
/// 結果の`value.signature`はraw 64 bytesの`Uint8Array`である。
#[wasm_bindgen(js_name = sign)]
pub fn sign(
    store: &Uint8Array,
    request: &JsValue,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let request = parse_signing_request(request)?;
    let store_bytes = store_bytes(store)?;
    let password = bytes(password_utf8)?;
    let result = core_sign(&store_bytes, request, &password).map_err(binding_error)?;
    read_result(signature(&result.value)?, result.warnings)
}

/// Profile passwordを変更してreplacement Storeを返す。
///
/// 成功結果は`{ store, value: null, warnings }`である。呼び出し側は旧Storeではなく
/// 返却Storeを保存対象に置き換える。
#[wasm_bindgen(js_name = change_profile_password)]
pub fn change_profile_password(
    store: &Uint8Array,
    profile_id: &str,
    current_password_utf8: &Uint8Array,
    new_password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let current_password = bytes(current_password_utf8)?;
    let new_password = bytes(new_password_utf8)?;
    let result =
        core_change_profile_password(&store_bytes, profile_id, &current_password, &new_password)
            .map_err(binding_error)?;
    mutation_result(result, JsValue::NULL)
}

/// Software Keyを削除してreplacement Storeを返す。
///
/// 成功結果は`{ store, value: null, warnings }`であり、対象Profile内の指定Keyだけを
/// 削除する。
#[wasm_bindgen(js_name = delete_software_key)]
pub fn delete_software_key(
    store: &Uint8Array,
    profile_id: &str,
    key_id: &str,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let key_id = parse_uuid(key_id).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let password = bytes(password_utf8)?;
    let result = core_delete_software_key(&store_bytes, profile_id, key_id, &password)
        .map_err(binding_error)?;
    mutation_result(result, JsValue::NULL)
}

/// Profileを削除してreplacement Storeを返す。
///
/// 成功結果は`{ store, value: null, warnings }`であり、対象Profileとその秘密payloadを
/// Storeから除去する。
#[wasm_bindgen(js_name = delete_profile)]
pub fn delete_profile(
    store: &Uint8Array,
    profile_id: &str,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let store_bytes = store_bytes(store)?;
    let password = bytes(password_utf8)?;
    let result = core_delete_profile(&store_bytes, profile_id, &password).map_err(binding_error)?;
    mutation_result(result, JsValue::NULL)
}

#[cfg(all(test, target_arch = "wasm32"))]
#[path = "../tests/unit/wasm.rs"]
mod tests;

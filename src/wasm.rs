//! wasm-bindgenによるWASM Binding。
//!
//! このモジュールはUint8ArrayとJavaScript objectへの変換、Core error codeと
//! DecodeWarningのmapping、入力bufferの一時所有だけを担当する。暗号処理、
//! 認証、導出、署名および重複判定はすべて親crateのCoreへ委譲する。

use js_sys::{Array, Object, Reflect, Uint8Array};
use uuid::Uuid;
use wasm_bindgen::prelude::*;
use zeroize::Zeroizing;

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
    restore_profile as core_restore_profile, sign as core_sign, Chain, DecodeWarning, ErrorCode,
    MnemonicExport, MutationResult, Network, PreparedProfile, PrivateKeyExport, ProfileInfo,
    PublicAccountInfo, Signature, SoftwareKeyInfo, SoftwareKeyListItem, SoftwareKeyOrigin,
    WalletError,
};

fn binding_error(error: WalletError) -> JsValue {
    // errorにはcodeだけを返し、秘密情報や内部メッセージはJavaScriptへ出さない。
    JsValue::from_str(error.code.as_str())
}

fn conversion_error() -> JsValue {
    JsValue::from_str(ErrorCode::SerializationFailure.as_str())
}

fn set(object: &Object, key: &str, value: JsValue) -> Result<(), JsValue> {
    Reflect::set(object.as_ref(), &JsValue::from_str(key), &value)
        .map(|_| ())
        .map_err(|_| conversion_error())
}

fn bytes(value: &Uint8Array) -> Vec<u8> {
    value.to_vec()
}

fn uint8_array(value: &[u8]) -> JsValue {
    Uint8Array::from(value).into()
}

fn parse_network(value: u8) -> Result<Network, WalletError> {
    match value {
        0 => Ok(Network::Testnet),
        1 => Ok(Network::Mainnet),
        _ => Err(WalletError {
            code: ErrorCode::InvalidArgument,
        }),
    }
}

fn parse_chain(value: u8) -> Result<Chain, WalletError> {
    match value {
        0 => Ok(Chain::Nem),
        1 => Ok(Chain::Symbol),
        _ => Err(WalletError {
            code: ErrorCode::InvalidArgument,
        }),
    }
}

fn parse_uuid(value: &str) -> Result<Uuid, WalletError> {
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
    let object = Object::new();
    set(&object, "value", value)?;
    set(&object, "warnings", warning_array(&warnings)?)?;
    Ok(object.into())
}

fn mutation_result<T>(result: MutationResult<T>, value: JsValue) -> Result<JsValue, JsValue> {
    let object = Object::new();
    set(&object, "store", uint8_array(&result.store))?;
    set(&object, "value", value)?;
    set(&object, "warnings", warning_array(&result.warnings)?)?;
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

/// 空のWallet Storeを作成する。
#[wasm_bindgen(js_name = create_empty_store)]
pub fn create_empty_store() -> Result<Uint8Array, JsValue> {
    core_create_empty_store()
        .map(|value| Uint8Array::from(value.as_slice()))
        .map_err(binding_error)
}

/// Mnemonic生成の初回段階を実行し、Storeを変更せずにPending Profileを返す。
#[wasm_bindgen(js_name = prepare_generated_profile)]
pub fn prepare_generated_profile(
    store: &Uint8Array,
    password_utf8: &Uint8Array,
    network: u8,
) -> Result<JsValue, JsValue> {
    let network = parse_network(network).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let result =
        core_prepare_generated_profile(&store_bytes, &password, network).map_err(binding_error)?;
    read_result(prepared_profile(result.value)?, result.warnings)
}

/// Pending Profileを認証してProfileを確定する。
#[wasm_bindgen(js_name = finalize_generated_profile)]
pub fn finalize_generated_profile(
    store: &Uint8Array,
    pending_profile: &Uint8Array,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let store_bytes = bytes(store);
    let pending_bytes = Zeroizing::new(bytes(pending_profile));
    let password = Zeroizing::new(bytes(password_utf8));
    let result = core_finalize_generated_profile(&store_bytes, &pending_bytes, &password)
        .map_err(binding_error)?;
    let value = profile_info(&result.value)?;
    mutation_result(result, value)
}

/// UTF-8 BIP39 MnemonicからProfileを復元する。
#[wasm_bindgen(js_name = restore_profile)]
pub fn restore_profile(
    store: &Uint8Array,
    mnemonic_utf8: &Uint8Array,
    password_utf8: &Uint8Array,
    network: u8,
) -> Result<JsValue, JsValue> {
    let network = parse_network(network).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let mnemonic = Zeroizing::new(bytes(mnemonic_utf8));
    let password = Zeroizing::new(bytes(password_utf8));
    let result =
        core_restore_profile(&store_bytes, &mnemonic, &password, network).map_err(binding_error)?;
    let value = profile_info(&result.value)?;
    mutation_result(result, value)
}

/// ProfileのMnemonicを明示的にexportする。
#[wasm_bindgen(js_name = export_mnemonic)]
pub fn export_mnemonic(
    store: &Uint8Array,
    profile_id: &str,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let result =
        core_export_mnemonic(&store_bytes, profile_id, &password).map_err(binding_error)?;
    read_result(mnemonic_export(result.value)?, result.warnings)
}

/// Software Keyのprivate keyを明示的にexportする。
#[wasm_bindgen(js_name = export_private_key)]
pub fn export_private_key(
    store: &Uint8Array,
    profile_id: &str,
    key_id: &str,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let key_id = parse_uuid(key_id).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let result = core_export_private_key(&store_bytes, profile_id, key_id, &password)
        .map_err(binding_error)?;
    read_result(private_key_export(result.value)?, result.warnings)
}

/// passwordなしでProfile一覧を取得する。
#[wasm_bindgen(js_name = list_profiles)]
pub fn list_profiles(store: &Uint8Array) -> Result<JsValue, JsValue> {
    let store_bytes = bytes(store);
    let result = core_list_profiles(&store_bytes).map_err(binding_error)?;
    let array = Array::new();
    for value in &result.value {
        let object = profile_info(value)?;
        array.push(&object);
    }
    read_result(array.into(), result.warnings)
}

/// Profile内のSoftware Key一覧を取得する。
#[wasm_bindgen(js_name = list_software_keys)]
pub fn list_software_keys(store: &Uint8Array, profile_id: &str) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let result = core_list_software_keys(&store_bytes, profile_id).map_err(binding_error)?;
    let array = Array::new();
    for value in &result.value {
        let object = software_key_list_item(value)?;
        array.push(&object);
    }
    read_result(array.into(), result.warnings)
}

/// MnemonicからSoftware Keyを導出して保存する。
#[wasm_bindgen(js_name = derive_software_key)]
pub fn derive_software_key(
    store: &Uint8Array,
    profile_id: &str,
    password_utf8: &Uint8Array,
    chain: u8,
    account_index: u32,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let chain = parse_chain(chain).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let result =
        core_derive_software_key(&store_bytes, profile_id, &password, chain, account_index)
            .map_err(binding_error)?;
    let value = software_key_info(&result.value)?;
    mutation_result(result, value)
}

/// raw private keyを検証してSoftware Keyとして保存する。
#[wasm_bindgen(js_name = import_software_key)]
pub fn import_software_key(
    store: &Uint8Array,
    profile_id: &str,
    password_utf8: &Uint8Array,
    chain: u8,
    private_key: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let chain = parse_chain(chain).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let private_key = Zeroizing::new(bytes(private_key));
    let result = core_import_software_key(&store_bytes, profile_id, &password, chain, &private_key)
        .map_err(binding_error)?;
    let value = software_key_info(&result.value)?;
    mutation_result(result, value)
}

/// CSPRNGでSoftware Keyを生成して保存する。
#[wasm_bindgen(js_name = generate_software_key)]
pub fn generate_software_key(
    store: &Uint8Array,
    profile_id: &str,
    password_utf8: &Uint8Array,
    chain: u8,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let chain = parse_chain(chain).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let result = core_generate_software_key(&store_bytes, profile_id, &password, chain)
        .map_err(binding_error)?;
    let value = software_key_info(&result.value)?;
    mutation_result(result, value)
}

/// Software Keyのpublic account情報を取得する。
#[wasm_bindgen(js_name = get_public_account)]
pub fn get_public_account(
    store: &Uint8Array,
    profile_id: &str,
    key_id: &str,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let key_id = parse_uuid(key_id).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let result = core_get_public_account(&store_bytes, profile_id, key_id, &password)
        .map_err(binding_error)?;
    read_result(public_account(&result.value)?, result.warnings)
}

/// Software Keyでpayload byte列に署名する。
#[wasm_bindgen(js_name = sign)]
pub fn sign(
    store: &Uint8Array,
    profile_id: &str,
    key_id: &str,
    password_utf8: &Uint8Array,
    payload: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let key_id = parse_uuid(key_id).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let payload = Zeroizing::new(bytes(payload));
    let result =
        core_sign(&store_bytes, profile_id, key_id, &password, &payload).map_err(binding_error)?;
    read_result(signature(&result.value)?, result.warnings)
}

/// Profile passwordを変更してreplacement Storeを返す。
#[wasm_bindgen(js_name = change_profile_password)]
pub fn change_profile_password(
    store: &Uint8Array,
    profile_id: &str,
    current_password_utf8: &Uint8Array,
    new_password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let current_password = Zeroizing::new(bytes(current_password_utf8));
    let new_password = Zeroizing::new(bytes(new_password_utf8));
    let result =
        core_change_profile_password(&store_bytes, profile_id, &current_password, &new_password)
            .map_err(binding_error)?;
    mutation_result(result, JsValue::NULL)
}

/// Software Keyを削除してreplacement Storeを返す。
#[wasm_bindgen(js_name = delete_software_key)]
pub fn delete_software_key(
    store: &Uint8Array,
    profile_id: &str,
    key_id: &str,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let key_id = parse_uuid(key_id).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let result = core_delete_software_key(&store_bytes, profile_id, key_id, &password)
        .map_err(binding_error)?;
    mutation_result(result, JsValue::NULL)
}

/// Profileを削除してreplacement Storeを返す。
#[wasm_bindgen(js_name = delete_profile)]
pub fn delete_profile(
    store: &Uint8Array,
    profile_id: &str,
    password_utf8: &Uint8Array,
) -> Result<JsValue, JsValue> {
    let profile_id = parse_uuid(profile_id).map_err(binding_error)?;
    let store_bytes = bytes(store);
    let password = Zeroizing::new(bytes(password_utf8));
    let result = core_delete_profile(&store_bytes, profile_id, &password).map_err(binding_error)?;
    mutation_result(result, JsValue::NULL)
}

#[cfg(all(test, target_arch = "wasm32"))]
mod tests {
    use super::*;
    use wasm_bindgen::JsCast;
    use wasm_bindgen_test::wasm_bindgen_test;

    const MNEMONIC: &[u8] = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
    const PASSWORD: &[u8] = b"correct horse battery staple";

    fn property(object: &JsValue, name: &str) -> JsValue {
        Reflect::get(object, &JsValue::from_str(name)).unwrap()
    }

    fn value(result: &JsValue) -> JsValue {
        property(result, "value")
    }

    fn bytes_field(object: &JsValue, name: &str) -> Uint8Array {
        property(object, name).dyn_into().unwrap()
    }

    fn string_field(object: &JsValue, name: &str) -> String {
        property(object, name).as_string().unwrap()
    }

    fn mutation_store(result: &JsValue) -> Vec<u8> {
        property(result, "store")
            .dyn_into::<Uint8Array>()
            .unwrap()
            .to_vec()
    }

    #[wasm_bindgen_test]
    fn wasm_secret_boundaries_and_core_parity() {
        let password = Uint8Array::from(PASSWORD);
        let empty_store = create_empty_store().unwrap();

        // 生成Pendingの秘密入出力はすべてUint8Arrayであり、stringではない。
        let prepared = prepare_generated_profile(&empty_store, &password, 0).unwrap();
        let prepared_value = value(&prepared);
        let mnemonic = bytes_field(&prepared_value, "mnemonic_utf8").to_vec();
        let pending = bytes_field(&prepared_value, "pending_profile").to_vec();
        assert!(!mnemonic.is_empty());
        assert!(!pending.is_empty());
        let finalized = finalize_generated_profile(
            &empty_store,
            &Uint8Array::from(pending.as_slice()),
            &password,
        )
        .unwrap();
        assert!(!mutation_store(&finalized).is_empty());

        let restored =
            restore_profile(&empty_store, &Uint8Array::from(MNEMONIC), &password, 1).unwrap();
        let restored_store = mutation_store(&restored);
        let restored_value = value(&restored);
        let profile_id_text = string_field(&restored_value, "profile_id");
        let profile_id = parse_uuid(&profile_id_text).unwrap();

        let derived = derive_software_key(
            &Uint8Array::from(restored_store.as_slice()),
            &profile_id_text,
            &password,
            1,
            0,
        )
        .unwrap();
        let derived_store = mutation_store(&derived);
        let derived_value = value(&derived);
        let key_id_text = string_field(&derived_value, "key_id");
        let key_id = parse_uuid(&key_id_text).unwrap();

        let exported = export_private_key(
            &Uint8Array::from(derived_store.as_slice()),
            &profile_id_text,
            &key_id_text,
            &password,
        )
        .unwrap();
        let exported_private_key = bytes_field(&value(&exported), "private_key");
        assert_eq!(exported_private_key.length(), 32);
        let core_private_key =
            crate::export_private_key(&derived_store, profile_id, key_id, PASSWORD)
                .unwrap()
                .value
                .private_key;
        assert_eq!(exported_private_key.to_vec(), core_private_key);
        assert_eq!(
            hex::encode_upper(core_private_key),
            "521BF2A56DD3BCA09A43D8378FB6659ABA155A02DE0486A0FEF8026F464AB764"
        );

        let wasm_account = get_public_account(
            &Uint8Array::from(derived_store.as_slice()),
            &profile_id_text,
            &key_id_text,
            &password,
        )
        .unwrap();
        let wasm_account_value = value(&wasm_account);
        let core_account = crate::get_public_account(&derived_store, profile_id, key_id, PASSWORD)
            .unwrap()
            .value;
        assert_eq!(
            bytes_field(&wasm_account_value, "public_key").to_vec(),
            core_account.public_key
        );
        assert_eq!(
            string_field(&wasm_account_value, "address"),
            core_account.address
        );
        assert_eq!(
            hex::encode_upper(core_account.public_key),
            "54ADC79E3BEE5D0EF899832172C3CCF29DC5F5F3BC0E0D5FD06E3E64D8DB51D2"
        );
        assert_eq!(
            core_account.address,
            "NBPYVRSCYLIJH7VU6XNR7I3H7GBQOGHHAMLJC3A"
        );

        let payload = Uint8Array::from(b"wasm fixture payload".as_slice());
        let wasm_signature = sign(
            &Uint8Array::from(derived_store.as_slice()),
            &profile_id_text,
            &key_id_text,
            &password,
            &payload,
        )
        .unwrap();
        let core_signature = crate::sign(
            &derived_store,
            profile_id,
            key_id,
            PASSWORD,
            b"wasm fixture payload",
        )
        .unwrap()
        .value
        .signature;
        assert_eq!(
            bytes_field(&value(&wasm_signature), "signature").to_vec(),
            core_signature
        );

        // imported private keyもtextual encodingではなくraw 32 bytesで受け取る。
        let imported = [0x11; 32];
        let imported_result = import_software_key(
            &Uint8Array::from(derived_store.as_slice()),
            &profile_id_text,
            &password,
            1,
            &Uint8Array::from(imported.as_slice()),
        )
        .unwrap();
        assert_eq!(string_field(&value(&imported_result), "chain"), "symbol");
    }
}

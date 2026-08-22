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
    let core_private_key = crate::export_private_key(&derived_store, profile_id, key_id, PASSWORD)
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

    // NEMのChain依存APIもCoreの同一fixtureと一致する。
    let nem_derived = derive_software_key(
        &Uint8Array::from(restored_store.as_slice()),
        &profile_id_text,
        &password,
        0,
        0,
    )
    .unwrap();
    let nem_derived_store = mutation_store(&nem_derived);
    let nem_value = value(&nem_derived);
    let nem_key_id_text = string_field(&nem_value, "key_id");
    let nem_account = get_public_account(
        &Uint8Array::from(nem_derived_store.as_slice()),
        &profile_id_text,
        &nem_key_id_text,
        &password,
    )
    .unwrap();
    let core_nem_account = crate::get_public_account(
        &nem_derived_store,
        profile_id,
        parse_uuid(&nem_key_id_text).unwrap(),
        PASSWORD,
    )
    .unwrap()
    .value;
    assert_eq!(
        bytes_field(&value(&nem_account), "public_key").to_vec(),
        core_nem_account.public_key
    );
    assert_eq!(
        string_field(&value(&nem_account), "address"),
        core_nem_account.address
    );

    let nem_payload = Uint8Array::from(b"wasm NEM fixture payload".as_slice());
    let wasm_nem_signature = sign(
        &Uint8Array::from(nem_derived_store.as_slice()),
        &profile_id_text,
        &nem_key_id_text,
        &password,
        &nem_payload,
    )
    .unwrap();
    let core_nem_signature = crate::sign(
        &nem_derived_store,
        profile_id,
        parse_uuid(&nem_key_id_text).unwrap(),
        PASSWORD,
        b"wasm NEM fixture payload",
    )
    .unwrap()
    .value
    .signature;
    assert_eq!(
        bytes_field(&value(&wasm_nem_signature), "signature").to_vec(),
        core_nem_signature
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

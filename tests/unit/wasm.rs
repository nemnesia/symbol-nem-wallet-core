use super::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_test::wasm_bindgen_test;

const MNEMONIC: &[u8] = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
const PASSWORD: &[u8] = b"correct horse battery staple";
const NEM_ACCOUNT_PRIVATE_KEY: &[u8; 32] =
    b"\x57\x5D\xBB\x30\x62\x26\x7E\xFF\x57\xC9\x70\xA3\x36\xEB\xBC\x8F\xBC\xFE\x12\xC5\xBD\x3E\xD7\xBC\x11\xEB\x04\x81\xD7\x70\x4C\xED";
const NEM_SIGNATURE_PRIVATE_KEY: &[u8; 32] =
    b"\xAB\xF4\xCF\x55\xA2\xB3\xF7\x42\xD7\x54\x3D\x9C\xC1\x7F\x50\x44\x7B\x96\x9E\x6E\x06\xF5\xEA\x91\x95\xD4\x28\xAB\x12\xB7\x31\x8D";
const NEM_FIXTURE_PAYLOAD: &[u8; 41] = b"\x8C\xE0\x3C\xD6\x05\x14\x23\x3B\x86\x78\x97\x29\x10\x2E\xA0\x9E\x86\x7F\xC6\xD9\x64\xDE\xA8\xC2\x01\x8E\xF7\xD0\xA2\xE0\xE2\x4B\xF7\xE3\x48\xE9\x17\x11\x66\x90\xB9";

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

    // NEMのBinding結果もCore内の比較だけに依存せず、外部固定fixtureと照合する。
    let nem_imported = import_software_key(
        &Uint8Array::from(derived_store.as_slice()),
        &profile_id_text,
        &password,
        0,
        &Uint8Array::from(NEM_ACCOUNT_PRIVATE_KEY.as_slice()),
    )
    .unwrap();
    let nem_store = mutation_store(&nem_imported);
    let nem_key_id_text = string_field(&value(&nem_imported), "key_id");
    let nem_account = get_public_account(
        &Uint8Array::from(nem_store.as_slice()),
        &profile_id_text,
        &nem_key_id_text,
        &password,
    )
    .unwrap();
    let nem_account_value = value(&nem_account);
    assert_eq!(
        hex::encode_upper(bytes_field(&nem_account_value, "public_key").to_vec()),
        "C5F54BA980FCBB657DBAAA42700539B207873E134D2375EFEAB5F1AB52F87844"
    );
    assert_eq!(
        string_field(&nem_account_value, "address"),
        "NDD2CT6LQLIYQ56KIXI3ENTM6EK3D44P5JFXJ4R4"
    );
    let nem_signature_imported = import_software_key(
        &Uint8Array::from(nem_store.as_slice()),
        &profile_id_text,
        &password,
        0,
        &Uint8Array::from(NEM_SIGNATURE_PRIVATE_KEY.as_slice()),
    )
    .unwrap();
    let nem_signature_store = mutation_store(&nem_signature_imported);
    let nem_signature_key_id_text = string_field(&value(&nem_signature_imported), "key_id");
    let nem_signature = sign(
        &Uint8Array::from(nem_signature_store.as_slice()),
        &profile_id_text,
        &nem_signature_key_id_text,
        &password,
        &Uint8Array::from(NEM_FIXTURE_PAYLOAD.as_slice()),
    )
    .unwrap();
    assert_eq!(
        hex::encode_upper(bytes_field(&value(&nem_signature), "signature").to_vec()),
        "D9CEC0CC0E3465FAB229F8E1D6DB68AB9CC99A18CB0435F70DEB6100948576CD5C0AA1FEB550BDD8693EF81EB10A556A622DB1F9301986827B96716A7134230C"
    );

    // Binding固有のerror mappingも、秘密値を含まない安定codeだけを返す。
    let invalid = restore_profile(
        &empty_store,
        &Uint8Array::from(b"not a mnemonic".as_slice()),
        &password,
        1,
    )
    .unwrap_err();
    assert_eq!(invalid.as_string().as_deref(), Some("InvalidMnemonic"));
}

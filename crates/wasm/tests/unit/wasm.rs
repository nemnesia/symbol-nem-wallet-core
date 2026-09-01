use super::*;
use js_sys::{DataView, Int8Array, Object, Proxy, Reflect, Symbol, Uint16Array, Uint8ClampedArray};
use symbol_nem_wallet_core as wallet_core;
use symbol_nem_wallet_core::MAX_WALLET_STORE_BYTES;
use wasm_bindgen::{closure::Closure, JsCast};
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

fn object(fields: &[(&str, JsValue)]) -> JsValue {
    let object = Object::new();
    for (name, value) in fields {
        Reflect::set(&object, &JsValue::from_str(name), value).unwrap();
    }
    object.into()
}

struct PropertyRestore {
    object: Object,
    property: JsValue,
    original: JsValue,
}

impl PropertyRestore {
    fn new(object: Object, property: &str, original: JsValue) -> Self {
        Self {
            object,
            property: JsValue::from_str(property),
            original,
        }
    }
}

impl Drop for PropertyRestore {
    fn drop(&mut self) {
        // Test-only global/instance mutation is restored even when an assertion or runtime
        // failure unwinds the test.
        let _ = Reflect::set(&self.object, &self.property, &self.original);
    }
}

struct PropertyDeleteRestore {
    object: Object,
    property: JsValue,
    original: Option<Object>,
    restored: bool,
}

impl PropertyDeleteRestore {
    fn new(object: Object, property: Symbol) -> Self {
        let property: JsValue = property.into();
        let original = Reflect::get_own_property_descriptor(&object, &property).unwrap();
        Self {
            object,
            property,
            original: (!original.is_undefined()).then(|| original.unchecked_into()),
            restored: false,
        }
    }

    fn restore(&mut self) -> Result<(), JsValue> {
        if self.restored {
            return Ok(());
        }

        let restored = match &self.original {
            Some(original) => Reflect::define_property(&self.object, &self.property, original),
            None => Reflect::delete_property(&self.object, &self.property),
        }?;
        if restored {
            self.restored = true;
            Ok(())
        } else {
            Err(JsValue::from_str("test property restoration failed"))
        }
    }
}

impl Drop for PropertyDeleteRestore {
    fn drop(&mut self) {
        // Do not panic from Drop: an assertion may already be unwinding the test.
        let _ = self.restore();
    }
}

fn handoff(status: &str) -> JsValue {
    object(&[("status", JsValue::from_str(status))])
}

fn export_target(profile_id: &str, key_id: Option<&str>) -> JsValue {
    let kind = if key_id.is_some() {
        "software_key"
    } else {
        "mnemonic"
    };
    let mut fields = vec![
        ("kind", JsValue::from_str(kind)),
        ("profile_id", JsValue::from_str(profile_id)),
    ];
    if let Some(key_id) = key_id {
        fields.push(("key_id", JsValue::from_str(key_id)));
    }
    object(&fields)
}

fn export_request(profile_id: &str, key_id: Option<&str>) -> JsValue {
    let target = export_target(profile_id, key_id);
    object(&[
        ("target", target.clone()),
        (
            "user_request",
            object(&[
                ("target", target.clone()),
                ("status", JsValue::from_str("requested")),
            ]),
        ),
        (
            "application_confirmation",
            object(&[
                ("target", target),
                ("status", JsValue::from_str("confirmed")),
            ]),
        ),
    ])
}

fn context(chain: &str, network: &str) -> JsValue {
    object(&[
        ("chain", JsValue::from_str(chain)),
        ("network", JsValue::from_str(network)),
    ])
}

fn signing_request(
    profile_id: &str,
    key_id: &str,
    chain: &str,
    network: &str,
    payload: &[u8],
    status: &str,
) -> JsValue {
    object(&[
        (
            "target",
            object(&[
                ("profile_id", JsValue::from_str(profile_id)),
                ("key_id", JsValue::from_str(key_id)),
                ("context", context(chain, network)),
            ]),
        ),
        ("payload", Uint8Array::from(payload).into()),
        ("approval", object(&[("status", JsValue::from_str(status))])),
    ])
}

fn mutation_store(result: &JsValue) -> Vec<u8> {
    property(result, "store")
        .dyn_into::<Uint8Array>()
        .unwrap()
        .to_vec()
}

fn detached_uint8_array(value: &[u8]) -> Uint8Array {
    let array = Uint8Array::from(value);
    let buffer = array.buffer();
    buffer.transfer().expect("ArrayBuffer.transfer is required");
    assert!(buffer.detached());
    array
}

fn throwing_status_object() -> JsValue {
    let object = Object::new();
    let descriptor = Object::new();
    let getter = Closure::once_into_js(|| -> JsValue {
        wasm_bindgen::throw_str("test getter failure");
    });
    Reflect::set(&descriptor, &JsValue::from_str("get"), &getter).unwrap();
    assert!(Reflect::define_property(&object, &JsValue::from_str("status"), &descriptor,).unwrap());
    object.into()
}

fn unreadable_uint8_array() -> Uint8Array {
    // A Proxy can pass `instanceof Uint8Array` but is not an actual ArrayBuffer view. The
    // binding must reject it before any proxy trap can fabricate metadata or bytes.
    let array = Uint8Array::from([0xA5].as_slice());
    let handler = Object::new();
    let getter = Closure::once_into_js(
        |_target: JsValue, _property: JsValue, _receiver: JsValue| -> JsValue {
            wasm_bindgen::throw_str("test unreadable buffer");
        },
    );
    Reflect::set(&handler, &JsValue::from_str("get"), &getter).unwrap();
    Proxy::new(array.as_ref(), &handler).unchecked_into()
}

fn assert_binding_failure(result: Result<JsValue, JsValue>) {
    assert_eq!(
        result.unwrap_err().as_string().as_deref(),
        Some("BindingFailure")
    );
}

const FIXTURE_MAX_BYTE_OR_TEXT_LENGTH: usize = 1024 * 1024;

fn encode_fixture_uint(value: usize) -> Vec<u8> {
    match value {
        0..=23 => vec![value as u8],
        24..=255 => vec![0x18, value as u8],
        256..=65_535 => {
            let value = value as u16;
            vec![0x19, (value >> 8) as u8, value as u8]
        }
        _ => {
            let value = value as u32;
            vec![
                0x1a,
                (value >> 24) as u8,
                (value >> 16) as u8,
                (value >> 8) as u8,
                value as u8,
            ]
        }
    }
}

fn encode_fixture_bytes(value: &[u8]) -> Vec<u8> {
    let mut encoded = match value.len() {
        0..=23 => vec![0x40 | value.len() as u8],
        24..=255 => vec![0x58, value.len() as u8],
        256..=65_535 => {
            let length = value.len() as u16;
            vec![0x59, (length >> 8) as u8, length as u8]
        }
        _ => {
            let length = value.len() as u32;
            vec![
                0x5a,
                (length >> 24) as u8,
                (length >> 16) as u8,
                (length >> 8) as u8,
                length as u8,
            ]
        }
    };
    encoded.extend_from_slice(value);
    encoded
}

fn store_with_unknown_padding(last_padding_len: usize) -> Vec<u8> {
    let mut encoded = vec![0xb4];
    encoded.push(0);
    encoded.extend_from_slice(&encode_fixture_bytes(b"SNWC"));
    encoded.push(1);
    encoded.extend_from_slice(&encode_fixture_uint(1));
    encoded.push(2);
    encoded.extend_from_slice(&encode_fixture_bytes(&[0x11; 32]));
    encoded.push(3);
    encoded.push(0x80);
    for key in 4..19 {
        encoded.push(key);
        encoded.extend_from_slice(&encode_fixture_bytes(&vec![
            0xA5;
            FIXTURE_MAX_BYTE_OR_TEXT_LENGTH
        ]));
    }
    encoded.push(19);
    encoded.extend_from_slice(&encode_fixture_bytes(&vec![0xA5; last_padding_len]));
    encoded
}

fn max_sized_store() -> Vec<u8> {
    let limit = MAX_WALLET_STORE_BYTES;
    let mut low = 0;
    let mut high = FIXTURE_MAX_BYTE_OR_TEXT_LENGTH;
    let mut best = Vec::new();
    let mut best_padding = 0;
    while low <= high {
        let middle = low + (high - low) / 2;
        let candidate = store_with_unknown_padding(middle);
        if candidate.len() <= limit {
            best = candidate;
            best_padding = middle;
            low = middle + 1;
        } else {
            high = middle.saturating_sub(1);
        }
    }
    let candidate = store_with_unknown_padding(best_padding + limit - best.len());
    assert_eq!(candidate.len(), limit);
    candidate
}

#[wasm_bindgen_test]
fn wasm_secret_boundaries_and_core_parity() {
    let password = Uint8Array::from(PASSWORD);
    let empty_store = create_empty_store().unwrap();

    // 生成Pendingの秘密入出力はすべてUint8Arrayであり、stringではない。
    let prepared = prepare_generated_profile(&empty_store, &password, 0.0).unwrap();
    let prepared_value = value(&prepared);
    let mnemonic = bytes_field(&prepared_value, "mnemonic_utf8").to_vec();
    let pending = bytes_field(&prepared_value, "pending_profile").to_vec();
    assert!(!mnemonic.is_empty());
    assert!(!pending.is_empty());
    let finalized = finalize_generated_profile(
        &empty_store,
        &Uint8Array::from(pending.as_slice()),
        &password,
        &handoff("confirmed"),
    )
    .unwrap();
    assert!(!mutation_store(&finalized).is_empty());

    let restored =
        restore_profile(&empty_store, &Uint8Array::from(MNEMONIC), &password, 1.0).unwrap();
    let restored_store = mutation_store(&restored);
    let restored_value = value(&restored);
    let profile_id_text = string_field(&restored_value, "profile_id");
    let profile_id = parse_uuid(&profile_id_text).unwrap();

    let exported_mnemonic = export_mnemonic(
        &Uint8Array::from(restored_store.as_slice()),
        &export_request(&profile_id_text, None),
        &password,
    )
    .unwrap();
    let exported_mnemonic_bytes = bytes_field(&value(&exported_mnemonic), "mnemonic_utf8").to_vec();
    if exported_mnemonic_bytes.as_slice() != MNEMONIC {
        panic!("exported mnemonic mismatch");
    }

    let derived = derive_software_key(
        &Uint8Array::from(restored_store.as_slice()),
        &profile_id_text,
        &password,
        1.0,
        0.0,
    )
    .unwrap();
    let derived_store = mutation_store(&derived);
    let derived_value = value(&derived);
    let key_id_text = string_field(&derived_value, "key_id");
    let key_id = parse_uuid(&key_id_text).unwrap();

    let exported = export_private_key(
        &Uint8Array::from(derived_store.as_slice()),
        &export_request(&profile_id_text, Some(&key_id_text)),
        &password,
    )
    .unwrap();
    let exported_private_key = bytes_field(&value(&exported), "private_key");
    assert_eq!(exported_private_key.length(), 32);
    let core_private_key = wallet_core::export_private_key(
        &derived_store,
        wallet_core::ExportRequest {
            target: wallet_core::ExportTarget::SoftwareKeyTarget { profile_id, key_id },
            user_request: wallet_core::ExportUserRequest {
                target: wallet_core::ExportTarget::SoftwareKeyTarget { profile_id, key_id },
                status: wallet_core::ExportUserRequestStatus::Requested,
            },
            application_confirmation: wallet_core::ExportApplicationConfirmation {
                target: wallet_core::ExportTarget::SoftwareKeyTarget { profile_id, key_id },
                status: wallet_core::ExportApplicationConfirmationStatus::Confirmed,
            },
        },
        PASSWORD,
    )
    .unwrap()
    .value
    .private_key;
    if exported_private_key.to_vec() != core_private_key {
        panic!("exported private key mismatch");
    }
    let expected_private_key: [u8; 32] =
        hex::decode("521BF2A56DD3BCA09A43D8378FB6659ABA155A02DE0486A0FEF8026F464AB764")
            .unwrap()
            .try_into()
            .unwrap();
    if core_private_key != expected_private_key {
        panic!("private key fixture mismatch");
    }

    let wasm_account = get_public_account(
        &Uint8Array::from(derived_store.as_slice()),
        &profile_id_text,
        &key_id_text,
        &context("symbol", "mainnet"),
        &password,
    )
    .unwrap();
    let wasm_account_value = value(&wasm_account);
    let core_account = wallet_core::get_public_account(
        &derived_store,
        profile_id,
        key_id,
        wallet_core::AccountContext {
            chain: wallet_core::Chain::Symbol,
            network: wallet_core::Network::Mainnet,
        },
        PASSWORD,
    )
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
        0.0,
        0.0,
    )
    .unwrap();
    let nem_derived_store = mutation_store(&nem_derived);
    let nem_value = value(&nem_derived);
    let nem_key_id_text = string_field(&nem_value, "key_id");
    let nem_account = get_public_account(
        &Uint8Array::from(nem_derived_store.as_slice()),
        &profile_id_text,
        &nem_key_id_text,
        &context("nem", "mainnet"),
        &password,
    )
    .unwrap();
    let core_nem_account = wallet_core::get_public_account(
        &nem_derived_store,
        profile_id,
        parse_uuid(&nem_key_id_text).unwrap(),
        wallet_core::AccountContext {
            chain: wallet_core::Chain::Nem,
            network: wallet_core::Network::Mainnet,
        },
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

    let wasm_nem_signature = sign(
        &Uint8Array::from(nem_derived_store.as_slice()),
        &signing_request(
            &profile_id_text,
            &nem_key_id_text,
            "nem",
            "mainnet",
            b"wasm NEM fixture payload",
            "approved",
        ),
        &password,
    )
    .unwrap();
    let core_nem_signature = wallet_core::sign(
        &nem_derived_store,
        wallet_core::SigningRequest {
            target: wallet_core::SigningTarget {
                profile_id,
                key_id: parse_uuid(&nem_key_id_text).unwrap(),
                context: wallet_core::AccountContext {
                    chain: wallet_core::Chain::Nem,
                    network: wallet_core::Network::Mainnet,
                },
            },
            payload: b"wasm NEM fixture payload".to_vec(),
            approval: wallet_core::SigningApproval {
                status: wallet_core::SigningApprovalStatus::Approved,
            },
        },
        PASSWORD,
    )
    .unwrap()
    .value
    .signature;
    assert_eq!(
        bytes_field(&value(&wasm_nem_signature), "signature").to_vec(),
        core_nem_signature
    );

    let wasm_signature = sign(
        &Uint8Array::from(derived_store.as_slice()),
        &signing_request(
            &profile_id_text,
            &key_id_text,
            "symbol",
            "mainnet",
            b"wasm fixture payload",
            "approved",
        ),
        &password,
    )
    .unwrap();
    let core_signature = wallet_core::sign(
        &derived_store,
        wallet_core::SigningRequest {
            target: wallet_core::SigningTarget {
                profile_id,
                key_id,
                context: wallet_core::AccountContext {
                    chain: wallet_core::Chain::Symbol,
                    network: wallet_core::Network::Mainnet,
                },
            },
            payload: b"wasm fixture payload".to_vec(),
            approval: wallet_core::SigningApproval {
                status: wallet_core::SigningApprovalStatus::Approved,
            },
        },
        PASSWORD,
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
        1.0,
        &Uint8Array::from(imported.as_slice()),
    )
    .unwrap();
    assert_eq!(string_field(&value(&imported_result), "chain"), "symbol");

    // NEMのBinding結果もCore内の比較だけに依存せず、外部固定fixtureと照合する。
    let nem_imported = import_software_key(
        &Uint8Array::from(derived_store.as_slice()),
        &profile_id_text,
        &password,
        0.0,
        &Uint8Array::from(NEM_ACCOUNT_PRIVATE_KEY.as_slice()),
    )
    .unwrap();
    let nem_store = mutation_store(&nem_imported);
    let nem_key_id_text = string_field(&value(&nem_imported), "key_id");
    let nem_account = get_public_account(
        &Uint8Array::from(nem_store.as_slice()),
        &profile_id_text,
        &nem_key_id_text,
        &context("nem", "mainnet"),
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
        0.0,
        &Uint8Array::from(NEM_SIGNATURE_PRIVATE_KEY.as_slice()),
    )
    .unwrap();
    let nem_signature_store = mutation_store(&nem_signature_imported);
    let nem_signature_key_id_text = string_field(&value(&nem_signature_imported), "key_id");
    let nem_signature = sign(
        &Uint8Array::from(nem_signature_store.as_slice()),
        &signing_request(
            &profile_id_text,
            &nem_signature_key_id_text,
            "nem",
            "mainnet",
            NEM_FIXTURE_PAYLOAD.as_slice(),
            "approved",
        ),
        &password,
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
        1.0,
    )
    .unwrap_err();
    assert_eq!(invalid.as_string().as_deref(), Some("InvalidMnemonic"));

    // JavaScript Numberを狭い整数型へ変換する前に範囲と整数性を検証する。
    for network in [256.0, -1.0, 0.5, f64::NAN] {
        let invalid = prepare_generated_profile(&empty_store, &password, network).unwrap_err();
        assert_eq!(invalid.as_string().as_deref(), Some("InvalidArgument"));
    }
    let restored_store_array = Uint8Array::from(restored_store.as_slice());
    for chain in [256.0, -1.0, 0.5, f64::NAN] {
        let invalid = import_software_key(
            &restored_store_array,
            &profile_id_text,
            &password,
            chain,
            &Uint8Array::from([0x11; 32].as_slice()),
        )
        .unwrap_err();
        assert_eq!(invalid.as_string().as_deref(), Some("InvalidArgument"));
    }
    for account_index in [2_147_483_648.0, -1.0, 0.5, f64::NAN] {
        let invalid = derive_software_key(
            &restored_store_array,
            &profile_id_text,
            &password,
            1.0,
            account_index,
        )
        .unwrap_err();
        assert_eq!(invalid.as_string().as_deref(), Some("InvalidAccountIndex"));
    }
}

#[wasm_bindgen_test]
fn wasm_assertion_context_and_binding_failure_contracts() {
    let password = Uint8Array::from(PASSWORD);
    let empty_store = create_empty_store().unwrap();
    let prepared = prepare_generated_profile(&empty_store, &password, 1.0).unwrap();
    let prepared_value = value(&prepared);
    let pending = bytes_field(&prepared_value, "pending_profile");
    let unconfirmed =
        finalize_generated_profile(&empty_store, &pending, &password, &handoff("unconfirmed"))
            .unwrap_err();
    assert_eq!(unconfirmed.as_string().as_deref(), Some("InvalidArgument"));
    let missing_handoff =
        finalize_generated_profile(&empty_store, &pending, &password, &object(&[])).unwrap_err();
    assert_eq!(
        missing_handoff.as_string().as_deref(),
        Some("InvalidArgument")
    );
    let unknown_handoff =
        finalize_generated_profile(&empty_store, &pending, &password, &handoff("unknown"))
            .unwrap_err();
    assert_eq!(
        unknown_handoff.as_string().as_deref(),
        Some("InvalidArgument")
    );

    let restored =
        restore_profile(&empty_store, &Uint8Array::from(MNEMONIC), &password, 1.0).unwrap();
    let restored_store = mutation_store(&restored);
    let profile_id = string_field(&value(&restored), "profile_id");
    let derived = derive_software_key(
        &Uint8Array::from(restored_store.as_slice()),
        &profile_id,
        &password,
        1.0,
        0.0,
    )
    .unwrap();
    let derived_store = mutation_store(&derived);
    let key_id = string_field(&value(&derived), "key_id");

    let not_requested = export_request(&profile_id, None);
    let user_request = property(&not_requested, "user_request");
    Reflect::set(
        &user_request,
        &JsValue::from_str("status"),
        &JsValue::from_str("not_requested"),
    )
    .unwrap();
    assert_eq!(
        export_mnemonic(
            &Uint8Array::from(derived_store.as_slice()),
            &not_requested,
            &password,
        )
        .unwrap_err()
        .as_string()
        .as_deref(),
        Some("InvalidArgument")
    );

    let wrong_target = export_request(&profile_id, None);
    let confirmation = property(&wrong_target, "application_confirmation");
    Reflect::set(
        &confirmation,
        &JsValue::from_str("target"),
        &export_target(&Uuid::nil().to_string(), None),
    )
    .unwrap();
    assert_eq!(
        export_mnemonic(
            &Uint8Array::from(derived_store.as_slice()),
            &wrong_target,
            &password,
        )
        .unwrap_err()
        .as_string()
        .as_deref(),
        Some("InvalidArgument")
    );

    let incomplete = object(&[("target", export_target(&profile_id, None))]);
    assert_eq!(
        export_mnemonic(
            &Uint8Array::from(derived_store.as_slice()),
            &incomplete,
            &password,
        )
        .unwrap_err()
        .as_string()
        .as_deref(),
        Some("InvalidArgument")
    );

    let wrong_network = get_public_account(
        &Uint8Array::from(derived_store.as_slice()),
        &profile_id,
        &key_id,
        &context("symbol", "testnet"),
        &password,
    )
    .unwrap_err();
    assert_eq!(
        wrong_network.as_string().as_deref(),
        Some("NetworkMismatch")
    );

    let not_approved = sign(
        &Uint8Array::from(derived_store.as_slice()),
        &signing_request(
            &profile_id,
            &key_id,
            "symbol",
            "mainnet",
            b"payload",
            "not_approved",
        ),
        &password,
    )
    .unwrap_err();
    assert_eq!(not_approved.as_string().as_deref(), Some("InvalidArgument"));

    let wrong_password = export_mnemonic(
        &Uint8Array::from(derived_store.as_slice()),
        &export_request(&profile_id, None),
        &Uint8Array::from(b"wrong".as_slice()),
    )
    .unwrap_err();
    assert_eq!(
        wrong_password.as_string().as_deref(),
        Some("AuthenticationFailed")
    );
    assert_eq!(
        conversion_error().as_string().as_deref(),
        Some("BindingFailure")
    );
}

#[wasm_bindgen_test]
fn wasm_detached_and_unreadable_inputs_fail_closed() {
    let password = Uint8Array::from(PASSWORD);
    let empty_store = create_empty_store().unwrap();

    // A transferred Store must not become an empty Store or produce a replacement.
    let detached_store = detached_uint8_array(&empty_store.to_vec());
    assert_binding_failure(list_profiles(&detached_store));
    assert_binding_failure(prepare_generated_profile(&detached_store, &password, 1.0));
    let unreadable_store = unreadable_uint8_array();
    assert_binding_failure(list_profiles(&unreadable_store));

    // Mnemonic, password, Pending Profile and imported private key all use the same
    // binding-side copy path and must fail before Core receives a fabricated empty input.
    let detached_mnemonic = detached_uint8_array(MNEMONIC);
    assert_binding_failure(restore_profile(
        &empty_store,
        &detached_mnemonic,
        &password,
        1.0,
    ));
    let detached_password = detached_uint8_array(PASSWORD);
    assert_binding_failure(prepare_generated_profile(
        &empty_store,
        &detached_password,
        1.0,
    ));
    let detached_pending = detached_uint8_array(b"detached pending profile");
    assert_binding_failure(finalize_generated_profile(
        &empty_store,
        &detached_pending,
        &password,
        &handoff("confirmed"),
    ));
    let detached_private_key = detached_uint8_array(&[0x11; 32]);
    assert_binding_failure(import_software_key(
        &empty_store,
        &Uuid::nil().to_string(),
        &password,
        1.0,
        &detached_private_key,
    ));

    // A detached signing payload must not reach Core and must not return a signature.
    let detached_payload = detached_uint8_array(b"detached payload");
    let detached_signing_request = signing_request(
        &Uuid::nil().to_string(),
        &Uuid::nil().to_string(),
        "symbol",
        "mainnet",
        &[],
        "approved",
    );
    Reflect::set(
        &detached_signing_request,
        &JsValue::from_str("payload"),
        &detached_payload,
    )
    .unwrap();
    assert_binding_failure(sign(&empty_store, &detached_signing_request, &password));

    // A throwing DTO getter is an actual Reflect::get conversion failure.
    let empty_pending = Uint8Array::new_with_length(0);
    let empty_password = Uint8Array::new_with_length(0);
    assert_binding_failure(finalize_generated_profile(
        &empty_store,
        &empty_pending,
        &empty_password,
        &throwing_status_object(),
    ));

    // An attached zero-length payload remains a real empty byte sequence. With a valid target,
    // it reaches Core and produces a signature rather than being classified as BindingFailure.
    let restored =
        restore_profile(&empty_store, &Uint8Array::from(MNEMONIC), &password, 1.0).unwrap();
    let restored_store = mutation_store(&restored);
    let profile_id = string_field(&value(&restored), "profile_id");
    let derived = derive_software_key(
        &Uint8Array::from(restored_store.as_slice()),
        &profile_id,
        &password,
        1.0,
        0.0,
    )
    .unwrap();
    let derived_store = mutation_store(&derived);
    let key_id = string_field(&value(&derived), "key_id");
    let empty_payload_request =
        signing_request(&profile_id, &key_id, "symbol", "mainnet", &[], "approved");
    let signed = sign(
        &Uint8Array::from(derived_store.as_slice()),
        &empty_payload_request,
        &password,
    )
    .unwrap();
    assert_eq!(bytes_field(&value(&signed), "signature").length(), 64);
}

#[wasm_bindgen_test]
fn wasm_binary_inputs_require_exact_uint8_array_brand() {
    let empty_store = create_empty_store().unwrap();
    let empty_store_buffer = empty_store.buffer();
    let store_length = empty_store.length();

    // The clamped view has the exact same valid Store bytes and backing buffer as the accepted
    // Uint8Array, but its internal [[TypedArrayName]] is different.
    let clamped_store = Uint8ClampedArray::new_with_byte_offset_and_length(
        empty_store_buffer.as_ref(),
        empty_store.byte_offset(),
        store_length,
    );
    assert_binding_failure(list_profiles(&clamped_store.unchecked_into()));

    // Keep these views non-empty where their element width permits it. Uint16Array is also
    // checked with an empty view below so the rejection is attributable to its brand, not only
    // to the byteLength/length invariant.
    let int8 = Int8Array::new_with_length(1);
    assert_binding_failure(list_profiles(&int8.unchecked_into()));
    let uint16 = Uint16Array::new_with_length(0);
    assert_binding_failure(list_profiles(&uint16.unchecked_into()));

    let data_view = DataView::new(&empty_store_buffer, 0, 1);
    assert_binding_failure(list_profiles(&data_view.unchecked_into()));

    // The exact brand check runs before any intrinsic view accessor, so the existing Proxy
    // fail-closed behavior remains explicit in the same public-API test.
    assert_binding_failure(list_profiles(&unreadable_uint8_array()));

    // Own constructor / Symbol.toStringTag values and a mutable prototype property do not
    // participate in the captured internal-brand check.
    let actual = Uint8Array::from(empty_store.to_vec().as_slice());
    Reflect::set(
        actual.as_ref(),
        &JsValue::from_str("constructor"),
        &JsValue::from_str("not Uint8Array"),
    )
    .unwrap();
    let own_tag_descriptor = Object::new();
    Reflect::set(
        &own_tag_descriptor,
        &JsValue::from_str("value"),
        &JsValue::from_str("Uint8ClampedArray"),
    )
    .unwrap();
    assert!(Reflect::define_property(
        actual.as_ref(),
        &Symbol::to_string_tag(),
        &own_tag_descriptor,
    )
    .unwrap());
    let prototype = Object::get_prototype_of(actual.as_ref());
    let mut prototype_tag_restore =
        PropertyDeleteRestore::new(prototype.clone(), Symbol::to_string_tag());
    let prototype_tag_descriptor = Object::new();
    Reflect::set(
        &prototype_tag_descriptor,
        &JsValue::from_str("value"),
        &JsValue::from_str("Uint8ClampedArray"),
    )
    .unwrap();
    Reflect::set(
        &prototype_tag_descriptor,
        &JsValue::from_str("configurable"),
        &JsValue::TRUE,
    )
    .unwrap();
    assert!(Reflect::define_property(
        &prototype,
        &Symbol::to_string_tag(),
        &prototype_tag_descriptor,
    )
    .unwrap());
    assert!(list_profiles(&actual).is_ok());

    prototype_tag_restore.restore().unwrap();
    assert!(
        Reflect::get_own_property_descriptor(&prototype, &Symbol::to_string_tag().into(),)
            .unwrap()
            .is_undefined()
    );
}

#[wasm_bindgen_test]
fn wasm_output_allocation_failure_is_binding_failure_without_result() {
    let empty_store = create_empty_store().unwrap();
    allocation_failure_seam::inject();
    let array_result = list_profiles(&empty_store);
    assert_binding_failure(array_result);

    allocation_failure_seam::inject();
    let result = create_empty_store().map(JsValue::from);
    assert_binding_failure(result);
}

#[wasm_bindgen_test]
fn wasm_binary_copy_ignores_overridable_slice_methods() {
    const PAYLOAD_A: &[u8] = b"application payload A";
    const PAYLOAD_B: &[u8] = b"replacement payload B";
    assert_eq!(PAYLOAD_A.len(), PAYLOAD_B.len());

    let password = Uint8Array::from(PASSWORD);
    let empty_store = create_empty_store().unwrap();
    let restored =
        restore_profile(&empty_store, &Uint8Array::from(MNEMONIC), &password, 1.0).unwrap();
    let restored_store = mutation_store(&restored);
    let profile_id = string_field(&value(&restored), "profile_id");
    let derived = derive_software_key(
        &Uint8Array::from(restored_store.as_slice()),
        &profile_id,
        &password,
        1.0,
        0.0,
    )
    .unwrap();
    let derived_store = mutation_store(&derived);
    let key_id = string_field(&value(&derived), "key_id");

    let expected = sign(
        &Uint8Array::from(derived_store.as_slice()),
        &signing_request(
            &profile_id,
            &key_id,
            "symbol",
            "mainnet",
            PAYLOAD_A,
            "approved",
        ),
        &password,
    )
    .unwrap();
    let expected_signature = bytes_field(&value(&expected), "signature").to_vec();

    // An instance override returns a same-length, different byte sequence. The request must
    // still be signed with the actual backing bytes from PAYLOAD_A.
    let instance_payload = Uint8Array::from(PAYLOAD_A);
    let instance_original =
        Reflect::get(instance_payload.as_ref(), &JsValue::from_str("slice")).unwrap();
    let instance_override = Closure::once_into_js(move || Uint8Array::from(PAYLOAD_B));
    Reflect::set(
        instance_payload.as_ref(),
        &JsValue::from_str("slice"),
        &instance_override,
    )
    .unwrap();
    let _instance_restore = PropertyRestore::new(
        instance_payload.clone().unchecked_into(),
        "slice",
        instance_original,
    );
    let instance_request = signing_request(
        &profile_id,
        &key_id,
        "symbol",
        "mainnet",
        PAYLOAD_A,
        "approved",
    );
    Reflect::set(
        &instance_request,
        &JsValue::from_str("payload"),
        &instance_payload,
    )
    .unwrap();
    let instance_result = sign(
        &Uint8Array::from(derived_store.as_slice()),
        &instance_request,
        &password,
    );
    let instance_signature = bytes_field(&value(&instance_result.unwrap()), "signature").to_vec();
    assert_eq!(instance_signature, expected_signature);

    // Repeat through the mutable Uint8Array prototype. Restore the original property before
    // asserting so a failed assertion cannot leave the global prototype modified.
    let prototype_payload = Uint8Array::from(PAYLOAD_A);
    let prototype = Object::get_prototype_of(prototype_payload.as_ref());
    let prototype_original = Reflect::get(&prototype, &JsValue::from_str("slice")).unwrap();
    let prototype_override = Closure::once_into_js(move || Uint8Array::from(PAYLOAD_B));
    Reflect::set(&prototype, &JsValue::from_str("slice"), &prototype_override).unwrap();
    let prototype_request = signing_request(
        &profile_id,
        &key_id,
        "symbol",
        "mainnet",
        PAYLOAD_A,
        "approved",
    );
    Reflect::set(
        &prototype_request,
        &JsValue::from_str("payload"),
        &prototype_payload,
    )
    .unwrap();
    let _prototype_restore = PropertyRestore::new(prototype.clone(), "slice", prototype_original);
    let prototype_result = sign(
        &Uint8Array::from(derived_store.as_slice()),
        &prototype_request,
        &password,
    );
    let prototype_signature = bytes_field(&value(&prototype_result.unwrap()), "signature").to_vec();
    assert_eq!(prototype_signature, expected_signature);

    // A signing payload with a different typed-array brand must not be accepted as raw bytes.
    let wrong_payload = Int8Array::new_with_length(PAYLOAD_A.len() as u32);
    let wrong_payload_request = signing_request(
        &profile_id,
        &key_id,
        "symbol",
        "mainnet",
        PAYLOAD_A,
        "approved",
    );
    Reflect::set(
        &wrong_payload_request,
        &JsValue::from_str("payload"),
        &wrong_payload,
    )
    .unwrap();
    let wrong_payload_error = sign(
        &Uint8Array::from(derived_store.as_slice()),
        &wrong_payload_request,
        &password,
    )
    .unwrap_err();
    assert_eq!(
        wrong_payload_error.as_string().as_deref(),
        Some("InvalidArgument")
    );
}

#[wasm_bindgen_test]
fn wasm_store_size_boundary_uses_public_api() {
    let at_limit = max_sized_store();
    assert_eq!(at_limit.len(), MAX_WALLET_STORE_BYTES);

    let at_limit_js = Uint8Array::from(at_limit.as_slice());
    let accepted = list_profiles(&at_limit_js).unwrap();
    let profiles = value(&accepted).dyn_into::<js_sys::Array>().unwrap();
    assert_eq!(profiles.length(), 0);

    let mut over_limit = at_limit;
    over_limit.push(0);
    let error = list_profiles(&Uint8Array::from(over_limit.as_slice())).unwrap_err();
    assert_eq!(error.as_string().as_deref(), Some("InvalidStore"));
}

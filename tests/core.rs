//! 公開Core APIの統合テスト。
//!
//! 状態変更APIが入力Storeを直接変更せず、成功時にreplacement Storeを返すこと、
//! Symbol/NEMのChain境界、認証失敗・不正入力時のエラー分類を確認する。

use uuid::Uuid;

use symbol_nem_wallet_core::{
    change_profile_password, create_empty_store, delete_profile, delete_software_key,
    derive_software_key, export_mnemonic, export_private_key, finalize_generated_profile,
    get_public_account, import_software_key, list_profiles, list_software_keys,
    prepare_generated_profile, restore_profile, sign, Chain, ErrorCode, Network, SoftwareKeyOrigin,
    WalletError,
};

const MNEMONIC: &[u8] = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
const PASSWORD: &[u8] = b"correct horse battery staple";
const NEW_PASSWORD: &[u8] = b"new correct horse battery staple";

fn array32(hex_value: &str) -> [u8; 32] {
    // 公開APIが返すraw 32 byte値をfixtureのhex表記と比較するための補助関数。
    hex::decode(hex_value).unwrap().try_into().unwrap()
}

fn cbor_uint(value: u64) -> Vec<u8> {
    match value {
        0..=23 => vec![value as u8],
        24..=0xff => vec![0x18, value as u8],
        0x100..=0xffff => {
            let mut bytes = vec![0x19];
            bytes.extend_from_slice(&(value as u16).to_be_bytes());
            bytes
        }
        0x1_0000..=0xffff_ffff => {
            let mut bytes = vec![0x1a];
            bytes.extend_from_slice(&(value as u32).to_be_bytes());
            bytes
        }
        _ => {
            let mut bytes = vec![0x1b];
            bytes.extend_from_slice(&value.to_be_bytes());
            bytes
        }
    }
}

fn cbor_bytes(value: &[u8]) -> Vec<u8> {
    let mut bytes = match value.len() {
        0..=23 => vec![0x40 | value.len() as u8],
        24..=0xff => vec![0x58, value.len() as u8],
        _ => panic!("test fixture is too large"),
    };
    bytes.extend_from_slice(value);
    bytes
}

fn cbor_array(values: Vec<Vec<u8>>) -> Vec<u8> {
    assert!(values.len() <= 23);
    let mut bytes = vec![0x80 | values.len() as u8];
    for value in values {
        bytes.extend_from_slice(&value);
    }
    bytes
}

fn cbor_map(mut fields: Vec<(u64, Vec<u8>)>) -> Vec<u8> {
    assert!(fields.len() <= 23);
    fields.sort_by_key(|(key, _)| *key);
    let mut bytes = vec![0xa0 | fields.len() as u8];
    for (key, value) in fields {
        bytes.extend_from_slice(&cbor_uint(key));
        bytes.extend_from_slice(&value);
    }
    bytes
}

fn valid_profile_fields() -> Vec<(u64, Vec<u8>)> {
    vec![
        (0, cbor_bytes(&[1; 16])),
        (1, cbor_uint(1)),
        (2, cbor_bytes(&[2; 32])),
        (3, cbor_uint(1)),
        (
            4,
            cbor_map(vec![
                (0, cbor_uint(0)),
                (1, cbor_uint(0x13)),
                (2, cbor_uint(65_536)),
                (3, cbor_uint(3)),
                (4, cbor_uint(1)),
                (5, cbor_bytes(&[3; 16])),
            ]),
        ),
        (
            5,
            cbor_map(vec![
                (0, cbor_uint(0)),
                (1, cbor_bytes(&[4; 12])),
                (2, cbor_bytes(&[])),
                (3, cbor_bytes(&[5; 16])),
            ]),
        ),
        (6, cbor_array(Vec::new())),
    ]
}

fn valid_profile_with(overrides: &[(u64, Vec<u8>)]) -> Vec<u8> {
    let mut fields = valid_profile_fields();
    for (key, value) in overrides {
        fields.iter_mut().find(|(field, _)| field == key).unwrap().1 = value.clone();
    }
    cbor_map(fields)
}

fn raw_store(profiles: Vec<Vec<u8>>) -> Vec<u8> {
    cbor_map(vec![
        (0, cbor_bytes(b"SNWC")),
        (1, cbor_uint(1)),
        (2, cbor_bytes(&[0x11; 32])),
        (3, cbor_array(profiles)),
    ])
}

fn raw_store_with_unknown_simple() -> Vec<u8> {
    cbor_map(vec![
        (0, cbor_bytes(b"SNWC")),
        (1, cbor_uint(1)),
        (2, cbor_bytes(&[0x11; 32])),
        (3, cbor_array(Vec::new())),
        (99, vec![0xf7]),
    ])
}

fn assert_invalid_store(bytes: &[u8]) {
    assert_error(bytes, ErrorCode::InvalidStore);
}

fn assert_error(bytes: &[u8], expected: ErrorCode) {
    assert_eq!(list_profiles(bytes).unwrap_err().code, expected);
}

#[test]
fn profile_and_software_key_lifecycle_is_atomic() {
    // Profile作成から鍵の導出・import・署名・password変更・削除までを通し、
    // 各mutationが次の入力に渡せる完全なStoreを返すことを確認する。
    let store = create_empty_store().unwrap();
    let created = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
    let profile_id = created.value.profile_id;
    assert_eq!(list_profiles(&created.store).unwrap().value.len(), 1);
    let prepared_with_existing_profile =
        prepare_generated_profile(&created.store, PASSWORD, Network::Testnet).unwrap();
    assert!(!prepared_with_existing_profile
        .value
        .pending_profile
        .is_empty());

    let exported = export_mnemonic(&created.store, profile_id, PASSWORD).unwrap();
    assert!(exported.value.mnemonic_utf8 == MNEMONIC);
    assert_eq!(
        format!("{:?}", exported.value),
        r#"MnemonicExport { mnemonic_utf8: "[redacted]" }"#
    );
    assert_eq!(
        export_mnemonic(&created.store, profile_id, b"wrong")
            .unwrap_err()
            .code,
        ErrorCode::AuthenticationFailed
    );

    let symbol =
        derive_software_key(&created.store, profile_id, PASSWORD, Chain::Symbol, 0).unwrap();
    let exported_private =
        export_private_key(&symbol.store, profile_id, symbol.value.key_id, PASSWORD).unwrap();
    assert_eq!(
        format!("{:?}", exported_private.value),
        r#"PrivateKeyExport { private_key: "[redacted]" }"#
    );
    let symbol_private = exported_private.value.private_key;
    let missing_key_id = Uuid::from_bytes([0; 16]);
    assert_eq!(
        export_private_key(&symbol.store, profile_id, missing_key_id, PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::SoftwareKeyNotFound
    );
    assert_eq!(
        get_public_account(&symbol.store, profile_id, missing_key_id, PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::SoftwareKeyNotFound
    );
    assert_eq!(
        sign(
            &symbol.store,
            profile_id,
            missing_key_id,
            PASSWORD,
            b"missing key",
        )
        .unwrap_err()
        .code,
        ErrorCode::SoftwareKeyNotFound
    );
    assert_eq!(
        get_public_account(&symbol.store, profile_id, symbol.value.key_id, PASSWORD)
            .unwrap()
            .value
            .public_key,
        array32("54ADC79E3BEE5D0EF899832172C3CCF29DC5F5F3BC0E0D5FD06E3E64D8DB51D2")
    );

    let nem = derive_software_key(&symbol.store, profile_id, PASSWORD, Chain::Nem, 0).unwrap();
    assert_eq!(
        list_software_keys(&nem.store, profile_id)
            .unwrap()
            .value
            .len(),
        2
    );
    assert_eq!(
        get_public_account(&nem.store, profile_id, nem.value.key_id, PASSWORD)
            .unwrap()
            .value
            .public_key,
        array32("58892BC737B493D837D7F7EC4519371B9498F23BBC7F2A2A10DE11A70E7BCF84")
    );

    let cross_chain = import_software_key(
        &nem.store,
        profile_id,
        PASSWORD,
        Chain::Nem,
        &symbol_private,
    )
    .unwrap();
    // 同じraw private keyでもChainが異なれば別Software Keyとして登録できる。
    assert_eq!(
        list_software_keys(&cross_chain.store, profile_id)
            .unwrap()
            .value
            .len(),
        3
    );

    let duplicate = import_software_key(
        &cross_chain.store,
        profile_id,
        PASSWORD,
        Chain::Symbol,
        &symbol_private,
    )
    .unwrap_err();
    // 重複判定はProfile内かつ同一Chainに限定される。
    assert_eq!(duplicate.code, ErrorCode::DuplicateSoftwareKey);
    assert_eq!(
        export_private_key(&nem.store, profile_id, symbol.value.key_id, PASSWORD)
            .unwrap()
            .value
            .private_key,
        symbol_private
    );

    let signature = sign(
        &nem.store,
        profile_id,
        nem.value.key_id,
        PASSWORD,
        b"payload",
    )
    .unwrap();
    assert_eq!(signature.value.signature.len(), 64);
    assert_eq!(
        format!("{:?}", signature.value),
        r#"Signature { signature: "[redacted]" }"#
    );

    let password_changed =
        change_profile_password(&nem.store, profile_id, PASSWORD, NEW_PASSWORD).unwrap();
    assert_eq!(
        list_software_keys(&password_changed.store, profile_id)
            .unwrap()
            .value
            .len(),
        2
    );
    assert_eq!(
        export_mnemonic(&password_changed.store, profile_id, PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::AuthenticationFailed
    );
    let after_password =
        export_mnemonic(&password_changed.store, profile_id, NEW_PASSWORD).unwrap();
    assert!(after_password.value.mnemonic_utf8 == MNEMONIC);

    let deleted_key = delete_software_key(
        &password_changed.store,
        profile_id,
        symbol.value.key_id,
        NEW_PASSWORD,
    )
    .unwrap();
    assert_eq!(
        list_software_keys(&deleted_key.store, profile_id)
            .unwrap()
            .value
            .len(),
        1
    );
    assert_eq!(
        export_private_key(
            &deleted_key.store,
            profile_id,
            symbol.value.key_id,
            NEW_PASSWORD
        )
        .unwrap_err()
        .code,
        ErrorCode::SoftwareKeyNotFound
    );

    let deleted_profile = delete_profile(&deleted_key.store, profile_id, NEW_PASSWORD).unwrap();
    assert!(list_profiles(&deleted_profile.store)
        .unwrap()
        .value
        .is_empty());
    assert_eq!(
        export_mnemonic(&deleted_profile.store, profile_id, NEW_PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::ProfileNotFound
    );
}

#[test]
fn generated_profile_requires_a_matching_pending_handoff() {
    // prepareだけではStoreを変更せず、passwordと対象Storeが一致するfinalizeだけが
    // Profileを追加できること、およびPendingの再利用を拒否することを確認する。
    let store = create_empty_store().unwrap();
    let prepared = prepare_generated_profile(&store, PASSWORD, Network::Testnet).unwrap();
    assert_eq!(
        format!("{:?}", prepared.value),
        r#"PreparedProfile { mnemonic_utf8: "[redacted]", pending_profile: "[redacted]" }"#
    );
    let mut invalid_version = prepared.value.pending_profile.clone();
    invalid_version[8] = 2;
    assert_eq!(
        finalize_generated_profile(&store, &invalid_version, PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::PendingProfileInvalid
    );
    let mut invalid_network = prepared.value.pending_profile.clone();
    invalid_network[57] = 2;
    assert_eq!(
        finalize_generated_profile(&store, &invalid_network, PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::PendingProfileInvalid
    );
    assert_eq!(
        finalize_generated_profile(
            &store,
            &prepared.value.pending_profile[..prepared.value.pending_profile.len() - 1],
            PASSWORD,
        )
        .unwrap_err()
        .code,
        ErrorCode::PendingProfileInvalid
    );
    assert!(list_profiles(&store).unwrap().value.is_empty());
    assert_eq!(
        finalize_generated_profile(&store, &prepared.value.pending_profile, b"wrong")
            .unwrap_err()
            .code,
        ErrorCode::AuthenticationFailed
    );
    assert!(list_profiles(&store).unwrap().value.is_empty());

    let finalized =
        finalize_generated_profile(&store, &prepared.value.pending_profile, PASSWORD).unwrap();
    assert_eq!(finalized.value.network, Network::Testnet);
    assert_eq!(finalized.value.software_key_count, 0);
    assert_eq!(list_profiles(&finalized.store).unwrap().value.len(), 1);

    let reused =
        finalize_generated_profile(&finalized.store, &prepared.value.pending_profile, PASSWORD)
            .unwrap_err();
    assert_eq!(reused.code, ErrorCode::PendingProfileInvalid);
    assert_eq!(
        restore_profile(
            &finalized.store,
            &prepared.value.mnemonic_utf8,
            PASSWORD,
            Network::Testnet,
        )
        .unwrap_err()
        .code,
        ErrorCode::DuplicateProfile
    );
}

#[test]
fn malformed_public_store_envelopes_are_rejected_before_authentication() {
    // 公開APIから到達可能なStore envelopeの各構造エラーを、秘密処理の前に拒否する。
    for bytes in [
        Vec::new(),
        cbor_uint(0),
        cbor_map(vec![(0, cbor_bytes(b"BAD!"))]),
        cbor_map(vec![
            (0, cbor_bytes(b"SNWC")),
            (1, cbor_uint(1)),
            (2, cbor_bytes(&[0; 31])),
            (3, cbor_array(Vec::new())),
        ]),
        cbor_map(vec![
            (0, cbor_bytes(b"SNWC")),
            (1, cbor_uint(1)),
            (2, cbor_bytes(&[0; 32])),
        ]),
        cbor_map(vec![
            (0, cbor_bytes(b"SNWC")),
            (1, cbor_uint(1)),
            (2, cbor_bytes(&[0; 32])),
            (3, cbor_uint(0)),
        ]),
    ] {
        assert_invalid_store(&bytes);
    }
    assert_error(
        &cbor_map(vec![(0, cbor_bytes(b"SNWC")), (1, cbor_uint(2))]),
        ErrorCode::UnsupportedStoreVersion,
    );

    for profile in [
        cbor_uint(0),
        valid_profile_with(&[(0, cbor_bytes(&[1; 15]))]),
        valid_profile_with(&[(1, cbor_uint(2))]),
        valid_profile_with(&[(2, cbor_bytes(&[2; 31]))]),
        valid_profile_with(&[(3, cbor_bytes(&[]))]),
        valid_profile_with(&[(4, cbor_uint(0))]),
        valid_profile_with(&[(
            4,
            cbor_map(vec![
                (0, cbor_uint(0)),
                (1, cbor_uint(0x13)),
                (2, cbor_uint(65_536)),
                (3, cbor_uint(3)),
                (4, cbor_uint(1)),
                (5, cbor_bytes(&[3; 15])),
            ]),
        )]),
        valid_profile_with(&[(5, cbor_uint(0))]),
        valid_profile_with(&[(
            5,
            cbor_map(vec![
                (0, cbor_uint(0)),
                (1, cbor_bytes(&[4; 11])),
                (2, cbor_bytes(&[])),
                (3, cbor_bytes(&[5; 16])),
            ]),
        )]),
        valid_profile_with(&[(
            5,
            cbor_map(vec![
                (0, cbor_uint(0)),
                (1, cbor_bytes(&[4; 12])),
                (2, cbor_uint(0)),
                (3, cbor_bytes(&[5; 16])),
            ]),
        )]),
        valid_profile_with(&[(
            5,
            cbor_map(vec![
                (0, cbor_uint(0)),
                (1, cbor_bytes(&[4; 12])),
                (2, cbor_bytes(&[])),
                (3, cbor_bytes(&[5; 15])),
            ]),
        )]),
        valid_profile_with(&[(6, cbor_uint(0))]),
        valid_profile_with(&[(6, cbor_array(vec![cbor_uint(0)]))]),
        valid_profile_with(&[(
            6,
            cbor_array(vec![cbor_map(vec![
                (0, cbor_bytes(&[1; 15])),
                (1, cbor_uint(0)),
            ])]),
        )]),
        valid_profile_with(&[(
            6,
            cbor_array(vec![cbor_map(vec![
                (0, cbor_bytes(&[1; 16])),
                (1, cbor_uint(2)),
            ])]),
        )]),
    ] {
        assert_invalid_store(&raw_store(vec![profile]));
    }
    assert_error(
        &raw_store(vec![valid_profile_with(&[(3, cbor_uint(2))])]),
        ErrorCode::UnsupportedProfileSchemaVersion,
    );

    let unknown_simple = raw_store_with_unknown_simple();
    let restored = restore_profile(&unknown_simple, MNEMONIC, PASSWORD, Network::Mainnet)
        .expect("unknown simple field should be preserved");
    assert_eq!(list_profiles(&restored.store).unwrap().value.len(), 1);
}

#[test]
fn generated_software_key_and_error_strings_are_public_contracts() {
    let store = create_empty_store().unwrap();
    let created = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
    let generated = symbol_nem_wallet_core::generate_software_key(
        &created.store,
        created.value.profile_id,
        PASSWORD,
        Chain::Symbol,
    )
    .unwrap();
    assert_eq!(generated.value.origin, SoftwareKeyOrigin::Generated);

    let cases = [
        (ErrorCode::InvalidArgument, "InvalidArgument"),
        (ErrorCode::InvalidStore, "InvalidStore"),
        (
            ErrorCode::UnsupportedStoreVersion,
            "UnsupportedStoreVersion",
        ),
        (
            ErrorCode::UnsupportedProfileSchemaVersion,
            "UnsupportedProfileSchemaVersion",
        ),
        (ErrorCode::ProfileNotFound, "ProfileNotFound"),
        (ErrorCode::SoftwareKeyNotFound, "SoftwareKeyNotFound"),
        (ErrorCode::AuthenticationFailed, "AuthenticationFailed"),
        (ErrorCode::InvalidMnemonic, "InvalidMnemonic"),
        (ErrorCode::InvalidPrivateKey, "InvalidPrivateKey"),
        (ErrorCode::DuplicateProfile, "DuplicateProfile"),
        (ErrorCode::DuplicateSoftwareKey, "DuplicateSoftwareKey"),
        (ErrorCode::InvalidAccountIndex, "InvalidAccountIndex"),
        (ErrorCode::NetworkMismatch, "NetworkMismatch"),
        (ErrorCode::CryptoFailure, "CryptoFailure"),
        (ErrorCode::RandomSourceFailure, "RandomSourceFailure"),
        (ErrorCode::SerializationFailure, "SerializationFailure"),
        (ErrorCode::PendingProfileInvalid, "PendingProfileInvalid"),
    ];
    for (code, expected) in cases {
        assert_eq!(code.as_str(), expected);
        assert_eq!(WalletError { code }.to_string(), expected);
    }
}

#[test]
fn invalid_secret_inputs_are_rejected_without_mutating_the_store() {
    // Mnemonic、private key、account indexの不正入力を拒否し、失敗したmutationが
    // 入力Storeを変更しないことを確認する。
    let store = create_empty_store().unwrap();
    assert_eq!(
        restore_profile(&store, b"not a mnemonic", PASSWORD, Network::Mainnet)
            .unwrap_err()
            .code,
        ErrorCode::InvalidMnemonic
    );
    assert_eq!(
        restore_profile(&store, &[0xff], PASSWORD, Network::Mainnet)
            .unwrap_err()
            .code,
        ErrorCode::InvalidMnemonic
    );
    let created = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
    let before = created.store.clone();
    let missing_profile_id = Uuid::from_bytes([0; 16]);
    assert_eq!(
        list_software_keys(&created.store, missing_profile_id)
            .unwrap_err()
            .code,
        ErrorCode::ProfileNotFound
    );
    assert_eq!(
        delete_profile(&created.store, missing_profile_id, PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::ProfileNotFound
    );
    assert_eq!(
        import_software_key(
            &created.store,
            created.value.profile_id,
            PASSWORD,
            Chain::Symbol,
            &[0u8; 31],
        )
        .unwrap_err()
        .code,
        ErrorCode::InvalidPrivateKey
    );
    assert_eq!(created.store, before);
    assert_eq!(
        derive_software_key(
            &created.store,
            created.value.profile_id,
            PASSWORD,
            Chain::Symbol,
            u32::MAX,
        )
        .unwrap_err()
        .code,
        ErrorCode::InvalidAccountIndex
    );
    assert_eq!(created.store, before);
}

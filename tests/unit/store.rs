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

fn replace_index_chain_with_authenticated_value(store: &[u8]) -> Vec<u8> {
    // indexのchainだけをpayloadと異なる値へ変更し、AADも再計算して
    // 認証後の意味検証が必要な状態を作る。
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

    let profile = wallet.profiles.first_mut().unwrap();
    assert_eq!(profile.software_key_index.len(), 1);
    profile.software_key_index[0].chain = Chain::Nem;
    match profile.aad_software_key_index.first_mut().unwrap() {
        Value::Map(entries) => {
            *map_value_mut(entries, 1) = Value::UInt(Chain::Nem.wire());
        }
        _ => panic!("テストfixtureのindex entryがmapではありません"),
    }
    let profile = wallet.profiles.first().unwrap();
    let new_aad = profile_aad(&wallet, profile).unwrap();
    let (ciphertext, tag) =
        crypto::encrypt(&key, &profile.cipher.nonce, &new_aad, &plaintext).unwrap();
    let profile = wallet.profiles.first_mut().unwrap();
    profile.cipher.ciphertext = ciphertext;
    profile.cipher.tag = tag;
    encode_store(&wallet).unwrap()
}

fn wallet_with_one_profile() -> (Vec<u8>, Uuid) {
    let store = create_empty_store().unwrap();
    let restored = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
    (restored.store, restored.value.profile_id)
}

fn assert_invalid_store<T>(result: WalletResult<T>) {
    match result {
        Err(error) => assert_eq!(error.code, ErrorCode::InvalidStore),
        Ok(_) => panic!("expected InvalidStore"),
    }
}

#[test]
fn public_store_paths_are_exercised_in_unit_build() {
    // Unit test側のCore buildでも、公開Store APIの成功経路を一通り通過させる。
    let empty = create_empty_store().unwrap();
    let prepared = prepare_generated_profile(&empty, PASSWORD, Network::Testnet).unwrap();
    assert!(!prepared.value.mnemonic_utf8.is_empty());
    let finalized =
        finalize_generated_profile(&empty, &prepared.value.pending_profile, PASSWORD).unwrap();
    assert_eq!(list_profiles(&finalized.store).unwrap().value.len(), 1);

    let (store, profile_id) = wallet_with_one_profile();
    assert!(list_software_keys(&store, profile_id)
        .unwrap()
        .value
        .is_empty());
    let missing_profile_id = Uuid::from_bytes([0; 16]);
    assert_eq!(
        list_software_keys(&store, missing_profile_id)
            .unwrap_err()
            .code,
        ErrorCode::ProfileNotFound
    );
    assert_eq!(
        delete_profile(&store, missing_profile_id, PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::ProfileNotFound
    );
    let derived = derive_software_key(&store, profile_id, PASSWORD, Chain::Symbol, 0).unwrap();
    let imported = import_software_key(
        &derived.store,
        profile_id,
        PASSWORD,
        Chain::Nem,
        &[0x11; 32],
    )
    .unwrap();
    let generated = generate_software_key(&store, profile_id, PASSWORD, Chain::Symbol).unwrap();
    assert_eq!(
        list_software_keys(&imported.store, profile_id)
            .unwrap()
            .value
            .len(),
        2
    );

    let exported_mnemonic = export_mnemonic(&imported.store, profile_id, PASSWORD).unwrap();
    assert!(exported_mnemonic.value.mnemonic_utf8 == MNEMONIC);
    let exported_private =
        export_private_key(&imported.store, profile_id, derived.value.key_id, PASSWORD).unwrap();
    assert_eq!(exported_private.value.private_key.len(), 32);
    let missing_key_id = Uuid::from_bytes([0; 16]);
    assert_eq!(
        export_private_key(&imported.store, profile_id, missing_key_id, PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::SoftwareKeyNotFound
    );
    assert_eq!(
        get_public_account(&imported.store, profile_id, derived.value.key_id, PASSWORD)
            .unwrap()
            .value
            .public_key
            .len(),
        32
    );
    assert_eq!(
        get_public_account(&imported.store, profile_id, missing_key_id, PASSWORD)
            .unwrap_err()
            .code,
        ErrorCode::SoftwareKeyNotFound
    );
    assert_eq!(
        sign(
            &imported.store,
            profile_id,
            derived.value.key_id,
            PASSWORD,
            b"unit fixture"
        )
        .unwrap()
        .value
        .signature
        .len(),
        64
    );
    assert_eq!(
        sign(
            &imported.store,
            profile_id,
            missing_key_id,
            PASSWORD,
            b"missing key",
        )
        .unwrap_err()
        .code,
        ErrorCode::SoftwareKeyNotFound
    );

    let changed =
        change_profile_password(&imported.store, profile_id, PASSWORD, b"unit password").unwrap();
    let without_imported = delete_software_key(
        &changed.store,
        profile_id,
        imported.value.key_id,
        b"unit password",
    )
    .unwrap();
    let without_derived = delete_software_key(
        &without_imported.store,
        profile_id,
        derived.value.key_id,
        b"unit password",
    )
    .unwrap();
    let deleted = delete_profile(&without_derived.store, profile_id, b"unit password").unwrap();
    assert!(list_profiles(&deleted.store).unwrap().value.is_empty());
    assert_eq!(generated.value.origin, SoftwareKeyOrigin::Generated);
}

#[test]
fn error_code_strings_and_display_are_stable() {
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
        assert_eq!(WalletError::new(code).to_string(), expected);
    }
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
fn authenticated_semantic_mismatch_and_aad_tamper_are_atomic() {
    let (restored_store, profile_id) = wallet_with_one_profile();
    let before = restored_store.clone();

    let duplicate_tag_mismatch = replace_duplicate_tag_with_authenticated_value(&restored_store);
    let before_duplicate_tag_mismatch = duplicate_tag_mismatch.clone();
    let error = export_mnemonic(&duplicate_tag_mismatch, profile_id, PASSWORD).unwrap_err();
    assert_eq!(error.code, ErrorCode::InvalidStore);
    assert_eq!(duplicate_tag_mismatch, before_duplicate_tag_mismatch);
    assert_eq!(restored_store, before);

    let derived =
        derive_software_key(&restored_store, profile_id, PASSWORD, Chain::Symbol, 0).unwrap();
    let mismatch = replace_index_chain_with_authenticated_value(&derived.store);
    let before_mismatch = mismatch.clone();
    let error =
        export_private_key(&mismatch, profile_id, derived.value.key_id, PASSWORD).unwrap_err();
    assert_eq!(error.code, ErrorCode::InvalidStore);
    assert_eq!(mismatch, before_mismatch);

    let mut registry_tampered = cbor::decode(&restored_store).unwrap();
    let map = match &mut registry_tampered {
        Value::Map(entries) => entries,
        _ => unreachable!(),
    };
    match map_value_mut(map, 2) {
        Value::Bytes(bytes) => bytes[0] ^= 1,
        _ => unreachable!(),
    }
    let registry_tampered = cbor::encode(&registry_tampered).unwrap();
    let error = export_mnemonic(&registry_tampered, profile_id, PASSWORD).unwrap_err();
    assert_eq!(error.code, ErrorCode::AuthenticationFailed);
}

#[test]
fn authenticated_semantic_mismatch_rejects_all_secret_and_mutation_paths_atomically() {
    // 認証済みの意味的不一致は、秘密情報処理と全mutationで同じfatal errorとなり、
    // いずれの経路もreplacement Storeや部分状態を返さない。
    let (restored_store, profile_id) = wallet_with_one_profile();
    let derived =
        derive_software_key(&restored_store, profile_id, PASSWORD, Chain::Symbol, 0).unwrap();
    let mismatch = replace_index_chain_with_authenticated_value(&derived.store);
    let key_id = derived.value.key_id;
    let before = mismatch.clone();

    assert_invalid_store(export_mnemonic(&mismatch, profile_id, PASSWORD));
    assert_eq!(mismatch, before);
    assert_invalid_store(export_private_key(&mismatch, profile_id, key_id, PASSWORD));
    assert_eq!(mismatch, before);
    assert_invalid_store(get_public_account(&mismatch, profile_id, key_id, PASSWORD));
    assert_eq!(mismatch, before);
    assert_invalid_store(sign(
        &mismatch,
        profile_id,
        key_id,
        PASSWORD,
        b"fixture payload",
    ));
    assert_eq!(mismatch, before);
    assert_invalid_store(derive_software_key(
        &mismatch,
        profile_id,
        PASSWORD,
        Chain::Nem,
        0,
    ));
    assert_eq!(mismatch, before);
    assert_invalid_store(import_software_key(
        &mismatch,
        profile_id,
        PASSWORD,
        Chain::Nem,
        &[0x11; 32],
    ));
    assert_eq!(mismatch, before);
    assert_invalid_store(generate_software_key(
        &mismatch,
        profile_id,
        PASSWORD,
        Chain::Nem,
    ));
    assert_eq!(mismatch, before);
    assert_invalid_store(change_profile_password(
        &mismatch,
        profile_id,
        PASSWORD,
        b"new password",
    ));
    assert_eq!(mismatch, before);
    assert_invalid_store(delete_software_key(&mismatch, profile_id, key_id, PASSWORD));
    assert_eq!(mismatch, before);
    assert_invalid_store(delete_profile(&mismatch, profile_id, PASSWORD));
    assert_eq!(mismatch, before);
}

#[test]
fn generated_profile_id_retries_after_store_collision() {
    let (store, existing_id) = wallet_with_one_profile();
    let (wallet, _) = decode_store(&store).unwrap();
    let mut candidates = [existing_id.into_bytes(), [0xA5; 16]].into_iter();
    let selected = new_profile_id_with(&wallet, || {
        Ok(candidates
            .next()
            .expect("test candidate sequence exhausted"))
    })
    .unwrap();
    assert_eq!(selected, [0xA5; 16]);
}

#[test]
fn authenticated_pending_profile_id_collision_is_pending_invalid() {
    // 構造的に正常なStoreへ、別の生成内容を持つ認証済みPendingを
    // 既存Profile IDで結び付けた場合は、Store不正ではなくPending不整合とする。
    let (store, existing_id) = wallet_with_one_profile();
    let entropy = [0xA5; 32];
    let pending = make_pending(
        &store,
        &existing_id.into_bytes(),
        Network::Mainnet,
        &entropy,
        PASSWORD,
    )
    .unwrap();
    let before = store.clone();

    let error = finalize_generated_profile(&store, &pending, PASSWORD).unwrap_err();
    assert_eq!(error.code, ErrorCode::PendingProfileInvalid);
    assert_eq!(store, before);
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
    let mutated = derive_software_key(&second.store, profile_id, PASSWORD, Chain::Nem, 1).unwrap();
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
fn parser_rejection_paths_are_explicitly_classified() {
    // 認証済みopaque payloadと内部envelope parserの不正構造を、すべてInvalidStoreへ分類する。
    assert_invalid_store(parse_payload(&[0xff]));
    assert_invalid_store(parse_payload(&cbor::encode(&Value::UInt(0)).unwrap()));
    assert_invalid_store(parse_payload(
        &cbor::encode(&Value::Map(vec![(0, Value::Bytes(vec![0; 32]))])).unwrap(),
    ));
    assert_invalid_store(parse_payload(
        &cbor::encode(&Value::Map(vec![
            (0, Value::Bytes(vec![0; 32])),
            (1, Value::UInt(0)),
        ]))
        .unwrap(),
    ));

    let kdf = Value::Map(vec![
        (0, Value::UInt(KDF_ALGORITHM)),
        (1, Value::UInt(crypto::KDF_VERSION as u64)),
        (2, Value::UInt(crypto::KDF_MEMORY_KIB as u64)),
        (3, Value::UInt(crypto::KDF_ITERATIONS as u64)),
        (4, Value::UInt(crypto::KDF_PARALLELISM as u64)),
        (5, Value::Bytes(vec![3; 16])),
    ]);
    assert_invalid_store(parse_kdf(Some(&Value::UInt(0))));
    assert_invalid_store(parse_kdf(Some(&Value::Map(vec![
        (0, Value::UInt(KDF_ALGORITHM)),
        (1, Value::UInt(crypto::KDF_VERSION as u64)),
        (2, Value::UInt(crypto::KDF_MEMORY_KIB as u64)),
        (3, Value::UInt(crypto::KDF_ITERATIONS as u64)),
        (4, Value::UInt(crypto::KDF_PARALLELISM as u64)),
        (5, Value::Bytes(vec![3; 15])),
    ]))));

    let cipher = Value::Map(vec![
        (0, Value::UInt(CIPHER_ALGORITHM)),
        (1, Value::Bytes(vec![4; 12])),
        (2, Value::Bytes(Vec::new())),
        (3, Value::Bytes(vec![5; 16])),
    ]);
    assert_invalid_store(parse_cipher(Some(&Value::UInt(0))));
    assert_invalid_store(parse_cipher(Some(&Value::Map(vec![
        (0, Value::UInt(CIPHER_ALGORITHM)),
        (1, Value::Bytes(vec![4; 11])),
        (2, Value::Bytes(Vec::new())),
        (3, Value::Bytes(vec![5; 16])),
    ]))));
    assert_invalid_store(parse_cipher(Some(&Value::Map(vec![
        (0, Value::UInt(CIPHER_ALGORITHM)),
        (1, Value::Bytes(vec![4; 12])),
        (2, Value::Bytes(Vec::new())),
        (3, Value::Bytes(vec![5; 15])),
    ]))));
    assert_invalid_store(parse_cipher(Some(&Value::Map(vec![
        (0, Value::UInt(CIPHER_ALGORITHM)),
        (1, Value::Bytes(vec![4; 12])),
        (2, Value::UInt(0)),
        (3, Value::Bytes(vec![5; 16])),
    ]))));

    assert_invalid_store(parse_index_entry(&Value::UInt(0)));
    assert_invalid_store(parse_index_entry(&Value::Map(vec![(
        0,
        Value::Bytes(vec![1; 15]),
    )])));
    assert_invalid_store(parse_index_entry(&Value::Map(vec![
        (0, Value::Bytes(vec![1; 16])),
        (1, Value::UInt(2)),
    ])));

    let profile = Value::Map(vec![
        (0, Value::Bytes(vec![1; 16])),
        (1, Value::UInt(Network::Mainnet.wire())),
        (2, Value::Bytes(vec![2; 32])),
        (3, Value::UInt(PROFILE_SCHEMA_VERSION)),
        (4, kdf),
        (5, cipher),
        (6, Value::Array(Vec::new())),
    ]);
    let profile_error = |field: u64, replacement: Value| {
        let mut value = profile.clone();
        *map_value_mut(
            match &mut value {
                Value::Map(entries) => entries,
                _ => unreachable!(),
            },
            field,
        ) = replacement;
        parse_profile(&value)
    };
    assert_invalid_store(profile_error(0, Value::UInt(0)));
    assert_invalid_store(profile_error(1, Value::UInt(2)));
    assert_invalid_store(profile_error(6, Value::UInt(0)));

    for key in [
        Value::UInt(0),
        Value::Map(Vec::new()),
        Value::Map(vec![(0, Value::Bytes(vec![1; 16]))]),
        Value::Map(vec![
            (0, Value::Bytes(vec![1; 16])),
            (1, Value::UInt(Chain::Symbol.wire())),
        ]),
        Value::Map(vec![
            (0, Value::Bytes(vec![1; 16])),
            (1, Value::UInt(Chain::Symbol.wire())),
            (2, Value::Bytes(vec![2; 32])),
        ]),
        Value::Map(vec![
            (0, Value::Bytes(vec![1; 16])),
            (1, Value::UInt(Chain::Symbol.wire())),
            (2, Value::Bytes(vec![2; 32])),
            (3, Value::UInt(0)),
        ]),
        Value::Map(vec![
            (0, Value::Bytes(vec![1; 16])),
            (1, Value::UInt(Chain::Symbol.wire())),
            (2, Value::Bytes(vec![2; 32])),
            (3, Value::Map(Vec::new())),
        ]),
        Value::Map(vec![
            (0, Value::Bytes(vec![1; 16])),
            (1, Value::UInt(Chain::Symbol.wire())),
            (2, Value::Bytes(vec![2; 32])),
            (3, Value::Map(vec![(0, Value::UInt(0))])),
        ]),
    ] {
        assert_invalid_store(parse_key_record(&key));
    }
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

#[test]
fn deterministic_manifest_with_multiple_keys_has_fixed_aad_bytes() {
    // 空indexだけでなく、複数keyのmanifestもwire順序に依存せず固定化する。
    let registry_key = [0u8; 32];
    let mut profile = ProfileEnvelope {
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
        software_key_index: vec![
            IndexEntry {
                key_id: [1; 16],
                chain: Chain::Nem,
            },
            IndexEntry {
                key_id: [2; 16],
                chain: Chain::Symbol,
            },
        ],
        aad_software_key_index: Vec::new(),
        unknown_fields: Vec::new(),
    };
    profile.aad_software_key_index = index_to_values(&profile.software_key_index);
    let aad = profile_aad_from_parts(&registry_key, &profile).unwrap();
    assert_eq!(
        hex::encode(aad.as_slice()),
        "8a44534e574301582000000000000000000000000000000000000000000000000000000000000000005001010101010101010101010101010101015820020202020202020202020202020202020202020202020202020202020202020201000082a20050010101010101010101010101010101010100a20050020202020202020202020202020202020101"
    );
}

#[test]
fn store_serialization_failure_does_not_produce_partial_bytes() {
    // 保存bytes生成失敗は明示的なSerializationFailureとして扱い、部分Storeを返さない。
    let wallet = WalletStore {
        registry_key: [0x11; 32],
        profiles: Vec::new(),
        // Simple 20 is intentionally rejected by the deterministic encoder.
        unknown_fields: vec![(99, Value::Simple(20))],
    };
    let error = encode_store(&wallet).unwrap_err();
    assert_eq!(error.code, ErrorCode::SerializationFailure);
}

//! 公開Core APIの統合テスト。
//!
//! 状態変更APIが入力Storeを直接変更せず、成功時にreplacement Storeを返すこと、
//! Symbol/NEMのChain境界、認証失敗・不正入力時のエラー分類を確認する。

use symbol_nem_wallet_core::{
    change_profile_password, create_empty_store, delete_profile, delete_software_key,
    derive_software_key, export_mnemonic, export_private_key, finalize_generated_profile,
    get_public_account, import_software_key, list_profiles, list_software_keys,
    prepare_generated_profile, restore_profile, sign, Chain, ErrorCode, Network,
};

const MNEMONIC: &[u8] = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
const PASSWORD: &[u8] = b"correct horse battery staple";
const NEW_PASSWORD: &[u8] = b"new correct horse battery staple";

fn array32(hex_value: &str) -> [u8; 32] {
    // 公開APIが返すraw 32 byte値をfixtureのhex表記と比較するための補助関数。
    hex::decode(hex_value).unwrap().try_into().unwrap()
}

#[test]
fn profile_and_software_key_lifecycle_is_atomic() {
    // Profile作成から鍵の導出・import・署名・password変更・削除までを通し、
    // 各mutationが次の入力に渡せる完全なStoreを返すことを確認する。
    let store = create_empty_store().unwrap();
    let created = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
    let profile_id = created.value.profile_id;
    assert_eq!(list_profiles(&created.store).unwrap().value.len(), 1);

    let exported = export_mnemonic(&created.store, profile_id, PASSWORD).unwrap();
    assert_eq!(exported.value.mnemonic_utf8, MNEMONIC);
    assert_eq!(
        export_mnemonic(&created.store, profile_id, b"wrong")
            .unwrap_err()
            .code,
        ErrorCode::AuthenticationFailed
    );

    let symbol =
        derive_software_key(&created.store, profile_id, PASSWORD, Chain::Symbol, 0).unwrap();
    let symbol_private =
        export_private_key(&symbol.store, profile_id, symbol.value.key_id, PASSWORD)
            .unwrap()
            .value
            .private_key;
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
    assert_eq!(after_password.value.mnemonic_utf8, MNEMONIC);

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
    let created = restore_profile(&store, MNEMONIC, PASSWORD, Network::Mainnet).unwrap();
    let before = created.store.clone();
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

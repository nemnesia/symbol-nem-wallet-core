//! Native C ABIの統合テスト。
//!
//! borrowed input、owned output、free関数、error code、CoreとNativeの署名・公開情報の
//! 一致を、RustからC ABI関数を呼び出す形で確認する。

use std::{ptr, slice};

use symbol_nem_wallet_core::{
    get_public_account, sign, AccountContext, Chain, Network, SigningApproval,
    SigningApprovalStatus,
};
use symbol_nem_wallet_core_native::{
    snwc_create_empty_store, snwc_derive_software_key, snwc_export_private_key, snwc_free_bytes,
    snwc_free_profiles, snwc_free_software_key_list, snwc_free_warnings, snwc_get_public_account,
    snwc_import_software_key, snwc_list_profiles, snwc_list_software_keys,
    snwc_prepare_generated_profile, snwc_restore_profile, snwc_sign, SnwcAccountContext, SnwcBytes,
    SnwcExportApplicationConfirmation, SnwcExportRequest, SnwcExportTarget, SnwcExportUserRequest,
    SnwcOwnedBytes, SnwcProfileInfo, SnwcPublicAccountInfo, SnwcSigningApproval,
    SnwcSigningRequest, SnwcSigningTarget, SnwcSoftwareKeyInfo, SnwcSoftwareKeyListItem, SnwcUuid,
    SnwcWarnings,
};

const MNEMONIC: &[u8] = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
const PASSWORD: &[u8] = b"correct horse battery staple";

fn borrowed(value: &[u8]) -> SnwcBytes {
    SnwcBytes {
        ptr: value.as_ptr(),
        len: value.len(),
    }
}

unsafe fn take_bytes(value: &mut SnwcOwnedBytes) -> Vec<u8> {
    // Binding所有のbufferをコピーしてから、契約されたfree関数へ返す。
    let copied = if value.ptr.is_null() || value.len == 0 {
        Vec::new()
    } else {
        slice::from_raw_parts(value.ptr, value.len).to_vec()
    };
    snwc_free_bytes(value);
    assert!(value.ptr.is_null());
    assert_eq!(value.len, 0);
    snwc_free_bytes(value);
    copied
}

fn export_request(profile_id: SnwcUuid, key_id: Option<SnwcUuid>) -> SnwcExportRequest {
    let target = SnwcExportTarget {
        kind: if key_id.is_some() { 1 } else { 0 },
        profile_id,
        key_id: key_id.unwrap_or_default(),
    };
    SnwcExportRequest {
        target,
        user_request: SnwcExportUserRequest { target, status: 1 },
        application_confirmation: SnwcExportApplicationConfirmation { target, status: 1 },
    }
}

fn account_context(chain: u8, network: u8) -> SnwcAccountContext {
    SnwcAccountContext { chain, network }
}

fn signing_request(
    profile_id: SnwcUuid,
    key_id: SnwcUuid,
    chain: u8,
    network: u8,
    payload: &[u8],
) -> SnwcSigningRequest {
    SnwcSigningRequest {
        target: SnwcSigningTarget {
            profile_id,
            key_id,
            context: account_context(chain, network),
        },
        payload: borrowed(payload),
        approval: SnwcSigningApproval { status: 1 },
    }
}

#[test]
fn c_abi_keeps_byte_boundaries_and_core_results() {
    // 不正入力とNULL outputの境界を確認した後、Profile・Key・署名・公開情報の
    // C ABI結果がRust Core APIと一致することを確認する。
    unsafe {
        let mut empty = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_create_empty_store(&mut empty).is_null());
        let store = take_bytes(&mut empty);

        let mut empty_profiles: *mut SnwcProfileInfo = ptr::null_mut();
        let mut empty_profile_len = 0;
        let mut empty_list_warnings = SnwcWarnings::default();
        assert!(snwc_list_profiles(
            borrowed(&store),
            &mut empty_profiles,
            &mut empty_profile_len,
            &mut empty_list_warnings,
        )
        .is_null());
        assert!(empty_profiles.is_null());
        assert_eq!(empty_profile_len, 0);
        assert!(empty_list_warnings.ptr.is_null());
        assert_eq!(empty_list_warnings.len, 0);
        snwc_free_profiles(&mut empty_profiles, &mut empty_profile_len);
        snwc_free_warnings(&mut empty_list_warnings);

        // 複数出力が同じ構造体を指す場合は、部分結果を公開せず空状態へ戻す。
        let mut aliased_output = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_create_empty_store(&mut aliased_output).is_null());
        snwc_free_bytes(&mut aliased_output);
        let mut alias_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let alias_ptr: *mut SnwcOwnedBytes = &mut aliased_output;
        let error = snwc_prepare_generated_profile(
            borrowed(&store),
            borrowed(PASSWORD),
            0,
            alias_ptr,
            alias_ptr,
            &mut alias_warnings,
        );
        assert_eq!(
            std::ffi::CStr::from_ptr(error).to_str().unwrap(),
            "InvalidArgument"
        );
        assert!(aliased_output.ptr.is_null());
        assert_eq!(aliased_output.len, 0);
        snwc_free_bytes(&mut aliased_output);
        snwc_free_warnings(&mut alias_warnings);

        // operation開始時にcaller-owned outputはfailure-safe stateへ戻される。
        let mut sentinel_store = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_create_empty_store(&mut sentinel_store).is_null());
        take_bytes(&mut sentinel_store);
        let mut sentinel_profile = SnwcProfileInfo::default();
        let mut sentinel_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let error = snwc_restore_profile(
            borrowed(&store),
            borrowed(b"not a mnemonic"),
            borrowed(PASSWORD),
            1,
            &mut sentinel_store,
            &mut sentinel_profile,
            &mut sentinel_warnings,
        );
        assert_eq!(
            std::ffi::CStr::from_ptr(error).to_str().unwrap(),
            "InvalidMnemonic"
        );
        assert!(sentinel_store.ptr.is_null());
        assert_eq!(sentinel_store.len, 0);
        snwc_free_bytes(&mut sentinel_store);
        snwc_free_warnings(&mut sentinel_warnings);

        let mut invalid_store = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut invalid_profile = SnwcProfileInfo::default();
        let mut invalid_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let error = snwc_restore_profile(
            borrowed(&store),
            borrowed(b"not a mnemonic"),
            borrowed(PASSWORD),
            1,
            &mut invalid_store,
            &mut invalid_profile,
            &mut invalid_warnings,
        );
        // 秘密情報や内部メッセージではなく、安定したErrorCodeだけが返る。
        assert!(!error.is_null());
        assert_eq!(
            std::ffi::CStr::from_ptr(error).to_str().unwrap(),
            "InvalidMnemonic"
        );

        let mut null_profile = SnwcProfileInfo::default();
        let mut null_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let error = snwc_restore_profile(
            borrowed(&store),
            borrowed(MNEMONIC),
            borrowed(PASSWORD),
            1,
            ptr::null_mut(),
            &mut null_profile,
            &mut null_warnings,
        );
        assert_eq!(
            std::ffi::CStr::from_ptr(error).to_str().unwrap(),
            "InvalidArgument"
        );
        // NULL出力を渡した失敗では、他の出力領域を書き換えない。
        assert!(null_warnings.ptr.is_null());
        assert_eq!(null_warnings.len, 0);

        let mut restored_store = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut profile = SnwcProfileInfo::default();
        let mut warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_restore_profile(
            borrowed(&store),
            borrowed(MNEMONIC),
            borrowed(PASSWORD),
            1,
            &mut restored_store,
            &mut profile,
            &mut warnings,
        )
        .is_null());
        snwc_free_warnings(&mut warnings);
        let store = take_bytes(&mut restored_store);
        let profile_id = SnwcUuid {
            bytes: profile.profile_id,
        };

        let mut profiles: *mut SnwcProfileInfo = ptr::null_mut();
        let mut profile_len = 0;
        let mut list_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_list_profiles(
            borrowed(&store),
            &mut profiles,
            &mut profile_len,
            &mut list_warnings,
        )
        .is_null());
        assert_eq!(profile_len, 1);
        assert_eq!((*profiles).profile_id, profile.profile_id);
        assert!(list_warnings.ptr.is_null());
        assert_eq!(list_warnings.len, 0);
        snwc_free_profiles(&mut profiles, &mut profile_len);
        assert!(profiles.is_null());
        assert_eq!(profile_len, 0);
        snwc_free_profiles(&mut profiles, &mut profile_len);
        snwc_free_warnings(&mut list_warnings);

        let mut derived_store = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut key = SnwcSoftwareKeyInfo::default();
        let mut derive_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_derive_software_key(
            borrowed(&store),
            profile_id,
            borrowed(PASSWORD),
            1,
            0,
            &mut derived_store,
            &mut key,
            &mut derive_warnings,
        )
        .is_null());
        snwc_free_warnings(&mut derive_warnings);
        let store = take_bytes(&mut derived_store);
        let key_id = SnwcUuid { bytes: key.key_id };

        // NEMのChain依存導出・署名も同じCore fixtureと一致する。
        let mut nem_derived_store = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut nem_key = SnwcSoftwareKeyInfo::default();
        let mut nem_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_derive_software_key(
            borrowed(&store),
            profile_id,
            borrowed(PASSWORD),
            0,
            0,
            &mut nem_derived_store,
            &mut nem_key,
            &mut nem_warnings,
        )
        .is_null());
        snwc_free_warnings(&mut nem_warnings);
        let nem_store = take_bytes(&mut nem_derived_store);
        let nem_key_id = SnwcUuid {
            bytes: nem_key.key_id,
        };
        assert_eq!(nem_key.chain, 0);
        assert_eq!(nem_key.origin, 0);
        let core_nem = symbol_nem_wallet_core::derive_software_key(
            &store,
            uuid::Uuid::from_bytes(profile_id.bytes),
            PASSWORD,
            symbol_nem_wallet_core::Chain::Nem,
            0,
        )
        .unwrap();
        assert_eq!(nem_key.origin, 0);
        assert_eq!(core_nem.value.chain, symbol_nem_wallet_core::Chain::Nem);

        let mut nem_signature = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut nem_sign_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_sign(
            borrowed(&nem_store),
            signing_request(profile_id, nem_key_id, 0, 1, b"payload"),
            borrowed(PASSWORD),
            &mut nem_signature,
            &mut nem_sign_warnings,
        )
        .is_null());
        assert_eq!(
            take_bytes(&mut nem_signature),
            symbol_nem_wallet_core::sign(
                &nem_store,
                symbol_nem_wallet_core::SigningRequest {
                    target: symbol_nem_wallet_core::SigningTarget {
                        profile_id: uuid::Uuid::from_bytes(profile_id.bytes),
                        key_id: uuid::Uuid::from_bytes(nem_key_id.bytes),
                        context: AccountContext {
                            chain: Chain::Nem,
                            network: Network::Mainnet,
                        },
                    },
                    payload: b"payload".to_vec(),
                    approval: SigningApproval {
                        status: SigningApprovalStatus::Approved,
                    },
                },
                PASSWORD,
            )
            .unwrap()
            .value
            .signature
        );
        snwc_free_warnings(&mut nem_sign_warnings);

        let mut listed_keys: *mut SnwcSoftwareKeyListItem = ptr::null_mut();
        let mut key_len = 0;
        let mut key_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_list_software_keys(
            borrowed(&store),
            profile_id,
            &mut listed_keys,
            &mut key_len,
            &mut key_warnings,
        )
        .is_null());
        assert_eq!(key_len, 1);
        assert_eq!((*listed_keys).key_id, key.key_id);
        snwc_free_software_key_list(&mut listed_keys, &mut key_len);
        assert!(listed_keys.is_null());
        assert_eq!(key_len, 0);
        snwc_free_software_key_list(&mut listed_keys, &mut key_len);
        snwc_free_warnings(&mut key_warnings);

        let mut signature = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut sign_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_sign(
            borrowed(&store),
            signing_request(profile_id, key_id, 1, 1, b"payload"),
            borrowed(PASSWORD),
            &mut signature,
            &mut sign_warnings,
        )
        .is_null());
        let native_signature = take_bytes(&mut signature);
        // C ABIのraw signatureは、同じ入力をCoreへ渡した結果と一致する。
        let core_signature = sign(
            &store,
            symbol_nem_wallet_core::SigningRequest {
                target: symbol_nem_wallet_core::SigningTarget {
                    profile_id: uuid::Uuid::from_bytes(profile_id.bytes),
                    key_id: uuid::Uuid::from_bytes(key_id.bytes),
                    context: AccountContext {
                        chain: Chain::Symbol,
                        network: Network::Mainnet,
                    },
                },
                payload: b"payload".to_vec(),
                approval: SigningApproval {
                    status: SigningApprovalStatus::Approved,
                },
            },
            PASSWORD,
        )
        .unwrap()
        .value
        .signature;
        assert_eq!(native_signature, core_signature);
        snwc_free_warnings(&mut sign_warnings);

        let mut private_key = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut export_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_export_private_key(
            borrowed(&store),
            export_request(profile_id, Some(key_id)),
            borrowed(PASSWORD),
            &mut private_key,
            &mut export_warnings,
        )
        .is_null());
        assert_eq!(
            take_bytes(&mut private_key),
            hex::decode("521BF2A56DD3BCA09A43D8378FB6659ABA155A02DE0486A0FEF8026F464AB764")
                .unwrap()
        );
        snwc_free_warnings(&mut export_warnings);

        let mut account = SnwcPublicAccountInfo {
            key_id: [0; 16],
            chain: 0,
            network: 0,
            public_key: [0; 32],
            address: SnwcOwnedBytes {
                ptr: ptr::null_mut(),
                len: 0,
            },
        };
        let mut account_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_get_public_account(
            borrowed(&store),
            profile_id,
            key_id,
            account_context(1, 1),
            borrowed(PASSWORD),
            &mut account,
            &mut account_warnings,
        )
        .is_null());
        let native_address = slice::from_raw_parts(account.address.ptr, account.address.len);
        // addressとpublic keyもCoreの公開情報と一致し、address bufferは後で解放する。
        let core_account = get_public_account(
            &store,
            uuid::Uuid::from_bytes(profile_id.bytes),
            uuid::Uuid::from_bytes(key_id.bytes),
            AccountContext {
                chain: Chain::Symbol,
                network: Network::Mainnet,
            },
            PASSWORD,
        )
        .unwrap()
        .value;
        assert_eq!(account.public_key, core_account.public_key);
        assert_eq!(native_address, core_account.address.as_bytes());
        let expected_public_key: [u8; 32] =
            hex::decode("54ADC79E3BEE5D0EF899832172C3CCF29DC5F5F3BC0E0D5FD06E3E64D8DB51D2")
                .unwrap()
                .try_into()
                .unwrap();
        assert_eq!(account.public_key, expected_public_key);
        assert_eq!(
            core_account.address,
            "NBPYVRSCYLIJH7VU6XNR7I3H7GBQOGHHAMLJC3A"
        );
        assert!(!account.address.ptr.is_null());
        snwc_free_bytes(&mut account.address);
        snwc_free_warnings(&mut account_warnings);

        // Request assertion、context、passwordの不成立ではsecret / signature / addressを
        // 部分的にも返さず、出力は開始時のfailure-safe stateを維持する。
        let mut failed_private_key = SnwcOwnedBytes::default();
        let mut failed_export_warnings = SnwcWarnings::default();
        let mut unconfirmed_export = export_request(profile_id, Some(key_id));
        unconfirmed_export.application_confirmation.status = 0;
        let error = snwc_export_private_key(
            borrowed(&store),
            unconfirmed_export,
            borrowed(PASSWORD),
            &mut failed_private_key,
            &mut failed_export_warnings,
        );
        assert_eq!(
            std::ffi::CStr::from_ptr(error).to_str().unwrap(),
            "InvalidArgument"
        );
        assert!(failed_private_key.ptr.is_null() && failed_private_key.len == 0);
        assert!(failed_export_warnings.ptr.is_null() && failed_export_warnings.len == 0);

        let mut failed_signature = SnwcOwnedBytes::default();
        let mut failed_sign_warnings = SnwcWarnings::default();
        let mut unapproved = signing_request(profile_id, key_id, 1, 1, b"payload");
        unapproved.approval.status = 0;
        let error = snwc_sign(
            borrowed(&store),
            unapproved,
            borrowed(PASSWORD),
            &mut failed_signature,
            &mut failed_sign_warnings,
        );
        assert_eq!(
            std::ffi::CStr::from_ptr(error).to_str().unwrap(),
            "InvalidArgument"
        );
        assert!(failed_signature.ptr.is_null() && failed_signature.len == 0);
        assert!(failed_sign_warnings.ptr.is_null() && failed_sign_warnings.len == 0);

        let mut failed_account = SnwcPublicAccountInfo::default();
        let mut failed_account_warnings = SnwcWarnings::default();
        let error = snwc_get_public_account(
            borrowed(&store),
            profile_id,
            key_id,
            account_context(1, 0),
            borrowed(PASSWORD),
            &mut failed_account,
            &mut failed_account_warnings,
        );
        assert_eq!(
            std::ffi::CStr::from_ptr(error).to_str().unwrap(),
            "NetworkMismatch"
        );
        assert!(failed_account.address.ptr.is_null() && failed_account.address.len == 0);
    }
}

#[test]
fn c_abi_nem_external_fixture_matches_public_key_address_and_signature() {
    // NEMのBinding結果をCoreとの再比較だけでなく、独立した固定fixtureへ照合する。
    const NEM_ACCOUNT_PRIVATE_KEY: &[u8; 32] =
        b"\x57\x5D\xBB\x30\x62\x26\x7E\xFF\x57\xC9\x70\xA3\x36\xEB\xBC\x8F\xBC\xFE\x12\xC5\xBD\x3E\xD7\xBC\x11\xEB\x04\x81\xD7\x70\x4C\xED";
    const NEM_SIGNATURE_PRIVATE_KEY: &[u8; 32] =
        b"\xAB\xF4\xCF\x55\xA2\xB3\xF7\x42\xD7\x54\x3D\x9C\xC1\x7F\x50\x44\x7B\x96\x9E\x6E\x06\xF5\xEA\x91\x95\xD4\x28\xAB\x12\xB7\x31\x8D";
    const PAYLOAD: &[u8; 41] = b"\x8C\xE0\x3C\xD6\x05\x14\x23\x3B\x86\x78\x97\x29\x10\x2E\xA0\x9E\x86\x7F\xC6\xD9\x64\xDE\xA8\xC2\x01\x8E\xF7\xD0\xA2\xE0\xE2\x4B\xF7\xE3\x48\xE9\x17\x11\x66\x90\xB9";

    unsafe {
        let mut empty = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_create_empty_store(&mut empty).is_null());
        let empty_store = take_bytes(&mut empty);

        let mut restored_store = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut profile = SnwcProfileInfo::default();
        let mut restore_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_restore_profile(
            borrowed(&empty_store),
            borrowed(MNEMONIC),
            borrowed(PASSWORD),
            1,
            &mut restored_store,
            &mut profile,
            &mut restore_warnings,
        )
        .is_null());
        snwc_free_warnings(&mut restore_warnings);
        let restored_store = take_bytes(&mut restored_store);
        let profile_id = SnwcUuid {
            bytes: profile.profile_id,
        };

        let mut imported_store = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut imported_key = SnwcSoftwareKeyInfo::default();
        let mut import_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_import_software_key(
            borrowed(&restored_store),
            profile_id,
            borrowed(PASSWORD),
            0,
            borrowed(NEM_ACCOUNT_PRIVATE_KEY),
            &mut imported_store,
            &mut imported_key,
            &mut import_warnings,
        )
        .is_null());
        snwc_free_warnings(&mut import_warnings);
        let imported_store = take_bytes(&mut imported_store);
        let key_id = SnwcUuid {
            bytes: imported_key.key_id,
        };

        let mut account = SnwcPublicAccountInfo {
            key_id: [0; 16],
            chain: 0,
            network: 0,
            public_key: [0; 32],
            address: SnwcOwnedBytes {
                ptr: ptr::null_mut(),
                len: 0,
            },
        };
        let mut account_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_get_public_account(
            borrowed(&imported_store),
            profile_id,
            key_id,
            account_context(0, 1),
            borrowed(PASSWORD),
            &mut account,
            &mut account_warnings,
        )
        .is_null());
        let expected_public_key: [u8; 32] =
            hex::decode("C5F54BA980FCBB657DBAAA42700539B207873E134D2375EFEAB5F1AB52F87844")
                .unwrap()
                .try_into()
                .unwrap();
        assert_eq!(account.public_key, expected_public_key);
        assert_eq!(
            slice::from_raw_parts(account.address.ptr, account.address.len),
            b"NDD2CT6LQLIYQ56KIXI3ENTM6EK3D44P5JFXJ4R4"
        );
        snwc_free_bytes(&mut account.address);
        snwc_free_warnings(&mut account_warnings);

        let mut signature_store = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut signature_key = SnwcSoftwareKeyInfo::default();
        let mut signature_import_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_import_software_key(
            borrowed(&imported_store),
            profile_id,
            borrowed(PASSWORD),
            0,
            borrowed(NEM_SIGNATURE_PRIVATE_KEY),
            &mut signature_store,
            &mut signature_key,
            &mut signature_import_warnings,
        )
        .is_null());
        snwc_free_warnings(&mut signature_import_warnings);
        let signature_store = take_bytes(&mut signature_store);
        let signature_key_id = SnwcUuid {
            bytes: signature_key.key_id,
        };

        let mut signature = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        let mut sign_warnings = SnwcWarnings {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_sign(
            borrowed(&signature_store),
            signing_request(profile_id, signature_key_id, 0, 1, PAYLOAD),
            borrowed(PASSWORD),
            &mut signature,
            &mut sign_warnings,
        )
        .is_null());
        assert_eq!(
            take_bytes(&mut signature),
            hex::decode("D9CEC0CC0E3465FAB229F8E1D6DB68AB9CC99A18CB0435F70DEB6100948576CD5C0AA1FEB550BDD8693EF81EB10A556A622DB1F9301986827B96716A7134230C").unwrap()
        );
        snwc_free_warnings(&mut sign_warnings);
    }
}

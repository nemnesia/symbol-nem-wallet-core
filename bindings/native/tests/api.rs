use std::{ptr, slice};

use symbol_nem_wallet_core::{get_public_account, sign};
use symbol_nem_wallet_core_native::{
    snwc_create_empty_store, snwc_derive_software_key, snwc_export_private_key, snwc_free_bytes,
    snwc_free_profiles, snwc_free_software_key_list, snwc_free_warnings, snwc_get_public_account,
    snwc_list_profiles, snwc_list_software_keys, snwc_restore_profile, snwc_sign, SnwcBytes,
    SnwcOwnedBytes, SnwcProfileInfo, SnwcPublicAccountInfo, SnwcSoftwareKeyInfo,
    SnwcSoftwareKeyListItem, SnwcUuid, SnwcWarnings,
};

const MNEMONIC: &[u8] = b"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
const PASSWORD: &[u8] = b"correct horse battery staple";

fn borrowed(value: &[u8]) -> SnwcBytes {
    SnwcBytes {
        ptr: value.as_ptr(),
        len: value.len(),
    }
}

unsafe fn take_bytes(value: SnwcOwnedBytes) -> Vec<u8> {
    let copied = if value.ptr.is_null() || value.len == 0 {
        Vec::new()
    } else {
        slice::from_raw_parts(value.ptr, value.len).to_vec()
    };
    snwc_free_bytes(value);
    copied
}

#[test]
fn c_abi_keeps_byte_boundaries_and_core_results() {
    unsafe {
        let mut empty = SnwcOwnedBytes {
            ptr: ptr::null_mut(),
            len: 0,
        };
        assert!(snwc_create_empty_store(&mut empty).is_null());
        let store = take_bytes(empty);

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
        snwc_free_warnings(warnings);
        let store = take_bytes(restored_store);
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
        snwc_free_profiles(profiles, profile_len);
        snwc_free_warnings(list_warnings);

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
        snwc_free_warnings(derive_warnings);
        let store = take_bytes(derived_store);
        let key_id = SnwcUuid { bytes: key.key_id };

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
        snwc_free_software_key_list(listed_keys, key_len);
        snwc_free_warnings(key_warnings);

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
            profile_id,
            key_id,
            borrowed(PASSWORD),
            borrowed(b"payload"),
            &mut signature,
            &mut sign_warnings,
        )
        .is_null());
        let native_signature = take_bytes(signature);
        let core_signature = sign(
            &store,
            uuid::Uuid::from_bytes(profile_id.bytes),
            uuid::Uuid::from_bytes(key_id.bytes),
            PASSWORD,
            b"payload",
        )
        .unwrap()
        .value
        .signature;
        assert_eq!(native_signature, core_signature);
        snwc_free_warnings(sign_warnings);

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
            profile_id,
            key_id,
            borrowed(PASSWORD),
            &mut private_key,
            &mut export_warnings,
        )
        .is_null());
        assert_eq!(take_bytes(private_key).len(), 32);
        snwc_free_warnings(export_warnings);

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
            borrowed(PASSWORD),
            &mut account,
            &mut account_warnings,
        )
        .is_null());
        let native_address = slice::from_raw_parts(account.address.ptr, account.address.len);
        let core_account = get_public_account(
            &store,
            uuid::Uuid::from_bytes(profile_id.bytes),
            uuid::Uuid::from_bytes(key_id.bytes),
            PASSWORD,
        )
        .unwrap()
        .value;
        assert_eq!(account.public_key, core_account.public_key);
        assert_eq!(native_address, core_account.address.as_bytes());
        assert!(!account.address.ptr.is_null());
        snwc_free_bytes(account.address);
        snwc_free_warnings(account_warnings);
    }
}

/*
 * Public C header compile check.
 *
 * This file is compiled with -fsyntax-only in CI. It intentionally does not
 * call the ABI at runtime; the purpose is to verify that the public header
 * and all declared function signatures remain valid C.
 */

#include "symbol_nem_wallet_core.h"

int main(void) {
    SnwcBytes bytes = {0};
    SnwcUuid uuid = {0};
    SnwcOwnedBytes owned = {0};
    SnwcWarnings warnings = {0};
    SnwcProfileInfo profile = {0};
    SnwcProfileInfo *profiles = 0;
    size_t profile_len = 0;
    SnwcSoftwareKeyInfo key = {0};
    SnwcSoftwareKeyListItem *keys = 0;
    size_t key_len = 0;
    SnwcPublicAccountInfo account = {0};

    (void)snwc_create_empty_store(&owned);
    (void)snwc_prepare_generated_profile(bytes, bytes, 0, &owned, &owned, &warnings);
    (void)snwc_finalize_generated_profile(bytes, bytes, bytes, &owned, &profile, &warnings);
    (void)snwc_restore_profile(bytes, bytes, bytes, 0, &owned, &profile, &warnings);
    (void)snwc_export_mnemonic(bytes, uuid, bytes, &owned, &warnings);
    (void)snwc_export_private_key(bytes, uuid, uuid, bytes, &owned, &warnings);
    (void)snwc_list_profiles(bytes, &profiles, &profile_len, &warnings);
    (void)snwc_list_software_keys(bytes, uuid, &keys, &key_len, &warnings);
    (void)snwc_derive_software_key(bytes, uuid, bytes, 0, 0, &owned, &key, &warnings);
    (void)snwc_import_software_key(bytes, uuid, bytes, 0, bytes, &owned, &key, &warnings);
    (void)snwc_generate_software_key(bytes, uuid, bytes, 0, &owned, &key, &warnings);
    (void)snwc_get_public_account(bytes, uuid, uuid, bytes, &account, &warnings);
    (void)snwc_sign(bytes, uuid, uuid, bytes, bytes, &owned, &warnings);
    (void)snwc_change_profile_password(bytes, uuid, bytes, bytes, &owned, &warnings);
    (void)snwc_delete_software_key(bytes, uuid, uuid, bytes, &owned, &warnings);
    (void)snwc_delete_profile(bytes, uuid, bytes, &owned, &warnings);

    snwc_free_bytes(owned);
    snwc_free_warnings(warnings);
    snwc_free_profiles(profiles, profile_len);
    snwc_free_software_key_list(keys, key_len);

    return 0;
}

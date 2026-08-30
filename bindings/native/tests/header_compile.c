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
    SnwcHandoffConfirmation handoff = {1};
    SnwcExportTarget mnemonic_target = {0};
    SnwcExportRequest export_request = {0};
    SnwcAccountContext context = {1, 1};
    SnwcSigningRequest signing_request = {0};

    (void)snwc_create_empty_store(&owned);
    (void)snwc_prepare_generated_profile(bytes, bytes, 0, &owned, &owned, &warnings);
    (void)snwc_finalize_generated_profile(
        bytes, bytes, bytes, handoff, &owned, &profile, &warnings);
    (void)snwc_restore_profile(bytes, bytes, bytes, 0, &owned, &profile, &warnings);
    mnemonic_target.profile_id = uuid;
    export_request.target = mnemonic_target;
    export_request.user_request.target = mnemonic_target;
    export_request.user_request.status = 1;
    export_request.application_confirmation.target = mnemonic_target;
    export_request.application_confirmation.status = 1;
    (void)snwc_export_mnemonic(bytes, export_request, bytes, &owned, &warnings);
    export_request.target.kind = 1;
    export_request.target.key_id = uuid;
    export_request.user_request.target = export_request.target;
    export_request.application_confirmation.target = export_request.target;
    (void)snwc_export_private_key(bytes, export_request, bytes, &owned, &warnings);
    (void)snwc_list_profiles(bytes, &profiles, &profile_len, &warnings);
    (void)snwc_list_software_keys(bytes, uuid, &keys, &key_len, &warnings);
    (void)snwc_derive_software_key(bytes, uuid, bytes, 0, 0, &owned, &key, &warnings);
    (void)snwc_import_software_key(bytes, uuid, bytes, 0, bytes, &owned, &key, &warnings);
    (void)snwc_generate_software_key(bytes, uuid, bytes, 0, &owned, &key, &warnings);
    (void)snwc_get_public_account(bytes, uuid, uuid, context, bytes, &account, &warnings);
    signing_request.target.profile_id = uuid;
    signing_request.target.key_id = uuid;
    signing_request.target.context = context;
    signing_request.payload = bytes;
    signing_request.approval.status = 1;
    (void)snwc_sign(bytes, signing_request, bytes, &owned, &warnings);
    (void)snwc_change_profile_password(bytes, uuid, bytes, bytes, &owned, &warnings);
    (void)snwc_delete_software_key(bytes, uuid, uuid, bytes, &owned, &warnings);
    (void)snwc_delete_profile(bytes, uuid, bytes, &owned, &warnings);

    snwc_free_bytes(&owned);
    snwc_free_warnings(&warnings);
    snwc_free_profiles(&profiles, &profile_len);
    snwc_free_software_key_list(&keys, &key_len);

    return 0;
}

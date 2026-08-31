#include "symbol_nem_wallet_core.h"

#include <assert.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

static SnwcBytes borrowed(const uint8_t *ptr, size_t len) {
    SnwcBytes value = {ptr, len};
    return value;
}

int main(void) {
    static const uint8_t mnemonic[] =
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";
    static const uint8_t password[] = "correct horse battery staple";
    static const uint8_t payload[] = "C ABI runtime fixture";

    SnwcOwnedBytes empty = {NULL, 0};
    assert(snwc_create_empty_store(&empty) == NULL);

    SnwcOwnedBytes aliased = {NULL, 0};
    assert(snwc_create_empty_store(&aliased) == NULL);
    snwc_free_bytes(&aliased);
    SnwcWarnings alias_warnings = {NULL, 0};
    const char *alias_error = snwc_prepare_generated_profile(
        borrowed(empty.ptr, empty.len),
        borrowed(password, sizeof(password) - 1),
        0,
        &aliased,
        &aliased,
        &alias_warnings);
    assert(alias_error != NULL && strcmp(alias_error, "InvalidArgument") == 0);
    assert(aliased.ptr == NULL && aliased.len == 0);
    snwc_free_bytes(&aliased);
    snwc_free_warnings(&alias_warnings);

    SnwcOwnedBytes generated_mnemonic = {NULL, 0};
    SnwcOwnedBytes generated_pending = {NULL, 0};
    SnwcWarnings generated_warnings = {NULL, 0};
    assert(snwc_prepare_generated_profile(
               borrowed(empty.ptr, empty.len),
               borrowed(password, sizeof(password) - 1),
               0,
               &generated_mnemonic,
               &generated_pending,
               &generated_warnings) == NULL);
    assert(generated_mnemonic.ptr != NULL && generated_mnemonic.len > 0);
    assert(generated_pending.ptr != NULL && generated_pending.len > 0);
    assert(generated_mnemonic.ptr != generated_pending.ptr);
    assert(generated_mnemonic.ptr[0] != 0);
    assert(generated_pending.ptr[0] != 0);
    SnwcOwnedBytes finalized = {NULL, 0};
    SnwcProfileInfo finalized_profile = {{0}, 0, 0};
    SnwcWarnings finalize_warnings = {NULL, 0};
    SnwcHandoffConfirmation unconfirmed = {0};
    assert(snwc_finalize_generated_profile(
               borrowed(empty.ptr, empty.len),
               borrowed(generated_pending.ptr, generated_pending.len),
               borrowed(password, sizeof(password) - 1),
               unconfirmed,
               &finalized,
               &finalized_profile,
               &finalize_warnings) != NULL);
    assert(finalized.ptr == NULL && finalized.len == 0);
    SnwcHandoffConfirmation confirmed = {1};
    assert(snwc_finalize_generated_profile(
               borrowed(empty.ptr, empty.len),
               borrowed(generated_pending.ptr, generated_pending.len),
               borrowed(password, sizeof(password) - 1),
               confirmed,
               &finalized,
               &finalized_profile,
               &finalize_warnings) == NULL);
    snwc_free_bytes(&finalized);
    snwc_free_bytes(&generated_mnemonic);
    snwc_free_bytes(&generated_pending);
    snwc_free_warnings(&generated_warnings);
    snwc_free_warnings(&finalize_warnings);

    SnwcOwnedBytes restored = {NULL, 0};
    SnwcProfileInfo profile = {{0}, 0, 0};
    SnwcWarnings restore_warnings = {NULL, 0};
    assert(snwc_restore_profile(
               borrowed(empty.ptr, empty.len),
               borrowed(mnemonic, sizeof(mnemonic) - 1),
               borrowed(password, sizeof(password) - 1),
               1,
               &restored,
               &profile,
               &restore_warnings) == NULL);
    snwc_free_warnings(&restore_warnings);
    snwc_free_bytes(&empty);

    SnwcProfileInfo *profiles = NULL;
    size_t profile_len = 0;
    SnwcWarnings list_profile_warnings = {NULL, 0};
    assert(snwc_list_profiles(
               borrowed(restored.ptr, restored.len),
               &profiles,
               &profile_len,
               &list_profile_warnings) == NULL);
    assert(profile_len == 1);
    assert(memcmp(profiles[0].profile_id, profile.profile_id, sizeof(profile.profile_id)) == 0);
    snwc_free_profiles(&profiles, &profile_len);
    assert(profiles == NULL && profile_len == 0);
    snwc_free_profiles(&profiles, &profile_len);
    snwc_free_warnings(&list_profile_warnings);

    SnwcUuid profile_id;
    memcpy(profile_id.bytes, profile.profile_id, sizeof(profile_id.bytes));
    SnwcExportTarget mnemonic_target = {0, {{0}}, {{0}}};
    memcpy(mnemonic_target.profile_id.bytes, profile_id.bytes, sizeof(profile_id.bytes));
    SnwcExportRequest mnemonic_request = {
        mnemonic_target,
        {mnemonic_target, 1},
        {mnemonic_target, 1},
    };
    SnwcOwnedBytes exported_mnemonic = {NULL, 0};
    SnwcWarnings export_mnemonic_warnings = {NULL, 0};
    assert(snwc_export_mnemonic(
               borrowed(restored.ptr, restored.len),
               mnemonic_request,
               borrowed(password, sizeof(password) - 1),
               &exported_mnemonic,
               &export_mnemonic_warnings) == NULL);
    assert(exported_mnemonic.ptr != NULL);
    assert(exported_mnemonic.len == sizeof(mnemonic) - 1);
    assert(memcmp(exported_mnemonic.ptr, mnemonic, exported_mnemonic.len) == 0);
    snwc_free_bytes(&exported_mnemonic);
    snwc_free_warnings(&export_mnemonic_warnings);

    SnwcOwnedBytes derived = {NULL, 0};
    SnwcSoftwareKeyInfo key = {{0}, 0, 0, 0};
    SnwcWarnings derive_warnings = {NULL, 0};
    assert(snwc_derive_software_key(
               borrowed(restored.ptr, restored.len),
               profile_id,
               borrowed(password, sizeof(password) - 1),
               1,
               0,
               &derived,
               &key,
               &derive_warnings) == NULL);
    snwc_free_warnings(&derive_warnings);
    snwc_free_bytes(&restored);

    SnwcUuid key_id;
    memcpy(key_id.bytes, key.key_id, sizeof(key_id.bytes));

    SnwcSoftwareKeyListItem *keys = NULL;
    size_t key_len = 0;
    SnwcWarnings list_key_warnings = {NULL, 0};
    assert(snwc_list_software_keys(
               borrowed(derived.ptr, derived.len),
               profile_id,
               &keys,
               &key_len,
               &list_key_warnings) == NULL);
    assert(key_len == 1);
    assert(memcmp(keys[0].key_id, key.key_id, sizeof(key.key_id)) == 0);
    snwc_free_software_key_list(&keys, &key_len);
    assert(keys == NULL && key_len == 0);
    snwc_free_software_key_list(&keys, &key_len);
    snwc_free_warnings(&list_key_warnings);

    SnwcPublicAccountInfo account = {{0}, 0, 0, {0}, {NULL, 0}};
    SnwcWarnings account_warnings = {NULL, 0};
    assert(snwc_get_public_account(
               borrowed(derived.ptr, derived.len),
               profile_id,
               key_id,
               (SnwcAccountContext){1, 1},
               borrowed(password, sizeof(password) - 1),
               &account,
               &account_warnings) == NULL);
    assert(account.address.ptr != NULL && account.address.len > 0);
    snwc_free_bytes(&account.address);
    snwc_free_warnings(&account_warnings);

    SnwcOwnedBytes private_key = {NULL, 0};
    SnwcWarnings private_key_warnings = {NULL, 0};
    SnwcExportTarget key_target = {1, {{0}}, {{0}}};
    memcpy(key_target.profile_id.bytes, profile_id.bytes, sizeof(profile_id.bytes));
    memcpy(key_target.key_id.bytes, key_id.bytes, sizeof(key_id.bytes));
    SnwcExportRequest key_request = {key_target, {key_target, 1}, {key_target, 1}};
    assert(snwc_export_private_key(
               borrowed(derived.ptr, derived.len),
               key_request,
               borrowed(password, sizeof(password) - 1),
               &private_key,
               &private_key_warnings) == NULL);
    assert(private_key.ptr != NULL && private_key.len == 32);
    snwc_free_bytes(&private_key);
    snwc_free_warnings(&private_key_warnings);

    SnwcOwnedBytes signature = {NULL, 0};
    SnwcWarnings sign_warnings = {NULL, 0};
    assert(snwc_sign(
               borrowed(derived.ptr, derived.len),
               (SnwcSigningRequest){
                   {profile_id, key_id, {1, 1}},
                   borrowed(payload, sizeof(payload) - 1),
                   {1}},
               borrowed(password, sizeof(password) - 1),
               &signature,
               &sign_warnings) == NULL);
    assert(signature.ptr != NULL && signature.len == 64);
    snwc_free_bytes(&signature);
    snwc_free_warnings(&sign_warnings);

    // A failed call resets every output to its failure-safe state.
    SnwcOwnedBytes sentinel = {NULL, 0};
    SnwcProfileInfo invalid_profile = {{0}, 0, 0};
    SnwcWarnings invalid_warnings = {NULL, 0};
    static const uint8_t invalid_mnemonic[] = "not a mnemonic";
    const char *error = snwc_restore_profile(
        borrowed(derived.ptr, derived.len),
        borrowed(invalid_mnemonic, sizeof(invalid_mnemonic) - 1),
        borrowed(password, sizeof(password) - 1),
        1,
        &sentinel,
        &invalid_profile,
        &invalid_warnings);
    assert(error != NULL && strcmp(error, "InvalidMnemonic") == 0);
    assert(sentinel.ptr == NULL && sentinel.len == 0);
    assert(invalid_profile.profile_id[0] == 0 && invalid_profile.software_key_count == 0);
    snwc_free_bytes(&sentinel);
    snwc_free_warnings(&invalid_warnings);
    snwc_free_bytes(&derived);
    return 0;
}

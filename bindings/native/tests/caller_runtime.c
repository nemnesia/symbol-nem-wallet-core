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
    snwc_free_warnings(restore_warnings);
    snwc_free_bytes(empty);

    SnwcUuid profile_id;
    memcpy(profile_id.bytes, profile.profile_id, sizeof(profile_id.bytes));
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
    snwc_free_warnings(derive_warnings);
    snwc_free_bytes(restored);

    SnwcUuid key_id;
    memcpy(key_id.bytes, key.key_id, sizeof(key_id.bytes));
    SnwcOwnedBytes signature = {NULL, 0};
    SnwcWarnings sign_warnings = {NULL, 0};
    assert(snwc_sign(
               borrowed(derived.ptr, derived.len),
               profile_id,
               key_id,
               borrowed(password, sizeof(password) - 1),
               borrowed(payload, sizeof(payload) - 1),
               &signature,
               &sign_warnings) == NULL);
    assert(signature.ptr != NULL && signature.len == 64);
    snwc_free_bytes(signature);
    snwc_free_warnings(sign_warnings);

    // A failed call must preserve an already-owned output until the caller frees it.
    SnwcOwnedBytes sentinel = {NULL, 0};
    assert(snwc_create_empty_store(&sentinel) == NULL);
    uint8_t *sentinel_ptr = sentinel.ptr;
    size_t sentinel_len = sentinel.len;
    SnwcProfileInfo invalid_profile = {{0}, 0, 0};
    SnwcWarnings invalid_warnings = {NULL, 0};
    static const uint8_t invalid_mnemonic[] = "not a mnemonic";
    const char *error = snwc_restore_profile(
        borrowed(sentinel.ptr, sentinel.len),
        borrowed(invalid_mnemonic, sizeof(invalid_mnemonic) - 1),
        borrowed(password, sizeof(password) - 1),
        1,
        &sentinel,
        &invalid_profile,
        &invalid_warnings);
    assert(error != NULL && strcmp(error, "InvalidMnemonic") == 0);
    assert(sentinel.ptr == sentinel_ptr && sentinel.len == sentinel_len);
    snwc_free_bytes(sentinel);
    snwc_free_warnings(invalid_warnings);
    snwc_free_bytes(derived);
    return 0;
}

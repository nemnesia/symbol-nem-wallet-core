#ifndef SYMBOL_NEM_WALLET_CORE_H
#define SYMBOL_NEM_WALLET_CORE_H

#include <stddef.h>
#include <stdint.h>

/*
 * Symbol/NEM Wallet Core Native BindingのC ABI。
 *
 * 入力のSnwcBytesは呼び出し側が所有する借用bufferであり、関数は所有権を取得しない。
 * len == 0の場合はptr == NULLを許容する。len != 0の場合、ptrは呼び出し中に有効で
 * 読み取り可能なbufferを指さなければならない。任意の不正pointerやlengthを渡した場合の
 * 安全性は保証しない。
 * 出力のSnwcOwnedBytesと配列は、対応するfree関数で解放する。free関数はbufferの内容を
 * 可能な範囲でzeroizeしてから解放するため、秘密情報を含む出力にも使用できる。
 *
 * output pointerはNULLであってはならず、呼び出し側は出力構造体を初期化し、既存のowned
 * bufferをfreeしてから再利用する。エラー時は既存の出力を上書きせず、途中生成した所有
 * bufferをBinding側で解放する。
 *
 * 戻り値はNULLが成功、NULL以外がNUL終端された安定error code文字列である。error文字列は
 * Bindingが所有する静的文字列なので、呼び出し側は解放しない。errorやwarningに秘密情報は
 * 含まれない。panicはC ABIを越えず、error codeへ変換される。
 * free APIへ任意のpointerや不整合なlengthを渡すことは未定義であり、free APIはこのBinding
 * が返した未解放bufferに対してだけ使用する。
 */

typedef struct {
    const uint8_t *ptr;
    size_t len;
} SnwcBytes;

/* UUIDのraw 16 byte。byte orderはCoreのUUID表現と同じである。 */
typedef struct {
    uint8_t bytes[16];
} SnwcUuid;

typedef struct {
    uint8_t *ptr;
    size_t len;
} SnwcOwnedBytes;

typedef struct {
    const char *code;
    const char *object_type;
    uint8_t object_id[16];
    uint8_t has_object_id;
    const char *field;
} SnwcWarning;

typedef struct {
    SnwcWarning *ptr;
    size_t len;
} SnwcWarnings;

typedef struct {
    uint8_t profile_id[16];
    uint8_t network; /* 0 = testnet, 1 = mainnet */
    size_t software_key_count;
} SnwcProfileInfo;

typedef struct {
    uint8_t key_id[16];
    uint8_t chain; /* 0 = NEM, 1 = Symbol */
    uint8_t origin; /* 0 = derived, 1 = imported, 2 = generated */
    uint32_t account_index;
} SnwcSoftwareKeyInfo;

typedef struct {
    uint8_t key_id[16];
    uint8_t chain; /* 0 = NEM, 1 = Symbol */
} SnwcSoftwareKeyListItem;

typedef struct {
    uint8_t key_id[16];
    uint8_t chain; /* 0 = NEM, 1 = Symbol */
    uint8_t network; /* 0 = testnet, 1 = mainnet */
    uint8_t public_key[32];
    SnwcOwnedBytes address; /* UTF-8 address bytes */
} SnwcPublicAccountInfo;

const char *snwc_create_empty_store(SnwcOwnedBytes *out);

const char *snwc_prepare_generated_profile(
    SnwcBytes store,
    SnwcBytes password_utf8,
    uint8_t network,
    SnwcOwnedBytes *out_mnemonic,
    SnwcOwnedBytes *out_pending,
    SnwcWarnings *out_warnings);

const char *snwc_finalize_generated_profile(
    SnwcBytes store,
    SnwcBytes pending_profile,
    SnwcBytes password_utf8,
    SnwcOwnedBytes *out_store,
    SnwcProfileInfo *out_profile,
    SnwcWarnings *out_warnings);

const char *snwc_restore_profile(
    SnwcBytes store,
    SnwcBytes mnemonic_utf8,
    SnwcBytes password_utf8,
    uint8_t network,
    SnwcOwnedBytes *out_store,
    SnwcProfileInfo *out_profile,
    SnwcWarnings *out_warnings);

const char *snwc_export_mnemonic(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcBytes password_utf8,
    SnwcOwnedBytes *out_mnemonic,
    SnwcWarnings *out_warnings);

const char *snwc_export_private_key(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcUuid key_id,
    SnwcBytes password_utf8,
    SnwcOwnedBytes *out_private_key,
    SnwcWarnings *out_warnings);

const char *snwc_list_profiles(
    SnwcBytes store,
    SnwcProfileInfo **out_profiles,
    size_t *out_len,
    SnwcWarnings *out_warnings);

const char *snwc_list_software_keys(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcSoftwareKeyListItem **out_keys,
    size_t *out_len,
    SnwcWarnings *out_warnings);

const char *snwc_derive_software_key(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcBytes password_utf8,
    uint8_t chain,
    uint32_t account_index,
    SnwcOwnedBytes *out_store,
    SnwcSoftwareKeyInfo *out_key,
    SnwcWarnings *out_warnings);

const char *snwc_import_software_key(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcBytes password_utf8,
    uint8_t chain,
    SnwcBytes private_key,
    SnwcOwnedBytes *out_store,
    SnwcSoftwareKeyInfo *out_key,
    SnwcWarnings *out_warnings);

const char *snwc_generate_software_key(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcBytes password_utf8,
    uint8_t chain,
    SnwcOwnedBytes *out_store,
    SnwcSoftwareKeyInfo *out_key,
    SnwcWarnings *out_warnings);

const char *snwc_get_public_account(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcUuid key_id,
    SnwcBytes password_utf8,
    SnwcPublicAccountInfo *out_account,
    SnwcWarnings *out_warnings);

const char *snwc_sign(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcUuid key_id,
    SnwcBytes password_utf8,
    SnwcBytes payload,
    SnwcOwnedBytes *out_signature,
    SnwcWarnings *out_warnings);

const char *snwc_change_profile_password(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcBytes current_password_utf8,
    SnwcBytes new_password_utf8,
    SnwcOwnedBytes *out_store,
    SnwcWarnings *out_warnings);

const char *snwc_delete_software_key(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcUuid key_id,
    SnwcBytes password_utf8,
    SnwcOwnedBytes *out_store,
    SnwcWarnings *out_warnings);

const char *snwc_delete_profile(
    SnwcBytes store,
    SnwcUuid profile_id,
    SnwcBytes password_utf8,
    SnwcOwnedBytes *out_store,
    SnwcWarnings *out_warnings);

void snwc_free_bytes(SnwcOwnedBytes value);
void snwc_free_warnings(SnwcWarnings value);
void snwc_free_profiles(SnwcProfileInfo *ptr, size_t len);
void snwc_free_software_key_list(SnwcSoftwareKeyListItem *ptr, size_t len);

#endif /* SYMBOL_NEM_WALLET_CORE_H */

#ifndef SYMBOL_NEM_WALLET_CORE_H
#define SYMBOL_NEM_WALLET_CORE_H

#include <stddef.h>
#include <stdint.h>

/* Private copy of the checked-in C ABI declarations used by the RN adapter. */
typedef struct { const uint8_t *ptr; size_t len; } SnwcBytes;
typedef struct { uint8_t bytes[16]; } SnwcUuid;
typedef struct { uint8_t *ptr; size_t len; } SnwcOwnedBytes;
typedef struct { uint8_t status; } SnwcHandoffConfirmation;
typedef struct { uint8_t kind; SnwcUuid profile_id; SnwcUuid key_id; } SnwcExportTarget;
typedef struct { SnwcExportTarget target; uint8_t status; } SnwcExportUserRequest;
typedef struct { SnwcExportTarget target; uint8_t status; } SnwcExportApplicationConfirmation;
typedef struct {
  SnwcExportTarget target;
  SnwcExportUserRequest user_request;
  SnwcExportApplicationConfirmation application_confirmation;
} SnwcExportRequest;
typedef struct { uint8_t chain; uint8_t network; } SnwcAccountContext;
typedef struct { SnwcUuid profile_id; SnwcUuid key_id; SnwcAccountContext context; } SnwcSigningTarget;
typedef struct { uint8_t status; } SnwcSigningApproval;
typedef struct { SnwcSigningTarget target; SnwcBytes payload; SnwcSigningApproval approval; } SnwcSigningRequest;
typedef struct {
  const char *code;
  const char *object_type;
  uint8_t object_id[16];
  uint8_t has_object_id;
  const char *field;
} SnwcWarning;
typedef struct { SnwcWarning *ptr; size_t len; } SnwcWarnings;
typedef struct { uint8_t profile_id[16]; uint8_t network; size_t software_key_count; } SnwcProfileInfo;
typedef struct { uint8_t key_id[16]; uint8_t chain; uint8_t origin; uint32_t account_index; } SnwcSoftwareKeyInfo;
typedef struct { uint8_t key_id[16]; uint8_t chain; } SnwcSoftwareKeyListItem;
typedef struct {
  uint8_t key_id[16];
  uint8_t chain;
  uint8_t network;
  uint8_t public_key[32];
  SnwcOwnedBytes address;
} SnwcPublicAccountInfo;

#ifdef __cplusplus
extern "C" {
#endif

const char *snwc_create_empty_store(SnwcOwnedBytes *out);
const char *snwc_prepare_generated_profile(SnwcBytes, SnwcBytes, uint8_t, SnwcOwnedBytes *, SnwcOwnedBytes *, SnwcWarnings *);
const char *snwc_finalize_generated_profile(SnwcBytes, SnwcBytes, SnwcBytes, SnwcHandoffConfirmation, SnwcOwnedBytes *, SnwcProfileInfo *, SnwcWarnings *);
const char *snwc_restore_profile(SnwcBytes, SnwcBytes, SnwcBytes, uint8_t, SnwcOwnedBytes *, SnwcProfileInfo *, SnwcWarnings *);
const char *snwc_export_mnemonic(SnwcBytes, SnwcExportRequest, SnwcBytes, SnwcOwnedBytes *, SnwcWarnings *);
const char *snwc_export_private_key(SnwcBytes, SnwcExportRequest, SnwcBytes, SnwcOwnedBytes *, SnwcWarnings *);
const char *snwc_list_profiles(SnwcBytes, SnwcProfileInfo **, size_t *, SnwcWarnings *);
const char *snwc_list_software_keys(SnwcBytes, SnwcUuid, SnwcSoftwareKeyListItem **, size_t *, SnwcWarnings *);
const char *snwc_derive_software_key(SnwcBytes, SnwcUuid, SnwcBytes, uint8_t, uint32_t, SnwcOwnedBytes *, SnwcSoftwareKeyInfo *, SnwcWarnings *);
const char *snwc_import_software_key(SnwcBytes, SnwcUuid, SnwcBytes, uint8_t, SnwcBytes, SnwcOwnedBytes *, SnwcSoftwareKeyInfo *, SnwcWarnings *);
const char *snwc_generate_software_key(SnwcBytes, SnwcUuid, SnwcBytes, uint8_t, SnwcOwnedBytes *, SnwcSoftwareKeyInfo *, SnwcWarnings *);
const char *snwc_get_public_account(SnwcBytes, SnwcUuid, SnwcUuid, SnwcAccountContext, SnwcBytes, SnwcPublicAccountInfo *, SnwcWarnings *);
const char *snwc_sign(SnwcBytes, SnwcSigningRequest, SnwcBytes, SnwcOwnedBytes *, SnwcWarnings *);
const char *snwc_change_profile_password(SnwcBytes, SnwcUuid, SnwcBytes, SnwcBytes, SnwcOwnedBytes *, SnwcWarnings *);
const char *snwc_delete_software_key(SnwcBytes, SnwcUuid, SnwcUuid, SnwcBytes, SnwcOwnedBytes *, SnwcWarnings *);
const char *snwc_delete_profile(SnwcBytes, SnwcUuid, SnwcBytes, SnwcOwnedBytes *, SnwcWarnings *);
void snwc_free_bytes(SnwcOwnedBytes *);
void snwc_free_warnings(SnwcWarnings *);
void snwc_free_profiles(SnwcProfileInfo **, size_t *);
void snwc_free_software_key_list(SnwcSoftwareKeyListItem **, size_t *);

#ifdef __cplusplus
}
#endif

#endif

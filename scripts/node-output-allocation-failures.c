/* Node outputのallocation/conversion失敗を実N-API境界へ注入するLinux専用test shim。 */
#define _GNU_SOURCE
#include <link.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

static unsigned char *output_data;
static size_t output_length;
static size_t allocation_count;
static int failure_injected;
static uintptr_t original_arraybuffer, original_typedarray, original_metadata;

static int mode_is(const char *expected) {
  const char *mode = getenv("SNWC_TEST_NAPI_OUTPUT_FAILURE");
  return allocation_count >= 2 && !failure_injected && mode != NULL && strcmp(mode, expected) == 0;
}

static void assert_no_secret_copy(void) {
  for (size_t i = 0; i < output_length; ++i) {
    if (output_data[i] != 0) abort();
  }
}

int napi_create_arraybuffer(void *env, size_t length, void **data, void **result) {
  allocation_count++;
  if (mode_is("allocation")) { failure_injected = 1; return 9; }
  typedef int (*Function)(void *, size_t, void **, void **);
  Function original = (Function)original_arraybuffer;
  int status = original(env, length, data, result);
  if (status == 0) {
    output_data = *data;
    output_length = length;
  }
  return status;
}

int napi_create_typedarray(void *env, int type, size_t length, void *buffer,
    size_t offset, void **result) {
  if (mode_is("typedarray")) {
    assert_no_secret_copy();
    failure_injected = 1;
    return 9;
  }
  typedef int (*Function)(void *, int, size_t, void *, size_t, void **);
  return ((Function)original_typedarray)(env, type, length, buffer, offset, result);
}

int napi_get_typedarray_info(void *env, void *value, int *type, size_t *length, void **data,
    void **buffer, size_t *offset) {
  if (mode_is("metadata") && output_data != NULL) {
    assert_no_secret_copy();
    failure_injected = 1;
    return 9;
  }
  typedef int (*Function)(void *, void *, int *, size_t *, void **, void **, size_t *);
  return ((Function)original_metadata)(env, value, type, length, data, buffer, offset);
}

int napi_create_external_arraybuffer(void *env, void *data, size_t length,
    void *finalize, void *hint, void **result) {
  /* secret outputをRust-owned backingへ戻す回帰は成功扱いにしない。 */
  (void)env; (void)data; (void)length; (void)finalize; (void)hint; (void)result;
  abort();
}

/* LD_PRELOADではmain executableのN-API symbolを差し替えられないため、
 * glibc auditでnapi-sysのdlsym結果を差し替える。公開packageには含まれない。 */
unsigned int la_version(unsigned int version) { (void)version; return LAV_CURRENT; }
unsigned int la_objopen(struct link_map *map, Lmid_t namespace, uintptr_t *cookie) {
  (void)map; (void)namespace; (void)cookie;
  return LA_FLG_BINDTO | LA_FLG_BINDFROM;
}
uintptr_t la_symbind64(Elf64_Sym *symbol, unsigned int index, uintptr_t *ref,
    uintptr_t *def, unsigned int *flags, const char *name) {
  (void)index; (void)ref; (void)def; (void)flags;
  if (strcmp(name, "napi_create_arraybuffer") == 0) {
    original_arraybuffer = symbol->st_value;
    return (uintptr_t)napi_create_arraybuffer;
  }
  if (strcmp(name, "napi_create_typedarray") == 0) {
    original_typedarray = symbol->st_value;
    return (uintptr_t)napi_create_typedarray;
  }
  if (strcmp(name, "napi_get_typedarray_info") == 0) {
    original_metadata = symbol->st_value;
    return (uintptr_t)napi_get_typedarray_info;
  }
  if (strcmp(name, "napi_create_external_arraybuffer") == 0) return (uintptr_t)napi_create_external_arraybuffer;
  return symbol->st_value;
}

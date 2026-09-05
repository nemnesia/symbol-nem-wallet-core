#include "NativeSymbolNemWalletCore.h"

#include "symbol_nem_wallet_core.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstring>
#include <mutex>
#include <shared_mutex>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace facebook::react {
namespace {

using namespace facebook::jsi;

class Signal final : public std::exception {
 public:
  explicit Signal(const char *code) : code_(code) {}
  const char *what() const noexcept override { return code_; }

 private:
  const char *code_;
};

[[noreturn]] void fail(const char *code) {
  throw Signal(code);
}

constexpr const char *kBindingFailure = "BindingFailure";

bool isCoreError(const char *code) {
  static constexpr std::array<const char *, 18> codes = {
      "InvalidArgument",
      "InvalidStore",
      "UnsupportedStoreVersion",
      "UnsupportedProfileSchemaVersion",
      "ProfileNotFound",
      "SoftwareKeyNotFound",
      "AuthenticationFailed",
      "InvalidMnemonic",
      "InvalidPrivateKey",
      "DuplicateProfile",
      "DuplicateSoftwareKey",
      "InvalidAccountIndex",
      "NetworkMismatch",
      "CryptoFailure",
      "RandomSourceFailure",
      "SerializationFailure",
      "PendingProfileInvalid",
      "BindingFailure",
  };
  return code != nullptr && std::find(codes.begin(), codes.end(), code) != codes.end();
}

std::mutex coordinatorMutex;
thread_local const void *coordinatorOwner = nullptr;
std::atomic_uintptr_t nextBindingIdentity{1};
std::atomic_uint64_t nextRequestIdentity{0};

uintptr_t allocateBindingIdentity() {
  const uintptr_t identity = nextBindingIdentity.fetch_add(1, std::memory_order_relaxed);
  if (identity == 0) fail(kBindingFailure);
  return identity;
}

void wipeSecret(std::vector<uint8_t> &bytes) noexcept {
  volatile uint8_t *data = bytes.data();
  for (size_t index = 0; index < bytes.size(); index += 1) {
    data[index] = 0;
  }
}

class AdmissionTicket final {
 public:
  AdmissionTicket(
      const std::atomic_bool &valid,
      const std::atomic_uintptr_t &runtimeIdentity,
      uintptr_t registryIdentity,
      uintptr_t contextIdentity,
      uint64_t processGeneration,
      std::atomic_uint64_t &nextRequestIdentity,
      std::shared_mutex &lifecycleMutex,
      Runtime &runtime)
      : valid_(valid),
        runtimeIdentity_(runtimeIdentity),
        registryIdentity_(registryIdentity),
        contextIdentity_(contextIdentity),
        processGeneration_(processGeneration),
        lifecycleMutex_(lifecycleMutex),
        runtime_(reinterpret_cast<uintptr_t>(&runtime)) {
    if (!valid_.load(std::memory_order_acquire) || coordinatorOwner != nullptr || runtime_ == 0) {
      fail(kBindingFailure);
    }
    uintptr_t unregistered = 0;
    if (!runtimeIdentity_.compare_exchange_strong(
            unregistered, runtime_, std::memory_order_acq_rel, std::memory_order_acquire) &&
        unregistered != runtime_) {
      fail(kBindingFailure);
    }
    lock_ = std::unique_lock<std::mutex>(coordinatorMutex);
    if (!valid_.load(std::memory_order_acquire) ||
        runtimeIdentity_.load(std::memory_order_acquire) != runtime_ ||
        registryIdentity_ == 0 || contextIdentity_ == 0 || processGeneration_ == 0) {
      fail(kBindingFailure);
    }
    requestIdentity_ = nextRequestIdentity.fetch_add(1, std::memory_order_relaxed) + 1;
    if (requestIdentity_ == 0) {
      fail(kBindingFailure);
    }
    coordinatorOwner = this;
  }

  ~AdmissionTicket() {
    coordinatorOwner = nullptr;
  }

  void ensureLive() const {
    if (!isLive()) {
      fail(kBindingFailure);
    }
  }

  template <typename Function>
  decltype(auto) deliver(Function &&function) const {
    std::shared_lock<std::shared_mutex> deliveryLock(lifecycleMutex_);
    ensureLive();
    return std::forward<Function>(function)();
  }

 private:
  bool isLive() const {
    return valid_.load(std::memory_order_acquire) &&
        runtimeIdentity_.load(std::memory_order_acquire) == runtime_ &&
        registryIdentity_ != 0 && contextIdentity_ != 0 && processGeneration_ != 0 &&
        requestIdentity_ != 0;
  }

  const std::atomic_bool &valid_;
  const std::atomic_uintptr_t &runtimeIdentity_;
  const uintptr_t registryIdentity_;
  const uintptr_t contextIdentity_;
  const uint64_t processGeneration_;
  std::shared_mutex &lifecycleMutex_;
  const uintptr_t runtime_;
  uint64_t requestIdentity_ = 0;
  std::unique_lock<std::mutex> lock_;
};

class SecretBytes final {
 public:
  SecretBytes() = default;
  explicit SecretBytes(std::vector<uint8_t> bytes) : bytes_(std::move(bytes)) {}
  SecretBytes(const SecretBytes &) = delete;
  SecretBytes &operator=(const SecretBytes &) = delete;
  SecretBytes(SecretBytes &&) = default;
  SecretBytes &operator=(SecretBytes &&other) noexcept {
    if (this != &other) {
      wipeSecret(bytes_);
      bytes_ = std::move(other.bytes_);
    }
    return *this;
  }
  ~SecretBytes() { wipeSecret(bytes_); }

  SnwcBytes cBytes() const {
    return {bytes_.empty() ? nullptr : bytes_.data(), bytes_.size()};
  }

 private:
  std::vector<uint8_t> bytes_;
};

class OwnedBytes final {
 public:
  SnwcOwnedBytes value{};
  OwnedBytes() = default;
  OwnedBytes(const OwnedBytes &) = delete;
  OwnedBytes &operator=(const OwnedBytes &) = delete;
  void release() { snwc_free_bytes(&value); }
  ~OwnedBytes() { snwc_free_bytes(&value); }
};

class Warnings final {
 public:
  SnwcWarnings value{};
  Warnings() = default;
  Warnings(const Warnings &) = delete;
  Warnings &operator=(const Warnings &) = delete;
  void release() { snwc_free_warnings(&value); }
  ~Warnings() { snwc_free_warnings(&value); }
};

class NativeWarnings final {
 public:
  struct NativeWarning {
    std::string code;
    std::string objectType;
    std::array<uint8_t, 16> objectId{};
    bool hasObjectId = false;
    bool hasField = false;
    std::string field;
  };

  NativeWarnings() = default;
  NativeWarnings(const NativeWarnings &) = delete;
  NativeWarnings &operator=(const NativeWarnings &) = delete;

  void capture(Warnings &source) {
    if (source.value.len != 0 && source.value.ptr == nullptr) fail(kBindingFailure);
    values_.reserve(source.value.len);
    for (size_t index = 0; index < source.value.len; index += 1) {
      const SnwcWarning &warning = source.value.ptr[index];
      if (warning.code == nullptr || warning.object_type == nullptr ||
          (warning.has_object_id != 0 && warning.has_object_id != 1)) {
        fail(kBindingFailure);
      }
      NativeWarning copy;
      copy.code = warning.code;
      copy.objectType = warning.object_type;
      std::memcpy(copy.objectId.data(), warning.object_id, copy.objectId.size());
      copy.hasObjectId = warning.has_object_id != 0;
      copy.hasField = warning.field != nullptr;
      if (copy.hasField) copy.field = warning.field;
      values_.push_back(std::move(copy));
    }
    source.release();
  }

  const std::vector<NativeWarning> &values() const { return values_; }

 private:
  std::vector<NativeWarning> values_;
};

class Profiles final {
 public:
  SnwcProfileInfo *ptr = nullptr;
  size_t len = 0;
  void release() { snwc_free_profiles(&ptr, &len); }
  ~Profiles() { snwc_free_profiles(&ptr, &len); }
};

class SoftwareKeys final {
 public:
  SnwcSoftwareKeyListItem *ptr = nullptr;
  size_t len = 0;
  void release() { snwc_free_software_key_list(&ptr, &len); }
  ~SoftwareKeys() { snwc_free_software_key_list(&ptr, &len); }
};

SecretBytes copyOwnedBytes(OwnedBytes &source) {
  if (source.value.len != 0 && source.value.ptr == nullptr) fail(kBindingFailure);
  std::vector<uint8_t> copy(source.value.len);
  if (!copy.empty()) std::memcpy(copy.data(), source.value.ptr, copy.size());
  source.release();
  return SecretBytes(std::move(copy));
}

std::vector<SnwcProfileInfo> copyProfiles(Profiles &source) {
  if (source.len != 0 && source.ptr == nullptr) fail(kBindingFailure);
  std::vector<SnwcProfileInfo> copy(source.len);
  if (!copy.empty()) std::memcpy(copy.data(), source.ptr, copy.size() * sizeof(SnwcProfileInfo));
  source.release();
  return copy;
}

std::vector<SnwcSoftwareKeyListItem> copySoftwareKeys(SoftwareKeys &source) {
  if (source.len != 0 && source.ptr == nullptr) fail(kBindingFailure);
  std::vector<SnwcSoftwareKeyListItem> copy(source.len);
  if (!copy.empty()) std::memcpy(copy.data(), source.ptr, copy.size() * sizeof(SnwcSoftwareKeyListItem));
  source.release();
  return copy;
}

std::string copyAddress(OwnedBytes &source) {
  if (source.value.len != 0 && source.value.ptr == nullptr) fail(kBindingFailure);
  std::string copy;
  if (source.value.len != 0) {
    copy.assign(reinterpret_cast<const char *>(source.value.ptr), source.value.len);
  }
  source.release();
  return copy;
}

Value property(Runtime &runtime, const Object &object, const char *name) {
  try {
    return object.getProperty(runtime, name);
  } catch (...) {
    fail(kBindingFailure);
  }
}

Object objectValue(Runtime &runtime, const Value &value) {
  if (!value.isObject() || value.isNull()) {
    fail(kBindingFailure);
  }
  return value.asObject(runtime);
}

Array arrayValue(Runtime &runtime, const Value &value) {
  Object object = objectValue(runtime, value);
  if (!object.isArray(runtime)) {
    fail(kBindingFailure);
  }
  return object.asArray(runtime);
}

std::string stringValue(Runtime &runtime, const Value &value) {
  if (!value.isString()) {
    fail(kBindingFailure);
  }
  try {
    std::string result = value.asString(runtime).utf8(runtime);
    if (result.find('\0') != std::string::npos) {
      fail(kBindingFailure);
    }
    return result;
  } catch (...) {
    fail(kBindingFailure);
  }
}

double numberValue(Runtime &runtime, const Value &value) {
  (void)runtime;
  if (!value.isNumber() || !std::isfinite(value.getNumber())) {
    fail(kBindingFailure);
  }
  return value.getNumber();
}

uint8_t binaryEnum(Runtime &runtime, const Value &value) {
  const double number = numberValue(runtime, value);
  if (number != 0.0 && number != 1.0) {
    fail(kBindingFailure);
  }
  return static_cast<uint8_t>(number);
}

uint32_t accountIndex(Runtime &runtime, const Value &value) {
  const double number = numberValue(runtime, value);
  if (number < 0.0 || number > 2147483647.0 || std::floor(number) != number) {
    fail(kBindingFailure);
  }
  return static_cast<uint32_t>(number);
}

Value arrayItem(Runtime &runtime, const Object &args, size_t index) {
  Value raw = property(runtime, args, "args");
  Array array = arrayValue(runtime, raw);
  if (index >= array.size(runtime)) {
    fail(kBindingFailure);
  }
  return array.getValueAtIndex(runtime, index);
}

size_t argumentCount(Runtime &runtime, const Object &args) {
  Array array = arrayValue(runtime, property(runtime, args, "args"));
  return array.size(runtime);
}

void exactArgumentCount(Runtime &runtime, const Object &args, size_t count) {
  if (argumentCount(runtime, args) != count) {
    fail(kBindingFailure);
  }
}

uint8_t hexNibble(char value) {
  if (value >= '0' && value <= '9') return static_cast<uint8_t>(value - '0');
  if (value >= 'a' && value <= 'f') return static_cast<uint8_t>(value - 'a' + 10);
  if (value >= 'A' && value <= 'F') return static_cast<uint8_t>(value - 'A' + 10);
  fail(kBindingFailure);
}

SnwcUuid uuidValue(Runtime &runtime, const Value &value) {
  const std::string text = stringValue(runtime, value);
  if (text.size() != 36 || text[8] != '-' || text[13] != '-' || text[18] != '-' || text[23] != '-') {
    fail(kBindingFailure);
  }
  SnwcUuid result{};
  size_t output = 0;
  for (size_t index = 0; index < text.size(); index += 1) {
    if (text[index] == '-') continue;
    if (output >= sizeof(result.bytes)) fail(kBindingFailure);
    const uint8_t high = hexNibble(text[index]);
    index += 1;
    const uint8_t low = hexNibble(text[index]);
    result.bytes[output++] = static_cast<uint8_t>((high << 4) | low);
  }
  if (output != sizeof(result.bytes)) fail(kBindingFailure);
  return result;
}

std::string uuidString(const uint8_t *bytes) {
  static constexpr char hex[] = "0123456789abcdef";
  std::string result(36, '-');
  size_t input = 0;
  for (size_t index = 0; index < 36; index += 1) {
    if (index == 8 || index == 13 || index == 18 || index == 23) continue;
    result[index] = hex[bytes[input] >> 4];
    result[++index] = hex[bytes[input] & 0x0f];
    input += 1;
  }
  return result;
}

SecretBytes bytesValue(Runtime &runtime, const Value &value) {
  if (!value.isObject() || value.isNull()) {
    fail(kBindingFailure);
  }
  const Object object = value.asObject(runtime);
  if (!object.isUint8Array(runtime)) {
    fail(kBindingFailure);
  }
  Uint8Array typed = object.asUint8Array(runtime);
  ArrayBuffer buffer = typed.buffer(runtime);
  if (buffer.detached(runtime)) {
    fail(kBindingFailure);
  }
  const size_t offset = typed.byteOffset(runtime);
  const size_t length = typed.byteLength(runtime);
  if (offset > buffer.size(runtime) || length > buffer.size(runtime) - offset) {
    fail(kBindingFailure);
  }
  const uint8_t *data = buffer.data(runtime);
  if (length != 0 && data == nullptr) {
    fail(kBindingFailure);
  }
  std::vector<uint8_t> copy(length);
  if (length != 0) {
    std::memcpy(copy.data(), data + offset, length);
  }
  return SecretBytes(std::move(copy));
}

SnwcExportTarget exportTarget(Runtime &runtime, const Value &value) {
  Object object = objectValue(runtime, value);
  SnwcExportTarget result{};
  const std::string kind = stringValue(runtime, property(runtime, object, "kind"));
  if (kind == "mnemonic") {
    result.kind = 0;
    if (!property(runtime, object, "key_id").isUndefined()) fail(kBindingFailure);
  } else if (kind == "software_key") {
    result.kind = 1;
    result.key_id = uuidValue(runtime, property(runtime, object, "key_id"));
  } else {
    fail(kBindingFailure);
  }
  result.profile_id = uuidValue(runtime, property(runtime, object, "profile_id"));
  return result;
}

uint8_t exportStatus(Runtime &runtime, const Value &value, const char *negative, const char *positive) {
  const std::string status = stringValue(runtime, property(runtime, objectValue(runtime, value), "status"));
  if (status == negative) return 0;
  if (status == positive) return 1;
  fail(kBindingFailure);
}

SnwcExportRequest exportRequest(Runtime &runtime, const Value &value) {
  Object object = objectValue(runtime, value);
  SnwcExportRequest result{};
  result.target = exportTarget(runtime, property(runtime, object, "target"));
  Object user = objectValue(runtime, property(runtime, object, "user_request"));
  result.user_request.target = exportTarget(runtime, property(runtime, user, "target"));
  result.user_request.status = exportStatus(runtime, property(runtime, user, "status"), "not_requested", "requested");
  Object confirmation = objectValue(runtime, property(runtime, object, "application_confirmation"));
  result.application_confirmation.target = exportTarget(runtime, property(runtime, confirmation, "target"));
  result.application_confirmation.status = exportStatus(
      runtime, property(runtime, confirmation, "status"), "not_confirmed", "confirmed");
  return result;
}

SnwcAccountContext contextValue(Runtime &runtime, const Value &value) {
  Object object = objectValue(runtime, value);
  const std::string chain = stringValue(runtime, property(runtime, object, "chain"));
  const std::string network = stringValue(runtime, property(runtime, object, "network"));
  if (chain != "nem" && chain != "symbol") fail(kBindingFailure);
  if (network != "testnet" && network != "mainnet") fail(kBindingFailure);
  return {static_cast<uint8_t>(chain == "symbol"), static_cast<uint8_t>(network == "mainnet")};
}

SnwcSigningRequest signingRequest(Runtime &runtime, const Value &value, SecretBytes &payload) {
  Object object = objectValue(runtime, value);
  Object target = objectValue(runtime, property(runtime, object, "target"));
  SnwcSigningRequest result{};
  result.target.profile_id = uuidValue(runtime, property(runtime, target, "profile_id"));
  result.target.key_id = uuidValue(runtime, property(runtime, target, "key_id"));
  result.target.context = contextValue(runtime, property(runtime, target, "context"));
  payload = bytesValue(runtime, property(runtime, object, "payload"));
  result.payload = payload.cBytes();
  result.approval.status = exportStatus(runtime, property(runtime, object, "approval"), "not_approved", "approved");
  return result;
}

void checkCoreError(const char *error) {
  if (error == nullptr) return;
  fail(isCoreError(error) ? error : kBindingFailure);
}

Value bytesToJs(Runtime &runtime, const uint8_t *data, size_t length) {
  if (length != 0 && data == nullptr) fail(kBindingFailure);
  Uint8Array result(runtime, length);
  ArrayBuffer buffer = result.buffer(runtime);
  if (length != 0) {
    std::memcpy(buffer.data(runtime) + result.byteOffset(runtime), data, length);
  }
  return Value(std::move(result));
}

Value bytesToJs(Runtime &runtime, const SecretBytes &source) {
  return bytesToJs(runtime, source.cBytes().ptr, source.cBytes().len);
}

Value fixedBytesToJs(Runtime &runtime, const SecretBytes &source, size_t expectedLength) {
  if (source.cBytes().len != expectedLength || source.cBytes().ptr == nullptr) fail(kBindingFailure);
  return bytesToJs(runtime, source);
}

Object warningToJs(Runtime &runtime, const NativeWarnings::NativeWarning &warning) {
  Object object(runtime);
  object.setProperty(runtime, "code", String::createFromUtf8(runtime, warning.code));
  object.setProperty(runtime, "object_type", String::createFromUtf8(runtime, warning.objectType));
  if (warning.hasObjectId) {
    object.setProperty(runtime, "object_id", String::createFromUtf8(runtime, uuidString(warning.objectId.data())));
  } else {
    object.setProperty(runtime, "object_id", Value::undefined());
  }
  if (warning.hasField) {
    object.setProperty(runtime, "field", String::createFromUtf8(runtime, warning.field));
  } else {
    object.setProperty(runtime, "field", Value::undefined());
  }
  return object;
}

Array warningsToJs(Runtime &runtime, const NativeWarnings &warnings) {
  Array result(runtime, warnings.values().size());
  for (size_t index = 0; index < warnings.values().size(); index += 1) {
    result.setValueAtIndex(runtime, index, warningToJs(runtime, warnings.values()[index]));
  }
  return result;
}

void setValue(Runtime &runtime, Object &object, const char *name, Value value) {
  object.setProperty(runtime, name, std::move(value));
}

Object readResult(Runtime &runtime, Value value, const NativeWarnings &warnings) {
  Object result(runtime);
  setValue(runtime, result, "value", std::move(value));
  setValue(runtime, result, "warnings", Value(warningsToJs(runtime, warnings)));
  return result;
}

Object mutationResult(Runtime &runtime, const SecretBytes &store, Value value, const NativeWarnings &warnings) {
  Object result(runtime);
  setValue(runtime, result, "store", bytesToJs(runtime, store));
  setValue(runtime, result, "value", std::move(value));
  setValue(runtime, result, "warnings", warningsToJs(runtime, warnings));
  return result;
}

Object profileToJs(Runtime &runtime, const SnwcProfileInfo &profile) {
  if (profile.network > 1 || profile.software_key_count > static_cast<size_t>(9007199254740991.0)) fail(kBindingFailure);
  Object result(runtime);
  setValue(runtime, result, "profile_id", String::createFromUtf8(runtime, uuidString(profile.profile_id)));
  setValue(runtime, result, "network", String::createFromUtf8(runtime, profile.network == 0 ? "testnet" : "mainnet"));
  setValue(runtime, result, "software_key_count", Value(static_cast<double>(profile.software_key_count)));
  return result;
}

Object keyInfoToJs(Runtime &runtime, const SnwcSoftwareKeyInfo &key) {
  if (key.chain > 1 || key.origin > 2) fail(kBindingFailure);
  Object origin(runtime);
  if (key.origin == 0) {
    setValue(runtime, origin, "kind", String::createFromUtf8(runtime, "derived"));
    setValue(runtime, origin, "account_index", Value(static_cast<double>(key.account_index)));
  } else {
    setValue(runtime, origin, "kind", String::createFromUtf8(runtime, key.origin == 1 ? "imported" : "generated"));
    setValue(runtime, origin, "account_index", Value::null());
  }
  Object result(runtime);
  setValue(runtime, result, "key_id", String::createFromUtf8(runtime, uuidString(key.key_id)));
  setValue(runtime, result, "chain", String::createFromUtf8(runtime, key.chain == 0 ? "nem" : "symbol"));
  setValue(runtime, result, "origin", std::move(origin));
  return result;
}

Object keyListItemToJs(Runtime &runtime, const SnwcSoftwareKeyListItem &key) {
  if (key.chain > 1) fail(kBindingFailure);
  Object result(runtime);
  setValue(runtime, result, "key_id", String::createFromUtf8(runtime, uuidString(key.key_id)));
  setValue(runtime, result, "chain", String::createFromUtf8(runtime, key.chain == 0 ? "nem" : "symbol"));
  return result;
}

Array profilesToJs(Runtime &runtime, const std::vector<SnwcProfileInfo> &profiles) {
  Array result(runtime, profiles.size());
  for (size_t index = 0; index < profiles.size(); index += 1) {
    result.setValueAtIndex(runtime, index, profileToJs(runtime, profiles[index]));
  }
  return result;
}

Array softwareKeysToJs(Runtime &runtime, const std::vector<SnwcSoftwareKeyListItem> &keys) {
  Array result(runtime, keys.size());
  for (size_t index = 0; index < keys.size(); index += 1) {
    result.setValueAtIndex(runtime, index, keyListItemToJs(runtime, keys[index]));
  }
  return result;
}

Object publicAccountToJs(Runtime &runtime, const SnwcPublicAccountInfo &account, const std::string &addressText) {
  if (account.chain > 1 || account.network > 1) fail(kBindingFailure);
  Object result(runtime);
  setValue(runtime, result, "key_id", String::createFromUtf8(runtime, uuidString(account.key_id)));
  setValue(runtime, result, "chain", String::createFromUtf8(runtime, account.chain == 0 ? "nem" : "symbol"));
  setValue(runtime, result, "network", String::createFromUtf8(runtime, account.network == 0 ? "testnet" : "mainnet"));
  /* public_key is fixed storage, so copy it without invoking a C ABI free function. */
  Uint8Array publicKey(runtime, sizeof(account.public_key));
  ArrayBuffer keyBuffer = publicKey.buffer(runtime);
  std::memcpy(keyBuffer.data(runtime) + publicKey.byteOffset(runtime), account.public_key, sizeof(account.public_key));
  setValue(runtime, result, "public_key", Value(std::move(publicKey)));
  setValue(runtime, result, "address", String::createFromUtf8(runtime, addressText));
  return result;
}

} // namespace

NativeSymbolNemWalletCore::NativeSymbolNemWalletCore(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeSymbolNemWalletCoreCxxSpec(std::move(jsInvoker)),
      registryIdentity_(allocateBindingIdentity()),
      contextIdentity_(allocateBindingIdentity()) {}

void NativeSymbolNemWalletCore::invalidate() {
  std::unique_lock<std::shared_mutex> lifecycleLock(lifecycleMutex_);
  valid_.store(false, std::memory_order_release);
}

jsi::Object NativeSymbolNemWalletCore::invoke(
    jsi::Runtime &runtime,
    std::string operation,
    jsi::Object args) {
  try {
    AdmissionTicket ticket(
        valid_, runtimeIdentity_, registryIdentity_, contextIdentity_, processGeneration_,
        nextRequestIdentity, lifecycleMutex_, runtime);
    if (operation == "create_empty_store") {
      exactArgumentCount(runtime, args, 0);
      OwnedBytes store;
      checkCoreError(snwc_create_empty_store(&store.value));
      SecretBytes nativeStore = copyOwnedBytes(store);
      return ticket.deliver([&]() {
        return objectValue(runtime, bytesToJs(runtime, nativeStore));
      });
    }

    if (operation == "prepare_generated_profile") {
      exactArgumentCount(runtime, args, 3);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      SecretBytes password(bytesValue(runtime, arrayItem(runtime, args, 1)));
      const uint8_t network = binaryEnum(runtime, arrayItem(runtime, args, 2));
      OwnedBytes mnemonic;
      OwnedBytes pending;
      Warnings warnings;
      checkCoreError(snwc_prepare_generated_profile(
          store.cBytes(), password.cBytes(), network, &mnemonic.value, &pending.value, &warnings.value));
      SecretBytes nativeMnemonic = copyOwnedBytes(mnemonic);
      SecretBytes nativePending = copyOwnedBytes(pending);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        Object value(runtime);
        setValue(runtime, value, "mnemonic_utf8", bytesToJs(runtime, nativeMnemonic));
        setValue(runtime, value, "pending_profile", bytesToJs(runtime, nativePending));
        return readResult(runtime, std::move(value), nativeWarnings);
      });
    }

    if (operation == "finalize_generated_profile" || operation == "restore_profile") {
      exactArgumentCount(runtime, args, 4);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      SecretBytes second(bytesValue(runtime, arrayItem(runtime, args, 1)));
      SecretBytes password(bytesValue(runtime, arrayItem(runtime, args, 2)));
      OwnedBytes replacement;
      SnwcProfileInfo profile{};
      Warnings warnings;
      const char *error = nullptr;
      if (operation == "finalize_generated_profile") {
        Object confirmation = objectValue(runtime, arrayItem(runtime, args, 3));
        SnwcHandoffConfirmation handoff{exportStatus(runtime, property(runtime, confirmation, "status"), "unconfirmed", "confirmed")};
        error = snwc_finalize_generated_profile(
            store.cBytes(), second.cBytes(), password.cBytes(), handoff, &replacement.value, &profile, &warnings.value);
      } else {
        const uint8_t network = binaryEnum(runtime, arrayItem(runtime, args, 3));
        error = snwc_restore_profile(
            store.cBytes(), second.cBytes(), password.cBytes(), network, &replacement.value, &profile, &warnings.value);
      }
      checkCoreError(error);
      SecretBytes nativeReplacement = copyOwnedBytes(replacement);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        return mutationResult(runtime, nativeReplacement, profileToJs(runtime, profile), nativeWarnings);
      });
    }

    if (operation == "list_profiles") {
      exactArgumentCount(runtime, args, 1);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      Profiles profiles;
      Warnings warnings;
      checkCoreError(snwc_list_profiles(store.cBytes(), &profiles.ptr, &profiles.len, &warnings.value));
      std::vector<SnwcProfileInfo> nativeProfiles = copyProfiles(profiles);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        return readResult(runtime, Value(profilesToJs(runtime, nativeProfiles)), nativeWarnings);
      });
    }

    if (operation == "export_mnemonic" || operation == "export_private_key") {
      exactArgumentCount(runtime, args, 3);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      SnwcExportRequest request = exportRequest(runtime, arrayItem(runtime, args, 1));
      SecretBytes password(bytesValue(runtime, arrayItem(runtime, args, 2)));
      OwnedBytes exported;
      Warnings warnings;
      const char *error = operation == "export_mnemonic"
          ? snwc_export_mnemonic(store.cBytes(), request, password.cBytes(), &exported.value, &warnings.value)
          : snwc_export_private_key(store.cBytes(), request, password.cBytes(), &exported.value, &warnings.value);
      checkCoreError(error);
      SecretBytes nativeExported = copyOwnedBytes(exported);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        Object value(runtime);
        setValue(runtime, value, operation == "export_mnemonic" ? "mnemonic_utf8" : "private_key",
            operation == "export_mnemonic" ? bytesToJs(runtime, nativeExported) : fixedBytesToJs(runtime, nativeExported, 32));
        return readResult(runtime, std::move(value), nativeWarnings);
      });
    }

    if (operation == "list_software_keys") {
      exactArgumentCount(runtime, args, 2);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      SnwcUuid profile = uuidValue(runtime, arrayItem(runtime, args, 1));
      SoftwareKeys keys;
      Warnings warnings;
      checkCoreError(snwc_list_software_keys(store.cBytes(), profile, &keys.ptr, &keys.len, &warnings.value));
      std::vector<SnwcSoftwareKeyListItem> nativeKeys = copySoftwareKeys(keys);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        return readResult(runtime, softwareKeysToJs(runtime, nativeKeys), nativeWarnings);
      });
    }

    if (operation == "derive_software_key" || operation == "import_software_key" || operation == "generate_software_key") {
      const size_t expected = operation == "derive_software_key" ? 5 : operation == "import_software_key" ? 5 : 4;
      exactArgumentCount(runtime, args, expected);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      SnwcUuid profile = uuidValue(runtime, arrayItem(runtime, args, 1));
      SecretBytes password(bytesValue(runtime, arrayItem(runtime, args, 2)));
      const uint8_t chain = binaryEnum(runtime, arrayItem(runtime, args, 3));
      OwnedBytes replacement;
      SnwcSoftwareKeyInfo key{};
      Warnings warnings;
      const char *error = nullptr;
      if (operation == "derive_software_key") {
        error = snwc_derive_software_key(store.cBytes(), profile, password.cBytes(), chain,
            accountIndex(runtime, arrayItem(runtime, args, 4)), &replacement.value, &key, &warnings.value);
      } else if (operation == "import_software_key") {
        SecretBytes privateKey(bytesValue(runtime, arrayItem(runtime, args, 4)));
        error = snwc_import_software_key(store.cBytes(), profile, password.cBytes(), chain,
            privateKey.cBytes(), &replacement.value, &key, &warnings.value);
      } else {
        error = snwc_generate_software_key(store.cBytes(), profile, password.cBytes(), chain,
            &replacement.value, &key, &warnings.value);
      }
      checkCoreError(error);
      SecretBytes nativeReplacement = copyOwnedBytes(replacement);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        return mutationResult(runtime, nativeReplacement, keyInfoToJs(runtime, key), nativeWarnings);
      });
    }

    if (operation == "get_public_account") {
      exactArgumentCount(runtime, args, 5);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      SnwcUuid profile = uuidValue(runtime, arrayItem(runtime, args, 1));
      SnwcUuid key = uuidValue(runtime, arrayItem(runtime, args, 2));
      SnwcAccountContext context = contextValue(runtime, arrayItem(runtime, args, 3));
      SecretBytes password(bytesValue(runtime, arrayItem(runtime, args, 4)));
      SnwcPublicAccountInfo account{};
      Warnings warnings;
      checkCoreError(snwc_get_public_account(
          store.cBytes(), profile, key, context, password.cBytes(), &account, &warnings.value));
      OwnedBytes address;
      address.value = account.address;
      account.address = {};
      std::string nativeAddress = copyAddress(address);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        return readResult(runtime, Value(publicAccountToJs(runtime, account, nativeAddress)), nativeWarnings);
      });
    }

    if (operation == "sign") {
      exactArgumentCount(runtime, args, 3);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      SecretBytes payload;
      SnwcSigningRequest request = signingRequest(runtime, arrayItem(runtime, args, 1), payload);
      SecretBytes password(bytesValue(runtime, arrayItem(runtime, args, 2)));
      OwnedBytes signature;
      Warnings warnings;
      checkCoreError(snwc_sign(store.cBytes(), request, password.cBytes(), &signature.value, &warnings.value));
      SecretBytes nativeSignature = copyOwnedBytes(signature);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        Object value(runtime);
        setValue(runtime, value, "signature", fixedBytesToJs(runtime, nativeSignature, 64));
        return readResult(runtime, std::move(value), nativeWarnings);
      });
    }

    if (operation == "change_profile_password") {
      exactArgumentCount(runtime, args, 4);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      SnwcUuid profile = uuidValue(runtime, arrayItem(runtime, args, 1));
      SecretBytes current(bytesValue(runtime, arrayItem(runtime, args, 2)));
      SecretBytes next(bytesValue(runtime, arrayItem(runtime, args, 3)));
      OwnedBytes replacement;
      Warnings warnings;
      checkCoreError(snwc_change_profile_password(
          store.cBytes(), profile, current.cBytes(), next.cBytes(), &replacement.value, &warnings.value));
      SecretBytes nativeReplacement = copyOwnedBytes(replacement);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        return mutationResult(runtime, nativeReplacement, Value::null(), nativeWarnings);
      });
    }

    if (operation == "delete_software_key" || operation == "delete_profile") {
      const size_t expected = operation == "delete_software_key" ? 4 : 3;
      exactArgumentCount(runtime, args, expected);
      SecretBytes store(bytesValue(runtime, arrayItem(runtime, args, 0)));
      SnwcUuid profile = uuidValue(runtime, arrayItem(runtime, args, 1));
      OwnedBytes replacement;
      Warnings warnings;
      const char *error = nullptr;
      if (operation == "delete_software_key") {
        SnwcUuid key = uuidValue(runtime, arrayItem(runtime, args, 2));
        SecretBytes password(bytesValue(runtime, arrayItem(runtime, args, 3)));
        error = snwc_delete_software_key(store.cBytes(), profile, key, password.cBytes(), &replacement.value, &warnings.value);
      } else {
        SecretBytes password(bytesValue(runtime, arrayItem(runtime, args, 2)));
        error = snwc_delete_profile(store.cBytes(), profile, password.cBytes(), &replacement.value, &warnings.value);
      }
      checkCoreError(error);
      SecretBytes nativeReplacement = copyOwnedBytes(replacement);
      NativeWarnings nativeWarnings;
      nativeWarnings.capture(warnings);
      return ticket.deliver([&]() {
        return mutationResult(runtime, nativeReplacement, Value::null(), nativeWarnings);
      });
    }

    fail(kBindingFailure);
  } catch (const Signal &signal) {
    throw jsi::JSError(runtime, signal.what());
  } catch (...) {
    throw jsi::JSError(runtime, kBindingFailure);
  }
}

} // namespace facebook::react

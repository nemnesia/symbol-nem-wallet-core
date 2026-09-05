#include "NativeSymbolNemWalletCoreProvider.h"

namespace facebook::react {

#if defined(__GNUC__)
#define SNWC_RN_EXPORT __attribute__((visibility("default")))
#else
#define SNWC_RN_EXPORT
#endif

extern "C" SNWC_RN_EXPORT const char *snwc_rn_module_identity() {
  return "symbol-nem-wallet-core-react-native-v1";
}

SNWC_RN_EXPORT std::shared_ptr<TurboModule> symbolNemWalletCoreCxxModuleProvider(
    const std::string &name,
    const std::shared_ptr<CallInvoker> &jsInvoker) {
  if (name == NativeSymbolNemWalletCore::kModuleName) {
    return std::make_shared<NativeSymbolNemWalletCore>(jsInvoker);
  }
  return nullptr;
}

} // namespace facebook::react

#undef SNWC_RN_EXPORT

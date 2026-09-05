#include "NativeSymbolNemWalletCoreProvider.h"

namespace facebook::react {

#if defined(__GNUC__)
#define SNWC_RN_EXPORT __attribute__((visibility("default")))
#else
#define SNWC_RN_EXPORT
#endif

#if !defined(SNWC_RN_ANDROID_ABI)
#define SNWC_RN_ANDROID_ABI "unknown"
#endif

#if defined(__APPLE__)
#include <TargetConditionals.h>
#if TARGET_OS_SIMULATOR
#define SNWC_RN_PLATFORM_IOS_SIMULATOR 1
#else
#define SNWC_RN_PLATFORM_IOS 1
#endif
#endif

extern "C" SNWC_RN_EXPORT const char *snwc_rn_module_identity() {
  return "symbol-nem-wallet-core-react-native-v1";
}

extern "C" SNWC_RN_EXPORT const char *snwc_rn_artifact_identity() {
#if defined(SNWC_RN_PLATFORM_ANDROID)
  return "android|" SNWC_RN_ANDROID_ABI "|dist/react-native/android/jni/" SNWC_RN_ANDROID_ABI "/libsymbol_nem_wallet_core_rn.so";
#elif defined(SNWC_RN_PLATFORM_IOS_SIMULATOR)
  return "ios|ios-simulator|arm64|dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64-simulator/libsymbol_nem_wallet_core_rn.a";
#elif defined(SNWC_RN_PLATFORM_IOS)
  return "ios|ios|arm64|dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64/libsymbol_nem_wallet_core_rn.a";
#else
  return nullptr;
#endif
}

extern "C" SNWC_RN_EXPORT std::shared_ptr<TurboModule> symbolNemWalletCoreCxxModuleProvider(
    const std::string &name,
    const std::shared_ptr<CallInvoker> &jsInvoker) {
  if (name == NativeSymbolNemWalletCore::kModuleName) {
    return std::make_shared<NativeSymbolNemWalletCore>(jsInvoker);
  }
  return nullptr;
}

} // namespace facebook::react

#undef SNWC_RN_EXPORT

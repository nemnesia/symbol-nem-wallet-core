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

#if !defined(SNWC_RN_TARGET_ID)
#define SNWC_RN_TARGET_ID "unknown"
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

extern "C" {
extern const char snwc_rn_artifact_identity_value[];
}

extern "C" SNWC_RN_EXPORT const char *snwc_rn_artifact_identity() {
  return snwc_rn_artifact_identity_value[0] == '\0' ? nullptr : snwc_rn_artifact_identity_value;
}

/* providerから返すだけでなく、この値をdata symbolとしてbinary内に保持する。
 * release検査ではtarget tableと埋め込み値の両方を照合する。 */
extern "C" SNWC_RN_EXPORT const char snwc_rn_artifact_identity_value[] =
#if defined(SNWC_RN_PLATFORM_ANDROID)
    "android|" SNWC_RN_ANDROID_ABI "|dist/react-native/android/jni/" SNWC_RN_ANDROID_ABI "/libsymbol_nem_wallet_core_rn.so";
#elif defined(SNWC_RN_PLATFORM_IOS_SIMULATOR)
    "ios|ios-simulator|arm64|dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64-simulator/libsymbol_nem_wallet_core_rn.a";
#elif defined(SNWC_RN_PLATFORM_IOS)
    "ios|ios|arm64|dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/ios-arm64/libsymbol_nem_wallet_core_rn.a";
#else
    "unknown";
#endif

extern "C" SNWC_RN_EXPORT const char *snwc_rn_target_id() {
#if defined(SNWC_RN_PLATFORM_ANDROID)
  return SNWC_RN_TARGET_ID;
#elif defined(SNWC_RN_PLATFORM_IOS_SIMULATOR)
  return "ios-simulator-arm64";
#elif defined(SNWC_RN_PLATFORM_IOS)
  return "ios-arm64";
#else
  return nullptr;
#endif
}

SNWC_RN_EXPORT std::shared_ptr<TurboModule> symbolNemWalletCoreCxxModuleProvider(
    const std::string &name,
    const std::shared_ptr<CallInvoker> &jsInvoker) {
  (void)name;
  (void)jsInvoker;
  // provider callback単体では実際のRN登録、logical context、module registry identityを持たない。
  // それらをここで生成してはならない。Androidは下記のRN 0.87 CxxReactPackage経路を使い、
  // iOSはhost / runtime lifecycleに結び付いたCodegen RCTModuleProvider経路を使う。
  return nullptr;
}

extern "C" SNWC_RN_EXPORT const char *symbolNemWalletCoreCxxModuleProvider() {
  return "symbol-nem-wallet-core-react-native-provider-v1";
}

} // namespace facebook::react

#undef SNWC_RN_EXPORT

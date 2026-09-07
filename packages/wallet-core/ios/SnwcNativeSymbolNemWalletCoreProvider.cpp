/* Keep the provider implementation inside the Pod source root; see the
 * corresponding core adapter for the CocoaPods source-root constraint. */
#if !defined(SNWC_RN_ARTIFACT_MODE)
#include "../cpp/NativeSymbolNemWalletCoreProvider.cpp"
#endif

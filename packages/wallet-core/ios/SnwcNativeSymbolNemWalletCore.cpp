/* Keep the core implementation inside the Pod source root. CocoaPods does
 * not add translation units outside a :path Pod's source root to its build
 * phase, so this adapter includes the repository-owned implementation. */
#if !defined(SNWC_RN_ARTIFACT_MODE)
#include "../cpp/NativeSymbolNemWalletCore.cpp"
#endif

/* provider実装をPodのsource root内に置く。CocoaPodsのsource root制約については
 * 対応するCore adapterの説明を参照する。 */
#if !defined(SNWC_RN_ARTIFACT_MODE)
#include "../cpp/NativeSymbolNemWalletCoreProvider.cpp"
#endif

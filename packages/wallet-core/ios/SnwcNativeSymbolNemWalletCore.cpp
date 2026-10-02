/* Core実装をPodのsource root内に置く。CocoaPodsは:path Podのsource root外にあるtranslation unitを
 * build phaseへ追加しないため、このadapterからrepository管理下の実装をincludeする。 */
#if !defined(SNWC_RN_ARTIFACT_MODE)
#include "../cpp/NativeSymbolNemWalletCore.cpp"
#endif

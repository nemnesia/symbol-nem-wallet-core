#include "NativeSymbolNemWalletCoreProvider.h"

namespace facebook::react {

std::shared_ptr<TurboModule> symbolNemWalletCoreCxxModuleProvider(
    const std::string &name,
    const std::shared_ptr<CallInvoker> &jsInvoker) {
  if (name == NativeSymbolNemWalletCore::kModuleName) {
    return std::make_shared<NativeSymbolNemWalletCore>(jsInvoker);
  }
  return nullptr;
}

} // namespace facebook::react

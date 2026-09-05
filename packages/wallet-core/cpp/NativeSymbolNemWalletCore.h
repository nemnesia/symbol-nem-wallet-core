#pragma once

#if __has_include(<SymbolNemWalletCoreSpecJSI.h>)
#include <SymbolNemWalletCoreSpecJSI.h>
#elif __has_include(<React-Codegen/SymbolNemWalletCoreSpecJSI.h>)
#include <React-Codegen/SymbolNemWalletCoreSpecJSI.h>
#else
#error "React Native Codegen output SymbolNemWalletCoreSpecJSI.h is required"
#endif

#include <atomic>
#include <memory>

namespace facebook::react {

class NativeSymbolNemWalletCore final
    : public NativeSymbolNemWalletCoreCxxSpec<NativeSymbolNemWalletCore> {
 public:
  explicit NativeSymbolNemWalletCore(std::shared_ptr<CallInvoker> jsInvoker);

  jsi::Object invoke(jsi::Runtime &runtime, std::string operation, jsi::Object args);
  void invalidate() override;

 private:
  std::atomic_bool valid_{true};
};

} // namespace facebook::react

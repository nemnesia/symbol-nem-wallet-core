#pragma once

#if __has_include(<SymbolNemWalletCoreSpecJSI.h>)
#include <SymbolNemWalletCoreSpecJSI.h>
#elif __has_include(<React-Codegen/SymbolNemWalletCoreSpecJSI.h>)
#include <React-Codegen/SymbolNemWalletCoreSpecJSI.h>
#else
#error "React Native Codegen output SymbolNemWalletCoreSpecJSI.h is required"
#endif

#include <atomic>
#include <cstdint>
#include <memory>
#include <shared_mutex>

namespace facebook::react {

class NativeSymbolNemWalletCore final
    : public NativeSymbolNemWalletCoreCxxSpec<NativeSymbolNemWalletCore> {
 public:
  explicit NativeSymbolNemWalletCore(std::shared_ptr<CallInvoker> jsInvoker);

  jsi::Object invoke(jsi::Runtime &runtime, std::string operation, jsi::Object args);
  void invalidate() override;

 private:
  std::atomic_bool valid_{true};
  mutable std::shared_mutex lifecycleMutex_;
  std::atomic_uintptr_t runtimeIdentity_{0};
  const uintptr_t registryIdentity_;
  const uintptr_t contextIdentity_;
  const uint64_t processGeneration_ = 1;
};

} // namespace facebook::react

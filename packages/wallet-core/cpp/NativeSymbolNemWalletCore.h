#pragma once

#if __has_include(<SymbolNemWalletCoreSpecJSI.h>)
#include <SymbolNemWalletCoreSpecJSI.h>
#elif __has_include(<React-Codegen/SymbolNemWalletCoreSpecJSI.h>)
#include <React-Codegen/SymbolNemWalletCoreSpecJSI.h>
#else
#error "React Native Codegen output SymbolNemWalletCoreSpecJSI.h is required"
#endif

#include <memory>

#include "RnLifecycleCoordinator.h"

namespace facebook::react {

/* The token is owned by the RN TurboModule instance and expires with its
 * actual registry/context lifetime. It is not exposed to JavaScript. */
struct NativeSymbolNemWalletCoreContext final {};

class NativeSymbolNemWalletCore final
    : public NativeSymbolNemWalletCoreCxxSpec<NativeSymbolNemWalletCore> {
 public:
  explicit NativeSymbolNemWalletCore(std::shared_ptr<CallInvoker> jsInvoker);
  ~NativeSymbolNemWalletCore();

  jsi::Object invoke(jsi::Runtime &runtime, std::string operation, jsi::Object args);
  void invalidate();

 private:
  std::shared_ptr<NativeSymbolNemWalletCoreContext> context_;
  RnLifecycleCoordinator::Registration registration_;
};

} // namespace facebook::react

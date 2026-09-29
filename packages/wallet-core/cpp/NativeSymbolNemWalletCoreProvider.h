#pragma once

#include "NativeSymbolNemWalletCore.h"

#include <memory>
#include <string>

namespace facebook::react {

extern "C" const char *snwc_rn_module_identity();
extern "C" const char *snwc_rn_artifact_identity();
extern "C" const char *snwc_rn_target_id();

std::shared_ptr<TurboModule> symbolNemWalletCoreCxxModuleProvider(
    const std::string &name,
    const std::shared_ptr<CallInvoker> &jsInvoker);

// C-compatible loader marker. The actual C++ provider remains type-safe while
// the native artifact can expose one exact, unmangled provider identity.
extern "C" const char *symbolNemWalletCoreCxxModuleProvider();

} // namespace facebook::react

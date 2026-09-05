#pragma once

#include "NativeSymbolNemWalletCore.h"

#include <memory>
#include <string>

namespace facebook::react {

std::shared_ptr<TurboModule> symbolNemWalletCoreCxxModuleProvider(
    const std::string &name,
    const std::shared_ptr<CallInvoker> &jsInvoker);

} // namespace facebook::react

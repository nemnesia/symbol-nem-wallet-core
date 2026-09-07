#pragma once

#include "../cpp/RnLifecycleCoordinator.h"

namespace facebook::react {

void snwc_ios_host_did_start(
    const void *host,
    const void *moduleRegistry) noexcept;
void snwc_ios_runtime_did_initialize(
    const void *host,
    const void *moduleRegistry,
    const void *runtime) noexcept;
RnLifecycleCoordinator::RegistrationIdentity snwc_ios_module_identity(
    const void *provider);
void snwc_ios_provider_did_invalidate(const void *provider) noexcept;

} // namespace facebook::react

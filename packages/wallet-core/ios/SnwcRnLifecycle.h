#pragma once

#include "../cpp/RnLifecycleCoordinator.h"

#if defined(__GNUC__)
#define SNWC_RN_LIFECYCLE_EXPORT __attribute__((visibility("default")))
#else
#define SNWC_RN_LIFECYCLE_EXPORT
#endif

namespace facebook::react {

SNWC_RN_LIFECYCLE_EXPORT void snwc_ios_host_did_start(
    const void *host,
    const void *moduleRegistry) noexcept;
SNWC_RN_LIFECYCLE_EXPORT void snwc_ios_runtime_did_initialize(
    const void *host,
    const void *moduleRegistry,
    const void *runtime) noexcept;
SNWC_RN_LIFECYCLE_EXPORT RnLifecycleCoordinator::RegistrationIdentity snwc_ios_module_identity(
    const void *provider);
SNWC_RN_LIFECYCLE_EXPORT void snwc_ios_provider_did_invalidate(const void *provider) noexcept;
#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
SNWC_RN_LIFECYCLE_EXPORT void snwc_ios_set_integration_reload_callback(
    RnLifecycleCoordinator::IntegrationReloadCallback callback) noexcept;
#endif

} // namespace facebook::react

#undef SNWC_RN_LIFECYCLE_EXPORT

#import "NativeSymbolNemWalletCoreProvider.h"

#if !defined(SNWC_RN_ARTIFACT_MODE)

#import <ReactCommon/TurboModule.h>
#import <ReactCommon/RCTHost.h>
#import <React/RCTInvalidating.h>
#import <UIKit/UIKit.h>

#import "../cpp/NativeSymbolNemWalletCore.h"
#import "SnwcRnLifecycle.h"

#include <cstdlib>
#include <mutex>
#include <stdexcept>
#include <thread>
#include <unordered_map>

namespace {

void registerProcessTeardownHooks() {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    std::atexit([] {
      facebook::react::RnLifecycleCoordinator::shared().processTeardown();
    });
    [[NSNotificationCenter defaultCenter]
        addObserverForName:UIApplicationWillTerminateNotification
                    object:nil
                     queue:nil
                usingBlock:^(__unused NSNotification *notification) {
                  facebook::react::RnLifecycleCoordinator::shared().processTeardown();
                }];
  });
}

} // namespace

namespace facebook::react {
namespace {

struct IosRuntimeBinding final {
  const void *host = nullptr;
  const void *moduleRegistry = nullptr;
  const void *runtime = nullptr;
  const void *provider = nullptr;
};

std::mutex &iosRuntimeMutex() {
  static std::mutex mutex;
  return mutex;
}

std::unordered_map<std::thread::id, IosRuntimeBinding> &iosRuntimeBindings() {
  static std::unordered_map<std::thread::id, IosRuntimeBinding> bindings;
  return bindings;
}

} // namespace

void snwc_ios_host_did_start(const void *host, const void *moduleRegistry) noexcept {
  if (host == nullptr || moduleRegistry == nullptr) return;
  NSLog(@"SNWC_RN_NATIVE_HOST_DID_START:%p:%p", host, moduleRegistry);
  // RCTHost calls hostDidStart after it has invalidated the previous
  // RCTInstance during reload. Invalidate the old host registration before
  // the replacement runtime can execute JavaScript.
  RnLifecycleCoordinator::shared().invalidateContext(host);
  std::lock_guard<std::mutex> lock(iosRuntimeMutex());
  for (auto iterator = iosRuntimeBindings().begin(); iterator != iosRuntimeBindings().end();) {
    if (iterator->second.host == host) {
      iterator = iosRuntimeBindings().erase(iterator);
    } else {
      ++iterator;
    }
  }
}

void snwc_ios_runtime_did_initialize(
    const void *host,
    const void *moduleRegistry,
    const void *runtime) noexcept {
  if (host == nullptr || moduleRegistry == nullptr || runtime == nullptr) return;
  NSLog(@"SNWC_RN_NATIVE_RUNTIME_INITIALIZED:%p:%p:%p", host, moduleRegistry, runtime);
  RnLifecycleCoordinator::shared().registerProcessLifecycle();
  std::lock_guard<std::mutex> lock(iosRuntimeMutex());
  iosRuntimeBindings()[std::this_thread::get_id()] = {host, moduleRegistry, runtime, nullptr};
}

RnLifecycleCoordinator::RegistrationIdentity snwc_ios_module_identity(const void *provider) {
  if (provider == nullptr) throw std::runtime_error("BindingFailure");
  std::lock_guard<std::mutex> lock(iosRuntimeMutex());
  const auto iterator = iosRuntimeBindings().find(std::this_thread::get_id());
  if (iterator == iosRuntimeBindings().end()) throw std::runtime_error("BindingFailure");
  IosRuntimeBinding &binding = iterator->second;
  binding.provider = provider;
  NSLog(@"SNWC_RN_NATIVE_PROVIDER_ADMITTED:%p:%p:%p", binding.runtime, binding.host, provider);
  return {
      .runtime = binding.runtime,
      .moduleRegistry = binding.moduleRegistry,
      .logicalContext = binding.host,
      .provider = provider,
  };
}

void snwc_ios_provider_did_invalidate(const void *provider) noexcept {
  RnLifecycleCoordinator::shared().invalidateProvider(provider);
  std::lock_guard<std::mutex> lock(iosRuntimeMutex());
  for (auto iterator = iosRuntimeBindings().begin(); iterator != iosRuntimeBindings().end();) {
    if (iterator->second.provider == provider) {
      iterator = iosRuntimeBindings().erase(iterator);
    } else {
      ++iterator;
    }
  }
}

#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
void snwc_ios_set_integration_reload_callback(
    RnLifecycleCoordinator::IntegrationReloadCallback callback) noexcept {
  RnLifecycleCoordinator::shared().setIntegrationReloadCallback(callback);
}
#endif

} // namespace facebook::react

@implementation NativeSymbolNemWalletCoreProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  facebook::react::RnLifecycleCoordinator::shared().registerProcessLifecycle();
  registerProcessTeardownHooks();
  const void *providerIdentity = (__bridge const void *)self;
  return std::make_shared<facebook::react::NativeSymbolNemWalletCore>(
      params.jsInvoker,
      facebook::react::snwc_ios_module_identity(providerIdentity));
}

- (void)invalidate {
  facebook::react::snwc_ios_provider_did_invalidate((__bridge const void *)self);
}

@end

#endif

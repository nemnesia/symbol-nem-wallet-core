/*
 * React Native 0.87 New Architecture provider registration.
 * This file is compiled into the application's appmodules target by
 * android/CMakeLists.txt; it is not a legacy Bridge or a JS/WASM fallback.
 */
#include <DefaultComponentsRegistry.h>
#include <DefaultTurboModuleManagerDelegate.h>
#include <FBReactNativeSpec.h>
#include <autolinking.h>
#include <fbjni/fbjni.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>

#include "../cpp/NativeSymbolNemWalletCoreProvider.h"

namespace facebook::react {

void registerComponents(
    std::shared_ptr<const ComponentDescriptorProviderRegistry> registry) {
#ifdef REACT_NATIVE_APP_COMPONENT_REGISTRATION
  REACT_NATIVE_APP_COMPONENT_REGISTRATION(registry);
#endif
  autolinking_registerProviders(registry);
}

std::shared_ptr<TurboModule> cxxModuleProvider(
    const std::string &name,
    const std::shared_ptr<CallInvoker> &jsInvoker) {
  if (auto module = symbolNemWalletCoreCxxModuleProvider(name, jsInvoker)) {
    return module;
  }
  return autolinking_cxxModuleProvider(name, jsInvoker);
}

std::shared_ptr<TurboModule> javaModuleProvider(
    const std::string &name,
    const JavaTurboModule::InitParams &params) {
#ifdef REACT_NATIVE_APP_MODULE_PROVIDER
  if (auto module = REACT_NATIVE_APP_MODULE_PROVIDER(name, params)) {
    return module;
  }
#endif
  if (auto module = FBReactNativeSpec_ModuleProvider(name, params)) {
    return module;
  }
  if (auto module = autolinking_ModuleProvider(name, params)) {
    return module;
  }
  return nullptr;
}

} // namespace facebook::react

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  if (snwc_rn_module_identity() == nullptr || snwc_rn_artifact_identity() == nullptr) {
    return JNI_ERR;
  }
  facebook::react::RnLifecycleCoordinator::shared().registerProcessLifecycle();
  return facebook::jni::initialize(vm, [] {
    facebook::react::DefaultTurboModuleManagerDelegate::cxxModuleProvider =
        &facebook::react::cxxModuleProvider;
    facebook::react::DefaultTurboModuleManagerDelegate::javaModuleProvider =
        &facebook::react::javaModuleProvider;
    facebook::react::DefaultComponentsRegistry::registerComponentDescriptorsFromEntryPoint =
        &facebook::react::registerComponents;
  });
}

JNIEXPORT void JNICALL JNI_OnUnload(JavaVM *, void *) {
  facebook::react::RnLifecycleCoordinator::shared().processTeardown();
}

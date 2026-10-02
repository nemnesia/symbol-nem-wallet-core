/*
 * React Native 0.87 New Architectureのprovider登録。
 * このfileはandroid/CMakeLists.txtによりアプリのappmodules targetへcompileされる。
 * legacy BridgeやJS / WASM fallbackではない。
 */
#include <DefaultComponentsRegistry.h>
#include <DefaultTurboModuleManagerDelegate.h>
#include <FBReactNativeSpec.h>
#include <autolinking.h>
#include <fbjni/fbjni.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>

#ifdef REACT_NATIVE_APP_CODEGEN_HEADER
#include REACT_NATIVE_APP_CODEGEN_HEADER
#endif
#ifdef REACT_NATIVE_APP_COMPONENT_DESCRIPTORS_HEADER
#include REACT_NATIVE_APP_COMPONENT_DESCRIPTORS_HEADER
#endif

#include "../cpp/NativeSymbolNemWalletCoreProvider.h"
#include "SymbolNemWalletCoreCxxReactPackage.h"

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
  (void)name;
  (void)jsInvoker;
  // fallbackにはpackage moduleを意図的に含めない。
  // 実際のReactApplicationContextへ登録されたRN 0.87 CxxReactPackageだけが生成できる。
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
  if (facebook::react::snwc_rn_module_identity() == nullptr ||
      facebook::react::snwc_rn_artifact_identity() == nullptr ||
      facebook::react::snwc_rn_target_id() == nullptr) {
    return JNI_ERR;
  }
  facebook::react::RnLifecycleCoordinator::shared().registerProcessLifecycle();
  return facebook::jni::initialize(vm, [] {
    facebook::react::SymbolNemWalletCoreCxxReactPackage::registerNatives();
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

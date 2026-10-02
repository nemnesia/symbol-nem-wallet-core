#include "SymbolNemWalletCoreCxxReactPackage.h"

#include <utility>

namespace facebook::react {

jni::local_ref<SymbolNemWalletCoreCxxReactPackage::jhybriddata>
SymbolNemWalletCoreCxxReactPackage::initHybrid(
    jni::alias_ref<jclass>,
    jni::alias_ref<JReactContext::javaobject> reactContext) {
  return makeCxxInstance(reactContext);
}

void SymbolNemWalletCoreCxxReactPackage::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", SymbolNemWalletCoreCxxReactPackage::initHybrid),
      makeNativeMethod(
          "nativeInvalidate", SymbolNemWalletCoreCxxReactPackage::nativeInvalidate),
  });
}

SymbolNemWalletCoreCxxReactPackage::SymbolNemWalletCoreCxxReactPackage(
    jni::alias_ref<JReactContext::javaobject> reactContext)
    : reactContext_(jni::make_global(reactContext)) {}

std::shared_ptr<TurboModule> SymbolNemWalletCoreCxxReactPackage::getModule(
    const std::string &name,
    const std::shared_ptr<CallInvoker> &jsInvoker) {
  if (name != NativeSymbolNemWalletCore::kModuleName) return nullptr;

  RnLifecycleCoordinator::RegistrationIdentity identity;
  // RNのCxxReactPackage objectが、このReactApplicationContextについて
  // DefaultTurboModuleManagerDelegateに保持される実際の登録objectである。
  identity.moduleRegistry = this;
  identity.logicalContext = reactContext_.get();
  identity.provider = this;
  // RNは実際のjsi::Runtime&をNativeSymbolNemWalletCore::invokeへ渡す。
  // ここではruntimeを保持せず、reload時はhost hookが無効化する。
  return std::make_shared<NativeSymbolNemWalletCore>(std::move(jsInvoker), identity);
}

void SymbolNemWalletCoreCxxReactPackage::nativeInvalidate() noexcept {
  RnLifecycleCoordinator::shared().invalidateProvider(this);
}

} // namespace facebook::react

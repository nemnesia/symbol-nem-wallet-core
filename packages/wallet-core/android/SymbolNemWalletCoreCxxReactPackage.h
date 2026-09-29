#pragma once

#include <ReactCommon/CxxReactPackage.h>
#include <fbjni/fbjni.h>

#include <memory>

#include "../cpp/NativeSymbolNemWalletCore.h"

namespace facebook::react {

struct JReactContext : jni::JavaClass<JReactContext> {
  static constexpr auto kJavaDescriptor =
      "Lcom/facebook/react/bridge/ReactContext;";
};

class SymbolNemWalletCoreCxxReactPackage final
    : public jni::HybridClass<SymbolNemWalletCoreCxxReactPackage, CxxReactPackage> {
 public:
  static constexpr auto kJavaDescriptor =
      "Lcom/nemnesia/symbolnemwalletcore/SymbolNemWalletCoreCxxReactPackage;";

  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jclass>,
      jni::alias_ref<JReactContext::javaobject> reactContext);
  static void registerNatives();

  std::shared_ptr<TurboModule> getModule(
      const std::string &name,
      const std::shared_ptr<CallInvoker> &jsInvoker) override;

  void nativeInvalidate() noexcept;

 private:
  friend HybridBase;

  explicit SymbolNemWalletCoreCxxReactPackage(
      jni::alias_ref<JReactContext::javaobject> reactContext);

  jni::global_ref<jobject> reactContext_;
};

} // namespace facebook::react

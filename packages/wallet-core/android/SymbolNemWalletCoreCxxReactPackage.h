#pragma once

#include <ReactCommon/CxxReactPackage.h>
#include <fbjni/fbjni.h>

#include <memory>

#include "../cpp/NativeSymbolNemWalletCore.h"

namespace facebook::react {

class SymbolNemWalletCoreCxxReactPackage final : public CxxReactPackage {
 public:
  static constexpr auto kJavaDescriptor =
      "Lcom/nemnesia/symbolnemwalletcore/SymbolNemWalletCoreCxxReactPackage;";

  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jclass>,
      jni::alias_ref<jobject> reactContext);
  static void registerNatives();

  std::shared_ptr<TurboModule> getModule(
      const std::string &name,
      const std::shared_ptr<CallInvoker> &jsInvoker) override;

  void invalidate() noexcept;

 private:
  friend HybridBase;

  explicit SymbolNemWalletCoreCxxReactPackage(
      jni::alias_ref<jobject> reactContext);

  jni::global_ref<jobject> reactContext_;
};

struct JSymbolNemWalletCoreRnLifecycle
    : jni::JavaClass<JSymbolNemWalletCoreRnLifecycle> {
  static constexpr auto kJavaDescriptor =
      "Lcom/nemnesia/symbolnemwalletcore/SymbolNemWalletCoreRnLifecycle;";
};

void nativeInvalidateReactPackage(
    jni::alias_ref<SymbolNemWalletCoreCxxReactPackage::javaobject> packageInstance);
void registerReactLifecycleNatives();

} // namespace facebook::react

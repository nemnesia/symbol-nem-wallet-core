#pragma once

#include <cstdint>
#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
#include <condition_variable>
#endif
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <vector>

namespace facebook::react {

class RnLifecycleCoordinator final {
 public:
  struct ProcessGeneration final {
// coordinator lifecycleのOS process identityである。
// object addressは同一process内で後から明示されたlifecycle resetを区別するために使い、
// RN object identityの代わりには使わない。
    uint64_t processId = 0;
  };

  enum class ProcessState : uint8_t {
    uninitialized,
    ready,
    draining,
    closed,
    unavailable,
  };

  struct RegistrationState final {
    struct Identity final {
// identity pointerはReact Nativeが所有する。coordinatorは参照先をdereferenceせず、
// 所有元のRN lifecycle hookがpointerを無効化する。
      const void *runtime = nullptr;
      const void *moduleRegistry = nullptr;
      const void *logicalContext = nullptr;
      const void *provider = nullptr;
      uint64_t providerGeneration = 0;
    } identity;
    std::shared_ptr<const ProcessGeneration> processGeneration;
    bool active = false;
// null runtimeはAndroid CxxReactPackageが使用するadmission前の状態に限る。
// invocation境界で実際のJSI Runtime&を一度だけ結び付けられる。wildcardとしては使わない。
    bool runtimeBound = false;
    bool retired = false;
  };

  struct Registration final {
    std::shared_ptr<RegistrationState> state;
  };

  struct Request final {
    std::shared_ptr<RegistrationState> registration;
    std::shared_ptr<const ProcessGeneration> processGeneration;
    const void *runtime = nullptr;
    const void *moduleRegistry = nullptr;
    const void *logicalContext = nullptr;
    const void *provider = nullptr;
    uint64_t providerGeneration = 0;
    uint64_t requestIdentity = 0;
  };

  using RegistrationIdentity = RegistrationState::Identity;

  static RnLifecycleCoordinator &shared();

  void registerProcessLifecycle();
  Registration registerModule(RegistrationIdentity identity);
  Request begin(const Registration &registration, const void *runtime);
  bool isLive(const Request &request) const;
  void finish(const Request &request) noexcept;
  void invalidate(const Registration &registration) noexcept;
  void invalidateProvider(const void *provider) noexcept;
  void invalidateContext(const void *logicalContext) noexcept;
  void processTeardown() noexcept;

  std::mutex &executionMutex() { return executionMutex_; }
  std::shared_mutex &deliveryBarrier() { return deliveryBarrier_; }
  bool hasActiveRequestOnCurrentThread() const;
  ProcessState processState() const;

#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
// 実際のRN stale-completion harness専用の同期処理である。
// production artifactには含まれず、admission動作も変更しない。
  bool armIntegrationStaleGate();
  void waitForIntegrationInvalidation();
  using IntegrationReloadCallback = void (*)();
  void setIntegrationReloadCallback(IntegrationReloadCallback callback);
#endif

 private:
  RnLifecycleCoordinator() = default;

  void ensureReadyLocked();

  mutable std::mutex stateMutex_;
  ProcessState processState_ = ProcessState::uninitialized;
  uint64_t nextRegistrationGeneration_ = 0;
  uint64_t nextRequestIdentity_ = 0;
  size_t inFlight_ = 0;
  std::shared_ptr<const ProcessGeneration> processGeneration_;
  std::vector<std::weak_ptr<RegistrationState>> registrations_;
  std::mutex executionMutex_;
  std::shared_mutex deliveryBarrier_;
#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
  std::condition_variable integrationGateCondition_;
  bool integrationGateArmed_ = false;
  bool integrationGateReleased_ = false;
  bool integrationGateConsumed_ = false;
  IntegrationReloadCallback integrationReloadCallback_ = nullptr;

  void releaseIntegrationGateLocked();
#endif
};

} // namespace facebook::react

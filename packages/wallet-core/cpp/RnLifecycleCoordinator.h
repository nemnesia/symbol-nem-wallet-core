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
    // This is the OS process identity for the coordinator lifecycle. The
    // object address distinguishes a later explicit lifecycle reset in the
    // same process; it is never used in place of an RN object identity.
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
      // Identity pointers are owned by React Native. The coordinator never
      // dereferences them; the owning RN lifecycle hook invalidates them.
      const void *runtime = nullptr;
      const void *moduleRegistry = nullptr;
      const void *logicalContext = nullptr;
      const void *provider = nullptr;
      uint64_t providerGeneration = 0;
    } identity;
    std::shared_ptr<const ProcessGeneration> processGeneration;
    bool active = false;
    // A null runtime is only the pre-admission state used by the Android
    // CxxReactPackage. It may be bound exactly once by the actual JSI
    // Runtime& at the invocation boundary; it is never a wildcard.
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
  // Test-only synchronization for the actual RN stale-completion harness.
  // It is not present in production artifacts and does not alter admission.
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

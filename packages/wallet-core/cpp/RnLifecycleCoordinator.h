#pragma once

#include <cstdint>
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <vector>

namespace facebook::react {

class RnLifecycleCoordinator final {
 public:
  enum class ProcessState : uint8_t {
    uninitialized,
    ready,
    draining,
    closed,
    unavailable,
  };

  struct RegistrationState final {
    std::shared_ptr<const void> registryLifetime;
    std::weak_ptr<const void> contextLifetime;
    std::weak_ptr<const void> processLifetime;
    const void *runtime = nullptr;
    bool active = false;
  };

  struct Registration final {
    std::shared_ptr<RegistrationState> state;
  };

  struct Request final {
    std::shared_ptr<RegistrationState> registration;
    std::shared_ptr<const void> processLifetime;
    std::shared_ptr<const void> registryLifetime;
    std::shared_ptr<const void> contextLifetime;
    const void *runtime = nullptr;
    uint64_t requestIdentity = 0;
  };

  static RnLifecycleCoordinator &shared();

  void registerProcessLifecycle();
  Registration registerModule(
      std::shared_ptr<const void> registryLifetime,
      std::shared_ptr<const void> contextLifetime);
  Request begin(const Registration &registration, const void *runtime);
  bool isLive(const Request &request) const;
  void finish(const Request &request) noexcept;
  void invalidate(const Registration &registration) noexcept;
  void processTeardown() noexcept;

  std::mutex &executionMutex() { return executionMutex_; }
  std::shared_mutex &deliveryBarrier() { return deliveryBarrier_; }
  bool hasActiveRequestOnCurrentThread() const;
  ProcessState processState() const;

 private:
  RnLifecycleCoordinator() = default;

  void ensureReadyLocked();

  mutable std::mutex stateMutex_;
  ProcessState processState_ = ProcessState::uninitialized;
  uint64_t nextRequestIdentity_ = 0;
  size_t inFlight_ = 0;
  std::shared_ptr<const void> processLifetime_;
  std::vector<std::weak_ptr<RegistrationState>> registrations_;
  std::mutex executionMutex_;
  std::shared_mutex deliveryBarrier_;
};

} // namespace facebook::react

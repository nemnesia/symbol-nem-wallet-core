#pragma once

#include <atomic>
#include <cstdint>
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <unordered_map>

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
    const void *runtime = nullptr;
    const void *registry = nullptr;
    const void *context = nullptr;
    uint64_t processGeneration = 0;
    bool active = false;
  };

  struct Registration final {
    std::shared_ptr<RegistrationState> state;
  };

  struct Request final {
    std::shared_ptr<RegistrationState> registration;
    const void *runtime = nullptr;
    const void *registry = nullptr;
    const void *context = nullptr;
    uint64_t processGeneration = 0;
    uint64_t requestIdentity = 0;
  };

  static RnLifecycleCoordinator &shared();

  void registerProcessLifecycle();
  Registration registerModule(const void *registry, const void *context);
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

  static uint64_t newProcessGeneration();
  void ensureReadyLocked();

  mutable std::mutex stateMutex_;
  ProcessState processState_ = ProcessState::uninitialized;
  uint64_t processGeneration_ = 0;
  uint64_t nextRequestIdentity_ = 0;
  size_t inFlight_ = 0;
  std::unordered_map<const void *, std::weak_ptr<RegistrationState>> registrations_;
  std::mutex executionMutex_;
  std::shared_mutex deliveryBarrier_;
};

} // namespace facebook::react

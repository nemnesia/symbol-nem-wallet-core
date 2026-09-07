#include "../packages/wallet-core/cpp/RnLifecycleCoordinator.h"

#include <algorithm>
#include <atomic>
#include <cassert>
#include <chrono>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <thread>
#include <vector>

using facebook::react::RnLifecycleCoordinator;

class SensitiveOutput final {
 public:
  explicit SensitiveOutput(size_t &releaseCount, size_t &zeroizedCount)
      : releaseCount_(releaseCount), zeroizedCount_(zeroizedCount), bytes_{0x5a, 0xa5, 0x11, 0xee} {}

  SensitiveOutput(const SensitiveOutput &) = delete;
  SensitiveOutput &operator=(const SensitiveOutput &) = delete;

  void cleanup() noexcept {
    if (released_) return;
    bool wasNonZero = false;
    for (const auto byte : bytes_) {
      wasNonZero = wasNonZero || byte != 0;
    }
    std::fill(bytes_.begin(), bytes_.end(), 0);
    released_ = true;
    releaseCount_ += 1;
    if (wasNonZero && std::all_of(bytes_.begin(), bytes_.end(), [](uint8_t byte) { return byte == 0; })) {
      zeroizedCount_ += 1;
    }
  }

  ~SensitiveOutput() { cleanup(); }

 private:
  size_t &releaseCount_;
  size_t &zeroizedCount_;
  std::vector<uint8_t> bytes_;
  bool released_ = false;
};

int main() {
  auto &coordinator = RnLifecycleCoordinator::shared();
  coordinator.registerProcessLifecycle();
  int registryOne = 1;
  int contextOne = 2;
  int providerOne = 3;
  int registryTwo = 4;
  int contextTwo = 5;
  int providerTwo = 6;
  int registryThree = 7;
  int contextThree = 8;
  int providerThree = 9;
  int runtimeOne = 5;
  int runtimeTwo = 6;
  const auto first = coordinator.registerModule({
      .moduleRegistry = &registryOne,
      .logicalContext = &contextOne,
      .provider = &providerOne,
  });
  const auto second = coordinator.registerModule({
      .moduleRegistry = &registryTwo,
      .logicalContext = &contextTwo,
      .provider = &providerTwo,
  });

  const auto request = coordinator.begin(first, &runtimeOne);
  assert(coordinator.isLive(request));
  bool reentryRejected = false;
  try {
    coordinator.begin(first, &runtimeOne);
  } catch (const std::runtime_error &) {
    reentryRejected = true;
  }
  assert(reentryRejected);
  coordinator.finish(request);

  // Android's actual runtime is supplied by each JSI invocation. A second
  // actual runtime is not captured into the old registration; its RN host
  // callback must invalidate the old provider before replacement.
  const auto androidRuntimeReplacement = coordinator.begin(first, &runtimeTwo);
  assert(coordinator.isLive(androidRuntimeReplacement));
  coordinator.finish(androidRuntimeReplacement);

  bool iosRuntimeReplacementRejected = false;
  RnLifecycleCoordinator::RegistrationIdentity iosIdentity{
      .runtime = &runtimeOne,
      .moduleRegistry = &registryOne,
      .logicalContext = &contextOne,
      .provider = &providerOne,
  };
  const auto iosRegistration = coordinator.registerModule(iosIdentity);
  try {
    coordinator.begin(iosRegistration, &runtimeTwo);
  } catch (const std::runtime_error &) {
    iosRuntimeReplacementRejected = true;
  }
  assert(iosRuntimeReplacementRejected);

  const auto independent = coordinator.begin(second, &runtimeTwo);
  coordinator.finish(independent);
  const auto invalidated = coordinator.begin(iosRegistration, &runtimeOne);
  coordinator.invalidate(iosRegistration);
  assert(!coordinator.isLive(invalidated));
  coordinator.finish(invalidated);

  const auto third = coordinator.registerModule({
      .moduleRegistry = &registryThree,
      .logicalContext = &contextThree,
      .provider = &providerThree,
  });
  const auto providerInvalidated = coordinator.begin(third, &runtimeTwo);
  coordinator.invalidateProvider(&providerThree);
  assert(!coordinator.isLive(providerInvalidated));
  size_t staleReleaseCount = 0;
  size_t staleZeroizedCount = 0;
  bool staleOutputDelivered = false;
  {
    SensitiveOutput staleOutput(staleReleaseCount, staleZeroizedCount);
    if (coordinator.isLive(providerInvalidated)) {
      staleOutputDelivered = true;
    } else {
      // This is the cleanup-only branch taken before any JS DTO is built.
      staleOutput.cleanup();
    }
  }
  assert(!staleOutputDelivered);
  assert(staleReleaseCount == 1);
  assert(staleZeroizedCount == 1);
  coordinator.finish(providerInvalidated);

  std::unique_lock<std::mutex> executionLock(coordinator.executionMutex());
  const auto teardownRequest = coordinator.begin(second, &runtimeTwo);
  std::atomic_bool teardownStarted = false;
  std::atomic_bool teardownReturned = false;
  std::thread teardown([&] {
    teardownStarted.store(true, std::memory_order_release);
    coordinator.processTeardown();
    teardownReturned.store(true, std::memory_order_release);
  });
  while (!teardownStarted.load(std::memory_order_acquire)) std::this_thread::yield();
  std::this_thread::sleep_for(std::chrono::milliseconds(1));
  assert(!teardownReturned.load(std::memory_order_acquire));
  assert(!coordinator.isLive(teardownRequest));
  coordinator.finish(teardownRequest);
  executionLock.unlock();
  teardown.join();
  assert(teardownReturned.load(std::memory_order_acquire));
  assert(coordinator.processState() == RnLifecycleCoordinator::ProcessState::closed);

  coordinator.registerProcessLifecycle();
  const auto reloaded = coordinator.registerModule({
      .moduleRegistry = &registryOne,
      .logicalContext = &contextOne,
      .provider = &providerOne,
  });
  const auto reloadedRequest = coordinator.begin(reloaded, &runtimeOne);
  assert(coordinator.isLive(reloadedRequest));
  coordinator.finish(reloadedRequest);

  // A provider replacement in the same actual registry/context retires the
  // old registration during admission; a registration counter alone is not
  // sufficient because the RN-owned identities are part of this predicate.
  const auto providerReplacement = coordinator.registerModule({
      .moduleRegistry = &registryOne,
      .logicalContext = &contextOne,
      .provider = &providerThree,
  });
  bool retiredRegistrationRejected = false;
  try {
    coordinator.begin(reloaded, &runtimeOne);
  } catch (const std::runtime_error &) {
    retiredRegistrationRejected = true;
  }
  assert(retiredRegistrationRejected);
  const auto providerReplacementRequest = coordinator.begin(providerReplacement, &runtimeTwo);
  assert(coordinator.isLive(providerReplacementRequest));
  coordinator.finish(providerReplacementRequest);

  int expiredContext = 7;
  int expiredProvider = 8;
  const auto expired = coordinator.registerModule({
      .moduleRegistry = &registryOne,
      .logicalContext = &expiredContext,
      .provider = &expiredProvider,
  });
  const auto expiredRequest = coordinator.begin(expired, &runtimeOne);
  coordinator.invalidateContext(&expiredContext);
  assert(!coordinator.isLive(expiredRequest));
  coordinator.finish(expiredRequest);
  return 0;
}

#include "../packages/wallet-core/cpp/RnLifecycleCoordinator.h"

#include <atomic>
#include <cassert>
#include <chrono>
#include <mutex>
#include <stdexcept>
#include <thread>

using facebook::react::RnLifecycleCoordinator;

int main() {
  auto &coordinator = RnLifecycleCoordinator::shared();
  coordinator.registerProcessLifecycle();
  int registryOne = 1;
  int contextOne = 2;
  int registryTwo = 3;
  int contextTwo = 4;
  int runtimeOne = 5;
  int runtimeTwo = 6;
  const auto first = coordinator.registerModule(&registryOne, &contextOne);
  const auto second = coordinator.registerModule(&registryTwo, &contextTwo);

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

  const auto independent = coordinator.begin(second, &runtimeTwo);
  coordinator.finish(independent);
  const auto invalidated = coordinator.begin(first, &runtimeOne);
  coordinator.invalidate(first);
  assert(!coordinator.isLive(invalidated));
  coordinator.finish(invalidated);

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
  const auto reloaded = coordinator.registerModule(&registryOne, &contextOne);
  const auto reloadedRequest = coordinator.begin(reloaded, &runtimeOne);
  assert(coordinator.isLive(reloadedRequest));
  coordinator.finish(reloadedRequest);
  return 0;
}

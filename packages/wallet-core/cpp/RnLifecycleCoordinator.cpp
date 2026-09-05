#include "RnLifecycleCoordinator.h"

#include <limits>
#include <stdexcept>
#include <unistd.h>

namespace facebook::react {
namespace {

thread_local bool hasActiveRequest = false;

[[noreturn]] void failLifecycle() {
  throw std::runtime_error("BindingFailure");
}

} // namespace

RnLifecycleCoordinator &RnLifecycleCoordinator::shared() {
  static RnLifecycleCoordinator coordinator;
  return coordinator;
}

uint64_t RnLifecycleCoordinator::newProcessGeneration() {
  static std::atomic_uint64_t nextGeneration{0};
  const uint64_t generation = nextGeneration.fetch_add(1, std::memory_order_relaxed) + 1;
  const uint64_t processId = static_cast<uint64_t>(::getpid());
  if (generation == 0 || generation > std::numeric_limits<uint32_t>::max() ||
      processId == 0 || processId > std::numeric_limits<uint32_t>::max()) {
    failLifecycle();
  }
  return (processId << 32) | generation;
}

void RnLifecycleCoordinator::ensureReadyLocked() {
  if (processState_ == ProcessState::uninitialized || processState_ == ProcessState::closed) {
    processGeneration_ = newProcessGeneration();
    processState_ = ProcessState::ready;
  }
  if (processState_ != ProcessState::ready) failLifecycle();
}

void RnLifecycleCoordinator::registerProcessLifecycle() {
  std::lock_guard<std::mutex> lock(stateMutex_);
  ensureReadyLocked();
}

RnLifecycleCoordinator::Registration RnLifecycleCoordinator::registerModule(
    const void *registry,
    const void *context) {
  if (registry == nullptr || context == nullptr) failLifecycle();
  std::lock_guard<std::mutex> lock(stateMutex_);
  ensureReadyLocked();
  auto state = std::make_shared<RegistrationState>();
  state->registry = registry;
  state->context = context;
  state->processGeneration = processGeneration_;
  state->active = true;
  registrations_[context] = state;
  return {std::move(state)};
}

RnLifecycleCoordinator::Request RnLifecycleCoordinator::begin(
    const Registration &registration,
    const void *runtime) {
  if (registration.state == nullptr || runtime == nullptr || hasActiveRequest) failLifecycle();
  std::lock_guard<std::mutex> lock(stateMutex_);
  if (
      processState_ != ProcessState::ready ||
      !registration.state->active ||
      registration.state->processGeneration != processGeneration_ ||
      registration.state->registry == nullptr ||
      registration.state->context == nullptr) {
    failLifecycle();
  }
  if (registration.state->runtime == nullptr) {
    registration.state->runtime = runtime;
  } else if (registration.state->runtime != runtime) {
    failLifecycle();
  }
  const uint64_t requestIdentity = ++nextRequestIdentity_;
  if (requestIdentity == 0) failLifecycle();
  inFlight_ += 1;
  hasActiveRequest = true;
  return {
      registration.state,
      runtime,
      registration.state->registry,
      registration.state->context,
      processGeneration_,
      requestIdentity,
  };
}

bool RnLifecycleCoordinator::isLive(const Request &request) const {
  std::lock_guard<std::mutex> lock(stateMutex_);
  return
      processState_ == ProcessState::ready &&
      request.registration != nullptr &&
      request.registration->active &&
      request.registration->runtime == request.runtime &&
      request.registration->registry == request.registry &&
      request.registration->context == request.context &&
      request.registration->processGeneration == processGeneration_ &&
      request.processGeneration == processGeneration_ &&
      request.requestIdentity != 0;
}

void RnLifecycleCoordinator::finish(const Request &request) noexcept {
  {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (request.requestIdentity != 0 && inFlight_ > 0) inFlight_ -= 1;
  }
  hasActiveRequest = false;
}

void RnLifecycleCoordinator::invalidate(const Registration &registration) noexcept {
  if (registration.state == nullptr) return;
  std::unique_lock<std::shared_mutex> barrier(deliveryBarrier_);
  std::lock_guard<std::mutex> lock(stateMutex_);
  registration.state->active = false;
  registrations_.erase(registration.state->context);
}

void RnLifecycleCoordinator::processTeardown() noexcept {
  std::unique_lock<std::shared_mutex> barrier(deliveryBarrier_);
  {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (processState_ == ProcessState::closed || processState_ == ProcessState::unavailable) return;
    processState_ = ProcessState::draining;
    for (auto iterator = registrations_.begin(); iterator != registrations_.end();) {
      if (auto state = iterator->second.lock()) state->active = false;
      iterator = registrations_.erase(iterator);
    }
  }
  barrier.unlock();
  std::unique_lock<std::mutex> execution(executionMutex_);
  std::lock_guard<std::mutex> lock(stateMutex_);
  processState_ = ProcessState::closed;
  processGeneration_ = 0;
}

bool RnLifecycleCoordinator::hasActiveRequestOnCurrentThread() const {
  return hasActiveRequest;
}

RnLifecycleCoordinator::ProcessState RnLifecycleCoordinator::processState() const {
  std::lock_guard<std::mutex> lock(stateMutex_);
  return processState_;
}

} // namespace facebook::react

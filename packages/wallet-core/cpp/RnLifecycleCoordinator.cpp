#include "RnLifecycleCoordinator.h"

#include <algorithm>
#include <stdexcept>

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

void RnLifecycleCoordinator::ensureReadyLocked() {
  if (processState_ == ProcessState::uninitialized || processState_ == ProcessState::closed) {
    processLifetime_ = std::make_shared<const uint8_t>(0);
    processState_ = ProcessState::ready;
  }
  if (processState_ != ProcessState::ready) failLifecycle();
}

void RnLifecycleCoordinator::registerProcessLifecycle() {
  std::lock_guard<std::mutex> lock(stateMutex_);
  ensureReadyLocked();
}

RnLifecycleCoordinator::Registration RnLifecycleCoordinator::registerModule(
    std::shared_ptr<const void> registryLifetime,
    std::shared_ptr<const void> contextLifetime) {
  if (registryLifetime == nullptr || contextLifetime == nullptr) failLifecycle();
  std::lock_guard<std::mutex> lock(stateMutex_);
  ensureReadyLocked();
  auto state = std::make_shared<RegistrationState>();
  state->registryLifetime = std::move(registryLifetime);
  state->contextLifetime = std::move(contextLifetime);
  state->processLifetime = processLifetime_;
  state->active = true;
  registrations_.push_back(state);
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
      registration.state->registryLifetime == nullptr ||
      registration.state->contextLifetime.expired() ||
      registration.state->processLifetime.expired() ||
      registration.state->processLifetime.lock() != processLifetime_) {
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
      processLifetime_,
      registration.state->registryLifetime,
      registration.state->contextLifetime.lock(),
      runtime,
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
      request.registration->registryLifetime == request.registryLifetime &&
      request.registration->contextLifetime.lock() == request.contextLifetime &&
      request.registration->processLifetime.lock() == request.processLifetime &&
      request.processLifetime == processLifetime_ &&
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
  registrations_.erase(
      std::remove_if(
          registrations_.begin(),
          registrations_.end(),
          [&registration](const auto &candidate) {
            return candidate.expired() || candidate.lock() == registration.state;
          }),
      registrations_.end());
}

void RnLifecycleCoordinator::processTeardown() noexcept {
  std::unique_lock<std::shared_mutex> barrier(deliveryBarrier_);
  {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (processState_ == ProcessState::closed || processState_ == ProcessState::unavailable) return;
    processState_ = ProcessState::draining;
    for (const auto &candidate : registrations_) {
      if (auto state = candidate.lock()) state->active = false;
    }
    registrations_.clear();
    processLifetime_.reset();
  }
  barrier.unlock();
  std::unique_lock<std::mutex> execution(executionMutex_);
  std::lock_guard<std::mutex> lock(stateMutex_);
  processState_ = ProcessState::closed;
}

bool RnLifecycleCoordinator::hasActiveRequestOnCurrentThread() const {
  return hasActiveRequest;
}

RnLifecycleCoordinator::ProcessState RnLifecycleCoordinator::processState() const {
  std::lock_guard<std::mutex> lock(stateMutex_);
  return processState_;
}

} // namespace facebook::react

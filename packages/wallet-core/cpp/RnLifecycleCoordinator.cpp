#include "RnLifecycleCoordinator.h"

#include <algorithm>
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

void RnLifecycleCoordinator::ensureReadyLocked() {
  if (processState_ == ProcessState::uninitialized || processState_ == ProcessState::closed) {
    // The OS process identity is the real process boundary. This owned
    // object only anchors one coordinator lifecycle; it is not an RN
    // runtime, module registry, provider, or logical context surrogate.
    processGeneration_ = std::make_shared<const ProcessGeneration>(ProcessGeneration{
        static_cast<uint64_t>(::getpid()),
    });
    processState_ = ProcessState::ready;
  }
  if (processState_ != ProcessState::ready) failLifecycle();
}

void RnLifecycleCoordinator::registerProcessLifecycle() {
  std::lock_guard<std::mutex> lock(stateMutex_);
  ensureReadyLocked();
}

RnLifecycleCoordinator::Registration RnLifecycleCoordinator::registerModule(
    RegistrationIdentity identity) {
  if (
      identity.moduleRegistry == nullptr || identity.logicalContext == nullptr ||
      identity.provider == nullptr) {
    failLifecycle();
  }
  // A new RN registration for the same actual registry/context retires the
  // previous provider registration, even when the platform did not expose a
  // separate provider callback. Taking the delivery barrier here prevents an
  // old completion from passing its final predicate while replacement is
  // being admitted.
  std::unique_lock<std::shared_mutex> barrier(deliveryBarrier_);
  std::lock_guard<std::mutex> lock(stateMutex_);
  ensureReadyLocked();
  for (const auto &candidate : registrations_) {
    if (auto state = candidate.lock(); state && state->active &&
        state->identity.moduleRegistry == identity.moduleRegistry &&
        state->identity.logicalContext == identity.logicalContext) {
      state->active = false;
    }
  }
  identity.providerGeneration = ++nextRegistrationGeneration_;
  if (identity.providerGeneration == 0) failLifecycle();
  auto state = std::make_shared<RegistrationState>();
  state->identity = identity;
  state->processGeneration = processGeneration_;
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
      registration.state->identity.moduleRegistry == nullptr ||
      registration.state->identity.logicalContext == nullptr ||
      registration.state->identity.provider == nullptr ||
      registration.state->processGeneration != processGeneration_ ||
      processGeneration_ == nullptr ||
      processGeneration_->processId != static_cast<uint64_t>(::getpid())) {
    failLifecycle();
  }
  // Android obtains the actual runtime at the JSI boundary. iOS binds it
  // from RCTHost::didInitializeRuntime before module construction. A request
  // never mutates a registration to capture a replacement runtime.
  if (registration.state->identity.runtime != nullptr && registration.state->identity.runtime != runtime) {
    failLifecycle();
  }
  const uint64_t requestIdentity = ++nextRequestIdentity_;
  if (requestIdentity == 0) failLifecycle();
  inFlight_ += 1;
  hasActiveRequest = true;
  return {
      registration.state,
      processGeneration_,
      runtime,
      registration.state->identity.moduleRegistry,
      registration.state->identity.logicalContext,
      registration.state->identity.provider,
      registration.state->identity.providerGeneration,
      requestIdentity,
  };
}

bool RnLifecycleCoordinator::isLive(const Request &request) const {
  std::lock_guard<std::mutex> lock(stateMutex_);
  return
      processState_ == ProcessState::ready &&
      request.registration != nullptr &&
      request.registration->active &&
      (request.registration->identity.runtime == nullptr ||
       request.registration->identity.runtime == request.runtime) &&
      request.registration->identity.moduleRegistry == request.moduleRegistry &&
      request.registration->identity.logicalContext == request.logicalContext &&
      request.registration->identity.provider == request.provider &&
      request.registration->identity.providerGeneration == request.providerGeneration &&
      request.processGeneration == processGeneration_ &&
      request.processGeneration != nullptr &&
      request.processGeneration->processId == static_cast<uint64_t>(::getpid()) &&
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

void RnLifecycleCoordinator::invalidateProvider(const void *provider) noexcept {
  if (provider == nullptr) return;
  std::unique_lock<std::shared_mutex> barrier(deliveryBarrier_);
  std::lock_guard<std::mutex> lock(stateMutex_);
  for (const auto &candidate : registrations_) {
    if (auto state = candidate.lock(); state && state->identity.provider == provider) {
      state->active = false;
    }
  }
  registrations_.erase(
      std::remove_if(
          registrations_.begin(), registrations_.end(),
          [](const auto &candidate) { return candidate.expired(); }),
      registrations_.end());
}

void RnLifecycleCoordinator::invalidateContext(const void *logicalContext) noexcept {
  if (logicalContext == nullptr) return;
  std::unique_lock<std::shared_mutex> barrier(deliveryBarrier_);
  std::lock_guard<std::mutex> lock(stateMutex_);
  for (const auto &candidate : registrations_) {
    if (auto state = candidate.lock(); state && state->identity.logicalContext == logicalContext) {
      state->active = false;
    }
  }
  registrations_.erase(
      std::remove_if(
          registrations_.begin(), registrations_.end(),
          [](const auto &candidate) { return candidate.expired(); }),
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
    processGeneration_.reset();
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

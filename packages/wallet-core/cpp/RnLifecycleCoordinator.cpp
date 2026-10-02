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
  // OS process identityが実際のprocess境界である。この所有objectはひとつのcoordinator lifecycleを
  // 保持するためだけに使い、RN runtime、module registry、provider、logical contextの代替にはしない。
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
  // 同じ実際のregistry / contextに対する新しいRN登録は、platformが別のprovider callbackを
  // 公開しない場合も以前のprovider登録を終了させる。ここでdelivery barrierを取得し、
  // replacementのadmission中に古い処理結果が最終predicateを通過しないようにする。
  std::unique_lock<std::shared_mutex> barrier(deliveryBarrier_);
  std::lock_guard<std::mutex> lock(stateMutex_);
  ensureReadyLocked();
  for (const auto &candidate : registrations_) {
    if (auto state = candidate.lock(); state &&
        state->identity.moduleRegistry == identity.moduleRegistry &&
        state->identity.logicalContext == identity.logicalContext) {
      state->active = false;
      state->retired = true;
#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
      releaseIntegrationGateLocked();
#endif
    }
  }
  identity.providerGeneration = ++nextRegistrationGeneration_;
  if (identity.providerGeneration == 0) failLifecycle();
  auto state = std::make_shared<RegistrationState>();
  state->identity = identity;
  state->processGeneration = processGeneration_;
  state->runtimeBound = identity.runtime != nullptr;
  state->active = state->runtimeBound;
  registrations_.push_back(state);
  return {std::move(state)};
}

RnLifecycleCoordinator::Request RnLifecycleCoordinator::begin(
    const Registration &registration,
    const void *runtime) {
  if (registration.state == nullptr || runtime == nullptr || hasActiveRequest) failLifecycle();
  std::lock_guard<std::mutex> lock(stateMutex_);
  const bool invalidBasic =
      processState_ != ProcessState::ready ||
      registration.state->retired ||
      registration.state->identity.moduleRegistry == nullptr ||
      registration.state->identity.logicalContext == nullptr ||
      registration.state->identity.provider == nullptr ||
      registration.state->processGeneration != processGeneration_ ||
      processGeneration_ == nullptr ||
      processGeneration_->processId != static_cast<uint64_t>(::getpid());
  if (invalidBasic) {
    failLifecycle();
  }
  // AndroidはこのJSI境界で実際のruntimeを取得する。この時点より前はpending登録は有効化されず、
  // runtimeは一度だけ結び付ける。後続runtimeがnull wildcardを通じてadmissionされることはない。
  if (!registration.state->runtimeBound) {
    registration.state->identity.runtime = runtime;
    registration.state->runtimeBound = true;
    registration.state->active = true;
  } else if (
      registration.state->identity.runtime == nullptr ||
      registration.state->identity.runtime != runtime ||
      !registration.state->active) {
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
      !request.registration->retired &&
      request.runtime != nullptr &&
      request.registration->identity.runtime != nullptr &&
      request.registration->identity.runtime == request.runtime &&
      request.moduleRegistry != nullptr &&
      request.registration->identity.moduleRegistry == request.moduleRegistry &&
      request.logicalContext != nullptr &&
      request.registration->identity.logicalContext == request.logicalContext &&
      request.provider != nullptr &&
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
  registration.state->retired = true;
#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
  releaseIntegrationGateLocked();
#endif
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
      state->retired = true;
#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
      releaseIntegrationGateLocked();
#endif
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
      state->retired = true;
#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
      releaseIntegrationGateLocked();
#endif
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
      if (auto state = candidate.lock()) {
        state->active = false;
        state->retired = true;
      }
    }
#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
    releaseIntegrationGateLocked();
#endif
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

#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
bool RnLifecycleCoordinator::armIntegrationStaleGate() {
  IntegrationReloadCallback callback = nullptr;
  {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (integrationGateConsumed_) return false;
    integrationGateConsumed_ = true;
    integrationGateArmed_ = true;
    integrationGateReleased_ = false;
    callback = integrationReloadCallback_;
  }
  // iOS integration harnessはこのcallbackから実際のRCTHost reloadをmain queueへdispatchする。
  // Androidはarmed markerを検出した後、adbから同じgateを動かす。
  if (callback != nullptr) callback();
  return true;
}

void RnLifecycleCoordinator::waitForIntegrationInvalidation() {
  std::unique_lock<std::mutex> lock(stateMutex_);
  integrationGateCondition_.wait(lock, [this] { return integrationGateReleased_; });
  integrationGateArmed_ = false;
}

void RnLifecycleCoordinator::releaseIntegrationGateLocked() {
  if (!integrationGateArmed_) return;
  integrationGateReleased_ = true;
  integrationGateCondition_.notify_all();
}

void RnLifecycleCoordinator::setIntegrationReloadCallback(IntegrationReloadCallback callback) {
  std::lock_guard<std::mutex> lock(stateMutex_);
  integrationReloadCallback_ = callback;
}
#endif

} // namespace facebook::react

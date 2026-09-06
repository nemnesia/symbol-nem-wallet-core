#import "NativeSymbolNemWalletCoreProvider.h"

#import <ReactCommon/TurboModule.h>
#import <UIKit/UIKit.h>

#import "../cpp/NativeSymbolNemWalletCore.h"

#include <cstdlib>

namespace {

void registerProcessTeardownHooks() {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    std::atexit([] {
      facebook::react::RnLifecycleCoordinator::shared().processTeardown();
    });
    [[NSNotificationCenter defaultCenter]
        addObserverForName:UIApplicationWillTerminateNotification
                    object:nil
                     queue:nil
                usingBlock:^(__unused NSNotification *notification) {
                  facebook::react::RnLifecycleCoordinator::shared().processTeardown();
                }];
  });
}

} // namespace

@implementation NativeSymbolNemWalletCoreProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  facebook::react::RnLifecycleCoordinator::shared().registerProcessLifecycle();
  registerProcessTeardownHooks();
  return std::make_shared<facebook::react::NativeSymbolNemWalletCore>(params.jsInvoker);
}

@end

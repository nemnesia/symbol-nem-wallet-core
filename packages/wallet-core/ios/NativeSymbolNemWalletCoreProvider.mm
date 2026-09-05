#import "NativeSymbolNemWalletCoreProvider.h"

#import <ReactCommon/TurboModule.h>

#import "../cpp/NativeSymbolNemWalletCore.h"

@implementation NativeSymbolNemWalletCoreProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeSymbolNemWalletCore>(params.jsInvoker);
}

@end

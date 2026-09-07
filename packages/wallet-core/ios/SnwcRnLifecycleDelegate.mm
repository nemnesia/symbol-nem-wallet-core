#import "SnwcRnLifecycleDelegate.h"

#import <ReactCommon/RCTHost.h>

#import "SnwcRnLifecycle.h"

@implementation SnwcRnLifecycleDelegate

@interface SnwcRnLifecycleDelegate ()
@property(nonatomic, weak) RCTHost *snwcHost;
@end

- (void)hostDidStart:(RCTHost *)host {
  [super hostDidStart:host];
  self.snwcHost = host;
  facebook::react::snwc_ios_host_did_start(
      (__bridge const void *)host,
      (__bridge const void *)host.moduleRegistry);
}

- (void)snwcReloadForIntegrationTest {
  RCTHost *host = self.snwcHost;
  if (host != nil && [host respondsToSelector:@selector(reload)]) {
    [(id)host performSelector:@selector(reload)];
  }
}

- (void)host:(RCTHost *)host didInitializeRuntime:(facebook::jsi::Runtime &)runtime {
  facebook::react::snwc_ios_runtime_did_initialize(
      (__bridge const void *)host,
      (__bridge const void *)host.moduleRegistry,
      &runtime);
}

@end

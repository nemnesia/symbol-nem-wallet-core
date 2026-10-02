#import "SnwcRnLifecycleDelegate.h"

#if !defined(SNWC_RN_ARTIFACT_MODE)

#import <ReactCommon/RCTHost.h>
#import <ReactCommon/RCTHost+Internal.h>
#import <React/RCTReloadCommand.h>

#import "SnwcRnLifecycle.h"

#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
static __weak RCTHost *snwcIntegrationHost;

static void snwcRequestIntegrationReload() {
  RCTHost *host = snwcIntegrationHost;
  if (host == nil) return;
  dispatch_async(dispatch_get_main_queue(), ^{
    if (snwcIntegrationHost == nil) return;
    NSLog(@"SNWC_RN_NATIVE_LIFECYCLE_RELOAD_REQUESTED");
    // reload処理の唯一の起点としてReact Nativeのreload-command経路を使う。
    // この経路がhostの置換と既存surfaceの再起動を調整する。
    // 先にRCTHost.reload()を呼ぶと、hostを二度reloadすることになる。
    RCTTriggerReloadCommandListeners(@"SNWC integration lifecycle reload");
  });
}
#endif

@implementation SnwcRnLifecycleDelegate

- (void)hostDidStart:(RCTHost *)host {
  [super hostDidStart:host];
#if defined(SNWC_RN_LIFECYCLE_INTEGRATION_TEST)
  snwcIntegrationHost = host;
  facebook::react::snwc_ios_set_integration_reload_callback(&snwcRequestIntegrationReload);
#endif
  facebook::react::snwc_ios_host_did_start(
      (__bridge const void *)host,
      (__bridge const void *)host.moduleRegistry);
}

- (void)host:(RCTHost *)host didInitializeRuntime:(facebook::jsi::Runtime &)runtime {
  NSLog(@"SNWC_RN_NATIVE_RUNTIME_CALLBACK:%p:%p", (__bridge const void *)host, &runtime);
  facebook::react::snwc_ios_runtime_did_initialize(
      (__bridge const void *)host,
      (__bridge const void *)host.moduleRegistry,
      &runtime);
}

@end

@implementation SnwcRnReactNativeFactory

- (void)host:(RCTHost *)host didInitializeRuntime:(facebook::jsi::Runtime &)runtime {
  id<RCTReactNativeFactoryDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(host:didInitializeRuntime:)]) {
    [delegate host:host didInitializeRuntime:runtime];
  }
}

@end

#endif

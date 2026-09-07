#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>

NS_ASSUME_NONNULL_BEGIN

@class RCTHost;

/**
 * RCTHostDelegate adapter that exposes the actual RN host, module registry,
 * and JSI runtime lifecycle to the package coordinator.
 */
@interface SnwcRnLifecycleDelegate : RCTDefaultReactNativeFactoryDelegate

/** Used by the source-controlled RN consumer to exercise one real host reload. */
- (void)snwcReloadForIntegrationTest;
@end

NS_ASSUME_NONNULL_END

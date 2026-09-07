#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * RCTHostDelegate adapter that exposes the actual RN host, module registry,
 * and JSI runtime lifecycle to the package coordinator.
 */
@interface SnwcRnLifecycleDelegate : RCTDefaultReactNativeFactoryDelegate

@end

NS_ASSUME_NONNULL_END

#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * RCTHostDelegate adapter that exposes the actual RN host, module registry,
 * and JSI runtime lifecycle to the package coordinator.
 */
@interface SnwcRnLifecycleDelegate : RCTDefaultReactNativeFactoryDelegate

@end

/**
 * RCTReactNativeFactory normally forwards hostDidStart to its factory
 * delegate, but RN 0.87.x does not forward didInitializeRuntime. The
 * subclass is the actual RCTHostDelegate installation point that forwards
 * that callback to the lifecycle delegate before the JS bundle executes.
 */
@interface SnwcRnReactNativeFactory : RCTReactNativeFactory

@end

NS_ASSUME_NONNULL_END

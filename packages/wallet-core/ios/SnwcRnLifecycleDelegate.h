#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * 実際のRN host、module registry、JSI runtime lifecycleをpackage coordinatorへ渡すRCTHostDelegate adapter。
 */
@interface SnwcRnLifecycleDelegate : RCTDefaultReactNativeFactoryDelegate

@end

/**
 * RCTReactNativeFactoryは通常hostDidStartをfactory delegateへ転送するが、RN 0.87.xでは
 * didInitializeRuntimeを転送しない。このsubclassは実際のRCTHostDelegate設定箇所として、
 * JS bundle実行前にlifecycle delegateへcallbackを転送する。
 */
@interface SnwcRnReactNativeFactory : RCTReactNativeFactory

@end

NS_ASSUME_NONNULL_END

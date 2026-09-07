#import "SnwcRnLifecycleDelegate.h"

// Keep a source file in the artifact-consuming Pod target so CocoaPods emits
// the Clang module that Swift uses for SnwcRnLifecycleDelegate. The actual
// Objective-C implementation is already present in the force-loaded
// XCFramework archive and must not be compiled a second time.

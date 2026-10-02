#import "SnwcRnLifecycleDelegate.h"

// artifactを使うPod targetにsource fileを残し、SwiftがSnwcRnLifecycleDelegateに使う
// Clang moduleをCocoaPodsに生成させる。実際のObjective-C実装はforce-loadされる
// XCFramework archiveに含まれるため、二重にcompileしてはならない。

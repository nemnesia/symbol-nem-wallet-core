import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import SymbolNemWalletCoreRN

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "SnwcRnBuild",
      in: window,
      launchOptions: launchOptions
    )

    if CommandLine.arguments.contains("--snwc-rn-lifecycle-reload") {
      DispatchQueue.main.asyncAfter(deadline: .now() + 12) {
        print("SNWC_RN_NATIVE_LIFECYCLE_RELOAD_REQUESTED")
        delegate.snwcReloadForIntegrationTest()
      }
    }

    return true
  }
}

class ReactNativeDelegate: SnwcRnLifecycleDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

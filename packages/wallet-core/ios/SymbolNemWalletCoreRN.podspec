Pod::Spec.new do |s|
  s.name             = "SymbolNemWalletCoreRN"
  s.version          = "0.1.0"
  s.summary          = "Private React Native binding for Symbol and NEM Wallet Core"
  s.homepage         = "https://github.com/nemnesia/symbol-nem-wallet-core"
  s.license          = { :type => "MIT" }
  s.author           = { "ccHarvestasya" => "" }
  s.module_name      = "SymbolNemWalletCoreRN"
  s.public_header_files = "SnwcRnLifecycleDelegate.h"
  s.source           = { :git => "https://github.com/nemnesia/symbol-nem-wallet-core.git" }
  s.platforms        = { :ios => "15.1" }
  s.requires_arc     = true
  s.static_framework = true
  xcframework = "../dist/react-native/ios/SymbolNemWalletCoreRN.xcframework"
  if File.directory?(File.expand_path(xcframework, __dir__))
    # This XCFramework contains static-library slices produced by
    # xcodebuild -create-xcframework -library, not framework bundles. CocoaPods
    # 1.16 does not copy such a library when it is declared as a vendored
    # framework, so select the approved slice in a fail-closed Pod build phase.
    # The copied archive contains the C++ lifecycle bridge and the ObjC++
    # delegate; expose only the delegate header from this Pod target. The
    # delegate must not be compiled again once the archive is force-loaded.
    s.source_files = ["SnwcRnLifecycleDelegate.h", "SnwcRnLifecycleModuleAnchor.m"]
    s.script_phase = {
      :name => "Select SymbolNemWalletCoreRN XCFramework slice",
      :execution_position => :before_compile,
      :input_files => [
        "#{xcframework}/ios-arm64/libsymbol_nem_wallet_core_rn.a",
        "#{xcframework}/ios-arm64-simulator/libsymbol_nem_wallet_core_rn.a",
      ],
      :output_files => [
        "$(BUILT_PRODUCTS_DIR)/SymbolNemWalletCoreRN/libsymbol_nem_wallet_core_rn.a",
      ],
      :script => <<-'SCRIPT'
set -eu

case "$PLATFORM_NAME" in
  iphoneos)
    slice="ios-arm64"
    ;;
  iphonesimulator)
    slice="ios-arm64-simulator"
    ;;
  *)
    echo "Unsupported Apple platform: $PLATFORM_NAME" >&2
    exit 1
    ;;
esac

input="$PODS_TARGET_SRCROOT/../dist/react-native/ios/SymbolNemWalletCoreRN.xcframework/$slice/libsymbol_nem_wallet_core_rn.a"
output="$BUILT_PRODUCTS_DIR/SymbolNemWalletCoreRN/libsymbol_nem_wallet_core_rn.a"
test -f "$input"
mkdir -p "$(dirname "$output")"
rm -f "$output"
cp "$input" "$output"
test -f "$output"
SCRIPT
    }
    s.user_target_xcconfig = {
      "OTHER_LDFLAGS" => [
        "$(inherited)",
        "-force_load",
        '"$(BUILT_PRODUCTS_DIR)/SymbolNemWalletCoreRN/libsymbol_nem_wallet_core_rn.a"',
      ].join(" "),
    }
  else
    # A source Pod is only valid when the target-specific C ABI archive has
    # already been produced by the same controlled build. This makes source
    # compilation and C ABI linking one deterministic Pod target; there is no
    # source-only fallback that can silently omit the C ABI.
    c_abi = File.expand_path("libsymbol_nem_wallet_core_native.a", __dir__)
    raise "SymbolNemWalletCoreRN requires the prebuilt C ABI archive" unless File.file?(c_abi)
    s.vendored_libraries = "libsymbol_nem_wallet_core_native.a"
    s.source_files = [
      "NativeSymbolNemWalletCoreProvider.{h,mm}",
      "SnwcRnLifecycleDelegate.{h,mm}",
      "SnwcNativeSymbolNemWalletCore.cpp",
      "SnwcNativeSymbolNemWalletCoreProvider.cpp",
      "SnwcRnLifecycleCoordinator.cpp",
    ]
  end
  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "CLANG_CXX_LIBRARY" => "libc++",
    # React Native generates this header during the ReactCodegen before-
    # compile phase.  The source Pod must consume that exact generated output,
    # rather than relying on a header-map side effect of the app target.
    "HEADER_SEARCH_PATHS" => [
      "$(inherited)",
      '"$(PODS_ROOT)/Headers/Public/ReactCodegen"',
      '"$(PODS_ROOT)/../build/generated/ios/ReactCodegen"',
      '"$(PODS_TARGET_SRCROOT)/../cpp"',
      '"$(PODS_TARGET_SRCROOT)/../cpp/include"',
    ].join(" "),
  }
  s.dependency "React-Core"
  s.dependency "React-RCTAppDelegate"
  s.dependency "ReactCodegen"
  s.dependency "React-jsi"
  s.dependency "ReactCommon/turbomodule/core"
end

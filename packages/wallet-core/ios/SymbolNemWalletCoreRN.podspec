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
  # Keep the resolved Pod specification byte-for-byte identical for the source
  # producer and the assembled-XCFramework consumer. The selected native
  # implementation is decided by the build phase below, not while CocoaPods
  # evaluates this podspec; otherwise the two legitimate inputs produce
  # different SPEC CHECKSUMS and deployment-mode installation rejects the
  # source-controlled Podfile.lock.
  s.source_files = [
    "NativeSymbolNemWalletCoreProvider.{h,mm}",
    "SnwcRnLifecycleDelegate.{h,mm}",
    "SnwcRnLifecycleModuleAnchor.m",
    "SnwcNativeSymbolNemWalletCore.cpp",
    "SnwcNativeSymbolNemWalletCoreProvider.cpp",
    "SnwcRnLifecycleCoordinator.cpp",
  ]
  s.script_phase = {
    :name => "Select SymbolNemWalletCoreRN native archive",
    :execution_position => :after_compile,
    :input_files => [
      "#{xcframework}/ios-arm64/libsymbol_nem_wallet_core_rn.a",
      "#{xcframework}/ios-arm64-simulator/libsymbol_nem_wallet_core_rn.a",
    ],
    :output_files => [
      "$(BUILT_PRODUCTS_DIR)/libsymbol_nem_wallet_core_rn.a",
    ],
    :script => <<-'SCRIPT'
set -eu

xcframework="$PODS_TARGET_SRCROOT/../dist/react-native/ios/SymbolNemWalletCoreRN.xcframework"
output="$BUILT_PRODUCTS_DIR/libsymbol_nem_wallet_core_rn.a"
if test -d "$xcframework"; then
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
  input="$xcframework/$slice/libsymbol_nem_wallet_core_rn.a"
else
  # The source implementation is already linked through the static framework
  # emitted by this Pod target. Keep the common force-load output valid but
  # empty so the source producer does not link that same archive twice.
  mkdir -p "$(dirname "$output")"
  rm -f "$output"
  /usr/bin/ar -rc "$output"
  test -f "$output"
  exit 0
fi
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

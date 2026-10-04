Pod::Spec.new do |s|
  s.name             = "SymbolNemWalletCoreRN"
  s.version          = "0.2.0"
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
  # source producerと組立済みXCFramework consumerで、解決されるPod仕様のbyte列を一致させる。
  # 使用するnative実装は下のbuild phaseで選択し、CocoaPodsがpodspecを評価する時点では決めない。
  # そうしないと、どちらも正当な入力である2つの経路でSPEC CHECKSUMSが異なり、
  # deployment modeのinstall時にrepository管理下のPodfile.lockと不一致になる。
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
  # source実装はこのPod targetが出力するstatic framework経由ですでにlinkされている。
  # 共通force-load出力の形式は保ちつつ空にし、source producerが同じarchiveを二重linkしないようにする。
  mkdir -p "$(dirname "$output")"
  empty_object="$BUILT_PRODUCTS_DIR/symbol_nem_wallet_core_rn_empty.o"
  rm -f "$output"
  /usr/bin/clang -x c -c /dev/null -o "$empty_object"
  /usr/bin/ar -rc "$output" "$empty_object"
  rm -f "$empty_object"
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
    # React NativeはReactCodegenのcompile前phaseでこのheaderを生成する。
    # source Podはapp targetのheader mapによる副作用に依存せず、その生成物を直接使う。
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

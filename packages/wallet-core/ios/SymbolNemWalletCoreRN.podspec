Pod::Spec.new do |s|
  s.name             = "SymbolNemWalletCoreRN"
  s.version          = "0.1.0"
  s.summary          = "Private React Native binding for Symbol and NEM Wallet Core"
  s.homepage         = "https://github.com/nemnesia/symbol-nem-wallet-core"
  s.license          = { :type => "MIT" }
  s.author           = { "ccHarvestasya" => "" }
  s.source           = { :git => "https://github.com/nemnesia/symbol-nem-wallet-core.git" }
  s.platforms        = { :ios => "15.1" }
  s.requires_arc     = true
  s.static_framework = true
  xcframework = "../dist/react-native/ios/SymbolNemWalletCoreRN.xcframework"
  if File.directory?(File.expand_path(xcframework, __dir__))
    s.vendored_frameworks = xcframework
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
  s.dependency "ReactCodegen"
  s.dependency "React-jsi"
  s.dependency "ReactCommon/turbomodule/core"
end

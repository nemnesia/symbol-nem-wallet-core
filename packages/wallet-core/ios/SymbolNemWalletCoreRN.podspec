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
  s.vendored_frameworks = "../dist/react-native/ios/SymbolNemWalletCoreRN.xcframework"
  s.source_files     = "NativeSymbolNemWalletCoreProvider.{h,mm}"
  s.header_mappings_dir = "../cpp"
  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "CLANG_CXX_LIBRARY" => "libc++",
  }
  s.dependency "React-Core"
  s.dependency "React-jsi"
  s.dependency "ReactCommon/turbomodule/core"
end

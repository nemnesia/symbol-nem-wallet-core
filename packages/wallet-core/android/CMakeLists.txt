cmake_minimum_required(VERSION 3.22.1)

project(symbol_nem_wallet_core_rn)

# The application New Architecture CMake target supplies React Native Codegen,
# JSI, and the C ABI/Rust symbols. The package owns only the thin module source.
add_library(symbol_nem_wallet_core_rn_module OBJECT
    ../cpp/NativeSymbolNemWalletCore.cpp
    ../cpp/NativeSymbolNemWalletCoreProvider.cpp
)
target_include_directories(symbol_nem_wallet_core_rn_module PRIVATE
    ../cpp
    ../cpp/include
)
